const { Router } = require('express');
const db = require('../database/connection');

const router = Router();

// Middleware: verificar se módulo financeiro está habilitado pro tenant
async function checkFinanceiroModule(req, res, next) {
  // Super admin impersonando tem acesso total
  const masterUser = await db('users').where({ id: req.user.userId }).first();
  if (masterUser && masterUser.role === 'super_admin') {
    return next();
  }

  const tenant = await db('tenants').where({ id: req.tenantId }).first();
  if (!tenant) return res.status(404).json({ success: false, error: { message: 'Tenant não encontrado' } });

  const modules = typeof tenant.modules === 'string' ? JSON.parse(tenant.modules) : tenant.modules;
  if (!modules.includes('financeiro')) {
    return res.status(403).json({ success: false, error: { message: 'Módulo Financeiro não habilitado para esta conta' } });
  }
  next();
}

router.use(checkFinanceiroModule);

// Relatório financeiro (semanal ou mensal)
router.get('/relatorio', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: { message: 'startDate e endDate são obrigatórios' } });
    }

    // Buscar lançamentos do período (exceto cancelados)
    const entries = await db('financial_entries')
      .where({ tenant_id: req.tenantId })
      .where('due_date', '>=', startDate)
      .where('due_date', '<=', endDate)
      .whereNot('status', 'cancelado')
      .orderBy('due_date', 'asc');

    // Calcular totais
    const receitas = entries.filter(e => e.type === 'receita');
    const despesas = entries.filter(e => e.type === 'despesa');
    
    const totalReceitas = receitas.reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalDespesas = despesas.reduce((s, e) => s + parseFloat(e.amount), 0);
    
    const receitasRecebidas = receitas.filter(e => e.status === 'recebido').reduce((s, e) => s + parseFloat(e.amount), 0);
    const receitasPendentes = receitas.filter(e => e.status === 'pendente').reduce((s, e) => s + parseFloat(e.amount), 0);
    const despesasPagas = despesas.filter(e => e.status === 'pago').reduce((s, e) => s + parseFloat(e.amount), 0);
    const despesasPendentes = despesas.filter(e => e.status === 'pendente').reduce((s, e) => s + parseFloat(e.amount), 0);

    // Agrupar por dia para o gráfico
    const dailyData = {};
    entries.forEach(entry => {
      const day = entry.due_date.toISOString().split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = { date: day, entradas: 0, saidas: 0 };
      }
      if (entry.type === 'receita') {
        dailyData[day].entradas += parseFloat(entry.amount);
      } else {
        dailyData[day].saidas += parseFloat(entry.amount);
      }
    });

    // Buscar período anterior para comparativo
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays + 1);

    const prevEntries = await db('financial_entries')
      .where({ tenant_id: req.tenantId })
      .where('due_date', '>=', prevStart.toISOString().split('T')[0])
      .where('due_date', '<=', prevEnd.toISOString().split('T')[0])
      .whereNot('status', 'cancelado');

    const prevReceitas = prevEntries.filter(e => e.type === 'receita').reduce((s, e) => s + parseFloat(e.amount), 0);
    const prevDespesas = prevEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + parseFloat(e.amount), 0);
    const prevSaldo = prevReceitas - prevDespesas;

    // Calcular variação percentual
    const saldo = totalReceitas - totalDespesas;
    const variacaoReceitas = prevReceitas > 0 ? ((totalReceitas - prevReceitas) / prevReceitas * 100) : 0;
    const variacaoDespesas = prevDespesas > 0 ? ((totalDespesas - prevDespesas) / prevDespesas * 100) : 0;
    const variacaoSaldo = prevSaldo > 0 ? ((saldo - prevSaldo) / prevSaldo * 100) : 0;

    res.json({
      success: true,
      data: {
        periodo: { startDate, endDate },
        resumo: {
          totalReceitas,
          totalDespesas,
          saldo,
          receitasRecebidas,
          receitasPendentes,
          despesasPagas,
          despesasPendentes,
        },
        comparativo: {
          variacaoReceitas: Math.round(variacaoReceitas),
          variacaoDespesas: Math.round(variacaoDespesas),
          variacaoSaldo: Math.round(variacaoSaldo),
          periodoAnterior: {
            startDate: prevStart.toISOString().split('T')[0],
            endDate: prevEnd.toISOString().split('T')[0],
          }
        },
        graficoDiario: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
        lancamentos: entries.map(e => ({
          id: e.id,
          date: e.due_date,
          type: e.type,
          description: e.description,
          status: e.status,
          amount: parseFloat(e.amount),
          service_order_id: e.service_order_id,
        })),
      },
    });
  } catch (error) { next(error); }
});

// Resumo (totais do mês)
router.get('/resumo', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = parseInt(month) || (now.getMonth() + 1);
    const y = parseInt(year) || now.getFullYear();

    const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).toISOString().split('T')[0];

    const entries = await db('financial_entries')
      .where({ tenant_id: req.tenantId })
      .where('due_date', '>=', firstDay)
      .where('due_date', '<=', lastDay)
      .whereNot('status', 'cancelado'); // Ignorar cancelados no resumo

    const totalReceitas = entries.filter((e) => e.type === 'receita').reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalDespesas = entries.filter((e) => e.type === 'despesa').reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalPago = entries.filter((e) => e.status === 'pago' || e.status === 'recebido').reduce((s, e) => s + parseFloat(e.amount) * (e.type === 'receita' ? 1 : -1), 0);
    const totalPendente = entries.filter((e) => e.status === 'pendente').reduce((s, e) => s + parseFloat(e.amount), 0);

    res.json({
      success: true,
      data: {
        receitas: totalReceitas,
        despesas: totalDespesas,
        pago: totalPago,
        pendente: totalPendente,
        saldo: totalReceitas - totalDespesas,
        month: m,
        year: y,
      },
    });
  } catch (error) { next(error); }
});

// Listar lançamentos
router.get('/', async (req, res, next) => {
  try {
    const { month, year, status, type } = req.query;
    const now = new Date();
    const m = parseInt(month) || (now.getMonth() + 1);
    const y = parseInt(year) || now.getFullYear();

    const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).toISOString().split('T')[0];

    const query = db('financial_entries')
      .where({ tenant_id: req.tenantId })
      .where('due_date', '>=', firstDay)
      .where('due_date', '<=', lastDay)
      .orderBy('due_date', 'desc');

    if (status && status !== 'all') query.where('status', status);
    if (type && type !== 'all') query.where('type', type);

    const entries = await query;
    res.json({ success: true, data: entries });
  } catch (error) { next(error); }
});

// Criar lançamento
router.post('/', async (req, res, next) => {
  try {
    const { type, description, amount, due_date, status, service_order_id } = req.body;

    if (!type || !description || !amount) {
      return res.status(400).json({ success: false, error: { message: 'Tipo, descrição e valor são obrigatórios' } });
    }

    const [entry] = await db('financial_entries')
      .insert({
        tenant_id: req.tenantId,
        type,
        description,
        amount,
        due_date: due_date || new Date().toISOString().split('T')[0],
        status: status || 'pendente',
        service_order_id: service_order_id || null,
      })
      .returning('*');

    res.status(201).json({ success: true, data: entry });
  } catch (error) { next(error); }
});

// Editar lançamento
router.put('/:id', async (req, res, next) => {
  try {
    const { type, description, amount, due_date, status, service_order_id } = req.body;
    const [entry] = await db('financial_entries')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .update({ 
        type, 
        description, 
        amount, 
        due_date, 
        status, 
        service_order_id: service_order_id || null,
        updated_at: new Date().toISOString() 
      })
      .returning('*');

    if (!entry) return res.status(404).json({ success: false, error: { message: 'Lançamento não encontrado' } });
    res.json({ success: true, data: entry });
  } catch (error) { next(error); }
});

// Marcar como pago/recebido (dependendo do tipo)
router.patch('/:id/pay', async (req, res, next) => {
  try {
    // Buscar o lançamento primeiro para saber o tipo
    const existing = await db('financial_entries')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .first();
    
    if (!existing) return res.status(404).json({ success: false, error: { message: 'Lançamento não encontrado' } });
    
    // Status correto baseado no tipo: receita = recebido, despesa = pago
    const newStatus = existing.type === 'receita' ? 'recebido' : 'pago';
    
    const [entry] = await db('financial_entries')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .update({ status: newStatus, paid_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
      .returning('*');

    res.json({ success: true, data: entry });
  } catch (error) { next(error); }
});

// Cancelar lançamento (soft delete para lançamentos vinculados a OS)
router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const [entry] = await db('financial_entries')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .returning('*');

    if (!entry) return res.status(404).json({ success: false, error: { message: 'Lançamento não encontrado' } });
    res.json({ success: true, data: entry });
  } catch (error) { next(error); }
});

// Excluir lançamento (apenas lançamentos manuais sem vínculo com OS)
router.delete('/:id', async (req, res, next) => {
  try {
    // Verificar se o lançamento existe e se está vinculado a uma OS
    const entry = await db('financial_entries')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .first();
    
    if (!entry) return res.status(404).json({ success: false, error: { message: 'Lançamento não encontrado' } });
    
    // Bloquear exclusão de lançamentos vinculados a OS
    if (entry.service_order_id) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          message: 'Lançamentos vinculados a OS não podem ser excluídos. Use a opção de cancelar para manter o histórico.',
          linked: true
        } 
      });
    }
    
    await db('financial_entries')
      .where({ id: req.params.id, tenant_id: req.tenantId })
      .del();

    res.json({ success: true, data: { message: 'Lançamento removido' } });
  } catch (error) { next(error); }
});

module.exports = router;

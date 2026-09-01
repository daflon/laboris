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

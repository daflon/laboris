/**
 * Rotas do Módulo de Aluguéis
 * - Patrimônio (equipamentos próprios)
 * - Contratos de aluguel
 * - Pagamentos
 */

const { Router } = require('express');
const db = require('../database/connection');

const router = Router();

// ==================== PATRIMÔNIO ====================

/**
 * GET /api/v1/alugueis/patrimonio
 * Lista todos os equipamentos do patrimônio
 */
router.get('/patrimonio', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, search } = req.query;

    let query = db('patrimonio')
      .where({ tenant_id: tenantId })
      .whereNull('deleted_at')
      .orderBy('nome', 'asc');

    if (status) {
      query = query.where({ status });
    }

    if (search) {
      query = query.where(function() {
        this.where('nome', 'ilike', `%${search}%`)
          .orWhere('codigo', 'ilike', `%${search}%`)
          .orWhere('marca', 'ilike', `%${search}%`);
      });
    }

    const items = await query;
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Erro ao listar patrimônio:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao listar patrimônio' } });
  }
});

/**
 * GET /api/v1/alugueis/patrimonio/:id
 * Busca um equipamento específico
 */
router.get('/patrimonio/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const item = await db('patrimonio')
      .where({ id: req.params.id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .first();

    if (!item) {
      return res.status(404).json({ success: false, error: { message: 'Equipamento não encontrado' } });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Erro ao buscar patrimônio:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao buscar equipamento' } });
  }
});

/**
 * POST /api/v1/alugueis/patrimonio
 * Cadastra novo equipamento no patrimônio
 */
router.post('/patrimonio', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { codigo, nome, categoria, marca, modelo, numero_serie, 
            valor_compra, valor_diaria, valor_semanal, valor_mensal,
            observacoes, foto_url, data_aquisicao } = req.body;

    if (!codigo || !nome) {
      return res.status(400).json({ success: false, error: { message: 'Código e nome são obrigatórios' } });
    }

    // Verifica se código já existe
    const existing = await db('patrimonio')
      .where({ tenant_id: tenantId, codigo })
      .whereNull('deleted_at')
      .first();
    
    if (existing) {
      return res.status(400).json({ success: false, error: { message: 'Já existe um equipamento com este código' } });
    }

    const [item] = await db('patrimonio')
      .insert({
        tenant_id: tenantId,
        codigo,
        nome,
        categoria,
        marca,
        modelo,
        numero_serie,
        valor_compra,
        valor_diaria,
        valor_semanal,
        valor_mensal,
        observacoes,
        foto_url,
        data_aquisicao,
        status: 'disponivel'
      })
      .returning('*');

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Erro ao criar patrimônio:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao cadastrar equipamento' } });
  }
});

/**
 * PUT /api/v1/alugueis/patrimonio/:id
 * Atualiza equipamento do patrimônio
 */
router.put('/patrimonio/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { codigo, nome, categoria, marca, modelo, numero_serie, 
            valor_compra, valor_diaria, valor_semanal, valor_mensal,
            observacoes, foto_url, data_aquisicao, status } = req.body;

    // Verifica se existe
    const existing = await db('patrimonio')
      .where({ id: req.params.id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .first();

    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Equipamento não encontrado' } });
    }

    // Se mudou o código, verifica duplicidade
    if (codigo && codigo !== existing.codigo) {
      const duplicate = await db('patrimonio')
        .where({ tenant_id: tenantId, codigo })
        .whereNull('deleted_at')
        .whereNot({ id: req.params.id })
        .first();
      
      if (duplicate) {
        return res.status(400).json({ success: false, error: { message: 'Já existe um equipamento com este código' } });
      }
    }

    const [item] = await db('patrimonio')
      .where({ id: req.params.id, tenant_id: tenantId })
      .update({
        codigo,
        nome,
        categoria,
        marca,
        modelo,
        numero_serie,
        valor_compra,
        valor_diaria,
        valor_semanal,
        valor_mensal,
        observacoes,
        foto_url,
        data_aquisicao,
        status,
        updated_at: db.fn.now()
      })
      .returning('*');

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Erro ao atualizar patrimônio:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao atualizar equipamento' } });
  }
});

/**
 * DELETE /api/v1/alugueis/patrimonio/:id
 * Remove equipamento (soft delete)
 */
router.delete('/patrimonio/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Verifica se não tem aluguel ativo
    const aluguelAtivo = await db('alugueis')
      .where({ patrimonio_id: req.params.id, tenant_id: tenantId })
      .whereIn('status', ['ativo', 'atrasado'])
      .first();

    if (aluguelAtivo) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Não é possível excluir um equipamento com aluguel ativo' } 
      });
    }

    await db('patrimonio')
      .where({ id: req.params.id, tenant_id: tenantId })
      .update({ deleted_at: db.fn.now(), status: 'inativo' });

    res.json({ success: true, message: 'Equipamento removido' });
  } catch (error) {
    console.error('Erro ao remover patrimônio:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao remover equipamento' } });
  }
});

// ==================== ALUGUÉIS ====================

/**
 * GET /api/v1/alugueis
 * Lista todos os aluguéis
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, cliente, patrimonio } = req.query;

    let query = db('alugueis')
      .where({ 'alugueis.tenant_id': tenantId })
      .leftJoin('patrimonio', 'patrimonio.id', 'alugueis.patrimonio_id')
      .leftJoin('clients', 'clients.id', 'alugueis.client_id')
      .select(
        'alugueis.*',
        'patrimonio.nome as patrimonio_nome',
        'patrimonio.codigo as patrimonio_codigo',
        'clients.name as client_name',
        'clients.phone as client_phone'
      )
      .orderBy('alugueis.created_at', 'desc');

    if (status) {
      query = query.where({ 'alugueis.status': status });
    }

    if (cliente) {
      query = query.where({ 'alugueis.client_id': cliente });
    }

    if (patrimonio) {
      query = query.where({ 'alugueis.patrimonio_id': patrimonio });
    }

    const items = await query;

    // Atualiza status de atrasados
    const hoje = new Date();
    for (const item of items) {
      if (item.status === 'ativo' && new Date(item.data_prevista_devolucao) < hoje) {
        item.status = 'atrasado';
        // Atualiza no banco também
        await db('alugueis')
          .where({ id: item.id })
          .update({ status: 'atrasado' });
      }
    }

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Erro ao listar aluguéis:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao listar aluguéis' } });
  }
});

/**
 * GET /api/v1/alugueis/stats
 * Estatísticas do módulo de aluguéis
 */
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimSemana = new Date(hoje);
    fimSemana.setDate(fimSemana.getDate() + 7);

    // Equipamentos alugados agora
    const alugados = await db('alugueis')
      .where({ tenant_id: tenantId })
      .whereIn('status', ['ativo', 'atrasado'])
      .count('id as count')
      .first();

    // Valor total dos aluguéis ativos (a receber)
    const valorAtivos = await db('alugueis')
      .where({ tenant_id: tenantId })
      .whereIn('status', ['ativo', 'atrasado'])
      .sum('valor_acordado as total')
      .first();

    // Devoluções previstas na semana
    const devolucoesSemana = await db('alugueis')
      .where({ tenant_id: tenantId, status: 'ativo' })
      .whereBetween('data_prevista_devolucao', [hoje, fimSemana])
      .count('id as count')
      .first();

    // Atrasados
    const atrasados = await db('alugueis')
      .where({ tenant_id: tenantId, status: 'atrasado' })
      .count('id as count')
      .first();

    // Receita do mês (valor dos aluguéis devolvidos)
    const receitaMes = await db('alugueis')
      .where({ tenant_id: tenantId, status: 'devolvido' })
      .where('data_devolucao', '>=', inicioMes)
      .sum('valor_final as total')
      .first();

    // Total de patrimônio disponível
    const disponiveis = await db('patrimonio')
      .where({ tenant_id: tenantId, status: 'disponivel' })
      .whereNull('deleted_at')
      .count('id as count')
      .first();

    res.json({
      success: true,
      data: {
        alugados: parseInt(alugados?.count || 0),
        valorAtivos: parseFloat(valorAtivos?.total || 0),
        devolucoesSemana: parseInt(devolucoesSemana?.count || 0),
        atrasados: parseInt(atrasados?.count || 0),
        receitaMes: parseFloat(receitaMes?.total || 0),
        disponiveis: parseInt(disponiveis?.count || 0)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao buscar estatísticas' } });
  }
});

/**
 * GET /api/v1/alugueis/:id
 * Busca um aluguel específico
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    const aluguel = await db('alugueis')
      .where({ 'alugueis.id': req.params.id, 'alugueis.tenant_id': tenantId })
      .leftJoin('patrimonio', 'patrimonio.id', 'alugueis.patrimonio_id')
      .leftJoin('clients', 'clients.id', 'alugueis.client_id')
      .select(
        'alugueis.*',
        'patrimonio.nome as patrimonio_nome',
        'patrimonio.codigo as patrimonio_codigo',
        'patrimonio.foto_url as patrimonio_foto',
        'clients.name as client_name',
        'clients.phone as client_phone',
        'clients.document as client_document'
      )
      .first();

    if (!aluguel) {
      return res.status(404).json({ success: false, error: { message: 'Aluguel não encontrado' } });
    }

    // Busca pagamentos
    const pagamentos = await db('aluguel_pagamentos')
      .where({ aluguel_id: aluguel.id })
      .orderBy('data_pagamento', 'desc');

    aluguel.pagamentos = pagamentos;

    res.json({ success: true, data: aluguel });
  } catch (error) {
    console.error('Erro ao buscar aluguel:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao buscar aluguel' } });
  }
});

/**
 * POST /api/v1/alugueis
 * Cria novo aluguel
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    const { patrimonio_id, client_id, data_inicio, data_prevista_devolucao,
            tipo_cobranca, valor_acordado, condicao_saida, observacoes } = req.body;

    if (!patrimonio_id || !client_id || !data_inicio || !data_prevista_devolucao || !valor_acordado) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Patrimônio, cliente, datas e valor são obrigatórios' } 
      });
    }

    // Verifica se patrimônio está disponível
    const patrimonio = await db('patrimonio')
      .where({ id: patrimonio_id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .first();

    if (!patrimonio) {
      return res.status(404).json({ success: false, error: { message: 'Equipamento não encontrado' } });
    }

    if (patrimonio.status !== 'disponivel') {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Este equipamento não está disponível para aluguel' } 
      });
    }

    // Gera próximo número
    const lastNumber = await db('alugueis')
      .where({ tenant_id: tenantId })
      .max('numero as max')
      .first();
    const numero = (lastNumber?.max || 0) + 1;

    // Cria aluguel
    const [aluguel] = await db('alugueis')
      .insert({
        tenant_id: tenantId,
        patrimonio_id,
        client_id,
        numero,
        data_inicio,
        data_prevista_devolucao,
        tipo_cobranca: tipo_cobranca || 'diaria',
        valor_acordado,
        condicao_saida,
        observacoes,
        status: 'ativo',
        created_by: userId
      })
      .returning('*');

    // Atualiza status do patrimônio
    await db('patrimonio')
      .where({ id: patrimonio_id })
      .update({ status: 'alugado', updated_at: db.fn.now() });

    res.status(201).json({ success: true, data: aluguel });
  } catch (error) {
    console.error('Erro ao criar aluguel:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao criar aluguel' } });
  }
});

/**
 * PUT /api/v1/alugueis/:id
 * Atualiza aluguel
 */
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { data_prevista_devolucao, valor_acordado, tipo_cobranca, observacoes } = req.body;

    const existing = await db('alugueis')
      .where({ id: req.params.id, tenant_id: tenantId })
      .first();

    if (!existing) {
      return res.status(404).json({ success: false, error: { message: 'Aluguel não encontrado' } });
    }

    if (existing.status === 'devolvido' || existing.status === 'cancelado') {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Não é possível editar um aluguel finalizado' } 
      });
    }

    const [aluguel] = await db('alugueis')
      .where({ id: req.params.id, tenant_id: tenantId })
      .update({
        data_prevista_devolucao,
        valor_acordado,
        tipo_cobranca,
        observacoes,
        updated_at: db.fn.now()
      })
      .returning('*');

    res.json({ success: true, data: aluguel });
  } catch (error) {
    console.error('Erro ao atualizar aluguel:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao atualizar aluguel' } });
  }
});

/**
 * POST /api/v1/alugueis/:id/devolver
 * Registra devolução do aluguel
 */
router.post('/:id/devolver', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { data_devolucao, condicao_devolucao, equipamento_danificado, valor_final, observacoes } = req.body;

    const aluguel = await db('alugueis')
      .where({ id: req.params.id, tenant_id: tenantId })
      .first();

    if (!aluguel) {
      return res.status(404).json({ success: false, error: { message: 'Aluguel não encontrado' } });
    }

    if (aluguel.status === 'devolvido' || aluguel.status === 'cancelado') {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Este aluguel já foi finalizado' } 
      });
    }

    // Atualiza aluguel
    const [updated] = await db('alugueis')
      .where({ id: req.params.id })
      .update({
        data_devolucao: data_devolucao || db.fn.now(),
        condicao_devolucao,
        equipamento_danificado: equipamento_danificado || false,
        valor_final: valor_final || aluguel.valor_acordado,
        observacoes: observacoes || aluguel.observacoes,
        status: 'devolvido',
        updated_at: db.fn.now()
      })
      .returning('*');

    // Atualiza status do patrimônio
    const novoStatus = equipamento_danificado ? 'manutencao' : 'disponivel';
    await db('patrimonio')
      .where({ id: aluguel.patrimonio_id })
      .update({ status: novoStatus, updated_at: db.fn.now() });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Erro ao registrar devolução:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao registrar devolução' } });
  }
});

/**
 * POST /api/v1/alugueis/:id/cancelar
 * Cancela um aluguel
 */
router.post('/:id/cancelar', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { motivo } = req.body;

    const aluguel = await db('alugueis')
      .where({ id: req.params.id, tenant_id: tenantId })
      .first();

    if (!aluguel) {
      return res.status(404).json({ success: false, error: { message: 'Aluguel não encontrado' } });
    }

    if (aluguel.status === 'devolvido' || aluguel.status === 'cancelado') {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Este aluguel já foi finalizado' } 
      });
    }

    // Atualiza aluguel
    const [updated] = await db('alugueis')
      .where({ id: req.params.id })
      .update({
        status: 'cancelado',
        observacoes: motivo ? `CANCELADO: ${motivo}` : 'CANCELADO',
        updated_at: db.fn.now()
      })
      .returning('*');

    // Libera patrimônio
    await db('patrimonio')
      .where({ id: aluguel.patrimonio_id })
      .update({ status: 'disponivel', updated_at: db.fn.now() });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Erro ao cancelar aluguel:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao cancelar aluguel' } });
  }
});

/**
 * POST /api/v1/alugueis/:id/pagamentos
 * Registra pagamento de um aluguel
 * Integração: Cria entrada no Financeiro automaticamente
 */
router.post('/:id/pagamentos', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { valor, data_pagamento, forma_pagamento, observacoes } = req.body;

    // Buscar aluguel com dados do patrimônio e cliente
    const aluguel = await db('alugueis')
      .where({ 'alugueis.id': req.params.id, 'alugueis.tenant_id': tenantId })
      .leftJoin('patrimonio', 'patrimonio.id', 'alugueis.patrimonio_id')
      .leftJoin('clients', 'clients.id', 'alugueis.client_id')
      .select(
        'alugueis.*',
        'patrimonio.nome as patrimonio_nome',
        'patrimonio.codigo as patrimonio_codigo',
        'clients.name as client_name'
      )
      .first();

    if (!aluguel) {
      return res.status(404).json({ success: false, error: { message: 'Aluguel não encontrado' } });
    }

    const dataPgto = data_pagamento || new Date().toISOString().split('T')[0];

    // Registrar pagamento do aluguel
    const [pagamento] = await db('aluguel_pagamentos')
      .insert({
        tenant_id: tenantId,
        aluguel_id: req.params.id,
        valor,
        data_pagamento: dataPgto,
        forma_pagamento: forma_pagamento || 'dinheiro',
        observacoes
      })
      .returning('*');

    // INTEGRAÇÃO FINANCEIRO: Criar entrada de receita
    // Verificar se módulo financeiro está habilitado
    const tenant = await db('tenants').where({ id: tenantId }).first();
    const modules = typeof tenant.modules === 'string' ? JSON.parse(tenant.modules) : (tenant.modules || []);
    
    if (modules.includes('financeiro')) {
      const descricao = `Aluguel #${String(aluguel.numero).padStart(4, '0')} - ${aluguel.patrimonio_nome} (${aluguel.patrimonio_codigo}) - ${aluguel.client_name}`;
      
      await db('financial_entries').insert({
        tenant_id: tenantId,
        type: 'receita',
        description: descricao,
        amount: valor,
        due_date: dataPgto,
        paid_date: dataPgto,
        status: 'recebido', // Já está pago
        aluguel_id: req.params.id // Referência ao aluguel
      });
    }

    res.status(201).json({ success: true, data: pagamento });
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao registrar pagamento' } });
  }
});

/**
 * POST /api/v1/alugueis/:id/fatura
 * Gera uma fatura a partir do aluguel
 * INTEGRAÇÃO FATURAMENTO: Cria registro na tabela de faturas
 */
router.post('/:id/fatura', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { incluir_pendente = true } = req.body; // Se deve incluir saldo pendente

    // Verificar se módulo faturamento está habilitado
    const tenant = await db('tenants').where({ id: tenantId }).first();
    const modules = typeof tenant.modules === 'string' ? JSON.parse(tenant.modules) : (tenant.modules || []);
    
    if (!modules.includes('faturamento')) {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Módulo Faturamento não habilitado para esta conta' } 
      });
    }

    // Buscar aluguel completo
    const aluguel = await db('alugueis')
      .where({ 'alugueis.id': req.params.id, 'alugueis.tenant_id': tenantId })
      .leftJoin('patrimonio', 'patrimonio.id', 'alugueis.patrimonio_id')
      .leftJoin('clients', 'clients.id', 'alugueis.client_id')
      .select(
        'alugueis.*',
        'patrimonio.nome as patrimonio_nome',
        'patrimonio.codigo as patrimonio_codigo',
        'patrimonio.marca as patrimonio_marca',
        'patrimonio.modelo as patrimonio_modelo',
        'clients.name as client_name',
        'clients.document as client_document',
        'clients.phone as client_phone',
        'clients.email as client_email',
        'clients.address_street',
        'clients.address_number',
        'clients.address_neighborhood',
        'clients.address_city',
        'clients.address_state',
        'clients.address_zip'
      )
      .first();

    if (!aluguel) {
      return res.status(404).json({ success: false, error: { message: 'Aluguel não encontrado' } });
    }

    // Calcular valores
    const pagamentos = await db('aluguel_pagamentos')
      .where({ aluguel_id: aluguel.id })
      .select(db.raw('COALESCE(SUM(valor), 0) as total'));
    
    const totalPago = parseFloat(pagamentos[0]?.total || 0);
    const valorAluguel = parseFloat(aluguel.valor_final || aluguel.valor_acordado);
    const saldoPendente = valorAluguel - totalPago;

    // Valor da fatura
    const valorFatura = incluir_pendente ? saldoPendente : valorAluguel;

    if (valorFatura <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Não há valor pendente para faturar' } 
      });
    }

    // Formatar período
    const dataInicio = new Date(aluguel.data_inicio).toLocaleDateString('pt-BR');
    const dataFim = aluguel.data_devolucao 
      ? new Date(aluguel.data_devolucao).toLocaleDateString('pt-BR')
      : new Date(aluguel.data_prevista_devolucao).toLocaleDateString('pt-BR');

    // Montar descrição do item
    const tipoCobrancaLabels = {
      diaria: 'Diária',
      semanal: 'Semanal', 
      mensal: 'Mensal',
      fixo: 'Valor Fixo'
    };

    const descricaoItem = `Aluguel de ${aluguel.patrimonio_nome} (${aluguel.patrimonio_codigo})${aluguel.patrimonio_marca ? ' - ' + aluguel.patrimonio_marca : ''}${aluguel.patrimonio_modelo ? ' ' + aluguel.patrimonio_modelo : ''} | Período: ${dataInicio} a ${dataFim} | Cobrança: ${tipoCobrancaLabels[aluguel.tipo_cobranca] || aluguel.tipo_cobranca}`;

    // Gerar dados da fatura (não salvamos em tabela separada, apenas retornamos para uso no frontend)
    const faturaData = {
      aluguel_id: aluguel.id,
      aluguel_numero: aluguel.numero,
      cliente: {
        nome: aluguel.client_name,
        documento: aluguel.client_document,
        telefone: aluguel.client_phone,
        email: aluguel.client_email,
        endereco: aluguel.address_street ? 
          `${aluguel.address_street}, ${aluguel.address_number || 'S/N'} - ${aluguel.address_neighborhood || ''}, ${aluguel.address_city || ''} - ${aluguel.address_state || ''} CEP: ${aluguel.address_zip || ''}` 
          : null
      },
      equipamento: {
        codigo: aluguel.patrimonio_codigo,
        nome: aluguel.patrimonio_nome,
        marca: aluguel.patrimonio_marca,
        modelo: aluguel.patrimonio_modelo
      },
      periodo: {
        inicio: aluguel.data_inicio,
        fim: aluguel.data_devolucao || aluguel.data_prevista_devolucao,
        tipo_cobranca: aluguel.tipo_cobranca
      },
      valores: {
        valor_acordado: valorAluguel,
        total_pago: totalPago,
        saldo_pendente: saldoPendente,
        valor_fatura: valorFatura
      },
      itens: [{
        descricao: descricaoItem,
        quantidade: 1,
        valor_unitario: valorFatura,
        valor_total: valorFatura
      }],
      data_emissao: new Date().toISOString(),
      observacoes: aluguel.observacoes
    };

    res.json({ success: true, data: faturaData });
  } catch (error) {
    console.error('Erro ao gerar fatura:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao gerar fatura' } });
  }
});

module.exports = router;

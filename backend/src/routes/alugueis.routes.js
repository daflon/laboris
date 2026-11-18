/**
 * Rotas do Módulo de Aluguéis
 * - Patrimônio (equipamentos próprios)
 * - Contratos de aluguel
 * - Pagamentos
 */

const { Router } = require('express');
const PDFDocument = require('pdfkit');
const db = require('../database/connection');
const companySettingsRepository = require('../repositories/companySettings.repository');

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
 * GET /api/v1/alugueis/calendario
 * Retorna dados para o calendário visual de devoluções
 */
router.get('/calendario', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { year, month, inicio, fim } = req.query;

    let dataInicio, dataFim;

    // Se passou year e month, usa para filtrar o mês específico
    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      dataInicio = new Date(y, m - 1, 1);
      dataFim = new Date(y, m, 0); // Último dia do mês
    } else {
      // Período padrão: próximas 4 semanas
      dataInicio = inicio ? new Date(inicio) : new Date();
      dataFim = fim ? new Date(fim) : new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
    }

    // Formatar datas para SQL (YYYY-MM-DD)
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const dataInicioStr = formatDate(dataInicio);
    const dataFimStr = formatDate(dataFim);

    // Buscar aluguéis ativos/atrasados com devolução prevista no período
    const alugueis = await db('alugueis')
      .where({ 'alugueis.tenant_id': tenantId })
      .whereIn('alugueis.status', ['ativo', 'atrasado'])
      .where('alugueis.data_prevista_devolucao', '>=', dataInicioStr)
      .where('alugueis.data_prevista_devolucao', '<=', dataFimStr)
      .leftJoin('patrimonio', 'patrimonio.id', 'alugueis.patrimonio_id')
      .leftJoin('clients', 'clients.id', 'alugueis.client_id')
      .select(
        'alugueis.id',
        'alugueis.numero',
        'alugueis.patrimonio_id',
        'alugueis.data_inicio',
        'alugueis.data_prevista_devolucao',
        'alugueis.status',
        'alugueis.valor_acordado',
        'patrimonio.codigo as patrimonio_codigo',
        'patrimonio.nome as patrimonio_nome',
        'patrimonio.categoria as patrimonio_categoria',
        'clients.name as client_name'
      )
      .orderBy('alugueis.data_prevista_devolucao', 'asc');

    // Retornar lista simplificada de itens para o calendário
    const items = alugueis.map(a => ({
      id: a.id,
      numero: a.numero,
      data_prevista_devolucao: a.data_prevista_devolucao,
      data_inicio: a.data_inicio,
      status: a.status,
      valor_acordado: a.valor_acordado,
      patrimonio_id: a.patrimonio_id,
      patrimonio_codigo: a.patrimonio_codigo,
      patrimonio_nome: a.patrimonio_nome,
      patrimonio_categoria: a.patrimonio_categoria,
      client_name: a.client_name
    }));

    res.json({ 
      success: true, 
      data: {
        periodo: { inicio: dataInicioStr, fim: dataFimStr },
        items
      }
    });
  } catch (error) {
    console.error('Erro ao buscar calendário:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao buscar calendário', details: error.message } });
  }
});

/**
 * GET /api/v1/alugueis/:id/contrato
 * Gera PDF do contrato de locação (formato A5, duas vias)
 */
router.get('/:id/contrato', async (req, res) => {
  try {
    // Tentar pegar tenantId do middleware ou do token na query
    let tenantId = req.tenantId;
    
    // Se não tem tenantId (acesso via URL direta), extrair do token na query
    if (!tenantId && req.query.token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        tenantId = decoded.tenantId;
      } catch (e) {
        console.log('Erro ao decodificar token:', e.message);
      }
    }
    
    console.log('Contrato - buscando aluguel:', req.params.id, 'tenant:', tenantId);

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
        'patrimonio.numero_serie as patrimonio_serie',
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

    console.log('Contrato - aluguel encontrado:', !!aluguel);

    if (!aluguel) {
      return res.status(404).json({ success: false, error: { message: 'Aluguel não encontrado' } });
    }

    // Buscar dados da empresa
    const company = await companySettingsRepository.get(tenantId);

    // Criar PDF A4 (duas vias A5)
    const doc = new PDFDocument({ size: 'A4', margin: 20 });

    const fileName = `Contrato-Aluguel-${String(aluguel.numero).padStart(4, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
    doc.pipe(res);

    const halfPage = doc.page.height / 2;

    // Renderizar duas vias (superior e inferior)
    renderContratoAluguel(doc, aluguel, company, 20);
    
    // Linha de corte
    doc.save();
    doc.moveTo(20, halfPage).lineTo(doc.page.width - 20, halfPage).dash(5, { space: 3 }).stroke('#999');
    doc.undash();
    doc.restore();

    // Segunda via
    renderContratoAluguel(doc, aluguel, company, halfPage + 10);

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar contrato:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao gerar contrato' } });
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
    const userId = req.user.userId;
    const { data_devolucao, condicao_devolucao, equipamento_danificado, valor_final, observacoes } = req.body;

    const aluguel = await db('alugueis')
      .where({ 'alugueis.id': req.params.id, 'alugueis.tenant_id': tenantId })
      .leftJoin('patrimonio', 'patrimonio.id', 'alugueis.patrimonio_id')
      .leftJoin('clients', 'clients.id', 'alugueis.client_id')
      .select(
        'alugueis.id',
        'alugueis.numero',
        'alugueis.patrimonio_id',
        'alugueis.client_id',
        'alugueis.status',
        'alugueis.valor_acordado',
        'alugueis.observacoes',
        'patrimonio.nome as patrimonio_nome',
        'patrimonio.codigo as patrimonio_codigo',
        'patrimonio.marca as patrimonio_marca',
        'patrimonio.modelo as patrimonio_modelo',
        'patrimonio.numero_serie as patrimonio_serie',
        'patrimonio.categoria as patrimonio_categoria',
        'clients.name as client_name'
      )
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

    let osData = null;

    // Se equipamento danificado, cria OS de manutenção
    if (equipamento_danificado) {
      console.log('Devolução danificada - criando OS para patrimônio:', aluguel.patrimonio_codigo);
      
      // Buscar ou criar cliente "interno" para manutenção de patrimônio
      let clienteInterno = await db('clients')
        .where({ tenant_id: tenantId, name: 'MANUTENÇÃO INTERNA' })
        .whereNull('deleted_at')
        .first();

      if (!clienteInterno) {
        console.log('Criando cliente MANUTENÇÃO INTERNA');
        const tenant = await db('tenants').where({ id: tenantId }).first();
        [clienteInterno] = await db('clients')
          .insert({
            tenant_id: tenantId,
            name: 'MANUTENÇÃO INTERNA',
            phone: tenant?.phone || '',
            document: tenant?.document || ''
          })
          .returning('*');
      }
      console.log('Cliente interno:', clienteInterno?.id);

      // Criar ou buscar equipamento correspondente ao patrimônio
      const serialNumber = aluguel.patrimonio_serie || `PAT-${aluguel.patrimonio_codigo}`;
      console.log('Buscando equipamento com serial:', serialNumber);
      
      let equipment = await db('equipment')
        .where({ 
          tenant_id: tenantId, 
          serial_number: serialNumber
        })
        .whereNull('deleted_at')
        .first();

      if (!equipment) {
        console.log('Criando equipamento para patrimônio');
        [equipment] = await db('equipment')
          .insert({
            tenant_id: tenantId,
            client_id: clienteInterno.id,
            type: aluguel.patrimonio_categoria || 'Patrimônio',
            brand: aluguel.patrimonio_marca || 'N/A',
            model: aluguel.patrimonio_modelo || aluguel.patrimonio_nome,
            serial_number: serialNumber
          })
          .returning('*');
      }
      console.log('Equipamento:', equipment?.id);

      // Buscar primeiro técnico disponível do tenant
      const technician = await db('technicians')
        .where({ tenant_id: tenantId })
        .first();
      
      if (!technician) {
        console.log('Nenhum técnico encontrado para o tenant');
        return res.status(400).json({ error: 'Nenhum técnico cadastrado. Cadastre um técnico antes de registrar equipamento danificado.' });
      }
      console.log('Técnico encontrado:', technician.id, technician.name);

      // Gerar próximo número de OS
      const lastOs = await db('service_orders')
        .where({ tenant_id: tenantId })
        .max('order_number as max')
        .first();
      const orderNumber = (lastOs?.max || 0) + 1;
      console.log('Criando OS número:', orderNumber);

      // Criar OS
      const [newOs] = await db('service_orders')
        .insert({
          tenant_id: tenantId,
          client_id: clienteInterno.id,
          equipment_id: equipment.id,
          technician_id: technician.id,
          order_number: orderNumber,
          status: 'aberta',
          entry_date: new Date(),
          reported_defect: `Equipamento danificado na devolução do Aluguel #${String(aluguel.numero).padStart(4, '0')}.\n${aluguel.patrimonio_nome} (${aluguel.patrimonio_codigo})\nCliente: ${aluguel.client_name}\n${condicao_devolucao ? `Condição: ${condicao_devolucao}` : ''}`
        })
        .returning('*');

      console.log('OS criada:', newOs?.id);
      osData = {
        id: newOs.id,
        order_number: orderNumber
      };
    }

    // Atualiza aluguel
    const obsAtualizada = observacoes || aluguel.observacoes;
    const obsComOs = osData 
      ? `${obsAtualizada || ''}\n[OS #${String(osData.order_number).padStart(4, '0')} criada para manutenção]`.trim()
      : obsAtualizada;

    const [updated] = await db('alugueis')
      .where({ id: req.params.id })
      .update({
        data_devolucao: data_devolucao || db.fn.now(),
        condicao_devolucao,
        equipamento_danificado: equipamento_danificado || false,
        valor_final: valor_final || aluguel.valor_acordado,
        observacoes: obsComOs,
        os_manutencao_id: osData?.id || null,
        status: 'devolvido',
        updated_at: db.fn.now()
      })
      .returning('*');

    // Atualiza status do patrimônio
    const novoStatus = equipamento_danificado ? 'manutencao' : 'disponivel';
    await db('patrimonio')
      .where({ id: aluguel.patrimonio_id })
      .update({ status: novoStatus, updated_at: db.fn.now() });

    res.json({ 
      success: true, 
      data: updated,
      os_criada: osData
    });
  } catch (error) {
    console.error('Erro ao registrar devolução:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao registrar devolução', details: error.message } });
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

    // Verificar se aluguel já foi finalizado
    if (aluguel.status === 'cancelado') {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Não é possível registrar pagamento em aluguel cancelado' } 
      });
    }

    // Calcular total já pago
    const pagamentosExistentes = await db('aluguel_pagamentos')
      .where({ aluguel_id: req.params.id })
      .select(db.raw('COALESCE(SUM(valor), 0) as total'));
    
    const totalJaPago = parseFloat(pagamentosExistentes[0]?.total || 0);
    const valorAluguel = parseFloat(aluguel.valor_final || aluguel.valor_acordado);
    const saldoRestante = valorAluguel - totalJaPago;

    // Verificar se já está totalmente pago
    if (saldoRestante <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: { message: `Este aluguel já está totalmente pago (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalJaPago)})` } 
      });
    }

    // Verificar se o valor não excede o saldo
    if (parseFloat(valor) > saldoRestante + 0.01) { // tolerância de centavos
      return res.status(400).json({ 
        success: false, 
        error: { message: `Valor excede o saldo restante de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoRestante)}` } 
      });
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
 * DELETE /api/v1/alugueis/:id/pagamentos/:pagamentoId
 * Estorna/exclui um pagamento de aluguel
 * Integração: Remove a entrada correspondente no Financeiro
 */
router.delete('/:id/pagamentos/:pagamentoId', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id, pagamentoId } = req.params;

    // Verificar se o pagamento existe e pertence ao aluguel/tenant
    const pagamento = await db('aluguel_pagamentos')
      .where({ 
        id: pagamentoId, 
        aluguel_id: id,
        tenant_id: tenantId 
      })
      .first();

    if (!pagamento) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Pagamento não encontrado' } 
      });
    }

    // Buscar aluguel para verificar status
    const aluguel = await db('alugueis')
      .where({ id, tenant_id: tenantId })
      .first();

    if (!aluguel) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Aluguel não encontrado' } 
      });
    }

    // Excluir pagamento
    await db('aluguel_pagamentos')
      .where({ id: pagamentoId })
      .del();

    // INTEGRAÇÃO FINANCEIRO: Remover entrada correspondente
    // Busca pelo aluguel_id e valor similar na mesma data
    await db('financial_entries')
      .where({ 
        tenant_id: tenantId,
        aluguel_id: id,
        amount: pagamento.valor
      })
      .whereRaw("DATE(paid_date) = DATE(?)", [pagamento.data_pagamento])
      .del();

    res.json({ 
      success: true, 
      message: 'Pagamento estornado com sucesso',
      data: { estornado: pagamento }
    });
  } catch (error) {
    console.error('Erro ao estornar pagamento:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao estornar pagamento' } });
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

// ==================== NOVAS FUNCIONALIDADES ====================

/**
 * POST /api/v1/alugueis/:id/renovar
 * Renova um aluguel (estende o período)
 */
router.post('/:id/renovar', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { nova_data_devolucao, dias_adicionais, novo_valor_diaria, observacoes } = req.body;

    // Buscar aluguel
    const aluguel = await db('alugueis')
      .where({ id: req.params.id, tenant_id: tenantId })
      .first();

    if (!aluguel) {
      return res.status(404).json({ success: false, error: { message: 'Aluguel não encontrado' } });
    }

    if (aluguel.status !== 'ativo' && aluguel.status !== 'atrasado') {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Só é possível renovar aluguéis ativos ou atrasados' } 
      });
    }

    // Calcular nova data de devolução
    let novaDataDevolucao;
    if (nova_data_devolucao) {
      novaDataDevolucao = new Date(nova_data_devolucao);
    } else if (dias_adicionais) {
      novaDataDevolucao = new Date(aluguel.data_prevista_devolucao);
      novaDataDevolucao.setDate(novaDataDevolucao.getDate() + parseInt(dias_adicionais));
    } else {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Informe nova_data_devolucao ou dias_adicionais' } 
      });
    }

    // Calcular valor adicional
    const dataAtual = new Date(aluguel.data_prevista_devolucao);
    const diffTime = Math.abs(novaDataDevolucao - dataAtual);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Buscar valor da diária do patrimônio se não informado
    let valorDiaria = novo_valor_diaria;
    if (!valorDiaria) {
      const patrimonio = await db('patrimonio').where({ id: aluguel.patrimonio_id }).first();
      valorDiaria = patrimonio?.valor_diaria || 0;
    }

    const valorAdicional = diffDays * parseFloat(valorDiaria);
    const novoValorTotal = parseFloat(aluguel.valor_acordado) + valorAdicional;

    // Atualizar aluguel
    const [updated] = await db('alugueis')
      .where({ id: req.params.id })
      .update({
        data_prevista_devolucao: novaDataDevolucao,
        valor_acordado: novoValorTotal,
        status: 'ativo', // Volta pra ativo se estava atrasado
        observacoes: observacoes 
          ? `${aluguel.observacoes || ''}\n[RENOVAÇÃO ${new Date().toLocaleDateString('pt-BR')}] +${diffDays} dias, +R$ ${valorAdicional.toFixed(2)}. ${observacoes}`.trim()
          : `${aluguel.observacoes || ''}\n[RENOVAÇÃO ${new Date().toLocaleDateString('pt-BR')}] +${diffDays} dias, +R$ ${valorAdicional.toFixed(2)}`.trim(),
        updated_at: db.fn.now()
      })
      .returning('*');

    res.json({ 
      success: true, 
      data: updated,
      renovacao: {
        dias_adicionais: diffDays,
        valor_adicional: valorAdicional,
        novo_valor_total: novoValorTotal
      }
    });
  } catch (error) {
    console.error('Erro ao renovar aluguel:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao renovar aluguel' } });
  }
});

/**
 * POST /api/v1/alugueis/patrimonio/:id/manutencao
 * Marca patrimônio como em manutenção e opcionalmente cria OS
 */
router.post('/patrimonio/:id/manutencao', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    const { criar_os, defeito_relatado, observacoes } = req.body;

    // Buscar patrimônio
    const patrimonio = await db('patrimonio')
      .where({ id: req.params.id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .first();

    if (!patrimonio) {
      return res.status(404).json({ success: false, error: { message: 'Equipamento não encontrado' } });
    }

    // Atualizar status para manutenção
    await db('patrimonio')
      .where({ id: req.params.id })
      .update({ 
        status: 'manutencao', 
        observacoes: observacoes 
          ? `${patrimonio.observacoes || ''}\n[MANUTENÇÃO ${new Date().toLocaleDateString('pt-BR')}] ${observacoes}`.trim()
          : patrimonio.observacoes,
        updated_at: db.fn.now() 
      });

    let osData = null;

    // Criar OS de manutenção se solicitado
    if (criar_os) {
      // Verificar se existe um equipamento cadastrado para este patrimônio
      // Se não existir, criar um registro genérico de equipamento
      let equipmentId = null;
      
      // Buscar tenant como cliente (equipamento próprio da empresa)
      const tenant = await db('tenants').where({ id: tenantId }).first();
      
      // Buscar ou criar cliente "interno" para manutenção de patrimônio
      let clienteInterno = await db('clients')
        .where({ tenant_id: tenantId, name: 'MANUTENÇÃO INTERNA' })
        .whereNull('deleted_at')
        .first();

      if (!clienteInterno) {
        [clienteInterno] = await db('clients')
          .insert({
            tenant_id: tenantId,
            name: 'MANUTENÇÃO INTERNA',
            phone: tenant.phone || '',
            document: tenant.document || ''
          })
          .returning('*');
      }

      // Criar ou buscar equipamento correspondente ao patrimônio
      let equipment = await db('equipment')
        .where({ 
          tenant_id: tenantId, 
          serial_number: patrimonio.numero_serie || `PAT-${patrimonio.codigo}`
        })
        .whereNull('deleted_at')
        .first();

      if (!equipment) {
        [equipment] = await db('equipment')
          .insert({
            tenant_id: tenantId,
            client_id: clienteInterno.id,
            type: patrimonio.categoria || 'Patrimônio',
            brand: patrimonio.marca || 'N/A',
            model: patrimonio.modelo || patrimonio.nome,
            serial_number: patrimonio.numero_serie || `PAT-${patrimonio.codigo}`
          })
          .returning('*');
      }

      // Gerar próximo número de OS
      const lastOs = await db('service_orders')
        .where({ tenant_id: tenantId })
        .max('order_number as max')
        .first();
      const orderNumber = (lastOs?.max || 0) + 1;

      // Criar OS
      const [newOs] = await db('service_orders')
        .insert({
          tenant_id: tenantId,
          client_id: clienteInterno.id,
          equipment_id: equipment.id,
          order_number: orderNumber,
          status: 'aberta',
          entry_date: new Date(),
          reported_defect: defeito_relatado || `Manutenção de patrimônio: ${patrimonio.nome} (${patrimonio.codigo})`,
          created_by: userId
        })
        .returning('*');

      // Atualizar patrimônio com referência à OS
      await db('patrimonio')
        .where({ id: req.params.id })
        .update({ 
          observacoes: `${patrimonio.observacoes || ''}\n[OS #${String(orderNumber).padStart(4, '0')} criada para manutenção]`.trim()
        });

      osData = {
        id: newOs.id,
        order_number: orderNumber
      };
    }

    res.json({ 
      success: true, 
      message: 'Patrimônio marcado como em manutenção',
      data: {
        patrimonio_id: req.params.id,
        status: 'manutencao',
        os_criada: osData
      }
    });
  } catch (error) {
    console.error('Erro ao marcar manutenção:', error);
    res.status(500).json({ success: false, error: { message: 'Erro ao marcar manutenção' } });
  }
});

// ==================== HELPERS ====================

/**
 * Renderiza uma via do contrato de aluguel
 */
function renderContratoAluguel(doc, aluguel, company, startY) {
  const leftMargin = 25;
  const pageWidth = doc.page.width - 50;
  const halfHeight = (doc.page.height / 2) - 30;
  let y = startY;

  // Logo da empresa
  const hasLogo = company && company.logo_url && company.logo_url.startsWith('data:image');
  let textStartX = leftMargin;

  if (hasLogo) {
    try {
      doc.image(company.logo_url, leftMargin, y, { 
        width: 50,
        height: 35,
        fit: [50, 35]
      });
      textStartX = leftMargin + 55;
    } catch (e) {
      console.error('Erro ao carregar logo:', e.message);
    }
  }

  // Cabeçalho empresa
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text(company?.name || 'Empresa', textStartX, y + 3, { width: pageWidth - 60 });
  
  doc.fontSize(6).font('Helvetica');
  const phones = [company?.phone, company?.phone2].filter(Boolean).join(' | ');
  if (phones) {
    doc.text(phones, textStartX, y + 15, { width: pageWidth - 60 });
  }
  y += 40;

  // Linha
  doc.moveTo(leftMargin, y).lineTo(doc.page.width - 25, y).lineWidth(0.5).stroke('#333');
  y += 5;

  // Título
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af');
  doc.text('CONTRATO DE LOCAÇÃO DE EQUIPAMENTO', leftMargin, y, { width: pageWidth, align: 'center' });
  doc.fontSize(11).fillColor('#e11d48');
  const numeroFormatado = String(aluguel.numero).padStart(4, '0');
  doc.text(`#${numeroFormatado}`, leftMargin, y + 12, { width: pageWidth, align: 'center' });
  doc.fillColor('#000');
  y += 28;

  // Dados do locatário
  doc.fontSize(7).font('Helvetica-Bold');
  doc.text('LOCATÁRIO', leftMargin, y);
  y += 9;
  doc.font('Helvetica').fontSize(7);
  doc.text(`Nome: ${aluguel.client_name || ''}`, leftMargin, y);
  doc.text(`Tel: ${formatPhoneHelper(aluguel.client_phone)}`, 320, y);
  y += 9;
  doc.text(`Doc: ${formatDocumentHelper(aluguel.client_document)}`, leftMargin, y);
  y += 12;

  // Dados do equipamento
  doc.font('Helvetica-Bold');
  doc.text('EQUIPAMENTO', leftMargin, y);
  y += 9;
  doc.font('Helvetica');
  const equipDesc = `${aluguel.patrimonio_nome} (${aluguel.patrimonio_codigo})${aluguel.patrimonio_marca ? ' - ' + aluguel.patrimonio_marca : ''}${aluguel.patrimonio_modelo ? ' ' + aluguel.patrimonio_modelo : ''}`;
  doc.text(equipDesc, leftMargin, y, { width: pageWidth });
  y += 9;
  if (aluguel.patrimonio_serie) {
    doc.text(`N/S: ${aluguel.patrimonio_serie}`, leftMargin, y);
    y += 9;
  }

  // Período e valores
  y += 3;
  doc.font('Helvetica-Bold');
  doc.text('PERÍODO E VALORES', leftMargin, y);
  y += 9;
  doc.font('Helvetica');
  
  const dataInicio = new Date(aluguel.data_inicio).toLocaleDateString('pt-BR');
  const dataFim = new Date(aluguel.data_prevista_devolucao).toLocaleDateString('pt-BR');
  const tipoCobranca = { diaria: 'Diária', semanal: 'Semanal', mensal: 'Mensal', fixo: 'Fixo' }[aluguel.tipo_cobranca] || aluguel.tipo_cobranca;
  
  doc.text(`Retirada: ${dataInicio}`, leftMargin, y);
  doc.text(`Devolução: ${dataFim}`, 180, y);
  doc.text(`Cobrança: ${tipoCobranca}`, 320, y);
  y += 9;

  // Valor em destaque
  doc.rect(leftMargin, y, pageWidth, 18).fill('#f1f5f9').stroke('#ccc');
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(9);
  doc.text(`VALOR TOTAL: R$ ${Number(aluguel.valor_acordado).toFixed(2)}`, leftMargin + 5, y + 4, { width: pageWidth - 10, align: 'center' });
  doc.fontSize(7);
  y += 22;

  // Condição do equipamento
  if (aluguel.condicao_saida) {
    doc.font('Helvetica-Bold').fontSize(6);
    doc.text('CONDIÇÃO NA RETIRADA:', leftMargin, y);
    y += 7;
    doc.font('Helvetica');
    doc.text(aluguel.condicao_saida, leftMargin, y, { width: pageWidth });
    y += 12;
  }

  // Termos resumidos
  doc.fontSize(5).font('Helvetica-Oblique').fillColor('#666');
  const termos = 'Declaro ter recebido o equipamento em perfeitas condições. Comprometo-me a devolvê-lo no prazo acordado e nas mesmas condições. Em caso de atraso ou dano, responsabilizo-me pelos custos adicionais conforme tabela vigente.';
  doc.text(termos, leftMargin, y, { width: pageWidth, align: 'justify' });
  doc.fillColor('#000');
  y += 18;

  // Assinaturas
  const signatureWidth = (pageWidth - 30) / 2;
  doc.moveTo(leftMargin, y + 15).lineTo(leftMargin + signatureWidth, y + 15).lineWidth(0.5).stroke('#333');
  doc.moveTo(leftMargin + signatureWidth + 30, y + 15).lineTo(doc.page.width - 25, y + 15).stroke('#333');
  
  doc.fontSize(5);
  doc.text('Assinatura do Locatário', leftMargin, y + 18, { width: signatureWidth, align: 'center' });
  doc.text('Assinatura do Locador', leftMargin + signatureWidth + 30, y + 18, { width: signatureWidth, align: 'center' });
}

/**
 * Helpers de formatação
 */
function formatPhoneHelper(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatDocumentHelper(doc) {
  if (!doc) return '';
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length === 14) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  return doc;
}

module.exports = router;

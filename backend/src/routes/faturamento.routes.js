const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const authMiddleware = require('../middlewares/auth').authenticate;
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

const JWT_SECRET = process.env.JWT_SECRET || 'oslaboris_dev_secret';

// Middleware especial que aceita token via query (para downloads de PDF)
function authWithQuery(req, res, next) {
  // Primeiro tenta header Authorization
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  
  // Se não encontrou no header, tenta query string
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token não fornecido' },
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token inválido ou expirado' },
    });
  }
}

router.use(authWithQuery);

// Middleware para verificar se módulo faturamento está habilitado
router.use(async (req, res, next) => {
  try {
    const tenant = await db('tenants').where({ id: req.tenantId }).first();
    if (!tenant) return res.status(404).json({ success: false, error: { message: 'Tenant não encontrado' } });
    
    const modules = typeof tenant.modules === 'string' ? JSON.parse(tenant.modules) : (tenant.modules || ['os']);
    if (!modules.includes('faturamento')) {
      return res.status(403).json({ success: false, error: { message: 'Módulo Faturamento não habilitado para esta conta' } });
    }
    
    next();
  } catch (err) {
    next(err);
  }
});

// GET /faturamento/resumo?month=8&year=2026
router.get('/resumo', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    
    // Buscar OS concluídas/entregues do período
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = m === 12 
      ? `${y + 1}-01-01` 
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    
    // Total faturado e quantidade de OS
    const osQuery = await db('service_orders as so')
      .where('so.tenant_id', req.tenantId)
      .whereIn('so.status', ['concluida', 'entregue'])
      .where('so.completion_date', '>=', startDate)
      .where('so.completion_date', '<', endDate)
      .whereNull('so.deleted_at')
      .select('so.id');
    
    const osIds = osQuery.map(o => o.id);
    
    let totalOS = 0;
    
    if (osIds.length > 0) {
      const items = await db('service_order_items')
        .whereIn('service_order_id', osIds)
        .select(db.raw('SUM(quantity * unit_price) as total'));
      
      totalOS = parseFloat(items[0]?.total) || 0;
    }
    
    // Buscar pagamentos de aluguéis do período
    const alugueisQuery = await db('aluguel_pagamentos')
      .where('tenant_id', req.tenantId)
      .where('data_pagamento', '>=', startDate)
      .where('data_pagamento', '<', endDate)
      .select(db.raw('SUM(valor) as total'), db.raw('COUNT(*) as qtd'));
    
    const totalAlugueis = parseFloat(alugueisQuery[0]?.total) || 0;
    const qtdAlugueis = parseInt(alugueisQuery[0]?.qtd) || 0;
    
    // Total geral
    const totalFaturado = totalOS + totalAlugueis;
    const qtdTotal = osIds.length + qtdAlugueis;
    const ticketMedio = qtdTotal > 0 ? totalFaturado / qtdTotal : 0;
    
    // Clientes únicos atendidos (OS + Aluguéis)
    const clientesOSQuery = await db('service_orders')
      .where('tenant_id', req.tenantId)
      .whereIn('status', ['concluida', 'entregue'])
      .where('completion_date', '>=', startDate)
      .where('completion_date', '<', endDate)
      .whereNull('deleted_at')
      .pluck('client_id');
    
    const clientesAluguelQuery = await db('aluguel_pagamentos as ap')
      .join('alugueis as a', 'a.id', 'ap.aluguel_id')
      .where('ap.tenant_id', req.tenantId)
      .where('ap.data_pagamento', '>=', startDate)
      .where('ap.data_pagamento', '<', endDate)
      .pluck('a.client_id');
    
    const clientesUnicos = new Set([...clientesOSQuery, ...clientesAluguelQuery]);
    const clientesAtendidos = clientesUnicos.size;
    
    res.json({
      success: true,
      data: {
        total_faturado: totalFaturado,
        total_os: totalOS,
        total_alugueis: totalAlugueis,
        qtd_os: osIds.length,
        qtd_alugueis: qtdAlugueis,
        ticket_medio: ticketMedio,
        clientes_atendidos: clientesAtendidos,
        periodo: { month: m, year: y }
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /faturamento/grafico?months=6
router.get('/grafico', async (req, res, next) => {
  try {
    const monthsBack = parseInt(req.query.months) || 6;
    const now = new Date();
    const result = [];
    
    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = date.getMonth() + 1;
      const y = date.getFullYear();
      
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = m === 12 
        ? `${y + 1}-01-01` 
        : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      
      // Total de OS
      const osQuery = await db('service_orders as so')
        .where('so.tenant_id', req.tenantId)
        .whereIn('so.status', ['concluida', 'entregue'])
        .where('so.completion_date', '>=', startDate)
        .where('so.completion_date', '<', endDate)
        .whereNull('so.deleted_at')
        .select('so.id');
      
      const osIds = osQuery.map(o => o.id);
      let totalOS = 0;
      
      if (osIds.length > 0) {
        const items = await db('service_order_items')
          .whereIn('service_order_id', osIds)
          .select(db.raw('SUM(quantity * unit_price) as total'));
        totalOS = parseFloat(items[0]?.total) || 0;
      }
      
      // Total de Aluguéis
      const alugueisQuery = await db('aluguel_pagamentos')
        .where('tenant_id', req.tenantId)
        .where('data_pagamento', '>=', startDate)
        .where('data_pagamento', '<', endDate)
        .select(db.raw('SUM(valor) as total'), db.raw('COUNT(*) as qtd'));
      
      const totalAlugueis = parseFloat(alugueisQuery[0]?.total) || 0;
      const qtdAlugueis = parseInt(alugueisQuery[0]?.qtd) || 0;
      
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      result.push({
        month: m,
        year: y,
        label: monthNames[m - 1],
        total: totalOS + totalAlugueis,
        total_os: totalOS,
        total_alugueis: totalAlugueis,
        qtd_os: osIds.length,
        qtd_alugueis: qtdAlugueis
      });
    }
    
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /faturamento/por-tecnico?month=8&year=2026
router.get('/por-tecnico', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = m === 12 
      ? `${y + 1}-01-01` 
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    
    // Buscar OS por técnico
    const result = await db('service_orders as so')
      .join('technicians as t', 'so.technician_id', 't.id')
      .where('so.tenant_id', req.tenantId)
      .whereIn('so.status', ['concluida', 'entregue'])
      .where('so.completion_date', '>=', startDate)
      .where('so.completion_date', '<', endDate)
      .whereNull('so.deleted_at')
      .groupBy('t.id', 't.name')
      .select('t.id', 't.name')
      .count('so.id as qtd_os');
    
    // Calcular valor por técnico
    const techData = [];
    for (const tech of result) {
      const osIds = await db('service_orders')
        .where('tenant_id', req.tenantId)
        .where('technician_id', tech.id)
        .whereIn('status', ['concluida', 'entregue'])
        .where('completion_date', '>=', startDate)
        .where('completion_date', '<', endDate)
        .whereNull('deleted_at')
        .pluck('id');
      
      let total = 0;
      if (osIds.length > 0) {
        const items = await db('service_order_items')
          .whereIn('service_order_id', osIds)
          .select(db.raw('SUM(quantity * unit_price) as total'));
        total = parseFloat(items[0]?.total) || 0;
      }
      
      techData.push({
        id: tech.id,
        name: tech.name,
        qtd_os: parseInt(tech.qtd_os),
        total
      });
    }
    
    // Ordenar por total desc
    techData.sort((a, b) => b.total - a.total);
    
    res.json({ success: true, data: techData });
  } catch (err) {
    next(err);
  }
});

// GET /faturamento/lista?month=8&year=2026
router.get('/lista', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = m === 12 
      ? `${y + 1}-01-01` 
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    
    // Buscar OS concluídas/entregues
    const orders = await db('service_orders as so')
      .join('clients as c', 'so.client_id', 'c.id')
      .join('equipment as e', 'so.equipment_id', 'e.id')
      .leftJoin('technicians as t', 'so.technician_id', 't.id')
      .where('so.tenant_id', req.tenantId)
      .whereIn('so.status', ['concluida', 'entregue'])
      .where('so.completion_date', '>=', startDate)
      .where('so.completion_date', '<', endDate)
      .whereNull('so.deleted_at')
      .select(
        'so.id',
        'so.order_number',
        'so.lote_sufixo',
        'so.status',
        'so.completion_date',
        'c.name as client_name',
        'e.type as equipment_type',
        'e.brand as equipment_brand',
        't.name as technician_name'
      );
    
    // Calcular valor de cada OS e formatar
    const resultado = [];
    
    for (const order of orders) {
      const items = await db('service_order_items')
        .where('service_order_id', order.id)
        .select(db.raw('SUM(quantity * unit_price) as total'));
      
      resultado.push({
        id: order.id,
        tipo: 'os',
        numero: order.order_number,
        lote_sufixo: order.lote_sufixo,
        data: order.completion_date,
        client_name: order.client_name,
        descricao: `${order.equipment_type} ${order.equipment_brand}`.trim(),
        status: order.status,
        technician_name: order.technician_name,
        total: parseFloat(items[0]?.total) || 0
      });
    }
    
    // Buscar pagamentos de aluguéis
    const alugueis = await db('aluguel_pagamentos as ap')
      .join('alugueis as a', 'a.id', 'ap.aluguel_id')
      .join('clients as c', 'c.id', 'a.client_id')
      .join('patrimonio as p', 'p.id', 'a.patrimonio_id')
      .where('ap.tenant_id', req.tenantId)
      .where('ap.data_pagamento', '>=', startDate)
      .where('ap.data_pagamento', '<', endDate)
      .select(
        'ap.id',
        'a.id as aluguel_id',
        'a.numero',
        'ap.data_pagamento',
        'ap.valor',
        'c.name as client_name',
        'p.nome as patrimonio_nome',
        'p.codigo as patrimonio_codigo'
      );
    
    for (const aluguel of alugueis) {
      resultado.push({
        id: aluguel.id,
        aluguel_id: aluguel.aluguel_id,
        tipo: 'aluguel',
        numero: aluguel.numero,
        lote_sufixo: null,
        data: aluguel.data_pagamento,
        client_name: aluguel.client_name,
        descricao: `${aluguel.patrimonio_nome} (${aluguel.patrimonio_codigo})`,
        status: 'pago',
        technician_name: null,
        total: parseFloat(aluguel.valor) || 0
      });
    }
    
    // Ordenar por data desc
    resultado.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    res.json({ success: true, data: resultado });
  } catch (err) {
    next(err);
  }
});

// GET /faturamento/pdf?month=8&year=2026&tipo=compacto|grafico|completo
router.get('/pdf', async (req, res, next) => {
  try {
    const { month, year, tipo = 'compacto' } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = m === 12 
      ? `${y + 1}-01-01` 
      : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    
    // Buscar dados da empresa
    const company = await db('company_settings').where({ tenant_id: req.tenantId }).first();
    
    // Buscar OS do período
    const osData = await db('service_orders as so')
      .join('clients as c', 'so.client_id', 'c.id')
      .join('equipment as e', 'so.equipment_id', 'e.id')
      .leftJoin('technicians as t', 'so.technician_id', 't.id')
      .where('so.tenant_id', req.tenantId)
      .whereIn('so.status', ['concluida', 'entregue'])
      .where('so.completion_date', '>=', startDate)
      .where('so.completion_date', '<', endDate)
      .whereNull('so.deleted_at')
      .select(
        'so.id', 'so.order_number', 'so.lote_sufixo', 'so.status', 'so.completion_date',
        'c.name as client_name', 'e.type as equipment_type', 'e.brand as equipment_brand',
        't.name as technician_name', 't.id as technician_id'
      );
    
    // Calcular valores de OS
    const items = [];
    let totalOS = 0;
    const techTotals = {};
    const clientNames = new Set();
    
    for (const order of osData) {
      const osItems = await db('service_order_items')
        .where('service_order_id', order.id)
        .select(db.raw('SUM(quantity * unit_price) as total'));
      const osTotal = parseFloat(osItems[0]?.total) || 0;
      totalOS += osTotal;
      clientNames.add(order.client_name);
      
      if (order.technician_name) {
        if (!techTotals[order.technician_name]) techTotals[order.technician_name] = { qtd: 0, total: 0 };
        techTotals[order.technician_name].qtd++;
        techTotals[order.technician_name].total += osTotal;
      }
      
      items.push({
        tipo: 'os',
        numero: order.order_number,
        lote_sufixo: order.lote_sufixo,
        data: order.completion_date,
        client_name: order.client_name,
        descricao: `${order.equipment_type} ${order.equipment_brand}`.trim(),
        status: order.status,
        total: osTotal
      });
    }
    
    // Buscar pagamentos de aluguéis
    const alugueisData = await db('aluguel_pagamentos as ap')
      .join('alugueis as a', 'a.id', 'ap.aluguel_id')
      .join('clients as c', 'c.id', 'a.client_id')
      .join('patrimonio as p', 'p.id', 'a.patrimonio_id')
      .where('ap.tenant_id', req.tenantId)
      .where('ap.data_pagamento', '>=', startDate)
      .where('ap.data_pagamento', '<', endDate)
      .select(
        'a.numero',
        'ap.data_pagamento',
        'ap.valor',
        'c.name as client_name',
        'p.nome as patrimonio_nome',
        'p.codigo as patrimonio_codigo'
      );
    
    let totalAlugueis = 0;
    for (const aluguel of alugueisData) {
      const valor = parseFloat(aluguel.valor) || 0;
      totalAlugueis += valor;
      clientNames.add(aluguel.client_name);
      
      items.push({
        tipo: 'aluguel',
        numero: aluguel.numero,
        lote_sufixo: null,
        data: aluguel.data_pagamento,
        client_name: aluguel.client_name,
        descricao: `${aluguel.patrimonio_nome} (${aluguel.patrimonio_codigo})`,
        status: 'pago',
        total: valor
      });
    }
    
    // Ordenar por data desc
    items.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    const totalFaturado = totalOS + totalAlugueis;
    const ticketMedio = items.length > 0 ? totalFaturado / items.length : 0;
    const clientesUnicos = clientNames.size;
    
    // Gerar PDF usando a função auxiliar
    await generateFaturamentoPDF(res, { 
      company, 
      items, 
      totalFaturado, 
      totalOS,
      totalAlugueis,
      qtdOS: osData.length,
      qtdAlugueis: alugueisData.length,
      ticketMedio, 
      clientesUnicos, 
      techTotals, 
      m, y, tipo, 
      tenantId: req.tenantId, 
      db 
    });
    
  } catch (err) {
    next(err);
  }
});
    
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function truncate(str, len) {
  if (!str) return '-';
  return str.length > len ? str.substring(0, len - 2) + '..' : str;
}

async function generateFaturamentoPDF(res, data) {
  const { company, items, totalFaturado, totalOS, totalAlugueis, qtdOS, qtdAlugueis, ticketMedio, clientesUnicos, techTotals, m, y, tipo, tenantId, db } = data;
  const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  // Buscar dados do gráfico se necessário
  const graficoData = [];
  if (tipo === 'grafico' || tipo === 'completo') {
    const now = new Date(y, m - 1, 1);
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const gm = date.getMonth() + 1;
      const gy = date.getFullYear();
      const gStartDate = `${gy}-${String(gm).padStart(2, '0')}-01`;
      const gEndDate = gm === 12 ? `${gy + 1}-01-01` : `${gy}-${String(gm + 1).padStart(2, '0')}-01`;
      
      // OS
      const gOsQuery = await db('service_orders').where('tenant_id', tenantId)
        .whereIn('status', ['concluida', 'entregue'])
        .where('completion_date', '>=', gStartDate).where('completion_date', '<', gEndDate)
        .whereNull('deleted_at').select('id');
      
      let gTotalOS = 0;
      if (gOsQuery.length > 0) {
        const gItems = await db('service_order_items').whereIn('service_order_id', gOsQuery.map(o => o.id))
          .select(db.raw('SUM(quantity * unit_price) as total'));
        gTotalOS = parseFloat(gItems[0]?.total) || 0;
      }
      
      // Aluguéis
      const gAlugueisQuery = await db('aluguel_pagamentos')
        .where('tenant_id', tenantId)
        .where('data_pagamento', '>=', gStartDate)
        .where('data_pagamento', '<', gEndDate)
        .select(db.raw('SUM(valor) as total'));
      const gTotalAlugueis = parseFloat(gAlugueisQuery[0]?.total) || 0;
      
      const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      graficoData.push({ label: shortMonths[gm - 1], total: gTotalOS + gTotalAlugueis });
    }
  }
  
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=faturamento-${m}-${y}.pdf`);
  doc.pipe(res);
  
  let headerX = 40;
  // Logo
  if (company?.logo_url && company.logo_url.startsWith('data:image')) {
    try {
      const base64Data = company.logo_url.split(',')[1];
      const imgBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imgBuffer, 40, 30, { width: 55, height: 40 });
      headerX = 105;
    } catch (e) { /* ignora erro de logo */ }
  }
  
  // Header
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e40af').text(company?.name || 'Empresa', headerX, 35);
  if (company?.document) doc.fontSize(8).font('Helvetica').fillColor('#666').text('CNPJ: ' + company.document, headerX, 50);
  if (company?.phone) doc.text(company.phone + (company.phone2 ? ' | ' + company.phone2 : ''), headerX, 61);
  
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e40af').text('RELATORIO DE FATURAMENTO', 380, 35, { align: 'right', width: 175 });
  doc.fontSize(9).font('Helvetica').fillColor('#333').text(monthNames[m - 1] + ' ' + y, 380, 48, { align: 'right', width: 175 });
  doc.fontSize(7).fillColor('#888').text('Gerado em: ' + new Date().toLocaleDateString('pt-BR'), 380, 60, { align: 'right', width: 175 });
  
  doc.moveTo(40, 82).lineTo(555, 82).stroke('#2563eb');
  let yPos = 95;
  
  // Cards - atualizado para mostrar total de itens (OS + Aluguéis)
  const cw = 125, ch = 42;
  doc.rect(40, yPos, cw, ch).fill('#1e40af');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#fff').text(formatCurrency(totalFaturado), 45, yPos + 7, { width: cw - 10, align: 'center' });
  doc.fontSize(6).text('TOTAL FATURADO', 45, yPos + 26, { width: cw - 10, align: 'center' });
  
  doc.rect(175, yPos, cw, ch).fill('#f1f5f9').stroke('#e2e8f0');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text(String(qtdOS), 180, yPos + 7, { width: cw - 10, align: 'center' });
  doc.fontSize(6).fillColor('#64748b').text('OS CONCLUIDAS', 180, yPos + 26, { width: cw - 10, align: 'center' });
  
  doc.rect(310, yPos, cw, ch).fill('#f1f5f9').stroke('#e2e8f0');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text(String(qtdAlugueis), 315, yPos + 7, { width: cw - 10, align: 'center' });
  doc.fontSize(6).fillColor('#64748b').text('ALUGUEIS PAGOS', 315, yPos + 26, { width: cw - 10, align: 'center' });
  
  doc.rect(445, yPos, 110, ch).fill('#f1f5f9').stroke('#e2e8f0');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text(String(clientesUnicos), 450, yPos + 7, { width: 100, align: 'center' });
  doc.fontSize(6).fillColor('#64748b').text('CLIENTES', 450, yPos + 26, { width: 100, align: 'center' });
  
  yPos += ch + 18;
  
  // Gráfico
  if ((tipo === 'grafico' || tipo === 'completo') && graficoData.length) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af').text('Evolucao Mensal (6 meses)', 40, yPos);
    yPos += 14;
    const maxTotal = Math.max(...graficoData.map(g => g.total), 1);
    for (const item of graficoData) {
      const barWidth = Math.max((item.total / maxTotal) * 380, 5);
      doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(item.label, 40, yPos + 1, { width: 28 });
      doc.rect(72, yPos, barWidth, 11).fill('#2563eb');
      if (item.total > 0) {
        if (barWidth > 65) doc.fontSize(6).font('Helvetica-Bold').fillColor('#fff').text(formatCurrency(item.total), 72 + barWidth - 58, yPos + 2);
        else doc.fontSize(6).fillColor('#333').text(formatCurrency(item.total), 72 + barWidth + 4, yPos + 2);
      }
      yPos += 14;
    }
    yPos += 8;
  }
  
  // Por técnico
  if (tipo === 'completo' && Object.keys(techTotals).length) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af').text('Faturamento por Tecnico', 40, yPos);
    yPos += 14;
    Object.entries(techTotals).sort((a, b) => b[1].total - a[1].total).forEach(([name, d], i) => {
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#333').text((i + 1) + '. ' + name, 45, yPos);
      doc.font('Helvetica').fillColor('#64748b').text(d.qtd + ' OS', 240, yPos);
      doc.font('Helvetica-Bold').fillColor('#059669').text(formatCurrency(d.total), 340, yPos, { width: 100, align: 'right' });
      yPos += 12;
    });
    yPos += 8;
  }
  
  // Lista de Faturamento (OS + Aluguéis)
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af').text('Faturamento do Periodo', 40, yPos);
  yPos += 16;
  doc.rect(40, yPos, 515, 14).fill('#f1f5f9');
  doc.fontSize(6).font('Helvetica-Bold').fillColor('#334155')
    .text('ID', 45, yPos + 4).text('Data', 85, yPos + 4).text('Cliente', 121, yPos + 4)
    .text('Descricao', 255, yPos + 4).text('Status', 400, yPos + 4).text('Valor', 480, yPos + 4, { width: 70, align: 'right' });
  yPos += 16;
  
  const maxRows = tipo === 'compacto' ? 32 : (tipo === 'grafico' ? 20 : 14);
  const displayItems = items.slice(0, maxRows);
  const remaining = items.slice(maxRows);
  
  for (const o of displayItems) {
    if (yPos > 765) { doc.addPage(); yPos = 40; }
    // Formatar ID conforme tipo
    let idStr;
    if (o.tipo === 'os') {
      idStr = o.lote_sufixo ? 'OS#' + String(o.numero).padStart(4, '0') + '-' + o.lote_sufixo : 'OS#' + String(o.numero).padStart(4, '0');
    } else {
      idStr = 'AL#' + String(o.numero).padStart(4, '0');
    }
    const dt = o.data ? new Date(o.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-';
    
    // Cor diferente para aluguéis
    const idColor = o.tipo === 'aluguel' ? '#7c3aed' : '#333';
    
    doc.fontSize(6).font('Helvetica-Bold').fillColor(idColor).text(idStr, 45, yPos);
    doc.font('Helvetica').fillColor('#666').text(dt, 85, yPos).text(truncate(o.client_name, 22), 121, yPos).text(truncate(o.descricao, 24), 255, yPos);
    
    // Status com cor
    let statusColor = '#059669';
    let statusText = o.status;
    if (o.tipo === 'aluguel') {
      statusColor = '#7c3aed';
      statusText = 'Pago';
    } else if (o.status === 'entregue') {
      statusColor = '#1e40af';
      statusText = 'Entregue';
    } else {
      statusText = 'Concluida';
    }
    doc.fillColor(statusColor).text(statusText, 400, yPos);
    doc.font('Helvetica-Bold').fillColor('#333').text(formatCurrency(o.total), 480, yPos, { width: 70, align: 'right' });
    yPos += 11;
    doc.moveTo(40, yPos - 1).lineTo(555, yPos - 1).stroke('#e2e8f0');
  }
  
  if (remaining.length) {
    const remTotal = remaining.reduce((s, o) => s + o.total, 0);
    doc.fontSize(6).font('Helvetica-Oblique').fillColor('#64748b').text('... mais ' + remaining.length + ' itens ...', 45, yPos, { width: 350, align: 'center' });
    doc.font('Helvetica').text(formatCurrency(remTotal), 480, yPos, { width: 70, align: 'right' });
    yPos += 12;
  }
  
  doc.rect(40, yPos, 515, 18).fill('#1e40af');
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#fff').text('TOTAL DO PERIODO', 50, yPos + 5).text(formatCurrency(totalFaturado), 480, yPos + 5, { width: 70, align: 'right' });
  
  // Rodapé - posicionar logo após o total, não em posição fixa
  yPos += 30;
  doc.fontSize(6).font('Helvetica').fillColor('#94a3b8').text('OS Laboris - Sistema de Gestao de Ordens de Servico', 40, yPos);
  
  doc.end();
}

module.exports = router;

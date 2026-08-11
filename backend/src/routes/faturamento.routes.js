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
    
    let totalFaturado = 0;
    let ticketMedio = 0;
    
    if (osIds.length > 0) {
      const items = await db('service_order_items')
        .whereIn('service_order_id', osIds)
        .select(db.raw('SUM(quantity * unit_price) as total'));
      
      totalFaturado = parseFloat(items[0]?.total) || 0;
      ticketMedio = osIds.length > 0 ? totalFaturado / osIds.length : 0;
    }
    
    // Clientes únicos atendidos
    const clientesQuery = await db('service_orders')
      .where('tenant_id', req.tenantId)
      .whereIn('status', ['concluida', 'entregue'])
      .where('completion_date', '>=', startDate)
      .where('completion_date', '<', endDate)
      .whereNull('deleted_at')
      .countDistinct('client_id as count');
    
    const clientesAtendidos = parseInt(clientesQuery[0]?.count) || 0;
    
    res.json({
      success: true,
      data: {
        total_faturado: totalFaturado,
        qtd_os: osIds.length,
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
      
      const osQuery = await db('service_orders as so')
        .where('so.tenant_id', req.tenantId)
        .whereIn('so.status', ['concluida', 'entregue'])
        .where('so.completion_date', '>=', startDate)
        .where('so.completion_date', '<', endDate)
        .whereNull('so.deleted_at')
        .select('so.id');
      
      const osIds = osQuery.map(o => o.id);
      let total = 0;
      
      if (osIds.length > 0) {
        const items = await db('service_order_items')
          .whereIn('service_order_id', osIds)
          .select(db.raw('SUM(quantity * unit_price) as total'));
        total = parseFloat(items[0]?.total) || 0;
      }
      
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      result.push({
        month: m,
        year: y,
        label: monthNames[m - 1],
        total,
        qtd_os: osIds.length
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
    
    const orders = await db('service_orders as so')
      .join('clients as c', 'so.client_id', 'c.id')
      .join('equipment as e', 'so.equipment_id', 'e.id')
      .leftJoin('technicians as t', 'so.technician_id', 't.id')
      .where('so.tenant_id', req.tenantId)
      .whereIn('so.status', ['concluida', 'entregue'])
      .where('so.completion_date', '>=', startDate)
      .where('so.completion_date', '<', endDate)
      .whereNull('so.deleted_at')
      .orderBy('so.completion_date', 'desc')
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
    
    // Calcular valor de cada OS
    for (const order of orders) {
      const items = await db('service_order_items')
        .where('service_order_id', order.id)
        .select(db.raw('SUM(quantity * unit_price) as total'));
      order.total = parseFloat(items[0]?.total) || 0;
    }
    
    res.json({ success: true, data: orders });
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
    const orders = await db('service_orders as so')
      .join('clients as c', 'so.client_id', 'c.id')
      .join('equipment as e', 'so.equipment_id', 'e.id')
      .leftJoin('technicians as t', 'so.technician_id', 't.id')
      .where('so.tenant_id', req.tenantId)
      .whereIn('so.status', ['concluida', 'entregue'])
      .where('so.completion_date', '>=', startDate)
      .where('so.completion_date', '<', endDate)
      .whereNull('so.deleted_at')
      .orderBy('so.completion_date', 'desc')
      .select(
        'so.id', 'so.order_number', 'so.lote_sufixo', 'so.status', 'so.completion_date',
        'c.name as client_name', 'e.type as equipment_type', 'e.brand as equipment_brand',
        't.name as technician_name', 't.id as technician_id'
      );
    
    // Calcular valores
    let totalFaturado = 0;
    const techTotals = {};
    
    for (const order of orders) {
      const items = await db('service_order_items')
        .where('service_order_id', order.id)
        .select(db.raw('SUM(quantity * unit_price) as total'));
      order.total = parseFloat(items[0]?.total) || 0;
      totalFaturado += order.total;
      
      if (order.technician_name) {
        if (!techTotals[order.technician_name]) techTotals[order.technician_name] = { qtd: 0, total: 0 };
        techTotals[order.technician_name].qtd++;
        techTotals[order.technician_name].total += order.total;
      }
    }
    
    const ticketMedio = orders.length > 0 ? totalFaturado / orders.length : 0;
    const clientesUnicos = [...new Set(orders.map(o => o.client_name))].length;
    
    // Gerar PDF usando a função auxiliar
    await generateFaturamentoPDF(res, { company, orders, totalFaturado, ticketMedio, clientesUnicos, techTotals, m, y, tipo, tenantId: req.tenantId, db });
    
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
  const { company, orders, totalFaturado, ticketMedio, clientesUnicos, techTotals, m, y, tipo, tenantId, db } = data;
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
      
      const gOsQuery = await db('service_orders').where('tenant_id', tenantId)
        .whereIn('status', ['concluida', 'entregue'])
        .where('completion_date', '>=', gStartDate).where('completion_date', '<', gEndDate)
        .whereNull('deleted_at').select('id');
      
      let gTotal = 0;
      if (gOsQuery.length > 0) {
        const gItems = await db('service_order_items').whereIn('service_order_id', gOsQuery.map(o => o.id))
          .select(db.raw('SUM(quantity * unit_price) as total'));
        gTotal = parseFloat(gItems[0]?.total) || 0;
      }
      const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      graficoData.push({ label: shortMonths[gm - 1], total: gTotal });
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
  
  // Cards
  const cw = 125, ch = 42;
  doc.rect(40, yPos, cw, ch).fill('#1e40af');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#fff').text(formatCurrency(totalFaturado), 45, yPos + 7, { width: cw - 10, align: 'center' });
  doc.fontSize(6).text('TOTAL FATURADO', 45, yPos + 26, { width: cw - 10, align: 'center' });
  
  doc.rect(175, yPos, cw, ch).fill('#f1f5f9').stroke('#e2e8f0');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text(String(orders.length), 180, yPos + 7, { width: cw - 10, align: 'center' });
  doc.fontSize(6).fillColor('#64748b').text('OS CONCLUIDAS', 180, yPos + 26, { width: cw - 10, align: 'center' });
  
  doc.rect(310, yPos, cw, ch).fill('#f1f5f9').stroke('#e2e8f0');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text(formatCurrency(ticketMedio), 315, yPos + 7, { width: cw - 10, align: 'center' });
  doc.fontSize(6).fillColor('#64748b').text('TICKET MEDIO', 315, yPos + 26, { width: cw - 10, align: 'center' });
  
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
  
  // Lista de OS
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af').text('Ordens de Servico do Periodo', 40, yPos);
  yPos += 16;
  doc.rect(40, yPos, 515, 14).fill('#f1f5f9');
  doc.fontSize(6).font('Helvetica-Bold').fillColor('#334155')
    .text('OS', 45, yPos + 4).text('Data', 82, yPos + 4).text('Cliente', 118, yPos + 4)
    .text('Equipamento', 265, yPos + 4).text('Status', 400, yPos + 4).text('Valor', 480, yPos + 4, { width: 70, align: 'right' });
  yPos += 16;
  
  const maxRows = tipo === 'compacto' ? 32 : (tipo === 'grafico' ? 20 : 14);
  const displayOrders = orders.slice(0, maxRows);
  const remaining = orders.slice(maxRows);
  
  for (const o of displayOrders) {
    if (yPos > 765) { doc.addPage(); yPos = 40; }
    const osNum = o.lote_sufixo ? '#' + String(o.order_number).padStart(4, '0') + '-' + o.lote_sufixo : '#' + String(o.order_number).padStart(4, '0');
    const dt = o.completion_date ? new Date(o.completion_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-';
    doc.fontSize(6).font('Helvetica-Bold').fillColor('#333').text(osNum, 45, yPos);
    doc.font('Helvetica').fillColor('#666').text(dt, 82, yPos).text(truncate(o.client_name, 25), 118, yPos).text(truncate(o.equipment_type + ' ' + o.equipment_brand, 22), 265, yPos);
    doc.fillColor(o.status === 'concluida' ? '#059669' : '#1e40af').text(o.status === 'concluida' ? 'Concluida' : 'Entregue', 400, yPos);
    doc.font('Helvetica-Bold').fillColor('#333').text(formatCurrency(o.total), 480, yPos, { width: 70, align: 'right' });
    yPos += 11;
    doc.moveTo(40, yPos - 1).lineTo(555, yPos - 1).stroke('#e2e8f0');
  }
  
  if (remaining.length) {
    const remTotal = remaining.reduce((s, o) => s + o.total, 0);
    doc.fontSize(6).font('Helvetica-Oblique').fillColor('#64748b').text('... mais ' + remaining.length + ' OS ...', 45, yPos, { width: 350, align: 'center' });
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

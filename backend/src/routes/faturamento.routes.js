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
        'so.id',
        'so.order_number',
        'so.lote_sufixo',
        'so.status',
        'so.completion_date',
        'c.name as client_name',
        'e.type as equipment_type',
        'e.brand as equipment_brand',
        't.name as technician_name',
        't.id as technician_id'
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
      
      // Agregar por técnico
      if (order.technician_name) {
        if (!techTotals[order.technician_name]) {
          techTotals[order.technician_name] = { qtd: 0, total: 0 };
        }
        techTotals[order.technician_name].qtd++;
        techTotals[order.technician_name].total += order.total;
      }
    }
    
    const ticketMedio = orders.length > 0 ? totalFaturado / orders.length : 0;
    
    // Clientes únicos
    const clientesUnicos = [...new Set(orders.map(o => o.client_name))].length;
    
    // Gráfico dos últimos 6 meses
    const graficoData = [];
    if (tipo === 'grafico' || tipo === 'completo') {
      const now = new Date(y, m - 1, 1);
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const gm = date.getMonth() + 1;
        const gy = date.getFullYear();
        
        const gStartDate = `${gy}-${String(gm).padStart(2, '0')}-01`;
        const gEndDate = gm === 12 
          ? `${gy + 1}-01-01` 
          : `${gy}-${String(gm + 1).padStart(2, '0')}-01`;
        
        const gOsQuery = await db('service_orders as so')
          .where('so.tenant_id', req.tenantId)
          .whereIn('so.status', ['concluida', 'entregue'])
          .where('so.completion_date', '>=', gStartDate)
          .where('so.completion_date', '<', gEndDate)
          .whereNull('so.deleted_at')
          .select('so.id');
        
        const gOsIds = gOsQuery.map(o => o.id);
        let gTotal = 0;
        
        if (gOsIds.length > 0) {
          const gItems = await db('service_order_items')
            .whereIn('service_order_id', gOsIds)
            .select(db.raw('SUM(quantity * unit_price) as total'));
          gTotal = parseFloat(gItems[0]?.total) || 0;
        }
        
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        graficoData.push({ label: monthNames[gm - 1], total: gTotal });
      }
    }
    
    // Criar PDF
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=faturamento-${m}-${y}.pdf`);
    
    doc.pipe(res);
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    // Header
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e40af')
       .text(company?.name || 'Empresa', 40, 40);
    
    if (company?.document) {
      doc.fontSize(9).font('Helvetica').fillColor('#666')
         .text(`CNPJ: ${company.document}`, 40, 60);
    }
    if (company?.phone) {
      doc.text(`${company.phone}${company.phone2 ? ' | ' + company.phone2 : ''}`, 40, 72);
    }
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af')
       .text('RELATÓRIO DE FATURAMENTO', 350, 40, { align: 'right' });
    doc.fontSize(11).font('Helvetica').fillColor('#333')
       .text(`${monthNames[m - 1]} ${y}`, 350, 56, { align: 'right' });
    doc.fontSize(8).fillColor('#888')
       .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 350, 70, { align: 'right' });
    
    // Linha divisória
    doc.moveTo(40, 95).lineTo(555, 95).stroke('#2563eb');
    
    let yPos = 115;
    
    // Cards de resumo
    const cardWidth = 125;
    const cardHeight = 50;
    const cardY = yPos;
    
    // Card Total Faturado (destaque)
    doc.rect(40, cardY, cardWidth, cardHeight).fill('#1e40af');
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#fff')
       .text(formatCurrency(totalFaturado), 45, cardY + 10, { width: cardWidth - 10, align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor('rgba(255,255,255,0.8)')
       .text('TOTAL FATURADO', 45, cardY + 32, { width: cardWidth - 10, align: 'center' });
    
    // Card OS
    doc.rect(175, cardY, cardWidth, cardHeight).fill('#f1f5f9').stroke('#e2e8f0');
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#333')
       .text(String(orders.length), 180, cardY + 10, { width: cardWidth - 10, align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor('#64748b')
       .text('OS CONCLUÍDAS', 180, cardY + 32, { width: cardWidth - 10, align: 'center' });
    
    // Card Ticket Médio
    doc.rect(310, cardY, cardWidth, cardHeight).fill('#f1f5f9').stroke('#e2e8f0');
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#333')
       .text(formatCurrency(ticketMedio), 315, cardY + 10, { width: cardWidth - 10, align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor('#64748b')
       .text('TICKET MÉDIO', 315, cardY + 32, { width: cardWidth - 10, align: 'center' });
    
    // Card Clientes
    doc.rect(445, cardY, 110, cardHeight).fill('#f1f5f9').stroke('#e2e8f0');
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#333')
       .text(String(clientesUnicos), 450, cardY + 10, { width: 100, align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor('#64748b')
       .text('CLIENTES', 450, cardY + 32, { width: 100, align: 'center' });
    
    yPos = cardY + cardHeight + 25;
    
    // Gráfico (se tipo grafico ou completo)
    if (tipo === 'grafico' || tipo === 'completo') {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e40af')
         .text('📈 Evolução Mensal (últimos 6 meses)', 40, yPos);
      yPos += 18;
      
      const maxTotal = Math.max(...graficoData.map(g => g.total), 1);
      const barMaxWidth = 350;
      
      for (const item of graficoData) {
        const barWidth = (item.total / maxTotal) * barMaxWidth;
        
        doc.fontSize(8).font('Helvetica').fillColor('#64748b')
           .text(item.label, 40, yPos + 2, { width: 35 });
        
        doc.rect(80, yPos, barWidth || 5, 14).fill('#2563eb');
        
        if (item.total > 0) {
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#fff')
             .text(formatCurrency(item.total), barWidth > 60 ? 80 + barWidth - 55 : 85, yPos + 3);
        }
        
        yPos += 20;
      }
      
      yPos += 15;
    }
    
    // Por técnico (se tipo completo)
    if (tipo === 'completo' && Object.keys(techTotals).length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e40af')
         .text('👷 Faturamento por Técnico', 40, yPos);
      yPos += 18;
      
      const sortedTechs = Object.entries(techTotals)
        .sort((a, b) => b[1].total - a[1].total);
      
      const medals = ['🥇', '🥈', '🥉'];
      sortedTechs.forEach(([name, data], idx) => {
        const medal = idx < 3 ? medals[idx] : '  ';
        doc.fontSize(9).font('Helvetica').fillColor('#333')
           .text(`${medal} ${name}`, 45, yPos);
        doc.fillColor('#64748b')
           .text(`${data.qtd} OS`, 250, yPos);
        doc.font('Helvetica-Bold').fillColor('#059669')
           .text(formatCurrency(data.total), 350, yPos, { width: 100, align: 'right' });
        yPos += 16;
      });
      
      yPos += 15;
    }
    
    // Lista de OS
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e40af')
       .text('📋 Ordens de Serviço do Período', 40, yPos);
    yPos += 20;
    
    // Cabeçalho da tabela
    doc.rect(40, yPos, 515, 18).fill('#f1f5f9');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155')
       .text('OS', 45, yPos + 5)
       .text('Data', 85, yPos + 5)
       .text('Cliente', 130, yPos + 5)
       .text('Equipamento', 270, yPos + 5)
       .text('Status', 410, yPos + 5)
       .text('Valor', 480, yPos + 5, { width: 70, align: 'right' });
    yPos += 20;
    
    // Linhas da tabela
    const maxRows = tipo === 'compacto' ? 25 : (tipo === 'grafico' ? 15 : 10);
    const displayOrders = orders.slice(0, maxRows);
    const remainingOrders = orders.slice(maxRows);
    let remainingTotal = remainingOrders.reduce((sum, o) => sum + o.total, 0);
    
    for (const order of displayOrders) {
      if (yPos > 750) {
        doc.addPage();
        yPos = 40;
      }
      
      const osNum = order.lote_sufixo 
        ? `#${String(order.order_number).padStart(4, '0')}-${order.lote_sufixo}`
        : `#${String(order.order_number).padStart(4, '0')}`;
      
      const dateStr = order.completion_date 
        ? new Date(order.completion_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        : '-';
      
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#333')
         .text(osNum, 45, yPos);
      doc.font('Helvetica').fillColor('#666')
         .text(dateStr, 85, yPos)
         .text(truncate(order.client_name, 22), 130, yPos)
         .text(truncate(`${order.equipment_type} ${order.equipment_brand}`, 22), 270, yPos);
      
      // Badge de status
      const statusColor = order.status === 'concluida' ? '#059669' : '#1e40af';
      const statusLabel = order.status === 'concluida' ? 'Concluída' : 'Entregue';
      doc.fontSize(7).fillColor(statusColor).text(statusLabel, 410, yPos);
      
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#333')
         .text(formatCurrency(order.total), 480, yPos, { width: 70, align: 'right' });
      
      yPos += 14;
      doc.moveTo(40, yPos - 2).lineTo(555, yPos - 2).stroke('#e2e8f0');
    }
    
    // Se há mais OS
    if (remainingOrders.length > 0) {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748b')
         .text(`... mais ${remainingOrders.length} ordens de serviço ...`, 45, yPos, { width: 380, align: 'center' });
      doc.font('Helvetica').text(formatCurrency(remainingTotal), 480, yPos, { width: 70, align: 'right' });
      yPos += 16;
    }
    
    // Total
    doc.rect(40, yPos, 515, 22).fill('#1e40af');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff')
       .text('TOTAL DO PERÍODO', 50, yPos + 6)
       .text(formatCurrency(totalFaturado), 480, yPos + 6, { width: 70, align: 'right' });
    
    // Rodapé
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
       .text('OS Laboris - Sistema de Gestão de Ordens de Serviço', 40, 810)
       .text('Página 1', 480, 810, { width: 70, align: 'right' });
    
    doc.end();
    
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

module.exports = router;

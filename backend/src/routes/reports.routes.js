const { Router } = require('express');
const PDFDocument = require('pdfkit');
const db = require('../database/connection');
const companySettingsRepository = require('../repositories/companySettings.repository');

const router = Router();

/**
 * GET /api/v1/reports/monthly
 * Gera PDF com relatório mensal de OS
 * Query params: month (1-12), year (ex: 2026)
 */
router.get('/monthly', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    console.log('[Reports] Gerando relatório mensal para tenant:', tenantId);
    
    if (!tenantId) {
      console.log('[Reports] Erro: tenant não encontrado');
      return res.status(401).json({ success: false, error: { message: 'Não autenticado' } });
    }

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    console.log('[Reports] Período:', month, '/', year);

    // Data início e fim do mês
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Último dia do mês

    // Buscar OS do período
    console.log('[Reports] Buscando OS de', startDate, 'até', endDate);
    
    const orders = await db('service_orders')
      .where('service_orders.tenant_id', tenantId)
      .whereNull('service_orders.deleted_at')
      .whereBetween('service_orders.entry_date', [startDate, endDate])
      .leftJoin('clients', 'clients.id', 'service_orders.client_id')
      .leftJoin('equipment', 'equipment.id', 'service_orders.equipment_id')
      .leftJoin('technicians', 'technicians.id', 'service_orders.technician_id')
      .select(
        'service_orders.*',
        'clients.name as client_name',
        'equipment.type as equipment_type',
        'equipment.brand as equipment_brand',
        'technicians.name as technician_name'
      )
      .orderBy('service_orders.entry_date', 'asc');

    console.log('[Reports] Encontradas', orders.length, 'OS');

    // Buscar itens de cada OS para calcular valores
    for (const order of orders) {
      const items = await db('service_order_items').where({ service_order_id: order.id });
      order.items = items;
      order.total = items.reduce((sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.unit_price), 0);
    }

    const company = await companySettingsRepository.get(tenantId);

    // Estatísticas
    const stats = {
      total: orders.length,
      byStatus: {},
      totalValue: orders.reduce((sum, o) => sum + o.total, 0),
      avgValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0,
    };

    orders.forEach(o => {
      stats.byStatus[o.status] = (stats.byStatus[o.status] || 0) + 1;
    });

    // Gerar PDF
    const doc = new PDFDocument({ size: 'A4', margin: 30 });

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const fileName = `Relatorio-${monthNames[month-1]}-${year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
    doc.pipe(res);

    const leftMargin = 30;
    const pageWidth = doc.page.width - 60;
    let y = 30;

    // Cabeçalho
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(company?.name || 'OS Laboris', leftMargin, y, { width: pageWidth, align: 'center' });
    y += 20;

    doc.fontSize(16).fillColor('#1e40af');
    doc.text(`Relatório de ${monthNames[month-1]} de ${year}`, leftMargin, y, { width: pageWidth, align: 'center' });
    doc.fillColor('#000');
    y += 30;

    // Resumo
    doc.moveTo(leftMargin, y).lineTo(doc.page.width - 30, y).stroke('#ddd');
    y += 15;

    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('RESUMO DO PERÍODO', leftMargin, y);
    y += 18;

    doc.fontSize(9).font('Helvetica');
    const col2 = 200;
    const col3 = 380;

    doc.font('Helvetica-Bold').text('Total de OS:', leftMargin, y, { continued: true });
    doc.font('Helvetica').text(` ${stats.total}`);
    
    doc.font('Helvetica-Bold').text('Valor Total:', col2, y, { continued: true });
    doc.font('Helvetica').text(` R$ ${stats.totalValue.toFixed(2)}`);
    
    doc.font('Helvetica-Bold').text('Ticket Médio:', col3, y, { continued: true });
    doc.font('Helvetica').text(` R$ ${stats.avgValue.toFixed(2)}`);
    y += 15;

    // Status breakdown
    const statusLabels = {
      aberta: 'Abertas',
      aprovada: 'Avisadas',
      aguardando_peca: 'Aguardando Peça',
      concluida: 'Concluídas',
      entregue: 'Entregues',
      cancelada: 'Canceladas'
    };

    const statusParts = Object.entries(stats.byStatus)
      .map(([status, count]) => `${statusLabels[status] || status}: ${count}`)
      .join('  |  ');
    
    doc.fontSize(8).fillColor('#666');
    doc.text(statusParts, leftMargin, y, { width: pageWidth });
    doc.fillColor('#000');
    y += 25;

    // Tabela de OS
    doc.moveTo(leftMargin, y).lineTo(doc.page.width - 30, y).stroke('#ddd');
    y += 10;

    // Header da tabela
    const colNum = leftMargin;
    const colData = leftMargin + 50;
    const colCliente = leftMargin + 110;
    const colEquip = leftMargin + 250;
    const colStatus = leftMargin + 380;
    const colValor = leftMargin + 460;
    const tableRight = doc.page.width - 30;

    doc.rect(colNum, y, tableRight - colNum, 16).fill('#f1f5f9').stroke('#ddd');
    doc.fillColor('#333').fontSize(7).font('Helvetica-Bold');
    doc.text('Nº OS', colNum + 3, y + 4);
    doc.text('Data', colData + 3, y + 4);
    doc.text('Cliente', colCliente + 3, y + 4);
    doc.text('Equipamento', colEquip + 3, y + 4);
    doc.text('Status', colStatus + 3, y + 4);
    doc.text('Valor', colValor + 3, y + 4);
    doc.fillColor('#000');
    y += 16;

    // Linhas
    doc.font('Helvetica').fontSize(7);
    const rowHeight = 14;
    
    for (const order of orders) {
      // Verificar se precisa nova página
      if (y + rowHeight > doc.page.height - 50) {
        doc.addPage();
        y = 30;
      }

      const osNum = order.lote_sufixo 
        ? `${String(order.order_number).padStart(4, '0')}-${order.lote_sufixo}`
        : String(order.order_number).padStart(4, '0');
      
      const dataFormatted = order.entry_date 
        ? new Date(order.entry_date).toLocaleDateString('pt-BR')
        : '—';

      doc.rect(colNum, y, tableRight - colNum, rowHeight).stroke('#eee');
      doc.text(osNum, colNum + 3, y + 3, { width: 45 });
      doc.text(dataFormatted, colData + 3, y + 3, { width: 55 });
      doc.text((order.client_name || '').substring(0, 25), colCliente + 3, y + 3, { width: 135 });
      doc.text(`${order.equipment_brand || ''} ${order.equipment_type || ''}`.substring(0, 22), colEquip + 3, y + 3, { width: 125 });
      doc.text(statusLabels[order.status] || order.status, colStatus + 3, y + 3, { width: 75 });
      doc.text(`R$ ${order.total.toFixed(2)}`, colValor + 3, y + 3, { width: 70 });
      
      y += rowHeight;
    }

    // Rodapé
    y += 15;
    doc.moveTo(leftMargin, y).lineTo(doc.page.width - 30, y).stroke('#ddd');
    y += 10;

    doc.fontSize(7).fillColor('#999');
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, leftMargin, y);
    doc.text('OS Laboris - Sistema de Gestão', leftMargin, y, { width: pageWidth, align: 'right' });

    doc.end();
  } catch (error) {
    console.error('[Reports] Erro ao gerar relatório:', error.message, error.stack);
    next(error);
  }
});

module.exports = router;

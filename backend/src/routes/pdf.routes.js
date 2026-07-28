const { Router } = require('express');
const PDFDocument = require('pdfkit');
const serviceOrdersRepository = require('../repositories/serviceOrders.repository');
const companySettingsRepository = require('../repositories/companySettings.repository');
const db = require('../database/connection');

const router = Router();

router.get('/service-orders/:id/pdf', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: { message: 'Não autenticado' } });
    }

    const order = await serviceOrdersRepository.findById(tenantId, req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: { message: 'OS não encontrada' } });
    }

    const company = await companySettingsRepository.get(tenantId);
    
    // Parâmetros de lote
    const printFullLote = req.query.lote === 'true' && order.lote_numero;
    const formato = req.query.formato || 'individual'; // 'individual' ou 'resumo'
    const statusFilter = req.query.status ? req.query.status.split(',') : null; // ex: 'concluida,entregue'
    const selectedIds = req.query.ids ? req.query.ids.split(',') : null; // IDs específicos selecionados
    
    let ordersToRender = [order];
    
    if (printFullLote) {
      // Buscar todas as OS do lote
      let query = db('service_orders')
        .where({ 'service_orders.tenant_id': tenantId, 'service_orders.lote_numero': order.lote_numero })
        .whereNull('service_orders.deleted_at')
        .leftJoin('clients', 'clients.id', 'service_orders.client_id')
        .leftJoin('equipment', 'equipment.id', 'service_orders.equipment_id')
        .leftJoin('technicians', 'technicians.id', 'service_orders.technician_id')
        .select(
          'service_orders.*',
          'clients.name as client_name',
          'clients.phone as client_phone',
          'clients.document as client_document',
          'equipment.type as equipment_type',
          'equipment.brand as equipment_brand',
          'equipment.model as equipment_model',
          'equipment.serial_number as equipment_serial_number',
          'technicians.name as technician_name'
        )
        .orderBy('service_orders.lote_sufixo', 'asc');
      
      // Filtro por status
      if (statusFilter && statusFilter.length > 0) {
        query = query.whereIn('service_orders.status', statusFilter);
      }
      
      // Filtro por IDs específicos
      if (selectedIds && selectedIds.length > 0) {
        query = query.whereIn('service_orders.id', selectedIds);
      }
      
      const loteOrders = await query;
      
      // Adicionar itens a cada OS
      for (const o of loteOrders) {
        o.items = await db('service_order_items').where({ service_order_id: o.id });
      }
      
      ordersToRender = loteOrders;
      
      // Se formato é resumo, renderizar documento consolidado
      if (formato === 'resumo' && ordersToRender.length > 0) {
        return renderLoteResumo(res, ordersToRender, company, order.lote_numero);
      }
    }

    const doc = new PDFDocument({ size: 'A4', margin: 25 });

    // Nome do arquivo
    const fileName = printFullLote 
      ? `Lote-${String(order.lote_numero).padStart(4, '0')}.pdf`
      : `OS-${order.lote_sufixo ? `${String(order.order_number).padStart(4, '0')}-${order.lote_sufixo}` : String(order.order_number).padStart(4, '0')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
    doc.pipe(res);

    const footerText = company && company.footer_text
      ? company.footer_text
      : 'Mediante a realização ou não do serviço, a máquina deverá ser retirada no prazo de 180 dias conforme a PL 2545/22. Contados a partir da autorização ou não do serviço.';

    // Renderizar cada OS
    ordersToRender.forEach((orderToRender, index) => {
      if (index > 0) {
        doc.addPage();
      }

      const osNumber = orderToRender.lote_sufixo 
        ? `${String(orderToRender.order_number).padStart(4, '0')}-${orderToRender.lote_sufixo}`
        : String(orderToRender.order_number).padStart(4, '0');
      
      const entryDate = orderToRender.entry_date ? formatDate(orderToRender.entry_date) : '___/___/______';
      const items = orderToRender.items || [];
      const totalValue = items.reduce((sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.unit_price), 0);

      // Renderiza a OS duas vezes (metade superior e metade inferior)
      renderOS(doc, orderToRender, company, osNumber, entryDate, items, totalValue, footerText, 25);

      // Linha tracejada de corte no meio
      const halfPage = doc.page.height / 2;
      doc.save();
      doc.moveTo(25, halfPage).lineTo(doc.page.width - 25, halfPage).dash(5, { space: 3 }).stroke('#999');
      doc.undash();
      doc.restore();

      // Segunda via (metade inferior)
      renderOS(doc, orderToRender, company, osNumber, entryDate, items, totalValue, footerText, halfPage + 15);
    });

    doc.end();
  } catch (error) {
    next(error);
  }
});

function renderOS(doc, order, company, osNumber, entryDate, items, totalValue, footerText, startY) {
  const leftMargin = 30;
  const pageWidth = doc.page.width - 60;
  const rightCol = 370;
  let y = startY;

  // Logo da empresa (se existir)
  const hasLogo = company && company.logo_url && company.logo_url.startsWith('data:image');
  let textStartX = leftMargin;
  
  if (hasLogo) {
    try {
      // Logo à esquerda
      doc.image(company.logo_url, leftMargin, y, { 
        width: 80,
        height: 50,
        fit: [80, 50],
        align: 'center',
        valign: 'center'
      });
      textStartX = leftMargin + 90; // Texto começa após a logo
    } catch (e) {
      // Se falhar ao carregar logo, ignora
      console.error('Erro ao carregar logo:', e.message);
    }
  }

  // Cabeçalho empresa (ao lado da logo ou centralizado)
  if (hasLogo) {
    // Com logo: texto à direita da logo
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(company.name || 'OS Laboris', textStartX, y + 5, { width: pageWidth - 100 });
    
    doc.fontSize(8).font('Helvetica');
    const phones = [company.phone, company.phone2].filter(Boolean).map(formatPhone).join(' | ');
    if (phones) {
      doc.text(phones, textStartX, y + 20, { width: pageWidth - 100 });
    }
    const address = buildAddress(company);
    if (address) {
      doc.text(address, textStartX, y + 30, { width: pageWidth - 100 });
    }
    if (company.header_text) {
      doc.fontSize(7).font('Helvetica-Oblique');
      doc.text(company.header_text, textStartX, y + 42, { width: pageWidth - 100 });
    }
    y += 55;
  } else {
    // Sem logo: texto centralizado (comportamento original)
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(company && company.name ? company.name : 'OS Laboris', leftMargin, y, { width: pageWidth, align: 'center' });
    y += 16;

    doc.fontSize(8).font('Helvetica');
    if (company) {
      const phones = [company.phone, company.phone2].filter(Boolean).map(formatPhone).join(' | ');
      if (phones) {
        doc.text(phones, leftMargin, y, { width: pageWidth, align: 'center' });
        y += 10;
      }
      const address = buildAddress(company);
      if (address) {
        doc.text(address, leftMargin, y, { width: pageWidth, align: 'center' });
        y += 10;
      }
    }

    if (company && company.header_text) {
      doc.fontSize(7).font('Helvetica-Oblique');
      doc.text(company.header_text, leftMargin, y, { width: pageWidth, align: 'center' });
      y += 10;
    }
  }

  // Linha
  y += 3;
  doc.moveTo(leftMargin, y).lineTo(doc.page.width - 30, y).lineWidth(0.5).stroke('#333');
  y += 8;

  // Nº OS e Data
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('ORÇAMENTO Nº', leftMargin, y);
  doc.fontSize(13).fillColor('#e11d48');
  doc.text(osNumber, leftMargin + 85, y - 1);
  doc.fillColor('#000');
  doc.fontSize(9).font('Helvetica');
  doc.text(`DATA: ${entryDate}`, rightCol, y);
  y += 16;

  // Cliente
  doc.font('Helvetica-Bold').fontSize(8);
  doc.text('CLIENTE: ', leftMargin, y, { continued: true });
  doc.font('Helvetica').text(order.client_name || '');
  doc.font('Helvetica-Bold').text('TEL: ', rightCol, y, { continued: true });
  doc.font('Helvetica').text(formatPhone(order.client_phone || ''));
  y += 12;

  doc.font('Helvetica-Bold').text('DOC: ', leftMargin, y, { continued: true });
  doc.font('Helvetica').text(formatDocument(order.client_document || ''));
  y += 12;

  // Máquina
  doc.font('Helvetica-Bold').text('MÁQUINA: ', leftMargin, y, { continued: true });
  doc.font('Helvetica').text(`${order.equipment_type} - ${order.equipment_brand} ${order.equipment_model}`);
  if (order.equipment_serial_number) {
    doc.font('Helvetica-Bold').text('Nº SÉRIE: ', rightCol, y, { continued: true });
    doc.font('Helvetica').text(order.equipment_serial_number);
  }
  y += 12;

  // Situação
  doc.font('Helvetica-Bold').text('SITUAÇÃO: ', leftMargin, y, { continued: true });
  doc.font('Helvetica').text(order.reported_defect || '', { width: pageWidth - 60 });
  y += 12;

  if (order.diagnosis) {
    doc.font('Helvetica-Bold').text('DIAGNÓSTICO: ', leftMargin, y, { continued: true });
    doc.font('Helvetica').text(order.diagnosis, { width: pageWidth - 80 });
    y += 12;
  }

  // Aviso legal
  y += 2;
  doc.fontSize(6).font('Helvetica-Oblique').fillColor('#666');
  doc.text(footerText, leftMargin, y, { width: pageWidth, align: 'center' });
  doc.fillColor('#000');
  y += 12;

  // Linha antes tabela
  doc.moveTo(leftMargin, y).lineTo(doc.page.width - 30, y).lineWidth(0.5).stroke('#333');
  y += 4;

  // Tabela de itens
  const colQtd = leftMargin;
  const colDesc = leftMargin + 60;
  const colValor = doc.page.width - 100;
  const tableRight = doc.page.width - 30;
  const rowHeight = 14;

  // Header
  doc.rect(colQtd, y, tableRight - colQtd, 14).fill('#f1f5f9').stroke('#ccc');
  doc.fillColor('#333').fontSize(7).font('Helvetica-Bold');
  doc.text('QTD', colQtd + 5, y + 3);
  doc.text('PARECER TÉCNICO', colDesc + 5, y + 3);
  doc.text('VALOR', colValor + 5, y + 3);
  doc.fillColor('#000');
  y += 14;

  doc.font('Helvetica').fontSize(8);
  const maxItems = Math.max(items.length, 3);
  for (let i = 0; i < maxItems; i++) {
    doc.rect(colQtd, y, tableRight - colQtd, rowHeight).stroke('#ddd');
    if (items[i]) {
      doc.text(String(items[i].quantity), colQtd + 5, y + 3, { width: 50 });
      doc.text(items[i].description, colDesc + 5, y + 3, { width: 280 });
      doc.text(`R$ ${Number(items[i].unit_price).toFixed(2)}`, colValor + 5, y + 3);
    }
    y += rowHeight;
  }

  // Total
  y += 3;
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text(`VALOR TOTAL:  R$ ${totalValue.toFixed(2)}`, colValor - 80, y);
  y += 14;

  // Pagamento, garantia, técnico
  doc.fontSize(7).font('Helvetica');
  doc.text(`Pagamento: ${order.payment_method || 'A combinar'}  |  Garantia: ${order.warranty_days || 90} dias  |  Técnico: ${order.technician_name || ''}`, leftMargin, y);
  y += 12;

  // Assinaturas
  y += 8;
  doc.moveTo(leftMargin, y).lineTo(220, y).lineWidth(0.5).stroke('#333');
  doc.moveTo(300, y).lineTo(doc.page.width - 30, y).stroke('#333');
  y += 4;
  doc.fontSize(6);
  doc.text('Assinatura do Cliente', leftMargin, y, { width: 190, align: 'center' });
  doc.text('Assinatura do Técnico', 300, y, { width: 240, align: 'center' });
}

// Helpers
function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatDocument(doc) {
  if (!doc) return '';
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length === 14) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  return doc;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  
  // Se já for objeto Date
  if (dateStr instanceof Date) {
    return dateStr.toLocaleDateString('pt-BR');
  }
  
  // Se for string ISO (2024-07-27T00:00:00.000Z) ou data simples (2024-07-27)
  const str = String(dateStr);
  
  // Tentar extrair apenas a parte da data (YYYY-MM-DD)
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  
  // Fallback: tentar criar Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('pt-BR');
  }
  
  return '';
}

function buildAddress(company) {
  const parts = [];
  if (company.address_street) {
    let addr = company.address_street;
    if (company.address_number) addr += `, ${company.address_number}`;
    parts.push(addr);
  }
  if (company.address_neighborhood) parts.push(company.address_neighborhood);
  if (company.address_city) {
    let city = company.address_city;
    if (company.address_state) city += ` - ${company.address_state}`;
    parts.push(city);
  }
  return parts.join(' - ');
}

/**
 * Renderiza PDF consolidado (resumo) do lote
 * Uma única página com tabela de todos equipamentos e valor total somado
 */
function renderLoteResumo(res, orders, company, loteNumero) {
  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  
  const fileName = `Lote-${String(loteNumero).padStart(4, '0')}-Resumo.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
  doc.pipe(res);

  const leftMargin = 30;
  const pageWidth = doc.page.width - 60;
  let y = 30;

  // Logo da empresa (se existir)
  const hasLogo = company && company.logo_url && company.logo_url.startsWith('data:image');
  let textStartX = leftMargin;
  
  if (hasLogo) {
    try {
      doc.image(company.logo_url, leftMargin, y, { 
        width: 80,
        height: 50,
        fit: [80, 50],
        align: 'center',
        valign: 'center'
      });
      textStartX = leftMargin + 90;
    } catch (e) {
      console.error('Erro ao carregar logo:', e.message);
    }
  }

  // Cabeçalho empresa
  if (hasLogo) {
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(company.name || 'OS Laboris', textStartX, y + 5, { width: pageWidth - 100 });
    
    doc.fontSize(8).font('Helvetica');
    const phones = [company.phone, company.phone2].filter(Boolean).map(formatPhone).join(' | ');
    if (phones) {
      doc.text(phones, textStartX, y + 20, { width: pageWidth - 100 });
    }
    const address = buildAddress(company);
    if (address) {
      doc.text(address, textStartX, y + 30, { width: pageWidth - 100 });
    }
    y += 55;
  } else {
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(company && company.name ? company.name : 'OS Laboris', leftMargin, y, { width: pageWidth, align: 'center' });
    y += 16;

    doc.fontSize(8).font('Helvetica');
    if (company) {
      const phones = [company.phone, company.phone2].filter(Boolean).map(formatPhone).join(' | ');
      if (phones) {
        doc.text(phones, leftMargin, y, { width: pageWidth, align: 'center' });
        y += 10;
      }
      const address = buildAddress(company);
      if (address) {
        doc.text(address, leftMargin, y, { width: pageWidth, align: 'center' });
        y += 10;
      }
    }
  }

  // Linha separadora
  y += 5;
  doc.moveTo(leftMargin, y).lineTo(doc.page.width - 30, y).lineWidth(0.5).stroke('#333');
  y += 15;

  // Título do documento
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e40af');
  doc.text(`RESUMO DO LOTE #${String(loteNumero).padStart(4, '0')}`, leftMargin, y, { width: pageWidth, align: 'center' });
  doc.fillColor('#000');
  y += 25;

  // Dados do cliente (pegar do primeiro)
  const firstOrder = orders[0];
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('CLIENTE: ', leftMargin, y, { continued: true });
  doc.font('Helvetica').text(firstOrder.client_name || '');
  y += 14;

  doc.font('Helvetica-Bold').text('DOCUMENTO: ', leftMargin, y, { continued: true });
  doc.font('Helvetica').text(formatDocument(firstOrder.client_document || ''));
  doc.font('Helvetica-Bold').text('  TELEFONE: ', { continued: true });
  doc.font('Helvetica').text(formatPhone(firstOrder.client_phone || ''));
  y += 14;

  doc.font('Helvetica-Bold').text('DATA: ', leftMargin, y, { continued: true });
  doc.font('Helvetica').text(formatDate(firstOrder.entry_date || new Date()));
  doc.font('Helvetica-Bold').text('  ITENS DO LOTE: ', { continued: true });
  doc.font('Helvetica').text(String(orders.length));
  y += 20;

  // Linha antes da tabela
  doc.moveTo(leftMargin, y).lineTo(doc.page.width - 30, y).lineWidth(0.5).stroke('#333');
  y += 5;

  // Tabela de equipamentos
  const colOS = leftMargin;
  const colEquip = leftMargin + 55;
  const colDiag = leftMargin + 200;
  const colValor = doc.page.width - 80;
  const tableRight = doc.page.width - 30;
  const rowHeight = 22;

  // Header da tabela
  doc.rect(colOS, y, tableRight - colOS, 18).fill('#1e40af').stroke('#1e40af');
  doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
  doc.text('OS', colOS + 5, y + 5);
  doc.text('EQUIPAMENTO', colEquip + 5, y + 5);
  doc.text('DIAGNÓSTICO', colDiag + 5, y + 5);
  doc.text('VALOR', colValor + 5, y + 5);
  doc.fillColor('#000');
  y += 18;

  // Linhas da tabela
  let grandTotal = 0;
  doc.font('Helvetica').fontSize(7);
  
  orders.forEach((order, index) => {
    const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.rect(colOS, y, tableRight - colOS, rowHeight).fill(bgColor).stroke('#ddd');
    
    const osNumber = order.lote_sufixo 
      ? `${String(order.order_number).padStart(4, '0')}-${order.lote_sufixo}`
      : String(order.order_number).padStart(4, '0');
    
    const items = order.items || [];
    const orderTotal = items.reduce((sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.unit_price), 0);
    grandTotal += orderTotal;

    const equip = `${order.equipment_type} ${order.equipment_brand} ${order.equipment_model}`.substring(0, 35);
    const diag = (order.diagnosis || order.reported_defect || '—').substring(0, 40);

    doc.fillColor('#000');
    doc.text(osNumber, colOS + 5, y + 6, { width: 45 });
    doc.text(equip, colEquip + 5, y + 6, { width: 140 });
    doc.text(diag, colDiag + 5, y + 6, { width: 150 });
    doc.font('Helvetica-Bold').text(`R$ ${orderTotal.toFixed(2)}`, colValor + 5, y + 6);
    doc.font('Helvetica');
    
    y += rowHeight;
  });

  // Linha de total
  y += 5;
  doc.moveTo(leftMargin, y).lineTo(doc.page.width - 30, y).lineWidth(1).stroke('#1e40af');
  y += 10;

  // Total geral
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af');
  doc.text('VALOR TOTAL:', colDiag, y);
  doc.fontSize(14);
  doc.text(`R$ ${grandTotal.toFixed(2)}`, colValor - 20, y);
  doc.fillColor('#000');
  y += 30;

  // Detalhamento por equipamento (itens)
  if (orders.some(o => o.items && o.items.length > 0)) {
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('DETALHAMENTO POR EQUIPAMENTO:', leftMargin, y);
    y += 15;

    doc.fontSize(7).font('Helvetica');
    orders.forEach((order) => {
      const osNumber = order.lote_sufixo 
        ? `${String(order.order_number).padStart(4, '0')}-${order.lote_sufixo}`
        : String(order.order_number).padStart(4, '0');
      
      const items = order.items || [];
      if (items.length === 0) return;

      doc.font('Helvetica-Bold').fontSize(8);
      doc.text(`OS #${osNumber} - ${order.equipment_brand} ${order.equipment_model}:`, leftMargin, y);
      y += 10;

      doc.font('Helvetica').fontSize(7);
      items.forEach((item) => {
        const subtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
        doc.text(`  • ${item.quantity}x ${item.description} - R$ ${subtotal.toFixed(2)}`, leftMargin + 10, y);
        y += 9;
      });
      y += 5;
    });
  }

  // Aviso legal
  y += 10;
  const footerText = company && company.footer_text
    ? company.footer_text
    : 'Mediante a realização ou não do serviço, a máquina deverá ser retirada no prazo de 180 dias conforme a PL 2545/22. Contados a partir da autorização ou não do serviço.';
  
  doc.fontSize(6).font('Helvetica-Oblique').fillColor('#666');
  doc.text(footerText, leftMargin, y, { width: pageWidth, align: 'center' });
  doc.fillColor('#000');
  y += 20;

  // Assinaturas
  y += 15;
  doc.moveTo(leftMargin, y).lineTo(220, y).lineWidth(0.5).stroke('#333');
  doc.moveTo(300, y).lineTo(doc.page.width - 30, y).stroke('#333');
  y += 5;
  doc.fontSize(7).font('Helvetica');
  doc.text('Assinatura do Cliente', leftMargin, y, { width: 190, align: 'center' });
  doc.text('Assinatura do Responsável', 300, y, { width: 240, align: 'center' });

  doc.end();
}

module.exports = router;

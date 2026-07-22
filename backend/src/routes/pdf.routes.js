const { Router } = require('express');
const PDFDocument = require('pdfkit');
const serviceOrdersRepository = require('../repositories/serviceOrders.repository');
const companySettingsRepository = require('../repositories/companySettings.repository');

const router = Router();

router.get('/service-orders/:id/pdf', async (req, res, next) => {
  try {
    const order = await serviceOrdersRepository.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: { message: 'OS não encontrada' } });
    }

    const company = await companySettingsRepository.get();
    const doc = new PDFDocument({ size: 'A4', margin: 25 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=OS-${String(order.order_number).padStart(4, '0')}.pdf`);
    doc.pipe(res);

    const osNumber = String(order.order_number).padStart(4, '0');
    const entryDate = order.entry_date ? formatDate(order.entry_date) : '___/___/______';
    const items = order.items || [];
    const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const footerText = company && company.footer_text
      ? company.footer_text
      : 'Mediante a realização ou não do serviço, a máquina deverá ser retirada no prazo de 180 dias conforme a PL 2545/22. Contados a partir da autorização ou não do serviço.';

    // Renderiza a OS duas vezes (metade superior e metade inferior)
    renderOS(doc, order, company, osNumber, entryDate, items, totalValue, footerText, 25);

    // Linha tracejada de corte no meio
    const halfPage = doc.page.height / 2;
    doc.save();
    doc.moveTo(25, halfPage).lineTo(doc.page.width - 25, halfPage).dash(5, { space: 3 }).stroke('#999');
    doc.undash();
    doc.restore();

    // Segunda via (metade inferior)
    renderOS(doc, order, company, osNumber, entryDate, items, totalValue, footerText, halfPage + 15);

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

  // Cabeçalho empresa
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
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
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

module.exports = router;

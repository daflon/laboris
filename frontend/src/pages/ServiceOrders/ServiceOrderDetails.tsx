import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiEdit2, FiArrowLeft, FiMessageCircle, FiPrinter, FiCopy, FiPlus, FiLayers, FiPaperclip } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { serviceOrdersService, ServiceOrder, STATUSES, formatOrderNumber } from '../../services/serviceOrders.service';
import PageHeader from '../../components/PageHeader';
import { formatDocument, formatPhone } from '../../utils/masks';

function getStatusLabel(status: string) {
  return STATUSES.find((s) => s.value === status)?.label || status;
}

function getStatusColor(status: string) {
  return STATUSES.find((s) => s.value === status)?.color || '#6b7280';
}

export default function ServiceOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = () => {
    serviceOrdersService.getById(id!)
      .then((response) => setOrder(response.data))
      .catch(() => toast.error('Erro ao carregar OS'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrder(); }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await serviceOrdersService.updateStatus(id!, newStatus);
      toast.success('Status atualizado');
      loadOrder();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) return <p className="loading-text">Carregando...</p>;
  if (!order) return <p className="empty-text">OS não encontrada.</p>;

  const totalValue = (order.items || []).reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleWhatsApp = () => {
    if (!order.client_phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    const phone = order.client_phone.replace(/\D/g, '');
    const phoneFormatted = phone.startsWith('55') ? phone : `55${phone}`;
    const statusLabel = getStatusLabel(order.status);
    const osNumber = formatOrderNumber(order);

    let message = `Olá, *${order.client_name}*! 👋\n\n`;
    message += `Segue informação sobre sua OS:\n\n`;
    message += `📋 *OS #${osNumber}*\n`;
    message += `🔧 Equipamento: ${order.equipment_type} ${order.equipment_brand} ${order.equipment_model}\n`;
    message += `📌 Status: *${statusLabel}*\n`;

    if (order.reported_defect) {
      message += `\n❌ *Defeito Relatado:*\n${order.reported_defect}\n`;
    }
    if (order.diagnosis) {
      message += `\n✅ *Diagnóstico:*\n${order.diagnosis}\n`;
    }

    // Lista detalhada de itens com valores individuais
    if (order.items && order.items.length > 0) {
      message += `\n📝 *Orçamento Detalhado:*\n`;
      order.items.forEach((item) => {
        const subtotal = item.quantity * item.unit_price;
        if (item.quantity > 1) {
          message += `• ${item.quantity}x ${item.description} - R$ ${Number(item.unit_price).toFixed(2)} (cada) = *R$ ${subtotal.toFixed(2)}*\n`;
        } else {
          message += `• ${item.description} - *R$ ${subtotal.toFixed(2)}*\n`;
        }
      });
      message += `\n💰 *VALOR TOTAL: R$ ${totalValue.toFixed(2)}*\n`;
    }

    if (order.payment_method) {
      message += `\n💳 Pagamento: ${order.payment_method}`;
    }
    if (order.warranty_days) {
      message += `\n🛡️ Garantia: ${order.warranty_days} dias`;
    }

    message += `\n\n_Mediante a realização ou não do serviço, a máquina deverá ser retirada no prazo de 180 dias (PL 2545/22)._`;

    const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Enviar PDF pelo WhatsApp (Web Share API)
  const handleSharePDF = async () => {
    if (!order.client_phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }

    const pdfUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port === '5173' ? ':3000' : ''}/api/v1/pdf/service-orders/${id}/pdf`;

    try {
      toast.loading('Gerando PDF...', { id: 'pdf-share' });

      const response = await fetch(pdfUrl, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      const blob = await response.blob();
      const osNumber = formatOrderNumber(order);
      const fileName = `OS-${osNumber}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      toast.dismiss('pdf-share');

      // Verificar se Web Share API com arquivos é suportada
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `OS #${osNumber}`,
            text: `Ordem de Serviço #${osNumber} - ${order.client_name}`,
            files: [file],
          });
          toast.success('PDF compartilhado!');
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            // Usuário cancelou, não mostrar erro
            return;
          }
        }
      }

      // Fallback: Abrir WhatsApp com mensagem + baixar PDF separado
      const phone = order.client_phone.replace(/\D/g, '');
      const phoneFormatted = phone.startsWith('55') ? phone : `55${phone}`;
      
      // Baixar o PDF
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(blobUrl);

      // Abrir WhatsApp com mensagem simples
      const message = `Olá, *${order.client_name}*! 👋\n\nSegue em anexo o PDF da OS #${osNumber}.\n\n_Qualquer dúvida estou à disposição._`;
      const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
      
      toast.success('PDF baixado! Anexe manualmente no WhatsApp.');
      setTimeout(() => window.open(url, '_blank'), 500);
      
    } catch {
      toast.dismiss('pdf-share');
      toast.error('Erro ao gerar PDF');
    }
  };

  const handlePrint = async () => {
    const pdfUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port === '5173' ? ':3000' : ''}/api/v1/pdf/service-orders/${id}/pdf`;

    try {
      // Buscar PDF com token de autenticação
      const response = await fetch(pdfUrl, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      const blob = await response.blob();
      const osNumber = formatOrderNumber(order!);
      const file = new File([blob], `OS-${osNumber}.pdf`, { type: 'application/pdf' });

      // Tentar compartilhar via Web Share API (mobile)
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        try {
          await navigator.share({
            title: `OS #${osNumber}`,
            text: `Ordem de Serviço #${osNumber} - ${order!.client_name}`,
            files: [file],
          });
          return;
        } catch {
          // Fallback: abrir blob
        }
      }

      // Desktop ou fallback: abrir blob em nova aba
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await serviceOrdersService.duplicate(id!);
      const newId = response.data.id;
      toast.success(`OS duplicada! Nova OS #${formatOrderNumber(response.data)}`);
      navigate(`/os/${newId}`);
    } catch {
      toast.error('Erro ao duplicar OS');
    }
  };

  const handleAddToLote = () => {
    // Navegar para tela de adicionar ao lote
    navigate(`/os/${id}/adicionar-lote`);
  };

  const osDisplayNumber = formatOrderNumber(order);

  return (
    <div>
      <PageHeader title={`OS #${osDisplayNumber}`}>
        <button className="btn btn-secondary" onClick={() => navigate('/os')}>
          <FiArrowLeft /> Voltar
        </button>
        <button className="btn btn-secondary" onClick={handleDuplicate}>
          <FiCopy /> Duplicar
        </button>
        <button className="btn btn-secondary" onClick={handleAddToLote} style={{ background: '#dbeafe', color: '#1e40af' }}>
          <FiPlus /> Adicionar ao Lote
        </button>
        <button className="btn btn-success" onClick={handleWhatsApp} style={{ background: '#25d366', color: 'white' }}>
          <FiMessageCircle /> WhatsApp
        </button>
        <button className="btn btn-success" onClick={handleSharePDF} style={{ background: '#128c7e', color: 'white' }}>
          <FiPaperclip /> Enviar PDF
        </button>
        <button className="btn btn-secondary" onClick={handlePrint}>
          <FiPrinter /> PDF
        </button>
        <Link to={`/os/${id}/editar`} className="btn btn-primary">
          <FiEdit2 /> Editar
        </Link>
      </PageHeader>

      <div className="detail-card">
        {/* Lote Info Banner */}
        {order.lote_numero && (
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            background: '#dbeafe', 
            borderRadius: '8px',
            border: '1px solid #93c5fd'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <FiLayers style={{ color: '#1e40af' }} />
              <strong style={{ color: '#1e40af' }}>Lote #{String(order.lote_numero).padStart(4, '0')}</strong>
              <span style={{ fontSize: '0.85rem', color: '#3b82f6' }}>
                ({(order.lote_items?.length || 0) + 1} equipamentos)
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {/* Item atual */}
              <span style={{
                padding: '0.3rem 0.6rem',
                background: '#1e40af',
                color: 'white',
                borderRadius: '6px',
                fontSize: '0.8rem'
              }}>
                {order.lote_sufixo}: {order.equipment_brand} {order.equipment_model}
              </span>
              {/* Outros itens do lote */}
              {order.lote_items?.map((item) => (
                <Link
                  key={item.id}
                  to={`/os/${item.id}`}
                  style={{
                    padding: '0.3rem 0.6rem',
                    background: 'white',
                    color: '#1e40af',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                    border: '1px solid #93c5fd'
                  }}
                >
                  {item.lote_sufixo}: {item.equipment_brand} {item.equipment_model}
                  <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem', opacity: 0.7 }}>
                    ({getStatusLabel(item.status)})
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="form-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500 }}>Status:</span>
            {STATUSES.map((s) => (
              <button
                key={s.value}
                className="btn"
                style={{
                  background: order.status === s.value ? s.color : '#e2e8f0',
                  color: order.status === s.value ? 'white' : '#475569',
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.7rem',
                }}
                onClick={() => handleStatusChange(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dados principais */}
        <div className="detail-section">
          <h3>Dados da OS</h3>
          <div className="detail-grid">
            <div>
              <strong>Nº:</strong> #{osDisplayNumber}
              {order.lote_numero && (
                <span style={{ 
                  marginLeft: '0.4rem', 
                  fontSize: '0.7rem', 
                  background: '#dbeafe', 
                  color: '#1e40af',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px'
                }}>
                  LOTE
                </span>
              )}
            </div>
            <div><strong>Data Entrada:</strong> {order.entry_date ? new Date(order.entry_date).toLocaleDateString('pt-BR') : '—'}</div>
            <div><strong>Data Conclusão:</strong> {order.completion_date ? new Date(order.completion_date).toLocaleDateString('pt-BR') : '—'}</div>
          </div>
        </div>

        {/* Cliente */}
        <div className="detail-section">
          <h3>Cliente</h3>
          <div className="detail-grid">
            <div><strong>Nome:</strong> {order.client_name}</div>
            <div><strong>Documento:</strong> {formatDocument(order.client_document || '')}</div>
            <div><strong>Telefone:</strong> {formatPhone(order.client_phone || '')}</div>
          </div>
        </div>

        {/* Equipamento */}
        <div className="detail-section">
          <h3>Equipamento (Máquina)</h3>
          <div className="detail-grid">
            <div><strong>Tipo:</strong> {order.equipment_type}</div>
            <div><strong>Marca/Modelo:</strong> {order.equipment_brand} {order.equipment_model}</div>
            <div><strong>Nº Série:</strong> {order.equipment_serial_number || '—'}</div>
          </div>
        </div>

        {/* Técnico */}
        <div className="detail-section">
          <h3>Técnico Responsável</h3>
          <div className="detail-grid">
            <div><strong>Nome:</strong> {order.technician_name}</div>
          </div>
        </div>

        {/* Situação / Parecer */}
        <div className="detail-section">
          <h3>Situação / Parecer Técnico</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><strong>Defeito Relatado:</strong><br />{order.reported_defect || '—'}</div>
            <div><strong>Diagnóstico:</strong><br />{order.diagnosis || '—'}</div>
            <div><strong>Observações:</strong><br />{order.notes || '—'}</div>
          </div>
        </div>

        {/* Itens */}
        <div className="detail-section">
          <h3>Itens (Serviços e Peças)</h3>
          {order.items && order.items.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Qtd</th>
                  <th>Descrição</th>
                  <th>Valor Unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.quantity}</td>
                    <td>{item.description}</td>
                    <td>R$ {Number(item.unit_price).toFixed(2)}</td>
                    <td><strong>R$ {(item.quantity * item.unit_price).toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>VALOR TOTAL:</td>
                  <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>R$ {totalValue.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="empty-text">Nenhum item registrado.</p>
          )}
        </div>

        {/* Pagamento e Garantia */}
        <div className="detail-section">
          <h3>Pagamento e Garantia</h3>
          <div className="detail-grid">
            <div><strong>Forma de Pagamento:</strong> {order.payment_method || 'A combinar'}</div>
            <div><strong>Garantia:</strong> {order.warranty_days} dias</div>
          </div>
        </div>

        {/* Aviso legal */}
        <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', fontSize: '0.8rem', color: '#92400e' }}>
          <strong>Aviso:</strong> Mediante a realização ou não do serviço, a máquina deverá ser retirada no prazo de 180 dias conforme a PL 2545/22. Contados a partir da autorização ou não do serviço.
        </div>
      </div>
    </div>
  );
}

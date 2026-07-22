import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiEdit2, FiArrowLeft, FiMessageCircle, FiPrinter, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { serviceOrdersService, ServiceOrder, STATUSES } from '../../services/serviceOrders.service';
import PageHeader from '../../components/PageHeader';
import { formatDocument, formatPhone, formatCurrency, formatDate } from '../../utils/masks';

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
    const osNumber = String(order.order_number).padStart(4, '0');

    let message = `Olá, *${order.client_name}*! 👋\n\n`;
    message += `Segue informação sobre sua OS:\n\n`;
    message += `📋 *OS #${osNumber}*\n`;
    message += `🔧 Equipamento: ${order.equipment_type} ${order.equipment_brand} ${order.equipment_model}\n`;
    message += `📌 Status: *${statusLabel}*\n`;

    if (order.reported_defect) {
      message += `\n❌ Defeito: ${order.reported_defect}\n`;
    }
    if (order.diagnosis) {
      message += `✅ Diagnóstico: ${order.diagnosis}\n`;
    }
    if (totalValue > 0) {
      message += `\n💰 Valor Total: *R$ ${totalValue.toFixed(2)}*\n`;
    }
    if (order.payment_method) {
      message += `💳 Pagamento: ${order.payment_method}\n`;
    }
    if (order.warranty_days) {
      message += `🛡️ Garantia: ${order.warranty_days} dias\n`;
    }

    message += `\n_Mediante a realização ou não do serviço, a máquina deverá ser retirada no prazo de 180 dias (PL 2545/22)._`;

    const url = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.open(`http://localhost:3000/api/v1/pdf/service-orders/${id}/pdf`, '_blank');
  };

  const handleDuplicate = async () => {
    try {
      const response = await serviceOrdersService.duplicate(id!);
      const newId = response.data.id;
      toast.success(`OS duplicada! Nova OS #${String(response.data.order_number).padStart(4, '0')}`);
      navigate(`/os/${newId}`);
    } catch {
      toast.error('Erro ao duplicar OS');
    }
  };

  return (
    <div>
      <PageHeader title={`OS #${String(order.order_number).padStart(4, '0')}`}>
        <button className="btn btn-secondary" onClick={() => navigate('/os')}>
          <FiArrowLeft /> Voltar
        </button>
        <button className="btn btn-secondary" onClick={handleDuplicate}>
          <FiCopy /> Duplicar
        </button>
        <button className="btn btn-success" onClick={handleWhatsApp} style={{ background: '#25d366', color: 'white' }}>
          <FiMessageCircle /> WhatsApp
        </button>
        <button className="btn btn-secondary" onClick={handlePrint}>
          <FiPrinter /> Gerar PDF
        </button>
        <Link to={`/os/${id}/editar`} className="btn btn-primary">
          <FiEdit2 /> Editar
        </Link>
      </PageHeader>

      <div className="detail-card">
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
            <div><strong>Nº:</strong> <span className="os-number">#{String(order.order_number).padStart(4, '0')}</span></div>
            <div><strong>Data Entrada:</strong> {formatDate(order.entry_date)}</div>
            <div><strong>Data Conclusão:</strong> {formatDate(order.completion_date || '')}</div>
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
                    <td>{formatCurrency(Number(item.unit_price))}</td>
                    <td><strong>{formatCurrency(item.quantity * item.unit_price)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>VALOR TOTAL:</td>
                  <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatCurrency(totalValue)}</td>
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

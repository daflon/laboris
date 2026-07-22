import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { equipmentService, Equipment } from '../../services/equipment.service';
import { serviceOrdersService, ServiceOrder, STATUSES } from '../../services/serviceOrders.service';
import PageHeader from '../../components/PageHeader';

function getStatusLabel(status: string) {
  return STATUSES.find((s) => s.value === status)?.label || status;
}

function getStatusColor(status: string) {
  return STATUSES.find((s) => s.value === status)?.color || '#6b7280';
}

export default function EquipmentHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      equipmentService.getById(id!),
      serviceOrdersService.getEquipmentHistory(id!),
    ])
      .then(([eqRes, histRes]) => {
        setEquipment(eqRes.data);
        setOrders(histRes.data);
      })
      .catch(() => toast.error('Erro ao carregar histórico'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="loading-text">Carregando...</p>;
  if (!equipment) return <p className="empty-text">Equipamento não encontrado.</p>;

  const totalGasto = orders.reduce((sum, order) => {
    const orderItems = (order as any).items || [];
    // Se não tem items no join, calcula do que tiver
    return sum;
  }, 0);

  return (
    <div>
      <PageHeader title="Histórico de Reparos">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Voltar
        </button>
      </PageHeader>

      {/* Info do equipamento */}
      <div className="detail-card" style={{ marginBottom: '1.5rem' }}>
        <div className="detail-grid">
          <div><strong>Tipo:</strong> {equipment.type}</div>
          <div><strong>Marca/Modelo:</strong> {equipment.brand} {equipment.model}</div>
          <div><strong>Nº Série:</strong> {equipment.serial_number || '—'}</div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
          Total de atendimentos: <strong>{orders.length}</strong>
        </div>
      </div>

      {/* Timeline de OS */}
      {orders.length === 0 ? (
        <p className="empty-text">Nenhum reparo registrado para este equipamento.</p>
      ) : (
        <div className="history-timeline">
          {orders.map((order) => (
            <div key={order.id} className="history-item">
              <div className="history-item-header">
                <div>
                  <strong>OS #{String(order.order_number).padStart(4, '0')}</strong>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                    {order.entry_date ? new Date(order.entry_date).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    className="badge"
                    style={{ background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status) }}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                  <button className="btn-icon" title="Ver OS completa" onClick={() => navigate(`/os/${order.id}`)}>
                    <FiEye />
                  </button>
                </div>
              </div>
              <div className="history-item-body">
                <div><strong>Defeito:</strong> {order.reported_defect || '—'}</div>
                <div><strong>Diagnóstico:</strong> {order.diagnosis || '—'}</div>
                <div><strong>Técnico:</strong> {(order as any).technician_name || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

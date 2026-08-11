import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiPlus, FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { serviceOrdersService, ServiceOrder, STATUSES, getStatusEmoji } from '../../services/serviceOrders.service';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import PinModal from '../../components/PinModal';
import api from '../../services/api';

function getStatusLabel(status: string) {
  const s = STATUSES.find((s) => s.value === status);
  return s?.label || status;
}

function getStatusStyle(status: string) {
  const statusConfig = STATUSES.find((s) => s.value === status);
  const color = statusConfig?.color || '#6b7280';
  return {
    background: `${color}15`,
    color: color,
    border: 'none',
    borderRadius: '9999px',
    padding: '0.3rem 0.65rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'box-shadow 0.15s ease',
  };
}

function formatOrderNumber(order: ServiceOrder): string {
  const num = String(order.order_number).padStart(4, '0');
  if (order.lote_sufixo) {
    return `${num}-${order.lote_sufixo}`;
  }
  return num;
}

// Verifica se OS está parada há mais de 30 dias (status não é entregue/cancelada)
function isOldOrder(order: ServiceOrder): boolean {
  if (['entregue', 'cancelada'].includes(order.status)) return false;
  if (!order.entry_date) return false;
  const entryDate = new Date(order.entry_date);
  const daysSince = Math.floor((Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysSince > 30;
}

function getDaysOld(order: ServiceOrder): number {
  if (!order.entry_date) return 0;
  const entryDate = new Date(order.entry_date);
  return Math.floor((Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ServiceOrdersList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [specialFilter, setSpecialFilter] = useState(searchParams.get('filter') || '');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const loadOrders = async (page = 1) => {
    try {
      setLoading(true);
      const response = await serviceOrdersService.list({
        search,
        status: statusFilter,
        filter: specialFilter || undefined,
        page,
        limit: 20,
      });
      setOrders(response.data);
      setMeta(response.meta);
    } catch {
      toast.error('Erro ao carregar ordens de serviço');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => loadOrders(), 300);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, specialFilter]);

  const handleDeleteWithPin = async () => {
    if (!deleteId) return;
    try {
      // Registrar log de auditoria
      const order = orders.find((o) => o.id === deleteId);
      await api.post('/admin/audit-log', {
        action: 'delete_os',
        entity_type: 'service_order',
        entity_id: deleteId,
        description: `OS #${String(order?.order_number || '').padStart(4, '0')} - Cliente: ${order?.client_name || 'N/A'}`,
        performed_by: 'admin',
      });

      await serviceOrdersService.remove(deleteId);
      toast.success('OS removida com sucesso');
      setDeleteId(null);
      loadOrders(meta.page);
    } catch {
      toast.error('Erro ao remover OS');
    }
  };

  return (
    <div>
      <PageHeader title="Ordens de Serviço">
        <Link to="/os/nova" className="btn btn-primary">
          <FiPlus /> Nova OS
        </Link>
      </PageHeader>

      {/* Banner de filtro especial ativo */}
      {specialFilter && (
        <div style={{
          padding: '0.6rem 1rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: specialFilter === 'abandoned' ? '#fee2e2' : '#fef3c7',
          border: `1px solid ${specialFilter === 'abandoned' ? '#fca5a5' : '#fcd34d'}`,
          color: specialFilter === 'abandoned' ? '#991b1b' : '#92400e'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {specialFilter === 'old' && '⏰ Mostrando OS paradas há mais de 30 dias'}
            {specialFilter === 'abandoned' && '⚠️ Mostrando equipamentos há mais de 180 dias (Lei PL 2545/22)'}
          </span>
          <button
            onClick={() => {
              setSpecialFilter('');
              navigate('/os');
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              textDecoration: 'underline',
              color: 'inherit'
            }}
          >
            Limpar filtro
          </button>
        </div>
      )}

      <div className="filters-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nº da OS ou nome do cliente..."
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="loading-text">Carregando...</p>
      ) : orders.length === 0 ? (
        <p className="empty-text">Nenhuma ordem de serviço encontrada.</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Equipamento</th>
                <th>Técnico</th>
                <th>Status</th>
                <th>Data Entrada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>#{formatOrderNumber(order)}</strong>
                    {order.lote_sufixo && (
                      <span style={{ 
                        marginLeft: '0.4rem', 
                        fontSize: '0.65rem', 
                        background: '#dbeafe', 
                        color: '#1e40af',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px'
                      }}>
                        LOTE
                      </span>
                    )}
                    {isOldOrder(order) && (
                      <span 
                        title={`OS parada há ${getDaysOld(order)} dias`}
                        style={{ 
                          marginLeft: '0.4rem', 
                          fontSize: '0.7rem',
                          cursor: 'help'
                        }}
                      >
                        ⏰
                      </span>
                    )}
                  </td>
                  <td>{order.client_name}</td>
                  <td>{order.equipment_brand} {order.equipment_model}</td>
                  <td>{order.technician_name}</td>
                  <td>
                    <select
                      value={order.status}
                      onChange={async (e) => {
                        try {
                          await serviceOrdersService.updateStatus(order.id, e.target.value);
                          toast.success('Status atualizado');
                          loadOrders(meta.page);
                        } catch { toast.error('Erro ao atualizar status'); }
                      }}
                      style={getStatusStyle(order.status)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>{order.entry_date ? new Date(order.entry_date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="actions-cell">
                    <button 
                      className="btn-icon" 
                      title={`Ver detalhes da OS #${formatOrderNumber(order)}`}
                      aria-label={`Ver detalhes da OS #${formatOrderNumber(order)} - ${order.client_name}`}
                      onClick={() => navigate(`/os/${order.id}`)}
                    >
                      <FiEye />
                    </button>
                    <button 
                      className="btn-icon" 
                      title={`Editar OS #${formatOrderNumber(order)}`}
                      aria-label={`Editar OS #${formatOrderNumber(order)}`}
                      onClick={() => navigate(`/os/${order.id}/editar`)}
                    >
                      <FiEdit2 />
                    </button>
                    <button 
                      className="btn-icon btn-icon-danger" 
                      title={`Excluir OS #${formatOrderNumber(order)}`}
                      aria-label={`Excluir OS #${formatOrderNumber(order)}`}
                      onClick={() => setDeleteId(order.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button disabled={meta.page <= 1} onClick={() => loadOrders(meta.page - 1)}>
                Anterior
              </button>
              <span>Página {meta.page} de {meta.totalPages}</span>
              <button disabled={meta.page >= meta.totalPages} onClick={() => loadOrders(meta.page + 1)}>
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      <PinModal
        isOpen={!!deleteId}
        title="Excluir OS"
        message="Digite o PIN do administrador para confirmar a exclusão."
        onSuccess={handleDeleteWithPin}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

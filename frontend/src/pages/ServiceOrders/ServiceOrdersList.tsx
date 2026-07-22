import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiPlus, FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { serviceOrdersService, ServiceOrder, STATUSES } from '../../services/serviceOrders.service';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import PinModal from '../../components/PinModal';
import api from '../../services/api';

function getStatusLabel(status: string) {
  return STATUSES.find((s) => s.value === status)?.label || status;
}

function getStatusColor(status: string) {
  return STATUSES.find((s) => s.value === status)?.color || '#6b7280';
}

export default function ServiceOrdersList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const loadOrders = async (page = 1) => {
    try {
      setLoading(true);
      const response = await serviceOrdersService.list({
        search,
        status: statusFilter,
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
  }, [search, statusFilter]);

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
            <option key={s.value} value={s.value}>{s.label}</option>
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
                  <td><span className="os-number">#{String(order.order_number).padStart(4, '0')}</span></td>
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
                      style={{
                        background: `${getStatusColor(order.status)}15`,
                        color: getStatusColor(order.status),
                        border: `1px solid ${getStatusColor(order.status)}40`,
                        borderRadius: '4px',
                        padding: '0.2rem 0.4rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>{order.entry_date ? new Date(order.entry_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="actions-cell">
                    <button className="btn-icon" title="Ver detalhes" onClick={() => navigate(`/os/${order.id}`)}>
                      <FiEye />
                    </button>
                    <button className="btn-icon" title="Editar" onClick={() => navigate(`/os/${order.id}/editar`)}>
                      <FiEdit2 />
                    </button>
                    <button className="btn-icon btn-icon-danger" title="Excluir" onClick={() => setDeleteId(order.id)}>
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

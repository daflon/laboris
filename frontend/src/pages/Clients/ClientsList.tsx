import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { clientsService, Client } from '../../services/clients.service';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import PinModal from '../../components/PinModal';
import api from '../../services/api';
import { formatDocument, formatPhone } from '../../utils/masks';

export default function ClientsList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const loadClients = async (page = 1) => {
    try {
      setLoading(true);
      const response = await clientsService.list({ search, page, limit: 20 });
      setClients(response.data);
      setMeta(response.meta);
    } catch {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => loadClients(), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const client = clients.find((c) => c.id === deleteId);
      await api.post('/admin/audit-log', {
        action: 'delete_client',
        entity_type: 'client',
        entity_id: deleteId,
        description: `Cliente: ${client?.name || 'N/A'}`,
        performed_by: 'admin',
      });
      await clientsService.remove(deleteId);
      toast.success('Cliente removido com sucesso');
      setDeleteId(null);
      loadClients(meta.page);
    } catch {
      toast.error('Erro ao remover cliente');
    }
  };

  return (
    <div>
      <PageHeader title="Clientes">
        <Link to="/clientes/novo" className="btn btn-primary">
          <FiPlus /> Novo Cliente
        </Link>
      </PageHeader>

      <div className="filters-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome ou documento..."
        />
      </div>

      {loading ? (
        <p className="loading-text">Carregando...</p>
      ) : clients.length === 0 ? (
        <p className="empty-text">Nenhum cliente encontrado.</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Telefone</th>
                <th>Cidade/UF</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{formatDocument(client.document)}</td>
                  <td>{formatPhone(client.phone)}</td>
                  <td>
                    {client.address_city}
                    {client.address_state ? `/${client.address_state}` : ''}
                  </td>
                  <td className="actions-cell">
                    <button className="btn-icon" title="Ver detalhes" onClick={() => navigate(`/clientes/${client.id}`)}>
                      <FiEye />
                    </button>
                    <button className="btn-icon" title="Editar" onClick={() => navigate(`/clientes/${client.id}/editar`)}>
                      <FiEdit2 />
                    </button>
                    <button className="btn-icon btn-icon-danger" title="Excluir" onClick={() => setDeleteId(client.id)}>
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button disabled={meta.page <= 1} onClick={() => loadClients(meta.page - 1)}>
                Anterior
              </button>
              <span>Página {meta.page} de {meta.totalPages}</span>
              <button disabled={meta.page >= meta.totalPages} onClick={() => loadClients(meta.page + 1)}>
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      <PinModal
        isOpen={!!deleteId}
        title="Excluir Cliente"
        message="Digite o PIN do administrador para confirmar a exclusão."
        onSuccess={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

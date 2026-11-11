import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiMessageCircle, FiPhone, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { clientsService, Client } from '../../services/clients.service';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import PinModal from '../../components/PinModal';
import ActionMenu from '../../components/ActionMenu';
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

  const handleWhatsApp = (client: Client) => {
    const phone = client.phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    window.open(`https://wa.me/55${phone}`, '_blank');
  };

  const handleCall = (client: Client) => {
    const phone = client.phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    window.open(`tel:+55${phone}`, '_self');
  };

  const handleEmail = (client: Client) => {
    if (!client.email) {
      toast.error('Cliente sem email cadastrado');
      return;
    }
    window.open(`mailto:${client.email}`, '_self');
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
                <th style={{ width: '120px' }}></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr 
                  key={client.id}
                  className="clickable-row"
                  onClick={() => navigate(`/clientes/${client.id}`)}
                >
                  <td>{client.name}</td>
                  <td>{formatDocument(client.document)}</td>
                  <td>{formatPhone(client.phone)}</td>
                  <td>
                    {client.address_city}
                    {client.address_state ? `/${client.address_state}` : ''}
                  </td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      quickActions={[
                        { icon: <FiEdit2 size={14} />, label: 'Editar', onClick: () => navigate(`/clientes/${client.id}/editar`) },
                        { icon: <FiMessageCircle size={14} />, label: 'WhatsApp', onClick: () => handleWhatsApp(client) },
                      ]}
                      items={[
                        { icon: <FiEye />, label: 'Ver detalhes', onClick: () => navigate(`/clientes/${client.id}`) },
                        { icon: <FiEdit2 />, label: 'Editar', onClick: () => navigate(`/clientes/${client.id}/editar`) },
                        { icon: <FiMessageCircle />, label: 'WhatsApp', onClick: () => handleWhatsApp(client) },
                        { icon: <FiPhone />, label: 'Ligar', onClick: () => handleCall(client) },
                        { icon: <FiMail />, label: 'Email', onClick: () => handleEmail(client) },
                        { icon: <FiTrash2 />, label: 'Excluir', onClick: () => setDeleteId(client.id), danger: true, dividerBefore: true },
                      ]}
                    />
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

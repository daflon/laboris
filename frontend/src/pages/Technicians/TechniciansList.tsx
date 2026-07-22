import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { techniciansService, Technician } from '../../services/technicians.service';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import PinModal from '../../components/PinModal';
import api from '../../services/api';
import { formatPhone } from '../../utils/masks';

export default function TechniciansList() {
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const loadTechnicians = async (page = 1) => {
    try {
      setLoading(true);
      const response = await techniciansService.list({
        search,
        status: statusFilter,
        page,
        limit: 20,
      });
      setTechnicians(response.data);
      setMeta(response.meta);
    } catch {
      toast.error('Erro ao carregar técnicos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => loadTechnicians(), 300);
    return () => clearTimeout(timeout);
  }, [search, statusFilter]);

  const handleToggleStatus = async (id: string) => {
    try {
      await techniciansService.toggleStatus(id);
      toast.success('Status atualizado');
      loadTechnicians(meta.page);
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const tech = technicians.find((t) => t.id === deleteId);
      await api.post('/admin/audit-log', {
        action: 'delete_technician',
        entity_type: 'technician',
        entity_id: deleteId,
        description: `Técnico: ${tech?.name || 'N/A'}`,
        performed_by: 'admin',
      });
      await techniciansService.remove(deleteId);
      toast.success('Técnico removido com sucesso');
      setDeleteId(null);
      loadTechnicians(meta.page);
    } catch {
      toast.error('Erro ao remover técnico');
    }
  };

  return (
    <div>
      <PageHeader title="Técnicos">
        <Link to="/tecnicos/novo" className="btn btn-primary">
          <FiPlus /> Novo Técnico
        </Link>
      </PageHeader>

      <div className="filters-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome ou especialidade..."
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {loading ? (
        <p className="loading-text">Carregando...</p>
      ) : technicians.length === 0 ? (
        <p className="empty-text">Nenhum técnico encontrado.</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Especialidade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((tech) => (
                <tr key={tech.id}>
                  <td>{tech.name}</td>
                  <td>{formatPhone(tech.phone)}</td>
                  <td>{tech.specialty || '—'}</td>
                  <td>
                    <span className={`badge ${tech.active ? 'badge-success' : 'badge-danger'}`}>
                      {tech.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-icon"
                      title={tech.active ? 'Inativar' : 'Ativar'}
                      onClick={() => handleToggleStatus(tech.id)}
                    >
                      {tech.active ? <FiToggleRight /> : <FiToggleLeft />}
                    </button>
                    <button className="btn-icon" title="Editar" onClick={() => navigate(`/tecnicos/${tech.id}/editar`)}>
                      <FiEdit2 />
                    </button>
                    <button className="btn-icon btn-icon-danger" title="Excluir" onClick={() => setDeleteId(tech.id)}>
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button disabled={meta.page <= 1} onClick={() => loadTechnicians(meta.page - 1)}>
                Anterior
              </button>
              <span>Página {meta.page} de {meta.totalPages}</span>
              <button disabled={meta.page >= meta.totalPages} onClick={() => loadTechnicians(meta.page + 1)}>
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      <PinModal
        isOpen={!!deleteId}
        title="Excluir Técnico"
        message="Digite o PIN do administrador para confirmar a exclusão."
        onSuccess={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

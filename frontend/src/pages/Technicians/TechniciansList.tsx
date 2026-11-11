import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiPhone, FiMessageCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { techniciansService, Technician } from '../../services/technicians.service';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import PinModal from '../../components/PinModal';
import ActionMenu from '../../components/ActionMenu';
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

  const handleToggleStatus = async (tech: Technician) => {
    try {
      await techniciansService.toggleStatus(tech.id);
      toast.success(tech.active ? 'Técnico inativado' : 'Técnico ativado');
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

  const handleWhatsApp = (tech: Technician) => {
    const phone = tech.phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Técnico sem telefone cadastrado');
      return;
    }
    window.open(`https://wa.me/55${phone}`, '_blank');
  };

  const handleCall = (tech: Technician) => {
    const phone = tech.phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Técnico sem telefone cadastrado');
      return;
    }
    window.open(`tel:+55${phone}`, '_self');
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
                <th style={{ width: '120px' }}></th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((tech) => (
                <tr 
                  key={tech.id}
                  className="clickable-row"
                  onClick={() => navigate(`/tecnicos/${tech.id}/editar`)}
                >
                  <td>{tech.name}</td>
                  <td>{formatPhone(tech.phone)}</td>
                  <td>{tech.specialty || '—'}</td>
                  <td>
                    <span className={`badge ${tech.active ? 'badge-success' : 'badge-danger'}`}>
                      {tech.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      quickActions={[
                        { icon: <FiEdit2 size={14} />, label: 'Editar', onClick: () => navigate(`/tecnicos/${tech.id}/editar`) },
                        { 
                          icon: tech.active ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />, 
                          label: tech.active ? 'Inativar' : 'Ativar', 
                          onClick: () => handleToggleStatus(tech) 
                        },
                      ]}
                      items={[
                        { icon: <FiEdit2 />, label: 'Editar', onClick: () => navigate(`/tecnicos/${tech.id}/editar`) },
                        { 
                          icon: tech.active ? <FiToggleRight /> : <FiToggleLeft />, 
                          label: tech.active ? 'Inativar' : 'Ativar', 
                          onClick: () => handleToggleStatus(tech) 
                        },
                        { icon: <FiMessageCircle />, label: 'WhatsApp', onClick: () => handleWhatsApp(tech) },
                        { icon: <FiPhone />, label: 'Ligar', onClick: () => handleCall(tech) },
                        { icon: <FiTrash2 />, label: 'Excluir', onClick: () => setDeleteId(tech.id), danger: true, dividerBefore: true },
                      ]}
                    />
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

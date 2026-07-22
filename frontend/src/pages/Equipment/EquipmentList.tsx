import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { equipmentService, Equipment } from '../../services/equipment.service';
import PageHeader from '../../components/PageHeader';
import SearchInput from '../../components/SearchInput';
import PinModal from '../../components/PinModal';
import api from '../../services/api';

export default function EquipmentList() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const loadEquipment = async (page = 1) => {
    try {
      setLoading(true);
      const response = await equipmentService.list({ search, page, limit: 20 });
      setEquipment(response.data);
      setMeta(response.meta);
    } catch {
      toast.error('Erro ao carregar equipamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => loadEquipment(), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const eq = equipment.find((e) => e.id === deleteId);
      await api.post('/admin/audit-log', {
        action: 'delete_equipment',
        entity_type: 'equipment',
        entity_id: deleteId,
        description: `Equipamento: ${eq?.type || ''} ${eq?.brand || ''} ${eq?.model || ''} - Cliente: ${eq?.client_name || 'N/A'}`,
        performed_by: 'admin',
      });
      await equipmentService.remove(deleteId);
      toast.success('Equipamento removido com sucesso');
      setDeleteId(null);
      loadEquipment(meta.page);
    } catch {
      toast.error('Erro ao remover equipamento');
    }
  };

  return (
    <div>
      <PageHeader title="Equipamentos">
        <Link to="/equipamentos/novo" className="btn btn-primary">
          <FiPlus /> Novo Equipamento
        </Link>
      </PageHeader>

      <div className="filters-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por marca, modelo ou nº série..."
        />
      </div>

      {loading ? (
        <p className="loading-text">Carregando...</p>
      ) : equipment.length === 0 ? (
        <p className="empty-text">Nenhum equipamento encontrado.</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Cliente</th>
                <th>Nº Série</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((eq) => (
                <tr key={eq.id}>
                  <td>{eq.type}</td>
                  <td>{eq.brand}</td>
                  <td>{eq.model}</td>
                  <td>{eq.client_name || '—'}</td>
                  <td>{eq.serial_number || '—'}</td>
                  <td className="actions-cell">
                    <button className="btn-icon" title="Histórico de reparos" onClick={() => navigate(`/equipamentos/${eq.id}/historico`)}>
                      <FiClock />
                    </button>
                    <button className="btn-icon" title="Editar" onClick={() => navigate(`/equipamentos/${eq.id}/editar`)}>
                      <FiEdit2 />
                    </button>
                    <button className="btn-icon btn-icon-danger" title="Excluir" onClick={() => setDeleteId(eq.id)}>
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button disabled={meta.page <= 1} onClick={() => loadEquipment(meta.page - 1)}>
                Anterior
              </button>
              <span>Página {meta.page} de {meta.totalPages}</span>
              <button disabled={meta.page >= meta.totalPages} onClick={() => loadEquipment(meta.page + 1)}>
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      <PinModal
        isOpen={!!deleteId}
        title="Excluir Equipamento"
        message="Digite o PIN do administrador para confirmar a exclusão."
        onSuccess={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

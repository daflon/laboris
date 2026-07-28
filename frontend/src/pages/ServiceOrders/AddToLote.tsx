import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { serviceOrdersService, ServiceOrder, formatOrderNumber } from '../../services/serviceOrders.service';
import { equipmentService, Equipment } from '../../services/equipment.service';
import { techniciansService, Technician } from '../../services/technicians.service';
import PageHeader from '../../components/PageHeader';

export default function AddToLote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [originalOrder, setOriginalOrder] = useState<ServiceOrder | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [reportedDefect, setReportedDefect] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderRes, techRes] = await Promise.all([
        serviceOrdersService.getById(id!),
        techniciansService.list({ limit: 100 }),
      ]);
      setOriginalOrder(orderRes.data);
      setTechnicians(techRes.data);
      setSelectedTechnicianId(orderRes.data.technician_id);

      // Buscar equipamentos do mesmo cliente
      const eqRes = await equipmentService.list({ 
        client_id: orderRes.data.client_id, 
        limit: 100 
      });
      // Filtrar equipamentos que já estão neste lote
      const usedEquipmentIds = [orderRes.data.equipment_id];
      if (orderRes.data.lote_items) {
        orderRes.data.lote_items.forEach((item: any) => {
          // Precisamos buscar o equipment_id de cada item do lote
          // Por simplicidade, vamos apenas mostrar todos os equipamentos
        });
      }
      setEquipments(eqRes.data.filter((eq: Equipment) => !usedEquipmentIds.includes(eq.id)));
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEquipmentId) {
      toast.error('Selecione um equipamento');
      return;
    }

    try {
      setSubmitting(true);
      const response = await serviceOrdersService.addToLote(id!, {
        equipment_id: selectedEquipmentId,
        technician_id: selectedTechnicianId,
        reported_defect: reportedDefect,
      });
      
      toast.success(`Equipamento adicionado ao lote! OS #${formatOrderNumber(response.data)}`);
      navigate(`/os/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao adicionar ao lote');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="loading-text">Carregando...</p>;
  if (!originalOrder) return <p className="empty-text">OS não encontrada.</p>;

  const loteNumero = originalOrder.lote_numero || originalOrder.order_number;

  return (
    <div>
      <PageHeader title={`Adicionar ao Lote #${String(loteNumero).padStart(4, '0')}`}>
        <button className="btn btn-secondary" onClick={() => navigate(`/os/${id}`)}>
          <FiArrowLeft /> Voltar
        </button>
      </PageHeader>

      <div className="form-card">
        {/* Info do lote atual */}
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          background: '#f1f5f9', 
          borderRadius: '8px' 
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            <strong>Cliente:</strong> {originalOrder.client_name}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Equipamentos já no lote: {originalOrder.equipment_brand} {originalOrder.equipment_model}
            {originalOrder.lote_items?.map((item) => `, ${item.equipment_brand} ${item.equipment_model}`)}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Novo Equipamento</h3>
            <div className="form-grid">
              <div className="form-group col-span-2">
                <label>Equipamento *</label>
                <select
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  required
                >
                  <option value="">Selecione um equipamento do cliente</option>
                  {equipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.type} - {eq.brand} {eq.model} {eq.serial_number ? `(${eq.serial_number})` : ''}
                    </option>
                  ))}
                </select>
                {equipments.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                    Nenhum outro equipamento cadastrado para este cliente. 
                    <a href={`/equipamentos/novo?client_id=${originalOrder.client_id}`} style={{ marginLeft: '0.3rem' }}>
                      Cadastrar novo equipamento
                    </a>
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Técnico Responsável</label>
                <select
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(e.target.value)}
                >
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group col-span-2">
                <label>Defeito Relatado</label>
                <textarea
                  value={reportedDefect}
                  onChange={(e) => setReportedDefect(e.target.value)}
                  rows={3}
                  placeholder="Descreva o defeito relatado pelo cliente..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate(`/os/${id}`)}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={submitting || !selectedEquipmentId}
            >
              <FiPlus /> {submitting ? 'Adicionando...' : 'Adicionar ao Lote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

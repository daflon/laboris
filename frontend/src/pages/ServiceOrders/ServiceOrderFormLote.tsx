import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiTrash2, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  serviceOrdersService,
  ServiceOrderFormData,
  ServiceOrderItem,
  STATUSES,
  PAYMENT_METHODS,
} from '../../services/serviceOrders.service';
import { clientsService, Client } from '../../services/clients.service';
import { equipmentService, Equipment } from '../../services/equipment.service';
import { techniciansService, Technician } from '../../services/technicians.service';
import PageHeader from '../../components/PageHeader';
import QuickClientModal from '../../components/QuickClientModal';
import AddEquipmentModal, { EquipmentToAdd } from '../../components/AddEquipmentModal';
import SearchableSelect from '../../components/SearchableSelect';
import { formatDocument } from '../../utils/masks';

import './ServiceOrderFormLote.css';

export default function ServiceOrderFormLote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [clients, setClients] = useState<Client[]>([]);
  const [clientEquipments, setClientEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);

  // Form state
  const [clientId, setClientId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [status, setStatus] = useState('aberta');
  // Usar data local ao invés de UTC
  const [entryDate, setEntryDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [warrantyDays, setWarrantyDays] = useState(90);

  // Equipamentos a serem criados
  const [equipmentsToCreate, setEquipmentsToCreate] = useState<EquipmentToAdd[]>([]);

  // Carregar dados auxiliares
  useEffect(() => {
    Promise.all([
      clientsService.list({ limit: 9999 }),
      techniciansService.list({ status: 'active', limit: 9999 }),
    ]).then(([clientsRes, techRes]) => {
      setClients(clientsRes.data);
      setTechnicians(techRes.data);
    });
  }, []);

  // Carregar equipamentos do cliente
  useEffect(() => {
    if (clientId) {
      equipmentService.getByClientId(clientId)
        .then((res) => setClientEquipments(res.data))
        .catch(() => setClientEquipments([]));
    } else {
      setClientEquipments([]);
      setEquipmentsToCreate([]);
    }
  }, [clientId]);

  // Se estiver editando, redireciona para o form antigo
  useEffect(() => {
    if (isEditing) {
      navigate(`/os/${id}/editar`, { replace: true });
    }
  }, [isEditing, id, navigate]);

  const handleAddEquipment = (equipment: EquipmentToAdd, addAnother: boolean) => {
    setEquipmentsToCreate((prev) => [...prev, equipment]);
    toast.success(addAnother ? 'Adicionado! Continue...' : 'Equipamento adicionado');
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipmentsToCreate((prev) => prev.filter((_, i) => i !== index));
    toast.success('Equipamento removido');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (equipmentsToCreate.length === 0) {
      toast.error('Adicione pelo menos um equipamento');
      return;
    }

    if (!clientId || !technicianId) {
      toast.error('Selecione cliente e técnico');
      return;
    }

    setSaving(true);

    try {
      const createdOrders: string[] = [];

      for (let i = 0; i < equipmentsToCreate.length; i++) {
        const eq = equipmentsToCreate[i];
        let equipmentId = eq.id;

        // Se é equipamento novo, criar primeiro
        if (eq.isNew && eq.newEquipmentData) {
          const newEquipRes = await equipmentService.create({
            client_id: clientId,
            type: eq.newEquipmentData.type,
            brand: eq.newEquipmentData.brand,
            model: eq.newEquipmentData.model,
            serial_number: eq.newEquipmentData.serial_number || undefined,
          });
          equipmentId = newEquipRes.data.id;
        }

        if (i === 0) {
          // Primeira OS
          const formData: ServiceOrderFormData = {
            client_id: clientId,
            equipment_id: equipmentId,
            technician_id: technicianId,
            status,
            reported_defect: eq.defect,
            entry_date: entryDate,
            payment_method: paymentMethod || undefined,
            warranty_days: warrantyDays,
            items: [],
          };

          const response = await serviceOrdersService.create(formData);
          createdOrders.push(response.data.order_number);

          // Se houver mais equipamentos, usar addToLote
          if (equipmentsToCreate.length > 1) {
            // Aguardar para os próximos usarem addToLote
            for (let j = 1; j < equipmentsToCreate.length; j++) {
              const nextEq = equipmentsToCreate[j];
              let nextEquipmentId = nextEq.id;

              if (nextEq.isNew && nextEq.newEquipmentData) {
                const newEqRes = await equipmentService.create({
                  client_id: clientId,
                  type: nextEq.newEquipmentData.type,
                  brand: nextEq.newEquipmentData.brand,
                  model: nextEq.newEquipmentData.model,
                  serial_number: nextEq.newEquipmentData.serial_number || undefined,
                });
                nextEquipmentId = newEqRes.data.id;
              }

              const loteResponse = await serviceOrdersService.addToLote(response.data.id, {
                equipment_id: nextEquipmentId,
                technician_id: technicianId,
                reported_defect: nextEq.defect,
                items: [],
              });

              createdOrders.push(loteResponse.order_number);
            }
            break; // Sai do loop principal pois já tratou todos
          }
        }
      }

      if (createdOrders.length === 1) {
        toast.success(`OS #${String(createdOrders[0]).padStart(4, '0')} criada com sucesso!`);
      } else {
        const firstNum = String(createdOrders[0]).padStart(4, '0');
        toast.success(`${createdOrders.length} OS criadas em lote: #${firstNum}-A até -${String.fromCharCode(64 + createdOrders.length)}`);
      }

      navigate('/os');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Erro ao criar OS';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Preview do lote
  const lotePreview = equipmentsToCreate.length >= 2;
  const nextOsNumber = '0000'; // Seria obtido do backend na implementação real

  if (loading) return <p className="loading-text">Carregando...</p>;

  return (
    <div>
      <PageHeader title="Nova Ordem de Serviço" />

      <form onSubmit={handleSubmit} className="form-card">
        {/* Cliente */}
        <div className="form-section">
          <h3>👤 Cliente</h3>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="client_id">Selecione o cliente *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <SearchableSelect
                    id="client_id"
                    name="client_id"
                    value={clientId}
                    onChange={(value) => {
                      setClientId(value);
                      setEquipmentsToCreate([]);
                    }}
                    options={clients.map(c => ({
                      value: c.id,
                      label: c.name,
                      sublabel: formatDocument(c.document)
                    }))}
                    placeholder="Selecione ou digite para buscar..."
                    required
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  title="Cadastrar novo cliente"
                  onClick={() => setShowClientModal(true)}
                  style={{ padding: '0.4rem 0.6rem' }}
                >
                  <FiPlus />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Equipamentos */}
        <div className="form-section">
          <div className="eq-section-header">
            <h3 style={{ margin: 0, border: 'none', padding: 0 }}>🔧 Equipamentos</h3>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => setShowEquipmentModal(true)}
              disabled={!clientId}
            >
              <FiPlus /> Adicionar Equipamento
            </button>
          </div>

          <p className="eq-count">
            <strong>{equipmentsToCreate.length}</strong> equipamento(s) adicionado(s)
          </p>

          {/* Lista de equipamentos */}
          <div className="eq-list">
            {equipmentsToCreate.length === 0 ? (
              <div className="eq-empty-state">
                <div className="eq-empty-icon">📦</div>
                <p>Nenhum equipamento adicionado</p>
                {clientId ? (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => setShowEquipmentModal(true)}
                  >
                    <FiPlus /> Adicionar Equipamento
                  </button>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Selecione um cliente primeiro
                  </p>
                )}
              </div>
            ) : (
              equipmentsToCreate.map((eq, index) => (
                <div key={eq.id} className={`eq-item ${eq.isNew ? 'new' : ''}`}>
                  <div className="eq-number">{String.fromCharCode(65 + index)}</div>
                  <div className="eq-info">
                    <div className="eq-name">
                      {eq.name}
                      {eq.isNew && <span className="eq-badge-new">NOVO</span>}
                    </div>
                    <div className="eq-serial">Nº Série: {eq.serial}</div>
                    <div className="eq-defect-box">
                      <div className="eq-defect-label">Defeito:</div>
                      {eq.defect}
                    </div>
                  </div>
                  <div className="eq-actions">
                    <button
                      type="button"
                      className="btn-icon btn-icon-danger"
                      onClick={() => handleRemoveEquipment(index)}
                      title="Remover"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Preview do lote */}
          {lotePreview && (
            <div className="lote-preview">
              <div className="lote-icon">📋</div>
              <div className="lote-text">
                <div className="lote-title">OS em Lote</div>
                <div className="lote-desc">
                  Serão criadas <strong>{equipmentsToCreate.length}</strong> OS vinculadas
                </div>
              </div>
              <div className="lote-numbers">
                {equipmentsToCreate.map((_, i) => (
                  <span key={i} className="lote-num">
                    #{nextOsNumber}-{String.fromCharCode(65 + i)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Configurações */}
        <div className="form-section">
          <h3>⚙️ Configurações</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="technician_id">Técnico Responsável *</label>
              <select
                id="technician_id"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="hint">Aplicado a todos os equipamentos</span>
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="entry_date">Data de Entrada</label>
              <input
                id="entry_date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="payment_method">Forma de Pagamento</label>
              <select
                id="payment_method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">Selecione...</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="warranty_days">Garantia (dias)</label>
              <input
                id="warranty_days"
                type="number"
                min="0"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="form-actions-lote">
          <div className="summary-info">
            {equipmentsToCreate.length === 0 ? (
              'Nenhum equipamento selecionado'
            ) : equipmentsToCreate.length === 1 ? (
              <>
                <strong>1</strong> equipamento → <strong>1 OS</strong>
              </>
            ) : (
              <>
                <strong>{equipmentsToCreate.length}</strong> equipamentos →{' '}
                <strong>{equipmentsToCreate.length} OS em lote</strong>
              </>
            )}
          </div>
          <div className="form-actions-right">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/os')}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || equipmentsToCreate.length === 0}
            >
              {saving
                ? 'Salvando...'
                : equipmentsToCreate.length > 1
                ? `Criar ${equipmentsToCreate.length} OS em Lote`
                : 'Criar OS'}
            </button>
          </div>
        </div>
      </form>

      {/* Modais */}
      <QuickClientModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onCreated={(newClient) => {
          setClients((prev) => [...prev, newClient as Client]);
          setClientId(newClient.id);
          setClientEquipments([]);
          setEquipmentsToCreate([]);
        }}
      />

      <AddEquipmentModal
        isOpen={showEquipmentModal}
        clientId={clientId}
        existingEquipments={clientEquipments}
        alreadyAddedIds={equipmentsToCreate.filter((e) => !e.isNew).map((e) => e.id)}
        onClose={() => setShowEquipmentModal(false)}
        onAdd={handleAddEquipment}
      />
    </div>
  );
}

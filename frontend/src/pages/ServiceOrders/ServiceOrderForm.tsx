import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
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
import QuickEquipmentModal from '../../components/QuickEquipmentModal';
import { formatDocument } from '../../utils/masks';

const emptyItem: ServiceOrderItem = { quantity: 1, description: '', unit_price: 0 };

const emptyForm: ServiceOrderFormData = {
  client_id: '',
  equipment_id: '',
  technician_id: '',
  status: 'aberta',
  reported_defect: '',
  diagnosis: '',
  notes: '',
  payment_method: '',
  warranty_days: 90,
  entry_date: new Date().toISOString().split('T')[0],
  completion_date: '',
  items: [],
};

export default function ServiceOrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [form, setForm] = useState<ServiceOrderFormData>(emptyForm);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);

  // Carregar dados auxiliares
  useEffect(() => {
    Promise.all([
      clientsService.list({ limit: 200 }),
      techniciansService.list({ status: 'active', limit: 200 }),
    ]).then(([clientsRes, techRes]) => {
      setClients(clientsRes.data);
      setTechnicians(techRes.data);
    });
  }, []);

  // Carregar equipamentos ao selecionar cliente
  useEffect(() => {
    if (form.client_id) {
      equipmentService.getByClientId(form.client_id)
        .then((res) => setEquipmentList(res.data))
        .catch(() => setEquipmentList([]));
    } else {
      setEquipmentList([]);
    }
  }, [form.client_id]);

  // Carregar OS existente
  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      serviceOrdersService.getById(id!)
        .then((response) => {
          const os = response.data;
          setForm({
            client_id: os.client_id,
            equipment_id: os.equipment_id,
            technician_id: os.technician_id,
            status: os.status,
            reported_defect: os.reported_defect || '',
            diagnosis: os.diagnosis || '',
            notes: os.notes || '',
            payment_method: os.payment_method || '',
            warranty_days: os.warranty_days ?? 90,
            entry_date: os.entry_date || '',
            completion_date: os.completion_date || '',
            items: os.items || [],
          });
        })
        .catch(() => toast.error('Erro ao carregar OS'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'warranty_days' ? parseInt(value) || 0 : value,
    }));
  };

  // Items
  const handleAddItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  };

  const handleRemoveItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: keyof ServiceOrderItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const totalValue = form.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        await serviceOrdersService.update(id!, form);
        toast.success('OS atualizada com sucesso');
      } else {
        await serviceOrdersService.create(form);
        toast.success('OS criada com sucesso');
      }
      navigate('/os');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Erro ao salvar OS';
      const details = error.response?.data?.error?.details;
      if (details && details.length > 0) {
        details.forEach((d: any) => toast.error(`${d.field}: ${d.message}`));
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="loading-text">Carregando...</p>;

  return (
    <div>
      <PageHeader title={isEditing ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'} />

      <form onSubmit={handleSubmit} className="form-card">
        {/* Dados principais */}
        <div className="form-section">
          <h3>Dados da OS</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="client_id">Cliente *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select id="client_id" name="client_id" value={form.client_id} onChange={handleChange} required style={{ flex: 1 }}>
                  <option value="">Selecione</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {formatDocument(c.document)}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-primary" title="Cadastrar novo cliente" onClick={() => setShowClientModal(true)} style={{ padding: '0.4rem 0.6rem' }}>
                  <FiPlus />
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="equipment_id">Equipamento *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select id="equipment_id" name="equipment_id" value={form.equipment_id} onChange={handleChange} required disabled={!form.client_id} style={{ flex: 1 }}>
                  <option value="">{form.client_id ? 'Selecione' : 'Selecione um cliente primeiro'}</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.type} — {eq.brand} {eq.model}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-primary" title="Cadastrar novo equipamento" onClick={() => setShowEquipmentModal(true)} disabled={!form.client_id} style={{ padding: '0.4rem 0.6rem' }}>
                  <FiPlus />
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="technician_id">Técnico Responsável *</label>
              <select id="technician_id" name="technician_id" value={form.technician_id} onChange={handleChange} required>
                <option value="">Selecione</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status} onChange={handleChange}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="entry_date">Data de Entrada</label>
              <input id="entry_date" name="entry_date" type="date" value={form.entry_date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="completion_date">Data de Conclusão</label>
              <input id="completion_date" name="completion_date" type="date" value={form.completion_date} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Defeito e diagnóstico */}
        <div className="form-section">
          <h3>Situação / Parecer</h3>
          <div className="form-grid">
            <div className="form-group col-span-2">
              <label htmlFor="reported_defect">Defeito Relatado (Situação)</label>
              <textarea id="reported_defect" name="reported_defect" value={form.reported_defect} onChange={handleChange} rows={3} placeholder="Descreva o defeito informado pelo cliente..." />
            </div>
            <div className="form-group col-span-2">
              <label htmlFor="diagnosis">Diagnóstico</label>
              <textarea id="diagnosis" name="diagnosis" value={form.diagnosis} onChange={handleChange} rows={3} placeholder="Parecer técnico sobre o problema..." />
            </div>
            <div className="form-group col-span-2">
              <label htmlFor="notes">Observações</label>
              <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={2} />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Itens (Serviços e Peças)</h3>
            <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
              <FiPlus /> Adicionar Item
            </button>
          </div>

          {form.items.length === 0 ? (
            <p className="empty-text">Nenhum item adicionado.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Qtd</th>
                  <th>Descrição</th>
                  <th style={{ width: '150px' }}>Valor Unit. (R$)</th>
                  <th style={{ width: '110px' }}>Subtotal</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '0.3rem' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Serviço ou peça..."
                        style={{ width: '100%', padding: '0.3rem' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.9rem' }}
                        />
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                      R$ {(item.quantity * item.unit_price).toFixed(2)}
                    </td>
                    <td>
                      <button type="button" className="btn-icon btn-icon-danger" onClick={() => handleRemoveItem(index)}>
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>VALOR TOTAL:</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>
                    R$ {totalValue.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Pagamento e garantia */}
        <div className="form-section">
          <h3>Pagamento e Garantia</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="payment_method">Forma de Pagamento</label>
              <select id="payment_method" name="payment_method" value={form.payment_method} onChange={handleChange}>
                <option value="">Selecione</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="warranty_days">Garantia (dias)</label>
              <input id="warranty_days" name="warranty_days" type="number" min="0" value={form.warranty_days} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/os')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar OS'}
          </button>
        </div>
      </form>

      {/* Modais de cadastro rápido */}
      <QuickClientModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onCreated={(newClient) => {
          setClients((prev) => [...prev, newClient as Client]);
          setForm((prev) => ({ ...prev, client_id: newClient.id }));
        }}
      />
      <QuickEquipmentModal
        isOpen={showEquipmentModal}
        clientId={form.client_id}
        onClose={() => setShowEquipmentModal(false)}
        onCreated={(newEquipment) => {
          setEquipmentList((prev) => [...prev, newEquipment as Equipment]);
          setForm((prev) => ({ ...prev, equipment_id: newEquipment.id }));
        }}
      />
    </div>
  );
}

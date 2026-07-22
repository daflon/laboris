import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { equipmentService, EquipmentFormData } from '../../services/equipment.service';
import { clientsService, Client } from '../../services/clients.service';
import PageHeader from '../../components/PageHeader';
import { formatDocument } from '../../utils/masks';

const emptyForm: EquipmentFormData = {
  client_id: '',
  type: '',
  brand: '',
  model: '',
  serial_number: '',
  notes: '',
};

export default function EquipmentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [form, setForm] = useState<EquipmentFormData>(emptyForm);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Carregar lista de clientes para o select
    clientsService.list({ limit: 100 })
      .then((response) => setClients(response.data))
      .catch(() => toast.error('Erro ao carregar clientes'));

    if (isEditing) {
      setLoading(true);
      equipmentService.getById(id!)
        .then((response) => {
          const eq = response.data;
          setForm({
            client_id: eq.client_id || '',
            type: eq.type || '',
            brand: eq.brand || '',
            model: eq.model || '',
            serial_number: eq.serial_number || '',
            notes: eq.notes || '',
          });
        })
        .catch(() => toast.error('Erro ao carregar equipamento'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        const { client_id, ...updateData } = form;
        await equipmentService.update(id!, updateData);
        toast.success('Equipamento atualizado com sucesso');
      } else {
        await equipmentService.create(form);
        toast.success('Equipamento criado com sucesso');
      }
      navigate('/equipamentos');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Erro ao salvar equipamento';
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
      <PageHeader title={isEditing ? 'Editar Equipamento' : 'Novo Equipamento'} />

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-section">
          <div className="form-grid">
            {!isEditing && (
              <div className="form-group col-span-2">
                <label htmlFor="client_id">Cliente *</label>
                <select id="client_id" name="client_id" value={form.client_id} onChange={handleChange} required>
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} — {formatDocument(client.document)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="type">Tipo *</label>
              <input id="type" name="type" value={form.type} onChange={handleChange} required placeholder="Ex: Serra Mármore, Furadeira, Parafusadeira" />
            </div>
            <div className="form-group">
              <label htmlFor="brand">Marca *</label>
              <input id="brand" name="brand" value={form.brand} onChange={handleChange} required placeholder="Ex: Bosch, Makita, DeWalt, Black+Decker" />
            </div>
            <div className="form-group">
              <label htmlFor="model">Modelo *</label>
              <input id="model" name="model" value={form.model} onChange={handleChange} required placeholder="Ex: GDC 150, HP1630, DCD796" />
            </div>
            <div className="form-group">
              <label htmlFor="serial_number">Número de Série</label>
              <input id="serial_number" name="serial_number" value={form.serial_number} onChange={handleChange} />
            </div>
            <div className="form-group col-span-2">
              <label htmlFor="notes">Observações</label>
              <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={3} />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/equipamentos')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import toast from 'react-hot-toast';
import { equipmentService, EquipmentFormData } from '../services/equipment.service';

interface QuickEquipmentModalProps {
  isOpen: boolean;
  clientId: string;
  onClose: () => void;
  onCreated: (equipment: { id: string; type: string; brand: string; model: string }) => void;
}

export default function QuickEquipmentModal({ isOpen, clientId, onClose, onCreated }: QuickEquipmentModalProps) {
  const [form, setForm] = useState<Omit<EquipmentFormData, 'client_id'>>({
    type: '',
    brand: '',
    model: '',
    serial_number: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await equipmentService.create({ ...form, client_id: clientId });
      toast.success('Equipamento cadastrado!');
      onCreated(response.data);
      setForm({ type: '', brand: '', model: '', serial_number: '', notes: '' });
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Erro ao cadastrar equipamento';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>Cadastro Rápido de Equipamento</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label htmlFor="qe-type">Tipo *</label>
              <input id="qe-type" name="type" value={form.type} onChange={handleChange} required placeholder="Ex: Serra Mármore, Furadeira..." />
            </div>
            <div className="form-group">
              <label htmlFor="qe-brand">Marca *</label>
              <input id="qe-brand" name="brand" value={form.brand} onChange={handleChange} required placeholder="Ex: Bosch, Makita, DeWalt..." />
            </div>
            <div className="form-group">
              <label htmlFor="qe-model">Modelo *</label>
              <input id="qe-model" name="model" value={form.model} onChange={handleChange} required placeholder="Ex: GDC 150, HP1630..." />
            </div>
            <div className="form-group">
              <label htmlFor="qe-serial">Nº de Série</label>
              <input id="qe-serial" name="serial_number" value={form.serial_number} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="qe-notes">Observações</label>
              <textarea id="qe-notes" name="notes" value={form.notes} onChange={handleChange} rows={2} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

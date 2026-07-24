import { useState } from 'react';
import toast from 'react-hot-toast';
import { clientsService, ClientFormData } from '../services/clients.service';
import { maskDocument, maskPhone } from '../utils/masks';

interface QuickClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (client: { id: string; name: string; document: string }) => void;
}

export default function QuickClientModal({ isOpen, onClose, onCreated }: QuickClientModalProps) {
  const [form, setForm] = useState<ClientFormData>({
    name: '',
    document: '',
    phone: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;
    if (name === 'document') maskedValue = maskDocument(value);
    else if (name === 'phone') maskedValue = maskPhone(value);
    setForm((prev) => ({ ...prev, [name]: maskedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        document: form.document.replace(/\D/g, ''),
        phone: form.phone.replace(/\D/g, ''),
      };
      const response = await clientsService.create(data);
      toast.success('Cliente cadastrado!');
      onCreated(response.data);
      setForm({ name: '', document: '', phone: '', email: '' });
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Erro ao cadastrar cliente';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>Cadastro Rápido de Cliente</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label htmlFor="qc-name">Nome *</label>
              <input id="qc-name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="qc-document">CPF/CNPJ</label>
              <input id="qc-document" name="document" value={form.document} onChange={handleChange} placeholder="000.000.000-00" />
            </div>
            <div className="form-group">
              <label htmlFor="qc-phone">Telefone *</label>
              <input id="qc-phone" name="phone" value={form.phone} onChange={handleChange} required placeholder="(00) 00000-0000" />
            </div>
            <div className="form-group">
              <label htmlFor="qc-email">Email</label>
              <input id="qc-email" name="email" type="email" value={form.email} onChange={handleChange} />
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

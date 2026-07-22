import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { techniciansService, TechnicianFormData } from '../../services/technicians.service';
import PageHeader from '../../components/PageHeader';
import { maskPhone } from '../../utils/masks';

const emptyForm: TechnicianFormData = {
  name: '',
  phone: '',
  specialty: '',
  active: true,
};

export default function TechnicianForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [form, setForm] = useState<TechnicianFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      techniciansService.getById(id!)
        .then((response) => {
          const tech = response.data;
          setForm({
            name: tech.name || '',
            phone: maskPhone(tech.phone || ''),
            specialty: tech.specialty || '',
            active: tech.active,
          });
        })
        .catch(() => toast.error('Erro ao carregar técnico'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    let maskedValue = value;
    if (name === 'phone') maskedValue = maskPhone(value);

    setForm((prev) => ({ ...prev, [name]: maskedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        ...form,
        phone: form.phone.replace(/\D/g, ''),
      };

      if (isEditing) {
        await techniciansService.update(id!, data);
        toast.success('Técnico atualizado com sucesso');
      } else {
        await techniciansService.create(data);
        toast.success('Técnico criado com sucesso');
      }
      navigate('/tecnicos');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Erro ao salvar técnico';
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
      <PageHeader title={isEditing ? 'Editar Técnico' : 'Novo Técnico'} />

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-section">
          <div className="form-grid">
            <div className="form-group col-span-2">
              <label htmlFor="name">Nome *</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Telefone *</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} required placeholder="(00) 00000-0000" />
            </div>
            <div className="form-group">
              <label htmlFor="specialty">Especialidade</label>
              <input id="specialty" name="specialty" value={form.specialty} onChange={handleChange} placeholder="Ex: Ferramentas elétricas, Serra mármore, Furadeiras..." />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" name="active" checked={form.active} onChange={handleChange} />
                Ativo
              </label>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/tecnicos')}>
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

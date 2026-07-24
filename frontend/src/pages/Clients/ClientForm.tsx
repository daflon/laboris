import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientsService, ClientFormData } from '../../services/clients.service';
import PageHeader from '../../components/PageHeader';
import { maskDocument, maskPhone, maskZip } from '../../utils/masks';

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

const emptyForm: ClientFormData = {
  name: '',
  document: '',
  phone: '',
  email: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zip: '',
};

export default function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      clientsService.getById(id!)
        .then((response) => {
          const client = response.data;
          setForm({
            name: client.name || '',
            document: maskDocument(client.document || ''),
            phone: maskPhone(client.phone || ''),
            email: client.email || '',
            address_street: client.address_street || '',
            address_number: client.address_number || '',
            address_complement: client.address_complement || '',
            address_neighborhood: client.address_neighborhood || '',
            address_city: client.address_city || '',
            address_state: client.address_state || '',
            address_zip: maskZip(client.address_zip || ''),
          });
        })
        .catch(() => toast.error('Erro ao carregar cliente'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    let maskedValue = value;
    if (name === 'document') maskedValue = maskDocument(value);
    else if (name === 'phone') maskedValue = maskPhone(value);
    else if (name === 'address_zip') maskedValue = maskZip(value);

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
        address_zip: form.address_zip?.replace(/\D/g, '') || '',
      };

      if (isEditing) {
        await clientsService.update(id!, data);
        toast.success('Cliente atualizado com sucesso');
      } else {
        await clientsService.create(data);
        toast.success('Cliente criado com sucesso');
      }
      navigate('/clientes');
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Erro ao salvar cliente';
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
      <PageHeader title={isEditing ? 'Editar Cliente' : 'Novo Cliente'} />

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-section">
          <h3>Dados Pessoais</h3>
          <div className="form-grid">
            <div className="form-group col-span-2">
              <label htmlFor="name">Nome *</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="document">CPF/CNPJ</label>
              <input id="document" name="document" value={form.document} onChange={handleChange} placeholder="000.000.000-00" />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Telefone *</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} required placeholder="(00) 00000-0000" />
            </div>
            <div className="form-group col-span-2">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="exemplo@email.com" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Endereço</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="address_zip">CEP</label>
              <input id="address_zip" name="address_zip" value={form.address_zip} onChange={handleChange} placeholder="00000-000" />
            </div>
            <div className="form-group col-span-2">
              <label htmlFor="address_street">Rua</label>
              <input id="address_street" name="address_street" value={form.address_street} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="address_number">Número</label>
              <input id="address_number" name="address_number" value={form.address_number} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="address_complement">Complemento</label>
              <input id="address_complement" name="address_complement" value={form.address_complement} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="address_neighborhood">Bairro</label>
              <input id="address_neighborhood" name="address_neighborhood" value={form.address_neighborhood} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="address_city">Cidade</label>
              <input id="address_city" name="address_city" value={form.address_city} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="address_state">UF</label>
              <select id="address_state" name="address_state" value={form.address_state} onChange={handleChange}>
                <option value="">Selecione</option>
                {STATES.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/clientes')}>
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

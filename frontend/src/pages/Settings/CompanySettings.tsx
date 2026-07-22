import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { companyService, CompanySettings as CompanyData } from '../../services/company.service';
import PageHeader from '../../components/PageHeader';
import { maskDocument, maskPhone, maskZip } from '../../utils/masks';

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

const emptyForm: CompanyData = {
  name: '',
  document: '',
  phone: '',
  phone2: '',
  email: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  logo_url: '',
  header_text: '',
  footer_text: '',
  default_warranty_days: 90,
  admin_pin: '',
};

export default function CompanySettingsPage() {
  const [form, setForm] = useState<CompanyData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    companyService.get()
      .then((response) => {
        if (response.data) {
          const data = response.data;
          setForm({
            ...data,
            document: data.document ? maskDocument(data.document) : '',
            phone: data.phone ? maskPhone(data.phone) : '',
            phone2: data.phone2 ? maskPhone(data.phone2) : '',
            address_zip: data.address_zip ? maskZip(data.address_zip) : '',
          });
        }
      })
      .catch(() => toast.error('Erro ao carregar configurações'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    let maskedValue = value;
    if (name === 'document') maskedValue = maskDocument(value);
    else if (name === 'phone' || name === 'phone2') maskedValue = maskPhone(value);
    else if (name === 'address_zip') maskedValue = maskZip(value);

    setForm((prev) => ({
      ...prev,
      [name]: name === 'default_warranty_days' ? parseInt(value) || 0 : maskedValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        ...form,
        document: form.document?.replace(/\D/g, '') || '',
        phone: form.phone?.replace(/\D/g, '') || '',
        phone2: form.phone2?.replace(/\D/g, '') || '',
        address_zip: form.address_zip?.replace(/\D/g, '') || '',
      };

      await companyService.save(data);
      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="loading-text">Carregando...</p>;

  return (
    <div>
      <PageHeader title="Configurações da Empresa" />

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-section">
          <h3>Dados da Empresa</h3>
          <div className="form-grid">
            <div className="form-group col-span-2">
              <label htmlFor="name">Nome da Empresa *</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Ex: Eletrotécnica São Miguel" />
            </div>
            <div className="form-group">
              <label htmlFor="document">CNPJ/CPF</label>
              <input id="document" name="document" value={form.document} onChange={handleChange} placeholder="00.000.000/0000-00" />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Telefone Principal</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
            </div>
            <div className="form-group">
              <label htmlFor="phone2">Telefone Secundário</label>
              <input id="phone2" name="phone2" value={form.phone2} onChange={handleChange} placeholder="(00) 00000-0000" />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
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

        <div className="form-section">
          <h3>Personalização das Impressões</h3>
          <div className="form-grid">
            <div className="form-group col-span-2">
              <label htmlFor="logo_url">URL do Logo</label>
              <input id="logo_url" name="logo_url" value={form.logo_url} onChange={handleChange} placeholder="https://... (link da imagem do logo)" />
            </div>
            <div className="form-group col-span-2">
              <label htmlFor="header_text">Texto do Cabeçalho (aparece abaixo do nome no PDF)</label>
              <textarea id="header_text" name="header_text" value={form.header_text} onChange={handleChange} rows={2} placeholder="Ex: Conserto de ferramentas elétricas em geral" />
            </div>
            <div className="form-group col-span-2">
              <label htmlFor="footer_text">Texto do Rodapé (aparece no fim do PDF)</label>
              <textarea id="footer_text" name="footer_text" value={form.footer_text} onChange={handleChange} rows={2} placeholder="Ex: Mediante a realização ou não do serviço, a máquina deverá ser retirada no prazo de 180 dias..." />
            </div>
            <div className="form-group">
              <label htmlFor="default_warranty_days">Garantia padrão (dias)</label>
              <input id="default_warranty_days" name="default_warranty_days" type="number" min="0" value={form.default_warranty_days} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="admin_pin">PIN do Administrador (4 dígitos)</label>
              <input id="admin_pin" name="admin_pin" type="password" maxLength={4} value={form.admin_pin} onChange={handleChange} placeholder="0000" style={{ width: '120px', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.5rem' }} />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Necessário para excluir registros. Padrão: 0000</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}

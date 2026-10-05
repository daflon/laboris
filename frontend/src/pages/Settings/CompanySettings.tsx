import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiSettings, FiUser, FiLock, FiMail, FiShield, FiCheck, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { companyService, CompanySettings as CompanyData } from '../../services/company.service';
import { authService } from '../../services/auth.service';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { maskDocument, maskPhone, maskZip } from '../../utils/masks';
import './CompanySettings.css';

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

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string | null;
}

export default function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState<'empresa' | 'conta'>('empresa');
  
  // Estado da aba Empresa
  const [form, setForm] = useState<CompanyData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado da aba Minha Conta
  const [user, setUser] = useState<UserData | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    // Carregar dados da empresa
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

    // Carregar dados do usuário
    const userData = authService.getUser();
    setUser(userData);

    api.get('/auth/me')
      .then((res) => {
        if (res.data.data) {
          setUser(res.data.data);
        }
      })
      .catch(() => {});
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

  // Validações de senha
  const passwordValidations = {
    minLength: newPassword.length >= 6,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasNumber: /\d/.test(newPassword),
    passwordsMatch: newPassword === confirmPassword && confirmPassword.length > 0,
  };

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Digite a senha atual');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }

    setSavingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao alterar senha');
    } finally {
      setSavingPassword(false);
    }
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      super_admin: 'Super Administrador',
      admin: 'Administrador',
      user: 'Usuário',
    };
    return roles[role] || role;
  };

  if (loading) return <p className="loading-text">Carregando...</p>;

  return (
    <div>
      <PageHeader title="Configurações" />

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'empresa' ? 'active' : ''}`}
          onClick={() => setActiveTab('empresa')}
        >
          <FiSettings /> Empresa
        </button>
        <button
          className={`settings-tab ${activeTab === 'conta' ? 'active' : ''}`}
          onClick={() => setActiveTab('conta')}
        >
          <FiUser /> Minha Conta
        </button>
      </div>

      {/* Tab Empresa */}
      {activeTab === 'empresa' && (
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
                <label>Logo da Empresa</label>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  {form.logo_url && (
                    <div style={{ 
                      width: '120px', 
                      height: '80px', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f8fafc'
                    }}>
                      <img 
                        src={form.logo_url} 
                        alt="Logo" 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                      />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        if (file.size > 200 * 1024) {
                          toast.error('Imagem muito grande. Máximo: 200KB');
                          e.target.value = '';
                          return;
                        }
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          setForm((prev) => ({ ...prev, logo_url: base64 }));
                          toast.success('Logo carregada!');
                        };
                        reader.readAsDataURL(file);
                      }}
                      style={{ marginBottom: '0.5rem' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      PNG, JPG ou WebP. Máximo 200KB. Recomendado: 300x100px
                    </div>
                    {form.logo_url && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => setForm((prev) => ({ ...prev, logo_url: '' }))}
                      >
                        Remover logo
                      </button>
                    )}
                  </div>
                </div>
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
      )}

      {/* Tab Minha Conta */}
      {activeTab === 'conta' && user && (
        <div className="account-content">
          <div className="account-grid">
            {/* Card de Informações do Usuário */}
            <div className="account-card">
              <div className="account-card-header">
                <FiUser className="card-icon" />
                <h2>Informações da Conta</h2>
              </div>
              <div className="account-card-body">
                <div className="info-row">
                  <span className="info-label"><FiUser /> Nome</span>
                  <span className="info-value">{user.name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label"><FiMail /> Email</span>
                  <span className="info-value">{user.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label"><FiShield /> Tipo de Conta</span>
                  <span className="info-value">
                    <span className={`role-badge role-${user.role}`}>
                      {getRoleName(user.role)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Card de Alteração de Senha */}
            <div className="account-card">
              <div className="account-card-header">
                <FiLock className="card-icon" />
                <h2>Alterar Senha</h2>
              </div>
              <div className="account-card-body">
                <form onSubmit={handleChangePassword} className="password-form">
                  <div className="form-group">
                    <label htmlFor="currentPassword">Senha Atual</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Digite sua senha atual"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">Nova Senha</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite a nova senha"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme a nova senha"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>

                  {newPassword && (
                    <div className="password-requirements">
                      <p className="requirements-title">Requisitos da senha:</p>
                      <ul>
                        <li className={passwordValidations.minLength ? 'valid' : 'invalid'}>
                          {passwordValidations.minLength ? <FiCheck /> : <FiX />}
                          Mínimo 6 caracteres
                        </li>
                        <li className={passwordValidations.hasUppercase ? 'valid' : 'invalid'}>
                          {passwordValidations.hasUppercase ? <FiCheck /> : <FiX />}
                          Uma letra maiúscula
                        </li>
                        <li className={passwordValidations.hasNumber ? 'valid' : 'invalid'}>
                          {passwordValidations.hasNumber ? <FiCheck /> : <FiX />}
                          Um número
                        </li>
                        {confirmPassword && (
                          <li className={passwordValidations.passwordsMatch ? 'valid' : 'invalid'}>
                            {passwordValidations.passwordsMatch ? <FiCheck /> : <FiX />}
                            Senhas conferem
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingPassword || !currentPassword || !isPasswordValid}
                  >
                    {savingPassword ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

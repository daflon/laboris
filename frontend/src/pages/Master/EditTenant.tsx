import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface TenantUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

export default function EditTenant() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState({ name: '', modules: ['os'] as string[] });
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/master/tenants/${id}`)
      .then((res) => {
        const data = res.data.data;
        const mods = typeof data.modules === 'string' ? JSON.parse(data.modules) : data.modules;
        setForm({ name: data.name, modules: mods });
        setUsers(data.users || []);
        if (data.users?.length > 0) setSelectedUserId(data.users[0].id);
      })
      .catch(() => toast.error('Erro ao carregar tenant'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/master/tenants/${id}`, form);
      toast.success('Dados atualizados!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error('Senha deve ter no mínimo 4 caracteres');
      return;
    }
    try {
      await api.put(`/master/tenants/${id}/reset-password`, {
        user_id: selectedUserId,
        new_password: newPassword,
      });
      toast.success('Senha alterada!');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao alterar senha');
    }
  };

  const handleModuleToggle = (mod: string) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(mod)
        ? prev.modules.filter((m) => m !== mod)
        : [...prev.modules, mod],
    }));
  };

  if (loading) return <p className="loading-text">Carregando...</p>;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/master')}><FiArrowLeft /> Voltar</button>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Editar Conta</h2>
      </div>

      <form onSubmit={handleSave} className="form-card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-section">
          <h3>Dados da Empresa</h3>
          <div className="form-group">
            <label htmlFor="name">Nome *</label>
            <input id="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          </div>
        </div>

        <div className="form-section">
          <h3>Módulos</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label className="checkbox-label" style={{ marginTop: 0 }}>
              <input type="checkbox" checked={true} disabled /> OS (sempre ativo)
            </label>
            <label className="checkbox-label" style={{ marginTop: 0 }}>
              <input type="checkbox" checked={form.modules.includes('financeiro')} onChange={() => handleModuleToggle('financeiro')} /> Financeiro
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>

      {/* Reset de senha */}
      <div className="form-card">
        <div className="form-section">
          <h3>Alterar Senha do Usuário</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {users.length > 1 && (
              <div className="form-group">
                <label>Usuário</label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            )}
            {users.length === 1 && (
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Usuário: <strong>{users[0].email}</strong></p>
            )}
            <div className="form-group">
              <label>Nova Senha</label>
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha..." />
            </div>
            <button type="button" className="btn btn-primary" onClick={handleResetPassword} style={{ alignSelf: 'flex-start' }}>
              Alterar Senha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

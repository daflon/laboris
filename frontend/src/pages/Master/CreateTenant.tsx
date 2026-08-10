import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function CreateTenant() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    password: '',
    modules: ['os'],
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Auto-gerar slug a partir do nome
      ...(name === 'name' ? { slug: value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50) } : {}),
    }));
  };

  const handleModuleToggle = (mod: string) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(mod)
        ? prev.modules.filter((m) => m !== mod)
        : [...prev.modules, mod],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/master/tenants', form);
      toast.success('Conta criada com sucesso!');
      navigate('/master');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao criar conta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Master Header - Cyan */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
        padding: '1rem 2rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)'
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn" onClick={() => navigate('/master')} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}><FiArrowLeft /> Voltar</button>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', margin: 0 }}>Nova Conta</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Painel Master</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 2rem 2rem 2rem' }}>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-section">
          <h3>Dados da Empresa</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="name">Nome da Empresa *</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Ex: Eletrotécnica São Miguel" />
            </div>
            <div className="form-group">
              <label htmlFor="slug">Slug (identificador único) *</label>
              <input id="slug" name="slug" value={form.slug} onChange={handleChange} required placeholder="ex: esm" />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Gerado automaticamente a partir do nome</span>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Acesso do Admin</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="email">Email de acesso *</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="admin@empresa.com" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Senha inicial *</label>
              <input id="password" name="password" type="text" value={form.password} onChange={handleChange} required placeholder="Senha que será passada ao cliente" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Módulos</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label className="checkbox-label" style={{ marginTop: 0 }}>
              <input type="checkbox" checked={true} disabled /> OS (sempre ativo)
            </label>
            <label className="checkbox-label" style={{ marginTop: 0 }}>
              <input type="checkbox" checked={form.modules.includes('faturamento')} onChange={() => handleModuleToggle('faturamento')} /> Faturamento
            </label>
            <label className="checkbox-label" style={{ marginTop: 0 }}>
              <input type="checkbox" checked={form.modules.includes('financeiro')} onChange={() => handleModuleToggle('financeiro')} /> Financeiro
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/master')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: '#0891b2' }}>
            {saving ? 'Criando...' : 'Criar Conta'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

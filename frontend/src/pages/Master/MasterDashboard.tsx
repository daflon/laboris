import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiUsers, FiClipboard, FiLayers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { authService } from '../../services/auth.service';

interface MasterStats {
  total_tenants: number;
  active_tenants: number;
  total_orders: number;
  total_clients: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  modules: string[];
  created_at: string;
  stats: { orders: number; clients: number; last_access: string | null };
}

export default function MasterDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MasterStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/master/stats'),
      api.get('/master/tenants'),
    ])
      .then(([statsRes, tenantsRes]) => {
        setStats(statsRes.data.data);
        setTenants(tenantsRes.data.data);
      })
      .catch(() => toast.error('Erro ao carregar painel'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/master/tenants/${id}/toggle`);
      const res = await api.get('/master/tenants');
      setTenants(res.data.data);
      toast.success('Status alterado');
    } catch { toast.error('Erro ao alterar status'); }
  };

  const handleImpersonate = async (tenantId: string) => {
    try {
      const res = await api.post(`/master/tenants/${tenantId}/impersonate`);
      const { token, tenant } = res.data.data;
      // Salva token original pra poder voltar
      localStorage.setItem('master_token', localStorage.getItem('token') || '');
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ ...authService.getUser(), tenant_id: tenant.id, role: 'tenant_user' }));
      toast.success(`Acessando como: ${tenant.name}`);
      navigate('/dashboard');
      window.location.reload();
    } catch { toast.error('Erro ao acessar conta'); }
  };

  const handleLogout = () => {
    authService.removeToken();
    navigate('/login');
  };

  if (loading) return <p className="loading-text">Carregando...</p>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>🛡️ Painel Master</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {localStorage.getItem('master_token') && (
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Ir ao App</button>
          )}
          <Link to="/master/tenants/novo" className="btn btn-primary"><FiPlus /> Nova Conta</Link>
          <button className="btn btn-secondary" onClick={handleLogout}>Sair</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="dashboard-cards" style={{ marginBottom: '2rem' }}>
          <div className="dash-card dash-card-blue">
            <div className="dash-card-icon"><FiLayers /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.active_tenants}/{stats.total_tenants}</span>
              <span className="dash-card-label">Contas Ativas</span>
            </div>
          </div>
          <div className="dash-card dash-card-green">
            <div className="dash-card-icon"><FiClipboard /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.total_orders}</span>
              <span className="dash-card-label">OS no Sistema</span>
            </div>
          </div>
          <div className="dash-card dash-card-gray">
            <div className="dash-card-icon"><FiUsers /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.total_clients}</span>
              <span className="dash-card-label">Clientes Total</span>
            </div>
          </div>
        </div>
      )}

      {/* Tenants list */}
      <div className="detail-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Contas Cadastradas</h3>
        {tenants.length === 0 ? (
          <p className="empty-text">Nenhuma conta criada ainda.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Slug</th>
                <th>OS</th>
                <th>Clientes</th>
                <th>Módulos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td style={{ color: '#64748b' }}>{t.slug}</td>
                  <td>{t.stats.orders}</td>
                  <td>{t.stats.clients}</td>
                  <td>
                    {(typeof t.modules === 'string' ? JSON.parse(t.modules) : t.modules).join(', ')}
                  </td>
                  <td>
                    <span className={`badge ${t.active ? 'badge-success' : 'badge-danger'}`}>
                      {t.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="btn-icon" title="Editar" onClick={() => navigate(`/master/tenants/${t.id}/editar`)}>
                      ✏️
                    </button>
                    <button className="btn-icon" title="Acessar como esta empresa" onClick={() => handleImpersonate(t.id)}>
                      🔑
                    </button>
                    <button className="btn-icon" title={t.active ? 'Desativar' : 'Ativar'} onClick={() => handleToggle(t.id)}>
                      {t.active ? '⏸' : '▶'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

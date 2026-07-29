import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiUsers, FiClipboard, FiLayers, FiDatabase, FiCloud, FiHardDrive, FiRefreshCw, FiAlertTriangle, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { authService } from '../../services/auth.service';

interface SystemAlert {
  id: string;
  type: 'error' | 'warning';
  title: string;
  message: string;
}

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

interface BackupInfo {
  name: string;
  size: number;
  date: string;
  url: string;
}

interface SystemStatus {
  database: {
    connected: boolean;
    latency: number | null;
    error: string | null;
  };
  metrics: {
    tenants: { total: number; active: number };
    orders: number;
    clients: number;
    equipments: number;
    technicians: number;
  };
  backups: {
    list: BackupInfo[];
    error: string | null;
    lastBackup: BackupInfo | null;
  };
  deploy: {
    healthy: boolean;
    message: string;
  };
  timestamp: string;
}

// Helpers
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatBackupDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export default function MasterDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MasterStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Gera alertas baseados no status do sistema
  const getSystemAlerts = (): SystemAlert[] => {
    if (!systemStatus) return [];
    
    const alerts: SystemAlert[] = [];
    
    // Alerta: Banco de dados offline
    if (!systemStatus.database.connected) {
      alerts.push({
        id: 'db-offline',
        type: 'error',
        title: 'Banco de Dados Offline',
        message: systemStatus.database.error || 'Não foi possível conectar ao PostgreSQL. Verifique a conexão com o Neon.'
      });
    }
    
    // Alerta: Latência alta do banco (> 500ms)
    if (systemStatus.database.connected && systemStatus.database.latency && systemStatus.database.latency > 500) {
      alerts.push({
        id: 'db-slow',
        type: 'warning',
        title: 'Banco de Dados Lento',
        message: `Latência atual: ${systemStatus.database.latency}ms. Pode haver lentidão no sistema.`
      });
    }
    
    // Alerta: Deploy com problemas
    if (!systemStatus.deploy.healthy) {
      alerts.push({
        id: 'deploy-unhealthy',
        type: 'error',
        title: 'Problemas no Deploy',
        message: systemStatus.deploy.message || 'O serviço no Render está com problemas.'
      });
    }
    
    // Alerta: Backup atrasado (> 24h)
    if (systemStatus.backups.lastBackup) {
      const lastBackupDate = new Date(systemStatus.backups.lastBackup.date);
      const hoursSinceBackup = (Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceBackup > 24) {
        alerts.push({
          id: 'backup-delayed',
          type: 'warning',
          title: 'Backup Atrasado',
          message: `Último backup foi há ${Math.floor(hoursSinceBackup)} horas. O backup deveria rodar 2x por dia.`
        });
      }
    } else if (!systemStatus.backups.error) {
      // Nenhum backup encontrado
      alerts.push({
        id: 'backup-none',
        type: 'warning',
        title: 'Nenhum Backup Encontrado',
        message: 'Não há backups registrados. Configure o GitHub Actions para backup automático.'
      });
    }
    
    // Alerta: Erro ao buscar backups
    if (systemStatus.backups.error) {
      alerts.push({
        id: 'backup-error',
        type: 'warning',
        title: 'Erro ao Verificar Backups',
        message: systemStatus.backups.error
      });
    }
    
    // Filtra alertas descartados
    return alerts.filter(a => !dismissedAlerts.includes(a.id));
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const systemAlerts = getSystemAlerts();

  const loadData = () => {
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
  };

  const loadSystemStatus = () => {
    setStatusLoading(true);
    api.get('/master/system-status')
      .then((res) => setSystemStatus(res.data.data))
      .catch(() => toast.error('Erro ao carregar status do sistema'))
      .finally(() => setStatusLoading(false));
  };

  useEffect(() => {
    loadData();
    loadSystemStatus();
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

  // Super admin acessa o app como o primeiro tenant (ou o seu próprio)
  const handleGoToApp = async () => {
    if (tenants.length === 0) {
      toast.error('Crie uma conta primeiro pra acessar o app');
      return;
    }
    // Busca o tenant 'master' primeiro
    const myTenant = tenants.find((t) => t.slug === 'master' && t.active) || tenants.find((t) => t.active) || tenants[0];
    try {
      const res = await api.post(`/master/tenants/${myTenant.id}/impersonate`);
      const { token, tenant } = res.data.data;
      localStorage.setItem('master_token', localStorage.getItem('token') || '');
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ ...authService.getUser(), tenant_id: tenant.id, role: 'tenant_user' }));
      navigate('/dashboard');
      window.location.reload();
    } catch { toast.error('Erro ao acessar app'); }
  };

  if (loading) return <p className="loading-text">Carregando...</p>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Master Header - Cyan */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
        padding: '1rem 2rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚙️ Painel Master
              {systemAlerts.length > 0 && (
                <span style={{
                  background: systemAlerts.some(a => a.type === 'error') ? '#ef4444' : '#f59e0b',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <FiAlertTriangle style={{ fontSize: '0.65rem' }} />
                  {systemAlerts.length}
                </span>
              )}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', margin: '0.25rem 0 0 0' }}>Administração do Sistema</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" onClick={handleGoToApp} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>🚀 Meu App</button>
            <Link to="/master/tenants/novo" className="btn" style={{ background: 'white', color: '#0891b2' }}><FiPlus /> Nova Conta</Link>
            <button className="btn" onClick={handleLogout} style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>Sair</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem 2rem 2rem' }}>

      {/* Sistema de Alertas */}
      {systemAlerts.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {systemAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '8px',
                background: alert.type === 'error' 
                  ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                  : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: `1px solid ${alert.type === 'error' ? '#fca5a5' : '#fcd34d'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <FiAlertTriangle 
                style={{ 
                  color: alert.type === 'error' ? '#dc2626' : '#d97706',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                  marginTop: '2px'
                }} 
              />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 600, 
                  color: alert.type === 'error' ? '#991b1b' : '#92400e',
                  marginBottom: '0.25rem'
                }}>
                  {alert.title}
                </div>
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: alert.type === 'error' ? '#b91c1c' : '#a16207',
                  lineHeight: 1.4
                }}>
                  {alert.message}
                </div>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: alert.type === 'error' ? '#dc2626' : '#d97706',
                  opacity: 0.6
                }}
                title="Dispensar alerta"
                aria-label="Dispensar alerta"
              >
                <FiX />
              </button>
            </div>
          ))}
        </div>
      )}

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

      {/* System Status Panel */}
      <div className="detail-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>📊 Status do Sistema</h3>
          <button 
            className="btn btn-secondary" 
            onClick={loadSystemStatus}
            disabled={statusLoading}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <FiRefreshCw className={statusLoading ? 'spin' : ''} style={{ marginRight: '0.3rem' }} />
            Atualizar
          </button>
        </div>

        {systemStatus ? (
          <>
            {/* Status Cards Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              {/* Database Status */}
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: systemStatus.database.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${systemStatus.database.connected ? '#10b981' : '#ef4444'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <FiDatabase style={{ color: systemStatus.database.connected ? '#10b981' : '#ef4444' }} />
                  <strong>Banco de Dados</strong>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  {systemStatus.database.connected ? (
                    <>
                      <span style={{ color: '#10b981' }}>● Online</span>
                      <span style={{ marginLeft: '0.5rem' }}>({systemStatus.database.latency}ms)</span>
                    </>
                  ) : (
                    <span style={{ color: '#ef4444' }}>● Offline</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Neon PostgreSQL
                </div>
              </div>

              {/* Deploy Status */}
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: systemStatus.deploy.healthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${systemStatus.deploy.healthy ? '#10b981' : '#ef4444'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <FiCloud style={{ color: systemStatus.deploy.healthy ? '#10b981' : '#ef4444' }} />
                  <strong>Deploy</strong>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  {systemStatus.deploy.healthy ? (
                    <span style={{ color: '#10b981' }}>● Saudável</span>
                  ) : (
                    <span style={{ color: '#ef4444' }}>● Problemas</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Render.com
                </div>
              </div>

              {/* Backup Status */}
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: systemStatus.backups.lastBackup ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${systemStatus.backups.lastBackup ? '#3b82f6' : '#f59e0b'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <FiHardDrive style={{ color: systemStatus.backups.lastBackup ? '#3b82f6' : '#f59e0b' }} />
                  <strong>Backup</strong>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  {systemStatus.backups.lastBackup ? (
                    <>
                      <span style={{ color: '#3b82f6' }}>● {systemStatus.backups.list.length} backups</span>
                    </>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>● Nenhum backup</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  GitHub Actions (2x/dia)
                </div>
              </div>

              {/* Metrics Summary */}
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid #8b5cf6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <FiLayers style={{ color: '#8b5cf6' }} />
                  <strong>Métricas Globais</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                  <div>{systemStatus.metrics.equipments} equipamentos</div>
                  <div>{systemStatus.metrics.technicians} técnicos</div>
                </div>
              </div>
            </div>

            {/* Backup History */}
            {systemStatus.backups.list.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: '#475569' }}>
                  📦 Histórico de Backups (últimos 10)
                </h4>
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px'
                }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Arquivo</th>
                        <th>Data</th>
                        <th>Tamanho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemStatus.backups.list.map((backup, idx) => (
                        <tr key={backup.name}>
                          <td style={{ fontSize: '0.85rem' }}>
                            {idx === 0 && <span style={{ color: '#10b981', marginRight: '0.3rem' }}>✓</span>}
                            {backup.name}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            {backup.date ? formatBackupDate(backup.date) : '-'}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            {formatBytes(backup.size)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {systemStatus.backups.error && (
                  <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                    ⚠️ {systemStatus.backups.error}
                  </p>
                )}
              </div>
            )}

            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem', textAlign: 'right' }}>
              Última atualização: {new Date(systemStatus.timestamp).toLocaleString('pt-BR')}
            </p>
          </>
        ) : (
          <p style={{ color: '#64748b' }}>Carregando status...</p>
        )}
      </div>

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
    </div>
  );
}

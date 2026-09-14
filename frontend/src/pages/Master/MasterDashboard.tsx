import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiUsers, FiClipboard, FiLayers, FiDatabase, FiCloud, FiHardDrive, FiRefreshCw, FiAlertTriangle, FiX, FiActivity, FiFileText, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import './MasterDashboard.css';

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

interface AuditLog {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  performed_by: string;
  details: string;
  created_at: string;
}

interface UptimeMonitor {
  id: number;
  name: string;
  url: string;
  status: string;
  statusCode: number;
  uptime: {
    allTime: string;
    last7Days: string | null;
    last30Days: string | null;
  };
  responseTime: {
    average: number | null;
  };
  logs: Array<{
    type: string;
    datetime: string;
    duration: string | null;
  }>;
}

interface UptimeStatus {
  configured: boolean;
  monitors?: UptimeMonitor[];
  summary?: {
    total: number;
    online: number;
    offline: number;
  };
  error?: string;
  message?: string;
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
  
  // Audit Log
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState({ tenant_id: '', action: '' });
  
  // Uptime
  const [uptimeStatus, setUptimeStatus] = useState<UptimeStatus | null>(null);
  const [uptimeLoading, setUptimeLoading] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'tenants' | 'audit' | 'uptime'>('tenants');

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

  const loadAuditLogs = () => {
    setAuditLoading(true);
    const params = new URLSearchParams();
    if (auditFilter.tenant_id) params.append('tenant_id', auditFilter.tenant_id);
    if (auditFilter.action) params.append('action', auditFilter.action);
    params.append('limit', '30');
    
    api.get(`/master/audit-logs?${params.toString()}`)
      .then((res) => setAuditLogs(res.data.data.logs))
      .catch(() => toast.error('Erro ao carregar logs de auditoria'))
      .finally(() => setAuditLoading(false));
  };

  const loadUptimeStatus = () => {
    setUptimeLoading(true);
    api.get('/master/uptime-status')
      .then((res) => setUptimeStatus(res.data.data))
      .catch(() => toast.error('Erro ao carregar status do uptime'))
      .finally(() => setUptimeLoading(false));
  };

  useEffect(() => {
    loadData();
    loadSystemStatus();
    loadAuditLogs();
    loadUptimeStatus();
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
    <div className="master-dashboard">
      {/* Master Header - Cyan */}
      <div className="master-header">
        <div className="master-header-inner">
          <div>
            <h2>
              ⚙️ Painel Master
              {systemAlerts.length > 0 && (
                <span className={`master-alert-badge ${systemAlerts.some(a => a.type === 'error') ? '' : 'warning'}`}>
                  <FiAlertTriangle style={{ fontSize: '0.65rem' }} />
                  {systemAlerts.length}
                </span>
              )}
            </h2>
            <p>Administração do Sistema</p>
          </div>
          <div className="btn-group">
            <button className="btn" onClick={handleGoToApp} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>🚀 Meu App</button>
            <Link to="/master/tenants/novo" className="btn" style={{ background: 'white', color: '#0891b2' }}><FiPlus /> Nova Conta</Link>
            <button className="btn" onClick={handleLogout} style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>Sair</button>
          </div>
        </div>
      </div>

      <div className="master-content">

        {/* Sistema de Alertas */}
        {systemAlerts.length > 0 && (
          <div className="master-alerts">
            {systemAlerts.map((alert) => (
              <div key={alert.id} className={`master-alert ${alert.type}`}>
                <FiAlertTriangle className="master-alert-icon" />
                <div className="master-alert-content">
                  <div className="master-alert-title">{alert.title}</div>
                  <div className="master-alert-message">{alert.message}</div>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="master-alert-dismiss"
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
              <div className="master-status-grid">
                {/* Database Status */}
                <div className={`master-status-card ${systemStatus.database.connected ? 'online' : 'offline'}`}>
                  <div className="master-status-card-header">
                    <FiDatabase />
                    <strong>Banco de Dados</strong>
                  </div>
                  <div className="master-status-card-status">
                    {systemStatus.database.connected ? (
                      <>
                        <span className="online">● Online</span>
                        <span style={{ marginLeft: '0.5rem' }}>({systemStatus.database.latency}ms)</span>
                      </>
                    ) : (
                      <span className="offline">● Offline</span>
                    )}
                  </div>
                  <div className="master-status-card-footer">Neon PostgreSQL</div>
                </div>

                {/* Deploy Status */}
                <div className={`master-status-card ${systemStatus.deploy.healthy ? 'online' : 'offline'}`}>
                  <div className="master-status-card-header">
                    <FiCloud />
                    <strong>Deploy</strong>
                  </div>
                  <div className="master-status-card-status">
                    {systemStatus.deploy.healthy ? (
                      <span className="online">● Saudável</span>
                    ) : (
                      <span className="offline">● Problemas</span>
                    )}
                  </div>
                  <div className="master-status-card-footer">Render.com</div>
                </div>

                {/* Backup Status */}
                <div className={`master-status-card backup ${!systemStatus.backups.lastBackup ? 'no-backup' : ''}`}>
                  <div className="master-status-card-header">
                    <FiHardDrive />
                    <strong>Backup</strong>
                  </div>
                  <div className="master-status-card-status">
                    {systemStatus.backups.lastBackup ? (
                      <span className="backup">● {systemStatus.backups.list.length} backups</span>
                    ) : (
                      <span className="warning">● Nenhum backup</span>
                    )}
                  </div>
                  <div className="master-status-card-footer">GitHub Actions (2x/dia)</div>
                </div>

                {/* Metrics Summary */}
                <div className="master-status-card metrics">
                  <div className="master-status-card-header">
                    <FiLayers />
                    <strong>Métricas Globais</strong>
                  </div>
                  <div className="master-status-card-metrics">
                    <div>{systemStatus.metrics.equipments} equipamentos</div>
                    <div>{systemStatus.metrics.technicians} técnicos</div>
                  </div>
                </div>
              </div>

              {/* Backup History */}
              {systemStatus.backups.list.length > 0 && (
                <div className="master-backup-history">
                  <h4>📦 Histórico de Backups (últimos 10)</h4>
                  <div className="master-backup-table-wrapper">
                    <table className="data-table">
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
                            <td style={{ fontSize: '0.85rem' }}>
                              {backup.date ? formatBackupDate(backup.date) : '-'}
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>
                              {formatBytes(backup.size)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {systemStatus.backups.error && (
                    <p className="master-backup-warning">⚠️ {systemStatus.backups.error}</p>
                  )}
                </div>
              )}

              <p className="master-timestamp">
                Última atualização: {new Date(systemStatus.timestamp).toLocaleString('pt-BR')}
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>Carregando status...</p>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="master-tabs">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`master-tab ${activeTab === 'tenants' ? 'active' : ''}`}
          >
            <FiUsers /> Contas ({tenants.length})
          </button>
          <button
            onClick={() => { setActiveTab('audit'); loadAuditLogs(); }}
            className={`master-tab ${activeTab === 'audit' ? 'active' : ''}`}
          >
            <FiFileText /> Log de Auditoria
          </button>
          <button
            onClick={() => { setActiveTab('uptime'); loadUptimeStatus(); }}
            className={`master-tab ${activeTab === 'uptime' ? 'active' : ''}`}
          >
            <FiActivity /> Uptime
            {uptimeStatus?.configured && uptimeStatus.summary && (
              <span className={`master-tab-badge ${uptimeStatus.summary.offline > 0 ? 'danger' : 'success'}`}>
                {uptimeStatus.summary.online}/{uptimeStatus.summary.total}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="detail-card">
          {/* === TAB: TENANTS === */}
          {activeTab === 'tenants' && (
            <>
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
                        <td style={{ color: 'var(--color-text-muted)' }}>{t.slug}</td>
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
            </>
          )}

          {/* === TAB: LOG DE AUDITORIA === */}
          {activeTab === 'audit' && (
            <>
              <div className="master-audit-header">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>📝 Log de Auditoria</h3>
                <div className="master-audit-filters">
                  <select
                    value={auditFilter.tenant_id}
                    onChange={(e) => setAuditFilter(prev => ({ ...prev, tenant_id: e.target.value }))}
                  >
                    <option value="">Todos os tenants</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <select
                    value={auditFilter.action}
                    onChange={(e) => setAuditFilter(prev => ({ ...prev, action: e.target.value }))}
                  >
                    <option value="">Todas as ações</option>
                    <option value="delete_client">Excluir Cliente</option>
                    <option value="delete_equipment">Excluir Equipamento</option>
                    <option value="delete_service_order">Excluir OS</option>
                    <option value="delete_technician">Excluir Técnico</option>
                  </select>
                  <button 
                    className="btn btn-secondary" 
                    onClick={loadAuditLogs}
                    disabled={auditLoading}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    <FiFilter style={{ marginRight: '0.3rem' }} />
                    Filtrar
                  </button>
                </div>
              </div>
              
              {auditLoading ? (
                <p className="loading-text">Carregando logs...</p>
              ) : auditLogs.length === 0 ? (
                <p className="empty-text">Nenhum log de auditoria encontrado.</p>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Tenant</th>
                        <th>Ação</th>
                        <th>Descrição</th>
                        <th>Usuário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {new Date(log.created_at).toLocaleString('pt-BR', { 
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                            })}
                          </td>
                          <td>
                            <span className="badge badge-info">
                              {log.tenant_name || log.tenant_slug}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${log.action.includes('delete') ? 'badge-danger' : 'badge-secondary'}`}>
                              {log.action.replace('delete_', '🗑️ ').replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{log.description}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{log.performed_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* === TAB: UPTIME === */}
          {activeTab === 'uptime' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>📈 Monitoramento de Uptime</h3>
                <button 
                  className="btn btn-secondary" 
                  onClick={loadUptimeStatus}
                  disabled={uptimeLoading}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  <FiRefreshCw className={uptimeLoading ? 'spin' : ''} style={{ marginRight: '0.3rem' }} />
                  Atualizar
                </button>
              </div>
              
              {uptimeLoading ? (
                <p className="loading-text">Carregando status do uptime...</p>
              ) : !uptimeStatus?.configured ? (
                <div className="master-empty" style={{ background: 'rgba(245, 158, 11, 0.15)', borderRadius: '8px', padding: '2rem' }}>
                  <FiAlertTriangle style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#f59e0b' }} />
                  <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#f59e0b' }}>UptimeRobot não configurado</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {uptimeStatus?.message || 'Adicione UPTIMEROBOT_API_KEY nas variáveis de ambiente do Render.'}
                  </p>
                </div>
              ) : uptimeStatus.error ? (
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#ef4444' }}>
                  <strong>Erro:</strong> {uptimeStatus.error}
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  {uptimeStatus.summary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div className="master-status-card online" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{uptimeStatus.summary.online}</div>
                        <div style={{ fontSize: '0.8rem', color: '#10b981' }}>Online</div>
                      </div>
                      <div className="master-status-card offline" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{uptimeStatus.summary.offline}</div>
                        <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Offline</div>
                      </div>
                      <div className="master-status-card" style={{ textAlign: 'center', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>{uptimeStatus.summary.total}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total</div>
                      </div>
                    </div>
                  )}

                  {/* Monitors List */}
                  {uptimeStatus.monitors && uptimeStatus.monitors.length > 0 ? (
                    <div className="master-uptime-cards">
                      {uptimeStatus.monitors.map((monitor) => (
                        <div 
                          key={monitor.id} 
                          className={`master-uptime-card ${monitor.statusCode === 2 ? 'online' : monitor.statusCode === 9 ? 'offline' : ''}`}
                          style={{ 
                            borderLeft: `4px solid ${monitor.statusCode === 2 ? '#10b981' : monitor.statusCode === 9 ? '#ef4444' : '#f59e0b'}`
                          }}
                        >
                          <div className="master-uptime-header">
                            <div>
                              <strong>{monitor.name}</strong>
                              <div className="master-uptime-url">{monitor.url}</div>
                            </div>
                            <span className={`badge ${monitor.statusCode === 2 ? 'badge-success' : monitor.statusCode === 9 ? 'badge-danger' : 'badge-warning'}`}>
                              {monitor.statusCode === 2 ? '🟢 Online' : monitor.statusCode === 9 ? '🔴 Offline' : '🟡 ' + monitor.status}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                            <div>
                              <span style={{ color: 'var(--color-text-subtle)' }}>Uptime (total):</span>
                              <div style={{ fontWeight: 600, color: parseFloat(monitor.uptime.allTime) >= 99 ? '#10b981' : '#f59e0b' }}>
                                {monitor.uptime.allTime}%
                              </div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--color-text-subtle)' }}>Últimos 7 dias:</span>
                              <div style={{ fontWeight: 600 }}>{monitor.uptime.last7Days || '-'}%</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--color-text-subtle)' }}>Últimos 30 dias:</span>
                              <div style={{ fontWeight: 600 }}>{monitor.uptime.last30Days || '-'}%</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--color-text-subtle)' }}>Tempo resposta:</span>
                              <div style={{ fontWeight: 600 }}>{monitor.responseTime.average || '-'}ms</div>
                            </div>
                          </div>
                          {monitor.logs && monitor.logs.length > 0 && (
                            <div className="master-uptime-logs" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                              <div style={{ marginBottom: '0.25rem' }}>Últimos eventos:</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {monitor.logs.slice(0, 3).map((log, idx) => (
                                  <span 
                                    key={idx} 
                                    className={`badge ${log.type === 'down' ? 'badge-danger' : log.type === 'up' ? 'badge-success' : 'badge-secondary'}`}
                                    style={{ fontSize: '0.7rem' }}
                                  >
                                    {log.type === 'down' ? '🔴' : log.type === 'up' ? '🟢' : '⚪'} {new Date(log.datetime).toLocaleDateString('pt-BR')}
                                    {log.duration && ` (${log.duration})`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">Nenhum monitor configurado no UptimeRobot.</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClipboard, FiUsers, FiAlertCircle, FiCheckCircle, FiClock, FiFileText, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { STATUSES } from '../../services/serviceOrders.service';

interface DashboardData {
  statuses: Record<string, number>;
  revenue_month: number;
  orders_month: number;
  recent_orders: Array<{
    id: string;
    order_number: number;
    status: string;
    entry_date: string;
    client_name: string;
    equipment_type: string;
    equipment_brand: string;
  }>;
  total_clients: number;
  tech_ranking: Array<{ name: string; count: number }>;
  alerts?: {
    old_orders: number;
    abandoned_equipment: number;
  };
}

function getStatusLabel(status: string) {
  const s = STATUSES.find((s) => s.value === status);
  // Retorna COM emoji para usar em badges
  return s ? `${s.emoji} ${s.label}` : status;
}

function getStatusColor(status: string) {
  return STATUSES.find((s) => s.value === status)?.color || '#6b7280';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => setData(res.data.data))
      .catch(() => toast.error('Erro ao carregar dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading-text">Carregando...</p>;
  if (!data) return null;

  const totalOpen = (data.statuses.aberta || 0) + (data.statuses.aprovada || 0) + (data.statuses.aguardando_peca || 0);

  const handleMonthlyReport = async () => {
    const token = localStorage.getItem('token');
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : `${window.location.protocol}//${window.location.host}`;
    
    const url = `${baseUrl}/api/v1/reports/monthly?month=${reportMonth}&year=${reportYear}`;
    
    try {
      toast.loading('Gerando relatório...', { id: 'report' });
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erro ao gerar relatório');
      
      const blob = await response.blob();
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const file = new File([blob], `Relatorio-${monthNames[reportMonth-1]}-${reportYear}.pdf`, { type: 'application/pdf' });
      
      toast.dismiss('report');
      setShowReportModal(false);
      
      // No celular: tentar compartilhar
      if (/Android|iPhone|iPad/i.test(navigator.userAgent) && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Relatório Mensal', files: [file] });
      } else {
        // Desktop: abrir em nova aba
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      }
    } catch {
      toast.dismiss('report');
      toast.error('Erro ao gerar relatório');
    }
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Dashboard</h2>
        <button
          onClick={() => setShowReportModal(true)}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FiFileText /> Relatório Mensal
        </button>
      </div>

      {/* Alertas discretos (só aparece se tiver) */}
      {data.alerts && (data.alerts.old_orders > 0 || data.alerts.abandoned_equipment > 0) && (
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          {data.alerts.old_orders > 0 && (
            <div 
              onClick={() => navigate('/os?filter=old')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#92400e',
                cursor: 'pointer'
              }}
              title="Clique para ver lista de OS antigas"
            >
              <span>⏰</span>
              <span><strong>{data.alerts.old_orders}</strong> OS {data.alerts.old_orders === 1 ? 'parada' : 'paradas'} há mais de 30 dias</span>
            </div>
          )}
          {data.alerts.abandoned_equipment > 0 && (
            <div 
              onClick={() => navigate('/os?filter=abandoned')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#991b1b',
                cursor: 'pointer'
              }}
              title="Equipamentos que podem ser descartados (Lei 180 dias)"
            >
              <span>⚠️</span>
              <span><strong>{data.alerts.abandoned_equipment}</strong> {data.alerts.abandoned_equipment === 1 ? 'equipamento' : 'equipamentos'} há mais de 180 dias</span>
            </div>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="dashboard-cards">
        <div className="dash-card dash-card-blue" onClick={() => navigate('/os?status=aberta')}>
          <div className="dash-card-icon"><FiAlertCircle /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.statuses.aberta || 0}</span>
            <span className="dash-card-label">📋 Abertas</span>
          </div>
        </div>
        <div className="dash-card dash-card-yellow" onClick={() => navigate('/os?status=aprovada')}>
          <div className="dash-card-icon"><FiCheckCircle /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.statuses.aprovada || 0}</span>
            <span className="dash-card-label">📞 Avisadas</span>
          </div>
        </div>
        <div className="dash-card dash-card-purple" onClick={() => navigate('/os?status=aguardando_peca')}>
          <div className="dash-card-icon"><FiClock /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.statuses.aguardando_peca || 0}</span>
            <span className="dash-card-label">⏳ Aguardando Peça</span>
          </div>
        </div>
        <div className="dash-card dash-card-green" onClick={() => navigate('/os?status=concluida')}>
          <div className="dash-card-icon"><FiCheckCircle /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.statuses.concluida || 0}</span>
            <span className="dash-card-label">✅ Concluídas</span>
          </div>
        </div>
        <div className="dash-card dash-card-gray" onClick={() => navigate('/os?status=entregue')}>
          <div className="dash-card-icon"><FiClipboard /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.statuses.entregue || 0}</span>
            <span className="dash-card-label">📦 Entregues</span>
          </div>
        </div>
        <div className="dash-card dash-card-dark">
          <div className="dash-card-icon"><FiUsers /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.total_clients}</span>
            <span className="dash-card-label">👥 Clientes</span>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* OS em aberto */}
        <div className="detail-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#334155' }}>
            <FiClipboard style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Em andamento ({totalOpen})
          </h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {STATUSES.filter(s => ['aberta', 'aprovada', 'aguardando_peca'].includes(s.value)).map((s) => (
              <div key={s.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <span>{s.emoji}</span>
                {s.label}: <strong>{data.statuses[s.value] || 0}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking de Técnicos */}
        <div className="detail-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#334155' }}>
            🏆 Ranking de Técnicos
          </h3>
          {data.tech_ranking.length === 0 ? (
            <p className="empty-text">Sem dados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.tech_ranking.map((tech, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const maxCount = data.tech_ranking[0]?.count || 1;
                const pct = (tech.count / maxCount) * 100;
                return (
                  <div key={tech.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ width: 24, textAlign: 'center' }}>{medal}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontWeight: 500 }}>{tech.name}</span>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>{tech.count} OS</span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7c2f' : '#3b82f6', borderRadius: 3 }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimas OS */}
        <div className="detail-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#334155' }}>
            Últimas OS
          </h3>
          {data.recent_orders.length === 0 ? (
            <p className="empty-text">Nenhuma OS recente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.recent_orders.map((order) => (
                <div
                  key={order.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => navigate(`/os/${order.id}`)}
                >
                  <div>
                    <strong>#{String(order.order_number).padStart(4, '0')}</strong>{' '}
                    <span style={{ color: '#64748b' }}>{order.client_name}</span>
                  </div>
                  <span
                    className="badge"
                    style={{ background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status) }}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Relatório Mensal */}
      {showReportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setShowReportModal(false)}
        >
          <div
            style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '320px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              border: '1px solid #334155'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f1f5f9' }}>
              <FiCalendar /> Relatório Mensal
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Selecione o período do relatório:
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Mês</label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(parseInt(e.target.value))}
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem', 
                    borderRadius: '6px', 
                    border: '1px solid #475569', 
                    background: '#334155', 
                    color: '#f1f5f9',
                    cursor: 'pointer'
                  }}
                >
                  {monthNames.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', display: 'block' }}>Ano</label>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(parseInt(e.target.value))}
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem', 
                    borderRadius: '6px', 
                    border: '1px solid #475569', 
                    background: '#334155', 
                    color: '#f1f5f9',
                    cursor: 'pointer'
                  }}
                >
                  {[2024, 2025, 2026, 2027].map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowReportModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#334155',
                  color: '#f1f5f9',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleMonthlyReport}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <FiFileText /> Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

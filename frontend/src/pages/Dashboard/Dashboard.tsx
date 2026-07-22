import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClipboard, FiUsers, FiAlertCircle, FiCheckCircle, FiClock } from 'react-icons/fi';
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
}

function getStatusLabel(status: string) {
  return STATUSES.find((s) => s.value === status)?.label || status;
}

function getStatusColor(status: string) {
  return STATUSES.find((s) => s.value === status)?.color || '#6b7280';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => setData(res.data.data))
      .catch(() => toast.error('Erro ao carregar dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading-text">Carregando...</p>;
  if (!data) return null;

  const totalOpen = (data.statuses.aberta || 0) + (data.statuses.aprovada || 0) + (data.statuses.aguardando_peca || 0);

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Dashboard</h2>

      {/* Cards */}
      <div className="dashboard-cards">
        <div className="dash-card dash-card-blue" onClick={() => navigate('/os?status=aberta')}>
          <div className="dash-card-icon"><FiAlertCircle /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.statuses.aberta || 0}</span>
            <span className="dash-card-label">Abertas</span>
          </div>
        </div>
        <div className="dash-card dash-card-yellow" onClick={() => navigate('/os?status=aprovada')}>
          <div className="dash-card-icon"><FiCheckCircle /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.statuses.aprovada || 0}</span>
            <span className="dash-card-label">Aprovadas</span>
          </div>
        </div>
        <div className="dash-card dash-card-purple" onClick={() => navigate('/os?status=aguardando_peca')}>
          <div className="dash-card-icon"><FiClock /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.statuses.aguardando_peca || 0}</span>
            <span className="dash-card-label">Aguardando Peça</span>
          </div>
        </div>
        <div className="dash-card dash-card-green" onClick={() => navigate('/os?status=concluida')}>
          <div className="dash-card-icon"><FiCheckCircle /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.statuses.concluida || 0}</span>
            <span className="dash-card-label">Concluídas</span>
          </div>
        </div>
        <div className="dash-card dash-card-gray" onClick={() => navigate('/os?status=entregue')}>
          <div className="dash-card-icon"><FiClipboard /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.statuses.entregue || 0}</span>
            <span className="dash-card-label">Entregues</span>
          </div>
        </div>
        <div className="dash-card dash-card-dark">
          <div className="dash-card-icon"><FiUsers /></div>
          <div className="dash-card-content">
            <span className="dash-card-value">{data.total_clients}</span>
            <span className="dash-card-label">Clientes</span>
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
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }}></span>
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
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiPackage, FiCalendar, FiAlertTriangle, FiDollarSign, FiCheckCircle,
  FiPlus, FiList, FiGrid, FiSearch, FiPhone, FiClock, FiArrowRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { 
  alugueisService, patrimonioService, 
  Aluguel, Patrimonio, AluguelStats,
  STATUS_ALUGUEL, formatAluguelNumero 
} from '../../services/alugueis.service';
import PageHeader from '../../components/PageHeader';
import './AlugueisPage.css';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function getDiasRestantes(dataStr: string): number {
  const data = new Date(dataStr);
  const hoje = new Date();
  const diff = data.getTime() - hoje.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AlugueisPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'ativos' | 'historico' | 'patrimonio'>('ativos');
  const [stats, setStats] = useState<AluguelStats | null>(null);
  const [alugueis, setAlugueis] = useState<Aluguel[]>([]);
  const [patrimonio, setPatrimonio] = useState<Patrimonio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, alugueisRes, patrimonioRes] = await Promise.all([
        alugueisService.getStats(),
        alugueisService.list(),
        patrimonioService.list()
      ]);
      setStats(statsRes.data);
      setAlugueis(alugueisRes.data);
      setPatrimonio(patrimonioRes.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Módulo Aluguéis não habilitado');
      } else {
        toast.error('Erro ao carregar dados');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Filtra aluguéis por aba
  const alugueisAtivos = alugueis.filter(a => a.status === 'ativo' || a.status === 'atrasado');
  const alugueisHistorico = alugueis.filter(a => a.status === 'devolvido' || a.status === 'cancelado');

  // Filtra patrimônio por busca
  const patrimonioFiltrado = patrimonio.filter(p => {
    const matchSearch = !search || 
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleWhatsApp = (phone: string, nome: string, patrimonioNome: string) => {
    const phoneClean = phone?.replace(/\D/g, '');
    if (!phoneClean) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    const msg = `Olá ${nome}! Passando para lembrar sobre a devolução do equipamento *${patrimonioNome}*. Podemos agendar?`;
    window.open(`https://wa.me/55${phoneClean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <p className="loading-text">Carregando aluguéis...</p>;

  return (
    <div className="alugueis-page">
      <PageHeader title="Aluguéis">
        <Link to="/alugueis/patrimonio/novo" className="btn btn-secondary">
          <FiPackage /> Novo Patrimônio
        </Link>
        <Link to="/alugueis/novo" className="btn btn-primary">
          <FiPlus /> Novo Aluguel
        </Link>
      </PageHeader>

      {/* Cards de resumo */}
      {stats && (
        <div className="dashboard-cards">
          <div className="dash-card dash-card-blue">
            <div className="dash-card-icon"><FiPackage /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.alugados}</span>
              <span className="dash-card-label">Alugados Agora</span>
            </div>
          </div>
          <div className="dash-card" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            <div className="dash-card-icon"><FiDollarSign /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{formatCurrency(stats.receitaMes)}</span>
              <span className="dash-card-label">Receita do Mês</span>
            </div>
          </div>
          <div className="dash-card">
            <div className="dash-card-icon"><FiCalendar /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.devolucoesSemana}</span>
              <span className="dash-card-label">Devoluções na Semana</span>
            </div>
          </div>
          <div className="dash-card" style={stats.atrasados > 0 ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)' } : {}}>
            <div className="dash-card-icon"><FiAlertTriangle /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.atrasados}</span>
              <span className="dash-card-label">Atrasados</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${tab === 'ativos' ? 'active' : ''}`}
          onClick={() => setTab('ativos')}
        >
          <FiClock /> Ativos ({alugueisAtivos.length})
        </button>
        <button 
          className={`tab-btn ${tab === 'historico' ? 'active' : ''}`}
          onClick={() => setTab('historico')}
        >
          <FiCheckCircle /> Histórico ({alugueisHistorico.length})
        </button>
        <button 
          className={`tab-btn ${tab === 'patrimonio' ? 'active' : ''}`}
          onClick={() => setTab('patrimonio')}
        >
          <FiGrid /> Patrimônio ({patrimonio.length})
        </button>
      </div>

      {/* Conteúdo das abas */}
      {tab === 'ativos' && (
        <div className="alugueis-list">
          {alugueisAtivos.length === 0 ? (
            <div className="empty-state">
              <FiPackage size={48} />
              <h3>Nenhum aluguel ativo</h3>
              <p>Crie um novo aluguel para começar</p>
              <Link to="/alugueis/novo" className="btn btn-primary">
                <FiPlus /> Novo Aluguel
              </Link>
            </div>
          ) : (
            alugueisAtivos.map((aluguel) => {
              const diasRestantes = getDiasRestantes(aluguel.data_prevista_devolucao);
              const isAtrasado = aluguel.status === 'atrasado' || diasRestantes < 0;
              const statusInfo = STATUS_ALUGUEL.find(s => s.value === aluguel.status);
              
              return (
                <div 
                  key={aluguel.id} 
                  className={`aluguel-card ${isAtrasado ? 'atrasado' : ''}`}
                  onClick={() => navigate(`/alugueis/${aluguel.id}`)}
                >
                  <div className="aluguel-card-header">
                    <span className="aluguel-numero">#{formatAluguelNumero(aluguel.numero)}</span>
                    <span 
                      className="aluguel-status"
                      style={{ background: statusInfo?.color }}
                    >
                      {statusInfo?.emoji} {statusInfo?.label}
                    </span>
                  </div>
                  
                  <div className="aluguel-card-body">
                    <div className="aluguel-patrimonio">
                      <FiPackage />
                      <strong>{aluguel.patrimonio_nome}</strong>
                      <span className="patrimonio-codigo">({aluguel.patrimonio_codigo})</span>
                    </div>
                    
                    <div className="aluguel-cliente">
                      <span>{aluguel.client_name}</span>
                      {aluguel.client_phone && (
                        <button 
                          className="btn-icon-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsApp(aluguel.client_phone!, aluguel.client_name!, aluguel.patrimonio_nome!);
                          }}
                          title="Enviar WhatsApp"
                        >
                          <FiPhone />
                        </button>
                      )}
                    </div>
                    
                    <div className="aluguel-datas">
                      <span><FiCalendar /> {formatDate(aluguel.data_inicio)} → {formatDate(aluguel.data_prevista_devolucao)}</span>
                    </div>
                    
                    <div className="aluguel-footer">
                      <span className={`dias-restantes ${diasRestantes < 0 ? 'atrasado' : diasRestantes <= 3 ? 'urgente' : ''}`}>
                        {diasRestantes < 0 
                          ? `${Math.abs(diasRestantes)} dias atrasado` 
                          : diasRestantes === 0 
                            ? 'Devolução hoje!'
                            : `${diasRestantes} dias restantes`
                        }
                      </span>
                      <span className="aluguel-valor">{formatCurrency(aluguel.valor_acordado)}</span>
                    </div>
                  </div>
                  
                  <div className="aluguel-card-actions">
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/alugueis/${aluguel.id}/devolver`);
                      }}
                    >
                      <FiCheckCircle /> Devolver
                    </button>
                    <FiArrowRight className="arrow-icon" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'historico' && (
        <div className="alugueis-list">
          {alugueisHistorico.length === 0 ? (
            <div className="empty-state">
              <FiList size={48} />
              <h3>Nenhum histórico</h3>
              <p>Os aluguéis devolvidos aparecerão aqui</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Equipamento</th>
                    <th>Cliente</th>
                    <th>Período</th>
                    <th>Status</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {alugueisHistorico.map((aluguel) => {
                    const statusInfo = STATUS_ALUGUEL.find(s => s.value === aluguel.status);
                    return (
                      <tr 
                        key={aluguel.id} 
                        onClick={() => navigate(`/alugueis/${aluguel.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td><strong>#{formatAluguelNumero(aluguel.numero)}</strong></td>
                        <td>{aluguel.patrimonio_nome}</td>
                        <td>{aluguel.client_name}</td>
                        <td>
                          {formatDate(aluguel.data_inicio)} → {aluguel.data_devolucao ? formatDate(aluguel.data_devolucao) : '-'}
                        </td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ background: statusInfo?.color, color: 'white' }}
                          >
                            {statusInfo?.emoji} {statusInfo?.label}
                          </span>
                        </td>
                        <td className="text-right">
                          <strong>{formatCurrency(aluguel.valor_final || aluguel.valor_acordado)}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'patrimonio' && (
        <>
          {/* Filtros */}
          <div className="filters-row">
            <div className="search-box">
              <FiSearch />
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="disponivel">✅ Disponível</option>
              <option value="alugado">📦 Alugado</option>
              <option value="manutencao">🔧 Em Manutenção</option>
              <option value="inativo">⏸️ Inativo</option>
            </select>
          </div>

          <div className="patrimonio-grid">
            {patrimonioFiltrado.length === 0 ? (
              <div className="empty-state">
                <FiPackage size={48} />
                <h3>Nenhum equipamento encontrado</h3>
                <p>Cadastre seus equipamentos para alugar</p>
                <Link to="/alugueis/patrimonio/novo" className="btn btn-primary">
                  <FiPlus /> Novo Patrimônio
                </Link>
              </div>
            ) : (
              patrimonioFiltrado.map((item) => {
                const statusColors: Record<string, string> = {
                  disponivel: '#22c55e',
                  alugado: '#3b82f6',
                  manutencao: '#f59e0b',
                  inativo: '#6b7280'
                };
                const statusLabels: Record<string, string> = {
                  disponivel: '✅ Disponível',
                  alugado: '📦 Alugado',
                  manutencao: '🔧 Manutenção',
                  inativo: '⏸️ Inativo'
                };
                
                return (
                  <div 
                    key={item.id} 
                    className="patrimonio-card"
                    onClick={() => navigate(`/alugueis/patrimonio/${item.id}/editar`)}
                  >
                    <div className="patrimonio-card-header">
                      <span className="patrimonio-codigo">{item.codigo}</span>
                      <span 
                        className="patrimonio-status"
                        style={{ background: statusColors[item.status] }}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </div>
                    
                    {item.foto_url ? (
                      <img src={item.foto_url} alt={item.nome} className="patrimonio-foto" />
                    ) : (
                      <div className="patrimonio-foto-placeholder">
                        <FiPackage size={32} />
                      </div>
                    )}
                    
                    <div className="patrimonio-info">
                      <h4>{item.nome}</h4>
                      {item.marca && <span className="patrimonio-marca">{item.marca} {item.modelo}</span>}
                      <div className="patrimonio-valores">
                        {item.valor_diaria && <span>Diária: {formatCurrency(item.valor_diaria)}</span>}
                        {item.valor_mensal && <span>Mensal: {formatCurrency(item.valor_mensal)}</span>}
                      </div>
                    </div>
                    
                    {item.status === 'disponivel' && (
                      <button 
                        className="btn btn-sm btn-primary patrimonio-alugar-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/alugueis/novo?patrimonio=${item.id}`);
                        }}
                      >
                        Alugar
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

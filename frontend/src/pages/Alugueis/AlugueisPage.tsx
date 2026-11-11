import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiPackage, FiCalendar, FiAlertTriangle, FiDollarSign, FiCheckCircle,
  FiPlus, FiList, FiGrid, FiSearch, FiPhone, FiClock, FiArrowRight,
  FiFileText, FiTrendingUp
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { 
  alugueisService, patrimonioService, 
  Aluguel, Patrimonio, AluguelStats,
  STATUS_ALUGUEL, STATUS_PATRIMONIO, formatAluguelNumero 
} from '../../services/alugueis.service';
import PageHeader from '../../components/PageHeader';
import './AlugueisPage.css';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function getDiasRestantes(dataStr: string): number {
  const data = new Date(dataStr);
  data.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = data.getTime() - hoje.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDiasLabel(dias: number): string {
  if (dias < 0) return `${Math.abs(dias)} dias atrasado`;
  if (dias === 0) return 'Devolução hoje!';
  if (dias === 1) return 'Amanhã';
  return `${dias} dias restantes`;
}

function getEquipamentoIcon(categoria?: string): string {
  const icons: Record<string, string> = {
    'gerador': '⚡',
    'compressor': '🔩',
    'solda': '🔧',
    'furadeira': '🔨',
    'ferramenta': '🛠️',
  };
  const cat = (categoria || '').toLowerCase();
  for (const [key, icon] of Object.entries(icons)) {
    if (cat.includes(key)) return icon;
  }
  return '📦';
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

  // Ordena ativos: atrasados primeiro, depois por data de devolução
  const alugueisAtivosOrdenados = [...alugueisAtivos].sort((a, b) => {
    const diasA = getDiasRestantes(a.data_prevista_devolucao);
    const diasB = getDiasRestantes(b.data_prevista_devolucao);
    return diasA - diasB;
  });

  // Próximas devoluções (para timeline)
  const proximasDevolucoes = alugueisAtivosOrdenados.slice(0, 5);

  // Filtra patrimônio por busca
  const patrimonioFiltrado = patrimonio.filter(p => {
    const matchSearch = !search || 
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Busca aluguel ativo de um patrimônio
  const getAluguelAtivo = (patrimonioId: string) => {
    return alugueis.find(a => 
      a.patrimonio_id === patrimonioId && 
      (a.status === 'ativo' || a.status === 'atrasado')
    );
  };

  const handleWhatsApp = (e: React.MouseEvent, phone: string, nome: string, patrimonioNome: string) => {
    e.stopPropagation();
    const phoneClean = phone?.replace(/\D/g, '');
    if (!phoneClean) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    const msg = `Olá ${nome}! Passando para lembrar sobre a devolução do equipamento *${patrimonioNome}*. Podemos agendar?`;
    window.open(`https://wa.me/55${phoneClean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDevolver = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/alugueis/${id}?action=devolver`);
  };

  const handleReceber = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/alugueis/${id}?action=receber`);
  };

  const handleFatura = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/alugueis/${id}?action=fatura`);
  };

  if (loading) return <p className="loading-text">Carregando aluguéis...</p>;

  return (
    <div className="alugueis-page">
      <PageHeader title="Aluguéis">
        <Link to="/alugueis/patrimonio/novo" className="btn btn-secondary">
          <FiPackage /> <span className="hide-mobile">Novo</span> Patrimônio
        </Link>
        <Link to="/alugueis/novo" className="btn btn-primary">
          <FiPlus /> <span className="hide-mobile">Novo</span> Aluguel
        </Link>
      </PageHeader>

      {/* Cards de resumo */}
      {stats && (
        <div className="dashboard-cards">
          <div className="dash-card dash-card-blue">
            <div className="dash-card-icon"><FiPackage /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.alugados}</span>
              <span className="dash-card-label">Alugados</span>
            </div>
          </div>
          
          <div className="dash-card" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            <div className="dash-card-icon"><FiDollarSign /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{formatCurrency(stats.valorAtivos).replace('R$', '').trim()}</span>
              <span className="dash-card-label">Em Aberto</span>
            </div>
          </div>
          
          <div className="dash-card" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="dash-card-icon"><FiCalendar /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.devolucoesSemana}</span>
              <span className="dash-card-label">Dev. Semana</span>
            </div>
          </div>
          
          <div className="dash-card" style={stats.atrasados > 0 ? { background: 'linear-gradient(135deg, #ef4444, #dc2626)' } : { background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
            <div className="dash-card-icon"><FiAlertTriangle /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{stats.atrasados}</span>
              <span className="dash-card-label">Atrasados</span>
            </div>
          </div>
          
          <div className="dash-card dash-card-dark">
            <div className="dash-card-icon" style={{ color: '#22c55e' }}><FiTrendingUp /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{formatCurrency(stats.receitaMes).replace('R$', '').trim()}</span>
              <span className="dash-card-label">Receita/Mês</span>
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

      {/* ==================== ABA ATIVOS ==================== */}
      {tab === 'ativos' && (
        <>
          {/* Timeline de próximas devoluções */}
          {proximasDevolucoes.length > 0 && (
            <div className="timeline-section">
              <div className="timeline-title">
                <FiCalendar /> Próximas Devoluções
              </div>
              <div className="timeline-scroll">
                {proximasDevolucoes.map((aluguel) => {
                  const dias = getDiasRestantes(aluguel.data_prevista_devolucao);
                  let className = 'timeline-item ';
                  if (dias < 0) className += 'atrasado';
                  else if (dias === 0) className += 'hoje';
                  else if (dias <= 7) className += 'semana';
                  else className += 'futuro';
                  
                  return (
                    <div 
                      key={aluguel.id} 
                      className={className}
                      onClick={() => navigate(`/alugueis/${aluguel.id}`)}
                    >
                      <span>{dias < 0 ? 'ATRASADO' : dias === 0 ? 'HOJE' : formatDate(aluguel.data_prevista_devolucao)}</span>
                      <span>#{formatAluguelNumero(aluguel.numero)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="alugueis-list">
            {alugueisAtivosOrdenados.length === 0 ? (
              <div className="empty-state">
                <FiPackage size={48} />
                <h3>Nenhum aluguel ativo</h3>
                <p>Crie um novo aluguel para começar</p>
                <Link to="/alugueis/novo" className="btn btn-primary">
                  <FiPlus /> Novo Aluguel
                </Link>
              </div>
            ) : (
              alugueisAtivosOrdenados.map((aluguel) => {
                const dias = getDiasRestantes(aluguel.data_prevista_devolucao);
                const isAtrasado = dias < 0;
                const isUrgente = dias >= 0 && dias <= 3;
                const statusInfo = STATUS_ALUGUEL.find(s => s.value === (isAtrasado ? 'atrasado' : aluguel.status));
                
                let cardClass = 'aluguel-card ';
                if (isAtrasado) cardClass += 'status-atrasado';
                else if (isUrgente) cardClass += 'status-urgente';
                else cardClass += 'status-ativo';
                
                return (
                  <div 
                    key={aluguel.id} 
                    className={cardClass}
                    onClick={() => navigate(`/alugueis/${aluguel.id}`)}
                  >
                    {/* Header */}
                    <div className="aluguel-card-header">
                      <div className="aluguel-header-left">
                        <span className="aluguel-numero">#{formatAluguelNumero(aluguel.numero)}</span>
                        <span className={`aluguel-dias ${isAtrasado ? 'atrasado' : isUrgente ? 'urgente' : 'ok'}`}>
                          • {getDiasLabel(dias)}
                        </span>
                      </div>
                      <span 
                        className="aluguel-status"
                        style={{ background: isAtrasado ? '#ef4444' : statusInfo?.color }}
                      >
                        {isAtrasado ? '⚠️' : statusInfo?.emoji} {isAtrasado ? 'Atrasado' : statusInfo?.label}
                      </span>
                    </div>
                    
                    {/* Body */}
                    <div className="aluguel-card-body">
                      {/* Equipamento */}
                      <div className="aluguel-equipamento">
                        <div className="equipamento-icon">
                          {aluguel.patrimonio_foto ? (
                            <img src={aluguel.patrimonio_foto} alt="" />
                          ) : (
                            getEquipamentoIcon(aluguel.patrimonio_nome)
                          )}
                        </div>
                        <div className="equipamento-info">
                          <div className="equipamento-nome">{aluguel.patrimonio_nome}</div>
                          <div className="equipamento-codigo">{aluguel.patrimonio_codigo}</div>
                        </div>
                      </div>
                      
                      {/* Cliente */}
                      <div className="aluguel-cliente">
                        <div className="cliente-info">
                          <span>👤 {aluguel.client_name}</span>
                        </div>
                        {aluguel.client_phone && (
                          <button 
                            className="btn-whatsapp"
                            onClick={(e) => handleWhatsApp(e, aluguel.client_phone!, aluguel.client_name!, aluguel.patrimonio_nome!)}
                            title="Enviar WhatsApp"
                          >
                            <FiPhone size={14} />
                          </button>
                        )}
                      </div>
                      
                      {/* Datas e Valor */}
                      <div className="aluguel-footer-info">
                        <div className="aluguel-datas">
                          <FiCalendar size={14} />
                          {formatDate(aluguel.data_inicio)} → {formatDate(aluguel.data_prevista_devolucao)}
                        </div>
                        <div className="aluguel-valor">{formatCurrency(aluguel.valor_acordado)}</div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="aluguel-card-actions">
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={(e) => handleDevolver(e, aluguel.id)}
                      >
                        <FiCheckCircle /> Devolver
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => handleReceber(e, aluguel.id)}
                      >
                        <FiDollarSign /> Receber
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => handleFatura(e, aluguel.id)}
                      >
                        <FiFileText /> Fatura
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Legenda */}
          {alugueisAtivos.length > 0 && (
            <div className="legenda-section">
              <div className="legenda-item">
                <div className="legenda-dot atrasado"></div>
                <span>Atrasado</span>
              </div>
              <div className="legenda-item">
                <div className="legenda-dot urgente"></div>
                <span>Vence em 3 dias</span>
              </div>
              <div className="legenda-item">
                <div className="legenda-dot ativo"></div>
                <span>Ativo</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== ABA HISTÓRICO ==================== */}
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

      {/* ==================== ABA PATRIMÔNIO ==================== */}
      {tab === 'patrimonio' && (
        <>
          {/* Filtros */}
          <div className="filters-row">
            <div className="search-box">
              <FiSearch />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="disponivel">✅ Disponível</option>
              <option value="alugado">📦 Alugado</option>
              <option value="manutencao">🔧 Manutenção</option>
              <option value="inativo">⏸️ Inativo</option>
            </select>
          </div>

          <div className="patrimonio-grid">
            {patrimonioFiltrado.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <FiPackage size={48} />
                <h3>Nenhum equipamento encontrado</h3>
                <p>Cadastre seus equipamentos para alugar</p>
                <Link to="/alugueis/patrimonio/novo" className="btn btn-primary">
                  <FiPlus /> Novo Patrimônio
                </Link>
              </div>
            ) : (
              patrimonioFiltrado.map((item) => {
                const statusInfo = STATUS_PATRIMONIO.find(s => s.value === item.status);
                const aluguelAtivo = item.status === 'alugado' ? getAluguelAtivo(item.id) : null;
                
                return (
                  <div 
                    key={item.id} 
                    className={`patrimonio-card status-${item.status}`}
                    onClick={() => navigate(`/alugueis/patrimonio/${item.id}/editar`)}
                  >
                    {/* Foto */}
                    <div className="patrimonio-foto-container">
                      {item.foto_url ? (
                        <img src={item.foto_url} alt={item.nome} className="patrimonio-foto" />
                      ) : (
                        <div className="patrimonio-foto-placeholder">
                          {getEquipamentoIcon(item.categoria || item.nome)}
                        </div>
                      )}
                      <span 
                        className="patrimonio-status-badge"
                        style={{ background: statusInfo?.color }}
                      >
                        {statusInfo?.label}
                      </span>
                    </div>
                    
                    {/* Info */}
                    <div className="patrimonio-info">
                      <div className="patrimonio-codigo">{item.codigo}</div>
                      <div className="patrimonio-nome">{item.nome}</div>
                      {item.marca && (
                        <div className="patrimonio-marca">{item.marca} {item.modelo}</div>
                      )}
                      <div className="patrimonio-valores">
                        {item.valor_diaria && <span>Diária: {formatCurrency(item.valor_diaria)}</span>}
                        {item.valor_mensal && <span>Mensal: {formatCurrency(item.valor_mensal)}</span>}
                      </div>
                    </div>
                    
                    {/* Se alugado, mostra quem está usando */}
                    {item.status === 'alugado' && aluguelAtivo && (
                      <div className="patrimonio-em-uso">
                        <div className="patrimonio-em-uso-label">👤 Em uso por:</div>
                        <div className="patrimonio-em-uso-info">
                          {aluguelAtivo.client_name} • Dev: {formatDate(aluguelAtivo.data_prevista_devolucao)}
                        </div>
                      </div>
                    )}
                    
                    {/* Se em manutenção */}
                    {item.status === 'manutencao' && (
                      <div className="patrimonio-manutencao">
                        <div className="patrimonio-manutencao-label">🔧 Em manutenção</div>
                      </div>
                    )}
                    
                    {/* Botão alugar se disponível */}
                    {item.status === 'disponivel' && (
                      <div className="patrimonio-action">
                        <button 
                          className="btn btn-primary btn-sm patrimonio-alugar-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/alugueis/novo?patrimonio=${item.id}`);
                          }}
                        >
                          <FiPlus /> Alugar
                        </button>
                      </div>
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

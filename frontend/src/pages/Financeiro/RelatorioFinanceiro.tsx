import { useEffect, useState, useRef } from 'react';
import { FiDownload, FiTrendingUp, FiTrendingDown, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { financeiroService } from '../../services/financeiro.service';
import PageHeader from '../../components/PageHeader';

interface ResumoData {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  receitasRecebidas: number;
  receitasPendentes: number;
  despesasPagas: number;
  despesasPendentes: number;
}

interface ComparativoData {
  variacaoReceitas: number;
  variacaoDespesas: number;
  variacaoSaldo: number;
}

interface DailyData {
  date: string;
  entradas: number;
  saidas: number;
}

interface LancamentoData {
  id: string;
  date: string;
  type: 'receita' | 'despesa';
  description: string;
  status: string;
  amount: number;
}

interface RelatorioData {
  periodo: { startDate: string; endDate: string };
  resumo: ResumoData;
  comparativo: ComparativoData;
  graficoDiario: DailyData[];
  lancamentos: LancamentoData[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDateFull(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDayName(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
}

function getWeekNumber(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  const oneJan = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
}

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function getSaturday(monday: Date) {
  const sat = new Date(monday);
  sat.setDate(sat.getDate() + 5);
  return sat;
}

export default function RelatorioFinanceiro() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RelatorioData | null>(null);
  const [viewMode, setViewMode] = useState<'semanal' | 'mensal'>('semanal');
  
  // Para semanal: data de início da semana (segunda)
  const today = new Date();
  const defaultMonday = getMonday(today);
  const [startDate, setStartDate] = useState(defaultMonday.toISOString().split('T')[0]);
  
  // Para mensal
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const reportRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      let start: string, end: string;
      
      if (viewMode === 'semanal') {
        const monday = new Date(startDate + 'T12:00:00');
        const saturday = getSaturday(monday);
        start = monday.toISOString().split('T')[0];
        end = saturday.toISOString().split('T')[0];
      } else {
        start = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0);
        end = lastDay.toISOString().split('T')[0];
      }
      
      const response = await financeiroService.getRelatorio({ startDate: start, endDate: end });
      setData(response.data);
    } catch {
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [viewMode, startDate, month, year]);

  const handleExportPDF = () => {
    window.print();
  };

  const maxValue = data ? Math.max(
    ...data.graficoDiario.map(d => Math.max(d.entradas, d.saidas)),
    1
  ) : 1;

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="relatorio-page">
      <PageHeader title="Relatório Financeiro">
        <button className="btn btn-primary" onClick={handleExportPDF}>
          <FiDownload /> Exportar PDF
        </button>
      </PageHeader>

      {/* Seletor de período */}
      <div className="filters-row" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${viewMode === 'semanal' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('semanal')}
          >
            Semanal
          </button>
          <button 
            className={`btn ${viewMode === 'mensal' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('mensal')}
          >
            Mensal
          </button>
        </div>

        {viewMode === 'semanal' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Início da semana:</label>
            <input 
              type="date" 
              className="filter-select"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="filter-select" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="filter-select" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="loading-text">Carregando relatório...</p>
      ) : !data ? (
        <p className="empty-text">Nenhum dado encontrado.</p>
      ) : (
        <div className="report-content" ref={reportRef}>
          {/* Info do período */}
          <div className="report-period-info" style={{ 
            background: 'var(--color-card)', 
            padding: '1rem 1.5rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Período: </span>
              <strong style={{ color: '#fff' }}>
                {formatDateFull(data.periodo.startDate)} a {formatDateFull(data.periodo.endDate)}
              </strong>
              {viewMode === 'semanal' && (
                <span style={{ color: '#a1a1aa', marginLeft: '1rem', fontSize: '0.875rem' }}>
                  (Semana {getWeekNumber(data.periodo.startDate)})
                </span>
              )}
            </div>
          </div>

          {/* Cards resumo */}
          <div className="dashboard-cards" style={{ marginBottom: '1.5rem' }}>
            <div className="dash-card dash-card-green">
              <div className="dash-card-icon"><FiTrendingUp /></div>
              <div className="dash-card-content">
                <span className="dash-card-value">{formatCurrency(data.resumo.totalReceitas)}</span>
                <span className="dash-card-label">Entradas</span>
                {data.comparativo.variacaoReceitas !== 0 && (
                  <span style={{ fontSize: '0.75rem', color: data.comparativo.variacaoReceitas > 0 ? '#10b981' : '#ef4444' }}>
                    {data.comparativo.variacaoReceitas > 0 ? '↑' : '↓'} {Math.abs(data.comparativo.variacaoReceitas)}% vs anterior
                  </span>
                )}
              </div>
            </div>
            <div className="dash-card dash-card-yellow">
              <div className="dash-card-icon"><FiTrendingDown /></div>
              <div className="dash-card-content">
                <span className="dash-card-value">{formatCurrency(data.resumo.totalDespesas)}</span>
                <span className="dash-card-label">Saídas</span>
                {data.comparativo.variacaoDespesas !== 0 && (
                  <span style={{ fontSize: '0.75rem', color: data.comparativo.variacaoDespesas < 0 ? '#10b981' : '#ef4444' }}>
                    {data.comparativo.variacaoDespesas > 0 ? '↑' : '↓'} {Math.abs(data.comparativo.variacaoDespesas)}% vs anterior
                  </span>
                )}
              </div>
            </div>
            <div className="dash-card dash-card-blue">
              <div className="dash-card-icon"><FiDollarSign /></div>
              <div className="dash-card-content">
                <span className="dash-card-value">{formatCurrency(data.resumo.saldo)}</span>
                <span className="dash-card-label">Saldo do Período</span>
                {data.comparativo.variacaoSaldo !== 0 && (
                  <span style={{ fontSize: '0.75rem', color: data.comparativo.variacaoSaldo > 0 ? '#10b981' : '#ef4444' }}>
                    {data.comparativo.variacaoSaldo > 0 ? '↑' : '↓'} {Math.abs(data.comparativo.variacaoSaldo)}% vs anterior
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Gráfico de barras */}
          <div style={{ 
            background: 'var(--color-card)', 
            borderRadius: '12px', 
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Movimentação Diária</h3>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }}></span>
                  Entradas
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px' }}></span>
                  Saídas
                </span>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              alignItems: 'flex-end', 
              height: '180px',
              padding: '0 10px',
              borderBottom: '1px solid var(--color-border)'
            }}>
              {data.graficoDiario.map((day, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '150px' }}>
                    <div 
                      style={{ 
                        width: '20px', 
                        height: `${Math.max((day.entradas / maxValue) * 140, 4)}px`,
                        background: '#10b981',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s'
                      }}
                      title={`Entradas: ${formatCurrency(day.entradas)}`}
                    />
                    <div 
                      style={{ 
                        width: '20px', 
                        height: `${Math.max((day.saidas / maxValue) * 140, 4)}px`,
                        background: '#ef4444',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s'
                      }}
                      title={`Saídas: ${formatCurrency(day.saidas)}`}
                    />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                    {getDayName(day.date)} {formatDate(day.date).split('/')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de lançamentos */}
          <div style={{ 
            background: 'var(--color-card)', 
            borderRadius: '12px', 
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Lançamentos do Período</h3>
            
            {data.lancamentos.length === 0 ? (
              <p style={{ color: '#71717a', textAlign: 'center', padding: '2rem' }}>Nenhum lançamento no período.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lancamentos.slice(0, 20).map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(typeof item.date === 'string' ? item.date.split('T')[0] : item.date)}</td>
                      <td>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: item.type === 'receita' ? '#d1fae5' : '#fee2e2',
                          color: item.type === 'receita' ? '#065f46' : '#991b1b'
                        }}>
                          {item.type === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td>{item.description}</td>
                      <td>
                        <span className={`badge ${item.status === 'pendente' ? 'badge-danger' : 'badge-success'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ 
                        textAlign: 'right', 
                        fontWeight: 600,
                        color: item.type === 'receita' ? '#10b981' : '#ef4444'
                      }}>
                        {item.type === 'receita' ? '+' : '-'} {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                  {data.lancamentos.length > 20 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#71717a', fontStyle: 'italic' }}>
                        ... mais {data.lancamentos.length - 20} lançamentos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Resumo final */}
          <div style={{ 
            background: 'var(--color-card)', 
            borderRadius: '12px', 
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Resumo Financeiro</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: '#a1a1aa' }}>Receitas recebidas</span>
                <strong style={{ color: '#10b981' }}>+ {formatCurrency(data.resumo.receitasRecebidas)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: '#a1a1aa' }}>Receitas pendentes</span>
                <strong style={{ color: '#f59e0b' }}>{formatCurrency(data.resumo.receitasPendentes)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: '#a1a1aa' }}>Despesas pagas</span>
                <strong style={{ color: '#ef4444' }}>- {formatCurrency(data.resumo.despesasPagas)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: '#a1a1aa' }}>Despesas pendentes</span>
                <strong style={{ color: '#f59e0b' }}>{formatCurrency(data.resumo.despesasPendentes)}</strong>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '1rem',
                marginTop: '0.5rem',
                background: 'var(--color-bg)',
                borderRadius: '8px'
              }}>
                <span style={{ fontWeight: 600 }}>Resultado do Período</span>
                <strong style={{ 
                  fontSize: '1.25rem',
                  color: data.resumo.saldo >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {data.resumo.saldo >= 0 ? '+' : ''} {formatCurrency(data.resumo.saldo)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estilos para impressão */}
      <style>{`
        @media print {
          body { background: white !important; }
          .relatorio-page { padding: 0 !important; }
          .filters-row, .btn, button { display: none !important; }
          .report-content { 
            background: white !important;
            color: black !important;
          }
          .dash-card, .report-period-info, [style*="background: var(--color-card)"] {
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            color: black !important;
          }
          .dash-card-value, .dash-card-label, h3, th, td, span, strong {
            color: black !important;
          }
          .dash-card-value { color: #1e40af !important; }
          .data-table th { background: #f1f5f9 !important; }
        }
      `}</style>
    </div>
  );
}

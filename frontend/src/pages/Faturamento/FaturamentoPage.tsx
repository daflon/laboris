import { useEffect, useState } from 'react';
import { FiDollarSign, FiFileText, FiTrendingUp, FiUsers, FiDownload, FiBarChart2, FiPackage } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { faturamentoService, FaturamentoResumo, GraficoItem, TecnicoFaturamento, ItemFaturado } from '../../services/faturamento.service';
import PageHeader from '../../components/PageHeader';
import './FaturamentoPage.css';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatItemNumber(item: ItemFaturado): string {
  const num = String(item.numero).padStart(4, '0');
  if (item.tipo === 'aluguel') {
    return `AL#${num}`;
  }
  return item.lote_sufixo ? `OS#${num}-${item.lote_sufixo}` : `OS#${num}`;
}

export default function FaturamentoPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [resumo, setResumo] = useState<FaturamentoResumo | null>(null);
  const [grafico, setGrafico] = useState<GraficoItem[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoFaturamento[]>([]);
  const [lista, setLista] = useState<ItemFaturado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resumoRes, graficoRes, tecnicosRes, listaRes] = await Promise.all([
        faturamentoService.getResumo({ month, year }),
        faturamentoService.getGrafico(6),
        faturamentoService.getPorTecnico({ month, year }),
        faturamentoService.getLista({ month, year }),
      ]);
      setResumo(resumoRes.data);
      setGrafico(graficoRes.data);
      setTecnicos(tecnicosRes.data);
      setLista(listaRes.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Módulo Faturamento não habilitado');
      } else {
        toast.error('Erro ao carregar faturamento');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [month, year]);

  const handleDownloadPdf = (tipo: 'compacto' | 'grafico' | 'completo') => {
    const url = faturamentoService.getPdfUrl({ month, year, tipo });
    window.open(url, '_blank');
    setShowPdfModal(false);
  };

  const maxGrafico = Math.max(...grafico.map(g => g.total), 1);
  const medals = ['🥇', '🥈', '🥉'];

  if (loading) return <p className="loading-text">Carregando faturamento...</p>;

  return (
    <div className="faturamento-page">
      <PageHeader title="Faturamento">
        <button className="btn btn-primary" onClick={() => setShowPdfModal(true)} aria-label="Gerar relatório PDF">
          <FiDownload /> Gerar PDF
        </button>
      </PageHeader>

      {/* Filtro de período */}
      <div className="filters-row">
        <select 
          className="filter-select" 
          value={month} 
          onChange={(e) => setMonth(parseInt(e.target.value))}
          aria-label="Selecionar mês"
        >
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select 
          className="filter-select" 
          value={year} 
          onChange={(e) => setYear(parseInt(e.target.value))}
          aria-label="Selecionar ano"
        >
          {[2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Cards de resumo */}
      {resumo && (
        <div className="dashboard-cards">
          <div className="dash-card dash-card-blue" style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)' }}>
            <div className="dash-card-icon"><FiDollarSign /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{formatCurrency(resumo.total_faturado)}</span>
              <span className="dash-card-label">Total Faturado</span>
            </div>
          </div>
          <div className="dash-card">
            <div className="dash-card-icon"><FiFileText /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{resumo.qtd_os}</span>
              <span className="dash-card-label">OS Concluídas</span>
            </div>
          </div>
          <div className="dash-card" style={{ borderLeft: '3px solid #7c3aed' }}>
            <div className="dash-card-icon" style={{ color: '#7c3aed' }}><FiPackage /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{resumo.qtd_alugueis || 0}</span>
              <span className="dash-card-label">Aluguéis Pagos</span>
            </div>
          </div>
          <div className="dash-card">
            <div className="dash-card-icon"><FiUsers /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{resumo.clientes_atendidos}</span>
              <span className="dash-card-label">Clientes</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid com Gráfico e Técnicos */}
      <div className="faturamento-grid">
        {/* Gráfico de evolução */}
        <div className="faturamento-section">
          <h3 className="section-title"><FiBarChart2 /> Evolução (6 meses)</h3>
          <div className="chart-container">
            {grafico.map((item, idx) => (
              <div key={idx} className="chart-bar-row">
                <span className="chart-label">{item.label}</span>
                <div className="chart-bar-bg">
                  <div 
                    className="chart-bar" 
                    style={{ width: `${(item.total / maxGrafico) * 100}%` }}
                  >
                    {item.total > 0 && (
                      <span className="chart-bar-value">{formatCurrency(item.total)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por técnico */}
        <div className="faturamento-section">
          <h3 className="section-title">👷 Por Técnico</h3>
          {tecnicos.length === 0 ? (
            <p className="empty-text">Nenhum técnico com faturamento no período</p>
          ) : (
            <div className="tech-list">
              {tecnicos.map((tech, idx) => (
                <div key={tech.id} className="tech-row">
                  <span className="tech-medal">{idx < 3 ? medals[idx] : ''}</span>
                  <span className="tech-name">{tech.name}</span>
                  <span className="tech-os">{tech.qtd_os} OS</span>
                  <span className="tech-value">{formatCurrency(tech.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Faturamento (OS + Aluguéis) */}
      <div className="faturamento-section faturamento-lista">
        <h3 className="section-title"><FiFileText /> Faturamento do Período</h3>
        {lista.length === 0 ? (
          <p className="empty-text">Nenhum faturamento em {MONTHS[month - 1]} {year}</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th className="hide-mobile">Descrição</th>
                  <th>Status</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((item) => (
                  <tr key={`${item.tipo}-${item.id}`}>
                    <td>
                      {item.tipo === 'aluguel' ? (
                        <Link 
                          to={`/alugueis/${item.aluguel_id}`} 
                          style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}
                          title="Ver aluguel"
                        >
                          <FiPackage style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {formatItemNumber(item)}
                        </Link>
                      ) : (
                        <strong>{formatItemNumber(item)}</strong>
                      )}
                    </td>
                    <td>{item.data ? new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}</td>
                    <td>{item.client_name}</td>
                    <td className="hide-mobile">{item.descricao}</td>
                    <td>
                      {item.tipo === 'aluguel' ? (
                        <span className="status-badge" style={{ background: '#7c3aed', color: '#fff' }}>
                          Pago
                        </span>
                      ) : (
                        <span className={`status-badge status-${item.status}`}>
                          {item.status === 'concluida' ? 'Concluída' : 'Entregue'}
                        </span>
                      )}
                    </td>
                    <td className="text-right"><strong>{formatCurrency(item.total)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={5}><strong>TOTAL</strong></td>
                  <td className="text-right"><strong>{formatCurrency(lista.reduce((sum, o) => sum + o.total, 0))}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal de PDF */}
      {showPdfModal && (
        <div className="modal-overlay" onClick={() => setShowPdfModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3>Gerar Relatório PDF</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Selecione o formato do relatório de {MONTHS[month - 1]} {year}:
            </p>
            
            <div className="pdf-options">
              <button className="pdf-option" onClick={() => handleDownloadPdf('compacto')}>
                <div className="pdf-option-icon">📄</div>
                <div className="pdf-option-info">
                  <strong>Compacto</strong>
                  <span>Resumo + lista de OS e Aluguéis</span>
                </div>
              </button>
              
              <button className="pdf-option" onClick={() => handleDownloadPdf('grafico')}>
                <div className="pdf-option-icon">📊</div>
                <div className="pdf-option-info">
                  <strong>Com Gráfico</strong>
                  <span>Resumo + evolução 6 meses + lista</span>
                </div>
              </button>
              
              <button className="pdf-option" onClick={() => handleDownloadPdf('completo')}>
                <div className="pdf-option-icon">📑</div>
                <div className="pdf-option-info">
                  <strong>Completo</strong>
                  <span>Tudo: resumo, gráfico, técnicos, lista</span>
                </div>
              </button>
            </div>
            
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowPdfModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

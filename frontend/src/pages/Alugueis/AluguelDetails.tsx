import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiCheckCircle, FiXCircle, FiPhone, FiPackage, FiUser, 
  FiCalendar, FiDollarSign, FiAlertTriangle, FiEdit2, FiFileText, FiPrinter
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { 
  alugueisService, Aluguel, 
  STATUS_ALUGUEL, FORMAS_PAGAMENTO, formatAluguelNumero 
} from '../../services/alugueis.service';
import PageHeader from '../../components/PageHeader';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR');
}

export default function AluguelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [aluguel, setAluguel] = useState<Aluguel | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [showFaturaModal, setShowFaturaModal] = useState(false);
  const [faturaData, setFaturaData] = useState<any>(null);
  const [gerandoFatura, setGerandoFatura] = useState(false);

  // Form de devolução
  const [devolucaoForm, setDevolucaoForm] = useState({
    data_devolucao: new Date().toISOString().split('T')[0],
    condicao_devolucao: '',
    equipamento_danificado: false,
    valor_final: '',
    observacoes: ''
  });

  // Form de pagamento
  const [pagamentoForm, setPagamentoForm] = useState({
    valor: '',
    data_pagamento: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix',
    observacoes: ''
  });

  // Form de cancelamento
  const [cancelarMotivo, setCancelarMotivo] = useState('');

  useEffect(() => {
    loadAluguel();
  }, [id]);

  const loadAluguel = async () => {
    try {
      setLoading(true);
      const response = await alugueisService.getById(id!);
      setAluguel(response.data);
      // Preenche valor final sugerido
      setDevolucaoForm(prev => ({
        ...prev,
        valor_final: String(response.data.valor_acordado)
      }));
      setPagamentoForm(prev => ({
        ...prev,
        valor: String(response.data.valor_acordado)
      }));
    } catch {
      toast.error('Erro ao carregar aluguel');
      navigate('/alugueis');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!aluguel?.client_phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    const phone = aluguel.client_phone.replace(/\D/g, '');
    const msg = `Olá ${aluguel.client_name}! Passando para lembrar sobre a devolução do equipamento *${aluguel.patrimonio_nome}* (Aluguel #${formatAluguelNumero(aluguel.numero)}). Podemos agendar?`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDevolver = async () => {
    try {
      await alugueisService.devolver(id!, {
        ...devolucaoForm,
        valor_final: parseFloat(devolucaoForm.valor_final) || aluguel!.valor_acordado
      });
      toast.success('Devolução registrada!');
      setShowDevolverModal(false);
      loadAluguel();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao registrar devolução');
    }
  };

  const handlePagamento = async () => {
    try {
      await alugueisService.registrarPagamento(id!, {
        ...pagamentoForm,
        valor: parseFloat(pagamentoForm.valor)
      });
      toast.success('Pagamento registrado!');
      setShowPagamentoModal(false);
      setPagamentoForm({
        valor: '',
        data_pagamento: new Date().toISOString().split('T')[0],
        forma_pagamento: 'pix',
        observacoes: ''
      });
      loadAluguel();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao registrar pagamento');
    }
  };

  const handleEstornarPagamento = async (pagamentoId: string, valor: number) => {
    if (!confirm(`Deseja estornar este pagamento de ${formatCurrency(valor)}?\n\nEsta ação também removerá o lançamento correspondente do Financeiro.`)) {
      return;
    }
    
    try {
      await alugueisService.estornarPagamento(id!, pagamentoId);
      toast.success('Pagamento estornado!');
      loadAluguel();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao estornar pagamento');
    }
  };

  const handleCancelar = async () => {
    try {
      await alugueisService.cancelar(id!, cancelarMotivo);
      toast.success('Aluguel cancelado!');
      setShowCancelarModal(false);
      loadAluguel();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao cancelar');
    }
  };

  const handleGerarFatura = async () => {
    try {
      setGerandoFatura(true);
      const response = await alugueisService.gerarFatura(id!);
      setFaturaData(response.data);
      setShowFaturaModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao gerar fatura');
    } finally {
      setGerandoFatura(false);
    }
  };

  const handleImprimirFatura = () => {
    if (!faturaData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup bloqueado. Permita popups para imprimir.');
      return;
    }

    // Template da fatura (meia folha - renderizado 2x)
    const renderFatura = () => `
      <div class="fatura">
        <div class="fatura-header">
          <div class="fatura-title">
            <span class="fatura-label">Fatura - Aluguel #002</span>
            <h1>FATURA DE ALUGUEL</h1>
            <span class="fatura-numero">Nº ${formatAluguelNumero(faturaData.aluguel_numero)}</span>
          </div>
          <div class="fatura-data">
            <span>Data de Emissão: ${new Date(faturaData.data_emissao).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div class="fatura-body">
          <div class="fatura-section">
            <h3>CLIENTE</h3>
            <div class="fatura-grid">
              <div><span class="label">Nome:</span> ${faturaData.cliente.nome}</div>
              ${faturaData.cliente.documento ? `<div><span class="label">CPF/CNPJ:</span> ${faturaData.cliente.documento}</div>` : ''}
              ${faturaData.cliente.telefone ? `<div><span class="label">Telefone:</span> ${faturaData.cliente.telefone}</div>` : ''}
            </div>
          </div>

          <div class="fatura-section">
            <h3>EQUIPAMENTO</h3>
            <div class="fatura-grid">
              <div><span class="label">Código:</span> ${faturaData.equipamento.codigo}</div>
              <div><span class="label">Descrição:</span> ${faturaData.equipamento.nome}${faturaData.equipamento.marca ? ' - ' + faturaData.equipamento.marca : ''}${faturaData.equipamento.modelo ? ' ' + faturaData.equipamento.modelo : ''}</div>
            </div>
          </div>

          <div class="fatura-section">
            <h3>PERÍODO DO ALUGUEL</h3>
            <div class="fatura-grid two-cols">
              <div><span class="label">Início:</span> ${new Date(faturaData.periodo.inicio).toLocaleDateString('pt-BR')}</div>
              <div><span class="label">Término:</span> ${new Date(faturaData.periodo.fim).toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          <div class="fatura-section">
            <h3>ITENS</h3>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th class="center" style="width: 40px;">Qtd</th>
                  <th class="right" style="width: 70px;">Valor Unit.</th>
                  <th class="right" style="width: 70px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${faturaData.itens.map((item: any) => `
                  <tr>
                    <td>${item.descricao}</td>
                    <td class="center">${item.quantidade}</td>
                    <td class="right">R$ ${item.valor_unitario.toFixed(2)}</td>
                    <td class="right">R$ ${item.valor_total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="fatura-total">
            <span>TOTAL:</span>
            <strong>R$ ${faturaData.valores.valor_fatura.toFixed(2)}</strong>
          </div>
        </div>

        <div class="fatura-footer">
          <p>Documento gerado pelo OS Laboris</p>
        </div>
      </div>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fatura - Aluguel #${formatAluguelNumero(faturaData.aluguel_numero)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          @page {
            size: A4;
            margin: 0;
          }
          
          body { 
            font-family: Arial, sans-serif; 
            font-size: 9px;
            line-height: 1.3;
          }
          
          .page {
            width: 210mm;
            height: 297mm;
            display: flex;
            flex-direction: column;
          }
          
          .fatura {
            height: 148.5mm;
            padding: 8mm 12mm;
            display: flex;
            flex-direction: column;
            position: relative;
          }
          
          .fatura:first-child {
            border-bottom: 1px dashed #999;
          }
          
          .fatura-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #333;
            padding-bottom: 4mm;
            margin-bottom: 3mm;
          }
          
          .fatura-title h1 {
            font-size: 14px;
            margin: 2px 0;
          }
          
          .fatura-label {
            font-size: 7px;
            color: #666;
          }
          
          .fatura-numero {
            font-size: 11px;
            color: #7c3aed;
            font-weight: bold;
          }
          
          .fatura-data {
            text-align: right;
            font-size: 8px;
            color: #666;
          }
          
          .fatura-body {
            flex: 1;
          }
          
          .fatura-section {
            margin-bottom: 3mm;
          }
          
          .fatura-section h3 {
            font-size: 8px;
            background: #f0f0f0;
            padding: 2px 5px;
            margin-bottom: 2mm;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .fatura-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1mm;
            padding: 0 2mm;
          }
          
          .fatura-grid.two-cols {
            grid-template-columns: 1fr 1fr;
          }
          
          .fatura-grid .label {
            color: #666;
            font-size: 7px;
            margin-right: 3px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 3px 5px;
            text-align: left;
          }
          
          th {
            background: #f0f0f0;
            font-size: 7px;
            font-weight: 600;
          }
          
          .center { text-align: center; }
          .right { text-align: right; }
          
          .fatura-total {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 10px;
            margin-top: 3mm;
            padding: 3mm;
            background: #e8f5e9;
            font-size: 11px;
          }
          
          .fatura-total strong {
            color: #22c55e;
            font-size: 13px;
          }
          
          .fatura-footer {
            text-align: center;
            font-size: 7px;
            color: #888;
            margin-top: 2mm;
            padding-top: 2mm;
            border-top: 1px solid #eee;
          }
          
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${renderFatura()}
          ${renderFatura()}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  if (loading) return <p className="loading-text">Carregando...</p>;
  if (!aluguel) return <p>Aluguel não encontrado</p>;

  const statusInfo = STATUS_ALUGUEL.find(s => s.value === aluguel.status);
  const isAtivo = aluguel.status === 'ativo' || aluguel.status === 'atrasado';
  const totalPago = aluguel.pagamentos?.reduce((sum, p) => sum + p.valor, 0) || 0;
  const valorFinal = aluguel.valor_final || aluguel.valor_acordado;
  const saldoDevedor = valorFinal - totalPago;

  return (
    <div>
      <PageHeader title={`Aluguel #${formatAluguelNumero(aluguel.numero)}`}>
        <button className="btn btn-secondary" onClick={() => navigate('/alugueis')}>
          <FiArrowLeft /> Voltar
        </button>
        <button 
          className="btn" 
          onClick={handleGerarFatura}
          disabled={gerandoFatura}
          style={{ background: '#7c3aed', color: 'white' }}
        >
          <FiFileText /> {gerandoFatura ? 'Gerando...' : 'Gerar Fatura'}
        </button>
        {isAtivo && (
          <>
            <button className="btn btn-success" onClick={() => setShowDevolverModal(true)}>
              <FiCheckCircle /> Devolver
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => setShowCancelarModal(true)}
              style={{ background: '#dc2626' }}
            >
              <FiXCircle /> Cancelar
            </button>
          </>
        )}
      </PageHeader>

      {/* Status Banner */}
      <div style={{
        background: statusInfo?.color,
        color: 'white',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 600 }}>{statusInfo?.emoji} {statusInfo?.label}</span>
        {aluguel.equipamento_danificado && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiAlertTriangle /> Equipamento retornou danificado
          </span>
        )}
      </div>

      <div className="detail-card">
        {/* Equipamento */}
        <section className="detail-section">
          <h3><FiPackage /> Equipamento</h3>
          <div className="detail-grid">
            <div>
              <label>Código</label>
              <span>{aluguel.patrimonio_codigo}</span>
            </div>
            <div>
              <label>Nome</label>
              <span>{aluguel.patrimonio_nome}</span>
            </div>
          </div>
          {aluguel.patrimonio_foto && (
            <img 
              src={aluguel.patrimonio_foto} 
              alt={aluguel.patrimonio_nome}
              style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', marginTop: '1rem' }}
            />
          )}
        </section>

        {/* Cliente */}
        <section className="detail-section">
          <h3><FiUser /> Cliente</h3>
          <div className="detail-grid">
            <div>
              <label>Nome</label>
              <span>{aluguel.client_name}</span>
            </div>
            <div>
              <label>Telefone</label>
              <span>
                {aluguel.client_phone || '-'}
                {aluguel.client_phone && (
                  <button 
                    onClick={handleWhatsApp}
                    style={{
                      marginLeft: '0.5rem',
                      background: '#25d366',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.25rem 0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    <FiPhone size={12} /> WhatsApp
                  </button>
                )}
              </span>
            </div>
          </div>
        </section>

        {/* Período */}
        <section className="detail-section">
          <h3><FiCalendar /> Período</h3>
          <div className="detail-grid">
            <div>
              <label>Data de Início</label>
              <span>{formatDate(aluguel.data_inicio)}</span>
            </div>
            <div>
              <label>Previsão de Devolução</label>
              <span>{formatDate(aluguel.data_prevista_devolucao)}</span>
            </div>
            {aluguel.data_devolucao && (
              <div>
                <label>Data de Devolução</label>
                <span>{formatDate(aluguel.data_devolucao)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Financeiro */}
        <section className="detail-section">
          <h3><FiDollarSign /> Financeiro</h3>
          <div className="detail-grid">
            <div>
              <label>Valor Acordado</label>
              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                {formatCurrency(aluguel.valor_acordado)}
              </span>
            </div>
            {aluguel.valor_final && aluguel.valor_final !== aluguel.valor_acordado && (
              <div>
                <label>Valor Final</label>
                <span style={{ fontWeight: 600 }}>{formatCurrency(aluguel.valor_final)}</span>
              </div>
            )}
            <div>
              <label>Total Pago</label>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>{formatCurrency(totalPago)}</span>
            </div>
            {saldoDevedor > 0 && (
              <div>
                <label>Saldo Devedor</label>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>{formatCurrency(saldoDevedor)}</span>
              </div>
            )}
          </div>

          {isAtivo && saldoDevedor > 0 && (
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1rem' }}
              onClick={() => setShowPagamentoModal(true)}
            >
              <FiDollarSign /> Registrar Pagamento
            </button>
          )}

          {/* Lista de pagamentos */}
          {aluguel.pagamentos && aluguel.pagamentos.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Pagamentos</h4>
              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th>Data</th>
                    <th>Forma</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {aluguel.pagamentos.map(pag => (
                    <tr key={pag.id}>
                      <td>{formatDate(pag.data_pagamento)}</td>
                      <td>{FORMAS_PAGAMENTO.find(f => f.value === pag.forma_pagamento)?.label || pag.forma_pagamento}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(pag.valor)}</td>
                      <td>
                        <button
                          onClick={() => handleEstornarPagamento(pag.id, pag.valor)}
                          title="Estornar pagamento"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <FiXCircle size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Condições */}
        {(aluguel.condicao_saida || aluguel.condicao_devolucao) && (
          <section className="detail-section">
            <h3><FiEdit2 /> Condições</h3>
            {aluguel.condicao_saida && (
              <div style={{ marginBottom: '1rem' }}>
                <label>Condição na Saída</label>
                <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>{aluguel.condicao_saida}</p>
              </div>
            )}
            {aluguel.condicao_devolucao && (
              <div>
                <label>Condição na Devolução</label>
                <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>{aluguel.condicao_devolucao}</p>
              </div>
            )}
          </section>
        )}

        {/* Observações */}
        {aluguel.observacoes && (
          <section className="detail-section">
            <h3>Observações</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{aluguel.observacoes}</p>
          </section>
        )}
      </div>

      {/* Modal Devolver */}
      {showDevolverModal && (
        <div className="modal-overlay" onClick={() => setShowDevolverModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3><FiCheckCircle /> Registrar Devolução</h3>
            
            <div className="form-group">
              <label>Data da Devolução</label>
              <input
                type="date"
                value={devolucaoForm.data_devolucao}
                onChange={e => setDevolucaoForm(prev => ({ ...prev, data_devolucao: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Valor Final (R$)</label>
              <input
                type="number"
                value={devolucaoForm.valor_final}
                onChange={e => setDevolucaoForm(prev => ({ ...prev, valor_final: e.target.value }))}
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Condição do Equipamento</label>
              <textarea
                value={devolucaoForm.condicao_devolucao}
                onChange={e => setDevolucaoForm(prev => ({ ...prev, condicao_devolucao: e.target.value }))}
                rows={2}
                placeholder="Descreva as condições do equipamento..."
              />
            </div>

            {/* Checkbox de equipamento danificado com estilo melhorado */}
            <label 
              htmlFor="equipamento_danificado"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: devolucaoForm.equipamento_danificado ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                border: `2px solid ${devolucaoForm.equipamento_danificado ? '#ef4444' : 'var(--border-color)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '1rem',
                transition: 'all 0.2s'
              }}
            >
              <input
                type="checkbox"
                id="equipamento_danificado"
                checked={devolucaoForm.equipamento_danificado}
                onChange={e => setDevolucaoForm(prev => ({ ...prev, equipamento_danificado: e.target.checked }))}
                style={{ 
                  width: '20px', 
                  height: '20px',
                  accentColor: '#ef4444',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiAlertTriangle style={{ color: '#ef4444', fontSize: '1.1rem' }} />
                <span style={{ fontWeight: 500, color: devolucaoForm.equipamento_danificado ? '#ef4444' : 'var(--text-primary)' }}>
                  Equipamento retornou danificado
                </span>
              </div>
            </label>
            {devolucaoForm.equipamento_danificado && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#f59e0b', 
                marginTop: '-0.5rem', 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <FiAlertTriangle size={12} />
                O equipamento será enviado para manutenção após a devolução
              </p>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDevolverModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-success" onClick={handleDevolver}>
                <FiCheckCircle /> Confirmar Devolução
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagamento */}
      {showPagamentoModal && (
        <div className="modal-overlay" onClick={() => setShowPagamentoModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3><FiDollarSign /> Registrar Pagamento</h3>
            
            <div className="form-group">
              <label>Valor (R$)</label>
              <input
                type="number"
                value={pagamentoForm.valor}
                onChange={e => setPagamentoForm(prev => ({ ...prev, valor: e.target.value }))}
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Data do Pagamento</label>
              <input
                type="date"
                value={pagamentoForm.data_pagamento}
                onChange={e => setPagamentoForm(prev => ({ ...prev, data_pagamento: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Forma de Pagamento</label>
              <select
                value={pagamentoForm.forma_pagamento}
                onChange={e => setPagamentoForm(prev => ({ ...prev, forma_pagamento: e.target.value }))}
              >
                {FORMAS_PAGAMENTO.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPagamentoModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handlePagamento}>
                <FiDollarSign /> Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar */}
      {showCancelarModal && (
        <div className="modal-overlay" onClick={() => setShowCancelarModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ color: '#ef4444' }}><FiXCircle /> Cancelar Aluguel</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Esta ação irá cancelar o aluguel e liberar o equipamento.
            </p>
            
            <div className="form-group">
              <label>Motivo do Cancelamento</label>
              <textarea
                value={cancelarMotivo}
                onChange={e => setCancelarMotivo(e.target.value)}
                rows={3}
                placeholder="Descreva o motivo..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCancelarModal(false)}>
                Voltar
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleCancelar}
                style={{ background: '#dc2626' }}
              >
                <FiXCircle /> Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fatura */}
      {showFaturaModal && faturaData && (
        <div className="modal-overlay" onClick={() => setShowFaturaModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h3 style={{ color: '#7c3aed' }}><FiFileText /> Fatura do Aluguel</h3>
            
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div><strong>Aluguel:</strong> #{formatAluguelNumero(faturaData.aluguel_numero)}</div>
                <div><strong>Emissão:</strong> {new Date(faturaData.data_emissao).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Cliente</h4>
              <p style={{ margin: 0 }}><strong>{faturaData.cliente.nome}</strong></p>
              {faturaData.cliente.documento && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{faturaData.cliente.documento}</p>}
              {faturaData.cliente.telefone && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{faturaData.cliente.telefone}</p>}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Equipamento</h4>
              <p style={{ margin: 0 }}><strong>[{faturaData.equipamento.codigo}]</strong> {faturaData.equipamento.nome}</p>
              {(faturaData.equipamento.marca || faturaData.equipamento.modelo) && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {faturaData.equipamento.marca} {faturaData.equipamento.modelo}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Período</h4>
              <p style={{ margin: 0 }}>
                {new Date(faturaData.periodo.inicio).toLocaleDateString('pt-BR')} → {new Date(faturaData.periodo.fim).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div style={{ 
              background: '#f0fdf4', 
              border: '1px solid #22c55e', 
              borderRadius: '8px', 
              padding: '1rem', 
              marginBottom: '1rem' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Valor Acordado:</span>
                <span>{formatCurrency(faturaData.valores.valor_acordado)}</span>
              </div>
              {faturaData.valores.total_pago > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#22c55e' }}>
                    <span>Total Pago:</span>
                    <span>- {formatCurrency(faturaData.valores.total_pago)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #22c55e', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span><strong>Saldo Pendente:</strong></span>
                    <span style={{ color: '#ef4444' }}><strong>{formatCurrency(faturaData.valores.saldo_pendente)}</strong></span>
                  </div>
                </>
              )}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '1.2rem', 
                fontWeight: 'bold',
                borderTop: '2px solid #22c55e',
                paddingTop: '0.75rem',
                marginTop: '0.75rem'
              }}>
                <span>TOTAL DA FATURA:</span>
                <span style={{ color: '#22c55e' }}>{formatCurrency(faturaData.valores.valor_fatura)}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowFaturaModal(false)}>
                Fechar
              </button>
              <button 
                className="btn" 
                onClick={handleImprimirFatura}
                style={{ background: '#7c3aed', color: 'white' }}
              >
                <FiPrinter /> Imprimir Fatura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

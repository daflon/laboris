import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiCheckCircle, FiXCircle, FiPhone, FiPackage, FiUser, 
  FiCalendar, FiDollarSign, FiAlertTriangle, FiEdit2
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

          {isAtivo && (
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
                  </tr>
                </thead>
                <tbody>
                  {aluguel.pagamentos.map(pag => (
                    <tr key={pag.id}>
                      <td>{formatDate(pag.data_pagamento)}</td>
                      <td>{FORMAS_PAGAMENTO.find(f => f.value === pag.forma_pagamento)?.label || pag.forma_pagamento}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(pag.valor)}</td>
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

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="equipamento_danificado"
                checked={devolucaoForm.equipamento_danificado}
                onChange={e => setDevolucaoForm(prev => ({ ...prev, equipamento_danificado: e.target.checked }))}
              />
              <label htmlFor="equipamento_danificado" style={{ margin: 0, cursor: 'pointer' }}>
                <FiAlertTriangle style={{ color: '#ef4444', marginRight: '0.25rem' }} />
                Equipamento retornou danificado
              </label>
            </div>

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
    </div>
  );
}

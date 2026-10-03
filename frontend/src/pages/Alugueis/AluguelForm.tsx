import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSave, FiArrowLeft, FiPackage, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { alugueisService, patrimonioService, Patrimonio, TIPOS_COBRANCA } from '../../services/alugueis.service';
import { clientsService, Client } from '../../services/clients.service';
import PageHeader from '../../components/PageHeader';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export default function AluguelForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedPatrimonio = searchParams.get('patrimonio');

  const [saving, setSaving] = useState(false);
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([]);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [selectedPatrimonio, setSelectedPatrimonio] = useState<Patrimonio | null>(null);
  
  const [form, setForm] = useState({
    patrimonio_id: preSelectedPatrimonio || '',
    client_id: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_prevista_devolucao: '',
    tipo_cobranca: 'diaria',
    valor_acordado: '',
    condicao_saida: '',
    observacoes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [patRes, cliRes] = await Promise.all([
        patrimonioService.list({ status: 'disponivel' }),
        clientsService.findAll()
      ]);
      setPatrimonios(patRes.data);
      setClientes(cliRes.data);
      
      // Se veio com patrimônio pré-selecionado
      if (preSelectedPatrimonio) {
        const pat = patRes.data.find((p: Patrimonio) => p.id === preSelectedPatrimonio);
        if (pat) {
          setSelectedPatrimonio(pat);
          // Sugere valor baseado no tipo de cobrança
          if (pat.valor_diaria) {
            setForm(prev => ({ ...prev, valor_acordado: String(pat.valor_diaria) }));
          }
        }
      }
    } catch {
      toast.error('Erro ao carregar dados');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Ao mudar patrimônio, atualiza selecionado e sugere valor
    if (name === 'patrimonio_id') {
      const pat = patrimonios.find(p => p.id === value);
      setSelectedPatrimonio(pat || null);
      if (pat) {
        const valorSugerido = 
          form.tipo_cobranca === 'diaria' ? pat.valor_diaria :
          form.tipo_cobranca === 'semanal' ? pat.valor_semanal :
          form.tipo_cobranca === 'mensal' ? pat.valor_mensal : '';
        if (valorSugerido) {
          setForm(prev => ({ ...prev, valor_acordado: String(valorSugerido) }));
        }
      }
    }

    // Ao mudar tipo de cobrança, sugere valor
    if (name === 'tipo_cobranca' && selectedPatrimonio) {
      const valorSugerido = 
        value === 'diaria' ? selectedPatrimonio.valor_diaria :
        value === 'semanal' ? selectedPatrimonio.valor_semanal :
        value === 'mensal' ? selectedPatrimonio.valor_mensal : '';
      if (valorSugerido) {
        setForm(prev => ({ ...prev, valor_acordado: String(valorSugerido) }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.patrimonio_id || !form.client_id || !form.data_inicio || !form.data_prevista_devolucao || !form.valor_acordado) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (new Date(form.data_prevista_devolucao) <= new Date(form.data_inicio)) {
      toast.error('Data de devolução deve ser após a data de início');
      return;
    }

    try {
      setSaving(true);
      await alugueisService.create({
        ...form,
        valor_acordado: parseFloat(form.valor_acordado)
      });
      toast.success('Aluguel criado com sucesso!');
      navigate('/alugueis');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao criar aluguel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Novo Aluguel">
        <button className="btn btn-secondary" onClick={() => navigate('/alugueis')}>
          <FiArrowLeft /> Voltar
        </button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-grid">
          {/* Equipamento */}
          <div className="form-group col-span-2">
            <label htmlFor="patrimonio_id">
              <FiPackage style={{ marginRight: '0.5rem' }} />
              Equipamento *
            </label>
            <select
              id="patrimonio_id"
              name="patrimonio_id"
              value={form.patrimonio_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecione o equipamento...</option>
              {patrimonios.map(pat => (
                <option key={pat.id} value={pat.id}>
                  [{pat.codigo}] {pat.nome} {pat.marca ? `- ${pat.marca}` : ''}
                </option>
              ))}
            </select>
            {patrimonios.length === 0 && (
              <small style={{ color: 'var(--text-secondary)' }}>
                Nenhum equipamento disponível. Cadastre ou libere equipamentos primeiro.
              </small>
            )}
          </div>

          {/* Info do equipamento selecionado */}
          {selectedPatrimonio && (
            <div className="form-group col-span-2">
              <div style={{ 
                background: 'var(--bg-secondary)', 
                padding: '1rem', 
                borderRadius: '8px',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}>
                {selectedPatrimonio.foto_url ? (
                  <img 
                    src={selectedPatrimonio.foto_url} 
                    alt={selectedPatrimonio.nome}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                ) : (
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    background: 'var(--border-color)', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiPackage size={24} />
                  </div>
                )}
                <div>
                  <strong>{selectedPatrimonio.nome}</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {selectedPatrimonio.marca} {selectedPatrimonio.modelo}
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    {selectedPatrimonio.valor_diaria && <span style={{ marginRight: '1rem' }}>Diária: {formatCurrency(selectedPatrimonio.valor_diaria)}</span>}
                    {selectedPatrimonio.valor_semanal && <span style={{ marginRight: '1rem' }}>Semanal: {formatCurrency(selectedPatrimonio.valor_semanal)}</span>}
                    {selectedPatrimonio.valor_mensal && <span>Mensal: {formatCurrency(selectedPatrimonio.valor_mensal)}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cliente */}
          <div className="form-group col-span-2">
            <label htmlFor="client_id">
              <FiUser style={{ marginRight: '0.5rem' }} />
              Cliente *
            </label>
            <select
              id="client_id"
              name="client_id"
              value={form.client_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecione o cliente...</option>
              {clientes.map(cli => (
                <option key={cli.id} value={cli.id}>
                  {cli.name} {cli.phone ? `- ${cli.phone}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Datas */}
          <div className="form-group">
            <label htmlFor="data_inicio">Data de Início *</label>
            <input
              type="date"
              id="data_inicio"
              name="data_inicio"
              value={form.data_inicio}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="data_prevista_devolucao">Previsão de Devolução *</label>
            <input
              type="date"
              id="data_prevista_devolucao"
              name="data_prevista_devolucao"
              value={form.data_prevista_devolucao}
              onChange={handleChange}
              required
            />
          </div>

          {/* Tipo de cobrança e Valor */}
          <div className="form-group">
            <label htmlFor="tipo_cobranca">Tipo de Cobrança</label>
            <select
              id="tipo_cobranca"
              name="tipo_cobranca"
              value={form.tipo_cobranca}
              onChange={handleChange}
            >
              {TIPOS_COBRANCA.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="valor_acordado">Valor Acordado (R$) *</label>
            <input
              type="number"
              id="valor_acordado"
              name="valor_acordado"
              value={form.valor_acordado}
              onChange={handleChange}
              step="0.01"
              min="0"
              required
              placeholder="0,00"
            />
          </div>

          {/* Condição de saída */}
          <div className="form-group col-span-2">
            <label htmlFor="condicao_saida">Condição do Equipamento na Saída</label>
            <textarea
              id="condicao_saida"
              name="condicao_saida"
              value={form.condicao_saida}
              onChange={handleChange}
              rows={2}
              placeholder="Descreva as condições do equipamento ao ser entregue ao cliente..."
            />
          </div>

          {/* Observações */}
          <div className="form-group col-span-2">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              name="observacoes"
              value={form.observacoes}
              onChange={handleChange}
              rows={2}
              placeholder="Observações gerais sobre o aluguel..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/alugueis')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FiSave /> {saving ? 'Salvando...' : 'Criar Aluguel'}
          </button>
        </div>
      </form>
    </div>
  );
}

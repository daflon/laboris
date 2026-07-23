import { useEffect, useState } from 'react';
import { FiPlus, FiCheck, FiTrash2, FiDollarSign, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { financeiroService, FinancialEntry, FinancialSummary } from '../../services/financeiro.service';
import PageHeader from '../../components/PageHeader';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function FinanceiroPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'receita', description: '', amount: '', due_date: now.toISOString().split('T')[0] });

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, summaryRes] = await Promise.all([
        financeiroService.list({ month, year }),
        financeiroService.getSummary({ month, year }),
      ]);
      setEntries(entriesRes.data);
      setSummary(summaryRes.data);
    } catch {
      toast.error('Erro ao carregar financeiro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [month, year]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeiroService.create({
        type: form.type,
        description: form.description,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
      });
      toast.success('Lançamento criado');
      setShowForm(false);
      setForm({ type: 'receita', description: '', amount: '', due_date: now.toISOString().split('T')[0] });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao criar lançamento');
    }
  };

  const handlePay = async (id: string) => {
    try {
      await financeiroService.markAsPaid(id);
      toast.success('Marcado como pago');
      loadData();
    } catch { toast.error('Erro'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await financeiroService.remove(id);
      toast.success('Removido');
      loadData();
    } catch { toast.error('Erro'); }
  };

  return (
    <div>
      <PageHeader title="Financeiro">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <FiPlus /> Novo Lançamento
        </button>
      </PageHeader>

      {/* Filtro de mês */}
      <div className="filters-row" style={{ marginBottom: '1.5rem' }}>
        <select className="filter-select" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="filter-select" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
          {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Resumo */}
      {summary && (
        <div className="dashboard-cards" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card dash-card-green">
            <div className="dash-card-icon"><FiTrendingUp /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{formatCurrency(summary.receitas)}</span>
              <span className="dash-card-label">Receitas</span>
            </div>
          </div>
          <div className="dash-card dash-card-yellow">
            <div className="dash-card-icon"><FiTrendingDown /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{formatCurrency(summary.despesas)}</span>
              <span className="dash-card-label">Despesas</span>
            </div>
          </div>
          <div className="dash-card dash-card-blue">
            <div className="dash-card-icon"><FiDollarSign /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{formatCurrency(summary.saldo)}</span>
              <span className="dash-card-label">Saldo</span>
            </div>
          </div>
          <div className="dash-card dash-card-gray">
            <div className="dash-card-icon"><FiDollarSign /></div>
            <div className="dash-card-content">
              <span className="dash-card-value">{formatCurrency(summary.pendente)}</span>
              <span className="dash-card-label">Pendente</span>
            </div>
          </div>
        </div>
      )}

      {/* Form de novo lançamento */}
      {showForm && (
        <div className="form-card" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="form-group">
                <label>Tipo</label>
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              <div className="form-group col-span-2">
                <label>Descrição</label>
                <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required placeholder="Ex: OS #0001 - Serra Mármore" />
              </div>
              <div className="form-group">
                <label>Valor (R$)</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Data de Vencimento</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Lista de lançamentos */}
      {loading ? (
        <p className="loading-text">Carregando...</p>
      ) : entries.length === 0 ? (
        <p className="empty-text">Nenhum lançamento em {MONTHS[month - 1]} {year}.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <span style={{ color: entry.type === 'receita' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {entry.type === 'receita' ? '↑' : '↓'} {entry.type}
                  </span>
                </td>
                <td>{entry.description}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(Number(entry.amount))}</td>
                <td>{entry.due_date ? new Date(entry.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                <td>
                  <span className={`badge ${entry.status === 'pago' ? 'badge-success' : 'badge-danger'}`}>
                    {entry.status}
                  </span>
                </td>
                <td className="actions-cell">
                  {entry.status === 'pendente' && (
                    <button className="btn-icon" title="Marcar como pago" onClick={() => handlePay(entry.id)}>
                      <FiCheck />
                    </button>
                  )}
                  <button className="btn-icon btn-icon-danger" title="Excluir" onClick={() => handleDelete(entry.id)}>
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

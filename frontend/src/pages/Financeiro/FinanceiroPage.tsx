import { useEffect, useState } from 'react';
import { FiPlus, FiCheck, FiTrash2, FiDollarSign, FiTrendingUp, FiTrendingDown, FiLink, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { financeiroService, FinancialEntry, FinancialSummary } from '../../services/financeiro.service';
import { serviceOrdersService, ServiceOrder, formatOrderNumber } from '../../services/serviceOrders.service';
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
  const [form, setForm] = useState({ type: 'receita', description: '', amount: '', due_date: now.toISOString().split('T')[0], service_order_id: '' });
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [osMap, setOsMap] = useState<Map<string, ServiceOrder>>(new Map());

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, summaryRes, osRes] = await Promise.all([
        financeiroService.list({ month, year }),
        financeiroService.getSummary({ month, year }),
        serviceOrdersService.list({ limit: 10000 }),
      ]);
      setEntries(entriesRes.data);
      setSummary(summaryRes.data);
      
      // Criar mapa de OS para lookup rápido
      const orders = osRes.data.data || osRes.data || [];
      setServiceOrders(orders);
      const map = new Map<string, ServiceOrder>();
      orders.forEach((os: ServiceOrder) => map.set(os.id, os));
      setOsMap(map);
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
        service_order_id: form.service_order_id || undefined,
      });
      toast.success('Lançamento criado');
      setShowForm(false);
      setForm({ type: 'receita', description: '', amount: '', due_date: now.toISOString().split('T')[0], service_order_id: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao criar lançamento');
    }
  };

  const handlePay = async (id: string, type: string) => {
    try {
      await financeiroService.markAsPaid(id);
      toast.success(type === 'receita' ? 'Marcado como recebido' : 'Marcado como pago');
      loadData();
    } catch { toast.error('Erro'); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este lançamento? O registro será mantido para histórico.')) return;
    try {
      await financeiroService.cancel(id);
      toast.success('Lançamento cancelado');
      loadData();
    } catch { toast.error('Erro ao cancelar'); }
  };

  const handleDelete = async (entry: FinancialEntry) => {
    // Se está vinculado a OS, não pode excluir - só cancelar
    if (entry.service_order_id) {
      toast.error('Lançamentos vinculados a OS não podem ser excluídos. Use cancelar.');
      return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.')) return;
    
    try {
      await financeiroService.remove(entry.id);
      toast.success('Lançamento removido');
      loadData();
    } catch (error: any) {
      if (error.response?.data?.error?.linked) {
        toast.error('Lançamentos vinculados a OS não podem ser excluídos');
      } else {
        toast.error('Erro ao excluir');
      }
    }
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

      {/* Modal de novo lançamento */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3>Novo Lançamento</h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, service_order_id: e.target.value === 'receita' ? '' : p.service_order_id }))}>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div className="form-group">
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
                {form.type === 'despesa' && (
                  <div className="form-group">
                    <label>OS Relacionada (opcional)</label>
                    <select 
                      value={form.service_order_id} 
                      onChange={(e) => setForm((p) => ({ ...p, service_order_id: e.target.value }))}
                    >
                      <option value="">Nenhuma (despesa avulsa)</option>
                      {serviceOrders
                        .filter(os => os.status !== 'cancelada')
                        .sort((a, b) => b.order_number - a.order_number)
                        .map(os => (
                          <option key={os.id} value={os.id}>
                            OS #{formatOrderNumber(os)} - {os.client_name} ({os.equipment_type})
                          </option>
                        ))
                      }
                    </select>
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Vincule a despesa a uma OS para calcular o lucro real
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
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
              <th>OS</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const linkedOs = entry.service_order_id ? osMap.get(entry.service_order_id) : null;
              const isCanceled = entry.status === 'cancelado';
              const isPaid = entry.status === 'pago' || entry.status === 'recebido';
              const statusLabel = entry.status === 'recebido' ? 'recebido' : entry.status === 'pago' ? 'pago' : entry.status;
              const statusClass = isCanceled ? 'badge-gray' : isPaid ? 'badge-success' : 'badge-danger';
              
              return (
                <tr key={entry.id} style={{ opacity: isCanceled ? 0.5 : 1 }}>
                  <td>
                    <span style={{ color: entry.type === 'receita' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {entry.type === 'receita' ? '↑' : '↓'} {entry.type}
                    </span>
                  </td>
                  <td>{entry.description}</td>
                  <td>
                    {linkedOs ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#6366f1', fontWeight: 500 }}>
                        <FiLink size={12} />
                        #{formatOrderNumber(linkedOs)}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(Number(entry.amount))}</td>
                  <td>{entry.due_date ? new Date(entry.due_date.split('T')[0] + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td>
                    <span className={`badge ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {entry.status === 'pendente' && (
                      <button 
                        className="btn-icon" 
                        title={entry.type === 'receita' ? 'Marcar como recebido' : 'Marcar como pago'} 
                        onClick={() => handlePay(entry.id, entry.type)}
                      >
                        <FiCheck />
                      </button>
                    )}
                    {!isCanceled && entry.service_order_id && (
                      <button className="btn-icon btn-icon-warning" title="Cancelar (manter histórico)" onClick={() => handleCancel(entry.id)}>
                        <FiXCircle />
                      </button>
                    )}
                    {!entry.service_order_id && !isCanceled && (
                      <button className="btn-icon btn-icon-danger" title="Excluir" onClick={() => handleDelete(entry)}>
                        <FiTrash2 />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

import api from './api';

export interface FinancialEntry {
  id: string;
  type: 'receita' | 'despesa';
  description: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pendente' | 'pago' | 'atrasado';
  service_order_id?: string;
  created_at: string;
}

export interface FinancialSummary {
  receitas: number;
  despesas: number;
  pago: number;
  pendente: number;
  saldo: number;
  month: number;
  year: number;
}

export const financeiroService = {
  async list(params?: { month?: number; year?: number; status?: string; type?: string }) {
    const response = await api.get('/financeiro', { params });
    return response.data;
  },

  async getSummary(params?: { month?: number; year?: number }) {
    const response = await api.get('/financeiro/resumo', { params });
    return response.data;
  },

  async create(data: { type: string; description: string; amount: number; due_date?: string; service_order_id?: string }) {
    const response = await api.post('/financeiro', data);
    return response.data;
  },

  async update(id: string, data: Partial<FinancialEntry>) {
    const response = await api.put(`/financeiro/${id}`, data);
    return response.data;
  },

  async markAsPaid(id: string) {
    const response = await api.patch(`/financeiro/${id}/pay`);
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete(`/financeiro/${id}`);
    return response.data;
  },
};

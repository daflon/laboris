import api from './api';

export interface FaturamentoResumo {
  total_faturado: number;
  qtd_os: number;
  ticket_medio: number;
  clientes_atendidos: number;
  periodo: { month: number; year: number };
}

export interface GraficoItem {
  month: number;
  year: number;
  label: string;
  total: number;
  qtd_os: number;
}

export interface TecnicoFaturamento {
  id: string;
  name: string;
  qtd_os: number;
  total: number;
}

export interface OSFaturada {
  id: string;
  order_number: number;
  lote_sufixo?: string;
  status: string;
  completion_date: string;
  client_name: string;
  equipment_type: string;
  equipment_brand: string;
  technician_name?: string;
  total: number;
}

export const faturamentoService = {
  async getResumo(params: { month: number; year: number }) {
    const response = await api.get('/faturamento/resumo', { params });
    return response.data;
  },

  async getGrafico(months = 6) {
    const response = await api.get('/faturamento/grafico', { params: { months } });
    return response.data;
  },

  async getPorTecnico(params: { month: number; year: number }) {
    const response = await api.get('/faturamento/por-tecnico', { params });
    return response.data;
  },

  async getLista(params: { month: number; year: number }) {
    const response = await api.get('/faturamento/lista', { params });
    return response.data;
  },

  getPdfUrl(params: { month: number; year: number; tipo: 'compacto' | 'grafico' | 'completo' }) {
    const baseUrl = api.defaults.baseURL || '/api/v1';
    const token = localStorage.getItem('token');
    return `${baseUrl}/faturamento/pdf?month=${params.month}&year=${params.year}&tipo=${params.tipo}&token=${token}`;
  }
};

/**
 * Serviço de API para o módulo de Aluguéis
 */

import api from './api';

// ==================== TIPOS ====================

export interface Patrimonio {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  valor_compra?: number;
  valor_diaria?: number;
  valor_semanal?: number;
  valor_mensal?: number;
  status: 'disponivel' | 'alugado' | 'manutencao' | 'inativo';
  observacoes?: string;
  foto_url?: string;
  data_aquisicao?: string;
  created_at: string;
  updated_at: string;
}

export interface Aluguel {
  id: string;
  tenant_id: string;
  patrimonio_id: string;
  client_id: string;
  numero: number;
  data_inicio: string;
  data_prevista_devolucao: string;
  data_devolucao?: string;
  tipo_cobranca: 'diaria' | 'semanal' | 'mensal' | 'fixo';
  valor_acordado: number;
  valor_final?: number;
  status: 'ativo' | 'devolvido' | 'atrasado' | 'cancelado';
  condicao_saida?: string;
  condicao_devolucao?: string;
  equipamento_danificado?: boolean;
  os_manutencao_id?: string;
  observacoes?: string;
  created_at: string;
  // Joins
  patrimonio_nome?: string;
  patrimonio_codigo?: string;
  patrimonio_foto?: string;
  client_name?: string;
  client_phone?: string;
  client_document?: string;
  pagamentos?: Pagamento[];
}

export interface Pagamento {
  id: string;
  aluguel_id: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'transferencia' | 'boleto' | 'outro';
  observacoes?: string;
  created_at: string;
}

export interface AluguelStats {
  alugados: number;
  valorAtivos: number;
  devolucoesSemana: number;
  atrasados: number;
  receitaMes: number;
  disponiveis: number;
}

// ==================== PATRIMÔNIO ====================

export const patrimonioService = {
  async list(params?: { status?: string; search?: string }) {
    const response = await api.get('/alugueis/patrimonio', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/alugueis/patrimonio/${id}`);
    return response.data;
  },

  async create(data: Partial<Patrimonio>) {
    const response = await api.post('/alugueis/patrimonio', data);
    return response.data;
  },

  async update(id: string, data: Partial<Patrimonio>) {
    const response = await api.put(`/alugueis/patrimonio/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/alugueis/patrimonio/${id}`);
    return response.data;
  }
};

// ==================== ALUGUÉIS ====================

export const alugueisService = {
  async list(params?: { status?: string; cliente?: string; patrimonio?: string }) {
    const response = await api.get('/alugueis', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/alugueis/${id}`);
    return response.data;
  },

  async getStats(): Promise<{ success: boolean; data: AluguelStats }> {
    const response = await api.get('/alugueis/stats');
    return response.data;
  },

  async create(data: {
    patrimonio_id: string;
    client_id: string;
    data_inicio: string;
    data_prevista_devolucao: string;
    tipo_cobranca?: string;
    valor_acordado: number;
    condicao_saida?: string;
    observacoes?: string;
  }) {
    const response = await api.post('/alugueis', data);
    return response.data;
  },

  async update(id: string, data: Partial<Aluguel>) {
    const response = await api.put(`/alugueis/${id}`, data);
    return response.data;
  },

  async devolver(id: string, data: {
    data_devolucao?: string;
    condicao_devolucao?: string;
    equipamento_danificado?: boolean;
    valor_final?: number;
    observacoes?: string;
  }) {
    const response = await api.post(`/alugueis/${id}/devolver`, data);
    return response.data;
  },

  async cancelar(id: string, motivo?: string) {
    const response = await api.post(`/alugueis/${id}/cancelar`, { motivo });
    return response.data;
  },

  async registrarPagamento(id: string, data: {
    valor: number;
    data_pagamento?: string;
    forma_pagamento?: string;
    observacoes?: string;
  }) {
    const response = await api.post(`/alugueis/${id}/pagamentos`, data);
    return response.data;
  }
};

// Helpers
export const STATUS_PATRIMONIO = [
  { value: 'disponivel', label: 'Disponível', color: '#22c55e', emoji: '✅' },
  { value: 'alugado', label: 'Alugado', color: '#3b82f6', emoji: '📦' },
  { value: 'manutencao', label: 'Em Manutenção', color: '#f59e0b', emoji: '🔧' },
  { value: 'inativo', label: 'Inativo', color: '#6b7280', emoji: '⏸️' },
];

export const STATUS_ALUGUEL = [
  { value: 'ativo', label: 'Ativo', color: '#3b82f6', emoji: '📋' },
  { value: 'atrasado', label: 'Atrasado', color: '#ef4444', emoji: '⚠️' },
  { value: 'devolvido', label: 'Devolvido', color: '#22c55e', emoji: '✅' },
  { value: 'cancelado', label: 'Cancelado', color: '#6b7280', emoji: '❌' },
];

export const TIPOS_COBRANCA = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'fixo', label: 'Valor Fixo' },
];

export const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'outro', label: 'Outro' },
];

export function formatAluguelNumero(numero: number): string {
  return String(numero).padStart(4, '0');
}

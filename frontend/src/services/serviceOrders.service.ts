import api from './api';

export interface ServiceOrderItem {
  id?: string;
  quantity: number;
  description: string;
  unit_price: number;
}

export interface LoteItem {
  id: string;
  lote_sufixo: string;
  status: string;
  equipment_type: string;
  equipment_brand: string;
  equipment_model: string;
}

export interface ServiceOrder {
  id: string;
  order_number: number;
  client_id: string;
  equipment_id: string;
  technician_id: string;
  status: string;
  reported_defect?: string;
  diagnosis?: string;
  notes?: string;
  payment_method?: string;
  warranty_days: number;
  entry_date: string;
  completion_date?: string;
  items: ServiceOrderItem[];
  // Lote fields
  lote_numero?: number;
  lote_sufixo?: string;
  lote_items?: LoteItem[];
  // Joined fields
  client_name?: string;
  client_phone?: string;
  client_document?: string;
  client_email?: string;
  equipment_type?: string;
  equipment_brand?: string;
  equipment_model?: string;
  equipment_serial_number?: string;
  technician_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderFormData {
  client_id: string;
  equipment_id: string;
  technician_id: string;
  status?: string;
  reported_defect?: string;
  diagnosis?: string;
  notes?: string;
  payment_method?: string;
  warranty_days?: number;
  entry_date?: string;
  completion_date?: string;
  items: ServiceOrderItem[];
}

export const STATUSES = [
  { value: 'aberta', label: 'Aberta', color: '#2563eb' },           // blue-600
  { value: 'aprovada', label: 'Avisada', color: '#d97706' },        // amber-600 (cliente foi avisado)
  { value: 'aguardando_peca', label: 'Aguardando Peça', color: '#7c3aed' }, // violet-600
  { value: 'concluida', label: 'Concluída', color: '#059669' },     // emerald-600
  { value: 'entregue', label: 'Entregue', color: '#4f46e5' },       // indigo-600
  { value: 'cancelada', label: 'Cancelada', color: '#dc2626' },     // red-600
];

/**
 * Retorna as classes CSS para um status de OS
 * Uso: <span className={getStatusBadgeClass(status)}>{label}</span>
 */
export function getStatusBadgeClass(status: string): string {
  return `status-badge status-${status}`;
}

/**
 * Formata número da OS com sufixo de lote se existir
 * Ex: 0025 ou 0025-A
 */
export function formatOrderNumber(order: ServiceOrder | { order_number: number; lote_sufixo?: string }): string {
  const num = String(order.order_number).padStart(4, '0');
  if (order.lote_sufixo) {
    return `${num}-${order.lote_sufixo}`;
  }
  return num;
}

export const PAYMENT_METHODS = [
  'Dinheiro',
  'PIX',
  'Cartão Crédito',
  'Cartão Débito',
  'Transferência',
  'A combinar',
];

export const serviceOrdersService = {
  async list(params?: { search?: string; status?: string; filter?: string; page?: number; limit?: number }) {
    const response = await api.get('/service-orders', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/service-orders/${id}`);
    return response.data;
  },

  async create(data: ServiceOrderFormData) {
    const response = await api.post('/service-orders', data);
    return response.data;
  },

  async update(id: string, data: Partial<ServiceOrderFormData>) {
    const response = await api.put(`/service-orders/${id}`, data);
    return response.data;
  },

  async updateStatus(id: string, status: string) {
    const response = await api.patch(`/service-orders/${id}/status`, { status });
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete(`/service-orders/${id}`);
    return response.data;
  },

  async duplicate(id: string, addToLote = false, data?: { equipment_id: string; technician_id?: string }) {
    const response = await api.post(`/service-orders/${id}/duplicate`, { addToLote, ...data });
    return response.data;
  },

  async addToLote(id: string, data: { equipment_id: string; technician_id?: string; reported_defect?: string; items?: ServiceOrderItem[] }) {
    const response = await api.post(`/service-orders/${id}/add-to-lote`, data);
    return response.data;
  },

  async getEquipmentHistory(equipmentId: string) {
    const response = await api.get(`/equipment/${equipmentId}/history`);
    return response.data;
  },
};

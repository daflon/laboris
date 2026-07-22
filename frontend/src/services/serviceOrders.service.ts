import api from './api';

export interface ServiceOrderItem {
  id?: string;
  quantity: number;
  description: string;
  unit_price: number;
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
  { value: 'aberta', label: 'Aberta', color: '#3b82f6' },
  { value: 'aprovada', label: 'Aprovada', color: '#f59e0b' },
  { value: 'aguardando_peca', label: 'Aguardando Peça', color: '#8b5cf6' },
  { value: 'concluida', label: 'Concluída', color: '#10b981' },
  { value: 'entregue', label: 'Entregue', color: '#6b7280' },
  { value: 'cancelada', label: 'Cancelada', color: '#ef4444' },
];

export const PAYMENT_METHODS = [
  'Dinheiro',
  'PIX',
  'Cartão Crédito',
  'Cartão Débito',
  'Transferência',
  'A combinar',
];

export const serviceOrdersService = {
  async list(params?: { search?: string; status?: string; page?: number; limit?: number }) {
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

  async duplicate(id: string) {
    const response = await api.post(`/service-orders/${id}/duplicate`);
    return response.data;
  },

  async getEquipmentHistory(equipmentId: string) {
    const response = await api.get(`/equipment/${equipmentId}/history`);
    return response.data;
  },
};

import api from './api';

export interface Equipment {
  id: string;
  client_id: string;
  type: string;
  brand: string;
  model: string;
  serial_number?: string;
  notes?: string;
  client_name?: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentFormData {
  client_id: string;
  type: string;
  brand: string;
  model: string;
  serial_number?: string;
  notes?: string;
}

export const equipmentService = {
  async list(params?: { search?: string; client_id?: string; page?: number; limit?: number }) {
    const response = await api.get('/equipment', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/equipment/${id}`);
    return response.data;
  },

  async getByClientId(clientId: string) {
    const response = await api.get(`/clients/${clientId}/equipment`);
    return response.data;
  },

  async create(data: EquipmentFormData) {
    const response = await api.post('/equipment', data);
    return response.data;
  },

  async update(id: string, data: Partial<Omit<EquipmentFormData, 'client_id'>>) {
    const response = await api.put(`/equipment/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete(`/equipment/${id}`);
    return response.data;
  },
};

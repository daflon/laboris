import api from './api';

export interface Client {
  id: string;
  name: string;
  document: string;
  phone: string;
  email?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientFormData {
  name: string;
  document: string;
  phone: string;
  email?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
}

export const clientsService = {
  async list(params?: { search?: string; page?: number; limit?: number }) {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  async create(data: ClientFormData) {
    const response = await api.post('/clients', data);
    return response.data;
  },

  async update(id: string, data: Partial<ClientFormData>) {
    const response = await api.put(`/clients/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },
};

import api from './api';

export interface Technician {
  id: string;
  name: string;
  phone: string;
  specialty?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TechnicianFormData {
  name: string;
  phone: string;
  specialty?: string;
  active?: boolean;
}

export const techniciansService = {
  async list(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const response = await api.get('/technicians', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/technicians/${id}`);
    return response.data;
  },

  async create(data: TechnicianFormData) {
    const response = await api.post('/technicians', data);
    return response.data;
  },

  async update(id: string, data: Partial<TechnicianFormData>) {
    const response = await api.put(`/technicians/${id}`, data);
    return response.data;
  },

  async toggleStatus(id: string) {
    const response = await api.patch(`/technicians/${id}/toggle-status`);
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete(`/technicians/${id}`);
    return response.data;
  },
};

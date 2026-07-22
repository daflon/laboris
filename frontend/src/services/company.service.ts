import api from './api';

export interface CompanySettings {
  id?: string;
  name: string;
  document?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  logo_url?: string;
  header_text?: string;
  footer_text?: string;
  default_warranty_days?: number;
  admin_pin?: string;
}

export const companyService = {
  async get() {
    const response = await api.get('/company');
    return response.data;
  },

  async save(data: CompanySettings) {
    const response = await api.put('/company', data);
    return response.data;
  },
};

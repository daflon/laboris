import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'tenant_user';
  tenant_id: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    modules: string[];
  };
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/auth/login', { email, password });
    return response.data.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  async changePassword(current_password: string, new_password: string) {
    const response = await api.put('/auth/change-password', { current_password, new_password });
    return response.data;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  setToken(token: string) {
    localStorage.setItem('token', token);
  },

  removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getUser(): User | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  isSuperAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'super_admin';
  },
};

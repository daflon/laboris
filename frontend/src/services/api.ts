import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Em produção (mesmo domínio): /api/v1
// Em desenvolvimento (portas separadas): hostname:3000/api/v1
const isDev = window.location.port === '5173';
const baseURL = isDev
  ? `${window.location.protocol}//${window.location.hostname}:3000/api/v1`
  : '/api/v1';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante: envia cookies em todas as requisições
});

// Flag para evitar múltiplas tentativas de refresh simultâneas
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor — adiciona token em toda request (fallback para localStorage)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // O cookie httpOnly é enviado automaticamente com withCredentials: true
  // Mas mantemos o header Authorization como fallback para compatibilidade
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor — tenta refresh token se 401, senão redireciona pra login
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Se não é erro 401 ou não tem config, rejeita normalmente
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }
    
    // Se é a rota de refresh ou já tentou retry, faz logout
    if (originalRequest.url?.includes('/auth/refresh') || originalRequest._retry) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    
    // Verifica se o erro é de token expirado (e não de token inválido/ausente)
    const errorCode = (error.response?.data as { error?: { code?: string } })?.error?.code;
    if (errorCode !== 'TOKEN_EXPIRED') {
      // Token inválido ou ausente - faz logout direto
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    
    // Se já está fazendo refresh, adiciona à fila
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (originalRequest.headers && token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return api(originalRequest);
      });
    }
    
    originalRequest._retry = true;
    isRefreshing = true;
    
    try {
      // Tenta obter novo access token usando refresh token (cookie)
      const response = await api.post('/auth/refresh');
      const newToken = response.data.data.token;
      
      // Atualiza localStorage para compatibilidade
      localStorage.setItem('token', newToken);
      
      // Atualiza header da requisição original
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      
      processQueue(null, newToken);
      
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as AxiosError, null);
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

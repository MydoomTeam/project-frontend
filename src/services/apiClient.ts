import axios from 'axios';
import type { AxiosRequestHeaders } from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    const headers = config.headers as AxiosRequestHeaders | undefined;
    config.headers = {
      ...(headers ?? {}),
      Authorization: `Bearer ${token}`,
    } as AxiosRequestHeaders;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_profile');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
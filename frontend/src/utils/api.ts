import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.cribagents.com/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // SecureStore may not be available in all environments
      console.warn('Could not read auth token from SecureStore:', error);
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token expired or invalid — clear stored credentials
      try {
        await SecureStore.deleteItemAsync('auth_token');
      } catch (_) {
        // ignore
      }
      // The zustand store's auth listener will handle redirect
    }

    if (status === 403) {
      console.error('Access denied');
    }

    if (status && status >= 500) {
      console.error('Server error — please try again later');
    }

    return Promise.reject(error);
  }
);

export default api;

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../constants/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  licenseNumber?: string | null;
  profileImageUrl?: string | null;
  stripeCustomerId?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: string;
    licenseNumber?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token');
      if (storedToken) {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        setToken(storedToken);
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token').catch(() => {});
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    const { user: u, token: t } = res.data;
    await SecureStore.setItemAsync('auth_token', t);
    setUser(u);
    setToken(t);
  }

  async function register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: string;
    licenseNumber?: string;
  }) {
    const res = await api.post('/auth/register', data);
    const { user: u, token: t } = res.data;
    await SecureStore.setItemAsync('auth_token', t);
    setUser(u);
    setToken(t);
  }

  async function logout() {
    await SecureStore.deleteItemAsync('auth_token').catch(() => {});
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'buyer' | 'seller' | 'landlord' | 'tenant' | 'agent';
  avatarUrl?: string;
  licenseNumber?: string;
}

export interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  listingType: 'sale' | 'rent';
  propertyType: 'house' | 'condo' | 'townhouse' | 'apartment' | 'land';
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  parking: number;
  petFriendly: boolean;
  description: string;
  features: string[];
  images: string[];
  status: 'active' | 'pending' | 'sold' | 'rented';
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface PropertyFilters {
  listingType: 'sale' | 'rent';
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  propertyType?: string;
  query?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: {
    type: 'showing_scheduled' | 'offer_created' | 'market_analysis' | 'property_found';
    data: Record<string, unknown>;
  };
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

// ── Auth Slice ─────────────────────────────────────────────────────────────

interface AuthSlice {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    licenseNumber?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

// ── Properties Slice ───────────────────────────────────────────────────────

interface PropertiesSlice {
  properties: Property[];
  propertiesLoading: boolean;
  filters: PropertyFilters;
  setFilters: (filters: Partial<PropertyFilters>) => void;
  fetchProperties: () => Promise<void>;
  searchProperties: (query: string) => Promise<void>;
}

// ── Conversations Slice ────────────────────────────────────────────────────

interface ConversationsSlice {
  conversations: Conversation[];
  currentMessages: Message[];
  currentConversationId: string | null;
  conversationsLoading: boolean;
  messagesLoading: boolean;
  sendMessage: (content: string, conversationId?: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  startNewConversation: () => void;
}

// ── Combined Store ─────────────────────────────────────────────────────────

type AppStore = AuthSlice & PropertiesSlice & ConversationsSlice;

export const useStore = create<AppStore>((set, get) => ({
  // ── Auth ────────────────────────────
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, token } = res.data;
      await SecureStore.setItemAsync('auth_token', token);
      set({ user, token });
    } catch (error) {
      throw error;
    }
  },

  signup: async (data) => {
    try {
      const res = await api.post('/auth/signup', data);
      const { user, token } = res.data;
      await SecureStore.setItemAsync('auth_token', token);
      set({ user, token });
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
    } catch (_) {
      // ignore
    }
    set({ user: null, token: null });
  },

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const res = await api.get('/auth/me');
        set({ user: res.data.user, token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (_) {
      await SecureStore.deleteItemAsync('auth_token').catch(() => {});
      set({ user: null, token: null, isLoading: false });
    }
  },

  // ── Properties ──────────────────────
  properties: [],
  propertiesLoading: false,
  filters: { listingType: 'sale' },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  fetchProperties: async () => {
    set({ propertiesLoading: true });
    try {
      const { filters } = get();
      const res = await api.get('/properties', { params: filters });
      set({ properties: res.data.properties, propertiesLoading: false });
    } catch (_) {
      set({ propertiesLoading: false });
    }
  },

  searchProperties: async (query) => {
    set({ propertiesLoading: true });
    try {
      const res = await api.get('/properties/search', { params: { q: query } });
      set({ properties: res.data.properties, propertiesLoading: false });
    } catch (_) {
      set({ propertiesLoading: false });
    }
  },

  // ── Conversations ───────────────────
  conversations: [],
  currentMessages: [],
  currentConversationId: null,
  conversationsLoading: false,
  messagesLoading: false,

  sendMessage: async (content, conversationId) => {
    const convId = conversationId || get().currentConversationId;
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: convId || 'new',
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      currentMessages: [...state.currentMessages, tempMessage],
      messagesLoading: true,
    }));

    try {
      const res = await api.post('/chat/message', {
        content,
        conversationId: convId,
      });
      const { message, conversation } = res.data;

      set((state) => ({
        currentMessages: [...state.currentMessages, message],
        currentConversationId: conversation.id,
        messagesLoading: false,
      }));
    } catch (_) {
      set({ messagesLoading: false });
    }
  },

  fetchConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const res = await api.get('/chat/conversations');
      set({ conversations: res.data.conversations, conversationsLoading: false });
    } catch (_) {
      set({ conversationsLoading: false });
    }
  },

  fetchMessages: async (conversationId) => {
    set({ messagesLoading: true, currentConversationId: conversationId });
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/messages`);
      set({ currentMessages: res.data.messages, messagesLoading: false });
    } catch (_) {
      set({ messagesLoading: false });
    }
  },

  startNewConversation: () => {
    set({ currentConversationId: null, currentMessages: [] });
  },
}));

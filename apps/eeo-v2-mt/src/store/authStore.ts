/**
 * Zustand store pro autentizaci
 */

import { create } from 'zustand';
import type { LoginResponse } from '../types/api';
import * as authApi from '../api/auth';

interface AuthState {
  user: LoginResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const user = await authApi.login({ username, password });
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false,
        error: null 
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Přihlášení selhalo', 
        isLoading: false,
        isAuthenticated: false,
        user: null
      });
      throw error;
    }
  },

  logout: () => {
    authApi.logout();
    set({ 
      user: null, 
      isAuthenticated: false,
      error: null
    });
  },

  loadUser: () => {
    const user = authApi.getCurrentUser();
    const isAuthenticated = authApi.isAuthenticated();
    
    set({ 
      user, 
      isAuthenticated,
      error: null
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));

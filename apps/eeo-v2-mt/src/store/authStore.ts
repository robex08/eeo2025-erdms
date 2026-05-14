import { create } from 'zustand';
import type { MobileUser } from '../domain/mobile';
import type { LoginResponse } from '../types/api';
import { getCurrentUser, isAuthenticated as hasStoredAuth, login as loginApi, logout as logoutApi } from '../api/auth';

interface AuthState {
  user: MobileUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (loginId: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AUTH_KEY = 'eeo-mobile-authenticated';

const mapApiUserToMobileUser = (user: LoginResponse): MobileUser => {
  const fullName = `${user.jmeno ?? ''} ${user.prijmeni ?? ''}`.trim();
  return {
    name: fullName || user.username,
    email: user.email,
    roles: user.pozice || `${user.auth_method} | org ${user.organizace_id}`,
    phone: user.telefon || '-',
  };
};

const storedApiUser = typeof window !== 'undefined' ? getCurrentUser() : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: storedApiUser ? mapApiUserToMobileUser(storedApiUser) : null,
  isAuthenticated: typeof window !== 'undefined' && hasStoredAuth(),
  isLoading: false,
  error: null,

  login: async (loginId: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      if (!loginId.trim() || !password.trim()) {
        throw new Error('Vyplnte prihlasovaci jmeno a heslo');
      }

      const apiUser = await loginApi({ username: loginId.trim(), password });

      localStorage.setItem(AUTH_KEY, '1');

      set({
        user: mapApiUserToMobileUser(apiUser),
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Prihlaseni se nezdarilo';
      set({
        error: message,
        isLoading: false,
      });
    }
  },

  logout: () => {
    logoutApi();
    localStorage.removeItem(AUTH_KEY);
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

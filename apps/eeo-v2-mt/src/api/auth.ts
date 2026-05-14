/**
 * Auth API služby
 * Podle MOBILE_API_LOGIN_DOCUMENTATION.md
 */

import { apiClient } from './client';
import type { LoginResponse, User } from '../types/api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenRefreshRequest {
  username: string;
  old_token: string;
}

const LOGIN_ENDPOINTS = ['/login', '/user/login'];

/**
 * 1️⃣ Login - POST /login
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  let lastError: unknown = null;
  let response: Awaited<ReturnType<typeof apiClient.post<LoginResponse>>> | null = null;

  for (const endpoint of LOGIN_ENDPOINTS) {
    try {
      response = await apiClient.post<LoginResponse>(endpoint, credentials, false);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!response) {
    throw (lastError instanceof Error ? lastError : new Error('Přihlášení selhalo'));
  }
  
  if (response.status === 'error') {
    throw new Error(response.message || 'Přihlášení selhalo');
  }
  
  if (!response.data) {
    throw new Error('Invalid response from server');
  }
  
  // Uložit auth data do localStorage
  localStorage.setItem('auth_token', response.data.token);
  localStorage.setItem('auth_username', response.data.username);
  localStorage.setItem('auth_user', JSON.stringify(response.data));
  
  return response.data;
};

/**
 * 2️⃣ Token Refresh - POST /token-refresh
 */
export const refreshToken = async (request: TokenRefreshRequest): Promise<string> => {
  const response = await apiClient.post<{ token: string; expires_at: string }>(
    '/token-refresh',
    request,
    false
  );
  
  if (response.status === 'error') {
    throw new Error(response.message || 'Token refresh failed');
  }
  
  if (!response.data) {
    throw new Error('Invalid response from server');
  }
  
  // Aktualizovat token v localStorage
  localStorage.setItem('auth_token', response.data.token);
  
  return response.data.token;
};

/**
 * 3️⃣ Get User Detail - POST /user/detail
 */
export const getUserDetail = async (userId?: number): Promise<User> => {
  const payload = userId ? { user_id: userId } : {};
  const response = await apiClient.post<User>('/user/detail', payload, true);
  
  if (response.status === 'error') {
    throw new Error(response.message || 'Failed to load user detail');
  }
  
  if (!response.data) {
    throw new Error('Invalid response from server');
  }
  
  return response.data;
};

/**
 * Logout - smaže lokální auth data
 */
export const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_username');
  localStorage.removeItem('auth_user');
};

/**
 * Získat aktuálně přihlášeného uživatele z localStorage
 */
export const getCurrentUser = (): LoginResponse | null => {
  const userJson = localStorage.getItem('auth_user');
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
};

/**
 * Zkontrolovat, zda je uživatel přihlášen
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('auth_token');
  const username = localStorage.getItem('auth_username');
  return !!(token && username);
};

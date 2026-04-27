/**
 * API Client pro EEO Mobile
 * Podle dokumentace z /var/www/erdms-dev/apps/eeo-v2/mobilni_app_doc/
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG } from './config';
import type { ApiResponse } from '../types/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error: AxiosError) => {

        // Handle 401 Unauthorized - logout
        if (error.response?.status === 401) {
          // Clear auth data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_username');
          localStorage.removeItem('auth_user');
          
          // Redirect to login (bude implementováno v App.tsx)
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * POST request s automatickým přidáním auth dat
   */
  async post<T = any>(
    endpoint: string,
    data: any = {},
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    try {
      let payload = { ...data };

      // Přidat token a username pokud je requireAuth true
      if (includeAuth) {
        const token = localStorage.getItem('auth_token');
        const username = localStorage.getItem('auth_username');

        if (!token || !username) {
          throw new Error('Missing authentication credentials');
        }

        payload = {
          ...payload,
          token,
          username,
        };
      }

      const response = await this.client.post(endpoint, payload);
      const responseData = response.data;

      // Backend může vracet různé formáty:
      // 1. Error: { err: "message" } nebo { err: "message", debug: {...} }
      // 2. Wrapped: { status: "success", data: {...} }
      // 3. Unwrapped: přímo data objekt

      // Pokud má 'err' property → error
      if (responseData && typeof responseData === 'object' && 'err' in responseData) {
        return {
          status: 'error',
          message: responseData.err as string,
          data: null as T,
        };
      }

      // Pokud má 'status' property → už je wrapped
      if (responseData && typeof responseData === 'object' && 'status' in responseData) {
        return responseData as ApiResponse<T>;
      }

      // Jinak → unwrapped data, zabalíme je
      return {
        status: 'ok',
        data: responseData as T,
        message: 'OK',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        
        // Zkontrolovat error response
        if (responseData && typeof responseData === 'object' && 'err' in responseData) {
          return {
            status: 'error',
            message: responseData.err as string,
            data: null as T,
          };
        }
        
        throw new Error(error.message || 'API request failed');
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(endpoint, { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.message || 'API request failed');
      }
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

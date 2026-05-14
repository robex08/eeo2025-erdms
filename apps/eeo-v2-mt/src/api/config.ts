// API configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api.eeo',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'EEO Mobile',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  env: import.meta.env.VITE_APP_ENV || 'development',
};

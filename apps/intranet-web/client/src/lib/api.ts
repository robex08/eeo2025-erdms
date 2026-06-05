import axios from 'axios';

// Pro localhost dev server použij produkční API
const isLocalhost = window.location.hostname === 'localhost';
const API_BASE_URL = isLocalhost 
  ? 'https://erdms.zachranka.cz/dev/api-intranet-web'
  : (import.meta.env.VITE_API_URL || '/dev/api-intranet-web');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Development mode - no cookies needed
});

// Response interceptor pro error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;

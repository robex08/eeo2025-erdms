import axios from 'axios';

/**
 * MANUALS API Service
 * Služba pro práci s PDF manuály a nápovědou
 * Verze: v2025.03_25
 * 
 * Endpointy:
 * 1. manuals/list - Seznam dostupných PDF manuálů
 * 2. manuals/download - Stažení konkrétního manuálu
 */

const api25manuals = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Response interceptor pro ošetření token expiration
api25manuals.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('authError', {
          detail: { message: 'Vaše přihlášení vypršelo. Přihlaste se prosím znovu.' }
        });
        window.dispatchEvent(event);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Načte seznam dostupných PDF manuálů
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} - {status, data, count, message}
 */
export const listManuals = async (token, username) => {
  try {
    const response = await api25manuals.post('/api25/manuals/list', {
      token,
      username
    });
    
    return response.data;
  } catch (error) {
    console.error('Error listing manuals:', error);
    throw error;
  }
};

/**
 * Vrátí URL pro zobrazení nebo stažení PDF manuálu
 * @param {string} filename - Název souboru
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {string} - URL pro přístup k PDF
 */
export const getManualUrl = (filename, token, username) => {
  const baseUrl = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/dev/api.eeo';
  return `${baseUrl}/api25/manuals/download`;
};

/**
 * Stáhne PDF manuál
 * @param {string} filename - Název souboru
 * @param {string} token - Auth token  
 * @param {string} username - Username
 * @returns {Promise<Blob>} - PDF soubor jako Blob
 */
export const downloadManual = async (filename, token, username) => {
  try {
    const response = await api25manuals.post('/api25/manuals/download', {
      token,
      username,
      filename
    }, {
      responseType: 'blob'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error downloading manual:', error);
    throw error;
  }
};

export default api25manuals;

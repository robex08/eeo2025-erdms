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
    // 🔐 401 Unauthorized - token expired → logout
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('authError', {
          detail: { message: 'Vaše přihlášení vypršelo. Přihlaste se prosím znovu.' }
        });
        window.dispatchEvent(event);
      }
    }
    // 🚫 403 Forbidden - permission error → NEODHLAŠOVAT, jen vrátit error
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
    const response = await api25manuals.post('/manuals/list', {
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
  const baseUrl = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';
  return `${baseUrl}/manuals/download`;
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
    const response = await api25manuals.post('/manuals/download', {
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

/**
 * Nahraje nový PDF manuál (pouze pro adminy)
 * @param {File} file - PDF soubor k nahrání
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} - {success, message, filename}
 */
export const uploadManual = async (file, token, username) => {
  try {
    
    const formData = new FormData();
    formData.append('token', token);
    formData.append('username', username);
    formData.append('file', file);
    
    // ⚠️ Použij RAW axios místo instance (kvůli default Content-Type: application/json)
    const baseURL = process.env.REACT_APP_API2_BASE_URL;
    // Odstraň trailing slash pokud existuje
    const cleanBaseURL = baseURL.replace(/\/$/, '');
    const url = `${cleanBaseURL}/manuals/upload`;
    
    const response = await axios.post(url, formData, {
      timeout: 300000, // 5 minut timeout pro velké soubory
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Upload ERROR:', error);
    console.error('  Response:', error.response?.data);
    console.error('  Status:', error.response?.status);
    throw error;
  }
};

/**
 * Smaže PDF manuál (pouze pro adminy)
 * @param {string} filename - Název souboru
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} - {success, message}
 */
export const deleteManual = async (filename, token, username) => {
  try {
    const response = await api25manuals.post('/manuals/delete', {
      token,
      username,
      filename
    });
    
    return response.data;
  } catch (error) {
    console.error('Error deleting manual:', error);
    throw error;
  }
};

export default api25manuals;

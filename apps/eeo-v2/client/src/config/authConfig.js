/**
 * Auth Configuration - Backend OAuth Flow
 * 
 * POZNÁMKA: Tato aplikace používá backend OAuth flow (confidential client).
 * Frontend NEpoužívá MSAL přímo - pouze volá backend API endpointy.
 * 
 * Tento soubor obsahuje pouze konfigurační konstanty pro referenci.
 */

// Backend API URL (používá se v authService.js)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Aplikační konfigurace
export const appConfig = {
  name: import.meta.env.VITE_APP_NAME || 'ERDMS',
};

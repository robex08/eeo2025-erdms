/**
 * API Service for Entity Details
 * 
 * Načítání kompletních detailů entit podle ID a typu
 * Všechny requesty používají POST s username a token v body
 */

import { loadAuthData, getStoredUsername } from '../utils/authStorage';

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';

/**
 * Helper pro vytvoření auth body
 */
const getAuthBody = async (additionalData = {}) => {
  const token = await loadAuthData.token();
  const user = await loadAuthData.user();
  const username = user?.username || getStoredUsername();
  
  if (!token) throw new Error('Chybí autentizační token');
  if (!username) throw new Error('Chybí username');
  
  return {
    username,
    token,
    ...additionalData
  };
};

/**
 * Získat detail uživatele
 */
export const getUserDetail = async (userId) => {
  try {
    const body = await getAuthBody({ user_id: userId });
    const response = await fetch(`${API_BASE_URL}users/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Chyba při načítání uživatele');
    return data;
  } catch (error) {
    console.error('Error fetching user detail:', error);
    throw error;
  }
};

/**
 * Získat detail objednávky 2025
 */
export const getOrder2025Detail = async (orderId) => {
  try {
    const body = await getAuthBody({ order_id: orderId });
    const response = await fetch(`${API_BASE_URL}orders/2025/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Chyba při načítání objednávky');
    return data;
  } catch (error) {
    console.error('Error fetching order 2025 detail:', error);
    throw error;
  }
};

/**
 * Získat detail staré objednávky
 */
export const getOrderLegacyDetail = async (orderId) => {
  try {
    const body = await getAuthBody({ order_id: orderId });
    const response = await fetch(`${API_BASE_URL}orders/legacy/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Chyba při načítání objednávky');
    return data;
  } catch (error) {
    console.error('Error fetching legacy order detail:', error);
    throw error;
  }
};

/**
 * Získat detail smlouvy
 */
export const getContractDetail = async (contractId) => {
  try {
    const body = await getAuthBody({ contract_id: contractId });
    const response = await fetch(`${API_BASE_URL}contracts/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Chyba při načítání smlouvy');
    return data;
  } catch (error) {
    console.error('Error fetching contract detail:', error);
    throw error;
  }
};

/**
 * Získat detail faktury
 */
export const getInvoiceDetail = async (invoiceId) => {
  try {
    const body = await getAuthBody({ invoice_id: invoiceId });
    const response = await fetch(`${API_BASE_URL}invoices/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Chyba při načítání faktury');
    return data;
  } catch (error) {
    console.error('Error fetching invoice detail:', error);
    throw error;
  }
};

/**
 * Získat detail dodavatele
 */
export const getSupplierDetail = async (supplierId) => {
  try {
    const body = await getAuthBody({ supplier_id: supplierId });
    const response = await fetch(`${API_BASE_URL}suppliers/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Chyba při načítání dodavatele');
    return data;
  } catch (error) {
    console.error('Error fetching supplier detail:', error);
    throw error;
  }
};

/**
 * Univerzální funkce pro načtení detailu podle typu entity
 */
export const getEntityDetail = async (entityType, entityId) => {
  switch (entityType) {
    case 'users':
      return getUserDetail(entityId);
    case 'orders_2025':
      return getOrder2025Detail(entityId);
    case 'orders_legacy':
      return getOrderLegacyDetail(entityId);
    case 'contracts':
      return getContractDetail(entityId);
    case 'invoices':
      return getInvoiceDetail(entityId);
    case 'suppliers':
      return getSupplierDetail(entityId);
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
};

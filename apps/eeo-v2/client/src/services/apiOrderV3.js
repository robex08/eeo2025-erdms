/**
 * 📦 API Order V3
 * 
 * API funkce pro práci s objednávkami V3
 * Používá V3 endpointy s backend pagination/filtering
 * 
 * Datum: 3. února 2026
 */

import { api2 } from './api2auth';

/**
 * Načtení detailu objednávky V3
 * 
 * Vrací kompletní detail včetně:
 * - Základní údaje objednávky
 * - Položky objednávky (s cenami, DPH)
 * - Faktury (s příl ohami)
 * - Přílohy objednávky
 * - Workflow kroky
 * - Detail dodavatele, uživatele, organizace
 * - Střediska, financování
 * 
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {number} params.orderId - ID objednávky
 * @returns {Promise<Object>} - Detail objednávky
 */
export async function getOrderDetailV3({ token, username, orderId }) {
  if (!token || !username || !orderId) {
    throw new Error('Missing required parameters: token, username, or orderId');
  }

  try {
    const response = await api2.post('orders-v3/detail', {
      token,
      username,
      order_id: orderId
    });

    if (response.data.status === 'ok' && response.data.order) {
      return response.data.order;
    } else if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Chyba při načítání detailu objednávky');
    } else {
      throw new Error('Neplatná odpověď ze serveru');
    }
  } catch (error) {
    console.error('❌ getOrderDetailV3 error:', error);
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw error;
    } else {
      throw new Error('Chyba při načítání detailu objednávky');
    }
  }
}

/**
 * Načtení položek objednávky V3
 * 
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {number} params.orderId
 * @returns {Promise<Array>} - Pole položek
 */
export async function getOrderItemsV3({ token, username, orderId }) {
  if (!token || !username || !orderId) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await api2.post('orders-v3/items', {
      token,
      username,
      order_id: orderId
    });

    if (response.data.status === 'ok') {
      return response.data.items || [];
    } else {
      throw new Error(response.data.message || 'Chyba při načítání položek');
    }
  } catch (error) {
    console.error('❌ getOrderItemsV3 error:', error);
    throw error;
  }
}

/**
 * Načtení faktur objednávky V3
 * 
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {number} params.orderId
 * @returns {Promise<Array>} - Pole faktur
 */
export async function getOrderInvoicesV3({ token, username, orderId }) {
  if (!token || !username || !orderId) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await api2.post('orders-v3/invoices', {
      token,
      username,
      order_id: orderId
    });

    if (response.data.status === 'ok') {
      return response.data.invoices || [];
    } else {
      throw new Error(response.data.message || 'Chyba při načítání faktur');
    }
  } catch (error) {
    console.error('❌ getOrderInvoicesV3 error:', error);
    throw error;
  }
}

/**
 * Načtení příloh objednávky V3
 * 
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {number} params.orderId
 * @returns {Promise<Array>} - Pole příloh
 */
export async function getOrderAttachmentsV3({ token, username, orderId }) {
  if (!token || !username || !orderId) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await api2.post('orders-v3/attachments', {
      token,
      username,
      order_id: orderId
    });

    if (response.data.status === 'ok') {
      return response.data.attachments || [];
    } else {
      throw new Error(response.data.message || 'Chyba při načítání příloh');
    }
  } catch (error) {
    console.error('❌ getOrderAttachmentsV3 error:', error);
    throw error;
  }
}

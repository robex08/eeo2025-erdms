/**
 * API funkce pro kontrolu řádků faktur (InvoiceCheckHandlers)
 * Datum: 2026-01-20
 * 
 * Endpointy:
 * - POST /invoices/toggle-check - Přepne stav kontroly faktury
 * - POST /invoices/get-checks    - Načte stavy kontrol pro více faktur
 */

const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');

/**
 * Přepne stav kontroly faktury (checkbox v řádku tabulky)
 * @param {number} fakturaId - ID faktury
 * @param {boolean} kontrolovano - Nový stav kontroly
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response s informací o změně
 */
export async function toggleInvoiceCheck(fakturaId, kontrolovano, token, username) {
  const response = await fetch(`${API_BASE_URL}/invoices/toggle-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      username,
      faktura_id: fakturaId,
      kontrolovano
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Načte stavy kontrol pro více faktur najednou
 * @param {number[]} fakturaIds - Pole ID faktur
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response s mapou faktura_id => kontrola_stav
 */
export async function getInvoiceChecks(fakturaIds, token, username) {
  const response = await fetch(`${API_BASE_URL}/invoices/get-checks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      username,
      faktura_ids: fakturaIds
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

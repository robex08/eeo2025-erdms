/**
 * API funkce pro Orders V3
 * Datum: 2026-01-23
 * 
 * Endpointy:
 * - POST /order-v3/list  - Seznam objednávek s paginací a stats
 * - POST /order-v3/stats - Pouze statistiky pro dashboard
 * - POST /order-v3/items - Detail položek objednávky (lazy loading)
 * 
 * DŮLEŽITÉ: Zachovává DB názvy sloupců 1:1, žádné mappingy!
 */

const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');

/**
 * Načte seznam objednávek s paginací
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.page - Číslo stránky (výchozí: 1)
 * @param {number} params.per_page - Záznamů na stránku (výchozí: 50)
 * @param {number} params.year - Rok objednávek (výchozí: aktuální)
 * @param {Object} params.filters - Filtry (volitelné)
 * @param {Array} params.sorting - Třídění (volitelné)
 * @returns {Promise<Object>} Response s orders, pagination, stats
 */
export async function listOrdersV3({
  token,
  username,
  page = 1,
  per_page = 50,
  year = new Date().getFullYear(),
  filters = {},
  sorting = []
}) {
  const response = await fetch(`${API_BASE_URL}/order-v3/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      username,
      page,
      per_page,
      year,
      filters,
      sorting
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Načte pouze statistiky objednávek (lehký endpoint pro dashboard refresh)
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.year - Rok objednávek (výchozí: aktuální)
 * @returns {Promise<Object>} Response se statistikami
 */
export async function getOrderStatsV3({
  token,
  username,
  year = new Date().getFullYear()
}) {
  const response = await fetch(`${API_BASE_URL}/order-v3/stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      username,
      year
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Načte položky a detail objednávky (lazy loading)
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.order_id - ID objednávky
 * @returns {Promise<Object>} Response s items, attachments, notes
 */
export async function getOrderItemsV3({
  token,
  username,
  order_id
}) {
  const response = await fetch(`${API_BASE_URL}/order-v3/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      username,
      order_id
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

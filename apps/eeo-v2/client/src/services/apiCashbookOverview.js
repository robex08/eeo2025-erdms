/**
 * API funkce pro Cashbook Overview (Přehled pokladen)
 * Datum: 2026-03-30
 * 
 * Endpointy:
 * - POST /cashbook-overview/list    - Přehled pokladních knih s agregací
 * - POST /cashbook-overview/entries - Detail položek knihy (pro expand)
 * 
 * DŮLEŽITÉ: Zachovává DB názvy sloupců 1:1, žádné mappingy!
 */

const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');

/**
 * Načíst přehled pokladních knih pro reporty
 * @param {Object} params
 * @param {string} params.username - Uživatelské jméno
 * @param {string} params.token - Autentizační token 
 * @param {number} params.rok - Rok (required)
 * @param {number|null} params.mesic - Měsíc 1-12 nebo null pro celý rok
 * @param {number[]} params.pokladna_ids - Pole ID pokladen pro filtrování (optional)
 * @param {string} params.stav_knihy - Filtr podle stavu knihy (optional)
 * @returns {Promise<Object>} - { books: Array, summary: Object, filters: Object }
 */
export async function getCashbookOverview({
  username,
  token,
  rok,
  mesic = null,
  pokladna_ids = null,
  stav_knihy = null
}) {
  const url = `${API_BASE_URL}/cashbook-overview/list`;
  const payload = {
    username,
    token,
    rok,
    mesic,
    pokladna_ids,
    stav_knihy
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const responseData = await response.json();
  
  if (responseData.status === 'error') {
    throw new Error(responseData.message || 'Chyba při načítání přehledu pokladen');
  }

  return responseData;
}

/**
 * Načíst položky pokladní knihy pro expand funkci
 * @param {Object} params
 * @param {string} params.username - Uživatelské jméno
 * @param {string} params.token - Autentizační token
 * @param {number} params.kniha_id - ID pokladní knihy
 * @param {number} params.page - Stránka (default: 1)
 * @param {number} params.limit - Počet záznamů na stránku (default: 50)
 * @returns {Promise<Object>} - { entries: Array, pagination: Object }
 */
export async function getCashbookOverviewEntries({
  username,
  token,
  kniha_id,
  page = 1,
  limit = 50
}) {
  const response = await fetch(`${API_BASE_URL}/cashbook-overview/entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      token,
      kniha_id,
      page,
      limit
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const responseData = await response.json();
  
  if (responseData.status === 'error') {
    throw new Error(responseData.message || 'Chyba při načítání položek pokladní knihy');
  }

  return responseData;
}

/**
 * DOCX Orders API Service
 * Speciální endpoint pro načítání dat objednávek pro DOCX generování
 *
 * Endpoint: POST /api.eeo/sablona_docx/order-data
 * Datum: 22. října 2025
 *
 * Klíčové vlastnosti:
 * - Bez ID polí (pro čistší DOCX šablony)
 * - Boolean jako "ano"/"" místo true/false
 * - Null hodnoty jako prázdné stringy
 * - Vnořené objekty (objednatel, dodavatel, stav)
 * - DOCX template přátelské formáty
 */

import axios from 'axios';

// Axios instance pro DOCX order data endpoint
const apiDocxOrders = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Response interceptor pro error handling
apiDocxOrders.interceptors.response.use(
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
    // 🚫 403 Forbidden - permission error → NEODHLAŠOVAT

    // Check for HTML response (login page instead of JSON)
    const responseText = error.response?.data || '';
    if (typeof responseText === 'string' && responseText.includes('<!doctype')) {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('authError', {
          detail: { message: 'Vaše přihlášení vypršelo. Obnovte stránku a přihlaste se znovu.' }
        });
        window.dispatchEvent(event);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Normalize error messages from API responses
 */
export function normalizeDocxOrdersError(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.err) return err.response.data.err;
  if (err.response?.data) return err.response.data;
  if (err.message) return err.message;
  return 'Neznámá chyba při komunikaci se serverem';
}

/**
 * Získá data objednávky optimalizovaná pro DOCX generování
 *
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentifikační token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.objednavka_id - ID objednávky
 * @returns {Promise<Object>} - DOCX přátelská data objednávky
 */
export async function getDocxOrderData({ token, username, objednavka_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (objednavka_id === null || objednavka_id === undefined) {
    throw new Error('Chybí ID objednávky.');
  }

  try {
    const payload = {
      token,
      username,
      objednavka_id: parseInt(objednavka_id)
    };

    const response = await apiDocxOrders.post('sablona_docx/order-data', payload, { timeout: 8000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při načítání DOCX dat objednávky';
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      throw new Error(data.err);
    }

    if (data.status === 'ok' && data.data) {
      return data.data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    console.error('❌ Chyba při načítání DOCX order data:', error);
    throw new Error(normalizeDocxOrdersError(error));
  }
}

/**
 * 🆕 NOVÝ ENDPOINT - Získá ENRICHED data objednávky pro DOCX generování
 * 
 * Tento endpoint vrací KOMPLETNÍ data včetně:
 * - Enriched uživatelských objektů (s lokalitami, telefony, emaily)
 * - Vypočítaných hodnot (ceny, DPH, kombinace jmen)
 * - Seznamu uživatelů pro výběr podpisu
 * - Položek a příloh objednávky
 *
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentifikační token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.objednavka_id - ID objednávky
 * @returns {Promise<Object>} - Kompletní enriched data
 * 
 * @see docs/DOCX-ENRICHED-ENDPOINT-SPEC.md
 */
export async function getDocxOrderEnrichedData({ token, username, objednavka_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (objednavka_id === null || objednavka_id === undefined) {
    throw new Error('Chybí ID objednávky.');
  }

  try {
    const payload = {
      token,
      username,
      objednavka_id: parseInt(objednavka_id)
    };

    const response = await apiDocxOrders.post(
      'sablona_docx/order-enriched-data', 
      payload, 
      { timeout: 10000 }
    );

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi při načítání enriched dat');
    }

    const data = response.data;

    if (data.err) {
      throw new Error(data.err);
    }

    if (data.status === 'ok' && data.data) {
      return data.data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    console.error('❌ Chyba při načítání DOCX enriched data:', error);
    throw new Error(normalizeDocxOrdersError(error));
  }
}

/**
 * Testovací funkce pro ověření struktury dat
 */
export function validateDocxOrderData(orderData) {
  const requiredFields = [
    'cislo_objednavky',
    'nazev_objednavky',
    'objednatel',
    'dodavatel',
    'stav',
    'polozky',
    'celkova_cena_s_dph'
  ];

  const missingFields = requiredFields.filter(field => !orderData[field]);

  if (missingFields.length > 0) {
    console.warn('⚠️ Chybějící pole v DOCX order data:', missingFields);
    return false;
  }

  // Kontrola vnořených objektů
  if (!orderData.objednatel?.plne_jmeno) {
    console.warn('⚠️ Chybí objednatel.plne_jmeno v DOCX order data');
    return false;
  }

  if (!orderData.dodavatel?.nazev) {
    console.warn('⚠️ Chybí dodavatel.nazev v DOCX order data');
    return false;
  }

  return true;
}

export default {
  getDocxOrderData,
  getDocxOrderEnrichedData, // 🆕 NOVÁ FUNKCE
  validateDocxOrderData,
  normalizeDocxOrdersError
};
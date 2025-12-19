/**
 * 📋 SPISOVKA ZPRACOVÁNÍ API Service
 *
 * Frontend API klient pro Spisovka Processing Tracking System.
 * Sleduje zpracované dokumenty ze Spisovka InBox - umožňuje účetním
 * označit dokumenty jako zpracované a zobrazit statistiky.
 *
 * Backend endpointy: /api.eeo/spisovka-zpracovani/*
 * Verze: v1.0.0
 * Datum: 19. prosince 2025
 *
 * ✅ Podle OrderV2 konvencí:
 * - POST metody s username/token v body
 * - Standardizovaný error handling
 * - Response format: {status, data, meta}
 */

import axios from 'axios';

// Axios instance pro Spisovka Zpracování API
const apiSpisovkaZpracovani = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Response interceptor pro error handling
apiSpisovkaZpracovani.interceptors.response.use(
  (response) => response,
  (error) => {
    // Authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('authError', {
          detail: { message: 'Vaše přihlášení vypršelo. Přihlaste se prosím znovu.' }
        });
        window.dispatchEvent(event);
      }
    }

    // HTML response instead of JSON (login page)
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
 * 🔧 Helper: Normalize error messages
 */
export function normalizeError(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.err) return err.response.data.err;
  if (err.message) return err.message;
  return 'Neznámá chyba';
}

/**
 * 📋 GET Seznam zpracovaných dokumentů
 * 
 * @param {Object} params - Parametry dotazu
 * @param {string} params.username - Username (required)
 * @param {string} params.token - Auth token (required)
 * @param {number} [params.uzivatel_id] - Filtr podle uživatele
 * @param {string} [params.stav] - Filtr podle stavu (ZAEVIDOVANO|NENI_FAKTURA|CHYBA|DUPLIKAT)
 * @param {string} [params.datum_od] - Filtr od data (YYYY-MM-DD)
 * @param {string} [params.datum_do] - Filtr do data (YYYY-MM-DD)
 * @param {number} [params.limit=100] - Počet záznamů
 * @param {number} [params.offset=0] - Offset pro stránkování
 * @returns {Promise<Object>} Response {status, data[], meta}
 */
export async function getSpisovkaZpracovaniList({
  username,
  token,
  uzivatel_id = null,
  stav = null,
  datum_od = null,
  datum_do = null,
  limit = 100,
  offset = 0
}) {
  try {
    const response = await apiSpisovkaZpracovani.post('/spisovka-zpracovani/list', {
      username,
      token,
      uzivatel_id,
      stav,
      datum_od,
      datum_do,
      limit,
      offset
    });
    
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * 📊 GET Statistiky zpracování dokumentů
 * 
 * @param {Object} params - Parametry dotazu
 * @param {string} params.username - Username (required)
 * @param {string} params.token - Auth token (required)
 * @param {number} [params.uzivatel_id] - Stats pro konkrétního uživatele
 * @param {string} [params.datum_od] - Filtr od data (YYYY-MM-DD)
 * @param {string} [params.datum_do] - Filtr do data (YYYY-MM-DD)
 * @returns {Promise<Object>} Response {status, data: {celkem, podle_stavu, prumerna_doba_zpracovani_s, ...}, meta}
 */
export async function getSpisovkaZpracovaniStats({
  username,
  token,
  uzivatel_id = null,
  datum_od = null,
  datum_do = null
}) {
  try {
    const response = await apiSpisovkaZpracovani.post('/spisovka-zpracovani/stats', {
      username,
      token,
      uzivatel_id,
      datum_od,
      datum_do
    });
    
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * ✅ POST Označit dokument jako zpracovaný
 * 
 * Automaticky voláno po úspěšném zavedení faktury ze Spisovka dokumentu.
 * 
 * @param {Object} params - Parametry
 * @param {string} params.username - Username (required)
 * @param {string} params.token - Auth token (required)
 * @param {number} params.dokument_id - ID dokumentu ze Spisovky (required)
 * @param {number} [params.faktura_id] - ID vytvořené faktury
 * @param {string} [params.fa_cislo_vema] - Číslo faktury
 * @param {string} [params.stav='ZAEVIDOVANO'] - Stav (ZAEVIDOVANO|NENI_FAKTURA|CHYBA|DUPLIKAT)
 * @param {string} [params.poznamka] - Poznámka k zpracování
 * @param {number} [params.doba_zpracovani_s] - Doba zpracování v sekundách
 * @returns {Promise<Object>} Response {status, message, data: {id, dokument_id, uzivatel_id, stav}, meta}
 */
export async function markSpisovkaDocumentProcessed({
  username,
  token,
  dokument_id,
  faktura_id = null,
  fa_cislo_vema = null,
  stav = 'ZAEVIDOVANO',
  poznamka = null,
  doba_zpracovani_s = null
}) {
  try {
    const response = await apiSpisovkaZpracovani.post('/spisovka-zpracovani/mark', {
      username,
      token,
      dokument_id,
      faktura_id,
      fa_cislo_vema,
      stav,
      poznamka,
      doba_zpracovani_s
    });
    
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * ✅ POST Hromadné označení dokumentů jako zpracovaných
 * 
 * Umožňuje označit více dokumentů najednou (např. při bulk import).
 * 
 * @param {Object} params - Parametry
 * @param {string} params.username - Username (required)
 * @param {string} params.token - Auth token (required)
 * @param {Array<Object>} params.documents - Pole dokumentů k označení
 * @param {number} params.documents[].dokument_id - ID dokumentu
 * @param {number} [params.documents[].faktura_id] - ID faktury
 * @param {string} [params.documents[].fa_cislo_vema] - Číslo faktury
 * @param {string} [params.documents[].stav] - Stav
 * @returns {Promise<Object>} Response s počtem úspěšných/neúspěšných
 */
export async function markMultipleSpisovkaDocuments({
  username,
  token,
  documents
}) {
  try {
    // Backend zatím nemá bulk endpoint, voláme jednotlivě
    const results = await Promise.allSettled(
      documents.map(doc => 
        markSpisovkaDocumentProcessed({
          username,
          token,
          ...doc
        })
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      status: 'ok',
      data: {
        total: documents.length,
        successful,
        failed,
        results
      }
    };
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * 🔍 Helper: Zkontrolovat zda dokument už byl zpracován
 * 
 * @param {number} dokument_id - ID dokumentu
 * @param {string} username - Username
 * @param {string} token - Auth token
 * @returns {Promise<boolean>} True pokud už byl zpracován
 */
export async function isDocumentProcessed(dokument_id, username, token) {
  try {
    const response = await getSpisovkaZpracovaniList({
      username,
      token,
      limit: 1,
      offset: 0
    });
    
    if (response.status === 'ok' && response.data) {
      return response.data.some(item => item.dokument_id === dokument_id);
    }
    
    return false;
  } catch (err) {
    console.warn('Chyba při kontrole zpracovaného dokumentu:', err);
    return false;
  }
}

export default {
  getSpisovkaZpracovaniList,
  getSpisovkaZpracovaniStats,
  markSpisovkaDocumentProcessed,
  markMultipleSpisovkaDocuments,
  isDocumentProcessed,
  normalizeError
};

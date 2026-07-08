/* eslint-disable no-unused-vars */
import axios from 'axios';

/**
 * INVOICES25 ATTACHMENTS API Service
 * Implementace podle BE dokumentace - Invoice Attachments API
 * Verze: v2025.03_25
 * Datum: 27. října 2025
 *
 * Endpointy:
 * 1. invoices25/attachments/upload - Upload přílohy faktury
 * 2. invoices25/attachments/by-invoice - Seznam příloh faktury
 * 3. invoices25/attachments/by-order - Seznam příloh všech faktur objednávky
 * 4. invoices25/attachments/by-id - Detail přílohy
 * 5. invoices25/attachments/download - Download přílohy
 * 6. invoices25/attachments/update - Aktualizace metadat
 * 7. invoices25/attachments/delete - Smazání přílohy
 */

// Reuse axios instance from api25orders
const api25invoices = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});
const invoices25RequestCache = new Map();
const invoices25InFlight = new Map();
const INVOICES25_CACHE_TTL_MS = 15000;

const startDevTimer = () => () => {};

const getInvoices25CacheKey = (payload) => JSON.stringify(payload);

const getCachedInvoices25Response = (cacheKey) => {
  const cached = invoices25RequestCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    invoices25RequestCache.delete(cacheKey);
    return null;
  }
  return cached.value;
};

const storeCachedInvoices25Response = (cacheKey, value) => {
  invoices25RequestCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + INVOICES25_CACHE_TTL_MS
  });
};

// Response interceptor to handle token expiration
api25invoices.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🚨 TEMPORARY FIX: Disable auto-logout for delete invoice endpoint
    // Důvod: BE může vrátit 403 pro permission check (není to auth issue)
    const isDeleteInvoice = (
      (error.config?.url?.includes('/invoices/') && error.config?.url?.includes('/delete')) ||
      (String(error.config?.method || '').toLowerCase() === 'delete' && error.config?.url?.includes('order-v2/invoices'))
    );

    if (isDeleteInvoice) {
      // Vrátit error BEZ triggeru authError event
      return Promise.reject(error);
    }

    // 🔐 401 Unauthorized - token expired → logout
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('authError', {
          detail: { message: 'Vaše přihlášení vypršelo. Přihlaste se prosím znovu.' }
        });
        window.dispatchEvent(event);
      }
    }
    // 🚫 403 Forbidden - permission error → NEODHLAŠOVAT, normalizeApi25InvoicesError to ošetří

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
export function normalizeApi25InvoicesError(err) {
  // ⚠️ 403 Forbidden by neměl vyvolat odhlášení - pouze zobrazit chybu
  if (err.response?.status === 403) {
    const msg = err.response?.data?.message || err.response?.data?.error || 'Nemáte oprávnění k této akci';
    return msg; // Nevrátíme "Vaše přihlášení vypršelo"
  }
  
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.err) return err.response.data.err;
  if (err.response?.data) {
    if (typeof err.response.data === 'string') return err.response.data;
  }
  if (err.message) return err.message;
  return 'Neočekávaná chyba při komunikaci se serverem';
}

/**
 * Get user-friendly error message from API error
 */
export function getUserErrorMessage25Invoices(err) {
  return normalizeApi25InvoicesError(err);
}

// ===================================================================
// 1. UPLOAD - Nahrání přílohy faktury
// ===================================================================

/**
 * Upload přílohy k faktuře
 *
 * ✅ NOVÁ ORDER V2 API STRUKTURA (27.10.2025)
 * POST /order-v2/invoices/{invoice_id}/attachments/upload
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.faktura_id - ID faktury (invoice_id v URL)
 * @param {number|string} params.objednavka_id - ID objednávky (order_id v body)
 * @param {string} params.typ_prilohy - Typ přílohy (FAKTURA, ISDOC, DOPLNEK_FA)
 * @param {File} params.file - Soubor k nahrání
 * @returns {Promise<Object>} Response s detaily nahrané přílohy
 */
export async function uploadInvoiceAttachment25({
  token,
  username,
  faktura_id,
  objednavka_id,
  typ_prilohy,
  file
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!faktura_id) {
    throw new Error('Chybí ID faktury.');
  }

  // objednavka_id je nepovinné pro standalone faktury
  // if (!objednavka_id) {
  //   throw new Error('Chybí ID objednávky.');
  // }

  if (!typ_prilohy) {
    throw new Error('Chybí typ přílohy.');
  }

  if (!file || !(file instanceof File)) {
    throw new Error('Chybí soubor k nahrání.');
  }

  try {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('username', username);

    // 🔧 WORKAROUND: BE endpoint potřebuje user_id explicitně (stejně jako createInvoiceWithAttachment25)
    const userId = localStorage.getItem('user_id');
    if (userId) {
      formData.append('user_id', userId);
    }

    // ✅ order_id je nepovinné pro standalone faktury (backend může vyžadovat prázdný string)
    formData.append('order_id', objednavka_id ? String(objednavka_id) : '');
    formData.append('typ_prilohy', typ_prilohy);
    formData.append('file', file);

    // ✅ NOVÁ URL STRUKTURA: /order-v2/invoices/{invoice_id}/attachments/upload
    const response = await api25invoices.post(
      `order-v2/invoices/${faktura_id}/attachments/upload`,
      formData,
      {
        timeout: 60000, // 60s pro velké soubory
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (response.status !== 200 && response.status !== 201) {
      const error = `Neočekávaný kód odpovědi při uploadu přílohy faktury: ${response.status}`;
      throw new Error(error);
    }

    const data = response.data;

    // ✅ ORDER V2 STANDARD: status === 'ok' (jediný podporovaný formát)
    if (data.status === 'ok') {
      return data;
    }

    // ❌ CHYBA: status === 'error'
    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při nahrávání přílohy faktury');
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// 2. LIST BY INVOICE - Seznam příloh faktury
// ===================================================================

/**
 * Seznam příloh pro konkrétní fakturu
 *
 * ✅ NOVÁ ORDER V2 API STRUKTURA (27.10.2025)
 * GET /order-v2/invoices/{invoice_id}/attachments?order_id=X
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.faktura_id - ID faktury (invoice_id v URL)
 * @param {number|string} params.objednavka_id - ID objednávky (order_id v query string)
 * @returns {Promise<Object>} Response se seznamem příloh
 */
export async function listInvoiceAttachments25({ token, username, faktura_id, objednavka_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!faktura_id) {
    throw new Error('Chybí ID faktury.');
  }

  // ⚠️ objednavka_id není povinná - faktury mohou existovat samostatně (nový modul FA)

  // 🔍 DEBUG: Kontrola typu faktura_id
  if (typeof faktura_id === 'string' && faktura_id.includes('{')) {
    throw new Error('Neplatné ID faktury - placeholder nebyl nahrazen');
  }

  try {
    const payload = {
      token,
      username
    };

    // Pokud je objednavka_id poskytnutá, přidej ji do payloadu
    if (objednavka_id) {
      payload.order_id = Number(objednavka_id);
    }

    // ✅ NOVÁ URL STRUKTURA: POST /order-v2/invoices/{invoice_id}/attachments (token + username v BODY)
    const response = await api25invoices.post(
      `order-v2/invoices/${faktura_id}/attachments`,
      payload,
      {
        timeout: 10000
      }
    );

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při načítání příloh faktury';
      throw new Error(error);
    }

    const data = response.data;

    // ✅ NOVÁ STRUKTURA: { success: true, data: { attachments: [...] } }
    if (data.success === true) {
      return data;
    }

    // ✅ STARÁ STRUKTURA: { status: 'ok', ... } (backwards compatibility)
    if (data.status === 'ok') {
      return data;
    }

    // ❌ CHYBA - NOVÁ STRUKTURA: { success: false, error: "..." }
    if (data.success === false) {
      throw new Error(data.error || data.message || 'Chyba při načítání příloh faktury');
    }

    // ❌ CHYBA - STARÁ STRUKTURA: { status: 'error', message: "..." }
    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při načítání příloh faktury');
    }

    // Pokud není ani success ani status, je něco špatně
    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// 3. LIST BY ORDER - Seznam příloh všech faktur objednávky
// ===================================================================

/**
 * Seznam příloh všech faktur pro objednávku
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.objednavka_id - ID objednávky
 * @returns {Promise<Object>} Response se seznamem příloh
 */
export async function listOrderInvoiceAttachments25({ token, username, objednavka_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!objednavka_id) {
    throw new Error('Chybí ID objednávky.');
  }

  try {
    const payload = {
      token,
      username,
      objednavka_id: Number(objednavka_id)
    };


    const response = await api25invoices.post('invoices25/attachments/by-order', payload, {
      timeout: 10000
    });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při načítání příloh faktur objednávky';
      throw new Error(error);
    }

    const data = response.data;

    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při načítání příloh faktur objednávky');
    }

    if (data.status === 'ok') {
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// 4. GET BY ID - Detail přílohy
// ===================================================================

/**
 * Detail konkrétní přílohy faktury
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.priloha_id - ID přílohy
 * @returns {Promise<Object>} Response s detailem přílohy
 */
export async function getInvoiceAttachmentById25({ token, username, priloha_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!priloha_id) {
    throw new Error('Chybí ID přílohy.');
  }

  try {
    const payload = {
      token,
      username,
      priloha_id: Number(priloha_id)
    };


    const response = await api25invoices.post('invoices25/attachments/by-id', payload, {
      timeout: 10000
    });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při načítání detailu přílohy';
      throw new Error(error);
    }

    const data = response.data;

    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při načítání detailu přílohy');
    }

    if (data.status === 'ok') {
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// 5. DOWNLOAD - Stažení přílohy
// ===================================================================

/**
 * Download přílohy faktury
 *
 * ✅ ORDER V2 API (1.11.2025)
 * POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/download
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.faktura_id - ID faktury (invoice_id v URL)
 * @param {number|string} params.priloha_id - ID přílohy (attachment_id v URL)
 * @param {number|string} params.objednavka_id - ID objednávky (order_id v body - pro kontrolu přístupu)
 * @returns {Promise<Blob>} Binární data souboru
 */
export async function downloadInvoiceAttachment25({ token, username, faktura_id, priloha_id, objednavka_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!faktura_id) {
    throw new Error('Chybí ID faktury.');
  }

  if (!priloha_id) {
    throw new Error('Chybí ID přílohy.');
  }

  // ✅ objednavka_id není nutné pro standalone faktury
  // if (!objednavka_id) {
  //   throw new Error('Chybí ID objednávky.');
  // }

  try {

    const payload = {
      token,
      username
    };

    // ✅ Přidat order_id jen pokud je k dispozici
    if (objednavka_id) {
      payload.order_id = Number(objednavka_id);
    }
    // ✅ Přidat order_id jen pokud je k dispozici
    if (objednavka_id) {
      payload.order_id = Number(objednavka_id);
    }

    // ✅ ORDER V2 API: POST s token + username + order_id v BODY
    const response = await api25invoices.post(
      `order-v2/invoices/${faktura_id}/attachments/${priloha_id}/download`,
      payload,
      {
        timeout: 30000,
        responseType: 'blob'
      }
    );

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při stahování přílohy';
      throw new Error(error);
    }

    return response.data;

  } catch (error) {
    // Blob error response - parsuj JSON a extrahuj message
    if (error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      
      let errorMessage = text;
      try {
        const data = JSON.parse(text);
        errorMessage = data.message || data.err || data.error || text;
      } catch (parseError) {
        // Pokud JSON parse selže, použij raw text
      }
      
      throw new Error(errorMessage || 'Nepodařilo se stáhnout přílohu faktury');
    }
    
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// 6. UPDATE - Aktualizace metadat přílohy
// ===================================================================

/**
 * Aktualizace metadat přílohy faktury
 *
 * ✅ ORDER V2 API (1.11.2025)
 * PUT/POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.faktura_id - ID faktury (invoice_id v URL)
 * @param {number|string} params.priloha_id - ID přílohy (attachment_id v URL)
 * @param {number|string} params.objednavka_id - ID objednávky (order_id v body)
 * @param {string} [params.typ_prilohy] - Nový typ přílohy
 * @param {string} [params.originalni_nazev_souboru] - Nový název souboru
 * @returns {Promise<Object>} Response s aktualizovanými daty
 */
export async function updateInvoiceAttachment25({
  token,
  username,
  faktura_id,
  priloha_id,
  objednavka_id,
  typ_prilohy,
  type,  // ✅ Přidán parametr 'type' (má přednost před typ_prilohy)
  originalni_nazev_souboru,
  original_name  // ✅ Anglická verze názvu souboru
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!faktura_id) {
    throw new Error('Chybí ID faktury.');
  }

  if (!priloha_id) {
    throw new Error('Chybí ID přílohy.');
  }

  // ✅ objednavka_id není nutné pro standalone faktury
  // if (!objednavka_id) {
  //   throw new Error('Chybí ID objednávky.');
  // }

  try {
    const payload = {
      token,
      username
    };

    // ✅ Přidat order_id jen pokud je k dispozici
    if (objednavka_id) {
      payload.order_id = Number(objednavka_id);
    }

    // ✅ Preferuj 'type' (anglicky) pokud je poslaný, jinak 'typ_prilohy' (česky)
    if (type) {
      payload.type = type;
    } else if (typ_prilohy) {
      payload.typ_prilohy = typ_prilohy;
    }

    // ✅ Preferuj 'original_name' (anglicky) pokud je poslaný
    if (original_name) {
      payload.original_name = original_name;
    } else if (originalni_nazev_souboru) {
      payload.originalni_nazev_souboru = originalni_nazev_souboru;
    }

    // ✅ ORDER V2 API: POST (podporuje i PUT) /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update
    const response = await api25invoices.post(
      `order-v2/invoices/${faktura_id}/attachments/${priloha_id}/update`,
      payload,
      {
        timeout: 10000
      }
    );

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při aktualizaci přílohy';
      throw new Error(error);
    }

    const data = response.data;

    // ✅ NOVÁ STRUKTURA: { success: true, message: "...", attachment: {...} }
    if (data.success === true) {
      return data;
    }

    // ✅ STARÁ STRUKTURA: { status: 'ok', ... } (backwards compatibility)
    if (data.status === 'ok') {
      return data;
    }

    // ❌ CHYBA - NOVÁ STRUKTURA: { success: false, error: "..." }
    if (data.success === false) {
      throw new Error(data.error || data.message || 'Chyba při aktualizaci přílohy');
    }

    // ❌ CHYBA - STARÁ STRUKTURA: { status: 'error', message: "..." }
    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při aktualizaci přílohy');
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    // 🔍 DEBUG: Zobrazit celou error response z backendu
    if (error.response) {
      console.error('❌ Backend error response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// 7. DELETE - Smazání přílohy
// ===================================================================

/**
 * Smazání přílohy faktury
 *
 * ✅ NOVÁ ORDER V2 API STRUKTURA (1.11.2025)
 * DELETE /order-v2/invoices/{invoice_id}/attachments/{attachment_id}
 * POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id} (s _method: DELETE)
 *
 * **SOFT DELETE (default):**
 * - Nastaví `deleted = 1`, `dt_deleted = NOW()` v DB
 * - Fyzický soubor zůstává na disku (pro audit)
 * - Příloha se nezobrazuje v seznamech
 *
 * **HARD DELETE:**
 * - Fyzicky smaže soubor z disku
 * - Smaže záznam z databáze
 * - Nevratná operace!
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.faktura_id - ID faktury (invoice_id v URL)
 * @param {number|string} params.priloha_id - ID přílohy (attachment_id v URL)
 * @param {number|string} params.objednavka_id - ID objednávky (order_id v body)
 * @param {number} [params.hard_delete=0] - 0 = soft delete (default), 1 = hard delete (fyzické smazání souboru)
 * @returns {Promise<Object>} Response s potvrzením smazání
 *
 * @example
 * // Soft delete (default)
 * await deleteInvoiceAttachment25({
 *   token, username,
 *   faktura_id: 123,
 *   priloha_id: 456,
 *   objednavka_id: 789
 * });
 *
 * @example
 * // Hard delete (fyzické smazání)
 * await deleteInvoiceAttachment25({
 *   token, username,
 *   faktura_id: 123,
 *   priloha_id: 456,
 *   objednavka_id: 789,
 *   hard_delete: 1
 * });
 */
export async function deleteInvoiceAttachment25({ token, username, faktura_id, priloha_id, objednavka_id, hard_delete = 0 }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!faktura_id) {
    throw new Error('Chybí ID faktury.');
  }

  if (!priloha_id) {
    throw new Error('Chybí ID přílohy.');
  }

  // ✅ objednavka_id není nutné pro standalone faktury
  // if (!objednavka_id) {
  //   throw new Error('Chybí ID objednávky.');
  // }

  try {

    const payload = {
      token,
      username,
      hard_delete: Number(hard_delete), // ✅ 0 = soft delete, 1 = hard delete
      _method: 'DELETE' // ✅ Pro případy kdy server preferuje POST s _method
    };

    // ✅ Přidat order_id jen pokud je k dispozici
    if (objednavka_id) {
      payload.order_id = Number(objednavka_id);
    }

    // ✅ NOVÁ URL STRUKTURA: POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/delete
    // Token, username a order_id posíláme v BODY
    const response = await api25invoices.post(
      `order-v2/invoices/${faktura_id}/attachments/${priloha_id}/delete`,
      payload,
      {
        timeout: 10000
      }
    );

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při mazání přílohy';
      throw new Error(error);
    }

    const data = response.data;

    // ✅ NOVÁ STRUKTURA: { success: true, message: "..." }
    if (data.success === true) {
      return data;
    }

    // ✅ STARÁ STRUKTURA: { status: 'ok', ... } (backwards compatibility)
    if (data.status === 'ok') {
      return data;
    }

    // ❌ CHYBA - NOVÁ STRUKTURA: { success: false, error: "..." }
    if (data.success === false) {
      throw new Error(data.error || data.message || 'Chyba při mazání přílohy');
    }

    // ❌ CHYBA - STARÁ STRUKTURA: { status: 'error', message: "..." }
    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při mazání přílohy');
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// 6. VERIFY - Ověření integrity příloh faktur
// ===================================================================

/**
 * Ověření integrity příloh konkrétní faktury
 *
 * Zkontroluje, zda všechny přílohy faktury existují na disku a odpovídají metadata v databázi
 *
 * ✅ ORDER V2 API STRUKTURA
 * POST /order-v2/invoices/{invoice_id}/attachments/verify
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.invoice_id - ID faktury (použije se v URL)
 * @param {number|string} params.objednavka_id - ID objednávky (posílá se v payload)
 * @returns {Promise<Object>} Response s výsledky verifikace
 *
 * @example
 * const result = await verifyInvoiceAttachments25({
 *   token,
 *   username,
 *   invoice_id: 9,        // ID konkrétní faktury
 *   objednavka_id: 11248  // ID objednávky (pro kontrolu práv)
 * });
 */
export async function verifyInvoiceAttachments25({ token, username, invoice_id, objednavka_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!invoice_id) {
    throw new Error('Chybí ID faktury pro ověření příloh.');
  }

  // objednavka_id je nepovinné pro standalone faktury
  // if (!objednavka_id) {
  //   throw new Error('Chybí ID objednávky pro ověření příloh.');
  // }

  try {
    const payload = {
      token,
      username
    };
    
    // ✅ objednavka_id je nepovinné pro standalone faktury
    if (objednavka_id) {
      payload.objednavka_id = Number(objednavka_id);
    }

    // ✅ SPRÁVNÁ URL STRUKTURA: POST /order-v2/invoices/{invoice_id}/attachments/verify
    // invoice_id je v URL (identifikuje fakturu)
    // objednavka_id je v payload (pro kontrolu práv)
    const response = await api25invoices.post(
      `order-v2/invoices/${invoice_id}/attachments/verify`,
      payload,
      {
        timeout: 15000
      }
    );

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při ověřování příloh';
      throw new Error(error);
    }

    const data = response.data;

    // ✅ NOVÁ STRUKTURA: { success: true, summary: {...}, attachments: [...] }
    if (data.success === true) {
      return data;
    }

    // ✅ STARÁ STRUKTURA: { status: 'ok', data: {...} } (backwards compatibility)
    if (data.status === 'ok') {
      return data.data || data;
    }

    // ❌ CHYBA - NOVÁ STRUKTURA: { success: false, error: "..." }
    if (data.success === false) {
      throw new Error(data.error || data.message || 'Chyba při ověřování příloh');
    }

    // ❌ CHYBA - STARÁ STRUKTURA: { status: 'error', message: "..." }
    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při ověřování příloh');
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Validace typu souboru (frontend check)
 */
export function isAllowedInvoiceFileType(filename) {
  const allowedExtensions = ['pdf', 'isdoc', 'jpg', 'jpeg', 'png', 'xml', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'];
  const ext = filename.split('.').pop().toLowerCase();
  return allowedExtensions.includes(ext);
}

/**
 * Validace velikosti souboru (frontend check)
 */
export function isAllowedInvoiceFileSize(fileSize) {
  const maxSize = 10 * 1024 * 1024; // 10 MB
  return fileSize <= maxSize;
}

/**
 * Detekce ISDOC formátu (frontend check)
 */
export function isISDOCFile(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ext === 'isdoc';
}

/**
 * Formátování velikosti souboru
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===================================================================
// 🆕 ATOMICKÉ VYTVOŘENÍ FAKTURY + PŘÍLOHY
// ===================================================================

/**
 * Atomické vytvoření faktury včetně přílohy v jedné transakci
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.objednavka_id - ID objednávky (POVINNÉ)
 * @param {string} params.fa_castka - Částka faktury (POVINNÉ)
 * @param {string} params.fa_cislo_vema - Číslo faktury (POVINNÉ)
 * @param {File} params.file - Soubor k nahrání (POVINNÉ)
 * @param {number} [params.fa_dorucena=0] - Příznak doručení (0/1)
 * @param {string} [params.fa_datum_vystaveni] - Datum vystavení (YYYY-MM-DD nebo null)
 * @param {string} [params.fa_datum_splatnosti] - Datum splatnosti (YYYY-MM-DD nebo null)
 * @param {string} [params.fa_datum_doruceni] - Datum doručení (YYYY-MM-DD nebo null)
 * @param {string} [params.fa_strediska_kod] - Kód střediska (string nebo null)
 * @param {string} [params.fa_poznamka] - Poznámka (text nebo null)
 * @param {string} [params.typ_prilohy='ISDOC'] - Typ přílohy
 * @param {Object} [params.rozsirujici_data] - JSON objekt s dalšími daty
 * @returns {Promise<Object>} Response s detaily faktury + přílohy
 *
 * @example
 * const result = await createInvoiceWithAttachment25({
 *   token: userToken,
 *   username: 'admin',
 *   objednavka_id: 11165,
 *   fa_castka: '12500.00',
 *   fa_cislo_vema: '2025/001',
 *   fa_datum_vystaveni: '2025-01-15',
 *   fa_datum_splatnosti: '2025-02-14',
 *   fa_poznamka: 'Importováno z ISDOC',
 *   file: isdocFile,
 *   typ_prilohy: 'ISDOC'
 * });
 * // result.faktura_id - ID nově vytvořené faktury
 * // result.priloha_id - ID nově nahrané přílohy
 */
export async function createInvoiceWithAttachment25({
  token,
  username,
  objednavka_id,
  fa_castka,
  fa_cislo_vema,
  file,
  fa_dorucena = 0,
  fa_datum_vystaveni = null,
  fa_datum_splatnosti = null,
  fa_datum_doruceni = null,
  fa_strediska_kod = null,
  fa_poznamka = null,
  typ_prilohy = 'ISDOC',
  rozsirujici_data = null
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!objednavka_id) {
    throw new Error('Chybí ID objednávky.');
  }

  if (!fa_castka) {
    throw new Error('Chybí částka faktury.');
  }

  if (!fa_cislo_vema) {
    throw new Error('Chybí číslo faktury.');
  }

  if (!file || !(file instanceof File)) {
    throw new Error('Chybí soubor k nahrání.');
  }

  try {
    const formData = new FormData();

    // Autorizace
    formData.append('token', token);
    formData.append('username', username);

    // 🔧 WORKAROUND: BE endpoint potřebuje user_id explicitně
    const userId = localStorage.getItem('user_id');
    if (userId) {
      formData.append('user_id', userId);
    }

    // Povinné údaje faktury
    formData.append('objednavka_id', String(objednavka_id));
    formData.append('fa_castka', String(fa_castka));
    formData.append('fa_cislo_vema', String(fa_cislo_vema));

    // Volitelné údaje faktury
    formData.append('fa_dorucena', String(fa_dorucena));

    if (fa_datum_vystaveni) {
      formData.append('fa_datum_vystaveni', fa_datum_vystaveni);
    }

    if (fa_datum_splatnosti) {
      formData.append('fa_datum_splatnosti', fa_datum_splatnosti);
    }

    if (fa_datum_doruceni) {
      formData.append('fa_datum_doruceni', fa_datum_doruceni);
    }

    if (fa_strediska_kod) {
      formData.append('fa_strediska_kod', String(fa_strediska_kod));
    }

    if (fa_poznamka) {
      formData.append('fa_poznamka', String(fa_poznamka));
    }

    if (rozsirujici_data) {
      formData.append('rozsirujici_data', JSON.stringify(rozsirujici_data));
    }

    // Příloha
    formData.append('file', file);
    formData.append('typ_prilohy', typ_prilohy);

    const response = await api25invoices.post('invoices25/create-with-attachment', formData, {
      timeout: 60000, // 60s pro velké soubory
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.status !== 200 && response.status !== 201) {
      const error = `Neočekávaný kód odpovědi: ${response.status}`;
      throw new Error(error);
    }

    const data = response.data;

    if (data.status === 'error' || data.err) {
      const errorMsg = data.message || data.err || 'Chyba při vytváření faktury s přílohou';
      throw new Error(errorMsg);
    }

    if (data.status === 'ok') {
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// SMAZÁNÍ FAKTURY
// ===================================================================

/**
 * Smazání faktury z databáze
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.faktura_id - ID faktury ke smazání
 * @returns {Promise<Object>} Response s potvrzením smazání
 */
export async function deleteInvoice25({ token, username, faktura_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!faktura_id) {
    throw new Error('Chybí ID faktury.');
  }

  try {
    const payload = {
      token,
      username,
      id: Number(faktura_id), // Backend očekává "id", ne "faktura_id"
      hard_delete: 1 // Vždy hard delete (prozatím, později podle práv)
    };


    const response = await api25invoices.post(`order-v2/invoices/${faktura_id}/delete`, payload, {
      timeout: 10000
    });


    if (response.status !== 200 && response.status !== 201) {
      const error = 'Neočekávaný kód odpovědi při mazání faktury';
      throw new Error(error);
    }

    const data = response.data;

    // Kontrola různých formátů odpovědi
    if (data.status === 'error' || data.err || data.error) {
      const errorMsg = data.message || data.err || data.error || 'Chyba při mazání faktury';
      throw new Error(errorMsg);
    }

    if (data.status === 'ok' || data.success === true || response.status === 200) {
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {

    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// ORDER V2 INVOICE API (NEW - 31.10.2025)
// ===================================================================

/**
 * Vytvoření faktury s přílohou (atomic operation)
 *
 * Order V2 API: POST /api.eeo/order-v2/{order_id}/invoices/create-with-attachment
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.order_id - ID objednávky
 * @param {File} params.file - Soubor přílohy (povinný)
 * @param {string} params.fa_cislo_vema - Číslo faktury (povinné)
 * @param {string} params.fa_datum_vystaveni - Datum vystavení YYYY-MM-DD (povinné)
 * @param {string} params.fa_castka - Částka faktury (povinné)
 * @param {string} [params.fa_datum_splatnosti] - Datum splatnosti YYYY-MM-DD
 * @param {string} [params.fa_datum_doruceni] - Datum doručení YYYY-MM-DD
 * @param {number} [params.fa_dorucena] - Zda byla doručena (0/1)
 * @param {string} [params.fa_strediska_kod] - Kód střediska
 * @param {string} [params.fa_poznamka] - Poznámka k faktuře
 * @param {Object} [params.rozsirujici_data] - Rozšiřující JSON data
 * @returns {Promise<Object>} Response s invoice_id a attachment_id
 *
 * @example
 * const result = await createInvoiceWithAttachmentV2({
 *   token: userToken,
 *   username: 'admin',
 *   order_id: 123,
 *   fa_cislo_vema: 'FA-2025-001',
 *   fa_datum_vystaveni: '2025-10-31',
 *   fa_datum_splatnosti: '2025-11-30',
 *   fa_castka: '25000.00',
 *   file: selectedFile
 * });
 * // result.data.invoice_id - ID nově vytvořené faktury
 * // result.data.attachment_id - ID nově nahrané přílohy
 */
export async function createInvoiceWithAttachmentV2({
  token,
  username,
  order_id,
  smlouva_id = null,
  file,
  klasifikace = null, // Klasifikace přílohy (FAKTURA_TYP)
  fa_cislo_vema,
  fa_vema_kod = null,
  fa_typ = 'BEZNA',
  fa_datum_vystaveni,
  fa_castka,
  fa_datum_splatnosti = null,
  fa_datum_doruceni = null,
  fa_dorucena = 0,
  fa_strediska_kod = null,
  fa_poznamka = null,
  rozsirujici_data = null,
  // Věcná správnost (nové fieldy)
  potvrzeni_vecne_spravnosti = null,
  vecna_spravnost_umisteni_majetku = null,
  vecna_spravnost_poznamka = null,
  // Předání zaměstnanci (nové fieldy)
  fa_predana_zam_id = null,
  fa_datum_predani_zam = null,
  fa_datum_vraceni_zam = null
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  // ✅ order_id je nyní NEPOVINNÉ - faktura může být bez objednávky

  if (!file || !(file instanceof File)) {
    throw new Error('Chybí soubor k nahrání.');
  }

  // Validace povinných polí
  if (!fa_cislo_vema) {
    throw new Error('Chybí číslo faktury (fa_cislo_vema).');
  }

  if (!fa_datum_vystaveni) {
    throw new Error('Chybí datum vystavení (fa_datum_vystaveni).');
  }

  if (!fa_castka) {
    throw new Error('Chybí částka faktury (fa_castka).');
  }

  try {
    const formData = new FormData();

    // Auth
    formData.append('username', username);
    formData.append('token', token);

    // Povinné fieldy
    formData.append('fa_cislo_vema', String(fa_cislo_vema));
    formData.append('fa_typ', String(fa_typ));
    formData.append('fa_datum_vystaveni', fa_datum_vystaveni);
    formData.append('fa_castka', String(fa_castka));

    // Volitelné fieldy
    if (fa_vema_kod) {
      formData.append('fa_vema_kod', String(fa_vema_kod));
    }
    
    if (fa_datum_splatnosti) {
      formData.append('fa_datum_splatnosti', fa_datum_splatnosti);
    }

    if (fa_datum_doruceni) {
      formData.append('fa_datum_doruceni', fa_datum_doruceni);
    }

    formData.append('fa_dorucena', String(fa_dorucena));

    if (fa_strediska_kod) {
      formData.append('fa_strediska_kod', String(fa_strediska_kod));
    }

    if (fa_poznamka) {
      formData.append('fa_poznamka', String(fa_poznamka));
    }

    if (rozsirujici_data) {
      formData.append('rozsirujici_data', JSON.stringify(rozsirujici_data));
    }

    // Věcná správnost
    if (potvrzeni_vecne_spravnosti) {
      formData.append('potvrzeni_vecne_spravnosti', potvrzeni_vecne_spravnosti);
    }

    if (vecna_spravnost_umisteni_majetku) {
      formData.append('vecna_spravnost_umisteni_majetku', String(vecna_spravnost_umisteni_majetku));
    }

    if (vecna_spravnost_poznamka) {
      formData.append('vecna_spravnost_poznamka', String(vecna_spravnost_poznamka));
    }

    // Předání zaměstnanci
    if (fa_predana_zam_id) {
      formData.append('fa_predana_zam_id', String(fa_predana_zam_id));
    }

    if (fa_datum_predani_zam) {
      formData.append('fa_datum_predani_zam', fa_datum_predani_zam);
    }

    if (fa_datum_vraceni_zam) {
      formData.append('fa_datum_vraceni_zam', fa_datum_vraceni_zam);
    }

    // Smlouva (může být null)
    if (smlouva_id) {
      formData.append('smlouva_id', String(smlouva_id));
    }

    // Objednávka (může být null)
    if (order_id) {
      formData.append('objednavka_id', String(order_id));
    }

    // Soubor
    formData.append('file', file);

    // Klasifikace přílohy (typ přílohy)
    if (klasifikace) {
      formData.append('klasifikace', String(klasifikace));
    }

    // ✅ VŽDY použij V2 API - buď s order_id nebo standalone
    const endpoint = order_id 
      ? `order-v2/${order_id}/invoices/create-with-attachment`
      : 'order-v2/invoices/create-with-attachment'; // V2 standalone API

    const response = await api25invoices.post(
      endpoint,
      formData,
      {
        timeout: 60000,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (response.status !== 200 && response.status !== 201) {
      const error = `Neočekávaný kód odpovědi: ${response.status}`;
      throw new Error(error);
    }

    const data = response.data;

    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při vytváření faktury s přílohou');
    }

    if (data.status === 'ok') {
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

/**
 * Vytvoření faktury bez přílohy
 *
 * Order V2 API: POST /api.eeo/order-v2/{order_id}/invoices/create
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.order_id - ID objednávky
 * @param {string} params.fa_cislo_vema - Číslo faktury (povinné)
 * @param {string} params.fa_datum_vystaveni - Datum vystavení YYYY-MM-DD (povinné)
 * @param {string} params.fa_castka - Částka faktury (povinné)
 * @param {string} [params.fa_datum_splatnosti] - Datum splatnosti YYYY-MM-DD
 * @param {string} [params.fa_datum_doruceni] - Datum doručení YYYY-MM-DD
 * @param {number} [params.fa_dorucena] - Zda byla doručena (0/1)
 * @param {string} [params.fa_strediska_kod] - Kód střediska
 * @param {string} [params.fa_poznamka] - Poznámka k faktuře
 * @param {Object} [params.rozsirujici_data] - Rozšiřující JSON data
 * @returns {Promise<Object>} Response s invoice_id
 *
 * @example
 * const result = await createInvoiceV2({
 *   token: userToken,
 *   username: 'admin',
 *   order_id: 123,
 *   fa_cislo_vema: 'FA-2025-002',
 *   fa_datum_vystaveni: '2025-10-31',
 *   fa_datum_splatnosti: '2025-12-31',
 *   fa_castka: '15000.00'
 * });
 * // result.data.invoice_id - ID nově vytvořené faktury
 */
export async function createInvoiceV2({
  token,
  username,
  order_id,
  smlouva_id = null,
  fa_cislo_vema,
  fa_vema_kod = null,
  fa_typ = 'BEZNA',
  fa_datum_vystaveni,
  fa_castka,
  fa_datum_splatnosti = null,
  fa_datum_doruceni = null,
  fa_dorucena = 0,
  fa_strediska_kod = null,
  fa_poznamka = null,
  rozsirujici_data = null,
  // Věcná správnost (nové fieldy)
  potvrzeni_vecne_spravnosti = null,
  vecna_spravnost_umisteni_majetku = null,
  vecna_spravnost_poznamka = null,
  // Předání zaměstnanci (nové fieldy)
  fa_predana_zam_id = null,
  fa_datum_predani_zam = null,
  fa_datum_vraceni_zam = null
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  // ✅ order_id je nyní NEPOVINNÉ - faktura může být bez objednávky

  // Validace povinných polí
  if (!fa_cislo_vema) {
    throw new Error('Chybí číslo faktury (fa_cislo_vema).');
  }

  if (!fa_datum_vystaveni) {
    throw new Error('Chybí datum vystavení (fa_datum_vystaveni).');
  }

  if (!fa_castka) {
    throw new Error('Chybí částka faktury (fa_castka).');
  }

  try {
    const payload = {
      username,
      token,
      fa_cislo_vema: String(fa_cislo_vema),
      fa_typ: String(fa_typ),
      fa_datum_vystaveni,
      fa_castka: String(fa_castka),
      fa_dorucena: Number(fa_dorucena)
    };

    // Volitelné fieldy
    if (fa_vema_kod) {
      payload.fa_vema_kod = String(fa_vema_kod);
    }
    
    if (fa_datum_splatnosti) {
      payload.fa_datum_splatnosti = fa_datum_splatnosti;
    }

    if (fa_datum_doruceni) {
      payload.fa_datum_doruceni = fa_datum_doruceni;
    }

    if (fa_strediska_kod) {
      payload.fa_strediska_kod = String(fa_strediska_kod);
    }

    if (fa_poznamka) {
      payload.fa_poznamka = String(fa_poznamka);
    }

    if (rozsirujici_data) {
      payload.rozsirujici_data = rozsirujici_data;
    }

    // Věcná správnost
    if (potvrzeni_vecne_spravnosti) {
      payload.potvrzeni_vecne_spravnosti = potvrzeni_vecne_spravnosti;
    }

    if (vecna_spravnost_umisteni_majetku) {
      payload.vecna_spravnost_umisteni_majetku = String(vecna_spravnost_umisteni_majetku);
    }

    if (vecna_spravnost_poznamka) {
      payload.vecna_spravnost_poznamka = String(vecna_spravnost_poznamka);
    }

    // Předání zaměstnanci
    if (fa_predana_zam_id) {
      payload.fa_predana_zam_id = Number(fa_predana_zam_id);
    }

    if (fa_datum_predani_zam) {
      payload.fa_datum_predani_zam = fa_datum_predani_zam;
    }

    if (fa_datum_vraceni_zam) {
      payload.fa_datum_vraceni_zam = fa_datum_vraceni_zam;
    }

    // Smlouva
    if (smlouva_id) {
      payload.smlouva_id = Number(smlouva_id);
    }

    // ✅ VŽDY použij V2 API - buď s order_id nebo standalone
    const endpoint = order_id 
      ? `order-v2/${order_id}/invoices/create`
      : 'order-v2/invoices/create'; // V2 standalone API
    
    // Přidat objednavka_id do payload (může být null)
    if (order_id) {
      payload.objednavka_id = Number(order_id);
    }

    const response = await api25invoices.post(
      endpoint,
      payload,
      { timeout: 10000 }
    );

    if (response.status !== 200 && response.status !== 201) {
      const error = `Neočekávaný kód odpovědi: ${response.status}`;
      throw new Error(error);
    }

    const data = response.data;

    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při vytváření faktury');
    }

    if (data.status === 'ok') {
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

/**
 * Aktualizace faktury
 *
 * Order V2 API: POST /api.eeo/order-v2/invoices/{invoice_id}/update
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number|string} params.invoice_id - ID faktury
 * @param {Object} params.updateData - Data k aktualizaci (pouze fieldy které chceš změnit)
 * @returns {Promise<Object>} Response s updated_fields
 *
 * @example
 * const result = await updateInvoiceV2({
 *   token: userToken,
 *   username: 'admin',
 *   invoice_id: 456,
 *   updateData: {
 *     fa_datum_splatnosti: '2025-12-15',
 *     fa_poznamka: 'Aktualizovaná poznámka'
 *   }
 * });
 * // result.data.updated_fields - pole názvů aktualizovaných fieldů
 */
export async function updateInvoiceV2({
  token,
  username,
  invoice_id,
  updateData = {}
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!invoice_id) {
    throw new Error('Chybí ID faktury.');
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    throw new Error('Chybí data k aktualizaci.');
  }

  try {
    const payload = {
      username,
      token,
      id: invoice_id,  // PHP očekává 'id', ne 'invoice_id'
      ...updateData
    };

    const response = await api25invoices.post(
      `order-v2/invoices/${invoice_id}/update`,
      payload,
      { timeout: 10000 }
    );

    if (response.status !== 200 && response.status !== 201) {
      const error = `Neočekávaný kód odpovědi: ${response.status}`;
      throw new Error(error);
    }

    const data = response.data;

    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při aktualizaci faktury');
    }

    if (data.status === 'ok') {
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

/**
 * Smazání faktury
 *
 * Order V2 API: DELETE /api.eeo/order-v2/invoices/{invoice_id}
 *
 * @param {number|string} invoiceId - ID faktury ke smazání
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {boolean} [hardDelete=false] - Pokud true, provede hard delete (nenávratné)
 * @returns {Promise<Object>} Response data
 *
 * @example
 * // Soft delete (výchozí)
 * await deleteInvoiceV2(123, token, username);
 *
 * // Hard delete (smazání záznamu + souborů)
 * await deleteInvoiceV2(123, token, username, true);
 */
export async function deleteInvoiceV2(invoiceId, token, username, hardDelete = false) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!invoiceId) {
    throw new Error('Chybí ID faktury.');
  }

  try {
    const payload = {
      token,
      username,
      hard_delete: hardDelete ? 1 : 0
    };

    // ✅ V2 API: POST /order-v2/invoices/{id}/delete (Apache blokuje DELETE method)
    const response = await api25invoices.post(`order-v2/invoices/${invoiceId}/delete`, payload, {
      timeout: 10000
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error('Neočekávaný kód odpovědi při mazání faktury');
    }

    const data = response.data;

    // Kontrola různých formátů odpovědi
    if (data.status === 'error' || data.err || data.error) {
      const errorMsg = data.message || data.err || data.error || 'Chyba při mazání faktury';
      throw new Error(errorMsg);
    }

    if (data.status === 'ok' || data.success === true || response.status === 200) {
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

/**
 * Obnovit neaktivní (soft-deleted) fakturu
 * POST /api.eeo/invoices25/restore
 * 
 * ⚠️ Pouze pro ADMIN role (SUPERADMIN, ADMINISTRATOR)
 * 
 * @param {number} invoiceId - ID faktury k obnovení
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response data
 *
 * @example
 * await restoreInvoiceV2(123, token, username);
 */
export async function restoreInvoiceV2(invoiceId, token, username) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!invoiceId) {
    throw new Error('Chybí ID faktury.');
  }

  try {
    const payload = {
      token,
      username,
      id: invoiceId
    };

    const response = await api25invoices.post('invoices25/restore', payload, {
      timeout: 10000
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error('Neočekávaný kód odpovědi při obnově faktury');
    }

    const data = response.data;

    // Kontrola různých formátů odpovědi
    if (data.err || data.error) {
      const errorMsg = data.err || data.error || 'Chyba při obnově faktury';
      throw new Error(errorMsg);
    }

    if (data.status === 'ok' || data.success === true) {
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

// ===================================================================
// INVOICE LIST - Načtení seznamu faktur
// ===================================================================

/**
 * Načte seznam všech faktur s filtrováním a stránkováním
 * 
 * ✅ HOTOVO: Backend implementován 30. listopadu 2025
 * POST /api.eeo/invoices25/list
 * 
 * Administrátoři (SUPERADMIN, ADMINISTRATOR) vidí VŠE.
 * Non-admin uživatelé vidí pouze faktury svých objednávek + faktury které vytvořili.
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} [params.page=1] - Číslo stránky (server-side pagination)
 * @param {number} [params.per_page=50] - Počet záznamů na stránku
 * @param {number} [params.year] - Rok vystavení (filtr)
 * @param {number} [params.objednavka_id] - ID objednávky
 * @param {0|1} [params.fa_dorucena] - 0 = nedoručeno, 1 = doručeno
 * @param {string} [params.fa_cislo_vema] - Číslo faktury (partial match, case-insensitive)
 * @param {string} [params.datum_od] - Datum vystavení od (YYYY-MM-DD)
 * @param {string} [params.datum_do] - Datum vystavení do (YYYY-MM-DD)
 * @param {string} [params.stredisko] - Středisko kód (partial match)
 * @param {number} [params.organizace_id] - ID organizace
 * @param {number} [params.usek_id] - ID úseku (automaticky aplikován pro non-admin)
 * @param {string} [params.access_context] - Kontext přístupu (např. "vzdel")
 * @returns {Promise<Object>} Response object
 * @returns {Array} return.faktury - Pole faktur (BE vrací již naparsovaná pole!)
 * @returns {Object} return.pagination - { page, per_page, total, total_pages }
 * @returns {Object} return.user_info - { is_admin, roles, usek_id, usek_zkr, filter_applied }
 * 
 * ⚠️ BE už parsuje JSON pole - NENÍ potřeba volat JSON.parse()!
 * - fa_strediska_kod je již array: ["STR001"] nebo []
 * - rozsirujici_data je již object nebo null
 * - vytvoril_uzivatel_detail obsahuje kompletní info o uživateli
 */
export async function listInvoices25({ 
  token, 
  username, 
  page = 1, 
  per_page = 50, 
  year,
  objednavka_id,
  fa_dorucena,
  fa_cislo_vema,
  datum_od,
  datum_do,
  stredisko,
  organizace_id,
  usek_id,
  access_context,
  filter_status,  // Dashboard filter (paid/unpaid/overdue/without_order/my_invoices)
  search_term,    // 🔍 Globální vyhledávání
  cislo_objednavky,  // 📋 Sloupcový filtr - číslo objednávky
  filter_datum_doruceni,  // 📋 Sloupcový filtr - datum doručení
  filter_datum_vystaveni,  // 📋 Sloupcový filtr - datum vystavení
  filter_datum_splatnosti,  // 📋 Sloupcový filtr - datum splatnosti
  filter_dt_aktualizace,  // 📋 Sloupcový filtr - datum aktualizace
  filter_stav,  // 📋 Sloupcový filtr - stav faktury
  filter_vytvoril_uzivatel,  // 📋 Sloupcový filtr - uživatel
  filter_fa_typ,  // 📋 Sloupcový filtr - typ faktury (BEZNA, ZALOHOVA, ...)
  castka_gt,   // 💰 Operátorový filtr - částka větší než (>)
  castka_lt,   // 💰 Operátorový filtr - částka menší než (<) 
  castka_eq,   // 💰 Operátorový filtr - částka rovná se (=)
  filter_ma_prilohy,  // 📎 Sloupcový filtr - přílohy
  filter_vecna_kontrola,  // 📋 Sloupcový filtr - věcná kontrola (DEPRECATED)
  filter_vecna_spravnost_status,  // 📋 Sloupcový filtr - věcná správnost status (0=nepotvrzeno, 1=potvrzena, 2=zamítnuto)
  filter_vecnou_provedl,  // 📋 Sloupcový filtr - kdo provedl věcnou kontrolu
  filter_predano_zamestnanec,  // 📋 Sloupcový filtr - předáno zaměstnanci
  filter_kontrola_radku,  // ✅ Sloupcový filtr - kontrola řádku (kontrolovano/nekontrolovano)
  show_only_inactive,  // 🔧 ADMIN FEATURE: Zobrazení pouze neaktivních faktur (aktivni = 0)
  order_by,    // 📊 Třídění - sloupec pro řazení
  order_direction  // 📊 Třídění - směr řazení (ASC/DESC)
  ,debugSource = 'unknown'
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  const endTimer = startDevTimer('invoices25/list', { page, per_page, year, access_context, filter_status });

  const requestPayload = {
    token,
    username,
    page,
    per_page,
    year,
    objednavka_id,
    fa_dorucena,
    fa_cislo_vema,
    datum_od,
    datum_do,
    stredisko,
    organizace_id,
    usek_id,
    access_context,
    filter_status,
    search_term,
    cislo_objednavky,
    filter_datum_doruceni,
    filter_datum_vystaveni,
    filter_datum_splatnosti,
    filter_dt_aktualizace,
    filter_stav,
    filter_vytvoril_uzivatel,
    filter_fa_typ,
    castka_gt,
    castka_lt,
    castka_eq,
    filter_ma_prilohy,
    filter_vecna_kontrola,
    filter_vecna_spravnost_status,
    filter_vecnou_provedl,
    filter_predano_zamestnanec,
    filter_kontrola_radku,
    show_only_inactive,
    order_by,
    order_direction
  };
  const cacheKey = getInvoices25CacheKey(requestPayload);
  const cached = getCachedInvoices25Response(cacheKey);
  if (cached) {
    return cached;
  }
  if (invoices25InFlight.has(cacheKey)) {
    return invoices25InFlight.get(cacheKey);
  }

  try {
    // Sestavení payload s FLAT strukturou (filtry na top-level, NE v sub-objektu!)
    const payload = {
      token,
      username,
      page,
      per_page
    };

    // Přidat volitelné filtry (pouze pokud jsou definované)
    if (year !== undefined) payload.year = year;
    if (objednavka_id !== undefined) payload.objednavka_id = objednavka_id;
    if (fa_dorucena !== undefined) payload.fa_dorucena = fa_dorucena;
    if (fa_cislo_vema !== undefined) payload.fa_cislo_vema = fa_cislo_vema;
    if (datum_od !== undefined) payload.datum_od = datum_od;
    if (datum_do !== undefined) payload.datum_do = datum_do;
    if (stredisko !== undefined) payload.stredisko = stredisko;
    if (organizace_id !== undefined) payload.organizace_id = organizace_id;
    if (usek_id !== undefined) payload.usek_id = usek_id;
    if (access_context !== undefined && access_context !== '') payload.access_context = access_context;
    if (filter_status !== undefined && filter_status !== '') payload.filter_status = filter_status;
    
    // 🔍 Globální vyhledávání
    if (search_term !== undefined && search_term !== '') payload.search_term = search_term;
    
    // 📋 Sloupcové filtry
    if (cislo_objednavky !== undefined && cislo_objednavky !== '') payload.cislo_objednavky = cislo_objednavky;
    if (filter_datum_doruceni !== undefined && filter_datum_doruceni !== '') payload.filter_datum_doruceni = filter_datum_doruceni;
    if (filter_datum_vystaveni !== undefined && filter_datum_vystaveni !== '') payload.filter_datum_vystaveni = filter_datum_vystaveni;
    if (filter_datum_splatnosti !== undefined && filter_datum_splatnosti !== '') payload.filter_datum_splatnosti = filter_datum_splatnosti;
    if (filter_dt_aktualizace !== undefined && filter_dt_aktualizace !== '') payload.filter_dt_aktualizace = filter_dt_aktualizace;
    if (filter_stav !== undefined && filter_stav !== '') payload.filter_stav = filter_stav;
    if (filter_vytvoril_uzivatel !== undefined && filter_vytvoril_uzivatel !== '') payload.filter_vytvoril_uzivatel = filter_vytvoril_uzivatel;
    if (filter_fa_typ !== undefined && filter_fa_typ !== '') payload.filter_fa_typ = filter_fa_typ;
    
    // 💰 Operátorové filtry pro částku (>, <, =)
    if (castka_gt !== undefined && castka_gt !== '') payload.castka_gt = castka_gt;
    if (castka_lt !== undefined && castka_lt !== '') payload.castka_lt = castka_lt;
    if (castka_eq !== undefined && castka_eq !== '') payload.castka_eq = castka_eq;
    
    // 📎 Filtr pro přílohy
    if (filter_ma_prilohy !== undefined && filter_ma_prilohy !== '') payload.filter_ma_prilohy = filter_ma_prilohy;
    
    // Filtry pro věcnou kontrolu a předání zaměstnanci
    if (filter_vecna_kontrola !== undefined && filter_vecna_kontrola !== '') payload.filter_vecna_kontrola = filter_vecna_kontrola;
    if (filter_vecna_spravnost_status !== undefined) payload.filter_vecna_spravnost_status = filter_vecna_spravnost_status;
    if (filter_vecnou_provedl !== undefined && filter_vecnou_provedl !== '') payload.filter_vecnou_provedl = filter_vecnou_provedl;
    if (filter_predano_zamestnanec !== undefined && filter_predano_zamestnanec !== '') payload.filter_predano_zamestnanec = filter_predano_zamestnanec;
    
    // ✅ Filtr pro kontrolu řádku (kontrolovano/nekontrolovano)
    if (filter_kontrola_radku !== undefined && filter_kontrola_radku !== '') payload.filter_kontrola_radku = filter_kontrola_radku;
    
    // 🔧 ADMIN FEATURE: Zobrazení pouze neaktivních faktur
    if (show_only_inactive !== undefined && show_only_inactive !== '') payload.show_only_inactive = show_only_inactive;

    // 📊 Třídění
    if (order_by !== undefined && order_by !== '') payload.order_by = order_by;
    if (order_direction !== undefined && order_direction !== '') payload.order_direction = order_direction;

    const responsePromise = api25invoices.post('invoices25/list', payload, {
      timeout: 30000
    }).then((response) => {
      if (response.status !== 200) {
        throw new Error('Neočekávaný kód odpovědi při načítání faktur');
      }

      const data = response.data;

      // Kontrola chyb
      if (data.status === 'error' || data.err || data.error) {
        const errorMsg = data.message || data.err || data.error || 'Chyba při načítání faktur';
        throw new Error(errorMsg);
      }

      const result = data.status === 'ok' ? {
        status: data.status,
        message: data.message,
        test: data.test,
        faktury: data.faktury || [],
        pagination: data.pagination || { page: 1, per_page: 50, total: 0, total_pages: 0 },
        statistiky: data.statistiky || null,
        user_info: data.user_info || null
      } : {
        faktury: [],
        pagination: { page: 1, per_page: 50, total: 0, total_pages: 0 },
        statistiky: null,
        user_info: null
      };

      storeCachedInvoices25Response(cacheKey, result);
      endTimer({ rows: Array.isArray(result?.faktury) ? result.faktury.length : undefined, debugSource });
      return result;
    });

    invoices25InFlight.set(cacheKey, responsePromise);
    return await responsePromise;

  } catch (error) {
    endTimer({ error: error?.message || String(error), debugSource });
    throw new Error(normalizeApi25InvoicesError(error));
  } finally {
    invoices25InFlight.delete(cacheKey);
  }
}

/**
 * Načte faktury pro konkrétní objednávku
 * 
 * POST /api.eeo/invoices25/by-order
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.objednavka_id - ID objednávky
 * @returns {Promise<Array>} Pole faktur
 */
export async function getInvoicesByOrder25({ token, username, objednavka_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!objednavka_id) {
    throw new Error('Chybí ID objednávky.');
  }

  try {
    const payload = {
      token,
      username,
      objednavka_id
    };

    const response = await api25invoices.post('invoices25/by-order', payload, {
      timeout: 30000
    });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi při načítání faktur objednávky');
    }

    const data = response.data;

    // Kontrola chyb
    if (data.status === 'error' || data.err || data.error) {
      const errorMsg = data.message || data.err || data.error || 'Chyba při načítání faktur';
      throw new Error(errorMsg);
    }

    // Vrátit pole faktur
    return data.faktury || data.invoices || [];

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

/**
 * Načte detail konkrétní faktury
 * 
 * POST /api.eeo/invoices25/by-id
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.id - ID faktury
 * @returns {Promise<Object>} Detail faktury
 */
export async function getInvoiceById25({ token, username, id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!id) {
    throw new Error('Chybí ID faktury.');
  }

  try {
    const payload = {
      token,
      username,
      id
    };

    const response = await api25invoices.post('invoices25/by-id', payload, {
      timeout: 10000
    });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi při načítání faktury');
    }

    const data = response.data;

    // Kontrola chyb
    if (data.status === 'error' || data.err || data.error) {
      const errorMsg = data.message || data.err || data.error || 'Chyba při načítání faktury';
      throw new Error(errorMsg);
    }

    // Vrátit data faktury
    return data;

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

/**
 * Check if invoice number (fa_cislo_vema) already exists
 * 
 * @param {string} username 
 * @param {string} token 
 * @param {string} faCisloVema - Invoice number to check
 * @param {number|null} excludeInvoiceId - ID faktury k vynechání (při editaci)
 * @returns {Promise<{exists: boolean, invoice?: object}>}
 */
export async function checkInvoiceDuplicate(username, token, faCisloVema, excludeInvoiceId = null, options = {}) {
  try {
    const payload = {
      username,
      token,
      fa_cislo_vema: faCisloVema
    };
    
    if (excludeInvoiceId) {
      payload.exclude_invoice_id = excludeInvoiceId;
    }

    const response = await api25invoices.post('order-v2/invoices/check-duplicate', payload, {
      // 5s je v praxi často málo při krátkých síťových špičkách (VPN/router queueing).
      // Default zvedáme, ale ponecháme možnost přepsat.
      timeout: typeof options.timeout === 'number' ? options.timeout : 15000,
      // Axios v1 podporuje AbortController (zabrání paralelním “zastaralým” requestům při psaní)
      signal: options.signal
    });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi při kontrole duplicity');
    }

    const data = response.data;

    // Kontrola chyb
    if (data.status === 'error' || data.err || data.error) {
      const errorMsg = data.message || data.err || data.error || 'Chyba při kontrole duplicity';
      throw new Error(errorMsg);
    }

    // Vrátit výsledek
    return {
      exists: data.exists === true,
      invoice: data.invoice || null
    };

  } catch (error) {
    throw new Error(normalizeApi25InvoicesError(error));
  }
}

/**
 * Export všech funkcí
 */
export default {
  uploadInvoiceAttachment25,
  listInvoiceAttachments25,
  listOrderInvoiceAttachments25,
  getInvoiceAttachmentById25,
  downloadInvoiceAttachment25,
  updateInvoiceAttachment25,
  deleteInvoiceAttachment25,
  deleteInvoice25,
  createInvoiceWithAttachment25,
  // Order V2 Invoice API (NEW)
  createInvoiceWithAttachmentV2,
  createInvoiceV2,
  updateInvoiceV2,
  deleteInvoiceV2,
  // Invoice List API (NEW)
  listInvoices25,
  getInvoicesByOrder25,
  getInvoiceById25,
  checkInvoiceDuplicate,
  // Utils
  isAllowedInvoiceFileType,
  isAllowedInvoiceFileSize,
  isISDOCFile,
  formatFileSize
};

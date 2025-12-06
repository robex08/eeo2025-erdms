/* eslint-disable no-unused-vars */
import axios from 'axios';

/**
 * ORDERS25 API Service
 * Implementace podle dokumentace v docs/ORDERS25_API_DOCUMENTATION.md
 * Verze: v2025.03_25
 * Datum: 8. října 2025
 *
 * Endpointy:
 * 1. orders25/list - Seznam všech objednávek
 * 2. orders25/by-id - Detail objednávky podle ID
 * 3. orders25/by-user - Objednávky podle uživatele
 * 4. orders25/insert - Vytvoření nové objednávky
 * 5. orders25/update - Aktualizace objednávky
 * 6. orders25/delete - Smazání objednávky
 * 7. orders25/next-number - Generování čísla objednávky
 * 8. orders25/check-number - Kontrola dostupnosti čísla
 * 9. orders25/partial-insert - Částečné vytvoření objednávky
 * 10. orders25/partial-update - Částečná aktualizace objednávky
 */

// Axios instance for API25 Orders - specifically for 25a_objednavky table
const api25orders = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Debug logging function - will be injected from OrderForm25
let debugLogger = null;

export const setDebugLogger = (loggerFn) => {
  debugLogger = loggerFn;
};

const logDebug = (type, endpoint, data, response) => {
  // DOČASNĚ VYPNUT - způsobuje nekonečnou smyčku
  return;

  // if (debugLogger) {
  //   const baseURL = process.env.REACT_APP_API2_BASE_URL;
  //   const fullURL = `${baseURL}${endpoint}`;
  //
  //   if (type === 'request') {
  //     debugLogger(type, 'POST', endpoint, {
  //       url: fullURL,
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       payload: data,
  //       curl_equivalent: `curl -X POST "${fullURL}" -H "Content-Type: application/json" -d '${JSON.stringify(data)}'`
  //     });
  //   } else {
  //     debugLogger(type, 'POST', endpoint, null, {
  //       url: fullURL,
  //       response_data: response,
  //       timestamp: new Date().toISOString()
  //     });
  //   }
  // }
};

// Response interceptor to handle token expiration
api25orders.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired - could redirect to login or show notification

      // If we're in a browser environment, we could show a global notification
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('authError', {
          detail: { message: 'Vaše přihlášení vypršelo. Přihlaste se prosím znovu.' }
        });
        window.dispatchEvent(event);
      }
    }

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
export function normalizeApi25OrdersError(err) {
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
export function getUserErrorMessage25Orders(err) {
  return normalizeApi25OrdersError(err);
}

// ===================================================================
// 1. LIST - Zobrazení všech objednávek
// ===================================================================

/**
 * Get list of orders from 25a_objednavky table with enriched data
 *
 * Načte všechny objednávky včetně položek a rozbalených číselníků.
 * Vrací enriched data (_enriched) pro zobrazení v FE bez dodatečných API volání.
 *
 * @param {Object} params - Parameters
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {Object} params.filters - Optional filters (zatím nepodporováno v BE)
 */
export async function getOrdersList25({ token, username, filters = {} }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  try {
    const payload = {
      token,
      username,
      ...filters  // přidáme všechny filtry (včetně roku) do payload
    };

    logDebug('request', 'orders25/list', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/list', payload, { timeout: 15000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při načítání seznamu objednávek';
      logDebug('error', 'orders25/list', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/list', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok' && Array.isArray(data.data)) {
      // Process enriched data for frontend consumption
      const processedOrders = data.data.map(order => {
        // Parse JSON fields if they exist
        try {
          if (order.financovani && typeof order.financovani === 'string') {
            order.financovani_parsed = JSON.parse(order.financovani);
          }
        } catch (e) {
          order.financovani_parsed = {};
        }

        // Calculate total price from items if available
        if (order.polozky && Array.isArray(order.polozky)) {
          const totalPrice = order.polozky.reduce((sum, item) => {
            return sum + parseFloat(item.cena_s_dph || 0);
          }, 0);
          order.total_price = totalPrice;
        }

        // Process enriched data for easier FE usage
        const enriched = order._enriched || {};

        // User display names
        if (enriched.uzivatel) {
          order.uzivatel_display = `${enriched.uzivatel.jmeno} ${enriched.uzivatel.prijmeni}`.trim();
          order.uzivatel_email = enriched.uzivatel.email;
        }

        if (enriched.garant_uzivatel) {
          const jmeno = enriched.garant_uzivatel.jmeno || '';
          const prijmeni = enriched.garant_uzivatel.prijmeni || '';
          order.garant_display = `${jmeno} ${prijmeni}`.trim();
        }

        if (enriched.schvalovatel) {
          const jmeno = enriched.schvalovatel.jmeno || '';
          const prijmeni = enriched.schvalovatel.prijmeni || '';
          order.schvalovatel_display = `${jmeno} ${prijmeni}`.trim();
        }

        // Status display with color
        if (enriched.stav_workflow) {
          order.stav_display = enriched.stav_workflow.nazev;
          order.stav_barva = enriched.stav_workflow.barva;
          order.stav_ikona = enriched.stav_workflow.ikona;
        }

        // Střediska names
        if (enriched.strediska && Array.isArray(enriched.strediska)) {
          order.strediska_nazvy = enriched.strediska.map(s => s.nazev).join(', ');
        }

        // Order type display
        if (enriched.druh_objednavky) {
          order.druh_objednavky_display = enriched.druh_objednavky.nazev;
        }

        return order;
      });

      logDebug('success', 'orders25/list', null, {
        count: processedOrders.length,
        enriched: processedOrders.length > 0 ? !!processedOrders[0]._enriched : false
      });
      return processedOrders;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/list', null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

/**
 * Get orders statistics for dashboard
 */
export async function getOrdersStats25({ token, username, filters = {} }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  try {
    const payload = {
      token,
      username,
      action: 'stats',
      ...filters
    };

    logDebug('request', 'orders25/stats', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/stats', payload, { timeout: 30000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při načítání statistik objednávek';
      logDebug('error', 'orders25/stats', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/stats', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok' && data.data) {
      logDebug('success', 'orders25/stats', null, data.data);
      return data.data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/stats', null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

// ===================================================================
// 2. BY-ID - Detail objednávky podle ID
// ===================================================================

/**
 * Get single order by ID from 25a_objednavky table
 */
export async function getOrder25({ token, username, orderId, archivovano }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!orderId) {
    throw new Error('Chybí ID objednávky.');
  }

  try {
    const payload = {
      token,
      username,
      id: orderId
    };

    // Pokud je archivovano nastaveno, přidej do payload
    if (archivovano) {
      payload.archivovano = archivovano;
    }

    logDebug('request', 'orders25/by-id', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/by-id', payload, { timeout: 5000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při načítání objednávky';
      logDebug('error', 'orders25/by-id', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/by-id', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok' && data.data) {
      logDebug('success', 'orders25/by-id', null, { id: data.data.id });
      return data.data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/by-id', null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

// ===================================================================
// 3. BY-USER - Objednávky podle uživatele
// ===================================================================

/**
 * Get orders by user from 25a_objednavky table
 * Volá orders25/by-user endpoint, který filtruje na BE podle oprávnění
 */
export async function getOrdersByUser25({ token, username, userId, rok, mesic, archivovano }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  try {
    const payload = {
      token,
      username
    };

    // Přidej user_id pouze pokud je zadán (pro filtrování podle konkrétního uživatele)
    if (userId) {
      payload.user_id = userId;
      // Přidávám user_id do payload
    } else {
      // Volám bez user_id - očekávám všechny objednávky
    }

    // Přidej rok pokud je zadán
    if (rok) {
      payload.rok = rok;
    }

    // Přidej měsíc pokud je zadán
    if (mesic) {
      payload.mesic = mesic;
    }

    // Přidej archivovano pokud je zadán (1 = zobrazit archivované)
    if (archivovano) {
      payload.archivovano = archivovano;
    }

    // Finální payload připraven
    logDebug('request', 'orders25/by-user', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/by-user', payload, { timeout: 30000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při načítání objednávek uživatele';
      logDebug('error', 'orders25/by-user', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/by-user', null, data.err);
      throw new Error(data.err);
    }

    // Zkus různé možné struktury odpovědi
    if (data.status === 'ok' && data.data) {
      logDebug('success', 'orders25/by-user', null, { count: data.data.length });
      return data.data;
    }

    // Možná server vrací přímo pole
    if (Array.isArray(data)) {
      logDebug('success', 'orders25/by-user', null, { count: data.length, note: 'Direct array response' });
      return data;
    }

    // Možná server vrací data v jiném formátu
    if (data.success && data.orders) {
      logDebug('success', 'orders25/by-user', null, { count: data.orders.length, note: 'success+orders format' });
      return data.orders;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/by-user', null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

// ===================================================================
// 4. INSERT - Vytvoření nové objednávky
// ===================================================================

/**
 * Create new order in 25a_objednavky table - full insert
 * Povinné parametry: predmet, strediska_kod, max_cena_s_dph
 */
export async function createOrder25({ token, username, orderData }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!orderData) {
    throw new Error('Chybí data objednávky.');
  }

  // Kontrola povinných parametrů
  if (!orderData.predmet) {
    throw new Error('Chybí předmět objednávky.');
  }

  if (!orderData.strediska_kod) {
    throw new Error('Chybí kód střediska.');
  }

  if (!orderData.max_cena_s_dph) {
    throw new Error('Chybí maximální cena s DPH.');
  }

  try {
    const payload = {
      token,
      username,
      ...orderData
    };

    logDebug('request', 'orders25/insert', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/insert', payload, { timeout: 60000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při vytváření objednávky';
      logDebug('error', 'orders25/insert', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/insert', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok') {
      logDebug('success', 'orders25/insert', null, {
        inserted_id: data.inserted_id,
        message: data.message
      });
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/insert', null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

// ===================================================================
// 5. UPDATE - Aktualizace objednávky
// ===================================================================

/**
 * Update existing order in 25a_objednavky table - full update
 */
export async function updateOrder25({ token, username, orderId, orderData }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!orderId) {
    throw new Error('Chybí ID objednávky.');
  }

  if (!orderData) {
    throw new Error('Chybí data objednávky.');
  }

  try {
    const payload = {
      token,
      username,
      id: orderId,
      ...orderData
    };

    logDebug('request', 'orders25/update', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/update', payload, { timeout: 60000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při aktualizaci objednávky';
      logDebug('error', 'orders25/update', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/update', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok') {
      logDebug('success', 'orders25/update', null, { message: data.message });
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/update', null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

// ===================================================================
// 6. DELETE - Smazání objednávky
// ===================================================================

/**
 * Soft delete order - označí jako neaktivní (aktivni = 0)
 * Doporučená metoda - objednávka zůstane v databázi včetně příloh
 */
export async function softDeleteOrder25({ token, username, orderId }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!orderId) {
    throw new Error('Chybí ID objednávky.');
  }

  try {
    const payload = {
      token,
      username,
      id: orderId
    };

    logDebug('request', 'orders25/soft-delete', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/soft-delete', payload, { timeout: 30000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při označování objednávky jako neaktivní';
      logDebug('error', 'orders25/soft-delete', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/soft-delete', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok') {
      logDebug('success', 'orders25/soft-delete', null, {
        message: data.message
      });
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/soft-delete', null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

/**
 * Hard delete order - úplně smaže objednávku včetně položek, příloh a souborů
 * POZOR: Nevratná operace! Smaže objednávku, všechny položky, přílohy a soubory z disku!
 */
export async function hardDeleteOrder25({ token, username, orderId }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!orderId) {
    throw new Error('Chybí ID objednávky.');
  }

  try {
    const payload = {
      token,
      username,
      id: orderId
    };

    logDebug('request', 'orders25/delete', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/delete', payload, { timeout: 10000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při mazání objednávky';
      logDebug('error', 'orders25/delete', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/delete', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok') {
      logDebug('success', 'orders25/delete', null, {
        message: data.message,
        data: data.data || {}
      });
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/delete', null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

/**
 * Delete order - backward compatibility wrapper
 * Používá soft delete jako výchozí bezpečnou metodu
 */
export async function deleteOrder25({ token, username, orderId }) {
  return softDeleteOrder25({ token, username, orderId });
}

/**
 * Lock order - zamkne objednávku pro editaci aktuálním uživatelem
 * Volá se při otevření objednávky pro editaci
 *
 * BE Response structure (aktualizováno 24.10.2025):
 * - Success: {
 *     status: "ok",
 *     message: "...",
 *     lock_info: {
 *       locked: false,              // ✅ FALSE = můžu editovat (moje zamčená)
 *       locked_by_user_id,
 *       locked_by_user_fullname,
 *       locked_at,
 *       lock_status: "owned",
 *       is_owned_by_me: true        // ✅ NOVÉ POLE
 *     }
 *   }
 * - Already locked by same user: { status: "ok", message: "Zámek byl obnoven", lock_info: { locked: false, is_owned_by_me: true, ... } }
 * - Locked by another user: {
 *     err: "...",
 *     lock_info: {
 *       locked: true,               // ❌ TRUE = zamčená JINÝM
 *       locked_by_user_id,
 *       locked_by_user_fullname,
 *       locked_at,
 *       lock_status: "locked",
 *       is_owned_by_me: false       // ✅ NOVÉ POLE
 *     }
 *   }
 *
 * KLÍČOVÁ ZMĚNA: locked: true znamená "zamčeno JINÝM uživatelem"
 *                locked: false znamená "můžu editovat" (volná NEBO moje zamčená)
 */
export async function lockOrder25({ token, username, orderId }) {
  if (!token || !username || !orderId) {
    throw new Error('Chybí přístupový token, uživatelské jméno nebo ID objednávky.');
  }

  const requestData = {
    token: token,
    username: username,
    id: orderId
  };

  logDebug('request', 'orders25/lock', requestData);

  try {
    const response = await api25orders.post('orders25/lock', requestData);

    logDebug('response', 'orders25/lock', requestData, response.data);

    if (response.data && response.data.status === 'ok') {
      // Objednávka byla úspěšně zamknuta (nebo zámek obnoven)
      const lockInfo = response.data.lock_info;
      const userName = lockInfo?.locked_by_user_fullname || 'Vámi';

      return {
        success: true,
        message: response.data.message || 'Objednávka byla zamknuta',
        lock_info: response.data.lock_info,
        locked_by_name: userName // Pro toast notifikaci
      };
    } else if (response.data && response.data.err) {
      // BE vrátil chybu (objednávka zamčená jiným uživatelem)
      const lockInfo = response.data.lock_info;
      const err = new Error(response.data.err);
      err.lock_info = lockInfo;
      throw err;
    } else {
      throw new Error(response.data?.message || 'Nepodařilo se zamknout objednávku');
    }

  } catch (error) {

    // Pokud už má lock_info, propaguj
    if (error.lock_info) {
      throw error;
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error('Nemáte oprávnění k zamknutí objednávky');
    }

    // BE může vrátit lock_info i v error response
    if (error.response?.data?.lock_info) {
      const lockInfo = error.response.data.lock_info;
      const err = new Error(error.response.data.err || 'Objednávka je zamčená jiným uživatelem');
      err.lock_info = lockInfo;
      throw err;
    }

    throw new Error(`Chyba při zamykání objednávky: ${error.message}`);
  }
}

/**
 * Unlock order - odemkne objednávku po zrušení editace
 * Volá se při zrušení editace objednávky, která byla uložena do DB
 *
 * @param {boolean} force - Pro SUPERADMIN/ADMINISTRATOR - násilné odemčení i cizího zámku
 *
 * BE Response structure:
 * - Normal unlock: { status: "ok", message: "Objednávka byla odemčena" }
 * - Forced unlock: { status: "ok", message: "Objednávka byla násilně odemčena", unlock_type: "forced" }
 */
export async function unlockOrder25({ token, username, orderId, force = false }) {
  if (!token || !username || !orderId) {
    throw new Error('Chybí přístupový token, uživatelské jméno nebo ID objednávky.');
  }

  const requestData = {
    token: token,
    username: username,
    id: orderId
  };

  // Pro force unlock přidej parametr
  if (force) {
    requestData.force = true;
  }

  logDebug('request', 'orders25/unlock', requestData);

  try {
    const response = await api25orders.post('orders25/unlock', requestData);

    logDebug('response', 'orders25/unlock', requestData, response.data);

    if (response.data && response.data.status === 'ok') {
      // Objednávka byla úspěšně odemknuta
      return {
        success: true,
        message: response.data.message || 'Objednávka byla odemknuta',
        unlock_type: response.data.unlock_type || 'normal'
      };
    } else {
      throw new Error(response.data?.message || 'Nepodařilo se odemknout objednávku');
    }

  } catch (error) {

    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error('Nemáte oprávnění k odemknutí objednávky');
    }

    throw new Error(`Chyba při odemykání objednávky: ${error.message}`);
  }
}

// ===================================================================
// 7. NEXT-NUMBER - Generování dalšího čísla objednávky
// ===================================================================

/**
 * Get next available order number for new order
 */
export async function getNextOrderNumber25({ token, username }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  try {
    const payload = {
      token,
      username
    };

    logDebug('request', 'orders25/next-number', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/next-number', payload, { timeout: 5000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při získávání čísla objednávky';
      logDebug('error', 'orders25/next-number', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/next-number', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok' && data.data) {
      logDebug('success', 'orders25/next-number', null, {
        next_order_string: data.data.next_order_string,
        order_number_string: data.data.order_number_string,
        next_number: data.data.next_number
      });

      // Backend vrací:
      // {
      //   last_used_number: 14,
      //   next_number: 15,
      //   formatted_last_used: "0014",
      //   formatted_next: "0015",
      //   ico: "12345678",
      //   usek_zkr: "IT",
      //   current_year: "2025",
      //   last_used_order_string: "O-0014/12345678/2025/IT",
      //   next_order_string: "O-0015/12345678/2025/IT",
      //   order_number_string: "O-0015/12345678/2025/IT"
      // }

      // ⚠️ DŮLEŽITÉ: Toto číslo je POUZE pro ZOBRAZENÍ v UI!
      // NIKDY se neposílá v CREATE/UPDATE - backend si číslo přidělí sám!
      return data.data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/next-number', null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

// ===================================================================
// 8. CHECK-NUMBER - Kontrola dostupnosti čísla objednávky
// ===================================================================

/**
 * Check if order number is available and optionally get suggestion
 */
export async function checkOrderNumber25({ token, username, cisloObjednavky, suggest = false }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!cisloObjednavky) {
    throw new Error('Chybí číslo objednávky k ověření.');
  }

  try {
    const payload = {
      token,
      username,
      cislo_objednavky: cisloObjednavky,
      suggest: suggest
    };

    logDebug('request', 'orders25/check-number', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/check-number', payload, { timeout: 5000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při kontrole čísla objednávky';
      logDebug('error', 'orders25/check-number', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/check-number', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok' && data.data) {
      logDebug('success', 'orders25/check-number', null, {
        available: data.data.available,
        suggestion: data.data.suggestion
      });
      return data.data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/check-number', null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

// ===================================================================
// 9. PARTIAL-INSERT - Částečné vytvoření objednávky
// ===================================================================

/**
 * Create partial order - for multi-step workflow
 * Pro postupné vyplňování objednávky přes více kroků
 */
export async function createPartialOrder25({ token, username, orderData, autoAssignNumber = false }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  try {
    const payload = {
      token,
      username,
      auto_assign_number: autoAssignNumber,
      ...orderData
    };

    logDebug('request', 'orders25/partial-insert', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/partial-insert', payload, { timeout: 10000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při vytváření částečné objednávky';
      logDebug('error', 'orders25/partial-insert', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/partial-insert', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok') {
      logDebug('success', 'orders25/partial-insert', null, {
        id: data.data?.id,
        cislo_objednavky: data.data?.cislo_objednavky,
        inserted_fields: data.data?.inserted_fields
      });
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/partial-insert', null, error.message);

    // Zkontrolovat HTTP 423 (zamčeno jiným uživatelem)
    if (error.response?.status === 423 && error.response?.data?.lock_info) {
      const lockInfo = error.response.data.lock_info;
      const customError = new Error(error.response.data.err || 'Objednávka je zamčená jiným uživatelem');
      customError.lock_info = lockInfo; // Přidat lock_info k erroru
      throw customError;
    }

    throw new Error(normalizeApi25OrdersError(error));
  }
}

// ===================================================================
// 10. PARTIAL-UPDATE - Částečná aktualizace objednávky
// ===================================================================

/**
 * Partial update of existing order - only updates provided fields
 * Aktualizuje pouze poskytnuté parametry, ostatní hodnoty zůstávají beze změny
 */
export async function updatePartialOrder25({ token, username, orderId, orderData }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!orderId) {
    throw new Error('Chybí ID objednávky.');
  }

  if (!orderData) {
    throw new Error('Chybí data objednávky.');
  }

  try {
    const payload = {
      token,
      username,
      id: orderId,
      ...orderData
    };

    logDebug('request', 'orders25/partial-update', { ...payload, token: '***' });

    const response = await api25orders.post('orders25/partial-update', payload, { timeout: 10000 });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při částečné aktualizaci objednávky';
      logDebug('error', 'orders25/partial-update', null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.err) {
      logDebug('error', 'orders25/partial-update', null, data.err);
      throw new Error(data.err);
    }

    if (data.status === 'ok') {
      logDebug('success', 'orders25/partial-update', null, {
        message: data.message,
        updated_fields: data.updated_fields
      });
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', 'orders25/partial-update', null, error.message);

    // Zkontrolovat HTTP 423 (zamčeno jiným uživatelem)
    if (error.response?.status === 423 && error.response?.data?.lock_info) {
      const lockInfo = error.response.data.lock_info;
      const customError = new Error(error.response.data.err || 'Objednávka je zamčená jiným uživatelem');
      customError.lock_info = lockInfo; // Přidat lock_info k erroru
      throw customError;
    }

    throw new Error(normalizeApi25OrdersError(error));
  }
}

// ===================================================================
/**
 * Získá seznam středisek z API
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @returns {Promise<Array>} Seznam středisek s hierarchickou strukturou
 */
export const getStrediska25 = async ({ token, username, aktivni = 1 }) => {
  try {
    // Používáme správný endpoint pro číselníky
    const requestData = {
      token,
      username,
      typ_objektu: 'STREDISKA',
      aktivni: aktivni  // ✅ Filtrovat pouze aktivní záznamy (1 = aktivní, 0 = neaktivní, null = všechny)
    };

    logDebug('request', 'states25/by-object-type', {
      ...requestData,
      token: token ? `${token.substring(0, 10)}...` : 'null' // Skrýt token v logu
    });

    // Volání API přímo na endpoint
    const response = await api25orders.post('states25/by-object-type', requestData);
    logDebug('success', 'states25/by-object-type', null, {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });

    // Zpracování odpovědi - vytvoření hierarchické struktury
    const rawData = response.data?.data || [];

    logDebug('info', 'states25/by-object-type', null, {
      rawDataSample: rawData.slice(0, 3),
      totalCount: rawData.length,
      fields: rawData[0] ? Object.keys(rawData[0]) : []
    });

    // Vytvoření mapy pro rychlé vyhledávání
    const itemMap = new Map();
    rawData.forEach(item => {
      itemMap.set(item.kod_stavu, item);
    });

    // Rozdělení na root elementy a potomky podle nadrazeny_kod_stavu
    const rootElements = rawData.filter(item =>
      !item.nadrazeny_kod_stavu ||
      item.nadrazeny_kod_stavu.trim() === '' ||
      item.nadrazeny_kod_stavu === null ||
      item.nadrazeny_kod_stavu === undefined
    );

    const childElements = rawData.filter(item =>
      item.nadrazeny_kod_stavu &&
      item.nadrazeny_kod_stavu.trim() !== '' &&
      item.nadrazeny_kod_stavu !== null &&
      item.nadrazeny_kod_stavu !== undefined
    );

    logDebug('info', 'states25/by-object-type', null, {
      rootCount: rootElements.length,
      childCount: childElements.length,
      rootSample: rootElements.slice(0, 2),
      childSample: childElements.slice(0, 2)
    });

    // Vytvoření hierarchické struktury
    const hierarchicalData = [];

    // Řazení root elementů podle názvu
    rootElements.sort((a, b) => (a.nazev_stavu || '').localeCompare(b.nazev_stavu || '', 'cs'));

    // Přidání root elementů a jejich potomků
    rootElements.forEach(root => {
      // Přidat root element (okres) - také vybíratelný
      hierarchicalData.push({
        value: root.kod_stavu,
        label: root.nazev_stavu,
        level: 0,
        isParent: true,
        raw: root
      });

      // Najít potomky tohoto root elementu podle nadrazeny_kod_stavu
      const children = childElements.filter(child => {
        // Párování podle kod_stavu rodiče = nadrazeny_kod_stavu potomka
        return child.nadrazeny_kod_stavu === root.kod_stavu;
      });

      // Řazení potomků podle názvu
      children.sort((a, b) => (a.nazev_stavu || '').localeCompare(b.nazev_stavu || '', 'cs'));

      // Přidat potomky s odsazením (stanoviště)
      children.forEach(child => {
        hierarchicalData.push({
          value: child.kod_stavu,
          label: `${child.nazev_stavu}`, // Bez prefix odsazení - CSS to vyřeší
          level: 1,
          isParent: false,
          parentCode: root.kod_stavu,
          raw: child
        });
      });
    });

    // Přidat osiřelé potomky (pokud nějaké zbudou)
    const processedChildCodes = new Set();
    hierarchicalData.forEach(item => {
      if (item.level === 1) {
        processedChildCodes.add(item.raw.kod_stavu);
      }
    });

    const orphanChildren = childElements.filter(child =>
      !processedChildCodes.has(child.kod_stavu)
    );

    if (orphanChildren.length > 0) {
      logDebug('warning', 'states25/by-object-type', null, {
        orphanChildren: orphanChildren.map(c => ({
          kod: c.kod_stavu,
          nazev: c.nazev_stavu,
          nadrazeny: c.nadrazeny_kod_stavu
        }))
      });

      // Přidat osiřelé potomky na konec
      orphanChildren.forEach(orphan => {
        hierarchicalData.push({
          value: orphan.kod_stavu,
          label: `⚠️ ${orphan.nazev_stavu} (nadřazený: ${orphan.nadrazeny_kod_stavu})`,
          level: 1,
          isParent: false,
          isOrphan: true,
          raw: orphan
        });
      });
    }

    logDebug('info', 'states25/by-object-type', 'Finální hierarchie', {
      totalItems: hierarchicalData.length
    });

    return hierarchicalData;

  } catch (error) {
    const normalizedError = normalizeApi25OrdersError(error);

    logDebug('error', 'states25/by-object-type', null, {
      error: normalizedError.message,
      status: error.response?.status || 'NETWORK_ERROR',
      statusText: error.response?.statusText || 'Connection failed',
      response_data: error.response?.data || null,
      request_url: error.config?.url || 'Unknown URL',
      request_method: error.config?.method?.toUpperCase() || 'POST',
      request_headers: error.config?.headers || {},
      original_error: error.message
    });

    throw normalizedError;
  }
};

/**
 * Získání seznamu druhů objednávky ze systému STATES25
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @returns {Promise<Array>} Seznam druhů objednávky
 */
export const getDruhyObjednavky25 = async ({ token, username, aktivni = 1 }) => {
  try {
    const requestData = {
      token,
      username,
      typ_objektu: 'DRUH_OBJEDNAVKY',
      aktivni: aktivni  // ✅ Filtrovat pouze aktivní záznamy
    };

    logDebug('request', 'states25/by-object-type', {
      ...requestData,
      token: token ? `${token.substring(0, 10)}...` : 'null'
    });

    const response = await api25orders.post('states25/by-object-type', requestData);
    logDebug('success', 'states25/by-object-type', null, {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });

    const rawData = response.data?.data || [];

    // ⚠️ OPRAVA: Mapování pro konzistenci s ostatními selecty - používat kod_stavu a nazev_stavu
    const druhyObjednavky = rawData.map(item => ({
      id: item.kod_stavu,
      kod: item.kod_stavu,
      kod_stavu: item.kod_stavu,  // Standardní pojmenování
      nazev: item.nazev_stavu,
      nazev_stavu: item.nazev_stavu, // Standardní pojmenování
      value: item.kod_stavu,  // Legacy podpora
      label: item.nazev_stavu  // Legacy podpora
    }));

    logDebug('info', 'states25/by-object-type', null, {
      processedCount: druhyObjednavky.length,
      sample: druhyObjednavky.slice(0, 3)
    });

    // ⚠️ OPRAVA: Vrátit přímo pole jako getFinancovaniZdroj25 pro konzistenci
    return druhyObjednavky;

  } catch (error) {
    logDebug('error', 'states25/by-object-type', null, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

    throw error;
  }
};

/**
 * Získání seznamu zdrojů financování ze systému STATES25
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @returns {Promise<Array>} Seznam zdrojů financování
 */
export const getFinancovaniZdroj25 = async ({ token, username, aktivni = 1 }) => {
  try {
    // Podle API dokumentace - pouze tyto 3 parametry + aktivni pro filtrování
    const requestData = {
      token,
      username,
      typ_objektu: 'FINANCOVANI_ZDROJ',
      aktivni: aktivni  // ✅ Filtrovat pouze aktivní záznamy
    };

    logDebug('request', 'states25/by-object-type', {
      ...requestData,
      token: token ? `${token.substring(0, 10)}...` : 'null' // Skrýt token v logu
    });

    // Volání API bez endpoint wrapperu - přímé volání endpointu
    const response = await api25orders.post('states25/by-object-type', requestData);
    logDebug('success', 'states25/by-object-type', null, {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });

    // Zpracování odpovědi - jednoduchý seznam bez hierarchie
    const rawData = response.data?.data || [];

    logDebug('info', 'states25/by-object-type', null, {
      rawDataSample: rawData.slice(0, 3),
      totalCount: rawData.length,
      fields: rawData[0] ? Object.keys(rawData[0]) : []
    });

    // Transformace dat na formát pro select komponentu
    const financovaniOptions = rawData
      .filter(item => item.kod_stavu && item.nazev_stavu) // Pouze platné záznamy
      .sort((a, b) => (a.nazev_stavu || '').localeCompare(b.nazev_stavu || '', 'cs')) // Řazení podle názvu
      .map(item => ({
        id: item.kod_stavu,
        kod: item.kod_stavu,
        kod_stavu: item.kod_stavu, // ⚠️ OPRAVA: Přidat kod_stavu pro konzistenci
        nazev: item.nazev_stavu,
        nazev_stavu: item.nazev_stavu, // ⚠️ OPRAVA: Přidat nazev_stavu pro konzistenci
        label: item.nazev_stavu, // Pro zobrazení v select komponentě
        raw: item // Původní data pro případné další použití
      }));

    logDebug('info', 'states25/by-object-type', null, {
      transformedCount: financovaniOptions.length,
      transformedSample: financovaniOptions.slice(0, 3)
    });

    return financovaniOptions;

  } catch (error) {
    const normalizedError = normalizeApi25OrdersError(error);

    logDebug('error', 'states25/by-object-type', null, {
      error: normalizedError.message,
      status: error.response?.status || 'NETWORK_ERROR',
      statusText: error.response?.statusText || 'Connection failed',
      response_data: error.response?.data || null,
      request_url: error.config?.url || 'Unknown URL',
      request_method: error.config?.method?.toUpperCase() || 'POST',
      request_headers: error.config?.headers || {},
      original_error: error.message
    });

    throw normalizedError;
  }
};

// ===================================================================
// GUID GENERATION UTILITIES
// ===================================================================

/**
 * Generátor GUID pro přílohy (RFC 4122 compliant UUID v4)
 * @returns {string} GUID ve formátu xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateAttachmentGUID25() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

/**
 * Vytvoří systémový název souboru ve formátu YYYY-MM-DD_GUID
 * @param {string} [guid] - Volitelný GUID, pokud není zadán, vygeneruje se nový
 * @returns {string} Systémový název ve formátu 2025-10-10_E3A4B2C1-D5F6-4E7A-8B9C-1D2E3F4A5B6C
 */
export function generateSystemovyNazev25(guid = null) {
  const datePart = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const fullGuid = guid || generateAttachmentGUID25();
  return `${datePart}_${fullGuid}`;
}

/**
 * Vytvoří metadata pro nový attachment před uploadem
 * @param {File} file - Soubor k nahrání
 * @returns {Object} Metadata attachment
 */
export function createAttachmentMetadata25(file) {
  const fullGuid = generateAttachmentGUID25();
  const systemovyNazev = generateSystemovyNazev25(fullGuid);
  const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
  const displayName = `${systemovyNazev}${ext}`;

  const metadata = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, // Frontend ID
    guid: fullGuid,
    originalName: file.name,
    generatedName: displayName,
    systemovy_nazev: systemovyNazev,
    file,
    createdAt: new Date().toISOString()
  };

  // Debug log VYPNUT - zabírá výkon
  // logDebug('info', 'attachment/metadata', null, {
  //   original_filename: file.name,
  //   generated_guid: fullGuid,
  //   systemovy_nazev: systemovyNazev,
  //   display_name: displayName,
  //   file_size: file.size,
  //   file_type: file.type
  // });

  return metadata;
}

/**
 * Získání číselníku typů příloh z Orders25 API
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @returns {Promise<Array>} Seznam typů příloh
 */
export const getTypyPriloh25 = async ({ token, username, aktivni = 1 }) => {
  try {
    const requestData = {
      token,
      username,
      typ_objektu: 'PRILOHA_TYP',
      aktivni: aktivni  // ✅ Filtrovat pouze aktivní typy příloh
    };

    logDebug('request', 'states25/by-object-type', {
      ...requestData,
      token: token ? `${token.substring(0, 10)}...` : 'null'
    });

    const response = await api25orders.post('states25/by-object-type', requestData);

    // Zpracování odpovědi
    const rawData = response.data?.data || [];

    // Transformace dat na formát pro select komponentu
    const typyPrilohOptions = rawData
      .filter(item => item.kod_stavu && item.nazev_stavu) // Pouze platné záznamy
      .sort((a, b) => (a.nazev_stavu || '').localeCompare(b.nazev_stavu || '', 'cs')) // Řazení podle názvu
      .map(item => ({
        value: item.kod_stavu,
        label: item.nazev_stavu,
        kod: item.kod_stavu,
        nazev: item.nazev_stavu
      }));

    logDebug('success', 'states25/by-object-type PRILOHA_TYP', null, {
      loaded_count: typyPrilohOptions.length,
      sample: typyPrilohOptions.slice(0, 3)
    });

    return typyPrilohOptions;

  } catch (error) {
    logDebug('error', 'states25/by-object-type PRILOHA_TYP', null, error.message);
    throw new Error(`Chyba při načítání typů příloh: ${error.message}`);
  }
};

// 📎 Načtení typů FAKTUR z databáze (FAKTURA_TYP klasifikace)
export const getTypyFaktur25 = async ({ token, username, aktivni = 1 }) => {
  try {
    const requestData = {
      token,
      username,
      typ_objektu: 'FAKTURA_TYP',
      aktivni: aktivni  // ✅ Filtrovat pouze aktivní typy faktur
    };

    logDebug('request', 'states25/by-object-type', {
      ...requestData,
      token: token ? `${token.substring(0, 10)}...` : 'null'
    });

    const response = await api25orders.post('states25/by-object-type', requestData);

    // Zpracování odpovědi
    const rawData = response.data?.data || [];

    // Transformace dat na formát pro select komponentu
    const typyFakturOptions = rawData
      .filter(item => item.kod_stavu && item.nazev_stavu) // Pouze platné záznamy
      .sort((a, b) => (a.nazev_stavu || '').localeCompare(b.nazev_stavu || '', 'cs')) // Řazení podle názvu
      .map(item => ({
        value: item.kod_stavu,
        label: item.nazev_stavu,
        kod: item.kod_stavu,
        nazev: item.nazev_stavu
      }));

    logDebug('success', 'states25/by-object-type FAKTURA_TYP', null, {
      loaded_count: typyFakturOptions.length,
      sample: typyFakturOptions.slice(0, 3)
    });

    return typyFakturOptions;

  } catch (error) {
    logDebug('error', 'states25/by-object-type FAKTURA_TYP', null, error.message);
    throw new Error(`Chyba při načítání typů faktur: ${error.message}`);
  }
};

// 🔄 Načtení stavů WORKFLOW z databáze (OBJEDNAVKA workflow stavy)
export const getStavyWorkflow25 = async ({ token, username }) => {
  try {
    const requestData = {
      token,
      username,
      typ_objektu: 'OBJEDNAVKA'
    };

    logDebug('request', 'states25/by-object-type', {
      ...requestData,
      token: token ? `${token.substring(0, 10)}...` : 'null'
    });

    const response = await api25orders.post('states25/by-object-type', requestData);

    // Zpracování odpovědi
    const rawData = response.data?.data || [];

    // Transformace dat na formát pro lookup podle workflow kódu
    const stavyWorkflowMap = {};
    rawData
      .filter(item => item.kod_stavu && item.nazev_stavu) // Pouze platné záznamy
      .forEach(item => {
        stavyWorkflowMap[item.kod_stavu] = {
          kod: item.kod_stavu,
          nazev: item.nazev_stavu,
          popis: item.popis_stavu || '',
          // Zachovat i raw data pro případné další použití
          raw: item
        };
      });

    logDebug('success', 'states25/by-object-type OBJEDNAVKA', null, {
      loaded_count: Object.keys(stavyWorkflowMap).length,
      sample: Object.keys(stavyWorkflowMap).slice(0, 3)
    });

    return stavyWorkflowMap;

  } catch (error) {
    logDebug('error', 'states25/by-object-type OBJEDNAVKA', null, error.message);
    throw new Error(`Chyba při načítání workflow stavů: ${error.message}`);
  }
};

// ===================================================================
// ORDER V2 ATTACHMENTS API - Správa příloh pro objednávky
// Dokumentace: ORDER-V2-ATTACHMENTS-API.md
// ===================================================================

/**
 * Upload přílohy pro Order V2
 * @param {Object} params - Parametry uploadu
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @param {number|string} params.objednavka_id - ID objednávky
 * @param {File} params.file - Soubor k nahrání
 * @param {string} [params.description] - Popis přílohy (volitelný)
 * @returns {Promise<Object>} Response s detaily nahrané přílohy
 */
export async function uploadAttachment25({ token, username, objednavka_id, file, description }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!objednavka_id) {
    throw new Error('Chybí ID objednávky.');
  }

  if (!file || !(file instanceof File)) {
    throw new Error('Chybí soubor k nahrání.');
  }

  try {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('username', username);
    formData.append('file', file);

    if (description) {
      formData.append('description', description);
    }

    logDebug('request', `order-v2/${objednavka_id}/attachments/upload`, {
      objednavka_id,
      filename: file.name,
      size: file.size,
      type: file.type,
      description: description || ''
    });

    const response = await api25orders.post(`order-v2/${objednavka_id}/attachments/upload`, formData, {
      timeout: 60000, // 60s pro velké soubory
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při uploadu přílohy';
      logDebug('error', `order-v2/${objednavka_id}/attachments/upload`, null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.status === 'error') {
      logDebug('error', `order-v2/${objednavka_id}/attachments/upload`, null, data.message);
      throw new Error(data.message || 'Chyba při nahrávání přílohy');
    }

    if (data.status === 'success') {
      logDebug('success', `order-v2/${objednavka_id}/attachments/upload`, null, {
        attachment_id: data.data?.attachment_id,
        original_filename: data.data?.original_filename,
        file_size: data.data?.file_size
      });
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', `order-v2/${objednavka_id}/attachments/upload`, null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

/**
 * Seznam příloh pro objednávku Order V2
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @param {number|string} params.objednavka_id - ID objednávky
 * @returns {Promise<Object>} Response se seznamem příloh
 */
export async function listAttachments25({ token, username, objednavka_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!objednavka_id) {
    throw new Error('Chybí ID objednávky.');
  }

  try {
    const payload = {
      token,
      username
    };

    logDebug('request', `order-v2/${objednavka_id}/attachments`, { ...payload, token: '***' });

    const response = await api25orders.post(`order-v2/${objednavka_id}/attachments`, payload, {
      timeout: 10000
    });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při načítání příloh';
      logDebug('error', `order-v2/${objednavka_id}/attachments`, null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.status === 'error') {
      logDebug('error', `order-v2/${objednavka_id}/attachments`, null, data.message);
      throw new Error(data.message || 'Chyba při načítání příloh');
    }

    if (data.status === 'success') {
      logDebug('success', `order-v2/${objednavka_id}/attachments`, null, {
        count: data.count || 0
      });
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', `order-v2/${objednavka_id}/attachments`, null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

/**
 * Download přílohy Order V2
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @param {number|string} params.objednavka_id - ID objednávky
 * @param {number|string} params.attachment_id - ID přílohy
 * @returns {Promise<Blob>} Binární data souboru
 */
export async function downloadAttachment25({ token, username, objednavka_id, attachment_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!objednavka_id) {
    throw new Error('Chybí ID objednávky.');
  }

  if (!attachment_id) {
    throw new Error('Chybí ID přílohy.');
  }

  try {
    logDebug('request', `order-v2/${objednavka_id}/attachments/${attachment_id}/download`, { token: '***', username });

    const payload = {
      token,
      username
    };

    // ✅ V2 API: POST s token + username v BODY (jako u faktur)
    const response = await api25orders.post(
      `order-v2/${objednavka_id}/attachments/${attachment_id}/download`,
      payload,
      {
        timeout: 30000,
        responseType: 'blob'
      }
    );

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při stahování přílohy';
      logDebug('error', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, error);
      throw new Error(error);
    }

    logDebug('success', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, {
      blob_size: response.data.size,
      content_type: response.headers['content-type']
    });

    return response.data;

  } catch (error) {
    // Blob error response - parsuj JSON a extrahuj message
    if (error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      
      let errorMessage = text;
      try {
        const data = JSON.parse(text);
        errorMessage = data.message || data.error || data.err || text;
      } catch (parseError) {
        // Pokud JSON parse selže, použij raw text
      }
      
      logDebug('error', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, errorMessage);
      throw new Error(errorMessage || 'Nepodařilo se stáhnout přílohu');
    }
    
    logDebug('error', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

/**
 * Smazání přílohy Order V2
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @param {number|string} params.objednavka_id - ID objednávky
 * @param {number|string} params.attachment_id - ID přílohy
 * @returns {Promise<Object>} Response s výsledkem smazání
 */
export async function deleteAttachment25({ token, username, objednavka_id, attachment_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!objednavka_id) {
    throw new Error('Chybí ID objednávky.');
  }

  if (!attachment_id) {
    throw new Error('Chybí ID přílohy.');
  }

  try {
    const data = {
      token,
      username
    };

    logDebug('request', `order-v2/${objednavka_id}/attachments/${attachment_id}`, { ...data, token: '***' });

    const response = await api25orders.delete(`order-v2/${objednavka_id}/attachments/${attachment_id}`, {
      data,
      timeout: 15000
    });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při mazání přílohy';
      logDebug('error', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, error);
      throw new Error(error);
    }

    const responseData = response.data;

    if (responseData.status === 'error') {
      logDebug('error', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, responseData.message);
      throw new Error(responseData.message || 'Chyba při mazání přílohy');
    }

    if (responseData.status === 'success') {
      logDebug('success', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, {
        deleted_attachment_id: responseData.data?.deleted_attachment_id,
        original_filename: responseData.data?.original_filename
      });
      return responseData;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

/**
 * Aktualizace metadat přílohy Order V2
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @param {number|string} params.objednavka_id - ID objednávky
 * @param {number|string} params.attachment_id - ID přílohy
 * @param {string} [params.typ_prilohy] - Nový typ přílohy (klasifikace)
 * @param {string} [params.description] - Nový popis přílohy
 * @param {string} [params.original_filename] - Nový název souboru
 * @returns {Promise<Object>} Response s výsledkem aktualizace
 */
export async function updateAttachment25({ token, username, objednavka_id, attachment_id, typ_prilohy, description, original_filename }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!objednavka_id) {
    throw new Error('Chybí ID objednávky.');
  }

  if (!attachment_id) {
    throw new Error('Chybí ID přílohy.');
  }

  try {
    const payload = {
      token,
      username
    };

    if (typ_prilohy !== undefined) {
      payload.type = typ_prilohy; // Backend očekává 'type', ne 'typ_prilohy'
    }

    if (description !== undefined) {
      payload.description = description;
    }

    if (original_filename !== undefined) {
      payload.original_name = original_filename; // Backend očekává 'original_name'
    }

    logDebug('request', `order-v2/${objednavka_id}/attachments/${attachment_id}`, { ...payload, token: '***' });

    const response = await api25orders.put(`order-v2/${objednavka_id}/attachments/${attachment_id}`, payload, {
      timeout: 10000
    });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při aktualizaci přílohy';
      logDebug('error', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.status === 'error') {
      logDebug('error', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, data.message);
      throw new Error(data.message || 'Chyba při aktualizaci přílohy');
    }

    // ✅ Backend může vracet 'ok' nebo 'success'
    if (data.status === 'success' || data.status === 'ok') {
      logDebug('success', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, {
        attachment_id: data.data?.attachment_id,
        original_name: data.data?.original_name,
        type: data.data?.type,
        description: data.data?.description
      });
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', `order-v2/${objednavka_id}/attachments/${attachment_id}`, null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

/**
 * Ověření integrity příloh Order V2
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @param {number|string} params.objednavka_id - ID objednávky
 * @returns {Promise<Object>} Response s výsledky ověření
 */
export async function verifyAttachments25({ token, username, objednavka_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!objednavka_id) {
    throw new Error('Chybí ID objednávky.');
  }

  try {
    const payload = {
      token,
      username
    };

    logDebug('request', `order-v2/${objednavka_id}/attachments/verify`, { ...payload, token: '***' });

    const response = await api25orders.post(`order-v2/${objednavka_id}/attachments/verify`, payload, {
      timeout: 15000
    });

    if (response.status !== 200) {
      const error = 'Neočekávaný kód odpovědi při ověřování příloh';
      logDebug('error', `order-v2/${objednavka_id}/attachments/verify`, null, error);
      throw new Error(error);
    }

    const data = response.data;

    if (data.status === 'error') {
      logDebug('error', `order-v2/${objednavka_id}/attachments/verify`, null, data.message);
      throw new Error(data.message || 'Chyba při ověřování příloh');
    }

    if (data.status === 'success') {
      logDebug('success', `order-v2/${objednavka_id}/attachments/verify`, null, {
        total_attachments: data.data?.total_attachments,
        valid_attachments: data.data?.valid_attachments,
        invalid_attachments: data.data?.invalid_attachments
      });
      return data;
    }

    throw new Error('Neočekávaná struktura odpovědi ze serveru');

  } catch (error) {
    logDebug('error', `order-v2/${objednavka_id}/attachments/verify`, null, error.message);
    throw new Error(normalizeApi25OrdersError(error));
  }
}

/**
 * Zjistí, zda je soubor zobrazitelný v prohlížeči
 * @param {string} filename - Název souboru
 * @returns {boolean} True pokud lze zobrazit v prohlížeči
 */
export function isPreviewableInBrowser(filename) {
  if (!filename) return false;
  
  const ext = filename.toLowerCase().split('.').pop();
  const previewableExtensions = [
    // PDF
    'pdf',
    // Obrázky
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
    // Textové soubory
    'txt', 'xml', 'json'
  ];
  
  return previewableExtensions.includes(ext);
}

/**
 * Stáhne soubor přímo bez otevírání dialogu
 * @param {Blob} blob - Blob data souboru
 * @param {string} filename - Název souboru
 * @returns {boolean} True pokud se podařilo stáhnout
 */
export function openInBrowser25(blob, filename) {
  try {
    // Místo window.open používáme přímé stažení
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'soubor';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Uvolnění URL po krátké pauze
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Chyba při stahování souboru:', error);
    return false;
  }
}

/**
 * Utility funkce pro vytvoření download linku z blob dat
 * @param {Blob} blob - Blob data souboru
 * @param {string} filename - Název souboru pro stažení
 */
export function createDownloadLink25(blob, filename) {
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'priloha';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error('Nepodařilo se vytvořit odkaz pro stažení souboru');
  }
}

/**
 * Utility funkce pro validaci typu souboru
 * Podporované formáty podle Order V2 API dokumentace
 * @param {string} filename - Název souboru
 * @returns {boolean} True pokud je typ povolený
 */
export function isAllowedFileType25(filename) {
  if (!filename) return false;

  const allowedExtensions = [
    // Dokumenty
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.rtf',
    // Obrázky
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',
    // Archivy
    '.zip', '.rar', '.7z',
    // Ostatní
    '.xml', '.csv', '.json'
  ];

  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(ext);
}

/**
 * Utility funkce pro validaci velikosti souboru
 * @param {number} fileSize - Velikost souboru v bytech
 * @param {number} maxSizeMB - Maximální velikost v MB (default 10MB podle Order V2 API)
 * @returns {boolean} True pokud je velikost přijatelná
 */
export function isAllowedFileSize25(fileSize, maxSizeMB = 10) {
  if (!fileSize) return false;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxSizeBytes;
}

/**
 * Utility funkce pro formátování velikosti souboru
 * @param {number} bytes - Velikost v bytech
 * @returns {string} Formátovaná velikost (např. "1.5 MB")
 */
export function formatFileSize25(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// EXPORT SUMMARY - Přehled exportovaných funkcí
// ===================================================================

/**
 * Exportované funkce pro ORDERS25 API:
 *
 * SETUP:
 * - setDebugLogger(loggerFn) - Nastavení debug loggeru
 * - normalizeApi25OrdersError(err) - Normalizace chyb
 * - getUserErrorMessage25Orders(err) - Uživatelsky přívětivé chybové zprávy
 *
 * CRUD operace:
 * - getOrdersList25({ token, username, filters }) - Seznam objednávek (s enriched data)
 * - getOrder25({ token, username, orderId }) - Detail objednávky
 * - getOrdersByUser25({ token, username, userId, rok }) - Objednávky podle oprávnění (bez userId = všechny, s userId = filtrované)
 * - createOrder25({ token, username, orderData }) - Vytvoření objednávky (plné)
 * - updateOrder25({ token, username, orderId, orderData }) - Aktualizace objednávky (plná)
 * - deleteOrder25({ token, username, orderId }) - Smazání objednávky (soft delete - backward compatibility)
 * - softDeleteOrder25({ token, username, orderId }) - Označí jako neaktivní (doporučené)
 * - hardDeleteOrder25({ token, username, orderId }) - Úplné smazání (POZOR: nevratné!)
 * - unlockOrder25({ token, username, orderId }) - Odemkne objednávku po zrušení editace
 *
 * Speciální operace:
 * - getNextOrderNumber25({ token, username }) - Nové číslo objednávky
 * - checkOrderNumber25({ token, username, cisloObjednavky, suggest }) - Kontrola čísla
 * - createPartialOrder25({ token, username, orderData, autoAssignNumber }) - Částečné vytvoření
 * - updatePartialOrder25({ token, username, orderId, orderData }) - Částečná aktualizace
 *
 * Číselníky:
 * - getStrediska25({ token, username }) - Seznam středisek s hierarchií
 * - getFinancovaniZdroj25({ token, username }) - Seznam zdrojů financování
 * - getDruhyObjednavky25({ token, username }) - Seznam druhů objednávky
 * - getTypyPriloh25({ token, username }) - Seznam typů příloh (PRILOHA_TYP)
 *
 * ATTACHMENTS (Order V2):
 * - uploadAttachment25({ token, username, objednavka_id, file, description }) - Upload přílohy
 * - listAttachments25({ token, username, objednavka_id }) - Seznam příloh
 * - downloadAttachment25({ token, username, objednavka_id, attachment_id }) - Download přílohy
 * - deleteAttachment25({ token, username, objednavka_id, attachment_id }) - Smazání přílohy
 * - updateAttachment25({ token, username, objednavka_id, attachment_id, description, original_filename }) - Aktualizace metadat
 * - verifyAttachments25({ token, username, objednavka_id }) - Ověření integrity
 * - createDownloadLink25(blob, filename) - Utility pro download
 * - isAllowedFileType25(filename) - Validace typu souboru
 * - isAllowedFileSize25(fileSize, maxSizeMB) - Validace velikosti
 * - formatFileSize25(bytes) - Formátování velikosti souboru
 *
 * IMPORT STARÝCH OBJEDNÁVEK:
 * - importOldOrders25({ token, username, oldOrderIds, tabulkaObj, tabulkaOpriloh }) - Import ze staré DB
 *
 * Všechny funkce logují do debug okénka pomocí logDebug()
 */

/**
 * Import starých objednávek ze DEMO databáze do nového systému orders25
 *
 * Endpoint: POST /orders25/import-oldies
 * Backend dokumentace: docs/import/IMPORT_OLDIES_API_DOCUMENTATION.md
 *
 * @param {Object} params
 * @param {string} params.token - Autorizační token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.userId - ID uživatele (z AuthContext user.id)
 * @param {number[]} params.oldOrderIds - Pole ID starých objednávek k importu
 * @param {string} [params.tabulkaObj='DEMO_objednavky_2025'] - Název tabulky se starými objednávkami
 * @param {string} [params.tabulkaOpriloh='DEMO_pripojene_odokumenty'] - Název tabulky se starými přílohami
 * @param {string} [params.database] - Volitelný název databáze
 * @returns {Promise<Object>} Response s detaily importu
 *
 * Response struktura:
 * {
 *   success: boolean,
 *   imported_count: number,
 *   failed_count: number,
 *   results: [
 *     {
 *       old_id: number,
 *       new_id: number | null,
 *       cislo_objednavky: string,
 *       polozky_count: number,
 *       prilohy_count: number,
 *       status: 'OK' | 'ERROR',
 *       error: string | null
 *     }
 *   ]
 * }
 */
export async function importOldOrders25({
  token,
  username,
  userId,
  oldOrderIds,
  tabulkaObj = 'DEMO_objednavky_2025',
  tabulkaOpriloh = 'DEMO_pripojene_odokumenty',
  database = null
}) {
  // Validace vstupních parametrů
  if (!oldOrderIds || !Array.isArray(oldOrderIds) || oldOrderIds.length === 0) {
    throw new Error('Parametr oldOrderIds musí být neprázdné pole čísel');
  }

  if (!token || !username) {
    throw new Error('Token a username jsou povinné parametry');
  }

  if (!userId) {
    throw new Error('Chybí ID uživatele (userId parameter)');
  }

  const payload = {
    token,           // Token MUSÍ být v payloadu pro backend ověření
    username,        // Username MUSÍ být v payloadu pro backend ověření
    old_order_ids: oldOrderIds,
    uzivatel_id: parseInt(userId, 10),
    tabulka_obj: tabulkaObj,
    tabulka_opriloh: tabulkaOpriloh
  };

  // Přidáme database pouze pokud je zadaná
  if (database) {
    payload.database = database;
  }

  logDebug('request', 'orders25/import-oldies', { ...payload, token: '***' });

  try {
    // Headers se přidávají automaticky přes interceptor - stejně jako u všech ostatních API volání
    // Timeout 5 minut (300000 ms) pro velké importy
    const response = await api25orders.post('orders25/import-oldies', payload, { timeout: 300000 });

    logDebug('success', 'orders25/import-oldies', payload, response.data);

    // Kontrola, že response.data je validní objekt
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Backend vrátil neplatnou odpověď (není JSON objekt)');
    }

    return response.data;
  } catch (err) {
    logDebug('error', 'orders25/import-oldies', payload, err.response?.data || err.message);
    throw err;
  }
}

/**
 * Získá počet objednávek podle uživatele
 * @param {Object} params - Parametry pro API volání
 * @param {string} params.token - Autentizační token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.user_id - ID uživatele
 * @returns {Promise<Object>} Počet objednávek uživatele
 */
export async function getOrdersCountByUser(params) {
  try {
    // Debug: Orders Count by User API Request

    logDebug('request', 'orders25/count-by-user', params);

    const response = await api25orders.post('orders25/count-by-user', {
      token: params.token,
      username: params.username,
      user_id: params.user_id
    });

    // Debug: Orders Count by User API Response
    logDebug('success', 'orders25/count-by-user', params, response.data);

    // Validace odpovědi
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Backend vrátil neplatnou odpověď');
    }

    if (response.data.err) {
      throw new Error(response.data.err);
    }

    if (response.data.status !== 'ok') {
      throw new Error('Backend vrátil chybu: ' + (response.data.message || 'Neznámá chyba'));
    }

    return response.data;
  } catch (err) {
    console.error('❌ Count by user failed:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      user_id: params.user_id
    });
    logDebug('error', 'orders25/count-by-user', params, err.response?.data || err.message);
    throw err;
  }
}

/**
 * 🔥 Import starých objednávek s SSE streaming (real-time progress)
 *
 * @param {Object} params
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.userId - ID uživatele
 * @param {Array<number>} params.oldOrderIds - IDs objednávek k importu
 * @param {string} params.tabulkaObj - Název tabulky objednávek
 * @param {string} params.tabulkaOpriloh - Název tabulky příloh
 * @param {string} params.database - Název databáze (optional)
 * @param {Function} params.onProgress - Callback pro progress updates
 * @param {Function} params.onComplete - Callback pro dokončení
 * @param {Function} params.onError - Callback pro chyby
 * @returns {Promise<{results: Array, imported_count: number, updated_count: number, failed_count: number}>}
 */
export async function importOldOrders25Streaming({
  token,
  username,
  userId,
  oldOrderIds,
  tabulkaObj = 'DEMO_objednavky_2025',
  tabulkaOpriloh = 'DEMO_pripojene_odokumenty',
  database = null,
  onProgress = null,
  onComplete = null,
  onError = null
}) {
  // Validace vstupních parametrů
  if (!oldOrderIds || !Array.isArray(oldOrderIds) || oldOrderIds.length === 0) {
    throw new Error('Parametr oldOrderIds musí být neprázdné pole čísel');
  }

  if (!token || !username) {
    throw new Error('Token a username jsou povinné parametry');
  }

  if (!userId) {
    throw new Error('Chybí ID uživatele (userId parameter)');
  }

  const payload = {
    token,
    username,
    old_order_ids: oldOrderIds,
    uzivatel_id: parseInt(userId, 10),
    tabulka_obj: tabulkaObj,
    tabulka_opriloh: tabulkaOpriloh,
    streaming: true  // 🔥 Zapni SSE streaming
  };

  if (database) {
    payload.database = database;
  }

  return new Promise((resolve, reject) => {
    // Sestav URL pro SSE streaming
    let baseURL = api25orders.defaults.baseURL;

    // Validace baseURL
    if (!baseURL) {
      const error = new Error('❌ CHYBA: API baseURL není definována! Zkontrolujte REACT_APP_API2_BASE_URL v .env souboru');
      if (onError) onError(error);
      reject(error);
      return;
    }

    // Odstraň trailing slash z baseURL aby se předešlo double slash
    baseURL = baseURL.replace(/\/$/, '');

    const url = `${baseURL}/orders25/import-oldies`;

    // Prepare fetch request s EventSource alternative (EventSource nepodporuje POST)
    // Použijeme fetch s streaming response
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;

        // Specifická chyba pro 404
        if (response.status === 404) {
          throw new Error(`❌ API endpoint nenalezen (404)\n\nURL: ${response.url}\n\nBackend pravděpodobně:\n• Neběží\n• Nemá implementovaný SSE endpoint /orders25/import-oldies\n• Používá jinou URL strukturu`);
        }

        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Aggregace výsledků
      const allResults = [];
      let finalStats = null;

      const processChunk = ({ done, value }) => {
        if (done) {
          // Pokud máme final stats, resolve s nimi
          if (finalStats) {
            resolve({
              results: allResults,
              imported_count: finalStats.imported_count,
              updated_count: finalStats.updated_count,
              failed_count: finalStats.failed_count,
              total_count: finalStats.total_count
            });
          } else {
            // Fallback pokud complete event nepřišel
            resolve({
              results: allResults,
              imported_count: allResults.filter(r => r.operation === 'INSERT').length,
              updated_count: allResults.filter(r => r.operation === 'UPDATE').length,
              failed_count: allResults.filter(r => r.status === 'ERROR').length,
              total_count: allResults.length
            });
          }
          return;
        }

        // Dekóduj chunk a přidej do bufferu
        buffer += decoder.decode(value, { stream: true });

        // Zpracuj všechny kompletní řádky
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Poslední neúplný řádek zpět do bufferu

        lines.forEach(line => {
          if (!line.trim() || !line.startsWith('data: ')) return;

          try {
            // Parse SSE data
            const jsonStr = line.substring(6); // Remove "data: " prefix
            const event = JSON.parse(jsonStr);

            switch (event.type) {
              case 'start':
                break;

              case 'progress':
                // Uložit výsledek do agregace
                if (event.last_result) {
                  allResults.push(event.last_result);
                }

                // Callback pro progress update
                if (onProgress) {
                  onProgress({
                    current: event.current,
                    total: event.total,
                    percentage: event.percentage,
                    imported: event.imported,
                    updated: event.updated,
                    failed: event.failed,
                    last_result: event.last_result,  // Ponecháme snake_case konzistentní s backendem
                    timestamp: event.timestamp
                  });
                }
                break;

              case 'complete':
                finalStats = event;

                // Callback pro dokončení
                if (onComplete) {
                  onComplete({
                    imported_count: event.imported_count,
                    updated_count: event.updated_count,
                    failed_count: event.failed_count,
                    total_count: event.total_count,
                    timestamp: event.timestamp
                  });
                }
                break;

              default:
            }
          } catch (err) {
            if (onError) {
              onError(new Error(`Failed to parse SSE event: ${err.message}`));
            }
          }
        });

        // Čti další chunk
        return reader.read().then(processChunk);
      };

      // Start reading stream
      return reader.read().then(processChunk);
    })
    .catch(err => {
      if (onError) {
        onError(err);
      }
      reject(err);
    });
  });
}

// Export axios instance for direct use
export { api25orders };
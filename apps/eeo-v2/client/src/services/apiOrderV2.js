/**
 * 📊 ORDER V2 API Service
 *
 * Standardizovaný API klient pro Order V2 endpointy
 * Implementace podle dokumentace: docs/API-DATA-TYPES-STANDARDIZATION.md
 *
 * Backend endpointy: /order-v2/*
 * Verze: v2.0.0
 * Datum: 29. října 2025
 *
 * ✅ Standardizované datové typy:
 * - strediska_kod: string[] (array stringů)
 * - financovani: {typ, nazev, lp_kody?}
 * - druh_objednavky_kod: string
 * - max_cena_s_dph: string (pro přesnost)
 * - dodavatel_zpusob_potvrzeni: {zpusob_potvrzeni[], zpusob_platby}
 */

import axios from 'axios';

// Axios instance pro Order V2 API
const apiOrderV2 = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo/',
  headers: { 'Content-Type': 'application/json' }
});

// Response interceptor pro error handling
apiOrderV2.interceptors.response.use(
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
 * 🔧 Helper: Validate OrderV2 data structure
 */
export function validateOrderV2Data(data) {
  const errors = [];

  // Strediska - must be array
  if (data.strediska_kod && !Array.isArray(data.strediska_kod)) {
    errors.push('strediska_kod musí být array');
  }

  // Financovani - can be JSON string or object with typ and nazev
  if (data.financovani) {
    // ✅ ALLOW JSON STRING: Backend akceptuje oba formáty
    if (typeof data.financovani === 'string') {
      // Validovat že je to validní JSON
      try {
        const parsed = JSON.parse(data.financovani);
        // Validovat strukturu parsovaného objektu
        if (!parsed.kod_stavu && !parsed.typ) {
          errors.push('financovani musí obsahovat kod_stavu nebo typ');
        }
        if (!parsed.nazev_stavu && !parsed.nazev) {
          errors.push('financovani musí obsahovat nazev_stavu nebo nazev');
        }
      } catch (e) {
        errors.push('financovani jako string musí být validní JSON');
      }
    } else if (typeof data.financovani === 'object') {
      // Validovat objekt přímo
      if (!data.financovani.typ && !data.financovani.kod_stavu) {
        errors.push('financovani.typ nebo kod_stavu je povinné');
      }
      if (!data.financovani.nazev && !data.financovani.nazev_stavu) {
        errors.push('financovani.nazev nebo nazev_stavu je povinné');
      }
      if (data.financovani.lp_kody && !Array.isArray(data.financovani.lp_kody)) {
        errors.push('financovani.lp_kody musí být array');
      }
    } else {
      errors.push('financovani musí být objekt nebo JSON string');
    }
  }

  // Druh objednavky - must be string
  if (data.druh_objednavky_kod && typeof data.druh_objednavky_kod !== 'string') {
    errors.push('druh_objednavky_kod musí být string');
  }

  // Money fields - must be string
  const moneyFields = ['max_cena_s_dph'];
  moneyFields.forEach(field => {
    if (data[field] !== undefined && typeof data[field] !== 'string') {
      errors.push(`${field} musí být string (pro přesnost)`);
    }
  });

  return errors;
}

/**
 * 🔧 Helper: Transform FE data → BE format
 * Zajistí že data jsou ve správném formátu před odesláním
 *
 * 🔥 PARTIAL UPDATE: Odstraní undefined/null hodnoty pro UPDATE
 * - Backend podporuje partial update - posílejte jen změněná pole
 * - Undefined/null hodnoty jsou odstraněny aby backend použil existující data
 */
export function prepareDataForAPI(data, isUpdate = false) {

  const result = { ...data };

  // 🚫 KRITICKÉ: Odstraň READ-ONLY pole generovaná backendem
  // ev_cislo a cislo_objednavky NIKDY neposíláme - backend je vždy generuje sám!
  delete result.ev_cislo;
  delete result.cislo_objednavky;

  // Peníze: Convert to string
  if (result.max_cena_s_dph !== undefined && result.max_cena_s_dph !== null) {
    const original = result.max_cena_s_dph;
    result.max_cena_s_dph = String(result.max_cena_s_dph);
  }

  // Strediska: Ensure array of strings (nebo odstraň pokud prázdné)
  if (result.strediska_kod !== undefined) {
    const originalStrediska = result.strediska_kod;

    if (Array.isArray(result.strediska_kod) && result.strediska_kod.length > 0) {
      // 🔥 FIX: Extrahuj kod z objektu pokud je to objekt
      result.strediska_kod = result.strediska_kod.map(item => {
        if (typeof item === 'object' && item !== null) {
          // Objekt - extrahuj kod/value/kod_stavu
          const extracted = String(item.kod || item.value || item.kod_stavu || '');
          return extracted;
        }
        return String(item);
      }).filter(k => k); // Odstraň prázdné stringy

      // Pokud po filtrování prázdné, odstraň celé pole
      if (result.strediska_kod.length === 0 && isUpdate) {
        delete result.strediska_kod;
      }
    } else if (isUpdate) {
      // Pro UPDATE: prázdné pole nebo null = odstraň z requestu
      delete result.strediska_kod;
    }
  }

  // Financovani: Ensure correct structure (nebo odstraň pokud prázdné)
  if (result.financovani !== undefined) {
    // 🔥 KRITICKÁ OPRAVA: Frontend posílá financovani jako JSON STRING, ne objekt!
    // Pokud je string a není prázdný, PONECHAT BEZ ZMĚNY
    if (typeof result.financovani === 'string' && result.financovani.trim() !== '') {
      // Je to JSON string s daty - PONECHAT!
    } else if (result.financovani && typeof result.financovani === 'object' && result.financovani.typ) {
      // ✅ Je to objekt - ZACHOVAT VŠECHNA POLE, jen validovat typy
      // NEMĚNÍME strukturu! Backend dostane přesně to co frontend připravil v normalizeFinancovaniForBackend()
      // Frontend už správně posílá: { typ, cislo_smlouvy?, lp_kody?, individualni_schvaleni?, ... }
    } else if (isUpdate) {
      // Pro UPDATE: prázdný objekt nebo null = odstraň z requestu
      delete result.financovani;
    }
  }

  // Druh objednavky: Ensure string (nebo odstraň pokud prázdný)
  if (result.druh_objednavky_kod !== undefined) {
    if (result.druh_objednavky_kod) {
      result.druh_objednavky_kod = String(result.druh_objednavky_kod);
    } else if (isUpdate) {
      delete result.druh_objednavky_kod;
    }
  }

  // Zpusob potvrzeni: Ensure correct structure (nebo odstraň pokud prázdné)
  if (result.dodavatel_zpusob_potvrzeni !== undefined) {
    if (result.dodavatel_zpusob_potvrzeni && typeof result.dodavatel_zpusob_potvrzeni === 'object') {
      // ✅ FE posílá formát: { potvrzeni: 'ANO', zpusoby: [], platba: '' }
      // ✅ DB očekává JSON string: {"potvrzeni":"ANO","zpusoby":["email"],"platba":"faktura","potvrzeno":true}

      const feData = result.dodavatel_zpusob_potvrzeni;

      // DB formát - vždy stejná struktura
      const dbFormat = {
        potvrzeni: feData.potvrzeni || 'NE',
        zpusoby: feData.zpusoby || feData.zpusob_potvrzeni || feData.zpusob || [],
        platba: feData.platba || feData.zpusob_platby || '',
        potvrzeno: feData.potvrzeni === 'ANO'
      };

      // Serializuj do JSON stringu pro DB
      result.dodavatel_zpusob_potvrzeni = JSON.stringify(dbFormat);
    } else if (typeof result.dodavatel_zpusob_potvrzeni === 'string') {
      // ✅ OPRAVA: Prázdný string znamená "smazat" - při UPDATE smazat pole
      if (result.dodavatel_zpusob_potvrzeni === '') {
        if (isUpdate) {
          delete result.dodavatel_zpusob_potvrzeni;
        }
        // Pro CREATE nechat prázdný string (backend ho ignoruje)
      } else {
        // 🔧 KRITICKÉ: String už obsahuje JSON, ale možná BEZ potvrzeno!
        // Parsuj ho, přidej potvrzeno a znovu serializuj
        try {
          const parsed = JSON.parse(result.dodavatel_zpusob_potvrzeni);

          // Pokud už má potvrzeno, nech ho být
          if (parsed.potvrzeno === undefined) {
            // ✅ Odvoď potvrzeno z dt_akceptace + dodavatel_potvrdil_id (jako backend)
            const maAkceptaci = !!(result.dt_akceptace && result.dodavatel_potvrdil_id);
            parsed.potvrzeno = maAkceptaci;

            const originalString = result.dodavatel_zpusob_potvrzeni;
            result.dodavatel_zpusob_potvrzeni = JSON.stringify(parsed);
          }
        } catch (e) {
          // Při chybě parsování - smazat pole při UPDATE
          if (isUpdate) {
            delete result.dodavatel_zpusob_potvrzeni;
          }
        }
      }
    } else if (isUpdate) {
      // Undefined nebo null při UPDATE - smazat pole
      delete result.dodavatel_zpusob_potvrzeni;
    }
  }

  // 🔄 ma_byt_zverejnena: Convert boolean to 0/1 for DB
  if (result.ma_byt_zverejnena !== undefined) {
    // Boolean nebo number → 0 nebo 1
    result.ma_byt_zverejnena = result.ma_byt_zverejnena ? 1 : 0;
  }

  // � Faktury: Ensure array of objects (pokud existují)
  if (result.faktury !== undefined) {
    if (Array.isArray(result.faktury) && result.faktury.length > 0) {
      // Validace každé faktury
      result.faktury = result.faktury.map(faktura => {
        const validFaktura = { ...faktura };

        // Zajistit správné datové typy
        if (validFaktura.fa_castka !== undefined) {
          validFaktura.fa_castka = parseFloat(validFaktura.fa_castka) || 0;
        }
        if (validFaktura.fa_dorucena !== undefined) {
          validFaktura.fa_dorucena = validFaktura.fa_dorucena ? 1 : 0;
        }

        // ID faktury - pokud je temp-, odstraň (BE vytvoří nové)
        if (validFaktura.id && String(validFaktura.id).startsWith('temp-')) {
          validFaktura.id = null;
        }

        return validFaktura;
      });
    } else if (isUpdate) {
      // Pro UPDATE: prázdné pole faktur = neměnit faktury (odstraň z requestu)
      delete result.faktury;
    }
  }

  // �🔥 PARTIAL UPDATE: Odstraň všechny undefined/null hodnoty
  // ⚠️ Prázdné stringy "" NECHÁME - můžou být legitimní hodnoty
  if (isUpdate) {
    Object.keys(result).forEach(key => {
      const value = result[key];
      // Odstraň jen undefined a null (ne prázdné stringy!)
      if (value === undefined || value === null) {
        delete result[key];
      }
      // Odstraň prázdné objekty
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) {
        delete result[key];
      }
      // Odstraň prázdná pole (až na strediska_kod a faktury - tam prázdné pole má význam)
      if (Array.isArray(value) && value.length === 0 && key !== 'strediska_kod' && key !== 'faktury') {
        delete result[key];
      }
      // 🔥 Odstraň neplatné ID hodnoty (0, negativní čísla, prázdné stringy)
      if (key.includes('_id') || key === 'id') {
        // Číslo <= 0
        if (typeof value === 'number' && value <= 0) {
          delete result[key];
        }
        // Prázdný string
        if (typeof value === 'string' && value.trim() === '') {
          delete result[key];
        }
      }
    });
  }

  return result;
}

/**
 * 🔧 Helper: Validate API response
 */
/**
 * Validate API response structure
 *
 * @param {Object} response - Axios response object
 * @param {string} operation - Operation name for error messages
 * @returns {Object} Validated response data
 * @throws {Error} If response is invalid
 *
 * Expected V2 response format:
 * {
 *   status: 'ok',
 *   data: { ... },
 *   meta: {
 *     version: 'v2',
 *     standardized: true,
 *     timestamp: '2025-10-29T...'
 *   }
 * }
 */
function validateAPIResponse(response, operation) {
  if (!response || !response.data) {
    throw new Error(`${operation}: Prázdná odpověď z API`);
  }

  const result = response.data;

  // V2 API očekává meta strukturu
  if (result.meta && result.meta.version === 'v2') {
  } else {
  }

  if (result.status === 'error') {
    const errorMsg = result.message || 'Neznámá chyba';
    const errors = result.errors || [];

    // 🔥 CRITICAL: Log which fields caused validation errors
    if (errors.length > 0) {
      errors.forEach((err, idx) => {
      });
    }

    throw new Error(`${operation}: ${errorMsg}${errors.length ? '\n' + errors.join('\n') : ''}`);
  }

  if (result.status !== 'ok') {
    throw new Error(`${operation}: Neočekávaný status: ${result.status}`);
  }

  return result;
}

// ========================================
// 📋 API FUNCTIONS
// ========================================

/**
 * GET Order by ID with ENRICHED data (user info, items, invoices)
 *
 * @param {number} orderId - ID objednávky
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {boolean} enriched - Load enriched data (default: true)
 * @returns {Promise<Object>} Order data + lock info + enriched data
 *
 * @example
 * const order = await getOrderV2(11201, token, username);
 * console.log(order.strediska_kod); // ["KLADNO", "PRAHA"]
 * console.log(order.max_cena_s_dph); // "25000.00"
 * console.log(order._enriched.objednatel); // User data
 */
export async function getOrderV2(orderId, token, username, enriched = true) {
  try {
    // Use /enriched endpoint for user data, items, invoices
    const endpoint = enriched
      ? `/order-v2/${orderId}/enriched`
      : `/order-v2/${orderId}`;

    // 🔍 DEBUG: Celý URL endpoint
    // const fullUrl = `${process.env.REACT_APP_API2_BASE_URL}${endpoint}`;

    const response = await apiOrderV2.post(endpoint, {
      token,
      username,
      archivovano: 0
    });

    // 🔍🔍🔍 DEBUG: RAW RESPONSE Z BACKENDU - KOMPLETNÍ DATA 🔍🔍🔍

    const result = validateAPIResponse(response, 'getOrderV2');

    // Validace dat
    if (!result.data) {
      throw new Error('API nevrátilo data objednávky');
    }
    
    // 🔍 DEBUG: Validated result.data

    // Transformace: Backend vraci dodavatel_zpusob_potvrzeni jako JSON string z DB
    // Format: '{"potvrzeni":"ANO","zpusoby":["email","telefon"],"platba":"faktura","potvrzeno":true}'
    if (result.data && result.data.dodavatel_zpusob_potvrzeni !== undefined) {
      const order = result.data;
      
      if (typeof order.dodavatel_zpusob_potvrzeni === 'string' && order.dodavatel_zpusob_potvrzeni.trim() !== '') {
        try {
          const parsed = JSON.parse(order.dodavatel_zpusob_potvrzeni);
          order.dodavatel_zpusob_potvrzeni = {
            potvrzeni: parsed.potvrzeni || (parsed.potvrzeno ? 'ANO' : 'NE'),
            zpusoby: parsed.zpusoby || parsed.zpusob || [],
            platba: 'faktura', // vzdy faktura (pevne nastaveno)
            potvrzeno: parsed.potvrzeno !== undefined ? parsed.potvrzeno : (parsed.potvrzeni === 'ANO')
          };
        } catch (e) {
          order.dodavatel_zpusob_potvrzeni = {
            potvrzeni: 'NE',
            zpusoby: [],
            platba: 'faktura' // vzdy faktura (pevne nastaveno)
          };
        }
      } else if (order.dodavatel_zpusob_potvrzeni === '' || order.dodavatel_zpusob_potvrzeni === null) {
        order.dodavatel_zpusob_potvrzeni = {
          potvrzeni: 'NE',
          zpusoby: [],
          platba: 'faktura' // vzdy faktura (pevne nastaveno)
        };
      }
    }

    // Validace dat (bez výpisu - není třeba spamovat konzoli)
    // const validationErrors = validateOrderV2Data(result.data);

    return result.data;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * CREATE new Order
 *
 * @param {Object} orderData - Order data
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Created order with new ID
 *
 * @example
 * const newOrder = await createOrderV2({
 *   predmet: "Test objednávka",
 *   strediska_kod: ["KLADNO"],
 *   max_cena_s_dph: "10000.00",
 *   financovani: {
 *     typ: "ROZPOCET",
 *     nazev: "Rozpočet"
 *   }
 * }, token, username);
 */
export async function createOrderV2(orderData, token, username) {
  let prepared; // Definovat mimo try/catch pro přístup v catch bloku

  try {


    // Prepare data
    // ⚠️ prepareDataForAPI() zobrazí vlastní detailní logy transformace
    prepared = prepareDataForAPI(orderData);

    // Validate
    const validationErrors = validateOrderV2Data(prepared);
    if (validationErrors.length > 0) {
      throw new Error(`Data validation failed: ${validationErrors.join(', ')}`);
    }

    const requestPayload = {
      token,
      username,
      ...prepared
    };

    const response = await apiOrderV2.post('/order-v2/create', requestPayload);

    const result = validateAPIResponse(response, 'createOrderV2');

    // Vrátit data objednávky (result.data obsahuje kompletní záznam)
    if (!result.data) {
      throw new Error('Backend nevrátil data objednávky');
    }

    return result.data;

  } catch (error) {

    // Backend vrací detailní error strukturu
    const errorData = error.response?.data;

    if (errorData) {

      // VALIDATION_ERROR
      if (errorData.error_code === 'VALIDATION_ERROR') {

        // Sestavit čitelnou chybovou zprávu
        const validationMsg = errorData.validation_errors?.join('\n• ') || 'Neznámá validační chyba';
        throw new Error(`Validační chyba:\n• ${validationMsg}`);
      }

      // DATABASE_INSERT_ERROR
      if (errorData.error_code === 'DATABASE_INSERT_ERROR') {

        throw new Error(`Chyba databáze: ${errorData.sql_error || 'Neznámá SQL chyba'}`);
      }

      // Jiný error

      throw new Error(errorData.message || errorData.error || normalizeError(error));
    }

    // Fallback - žádná response data
    throw new Error(normalizeError(error));
  }
}

/**
 * UPDATE existing Order
 *
 * @param {number} orderId - ID objednávky
 * @param {Object} orderData - Updated order data (partial OK)
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Updated order
 *
 * @example
 * const updated = await updateOrderV2(11201, {
 *   strediska_kod: ["PRAHA", "MOST"],
 *   max_cena_s_dph: "50000.00"
 * }, token, username);
 */
export async function updateOrderV2(orderId, orderData, token, username) {
  try {


    // Prepare data - 🔥 isUpdate=true removes undefined/null values
    // ⚠️ prepareDataForAPI() zobrazí vlastní detailní logy transformace
    const prepared = prepareDataForAPI(orderData, true);

    // Validate
    const validationErrors = validateOrderV2Data(prepared);
    if (validationErrors.length > 0) {
    } else {
    }


    const requestPayload = {
      token,
      username,
      ...prepared
    };

    const response = await apiOrderV2.post(`/order-v2/${orderId}/update`, requestPayload);


    // 🔍 SPECIÁLNÍ LOG pro dodavatel_zpusob_potvrzeni
    if (response.data && response.data.dodavatel_zpusob_potvrzeni !== undefined) {
      if (typeof response.data.dodavatel_zpusob_potvrzeni === 'object') {
      }
    }

    const result = validateAPIResponse(response, 'updateOrderV2');


    return result.data;

  } catch (error) {

    // Backend vrací detailní error strukturu
    const errorData = error.response?.data;

    if (errorData) {

      // ORDER_NOT_FOUND
      if (errorData.error_code === 'ORDER_NOT_FOUND') {
        throw new Error(`Objednávka #${errorData.details?.order_id} nebyla nalezena`);
      }

      // ORDER_LOCKED
      if (errorData.error_code === 'ORDER_LOCKED') {
        const err = new Error(`Objednávka je zamčená uživatelem ${errorData.details?.locked_by_name} od ${errorData.details?.locked_at}`);
        
        // ✅ FIX: Připojit lock_info z backendu pro další zpracování ve frontendu
        if (errorData.lock_info) {
          err.lock_info = errorData.lock_info;
        } else if (errorData.details?.lock_info) {
          err.lock_info = errorData.details.lock_info;
        }
        
        throw err;
      }

      // VALIDATION_ERROR
      if (errorData.error_code === 'VALIDATION_ERROR') {

        const validationMsg = errorData.validation_errors?.join('\n• ') || 'Neznámá validační chyba';
        throw new Error(`Validační chyba:\n• ${validationMsg}`);
      }

      // TRANSFORM_ERROR
      if (errorData.error_code === 'TRANSFORM_ERROR') {
        throw new Error(`Chyba transformace dat: ${errorData.error_details}`);
      }

      // NO_DATA_TO_UPDATE
      if (errorData.error_code === 'NO_DATA_TO_UPDATE') {
        throw new Error('Žádná data k aktualizaci. ' + (errorData.details?.hint || ''));
      }

      // DATABASE_UPDATE_ERROR
      if (errorData.error_code === 'DATABASE_UPDATE_ERROR') {
        throw new Error(`Chyba databáze: ${errorData.sql_error || 'Neznámá SQL chyba'}`);
      }

      // Jiný error

      throw new Error(errorData.message || errorData.error || normalizeError(error));
    }

    // Fallback - žádná response data
    throw new Error(normalizeError(error));
  }
}

/**
 * DELETE Order (soft delete - set aktivni=0)
 *
 * @param {number} orderId - ID objednávky
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Result
 */
export async function deleteOrderV2(orderId, token, username, hardDelete = false) {
  try {

    const response = await apiOrderV2.post(`/order-v2/${orderId}/delete`, {
      token,
      username,
      hard_delete: hardDelete // Přidáno pro podporu hard delete
    });

    const result = validateAPIResponse(response, 'deleteOrderV2');

    return result;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * LIST Orders with filtering & pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {boolean} returnFullResponse - Return full response with meta
 * @param {boolean} enriched - Load enriched data (polozky, prilohy, faktury) - default: true
 * @returns {Promise<Array>} List of orders
 *
 * @example
 * const orders = await listOrdersV2({
 *   uzivatel_id: 1,
 *   limit: 50,
 *   offset: 0
 * }, token, username, false, true); // s enriched daty
 */
export async function listOrdersV2(filters = {}, token, username, returnFullResponse = false, enriched = true) {
  try {
    const endpoint = '/order-v2/list-enriched';

    const requestPayload = {
      token,
      username,
      ...filters
    };

    const response = await apiOrderV2.post(endpoint, requestPayload);

    const result = validateAPIResponse(response, 'listOrdersV2');
    
    // Ensure data is always an array
    const orders = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);

    // Return full response if requested (for debugging/testing)
    if (returnFullResponse) {
      return result;
    }

    return orders;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * 🔢 GET Next Order Number
 *
 * Generuje další dostupné evidenční číslo objednávky ve formátu O-XXXX/ICO/ROK/USEK_ZKR
 *
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response with next order number
 *
 * Response structure:
 * {
 *   last_used_number: number,           // Poslední použité pořadové číslo
 *   next_number: number,                // Další dostupné číslo
 *   formatted_last_used: string,        // "0001"
 *   formatted_next: string,             // "0002"
 *   ico: string,                        // ICO organizace uživatele
 *   usek_zkr: string,                   // Zkratka úseku uživatele
 *   current_year: string,               // Aktuální rok
 *   last_used_order_string: string,     // "O-0001/12345678/2025/IT"
 *   next_order_string: string,          // "O-0002/12345678/2025/IT"
 *   order_number_string: string,        // Alias pro next_order_string
 *   note: string                        // Vysvětlující poznámka
 * }
 *
 * @example
 * const result = await getNextOrderNumberV2(token, username);
 * console.log(result.next_order_string); // "O-0002/12345678/2025/IT"
 */
/**
 * 🆕 ŘEŠENÍ PROBLÉMU #2: Retry mechanismus s exponenciálním backoffem
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {number} retryCount - Počet pokusů (default: 3)
 * @returns {Promise<Object>} Order number data
 */
export async function getNextOrderNumberV2(token, username, retryCount = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await apiOrderV2.post('/order-v2/next-number', {
        token,
        username
      }, {
        timeout: 10000  // 10s timeout
      });

      const result = validateAPIResponse(response, 'getNextOrderNumberV2');

      if (!result.data) {
        throw new Error('API nevrátilo data pro next-number');
      }

      // ✅ Úspěch - vrat data
      return result.data;

    } catch (error) {
      lastError = error;


      // Pokud to není poslední pokus, počkej a zkus znovu
      if (attempt < retryCount) {
        const waitTime = 1000 * attempt; // Exponenciální backoff: 1s, 2s, 3s
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }

  // ❌ Všechny pokusy selhaly
  throw new Error(normalizeError(lastError));
}

/**
 * ✅ CHECK Order Number Availability
 *
 * Kontroluje dostupnost evidenčního čísla objednávky
 *
 * @param {string} orderNumber - Číslo objednávky ke kontrole
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {boolean} suggest - Navrhnout alternativu při konfliktu (default: false)
 * @returns {Promise<Object>} Check result
 *
 * Response structure:
 * {
 *   orderNumber: string,             // Kontrolované číslo
 *   exists: boolean,                 // TRUE pokud číslo existuje
 *   canUse: boolean,                 // TRUE pokud lze použít (= !exists)
 *   existing_order?: {               // Pouze pokud exists = true
 *     id: number,                    // ID existující objednávky
 *     objednatel_id: number          // ID objednatele
 *   },
 *   suggestion?: string              // Pouze pokud suggest = true a canUse = false
 * }
 *
 * @example
 * const result = await checkOrderNumberV2('O-0001/12345678/2025/IT', token, username, true);
 * if (!result.canUse) {
 *   console.log('Číslo obsazené, návrh:', result.suggestion);
 * }
 */
export async function checkOrderNumberV2(orderNumber, token, username, suggest = false) {
  try {

    const response = await apiOrderV2.post('/order-v2/check-number', {
      token,
      username,
      orderNumber,
      suggest
    });

    const result = validateAPIResponse(response, 'checkOrderNumberV2');

    if (!result.data) {
      throw new Error('API nevrátilo data pro check-number');
    }


    return result.data;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

// ========================================
// � ATTACHMENT MANAGEMENT
// ========================================

/**
 * 📎 Nahrání přílohy k objednávce
 *
 * @param {number|string} orderId - ID objednávky nebo draft ID
 * @param {File} fileData - File objekt z input[type="file"]
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {string} type - Typ přílohy: 'obj' (default) nebo 'fa'
 * @returns {Promise<Object>} Response s informacemi o nahrané příloze
 *
 * @example
 * const file = document.querySelector('input[type="file"]').files[0];
 * const result = await uploadAttachmentV2(11248, file, token, username, 'obj');
 */
export async function uploadAttachmentV2(orderId, fileData, token, username, type = 'obj') {
  if (!orderId || !fileData) {
    throw new Error('Order ID and file are required');
  }

  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }


  try {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('username', username);
    formData.append('file', fileData);
    formData.append('nazev_souboru', fileData.name);
    formData.append('typ_prilohy', type); // 'obj' = objekt (default), 'fa' = faktura

    const response = await apiOrderV2.post(`/order-v2/${orderId}/attachments/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    const result = validateAPIResponse(response, 'uploadAttachmentV2');


    return result.data;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * 📋 Seznam příloh objednávky
 *
 * @param {number|string|null} orderId - ID objednávky, draft ID, nebo null pro všechny
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Array>} Seznam příloh
 *
 * @example
 * const attachments = await listAttachmentsV2(11248, token, username); // konkrétní objednávka
 * const allAttachments = await listAttachmentsV2(null, token, username); // všechny přílohy
 */
export async function listAttachmentsV2(orderId, token, username) {
  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }

  // Pokud není zadané orderId, použijeme endpoint pro všechny přílohy
  const endpoint = orderId
    ? `/order-v2/${orderId}/attachments`
    : '/order-v2/attachments/list';


  try {
    const response = await apiOrderV2.post(endpoint, {
      token,
      username
    });

    const result = validateAPIResponse(response, 'listAttachmentsV2');

    const attachments = result.data || [];

    return attachments;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * 💾 Stažení přílohy
 *
 * @param {number|string} orderId - ID objednávky
 * @param {number} attachmentId - ID přílohy
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Blob>} Soubor jako blob
 *
 * @example
 * const blob = await downloadAttachmentV2(11248, 456, token, username);
 * const url = URL.createObjectURL(blob);
 * window.open(url);
 */
export async function downloadAttachmentV2(orderId, attachmentId, token, username) {
  if (!orderId || !attachmentId) {
    throw new Error('Order ID and attachment ID are required');
  }

  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }


  try {
    const response = await apiOrderV2.get(`/order-v2/${orderId}/attachments/${attachmentId}`, {
      params: { token, username },
      responseType: 'blob'
    });


    return response.data;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * 🗑️ Smazání přílohy
 *
 * @param {number|string} orderId - ID objednávky
 * @param {number} attachmentId - ID přílohy
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response
 *
 * @example
 * await deleteAttachmentV2(11248, 456, token, username);
 */
export async function deleteAttachmentV2(orderId, attachmentId, token, username) {
  if (!orderId || !attachmentId) {
    throw new Error('Order ID and attachment ID are required');
  }

  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }


  try {
    const response = await apiOrderV2.delete(`/order-v2/${orderId}/attachments/${attachmentId}`, {
      data: { token, username }
    });

    const result = validateAPIResponse(response, 'deleteAttachmentV2');


    return result.data;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * ✏️ Update metadat přílohy objednávky
 *
 * @param {number|string} orderId - ID objednávky
 * @param {number} attachmentId - ID přílohy
 * @param {Object} updates - Aktualizovaná metadata
 * @param {string} updates.original_name - Nový název souboru (optional)
 * @param {string} updates.type - Nový typ přílohy: 'obj' nebo 'fa' (optional)
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response s aktualizovanými daty
 *
 * @example
 * const result = await updateAttachmentV2(11248, 456, {
 *   original_name: 'upravena_smlouva.pdf',
 *   type: 'obj'
 * }, token, username);
 */
export async function updateAttachmentV2(orderId, attachmentId, updates, token, username) {
  if (!orderId || !attachmentId) {
    throw new Error('Order ID and attachment ID are required');
  }

  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }


  try {
    const response = await apiOrderV2.put(`/order-v2/${orderId}/attachments/${attachmentId}`, {
      token,
      username,
      ...updates
    });

    const result = validateAPIResponse(response, 'updateAttachmentV2');


    return result.data;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * ✔️ Ověření integrity příloh objednávky
 *
 * Zkontroluje, zda všechny přílohy existují na disku a odpovídají metadata v databázi
 *
 * @param {number|string} orderId - ID objednávky
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response s výsledky verifikace
 *
 * @example
 * const result = await verifyAttachmentsV2(11248, token, username);
 * console.log(`Valid: ${result.summary.valid_attachments}/${result.summary.total_attachments}`);
 */
export async function verifyAttachmentsV2(orderId, token, username) {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }


  try {
    const response = await apiOrderV2.post(`/order-v2/${orderId}/attachments/verify`, {
      token,
      username
    });

    const result = validateAPIResponse(response, 'verifyAttachmentsV2');

    const summary = result.data?.summary || {};

    return result.data;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

// ========================================
// 📄 INVOICE ATTACHMENT MANAGEMENT
// ========================================

/**
 * 📎 Nahrání přílohy k faktuře
 *
 * @param {number} invoiceId - ID faktury
 * @param {number} orderId - ID objednávky (pro kontrolu přístupu)
 * @param {File} fileData - File objekt
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {string} type - Typ přílohy: 'fa' (default)
 * @returns {Promise<Object>} Response
 *
 * @example
 * const file = document.querySelector('input[type="file"]').files[0];
 * const result = await uploadInvoiceAttachmentV2(789, 456, file, token, username);
 */
export async function uploadInvoiceAttachmentV2(invoiceId, orderId, fileData, token, username, type = 'fa') {
  if (!invoiceId || !orderId || !fileData) {
    throw new Error('Invoice ID, Order ID and file are required');
  }

  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }


  try {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('username', username);
    formData.append('file', fileData);
    formData.append('nazev_souboru', fileData.name);
    formData.append('order_id', orderId); // Pro kontrolu přístupu
    formData.append('typ_prilohy', type); // 'fa' = faktura (default)

    const response = await apiOrderV2.post(`/order-v2/invoices/${invoiceId}/attachments/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    const result = validateAPIResponse(response, 'uploadInvoiceAttachmentV2');


    return result.data;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * 📋 Seznam příloh faktury
 *
 * @param {number|null} invoiceId - ID faktury nebo null pro všechny
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Array>} Seznam příloh
 *
 * @example
 * const attachments = await listInvoiceAttachmentsV2(789, token, username); // konkrétní faktura
 * const allAttachments = await listInvoiceAttachmentsV2(null, token, username); // všechny přílohy faktur
 */
export async function listInvoiceAttachmentsV2(invoiceId, token, username) {
  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }

  // Pokud není zadané invoiceId, použijeme endpoint pro všechny přílohy faktur
  const endpoint = invoiceId
    ? `/order-v2/invoices/${invoiceId}/attachments`
    : '/order-v2/invoices/attachments/list';


  try {
    const response = await apiOrderV2.post(endpoint, {
      token,
      username
    });

    const result = validateAPIResponse(response, 'listInvoiceAttachmentsV2');

    const attachments = result.data || [];

    return attachments;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * 💾 Stažení přílohy faktury
 *
 * ⚠️ DŮLEŽITÉ: Invoice download je POST-only z bezpečnostních důvodů!
 *
 * @param {number} invoiceId - ID faktury
 * @param {number} attachmentId - ID přílohy
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Blob>} Soubor jako blob
 *
 * @example
 * const blob = await downloadInvoiceAttachmentV2(789, 123, token, username);
 * const url = URL.createObjectURL(blob);
 * window.open(url);
 */
export async function downloadInvoiceAttachmentV2(invoiceId, attachmentId, token, username) {
  if (!invoiceId || !attachmentId) {
    throw new Error('Invoice ID and attachment ID are required');
  }

  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }


  try {
    const response = await apiOrderV2.post(
      `/order-v2/invoices/${invoiceId}/attachments/${attachmentId}/download`,
      {
        token,
        username
      },
      {
        responseType: 'blob'
      }
    );


    return response.data;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

/**
 * 🗑️ Smazání přílohy faktury
 *
 * @param {number} invoiceId - ID faktury
 * @param {number} attachmentId - ID přílohy
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response
 */
export async function deleteInvoiceAttachmentV2(invoiceId, attachmentId, token, username) {
  if (!invoiceId || !attachmentId) {
    throw new Error('Invoice ID and attachment ID are required');
  }

  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }


  try {
    const response = await apiOrderV2.delete(`/order-v2/invoices/${invoiceId}/attachments/${attachmentId}`, {
      data: { token, username }
    });

    const result = validateAPIResponse(response, 'deleteInvoiceAttachmentV2');


    return result.data;

  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

// ========================================
// �📤 EXPORTS
// ========================================

// Named exports are already done inline with "export async function..." above
// Just export the default object for convenience

export default {
  getOrderV2,
  createOrderV2,
  updateOrderV2,
  deleteOrderV2,
  listOrdersV2,
  getNextOrderNumberV2,
  checkOrderNumberV2,
  getOrderTimestampV2,
  // Attachment management
  uploadAttachmentV2,
  listAttachmentsV2,
  downloadAttachmentV2,
  deleteAttachmentV2,
  // Invoice attachment management
  uploadInvoiceAttachmentV2,
  listInvoiceAttachmentsV2,
  downloadInvoiceAttachmentV2,
  deleteInvoiceAttachmentV2,
  // Utilities
  prepareDataForAPI,
  validateOrderV2Data,
  normalizeError
};

/**
 * � Získá pouze timestamp dt_aktualizace pro objednávku (lightweight endpoint)
 *
 * @param {number} orderId - ID objednávky
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<{id: number, dt_aktualizace: string}>}
 *
 * @example
 * const timestamp = await getOrderTimestampV2(123, token, username);
 * // { id: 123, dt_aktualizace: "2025-10-30 14:30:25" }
 */
export async function getOrderTimestampV2(orderId, token, username) {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  if (!token || !username) {
    throw new Error('Authentication required (token and username)');
  }


  try {
    const response = await apiOrderV2.post(`/order-v2/${orderId}/dt-aktualizace`, {
      token,
      username
    });


    if (response.data.status === 'ok' && response.data.data) {
      return response.data.data; // { id, dt_aktualizace }
    }

    throw new Error(response.data.message || 'Failed to get timestamp');

  } catch (err) {

    // Rozpoznat auth error
    if (err.response?.status === 401 || err.response?.status === 403) {
      throw new Error('Unauthorized - please login again');
    }

    throw new Error(normalizeError(err));
  }
}

/**
 * �📝 USAGE EXAMPLES
 *
 * // Get order
 * const order = await getOrderV2(11201, token, username);
 *
 * // Get only timestamp (lightweight)
 * const timestamp = await getOrderTimestampV2(11201, token, username);
 * // { id: 11201, dt_aktualizace: "2025-10-30 14:30:25" }
 *
 * // Create order
 * const newOrder = await createOrderV2({
 *   predmet: "Nová objednávka",
 *   strediska_kod: ["KLADNO"],
 *   max_cena_s_dph: "10000.00",
 *   uzivatel_id: 1,
 *   objednatel_id: 1,
 *   druh_objednavky_kod: "AUTA",
 *   financovani: {
 *     typ: "ROZPOCET",
 *     nazev: "Rozpočet"
 *   }
 * }, token, username);
 *
 * // Update order
 * const updated = await updateOrderV2(11201, {
 *   max_cena_s_dph: "25000.00",
 *   strediska_kod: ["PRAHA", "MOST"]
 * }, token, username);
 *
 * // List orders
 * const orders = await listOrdersV2({
 *   uzivatel_id: 1,
 *   limit: 50
 * }, token, username);
 */

// ========================================
// 📎 NEW ORDER ATTACHMENTS API (V2 - Updated 31.10.2025)
// ========================================

/**
 * Upload přílohy k objednávce
 * POST /order-v2/{order_id}/attachments/upload
 */
export async function uploadOrderAttachment(orderId, file, username, token, type = 'obj', filePrefix = 'obj-') {
  if (!orderId || !file || !username || !token) {
    throw new Error('Missing required parameters');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('username', username);
  formData.append('token', token);
  formData.append('typ_prilohy', type);
  formData.append('file_prefix', filePrefix);

  try {
    const response = await apiOrderV2.post(
      `/order-v2/${orderId}/attachments/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * Seznam příloh objednávky
 * POST /order-v2/{order_id}/attachments (změněno z GET na POST)
 */
export async function listOrderAttachments(orderId, username, token) {
  if (!orderId || !username || !token) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await apiOrderV2.post(
      `/order-v2/${orderId}/attachments`,
      { username, token }
    );
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * Download přílohy objednávky
 * POST /order-v2/{order_id}/attachments/{attachment_id}/download
 *
 * ✅ OPRAVENO (1.11.2025): Změněno z GET na POST s username a token v body
 */
export async function downloadOrderAttachment(orderId, attachmentId, username, token) {
  if (!orderId || !attachmentId || !username || !token) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await apiOrderV2.post(
      `/order-v2/${orderId}/attachments/${attachmentId}/download`,
      { username, token }, // ✅ token a username v body, ne v query params
      { responseType: 'blob' }
    );

    // Return blob directly - caller handles download
    return response.data;

  } catch (err) {
    // Blob error response - parsuj JSON a extrahuj message
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const data = JSON.parse(text);
        // ✅ Extrahuj pouze message pole - JSON.parse už automaticky dekóduje Unicode
        const errorMessage = data.message || data.error || data.err || 'Nepodařilo se stáhnout přílohu';
        throw new Error(errorMessage);
      } catch (parseError) {
        // Fallback pokud selže parsing
        throw new Error('Nepodařilo se stáhnout přílohu');
      }
    }
    throw new Error(normalizeError(err));
  }
}

/**
 * Smazání přílohy objednávky
 * DELETE /order-v2/{order_id}/attachments/{attachment_id}
 */
export async function deleteOrderAttachment(orderId, attachmentId, username, token) {
  if (!orderId || !attachmentId || !username || !token) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await apiOrderV2.delete(
      `/order-v2/${orderId}/attachments/${attachmentId}`,
      { data: { username, token } }
    );
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * Aktualizace metadat přílohy objednávky
 * PUT /order-v2/{order_id}/attachments/{attachment_id}
 *
 * @param {number|string} orderId - ID objednávky (číselné nebo draft_*)
 * @param {number} attachmentId - ID přílohy objednávky
 * @param {string} username - Uživatelské jméno
 * @param {string} token - Autentizační token
 * @param {Object} updates - Objekt s aktualizacemi
 * @param {string} [updates.type] - Nový typ přílohy
 * @param {string} [updates.original_name] - Nový název souboru
 *
 * @returns {Promise<Object>} Response s aktualizovanými daty přílohy
 *
 * @example
 * // Aktualizace typu přílohy
 * const result = await updateOrderAttachment(123, 456, 'admin', token, {
 *   type: 'SMLOUVA'
 * });
 *
 * @example
 * // Aktualizace názvu souboru
 * const result = await updateOrderAttachment(123, 456, 'admin', token, {
 *   original_name: 'nova_smlouva.pdf'
 * });
 */
export async function updateOrderAttachment(orderId, attachmentId, username, token, updates = {}) {
  if (!orderId || !attachmentId || !username || !token) {
    throw new Error('Missing required parameters: orderId, attachmentId, username, token');
  }

  // Kontrola, že je zadána alespoň jedna aktualizace
  if (!updates.type && !updates.original_name) {
    throw new Error('At least one update field required: type or original_name');
  }

  const payload = {
    username,
    token
  };

  // Přidej pouze zadané hodnoty
  if (updates.type) {
    payload.type = updates.type;
  }
  if (updates.original_name) {
    payload.original_name = updates.original_name;
  }

  try {
    const response = await apiOrderV2.put(
      `/order-v2/${orderId}/attachments/${attachmentId}`,
      payload
    );
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * Ověření integrity příloh
 * POST /order-v2/{order_id}/attachments/verify
 */
export async function verifyOrderAttachments(orderId, username, token) {
  if (!orderId || !username || !token) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await apiOrderV2.post(
      `/order-v2/${orderId}/attachments/verify`,
      { username, token }
    );
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * Seznam VŠECH příloh objednávek (globální)
 * POST /order-v2/attachments/list
 *
 * ⚠️ POZOR: Backend má SQL chybu - hledá sloupec 'a.velikost_souboru' který neexistuje!
 * Chyba: SQLSTATE[42S22]: Column not found: 1054 Unknown column 'a.velikost_souboru'
 * Fix: Backend musí opravit SQL dotaz - použít správný název sloupce (file_size?)
 *
 * @see /BACKEND-ATTACHMENTS-SQL-FIX.md
 */
export async function listAllOrderAttachments(username, token, limit = 100, offset = 0) {
  if (!username || !token) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await apiOrderV2.post(
      '/order-v2/attachments/list',
      { username, token, limit, offset }
    );
    return response.data;
  } catch (err) {
    const errorMsg = normalizeError(err);
    // Přidáme user-friendly hint pro známý backend error
    if (errorMsg.includes('velikost_souboru') || errorMsg.includes('Column not found')) {
      throw new Error('Backend SQL chyba: Chybí sloupec velikost_souboru v DB. Kontaktujte backend vývojáře. (viz BACKEND-ATTACHMENTS-SQL-FIX.md)');
    }
    throw new Error(errorMsg);
  }
}

// ========================================
// 💰 NEW INVOICE ATTACHMENTS API (V2 - Updated 31.10.2025)
// ========================================

/**
 * Upload přílohy k faktuře
 * POST /order-v2/invoices/{invoice_id}/attachments/upload
 */
export async function uploadInvoiceAttachment(invoiceId, orderId, file, username, token) {
  if (!invoiceId || !orderId || !file || !username || !token) {
    throw new Error('Missing required parameters');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('username', username);
  formData.append('token', token);
  formData.append('order_id', orderId);
  formData.append('typ_prilohy', 'fa');

  try {
    const response = await apiOrderV2.post(
      `/order-v2/invoices/${invoiceId}/attachments/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * Seznam příloh faktury
 * POST /order-v2/invoices/{invoice_id}/attachments
 * ZMĚNA: Backend vyžaduje POST metodu, ne GET!
 */
export async function listInvoiceAttachments(invoiceId, username, token, orderId) {
  if (!invoiceId || !username || !token) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await apiOrderV2.post(
      `/order-v2/invoices/${invoiceId}/attachments`,
      {
        order_id: orderId,
        token,
        username
      }
    );
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * Download přílohy faktury (POST-only!)
 * POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/download
 */
export async function downloadInvoiceAttachment(invoiceId, attachmentId, username, token) {
  if (!invoiceId || !attachmentId || !username || !token) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await apiOrderV2.post(
      `/order-v2/invoices/${invoiceId}/attachments/${attachmentId}/download`,
      { username, token },
      { responseType: 'blob' }
    );

    // Return blob directly - caller handles download
    return response.data;
  } catch (err) {
    // Blob error response - parsuj JSON a extrahuj message
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      
      let errorMessage = text;
      try {
        const data = JSON.parse(text);
        errorMessage = data.message || data.err || data.error || text;
      } catch (parseError) {
        // Pokud JSON parse selže, použij raw text
      }
      
      throw new Error(errorMessage || 'Nepodařilo se stáhnout přílohu faktury');
    }
    throw new Error(normalizeError(err));
  }
}

/**
 * Smazání přílohy faktury
 * DELETE /order-v2/invoices/{invoice_id}/attachments/{attachment_id}
 */
export async function deleteInvoiceAttachment(invoiceId, attachmentId, username, token) {
  if (!invoiceId || !attachmentId || !username || !token) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await apiOrderV2.delete(
      `/order-v2/invoices/${invoiceId}/attachments/${attachmentId}`,
      { data: { username, token } }
    );
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * Aktualizace metadat přílohy faktury
 * PUT /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update
 *
 * @param {number|string} invoiceId - ID faktury (číselné nebo draft_*)
 * @param {number} attachmentId - ID přílohy faktury
 * @param {string} username - Uživatelské jméno
 * @param {string} token - Autentizační token
 * @param {Object} updates - Objekt s aktualizacemi
 * @param {string} [updates.type] - Nový typ přílohy (např. 'FAKTURA_VYUCTOVANI')
 * @param {string} [updates.original_name] - Nový název souboru
 *
 * @returns {Promise<Object>} Response s aktualizovanými daty přílohy
 *
 * @example
 * // Aktualizace typu přílohy
 * const result = await updateInvoiceAttachment(123, 456, 'admin', token, {
 *   type: 'FAKTURA_OPRAVENA'
 * });
 *
 * @example
 * // Aktualizace názvu souboru
 * const result = await updateInvoiceAttachment(123, 456, 'admin', token, {
 *   original_name: 'nova_faktura.pdf'
 * });
 *
 * @example
 * // Aktualizace obou hodnot
 * const result = await updateInvoiceAttachment(123, 456, 'admin', token, {
 *   type: 'FAKTURA_FINAL',
 *   original_name: 'faktura_final_2025.pdf'
 * });
 */
export async function updateInvoiceAttachment(invoiceId, attachmentId, username, token, updates = {}) {
  if (!invoiceId || !attachmentId || !username || !token) {
    throw new Error('Missing required parameters: invoiceId, attachmentId, username, token');
  }

  // Kontrola, že je zadána alespoň jedna aktualizace
  if (!updates.type && !updates.original_name) {
    throw new Error('At least one update field required: type or original_name');
  }

  const payload = {
    username,
    token
  };

  // Přidej pouze zadané hodnoty
  if (updates.type) {
    payload.type = updates.type;
  }
  if (updates.original_name) {
    payload.original_name = updates.original_name;
  }

  try {
    const response = await apiOrderV2.put(
      `/order-v2/invoices/${invoiceId}/attachments/${attachmentId}/update`,
      payload
    );
    return response.data;
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * Seznam VŠECH příloh faktur (globální)
 * POST /order-v2/invoices/attachments/list
 *
 * ⚠️ POZOR: Může mít stejnou SQL chybu jako listAllOrderAttachments!
 * @see /BACKEND-ATTACHMENTS-SQL-FIX.md
 */
export async function listAllInvoiceAttachments(username, token, limit = 100, offset = 0) {
  if (!username || !token) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await apiOrderV2.post(
      '/order-v2/invoices/attachments/list',
      { username, token, limit, offset }
    );
    return response.data;
  } catch (err) {
    const errorMsg = normalizeError(err);
    // Přidáme user-friendly hint pro známý backend error
    if (errorMsg.includes('velikost_souboru') || errorMsg.includes('Column not found')) {
      throw new Error('Backend SQL chyba: Chybí sloupec velikost_souboru v DB. Kontaktujte backend vývojáře. (viz BACKEND-ATTACHMENTS-SQL-FIX.md)');
    }
    throw new Error(errorMsg);
  }
}

/**
 * 🎯 Načíst seznam LP pro výběr v položkách objednávky
 * POST /order-v2/lp-options
 * 
 * @param {Array<number>} lpIds - Filtr na konkrétní LP IDs (z objednavka_data.lp_kody)
 * @param {number} rok - Rok pro filtrování LP (default: aktuální rok)
 * @param {string} username - Username
 * @param {string} token - Auth token
 * @returns {Promise<Array>} Seznam LP pro dropdown
 * 
 * Response formát:
 * {
 *   status: 'ok',
 *   data: [
 *     {
 *       id: 15,
 *       kod: "LPIT1",
 *       nazev: "IT Hardware 2025",
 *       kategorie: "IT",
 *       limit: 500000,
 *       rok: 2025,
 *       label: "LPIT1 - IT Hardware 2025" // Pro zobrazení v selectu
 *     }
 *   ],
 *   meta: { count: 2, rok: 2025, filtered: true }
 * }
 */
export async function getLPOptionsForItems(lpIds = [], rok = null, username, token) {
  if (!username || !token) {
    throw new Error('Missing required parameters: username, token');
  }

  const payload = {
    username,
    token,
    lp_ids: Array.isArray(lpIds) ? lpIds : [],
    rok: rok || new Date().getFullYear()
  };

  try {
    const response = await apiOrderV2.post('/order-v2/lp-options', payload);
    
    if (response.data?.status === 'ok' && Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    
    throw new Error('Invalid response format from LP options endpoint');
  } catch (err) {
    const errorMsg = normalizeError(err);
    throw new Error(errorMsg);
  }
}

// ============================================================================
// 📚 DICTIONARY/REFERENCE DATA
// ============================================================================

/**
 * Get attachment types (typy příloh)
 */
export async function getTypyPrilohV2({ token, username, aktivni = 1 }) {
  try {
    const response = await apiOrderV2.get('/order-v2/typy-priloh', {
      params: { 
        aktivni,
        token,
        username
      }
    });
    
    if (response.data?.status === 'ok') {
      return response.data.data || [];
    }
    throw new Error('Invalid response from typy-priloh endpoint');
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

/**
 * Get invoice types (typy faktur)
 */
export async function getTypyFakturV2({ token, username, aktivni = 1 }) {
  try {
    const response = await apiOrderV2.get('/order-v2/typy-faktur', {
      params: { 
        aktivni,
        token,
        username
      }
    });
    
    if (response.data?.status === 'ok') {
      return response.data.data || [];
    }
    throw new Error('Invalid response from typy-faktur endpoint');
  } catch (err) {
    throw new Error(normalizeError(err));
  }
}

// ============================================================================
// 🔧 UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique GUID for attachments
 */
export function generateAttachmentGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate system filename
 */
export function generateSystemFilename(guid = null) {
  const timestamp = Date.now();
  const useGuid = guid || generateAttachmentGUID();
  return `${timestamp}_${useGuid}`;
}

/**
 * Create attachment metadata from file
 */
export function createAttachmentMetadata(file) {
  const guid = generateAttachmentGUID();
  const systemFilename = generateSystemFilename(guid);
  
  return {
    guid,
    name: file.name,
    original_filename: file.name,
    systemovy_nazev: systemFilename,
    size: file.size,
    typ_prilohy: null,
    description: '',
    uploaded_at: new Date().toISOString(),
    uploaded_by: null
  };
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(filename) {
  const allowedExtensions = [
    // Dokumenty
    'pdf', 'doc', 'docx', 'rtf', 'odt',
    // Tabulky
    'xls', 'xlsx', 'ods', 'csv',
    // Prezentace
    'ppt', 'pptx', 'odp',
    // Text
    'txt', 'md',
    // Obrázky
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
    // Archivy
    'zip', 'rar', '7z', 'tar', 'gz',
    // Emailové zprávy
    'eml', 'msg',
    // Data
    'xml', 'json'
  ];
  
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension && allowedExtensions.includes(extension);
}

/**
 * Check if file size is within limit
 */
export function isAllowedFileSize(fileSize, maxSizeMB = 10) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxBytes;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 🔒 LOCK objednávky pro editaci
 * @param {Object} params - Parametry
 * @param {number} params.orderId - ID objednávky
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {boolean} params.force - Vynutit zámek (admin může odemknout a převzít)
 * @returns {Promise<Object>} Response data
 */
export async function lockOrderV2({ orderId, token, username, force = false }) {
  try {
    const response = await apiOrderV2.post(
      `/order-v2/${orderId}/lock`,
      { 
        token,
        username,
        force 
      }
    );

    return response.data;
  } catch (err) {
    console.error('❌ Chyba při zamykání objednávky:', err);
    
    // Při 423 (Locked) zachovat lock_info v error objektu
    if (err.response && err.response.status === 423 && err.response.data) {
      const error = new Error(err.response.data.message || 'Objednávka je zamčená');
      error.response = err.response; // Zachovat celou response pro přístup k lock_info
      throw error;
    }
    
    throw new Error(normalizeError(err));
  }
}

/**
 * 🔓 UNLOCK objednávky
 * @param {Object} params - Parametry
 * @param {number} params.orderId - ID objednávky
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @returns {Promise<Object>} Response data
 */
export async function unlockOrderV2({ orderId, token, username }) {
  try {
    const response = await apiOrderV2.post(
      `/order-v2/${orderId}/unlock`,
      { 
        token,
        username 
      }
    );

    return response.data;
  } catch (err) {
    console.error('❌ Chyba při odemykání objednávky:', err);
    throw new Error(normalizeError(err));
  }
}

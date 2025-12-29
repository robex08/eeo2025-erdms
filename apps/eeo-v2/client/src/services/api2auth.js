/* eslint-disable no-unused-vars, no-unreachable */
import axios from 'axios';
import MD5 from 'crypto-js/md5';

// Axios instance for API2
const api2 = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo/',
  headers: { 'Content-Type': 'application/json' }
});

// Response interceptor to handle token expiration
api2.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Don't show auth error toast for login endpoint - let the login form handle it
      const isLoginRequest = error.config?.url?.includes('user/login');

      if (!isLoginRequest && typeof window !== 'undefined') {
        const event = new CustomEvent('authError', {
          detail: { message: 'Vaše přihlášení vypršelo. Přihlaste se prosím znovu.' }
        });
        window.dispatchEvent(event);
      }
    }

    // Check for HTML response (login page instead of JSON)
    const responseText = error.response?.data || '';
    if (typeof responseText === 'string' && responseText.includes('<!doctype')) {
      // Don't show auth error toast for login endpoint - let the login form handle it
      const isLoginRequest = error.config?.url?.includes('user/login');

      if (!isLoginRequest && typeof window !== 'undefined') {
        const event = new CustomEvent('authError', {
          detail: { message: 'Vaše přihlášení vypršelo. Obnovte stránku a přihlaste se znovu.' }
        });
        window.dispatchEvent(event);
      }
    }

    return Promise.reject(error);
  }
);

// Simple in-memory cache for orders list (per username+params)
// Each entry: { ts: <Date.now()>, data: [...] }
const _ordersMemoryCache = {};
// TTL in milliseconds (30 minutes)
const ORDERS_CACHE_TTL_MS = 30 * 60 * 1000;

// Persistence settings
const ORDERS_CACHE_PREFIX = 'ordersCache::v1::';
const ORDERS_CACHE_MAX_CHARS = 200 * 1024; // 200KB rough guard to avoid blowing up localStorage

function _persistKey(cacheKey) {
  return ORDERS_CACHE_PREFIX + cacheKey;
}

function tryPersistEntry(cacheKey, entry) {
  try {
    const key = _persistKey(cacheKey);
    const payload = JSON.stringify(entry);
    if (payload.length > ORDERS_CACHE_MAX_CHARS) {
      // Don't persist very large payloads
      try { localStorage.removeItem(key); } catch (e) {}
      return false;
    }
    localStorage.setItem(key, payload);
    return true;
  } catch (e) {
    // Quota or serialization error — ignore and keep in memory
    return false;
  }
}

// Development helper: expose a global function to trigger templates fetch with meta/debug from the browser console.
// Usage (in browser console): window.__debug_fetchTemplatesListWithMeta({ token: '...', username: '...', user_id: 123, kategorie: 'OBJEDNAVKA', debug: true })
try {
  if (typeof window !== 'undefined') {
    // attach a stable helper that forwards to fetchTemplatesListWithMeta
    window.__debug_fetchTemplatesListWithMeta = async function(opts) {
      const res = await fetchTemplatesListWithMeta(opts || {});
      return res;
    };
  }
} catch (e) {}

function tryLoadPersistedEntry(cacheKey) {
  try {
    const key = _persistKey(cacheKey);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.ts) return null;
    // Let TTL check be handled by caller
    return obj;
  } catch (e) {
    return null;
  }
}

function _broadcastCacheClear() {
  try {
    // write a quick marker so other tabs can react
    localStorage.setItem(ORDERS_CACHE_PREFIX + 'invalidate', String(Date.now()));
  } catch (e) {}
}

export function clearOrdersListCache() {
  try {
    Object.keys(_ordersMemoryCache).forEach(k => delete _ordersMemoryCache[k]);
    // remove persisted entries with our prefix
    try {
      const keys = Object.keys(localStorage || {}).filter(k => String(k || '').startsWith(ORDERS_CACHE_PREFIX));
      keys.forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
    } catch (e) {}
    _broadcastCacheClear();
  } catch (e) {}
}

/**
 * Normalize errors from Axios / network / server into a simple Czech message for users.
 * Returns an object { userMessage, code } where code is a short token for programmatic checks.
 */
export function normalizeApiError(err) {
  try {
    if (!err) return { userMessage: 'Došlo k chybě', code: 'unknown' };
    // Axios network error (no response)
    if (err.isAxiosError && !err.response) {
      return { userMessage: 'Problém s připojením. Zkontrolujte internetové připojení a zkuste to znovu.', code: 'network' };
    }
    const status = err.response?.status || err.statusCode || null;
    const serverMsg = err.response?.data?.message || err.message || (err.response && JSON.stringify(err.response.data)) || null;
    if (status === 401 || /unauthor/i.test(String(serverMsg || ''))) {
      return { userMessage: 'Nepodařilo se přihlásit – špatné uživatelské jméno nebo heslo.', code: 'unauthorized', code_cz: 'neautorizovano' };
    }
    if (status === 403) return { userMessage: 'Nemáte oprávnění provést tuto akci.', code: 'forbidden', code_cz: 'zakazano' };
    if (status === 404) return { userMessage: 'Požadovaná služba nebyla nalezena.', code: 'not_found', code_cz: 'nenalezeno' };
    if (status >= 500) return { userMessage: 'Chyba na serveru. Zkuste to prosím později.', code: 'server_error', code_cz: 'chyba_serveru' };
    // If server sent a clear message, try to map common english phrases to Czech short messages
    if (serverMsg) {
      const lower = String(serverMsg).toLowerCase();
      if (lower.includes('invalid credentials') || lower.includes('invalid username') || lower.includes('invalid password')) {
        return { userMessage: 'Nepodařilo se přihlásit – špatné uživatelské jméno nebo heslo.', code: 'unauthorized', code_cz: 'neautorizovano' };
      }
      if (lower.includes('token') && (lower.includes('expired') || lower.includes('invalid'))) {
        return { userMessage: 'Platnost přihlášení vypršela. Přihlaste se znovu.', code: 'token', code_cz: 'token_neplatny' };
      }
    }
    // Fallback: return a shortened server message if available, otherwise generic
    if (serverMsg && typeof serverMsg === 'string' && serverMsg.length < 200) {
      return { userMessage: String(serverMsg), code: 'server', code_cz: 'server' };
    }
    return { userMessage: 'Operace se nezdařila. Zkuste to prosím znovu.', code: 'failed', code_cz: 'selhalo' };
  } catch (e) {
    return { userMessage: 'Došlo k neočekávané chybě.', code: 'unknown', code_cz: 'nezname' };
  }
}

/** Convenience: return only the user-facing Czech message string for UI display */
export function getUserErrorMessage(err) {
  try { return normalizeApiError(err).userMessage; } catch (e) { return 'Operace se nezdařila.'; }
}

/** Convenience: return the Czech short token (code_cz) for programmatic checks/analytics */
export function getErrorCodeCZ(err) {
  try { return normalizeApiError(err).code_cz || normalizeApiError(err).code || 'nezname'; } catch (e) { return 'nezname'; }
}

/**
 * Login user via new API2.
 * Tries plain password, optionally falls back to MD5 if enabled by env flag.
 */
export async function loginApi2(username, password) {
  const payload = { username, password };
  try {
    const response = await api2.post('user/login', payload, { timeout: 10000 });
    return response.data;
  } catch (err) {
    // Kontrola na vynucenou změnu hesla
    if (err.response && err.response.status === 403 && err.response.data?.force_password_change) {
      // Přehoď error objekt, aby obsahoval potřebné informace pro frontend
      const forceChangeError = new Error('FORCE_PASSWORD_CHANGE');
      forceChangeError.forcePasswordChange = true;
      forceChangeError.userId = err.response.data.userId;
      forceChangeError.username = err.response.data.username;
      forceChangeError.tempToken = err.response.data.token; // Dočasný token pro změnu hesla
      forceChangeError.message = err.response.data.err || 'Musíte si změnit heslo';
      throw forceChangeError;
    }
    
    const allowMd5 = String(process.env.REACT_APP_ALLOW_MD5_FALLBACK).toLowerCase() === 'true';
    if (allowMd5) {
      try {
        const md5Password = MD5(password).toString();
        const md5Payload = { username, password: md5Password };
        const response = await api2.post('user/login', md5Payload, { timeout: 10000 });
        return response.data;
      } catch (err2) {
        // Kontrola na vynucenou změnu hesla i pro MD5 fallback
        if (err2.response && err2.response.status === 403 && err2.response.data?.force_password_change) {
          const forceChangeError = new Error('FORCE_PASSWORD_CHANGE');
          forceChangeError.forcePasswordChange = true;
          forceChangeError.userId = err2.response.data.userId;
          forceChangeError.username = err2.response.data.username;
          forceChangeError.tempToken = err2.response.data.token;
          forceChangeError.message = err2.response.data.err || 'Musíte si změnit heslo';
          throw forceChangeError;
        }
        throw err2;
      }
    }
    throw err;
  }
}

/** Get user detail via API2 */
export async function getUserDetailApi2(username, token, user_id) {
  const payload = { username, token, user_id };
  const response = await api2.post('user/detail', payload, { timeout: 10000 });
  const raw = response.data || {};

  const first = (...keys) => {
    for (const k of keys) {
      if (k in raw && raw[k] !== undefined) return raw[k];
    }
    return undefined;
  };

  const mapRoles = (r) => {
    if (!r) return [];
    if (!Array.isArray(r)) return [];
    return r.map(role => {
      const rights = [];
      const rawRights = role.rights || role.right || role.prava || role.rights_list || role.rights || [];
      if (Array.isArray(rawRights)) {
        rawRights.forEach(rr => {
          if (!rr) return;
          if (typeof rr === 'string') rights.push({ kod_prava: rr, popis: '' });
          else rights.push({ kod_prava: rr.kod_prava || rr.code || rr.code_right || rr.kod || '', popis: rr.popis || rr.description || rr.popis_prava || '' });
        });
      }
      return {
        id: role.id || null,
        kod_role: role.kod_role || role.code || role.role_code || '',
        nazev_role: role.nazev_role || role.name || role.role_name || role.nazev || '',
        popis: role.popis || role.description || role.desc || '',
        rights
      };
    });
  };

  const mapDirectRights = (d) => {
    if (!d) return [];
    if (!Array.isArray(d)) return [];
    return d.map(item => {
      if (!item) return null;
      if (typeof item === 'string') return { id: null, kod_prava: item, popis: '' };
      return { id: item.id ?? item.right_id ?? null, kod_prava: item.kod_prava || item.code || item.kod || item.right || '', popis: item.popis || item.description || '' };
    }).filter(Boolean);
  };

  // Process organizace object - BE vrací: {id, nazev, ico, dic, adresa, telefon, email, web}
  const processOrganizace = (org) => {
    if (!org || typeof org !== 'object') {
      return null;
    }

    // BE vrací "nazev" → frontend očekává "nazev_organizace"
    // BE vrací "adresa" (celá adresa) → frontend používá ulice_cislo/mesto/psc
    return {
      id: org.id ?? null,
      nazev_organizace: org.nazev || org.nazev_organizace || '',
      ico: org.ico || '',
      dic: org.dic || '',
      adresa: org.adresa || '',
      ulice_cislo: org.ulice_cislo || '',
      mesto: org.mesto || '',
      psc: org.psc || '',
      zastoupeny: org.zastoupeny || '',
      datova_schranka: org.datova_schranka || '',
      email: org.email || '',
      telefon: org.telefon || '',
      web: org.web || ''
    };
  };

  // Process usek_zkr - can be array or string
  const processUsekZkr = (usek) => {
    if (Array.isArray(usek)) return usek;
    if (typeof usek === 'string' && usek.includes(',')) {
      return usek.split(',').map(s => s.trim());
    }
    if (typeof usek === 'string' && usek) return [usek];
    return [];
  };

  // Process direct_rights - can be array or string
  const processDirectRights = (rights) => {
    if (Array.isArray(rights)) return rights;
    if (typeof rights === 'string' && rights.includes(',')) {
      return rights.split(',').map(s => s.trim());
    }
    if (typeof rights === 'string' && rights) return [rights];
    return [];
  };

  // Process statistiky_objednavek from backend
  // Process statistiky_objednavek - BE vrací lowercase klíče v stavy
  const processStatistiky = (stats) => {
    if (!stats || typeof stats !== 'object') {
      return null;
    }

    // BE vrací stavy s lowercase klíči (nova, ke_schvaleni, ...)
    return {
      celkem: parseInt(stats.celkem) || 0,
      aktivni: parseInt(stats.aktivni) || 0,
      zruseno_storno: parseInt(stats.zruseno_storno) || 0,
      stavy: stats.stavy || {}
    };
  };

  // Process usek object if it exists
  const usekObj = raw.usek || {};
  const usekNazev = usekObj.nazev || first('usek_nazev', 'usek_name') || '';
  const usekPopis = usekObj.popis || first('usek_popis', 'usekPopis', 'usek_description', 'department_description') || '';
  const usekId = usekObj.id || first('usek_id', 'usekId', 'department_id', 'dept_id') || null;

  // Process pozice object if it exists
  const poziceObj = raw.pozice || {};
  const poziceNazev = poziceObj.nazev || first('nazev_pozice', 'funkce', 'position', 'role_name') || '';
  const poziceId = poziceObj.id || first('pozice_id', 'poziceId', 'position_id') || null;

  const normalized = {
    // New structure fields
    uzivatel_id: first('uzivatel_id', 'user_id', 'id') ?? null,
    login: first('login', 'username', 'user', 'email') || '',
    jmeno: first('jmeno', 'name', 'firstName') || '',
    prijmeni: first('prijmeni', 'surname', 'lastName') || '',
    email: first('email', 'mail', 'email_address') || '',
    usek_id: usekId,
    usek_zkr: processUsekZkr(usekObj.zkratka || first('usek_zkr', 'usekZkr', 'usek_short', 'usek_code')),
    usek_nazev: usekNazev,
    usek_popis: usekPopis,
    direct_rights: processDirectRights(first('direct_rights', 'directRights', 'rights', 'prava') || raw.direct_rights || raw.directRights || raw.prava),
    organizace_id: (raw.organizace && raw.organizace.id) || first('organizace_id', 'organization_id', 'org_id') || null,
    organizace: processOrganizace(raw.organizace || first('organizace', 'organization', 'org', 'company')),

    // Legacy fields for backwards compatibility
    id: first('id', 'user_id', 'uid') ?? null,
    username: first('username', 'user', 'login') || '',
    titul_pred: first('titul_pred', 'pre_title', 'preTitle') || '',
    dt_posledni_aktivita: first('dt_posledni_aktivita', 'last_activity', 'lastActivity', 'last_seen') || '',
    titul_za: first('titul_za', 'post_title', 'postTitle') ?? null,
    telefon: first('telefon', 'phone', 'telefon_cislo') || '',
    aktivni: first('aktivni', 'active', 'is_active') ?? 1,
    vynucena_zmena_hesla: first('vynucena_zmena_hesla', 'force_password_change', 'forcePasswordChange') ?? 0,
    dt_vytvoreni: first('dt_vytvoreni', 'created_at', 'createdAt') || '',
    dt_aktualizace: first('dt_aktualizace', 'updated_at', 'updatedAt') || '',
    nazev_pozice: poziceNazev,
    pozice_id: poziceId,
    pozice_parent_id: poziceObj.parent_id || first('pozice_parent_id', 'position_parent_id', 'pozice_parent') || null,
    lokalita_nazev: first('lokalita_nazev', 'lokalita', 'location', 'lokalita_name') || '',
    lokalita_typ: first('lokalita_typ', 'location_type', 'lokalita_typ') || '',
    lokalita_parent_id: first('lokalita_parent_id', 'location_parent_id', 'lokalita_parent') ?? null,
    nadrizeny_cely_jmeno: first('nadrizeny_cely_jmeno', 'manager_full_name', 'supervisor_name') || '',
    roles: mapRoles(first('roles', 'role_list', 'roles_list', 'roles') || raw.roles),
    statistiky_objednavek: processStatistiky(raw.statistiky_objednavek || first('statistiky_objednavek', 'order_statistics', 'stats')),
    // preserve original payload for callers that still expect raw keys
    raw
  };

  return normalized;
}

/**
 * Backwards compatible wrapper expected by Profile.js after refactor.
 * Accepts a single object param (username, token, user_id) and returns fresh user detail.
 */
export async function fetchFreshUserDetail({ username, token, user_id }) {
  return getUserDetailApi2(username, token, user_id);
}

/**
 * Fetch legacy orders (old endpoints) for a period.
 * Normalizes several possible response shapes to always return an array of orders.
 */
export async function fetchOldOrders({
  yearFrom,
  yearTo,
  token,
  username,
  tabulkaObj = null,
  tabulkaOpriloh = null
}) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  const payload = {
    action: 'react-get-year-orders',
    token,
    username,
    yearFrom,
    yearTo,
    tabulka_obj: tabulkaObj || process.env.REACT_APP_DB_ORDER_KEY,
    tabulka_opriloh: tabulkaOpriloh || process.env.REACT_APP_DB_ATTACHMENT_KEY,
    tabulka_objMD: process.env.REACT_APP_DB_OBJMETADATA_KEY
  };

  try {
    const response = await api2.post('/old_endpoints.php', payload);
    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru');
    }
    const data = response.data;

    if (Array.isArray(data)) return data;

    if (data && Array.isArray(data.data)) return data.data; // { data: [...] }

    if (data && typeof data === 'object') {
      const possibleArrayKeys = ['orders', 'results', 'items'];
      for (const key of possibleArrayKeys) {
        if (Array.isArray(data[key])) return data[key];
      }
      throw new Error('Server nevrátil seznam objednávek v očekávaném formátu');
    }
    throw new Error('Neplatný formát odpovědi při načítání objednávek');
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

/** Fetch all LPS data */
export async function fetchAllLps({ token, username }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }
  const payload = { action: 'react-all-lps', token, username };
  try {
    const response = await api2.post('/old_endpoints.php', payload);
    if (response.status !== 200 || !Array.isArray(response.data)) {
      throw new Error('Neplatný formát odpovědi při načítání LPS dat');
    }
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

/**
 * Fetch attachments for an order via API2-auth old_endpoints.php
 * Required params: { token, username, id_obj }
 * Sends: { action: 'react-attachment-id', id_obj, token, username, tabulka_opriloh }
 * Returns: Array of attachments [{ soubor, popis, ... }]
 */
export async function fetchOrderAttachmentsOld({ token, username, id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }
  if (!id) {
    throw new Error('Pro načítání příloh je vyžadováno ID objednávky.');
  }
  // Exact shape required by old/react
  const payload = {
    action: 'react-attachment-id',
    id,
    token,
    username,
    // legacy DB/table reference from .env for old attachments table
    tabulka_opriloh: process.env.REACT_APP_DB_ATTACHMENT_KEY,
  };
  try {
    // New API2-auth path for legacy actions
    const response = await api2.post('old/react', payload);
    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi při načítání příloh');
    }
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    // Look for a first array anywhere in object as a fallback
    if (data && typeof data === 'object') {
      const arr = Object.values(data).find((v) => Array.isArray(v));
      if (arr) return arr;
    }
    // Nothing useful returned -> empty list
    return [];
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

/** Fetch all users from new API2 */
export async function fetchAllUsers({ token, username, _cacheBust }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }
  const payload = { token, username };

  // Add cache buster to prevent HTTP/browser caching
  if (_cacheBust) {
    payload._t = _cacheBust;
  }

  const response = await api2.post('users/list', payload);
  if (response.status !== 200) {
    throw new Error('Neočekávaný kód odpovědi při načítání seznamu uživatelů');
  }
  const data = response.data;

  // Normalize possible response shapes into an array of users
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.users)) return data.users;
  if (data && data.result && Array.isArray(data.result.users)) return data.result.users;
  const foundArr = Object.values(data || {}).find(v => Array.isArray(v));
  if (foundArr) return foundArr;
  // Fallback: wrap single object
  return [data];
}

/**
 * Fetch templates list for user (and global templates where user_id = 0) via API2 endpoint 'templates/list'
 * Expects payload: { token, username, user_id, typ, kategorie }
 * - `kategorie` is used by the server to filter templates by category (e.g. 'OBJEDNAVKA').
 * - For backwards-compatibility the function accepts `typ` and will set `kategorie` = typ when kategorie is not provided.
 * Returns: array of template objects (raw from server) or []
 */
export async function fetchTemplatesList({ token, username, user_id,  kategorie }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }
  try {
  const payload = { token, username, user_id };
  // server expects `kategorie` (category); prefer explicit kategorie, otherwise use typ
  payload.kategorie = kategorie;
  const response = await api2.post('sablony', payload, { timeout: 16000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi při načítání šablon');
    const data = response.data;
    // Expected shape: { status: 'ok', data: [ ... ] }
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.status && data.status.toLowerCase() === 'ok' && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.data)) return data.data;
    return [];
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Chyba pri nacitani sablon');
  }
}

/** Create a new template on the server (templates/create)
 * payload expects: { username, token, user_id, nazev_sablony, polozky_po, polozky_detail, typ, kategorie }
 */
export async function createTemplate({ username, token, user_id, nazev_sablony, polozky_po, polozky_detail, typ, kategorie }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  const payload = { username, token, user_id, nazev_sablony, polozky_po, polozky_detail, typ, kategorie: kategorie || 'OBJEDNAVKA' };
  try {
    const resp = await api2.post('templates/create', payload, { timeout: 16000 });
    if (resp.status !== 200) throw new Error('Neočekávaný kód odpovědi při vytváření šablony');
    return resp.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba při vytváření šablony');
  }
}

/** Update existing template on server (templates/update)
 * payload expects: { username, token, user_id, id, nazev_sablony?, polozky_po?, polozky_detail?, typ?, kategorie }
 */
export async function updateTemplate({ username, token, user_id, id, nazev_sablony, polozky_po, polozky_detail, typ, kategorie }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!id) throw new Error('ID šablony je vyžadováno pro aktualizaci.');
  const payload = { username, token, user_id, id, nazev_sablony, polozky_po, polozky_detail, typ, kategorie: kategorie || 'OBJEDNAVKA' };
  try {
    const resp = await api2.post('templates/update', payload, { timeout: 10000 });
    if (resp.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from templates/update');
    return resp.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba při aktualizaci šablony');
  }
}

/** Delete template on server (templates/delete)
 * payload expects: { username, token, user_id, id }
 */
export async function deleteTemplate({ username, token, user_id, id }) {
  // Return a structured object so callers can validate server response shape and status codes.
  if (!token || !username) {
    return { status: 401, data: { status: 'error', message: 'Chybí přístupový token nebo uživatelské jméno.', code: 'MISSING_AUTH' } };
  }
  if (!id) {
    return { status: 400, data: { status: 'error', message: 'ID šablony je vyžadováno pro smazání.', code: 'MISSING_ID' } };
  }
  const payload = { username, token, id };
  if (user_id !== undefined) payload.user_id = user_id;
  try {
    const resp = await api2.post('templates/delete', payload, { timeout: 10000 });
    // Return structured response regardless of HTTP status so caller can examine server-provided error payloads
    return { status: resp?.status || null, data: resp?.data ?? null, raw: resp?.data ?? null };
  } catch (err) {
    const status = err?.response?.status || null;
    const data = err?.response?.data || null;
    // Delete template error
    return { status, data, error: err?.message || String(err) };
  }
}

/**
 * Fetch templates list but return metadata (HTTP status and optional error) alongside items.
 * Returns: { items: Array, status: number|null, error: string|null }
 */
export async function fetchTemplatesListWithMeta({ token, username, user_id, typ, kategorie, debug }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }
  try {
  const payload = { token, username, user_id };
  if (typ) payload.typ = typ;
  payload.kategorie = kategorie || typ;
  if (debug) payload.debug = true;
  const response = await api2.post('templates/list', payload, { timeout: 10000 });
  const status = response?.status || null;
  const raw = response?.data;
    let items = [];
    if (!raw) items = [];
    else if (Array.isArray(raw)) items = raw;
    else if (raw.status && raw.status.toLowerCase() === 'ok' && Array.isArray(raw.data)) items = raw.data;
    else if (Array.isArray(raw.data)) items = raw.data;
    else items = [];
    return { items, status, error: null, raw };
  } catch (err) {
     const status = err?.response?.status || null;
     const raw = err?.response?.data || null;
     const errorMsg = err?.response?.data?.message || err.message || String(err);
     // Error occurred
     return { items: [], status, error: errorMsg, raw };
  }
}

/**
 * Fetch next order number from new API endpoint /orders/next-number
 * Expects { token, username } and returns the order_number_string value.
 */
export async function getNextOrderNumber({ token, username }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }
  try {
    const payload = { token, username };
    const response = await api2.post('orders/next-number', payload, { timeout: 16000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from next-number endpoint');
    const data = response.data;
    // Try common shapes: { order_number_string: '...' } or { data: { order_number_string: '...' } }
    if (!data) throw new Error('Empty response from next-number');
    if (typeof data === 'string') return data; // rare plain string
    if (data.order_number_string) return data.order_number_string;
    if (data.data && data.data.order_number_string) return data.data.order_number_string;
    // Sometimes API returns nested arrays/objects; try to find the key anywhere
    const findRec = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.order_number_string) return obj.order_number_string;
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (typeof v === 'string' && k.toLowerCase().includes('order') && v.includes('/')) return v;
        if (typeof v === 'object') {
          const found = findRec(v);
          if (found) return found;
        }
      }
      return null;
    };
    const found = findRec(data);
    if (found) return found;
    throw new Error('order_number_string not found in response');
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

/**
 * Fetch localities (/lokality) via api2
 * Returns array of { id, nazev, nadrizena_id }
 */
export async function getLocalities({ token, username }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  try {
    const payload = { token, username };
    const response = await api2.post('lokality', payload, { timeout: 16000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from lokality endpoint');
    const data = response.data;
    // Accept array or nested shapes
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    // try to find array inside
    const arr = Object.values(data || {}).find(v => Array.isArray(v));
    if (arr) return arr;
    throw new Error('No localities array found in response');
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

/**
 * Fetch list of approvers (PO users) from new API endpoint 'users/approvers'
 * Expects { token, username } and returns an array of user objects.
 */
/**
 * Fetch ciselniky (lookup lists) such as workflow states.
 * Expects { token, username, typ } where typ is e.g. 'OBJEDNAVKA'.
 */
export async function fetchCiselniky({ token, username, typ }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  try {
    const payload = { token, username, typ };
    const response = await api2.post('ciselniky', payload, { timeout: 16000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from ciselniky endpoint');
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    // try to find an array anywhere inside
    const arr = Object.values(data || {}).find(v => Array.isArray(v));
    if (arr) return arr;
    // If a single object returned, wrap it
    if (data && typeof data === 'object') return [data];
    throw new Error('Neplatný formát odpovědi from ciselniky');
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

export async function fetchApprovers({ token, username }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  try {
    const payload = { token, username };
    const response = await api2.post('users/approvers', payload, { timeout: 16000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from users/approvers');
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.users)) return data.users;
    const arr = Object.values(data || {}).find(v => Array.isArray(v));
    if (arr) return arr;
    if (data && typeof data === 'object') return [data];
    throw new Error('No approvers array found in response');
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba na serveru. Zkuste to prosím později.');
  }
}

/**
 * Change current user's password via API2.
 * Expects { token, username, oldPassword, newPassword } and posts to 'user/change-password'.
 * The backend field names are assumed as old_password/new_password.
 */
export async function changePasswordApi2({ token, username, oldPassword, newPassword }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!newPassword) throw new Error('Chybí nové heslo.');
  // oldPassword je volitelné - při vynucené změně není potřeba
  try {
    // API expects camelCase field names: oldPassword, newPassword
    const payload = { token, username, oldPassword: oldPassword || '', newPassword };
    const response = await api2.post('user/change-password', payload, { timeout: 10000 });
    if (response.status !== 200) throw new Error('Neočekávaný stavový kód při změně hesla');
    const data = response.data || {};
    if (data.status === 'ok' && data.data && data.data.changed === true) {
      // Vrátit i nový token, pokud ho backend poslal
      return { 
        changed: true,
        token: data.data.token || null
      };
    }
    // If server responded but not ok
    const msg = data.message || 'Změna hesla se nezdařila.';
    const e = new Error(msg);
    e.code = data.code || 'FAILED';
    throw e;
  } catch (err) {
    // Map explicit backend codes to Czech messages
    const status = err.response?.status;
    const body = err.response?.data || {};
    const code = body.code || err.code;
    let userMessage = body.message || err.message || 'Změna hesla selhala.';
    switch (code) {
      case 'UNAUTHORIZED': userMessage = 'Neplatný token'; break;
      case 'MISSING_FIELDS': userMessage = 'Chybí staré nebo nové heslo'; break;
      case 'WEAK_PASSWORD': userMessage = 'Nové heslo je příliš krátké (min. 6 znaků)'; break;
      case 'NOT_FOUND': userMessage = 'Uživatel nenalezen'; break;
      case 'OLD_PASSWORD_INVALID': userMessage = 'Původní heslo není správné'; break;
      case 'HASH_ERROR': userMessage = 'Chyba při hashování hesla'; break;
      case 'DB_ERROR': userMessage = body.message || 'Chyba databáze'; break;
      default:
        if (status === 401) userMessage = 'Neplatný token';
        else if (status === 400 && !userMessage) userMessage = 'Neplatný požadavek';
        else if (status >= 500) userMessage = 'Chyba na serveru. Zkuste to prosím později.';
    }
    const e = new Error(userMessage);
    e.code = code || 'failed';
    e.original = err;
    throw e;
  }
}

/**
 * Fetch a single order detail from NEW API2 (distinct from legacy apiv2.js).
 * Endpoint: POST order/detail
 * Accepts { token, username, orderId } (ID může být v serveru očekáváno jako orderId nebo id).
 * Vrací objekt objednávky (normalizovaný pokud možno).
 */
export async function getOrderDetailApi2({ token, username, orderId }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!orderId) throw new Error('ID objednávky je vyžadováno.');
  const variants = [
    { orderId },
    { id: orderId },
  ];
  let lastErr = null;
  for (let i = 0; i < variants.length; i++) {
    const body = { token, username, ...variants[i] };
    try {
      // API request attempt
      const resp = await api2.post('order/detail', body, { timeout: 12000 });
      if (resp.status !== 200) throw new Error('HTTP ' + resp.status);
      let data = resp.data;
      // Some APIs wrap result into data / order / result etc.
      if (data && typeof data === 'object') {
        const unwrapKeys = ['data','order','result'];
        for (const k of unwrapKeys) {
          if (data && data[k] && typeof data[k] === 'object') data = data[k];
        }
      }
      if (Array.isArray(data)) data = data[0];
      if (!data || typeof data !== 'object') throw new Error('Invalid order detail format');
      return data;
    } catch (err) {
      lastErr = err;
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('unauthor')) continue; // try next variant
      // For other errors, break fast
      continue;
    }
  }
  throw new Error(lastErr?.message || 'Chyba na serveru. Zkuste to prosím později.');
}

/**
 * Create a new order via API2 endpoint 'create-order'.
 * Accepts { token, username, payload } where payload is the prepared order metadata.
 */
export async function createOrder({ token, username, payload }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  try {
    // Server expects the prepared order metadata under a 'payload' key
    const body = { token, username, payload };
    // New endpoint: /order/create
    const response = await api2.post('order/create', body, { timeout: 15000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from create-order');
    return response.data;
  } catch (err) {
    // Attach useful debugging info to the thrown error so callers can inspect it
  const message = err.response?.data?.message || err.message || 'Chyba na serveru. Zkuste to prosím později.';
    const wrapped = new Error(message);
    wrapped.statusCode = err.response?.status || null;
    wrapped.responseBody = err.response?.data || null;
    wrapped.original = err;
    // Create order failed
    throw wrapped;
  }
}

/**
 * Update an existing order via API2 endpoint 'order/update'.
 * Accepts { token, username, payload } where payload must include the order id.
 */
export async function updateOrder({ token, username, payload }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  try {
    const body = { token, username, payload };
    const response = await api2.post('order/update', body, { timeout: 15000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from update-order');
    return response.data;
  } catch (err) {
  const message = err.response?.data?.message || err.message || 'Chyba na serveru. Zkuste to prosím později.';
    const wrapped = new Error(message);
    wrapped.statusCode = err.response?.status || null;
    wrapped.responseBody = err.response?.data || null;
    wrapped.original = err;
    throw wrapped;
  }
}

/**
 * Fetch orders list from new API2 endpoint 'orders/list-enriched'.
 * Accepts { token, username, params } and returns an array of order objects (normalized).
 */
export async function fetchOrdersList({ token, username, params = {} }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  // build a cache key ignoring forceRefresh flag
  const paramsClone = params && typeof params === 'object' ? { ...params } : {};
  const force = Boolean(paramsClone.forceRefresh || paramsClone.force || false);
  delete paramsClone.forceRefresh; delete paramsClone.force;
  let cacheKey;
  try { cacheKey = `${username}::${JSON.stringify(paramsClone)}`; } catch (e) { cacheKey = String(username); }

  if (!force && _ordersMemoryCache[cacheKey]) {
    try {
      const entry = _ordersMemoryCache[cacheKey];
      const age = Date.now() - (entry && entry.ts ? entry.ts : 0);
      if (age <= ORDERS_CACHE_TTL_MS) {
        // Return cached copy (shallow) to avoid re-fetching
        try { window.dispatchEvent(new CustomEvent('apiDebug', { detail: { phase: 'cache', method: 'MEMORY', url: 'orders/list-enriched', info: { cacheKey, ts: entry.ts, age } } })); } catch (e) {}
        return entry.data;
      }
      // expired - evict
      try { delete _ordersMemoryCache[cacheKey]; } catch (e) {}
    } catch (e) {}
  }
  // If not found in memory, check persisted localStorage cache
  if (!force && !_ordersMemoryCache[cacheKey]) {
    try {
      const persisted = tryLoadPersistedEntry(cacheKey);
      if (persisted && persisted.ts && (Date.now() - persisted.ts) <= ORDERS_CACHE_TTL_MS && Array.isArray(persisted.data)) {
        _ordersMemoryCache[cacheKey] = { ts: persisted.ts, data: persisted.data };
        try { window.dispatchEvent(new CustomEvent('apiDebug', { detail: { phase: 'cache', method: 'PERSIST', url: 'orders/list-enriched', info: { cacheKey, ts: persisted.ts } } })); } catch(e) {}
        return persisted.data;
      }
    } catch (e) {}
  }
  try {
    const body = { token, username, params };
    // Dispatch apiDebug event (request)
    try { window.dispatchEvent(new CustomEvent('apiDebug', { detail: { phase: 'request', method: 'POST', url: 'orders/list-enriched', data: body, ts: Date.now() } })); } catch (e) {}
    const start = Date.now();
    const response = await api2.post('orders/list-enriched', body, { timeout: 15000 });
    const duration = Date.now() - start;
    // Prepare small summary/sample to avoid freezing the Debug UI when payloads are large
    try {
      const respData = response.data;
      let summary = null;
      let sample = null;
      if (Array.isArray(respData)) {
        summary = { type: 'array', length: respData.length };
        sample = respData.slice(0, 3).map(item => {
          if (!item || typeof item !== 'object') return item;
          const keys = Object.keys(item).slice(0,5);
          const s = {};
          keys.forEach(k => {
            const v = item[k];
            if (v == null) s[k] = null;
            else if (typeof v === 'object') s[k] = Array.isArray(v) ? `Array(${v.length})` : 'Object';
            else if (typeof v === 'string' && v.length > 120) s[k] = v.slice(0,120) + '...';
            else s[k] = v;
          });
          return s;
        });
      } else if (respData && typeof respData === 'object') {
        summary = { type: 'object', keys: Object.keys(respData).slice(0,10) };
        // sample small subset
        sample = Object.keys(respData).slice(0,3).reduce((acc,k)=> { acc[k] = typeof respData[k] === 'object' ? (Array.isArray(respData[k]) ? `Array(${respData[k].length})` : 'Object') : (String(respData[k]).slice(0,120)); return acc; }, {});
      } else {
        summary = { type: typeof respData };
        sample = respData;
      }
      window.dispatchEvent(new CustomEvent('apiDebug', { detail: { phase: 'response', method: 'POST', url: 'orders/list-enriched', data: { summary, sample }, status: response.status, ts: Date.now(), duration } }));
    } catch (e) {}
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from orders/list-enriched');
    const data = response.data;
    // store normalized result in memory cache for subsequent fast loads
    try {
      const arr = (Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : (Object.values(data || {}).find(v=>Array.isArray(v)) || (typeof data === 'object' ? [data] : []))));
      const entry = { ts: Date.now(), data: arr };
      _ordersMemoryCache[cacheKey] = entry;
      // try to persist (best-effort)
      tryPersistEntry(cacheKey, entry);
    } catch (e) {}
    // Normalize various possible shapes into an array
  if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.orders)) return data.orders;
    if (data && data.result && Array.isArray(data.result.items)) return data.result.items;
    // Find first array property
    const arr = Object.values(data || {}).find((v) => Array.isArray(v));
    if (arr) return arr;
    // If it's a single object, wrap it
    if (typeof data === 'object') return [data];
    return [];
  } catch (err) {
  const message = err.response?.data?.message || err.message || 'Chyba na serveru. Zkuste to prosím později.';
    const wrapped = new Error(message);
    wrapped.statusCode = err.response?.status || null;
    wrapped.responseBody = err.response?.data || null;
    wrapped.original = err;
    throw wrapped;
  }
}

/**
 * Search supplier by ICO via API2 endpoint 'dodavatele/search'
 * Expects { token, username, ico } and returns supplier data if found.
 */
export async function searchSupplierByIco({ token, username, ico }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!ico) throw new Error('IČO je vyžadováno pro vyhledávání dodavatele.');
  try {
    const payload = { token, username, ico };
    const response = await api2.post('dodavatele/search', payload, { timeout: 16000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/search');
    const data = response.data;

    // Return response as-is for caller to handle
    return data;
  } catch (err) {
    // Check for authentication/token errors
    if (err.response?.status === 401 || err.response?.status === 403) {
      throw new Error('Token expired - authentication required');
    }

    // Check for HTML response (likely login page)
    const responseText = err.response?.data || err.message || '';
    if (typeof responseText === 'string' && responseText.includes('<!doctype')) {
      throw new Error('Token expired - received login page instead of data');
    }

    throw new Error(err.response?.data?.message || err.message || 'Chyba při vyhledávání dodavatele');
  }
}

/**
 * Create new supplier via API2 endpoint 'dodavatele/create'
 * Expects { token, username, ...supplierData, user_id?, usek_zkr? } and returns creation result.
 * user_id: 0 = global, specific number = user-specific
 * usek_zkr: JSON array of department codes or empty string
 */
export async function createSupplier({ token, username, nazev, adresa, ico, dic, zastoupeny, kontakt_jmeno, kontakt_email, kontakt_telefon, user_id, usek_zkr }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');

  // Kontrola povinných údajů - musí být string a ne prázdný
  const icoValue = ico?.toString().trim() || '';
  const nazevValue = nazev?.toString().trim() || '';

  if (!icoValue || !nazevValue) {
    throw new Error('IČO a název jsou povinné údaje.');
  }

  try {
    // 🔧 FIX: Backend NESMÍ dostat null v usek_zkr - musí být '' nebo '[]'
    // null || '' vrací '' ✅
    // undefined || '' vrací '' ✅
    // [] || '' vrací [] ✅
    let usekZkrValue = '';
    if (usek_zkr === null || usek_zkr === undefined) {
      usekZkrValue = '';  // Personal scope - prázdný string
    } else if (Array.isArray(usek_zkr)) {
      usekZkrValue = JSON.stringify(usek_zkr);  // Úsek scope - JSON array
    } else if (typeof usek_zkr === 'string') {
      usekZkrValue = usek_zkr;  // Už je string - ponechat
    } else {
      usekZkrValue = '';  // Fallback - prázdný string
    }

    const payload = {
      token,
      username,
      nazev: nazevValue,
      adresa: adresa || '',
      ico: icoValue,
      dic: dic || '',
      zastoupeny: zastoupeny || '',
      kontakt_jmeno: kontakt_jmeno || '',
      kontakt_email: kontakt_email || '',
      kontakt_telefon: kontakt_telefon || '',
      user_id: user_id !== undefined ? user_id : 0,
      usek_zkr: usekZkrValue  // ✅ NIKDY NULL!
    };

    const response = await api2.post('dodavatele/create', payload, { timeout: 10000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/create');
    return response.data;
  } catch (err) {
    console.error('❌ [API createSupplier] CHYBA:', err);
    console.error('📋 [API createSupplier] Error response:', err.response?.data);
    throw new Error(err.response?.data?.message || err.message || 'Chyba při vytváření dodavatele');
  }
}

/**
 * Update existing supplier via API2 endpoint 'dodavatele/update-by-ico'
 * Expects { token, username, ico, ...updateData, user_id?, usek_zkr? } and returns update result.
 * user_id: 0 = global, specific number = user-specific
 * usek_zkr: JSON array of department codes or empty string
 */
export async function updateSupplierByIco({ token, username, ico, nazev, adresa, dic, zastoupeny, kontakt_jmeno, kontakt_email, kontakt_telefon, user_id, usek_zkr }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');

  // Kontrola povinných údajů - musí být string a ne prázdný
  const icoValue = ico?.toString().trim() || '';
  const nazevValue = nazev?.toString().trim() || '';

  if (!icoValue || !nazevValue) {
    throw new Error('IČO a název jsou povinné údaje.');
  }

  try {
    const payload = { token, username, ico: icoValue, nazev: nazevValue };

    // Add optional fields only if they have values
    if (adresa) payload.adresa = adresa;
    if (dic) payload.dic = dic;
    if (zastoupeny) payload.zastoupeny = zastoupeny;
    if (kontakt_jmeno) payload.kontakt_jmeno = kontakt_jmeno;
    if (kontakt_email) payload.kontakt_email = kontakt_email;
    if (kontakt_telefon) payload.kontakt_telefon = kontakt_telefon;
    if (user_id !== undefined) payload.user_id = user_id;

    // 🔧 FIX: Backend NESMÍ dostat null v usek_zkr - musí být '' nebo '[]'
    if (usek_zkr !== undefined) {
      if (usek_zkr === null) {
        payload.usek_zkr = '';  // null → prázdný string
      } else if (Array.isArray(usek_zkr)) {
        payload.usek_zkr = JSON.stringify(usek_zkr);  // array → JSON string
      } else {
        payload.usek_zkr = usek_zkr;  // string → ponechat
      }
    }

    const response = await api2.post('dodavatele/update-by-ico', payload, { timeout: 10000 });

    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/update-by-ico');
    return response.data;
  } catch (err) {
    console.error('❌ [API updateSupplierByIco] CHYBA:', err);
    console.error('📋 [API updateSupplierByIco] Error response:', err.response?.data);
    throw new Error(err.response?.data?.message || err.message || 'Chyba při aktualizaci dodavatele');
  }
}

/**
 * Search suppliers list via API2 endpoint 'dodavatele/list'
 * Expects { token, username, search } and returns list of suppliers.
 */
export async function searchSuppliersList({ token, username, search }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  try {
    const payload = { token, username, search: search || '' };
    const response = await api2.post('dodavatele/list', payload, { timeout: 10000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/list');
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba při vyhledávání dodavatelů');
  }
}

/**
 * Search suppliers by name or ICO via API2 endpoint 'dodavatele/search'
 * Expects { token, username, nazev?, ico? } and returns list of matching suppliers.
 * Uses OR logic - searches by name OR ICO if both provided.
 */
export async function searchSuppliers({ token, username, nazev, ico }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!nazev && !ico) throw new Error('Musíte zadat název nebo IČO pro vyhledávání.');
  try {
    const payload = { token, username };
    if (nazev) payload.nazev = nazev;
    if (ico) payload.ico = ico;

    const response = await api2.post('dodavatele/search', payload, { timeout: 10000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/search');
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba při vyhledávání dodavatelů');
  }
}

/**
 * Fetch list of departments (useky) for multiselect
 * This would typically come from a departments endpoint or ciselniky
 */
export async function fetchDepartments({ token, username }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  try {
    // For now return mock data - replace with actual API call when available
    return [
      { zkr: 'IT', nazev: 'Informační technologie' },
      { zkr: 'HR', nazev: 'Lidské zdroje' },
      { zkr: 'FIN', nazev: 'Finance' },
      { zkr: 'LOG', nazev: 'Logistika' },
      { zkr: 'MED', nazev: 'Zdravotnictví' },
      { zkr: 'ADM', nazev: 'Administrativa' }
    ];
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba při načítání úseků');
  }
}

/**
 * Fetch list of departments (useky) from real API endpoint
 * Used in supplier management and other places where departments are needed
 */
export async function fetchUseky({ token, username }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  try {
    const response = await api2.post('/useky/list', {
      token: token,
      username: username
    });

    if (response.data.status === 'ok') {
      return response.data.data || [];
    } else {
      throw new Error(response.data.message || 'Nepodařilo se načíst seznam úseků');
    }
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba při načítání úseků');
  }
}

/**
 * Fetch supplier contacts with permission-based filtering
 * Returns global contacts + user's own contacts + department contacts (if applicable)
 * For users without CONTACT_MANAGE permission, this automatically filters based on their access
 * @param {boolean} load_all - If true and user has CONTACT_MANAGE permission, loads all contacts without restrictions
 */
export async function fetchSupplierContacts({ token, username, user_id, usek_zkr, ico, load_all = false }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  try {
    const payload = {
      token: token,
      username: username
    };

    // Add user_id if provided
    if (user_id) {
      payload.user_id = user_id;
    }

    // Add usek_zkr if provided (optional parameter)
    if (usek_zkr) {
      payload.usek_zkr = usek_zkr;
    }

    // Add ico filter if provided
    if (ico) {
      payload.ico = ico;
    }

    // Add load_all parameter for CONTACT_MANAGE users
    if (load_all) {
      payload.load_all = true;
    }

    const response = await api2.post('/dodavatele/contacts', payload);

    if (response.data.status === 'ok') {
      return response.data.data || [];
    } else {
      throw new Error(response.data.message || 'Nepodařilo se načíst kontakty dodavatelů');
    }
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba při načítání kontaktů dodavatelů');
  }
}

/**
 * Delete supplier by ICO via API2 endpoint 'dodavatele/delete'
 * Expects { token, username, ico } and returns success status.
 */
export async function deleteSupplierByIco({ token, username, ico }) {
  if (!token || !username || !ico) {
    throw new Error('Token, username and ICO are required for deleting supplier');
  }

  try {
    const payload = { token, username, ico };
    const response = await api2.post('dodavatele/delete', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/delete');
    }

    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba při mazání dodavatele');
  }
}

/**
 * Fetch employees list via API2 endpoint 'users/list'
 * Returns normalized employee contact data
 */
export async function fetchEmployees({ token, username }) {
  if (!token || !username) {
    throw new Error('Token and username are required for fetching employees');
  }

  try {
    const payload = { token, username };
    const response = await api2.post('users/list', payload, { timeout: 10000 });

    // Handle different response structures
    let employees = [];
    if (response.data) {
      if (Array.isArray(response.data)) {
        employees = response.data;
      } else if (response.data.status === 'ok' && Array.isArray(response.data.data)) {
        employees = response.data.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        employees = response.data.data;
      } else if (typeof response.data === 'object') {
        // Try to find array in response
        const possibleArrays = Object.values(response.data).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          employees = possibleArrays[0];
        }
      }
    }

    // Normalize employee data - extract only contact fields + activity
    return employees.map(emp => {
      if (!emp || typeof emp !== 'object') return null;

      return {
        id: emp.id || emp.uzivatel_id || emp.user_id || '',
        titul_pred: emp.titul_pred || '',
        jmeno: emp.jmeno || '',
        prijmeni: emp.prijmeni || '',
        titul_za: emp.titul_za || '',
        email: emp.email || '',
        telefon: emp.telefon || '',
        pozice_id: emp.pozice_id || '',
        nazev_pozice: emp.nazev_pozice || '',
        lokalita_id: emp.lokalita_id || '',
        lokalita_nazev: emp.lokalita_nazev || '',
        usek_zkr: emp.usek_zkr || '',
        usek_nazev: emp.usek_nazev || '',
        dt_posledni_aktivita: emp.dt_posledni_aktivita || '',
        // Normalize aktivni to number: 1 for active, 0 for inactive
        aktivni: emp.aktivni === 1 || emp.aktivni === '1' || emp.aktivni === true ? 1 : 0,
        // Full name for display and search
        full_name: [
          emp.titul_pred,
          emp.jmeno,
          emp.prijmeni,
          emp.titul_za
        ].filter(Boolean).join(' ').trim()
      };
    }).filter(emp => emp && (emp.jmeno || emp.prijmeni)); // Only employees with at least name or surname

  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Chyba při načítání seznamu zaměstnanců');
  }
}

// Cross-tab invalidation: listen for the invalidate marker and clear in-memory cache
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', (ev) => {
    try {
      if (!ev || !ev.key) return;
      if (String(ev.key).startsWith(ORDERS_CACHE_PREFIX + 'invalidate')) {
        // Another tab broadcasted invalidation — clear memory cache
        try { Object.keys(_ordersMemoryCache).forEach(k => delete _ordersMemoryCache[k]); } catch (e) {}
      }
    } catch (e) {}
  });
}

// =============================================================================
// NOVÉ API ENDPOINTY PODLE DOKUMENTACE (říjen 2025)
// =============================================================================

/**
 * Vylepšená normalizace chyb podle dokumentace API
 * Ošetřuje dva formáty: nové API {status: "error", message, code} vs staré API {err}
 */
export function normalizeApiErrorEnhanced(err) {
  try {
    if (!err) return { userMessage: 'Došlo k chybě', code: 'unknown', originalError: null };

    // Axios network error (no response)
    if (err.isAxiosError && !err.response) {
      return {
        userMessage: 'Problém s připojením. Zkontrolujte internetové připojení a zkuste to znovu.',
        code: 'network',
        originalError: err
      };
    }

    const status = err.response?.status || err.statusCode || null;
    const responseData = err.response?.data || {};

    // NOVÉ API formát: {status: "error", message: "...", code: "..."}
    if (responseData.status === 'error') {
      const message = responseData.message || 'Došlo k chybě na serveru';
      const code = responseData.code || 'server_error';
      return { userMessage: message, code: code.toLowerCase(), originalError: err };
    }

    // STARÉ API formát: {err: "..."}
    if (responseData.err) {
      return { userMessage: responseData.err, code: 'legacy_error', originalError: err };
    }

    // HTTP status based errors
    if (status === 401 || status === 403) {
      return {
        userMessage: 'Vaše přihlášení vypršelo. Přihlaste se prosím znovu.',
        code: 'unauthorized',
        originalError: err
      };
    }

    if (status === 404) {
      return {
        userMessage: 'Požadovaný zdroj nebyl nalezen.',
        code: 'not_found',
        originalError: err
      };
    }

    if (status === 500) {
      return {
        userMessage: 'Chyba na serveru. Zkuste to prosím později.',
        code: 'server_error',
        originalError: err
      };
    }

    // Fallback
    const fallbackMessage = err.message || JSON.stringify(responseData) || 'Neočekávaná chyba';
    return { userMessage: fallbackMessage, code: 'unknown', originalError: err };

  } catch (e) {
    return { userMessage: 'Došlo k neočekávané chybě', code: 'parse_error', originalError: err };
  }
}

// =============================================================================
// DODAVATELÉ - NOVÉ ENDPOINTY
// =============================================================================

/**
 * Načtení seznamu dodavatelů podle dokumentace
 * POST /dodavatele/list
 */
export async function fetchSuppliersList({ token, username, user_id, usek_zkr }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');

  try {
    const payload = { token, username };
    if (user_id !== undefined) payload.user_id = user_id;
    if (usek_zkr !== undefined) payload.usek_zkr = usek_zkr;

    const response = await api2.post('dodavatele/list', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/list endpoint');
    }

    const data = response.data;

    // Nové API formát: {status: "ok", data: [...]}
    if (data.status === 'ok') {
      return Array.isArray(data.data) ? data.data : [];
    }

    // Fallback pro přímé pole
    if (Array.isArray(data)) return data;

    throw new Error('Neplatný formát odpovědi při načítání seznamu dodavatelů');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Detail konkrétního dodavatele podle ID
 * POST /dodavatele/detail
 */
export async function getSupplierDetail({ token, username, id }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!id) throw new Error('ID dodavatele je vyžadováno.');

  try {
    const payload = { token, username, id };
    const response = await api2.post('dodavatele/detail', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/detail endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return data.data;
    }

    throw new Error('Neplatný formát odpovědi při načítání detailu dodavatele');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Vyhledání dodavatele podle IČO (přesná shoda)
 * POST /dodavatele/search-ico
 */
export async function searchSupplierByIcoExact({ token, username, ico }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!ico) throw new Error('IČO je vyžadováno pro vyhledávání dodavatele.');

  try {
    const payload = { token, username, ico };
    const response = await api2.post('dodavatele/search-ico', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/search-ico endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return data.data; // může být null pokud nenalezen
    }

    throw new Error('Neplatný formát odpovědi při vyhledávání dodavatele podle IČO');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Vyhledání dodavatelů podle názvu (LIKE %nazev%)
 * POST /dodavatele/search-nazev
 */
export async function searchSuppliersByName({ token, username, nazev }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!nazev) throw new Error('Název dodavatele je vyžadován pro vyhledávání.');

  try {
    const payload = { token, username, nazev };
    const response = await api2.post('dodavatele/search-nazev', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/search-nazev endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return Array.isArray(data.data) ? data.data : [];
    }

    throw new Error('Neplatný formát odpovědi při vyhledávání dodavatele podle názvu');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Kontakty dodavatelů - filtrované nebo všechny (pro admin)
 * POST /dodavatele/contacts
 */
export async function fetchSuppliersContacts({ token, username, user_id, usek_zkr, load_all = false }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');

  try {
    const payload = { token, username, load_all };
    if (user_id !== undefined) payload.user_id = user_id;
    if (usek_zkr !== undefined) payload.usek_zkr = usek_zkr;

    const response = await api2.post('dodavatele/contacts', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/contacts endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return {
        contacts: Array.isArray(data.data) ? data.data : [],
        count: data.count || 0,
        filter_criteria: data.filter_criteria || null
      };
    }

    throw new Error('Neplatný formát odpovědi při načítání kontaktů dodavatelů');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Aktualizace dodavatele podle ID
 * POST /dodavatele/update
 */
export async function updateSupplier({ token, username, id, nazev, ico, adresa, dic, zastoupeny, kontakt_jmeno, kontakt_email, kontakt_telefon }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!id) throw new Error('ID dodavatele je vyžadováno pro aktualizaci.');

  try {
    const payload = { token, username, id };

    // Přidat pouze poskytnuté fieldy
    if (nazev !== undefined) payload.nazev = nazev;
    if (ico !== undefined) payload.ico = ico;
    if (adresa !== undefined) payload.adresa = adresa;
    if (dic !== undefined) payload.dic = dic;
    if (zastoupeny !== undefined) payload.zastoupeny = zastoupeny;
    if (kontakt_jmeno !== undefined) payload.kontakt_jmeno = kontakt_jmeno;
    if (kontakt_email !== undefined) payload.kontakt_email = kontakt_email;
    if (kontakt_telefon !== undefined) payload.kontakt_telefon = kontakt_telefon;

    const response = await api2.post('dodavatele/update', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/update endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return data.data;
    }

    throw new Error('Neplatný formát odpovědi při aktualizaci dodavatele');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

// POZN: updateSupplierByIco již existuje na řádku 1016 - duplicita odstraněna

/**
 * Smazání dodavatele podle ID
 * POST /dodavatele/delete
 */
export async function deleteSupplier({ token, username, id }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!id) throw new Error('ID dodavatele je vyžadováno pro smazání.');

  try {
    const payload = { token, username, id };
    const response = await api2.post('dodavatele/delete', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from dodavatele/delete endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return data.data;
    }

    throw new Error('Neplatný formát odpovědi při mazání dodavatele');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

// =============================================================================
// ÚSEKY/ODDĚLENÍ - NOVÉ ENDPOINTY
// =============================================================================

/**
 * Seznam všech úseků/oddělení (nahrazuje mock fetchDepartments)
 * POST /useky/list
 */
export async function fetchUskyList({ token, username }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');

  try {
    const payload = { token, username };
    const response = await api2.post('useky/list', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from useky/list endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return Array.isArray(data.data) ? data.data : [];
    }

    throw new Error('Neplatný formát odpovědi při načítání seznamu úseků');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Detail konkrétního úseku podle ID
 * POST /useky/detail
 */
export async function getUsekDetail({ token, username, id }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!id) throw new Error('ID úseku je vyžadováno.');

  try {
    const payload = { token, username, id };
    const response = await api2.post('useky/detail', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from useky/detail endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return data.data;
    }

    throw new Error('Neplatný formát odpovědi při načítání detailu úseku');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Vyhledání úseku podle zkratky
 * POST /useky/by-zkr
 */
export async function getUsekByZkr({ token, username, usek_zkr }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!usek_zkr) throw new Error('Usek zkratka is required.');

  try {
    const payload = { token, username, usek_zkr };
    const response = await api2.post('useky/by-zkr', payload, { timeout: 10000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from useky/by-zkr endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return data.data;
    }

    throw new Error('Neplatný formát odpovědi při vyhledávání úseku podle zkratky');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

// =============================================================================
// OBJEDNÁVKY - CHYBĚJÍCÍ ENDPOINT
// =============================================================================

/**
 * Kontrola existence čísla objednávky
 * POST /order/check-number
 */
export async function checkOrderNumber({ token, username, cislo_objednavky }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!cislo_objednavky) throw new Error('Order number is required.');

  try {
    const payload = { token, username, cislo_objednavky };
    const response = await api2.post('order/check-number', payload, { timeout: 16000 });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from order/check-number endpoint');
    }

    const data = response.data;

    // Může být buď nový formát {status: "ok", data: {exists: boolean}} nebo starý {exists: boolean}
    if (data.status === 'ok') {
      return data.data;
    }

    // Fallback pro starý formát
    if (typeof data.exists === 'boolean') {
      return { exists: data.exists };
    }

    throw new Error('Neplatný formát odpovědi při kontrole čísla objednávky');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

// =============================================================================
// AKTUALIZACE STÁVAJÍCÍCH FUNKCÍ
// =============================================================================

/**
 * Vylepšená verze fetchUseky - nyní používá skutečný API endpoint
 * (nahrazuje původní fetchUseky která volala mock data)
 */
export async function fetchUskyEnhanced({ token, username }) {
  // Použije nový endpoint useky/list
  return await fetchUskyList({ token, username });
}

/**
 * Alias pro zpětnou kompatibilitu - přejmenování endpoint z 'sablony' na 'templates/list'
 * Pokud server stále používá 'sablony', zachová se stávající funkce
 */
export async function fetchTemplatesListNew({ token, username, user_id, kategorie }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  try {
    const payload = { token, username, user_id, kategorie };

    // Zkusit nejdřív nový endpoint templates/list
    try {
      const response = await api2.post('templates/list', payload, { timeout: 16000 });
      if (response.status === 200) {
        const data = response.data;
        if (data.status === 'ok') {
          return Array.isArray(data.data) ? data.data : [];
        }
      }
    } catch (newEndpointError) {
      // Fallback na starý endpoint 'sablony'
    }

    // Fallback na původní endpoint
    const response = await api2.post('sablony', payload, { timeout: 16000 });
    if (response.status !== 200) throw new Error('Neočekávaný kód odpovědi ze serveru from templates endpoint');

    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && data.result && Array.isArray(data.result)) return data.result;

    return [];
  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

// =============================================================================
// SPRÁVA PŘÍLOH - NOVÉ API ENDPOINTY (říjen 2025)
// =============================================================================

/**
 * GUID generator pro přílohy (client-side)
 * Vytváří RFC 4122 compliant UUID v4 formát
 */
export function generateAttachmentGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

/**
 * Upload přílohy s metadaty - POST /attachments/upload
 *
 * @param {Object} params - Parametry uploadu
 * @param {string} params.username - Uživatelské jméno
 * @param {string} params.token - Autentizační token
 * @param {number} params.objednavka_id - ID objednávky
 * @param {string} params.originalni_nazev - Původní název souboru
 * @param {string} params.systemovy_nazev - Datum_GUID formát bez přípony (např. "2025-10-01_E3A4B2C1-D5F6-4E7A-8B9C-1D2E3F4A5B6C")
 * @param {number} params.velikost - Velikost souboru v bytech
 * @param {string} params.typ_prilohy - Klasifikace dokumentu (Obj, fa, apod.)
 * @param {File} [params.file] - Skutečný soubor (volitelný)
 * @returns {Promise<Object>} Response s detaily nahrané přílohy
 */
export async function uploadAttachment({ username, token, objednavka_id, originalni_nazev, systemovy_nazev, velikost, typ_prilohy, file }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!objednavka_id) throw new Error('ID objednávky je vyžadováno.');
  if (!originalni_nazev) throw new Error('Původní název souboru je vyžadován.');
  if (!systemovy_nazev) throw new Error('Systémový název souboru je vyžadován.');
  if (!velikost) throw new Error('Velikost souboru je vyžadována.');
  if (!typ_prilohy) throw new Error('Typ přílohy je vyžadován.');

  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('token', token);
    formData.append('objednavka_id', String(objednavka_id));
    formData.append('originalni_nazev', originalni_nazev);
    formData.append('systemovy_nazev', systemovy_nazev); // Hodnota: 2025-10-01_E3A4B2C1-D5F6-4E7A-8B9C-1D2E3F4A5B6C
    formData.append('velikost', String(velikost));
    formData.append('typ_prilohy', typ_prilohy);

    // Soubor je volitelný - pokud není poslán, vytvoří se placeholder
    if (file instanceof File) {
      formData.append('file', file);
    }

    const response = await api2.post('attachments/upload', formData, {
      timeout: 30000,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from attachments/upload endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return data.data;
    }

    throw new Error('Neplatný formát odpovědi při uploadu přílohy');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Seznam příloh objednávky - POST /attachments/list
 *
 * @param {Object} params - Parametry
 * @param {string} params.username - Uživatelské jméno
 * @param {string} params.token - Autentizační token
 * @param {number} params.objednavka_id - ID objednávky
 * @returns {Promise<Object>} Response se seznamem příloh
 */
export async function listAttachments({ username, token, objednavka_id }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!objednavka_id) throw new Error('ID objednávky je vyžadováno.');

  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('token', token);
    formData.append('objednavka_id', String(objednavka_id));

    const response = await api2.post('attachments/list', formData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from attachments/list endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return {
        attachments: Array.isArray(data.data.attachments) ? data.data.attachments : [],
        count: data.data.count || 0
      };
    }

    throw new Error('Neplatný formát odpovědi při načítání seznamu příloh');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Ověření existence příloh na serveru - POST /attachments/verify
 * Kontroluje skutečnou existenci souborů na serveru disku
 *
 * @param {Object} params - Parametry
 * @param {string} params.username - Uživatelské jméno
 * @param {string} params.token - Autentizační token
 * @param {number} params.objednavka_id - ID objednávky
 * @returns {Promise<Object>} Response s detailním stavem příloh
 */
export async function verifyAttachments({ username, token, objednavka_id }) {
  // Debug logging

  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!objednavka_id) throw new Error('ID objednávky je vyžadováno.');

  try {
    // FormData s username + token (povinné pro všechny POST funkce)
    const formData = new FormData();
    formData.append('username', username);
    formData.append('token', token);
    formData.append('objednavka_id', String(objednavka_id));

    const response = await api2.post('attachments/verify', formData, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from attachments/verify endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return {
        attachments: Array.isArray(data.data.attachments) ? data.data.attachments : [],
        existing_count: data.data.existing_count || 0,
        missing_count: data.data.missing_count || 0
      };
    }

    throw new Error('Neplatný formát odpovědi při ověřování příloh');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Stažení přílohy - POST /attachments/download
 *
 * @param {Object} params - Parametry
 * @param {string} params.username - Uživatelské jméno
 * @param {string} params.token - Autentizační token
 * @param {string} params.guid - GUID přílohy
 * @returns {Promise<Blob>} Binární data souboru
 */
export async function downloadAttachment({ username, token, guid }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!guid) throw new Error('GUID přílohy je vyžadován.');

  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('token', token);
    formData.append('guid', guid);

    const response = await api2.post('attachments/download', formData, {
      timeout: 30000,
      responseType: 'blob',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from attachments/download endpoint');
    }

    // Pro blob response vracíme přímo data
    return response.data;

  } catch (err) {
    // Pro blob endpoint může být chyba v jiném formátu
    if (err.response && err.response.data instanceof Blob) {
      // Zkusit parsovat blob jako JSON chybu
      try {
        const text = await err.response.data.text();
        const errorData = JSON.parse(text);
        if (errorData.status === 'error') {
          throw new Error(errorData.message || 'Chyba při stahování přílohy');
        }
      } catch (parseErr) {
        // Fallback pokud nelze parsovat
        throw new Error('Chyba při stahování přílohy');
      }
    }

    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Update přílohy (klasifikace) - POST /attachments/update
 *
 * @param {Object} params - Parametry
 * @param {string} params.username - Uživatelské jméno
 * @param {string} params.token - Autentizační token
 * @param {number} params.id - ID přílohy (povinné)
 * @param {string} params.typ_prilohy - Nový typ přílohy
 * @returns {Promise<Object>} Response s detaily aktualizované přílohy + info o úpravě
 */
export async function updateAttachment({ username, token, id, typ_prilohy }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!id) throw new Error('ID přílohy je vyžadováno.');
  if (!typ_prilohy) throw new Error('Typ přílohy je vyžadován.');

  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('token', token);
    formData.append('id', String(id));
    formData.append('typ_prilohy', typ_prilohy);

    const response = await api2.post('attachments/update', formData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from attachments/update endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return data.data;
    }

    throw new Error(data.message || 'Neočekávaná chyba při aktualizaci přílohy');

  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED') {
        throw new Error('Aktualizace přílohy trvá příliš dlouho. Zkuste to prosím znovu.');
      }

      if (err.response?.status === 404) {
        throw new Error('Příloha nebyla nalezena na serveru');
      }

      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }

      if (err.response?.status >= 500) {
        throw new Error('Chyba při aktualizaci přílohy na serveru');
      }
    }

    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Smazání přílohy - POST /attachments/delete
 *
 * @param {Object} params - Parametry
 * @param {string} params.username - Uživatelské jméno
 * @param {string} params.token - Autentizační token
 * @param {string} [params.guid] - GUID přílohy (prioritní)
 * @param {number} [params.id] - ID přílohy (alternativa k GUID)
 * @returns {Promise<Object>} Response s detaily smazané přílohy
 */
export async function deleteAttachment({ username, token, guid, id }) {
  if (!token || !username) throw new Error('Chybí přístupový token nebo uživatelské jméno.');
  if (!guid && !id) throw new Error('GUID nebo ID přílohy je vyžadováno.');

  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('token', token);

    // GUID má prioritu před ID
    if (guid) {
      formData.append('guid', guid);
    } else if (id) {
      formData.append('id', String(id));
    }

    const response = await api2.post('attachments/delete', formData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.status !== 200) {
      throw new Error('Neočekávaný kód odpovědi ze serveru from attachments/delete endpoint');
    }

    const data = response.data;

    if (data.status === 'ok') {
      return data.data;
    }

    throw new Error('Neplatný formát odpovědi při mazání přílohy');

  } catch (err) {
    const normalized = normalizeApiErrorEnhanced(err);
    throw new Error(normalized.userMessage);
  }
}

/**
 * Utility funkce pro vytvoření download linku ze stažené přílohy
 *
 * @param {Blob} blob - Binární data souboru
 * @param {string} filename - Původní název souboru
 * @returns {string} Object URL pro download
 */
export function createDownloadLink(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return url;
}

/**
 * Utility funkce pro validaci GUID formátu
 *
 * @param {string} guid - GUID k validaci
 * @returns {boolean} True pokud je GUID validní
 */
export function isValidGUID(guid) {
  if (!guid || typeof guid !== 'string') return false;
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(guid);
}

/**
 * Utility funkce pro extrakci přípony ze jména souboru
 *
 * @param {string} filename - Název souboru
 * @returns {string} Přípona souboru (bez tečky)
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Utility funkce pro kontrolu povolených přípon souborů
 * Podporované formáty:
 * - Dokumenty: PDF, DOC, DOCX, RTF, ODT
 * - Tabulky: XLS, XLSX, ODS, CSV
 * - Prezentace: PPT, PPTX, ODP
 * - Text: TXT, MD
 * - Obrázky: JPG, JPEG, PNG, GIF, BMP, WEBP, SVG
 * - Archivy: ZIP, RAR, 7Z, TAR, GZ
 *
 * @param {string} filename - Název souboru
 * @returns {boolean} True pokud je přípona povolena
 */
export function isAllowedFileExtension(filename) {
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
    'zip', 'rar', '7z', 'tar', 'gz'
  ];
  const extension = getFileExtension(filename);
  return allowedExtensions.includes(extension);
}

/**
 * Utility funkce pro kontrolu maximální velikosti souboru
 *
 * @param {number} sizeBytes - Velikost souboru v bytech
 * @param {number} [maxSizeMB=5] - Maximální povolená velikost v MB
 * @returns {boolean} True pokud je velikost v pořádku
 */
export function isAllowedFileSize(sizeBytes, maxSizeMB = 5) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return sizeBytes <= maxSizeBytes;
}

// =============================================================================
// TODO A POZNÁMKY - NOVÉ API ENDPOINTY (říjen 2025)
// =============================================================================

/**
 * Načítání TODO nebo poznámek ze serveru
 * POST /api.eeo/load
 *
 * @param {string} token - Uživatelský token
 * @param {string} username - Uživatelské jméno
 * @param {string} typ - Typ dat ('TODO' nebo 'NOTES')
 * @returns {Promise<Object>} Načtená data
 */
export async function loadUserData({ token, username, typ, user_id }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!typ || !['TODO', 'NOTES'].includes(typ)) {
    throw new Error('Neplatný typ dat. Povolené hodnoty: TODO, NOTES');
  }

  if (!user_id) {
    throw new Error('Chybí user_id pro načtení dat.');
  }

  try {
    const payload = {
      username,
      token,
      typ,
      user_id
    };

    // Načítám ze serveru

    const response = await api2.post('todonotes/load', payload, { timeout: 15000 });

    // Response data zpracována

    if (response.status !== 200) {
      throw new Error(`Neočekávaný kód odpovědi při načítání ${typ}: ${response.status}`);
    }

    const data = response.data;

    // Log celé response pro debugging
    // );

    // Očekávaná struktura odpovědi: { status: 'ok', data: {...} } nebo { status: 'error', message: '...' }
    if (data?.status === 'error') {
      throw new Error(data.message || `Chyba při načítání ${typ}`);
    }

    if (data?.status === 'ok') {
      let result = data.data || {};

      // Vytvoříme response objekt s ID
      const responseWithId = {
        ID: data.ID || null,  // Extrahujeme ID z response
        ...result
      };

      // Parsování podle typu dat
      if (typ === 'TODO' && result && typeof result === 'object') {
        // TODO - očekáváme objekt s content.items nebo přímo pole
        if (result.content && result.content.items) {
          responseWithId.data = result.content.items; // Vrátíme přímo pole TODO položek
        } else if (Array.isArray(result.content)) {
          responseWithId.data = result.content; // Backup - pokud content je přímo pole
        } else if (Array.isArray(result)) {
          responseWithId.data = result; // Fallback - pokud result je přímo pole
        } else {
          responseWithId.data = []; // Prázdné TODO
        }
        return responseWithId;
      } else if (typ === 'NOTES' && result && typeof result === 'object') {
        // NOTES - extrahujeme text z různých možných struktur
        // );

        // Priorita 1: result.content.text (nový formát)
        if (result.content && result.content.text !== undefined) {
          //
          responseWithId.data = result.content.text;
        }
        // Priorita 2: result.obsah.text (backend vrací co jsme poslali)
        else if (result.obsah && result.obsah.text !== undefined) {
          //
          responseWithId.data = result.obsah.text;
        }
        // Priorita 3: result.text (přímý text v objektu)
        else if (result.text !== undefined) {
          //
          responseWithId.data = result.text;
        }
        // Priorita 4: result.content jako string
        else if (result.content !== undefined && typeof result.content === 'string') {
          //
          responseWithId.data = result.content;
        }
        // Priorita 5: result.obsah jako string
        else if (result.obsah !== undefined && typeof result.obsah === 'string') {
          //
          responseWithId.data = result.obsah;
        }
        // Priorita 6: result jako string (fallback)
        else if (typeof result === 'string') {
          //
          responseWithId.data = result;
        }
        // Poslední možnost: žádná data
        else {
          responseWithId.data = '';
        }

        //
        return responseWithId;
      }

      return responseWithId;
    }

    // Fallback pro starší API odpovědi

    return data || {};

  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error('Neplatný přístupový token. Přihlaste se prosím znovu.');
    }

    if (error.response?.status === 404) {
      // Data neexistují - vrátíme null pro správnou detekci
      return null;
    }

    throw new Error(error.response?.data?.message || error.message || `Chyba na serveru při načítání ${typ}. Zkuste to prosím později.`);
  }
}

/**
 * Ukládání TODO nebo poznámek na server
 * POST /api.eeo/save
 *
 * @param {string} token - Uživatelský token
 * @param {string} username - Uživatelské jméno
 * @param {string} typ - Typ dat ('TODO' nebo 'NOTES')
 * @param {Object|string} obsah - Obsah k uložení (JSON objekt nebo string)
 * @returns {Promise<Object>} Výsledek uložení
 */
export async function saveUserData({ token, username, typ, obsah, user_id, id = null }) {
  if (!token || !username) {
    throw new Error('Chybí přístupový token nebo uživatelské jméno. Přihlaste se prosím znovu.');
  }

  if (!typ || !['TODO', 'NOTES'].includes(typ)) {
    throw new Error('Neplatný typ dat. Povolené hodnoty: TODO, NOTES');
  }

  if (!user_id) {
    throw new Error('Chybí user_id pro uložení dat.');
  }

  if (obsah === undefined || obsah === null) {
    throw new Error('Chybí obsah k uložení.');
  }

  try {
    // Formátování content podle typu
    let content;

    if (typ === 'TODO') {
      // TODO data - pole úkolů s metadaty
      if (Array.isArray(obsah)) {
        content = {
          items: obsah,
          settings: {
            lastModified: Date.now(),
            itemCount: obsah.length
          }
        };
      } else {
        content = {
          items: [],
          settings: {
            lastModified: Date.now(),
            itemCount: 0
          }
        };
      }
    } else if (typ === 'NOTES') {
      // NOTES data - text s metadaty
      if (typeof obsah === 'string') {
        content = {
          text: obsah,
          settings: {
            lastModified: Date.now(),
            length: obsah.length
          }
        };
        //
      } else if (typeof obsah === 'object' && obsah !== null) {
        content = {
          text: obsah.content || String(obsah),
          settings: {
            lastModified: obsah.lastModified || Date.now(),
            length: (obsah.content || String(obsah)).length
          }
        };
        //
      } else {
        content = {
          text: String(obsah || ''),
          settings: {
            lastModified: Date.now(),
            length: String(obsah || '').length
          }
        };
      }
    }

    const payload = {
      username,
      token,
      typ,
      user_id,  // Přidám user_id do payload
      id: id,  // null = INSERT, hodnota = UPDATE
      obsah: content  // OPRAVA: obsah místo content
    };

    // Ukládám na server

    const response = await api2.post('todonotes/save', payload, { timeout: 15000 });

    if (response.status !== 200) {
      throw new Error(`Neočekávaný kód odpovědi při ukládání ${typ}: ${response.status}`);
    }

    const data = response.data;

    // Očekávaná struktura odpovědi: { status: 'ok', message: '...' } nebo { status: 'error', message: '...' }
    if (data?.status === 'error') {
      throw new Error(data.message || `Chyba při ukládání ${typ}`);
    }

    if (data?.status === 'ok') {
      return {
        success: true,
        message: data.message || `${typ} úspěšně uloženo`,
        timestamp: Date.now(),
        ID: data.ID || null  // Vrátíme ID z backendu pro budoucí UPDATE operace
      };
    }

    // Fallback pro starší API odpovědi
    return {
      success: true,
      message: `${typ} uloženo`,
      timestamp: Date.now()
    };

  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error('Neplatný přístupový token. Přihlaste se prosím znovu.');
    }

    throw new Error(error.response?.data?.message || error.message || `Chyba na serveru při ukládání ${typ}. Zkuste to prosím později.`);
  }
}

/**
 * Smaže TODO nebo NOTES data ze serveru pomocí ID
 * @param {Object} params - parametry
 * @param {string} params.token - přístupový token
 * @param {string} params.username - uživatelské jméno
 * @param {string} params.typ - 'TODO' nebo 'NOTES'
 * @param {number} params.user_id - ID uživatele
 * @param {number} params.id - ID záznamu v databázi k smazání
 * @returns {Promise<Object>} - výsledek operace
 */
export async function deleteUserData({ token, username, typ, user_id, id }) {
  if (!token || !username) {
    throw new Error('Token a username jsou povinné parametry');
  }

  if (!id) {
    throw new Error('ID záznamu je vyžadováno pro smazání');
  }

  if (!['TODO', 'NOTES'].includes(typ)) {
    throw new Error('Typ musí být "TODO" nebo "NOTES"');
  }

  try {
    const payload = {
      token,
      username,
      typ,
      user_id,
      id
    };

    const response = await api2.post('todonotes/delete', payload, { timeout: 15000 });

    if (response.status !== 200) {
      throw new Error(`Neočekávaný kód odpovědi při mazání ${typ}: ${response.status}`);
    }

    const data = response.data;

    // Očekávaná struktura odpovědi: { status: 'ok', message: '...' } nebo { status: 'error', message: '...' }
    if (data?.status === 'error') {
      throw new Error(data.message || `Chyba při mazání ${typ}`);
    }

    if (data?.status === 'ok') {
      return {
        success: true,
        message: data.message || `${typ} úspěšně smazáno`,
        timestamp: Date.now()
      };
    }

    // Fallback pro starší API odpovědi
    return {
      success: true,
      message: `${typ} smazáno`,
      timestamp: Date.now()
    };

  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error('Neplatný přístupový token. Přihlaste se prosím znovu.');
    }

    throw new Error(error.response?.data?.message || error.message || `Chyba na serveru při mazání ${typ}. Zkuste to prosím později.`);
  }
}

/**
 * Zkrácené funkce pro snadnější použití
 */

/**
 * Načte TODO data uživatele
 */
export async function loadTodoData({ token, username, user_id }) {
  return await loadUserData({ token, username, typ: 'TODO', user_id });
}

/**
 * Uloží TODO data uživatele
 */
export async function saveTodoData({ token, username, obsah, user_id, id = null }) {
  return await saveUserData({ token, username, typ: 'TODO', obsah, user_id, id });
}

/**
 * Načte poznámky uživatele
 */
export async function loadNotesData({ token, username, user_id }) {
  return await loadUserData({ token, username, typ: 'NOTES', user_id });
}

/**
 * Uloží poznámky uživatele
 */
export async function saveNotesData({ token, username, obsah, user_id, id = null }) {
  return await saveUserData({ token, username, typ: 'NOTES', obsah, user_id, id });
}

/**
 * Smaže TODO data uživatele
 */
export async function deleteTodoData({ token, username, user_id, id }) {
  return await deleteUserData({ token, username, typ: 'TODO', user_id, id });
}

/**
 * Smaže poznámky uživatele
 */
export async function deleteNotesData({ token, username, user_id, id }) {
  return await deleteUserData({ token, username, typ: 'NOTES', user_id, id });
}

/**
 * Načte limitované příslibovné kódy z API
 * @param {string} token - Autentizační token
 * @param {string} username - Uživatelské jméno
 * @returns {Promise<Array>} - Seznam limitovaných příslibů
 */
export async function fetchLimitovanePrisliby({ token, username }) {
  if (!token || !username) {
    throw new Error('Token a username jsou povinné pro načtení limitovaných příslibů');
  }

  try {
    // Načítám limitované příslibové kódy

    const response = await api2.post('/limitovane_prisliby', {
      token,
      username
    });

    // Zpracování odpovědi

    // Podle příkladu API vrací { "data": [...] }
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      // Data v response.data.data
      return response.data.data;
    } else if (response.data && Array.isArray(response.data)) {

      return response.data;
    } else {
      return [];
    }

  } catch (error) {
    // 🔧 FIX: Pokud nemá uživatel oprávnění (403), vrátíme prázdné pole místo chyby
    // LP kódy se tak načtou pouze pro uživatele s oprávněním, ostatní dostanou prázdný seznam
    if (error.response?.status === 403) {
      console.log('ℹ️ Uživatel nemá oprávnění k LP kódům - vráceno prázdné pole');
      return [];
    }

    if (error.response?.status === 401) {
      throw new Error('Chyba autentizace při načítání LP kódů');
    }

    throw new Error(`Chyba při načítání limitovaných příslibových kódů: ${error.message}`);
  }
}

/**
 * Načte detailní stav konkrétního LP včetně zbývající částky
 * @param {object} params - { token, username, lp_id }
 * @returns {Promise<object>} - LP objekt s poli: celkovy_limit, skutecne_cerpano, zbyva_skutecne, procento_skutecne, je_prekroceno_skutecne
 */
export async function fetchLPDetail({ token, username, cislo_lp }) {
  if (!token || !username) {
    throw new Error('Token a username jsou povinné');
  }
  if (!cislo_lp) {
    throw new Error('cislo_lp je povinný parametr');
  }

  try {
    const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
    const endpoint = `${API_BASE_URL}limitovane-prisliby/stav`;
    
    const payload = {
      token,
      username,
      cislo_lp
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('💰 LP API Error:', { status: response.status, statusText: response.statusText, body: errorText });
      
      if (response.status === 403) {
        console.log('ℹ️ Uživatel nemá oprávnění k detailu LP');
        return null;
      }
      if (response.status === 401) {
        throw new Error('Chyba autentizace při načítání detailu LP');
      }
      if (response.status === 404) {
        console.log(`ℹ️ LP ${cislo_lp} nebylo nalezeno nebo nemá definovaný stav`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    // Podle dokumentace API vrací { status: "ok", data: {...} }
    if (result?.status === 'ok' && result?.data) {
      return result.data;
    }

    throw new Error('Neplatný formát odpovědi z API');
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(`Chyba připojení k API: ${error.message}`);
    }
    throw error;
  }
}

// ============================================
// USER MANAGEMENT API
// ============================================

/**
 * Vytvoření nového uživatele
 */
/**
 * Načtení detailu uživatele
 * Podle nové dokumentace vrací data PŘÍMO (ne ve wrapperu)
 * Obsahuje: pozice_id, lokalita_id, usek_id, organizace_id
 * Roles a direct_rights mají "id" field
 */
export async function fetchUserDetail({ token, username, id }) {
  try {
    const response = await api2.post('user/detail', {
      token,
      username,
      user_id: id
    });

    // Backend vrací data PŘÍMO, pokud je úspěch
    if (response.data && typeof response.data === 'object' && response.data.id) {
      return response.data;
    }

    // Pokud má status error, vyhoď chybu
    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Chyba při načítání detailu uživatele');
    }

    // Neočekávaný formát
    throw new Error('Neočekávaný formát odpovědi');
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

/**
 * Vytvoření uživatele
 * Podle nové dokumentace vrací: {status: 'ok', data: {id, username, message}}
 */
export async function createUser({
  new_username,
  password,
  jmeno,
  prijmeni,
  titul_pred,
  titul_za,
  email,
  telefon,
  usek_id,
  lokalita_id,
  pozice_id,
  organizace_id,
  aktivni,
  vynucena_zmena_hesla,
  roles,
  direct_rights,
  token,
  username
}) {
  try {
    const response = await api2.post('users/create', {
      new_username,
      password,
      jmeno,
      prijmeni,
      titul_pred,
      titul_za,
      email,
      telefon,
      usek_id,
      lokalita_id,
      pozice_id,
      organizace_id,
      aktivni,
      vynucena_zmena_hesla,
      roles,
      direct_rights,
      token,
      username
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Chyba při vytváření uživatele');
    }

    // Vrací {status: 'ok', data: {id, username, message}}
    return response.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

/**
 * Update uživatele
 */
export async function updateUser({
  id,
  jmeno,
  prijmeni,
  titul_pred,
  titul_za,
  email,
  telefon,
  usek_id,
  lokalita_id,
  pozice_id,
  organizace_id,
  aktivni,
  vynucena_zmena_hesla,
  password,
  roles,
  direct_rights,
  token,
  username,
  new_username
}) {
  try {
    const payload = {
      id,
      username,
      token
    };

    // Přidat new_username (nový/upravený username editovaného uživatele)
    if (new_username !== undefined) payload.new_username = new_username;

    // Přidat pouze neprázdná pole
    if (jmeno !== undefined && jmeno !== null) payload.jmeno = jmeno;
    if (prijmeni !== undefined && prijmeni !== null) payload.prijmeni = prijmeni;

    // 🔧 Tituly posílat VŽDY (i když jsou prázdné) - prázdný string "" znamená "smazat hodnotu v DB"
    if (titul_pred !== undefined) payload.titul_pred = titul_pred; // "" nebo string
    if (titul_za !== undefined) payload.titul_za = titul_za;       // "" nebo string

    if (email !== undefined) payload.email = email;
    if (telefon !== undefined) payload.telefon = telefon;
    if (usek_id !== undefined) payload.usek_id = usek_id;
    if (lokalita_id !== undefined) payload.lokalita_id = lokalita_id;
    if (pozice_id !== undefined) payload.pozice_id = pozice_id;
    if (organizace_id !== undefined) payload.organizace_id = organizace_id;
    if (aktivni !== undefined) payload.aktivni = aktivni;
    if (vynucena_zmena_hesla !== undefined) payload.vynucena_zmena_hesla = vynucena_zmena_hesla;
    if (password) payload.password = password;
    if (roles !== undefined) payload.roles = roles;
    if (direct_rights !== undefined) payload.direct_rights = direct_rights;

    const response = await api2.post('users/update', payload);

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Chyba při aktualizaci uživatele');
    }

    return response.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

/**
 * Deaktivace uživatele
 */
export async function deactivateUser({ id, token, username }) {
  try {
    const response = await api2.post('users/deactivate', {
      id,
      username,
      token
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Chyba při deaktivaci uživatele');
    }

    return response.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

/**
 * Partial update uživatele (změna hesla, aktivní stav, apod.)
 * POST /users/partial_update
 */
export async function partialUpdateUser({ id, token, username, password, aktivni, vynucena_zmena_hesla }) {
  try {
    const payload = { id, token, username };
    if (password !== undefined) payload.password = password;
    if (aktivni !== undefined) payload.aktivni = aktivni;
    if (vynucena_zmena_hesla !== undefined) payload.vynucena_zmena_hesla = vynucena_zmena_hesla;

    const response = await api2.post('users/partial-update', payload);

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Chyba při aktualizaci uživatele');
    }

    return response.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

/**
 * Smazání uživatele (hard delete - pouze s právem USER_DELETE)
 * POST /users/delete
 */
export async function deleteUser({ id, token, username }) {
  try {
    const response = await api2.post('users/delete', {
      id,
      token,
      username
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message || 'Chyba při mazání uživatele');
    }

    return response.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

// ============================================
// ČÍSELNÍKOVÉ ENDPOINTY
// ============================================

export async function fetchLokality({ token, username }) {
  try {
    const response = await api2.post('lokality/list', {
      username,
      token
    });
    return response.data.status === 'ok' ? response.data.data : [];
  } catch (error) {
    return [];
  }
}

export async function fetchPozice({ token, username }) {
  try {
    const response = await api2.post('pozice/list', {
      username,
      token
    });
    return response.data.status === 'ok' ? response.data.data : [];
  } catch (error) {
    return [];
  }
}

export async function fetchOrganizace({ token, username }) {
  try {
    const response = await api2.post('organizace/list', {
      username,
      token
    });
    return response.data.status === 'ok' ? response.data.data : [];
  } catch (error) {
    return [];
  }
}

export async function fetchRole({ token, username }) {
  try {
    const response = await api2.post('role/list', {
      username,
      token
    });
    return response.data.status === 'ok' ? response.data.data : [];
  } catch (error) {
    return [];
  }
}

export async function fetchRoleDetail({ token, username, roleId }) {
  try {
    // API očekává token, username a id (jako number!)
    const payload = {
      token,
      username,
      id: typeof roleId === 'string' ? parseInt(roleId, 10) : roleId
    };

    const response = await api2.post('role/detail', payload);

    return response.data.status === 'ok' ? response.data.data : null;
  } catch (error) {
    return null;
  }
}

export async function fetchPrava({ token, username }) {
  try {
    const response = await api2.post('prava/list', {
      username,
      token
    });
    return response.data.status === 'ok' ? response.data.data : [];
  } catch (error) {
    return [];
  }
}

/**
 * Načtení aktivních uživatelů
 */
export async function fetchActiveUsers({ token, username }) {
  try {
    const response = await api2.post('user/active', {
      username,
      token
    });
    return response.data.status === 'ok' ? response.data.data : [];
  } catch (error) {
    return [];
  }
}

/**
 * Načtení aktivních uživatelů s rozšířenými statistikami
 * Vrací: objednavky (count), faktury (count), pokladna_zustatek
 */
export async function fetchActiveUsersWithStats({ token, username }) {
  try {
    const response = await api2.post('user/active-with-stats', {
      username,
      token
    });
    return response.data.status === 'ok' ? response.data.data : [];
  } catch (error) {
    console.error('[fetchActiveUsersWithStats] Error:', error);
    return [];
  }
}

/**
 * Update aktivity uživatele
 * Volá se při jakékoli akci uživatele (uložení, přihlášení, odhlášení)
 * 
 * ✅ BACKEND TOKEN AUTO-REFRESH (17.11.2025):
 * - Pokud je token blízko vypršení (zbývá < 2h), backend automaticky vygeneruje new_token
 * - new_token je vrácen v response a frontend ho automaticky uloží
 * - Uživatel NENÍ odhlášen, pokračuje transparentně v práci
 */
export async function updateUserActivity({ token, username }) {
  try {
    const response = await api2.post('user/update-activity', {
      username,
      token
    });

    if (response.data.status === 'ok') {
      return {
        success: true,
        timestamp: response.data.timestamp,
        new_token: response.data.new_token || null  // ✅ NOVÉ: Backend vrací new_token pokud potřeba refresh
      };
    }
    return { success: false, new_token: null };
  } catch (error) {
    return { success: false, new_token: null };
  }
}

/**
 * Načte jmeniny pro aktuální nebo zadané datum
 * @param {string} date - Datum ve formátu 'D.M.' (nepovinné)
 * @returns {Promise<Object>} - { status, date, name }
 */
export async function getNameday(date = null) {
  try {
    const url = date ? `nameday?date=${encodeURIComponent(date)}` : 'nameday';
    const response = await api2.get(url);
    
    if (response.data.status === 'ok') {
      return {
        success: true,
        date: response.data.date,
        name: response.data.name
      };
    }
    return { success: false, name: null };
  } catch (error) {
    return { success: false, name: null };
  }
}

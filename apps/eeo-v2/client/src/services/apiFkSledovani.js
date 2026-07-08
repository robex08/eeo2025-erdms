/**
 * API služba pro FK Sledování – Finanční kontrola: sledování případů
 * Endpointy: fk/*
 *
 * ⚠️ DŮLEŽITÉ: API očekává token a username v BODY (ne v headerech!)
 *
 * Logika entit (sentinel hodnota 0 = "neaplikuje se"):
 *   OBJ    → objednavkaId > 0,  fakturaId = 0
 *   FA     → objednavkaId = 0,  fakturaId > 0
 *   OBJ_FA → objednavkaId > 0,  fakturaId > 0
 */

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Cache and in-flight deduplication to prevent N+1 storms on large tables.
const fkCaseCache = new Map();
const fkCaseInFlight = new Map();

function getFkEntityKey({ objednavkaId = 0, fakturaId = 0 } = {}) {
  const o = Number(objednavkaId) || 0;
  const f = Number(fakturaId) || 0;
  return `${o}:${f}`;
}

function invalidateFkCaseCache(entity) {
  const key = getFkEntityKey(entity);
  fkCaseCache.delete(key);
  fkCaseInFlight.delete(key);
}

// -----------------------------------------------------------
// GET-BY-ENTITY
// -----------------------------------------------------------

/**
 * Načte případ + události pro danou entitu.
 * @param {{ objednavkaId?: number, fakturaId?: number }} entity
 * @param {string} token
 * @param {string} username
 * @returns {Promise<{case: object|null, udalosti: Array}>}
 */
export async function getFkCase({ objednavkaId = 0, fakturaId = 0 }, token, username, options = {}) {
  if (!token || !username) throw new Error('Chybí autentizační údaje');

  const forceRefresh = !!options.forceRefresh;
  const entity = { objednavkaId: objednavkaId || 0, fakturaId: fakturaId || 0 };
  const cacheKey = getFkEntityKey(entity);

  if (!forceRefresh && fkCaseCache.has(cacheKey)) {
    return fkCaseCache.get(cacheKey);
  }

  if (!forceRefresh && fkCaseInFlight.has(cacheKey)) {
    return fkCaseInFlight.get(cacheKey);
  }

  const requestPromise = api.post('/fk/get-by-entity', {
    token,
    username,
    objednavka_id: entity.objednavkaId,
    faktura_id: entity.fakturaId,
  }).then((response) => {
    // {status:'success', data: {case, udalosti} | null}
    if (response.data && response.data.status === 'success') {
      fkCaseCache.set(cacheKey, response.data.data);
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Chyba API fk/get-by-entity');
  }).finally(() => {
    fkCaseInFlight.delete(cacheKey);
  });

  fkCaseInFlight.set(cacheKey, requestPromise);
  return requestPromise;
}

// -----------------------------------------------------------
// UPSERT (lazy create / update)
// -----------------------------------------------------------

/**
 * Vytvoří nebo aktualizuje případ (lazy init – případ vznikne prvním upsert).
 * @param {{
 *   objednavkaId?: number,
 *   fakturaId?: number,
 *   entityType: 'OBJ'|'FA'|'OBJ_FA',
 *   sectionKey?: string,
 *   stav?: 'OPEN'|'IN_PROGRESS'|'RESOLVED'|'IGNORED',
 *   priorita?: 1|2|3,
 *   vyzadujeAkci?: boolean,
 *   prirazeno_user_id?: number|null
 * }} params
 * @param {string} token
 * @param {string} username
 * @returns {Promise<{case: object, udalosti: Array}>}
 */
export async function fkUpsert(
  { objednavkaId = 0, fakturaId = 0, entityType = 'OBJ', sectionKey, stav = 'OPEN', priorita = 1, vyzadujeAkci = true, prirazeno_user_id = null },
  token,
  username
) {
  if (!token || !username) throw new Error('Chybí autentizační údaje');

  const response = await api.post('/fk/upsert', {
    token,
    username,
    objednavka_id:      objednavkaId || 0,
    faktura_id:         fakturaId    || 0,
    entita_typ:         entityType,
    section_kontext:    sectionKey   || null,
    stav,
    priorita,
    vyzaduje_akci:      vyzadujeAkci ? 1 : 0,
    prirazeno_user_id:  prirazeno_user_id || null,
  });

  if (response.data && response.data.status === 'success') {
    invalidateFkCaseCache({ objednavkaId, fakturaId });
    return response.data.data; // {case, udalosti}
  }
  throw new Error(response.data?.message || 'Chyba API fk/upsert');
}

// -----------------------------------------------------------
// ADD-KOMENTAR
// -----------------------------------------------------------

/**
 * Přidá komentář k existujícímu případu.
 * @param {{ objednavkaId?: number, fakturaId?: number }} entity
 * @param {string} textZprava
 * @param {string} token
 * @param {string} username
 * @returns {Promise<{case: object, udalosti: Array}>}
 */
export async function fkAddKomentar({ objednavkaId = 0, fakturaId = 0 }, textZprava, token, username) {
  if (!token || !username) throw new Error('Chybí autentizační údaje');
  if (!textZprava || !textZprava.trim()) throw new Error('Komentář nesmí být prázdný');

  const response = await api.post('/fk/add-komentar', {
    token,
    username,
    objednavka_id: objednavkaId || 0,
    faktura_id:    fakturaId    || 0,
    text_zprava:   textZprava.trim(),
  });

  if (response.data && response.data.status === 'success') {
    invalidateFkCaseCache({ objednavkaId, fakturaId });
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Chyba API fk/add-komentar');
}

// -----------------------------------------------------------
// SET-STAV
// -----------------------------------------------------------

/**
 * Změní stav případu.
 * @param {{ objednavkaId?: number, fakturaId?: number }} entity
 * @param {'OPEN'|'IN_PROGRESS'|'RESOLVED'|'IGNORED'} stav
 * @param {string} token
 * @param {string} username
 * @returns {Promise<{case: object, udalosti: Array}>}
 */
export async function fkSetStav({ objednavkaId = 0, fakturaId = 0 }, stav, token, username) {
  if (!token || !username) throw new Error('Chybí autentizační údaje');

  const response = await api.post('/fk/set-stav', {
    token,
    username,
    objednavka_id: objednavkaId || 0,
    faktura_id:    fakturaId    || 0,
    stav,
  });

  if (response.data && response.data.status === 'success') {
    invalidateFkCaseCache({ objednavkaId, fakturaId });
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Chyba API fk/set-stav');
}

// -----------------------------------------------------------
// STAV LABELS / HELPERS (sdílené s komponentami)
// -----------------------------------------------------------

export const FK_STAV_LABELS = {
  OPEN:        'Otevřeno',
  IN_PROGRESS: 'Řeší se',
  RESOLVED:    'Vyřešeno',
  IGNORED:     'Ignorováno',
};

export const FK_STAV_COLORS = {
  OPEN:        '#e53935', // červená
  IN_PROGRESS: '#fb8c00', // oranžová
  RESOLVED:    '#43a047', // zelená
  IGNORED:     '#90a4ae', // šedá
};

export const FK_PRIORITA_LABELS = {
  1: 'Nízká',
  2: 'Střední',
  3: 'Vysoká',
};

export const FK_PRIORITA_COLORS = {
  1: '#90a4ae',
  2: '#fb8c00',
  3: '#e53935',
};

/**
 * API služba pro VEMA Kontrola & Metadata
 * Endpointy: vema-kontrola/*
 * 
 * ⚠️ DŮLEŽITÉ: API očekává token a username v BODY (ne v headerech!)
 * 
 * Vazba přes VEMA ID (firma/cfak/csml), NIKDY ne naše auto_increment ID!
 */

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo',
  headers: { 'Content-Type': 'application/json' }
});

// -----------------------------------------------------------
// Konstanty - Statusy kontroly
// -----------------------------------------------------------

export const KONTROLA_STATUS = {
  NEZKONTROLOVANO: 'nezkontrolovano',
  V_PORADKU: 'v_poradku',
  NELZE_VYRESIT: 'nelze_vyresit',
  V_RESENI: 'v_reseni',
};

export const KONTROLA_STATUS_LABELS = {
  [KONTROLA_STATUS.NEZKONTROLOVANO]: 'Nezkontrolováno',
  [KONTROLA_STATUS.V_PORADKU]: 'V pořádku',
  [KONTROLA_STATUS.NELZE_VYRESIT]: 'Nelze vyřešit',
  [KONTROLA_STATUS.V_RESENI]: 'V řešení',
};

export const KONTROLA_STATUS_COLORS = {
  [KONTROLA_STATUS.NEZKONTROLOVANO]: { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b', icon: '🔍' },
  [KONTROLA_STATUS.V_PORADKU]: { bg: '#dcfce7', border: '#22c55e', text: '#166534', icon: '✅' },
  [KONTROLA_STATUS.NELZE_VYRESIT]: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: '⛔' },
  [KONTROLA_STATUS.V_RESENI]: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: '⏳' },
};

// Kompatibilita pro staré uložené hodnoty v DB.
const LEGACY_STATUS_MAP = {
  v_kontrole: KONTROLA_STATUS.V_RESENI,
  zkontrolovano: KONTROLA_STATUS.V_PORADKU,
  ma_problem: KONTROLA_STATUS.NELZE_VYRESIT,
  pozastaveno: KONTROLA_STATUS.V_RESENI,
};

export function normalizeKontrolaStatus(status) {
  if (!status) return KONTROLA_STATUS.NEZKONTROLOVANO;
  const value = String(status).trim();
  if (KONTROLA_STATUS_LABELS[value]) return value;
  if (LEGACY_STATUS_MAP[value]) return LEGACY_STATUS_MAP[value];
  return KONTROLA_STATUS.NEZKONTROLOVANO;
}

// -----------------------------------------------------------
// Konstanty - Priority
// -----------------------------------------------------------

export const KONTROLA_PRIORITA = {
  NORMALNI: 0,
  VYSOKA: 1,
  KRITICKA: 2,
};

export const KONTROLA_PRIORITA_LABELS = {
  [KONTROLA_PRIORITA.NORMALNI]: 'Normální',
  [KONTROLA_PRIORITA.VYSOKA]: 'Vysoká',
  [KONTROLA_PRIORITA.KRITICKA]: 'Kritická',
};

export const KONTROLA_PRIORITA_COLORS = {
  [KONTROLA_PRIORITA.NORMALNI]: { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b' },
  [KONTROLA_PRIORITA.VYSOKA]: { bg: '#fed7aa', border: '#f97316', text: '#9a3412' },
  [KONTROLA_PRIORITA.KRITICKA]: { bg: '#fecaca', border: '#dc2626', text: '#991b1b' },
};

// -----------------------------------------------------------
// GET - Načíst kontrolu
// -----------------------------------------------------------

/**
 * Načte kontrolu pro konkrétní VEMA záznam
 * @param {string} typZaznamu - 'faktura' | 'firma' | 'smlouva'
 * @param {string} vemaId - VEMA ID (cfak/firma/csml)
 * @param {string|null} vemaIdSecondary - Sekundární VEMA ID (u faktury firma)
 * @param {string} token
 * @param {string} username
 * @returns {Promise<object|null>} kontrola nebo null pokud neexistuje
 */
export async function getVemaKontrola(typZaznamu, vemaId, vemaIdSecondary, token, username) {
  if (!token || !username) throw new Error('Chybí autentizační údaje');
  if (!typZaznamu || !vemaId) throw new Error('Chybí typ_zaznamu nebo vema_id');

  const response = await api.post('/vema-kontrola/get', {
    token,
    username,
    typ_zaznamu: typZaznamu,
    vema_id: String(vemaId),
    vema_id_secondary: vemaIdSecondary ? String(vemaIdSecondary) : null,
  });

  if (response.data && response.data.status === 'success') {
    return response.data.data; // null nebo objekt kontroly
  }
  throw new Error(response.data?.message || 'Chyba API vema-kontrola/get');
}

// -----------------------------------------------------------
// SAVE - Uložit/aktualizovat kontrolu
// -----------------------------------------------------------

/**
 * Vytvoří nebo aktualizuje kontrolu
 * @param {{
 *   typZaznamu: 'faktura'|'firma'|'smlouva',
 *   vemaId: string,
 *   vemaIdSecondary?: string,
 *   kontrolaStatus: string,
 *   priorita?: number,
 *   poznamka?: string,
 *   metadata?: object
 * }} params
 * @param {string} token
 * @param {string} username
 * @returns {Promise<{id: number}>}
 */
export async function saveVemaKontrola(
  { typZaznamu, vemaId, vemaIdSecondary, kontrolaStatus, priorita = 0, poznamka = '', metadata = null },
  token,
  username
) {
  if (!token || !username) throw new Error('Chybí autentizační údaje');
  if (!typZaznamu || !vemaId || !kontrolaStatus) {
    throw new Error('Chybí povinné parametry: typ_zaznamu, vema_id, kontrola_status');
  }

  const response = await api.post('/vema-kontrola/save', {
    token,
    username,
    typ_zaznamu: typZaznamu,
    vema_id: String(vemaId),
    vema_id_secondary: vemaIdSecondary ? String(vemaIdSecondary) : null,
    kontrola_status: kontrolaStatus,
    priorita: Number(priorita),
    poznamka: poznamka || '',
    metadata: metadata || null,
  });

  if (response.data && response.data.status === 'success') {
    return response.data.data; // {id: number}
  }
  throw new Error(response.data?.message || 'Chyba API vema-kontrola/save');
}

// -----------------------------------------------------------
// LIST - Seznam kontrol
// -----------------------------------------------------------

/**
 * Načte seznam kontrol s filtry
 * @param {{
 *   typZaznamu?: string,
 *   kontrolaStatus?: string,
 *   limit?: number,
 *   offset?: number
 * }} filters
 * @param {string} token
 * @param {string} username
 * @returns {Promise<Array>}
 */
export async function listVemaKontrola(filters = {}, token, username) {
  if (!token || !username) throw new Error('Chybí autentizační údaje');

  const response = await api.post('/vema-kontrola/list', {
    token,
    username,
    typ_zaznamu: filters.typZaznamu || null,
    kontrola_status: filters.kontrolaStatus || null,
    limit: filters.limit || 100,
    offset: filters.offset || 0,
  });

  if (response.data && response.data.status === 'success') {
    return response.data.data; // Array
  }
  throw new Error(response.data?.message || 'Chyba API vema-kontrola/list');
}

// -----------------------------------------------------------
// STATS - Statistiky kontrol
// -----------------------------------------------------------

/**
 * Načte statistiky kontrol seskupené dle statusu
 * @param {string|null} typZaznamu - volitelný filtr typu
 * @param {string} token
 * @param {string} username
 * @returns {Promise<Array>} [{kontrola_status, pocet}, ...]
 */
export async function statsVemaKontrola(typZaznamu = null, token, username) {
  if (!token || !username) throw new Error('Chybí autentizační údaje');

  const response = await api.post('/vema-kontrola/stats', {
    token,
    username,
    typ_zaznamu: typZaznamu || null,
  });

  if (response.data && response.data.status === 'success') {
    return response.data.data; // Array
  }
  throw new Error(response.data?.message || 'Chyba API vema-kontrola/stats');
}

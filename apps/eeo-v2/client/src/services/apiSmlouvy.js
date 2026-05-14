/**
 * API služby pro smlouvy
 * 
 * Endpointy:
 * - POST /ciselniky/smlouvy/list - seznam smluv s filtry
 * - POST /ciselniky/smlouvy/detail - detail smlouvy + objednávky + statistiky
 * - POST /ciselniky/smlouvy/insert - vytvoření smlouvy
 * - POST /ciselniky/smlouvy/update - aktualizace smlouvy
 * - POST /ciselniky/smlouvy/delete - smazání smlouvy
 * - POST /ciselniky/smlouvy/bulk-import - hromadný import z Excel/CSV
 * - POST /ciselniky/smlouvy/prepocet-cerpani - přepočet čerpání
 * 
 * @author Frontend Team
 * @date 2025-11-23
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';

const api = axios.create({
  baseURL: `${API_BASE_URL}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

const handleApiError = (error, defaultMessage = 'Chyba serveru') => {
  if (error.response) {
    const { status, data } = error.response;
    const errorMessage = data?.err || data?.error || data?.message || defaultMessage;

    switch (status) {
      case 401:
        throw new Error('Neplatný token. Přihlaste se znovu.');
      case 403:
        throw new Error('Nemáte oprávnění k této akci.');
      case 404:
        throw new Error('Záznam nebyl nalezen.');
      case 400:
        throw new Error(errorMessage);
      case 409:
        throw new Error(errorMessage); // Duplicita
      default:
        throw new Error(errorMessage);
    }
  } else if (error.request) {
    throw new Error('Server neodpovídá. Zkontrolujte připojení.');
  } else {
    throw new Error(error.message || defaultMessage);
  }
};

const checkResponse = (response, operation = 'operace') => {
  if (response.data?.err) {
    throw new Error(response.data.err);
  }
  if (response.data?.status === 'error') {
    throw new Error(response.data.message || `${operation} se nezdařila`);
  }
  if (response.data?.status !== 'ok') {
    throw new Error(`${operation} se nezdařila - neplatný status`);
  }
  return response.data;
};

// =============================================================================
// API FUNKCE
// =============================================================================

/**
 * Načte seznam smluv s filtry
 */
export async function getSmlouvyList({
  token,
  username,
  show_inactive = false,
  usek_id = null,
  druh_smlouvy = null,
  stav = null,
  search = null,
  platnost_od = null,
  platnost_do = null,
  limit = 1000,
  offset = 0,
  pouzit_v_obj_formu = null,
  include_stats = false,  // ⚡ OPTIMALIZACE: Defaultně bez statistik pro rychlejší načítání
  restrict_view = false
}) {
  try {
    const payload = {
      username,
      token,
      show_inactive,
      usek_id,
      druh_smlouvy,
      stav,
      search,
      platnost_od,
      platnost_do,
      limit,
      offset,
      pouzit_v_obj_formu,
      include_stats,  // ⚡ Statistiky jen když explicitně požadováno
      restrict_view
    };

    const response = await api.post('ciselniky/smlouvy/list', payload);
    return checkResponse(response, 'Načítání smluv');
  } catch (error) {
    handleApiError(error, 'Chyba při načítání smluv');
    throw error;
  }
}

/**
 * Načte detail smlouvy včetně objednávek a statistik
 */
export async function getSmlouvaDetail({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/smlouvy/detail', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Načítání detailu smlouvy');
    return data.data || null;
  } catch (error) {
    handleApiError(error, 'Chyba při načítání detailu smlouvy');
    throw error;
  }
}

/**
 * Vytvoří novou smlouvu
 */
export async function createSmlouva({ token, username, smlouvaData }) {
  try {
    const response = await api.post('ciselniky/smlouvy/insert', {
      username,
      token,
      ...smlouvaData
    });

    const data = checkResponse(response, 'Vytváření smlouvy');
    return data.data;
  } catch (error) {
    handleApiError(error, 'Chyba při vytváření smlouvy');
    throw error;
  }
}

/**
 * Aktualizuje existující smlouvu
 */
export async function updateSmlouva({ token, username, id, smlouvaData }) {
  try {
    const response = await api.post('ciselniky/smlouvy/update', {
      username,
      token,
      id,
      ...smlouvaData
    });

    const data = checkResponse(response, 'Aktualizace smlouvy');
    return data.data;
  } catch (error) {
    handleApiError(error, 'Chyba při aktualizaci smlouvy');
    throw error;
  }
}

/**
 * Smaže smlouvu
 */
export async function deleteSmlouva({ token, username, id }) {
  try {
    const response = await api.post('ciselniky/smlouvy/delete', {
      username,
      token,
      id
    });

    const data = checkResponse(response, 'Mazání smlouvy');
    return data.data;
  } catch (error) {
    handleApiError(error, 'Chyba při mazání smlouvy');
    throw error;
  }
}

/**
 * Hromadný import smluv z Excel/CSV
 */
export async function bulkImportSmlouvy({
  token,
  username,
  data,
  overwrite_existing = false,
  nazev_souboru = null,
  typ_souboru = null,
  velikost_souboru = null
}) {
  try {
    const response = await api.post('ciselniky/smlouvy/bulk-import', {
      username,
      token,
      data,
      overwrite_existing,
      nazev_souboru,
      typ_souboru,
      velikost_souboru
    });

    const result = checkResponse(response, 'Import smluv');
    return result.data;
  } catch (error) {
    handleApiError(error, 'Chyba při importu smluv');
    throw error;
  }
}

/**
 * Přepočítá čerpání smluv
 */
export async function prepocetCerpaniSmluv({
  token,
  username,
  cislo_smlouvy = null,
  usek_id = null
}) {
  try {
    const response = await api.post('ciselniky/smlouvy/prepocet-cerpani', {
      username,
      token,
      cislo_smlouvy,
      usek_id
    });

    const data = checkResponse(response, 'Přepočet čerpání');
    return data.data;
  } catch (error) {
    handleApiError(error, 'Chyba při přepočtu čerpání');
    throw error;
  }
}

// =============================================================================
// KONSTANTY PRO FRONTEND
// =============================================================================

/**
 * Načte druhy smluv z číselníku
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Array>} Seznam druhů smluv
 */
export const getDruhySmluv = async ({ token, username }) => {
  try {
    const response = await api.post('/ciselniky/stavy/list', {
      token,
      username,
      typ_objektu: 'DRUH_SMLOUVY'
    });

    if (response.data.status === 'ok' && response.data.data) {
      // Převod na formát pro dropdown (kod_stavu jako value, nazev_stavu jako label)
      return response.data.data.map(druh => ({
        value: druh.kod_stavu,
        label: druh.nazev_stavu,
        popis: druh.popis
      }));
    }

    return [];
  } catch (error) {
    console.error('Chyba při načítání druhů smluv:', error);
    // Fallback na základní druhy pokud API selže
    return DRUH_SMLOUVY_OPTIONS_FALLBACK;
  }
};

// Fallback hodnoty pro případ selhání API (backward compatibility)
export const DRUH_SMLOUVY_OPTIONS_FALLBACK = [
  { value: 'JINA',         label: 'Jiná smlouva' },
  { value: 'SLUZBY',       label: 'Smlouva o poskytování služeb' },
  { value: 'NAJEMNI',      label: 'Nájemní smlouva' },
  { value: 'KUPNI',        label: 'Kupní smlouva' },
  { value: 'RAMCOVA',      label: 'Rámcová smlouva' },
  { value: 'DODAVATELSKA', label: 'Dodavatelská smlouva' },
  { value: 'LICENCNI',     label: 'Licenční smlouva' },
  { value: 'PORADENSKA',   label: 'Poradenská smlouva' }
];

// Export pro backward compatibility (bude deprecated)
export const DRUH_SMLOUVY_OPTIONS = DRUH_SMLOUVY_OPTIONS_FALLBACK;

// Stavy smluv - BE vrací ENUM bez diakritiky (AKTIVNI, UKONCENA, PRERUSENA, PRIPRAVOVANA, NEAKTIVNI)
// 
// NEAKTIVNI = soft delete, smlouva existuje v DB ale není aktivní (aktivni = 0)
// PRIPRAVOVANA = smlouva vytvořená, ale platnost ještě nezačala (dnes < platnost_od)
// AKTIVNI = platná smlouva v aktuálním období (platnost_od <= dnes <= platnost_do)
// UKONCENA = smlouva vypršela (dnes > platnost_do)
// PRERUSENA = smlouva dočasně přerušena (manuální nastavení)
export const STAV_SMLOUVY_OPTIONS = [
  { value: 'AKTIVNI',      label: 'Aktivní',     color: '#10b981', icon: '✅', popis: 'Smlouva je v platnosti a lze ji používat' },
  { value: 'UKONCENA',    label: 'Ukončená',    color: '#dc2626', icon: '⛔', popis: 'Smlouva překročila datum konce platnosti' },
  { value: 'PRIPRAVOVANA',label: 'Připravovaná',color: '#f97316', icon: '⏳', popis: 'Smlouva čeká na začátek platnosti (platnost_od > dnes)' },
  { value: 'PRERUSENA',   label: 'Přerušená',   color: '#f59e0b', icon: '⏸️', popis: 'Smlouva je dočasně přerušena' },
  { value: 'NEAKTIVNI',   label: 'Neaktivní',   color: '#6b7280', icon: '🚫', popis: 'Smlouva je deaktivována (soft delete, aktivni=0)' }
];

// Helper funkce pro práci se stavy smluv
export const getStavSmlouvyConfig = (stav) => {
  return STAV_SMLOUVY_OPTIONS.find(opt => opt.value === stav) || {
    value: stav,
    label: stav,
    color: '#6b7280',
    icon: '❓'
  };
};

export const getStavSmlouvyLabel = (stav) => {
  return getStavSmlouvyConfig(stav).label;
};

export const getStavSmlouvyColor = (stav) => {
  return getStavSmlouvyConfig(stav).color;
};

export const SAZBA_DPH_OPTIONS = [
  { value: 0, label: '0% (osvobozeno)' },
  { value: 12, label: '12% (snížená)' },
  { value: 21, label: '21% (základní)' }
];

/**
 * API Service pro Roční Poplatky (Annual Fees)
 * 
 * Poskytuje funkce pro správu ročních poplatků vázaných na smlouvy.
 * - Automatické generování položek podle typu platby (měsíční 12x, kvartální 4x, roční 1x)
 * - Tracking stavů plateb pro jednotlivé položky
 * - Výpočet zůstatků a přeplatků
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

const BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

/**
 * Načte seznam ročních poplatků s filtry
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Uživatelské jméno
 * @param {Object} params.filters - Filtry (rok, druh, platba, stav, smlouva)
 * @returns {Promise<Object>} Response s daty
 */
export const getAnnualFeesList = async ({ token, username, filters = {} }) => {
  try {
    const response = await fetch(`${BASE_URL}/annual-fees/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        ...filters
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při načítání ročních poplatků');
    }

    return await response.json();
  } catch (error) {
    console.error('getAnnualFeesList error:', error);
    throw error;
  }
};

/**
 * Načte detail ročního poplatku s položkami
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.id - ID ročního poplatku
 * @returns {Promise<Object>} Detail s položkami
 */
export const getAnnualFeeDetail = async ({ token, username, id }) => {
  try {
    const response = await fetch(`${BASE_URL}/annual-fees/detail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        id
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při načítání detailu poplatku');
    }

    return await response.json();
  } catch (error) {
    console.error('getAnnualFeeDetail error:', error);
    throw error;
  }
};

/**
 * Vytvoří nový roční poplatek
 * 
 * @param {Object} data - Kompletní data ročního poplatku
 * @param {string} data.token - Auth token
 * @param {string} data.username - Uživatelské jméno
 * @param {number} data.smlouva_id - ID smlouvy
 * @param {string} data.nazev - Název poplatku
 * @param {string} data.druh - Druh poplatku (z číselníku)
 * @param {string} data.platba - Typ platby (MESICNI, KVARTALNI, ROCNI, JINA)
 * @param {number} data.celkova_castka - Celková částka
 * @param {number} data.rok - Rok poplatku
 * @param {string} data.datum_prvni_splatnosti - Datum první splatnosti
 * @param {Array} data.polozky - Pole položek (volitelné)
 * @returns {Promise<Object>} Vytvořený poplatek s položkami
 */
export const createAnnualFee = async (data) => {
  try {

    const response = await fetch(`${BASE_URL}/annual-fees/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při vytváření ročního poplatku');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('createAnnualFee error:', error);
    throw error;
  }
};

/**
 * Aktualizuje roční poplatek
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.id - ID poplatku
 * @param {Object} params.data - Data k aktualizaci
 * @returns {Promise<Object>} Aktualizovaný poplatek
 */
export const updateAnnualFee = async ({ token, username, id, data }) => {
  try {
    const response = await fetch(`${BASE_URL}/annual-fees/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        id,
        ...data
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při aktualizaci ročního poplatku');
    }

    return await response.json();
  } catch (error) {
    console.error('updateAnnualFee error:', error);
    throw error;
  }
};

/**
 * Aktualizuje položku ročního poplatku
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.id - ID položky
 * @param {Object} params.data - Data k aktualizaci (stav, castka, poznamka)
 * @returns {Promise<Object>} Aktualizovaná položka + přepočtený header
 */
export const updateAnnualFeeItem = async ({ token, username, id, data }) => {
  try {
    const response = await fetch(`${BASE_URL}/annual-fees/update-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        id,
        ...data
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při aktualizaci položky');
    }

    return await response.json();
  } catch (error) {
    console.error('updateAnnualFeeItem error:', error);
    throw error;
  }
};

/**
 * Vytvoří novou manuální položku k existujícímu ročnímu poplatku
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.rocni_poplatek_id - ID ročního poplatku
 * @param {string} params.nazev_polozky - Název položky
 * @param {string} params.datum_splatnosti - Datum splatnosti (YYYY-MM-DD)
 * @param {number} params.castka - Částka
 * @param {number} params.faktura_id - ID faktury (volitelné)
 * @param {string} params.poznamka - Poznámka (volitelné)
 * @returns {Promise<Object>} Vytvořená položka
 */
export const createAnnualFeeItem = async ({ token, username, rocni_poplatek_id, nazev_polozky, datum_splatnosti, castka, faktura_id = null, poznamka = null }) => {
  try {
    const response = await fetch(`${BASE_URL}/annual-fees/create-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        rocni_poplatek_id,
        nazev_polozky,
        datum_splatnosti,
        castka,
        faktura_id,
        poznamka
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při vytváření položky');
    }

    return await response.json();
  } catch (error) {
    console.error('createAnnualFeeItem error:', error);
    throw error;
  }
};

/**
 * Smaže roční poplatek (soft delete)
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.id - ID poplatku
 * @returns {Promise<Object>} Response
 */
export const deleteAnnualFee = async ({ token, username, id }) => {
  try {
    const response = await fetch(`${BASE_URL}/annual-fees/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        id
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při mazání ročního poplatku');
    }

    return await response.json();
  } catch (error) {
    console.error('deleteAnnualFee error:', error);
    throw error;
  }
};

/**
 * Načte statistiky ročních poplatků
 * 
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.rok - Rok (volitelné)
 * @returns {Promise<Object>} Statistiky
 */
export const getAnnualFeesStats = async ({ token, username, rok }) => {
  try {
    const response = await fetch(`${BASE_URL}/annual-fees/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        rok
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při načítání statistik');
    }

    return await response.json();
  } catch (error) {
    console.error('getAnnualFeesStats error:', error);
    throw error;
  }
};

/**
 * Načte číselník druhů ročních poplatků
 */
export const getDruhyRocnichPoplatku = async ({ token, username }) => {
  try {
    const response = await fetch(`${BASE_URL}/ciselniky/annual-fees-druhy/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username
      }),
    });

    if (!response.ok) {
      throw new Error('Chyba při načítání druhů poplatků');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('getDruhyRocnichPoplatku error:', error);
    return [];
  }
};

/**
 * Načte číselník typů plateb ročních poplatků
 */
export const getPlatbyRocnichPoplatku = async ({ token, username }) => {
  try {
    const response = await fetch(`${BASE_URL}/ciselniky/annual-fees-platby/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username
      }),
    });

    if (!response.ok) {
      throw new Error('Chyba při načítání typů plateb');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('getPlatbyRocnichPoplatku error:', error);
    return [];
  }
};

/**
 * Načte číselník stavů ročních poplatků
 */
export const getStavyRocnichPoplatku = async ({ token, username }) => {
  try {
    const response = await fetch(`${BASE_URL}/ciselniky/annual-fees-stavy/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username
      }),
    });

    if (!response.ok) {
      throw new Error('Chyba při načítání stavů');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('getStavyRocnichPoplatku error:', error);
    return [];
  }
};

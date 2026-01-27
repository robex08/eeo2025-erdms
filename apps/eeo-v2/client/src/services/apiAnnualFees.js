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

const BASE_URL = '/api.eeo';

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
 * @param {Object} params - Parametry
 * @param {string} params.token - Auth token
 * @param {string} params.username - Uživatelské jméno
 * @param {number} params.smlouva_id - ID smlouvy
 * @param {string} params.nazev - Název poplatku
 * @param {string} params.druh - Druh poplatku (z číselníku)
 * @param {string} params.platba - Typ platby (MESICNI, KVARTALNI, ROCNI, JINA)
 * @param {number} params.castka - Částka bez DPH
 * @param {number} params.rok - Rok poplatku
 * @returns {Promise<Object>} Vytvořený poplatek s položkami
 */
export const createAnnualFee = async ({ token, username, smlouva_id, nazev, druh, platba, castka, rok }) => {
  try {
    const response = await fetch(`${BASE_URL}/annual-fees/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        smlouva_id,
        nazev,
        druh,
        platba,
        castka,
        rok: rok || new Date().getFullYear()
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Chyba při vytváření ročního poplatku');
    }

    return await response.json();
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

/**
 * 🔐 USER IMPERSONATION SERVICE
 * Správa user impersonation (přepínání mezi uživateli pro SUPERADMIN/ADMINISTRATOR)
 * 
 * Funkce:
 * - startImpersonation() - Přepne na cílového uživatele
 * - stopImpersonation() - Vrátí zpět na původního admina
 * - isImpersonating() - Kontrola zda je aktivní impersonation
 * - getImpersonationState() - Načte aktuální stav z localStorage
 * - saveImpersonationState() - Uloží stav do localStorage
 * - clearImpersonationState() - Vyčistí localStorage
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

// LocalStorage keys
const STORAGE_KEYS = {
  ACTIVE: 'impersonation_active',
  ORIGINAL_USER: 'impersonation_original_user',
  TARGET_USER_ID: 'impersonation_target_user_id',
  STARTED_AT: 'impersonation_started_at'
};

/**
 * 🎯 Zahájit impersonation - přepnout se na cílového uživatele
 * @param {number} targetUserId - ID uživatele, na kterého se chceme přepnout
 * @param {string} token - Aktuální admin token
 * @param {string} username - Aktuální admin username
 * @returns {Promise<object>} - {success: boolean, data: {id, username, token, userDetail}, message: string}
 */
export const startImpersonation = async (targetUserId, token, username) => {
  try {
    // Validace vstupů
    if (!targetUserId || !token || !username) {
      throw new Error('Chybějící požadované parametry pro impersonation');
    }

    // API request
    const response = await axios.post(
      `${API_BASE_URL}/impersonation/start`,
      {
        target_user_id: targetUserId,
        token,
        username
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15s timeout
      }
    );

    // Kontrola úspěšné odpovědi
    if (response.data?.status !== 'success' || !response.data?.data) {
      throw new Error(response.data?.message || 'Neplatná odpověď od serveru');
    }

    const { data } = response.data;

    // Uložit původní admin data před přepnutím
    const originalUser = {
      id: data.impersonated_by_admin_id, // Backend vrací admin ID
      username, // Původní admin username
      token // Původní admin token
    };

    // Uložit stav impersonation do localStorage
    saveImpersonationState({
      active: true,
      originalUser,
      targetUserId: data.id, // ID cílového uživatele
      startedAt: Date.now()
    });

    return {
      success: true,
      data: {
        id: data.id,
        username: data.username,
        token: data.token, // Nový token pro cílového uživatele
        userDetail: data.userDetail
      },
      message: `Přepnuto na uživatele ${data.username}`
    };

  } catch (error) {
    console.error('❌ Chyba při zahájení impersonation:', error);

    // Detailní error handling
    if (error.response) {
      // Server odpověděl s error kódem
      const status = error.response.status;
      const message = error.response.data?.message || 'Neznámá chyba';

      if (status === 403) {
        return {
          success: false,
          message: 'Nemáte oprávnění k této operaci nebo je funkce vypnuta'
        };
      } else if (status === 404) {
        return {
          success: false,
          message: 'Uživatel nenalezen'
        };
      } else if (status === 400) {
        return {
          success: false,
          message: message || 'Neplatný požadavek'
        };
      } else {
        return {
          success: false,
          message: `Chyba serveru: ${message}`
        };
      }
    } else if (error.request) {
      // Request byl odeslán, ale žádná odpověď
      return {
        success: false,
        message: 'Server neodpovídá. Zkuste to prosím později.'
      };
    } else {
      // Chyba při sestavování requestu
      return {
        success: false,
        message: error.message || 'Neočekávaná chyba při zahájení impersonation'
      };
    }
  }
};

/**
 * 🔙 Ukončit impersonation - vrátit se zpět na původního admina
 * @param {string} originalToken - Původní admin token (z localStorage)
 * @param {string} originalUsername - Původní admin username (z localStorage)
 * @returns {Promise<object>} - {success: boolean, data: {id, username, token, userDetail}, message: string}
 */
export const stopImpersonation = async (originalToken, originalUsername) => {
  try {
    // Validace vstupů
    if (!originalToken || !originalUsername) {
      throw new Error('Chybějící původní admin credentials');
    }

    // API request
    const response = await axios.post(
      `${API_BASE_URL}/impersonation/stop`,
      {
        original_token: originalToken,
        original_username: originalUsername
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15s timeout
      }
    );

    // Kontrola úspěšné odpovědi
    if (response.data?.status !== 'success' || !response.data?.data) {
      throw new Error(response.data?.message || 'Neplatná odpověď od serveru');
    }

    const { data } = response.data;

    // Vyčistit impersonation state z localStorage
    clearImpersonationState();

    if (process.env.NODE_ENV === 'development') {
      console.log('🔙 Impersonation stopped, vráceno na:', data.username);
    }

    return {
      success: true,
      data: {
        id: data.id,
        username: data.username,
        token: data.token, // Obnovený admin token
        userDetail: data.userDetail
      },
      message: `Vráceno na původní účet ${data.username}`
    };

  } catch (error) {
    console.error('❌ Chyba při ukončení impersonation:', error);

    // Detailní error handling
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Neznámá chyba';

      if (status === 401 || status === 403) {
        // Token je neplatný - vyčistit localStorage a vrátit error
        clearImpersonationState();
        return {
          success: false,
          message: 'Neplatný token - prosím přihlaste se znovu'
        };
      } else {
        return {
          success: false,
          message: `Chyba serveru: ${message}`
        };
      }
    } else if (error.request) {
      return {
        success: false,
        message: 'Server neodpovídá. Zkuste to prosím později.'
      };
    } else {
      return {
        success: false,
        message: error.message || 'Neočekávaná chyba při ukončení impersonation'
      };
    }
  }
};

/**
 * ✅ Zkontrolovat, zda je aktivní impersonation
 * @returns {boolean} - true pokud je aktivní impersonation
 */
export const isImpersonating = () => {
  try {
    const active = localStorage.getItem(STORAGE_KEYS.ACTIVE);
    return active === 'true';
  } catch (error) {
    console.error('❌ Chyba při kontrole impersonation state:', error);
    return false;
  }
};

/**
 * 📥 Načíst aktuální stav impersonation z localStorage
 * @returns {object|null} - {active, originalUser, targetUserId, startedAt} nebo null
 */
export const getImpersonationState = () => {
  try {
    const active = localStorage.getItem(STORAGE_KEYS.ACTIVE) === 'true';
    
    if (!active) {
      return null;
    }

    const originalUserJson = localStorage.getItem(STORAGE_KEYS.ORIGINAL_USER);
    const targetUserId = localStorage.getItem(STORAGE_KEYS.TARGET_USER_ID);
    const startedAt = localStorage.getItem(STORAGE_KEYS.STARTED_AT);

    // Validace existence všech potřebných dat
    if (!originalUserJson || !targetUserId || !startedAt) {
      console.warn('⚠️ Neúplný impersonation state v localStorage - čištění');
      clearImpersonationState();
      return null;
    }

    const originalUser = JSON.parse(originalUserJson);

    return {
      active: true,
      originalUser,
      targetUserId: parseInt(targetUserId, 10),
      startedAt: parseInt(startedAt, 10)
    };

  } catch (error) {
    console.error('❌ Chyba při načítání impersonation state:', error);
    clearImpersonationState(); // Vyčistit poškozená data
    return null;
  }
};

/**
 * 💾 Uložit stav impersonation do localStorage
 * @param {object} state - {active, originalUser, targetUserId, startedAt}
 */
export const saveImpersonationState = (state) => {
  try {
    if (!state || typeof state !== 'object') {
      throw new Error('Neplatný state objekt');
    }

    localStorage.setItem(STORAGE_KEYS.ACTIVE, state.active ? 'true' : 'false');
    
    if (state.active) {
      // Uložit pouze pokud je active = true
      if (state.originalUser) {
        localStorage.setItem(STORAGE_KEYS.ORIGINAL_USER, JSON.stringify(state.originalUser));
      }
      if (state.targetUserId) {
        localStorage.setItem(STORAGE_KEYS.TARGET_USER_ID, state.targetUserId.toString());
      }
      if (state.startedAt) {
        localStorage.setItem(STORAGE_KEYS.STARTED_AT, state.startedAt.toString());
      }
    } else {
      // Pokud active = false, vyčistit všechny klíče
      clearImpersonationState();
    }

  } catch (error) {
    console.error('❌ Chyba při ukládání impersonation state:', error);
  }
};

/**
 * 🧹 Vyčistit impersonation state z localStorage
 */
export const clearImpersonationState = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Impersonation state cleared from localStorage');
    }
  } catch (error) {
    console.error('❌ Chyba při čištění impersonation state:', error);
  }
};

/**
 * 🕐 Získat čas od zahájení impersonation
 * @returns {number|null} - Počet minut od zahájení, nebo null pokud není aktivní
 */
export const getImpersonationDuration = () => {
  try {
    const state = getImpersonationState();
    if (!state || !state.startedAt) {
      return null;
    }

    const durationMs = Date.now() - state.startedAt;
    const durationMinutes = Math.floor(durationMs / 60000);
    
    return durationMinutes;
  } catch (error) {
    console.error('❌ Chyba při výpočtu impersonation duration:', error);
    return null;
  }
};

/**
 * ⚠️ Validovat stav impersonation - zkontrolovat konzistenci
 * @returns {boolean} - true pokud je state validní
 */
export const validateImpersonationState = () => {
  try {
    const state = getImpersonationState();
    
    if (!state) {
      return true; // Žádný impersonation = validní stav
    }

    // Kontrola všech povinných polí
    const hasAllFields = 
      state.originalUser &&
      state.originalUser.id &&
      state.originalUser.username &&
      state.originalUser.token &&
      state.targetUserId &&
      state.startedAt;

    if (!hasAllFields) {
      console.warn('⚠️ Neplatný impersonation state - chybí povinná pole');
      return false;
    }

    // Kontrola timeout (24 hodin max)
    const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hodin
    const durationMs = Date.now() - state.startedAt;
    
    if (durationMs > MAX_DURATION_MS) {
      console.warn('⚠️ Impersonation session vypršela (>24h)');
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ Chyba při validaci impersonation state:', error);
    return false;
  }
};

export default {
  startImpersonation,
  stopImpersonation,
  isImpersonating,
  getImpersonationState,
  saveImpersonationState,
  clearImpersonationState,
  getImpersonationDuration,
  validateImpersonationState
};

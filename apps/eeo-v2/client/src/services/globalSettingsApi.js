/**
 * API služba pro globální nastavení systému
 * Pattern: POST s token a username v body (jako OrderV2)
 */

const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');

/**
 * Načte všechna globální nastavení
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Objekt s nastaveními
 */
export const getGlobalSettings = async (token, username) => {
  try {
    const response = await fetch(`${API_BASE_URL}/global-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        username,
        operation: 'get'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const data = result.data || result;
    
    return data;
    
  } catch (error) {
    console.error('Chyba při načítání globálního nastavení:', error);
    throw error;
  }
};

/**
 * Načte všechna globální nastavení PRO ZOBRAZENÍ (s obsahem z notifikace)
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Objekt s nastaveními
 */
export const getGlobalSettingsForDisplay = async (token, username) => {
  try {
    const response = await fetch(`${API_BASE_URL}/global-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        username,
        operation: 'get',
        for_display: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const data = result.data || result;
    
    return data;
    
  } catch (error) {
    console.error('Chyba při načítání globálního nastavení pro zobrazení:', error);
    throw error;
  }
};

/**
 * Uloží globální nastavení
 * @param {Object} settings - Objekt s nastaveními k uložení
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response z API
 */
export const saveGlobalSettings = async (settings, token, username) => {
  try {
    const payload = {
      token,
      username,
      operation: 'save',
      settings
    };
    
    console.group('💾 SAVE GLOBAL SETTINGS');
    console.log('Settings to save:', settings);
    console.log('Full payload:', payload);
    console.groupEnd();
    
    const response = await fetch(`${API_BASE_URL}/global-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error('Chyba při ukládání globálního nastavení:', error);
    throw error;
  }
};

/**
 * Načte údržbovou zprávu (dostupné pro všechny přihlášené uživatele)
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<string>} Údržbová zpráva
 */
export const getMaintenanceMessage = async (token, username) => {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        username
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.message || 'Systém je momentálně v údržbě. Omlouváme se za komplikace.';
    
  } catch (error) {
    console.error('Chyba při načítání údržbové zprávy:', error);
    throw error;
  }
};

/**
 * Načte jedno konkrétní nastavení podle klíče
 * @param {string} key - Klíč nastavení
 * @returns {Promise<any>} Hodnota nastavení
 */
export const getSingleSetting = async (key) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/global-settings/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.value;
    
  } catch (error) {
    console.error(`Chyba při načítání nastavení ${key}:`, error);
    throw error;
  }
};

/**
 * Zkontroluje, zda je aktivní maintenance mode
 * @returns {Promise<boolean>} True pokud je údržba aktivní
 */
export const checkMaintenanceMode = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Pokud endpoint neexistuje nebo je nedostupný, vrať false
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('Maintenance check endpoint not found (404)');
      } else {
        console.warn('Maintenance check failed with status:', response.status);
      }
      return false;
    }
    
    // Zkontroluj, zda je odpověď JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Maintenance check: Response is not JSON, got:', contentType);
      return false;
    }
    
    const data = await response.json();
    return data.maintenance_mode === true || data.maintenance_mode === 1;
    
  } catch (error) {
    // Tichá chyba - maintenance check by neměl blokovat aplikaci
    console.debug('Chyba při kontrole maintenance mode:', error.message);
    return false;
  }
};

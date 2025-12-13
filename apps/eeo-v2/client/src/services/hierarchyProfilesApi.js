/**
 * API služba pro práci s profily hierarchie
 * Pattern: POST s token a username v body
 */

const API_BASE_URL = (process.env.REACT_APP_API2_BASE_URL || '/api.eeo').replace(/\/$/, '');

/**
 * Načte seznam všech profilů hierarchie
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Array>} Seznam profilů
 */
export const getHierarchyProfiles = async (token, username) => {
  try {
    const response = await fetch(`${API_BASE_URL}/hierarchy/profiles/list`, {
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
    
    if (!result.success) {
      throw new Error(result.error || 'Chyba při načítání profilů');
    }
    
    return result.data || [];
    
  } catch (error) {
    console.error('Chyba při načítání profilů hierarchie:', error);
    throw error;
  }
};

/**
 * Toggle aktivního stavu profilu (enable/disable)
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {number} profileId - ID profilu
 * @param {boolean} isActive - Nový stav (true = aktivní, false = neaktivní)
 * @returns {Promise<Object>} Response z API
 */
export const setProfileActive = async (token, username, profileId, isActive) => {
  try {
    const response = await fetch(`${API_BASE_URL}/hierarchy/profiles/toggle-active`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        username,
        profile_id: profileId,
        is_active: isActive ? 1 : 0
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Chyba při změně stavu profilu');
    }
    
    return result;
    
  } catch (error) {
    console.error('Chyba při změně stavu profilu:', error);
    throw error;
  }
};

/**
 * Nastaví aktivní profil hierarchie (starý endpoint - možná deprecated)
 * @param {number} profileId - ID profilu k aktivaci
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object>} Response z API
 */
export const setActiveProfile = async (profileId, token, username) => {
  try {
    const response = await fetch(`${API_BASE_URL}/hierarchy/profiles/set-active`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        username,
        profile_id: profileId
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Chyba při aktivaci profilu');
    }
    
    return result;
    
  } catch (error) {
    console.error('Chyba při aktivaci profilu hierarchie:', error);
    throw error;
  }
};

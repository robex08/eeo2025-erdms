/**
 * Hierarchy Order Service - Frontend služba pro hierarchii objednávek
 * 
 * Poskytuje funkce pro kontrolu hierarchického řízení viditelnosti objednávek.
 * Backend aplikuje filtrace automaticky v API, frontend pouze zobrazuje info.
 * 
 * @author GitHub Copilot & robex08
 * @date 13. prosince 2025
 * @version 1.0
 */

import { API_BASE_URL, API_VERSION } from '../config/api';

/**
 * Načte nastavení hierarchie z global_settings
 * 
 * @param {string} token Auth token
 * @param {string} username Username
 * @returns {Promise<{enabled: boolean, profile_id: number|null, logic: string}>}
 */
export const getHierarchySettings = async (token, username) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${API_VERSION}/global-settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'ok' && data.data) {
      return {
        enabled: Boolean(data.data.hierarchy_enabled),
        profile_id: data.data.hierarchy_profile_id || null,
        logic: data.data.hierarchy_logic || 'OR'
      };
    }
    
    // Fallback - hierarchie vypnuta
    return {
      enabled: false,
      profile_id: null,
      logic: 'OR'
    };
    
  } catch (error) {
    console.error('❌ Chyba při načítání nastavení hierarchie:', error);
    
    // V případě chyby vrátit safe default (vypnuto)
    return {
      enabled: false,
      profile_id: null,
      logic: 'OR'
    };
  }
};

/**
 * Zkontroluje, zda má uživatel právo HIERARCHY_IMMUNE
 * 
 * @param {number} userId User ID
 * @param {string} token Auth token
 * @param {string} username Username
 * @returns {Promise<boolean>}
 */
export const checkUserHierarchyImmunity = async (userId, token, username) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${API_VERSION}/user/${userId}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      // Pokud endpoint neexistuje nebo chyba, předpokládáme že NENÍ immune
      console.warn('⚠️ Endpoint pro kontrolu oprávnění není dostupný');
      return false;
    }
    
    const data = await response.json();
    
    if (data.status === 'ok' && Array.isArray(data.permissions)) {
      // Zkontroluj, zda je v seznamu HIERARCHY_IMMUNE
      return data.permissions.some(perm => 
        perm === 'HIERARCHY_IMMUNE' || 
        perm.kod_prava === 'HIERARCHY_IMMUNE' ||
        perm.code === 'HIERARCHY_IMMUNE'
      );
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Chyba při kontrole HIERARCHY_IMMUNE:', error);
    return false;
  }
};

/**
 * Zkontroluje, zda může uživatel vidět konkrétní objednávku
 * (Frontend check - backend provádí autoritativní kontrolu)
 * 
 * POZNÁMKA: Tato funkce je pouze indikativní! 
 * Backend provádí skutečnou kontrolu při načítání objednávky.
 * 
 * @param {number} orderId Order ID
 * @param {number} userId User ID
 * @param {string} token Auth token
 * @param {string} username Username
 * @returns {Promise<{canView: boolean, reason?: string}>}
 */
export const checkOrderVisibility = async (orderId, userId, token, username) => {
  // Frontend nemá dostatek informací pro plnou kontrolu
  // Spoléháme na backend - pokud API vrátí 403, objednávka není viditelná
  
  try {
    // Zkus načíst objednávku - pokud projde, je viditelná
    const response = await fetch(`${API_BASE_URL}/${API_VERSION}/order-v2/${orderId}?token=${token}&username=${username}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 403) {
      // Backend zamítl přístup
      return {
        canView: false,
        reason: 'hierarchy_restriction'
      };
    }
    
    if (response.status === 404) {
      return {
        canView: false,
        reason: 'not_found'
      };
    }
    
    if (!response.ok) {
      return {
        canView: false,
        reason: 'error'
      };
    }
    
    return {
      canView: true
    };
    
  } catch (error) {
    console.error('❌ Chyba při kontrole viditelnosti objednávky:', error);
    return {
      canView: false,
      reason: 'error'
    };
  }
};

/**
 * Získá informaci o aktivním profilu hierarchie
 * 
 * @param {string} token Auth token
 * @param {string} username Username
 * @returns {Promise<{id: number, name: string}|null>}
 */
export const getActiveHierarchyProfile = async (token, username) => {
  try {
    const settings = await getHierarchySettings(token, username);
    
    if (!settings.enabled || !settings.profile_id) {
      return null;
    }
    
    // Načti detail profilu
    const { getHierarchyProfiles } = await import('./hierarchyProfilesApi');
    const profiles = await getHierarchyProfiles(token, username);
    
    const activeProfile = profiles.find(p => p.id === settings.profile_id);
    
    return activeProfile || null;
    
  } catch (error) {
    console.error('❌ Chyba při načítání aktivního profilu hierarchie:', error);
    return null;
  }
};

/**
 * Získá popisný text pro logiku hierarchie
 * 
 * @param {string} logic 'OR' nebo 'AND'
 * @returns {string}
 */
export const getHierarchyLogicDescription = (logic) => {
  if (logic === 'AND') {
    return 'Restriktivní (A ZÁROVEŇ) - uživatel musí splňovat všechny úrovně hierarchie současně';
  }
  
  return 'Liberální (NEBO) - uživatel vidí data pokud splňuje alespoň jednu úroveň hierarchie';
};

/**
 * Zkontroluje stav hierarchie pro aktuálního uživatele
 * Vrací kompletní informace pro zobrazení v UI
 * 
 * @param {number} userId User ID
 * @param {string} token Auth token
 * @param {string} username Username
 * @returns {Promise<{
 *   hierarchyEnabled: boolean,
 *   isImmune: boolean,
 *   profileId: number|null,
 *   profileName: string|null,
 *   logic: string,
 *   logicDescription: string
 * }>}
 */
export const getHierarchyStatus = async (userId, token, username) => {
  try {
    const [settings, isImmune, activeProfile] = await Promise.all([
      getHierarchySettings(token, username),
      checkUserHierarchyImmunity(userId, token, username),
      getActiveHierarchyProfile(token, username)
    ]);
    
    return {
      hierarchyEnabled: settings.enabled,
      isImmune: isImmune,
      profileId: settings.profile_id,
      profileName: activeProfile?.name || null,
      logic: settings.logic,
      logicDescription: getHierarchyLogicDescription(settings.logic)
    };
    
  } catch (error) {
    console.error('❌ Chyba při načítání stavu hierarchie:', error);
    
    // Safe fallback
    return {
      hierarchyEnabled: false,
      isImmune: false,
      profileId: null,
      profileName: null,
      logic: 'OR',
      logicDescription: getHierarchyLogicDescription('OR')
    };
  }
};

export default {
  getHierarchySettings,
  checkUserHierarchyImmunity,
  checkOrderVisibility,
  getActiveHierarchyProfile,
  getHierarchyLogicDescription,
  getHierarchyStatus
};

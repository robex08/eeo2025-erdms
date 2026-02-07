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

import { getGlobalSettings } from './globalSettingsApi';

/**
 * Načte nastavení hierarchie z global_settings
 * 
 * @param {string} token Auth token
 * @param {string} username Username
 * @returns {Promise<{enabled: boolean, profile_id: number|null, logic: string}>}
 */
export const getHierarchySettings = async (token, username) => {
  try {
    const settings = await getGlobalSettings(token, username);
    
    return {
      enabled: Boolean(settings.hierarchy_enabled),
      profile_id: settings.hierarchy_profile_id || null,
      logic: settings.hierarchy_logic || 'OR'
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
 * Načte stav hierarchie pro uživatele (alias pro getHierarchySettings)
 * 
 * @param {number} userId User ID (nepoužíváno, zachováno pro BC)
 * @param {string} token Auth token
 * @param {string} username Username
 * @returns {Promise<{enabled: boolean, profile_id: number|null, logic: string}>}
 */
export const getHierarchyStatus = async (userId, token, username) => {
  return await getHierarchySettings(token, username);
};

/**
 * Zkontroluje, zda má uživatel právo HIERARCHY_IMMUNE
 * 
 * @deprecated Backend kontroluje HIERARCHY_IMMUNE automaticky
 * @param {number} userId User ID
 * @param {string} token Auth token
 * @param {string} username Username
 * @returns {Promise<boolean>}
 */
export const checkUserHierarchyImmunity = async (userId, token, username) => {
  // Backend kontroluje automaticky - vracíme false (bezpečný default)
  console.warn('⚠️ checkUserHierarchyImmunity je deprecated - backend kontroluje automaticky');
  return false;
};

/**
 * Zkontroluje, zda může uživatel vidět konkrétní objednávku
 * 
 * @deprecated Backend kontroluje automaticky při GET /order-v2/{id}
 * @param {number} orderId Order ID
 * @param {number} userId User ID
 * @param {string} token Auth token
 * @param {string} username Username
 * @returns {Promise<{canView: boolean, reason?: string}>}
 */
export const checkOrderVisibility = async (orderId, userId, token, username) => {
  // Backend kontroluje automaticky při GET request
  console.warn('⚠️ checkOrderVisibility je deprecated - backend kontroluje automaticky');
  return { canView: true, reason: 'Backend kontroluje automaticky' };
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

export default {
  getHierarchySettings,
  getHierarchyStatus,
  checkUserHierarchyImmunity,
  checkOrderVisibility,
  getHierarchyLogicDescription
};

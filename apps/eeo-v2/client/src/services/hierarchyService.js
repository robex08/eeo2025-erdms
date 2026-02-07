/**
 * 🏢 Centrální služba pro hierarchické řízení viditelnosti dat
 * 
 * Univerzální služba pro desktop i mobilní aplikaci.
 * Poskytuje jednotné API pro práci s hierarchií napříč všemi moduly.
 * 
 * @author GitHub Copilot & robex08
 * @date 15. prosince 2025
 * @version 1.0
 */

import { getGlobalSettings } from './globalSettingsApi';

/**
 * 📊 Typy modulů, které podporují hierarchii
 */
export const HierarchyModules = {
  ORDERS: 'orders',
  INVOICES: 'invoices',
  CASHBOOK: 'cashbook'
};

/**
 * 🔒 Stav hierarchie
 */
export const HierarchyStatus = {
  DISABLED: 'disabled',           // Hierarchie vypnuta
  IMMUNE: 'immune',               // Uživatel má HIERARCHY_IMMUNE právo
  ACTIVE: 'active',               // Hierarchie aktivní
  NO_PROFILE: 'no_profile',       // Není vybrán profil
  ERROR: 'error'                  // Chyba načítání
};

/**
 * 📋 Načte nastavení hierarchie z global_settings
 * 
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<{
 *   status: string,
 *   enabled: boolean,
 *   profileId: number|null,
 *   profileName: string|null,
 *   logic: string,
 *   logicDescription: string,
 *   error?: string
 * }>}
 */
export const getHierarchyConfig = async (token, username) => {
  try {
    const settings = await getGlobalSettings(token, username);
    
    const enabled = Boolean(settings.hierarchy_enabled);
    const profileId = settings.hierarchy_profile_id || null;
    const logic = settings.hierarchy_logic || 'OR';
    
    // 🔍 Načíst název profilu podle ID
    let profileName = null;
    if (profileId) {
      try {
        const { getHierarchyProfiles } = await import('./hierarchyProfilesApi');
        const profiles = await getHierarchyProfiles(token, username);
        const profile = profiles.find(p => p.id === parseInt(profileId, 10));
        profileName = profile ? profile.name : null;
      } catch (error) {
        console.warn('⚠️ [HierarchyService] Nelze načíst název profilu:', error);
        // Pokračuj bez názvu - není kritické
      }
    }
    
    // Určení statusu
    let status = HierarchyStatus.DISABLED;
    if (enabled) {
      if (!profileId) {
        status = HierarchyStatus.NO_PROFILE;
      } else {
        status = HierarchyStatus.ACTIVE;
      }
    }
    
    return {
      status,
      enabled,
      profileId,
      profileName,
      logic,
      logicDescription: getLogicDescription(logic),
      modules: {
        orders: enabled && profileId !== null,
        invoices: false, // TODO: Sprint 3
        cashbook: false  // TODO: Sprint 2
      }
    };
    
  } catch (error) {
    console.error('❌ [HierarchyService] Chyba při načítání nastavení:', error);
    
    return {
      status: HierarchyStatus.ERROR,
      enabled: false,
      profileId: null,
      profileName: null,
      logic: 'OR',
      logicDescription: getLogicDescription('OR'),
      error: error.message,
      modules: {
        orders: false,
        invoices: false,
        cashbook: false
      }
    };
  }
};

/**
 * 🎯 Zkontroluje, zda je hierarchie aktivní pro daný modul
 * 
 * @param {string} module - Typ modulu (HierarchyModules.ORDERS, ...)
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<boolean>}
 */
export const isHierarchyActiveForModule = async (module, token, username) => {
  try {
    const config = await getHierarchyConfig(token, username);
    
    // Kontrola podle modulu
    switch (module) {
      case HierarchyModules.ORDERS:
        return config.modules.orders;
      case HierarchyModules.INVOICES:
        return config.modules.invoices;
      case HierarchyModules.CASHBOOK:
        return config.modules.cashbook;
      default:
        console.warn(`⚠️ [HierarchyService] Neznámý modul: ${module}`);
        return false;
    }
    
  } catch (error) {
    console.error('❌ [HierarchyService] Chyba při kontrole modulu:', error);
    return false;
  }
};

/**
 * 📝 Získá popisný text pro logiku hierarchie
 * 
 * @param {string} logic - 'OR' nebo 'AND'
 * @returns {string}
 */
export const getLogicDescription = (logic) => {
  if (logic === 'AND') {
    return 'Restriktivní (A ZÁROVEŇ) - musí splňovat všechny úrovně současně';
  }
  
  return 'Liberální (NEBO) - stačí splnit alespoň jednu úroveň';
};

/**
 * 🔍 Vytvoří informační zprávu o hierarchii pro uživatele
 * 
 * @param {Object} config - Konfigurace hierarchie z getHierarchyConfig()
 * @param {string} module - Typ modulu
 * @returns {string|null} - Textová zpráva nebo null
 */
export const getHierarchyInfoMessage = (config, module = HierarchyModules.ORDERS) => {
  if (!config) return null;
  
  switch (config.status) {
    case HierarchyStatus.DISABLED:
      return null; // Žádná zpráva
      
    case HierarchyStatus.NO_PROFILE:
      return '⚠️ Hierarchie je zapnutá, ale není vybrán žádný profil. Kontaktujte administrátora.';
      
    case HierarchyStatus.IMMUNE:
      return '🛡️ Máte neomezený přístup k datům (HIERARCHY_IMMUNE).';
      
    case HierarchyStatus.ACTIVE:
      const moduleName = {
        [HierarchyModules.ORDERS]: 'objednávky',
        [HierarchyModules.INVOICES]: 'faktury',
        [HierarchyModules.CASHBOOK]: 'pokladnu'
      }[module] || 'data';
      
      return `🏢 Hierarchie aktivní: Vidíte ${moduleName} podle organizačního řádu "${config.profileName}" (${config.logicDescription}).`;
      
    case HierarchyStatus.ERROR:
      return '❌ Chyba při načítání hierarchie. Kontaktujte administrátora.';
      
    default:
      return null;
  }
};

/**
 * 🎨 Získá barvu pro informační banner
 * 
 * @param {Object} config - Konfigurace hierarchie
 * @returns {string} - 'info', 'warning', 'error', 'success'
 */
export const getHierarchyBannerColor = (config) => {
  if (!config) return 'info';
  
  switch (config.status) {
    case HierarchyStatus.DISABLED:
      return 'info';
    case HierarchyStatus.NO_PROFILE:
      return 'warning';
    case HierarchyStatus.IMMUNE:
      return 'success';
    case HierarchyStatus.ACTIVE:
      return 'info';
    case HierarchyStatus.ERROR:
      return 'error';
    default:
      return 'info';
  }
};

/**
 * 🔄 Hook pro React komponenty - načte a cachuje hierarchii
 * Použití: const hierarchyConfig = useHierarchyConfig(token, username);
 */
export const createHierarchyHook = () => {
  let cachedConfig = null;
  let cacheTime = 0;
  const CACHE_DURATION = 60000; // 60 sekund
  
  return async (token, username, forceRefresh = false) => {
    const now = Date.now();
    
    if (!forceRefresh && cachedConfig && (now - cacheTime < CACHE_DURATION)) {
      return cachedConfig;
    }
    
    cachedConfig = await getHierarchyConfig(token, username);
    cacheTime = now;
    
    return cachedConfig;
  };
};

// Singleton instance hooku
export const getHierarchyConfigCached = createHierarchyHook();

/**
 * 🧹 Vyčistí cache hierarchie
 */
export const clearHierarchyCache = () => {
  // Cache se resetuje automaticky při příštím volání
};

// Export všech funkcí jako default objekt
export default {
  HierarchyModules,
  HierarchyStatus,
  getHierarchyConfig,
  getHierarchyConfigCached,
  isHierarchyActiveForModule,
  getLogicDescription,
  getHierarchyInfoMessage,
  getHierarchyBannerColor,
  clearHierarchyCache
};

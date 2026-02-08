/**
 * Helper pro získání výchozí homepage podle globálních nastavení
 * Používá se při návratu z formulářů (uložení, zavření, smazání objednávky)
 */

import { getGlobalSettings } from '../services/globalSettingsApi';

/**
 * Získá URL výchozí homepage podle nastavení modulu
 * @returns {Promise<string>} URL výchozí homepage
 */
export async function getDefaultHomepage() {
  try {
    const settings = await getGlobalSettings();
    const defaultHomepage = settings.module_default_homepage || 'orders25-list';
    
    // Kontrola, zda je preferovaný modul aktivní
    if (defaultHomepage === 'orders25-list' && settings.module_orders_visible) {
      return '/orders25-list';
    } else if (defaultHomepage === 'orders25-list-v3' && settings.module_orders_v3_visible) {
      return '/orders25-list-v3';
    }
    
    // Fallback: První dostupný modul
    if (settings.module_orders_visible) {
      return '/orders25-list';
    } else if (settings.module_orders_v3_visible) {
      return '/orders25-list-v3';
    }
    
    // Ultima fallback: Profil
    return '/profile';
  } catch (error) {
    console.error('❌ Chyba při načítání výchozí homepage:', error);
    // Fallback při chybě API
    return '/orders25-list';
  }
}

/**
 * Synchronní verze - používá localStorage cache
 * Používej pokud nemůžeš použít async (např. na 404/403 stránkách bez autentizace)
 */
export function getDefaultHomepageSync() {
  try {
    // Priorita 1: Cache z App.js (app_moduleSettings)
    const moduleSettingsCache = localStorage.getItem('app_moduleSettings');
    if (moduleSettingsCache) {
      const settings = JSON.parse(moduleSettingsCache);
      const defaultHomepage = settings.module_default_homepage || 'orders25-list';
      
      // Kontrola, zda je preferovaný modul aktivní
      if (defaultHomepage === 'orders25-list' && settings.module_orders_visible) {
        return '/orders25-list';
      } else if (defaultHomepage === 'orders25-list-v3' && settings.module_orders_v3_visible) {
        return '/orders25-list-v3';
      }
      
      // Fallback: První dostupný modul
      if (settings.module_orders_visible) {
        return '/orders25-list';
      } else if (settings.module_orders_v3_visible) {
        return '/orders25-list-v3';
      }
      
      // Pokud žádný modul není dostupný, jdi na profil
      return '/profile';
    }
    
    // Priorita 2: Starší cache (globalSettings)
    const cachedSettings = localStorage.getItem('globalSettings');
    if (cachedSettings) {
      const settings = JSON.parse(cachedSettings);
      const defaultHomepage = settings.module_default_homepage || 'orders25-list';
      
      if (defaultHomepage === 'orders25-list' && settings.module_orders_visible) {
        return '/orders25-list';
      } else if (defaultHomepage === 'orders25-list-v3' && settings.module_orders_v3_visible) {
        return '/orders25-list-v3';
      }
      
      if (settings.module_orders_visible) {
        return '/orders25-list';
      } else if (settings.module_orders_v3_visible) {
        return '/orders25-list-v3';
      }
    }
  } catch (error) {
    console.error('❌ Chyba při čtení cache výchozí homepage:', error);
  }
  
  // Ultima fallback: Defaultní seznam objednávek
  return '/orders25-list';
}

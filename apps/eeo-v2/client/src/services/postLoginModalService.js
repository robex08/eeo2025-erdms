/**
 * Post-Login Modal Service
 * 
 * Spravuje zobrazování modal dialogů po přihlášení s podporou:
 * - GUID systému pro resetování "Příště nezobrazovat"
 * - Časové platnosti (od-do)
 * - Per-user localStorage persistence
 * - HTML obsah z databáze notifikací
 */

import { getGlobalSettings } from './globalSettingsApi';
import notificationService from './notificationService';

/**
 * Zkontroluje, zda se má zobrazit post-login modal
 * @param {number} userId - ID přihlášeného uživatele
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<Object|null>} Modal konfigurace nebo null
 */
export const checkPostLoginModal = async (userId, token, username) => {
  try {
    // Načíst globální nastavení PRO ZOBRAZENÍ (s obsahem z notifikace)
    const { getGlobalSettingsForDisplay } = await import('./globalSettingsApi');
    const globalSettings = await getGlobalSettingsForDisplay(token, username);
    
    // KRITICKÉ: Kontrola, zda je modal povolen (priorita #1)
    const enabledValue = globalSettings.post_login_modal_enabled?.hodnota || globalSettings.post_login_modal_enabled;
    const enabled = enabledValue === '1' || enabledValue === 1 || enabledValue === true;
    
    if (!enabled) {
      return null;
    }
    
    // Získat konfiguraci (z .hodnota nebo přímo)
    const getSettingValue = (key, defaultValue = null) => {
      const setting = globalSettings[key];
      if (setting && typeof setting === 'object' && 'hodnota' in setting) {
        return setting.hodnota;
      }
      return setting || defaultValue;
    };
    
    const modalGuid = getSettingValue('post_login_modal_guid') || null;
    const validFrom = getSettingValue('post_login_modal_valid_from') || null;
    const validTo = getSettingValue('post_login_modal_valid_to') || null;
    const messageId = getSettingValue('post_login_modal_message_id') || null;
    const title = getSettingValue('post_login_modal_title') || 'Upozornění';
    
    // HTML obsah je už načtený v globalSettings z backendu (z tabulky 25_notifikace)
    const htmlContent = getSettingValue('post_login_modal_content') || 'Obsah není k dispozici.';
    
    // Kontrola časové platnosti
    const now = new Date();
    
    // PLATNÉ OD: Pokud je zadáno, modal se zobrazuje až od tohoto data
    if (validFrom) {
      const fromDate = new Date(validFrom);
      if (!isNaN(fromDate.getTime()) && now < fromDate) {
        return null;
      }
    }
    
    // PLATNÉ DO: Pokud je zadáno, modal se zobrazuje jen do tohoto data
    if (validTo) {
      const toDate = new Date(validTo);
      if (!isNaN(toDate.getTime()) && now > toDate) {
        return null;
      }
    }
    
    // Kontrola localStorage - zda uživatel nezvolil "Příště nezobrazovat"
    if (modalGuid && isModalDismissedByUser(userId, modalGuid)) {
      return null;
    }
    
    return {
      enabled: true,
      modalGuid,
      validFrom,
      validTo,
      title,
      htmlContent,
      messageId
    };
    
  } catch (error) {
    console.error('Chyba při kontrole post-login modal:', error);
    return null;
  }
};

/**
 * Označí modal jako skrytý pro daného uživatele a GUID
 * @param {number} userId - ID uživatele
 * @param {string} modalGuid - GUID modalu
 */
export const dismissModalForUser = (userId, modalGuid) => {
  if (!modalGuid) {
    console.warn('⚠️ dismissModalForUser: chybí modalGuid');
    return;
  }
  
  try {
    const key = getModalDismissKey(userId, modalGuid);
    localStorage.setItem(key, 'true');
  } catch (error) {
    console.warn('⚠️ Chyba při ukládání dismissal stavu:', error);
  }
};

/**
 * Zkontroluje, zda uživatel skryl modal pro daný GUID
 * @param {number} userId - ID uživatele
 * @param {string} modalGuid - GUID modalu
 * @returns {boolean} True pokud je modal skrytý
 */
export const isModalDismissedByUser = (userId, modalGuid) => {
  if (!modalGuid) return false;
  
  try {
    const key = getModalDismissKey(userId, modalGuid);
    const value = localStorage.getItem(key);
    const isDismissed = value === 'true';
    
    return isDismissed;
  } catch (error) {
    return false;
  }
};

/**
 * Vymaže všechny dismissal stavy pro daného uživatele
 * @param {number} userId - ID uživatele
 */
export const clearAllModalDismissals = (userId) => {
  try {
    const prefix = `post_login_modal_dismissed_${userId}_`;
    const keysToRemove = [];
    
    // Najít všechny klíče s tímto prefixem
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    // Smazat klíče
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('⚠️ Chyba při mazání dismissal stavů:', error);
  }
};

/**
 * Vymaže dismissal stav pro konkrétní GUID (admin funkce)
 * @param {string} modalGuid - GUID modalu
 */
export const clearModalDismissalForAllUsers = (modalGuid) => {
  if (!modalGuid) return;
  
  try {
    const pattern = `_${modalGuid}`;
    const keysToRemove = [];
    
    // Najít všechny klíče končící na tento GUID
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('post_login_modal_dismissed_') && key.endsWith(pattern)) {
        keysToRemove.push(key);
      }
    }
    
    // Smazat klíče
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('⚠️ Chyba při mazání dismissal stavů pro GUID:', error);
  }
};

/**
 * Vygeneruje klíč pro localStorage
 * @param {number} userId - ID uživatele
 * @param {string} modalGuid - GUID modalu
 * @returns {string} Klíč pro localStorage
 */
const getModalDismissKey = (userId, modalGuid) => {
  return `post_login_modal_dismissed_${userId}_${modalGuid}`;
};

/**
 * Načte HTML obsah z notifikačního systému
 * @param {string|number} messageId - ID zprávy v notifikačním systému
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<string|null>} HTML obsah nebo null
 */
const getNotificationContent = async (messageId, token, username) => {
  try {
    // Použít notificationService k načtení obsahu
    // Předpokládáme, že notifikace má v obsahu HTML
    const notification = await notificationService.getNotificationById(messageId, token, username);
    
    if (notification && notification.zprava) {
      return notification.zprava; // Očekáváme HTML obsah
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ Chyba při načítání notifikace ID', messageId, ':', error);
    return null;
  }
};

/**
 * Vygeneruje nový GUID pro resetování modalu
 * @returns {string} Nový GUID
 */
export const generateModalGuid = () => {
  return 'modal_' + Math.random().toString(36).substring(2) + '_' + Date.now().toString(36);
};

/**
 * Získá info o tom, kolik uživatelů má modal skrytý pro daný GUID
 * @param {string} modalGuid - GUID modalu
 * @returns {number} Počet uživatelů se skrytým modalem
 */
export const getModalDismissalCount = (modalGuid) => {
  if (!modalGuid) return 0;
  
  try {
    const pattern = `_${modalGuid}`;
    let count = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('post_login_modal_dismissed_') && key.endsWith(pattern)) {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    return 0;
  }
};

/**
 * Debug funkce pro testování localStorage (volat z konzole)
 * @param {number} userId - ID uživatele
 * @param {string} modalGuid - GUID modalu
 * @returns {Object} Debug informace o dismiss stavu
 * @example window.debugModalDismiss(123, 'some-guid')
 */
export const debugModalDismiss = (userId, modalGuid) => {
  const key = getModalDismissKey(userId, modalGuid);
  const value = localStorage.getItem(key);
  const isDismissed = isModalDismissedByUser(userId, modalGuid);
  
  const result = {
    input: { userId, modalGuid, userIdType: typeof userId, modalGuidType: typeof modalGuid },
    key,
    value,
    isDismissed,
    allDismissKeys: []
  };
  
  // Najít všechny localStorage klíče s modal_dismissed
  for (let i = 0; i < localStorage.length; i++) {
    const localKey = localStorage.key(i);
    if (localKey && localKey.includes('post_login_modal_dismissed_')) {
      result.allDismissKeys.push({ key: localKey, value: localStorage.getItem(localKey) });
    }
  }
  
  return result;
};

// Přidat funkci do window pro snadný přístup z konzole
if (typeof window !== 'undefined') {
  window.debugModalDismiss = debugModalDismiss;
}

export default {
  checkPostLoginModal,
  dismissModalForUser,
  isModalDismissedByUser,
  clearAllModalDismissals,
  clearModalDismissalForAllUsers,
  generateModalGuid,
  getModalDismissalCount,
  debugModalDismiss
};
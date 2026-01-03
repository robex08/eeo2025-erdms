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
    // Načíst globální nastavení
    const globalSettings = await getGlobalSettings(token, username);
    
    if (process.env.NODE_ENV === 'development') {
      console.group('🔔 POST-LOGIN MODAL CHECK');
      console.log('Global settings:', globalSettings);
    }
    
    // KRITICKÉ: Kontrola, zda je modal povolen (priorita #1)
    const enabledValue = globalSettings.post_login_modal_enabled?.hodnota || globalSettings.post_login_modal_enabled;
    const enabled = enabledValue === '1' || enabledValue === 1 || enabledValue === true;
    
    if (!enabled) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Modal zakázán v globálním nastavení (post_login_modal_enabled =', enabledValue, ')');
        console.groupEnd();
      }
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Modal config:', {
        modalGuid,
        validFrom,
        validTo,
        messageId,
        title
      });
    }
    
    // Kontrola časové platnosti
    const now = new Date();
    
    // PLATNÉ OD: Pokud je zadáno, modal se zobrazuje až od tohoto data
    if (validFrom) {
      const fromDate = new Date(validFrom);
      if (!isNaN(fromDate.getTime()) && now < fromDate) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Modal ještě není platný (od:', validFrom, ', nyní:', now.toISOString(), ')');
          console.groupEnd();
        }
        return null;
      }
    }
    
    // PLATNÉ DO: Pokud je zadáno, modal se zobrazuje jen do tohoto data
    if (validTo) {
      const toDate = new Date(validTo);
      if (!isNaN(toDate.getTime()) && now > toDate) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Modal už není platný (do:', validTo, ', nyní:', now.toISOString(), ')');
          console.groupEnd();
        }
        return null;
      }
    }
    
    // Kontrola localStorage - zda uživatel nezvolil "Příště nezobrazovat"
    if (modalGuid && isModalDismissedByUser(userId, modalGuid)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Modal skrytý uživatelem pro GUID:', modalGuid);
        console.groupEnd();
      }
      return null;
    }
    
    // Načíst HTML obsah z notifikace (pokud je specifikováno)
    let htmlContent = getSettingValue('post_login_modal_content') || '';
    
    if (messageId) {
      try {
        // Načíst obsah ze systému notifikací
        const notificationContent = await getNotificationContent(messageId, token, username);
        if (notificationContent) {
          htmlContent = notificationContent;
        }
      } catch (error) {
        console.warn('⚠️ Chyba při načítání obsahu notifikace:', error);
        // Použít fallback obsah z global settings
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Modal se má zobrazit');
      console.groupEnd();
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
    if (process.env.NODE_ENV === 'development') {
      console.groupEnd();
    }
    return null;
  }
};

/**
 * Označí modal jako skrytý pro daného uživatele a GUID
 * @param {number} userId - ID uživatele
 * @param {string} modalGuid - GUID modalu
 */
export const dismissModalForUser = (userId, modalGuid) => {
  if (!modalGuid) return;
  
  try {
    const key = getModalDismissKey(userId, modalGuid);
    localStorage.setItem(key, 'true');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Modal označen jako skrytý:', { userId, modalGuid, key });
    }
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
    return localStorage.getItem(key) === 'true';
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Vymazány modal dismissal stavy:', { userId, count: keysToRemove.length });
    }
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Vymazány modal dismissal stavy pro GUID:', { modalGuid, count: keysToRemove.length });
    }
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

export default {
  checkPostLoginModal,
  dismissModalForUser,
  isModalDismissedByUser,
  clearAllModalDismissals,
  clearModalDismissalForAllUsers,
  generateModalGuid,
  getModalDismissalCount
};
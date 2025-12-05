/**
 * Helper funkce pro správu viditelnosti ikon nástrojů
 */

import { loadSettingsFromLocalStorage } from '../services/userSettingsApi';

/**
 * Vrátí nastavení viditelnosti ikon nástrojů pro aktuálního uživatele
 * @param {number|string} userId - ID uživatele (nepovinné - pokud není zadáno, zkusí načíst z localStorage)
 * @returns {Object} - { notes: boolean, todo: boolean, chat: boolean, kalkulacka: boolean }
 */
export const getToolsVisibility = (userId = null) => {
  try {
    // Pokud není user_id zadán jako parametr, zkus najít v localStorage
    let user_id = userId;
    
    if (!user_id) {
      // Fallback: Zkus najít user_id v různých místech localStorage
      const possibleKeys = ['auth_user_id', 'current_user_id', 'user_id'];
      for (const key of possibleKeys) {
        const storedId = localStorage.getItem(key);
        if (storedId) {
          user_id = parseInt(storedId, 10);
          if (!isNaN(user_id)) break;
        }
      }
      
      // Další fallback: Zkus najít user v auth_user
      if (!user_id || isNaN(user_id)) {
        try {
          const authUser = localStorage.getItem('auth_user');
          if (authUser) {
            const userData = JSON.parse(authUser);
            user_id = userData?.id;
          }
        } catch (e) {}
      }
    }
    
    // Ensure user_id is a valid number
    user_id = parseInt(user_id, 10);
    
    if (!user_id || isNaN(user_id)) {
      // Výchozí hodnoty pokud není přihlášený uživatel
      return {
        notes: true,
        todo: true,
        chat: true,
        kalkulacka: true,
        helper: true
      };
    }

    const userSettings = loadSettingsFromLocalStorage(user_id);
    
    if (!userSettings || !userSettings.zobrazit_ikony_nastroju) {
      // Výchozí hodnoty pokud není nastavení
      return {
        notes: true,
        todo: true,
        chat: true,
        kalkulacka: true,
        helper: true
      };
    }

    return userSettings.zobrazit_ikony_nastroju;
  } catch (error) {
    console.error('Chyba při načítání viditelnosti nástrojů:', error);
    // Výchozí hodnoty při chybě
    return {
      notes: true,
      todo: true,
      chat: true,
      kalkulacka: true,
      helper: true
    };
  }
};

/**
 * Zkontroluje, zda je konkrétní nástroj viditelný
 * @param {string} toolName - Název nástroje ('notes', 'todo', 'chat', 'kalkulacka')
 * @returns {boolean} - True pokud je nástroj viditelný
 */
export const isToolVisible = (toolName) => {
  const visibility = getToolsVisibility();
  return visibility[toolName] !== false; // Default true pokud není nastaveno
};

/**
 * Vrátí seznam viditelných nástrojů
 * @returns {Array} - Pole názvů viditelných nástrojů
 */
export const getVisibleTools = () => {
  const visibility = getToolsVisibility();
  return Object.keys(visibility).filter(tool => visibility[tool] === true);
};

/**
 * Zkontroluje, zda je alespoň jeden nástroj viditelný
 * @returns {boolean} - True pokud je alespoň jeden nástroj viditelný
 */
export const hasVisibleTools = () => {
  const visibleTools = getVisibleTools();
  return visibleTools.length > 0;
};

/**
 * 🔍 SEARCH HISTORY - Správa historie vyhledávání
 * 
 * Ukládá posledních 8 hledání do localStorage pro každého uživatele.
 */

const MAX_HISTORY = 8;
const MIN_QUERY_LENGTH = 2;

/**
 * Získá klíč pro localStorage pro daného uživatele
 */
const getHistoryKey = (userId) => `search_history_${userId}`;

/**
 * Načte historii vyhledávání pro uživatele
 * @param {number|string} userId - ID přihlášeného uživatele
 * @returns {Array} Pole objektů historie
 */
export const getSearchHistory = (userId) => {
  if (!userId) return [];
  
  try {
    const data = localStorage.getItem(getHistoryKey(userId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Chyba při načítání search history:', error);
    return [];
  }
};

/**
 * Uloží vyhledávání do historie
 * @param {number|string} userId - ID přihlášeného uživatele
 * @param {string} query - Hledaný výraz
 * @param {Array} categories - Kategorie ve kterých se hledalo
 */
export const saveSearchToHistory = (userId, query, categories = []) => {
  if (!userId || !query || query.length < MIN_QUERY_LENGTH) return;
  
  try {
    const history = getSearchHistory(userId);
    
    // Odstraň duplicity (stejný query)
    const filtered = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    
    // Přidej nový na začátek
    const updated = [
      {
        query: query.trim(),
        timestamp: Date.now(),
        categories: categories || []
      },
      ...filtered
    ].slice(0, MAX_HISTORY);
    
    localStorage.setItem(getHistoryKey(userId), JSON.stringify(updated));
  } catch (error) {
    console.error('Chyba při ukládání search history:', error);
  }
};

/**
 * Odstraní jeden záznam z historie
 * @param {number|string} userId - ID přihlášeného uživatele
 * @param {string} query - Hledaný výraz k odstranění
 */
export const removeSearchFromHistory = (userId, query) => {
  if (!userId || !query) return;
  
  try {
    const history = getSearchHistory(userId);
    const updated = history.filter(item => item.query !== query);
    localStorage.setItem(getHistoryKey(userId), JSON.stringify(updated));
  } catch (error) {
    console.error('Chyba při mazání položky z history:', error);
  }
};

/**
 * Vymaže celou historii pro uživatele
 * @param {number|string} userId - ID přihlášeného uživatele
 */
export const clearSearchHistory = (userId) => {
  if (!userId) return;
  
  try {
    localStorage.removeItem(getHistoryKey(userId));
  } catch (error) {
    console.error('Chyba při mazání search history:', error);
  }
};

/**
 * Vymaže historii všech uživatelů (pro cleanup při logout)
 */
export const clearAllSearchHistory = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('search_history_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Chyba při mazání všech search history:', error);
  }
};

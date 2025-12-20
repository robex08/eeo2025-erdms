/**
 * Universal Search API Service
 * 
 * Univerzální vyhledávání napříč všemi entitami v aplikaci
 * 
 * @endpoint POST /api.eeo/search/universal
 */

import { loadAuthData, getStoredUsername } from '../utils/authStorage';

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/';

/**
 * Univerzální vyhledávání
 * 
 * @param {Object} params - Parametry vyhledávání
 * @param {string} params.query - Hledaný výraz (min 3 znaky)
 * @param {Array<string>} [params.categories] - Kategorie k prohledání
 * @param {number} [params.limit=15] - Max výsledků per kategorie
 * @param {boolean} [params.include_inactive=false] - Zahrnout neaktivní záznamy
 * @param {number} [params.archivovano=0] - Zahrnout archivované objednávky (0=ne, 1=ano)
 * @param {boolean} [params.search_all=false] - Ignorovat user permissions, vrátit všechny výsledky
 * 
 * @returns {Promise<Object>} Search response s výsledky
 */
export const universalSearch = async (params) => {
  // Validace
  if (!params.query || typeof params.query !== 'string') {
    throw new Error('Query je povinný parametr');
  }

  if (params.query.length < 3) {
    throw new Error('Query musí mít alespoň 3 znaky');
  }

  // Načti token a username
  const token = await loadAuthData.token();
  const user = await loadAuthData.user();
  const username = user?.username || getStoredUsername();
  
  if (!token) {
    throw new Error('Chybí autentizační token');
  }

  if (!username) {
    throw new Error('Chybí username');
  }

  // 🔍 ARCHIV FILTR: Načti z localStorage (stejný klíč jako Orders25List)
  const showArchived = params.archivovano !== undefined 
    ? params.archivovano 
    : (() => {
        try {
          const user_id = user?.id;
          if (user_id) {
            const storageKey = `orders25List_showArchived_user_${user_id}`;
            const stored = localStorage.getItem(storageKey);
            return stored === 'true' ? 1 : 0;
          }
          return 0;
        } catch (e) {
          return 0;
        }
      })();

  // Připrav request body - username a token v body (stejně jako všechny API2 endpointy)
  const requestBody = {
    username: username,
    token: token,
    query: params.query.trim(),
    categories: params.categories || [
      'users',
      'orders_2025',
      'orders_legacy',
      'contracts',
      'invoices',
      'suppliers',
      'suppliers_from_orders'  // 🆕 Dodavatelé skutečně použití v objednávkách (s počtem a agregací)
    ],
    limit: params.limit || 15,
    include_inactive: params.include_inactive || false,
    archivovano: showArchived,  // ✅ Respektuj ARCHIV filtr z Orders25List
    search_all: params.search_all || false  // ✅ Ignorovat permissions, vrátit všechny výsledky
  };

  try {
    const response = await fetch(`${API_BASE_URL}search/universal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    // Error handling
    if (!response.ok) {
      console.error('❌ Universal Search ERROR:', data);
      throw new Error(data.message || `HTTP error ${response.status}`);
    }

    if (data.status === 'error') {
      console.error('❌ Universal Search ERROR:', data);
      throw new Error(data.message || 'Chyba při vyhledávání');
    }

    return data;
  } catch (error) {
    console.error('❌ Universal Search CATCH ERROR:', error);
    
    // Re-throw s lepší error message
    if (error.message.includes('fetch')) {
      throw new Error('Nepodařilo se spojit se serverem');
    }
    
    throw error;
  }
};

export default {
  universalSearch
};

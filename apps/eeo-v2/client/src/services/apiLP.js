/**
 * API Service pro Limitované příslíby (LP)
 * 
 * Poskytuje funkce pro:
 * - Načítání seznamu LP s context filtering (orders/invoices/cashbook)
 * - CRUD operace pro odbory LP přiřazení (faktury/pokladna bez objednávky)
 */

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';

/**
 * Načte seznam LP s možností context filtru
 * 
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {string} [params.context] - Context pro filtrování ('orders', 'invoices', 'cashbook')
 * @param {string} [params.searchTerm] - Vyhledávací term (pro fulltext)
 * @returns {Promise<Object>} Response s LP daty
 */
export const fetchLPList = async ({ token, username, context = null, searchTerm = '' }) => {
  try {
    const response = await fetch(`${API_BASE_URL}lp/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        context, // 'orders', 'invoices', 'cashbook', nebo null (všechny)
        search: searchTerm,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při načítání LP');
    }

    return data;
  } catch (error) {
    console.error('❌ Chyba při načítání LP:', error);
    throw error;
  }
};

/**
 * Uloží odbory LP přiřazení (faktura nebo pokladní položka)
 * 
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} params.lp_id - ID limitovaného příslibu
 * @param {number} [params.faktura_id] - ID faktury (pro faktury bez objednávky)
 * @param {number} [params.pokladni_polozka_id] - ID pokladní položky (pro pokladnu)
 * @param {string} [params.poznamka] - Poznámka k přiřazení
 * @returns {Promise<Object>} Response s výsledkem
 */
export const saveOdboryLP = async ({
  token,
  username,
  lp_id,
  faktura_id = null,
  pokladni_polozka_id = null,
  poznamka = '',
}) => {
  try {
    // Validace: musí být buď faktura_id nebo pokladni_polozka_id (ne obojí)
    if (!faktura_id && !pokladni_polozka_id) {
      throw new Error('Musí být zadáno buď faktura_id nebo pokladni_polozka_id');
    }

    if (faktura_id && pokladni_polozka_id) {
      throw new Error('Nelze zadat obojí - faktura_id a pokladni_polozka_id');
    }

    const response = await fetch(`${API_BASE_URL}odbory-lp/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        lp_id,
        faktura_id,
        pokladni_polozka_id,
        poznamka,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při ukládání odbory LP');
    }

    return data;
  } catch (error) {
    console.error('❌ Chyba při ukládání odbory LP:', error);
    throw error;
  }
};

/**
 * Načte odbory LP přiřazení (faktura nebo pokladní položka)
 * 
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} [params.faktura_id] - ID faktury
 * @param {number} [params.pokladni_polozka_id] - ID pokladní položky
 * @returns {Promise<Object>} Response s LP daty
 */
export const getOdboryLP = async ({
  token,
  username,
  faktura_id = null,
  pokladni_polozka_id = null,
}) => {
  try {
    // Validace: musí být alespoň jedno
    if (!faktura_id && !pokladni_polozka_id) {
      throw new Error('Musí být zadáno buď faktura_id nebo pokladni_polozka_id');
    }

    const response = await fetch(`${API_BASE_URL}odbory-lp/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        faktura_id,
        pokladni_polozka_id,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
      // Pokud LP není přiřazen, není to chyba - vrátíme null
      if (data.message && data.message.includes('nenalezen')) {
        return { status: 'success', data: null };
      }
      throw new Error(data.message || 'Chyba při načítání odbory LP');
    }

    return data;
  } catch (error) {
    console.error('❌ Chyba při načítání odbory LP:', error);
    throw error;
  }
};

/**
 * Smaže odbory LP přiřazení (faktura nebo pokladní položka)
 * 
 * @param {Object} params - Parametry požadavku
 * @param {string} params.token - Auth token
 * @param {string} params.username - Username
 * @param {number} [params.faktura_id] - ID faktury
 * @param {number} [params.pokladni_polozka_id] - ID pokladní položky
 * @returns {Promise<Object>} Response s výsledkem
 */
export const deleteOdboryLP = async ({
  token,
  username,
  faktura_id = null,
  pokladni_polozka_id = null,
}) => {
  try {
    // Validace: musí být alespoň jedno
    if (!faktura_id && !pokladni_polozka_id) {
      throw new Error('Musí být zadáno buď faktura_id nebo pokladni_polozka_id');
    }

    const response = await fetch(`${API_BASE_URL}odbory-lp/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        username,
        faktura_id,
        pokladni_polozka_id,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Chyba při mazání odbory LP');
    }

    return data;
  } catch (error) {
    console.error('❌ Chyba při mazání odbory LP:', error);
    throw error;
  }
};

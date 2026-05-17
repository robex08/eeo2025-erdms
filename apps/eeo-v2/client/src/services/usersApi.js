/**
 * 👥 USERS API SERVICE
 * Služby pro práci s uživatelským API
 * 
 * Funkce:
 * - fetchUsersList() - Načte seznam všech uživatelů
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

/**
 * 📋 Načíst seznam všech uživatelů
 * @param {string} token - Autentizační token
 * @param {string} username - Username aktuálního uživatele
 * @returns {Promise<object>} - {success: boolean, data: Array<User>, message: string}
 */
export const fetchUsersList = async (token, username) => {
  try {
    if (!token || !username) {
      throw new Error('Chybějící token nebo username');
    }

    const response = await axios.post(
      `${API_BASE_URL}/users/list`,
      {
        token,
        username
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15s timeout
      }
    );

    // Kontrola odpovědi
    if (response.data?.status === 'success' && response.data?.data) {
      return {
        success: true,
        data: response.data.data,
        message: 'Seznam uživatelů načten'
      };
    } else {
      throw new Error(response.data?.message || 'Neplatná odpověď od serveru');
    }

  } catch (error) {
    console.error('❌ Chyba při načítání seznamu uživatelů:', error);

    // Detailní error handling
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Neznámá chyba';

      if (status === 401 || status === 403) {
        return {
          success: false,
          message: 'Nemáte oprávnění k této operaci'
        };
      } else if (status === 404) {
        return {
          success: false,
          message: 'Endpoint nenalezen'
        };
      } else {
        return {
          success: false,
          message: `Chyba serveru: ${message}`
        };
      }
    } else if (error.request) {
      return {
        success: false,
        message: 'Server neodpovídá. Zkuste to prosím později.'
      };
    } else {
      return {
        success: false,
        message: error.message || 'Neočekávaná chyba při načítání uživatelů'
      };
    }
  }
};

export default {
  fetchUsersList
};

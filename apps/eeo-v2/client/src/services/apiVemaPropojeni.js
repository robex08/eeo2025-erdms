/**
 * API Service pro VEMA Propojení
 * Hledání vazeb mezi VEMA fakturami a EEO záznamy
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo';

/**
 * Najde EEO záznamy propojené s VEMA fakturou
 * @param {object} vemaFaktura - Data VEMA faktury {cfak, cobj, csml, vsymb, cdok, smlouva_ecsml, cobj_formatovane}
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @returns {Promise<object>} {objednavky: [...], faktury: [...], smlouvy: [...], celkem: 10}
 */
export const getVemaFakturaPropojeni = async (vemaFaktura, token, username) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/vema-faktury/propojeni-eeo`,
      {
        vema_faktura: vemaFaktura,
        token,
        username
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Chyba při načítání propojení');
    }
  } catch (error) {
    console.error('Chyba při načítání propojení VEMA-EEO:', error);
    throw error;
  }
};

/**
 * Vrátí EEO faktury přímo podle objednavka_id (bez fuzzy hledání přes
 * VS/doklad/částku) - použito v Kontrola OBJ BETA seskupeném pohledu k
 * zobrazení skutečných čísel faktur na kandidátní objednávce, i když je
 * fuzzy hledání ve getVemaFakturaPropojeni nedohledá.
 * @param {number[]} objednavkaIds - ID objednávek (25a_objednavky.id)
 * @param {string} token
 * @param {string} username
 * @returns {Promise<object>} {faktury_by_objednavka: { [objednavkaId]: [...] }}
 */
export const getVemaObjednavkyFaktury = async (objednavkaIds, token, username) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/vema-objednavky/faktury-list`,
      {
        objednavka_ids: objednavkaIds,
        token,
        username
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Chyba při načítání faktur objednávky');
    }
  } catch (error) {
    console.error('Chyba při načítání EEO faktur objednávky:', error);
    throw error;
  }
};

/**
 * Kontrola OBJ BETA - seskupený pohled: hromadný BE endpoint, který pro CELÝ
 * přefiltrovaný dataset (ne jen aktuální stránku) provede groupování,
 * fuzzy-matchování na EEO a výpočet verdiktu páru, a vrátí už jen hotovou
 * stránku vazebních skupin + počty podle vyhodnocení (pro filtrovací chipy).
 * @param {object} params
 * @param {string} params.token
 * @param {string} params.username
 * @param {string} [params.search]
 * @param {'all'|'0'|'1'|'2'|'3plus'} [params.badgeFilter]
 * @param {boolean} [params.warningOnlyFilter]
 * @param {string[]} [params.kontrolaFilter] - multiselect, OR logika
 * @param {string|null} [params.verdictFilter]
 * @param {string[]} [params.financovaniFilter] - multiselect ('LP'|'SMLOUVA'|...), OR logika
 * @param {number} [params.page]
 * @param {number} [params.perPage]
 * @returns {Promise<{groups: object[], verdictCounts: object, financovaniCounts: object, pagination: object}>}
 */
export const getVemaBetaGroupedList = async ({
  token,
  username,
  search = '',
  badgeFilter = 'all',
  warningOnlyFilter = false,
  kontrolaFilter = [],
  verdictFilter = null,
  financovaniFilter = [],
  page = 1,
  perPage = 50
}) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/vema-faktury/kontrola-obj-beta/grouped-list`,
      {
        token,
        username,
        search,
        badgeFilter,
        warningOnlyFilter,
        kontrolaFilter,
        verdictFilter,
        financovaniFilter,
        page,
        perPage
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      return { ...response.data.data, pagination: response.data.pagination };
    } else {
      throw new Error(response.data.message || 'Chyba při načítání seskupeného pohledu');
    }
  } catch (error) {
    console.error('Chyba při načítání seskupeného pohledu Kontrola OBJ BETA:', error);
    throw error;
  }
};

export default {
  getVemaFakturaPropojeni,
  getVemaObjednavkyFaktury,
  getVemaBetaGroupedList
};

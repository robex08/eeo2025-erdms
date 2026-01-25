/**
 * 🏦 CASHBOOK API SERVICE
 *
 * Service vrstva pro komunikaci s backend API pokladní knihy.
 * Obsahuje všech 18 endpointů (11 původních + 7 nových).
 *
 * @author FE Team
 * @date 8. listopadu 2025
 * @version 2.0
 */

import { api2 } from './api2auth';
import { loadAuthData } from '../utils/authStorage';

/**
 * Helper funkce pro získání autentizačních dat
 * Načte username a token z authStorage (šifrovaný localStorage)
 */
const getAuthData = async () => {
  try {
    // ✅ loadAuthData je objekt s metodami .user() a .token() - obě jsou async
    const user = await loadAuthData.user();
    const token = await loadAuthData.token();

    if (!user || !token) {
      // ❌ Vytvoř specifickou chybu, která NENÍ autentizační error (neměla by způsobit logout)
      const error = new Error('Uživatel není přihlášen');
      error.isAuthDataMissing = true; // Flag pro odlišení od skutečného 401/403
      throw error;
    }

    return {
      username: user.username,
      token: token,
      user_id: user.id // 🆕 Pro vytvoril/upravil pole v DB
    };
  } catch (error) {
    console.error('❌ Chyba při načítání autentizace:', error);
    
    // Zachovat původní error pokud už má flag, jinak obalit do nového
    if (error.isAuthDataMissing) {
      throw error;
    }
    const wrappedError = new Error('Autentizace selhala');
    wrappedError.isAuthDataMissing = true;
    throw wrappedError;
  }
};

/**
 * Helper funkce pro zpracování API chyb
 * ⚠️ DŮLEŽITÉ: Zachovává isAuthDataMissing flag, aby nedošlo k nechtěnému odhlášení
 */
const handleApiError = (error, operation) => {
  console.error(`❌ Chyba při ${operation}:`, error);

  // Pokud je to chyba z getAuthData (chybějící auth data), propag propagovat beze změny
  if (error.isAuthDataMissing) {
    throw error;
  }

  if (error.response) {
    // Server odpověděl s chybovým kódem
    const status = error.response.status;
    const data = error.response.data;

    if (status === 401 || status === 403) {
      // Skutečný HTTP auth error - tento MÁ způsobit logout
      const authError = new Error('Nemáte oprávnění k této operaci');
      authError.isAuthError = true;
      authError.httpStatus = status;
      throw authError;
    }

    if (data && data.message) {
      throw new Error(data.message);
    }

    throw new Error(`Chyba serveru: ${status}`);
  } else if (error.request) {
    // Request byl odeslán, ale žádná odpověď
    throw new Error('Server neodpovídá. Zkontrolujte připojení.');
  } else {
    // Něco se pokazilo při sestavování requestu
    throw new Error(error.message || 'Neznámá chyba');
  }
};

/**
 * 🏦 CASHBOOK API
 *
 * Objekt obsahující všechny API metody pro práci s pokladní knihou.
 * Všechny metody jsou async a vracejí Promise.
 */
const cashbookAPI = {

  // ========================================================================
  // 📚 PŮVODNÍ ENDPOINTY (11)
  // ========================================================================

  /**
   * 1️⃣ Získání seznamu knih pro uživatele
   * @param {number} userId - ID uživatele
   * @param {number} rok - Rok (např. 2025)
   * @param {number} mesic - Měsíc (1-12)
   * @returns {Promise<Object>} Response s polem books
   */
  listBooks: async (userId, rok = null, mesic = null) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-list', {
        ...auth,
        uzivatel_id: userId,
        rok,
        mesic
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání seznamu knih');
    }
  },

  /**
   * 2️⃣ Získání detailu knihy včetně položek
   * @param {number} bookId - ID knihy
   * @param {boolean} forceRecalc - Vynutit přepočet převodu z předchozího měsíce
   * @returns {Promise<Object>} Response s objektem book a polem entries
   */
  getBook: async (bookId, forceRecalc = true) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-get', {
        ...auth,
        book_id: bookId,
        force_recalc: forceRecalc ? 1 : 0  // ✅ Říct backendu, aby přepočítal převod
      });
      
      // 🔥 DEBUG: Výpis RAW dat z BE
      console.log('📦 RAW BE Response (cashbook-get) for book_id=' + bookId + ':', {
        status: response.data.status,
        hasData: !!response.data.data,
        book: response.data.data?.book,
        entriesCount: response.data.data?.entries?.length || 0,
        entries: response.data.data?.entries,
        FULL_RESPONSE: response.data
      });
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání detailu knihy');
    }
  },

  /**
   * 3️⃣ Vytvoření nové knihy
   * @param {number} prirazeniPokladnyId - ID přiřazení pokladny (FK)
   * @param {number} rok - Rok (např. 2025)
   * @param {number} mesic - Měsíc (1-12)
   * @param {number} uzivatelId - ID uživatele (majitel knihy)
   * @returns {Promise<Object>} Response s vytvořenou knihou
   */
  createBook: async (prirazeniPokladnyId, rok, mesic, uzivatelId) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-create', {
        ...auth,
        prirazeni_id: prirazeniPokladnyId,  // ✅ OPRAVA: Backend očekává 'prirazeni_id', NE 'prirazeni_pokladny_id'
        rok,
        mesic,
        uzivatel_id: uzivatelId
      });
      return response.data;
    } catch (error) {
      // ✅ Vrátit error response místo throw, aby frontend měl víc info
      if (error.response?.data) {
        return error.response.data;
      }
      handleApiError(error, 'vytváření knihy');
    }
  },

  /**
   * 4️⃣ Úprava knihy
   * @param {number} bookId - ID knihy
   * @param {Object} updates - Objekt s poli k aktualizaci
   * @returns {Promise<Object>} Response s aktualizovanou knihou
   */
  updateBook: async (bookId, updates) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-update', {
        ...auth,
        book_id: bookId,
        ...updates
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'aktualizace knihy');
    }
  },

  /**
   * 5️⃣ Uzavření měsíce (uživatel)
   * Stav: aktivni → uzavrena_uzivatelem
   * @param {number} bookId - ID knihy
   * @returns {Promise<Object>} Response s message
   */
  closeMonth: async (bookId) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-close', {
        ...auth,
        book_id: bookId,
        akce: 'uzavrit_mesic'
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'uzavírání měsíce');
    }
  },

  /**
   * 6️⃣ Znovuotevření knihy (správce)
   * Stav: uzavrena_uzivatelem/zamknuta_spravcem → aktivni
   * @param {number} bookId - ID knihy
   * @returns {Promise<Object>} Response s message
   */
  reopenBook: async (bookId) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-reopen', {
        ...auth,
        book_id: bookId
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'odemykání knihy');
    }
  },

  /**
   * 7️⃣ Vytvoření nové položky
   * @param {Object} entryData - Data položky (book_id, datum_zapisu, obsah_zapisu, castka_vydaj/prijem)
   * @returns {Promise<Object>} Response s vytvořenou položkou (včetně cislo_dokladu)
   */
  createEntry: async (entryData) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-entry-create', {
        ...auth,
        ...entryData
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'vytváření položky');
    }
  },

  /**
   * 8️⃣ Úprava položky
   * @param {number} entryId - ID položky
   * @param {Object} updates - Objekt s poli k aktualizaci
   * @returns {Promise<Object>} Response s aktualizovanou položkou
   */
  updateEntry: async (entryId, updates) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-entry-update', {
        ...auth,
        entry_id: entryId,
        ...updates
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'aktualizace položky');
    }
  },

  /**
   * 9️⃣ Smazání položky (soft delete)
   * @param {number} entryId - ID položky
   * @returns {Promise<Object>} Response s message
   */
  deleteEntry: async (entryId) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-entry-delete', {
        ...auth,
        entry_id: entryId
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'mazání položky');
    }
  },

  /**
   * 🔟 Obnovení smazané položky
   * @param {number} entryId - ID položky
   * @returns {Promise<Object>} Response s obnovenou položkou
   */
  restoreEntry: async (entryId) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-entry-restore', {
        ...auth,
        entry_id: entryId
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'obnovení položky');
    }
  },

  /**
   * 1️⃣1️⃣ Získání audit logu pro knihu
   * @param {number} bookId - ID knihy
   * @returns {Promise<Object>} Response s polem audit_log
   */
  getAuditLog: async (bookId) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-audit-log', {
        ...auth,
        book_id: bookId
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání audit logu');
    }
  },

  // ========================================================================
  // 🆕 NOVÉ ENDPOINTY - PŘIŘAZENÍ POKLADEN (4)
  // ========================================================================

  /**
   * 1️⃣2️⃣ Získání seznamu přiřazení pokladen
   * @param {number|null} userId - ID uživatele (0 = všechna pro admina, null = jen aktuální uživatel)
   * @param {boolean} activeOnly - Pouze aktivní přiřazení (default: true)
   * @returns {Promise<Object>} Response s polem assignments
   */
  listAssignments: async (userId, activeOnly = true) => {
    try {
      const auth = await getAuthData();
      const payload = {
        ...auth,
        active_only: activeOnly,
        uzivatel_id: userId  // null = všechna přiřazení
      };

      const response = await api2.post('cashbox-assignments-list', payload);
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání přiřazení pokladen');
    }
  },

  /**
   * 1️⃣2️⃣-A Získání VŠECH přiřazení pokladen (pouze pro ADMINY)
   * Vrací všechny pokladny všech uživatelů včetně statistik
   * @returns {Promise<Object>} Response s polem všech assignments
   */
  listAllAssignments: async () => {
    try {
      // Použijeme existující cashbox-list endpoint, který vrací všechny pokladny
      const auth = await getAuthData();
      const response = await api2.post('cashbox-list', {
        ...auth,
        active_only: true,   // ✅ JEN AKTIVNÍ pokladny
        include_users: true  // Vrátit i přiřazené uživatele
      });

      // Transformovat výstup z cashbox-list na formát assignments
      if (response.data && response.data.status === 'ok' && response.data.data) {
        const pokladny = response.data.data.pokladny || [];

        // Převést pokladny na assignments formát
        const assignments = pokladny.flatMap(pokladna => {
          const uzivatele = pokladna.uzivatele || [];

          // Pokud pokladna nemá uživatele, vrátit ji samu
          if (uzivatele.length === 0) {
            return [{
              id: parseInt(pokladna.id, 10),
              cislo_pokladny: parseInt(pokladna.cislo_pokladny, 10),
              nazev: pokladna.nazev,
              nazev_pracoviste: pokladna.nazev_pracoviste,
              kod_pracoviste: pokladna.kod_pracoviste,
              ciselna_rada_vpd: pokladna.ciselna_rada_vpd,
              ciselna_rada_ppd: pokladna.ciselna_rada_ppd,
              aktivni: parseInt(pokladna.aktivni, 10),
              je_hlavni: 0, // Pokud není uživatel, není to hlavní assignment
              uzivatel_id: null,
              uzivatel_cele_jmeno: null
            }];
          }

          // Pro každého uživatele vytvořit assignment
          return uzivatele.map(uz => {
            return {
              id: parseInt(uz.prirazeni_id, 10), // ✅ ID přiřazení, ne pokladny
              pokladna_id: parseInt(pokladna.id, 10),
              cislo_pokladny: parseInt(pokladna.cislo_pokladny, 10),
              nazev: pokladna.nazev,
              nazev_pracoviste: pokladna.nazev_pracoviste,
              kod_pracoviste: pokladna.kod_pracoviste,
              ciselna_rada_vpd: pokladna.ciselna_rada_vpd,
              ciselna_rada_ppd: pokladna.ciselna_rada_ppd,
              aktivni: parseInt(pokladna.aktivni, 10),
              uzivatel_id: parseInt(uz.uzivatel_id, 10),
              uzivatel_cele_jmeno: uz.uzivatel_cele_jmeno,
              uzivatel_jmeno: uz.uzivatel_jmeno || null,
              uzivatel_prijmeni: uz.uzivatel_prijmeni || null,
              je_hlavni: parseInt(uz.je_hlavni || 0, 10),
              platne_od: uz.platne_od,
              platne_do: uz.platne_do
            };
          });
        });

        return {
          status: 'ok',
          data: { assignments }
        };
      }

      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání všech přiřazení pokladen (admin)');
    }
  },

  /**
   * 1️⃣3️⃣ Vytvoření nového přiřazení pokladny
   * @param {Object} assignmentData - Data přiřazení
   * @returns {Promise<Object>} Response s vytvořeným přiřazením
   */
  createAssignment: async (assignmentData) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-assignment-create', {
        ...auth,
        ...assignmentData
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'vytváření přiřazení pokladny');
    }
  },

  /**
   * 1️⃣4️⃣ Úprava přiřazení pokladny
   * ⚠️ POZOR: Tabulka `25a_pokladny_uzivatele` obsahuje pouze:
   *    - platne_od, platne_do (datumy platnosti)
   *    - je_hlavni (boolean)
   *    - poznamka (text)
   * ⚠️ VPD/PPD čísla jsou v tabulce `25a_pokladny` (master) - použij updateCashbox()!
   *
   * @param {number} assignmentId - ID přiřazení
   * @param {Object} updates - Data k aktualizaci
   * @param {string} updates.platne_od - Datum platnosti od (YYYY-MM-DD)
   * @param {string|null} updates.platne_do - Datum platnosti do (YYYY-MM-DD, null=aktivní)
   * @param {boolean} updates.je_hlavni - Hlavní pokladna? (0/1)
   * @param {string} updates.poznamka - Poznámka
   * @returns {Promise<Object>} Response s aktualizovaným přiřazením
   */
  updateAssignment: async (assignmentId, updates) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-assignment-update', {
        ...auth,
        assignment_id: assignmentId,
        ...updates
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'aktualizace přiřazení pokladny');
    }
  },

  /**
   * 1️⃣5️⃣ Smazání přiřazení pokladny
   * @param {number} assignmentId - ID přiřazení
   * @returns {Promise<Object>} Response s message
   */
  deleteAssignment: async (assignmentId) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-assignment-delete', {
        ...auth,
        assignment_id: assignmentId
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'mazání přiřazení pokladny');
    }
  },

  // ========================================================================
  // 🆕 NOVÉ ENDPOINTY - GLOBÁLNÍ NASTAVENÍ (2)
  // ========================================================================

  /**
   * 1️⃣6️⃣ Získání globálních nastavení
   * @param {string|null} key - Klíč nastavení (null = všechna nastavení)
   * @returns {Promise<Object>} Response s objektem nastavení
   */
  getSettings: async (key = null) => {
    try {
      const auth = await getAuthData();
      const payload = { ...auth };
      if (key) {
        payload.key = key;
      }
      const response = await api2.post('cashbox-settings-get', payload);
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání nastavení');
    }
  },

  /**
   * 1️⃣7️⃣ Úprava globálního nastavení (pouze admin)
   * @param {string} key - Klíč nastavení
   * @param {string} value - Hodnota
   * @param {string|null} description - Popis nastavení
   * @returns {Promise<Object>} Response s message
   */
  updateSetting: async (key, value, description = null) => {
    try {
      const auth = await getAuthData();
      const payload = {
        ...auth,
        key,
        value
      };
      if (description) {
        payload.description = description;
      }
      const response = await api2.post('cashbox-settings-update', payload);
      return response.data;
    } catch (error) {
      handleApiError(error, 'aktualizace nastavení');
    }
  },

  // ========================================================================
  // 🆕 NOVÉ ENDPOINTY - ZAMYKÁNÍ (1)
  // ========================================================================

  /**
   * 1️⃣8️⃣ Zamknutí knihy správcem
   * Stav: uzavrena_uzivatelem → zamknuta_spravcem
   * Pouze pro CASH_BOOK_MANAGE oprávnění
   * @param {number} bookId - ID knihy
   * @returns {Promise<Object>} Response s message
   */
  lockBook: async (bookId) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-lock', {
        ...auth,
        book_id: bookId
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'zamykání knihy');
    }
  },

  // ========================================================================
  // 🆕 NOVÉ ENDPOINTY PRO NORMALIZOVANOU STRUKTURU (6)
  // ========================================================================

  /**
   * 🆕 Seznam všech pokladen + přiřazení uživatelé
   * @param {boolean} activeOnly - Jen aktivní pokladny (default: true)
   * @param {boolean} includeUsers - Načíst i uživatele (default: true)
   * @returns {Promise<Object>} Response s polem pokladny (každá má pole uzivatele)
   */
  getCashboxList: async (activeOnly = true, includeUsers = true) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-list', {
        ...auth,
        active_only: activeOnly,
        include_users: includeUsers
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání seznamu pokladen');
    }
  },

  /**
   * 🆕 Seznam pokladen s knihami v daném měsíci/roce
   * Vrátí jen ty pokladny, které mají vytvořenou knihu v daném období
   * @param {number} rok - Rok (např. 2025)
   * @param {number} mesic - Měsíc 1-12
   * @param {boolean} activeOnly - Jen aktivní pokladny
   * @param {boolean} includeUsers - Zahrnout info o uživatelích
   * @returns {Promise<Object>} Response s polem pokladny
   */
  getCashboxListByPeriod: async (rok, mesic, activeOnly = true, includeUsers = true) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-list-by-period', {
        ...auth,
        rok,
        mesic,
        active_only: activeOnly,
        include_users: includeUsers
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání pokladen podle období');
    }
  },

  /**
   * 🆕 Vytvořit novou pokladnu
   * @param {Object} cashboxData - Data pokladny
   * @param {number} cashboxData.cislo_pokladny - Číslo pokladny (např. 103)
   * @param {string} cashboxData.nazev - Název pokladny
   * @param {string} cashboxData.kod_pracoviste - Kód pracoviště (např. IT)
   * @param {string} cashboxData.nazev_pracoviste - Název pracoviště
   * @param {string} cashboxData.ciselna_rada_vpd - VPD prefix (např. 597)
   * @param {number} cashboxData.vpd_od_cislo - VPD od čísla (default: 1)
   * @param {string} cashboxData.ciselna_rada_ppd - PPD prefix (např. 497)
   * @param {number} cashboxData.ppd_od_cislo - PPD od čísla (default: 1)
   * @param {string} cashboxData.poznamka - Poznámka
   * @returns {Promise<Object>} Response s pokladna_id
   */
  createCashbox: async (cashboxData) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-create', {
        ...auth,
        ...cashboxData
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'vytváření pokladny');
    }
  },

  /**
   * 🆕 Upravit parametry pokladny (VPD/PPD, název, pracoviště)
   * ⚠️ POZOR: Ovlivní všechny uživatele přiřazené k této pokladně!
   * @param {number} pokladnaId - ID pokladny
   * @param {Object} updates - Objekt s poli k aktualizaci
   * @param {string} updates.nazev - Nový název
   * @param {string} updates.ciselna_rada_vpd - Nový VPD prefix
   * @param {number} updates.vpd_od_cislo - Nový VPD od
   * @param {string} updates.ciselna_rada_ppd - Nový PPD prefix
   * @param {number} updates.ppd_od_cislo - Nový PPD od
   * @param {string} updates.kod_pracoviste - Nový kód pracoviště
   * @param {string} updates.nazev_pracoviste - Nový název pracoviště
   * @param {string} updates.poznamka - Poznámka
   * @returns {Promise<Object>} Response s affected_users (počet ovlivněných uživatelů)
   */
  updateCashbox: async (pokladnaId, updates) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-update', {
        ...auth,
        pokladna_id: pokladnaId,
        ...updates
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'úpravy pokladny');
    }
  },

  /**
   * 🆕 Smazat pokladnu (pouze pokud nemá přiřazené uživatele nebo knihy)
   * @param {number} pokladnaId - ID pokladny
   * @returns {Promise<Object>} Response s message
   */
  deleteCashbox: async (pokladnaId) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-delete', {
        ...auth,
        pokladna_id: pokladnaId
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'mazání pokladny');
    }
  },

  /**
   * 🆕 Přiřadit uživatele k pokladně
   * @param {Object} assignmentData - Data přiřazení
   * @param {number} assignmentData.pokladna_id - ID pokladny
   * @param {number} assignmentData.uzivatel_id - ID uživatele
   * @param {boolean} assignmentData.je_hlavni - Hlavní pokladna? (default: false)
   * @param {string} assignmentData.platne_od - Datum platnosti od (YYYY-MM-DD)
   * @param {string} assignmentData.platne_do - Datum platnosti do (nullable)
   * @param {string} assignmentData.poznamka - Poznámka
   * @returns {Promise<Object>} Response s prirazeni_id
   */
  assignUserToCashbox: async (assignmentData) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-assign-user', {
        ...auth,
        ...assignmentData
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'přiřazování uživatele k pokladně');
    }
  },

  /**
   * 🆕 Odebrat uživatele z pokladny (ukončit platnost přiřazení)
   * @param {number} prirazeniId - ID přiřazení (25a_pokladny_uzivatele.id)
   * @param {string} platne_do - Datum ukončení platnosti (YYYY-MM-DD)
   * @returns {Promise<Object>} Response s message
   */
  unassignUserFromCashbox: async (prirazeniId, platneDo = null) => {
    try {
      const auth = await getAuthData();
      // 🔥 FIX: Použít lokální datum místo UTC
      const today = platneDo || (() => {
        const now = new Date();
        const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0'), d = String(now.getDate()).padStart(2,'0');
        return `${y}-${m}-${d}`;
      })();

      const payload = {
        ...auth,
        prirazeni_id: prirazeniId,
        platne_do: today
      };

      const response = await api2.post('cashbox-unassign-user', payload);

      return response.data;
    } catch (error) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ API ERROR: unassignUserFromCashbox()');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Error:', error);
      console.error('Response:', error?.response);
      console.error('Response Data:', error?.response?.data);
      console.error('Response Status:', error?.response?.status);
      console.error('Response Headers:', error?.response?.headers);
      handleApiError(error, 'odebírání uživatele z pokladny');
    }
  },

  /**
   * 🆕 Seznam uživatelů, kteří nejsou přiřazeni k dané pokladně
   * (Helper pro dropdown při přiřazování)
   * @param {number} pokladnaId - ID pokladny
   * @param {string} search - Vyhledávací text (volitelné)
   * @returns {Promise<Object>} Response s polem uzivatele
   */
  getAvailableUsers: async (pokladnaId, search = '') => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-available-users', {
        ...auth,
        pokladna_id: pokladnaId,
        search
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání dostupných uživatelů');
    }
  },

  /**
   * 🆕 Změnit status je_hlavni u přiřazení uživatele
   * @param {number} prirazeniId - ID přiřazení (25a_pokladny_uzivatele.id)
   * @param {number} jeHlavni - 1 = hlavní, 0 = zástupce
   * @returns {Promise<Object>} Response s message
   */
  updateUserMainStatus: async (prirazeniId, jeHlavni) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-assignment-update', {
        ...auth,
        assignment_id: prirazeniId,
        je_hlavni: jeHlavni
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'změny statusu hlavního uživatele');
    }
  },

  /**
   * 🆕 Synchronizovat uživatele pokladny (batch operace)
   * Smaže všechny stávající přiřazení a vytvoří nová dle poskytnutého seznamu
   * @param {number} pokladnaId - ID pokladny
   * @param {Array} uzivatele - Array objektů {uzivatel_id, je_hlavni, platne_od, platne_do?, poznamka?}
   * @returns {Promise<Object>} Response s počtem smazaných a přidaných
   */
  syncCashboxUsers: async (pokladnaId, uzivatele) => {
    try {
      const auth = await getAuthData();
      const payload = {
        ...auth,
        pokladna_id: pokladnaId,
        uzivatele: uzivatele
      };

      const response = await api2.post('cashbox-sync-users', payload);

      return response.data;
    } catch (error) {
      console.error('❌ API ERROR: syncCashboxUsers()');
      console.error('Error:', error);
      console.error('Response:', error?.response?.data);
      handleApiError(error, 'synchronizace uživatelů pokladny');
    }
  },

  // ========================================================================
  // 🔒 STAV UZAMČENÍ POKLADNÍ KNIHY (1)
  // ========================================================================

  /**
   * 2️⃣1️⃣ Změna stavu uzamčení pokladní knihy
   * @param {number} bookId - ID pokladní knihy
   * @param {string} newStatus - Nový stav (open | closed | locked)
   * @returns {Promise<Object>} Response s informacemi o změně
   */
  changeLockStatus: async (bookId, newStatus) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbook-change-lock-status', {
        ...auth,
        book_id: bookId,
        new_status: newStatus
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'změny stavu uzamčení pokladní knihy');
    }
  },

  // ========================================================================
  // 🔧 ADMIN FUNKCE: FORCE PŘEPOČET (1)
  // ========================================================================

  /**
   * 2️⃣2️⃣ ADMIN: Force přepočet pořadí dokladů v roce
   * ⚠️ NEBEZPEČNÁ OPERACE - přepočítá všechny doklady včetně uzavřených/zamčených
   * Pouze admin s CASH_BOOK_MANAGE oprávněním
   *
   * ✅ PO ZMĚNĚ (commit 945cc8e): Používá pokladna_id místo assignment_id
   *
   * @param {number} pokladnaId - ID pokladny (25a_pokladny)
   * @param {number} year - Rok pro přepočet (např. 2025)
   * @returns {Promise<Object>} Response s počtem přečíslovaných položek
   *
   * @example
   * const result = await cashbookAPI.forceRenumberDocuments(3, 2025);
   * console.log(`Přečíslováno ${result.data.total_renumbered} položek`);
   */
  forceRenumberDocuments: async (pokladnaId, year) => {
    try {
      const auth = await getAuthData();
      const payload = {
        ...auth,
        pokladna_id: pokladnaId,  // ✅ ZMĚNĚNO: pokladna_id místo assignment_id
        year: year
      };

      const response = await api2.post('cashbook-force-renumber', payload);
      return response.data;
    } catch (error) {
      handleApiError(error, 'force přepočtu dokladů');
    }
  },

  /**
   * 📊 Získat přehled čerpání LP kódů
   * Agreguje výdaje podle LP kódů včetně multi-LP položek
   * 
   * @param {number} userId - ID uživatele (volitelné, default = přihlášený)
   * @param {number} year - Rok (volitelné, default = aktuální)
   * @param {Object} authData - Autentizační data {username, token} (volitelné, jinak se načtou z úložiště)
   * @returns {Promise} Response s LP summary
   */
  getLPSummary: async (userId = null, year = null, authData = null) => {
    try {
      const auth = authData || await getAuthData();
      
      const payload = {
        username: auth.username,
        token: auth.token
      };
      
      if (userId) payload.user_id = userId;
      if (year) payload.year = year;
      
      const response = await api2.post('cashbook-lp-summary', payload);
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání LP summary');
      throw error;
    }
  },

  /**
   * 📋 Získat detailní rozpis čerpání LP kódu
   * Vrátí všechny doklady které čerpaly daný LP kód
   * 
   * @param {string} lpCode - LP kód
   * @param {number} userId - ID uživatele (volitelné)
   * @param {number} year - Rok (volitelné)
   * @returns {Promise} Response s detailem čerpání
   */
  getLPDetail: async (lpCode, userId = null, year = null) => {
    try {
      const auth = await getAuthData();
      
      const payload = {
        username: auth.username,
        token: auth.token,
        lp_kod: lpCode
      };
      
      if (userId) payload.user_id = userId;
      if (year) payload.year = year;
      
      const response = await api2.post('cashbook-lp-detail', payload);
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání LP detailu');
      throw error;
    }
  },

  // ========================================================================
  // 🆕 LP KÓD POVINNOSŤ - Nastavenie povinnosti LP kódu u pokladen
  // ========================================================================

  /**
   * Aktualizovať nastavenie povinnosti LP kódu u pokladny
   * @param {number} pokladnaId - ID pokladny
   * @param {boolean} lpKodPovinny - Či je LP kód povinný
   * @returns {Promise<Object>} Response s aktualizovanou pokladnou
   */
  updateLpRequirement: async (pokladnaId, lpKodPovinny) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-lp-requirement-update', {
        ...auth,
        pokladna_id: pokladnaId,
        lp_kod_povinny: lpKodPovinny
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'aktualizace nastavení LP kódu');
    }
  },

  /**
   * Získať nastavenie povinnosti LP kódu pre pokladnu
   * @param {number} pokladnaId - ID pokladny
   * @returns {Promise<Object>} Response s nastavením pokladny
   */
  getLpRequirement: async (pokladnaId) => {
    try {
      const auth = await getAuthData();
      const response = await api2.post('cashbox-lp-requirement-get', {
        ...auth,
        pokladna_id: pokladnaId
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'načítání nastavení LP kódu');
    }
  },

  // ========================================================================
  // 🆕 PŘEPOČET ZŮSTATKŮ - Utility pro opravy dat
  // ========================================================================

  /**
   * Přepočítat zůstatky všech lednových knih dané pokladny
   * Volá backend endpoint, který přepočítá zustatek_po_operaci všech položek
   * @param {number} pokladnaId - ID pokladny
   * @param {number} year - Rok (volitelné, default aktuální)
   * @returns {Promise} Response s počtem přepočítaných knih
   */
  recalculateJanuaryBalances: async (pokladnaId, year = null) => {
    try {
      const auth = await getAuthData();
      
      const payload = {
        username: auth.username,
        token: auth.token,
        pokladna_id: pokladnaId
      };
      
      if (year) payload.year = year;
      
      const response = await api2.post('cashbox-recalculate-january', payload);
      return response.data;
    } catch (error) {
      handleApiError(error, 'přepočtu zůstatků lednových knih');
      throw error;
    }
  }
};

// ========================================================================
// 📤 EXPORT
// ========================================================================

export default cashbookAPI;

/**
 * 📖 DOKUMENTACE - POUŽITÍ
 *
 * Import:
 *   import cashbookAPI from '../services/cashbookService';
 *
 * Příklady použití:
 *
 * 1. Načíst knihy uživatele:
 *    const result = await cashbookAPI.listBooks(userId, 2025, 11);
 *    if (result.status === 'ok') {
 *      console.log(result.data.books);
 *    }
 *
 * 2. Vytvořit knihu:
 *    const result = await cashbookAPI.createBook(assignmentId, 2025, 11, userId);
 *
 * 3. Vytvořit položku:
 *    const entryData = {
 *      book_id: 1,
 *      datum_zapisu: '2025-11-08',
 *      obsah_zapisu: 'Test výdaj',
 *      castka_vydaj: 100,
 *      castka_prijem: null
 *    };
 *    const result = await cashbookAPI.createEntry(entryData);
 *    console.log(result.data.cislo_dokladu); // V599-001
 *
 * 4. Uzavřít měsíc:
 *    const result = await cashbookAPI.closeMonth(bookId);
 *
 * 5. Zamknout knihu (admin):
 *    const result = await cashbookAPI.lockBook(bookId);
 *
 * 6. Načíst přiřazení:
 *    const result = await cashbookAPI.listAssignments(userId, true);
 *    const mainAssignment = result.data.find(a => a.je_hlavni === 1);
 *
 * Error handling:
 *   try {
 *     const result = await cashbookAPI.createEntry(data);
 *   } catch (error) {
 *     alert('Chyba: ' + error.message);
 *   }
 */

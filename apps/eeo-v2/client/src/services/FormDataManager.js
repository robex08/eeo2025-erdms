/**
 * FormDataManager - Centralizovaný manažer pro inicializaci a správu dat formuláře
 *
 * Řeší problémy:
 * - Asynchronní načítání číselníků
 * - Synchronizaci s React state
 * - Race conditions při inicializaci
 * - Správné pořadí načítání dat
 *
 * @author Robert Holovský
 * @date 2025-10-28
 */

import {
  fetchAllUsers,
  fetchApprovers,
  fetchLimitovanePrisliby
} from './api2auth';

import {
  getStrediska25,
  getFinancovaniZdroj25,
  getDruhyObjednavky25
} from './api25orders';

// ✅ NOVÉ: Import V2 API pro načítání objednávek
import { getOrderV2 } from './apiOrderV2';

// ✅ KRITICKÉ: Import transformačních utilit pro správné mapování dat
import {
  normalizeFinancovaniFromBackend,
  normalizeStrediskaFromBackend
} from '../utils/dataTransformHelpers';

class FormDataManager {
  constructor() {
    this.isInitialized = false;
    this.isInitializing = false;
    this.initPromise = null;

    // Cache pro načtená data
    this.cache = {
      users: [],
      approvers: [],
      strediska: [],
      financovani: [],
      druhyObjednavky: [],
      lpKody: []
    };

    // Metadata o stavu
    this.metadata = {
      lastInitTime: null,
      initDuration: null,
      errors: []
    };

    // Callbacks pro state update (nastaví React komponenta)
    this.stateCallbacks = {};
  }

  /**
   * Registrace callback funkcí pro update React state
   */
  registerStateCallbacks(callbacks) {
    this.stateCallbacks = {
      setAllUsers: callbacks.setAllUsers || (() => {}),
      setApprovers: callbacks.setApprovers || (() => {}),
      setStrediskaOptions: callbacks.setStrediskaOptions || (() => {}),
      setFinancovaniOptions: callbacks.setFinancovaniOptions || (() => {}),
      setDruhyObjednavkyOptions: callbacks.setDruhyObjednavkyOptions || (() => {}),
      setLpKodyOptions: callbacks.setLpKodyOptions || (() => {}),
      setLoadingUsers: callbacks.setLoadingUsers || (() => {}),
      setLoadingApprovers: callbacks.setLoadingApprovers || (() => {}),
      setLoadingStrediska: callbacks.setLoadingStrediska || (() => {}),
      setLoadingFinancovani: callbacks.setLoadingFinancovani || (() => {}),
      setLoadingDruhyObjednavky: callbacks.setLoadingDruhyObjednavky || (() => {}),
      setLoadingLpKody: callbacks.setLoadingLpKody || (() => {})
    };
  }

  /**
   * Hlavní inicializační metoda - volá se pouze jednou
   */
  async initialize({ token, username, formDataId = null }) {
    // Pokud už běží inicializace, vrať stejný Promise
    if (this.isInitializing) {
      // 🎯 KRITICKÉ: I když čekáme, musíme aktualizovat React state z cache!
      await this.initPromise;
      this._updateReactState();
      return this.cache;
    }

    // Pokud už je inicializováno, vrať cached data
    if (this.isInitialized) {
      // 🎯 KRITICKÉ: Aktualizuj React state i když vracíme cache!
      this._updateReactState();
      return this.cache;
    }

    this.isInitializing = true;
    const startTime = Date.now();

    this.initPromise = this._performInitialization({ token, username, formDataId });

    try {
      await this.initPromise;

      const duration = Date.now() - startTime;
      this.metadata.lastInitTime = new Date();
      this.metadata.initDuration = duration;
      this.isInitialized = true;

      return this.cache;

    } catch (error) {
      this.metadata.errors.push({
        timestamp: new Date(),
        error: error.message
      });
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Interní metoda pro paralelní načtení všech dat
   */
  async _performInitialization({ token, username, formDataId }) {
    const isLoadingFromDB = !!formDataId;

    // Načíst všechna data paralelně
    const [
      usersResult,
      approversResult,
      strediskaResult,
      financovaniResult,
      druhyObjednavkyResult,
      lpKodyResult
    ] = await Promise.allSettled([
      this._loadUsers(token, username, isLoadingFromDB),
      this._loadApprovers(token, username),
      this._loadStrediska(token, username),
      this._loadFinancovani(token, username),
      this._loadDruhyObjednavky(token, username),
      this._loadLpKody(token, username)
    ]);

    // Kontrola výsledků
    const results = {
      users: this._handleResult(usersResult, 'Uživatelé'),
      approvers: this._handleResult(approversResult, 'Schvalovatelé'),
      strediska: this._handleResult(strediskaResult, 'Střediska'),
      financovani: this._handleResult(financovaniResult, 'Financování'),
      druhyObjednavky: this._handleResult(druhyObjednavkyResult, 'Druhy objednávky'),
      lpKody: this._handleResult(lpKodyResult, 'LP kódy')
    };

    // Aktualizuj cache
    this.cache = {
      users: results.users.data,
      approvers: results.approvers.data,
      strediska: results.strediska.data,
      financovani: results.financovani.data,
      druhyObjednavky: results.druhyObjednavky.data,
      lpKody: results.lpKody.data
    };

    // Aktualizuj React state synchronně
    this._updateReactState();

    // Kontrola chyb
    const errors = Object.entries(results)
      .filter(([_, result]) => !result.success)
      .map(([key]) => key);

    if (errors.length > 0) {
    }

    return this.cache;
  }

  /**
   * Načtení uživatelů
   */
  async _loadUsers(token, username, isLoadingFromDB) {
    this.stateCallbacks.setLoadingUsers?.(true);

    try {
      const users = await fetchAllUsers({ token, username });

      // Filtrování podle režimu
      const filtered = isLoadingFromDB
        ? users || []
        : (users || []).filter(user => user.aktivni === 1 || user.aktivni === '1');

      return filtered;

    } catch (error) {
      return [];
    } finally {
      this.stateCallbacks.setLoadingUsers?.(false);
    }
  }

  /**
   * Načtení schvalovatelů
   */
  async _loadApprovers(token, username) {
    this.stateCallbacks.setLoadingApprovers?.(true);

    try {
      const approvers = await fetchApprovers({ token, username });

      // Filtrovat aktivní
      const active = (approvers || []).filter(a => {
        if (a.aktivni === undefined || a.aktivni === null) return true;
        return a.aktivni === 1 || a.aktivni === '1';
      });

      // Zpracovat jména
      const processed = active.map(approver => {
        const titul_pred_str = approver.titul_pred ? approver.titul_pred + ' ' : '';
        const jmeno_str = approver.jmeno || '';
        const prijmeni_str = approver.prijmeni || '';
        const titul_za_str = approver.titul_za ? ', ' + approver.titul_za : '';
        const displayName = `${titul_pred_str}${jmeno_str} ${prijmeni_str}${titul_za_str}`.replace(/\s+/g, ' ').trim() || approver.username || `User ${approver.id || approver.user_id}`;

        return {
          ...approver,
          displayName,
          label: displayName,
          value: approver.id || approver.user_id
        };
      });

      return processed;

    } catch (error) {
      return [];
    } finally {
      this.stateCallbacks.setLoadingApprovers?.(false);
    }
  }

  /**
   * Načtení středisek
   */
  async _loadStrediska(token, username) {
    this.stateCallbacks.setLoadingStrediska?.(true);

    try {
      const strediska = await getStrediska25({ token, username });
      return strediska || [];

    } catch (error) {
      return [];
    } finally {
      this.stateCallbacks.setLoadingStrediska?.(false);
    }
  }

  /**
   * Načtení financování
   */
  async _loadFinancovani(token, username) {
    this.stateCallbacks.setLoadingFinancovani?.(true);

    try {
      const financovani = await getFinancovaniZdroj25({ token, username });
      if (Array.isArray(financovani)) {
        if (financovani.length > 0) {
        }
        return financovani;
      } else {
        return [];
      }

    } catch (error) {
      return [];
    } finally {
      this.stateCallbacks.setLoadingFinancovani?.(false);
    }
  }

  /**
   * Načtení druhů objednávky
   */
  async _loadDruhyObjednavky(token, username) {
    this.stateCallbacks.setLoadingDruhyObjednavky?.(true);

    try {
      const response = await getDruhyObjednavky25({ token, username });
      // ⚠️ OPRAVA: API nyní vrací přímo pole, ne objekt s options
      const druhy = Array.isArray(response) ? response : [];
      if (druhy.length > 0) {
      }

      return druhy;

    } catch (error) {
      return [];
    } finally {
      this.stateCallbacks.setLoadingDruhyObjednavky?.(false);
    }
  }

  /**
   * Načtení LP kódů
   */
  async _loadLpKody(token, username) {
    this.stateCallbacks.setLoadingLpKody?.(true);

    try {
      const lpKody = await fetchLimitovanePrisliby({ token, username });
      return lpKody || [];

    } catch (error) {
      return [];
    } finally {
      this.stateCallbacks.setLoadingLpKody?.(false);
    }
  }

  /**
   * Helper pro zpracování Promise.allSettled výsledků
   */
  _handleResult(result, name) {
    if (result.status === 'fulfilled' && result.value !== undefined && result.value !== null) {
      return {
        success: true,
        data: result.value
      };
    } else {
      return {
        success: false,
        data: []
      };
    }
  }

  /**
   * Aktualizace React state - volá registrované callbacks
   * ⚠️ OPTIMALIZACE: Volá setState JEN když se data skutečně změnila
   */
  _updateReactState() {
    // Kontrola jestli se data změnila před voláním setState
    if (this._hasDataChanged('users', this.cache.users)) {
      this.stateCallbacks.setAllUsers?.(this.cache.users);
    }
    if (this._hasDataChanged('approvers', this.cache.approvers)) {
      this.stateCallbacks.setApprovers?.(this.cache.approvers);
    }
    if (this._hasDataChanged('strediska', this.cache.strediska)) {
      this.stateCallbacks.setStrediskaOptions?.(this.cache.strediska);
    }
    if (this._hasDataChanged('financovani', this.cache.financovani)) {
      this.stateCallbacks.setFinancovaniOptions?.(this.cache.financovani);
    }
    if (this._hasDataChanged('druhyObjednavky', this.cache.druhyObjednavky)) {
      this.stateCallbacks.setDruhyObjednavkyOptions?.(this.cache.druhyObjednavky);
    }
    if (this._hasDataChanged('lpKody', this.cache.lpKody)) {
      this.stateCallbacks.setLpKodyOptions?.(this.cache.lpKody);
    }
  }

  /**
   * Pomocná metoda: Kontrola jestli se data změnila
   */
  _hasDataChanged(key, newData) {
    const prevKey = `_prev_${key}`;
    const prevData = this[prevKey];

    // První volání - vždy true
    if (!prevData) {
      this[prevKey] = newData;
      return true;
    }

    // Porovnání délky pole
    if (prevData.length !== newData.length) {
      this[prevKey] = newData;
      return true;
    }

    // Data se nezměnila
    return false;
  }

  /**
   * Načtení objednávky
   * ✅ NOVĚ: Používá Order V2 API s enriched daty
   */
  async loadOrder({ token, username, orderId, archivovano = 0 }) {

    try {

      // ✅ NOVÉ: Používáme V2 API s enriched daty
      const order = await getOrderV2(orderId, token, username, true); // enriched = true


      if (!order) {
        throw new Error(`Objednávka ID ${orderId} nebyla nalezena`);
      }

      // 🔍 DEBUG: RAW DATA Z BACKENDU

      // 🔧 KRITICKÁ OPRAVA: Transformuj financování z BE do FE formátu
      if (order.financovani) {
        const financing = normalizeFinancovaniFromBackend(order.financovani);
        // Rozbal flat strukturu do order objektu
        Object.assign(order, financing);
      }

      // 🔧 KRITICKÁ OPRAVA: Transformuj střediska z BE do FE formátu
      if (order.strediska_kod) {
        order.strediska_kod = normalizeStrediskaFromBackend(order.strediska_kod);
      }

      return order;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset manageru (pro testing)
   */
  reset() {
    this.isInitialized = false;
    this.isInitializing = false;
    this.initPromise = null;
    this.cache = {
      users: [],
      approvers: [],
      strediska: [],
      financovani: [],
      druhyObjednavky: [],
      lpKody: []
    };
    this.metadata = {
      lastInitTime: null,
      initDuration: null,
      errors: []
    };
  }

  /**
   * Získání aktuálního stavu
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      cache: { ...this.cache },
      metadata: { ...this.metadata }
    };
  }
}

// Singleton instance
const formDataManager = new FormDataManager();

export default formDataManager;

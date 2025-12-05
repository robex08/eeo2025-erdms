/**
 * Orders Cache Service
 *
 * Hybridní cache systém: Memory (primární) + LocalStorage (metadata)
 *
 * ARCHITEKTURA:
 * 1. Memory cache (Map) - ultra rychlý přístup z RAM
 * 2. LocalStorage - jen metadata (flag, timestamp) pro kontrolu TTL
 * 3. Po F5 - vždy reload z DB (memory cache se ztratí)
 * 4. TTL 10 minut - synchronizováno s BackgroundTasks
 * 5. Smart invalidation - při save/delete objednávky
 *
 * FEATURES:
 * - ⚡ Ultra rychlé načítání (memory)
 * - 🔄 TTL 10 minut (auto-refresh v pozadí)
 * - 🎯 Per-user cache (security)
 * - 📊 Per-filter cache (rok, měsíc)
 * - 🚀 Background refresh (bez refresh stránky)
 * - 💾 LocalStorage metadata (TTL check)
 *
 * USAGE:
 * ```javascript
 * // Orders25List - s TTL a background refresh
 * const result = await ordersCacheService.getOrders(userId, fetchFn, { rok: 2025 });
 *
 * // Orders (starý) - bez TTL
 * const result = await ordersCacheService.getOrdersSimple(userId, fetchFn);
 *
 * // Manuální refresh (tlačítko)
 * const fresh = await ordersCacheService.forceRefresh(userId, fetchFn, { rok: 2025 });
 *
 * // Invalidace při změně
 * ordersCacheService.invalidate(userId);
 * ```
 */

class OrdersCacheService {
  constructor() {
    // 🚀 MEMORY CACHE - primární úložiště (Map = ultra rychlé)
    this.memoryCache = new Map();

    // 📊 Konfigurace
    this.config = {
      ttl: 10 * 60 * 1000, // 10 minut (synchronizováno s BackgroundTasks)
      maxCacheSize: 100, // LRU eviction
      debug: true,
      localStoragePrefix: 'orders_cache_meta_' // Prefix pro localStorage metadata
    };

    // 📈 Statistiky (pro monitoring)
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      refreshes: 0,
      dbLoads: 0
    };
  }

  /**
   * Generuje cache key pro memory cache
   * @private
   */
  _getCacheKey(userId, filters = {}) {
    // 🔒 SECURITY: Ověř že userId existuje a není prázdný
    if (!userId || userId === 'undefined' || userId === 'null') {
      throw new Error(`[OrdersCache] Invalid userId: ${userId}. User must be logged in.`);
    }

    const filterKey = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return `user:${userId}|${filterKey || 'all'}`;
  }

  /**
   * Generuje klíč pro localStorage metadata
   * @private
   */
  _getLocalStorageKey(userId, filters = {}) {
    const cacheKey = this._getCacheKey(userId, filters);
    return `${this.config.localStoragePrefix}${cacheKey}`;
  }

  /**
   * Kontrola TTL - je cache platná?
   * @private
   */
  _isValid(timestamp) {
    if (!timestamp) return false;
    const now = Date.now();
    const age = now - timestamp;
    return age < this.config.ttl;
  }

  /**
   * Uloží data do memory cache + metadata do localStorage
   * @private
   */
  _set(cacheKey, data, userId, filters) {
    const timestamp = Date.now();

    // 1. Ulož do memory (primární)
    this.memoryCache.set(cacheKey, {
      data,
      timestamp,
      accessCount: 0
    });

    // 2. Ulož metadata do localStorage (jen timestamp a flag)
    const lsKey = this._getLocalStorageKey(userId, filters);
    try {
      localStorage.setItem(lsKey, JSON.stringify({
        timestamp,
        inMemory: true,
        version: 1
      }));
    } catch (error) {
      if (this.config.debug) {
      }
    }

    // 3. LRU eviction - smaž nejstarší pokud překročíme limit
    if (this.memoryCache.size > this.config.maxCacheSize) {
      const oldestKey = Array.from(this.memoryCache.keys())[0];
      this.memoryCache.delete(oldestKey);
    }

    if (this.config.debug) {
    }
  }

  /**
   * Načte data z memory cache
   * @private
   */
  _get(cacheKey) {
    const entry = this.memoryCache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Inkrementuj access counter (pro LRU)
    entry.accessCount++;

    return entry;
  }

  /**
   * Načte metadata z localStorage
   * @private
   */
  _getMetadata(userId, filters) {
    const lsKey = this._getLocalStorageKey(userId, filters);

    try {
      const metaStr = localStorage.getItem(lsKey);
      if (!metaStr) return null;

      return JSON.parse(metaStr);
    } catch (error) {
      if (this.config.debug) {
      }
      return null;
    }
  }

  /**
   * 🎯 HLAVNÍ METODA - Orders25List (s TTL)
   *
   * Načte objednávky z cache nebo DB
   * - Zkontroluje memory cache
   * - Zkontroluje TTL v localStorage
   * - Po F5 (memory prázdná) → načte z DB
   * - Platná cache → vrátí z memory
   *
   * @param {number} userId - ID uživatele
   * @param {Function} fetchFunction - Async funkce pro DB load
   * @param {Object} filters - Filtry (rok, mesic, viewAll)
   * @returns {Promise<{data: Array, fromCache: boolean, source: string}>}
   */
  async getOrders(userId, fetchFunction, filters = {}) {
    if (!userId) {
      throw new Error('[OrdersCache] userId is required');
    }

    if (typeof fetchFunction !== 'function') {
      throw new Error('[OrdersCache] fetchFunction must be a function');
    }

    const cacheKey = this._getCacheKey(userId, filters);

    // 1️⃣ Zkus memory cache
    const memoryEntry = this._get(cacheKey);

    if (memoryEntry) {
      // Kontrola TTL
      if (this._isValid(memoryEntry.timestamp)) {
        this.stats.hits++;

        const age = Math.round((Date.now() - memoryEntry.timestamp) / 1000);
        if (this.config.debug) {
        }

        return {
          data: memoryEntry.data,
          fromCache: true,
          source: 'memory'
        };
      } else {
        // TTL expired - smaž z memory i localStorage
        if (this.config.debug) {
        }
        this.memoryCache.delete(cacheKey);
        const lsKey = this._getLocalStorageKey(userId, filters);
        localStorage.removeItem(lsKey);
      }
    }

    // 2️⃣ Memory prázdná (po F5) - zkontroluj localStorage metadata
    const metadata = this._getMetadata(userId, filters);

    if (metadata && this._isValid(metadata.timestamp)) {
      // Máme platná metadata, ale memory je prázdná (F5)
      // → načti z DB a ulož do memory
      if (this.config.debug) {
        const age = Math.round((Date.now() - metadata.timestamp) / 1000);
      }
    } else {
      if (this.config.debug) {
      }
    }

    // 3️⃣ Cache miss nebo expired - načti z DB
    this.stats.misses++;
    this.stats.dbLoads++;

    if (this.config.debug) {
    }

    const freshData = await fetchFunction();
    this._set(cacheKey, freshData, userId, filters);

    return {
      data: freshData,
      fromCache: false,
      source: 'database'
    };
  }

  /**
   * 🎯 SIMPLIFIED - Orders.js (bez TTL, bez background refresh)
   *
   * Jednoduchá verze jen s memory cache
   * - Po F5 → načte z DB
   * - Tlačítko "Obnovit" → forceRefresh
   *
   * @param {number} userId - ID uživatele
   * @param {Function} fetchFunction - Async funkce pro DB load
   * @returns {Promise<{data: Array, fromCache: boolean}>}
   */
  async getOrdersSimple(userId, fetchFunction) {
    if (!userId) {
      throw new Error('[OrdersCache] userId is required');
    }

    const cacheKey = this._getCacheKey(userId, { legacy: true });

    // Zkus memory cache (bez TTL check)
    const memoryEntry = this._get(cacheKey);

    if (memoryEntry) {
      this.stats.hits++;

      if (this.config.debug) {
      }

      return {
        data: memoryEntry.data,
        fromCache: true,
        source: 'memory'
      };
    }

    // Cache miss - načti z DB
    this.stats.misses++;
    this.stats.dbLoads++;

    if (this.config.debug) {
    }

    const freshData = await fetchFunction();

    // Ulož do memory (bez localStorage)
    this.memoryCache.set(cacheKey, {
      data: freshData,
      timestamp: Date.now(),
      accessCount: 0
    });

    return {
      data: freshData,
      fromCache: false,
      source: 'database'
    };
  }

  /**
   * 🔄 FORCE REFRESH - manuální obnovení (tlačítko "Obnovit")
   *
   * Vynutí načtení z DB a aktualizuje cache
   */
  async forceRefresh(userId, fetchFunction, filters = {}) {
    const cacheKey = this._getCacheKey(userId, filters);

    this.stats.refreshes++;
    this.stats.dbLoads++;

    if (this.config.debug) {
    }

    const freshData = await fetchFunction();
    this._set(cacheKey, freshData, userId, filters);

    return {
      data: freshData,
      fromCache: false,
      source: 'database_forced'
    };
  }

  /**
   * ❌ INVALIDATE - smazání cache
   *
   * Volá se při:
   * - Uložení objednávky
   * - Smazání objednávky
   * - Logout
   * - Expiraci tokenu
   *
   * @param {number} userId - ID uživatele (null = smaž vše)
   * @param {Object} filters - Specifické filtry (null = vše pro usera)
   */
  invalidate(userId = null, filters = null) {
    this.stats.invalidations++;

    // Smaž všechno
    if (userId === null) {
      this.memoryCache.clear();
      this._clearAllLocalStorage();
      return;
    }

    // Smaž konkrétní query
    if (filters !== null) {
      const cacheKey = this._getCacheKey(userId, filters);
      this.memoryCache.delete(cacheKey);

      const lsKey = this._getLocalStorageKey(userId, filters);
      localStorage.removeItem(lsKey);

      if (this.config.debug) {
      }
      return;
    }

    // Smaž vše pro uživatele
    const userPrefix = `user:${userId}|`;
    let deletedCount = 0;

    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(userPrefix)) {
        this.memoryCache.delete(key);
        deletedCount++;
      }
    }

    // Smaž z localStorage
    this._clearLocalStorageForUser(userId);

    if (this.config.debug) {
    }
  }

  /**
   * Smaž všechny localStorage klíče pro uživatele
   * @private
   */
  _clearLocalStorageForUser(userId) {
    const prefix = `${this.config.localStoragePrefix}user:${userId}|`;
    const keysToDelete = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Smaž všechny localStorage klíče cache
   * @private
   */
  _clearAllLocalStorage() {
    const keysToDelete = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.config.localStoragePrefix)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
  }

  /**
   * 🔄 Background refresh - volá BackgroundTasks
   *
   * Aktualizuje cache na pozadí bez refreshe stránky
   *
   * @param {number} userId - ID uživatele
   * @param {Array} freshData - Nová data z DB
   * @param {Object} filters - Filtry
   */
  updateFromBackground(userId, freshData, filters = {}) {
    const cacheKey = this._getCacheKey(userId, filters);

    if (this.config.debug) {
    }

    this._set(cacheKey, freshData, userId, filters);
  }

  /**
   * 📊 Statistiky
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.memoryCache.size,
      totalRequests: this.stats.hits + this.stats.misses
    };
  }

  /**
   * 🗑️ Vyčistit vše (použij při logout)
   */
  clear() {
    this.memoryCache.clear();
    this._clearAllLocalStorage();
    this.resetStats();
  }

  /**
   * Reset statistik
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      refreshes: 0,
      dbLoads: 0
    };
  }

  /**
   * 📍 SCROLL/PAGING STATE MANAGEMENT
   *
   * Ukládá pozici uživatele (stránka, scroll) do sessionStorage
   * Inteligentní invalidace při změně dat
   */

  /**
   * Generuje klíč pro scroll state
   * @private
   */
  _getScrollStateKey(userId, filters = {}) {
    return `scroll_${this._getCacheKey(userId, filters)}`;
  }

  /**
   * Uloží scroll/paging state
   * @param {number} userId - ID uživatele
   * @param {Object} filters - Filtry (rok, měsíc)
   * @param {Object} state - Stav: { page, rowsPerPage, scrollY, totalRows }
   */
  saveScrollState(userId, filters, state) {
    // 🔒 SECURITY: Ověř že userId existuje
    if (!userId || userId === 'undefined' || userId === 'null') {
      return;
    }

    const key = this._getScrollStateKey(userId, filters);

    try {
      const dataToSave = {
        ...state,
        timestamp: Date.now(),
        filters: { ...filters }, // Uchovat filtry pro validaci
        userId: userId // Přidej userId pro extra kontrolu
      };

      sessionStorage.setItem(key, JSON.stringify(dataToSave));
    } catch (error) {
    }
  }

  /**
   * Načte scroll/paging state s validací
   * @param {number} userId - ID uživatele
   * @param {Object} filters - Filtry (rok, měsíc)
   * @param {number} currentTotalRows - Aktuální počet řádků (pro validaci)
   * @returns {Object|null} - Stav nebo null pokud neplatný
   */
  getScrollState(userId, filters, currentTotalRows = null) {
    // 🔒 SECURITY: Ověř že userId existuje
    if (!userId || userId === 'undefined' || userId === 'null') {
      return null;
    }

    const key = this._getScrollStateKey(userId, filters);

    try {
      const saved = sessionStorage.getItem(key);
      if (!saved) {
        return null;
      }

      const state = JSON.parse(saved);

      // 🔒 SECURITY: Ověř že uložený state patří stejnému uživateli
      if (state.userId && String(state.userId) !== String(userId)) {
        sessionStorage.removeItem(key);
        return null;
      }

      // 1️⃣ Validace TTL (1 hodina)
      const age = Date.now() - state.timestamp;
      if (age > 60 * 60 * 1000) {
        sessionStorage.removeItem(key);
        return null;
      }

      // 2️⃣ Validace filtrů (změnily se?)
      if (JSON.stringify(state.filters) !== JSON.stringify(filters)) {
        sessionStorage.removeItem(key);
        return null;
      }

      // 3️⃣ Validace počtu dat (dramatická změna?)
      if (currentTotalRows !== null && state.totalRows) {
        const rowChange = Math.abs(currentTotalRows - state.totalRows);
        const changePercent = (rowChange / state.totalRows) * 100;

        // Pokud se počet řádků změnil o více než 20% → invaliduj
        if (changePercent > 20) {
          sessionStorage.removeItem(key);
          return null;
        }
      }

      // 4️⃣ Validace stránky (existuje ještě?)
      if (currentTotalRows !== null && state.page && state.rowsPerPage) {
        const maxPage = Math.ceil(currentTotalRows / state.rowsPerPage);

        if (state.page > maxPage) {
          state.page = Math.max(1, maxPage);
        }
      }

      return state;
    } catch (error) {
      return null;
    }
  }

  /**
   * Smaže scroll state (např. při save/delete objednávky)
   * @param {number} userId - ID uživatele
   * @param {Object} filters - Filtry (rok, měsíc) - optional, pokud null = smaž všechny
   */
  clearScrollState(userId, filters = null) {
    // 🔒 SECURITY: Ověř že userId existuje
    if (!userId || userId === 'undefined' || userId === 'null') {
      return;
    }

    if (filters === null) {
      // Smaž všechny scroll states pro uživatele
      const prefix = `scroll_user:${userId}|`;
      Object.keys(sessionStorage)
        .filter(key => key.startsWith(prefix))
        .forEach(key => sessionStorage.removeItem(key));
    } else {
      // Smaž konkrétní scroll state
      const key = this._getScrollStateKey(userId, filters);
      sessionStorage.removeItem(key);
    }
  }

  /**
   * Konfigurace
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Singleton instance
const ordersCacheService = new OrdersCacheService();

export default ordersCacheService;

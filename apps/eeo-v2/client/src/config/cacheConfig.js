/**
 * Cache Configuration
 * Centrální konfigurace pro OrdersCacheService
 */

export const CACHE_CONFIG = {
  // Development prostředí
  development: {
    ttl: 10 * 60 * 1000,          // 10 minut (sync s background task intervalem)
    debug: false,                  // Console logging vypnuto
    maxCacheSize: 20,              // Menší cache (snadnější debug)
    enableSessionBackup: true      // F5 persistence
  },

  // Production prostředí
  production: {
    ttl: 10 * 60 * 1000,          // 10 minut (sync s background task intervalem)
    debug: false,                  // Console logging vypnuto
    maxCacheSize: 100,             // Větší cache
    enableSessionBackup: true      // F5 persistence
  },

  // Test prostředí
  test: {
    ttl: 5 * 1000,                // 5 sekund (rychlé testování)
    debug: false,                  // Console logging vypnuto
    maxCacheSize: 10,
    enableSessionBackup: false     // Vypnuto pro unit testy
  }
};

/**
 * Synchronizace s background task intervaly
 * DŮLEŽITÉ: Cache TTL by měl být stejný jako background task interval
 */
export const BACKGROUND_TASK_INTERVALS = {
  ORDERS_REFRESH: 10 * 60 * 1000,    // 10 minut
  NOTIFICATIONS: 60 * 1000,          // 1 minuta
  CHAT: 90 * 1000                    // 90 sekund
};

/**
 * Získá konfiguraci pro aktuální prostředí
 */
export const getCacheConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return CACHE_CONFIG[env] || CACHE_CONFIG.development;
};

export default CACHE_CONFIG;

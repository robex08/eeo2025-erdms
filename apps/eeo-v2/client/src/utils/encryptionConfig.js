/**
 * Konfigurace šifrování - rozlišení podle citlivosti dat
 * Optimalizováno pro výkon vs bezpečnost
 */

// Kategorie dat podle citlivosti a frekvence přístupu
export const DATA_CATEGORIES = {
  // VŽDY ŠIFROVAT - vysoká citlivost, nízká frekvence
  CRITICAL: {
    encrypt: true,
    reason: 'Autentifikační data, tokeny, osobní údaje, uživatelský obsah',
    keys: [
      'auth_token',
      'auth_user',
      'auth_user_detail',
      'auth_user_permissions',
      'api_keys',
      'user_credentials',

      // 🔒 NOVĚ ZAŠIFROVANÉ - citlivý uživatelský obsah
      'layout_tasks_*',     // TODO úkoly uživatele (může obsahovat citlivé info)
      'layout_notes_*',     // Poznámky uživatele (často citlivé)
      'layout_chat_*',      // Chat zprávy (citlivá komunikace)
      'notes_text_*',       // Text poznámek (citlivý obsah)
      'chat_messages_*',    // Chat zprávy (komunikace)
      'chat_data_*',        // Chat data (citlivé)
      'notif_data_*',       // Notifikace (mohou obsahovat citlivé údaje)
      'todo_items_*',       // TODO položky (citlivé úkoly)

      // 🔒 UŽIVATELSKÉ ŠABLONY A DRAFTY (často obsahují citlivé business info)
      'order_templates_*',  // Šablony objednávek (citlivé business data)
      'order_draft_*',      // Draft objednávky (citlivá data)
      'order25-draft-*',    // Draft 2025 objednávky (citlivá data)
      'user_settings_*'     // Osobní nastavení uživatele
    ]
  },

  // NIKDY NEŠIFROVAT - nízká citlivost, vysoká frekvence
  PERFORMANCE: {
    encrypt: false,
    reason: 'Často přistupovaná data, UI nastavení, veřejná data',
    keys: [
      'ui_settings',
      'user_preferences',
      'orders_cache',
      'suppliers_cache',        // ARES data - veřejně dostupná
      'supplier_contacts_*',    // ARES kontakty - veřejná data
      'filter_states',
      'pagination_states',
      'translation_dict_*',     // Slovníky překladů
      'debug_*',               // Debug data
      // Layout nastavení (pozice, velikosti) - ne obsah
      'layout_*_font_*',       // Velikosti fontů
      'layout_*_position_*',   // Pozice panelů
      'layout_*_size_*',       // Velikosti panelů
      'layout_*_state_*'       // Stavy panelů (otevřeno/zavřeno)
    ]
  },

  // SELEKTIVNĚ - střední citlivost, střední frekvence
  SELECTIVE: {
    encrypt: 'conditional',
    reason: 'Podle obsahu dat a nastavení uživatele',
    keys: [
      'order_draft_*',     // obsahuje-li interní poznámky a citlivé info
      'financial_data_*',  // finanční informace
      'user_settings_*',   // osobní nastavení uživatele
      'notifications_*'    // notifikace - mohou obsahovat citlivé info
    ]
  }
};

// Rychlé rozhodnutí - má se klíč šifrovat?
export const shouldEncrypt = (storageKey) => {
  // Kontrola CRITICAL kategorií (vždy šifrovat)
  if (DATA_CATEGORIES.CRITICAL.keys.some(pattern =>
    pattern.includes('*') ? storageKey.startsWith(pattern.replace('*', '')) : storageKey === pattern
  )) {
    return true;
  }

  // Kontrola PERFORMANCE kategorií (nikdy nešifrovat)
  if (DATA_CATEGORIES.PERFORMANCE.keys.some(pattern =>
    pattern.includes('*') ? storageKey.startsWith(pattern.replace('*', '')) : storageKey === pattern
  )) {
    return false;
  }

  // SELECTIVE kategorie - default false (optimistický přístup k výkonu)
  // Můžeme později přidat specifické kontroly obsahu
  return false;
};

/**
 * Rozhoduje zda šifrovat data - VYLEPŠENÁ BEZPEČNOST
 */
export const shouldEncryptData = (key) => {
  // 🛡️ KRITICKÉ - v produkci vynuť šifrování citlivých dat
  if (ENCRYPTION_CONFIG.FORCE_ENCRYPTION_IN_PRODUCTION && process.env.NODE_ENV === 'production') {
    // V produkci šifruj vždy citlivá data, ignoruj debug flag
    const isCritical = DATA_CATEGORIES.CRITICAL.keys.some(pattern =>
      pattern.includes('*') ? key.startsWith(pattern.replace('*', '')) : key === pattern
    );

    if (isCritical) {
      return true; // Vynuť šifrování v produkci
    }
  }

  // 🚨 VAROVÁNÍ při riskantním nastavení
  const forceEncryption = ENCRYPTION_CONFIG.checkSecurityWarnings();
  if (forceEncryption) {
    return shouldEncrypt(key); // Ignoruj debug mode
  }

  // 🚨 DEBUG REŽIM - šifrování vypnuto (POUZE v development)
  if (ENCRYPTION_CONFIG.DEBUG_MODE) {
    if (process.env.NODE_ENV === 'development') {
    }
    return false;
  }

  // Normální logika šifrování
  return shouldEncrypt(key);
};

// Performance benchmarking
export const benchmarkEncryption = async () => {
  const testData = {
    small: 'test-token-123',
    medium: JSON.stringify({ user: 'admin', permissions: ['READ', 'WRITE', 'DELETE'] }),
    large: JSON.stringify(new Array(1000).fill({ id: 1, name: 'test', data: 'some data' }))
  };

  const results = {};

  for (const [size, data] of Object.entries(testData)) {
    const start = performance.now();

    // Simulace šifrování/dešifrování
    const encrypted = btoa(JSON.stringify(data)); // Simple encoding místo crypto
    const decrypted = JSON.parse(atob(encrypted));

    const end = performance.now();
    results[size] = {
      time: end - start,
      originalSize: data.length,
      encryptedSize: encrypted.length,
      overhead: ((encrypted.length - data.length) / data.length * 100).toFixed(1) + '%'
    };
  }

  return results;
};

// Rozšířené nastavení pro produkční použití - BEZPEČNÉ
export const ENCRYPTION_CONFIG = {
  // 🔐 ZABEZPEČENÝ DEBUG REŽIM - zamezuje vypnutí šifrování v produkci
  DEBUG_MODE: process.env.NODE_ENV === 'development' &&
              process.env.REACT_APP_ENCRYPTION_DEBUG === 'true',

  // 🛡️ VYNUCENÉ ŠIFROVÁNÍ V PRODUKCI
  FORCE_ENCRYPTION_IN_PRODUCTION: process.env.NODE_ENV === 'production',

  // Cache šifrovaných dat v paměti pro rychlejší přístup
  MEMORY_CACHE: true,

  // Timeout pro cache (ms)
  CACHE_TIMEOUT: 10 * 60 * 1000, // 10 minut

  // Batch šifrování více klíčů najednou
  BATCH_OPERATIONS: true,

  // Asynchronní šifrování na pozadí
  ASYNC_ENCRYPTION: true,

  // 🚨 VAROVÁNÍ při nebezpečném nastavení
  checkSecurityWarnings: () => {
    if (process.env.NODE_ENV === 'production' &&
        process.env.REACT_APP_ENCRYPTION_DEBUG === 'true') {

      // V produkci vynuť šifrování i přes debug flag
      return true; // Force encryption
    }
    return false;
  }
};
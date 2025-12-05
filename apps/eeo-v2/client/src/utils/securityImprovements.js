/**
 * 🔒 SECURITY IMPROVEMENTS - Oprává kritických security děr
 *
 * PRIORITY:
 * 1. KRITICKÁ - Global localStorage keys bez user isolation
 * 2. KRITICKÁ - Encryption debug mode v produkci
 * 3. STŘEDNÍ - Nezašifrovaná citlivá data uživatelů
 * 4. STŘEDNÍ - Session security improvements
 */

// ==========================================
// 1. KRITICKÁ - USER DATA ISOLATION FIXES
// ==========================================

/**
 * Utility pro bezpečné localStorage operace s user isolation
 */
export const SecureStorage = {
  // Získá user-specific klíč
  getUserKey: (baseKey, userId) => {
    if (!userId) {
      return `anonymous_${baseKey}`;
    }
    return `${baseKey}_user_${userId}`;
  },

  // Bezpečné setItem s user isolation
  setItem: (baseKey, value, userId) => {
    try {
      const key = SecureStorage.getUserKey(baseKey, userId);
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (error) {
    }
  },

  // Bezpečné getItem s user isolation
  getItem: (baseKey, userId, parseJson = true) => {
    try {
      const key = SecureStorage.getUserKey(baseKey, userId);
      const value = localStorage.getItem(key);
      if (!value) return null;

      return parseJson ? JSON.parse(value) : value;
    } catch (error) {
      return null;
    }
  },

  // Bezpečné removeItem s user isolation
  removeItem: (baseKey, userId) => {
    try {
      const key = SecureStorage.getUserKey(baseKey, userId);
      localStorage.removeItem(key);
    } catch (error) {
    }
  },

  // Vyčištění dat starého uživatele při změně uživatele
  clearUserData: (oldUserId) => {
    if (!oldUserId) return;

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`_user_${oldUserId}`)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
      }
    });
  }
};

// ==========================================
// 2. KRITICKÁ - ENCRYPTION CONFIG FIXES
// ==========================================

/**
 * Bezpečná konfigurace šifrování - ZAMEZUJE debug mode v produkci
 */
export const SECURE_ENCRYPTION_CONFIG = {
  // 🛡️ KRITICKÉ - debug mode ZAKÁZÁN v produkci
  DEBUG_MODE: process.env.NODE_ENV === 'development' &&
              process.env.REACT_APP_ENCRYPTION_DEBUG === 'true',

  // Vynucené šifrování v produkci
  FORCE_ENCRYPTION_IN_PRODUCTION: process.env.NODE_ENV === 'production',

  // Varování při riskantním nastavení
  warnIfUnsafe: () => {
    if (process.env.NODE_ENV === 'production' &&
        process.env.REACT_APP_ENCRYPTION_DEBUG === 'true') {
    }
  }
};

// ==========================================
// 3. STŘEDNÍ - SENSITIVE DATA ENCRYPTION
// ==========================================

/**
 * Aktualizované kategorie dat - VÍCE ŠIFROVÁNÍ pro citlivá data
 */
export const ENHANCED_DATA_CATEGORIES = {
  // VŽDY ŠIFROVAT - rozšířeno o uživatelský obsah
  CRITICAL: {
    encrypt: true,
    keys: [
      'auth_token_persistent',
      'auth_user_persistent',
      'auth_user_detail_persistent',
      'auth_user_permissions_persistent',

      // 🔒 NOVĚ ZAŠIFROVANÉ - uživatelský obsah
      'layout_tasks_*',     // TODO úkoly
      'layout_notes_*',     // Poznámky
      'chat_data_*',        // Chat zprávy
      'notif_data_*',       // Notifikace (mohou být citlivé)
      'notes_text_*',       // Text poznámek
      'user_settings_*',    // Osobní nastavení

      // 🔒 NOVĚ - uživatelské šablony (mohou obsahovat citlivé info)
      'order_templates_*',  // Šablony objednávek
      'order_draft_*',      // Draft objednávky
      'order25-draft-*',    // Draft 2025 objednávky
    ]
  },

  // NIKDY NEŠIFROVAT - pouze technická data
  PERFORMANCE: {
    encrypt: false,
    keys: [
      'ui_settings',           // UI nastavení
      'orders_cache',          // Cache objednávek
      'suppliers_cache',       // ARES data
      'supplier_contacts_*',   // ARES kontakty
      'filter_states',         // Stav filtrů
      'pagination_states',     // Stránkování
      'translation_dict_*',    // Slovníky
      'debug_*',              // Debug data

      // Layout pozice (ne obsah)
      'layout_*_font_*',      // Velikosti fontů
      'layout_*_position_*',  // Pozice panelů
      'layout_*_size_*',      // Velikosti panelů
      'layout_*_state_*',     // Stavy panelů
      'panel_state_*',        // Panel states
    ]
  }
};

// ==========================================
// 4. STŘEDNÍ - SESSION SECURITY
// ==========================================

/**
 * Vylepšený session management
 */
export const SessionSecurity = {
  // Detekce session hijacking
  validateSession: (currentUserId, storedUserId) => {
    if (currentUserId !== storedUserId) {
      return false;
    }
    return true;
  },

  // Token refresh s kratší expiry
  getTokenExpiry: () => {
    // V produkci kratší doba, v dev delší pro pohodlí
    const hours = process.env.NODE_ENV === 'production' ? 24 : 24 * 7; // 1 den vs 7 dní
    return Date.now() + (hours * 60 * 60 * 1000);
  },

  // Bezpečné logout - vyčištění všech dat
  secureClearAll: (userId) => {
    try {
      // Vymaž auth data
      ['auth_token_persistent', 'auth_user_persistent',
       'auth_user_detail_persistent', 'auth_user_permissions_persistent']
        .forEach(key => localStorage.removeItem(key));

      // Vymaž user-specific data
      SecureStorage.clearUserData(userId);

      // Vymaž sessionStorage
      sessionStorage.clear();

    } catch (error) {
    }
  }
};

// ==========================================
// 5. OKAMŽITÉ AKCE
// ==========================================

// Spustit při inicializaci aplikace
export const initSecurityMeasures = () => {
  // Zkontroluj nebezpečné nastavení
  SECURE_ENCRYPTION_CONFIG.warnIfUnsafe();
};

export default {
  SecureStorage,
  SECURE_ENCRYPTION_CONFIG,
  ENHANCED_DATA_CATEGORIES,
  SessionSecurity,
  initSecurityMeasures
};
/**
 * Smart cleanup při odhlášení
 * Smaže citlivá data, zachová užitečné preference a rozpracovanou práci
 */

import { clearEncryptionCache } from './performanceEncryption.js';
import { rotateEncryptionKey } from './encryption.js';

// Definice co zachovat vs co smazat při odhlášení
export const LOGOUT_CLEANUP_CONFIG = {
  // ✅ ZACHOVAT - užitečné pro další přihlášení
  KEEP_PATTERNS: [
    // Uživatelské preference a nastavení UI
    'ui_theme',
    'ui_language',
    'ui_preferences',
    'app_theme_mode',  // ⚙️ Light/dark mode preference
    'lastVisitedSection',
    'activeSection',
    'last_visited_page',
    'last_location', // Pozice před odhlášením pro obnovení po přihlášení
    // ⚠️ ODSTRANĚNO: 'app_lastRoute' - může obsahovat per-user context
    'preferred_page_size',
    'preferred_view_mode',

    // Rozpracované formuláře a drafty - ORDER25 STANDARD
    'order25_draft_*',  // ORDER25 STANDARD
    'order_draft_*',    // LEGACY compatibility
    'order25-draft-*',  // LEGACY cleanup
    'form_draft_*',
    'temp_form_data_*',
    'order_form_isEditMode_*', // 🎯 ZACHOVAT: Pro správné MenuBar po návratu ke konceptu/editaci

    // Filtry a search historie (může být užitečné)
    'last_search_*',
    'preferred_filters_*',
    'recent_filters',

    // Cache veřejných dat (ARES, číselníky)
    'suppliers_cache*',
    'localities_cache*',
    'ciselniky_*',
    'public_data_*',

    // Technické preference
    'debug_settings',
    'performance_settings',
    'error_reporting_consent'
  ],

  // ❌ SMAZAT - citlivá nebo relace-specifická data
  DELETE_PATTERNS: [
    // Všechna auth data (původní i nová)
    'token',
    'user',
    'userDetail',
    'userPermissions',
    'auth_*',
    'user_permissions_*', // Stará per-user permission keys
    'auth_migration_completed', // Reset migrace pro čisté přihlášení

    // 🔒 KRITICKÉ: Uživatelský obsah (TODO, poznámky, chat, notifikace)
    'layout_tasks_*',
    'layout_notes_*',
    'layout_chat_*',
    'notes_text_*',
    'chat_messages_*',
    'chat_data_*',
    'todo_items_*',
    'notif_data_*',
    'panel_state_*',  // Pozice panelů (může obsahovat citlivé údaje)

    // 💰 POKLADNA: Citlivá finanční data konkrétního uživatele
    'cashbook_*',           // Všechny pokladní knihy všech uživatelů
    'cashbook_selector_*',  // Výběr pokladny/období

    // Cache s citlivými daty
    'orders_cache*',
    'users_cache*',
    'permissions_cache*',
    'financial_cache*',
    'calendar_order_counts*',  // 📅 Kalendářové počty objednávek (citlivá data)

    // 🔒 Per-user citlivé šablony a často používané hodnoty
    'order_templates*',    // 📋 Šablony objednávek (dodavatelé, částky, popisy)
    'frequent_suppliers*', // 🏢 Často používaní dodavatelé
    'user_templates*',     // 📝 Vlastní uživatelské šablony

    // Session-specifická data a user context
    'current_session_*',
    'active_user_*',
    'logged_user_*',
    'app_current_user_id',  // 🔒 KRITICKÉ: User ID musí být smazáno při logout
    'app_lastRoute',        // ⚠️ Poslední route může obsahovat per-user context
    'addressBook_activeTab_*', // 📇 Aktivní záložky address book (session state)

    // Dočasné soubory a uploady
    'temp_upload_*',
    'attachment_cache_*',
    'file_preview_*'
  ]
};

// Pomocná funkce - kontrola zda klíč odpovídá pattern
const matchesPattern = (key, patterns) => {
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(key);
    }
    return key === pattern;
  });
};

// Analýza současného stavu storage
export const analyzeStorageBeforeLogout = () => {
  const analysis = {
    localStorage: { keep: [], delete: [], unknown: [] },
    sessionStorage: { keep: [], delete: [], unknown: [] },
    totals: { keep: 0, delete: 0, unknown: 0 }
  };

  // Analýza localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    if (matchesPattern(key, LOGOUT_CLEANUP_CONFIG.KEEP_PATTERNS)) {
      analysis.localStorage.keep.push(key);
    } else if (matchesPattern(key, LOGOUT_CLEANUP_CONFIG.DELETE_PATTERNS)) {
      analysis.localStorage.delete.push(key);
    } else {
      analysis.localStorage.unknown.push(key);
    }
  }

  // Analýza sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key) continue;

    if (matchesPattern(key, LOGOUT_CLEANUP_CONFIG.KEEP_PATTERNS)) {
      analysis.sessionStorage.keep.push(key);
    } else if (matchesPattern(key, LOGOUT_CLEANUP_CONFIG.DELETE_PATTERNS)) {
      analysis.sessionStorage.delete.push(key);
    } else {
      analysis.sessionStorage.unknown.push(key);
    }
  }

  // Celkové počty
  analysis.totals.keep = analysis.localStorage.keep.length + analysis.sessionStorage.keep.length;
  analysis.totals.delete = analysis.localStorage.delete.length + analysis.sessionStorage.delete.length;
  analysis.totals.unknown = analysis.localStorage.unknown.length + analysis.sessionStorage.unknown.length;

  return analysis;
};

// Hlavní funkce - smart cleanup při odhlášení
export const performLogoutCleanup = (options = {}) => {
  const {
    dryRun = false,           // Pouze simulace bez skutečného mazání
    preserveUnknown = true,   // Zachovat neznámé klíče (bezpečnější)
    logActions = true         // Logovat akce
  } = options;

  const analysis = analyzeStorageBeforeLogout();
  const actions = [];

  // 1. Vyčistit veškerý sessionStorage (citlivá data)
  // 🎯 VÝJIMKA: Zachovat app_initialized (pro splash screen kontrolu)
  if (!dryRun) {
    const appInitialized = sessionStorage.getItem('app_initialized');
    sessionStorage.clear();
    if (appInitialized) {
      sessionStorage.setItem('app_initialized', appInitialized);
    }
    actions.push('Vyčištěn sessionStorage (zachován app_initialized)');
  } else {
    actions.push(`[DRY RUN] Vyčistil by se sessionStorage (${sessionStorage.length} items, zachován app_initialized)`);
  }

  // 2. Selektivní čištění localStorage
  const toDelete = analysis.localStorage.delete;
  const toKeep = analysis.localStorage.keep;

  if (!dryRun) {
    toDelete.forEach(key => {
      try {
        localStorage.removeItem(key);
        actions.push(`Smazán localStorage: ${key}`);
      } catch (error) {
      }
    });
  } else {
    actions.push(`[DRY RUN] Smazal by se localStorage: ${toDelete.join(', ')}`);
  }

  // 3. 🔒 KRITICKÉ: Explicitní čištění TODO a POZNÁMEK všech uživatelů!
  // Záloha proti úniku dat mezi uživateli - smaže VŠECHNY TODO/NOTES klíče
  if (!dryRun) {
    const explicitCleanupKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('layout_tasks_') ||
        key.includes('layout_notes_') ||
        key.includes('todo_items_') ||
        key.includes('notes_text_') ||
        key.includes('chat_messages_') ||
        key.includes('chat_data_') ||
        key.includes('notif_data_')
      ) && !toDelete.includes(key)) {
        explicitCleanupKeys.push(key);
      }
    }

    if (explicitCleanupKeys.length > 0) {
      explicitCleanupKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          actions.push(`🔒 Explicitně smazán citlivý obsah: ${key}`);
        } catch (error) {
        }
      });
    }
  }

  // 4. Rotovat šifrovací klíč (vynutit nový session seed)
  // ⚠️ POZOR: NEROTUJ encryption key - zneplatnilo by to existující drafty!
  // Drafty musí zůstat čitelné i po logout/login cyklu
  if (!dryRun) {
    // rotateEncryptionKey(); // ZAKOMENTOVÁNO - způsobovalo problémy s draft persistence
    // actions.push('Rotován šifrovací klíč (session seed)');
  }

  // 5. Vyčistit encryption cache v paměti
  if (!dryRun) {
    clearEncryptionCache();
    actions.push('Vyčištěn encryption cache');
  }

  return {
    analysis,
    actions,
    success: true
  };
};

// Funkce pro uložení současné pozice/stránky před odhlášením
export const saveCurrentLocation = () => {
  try {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;

    const locationData = {
      path: currentPath,
      search: currentSearch,
      hash: currentHash,
      timestamp: Date.now(),
      userAgent: navigator.userAgent.slice(0, 50) // Pro rozpoznání stejného prohlížeče
    };

    localStorage.setItem('last_location', JSON.stringify(locationData));
  } catch (error) {
  }
};

// Funkce pro obnovení pozice po přihlášení
export const restoreLastLocation = () => {
  try {
    const saved = localStorage.getItem('last_location');
    if (!saved) return null;

    const locationData = JSON.parse(saved);

    // Kontrola stáří (max 24h)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hodin
    if (Date.now() - locationData.timestamp > maxAge) {
      localStorage.removeItem('last_location');
      return null;
    }

    return {
      fullUrl: locationData.path + locationData.search + locationData.hash,
      path: locationData.path,
      isRecent: Date.now() - locationData.timestamp < 60 * 60 * 1000 // < 1 hodina
    };
  } catch (error) {
    return null;
  }
};

// Debug funkce pro vývojáře
export const debugStorageCleanup = () => {

  const analysis = analyzeStorageBeforeLogout();
  performLogoutCleanup({ dryRun: true, logActions: false });

};
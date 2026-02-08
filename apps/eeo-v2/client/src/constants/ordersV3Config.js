/**
 * ordersV3Config.js
 * 
 * 🎯 KONFIGURACE PRO ORDERS V3 MODULE
 * Centralizované konstanty místo hardcoded values
 */

export const ORDERS_V3_CONFIG = {
  // ============================================================================
  // PAGINATION
  // ============================================================================
  DEFAULT_ITEMS_PER_PAGE: 50,
  MIN_ITEMS_PER_PAGE: 10,
  MAX_ITEMS_PER_PAGE: 200,
  PAGINATION_OPTIONS: [10, 25, 50, 100, 200],

  // ============================================================================
  // PERFORMANCE & CACHING
  // ============================================================================
  DEBOUNCE_DELAY: 300, // ms - pro localStorage saves
  FILTER_DEBOUNCE_DELAY: 500, // ms - pro text inputy ve filtrech
  
  // API Request cache
  CACHE_TTL: 10000, // 10s - jak dlouho je request považován za fresh
  MAX_CACHE_ENTRIES: 50, // maximální počet cached requestů
  
  // Request deduplication
  REQUEST_TIMEOUT: 30000, // 30s timeout pro API calls
  
  // ============================================================================
  // VIRTUALIZACE (pro velké tabulky)
  // ============================================================================
  VIRTUALIZATION_THRESHOLD: 500, // aktivovat virtualizaci při 500+ řádcích
  ROW_HEIGHT: 60, // px - výška jednoho řádku tabulky
  OVERSCAN_COUNT: 5, // počet extra řádků k renderování mimo viewport
  CONTAINER_HEIGHT: 600, // px - výška virtual container

  // ============================================================================
  // COLUMN CONFIGURATION 
  // ============================================================================
  DEFAULT_COLUMN_ORDER: [
    'expander',
    'kontrola_komentare', // ✅ Kontrola + Komentáře (2026-02-08)
    'approve',
    'dt_objednavky',
    'cislo_objednavky',
    'financovani',
    'objednatel_garant',
    'prikazce_schvalovatel', 
    'dodavatel_nazev',
    'stav_objednavky',
    'stav_registru',
    'max_cena_s_dph',
    'cena_s_dph',
    'faktury_celkova_castka_s_dph',
    'actions'
  ],
  
  DEFAULT_COLUMN_VISIBILITY: {
    expander: true,
    kontrola_komentare: true, // ✅ Kontrola + Komentáře (2026-02-08)
    approve: true,
    dt_objednavky: true,
    cislo_objednavky: true,
    financovani: true,
    objednatel_garant: true,
    prikazce_schvalovatel: true,
    dodavatel_nazev: true,
    stav_objednavky: true,
    stav_registru: true,
    max_cena_s_dph: true,
    cena_s_dph: true,
    faktury_celkova_castka_s_dph: true,
    actions: true,
  },

  // ============================================================================
  // STORAGE KEYS
  // ============================================================================
  STORAGE_PREFIX: 'ordersV3_v3', // v3: Přidána kontrola_komentare column (2026-02-08)
  
  getStorageKey: (key, userId) => `ordersV3_v2_${key}_${userId}`,

  // ============================================================================
  // API ENDPOINTS (proti hardcoding)
  // ============================================================================
  API_ENDPOINTS: {
    LIST_ORDERS: '/api.eeo/v2025.03_25/orders-v3/list',
    FIND_ORDER_PAGE: '/api.eeo/v2025.03_25/orders-v3/find-page',
    ORDER_DETAIL_V2: '/api.eeo/v2025.03_25/orders-v2/detail',
    ORDER_DETAIL_V3: '/api.eeo/v2025.03_25/orders-v3/detail',
  },

  // ============================================================================
  // DEFAULT PREFERENCES
  // ============================================================================
  DEFAULT_PREFERENCES: {
    showDashboard: true,
    showFilters: false,
    dashboardMode: 'dynamic', // 'full' | 'dynamic' | 'compact'
    showRowColoring: true,
    itemsPerPage: 50,
    selectedPeriod: 'all',
    columnFilters: {
      // Multi-select arrays (user IDs)
      objednatel: [],
      garant: [],
      prikazce: [],
      schvalovatel: [],
      
      // Status array
      stav: [],
      
      // LP codes array
      lp_kody: [],
      
      // Date range
      dateFrom: '',
      dateTo: '',
      
      // Price range  
      amountFrom: '',
      amountTo: '',
      
      // Boolean flags
      maBytZverejneno: false,
      byloZverejneno: false,
      mimoradneObjednavky: false,
    },
    dashboardFilters: {
      filter_status: '',
      filter_my_orders: false,
      filter_archivovano: false,
    },
    expandedRows: {},
    columnVisibility: {
      expander: true,
      kontrola_komentare: true, // ✅ Kontrola + Komentáře (2026-02-08)
      approve: true,
      dt_objednavky: true,
      cislo_objednavky: true,
      financovani: true,
      objednatel_garant: true,
      prikazce_schvalovatel: true,
      dodavatel_nazev: true,
      stav_objednavky: true,
      stav_registru: true,
      max_cena_s_dph: true,
      cena_s_dph: true,
      faktury_celkova_castka_s_dph: true,
      actions: true,
    },
    columnOrder: [
      'expander',
      'kontrola_komentare', // ✅ Kontrola + Komentáře (2026-02-08)
      'approve',
      'dt_objednavky',
      'cislo_objednavky',
      'financovani',
      'objednatel_garant',
      'prikazce_schvalovatel',
      'dodavatel_nazev',
      'stav_objednavky',
      'stav_registru',
      'max_cena_s_dph',
      'cena_s_dph',
      'faktury_celkova_castka_s_dph',
      'actions'
    ],
    columnSizing: {}, // Uživatelem nastavené šířky sloupců (prázdné = default z columnDefs)
  },

  // ============================================================================
  // UI CONSTANTS
  // ============================================================================
  UI: {
    // Animation durations
    FADE_IN_DURATION: 300, // ms
    FILTER_TRANSITION_DURATION: 200, // ms
    HIGHLIGHT_DURATION: 3000, // ms pro highlight po návratu z editace
    
    // Loading states
    INITIALIZATION_DELAY: 300, // ms před zobrazením obsahu
    
    // Error retry
    ERROR_RETRY_DELAY: 2000, // ms
  },

  // ============================================================================
  // PERMISSION CONSTANTS
  // ============================================================================
  PERMISSIONS: {
    // Order management
    ORDER_EDIT_ALL: 'ORDER_EDIT_ALL',
    ORDER_EDIT_OWN: 'ORDER_EDIT_OWN',
    ORDER_EDIT_SUBORDINATE: 'ORDER_EDIT_SUBORDINATE',
    ORDER_READ_SUBORDINATE: 'ORDER_READ_SUBORDINATE',
    ORDER_MANAGE: 'ORDER_MANAGE',
    ORDER_DELETE_ALL: 'ORDER_DELETE_ALL',
    ORDER_DELETE_OWN: 'ORDER_DELETE_OWN',
    ORDER_2025: 'ORDER_2025',
    
    // Invoice management
    INVOICE_MANAGE: 'INVOICE_MANAGE',
    INVOICE_ADD: 'INVOICE_ADD',
    
    // Admin
    ADMINI: 'ADMINI',
  },

  // ============================================================================
  // WORKFLOW STATES
  // ============================================================================
  WORKFLOW_STATES: {
    // Allowed states for invoice creation
    INVOICE_ALLOWED: ['FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA'],
    
    // Invalid states (cancelled/rejected/completed)
    INVOICE_INVALID: ['STORNOVANA', 'ZAMITNUTA', 'DOKONCENA'],
    
    // Export document allowed states
    EXPORT_ALLOWED: [
      'ROZPRACOVANA', 'POTVRZENA', 'ODESLANA', 'UVEREJNIT', 'UVEREJNENA',
      'NEUVEREJNIT', 'FAKTURACE', 'VECNA_SPRAVNOST', 'DOKONCENA', 
      'ZKONTROLOVANA', 'CEKA_SE'
    ],
  },
};

export default ORDERS_V3_CONFIG;
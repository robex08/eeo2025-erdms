/**
 * User Settings API Service
 * Backend endpoint: /user/settings
 * Dokumentace: podklady/API-UZIVATEL-NASTAVENI-BACKEND.md
 */

import axios from 'axios';

// Axios instance pro User Settings API
const settingsApi = axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo/',
  headers: { 
    'Content-Type': 'application/json',
    'X-Endpoint': 'user/settings'
  }
});

// ⚠️ ŽÁDNÝ interceptor pro authError - chyby při načítání nastavení NESMÍ odhlásit uživatele
// Endpoint /user/settings je implementován na BE, ale pokud selže, použije se localStorage fallback

/**
 * Výchozí nastavení - PŘESNÁ KOPIE z BE dokumentace
 * Používá se jako fallback pokud API selže
 */
export const DEFAULT_USER_SETTINGS = {
  verze: '1.0',
  chovani_aplikace: {
    zapamatovat_filtry: true,
    vychozi_sekce_po_prihlaseni: 'orders',
    vychozi_filtry_stavu_objednavek: [],
    auto_sbalit_zamcene_sekce: true
  },
  zobrazeni_dlazic: {
    nova: true,
    ke_schvaleni: true,
    schvalena: true,
    zamitnuta: true,
    rozpracovana: true,
    odeslana_dodavateli: true,
    potvrzena_dodavatelem: true,
    k_uverejneni_do_registru: true,
    uverejnena: true,
    ceka_na_potvrzeni: true,
    ceka_se: true,
    vecna_spravnost: true,
    dokoncena: true,
    zrusena: true,
    smazana: true,
    archivovano: true,
    s_fakturou: true,
    s_prilohami: true,
    moje_objednavky: true
  },
  export_csv: {
    oddelovac: 'semicolon',
    vlastni_oddelovac: '',
    oddelovac_seznamu: 'pipe',
    vlastni_oddelovac_seznamu: '',
    sloupce: {
      zakladni_identifikace: {
        id: true,
        cislo_objednavky: true
      },
      predmet_a_popis: {
        predmet: true,
        poznamka: false
      },
      stavy_a_workflow: {
        stav_objednavky: true,
        stav_workflow: false,
        stav_komentar: false
      },
      datumy: {
        dt_objednavky: true,
        dt_vytvoreni: true,
        dt_schvaleni: false
      },
      financni_udaje: {
        max_cena_s_dph: true,
        celkova_cena_bez_dph: false,
        celkova_cena_s_dph: true
      },
      lide: {
        objednatel: true,
        objednatel_email: false
      },
      dodavatel: {
        dodavatel_nazev: true,
        dodavatel_ico: false
      },
      strediska_a_struktura: {
        strediska: true,
        strediska_nazvy: false
      },
      polozky_objednavky: {
        pocet_polozek: true,
        polozky_celkova_cena_s_dph: true
      },
      prilohy: {
        prilohy_count: false
      },
      faktury: {
        faktury_count: false
      },
      potvrzeni_a_odeslani: {
        stav_odeslano: false
      },
      registr_smluv: {
        zverejnit_registr_smluv: false
      },
      ostatni: {
        zaruka: false
      }
    }
  },
  export_pokladna: {
    format: 'xlsx'
  }
};

/**
 * Získá klíč pro localStorage podle user_id
 */
const getLocalStorageKey = (userId) => {
  return `user_settings_${userId}`;
};

/**
 * Načte nastavení z localStorage
 * @param {number} userId - ID uživatele
 * @returns {object|null} Nastavení nebo null
 */
export const loadSettingsFromLocalStorage = (userId) => {
  try {
    const key = getLocalStorageKey(userId);
    const stored = localStorage.getItem(key);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.error('[UserSettings] Chyba při čtení z localStorage:', error);
    return null;
  }
};

/**
 * Uloží nastavení do localStorage
 * @param {number} userId - ID uživatele
 * @param {object} settings - Nastavení k uložení
 */
export const saveSettingsToLocalStorage = (userId, settings) => {
  try {
    const key = getLocalStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.error('[UserSettings] Chyba při zápisu do localStorage:', error);
  }
};

/**
 * Smaže nastavení z localStorage (při odhlášení)
 * @param {number} userId - ID uživatele
 */
export const clearSettingsFromLocalStorage = (userId) => {
  try {
    const key = getLocalStorageKey(userId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('[UserSettings] Chyba při mazání z localStorage:', error);
  }
};

/**
 * Načte uživatelská nastavení z backendu
 * GET /user/settings
 * 
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {number} userId - ID uživatele (pro localStorage fallback)
 * @returns {Promise<object>} Nastavení
 */
export const fetchUserSettings = async ({ token, username, userId }) => {
  try {
    const response = await settingsApi.get('/user/settings', {
      params: { token, username }
    });
    
    // ✅ PODPORA PRO response.data.status === 'ok'
    if (response.data.status === 'ok') {
      // ⚠️ FALLBACK: Pokud backend vrátí null nebo prázdné nastavení, vrať výchozí
      const settings = response.data.data?.nastaveni || null;
      
      // Pokud je nastavení null nebo prázdné, použij výchozí z localStorage nebo výchozí default
      if (!settings || Object.keys(settings).length === 0) {
        console.warn('[UserSettings] ⚠️ Backend vrátil prázdné nastavení - použijí se výchozí');
        const localSettings = loadSettingsFromLocalStorage(userId);
        if (localSettings) {
          return localSettings;
        }
        // Výchozí nastavení
        return {
          theme: 'light',
          language: 'cs',
          notifications: { email: true, inapp: true },
          vychozi_sekce_po_prihlaseni: 'orders'
        };
      }
      
      // 🔧 EXTRAKCE: Vyextrahuj .value z objektů před uložením do localStorage
      const cleanedSettings = { ...settings };
      
      // Extrahuj rok
      if (settings.vychozi_rok && typeof settings.vychozi_rok === 'object' && settings.vychozi_rok.value) {
        cleanedSettings.vychozi_rok = settings.vychozi_rok.value;
      }
      
      // Extrahuj období
      if (settings.vychozi_obdobi && typeof settings.vychozi_obdobi === 'object' && settings.vychozi_obdobi.value) {
        cleanedSettings.vychozi_obdobi = settings.vychozi_obdobi.value;
      }
      
      // Extrahuj sekci
      if (settings.vychozi_sekce_po_prihlaseni && typeof settings.vychozi_sekce_po_prihlaseni === 'object' && settings.vychozi_sekce_po_prihlaseni.value) {
        cleanedSettings.vychozi_sekce_po_prihlaseni = settings.vychozi_sekce_po_prihlaseni.value;
      }
      
      // Extrahuj filtry stavů (array)
      if (settings.vychozi_filtry_stavu_objednavek && Array.isArray(settings.vychozi_filtry_stavu_objednavek)) {
        cleanedSettings.vychozi_filtry_stavu_objednavek = settings.vychozi_filtry_stavu_objednavek.map(item => {
          if (typeof item === 'object' && item !== null && item.value) {
            return item.value;
          }
          return item;
        });
      }
      
      // Uložit VYČIŠTĚNÁ data do localStorage
      saveSettingsToLocalStorage(userId, cleanedSettings);
      
      return cleanedSettings;
    }
    
    // ⚠️ FALLBACK: Backend vrátil neočekávanou strukturu
    console.warn('[UserSettings] ⚠️ Neplatná odpověď z API - použije se fallback');
    const localSettings = loadSettingsFromLocalStorage(userId);
    if (localSettings) {
      return localSettings;
    }
    
    // Výchozí nastavení jako poslední fallback
    return {
      theme: 'light',
      language: 'cs',
      notifications: { email: true, inapp: true },
      vychozi_sekce_po_prihlaseni: 'orders'
    };
    
  } catch (error) {
    console.error('[UserSettings] ❌ Chyba při načítání z API:', error);
    
    // Fallback: zkusit localStorage
    const localSettings = loadSettingsFromLocalStorage(userId);
    if (localSettings) {
      return localSettings;
    }
    
    // Fallback: výchozí nastavení
    return DEFAULT_USER_SETTINGS;
  }
};

/**
 * Uloží uživatelská nastavení do backendu
 * POST /user/settings
 * 
 * @param {string} token - Auth token
 * @param {string} username - Username
 * @param {number} userId - ID uživatele (pro localStorage)
 * @param {object} nastaveni - Nastavení k uložení
 * @returns {Promise<object>} Response
 */
export const saveUserSettings = async ({ token, username, userId, nastaveni }) => {
  try {
    const response = await settingsApi.post('/user/settings', {
      token,
      username,
      nastaveni
    });
    
    if (response.data.status === 'ok') {
      // Uložit do localStorage
      saveSettingsToLocalStorage(userId, nastaveni);
      
      return response.data;
    }
    
    throw new Error(response.data.message || 'Chyba při ukládání');
    
  } catch (error) {
    console.error('[UserSettings] ❌ Chyba při ukládání do API:', error);
    if (error.response) {
      console.error('[UserSettings] Backend error response:', error.response.data);
    }
    throw error;
  }
};

/**
 * Transformuje backend JSON strukturu do frontend userSettings formátu
 * (pro zpětnou kompatibilitu s ProfilePage)
 */
export const transformBackendToFrontend = (backendData) => {
  if (!backendData) return null;
  
  return {
    // Chování aplikace
    rememberFilters: backendData.chovani_aplikace?.zapamatovat_filtry ?? true,
    defaultMenuTab: backendData.chovani_aplikace?.vychozi_sekce_po_prihlaseni ?? 'orders',
    defaultOrderStatus: backendData.chovani_aplikace?.vychozi_filtry_stavu_objednavek ?? [],
    autoCollapseLockedSections: backendData.chovani_aplikace?.auto_sbalit_zamcene_sekce ?? true,
    
    // Viditelnost dlaždic
    visibleTiles: backendData.zobrazeni_dlazic ?? {},
    
    // Export CSV - flatten sloupce
    exportCsvDelimiter: backendData.export_csv?.oddelovac ?? 'semicolon',
    exportCsvCustomDelimiter: backendData.export_csv?.vlastni_oddelovac ?? '',
    exportCsvListDelimiter: backendData.export_csv?.oddelovac_seznamu ?? 'pipe',
    exportCsvListCustomDelimiter: backendData.export_csv?.vlastni_oddelovac_seznamu ?? '',
    exportCsvColumns: flattenCsvColumns(backendData.export_csv?.sloupce ?? {}),
    
    // Export pokladna
    exportCashbookFormat: backendData.export_pokladna?.format ?? 'xlsx'
  };
};

/**
 * Převede vnořené sloupce na ploché
 */
const flattenCsvColumns = (nestedColumns) => {
  const flat = {};
  Object.values(nestedColumns).forEach(section => {
    Object.assign(flat, section);
  });
  return flat;
};

/**
 * Transformuje frontend userSettings do backend JSON struktury
 */
export const transformFrontendToBackend = (userSettings) => {
  if (!userSettings) return DEFAULT_USER_SETTINGS;
  
  return {
    verze: '1.0',
    chovani_aplikace: {
      zapamatovat_filtry: userSettings.rememberFilters ?? true,
      vychozi_sekce_po_prihlaseni: userSettings.defaultMenuTab ?? 'orders',
      vychozi_filtry_stavu_objednavek: userSettings.defaultOrderStatus ?? [],
      auto_sbalit_zamcene_sekce: userSettings.autoCollapseLockedSections ?? true
    },
    zobrazeni_dlazic: userSettings.visibleTiles ?? DEFAULT_USER_SETTINGS.zobrazeni_dlazic,
    export_csv: {
      oddelovac: userSettings.exportCsvDelimiter ?? 'semicolon',
      vlastni_oddelovac: userSettings.exportCsvCustomDelimiter ?? '',
      oddelovac_seznamu: userSettings.exportCsvListDelimiter ?? 'pipe',
      vlastni_oddelovac_seznamu: userSettings.exportCsvListCustomDelimiter ?? '',
      sloupce: groupCsvColumns(userSettings.exportCsvColumns ?? {})
    },
    export_pokladna: {
      format: userSettings.exportCashbookFormat ?? 'xlsx'
    }
  };
};

/**
 * Seskupí ploché sloupce do kategorií
 */
const groupCsvColumns = (flatColumns) => {
  // Vezmi výchozí strukturu a naplň ji hodnotami z flatColumns
  const grouped = { ...DEFAULT_USER_SETTINGS.export_csv.sloupce };
  
  Object.keys(grouped).forEach(category => {
    Object.keys(grouped[category]).forEach(column => {
      if (flatColumns.hasOwnProperty(column)) {
        grouped[category][column] = flatColumns[column];
      }
    });
  });
  
  return grouped;
};

# 🚀 STORAGE REFACTORING - KOMPLETNÍ PLÁN

**Datum:** 19. října 2025  
**Verze:** 1.0  
**Status:** READY TO IMPLEMENT

---

## 🎯 CÍLE REFACTORINGU

### 1. **PERSISTENCE PO ODHLÁŠENÍ (Per-User)**
- ✅ **Koncepty objednávek** - šifrované, per-user, přežijí odhlášení
- ✅ **UI nastavení** - filtry, zobrazení, paginace, per-user
- ✅ **Odolné vůči F5** - vše se obnoví po refreshi

### 2. **SESSION DATA (Vymaže se po odhlášení)**
- ❌ **TODO úkoly** - reload z DB po F5
- ❌ **Notifikace** - reload z DB po F5
- ❌ **Poznámky** - reload z DB po F5

### 3. **BEZPEČNOST & VÝKON (P0 + P1)**
- ✅ Session seed přesunout z sessionStorage
- ✅ Sloučit cache systémy
- ✅ TTL pro číselníky
- ✅ Cleanup pro metadata

---

## 📦 NOVÁ STRUKTURA ÚLOŽIŠŤ

### 🔐 LOCALSTORAGE (Persistent per-user)

```javascript
// ============================================
// KATEGORIE 1: AUTENTIFIKACE (Šifrované)
// ============================================
auth_token_persistent         // JWT token (7 dní) ✅ ŠIFROVANÝ
auth_user_persistent          // User info ✅ ŠIFROVANÝ
auth_user_detail_persistent   // User detail ✅ ŠIFROVANÝ
auth_user_permissions_persistent // Permissions ✅ ŠIFROVANÝ

// ============================================
// KATEGORIE 2: KONCEPTY OBJEDNÁVEK (Šifrované, Per-User)
// ============================================
// Pattern: order_draft_{type}_{userId}_{orderId?}
order_draft_new_42                    // Nový koncept ✅ ŠIFROVANÝ
order_draft_edit_42_12345            // Editace existující ✅ ŠIFROVANÝ
order_draft_new_42_attachments       // Přílohy konceptu ✅ ŠIFROVANÝ
order_draft_new_42_metadata          // Metadata (timestamp, step) ❌ NEŠIFROVANÝ

// Příklad obsahu:
{
  formData: { ... },           // Kompletní formulářová data
  timestamp: 1729350000000,    // Kdy uloženo
  step: 2,                     // Aktuální krok formuláře
  version: 1                   // Verze struktury dat
}

// ============================================
// KATEGORIE 3: UI NASTAVENÍ (Per-User, Nešifrované)
// ============================================
// Pattern: ui_{component}_{userId}

// Orders25List nastavení
ui_orders25_42_filters           // Všechny filtry v jednom JSON
ui_orders25_42_view              // Zobrazení (dashboard, compact, ...)
ui_orders25_42_pagination        // Paginace (pageSize, pageIndex)
ui_orders25_42_columns           // Viditelnost sloupců
ui_orders25_42_sorting           // Řazení

// Příklad ui_orders25_42_filters:
{
  global: "faktura",
  status: ["schvaleno"],
  user: null,
  dateFrom: "2025-01-01",
  dateTo: "2025-12-31",
  rok: 2025,
  mesic: null,
  objednatel: null,
  garant: null,
  schvalovatel: null,
  amountFrom: null,
  amountTo: null,
  showArchived: false,
  timestamp: 1729350000000  // Pro tracking změn
}

// Orders (starý systém) nastavení
ui_orders_42_filters
ui_orders_42_view
ui_orders_42_pagination

// ============================================
// KATEGORIE 4: CACHE & ČÍSELNÍKY (Globální, TTL)
// ============================================
cache_approvers               // TTL: 1 hodina
cache_users                   // TTL: 1 hodina
cache_suppliers               // TTL: 1 hodina (ARES data)
cache_locations               // TTL: 1 hodina
cache_orderTypes              // TTL: 1 hodina
cache_financing               // TTL: 1 hodina

// Struktura s TTL:
{
  data: [...],
  timestamp: 1729350000000,
  ttl: 3600000,  // 1 hodina
  version: 1
}

// ============================================
// KATEGORIE 5: CACHE METADATA (Orders cache)
// ============================================
cache_meta_orders_42_2025_3   // Metadata pro orders cache (user:42, rok:2025, měsíc:3)
// Pouze: { timestamp, inMemory: true, version: 1 }

// ============================================
// KATEGORIE 6: PREFERENCES (Globální, Per-User)
// ============================================
prefs_42_theme                // Dark/light theme
prefs_42_language             // cs/en
prefs_42_notifications        // Zapnuto/vypnuto
```

---

### 💾 SESSIONSTORAGE (Pouze dočasná data)

```javascript
// ❌ VYPRÁZDNĚNO - už se nepoužívá!
// _session_seed → Přesunuto do memory
// orders_cache_backup → DEPRECATED
```

---

### 🧠 MEMORY (Runtime cache)

```javascript
// ============================================
// Unified Cache Service
// ============================================
window._cacheService = {
  orders: new Map(),        // Orders cache (TTL 10 min)
  sessionSeed: null,        // ✅ NOVĚ - session seed pro encryption
  memory: {
    approvers: null,
    users: null,
    suppliers: null
  }
}
```

---

## 🔧 IMPLEMENTACE - FÁZE PO FÁZI

---

## 📅 FÁZE 1: BEZPEČNOST (P0) - 3 dny

### ✅ Krok 1.1: Přesunout session seed z sessionStorage

**Soubor:** `src/utils/encryption.js`

**PŘED:**
```javascript
let sessionSeed = sessionStorage.getItem('_session_seed');
if (!sessionSeed) {
  sessionSeed = Date.now().toString() + Math.random().toString(36);
  sessionStorage.setItem('_session_seed', sessionSeed);
}
```

**PO:**
```javascript
// Globální memory storage pro session seed
if (!window._securityContext) {
  window._securityContext = {
    sessionSeed: null,
    sessionStart: Date.now()
  };
}

const generateSessionKey = async () => {
  // Vytvoř seed jen pokud neexistuje
  if (!window._securityContext.sessionSeed) {
    window._securityContext.sessionSeed = 
      Date.now().toString() + 
      Math.random().toString(36) + 
      crypto.getRandomValues(new Uint8Array(16)).join('');
  }
  
  const seed = window._securityContext.sessionSeed;
  
  // Zbytek zůstává stejný...
  const screenData = window.screen || { width: 1920, height: 1080 };
  const data = [
    navigator.userAgent,
    navigator.language,
    screenData.width,
    screenData.height,
    seed,  // ✅ Z memory, ne sessionStorage!
    window.location.origin
  ].join('|');
  
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  
  return await crypto.subtle.importKey(
    'raw', keyData, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  );
};
```

**Test:**
```javascript
// DevTools console:
console.log(window._securityContext.sessionSeed); // ✅ Viditelné
console.log(sessionStorage.getItem('_session_seed')); // ❌ null
```

---

### ✅ Krok 1.2: Implementovat key rotation

**Soubor:** `src/utils/encryption.js`

```javascript
// Přidat funkci pro rotaci klíče
export const rotateEncryptionKey = () => {
  if (window._securityContext) {
    console.log('🔄 Rotating encryption key...');
    window._securityContext.sessionSeed = null; // Vynutit nový seed
    window._securityContext.sessionStart = Date.now();
  }
};

// Automatická rotace každých 24 hodin
setInterval(() => {
  const now = Date.now();
  const elapsed = now - (window._securityContext?.sessionStart || now);
  
  if (elapsed > 24 * 60 * 60 * 1000) { // 24 hodin
    console.warn('🔑 Encryption key expired, rotating...');
    rotateEncryptionKey();
  }
}, 60 * 60 * 1000); // Check každou hodinu
```

**Integrace do logout:**

**Soubor:** `src/utils/logoutCleanup.js`

```javascript
import { rotateEncryptionKey } from './encryption';

export const performLogout = async () => {
  // ... existující cleanup ...
  
  // Rotovat encryption key při logout
  rotateEncryptionKey();
  
  console.log('✅ Logout complete, encryption key rotated');
};
```

---

## 📅 FÁZE 2: KONCEPTY OBJEDNÁVEK (P1) - 5 dní

### ✅ Krok 2.1: Vytvořit DraftStorageService

**Nový soubor:** `src/services/draftStorageService.js`

```javascript
/**
 * Draft Storage Service
 * 
 * Správa konceptů objednávek s per-user persistence
 * - Šifrované ukládání
 * - Přežití F5 a odhlášení
 * - Automatické cleanup starých konceptů
 */

import { encryptData, decryptData } from '../utils/encryption';

class DraftStorageService {
  constructor() {
    this.config = {
      maxDraftAge: 30 * 24 * 60 * 60 * 1000, // 30 dní
      autoSaveDelay: 2000, // 2 sekundy debounce
      debug: process.env.NODE_ENV === 'development'
    };
    
    this.autoSaveTimers = new Map();
  }
  
  /**
   * Generuje klíč pro draft
   */
  _getDraftKey(userId, type = 'new', orderId = null) {
    if (!userId) throw new Error('userId is required');
    
    if (type === 'new') {
      return `order_draft_new_${userId}`;
    } else if (type === 'edit' && orderId) {
      return `order_draft_edit_${userId}_${orderId}`;
    } else {
      throw new Error('Invalid draft type or missing orderId');
    }
  }
  
  /**
   * Uloží draft (šifrovaně)
   */
  async saveDraft(userId, formData, options = {}) {
    const {
      type = 'new',
      orderId = null,
      step = 0,
      attachments = []
    } = options;
    
    try {
      const key = this._getDraftKey(userId, type, orderId);
      
      const draftData = {
        formData,
        timestamp: Date.now(),
        step,
        type,
        orderId,
        version: 1
      };
      
      // Šifruj data
      const encrypted = await encryptData(JSON.stringify(draftData));
      
      if (!encrypted) {
        console.warn('⚠️ Encryption failed, saving unencrypted');
        localStorage.setItem(key, JSON.stringify(draftData));
      } else {
        localStorage.setItem(key, encrypted);
      }
      
      // Metadata (nešifrované - pro rychlý přehled)
      const metaKey = `${key}_metadata`;
      localStorage.setItem(metaKey, JSON.stringify({
        timestamp: Date.now(),
        step,
        hasAttachments: attachments.length > 0,
        type,
        orderId
      }));
      
      // Přílohy (šifrované, samostatně)
      if (attachments.length > 0) {
        const attachKey = `${key}_attachments`;
        const encryptedAttach = await encryptData(JSON.stringify(attachments));
        if (encryptedAttach) {
          localStorage.setItem(attachKey, encryptedAttach);
        }
      }
      
      if (this.config.debug) {
        console.log(`💾 Draft saved: ${key}`, {
          size: encrypted?.length || 0,
          step,
          attachments: attachments.length
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save draft:', error);
      return false;
    }
  }
  
  /**
   * Načte draft (dešifruje)
   */
  async loadDraft(userId, type = 'new', orderId = null) {
    try {
      const key = this._getDraftKey(userId, type, orderId);
      const encrypted = localStorage.getItem(key);
      
      if (!encrypted) return null;
      
      // Pokus o dešifrování
      let decrypted = await decryptData(encrypted);
      
      if (!decrypted) {
        // Fallback - možná to je nešifrované (stará verze)
        try {
          decrypted = encrypted;
        } catch {
          console.error('❌ Failed to decrypt draft');
          return null;
        }
      }
      
      const draftData = typeof decrypted === 'string' 
        ? JSON.parse(decrypted) 
        : decrypted;
      
      // Načti přílohy pokud existují
      const attachKey = `${key}_attachments`;
      const attachEncrypted = localStorage.getItem(attachKey);
      
      if (attachEncrypted) {
        const attachDecrypted = await decryptData(attachEncrypted);
        draftData.attachments = attachDecrypted 
          ? JSON.parse(attachDecrypted) 
          : [];
      }
      
      if (this.config.debug) {
        console.log(`📂 Draft loaded: ${key}`, {
          age: Date.now() - draftData.timestamp,
          step: draftData.step
        });
      }
      
      return draftData;
    } catch (error) {
      console.error('❌ Failed to load draft:', error);
      return null;
    }
  }
  
  /**
   * Auto-save s debounce
   */
  autoSave(userId, formData, options = {}) {
    const key = this._getDraftKey(userId, options.type, options.orderId);
    
    // Zruš předchozí timer
    if (this.autoSaveTimers.has(key)) {
      clearTimeout(this.autoSaveTimers.get(key));
    }
    
    // Nastav nový timer
    const timer = setTimeout(() => {
      this.saveDraft(userId, formData, options);
      this.autoSaveTimers.delete(key);
    }, this.config.autoSaveDelay);
    
    this.autoSaveTimers.set(key, timer);
  }
  
  /**
   * Smaže draft
   */
  deleteDraft(userId, type = 'new', orderId = null) {
    const key = this._getDraftKey(userId, type, orderId);
    
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_metadata`);
    localStorage.removeItem(`${key}_attachments`);
    
    if (this.config.debug) {
      console.log(`🗑️ Draft deleted: ${key}`);
    }
  }
  
  /**
   * Seznam všech draftů uživatele
   */
  listDrafts(userId) {
    const drafts = [];
    const prefix = `order_draft_`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key?.startsWith(prefix) && 
          key.includes(`_${userId}`) && 
          key.endsWith('_metadata')) {
        
        const meta = JSON.parse(localStorage.getItem(key));
        drafts.push({
          key: key.replace('_metadata', ''),
          ...meta
        });
      }
    }
    
    return drafts.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Vyčistí staré drafty (30+ dní)
   */
  cleanupOldDrafts(userId = null) {
    const now = Date.now();
    let cleaned = 0;
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      
      if (key?.startsWith('order_draft_') && key.endsWith('_metadata')) {
        // Zkontroluj userId filter
        if (userId && !key.includes(`_${userId}`)) continue;
        
        try {
          const meta = JSON.parse(localStorage.getItem(key));
          const age = now - meta.timestamp;
          
          if (age > this.config.maxDraftAge) {
            const draftKey = key.replace('_metadata', '');
            this.deleteDraft(
              userId, 
              meta.type, 
              meta.orderId
            );
            cleaned++;
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse draft metadata:', key);
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old drafts`);
    }
    
    return cleaned;
  }
  
  /**
   * Kontrola existence draftu
   */
  hasDraft(userId, type = 'new', orderId = null) {
    const key = this._getDraftKey(userId, type, orderId);
    return localStorage.getItem(key) !== null;
  }
}

// Singleton instance
const draftStorageService = new DraftStorageService();

// Export
export default draftStorageService;

// Auto-cleanup při startu (1x denně)
setInterval(() => {
  draftStorageService.cleanupOldDrafts();
}, 24 * 60 * 60 * 1000);
```

---

### ✅ Krok 2.2: Integrace do OrderFormComponent

**Soubor:** `src/forms/OrderFormComponent.js`

```javascript
import draftStorageService from '../services/draftStorageService';

// V komponentě:
const OrderFormComponent = () => {
  const { user_id } = useContext(UserContext);
  const [formData, setFormData] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  
  // ============================================
  // NAČTENÍ DRAFTU PRI MOUNT
  // ============================================
  useEffect(() => {
    const loadDraft = async () => {
      if (!user_id) return;
      
      // Zkontroluj URL - editace existující objednávky?
      const orderId = new URLSearchParams(window.location.search).get('edit');
      const type = orderId ? 'edit' : 'new';
      
      const draft = await draftStorageService.loadDraft(
        user_id, 
        type, 
        orderId
      );
      
      if (draft) {
        console.log('📂 Loading draft from storage...', draft);
        
        // Zobraz confirm dialog
        const shouldLoad = window.confirm(
          `Nalezen uložený koncept z ${new Date(draft.timestamp).toLocaleString()}.\n\n` +
          `Chcete pokračovat v práci na konceptu?`
        );
        
        if (shouldLoad) {
          setFormData(draft.formData);
          setCurrentStep(draft.step);
          
          if (draft.attachments) {
            setAttachments(draft.attachments);
          }
          
          toast.success('Koncept byl načten');
        } else {
          // Uživatel nechce draft - smazat?
          const shouldDelete = window.confirm(
            'Chcete smazat uložený koncept?'
          );
          
          if (shouldDelete) {
            draftStorageService.deleteDraft(user_id, type, orderId);
            toast.info('Koncept byl smazán');
          }
        }
      }
    };
    
    loadDraft();
  }, [user_id]);
  
  // ============================================
  // AUTO-SAVE PŘI ZMĚNĚ FORMDATA
  // ============================================
  useEffect(() => {
    if (!user_id || !formData || Object.keys(formData).length === 0) return;
    
    // Debounced auto-save
    const orderId = formData.id; // Pokud editujeme existující
    const type = orderId ? 'edit' : 'new';
    
    draftStorageService.autoSave(user_id, formData, {
      type,
      orderId,
      step: currentStep,
      attachments
    });
    
  }, [formData, currentStep, user_id, attachments]);
  
  // ============================================
  // SMAZAT DRAFT PO ÚSPĚŠNÉM ULOŽENÍ
  // ============================================
  const handleSubmit = async () => {
    try {
      // Ulož objednávku do DB
      await saveOrder(formData);
      
      // SMAZAT DRAFT z localStorage
      const orderId = formData.id;
      const type = orderId ? 'edit' : 'new';
      
      draftStorageService.deleteDraft(user_id, type, orderId);
      
      toast.success('Objednávka byla uložena');
      navigate('/orders25list');
      
    } catch (error) {
      console.error('Failed to save order:', error);
      toast.error('Chyba při ukládání');
    }
  };
  
  // ============================================
  // MANUAL SAVE DRAFT (Tlačítko "Uložit koncept")
  // ============================================
  const handleSaveDraft = async () => {
    const orderId = formData.id;
    const type = orderId ? 'edit' : 'new';
    
    const success = await draftStorageService.saveDraft(
      user_id, 
      formData, 
      {
        type,
        orderId,
        step: currentStep,
        attachments
      }
    );
    
    if (success) {
      toast.success('Koncept byl uložen');
    } else {
      toast.error('Nepodařilo se uložit koncept');
    }
  };
  
  return (
    <div>
      {/* ... formulář ... */}
      
      <button onClick={handleSaveDraft}>
        💾 Uložit koncept
      </button>
      
      <button onClick={handleSubmit}>
        ✅ Odeslat objednávku
      </button>
    </div>
  );
};
```

---

## 📅 FÁZE 3: UI NASTAVENÍ (P1) - 4 dny

### ✅ Krok 3.1: Vytvořit UISettingsService

**Nový soubor:** `src/services/uiSettingsService.js`

```javascript
/**
 * UI Settings Service
 * 
 * Správa UI nastavení per-user s persistence
 * - Filtry, zobrazení, paginace
 * - Přežití F5 a odhlášení
 * - Nešifrované (není citlivé)
 */

class UISettingsService {
  constructor() {
    this.config = {
      debug: process.env.NODE_ENV === 'development'
    };
  }
  
  /**
   * Generuje klíč pro nastavení
   */
  _getKey(component, userId, setting) {
    if (!userId) throw new Error('userId is required');
    return `ui_${component}_${userId}_${setting}`;
  }
  
  /**
   * Uloží nastavení
   */
  save(component, userId, setting, value) {
    try {
      const key = this._getKey(component, userId, setting);
      const data = {
        value,
        timestamp: Date.now(),
        version: 1
      };
      
      localStorage.setItem(key, JSON.stringify(data));
      
      if (this.config.debug) {
        console.log(`⚙️ UI setting saved: ${key}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save UI setting:', error);
      return false;
    }
  }
  
  /**
   * Načte nastavení
   */
  load(component, userId, setting, defaultValue = null) {
    try {
      const key = this._getKey(component, userId, setting);
      const stored = localStorage.getItem(key);
      
      if (!stored) return defaultValue;
      
      const data = JSON.parse(stored);
      return data.value ?? defaultValue;
      
    } catch (error) {
      console.error('❌ Failed to load UI setting:', error);
      return defaultValue;
    }
  }
  
  /**
   * Smaže nastavení
   */
  delete(component, userId, setting) {
    const key = this._getKey(component, userId, setting);
    localStorage.removeItem(key);
  }
  
  /**
   * Smaže všechna nastavení komponenty
   */
  deleteAll(component, userId) {
    const prefix = `ui_${component}_${userId}_`;
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  }
}

// Singleton
const uiSettingsService = new UISettingsService();
export default uiSettingsService;
```

---

### ✅ Krok 3.2: Integrace do Orders25List

**Soubor:** `src/pages/Orders25List.js`

```javascript
import uiSettingsService from '../services/uiSettingsService';

const Orders25List = () => {
  const { user_id } = useContext(UserContext);
  
  // ============================================
  // FILTRY - Load z localStorage
  // ============================================
  const [filters, setFilters] = useState(() => {
    if (!user_id) return defaultFilters;
    
    return uiSettingsService.load('orders25', user_id, 'filters', {
      global: '',
      status: [],
      user: null,
      dateFrom: '',
      dateTo: '',
      rok: new Date().getFullYear(),
      mesic: null,
      objednatel: null,
      garant: null,
      schvalovatel: null,
      amountFrom: null,
      amountTo: null,
      showArchived: false
    });
  });
  
  // Auto-save filtry při změně
  useEffect(() => {
    if (!user_id) return;
    
    uiSettingsService.save('orders25', user_id, 'filters', filters);
  }, [filters, user_id]);
  
  // ============================================
  // ZOBRAZENÍ - Load z localStorage
  // ============================================
  const [view, setView] = useState(() => {
    if (!user_id) return defaultView;
    
    return uiSettingsService.load('orders25', user_id, 'view', {
      showDashboard: true,
      dashboardCompact: false,
      showFiltersPanel: true,
      showRowHighlighting: true,
      showRowStriping: true,
      showExpandedMonths: false
    });
  });
  
  // Auto-save view při změně
  useEffect(() => {
    if (!user_id) return;
    
    uiSettingsService.save('orders25', user_id, 'view', view);
  }, [view, user_id]);
  
  // ============================================
  // PAGINACE - Load z localStorage
  // ============================================
  const [pagination, setPagination] = useState(() => {
    if (!user_id) return defaultPagination;
    
    return uiSettingsService.load('orders25', user_id, 'pagination', {
      pageSize: 50,
      pageIndex: 0
    });
  });
  
  // Auto-save paginace při změně
  useEffect(() => {
    if (!user_id) return;
    
    uiSettingsService.save('orders25', user_id, 'pagination', pagination);
  }, [pagination, user_id]);
  
  // ============================================
  // RESET NASTAVENÍ (Tlačítko)
  // ============================================
  const handleResetSettings = () => {
    if (!window.confirm('Opravdu chcete resetovat všechna nastavení?')) {
      return;
    }
    
    uiSettingsService.deleteAll('orders25', user_id);
    
    // Reload stránky pro aplikaci default hodnot
    window.location.reload();
  };
  
  return (
    <div>
      {/* ... komponenta ... */}
      
      <button onClick={handleResetSettings}>
        🔄 Reset nastavení
      </button>
    </div>
  );
};
```

---

## 📅 FÁZE 4: UNIFIED CACHE SERVICE (P1) - 5 dní

### ✅ Krok 4.1: Vytvořit UnifiedCacheService

**Nový soubor:** `src/services/unifiedCacheService.js`

```javascript
/**
 * Unified Cache Service
 * 
 * Sloučení všech cache systémů:
 * - Orders cache (memory + metadata)
 * - Číselníky (localStorage s TTL)
 * - API cache (memory)
 */

class UnifiedCacheService {
  constructor() {
    // Memory cache (Map)
    this.memory = {
      orders: new Map(),      // Orders cache
      dictionaries: new Map() // Číselníky cache
    };
    
    // Konfigurace
    this.config = {
      orders: {
        ttl: 10 * 60 * 1000,    // 10 minut
        maxSize: 100
      },
      dictionaries: {
        ttl: 60 * 60 * 1000,    // 1 hodina
        maxSize: 50
      },
      debug: process.env.NODE_ENV === 'development'
    };
    
    // Statistiky
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
    
    // Inicializace
    this._init();
  }
  
  /**
   * Inicializace - restore z localStorage
   */
  _init() {
    // Restore číselníků z localStorage (pokud TTL platí)
    this._restoreDictionaries();
    
    // Spusť cleanup interval
    setInterval(() => this._cleanup(), 60 * 1000); // Každou minutu
  }
  
  // ============================================
  // ORDERS CACHE (stejné jako ordersCacheService)
  // ============================================
  
  /**
   * Generuje cache key pro orders
   */
  _getOrdersCacheKey(userId, filters = {}) {
    if (!userId) throw new Error('userId is required');
    
    const filterKey = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return `orders_${userId}_${filterKey || 'all'}`;
  }
  
  /**
   * Načte orders z cache nebo DB
   */
  async getOrders(userId, fetchFn, filters = {}) {
    const cacheKey = this._getOrdersCacheKey(userId, filters);
    
    // Zkus memory cache
    const cached = this.memory.orders.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      
      if (age < this.config.orders.ttl) {
        this.stats.hits++;
        
        if (this.config.debug) {
          console.log(`✅ [Cache HIT] Orders (${age}ms old)`);
        }
        
        return {
          data: cached.data,
          fromCache: true,
          age
        };
      }
    }
    
    // Cache MISS - načti z DB
    this.stats.misses++;
    
    if (this.config.debug) {
      console.log(`❌ [Cache MISS] Orders - fetching from DB...`);
    }
    
    const data = await fetchFn();
    
    // Ulož do cache
    this._setOrdersCache(cacheKey, data);
    
    return {
      data,
      fromCache: false,
      age: 0
    };
  }
  
  /**
   * Uloží do orders cache
   */
  _setOrdersCache(cacheKey, data) {
    // Memory
    this.memory.orders.set(cacheKey, {
      data,
      timestamp: Date.now(),
      accessCount: 0
    });
    
    // Metadata do localStorage
    const metaKey = `cache_meta_${cacheKey}`;
    try {
      localStorage.setItem(metaKey, JSON.stringify({
        timestamp: Date.now(),
        inMemory: true,
        version: 1
      }));
    } catch (error) {
      console.warn('⚠️ Failed to save cache metadata:', error);
    }
    
    // LRU eviction
    if (this.memory.orders.size > this.config.orders.maxSize) {
      const oldestKey = Array.from(this.memory.orders.keys())[0];
      this.memory.orders.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  /**
   * Invaliduje orders cache
   */
  invalidateOrders(userId = null) {
    if (userId) {
      // Invaliduj jen pro konkrétního uživatele
      const prefix = `orders_${userId}_`;
      
      for (const key of this.memory.orders.keys()) {
        if (key.startsWith(prefix)) {
          this.memory.orders.delete(key);
        }
      }
      
      // Smaž metadata z localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const lsKey = localStorage.key(i);
        if (lsKey?.startsWith(`cache_meta_${prefix}`)) {
          localStorage.removeItem(lsKey);
        }
      }
    } else {
      // Invaliduj všechno
      this.memory.orders.clear();
      
      // Smaž všechna metadata
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const lsKey = localStorage.key(i);
        if (lsKey?.startsWith('cache_meta_orders_')) {
          localStorage.removeItem(lsKey);
        }
      }
    }
    
    if (this.config.debug) {
      console.log(`🧹 Orders cache invalidated ${userId ? `for user ${userId}` : '(all)'}`);
    }
  }
  
  // ============================================
  // DICTIONARIES CACHE (číselníky s TTL)
  // ============================================
  
  /**
   * Načte číselník z cache nebo DB
   */
  async getDictionary(name, fetchFn) {
    const cacheKey = `dict_${name}`;
    
    // Zkus memory
    const cached = this.memory.dictionaries.get(cacheKey);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      
      if (age < this.config.dictionaries.ttl) {
        this.stats.hits++;
        
        if (this.config.debug) {
          console.log(`✅ [Cache HIT] Dictionary '${name}' (${Math.round(age/1000)}s old)`);
        }
        
        return cached.data;
      }
    }
    
    // Cache MISS - načti z DB
    this.stats.misses++;
    
    if (this.config.debug) {
      console.log(`❌ [Cache MISS] Dictionary '${name}' - fetching...`);
    }
    
    const data = await fetchFn();
    
    // Ulož do cache
    this._setDictionaryCache(name, data);
    
    return data;
  }
  
  /**
   * Uloží číselník do cache
   */
  _setDictionaryCache(name, data) {
    const cacheKey = `dict_${name}`;
    const timestamp = Date.now();
    
    // Memory
    this.memory.dictionaries.set(cacheKey, {
      data,
      timestamp,
      accessCount: 0
    });
    
    // LocalStorage (s TTL)
    const lsKey = `cache_${name}`;
    try {
      localStorage.setItem(lsKey, JSON.stringify({
        data,
        timestamp,
        ttl: this.config.dictionaries.ttl,
        version: 1
      }));
    } catch (error) {
      console.warn(`⚠️ Failed to save dictionary '${name}' to localStorage:`, error);
    }
    
    // LRU eviction
    if (this.memory.dictionaries.size > this.config.dictionaries.maxSize) {
      const oldestKey = Array.from(this.memory.dictionaries.keys())[0];
      this.memory.dictionaries.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  /**
   * Restore číselníků z localStorage při init
   */
  _restoreDictionaries() {
    const now = Date.now();
    let restored = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key?.startsWith('cache_') && !key.includes('_meta_')) {
        try {
          const stored = JSON.parse(localStorage.getItem(key));
          const age = now - stored.timestamp;
          
          if (age < stored.ttl) {
            const name = key.replace('cache_', '');
            this.memory.dictionaries.set(`dict_${name}`, {
              data: stored.data,
              timestamp: stored.timestamp,
              accessCount: 0
            });
            restored++;
          } else {
            // Expirované - smazat
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to restore dictionary from '${key}':`, error);
        }
      }
    }
    
    if (this.config.debug && restored > 0) {
      console.log(`📂 Restored ${restored} dictionaries from localStorage`);
    }
  }
  
  /**
   * Invaliduje číselník
   */
  invalidateDictionary(name) {
    const cacheKey = `dict_${name}`;
    const lsKey = `cache_${name}`;
    
    this.memory.dictionaries.delete(cacheKey);
    localStorage.removeItem(lsKey);
    
    if (this.config.debug) {
      console.log(`🧹 Dictionary '${name}' invalidated`);
    }
  }
  
  // ============================================
  // CLEANUP & MAINTENANCE
  // ============================================
  
  /**
   * Vyčistí expirovaná data
   */
  _cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    // Cleanup orders metadata v localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      
      if (key?.startsWith('cache_meta_orders_')) {
        try {
          const meta = JSON.parse(localStorage.getItem(key));
          const age = now - meta.timestamp;
          
          if (age > this.config.orders.ttl) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } catch (error) {
          // Poškozený záznam - smazat
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    }
    
    // Cleanup číselníků
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      
      if (key?.startsWith('cache_') && !key.includes('_meta_')) {
        try {
          const stored = JSON.parse(localStorage.getItem(key));
          const age = now - stored.timestamp;
          
          if (age > stored.ttl) {
            localStorage.removeItem(key);
            
            const name = key.replace('cache_', '');
            this.memory.dictionaries.delete(`dict_${name}`);
            cleaned++;
          }
        } catch (error) {
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    }
    
    if (this.config.debug && cleaned > 0) {
      console.log(`🧹 Cleanup: removed ${cleaned} expired cache entries`);
    }
  }
  
  /**
   * Vymaže celou cache
   */
  clearAll() {
    // Memory
    this.memory.orders.clear();
    this.memory.dictionaries.clear();
    
    // LocalStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      
      if (key?.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    }
    
    console.log('🧹 All cache cleared');
  }
  
  /**
   * Získej statistiky
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) * 100,
      memory: {
        orders: this.memory.orders.size,
        dictionaries: this.memory.dictionaries.size
      }
    };
  }
}

// Singleton
const unifiedCacheService = new UnifiedCacheService();
export default unifiedCacheService;
```

---

### ✅ Krok 4.2: Migrace ordersCacheService → unifiedCacheService

**Postup:**

1. **Nahradit import v Orders25List.js:**
```javascript
// PŘED:
import ordersCacheService from '../services/ordersCacheService';

// PO:
import unifiedCacheService from '../services/unifiedCacheService';

// API zůstává stejné!
const result = await unifiedCacheService.getOrders(userId, fetchFn, filters);
```

2. **Nahradit v api.js:**
```javascript
// PŘED:
const memoryCache = { users: null, suppliers: null };

// PO:
import unifiedCacheService from './unifiedCacheService';

// Použití:
const users = await unifiedCacheService.getDictionary('users', () => 
  fetchUsersFromDB()
);
```

---

## 📅 FÁZE 5: TODO & NOTIFIKACE SESSION DATA - 2 dny

### ✅ Krok 5.1: Přesunout TODO z localStorage → session (DB reload)

**Soubor:** `src/components/Layout.js`

```javascript
// ============================================
// TODO ÚKOLY - Reload z DB po F5
// ============================================

const [tasks, setTasks] = useState([]);
const [tasksLoaded, setTasksLoaded] = useState(false);

useEffect(() => {
  const loadTasksFromDB = async () => {
    if (!user_id || tasksLoaded) return;
    
    try {
      // Načti TODO úkoly z DB (API)
      const response = await fetch(`${API_BASE_URL}/api/v2/todo/${user_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      setTasks(data.tasks || []);
      setTasksLoaded(true);
      
      console.log('📂 TODO tasks loaded from DB');
      
    } catch (error) {
      console.error('❌ Failed to load TODO tasks:', error);
      setTasks([]); // Fallback
    }
  };
  
  loadTasksFromDB();
}, [user_id]);

// ❌ ODSTRANIT ukládání do localStorage:
// localStorage.setItem(`layout_tasks_${user_id}`, ...); ← SMAZAT

// ✅ PŘIDAT ukládání do DB při změně:
useEffect(() => {
  const saveTasks = async () => {
    if (!user_id || !tasksLoaded || tasks.length === 0) return;
    
    try {
      await fetch(`${API_BASE_URL}/api/v2/todo/${user_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tasks })
      });
      
      console.log('💾 TODO tasks saved to DB');
      
    } catch (error) {
      console.error('❌ Failed to save TODO tasks:', error);
    }
  };
  
  // Debounce auto-save
  const timer = setTimeout(saveTasks, 2000);
  return () => clearTimeout(timer);
  
}, [tasks, user_id, tasksLoaded]);
```

**Stejný přístup pro:**
- Poznámky (`layout_notes_*`)
- Notifikace (`notif_data_*`)

---

## 📅 FÁZE 6: LOGOUT CLEANUP - 1 den

### ✅ Krok 6.1: Aktualizovat logoutCleanup.js

**Soubor:** `src/utils/logoutCleanup.js`

```javascript
import { rotateEncryptionKey } from './encryption';
import draftStorageService from '../services/draftStorageService';
import uiSettingsService from '../services/uiSettingsService';
import unifiedCacheService from '../services/unifiedCacheService';

export const performLogout = async () => {
  console.log('🚪 Logging out...');
  
  // ============================================
  // 1. SMAZAT SESSION DATA (TODO, notifikace)
  // ============================================
  // ✅ Už se neukládají do localStorage - nic nedělat
  
  // ============================================
  // 2. ZACHOVAT KONCEPTY (per-user, šifrované)
  // ============================================
  // ✅ Drafty zůstávají v localStorage - nic nedělat
  
  // ============================================
  // 3. ZACHOVAT UI NASTAVENÍ (per-user)
  // ============================================
  // ✅ UI settings zůstávají v localStorage - nic nedělat
  
  // ============================================
  // 4. INVALIDOVAT CACHE
  // ============================================
  unifiedCacheService.invalidateOrders(); // Vyčistit orders cache
  
  // ============================================
  // 5. ROTOVAT ENCRYPTION KEY
  // ============================================
  rotateEncryptionKey();
  
  // ============================================
  // 6. VYČISTIT AUTH DATA
  // ============================================
  localStorage.removeItem('auth_token_persistent');
  localStorage.removeItem('auth_user_persistent');
  localStorage.removeItem('auth_user_detail_persistent');
  localStorage.removeItem('auth_user_permissions_persistent');
  
  // ============================================
  // 7. CLEANUP STARÝCH DRAFTŮ (30+ dní)
  // ============================================
  draftStorageService.cleanupOldDrafts();
  
  console.log('✅ Logout complete');
  
  // Redirect na login
  window.location.href = '/login';
};
```

---

## 📊 TESTOVACÍ SCÉNÁŘE

### ✅ Test 1: Koncept objednávky přežije F5

1. Vytvořit novou objednávku
2. Vyplnit nějaká data
3. F5 refresh
4. **Očekáváno:** Dialog "Nalezen koncept, chcete pokračovat?"
5. Kliknout "Ano"
6. **Očekáváno:** Data jsou načtena

### ✅ Test 2: Koncept přežije odhlášení

1. Vytvořit koncept
2. Odhlásit se
3. Přihlásit se stejným uživatelem
4. Otevřít novou objednávku
5. **Očekáváno:** Dialog s konceptem
6. **Očekáváno:** Data jsou šifrovaná v localStorage

### ✅ Test 3: UI nastavení přežijí F5

1. Nastavit filtry v Orders25List
2. F5 refresh
3. **Očekáváno:** Filtry zůstávají nastavené

### ✅ Test 4: UI nastavení přežijí odhlášení

1. Nastavit filtry
2. Odhlásit se
3. Přihlásit se stejným uživatelem
4. **Očekáváno:** Filtry zůstávají

### ✅ Test 5: TODO se reloaduje z DB

1. Přidat TODO úkol
2. F5 refresh
3. **Očekáváno:** TODO úkol je načten z DB (ne localStorage)

### ✅ Test 6: Číselníky s TTL

1. Načíst číselník (např. suppliers)
2. Počkat 61 minut
3. Reload stránky
4. **Očekáváno:** Číselník se načte znovu z DB

### ✅ Test 7: Session seed není v sessionStorage

1. Otevřít DevTools
2. Application → SessionStorage
3. **Očekáváno:** `_session_seed` neexistuje
4. Console: `window._securityContext.sessionSeed` → **Viditelný v memory**

---

## 📋 CHECKLIST IMPLEMENTACE

### FÁZE 1: Bezpečnost (P0)
- [ ] Session seed přesunout z sessionStorage do memory
- [ ] Implementovat key rotation
- [ ] Integrace do logout
- [ ] Test: session seed není v sessionStorage

### FÁZE 2: Koncepty objednávek (P1)
- [ ] Vytvořit `draftStorageService.js`
- [ ] Integrace do `OrderFormComponent.js`
- [ ] Test: koncept přežije F5
- [ ] Test: koncept přežije odhlášení
- [ ] Test: data jsou šifrovaná

### FÁZE 3: UI nastavení (P1)
- [ ] Vytvořit `uiSettingsService.js`
- [ ] Integrace do `Orders25List.js`
- [ ] Integrace do `Orders.js`
- [ ] Test: nastavení přežijí F5
- [ ] Test: nastavení přežijí odhlášení

### FÁZE 4: Unified cache (P1)
- [ ] Vytvořit `unifiedCacheService.js`
- [ ] Migrace `ordersCacheService` → unified
- [ ] Migrace `api.js` cache → unified
- [ ] TTL pro číselníky (1 hodina)
- [ ] Cleanup metadata
- [ ] Test: cache funguje
- [ ] Test: TTL expírace

### FÁZE 5: Session data (TODO, notifikace)
- [ ] TODO reload z DB po F5
- [ ] Poznámky reload z DB po F5
- [ ] Notifikace reload z DB po F5
- [ ] Odstranit localStorage ukládání
- [ ] Test: reload z DB funguje

### FÁZE 6: Logout cleanup
- [ ] Aktualizovat `logoutCleanup.js`
- [ ] Test: drafty zůstávají
- [ ] Test: UI settings zůstávají
- [ ] Test: session data mizí
- [ ] Test: cache invalidace

---

## 📈 METRIKY ÚSPĚCHU

| Metrika | PŘED | CÍL PO |
|---------|------|--------|
| **LocalStorage keys** | 80-120 | 40-60 |
| **Šifrované drafty** | ❌ Ne | ✅ Ano |
| **Session seed security** | ⚠️ Slabá | ✅ Silná |
| **Cache systémů** | 3 | 1 |
| **TTL číselníků** | ∞ | 1 hodina |
| **F5 persistence (drafty)** | ❌ Ne | ✅ Ano |
| **F5 persistence (UI)** | ⚠️ Částečně | ✅ Ano |
| **TODO reload** | localStorage | DB |

---

## 🎯 TIMELINE

- **FÁZE 1:** 3 dny (Bezpečnost P0)
- **FÁZE 2:** 5 dní (Koncepty)
- **FÁZE 3:** 4 dny (UI nastavení)
- **FÁZE 4:** 5 dní (Unified cache)
- **FÁZE 5:** 2 dny (Session data)
- **FÁZE 6:** 1 den (Logout)

**CELKEM:** ~20 dní (4 týdny)

---

**KONEC PLÁNU**

Tento dokument obsahuje vše potřebné pro implementaci.
Krok za krokem, soubor po souboru, test po testu.

Ready to start! 🚀

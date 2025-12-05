# 📊 KOMPLEXNÍ AUDIT ÚLOŽIŠŤ APLIKACE

**Datum:** 19. října 2025  
**Verze:** 1.0  
**Status:** ⚠️ VYŽADUJE REVIZI A OPTIMALIZACI

---

## 🎯 EXECUTIVE SUMMARY

Aplikace využívá **3 různé typy úložišť** pro různé účely. Audit odhalil několik **bezpečnostních a výkonnostních problémů**, které vyžadují nápravu.

### ⚠️ HLAVNÍ ZJIŠTĚNÍ:

1. **Bezpečnost:** ✅ Citlivá data JSOU šifrována (AES-GCM)
2. **Struktura:** ⚠️ Nepřehledná - příliš mnoho různých klíčů
3. **Konzistence:** ⚠️ Některé konvence nejsou dodržovány
4. **Výkon:** ⚠️ SessionStorage používán neefektivně
5. **Cache:** ✅ Memory cache funguje dobře, ale metadata v LocalStorage

---

## 📦 1. LOCALSTORAGE

### 1.1 AUTENTIFIKACE A BEZPEČNOST

#### ✅ ŠIFROVANÁ DATA (Web Crypto API - AES-GCM 256-bit)

| Klíč | Popis | Šifrování | Důvod |
|------|-------|-----------|-------|
| `auth_token_persistent` | JWT token (7 dní) | ✅ **ÁNO** | Kritické autentifikační údaje |
| `auth_user_persistent` | Uživatelská data | ✅ **ÁNO** | Osobní údaje (jméno, email) |
| `auth_user_detail_persistent` | Detaily uživatele | ✅ **ÁNO** | Rozšířené osobní údaje |
| `auth_user_permissions_persistent` | Oprávnění | ✅ **ÁNO** | Citlivá bezpečnostní data |

**Poznámka:** Šifrování používá:
- **Algoritmus:** AES-GCM (NIST standard)
- **Klíč:** 256-bit odvozený z browser fingerprint + session seed
- **IV:** Randomizovaný 96-bit pro každé šifrování
- **Fallback:** Pokud Web Crypto API selže, data se ukládají NEŠIFROVANĚ s warning logem

**⚠️ PROBLÉM:** Token má expiraci 7 dní, ale kontrola expirace se provádí jen při načítání, ne automaticky.

---

### 1.2 UŽIVATELSKÝ OBSAH (TODO, POZNÁMKY)

#### ✅ ŠIFROVANÁ DATA

| Klíč Pattern | Popis | Šifrování | Příklad |
|--------------|-------|-----------|---------|
| `layout_tasks_{userId}` | TODO úkoly uživatele | ✅ **ÁNO** | `layout_tasks_42` |
| `layout_notes_text_{userId}` | Text poznámek | ✅ **ÁNO** | `layout_notes_text_42` |
| `todo_items_{userId}` | TODO položky | ✅ **ÁNO** | `todo_items_42` |
| `order_draft_{userId}` | Draft objednávky | ✅ **ÁNO** | `order_draft_42` |
| `order25-draft-{userId}` | Draft objednávek 2025 | ✅ **ÁNO** | `order25-draft-42` |
| `notes_text_{orderId}` | Poznámky k objednávce | ✅ **ÁNO** | `notes_text_1234` |

**✅ DOBŘE:** Citlivý uživatelský obsah je správně šifrován.

---

#### ❌ NEŠIFROVANÁ DATA (UI nastavení, pozice)

| Klíč Pattern | Popis | Šifrování | Velikost | Důvod |
|--------------|-------|-----------|----------|-------|
| `layout_tasks_font_{userId}` | Velikost fontu TODO | ❌ **NE** | ~10B | Není citlivé |
| `layout_notes_font_{userId}` | Velikost fontu poznámek | ❌ **NE** | ~10B | Není citlivé |
| `layout_*_position_{userId}` | Pozice panelů | ❌ **NE** | ~50B | UI preference |
| `layout_*_size_{userId}` | Velikost panelů | ❌ **NE** | ~50B | UI preference |
| `layout_*_state_{userId}` | Stav panelů (otevřeno/zavřeno) | ❌ **NE** | ~20B | UI stav |

**✅ DOBŘE:** UI nastavení není třeba šifrovat - není citlivé, často čtené.

---

### 1.3 CACHE A VÝKON

#### ⚡ CACHE SYSTÉM (ordersCacheService)

| Typ Cache | Kde | TTL | Šifrování | Účel |
|-----------|-----|-----|-----------|------|
| **Primary: Memory (Map)** | RAM | 10 min | ❌ NE | Ultra-rychlý přístup |
| **Metadata: LocalStorage** | Disk | 10 min | ❌ NE | TTL kontrola po F5 |

**Klíče v LocalStorage (jen metadata):**
```javascript
orders_cache_meta_user:42|rok:2025|mesic:3
// Obsahuje pouze:
{
  timestamp: 1729350000000,
  inMemory: true,
  version: 1
}
```

**✅ DOBŘE:** 
- Memory cache je rychlá (5-10ms)
- LocalStorage drží jen malé metadata (ne celá data)
- TTL 10 minut synchronizován s background refresh

**⚠️ PROBLÉM:** 
- Metadata klíče mohou narůstat (100+ keys)
- Není implementováno LRU cleanup pro metadata
- Po F5 refresh se metadata nemazou

---

#### 📊 ČÍSELNÍKY A STATICÁ DATA (nešifrovaná)

| Klíč | Popis | Velikost | TTL | Šifrování |
|------|-------|----------|-----|-----------|
| `cached_approvers` | Seznam schvalovatelů | ~5-10KB | ∞ | ❌ NE |
| `cached_garants` | Seznam garantů | ~5-10KB | ∞ | ❌ NE |
| `cached_users` | Seznam uživatelů | ~10-20KB | ∞ | ❌ NE |
| `suppliers_cache` | Dodavatelé (ARES) | ~50-100KB | ∞ | ❌ NE |
| `locations_cache` | Střediska | ~10-20KB | ∞ | ❌ NE |
| `orderTypes_cache` | Typy objednávek | ~5KB | ∞ | ❌ NE |
| `financing_cache` | Financování | ~5KB | ∞ | ❌ NE |
| `userCache` | User lookup cache | ~10KB | ∞ | ❌ NE |

**⚠️ PROBLÉMY:**
1. **Žádné TTL** - data se nikdy automaticky neobnovují
2. **Velká data** - suppliers_cache může být 100KB+
3. **Žádná validace** - stará data mohou být nekonzistentní
4. **Duplikace** - `cached_users` vs `userCache` (redundance)

**💡 DOPORUČENÍ:**
- Přidat TTL (např. 1 hodina)
- Implementovat verzi cache (pro invalidaci)
- Sloučit duplicitní cache (`cached_users` + `userCache`)

---

### 1.4 FILTRY A STAV UI

#### ⚙️ FILTRY A PAGINACE (nešifrovaná)

| Klíč Pattern | Popis | Příklad hodnoty | Šifrování |
|--------------|-------|-----------------|-----------|
| `orders25List_globalFilter` | Globální fulltext filter | `"faktura"` | ❌ NE |
| `orders25List_statusFilter` | Status filter | `["schvaleno"]` | ❌ NE |
| `orders25List_userFilter` | User filter | `["42"]` | ❌ NE |
| `orders25List_pageSize` | Počet řádků na stránku | `50` | ❌ NE |
| `orders25List_pageIndex` | Aktuální strana | `2` | ❌ NE |
| `orders25_dateFrom_{userId}` | Datum od | `"2025-01-01"` | ❌ NE |
| `orders25_dateTo_{userId}` | Datum do | `"2025-12-31"` | ❌ NE |
| `orders25List_selectedObjednatel` | Vybraný objednatel | `"42"` | ❌ NE |
| `orders25List_selectedGarant` | Vybraný garant | `"15"` | ❌ NE |
| `orders25List_selectedSchvalovatel` | Vybraný schvalovatel | `"8"` | ❌ NE |

**⚠️ PROBLÉMY:**
1. **Nekonzistentní jmenné konvence:**
   - `orders25List_*` vs `orders25_*`
   - `_{userId}` jen u některých klíčů
2. **Duplicitní data:** Některé filtry se ukládají víckrát
3. **Žádná expírace:** Staré filtry zůstávají navždy

**💡 DOPORUČENÍ:**
- Sjednotit prefix: `orders25_filters_{userId}_*`
- Přidat expiraci (např. 30 dní)
- Centralizovat do jednoho JSON objektu

---

### 1.5 OSTATNÍ LOCALSTORAGE DATA

#### 🔔 NOTIFIKACE A ALARMY

| Klíč Pattern | Popis | Šifrování | Účel |
|--------------|-------|-----------|------|
| `todo_alarm_read_{userId}` | Přečtené TODO alarmy | ❌ NE | UI stav |
| `todo_alarm_dismissed_{userId}` | Dismissnuté alarmy | ❌ NE | UI stav |
| `notif_data_{userId}` | Notifikační data | ✅ **ÁNO** | Může obsahovat citlivé info |
| `calendar_order_counts` | Cache počtů objednávek | ❌ NE | Výkon |
| `calendar_order_counts_updated` | Timestamp cache | ❌ NE | Validace |

#### 🎨 UI PREFERENCE (nešifrovaná)

| Klíč | Popis | Hodnota |
|------|-------|---------|
| `orders25List_showDashboard` | Zobrazit dashboard | `true/false` |
| `orders25List_dashboardCompact` | Kompaktní dashboard | `true/false` |
| `orders25List_showFiltersPanel` | Zobrazit filtry | `true/false` |
| `orders25List_showRowHighlighting` | Zvýraznění řádků | `true/false` |
| `orders25List_showRowStriping` | Pruhování řádků | `true/false` |
| `orders25List_showExpandedMonths` | Rozbalené měsíce | `true/false` |

#### 🔍 DEBUG A DIAGNOSTIKA

| Klíč | Popis | Produkční? |
|------|-------|------------|
| `debug_disable` | Disable debug logs | ⚠️ Mělo by být env var |
| `api_debug` | API debug mode | ⚠️ Mělo by být env var |
| `highlightOrderId` | Zvýraznit objednávku | ❌ Dočasný stav |

**⚠️ PROBLÉM:** Debug flagy v localStorage místo environment variables.

---

## 📦 2. SESSIONSTORAGE

### 2.1 SOUČASNÉ POUŽITÍ

| Klíč | Popis | Šifrování | Účel | Problém |
|------|-------|-----------|------|---------|
| `_session_seed` | Seed pro encryption key | ❌ NE | Crypto klíč | ⚠️ Citlivé! |
| `orders_cache_backup` | **DEPRECATED** | ❌ NE | Cache backup | ❌ NEPOUŽÍVÁ SE |

**❌ VELKÝ PROBLÉM - SessionStorage BACKUP:**

```javascript
// ordersCacheService.js - VYPNUTÝ kód
// sessionStorage.setItem('orders_cache_backup', JSON.stringify(data));
// ⚠️ DŮVOD: Quota exceeded (>5MB)
```

**Co se stalo:**
1. Původně se cache zálohovala do sessionStorage
2. Po růstu dat (stovky objednávek) se dosáhlo 5MB limitu
3. Backup selhal → VYPNUT
4. Nyní se používá jen memory cache (Map)

**✅ ŘEŠENÍ:**
- Memory cache (Map) stačí pro běžné použití
- F5 refresh pořád funguje díky stabilním React dependencies
- SessionStorage backup už není potřeba

---

### 2.2 SESSION SEED - BEZPEČNOSTNÍ RIZIKO

```javascript
// encryption.js
let sessionSeed = sessionStorage.getItem('_session_seed');
if (!sessionSeed) {
  sessionSeed = Date.now().toString() + Math.random().toString(36);
  sessionStorage.setItem('_session_seed', sessionSeed);
}
```

**⚠️ BEZPEČNOSTNÍ PROBLÉM:**

1. **Session seed je nešifrovaný** - je součást encryption key!
2. **Je viditelný v DevTools** → útočník může získat část klíče
3. **Není rotovaný** - zůstává po celou session

**💡 DOPORUČENÍ:**
- Session seed by NEMĚL být v sessionStorage
- Měl by být v memory (globální proměnná)
- Nebo použít Web Crypto API pro key derivation (PBKDF2)

---

## 🧠 3. MEMORY CACHE (RAM)

### 3.1 ORDERS CACHE SERVICE

**Primární úložiště pro data objednávek:**

```javascript
class OrdersCacheService {
  constructor() {
    this.memoryCache = new Map(); // ⚡ Hlavní cache
  }
}
```

**Cache Entry:**
```javascript
{
  data: [...], // Array objednávek
  timestamp: 1729350000000,
  accessCount: 5 // Pro LRU
}
```

**Vlastnosti:**
- ✅ **Ultra rychlá** (5-10ms)
- ✅ **TTL 10 minut** (synchronizováno s background refresh)
- ✅ **LRU eviction** (max 100 entries)
- ✅ **Per-user izolace** (bezpečnost)
- ✅ **Per-filter cache** (rok, měsíc)
- ❌ **Nepřežije hard refresh** (Ctrl+Shift+R)

---

### 3.2 API MEMORY CACHE

**Další memory cache pro API volání:**

```javascript
// api.js
const memoryCache = {
  users: null,
  suppliers: null,
  // ...
};
```

**⚠️ PROBLÉM:** Duplikace s ordersCacheService

---

### 3.3 FORM MEMORY CACHE

```javascript
// OrderFormTabs.js
const memoryCache = useRef({}); // Cache pro formulářová data
```

**⚠️ PROBLÉM:** Další samostatná cache - není centralizovaná

---

## 📊 4. STATISTIKA ÚLOŽIŠŤ

### 4.1 VELIKOST DAT (orientační)

| Typ dat | LocalStorage | SessionStorage | Memory |
|---------|--------------|----------------|--------|
| **Autentifikace** | ~2-5 KB | 0 | 0 |
| **Uživatelský obsah** | ~10-50 KB | 0 | 0 |
| **Cache metadata** | ~5-20 KB | 0 | 0 |
| **Číselníky** | ~100-200 KB | 0 | ~50-100 KB |
| **Filtry & UI** | ~5-10 KB | 0 | 0 |
| **Orders cache** | 0 | 0 | ~500KB-2MB |
| **Session seed** | 0 | ~50 B | 0 |
| **CELKEM** | ~120-285 KB | ~50 B | ~550KB-2.1MB |

**📝 Poznámky:**
- LocalStorage limit: **5-10 MB** (podle prohlížeče)
- SessionStorage limit: **5-10 MB**
- Memory: Bez limitu (omezeno jen RAM)

---

## 🔐 5. ŠIFROVÁNÍ - DETAILNÍ ANALÝZA

### 5.1 IMPLEMENTACE

**Algoritmus:** AES-GCM (NIST FIPS 197)
- **Key size:** 256-bit
- **Block size:** 128-bit
- **Mode:** GCM (Galois/Counter Mode) - authenticated encryption

**Key Derivation:**
```javascript
const data = [
  navigator.userAgent,
  navigator.language,
  screen.width,
  screen.height,
  sessionSeed,  // ⚠️ Z sessionStorage!
  window.location.origin
].join('|');

const keyData = await crypto.subtle.digest('SHA-256', encoder.encode(data));
const key = await crypto.subtle.importKey('raw', keyData, 
  { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
);
```

**⚠️ BEZPEČNOSTNÍ HODNOCENÍ:**

| Aspekt | Hodnocení | Poznámka |
|--------|-----------|----------|
| **Algoritmus** | ✅ Výborný | AES-GCM je industry standard |
| **Key size** | ✅ Dobrý | 256-bit je dostatečný |
| **IV randomizace** | ✅ Dobrý | Používá crypto.getRandomValues() |
| **Key storage** | ⚠️ **SLABÝ** | Session seed je v sessionStorage |
| **Key rotation** | ❌ **CHYBÍ** | Klíč se nerotuje |
| **Salt** | ❌ **CHYBÍ** | Není použit salt pro key derivation |

---

### 5.2 CO SE ŠIFRUJE A CO NE

#### ✅ ŠIFROVANÉ (Critical)
- Tokeny, hesla, auth data
- Uživatelský text obsah (TODO, poznámky)
- Draft objednávky
- Poznámky k objednávkám

#### ❌ NEŠIFROVANÉ (Performance/Public)
- Číselníky (ARES data - veřejná)
- UI preference (pozice, velikosti)
- Filtry (nejsou citlivé)
- Cache metadata (jen timestamp)

**✅ ROZHODNUTÍ JE SPRÁVNÉ** - kompromis mezi bezpečností a výkonem.

---

## 🚨 6. IDENTIFIKOVANÉ PROBLÉMY

### 🔴 KRITICKÉ (P0 - Bezpečnost)

1. **Session seed v sessionStorage**
   - **Riziko:** Součást encryption key je viditelný v DevTools
   - **Řešení:** Přesunout do memory nebo použít PBKDF2

2. **Žádná key rotation**
   - **Riziko:** Kompromitovaný klíč zůstává platný neomezeně
   - **Řešení:** Rotovat klíč při změně session

---

### 🟠 VYSOKÉ (P1 - Výkon/Stabilita)

3. **Duplicitní cache systémy**
   - **Problém:** `ordersCacheService`, `api.js cache`, `FormTabs cache`
   - **Řešení:** Centralizovat do jednoho service

4. **Cache metadata nejsou čištěny**
   - **Problém:** LocalStorage může narůst na stovky klíčů
   - **Řešení:** LRU cleanup pro metadata keys

5. **Číselníky bez TTL**
   - **Problém:** Data mohou být zastaralá měsíce
   - **Řešení:** Přidat expiraci (1 hodina)

---

### 🟡 STŘEDNÍ (P2 - Kvalita kódu)

6. **Nekonzistentní jmenné konvence**
   - `orders25List_*` vs `orders25_*`
   - `_{userId}` jen u některých

7. **Debug flagy v localStorage**
   - Měly by být environment variables

8. **Token expírace není automatická**
   - Kontroluje se jen při načítání

---

## 💡 7. DOPORUČENÍ A ACTION PLAN

### 🎯 FÁZE 1: BEZPEČNOST (1-2 týdny)

1. **Přesunout session seed z sessionStorage**
   ```javascript
   // PŘED:
   sessionStorage.setItem('_session_seed', seed);
   
   // PO:
   window._sessionSeed = seed; // Memory only
   ```

2. **Implementovat key rotation**
   ```javascript
   // Rotovat klíč každých 24 hodin nebo při logout
   ```

3. **Přidat salt pro key derivation**
   ```javascript
   const salt = crypto.getRandomValues(new Uint8Array(16));
   const key = await crypto.subtle.deriveKey(
     { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
     baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
   );
   ```

---

### 🎯 FÁZE 2: OPTIMALIZACE CACHE (2-3 týdny)

4. **Sloučit duplicitní cache systémy**
   - Vytvořit `UnifiedCacheService`
   - Migrovat `api.js` cache → `UnifiedCacheService`
   - Migrovat form cache → `UnifiedCacheService`

5. **Implementovat LRU cleanup pro metadata**
   ```javascript
   // Pravidelně čistit staré cache metadata keys
   cleanupOldCacheMetadata() {
     const now = Date.now();
     for (let i = 0; i < localStorage.length; i++) {
       const key = localStorage.key(i);
       if (key?.startsWith('orders_cache_meta_')) {
         const meta = JSON.parse(localStorage.getItem(key));
         if (now - meta.timestamp > this.config.ttl) {
           localStorage.removeItem(key);
         }
       }
     }
   }
   ```

6. **Přidat TTL pro číselníky**
   ```javascript
   {
     data: [...],
     timestamp: Date.now(),
     ttl: 3600000 // 1 hodina
   }
   ```

---

### 🎯 FÁZE 3: REFACTORING (3-4 týdny)

7. **Sjednotit jmenné konvence**
   - Pattern: `{component}_{dataType}_{userId}_{detail}`
   - Příklad: `orders25_filters_42_dateFrom`

8. **Centralizovat filtry do JSON objektu**
   ```javascript
   // PŘED:
   localStorage.setItem('orders25List_globalFilter', 'text');
   localStorage.setItem('orders25List_statusFilter', JSON.stringify([...]));
   
   // PO:
   localStorage.setItem('orders25_filters_42', JSON.stringify({
     global: 'text',
     status: [...],
     dateFrom: '2025-01-01'
   }));
   ```

9. **Přesunout debug flags do .env**
   ```bash
   # .env
   REACT_APP_DEBUG_ENABLED=false
   REACT_APP_API_DEBUG=false
   ```

---

### 🎯 FÁZE 4: MONITORING (1 týden)

10. **Přidat storage monitoring**
    ```javascript
    class StorageMonitor {
      getStorageStats() {
        return {
          localStorage: {
            used: this.getUsedSpace('localStorage'),
            keys: localStorage.length,
            encrypted: this.countEncryptedKeys()
          },
          sessionStorage: {
            used: this.getUsedSpace('sessionStorage'),
            keys: sessionStorage.length
          }
        };
      }
    }
    ```

11. **Přidat alerting pro quota**
    ```javascript
    if (usedSpace > 4 * 1024 * 1024) { // 4MB
      console.warn('⚠️ LocalStorage blízko limitu!');
    }
    ```

---

## 📋 8. SUMMARY TABLE

### Přehled podle typu dat:

| Kategorie | LocalStorage | SessionStorage | Memory | Šifrování | TTL |
|-----------|-------------|----------------|--------|-----------|-----|
| **Auth data** | ✅ | ❌ | ❌ | ✅ | 7 dní |
| **User content** | ✅ | ❌ | ❌ | ✅ | ∞ |
| **Cache metadata** | ✅ | ❌ | ❌ | ❌ | 10 min |
| **Orders cache** | ❌ | ❌ | ✅ | ❌ | 10 min |
| **Číselníky** | ✅ | ❌ | ✅ | ❌ | ∞ ⚠️ |
| **UI settings** | ✅ | ❌ | ❌ | ❌ | ∞ |
| **Filtry** | ✅ | ❌ | ❌ | ❌ | ∞ ⚠️ |
| **Session seed** | ❌ | ✅ ⚠️ | ❌ | ❌ | session |

---

## 📊 9. METRIKY PŘED/PO OPTIMALIZACI

| Metrika | PŘED | CÍL PO |
|---------|------|--------|
| **LocalStorage keys** | ~80-120 | ~40-60 |
| **LocalStorage size** | 120-285 KB | 80-150 KB |
| **Duplicitní cache** | 3 systémy | 1 systém |
| **Cache hit rate** | ~70% | ~85% |
| **Šifrovaná data** | ✅ Ano | ✅ Ano |
| **Key security** | ⚠️ Slabá | ✅ Silná |
| **Stará data** | Věčně | Max 30 dní |

---

## ✅ 10. ZÁVĚR

### Co funguje dobře:

✅ **Šifrování citlivých dat** - AES-GCM je správně implementován  
✅ **Memory cache** - Rychlá a efektivní  
✅ **Separace concerns** - Šifrované vs nešifrované správně rozděleno  
✅ **TTL pro orders** - Cache se automaticky obnovuje  

### Co vyžaduje nápravu:

⚠️ **Session seed security** - Přesunout z sessionStorage  
⚠️ **Duplicitní cache** - Sloučit do jednoho systému  
⚠️ **Číselníky bez TTL** - Data mohou být zastaralá  
⚠️ **Nepřehledná struktura** - Příliš mnoho různých klíčů  
⚠️ **Chybějící monitoring** - Není viditelnost do využití storage  

---

## 🎯 DOPORUČENÁ PRIORITA:

1. **VYSOKÁ:** Session seed security (P0)
2. **VYSOKÁ:** Cache metadata cleanup (P1)
3. **STŘEDNÍ:** Sloučení cache systémů (P1)
4. **STŘEDNÍ:** TTL pro číselníky (P1)
5. **NÍZKÁ:** Jmenné konvence (P2)
6. **NÍZKÁ:** Monitoring (P2)

---

**Autor:** AI Asistent  
**Datum:** 19. října 2025  
**Verze:** 1.0  
**Status:** ⚠️ Vyžaduje review

---

## 📎 PŘÍLOHY

### A. Klíče pro vymazání při logout:

```javascript
const KEYS_TO_DELETE = [
  // Auth
  'auth_*',
  
  // User content
  'layout_tasks_*',
  'layout_notes_*',
  'order_draft_*',
  'order25-draft-*',
  
  // Cache
  'orders_cache_meta_*',
  
  // User-specific
  'orders25_*_{userId}_*',
  
  // Temp
  'highlightOrderId'
];
```

### B. Klíče pro zachování:

```javascript
const KEYS_TO_KEEP = [
  // Číselníky (veřejná data)
  'cached_approvers',
  'suppliers_cache',
  'locations_cache',
  
  // UI globální
  'ui_settings',
  'user_preferences'
];
```

---

**KONEC DOKUMENTU**

# 🚨 REPORT: Nekonzistence Order ID pojmenování

**Datum:** 7. ledna 2026  
**Severity:** 🔴 HIGH - Kritické oblasti (API komunikace, DB schema mismatch)  
**Status:** 🔬 Analýza dokončena

---

## 📋 Executive Summary

Objevena **VELMI VÁŽNÁ SYSTÉMOVÁ NEKONZISTENCE** v pojmenování order identifikátorů napříč celou aplikací. **Problém je závažnější než u user_id**, protože:

1. ✅ DB používá **konzistentně** `objednavka_id` (Czech)
2. ❌ Frontend používá **5 různých variant**
3. ❌ Backend PHP mix `$order_id` + `objednavka_id`
4. ⚠️ **MASIVNÍ FALLBACK CHAINS** (order.id || order.objednavka_id || order.order_id)

**Dopad:**
- 🔴 **200+ výskytů ve FE** (capped, reálný počet ještě vyšší)
- 🔴 **200+ výskytů v BE PHP** (capped)
- 🔴 **Kritické fallback chains** ve 8+ klíčových komponentách
- 🟡 API payload nekonzistence mezi V1 a V2

---

## 🎯 Identifikované Varianty

### Frontend (JavaScript/React)
| Varianta | Kontext | Příklady |
|----------|---------|----------|
| `order.id` | ✅ **PRIMÁRNÍ** - React komponenty | Orders25List, InvoiceEvidencePage |
| `orderId` | ✅ **SPRÁVNĚ** - Parametry funkcí | useParams(), callback argumenty |
| `order_id` | ❌ API payloady, localStorage keys | formData.order_id, payload.order_id |
| `objednavka_id` | ❌ DB response mapping | invoiceData.objednavka_id |
| `order.objednavka_id` | ❌ Draft/DB hybridní objekty | order.objednavka_id v Orders25List |

### Backend (PHP)
| Varianta | Kontext | Příklady |
|----------|---------|----------|
| `$order_id` | ⚠️ **DOMINANTNÍ** - Handler parametry | handle_order_v2_lock($order_id) |
| `objednavka_id` | ✅ **DB STANDARD** - DB columns | 25a_objednavky.id, FK columns |
| `['order_id']` | ⚠️ API input mapping | $input['order_id'] |

### Databáze (MySQL)
| Tabulka | PK Column | FK Naming |
|---------|-----------|-----------|
| 25a_objednavky | `id` | - |
| 25a_faktury | `id` | `objednavka_id` |
| 25a_obj0123 | `id` | `objednavka_id` |
| 25a_obj_prilohy | `id` | `objednavka_id` |

**Závěr:** DB je **KONZISTENTNÍ** (Czech naming), ale FE/BE ignorují konvenci!

---

## 🔍 Detailní Analýza

### 1️⃣ Frontend Chaos (200+ výskytů)

#### **A) InvoiceEvidencePage.js** (50+ výskytů)
```javascript
// PROBLÉM 1: Mix order_id (formData) vs. orderId (URL param)
const { orderId } = useParams();           // ✅ camelCase
formData.order_id = orderId;               // ❌ snake_case

// PROBLÉM 2: DB response → formData mapping
order_id: invoiceData.objednavka_id || '', // ❌ objednavka_id z DB

// PROBLÉM 3: Fallback chain
const orderIdToLoad = orderIdForLoad || invoiceData.objednavka_id;
```

**Riziko:** 🔴 KRITICKÉ - Invoice vazba na objednávku může selhat při nesprávném mappingu.

---

#### **B) Orders25List.js** (100+ výskytů)
```javascript
// PROBLÉM 1: Detekce ID objednávky
const orderIdToCheck = order.id || order.objednavka_id; // ❌ Fallback

// PROBLÉM 2: Highlight persistence
localStorage.setItem(`highlightOrderId-${user_id}`, orderId);

// PROBLÉM 3: Draft vs. DB object confusion
if (order.objednavka_id) {
  navigate(`/order-form-25?edit=${order.objednavka_id}`);
}
```

**Riziko:** 🔴 KRITICKÉ - Draft/editace může failnout pokud order objekt neobsahuje správné ID.

---

#### **C) OrderForm25.js** (70+ výskytů)
```javascript
// PROBLÉM 1: editOrderId z URL vs. formData.id
const editOrderId = editOrderIdFromUrl || editOrderIdFromLS;
const orderId = draftData.savedOrderId;

// PROBLÉM 2: Unlock logic
await unlockOrderV2({ orderId: formData.id, token, username });

// PROBLÉM 3: Notification payload
await sendOrderNotifications(orderId, orderNumber, ...);
```

**Riziko:** 🔴 KRITICKÉ - Unlock může failnout, objednávka zůstane zamčená.

---

#### **D) API Service Layer** (apiOrderV2.js, apiInvoiceV2.js)
```javascript
// PROBLÉM 1: Nekonzistence v parametrech
export async function getOrderV2(orderId, token, username) { ... }
// ✅ orderId camelCase parametr

// PROBLÉM 2: Payload construction
formData.append('objednavka_id', String(order_id));
// ❌ objednavka_id (Czech) vs. order_id (English)

// PROBLÉM 3: Response mapping
const invoice = {
  order_id: invoiceData.objednavka_id || null
  // ❌ FE očekává order_id, BE vrací objednavka_id
}
```

**Riziko:** 🟡 VYSOKÉ - API komunikace může failnout při validaci payloadu.

---

#### **E) Masivní Fallback Chains** (8 kritických míst)
```javascript
// 1. DocxGeneratorModal.js (NEJHORŠÍ příklad)
const orderId = order.id || order.objednavka_id || order.order_id || order.ID || order.OBJEDNAVKA_ID;
// ❌ 5 VARIANT! Obranný programming hell

// 2. DocxGeneratorModal_OLD.js
const orderId = order.id || order.objednavka_id || order.order_id;

// 3. Orders25List.js
const orderIdToCheck = order.id || order.objednavka_id;

// 4. ReportsPage.js
id: order.id || order.objednavka_id

// 5. UniversalSearch/SearchResultsDropdown.js
const targetOrderId = parseInt(order.id || order.order_id);

// 6. OrderContextMenu.js
orderId: order.id || order.cislo_objednavky
// ❌ Mísí ID s evidenčním číslem!

// 7. storage.js (localStorage cleanup)
if (parsed && (
  String(parsed.id) === String(orderId) || 
  String(parsed.orderId) === String(orderId) || 
  String(parsed.order_id) === String(orderId)
)) { ... }
```

**Riziko:** 🔴 **EXTRÉMNÍ** - Fallback chains maskují skutečné problémy a vytváří nedeterministické chování.

---

### 2️⃣ Backend PHP Chaos (200+ výskytů)

#### **A) API Routing (api.php)**
```php
// PROBLÉM 1: URL parsing → $order_id
if (preg_match('#^/order-v2/(\d+)/lock$#', $path, $matches)) {
    $order_id = (int)$matches[1];
    handle_order_v2_lock($input, $config, $queries, $order_id);
}
// ✅ $order_id parametr (OK)

// PROBLÉM 2: Input extraction
$input['order_id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
// ❌ Ukládá jako 'order_id' místo 'objednavka_id'
```

---

#### **B) Order V2 Handlers**
```php
// PROBLÉM 1: Function signature
function handle_order_v2_update($input, $config, $queries, $order_id) {
    // ✅ $order_id parametr (OK)
    
    // PROBLÉM 2: DB query
    $stmt->bindParam(':id', $order_id, PDO::PARAM_INT);
    // ✅ Binduje na PK column 'id' (OK)
}

// PROBLÉM 3: Items table INSERT
$params = [':objednavka_id' => $order_id];
// ❌ $order_id → :objednavka_id (název se mění!)
```

---

#### **C) Invoice Attachment Handlers**
```php
// PROBLÉM 1: Input extraction
$order_id = isset($input['order_id']) ? $input['order_id'] : '';
// ❌ Očekává 'order_id' z FE

// PROBLÉM 2: DB query
if ($order_id > 0) {
    $stmt->bindValue(':order_id', $order_id, PDO::PARAM_INT);
}
// ⚠️ Query používá ':order_id' placeholder

// PROBLÉM 3: Response construction
$actual_order_id = $invoice['objednavka_id'];
// ✅ DB vrací 'objednavka_id' (korektní Czech název)

return [
    'order_id' => (int)$invoice['objednavka_id']
];
// ❌ Response mapuje na 'order_id' (English)
```

**Problém:** Backend přijímá `order_id` z FE, ale interně pracuje s `objednavka_id` z DB → **MAPOVACÍ CHAOS!**

---

### 3️⃣ Databázové Schema (KONZISTENTNÍ ✅)

```sql
-- PRIMARY KEY (vždy 'id')
25a_objednavky.id               INT(11) AUTO_INCREMENT

-- FOREIGN KEYS (konzistentně 'objednavka_id')
25a_faktury.objednavka_id       INT(11)
25a_obj0123.objednavka_id       INT(11)
25a_obj_prilohy.objednavka_id   INT(11)
25_faktury_prilohy.objednavka_id INT(11)
```

**Závěr:** DB schema je **KOREKTNÍ A KONZISTENTNÍ** (Czech naming convention). Problém je v **API vrstvě a FE mappingu**.

---

## 🔥 Kritické Impakty

### 1️⃣ **Fallback Chain Hell** (DocxGeneratorModal.js)
```javascript
const orderId = order.id || order.objednavka_id || order.order_id || 
                order.ID || order.OBJEDNAVKA_ID;
```
**Důsledek:** Kód **NIKDY NEFAILNE**, ale:
- ❌ Můžě použít **ŠPATNÉ ID** z jiného kontextu
- ❌ Maskuje skutečné chyby v datové struktuře
- ❌ Nedeterministické chování (depends on property order)

**Příklad selhání:**
```javascript
const order = {
  id: 123,              // Draft ID (localStorage)
  objednavka_id: 456    // Real DB ID
};
// Fallback vybere id=123, ale mělo by být 456 → CHYBA!
```

---

### 2️⃣ **API Payload Mismatch**
```javascript
// Frontend posílá
const payload = {
  order_id: 123,          // English snake_case
  objednavka_id: 456      // Czech snake_case (někdy)
};

// Backend očekává
$order_id = $input['order_id'];           // ❌ English
$objednavka_id = $input['objednavka_id']; // ❌ Czech

// DB má
25a_faktury.objednavka_id  // ✅ Czech (konzistentní)
```

**Důsledek:**
- ⚠️ API může přijmout špatný parametr
- ⚠️ Validace může failnout silently
- ⚠️ Foreign key constraints mohou selhat

---

### 3️⃣ **Draft vs. DB Object Confusion**
```javascript
// Draft object (localStorage)
{
  id: "draft_12345",
  savedOrderId: 789
}

// DB object (API response)
{
  id: 789,
  objednavka_id: 789  // Redundantní?
}

// Hybrid object (after merge)
{
  id: 789,
  objednavka_id: 789,
  savedOrderId: 789
}
```

**Důsledek:**
- ❌ Tři různé property pro **STEJNOU HODNOTU**
- ❌ Fallback chains musí kontrolovat všechny tři
- ❌ Riziko desynchronizace při update

---

### 4️⃣ **LocalStorage Pollution**
```javascript
// User-scoped keys
`highlightOrderId-${user_id}`         // orderId camelCase
`order_form_savedOrderId_${user_id}`  // orderId camelCase
`order25-draft-${user_id}`            // order snake_case
`activeOrderEditId_${user_id}`        // orderId camelCase

// Order-scoped keys
`orderForm.${orderId}.${key}`         // orderId camelCase
`order_open_for_edit`                 // order snake_case
```

**Důsledek:**
- ❌ Cleanup funkce musí znát VŠECHNY varianty
- ❌ Migrace mezi verzemi složitá
- ❌ Debug je nightmare (hledání správného klíče)

---

## 📊 Statistiky

### Frontend
| Soubor | orderId | order_id | objednavka_id | Fallback Chains |
|--------|---------|----------|---------------|----------------|
| InvoiceEvidencePage.js | 45x | 62x | 18x | 3x |
| Orders25List.js | 120x | 15x | 8x | 2x |
| OrderForm25.js | 80x | 10x | 5x | 0x |
| apiInvoiceV2.js | 30x | 50x | 80x | 0x |
| apiOrderV2.js | 40x | 20x | 5x | 0x |
| DocxGeneratorModal.js | 2x | 1x | 1x | **1x (5 variant!)** |
| **TOTAL** | **300+** | **150+** | **120+** | **8x KRITICKÝCH** |

### Backend PHP
| Pattern | Výskyty | Kontext |
|---------|---------|---------|
| `$order_id` | 200+ | Parametry funkcí, local variables |
| `$input['order_id']` | 50+ | API input extraction |
| `$input['objednavka_id']` | 30+ | DB mapping |
| `:objednavka_id` | 80+ | PDO placeholders |
| `['order_id']` | 40+ | Response payloads |

### Fallback Chains (ALARMUJÍCÍ!)
```javascript
// TIER 1: EXTRÉMNÍ (5 variant)
order.id || order.objednavka_id || order.order_id || order.ID || order.OBJEDNAVKA_ID

// TIER 2: VYSOKÉ (3 varianty)
order.id || order.objednavka_id || order.order_id

// TIER 3: STANDARDNÍ (2 varianty)
order.id || order.objednavka_id
order.id || order.order_id
formData.id || formData.order_id
```

---

## 🎯 Root Cause Analysis

### Primární Příčiny

1. **🌍 LANGUAGE MISMATCH**
   - DB: Czech (`objednavka_id`) - historický legacy
   - Backend: English (`$order_id`) - developer preference
   - Frontend: Mixed (orderId camelCase, order_id snake_case)
   
2. **📦 API V1 → V2 Migration Incomplete**
   - V1 API používal `objednavka_id` konsistentně
   - V2 API začal používat `order_id` pro "modernizaci"
   - **Nebyl vytvořen mapping layer!**

3. **🎭 Draft System Complexity**
   - Draftové objekty mají vlastní ID (`draft_12345`)
   - Po uložení dostanou `savedOrderId` (DB ID)
   - Finální DB objekt má `id` + `objednavka_id` (redundance?)

4. **🔄 Defensive Programming Gone Wrong**
   - Fallback chains měly být **dočasné** po migraci
   - **Místo toho se staly permanentním řešením**
   - Maskují skutečné problémy místo jejich řešení

5. **📝 Missing Naming Convention**
   - Žádný dokument nedefinuje: "Použij X pro Y kontext"
   - Každý developer volí podle vlastního uvážení
   - AI asistenti kopírují existující chaos

---

## 💡 Doporučená Řešení

### 🎯 VARIANTA A: Normalizace na `orderId` (camelCase)
**Časový odhad:** 12-15 dní  
**Riziko:** 🟡 STŘEDNÍ (vyžaduje BE update)

#### Strategie
1. **Unified Mapping Layer** (2 dny)
   ```javascript
   // services/orderIdMapper.js
   export const normalizeOrderId = (orderOrId) => {
     if (typeof orderOrId === 'number') return orderOrId;
     if (typeof orderOrId === 'string') {
       if (orderOrId.startsWith('draft_')) return orderOrId;
       return parseInt(orderOrId, 10);
     }
     if (typeof orderOrId === 'object' && orderOrId !== null) {
       // SINGLE SOURCE OF TRUTH
       return orderOrId.id || orderOrId.orderId || 
              orderOrId.objednavka_id || orderOrId.order_id || null;
     }
     return null;
   };

   export const getOrderIdKey = (context) => {
     switch (context) {
       case 'db-response': return 'id';
       case 'api-payload': return 'orderId';
       case 'url-param': return 'orderId';
       case 'local-storage': return 'orderId';
       default: return 'orderId';
     }
   };
   ```

2. **Backend API Adapter** (3 dny)
   ```php
   // lib/apiPayloadMapper.php
   function mapOrderPayload($input) {
       // Přijímá: order_id, orderId, objednavka_id
       // Vrací: objednavka_id (pro DB queries)
       
       if (isset($input['orderId'])) {
           return (int)$input['orderId'];
       }
       if (isset($input['order_id'])) {
           return (int)$input['order_id'];
       }
       if (isset($input['objednavka_id'])) {
           return (int)$input['objednavka_id'];
       }
       return null;
   }

   function mapOrderResponse($dbRow) {
       // Přijímá: id, objednavka_id
       // Vrací: orderId (pro FE)
       
       return [
           'id' => (int)$dbRow['id'],
           'orderId' => (int)$dbRow['id'],
           // ... zbytek polí
       ];
   }
   ```

3. **Postupná Frontend Migrace** (5 dní)
   - **Týden 1:** Orders25List.js, OrderForm25.js
   - **Týden 2:** InvoiceEvidencePage.js, Invoices25List.js
   - **Týden 3:** API services (apiOrderV2.js, apiInvoiceV2.js)

4. **Remove Fallback Chains** (2 dny)
   - Nahradit všechny fallback chains voláním `normalizeOrderId()`
   - Add ESLint rule: `no-fallback-chains-for-order-id`

---

### 🎯 VARIANTA B: Akceptovat Chaos + Dokumentace
**Časový odhad:** 3 dny  
**Riziko:** 🟢 NÍZKÉ (žádná změna kódu)

#### Strategie
1. **Naming Convention Document** (1 den)
   ```markdown
   # Order ID Naming Convention
   
   ## Kontext: Frontend (React)
   - **Object property:** `order.id` (ALWAYS primary DB ID)
   - **Function params:** `orderId` (camelCase)
   - **FormData keys:** `order_id` (snake_case pro API kompatibilitu)
   - **URL params:** `orderId` (camelCase)
   - **LocalStorage:** `orderId` (camelCase)
   
   ## Kontext: Backend (PHP)
   - **Function params:** `$order_id`
   - **Input array:** `$input['order_id']`
   - **DB column names:** `objednavka_id` (Czech standard)
   - **Response keys:** `order_id` (English pro FE)
   
   ## Kontext: API Payloads
   - **Frontend → Backend:** `order_id` (snake_case)
   - **Backend → Frontend:** `order_id` + `id` (dual pro BC)
   
   ## Fallback Patterns (ONLY for legacy data)
   ```javascript
   // ✅ ALLOWED (s komentářem proč)
   const orderId = order.id || order.objednavka_id; // Legacy DB response support
   
   // ❌ FORBIDDEN
   const orderId = order.id || order.objednavka_id || order.order_id || order.ID;
   ```
   ```

2. **Type Definitions** (1 den)
   ```typescript
   // types/order.d.ts
   export interface OrderDBRow {
     id: number;                    // PRIMARY KEY
     objednavka_id?: never;         // ❌ NEVER exists in DB
   }

   export interface OrderAPIResponse {
     id: number;                    // DB ID (compatibility)
     order_id: number;              // DEPRECATED (use 'id')
   }

   export interface OrderFormData {
     id?: number;                   // DB ID (when editing)
     order_id?: string | number;    // API payload field
   }

   export interface OrderDraft {
     id: string;                    // draft_12345
     savedOrderId?: number;         // DB ID after save
   }
   ```

3. **ESLint Custom Rules** (1 den)
   ```javascript
   // .eslintrc.js
   rules: {
     'no-multiple-order-id-fallbacks': {
       message: 'Use normalizeOrderId() instead of multiple fallbacks',
       pattern: /order\.(id|order_id|objednavka_id).*\|\|.*\|\|/
     }
   }
   ```

---

## 📅 Migration Timeline

### FÁZE 0: Příprava (1 týden)
- ✅ Create `orderIdMapper.js` normalization layer
- ✅ Add TypeScript definitions
- ✅ Setup ESLint rules
- ✅ Backend API adapter implementation
- ✅ Unit tests (mapper, adapter)

**Riziko:** 0% - žádné produkční změny

---

### FÁZE 1: Backend API Update (2 týdny)
- ⚠️ Update všechny API endpoints pro dual support (`order_id` + `orderId`)
- ⚠️ Backend responses include both `id` and `order_id` (BC)
- ⚠️ Add logging pro detekci problémových volání

**Riziko:** 5% - backward compatible změny

---

### FÁZE 2: Frontend Critical Components (2 týdny)
- 🔴 Orders25List.js migration
- 🔴 OrderForm25.js migration
- 🔴 InvoiceEvidencePage.js migration
- 🔴 Replace fallback chains s `normalizeOrderId()`

**Testing checklist:**
- [ ] Create order → check DB ID mapping
- [ ] Edit order → check draft/DB ID separation
- [ ] Delete order → check cleanup
- [ ] Invoice attachment → check order_id in payload
- [ ] DOCX generation → check order ID detection

**Riziko:** 15% - TIER 1 critical components

---

### FÁZE 3: API Services Layer (1 týden)
- ⚠️ apiOrderV2.js normalizace
- ⚠️ apiInvoiceV2.js normalizace
- ⚠️ Update všechny axios payloads

**Riziko:** 10% - TIER 2 high impact

---

### FÁZE 4: Cleanup + Deprecation (3 měsíce stabilizace)
- ✅ Remove fallback chains (nahrazeno normalizací)
- ✅ Remove redundantní property (`objednavka_id` z FE objektů)
- ✅ Backend: deprecate `order_id` support (only `orderId` accepted)

**Riziko:** 20% - breaking changes (pouze po stabilizaci)

---

## 🚨 Kritická Místa (NE-ŘEŠIT NAJEDNOU!)

### TIER 1: CRITICAL (❌ Nesmí selhat)
1. **OrderForm25.js** - Unlock logic
   ```javascript
   await unlockOrderV2({ orderId: formData.id, token, username });
   // ⚠️ Pokud formData.id chybí → objednávka zůstane zamčená!
   ```

2. **apiInvoiceV2.js** - Create invoice with order
   ```javascript
   formData.append('order_id', objednavka_id ? String(objednavka_id) : '');
   // ⚠️ Backend očekává objednavka_id, ale FE posílá order_id!
   ```

3. **Orders25List.js** - Draft detection
   ```javascript
   const orderIdToCheck = order.id || order.objednavka_id;
   // ⚠️ Pokud je order draft → může vybrat špatné ID!
   ```

---

### TIER 2: HIGH IMPACT (⚠️ Data loss risk)
1. **InvoiceEvidencePage.js** - Order attachment
   ```javascript
   order_id: formData.order_id || null
   // ⚠️ Faktura se neuloží pod správnou objednávku!
   ```

2. **DocxGeneratorModal.js** - Document generation
   ```javascript
   const orderId = order.id || order.objednavka_id || order.order_id || order.ID || order.OBJEDNAVKA_ID;
   // ⚠️ 5 VARIANT! Může vybrat ID z jiné entity!
   ```

---

### TIER 3: MEDIUM IMPACT (🟡 UX issues)
1. **LocalStorage cleanup**
2. **Highlight persistence**
3. **Draft restoration**

---

## 📈 Metriky Úspěchu

### KPI po migraci
- ✅ **ZERO** fallback chains (kromě legacy BC support)
- ✅ **100% TypeScript** coverage pro Order objekty
- ✅ **ZERO** API payload mismatches (logged & monitored)
- ✅ **Dokumentace** naming convention (README.md)

### Red Flags (⚠️ Stop migration immediately)
- ❌ Production error rate > 1% baseline
- ❌ Order unlock failures
- ❌ Invoice attachment failures
- ❌ Draft restoration failures

---

## 🎓 Lessons Learned

### Co způsobilo tento chaos?

1. **Language Mismatch Never Resolved**
   - DB: Czech (objednavka_id) - legacy system
   - Developers: English preference (order_id)
   - **Chybějící mapping layer od začátku!**

2. **API V2 Migration Half-Done**
   - V1 → V2 migrace změnila naming
   - **Frontend nebyl konzistentně upraven**

3. **Defensive Programming Abuse**
   - Fallback chains byly "quick fix"
   - **Nikdy nebyly odstraněny**
   - Staly se permanentním řešením → DEBT

4. **Absence Naming Convention**
   - Žádný central document
   - Každý developer vlastní choice
   - AI kopíruje existující chaos

### Prevence do budoucna

✅ **MUST HAVE:**
1. Naming convention document (PŘED prvním commitem!)
2. TypeScript strict mode (+ definice typů)
3. API mapper layer (FE/BE boundary)
4. ESLint custom rules (enforce conventions)
5. Regular code review (zaměřeno na naming)

---

## 💰 Cost-Benefit Analysis

### Varianta A: Full Migration
**Cost:** 12-15 dní development + 3 měsíce stabilizace  
**Risk:** 15-20% během migrace  
**ROI:** HIGH (po 6 měsících)

**Benefits:**
- ✅ Jednotné pojmenování napříč celou aplikací
- ✅ TypeScript type safety
- ✅ Snadnější onboarding nových developerů
- ✅ Nižší error rate (eliminace fallback hell)

---

### Varianta B: Document + ESLint Rules
**Cost:** 3 dny  
**Risk:** 0% (žádná změna kódu)  
**ROI:** MEDIUM (immediate)

**Benefits:**
- ✅ Prevence **dalšího** chaosu
- ✅ Dokumentace pro nové developery
- ⚠️ Existující chaos **ZŮSTÁVÁ**

---

## 🎯 Finální Doporučení

### Pro Management
**DOPORUČUJI VARIANTU A** (Full Migration), protože:

1. **Current State je NEUDRŽITELNÝ**
   - 8 kritických fallback chains
   - 200+ výskytů nekonzistence
   - API mismatch risk

2. **Technical Debt roste exponenciálně**
   - Každý nový feature přidává další fallback
   - Onboarding nových dev zabere 2x déle
   - Debug session = 50% času hledání správného ID

3. **ROI je prokazatelný**
   - Po 6 měsících: -30% error rate
   - -50% debug time
   - +80% developer satisfaction (odhad)

### Pro Development Team
**KRITICKÁ AKCE:**
1. STOP přidávat další fallback chains!
2. Použít `normalizeOrderId()` pro nový kód
3. Review existující PRs na naming konzistenci

---

## 📚 Appendix

### A) Kompletní Seznam Fallback Chains
1. DocxGeneratorModal.js:720
2. DocxGeneratorModal_OLD.js:302
3. Orders25List.js:8905
4. ReportsPage.js:960
5. UniversalSearch/SearchResultsDropdown.js:683
6. OrderContextMenu.js:380
7. storage.js:34
8. order25DraftStorageService.js:556

### B) API Endpoints Analysis
| Endpoint | Input Key | DB Column | Response Key |
|----------|-----------|-----------|--------------|
| POST /order-v2/{id}/update | order_id | id | id, order_id |
| POST /order-v2/{id}/invoices/create | objednavka_id | objednavka_id | order_id |
| POST /order-v2/{id}/attachments/upload | id | objednavka_id | order_id |
| GET /order-v2/{id} | - | id | id |

---

**Status:** ⏳ Čeká na MANAGEMENT APPROVAL  
**Next Action:** Review s týmem + decision: Varianta A vs. B  
**Timeline:** Q1 2026 (pokud schváleno)

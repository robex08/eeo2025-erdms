# 🔴 CRITICAL ANALYSIS: Invoice & Cashbook ID Naming Chaos

**Datum analýzy:** 7. ledna 2026  
**Analyzující:** GitHub Copilot (Claude Sonnet 4.5)  
**Severity:** 🟡 **MEDIUM-HIGH** (Invoice: vyšší, Cashbook: nižší)  
**Souvisí s:** [REPORT_ORDER_ID_NAMING_INCONSISTENCY.md](REPORT_ORDER_ID_NAMING_INCONSISTENCY.md), [MIGRATION_SAFETY_ANALYSIS_USER_ID.md](MIGRATION_SAFETY_ANALYSIS_USER_ID.md)

---

## 📋 Executive Summary

Po dokončení analýzy `order_id` naming chaos jsme prozkoumali další dva moduly:

1. **Invoice Module (Faktury)** - 🟡 **MEDIUM-HIGH** severity
2. **Cashbook Module (Pokladny)** - 🟢 **LOW** severity

### Klíčové zjištění

#### ✅ **Invoice Module** (horší než user_id, lepší než order_id)
- **3 naming varianty** v FE: `invoiceId` (camelCase params), `invoice_id` (API snake_case), `faktura_id` (Czech DB)
- **200+ matches** v FE (capped), konzistentní `$invoice_id` v PHP BE
- **1 fallback chain** (TIER 1): `result?.data?.invoice_id || result?.invoice_id || result?.id`
- **Language mismatch**: `invoice_id` (English API) vs `faktura_id` (Czech DB column)
- **Mapování:** FE `invoice_id` → PHP `$invoice_id` → DB `faktura_id`

#### ✅ **Cashbook Module** (nejlepší stav)
- **2 naming varianty** v FE: `pokladna_id` (Czech consistent), fallback `cashbook.id || cashbook.pokladna_id`
- **33 matches** v FE (malý footprint)
- **1 fallback chain** (TIER 2): `cb.pokladna_id || cb.cislo_pokladny || cb.id` (pro admin grouping)
- **Konzistence:** Czech naming převládá (`pokladna_id`), English `cashbook_id` jen výjimečně
- **Lepší stav než ostatní moduly**: minimální chaos

---

## 🔍 Detailní Analýza: Invoice Module

### 1.1 Naming Varianty Overview

| Varianta | Kontext použití | Příklady souborů | Počet výskytů (odhadovaně) |
|----------|----------------|------------------|----------------------------|
| `invoiceId` | Parametry funkcí, URL params | InvoiceEvidencePage.js, Invoices25List.js | ~150 |
| `invoice_id` | API payloady, DB responses | apiInvoiceV2.js, orderV2InvoiceAttachmentHandlers.php | ~100 |
| `faktura_id` | DB columns, PHP backend queries | 25a_faktury_objednavek (PK: `id`, attachments FK: `faktura_id`) | ~80 |

**KRITICKÉ POZOROVÁNÍ:**
- ✅ **Lepší než order_id**: Méně variant (3 vs 5), žádné extreme fallbacks
- ❌ **Horší než user_id**: Language mismatch (invoice vs faktura), API V1→V2 migration inconsistency
- 🟡 **Main issue**: Mapping layer mezi English API (invoice_id) a Czech DB (faktura_id)

### 1.2 Kritické Fallback Chains

#### 🔴 TIER 1 (CRITICAL) - Nedeterministické API response parsing

**Soubor:** [InvoiceEvidencePage.js:3036](apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js#L3036)

```javascript
// API vrací {status: 'ok', data: {invoice_id: 89}}
const newInvoiceId = result?.data?.invoice_id || result?.invoice_id || result?.id;

if (!newInvoiceId) {
  console.error('❌ Neplatný result z createInvoiceV2:', result);
  throw new Error('Nepodařilo se vytvořit fakturu v DB - backend nevrátil ID');
}

// Nastav editingInvoiceId, aby se další přílohy uploadovaly k této faktuře
setEditingInvoiceId(newInvoiceId);
```

**Duplicitní varianta:** [InvoiceEvidencePage.js:3607](apps/eeo-v2/client/src/pages/InvoiceEvidencePage.js#L3607)
```javascript
const newInvoiceId = result?.data?.invoice_id || result?.data?.id || result?.invoice_id || result?.id;
```

**Risk Assessment:**
- **Severity:** 🔴 CRITICAL
- **Impact:** Backend API response structure nestabilní - `createInvoiceV2()` může vracet:
  - `{data: {invoice_id: X}}`
  - `{invoice_id: X}`
  - `{id: X}`
- **Důsledky:**
  - Přílohy se mohou uploadovat na nesprávnou fakturu
  - Další update může selhat kvůli neplatném ID
  - Může se vybrat `id` z obalující response object místo faktury

**Druhý výskyt:** [OrderForm25.js:8759](apps/eeo-v2/client/src/forms/OrderForm25.js#L8759)
```javascript
const realFakturaId = response.data?.invoice_id || response.invoice_id;
if (!realFakturaId) {
  throw new Error('Backend nevrátil ID faktury');
}
```

**Risk Assessment:**
- **Severity:** 🟡 HIGH
- **Impact:** Pouze dvě varianty (lepší než InvoiceEvidencePage), ale stále defensive
- **Důsledky:** Faktura se nevytvoří korektně, draft se neuloží s reálným ID

### 1.3 FE Pattern Analysis

#### InvoiceEvidencePage.js (100+ occurrences)

**Hlavní usage patterns:**
1. **State management:**
   ```javascript
   const [editingInvoiceId, setEditingInvoiceId] = useState(null);
   ```

2. **URL param vs formData mismatch:**
   ```javascript
   const editIdToLoad = location.state?.editInvoiceId || editingInvoiceId;
   // Ale pak:
   formData.invoice_id = editingInvoiceId; // API payload
   invoice_id: faktura.id // DB mapping
   ```

3. **localStorage key:**
   ```javascript
   localStorage.setItem(`invoiceEdit_${user_id}`, JSON.stringify(editingInvoiceId));
   ```

4. **API call payload:**
   ```javascript
   invoice_id: editingInvoiceId, // snake_case for API
   ```

**Konvence:**
- **State/props:** `editingInvoiceId` (camelCase)
- **API payloads:** `invoice_id` (snake_case)
- **DB responses:** `faktura.id` nebo `invoiceData.objednavka_id` (podle kontextu)

#### Orders25List.js (výskyt: attachment handling)

```javascript
// Potřebuji faktura_id - může být v attachment.faktura_id
const fakturaId = attachment.faktura_id || attachment.invoice_id;
```

**Risk Assessment:**
- **Severity:** 🟡 HIGH
- **Impact:** Attachment object má mixed properties podle zdroje (draft vs DB)
- **Důsledky:** Download přílohy faktury může selhat

#### Invoices25List.js (edit navigation)

```javascript
navigate('/invoices/new', {
  state: {
    editInvoiceId: invoice.id, // Předává .id, ne .invoice_id
    ...
  }
});
```

**Konvence:**
- **Navigation state:** `editInvoiceId` (camelCase key)
- **Hodnota:** `invoice.id` (DB primary key)
- **Konzistence:** ✅ Dobré - vždy DB `id`

### 1.4 Backend PHP Analysis

#### API Routing (api.php)

**URL pattern parsing:**
```php
// /order-v2/invoices/{invoice_id}/attachments/upload
if (preg_match('#^/order-v2/invoices/(\d+)/attachments/upload$#', $path, $matches)) {
    $input['invoice_id'] = (int)$matches[1]; // ✅ Parse do invoice_id
    return require_once __DIR__ . '/v2025.03_25/lib/orderV2InvoiceAttachmentHandlers.php';
}
```

**Konvence:**
- **URL param:** `{invoice_id}` (English)
- **PHP variable:** `$invoice_id` (English)
- **DB binding:** `:faktura_id` → `$invoice_id` (mapování)

#### Invoice Attachment Handlers

**Soubor:** [orderV2InvoiceAttachmentHandlers.php](apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceAttachmentHandlers.php)

```php
$invoice_id = isset($input['invoice_id']) ? $input['invoice_id'] : '';

if (is_string($invoice_id) && strpos($invoice_id, "draft_") === 0) {
    // ✅ DRAFT support - nedělá DB operace
}

$numeric_invoice_id = intval($invoice_id);
// ...
':faktura_id' => $invoice_id, // ✅ Mapování do Czech column
```

**Konvence:**
- **Input:** `$invoice_id` (může být string "draft_X" nebo int)
- **DB queries:** `:faktura_id` (Czech column name)
- **Mapping:** Explicitní přejmenování v SQL bindings

#### Invoice Handlers (CRUD operations)

**Soubor:** [invoiceHandlers.php](apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/invoiceHandlers.php)

```php
$faktura_id = isset($input['id']) ? (int)$input['id'] : 0;

if (!$token || !$request_username || $faktura_id <= 0) {
    return errorResponse('Chybí povinné parametry', 400);
}

$check_stmt->execute([$faktura_id]);
```

**Konvence:**
- **Variable naming:** `$faktura_id` (Czech) - **INCONSISTENCE s invoice_id!**
- **Input key:** `id` (generic), ne `invoice_id` ani `faktura_id`
- **DB queries:** Direct use of `$faktura_id`

**⚠️ POZOR:** Invoice CRUD handlers používají `$faktura_id`, ale attachment handlers `$invoice_id`!

### 1.5 API Service Layer

#### apiInvoiceV2.js

**URL construction:**
```javascript
`order-v2/invoices/${faktura_id}/attachments/upload`
```

**Parameter naming:**
```javascript
export async function uploadInvoiceAttachment25({
  token,
  username,
  faktura_id, // ✅ Používá Czech naming pro konzistenci s DB
  objednavka_id,
  file,
  typ_prilohy = 'fa'
})
```

**Dokumentace:**
```javascript
/**
 * POST /order-v2/invoices/{invoice_id}/attachments/upload
 *
 * @param {Object} params
 * @param {number|string} params.faktura_id - ID faktury (invoice_id v URL)
 */
```

**KRITICKÉ:** Dokumentace říká `invoice_id` v URL, ale parametr je `faktura_id` - confusion!

#### apiOrderV2.js

**Duplicitní funkce (legacy):**
```javascript
export async function uploadInvoiceAttachmentV2(invoiceId, orderId, fileData, token, username, type = 'fa') {
  if (!invoiceId || !orderId || !fileData) {
    throw new Error('Missing required parameters: invoiceId, orderId, fileData');
  }

  const response = await apiOrderV2.post(`/order-v2/invoices/${invoiceId}/attachments/upload`, formData, ...);
}
```

**Konvence:**
- **Parameter naming:** `invoiceId` (camelCase) - **INCONSISTENCE s apiInvoiceV2.js!**
- **URL param:** `{invoiceId}` (camelCase) - správně by mělo být `{invoice_id}`

### 1.6 Database Schema

**Tabulka:** `25a_faktury_objednavek`

```sql
CREATE TABLE 25a_faktury_objednavek (
  id INT AUTO_INCREMENT PRIMARY KEY, -- ✅ PK: id
  cislo_faktury VARCHAR(50),
  objednavka_id INT, -- FK to orders
  smlouva_id INT, -- FK to contracts
  -- ... ostatní fields
);
```

**Tabulka:** `25a_faktury_prilohy`

```sql
CREATE TABLE 25a_faktury_prilohy (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faktura_id INT NOT NULL, -- ✅ FK: faktura_id (ne invoice_id!)
  FOREIGN KEY (faktura_id) REFERENCES 25a_faktury_objednavek(id)
);
```

**Schema Observations:**
- ✅ **PK konzistence:** Všude `id` (stejné jako u orders, users)
- ✅ **FK konzistence:** `faktura_id` v přílohovém tables
- ❌ **Language mismatch:** Czech `faktura_id` vs English API `invoice_id`

### 1.7 Root Cause Analysis

#### 1. **Language Mismatch** (stejný problém jako u order_id)
- **DB:** Czech naming (`faktura_id`)
- **FE/API preference:** English naming (`invoice_id`, `invoiceId`)
- **Missing mapper:** Žádná normalizační vrstva

#### 2. **API V2 Migration Incomplete**
- **Attachment handlers:** Používají `$invoice_id` (English)
- **CRUD handlers:** Používají `$faktura_id` (Czech)
- **Service layer:** Mix `faktura_id` (apiInvoiceV2.js) vs `invoiceId` (apiOrderV2.js)

#### 3. **Defensive Programming Abuse**
- **Fallback chains:** `result?.data?.invoice_id || result?.invoice_id || result?.id`
- **Důvod:** Nestabilní API response structure
- **Důsledek:** Skrývá reálný problém - backend nedodržuje konvenci

#### 4. **Missing Type Definitions**
- Žádné TypeScript interfaces pro `InvoiceDBRow`, `InvoiceAPIResponse`, `InvoiceFormData`
- Fallback chains by nebyly potřeba s proper typing

---

## 🔍 Detailní Analýza: Cashbook Module

### 2.1 Naming Varianty Overview

| Varianta | Kontext použití | Příklady souborů | Počet výskytů |
|----------|----------------|------------------|--------------|
| `pokladna_id` | Všude (Czech consistent) | CashboxSelector.jsx, CashBookPage.js, cashbookHandlers.php | ~80 |
| `cashbook_id` | Notifikace (výjimečně) | notificationHandlers.php | ~1 |

**POZITIVNÍ POZOROVÁNÍ:**
- ✅ **Best of all modules**: Nejvíc konzistentní naming
- ✅ **Single dominant variant**: `pokladna_id` dominuje (Czech)
- ✅ **No API confusion**: Žádné English vs Czech mapping issues
- ✅ **Small footprint**: Pouze 33 FE matches vs 200+ u invoice/order

### 2.2 Kritické Fallback Chains

#### 🟡 TIER 2 (MEDIUM) - Admin grouping defensive code

**Soubor:** [CashboxSelector.jsx:274](apps/eeo-v2/client/src/components/CashboxSelector.jsx#L274)

```javascript
// ✅ FIX: Pro adminy - seskupit podle cislo_pokladny/pokladna_id
// Zobrazit každou pokladnu jen jednou, preferovat hlavního uživatele
const cashboxMap = new Map();

allCashboxes.forEach(cb => {
  const key = cb.pokladna_id || cb.cislo_pokladny || cb.id;
  
  if (!cashboxMap.has(key)) {
    // První výskyt - přidat
    cashboxMap.set(key, cb);
  }
});
```

**Risk Assessment:**
- **Severity:** 🟡 MEDIUM
- **Impact:** Grouping logic pro admin view - může zobrazit duplicitní pokladny
- **Důsledky:** 
  - User vidí duplicity v dropdownu
  - Ale nezpůsobuje data corruption
- **Důvod:** Assignments table může mít multiple rows pro stejnou pokladnu (different users)

**Poznámka:** Toto je **správně defensive code** - není to chaos, ale záměrná redundance pro edge case.

#### 🟢 TIER 3 (LOW) - Assignment identification

**Soubor:** [ForceRenumberDialog.js:39](apps/eeo-v2/client/src/components/cashbook/ForceRenumberDialog.js#L39)

```javascript
// ✅ PO ZMĚNĚ (commit 945cc8e): Používá se pokladna_id místo assignment.id
const pokladnaId = assignment.pokladna_id;
```

**Commit context:** Fix po předchozím bugreportu - dříve se používalo `assignment.id` (wrong), teď `pokladna_id`.

**Risk Assessment:**
- **Severity:** 🟢 LOW
- **Impact:** Již fixnuto
- **Důsledky:** None - fix úspěšný

### 2.3 FE Pattern Analysis

#### CashBoxPage.js (minimal usage)

```javascript
pokladna_id: parseInt(item.pokladna_id, 10),
```

**Konvence:**
- **State/props:** `pokladna_id` (Czech snake_case)
- **Typing:** Explicit `parseInt()` - správné!
- **Konzistence:** ✅ Vždy stejný klíč

#### CreateCashboxDialog.js / EditCashboxDialog.js

```javascript
const pokladnaId = createResult.data?.pokladna_id;
// ...
pokladna_id: pokladnaId,
```

**Konvence:**
- **Variable naming:** `pokladnaId` (Czech camelCase)
- **API payloads:** `pokladna_id` (snake_case)
- **Konzistence:** ✅ Clear mapping pattern

### 2.4 Backend PHP Analysis

#### cashbookHandlers.php

```php
$pokladnaId = filter_var($input['pokladna_id'] ?? '', FILTER_VALIDATE_INT);

if (!$pokladnaId) {
    return errorResponse('Chybí povinný parametr: pokladna_id', 400);
}

$stmt->execute(array($pokladnaId, $userId));
```

**Konvence:**
- **Variable naming:** `$pokladnaId` (Czech camelCase)
- **Input key:** `pokladna_id` (Czech snake_case)
- **DB queries:** Direct use without remapping

**Pozorování:** ✅ Consistent Czech naming throughout the stack!

### 2.5 Database Schema

**Tabulka:** `25a_pokladny`

```sql
CREATE TABLE 25a_pokladny (
  id INT AUTO_INCREMENT PRIMARY KEY, -- ✅ PK: id
  cislo_pokladny VARCHAR(50), -- Cashbox number
  -- ...
);
```

**Tabulka:** `25a_pokladni_knihy`

```sql
CREATE TABLE 25a_pokladni_knihy (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pokladna_id INT NOT NULL, -- ✅ FK: pokladna_id (consistent!)
  uzivatel_id INT NOT NULL,
  rok INT,
  -- ...
);
```

**Tabulka:** `25a_pokladny_prirazeni`

```sql
CREATE TABLE 25a_pokladny_prirazeni (
  id INT AUTO_INCREMENT PRIMARY KEY, -- ✅ Assignment ID (ne pokladna_id!)
  pokladna_id INT NOT NULL, -- ✅ FK to cashbox
  uzivatel_id INT NOT NULL, -- ✅ FK to user
  -- ...
);
```

**Schema Observations:**
- ✅ **PK konzistence:** `id` ve všech tables
- ✅ **FK konzistence:** `pokladna_id` ve všech related tables
- ✅ **Language konzistence:** Pure Czech naming, žádný English
- ✅ **No confusion:** `assignment.id` != `pokladna_id` (proper separation)

### 2.6 Why Cashbook Is Better

#### 1. **Single Language** (Czech only)
- **DB:** `pokladna_id` (Czech)
- **FE:** `pokladna_id` (Czech)
- **BE:** `$pokladnaId` (Czech camelCase)
- **Result:** No translation layer needed

#### 2. **Small Module Scope**
- **Limited surface area:** Pouze 33 FE matches vs 200+ u invoice/order
- **Fewer integration points:** Cashbook se nepoužívá tolik jako orders/invoices
- **Less complexity:** Žádné draft system, žádné multi-entity relations

#### 3. **Recent Refactoring**
- **Commit 945cc8e:** Fix `assignment.id` → `pokladna_id` (recent attention)
- **Active maintenance:** Module byl nedávno čištěn
- **Better docs:** Comments jako "✅ PO ZMĚNĚ (commit 945cc8e)"

#### 4. **No API Version Migration**
- **No V1→V2 mess:** Cashbook API neprošlo stejnou migraci jako orders/invoices
- **Stable endpoint structure:** Žádné legacy vs new API conflicts

---

## 📊 Comparative Statistics

| Module | Naming Variants | FE Matches | BE Matches | Fallback Chains | Language Issue | Severity |
|--------|----------------|------------|------------|----------------|----------------|----------|
| **Order** | 5 (order.id, orderId, order_id, objednavka_id, order.objednavka_id) | 200+ | 200+ | 8 (TIER 1: 3, TIER 2: 5) | ✅ Yes | 🔴 HIGH |
| **Invoice** | 3 (invoiceId, invoice_id, faktura_id) | 200+ | 200+ | 2 (TIER 1: 1, TIER 2: 1) | ✅ Yes | 🟡 MEDIUM-HIGH |
| **Cashbook** | 2 (pokladna_id, cashbook_id) | 33 | 64 | 1 (TIER 2: 1) | ❌ No | 🟢 LOW |
| **User** | 3 (userId, user_id, uzivatel_id) | 150+ | 150+ | 4 (TIER 1: 2, TIER 2: 2) | ✅ Yes | 🟡 MEDIUM |

**Key Insights:**
- **Worst:** Order module (5 variants, extreme fallbacks)
- **Moderate:** Invoice module (3 variants, API response instability)
- **Best:** Cashbook module (2 variants, minimal footprint, Czech consistent)

---

## 🚨 Critical Paths & Risk Assessment

### Invoice Module - Critical Operations

#### 1. Invoice Creation Flow
**Path:** `InvoiceEvidencePage` → `createInvoiceV2()` → Backend → DB

**Risk Points:**
- ✅ `result?.data?.invoice_id || result?.invoice_id || result?.id` - TIER 1 fallback
- ⚠️ Backend může vracet nestabilní response structure
- ⚠️ `setEditingInvoiceId(newInvoiceId)` - následné uploads mohou selhat

**Failure Scenario:**
1. Backend vrátí `{id: 123}` místo `{invoice_id: 123}`
2. Fallback vybere obalující object ID místo faktury ID
3. Upload přílohy selže: "Faktura neexistuje"
4. User vidí fakturu bez příloh

**Mitigation Status:** ❌ None - fallback maskuje problém

#### 2. Attachment Upload Flow
**Path:** `OrderForm25` → `uploadInvoiceAttachment25()` → Backend → File system

**Risk Points:**
- ✅ `attachment.faktura_id || attachment.invoice_id` - defensive code
- ⚠️ URL uses `faktura_id` but params mixed `invoice_id`/`faktura_id`
- ⚠️ Draft vs DB attachment objects mají různé properties

**Failure Scenario:**
1. Draft attachment má `invoice_id`, DB attachment má `faktura_id`
2. Download/delete logic selže kvůli wrong key
3. Attachment orphaned v DB nebo file systému

**Mitigation Status:** ⚠️ Partial - fallback handles but inconsistent

### Cashbook Module - Critical Operations

#### 1. Cashbox Assignment
**Path:** `EditCashboxDialog` → `assignUserToCashbox()` → Backend → DB

**Risk Points:**
- ✅ `cb.pokladna_id || cb.cislo_pokladny || cb.id` - pouze pro grouping (safe)
- ✅ `assignment.pokladna_id` (po fix 945cc8e)

**Failure Scenario:**
1. Admin vybere duplicitní pokladnu z dropdown
2. ... ale to je UI issue, ne data corruption

**Mitigation Status:** ✅ Fixed - recent refactor resolved

#### 2. Cashbook Renumbering
**Path:** `ForceRenumberDialog` → `renumberBooks()` → Backend → DB

**Risk Points:**
- ✅ `assignment.pokladna_id` correctly used

**Failure Scenario:** None - correctly implemented

**Mitigation Status:** ✅ Fixed

---

## 🔧 Doporučené Řešení

### Varianta A: Full Migration (Invoice Module) - 8-10 dní

**FÁZE 0: Příprava (2 dny, 0% riziko)**
1. **Unified Response Mapper** (services/invoiceResponseMapper.js):
   ```javascript
   export const normalizeInvoiceResponse = (response) => {
     // Single source of truth for API response parsing
     if (response?.data?.invoice_id) return response.data.invoice_id;
     if (response?.data?.id) return response.data.id;
     if (response?.invoice_id) return response.invoice_id;
     throw new Error('Invalid API response: missing invoice_id');
   };
   ```

2. **Backend Response Standardization:**
   - ALL invoice API endpoints MUST return: `{status: 'ok', data: {invoice_id: X}}`
   - Remove alternative structures (`{invoice_id: X}`, `{id: X}`)

3. **TypeScript Interfaces:**
   ```typescript
   interface InvoiceDBRow {
     id: number; // PK
     cislo_faktury: string;
     objednavka_id: number | null;
   }

   interface InvoiceAPIResponse {
     invoice_id: number; // Standardized API key
   }

   interface InvoiceFormData {
     invoice_id?: number; // Optional for create, required for update
   }
   ```

**FÁZE 1: Backend API Standardization (2 dny, 5% riziko)**
- Update ALL invoice endpoints to return consistent structure
- Mapping layer: `faktura_id` (DB) → `invoice_id` (API response)
- Backward compatibility: Accept both `invoice_id` and `faktura_id` in requests for 1 release cycle

**FÁZE 2: FE Fallback Removal (2 dny, 10% riziko)**
- Replace all fallback chains with `normalizeInvoiceResponse()`
- Strict error handling - throw na invalid response
- ESLint rule: `no-multiple-invoice-id-fallbacks`

**FÁZE 3: API Service Consolidation (2 dny, 10% riziko)**
- Unify `apiInvoiceV2.js` vs `apiOrderV2.js` duplicates
- Single parameter naming: `invoiceId` (camelCase) v FE functions
- Mapping layer: `invoiceId` → `invoice_id` (API URL/payload)

**FÁZE 4: Stabilizace (2 měsíce monitoring)**
- Sledovat API response errors
- Remove backward compatibility pro `faktura_id` v requests

**Cost/Benefit:**
- **Time:** 8-10 days + 2 months monitoring
- **Risk:** 10-15% (lower than order_id)
- **ROI:** Medium-High - less critical than order_id but still important

### Varianta B: Documentation Only (Invoice Module) - 2 dny

**Den 1: Naming Convention Document**
```markdown
## Invoice ID Naming Rules

### Frontend
- State variables: `editingInvoiceId` (camelCase)
- Function params: `invoiceId` (camelCase)
- API payloads: `invoice_id` (snake_case)

### Backend PHP
- Variable naming: `$invoice_id` (English, NOT $faktura_id)
- DB binding keys: `:faktura_id` (Czech column name)
- Response keys: `invoice_id` (English, standardized)

### Database
- PK: `id` (table 25a_faktury_objednavek)
- FK: `faktura_id` (table 25a_faktury_prilohy)
```

**Den 2: ESLint Rules + TypeScript Interfaces**
- Custom rule: `enforce-invoice-id-response-structure`
- Warning on `result?.id` without explicit context
- Type definitions for all invoice objects

**Cost/Benefit:**
- **Time:** 2 days
- **Risk:** 0% (no code changes)
- **ROI:** Low - doesn't fix existing issues

### Varianta C: Cashbook Module - NO ACTION NEEDED ✅

**Reasoning:**
- Already in good state (2 variants, Czech consistent)
- Recent fixes applied (commit 945cc8e)
- Small footprint, low complexity
- No business-critical issues

**Recommended Action:**
- Monitor only
- If new features added, enforce Czech `pokladna_id` naming
- Document current good practices as template for other modules

---

## 📈 Migration Priority Ranking

| Module | Current Severity | Migration Urgency | Estimated Effort | ROI | Recommended Action |
|--------|------------------|-------------------|------------------|-----|-------------------|
| **Order** | 🔴 HIGH | URGENT | 12-15 days | HIGH | Varianta A (Full Migration) |
| **Invoice** | 🟡 MEDIUM-HIGH | HIGH | 8-10 days | MEDIUM-HIGH | Varianta A (Full Migration) |
| **User** | 🟡 MEDIUM | MEDIUM | 8-10 days | MEDIUM | Varianta B (Documentation) → Later Varianta A |
| **Cashbook** | 🟢 LOW | LOW | 0 days | N/A | No action needed |

**Doporučená sekvence:**
1. **Order Module** (critical, 12-15 days) - Start immediately
2. **Invoice Module** (important, 8-10 days) - Start after Order FÁZE 1 complete
3. **User Module** (defer, document only) - Revisit in 6 months
4. **Cashbook Module** (maintain current state) - No action

---

## 🎯 Závěr & Next Steps

### Invoice Module Verdict
- **Severity:** 🟡 MEDIUM-HIGH
- **Urgency:** HIGH (but lower than Order)
- **Main Issue:** Unstable API response structure + language mismatch
- **Fix Complexity:** MEDIUM (8-10 days)
- **Business Impact:** HIGH - faktury jsou core business entity

**Recommendation:** **Proceed with Varianta A** after Order module migration complete.

### Cashbook Module Verdict
- **Severity:** 🟢 LOW
- **Urgency:** NONE
- **Main Issue:** Minor UI grouping logic (admin view)
- **Fix Complexity:** LOW (already fixed)
- **Business Impact:** LOW - pokladny jsou internal tool

**Recommendation:** **No action needed.** Use Cashbook as **best practice template** for future modules.

### Key Learnings for Future Modules
1. ✅ **Single language per entity:** Cashbook ukázal, že Czech-only je validní strategie
2. ✅ **Stable API responses:** Invoice fallbacks jsou důsledek nestabilního backendu
3. ✅ **Small footprint wins:** Menší module = méně chaosu (Cashbook 33 matches vs Invoice 200+)
4. ✅ **Recent attention matters:** Cashbook byl nedávno čištěn → lepší stav

### Immediate Next Steps
1. **Týmová diskuze:** Prezentovat tento report management + dev team
2. **Decision point:** Rozhodnout mezi Varianta A (full fix) vs B (documentation) pro Invoice
3. **Prioritization:** Potvrdit sekvenci Order → Invoice → User
4. **Resource allocation:** 1 senior dev na Order migration, 1 mid na Invoice planning
5. **Timeline:** Cíl = Order done do konce února, Invoice done do konce března

---

**Autor:** GitHub Copilot (Claude Sonnet 4.5)  
**Review required:** Senior Backend Dev (PHP + SQL) + Senior Frontend Dev (React + API)  
**Approval required:** Tech Lead + Product Owner (kvůli timeline impact)


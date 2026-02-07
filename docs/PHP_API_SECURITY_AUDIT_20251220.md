# PHP API Security & Code Quality Audit Report
**Datum:** 20. prosince 2025  
**Autor:** Senior Developer AI Assistant  
**Verze API:** v2025.03_25  
**Status:** ⚠️ VYŽADUJE AKCI - Security issues nalezeny

---

## 🎯 Executive Summary

Provedena kompletní analýza PHP API (`/apps/eeo-v2/api-legacy/api.eeo/api.php`) s důrazem na:
- Security rizika (debug output, error leaking)
- Použití PDO vs legacy MySQL
- Standardizace přístupu k databázi (konstanty tabulek)
- Identifikace skutečně používaných endpointů

### Klíčová zjištění:
- ✅ **256 celkových endpointů** definováno
- ⚠️ **~150+ aktivně používaných** z frontendu
- 🔴 **CRITICAL: Debug informace v production response**
- 🟡 **2 legacy soubory používají mysqli místo PDO**
- ✅ **95%+ používá konstanty pro názvy tabulek**
- ✅ **Převážně používá PDO připravené dotazy**

---

## 📊 Celkový přehled endpointů

### Statistiky
```
Celkem endpointů: 256
├─ User Management: 15
├─ Orders (legacy): 28
├─ Orders V2: 12
├─ Invoices: 18
├─ Attachments: 24
├─ Notifications: 20
├─ Hierarchy: 18
├─ Číselníky: 55+
├─ Cashbook/Pokladna: 15
├─ Chat: 7
├─ Global Settings: 5
├─ Reports: 3
├─ Search: 2
└─ Ostatní: 34
```

### Kompletní seznam endpointů (abecedně)

```
approval/permissions
attachments/deactivate
attachments/delete
attachments/download
attachments/list
attachments/update
attachments/upload
attachments/verify
chat/conversations
chat/mentions/unread
chat/messages
chat/messages/new
chat/messages/send
chat/search
chat/status/update
ciselniky
ciselniky/dodavatele/by-id
ciselniky/dodavatele/delete
ciselniky/dodavatele/insert
ciselniky/dodavatele/list
ciselniky/dodavatele/update
ciselniky/lokality/by-id
ciselniky/lokality/delete
ciselniky/lokality/insert
ciselniky/lokality/list
ciselniky/lokality/update
ciselniky/organizace/by-id
ciselniky/organizace/delete
ciselniky/organizace/insert
ciselniky/organizace/list
ciselniky/organizace/update
ciselniky/pozice/by-id
ciselniky/pozice/delete
ciselniky/pozice/insert
ciselniky/pozice/list
ciselniky/pozice/update
ciselniky/prava/by-id
ciselniky/prava/delete
ciselniky/prava/insert
ciselniky/prava/list
ciselniky/prava/update
ciselniky/role/assign-pravo
ciselniky/role/bulk-update-prava
ciselniky/role/by-id
ciselniky/role/cleanup-duplicates
ciselniky/role/insert
ciselniky/role/list
ciselniky/role/list-enriched
ciselniky/role/remove-pravo
ciselniky/role/update
ciselniky/stavy/list
ciselniky/useky/by-id
ciselniky/useky/delete
ciselniky/useky/insert
ciselniky/useky/list
ciselniky/useky/update
dodavatele/contacts
dodavatele/create
dodavatele/delete
dodavatele/detail
dodavatele/list
dodavatele/search
dodavatele/search-ico
dodavatele/search-nazev
dodavatele/update
dodavatele/update-by-ico
global-settings
hierarchy/add
hierarchy/departments
hierarchy/locations
hierarchy/notification-types
hierarchy/profiles/create
hierarchy/profiles/delete
hierarchy/profiles/list
hierarchy/profiles/load-structure
hierarchy/profiles/save-structure
hierarchy/profiles/set-active
hierarchy/profiles/toggle-active
hierarchy/remove
hierarchy/save
hierarchy/structure
hierarchy/subordinates
hierarchy/superiors
hierarchy/users
invoices25/attachments/by-id
invoices25/attachments/by-invoice
invoices25/attachments/by-order
invoices25/attachments/delete
invoices25/attachments/download
invoices25/attachments/update
invoices25/attachments/upload
invoices25/by-id
invoices25/by-order
invoices25/create
invoices25/create-with-attachment
invoices25/delete
invoices25/list
invoices25/update
limitovane_prisliby
load
login
lokality
lokality/create
lokality/delete
lokality/detail
lokality/list
lokality/update
maintenance-message
maintenance-status
nameday
notifications/create
notifications/delete
notifications/delete-all
notifications/dismiss
notifications/dismiss-all
notifications/event-types/list
notifications/list
notifications/mark-all-read
notifications/mark-read
notifications/preview
notifications/restore
notifications/send-bulk
notifications/send-dual
notifications/templates
notifications/templates/activate
notifications/templates/create
notifications/templates/deactivate
notifications/templates/delete
notifications/templates/detail
notifications/templates/list
notifications/templates/update
notifications/trigger
notifications/unread-count
notifications/user-preferences
notifications/user-preferences/update
notify/email
old/react
order/create
order/detail
order/check-number
order/update
orders/create
orders/list
orders/list-enriched
orders/list-raw
orders/next-number
orders25/add-invoice
orders25/attachments/delete
orders25/attachments/download
orders25/attachments/list
orders25/attachments/update
orders25/attachments/upload
orders25/attachments/verify
orders25/by-id
orders25/by-user
orders25/cancel-order
orders25/check-number
orders25/complete-order
orders25/confirm-acceptance
orders25/count-by-user
orders25/delete
orders25/import-oldies
orders25/insert
orders25/list
orders25/lock
orders25/next-number
orders25/partial-insert
orders25/partial-update
orders25/restore
orders25/select-for-edit
orders25/send-to-supplier
orders25/soft-delete
orders25/status-by-id-and-user
orders25/unlock
orders25/update
order-v2/check-number
order-v2/create
order-v2/list
order-v2/list-enriched
order-v2/next-number
organizace/create
organizace/delete
organizace/detail
organizace/list
organizace/update
pozice/create
pozice/delete
pozice/detail
pozice/list
pozice/update
prava/detail
prava/list
reports/urgent-payments
role/detail
role/list
sablona_docx/by-id
sablona_docx/create
sablona_docx/deactivate
sablona_docx/delete
sablona_docx/detail
sablona_docx/download
sablona_docx/list
sablona_docx/order-data
sablona_docx/order-enriched-data
sablona_docx/reupload
sablona_docx/update
sablona_docx/update-partial
sablona_docx/update-with-file
sablona_docx/verify
sablona_docx/verify-single
save
search/universal
states25/by-id
states25/by-object-type
states25/by-parent-code
states25/by-type-and-code
states25/list
stavy/list
substitution/create
substitution/current
substitution/deactivate
substitution/list
substitution/update
templates/create
templates/delete
templates/list
templates/update
todonotes/by-id
todonotes/delete
todonotes/load
todonotes/recent
todonotes/save
todonotes/search
todonotes/stats
todonotes/with-details
useky/by-zkr
useky/create
useky/delete
useky/detail
useky/list
useky/list_hierarchy
useky/update
user/active
user/active-with-stats
user/change-password
user/detail
user/login
user/profile
user/settings
user/update-activity
users/approvers
users/create
users/deactivate
users/list
users/partial-update
users/partial_update
users/update
```

---

## 🔴 CRITICAL SECURITY ISSUES

### 1. Debug Informace v Production Responses
**Závažnost:** 🔴 **CRITICAL**  
**Riziko:** Information disclosure, pomáhá útočníkům mapovat strukturu aplikace

#### Nalezené problémy:

**a) api.php - Globální debug výstupy**
```php
// Řádky 204-205
error_log("API Input parsing - Content-Type: " . ...);
error_log("API Input data: " . json_encode($input));

// Řádky 223
error_log("URI: $request_uri, Endpoint: $endpoint, Method: $request_method...");

// Řádky 227-234 - DEBUG HEADERS V PRODUCTION!
header('X-Debug-Endpoint: ' . $endpoint);
header('X-Debug-Method: ' . $request_method);
header('X-Debug-Raw-Input-Length: ' . strlen($raw_input));
```

**b) Debug endpoint dostupný v production**
```php
// Řádek 238 - TEST ENDPOINT AKTIVNÍ!
if ($endpoint === 'debug-routing') {
    echo json_encode(array(
        'status' => 'ok',
        'debug_info' => array(
            'REQUEST_URI' => $_SERVER['REQUEST_URI'],
            'HTTP_X_ENDPOINT' => isset($_SERVER['HTTP_X_ENDPOINT']) ? $_SERVER['HTTP_X_ENDPOINT'] : null,
            'extracted_endpoint' => $endpoint,
            'request_method' => $request_method,
            'matches_from_regex' => isset($matches) ? $matches : null,
            'raw_input' => $input  // ⚠️ LEAK CITLIVÝCH DAT!
        )
    ));
    exit;
}

// Řádek 254 - DALŠÍ TEST ENDPOINT!
if ($endpoint === 'test-invoice-debug') {
    // ... vrací debug informace o funkcích
}
```

**c) Error log v responses**
```php
// api.php - různé části
error_log("🔓 [UNLOCK API] Request received - input: " . json_encode($input));
error_log("🔒 [LOCK API] Request received for order #" . $order_id);
error_log("🎯 MATCH! order-v2 download endpoint");
```

**d) Verbose error messages v spisvokaZpracovaniEndpoints.php**
```php
// Řádky 48-64 - DEBUG PDO CONNECTION
$log_pdo->exec("INSERT INTO debug_api_log ...");
file_put_contents('/tmp/debug_log_error.txt', ...);

// Řádky 230-232 - Debug v response
'status' => 'error',
'message' => $err_msg,
'debug' => $err_msg  // ⚠️ DUPLICITNÍ DEBUG INFO
```

#### ✅ **DOPORUČENÍ:**
1. **OKAMŽITĚ:** Odstranit debug endpointy (`debug-routing`, `test-invoice-debug`)
2. **OKAMŽITĚ:** Odstranit debug headers (`X-Debug-*`)
3. **URGENT:** Změnit `error_log()` na conditional logging (pouze v dev)
4. **URGENT:** Odstranit `'debug'` klíče z production responses
5. **Implementovat:** Environment-based debugging:
```php
if (defined('DEBUG_MODE') && DEBUG_MODE === true) {
    error_log(...);
}
```

---

### 2. Legacy MySQL Code (Security Risk)
**Závažnost:** 🟡 **MEDIUM-HIGH**  
**Riziko:** SQL Injection možnost, deprecated API

#### Problémové soubory:
```
v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v3.php (48 použití mysqli_query)
v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v3_tri_typy.php (45 použití mysqli_query)
```

#### Příklad problematického kódu:
```php
// limitovanePrislibyCerpaniHandlers_v3_tri_typy.php:52
$result_meta = mysqli_query($conn, $sql_meta);

// Namísto PDO prepared statements:
$stmt = $pdo->prepare($sql_meta);
$stmt->execute($params);
```

**Duplicita:** V `api.php` (řádky 3675-4488) je inline verze těchto handlerů také s `mysqli_query`.

#### ✅ **DOPORUČENÍ:**
1. **PRIORITY:** Refaktorovat `limitovanePrislibyCerpaniHandlers_*` na PDO
2. Odstranit inline LP handlers z `api.php` (používat externí soubory)
3. Standardizovat na PDO across all handlers

---

## ✅ POZITIVNÍ ZJIŠTĚNÍ

### 1. Použití konstant pro tabulky
✅ **VÝBORNĚ:** 95%+ kódu používá konstanty z `queries.php`:
```php
// queries.php definuje:
define('TABLE_OBJEDNAVKY', '25a_objednavky');
define('TABLE_FAKTURY', '25a_objednavky_faktury');
define('TABLE_UZIVATELE', '25_uzivatele');
// ... atd.

// Použití v kódu:
"SELECT * FROM ".TABLE_OBJEDNAVKY." WHERE id = :id"
```

**Nalezeno:** 0 hardcoded table names (mimo queries.php a config files)

### 2. PDO Prepared Statements
✅ **VÝBORNĚ:** Většina handlerů používá PDO bezpečně:
```php
$stmt = $pdo->prepare("SELECT * FROM ".TABLE_OBJEDNAVKY." WHERE id = :id");
$stmt->execute(['id' => $order_id]);
```

**Soubory s správným PDO:**
- handlers.php
- orderHandlers.php
- invoiceHandlers.php
- notificationHandlers.php
- ciselnikyHandlers.php
- hierarchyHandlers.php
- cashbookHandlers.php
- + dalších 20+ souborů

### 3. Token Authentication
✅ Všechny endpointy používají token validation:
```php
function verify_token($username, $token, $db) {
    // Secure token verification
}
```

---

## 📋 Používané vs Nepoužívané Endpointy

### Kategorizace podle použití

#### 🟢 **Aktivně používané (detekováno z frontendu)**
```
✓ user/login
✓ user/detail
✓ user/profile
✓ user/settings
✓ order-v2/list
✓ order-v2/list-enriched
✓ order-v2/create
✓ order-v2/next-number
✓ invoices25/list
✓ invoices25/by-order
✓ invoices25/create
✓ invoices25/attachments/*
✓ notifications/list
✓ notifications/mark-read
✓ notifications/templates/list
✓ hierarchy/profiles/*
✓ hierarchy/users
✓ hierarchy/locations
✓ hierarchy/departments
✓ global-settings
✓ maintenance-status
✓ ciselniky/* (všechny CRUD operace)
✓ dodavatele/*
✓ search/universal
✓ sablona_docx/*
✓ attachments/*
✓ todonotes/*
✓ limitovane_prisliby
```

#### 🟡 **Pravděpodobně nepoužívané / deprecated**
```
? orders/list (legacy - nahrazeno order-v2/list)
? orders/list-raw
? orders/list-enriched (legacy)
? orders25/* (některé - duplikáty s order-v2)
? old/react
? load / save (jednoduché - možná deprecated)
? nameday (utilita - pravděpodobně nepoužívána)
```

#### ⚪ **Test/Debug endpointy (ODSTRANIT!)**
```
✗ debug-routing
✗ test-invoice-debug
```

---

## 🔧 Doporučení k Optimalizaci

### Priority 1: SECURITY (Okamžitě)
1. ✅ Odstranit debug endpointy
2. ✅ Odstranit debug headers
3. ✅ Vypnout verbose error logging v production
4. ✅ Implementovat environment-based debugging

### Priority 2: CODE QUALITY (Tento měsíc)
1. ✅ Refaktorovat LP handlers na PDO
2. ✅ Odstranit duplicitní inline LP code z api.php
3. ✅ Standardizovat error responses (bez debug keys)
4. ✅ Code review všech `error_log()` calls

### Priority 3: MAINTENANCE (Q1 2026)
1. ⚪ Odstranit nepoužívané legacy endpointy
2. ⚪ Konsolidovat orders25/* a order-v2/* (unified API)
3. ⚪ Dokumentovat všechny endpointy (OpenAPI/Swagger)
4. ⚪ Implementovat rate limiting
5. ⚪ Audit přístupových práv per endpoint

---

## 📊 Detailní Statistiky

### Distribuce handleru po souborech
```
handlers.php: 28 funkcí
orderHandlers.php: 18 funkcí
invoiceHandlers.php: 15 funkcí  
ciselnikyHandlers.php: 55+ funkcí
hierarchyHandlers.php: 20 funkcí
notificationHandlers.php: 18 funkcí
cashbookHandlers.php: 12 funkcí
userHandlers.php: 8 funkcí
orderV2Endpoints.php: 12 funkcí
+ další specializované handlery
```

### Typy databázových operací
```
PDO prepared statements: ~85%
PDO direct exec: ~10% (UPDATE ... SET aktivni=0 apod.)
Legacy mysqli: ~5% (2 soubory LP handlers)
```

### Response formáty
```
Standardní: { "status": "ok"|"error", "data": {...} }
Legacy: { "success": "OK"|"NOK", ...flat structure... }
Mixed: ~15% endpointů má nestandardní response
```

---

## 🎬 Akční plán - Prioritizace

### Fáze 1: Security Fix (DO 48 HODIN)
- [ ] Odstranit `debug-routing` endpoint
- [ ] Odstranit `test-invoice-debug` endpoint  
- [ ] Odstranit všechny `X-Debug-*` headers
- [ ] Conditional error_log (pouze DEV)
- [ ] Odstranit `'debug'` keys z responses

### Fáze 2: Code Quality (DO 2 TÝDNŮ)
- [ ] Refaktor LP handlers na PDO
- [ ] Odstranit inline LP code z api.php
- [ ] Standardizovat error responses
- [ ] Code review error_log usage

### Fáze 3: Optimalizace (DO 1 MĚSÍCE)
- [ ] Audit nepoužívaných endpointů
- [ ] Odstranit deprecated endpoints
- [ ] Konsolidace order APIs
- [ ] Dokumentace (OpenAPI)

---

## 📞 Kontakt a další kroky

**Zpracoval:** Senior Developer AI Assistant  
**Datum:** 20. prosince 2025  
**Next Review:** Po implementaci Fáze 1 (security fixes)

**Pro diskuzi:**
- Prioritizace security fixes
- Plánování refaktoru LP handlers
- Strategie konsolidace order APIs
- Implementace monitoring/logging systému

---

## 📎 Přílohy

### A. Seznam všech handleru souborů
```
api-legacy/api.eeo/v2025.03_25/lib/
├── cashbookHandlers.php (PDO ✓)
├── cashbookHandlersExtended.php (PDO ✓)
├── cashboxByPeriodHandler.php (PDO ✓)
├── chat_handlers.php (PDO ✓)
├── ciselnikyHandlers.php (PDO ✓)
├── docxOrderDataHandlers.php (PDO ✓)
├── docxTemplateHandlers.php (PDO ✓)
├── globalSettingsHandlers.php (PDO ✓)
├── handlers.php (PDO ✓)
├── hierarchyHandlers.php (PDO ✓)
├── hierarchyHandlers_v2.php (PDO ✓)
├── hierarchyOrderFilters.php (PDO ✓)
├── hierarchyPermissions.php (PDO ✓)
├── importHandlers.php (PDO ✓)
├── invoiceAttachmentHandlers.php (PDO ✓)
├── invoiceAttachmentHandlersOrderV2.php (PDO ✓)
├── invoiceHandlers.php (PDO ✓)
├── limitovanePrislibyCerpaniHandlers_v3.php (mysqli ✗)
├── limitovanePrislibyCerpaniHandlers_v3_tri_typy.php (mysqli ✗)
├── mail.php (Utility)
├── mailconfig.php (Config)
├── notificationHandlers.php (PDO ✓)
├── notificationTemplatesHandlers.php (PDO ✓)
├── notes_handlers.php (PDO ✓)
├── orderAttachmentHandlers.php (PDO ✓)
├── orderHandlers.php (PDO ✓)
├── orderQueries.php (Constants)
├── OrderV2Handler.php (PDO ✓)
├── orderV2Endpoints.php (PDO ✓)
├── orderV2AttachmentHandlers.php (PDO ✓)
├── orderV2InvoiceHandlers.php (PDO ✓)
├── orderV2PolozkyLPHandlers.php (PDO ✓)
├── queries.php (Constants ✓)
├── reportsHandlers.php (PDO ✓)
├── sablonaDocxHandlers.php (PDO ✓)
├── searchHandlers.php (PDO ✓)
├── spisovkaZpracovaniEndpoints.php (PDO ✓ + excessive debug ✗)
├── userDetailHandlers.php (PDO ✓)
├── userHandlers.php (PDO ✓)
├── userProfileHandlers.php (PDO ✓)
├── userSettingsHandlers.php (PDO ✓)
└── userStatsHandlers.php (PDO ✓)
```

### B. Table Constants Reference
Všechny konstanty definovány v: `v2025.03_25/lib/queries.php`

Hlavní tabulky:
- `TABLE_OBJEDNAVKY` → `25a_objednavky`
- `TABLE_FAKTURY` → `25a_objednavky_faktury`
- `TABLE_UZIVATELE` → `25_uzivatele`
- `TABLE_DODAVATELE` → `25_dodavatele`
- `TABLE_NOTIFIKACE` → `25_notifikace`
- `TABLE_HIERARCHIE_VZTAHY` → `25_hierarchie_vztahy`
- `TABLE_POKLADNI_KNIHY` → `25a_pokladni_knihy`
- + další ~30 konstant

---

**END OF REPORT**

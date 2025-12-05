# 📋 EEO-V2 Code Overview

> **Datum vytvoření:** 5. prosince 2025  
> **Účel:** Rychlý přehled architektury a struktury kódu pro eeo-v2 aplikaci

---

## 🏗️ Architektura projektu

### 📁 Struktura složek

```
apps/eeo-v2/
├── api/                      # Node.js API server (Express)
│   ├── src/
│   │   ├── index.js         # Hlavní server soubor
│   │   ├── config/          # Konfigurace (Entra ID, JWT)
│   │   ├── db/              # Databázové připojení (MariaDB)
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes (auth, entra)
│   │   └── services/        # Business logika
│   └── package.json         # Dependencies (Express, MSAL, MariaDB)
│
├── api-legacy/              # PHP Legacy API
│   └── api.eeo/
│       ├── api.php          # Hlavní routing soubor (4669 řádků!)
│       └── v2025.03_25/lib/ # Handlery a business logika
│
└── client/                  # React Frontend
    ├── src/
    │   ├── App.js           # Hlavní aplikační komponenta
    │   ├── components/      # Reusable komponenty
    │   ├── forms/           # Formuláře (OrderForm25)
    │   ├── pages/           # Stránky aplikace
    │   ├── services/        # API klienti
    │   ├── context/         # React Context (Auth, Toast, Progress)
    │   ├── hooks/           # Custom React hooks
    │   └── utils/           # Utility funkce
    └── package.json         # Dependencies (React 19, MUI, Axios)
```

---

## 🔌 API Architektura

### Node.js API (Port 5000)
**Lokace:** `apps/eeo-v2/api/src/index.js`

**Účel:** Microsoft Entra ID autentizace

**Endpointy:**
- `GET /api/eeo/auth/login` - OAuth login redirect
- `GET /api/eeo/auth/callback` - OAuth callback
- `POST /api/eeo/auth/token` - Token refresh
- `GET /api/eeo/auth/logout` - Odhlášení
- `GET /api/eeo/entra/*` - Microsoft Graph API proxy

**Technologie:**
- Express 5.x
- @azure/msal-node (OAuth)
- MariaDB 3.x (mysql2 fallback)
- JWT autentizace
- Helmet security

---

### PHP Legacy API
**Lokace:** `apps/eeo-v2/api-legacy/api.eeo/api.php`

**Účel:** Hlavní business logika aplikace (objednávky, faktury, dodavatelé...)

#### 📍 Endpoint Routing

API používá **switch-case routing** s více než **100+ endpointy**.

**Formát:** `https://eeo2025.zachranka.cz/api.eeo/{endpoint}`

#### Kategorie endpointů:

##### 1️⃣ **Authentication & Users** (15 endpointů)
```php
case 'login':
case 'user/login':           // POST - Přihlášení
case 'user/detail':          // POST - Detail uživatele
case 'user/profile':         // POST - Profil uživatele
case 'user/settings':        // GET/POST - Nastavení uživatele
case 'user/change-password': // POST - Změna hesla
case 'user/active':          // POST - Aktivní status
case 'users/list':           // POST - Seznam uživatelů
case 'users/create':         // POST - Vytvoření uživatele
case 'users/update':         // POST - Update uživatele
case 'users/approvers':      // POST - Seznam schvalovatelů
```

##### 2️⃣ **Orders (Objednávky)** (~40 endpointů)

**Legacy API:**
```php
case 'orders/create':        // POST - Vytvoření objednávky
case 'orders/list':          // POST - Seznam objednávek
case 'orders/list-enriched': // POST - Rozšířený seznam (s FK daty)
case 'order/detail':         // POST - Detail objednávky
case 'order/update':         // POST - Update objednávky
case 'order/check-number':   // POST - Kontrola čísla objednávky
```

**Order V2 API (standardizovaný):**
```php
case 'order-v2/get':         // GET - Načtení objednávky by ID
case 'order-v2/list':        // GET - Listing objednávek
case 'order-v2/create':      // POST - Vytvoření objednávky
case 'order-v2/update':      // PUT - Update objednávky
case 'order-v2/delete':      // DELETE - Smazání objednávky
case 'order-v2/next-number': // GET - Další číslo objednávky
case 'order-v2/timestamp':   // GET - Timestamp objednávky (lightweight)
```

**Order Actions:**
```php
case 'orders25/send-to-supplier':  // Odeslání dodavateli
case 'orders25/cancel-order':      // Stornování
case 'orders25/lock':              // Zamknutí pro editing
case 'orders25/unlock':            // Odemknutí
```

##### 3️⃣ **Invoices (Faktury)** (~20 endpointů)

```php
case 'invoices25/by-order':        // POST - Faktury k objednávce
case 'invoices25/list':            // POST - Seznam faktur
case 'invoices25/create':          // POST - Vytvoření faktury
case 'invoices25/update':          // POST - Update faktury
case 'invoices25/delete':          // POST - Smazání faktury

// Order V2 Invoice API:
case 'order-v2/{id}/invoices/create':           // POST
case 'order-v2/invoices/{id}/update':           // PUT
case 'order-v2/invoices/{id}/delete':           // DELETE
case 'order-v2/{id}/invoices/list':             // GET
```

##### 4️⃣ **Attachments (Přílohy)** (~25 endpointů)

**Order Attachments:**
```php
case 'attachments/upload':         // POST - Upload přílohy
case 'attachments/list':           // POST - Seznam příloh
case 'attachments/download':       // POST - Stažení přílohy
case 'attachments/delete':         // POST - Smazání přílohy
case 'attachments/verify':         // POST - Verifikace příloh

// Order V2 Attachments:
case 'order-v2/{id}/attachments/upload':   // POST
case 'order-v2/{id}/attachments/list':     // GET
case 'order-v2/{id}/attachments/{aid}':    // GET/DELETE
case 'order-v2/{id}/attachments/verify':   // GET
```

**Invoice Attachments:**
```php
case 'order-v2/{id}/invoices/{iid}/attachments/upload':  // POST
case 'order-v2/{id}/invoices/{iid}/attachments/list':    // GET
case 'order-v2/invoices/{id}/attachments/{aid}':         // GET/DELETE
```

##### 5️⃣ **Suppliers (Dodavatelé)** (~12 endpointů)

```php
case 'dodavatele/list':            // POST - Seznam dodavatelů
case 'dodavatele/detail':          // POST - Detail dodavatele
case 'dodavatele/search':          // POST - Vyhledávání
case 'dodavatele/search-ico':      // POST - Hledání podle IČO
case 'dodavatele/search-nazev':    // POST - Hledání podle názvu
case 'dodavatele/contacts':        // POST - Kontakty dodavatele
case 'dodavatele/create':          // POST - Vytvoření dodavatele
case 'dodavatele/update':          // POST - Update dodavatele
case 'dodavatele/update-by-ico':   // POST - Update podle IČO
case 'dodavatele/delete':          // POST - Smazání dodavatele
```

##### 6️⃣ **Číselníky (Dictionaries)** (~50 endpointů)

```php
// Lokality (Locations)
case 'lokality/list':
case 'lokality/detail':
case 'lokality/create':
case 'lokality/update':
case 'lokality/delete':

// Pozice (Positions)
case 'pozice/list':
case 'pozice/detail':
case 'pozice/create':
case 'pozice/update':
case 'pozice/delete':

// Organizace (Organizations)
case 'organizace/list':
case 'organizace/detail':
case 'organizace/create':
case 'organizace/update':
case 'organizace/delete':

// Role a práva
case 'role/list':
case 'role/detail':
case 'prava/list':
case 'prava/detail':

// Stavy (States)
case 'stavy/list':

// Úseky/Oddělení (Departments)
case 'useky/list':
case 'useky/list_hierarchy':
case 'useky/detail':
case 'useky/by-zkr':
case 'useky/create':
case 'useky/update':
case 'useky/delete':
```

##### 7️⃣ **Cashbook (Pokladní knihy)** (~15 endpointů)

```php
case 'cashbook/list':              // POST - Seznam pokladních knih
case 'cashbook/detail':            // POST - Detail pokladní knihy
case 'cashbook/create':            // POST - Vytvoření záznamu
case 'cashbook/update':            // POST - Update záznamu
case 'cashbook/delete':            // POST - Smazání záznamu
case 'cashbook/items/list':        // POST - Položky
case 'cashbook/items/create':      // POST - Vytvoření položky
case 'cashbook/items/update':      // POST - Update položky
case 'cashbook/items/delete':      // POST - Smazání položky
case 'cashbox/by-period':          // POST - Výpis podle období
```

##### 8️⃣ **Notifications** (~10 endpointů)

```php
case 'notifications/list':         // POST - Seznam notifikací
case 'notifications/unread':       // POST - Nepřečtené
case 'notifications/mark-read':    // POST - Označit jako přečtené
case 'notifications/delete':       // POST - Smazání
case 'notification-templates/list': // POST - Šablony notifikací
```

##### 9️⃣ **Search & Reports** (~10 endpointů)

```php
case 'search/universal':           // POST - Univerzální vyhledávání
case 'search/orders':              // POST - Vyhledávání objednávek
case 'search/suppliers':           // POST - Vyhledávání dodavatelů
case 'reports/orders-by-supplier': // POST - Report objednávek
case 'reports/orders-by-status':   // POST - Report podle stavu
```

##### 🔟 **Templates & Documents** (~8 endpointů)

```php
case 'templates/list':             // POST - Seznam šablon
case 'templates/create':           // POST - Vytvoření šablony
case 'templates/update':           // POST - Update šablony
case 'templates/delete':           // POST - Smazání šablony
case 'docx/generate':              // POST - Generování DOCX
```

##### 1️⃣1️⃣ **Hierarchy & Substitutions** (~10 endpointů)

```php
case 'hierarchy/subordinates':     // POST - Podřízení
case 'hierarchy/superiors':        // POST - Nadřízení
case 'hierarchy/add':              // POST - Přidání vztahu
case 'hierarchy/remove':           // POST - Odebrání vztahu
case 'substitution/list':          // POST - Seznam zástupování
case 'substitution/create':        // POST - Vytvoření zástupování
case 'substitution/update':        // POST - Update zástupování
case 'substitution/deactivate':    // POST - Deaktivace
case 'substitution/current':       // POST - Aktuální zástupování
```

##### 1️⃣2️⃣ **Limited Promises (LP)** (~5 endpointů)

```php
case 'limitovane_prisliby':        // POST - Seznam LP
case 'lp/detail':                  // POST - Detail LP
case 'lp/cerpani':                 // POST - Čerpání LP
```

##### 1️⃣3️⃣ **Contracts (Smlouvy)** (~8 endpointů)

```php
case 'smlouvy/list':               // POST - Seznam smluv
case 'smlouvy/detail':             // POST - Detail smlouvy
case 'smlouvy/create':             // POST - Vytvoření smlouvy
case 'smlouvy/update':             // POST - Update smlouvy
case 'smlouvy/delete':             // POST - Smazání smlouvy
case 'smlouvy/cerpani':            // POST - Čerpání smluv
```

##### 1️⃣4️⃣ **Todo Notes & Chat** (~15 endpointů)

```php
// Todo Notes
case 'todonotes/load':             // POST - Načtení poznámek
case 'todonotes/save':             // POST - Uložení poznámky
case 'todonotes/delete':           // POST - Smazání poznámky
case 'todonotes/by-id':            // POST - Poznámka podle ID
case 'todonotes/search':           // POST - Vyhledávání

// Chat
case 'chat/conversations':         // POST - Konverzace
case 'chat/messages':              // POST - Zprávy
case 'chat/messages/send':         // POST - Odeslání zprávy
case 'chat/mentions/unread':       // POST - Nepřečtené zmínky
```

---

## 🎨 Frontend Architektura

### React Client (Port 3000 dev / build for production)

**Lokace:** `apps/eeo-v2/client/src/`

**Technologie:**
- React 19.0
- React Router 7.4
- Material-UI 6.x
- Emotion (CSS-in-JS)
- Axios (HTTP klient)

---

### 📄 Klíčové stránky (Pages)

```javascript
// Lokace: src/pages/

Orders25List.js         // Seznam objednávek
OrderForm25.js          // Formulář objednávky (HLAVNÍ KOMPONENTA!)
Invoices25List.js       // Seznam faktur
InvoiceEvidencePage.js  // Evidence faktur
AddressBookPage.js      // Adresář (dodavatelé + zaměstnanci)
Users.js                // Správa uživatelů
DictionariesNew.js      // Číselníky
ProfilePage.js          // Profil uživatele
StatisticsPage.js       // Statistiky
ReportsPage.js          // Reporty
CashBookPage.js         // Pokladní knihy
NotificationsPage.js    // Notifikace
DebugPanel.js           // Debug panel (dev only)
```

---

### 🧩 Klíčové komponenty

#### **OrderForm25** (26 596 řádků!)
**Lokace:** `src/forms/OrderForm25.js`

**Architektura:**
- Refactored hooks (useFormController, useWorkflowManager)
- Draft management (DraftManager service)
- Autosave (useAutosave hook)
- Tab synchronization (tab sync utils)
- Workflow state machine (WORKFLOW_STATES)

**Sub-komponenty:**
```
forms/OrderForm25/
├── hooks/
│   ├── useFormLifecycle.js    # Lifecycle management
│   ├── useDictionaries.js     # Číselníky loading
│   ├── useOrderDataLoader.js  # Data loading
│   ├── useUIState.js          # UI state management
│   ├── useFormController.js   # Form controller (MAIN)
│   └── useWorkflowManager.js  # Workflow transitions
├── reducers/
│   ├── formDataReducer.js     # Form data state
│   ├── loadingReducer.js      # Loading states
│   └── uiReducer.js           # UI states
├── helpers/
│   └── [validation & helpers]
└── validation/
    └── [form validators]
```

---

### 🔌 API Services (Frontend)

**Lokace:** `src/services/`

```javascript
// Auth & Core
api2auth.js              // ✅ HLAVNÍ API klient (3158 řádků!)
                         // - Všechny endpointy (users, orders, suppliers...)
                         // - Token handling
                         // - Cache management

// Order V2 API (standardizovaný)
apiOrderV2.js            // ✅ Order V2 endpointy (1861 řádků)
                         // - CRUD operace
                         // - Attachments
                         // - Invoice management
                         // - Data transformation helpers

// Legacy APIs
api25orders.js           // ❌ DEPRECATED - použij apiOrderV2
api25invoices.js         // Invoices API (částečně deprecated)
api25reports.js          // Reports API
apiSmlouvy.js            // Contracts API

// Background Services
backgroundTaskService.js // Background úlohy
ordersCacheService.js    // Cache pro objednávky
DraftManager.js          // ✅ Centralizovaný draft manager
FormDataManager.js       // ✅ Centralizovaný data manager
notificationsUnified.js  // Unified notifications
```

---

### 🎯 Context Providers

**Lokace:** `src/context/`

```javascript
AuthContext.js               // ✅ Autentizace & permissions
ToastContext.js             // Toast notifikace
ProgressContext.js          // Progress bar
DictionaryCacheContext.js   // Cache pro číselníky
ActivityContext.js          // User activity tracking
BackgroundTasksContext.js   // Background úlohy
ExchangeRatesContext.js     // Kurzovní lístky
```

---

### 🪝 Custom Hooks

**Lokace:** `src/hooks/`

```javascript
useAutosave.js          // ✅ Autosave hook (centralizovaný)
useBackgroundTasks.js   // Background tasks
useUserActivity.js      // User activity tracking
useDebounce.js          // Debounce hook
```

---

## 🔐 Autentizace & Autorizace

### Flow:

1. **Přihlášení přes Microsoft Entra ID:**
   - Node.js API (`/api/eeo/auth/login`)
   - OAuth2 flow s PKCE
   - Získání access tokenu

2. **Token management:**
   - JWT token uložen v localStorage
   - Refresh token v httpOnly cookie
   - Token expiration handling

3. **Permissions:**
   ```javascript
   // Z AuthContext:
   hasPermission('ORDER_MANAGE')
   hasPermission('INVOICE_VIEW')
   hasPermission('USER_MANAGE')
   hasPermission('ADMIN')
   ```

4. **Roles:**
   - SUPERADMIN
   - ADMINISTRATOR
   - UZIVATEL
   - SCHVALOVATEL
   - GARANT

---

## 📊 Data Flow

### Načtení objednávky:

```
┌─────────────┐
│   Client    │
│ OrderForm25 │
└──────┬──────┘
       │
       │ 1. getOrderV2(id)
       ▼
┌─────────────┐
│ apiOrderV2  │
│  service    │
└──────┬──────┘
       │
       │ 2. GET /api.eeo/order-v2/get
       ▼
┌─────────────┐
│   PHP API   │
│   api.php   │
└──────┬──────┘
       │
       │ 3. handle_order_v2_get()
       ▼
┌─────────────┐
│OrderV2Handler│
│     PHP      │
└──────┬──────┘
       │
       │ 4. SELECT FROM 25a_objednavky
       ▼
┌─────────────┐
│   MariaDB   │
└─────────────┘
```

### Vytvoření objednávky:

```
1. Client: Vyplnění formuláře
2. Draft: Uložení do DraftManager (localStorage)
3. Autosave: Periodické ukládání draftu
4. Submit: createOrderV2(data)
5. PHP API: Validace + INSERT
6. Response: Nová objednávka s ID
7. Cache: Invalidace cache
8. Broadcast: Tab sync event
9. Redirect: Na detail objednávky
```

---

## 🎯 Workflow States

**Lokace:** `src/constants/workflow25.js`

```javascript
export const WORKFLOW_STATES = {
  NOVA: 'Nová',                    // Rozpracovaná
  ROZPRACOVANA: 'Rozpracovaná',    // K vyplnění
  KE_SCHVALENI: 'Ke schválení',    // Čeká na schválení
  SCHVALENA: 'Schválená',          // Schválena garantem
  ODESLANA: 'Odeslána',            // Odeslána dodavateli
  POTVRZENA: 'Potvrzena',          // Potvrzena dodavatelem
  FAKTURACE: 'Fakturace',          // Čeká na fakturu
  VECNA_SPRAVNOST: 'Věcná správnost', // Kontrola faktury
  DOKONCENA: 'Dokončená',          // Kompletně vyřízena
  STORNOVANA: 'Stornovaná',        // Zrušena
  ZAMITNUTA: 'Zamítnutá'           // Zamítnuta
};
```

**Transitions:**
```
NOVA → ROZPRACOVANA → KE_SCHVALENI → SCHVALENA → ODESLANA
                                                     ↓
DOKONCENA ← VECNA_SPRAVNOST ← FAKTURACE ← POTVRZENA
```

---

## 🗃️ Databázové tabulky

### Hlavní tabulky:

```sql
-- OBJEDNÁVKY
25a_objednavky              -- Order V2 (hlavní)
25a_objednavky_polozky      -- Položky objednávky
25a_objednavky_prilohy      -- Přílohy objednávky

-- FAKTURY
25a_objednavky_faktury      -- Faktury
25a_faktura_prilohy         -- Přílohy faktury

-- POKLADNÍ KNIHY
25a_pokladni_knihy          -- Pokladní knihy
25a_pokladni_polozky        -- Položky pokladní knihy

-- UŽIVATELÉ
25_uzivatele                -- Uživatelé
25_uzivatel_nastaveni       -- Nastavení uživatelů

-- DODAVATELÉ
25_dodavatele               -- Dodavatelé
25_dodavatel_kontakty       -- Kontakty dodavatelů

-- ČÍSELNÍKY
25_useky                    -- Úseky/oddělení
25_pozice                   -- Pozice
25_lokality                 -- Lokality
25_organizace               -- Organizace
25_role                     -- Role
25_prava                    -- Práva
25_ciselnik_stavy           -- Stavy objednávek

-- LIMITOVANÉ PŘÍSLIBY
25_limitovane_prisliby      -- LP master
25_limitovane_prisliby_cerpani -- LP čerpání

-- SMLOUVY
25_smlouvy                  -- Smlouvy
```

---

## 🚀 Build & Deploy

### Development:
```bash
# Node.js API
cd apps/eeo-v2/api
npm run dev

# React Client
cd apps/eeo-v2/client
npm start
```

### Production Build:
```bash
# Build všech komponent
./build-multiapp.sh

# Start produkce
./start-multiapp.sh
```

### Apache konfigurace:
```
/docs/deployment/apache-erdms-multiapp.conf
```

---

## 🔧 Environment Variables

### Node.js API (.env.production):
```bash
NODE_ENV=production
PORT=5000
CLIENT_URL=https://eeo2025.zachranka.cz

# Entra ID
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...

# Database
DB_HOST=localhost
DB_USER=erdms_user
DB_PASSWORD=...
DB_NAME=erdms_db
```

### React Client (.env.production):
```bash
REACT_APP_API2_BASE_URL=https://eeo2025.zachranka.cz/api.eeo/
REACT_APP_ENTRA_CLIENT_ID=...
REACT_APP_ENV=production
```

---

## 📝 Konvence & Best Practices

### Pojmenování:

- **Endpointy:** `kebab-case` (např. `order-v2/get`)
- **PHP funkce:** `snake_case` (např. `handle_order_v2_get`)
- **JS funkce:** `camelCase` (např. `getOrderV2`)
- **React komponenty:** `PascalCase` (např. `OrderForm25`)
- **CSS classes:** `kebab-case` (např. `.order-form-section`)

### API Response Format:

```javascript
// Success
{
  status: 'ok',
  data: {...},
  meta: {
    version: 'v2',
    timestamp: '2025-12-05T10:30:00Z'
  }
}

// Error
{
  status: 'error',
  message: 'Chybová zpráva',
  code: 'ERROR_CODE',
  details: {...}
}
```

---

## 🐛 Debugging

### Nástroje:

1. **PHP Debug:**
   - Error log: `/tmp/php_errors.log`
   - Endpoint: `GET /api.eeo/debug-routing`

2. **React DevTools:**
   - Components tree
   - Context inspection

3. **Network Tab:**
   - API calls monitoring
   - Response inspection

4. **Debug Panel:**
   - URL: `/debug`
   - Zobrazuje logs, cache, state

---

## 📚 Dokumentace

### Další dokumenty:

```
docs/
├── development/
│   ├── PHP-TO-NODEJS-MIGRATION-PLAN.md
│   ├── API-DATA-TYPES-STANDARDIZATION.md
│   ├── ERDMS-PLATFORM-ARCHITECTURE.md
│   └── CODE-INVENTORY.md
├── deployment/
│   ├── DEPLOYMENT-GUIDE.md
│   └── MULTI-APP-ARCHITECTURE.md
└── setup/
    └── MICROSOFT_ENTRA_SETUP.md
```

---

## 🎯 Aktual Priority (co dělat dál)

### ✅ Hotovo:
- Order V2 API standardizace
- Draft Manager refactoring
- Autosave implementation
- Workflow state machine
- Tab synchronization

### 🚧 V práci:
- PHP endpointy migrace na Node.js
- Invoice V2 API dokončení
- Cache optimization
- Performance monitoring

### 📋 TODO:
- Unit testy (PHP + JS)
- E2E testy (Cypress)
- API dokumentace (OpenAPI)
- Deployment automation (CI/CD)

---

## 📞 Kontakty & Podpora

- **Repository:** https://github.com/robex08/eeo2025-erdms
- **Branch:** main
- **Production:** https://eeo2025.zachranka.cz

---

**Poslední update:** 5. prosince 2025  
**Verze dokumentu:** 1.0  
**Autor:** GitHub Copilot


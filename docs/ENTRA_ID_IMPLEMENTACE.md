# Microsoft EntraID Autentizace – Kompletní dokumentace

> **Verze:** 1.1  
> **Datum implementace:** 14. dubna 2026  
> **Poslední aktualizace:** 14. dubna 2026  
> **Stav:** DEV – testování  
> **Autor:** AI asistent + robex08

### Changelog v1.1 (14.4.2026)
- **SSO check přepracován:** Automatické přihlášení pouze z ERDMS Dashboardu (`?sso=auto`) nebo po kliknutí na M365 tlačítko (`entra_login_pending`)
- **Odstraňěn `sso_bypass`:** Nepotřebný, SSO se nikdy nespouští po odhlášení či refreshi
- **Loading screen:** Při návratu z Microsoft přihlašování se zobrazí "Ověřování" místo bliknutí login formuláře
- **AccessDenied stránka:** Styl login karty s červeným headerem, kontakt na podporu
- **SmartTooltip:** Na logout tlačítku (lokální i EntraID)
- **Dashboard link:** `?sso=auto` parametr v odkazu na EEO
- **Nová sekce 15:** Platnost účtů a vzájemná nezávislost EntraID vs EEO

---

## Obsah
1. [Přehled architektury](#1-přehled-architektury)
2. [Režimy autentizace](#2-režimy-autentizace)
3. [Login flow – krok za krokem](#3-login-flow)
4. [Logout flow](#4-logout-flow)
5. [Centrální Auth API (Node.js)](#5-centrální-auth-api)
6. [EEO Backend (PHP)](#6-eeo-backend-php)
7. [Frontend (React)](#7-frontend-react)
8. [Databázové změny](#8-databázové-změny)
9. [Apache proxy konfigurace](#9-apache-proxy-konfigurace)
10. [Admin UI – Nastavení](#10-admin-ui)
11. [Auto-provisioning nových uživatelů](#11-auto-provisioning)
12. [Bezpečnost](#12-bezpečnost)
13. [Deployment do produkce – checklist](#13-deployment-checklist)
14. [Troubleshooting](#14-troubleshooting)
15. [Platnost účtů – EntraID vs EEO](#15-platnost-účtů)

---

## 1. Přehled architektury

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   Prohlížeč      │     │  Apache (reverse      │     │  Microsoft       │
│   (React SPA)    │────▶│  proxy)               │────▶│  Entra ID        │
│                  │     │                        │     │  (Azure AD)      │
│  Login.js        │     │  /auth → :4000         │     │                  │
│  AuthContext.js   │     │  /api/eeo → PHP-FPM    │     │  OAuth 2.0 +    │
│  Layout.js       │     │                        │     │  PKCE            │
└──────────────────┘     └──────────────────────┘     └──────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
            ┌───────▼────────┐    ┌─────────▼──────────┐
            │ Auth API       │    │ EEO API (PHP)      │
            │ Node.js :4000  │    │ api-legacy         │
            │                │    │                     │
            │ - OAuth flow   │    │ - /auth/entra-cb   │
            │ - PKCE         │    │ - user provisioning │
            │ - Sessions     │    │ - roles/permissions │
            │ - Graph API    │    │ - token management  │
            └────────────────┘    └─────────────────────┘
                    │                       │
                    └───────────┬───────────┘
                        ┌───────▼────────┐
                        │  MariaDB       │
                        │  10.3.172.11   │
                        │  (DEV)         │
                        └────────────────┘
```

**Komponenty:**
| Komponenta | Technologie | Port | Účel |
|---|---|---|---|
| Auth API | Node.js/Express | 4000 | OAuth flow, PKCE, MS Graph API, session management |
| EEO Backend | PHP (api-legacy) | FPM | User provisioning, role/permission management, token |
| Frontend | React (CRA) | - | Login UI, AuthContext, logout menu |
| Apache | Reverse proxy | 443 | SSL termination, routing /auth → :4000 |

---

## 2. Režimy autentizace

Systém podporuje **3 režimy**, nastavitelné v Admin UI (Globální nastavení):

| Režim | `auth_mode` | Popis |
|---|---|---|
| **Pouze lokální** | `local_only` | Výchozí. Jen username/heslo. EntraID tlačítko skryté. |
| **Pilot (obojí)** | `entra_all` | Všichni mohou použít EntraID i lokální heslo. Pro testování. |
| **Produkční** | `entra_admin_local` | Běžní uživatelé jen EntraID. Admini (SUPERADMIN, ADMINISTRATOR) mohou i lokálně. |

**Aktuální stav DEV:** `entra_all` + `entra_enabled=1`

Přepínání režimů:
- Admin UI: Nastavení → Microsoft EntraID Autentizace
- Nebo přímo v DB: `UPDATE 25a_nastaveni_globalni SET hodnota='...' WHERE klic='auth_mode'`

---

## 3. Login flow – krok za krokem

### 3a. EntraID login

```
1. Frontend                        GET /v2.0/system/auth-config
   Login.js                        → {auth_mode: "entra_all", entra_enabled: "1"}
                                   → Zobrazí tlačítko "Přihlásit se přes Microsoft"

2. Klik na tlačítko               GET /auth/login?redirect=/dev/eeo-v2
   → Auth API                     → Generuje PKCE code_verifier + code_challenge
                                   → Ukládá redirect URL do pkceStore
                                   → Vrátí JSON: {authUrl: "https://login.microsoftonline.com/..."}
                                   → Frontend nastaví sessionStorage: entra_login_pending=1

3. Frontend redirect              window.location.href = authUrl
   → Microsoft login              → Uživatel zadá MS credentials / SSO

4. Microsoft callback             GET /auth/callback?code=...&state=...
   → Auth API                     → Výměna code za tokeny (MSAL acquireTokenByCode)
                                   → Získá accessToken, idToken
                                   → Vytvoří in-memory session
                                   → Nastaví cookie: erdms_session (HttpOnly, 24h)
                                   → Redirect zpět na origin + redirectUrl

5. Frontend detekce              Login.js se načte
   SSO check                     Detekuje entra_login_pending v sessionStorage
                                   → Zobrazí celostrankový loading: "Ověřování..."
                                   → Počká na authConfig (async fetch)
                                   → GET /auth/me (s cookie)
                                   → Auth API vrátí user data + Graph API data
                                   → Včetně groups (memberOf)

6. EEO callback                  POST /v2.0/auth/entra-callback
   Login.js → PHP backend          body: {session_data: {...}}
                                   → PHP: lookup/create user v 25_uzivatele
                                   → PHP: přiřadí role, oprávnění
                                   → PHP: vrátí {token, roles, permissions, auth_method: "entra_id"}

7. Save & redirect               saveAuthData.token(token)
   Login.js                       saveAuthData.user({id, username})
                                   saveAuthData.userDetail(userData)
                                   saveAuthData.userPermissions(permissions)
                                   → window.location.href = "/dev/eeo-v2"

8. Page reload                   AuthContext.checkToken()
   AuthContext.js                  → loadAuthData.token/user/detail z localStorage
                                   → getUserDetailApi2() pro čerstvá data (usek, lokalita)
                                   → setAuthMethod(detail.auth_method)
                                   → setIsLoggedIn(true)
```

### 3b. Lokální login

```
1. Uživatel zadá username/heslo
2. POST /v2.0/auth/login → PHP handler
3. PHP: ověří heslo, vrátí token + user data + auth_method:"local"
4. Frontend uloží přes authStorage.js
5. AuthContext nastaví authMethod="local"
```

---

## 4. Logout flow

### 4a. EntraID uživatel – dropdown menu (SmartTooltip: "Odchod z aplikace")

Ikona odhlášení zobrazí **dropdown se 2 možnostmi**:

| Možnost | Funkce | Co se stane |
|---|---|---|
| **Odhlásit se z Microsoft 365** | `handleEntraLogout()` | Zavolá `POST /auth/logout` (smaže server session + cookie). Smaže lokální session. Redirect na Microsoft logout URL → zruší i MS session. |
| **Zpět na ERDMS rozcestník** | `handleGoToDashboard()` | Smaže lokální session (token, user). Redirect na `erdms.zachranka.cz/dashboard`. MS session zůstává. |

### 4b. Lokální uživatel (SmartTooltip: "Odhlásit se")

Jednoduchý button → `handleLogoutClick()` → smaže lokální session → redirect na `/login`.

### 4c. Důležité: Žádný SSO auto-login po odhlášení

Po odhlášení (jakýkoliv typ) se uživatel dostane na `/login` **bez** SSO triggeru.
SSO check se spouští **pouze** pokud URL obsahuje `?sso=auto` (z Dashboardu) nebo pokud
v sessionStorage existuje `entra_login_pending` (po kliknutí na M365 tlačítko).
Refresh login stránky také nespouští SSO (trigger se vymazal před provedením checku).

### Microsoft logout URL formát:
```
https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/logout
  ?post_logout_redirect_uri=https://erdms.zachranka.cz/dev/eeo-v2/login
```

---

## 5. Centrální Auth API (Node.js)

### Umístění
```
/var/www/erdms-dev/auth-api/
├── .env                      ← Konfigurace (ENTRA_CLIENT_ID, SECRET, ...)
├── package.json
└── src/
    ├── index.js              ← Express server, middleware, routing
    ├── config/
    │   └── entraConfig.js    ← MSAL konfigurace, scopes
    ├── db/
    │   └── connection.js     ← MariaDB pool (mysql2)
    ├── middleware/
    ├── routes/
    │   ├── auth.js           ← /auth/login, /callback, /me, /logout
    │   └── entra.js          ← /api/entra (rozšíření)
    └── services/
        ├── authService.js    ← Session CRUD (in-memory), user lookup
        └── entraService.js   ← Entra-specific helpers
```

### Endpointy

| Endpoint | Method | Auth | Popis |
|---|---|---|---|
| `GET /auth/login` | GET | - | Zahájí OAuth flow, vrátí `{authUrl}` |
| `GET /auth/callback` | GET | - | Callback od Microsoftu, výměna code→token |
| `POST /auth/logout` | POST | Cookie | Smaže session, vrátí `{logoutUrl}` |
| `GET /auth/me` | GET | Cookie | Vrátí user data + MS Graph data + groups |
| `GET /api/health` | GET | - | Health check |

### Konfigurace (.env)
```env
NODE_ENV=development
PORT=4000

# Database (sdílená s EEO)
DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=erdms
DB_USER=erdms_user
DB_PASSWORD=***

# Microsoft Entra ID
ENTRA_CLIENT_ID=92eaadde-7e3e-4ad1-8c45-3b875ff5c76b
ENTRA_TENANT_ID=2bd7827b-4550-48ad-bd15-62f9a17990f1
ENTRA_AUTHORITY=https://login.microsoftonline.com/2bd7827b-4550-48ad-bd15-62f9a17990f1
ENTRA_REDIRECT_URI=https://erdms.zachranka.cz/auth/callback
ENTRA_CLIENT_SECRET=***

# Client
CLIENT_URL=https://erdms.zachranka.cz
```

### MS Graph API Scopes
```
User.Read, email, openid, profile, Calendars.Read, Calendars.Read.Shared
```

### Data z `/auth/me`
```json
{
  "id": "entra-object-id",
  "username": "u03924",
  "email": "u03924@zachranka.cz",
  "upn": "u03924@zachranka.cz",
  "name": "Jan Novák",
  "jmeno": "Jan",
  "prijmeni": "Novák",
  "displayName": "Jan Novák",
  "jobTitle": "Analytik",
  "department": "IT",
  "telefon": "+420...",
  "entraData": {
    "memberOf": [
      {"displayName": "eeoUser", "@odata.type": "#microsoft.graph.group"},
      ...
    ],
    "manager": {...}
  }
}
```

### Session management
- **In-memory Map** (pro produkci doporučen Redis)
- Session ID: UUID v4
- Cookie: `erdms_session`, HttpOnly, Secure (v PROD), SameSite=Lax, 24h
- Automatické čištění expirovaných sessions

### Spuštění
```bash
cd /var/www/erdms-dev/auth-api
node src/index.js &
# Aktuálně PID 2854529
```

---

## 6. EEO Backend (PHP)

### Nové soubory

| Soubor | Účel |
|---|---|
| `api-legacy/api.eeo/v2025.03_25/lib/entraAuthHandlers.php` | EntraID callback handler |
| `api-legacy/api.eeo/v2025.03_25/lib/systemAuthHandlers.php` | Auth config endpoint (GET/POST) |

### Nové endpointy

| Endpoint | Method | Auth | Popis |
|---|---|---|---|
| `GET /v2.0/system/auth-config` | GET | Žádná (public) | Vrátí `{auth_mode, entra_enabled}` |
| `POST /v2.0/system/auth-config` | POST | SUPERADMIN | Uloží nastavení |
| `POST /v2.0/auth/entra-callback` | POST | Žádná | Zpracuje EntraID login, provisioning |

### Změny v existujících souborech

**`handlers.php`:**
- `handle_login()`: Přidáno `$user['auth_method'] = 'local'` do response
- `handle_user_detail()`: Transformuje `auth_source` → `auth_method` v response

**`queries.php`:**
- `uzivatele_detail`: Přidáno `u.auth_source` do SELECT

### Konstanty
```php
define('DEFAULT_ROLE_ID_THP_PES', 9);  // Role THP/PES pro nové uživatele
define('DEFAULT_ROLE_CODE', 'THP_PES');
```

### entraAuthHandlers.php – logika
```
1. Ověří entra_enabled === '1' (jinak 403)
2. Přijme session_data z frontendu (z /auth/me)
3. Extrahuje username z UPN (u03924@zachranka.cz → u03924)
4. Hledá uživatele v 25_uzivatele WHERE username = ?
5a. NEEXISTUJE → kontrola skupin → auto-provisioning (viz kap. 11)
5b. EXISTUJE → update entra_id, upn, auth_source, timestamps
6. Kontrola auth_mode restrikcí (entra_admin_local)
7. verify_token_v2() → načtení rolí a oprávnění
8. Vytvoření tokenu: base64(username|timestamp)
9. Return: token + roles + permissions + auth_method: 'entra_id'
```

---

## 7. Frontend (React)

### Změněné/nové soubory

| Soubor | Změna |
|---|---|
| `pages/Login.js` | EntraID button, SSO check, handleEntraCallback |
| `context/AuthContext.js` | `authMethod` state, fresh userDetail on reload |
| `components/Layout.js` | Conditional logout menu (dropdown vs button) |
| `pages/AppSettings.js` | Admin UI pro EntraID nastavení |
| `utils/authStorage.js` | Beze změn (existující encrypted localStorage) |

### authStorage.js – klíče
```
dev_auth_token_persistent       → {value: "base64token", expires: timestamp}
dev_auth_user_persistent        → {id, username}
dev_auth_user_detail_persistent → {id, username, jmeno, prijmeni, auth_method, roles, ...}
dev_auth_user_permissions_persistent → ["PERM1", "PERM2", ...]
```

### AuthContext – klíčové přidání
```javascript
const [authMethod, setAuthMethod] = useState(null); // 'local' | 'entra_id'

// V checkToken (page reload):
const freshDetailResult = await getUserDetailApi2(username, token, userId);
// → Používá čerstvá data místo pouze cached (oprava usek/lokalita)
setAuthMethod(activeDetail.auth_method || null);

// Provider exports:
<AuthContext.Provider value={{ ...existující, authMethod }}>
```

### Layout.js – logout logika
```javascript
// Společný cleanup
const performLogoutCleanup = async () => {
  // Zavře panely, uloží poznámky, TODO, pozici
};

// Lokální: odhlášení → /login
const handleLogoutClick = async () => { ... logout(); navigate('/login'); };

// EntraID: odejít do ERDMS Dashboard (bez MS logout)
const handleGoToDashboard = async () => { ... logout(); window.location.href = '.../dashboard'; };

// EntraID: plné odhlášení z MS (zruší i Entra session)
const handleEntraLogout = async () => {
  POST /auth/logout → {logoutUrl}
  logout();
  window.location.href = microsoftLogoutUrl;
};
```

### Login.js – SSO check (v1.1)
```javascript
// SSO check se spouští POUZE ve 2 případech:
// 1) ?sso=auto v URL → příchod z ERDMS Dashboardu
// 2) entra_login_pending v sessionStorage → návrat po kliknutí na M365
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const ssoFromDashboard = urlParams.get('sso') === 'auto';
  const ssoFromM365Click = sessionStorage.getItem('entra_login_pending') === '1';
  const hasTrigger = ssoFromDashboard || ssoFromM365Click;

  if (!hasTrigger) return;                // žádný trigger → nic
  if (!authConfig) return;                // počkej na authConfig (effect se spustí znovu)
  if (entra disabled) { clean; return; }  // EntraID vypnutá

  // Vše ready → vyčisti triggery → spusť async check
  // → /auth/me → handleEntraCallback() → přihlášení nebo AccessDenied
}, [authConfig]);
```

### Login.js – Loading screen při SSO
```javascript
// Pokud entra_login_pending existuje při mountu → okamžitě zobrazit loading
const [ssoInProgress] = useState(
  () => sessionStorage.getItem('entra_login_pending') === '1'
);

// Render: místo login formuláře zobrazí kartu "Ověřování – Probíhá přihlášení přes Microsoft 365"
// Pokud check selže → setSsoInProgress(false) → zobrazí login formulář
```

### Login.js – AccessDenied stránka
```javascript
// Pokud handleEntraCallback vrátí chybu (neaktivní účet, nemá oprávnění):
// setAccessDenied({ message: '...' })
// → Zobrazí červenou kartu "Přístup zamítnut" se zprávou, kontaktem na podporu
// → Tlačítko "Zpět na přihlášení EEO" + "Zpět na ERDMS rozcestník"
```

---

## 8. Databázové změny

### Tabulka `25_uzivatele` – nové sloupce

```sql
ALTER TABLE 25_uzivatele 
  ADD COLUMN entra_id VARCHAR(255) DEFAULT NULL COMMENT 'Microsoft Entra Object ID (GUID)',
  ADD COLUMN upn VARCHAR(255) DEFAULT NULL COMMENT 'User Principal Name (email)',
  ADD COLUMN auth_source ENUM('local', 'entra_id', 'hybrid') DEFAULT 'local' COMMENT 'Zdroj autentizace',
  ADD COLUMN entra_sync_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Poslední synchronizace s EntraID',
  ADD UNIQUE INDEX idx_entra_id (entra_id);
```

**Zpětná kompatibilita:** Všechny sloupce NULL/optional, výchozí `auth_source='local'`.

### Tabulka `25a_nastaveni_globalni` – nové záznamy

```sql
INSERT INTO 25a_nastaveni_globalni (klic, hodnota, popis) VALUES
  ('auth_mode', 'local_only', 'Režim autentizace: local_only | entra_all | entra_admin_local'),
  ('entra_enabled', '0', 'Povolit EntraID přihlášení: 0=vypnuto, 1=zapnuto');
```

### Aktuální stav DEV DB

| klic | hodnota |
|---|---|
| `auth_mode` | `entra_all` |
| `entra_enabled` | `1` |

### Databáze

| Prostředí | Host | DB | User |
|---|---|---|---|
| **DEV** | 10.3.172.11 (akd-db-mysql01) | EEO-OSTRA-DEV | erdms_user |
| **PROD** | 10.3.72.12 (akp-db-mysql01) | eeo2025 | erdms_user |

---

## 9. Apache proxy konfigurace

Soubor: `/etc/apache2/sites-enabled/erdms.zachranka.cz.conf`

```apache
# Auth API proxy
ProxyPass /auth http://localhost:4000/api/auth
ProxyPassReverse /auth http://localhost:4000/api/auth
```

**Výsledné mapování:**
```
https://erdms.zachranka.cz/auth/login    → http://localhost:4000/api/auth/login
https://erdms.zachranka.cz/auth/callback → http://localhost:4000/api/auth/callback
https://erdms.zachranka.cz/auth/me       → http://localhost:4000/api/auth/me
https://erdms.zachranka.cz/auth/logout   → http://localhost:4000/api/auth/logout
```

---

## 10. Admin UI

**Stránka:** Nastavení → Globální nastavení aplikace  
**Soubor:** `pages/AppSettings.js`  
**Oprávnění:** SUPERADMIN

Sekce "Microsoft EntraID Autentizace":
- **Toggle:** Povolit/zakázat EntraID přihlášení (`entra_enabled`)
- **Select:** Režim autentizace (`auth_mode`)
  - Pouze lokální přihlášení
  - EntraID + lokální pro všechny (pilot)
  - EntraID uživatelé / lokální admini (produkce)
- **Info bannery:** Kontextová vysvětlení pro každý režim

---

## 11. Auto-provisioning nových uživatelů

Pokud se přihlásí uživatel, který **neexistuje** v `25_uzivatele`:

```
1. Kontrola skupin z EntraID (memberOf)
2. Hledá skupinu obsahující "eeo" (case-insensitive)
   → NEMÁ skupinu → HTTP 403: "Nemáte přístup do systému EEO"
   → MÁ skupinu  → pokračuje
3. INSERT do 25_uzivatele:
   - username: z UPN (u03924)
   - jmeno: displayName z Entra
   - email: UPN
   - entra_id, upn: z Entra
   - auth_source: 'entra_id'
   - heslo: NULL
   - aktivni: 1
4. INSERT do tabulky rolí:
   - role_id: 9 (THP/PES)
5. Log: "Auto-provisioned new user"
```

**⚠️ Nově vytvořený uživatel:**
- Nemá vyplněný usek, lokalitu, příjmení (pouze jméno z displayName)
- Admin musí doplnit údaje ručně v Správě uživatelů
- Role THP/PES = základní oprávnění

---

## 12. Bezpečnost

| Mechanismus | Implementace |
|---|---|
| **PKCE** | code_verifier/challenge (SHA-256), ochrana proti code interception |
| **CSRF** | State parameter v OAuth flow |
| **Session cookie** | HttpOnly, Secure (PROD), SameSite=Lax, 24h expiry |
| **Client secret** | Pouze v .env na serveru, nikdy na frontendu |
| **Token format** | `base64(username\|timestamp)`, 12h expiry (EEO backend) |
| **UNIQUE constraint** | `entra_id` v DB – prevence duplicit |
| **Encrypted localStorage** | Web Crypto API s fallbackem (authStorage.js) |
| **CORS** | Whitelist povolených originů |
| **Helmet.js** | Security headers na Auth API |

---

## 13. Deployment do produkce – checklist

### 13.1 Databáze (PROD: eeo2025 @ 10.3.72.12)

```sql
-- 1. Přidat sloupce do 25_uzivatele
ALTER TABLE 25_uzivatele 
  ADD COLUMN entra_id VARCHAR(255) DEFAULT NULL,
  ADD COLUMN upn VARCHAR(255) DEFAULT NULL,
  ADD COLUMN auth_source ENUM('local', 'entra_id', 'hybrid') DEFAULT 'local',
  ADD COLUMN entra_sync_at TIMESTAMP NULL DEFAULT NULL,
  ADD UNIQUE INDEX idx_entra_id (entra_id);

-- 2. Přidat nastavení (POZOR: výchozí = vypnuto!)
INSERT INTO 25a_nastaveni_globalni (klic, hodnota, popis) VALUES
  ('auth_mode', 'local_only', 'Režim autentizace'),
  ('entra_enabled', '0', 'Povolit EntraID');
```

### 13.2 Auth API deployment

```bash
# 1. Zkopírovat auth-api/ na PROD server
rsync -av /var/www/erdms-dev/auth-api/ /var/www/erdms-platform/auth-api/

# 2. Vytvořit PROD .env
cp /var/www/erdms-platform/auth-api/.env.example /var/www/erdms-platform/auth-api/.env
# Upravit: NODE_ENV=production, DB_HOST=10.3.72.12, ENTRA_CLIENT_SECRET=..., CLIENT_URL=...

# 3. Install dependencies
cd /var/www/erdms-platform/auth-api && npm install --production

# 4. Spustit (doporučeno pm2)
npm install -g pm2
pm2 start src/index.js --name erdms-auth-api
pm2 save
pm2 startup
```

### 13.3 PHP backend

Zkopírovat nové soubory:
```
apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/entraAuthHandlers.php
apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/systemAuthHandlers.php
```

Aktualizovat existující:
```
apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php    (auth_method v login/detail)
apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php     (auth_source v SELECT)
```

⚠️ Ověřit, že router zahrnuje nové endpointy! (routes.php / index.php)

### 13.4 Frontend build

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:prod  # nebo build:dev:explicit pro DEV
# Výstup: build/
```

Deploy frontendu **BEZ --delete** (viz BUILD.md):
```bash
rsync -av build/ /var/www/erdms-platform/apps/eeo-v2/
# ⛔ NIKDY: rsync -av --delete ...
```

### 13.5 Apache (PROD)

Přidat do VirtualHost (pokud ještě není):
```apache
ProxyPass /auth http://localhost:4000/api/auth
ProxyPassReverse /auth http://localhost:4000/api/auth
```

```bash
apachectl configtest && systemctl reload apache2
```

### 13.6 Microsoft Azure Portal

Ověřit v App Registration (Client ID: `92eaadde-7e3e-4ad1-8c45-3b875ff5c76b`):
- ✅ Redirect URI: `https://erdms.zachranka.cz/auth/callback`
- ✅ Logout URL: `https://erdms.zachranka.cz`
- ✅ Povolené scopes: User.Read, email, openid, profile
- ✅ Client secret platný (zkontrolovat expiraci!)

### 13.7 Post-deploy verifikace

```bash
# 1. Auth API běží
curl -s https://erdms.zachranka.cz/api/health | jq .

# 2. Auth config endpoint
curl -s https://erdms.zachranka.cz/dev/eeo-v2/api/eeo/v2.0/system/auth-config | jq .

# 3. Zapnout EntraID (z Admin UI nebo SQL)
# DOPORUČENO: Nejdřív pilot režim
UPDATE 25a_nastaveni_globalni SET hodnota='1' WHERE klic='entra_enabled';
UPDATE 25a_nastaveni_globalni SET hodnota='entra_all' WHERE klic='auth_mode';
```

---

## 14. Troubleshooting

### Problém: EntraID tlačítko se nezobrazuje na login stránce
- Zkontroluj: `GET /v2.0/system/auth-config` → `entra_enabled` musí být `'1'`
- Zkontroluj: `auth_mode` nesmí být `'local_only'`

### Problém: Infinite redirect loop po EntraID loginu
- **Příčina:** Frontend ukládal token přímo do localStorage místo přes authStorage.js
- **Řešení:** Používat `saveAuthData.token()` (šifrované klíče s prefixem `dev_`)

### Problém: Logout z EntraID nefunguje (auto re-login)
- **Příčina:** MS session přetrvává, SSO check na login stránce automaticky přihlásí
- **Řešení:** `POST /auth/logout` vrací `{logoutUrl}` → redirect na MS logout endpoint

### Problém: Chybí usek/lokalita po EntraID loginu
- **Příčina:** AuthContext při page reload používal cached data z localStorage (bez JOINů)
- **Řešení:** `checkToken` nyní volá `getUserDetailApi2()` a používá čerstvá data z API

### Problém: TypeError `Cannot read properties of undefined (reading 'startsWith')`
- **Příčina:** EntraID user roles mohou mít undefined `kod_role`
- **Řešení:** `.map(r => r?.kod_role).filter(Boolean)` + guard `k &&` v hasRole

### Problém: Dropdown logout menu se neotevře
- **Příčina:** SmartTooltip wrapper blokoval click event
- **Řešení:** SmartTooltip obaluje pouze LogoutMenuContainer (1 child), portál s dropdown je mimo SmartTooltip

### Problém: SSO auto-login po odhlášení (uživatel se nedostane na login)
- **Příčina v1.0:** SSO check se spouštěl pokaždé při načtení login stránky
- **Řešení v1.1:** SSO check vyžaduje explicitní trigger (`?sso=auto` nebo `entra_login_pending`)

### Problém: Bliknutí login formuláře při návratu z Microsoftu
- **Příčina:** Login.js renderoval formulář, pak teprve spouštěl SSO check
- **Řešení:** `ssoInProgress` state inicializovaný z sessionStorage → okamžitě zobrazí loading screen

---

## 15. Platnost účtů – EntraID vs EEO (vzájemná nezávislost)

### Jak funguje autentizace po přihlášení

Po úspěšném EntraID přihlášení **EEO pracuje pouze s vlastním tokenem**:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Microsoft       │     │  auth-api        │     │  EEO             │
│  EntraID         │     │  (Node.js)       │     │  (PHP + React)   │
│                  │     │                  │     │                  │
│  accessToken ────┤────▶│  erdms_session   │     │                  │
│  idToken         │     │  cookie (24h)    │     │                  │
│                  │     │       │          │     │                  │
│                  │     │       ▼          │     │                  │
│                  │     │  /auth/me ───────┤────▶│  EEO token       │
│                  │     │                  │     │  (localStorage)  │
│                  │     │                  │     │  ↕ 12h expiry    │
│                  │     │                  │     │                  │
│  ❌ Zakázán      │     │  Session stále   │     │  ✅ Funguje dál  │
│     (v EntraID)  │     │  platná (24h)    │     │  (vlastní token) │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Co se stane při zákazu uživatele

| Akce | Okamžitý efekt v EEO | Efekt při dalším přihlášení |
|---|---|---|
| **Zakázat v EntraID** | ❌ Žádný – uživatel zůstává přihlášen dokud nevyprší EEO token | ✅ Microsoft odmítne přihlášení |
| **Deaktivovat v EEO DB** (`aktivni=0`) | ✅ Okamžitý – PHP backend ověřuje stav při každém API requestu | ✅ PHP vrátí chybu → AccessDenied |
| **Zakázat v EntraID + EEO DB** | ✅ Okamžitý (přes EEO DB check) | ✅ Obojí odmítne |

### Klíčové poznatky

1. **EntraID slouží jen jako vstupní brána** – ověří identitu, EEO najde uživatele podle UPN, vydá vlastní token a dál s Microsoftem nekomunikuje
2. **Microsoft `accessToken` ani `idToken` se v EEO neukládají** – jsou použity jednorázově při přihlášení
3. **EEO token je nezávislý na EntraID** – vyprší za 12h bez ohledu na stav MS účtu
4. **auth-api session žije 24h** – ale EEO ji nepotřebuje po prvním přihlášení

### Doporučení pro správce

- **Pro okamžité zablokování přístupu:** Deaktivujte uživatele **v EEO DB** (`UPDATE 25_uzivatele SET aktivni=0 WHERE username='u03924'`)
- **Pro trvalé zablokování:** Zakažte v **obou systémech** (EntraID + EEO DB)
- **Automatizace (budoucnost):** Azure AD webhooky mohou automaticky synchronizovat stav do EEO DB

### Možné budoucí vylepšení

| Varianta | Popis | Složitost |
|---|---|---|
| **Periodická revalidace** | Každých X minut `/auth/me` check | Střední |
| **Webhook z EntraID** | Azure notifikace → automatická deaktivace | Vysoká |
| **Duální zámek (skript)** | Admin skript deaktivuje v obou systémech najednou | Nízká |

> **Aktuální rozhodnutí (14.4.2026):** Ponecháno v1.0 – vzájemně nezávislé. Správce musí deaktivovat ručně v EEO DB pro okamžité odpojení.

---

## Příloha: Soubory k deploymentu

### Nové soubory (musí být na PROD)
```
auth-api/                              ← Celá složka (nový Node.js service)
api-legacy/.../entraAuthHandlers.php   ← EntraID callback handler
api-legacy/.../systemAuthHandlers.php  ← Auth config endpoint
```

### Změněné soubory (v1.1 – 14.4.2026)
```
auth-api/src/routes/auth.js            ← Podpora redirect parametru v /auth/callback
client/src/pages/Login.js              ← SSO trigger redesign, AccessDenied page, loading screen
client/src/components/Layout.js        ← SmartTooltip na logout, portál dropdown, sso_bypass odstraněn
client/src/services/api2auth.js        ← auth_method normalizace (auth_method || auth_source || 'local')
dashboard/src/components/Dashboard.jsx ← EEO link s ?sso=auto, verze v1.89
```

### Změněné soubory (v1.0 – původní implementace)
```
api-legacy/.../handlers.php            ← auth_method v response
api-legacy/.../queries.php             ← auth_source v SELECT
client/src/context/AuthContext.js       ← authMethod state + fresh detail
client/src/pages/AppSettings.js        ← Admin UI
```

### SQL migrace
```sql
-- Viz sekce 13.1 výše
```

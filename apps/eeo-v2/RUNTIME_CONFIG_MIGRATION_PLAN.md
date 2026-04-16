# Runtime Config Migrace – EEO v2
## `window.__ERDMS_CONFIG__` místo build-time `process.env`

**Cíl:** Jeden build nasaditelný na DEV / TEST / PROD bez rebuildu – prostředí se přepíná výměnou `config.js`.  
**Stav:** Naplánováno (2026-04-15), nezahájeno.

---

## Analýza rozsahu (naměřeno)

### Dotčené proměnné a počet souborů

| Proměnná | Souborů | Poznámka |
|---|---|---|
| `REACT_APP_API2_BASE_URL` | **50+** | Každý service file, kritické |
| `REACT_APP_VERSION` | 10 | UI zobrazení |
| `REACT_APP_ENABLE_DEBUG` | 8 | Debug logging – **nechat build-time** (tree-shaking) |
| `REACT_APP_DB_ORDER_KEY` | 8 | Název tabulky objednávek |
| `REACT_APP_DB_ATTACHMENT_KEY` | 4 | Název tabulky příloh |
| `REACT_APP_ENCRYPTION_DEBUG` | 3 | Šifrovací debug – **nechat build-time** (tree-shaking) |
| `REACT_APP_LEGACY_ATTACHMENTS_BASE_URL` | 3 | URL starých příloh |
| `REACT_APP_OLD_ATTACHMENTS_URL` | 3 | URL příloh |
| `REACT_APP_API_BASE_URL` | 2 | Legacy API |
| `REACT_APP_DEBUG_OFF` | 2 | Globální vypnutí debugu |
| `REACT_APP_ALLOW_MD5_FALLBACK` | 1 | Auth fallback |
| `REACT_APP_DB_AVAILABLE_SOURCES` | 1 | Seznam tabulek |
| `REACT_APP_DB_OBJMETADATA_KEY` | 1 | Metadata tabulky |
| `REACT_APP_FOOTER_OWNER` | 1 | Text footeru |

**Celkem: ~85 souborů, 14 runtime proměnných (2 zůstanou build-time).**

### Existující vzory v kódu (migrace bude snadnější)

- `src/config/assets.js` a `cacheConfig.js` – vzor jak abstrahovat env do config souboru
- `api2auth.js` line 6: `process.env.REACT_APP_API2_BASE_URL || '/api.eeo/'` – fallback pattern **již zaveden**
- `authStorage.js` line 15: `window.location.pathname.startsWith('/dev/')` – runtime detekce prostředí je precedensem

---

## Architektura po migraci

```
Prohlížeč načte:
  1. public/config.js          → window.__ERDMS_CONFIG__ = { ... }
  2. React bundle (main.js)    → při inicializaci čte runtimeConfig.js

src/config/runtimeConfig.js    → jediný průchozí bod, fallback na process.env
```

---

## Fáze 1 – Základ (UDĚLAT JAKO PRVNÍ)

### 1.1 Vytvořit `src/config/runtimeConfig.js`

```js
// Čte window.__ERDMS_CONFIG__, fallback na process.env (zpětná kompatibilita)
// ENABLE_DEBUG a ENCRYPTION_DEBUG záměrně NEJSOU zde – zůstávají build-time (tree-shaking)
const w = (typeof window !== 'undefined' && window.__ERDMS_CONFIG__) || {};

export const CONFIG = {
  API2_BASE_URL:               w.API2_BASE_URL               || process.env.REACT_APP_API2_BASE_URL               || '/api.eeo/',
  API_BASE_URL:                w.API_BASE_URL                || process.env.REACT_APP_API_BASE_URL                || '/api',
  VERSION:                     w.VERSION                     || process.env.REACT_APP_VERSION                     || '0.0.0',
  DB_ORDER_KEY:                w.DB_ORDER_KEY                || process.env.REACT_APP_DB_ORDER_KEY                || 'objednavky0123',
  DB_ATTACHMENT_KEY:           w.DB_ATTACHMENT_KEY           || process.env.REACT_APP_DB_ATTACHMENT_KEY           || 'oprilohy0123',
  DB_OBJMETADATA_KEY:          w.DB_OBJMETADATA_KEY          || process.env.REACT_APP_DB_OBJMETADATA_KEY          || 'r_objMetaData',
  DB_NAME:                     w.DB_NAME                     || process.env.REACT_APP_DB_NAME                     || '',
  DB_AVAILABLE_SOURCES:        w.DB_AVAILABLE_SOURCES        || process.env.REACT_APP_DB_AVAILABLE_SOURCES        || '',
  LEGACY_ATTACHMENTS_BASE_URL: w.LEGACY_ATTACHMENTS_BASE_URL || process.env.REACT_APP_LEGACY_ATTACHMENTS_BASE_URL || '',
  OLD_ATTACHMENTS_URL:         w.OLD_ATTACHMENTS_URL         || process.env.REACT_APP_OLD_ATTACHMENTS_URL         || '/prilohy/',
  ALLOW_MD5_FALLBACK:          w.ALLOW_MD5_FALLBACK          ?? (process.env.REACT_APP_ALLOW_MD5_FALLBACK === 'true'),
  FOOTER_OWNER:                w.FOOTER_OWNER                || process.env.REACT_APP_FOOTER_OWNER                || '',
  DEBUG_OFF:                   w.DEBUG_OFF                   ?? (process.env.REACT_APP_DEBUG_OFF === 'true'),
};
```

### 1.2 Přidat do `public/index.html`

Přidat **před ostatní `<script>` tagy** v `<head>`:
```html
<script src="%PUBLIC_URL%/config.js"></script>
```

### 1.3 Vytvořit `public/config.js` (DEV varianta)

```js
// DEV config – tento soubor NEverzovat, přepsat na každém prostředí
window.__ERDMS_CONFIG__ = {
  API2_BASE_URL: '/dev/api.eeo/',
  API_BASE_URL: '/dev/api',
  VERSION: '2.40-DEV',
  DB_NAME: 'EEO-OSTRA-DEV',
  DB_ORDER_KEY: 'objednavky0123',
  DB_ATTACHMENT_KEY: 'oprilohy0123',
  DB_OBJMETADATA_KEY: 'r_objMetaData',
  DB_AVAILABLE_SOURCES: 'objednavky,objednavky0123',
  OLD_ATTACHMENTS_URL: '/prilohy/',
  LEGACY_ATTACHMENTS_BASE_URL: 'https://eeo.zachranka.cz/prilohy/',
  ALLOW_MD5_FALLBACK: true,
  DEBUG_OFF: false,
  FOOTER_OWNER: '2025 ZZS SK, p.o., Robert Holovský, Klára Šulgánová a Tereza Bezoušková',
};
```

### 1.4 Vytvořit PROD verzi `config.js` (pro `/var/www/erdms-platform/apps/eeo-v2/config.js`)

```js
window.__ERDMS_CONFIG__ = {
  API2_BASE_URL: 'https://erdms.zachranka.cz/api.eeo/',
  API_BASE_URL: 'https://erdms.zachranka.cz/api',
  VERSION: '2.40',
  DB_NAME: 'eeo2025',
  DB_ORDER_KEY: 'objednavky0123',
  DB_ATTACHMENT_KEY: 'oprilohy0123',
  DB_OBJMETADATA_KEY: 'r_objMetaData',
  DB_AVAILABLE_SOURCES: 'objednavky,objednavky0123',
  OLD_ATTACHMENTS_URL: '/prilohy/',
  LEGACY_ATTACHMENTS_BASE_URL: 'https://eeo.zachranka.cz/prilohy/',
  ALLOW_MD5_FALLBACK: false,
  DEBUG_OFF: false,
  FOOTER_OWNER: '2025 ZZS SK, p.o., Robert Holovský, Klára Šulgánová a Tereza Bezoušková',
};
```

### 1.5 Přidat do `src/setupTests.js`

```js
// Stub pro jest – runtimeConfig.js pak použije process.env fallback
window.__ERDMS_CONFIG__ = {};
```

---

## Fáze 2 – Migrace klíčových souborů (ručně, ~5–8 souborů)

Tyto soubory migrovat JAKO PRVNÍ – jsou centrální nebo bezpečnostně citlivé:

### Vzor importu (přidat na začátek souboru):
```js
import { CONFIG } from '../config/runtimeConfig'; // cesta dle umístění souboru
```

### Vzor nahrazení:
```js
// PŘED:
baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo/'

// PO:
baseURL: CONFIG.API2_BASE_URL
```

### Seznam souborů – Fáze 2:

1. **`src/services/api2auth.js`** – `baseURL` obou axios instancí (`api2`, `api2NoInterceptor`)
2. **`src/utils/authStorage.js`** – `ALLOW_MD5_FALLBACK`
3. **`src/index.js`** – `VERSION` (zobrazení v splash)
4. **`src/App.js`** – `VERSION`, router konfigurace
5. **`src/utils/versionChecker.js`** – `VERSION`

---

## Fáze 3 – Mechanická náhrada zbytku (~75 souborů)

Zjistit zbývající soubory:
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
grep -rn "process\.env\.REACT_APP_" src/ --include="*.js" --include="*.jsx" -l
```

Transformační vzor (IDE Global Replace nebo sed):
```
process.env.REACT_APP_API2_BASE_URL  →  CONFIG.API2_BASE_URL
process.env.REACT_APP_API_BASE_URL   →  CONFIG.API_BASE_URL
process.env.REACT_APP_VERSION        →  CONFIG.VERSION
... atd.
```

⚠️ Po každém souboru: ověřit, že byl přidán `import { CONFIG } from '...'`

---

## Fáze 4 – Apache konfigurace

Přidat do VirtualHostu (v bloku pro `/eeo-v2`):

```apache
# config.js nesmí být cachován – jinak výměna prostředí nefunguje
<Location /eeo-v2/config.js>
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
</Location>
```

---

## Rizika a mitigace

| Riziko | Popis | Mitigace |
|---|---|---|
| **Tree-shaking** | `window.__ERDMS_CONFIG__` zabrání eliminaci dead code pro debug větve | `ENABLE_DEBUG` a `ENCRYPTION_DEBUG` nechat jako `process.env` build-time |
| **Šifrovací klíče** | DB klíče budou viditelné v `config.js` (veřejný soubor) | Jsou viditelné i dnes v bundlu – riziko se nemění. Skutečné šifrování musí být server-side. |
| **Jest testy** | `window` nemusí mít `__ERDMS_CONFIG__` | Přidat stub do `setupTests.js` (viz Fáze 1.5) |
| **Pořadí načítání** | `config.js` musí načíst prohlížeč dříve než bundle | `<script src="config.js">` bez `defer`/`async` v `<head>` |
| **Cache prohlížeče** | Config.js může být cachován → prostředí se nepřepne | `no-cache` hlavičky v Apache (viz Fáze 4) |
| **PUBLIC_URL** | Speciální CRA proměnná – nahrazuje webpack přímo při buildu | **Nemigrovat** – zůstane `process.env.PUBLIC_URL` |
| **NODE_ENV** | Interní CRA proměnná pro `development`/`production` chování | **Nemigrovat** – zůstane `process.env.NODE_ENV` |

---

## Reverzibilita

V jakémkoliv okamžiku lze vrátit zpět:
1. Odebrat `<script src="%PUBLIC_URL%/config.js">` z `public/index.html`
2. `runtimeConfig.js` má fallback na `process.env` → stará `.env.production` data stále fungují
3. Znovu nasadit build bez `config.js` na serveru

---

## Ověření po nasazení

```bash
# config.js je dostupný
curl -I https://erdms.zachranka.cz/eeo-v2/config.js | grep -i cache-control

# Aplikace se načte
curl -s -o /dev/null -w "%{http_code}" https://erdms.zachranka.cz/eeo-v2/

# V prohlížeči DevTools Console:
# window.__ERDMS_CONFIG__  →  { API2_BASE_URL: "...", ... }
```

---

## Poznámky

- `public/config.js` přidat do `.gitignore` – každé prostředí má svůj vlastní
- Šablonu verzovat jako `public/config.js.example`
- `setupProxy.js` (webpack dev server) nemigrovat – slouží jen pro `npm start`, zůstane beze změny

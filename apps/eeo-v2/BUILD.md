# EEO v2 – DEV build only (FE)

> ⚠️ DEV-only, FE-only.
> - ❌ ŽÁDNÝ deploy
> - ❌ Neměnit API URL
> - ❌ Neměnit DB – DEV DB musí být **EEO-OSTRA-DEV**

## Build (doporučeno skriptem)

```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --dev --frontend --no-deploy
```

## Checklist před DEV buildem

- [ ] Pracujeme pouze v DEV workspace `/var/www/erdms-dev/` (žádný deploy do produkce)
- [ ] `REACT_APP_VERSION` je nastavené na aktuální DEV verzi (např. `2.34-DEV`) v [eeo-v2/client/.env](eeo-v2/client/.env)
- [ ] Pro stažení importovaných příloh je nastavené `REACT_APP_OLD_ATTACHMENTS_URL` **nebo** aspoň `REACT_APP_UPLOAD_BASE_URL` (jinak se `IMPORT` přílohy nepůjdou stáhnout)
- [ ] DEV DB je správně (nesahat na PROD DB)
- [ ] Nejsou přidané hardcoded URL/cesty/DB názvy (vše přes env)

## Build (alternativa přímo v client/)

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm ci
npm run build:dev:explicit
```

### Workaround: falešná ESLint „Parsing error“ při buildu

Pokud build spadne na hlášce typu:

`[eslint] ... Parsing error: Unexpected token ...`

ale samotný `npx eslint` soubor bez fatal erroru projde, je možné dočasně vypnout eslint-webpack-plugin:

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
DISABLE_ESLINT_PLUGIN=true npm run build:dev:explicit
```

## Ověření

```bash
curl -s http://localhost/dev/eeo-v2/version.json
```
---

## ❌ DEPRECATED CONTENT BELOW – IGNORE

Následující historický obsah je zastaralý a **nesmí se používat**.
Platí pouze DEV FE postup uvedený nahoře.

## 📋 Overview

ERDMS používá automatizované build skripty pro konzistentní development a production buildy. **VŽDY POUŽÍVEJ TYTO SKRIPTY** místo manuálních NPM commandů!

**Aktuální verze:** `2.36` *(aktivní verze - publikováno 19.3.2026)*

## 🔄 VERSION CHECKING SYSTEM

### 🎯 Jak funguje detekce nové verze

ERDMS používá **automatický version checking systém** založený na build hash:

### ⚠️ DŮLEŽITÉ: Build Hash ≠ Číslo Verze

```
📌 VERZE aplikace (např. 2.21-DEV):
   - Číselná verze pro uživatele
   - Mění se při významných změnách
   - Nastavuje se manuálně v .env (REACT_APP_VERSION)

🔨 BUILD HASH (např. c7a2487ddeef):
   - Automaticky generovaný MD5 hash při KAŽDÉM buildu
   - Mění se i při malých změnách v kódu
   - Používá se pro detekci nové verze
   - Generuje se automaticky - NELZE nastavit manuálně!
```

**PŘÍKLAD:**
```bash
# Drobná oprava CSS → Verze zůstane 2.34-DEV
# ALE build hash se změní: c7a2487ddeef → d8e3f9a12b45
# → Uživatelé dostanou notifikaci "Je dostupná nová verze v2.34-DEV"
```

### 📋 Build Hash Workflow

1. **Build hash generování**: Při každém buildu se vygeneruje MD5 hash z hlavního JS souboru (prvních 12 znaků)
2. **Uložení hashe**: Hash se uloží:
   - Do `<meta name="build-hash" content="...">` v `index.html`
   - Do `version.json` souboru v root složce buildu
3. **Automatická kontrola**: Build script automaticky ověří, že oba hashe se SHODUJÍ
4. **Kontrola verze v prohlížeči**: Aplikace každých 5 minut kontroluje `version.json` na serveru
5. **Detekce změny**: Pokud je hash v `version.json` jiný než aktuální hash v prohlížeči → zobrazí se notifikace
6. **Reload**: Po potvrzení se stránka reloadne a načte novou verzi
7. **Konec**: Po reloadu se hash aktualizuje → žádná další notifikace

### 📝 Důležité soubory

```
apps/eeo-v2/client/
├── public/index.html              # Obsahuje placeholder __BUILD_HASH__
├── build/
│   ├── index.html                # Hash je nahrazen skutečnou hodnotou
│   └── version.json              # Server-side hash pro kontrolu
├── scripts/
│   └── generate-build-info.sh    # Post-build script pro generování hashe
└── src/
    ├── utils/versionChecker.js   # Class pro kontrolu verzí
    └── hooks/useVersionChecker.js # React hook
```

### ⚠️ KRITICKÉ: Build Process Flow

```bash
npm run build
↓
1. React build vytvoří minifikované soubory (main.*.js)
↓
2. Zkopíruje index.html s placeholderem __BUILD_HASH__
↓
3. Post-build script: ./scripts/generate-build-info.sh
   - Spočítá MD5 hash z main.*.js (prvních 12 znaků)
   - Nahradí __BUILD_HASH__ v index.html skutečným hashem
   - Vytvoří version.json se STEJNÝM hashem
↓
4. Build script automaticky ověří synchronizaci hashů
   ✅ Pokud OK → Build úspěšný
   ❌ Pokud NESOUHLASÍ → Build FAILED, nelze deployovat!
↓
5. Build je hotový a připravený k deployu
```

### 🤖 AUTOMATICKÁ KONTROLA (od verze 2.21)

Build script `/docs/scripts-shell/build-eeo-v2.sh` nyní **automaticky kontroluje** synchronizaci hashů:

```bash
./build-eeo-v2.sh --dev --explicit
# → Build probíhá...
# → 🔍 Kontroluji synchronizaci build hashů...
# → ✅ Build hashe synchronizované: c7a2487ddeef
# → ⏰ Build time: 2026-02-01T01:39:00Z
```

**Pokud hashe NESOUHLASÍ:**
```bash
❌ CRITICAL ERROR: Build hashe se NESHODUJÍ!
   index.html:  c7a2487ddeef
   version.json: a809c7e85b795c47

⚠️  Build byl NEÚSPĚŠNÝ - nelze deployovat!
```

**Build script se UKONČÍ s chybou** - deployment se neprovede!

### ✅ Správná synchronizace

**PO každém buildu MUSÍ platit:**
```bash
# Hash v index.html
grep 'build-hash' build/index.html
# → content="c7a2487ddeef"

# Hash v version.json  
cat build/version.json
# → "buildHash": "c7a2487ddeef"

# MUSÍ BÝT STEJNÉ!
```

### ❌ Častá chyba

**NIKDY nespouštěj `generate-build-info.sh` manuálně po buildu!**

```bash
# ❌ ŠPATNĚ:
npm run build:dev:explicit
./scripts/generate-build-info.sh build  # ← Vygeneruje JINÝ hash!

# ✅ SPRÁVNĚ:
npm run build:dev:explicit  # Script se spustí automaticky
```

### 🔍 Jak zjistit, proč se zobrazuje pořád notifikace

1. **Zkontroluj hashe:**
   ```bash
   # Hash v aktuálním index.html
   grep -o 'build-hash" content="[^"]*"' build/index.html
   
   # Hash v version.json
   cat build/version.json | grep buildHash
   ```

2. **Pokud se NESHODUJÍ:**
   ```bash
   # Oprav version.json - použij hash z index.html
   # Pak už NESPOUŠTĚJ generate-build-info.sh!
   ```

3. **Pokud se SHODUJÍ, ale notifikace pořád přichází:**
   ```bash
   # V prohlížeči: F12 → Console
   localStorage.clear()
   # Pak refresh: Ctrl+Shift+R
   ```

### 🚀 Deploy workflow

```bash
# ============================================
# DEV DEPLOYMENT
# ============================================
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --dev --no-deploy

# Build script automaticky zkontroluje hashe!
# ✅ Pokud OK → Pokračuj
# ❌ Pokud FAIL → Oprav problém


# Ověření na serveru:
curl http://localhost/dev/eeo-v2/version.json
# → Očekávaný hash musí být STEJNÝ jako v build/index.html

# ============================================
# PRODUCTION DEPLOYMENT
# ============================================
cd /var/www/erdms-dev/docs/scripts-shell
./build-eeo-v2.sh --prod --all --deploy

# Build script:
# 1. Automaticky zkontroluje hashe
# 2. Požádá o POTVRZENÍ před deployem do PROD
# 3. Vytvoří zálohu
# 4. Deployuje do /var/www/erdms-platform/
# 5. Zobrazí ověřovací příkaz

# Po deployu OVĚŘ:
curl https://erdms.zachranka.cz/eeo-v2/version.json
# → Hash MUSÍ odpovídat buildu!
```

### � KRITICKÉ: MANUÁLNÍ PROD FE DEPLOYMENT (POUZE FE, BEZ API)

**⚠️ DŮLEŽITÉ: Struktura PROD vs DEV je ROZDÍLNÁ!**

```bash
# ❌ ŠPATNĚ - SMAŽE API SLOŽKU:
cd /var/www/erdms-dev/apps/eeo-v2/client
rsync -av --delete build-prod/ /var/www/erdms-platform/apps/eeo-v2/
# → --delete flag SMAŽE api/ a vše co není v build-prod/!

# ✅ SPRÁVNĚ - POUZE FE, ZACHOVÁ API:
rsync -av --exclude='api' --exclude='api-legacy' \
  build-prod/ /var/www/erdms-platform/apps/eeo-v2/

# NEBO (bezpečnější):
rsync -av build-prod/ /var/www/erdms-platform/apps/eeo-v2/client/
# → Umístí FE do subfolder client/, API zůstane nedotčené
```

**📂 Struktura složek:**

```
DEV struktura:
/var/www/erdms-dev/apps/eeo-v2/
├── client/                    # FE zdrojové soubory
│   ├── src/                  # React komponenty
│   ├── build/                # DEV build
│   └── build-prod/           # PROD build (připravený k deployu)
├── api/                      # Node.js API
└── api-legacy/               # PHP API

PROD struktura:
/var/www/erdms-platform/apps/eeo-v2/
├── index.html               # FE soubory PŘÍMO v root
├── static/                  # FE statické soubory
├── version.json             # FE build info
├── api/                     # Node.js API (NESMÍ se smazat!)
└── api-legacy/              # PHP API (NESMÍ se smazat!)
```

**💡 Poučení:**
- Build script `build-eeo-v2.sh --prod` toto řeší automaticky správně
- Manuální rsync POUZE pokud víš co děláš
- NIKDY nepoužívej `--delete` flag při FE deploymentu
- API složky MUSÍ zůstat zachované

### �🔍 Co dělat když build SELŽE

**Případ 1: Build hashe se neshodují**
```bash
❌ CRITICAL ERROR: Build hashe se NESHODUJÍ!

ŘEŠENÍ:
1. NIKDY nespouštěj generate-build-info.sh manuálně!
2. Smaž build/ složku a buildni znovu:
   cd /var/www/erdms-dev/apps/eeo-v2/client
   rm -rf build build-prod
   cd /var/www/erdms-dev/docs/scripts-shell
   ./build-eeo-v2.sh --dev
```

**Případ 2: Notifikace se zobrazuje pořád**
```bash
DIAGNÓZA:
1. Zkontroluj hashe:
   cd /var/www/erdms-dev
   ./check_build_hashes.sh
   
2. Zkontroluj version.json na serveru:
   curl http://localhost/dev/eeo-v2/version.json
   
3. Pokud se NESHODUJÍ → rebuild:
   cd /var/www/erdms-dev/docs/scripts-shell
   ./build-eeo-v2.sh --dev

4. V prohlížeči smaž localStorage:
   F12 → Console → localStorage.clear() → F5
```

### 📚 Další dokumentace

Pro detailní troubleshooting a vysvětlení problémů s notifikacemi viz:
- **[VERSION_CHECKING_GUIDE.md](VERSION_CHECKING_GUIDE.md)** - Kompletní průvodce version checking systémem

---

## 📍 Lokace Build Skriptů

**VŠECHNY build skripty jsou umístěny v:**
```
/var/www/erdms-dev/docs/scripts-shell/
```

**Před spuštěním jakéhokoliv buildu:**
```bash
cd /var/www/erdms-dev/docs/scripts-shell
```

## 🎯 KRITICKÉ - KONFIGURACE PROSTŘEDÍ

### 🔴 TŘI REŽIMY PROVOZU:

| Režim | Command | API Cesta | Databáze | Účel |
|-------|---------|-----------|----------|------|
| **HMR (npm start)** | `npm start` | `/api.eeo/` → proxy → `/dev/api.eeo/` | `EEO-OSTRA-DEV` | Lokální vývoj s hot reload |
| **DEV Build** | `./build-eeo-v2.sh --dev` | `/dev/api.eeo/` (přímá) | `EEO-OSTRA-DEV` | Testování na DEV serveru |
| **PROD Build** | `./build-eeo-v2.sh --prod` | `/api.eeo/` (přímá) | `eeo2025` | Ostrý provoz |

### 📍 Jak to funguje:

#### 1️⃣ HMR - Lokální vývoj (npm start)
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm start
```
- **Frontend:** `http://localhost:3001`
- **API cesta FE:** `/api.eeo/` (definováno v `.env`)
- **Proxy:** `setupProxy.js` přesměruje `/api.eeo/` → `http://localhost/dev/api.eeo/`
- **Skutečné API:** `/dev/api.eeo/` (Apache alias)
- **Databáze:** `EEO-OSTRA-DEV` (z `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env`)
- **Zobrazení v patičce:** `/dev/api.eeo (proxy)` + `DB: EEO-OSTRA-DEV`

#### 2️⃣ DEV Build - Testování
```bash
./build-eeo-v2.sh --dev
```
- **Build script:** Nastaví `REACT_APP_API2_BASE_URL=/dev/api.eeo/`
- **API cesta:** `/dev/api.eeo/` (přímá, bez proxy)
- **Databáze:** `EEO-OSTRA-DEV`
- **Deploy:** `/var/www/erdms-dev/apps/eeo-v2/client/build/`
- **URL:** `http://erdms.zachranka.cz/dev/`
- **Zobrazení v patičce:** `/dev/api.eeo` + `DB: EEO-OSTRA-DEV`

#### 3️⃣ PROD Build - Ostrý provoz
```bash
./build-eeo-v2.sh --prod
```
- **Build script:** Nastaví `REACT_APP_API2_BASE_URL=/api.eeo/`
- **API cesta:** `/api.eeo/` (přímá)
- **Databáze:** `eeo2025`
- **Deploy:** `/var/www/erdms-platform/apps/eeo-v2/client/build/`
- **URL:** `https://erdms.zachranka.cz/`
- **Zobrazení v patičce:** `/api.eeo` + `DB: eeo2025`

### ⚠️ KONTROLA SPRÁVNOSTI:

**V PATIČCE APLIKACE MUSÍŠ VIDĚT:**

| Režim | Patička musí zobrazovat |
|-------|-------------------------|
| HMR (npm start) | `API: /dev/api.eeo (proxy)` + `DB: EEO-OSTRA-DEV` |
| DEV Build | `API: /dev/api.eeo` + `DB: EEO-OSTRA-DEV` |
| PROD Build | `API: /api.eeo` + `DB: eeo2025` |

**POKUD VIDÍŠ NĚCO JINÉHO = CHYBA V KONFIGURACI!**

## ⚠️ KRITICKÉ - DEV BUILD S EXPLICITNÍ DB ⚠️

**DEV prostředí MUSÍ používat databázi:** `EEO-OSTRA-DEV`  
**Build command:** `./build-eeo-v2.sh --dev`

```bash
# ✅ SPRÁVNĚ: DEV build
./build-eeo-v2.sh --dev

# Database: EEO-OSTRA-DEV
# Cesta API: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/
# .env MUSÍ obsahovat: DB_NAME=EEO-OSTRA-DEV
```

## ⚠️ KRITICKÉ UPOZORNĚNÍ - PRODUCTION URL ⚠️

**NIKDY** nepoužívej `eeo.zachranka.cz` pro production!  
**VŽDY** používej `erdms.zachranka.cz` pro production!

```bash
❌ ŠPATNĚ: REACT_APP_API_BASE_URL=https://eeo.zachranka.cz/api
✅ SPRÁVNĚ: REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api
```

## � KRITICKÉ UPOZORNĚNÍ - DEPLOYMENT CHECKLIST 🚨

### ⚠️ PŘED KAŽDÝM PRODUCTION DEPLOYEM ZKONTROLUJ:

**🔴 PHP Utility Functions:**
1. **debug_logger.php MUSÍ být includnutý GLOBÁLNĚ** (ne pouze v DEV větvi)
   ```php
   // ✅ SPRÁVNĚ - debug_logger.php includnutý před IF podmínkou
   require_once __DIR__ . '/debug_logger.php';
   
   if (IS_DEV_ENV) {
       // DEV konfigurace
   } else {
       // PROD konfigurace
   }
   
   // ❌ ŠPATNĚ - debug_logger.php pouze v DEV větvi
   if (IS_DEV_ENV) {
       require_once __DIR__ . '/debug_logger.php';  // Fatal error v PROD!
   }
   ```

2. **Důvod:** Pokud je `debug_log()` volána v kódu (invoiceHandlers.php, notes_handlers.php atd.), 
   ale `debug_logger.php` není includnutý v PROD → **Fatal error: Call to undefined function**

3. **Řešení:** Utility funkce s interním DEV/PROD checkem VŽDY includovat globálně.
   Funkce sama kontroluje `IS_DEV_ENV` a v PROD nedělá nic (graceful no-op).

**📍 Soubory k ověření před deployem:**
- `/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/api.php` (řádky 1-30)
- Zkontroluj že `require_once __DIR__ . '/debug_logger.php';` je PŘED `if (IS_DEV_ENV)`

**🧪 Pre-deployment test:**
```bash
# Test že funkce je definována i v PROD kontextu
php -r "define('IS_DEV_ENV', false); require '/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/debug_logger.php'; debug_log('test'); echo 'OK';"
```

**💡 Naučená lekce (25.1.2026):**
Deploy v2.19 selhal kvůli debug_log() byla volána v kódu, ale debug_logger.php byl 
includnutý pouze v `if (IS_DEV_ENV)` bloku → 500 error na všech complex endpoints 
(cashbox, invoices, dictionaries, todonotes).

---

## 🚀 Quick Start

**DŮLEŽITÉ:** Build skripty jsou umístěny v `/var/www/erdms-dev/docs/scripts-shell/`

```bash
# 1. Přejdi do složky se skripty
cd /var/www/erdms-dev/docs/scripts-shell

# 2. Spusť požadovaný build

# Dashboard build a deploy
./build-dashboard.sh --dev --deploy

# EEO v2 frontend + backend (verze 2.20)
./build-eeo-v2.sh --dev --all

# Všechny aplikace najednou
./build-all.sh --dev --deploy

# Production build (verze 2.20)
./build-dashboard.sh --prod --deploy
```

## 📚 Dokumentace

> **Poznámka:** Starší dokumentace a technické analýzy byly přesunuty do [`docs/deprecated/`](./docs/deprecated/) během reorganizace workspace struktury (2026-01-11). Aktivní zůstávají pouze tento BUILD.md a README.md.

## 🏗️ Build Scripts

### Lokace
```
/var/www/erdms-dev/docs/scripts-shell/  (všechny build skripty)
```

**Jak spustit:**
```bash
# 1. Přejdi do složky se skripty
cd /var/www/erdms-dev/docs/scripts-shell

# 2. Spusť skript s parametry
./build-eeo-v2.sh --dev --all
```

### Dostupné skripty

| Script | Popis | Aplikace | Příklad použití |
|--------|--------|-----------|------------------|
| `build-dashboard.sh` | Dashboard build + deploy | Dashboard + Auth API trigger | `./build-dashboard.sh --dev --deploy` |
| `build-auth-api.sh` | Auth API deploy | Auth API standalone | `./build-auth-api.sh --prod --deploy` |
| `build-dashboard-auth.sh` | Dashboard + Auth API combo | Dashboard + Auth API | `./build-dashboard-auth.sh --dev --deploy` |
| `build-eeo-v2.sh` | EEO v2 frontend/backend | EEO v2 | `./build-eeo-v2.sh --dev --all --deploy` |
| `build-intranet-v26.sh` | Intranet v26 build + deploy | Intranet v26 | `./build-intranet-v26.sh --prod --deploy` |
| `build-all.sh` | Master script pro všechny aplikace | All | `./build-all.sh --dev --deploy` |

## 🎛️ Parametry

### Prostředí
- `--prod` - Production prostředí
- `--dev` - Development prostředí (default)

### Deployment
- `--deploy` - Provést deployment po buildu
- `--no-deploy` - Pouze build bez deploymentu (default)

### EEO v2 specifické
- `--frontend` / `--fe` - Pouze frontend
- `--backend` / `--be` - Pouze backend  
- `--all` - Frontend + backend (default)

### Master script
- `--app=dashboard,eeo-v2,intranet-v26` - Výběr aplikací

## 📁 Directory Structure

### Development
```
/var/www/erdms-dev/
├── dashboard/                 # Dashboard React app
├── auth-api/                 # Auth API Node.js
├── apps/
│   ├── eeo-v2/
│   │   ├── client/           # EEO v2 React frontend
│   │   └── api/              # EEO v2 Node.js backend
│   └── intranet-v26/         # Intranet v26 app
└── docs/scripts-shell/       # Build scripts
```

### Production
```
/var/www/erdms-platform/
├── apps/
│   ├── dashboard/            # Dashboard production
│   ├── eeo-v2/
│   │   ├── client/          # EEO v2 frontend production
│   │   └── api/             # EEO v2 backend production
│   └── intranet-v26/        # Intranet v26 production
├── auth-api/                 # Auth API production
├── backups/                  # Automatic backups
├── config/                   # Configuration files
└── data/                     # Application data
```

## � Usage Examples

**POZNÁMKA:** Všechny příklady předpokládají, že jste ve složce `/var/www/erdms-dev/docs/scripts-shell/`

### Dashboard Development
```bash
cd /var/www/erdms-dev/docs/scripts-shell

# Build pro development (zůstává v dev)
./build-dashboard.sh --dev

# Build a deploy do produkce
./build-dashboard.sh --prod --deploy
```

### EEO v2 Deployment
```bash
cd /var/www/erdms-dev/docs/scripts-shell

# Build frontend + backend pro dev
./build-eeo-v2.sh --dev --all

# Build a deploy celý EEO v2 do produkce
./build-eeo-v2.sh --prod --all --deploy

# Pouze backend do produkce
./build-eeo-v2.sh --prod --backend --deploy
```

### Auth API
```bash
cd /var/www/erdms-dev/docs/scripts-shell

# Deploy auth API do produkce
./build-auth-api.sh --prod --deploy
```

### Master Build
```bash
cd /var/www/erdms-dev/docs/scripts-shell

# Build všechny aplikace pro produkci
./build-all.sh --prod --deploy

# Build pouze dashboard a EEO v2
./build-all.sh --prod --deploy --app=dashboard,eeo-v2

# Dev build všech aplikací
./build-all.sh --dev
```

## 🆕 Verze 2.13 - DEPLOYED (15.1.2026)

**Stav:** ✅ DEPLOYED TO PRODUCTION  
**Datum:** 15. ledna 2026  
**Backup DB:** `/var/www/__BCK_PRODUKCE/2026-01-15/eeo2025_backup_*.sql.gz` (2.9M)

### ⚠️ KRITICKÉ: Správné nastavení verzí při buildu

**PROBLÉM:** Verze se musí aktualizovat na VŠECH místech, ne jen v package.json!

**ŘEŠENÍ - Kontrolní seznam pro změnu verze:**

1. ✅ **BUILD.md** - řádek 7: `**Aktuální DEV verze:** \`2.34\``
2. ✅ **Client .env soubory:**
   - `/apps/eeo-v2/client/.env` → `REACT_APP_VERSION=2.34-DEV`
   - `/apps/eeo-v2/client/.env.development` → `REACT_APP_VERSION=2.34-DEV`
   - `/apps/eeo-v2/client/.env.production` → `REACT_APP_VERSION=2.34`
3. ✅ **Client package.json:**
   - `"version": "2.34.0"`
   - **HARDCODED ve scriptu:** `build:dev:explicit` → `REACT_APP_VERSION=2.34-DEV`
4. ✅ **API Legacy .env soubory:**
   - `/apps/eeo-v2/api-legacy/api.eeo/.env` → `REACT_APP_VERSION=2.34-DEV`
   - `/apps/eeo-v2/api-legacy/api.eeo/.env.production` → `REACT_APP_VERSION=2.34`

**🔍 Kde se verze zobrazuje:**
- **Patička aplikace:** Zobrazuje `v{REACT_APP_VERSION}` vpravo dole
- **About dialog (O aplikaci):** Menu → O aplikaci → zobrazuje `verze {REACT_APP_VERSION}`
  - Komponent: `/apps/eeo-v2/client/src/components/About.js` (řádek 263)
  - Čte z: `process.env.REACT_APP_VERSION`
- **Update notifikace:** Při detekci nové verze zobrazuje aktuální verzi
  - Soubory: `App.js`, `versionChecker.js`, `UpdateNotificationModal.js`
  - ✅ **Načítá dynamicky z `process.env.REACT_APP_VERSION`** - změna verze v .env stačí!

**🔧 CO DĚLAT PŘI ZMĚNĚ VERZE (např. 2.34 → 2.35):**

1. **Aktualizuj .env soubory** (6 souborů - viz seznam výše)
2. **Rebuild aplikace** - build proces načte nové hodnoty z .env
3. **Ověř v About dialogu** - zkontroluj že se zobrazuje správná verze
4. **PROD nasazení (po vygenerování nového build hashe a deploy FE):**
    - ✅ Změň verzi i v produkčním API Legacy `.env` (jen verzi, nic jiného):
       - `/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env` → `REACT_APP_VERSION=...`
    - ⚠️ Pouze s potvrzením a bez zásahu do DB/cest (`DB_*`, `UPLOAD_*` se nemění)
    - ✅ Pak ověř, že `version.json` a patička aplikace ukazují stejnou verzi

**✅ HOTOVO:** Verze se již načítá dynamicky ze .env, není potřeba upravovat žádné další soubory!

   - `/apps/eeo-v2/api-legacy/api.eeo/.env.example` → aktualizovat komentáře

**PŘÍKAZ pro hromadnou kontrolu:**
```bash
grep -r "REACT_APP_VERSION\|\"version\":" \
  apps/eeo-v2/client/.env* \
  apps/eeo-v2/client/package.json \
  apps/eeo-v2/api-legacy/api.eeo/.env* \
  | grep -v ".example" | grep -v "backup"
```

### Co je nového v 2.13:
- 🔧 **API Legacy deployment** - automatické kopírování včetně .env.production
- ✅ **Oprava verzování** - všechny .env soubory synchronizovány
- 📧 **Šablony notifikací** - aktualizace URL pro věcnou správnost faktur (ID 115, 117)
- 🛡️ **Data protection** - datové složky (prilohy, sablony, manualy) nejsou přepisovány

### Deployment postup 2.13:

**Před buildem:**
```bash
# 1. Záloha produkční databáze
mkdir -p /var/www/__BCK_PRODUKCE/$(date +%Y-%m-%d)
mysqldump -h 10.3.172.11 -u erdms_user -p'***' eeo2025 | \
  gzip > /var/www/__BCK_PRODUKCE/$(date +%Y-%m-%d)/eeo2025_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# 2. Update verzí VŠUDE (viz kontrolní seznam výše)

# 3. Pokud jsou změny v notifikačních šablonách - sync do produkce:
mysqldump -h 10.3.172.11 -u erdms_user -p'***' --no-create-info \
  --skip-add-drop-table --replace EEO-OSTRA-DEV 25_notifikace_sablony \
  --where="id IN (115, 117)" > /tmp/templates_export.sql
mysql -h 10.3.172.11 -u erdms_user -p'***' eeo2025 < /tmp/templates_export.sql
```

**Build a deploy:**
```bash
cd /var/www/erdms-dev/docs/scripts-shell

# DEV build (DB: EEO-OSTRA-DEV)
./build-eeo-v2.sh --dev --all

# PROD build a deploy (DB: eeo2025)
./build-eeo-v2.sh --prod --all --deploy
```

**Build script nyní zahrnuje:**
- ✅ Frontend deployment (rsync, zachovává api/ a api-legacy/)
- ✅ Node.js Backend deployment
- ✅ **API Legacy (PHP)** deployment s production .env
- ✅ Automatické vyloučení datových složek (cache/, logs/, uploads/)
- ✅ Správné oprávnění (www-data:www-data)

### Databázové změny v 2.13:
- ✅ Šablony #115, #117: URL změněno z `/invoices-page-25` na `/invoice-evidence`
- ✅ DB: eeo2025 (produkce), EEO-OSTRA-DEV (vývoj)

### 📖 Deployment checklist:
- [ ] Záloha DB vytvořena
- [ ] Verze změněna VŠUDE (6 souborů + BUILD.md)
- [ ] DEV build otestován
- [ ] Šablony synchronizovány (pokud byly změny)
- [ ] PROD build s --deploy
- [ ] Verifikace verze v aplikaci
- [ ] Test kritických funkcí

---

## 🆕 Verze 2.10.0 - Připraveno k nasazení

**Stav:** ✅ SUPERSEDED by 2.13  
**Datum:** 11. ledna 2026  
**Git tag:** v2.10-backup-20260111_2042

### Co je nového v 2.10.0:
- 📧 **HTML Email šablony** pro věcnou kontrolu faktur (MS Outlook 365)
- 🔄 **Standardizace notifikačních typů** (126 záznamů migrováno)
- 🎨 **UI improvements** (tooltips, custom dialogs, field validation fix)
- 🛡️ **Anti-spam notifikace** (pouze při změně workflow stavu)

### Frontend změny:
- **package.json:** 2.08 → 2.10.0
- **8 souborů upraveno:** OrganizationHierarchy, InvoiceEvidencePage, CustomSelect, atd.
- **2 nové notification triggery** pro invoice material check

### Databáze:
- ✅ **126 notifikací migrováno** (11.1.2026 18:47)
- ✅ **HTML šablony nahrány** (11.1.2026 20:35)
- ✅ **Event types standardizovány**

### Deployment postup:
```bash
# 1. Build EEO v2 s novou verzí
./build-eeo-v2.sh --prod --all --deploy

# 2. Po deployment - refresh org hierarchie profil PRIKAZCI
# (nutné pro načtení nových templates a event types)
```

**📖 Kompletní deployment guide:** [DEPLOYMENT_v2.10_*.md](./docs/deployment/)

## ⚡ Quick Commands

### Rychlý production deploy všeho
```bash
cd /var/www/erdms-dev/docs/scripts-shell
./build-all.sh --prod --deploy
```

### Pouze dashboard do produkce
```bash
./build-dashboard-auth.sh --prod --deploy
```

### EEO v2 dev build (frontend zůstane v dev)
```bash
./build-eeo-v2.sh --dev --all
```

## 🔧 Technical Details

### EEO v2 Special Behavior
- **DEV builds**: Frontend zůstává v `/var/www/erdms-dev/apps/eeo-v2/client/build/`
- **PROD builds**: Frontend se deployne do `/var/www/erdms-platform/apps/eeo-v2/client/`

### Services
Build skripty automaticky restartují potřebné systemd services:
- `erdms-auth-api.service` - Auth API
- `erdms-eeo-api.service` - EEO v2 API
- `apache2` - reload konfigurace

### Backups
Při production deployment se automaticky vytváří zálohy:
- Lokace: `/var/www/erdms-platform/backups/`
- Format: `{app}-backup-{timestamp}`

### Environment Variables
Production deployment automaticky upravuje `.env` soubory:
- `NODE_ENV=production`
- Správné porty (4000, 4001, atd.)
- HTTPS URLs místo localhost

## 🛠️ Troubleshooting

### Permission Issues
```bash
# Fix permissions
chown -R www-data:www-data /var/www/erdms-platform/apps/
chown -R root:www-data /var/www/erdms-platform/auth-api/
```

### Service Issues
```bash
# Check service status
systemctl status erdms-auth-api.service
systemctl status erdms-eeo-api.service

# Restart services manually
systemctl restart erdms-auth-api.service
systemctl reload apache2
```

### Build Issues
```bash
# Clear npm cache
cd /var/www/erdms-dev/dashboard
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 📝 Development Workflow

1. **Vývoj**: Pracuj v `/var/www/erdms-dev/`
2. **Test**: `./build-{app}.sh --dev` 
3. **Deploy**: `./build-{app}.sh --prod --deploy`

### Git Integration
Build skripty pracují s aktuálním stavem souborů v dev složce. Pro production deployment doporučujeme:

```bash
# Commit změny
git add .
git commit -m "Feature: XYZ"

# Deploy do produkce
./build-all.sh --prod --deploy

# Tag release
git tag v$(date +%Y%m%d-%H%M%S)
git push --tags
```

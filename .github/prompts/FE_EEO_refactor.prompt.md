# Frontend EEO v2 - Refaktor API URL Management

**Datum:** 20. prosince 2025  
**Priorita:** 🔴 HIGH - Blokující pro DEV/PROD separaci  
**Branch:** `feature/generic-recipient-system`  
**Vazba:** `PHP_api.prompt.md` (Backend ENV detection)

---
**DŮLEŽITÉ: Komunikuj vždy v češtině.**

## 🎯 Cíl Refaktoru

Odstranit **všechny hardcoded absolute URLs** z FE kódu a zajistit že:
1. API volání **vždy používají** `process.env.REACT_APP_API2_BASE_URL` jako primární zdroj
2. Fallback je **pouze relativní** `/api.eeo/` (ne absolute URL)
3. FE lze **spustit na DEV** (`/dev/api.eeo/`) **i PROD** (`/api.eeo/`) pouze změnou `.env`
4. Žádný kód neobsahuje `https://erdms.zachranka.cz` hardcoded

---

## 🔴 HIGH PRIORITY - Pravidla (MUST FOLLOW)

### ✅ SPRÁVNĚ:
```javascript
// ✅ Primární: ENV variable, fallback relativní
const API_BASE = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';

// ✅ Axios instance s ENV
axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo/'
});

// ✅ Relativní URL v .env
REACT_APP_API2_BASE_URL=/dev/api.eeo/
```

### ❌ ŠPATNĚ:
```javascript
// ❌ Hardcoded absolute URL jako fallback
const API_BASE = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/';

// ❌ Absolute URL přímo v kódu
fetch('https://erdms.zachranka.cz/api.eeo/orders');

// ❌ Hardcoded domain
const domain = 'erdms.zachranka.cz';
```

---

## 📊 Současný Stav - 13 Souborů K Fixu

### Soubory s hardcoded `https://erdms.zachranka.cz/api.eeo/`:

1. **`src/components/UniversalSearch/EntityDetailViews.js:1861`**
   ```javascript
   const API_BASE = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/';
   ```

2. **`src/services/userSettingsApi.js:11`**
   ```javascript
   baseURL: process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/',
   ```

3. **`src/services/backgroundTasks.js:405`**
   ```javascript
   const API2_BASE_URL = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/';
   ```

4. **`src/services/apiSmlouvy.js:19`**
5. **`src/services/apiUniversalSearch.js:11`**
6. **`src/services/apiEntityDetail.js:10`**
7. **`src/services/cashbookService.js:17`**
8. **`src/services/api2auth.js:7`**
9. **`src/services/api2auth.js:2720`**
10. **`src/services/apiv2Dictionaries.js:55`**
11. **`src/pages/ProfilePage.js:2121`**
12. **`src/pages/NotificationTestPanel.js:323`**
13. **`src/pages/NotificationTestPanel.js:368`**

---

## 🎯 Požadovaný Stav - After Fix

### Pattern 1: Axios Instance
```javascript
// BEFORE (❌)
axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/',
});

// AFTER (✅)
axios.create({
  baseURL: process.env.REACT_APP_API2_BASE_URL || '/api.eeo/',
});
```

### Pattern 2: Const Declaration
```javascript
// BEFORE (❌)
const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/';

// AFTER (✅)
const API_BASE_URL = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
```

### Pattern 3: Inline Usage
```javascript
// BEFORE (❌)
fetch(`${process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/'}user/profile`);

// AFTER (✅)
fetch(`${process.env.REACT_APP_API2_BASE_URL || '/api.eeo/'}user/profile`);
```

---

## 🔗 Propojení s PHP API Backend

### Backend ENV Detection (PHP_api.prompt.md):
```php
// apps/eeo-v2/api.php
define('IS_DEV_ENV', strpos($_SERVER['REQUEST_URI'], '/dev/api.eeo') !== false);
define('ENV_NAME', IS_DEV_ENV ? 'DEV' : 'PROD');
```

### Frontend ENV Configuration:
```bash
# DEV - apps/eeo-v2/client/.env
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/

# PROD - apps/eeo-v2/client/.env (budoucnost)
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/
```

### Apache Routing:
```apache
# DEV alias
Alias /dev/api.eeo /var/www/erdms-dev/apps/eeo-v2/api.php

# PROD alias (stávající)
Alias /api.eeo /var/www/erdms-platform/apps/eeo-v2/api.php
```

**Critical Flow:**
1. FE čte `REACT_APP_API2_BASE_URL` z `.env`
2. Volá `https://erdms.zachranka.cz/dev/api.eeo/orders`
3. Apache routuje na `/var/www/erdms-dev/apps/eeo-v2/api.php`
4. PHP detekuje `IS_DEV_ENV = true` (z `/dev/api.eeo` v URI)
5. PHP používá DEV databázi/config

---

## ✅ Testovací Checklist

### Po Refaktoru FE:
```bash
# 1. Verify: Žádné hardcoded URLs
cd /var/www/erdms-dev/apps/eeo-v2/client
grep -r "https://erdms.zachranka.cz/api.eeo" src/
# Expected: 0 matches

# 2. Verify: ENV variable používána
grep -r "REACT_APP_API2_BASE_URL" src/ | wc -l
# Expected: 13+ matches (všechny fixed files)

# 3. Build test
npm run build
# Expected: Success, no errors

# 4. Verify .env
cat .env | grep REACT_APP_API2_BASE_URL
# Expected: REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/
```

### Po Apache DEV Alias:
```bash
# ⚠️ VAROVÁNÍ: curl na HTTPS může trvat dlouho nebo zamrznout
# Raději test v prohlížeči nebo grep config:

# 5. Verify Apache aliases
grep -n "Alias.*dev/eeo-v2\|Alias.*eeo-v2" /etc/apache2/sites-available/erdms.zachranka.cz.conf
# Expected: /dev/eeo-v2 a /eeo-v2 aliasy

# 6. Test DEV API ping (pokud rychlé)
# curl -s https://erdms.zachranka.cz/dev/api.eeo/ping | jq .

# 6. Test PROD API ping (stávající)
curl -s https://erdms.zachranka.cz/api.eeo/ping | jq .

# 7. Verify ENV detection v PHP
curl -s https://erdms.zachranka.cz/dev/api.eeo/ping | jq .env
# Expected: "DEV"

curl -s https://erdms.zachranka.cz/api.eeo/ping | jq .env
# Expected: "PROD"
```

### Po FE .env Update na DEV:
```bash
# 8. Update .env pro DEV
echo "REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/" >> .env

# 9. Restart FE dev server
npm run dev

# 10. Browser test - otevřít Network tab
# - Všechny API calls musí jít na /dev/api.eeo/*
# - Žádný call nesmí jít na /api.eeo/* (PROD)

# 11. Test konkrétní endpoint
curl -X POST https://erdms.zachranka.cz/dev/api.eeo/order-v2/list-enriched \
  -H "Content-Type: application/json" \
  -d '{"filters":{},"limit":10}'
```

---

## 🚨 Rollback Plán

### Pokud něco selže:

```bash
# 1. Git revert FE změn
cd /var/www/erdms-dev/apps/eeo-v2/client
git log --oneline -5
git revert <commit-hash>

# 2. Restore Apache config
sudo cp /etc/apache2/sites-available/eeo.zachranka.cz.conf.backup \
       /etc/apache2/sites-available/eeo.zachranka.cz.conf
sudo systemctl reload apache2

# 3. Restore .env
git checkout .env

# 4. Restart FE
npm run dev

# 5. Verify PROD funguje
curl https://erdms.zachranka.cz/api.eeo/ping
```

---

## 📝 Implementační Kroky (Pořadí)

### Krok 0: Příprava
- [x] Git status clean
- [ ] Branch: `feature/generic-recipient-system`
- [ ] Backup `.env`: `cp .env .env.backup`

### Krok 1: FE Refactor (tento prompt)
- [ ] Fix 13 souborů: hardcoded URL → relativní fallback
- [ ] Grep verify: 0 hardcoded URLs
- [ ] `npm run build` - test OK
- [ ] Git commit: `refactor(fe): Remove hardcoded API URLs, use env variable`

### Krok 2: PHP ENV Constants
- [ ] Add to `api.php`: `IS_DEV_ENV`, `ENV_NAME`
- [ ] Git commit: `feat(api): Add ENV detection constants`

### Krok 3: Apache Backup + DEV Alias
- [ ] Backup: `sudo cp eeo.zachranka.cz.conf eeo.zachranka.cz.conf.backup`
- [ ] Add DEV alias: `Alias /dev/api.eeo ...`
- [ ] `sudo systemctl reload apache2`
- [ ] Test: `curl https://erdms.zachranka.cz/dev/api.eeo/ping`

### Krok 4: FE .env Update
- [ ] Change: `REACT_APP_API2_BASE_URL=.../dev/api.eeo/`
- [ ] Restart: `npm run dev`
- [ ] Browser test: všechny calls na `/dev/api.eeo/*`

### Krok 5: Validace
- [ ] DEV API funguje
- [ ] PROD API funguje (nezměněno)
- [ ] FE volá správný endpoint (DEV)
- [ ] PHP detekuje ENV správně

---

## 🔐 Security Notes

### .env File:
- **NEVER commit** `.env` to git
- Always use `.env.example` for templates
- Different `.env` for DEV vs PROD

### API Keys (budoucnost):
```bash
# .env
REACT_APP_AZURE_CLIENT_ID=xxx
REACT_APP_AZURE_TENANT_ID=xxx
# Tyto NIKDY do kódu!
```

---

## 📚 Reference Files

### Related Prompts:
- `PHP_api.prompt.md` - Backend ENV detection a konstanty
- `PLAN_CONFIG_CENTRALIZATION.md` - Celková architektura DEV/PROD

### Config Files:
- `.env` - Current FE environment config
- `.env.example` - Template pro nové environment
- `apps/eeo-v2/api.php` - PHP constants a ENV detection
- `/etc/apache2/sites-available/eeo.zachranka.cz.conf` - Apache routing

### Key Endpoints:
- `/api.eeo/ping` - PROD health check
- `/dev/api.eeo/ping` - DEV health check
- `/api.eeo/order-v2/list-enriched` - Test endpoint

---

## 💡 Pro AI Asistenta

### Při fixu souborů používej:
```javascript
// Multi-replace pattern pro všech 13 souborů:
OLD: process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/'
NEW: process.env.REACT_APP_API2_BASE_URL || '/api.eeo/'

// Preserve context (3-5 lines before/after)
// Use multi_replace_string_in_file pro efficiency
```

### Validace po fixu:
```bash
# Must return 0:
grep -r "https://erdms.zachranka.cz/api.eeo" src/ | wc -l

# Must return 13+:
grep -r "REACT_APP_API2_BASE_URL.*'/api.eeo/'" src/ | wc -l
```

---

**Status:** 🟡 Ready for Implementation  
**Next Action:** Execute Krok 1 - FE Refactor (fix 13 files)  
**Blocker:** None  
**Risk Level:** LOW (pure refactor, no logic change)

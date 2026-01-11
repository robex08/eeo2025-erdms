# CHANGELOG - DEV/PROD Separation Implementation

**Datum:** 20. prosince 2025  
**Branch:** `feature/generic-recipient-system`  
**Commits:** `bff18dd`, `94bc6c8`, `843c8c3`, `9a762ef`

---

## 🎯 Cíl

Umožnit **paralelní provoz DEV a PROD prostředí** na stejném serveru s plnou separací:
- Frontend build odděleně
- API volání na různé endpointy
- PHP ENV detection pro budoucí databázovou separaci

---

## ✅ Implementované změny

### 1. Frontend - Odstranění hardcoded URLs (`bff18dd`)

**Soubory:** 11 services + 3 komponenty (13 lokací celkem)

**Změna:**
```javascript
// PŘED ❌
const API_BASE = process.env.REACT_APP_API2_BASE_URL || 'https://erdms.zachranka.cz/api.eeo/';

// PO ✅
const API_BASE = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
```

**Důvod:**
- Hardcoded absolute URLs blokují DEV/PROD separaci
- ENV variable má prioritu, fallback je relativní
- Umožňuje změnu prostředí pouze přes `.env`

**Affected files:**
- `src/components/UniversalSearch/EntityDetailViews.js`
- `src/services/userSettingsApi.js`
- `src/services/backgroundTasks.js`
- `src/services/apiSmlouvy.js`
- `src/services/apiUniversalSearch.js`
- `src/services/apiEntityDetail.js`
- `src/services/cashbookService.js`
- `src/services/api2auth.js` (2x)
- `src/services/apiv2Dictionaries.js`
- `src/pages/ProfilePage.js`
- `src/pages/NotificationTestPanel.js` (2x)

**Validace:**
```bash
grep -r "https://erdms.zachranka.cz/api.eeo" src/
# Result: 0 matches ✅
```

---

### 2. PHP API - ENV Detection (`843c8c3`)

**Soubor:** `apps/eeo-v2/api-legacy/api.eeo/api.php`

**Přidáno:**
```php
// ============ ENV DETECTION ============
define('IS_DEV_ENV', strpos($_SERVER['REQUEST_URI'], '/dev/api.eeo') !== false);
define('ENV_NAME', IS_DEV_ENV ? 'DEV' : 'PROD');
```

**Důvod:**
- Detekce prostředí na základě URL
- Umožňuje ENV-specific logiku (databáze, konfigurace)
- Použitelné v celé PHP aplikaci

**Použití:**
```php
if (IS_DEV_ENV) {
    // DEV-specific behavior
    $db_host = 'localhost:3307';  // DEV databáze
} else {
    // PROD-specific behavior
    $db_host = 'localhost:3306';  // PROD databáze
}
```

---

### 3. Apache Configuration - DEV Aliases

**Soubor:** `/etc/apache2/sites-available/erdms.zachranka.cz.conf`

**Přidáno:**
```apache
# DEV Frontend
Alias /dev/eeo-v2 /var/www/erdms-dev/apps/eeo-v2/client/build

# DEV API
Alias /dev/api.eeo /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo
```

**Struktura:**
```
DEV:  /dev/eeo-v2/  → /var/www/erdms-dev/.../build
      /dev/api.eeo/ → /var/www/erdms-dev/.../api.eeo

PROD: /eeo-v2/      → /var/www/erdms-platform/.../build (budoucnost)
      /api.eeo/     → /var/www/erdms-platform/.../api.eeo (budoucnost)
```

**Backup:**
```bash
/etc/apache2/sites-available/erdms.zachranka.cz.conf.backup-20251220-2103
```

---

### 4. Frontend ENV Configuration

**Soubor:** `apps/eeo-v2/client/.env`

**Změněno:**
```bash
# PŘED (PROD)
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/

# PO (DEV)
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/
```

**Backup:**
```bash
apps/eeo-v2/client/.env.backup-20251220-2103
```

---

### 5. UI - API Endpoint Indicator (`9a762ef`)

**Soubor:** `src/components/Layout.js`

**Přidáno do footeru:**
```jsx
{' | '}
<span style={{ 
  fontFamily: 'monospace', 
  fontSize: '0.85em',
  color: apiUrl.includes('/dev/') ? '#fbbf24' : '#94a3b8',
  fontWeight: apiUrl.includes('/dev/') ? '600' : '400'
}}>
  {apiUrl.includes('/dev/') ? '/dev/api.eeo' : '/api.eeo'}
</span>
```

**Výsledek:**
- Footer zobrazuje: `© ... | verze 1.90 | /dev/api.eeo`
- DEV endpoint má **žlutou barvu** (#fbbf24)
- PROD endpoint má šedou barvu (#94a3b8)
- **Okamžitá vizuální identifikace** prostředí

---

## 🧪 Validace

### ✅ DEV Environment
```bash
URL:  https://erdms.zachranka.cz/dev/eeo-v2/
API:  https://erdms.zachranka.cz/dev/api.eeo/
PHP:  IS_DEV_ENV = true, ENV_NAME = 'DEV'
UI:   Footer zobrazuje "/dev/api.eeo" (žlutě)
```

### ✅ PROD Environment (současný stav)
```bash
URL:  https://erdms.zachranka.cz/eeo-v2/
API:  https://erdms.zachranka.cz/api.eeo/
PHP:  IS_DEV_ENV = false, ENV_NAME = 'PROD'
UI:   Footer zobrazuje "/api.eeo" (šedě)
```

### ✅ Build Tests
```bash
# DEV build
npm run build:dev
# Result: PUBLIC_URL=/dev/eeo-v2/ ✅

# PROD build (fallback)
npm run build
# Result: PUBLIC_URL=/eeo-v2/ ✅
```

### ✅ Git Status
```bash
Branch: feature/generic-recipient-system
Commits: 4 nové (pushed)
- bff18dd: refactor(fe): Remove hardcoded API URLs
- 94bc6c8: docs: Update FE_EEO_refactor prompt
- 843c8c3: feat(api): Add ENV detection constants
- 9a762ef: feat(ui): Show API endpoint in footer
```

---

## 📋 Co to umožňuje

### ✅ Okamžité přínosy
1. **Paralelní DEV/PROD** - testování změn bez ovlivnění produkce
2. **Vizuální identifikace** - okamžitě vidíš ve kterém prostředí pracuješ
3. **Bezpečné experimenty** - DEV je izolované
4. **Git workflow** - commit/push bez strachu z produkce

### 🔮 Budoucí možnosti
1. **Databázová separace** - DEV na `:3307`, PROD na `:3306`
2. **Testovací data** - DEV s bezpečnými daty
3. **Feature branching** - každý branch = svoje DEV prostředí
4. **Staging environment** - třetí prostředí mezi DEV/PROD

---

## 🔐 Zabezpečení

### ✅ Co je chráněno
- `.env` soubory **nejsou v gitu** (gitignore)
- Apache config má **backup** před každou změnou
- PHP ENV detection je **read-only** (constants)
- Git history zachována (rollback možný)

### ⚠️ Co sledovat
- `.env` změny **vyžadují restart** dev serveru
- Apache změny **vyžadují reload** (`systemctl reload apache2`)
- Build DEV/PROD musí použít **správný script** (`build:dev` vs `build`)

---

## 📚 Reference

### Prompty
- `.github/prompts/FE_EEO_refactor.prompt.md` - Frontend refactor guide
- `.github/prompts/PHP_api.prompt.md` - Backend ENV detection

### Config Files
- `apps/eeo-v2/client/.env` - Frontend environment config
- `apps/eeo-v2/client/package.json` - Build scripts (`build:dev`)
- `/etc/apache2/sites-available/erdms.zachranka.cz.conf` - Apache routing

### Key Files Changed
- Frontend: 13 files (services + components)
- Backend: 1 file (api.php)
- Config: 2 files (.env, apache conf)

---

## 🎓 Lessons Learned

### ✅ Co fungovalo dobře
1. **Postupný přístup** - krok po kroku, s validací
2. **Git zálohy** - před každou kritickou změnou
3. **Fallback values** - relativní místo hardcoded absolute
4. **Vizuální feedback** - footer ukazuje prostředí

### 📝 Co by se dalo zlepšit
1. **Automatizace** - script pro switch DEV/PROD
2. **ENV file management** - `.env.dev` vs `.env.prod` templates
3. **Apache restart detection** - notifikace když je potřeba reload

---

## 🚀 Next Steps

### Možné další kroky
1. **Database separation** - DEV/PROD databáze
2. **User permissions** - DEV environment jen pro vývojáře
3. **API versioning** - `/dev/api.eeo/v2/` vs `/api.eeo/v2/`
4. **Monitoring** - sledování DEV vs PROD usage

---

**Status:** ✅ **COMPLETED**  
**Risk Level:** LOW (pure infrastructure, no logic changes)  
**Rollback:** Možný pomocí git revert + apache backup restore  
**Production Impact:** ❌ NONE (PROD nezměněno, pouze DEV přidáno)

---

_Dokumentováno: 20. prosince 2025_  
_Autor: Robert Holovský_  
_Reviewed: AI Assistant (Claude Sonnet 4.5)_

````prompt
---
agent: agent
name: BUILD-EEOv2
priority: LOW
---

# BUILD-EEOv2 - React Build Process pro DEV/PROD oddělení

**Oblast:** Build proces, Environment variables, Build separation  
**Datum vytvoření:** 30.12.2024  
**Poslední update:** 30.12.2025  
**Status:** ✅ VYŘEŠENO + UPGRADED

---

## 🆕 UPDATE 30.12.2025 - Build Separation

### ✅ Vyřešený problém: Separace DEV a PRODUCTION buildů

**Nové řešení:**
- **DEV build** → `build-dev/` (používá DEV API)
- **PRODUCTION build** → `build/` (používá PRODUCTION API)

### 📦 Nové build příkazy:

```bash
# DEV build (testovací server)
npm run build:dev
# → Výstup: build-dev/
# → API: https://erdms.zachranka.cz/dev/api.eeo/
# → Public URL: /dev/eeo-v2

# PRODUCTION build (ostrá verze)
npm run build:prod
# → Výstup: build/
# → API: https://erdms.zachranka.cz/api.eeo/
# → Public URL: /eeo-v2

# Default build (= PRODUCTION)
npm run build
# → Výstup: build/
```

### 📂 Struktura:
```
apps/eeo-v2/client/
├── build/              ← PRODUCTION build
├── build-dev/          ← DEV build
├── .env.production     ← Config pro PRODUCTION
├── .env.development    ← Config pro DEV
└── BUILD_SEPARATION.md ← Detailní dokumentace
```

### ✅ Výhody nového řešení:
1. **Žádné konflikty** - DEV a PROD buildy v oddělených složkách
2. **Jasné příkazy** - `build:dev` vs `build:prod`
3. **Bezpečné** - nelze přepsat PROD build DEV buildem
4. **Jednoduché** - automatická správa ENV proměnných

---

## 📋 Původní Problém (vyřešeno 30.12.2024)

DEV build (`npm run build:dev`) generoval build, který v prohlížeči volal **production API endpoint** (`/api.eeo`) místo development endpointu (`/dev/api.eeo`).

### Symptomy:
- ✅ Build soubory obsahovaly správnou URL (`dev/api.eeo`)
- ❌ Footer v prohlížeči zobrazoval špatnou URL (`/api.eeo`)
- ❌ Network volání šly na production endpoint místo dev
- ⚠️ Problém persistoval i po kompletním rebuildu a Apache restartu

---

## 🔍 Root Cause

### Jak React/CRA načítá environment variables při buildu:

**KRITICKÉ:** React buildy (`npm run build`) **VŽDY** čtou `.env.production`, **NE** `.env.development`!

```bash
# ❌ TOTO NEFUNGUJE pro načtení .env.development:
NODE_ENV=development npm run build
```

**Důvod:**
- `NODE_ENV=development` ovlivňuje pouze **webpack chování** (source maps, optimalizace)
- `.env.development` se načítá **POUZE** při `npm start` (dev server)
- `.env.production` se načítá **VŽDY** při `npm run build` (production build)

### Stav před opravou:

**`.env.production`:**
```bash
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/  # ❌ Production URL
```

**`.env.development`:**
```bash
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/  # ✅ Dev URL (NEPOUŽITO při buildu!)
```

**`package.json`:**
```json
{
  "scripts": {
    "build:dev": "cross-env NODE_ENV=development PUBLIC_URL=/dev/eeo-v2 NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build"
    // ❌ Chybí REACT_APP_API2_BASE_URL - použije se hodnota z .env.production
  }
}
```

---

## ✅ Řešení

Explicitně nastavit `REACT_APP_API2_BASE_URL` v build scriptu pomocí `cross-env`:

### Opravený `package.json`:

```json
{
  "scripts": {
    "build:dev": "cross-env NODE_ENV=development REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/ PUBLIC_URL=/dev/eeo-v2 NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build",
    "build": "cross-env NODE_ENV=production PUBLIC_URL=/eeo-v2 NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build"
  }
}
```

### Proč to funguje:

1. Environment variables nastavené v CLI mají **nejvyšší prioritu**
2. Přepíší hodnoty z `.env.production`
3. React je zabuduje do build bundlu při compile time

---

## 🎯 Kde se API URL používá

Footer komponenta v `src/components/Layout.js` (řádek ~3546):

```javascript
<FooterCenter>
  <span style={{ display: 'block', textAlign: 'center', lineHeight: '1.5' }}>
    © {process.env.REACT_APP_FOOTER_OWNER || '2025 ZZS SK, p.o., Robert Holovský'} | verze {process.env.REACT_APP_VERSION}
    {' | '}
    <span style={{ 
      fontFamily: 'monospace', 
      fontSize: '0.85em',
      color: (process.env.REACT_APP_API2_BASE_URL || '').includes('/dev/') ? '#ff6b6b' : '#94a3b8',
      fontWeight: (process.env.REACT_APP_API2_BASE_URL || '').includes('/dev/') ? '700' : '400'
    }}>
      {(() => {
        const apiUrl = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
        return apiUrl.includes('/dev/') ? '/dev/api.eeo' : '/api.eeo';
      })()}
    </span>
  </span>
</FooterCenter>
```

---

## 📝 Build proces - kompletní workflow

### DEV Build:
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
rm -rf build node_modules/.cache
npm run build:dev
systemctl restart apache2
```

### PROD Build:
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
rm -rf build node_modules/.cache
npm run build
systemctl restart apache2
```

### Verifikace buildu:
```bash
# Zkontrolovat, že build obsahuje správnou URL:
cd build
grep -r "dev/api.eeo" static/js/main.*.js | wc -l  # Mělo by být 1 pro DEV
grep -r "[^/]api\.eeo" static/js/main.*.js | grep -v "dev/api" | wc -l  # Mělo by být 0 pro DEV
```

---

## ⚙️ Environment Variables Reference

### Produkce (`/eeo-v2`):
- `NODE_ENV=production`
- `PUBLIC_URL=/eeo-v2`
- `REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/`

### Development (`/dev/eeo-v2`):
- `NODE_ENV=development` (pro webpack optimalizace)
- `PUBLIC_URL=/dev/eeo-v2`
- `REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/` ← **MUSÍ být explicitně v CLI**

---

## 🚨 Časté chyby

### ❌ Špatně:
```json
"build:dev": "cross-env NODE_ENV=development PUBLIC_URL=/dev/eeo-v2 npm run build"
```
**Problém:** Chybí `REACT_APP_API2_BASE_URL`, použije se hodnota z `.env.production`

### ❌ Špatně:
```bash
# Spoléhání na .env.development při buildu
NODE_ENV=development npm run build
```
**Problém:** `.env.development` se NEČTE při `npm run build`

### ✅ Správně:
```json
"build:dev": "cross-env NODE_ENV=development REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/ PUBLIC_URL=/dev/eeo-v2 npm run build"
```

---

## 📚 Related

- **Create React App ENV docs:** https://create-react-app.dev/docs/adding-custom-environment-variables/
- **cross-env package:** https://www.npmjs.com/package/cross-env
- Footer komponenta: `src/components/Layout.js`
- Package.json: `/var/www/erdms-dev/apps/eeo-v2/client/package.json`

---

## 🎓 Poznámky

1. **Runtime vs Build-time:** Environment variables jsou **zabudované do bundlu při compile time**, ne runtime!
2. **Browser nemá přístup:** `process.env.*` hodnoty jsou nahrazeny stringy během buildu
3. **Cache:** Po změně env vars vždy smazat `build/` a `node_modules/.cache/`
4. **Apache restart:** Nutný po každém novém buildu, aby servíroval nové soubory

---

## ⚠️ Deployment Pitfalls (30.12.2025)

### 🔴 KRITICKÉ: rsync --delete smazal API složku

**Problém:**
```bash
# ❌ NIKDY TAKTO:
rsync -av --delete /path/to/build/ /var/www/erdms-platform/apps/eeo-v2/
```
- `--delete` smazal **celou složku** `/var/www/erdms-platform/apps/eeo-v2/api-legacy/`
- API přestalo fungovat, 404 errory
- Museli jsme obnovit celé API z DEV

**Řešení:**
```bash
# ✅ SPRÁVNĚ - vynechat api-legacy:
rsync -av --exclude='api-legacy' /path/to/build/ /var/www/erdms-platform/apps/eeo-v2/
```

---

### 🔴 KRITICKÉ: .htaccess v api-legacy/ způsobuje 500

**Problém:**
- Soubor `/var/www/.../apps/eeo-v2/api-legacy/.htaccess` obsahoval:
  ```apache
  php_flag display_errors Off
  php_flag log_errors On
  php_value error_log /tmp/php_errors.log
  php_value error_reporting E_ALL
  ```
- **PHP-FPM IGNORUJE `php_flag` a `php_value` v .htaccess!**
- Způsobovalo 500 Internal Server Error na všech API calls

**Řešení:**
```bash
# Smazat tento .htaccess:
rm /var/www/.../apps/eeo-v2/api-legacy/.htaccess

# Správný .htaccess je pouze zde:
/var/www/.../apps/eeo-v2/api-legacy/api.eeo/.htaccess  # ← Rewrite rules pro API
```

**Struktura .htaccess:**
- ❌ `/apps/eeo-v2/api-legacy/.htaccess` - **NESMÍ existovat** (PHP config)
- ✅ `/apps/eeo-v2/api-legacy/api.eeo/.htaccess` - **MUSÍ existovat** (Rewrite rules)

---

### 🟡 Apache DirectoryIndex

**Problém:**
- Apache config měl `DirectoryIndex index.php`
- Rewrite rules v `.htaccess` používají `api.php`
- Konflikt způsoboval 500 errory

**Řešení:**
```apache
# /etc/apache2/sites-enabled/erdms.zachranka.cz.conf
<Directory /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo>
    DirectoryIndex api.php  # ← Musí odpovídat RewriteRule
    AllowOverride All
</Directory>
```

---

### 🟡 DEV vs PROD struktura

**DEV:**
```
/var/www/erdms-dev/apps/eeo-v2/
├── client/
│   └── build/           ← DEV build se servíruje ODTUD
└── api-legacy/
    └── api.eeo/
        └── .env         ← DB_NAME=eeo2025-dev
```

**PROD:**
```
/var/www/erdms-platform/apps/eeo-v2/
├── index.html           ← PROD build se kopíruje SEM (root)
├── static/
└── api-legacy/
    └── api.eeo/
        └── .env         ← DB_NAME=eeo2025
```

**DŮLEŽITÉ:**
- DEV build se **NEPŘESOUVÁ** - zůstává v `client/build/`
- PROD build se **KOPÍRUJE** do root složky `/var/www/erdms-platform/apps/eeo-v2/`

---

## 📝 Deployment Checklist

### DEV Build:
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
rm -rf build node_modules/.cache
npm run build:dev
# Build zůstává v client/build/ - nepřesouvat!
systemctl restart apache2
```

### PROD Build:
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
rm -rf build node_modules/.cache
npm run build
rsync -av --exclude='api-legacy' build/ /var/www/erdms-platform/apps/eeo-v2/
systemctl restart apache2
```

### Verifikace buildu:
```bash
# DEV - mělo by obsahovat /dev/api.eeo/:
grep -o "REACT_APP_API2_BASE_URL:\"[^\"]*\"" \
  /var/www/erdms-dev/apps/eeo-v2/client/build/static/js/main.*.js

# PROD - mělo by obsahovat /api.eeo/:
grep -o "REACT_APP_API2_BASE_URL:\"[^\"]*\"" \
  /var/www/erdms-platform/apps/eeo-v2/static/js/main.*.js
```

---

**Status:** ✅ VYŘEŠENO (30.12.2024)  
**Updated:** 30.12.2025 - Doplněny deployment pitfalls  
**Testováno:** DEV i PROD buildy fungují správně

````

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
**Status:** ✅ KOMPLETNÍ ŘEŠENÍ

---

## 🆕 UPDATE 30.12.2025 - Finální Build Separace

### ✅ Kompletní řešení: DEV a PROD buildy

**Struktura:**
- **DEV build** → `build/` (zůstává na místě, Apache Alias)
- **PROD build** → `build-prod/` (kopíruje se do erdms-platform)

### 📦 Build příkazy:

```bash
# DEV build (testovací server)
npm run build:dev:explicit
# → Výstup: build/
# → API: https://erdms.zachranka.cz/dev/api.eeo/
# → Public URL: /dev/eeo-v2
# → DB: eeo2025-dev
# → Deploy: AUTOMATICKÝ (Apache Alias)

# PROD build (ostrá verze)
npm run build:prod
# → Výstup: build-prod/
# → API: https://erdms.zachranka.cz/api.eeo/
# → Public URL: /eeo-v2
# → DB: eeo2025
# → Deploy: MANUÁLNÍ (kopírování)
```

### 📂 Struktura adresářů:

```
DEV:
/var/www/erdms-dev/apps/eeo-v2/
├── client/build/              # DEV frontend (Apache: /dev/eeo-v2)
└── api-legacy/api.eeo/.env    # DB: eeo2025-dev

PROD:
/var/www/erdms-platform/apps/eeo-v2/
├── static/                    # PROD frontend (Apache: /eeo-v2)
├── index.html
└── api-legacy/api.eeo/.env    # DB: eeo2025
```

### 🚀 Deploy PROD (kompletní):

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client && \
npm run build:prod && \
cp -r build-prod/* /var/www/erdms-platform/apps/eeo-v2/ && \
cp -r /var/www/erdms-dev/apps/eeo-v2/api-legacy /var/www/erdms-platform/apps/eeo-v2/ && \
cat > /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env << 'EOF'
# PROD Environment
DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=eeo2025
DB_USER=erdms_user
DB_PASSWORD=AhchohTahnoh7eim
DB_CHARSET=utf8mb4
REACT_APP_VERSION=1.92c
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
MANUALS_PATH=/var/www/erdms-platform/data/eeo-v2/manualy/
EOF
mkdir -p /var/www/erdms-platform/data/eeo-v2/manualy && \
cp -r /var/www/erdms-data/eeo-v2/manualy/* /var/www/erdms-platform/data/eeo-v2/manualy/ && \
systemctl reload apache2 && \
echo "✅ PROD deploy kompletní!"
```

### ⚠️ KRITICKÉ PRAVIDLA:

**❌ NIKDY:**
- Nekopírovat DEV build nikam
- Nekopírovat DEV .env do PROD
- Nezaměnit databáze: DEV=`eeo2025-dev`, PROD=`eeo2025`

**✅ VŽDY:**
- Po kopírování API legacy VŽDY opravit PROD .env
- Zkontrolovat DB v .env před reloadem Apache
- Testovat DEV před PROD deployem

---

## 📋 Package.json Scripts:

```json
{
  "scripts": {
    "build:dev:explicit": "REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/ PUBLIC_URL=/dev/eeo-v2 BUILD_PATH=build NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build",
    "build:prod": "NODE_ENV=production BUILD_PATH=build-prod PUBLIC_URL=/eeo-v2 NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build"
  }
}
```

---

## 🔍 Troubleshooting

### PROD používá DEV databázi

```bash
# Zkontroluj .env
cat /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | grep DB_NAME
# Mělo by být: DB_NAME=eeo2025

# Oprav .env (viz deploy příkaz výše)
```

### DEV nefunguje

```bash
# Vyčisti cache
cd /var/www/erdms-dev/apps/eeo-v2/client
rm -rf node_modules/.cache build

# Znovu build
npm run build:dev:explicit
```

---

## 📚 Dokumentace

**Hlavní dokument:** `/var/www/erdms-dev/BUILD.md`

---

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

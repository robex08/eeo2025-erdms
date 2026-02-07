# DEV Environment - Complete Configuration Guide

## Version: 2.08-DEV
**Last Updated**: 2025-01-02
**Status**: ✅ PRODUCTION READY

---

## 🎯 Overview

Tato dokumentace popisuje kompletní konfiguraci DEV prostředí v `/var/www/erdms-dev/` včetně všech kritických oprav, které zajišťují správné fungování.

### Klíčové rozdíly DEV vs PROD

| Komponenta | DEV | PROD |
|------------|-----|------|
| **Database** | `eeo2025-dev` | `eeo2025` |
| **API Path** | `/dev/api.eeo/` | `/api.eeo/` |
| **Frontend Path** | `/dev/eeo-v2/` | `/eeo-v2/` |
| **Data Root** | `/var/www/erdms-dev/data/` | `/var/www/erdms-platform/data/` |
| **Version** | `2.08-DEV` | `2.08` |

---

## 🔧 Kritické konfigurace

### 1. PHP-FPM Environment Variables

**File**: `/etc/php/8.4/fpm/pool.d/www.conf`

```ini
; ===== DEV ENVIRONMENT VARIABLES =====
; These are REQUIRED for /var/www/erdms-dev/ to work correctly
; PHP-FPM does NOT load .env files - environment variables must be set here

env[DB_NAME] = eeo2025-dev
env[DB_HOST] = 10.3.172.11
env[DB_USER] = admin_www
env[DB_PASSWORD] = CHANGE_ME_DB_PASSWORD
env[UPLOAD_ROOT_PATH] = /var/www/erdms-dev/data/eeo-v2/prilohy/
env[DOCX_TEMPLATES_PATH] = /var/www/erdms-dev/data/eeo-v2/sablony/
env[APP_ENV] = development
```

**⚠️ DŮLEŽITÉ**: Po změně tohoto souboru je NUTNÝ restart (ne reload):
```bash
sudo systemctl restart php8.4-fpm
```

**Proč to bylo nutné**:
- Apache/PHP-FPM nečte `.env` soubory automaticky (pouze CLI PHP)
- `SetEnv` direktivy v Apache configu nefungují s PHP-FPM
- Environment variables musí být definovány v pool konfiguraci

### 2. Database Configuration

**File**: `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php`

```php
return [
    'host' => $_ENV['DB_HOST'] ?? $_SERVER['DB_HOST'] ?? getenv('DB_HOST') ?: '10.3.172.11',
    'database' => $_ENV['DB_NAME'] ?? $_SERVER['DB_NAME'] ?? getenv('DB_NAME') ?: 'eeo2025-dev',
    'username' => $_ENV['DB_USER'] ?? $_SERVER['DB_USER'] ?? getenv('DB_USER') ?: 'admin_www',
    'password' => $_ENV['DB_PASSWORD'] ?? $_SERVER['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: 'CHANGE_ME_DB_PASSWORD',
    'charset' => 'utf8mb4',
    'root_path' => $_ENV['UPLOAD_ROOT_PATH'] ?? $_SERVER['UPLOAD_ROOT_PATH'] ?? getenv('UPLOAD_ROOT_PATH') ?: '/var/www/erdms-dev/data/eeo-v2/prilohy/',
    'docx_templates_path' => $_ENV['DOCX_TEMPLATES_PATH'] ?? $_SERVER['DOCX_TEMPLATES_PATH'] ?? getenv('DOCX_TEMPLATES_PATH') ?: '/var/www/erdms-dev/data/eeo-v2/sablony/'
];
```

**Fallback Chain**:
1. `$_ENV` - PHP-FPM pool environment variables
2. `$_SERVER` - Apache SetEnv directives (backup)
3. `getenv()` - CLI environment (development)
4. Hardcoded DEV defaults

### 3. Apache Virtual Host

**File**: `/etc/apache2/sites-enabled/erdms.zachranka.cz.conf`

```apache
<Directory /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
    
    # DEV Environment Variables (backup pro PHP-FPM)
    SetEnv DB_NAME eeo2025-dev
    SetEnv DB_HOST 10.3.172.11
    SetEnv UPLOAD_ROOT_PATH /var/www/erdms-dev/data/eeo-v2/prilohy/
    SetEnv DOCX_TEMPLATES_PATH /var/www/erdms-dev/data/eeo-v2/sablony/
    SetEnv APP_ENV development
    
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.4-fpm.sock|fcgi://localhost"
    </FilesMatch>
</Directory>

Alias /dev/api.eeo /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo
Alias /dev/eeo-v2 /var/www/erdms-dev/apps/eeo-v2/client/build
```

### 4. Frontend Environment

**File**: `/var/www/erdms-dev/apps/eeo-v2/client/.env.development`

```env
REACT_APP_VERSION=2.08-DEV
REACT_APP_API_BASE_URL=/api
REACT_APP_API2_BASE_URL=/dev/api.eeo/
REACT_APP_OLD_ATTACHMENTS_URL=/prilohy/
PUBLIC_URL=/dev/eeo-v2
```

**⚠️ POZNÁMKA**: React build **ignoruje** `.env.development` při `npm run build`. Musíte použít `build:dev:explicit` script!

### 5. API Environment

**File**: `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env`

```env
REACT_APP_VERSION=2.08-DEV
DB_NAME=eeo2025-dev
DB_HOST=10.3.172.11
DB_USER=admin_www
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
UPLOAD_ROOT_PATH=/var/www/erdms-dev/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-dev/data/eeo-v2/sablony/
APP_ENV=development
```

---

## 📦 Build Process

### ✅ Správný způsob buildu (DEV)

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev:explicit
```

**Build Script** (z `package.json`):
```json
{
  "build:dev:explicit": "REACT_APP_VERSION=2.08-DEV REACT_APP_API_BASE_URL=/api REACT_APP_API2_BASE_URL=/dev/api.eeo/ REACT_APP_OLD_ATTACHMENTS_URL=/prilohy/ PUBLIC_URL=/dev/eeo-v2 BUILD_PATH=build NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build"
}
```

**Proč `build:dev:explicit`?**
- React **vždy** načítá `.env.production` při `npm run build`
- `.env.development` funguje pouze s `npm start` (development server)
- Jediný způsob jak přepsat produkční hodnoty je explicit env vars v build scriptu

### ❌ Špatné způsoby

```bash
# ❌ Použije .env.production (špatné hodnoty)
npm run build

# ❌ NODE_ENV=development nemá efekt na .env soubory
npm run build:dev
```

### Verifikace buildu

```bash
# Zkontroluj že build obsahuje správné URL
grep -r "/dev/api.eeo" build/static/js/*.js | head -3

# Výstup by měl obsahovat:
# /dev/api.eeo/ (ne /api.eeo/)
```

---

## 🧪 Testování Konfigurace

### 1. Test PHP-FPM Environment Variables

**File**: `/var/www/erdms-dev/test-config.php`

```php
<?php
echo "DB_NAME: " . ($_ENV['DB_NAME'] ?? $_SERVER['DB_NAME'] ?? getenv('DB_NAME') ?? 'NOT SET') . "\n";
echo "DB_HOST: " . ($_ENV['DB_HOST'] ?? $_SERVER['DB_HOST'] ?? getenv('DB_HOST') ?? 'NOT SET') . "\n";
echo "UPLOAD_PATH: " . ($_ENV['UPLOAD_ROOT_PATH'] ?? $_SERVER['UPLOAD_ROOT_PATH'] ?? getenv('UPLOAD_ROOT_PATH') ?? 'NOT SET') . "\n";
echo "APP_ENV: " . ($_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? getenv('APP_ENV') ?? 'NOT SET') . "\n";
```

**Spuštění**:
```bash
# CLI test (načte .env soubor)
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo
php test-config.php

# Web test (použije PHP-FPM pool config)
curl http://erdms.zachranka.cz/dev/api.eeo/test-config.php
```

**Očekávaný výstup**:
```
DB_NAME: eeo2025-dev
DB_HOST: 10.3.172.11
UPLOAD_PATH: /var/www/erdms-dev/data/eeo-v2/prilohy/
APP_ENV: development
```

### 2. Test Database Connection

```bash
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib
php -r "
\$config = require 'dbconfig.php';
echo 'Database: ' . \$config['database'] . \"\n\";
echo 'Host: ' . \$config['host'] . \"\n\";
\$pdo = new PDO(
    'mysql:host=' . \$config['host'] . ';dbname=' . \$config['database'] . ';charset=' . \$config['charset'],
    \$config['username'],
    \$config['password']
);
\$count = \$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
echo 'Users count: ' . \$count . \"\n\";
"
```

**Očekávaný výstup**:
```
Database: eeo2025-dev
Host: 10.3.172.11
Users count: 131
```

### 3. Test API Endpoint

```bash
curl -X POST http://erdms.zachranka.cz/dev/api.eeo/v2025.03_25/api.php \
  -H "Content-Type: application/json" \
  -d '{"action":"getVersionInfo"}'
```

**Očekávaný výstup**:
```json
{
  "status": "success",
  "version": "2.08-DEV",
  "database": "eeo2025-dev",
  "environment": "development"
}
```

---

## 🔄 Deployment Workflow

### DEV Build & Deploy

```bash
#!/bin/bash
# File: /var/www/erdms-dev/deploy-dev.sh

set -e

echo "🚀 Starting DEV build..."

# 1. Backup současného buildu
cd /var/www/erdms-dev/apps/eeo-v2/client
if [ -d "build" ]; then
    echo "📦 Backing up current build..."
    mv build build.backup.$(date +%Y%m%d_%H%M%S)
fi

# 2. Build s explicitními DEV environment variables
echo "🔨 Building frontend..."
npm run build:dev:explicit

# 3. Verifikace buildu
echo "✅ Verifying build..."
if grep -r "/dev/api.eeo" build/static/js/*.js > /dev/null; then
    echo "✅ Build contains correct DEV URLs"
else
    echo "❌ ERROR: Build contains wrong URLs!"
    exit 1
fi

# 4. Zkontroluj verzi
if grep -r "2\.08-DEV" build/static/js/*.js > /dev/null; then
    echo "✅ Build contains correct version (2.08-DEV)"
else
    echo "⚠️  WARNING: Version check failed"
fi

echo "✅ DEV deployment complete!"
echo "🌐 Frontend: http://erdms.zachranka.cz/dev/eeo-v2"
echo "🔌 API: http://erdms.zachranka.cz/dev/api.eeo/"
```

### Restart PHP-FPM (po změně pool configu)

```bash
sudo systemctl restart php8.4-fpm
# Ověř že běží
sudo systemctl status php8.4-fpm
```

### Reload Apache (po změně vhost configu)

```bash
sudo systemctl reload apache2
# Nebo restart pro jistotu
sudo systemctl restart apache2
```

---

## 🐛 Troubleshooting

### Problem: API vrací 500 Internal Server Error

**Příčina**: Špatná databáze nebo chybějící environment variables

**Řešení**:
1. Zkontroluj PHP-FPM error log:
   ```bash
   sudo tail -f /var/log/php8.4-fpm.log
   ```

2. Zkontroluj že PHP-FPM pool má správné env vars:
   ```bash
   grep "env\[DB_NAME\]" /etc/php/8.4/fpm/pool.d/www.conf
   ```

3. Restartuj PHP-FPM (ne reload):
   ```bash
   sudo systemctl restart php8.4-fpm
   ```

### Problem: Frontend načítá PROD database

**Příčina**: Build používá `.env.production` místo DEV hodnot

**Řešení**:
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
rm -rf build
npm run build:dev:explicit
```

### Problem: getenv() vrací FALSE v API

**Příčina**: PHP-FPM nenastavuje environment variables jako getenv() očekává

**Řešení**: Použij `$_ENV` nebo `$_SERVER` místo `getenv()`:
```php
$dbName = $_ENV['DB_NAME'] ?? $_SERVER['DB_NAME'] ?? getenv('DB_NAME') ?: 'fallback';
```

### Problem: Změny v .env.development se neprojeví v buildu

**Příčina**: React ignoruje `.env.development` při `npm run build`

**Řešení**: Buď:
1. Použij `build:dev:explicit` script (doporučeno)
2. Nebo přidej hodnoty do `build:dev:explicit` scriptu v `package.json`

### Problem: Špatná verze v UI (2.07 místo 2.08)

**Příčina**: Build script nemá nastavený `REACT_APP_VERSION`

**Řešení**:
```bash
# Zkontroluj package.json
grep "REACT_APP_VERSION" package.json

# Mělo by obsahovat:
# "build:dev:explicit": "REACT_APP_VERSION=2.08-DEV ..."
```

---

## 📋 Checklist pro nové DEV prostředí

- [ ] PHP-FPM pool config má DEV environment variables
- [ ] Restart PHP-FPM (ne reload!)
- [ ] Apache vhost má Alias pro `/dev/api.eeo` a `/dev/eeo-v2`
- [ ] dbconfig.php používá `$_ENV` fallback chain
- [ ] `.env.development` má správnou verzi a API URL
- [ ] `build:dev:explicit` script obsahuje všechny potřebné env vars včetně verze
- [ ] Build directory je vytvořen pomocí `npm run build:dev:explicit`
- [ ] Verifikace: `grep -r "/dev/api.eeo" build/static/js/*.js`
- [ ] Test API: `curl http://erdms.zachranka.cz/dev/api.eeo/v2025.03_25/api.php`
- [ ] Test Frontend: Otevři `http://erdms.zachranka.cz/dev/eeo-v2`

---

## 📚 Související dokumentace

- [BUILD_SEPARATION.md](../apps/eeo-v2/client/BUILD_SEPARATION.md) - Důvod proč .env.development nefunguje
- [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) - Obecné nastavení prostředí
- [DATABASE_AUDIT_REPORT_20251231.md](DATABASE_AUDIT_REPORT_20251231.md) - Databázový audit

---

## 🔐 Security Notes

**⚠️ DŮLEŽITÉ**:
- Tato dokumentace obsahuje hesla pro development prostředí
- **NIKDY** necommituj tento soubor do veřejného repozitáře
- Pro produkci použij jiná hesla a credentials

---

## ✅ Status & Maintenance

**Poslední úspěšná verifikace**: 2025-01-02
**Verifikoval**: GitHub Copilot
**Status**: ✅ Plně funkční

**Changelog**:
- **2025-01-02**: Kompletní setup DEV prostředí včetně PHP-FPM, Apache, a build scriptů
- **2025-01-02**: Oprava verze z 2.07-DEV na 2.08-DEV
- **2025-01-02**: Přidán REACT_APP_VERSION do build:dev:explicit scriptu

---

## 📞 Support

V případě problémů:
1. Zkontroluj tento dokument
2. Spusť troubleshooting testy
3. Zkontroluj error logy:
   - PHP-FPM: `/var/log/php8.4-fpm.log`
   - Apache: `/var/log/apache2/error.log`
   - API: `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/logs/`

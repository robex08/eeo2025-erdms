# Finální struktura projektů - Implementační plán

**Datum:** 4. prosince 2025  
**Status:** ⚠️ SUPERSEDED - Viz ERDMS-PLATFORM-ARCHITECTURE.md  

---

## ⚠️ POZNÁMKA
Tento dokument byl nahrazen finálním návrhem **ERDMS Platform Architecture**.

**Změna konceptu:**
- Místo samostatné EEO aplikace → ERDMS platforma
- Auth API vyextrahováno jako sdílená služba
- EEO jako `erdms/apps/eeo-v2/`
- Jednotná doména a dashboard

👉 **Viz:** `ERDMS-PLATFORM-ARCHITECTURE.md`

---

## 🏗️ Celková architektura (archiv)

### Servery a jejich role

```
┌─────────────────────────────────────────────────────────┐
│ DEV SERVER (současný - 10.3.172.11)                     │
├─────────────────────────────────────────────────────────┤
│ • Vývoj (localhost)                                      │
│ • Build pro dev doménu (erdms-dev.zachranka.cz)         │
│ • Dočasně i produkce (erdms.zachranka.cz) ← přesměrovat │
│ • DB: eeo2025_dev, erdms_dev                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PROD SERVER (budoucí - jiná IP)                         │
├─────────────────────────────────────────────────────────┤
│ • Produkční nasazení (erdms.zachranka.cz)               │
│ • Build přes SSHFS mount z dev serveru (možná)          │
│ • DB: eeo2025, erdms                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Struktura `/var/www/` - DEV SERVER

### FÁZE 1: Současný stav (reorganizace)

```
/var/www/
├── eeo2025/                          # 🎯 GIT REPO (development source)
│   ├── .git/
│   ├── client/                       # React app (dev source)
│   │   ├── src/
│   │   ├── dist/                     # Build (v .gitignore)
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   ├── server/                       # Node.js API (dev source)
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── entraConfig.js   # EntraID konfig
│   │   │   │   └── database.js
│   │   │   ├── services/
│   │   │   │   └── entraAuthService.js  # ← Sdílená auth logika
│   │   │   ├── middleware/
│   │   │   │   └── authMiddleware.js
│   │   │   ├── routes/
│   │   │   │   ├── auth.js          # /api/auth/* endpoints
│   │   │   │   └── eeo.js           # /api/eeo/* endpoints
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── .env.development
│   │
│   ├── docs/
│   ├── scripts/
│   │   ├── build-dev.sh             # Build pro -dev doménu
│   │   ├── build-prod.sh            # Build pro produkci
│   │   └── deploy-prod.sh           # Deploy na prod server
│   │
│   ├── dev-start.sh                 # Localhost vývoj
│   ├── dev-stop.sh
│   └── .gitignore
│
├── eeo2025-builds/                   # 🚀 BUILDS (není v GIT)
│   ├── dev/                          # Build pro erdms-dev.zachranka.cz
│   │   ├── client/dist/
│   │   ├── server/
│   │   └── .env.dev
│   │
│   └── releases/                     # Produkční releases
│       ├── v1.0.0/
│       ├── v1.0.1/
│       └── v1.0.2/
│
├── eeo2025-current -> eeo2025-builds/releases/v1.0.2/  # 🔗 SYMLINK
│
├── eeo2025-legacy-php/               # 📦 LEGACY PHP API
│   └── api.eeo/                      # Přejmenované z erdms_oldapi
│       ├── api.php
│       └── v2025.03_25/
│
└── shared/                           # 📂 SDÍLENÉ RESOURCES
    ├── uploads/                      # Nahrané soubory
    ├── doc/
    │   └── prilohy/                  # Přílohy z EEO
    └── logs/                         # Centrální logy
        ├── eeo2025-dev.log
        ├── eeo2025-prod.log
        └── php-errors.log
```

---

## 🔧 Konfigurace prostředí

### 1. Development (localhost)

**Co běží:**
```bash
cd /var/www/eeo2025
./dev-start.sh

# Spustí:
# - Vite dev server (port 5173)
# - Node.js API (port 3000) s nodemon
```

**Přístup:**
- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`
- PHP API: `http://localhost/api.eeo` (nginx)

**ENV:** `.env.development`
```bash
NODE_ENV=development
DB_HOST=10.3.172.11
DB_NAME=eeo2025_dev
DB_USER=erdms_user
DB_PASSWORD=CHANGE_ME_DB_PASSWORD

API_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173

LOG_LEVEL=debug
```

---

### 2. Dev Domain (erdms-dev.zachranka.cz)

**Build proces:**
```bash
cd /var/www/eeo2025
./scripts/build-dev.sh

# Vytvoří:
# /var/www/eeo2025-builds/dev/
```

**Přístup:**
- `https://erdms-dev.zachranka.cz` → frontend + API

**ENV:** `.env.dev` (v build složce)
```bash
NODE_ENV=development
DB_HOST=10.3.172.11
DB_NAME=eeo2025_dev
DB_USER=erdms_user
DB_PASSWORD=CHANGE_ME_DB_PASSWORD

API_URL=https://erdms-dev.zachranka.cz/api
CLIENT_URL=https://erdms-dev.zachranka.cz

LOG_LEVEL=info
```

**NGINX config:**
```nginx
server {
    server_name erdms-dev.zachranka.cz;
    
    # Frontend (static)
    root /var/www/eeo2025-builds/dev/client/dist;
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Node.js API
    location /api/ {
        proxy_pass http://localhost:3001;  # Dev API na portu 3001
    }
    
    # Legacy PHP API
    location /api.eeo/ {
        root /var/www/eeo2025-legacy-php;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
    }
    
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/erdms-dev.zachranka.cz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erdms-dev.zachranka.cz/privkey.pem;
}
```

---

### 3. Production (erdms.zachranka.cz)

**Build proces:**
```bash
cd /var/www/eeo2025
./scripts/build-prod.sh v1.0.2

# Vytvoří:
# /var/www/eeo2025-builds/releases/v1.0.2/

./scripts/deploy-prod.sh v1.0.2
# Přepne symlink:
# eeo2025-current -> releases/v1.0.2
```

**Přístup:**
- `https://erdms.zachranka.cz` → frontend + API

**ENV:** `.env.production`
```bash
NODE_ENV=production
DB_HOST=10.3.172.11        # Zatím dev server
DB_NAME=eeo2025            # Produkční DB
DB_USER=erdms_user_prod
DB_PASSWORD=***

API_URL=https://erdms.zachranka.cz/api
CLIENT_URL=https://erdms.zachranka.cz

LOG_LEVEL=warn
```

**NGINX config:**
```nginx
server {
    server_name erdms.zachranka.cz;
    
    # Frontend (static) - přes symlink
    root /var/www/eeo2025-current/client/dist;
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Node.js API (production)
    location /api/ {
        proxy_pass http://localhost:3002;  # Prod API na portu 3002
    }
    
    # Legacy PHP API
    location /api.eeo/ {
        root /var/www/eeo2025-legacy-php;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
    }
    
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/erdms.zachranka.cz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erdms.zachranka.cz/privkey.pem;
}
```

---

## 🚀 Build & Deploy skripty

### `scripts/build-dev.sh`
```bash
#!/bin/bash
set -e

echo "🔨 Building for DEV domain..."

BUILD_DIR="/var/www/eeo2025-builds/dev"
SOURCE_DIR="/var/www/eeo2025"

# Clean previous build
rm -rf ${BUILD_DIR}
mkdir -p ${BUILD_DIR}/client
mkdir -p ${BUILD_DIR}/server

# Build frontend
echo "📦 Building React app..."
cd ${SOURCE_DIR}/client
npm run build
cp -r dist ${BUILD_DIR}/client/

# Copy server
echo "📦 Copying Node.js API..."
cp -r ${SOURCE_DIR}/server/src ${BUILD_DIR}/server/
cp ${SOURCE_DIR}/server/package*.json ${BUILD_DIR}/server/

# Install production dependencies
cd ${BUILD_DIR}/server
npm ci --production

# Copy .env
cp ${SOURCE_DIR}/server/.env.dev ${BUILD_DIR}/server/.env

# Restart dev API service
sudo systemctl restart eeo2025-dev-api

echo "✅ Dev build complete!"
echo "📍 Location: ${BUILD_DIR}"
echo "🌐 URL: https://erdms-dev.zachranka.cz"
```

### `scripts/build-prod.sh`
```bash
#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./build-prod.sh <version>"
    echo "Example: ./build-prod.sh v1.0.2"
    exit 1
fi

VERSION=$1
RELEASE_DIR="/var/www/eeo2025-builds/releases/${VERSION}"
SOURCE_DIR="/var/www/eeo2025"

echo "🚀 Building version ${VERSION}..."

# Create release directory
mkdir -p ${RELEASE_DIR}/client
mkdir -p ${RELEASE_DIR}/server

# Build frontend (production mode)
echo "📦 Building React app (production)..."
cd ${SOURCE_DIR}/client
NODE_ENV=production npm run build
cp -r dist ${RELEASE_DIR}/client/

# Copy server
echo "📦 Copying Node.js API..."
cp -r ${SOURCE_DIR}/server/src ${RELEASE_DIR}/server/
cp ${SOURCE_DIR}/server/package*.json ${RELEASE_DIR}/server/

# Install production dependencies
cd ${RELEASE_DIR}/server
npm ci --production

# Copy production .env
cp ${SOURCE_DIR}/server/.env.production ${RELEASE_DIR}/server/.env

# Create version file
echo "${VERSION}" > ${RELEASE_DIR}/VERSION
date > ${RELEASE_DIR}/BUILT_AT

echo "✅ Production build complete!"
echo "📍 Location: ${RELEASE_DIR}"
echo "⚠️  Not deployed yet. Run: ./scripts/deploy-prod.sh ${VERSION}"
```

### `scripts/deploy-prod.sh`
```bash
#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./deploy-prod.sh <version>"
    echo "Example: ./deploy-prod.sh v1.0.2"
    exit 1
fi

VERSION=$1
RELEASE_DIR="/var/www/eeo2025-builds/releases/${VERSION}"
CURRENT_LINK="/var/www/eeo2025-current"

# Check if release exists
if [ ! -d "${RELEASE_DIR}" ]; then
    echo "❌ Release ${VERSION} not found!"
    echo "Run: ./scripts/build-prod.sh ${VERSION}"
    exit 1
fi

echo "🚀 Deploying version ${VERSION}..."

# Backup current symlink (for rollback)
if [ -L "${CURRENT_LINK}" ]; then
    PREVIOUS=$(readlink ${CURRENT_LINK})
    echo "📌 Previous version: ${PREVIOUS}"
fi

# Update symlink (atomic operation)
ln -sfn ${RELEASE_DIR} ${CURRENT_LINK}

# Restart production API service
sudo systemctl restart eeo2025-prod-api
sudo systemctl reload nginx

echo "✅ Deployed version ${VERSION}"
echo "📍 Current: $(readlink ${CURRENT_LINK})"
echo "🌐 URL: https://erdms.zachranka.cz"

# Health check
sleep 2
curl -f https://erdms.zachranka.cz/api/health || echo "⚠️  Health check failed!"
```

### `scripts/rollback.sh`
```bash
#!/bin/bash
set -e

CURRENT_LINK="/var/www/eeo2025-current"
RELEASES_DIR="/var/www/eeo2025-builds/releases"

# Get previous version
CURRENT=$(basename $(readlink ${CURRENT_LINK}))
PREVIOUS=$(ls -t ${RELEASES_DIR} | grep -v ${CURRENT} | head -1)

if [ -z "${PREVIOUS}" ]; then
    echo "❌ No previous version found for rollback!"
    exit 1
fi

echo "🔄 Rolling back from ${CURRENT} to ${PREVIOUS}..."

# Update symlink
ln -sfn ${RELEASES_DIR}/${PREVIOUS} ${CURRENT_LINK}

# Restart service
sudo systemctl restart eeo2025-prod-api
sudo systemctl reload nginx

echo "✅ Rolled back to ${PREVIOUS}"
echo "📍 Current: $(readlink ${CURRENT_LINK})"
```

---

## 🗄️ Databázová architektura

### Databáze na DEV serveru (10.3.172.11)

```sql
-- Development
CREATE DATABASE eeo2025_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci;
CREATE DATABASE erdms_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci;

-- Production (dočasně na dev serveru)
CREATE DATABASE eeo2025 CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci;
CREATE DATABASE erdms CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci;
```

**Rozdělení:**
- `erdms*` - Autentizace (users, permissions, roles) - **SDÍLENÉ pro všechny aplikace**
- `eeo2025*` - Business data (orders, invoices, cashbook, attachments)

---

## 🔄 SSHFS Mount (budoucí produkční server)

```bash
# Na PROD serveru mount dev server
sudo mkdir -p /mnt/dev-eeo2025
sudo sshfs -o allow_other,default_permissions \
    erdms_user@10.3.172.11:/var/www/eeo2025-builds/releases \
    /mnt/dev-eeo2025

# Deploy na prod přes mount
ln -sfn /mnt/dev-eeo2025/v1.0.2 /var/www/eeo2025-current
```

**Nebo lepší: rsync deploy**
```bash
# scripts/deploy-to-prod-server.sh
VERSION=$1
rsync -avz --delete \
    /var/www/eeo2025-builds/releases/${VERSION}/ \
    prod-server:/var/www/eeo2025-builds/releases/${VERSION}/

ssh prod-server "ln -sfn /var/www/eeo2025-builds/releases/${VERSION} /var/www/eeo2025-current && sudo systemctl restart eeo2025-api"
```

---

## 📋 Implementační kroky

### KROK 1: Reorganizace složek (TEĎ)
```bash
# 1. Přejmenovat PHP API
sudo mv /var/www/erdms_oldapi /var/www/eeo2025-legacy-php

# 2. Vyčistit starý erdms build
sudo rm -rf /var/www/erdms

# 3. Vytvořit strukturu pro builds
sudo mkdir -p /var/www/eeo2025-builds/dev
sudo mkdir -p /var/www/eeo2025-builds/releases
sudo mkdir -p /var/www/shared/{uploads,logs}

# 4. Upravit práva
sudo chown -R www-data:www-data /var/www/eeo2025-builds
sudo chown -R www-data:www-data /var/www/shared
```

### KROK 2: Vytvořit build skripty
- [x] `scripts/build-dev.sh`
- [x] `scripts/build-prod.sh`
- [x] `scripts/deploy-prod.sh`
- [x] `scripts/rollback.sh`

### KROK 3: Vytvořit systemd services
```ini
# /etc/systemd/system/eeo2025-dev-api.service
[Service]
WorkingDirectory=/var/www/eeo2025-builds/dev/server
Environment="NODE_ENV=development"
Environment="PORT=3001"
ExecStart=/usr/bin/node src/index.js

# /etc/systemd/system/eeo2025-prod-api.service
[Service]
WorkingDirectory=/var/www/eeo2025-current/server
Environment="NODE_ENV=production"
Environment="PORT=3002"
ExecStart=/usr/bin/node src/index.js
```

### KROK 4: Nastavit NGINX
- [x] Config pro `erdms-dev.zachranka.cz`
- [x] Config pro `erdms.zachranka.cz` (s symlinkem)
- [x] SSL certifikáty

### KROK 5: První production build
```bash
cd /var/www/eeo2025
./scripts/build-prod.sh v1.0.0
./scripts/deploy-prod.sh v1.0.0
```

---

## ✅ Výhody této architektury

1. **Čisté oddělení:**
   - Dev vývoj (localhost)
   - Dev doména (testování)
   - Production (stable releases)

2. **Rychlý rollback:**
   - Prostě přepneš symlink na předchozí verzi

3. **Verzování:**
   - Každý release má číslo (`v1.0.2`)
   - Git tag odpovídá release verzi

4. **Bezpečnost:**
   - Source kód (`.git/`) není přístupný z webu
   - Build složky obsahují jen compiled code

5. **Flexibilita:**
   - Snadno přidáš další aplikace (intranet)
   - Sdílená auth logika zůstává v `eeo2025/server` zatím
   - Později vyextrahuješ do samostatného `erdms-auth`

---

**Status:** 🎯 Připraveno k implementaci  
**Další krok:** Reorganizace složek + vytvoření skriptů

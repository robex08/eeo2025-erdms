# Dev → Test → Production Architecture
## Diskuze a plánování struktury projektů

**Datum:** 4. prosince 2025  
**Status:** ⚠️ SUPERSEDED - Viz ERDMS-PLATFORM-ARCHITECTURE.md  
**Autor:** Konzultace s AI asistent

---

## ⚠️ POZNÁMKA
Tento dokument byl nahrazen finálním návrhem **ERDMS Platform Architecture**.

**Nový koncept:**
- ERDMS jako platforma s více aplikacemi
- Sdílená autentizace (Auth API)
- EEO v2 jako jedna z aplikací
- Jednotná doména: `erdms.zachranka.cz`

👉 **Viz:** `ERDMS-PLATFORM-ARCHITECTURE.md`

---

## 📋 Původní požadavek (archiv)

### Komponenty systému
1. **EntraID API** (Node.js) - Autentizace pro všechny aplikace
2. **EEO Legacy API** (PHP) - Staré API, plán migrace na Node.js
3. **EEO 2025 Frontend** (React + Vite) - Nový UI

### Požadavky na strukturu
- ✅ Oddělené **dev složky** pro vývoj
- ✅ Oddělené **build složky** pro production-ready kód
- ✅ Jednoduchý **deploy** z dev → test → production
- ✅ Různé **DB instance** pro každé prostředí
- ✅ Různé **DNS/IP** pro každé prostředí

### Prostředí
- **dev** - Vývoj (aktuální server)
- **test** - Testovací prostředí (jiný server/IP)
- **prod** - Produkce `erdms.zachranka.cz` (jiný server/IP)

### Specifika DB migrace
- První fáze: **Časté změny DB** (číselníky, uživatelé, struktury)
- Test → Prod: Migrace struktury + referenčních dat (bez provozních dat)

---

## 💡 Doporučená architektura `/var/www/`

### Varianta A: Monorepo s oddělenými builds
```
/var/www/
├── eeo2025/                    # 🎯 GIT REPOSITORY (dev + source)
│   ├── .git/
│   ├── .env.dev
│   ├── client/                 # React app (source)
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.js
│   ├── server/                 # Node.js API (source)
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env
│   ├── docs/
│   ├── scripts/
│   │   ├── deploy-test.sh
│   │   ├── deploy-prod.sh
│   │   └── db-migrate.sh
│   └── dev-start.sh
│
├── eeo2025-build/              # 🚀 PRODUCTION BUILD (není v GIT)
│   ├── client/                 # React build (npm run build)
│   │   └── dist/               # Statické soubory
│   ├── server/                 # Node.js API (production)
│   │   ├── src/
│   │   ├── node_modules/
│   │   └── .env.production
│   └── .deployed               # Timestamp posledního deploye
│
├── erdms_oldapi/               # 🗂️ LEGACY PHP API
│   ├── api.eeo/                # Starý PHP kód
│   │   ├── api.php
│   │   └── v2025.03_25/
│   └── .env.php
│
└── shared/                     # 📦 SDÍLENÉ RESOURCES
    ├── uploads/                # Nahrané soubory
    ├── prilohy/                # Přílohy z EEO
    └── logs/                   # Centralizované logy
```

**Výhody:**
- ✅ Jasné oddělení dev (source) vs production (build)
- ✅ Git repo obsahuje jen source, ne build artefakty
- ✅ Build složka může být kompletně smazána a znovu vytvořena
- ✅ Legacy PHP izolované
- ✅ Sdílené resources na jednom místě

**Nevýhody:**
- ⚠️ Nutné mít deploy skripty pro kopírování z `eeo2025/` → `eeo2025-build/`
- ⚠️ Dvě složky zabírají víc místa

---

### Varianta B: In-place builds (jednodušší)
```
/var/www/
├── eeo2025/                    # 🎯 GIT REPOSITORY
│   ├── .git/
│   ├── .gitignore              # Ignoruje dist/, node_modules/
│   ├── client/
│   │   ├── src/                # Dev source
│   │   ├── dist/               # Build (v .gitignore)
│   │   └── package.json
│   ├── server/
│   │   ├── src/                # Dev source
│   │   ├── .env.development
│   │   ├── .env.production
│   │   └── package.json
│   └── scripts/
│       ├── build-prod.sh
│       └── deploy-prod.sh
│
├── erdms_oldapi/               # Legacy PHP
└── shared/                     # Uploads, logs
```

**Výhody:**
- ✅ Jednodušší - vše na jednom místě
- ✅ Méně složek, méně kopírování
- ✅ `.gitignore` zajistí, že buildy nejsou v GIT

**Nevýhody:**
- ⚠️ Build artefakty v dev složce (i když v .gitignore)
- ⚠️ Složitější rollback (musíš mít tagged verze)

---

### Varianta C: Multi-environment folders (enterprise přístup)
```
/var/www/
├── eeo2025-dev/                # Development
│   ├── client/
│   ├── server/
│   └── .env.dev
│
├── eeo2025-test/               # Testing (na test serveru)
│   ├── client/dist/
│   ├── server/
│   └── .env.test
│
├── eeo2025-prod/               # Production (na prod serveru)
│   ├── client/dist/
│   ├── server/
│   └── .env.prod
│
└── erdms_oldapi/               # Legacy PHP (sdílené)
```

**Výhody:**
- ✅ Úplné oddělení prostředí
- ✅ Můžeš mít různé verze běžící současně
- ✅ Snadný rollback (prostě přepneš symlink)

**Nevýhody:**
- ⚠️ Zabírá hodně místa (3× celý projekt)
- ⚠️ Složitější sync mezi prostředími

---

## 🎯 DOPORUČENÍ: Varianta A+ (Hybrid)

Kombinace Varianty A +SymLinky:

```
/var/www/
├── eeo2025/                    # 🎯 GIT REPO (development source)
│   ├── client/src/             # React dev
│   ├── server/src/             # Node.js dev
│   ├── .env.development
│   └── scripts/
│
├── eeo2025-current -> eeo2025-releases/v1.2.3/  # 🔗 SYMLINK
│
├── eeo2025-releases/           # 📦 RELEASE BUILDS
│   ├── v1.2.3/                 # Produkční build
│   │   ├── client/dist/
│   │   ├── server/
│   │   └── .env.production
│   ├── v1.2.2/                 # Starší verze (rollback)
│   └── v1.2.1/
│
├── erdms_oldapi/               # Legacy PHP
│
└── shared/                     # Uploads, logs
    ├── uploads/
    ├── prilohy/
    └── logs/
```

### Jak to funguje:

1. **Vývoj**: Pracuješ v `/var/www/eeo2025/`
2. **Build**: `npm run build` vytvoří production build
3. **Release**: Skript vytvoří `/var/www/eeo2025-releases/v1.2.3/`
4. **Deploy**: Přepne symlink `eeo2025-current` → `v1.2.3`
5. **Rollback**: Přepne symlink zpět na `v1.2.2`

---

## 🗄️ Databázová architektura

### Doporučení: Oddělené DB pro každé prostředí

```
DEV Server (10.3.172.11):
├── eeo2025_dev       # Development DB
├── erdms_dev         # Auth DB (development)

TEST Server (IP jiná):
├── eeo2025_test      # Test DB
├── erdms_test        # Auth DB (test)

PROD Server (IP jiná):
├── eeo2025           # Production DB
├── erdms             # Auth DB (production)
```

### DB Migrace strategie

```bash
# 1. Export struktury + referenčních dat (bez provozních dat)
scripts/db-export-schema.sh > schema.sql
scripts/db-export-reference-data.sh > reference-data.sql

# Reference data = číselníky, uživatelé, role, oprávnění
# VYNECHÁVÁ: orders, invoices, cashbook, logs (provozní data)

# 2. Import na TEST
mysql -h test-server eeo2025_test < schema.sql
mysql -h test-server eeo2025_test < reference-data.sql

# 3. Test + schválení

# 4. Import na PROD
mysql -h prod-server eeo2025 < schema.sql
mysql -h prod-server eeo2025 < reference-data.sql
```

---

## 📝 `.env` Konfigurace pro každé prostředí

### Development (`.env.development`)
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

### Test (`.env.test`)
```bash
NODE_ENV=test
DB_HOST=10.3.172.22       # Jiná IP
DB_NAME=eeo2025_test
DB_USER=erdms_user_test
DB_PASSWORD=***

API_URL=https://erdms-test.zachranka.cz
CLIENT_URL=https://erdms-test.zachranka.cz

LOG_LEVEL=info
```

### Production (`.env.production`)
```bash
NODE_ENV=production
DB_HOST=10.3.172.33       # Jiná IP
DB_NAME=eeo2025
DB_USER=erdms_user_prod
DB_PASSWORD=***

API_URL=https://erdms.zachranka.cz
CLIENT_URL=https://erdms.zachranka.cz

LOG_LEVEL=warn
```

---

## 🚀 Deploy workflow

### Skript: `scripts/deploy-prod.sh`
```bash
#!/bin/bash
set -e

VERSION=$(date +%Y%m%d-%H%M%S)
RELEASE_DIR="/var/www/eeo2025-releases/v${VERSION}"

echo "🚀 Deploying version ${VERSION}..."

# 1. Build frontend
cd /var/www/eeo2025/client
npm run build

# 2. Create release directory
mkdir -p ${RELEASE_DIR}/client
mkdir -p ${RELEASE_DIR}/server

# 3. Copy built files
cp -r dist/ ${RELEASE_DIR}/client/
cp -r ../server/src ${RELEASE_DIR}/server/
cp ../server/package.json ${RELEASE_DIR}/server/

# 4. Install production dependencies
cd ${RELEASE_DIR}/server
npm install --production

# 5. Copy production .env
cp /var/www/eeo2025/.env.production ${RELEASE_DIR}/server/.env

# 6. Update symlink (atomic operation)
ln -sfn ${RELEASE_DIR} /var/www/eeo2025-current

# 7. Restart services
sudo systemctl restart eeo2025-api
sudo systemctl reload nginx

echo "✅ Deployed version ${VERSION}"
echo "📍 Current: $(readlink /var/www/eeo2025-current)"
```

### Rollback: `scripts/rollback.sh`
```bash
#!/bin/bash
PREVIOUS=$(ls -t /var/www/eeo2025-releases/ | sed -n 2p)

echo "🔄 Rolling back to ${PREVIOUS}..."
ln -sfn /var/www/eeo2025-releases/${PREVIOUS} /var/www/eeo2025-current
sudo systemctl restart eeo2025-api

echo "✅ Rolled back to ${PREVIOUS}"
```

---

## 🔧 NGINX konfigurace

### Dev server
```nginx
# /etc/nginx/sites-available/eeo2025-dev
server {
    server_name localhost;
    
    # Frontend (dev server)
    location / {
        proxy_pass http://localhost:5173;  # Vite dev
    }
    
    # API (dev)
    location /api/ {
        proxy_pass http://localhost:3000;
    }
    
    # Legacy PHP API
    location /api.eeo/ {
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        root /var/www/erdms_oldapi;
    }
}
```

### Production server
```nginx
# /etc/nginx/sites-available/erdms.zachranka.cz
server {
    server_name erdms.zachranka.cz;
    
    # Frontend (built static files)
    root /var/www/eeo2025-current/client/dist;
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API (production)
    location /api/ {
        proxy_pass http://localhost:3000;
    }
    
    # Legacy PHP API
    location /api.eeo/ {
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        root /var/www/erdms_oldapi;
    }
    
    # SSL
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/erdms.zachranka.cz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erdms.zachranka.cz/privkey.pem;
}
```

---

## 🐛 Best Practices

### 1. Version Tagging
```bash
# Git tags pro releases
git tag -a v1.2.3 -m "Release 1.2.3"
git push origin v1.2.3

# Odpovídá /var/www/eeo2025-releases/v1.2.3/
```

### 2. Health Checks
```bash
# scripts/health-check.sh
curl -f https://erdms.zachranka.cz/api/health || exit 1
curl -f https://erdms.zachranka.cz/ || exit 1
```

### 3. Backup před deploy
```bash
# scripts/backup-before-deploy.sh
mysqldump -h prod eeo2025 > backup-$(date +%Y%m%d).sql
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/eeo2025-current/
```

### 4. DB Migrations tracking
```sql
CREATE TABLE db_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Každá migrace se zaznamená
INSERT INTO db_migrations (version, description) 
VALUES ('20251204-001', 'Added user roles table');
```

### 5. Staging environment
```
dev → test → staging → production
      ↓       ↓         ↓
     Automatické       Manual
     testy            approval
```

---

## ❓ Otázky k diskuzi

### 1. Kterou variantu struktury preferuješ?
- **A+** Hybrid s releases + symlinky (doporučuji)
- **A** Oddělené build složky
- **B** In-place builds (.gitignore)
- **C** Multi-environment folders

### 2. Jak často plánuješ deploy?
- **Denně** → Automatizace je kritická
- **Týdně** → Ruční deploy OK
- **Měsíčně** → Důraz na stabilitu

### 3. Máš už přístup na test/prod servery?
- Potřebuješ SSH klíče?
- Jsou tam už DB vytvořené?

### 4. Databázové migrace
- Chceš automatický migration tool (Flyway, Liquibase)?
- Nebo ruční SQL skripty?

### 5. CI/CD
- Plánuješ GitHub Actions?
- Jenkins?
- Manuální deploy?

---

## 📋 TODO: Akce k implementaci

Po rozhodnutí struktury:

- [ ] Vytvořit definitivní strukturu `/var/www/`
- [ ] Napsat deploy skripty
- [ ] Vytvořit DB migration skripty
- [ ] Nastavit NGINX pro všechna prostředí
- [ ] Vytvořit systemd services
- [ ] Dokumentovat deploy proces
- [ ] Test deploy workflow

---

**Status:** 💬 Čekám na diskuzi a rozhodnutí  
**Doporučení:** Varianta A+ (Hybrid) + automatické DB migrace  
**Blokuje:** Rozhodnutí o struktuře složek

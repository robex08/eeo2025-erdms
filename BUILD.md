# EEO v2 - Build & Deploy

**Datum:** 3. ledna 2026  
**Verze:** 1.95e  
**Autor:** Robert Holovský

---

## 🎯 Základní Informace

Tento dokument popisuje **kompletní proces buildu a deploye** EEO v2 aplikace pro DEV a PROD prostředí.

**Klíčové principy:**
- ✅ DEV a PROD jsou **plně separované**
- ✅ DEV zůstává v `/var/www/erdms-dev/` - **nikdy se nekopíruje**
- ✅ PROD se kopíruje do `/var/www/erdms-platform/`
- ✅ **Jeden build = jeden příkaz**

---

## 📂 Struktura Adresářů

```
DEV:
/var/www/erdms-dev/apps/eeo-v2/
├── client/build/              # DEV frontend (Apache Alias: /dev/eeo-v2)
└── api-legacy/api.eeo/        # DEV API (Apache Alias: /dev/api.eeo)
    └── .env                   # DB: eeo2025-dev

PROD:
/var/www/erdms-platform/apps/eeo-v2/
├── static/                    # PROD frontend (Apache Alias: /eeo-v2)
├── asset-manifest.json        # PROD frontend
├── index.html                 # PROD frontend
└── api-legacy/api.eeo/        # PROD API (Apache Alias: /api.eeo)
    └── .env                   # DB: eeo2025

DATA:
/var/www/erdms-data/eeo-v2/manualy/              # DEV manuály
/var/www/erdms-platform/data/eeo-v2/manualy/     # PROD manuály
```

---

## 🛠️ Build Proces

### 1️⃣ DEV Build

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev:explicit
```

**Co to dělá:**
- Buildne do `build/` adresáře
- PUBLIC_URL: `/dev/eeo-v2`
- API: `https://erdms.zachranka.cz/dev/api.eeo/`
- DB: `eeo2025-dev`

**Deploy:** ✅ **AUTOMATICKÝ** - Apache už na to ukazuje přes Alias

---

### 2️⃣ PROD Build

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:prod
```

**Co to dělá:**
- Buildne do `build-prod/` adresáře
- PUBLIC_URL: `/eeo-v2`
- API: `https://erdms.zachranka.cz/api.eeo/`
- DB: `eeo2025`

**Deploy:** ⚠️ **MANUÁLNÍ** - musí se zkopírovat (viz níže)

---

## 📦 Deploy PROD

### Krok 1: Frontend

```bash
cp -r /var/www/erdms-dev/apps/eeo-v2/client/build-prod/* /var/www/erdms-platform/apps/eeo-v2/
```

### Krok 2: API Legacy

```bash
cp -r /var/www/erdms-dev/apps/eeo-v2/api-legacy /var/www/erdms-platform/apps/eeo-v2/
```

### Krok 3: KRITICKÉ - Opravit PROD .env

⚠️ **DŮLEŽITÉ:** API Legacy kopírování přepíše PROD .env! Musí se opravit:

```bash
cat > /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env << 'EOF'
# PROD Environment - Database Configuration
DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=eeo2025
DB_USER=erdms_user
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_CHARSET=utf8mb4

# Application version
REACT_APP_VERSION=1.94

# Upload paths - PROD používá /var/www/erdms-platform/data/
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
MANUALS_PATH=/var/www/erdms-platform/data/eeo-v2/manualy/
EOF
```

### Krok 4: Manuály

```bash
mkdir -p /var/www/erdms-platform/data/eeo-v2/manualy
cp -r /var/www/erdms-data/eeo-v2/manualy/* /var/www/erdms-platform/data/eeo-v2/manualy/
```

### Krok 5: Reload Apache

```bash
systemctl reload apache2
```

---

## ⚡ Celý Proces Najednou

### DEV Deploy (automatický)

```bash
cd /var/www/erdms-dev/apps/eeo-v2/client && \
npm run build:dev:explicit && \
echo "✅ DEV build hotový a dostupný na /dev/eeo-v2"
```

### PROD Deploy (kompletní)

```bash
# 1. Build
cd /var/www/erdms-dev/apps/eeo-v2/client && \
npm run build:prod && \

# 2. Deploy frontend
cp -r build-prod/* /var/www/erdms-platform/apps/eeo-v2/ && \

# 3. Deploy API
cp -r /var/www/erdms-dev/apps/eeo-v2/api-legacy /var/www/erdms-platform/apps/eeo-v2/ && \

# 4. KRITICKÉ - Opravit PROD .env
cat > /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env << 'EOF'
# PROD Environment - Database Configuration
DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=eeo2025
DB_USER=erdms_user
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_CHARSET=utf8mb4

# Application version
REACT_APP_VERSION=1.94

# Upload paths - PROD používá /var/www/erdms-platform/data/
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
MANUALS_PATH=/var/www/erdms-platform/data/eeo-v2/manualy/
EOF

# 5. Deploy manuály
mkdir -p /var/www/erdms-platform/data/eeo-v2/manualy && \
cp -r /var/www/erdms-data/eeo-v2/manualy/* /var/www/erdms-platform/data/eeo-v2/manualy/ && \

# 6. Reload Apache
systemctl reload apache2 && \

echo "✅ PROD deploy kompletní!"
```

---

## � Změna Verze Aplikace

⚠️ **KRITICKÉ:** Při změně verze aplikace je nutné aktualizovat **VŠECHNY** následující soubory:

### 1️⃣ Frontend Verze

```bash
# package.json
/var/www/erdms-dev/apps/eeo-v2/client/package.json
# Změnit: "version": "1.94"

# .env (runtime DEV)
/var/www/erdms-dev/apps/eeo-v2/client/.env
# Změnit: REACT_APP_VERSION=1.94-DEV

# .env.development (⚠️ KRITICKÉ pro DEV build!)
/var/www/erdms-dev/apps/eeo-v2/client/.env.development
# Změnit: REACT_APP_VERSION=1.94-DEV

# .env.production (⚠️ KRITICKÉ pro PROD build!)
/var/www/erdms-dev/apps/eeo-v2/client/.env.production
# Změnit: REACT_APP_VERSION=1.94

# .env.example (template)
/var/www/erdms-dev/apps/eeo-v2/client/.env.example
# Změnit: REACT_APP_VERSION=1.94-DEV / REACT_APP_VERSION=1.94
```

### 2️⃣ Backend API Verze

```bash
# DEV API .env
/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env
# Změnit: REACT_APP_VERSION=1.94-DEV

# DEV API .env.example
/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env.example
# Změnit: REACT_APP_VERSION=1.94-DEV / REACT_APP_VERSION=1.94

# PROD API .env (po deployi)
/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
# Změnit: REACT_APP_VERSION=1.94
```

### 3️⃣ Dokumentace

```bash
# BUILD.md
/var/www/erdms-dev/BUILD.md
# Změnit: **Verze:** 1.94
# Změnit: **Datum:** [aktuální datum]
# Změnit: REACT_APP_VERSION=1.94 v příkladech
```

### ⚡ Postup Změny Verze

```bash
# 1. Najít a nahradit starou verzi
cd /var/www/erdms-dev/apps/eeo-v2/client
grep -r "1.93" package.json .env* 

# 2. Aktualizovat všechny soubory
sed -i 's/"version": "1.93"/"version": "1.94"/' package.json
sed -i 's/REACT_APP_VERSION=1.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env
sed -i 's/REACT_APP_VERSION=1.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env.development
sed -i 's/REACT_APP_VERSION=1.93/REACT_APP_VERSION=1.94/' .env.production
sed -i 's/REACT_APP_VERSION=1.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env.example

# 3. Aktualizovat API
cd /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo
sed -i 's/REACT_APP_VERSION=1.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env
sed -i 's/REACT_APP_VERSION=1.93-DEV/REACT_APP_VERSION=1.94-DEV/' .env.example

# 4. ⚠️ KRITICKÉ: Smazat staré buildy!
cd /var/www/erdms-dev/apps/eeo-v2/client
rm -rf build build-prod

# 5. Vytvořit nové buildy
npm run build:dev:explicit  # Použije .env.development
npm run build:prod          # Použije .env.production

# 6. Deploy PROD (viz níže)
```

### ❌ Častá Chyba

**Problém:** Build ukazuje starou verzi i po změně package.json

**Příčina:** React používá `.env.development` a `.env.production` při buildu, ne `.env`!

**Řešení:**
1. Aktualizovat `.env.development` a `.env.production`
2. Smazat staré buildy: `rm -rf build build-prod`
3. Vytvořit nové buildy

---

## �🔍 Verifikace

### DEV

```bash
# URL
https://erdms.zachranka.cz/dev/eeo-v2/

# API
https://erdms.zachranka.cz/dev/api.eeo/

# Databáze
eeo2025-dev

# Footer
Zobrazuje: /dev/api.eeo (žlutě)
```

### PROD

```bash
# URL
https://erdms.zachranka.cz/eeo-v2/

# API
https://erdms.zachranka.cz/api.eeo/

# Databáze
eeo2025

# Footer
Zobrazuje: /api.eeo (šedě)
```

---

## 📋 Build Scripts (package.json)

```json
{
  "scripts": {
    "build:dev:explicit": "REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/ PUBLIC_URL=/dev/eeo-v2 BUILD_PATH=build NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build",
    "build:prod": "NODE_ENV=production BUILD_PATH=build-prod PUBLIC_URL=/eeo-v2 NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build"
  }
}
```

---

## ⚠️ KRITICKÁ PRAVIDLA

### ❌ NIKDY

- Nekopírovat DEV build nikam
- Nemazat PROD adresáře před kopírováním (bez `--delete`)
- **Nekopírovat DEV .env do PROD!**
- Nepřepisovat databázi `eeo2025` → `eeo2025-dev`

### ✅ VŽDY

- Buildnout DEV a PROD zvlášť
- Kopírovat PROD do `erdms-platform`
- **Po kopírování API legacy VŽDY opravit PROD .env**
- Zkontrolovat DB v .env: DEV=`eeo2025-dev`, PROD=`eeo2025`
- Reload Apache po změnách
- Testovat DEV před PROD deployem

---

## 🎓 Poznámky

### Proč dva buildy?

- **DEV:** Rychlý vývoj a testování bez dopadu na produkci
- **PROD:** Stabilní verze pro uživatele

### Proč nekopírovat DEV?

- Apache už na DEV build ukazuje přes Alias `/dev/eeo-v2`
- Zbytečné kopírování by zdržovalo
- DEV má jinou konfiguraci (API, DB)

### Proč opravovat .env po kopírování?

Protože kopírování `api-legacy` přepíše PROD .env s DEV konfigurací:
- ❌ DB: `eeo2025-dev` → ✅ DB: `eeo2025`
- ❌ Paths: `/var/www/erdms-data/` → ✅ Paths: `/var/www/erdms-platform/data/`

### Co když zapomenu opravit .env?

PROD bude zapisovat do **DEV databáze** (`eeo2025-dev`) → data budou v špatné DB! ⚠️

---

## 🔧 Troubleshooting

### PROD nefunguje po deployi

```bash
# 1. Zkontroluj .env
cat /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | grep DB_NAME
# Mělo by být: DB_NAME=eeo2025

# 2. Zkontroluj cesty
cat /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | grep PATH
# Mělo by být: /var/www/erdms-platform/data/...

# 3. Zkontroluj Apache log
tail -f /var/log/apache2/error.log

# 4. Reload Apache
systemctl reload apache2
```

### DEV se nedá buildnout

```bash
# Vyčisti cache
cd /var/www/erdms-dev/apps/eeo-v2/client
rm -rf node_modules/.cache build

# Znovu build
npm run build:dev:explicit
```

---

**Status:** ✅ AKTUÁLNÍ (30.12.2025)  
**Testováno:** DEV i PROD funkční  
**Databáze:** DEV=eeo2025-dev, PROD=eeo2025

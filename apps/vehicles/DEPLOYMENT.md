# 🚗 Vehicles Application - Production Deployment Guide

## 📍 Struktura aplikace

### DEV prostředí
- **URL:** `https://erdms.zachranka.cz/dev/vehicles`
- **Cesta:** `/var/www/erdms-dev/apps/vehicles/`
- **Database:** `vehicles-zzs-dev` (10.3.172.11)

### PROD prostředí
- **URL:** `https://erdms.zachranka.cz/vehicles`
- **Cesta:** `/var/www/erdms-platform/apps/vehicles/`
- **Database:** `vehicles-zzs-dev` (10.3.172.11) - **zatím stejná jako DEV!**

---

## 📦 Build a Deployment

### 1️⃣ Production Build

```bash
cd /var/www/erdms-dev/apps/vehicles

# Spustit build script (automaticky změní homepage na /vehicles a vrátí zpět)
./build-prod.sh
```

**Co build script dělá:**
1. Backup `package.json`
2. Změní `homepage: "/dev/vehicles"` → `"/vehicles"`
3. Spustí `npm run build` s `.env.production`
4. Vrátí původní `package.json` s `/dev/vehicles`

**Výsledek:** `build/` složka s optimalizovaným FE pro produkci

---

### 2️⃣ Deploy do PROD

```bash
cd /var/www/erdms-dev/apps/vehicles

# 1. Deploy FE (React build) do root
rsync -av --exclude='node_modules' build/ /var/www/erdms-platform/apps/vehicles/

# 2. Deploy API do subdirectory api/
rsync -av api/ /var/www/erdms-platform/apps/vehicles/api/

# 3. Nastavit oprávnění
chown -R www-data:www-data /var/www/erdms-platform/apps/vehicles/
```

---

### 3️⃣ Konfigurace ENV proměnných

#### Frontend - `.env.production` (v DEV workspace)
```bash
REACT_APP_APPNAME=ZZS SK přehled vozidel
REACT_APP_VERSION=2.0.0
REACT_APP_APIURL_POST=/api.vehicles/api.php
REACT_APP_APIURL_GET=/api.vehicles/api.php
REACT_APP_DEBUG=false
REACT_APP_KM_MONTHS_BACK=3
```

**⚠️ Rozdíl oproti DEV:**
- DEV používá: `/dev/api.vehicles/api.php`
- PROD používá: `/api.vehicles/api.php`

#### Backend - `.env` (v PROD `/var/www/erdms-platform/apps/vehicles/api/vehicle/.env`)
```bash
# MySQL Database Connection - DEV (zatím)
DB_HOST=10.3.172.11
DB_USER=vehicle
DB_PASSWORD=CHANGE_ME_VEHICLES_DB_PASSWORD
DB_NAME=vehicles-zzs-dev

# WebDispečink API Credentials
WEBDISPECINK_KODF=uszssk
WEBDISPECINK_USERNAME=api
WEBDISPECINK_PASSWORD=CHANGE_ME_WEBDISPECINK_PASSWORD
```

**🔴 DŮLEŽITÉ:**
- Zatím používá **DEV databázi** `vehicles-zzs-dev`
- Po vytvoření PROD DB změnit na `vehicles-zzs` (nebo jiný název)

---

## 🔄 Když změníš URL, hesla, DB credentials

### A) Změna API URL

**1. DEV - upravit `.env`:**
```bash
cd /var/www/erdms-dev/apps/vehicles
nano .env
# Změnit REACT_APP_APIURL_POST a REACT_APP_APIURL_GET
```

**2. PROD - upravit `.env.production`:**
```bash
cd /var/www/erdms-dev/apps/vehicles
nano .env.production
# Změnit REACT_APP_APIURL_POST a REACT_APP_APIURL_GET
```

**3. Rebuild PROD:**
```bash
./build-prod.sh
rsync -av build/ /var/www/erdms-platform/apps/vehicles/
```

---

### B) Změna DB credentials nebo WebDispečink přístupů

**1. DEV - upravit API .env:**
```bash
nano /var/www/erdms-dev/apps/vehicles/api/vehicle/.env
# Změnit DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# nebo WEBDISPECINK_* credentials
```

**2. PROD - upravit API .env:**
```bash
nano /var/www/erdms-platform/apps/vehicles/api/vehicle/.env
# Změnit DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# nebo WEBDISPECINK_* credentials
```

**3. Reload Apache:**
```bash
systemctl reload apache2
```

**⚠️ NIKDY necommitovat .env do GITu!** Je v `.gitignore`

---

### C) Změna homepage (např. z /vehicles na /auta)

**1. Upravit `package.json`:**
```bash
nano /var/www/erdms-dev/apps/vehicles/package.json
# Změnit "homepage": "/vehicles" → "/auta"
```

**2. Upravit build script:**
```bash
nano /var/www/erdms-dev/apps/vehicles/build-prod.sh
# Změnit řádek: sed -i 's|"homepage": "/dev/vehicles"|"homepage": "/auta"|g'
```

**3. Rebuild & redeploy:**
```bash
./build-prod.sh
rsync -av build/ /var/www/erdms-platform/apps/vehicles/
```

---

## 📂 Struktura souborů v PROD

```
/var/www/erdms-platform/apps/vehicles/
├── index.html              # React app vstupní bod
├── favicon.ico
├── logo_zzs_main.png       # ZZS logo
├── manifest.json
├── robots.txt
├── asset-manifest.json
├── static/
│   ├── css/
│   │   └── main.*.css
│   └── js/
│       └── main.*.js
└── api/
    └── vehicle/
        ├── .env            # ⚠️ PROD credentials (git ignored)
        ├── .env.example    # Vzorový soubor
        ├── .htaccess
        ├── api.php         # Hlavní API router
        ├── index.php
        ├── lib/
        │   ├── Config.php
        │   ├── Database.php
        │   ├── ProgressTracker.php
        │   ├── Response.php
        │   ├── VehicleHandlers.php
        │   ├── WebDispecinkClient.php
        │   └── WebDispecinkHandlers.php
        ├── inc/
        │   └── sql/
        │       └── queries.php
        └── v1.0/
            ├── mySQLCars.php
            └── webDispecink.php
```

---

## ✅ Checklist po deployu

- [ ] Otevřít `https://erdms.zachranka.cz/vehicles` v prohlížeči
- [ ] Zkontrolovat že se načte Dashboard
- [ ] Přejít na "Přehled vozidel" (URL: `/vehicles/prehled`)
- [ ] Ověřit že se načtou data z tabulky
- [ ] Kliknout na refresh ikonu u grafu 250k - otestovat progress bar
- [ ] Zkontrolovat browser console (F12) - nesmí být 404 errory
- [ ] Ověřit že logo ZZS SK se zobrazuje v hlavičce
- [ ] Otestovat fullscreen u grafů

---

## 🚨 Troubleshooting

### Chyba: "Failed to fetch"
→ Zkontroluj REACT_APP_APIURL_POST v `.env.production`
→ Zkontroluj že Apache rewrites fungují pro `/api.vehicles/`

### Chyba: "Database connection failed"
→ Zkontroluj `/var/www/erdms-platform/apps/vehicles/api/vehicle/.env`
→ Ověř že DB credentials jsou správné
→ Zkontroluj PHP error log: `tail -f /var/www/erdms-dev/logs/php-error.log`

### Grafy se nenačítají
→ Zkontroluj browser console (F12) pro chyby
→ Ověř že API endpoint vrací data: `curl https://erdms.zachranka.cz/api.vehicles/api.php?action=dbCarsListDetail`

### 404 na logo_zzs_main.png
→ Zkontroluj že logo je v `/var/www/erdms-platform/apps/vehicles/logo_zzs_main.png`
→ Oprávnění: `chown www-data:www-data logo_zzs_main.png`

---

## 📝 Git workflow

```bash
cd /var/www/erdms-dev/apps/vehicles

# Přidat změny
git add .

# Commit
git commit -m "feat: popis změny"

# Push
git push origin feature/v3-development
```

**⚠️ Soubory v .gitignore (NECOMMITUJÍ se):**
- `api/vehicle/.env` (PROD credentials)
- `.env` (DEV config - ale má se commitnout .env.example)
- `build/` (generované buildy)
- `node_modules/`

---

## 📞 Kontakt

Pro deployment otázky kontaktovat vývojový tým.

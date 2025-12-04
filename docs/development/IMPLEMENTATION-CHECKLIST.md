# ERDMS Platform - Implementační checklist

**Datum:** 4. prosince 2025  
**Status:** 📋 Připraveno k realizaci  
**Odhadovaná doba:** 1-2 hodiny

---

## 📋 Implementační kroky

### FÁZE 1: Záloha a příprava (5 minut)

- [ ] Zastavit dev servery (`./dev-stop.sh`)
- [ ] Git commit současného stavu
- [ ] Vytvoření zálohy DB (dump)
- [ ] Záloha `/var/www/` do `/var/www/__BCK_erdms_20251204/`

**Příkazy:**
```bash
cd /var/www/eeo2025
./dev-stop.sh
git add -A
git commit -m "Pre-reorganization commit - before ERDMS platform restructure"

# Záloha DB
mysqldump -h 10.3.172.11 -u erdms_user -p eeo2025_dev > ~/eeo2025_dev_backup.sql

# Záloha složek
sudo cp -r /var/www/eeo2025 /var/www/__BCK_/eeo2025_20251204
sudo cp -r /var/www/erdms_oldapi /var/www/__BCK_/erdms_oldapi_20251204
```

---

### FÁZE 2: Reorganizace složek (10 minut)

#### 2.1 Přejmenování hlavního projektu
- [ ] Přejmenovat `/var/www/eeo2025/` → `/var/www/erdms-dev/`

```bash
sudo mv /var/www/eeo2025 /var/www/erdms-dev
```

#### 2.2 Vytvoření nové struktury
- [ ] Vytvořit složky pro ERDMS platformu

```bash
cd /var/www/erdms-dev

# Auth API (bude vyextrahováno později)
sudo mkdir -p auth-api/src/{config,services,routes,middleware}

# Dashboard (nový React projekt)
sudo mkdir -p dashboard/src/components

# Apps struktura
sudo mkdir -p apps/eeo-v2/{client,api,api-legacy}

# Shared resources
sudo mkdir -p ../erdms-shared/{uploads,logs,doc/prilohy}

# Build struktura
sudo mkdir -p ../erdms-builds/{releases}
```

#### 2.3 Přesun PHP API
- [ ] Přesunout legacy PHP API

```bash
sudo mv /var/www/erdms_oldapi/api.eeo /var/www/erdms-dev/apps/eeo-v2/api-legacy/
sudo rm -rf /var/www/erdms_oldapi
```

#### 2.4 Vyčištění
- [ ] Smazat starý erdms build

```bash
sudo rm -rf /var/www/erdms
```

#### 2.5 Práva
- [ ] Nastavit správné oprávnění

```bash
sudo chown -R $USER:www-data /var/www/erdms-dev
sudo chown -R www-data:www-data /var/www/erdms-shared
sudo chown -R www-data:www-data /var/www/erdms-builds
sudo chmod -R 775 /var/www/erdms-dev
```

---

### FÁZE 3: Přesun současného kódu (20 minut)

#### 3.1 Přesun EEO kódu
- [ ] Client → `apps/eeo-v2/client/`

```bash
cd /var/www/erdms-dev
# Client už je, jen necháme kde je a později přesuneme
```

#### 3.2 Přesun Server kódu
- [ ] Server → `apps/eeo-v2/api/`

```bash
# Server také necháme zatím kde je
# V další fázi vyextrahujeme auth části
```

---

### FÁZE 4: Extrakce Auth API (30 minut)

#### 4.1 Vytvoření Auth API struktury
- [ ] Zkopírovat auth související soubory z `server/src/` do `auth-api/src/`

**Soubory k přesunutí:**
```bash
# Config
cp server/src/config/entraConfig.js auth-api/src/config/

# Services
cp server/src/services/authService.js auth-api/src/services/
cp server/src/services/entraService.js auth-api/src/services/

# Routes
cp server/src/routes/auth.js auth-api/src/routes/
cp server/src/routes/entra.js auth-api/src/routes/

# Middleware
cp server/src/middleware/authMiddleware.js auth-api/src/middleware/
```

#### 4.2 Vytvoření Auth API entry point
- [ ] Vytvořit `auth-api/src/index.js`
- [ ] Vytvořit `auth-api/package.json`
- [ ] Zkopírovat `.env` a upravit na auth API

#### 4.3 Odstranění auth kódu z EEO API
- [ ] Smazat auth soubory z `server/src/`
- [ ] Aktualizovat `server/src/index.js` - odebrat auth routes

---

### FÁZE 5: Vytvoření Dashboard (30 minut)

#### 5.1 Inicializace React projektu
- [ ] Vytvořit nový Vite projekt pro dashboard

```bash
cd /var/www/erdms-dev/dashboard
npm create vite@latest . -- --template react
```

#### 5.2 Instalace závislostí
- [ ] Nainstalovat MSAL knihovny

```bash
npm install @azure/msal-browser @azure/msal-react
npm install react-router-dom
```

#### 5.3 Vytvoření komponent
- [ ] `src/components/LoginPage.jsx` - Login přes MS 365
- [ ] `src/components/Dashboard.jsx` - Výběr aplikací
- [ ] `src/components/AppCard.jsx` - Karta pro každou aplikaci
- [ ] `src/config/authConfig.js` - MSAL konfigurace

#### 5.4 Konfigurace
- [ ] Zkopírovat auth config z původního client/
- [ ] Nastavit routing
- [ ] Nastavit Vite config

---

### FÁZE 6: Update konfigurace (15 minut)

#### 6.1 Git konfigurace
- [ ] Aktualizovat `.gitignore`
- [ ] Přidat nové složky do Git

```bash
cd /var/www/erdms-dev
git add -A
git status
```

#### 6.2 Environment files
- [ ] Vytvořit `.env.development` pro Auth API
- [ ] Vytvořit `.env.development` pro Dashboard
- [ ] Aktualizovat `.env.development` pro EEO API

#### 6.3 Package.json
- [ ] Aktualizovat `name` v package.json souborech
- [ ] Zkontrolovat dependencies

---

### FÁZE 7: Dev skripty (10 minut)

#### 7.1 Aktualizace dev-start.sh
- [ ] Upravit `dev-start.sh` pro multi-service start

```bash
#!/bin/bash
# Spustí všechny služby pro vývoj

# Auth API (port 3000)
cd /var/www/erdms-dev/auth-api
npm install
npm run dev &

# Dashboard (port 5173)
cd /var/www/erdms-dev/dashboard
npm install
npm run dev &

# EEO API (port 3001)
cd /var/www/erdms-dev/apps/eeo-v2/api
npm install
PORT=3001 npm run dev &

# EEO Client (port 5174)
cd /var/www/erdms-dev/apps/eeo-v2/client
npm install
npm run dev -- --port 5174 &
```

#### 7.2 Aktualizace dev-stop.sh
- [ ] Upravit pro zastavení všech služeb

---

### FÁZE 8: Build skripty (15 minut)

#### 8.1 Vytvoření scripts/
- [ ] `scripts/build-release.sh` - Build všech komponent
- [ ] `scripts/deploy.sh` - Deploy na produkci
- [ ] `scripts/rollback.sh` - Rollback na předchozí verzi

#### 8.2 Test build procesu
- [ ] Spustit první test build

```bash
cd /var/www/erdms-dev
./scripts/build-release.sh v0.1.0
```

---

### FÁZE 9: NGINX konfigurace (10 minut)

#### 9.1 Dev doména
- [ ] Vytvořit `/etc/nginx/sites-available/erdms-dev.zachranka.cz`
- [ ] Enable site
- [ ] Test konfigurace

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### 9.2 SSL certifikát
- [ ] Získat certifikát pro `erdms-dev.zachranka.cz`

```bash
sudo certbot --nginx -d erdms-dev.zachranka.cz
```

---

### FÁZE 10: Databáze (5 minut)

#### 10.1 Přejmenování DB
- [ ] Ponechat `eeo2025_dev` (bude se používat pro EEO app)
- [ ] Vytvořit `erdms_dev` pro Auth API

```sql
CREATE DATABASE erdms_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci;
GRANT ALL PRIVILEGES ON erdms_dev.* TO 'erdms_user'@'%';
```

---

### FÁZE 11: Test a verifikace (10 minut)

#### 11.1 Spuštění dev prostředí
- [ ] Spustit všechny služby

```bash
cd /var/www/erdms-dev
./dev-start.sh
```

#### 11.2 Test endpointů
- [ ] `http://localhost:3000/api/auth/health` - Auth API
- [ ] `http://localhost:3001/api/eeo/health` - EEO API
- [ ] `http://localhost:5173` - Dashboard
- [ ] `http://localhost:5174` - EEO Client

#### 11.3 Test přihlášení
- [ ] Login přes Dashboard
- [ ] Přepnutí na EEO aplikaci
- [ ] Test API volání

---

### FÁZE 12: Dokumentace (5 minut)

#### 12.1 Update README
- [ ] Aktualizovat hlavní README.md
- [ ] Dokumentovat novou strukturu
- [ ] Update návodu na spuštění

#### 12.2 Git commit
- [ ] Commit všech změn

```bash
git add -A
git commit -m "Reorganization to ERDMS platform - complete restructure"
git push origin main
```

---

## 📊 Časový odhad

| Fáze | Úkol | Čas |
|------|------|-----|
| 1 | Záloha a příprava | 5 min |
| 2 | Reorganizace složek | 10 min |
| 3 | Přesun kódu | 20 min |
| 4 | Extrakce Auth API | 30 min |
| 5 | Vytvoření Dashboard | 30 min |
| 6 | Update konfigurace | 15 min |
| 7 | Dev skripty | 10 min |
| 8 | Build skripty | 15 min |
| 9 | NGINX | 10 min |
| 10 | Databáze | 5 min |
| 11 | Test | 10 min |
| 12 | Dokumentace | 5 min |
| **CELKEM** | | **~2.5 hodiny** |

---

## ⚠️ Rizika a zálohy

### Rollback plán
Pokud něco selže:

```bash
# 1. Zastavit všechny služby
sudo systemctl stop erdms-*

# 2. Vrátit složky
sudo rm -rf /var/www/erdms-dev
sudo mv /var/www/__BCK_/eeo2025_20251204 /var/www/eeo2025
sudo mv /var/www/__BCK_/erdms_oldapi_20251204 /var/www/erdms_oldapi

# 3. Vrátit DB
mysql -h 10.3.172.11 -u erdms_user -p eeo2025_dev < ~/eeo2025_dev_backup.sql

# 4. Vrátit NGINX
sudo rm /etc/nginx/sites-enabled/erdms-dev.zachranka.cz
sudo systemctl reload nginx

# 5. Spustit původní dev
cd /var/www/eeo2025
./dev-start.sh
```

---

## ✅ Kritéria úspěchu

Po dokončení implementace musí fungovat:

- [ ] Login přes MS 365 na `http://localhost:5173`
- [ ] Dashboard zobrazuje dostupné aplikace
- [ ] Kliknutí na EEO otevře EEO aplikaci
- [ ] Auth API běží a odpovídá na `/api/auth/health`
- [ ] EEO API běží a odpovídá na `/api/eeo/health`
- [ ] Session/token se sdílí mezi Dashboard a EEO
- [ ] Build proces vytvoří release v `erdms-builds/`
- [ ] Git obsahuje všechny změny

---

**Status:** 📋 Připraveno - čeká na spuštění  
**Příkaz k zahájení:** `cd /var/www/eeo2025 && ./dev-stop.sh`

# 🚀 ERDMS Multi-App Deployment Guide

**Server:** erdms.zachranka.cz (10.1.1.51)  
**Datum:** 5. prosince 2025

## 📋 Přehled Aplikací

| Path | Aplikace | Auth | Port | Tech Stack |
|------|----------|------|------|------------|
| `/` | Dashboard | Entra ID | - | Vite + React + MSAL |
| `/eeov2/` | EEO2025 | DB → Entra | - | React + CRA |
| `/api/auth` | Auth Backend | - | 3000 | Node.js + Express |
| `/api.eeo/` | EEO PHP API | - | - | PHP + MariaDB |
| `/api/eeo-node` | EEO Node API | - | 5000 | Node.js + Express |

---

## 🔧 KROK 1: Příprava Prostředí

### A. Instalace Node.js a npm
```bash
# Ověření verze
node --version  # v18+ doporučeno
npm --version
```

### B. Instalace závislostí
```bash
cd /var/www/erdms-dev

# Dashboard
cd dashboard && npm install && cd ..

# Auth API
cd auth-api && npm install && cd ..

# EEO Client
cd apps/eeo-v2/client && npm install && cd ../../..

# EEO Node API
cd apps/eeo-v2/api && npm install && cd ../../..
```

### C. Vytvoření log directories
```bash
mkdir -p /var/www/erdms-dev/auth-api/logs
mkdir -p /var/www/erdms-dev/apps/eeo-v2/api/logs
mkdir -p /var/www/erdms-dev/prilohy
```

---

## 🏗️ KROK 2: Build Aplikací

### Automatický build (DOPORUČENO)
```bash
cd /var/www/erdms-dev
./build-multiapp.sh
```

### Manuální build

#### Dashboard (/)
```bash
cd /var/www/erdms-dev/dashboard
npm run build
# Output: dist/
```

#### EEO2025 (/eeov2/)
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
PUBLIC_URL=/eeov2 npm run build
# Output: build/

# Kopírovat .htaccess pro subdirectory routing
cp .htaccess.subdirectory build/.htaccess
```

**⚠️ KRITICKÉ:** EEO2025 **MUSÍ** být buildována s `PUBLIC_URL=/eeov2`, jinak nefunguje routing!

---

## 🌐 KROK 3: Konfigurace Apache

### A. Kopírování konfigurace
```bash
sudo cp /var/www/erdms-dev/docs/deployment/apache-erdms-multiapp.conf \
        /etc/apache2/sites-available/erdms.conf
```

### B. Povolení potřebných modulů
```bash
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod ssl
sudo a2enmod expires
```

### C. Aktivace site
```bash
# Disable default site (optional)
sudo a2dissite 000-default.conf

# Enable ERDMS site
sudo a2ensite erdms.conf

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

### D. SSL Certifikáty (Let's Encrypt)
```bash
# Instalace Certbot
sudo apt install certbot python3-certbot-apache

# Získání SSL certifikátu
sudo certbot --apache -d erdms.zachranka.cz

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## 🔐 KROK 4: Konfigurace .env souborů

### Auth API (.env)
```bash
cd /var/www/erdms-dev/auth-api
cp .env.example .env
nano .env
```

**Vyplnit:**
```env
# Microsoft Entra ID
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Database
DB_HOST=your-db-server
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=erdms
DB_PORT=3306

# Session
SESSION_SECRET=generate-random-secret-here

# Server
PORT=3000
NODE_ENV=production
```

### EEO Node API (.env.production)
```bash
cd /var/www/erdms-dev/apps/eeo-v2/api
cp .env.example .env.production
nano .env.production
```

**Vyplnit:**
```env
# Database
DB_HOST=your-db-server
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=eeo2025
DB_PORT=3306

# Server
PORT=5000
NODE_ENV=production
```

### Dashboard (.env.production)
```bash
cd /var/www/erdms-dev/dashboard
nano .env.production
```

**Vyplnit:**
```env
VITE_API_URL=https://erdms.zachranka.cz/api/auth
VITE_MSAL_CLIENT_ID=your-client-id
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
VITE_MSAL_REDIRECT_URI=https://erdms.zachranka.cz/auth/callback
```

---

## 🚀 KROK 5: Spuštění Backend Služeb

### Automatický start (DOPORUČENO)
```bash
cd /var/www/erdms-dev
./start-multiapp.sh
```

### Manuální start

#### Auth API
```bash
cd /var/www/erdms-dev/auth-api
nohup npm start > logs/auth-api.log 2>&1 &
echo $! > logs/auth-api.pid
```

#### EEO Node API
```bash
cd /var/www/erdms-dev/apps/eeo-v2/api
nohup npm start > logs/eeo-api.log 2>&1 &
echo $! > logs/eeo-api.pid
```

### Ověření běžících služeb
```bash
# Check ports
sudo lsof -i :3000  # Auth API
sudo lsof -i :5000  # EEO API

# Check logs
tail -f /var/www/erdms-dev/auth-api/logs/auth-api.log
tail -f /var/www/erdms-dev/apps/eeo-v2/api/logs/eeo-api.log
```

---

## ✅ KROK 6: Testování

### A. Test Apache
```bash
# Status
sudo systemctl status apache2

# Logs
sudo tail -f /var/log/apache2/erdms-error.log
sudo tail -f /var/log/apache2/erdms-access.log
```

### B. Test Aplikací

#### Dashboard (/)
```bash
curl -I https://erdms.zachranka.cz/
# Expected: 200 OK + HTML content
```

#### EEO2025 (/eeov2/)
```bash
curl -I https://erdms.zachranka.cz/eeov2/
# Expected: 200 OK + HTML content
```

#### Auth API
```bash
curl https://erdms.zachranka.cz/api/auth/health
# Expected: {"status":"ok"}
```

#### PHP API
```bash
curl https://erdms.zachranka.cz/api.eeo/api.php
# Expected: JSON response
```

### C. Test v prohlížeči

1. **Dashboard:** https://erdms.zachranka.cz/
   - Mělo by přesměrovat na Entra ID login
   - Po přihlášení zobrazit dashboard

2. **EEO2025:** https://erdms.zachranka.cz/eeov2/
   - Mělo by zobrazit login dialog (DB auth)
   - Po přihlášení zobrazit menu EEO aplikace

---

## 🔄 KROK 7: Systemd Services (Optional)

Pro automatický start při restartu serveru:

### Auth API Service
```bash
sudo nano /etc/systemd/system/erdms-auth-api.service
```

```ini
[Unit]
Description=ERDMS Auth API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/erdms-dev/auth-api
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### EEO Node API Service
```bash
sudo nano /etc/systemd/system/erdms-eeo-api.service
```

```ini
[Unit]
Description=ERDMS EEO Node API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/erdms-dev/apps/eeo-v2/api
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Aktivace services
```bash
sudo systemctl daemon-reload
sudo systemctl enable erdms-auth-api
sudo systemctl enable erdms-eeo-api
sudo systemctl start erdms-auth-api
sudo systemctl start erdms-eeo-api

# Status check
sudo systemctl status erdms-auth-api
sudo systemctl status erdms-eeo-api
```

---

## 🛑 Zastavení Služeb

### Automatické zastavení
```bash
cd /var/www/erdms-dev
./stop-multiapp.sh
```

### Manuální zastavení
```bash
# Using PID files
kill $(cat /var/www/erdms-dev/auth-api/logs/auth-api.pid)
kill $(cat /var/www/erdms-dev/apps/eeo-v2/api/logs/eeo-api.pid)

# Or by port
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:5000 | xargs kill -9
```

### Systemd services
```bash
sudo systemctl stop erdms-auth-api
sudo systemctl stop erdms-eeo-api
```

---

## 🔍 Troubleshooting

### Problem: EEO2025 routing nefunguje
**Řešení:**
```bash
# Zkontrolovat PUBLIC_URL při buildu
cd /var/www/erdms-dev/apps/eeo-v2/client
PUBLIC_URL=/eeov2 npm run build

# Zkontrolovat .htaccess
cat build/.htaccess
# Mělo by obsahovat RewriteBase /eeov2/
```

### Problem: 404 na /eeov2/
**Řešení:**
```bash
# Zkontrolovat Apache alias
grep -A 5 "Alias /eeov2" /etc/apache2/sites-enabled/erdms.conf

# Zkontrolovat adresář
ls -la /var/www/erdms-dev/apps/eeo-v2/client/build/
```

### Problem: API nepřístupné
**Řešení:**
```bash
# Zkontrolovat běžící procesy
sudo lsof -i :3000
sudo lsof -i :5000

# Zkontrolovat logy
tail -f /var/www/erdms-dev/auth-api/logs/auth-api.log
tail -f /var/www/erdms-dev/apps/eeo-v2/api/logs/eeo-api.log
```

### Problem: CORS errors
**Řešení:**
```bash
# Zkontrolovat Apache headers
grep -A 3 "CORS" /etc/apache2/sites-enabled/erdms.conf

# Restart Apache
sudo systemctl restart apache2
```

---

## 📊 Monitoring

### Log Files
```bash
# Apache
sudo tail -f /var/log/apache2/erdms-error.log
sudo tail -f /var/log/apache2/erdms-access.log

# Auth API
tail -f /var/www/erdms-dev/auth-api/logs/auth-api.log

# EEO API
tail -f /var/www/erdms-dev/apps/eeo-v2/api/logs/eeo-api.log

# PHP errors
sudo tail -f /tmp/php_errors.log
```

### Process Status
```bash
# Check running services
ps aux | grep node

# Check ports
sudo netstat -tlnp | grep -E ':(3000|5000|80|443)'
```

---

## 🔄 Update Workflow

### 1. Pull změny z Git
```bash
cd /var/www/erdms-dev
git pull origin main
```

### 2. Rebuild aplikace
```bash
./build-multiapp.sh
```

### 3. Restart services
```bash
./stop-multiapp.sh
./start-multiapp.sh
```

### 4. Restart Apache (pokud byla změna v konfiguraci)
```bash
sudo systemctl restart apache2
```

---

## 📝 Checklist Deployment

- [ ] Node.js a npm nainstalováno
- [ ] Všechny `npm install` provedeny
- [ ] `.env` soubory vytvořeny a vyplněny
- [ ] Build všech aplikací úspěšný
- [ ] Apache konfigurace zkopírována
- [ ] Apache moduly povoleny
- [ ] SSL certifikáty nastaveny
- [ ] Apache restart úspěšný
- [ ] Backend služby spuštěny
- [ ] Test dashboard (/) - OK
- [ ] Test EEO2025 (/eeov2/) - OK
- [ ] Test API endpointů - OK
- [ ] Systemd services nakonfigurovány (optional)
- [ ] Monitoring setup (optional)

---

## 📞 Support

V případě problémů:
1. Zkontrolovat logy (Apache + Node.js)
2. Ověřit běžící procesy
3. Test jednotlivých komponent
4. Kontaktovat dev team

**Developer:** Robert Holovský  
**Email:** robert.holovsky@zachranka.cz

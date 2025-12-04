# ERDMS Platform - Finální architektura

**Datum:** 4. prosince 2025  
**Status:** ✅ SCHVÁLENO - Připraveno k implementaci  
**Verze:** 1.0

---

## 🎯 Přehled

**ERDMS** (Elektronický Registr a Dokumentační Management Systém) je platforma pro správu více aplikací pod jednou doménou s jednotným přihlášením přes Microsoft Entra ID.

### Klíčové vlastnosti:
- ✅ Jednotné přihlášení (SSO) pro všechny aplikace
- ✅ Centrální dashboard pro výběr aplikací
- ✅ Sdílená autentizace a správa uživatelů
- ✅ Oddělené API a DB pro každou aplikaci
- ✅ Verzování a rollback celé platformy

---

## 🏗️ Koncept: ERDMS jako platforma

```
https://erdms.zachranka.cz
    ↓
┌─────────────────────────────────────────┐
│  ERDMS Platform (Elektronický registr) │
│  - Jednotné přihlášení (MS 365/Entra)  │
│  - Dashboard s aplikacemi               │
│  - Správa uživatelů a oprávnění        │
└─────────────────────────────────────────┘
    ↓
┌────────────┬────────────┬────────────┐
│ EEO v2     │ Intranet   │ Další app  │
│ (Smlouvy)  │            │            │
└────────────┴────────────┴────────────┘
```

---

## 📁 Finální struktura `/var/www/`

### PRODUKCE

```
/var/www/
│
├── erdms/                              # 🏠 HLAVNÍ PLATFORMA
│   │
│   ├── auth-api/                       # 🔐 SDÍLENÉ AUTENTIZACE API
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── entraConfig.js
│   │   │   ├── services/
│   │   │   │   ├── authService.js      # EntraID autentizace
│   │   │   │   ├── entraService.js     # Graph API
│   │   │   │   └── userService.js      # User management
│   │   │   ├── routes/
│   │   │   │   ├── auth.js             # /api/auth/* (login, callback, logout)
│   │   │   │   └── users.js            # /api/users/* (user CRUD)
│   │   │   ├── middleware/
│   │   │   │   └── authMiddleware.js
│   │   │   └── index.js
│   │   ├── package.json
│   │   ├── .env.development
│   │   ├── .env.production
│   │   └── README.md
│   │
│   ├── dashboard/                      # 📊 HLAVNÍ DASHBOARD
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── LoginPage.jsx       # MS 365 login
│   │   │   │   ├── Dashboard.jsx       # Výběr aplikací
│   │   │   │   └── AppCard.jsx         # Karta pro každou app
│   │   │   ├── config/
│   │   │   │   └── authConfig.js
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   └── dist/                       # Build
│   │
│   ├── apps/                           # 📦 APLIKACE
│   │   │
│   │   ├── eeo-v2/                     # Evidence smluv
│   │   │   ├── client/
│   │   │   │   ├── src/
│   │   │   │   ├── dist/               # Build
│   │   │   │   └── package.json
│   │   │   ├── api/                    # Node.js API
│   │   │   │   ├── src/
│   │   │   │   │   ├── services/       # EEO business logika
│   │   │   │   │   └── routes/         # /api/eeo/*
│   │   │   │   └── package.json
│   │   │   └── api-legacy/             # PHP API (stará verze)
│   │   │       └── api.eeo/
│   │   │
│   │   └── intranet/                   # Budoucí aplikace
│   │       ├── client/
│   │       └── api/
│   │
│   └── shared/                         # 📂 SDÍLENÉ RESOURCES
│       ├── uploads/
│       ├── doc/prilohy/
│       └── logs/
│
├── erdms-dev/                          # 🔧 DEVELOPMENT COPY
│   ├── auth-api/
│   ├── dashboard/
│   └── apps/
│
└── erdms-builds/                       # 🚀 PRODUCTION RELEASES
    ├── current -> releases/v1.2.3/
    └── releases/
        ├── v1.2.3/
        ├── v1.2.2/
        └── v1.2.1/
```

---

## 🌐 URL Struktura

### Development
```
http://localhost:5173/              → Dashboard (dev)
http://localhost:3000/api/auth/*    → Auth API
http://localhost:3001/api/eeo/*     → EEO API

https://erdms-dev.zachranka.cz/               → Dashboard
https://erdms-dev.zachranka.cz/api/auth/*     → Auth API
https://erdms-dev.zachranka.cz/apps/eeo       → EEO app
https://erdms-dev.zachranka.cz/api/eeo/*      → EEO API
```

### Production
```
https://erdms.zachranka.cz/                   → Dashboard + Login
https://erdms.zachranka.cz/api/auth/*         → Auth API (sdílené)
https://erdms.zachranka.cz/api/users/*        → User management

https://erdms.zachranka.cz/apps/eeo           → EEO aplikace
https://erdms.zachranka.cz/api/eeo/*          → EEO API (Node.js)
https://erdms.zachranka.cz/api/eeo-legacy/*   → EEO API (PHP - fallback)

https://erdms.zachranka.cz/apps/intranet      → Intranet (budoucí)
https://erdms.zachranka.cz/api/intranet/*     → Intranet API
```

---

## 🔄 Workflow: Dev → Production

### 1. Development (Git workspace)

```
/var/www/erdms-dev/             # Git repository (main branch)
├── auth-api/                   # Vývoj auth API
├── dashboard/                  # Vývoj dashboardu
└── apps/
    └── eeo-v2/
        ├── client/             # React dev (npm run dev)
        └── api/                # Node.js dev (nodemon)
```

**Lokální vývoj:**
```bash
cd /var/www/erdms-dev

# Spustit vše
./dev-start.sh

# Auth API (port 3000)
# EEO API (port 3001)
# Dashboard (port 5173)
# EEO Client (port 5174)
```

---

### 2. Build pro produkci

```bash
cd /var/www/erdms-dev
./scripts/build-release.sh v1.2.3

# Vytvoří:
/var/www/erdms-builds/releases/v1.2.3/
├── auth-api/
│   └── src/                    # Node.js (ready to run)
├── dashboard/
│   └── dist/                   # Static files
└── apps/
    └── eeo-v2/
        ├── client/dist/        # Static files
        └── api/src/            # Node.js (ready to run)
```

---

### 3. Deploy produkce

```bash
./scripts/deploy.sh v1.2.3

# Přepne symlink:
/var/www/erdms-builds/current -> releases/v1.2.3/

# Restartuje services:
systemctl restart erdms-auth-api
systemctl restart erdms-eeo-api
systemctl reload nginx
```

---

## 🎯 NGINX Konfigurace

### Development domain
```nginx
# /etc/nginx/sites-available/erdms-dev.zachranka.cz

server {
    server_name erdms-dev.zachranka.cz;
    listen 443 ssl;
    
    # Root pro static files
    root /var/www/erdms-dev;
    
    # Dashboard (hlavní stránka)
    location / {
        root /var/www/erdms-dev/dashboard/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Auth API
    location /api/auth/ {
        proxy_pass http://localhost:3000/api/auth/;
    }
    
    location /api/users/ {
        proxy_pass http://localhost:3000/api/users/;
    }
    
    # EEO App (React)
    location /apps/eeo {
        alias /var/www/erdms-dev/apps/eeo-v2/client/dist;
        try_files $uri $uri/ /apps/eeo/index.html;
    }
    
    # EEO API (Node.js)
    location /api/eeo/ {
        proxy_pass http://localhost:3001/api/eeo/;
    }
    
    # EEO Legacy API (PHP)
    location /api/eeo-legacy/ {
        root /var/www/erdms-dev/apps/eeo-v2/api-legacy;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    ssl_certificate /etc/letsencrypt/live/erdms-dev.zachranka.cz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erdms-dev.zachranka.cz/privkey.pem;
}
```

### Production domain
```nginx
# /etc/nginx/sites-available/erdms.zachranka.cz

server {
    server_name erdms.zachranka.cz;
    listen 443 ssl;
    
    # Dashboard (hlavní stránka)
    location / {
        root /var/www/erdms-builds/current/dashboard/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Auth API (sdílené pro všechny apps)
    location /api/auth/ {
        proxy_pass http://localhost:4000/api/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/users/ {
        proxy_pass http://localhost:4000/api/users/;
    }
    
    # EEO App
    location /apps/eeo {
        alias /var/www/erdms-builds/current/apps/eeo-v2/client/dist;
        try_files $uri $uri/ /apps/eeo/index.html;
    }
    
    # EEO API
    location /api/eeo/ {
        proxy_pass http://localhost:4001/api/eeo/;
    }
    
    # EEO Legacy API (PHP fallback)
    location /api/eeo-legacy/ {
        root /var/www/erdms-builds/current/apps/eeo-v2/api-legacy;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        include fastcgi_params;
    }
    
    ssl_certificate /etc/letsencrypt/live/erdms.zachranka.cz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erdms.zachranka.cz/privkey.pem;
}
```

---

## 🗄️ Databáze

```
MariaDB:
├── erdms               # Auth DB (users, roles, permissions) - SDÍLENÁ
├── erdms_dev           # Auth DB (development)
│
├── eeo2025             # EEO business data (orders, invoices, cashbook)
└── eeo2025_dev         # EEO dev data
```

---

## 📦 Systemd Services

```ini
# /etc/systemd/system/erdms-auth-api.service
[Unit]
Description=ERDMS Authentication API
After=network.target mariadb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/erdms-builds/current/auth-api
Environment="NODE_ENV=production"
Environment="PORT=4000"
ExecStart=/usr/bin/node src/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/erdms-eeo-api.service
[Unit]
Description=ERDMS EEO API
After=network.target erdms-auth-api.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/erdms-builds/current/apps/eeo-v2/api
Environment="NODE_ENV=production"
Environment="PORT=4001"
ExecStart=/usr/bin/node src/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 🚀 Implementační plán

### FÁZE 1: Reorganizace (TEĎ)

```bash
# 1. Přejmenovat současný projekt
sudo mv /var/www/eeo2025 /var/www/erdms-dev

# 2. Vytvořit novou strukturu
sudo mkdir -p /var/www/erdms-dev/auth-api
sudo mkdir -p /var/www/erdms-dev/dashboard
sudo mkdir -p /var/www/erdms-dev/apps/eeo-v2/{client,api,api-legacy}

# 3. Přesunout současný kód
# Auth API (vyextrahovat z server/)
# Dashboard (vyextrahovat z client/)
# EEO (zbytek)

# 4. Přesunout PHP API
sudo mv /var/www/erdms_oldapi /var/www/erdms-dev/apps/eeo-v2/api-legacy

# 5. Vytvořit build strukturu
sudo mkdir -p /var/www/erdms-builds/{current,releases}

# 6. Sdílené resources
sudo mkdir -p /var/www/erdms-shared/{uploads,logs}
```

### FÁZE 2: Refactor kódu (hodiny)

1. **Vyextrahovat Auth API** z `eeo2025/server/` → `erdms-dev/auth-api/`
2. **Vytvořit Dashboard** (nový React projekt)
3. **Přesunout EEO kód** → `erdms-dev/apps/eeo-v2/`
4. **Aktualizovat importy** a cesty

### FÁZE 3: Build + Deploy (setup)

1. Vytvořit build skripty
2. Vytvořit systemd services
3. Nastavit NGINX
4. První production build

---

## ✅ Co to přinese

1. **Jednotný vstup:** `erdms.zachranka.cz` → jeden login pro vše
2. **Oddělené aplikace:** Každá má vlastní API, logiku, frontend
3. **Sdílená autentizace:** Auth API používají všechny aplikace
4. **Škálovatelnost:** Snadno přidáš Intranet, další aplikace
5. **Verzování:** Rollback celé platformy najednou

---

## 🤔 Co na to?

Je tohle přesně to, co chceš? 

- ✅ ERDMS jako platforma
- ✅ Auth API oddělené
- ✅ EEO jako jedna z aplikací
- ✅ Připraveno pro Intranet
- ✅ Dev/Prod oddělené

**Můžu začít s reorganizací?** 🚀

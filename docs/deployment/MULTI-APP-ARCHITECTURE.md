# 🏗️ ERDMS Multi-App Architecture

**Server:** erdms.zachranka.cz (10.1.1.51)  
**Datum:** 5. prosince 2025

## 📋 Struktura Aplikací

```
erdms.zachranka.cz/              → Dashboard (Entra ID auth) [Vite/React]
erdms.zachranka.cz/eeov2/        → EEO2025 App (DB login → Entra ID) [React]
erdms.zachranka.cz/intranet/     → Budoucí Intranet (připraveno)
```

## 🎯 Routing Strategie

### 1. **Root Path (/) - Dashboard s Entra ID**
- Aplikace: `/var/www/erdms-dev/dashboard/`
- Build: `npm run build` → `dist/`
- Auth: Microsoft Entra ID (MSAL)
- Backend API: `/var/www/erdms-dev/auth-api/` (port 3000)

### 2. **Subdirectory (/eeov2/) - EEO2025 React App**
- Aplikace: `/var/www/erdms-dev/apps/eeo-v2/client/`
- Build: `npm run build` → `build/`
- Auth: DB login (dočasně) → pak Entra ID
- Backend API: 
  - PHP Legacy: `/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/`
  - Node.js: `/var/www/erdms-dev/apps/eeo-v2/api/` (port 5000)

### 3. **Subdirectory (/intranet/) - Budoucí Intranet**
- Připraveno pro další aplikaci
- TBD

## 🔧 Konfigurace

### Apache VirtualHost
Soubor: `/etc/apache2/sites-available/erdms.conf`

### React Router - PUBLIC_URL
EEO2025 app musí být buildována s `PUBLIC_URL=/eeov2`:
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
PUBLIC_URL=/eeov2 npm run build
```

### .htaccess pro SPA routing
Každá subdirectory potřebuje vlastní `.htaccess` pro React Router.

## 📦 Build Proces

```bash
# Dashboard (root)
cd /var/www/erdms-dev/dashboard
npm run build
# Output: dist/

# EEO2025 (/eeov2)
cd /var/www/erdms-dev/apps/eeo-v2/client
PUBLIC_URL=/eeov2 npm run build
# Output: build/
```

## 🚀 Deployment

1. Build všechny aplikace
2. Aktualizovat Apache config
3. Restart Apache: `sudo systemctl restart apache2`
4. Spustit backend services:
   - Auth API: `cd /var/www/erdms-dev/auth-api && npm start`
   - EEO API: `cd /var/www/erdms-dev/apps/eeo-v2/api && npm start`

## 🔐 Authentication Flow

### Dashboard (/)
```
User → erdms.zachranka.cz
     → Redirect to Microsoft Entra login
     → Callback: /auth/callback
     → Dashboard with user info
```

### EEO2025 (/eeov2/)
```
FÁZE 1 (současný stav):
User → erdms.zachranka.cz/eeov2
     → Login dialog (DB username/password)
     → API: POST /api.eeo/user/login
     → Token stored in localStorage
     → App with menu

FÁZE 2 (upgrade):
User → erdms.zachranka.cz/eeov2
     → Redirect to Microsoft Entra login
     → Callback: /eeov2/auth/callback
     → App with menu
```

## 📊 Port Allocation

| Service | Port | Description |
|---------|------|-------------|
| Apache | 80/443 | Web server (all apps) |
| Auth API | 3000 | Entra ID authentication backend |
| EEO Node API | 5000 | EEO2025 Node.js backend |
| Dashboard Dev | 5173 | Vite dev server (development only) |
| EEO Dev | 3001 | React dev server (development only) |

## 🗂️ Directory Structure

```
/var/www/erdms-dev/
├── dashboard/              # Root app (/)
│   ├── dist/              # Build output
│   └── .htaccess
├── apps/
│   └── eeo-v2/
│       └── client/        # EEO2025 app (/eeov2/)
│           ├── build/     # Build output
│           └── .htaccess
├── auth-api/              # Entra ID backend (port 3000)
└── docs/
    └── deployment/
        └── apache-erdms.conf
```

## ✅ Checklist

- [ ] Nastavit Apache VirtualHost
- [ ] Konfigurovat SSL certifikáty
- [ ] Build Dashboard (/)
- [ ] Build EEO2025 (/eeov2/) s PUBLIC_URL
- [ ] Vytvořit .htaccess pro obě aplikace
- [ ] Spustit Auth API backend
- [ ] Spustit EEO Node API backend
- [ ] Otestovat routing pro všechny paths
- [ ] Ověřit Entra ID login na /
- [ ] Ověřit DB login na /eeov2/

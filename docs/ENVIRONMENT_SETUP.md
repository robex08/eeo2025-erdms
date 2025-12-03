# Environment Configuration Guide

## Přehled prostředí

Aplikace podporuje dva režimy:

1. **Development (localhost)** - pro lokální vývoj
2. **Production (erdms-dev.zachranka.cz)** - pro testování na dev serveru

## 🖥️ CLIENT (React + Vite)

### Environment Files

**`.env.development`** - localhost
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=ERDMS (Dev)
CLIENT_URL=http://localhost:5173
```

**`.env.production`** - erdms-dev.zachranka.cz
```env
VITE_API_URL=https://erdms-dev.zachranka.cz
VITE_APP_NAME=ERDMS
CLIENT_URL=https://erdms-dev.zachranka.cz
```

### Build Commands

```bash
cd /var/www/eeo2025/client

# Vývoj (localhost) - spustí dev server
npm run dev

# Build pro development (testování buildu s dev API)
npm run build:dev

# Build pro production (dev server erdms-dev.zachranka.cz)
npm run build
```

## 🔧 SERVER (Express + Node.js)

### Environment Files

**`.env.development`** - localhost
```env
PORT=5000
NODE_ENV=development
ENTRA_REDIRECT_URI=http://localhost:5000/auth/callback
CLIENT_URL=http://localhost:5173
```

**`.env.production`** - erdms-dev.zachranka.cz
```env
PORT=5000
NODE_ENV=production
ENTRA_REDIRECT_URI=https://erdms-dev.zachranka.cz/auth/callback
CLIENT_URL=https://erdms-dev.zachranka.cz
```

### Run Commands

```bash
cd /var/www/eeo2025/server

# Vývoj (localhost) s auto-reloadem
npm run dev

# Spuštění s development env
npm run start:dev

# Spuštění s production env
npm run start:prod
```

## 🚀 Deployment Workflow

### 1. Lokální vývoj (localhost)

```bash
# Terminal 1 - Server
cd /var/www/eeo2025/server
npm run dev

# Terminal 2 - Client
cd /var/www/eeo2025/client
npm run dev
```

Otevři: http://localhost:5173

### 2. Build pro dev server (erdms-dev.zachranka.cz)

```bash
# 1. Build clienta pro production
cd /var/www/eeo2025/client
npm run build

# 2. Výsledek je v client/dist/
# Tento adresář nakopíruj na server nebo nastav Apache
```

### 3. Apache konfigurace pro erdms-dev.zachranka.cz

Apache by měl:
- Servírovat `client/dist/` jako statické soubory
- Proxovat `/auth/*` požadavky na Node.js server (port 5000)

Příklad Apache konfigurace:

```apache
<VirtualHost *:443>
    ServerName erdms-dev.zachranka.cz
    
    DocumentRoot /var/www/eeo2025/client/dist
    
    # Statické soubory (React build)
    <Directory /var/www/eeo2025/client/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # React Router support
        RewriteEngine On
        RewriteBase /
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/auth
        RewriteRule . /index.html [L]
    </Directory>
    
    # API proxy pro /auth/* endpointy
    ProxyPreserveHost On
    ProxyPass /auth http://localhost:5000/auth
    ProxyPassReverse /auth http://localhost:5000/auth
    
    # SSL konfigurace
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem
</VirtualHost>
```

### 4. Spuštění serveru na dev serveru

```bash
cd /var/www/eeo2025/server
npm run start:prod
```

Nebo lépe - systemd service (viz dokumentace).

## ⚙️ Microsoft Entra ID Setup

**DŮLEŽITÉ:** V Azure Entra ID App Registration musíš mít registrované OBOJE redirect URI:

### Web Redirect URIs (ne SPA!)

1. `http://localhost:5000/auth/callback` - pro localhost
2. `https://erdms-dev.zachranka.cz/auth/callback` - pro dev server

⚠️ Musí být typu **Web**, ne SPA!

## 🔍 Troubleshooting

### Problem: API volání failují

**Zkontroluj:**
- Client používá správnou `VITE_API_URL`
- Server běží na správném portu
- CORS je povolen pro správný `CLIENT_URL`

### Problem: Redirect po login nefunguje

**Zkontroluj:**
- `ENTRA_REDIRECT_URI` v serveru odpovídá prostředí
- Tato URI je registrovaná v Azure jako Web Redirect URI
- `CLIENT_URL` je správně nastavená pro post-login redirect

### Problem: Build nefunguje

```bash
# Vyčisti cache a znovu nainstaluj
cd /var/www/eeo2025/client
rm -rf node_modules dist
npm install
npm run build
```

## 📝 Checklist před deploymentem

- [ ] Zkopíruj `.env.example` do `.env.development` a `.env.production`
- [ ] Vyplň skutečné hodnoty (ENTRA_CLIENT_ID, SECRET, atd.)
- [ ] Přidej obě redirect URI do Azure Entra ID
- [ ] Build clienta: `npm run build`
- [ ] Nastav Apache proxy
- [ ] Spusť server s production env: `npm run start:prod`
- [ ] Otestuj login flow

## 🆘 Quick Commands

```bash
# Vývoj - vše localhost
cd /var/www/eeo2025
npm run dev  # v obou složkách

# Production build
cd /var/www/eeo2025/client && npm run build

# Start production server
cd /var/www/eeo2025/server && npm run start:prod
```

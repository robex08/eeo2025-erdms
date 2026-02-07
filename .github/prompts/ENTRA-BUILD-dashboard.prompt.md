# ENTRA-BUILD: Dashboard Build & Deployment Guide

**Datum vytvoření:** 23. prosince 2025  
**Účel:** Správný postup pro build a nasazení hlavního ERDMS dashboardu s Microsoft Entra autentizací

---

## 📍 STRUKTURA PROJEKTU

### Production (ostré prostředí)
```
/var/www/erdms-platform/dashboard/
├── src/                          # Zdrojové soubory (React + Vite)
├── build/                        # Output folder pro production build
├── .env.production              # Production environment variables
├── vite.config.js               # Vite build configuration
├── package.json                 # Dependencies
└── node_modules/
```

### Development
```
/var/www/erdms-dev/dashboard/
├── src/                          # Dev zdrojové soubory
├── .env.development             # Dev environment variables
└── ...
```

### Apache DocumentRoot
```
/var/www/erdms-platform/dashboard/build/  ← Tady Apache servíruje produkční dashboard
```

### Release Directories (musí se tam kopírovat build)
```
/var/www/erdms-builds/releases/*/dashboard/build/
├── eeo-v2/dashboard/build/
├── 20251219-002421/dashboard/build/
├── 20251219-004806/dashboard/build/
└── ... (všechny release složky)
```

---

## ⚙️ KONFIGURACE

### 1. Environment Variables (.env.production)

```bash
# Dashboard Production Environment

# API URLs - BEZ /api prefixu!
VITE_API_URL=https://erdms.zachranka.cz
VITE_AUTH_API_URL=https://erdms.zachranka.cz/auth

# Microsoft Entra ID
VITE_ENTRA_CLIENT_ID=92eaadde-7e3e-4ad1-8c45-3b875ff5c76b
VITE_ENTRA_TENANT_ID=2bd7827b-4550-48ad-bd15-62f9a17990f1
VITE_ENTRA_AUTHORITY=https://login.microsoftonline.com/2bd7827b-4550-48ad-bd15-62f9a17990f1
VITE_REDIRECT_URI=https://erdms.zachranka.cz

# App
VITE_APP_NAME=ERDMS Dashboard
```

**DŮLEŽITÉ:**
- `VITE_AUTH_API_URL` má `/auth` endpoint (BEZ `/api` prefixu)
- Dashboard volá `/auth/login`, `/auth/me`, `/auth/logout`
- Apache musí mít ProxyPass pro `/auth` → `localhost:4000/api/auth`

### 2. Vite Configuration (vite.config.js)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build'  // ✅ DŮLEŽITÉ: ne 'dist', ale 'build'!
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

**DŮLEŽITÉ:**
- Dashboard běží na **root URL** (ne v subdirectory)
- Proto **NEMÁ** `base: '/nějaká-cesta/'` v configu
- Output folder je `build` (ne Vite default `dist`)

### 3. Apache Configuration (/etc/apache2/sites-available/erdms-proxy-production.inc)

```apache
DocumentRoot /var/www/erdms-platform/dashboard/build

<Directory /var/www/erdms-platform/dashboard/build>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
    
    # React Router - všechny requesty na index.html
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    
    # ✅ KRITICKÉ: VYNECHAT API cesty z rewrite (pro ProxyPass)
    RewriteCond %{REQUEST_URI} ^/api/ [OR]
    RewriteCond %{REQUEST_URI} ^/api\.eeo [OR]
    RewriteCond %{REQUEST_URI} ^/auth
    RewriteRule ^ - [L]
    
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</Directory>

# ✅ KRITICKÉ: ProxyPass pro Auth API (bez /api prefixu pro dashboard)
ProxyPass /auth http://localhost:4000/api/auth
ProxyPassReverse /auth http://localhost:4000/api/auth

# ProxyPass pro Auth API (s /api prefixem pro jiné aplikace)
ProxyPass /api/auth http://localhost:4000/api/auth
ProxyPassReverse /api/auth http://localhost:4000/api/auth

ProxyPass /api/users http://localhost:4000/api/users
ProxyPassReverse /api/users http://localhost:4000/api/users

ProxyPass /api/entra http://localhost:4000/api/entra
ProxyPassReverse /api/entra http://localhost:4000/api/entra
```

**KLÍČOVÉ BODY:**
1. **Rewrite výjimky MUSÍ BÝT** - jinak React Router zachytí API requesty a vrátí HTML místo proxying na Node.js
2. **Dva ProxyPass pro auth:**
   - `/auth` → pro dashboard (volá `/auth/login`, `/auth/me`)
   - `/api/auth` → pro jiné aplikace
3. **ProxyPass MUSÍ BÝT VNĚ `<Directory>` bloku** - jinak nefunguje

---

## 🔨 BUILD PROCES

### Krok 1: Příprava source kódu

**Ověř JSX syntaxi - KRITICKÉ!**

❌ **ŠPATNĚ** (způsobí React crash):
```jsx
<span style="background: linear-gradient(...)">Text</span>
```

✅ **SPRÁVNĚ** (JSX syntax):
```jsx
<span style={{ background: "linear-gradient(...)" }}>Text</span>
```

**Pravidlo:** V JSX je `style` prop **objektem**, ne stringem!

### Krok 2: Build production verze

```bash
cd /var/www/erdms-platform/dashboard

# Build pro production
npm run build

# Výstup by měl být:
# ✓ built in 1-2s
# build/index.html
# build/assets/index-[hash].js
# build/assets/index-[hash].css
```

### Krok 3: Ověření buildu

```bash
# Zkontroluj že build existuje
ls -lah /var/www/erdms-platform/dashboard/build/

# Měl bys vidět:
# - index.html
# - assets/index-[hash].js
# - assets/index-[hash].css
# - logo-ZZS.png (nebo jiné statické soubory)

# Ověř obsah (např. že obsahuje nové funkce)
grep -o "nějaký-text-který-jsi-přidal" build/assets/index-*.js
```

### Krok 4: Deployment do všech release složek

```bash
cd /var/www/erdms-platform/dashboard

# Kopíruj do všech release složek
for dir in /var/www/erdms-builds/releases/*/dashboard/build/; do
  echo "Kopíruji do: $dir"
  cp -r build/* "$dir"
done

# Reload Apache
systemctl reload apache2

echo "✅ Dashboard nasazen"
```

### Krok 5: Ověření v prohlížeči

1. Otevři https://erdms.zachranka.cz/
2. **Hard refresh:** Ctrl+Shift+R (vyprázdní cache)
3. Otevři DevTools → Network tab
4. Ověř že se načítá nový JS bundle (správný hash v názvu)
5. Ověř že `/auth/me` volá Node.js API (vrací JSON, ne HTML)

---

## 🐛 TROUBLESHOOTING

### Problém: "Unexpected token '<', '<!doctype'... is not valid JSON"

**Příčina:** Apache vrací HTML místo proxying na Node.js

**Řešení:**
1. Zkontroluj že rewrite výjimky obsahují `/auth`:
   ```apache
   RewriteCond %{REQUEST_URI} ^/auth
   RewriteRule ^ - [L]
   ```

2. Zkontroluj že ProxyPass pro `/auth` existuje:
   ```apache
   ProxyPass /auth http://localhost:4000/api/auth
   ```

3. Reload Apache: `systemctl reload apache2`

### Problém: React error #62 (Too many re-renders)

**Příčina:** Chybná JSX syntaxe (např. inline style jako string)

**Řešení:**
1. Najdi všechny `style="..."` v JSX
2. Změň na `style={{ ... }}`
3. Rebuild: `npm run build`

### Problém: Dashboard nenačítá nové funkce

**Příčina:** Browser cache nebo build není nasazen do všech složek

**Řešení:**
1. Hard refresh: Ctrl+Shift+R
2. Zkontroluj že build je v `/var/www/erdms-platform/dashboard/build/`
3. Zkontroluj že build je zkopírován do všech release složek
4. Ověř v DevTools → Network → který JS soubor se načítá

### Problém: Auth API nefunguje (401/404)

**Příčina:** Node.js Auth API neběží na portu 4000

**Řešení:**
```bash
# Ověř že Auth API běží
ss -tlnp | grep :4000

# Měl bys vidět:
# LISTEN *:4000 users:(("node",pid=...,fd=18))

# Pokud neběží, spusť ho
cd /var/www/erdms-platform/auth-api
npm start

# Nebo najdi systemd service:
systemctl status erdms-auth-api
systemctl start erdms-auth-api
```

---

## 📋 CHECKLIST PŘED DEPLOYMENT

- [ ] ✅ `.env.production` má správné URL (včetně `/auth` pro `VITE_AUTH_API_URL`)
- [ ] ✅ `vite.config.js` má `outDir: 'build'`
- [ ] ✅ Všechny inline `style` v JSX jsou objekty `style={{}}`, ne stringy
- [ ] ✅ Apache config má rewrite výjimky pro `/auth`, `/api/`, `/api.eeo`
- [ ] ✅ Apache config má ProxyPass pro `/auth` i `/api/auth`
- [ ] ✅ Node.js Auth API běží na portu 4000
- [ ] ✅ Build hotový: `npm run build`
- [ ] ✅ Build zkopírován do všech release složek
- [ ] ✅ Apache reloadován: `systemctl reload apache2`
- [ ] ✅ Hard refresh v prohlížeči: Ctrl+Shift+R

---

## 🎯 RYCHLÝ DEPLOYMENT SCRIPT

```bash
#!/bin/bash
# Rychlý deployment dashboardu

set -e  # Exit on error

echo "🔨 Building dashboard..."
cd /var/www/erdms-platform/dashboard
npm run build

echo "📦 Deploying to release folders..."
for dir in /var/www/erdms-builds/releases/*/dashboard/build/; do
  echo "  → $dir"
  cp -r build/* "$dir"
done

echo "🔄 Reloading Apache..."
systemctl reload apache2

echo "✅ Deployment complete!"
echo "💡 Nezapomeň hard refresh v prohlížeči: Ctrl+Shift+R"
```

Ulož jako `/var/www/erdms-dev/_docs/scripts-shell/deploy-dashboard.sh` a spusť:
```bash
chmod +x /var/www/erdms-dev/_docs/scripts-shell/deploy-dashboard.sh
/var/www/erdms-dev/_docs/scripts-shell/deploy-dashboard.sh
```

---

## 🔗 SOUVISEJÍCÍ DOKUMENTACE

- **Apache config:** `/etc/apache2/sites-available/erdms-proxy-production.inc`
- **Auth API dokumentace:** `/_docs/ENTRA-IMPLEMENTATION-GUIDE.md`
- **Entra setup:** `/_docs/ENTRA_GRAPH_API_SETUP.md`
- **Build config:** `/var/www/erdms-platform/dashboard/BUILD.md`

---

**Poslední aktualizace:** 23. prosince 2025  
**Testováno na:** Apache 2.4.65, Node.js v20.19.6, Vite 7.2.6

# Build Configuration - ERDMS

## ⚠️ KRITICKÁ PRAVIDLA

### 1. Build Output Directory
**VŽDY používat `build/` jako output directory!**

```javascript
// vite.config.js (Dashboard i EEO Client)
export default defineConfig({
  build: {
    outDir: 'build'  // ✅ SPRÁVNĚ - jednotné pro celý projekt
  }
})
```

❌ **NIKDY** nepoužívat `dist/`  
✅ **VŽDY** používat `build/`

### 2. Azure Entra Auth Paths
**NIKDY NEpoužívat `/api/` prefix pro Azure auth endpointy!**

#### Dashboard (.env.production)
```bash
# ✅ SPRÁVNĚ - bez /api/
VITE_API_URL=https://erdms.zachranka.cz
VITE_AUTH_API_URL=https://erdms.zachranka.cz/auth

# ❌ ŠPATNĚ
VITE_API_URL=https://erdms.zachranka.cz/api
VITE_AUTH_API_URL=https://erdms.zachranka.cz/api/auth
```

#### Apache konfigurace
```apache
# ✅ SPRÁVNĚ - frontend volá /auth, backend poslouchá /api/auth
ProxyPass /auth http://localhost:4000/api/auth
ProxyPassReverse /auth http://localhost:4000/api/auth

# ❌ ŠPATNĚ - způsobí 404/503 chyby
ProxyPass /api/auth http://localhost:4000/api/auth
```

**Důvod**: Azure Entra ID má registrované redirect URI **BEZ** `/api/` prefixu

### 3. Build Scripts

#### build-quick.sh
```bash
# ✅ SPRÁVNĚ
npm run build
cp -r build ${BUILD_DIR}/dashboard/

# ❌ ŠPATNĚ
npm run build
cp -r dist ${BUILD_DIR}/dashboard/
```

#### build-multiapp.sh
```bash
# ✅ Správně používá build/
npm run build  # vytvoří build/
```

### 4. Apache DocumentRoot

#### Development (aktivní)
```apache
DocumentRoot /var/www/erdms-dev/dashboard/build
```

#### Production (neaktivní - při použití build scriptů)
```apache
DocumentRoot /var/www/erdms-builds/current/dashboard/build
```

### 5. Systemd Services

#### Development mode (aktivní)
```ini
[Service]
WorkingDirectory=/var/www/erdms-dev/auth-api
```

#### Production mode (při použití build scriptů)
```ini
[Service]
WorkingDirectory=/var/www/erdms-builds/current/auth-api
```

## Produkční struktura - EEO-V2

### Potvrzené prostředí
- **Production root**: `/var/www/erdms-platform/apps/eeo-v2/`
- **Development root**: `/var/www/erdms-dev/apps/eeo-v2/`

### Struktura produkčního adresáře

#### ✅ SPRÁVNÁ struktura (FLAT - bez client/ subdirectory)
```
/var/www/erdms-platform/apps/eeo-v2/
├── index.html              # Root HTML (production info page nebo build)
├── static/                 # Build assets (JS, CSS, images)
├── manifest.json          # PWA manifest
├── robots.txt
└── api/                   # PHP backend (production kód)
```

#### ❌ NESPRÁVNÁ struktura (NESTed)
```
/var/www/erdms-platform/apps/eeo-v2/
└── client/                # ❌ NESMÍ BÝT v produkci
    ├── index.html
    ├── static/
    └── src/               # ❌ Source code NESMÍ být v produkci
```

### Pravidla pro produkci

1. **Build artifacts ONLY** - žádný source code
   - ✅ Kopírovat: `index.html`, `static/`, `manifest.json`, etc.
   - ❌ NEkopírovat: `src/`, `node_modules/`, `package.json`, `vite.config.js`

2. **Flat structure** - build přímo v root aplikace
   - ✅ `/var/www/erdms-platform/apps/eeo-v2/index.html`
   - ❌ `/var/www/erdms-platform/apps/eeo-v2/client/index.html`

3. **Deployment command**
   ```bash
   # Vyčistit produkci (kromě api/)
   cd /var/www/erdms-platform/apps/eeo-v2
   find . -maxdepth 1 -not -name 'api' -not -name '.' -delete
   
   # Nakopírovat build artifacts
   cp -r /var/www/erdms-dev/apps/eeo-v2/client/build/* .
   
   # Nastavit oprávnění
   chown -R www-data:www-data .
   ```

4. **URL mapping**
   - Production: `https://erdms.zachranka.cz/eeo-v2`
   - Development: `https://erdms.zachranka.cz/dev/eeo-v2`
   - Beta testers: Link z produkce na `/dev/eeo-v2`

5. **Apache configuration**
   ```apache
   # Production
   Alias /eeo-v2 /var/www/erdms-platform/apps/eeo-v2
   
   # Development
   Alias /dev/eeo-v2 /var/www/erdms-dev/apps/eeo-v2/client/build
   ```

### Best Practices
- ✅ Odpovídá standardům: Vercel, Netlify, Nginx, Apache
- ✅ Oddělený development a production
- ✅ Clear separation of concerns
- ✅ Bezpečnost (žádný source code v produkci)

## Checklist před deployem

- [ ] Všechny `vite.config.js` mají `outDir: 'build'`
- [ ] Dashboard `.env.production` nemá `/api/` v URL
- [ ] Apache má `ProxyPass /auth` (ne `/api/auth`)
- [ ] Build scripty kopírují `build/` (ne `dist/`)
- [ ] Systemd services ukazují na správný path
- [ ] Po změně .env proveden rebuild: `npm run build`
- [ ] Po změně Apache konfigurace: `systemctl restart apache2`
- [ ] Po změně systemd service: `systemctl daemon-reload && systemctl restart <service>`
- [ ] **EEO-V2: Build artifacts kopírovány FLAT (bez client/ subdirectory)**
- [ ] **EEO-V2: Production neobsahuje source code (src/, package.json, etc.)**
- [ ] **EEO-V2: Info page vytvořena s beta tester linkem na /dev/eeo-v2**

## Debugging

### Prohlížeč načítá starý build
```bash
# 1. Vyčistit build cache
rm -rf dashboard/build dashboard/node_modules/.vite

# 2. Nový build
cd dashboard && npm run build

# 3. Restart Apache
systemctl restart apache2

# 4. Vyčistit browser cache (Ctrl+Shift+Delete)
# 5. Hard refresh (Ctrl+F5)
```

### 503 Service Unavailable na /auth endpoints
```bash
# Zkontrolovat Apache ProxyPass
grep "ProxyPass.*auth" /etc/apache2/sites-available/erdms.zachranka.cz.conf

# Mělo by být:
# ProxyPass /auth http://localhost:4000/api/auth

# Zkontrolovat že auth-api běží
systemctl status erdms-auth-api

# Zkontrolovat logy
journalctl -u erdms-auth-api -n 50
```

### Nekonzistence build/ vs dist/
```bash
# Najít všechny vite.config.js
find . -name "vite.config.js" -exec grep -l "outDir" {} \;

# Opravit na build:
# outDir: 'build'
```

## Soubory ke kontrole

1. `/var/www/erdms-dev/dashboard/vite.config.js`
2. `/var/www/erdms-dev/apps/eeo-v2/client/vite.config.js`
3. `/var/www/erdms-dev/dashboard/.env.production`
4. `/var/www/erdms-dev/dashboard/.env.development`
5. `/var/www/erdms-dev/build-quick.sh`
6. `/var/www/erdms-dev/build-multiapp.sh`
7. `/etc/apache2/sites-available/erdms.zachranka.cz.conf`
8. `/etc/systemd/system/erdms-auth-api.service`
9. `/etc/systemd/system/erdms-eeo-api.service`

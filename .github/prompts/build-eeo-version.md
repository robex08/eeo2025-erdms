---
name: Build EEO v2 (DEV/PROD)
description: Kompletní guide pro buildění a deployment EEO v2 aplikace - DEV vs PROD prostředí
scopes:
  - /apps/eeo-v2/client/
  - /apps/eeo-v2/api-legacy/
---
**DŮLEŽITÉ: Komunikuj vždy v češtině.**

# EEO v2 - Build Guide (DEV vs PROD)

## 🎯 Důležité: NODE_ENV vs Prostředí

### NODE_ENV (React build mode)
- `development` = dev server (`npm run start`) - hot reload, verbose errory, větší bundle
- `production` = optimalizovaný build (`npm run build`) - minifikace, tree shaking, menší bundle

### Prostředí (DEV/PROD) = kam se aplikace nasazuje
Určují jiné proměnné:
- `PUBLIC_URL` = cesta k aplikaci
- `REACT_APP_API2_BASE_URL` = endpoint API
- Detekce v kódu: `url.includes('/dev/')`

---

## 📦 Build Skripty

### DEV Build (vývojové prostředí)
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev
```

**Výsledek:**
- NODE_ENV=production (optimalizovaný)
- PUBLIC_URL=/dev/eeo-v2
- REACT_APP_API2_BASE_URL=/dev/api.eeo/
- Build do: `build/`
- Nasazení: `/var/www/erdms-dev/apps/eeo-v2/client/build/`

### PROD Build (produkční prostředí)
```bash
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build
```

**Výsledek:**
- NODE_ENV=production (optimalizovaný)
- PUBLIC_URL=/eeo-v2
- REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/
- Build do: `build/`
- Nasazení: TBD (produkční server)

---

## 🔧 Konfigurace

### Package.json scripts:
```json
{
  "scripts": {
    "start": "NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired start",
    "build": "NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build",
    "build:dev": "cross-env PUBLIC_URL=/dev/eeo-v2 NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build"
  }
}
```

### .env.production (DEV build):
```env
# DEV API endpoint (s /dev/ prefixem)
REACT_APP_API_BASE_URL=/dev/api
REACT_APP_API2_BASE_URL=/dev/api.eeo/

# Encryption debug mode
REACT_APP_ENCRYPTION_DEBUG=false

# Database keys
REACT_APP_DB_ORDER_KEY=objednavky0123
REACT_APP_DB_ATTACHMENT_KEY=pripojene_odokumenty0123
REACT_APP_DB_OBJMETADATA_KEY=r_objMetaData

# Available databases for import
REACT_APP_DB_AVAILABLE_SOURCES=objednavky,objednavky0103,objednavky0121,objednavky0123
```

### .env.production (PROD build):
```env
# PROD API endpoint (absolutní URL)
REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/

# Encryption debug mode
REACT_APP_ENCRYPTION_DEBUG=false

# Database keys (PROD databáze)
REACT_APP_DB_ORDER_KEY=objednavky_prod
REACT_APP_DB_ATTACHMENT_KEY=pripojene_odokumenty_prod
REACT_APP_DB_OBJMETADATA_KEY=r_objMetaData

# Available databases for import
REACT_APP_DB_AVAILABLE_SOURCES=objednavky_prod
```

---

## 🔍 Detekce prostředí v aplikaci

### Frontend (React):
```javascript
// Layout.js - detekce DEV prostředí
const apiUrl = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
const isDev = apiUrl.includes('/dev/');

// Zobrazení DEVELOP badge a DB name (jen v DEV)
if (isDev) {
  // Fetch database name from API /version endpoint
  // Show in DEVELOP badge
}
```

### Backend (PHP):
```php
// api.php - detekce DEV prostředí
define('IS_DEV_ENV', strpos($_SERVER['REQUEST_URI'], '/dev/api.eeo') !== false);

// ENV_NAME pro DB config
define('ENV_NAME', IS_DEV_ENV ? 'development' : 'production');

// /version endpoint vrací DB name (jen v DEV)
if ($action === 'version') {
    echo json_encode([
        'success' => true,
        'version' => '1.90',
        'database' => DB_NAME,  // eeo2025-dev nebo eeo2025-prod
        'environment' => ENV_NAME
    ]);
    exit;
}
```

---

## 🚀 Deployment Workflow

### DEV Deployment:
1. `npm run build:dev` - build s DEV konfigurací
2. Files jsou v `build/` directory
3. Apache VirtualHost směřuje `/dev/eeo-v2/` → `build/`
4. API volání jdou na `/dev/api.eeo/`

### PROD Deployment:
1. Upravit `.env.production` - nastavit PROD API URLs
2. `npm run build` - build s PROD konfigurací
3. Upload `build/` na produkční server
4. Apache VirtualHost směřuje `/eeo-v2/` → `build/`
5. API volání jdou na `https://erdms.zachranka.cz/api.eeo/`

---

## 📝 Checklist před buildem

### DEV Build:
- [ ] `.env.production` obsahuje `/dev/api.eeo/`
- [ ] `package.json` má `build:dev` script s `PUBLIC_URL=/dev/eeo-v2`
- [ ] Backend má IS_DEV_ENV detekci
- [ ] `/version` endpoint vrací database name

### PROD Build:
- [ ] `.env.production` obsahuje produkční URL
- [ ] `package.json` má `build` script s `PUBLIC_URL=/eeo-v2`
- [ ] Backend má IS_DEV_ENV detekci
- [ ] Database keys jsou pro produkční DB
- [ ] Testováno na DEV prostředí

---

## 🐛 Troubleshooting

### Problém: API volání jdou na špatný endpoint
**Řešení:** Zkontroluj `.env.production` a rebuild:
```bash
cat .env.production | grep REACT_APP_API2_BASE_URL
npm run build:dev
```

### Problém: DEVELOP badge neukazuje DB name
**Řešení:** Backend `/version` endpoint musí vracet DB name:
```php
if ($action === 'version') {
    echo json_encode([
        'database' => DB_NAME
    ]);
}
```

### Problém: Build je moc velký
**Řešení:** NODE_OPTIONS nastavuje memory limit:
```bash
NODE_OPTIONS=--max_old_space_size=8192 npm run build:dev
```

---

## 📊 Build Statistics

### DEV Build Output:
- Main chunk: ~340 KB gzipped
- Total chunks: ~50 soubory
- PUBLIC_URL: `/dev/eeo-v2/`
- Environment: production (optimalizovaný)

### PROD Build Output:
- Main chunk: ~340 KB gzipped
- Total chunks: ~50 soubory
- PUBLIC_URL: `/eeo-v2/`
- Environment: production (optimalizovaný)

---

## 🔐 Security Notes

- **PROD build**: Nikdy nepoužívat `REACT_APP_ENCRYPTION_DEBUG=true`
- **DEV build**: Můžeš používat, ale jen pro debugování
- **API keys**: Vždy používat ENV variables, nikdy hardcoded

---

## 📅 Version History

- **v1.90** (2025-12-20)
  - DEV/PROD separace implementována
  - DEVELOP badge zobrazuje DB name
  - `/version` endpoint přidán
  - Build guide vytvořen

---

## TODO: Build Scripty

```bash
# Zde přidáme automatizované build scripty až to bude ladit a testovat
# - Automatický build + deploy
# - Git tagging
# - Changelog generování
# - Backup před deployem
```

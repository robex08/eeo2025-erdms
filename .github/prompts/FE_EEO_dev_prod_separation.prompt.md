# 🔧 Frontend EEO v2 - DEV/PROD Environment Separation

**Created:** 20. prosince 2025  
**Status:** ✅ IMPLEMENTED  
**Environment Strategy:** Dual Structure (erdms-dev + erdms-platform)

---

## ⚠️ KRITICKÁ PRAVIDLA

### Testování HTTP Endpointů
- ❌ **NIKDY nepoužívej curl/wget na produkční URL** `https://erdms.zachranka.cz/*`
- ❌ Nemáš přístup k testování endpointů přes HTTP
- ✅ Místo toho: `php -l` pro syntax check, analýza kódu pomocí `grep`, kontrola error logů
- ✅ Uživatel sám otestuje funkčnost v browseru

---

## 🎯 Cíl

Kompletní separace DEV a PROD prostředí pro EEO v2 aplikaci s:
- Oddělené Apache aliasy (`/dev/eeo-v2` vs `/eeo-v2`)
- Oddělené PHP API endpointy (`/dev/api.eeo` vs `/api.eeo`)
- Oddělené databáze (`eeo2025-dev` vs `eeo2025`)
- Automatická detekce prostředí
- Vizuální indikace aktivního prostředí

---

## 📁 Directory Structure

### Development Environment
```
/var/www/erdms-dev/
├── apps/
│   └── eeo-v2/
│       ├── client/
│       │   ├── src/                    # React source
│       │   ├── build/                  # Build output for DEV
│       │   ├── .env                    # DEV environment config
│       │   └── package.json
│       ├── api/                        # Node.js API (future)
│       └── api-legacy/
│           └── api.eeo/                # PHP API
│               ├── api.php
│               ├── .env                # DEV config
│               └── config/
│                   └── environments/
│                       └── dev.php
```

### Production Environment
```
/var/www/erdms-platform/
├── apps/
│   └── eeo-v2/
│       ├── client/
│       │   └── build/                  # Production build (deployed from dev)
│       ├── api/                        # Node.js API (future)
│       └── api-legacy/
│           └── api.eeo/                # PHP API
│               ├── api.php
│               ├── .env                # PROD config
│               └── config/
│                   └── environments/
│                       └── production.php
├── data/
│   └── eeo-v2/
│       ├── attachments/                # Production attachments
│       └── templates/                  # DOCX templates
└── config/                             # Central config
```

---

## 🌐 Apache Configuration

### Development Aliases
```apache
# DEV Frontend
Alias /dev/eeo-v2 /var/www/erdms-dev/apps/eeo-v2/client/build

<Directory /var/www/erdms-dev/apps/eeo-v2/client/build>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
    DirectoryIndex index.html
    
    RewriteEngine On
    RewriteBase /dev/eeo-v2/
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /dev/eeo-v2/index.html [L]
</Directory>

# DEV PHP API
Alias /dev/api.eeo /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo

<Directory /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo>
    Options +ExecCGI -Indexes
    AllowOverride All
    Require all granted
    
    <FilesMatch "\.php$">
        SetHandler "proxy:unix:/run/php/php8.4-fpm.sock|fcgi://localhost"
    </FilesMatch>
    
    DirectoryIndex api.php
</Directory>
```

### Production Aliases
```apache
# PROD Frontend
Alias /eeo-v2 /var/www/erdms-platform/apps/eeo-v2/client/build

<Directory /var/www/erdms-platform/apps/eeo-v2/client/build>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
    DirectoryIndex index.html
    
    RewriteEngine On
    RewriteBase /eeo-v2/
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /eeo-v2/index.html [L]
</Directory>

# PROD PHP API
Alias /api.eeo /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo

<Directory /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo>
    Options +ExecCGI -Indexes
    AllowOverride All
    Require all granted
    
    <FilesMatch "\.php$">
        SetHandler "proxy:unix:/run/php/php8.4-fpm.sock|fcgi://localhost"
    </FilesMatch>
    
    DirectoryIndex api.php
</Directory>
```

---

## ⚙️ Frontend Configuration

### Development .env
```bash
# /var/www/erdms-dev/apps/eeo-v2/client/.env

PUBLIC_URL=/dev/eeo-v2
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/

REACT_APP_DB_ORDER_KEY=objednavky0123
REACT_APP_DB_ATTACHMENT_KEY=pripojene_odokumenty0123
REACT_APP_DB_OBJMETADATA_KEY=r_objMetaData
REACT_APP_DB_AVAILABLE_SOURCES=objednavky,objednavky0103,objednavky0121,objednavky0123

REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api
REACT_APP_OLD_ATTACHMENTS_URL=https://erdms.zachranka.cz/prilohy/
REACT_APP_SUBDIR=/prilohy/
REACT_APP_VERSION=1.90

REACT_APP_ALLOW_MD5_FALLBACK=true
REACT_APP_FOOTER_OWNER=2025 ZZS SK, p.o., Robert Holovský, Klára Šulgánová a Tereza Bezoušková
REACT_APP_ENCRYPTION_DEBUG=false
REACT_APP_ENABLE_DEBUG=false
REACT_APP_LEGACY_ATTACHMENTS_BASE_URL=https://eeo.zachranka.cz/prilohy/
```

### Production .env
```bash
# /var/www/erdms-platform/apps/eeo-v2/client/.env (for reference, not deployed)

PUBLIC_URL=/eeo-v2
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/

# ... same as DEV except paths
```

### Build Scripts (package.json)
```json
{
  "scripts": {
    "start": "react-app-rewired start",
    "build": "react-app-rewired build",
    "build:dev": "cross-env PUBLIC_URL=/dev/eeo-v2 react-app-rewired build",
    "build:prod": "cross-env PUBLIC_URL=/eeo-v2 REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/api.eeo/ react-app-rewired build"
  }
}
```

---

## 🔧 PHP Backend Configuration

### Environment Detection
```php
// api.php - After line 16
define('IS_DEV_ENV', strpos($_SERVER['REQUEST_URI'], '/dev/api.eeo') !== false);
define('ENV_NAME', IS_DEV_ENV ? 'DEV' : 'PROD');

// Usage in code:
if (IS_DEV_ENV) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
    // Extra logging
} else {
    error_reporting(E_ERROR | E_WARNING);
    ini_set('display_errors', '0');
}
```

### Development .env (PHP)
```bash
# /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env

APP_ENV=development
APP_DEBUG=true

DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=erdms_dev
DB_USER=erdms_dev_user
DB_PASSWORD=***DEV_PASSWORD***

STORAGE_UPLOADS_PATH=/var/www/erdms-dev/data/eeo-v2/attachments/
STORAGE_UPLOADS_URL=https://erdms.zachranka.cz/dev/eeo-v2/attachments/
STORAGE_TEMPLATES_PATH=/var/www/erdms-dev/data/eeo-v2/templates/

API_BASE_URL=https://erdms.zachranka.cz/api
MAIL_ENABLED=false
```

### Production .env (PHP)
```bash
# /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env

APP_ENV=production
APP_DEBUG=false

DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=erdms_production
DB_USER=erdms_prod_user
DB_PASSWORD=***PROD_PASSWORD***

STORAGE_UPLOADS_PATH=/var/www/erdms-platform/data/eeo-v2/attachments/
STORAGE_UPLOADS_URL=https://erdms.zachranka.cz/eeo-v2/attachments/
STORAGE_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/templates/

API_BASE_URL=https://erdms.zachranka.cz/api
MAIL_ENABLED=true
```

---

## 🎨 Visual Environment Indicator

### Layout.js Footer
```jsx
// Footer with environment indicator
<FooterCenter>
  <span style={{ display: 'block', textAlign: 'center', lineHeight: '1.5' }}>
    © {process.env.REACT_APP_FOOTER_OWNER || '2025 ZZS SK, p.o.'} 
    | verze {process.env.REACT_APP_VERSION}
    {' | '}
    <span style={{ 
      fontFamily: 'monospace', 
      fontSize: '0.85em',
      color: (process.env.REACT_APP_API2_BASE_URL || '').includes('/dev/') 
        ? '#ff6b6b'  // Red for DEV (matches DEVELOP badge)
        : '#94a3b8', // Gray for PROD
      fontWeight: (process.env.REACT_APP_API2_BASE_URL || '').includes('/dev/') 
        ? '700' 
        : '400'
    }}>
      {(() => {
        const apiUrl = process.env.REACT_APP_API2_BASE_URL || '/api.eeo/';
        return apiUrl.includes('/dev/') ? '/dev/api.eeo' : '/api.eeo';
      })()}
    </span>
  </span>
</FooterCenter>
```

### Header Badge
```jsx
// Header - DEVELOP badge for DEV environment
{typeof window !== 'undefined' && 
 window.location.pathname.startsWith('/dev/') && (
  <span style={{
    color: '#ff6b6b',
    fontWeight: '700',
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    padding: '2px 6px',
    borderRadius: '3px',
    marginRight: '6px',
    border: '1px solid rgba(220, 38, 38, 0.4)',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)'
  }}>
    DEVELOP
  </span>
)}
```

---

## 🚀 Build & Deploy Workflow

### Development Build
```bash
# Build for DEV environment
cd /var/www/erdms-dev/apps/eeo-v2/client
npm run build:dev

# Output: build/ with PUBLIC_URL=/dev/eeo-v2
# ENV variables baked in: REACT_APP_API2_BASE_URL=.../dev/api.eeo/
```

### Production Deploy
```bash
# 1. Build with production config
cd /var/www/erdms-dev/apps/eeo-v2/client

# Update .env temporarily or use build:prod script
npm run build:prod

# 2. Deploy to production
rsync -av --delete \
  /var/www/erdms-dev/apps/eeo-v2/client/build/ \
  /var/www/erdms-platform/apps/eeo-v2/client/build/

# 3. Set correct permissions
sudo chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/client/build/
sudo chmod -R 755 /var/www/erdms-platform/apps/eeo-v2/client/build/

# 4. Deploy PHP API
rsync -av --delete \
  --exclude='.env' \
  --exclude='vendor/' \
  /var/www/erdms-dev/apps/eeo-v2/api-legacy/ \
  /var/www/erdms-platform/apps/eeo-v2/api-legacy/

# 5. Ensure .env is correct in production
# (manually verify /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env)

# 6. Reload Apache
sudo systemctl reload apache2
```

---

## 📊 URL Structure Overview

| Environment | Frontend URL | API URL | Path Detection |
|-------------|-------------|---------|----------------|
| **DEV** | `https://erdms.zachranka.cz/dev/eeo-v2/` | `https://erdms.zachranka.cz/dev/api.eeo/` | `includes('/dev/')` |
| **PROD** | `https://erdms.zachranka.cz/eeo-v2/` | `https://erdms.zachranka.cz/api.eeo/` | No `/dev/` |

### Frontend Detection
```javascript
// Check if we're in DEV environment
const isDev = (process.env.REACT_APP_API2_BASE_URL || '').includes('/dev/');
const apiBase = isDev ? '/dev/api.eeo/' : '/api.eeo/';
```

### Backend Detection (PHP)
```php
// Check if request goes to /dev/api.eeo
$isDev = strpos($_SERVER['REQUEST_URI'], '/dev/api.eeo') !== false;
$envName = $isDev ? 'DEV' : 'PROD';
```

---

## ✅ Implementation Checklist

### Frontend Changes
- [x] Remove hardcoded API URLs (13 files)
- [x] Add ENV variable fallbacks: `process.env.REACT_APP_API2_BASE_URL || '/api.eeo/'`
- [x] Update .env with DEV URL: `/dev/api.eeo/`
- [x] Add footer environment indicator (red for DEV, gray for PROD)
- [x] Add build:dev script with PUBLIC_URL override
- [x] Test build output contains correct ENV values

### Backend Changes
- [x] Add IS_DEV_ENV constant to api.php
- [x] Add ENV_NAME constant
- [x] Create separate .env files for DEV/PROD
- [x] Update error reporting based on environment

### Apache Configuration
- [x] Add /dev/eeo-v2 alias for development frontend
- [x] Add /dev/api.eeo alias for development PHP API
- [x] Keep /eeo-v2 alias for production frontend
- [x] Update /api.eeo alias to point to production folder
- [x] Test both DEV and PROD URLs work correctly
- [x] Reload Apache: `sudo systemctl reload apache2`

### Git & Documentation
- [x] Commit all changes
- [x] Push to feature/generic-recipient-system
- [x] Create comprehensive CHANGELOG
- [x] Create this prompt document

---

## 🔍 Testing & Validation

### Manual Testing
```bash
# 1. Test DEV environment
curl -I https://erdms.zachranka.cz/dev/eeo-v2/
curl -I https://erdms.zachranka.cz/dev/api.eeo/

# 2. Test PROD environment  
curl -I https://erdms.zachranka.cz/eeo-v2/
curl -I https://erdms.zachranka.cz/api.eeo/

# 3. Check footer indicator
# DEV: Should show red "/dev/api.eeo"
# PROD: Should show gray "/api.eeo"

# 4. Check bundle content
cd /var/www/erdms-dev/apps/eeo-v2/client/build/static/js
strings main.*.js | grep "dev/api.eeo"  # Should find DEV URL

# For production build:
strings main.*.js | grep "api.eeo/" | grep -v "dev"  # Should find PROD URL
```

### Browser Testing
1. Open DEV: `https://erdms.zachranka.cz/dev/eeo-v2/`
   - Header should show "DEVELOP" badge (red)
   - Footer should show "/dev/api.eeo" (red)
   
2. Open PROD: `https://erdms.zachranka.cz/eeo-v2/`
   - Header should NOT show "DEVELOP" badge
   - Footer should show "/api.eeo" (gray)

3. Test API calls in DevTools Network tab
   - DEV should call `/dev/api.eeo/...`
   - PROD should call `/api.eeo/...`

---

## 🎯 Benefits

✅ **Clear Separation** - DEV a PROD prostředí zcela oddělené  
✅ **Easy Switching** - Jedno prostředí se přepíná pouze URL  
✅ **Visual Feedback** - Okamžitá vizuální indikace prostředí  
✅ **Safe Testing** - Změny v DEV neovlivní PROD  
✅ **Simple Deploy** - Rsync z DEV do PROD  
✅ **No Conflicts** - Rozdílné aliasy, žádné kolize  

---

## 📝 Notes

- **Cache Warning:** Po deploy do PROD vždy hard refresh (Ctrl+Shift+R) v prohlížeči
- **ENV Variables:** React ENV proměnné se zapékají při build time, nikoliv runtime
- **Apache Reload:** Po změně konfigurace vždy `sudo systemctl reload apache2`
- **Build Order:** Vždy nejprve zkompilovat frontend, pak deployovat
- **Permissions:** PROD složky musí mít správná oprávnění (755/www-data)

---

**Status:** ✅ IMPLEMENTED & TESTED  
**Last Updated:** 20. prosince 2025  
**Version:** 1.0

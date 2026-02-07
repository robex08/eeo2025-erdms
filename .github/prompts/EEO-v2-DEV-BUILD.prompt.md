# EEO v2 DEV/PROD Build Configuration

## Context
This prompt helps AI assistants properly configure DEV and PROD builds for the EEO v2 React application.

## Critical Issue: React Environment Variables
**React.js does NOT automatically load .env.development during build process**, even with `NODE_ENV=development`.

## Required Commands

### ✅ CORRECT DEV Build:
```bash
# Use the explicit script (RECOMMENDED)
npm run build:dev:explicit

# Output: build/
# API: https://erdms.zachranka.cz/dev/api.eeo/
# PUBLIC_URL: /dev/eeo-v2
# DB: eeo2025-dev
# Deploy: AUTOMATIC (Apache Alias already configured)
```

### ✅ CORRECT PROD Build:
```bash
# Use the prod script
npm run build:prod

# Output: build-prod/
# API: https://erdms.zachranka.cz/api.eeo/
# PUBLIC_URL: /eeo-v2
# DB: eeo2025
# Deploy: MANUAL (copy to erdms-platform)
```

### ❌ INCORRECT (will use wrong config):
```bash
npm run build:dev  # This ignores environment variables!
npm run build      # This builds PROD, not DEV!
```

## Environment Configuration

### DEV Environment:
- **API Endpoint:** `https://erdms.zachranka.cz/dev/api.eeo/`
- **Public URL:** `/dev/eeo-v2`
- **Database:** `eeo2025-dev`
- **Build Output:** `build/`
- **Deploy:** ✅ AUTOMATIC - Apache Alias `/dev/eeo-v2` points to `build/`
- **Location:** `/var/www/erdms-dev/apps/eeo-v2/client/build/`

### PROD Environment:
- **API Endpoint:** `https://erdms.zachranka.cz/api.eeo/`
- **Public URL:** `/eeo-v2`
- **Database:** `eeo2025`
- **Build Output:** `build-prod/`
- **Deploy:** ⚠️ MANUAL - Must copy to erdms-platform
- **Location:** `/var/www/erdms-platform/apps/eeo-v2/`

## PROD Deploy Process

```bash
# Complete PROD deploy
cd /var/www/erdms-dev/apps/eeo-v2/client && \
npm run build:prod && \
cp -r build-prod/* /var/www/erdms-platform/apps/eeo-v2/ && \
cp -r /var/www/erdms-dev/apps/eeo-v2/api-legacy /var/www/erdms-platform/apps/eeo-v2/ && \

# CRITICAL: Fix PROD .env (correct database and paths)
cat > /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env << 'EOF'
DB_HOST=10.3.172.11
DB_PORT=3306
DB_NAME=eeo2025
DB_USER=erdms_user
DB_PASSWORD=AhchohTahnoh7eim
DB_CHARSET=utf8mb4
REACT_APP_VERSION=1.92c
UPLOAD_ROOT_PATH=/var/www/erdms-platform/data/eeo-v2/prilohy/
DOCX_TEMPLATES_PATH=/var/www/erdms-platform/data/eeo-v2/sablony/
MANUALS_PATH=/var/www/erdms-platform/data/eeo-v2/manualy/
EOF

mkdir -p /var/www/erdms-platform/data/eeo-v2/manualy && \
cp -r /var/www/erdms-data/eeo-v2/manualy/* /var/www/erdms-platform/data/eeo-v2/manualy/ && \
systemctl reload apache2 && \
echo "✅ PROD deploy complete!"
```

## Critical Rules

### ❌ NEVER:
- Copy DEV build anywhere
- Copy DEV .env to PROD
- Swap databases: DEV=`eeo2025-dev`, PROD=`eeo2025`
- Delete PROD directories before copying

### ✅ ALWAYS:
- After copying API legacy, ALWAYS fix PROD .env
- Check DB in .env: DEV=`eeo2025-dev`, PROD=`eeo2025`
- Reload Apache after changes
- Test DEV before PROD deploy

## Verification Steps

### DEV Verification:
```bash
# 1. Check API endpoint in built JS
grep -o "dev/api.eeo" /var/www/erdms-dev/apps/eeo-v2/client/build/static/js/main.*.js

# 2. Check PUBLIC_URL in HTML
grep -o "/dev/eeo-v2" /var/www/erdms-dev/apps/eeo-v2/client/build/index.html

# 3. Check DEV .env database
cat /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env | grep DB_NAME
# Should be: DB_NAME=eeo2025-dev

# 4. Browser test
# URL: https://erdms.zachranka.cz/dev/eeo-v2/
# Footer should show: /dev/api.eeo (yellow)
```

### PROD Verification:
```bash
# 1. Check API endpoint in built JS
grep -o "https://erdms.zachranka.cz/api.eeo" /var/www/erdms-platform/apps/eeo-v2/static/js/main.*.js

# 2. Check PROD .env database
cat /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | grep DB_NAME
# Should be: DB_NAME=eeo2025

# 3. Check paths
cat /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env | grep PATH
# Should be: /var/www/erdms-platform/data/...

# 4. Browser test
# URL: https://erdms.zachranka.cz/eeo-v2/
# Footer should show: /api.eeo (gray)
```

## Common Errors

### PROD using DEV database
**Symptom:** PROD writes to DEV database  
**Cause:** Forgot to fix PROD .env after copying API legacy  
**Fix:** Run the .env fix command from deploy process

### 404 errors
**Symptom:** `Uncaught SyntaxError: Unexpected token '<'`  
**Cause:** Wrong PUBLIC_URL  
**Fix:** Rebuild with correct `build:dev:explicit` or `build:prod`

### Wrong API calls
**Symptom:** DEV calls `/api.eeo/` instead of `/dev/api.eeo/`  
**Cause:** Used wrong build command  
**Fix:** Use `npm run build:dev:explicit`

## Package.json Scripts

```json
{
  "scripts": {
    "build:dev:explicit": "REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/ PUBLIC_URL=/dev/eeo-v2 BUILD_PATH=build NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build",
    "build:prod": "NODE_ENV=production BUILD_PATH=build-prod PUBLIC_URL=/eeo-v2 NODE_OPTIONS=--max_old_space_size=8192 react-app-rewired build"
  }
}
```

## Documentation
- **Main:** [/var/www/erdms-dev/BUILD.md](../../BUILD.md)
- **Updated:** 30.12.2025
- **Status:** ✅ CURRENT
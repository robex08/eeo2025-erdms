# EEO v2 DEV Build Configuration

## Context
This prompt helps AI assistants properly configure DEV builds for the EEO v2 React application.

## Critical Issue: React Environment Variables
**React.js does NOT automatically load .env.development during build process**, even with `NODE_ENV=development`.

## Required Commands

### ✅ CORRECT DEV Build:
```bash
# Use explicit environment variables
REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api \
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/ \
PUBLIC_URL=/dev/eeo-v2 \
npm run build

# OR use the explicit script:
npm run build:dev:explicit
```

### ❌ INCORRECT (will use PROD config):
```bash
npm run build:dev  # This ignores environment variables!
```

## Environment Configuration

### DEV Environment:
- **API Endpoint:** `https://erdms.zachranka.cz/dev/api.eeo/`
- **Public URL:** `/dev/eeo-v2`
- **Build Output:** `build/`
- **Apache Config:** Serves directly from `build/`

### PROD Environment:
- **API Endpoint:** `https://erdms.zachranka.cz/api.eeo/`
- **Public URL:** `/eeo-v2`
- **Build Output:** `build-prod/`
- **Deploy:** Copy to `/var/www/erdms-platform/apps/eeo-v2/`

## Verification Steps

1. **Check API endpoint in built JS:**
```bash
grep -o "https://erdms.zachranka.cz/dev/api.eeo" build/static/js/main.*.js
```

2. **Check PUBLIC_URL in HTML:**
```bash
grep -o "/dev/eeo-v2" build/index.html
```

3. **Browser test:**
   - Open `/dev/eeo-v2`
   - No 404 errors in console
   - API calls go to `/dev/api.eeo/`

## Common Errors
- `Uncaught SyntaxError: Unexpected token '<'` → Wrong PUBLIC_URL
- API calls to `/api.eeo/` instead of `/dev/api.eeo/` → Wrong environment variables

## Documentation
- [BUILD_SEPARATION.md](../client/BUILD_SEPARATION.md)
- [DEV_BUILD_TROUBLESHOOTING.md](../client/DEV_BUILD_TROUBLESHOOTING.md)
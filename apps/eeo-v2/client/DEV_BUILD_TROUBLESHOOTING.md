# DEV Build Troubleshooting - React Environment Variables

## 🚨 KRITICKÝ PROBLÉM: React ignoruje .env při build

### Symptomy:
- DEV aplikace volá production API (`/api.eeo/` místo `/dev/api.eeo/`)
- JavaScript error: `Uncaught SyntaxError: Unexpected token '<'`
- 404 errors na static soubory (špatný PUBLIC_URL)

### Příčina:
React.js při buildu **NEAUTOMATICKY** načítá `.env.development` na základě `NODE_ENV=development`.

### ✅ ŘEŠENÍ:

```bash
# SPRÁVNÝ způsob pro DEV build:
npm run build:dev:explicit

# Nebo manuálně:
REACT_APP_API_BASE_URL=https://erdms.zachranka.cz/api \
REACT_APP_API2_BASE_URL=https://erdms.zachranka.cz/dev/api.eeo/ \
PUBLIC_URL=/dev/eeo-v2 \
npm run build
```

### ❌ NEPOUŽÍVAT:
```bash
npm run build:dev  # Ignoruje environment variables!
```

### Jak ověřit, že je build správný:

1. **Zkontroluj API endpoint v built JS:**
```bash
grep -o "https://erdms.zachranka.cz/dev/api.eeo" build/static/js/main.*.js
```

2. **Zkontroluj PUBLIC_URL v HTML:**
```bash
grep -o "/dev/eeo-v2" build/index.html
```

3. **Test v browseru:**
   - Otevři `/dev/eeo-v2`
   - Developer Console nesmí mít 404 errors
   - Network tab - API volání musí jít na `/dev/api.eeo/`

### Další kroky:
- **Dokumentace:** [BUILD_SEPARATION.md](BUILD_SEPARATION.md)
- **Scripts:** Použij `build:dev:explicit` z package.json
- **Production build:** `npm run build:prod` (používá explicitní config)

---

*Zapsal: 2025-12-30 - Po 1 hodině troubleshootingu s Copilot*
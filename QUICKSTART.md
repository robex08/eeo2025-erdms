# Quick Reference - Environment Configuration

## 🔧 Pro lokální vývoj (localhost)

```bash
# JEDNODUCHÝ ZPŮSOB - použij helper script:
cd /var/www/eeo2025
./dev-start.sh

# Nebo MANUÁLNĚ:
# 1. Zastav produkční službu
systemctl stop eeo2025-api.service

# 2. Spusť dev servery
cd /var/www/eeo2025/server && npm run dev &
cd /var/www/eeo2025/client && npm run dev
```

Otevři: http://localhost:5173

**Návrat do produkce:**
```bash
./dev-stop.sh
```

## 🚀 Pro dev server (erdms-dev.zachranka.cz)

```bash
# 1. Build clienta s production env
cd /var/www/eeo2025/client
npm run build
# Output: client/dist/

# 2. Zkopíruj .env.production na serveru
cd /var/www/eeo2025/server
cp .env.production .env
# Vyplň ENTRA_* hodnoty!

# 3. Spusť server s production env
npm run start:prod
```

## ⚠️ DŮLEŽITÉ - Azure Entra ID

V App Registration musíš přidat **Web Redirect URIs**:
- `http://localhost:5000/auth/callback`
- `https://erdms-dev.zachranka.cz/auth/callback`

## 📝 Co je kde

**Client ENV soubory:**
- `.env.development` → `VITE_API_URL=http://localhost:5000`
- `.env.production` → `VITE_API_URL=https://erdms-dev.zachranka.cz`

**Server ENV soubory:**
- `.env.development` → `ENTRA_REDIRECT_URI=http://localhost:5000/auth/callback`
- `.env.production` → `ENTRA_REDIRECT_URI=https://erdms-dev.zachranka.cz/auth/callback`

Kompletní návod: `/var/www/eeo2025/docs/ENVIRONMENT_SETUP.md`

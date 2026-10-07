# ERDMS - Emergency Response Data Management System

Systém pro správu dat záchranné služby s přihlášením přes Microsoft Entra ID (Azure AD).

## 📁 Dokumentace

- **EEO v2 build & deploy:** `apps/eeo-v2/_docs/BUILD.md` (samostatné repo `erdms-apps`, větev `eeo-v2/develop`)
- Dashboard / Entra build: [docs/BUILD-CONFIGURATION.md](docs/BUILD-CONFIGURATION.md)

> Starší build dokumentace eeo-v2 (BUILD.md, QUICK_BUILD_REFERENCE.md, VERSION_CHECKING_GUIDE.md, build prompty)
> je archivována v `/home/erdms_zalohy/root/docs-eeo-v2/root-build-docs-20261007/`.

## 🏗️ Struktura projektu

```
eeo2025/                        # Development workspace
├── client/                     # React frontend (Vite + MSAL)
├── server/                     # Express API (Node.js + MSAL)
└── dokumentace...

../erdms/                       # Production build (mimo workspace)
├── index.html                  # Client build
├── assets/                     
└── api/v1.0/                   # API build
```

## 🔐 Autentizace

Aplikace používá **Microsoft Entra ID** (dříve Azure AD) pro:
- Single Sign-On (SSO)
- Centralizovaná správa uživatelů
- Role-based access control (RBAC)
- Bezpečné API volání s Bearer tokeny

## 🛠️ Technologie

### Frontend
- React 18
- Vite (build tool)
- @azure/msal-react (Microsoft Authentication Library)
- Axios (HTTP klient)

### Backend
- Node.js 20
- Express
- @azure/msal-node
- JWT validace
- CORS, Helmet (security)

## 🚀 Rychlý start

```bash
# 1. Získej Client ID a Tenant ID od IT admina
# 2. Nastav .env soubory (viz START.md)
# 3. Spusť server
cd server && npm run dev

# 4. Spusť klienta (nový terminál)
cd client && npm run dev

# 5. Otevři http://localhost:3000
```


## 📦 Build pro produkci

Build se nasazuje do:
- Client: `/var/www/erdms/`
- API: `/var/www/erdms/api/v1.0/`

```bash
# Frontend build
cd client && npm run build
cp -r dist/* /var/www/erdms/

# Backend deploy
cd server
cp -r src/ /var/www/erdms/api/v1.0/
```

## 🌐 Produkční doména

- **URL:** https://erdms.zachranka.cz
- **Organizace:** ZZS - Zdravotnická záchranná služba

## 📝 Licence

Interní projekt ZZS

---

**Datum:** 1. prosince 2025

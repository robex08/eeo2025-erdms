# ERDMS - Emergency Response Data Management System

Systém pro správu dat záchranné služby s přihlášením přes Microsoft Entra ID (Azure AD).

## 📁 Dokumentace

- **[START.md](START.md)** - 🚀 Návod na spuštění aplikace (začni tady!)
- **[MICROSOFT_ENTRA_SETUP.md](MICROSOFT_ENTRA_SETUP.md)** - Instrukce pro IT admina - registrace v Microsoft Entra ID

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

Detailní instrukce v **[START.md](START.md)**

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

# ERDMS - Průvodce spuštěním

## 📋 Před spuštěním aplikace

### 1. Získej údaje od kolegy (viz MICROSOFT_ENTRA_SETUP.md)

Potřebuješ tyto hodnoty z Microsoft Entra ID:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_SECRET` (pro backend)

### 2. Nastavení environment variables

#### Backend (Server)
```bash
cd /var/www/eeo2025/server
cp .env.example .env
nano .env  # nebo vim .env
```

Vyplň hodnoty:
```env
PORT=5000
NODE_ENV=development

AZURE_TENANT_ID=tvoje-tenant-id
AZURE_CLIENT_ID=tvoje-client-id
AZURE_CLIENT_SECRET=tvoje-client-secret
AZURE_AUTHORITY=https://login.microsoftonline.com/tvoje-tenant-id

AZURE_API_SCOPE=api://tvoje-client-id/access_as_user
CLIENT_URL=http://localhost:3000
```

#### Frontend (Client)
```bash
cd /var/www/eeo2025/client
cp .env.example .env
nano .env  # nebo vim .env
```

Vyplň hodnoty:
```env
VITE_AZURE_CLIENT_ID=tvoje-client-id
VITE_AZURE_TENANT_ID=tvoje-tenant-id
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/tvoje-tenant-id

VITE_REDIRECT_URI=http://localhost:3000
VITE_API_URL=http://localhost:5000/api
VITE_AZURE_API_SCOPE=api://tvoje-client-id/access_as_user

VITE_APP_NAME=ERDMS
```

---

## 🚀 Spuštění aplikace

### Terminál 1 - Backend (API Server)
```bash
cd /var/www/eeo2025/server
source ~/.nvm/nvm.sh
npm run dev
```

Server poběží na: **http://localhost:5000**

### Terminál 2 - Frontend (React)
```bash
cd /var/www/eeo2025/client
source ~/.nvm/nvm.sh
npm run dev
```

Aplikace poběží na: **http://localhost:3000** (otevře se automaticky)

---

## 🧪 Testování přihlášení

1. Otevři prohlížeč: http://localhost:3000
2. Klikni na "Přihlásit se přes Microsoft"
3. Přihlaš se Microsoft účtem ze své organizace
4. První přihlášení vyžaduje souhlas s oprávněními (consent)
5. Po přihlášení uvidíš své údaje z Microsoft Entra ID

---

## 📁 Struktura projektu

```
eeo2025/
├── MICROSOFT_ENTRA_SETUP.md    # Instrukce pro kolegu (MS Entra registrace)
├── START.md                     # Tento soubor - návod na spuštění
├── README.md                    # Obecné info o projektu
│
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginPage.jsx   # Přihlašovací stránka
│   │   │   ├── HomePage.jsx    # Hlavní stránka po přihlášení
│   │   │   └── *.css
│   │   ├── config/
│   │   │   └── authConfig.js   # MSAL konfigurace
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env                     # Environment variables (NEVERZOVAT!)
│   ├── .env.example             # Template pro .env
│   └── package.json
│
└── server/                      # Express backend
    ├── src/
    │   ├── config/
    │   │   └── msalConfig.js    # MSAL konfigurace pro server
    │   ├── middleware/
    │   │   └── authMiddleware.js # JWT validace
    │   ├── routes/
    │   │   ├── auth.js          # Auth endpointy
    │   │   └── protected.js     # Chráněné endpointy
    │   └── index.js             # Hlavní server soubor
    ├── .env                      # Environment variables (NEVERZOVAT!)
    ├── .env.example              # Template pro .env
    └── package.json
```

---

## 🔍 API Endpointy

### Veřejné (bez autentizace)
- `GET /api/health` - Health check

### Chráněné (vyžadují Bearer token)
- `GET /api/auth/me` - Informace o přihlášeném uživateli
- `POST /api/auth/validate` - Validace tokenu
- `GET /api/protected/data` - Testovací chráněný endpoint
- `GET /api/protected/admin` - Testovací admin endpoint (vyžaduje roli "Admin")

### Volání API z frontendu

```javascript
// Získání access tokenu
const response = await instance.acquireTokenSilent({
  scopes: [import.meta.env.VITE_AZURE_API_SCOPE],
  account: accounts[0],
});

// Volání API
const apiResponse = await fetch('http://localhost:5000/api/auth/me', {
  headers: {
    Authorization: `Bearer ${response.accessToken}`,
  },
});
```

---

## 🐛 Troubleshooting

### Problém: "Configuration error" při startu serveru
**Řešení:** Zkontroluj `.env` soubor v `server/` složce - všechny povinné hodnoty musí být vyplněné.

### Problém: Přihlášení nefunguje
**Řešení:** 
1. Zkontroluj `.env` v `client/` složce
2. Ověř redirect URI v Microsoft Entra ID (musí obsahovat `http://localhost:3000`)
3. Zkontroluj console v prohlížeči (F12)

### Problém: API vrací 401 Unauthorized
**Řešení:**
1. Zkontroluj, že server běží
2. Ověř, že token je validní (v console prohlížeče)
3. Zkontroluj CORS nastavení na serveru

### Problém: "Client ID" nebo "Tenant ID" není validní
**Řešení:** Zkontroluj, že jsi správně zkopíroval hodnoty z Azure Portal (bez mezer a speciálních znaků)

---

## 📦 Build pro produkci

### Backend
```bash
cd /var/www/eeo2025/server
# Zkopíruj soubory do /var/www/erdms/api/v1.0/
cp -r src/ /var/www/erdms/api/v1.0/
cp package.json /var/www/erdms/api/v1.0/
cd /var/www/erdms/api/v1.0/
npm install --production
```

### Frontend
```bash
cd /var/www/eeo2025/client
npm run build
# Zkopíruj build do /var/www/erdms/
cp -r dist/* /var/www/erdms/
```

**Poznámka:** Před buildem nezapomeň změnit environment variables na produkční hodnoty!

---

## 📞 Kontakty a podpora

- **Microsoft Entra dokumentace:** https://learn.microsoft.com/en-us/entra/identity-platform/
- **MSAL.js dokumentace:** https://github.com/AzureAD/microsoft-authentication-library-for-js
- **Graph API dokumentace:** https://learn.microsoft.com/en-us/graph/

---

**Datum vytvoření:** 1. prosince 2025  
**Pro projekt:** ERDMS - Emergency Response Data Management System  
**Organizace:** ZZS - Zdravotnická záchranná služba

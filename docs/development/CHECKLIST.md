# ✅ CHECKLIST - Připravenost pro MS Entra ID implementaci

## 📋 Co máme hotové

### 1. ✅ DOKUMENTACE (3 soubory)

- **MICROSOFT_ENTRA_SETUP.md** (8.4 KB)
  - ✅ Kompletní návod pro IT admina
  - ✅ Krok za krokem registrace aplikace
  - ✅ Všechna potřebná oprávnění
  - ✅ Multi-environment setup (localhost, dev, prod)
  - ✅ Seamless SSO instrukce
  - ✅ Client Secret management
  
- **START.md** (5.9 KB)
  - ✅ Návod na spuštění pro vývojáře
  - ✅ Environment variables setup
  - ✅ Troubleshooting sekce
  - ✅ API endpoints dokumentace
  - ✅ Build instrukce

- **README.md** (2.1 KB)
  - ✅ Přehled projektu
  - ✅ Technologie stack
  - ✅ Quick start

---

### 2. ✅ CLIENT (React + Vite + MSAL)

**Konfigurace:**
- ✅ `.env.example` - Template s všemi proměnnými
- ✅ `src/config/authConfig.js` - MSAL konfigurace + SSO
- ✅ `package.json` - Všechny dependencies (@azure/msal-react, @azure/msal-browser, axios)

**Komponenty:**
- ✅ `src/components/LoginPage.jsx` - Přihlašovací obrazovka s Microsoft tlačítkem
- ✅ `src/components/LoginPage.css` - Stylování
- ✅ `src/components/HomePage.jsx` - Domovská stránka s user info
- ✅ `src/components/HomePage.css` - Stylování

**Hlavní aplikace:**
- ✅ `src/App.jsx` - MSAL Provider + SSO auto-login
- ✅ `src/App.css` - Global styles

**Features:**
- ✅ Microsoft Entra ID přihlášení (popup i redirect)
- ✅ Automatické SSO (ssoSilent)
- ✅ Graph API integrace (zobrazení user údajů)
- ✅ Token management
- ✅ Logout funkcionalita

---

### 3. ✅ SERVER (Express + Node.js + MSAL)

**Konfigurace:**
- ✅ `.env.example` - Template s Azure credentials
- ✅ `src/config/msalConfig.js` - MSAL server config
- ✅ `package.json` - Dependencies (express, @azure/msal-node, jwks-rsa, jsonwebtoken)

**Middleware:**
- ✅ `src/middleware/authMiddleware.js` - JWT token validation
  - Bearer token verification
  - Microsoft JWKS key validation
  - Role-based access control (RBAC)

**Routes:**
- ✅ `src/routes/auth.js` - Auth endpoints
  - GET /api/auth/me - User info
  - POST /api/auth/validate - Token validation
  - GET /api/auth/logout - Logout
  
- ✅ `src/routes/protected.js` - Protected endpoints
  - GET /api/protected/data - Demo protected data
  - GET /api/protected/admin - Admin-only endpoint

**Hlavní server:**
- ✅ `src/index.js` - Express app
  - CORS konfigurace
  - Security headers (helmet)
  - Error handling
  - Health check endpoint

---

## 📦 Nainstalované balíčky

### Client:
```json
{
  "@azure/msal-browser": "^3.x",
  "@azure/msal-react": "^2.x",
  "axios": "^1.x",
  "react": "^18.x",
  "react-router-dom": "^6.x"
}
```

### Server:
```json
{
  "express": "^4.x",
  "@azure/msal-node": "^2.x",
  "jwks-rsa": "^3.x",
  "jsonwebtoken": "^9.x",
  "cors": "^2.x",
  "helmet": "^7.x",
  "dotenv": "^16.x"
}
```

---

## 🎯 Co NENÍ potřeba (už je hotové)

- ❌ ~~Instalace Node.js/npm~~ - ✅ Máme v20.19.6 + npm 11.6.4
- ❌ ~~Vytvoření projektu~~ - ✅ Client i Server inicializované
- ❌ ~~MSAL integrace~~ - ✅ Implementováno v obou částech
- ❌ ~~Přihlašovací UI~~ - ✅ Hotové komponenty
- ❌ ~~API autentizace~~ - ✅ Middleware + routes hotové
- ❌ ~~SSO logika~~ - ✅ Implementováno
- ❌ ~~Build scripty~~ - ✅ Připravené

---

## ⏳ Co CHYBÍ (potřebujeme od kolegy)

### 🔑 Z Microsoft Entra ID registrace:

1. **AZURE_CLIENT_ID** (Application ID)
2. **AZURE_TENANT_ID** (Directory ID)
3. **AZURE_CLIENT_SECRET** (pro backend)

### ⚙️ Nastavení v Azure (kolega musí udělat):

1. **App Registration** v Microsoft Entra ID
   - Název: ERDMS
   - Type: Single tenant
   - Redirect URIs (všechny 3 prostředí)

2. **API Permissions**
   - User.Read
   - Group.Read.All
   - Admin consent granted

3. **Expose an API**
   - Scope: access_as_user

4. **Client Secret**
   - Vytvořen a uložen

5. **(Volitelné) Seamless SSO**
   - Enabled pro Azure AD joined počítače

---

## 🚀 DALŠÍ KROKY

### Krok 1: Pošli dokumentaci kolegovi
```bash
# Otevři a pošli tento soubor:
/var/www/eeo2025/MICROSOFT_ENTRA_SETUP.md
```

### Krok 2: Počkej na hodnoty od kolegy
Kolega ti pošle 3 hodnoty (Client ID, Tenant ID, Secret)

### Krok 3: Nastav .env soubory
```bash
# Client
cd /var/www/eeo2025/client
cp .env.example .env
nano .env  # vyplň hodnoty

# Server
cd /var/www/eeo2025/server
cp .env.example .env
nano .env  # vyplň hodnoty
```

### Krok 4: Spusť aplikaci
```bash
# Terminál 1 - Server
cd /var/www/eeo2025/server
npm run dev

# Terminál 2 - Client
cd /var/www/eeo2025/client
npm run dev
```

### Krok 5: Otevři prohlížeč
```
http://localhost:3000
```

### Krok 6: Test přihlášení
- Klikni "Přihlásit se přes Microsoft"
- Přihlaš se Microsoft účtem
- První přihlášení vyžaduje consent (souhlas)
- Měl bys vidět své údaje na HomePage

---

## 🔍 Co otestovat

### Základní funkce:
- ✅ Přihlášení (popup)
- ✅ Přihlášení (redirect)
- ✅ Zobrazení user údajů (jméno, email, telefon, oddělení)
- ✅ Odhlášení
- ✅ Automatické SSO (pokud je na doménovém PC)

### API testy:
```bash
# Získej token z aplikace (F12 Console)
# Pak testuj API:

curl http://localhost:5000/api/health

curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

curl http://localhost:5000/api/protected/data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ❓ Časté problémy

### "AADSTS50011: Reply URL mismatch"
**Řešení:** Kolega musí přidat správné Redirect URIs v Azure

### "Configuration error" při startu serveru
**Řešení:** Zkontroluj .env v server/ - všechny hodnoty musí být vyplněné

### "401 Unauthorized" při volání API
**Řešení:** Token není validní nebo server nemá správný Tenant ID

### SSO nefunguje
**Řešení:** 
- Počítač musí být Azure AD joined
- Seamless SSO musí být enabled v Azure
- Uživatel musí být přihlášený na Windows s Microsoft účtem

---

## 📊 Shrnutí připravenosti

| Kategorie | Status | Poznámka |
|-----------|--------|----------|
| **Dokumentace** | ✅ 100% | Kompletní |
| **Client kód** | ✅ 100% | Hotový + SSO |
| **Server kód** | ✅ 100% | Hotový + JWT validace |
| **Dependencies** | ✅ 100% | Nainstalované |
| **Azure registrace** | ⏳ Čeká | Potřebujeme od kolegy |
| **Environment config** | ⏳ Čeká | Po získání hodnot |
| **Testing** | ⏳ Čeká | Po konfiguraci |

---

## ✅ ZÁVĚR

**Máme připraveno 100% kódu a dokumentace!**

Chybí nám pouze:
1. Registrace v Microsoft Entra ID (kolega)
2. 3 hodnoty (Client ID, Tenant ID, Secret)
3. Vyplnění .env souborů

Po těchto 3 krocích můžeš **okamžitě testovat**! 🚀

---

**Datum kontroly:** 1. prosince 2025  
**Projekt:** ERDMS - Emergency Response Data Management System  
**Status:** ✅ PŘIPRAVENO K NASAZENÍ (čeká na Azure registraci)

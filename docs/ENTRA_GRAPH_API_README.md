# Microsoft Graph API Integration - ERDMS

## 🎯 Co bylo implementováno

### 1. **Backend (Server)**

#### Nové balíčky:
```bash
npm install @microsoft/microsoft-graph-client @azure/identity
```

#### Nové soubory:
- `server/src/services/entraService.js` - Graph API service
- `server/src/routes/entra.js` - API endpointy
- `server/test-graph-api.js` - Test script

### 2. **Frontend (Client)**

#### Aktualizované soubory:
- `client/src/components/Dashboard.jsx` - Přidán Graph API přehled
- `client/src/components/Dashboard.css` - Nové styly

### 3. **Dokumentace**
- `docs/ENTRA_GRAPH_API_SETUP.md` - Kompletní návod

---

## 🚀 Spuštění

### 1. Nastavení oprávnění v Azure Portal

**DŮLEŽITÉ:** Bez tohoto kroku Graph API NEBUDE fungovat!

Následuj návod: `docs/ENTRA_GRAPH_API_SETUP.md`

**Zkrácený postup:**
1. Azure Portal → Entra ID → App registrations → [ERDMS]
2. API permissions → Add permission → Microsoft Graph
3. Vyber **Application permissions** (ne Delegated!)
4. Přidej: `User.Read.All`, `Group.Read.All`, `GroupMember.Read.All`
5. **Grant admin consent** ← KRITICKÉ!

### 2. Kontrola .env souboru

```bash
# /var/www/eeo2025/server/.env
ENTRA_CLIENT_ID=92eaadde-7e3e-4ad1-8c45-3b875ff5c76b
ENTRA_TENANT_ID=2bd7827b-4550-48ad-bd15-62f9a17990f1
ENTRA_CLIENT_SECRET=<tvůj_secret>
ENTRA_AUTHORITY=https://login.microsoftonline.com/2bd7827b-4550-48ad-bd15-62f9a17990f1
```

### 3. Test Graph API

```bash
cd /var/www/eeo2025/server

# Test základní
node test-graph-api.js

# Test s konkrétním uživatelem
node test-graph-api.js robert.holovsky@zachranka.cz
```

### 4. Restart serveru

```bash
systemctl restart eeo2025-api.service
```

---

## 📊 API Endpointy

Všechny endpointy vyžadují autentizaci (JWT token).

### Uživatelé
```http
GET /api/entra/user/:userId
GET /api/entra/user/:userId/groups
GET /api/entra/user/:userId/manager
GET /api/entra/user/:userId/direct-reports
GET /api/entra/user/:userId/profile          # Vše najednou
```

### Skupiny
```http
GET /api/entra/group/:groupId
GET /api/entra/group/:groupId/members
GET /api/entra/groups                        # Všechny skupiny
```

### Vyhledávání
```http
GET /api/entra/search/user?email=user@example.com
```

---

## 🎨 Co vidí uživatel na Dashboard

### 🔐 Členství ve skupinách
- **GUID skupiny** (např. `a1b2c3d4-e5f6-...`)
- Název skupiny
- Typ: Security / Mail / M365 badge
- Popis skupiny
- Email skupiny

### 🧑‍💼 Nadřízený (Manager)
- **GUID managera**
- Celé jméno
- UPN (userPrincipalName)
- Pozice (jobTitle)
- Email

### 👥 Podřízení (Direct Reports)
- Seznam všech podřízených
- Pro každého: GUID, jméno, pozice, email

---

## 🧪 Testování

### Test 1: Server log
```bash
# Restart serveru a sleduj log
systemctl restart eeo2025-api.service
journalctl -u eeo2025-api.service -f
```

Měl bys vidět:
```
✅ EntraService initialized
```

### Test 2: API endpoint
```bash
# Získej JWT token (po přihlášení v prohlížeči)
# Token najdeš v Developer Tools → Application → Cookies

curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/entra/groups
```

### Test 3: Dashboard
1. Přihlaš se do aplikace
2. Dashboard by měl zobrazit nové sekce:
   - 🔐 Členství ve skupinách (s GUID)
   - 🧑‍💼 Nadřízený
   - 👥 Podřízení

---

## 🚨 Řešení problémů

### ❌ "Insufficient privileges"
**Příčina:** Chybí admin consent

**Řešení:**
1. Azure Portal → API permissions
2. Grant admin consent
3. Restart serveru

### ❌ "Invalid client secret"
**Příčina:** Secret vypršel nebo je špatný

**Řešení:**
1. Azure Portal → Certificates & secrets
2. Vytvoř nový secret
3. Aktualizuj `.env`
4. Restart serveru

### ❌ Dashboard nezobrazuje Graph data
**Příčina:** Uživatel nemá `entra_id` v databázi

**Řešení:**
- Graph API data se načítají jen pokud uživatel má `entra_id`
- Po přihlášení přes Entra ID se `entra_id` automaticky uloží

### ❌ "Cannot find module @microsoft/microsoft-graph-client"
**Příčina:** Balíčky nejsou nainstalované

**Řešení:**
```bash
cd /var/www/eeo2025/server
npm install
```

---

## 📚 Struktura kódu

```
server/
├── src/
│   ├── services/
│   │   └── entraService.js       ← Graph API logika
│   └── routes/
│       └── entra.js              ← API endpointy
└── test-graph-api.js             ← Test script

client/
└── src/
    └── components/
        ├── Dashboard.jsx         ← UI s Graph daty
        └── Dashboard.css         ← Styly

docs/
└── ENTRA_GRAPH_API_SETUP.md      ← Kompletní návod
```

---

## 🔒 Bezpečnost

- ✅ Všechny endpointy vyžadují autentizaci (`verifyToken`)
- ✅ Application permissions (server-side only)
- ✅ Client secret v `.env` (ne v gitu)
- ✅ HTTPS v produkci

---

## 📖 Další informace

**Microsoft Graph Explorer:**
https://developer.microsoft.com/en-us/graph/graph-explorer

**Graph API dokumentace:**
https://learn.microsoft.com/en-us/graph/overview

**Oprávnění reference:**
https://learn.microsoft.com/en-us/graph/permissions-reference

---

**Autor:** GitHub Copilot  
**Datum:** 3. prosince 2025  
**Verze:** 1.0

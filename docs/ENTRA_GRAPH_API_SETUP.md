# Microsoft Graph API - Nastavení oprávnění

## 📋 Přehled

Pro použití **Microsoft Graph API** v aplikaci ERDMS potřebuješ nastavit správná oprávnění v **Azure Portal** → **Microsoft Entra ID**.

---

## 🔑 Co Graph API umožňuje

| **Funkce** | **API Endpoint** | **Potřebné oprávnění** |
|------------|------------------|------------------------|
| ✅ Získat uživatele | `GET /users/{id}` | `User.Read.All` |
| ✅ Získat skupiny uživatele (včetně GUID) | `GET /users/{id}/memberOf` | `Group.Read.All` |
| ✅ Získat detaily skupiny | `GET /groups/{id}` | `Group.Read.All` |
| ✅ Získat členy skupiny | `GET /groups/{id}/members` | `GroupMember.Read.All` |
| ✅ Získat managera (nadřízeného) | `GET /users/{id}/manager` | `User.Read.All` |
| ✅ Získat podřízené | `GET /users/{id}/directReports` | `User.Read.All` |
| ✅ Vyhledat uživatele | `GET /users?$filter=...` | `User.Read.All` |
| ✅ Získat všechny skupiny | `GET /groups` | `Group.Read.All` |

---

## ⚙️ Postup nastavení v Azure Portal

### 1. Přihlášení do Azure Portal

```
https://portal.azure.com
```

**Navigace:**
- Azure Portal → **Microsoft Entra ID** → **App registrations** → **[Tvoje aplikace ERDMS]**

**Informace o aplikaci:**
- **Application (client) ID**: `92eaadde-7e3e-4ad1-8c45-3b875ff5c76b`
- **Directory (tenant) ID**: `2bd7827b-4550-48ad-bd15-62f9a17990f1`

---

### 2. Přidat API Permissions

**Navigace:**
```
App registrations → [ERDMS] → API permissions → Add a permission
```

#### Krok 1: Vybrat Microsoft Graph
- Klikni na **"Add a permission"**
- Vyber **"Microsoft Graph"**

#### Krok 2: Vybrat typ oprávnění
- ⚠️ **DŮLEŽITÉ**: Vyber **"Application permissions"** (NE Delegated!)

**Proč Application permissions?**
- Server potřebuje přistupovat k datům **nezávisle na uživateli**
- Delegated permissions fungují jen když je uživatel přihlášen interaktivně
- Application permissions = server má trvalý přístup

#### Krok 3: Přidat oprávnění

**Minimální oprávnění:**
```
✅ User.Read.All            - Číst všechny uživatele
✅ Group.Read.All           - Číst všechny skupiny
✅ GroupMember.Read.All     - Číst členy skupin
```

**Doporučená oprávnění (více dat):**
```
✅ Directory.Read.All       - Číst celý adresář (zahrnuje vše výše)
```

**Postup:**
1. Rozbal **"User"** → zaškrtni **"User.Read.All"**
2. Rozbal **"Group"** → zaškrtni **"Group.Read.All"**
3. Rozbal **"GroupMember"** → zaškrtni **"GroupMember.Read.All"**
4. Klikni **"Add permissions"**

---

### 3. Admin Consent (KRITICKÉ!)

⚠️ **Application permissions vyžadují schválení adminem!**

**Postup:**
1. V sekci **API permissions** klikni na **"Grant admin consent for [Tenant]"**
2. Potvrď **"Yes"**
3. ✅ Zkontroluj, že u všech oprávnění je **zelené zatržítko** ve sloupci **"Status"**

**Bez admin consent API NEBUDE FUNGOVAT!**

---

## 🔧 Konfigurace .env souboru

Ujisti se, že máš v `/var/www/eeo2025/server/.env` tyto hodnoty:

```env
# Microsoft Entra ID
ENTRA_CLIENT_ID=92eaadde-7e3e-4ad1-8c45-3b875ff5c76b
ENTRA_TENANT_ID=2bd7827b-4550-48ad-bd15-62f9a17990f1
ENTRA_CLIENT_SECRET=<tvůj_client_secret>
ENTRA_AUTHORITY=https://login.microsoftonline.com/2bd7827b-4550-48ad-bd15-62f9a17990f1
```

**Poznámka:**
- `ENTRA_TENANT_ID` je poslední část `ENTRA_AUTHORITY` URL
- EntraService automaticky parsuje tenant ID z authority, pokud `ENTRA_TENANT_ID` není nastavené

---

## 🧪 Testování Graph API

### Test 1: Základní připojení

```bash
cd /var/www/eeo2025/server
node -e "
const entraService = require('./src/services/entraService');
(async () => {
  try {
    await entraService.initialize();
    console.log('✅ Graph API initialized');
  } catch (err) {
    console.error('🔴 ERROR:', err.message);
  }
})();
"
```

### Test 2: Získat skupiny uživatele

```bash
# Nahraď <ENTRA_ID> skutečným GUID uživatele
node -e "
const entraService = require('./src/services/entraService');
(async () => {
  const groups = await entraService.getUserGroups('<ENTRA_ID>');
  console.log('Groups:', groups.length);
  groups.forEach(g => console.log('-', g.displayName, '|', g.id));
})();
"
```

### Test 3: API endpoint (po spuštění serveru)

```bash
# Spusť server
npm start

# V druhém terminálu
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/entra/user/<ENTRA_ID>/groups
```

---

## 📊 API Endpointy v ERDMS

Server má tyto endpointy (vyžadují autentizaci):

### Uživatelé
```
GET /api/entra/user/:userId                    # Základní info
GET /api/entra/user/:userId/groups             # Skupiny (+ GUID)
GET /api/entra/user/:userId/manager            # Nadřízený
GET /api/entra/user/:userId/direct-reports     # Podřízení
GET /api/entra/user/:userId/profile            # Vše najednou
```

### Skupiny
```
GET /api/entra/group/:groupId                  # Detail skupiny
GET /api/entra/group/:groupId/members          # Členové
GET /api/entra/groups                          # Všechny skupiny
```

### Vyhledávání
```
GET /api/entra/search/user?email=user@example.com
```

---

## 🎯 Co vidí Dashboard

Po přihlášení uživatel uvidí:

### 🔐 Členství ve skupinách
- **GUID skupiny** (např. `a1b2c3d4-...`)
- Název skupiny
- Typ: Security / Mail / M365
- Popis skupiny
- Email skupiny

### 🧑‍💼 Nadřízený (Manager)
- **GUID managera**
- Celé jméno
- Pozice (jobTitle)
- Email
- UPN

### 👥 Podřízení (Direct Reports)
- Seznam všech podřízených
- Pro každého: GUID, jméno, pozice, email

---

## 🚨 Řešení problémů

### ❌ Error: "Insufficient privileges"
**Příčina:** Chybí admin consent

**Řešení:**
1. Jdi do Azure Portal → API permissions
2. Klikni **"Grant admin consent"**
3. Zkontroluj zelené zatržítko u všech oprávnění

---

### ❌ Error: "Invalid client secret"
**Příčina:** Client secret vypršel nebo je nesprávný

**Řešení:**
1. Azure Portal → Certificates & secrets
2. Zkontroluj expiraci
3. Případně vytvoř nový secret
4. Aktualizuj `.env` soubor

---

### ❌ Error: "Application permissions not granted"
**Příčina:** Používáš Delegated místo Application permissions

**Řešení:**
1. Odstraň Delegated permissions
2. Přidej Application permissions
3. Grant admin consent

---

### ❌ Graph API nefunguje, ale autentizace ano
**Příčina:** Pravděpodobně chybí `ENTRA_TENANT_ID` v `.env`

**Řešení:**
```bash
# Přidej do .env
ENTRA_TENANT_ID=2bd7827b-4550-48ad-bd15-62f9a17990f1
```

---

## 📚 Další zdroje

**Microsoft Graph Explorer:**
```
https://developer.microsoft.com/en-us/graph/graph-explorer
```
Interaktivní nástroj pro testování Graph API dotazů.

**Graph API dokumentace:**
```
https://learn.microsoft.com/en-us/graph/overview
```

**Oprávnění reference:**
```
https://learn.microsoft.com/en-us/graph/permissions-reference
```

---

## ✅ Checklist

Po konfiguraci zkontroluj:

- [ ] Application permissions přidána v Azure Portal
- [ ] Admin consent udělen (zelené zatržítko)
- [ ] `.env` soubor obsahuje `ENTRA_TENANT_ID`
- [ ] Client secret není expirovaný
- [ ] Server se restartoval po změně `.env`
- [ ] Test Graph API úspěšný
- [ ] Dashboard zobrazuje skupiny s GUID
- [ ] Dashboard zobrazuje managera
- [ ] Dashboard zobrazuje podřízené

---

**Poslední aktualizace:** 3. prosince 2025

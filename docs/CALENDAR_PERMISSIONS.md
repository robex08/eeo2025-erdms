# Oprávnění pro čtení kalendáře v Azure AD / Entra ID

**Datum:** 23. prosince 2025  
**Pro:** Načítání událostí z Outlook kalendáře v ERDMS dashboardu

---

## 🔑 Potřebná oprávnění v Azure App Registration

Pro načítání událostí z kalendáře potřebuje aplikace v Azure AD / Entra ID následující oprávnění:

### 1. Delegovaná oprávnění (Delegated Permissions) - DOPORUČENO

Tato oprávnění fungují v kontextu přihlášeného uživatele:

#### Minimální oprávnění:
- **`Calendars.Read`** - Čtení kalendáře uživatele
  - Umožňuje aplikaci číst události v kalendářích uživatele
  - Uživatel vidí pouze své vlastní události

#### Rozšířená oprávnění (optional):
- **`Calendars.Read.Shared`** - Čtení sdílených kalendářů
  - Pokud chcete zobrazovat i kalendáře sdílené s uživatelem

### 2. Application Permissions - NE PRO TENTO USE CASE

⚠️ **NEDOPORUČENO** pro dashboard (čtení vlastního kalendáře uživatele):
- `Calendars.Read` (Application) - Vyžaduje Admin Consent
- Čte všechny kalendáře všech uživatelů v organizaci
- Používá se pro backend služby, ne pro uživatelské aplikace

---

## 📋 Jak přidat oprávnění v Azure Portal

### Krok 1: Otevři App Registration
1. Přihlas se do [Azure Portal](https://portal.azure.com)
2. Jdi na **Azure Active Directory** (nebo **Microsoft Entra ID**)
3. V levém menu **App registrations**
4. Najdi aplikaci: **ERDMS Dashboard** (Client ID: `92eaadde-7e3e-4ad1-8c45-3b875ff5c76b`)

### Krok 2: Přidej API permissions
1. V levém menu klikni na **API permissions**
2. Klikni **Add a permission**
3. Vyber **Microsoft Graph**
4. Vyber **Delegated permissions**
5. V search boxu zadej `Calendars`
6. Zaškrtni:
   - ✅ **Calendars.Read**
   - ✅ **Calendars.Read.Shared** (optional)
7. Klikni **Add permissions**

### Krok 3: Admin Consent (pokud je potřeba)
- Pokud se zobrazuje varování "Not granted for [tenant]"
- Klikni **Grant admin consent for [Zachranka]**
- Potvrzuj jako admin

### Krok 4: Ověření
Po přidání by mělo vypadat:

```
API / Permissions name               Type        Status
Microsoft Graph
  Calendars.Read                     Delegated   ✓ Granted for Zachranka
  Calendars.Read.Shared              Delegated   ✓ Granted for Zachranka
  User.Read                          Delegated   ✓ Granted for Zachranka
  (další existující oprávnění...)
```

---

## 🔍 Ověření že oprávnění fungují

### Test 1: Kontrola v kódu
API endpoint používá:
```javascript
GET /api/entra/me/calendar/events?limit=7
```

Interně volá Microsoft Graph API:
```
GET https://graph.microsoft.com/v1.0/me/calendar/events
```

### Test 2: Manuální test Graph API
Můžeš otestovat v [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer):

1. Přihlas se jako testovací uživatel (např. u03924@zachranka.cz)
2. Zadej query:
   ```
   GET https://graph.microsoft.com/v1.0/me/calendar/events?$top=7
   ```
3. Pokud vrátí události → oprávnění OK ✅
4. Pokud vrátí 403 Forbidden → chybí oprávnění ❌

### Test 3: Console v browseru
1. Otevři dashboard (https://erdms.zachranka.cz)
2. Otevři DevTools (F12) → Console
3. Klikni na ikonu kalendáře
4. Sleduj Network tab:
   - Pokud vidíš `200 OK` a data → funguje ✅
   - Pokud vidíš `403 Forbidden` → chybí oprávnění ❌
   - Pokud vidíš `401 Unauthorized` → token problém ❌

---

## 🐛 Troubleshooting

### Problém: "403 Forbidden" nebo "Insufficient privileges"

**Příčina:** Chybí oprávnění nebo není grantnutý admin consent

**Řešení:**
1. Zkontroluj že oprávnění `Calendars.Read` je přidáno
2. Zkontroluj že má status "Granted for Zachranka"
3. Pokud ne, klikni "Grant admin consent"
4. Vyčkej 5-10 minut na propagaci změn
5. Uživatel se musí odhlásit a znovu přihlásit (nový token)

### Problém: "The token contains invalid signature"

**Příčina:** Starý token nemá nová oprávnění

**Řešení:**
1. Odhlásit se z dashboardu
2. Smazat cookies
3. Přihlásit se znovu
4. Tím se získá nový access token s novými oprávněními

### Problém: Nic se nezobrazuje, ale žádná chyba

**Možné příčiny:**
1. Uživatel nemá žádné nadcházející události v kalendáři
2. Backend API neběží
3. Frontend se nepřipojuje na správný endpoint

**Řešení:**
```bash
# Zkontroluj že EEO API běží
ss -tlnp | grep :3000

# Zkontroluj logy
tail -f /tmp/eeo-api-restart.log

# Test endpointu
curl -i http://localhost:3000/api/entra/me/calendar/events \
  -H "Cookie: erdms_session=..."
```

---

## 📊 Přehled všech potřebných oprávnění pro ERDMS Dashboard

Pro plnou funkcionalitu dashboardu by aplikace měla mít:

### Delegated Permissions (Microsoft Graph):
- ✅ **User.Read** - Základní profil uživatele
- ✅ **User.ReadBasic.All** - Čtení základních profilů ostatních uživatelů
- ✅ **Calendars.Read** - Čtení kalendáře uživatele
- ✅ **Calendars.Read.Shared** - Čtení sdílených kalendářů (optional)

### Application Permissions (pro backend service):
- ✅ **User.Read.All** - Čtení všech uživatelů (pro přehled zaměstnanců)
- ✅ **Group.Read.All** - Čtení skupin (pro licence M365)

---

## 🔗 Užitečné odkazy

- [Microsoft Graph Calendar API](https://learn.microsoft.com/en-us/graph/api/resources/calendar)
- [Calendars.Read permission](https://learn.microsoft.com/en-us/graph/permissions-reference#calendarsread)
- [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)
- [Azure Portal](https://portal.azure.com)

---

**Poznámka:** Po přidání nových oprávnění se všichni uživatelé musí odhlásit a znovu přihlásit, aby získali nový token s aktualizovanými oprávněními.

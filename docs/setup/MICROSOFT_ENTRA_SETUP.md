# Microsoft Entra ID - Požadavky na registraci aplikace

## 📋 Co potřebuješ od kolegy (Admin MS 365)

### 1. Přístup do Azure Portal
- **URL:** https://portal.azure.com
- **Role:** Application Administrator nebo Cloud Application Administrator
- **Potřebné oprávnění:** Možnost registrovat aplikace v Entra ID

---

## 🔧 Kroky registrace aplikace v Microsoft Entra ID

### KROK 1: Vytvoření App Registration

1. Přejít na: **Azure Portal** → **Microsoft Entra ID** → **App registrations** → **New registration**

2. **Vyplnit základní údaje:**
   ```
   Název aplikace: ERDMS
   
   Supported account types: 
   ☑ Accounts in this organizational directory only (Single tenant)
   
   Redirect URI: 
   - Type: Web (DŮLEŽITÉ: Ne SPA!)
   - Value: http://localhost:5000/auth/callback
   ```

3. **Kliknout:** Create

⚠️ **DŮLEŽITÉ:** Aplikace MUSÍ být typu **Web** (Confidential Client), ne SPA (Public Client), 
protože používáme server-side OAuth flow s client secret.

---

### KROK 2: Poznamenat důležité hodnoty

Po vytvoření aplikace **OKAMŽITĚ** poznamenat tyto hodnoty:

```
Application (client) ID: ________________________________
Directory (tenant) ID:   ________________________________
```

Tyto hodnoty najdeš na stránce **Overview** tvé aplikace.

---

### KROK 3: Konfigurace Authentication

1. V menu aplikace: **Authentication** → **Platform configurations**

2. **Přidat Redirect URI pro všechna prostředí:**
   ```
   Type: Web (DŮLEŽITÉ: Ne SPA!)
   
   Development (localhost):
   - http://localhost:5000/auth/callback
   
   Staging/Testing:
   - https://erdms-dev.zachranka.cz/auth/callback
   
   Production:
   - https://erdms.zachranka.cz/auth/callback
   ```
   
   ⚠️ **POZNÁMKA:** URIs odkazují na BACKEND (port 5000), ne frontend!
   Frontend (port 5173) se přihlašuje přes backend OAuth flow.

3. **Front-channel logout URL (volitelné):**
   ```
   Development:
   - http://localhost:5173
   
   Staging:
   - https://erdms-dev.zachranka.cz
   
   Production:
   - https://erdms.zachranka.cz
   ```

4. **Implicit grant and hybrid flows:**
   ```
   ☐ Access tokens - NEVYBÍRAT
   ☐ ID tokens - NEVYBÍRAT
   
   ⚠️ Používáme Authorization Code Flow s PKCE (bezpečnější)
   ```

5. **Advanced settings:**
   ```
   Allow public client flows: No ❌
   ```
   Důvod: Confidential client s client secret.

6. **Kliknout:** Save

---

### KROK 4: API Permissions (Oprávnění)

1. V menu: **API permissions** → **Add a permission**

2. **Vybrat:** Microsoft Graph

3. **Vybrat:** Delegated permissions

4. **Přidat minimální oprávnění:**
   ```
   ☑ openid           (Základní přihlášení)
   ☑ profile          (Základní profil uživatele)
   ☑ email            (Email uživatele)
   ☑ User.Read        (Čtení profilu přihlášeného uživatele)
   ```

5. **Doporučená oprávnění pro ERDMS:**
   ```
   ☑ User.ReadBasic.All   (Čtení základních info uživatelů - pro zobrazení týmu)
   ☑ Group.Read.All       (Čtení skupin - pro řízení přístupu podle skupin)
   ```

   **Poznámka:** Aplikace bude zobrazovat: celé jméno, tituly, pracovní zařazení, 
   skupiny, email, telefon. Všechny tyto údaje získáme přes User.Read a Group.Read.All.

6. **Grant admin consent:**
   - Po přidání oprávnění kliknout: **Grant admin consent for [Organization]**
   - Tento krok MUSÍ udělat admin!

---

### KROK 5: Expose an API (Pro Backend API)

⚠️ **Tento krok je potřeba, pokud chceš chránit API na backendu!**

1. V menu: **Expose an API** → **Add a scope**

2. **Application ID URI:**
   - Použít navržené: `api://{client_id}`
3. **Vytvořit scope:**
   ```
   Scope name: access_as_user
   Who can consent: Admins and users
   Admin consent display name: Access ERDMS API
   Admin consent description: Allows the app to access ERDMS API on behalf of the signed-in user
   User consent display name: Access ERDMS API
   User consent description: Allows the app to access ERDMS API on your behalf
   State: Enabled
   ```r consent description: Allows the app to access EEO2025 API on your behalf
   State: Enabled
   ```

4. **Kliknout:** Add scope

5. **Poznamenat scope URI:**
   ```
   Scope: api://{client_id}/access_as_user
   ```

---

### KROK 6: Certificates & secrets (POVINNÉ pro Web aplikaci)

⚠️ **DŮLEŽITÉ: Pro confidential client flow je client secret POVINNÝ!**

1. V menu: **Certificates & secrets** → **Client secrets** → **New client secret**

2. **Vytvořit secret:**
   ```
   Description: ERDMS Backend Secret
   Expires: 24 months (doporučeno)
   ```

3. **OKAMŽITĚ zkopírovat Value (secret):**
   ```
   Client Secret: ________________________________
   
   ⚠️ VAROVÁNÍ: Secret se zobrazí pouze jednou! 
   Po obnovení stránky ho už neuvidíš!
   Ulož si ho do /var/www/eeo2025/server/.env jako ENTRA_CLIENT_SECRET
   ```

---

## 📝 Finální checklist hodnot

Po dokončení registrace kolega musí poskytnout tyto hodnoty:

```bash
# Povinné hodnoty pro server .env
ENTRA_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
ENTRA_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
ENTRA_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # POVINNÝ pro Web app
ENTRA_AUTHORITY="https://login.microsoftonline.com/{tenant_id}"
ENTRA_REDIRECT_URI="http://localhost:5000/auth/callback"  # Backend port!

# Client URL (pro CORS)
CLIENT_URL="http://localhost:5173"  # Frontend Vite dev server
```

**Kam tyto hodnoty zapsat:**
- Server: `/var/www/eeo2025/server/.env`
- Frontend nepotřebuje Azure credentials! Používá backend OAuth flow.

---

## 🔐 Bezpečnostní poznámky

### Co NIKDY nedávat do GIT repozitáře:
- ❌ Client Secret
- ❌ Jakékoliv hesla nebo tokeny
- ✅ Client ID a Tenant ID jsou veřejné pro frontend (to je OK)

### Doporučení:
1. Client Secret ukládat pouze do `.env` souboru
2. `.env` přidat do `.gitignore`
3. Pro produkci použít Azure Key Vault nebo environment variables

---

## 🧪 Testování registrace

Po dokončení registrace otestuj:

1. **Kontrola oprávnění:**
   - Všechna permissions mají zelený status "Granted for..."

2. **Kontrola redirect URIs:**
   - Obsahuje vývojové i produkční URL

3. **Test přihlášení:**
   - Použij Microsoft Authentication Library (MSAL)
   - První přihlášení vyžaduje souhlas uživatele

---

## 🔐 Seamless SSO (Single Sign-On)

Pro automatické přihlášení uživatelů na doménových počítačích:

### Nastavení v Azure Portal:

1. **Azure Portal** → **Microsoft Entra ID** → **Enterprise applications**
2. Najdi aplikaci **ERDMS**
3. **Single sign-on** → **Enable seamless SSO**

### Požadavky:

- ✅ Počítače připojené k Azure AD (Azure AD Join nebo Hybrid Join)
- ✅ Uživatelé přihlášení Microsoft účtem na Windows
- ✅ Prohlížeč Edge nebo Chrome (Firefox vyžaduje konfiguraci)

### Jak to funguje:

```
Uživatel přihlášený na Windows (Azure AD)
    ↓
Otevře erdms.zachranka.cz
    ↓
Aplikace detekuje Windows účet
    ↓
Automaticky přihlášen BEZ zadání hesla! ✅
```

### Testování SSO:

Aplikace se nejdřív pokusí o tiché přihlášení (`ssoSilent`). 
Pokud selže, zobrazí normální přihlašovací obrazovku.

---

## 📚 Užitečné odkazy

- **Azure Portal:** https://portal.azure.com
- **MSAL.js dokumentace:** https://github.com/AzureAD/microsoft-authentication-library-for-js
- **Microsoft Graph Explorer:** https://developer.microsoft.com/en-us/graph/graph-explorer
- **Entra ID dokumentace:** https://learn.microsoft.com/en-us/entra/identity-platform/
- **Seamless SSO:** https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sso

---

## ❓ FAQ - Časté otázky pro kolegu

**Q: Musím být Global Administrator?**  
A: Ne, stačí role Application Administrator nebo Cloud Application Administrator.

**Q: Kolik aplikací můžu zaregistrovat?**  
A: Prakticky neomezené množství, každá organizace má velký limit.

**Q: Můžu později změnit redirect URIs?**  
A: Ano, redirect URIs lze kdykoliv měnit v sekci Authentication.

**Q: Co když zapomenu Client Secret?**  
A: Nelze zobrazit znovu. Musíš vytvořit nový secret a invalidovat starý.

**Q: Jak zjistím Tenant ID?**  
A: Azure Portal → Entra ID → Overview → Tenant ID

---

## 🎯 Co po obdržení hodnot?

1. ✅ Ověř, že máš všechny povinné hodnoty
2. ✅ Vytvoř `.env` soubory v client/ a server/
3. ✅ Nesdílej Client Secret s nikým kromě dev teamu
4. ✅ Pro produkci použij environment variables
5. ✅ Otestuj základní přihlášení

---

**Datum vytvoření:** 1. prosince 2025  
**Pro projekt:** EEO2025  
**Dokumentaci připravil:** GitHub Copilot

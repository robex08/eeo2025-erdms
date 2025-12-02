# Konfigurace Microsoft Entra ID pro ERDMS

## Informace o aplikaci
- **Application (client) ID**: `92eaadde-7e3e-4ad1-8c45-3b875ff5c76b`
- **Directory (tenant) ID**: `2bd7827b-4550-48ad-bd15-62f9a17990f1`
- **Název aplikace**: ERDMS (nebo jak je registrovaná)

---

## Požadované změny v Azure Portal

### 1. Změna typu aplikace
**Navigace**: Azure Portal → Entra ID → App registrations → [Vaše aplikace] → Authentication

**Problém**: Aplikace je momentálně nastavená jako **Public client** (SPA), ale potřebujeme **Web application** (Confidential client).

**Akce**:
- ❌ **Odstranit**: Všechny redirect URIs z sekce "Single-page application"
- ✅ **Přidat**: Redirect URIs do sekce "Web" (viz níže)

---

### 2. Redirect URIs (Typ: Web)
**Navigace**: Azure Portal → Entra ID → App registrations → [Vaše aplikace] → Authentication → Platform configurations → Add a platform → Web

**Přidat tyto URIs** (do sekce **Web**, NIKOLIV SPA):

```
http://localhost:5000/auth/callback
https://erdms-dev.zachranka.cz/auth/callback
https://erdms.zachranka.cz/auth/callback
```

**Poznámky**:
- První URI je pro lokální vývoj
- Druhá je pro testovací prostředí
- Třetí je pro produkci
- Všechny musí být typu **Web**, ne SPA

---

### 3. Zakázat Public Client Flow
**Navigace**: Azure Portal → Entra ID → App registrations → [Vaše aplikace] → Authentication → Advanced settings

**Akce**:
- **Allow public client flows**: Nastavit na **No** ❌

Důvod: Používáme server-side flow s client secret (confidential client).

---

### 4. Ověření API Permissions
**Navigace**: Azure Portal → Entra ID → App registrations → [Vaše aplikace] → API permissions

**Požadovaná oprávnění** (Delegated permissions):
- ✅ `User.Read` - Přečíst profil přihlášeného uživatele
- ✅ `email` - Přístup k emailové adrese
- ✅ `openid` - OpenID Connect
- ✅ `profile` - Přístup k základnímu profilu

**Kontrola**:
- Oprávnění by měla být **Delegated** (ne Application)
- Měla by být **Granted** (Admin consent given)

---

### 5. Client Secret (již existuje)
**Navigace**: Azure Portal → Entra ID → App registrations → [Vaše aplikace] → Certificates & secrets

**Aktuální secret**:
- Secret je již nakonfigurovaný v `.env` souboru na serveru
- ⚠️ **Nemazat** existující secret, aplikace ho aktivně používá

**Kontrola expirace**:
- Zkontrolovat, kdy secret vyprší
- Pokud je blízko expirace, vytvořit nový a aktualizovat v `/var/www/eeo2025/server/.env`

---

## Kontrola po změnách

Po provedení změn aplikace by měla vypadat takto:

### Authentication
```
Platform configurations:
  Web
    ✓ http://localhost:5000/auth/callback
    ✓ https://erdms-dev.zachranka.cz/auth/callback
    ✓ https://erdms.zachranka.cz/auth/callback
  
  Single-page application
    (žádné URIs)

Advanced settings:
  Allow public client flows: No ❌
```

### API permissions
```
Microsoft Graph (4):
  ✓ email (Delegated)
  ✓ openid (Delegated)
  ✓ profile (Delegated)
  ✓ User.Read (Delegated)
  
Status: ✓ Granted for [tenant name]
```

---

## Po dokončení změn

1. ✅ **Uložit** všechny změny v Azure Portal
2. ✅ **Restartovat** backend server: `cd /var/www/eeo2025/server && pkill -f node && node src/index.js &`
3. ✅ **Otestovat** přihlášení na: http://localhost:5173

---

## Kontakt při problémech

Pokud budou jakékoliv nejasnosti nebo problémy s konfigurací, kontaktujte vývojový tým:
- Chyby se logují do `/tmp/server.log`
- Testovací URL: http://localhost:5173
- Backend API: http://localhost:5000

---

**Důležité**: Tyto změny **neovlivní SSO** ani jiné aplikace v Entra ID. Pouze změní autentizační flow této konkrétní aplikace na bezpečnější server-side model.

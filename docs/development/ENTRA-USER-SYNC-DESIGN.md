# ERDMS - Návrh migrace uživatelské tabulky pro Microsoft Entra ID

## 📋 Analýza současného stavu

### Stávající tabulka: `25_uzivatele`
- **Použití:** Lokální autentizace s heslem
- **Primární klíč:** `username` (unikátní)
- **Autentizace:** `password_hash` (bcrypt/argon2)
- **Data:** Vše uloženo lokálně v DB

---

## 🎯 Cíl: Hybrid EntraID + DB jako centrální rozcestník

### Co je ERDMS?
**ERDMS** = **Elektronický Rozcestník pro Dokument Management System**

- **Hlavní Dashboard** po přihlášení přes EntraID
- **Centrální místo** pro přístup k interním aplikacím ZZS
- **Single Sign-On (SSO)** - jednou přihlášení → přístup do všech systémů

### Aplikace dostupné přes ERDMS rozcestník:

1. **EEO** - Evidence elektronických objednávek
2. **Intranet** - Interní portál ZZS
3. **Správa vozového parku (Vozidla)** - Evidence a správa vozidel
4. **SZM** - Sklad zdravotnického materiálu (e-Shop systém, objednávkový systém)

### Požadavky pro uživatelský systém:
1. ✅ **Autentizace přes EntraID** (SSO)
2. ✅ **Propojení přes osobní číslo** → `username` formát: `u{osobni_cislo_5ciferne}`
   - Příklad: osobní číslo `3924` → username `u03924`
3. ✅ **Data z EntraID:** jméno, příjmení, email (live sync při každém loginu)
4. ✅ **Data v DB:** role, pozice, lokalita, aktivita, **přístupová oprávnění k aplikacím**
5. ✅ **Fallback:** Pokud EntraID není dostupný/uživatel neexistuje
6. ✅ **Dashboard:** Zobrazení aplikací podle oprávnění uživatele
7. ✅ **Aplikační oprávnění:** Správa přístupu k EEO, Intranet, Vozidla, SZM

---

## ✅ BEST PRACTICE: Hybrid Model

### Princip:
- **EntraID** = "Source of Truth" pro **identitu** (jméno, email, autentizace)
- **Databáze** = "Source of Truth" pro **aplikační data** (role, oprávnění, lokality)
- **Synchronizace** = Při každém přihlášení aktualizuj profil z EntraID

### Výhody:
- ✅ Centralizovaná správa uživatelů (IT admin v Entra)
- ✅ SSO (Single Sign-On) - žádná lokální hesla
- ✅ Aktuální data (auto-sync při loginu)
- ✅ Fallback možnost (pokud Entra spadne)
- ✅ Flexibilní role a oprávnění v aplikaci

---

## 🔧 Návrh nové struktury tabulky

### Změny oproti stávající tabulce:

| Co měnit | Proč | Jak |
|----------|------|-----|
| `password_hash` | EntraID autentizace → lokální heslo není potřeba | Změnit na **NULL** nebo úplně odstranit |
| Přidat `entra_id` | Unikátní ID z Microsoft Entra | `VARCHAR(255)` nebo `VARCHAR(100)` |
| Přidat `upn` | User Principal Name z Entra | `VARCHAR(255)` (např. `jan.novak@zachranka.cz`) |
| `jmeno`, `prijmeni`, `email` | Sync z Entra při každém loginu | Ponechat jako cache |
| `titul_pred`, `titul_za` | Možná v Entra, možná manuálně | Ponechat, fallback DB |
| Přidat `entra_sync_at` | Timestamp poslední sync z Entra | `TIMESTAMP NULL` |
| Přidat `auth_source` | Odkud je uživatel (entra/local) | `ENUM('entra','local','legacy')` |

---

## 📊 Navržená struktura: `erdms_users`

```sql
CREATE TABLE `erdms_users` (
  -- Primární klíč
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  
  -- Identifikace (propojení s EntraID)
  `username` VARCHAR(50) NOT NULL COMMENT 'Formát: u{osobni_cislo_5cifer}, např. u03924',
  `entra_id` VARCHAR(255) NULL UNIQUE COMMENT 'Object ID z Microsoft Entra ID',
  `upn` VARCHAR(255) NULL UNIQUE COMMENT 'User Principal Name (email z Entra)',
  
  -- Osobní údaje (synchronizovány z Entra při přihlášení)
  `titul_pred` VARCHAR(50) NULL,
  `jmeno` VARCHAR(100) NULL,
  `prijmeni` VARCHAR(100) NULL,
  `titul_za` VARCHAR(50) NULL,
  `email` VARCHAR(255) NULL COMMENT 'Email z Entra nebo manuálně zadaný',
  `telefon` VARCHAR(50) NULL COMMENT 'Telefon - manuálně nebo z Entra',
  
  -- Aplikační metadata (pouze v DB, NE v Entra)
  `pozice_id` INT(10) NULL,
  `lokalita_id` INT(10) NULL COMMENT 'Domovská lokalita uživatele',
  `organizace_id` SMALLINT(6) NOT NULL DEFAULT 1,
  `usek_id` INT(11) NOT NULL,
  
  -- Role a oprávnění (pouze v DB)
  `role` ENUM('admin','manager','user','readonly') NOT NULL DEFAULT 'user',
  `opravneni` JSON NULL COMMENT 'Detailní oprávnění jako JSON pole',
  
  -- Přístup k aplikacím (Dashboard rozcestník)
  `app_permissions` JSON NULL COMMENT 'Oprávnění k jednotlivým aplikacím - viz struktura níže',
  
  -- Stavy
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = neaktivní, 1 = aktivní',
  `auth_source` ENUM('entra','local','legacy') NOT NULL DEFAULT 'entra' COMMENT 'Zdroj autentizace',
  
  -- Časová razítka
  `dt_vytvoreni` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dt_aktualizace` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  `dt_posledni_aktivita` DATETIME NULL,
  `entra_sync_at` TIMESTAMP NULL COMMENT 'Poslední synchronizace z Entra',
  
  -- Legacy (pro zpětnou kompatibilitu - volitelné)
  `password_hash` VARCHAR(255) NULL COMMENT 'DEPRECATED - pouze pro fallback nebo legacy účty',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `entra_id` (`entra_id`),
  UNIQUE KEY `upn` (`upn`),
  KEY `pozice_id` (`pozice_id`),
  KEY `lokalita_id` (`lokalita_id`),
  KEY `usek_id` (`usek_id`),
  KEY `auth_source` (`auth_source`),
  KEY `aktivni` (`aktivni`),
  
  CONSTRAINT `fk_users_pozice` FOREIGN KEY (`pozice_id`) 
    REFERENCES `erdms_pozice` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_lokalita` FOREIGN KEY (`lokalita_id`) 
    REFERENCES `erdms_lokality` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_usek` FOREIGN KEY (`usek_id`) 
    REFERENCES `erdms_useky` (`id`) ON DELETE RESTRICT
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci
COMMENT='Uživatelé aplikace - hybridní autentizace Entra ID + DB';
```

---

## 🔄 Workflow: Přihlášení uživatele

### 1. **Uživatel se přihlásí přes EntraID**
```javascript
// Frontend: MSAL získá token
const loginResponse = await msalInstance.loginPopup({
  scopes: ['User.Read', 'profile', 'email']
});

// Token obsahuje:
// - entra_id (oid claim)
// - upn (preferred_username nebo email)
// - jméno, příjmení
// - email
```

### 2. **Backend: Validace a sync**
```javascript
// API endpoint: POST /api/auth/login
async function handleLogin(accessToken) {
  // 1. Validuj token proti Entra
  const entraUser = await validateToken(accessToken);
  
  // 2. Extrahuj data
  const {
    oid: entraId,           // Object ID z Entra
    preferred_username: upn, // např. jan.novak@zachranka.cz
    given_name: jmeno,
    family_name: prijmeni,
    email: email
  } = entraUser;
  
  // 3. Najdi/vytvoř uživatele v DB
  let user = await db.query(
    'SELECT * FROM erdms_users WHERE entra_id = ? OR upn = ?',
    [entraId, upn]
  );
  
  if (!user) {
    // 4a. PRVNÍ PŘIHLÁŠENÍ - Vytvoř záznam
    user = await db.query(`
      INSERT INTO erdms_users (
        username, entra_id, upn, jmeno, prijmeni, email,
        auth_source, entra_sync_at, dt_posledni_aktivita
      ) VALUES (?, ?, ?, ?, ?, ?, 'entra', NOW(), NOW())
    `, [generateUsername(osobniCislo), entraId, upn, jmeno, prijmeni, email]);
    
    // TODO: Admin musí přiřadit pozici, lokalitu, úsek
    
  } else {
    // 4b. OPAKOVANÉ PŘIHLÁŠENÍ - Aktualizuj profil z Entra
    await db.query(`
      UPDATE erdms_users
      SET jmeno = ?, 
          prijmeni = ?, 
          email = ?,
          entra_sync_at = NOW(),
          dt_posledni_aktivita = NOW()
      WHERE entra_id = ?
    `, [jmeno, prijmeni, email, entraId]);
  }
  
  // 5. Zkontroluj, jestli je aktivní
  if (!user.aktivni) {
    throw new Error('Účet je deaktivován');
  }
  
  // 6. Načti oprávnění k aplikacím pro dashboard
  const availableApps = getAvailableApps(user.app_permissions);
  
  // 7. Vrať uživatele s aplikačními daty + dostupné aplikace
  return {
    id: user.id,
    username: user.username,
    jmeno: user.jmeno,
    prijmeni: user.prijmeni,
    email: user.email,
    role: user.role,
    lokalita_id: user.lokalita_id,
    pozice_id: user.pozice_id,
    availableApps: availableApps  // Pro dashboard rozcestník
  };
}

/**
 * Zjistí, které aplikace může uživatel vidět na dashboardu
 */
function getAvailableApps(appPermissions) {
  const apps = [];
  
  if (appPermissions?.eeo?.enabled) {
    apps.push({
      id: 'eeo',
      name: 'EEO - Evidence elektronických objednávek',
      url: 'https://eeo.zachranka.cz',
      icon: 'document',
      permissions: appPermissions.eeo.permissions
    });
  }
  
  if (appPermissions?.intranet?.enabled) {
    apps.push({
      id: 'intranet',
      name: 'Intranet ZZS',
      url: 'https://intranet.zachranka.cz',
      icon: 'home',
      permissions: appPermissions.intranet.permissions
    });
  }
  
  if (appPermissions?.vozidla?.enabled) {
    apps.push({
      id: 'vozidla',
      name: 'Správa vozového parku',
      url: 'https://vozidla.zachranka.cz',
      icon: 'car',
      permissions: appPermissions.vozidla.permissions
    });
  }
  
  if (appPermissions?.szm?.enabled) {
    apps.push({
      id: 'szm',
      name: 'SZM - Sklad zdravotnického materiálu',
      url: 'https://szm.zachranka.cz',
      icon: 'cart',
      permissions: appPermissions.szm.permissions
    });
  }
  
  return apps;
}
```

---

## 🔗 Generování `username` z osobního čísla

### Logika:
```javascript
/**
 * Generuje username z osobního čísla
 * @param {number|string} osobniCislo - Osobní číslo zaměstnance
 * @returns {string} - Username ve formátu u{5_cifer}
 * 
 * @example
 * generateUsername(3924)   → 'u03924'
 * generateUsername('3924') → 'u03924'
 * generateUsername(12345)  → 'u12345'
 */
function generateUsername(osobniCislo) {
  const cisloStr = String(osobniCislo).padStart(5, '0');
  return `u${cisloStr}`;
}
```

### Propojení s EntraID:
1. **V EntraID** musíte mít `employeeId` (osobní číslo) nastavené u každého uživatele
2. **Při prvním loginu** API přečte `employeeId` z tokenu/Graph API
3. **Vygeneruje username** pomocí výše uvedené funkce
4. **Uloží do DB** jako propojení

```javascript
// Získání osobního čísla z Microsoft Graph API
const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

const { employeeId } = await graphResponse.json();
const username = generateUsername(employeeId); // např. 'u03924'
```

---

## 🛡️ Fallback strategie

### Scénář 1: EntraID není dostupný (výpadek)
```javascript
// Backend uchovává poslední známý stav v DB
// Uživatel se může přihlásit podle cache dat

// Kontrola: Pokud entra_sync_at je starší než 7 dní → varování
if (user.entra_sync_at < Date.now() - 7*24*60*60*1000) {
  console.warn('EntraID data jsou zastaralá');
}

// Aplikace funguje dál s daty z DB
```

### Scénář 2: Legacy uživatelé (neexistují v Entra)
```javascript
// Ponechat password_hash pro legacy účty
// auth_source = 'legacy'

if (user.auth_source === 'legacy') {
  // Použij klasické bcrypt ověření
  const isValid = await bcrypt.compare(password, user.password_hash);
}
```

### Scénář 3: Nový uživatel v Entra bez DB záznamu
```javascript
// První login → vytvoř záznam s minimálními daty
// role = 'readonly' (default)
// Admin pak musí doplnit lokalitu, úsek, pozici
```

---

## 📦 Data ukládaná v DB vs. EntraID

| Pole | Zdroj | Kdy aktualizovat | Může být NULL? |
|------|-------|------------------|----------------|
| `entra_id` | EntraID (oid) | Pouze při vytvoření | Ne (pokud auth_source='entra') |
| `upn` | EntraID | Pouze při vytvoření | Ne |
| `username` | Generováno z osobního čísla | Pouze při vytvoření | Ne |
| `jmeno` | EntraID (sync) | **Při každém loginu** | Ano (fallback) |
| `prijmeni` | EntraID (sync) | **Při každém loginu** | Ano (fallback) |
| `email` | EntraID (sync) | **Při každém loginu** | Ano (fallback) |
| `titul_pred` | Manuálně v DB (nebo Entra?) | Podle potřeby | Ano |
| `titul_za` | Manuálně v DB (nebo Entra?) | Podle potřeby | Ano |
| `telefon` | Manuálně v DB | Podle potřeby | Ano |
| `pozice_id` | **Pouze DB** | Manuálně adminem | Ano |
| `lokalita_id` | **Pouze DB** | Manuálně adminem | Ano |
| `usek_id` | **Pouze DB** | Manuálně adminem | Ne |
| `role` | **Pouze DB** | Manuálně adminem | Ne |
| `aktivni` | **Pouze DB** | Manuálně adminem | Ne |
| `password_hash` | Legacy | Neaktualizovat | Ano (deprecated) |

---

## 🔐 Bezpečnost

### 1. **Token validace**
```javascript
// VŽDY validuj token proti EntraID JWKS
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
});

// Validace tokenu
const decoded = jwt.verify(token, getKey, {
  audience: clientId,
  issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`
});
```

### 2. **Rate limiting**
- Omezte počet pokusů o přihlášení (např. 5/min per IP)

### 3. **Audit log**
- Loguj každé přihlášení: `dt_posledni_aktivita`, IP adresa, user agent

### 4. **HTTPS only**
- V produkci POUZE přes HTTPS (už máte ✓)

---

## 🚀 Migrace ze stávající tabulky

### Postup:

#### 1. **Backup stávající tabulky**
```sql
CREATE TABLE 25_uzivatele_backup AS SELECT * FROM 25_uzivatele;
```

#### 2. **Vytvoř novou tabulku `erdms_users`**
```sql
-- Použij SQL výše
```

#### 3. **Migruj data**
```sql
INSERT INTO erdms_users (
  username, jmeno, prijmeni, email, telefon,
  pozice_id, lokalita_id, organizace_id, usek_id,
  aktivni, dt_vytvoreni, auth_source, password_hash
)
SELECT 
  username, jmeno, prijmeni, email, telefon,
  pozice_id, lokalita_id, organizace_id, usek_id,
  aktivni, dt_vytvoreni, 
  'legacy' AS auth_source,  -- Označit jako legacy
  password_hash
FROM 25_uzivatele;
```

#### 4. **Manuálně doplň `entra_id` a `upn`**
- Postupně při prvním loginu každého uživatele přes EntraID
- Nebo pomocí admin rozhraní + import z CSV

#### 5. **Postupně přepni `auth_source` z 'legacy' na 'entra'**
```sql
-- Po úspěšném prvním loginu přes Entra
UPDATE erdms_users 
SET auth_source = 'entra',
    password_hash = NULL  -- Smazat staré heslo
WHERE entra_id IS NOT NULL;
```

---

## 📊 Příklad: Complete User Object (s aplikačními oprávněními)

```json
{
  "id": 42,
  "username": "u03924",
  "entra_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "upn": "jan.novak@zachranka.cz",
  "titul_pred": "Ing.",
  "jmeno": "Jan",
  "prijmeni": "Novák",
  "titul_za": "Ph.D.",
  "email": "jan.novak@zachranka.cz",
  "telefon": "+420 777 123 456",
  "pozice_id": 5,
  "pozice_nazev": "Vedoucí oddělení",
  "lokalita_id": 3,
  "lokalita_nazev": "ZZS Praha",
  "organizace_id": 1,
  "usek_id": 12,
  "usek_nazev": "IT úsek",
  "role": "manager",
  "opravneni": {
    "smlouvy": ["read", "write", "delete"],
    "uzivatele": ["read"],
    "reporting": ["read", "export"]
  },
  "aktivni": true,
  "auth_source": "entra",
  "dt_vytvoreni": "2025-01-15T08:30:00Z",
  "dt_aktualizace": "2025-12-02T14:20:00Z",
  "dt_posledni_aktivita": "2025-12-02T14:20:00Z",
  "entra_sync_at": "2025-12-02T14:20:00Z",
  
  "availableApps": [
    {
      "id": "eeo",
      "name": "EEO - Evidence elektronických objednávek",
      "url": "https://eeo.zachranka.cz",
      "icon": "document",
      "color": "#3b82f6",
      "permissions": {
        "read": true,
        "write": true,
        "delete": false,
        "export": true
      }
    },
    {
      "id": "intranet",
      "name": "Intranet ZZS",
      "url": "https://intranet.zachranka.cz",
      "icon": "home",
      "color": "#10b981",
      "permissions": {
        "read": true,
        "write": false
      }
    },
    {
      "id": "vozidla",
      "name": "Správa vozového parku",
      "url": "https://vozidla.zachranka.cz",
      "icon": "car",
      "color": "#f59e0b",
      "permissions": {
        "read": true,
        "write": true,
        "delete": false
      }
    },
    {
      "id": "szm",
      "name": "SZM - Sklad zdravotnického materiálu",
      "url": "https://szm.zachranka.cz",
      "icon": "cart",
      "color": "#ef4444",
      "permissions": {
        "read": true,
        "order": true,
        "manage_cart": true
      }
    }
  ]
}
```

---

## 🏠 ERDMS Dashboard - Rozcestník aplikací

### Koncept:
Po přihlášení přes EntraID se uživatel dostane na **centrální dashboard**, který zobrazí:
- Dostupné aplikace podle jeho oprávnění
- Ikony/dlaždice s barvami a popisy
- Přímé odkazy na jednotlivé aplikace
- Statistiky / rychlé akce (volitelně)

### Aplikace v ERDMS rozcestníku:

| Kód | Název | URL | Popis |
|-----|-------|-----|-------|
| `eeo` | EEO | https://eeo.zachranka.cz | Evidence elektronických objednávek |
| `intranet` | Intranet ZZS | https://intranet.zachranka.cz | Interní portál |
| `vozidla` | Správa vozového parku | https://vozidla.zachranka.cz | Evidence vozidel |
| `szm` | SZM | https://szm.zachranka.cz | Sklad zdravotnického materiálu (e-Shop) |

### Správa oprávnění:
- **Varianta A:** Samostatná tabulka `erdms_user_app_permissions` (doporučeno)
- **Varianta B:** JSON pole `app_permissions` v tabulce `erdms_users`
- **Podrobný SQL:** Viz `/docs/setup/database-applications.sql`

### Možnost rozšíření z EntraID:
- EntraID podporuje **Group assignments** → lze vytvořit skupiny (např. "EEO_Users")
- API může číst členství ve skupinách a automaticky přiřadit oprávnění
- **Doporučení:** Začněte s DB správou, později můžete přidat Entra skupiny jako option

---

## ✅ Doporučení (TL;DR)

### Co udělat:

1. ✅ **Přidaj pole:** `entra_id`, `upn`, `entra_sync_at`, `auth_source`
2. ✅ **Ponechej v DB:** role, pozice, lokalita, úsek (aplikační logika)
3. ✅ **Aplikace:** Vytvoř tabulku `erdms_applications` a `erdms_user_app_permissions`
4. ✅ **Dashboard:** Zobraz aplikace podle oprávnění uživatele
3. ✅ **Synchronizuj z Entra:** jméno, příjmení, email (při každém loginu)
4. ✅ **Username:** Generuj z osobního čísla (`u{5cifer}`)
5. ✅ **Fallback:** Ponechej `password_hash` jako NULL nebo pro legacy účty
6. ✅ **Migrace:** Označ stávající uživatele jako `auth_source='legacy'`
7. ✅ **Postupný přechod:** Při prvním Entra loginu aktualizuj na `auth_source='entra'`

### Co NEDĚLAT:

- ❌ Nesynchronizuj role/oprávnění z Entra (složité, nestandardní)
- ❌ Neukládej EntraID tokeny do DB (security risk)
- ❌ Neodstraňuj `password_hash` úplně (legacy fallback)

---

## 📞 Další kroky

1. **Review tohoto návrhu** - souhlasíš s přístupem?
2. **Upřesnění:**
   - Máte v EntraID vyplněné `employeeId` (osobní číslo)?
   - Chcete tituly sync z Entra nebo manuálně v DB?
   - Chcete migrovat postupně nebo naráz?
3. **Implementace:**
   - SQL migrace script
   - Node.js API pro sync
   - Admin rozhraní pro správu

---

**Autor:** GitHub Copilot  
**Datum:** 2. prosince 2025  
**Projekt:** ERDMS - Elektronický Rozcestník pro Dokument Management System

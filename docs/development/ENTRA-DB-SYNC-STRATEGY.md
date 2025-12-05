# Entra ID ↔ Lokální DB - Synchronizační strategie

## 🎯 Cíl

Propojit Microsoft Entra ID autentizaci s aplikačními databázemi:
- **Entra ID = jediný zdroj pravdy** pro osobní údaje (jméno, email, telefon)
- **Aplikační DB = úložiště aplikačních dat** (nastavení, preferences, log aktivit)
- **Přístup řízen přes Entra** - pokud má uživatel přístup k aplikaci v Entra, automaticky se vytvoří v app DB
- **ŽÁDNÝ zpětný zápis do Entra** - Entra je read-only zdroj

## 📊 Aktuální stav

### Databázová tabulka: `erdms_users`

```sql
CREATE TABLE erdms_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE,           -- u03924
  entra_id VARCHAR(255),                 -- UUID z Entra ID
  upn VARCHAR(255),                      -- u03924@zachranka.cz
  auth_source ENUM('local', 'entra_id'), -- Zdroj autentizace
  
  -- Osobní údaje (sync z Entra)
  email VARCHAR(255),
  jmeno VARCHAR(100),
  prijmeni VARCHAR(100),
  titul_pred VARCHAR(50),
  titul_za VARCHAR(50),
  telefon VARCHAR(20),
  
  -- Aplikační data (lokální, neměnná z Entra)
  pozice_id INT,
  lokalita_id INT,
  organizace_id INT,
  usek_id INT,
  role VARCHAR(50),                      -- admin, user, viewer
  
  -- Metadata
  aktivni TINYINT DEFAULT 1,
  dt_vytvoreni DATETIME,
  dt_aktualizace DATETIME
);
```

### Vazba mezi systémy:

```
Entra ID                     →    Aplikační DB
--------------------------------------------------
userPrincipalName (UPN)      →    username (bez @domény)
u03924@zachranka.cz          →    u03924

id (Object ID/GUID)          →    entra_id
a1b2c3d4-...                 →    a1b2c3d4-...

displayName, givenName...    →    jmeno, prijmeni
```

## 🔄 Synchronizační strategie (Just-In-Time provisioning)

### **Jediná fáze: Při prvním vstupu do aplikace**

**Flow:**
1. Uživatel se přihlásí přes Microsoft 365
2. Vidí Dashboard s dlaždicemi aplikací
3. **Klikne na aplikaci (např. EEO)**
4. Aplikace zkontroluje:
   - ✅ Je uživatel v aplikační DB?
   - ✅ Jsou jeho údaje aktuální?
5. Pokud NE → **Automaticky vytvoří záznam** s údaji z Entra
6. Pokud ANO → **Aktualizuje osobní údaje** z Entra
7. Uživatel může pracovat v aplikaci

**Kdy:** Při každém vstupu do konkrétní aplikace (EEO, ERDMS, atd.)

**Co se stane:**

1. ✅ **Najdi uživatele v aplikační DB:**
   - Primárně podle `username` (u03924)
   - Sekundárně podle `entra_id` (GUID)

2. ✅ **Pokud EXISTUJE:**
   - Aktualizuj POUZE osobní údaje z Entra (jméno, příjmení, email, telefon)
   - Aplikační data (nastavení, preferences) zůstávají NEDOTČENÁ

3. ✅ **Pokud NEEXISTUJE:**
   - Vytvoř nového uživatele s výchozími hodnotami
   - Nastav `auth_source = 'entra_id'`
   - Nastav výchozí aplikační nastavení

**Implementace:**

```javascript
// V /auth/callback endpointu (auth-api)

// 1. Hledání uživatele
const msUsername = account.username.split('@')[0]; // u03924
let user = await authService.findUserByUsername(msUsername);

if (!user) {
  user = await authService.findUserByEntraId(account.homeAccountId);
}

if (user) {
  // 2. EXISTUJE - aktualizuj pouze osobní údaje z Entra
  await authService.syncUserPersonalInfo(user.id, {
    entraId: account.homeAccountId,
    upn: account.username,
    email: tokenResponse.account.email,
    jmeno: tokenResponse.account.givenName,
    prijmeni: tokenResponse.account.surname
  });
} else {
  // 3. NEEXISTUJE - vytvoř nového s výchozími hodnotami
  user = await authService.createUserFromEntra({
    username: msUsername,
    entraId: account.homeAccountId,
    upn: account.username,
    email: tokenResponse.account.email,
    jmeno: tokenResponse.account.givenName,
    prijmeni: tokenResponse.account.surname,
    authSource: 'entra_id',
    role: 'user',  // Výchozí role
    aktivni: 1
  });
}
```



---

## 🛡️ Bezpečnostní pravidla

### ✅ CO SE SMÍ AKTUALIZOVAT Z ENTRA:

- `entra_id`
- `upn`
- `email`
- `jmeno`
- `prijmeni`
- `titul_pred`, `titul_za`
- `telefon`
- `dt_aktualizace`

### ❌ CO SE NESMÍ MĚNIT (zůstává v DB):

- `id`
- `username` (primární klíč pro párování)
- `pozice_id`
- `lokalita_id`
- `organizace_id`
- `usek_id`
- `role` (admin, user, viewer)
- `aktivni`
- `dt_vytvoreni`

---

## 🔧 Potřebné metody v authService

### 1. `syncUserPersonalInfo(userId, entraData)`

```javascript
async syncUserPersonalInfo(userId, entraData) {
  const { entraId, upn, email, jmeno, prijmeni, titul_pred, titul_za, telefon } = entraData;
  
  await db.query(
    `UPDATE erdms_users 
     SET entra_id = ?,
         upn = ?,
         email = ?,
         jmeno = ?,
         prijmeni = ?,
         titul_pred = ?,
         titul_za = ?,
         telefon = ?,
         dt_aktualizace = NOW()
     WHERE id = ?`,
    [entraId, upn, email, jmeno, prijmeni, titul_pred, titul_za, telefon, userId]
  );
}
```

### 2. `createUserFromEntra(entraData)`

```javascript
async createUserFromEntra(entraData) {
  const { username, entraId, upn, email, jmeno, prijmeni, authSource, role, aktivni } = entraData;
  
  const [result] = await db.query(
    `INSERT INTO erdms_users 
     (username, entra_id, upn, auth_source, email, jmeno, prijmeni, role, aktivni, dt_vytvoreni, dt_aktualizace)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [username, entraId, upn, authSource, email, jmeno, prijmeni, role, aktivni]
  );
  
  return { id: result.insertId, username, ...entraData };
}
```

---

## 🔄 Migrace existující aplikace (EEO příklad)

### **Aktuální stav:**

```sql
-- Existující tabulka: eeo_db.25_uzivatele
CREATE TABLE 25_uzivatele (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50),
  password VARCHAR(255),              -- lokální heslo (zahashované)
  email VARCHAR(255),
  jmeno VARCHAR(100),
  prijmeni VARCHAR(100),
  
  -- 20+ aplikačních sloupců (MUSÍ ZŮSTAT)
  pozice_id INT,
  lokalita_id INT,
  role_v_app VARCHAR(50),
  theme_preference VARCHAR(20),
  default_view VARCHAR(50),
  notification_settings TEXT,
  custom_field_1 VARCHAR(255),
  ... další aplikační pole ...
  
  aktivni TINYINT DEFAULT 1,
  dt_vytvoreni DATETIME
);
```

### **✅ Bezpečná migrace (bez ztráty dat):**

**Krok 1: Přidat nové sloupce pro Entra ID**

```sql
-- Přidáme sloupce BEZ změny existujících
ALTER TABLE 25_uzivatele 
ADD COLUMN entra_id VARCHAR(255) UNIQUE AFTER username,
ADD COLUMN upn VARCHAR(255) AFTER entra_id,
ADD COLUMN auth_source ENUM('local', 'entra_id') DEFAULT 'local' AFTER upn,
ADD COLUMN dt_posledni_sync DATETIME AFTER aktivni;

-- Indexy pro rychlé hledání
CREATE INDEX idx_entra_id ON 25_uzivatele(entra_id);
CREATE INDEX idx_username ON 25_uzivatele(username);
```

**Výsledek:**
```sql
CREATE TABLE 25_uzivatele (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50),
  entra_id VARCHAR(255) UNIQUE,          -- ✅ NOVÝ
  upn VARCHAR(255),                      -- ✅ NOVÝ
  auth_source ENUM('local','entra_id'),  -- ✅ NOVÝ
  password VARCHAR(255),                 -- ✅ ZŮSTÁVÁ (pro local login)
  email VARCHAR(255),
  jmeno VARCHAR(100),
  prijmeni VARCHAR(100),
  
  -- ✅ VŠECH 20+ APLIKAČNÍCH SLOUPCŮ ZŮSTÁVÁ BEZ ZMĚNY
  pozice_id INT,
  lokalita_id INT,
  role_v_app VARCHAR(50),
  theme_preference VARCHAR(20),
  ... všechny existující sloupce ...
  
  aktivni TINYINT DEFAULT 1,
  dt_vytvoreni DATETIME,
  dt_posledni_sync DATETIME              -- ✅ NOVÝ
);
```

---

**Krok 2: Upravit přihlašovací logiku (dual mode)**

```javascript
// EEO API - routes/auth.js

router.post('/login', async (req, res) => {
  const { username, password, method } = req.body;
  
  // 1️⃣ ENTRA ID přihlášení (nový způsob)
  if (method === 'entra') {
    // Přesměruj na Microsoft
    return res.json({ 
      redirectUrl: `${AUTH_API_URL}/api/auth/login` 
    });
  }
  
  // 2️⃣ LOKÁLNÍ přihlášení (starý způsob - ZŮSTÁVÁ)
  if (method === 'local' && username && password) {
    const user = await db.query(
      'SELECT * FROM 25_uzivatele WHERE username = ? AND auth_source = "local" AND aktivni = 1',
      [username]
    );
    
    if (user && await bcrypt.compare(password, user.password)) {
      // Lokální přihlášení úspěšné
      req.session.user = user;
      return res.json({ success: true, user });
    }
  }
  
  return res.status(401).json({ error: 'Invalid credentials' });
});
```

---

**Krok 3: Callback z Entra (automatický sync)**

```javascript
// Když se uživatel přihlásí přes Microsoft
router.get('/auth/callback', async (req, res) => {
  // ... Microsoft OAuth flow ...
  
  const msUsername = account.username.split('@')[0]; // u03924
  
  // 1. Hledej existujícího uživatele
  let user = await db.query(
    'SELECT * FROM 25_uzivatele WHERE username = ? OR entra_id = ?',
    [msUsername, account.homeAccountId]
  );
  
  if (user) {
    // ✅ EXISTUJE - aktualizuj JEN Entra sloupce
    await db.query(
      `UPDATE 25_uzivatele 
       SET entra_id = ?,
           upn = ?,
           auth_source = 'entra_id',
           email = ?,
           jmeno = ?,
           prijmeni = ?,
           dt_posledni_sync = NOW()
       WHERE id = ?`,
      [
        account.homeAccountId,
        account.username,
        account.email,
        account.givenName,
        account.surname,
        user.id
      ]
    );
    
    // ✅ VŠECHNY APLIKAČNÍ SLOUPCE ZŮSTÁVAJÍ BEZ ZMĚNY
    
  } else {
    // ✅ NEEXISTUJE - vytvoř nového s výchozími hodnotami
    await db.query(
      `INSERT INTO 25_uzivatele 
       (username, entra_id, upn, auth_source, email, jmeno, prijmeni, 
        role_v_app, aktivni, dt_vytvoreni, dt_posledni_sync)
       VALUES (?, ?, ?, 'entra_id', ?, ?, ?, 'user', 1, NOW(), NOW())`,
      [
        msUsername,
        account.homeAccountId,
        account.username,
        account.email,
        account.givenName,
        account.surname
      ]
    );
    
    // ✅ Aplikační sloupce dostanou výchozí hodnoty (NULL nebo default)
  }
  
  res.redirect('/eeo/dashboard');
});
```

---

## 🔒 Bezpečnostní pravidla

### ✅ CO SE SMÍ AKTUALIZOVAT Z ENTRA:

**Pouze tyto nové/osobní sloupce:**
- `entra_id`
- `upn`
- `auth_source`
- `email`
- `jmeno`
- `prijmeni`
- `dt_posledni_sync`

### ❌ CO SE NIKDY NEZMĚNÍ (aplikační data):

**Všechny existující sloupce zůstávají nedotčené:**
- `password` (pro fallback local login)
- `pozice_id`
- `lokalita_id`
- `role_v_app`
- `theme_preference`
- `default_view`
- `notification_settings`
- `custom_field_1, custom_field_2...`
- **Jakýkoliv jiný existující sloupec**

---

## 🎯 Výhody tohoto přístupu

1. ✅ **Žádná ztráta dat** - Všechny aplikační sloupce zůstávají
2. ✅ **Backward compatible** - Lokální login stále funguje
3. ✅ **Postupná migrace** - Uživatelé mohou přejít postupně
4. ✅ **Bezpečné** - Pouze definované sloupce se aktualizují
5. ✅ **Fallback** - Pokud Entra spadne, local login funguje

---

## 🔄 Migrace uživatelů (postupná)

### **Scénář 1: Existující uživatel přejde na Entra**

```
Stav PŘED:
username: u03924
password: $2a$10$abc...     ← lokální heslo
email: stary@email.cz
jmeno: Jan
pozice_id: 5
role_v_app: editor
auth_source: local          ← lokální

Akce: Přihlásí se přes Microsoft

Stav PO:
username: u03924            ← BEZE ZMĚNY
entra_id: a1b2c3d4-...      ← DOPLNĚNO
upn: u03924@zachranka.cz    ← DOPLNĚNO
password: $2a$10$abc...     ← ZŮSTÁVÁ (fallback)
email: novy@zachranka.cz    ← AKTUALIZOVÁNO
jmeno: Jan                  ← AKTUALIZOVÁNO
pozice_id: 5                ← BEZE ZMĚNY ✅
role_v_app: editor          ← BEZE ZMĚNY ✅
auth_source: entra_id       ← ZMĚNĚNO
dt_posledni_sync: 2025-12-05
```

### **Scénář 2: Nový uživatel z Entra**

```
Akce: První přihlášení přes Microsoft

Stav PO:
username: u03925            ← Z ENTRA
entra_id: e5f6g7h8-...      ← Z ENTRA
upn: u03925@zachranka.cz    ← Z ENTRA
password: NULL              ← Žádné lokální heslo
email: novy@zachranka.cz    ← Z ENTRA
jmeno: Petra                ← Z ENTRA
prijmeni: Nováková          ← Z ENTRA
pozice_id: NULL             ← VÝCHOZÍ
role_v_app: user            ← VÝCHOZÍ
auth_source: entra_id
```

### **Scénář 3: Lokální uživatel zůstává lokální**

```
Stav:
username: external_user
password: $2a$10$xyz...     ← lokální heslo
email: external@firma.cz
jmeno: External
entra_id: NULL              ← Žádné Entra
auth_source: local          ← Lokální

Přihlášení: Klasické username+password
Výsledek: Funguje stejně jako dříve ✅
```

---

## 🏗️ Architektura databází - FINÁLNÍ ROZHODNUTÍ

### **🎯 Hybridní přístup (DOPORUČENO)**

**Pro nové/centrální služby:**
- Centrální `erdms.erdms_users` pro Dashboard, Auth API, společné služby

**Pro existující aplikace (EEO):**
- Ponechat `eeo_db.25_uzivatele` s rozšířením o Entra sloupce
- Zachovat všechna aplikační data a logiku

---

### **Struktura:**

```
┌─────────────────────────────────────────────┐
│  ERDMS DB (centrální)                       │
├─────────────────────────────────────────────┤
│  erdms_users                                │
│  - Uživatelé pro Dashboard, Auth API       │
│  - Sdílené služby (reporting, audit...)    │
└─────────────────────────────────────────────┘
                    ↓
              (volitelné JOIN)
                    ↓
┌─────────────────────────────────────────────┐
│  EEO DB (aplikační)                         │
├─────────────────────────────────────────────┤
│  25_uzivatele + entra_id                    │
│  - Všechna existující aplikační data       │
│  - Role, nastavení specifická pro EEO      │
│  - Historie, logy, custom fields           │
└─────────────────────────────────────────────┘
```

---

### **Varianta A: Centrální `erdms_users` (pro nové služby)**

```
erdms (centrální DB)
├── erdms_users (centrální tabulka uživatelů)
│
apps (aplikační DB)
├── eeo_settings (aplikační nastavení EEO)
├── eeo_user_preferences (preference uživatele v EEO)
├── eeo_activity_log (log aktivit)
│
└── [jiné aplikace podobně]
```

**Výhody:**
- ✅ Jeden záznam uživatele pro všechny aplikace
- ✅ Konzistentní osobní údaje napříč platformou
- ✅ Snadná správa uživatelů
- ✅ Menší duplicita dat

**Nevýhody:**
- ⚠️ Cross-database dotazy (JOIN přes DB)
- ⚠️ Aplikace závislé na centrální DB

---

### **Varianta B: Replikované user tabulky (Izolace)**

```
eeo_db
├── eeo_users (kopie z Entra)
├── eeo_settings
├── eeo_user_preferences
│
erdms_db
├── erdms_users (kopie z Entra)
├── erdms_documents
```

**Výhody:**
- ✅ Úplná izolace aplikací
- ✅ Rychlejší dotazy (vše v jedné DB)
- ✅ Nezávislý vývoj aplikací

**Nevýhody:**
- ⚠️ Duplicita uživatelských dat
- ⚠️ Synchronizace více tabulek
- ⚠️ Složitější správa

---

### **🎯 Doporučení: Varianta A (Centrální DB)**

**Proč:**
1. Máte společnou platformu (ERDMS = Enterprise Resource & Document Management System)
2. Dashboard už centralizuje přístup
3. Uživatel = stejná osoba ve všech aplikacích
4. Snazší reporting a audit napříč aplikacemi

**Struktura:**

```sql
-- ============================================
-- CENTRÁLNÍ DB: erdms
-- ============================================
CREATE TABLE erdms_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,     -- u03924
  entra_id VARCHAR(255) UNIQUE,             -- a1b2c3d4-... (GUID)
  upn VARCHAR(255) UNIQUE,                  -- u03924@zachranka.cz
  
  -- Osobní údaje (SYNC Z ENTRA - read only)
  email VARCHAR(255),
  jmeno VARCHAR(100),
  prijmeni VARCHAR(100),
  titul_pred VARCHAR(50),
  titul_za VARCHAR(50),
  telefon VARCHAR(20),
  
  -- Metadata
  auth_source ENUM('entra_id') DEFAULT 'entra_id',
  aktivni TINYINT DEFAULT 1,
  dt_vytvoreni DATETIME DEFAULT CURRENT_TIMESTAMP,
  dt_posledni_sync DATETIME,
  
  INDEX idx_username (username),
  INDEX idx_entra_id (entra_id),
  INDEX idx_upn (upn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- APLIKAČNÍ DB: eeo_db (EXISTUJÍCÍ ZACHOVÁNA)
-- ============================================

-- Původní tabulka rozšířená o Entra ID
CREATE TABLE 25_uzivatele (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE,
  
  -- ✅ NOVÉ sloupce pro Entra (přidané ALTER TABLE)
  entra_id VARCHAR(255) UNIQUE,
  upn VARCHAR(255),
  auth_source ENUM('local', 'entra_id') DEFAULT 'local',
  
  -- ✅ ZACHOVANÉ původní sloupce
  password VARCHAR(255),                    -- Pro lokální fallback
  email VARCHAR(255),
  jmeno VARCHAR(100),
  prijmeni VARCHAR(100),
  titul_pred VARCHAR(50),
  titul_za VARCHAR(50),
  telefon VARCHAR(20),
  
  -- ✅ ZACHOVANÉ všechny aplikační sloupce (20+)
  pozice_id INT,
  lokalita_id INT,
  organizace_id INT,
  usek_id INT,
  role_v_app VARCHAR(50),
  theme_preference VARCHAR(20),
  language_preference VARCHAR(5),
  notification_settings TEXT,
  default_view VARCHAR(50),
  custom_field_1 VARCHAR(255),
  custom_field_2 VARCHAR(255),
  ... další aplikační sloupce ...
  
  -- Metadata
  aktivni TINYINT DEFAULT 1,
  dt_vytvoreni DATETIME,
  dt_posledni_sync DATETIME,                -- ✅ NOVÝ
  
  INDEX idx_username (username),
  INDEX idx_entra_id (entra_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### **🔄 Jak to spolupracuje:**

1. **Dashboard přihlášení** → používá `erdms.erdms_users`
2. **Uživatel klikne na EEO dlaždici** → EEO API:
   - Zkontroluje `eeo_db.25_uzivatele` podle `entra_id` nebo `username`
   - Pokud neexistuje → vytvoří nový záznam
   - Pokud existuje → aktualizuje osobní údaje z Entra
3. **EEO pracuje** → s vlastní `25_uzivatele` tabulkou (všechna aplikační data)

**Cross-database vazba (volitelná):**
```sql
-- Pokud chceš propojit pro reporting/audit:
SELECT 
  eu.username,
  eu.email,
  eeo.role_v_app,
  eeo.pozice_id
FROM erdms.erdms_users eu
LEFT JOIN eeo_db.25_uzivatele eeo 
  ON eu.entra_id = eeo.entra_id
WHERE eu.aktivni = 1;
```

---

## 📋 Implementační checklist

### Databázové změny:
- [ ] Ověřit, že `erdms_users` má sloupec `entra_id` (VARCHAR 255, UNIQUE)
- [ ] Přidat `upn` sloupec (VARCHAR 255, UNIQUE)
- [ ] Přidat `dt_posledni_sync` sloupec (DATETIME)
- [ ] Vytvořit indexy na `username`, `entra_id`, `upn`

### Backend (Auth API):
- [ ] Implementovat `syncUserPersonalInfo()` v authService
- [ ] Implementovat `createUserFromEntra()` v authService
- [ ] Upravit `/auth/callback` pro automatický sync při přihlášení

### Backend (App API - EEO):
- [ ] Middleware: `ensureUserInAppDB()` - při každém requestu do EEO API
- [ ] Vytvoř `eeo_user_settings` pokud neexistuje
- [ ] Aktualizuj `erdms_users` z Entra při každém vstupu

### Frontend:
- [ ] Při kliknutí na dlaždici aplikace → zavolat `/api/eeo/init-user`
- [ ] Tento endpoint zajistí vytvoření/update záznamu
- [ ] Pak teprve přesměrovat do aplikace

---

## 🚀 Výhody tohoto přístupu

1. ✅ **Nedestruktivní** - Neruší existující data
2. ✅ **Automatický** - Uživatelé se přidávají při prvním přihlášení
3. ✅ **Aktuální** - Osobní údaje jsou vždy sync s Entra
4. ✅ **Kontrolovatelný** - Admin může spustit full sync kdykoliv
5. ✅ **Bezpečný** - Aplikační data (práva) zůstávají nedotčená

---

## ⚠️ Rizika a mitigace

### Riziko: Duplicitní uživatelé
**Mitigace:** 
- UNIQUE index na `username`
- UNIQUE index na `entra_id`
- Hledání vždy podle obou klíčů

### Riziko: Změna UPN v Entra
**Mitigace:**
- Párování primárně podle `entra_id` (GUID - neměnné)
- UPN je sekundární identifikátor

### Riziko: Ztráta práv při sync
**Mitigace:**
- NIKDY neaktualizovat `role`, `pozice_id` atd. z Entra
- Tyto sloupce jsou POUZE aplikační

---

## 📝 SQL migrace

```sql
-- Pokud entra_id ještě neexistuje
ALTER TABLE erdms_users 
ADD COLUMN entra_id VARCHAR(255) UNIQUE AFTER username;

-- Index pro rychlé hledání
CREATE INDEX idx_entra_id ON erdms_users(entra_id);
CREATE INDEX idx_username ON erdms_users(username);
CREATE INDEX idx_upn ON erdms_users(upn);

-- Výchozí hodnoty pro nové sloupce (pokud chybí)
ALTER TABLE erdms_users 
MODIFY COLUMN auth_source ENUM('local', 'entra_id') DEFAULT 'local';

ALTER TABLE erdms_users 
MODIFY COLUMN role VARCHAR(50) DEFAULT 'user';
```

---

## 🔍 Testovací scénáře

1. **Nový uživatel se přihlásí poprvé**
   - Očekáváno: Vytvoří se záznam s `role='user'`

2. **Existující uživatel se přihlásí**
   - Očekáváno: Aktualizuje se jméno/email, `role` zůstane

3. **Admin spustí full sync**
   - Očekáváno: Aktualizují se osobní údaje všech

4. **Uživatel změní jméno v Entra**
   - Očekáváno: Při příštím přihlášení se změní i v DB

5. **Admin změní `role` v DB**
   - Očekáváno: `role` se NEZMĚNÍ při sync

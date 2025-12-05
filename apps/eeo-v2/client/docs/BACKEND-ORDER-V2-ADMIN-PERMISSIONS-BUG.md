# 🐛 BACKEND BUG: Admin neuvidí všechny objednávky (Order V2 API)

**Datum:** 3. listopadu 2025  
**Priorita:** 🔴 **KRITICKÁ**  
**Status:** ❌ **VYŽADUJE OPRAVU NA BACKENDU**

---

## 📋 POPIS PROBLÉMU

**Uživatel s admin právy** (ROLE `SUPERADMIN` nebo `ADMINISTRATOR` + permissions `ORDER_MANAGE`, `ORDER_READ_ALL`, `ORDER_VIEW_ALL`, `ORDER_OLD`) vidí pouze **12 objednávek** místo **VŠECH objednávek v databázi**.

🔥 **KRITICKÁ CHYBA:** Backend i přesto, že uživatel má:
- **ROLI** `SUPERADMIN` nebo `ADMINISTRATOR`
- **A permissions** `ORDER_MANAGE`, `ORDER_OLD`

**Stále aplikuje 12-role WHERE filtr** a vrací pouze objednávky, kde je uživatel součástí workflow.

**❌ BACKEND NEKONTROLUJE POLE `roles` V TOKENU!**

---

## 🔍 ANALÝZA

### **CO BACKEND MUSÍ KONTROLOVAT:**

🔥 **KRITICKÉ - Backend musí kontrolovat 2 věci:**

1. **ROLE uživatele** - `SUPERADMIN` a `ADMINISTRATOR` = automaticky admin
2. **PERMISSIONS** - `ORDER_MANAGE`, `ORDER_*_ALL` = admin práva

**❌ CHYBA:** Backend kontroluje jen permissions, ale **IGNORUJE role!**

**✅ SPRÁVNĚ:** Admin je uživatel, který má:
- **ROLI** `SUPERADMIN` **NEBO** `ADMINISTRATOR`
- **NEBO** má **PERMISSION** `ORDER_MANAGE` či `ORDER_*_ALL`

---

### **Přehled permissions a jejich význam:**

| Permission | Význam | Role filtr | Archivované |
|------------|--------|------------|-------------|
| `ORDER_MANAGE` | Správa všech objednávek | ❌ NE (vidí všechny) | ✅ ANO (vidí všechny) |
| `ORDER_READ_ALL` | Čtení všech objednávek | ❌ NE (vidí všechny) | ✅ ANO (vidí všechny) |
| `ORDER_VIEW_ALL` | Zobrazení všech objednávek | ❌ NE (vidí všechny) | ✅ ANO (vidí všechny) |
| `ORDER_EDIT_ALL` | Editace všech objednávek | ❌ NE (vidí všechny) | ✅ ANO (vidí všechny) |
| `ORDER_DELETE_ALL` | Mazání všech objednávek | ❌ NE (vidí všechny) | ✅ ANO (vidí všechny) |
| `ORDER_OLD` | **Admin pro archivované** | ⚠️ **Hybridní**: ANO pro nearchivované, NE pro archivované | ✅ ANO (**vidí VŠECHNY** archivované) |
| `ORDER_READ_OWN` | Čtení vlastních objednávek | ✅ ANO (jen svoje) | ❌ NE (jen nearchivované) |
| `ORDER_EDIT_OWN` | Editace vlastních objednávek | ✅ ANO (jen svoje) | ❌ NE (jen nearchivované) |
| `ORDER_DELETE_OWN` | Mazání vlastních objednávek | ✅ ANO (jen svoje) | ❌ NE (jen nearchivované) |

**Klíčové body:**
- **ROLE `SUPERADMIN` nebo `ADMINISTRATOR`** = **VŽDY ADMIN** → vidí všechny objednávky
- `*_ALL` permissions = **ADMIN** → vidí všechny objednávky bez role filtru
- `*_OWN` permissions = **BĚŽNÝ USER** → vidí jen objednávky kde má roli (12-role WHERE)
- `ORDER_OLD` = **ADMIN PRO ARCHIVOVANÉ** → vidí **VŠECHNY** archivované (bez role filtru), ale pro nearchivované platí 12-role WHERE!

### Frontend (FUNGUJE SPRÁVNĚ ✅)

```javascript
// Frontend správně detekuje admin práva
const permissions = {
  canViewAll: true,      // ✅ Správně detekováno
  hasOnlyOwn: false      // ✅ Správně detekováno
}

// Frontend NEPOUŽÍVÁ permissions filtr (jak má být)
// Spoléhá na backend že vrátí správná data
```

**Console logs z frontendu:**
```
📊 Vstupní počet objednávek: 12        ❌ Backend vrátil jen 12
🔐 Permissions: {canViewAll: true, hasOnlyOwn: false}
👤 Current User ID: 1
🔓 Permissions filtr NEAKTIVNÍ (má ORDER_*_ALL)
```

### Backend (NEFUNGUJE ❌)

Backend **ignoruje admin permissions** a aplikuje 12-role WHERE filtr i pro adminy!

---

## 🌐 API VOLÁNÍ - DETAILNÍ SPECIFIKACE

### **Endpoint:**
```
POST /order-v2/list-enriched
```

### **Request Payload:**

```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "username": "admin_user",
  "datum_od": "2025-01-01",
  "datum_do": "2025-12-31",
  "archivovano": 1
}
```

**Poznámky k parametrům:**
- `token` - JWT token obsahující **user_id** a **permissions** (např. `ORDER_MANAGE`)
- `username` - Uživatelské jméno pro audit
- `datum_od` - Volitelný filtr (začátek období)
- `datum_do` - Volitelný filtr (konec období)
- `archivovano` - `1` = vrátit i archivované, `0` nebo není = vyloučit archivované

**❌ CHYBÍ:** Parametr, který by explicitně řekl "Tento user je admin, nepouživej role filtr"

---

## 🔐 JAK BY TO MĚLO FUNGOVAT

### **Pro uživatele S admin permissions:**

```sql
-- Uživatel má ORDER_MANAGE nebo ORDER_*_ALL permissions
-- Backend by měl vrátit VŠECHNY objednávky (bez role filtru)

SELECT * FROM 25a_objednavky 
WHERE 1=1
  AND dt_objednavky >= '2025-01-01'
  AND dt_objednavky <= '2025-12-31'
  -- ŽÁDNÝ role filtr!
  -- Admin vidí i archivované (má implicitně právo ORDER_OLD)
ORDER BY dt_objednavky DESC;
```

**Očekávaný výsledek:** Všechny objednávky v databázi (např. 500+ objednávek včetně archivovaných)

### **Pro uživatele BEZ admin permissions:**

```sql
-- Uživatel má pouze ORDER_*_OWN permissions
-- Backend aplikuje 12-role WHERE klauzuli

SELECT * FROM 25a_objednavky 
WHERE (
  uzivatel_id = :user_id                      -- 1. Autor/tvůrce objednávky
  OR objednatel_id = :user_id                 -- 2. Objednatel
  OR garant_uzivatel_id = :user_id            -- 3. Garant
  OR schvalovatel_id = :user_id               -- 4. Schvalovatel  
  OR prikazce_id = :user_id                   -- 5. Příkazce
  OR uzivatel_akt_id = :user_id               -- 6. Poslední editor
  OR odesilatel_id = :user_id                 -- 7. Odeslal dodavateli
  OR dodavatel_potvrdil_id = :user_id         -- 8. Potvrdil akceptaci dodavatele
  OR zverejnil_id = :user_id                  -- 9. Zveřejnil objednávku
  OR fakturant_id = :user_id                  -- 10. Přidal fakturu
  OR dokoncil_id = :user_id                   -- 11. Dokončil objednávku
  OR potvrdil_vecnou_spravnost_id = :user_id  -- 12. Potvrdil věcnou správnost
)
AND dt_objednavky >= '2025-01-01'
AND dt_objednavky <= '2025-12-31'
AND stav_objednavky != 'ARCHIVOVANO'  -- ❌ BEZ archivovaných (nemá ORDER_OLD)
ORDER BY dt_objednavky DESC;
```

**Očekávaný výsledek:** Pouze NEARCHIVOVANÉ objednávky kde je uživatel v některé z 12 rolí (např. 50 objednávek)

### **Pro uživatele S ORDER_OLD (ale bez admin permissions):**

```sql
-- Uživatel má ORDER_*_OWN + ORDER_OLD permissions
-- ORDER_OLD funguje jako ADMIN právo pro VŠECHNY archivované objednávky!
-- Pro nearchivované platí 12-role WHERE filtr

-- Pokud frontend pošle archivovano=1:
SELECT * FROM 25a_objednavky 
WHERE (
  -- ARCHIVOVANÉ: Vidí VŠECHNY (bez role filtru)
  stav_objednavky = 'ARCHIVOVANO'
  
  OR
  
  -- NEARCHIVOVANÉ: Jen kde má roli (12-role WHERE filtr)
  (
    stav_objednavky != 'ARCHIVOVANO'
    AND (
      uzivatel_id = :user_id
      OR objednatel_id = :user_id
      OR garant_uzivatel_id = :user_id
      OR schvalovatel_id = :user_id
      OR prikazce_id = :user_id
      OR uzivatel_akt_id = :user_id
      OR odesilatel_id = :user_id
      OR dodavatel_potvrdil_id = :user_id
      OR zverejnil_id = :user_id
      OR fakturant_id = :user_id
      OR dokoncil_id = :user_id
      OR potvrdil_vecnou_spravnost_id = :user_id
    )
  )
)
AND dt_objednavky >= '2025-01-01'
AND dt_objednavky <= '2025-12-31'
ORDER BY dt_objednavky DESC;
```

**Očekávaný výsledek:** 
- **VŠECHNY archivované** objednávky v databázi (např. 200 archivovaných)
- **+ Nearchivované** kde je uživatel v některé z 12 rolí (např. 50 nearchivovaných)
- **= Celkem** 250 objednávek

**⚠️ DŮLEŽITÉ:**
- `ORDER_OLD` = **ADMIN právo POUZE pro archivované objednávky**
- Pro archivované: **NEVKLÁDÁ** role filtr → vidí VŠECHNY
- Pro nearchivované: **VKLÁDÁ** role filtr → vidí jen svoje
- Archivované se vrátí JEN když frontend pošle `archivovano=1` parametr

---

## 🔧 JAK ZJISTIT PERMISSIONS NA BACKENDU

### **AKTUÁLNÍ ŘEŠENÍ (Token obsahuje JEN user_id):**

```php
<?php
// 1. Validuj token a získej user_id
$token_data = validateToken($request['token']);
if (!$token_data) {
    return ['status' => 'error', 'message' => 'Invalid token'];
}

$user_id = $token_data['user_id']; // Token obsahuje POUZE user_id!

// 2. 🔥 NAČTI ROLE A PERMISSIONS Z DATABÁZE!
// Token neobsahuje permissions ani roles - musíme je načíst z DB

// Načti role uživatele z tabulky 25_uzivatel_role
$user_roles = getUserRolesFromDB($user_id);
// SELECT ur.kod_role FROM 25_uzivatel_role uz 
// JOIN 25_role ur ON uz.role_id = ur.id 
// WHERE uz.uzivatel_id = :user_id

// Načti permissions z rolí + přímých přiřazení
$user_permissions = getUserPermissionsFromDB($user_id);
// SELECT DISTINCT p.kod_prava 
// FROM 25_prava p
// WHERE p.id IN (
//   -- Z rolí
//   SELECT pr.pravo_id FROM 25_role_prava pr
//   JOIN 25_uzivatel_role ur ON pr.role_id = ur.role_id
//   WHERE ur.uzivatel_id = :user_id
//   UNION
//   -- Přímá přiřazení
//   SELECT up.pravo_id FROM 25_uzivatel_prava up
//   WHERE up.uzivatel_id = :user_id
// )

// 3. 🔥 KRITICKÉ: Zkontroluj ROLE (SUPERADMIN, ADMINISTRATOR = automaticky admin)
$isAdminByRole = 
    in_array('SUPERADMIN', $user_roles) ||
    in_array('ADMINISTRATOR', $user_roles);

// 4. Zkontroluj admin permissions
$hasAdminPermissions = 
    in_array('ORDER_MANAGE', $user_permissions) ||
    in_array('ORDER_READ_ALL', $user_permissions) ||
    in_array('ORDER_VIEW_ALL', $user_permissions) ||
    in_array('ORDER_EDIT_ALL', $user_permissions) ||
    in_array('ORDER_DELETE_ALL', $user_permissions);

// 5. 🔥 Kombinace: Admin NEBO má admin permissions
$is_admin = $isAdminByRole || $hasAdminPermissions;

// Zkontroluj ORDER_OLD (admin právo pro archivované)
$hasOrderOld = in_array('ORDER_OLD', $user_permissions);

if ($hasAdminPermissions) {
    // Uživatel je FULL admin - NEVKLÁDEJ role filtr pro NIČEHO
    $sql = "SELECT * FROM 25a_objednavky WHERE 1=1";
    
} else if ($hasOrderOld) {
    // Uživatel má ORDER_OLD - HYBRIDNÍ přístup:
    // - Pro ARCHIVOVANÉ: Vidí VŠECHNY (bez role filtru)
    // - Pro NEARCHIVOVANÉ: Jen kde má roli (12-role WHERE)
    
    $sql = "SELECT * FROM 25a_objednavky WHERE (
        -- ARCHIVOVANÉ: Vidí VŠECHNY
        stav_objednavky = 'ARCHIVOVANO'
        
        OR
        
        -- NEARCHIVOVANÉ: Jen kde má roli
        (
            stav_objednavky != 'ARCHIVOVANO'
            AND (
                uzivatel_id = :user_id
                OR objednatel_id = :user_id
                OR garant_uzivatel_id = :user_id
                OR schvalovatel_id = :user_id
                OR prikazce_id = :user_id
                OR uzivatel_akt_id = :user_id
                OR odesilatel_id = :user_id
                OR dodavatel_potvrdil_id = :user_id
                OR zverejnil_id = :user_id
                OR fakturant_id = :user_id
                OR dokoncil_id = :user_id
                OR potvrdil_vecnou_spravnost_id = :user_id
            )
        )
    )";
    
} else {
    // Běžný uživatel NENÍ admin - VLOŽ 12-role filtr pro VŠE
    $sql = "SELECT * FROM 25a_objednavky WHERE (
        uzivatel_id = :user_id
        OR objednatel_id = :user_id
        OR garant_uzivatel_id = :user_id
        OR schvalovatel_id = :user_id
        OR prikazce_id = :user_id
        OR uzivatel_akt_id = :user_id
        OR odesilatel_id = :user_id
        OR dodavatel_potvrdil_id = :user_id
        OR zverejnil_id = :user_id
        OR fakturant_id = :user_id
        OR dokoncil_id = :user_id
        OR potvrdil_vecnou_spravnost_id = :user_id
    )";
}

// Filtr archivovaných objednávek podle frontend požadavku
if (empty($request['archivovano'])) {
    // Frontend explicitně NEPOŽADUJE archivované → vyfiltruj je
    $sql .= " AND stav_objednavky != 'ARCHIVOVANO'";
}
// Pokud frontend poslal archivovano=1, archivované se vrátí podle permissions výše

?>
```

// 6. Zkontroluj ORDER_OLD (admin právo pro archivované)
$hasOrderOld = in_array('ORDER_OLD', $user_permissions);

// 7. 🚀 SESTAVENÍ SQL DOTAZU PODLE PERMISSIONS
if ($is_admin) {
    // FULL admin (role NEBO permissions) - ŽÁDNÝ role filtr!
    $sql = "SELECT * FROM 25a_objednavky WHERE 1=1";
    
} else if ($hasOrderOld) {
    // ORDER_OLD - HYBRIDNÍ přístup:
    // - ARCHIVOVANÉ: Vidí VŠECHNY (bez role filtru)
    // - NEARCHIVOVANÉ: Jen kde má roli (12-role WHERE)
    $sql = "SELECT * FROM 25a_objednavky WHERE (
        stav_objednavky = 'ARCHIVOVANO'  -- Všechny archivované
        OR (
            stav_objednavky != 'ARCHIVOVANO'  -- Nearchivované jen svoje
            AND (
                uzivatel_id = :user_id
                OR objednatel_id = :user_id
                OR garant_uzivatel_id = :user_id
                OR schvalovatel_id = :user_id
                OR prikazce_id = :user_id
                OR uzivatel_akt_id = :user_id
                OR odesilatel_id = :user_id
                OR dodavatel_potvrdil_id = :user_id
                OR zverejnil_id = :user_id
                OR fakturant_id = :user_id
                OR dokoncil_id = :user_id
                OR potvrdil_vecnou_spravnost_id = :user_id
            )
        )
    )";
    
} else {
    // Běžný uživatel - 12-role filtr pro VŠE
    $sql = "SELECT * FROM 25a_objednavky WHERE (
        uzivatel_id = :user_id
        OR objednatel_id = :user_id
        OR garant_uzivatel_id = :user_id
        OR schvalovatel_id = :user_id
        OR prikazce_id = :user_id
        OR uzivatel_akt_id = :user_id
        OR odesilatel_id = :user_id
        OR dodavatel_potvrdil_id = :user_id
        OR zverejnil_id = :user_id
        OR fakturant_id = :user_id
        OR dokoncil_id = :user_id
        OR potvrdil_vecnou_spravnost_id = :user_id
    )";
}

// 8. Filtr archivovaných podle frontend požadavku
// ⚠️ Pokud má ORDER_OLD, tento filtr se PŘESKOČÍ pro archivované!
if (empty($request['archivovano']) && !$hasOrderOld) {
    // Frontend NEPOŽADUJE archivované a user NEMÁ ORDER_OLD → vyfiltruj je
    $sql .= " AND stav_objednavky != 'ARCHIVOVANO'";
}
// Pokud má ORDER_OLD nebo frontend poslal archivovano=1, vrátí se podle permissions výše

?>
```

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### Test 1: Admin uživatel (user_id = 1, role = SUPERADMIN)

**Request:**
```json
POST /order-v2/list-enriched
{
  "token": "eyJ...",  // Token obsahuje role: ['SUPERADMIN'] + permissions: ['ORDER_MANAGE', 'ORDER_OLD']
  "username": "admin",
  "datum_od": "2025-01-01",
  "datum_do": "2025-12-31",
  "archivovano": 1  // ✅ Požaduje i archivované
}
```

**Očekávaná response:**
```json
{
  "status": "ok",
  "data": [
    { "id": 1, "cislo_objednavky": "O-001/...", "uzivatel_id": 5, "stav_objednavky": "POTVRZENA" },
    { "id": 2, "cislo_objednavky": "O-002/...", "uzivatel_id": 8, "stav_objednavky": "DOKONCENA" },
    { "id": 3, "cislo_objednavky": "O-003/...", "uzivatel_id": 1, "stav_objednavky": "ARCHIVOVANO" },
    { "id": 4, "cislo_objednavky": "O-004/...", "uzivatel_id": 12, "stav_objednavky": "ARCHIVOVANO" },
    ... // VŠECHNY objednávky (500+) VČETNĚ ARCHIVOVANÝCH
  ],
  "meta": {
    "total": 534,
    "is_admin_by_role": true,  // 🔥 Nový flag - admin díky ROLI
    "admin_view": true,
    "role_filter_applied": false
  }
}
```

**Aktuální chování (CHYBNÉ):**
```json
{
  "status": "ok",
  "data": [
    { "id": 3, "cislo_objednavky": "O-003/...", "uzivatel_id": 1, "stav_objednavky": "ARCHIVOVANO" },
    { "id": 7, "cislo_objednavky": "O-007/...", "objednatel_id": 1, "stav_objednavky": "POTVRZENA" },
    ... // ❌ Pouze 12 objednávek kde user_id=1 je v nějaké roli
  ],
  "meta": {
    "total": 12,
    "is_admin_by_role": false,  // ❌ Backend NEZKONTROLOVAL roli!
    "admin_view": false,  // ❌ Mělo by být true!
    "role_filter_applied": true  // ❌ Mělo by být false!
  }
}
```

🔥 **DŮVOD CHYBY:** Backend nekontroluje pole `roles` v tokenu, kontroluje jen `permissions`!

### Test 2: Běžný uživatel (user_id = 5)

**Request:**
```json
POST /order-v2/list-enriched
{
  "token": "eyJ...",  // Token obsahuje pouze ORDER_READ_OWN permission
  "username": "user5",
  "datum_od": "2025-01-01",
  "datum_do": "2025-12-31"
}
```

**Očekávaná response:**
```json
{
  "status": "ok",
  "data": [
    { "id": 1, "cislo_objednavky": "O-001/...", "uzivatel_id": 5 },
    { "id": 8, "cislo_objednavky": "O-008/...", "objednatel_id": 5 },
    { "id": 15, "cislo_objednavky": "O-015/...", "garant_uzivatel_id": 5 },
    ... // Pouze objednávky kde user_id=5 je v některé z 12 rolí
    // ❌ BEZ archivovaných (nemá ORDER_OLD)
  ],
  "meta": {
    "total": 23,
    "admin_view": false,
    "role_filter_applied": true,
    "archived_filtered_out": true
  }
}
```

### Test 3: Uživatel s ORDER_OLD (user_id = 3)

**Request:**
```json
POST /order-v2/list-enriched
{
  "token": "eyJ...",  // Token obsahuje ORDER_READ_OWN + ORDER_OLD permissions
  "username": "user3",
  "datum_od": "2025-01-01",
  "datum_do": "2025-12-31",
  "archivovano": 1  // ✅ Explicitně požaduje i archivované
}
```

**Očekávaná response:**
```json
{
  "status": "ok",
  "data": [
    { "id": 2, "cislo_objednavky": "O-002/...", "uzivatel_id": 3, "stav_objednavky": "POTVRZENA" },
    { "id": 5, "cislo_objednavky": "O-005/...", "objednatel_id": 3, "stav_objednavky": "DOKONCENA" },
    { "id": 7, "cislo_objednavky": "O-007/...", "uzivatel_id": 8, "stav_objednavky": "ARCHIVOVANO" },  // ✅ Archivovaná kde user_id=3 NENÍ!
    { "id": 10, "cislo_objednavky": "O-010/...", "uzivatel_id": 15, "stav_objednavky": "ARCHIVOVANO" },  // ✅ Archivovaná kde user_id=3 NENÍ!
    { "id": 12, "cislo_objednavky": "O-012/...", "uzivatel_id": 22, "stav_objednavky": "ARCHIVOVANO" },  // ✅ Archivovaná kde user_id=3 NENÍ!
    ... // Nearchivované kde user_id=3 JE v roli + VŠECHNY archivované
    // ✅ VČETNĚ **VŠECH** archivovaných (má ORDER_OLD) - i těch kde NENÍ součástí!
  ],
  "meta": {
    "total": 218,  // 15 nearchivovaných (kde má roli) + 203 VŠECH archivovaných
    "admin_view": false,
    "has_order_old": true,
    "role_filter_applied": true,  // Pro nearchivované ANO, pro archivované NE
    "archived_included": true,
    "note": "ORDER_OLD = admin právo pro VŠECHNY archivované"
  }
}
```

**Pokud STEJNÝ uživatel požádá BEZ `archivovano=1`:**
```json
POST /order-v2/list-enriched
{
  "token": "eyJ...",
  "username": "user3",
  "datum_od": "2025-01-01",
  "datum_do": "2025-12-31"
  // ❌ Chybí archivovano=1
}
```

**Response:** (i přes ORDER_OLD se nevrátí archivované, protože to frontend explicitně nepožadoval)
```json
{
  "status": "ok",
  "data": [
    { "id": 2, "cislo_objednavky": "O-002/...", "uzivatel_id": 3, "stav_objednavky": "POTVRZENA" },
    { "id": 5, "cislo_objednavky": "O-005/...", "objednatel_id": 3, "stav_objednavky": "DOKONCENA" },
    ... // Pouze NEARCHIVOVANÉ objednávky
    // ❌ BEZ archivovaných (frontend nepožadoval archivovano=1)
  ],
  "meta": {
    "total": 15,
    "admin_view": false,
    "role_filter_applied": true,
    "archived_filtered_out": true  // ❌ Vyfiltrované protože frontend nepožadoval
  }
}
```

---

## 📝 KONTROLNÍ CHECKLIST PRO BACKEND DEVELOPERA

- [ ] **Dekóduj JWT token** a zjisti `user_id`, `permissions` **A `roles`** 🔥
- [ ] **Zkontroluj admin ROLE:**
  - `SUPERADMIN` 🔥
  - `ADMINISTRATOR` 🔥
- [ ] **Zkontroluj admin permissions:**
  - `ORDER_MANAGE`
  - `ORDER_READ_ALL`
  - `ORDER_VIEW_ALL`
  - `ORDER_EDIT_ALL`
  - `ORDER_DELETE_ALL`
- [ ] **Admin je: (má admin ROLI) NEBO (má admin PERMISSIONS)** 🔥
- [ ] **Zkontroluj přístup k archivovaným:**
  - `ORDER_OLD` - právo k archivovaným objednávkám
- [ ] **Pokud má admin roli nebo permissions → NEVKLÁDEJ role filtr do SQL**
- [ ] **Pokud NEMÁ admin → VLOŽ 12-role WHERE klauzuli**
- [ ] **Pokud NEMÁ ORDER_OLD a není admin → VYFILTRUJ archivované** (`stav_objednavky != 'ARCHIVOVANO'`)
- [ ] **Otestuj s SUPERADMIN uživatelem** (user_id=1) - měl by vidět všechny objednávky včetně archivovaných 🔥
- [ ] **Otestuj s ADMINISTRATOR uživatelem** - měl by vidět všechny objednávky včetně archivovaných 🔥
- [ ] **Otestuj s běžným uživatelem** (user_id=5) - měl by vidět jen svoje nearchivované
- [ ] **Otestuj s uživatelem s ORDER_OLD** (user_id=3) - měl by vidět VŠECHNY archivované + svoje nearchivované

---

## 🔧 DOPORUČENÉ ŘEŠENÍ PRO BACKEND

### **PHP Příklad (přibližný kód):**

```php
<?php
function handle_order_v2_list_enriched($request) {
    // 1. Validace tokenu
    $token_data = validateToken($request['token']);
    if (!$token_data) {
        return ['status' => 'error', 'message' => 'Invalid token'];
    }
    
    $user_id = $token_data['user_id'];
    $user_permissions = $token_data['permissions'] ?? [];
    
    // 🔥 KRITICKÉ: Načti ROLE uživatele (buď z tokenu nebo z DB)
    $user_roles = $token_data['roles'] ?? getUserRoles($user_id);
    
    // 🔥 Zkontroluj admin ROLE (SUPERADMIN, ADMINISTRATOR = automaticky admin)
    $isAdminByRole = 
        in_array('SUPERADMIN', $user_roles) ||
        in_array('ADMINISTRATOR', $user_roles);
    
    // 2. Zjisti jestli má admin PERMISSIONS
    $hasAdminPermissions = 
        in_array('ORDER_MANAGE', $user_permissions) ||
        in_array('ORDER_READ_ALL', $user_permissions) ||
        in_array('ORDER_VIEW_ALL', $user_permissions) ||
        in_array('ORDER_EDIT_ALL', $user_permissions) ||
        in_array('ORDER_DELETE_ALL', $user_permissions);
    
    // 🔥 KOMBINACE: Je admin POKUD má admin ROLI NEBO admin PERMISSIONS
    $is_admin = $isAdminByRole || $hasAdminPermissions;
    
    // 2b. Zjisti zda má ORDER_OLD (admin právo pro archivované)
    $has_order_old = in_array('ORDER_OLD', $user_permissions);
    
    // 3. Sestav SQL dotaz
    $sql = "SELECT * FROM 25a_objednavky WHERE 1=1";
    $params = [];
    
    // 4. KRITICKÁ ČÁST: Aplikuj role filtr podle permissions
    if ($is_admin) {
        // FULL ADMIN - žádný role filtr
        // (SQL už obsahuje WHERE 1=1)
        
    } else if ($has_order_old) {
        // ORDER_OLD - HYBRIDNÍ přístup
        $sql .= " AND (
            -- ARCHIVOVANÉ: Vidí VŠECHNY (bez role filtru)
            stav_objednavky = 'ARCHIVOVANO'
            
            OR
            
            -- NEARCHIVOVANÉ: Jen kde má roli
            (
                stav_objednavky != 'ARCHIVOVANO'
                AND (
                    uzivatel_id = :user_id
                    OR objednatel_id = :user_id
                    OR garant_uzivatel_id = :user_id
                    OR schvalovatel_id = :user_id
                    OR prikazce_id = :user_id
                    OR uzivatel_akt_id = :user_id
                    OR odesilatel_id = :user_id
                    OR dodavatel_potvrdil_id = :user_id
                    OR zverejnil_id = :user_id
                    OR fakturant_id = :user_id
                    OR dokoncil_id = :user_id
                    OR potvrdil_vecnou_spravnost_id = :user_id
                )
            )
        )";
        $params[':user_id'] = $user_id;
        
    } else {
        // Běžný uživatel - 12-role filtr pro VŠE
        $sql .= " AND (
            uzivatel_id = :user_id
            OR objednatel_id = :user_id
            OR garant_uzivatel_id = :user_id
            OR schvalovatel_id = :user_id
            OR prikazce_id = :user_id
            OR uzivatel_akt_id = :user_id
            OR odesilatel_id = :user_id
            OR dodavatel_potvrdil_id = :user_id
            OR zverejnil_id = :user_id
            OR fakturant_id = :user_id
            OR dokoncil_id = :user_id
            OR potvrdil_vecnou_spravnost_id = :user_id
        )";
        $params[':user_id'] = $user_id;
    }
    
    // 5. Přidej ostatní filtry (datum, archivovano, atd.)
    if (!empty($request['datum_od'])) {
        $sql .= " AND dt_objednavky >= :datum_od";
        $params[':datum_od'] = $request['datum_od'];
    }
    
    if (!empty($request['datum_do'])) {
        $sql .= " AND dt_objednavky <= :datum_do";
        $params[':datum_do'] = $request['datum_do'];
    }
    
    // Filtr archivovaných objednávek podle frontend požadavku
    if (empty($request['archivovano'])) {
        // Frontend NEPOŽADUJE archivované → vyfiltruj je
        $sql .= " AND stav_objednavky != 'ARCHIVOVANO'";
    }
    // Pokud frontend poslal archivovano=1, archivované se vrátí podle permissions výše
    
    // 6. Spusť dotaz
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 7. Enrichment (doplň related data)
    $enriched_orders = enrichOrdersData($orders);
    
    // 8. Return response s metadata
    return [
        'status' => 'ok',
        'data' => $enriched_orders,
        'meta' => [
            'total' => count($enriched_orders),
            'admin_view' => $is_admin,
            'has_order_old' => $has_order_old,
            'role_filter_applied' => !$is_admin,
            'user_id' => $user_id
        ]
    ];
}
?>
```

---

## 📞 KONTAKT

**Frontend Developer:** robex08  
**Datum nahlášení:** 3. listopadu 2025  
**Priorita:** 🔴 KRITICKÁ - Admin nemůže spravovat systém!

---

## 🔗 SOUVISEJÍCÍ DOKUMENTY

- `BACKEND-ORDER-V2-USER-ROLES-FILTER.md` - Původní požadavek na role filtrování
- `ORDERS-V2-OPTIMIZATION-REPORT-2025-11-03.md` - Report o optimalizaci
- `API-V2-MIGRATION-ANALYSIS.md` - Analýza migrace na V2 API

---

**URGENTNĚ VYŽADUJE OPRAVU NA BACKENDU!** 🔥

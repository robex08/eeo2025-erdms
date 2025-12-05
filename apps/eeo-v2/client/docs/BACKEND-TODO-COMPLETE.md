# 🔧 BACKEND TODO - Kompletní seznam úkolů pro BE vývojáře

**Projekt:** ZZS EEO - Pokladní kniha  
**Datum:** 9. listopadu 2025  
**Priorita:** 🔴 VYSOKÁ  
**Status:** ⏳ Čeká na implementaci

---

## 📋 PŘEHLED ZMĚN

Backend musí implementovat:
1. **Nový endpoint** pro získání všech pokladen (admin/MANAGE)
2. **Rozšíření** existujícího endpointu o vypršelá přiřazení
3. **Nový endpoint** pro změnu stavu uzamčení knihy
4. **SQL migrace** - stav uzamčení (3 sloupce)
5. **SQL migrace** - oprávnění (9 nových oprávnění)
6. **Rozšíření** všech existujících endpointů o stav_uzamceni
7. **Kontrola oprávnění** ve všech endpointech (CRUD operace)

---

## 🗄️ DATABÁZOVÉ ZMĚNY

### **A) SQL #1: Stav uzamčení pokladní knihy**

**Soubor:** `add_lock_status_to_cashbooks.sql` ✅ (připraven)

**Co dělá:**
```sql
-- Přidá 3 nové sloupce do tabulky 25a_pokladni_knihy
ALTER TABLE 25a_pokladni_knihy 
ADD COLUMN stav_uzamceni ENUM('open', 'closed', 'locked') DEFAULT 'open';

ALTER TABLE 25a_pokladni_knihy 
ADD COLUMN zamknuto_uzivatel_id INT(11) NULL;

ALTER TABLE 25a_pokladni_knihy 
ADD COLUMN zamknuto_datum DATETIME NULL;

-- Foreign key, index, trigger
```

**Spustit:**
```bash
mysql -u root -p evidence_smluv < add_lock_status_to_cashbooks.sql
```

**Kontrola:**
```sql
DESCRIBE 25a_pokladni_knihy;
-- Měly by být vidět sloupce: stav_uzamceni, zamknuto_uzivatel_id, zamknuto_datum
```

**⚠️ TODO:** Zkontrolovat, zda tabulka `25a_pokladni_knihy` již tyto sloupce obsahuje!

---

### **B) SQL #2: Oprávnění pro pokladní knihu**

**Soubor:** `add_cashbook_permissions_v2.sql` ✅ (připraven)

**Co dělá:**
```sql
-- Přidá/aktualizuje 9 oprávnení:
INSERT IGNORE INTO opravneni (kod_opravneni, nazev, ...) VALUES
('CASH_BOOK_READ_OWN', ...),
('CASH_BOOK_READ_ALL', ...),
('CASH_BOOK_EDIT_OWN', ...),
('CASH_BOOK_EDIT_ALL', ...),
('CASH_BOOK_DELETE_OWN', ...),
('CASH_BOOK_DELETE_ALL', ...),
('CASH_BOOK_EXPORT_OWN', ...),
('CASH_BOOK_EXPORT_ALL', ...),
('CASH_BOOK_MANAGE', ...);

-- Přiřadí k rolím
```

**Spustit:**
```bash
mysql -u root -p evidence_smluv < add_cashbook_permissions_v2.sql
```

**Kontrola:**
```sql
SELECT kod_prava, popis FROM 25_prava WHERE kod_prava LIKE 'CASH_BOOK_%';
-- Mělo by vrátit 9 řádků
```

**✅ STATUS: HOTOVO** - Všech 9 oprávnění je v databázi (ID 39-47):
- 39: CASH_BOOK_MANAGE
- 40: CASH_BOOK_READ_OWN
- 41: CASH_BOOK_READ_ALL
- 42: CASH_BOOK_EDIT_OWN
- 43: CASH_BOOK_EDIT_ALL
- 44: CASH_BOOK_DELETE_OWN
- 45: CASH_BOOK_DELETE_ALL
- 46: CASH_BOOK_EXPORT_OWN
- 47: CASH_BOOK_EXPORT_ALL

---

## 🆕 NOVÉ API ENDPOINTY

### **1. cashbook-assignments-all** (NOVÝ)

**Účel:** Vrátit VŠECHNY pokladny všech uživatelů (jen pro ADMIN/MANAGE)

**Soubor:** `/api.eeo/cashbook-assignments-all.php` (vytvořit)

**Request:**
```json
POST /api.eeo/cashbook-assignments-all
{
  "username": "admin@zachranka.cz",
  "token": "abc123..."
}
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "pokladna_id": 5,
      "cislo_pokladny": "100",
      "nazev_pracoviste": "Hradec Králové",
      "kod_pracoviste": "HK",
      "uzivatel_id": 10,
      "uzivatel_cele_jmeno": "Svobodová Marie",
      "je_hlavni": true,
      "platne_od": "2024-01-01",
      "platne_do": null,
      "koncovy_stav": 15230.50,
      "pocet_uzivatelu": 5
    },
    ...
  ]
}
```

**SQL dotaz:** (připraven v `BACKEND-CASHBOX-ASSIGNMENTS-ALL-API.php`)
```sql
SELECT 
  ppu.id,
  ppu.pokladna_id,
  pp.cislo_pokladny,
  pp.nazev AS nazev_pracoviste,
  pp.kod_pracoviste,
  pp.ciselna_rada_vpd,
  pp.vpd_od_cislo,
  pp.ciselna_rada_ppd,
  pp.ppd_od_cislo,
  ppu.uzivatel_id,
  CONCAT(u.prijmeni, ' ', u.jmeno) AS uzivatel_cele_jmeno,
  ppu.je_hlavni,
  ppu.platne_od,
  ppu.platne_do,
  COALESCE(
    (SELECT koncovy_stav 
     FROM 25a_pokladni_knihy 
     WHERE prirazeni_id = ppu.id 
     AND rok = YEAR(CURDATE()) 
     AND mesic = MONTH(CURDATE())
     LIMIT 1), 
    0
  ) AS koncovy_stav,
  (SELECT COUNT(*) 
   FROM 25a_pokladny_uzivatele ppu2 
   WHERE ppu2.pokladna_id = pp.id
  ) AS pocet_uzivatelu
FROM 25a_pokladny_uzivatele ppu
LEFT JOIN 25a_pokladny pp ON ppu.pokladna_id = pp.id
LEFT JOIN zamestnanci u ON ppu.uzivatel_id = u.id
ORDER BY pp.cislo_pokladny ASC
```

**Kontrola oprávnění:**
```php
// ⚠️ POZOR: Tabulka je 25_prava, sloupec je kod_prava (ne kod_opravneni)

// Zkontrolovat, zda má uživatel některé z těchto oprávnění:
$hasAccess = false;
foreach ($user['permissions'] as $perm) {
    if (in_array($perm['kod_prava'], [
        'CASH_BOOK_READ_ALL',
        'CASH_BOOK_EDIT_ALL',
        'CASH_BOOK_DELETE_ALL',
        'CASH_BOOK_MANAGE'
    ])) {
        $hasAccess = true;
        break;
    }
}

// NEBO zkontrolovat admin role
foreach ($user['roles'] as $role) {
    if ($role['kod_role'] === 'SUPERADMIN' || $role['kod_role'] === 'ADMINISTRATOR') {
        $hasAccess = true;
        break;
    }
}

if (!$hasAccess) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Nemáte oprávnění k zobrazení všech pokladen'
    ]);
    exit;
}
```

---

### **2. cashbook-change-lock-status** (NOVÝ)

**Účel:** Změnit stav uzamčení knihy (open/closed/locked)

**Soubor:** `/api.eeo/cashbook-change-lock-status.php` (vytvořit)

**Request:**
```json
POST /api.eeo/cashbook-change-lock-status
{
  "username": "jan.novak@zachranka.cz",
  "token": "abc123...",
  "book_id": 5,
  "new_status": "closed"  // open | closed | locked
}
```

**Response - úspěch:**
```json
{
  "status": "success",
  "message": "Stav pokladní knihy byl změněn",
  "data": {
    "book_id": 5,
    "old_status": "open",
    "new_status": "closed",
    "changed_by_user_id": 52,
    "changed_by_user_name": "Novák Jan",
    "timestamp": "2025-11-09 15:30:25"
  }
}
```

**Response - chyba:**
```json
{
  "status": "error",
  "message": "Zamknout knihu může jen správce s oprávněním CASH_BOOK_MANAGE"
}
```

**Implementace:** (kompletní kód v `BACKEND-CASHBOOK-CHANGE-LOCK-STATUS-API.php`)

**Pravidla validace:**
```
VLASTNÍK může:
  ✅ OPEN → CLOSED (uzavřít svou knihu)
  ✅ CLOSED → OPEN (otevřít svou uzavřenou knihu)
  ❌ LOCKED → OPEN (nemůže odemknout zamknutou)
  ❌ * → LOCKED (nemůže zamknout)

MANAGE může:
  ✅ Jakýkoli stav → Jakýkoli stav (absolutní moc)
```

**SQL UPDATE:**
```sql
UPDATE 25a_pokladni_knihy
SET stav_uzamceni = ?,
    zamknuto_uzivatel_id = ?
WHERE id = ?
```

**Audit log:**
```sql
INSERT INTO 25a_pokladni_audit 
(typ_entity, entita_id, akce, uzivatel_id, zmena_json)
VALUES ('kniha', ?, 'change_lock_status', ?, ?)
```

---

## 🔄 ROZŠÍŘENÍ EXISTUJÍCÍCH ENDPOINTŮ

### **3. cashbook-assignments-list** (ROZŠÍŘIT)

**Soubor:** `/api.eeo/cashbook-assignments-list.php`

**PŘIDAT parametr:**
```php
$includeExpired = $_POST['include_expired'] ?? false;
```

**ZMĚNA v SQL WHERE:**
```php
if (!$includeExpired) {
    // Původní chování - jen aktivní
    $where .= " AND (ppu.platne_do IS NULL OR ppu.platne_do >= CURDATE())";
} else {
    // Nové - včetně vypršelých
    // Bez filtru platnosti
}
```

---

### **4. cashbook-list** (ROZŠÍŘIT)

**Soubor:** `/api.eeo/cashbook-list.php`

**PŘIDAT do SELECT:**
```sql
SELECT 
  pk.*,
  pk.stav_uzamceni,           -- NOVÉ
  pk.zamknuto_uzivatel_id,    -- NOVÉ
  pk.zamknuto_datum,          -- NOVÉ
  CONCAT(u.prijmeni, ' ', u.jmeno) AS zamkl_uzivatel_jmeno  -- NOVÉ (volitelné)
FROM 25a_pokladni_knihy pk
LEFT JOIN zamestnanci u ON pk.zamknuto_uzivatel_id = u.id  -- NOVÉ
WHERE ...
```

**Response musí vrátit:**
```json
{
  "books": [
    {
      "id": 5,
      "stav_uzamceni": "closed",           // NOVÉ
      "zamknuto_uzivatel_id": 52,          // NOVÉ
      "zamknuto_datum": "2025-11-09 14:20:00"  // NOVÉ
    }
  ]
}
```

---

### **5. cashbook-detail** (ROZŠÍŘIT)

**Soubor:** `/api.eeo/cashbook-detail.php`

**PŘIDAT do SELECT:** (stejné jako u cashbook-list)

---

### **6. cashbook-entry-create** (PŘIDAT KONTROLU)

**Soubor:** `/api.eeo/cashbook-entry-create.php`

**PŘED VYTVOŘENÍM záznamu:**
```php
// 1. Načíst knihu s informací o vlastníkovi (přes JOIN)
$query = "
    SELECT 
        pk.stav_uzamceni, 
        ppu.uzivatel_id 
    FROM 25a_pokladni_knihy pk
    JOIN 25a_pokladny_uzivatele ppu ON pk.prirazeni_id = ppu.id
    WHERE pk.id = ?
";
$stmt = $db->prepare($query);
$stmt->bind_param('i', $bookId);
$stmt->execute();
$book = $stmt->get_result()->fetch_assoc();

// 2. Kontrola uzamčení
if ($book['stav_uzamceni'] === 'locked') {
    // Může editovat jen MANAGE
    if (!hasPermission($user, 'CASH_BOOK_MANAGE')) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Pokladní kniha je zamknuta. Může ji upravit jen správce.'
        ]);
        exit;
    }
} else if ($book['stav_uzamceni'] === 'closed') {
    // Může editovat vlastník nebo MANAGE
    $isOwner = $book['uzivatel_id'] === $user['id'];
    $hasManage = hasPermission($user, 'CASH_BOOK_MANAGE');
    
    if (!$isOwner && !$hasManage) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Pokladní kniha je uzavřena. Může ji upravit jen vlastník nebo správce.'
        ]);
        exit;
    }
}

// 3. Kontrola EDIT oprávnění
$isOwner = $book['uzivatel_id'] === $user['id'];
$canEditOwn = hasPermission($user, 'CASH_BOOK_EDIT_OWN');
$canEditAll = hasPermission($user, 'CASH_BOOK_EDIT_ALL');
$canManage = hasPermission($user, 'CASH_BOOK_MANAGE');

if (!$canManage && !$canEditAll && !($canEditOwn && $isOwner)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Nemáte oprávnění k editaci této pokladní knihy'
    ]);
    exit;
}

// Pokud všechny kontroly prošly → pokračovat s vytvořením záznamu
```

---

### **7. cashbook-entry-update** (PŘIDAT KONTROLU)

**Soubor:** `/api.eeo/cashbook-entry-update.php`

**STEJNÁ KONTROLA jako u cashbook-entry-create** (viz výše)

---

### **8. cashbook-entry-delete** (PŘIDAT KONTROLU)

**Soubor:** `/api.eeo/cashbook-entry-delete.php`

**PŘED SMAZÁNÍM:**
```php
// 1. Načíst položku a knihu (s vlastníkem přes JOIN)
$query = "
    SELECT 
        pk.stav_uzamceni, 
        ppu.uzivatel_id 
    FROM 25a_pokladni_polozky pp
    JOIN 25a_pokladni_knihy pk ON pp.pokladni_kniha_id = pk.id
    JOIN 25a_pokladny_uzivatele ppu ON pk.prirazeni_id = ppu.id
    WHERE pp.id = ?
";
$stmt = $db->prepare($query);
$stmt->bind_param('i', $entryId);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();

// 2. Kontrola uzamčení (stejná jako u create/update)
if ($result['stav_uzamceni'] === 'locked') {
    if (!hasPermission($user, 'CASH_BOOK_MANAGE')) {
        echo json_encode(['status' => 'error', 'message' => 'Kniha je zamknuta']);
        exit;
    }
} else if ($result['stav_uzamceni'] === 'closed') {
    $isOwner = $result['uzivatel_id'] === $user['id'];
    $hasManage = hasPermission($user, 'CASH_BOOK_MANAGE');
    if (!$isOwner && !$hasManage) {
        echo json_encode(['status' => 'error', 'message' => 'Kniha je uzavřena']);
        exit;
    }
}

// 3. Kontrola DELETE oprávnění
$isOwner = $result['uzivatel_id'] === $user['id'];
$canDeleteOwn = hasPermission($user, 'CASH_BOOK_DELETE_OWN');
$canDeleteAll = hasPermission($user, 'CASH_BOOK_DELETE_ALL');
$canManage = hasPermission($user, 'CASH_BOOK_MANAGE');

if (!$canManage && !$canDeleteAll && !($canDeleteOwn && $isOwner)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Nemáte oprávnění k mazání z této pokladní knihy'
    ]);
    exit;
}

// Pokud prošly kontroly → smazat
```

---

## 🛠️ HELPER FUNKCE (VYTVOŘIT)

### **hasPermission() helper**

**Soubor:** `/api.eeo/includes/helpers.php` (nebo podobný)

```php
/**
 * Kontrola, zda má uživatel konkrétní oprávnění
 * 
 * ⚠️ POZOR: Databázový sloupec je kod_prava (ne kod_opravneni)
 * 
 * @param array $user - Objekt uživatele s permissions polem
 * @param string $permissionCode - Kód oprávnění (např. 'CASH_BOOK_MANAGE')
 * @return bool
 */
function hasPermission($user, $permissionCode) {
    if (!isset($user['permissions']) || !is_array($user['permissions'])) {
        return false;
    }
    
    foreach ($user['permissions'] as $perm) {
        // Tabulka 25_prava používá sloupec kod_prava
        if ($perm['kod_prava'] === $permissionCode) {
            return true;
        }
    }
    
    return false;
}

/**
 * Kontrola, zda má uživatel alespoň jedno z oprávnění
 * @param array $user - Objekt uživatele
 * @param array $permissionCodes - Pole kódů oprávnění
 * @return bool
 */
function hasAnyPermission($user, $permissionCodes) {
    foreach ($permissionCodes as $code) {
        if (hasPermission($user, $code)) {
            return true;
        }
    }
    return false;
}

/**
 * Kontrola admin role
 * @param array $user - Objekt uživatele
 * @return bool
 */
function isAdmin($user) {
    if (!isset($user['roles']) || !is_array($user['roles'])) {
        return false;
    }
    
    foreach ($user['roles'] as $role) {
        if (in_array($role['kod_role'], ['SUPERADMIN', 'ADMINISTRATOR'])) {
            return true;
        }
    }
    
    return false;
}
```

---

## ✅ CHECKLIST PRO BACKEND VÝVOJÁŘE

### **DATABÁZE:**
- [ ] Spustit `add_lock_status_to_cashbooks.sql`
- [ ] Kontrola: `DESCRIBE 25a_pokladni_knihy` (3 nové sloupce)
- [x] ✅ Spustit `add_cashbook_permissions_v2.sql` - **HOTOVO** (9 oprávnění v DB)
- [x] ✅ Kontrola: `SELECT * FROM 25_prava WHERE kod_prava LIKE 'CASH_BOOK_%'` - **OK (9 řádků)**

### **NOVÉ ENDPOINTY:**
- [ ] Vytvořit `/api.eeo/cashbook-assignments-all.php`
  - [ ] Kontrola autentizace
  - [ ] Kontrola oprávnění (_ALL nebo admin role)
  - [ ] SQL dotaz (viz výše)
  - [ ] Response formát
  - [ ] Testovat s admin účtem
  - [ ] Testovat s běžným uživatelem (očekává se error)
  
- [ ] Vytvořit `/api.eeo/cashbook-change-lock-status.php`
  - [ ] Kontrola autentizace
  - [ ] Validace parametrů (book_id, new_status)
  - [ ] Načíst aktuální stav knihy
  - [ ] Kontrola oprávnění podle pravidel
  - [ ] UPDATE dotaz
  - [ ] Audit log
  - [ ] Testovat všech 6 scénářů (viz dokumentace)

### **ROZŠÍŘENÍ EXISTUJÍCÍCH:**
- [ ] `cashbook-assignments-list.php` - parametr `include_expired`
- [ ] `cashbook-list.php` - přidat `stav_uzamceni`, `zamknuto_*` do SELECT
- [ ] `cashbook-detail.php` - přidat `stav_uzamceni`, `zamknuto_*` do SELECT
- [ ] `cashbook-entry-create.php` - přidat kontrolu uzamčení + oprávnění
- [ ] `cashbook-entry-update.php` - přidat kontrolu uzamčení + oprávnění
- [ ] `cashbook-entry-delete.php` - přidat kontrolu uzamčení + oprávnění

### **HELPER FUNKCE:**
- [ ] Vytvořit `hasPermission($user, $code)`
- [ ] Vytvořit `hasAnyPermission($user, $codes)`
- [ ] Vytvořit `isAdmin($user)`

### **TESTOVÁNÍ:**
- [ ] Test: Admin načítá všechny pokladny (`cashbook-assignments-all`)
- [ ] Test: User načítá všechny pokladny (očekává error)
- [ ] Test: Vlastník uzavírá knihu (open → closed)
- [ ] Test: Vlastník otevírá uzavřenou knihu (closed → open)
- [ ] Test: User se pokouší zamknout (očekává error)
- [ ] Test: Admin zamyká knihu (open → locked)
- [ ] Test: User se pokouší editovat zamknutou knihu (očekává error)
- [ ] Test: User se pokouší editovat cizí uzavřenou knihu (očekává error)
- [ ] Test: MANAGE může editovat zamknutou knihu
- [ ] Test: MANAGE může odemknout knihu

### **DOKUMENTACE:**
- [ ] Aktualizovat API dokumentaci
- [ ] Přidat příklady curl requestů
- [ ] Dokumentovat response formáty

---

## 📊 MAPOVÁNÍ OPRÁVNĚNÍ NA ENDPOINTY

| Endpoint | READ_OWN | READ_ALL | EDIT_OWN | EDIT_ALL | DELETE_OWN | DELETE_ALL | MANAGE |
|----------|----------|----------|----------|----------|------------|------------|--------|
| `cashbook-list` | ✅ vlastní | ✅ vše | - | - | - | - | ✅ vše |
| `cashbook-detail` | ✅ vlastní | ✅ vše | - | - | - | - | ✅ vše |
| `cashbook-entry-create` | - | - | ✅ vlastní | ✅ vše | - | - | ✅ vše |
| `cashbook-entry-update` | - | - | ✅ vlastní | ✅ vše | - | - | ✅ vše |
| `cashbook-entry-delete` | - | - | - | - | ✅ vlastní | ✅ vše | ✅ vše |
| `cashbook-assignments-all` | - | ✅ | - | ✅ | - | ✅ | ✅ |
| `cashbook-change-lock-status` | - | - | - | - | - | - | ✅ |

**Poznámka:** `MANAGE` má vždy přístup ke všemu, včetně zamykání/odemykání.

---

## 🧪 TESTOVACÍ SCÉNÁŘE (curl příkazy)

### **1. Test: Admin načítá všechny pokladny**
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-assignments-all \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@zachranka.cz",
    "token": "admin_token_here"
  }'

# Očekáváno: status: success, data: array pokladen
```

### **2. Test: User bez oprávnění**
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-assignments-all \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@zachranka.cz",
    "token": "user_token_here"
  }'

# Očekáváno: status: error, message: "Nemáte oprávnění..."
```

### **3. Test: Vlastník uzavírá knihu**
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-change-lock-status \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jan.novak@zachranka.cz",
    "token": "user_token",
    "book_id": 5,
    "new_status": "closed"
  }'

# Očekáváno: status: success
```

### **4. Test: User se pokouší zamknout**
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-change-lock-status \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jan.novak@zachranka.cz",
    "token": "user_token",
    "book_id": 5,
    "new_status": "locked"
  }'

# Očekáváno: status: error, message: "Zamknout knihu může jen správce..."
```

### **5. Test: Editace zamknuté knihy**
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-entry-create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jan.novak@zachranka.cz",
    "token": "user_token",
    "book_id": 5,
    "datum_zapisu": "2025-11-09",
    "obsah_zapisu": "Test",
    "castka_prijem": 100
  }'

# Očekáváno (pokud kniha locked): status: error, message: "Pokladní kniha je zamknuta..."
```

---

## 📞 KONTAKT NA FRONTEND VÝVOJÁŘE

Pokud máte otázky k implementaci nebo potřebujete clarifikaci:

**Frontend očekává:**
- Response formáty podle dokumentace výše
- Pole `permissions` v user objektu s kódy oprávnění
- Pole `stav_uzamceni` u každé knihy
- Konzistentní error messages

**Případné problémy hlásit:**
- Přes Slack/Email
- S ukázkou requestu/response
- S chybovou hláškou

---

## 🎯 PRIORITIZACE

### **🔴 VYSOKÁ PRIORITA (implementovat ihned):**
1. SQL migrace (`add_lock_status_to_cashbooks.sql`)
2. SQL oprávnění (`add_cashbook_permissions_v2.sql`)
3. Endpoint `cashbook-assignments-all.php`
4. Rozšíření `cashbook-list.php` o `stav_uzamceni`

### **🟡 STŘEDNÍ PRIORITA (do týdne):**
5. Endpoint `cashbook-change-lock-status.php`
6. Kontroly oprávnění v CRUD endpointech
7. Helper funkce

### **🟢 NÍZKÁ PRIORITA (nice to have):**
8. Email notifikace při zamknutí
9. Audit log improvements
10. Bulk operace

---

## 📝 POZNÁMKY

1. **Zpětná kompatibilita:** Pokud `stav_uzamceni` je NULL → považovat za 'open'
2. **Permissions pole:** Ujistit se, že user objekt obsahuje permissions při validaci tokenu
3. **Error messages:** Použít user-friendly zprávy (česky)
4. **Logging:** Logovat všechny změny stavů do audit tabulky
5. **Performance:** Indexy na `stav_uzamceni` už jsou v SQL migrace

---

**✅ Vše připraveno k implementaci!**

**📌 Dokumentace k dispozici:**
- `CASHBOOK-PERMISSIONS-AND-LOCK-STATUS.md` - kompletní dokumentace
- `BACKEND-CASHBOX-ASSIGNMENTS-ALL-API.php` - SQL + PHP příklad
- `BACKEND-CASHBOOK-CHANGE-LOCK-STATUS-API.php` - SQL + PHP příklad
- `add_lock_status_to_cashbooks.sql` - SQL migrace
- `add_cashbook_permissions_v2.sql` - SQL oprávnění

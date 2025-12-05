# 📦 BACKEND - POKLADNÍ KNIHA - Kompletní přehled

**Projekt:** ZZS EEO - Evidence smluv  
**Modul:** Pokladní kniha s rozšířeným oprávněním  
**Datum:** 9. listopadu 2025  
**Status:** ✅ Oprávnění v DB | ⏳ Čeká na API implementaci

---

## ✅ CO JE HOTOVO

### **1. Databáze - Oprávnění** ✅
**Tabulka:** `25_prava`  
**Všech 9 oprávnění je naimportováno:**

| ID | kod_prava | popis |
|----|-----------|-------|
| 39 | CASH_BOOK_MANAGE | Kompletní správa všech pokladních knih (všechna práva) |
| 40 | CASH_BOOK_READ_OWN | Zobrazení vlastní pokladní knihy |
| 41 | CASH_BOOK_READ_ALL | Zobrazení všech pokladních knih |
| 42 | CASH_BOOK_EDIT_OWN | Editace záznamů ve vlastní pokladní knize |
| 43 | CASH_BOOK_EDIT_ALL | Editace záznamů ve všech pokladních knihách |
| 44 | CASH_BOOK_DELETE_OWN | Smazání záznamů z vlastní pokladní knihy |
| 45 | CASH_BOOK_DELETE_ALL | Smazání záznamů ze všech pokladních knih |
| 46 | CASH_BOOK_EXPORT_OWN | Export vlastní pokladní knihy (CSV, PDF) |
| 47 | CASH_BOOK_EXPORT_ALL | Export všech pokladních knih (CSV, PDF) |

**Verifikace:**
```sql
SELECT kod_prava, popis 
FROM 25_prava 
WHERE kod_prava LIKE 'CASH_BOOK_%' 
ORDER BY id;
```

---

### **2. Frontend - Komponenty** ✅
- ✅ `CashboxSelector.jsx` - Material-UI dropdown pro výběr pokladny
- ✅ `LockStatusBadge.jsx` - Badge pro zobrazení stavu uzamčení
- ✅ `cashbookPermissions.js` - Utility pro kontrolu oprávnění
- ✅ `CashBookPage.js` - Integrace selektoru s podmíněným zobrazením
- ✅ Material-UI balíčky nainstalované (`@mui/icons-material@6.5.0`)

---

## ⏳ CO ZBÝVÁ IMPLEMENTOVAT

### **1. SQL Migrace - Stav uzamčení** 🔴 PRIORITA
**Soubor:** `add_lock_status_to_cashbooks.sql`

**Spustit:**
```bash
mysql -u root -p evidence_smluv < add_lock_status_to_cashbooks.sql
```

**Co přidá:**
- Sloupec `stav_uzamceni` ENUM('open','closed','locked') DEFAULT 'open'
- Sloupec `zamknuto_uzivatel_id` INT(11) NULL
- Sloupec `zamknuto_datum` DATETIME NULL
- Foreign key na `zamestnanci`
- Index na `stav_uzamceni`
- Trigger pro auto-nastavení `zamknuto_datum`

**Kontrola po spuštění:**
```sql
DESCRIBE 25a_pokladni_knihy;
-- Měly by být vidět 3 nové sloupce
```

---

### **2. Přiřazení oprávnění k rolím** 🟡 STŘEDNÍ PRIORITA

**Potřeba zjistit:**
- Existuje tabulka `25_role`?
- Existuje tabulka `25_role_prava` (vazební tabulka)?
- Jaké role existují? (SUPERADMIN, ADMINISTRATOR, POKLADNIK, USER?)

**Pokud ano, použít:**
```sql
-- Příklad (upravit podle skutečné struktury)
INSERT IGNORE INTO 25_role_prava (role_id, prava_id)
SELECT r.id, p.id
FROM 25_role r, 25_prava p
WHERE r.kod_role = 'SUPERADMIN' 
  AND p.kod_prava = 'CASH_BOOK_MANAGE';

-- Podobně pro ostatní role...
```

**Doporučené přiřazení:**
- **SUPERADMIN** → `CASH_BOOK_MANAGE` (vše)
- **ADMINISTRATOR** → `CASH_BOOK_*_ALL` (všechny _ALL oprávnění)
- **POKLADNIK** → `CASH_BOOK_*_OWN` (vlastní pokladna)

---

### **3. Nové API Endpointy** 🔴 PRIORITA

#### **A) cashbook-assignments-all.php** (NOVÝ)
**Účel:** Vrátit všechny pokladny všech uživatelů (pro adminy)

**Kontrola přístupu:**
```php
// User musí mít některé z těchto oprávnění:
- CASH_BOOK_READ_ALL
- CASH_BOOK_EDIT_ALL
- CASH_BOOK_DELETE_ALL
- CASH_BOOK_MANAGE

// NEBO roli:
- SUPERADMIN
- ADMINISTRATOR
```

**SQL dotaz:**
```sql
SELECT 
  ppu.id,
  ppu.pokladna_id,
  pp.cislo_pokladny,
  pp.nazev AS nazev_pracoviste,
  pp.kod_pracoviste,
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
  ) AS koncovy_stav
FROM 25a_pokladny_uzivatele ppu
LEFT JOIN 25a_pokladny pp ON ppu.pokladna_id = pp.id
LEFT JOIN zamestnanci u ON ppu.uzivatel_id = u.id
ORDER BY pp.cislo_pokladny ASC
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
      "uzivatel_id": 10,
      "uzivatel_cele_jmeno": "Novák Jan",
      "je_hlavni": true,
      "platne_od": "2024-01-01",
      "platne_do": null,
      "koncovy_stav": 15230.50
    }
  ]
}
```

---

#### **B) cashbook-change-lock-status.php** (NOVÝ)
**Účel:** Změnit stav uzamčení knihy

**Request:**
```json
{
  "username": "jan.novak@zachranka.cz",
  "token": "...",
  "book_id": 5,
  "new_status": "closed"  // open | closed | locked
}
```

**Validační pravidla:**
```
VLASTNÍK může:
  ✅ open → closed
  ✅ closed → open (pokud je on uzamčeno jeho ID)
  ❌ * → locked (nemůže zamknout)
  ❌ locked → * (nemůže odemknout locked)

CASH_BOOK_MANAGE může:
  ✅ Cokoliv → Cokoliv (absolutní moc)
```

**Implementace:**
```php
// 1. Načíst aktuální knihu
$query = "SELECT stav_uzamceni, uzivatel_id, zamknuto_uzivatel_id 
          FROM 25a_pokladni_knihy WHERE id = ?";

// 2. Zkontrolovat oprávnění
$hasManage = hasPermission($user, 'CASH_BOOK_MANAGE');
$isOwner = ($book['uzivatel_id'] == $user['id']);

// 3. Validovat přechod podle pravidel
// 4. UPDATE
// 5. Audit log
```

---

### **4. Rozšíření existujících endpointů** 🟡 STŘEDNÍ PRIORITA

#### **cashbook-list.php**
**PŘIDAT do SELECT:**
```sql
pk.stav_uzamceni,
pk.zamknuto_uzivatel_id,
pk.zamknuto_datum
```

#### **cashbook-detail.php**
**PŘIDAT stejné sloupce jako u list**

#### **cashbook-assignments-list.php**
**PŘIDAT parametr:**
```php
$includeExpired = $_POST['include_expired'] ?? false;

if (!$includeExpired) {
    $where .= " AND (ppu.platne_do IS NULL OR ppu.platne_do >= CURDATE())";
}
```

---

### **5. Kontroly oprávnění v CRUD** 🔴 PRIORITA

#### **cashbook-entry-create.php**
**PŘIDAT před INSERT:**
```php
// 1. Načíst knihu
$query = "SELECT stav_uzamceni, uzivatel_id FROM 25a_pokladni_knihy WHERE id = ?";
$book = ...;

// 2. Kontrola uzamčení
if ($book['stav_uzamceni'] === 'locked') {
    if (!hasPermission($user, 'CASH_BOOK_MANAGE')) {
        return error('Kniha je zamknuta správcem');
    }
}

if ($book['stav_uzamceni'] === 'closed') {
    $isOwner = ($book['uzivatel_id'] === $user['id']);
    $hasManage = hasPermission($user, 'CASH_BOOK_MANAGE');
    if (!$isOwner && !$hasManage) {
        return error('Kniha je uzavřena');
    }
}

// 3. Kontrola EDIT oprávnění
$isOwner = ($book['uzivatel_id'] === $user['id']);
$canEditOwn = hasPermission($user, 'CASH_BOOK_EDIT_OWN');
$canEditAll = hasPermission($user, 'CASH_BOOK_EDIT_ALL');
$canManage = hasPermission($user, 'CASH_BOOK_MANAGE');

if (!$canManage && !$canEditAll && !($canEditOwn && $isOwner)) {
    return error('Nemáte oprávnění k editaci');
}
```

#### **cashbook-entry-update.php**
**Stejná kontrola jako u create**

#### **cashbook-entry-delete.php**
**Kontrola DELETE oprávnění:**
```php
$canDeleteOwn = hasPermission($user, 'CASH_BOOK_DELETE_OWN');
$canDeleteAll = hasPermission($user, 'CASH_BOOK_DELETE_ALL');
$canManage = hasPermission($user, 'CASH_BOOK_MANAGE');

if (!$canManage && !$canDeleteAll && !($canDeleteOwn && $isOwner)) {
    return error('Nemáte oprávnění k mazání');
}
```

---

### **6. Helper funkce** 🟡 STŘEDNÍ PRIORITA

**Soubor:** `/api.eeo/includes/helpers.php` (nebo podobný)

```php
/**
 * ⚠️ POZOR: Sloupec v DB je 'kod_prava' (ne 'kod_opravneni')
 */
function hasPermission($user, $permissionCode) {
    if (!isset($user['permissions']) || !is_array($user['permissions'])) {
        return false;
    }
    
    foreach ($user['permissions'] as $perm) {
        if ($perm['kod_prava'] === $permissionCode) {
            return true;
        }
    }
    
    return false;
}

function hasAnyPermission($user, $permissionCodes) {
    foreach ($permissionCodes as $code) {
        if (hasPermission($user, $code)) {
            return true;
        }
    }
    return false;
}

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

## 📊 SHRNUTÍ STRUKTURY

### **Tabulky:**
- `25_prava` - oprávnění (✅ naplněno)
- `25a_pokladni_knihy` - knihy (⏳ čeká na stav_uzamceni sloupce)
- `25a_pokladni_polozky` - položky v knihách
- `25a_pokladny` - definice pokladen
- `25a_pokladny_uzivatele` - přiřazení uživatelů k pokladnám
- `25a_pokladni_audit` - audit log změn
- `zamestnanci` - uživatelé

### **Hierarchie oprávnění:**
```
CASH_BOOK_MANAGE (úroveň 3)
  ├─ Zahrnuje všechna _ALL oprávnění
  │
  └─ CASH_BOOK_*_ALL (úroveň 2)
      ├─ READ_ALL
      ├─ EDIT_ALL
      ├─ DELETE_ALL
      └─ EXPORT_ALL
      │
      └─ Zahrnuje odpovídající _OWN oprávnění
          │
          └─ CASH_BOOK_*_OWN (úroveň 1)
              ├─ READ_OWN
              ├─ EDIT_OWN
              ├─ DELETE_OWN
              └─ EXPORT_OWN
```

### **Stavy uzamčení:**
```
open (výchozí)
  ├─ Může editovat: vlastník (s EDIT_OWN) nebo kdokoliv s EDIT_ALL/MANAGE
  ├─ Může uzavřít: vlastník nebo MANAGE
  └─ Může zamknout: jen MANAGE

closed (uzavřená uživatelem)
  ├─ Může editovat: vlastník nebo MANAGE
  ├─ Může otevřít: vlastník (pokud on uzavřel) nebo MANAGE
  └─ Může zamknout: jen MANAGE

locked (zamknuta správcem)
  ├─ Může editovat: jen MANAGE
  ├─ Může odemknout: jen MANAGE
  └─ Nelze změnit na closed (jen na open nebo zůstat locked)
```

---

## 🧪 TESTOVACÍ SCÉNÁŘE

### **Test 1: Načíst všechny pokladny (admin)**
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-assignments-all \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@zachranka.cz", "token": "..."}'

# Očekáváno: status: success, data: array všech pokladen
```

### **Test 2: Načíst všechny pokladny (user bez oprávnění)**
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-assignments-all \
  -H "Content-Type: application/json" \
  -d '{"username": "user@zachranka.cz", "token": "..."}'

# Očekáváno: status: error, message: "Nemáte oprávnění..."
```

### **Test 3: Uzavřít vlastní knihu**
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-change-lock-status \
  -H "Content-Type: application/json" \
  -d '{"username": "user@zachranka.cz", "token": "...", "book_id": 5, "new_status": "closed"}'

# Očekáváno: status: success
```

### **Test 4: Zamknout knihu (user bez MANAGE)**
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-change-lock-status \
  -H "Content-Type: application/json" \
  -d '{"username": "user@zachranka.cz", "token": "...", "book_id": 5, "new_status": "locked"}'

# Očekáváno: status: error, message: "Zamknout může jen správce..."
```

### **Test 5: Editovat zamknutou knihu (user)**
```bash
curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-entry-create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@zachranka.cz",
    "token": "...",
    "book_id": 5,
    "datum_zapisu": "2025-11-09",
    "obsah_zapisu": "Test",
    "castka_prijem": 100
  }'

# Očekáváno (pokud kniha locked): status: error, message: "Kniha je zamknuta..."
```

---

## 📝 POZNÁMKY PRO IMPLEMENTACI

1. **Důležité názvy:**
   - Databáze: `evidence_smluv` (ne `zzs_eeo`)
   - Tabulka oprávnění: `25_prava` (ne `opravneni`)
   - Sloupec oprávnění: `kod_prava` (ne `kod_opravneni`)

2. **Response formát:**
   - Konzistentní struktura: `{status: "success"/"error", message: "...", data: {...}}`
   - Chybové zprávy česky a user-friendly

3. **Permissions pole:**
   - User objekt musí obsahovat pole `permissions` s objekty `{kod_prava: "..."}`
   - Frontend očekává toto pole pro kontroly oprávnění

4. **Audit log:**
   - Všechny změny stavu uzamčení logovat do `25a_pokladni_audit`
   - Format: `{typ_entity: "kniha", entita_id: 5, akce: "change_lock_status", ...}`

5. **Zpětná kompatibilita:**
   - Pokud `stav_uzamceni` je NULL → považovat za 'open'
   - Existující kód nesmí přestat fungovat

---

## 📌 SOUBORY K DISPOZICI

- ✅ `add_cashbook_permissions_v2.sql` - SQL migrace oprávnění (hotovo)
- ⏳ `add_lock_status_to_cashbooks.sql` - SQL migrace lock status (připraveno)
- 📄 `BACKEND-TODO-COMPLETE.md` - Kompletní TODO checklist
- 📄 `CASHBOOK-PERMISSIONS-AND-LOCK-STATUS.md` - Kompletní dokumentace (521 řádků)
- 📄 `BACKEND-CASHBOX-ASSIGNMENTS-ALL-API.php` - PHP template pro assignments-all
- 📄 `BACKEND-CASHBOOK-CHANGE-LOCK-STATUS-API.php` - PHP template pro lock status

---

**✅ Frontend je připraven!**  
**⏳ Backend čeká na implementaci!**

Pokud máte otázky nebo potřebujete další upřesnění, kontaktujte frontend tým.

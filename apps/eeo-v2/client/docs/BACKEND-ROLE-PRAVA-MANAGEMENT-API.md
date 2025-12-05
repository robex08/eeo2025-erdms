# Backend API - Správa práv rolí

**Datum:** 17. 11. 2025  
**Status:** ✅ BACKEND HOTOVO - Testování  
**Priorita:** VYSOKÁ

## ✅ Implementováno na backendu

- ✅ `POST /api.eeo/ciselniky/role/assign-pravo` - Handler implementován
- ✅ `POST /api.eeo/ciselniky/role/remove-pravo` - Handler implementován
- ✅ Routing přidán do `api.php`
- ✅ Bezpečnostní kontroly (token, validace)
- ✅ Ochrana proti duplicitám
- ✅ SQL skript na opravu duplicit připraven

## Problém

Frontend volá 2 endpointy pro správu přiřazování práv k rolím, které **neexistují** na backendu:

1. ❌ `POST /api.eeo/ciselniky/role/assign-pravo` - 404
2. ❌ `POST /api.eeo/ciselniky/role/remove-pravo` - 404

## Chyba v databázi

V tabulce `25_role_prava` jsou **duplicitní záznamy**:

```sql
-- Příklad duplicit (role_id=1, Administrátor má právo ID 39 duplicitně)
SELECT role_id, pravo_id, COUNT(*) as pocet
FROM 25_role_prava
WHERE user_id = -1
GROUP BY role_id, pravo_id
HAVING pocet > 1;
```

**Výsledky:**
- **Administrátor** (role_id=1): 1 duplicita
- **Hlavní účetní** (role_id=?): 5 duplicit
- **Příkazce operace** (role_id=?): 4 duplicity
- **Rozpočtář** (role_id=?): 5 duplicit
- **Správce rozpočtu** (role_id=?): 2 duplicity

### Oprava duplicit v DB

```sql
-- 1. Najdi duplicity
SELECT role_id, pravo_id, COUNT(*) as count
FROM 25_role_prava
WHERE user_id = -1
GROUP BY role_id, pravo_id
HAVING count > 1;

-- 2. Smaž duplicity (ponechej pouze 1 záznam)
DELETE t1 FROM 25_role_prava t1
INNER JOIN 25_role_prava t2 
WHERE 
    t1.role_id = t2.role_id 
    AND t1.pravo_id = t2.pravo_id 
    AND t1.user_id = -1 
    AND t2.user_id = -1
    AND t1.id > t2.id;

-- 3. Přidej UNIQUE constraint
ALTER TABLE 25_role_prava
ADD UNIQUE KEY unique_role_pravo (role_id, pravo_id, user_id);
```

## DŮLEŽITÉ: Struktura tabulky `25_role_prava`

Tabulka je **polymorfní** a slouží pro 2 účely:

1. **Práva ROLÍ** (globální):
   - `user_id = -1` (nebo `0`) ← označuje že jde o roli
   - `role_id > 0` ← ID konkrétní role
   - Definuje, která práva má daná role

2. **Práva UŽIVATELŮ** (individuální override):
   - `role_id = -1` (nebo `0`) ← označuje že jde o uživatele
   - `user_id > 0` ← ID konkrétního uživatele
   - Definuje specifická práva pro konkrétního uživatele (přepíše práva z role)

### Příklady záznamů v DB:

```
user_id | role_id | pravo_id | aktivni | Význam
--------|---------|----------|---------|------------------------------------------
   -1   |    1    |    35    |    1    | Role "Administrátor" má právo CASH_BOOK_CREATE
   -1   |    2    |    10    |    1    | Role "Vedoucí" má právo ORDER_APPROVE
    5   |   -1    |    35    |    1    | Uživatel #5 má individuální právo CASH_BOOK_CREATE
   12   |    0    |    40    |    0    | Uživatel #12 NEMÁ právo CASH_BOOK_READ_OWN
```

⚠️ **KRITICKÉ:** Při úpravách práv rolí (user_id = -1/0) **NESMÍME** mazat ani měnit záznamy s `role_id = -1/0` (individuální uživatelská práva)!

## Přístup k aktualizaci práv

### ❌ NEDOPORUČENÝ: Batch replace (smazat vše + přidat nové)

```sql
-- ŠPATNĚ: Tohle by smazalo i uživatelská práva!
DELETE FROM 25_role_prava WHERE role_id = ?;
INSERT INTO 25_role_prava VALUES (...);
```

**Problémy:**
- Smaže i záznamy s `role_id = -1/0` (individuální uživatelská práva!)
- Ztráta dat
- Zbytečně komplexní logika na FE (musí poslat všechna práva)

### ✅ DOPORUČENÝ: Inkrementální update (přidat/odebrat jednotlivě)

```sql
-- SPRÁVNĚ: Pracuj pouze s právy role (user_id = -1 nebo 0)
INSERT INTO 25_role_prava WHERE role_id = ? AND pravo_id = ? AND user_id = -1;
DELETE FROM 25_role_prava WHERE role_id = ? AND pravo_id = ? AND user_id = -1;
```

**Výhody:**
- Bezpečné - nedotýká se uživatelských práv (role_id = -1/0)
- Jednodušší FE logika (klikneš "Přidat" → 1 request)
- Atomické operace
- Lepší audit trail

## Požadované API endpointy

### 1. Přiřadit právo k roli

**Endpoint:** `POST /api.eeo/ciselniky/role/assign-pravo`

**Request:**
```json
{
  "username": "string",
  "token": "string",
  "role_id": "1",
  "pravo_id": "35"
}
```

**Response (úspěch):**
```json
{
  "status": "success",
  "message": "Právo bylo přiřazeno k roli"
}
```

**Response (chyba):**
```json
{
  "status": "error",
  "message": "Právo již je přiřazeno k této roli"
}
```

**SQL:**
```sql
-- Kontrola duplicity (POUZE pro roli, ne pro uživatele)
SELECT COUNT(*) as count
FROM 25_role_prava
WHERE role_id = ? AND pravo_id = ? AND (user_id = -1 OR user_id = 0);

-- Insert pouze pokud neexistuje (nastavíme user_id = -1 pro globální práva role)
INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
SELECT -1, ?, ?, 1
WHERE NOT EXISTS (
    SELECT 1 FROM 25_role_prava
    WHERE role_id = ? AND pravo_id = ? AND (user_id = -1 OR user_id = 0)
);
```

**PHP implementace:**
```php
<?php
// api.eeo/ciselniky/role/assign-pravo.php

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

// Validace
$token = $_POST['token'] ?? '';
$username = $_POST['username'] ?? '';
$role_id = $_POST['role_id'] ?? '';
$pravo_id = $_POST['pravo_id'] ?? '';

if (!validate_token($token, $username)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Neplatný token nebo uživatel'
    ]);
    exit;
}

// Kontrola práv
if (!has_permission($username, 'DICT_MANAGE')) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Nemáte oprávnění spravovat práva rolí'
    ]);
    exit;
}

// Validace vstupů
if (empty($role_id) || empty($pravo_id)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Chybí povinné parametry'
    ]);
    exit;
}

try {
    // Kontrola zda vazba již neexistuje
    $stmt = $conn->prepare("
        SELECT COUNT(*) as count
        FROM 25_role_prava
        WHERE role_id = ? AND pravo_id = ? AND user_id = -1
    ");
    $stmt->bind_param("ii", $role_id, $pravo_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['count'] > 0) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Právo již je přiřazeno k této roli'
        ]);
        exit;
    }
    
    // Přiřazení práva k roli
    $stmt = $conn->prepare("
        INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
        VALUES (-1, ?, ?, 1)
    ");
    $stmt->bind_param("ii", $role_id, $pravo_id);
    
    if ($stmt->execute()) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Právo bylo přiřazeno k roli'
        ]);
    } else {
        throw new Exception('Chyba při ukládání do databáze');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Chyba: ' . $e->getMessage()
    ]);
}
?>
```

### 2. Odebrat právo z role

**Endpoint:** `POST /api.eeo/ciselniky/role/remove-pravo`

**Request:**
```json
{
  "username": "string",
  "token": "string",
  "role_id": "1",
  "pravo_id": "35"
}
```

**Response (úspěch):**
```json
{
  "status": "success",
  "message": "Právo bylo odebráno z role"
}
```

**SQL:**
```sql
-- KRITICKÉ: Smazat POUZE globální práva role, NIKDY ne uživatelská práva (user_id > 0)
DELETE FROM 25_role_prava
WHERE role_id = ? 
  AND pravo_id = ? 
  AND (user_id = -1 OR user_id = 0);
```

**PHP implementace:**
```php
<?php
// api.eeo/ciselniky/role/remove-pravo.php

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

// Validace
$token = $_POST['token'] ?? '';
$username = $_POST['username'] ?? '';
$role_id = $_POST['role_id'] ?? '';
$pravo_id = $_POST['pravo_id'] ?? '';

if (!validate_token($token, $username)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Neplatný token nebo uživatel'
    ]);
    exit;
}

// Kontrola práv
if (!has_permission($username, 'DICT_MANAGE')) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Nemáte oprávnění spravovat práva rolí'
    ]);
    exit;
}

// Validace vstupů
if (empty($role_id) || empty($pravo_id)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Chybí povinné parametry'
    ]);
    exit;
}

try {
    $stmt = $conn->prepare("
        DELETE FROM 25_role_prava
        WHERE role_id = ? AND pravo_id = ? AND user_id = -1
    ");
    $stmt->bind_param("ii", $role_id, $pravo_id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode([
                'status' => 'success',
                'message' => 'Právo bylo odebráno z role'
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Právo nebylo přiřazeno k této roli'
            ]);
        }
    } else {
        throw new Exception('Chyba při mazání z databáze');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Chyba: ' . $e->getMessage()
    ]);
}
?>
```

## Struktura tabulky

```sql
CREATE TABLE `25_role_prava` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL DEFAULT '-1' COMMENT '-1 = globální nastavení',
  `role_id` int(11) NOT NULL,
  `pravo_id` int(11) NOT NULL,
  `aktivni` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_pravo` (`role_id`, `pravo_id`, `user_id`),
  KEY `role_id` (`role_id`),
  KEY `pravo_id` (`pravo_id`),
  CONSTRAINT `fk_role_prava_role` FOREIGN KEY (`role_id`) REFERENCES `25_role` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_prava_pravo` FOREIGN KEY (`pravo_id`) REFERENCES `25_prava` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
```

## Frontend implementace

Frontend kód je **připraven a čeká** na backend endpointy:

- ✅ `src/services/apiv2Dictionaries.js` - API volání
- ✅ `src/components/dictionaries/tabs/RoleTab.js` - UI komponenta
- ✅ Deduplikace dat (FE workaround pro BE duplicity)

## Testování

Po implementaci otestujte:

1. **Přiřazení práva k roli**
   - Vyber roli "Administrátor"
   - Klikni "Správa práv"
   - Přidej právo z dostupných
   - ✅ Právo se přesune do přiřazených

2. **Odebrání práva z role**
   - Vyber roli s právy
   - Klikni "Správa práv"
   - Odeber právo z přiřazených
   - ✅ Právo se přesune do dostupných

3. **Ochrana proti duplicitám**
   - Zkus přidat stejné právo 2x
   - ✅ Měla by se zobrazit chyba

## Alternativa: Batch update (pokud opravdu chceš)

### 3. Nastavit všechna práva role najednou

**Endpoint:** `POST /api.eeo/ciselniky/role/set-all-prava`

**Request:**
```json
{
  "username": "string",
  "token": "string",
  "role_id": "1",
  "pravo_ids": [1, 2, 3, 5, 10, 35, 40]
}
```

**SQL:**
```sql
-- KROK 1: Smaž POUZE práva role (ne uživatelská práva kde role_id = -1/0!)
DELETE FROM 25_role_prava 
WHERE role_id = ? 
  AND role_id > 0  -- ochrana: pouze práva rolí
  AND (user_id = -1 OR user_id = 0);  -- jen globální, ne konkrétní uživatele

-- KROK 2: Přidej nová práva
INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
VALUES 
  (-1, ?, 1, 1),
  (-1, ?, 2, 1),
  (-1, ?, 3, 1),
  ... -- všechna pravo_ids
;
```

**⚠️ Nevýhody:**
- FE musí poslat celý seznam práv (i nezměněná)
- Komplexnější request payload
- Horší UX (nelze rychle přidat/odebrat jedno právo)

**✅ Výhody:**
- Atomická operace
- Žádné race conditions
- Jednodušší BE logika

## Checklist

- [ ] Opravit duplicity v DB (SQL výše)
- [ ] Přidat UNIQUE constraint
- [ ] Implementovat `assign-pravo.php` ✅ DOPORUČENO
- [ ] Implementovat `remove-pravo.php` ✅ DOPORUČENO
- [ ] NEBO implementovat `set-all-prava.php` (batch varianta)
- [ ] Otestovat přidávání práv
- [ ] Otestovat odebírání práv
- [ ] Otestovat ochranu proti duplicitám
- [ ] Otestovat oprávnění (DICT_MANAGE)
- [ ] Ověřit že se nemažou uživatelská práva (`role_id = -1` nebo `role_id = 0`)

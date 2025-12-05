# Backend API - Hromadné operace s právy role

**Datum:** 17. 11. 2025  
**Status:** 🔴 NÁVRH - ČEKÁ NA IMPLEMENTACI  
**Priorita:** VYSOKÁ (UX improvement)

## Účel

Endpoint pro **hromadné přidání a odebrání práv k roli** v jedné transakci. Umožňuje uživateli provést více změn najednou místo jednotlivých API callů.

## Výhody

✅ **Rychlejší UX** - uživatel může přidat/odebrat více práv najednou  
✅ **Méně API callů** - jedna transakce místo N jednotlivých requestů  
✅ **Atomická operace** - buď se provede vše, nebo nic  
✅ **Nižší zátěž BE** - jeden INSERT/DELETE statement s více hodnotami

## Endpoint

### Hromadná aktualizace práv role

**Endpoint:** `POST /api.eeo/ciselniky/role/bulk-update-prava`

**Request:**
```json
{
  "username": "admin",
  "token": "xxx",
  "role_id": 2,
  "prava_to_add": [35, 39, 42, 43],
  "prava_to_remove": [10, 15]
}
```

**Parametry:**
- `role_id` (int, required) - ID role
- `prava_to_add` (array<int>, optional) - Pole ID práv k přidání (default: [])
- `prava_to_remove` (array<int>, optional) - Pole ID práv k odebrání (default: [])

**Response (úspěch):**
```json
{
  "status": "ok",
  "message": "Práva byla úspěšně aktualizována",
  "added_count": 4,
  "removed_count": 2,
  "details": {
    "added": [
      {"pravo_id": 35, "kod_prava": "CASH_BOOK_MANAGE"},
      {"pravo_id": 39, "kod_prava": "ORDER_APPROVE"},
      {"pravo_id": 42, "kod_prava": "USER_MANAGE"},
      {"pravo_id": 43, "kod_prava": "DICT_MANAGE"}
    ],
    "removed": [
      {"pravo_id": 10, "kod_prava": "ORDER_VIEW"},
      {"pravo_id": 15, "kod_prava": "CASH_BOOK_VIEW"}
    ]
  }
}
```

**Response (chyba):**
```json
{
  "status": "error",
  "message": "Chybný formát dat nebo práva neexistují"
}
```

## Implementační poznámky pro BE

### SQL operace

**1. Přidání práv (INSERT):**
```sql
INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni)
VALUES 
  (-1, 2, 35, 1),
  (-1, 2, 39, 1),
  (-1, 2, 42, 1),
  (-1, 2, 43, 1)
ON DUPLICATE KEY UPDATE aktivni = 1;
```

**2. Odebrání práv (DELETE):**
```sql
DELETE FROM 25_role_prava 
WHERE user_id = -1 
  AND role_id = 2 
  AND pravo_id IN (10, 15);
```

### Validace

1. ✅ Zkontroluj, že `role_id` existuje v tabulce `25_role`
2. ✅ Zkontroluj, že všechna `pravo_id` existují v tabulce `25_prava_globalni`
3. ✅ Ošetři prázdná pole (pokud oba parametry prázdné, vrátit OK bez změn)
4. ⚠️ **KRITICKÉ**: Pracuj POUZE se záznamy kde `user_id = -1` (role práva, NE uživatelská práva!)

### Transakce

Operace by měla být atomická:
```php
$conn->begin_transaction();
try {
    // 1. Přidat nová práva
    if (!empty($prava_to_add)) {
        // INSERT query
    }
    
    // 2. Odebrat práva
    if (!empty($prava_to_remove)) {
        // DELETE query
    }
    
    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    return error_response($e->getMessage());
}
```

### Ukázkový PHP kód (PHP 5.6)

```php
<?php
// POST /api.eeo/ciselniky/role/bulk-update-prava

$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$token = isset($_POST['token']) ? trim($_POST['token']) : '';
$role_id = isset($_POST['role_id']) ? (int)$_POST['role_id'] : 0;
$prava_to_add = isset($_POST['prava_to_add']) ? $_POST['prava_to_add'] : array();
$prava_to_remove = isset($_POST['prava_to_remove']) ? $_POST['prava_to_remove'] : array();

// Validace
if (!auth_check($username, $token)) {
    die(json_encode(array('status' => 'error', 'message' => 'Neplatné přihlášení')));
}

if ($role_id <= 0) {
    die(json_encode(array('status' => 'error', 'message' => 'Neplatné role_id')));
}

// Ověř, že role existuje
$sql_check = "SELECT id FROM 25_role WHERE id = " . $role_id;
$result = $conn->query($sql_check);
if ($result->num_rows === 0) {
    die(json_encode(array('status' => 'error', 'message' => 'Role neexistuje')));
}

// Začni transakci
$conn->begin_transaction();

$added_count = 0;
$removed_count = 0;
$added_details = array();
$removed_details = array();

try {
    // === PŘIDÁNÍ PRÁV ===
    if (!empty($prava_to_add)) {
        $values = array();
        foreach ($prava_to_add as $pravo_id) {
            $pravo_id = (int)$pravo_id;
            $values[] = "(-1, " . $role_id . ", " . $pravo_id . ", 1)";
        }
        
        if (!empty($values)) {
            $sql_insert = "INSERT INTO 25_role_prava (user_id, role_id, pravo_id, aktivni) 
                          VALUES " . implode(", ", $values) . "
                          ON DUPLICATE KEY UPDATE aktivni = 1";
            $conn->query($sql_insert);
            $added_count = count($prava_to_add);
            
            // Získej detaily přidaných práv
            $ids = implode(",", array_map('intval', $prava_to_add));
            $sql_details = "SELECT id, kod_prava FROM 25_prava_globalni WHERE id IN ($ids)";
            $result = $conn->query($sql_details);
            while ($row = $result->fetch_assoc()) {
                $added_details[] = array(
                    'pravo_id' => (int)$row['id'],
                    'kod_prava' => $row['kod_prava']
                );
            }
        }
    }
    
    // === ODEBRÁNÍ PRÁV ===
    if (!empty($prava_to_remove)) {
        $ids = implode(",", array_map('intval', $prava_to_remove));
        
        // Nejdřív získej detaily
        $sql_details = "SELECT id, kod_prava FROM 25_prava_globalni WHERE id IN ($ids)";
        $result = $conn->query($sql_details);
        while ($row = $result->fetch_assoc()) {
            $removed_details[] = array(
                'pravo_id' => (int)$row['id'],
                'kod_prava' => $row['kod_prava']
            );
        }
        
        // Pak smaž
        $sql_delete = "DELETE FROM 25_role_prava 
                      WHERE user_id = -1 
                        AND role_id = " . $role_id . " 
                        AND pravo_id IN ($ids)";
        $conn->query($sql_delete);
        $removed_count = $conn->affected_rows;
    }
    
    $conn->commit();
    
    // Úspěch
    echo json_encode(array(
        'status' => 'ok',
        'message' => 'Práva byla úspěšně aktualizována',
        'added_count' => $added_count,
        'removed_count' => $removed_count,
        'details' => array(
            'added' => $added_details,
            'removed' => $removed_details
        )
    ));
    
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(array(
        'status' => 'error',
        'message' => 'Chyba při aktualizaci práv: ' . $e->getMessage()
    ));
}
?>
```

## Frontend implementace

```javascript
// API call
export async function bulkUpdateRolePrava({ token, username, role_id, prava_to_add = [], prava_to_remove = [] }) {
  try {
    const response = await api.post('ciselniky/role/bulk-update-prava', {
      username,
      token,
      role_id: parseInt(role_id, 10),
      prava_to_add: prava_to_add.map(id => parseInt(id, 10)),
      prava_to_remove: prava_to_remove.map(id => parseInt(id, 10))
    });

    return checkResponse(response, 'Práva byla aktualizována');
  } catch (error) {
    handleApiError(error, 'Chyba při hromadné aktualizaci práv');
    throw error;
  }
}
```

## Testovací scénáře

### Test 1: Přidat více práv
```json
{
  "role_id": 2,
  "prava_to_add": [35, 39, 42],
  "prava_to_remove": []
}
```
**Očekáváno:** added_count: 3, removed_count: 0

### Test 2: Odebrat více práv
```json
{
  "role_id": 2,
  "prava_to_add": [],
  "prava_to_remove": [10, 15, 20]
}
```
**Očekáváno:** added_count: 0, removed_count: 3

### Test 3: Kombinace
```json
{
  "role_id": 2,
  "prava_to_add": [35, 39],
  "prava_to_remove": [10]
}
```
**Očekáváno:** added_count: 2, removed_count: 1

### Test 4: Prázdný request
```json
{
  "role_id": 2,
  "prava_to_add": [],
  "prava_to_remove": []
}
```
**Očekáváno:** status: "ok", added_count: 0, removed_count: 0

### Test 5: Duplicita (přidat právo, které už existuje)
```json
{
  "role_id": 2,
  "prava_to_add": [35],  // už existuje
  "prava_to_remove": []
}
```
**Očekáváno:** status: "ok" (ON DUPLICATE KEY UPDATE), added_count: 1

## Migrace z jednotlivých endpointů

Stávající endpointy `assign-pravo` a `remove-pravo` **zůstávají** pro zpětnou kompatibilitu, ale nový UI použije `bulk-update-prava`.

---

**Pro BE tým:** Implementujte tento endpoint a dejte vědět, až bude hotový. Frontend je připravený!

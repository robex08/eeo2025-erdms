# Backend API - Čištění duplicit v právech rolí

**Datum:** 17. 11. 2025  
**Status:** 🔴 NÁVRH - ČEKÁ NA IMPLEMENTACI  
**Priorita:** STŘEDNÍ (jednorázová akce)  
**Riziko:** ⚠️ VYSOKÉ - Mění data v DB!

## Účel

Jednorázový endpoint pro **automatické odstranění duplicitních přiřazení práv k rolím** v tabulce `25_role_prava`.

⚠️ **KRITICKÉ UPOZORNĚNÍ:**
- Tento endpoint **mění data v databázi**
- Spustí se **jednorázově** pro vyčištění existujících duplicit
- Po vyčištění se přidá UNIQUE constraint, aby se duplicity nemohly opakovat
- **NESMÍ** mazat práva přiřazená uživatelům (user_id > 0)!

## Co je duplicita?

### ✅ DUPLICITA (smazat):

```
id | user_id | role_id | pravo_id | aktivni | Problém
---|---------|---------|----------|---------|--------------------------------
1  |   -1    |    1    |    35    |    1    | Role 1 má právo 35
8  |   -1    |    1    |    35    |    1    | ← DUPLICITA! Stejná role, stejné právo
```

### ❌ NENÍ DUPLICITA (zachovat):

```
id | user_id | role_id | pravo_id | aktivni | Důvod
---|---------|---------|----------|---------|--------------------------------
1  |   -1    |    1    |    35    |    1    | Role 1 má právo 35
5  |    7    |   -1    |    35    |    1    | ← OK! Uživatel 7 má právo 35 (jiný scope)
```

**Pravidlo:** Duplicita je pouze pokud se shoduje **kombinace** `(user_id, role_id, pravo_id)`.

## Endpoint

### Promazat duplicity v právech rolí

**Endpoint:** `POST /api.eeo/ciselniky/role/cleanup-duplicates`

**Request:**
```json
{
  "username": "admin",
  "token": "xxx",
  "confirm_cleanup": true,
  "dry_run": false
}
```

**Parametry:**
- `confirm_cleanup` (boolean, required) - Musí být `true`, jinak endpoint odmítne operaci
- `dry_run` (boolean, optional) - Pokud `true`, pouze vrátí počet duplicit bez mazání

**Response (dry_run = true):**
```json
{
  "status": "success",
  "dry_run": true,
  "message": "Náhled duplicit (data nebyla změněna)",
  "duplicates_found": 17,
  "details": [
    {
      "user_id": -1,
      "role_id": 1,
      "pravo_id": 39,
      "count": 2,
      "role_nazev": "Administrátor",
      "pravo_kod": "CASH_BOOK_MANAGE"
    },
    {
      "user_id": -1,
      "role_id": 5,
      "pravo_id": 10,
      "count": 5,
      "role_nazev": "Hlavní účetní",
      "pravo_kod": "ORDER_APPROVE"
    }
  ]
}
```

**Response (úspěch):**
```json
{
  "status": "success",
  "message": "Duplicity byly úspěšně odstraněny",
  "deleted_count": 17,
  "affected_roles": [
    {"role_id": 1, "nazev": "Administrátor", "duplicates": 1},
    {"role_id": 5, "nazev": "Hlavní účetní", "duplicates": 5},
    {"role_id": 7, "nazev": "Příkazce operace", "duplicates": 4}
  ]
}
```

**Response (chyba):**
```json
{
  "status": "error",
  "message": "Musíte potvrdit operaci nastavením confirm_cleanup = true"
}
```

## SQL implementace

### Krok 1: Najít duplicity

```sql
-- Najdi všechny duplicitní záznamy v právech ROLÍ
SELECT 
    rp.user_id,
    rp.role_id,
    rp.pravo_id,
    COUNT(*) as pocet,
    r.nazev_role,
    p.kod_prava,
    GROUP_CONCAT(rp.id ORDER BY rp.id) as duplicate_ids
FROM 25_role_prava rp
LEFT JOIN 25_role r ON rp.role_id = r.id
LEFT JOIN 25_prava p ON rp.pravo_id = p.id
WHERE rp.user_id IN (-1, 0)  -- POUZE práva rolí, ne uživatelů!
  AND rp.role_id > 0          -- Musí být validní role
GROUP BY rp.user_id, rp.role_id, rp.pravo_id
HAVING pocet > 1
ORDER BY pocet DESC, rp.role_id;
```

### Krok 2: Smazat duplicity (ponechat nejstarší záznam)

```sql
-- Varianta 1: Pomocí self-join (ponechej nejmenší ID)
DELETE rp1 
FROM 25_role_prava rp1
INNER JOIN 25_role_prava rp2 
ON rp1.user_id = rp2.user_id 
   AND rp1.role_id = rp2.role_id 
   AND rp1.pravo_id = rp2.pravo_id
   AND rp1.id > rp2.id  -- Smaž vyšší ID (novější záznamy)
WHERE rp1.user_id IN (-1, 0)  -- KRITICKÉ: Pouze práva rolí!
  AND rp1.role_id > 0;         -- KRITICKÉ: Ne uživatelská práva!

-- Varianta 2: Pomocí NOT IN (bezpečnější)
DELETE FROM 25_role_prava
WHERE id NOT IN (
    -- Ponechej pouze nejstarší (nejmenší ID) z každé skupiny
    SELECT MIN(id) 
    FROM 25_role_prava
    WHERE user_id IN (-1, 0)
      AND role_id > 0
    GROUP BY user_id, role_id, pravo_id
)
AND user_id IN (-1, 0)  -- KRITICKÉ: Pouze práva rolí!
AND role_id > 0;         -- KRITICKÉ: Ne uživatelská práva!
```

### Krok 3: Přidat UNIQUE constraint (zamezí budoucím duplicitám)

```sql
-- Přidej UNIQUE index - kombinace (user_id, role_id, pravo_id) musí být unikátní
ALTER TABLE 25_role_prava
ADD UNIQUE KEY unique_user_role_pravo (user_id, role_id, pravo_id);
```

## PHP implementace

```php
<?php
// api.eeo/ciselniky/role/cleanup-duplicates.php

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

// Validace
$token = $_POST['token'] ?? '';
$username = $_POST['username'] ?? '';
$confirm_cleanup = $_POST['confirm_cleanup'] ?? false;
$dry_run = $_POST['dry_run'] ?? false;

// Autorizace
if (!validate_token($token, $username)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Neplatný token nebo uživatel'
    ]);
    exit;
}

// Kontrola práv - pouze DICT_MANAGE nebo admin
if (!has_permission($username, 'DICT_MANAGE')) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Nemáte oprávnění spravovat práva rolí'
    ]);
    exit;
}

// Bezpečnostní kontrola - musí explicitně potvrdit
if (!$dry_run && $confirm_cleanup !== true) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Musíte potvrdit operaci nastavením confirm_cleanup = true'
    ]);
    exit;
}

try {
    $conn->begin_transaction();
    
    // KROK 1: Najdi duplicity
    $findDuplicatesSQL = "
        SELECT 
            rp.user_id,
            rp.role_id,
            rp.pravo_id,
            COUNT(*) as pocet,
            r.nazev_role,
            p.kod_prava,
            GROUP_CONCAT(rp.id ORDER BY rp.id) as duplicate_ids
        FROM 25_role_prava rp
        LEFT JOIN 25_role r ON rp.role_id = r.id
        LEFT JOIN 25_prava p ON rp.pravo_id = p.id
        WHERE rp.user_id IN (-1, 0)
          AND rp.role_id > 0
        GROUP BY rp.user_id, rp.role_id, rp.pravo_id
        HAVING pocet > 1
        ORDER BY pocet DESC, rp.role_id
    ";
    
    $result = $conn->query($findDuplicatesSQL);
    $duplicates = [];
    $totalDuplicates = 0;
    
    while ($row = $result->fetch_assoc()) {
        $duplicates[] = [
            'user_id' => (int)$row['user_id'],
            'role_id' => (int)$row['role_id'],
            'pravo_id' => (int)$row['pravo_id'],
            'count' => (int)$row['pocet'],
            'role_nazev' => $row['nazev_role'],
            'pravo_kod' => $row['kod_prava']
        ];
        $totalDuplicates += ((int)$row['pocet'] - 1); // Počet duplicit = celkem - 1
    }
    
    // Pokud je dry_run, pouze vrať info
    if ($dry_run) {
        echo json_encode([
            'status' => 'success',
            'dry_run' => true,
            'message' => 'Náhled duplicit (data nebyla změněna)',
            'duplicates_found' => $totalDuplicates,
            'details' => $duplicates
        ]);
        exit;
    }
    
    // KROK 2: Smaž duplicity (ponechej nejstarší záznam)
    $deleteDuplicatesSQL = "
        DELETE rp1 
        FROM 25_role_prava rp1
        INNER JOIN 25_role_prava rp2 
        ON rp1.user_id = rp2.user_id 
           AND rp1.role_id = rp2.role_id 
           AND rp1.pravo_id = rp2.pravo_id
           AND rp1.id > rp2.id
        WHERE rp1.user_id IN (-1, 0)
          AND rp1.role_id > 0
    ";
    
    $conn->query($deleteDuplicatesSQL);
    $deletedCount = $conn->affected_rows;
    
    // KROK 3: Přidej UNIQUE constraint (pokud ještě neexistuje)
    $checkConstraintSQL = "
        SELECT COUNT(*) as constraint_exists
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = '25_role_prava'
          AND index_name = 'unique_user_role_pravo'
    ";
    
    $result = $conn->query($checkConstraintSQL);
    $row = $result->fetch_assoc();
    
    if ($row['constraint_exists'] == 0) {
        $addConstraintSQL = "
            ALTER TABLE 25_role_prava
            ADD UNIQUE KEY unique_user_role_pravo (user_id, role_id, pravo_id)
        ";
        $conn->query($addConstraintSQL);
    }
    
    $conn->commit();
    
    // Agreguj výsledky podle rolí
    $affectedRoles = [];
    foreach ($duplicates as $dup) {
        $roleId = $dup['role_id'];
        if (!isset($affectedRoles[$roleId])) {
            $affectedRoles[$roleId] = [
                'role_id' => $roleId,
                'nazev' => $dup['role_nazev'],
                'duplicates' => 0
            ];
        }
        $affectedRoles[$roleId]['duplicates'] += ($dup['count'] - 1);
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Duplicity byly úspěšně odstraněny',
        'deleted_count' => $deletedCount,
        'affected_roles' => array_values($affectedRoles),
        'unique_constraint_added' => ($row['constraint_exists'] == 0)
    ]);
    
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode([
        'status' => 'error',
        'message' => 'Chyba: ' . $e->getMessage()
    ]);
}
?>
```

## Frontend implementace

### Přidat tlačítko do RoleTab

```jsx
// src/components/dictionaries/tabs/RoleTab.js

// V TableActions sekci přidat červené tlačítko
<TableActions>
  <Button onClick={handleCreate}>
    <FontAwesomeIcon icon={faPlus} /> Nová role
  </Button>
  
  {/* NOVÉ TLAČÍTKO */}
  <WarningButton onClick={handleCleanupDuplicates}>
    <FontAwesomeIcon icon={faExclamationTriangle} /> Vyčistit duplicity
  </WarningButton>
</TableActions>

// Styled component
const WarningButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 2px solid #ef4444;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    background: #fee2e2;
    border-color: #dc2626;
  }
`;

// Handler
const handleCleanupDuplicates = async () => {
  // Nejprve dry run - zjisti kolik duplicit
  try {
    const dryRunResult = await apiv2Dictionaries.cleanupRolePravaDuplicates({
      token,
      username,
      confirm_cleanup: true,
      dry_run: true
    });
    
    if (dryRunResult.duplicates_found === 0) {
      showToast?.('Žádné duplicity nebyly nalezeny', { type: 'info' });
      return;
    }
    
    // Zobraz dialog s warningem
    const confirmed = window.confirm(
      `⚠️ VAROVÁNÍ ⚠️\n\n` +
      `Bylo nalezeno ${dryRunResult.duplicates_found} duplicitních záznamů.\n\n` +
      `Tato operace:\n` +
      `• SMAŽE duplicitní přiřazení práv k rolím\n` +
      `• Ponechá pouze 1 záznam z každé duplicity\n` +
      `• NEOVLIVNÍ práva přiřazená uživatelům\n` +
      `• Přidá UNIQUE constraint proti budoucím duplicitám\n\n` +
      `Opravdu chcete pokračovat?`
    );
    
    if (!confirmed) return;
    
    // Proveď cleanup
    const result = await apiv2Dictionaries.cleanupRolePravaDuplicates({
      token,
      username,
      confirm_cleanup: true,
      dry_run: false
    });
    
    showToast?.(
      `Bylo odstraněno ${result.deleted_count} duplicitních záznamů z ${result.affected_roles.length} rolí`,
      { type: 'success' }
    );
    
    // Refresh dat
    invalidateCache('role');
    fetchData();
    
  } catch (error) {
    showToast?.(error.message || 'Chyba při čištění duplicit', { type: 'error' });
  }
};
```

### Přidat API metodu

```javascript
// src/services/apiv2Dictionaries.js

export async function cleanupRolePravaDuplicates({ token, username, confirm_cleanup, dry_run = false }) {
  try {
    const response = await api.post('ciselniky/role/cleanup-duplicates', {
      username,
      token,
      confirm_cleanup,
      dry_run
    });

    const data = checkResponse(response, 'Čištění duplicit');
    return data;
  } catch (error) {
    handleApiError(error, 'Chyba při čištění duplicit');
    throw error;
  }
}
```

## Bezpečnostní opatření

1. **Autorizace:** Pouze uživatelé s právem `DICT_MANAGE`
2. **Explicitní potvrzení:** Parametr `confirm_cleanup = true` musí být uveden
3. **Dry run mode:** Možnost nejprve zkontrolovat, co bude smazáno
4. **Transakce:** Vše v rámci DB transakce (rollback při chybě)
5. **Ochrana dat:** SQL WHERE podmínky zajistí že se nemažou uživatelská práva
6. **Frontend warning:** Dvojité potvrzení před smazáním

## Co se NESMÍ stát

❌ **NIKDY** nesmazat záznamy kde:
- `role_id = -1` nebo `role_id = 0` (uživatelská práva)
- `user_id > 0` (konkrétní uživatel)

✅ **Mazat pouze**:
- `user_id IN (-1, 0)` AND `role_id > 0` (práva rolí)
- A pouze duplicitní záznamy (ponechat 1 z každé skupiny)

## Testování

1. **Dry run test:**
   ```bash
   curl -X POST https://eeo.zachranka.cz/api.eeo/ciselniky/role/cleanup-duplicates \
     -d "username=admin&token=xxx&confirm_cleanup=true&dry_run=true"
   ```

2. **Produkční cleanup:**
   - Klikni na tlačítko "Vyčistit duplicity" v FE
   - Přečti si warning
   - Potvrď operaci
   - Ověř že duplicity zmizely

## Checklist

- [ ] Implementovat BE endpoint `cleanup-duplicates.php`
- [ ] Otestovat dry_run mode
- [ ] Otestovat skutečné mazání duplicit
- [ ] Ověřit že UNIQUE constraint funguje
- [ ] Přidat tlačítko do FE (RoleTab)
- [ ] Otestovat FE flow (dry run → confirm → cleanup)
- [ ] Ověřit že se nemažou uživatelská práva
- [ ] Po úspěšném cleanup **odstranit tlačítko z FE** (již nebude potřeba)

/*
 * 🔒 BACKEND API - CASHBOOK CHANGE LOCK STATUS
 * 
 * Endpoint pro změnu stavu uzamčení pokladní knihy.
 * Podporuje 3 stavy: open, closed, locked
 * 
 * Oprávnění:
 * - UZAVŘÍT svou knihu: vlastník
 * - OTEVŘÍT svou UZAVŘENOU knihu: vlastník nebo MANAGE
 * - ZAMKNOUT jakoukoli knihu: pouze MANAGE
 * - ODEMKNOUT ZAMKNUTOU knihu: pouze MANAGE
 * 
 * @endpoint POST /api.eeo/cashbook-change-lock-status
 * @author BE Team
 * @date 9. listopadu 2025
 */

// =============================================================================
// PARAMETRY REQUESTU
// =============================================================================

/*
{
  "username": "jan.novak@zachranka.cz",
  "token": "abc123...",
  "book_id": 5,                    // ID pokladní knihy
  "new_status": "closed"           // open | closed | locked
}
*/

// =============================================================================
// PHP IMPLEMENTACE
// =============================================================================

/*
<?php
// Endpoint: cashbook-change-lock-status

// 1. Kontrola autentizace
$username = $_POST['username'] ?? null;
$token = $_POST['token'] ?? null;
$bookId = $_POST['book_id'] ?? null;
$newStatus = $_POST['new_status'] ?? null;

if (!$username || !$token) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Chybí autentizační údaje'
    ]);
    exit;
}

if (!$bookId || !$newStatus) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Chybí povinné parametry (book_id, new_status)'
    ]);
    exit;
}

// Validace nového stavu
$allowedStatuses = ['open', 'closed', 'locked'];
if (!in_array($newStatus, $allowedStatuses)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Neplatný stav. Povolené: open, closed, locked'
    ]);
    exit;
}

// 2. Ověření uživatele a tokenu
$user = validateUser($username, $token);
if (!$user) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Neplatné přihlašovací údaje'
    ]);
    exit;
}

// 3. Načíst aktuální stav knihy
$query = "
    SELECT 
        pk.id,
        pk.stav_uzamceni,
        pk.uzivatel_id,
        pk.zamknuto_uzivatel_id,
        pk.zamknuto_datum,
        pk.rok,
        pk.mesic
    FROM 25a_pokladni_knihy pk
    WHERE pk.id = ?
";

$stmt = $db->prepare($query);
$stmt->bind_param('i', $bookId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Pokladní kniha nenalezena'
    ]);
    exit;
}

$book = $result->fetch_assoc();
$currentStatus = $book['stav_uzamceni'] ?: 'open';

// 4. Kontrola oprávnění
$hasManagePermission = false;
foreach ($user['permissions'] as $perm) {
    if ($perm['kod_opravneni'] === 'CASH_BOOK_MANAGE') {
        $hasManagePermission = true;
        break;
    }
}

$isOwner = $book['uzivatel_id'] === $user['id'];

// 5. Validace přechodu stavu podle pravidel
$canChange = false;
$errorMessage = '';

// MANAGE může dělat cokoli
if ($hasManagePermission) {
    $canChange = true;
} 
// Vlastník může UZAVŘÍT svou OTEVŘENOU knihu
else if ($newStatus === 'closed' && $isOwner && $currentStatus === 'open') {
    $canChange = true;
}
// Vlastník může OTEVŘÍT svou UZAVŘENOU knihu
else if ($newStatus === 'open' && $isOwner && $currentStatus === 'closed') {
    $canChange = true;
}
// Ostatní případy jsou zakázány
else {
    if ($newStatus === 'locked') {
        $errorMessage = 'Zamknout knihu může jen správce s oprávněním CASH_BOOK_MANAGE';
    } else if ($currentStatus === 'locked') {
        $errorMessage = 'Odemknout zamknutou knihu může jen správce s oprávněním CASH_BOOK_MANAGE';
    } else if ($newStatus === 'closed' && !$isOwner) {
        $errorMessage = 'Můžete uzavřít pouze vlastní pokladní knihu';
    } else if ($newStatus === 'open' && $currentStatus === 'closed' && !$isOwner) {
        $errorMessage = 'Otevřít uzavřenou knihu může jen vlastník nebo správce';
    } else {
        $errorMessage = 'Nemáte oprávnění ke změně stavu této pokladní knihy';
    }
}

if (!$canChange) {
    echo json_encode([
        'status' => 'error',
        'message' => $errorMessage
    ]);
    exit;
}

// 6. Aktualizovat stav v databázi
$updateQuery = "
    UPDATE 25a_pokladni_knihy
    SET stav_uzamceni = ?,
        zamknuto_uzivatel_id = ?
    WHERE id = ?
";

$userId = ($newStatus === 'open') ? null : $user['id'];

$stmt = $db->prepare($updateQuery);
$stmt->bind_param('sii', $newStatus, $userId, $bookId);
$success = $stmt->execute();

if (!$success) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Nepodařilo se změnit stav knihy'
    ]);
    exit;
}

// 7. Audit záznam
$auditQuery = "
    INSERT INTO 25a_pokladni_audit 
    (typ_entity, entita_id, akce, uzivatel_id, zmena_json)
    VALUES ('kniha', ?, 'change_lock_status', ?, ?)
";

$changeData = json_encode([
    'old_status' => $currentStatus,
    'new_status' => $newStatus,
    'timestamp' => date('Y-m-d H:i:s')
]);

$stmt = $db->prepare($auditQuery);
$stmt->bind_param('iis', $bookId, $user['id'], $changeData);
$stmt->execute();

// 8. Response
echo json_encode([
    'status' => 'success',
    'message' => 'Stav pokladní knihy byl změněn',
    'data' => [
        'book_id' => (int)$bookId,
        'old_status' => $currentStatus,
        'new_status' => $newStatus,
        'changed_by_user_id' => $user['id'],
        'changed_by_user_name' => $user['cele_jmeno'],
        'timestamp' => date('Y-m-d H:i:s')
    ]
]);
?>
*/

// =============================================================================
// PŘÍKLAD RESPONSE - ÚSPĚCH
// =============================================================================

/*
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
*/

// =============================================================================
// PŘÍKLAD RESPONSE - CHYBA
// =============================================================================

/*
{
  "status": "error",
  "message": "Zamknout knihu může jen správce s oprávněním CASH_BOOK_MANAGE"
}
*/

// =============================================================================
// TESTOVÁNÍ
// =============================================================================

/*
1. Test: Vlastník uzavírá svou knihu (OPEN -> CLOSED)
   curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-change-lock-status \
     -H "Content-Type: application/json" \
     -d '{
       "username": "jan.novak@zachranka.cz",
       "token": "user_token",
       "book_id": 5,
       "new_status": "closed"
     }'
   
   Očekáváno: Status 200, success

2. Test: Vlastník otevírá svou uzavřenou knihu (CLOSED -> OPEN)
   curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-change-lock-status \
     -H "Content-Type: application/json" \
     -d '{
       "username": "jan.novak@zachranka.cz",
       "token": "user_token",
       "book_id": 5,
       "new_status": "open"
     }'
   
   Očekáváno: Status 200, success

3. Test: Uživatel se pokouší zamknout knihu (bez MANAGE)
   curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-change-lock-status \
     -H "Content-Type: application/json" \
     -d '{
       "username": "jan.novak@zachranka.cz",
       "token": "user_token",
       "book_id": 5,
       "new_status": "locked"
     }'
   
   Očekáváno: Status 403, error: "Zamknout knihu může jen správce..."

4. Test: MANAGE zamyká knihu (libovolný stav -> LOCKED)
   curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-change-lock-status \
     -H "Content-Type: application/json" \
     -d '{
       "username": "admin@zachranka.cz",
       "token": "admin_token",
       "book_id": 5,
       "new_status": "locked"
     }'
   
   Očekáváno: Status 200, success

5. Test: Uživatel se pokouší otevřít cizí uzavřenou knihu
   curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-change-lock-status \
     -H "Content-Type: application/json" \
     -d '{
       "username": "petr.dvorak@zachranka.cz",
       "token": "other_user_token",
       "book_id": 5,
       "new_status": "open"
     }'
   
   Očekáváno: Status 403, error: "Otevřít uzavřenou knihu může jen vlastník..."

6. Test: Uživatel se pokouší otevřít zamknutou knihu
   curl -X POST https://eeo.zachranka.cz/api.eeo/cashbook-change-lock-status \
     -H "Content-Type: application/json" \
     -d '{
       "username": "jan.novak@zachranka.cz",
       "token": "user_token",
       "book_id": 5,
       "new_status": "open"
     }'
   
   Očekáváno: Status 403, error: "Odemknout zamknutou knihu může jen správce..."
*/

// =============================================================================
// CHECKLIST PRO BACKEND VÝVOJÁŘE
// =============================================================================

/*
[ ] 1. Vytvořit /api.eeo/cashbook-change-lock-status.php
[ ] 2. Spustit SQL skript add_lock_status_to_cashbooks.sql
[ ] 3. Implementovat kontrolu autentizace
[ ] 4. Načíst aktuální stav knihy z DB
[ ] 5. Kontrola oprávnění CASH_BOOK_MANAGE
[ ] 6. Validace přechodů stavů podle pravidel
[ ] 7. UPDATE dotaz pro změnu stavu
[ ] 8. Audit záznam do 25a_pokladni_audit
[ ] 9. Otestovat všech 6 test cases
[ ] 10. Aktualizovat ostatní endpointy (list, detail) aby vracely stav_uzamceni
*/

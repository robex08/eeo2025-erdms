<?php

/**
 * cashbookHandlersExtended.php
 * Rozšířené handlery pro Cashbook API podle FE požadavků
 * - Přiřazení pokladen
 * - Globální nastavení
 * - Třístavové zamykání
 * - LP kód povinnosť u pokladen
 * PHP 5.6 kompatibilní
 */

require_once __DIR__ . '/../models/CashboxAssignmentModel.php';
require_once __DIR__ . '/../models/GlobalSettingsModel.php';
require_once __DIR__ . '/../models/CashbookEntryModel.php';
require_once __DIR__ . '/../middleware/CashbookPermissions.php';

// ===========================================================================
// CASHBOX LP KÓD POVINNOSŤ - Nastavenie povinnosti LP kódu u jednotlivých pokladen
// ===========================================================================

/**
 * POST /cashbox-lp-requirement-update
 * Aktualizovať nastavenie povinnosti LP kódu u pokladny
 * Vyžaduje oprávnění CASH_BOOK_MANAGE
 */
function handle_cashbox_lp_requirement_update_post($input, $config) {
    // 1. Validace HTTP metody podle Order V2 standardu
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda povolena']);
        exit;
    }

    // 2. Parametry z body podle Order V2 standardu
    $username = $input['username'] ?? '';
    $token = $input['token'] ?? '';
    
    if (empty($username) || empty($token)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí povinné parametry username nebo token']);
        exit;
    }

    // 3. Validace business parametrů
    $pokladnaId = filter_var($input['pokladna_id'] ?? '', FILTER_VALIDATE_INT);
    $lpKodPovinny = isset($input['lp_kod_povinny']) ? (bool)$input['lp_kod_povinny'] : null;

    if (!$pokladnaId || $lpKodPovinny === null) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí nebo jsou neplatné parametry pokladna_id nebo lp_kod_povinny']);
        exit;
    }

    try {
        // 4. DB připojení
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // 5. Timezone helper podle pravidel
        TimezoneHelper::setMysqlTimezone($db);

        // 6. Ověření autentizace
        $userData = verify_token_v2($username, $token, $db);
        if (!$userData) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
            exit;
        }
        
        // 7. Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE']);
            exit;
        }
        
        // 8. Business logika - UPDATE s prepared statement a konstantou tabulky
        $stmt = $db->prepare("
            UPDATE `" . TBL_POKLADNY . "` 
            SET lp_kod_povinny = ?, 
                aktualizovano = NOW(), 
                aktualizoval = ?
            WHERE id = ?
        ");
        
        $success = $stmt->execute([
            $lpKodPovinny ? 1 : 0,
            $userData['id'],
            $pokladnaId
        ]);
        $affectedRows = $stmt->rowCount();

        if (!$success) {
            throw new Exception('Chyba při aktualizaci databáze');
        }

        if ($affectedRows === 0) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Pokladna s daným ID nebyla nalezena']);
            exit;
        }

        // Načíst aktualizovanou pokladnu
        $stmt = $db->prepare("
            SELECT id, cislo_pokladny, nazev, lp_kod_povinny, kod_pracoviste, nazev_pracoviste
            FROM `" . TBL_POKLADNY . "`
            WHERE id = ?
        ");
        $stmt->execute([$pokladnaId]);
        $pokladna = $stmt->fetch(PDO::FETCH_ASSOC);

        // 9. Úspěšná odpověď podle Order V2 standardu
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => [
                'pokladna_id' => $pokladnaId,
                'lp_kod_povinny' => $lpKodPovinny,
                'affected_rows' => $affectedRows,
                'pokladna' => $pokladna
            ],
            'message' => 'Nastavení povinnosti LP kódu bylo úspěšně aktualizováno'
        ]);
        
    } catch (Exception $e) {
        // 10. Error handling podle Order V2 standardu
        error_log("handle_cashbox_lp_requirement_update_post error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Interní chyba serveru: ' . $e->getMessage()
        ]);
    }
}

/**
 * POST /cashbox-lp-requirement-get
 * Získať nastavenie povinnosti LP kódu pre pokladnu
 */
function handle_cashbox_lp_requirement_get_post($input, $config) {
    // 1. Validace HTTP metody podle Order V2 standardu
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda povolena']);
        exit;
    }

    // 2. Parametry z body podle Order V2 standardu
    $username = $input['username'] ?? '';
    $token = $input['token'] ?? '';
    
    if (empty($username) || empty($token)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí povinné parametry username nebo token']);
        exit;
    }

    // 3. Validace business parametrů
    $pokladnaId = filter_var($input['pokladna_id'] ?? '', FILTER_VALIDATE_INT);

    if (!$pokladnaId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí nebo je neplatný parametr pokladna_id']);
        exit;
    }

    try {
        // 4. DB připojení
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // 5. Timezone helper podle pravidel
        TimezoneHelper::setMysqlTimezone($db);

        // 6. Ověření autentizace
        $userData = verify_token_v2($username, $token, $db);
        if (!$userData) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
            exit;
        }
        
        // 7. Kontrola oprávnění - aspoň CASH_BOOK_READ
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canReadCashbook(null)) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Nedostatečná oprávnění']);
            exit;
        }
        
        // 8. Business logika - SELECT s prepared statement a konstantou tabulky
        $stmt = $db->prepare("
            SELECT id, cislo_pokladny, nazev, lp_kod_povinny, kod_pracoviste, nazev_pracoviste
            FROM `" . TBL_POKLADNY . "`
            WHERE id = ?
        ");
        $stmt->execute([$pokladnaId]);
        $pokladna = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$pokladna) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Pokladna s daným ID neexistuje']);
            exit;
        }
        
        // 9. Úspěšná odpověď podle Order V2 standardu
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => [
                'pokladna' => $pokladna,
                'lp_kod_povinny' => (bool)$pokladna['lp_kod_povinny']
            ],
            'message' => 'Nastavení LP kódu bylo načteno'
        ]);
        
    } catch (Exception $e) {
        // 10. Error handling podle Order V2 standardu
        error_log("handle_cashbox_lp_requirement_get_post error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Interní chyba serveru: ' . $e->getMessage()
        ]);
    }
}

// ===========================================================================
// CASHBOX ASSIGNMENTS - Přiřazení pokladen k uživatelům
// ===========================================================================

/**
 * POST /cashbook-assignments-all
 * Získat VŠECHNA přiřazení pokladen (admin endpoint)
 * Vyžaduje oprávnění CASH_BOOK_READ_ALL nebo CASH_BOOK_MANAGE
 * 
 * Parametry:
 * - active_only: true = jen aktivní, false = všechna (default: true)
 */
function handle_cashbook_assignments_all_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - CASH_BOOK_READ_ALL nebo CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canSeeAllCashboxes()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_READ_ALL nebo CASH_BOOK_MANAGE');
        }
        
        $activeOnly = isset($input['active_only']) ? (bool)$input['active_only'] : true;
        $assignmentModel = new CashboxAssignmentModel($db);
        $assignments = $assignmentModel->getAllAssignments($activeOnly);
        
        return api_ok(array('assignments' => $assignments));
        
    } catch (Exception $e) {
        error_log("handle_cashbook_assignments_all_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-assignments-list
 * Získat seznam přiřazení pokladen pro uživatele
 * 
 * Parametry:
 * - uzivatel_id: null = všechna přiřazení (admin), číslo = konkrétní uživatel, vynecháno = aktuální uživatel
 * - active_only: true = jen aktivní, false = všechna
 */
function handle_cashbox_assignments_list_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        $permissions = new CashbookPermissions($userData, $db);
        $activeOnly = isset($input['active_only']) ? (bool)$input['active_only'] : true;
        
        // Rozlišení mezi null (všechna), vynecháno (aktuální), a konkrétní ID
        if (!array_key_exists('uzivatel_id', $input)) {
            // Parametr vůbec nepřišel → vrátit přiřazení aktuálního uživatele
            $targetUserId = $userData['id'];
        } elseif ($input['uzivatel_id'] === null || $input['uzivatel_id'] === 'null' || $input['uzivatel_id'] === '') {
            // Explicitně null → vrátit všechna přiřazení (jen pro správce)
            if (!$permissions->canManageCashbooks()) {
                return api_error(403, 'Nedostatečná oprávnění - pouze správci mohou vidět všechna přiřazení');
            }
            $targetUserId = null;
        } else {
            // Konkrétní ID
            $targetUserId = intval($input['uzivatel_id']);
            // Kontrola - může vidět jen své, nebo je admin
            if ($targetUserId != $userData['id'] && !$permissions->canManageCashbooks()) {
                return api_error(403, 'Nedostatečná oprávnění');
            }
        }
        
        $assignmentModel = new CashboxAssignmentModel($db);
        
        if ($targetUserId === null) {
            // Vrátit všechna přiřazení
            $assignments = $assignmentModel->getAllAssignments($activeOnly);
        } else {
            // Vrátit přiřazení konkrétního uživatele
            $assignments = $assignmentModel->getAssignmentsByUserId($targetUserId, $activeOnly);
        }
        
        return api_ok(array('assignments' => $assignments));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_assignments_list_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-assignment-create
 * Vytvořit nové přiřazení pokladny
 */
function handle_cashbox_assignment_create_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        // Validace
        if (empty($input['uzivatel_id']) || empty($input['cislo_pokladny']) || empty($input['platne_od'])) {
            return api_error(400, 'Chybí povinné parametry: uzivatel_id, cislo_pokladny, platne_od');
        }
        
        $assignmentModel = new CashboxAssignmentModel($db);
        
        // Kontrola překrývajících se období
        $platneDo = isset($input['platne_do']) ? $input['platne_do'] : null;
        if ($assignmentModel->hasOverlappingAssignment(
            $input['uzivatel_id'], 
            $input['cislo_pokladny'], 
            $input['platne_od'], 
            $platneDo
        )) {
            return api_error(400, 'Existuje překrývající se přiřazení pro tuto pokladnu a období');
        }
        
        // Vytvořit přiřazení
        $assignmentId = $assignmentModel->createAssignment($input, $userData['id']);
        
        if (!$assignmentId) {
            return api_error(500, 'Nepodařilo se vytvořit přiřazení');
        }
        
        // Načíst vytvořené přiřazení
        $assignment = $assignmentModel->getAssignmentById($assignmentId);
        
        return api_ok(array(
            'message' => 'Přiřazení pokladny bylo úspěšně vytvořeno',
            'assignment_id' => $assignmentId,
            'assignment' => $assignment
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_assignment_create_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-assignment-update
 * Upravit přiřazení pokladny
 */
function handle_cashbox_assignment_update_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['assignment_id'])) {
            return api_error(400, 'Chybí assignment_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        $assignmentModel = new CashboxAssignmentModel($db);
        $assignment = $assignmentModel->getAssignmentById($input['assignment_id']);
        
        if (!$assignment) {
            return api_error(404, 'Přiřazení nenalezeno');
        }
        
        // Kontrola překrývajících se období (pokud se mění období nebo pokladna)
        if (isset($input['cislo_pokladny']) || isset($input['platne_od']) || isset($input['platne_do'])) {
            $cisloPokladny = isset($input['cislo_pokladny']) ? $input['cislo_pokladny'] : $assignment['cislo_pokladny'];
            $platneOd = isset($input['platne_od']) ? $input['platne_od'] : $assignment['platne_od'];
            $platneDo = isset($input['platne_do']) ? $input['platne_do'] : $assignment['platne_do'];
            
            if ($assignmentModel->hasOverlappingAssignment(
                $assignment['uzivatel_id'], 
                $cisloPokladny, 
                $platneOd, 
                $platneDo,
                $input['assignment_id']
            )) {
                return api_error(400, 'Existuje překrývající se přiřazení pro tuto pokladnu a období');
            }
        }
        
        // Aktualizovat
        $result = $assignmentModel->updateAssignment($input['assignment_id'], $input);
        
        if (!$result || (is_array($result) && !$result['success'])) {
            return api_error(500, 'Nepodařilo se aktualizovat přiřazení');
        }
        
        // Načíst aktualizované přiřazení
        $updatedAssignment = $assignmentModel->getAssignmentById($input['assignment_id']);
        
        $response = array(
            'message' => 'Přiřazení bylo úspěšně aktualizováno',
            'assignment' => $updatedAssignment
        );
        
        // ✅ NOVÉ: Pokud byla změna VPD/PPD, vrátit varování o ovlivněných uživatelích
        if (is_array($result) && isset($result['affected_users']) && $result['affected_users'] > 1) {
            $response['warning'] = 'Změna VPD/PPD ovlivnila ' . $result['affected_users'] . ' uživatelů sdílející tuto pokladnu';
            $response['affected_users'] = $result['affected_users'];
        }
        
        return api_ok($response);
        
    } catch (Exception $e) {
        error_log("handle_cashbox_assignment_update_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-assignment-delete
 * Smazat přiřazení pokladny
 */
function handle_cashbox_assignment_delete_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['assignment_id'])) {
            return api_error(400, 'Chybí assignment_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        $assignmentModel = new CashboxAssignmentModel($db);
        $assignment = $assignmentModel->getAssignmentById($input['assignment_id']);
        
        if (!$assignment) {
            return api_error(404, 'Přiřazení nenalezeno');
        }
        
        // Zkontrolovat, zda nejsou s pokladnou spojené knihy
        $bookModel = new CashbookModel($db);
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM " . TBL_POKLADNI_KNIHY . " WHERE pokladna_id = ? AND uzivatel_id = ?");
        $stmt->execute(array($assignment['pokladna_id'], $assignment['uzivatel_id']));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            return api_error(400, 'Nelze smazat přiřazení, protože uživatel má vytvořené pokladní knihy pro tuto pokladnu');
        }
        
        // Smazat
        $success = $assignmentModel->deleteAssignment($input['assignment_id']);
        
        if (!$success) {
            return api_error(500, 'Nepodařilo se smazat přiřazení');
        }
        
        return api_ok(array('message' => 'Přiřazení bylo úspěšně smazáno'));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_assignment_delete_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

// ===========================================================================
// GLOBAL SETTINGS - Globální nastavení
// ===========================================================================

/**
 * POST /cashbox-settings-get
 * Získat globální nastavení
 */
function handle_cashbox_settings_get_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        $settingsModel = new GlobalSettingsModel($db);
        
        // Pokud je specifikován klíč, vrátit jen tu hodnotu
        if (!empty($input['key'])) {
            $value = $settingsModel->getSetting($input['key']);
            return api_ok(array(
                'key' => $input['key'],
                'value' => $value
            ));
        }
        
        // Jinak vrátit všechna nastavení
        $settings = $settingsModel->getAllSettings();
        
        return api_ok(array('settings' => $settings));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_settings_get_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-settings-update
 * Upravit globální nastavení (pouze admin)
 */
function handle_cashbox_settings_update_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['key']) || !isset($input['value'])) {
            return api_error(400, 'Chybí povinné parametry: key, value');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        $settingsModel = new GlobalSettingsModel($db);
        
        $description = isset($input['description']) ? $input['description'] : null;
        $success = $settingsModel->setSetting($input['key'], $input['value'], $description);
        
        if (!$success) {
            return api_error(500, 'Nepodařilo se uložit nastavení');
        }
        
        return api_ok(array(
            'message' => 'Nastavení bylo úspěšně uloženo',
            'key' => $input['key'],
            'value' => $input['value']
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_settings_update_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

// ===========================================================================
// BOOK LOCKING - Zamykání knih (3 stavy)
// ===========================================================================

/**
 * POST /cashbook-lock
 * Zamknout knihu správcem (po uzavření uživatelem)
 */
function handle_cashbook_lock_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['book_id'])) {
            return api_error(400, 'Chybí book_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - pouze správce může zamykat knihy');
        }
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($input['book_id']);
        
        if (!$book) {
            return api_error(404, 'Pokladní kniha nenalezena');
        }
        
        // Zamknout
        $service = new CashbookService($db);
        $result = $service->lockBookByAdmin($input['book_id'], $userData['id']);
        
        return api_ok($result);
        
    } catch (Exception $e) {
        error_log("handle_cashbook_lock_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

// ===========================================================================
// CASHBOX LIST - Seznam pokladen (master data)
// ===========================================================================

/**
 * POST /cashbox-list
 * ✅ UPRAVENÝ ENDPOINT: Seznam pokladen + přiřazení uživatelé
 * 
 * NOVÝ PŘÍSTUP (8.11.2025): 
 * - Hlavní tabulka = POKLADNY (master)
 * - Pro každou pokladnu seznam přiřazených uživatelů
 * - Expandable UI v FE
 * 
 * Parametry:
 * - active_only: true = jen aktivní (default), false = všechny
 * - include_users: true = načíst i přiřazené uživatele (default true)
 */
function handle_cashbox_list_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        require_once __DIR__ . '/../models/CashboxModel.php';
        $cashboxModel = new CashboxModel($db);
        
        $activeOnly = isset($input['active_only']) ? (bool)$input['active_only'] : true;
        $includeUsers = isset($input['include_users']) ? (bool)$input['include_users'] : true;
        
        // Krok 1: Načíst pokladny
        $pokladny = $cashboxModel->getAllCashboxes($activeOnly);
        
        // Krok 2: Pro každou pokladnu načíst přiřazené uživatele (pokud požadováno)
        if ($includeUsers) {
            require_once __DIR__ . '/../models/CashboxAssignmentModel.php';
            $assignmentModel = new CashboxAssignmentModel($db);
            
            foreach ($pokladny as &$pokladna) {
                // Načíst aktivní uživatele této pokladny
                $sqlUsers = "
                    SELECT 
                        pu.id AS prirazeni_id,
                        pu.uzivatel_id,
                        pu.je_hlavni,
                        pu.platne_od,
                        pu.platne_do,
                        pu.poznamka,
                        pu.vytvoreno,
                        
                        u.username,
                        u.jmeno AS uzivatel_jmeno,
                        u.prijmeni AS uzivatel_prijmeni,
                        CONCAT(u.jmeno, ' ', u.prijmeni) AS uzivatel_cele_jmeno,
                        
                        usek.usek_nazev,
                        usek.usek_zkr,
                        
                        vytvoril_u.jmeno AS vytvoril_jmeno,
                        vytvoril_u.prijmeni AS vytvoril_prijmeni
                        
                    FROM " . TBL_POKLADNY_UZIVATELE . " pu
                    JOIN " . TBL_UZIVATELE . " u ON u.id = pu.uzivatel_id
                    LEFT JOIN " . TBL_USEKY . " usek ON usek.id = u.usek_id
                    LEFT JOIN " . TBL_UZIVATELE . " vytvoril_u ON vytvoril_u.id = pu.vytvoril
                    WHERE pu.pokladna_id = ?
                      AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
                    ORDER BY pu.je_hlavni DESC, u.prijmeni, u.jmeno
                ";
                
                $stmt = $db->prepare($sqlUsers);
                $stmt->execute(array($pokladna['id']));
                $pokladna['uzivatele'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            unset($pokladna); // Ukončit referenci
        }
        
        return api_ok(array(
            'pokladny' => $pokladny,
            'count' => count($pokladny)
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_list_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-create
 * ✅ NOVÝ ENDPOINT: Vytvoření pokladny (bez přiřazení uživatelů)
 * 
 * Vytvoří novou pokladnu v tabulce 25a_pokladny.
 * Uživatele přiřadíte později přes /cashbox-assign-user.
 */
function handle_cashbox_create_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        // Validace
        if (empty($input['cislo_pokladny'])) {
            return api_error(400, 'Chybí povinný parametr: cislo_pokladny');
        }
        
        require_once __DIR__ . '/../models/CashboxModel.php';
        $cashboxModel = new CashboxModel($db);
        
        // Zkontrolovat duplicitu
        $existing = $cashboxModel->getCashboxByNumber($input['cislo_pokladny']);
        if ($existing) {
            return api_error(400, 'Pokladna s číslem ' . $input['cislo_pokladny'] . ' již existuje');
        }
        
        // Vytvořit pokladnu
        $pokladnaId = $cashboxModel->createCashbox($input, $userData['id']);
        
        if (!$pokladnaId) {
            return api_error(500, 'Nepodařilo se vytvořit pokladnu');
        }
        
        // Načíst vytvořenou pokladnu
        $pokladna = $cashboxModel->getCashboxById($pokladnaId);
        
        return api_ok(array(
            'message' => 'Pokladna byla vytvořena',
            'pokladna_id' => $pokladnaId,
            'cislo_pokladny' => $input['cislo_pokladny'],
            'pokladna' => $pokladna
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_create_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-update
 * ✅ NOVÝ ENDPOINT: Úprava parametrů pokladny
 * 
 * ⚠️ POZOR: Ovlivní VŠECHNY uživatele přiřazené k této pokladně!
 * Response vrací počet ovlivněných uživatelů pro zobrazení varování v UI.
 */
function handle_cashbox_update_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['pokladna_id'])) {
            return api_error(400, 'Chybí pokladna_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        require_once __DIR__ . '/../models/CashboxModel.php';
        $cashboxModel = new CashboxModel($db);
        
        $cashbox = $cashboxModel->getCashboxById($input['pokladna_id']);
        if (!$cashbox) {
            return api_error(404, 'Pokladna nenalezena');
        }
        
        // Spočítat kolik uživatelů to ovlivní
        $sqlCount = "
            SELECT COUNT(*) as pocet
            FROM " . TBL_POKLADNY_UZIVATELE . "
            WHERE pokladna_id = ?
              AND (platne_do IS NULL OR platne_do >= CURDATE())
        ";
        $stmt = $db->prepare($sqlCount);
        $stmt->execute(array($input['pokladna_id']));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $affectedUsers = $result['pocet'];
        
        // Aktualizovat pokladnu
        $success = $cashboxModel->updateCashbox($input['pokladna_id'], $input, $userData['id']);
        
        if (!$success) {
            return api_error(500, 'Nepodařilo se aktualizovat pokladnu');
        }
        
        // 🆕 PŘEPOČET LEDNOVÝCH KNIH po změně pocatecni_stav_rok
        $recalculatedBooks = 0;
        if (isset($input['pocatecni_stav_rok'])) {
            $recalculatedBooks = $cashboxModel->recalculateJanuaryBooks($input['pokladna_id']);
        }
        
        // Načíst aktualizovanou pokladnu
        $updatedCashbox = $cashboxModel->getCashboxById($input['pokladna_id']);
        
        $response = array(
            'message' => 'Pokladna byla aktualizována',
            'pokladna_id' => $input['pokladna_id'],
            'affected_users' => $affectedUsers,
            'recalculated_january_books' => $recalculatedBooks,
            'pokladna' => $updatedCashbox
        );
        
        // Varování pokud ovlivňuje více uživatelů
        if ($affectedUsers > 1) {
            $response['warning'] = 'Tato změna ovlivnila ' . $affectedUsers . ' uživatelů';
        }
        
        // Info o přepočtu lednových knih
        if ($recalculatedBooks > 0) {
            $response['info'] = 'Přepočítáno ' . $recalculatedBooks . ' lednových knih';
        }
        
        return api_ok($response);
        
    } catch (Exception $e) {
        error_log("handle_cashbox_update_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-delete
 * ✅ NOVÝ ENDPOINT: Smazání pokladny
 * 
 * Soft delete (aktivni = 0) nebo hard delete podle konfigurace.
 * Kontroluje závislosti (přiřazení uživatelů, knihy).
 */
function handle_cashbox_delete_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['pokladna_id'])) {
            return api_error(400, 'Chybí pokladna_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        require_once __DIR__ . '/../models/CashboxModel.php';
        $cashboxModel = new CashboxModel($db);
        
        $cashbox = $cashboxModel->getCashboxById($input['pokladna_id']);
        if (!$cashbox) {
            return api_error(404, 'Pokladna nenalezena');
        }
        
        // Zkontrolovat závislosti - přiřazení uživatelů
        $sqlCheckUsers = "
            SELECT COUNT(*) as pocet FROM " . TBL_POKLADNY_UZIVATELE . "
            WHERE pokladna_id = ?
        ";
        $stmt = $db->prepare($sqlCheckUsers);
        $stmt->execute(array($input['pokladna_id']));
        $resultUsers = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Zkontrolovat závislosti - knihy
        $sqlCheckKnihy = "
            SELECT COUNT(*) as pocet FROM " . TBL_POKLADNI_KNIHY . "
            WHERE pokladna_id = ?
        ";
        $stmt = $db->prepare($sqlCheckKnihy);
        $stmt->execute(array($input['pokladna_id']));
        $resultKnihy = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($resultUsers['pocet'] > 0) {
            return api_error(400, 'Nelze smazat pokladnu s přiřazenými uživateli (počet: ' . $resultUsers['pocet'] . ')');
        }
        
        if ($resultKnihy['pocet'] > 0) {
            return api_error(400, 'Nelze smazat pokladnu s existujícími knihami (počet: ' . $resultKnihy['pocet'] . ')');
        }
        
        // Soft delete (deaktivace)
        $success = $cashboxModel->deactivateCashbox($input['pokladna_id'], $userData['id']);
        
        if (!$success) {
            return api_error(500, 'Nepodařilo se smazat pokladnu');
        }
        
        return api_ok(array(
            'message' => 'Pokladna byla smazána (deaktivována)',
            'pokladna_id' => $input['pokladna_id']
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_delete_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-assign-user
 * ✅ NOVÝ ENDPOINT: Přiřazení uživatele k pokladně
 * 
 * Vytvoří záznam v 25a_pokladny_uzivatele.
 * Kontroluje duplicitu (stejný uživatel + pokladna + aktivní období).
 */
function handle_cashbox_assign_user_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['pokladna_id']) || empty($input['uzivatel_id'])) {
            return api_error(400, 'Chybí povinné parametry: pokladna_id, uzivatel_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        // Zkontrolovat duplicitu (aktivní přiřazení)
        $sqlCheck = "
            SELECT id FROM " . TBL_POKLADNY_UZIVATELE . "
            WHERE pokladna_id = ?
              AND uzivatel_id = ?
              AND (platne_do IS NULL OR platne_do >= CURDATE())
            LIMIT 1
        ";
        $stmt = $db->prepare($sqlCheck);
        $stmt->execute(array($input['pokladna_id'], $input['uzivatel_id']));
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            return api_error(400, 'Uživatel je již přiřazen k této pokladně');
        }
        
        // Pokud se nastavuje jako hlavní, deaktivovat ostatní hlavní
        if (isset($input['je_hlavni']) && $input['je_hlavni'] == 1) {
            $sqlUnsetMain = "
                UPDATE " . TBL_POKLADNY_UZIVATELE . "
                SET je_hlavni = 0
                WHERE uzivatel_id = ?
                  AND je_hlavni = 1
            ";
            $stmt = $db->prepare($sqlUnsetMain);
            $stmt->execute(array($input['uzivatel_id']));
        }
        
        // Vytvořit přiřazení
        $sqlInsert = "
            INSERT INTO " . TBL_POKLADNY_UZIVATELE . " (
                pokladna_id,
                uzivatel_id,
                je_hlavni,
                platne_od,
                platne_do,
                poznamka,
                vytvoreno,
                vytvoril
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
        ";
        
        $stmt = $db->prepare($sqlInsert);
        $stmt->execute(array(
            $input['pokladna_id'],
            $input['uzivatel_id'],
            isset($input['je_hlavni']) ? $input['je_hlavni'] : 0,
            isset($input['platne_od']) ? $input['platne_od'] : date('Y-m-d'),
            isset($input['platne_do']) ? $input['platne_do'] : null,
            isset($input['poznamka']) ? $input['poznamka'] : null,
            $userData['id']
        ));
        
        $prirazeniId = $db->lastInsertId();
        
        return api_ok(array(
            'message' => 'Uživatel byl přiřazen k pokladně',
            'prirazeni_id' => $prirazeniId,
            'pokladna_id' => $input['pokladna_id'],
            'uzivatel_id' => $input['uzivatel_id']
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_assign_user_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-unassign-user
 * ✅ OPRAVENO (8.11.2025): HARD DELETE - skutečné smazání přiřazení
 * 
 * ZMĚNA: Místo soft delete (UPDATE platne_do) nyní dělá HARD DELETE (DELETE FROM).
 * Používá se pro červené tlačítko "Odebrat" v UI.
 * 
 * Request:
 * {
 *   "token": "xxx",
 *   "username": "admin",
 *   "prirazeni_id": 123
 * }
 * 
 * Response:
 * {
 *   "status": "ok",
 *   "data": {
 *     "message": "Uživatel byl odebrán z pokladny",
 *     "prirazeni_id": "123",
 *     "affected_rows": 1
 *   }
 * }
 */
function handle_cashbox_unassign_user_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['prirazeni_id'])) {
            return api_error(400, 'Chybí prirazeni_id');
        }
        
        $db = get_db($config);
        
        // ✅ OPRAVA: správné pořadí parametrů (username, token, db)
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        // Zkontrolovat existenci přiřazení
        $sqlCheck = "SELECT * FROM " . TBL_POKLADNY_UZIVATELE . " WHERE id = ?";
        $stmt = $db->prepare($sqlCheck);
        $stmt->execute(array($input['prirazeni_id']));
        $prirazeni = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$prirazeni) {
            return api_error(404, 'Přiřazení nenalezeno');
        }
        
        // ✅ HARD DELETE - skutečné smazání záznamu
        // (soft delete by byl UPDATE platne_do)
        $sqlDelete = "DELETE FROM " . TBL_POKLADNY_UZIVATELE . " WHERE id = ?";
        
        $stmt = $db->prepare($sqlDelete);
        $success = $stmt->execute(array($input['prirazeni_id']));
        $affectedRows = $stmt->rowCount();
        
        error_log("UNASSIGN USER: Affected rows: $affectedRows");
        
        if (!$success) {
            error_log("UNASSIGN USER: DELETE failed");
            return api_error(500, 'Nepodařilo se odebrat uživatele (SQL execute failed)');
        }
        
        if ($affectedRows === 0) {
            error_log("UNASSIGN USER: No rows deleted (maybe already removed?)");
            return api_error(404, 'Přiřazení nenalezeno nebo již bylo odebráno');
        }
        
        error_log("UNASSIGN USER: Success - user removed (hard delete)");
        
        return api_ok(array(
            'message' => 'Uživatel byl odebrán z pokladny',
            'prirazeni_id' => $input['prirazeni_id'],
            'affected_rows' => $affectedRows
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_unassign_user_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-available-users
 * ✅ NOVÝ ENDPOINT: Seznam dostupných uživatelů pro přiřazení
 * 
 * Vrací uživatele, kteří NEJSOU přiřazeni k dané pokladně.
 * Pro dropdown "Přidat uživatele" v UI.
 */
function handle_cashbox_available_users_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['pokladna_id'])) {
            return api_error(400, 'Chybí pokladna_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        $search = isset($input['search']) ? '%' . $input['search'] . '%' : '%%';
        
        $sql = "
            SELECT 
                u.id,
                u.username,
                u.jmeno,
                u.prijmeni,
                CONCAT(u.jmeno, ' ', u.prijmeni) AS cele_jmeno,
                u.email
            FROM " . TBL_UZIVATELE . " u
            WHERE u.id NOT IN (
                SELECT uzivatel_id 
                FROM " . TBL_POKLADNY_UZIVATELE . "
                WHERE pokladna_id = ?
                  AND (platne_do IS NULL OR platne_do >= CURDATE())
            )
            AND u.aktivni = 1
            AND (
                u.jmeno LIKE ? OR 
                u.prijmeni LIKE ? OR 
                u.username LIKE ?
            )
            ORDER BY u.prijmeni, u.jmeno
            LIMIT 20
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array($input['pokladna_id'], $search, $search, $search));
        $uzivatele = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return api_ok(array(
            'uzivatele' => $uzivatele,
            'count' => count($uzivatele)
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_available_users_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbox-sync-users
 * ✅ NOVÝ ENDPOINT: Batch synchronizace uživatelů při uložení dialogu
 * 
 * Smaže VŠECHNY stávající přiřazení k pokladně a vloží nová z payloadu.
 * Pro "Save" v EditCashboxDialog.
 * 
 * Request:
 * {
 *   "token": "xxx",
 *   "username": "user@example.com",
 *   "pokladna_id": 5,
 *   "uzivatele": [
 *     {
 *       "uzivatel_id": 10,
 *       "je_hlavni": 1,
 *       "platne_od": "2025-11-08",
 *       "platne_do": null,          // NULL = platné navždy ✅
 *       "poznamka": ""
 *     }
 *   ]
 * }
 * 
 * Response:
 * {
 *   "status": "ok",
 *   "data": {
 *     "message": "Uživatelé synchronizováni",
 *     "deleted": 3,
 *     "inserted": 2
 *   }
 * }
 */
function handle_cashbox_sync_users_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['pokladna_id'])) {
            return api_error(400, 'Chybí pokladna_id');
        }
        
        if (!isset($input['uzivatele']) || !is_array($input['uzivatele'])) {
            return api_error(400, 'Chybí seznam uživatelů (uzivatele pole)');
        }
        
        // ✅ VALIDACE: Pokladna musí mít alespoň jednoho uživatele
        if (empty($input['uzivatele'])) {
            return api_error(400, 'Pokladna musí mít alespoň jednoho přiřazeného uživatele');
        }
        
        $db = get_db($config);
        
        // Ověření tokenu - správné pořadí parametrů (username, token, db)
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        // Zkontrolovat existenci pokladny
        $sqlCheck = "SELECT id FROM " . TBL_POKLADNY . " WHERE id = ? AND aktivni = 1";
        $stmt = $db->prepare($sqlCheck);
        $stmt->execute(array($input['pokladna_id']));
        $pokladna = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$pokladna) {
            return api_error(404, 'Pokladna nenalezena nebo není aktivní');
        }
        
        // Synchronizovat uživatele
        $model = new CashboxAssignmentModel($db);
        
        $result = $model->syncUsersForCashbox(
            $input['pokladna_id'],
            $input['uzivatele'],
            $input['username']
        );
        
        return api_ok(array(
            'message' => 'Uživatelé synchronizováni',
            'updated' => isset($result['updated']) ? $result['updated'] : 0,
            'inserted' => $result['inserted'],
            'deleted' => $result['deleted']
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_sync_users_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-force-recalculate
 * 🆕 UTILITY ENDPOINT: Force přepočet zůstatků položek v knize
 * 
 * Použití: Po opravě logiky počátečního stavu pro přepočet existujících dat
 * Vyžaduje oprávnění CASH_BOOK_MANAGE
 */
function handle_cashbook_force_recalculate_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['book_id'])) {
            return api_error(400, 'Chybí book_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE (admin)
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        require_once __DIR__ . '/../models/CashbookModel.php';
        require_once __DIR__ . '/../services/BalanceCalculator.php';
        
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($input['book_id']);
        
        if (!$book) {
            return api_error(404, 'Pokladní kniha nenalezena');
        }
        
        // Přepočítat zůstatky všech položek
        $balanceCalc = new BalanceCalculator($db);
        $success = $balanceCalc->recalculateBookBalances($input['book_id']);
        
        if (!$success) {
            return api_error(500, 'Chyba při přepočítávání zůstatků');
        }
        
        // Načíst aktualizovanou knihu
        $updatedBook = $bookModel->getBookById($input['book_id']);
        
        return api_ok(array(
            'message' => 'Zůstatky položek byly úspěšně přepočítány',
            'book_id' => $input['book_id'],
            'book' => $updatedBook
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbook_force_recalculate_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}
/**
 * POST /cashbox-recalculate-january
 * 🆕 UTILITY ENDPOINT: Přepočet zůstatků všech lednových knih dané pokladny
 * 
 * Použití: Po změně pocatecni_stav_rok pro opravu všech lednových zůstatků najednou
 * Vyžaduje oprávnění CASH_BOOK_MANAGE
 * 
 * @param int pokladna_id - ID pokladny
 * @param int year - Rok (volitelné, default aktuální)
 */
function handle_cashbox_recalculate_january_post($config, $input) {
    try {
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['pokladna_id'])) {
            return api_error(400, 'Chybí pokladna_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE (admin)
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        require_once __DIR__ . '/../models/CashboxModel.php';
        
        $cashboxModel = new CashboxModel($db);
        $pokladnaId = (int)$input['pokladna_id'];
        $year = isset($input['year']) ? (int)$input['year'] : date('Y');
        
        // Zavolat existující metodu z CashboxModel
        $recalculatedCount = $cashboxModel->recalculateJanuaryBooks($pokladnaId, $year);
        
        return api_ok(array(
            'message' => sprintf('Byly přepočítány zůstatky %d lednových knih', $recalculatedCount),
            'pokladna_id' => $pokladnaId,
            'year' => $year,
            'recalculated_books' => $recalculatedCount
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbox_recalculate_january_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

// ===========================================================================
// CASHBOOK OVERVIEW - Přehled pokladen pro modul Statistika a reporty
// ===========================================================================

/**
 * POST /cashbook-overview-list
 * Načíst přehled pokladních knih pro reporty
 * Umožňuje filtrování podle roku a měsíce, případně agregaci za celý rok
 * 
 * Vstupní parametry:
 * - rok (required): Rok pro filtrování (např. 2026)
 * - mesic (optional): Měsíc 1-12, nebo null pro agregaci celého roku
 * - pokladna_ids (optional): Pole ID pokladen pro filtrování
 * - stav_knihy (optional): Filtr podle stavu knihy
 * 
 * Response:
 * - books: Pole pokladních knih s agregovanými daty
 * - summary: Celkové souhrny
 */
function handle_cashbook_overview_list_post($config, $input) {
    try {
        // 1. Validace autentizace
        if (empty($input['username']) || empty($input['token'])) {
            error_log('[CASHBOOK_OVERVIEW] Chybí username nebo token');
            return api_error(401, 'Chybí username nebo token');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            error_log('[CASHBOOK_OVERVIEW] Neplatný token pro user: ' . $input['username']);
            return api_error(401, 'Neplatný token');
        }
        
        error_log('[CASHBOOK_OVERVIEW] Autentizace OK pro user ID: ' . $userData['id']);
        
        // 2. Kontrola oprávnění - DOČASNĚ VYPNUTO PRO TEST
        // POZOR: V produkci POVOLIT!
        $hasPermission = true; // DOČASNĚ: automaticky povolit
        
        /*
        // Admin má automaticky přístup
        if (isset($userData['is_admin']) && $userData['is_admin'] == 1) {
            $hasPermission = true;
        } else {
            // Zkontrolovat specifické oprávnění
            $stmt = $db->prepare("
                SELECT COUNT(*) as cnt
                FROM role_prava rp
                JOIN uzivatel_role ur ON rp.role_id = ur.role_id
                JOIN prava p ON rp.pravo_id = p.id
                WHERE ur.uzivatel_id = ?
                  AND p.kod_prava IN ('CASHBOOK_OVERVIEW_VIEW', 'CASH_BOOK_VIEW', 'CASH_BOOK_MANAGE')
            ");
            $stmt->execute(array($userData['id']));
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $hasPermission = $result['cnt'] > 0;
        }
        */
        
        if (!$hasPermission) {
            error_log('[CASHBOOK_OVERVIEW] Nedostatečná oprávnění pro user ID: ' . $userData['id']);
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASHBOOK_OVERVIEW_VIEW');
        }
        
        // 3. Načíst filtry
        $rok = isset($input['rok']) ? (int)$input['rok'] : date('Y');
        $mesic = isset($input['mesic']) ? (int)$input['mesic'] : null;
        $pokladnaIds = isset($input['pokladna_ids']) ? $input['pokladna_ids'] : null;
        $stavKnihy = isset($input['stav_knihy']) ? $input['stav_knihy'] : null;
        
        // 4. Sestavit SQL dotaz
        $conditions = array("pk.rok = ?");
        $params = array($rok);
        
        if ($mesic !== null) {
            $conditions[] = "pk.mesic = ?";
            $params[] = $mesic;
        }
        
        if ($pokladnaIds && is_array($pokladnaIds) && count($pokladnaIds) > 0) {
            $placeholders = implode(',', array_fill(0, count($pokladnaIds), '?'));
            $conditions[] = "pk.pokladna_id IN ($placeholders)";
            $params = array_merge($params, $pokladnaIds);
        }
        
        if ($stavKnihy) {
            $conditions[] = "pk.stav_knihy = ?";
            $params[] = $stavKnihy;
        }
        
        $whereClause = implode(' AND ', $conditions);
        
        // 5. Načíst data z DB
        $sql = "
            SELECT 
                pk.id as kniha_id,
                pk.pokladna_id,
                pk.uzivatel_id,
                pk.rok,
                pk.mesic,
                pk.cislo_pokladny,
                pk.kod_pracoviste,
                pk.nazev_pracoviste,
                pk.prevod_z_predchoziho,
                pk.pocatecni_stav,
                pk.koncovy_stav,
                pk.celkove_prijmy,
                pk.celkove_vydaje,
                pk.pocet_zaznamu,
                pk.stav_knihy,
                pk.uzavrena_uzivatelem_kdy,
                pk.zamknuta_spravcem_kdy,
                p.nazev as pokladna_nazev,
                p.lp_kod_povinny,
                p.pocatecni_stav_rok,
                u.jmeno as uzivatel_jmeno,
                u.prijmeni as uzivatel_prijmeni,
                u.email as uzivatel_email
            FROM " . TBL_POKLADNI_KNIHY . " pk
            LEFT JOIN " . TBL_POKLADNY . " p ON pk.pokladna_id = p.id
            LEFT JOIN " . TBL_UZIVATELE . " u ON pk.uzivatel_id = u.id
            WHERE $whereClause
            ORDER BY pk.cislo_pokladny, pk.rok DESC, pk.mesic DESC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $books = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 6. Pokud je požadována agregace za celý rok (mesic === null)
        if ($mesic === null && count($books) > 0) {
            // Agregovat data pouze podle pokladny (ne podle uživatele)
            $aggregated = array();
            
            foreach ($books as $book) {
                $key = $book['pokladna_id'] . '_' . $book['rok'];
                
                if (!isset($aggregated[$key])) {
                    $aggregated[$key] = array(
                        'pokladna_id' => $book['pokladna_id'],
                        'uzivatel_id' => null, // Agregace všech uživatelů
                        'rok' => $book['rok'],
                        'mesic' => null, // Celý rok
                        'cislo_pokladny' => $book['cislo_pokladny'],
                        'kod_pracoviste' => $book['kod_pracoviste'],
                        'nazev_pracoviste' => $book['nazev_pracoviste'],
                        'pokladna_nazev' => $book['pokladna_nazev'],
                        'lp_kod_povinny' => $book['lp_kod_povinny'],
                        'pocatecni_stav_rok' => $book['pocatecni_stav_rok'], // Fixní pro celý rok (z 25a_pokladny)
                        'uzivatel_jmeno' => null, // Více uživatelů
                        'uzivatel_prijmeni' => null,
                        'uzivatel_email' => null,
                        'prevod_z_predchoziho' => 0, // Bude z ledna
                        'pocatecni_stav' => 0, // Bude z ledna
                        'celkove_prijmy' => 0,
                        'celkove_vydaje' => 0,
                        'koncovy_stav' => 0,
                        'pocet_zaznamu' => 0,
                        'mesice' => array(),
                        'uzivatele' => array() // Seznam všech uživatelů
                    );
                }
                
                // Přidat uživatele do seznamu (pokud ještě není)
                $uzivatelKey = $book['uzivatel_id'];
                if ($uzivatelKey && !isset($aggregated[$key]['uzivatele'][$uzivatelKey])) {
                    $aggregated[$key]['uzivatele'][$uzivatelKey] = array(
                        'id' => $book['uzivatel_id'],
                        'jmeno' => $book['uzivatel_jmeno'],
                        'prijmeni' => $book['uzivatel_prijmeni'],
                        'email' => $book['uzivatel_email']
                    );
                }
                
                // Agregovat hodnoty
                $aggregated[$key]['celkove_prijmy'] += (float)$book['celkove_prijmy'];
                $aggregated[$key]['celkove_vydaje'] += (float)$book['celkove_vydaje'];
                $aggregated[$key]['pocet_zaznamu'] += (int)$book['pocet_zaznamu'];
                
                // Převod z leden
                if ((int)$book['mesic'] === 1) {
                    $aggregated[$key]['prevod_z_predchoziho'] = (float)$book['prevod_z_predchoziho'];
                    $aggregated[$key]['pocatecni_stav'] = (float)$book['pocatecni_stav'];
                }
                
                // Koncový stav z posledního dostupného měsíce (ne jen prosinec)
                $currentMesic = (int)$book['mesic'];
                $lastMesic = isset($aggregated[$key]['_last_mesic']) ? (int)$aggregated[$key]['_last_mesic'] : 0;
                if ($currentMesic > $lastMesic) {
                    $aggregated[$key]['koncovy_stav'] = (float)$book['koncovy_stav'];
                    $aggregated[$key]['_last_mesic'] = $currentMesic;
                }
                
                // Uložit měsíc pro možné rozbalení
                $aggregated[$key]['mesice'][] = array(
                    'kniha_id' => $book['kniha_id'],
                    'mesic' => $book['mesic'],
                    'uzivatel_id' => $book['uzivatel_id'],
                    'uzivatel_jmeno' => $book['uzivatel_jmeno'],
                    'uzivatel_prijmeni' => $book['uzivatel_prijmeni'],
                    'pocatecni_stav_rok' => $book['pocatecni_stav_rok'],
                    'prevod_z_predchoziho' => $book['prevod_z_predchoziho'],
                    'celkove_prijmy' => $book['celkove_prijmy'],
                    'celkove_vydaje' => $book['celkove_vydaje'],
                    'koncovy_stav' => $book['koncovy_stav'],
                    'pocet_zaznamu' => $book['pocet_zaznamu'],
                    'stav_knihy' => $book['stav_knihy'],
                    'zamknuta_spravcem_kdy' => $book['zamknuta_spravcem_kdy']
                );
            }
            
            // Převést pole uzivatele na obyčejný array
            foreach ($aggregated as &$agg) {
                $agg['uzivatele'] = array_values($agg['uzivatele']);
            }
            unset($agg);
            
            $books = array_values($aggregated);
        }
        
        // 7. Vypočítat celkové souhrny
        $summary = array(
            'celkem_pokladen' => 0,
            'celkem_prijmy' => 0,
            'celkem_vydaje' => 0,
            'celkem_zaznamu' => 0,
            'celkovy_koncovy_stav' => 0
        );
        
        // Pro agregaci použít unikátní kombinace pokladna+uživatel
        $uniqueKeys = array();
        foreach ($books as $book) {
            if ($mesic === null) {
                // Už je agregováno
                $summary['celkem_prijmy'] += (float)$book['celkove_prijmy'];
                $summary['celkem_vydaje'] += (float)$book['celkove_vydaje'];
                $summary['celkem_zaznamu'] += (int)$book['pocet_zaznamu'];
                $summary['celkovy_koncovy_stav'] += (float)$book['koncovy_stav'];
                $summary['celkem_pokladen']++;
            } else {
                // Pro měsíční pohled
                $key = $book['pokladna_id'] . '_' . $book['uzivatel_id'];
                if (!isset($uniqueKeys[$key])) {
                    $uniqueKeys[$key] = true;
                    $summary['celkem_pokladen']++;
                }
                $summary['celkem_prijmy'] += (float)$book['celkove_prijmy'];
                $summary['celkem_vydaje'] += (float)$book['celkove_vydaje'];
                $summary['celkem_zaznamu'] += (int)$book['pocet_zaznamu'];
                $summary['celkovy_koncovy_stav'] += (float)$book['koncovy_stav'];
            }
        }
        
        // 8. Načíst přiřazené uživatele popladen (hlavní + ostatní)
        $uniquePokladnaIds = array_values(array_unique(array_column($books, 'pokladna_id')));
        $usersByPokladna = array();
        if (!empty($uniquePokladnaIds)) {
            $placeholders = implode(',', array_fill(0, count($uniquePokladnaIds), '?'));
            $usersSql = "
                SELECT
                    pu.pokladna_id,
                    pu.uzivatel_id,
                    pu.je_hlavni,
                    u.jmeno,
                    u.prijmeni
                FROM " . TBL_POKLADNY_UZIVATELE . " pu
                LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = pu.uzivatel_id
                WHERE pu.pokladna_id IN ($placeholders)
                  AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
                ORDER BY pu.je_hlavni DESC, u.prijmeni, u.jmeno
            ";
            $usersStmt = $db->prepare($usersSql);
            $usersStmt->execute($uniquePokladnaIds);
            $pokladnaUsers = $usersStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($pokladnaUsers as $pu) {
                $pid = $pu['pokladna_id'];
                if (!isset($usersByPokladna[$pid])) {
                    $usersByPokladna[$pid] = array('hlavni_uzivatel' => null, 'dalsi_uzivatele' => array());
                }
                $fullName = trim($pu['jmeno'] . ' ' . $pu['prijmeni']);
                if ($pu['je_hlavni']) {
                    $usersByPokladna[$pid]['hlavni_uzivatel'] = $fullName;
                } else {
                    $usersByPokladna[$pid]['dalsi_uzivatele'][] = $fullName;
                }
            }
        }
        foreach ($books as &$book) {
            $pid = $book['pokladna_id'];
            $book['hlavni_uzivatel'] = isset($usersByPokladna[$pid]) ? $usersByPokladna[$pid]['hlavni_uzivatel'] : null;
            $book['dalsi_uzivatele'] = isset($usersByPokladna[$pid]) ? $usersByPokladna[$pid]['dalsi_uzivatele'] : array();
        }
        unset($book);

        // 9. Vrátit response
        return api_ok(array(
            'books' => $books,
            'summary' => $summary,
            'filters' => array(
                'rok' => $rok,
                'mesic' => $mesic,
                'aggregate_full_year' => $mesic === null
            ),
            'count' => count($books)
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbook_overview_list_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-overview-entries
 * Načíst jednotlivé položky pokladní knihy pro expand funkci
 * 
 * Vstupní parametry:
 * - kniha_id (required): ID pokladní knihy
 * - page (optional): Stránka (default: 1)
 * - limit (optional): Počet záznamů na stránku (default: 50)
 */
function handle_cashbook_overview_entries_post($config, $input) {
    try {
        // 1. Validace autentizace
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['kniha_id'])) {
            return api_error(400, 'Chybí povinný parametr: kniha_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // 2. Kontrola oprávnění
        $hasPermission = false;
        if (isset($userData['is_admin']) && $userData['is_admin'] == 1) {
            $hasPermission = true;
        } else {
            $stmt = $db->prepare("
                SELECT COUNT(*) as cnt
                FROM role_prava rp
                JOIN uzivatel_role ur ON rp.role_id = ur.role_id
                JOIN prava p ON rp.pravo_id = p.id
                WHERE ur.uzivatel_id = ?
                  AND p.kod_prava IN ('CASHBOOK_OVERVIEW_VIEW', 'CASH_BOOK_VIEW', 'CASH_BOOK_MANAGE')
            ");
            $stmt->execute(array($userData['id']));
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $hasPermission = $result['cnt'] > 0;
        }
        
        if (!$hasPermission) {
            return api_error(403, 'Nedostatečná oprávnění');
        }
        
        // 3. Načíst parametry
        $knihaId = (int)$input['kniha_id'];
        $page = isset($input['page']) ? (int)$input['page'] : 1;
        $limit = isset($input['limit']) ? (int)$input['limit'] : 50;
        
        // Validace page/limit
        if ($page < 1) $page = 1;
        if ($limit < 1) $limit = 50;
        if ($limit > 500) $limit = 500;
        $offset = ($page - 1) * $limit;
        
        // 4. Načíst položky - PODLE VZORU Z CashbookEntryModel.php
        $sql = "
            SELECT 
                e.*,
                u.username AS created_by_username,
                CONCAT(u.jmeno, ' ', u.prijmeni) AS created_by_name
            FROM " . TBL_POKLADNI_POLOZKY . " e
            LEFT JOIN " . TBL_UZIVATELE . " u ON e.vytvoril = u.id
            WHERE e.pokladni_kniha_id = ?
              AND e.smazano = 0
            ORDER BY e.datum_zapisu ASC, e.poradi_radku ASC, e.id ASC
            LIMIT " . (int)$limit . " OFFSET " . (int)$offset . "
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array($knihaId));
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 🆕 MULTI-LP: Načíst detail položky pro každý záznam, který má ma_detail = 1
        // (stejná logika jako v handle_cashbook_get_post)
        $entryModel = new CashbookEntryModel($db);
        foreach ($entries as &$entry) {
            if (isset($entry['ma_detail']) && $entry['ma_detail'] == 1) {
                $entry['detail_items'] = $entryModel->getDetailItems($entry['id']);
            } else {
                $entry['detail_items'] = [];
            }
        }
        unset($entry);
        
        // 5. Spočítat celkový počet pro paginaci
        $sqlCount = "
            SELECT COUNT(*) as total
            FROM " . TBL_POKLADNI_POLOZKY . "
            WHERE pokladni_kniha_id = ?
              AND smazano = 0
        ";
        
        $stmtCount = $db->prepare($sqlCount);
        $stmtCount->execute(array($knihaId));
        $countResult = $stmtCount->fetch(PDO::FETCH_ASSOC);
        $totalRecords = (int)$countResult['total'];
        
        // 6. Vrátit response
        return api_ok(array(
            'entries' => $entries,
            'pagination' => array(
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $totalRecords,
                'total_pages' => ceil($totalRecords / $limit)
            ),
            'count' => count($entries)
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbook_overview_entries_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}
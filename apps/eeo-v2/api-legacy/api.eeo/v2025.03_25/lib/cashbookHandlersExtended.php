<?php

/**
 * cashbookHandlersExtended.php
 * Rozšířené handlery pro Cashbook API podle FE požadavků
 * - Přiřazení pokladen
 * - Globální nastavení
 * - Třístavové zamykání
 * PHP 5.6 kompatibilní
 */

require_once __DIR__ . '/../models/CashboxAssignmentModel.php';
require_once __DIR__ . '/../models/GlobalSettingsModel.php';
require_once __DIR__ . '/../middleware/CashbookPermissions.php';

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
                        
                        vytvoril_u.jmeno AS vytvoril_jmeno,
                        vytvoril_u.prijmeni AS vytvoril_prijmeni
                        
                    FROM " . TBL_POKLADNY_UZIVATELE . " pu
                    JOIN " . TBL_UZIVATELE . " u ON u.id = pu.uzivatel_id
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
        
        error_log("UNASSIGN USER: prirazeni_id={$input['prirazeni_id']}, username={$input['username']}");
        
        $db = get_db($config);
        
        // ✅ OPRAVA: správné pořadí parametrů (username, token, db)
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            error_log("UNASSIGN USER: Token verification failed");
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění - pouze CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            error_log("UNASSIGN USER: Permission denied");
            return api_error(403, 'Nedostatečná oprávnění - vyžadováno CASH_BOOK_MANAGE');
        }
        
        // Zkontrolovat existenci přiřazení
        $sqlCheck = "SELECT * FROM " . TBL_POKLADNY_UZIVATELE . " WHERE id = ?";
        $stmt = $db->prepare($sqlCheck);
        $stmt->execute(array($input['prirazeni_id']));
        $prirazeni = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$prirazeni) {
            error_log("UNASSIGN USER: Assignment ID {$input['prirazeni_id']} not found");
            return api_error(404, 'Přiřazení nenalezeno');
        }
        
        error_log("UNASSIGN USER: Found assignment - pokladna_id={$prirazeni['pokladna_id']}, uzivatel_id={$prirazeni['uzivatel_id']}, current platne_do={$prirazeni['platne_do']}");
        
        // ✅ HARD DELETE - skutečné smazání záznamu
        // (soft delete by byl UPDATE platne_do)
        $sqlDelete = "DELETE FROM " . TBL_POKLADNY_UZIVATELE . " WHERE id = ?";
        
        error_log("UNASSIGN USER: SQL DELETE - id={$input['prirazeni_id']}");
        
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

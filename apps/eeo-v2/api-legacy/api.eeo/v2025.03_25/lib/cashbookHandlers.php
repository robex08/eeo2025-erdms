<?php
/**
 * cashbookHandlers.php
 * Handlery pro Cashbook (Pokladní kniha) API
 * Pouze POST/PUT/DELETE metody (ne GET)
 * PHP 5.6 kompatibilní
 */

require_once __DIR__ . '/../models/CashbookModel.php';
require_once __DIR__ . '/../models/CashbookEntryModel.php';
require_once __DIR__ . '/../models/CashbookAuditModel.php';
require_once __DIR__ . '/../services/CashbookService.php';
require_once __DIR__ . '/../services/BalanceCalculator.php';
require_once __DIR__ . '/../services/DocumentNumberService.php';
require_once __DIR__ . '/../middleware/CashbookPermissions.php';
require_once __DIR__ . '/../validators/CashbookValidator.php';
require_once __DIR__ . '/../validators/EntryValidator.php';

// Include necessary functions from handlers.php
if (!function_exists('verify_token_v2')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}

// Include extended handlers (přiřazení pokladen, nastavení, 3-stavové zamykání)
require_once __DIR__ . '/cashbookHandlersExtended.php';

// ===========================================================================
// CASHBOOK BOOKS - Operace s pokladními knihami
// ===========================================================================

/**
 * POST /cashbook-list
 * Získat seznam pokladních knih
 */
function handle_cashbook_list_post($config, $input) {
    try {
        // Ověření tokenu a username
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Načíst filtry z inputu
        $filters = array(
            'uzivatel_id' => isset($input['uzivatel_id']) ? $input['uzivatel_id'] : null,
            'rok' => isset($input['rok']) ? $input['rok'] : null,
            'mesic' => isset($input['mesic']) ? $input['mesic'] : null,
            'uzavrena' => isset($input['uzavrena']) ? $input['uzavrena'] : null,
            'page' => isset($input['page']) ? $input['page'] : 1,
            'limit' => isset($input['limit']) ? $input['limit'] : 50
        );
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        
        // Pokud uživatel nemá oprávnění READ_ALL, může vidět pouze vlastní knihy
        if (!$permissions->canReadCashbook(null)) {
            // Nemá ani OWN oprávnění
            if (!$permissions->canReadCashbook($userData['id'])) {
                return api_error(403, 'Nedostatečná oprávnění');
            }
            // Omezit na vlastní knihy
            $filters['uzivatel_id'] = $userData['id'];
        } elseif (empty($filters['uzivatel_id'])) {
            // Pokud má READ_ALL, ale není specifikován uzivatel_id, zobrazit vlastní
            $filters['uzivatel_id'] = $userData['id'];
        }
        
        // Načíst knihy
        $bookModel = new CashbookModel($db);
        $result = $bookModel->getBooks($filters);
        
        // 🆕 AUTOMATICKÁ OPRAVA NULOVÝCH PŘEVODŮ V SEZNAMU
        foreach ($result['books'] as &$book) {
            if ((floatval($book['prevod_z_predchoziho']) == 0 || $book['prevod_z_predchoziho'] === null) 
                && $book['pokladna_id'] && $book['uzivatel_id']) {
                
                $prevTransfer = $bookModel->getPreviousMonthBalance(
                    $book['uzivatel_id'], 
                    $book['pokladna_id'], 
                    $book['rok'], 
                    $book['mesic']
                );
                
                // Aktualizovat pouze pokud existuje předchozí měsíc s hodnotou > 0
                if ($prevTransfer > 0) {
                    $bookModel->updatePreviousMonthTransfer($book['id'], $prevTransfer);
                    $book['prevod_z_predchoziho'] = number_format($prevTransfer, 2, '.', '');
                    $book['pocatecni_stav'] = number_format($prevTransfer, 2, '.', '');
                }
            }
        }
        unset($book); // Uvolnit referenci
        
        return api_ok($result);
        
    } catch (Exception $e) {
        error_log("handle_cashbook_list_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-get
 * Získat detail pokladní knihy
 */
function handle_cashbook_get_post($config, $input) {
    try {
        // Ověření tokenu
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
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($input['book_id']);
        
        if (!$book) {
            return api_error(404, 'Pokladní kniha nenalezena');
        }
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canReadCashbook($book['uzivatel_id'])) {
            return api_error(403, 'Nedostatečná oprávnění');
        }
        
                // 🆕 PARAMETR force_recalc pro přepočet převodu z předchozího měsíce
        // Použití: Když se změní předchozí měsíc (přidání/úprava položky), 
        // následující měsíc musí přepočítat převod
        $forceRecalc = isset($input['force_recalc']) ? intval($input['force_recalc']) : 0;
        
        // Přepočítat převod pokud:
        // 1. force_recalc = 1 (frontend explicitně žádá přepočet)
        // 2. NEBO prevod_z_predchoziho je 0 nebo NULL (staré záznamy)
        if ($forceRecalc == 1 
            || (floatval($book['prevod_z_predchoziho']) == 0 || $book['prevod_z_predchoziho'] === null)) {
            
            if ($book['pokladna_id'] && $book['uzivatel_id']) {
                $prevTransfer = $bookModel->getPreviousMonthBalance(
                    $book['uzivatel_id'], 
                    $book['pokladna_id'], 
                    $book['rok'], 
                    $book['mesic']
                );
                
                // Načíst položky pro přepočet koncového stavu
                $entryModel = new CashbookEntryModel($db);
                $entries = $entryModel->getEntriesByBookId($book['id'], false);
                
                $totalIncome = 0;
                $totalExpense = 0;
                foreach ($entries as $entry) {
                    if ($entry['castka_prijem']) {
                        $totalIncome += floatval($entry['castka_prijem']);
                    }
                    if ($entry['castka_vydaj']) {
                        $totalExpense += floatval($entry['castka_vydaj']);
                    }
                }
                
                // Vypočítat nový koncový stav
                $koncovyStav = $prevTransfer + $totalIncome - $totalExpense;
                
                // Aktualizovat převod + koncový stav v DB
                $stmt = $db->prepare("
                    UPDATE 25a_pokladni_knihy 
                    SET prevod_z_predchoziho = ?,
                        pocatecni_stav = ?,
                        koncovy_stav = ?
                    WHERE id = ?
                ");
                $stmt->execute(array($prevTransfer, $prevTransfer, $koncovyStav, $book['id']));
                
                // Aktualizovat hodnoty v response
                $book['prevod_z_predchoziho'] = number_format($prevTransfer, 2, '.', '');
                $book['pocatecni_stav'] = number_format($prevTransfer, 2, '.', '');
                $book['koncovy_stav'] = number_format($koncovyStav, 2, '.', '');
            }
        }
        
        // Načíst položky
        $entryModel = new CashbookEntryModel($db);
        $entries = $entryModel->getEntriesByBookId($input['book_id'], false);
        
        // Vypočítat souhrnné hodnoty
        $summary = array(
            'total_income' => 0,
            'total_expense' => 0,
            'final_balance' => $book['koncovy_stav'],
            'entry_count' => count($entries)
        );
        
        foreach ($entries as $entry) {
            if ($entry['castka_prijem']) {
                $summary['total_income'] += floatval($entry['castka_prijem']);
            }
            if ($entry['castka_vydaj']) {
                $summary['total_expense'] += floatval($entry['castka_vydaj']);
            }
        }
        
        return api_ok(array(
            'book' => $book,
            'entries' => $entries,
            'summary' => $summary
        ));
        
    } catch (Exception $e) {
        error_log("handle_cashbook_get_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-create
 * Vytvořit novou pokladní knihu
 */
function handle_cashbook_create_post($config, $input) {
    try {
        // Ověření tokenu
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canCreateBook()) {
            return api_error(403, 'Nedostatečná oprávnění pro vytváření pokladní knihy');
        }
        
        // Validace
        $validator = new CashbookValidator();
        $data = $validator->validateCreate($input);
        
        // Kontrola, zda kniha pro dané období již neexistuje
        $bookModel = new CashbookModel($db);
        $existing = $bookModel->getBookByUserPeriod($data['uzivatel_id'], $data['rok'], $data['mesic']);
        
        if ($existing) {
            return api_error(400, 'Pokladní kniha pro toto období již existuje');
        }
        
        // Vytvořit knihu
        $db->beginTransaction();
        
        try {
            $bookId = $bookModel->createBook($data, $userData['id']);
            
            // Audit log
            $auditModel = new CashbookAuditModel($db);
            $auditModel->logAction('kniha', $bookId, 'vytvoreni', $userData['id'], null, $data);
            
            $db->commit();
            
            return api_ok(array(
                'book_id' => $bookId,
                'message' => 'Pokladní kniha byla úspěšně vytvořena'
            ));
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("handle_cashbook_create_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-update
 * Aktualizovat pokladní knihu
 */
function handle_cashbook_update_post($config, $input) {
    try {
        // Ověření tokenu
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
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($input['book_id']);
        
        if (!$book) {
            return api_error(404, 'Pokladní kniha nenalezena');
        }
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canEditCashbook($book['uzivatel_id'])) {
            return api_error(403, 'Nedostatečná oprávnění');
        }
        
        // Kontrola, že kniha není uzavřená
        if ($book['uzavrena'] == 1) {
            return api_error(400, 'Pokladní kniha je uzavřená a nelze ji upravovat');
        }
        
        // Validace
        $validator = new CashbookValidator();
        $data = $validator->validateUpdate($input);
        
        // Aktualizovat
        $db->beginTransaction();
        
        try {
            $bookModel->updateBook($input['book_id'], $data, $userData['id']);
            
            // 🆕 KASKÁDOVÝ PŘEPOČET: Pokud se změnil koncový stav, přepočítat všechny následující měsíce
            if (isset($data['koncovy_stav']) && $book['pokladna_id'] && $book['uzivatel_id']) {
                $updatedMonths = $bookModel->recalculateFollowingMonths(
                    $book['uzivatel_id'],
                    $book['pokladna_id'],
                    $book['rok'],
                    $book['mesic']
                );
                error_log("Kaskádový přepočet: aktualizováno $updatedMonths následujících měsíců");
            }
            
            // Audit log
            $auditModel = new CashbookAuditModel($db);
            $auditModel->logAction('kniha', $input['book_id'], 'uprava', $userData['id'], $book, $data);
            
            $db->commit();
            
            return api_ok(array('message' => 'Pokladní kniha byla úspěšně aktualizována'));
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("handle_cashbook_update_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-close
 * Uzavřít pokladní knihu uživatelem (nový 3-stavový systém)
 * Podporuje parametr 'akce': 'uzavrit_mesic' (uživatel) nebo 'zamknout_spravcem' (admin)
 */
function handle_cashbook_close_post($config, $input) {
    try {
        // Ověření tokenu
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
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($input['book_id']);
        
        if (!$book) {
            return api_error(404, 'Pokladní kniha nenalezena');
        }
        
        // Určit akci (zpětná kompatibilita: pokud není 'akce', použít uzavrit_mesic)
        $akce = isset($input['akce']) ? $input['akce'] : 'uzavrit_mesic';
        
        $db->beginTransaction();
        
        try {
            $service = new CashbookService($db);
            
            if ($akce === 'zamknout_spravcem') {
                // Kontrola oprávnění - pouze admin
                $permissions = new CashbookPermissions($userData, $db);
                if (!$permissions->canManageCashbooks()) {
                    return api_error(403, 'Nedostatečná oprávnění - pouze správce může zamykat knihy');
                }
                
                $result = $service->lockBookByAdmin($input['book_id'], $userData['id']);
            } else {
                // uzavrit_mesic - uživatel uzavírá měsíc
                // Kontrola oprávnění podle pokladny
                $permissions = new CashbookPermissions($userData, $db);
                if (!$permissions->canCloseBook($book['pokladna_id'])) {
                    return api_error(403, 'Nemáte oprávnění uzavřít tento měsíc');
                }
                
                $result = $service->closeBookByUser($input['book_id'], $userData['id']);
            }
            
            $db->commit();
            
            // === PŘEPOČET LIMITOVANÝCH PŘÍSLIBŮ ===
            // Pokud kniha byla uzavřena, přepočítat LP z položek
            if ($akce === 'uzavrit_mesic' || $akce === 'zamknout_spravcem') {
                // Získat všechna LP použitá v položkách této knihy
                $sql_lp = "
                    SELECT DISTINCT limitovana_prisliba 
                    FROM 25_pokladna_polozky 
                    WHERE pokladna_id = :book_id
                    AND limitovana_prisliba IS NOT NULL
                    AND limitovana_prisliba != ''
                ";
                
                $stmt_lp = $db->prepare($sql_lp);
                $stmt_lp->bindValue(':book_id', $input['book_id']);
                $stmt_lp->execute();
                
                // Přepočítat každé LP
                while ($row_lp = $stmt_lp->fetch(PDO::FETCH_ASSOC)) {
                    prepocetCerpaniPodleCislaLP($db, $row_lp['limitovana_prisliba']);
                }
            }
            
            return api_ok($result);
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("handle_cashbook_close_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-reopen
 * Odemknout knihu správcem (nový 3-stavový systém)
 * Pouze správce může odemykat
 */
function handle_cashbook_reopen_post($config, $input) {
    try {
        // Ověření tokenu
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
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($input['book_id']);
        
        if (!$book) {
            return api_error(404, 'Pokladní kniha nenalezena');
        }
        
        $bookStatus = $book['stav_knihy'];
        $pokladnaId = $book['pokladna_id'];
        
        // Kontrola, zda je kniha uzavřená nebo zamčená
        if ($bookStatus === 'aktivni') {
            return api_error(400, 'Pokladní kniha již je aktivní');
        }
        
        if ($bookStatus !== 'uzavrena_uzivatelem' && $bookStatus !== 'zamknuta_spravcem') {
            return api_error(400, 'Neplatný stav knihy pro odemykání: ' . $bookStatus);
        }
        
        // Kontrola oprávnění podle stavu knihy
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canReopenBook($bookStatus, $pokladnaId)) {
            if ($bookStatus === 'zamknuta_spravcem') {
                return api_error(403, 'Kniha je zamčená správcem. Kontaktujte administrátora.');
            } else {
                return api_error(403, 'Nemáte oprávnění otevřít tento měsíc');
            }
        }
        
        // Odemknout
        $db->beginTransaction();
        
        try {
            $service = new CashbookService($db);
            $result = $service->unlockBook($input['book_id'], $userData['id']);
            
            $db->commit();
            
            return api_ok($result);
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("handle_cashbook_reopen_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

// ===========================================================================
// CASHBOOK ENTRIES - Operace s položkami pokladní knihy
// ===========================================================================

/**
 * POST /cashbook-entry-create
 * Vytvořit novou položku v pokladní knize
 */
function handle_cashbook_entry_create_post($config, $input) {
    try {
        // Ověření tokenu
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
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($input['book_id']);
        
        if (!$book) {
            return api_error(404, 'Pokladní kniha nenalezena');
        }
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canCreateEntry()) {
            return api_error(403, 'Nedostatečná oprávnění pro vytváření položek');
        }
        
        if (!$permissions->canEditCashbook($book['uzivatel_id'])) {
            return api_error(403, 'Nedostatečná oprávnění pro editaci této knihy');
        }
        
        // Validace
        $validator = new EntryValidator();
        $data = $validator->validateCreate($input);
        
        // Vytvořit položku
        $db->beginTransaction();
        
        try {
            $service = new CashbookService($db);
            $entryId = $service->createEntry($input['book_id'], $data, $userData['id']);
            
            // Načíst vytvořenou položku
            $entryModel = new CashbookEntryModel($db);
            $entry = $entryModel->getEntryById($entryId);
            
            // 🆕 KASKÁDOVÝ PŘEPOČET: Položka mění koncový stav → přepočítat následující měsíce
            if ($book['pokladna_id'] && $book['uzivatel_id']) {
                $bookModel = new CashbookModel($db);
                $bookModel->recalculateFollowingMonths(
                    $book['uzivatel_id'],
                    $book['pokladna_id'],
                    $book['rok'],
                    $book['mesic']
                );
            }
            
            $db->commit();
            
            return api_ok(array(
                'entry_id' => $entryId,
                'entry' => $entry,
                'message' => 'Položka byla úspěšně vytvořena'
            ));
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("handle_cashbook_entry_create_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-entry-update
 * Aktualizovat položku
 */
function handle_cashbook_entry_update_post($config, $input) {
    try {
        // Ověření tokenu
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['entry_id'])) {
            return api_error(400, 'Chybí entry_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Načíst položku
        $entryModel = new CashbookEntryModel($db);
        $entry = $entryModel->getEntryById($input['entry_id']);
        
        if (!$entry) {
            return api_error(404, 'Položka nenalezena');
        }
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($entry['pokladni_kniha_id']);
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canEditCashbook($book['uzivatel_id'])) {
            return api_error(403, 'Nedostatečná oprávnění');
        }
        
        // Validace
        $validator = new EntryValidator();
        $data = $validator->validateUpdate($input);
        
        // Aktualizovat
        $db->beginTransaction();
        
        try {
            $service = new CashbookService($db);
            $service->updateEntry($input['entry_id'], $data, $userData['id']);
            
            // Načíst aktualizovanou položku
            $updatedEntry = $entryModel->getEntryById($input['entry_id']);
            
            // 🆕 KASKÁDOVÝ PŘEPOČET: Úprava položky mění koncový stav → přepočítat následující měsíce
            if ($book['pokladna_id'] && $book['uzivatel_id']) {
                $bookModel->recalculateFollowingMonths(
                    $book['uzivatel_id'],
                    $book['pokladna_id'],
                    $book['rok'],
                    $book['mesic']
                );
            }
            
            $db->commit();
            
            return api_ok(array(
                'entry' => $updatedEntry,
                'message' => 'Položka byla úspěšně aktualizována'
            ));
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("handle_cashbook_entry_update_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * DELETE /cashbook-entry-delete nebo POST /cashbook-entry-delete
 * Smazat položku (soft delete)
 */
function handle_cashbook_entry_delete_post($config, $input) {
    try {
        // Ověření tokenu
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['entry_id'])) {
            return api_error(400, 'Chybí entry_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Načíst položku
        $entryModel = new CashbookEntryModel($db);
        $entry = $entryModel->getEntryById($input['entry_id']);
        
        if (!$entry) {
            return api_error(404, 'Položka nenalezena');
        }
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($entry['pokladni_kniha_id']);
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canDeleteEntry($book['uzivatel_id'])) {
            return api_error(403, 'Nedostatečná oprávnění pro mazání');
        }
        
        // Smazat
        $db->beginTransaction();
        
        try {
            $service = new CashbookService($db);
            $service->deleteEntry($input['entry_id'], $userData['id']);
            
            // 🆕 KASKÁDOVÝ PŘEPOČET: Smazání položky mění koncový stav → přepočítat následující měsíce
            if ($book['pokladna_id'] && $book['uzivatel_id']) {
                $bookModel->recalculateFollowingMonths(
                    $book['uzivatel_id'],
                    $book['pokladna_id'],
                    $book['rok'],
                    $book['mesic']
                );
            }
            
            $db->commit();
            
            return api_ok(array('message' => 'Položka byla úspěšně smazána'));
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("handle_cashbook_entry_delete_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-entry-restore
 * Obnovit smazanou položku
 */
function handle_cashbook_entry_restore_post($config, $input) {
    try {
        // Ověření tokenu
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['entry_id'])) {
            return api_error(400, 'Chybí entry_id');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Načíst položku
        $entryModel = new CashbookEntryModel($db);
        $entry = $entryModel->getEntryById($input['entry_id']);
        
        if (!$entry) {
            return api_error(404, 'Položka nenalezena');
        }
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($entry['pokladni_kniha_id']);
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canEditCashbook($book['uzivatel_id'])) {
            return api_error(403, 'Nedostatečná oprávnění');
        }
        
        // Obnovit
        $db->beginTransaction();
        
        try {
            $service = new CashbookService($db);
            $service->restoreEntry($input['entry_id'], $userData['id']);
            
            $db->commit();
            
            return api_ok(array('message' => 'Položka byla úspěšně obnovena'));
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("handle_cashbook_entry_restore_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-audit-log
 * Získat audit log pro knihu
 */
function handle_cashbook_audit_log_post($config, $input) {
    try {
        // Ověření tokenu
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
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($input['book_id']);
        
        if (!$book) {
            return api_error(404, 'Pokladní kniha nenalezena');
        }
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canReadCashbook($book['uzivatel_id'])) {
            return api_error(403, 'Nedostatečná oprávnění');
        }
        
        // Načíst audit log
        $limit = isset($input['limit']) ? intval($input['limit']) : 100;
        $auditModel = new CashbookAuditModel($db);
        $auditLog = $auditModel->getBookAuditLog($input['book_id'], $limit);
        
        return api_ok(array('audit_log' => $auditLog));
        
    } catch (Exception $e) {
        error_log("handle_cashbook_audit_log_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

// ===========================================================================
// FORCE RENUMBER - Admin přepočet pořadí dokladů
// ===========================================================================

/**
 * POST /cashbook-force-renumber
 * FORCE PŘEPOČET pořadí dokladů v roce pro danou pokladnu
 * ⚠️ NEBEZPEČNÁ OPERACE - pouze pro admin s CASH_BOOK_MANAGE
 * 
 * Přečísluje VŠECHNY doklady (VPD i PPD) v daném roce včetně uzavřených
 * a zamčených měsíců. Nelze vrátit zpět!
 * 
 * Použití:
 * - Oprava chyb po testování
 * - Oprava po změně vpd_od_cislo / ppd_od_cislo
 * - Oprava po manuálním zásahu do DB
 */
function handle_cashbook_force_renumber_post($config, $input) {
    try {
        // Ověření tokenu
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['pokladna_id'])) {
            return api_error(400, 'Chybí pokladna_id');
        }
        
        if (empty($input['year'])) {
            return api_error(400, 'Chybí year');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // ⚠️ KRITICKÁ KONTROLA - pouze admin s CASH_BOOK_MANAGE
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canManageCashbooks()) {
            return api_error(403, 'Nemáte oprávnění k této operaci. Pouze administrátor může spustit force přepočet.');
        }
        
        $pokladnaId = intval($input['pokladna_id']);
        $year = intval($input['year']);
        
        // Validace roku
        if ($year < 2020 || $year > 2030) {
            return api_error(400, 'Neplatný rok. Povolený rozsah: 2020-2030');
        }
        
        // Spustit force přepočet
        require_once __DIR__ . '/../services/CashbookRenumberService.php';
        $renumberService = new CashbookRenumberService($db);
        
        $result = $renumberService->forceRenumberAllDocuments($pokladnaId, $year, $userData['id']);
        
        // Service vrací array s 'status', musíme použít správnou response funkci
        if ($result['status'] === 'ok') {
            return api_ok($result['data']);
        } else {
            return api_error(500, $result['message']);
        }
        
    } catch (Exception $e) {
        error_log("handle_cashbook_force_renumber_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}


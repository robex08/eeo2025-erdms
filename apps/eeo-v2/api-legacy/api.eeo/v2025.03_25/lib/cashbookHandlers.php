<?php

/**
 * cashbookHandlers.php
 * Handlery pro Cashbook (Pokladní kniha) API
 * Pouze POST/PUT/DELETE metody (ne GET)
 * PHP 5.6 kompatibilní
 */

require_once __DIR__ . '/queries.php'; // Table name constants
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
        
        // Kontrola oprávnění - předat i pokladna_id pro kontrolu přiřazení
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canReadCashbook($book['uzivatel_id'], $book['pokladna_id'])) {
            return api_error(403, 'Nedostatečná oprávnění');
        }
        
        // 🆕 Kontrola platnosti přiřazení pokladny - uživatel nesmí přistoupit k měsíci před datem přiřazení
        if ($book['uzivatel_id'] == $userData['id']) {
            $stmt = $db->prepare("
                SELECT platne_od, platne_do
                FROM " . TBL_POKLADNY_UZIVATELE . "
                WHERE uzivatel_id = ? 
                  AND pokladna_id = ?
                  AND (platne_do IS NULL OR platne_do >= CURDATE())
                ORDER BY platne_od ASC
                LIMIT 1
            ");
            $stmt->execute(array($userData['id'], $book['pokladna_id']));
            $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($assignment && $assignment['platne_od']) {
                // Vytvořit datum posledního dne požadovaného měsíce
                $requestedMonthEnd = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $book['rok'], $book['mesic'])));
                
                // Pokud je celý požadovaný měsíc před datem přiřazení, zamítnout
                // (např. měsíc končí 2026-01-31, přiřazení od 2026-02-01 → zamítnout)
                if ($requestedMonthEnd < $assignment['platne_od']) {
                    return api_error(403, 'Nemáte oprávnění k této pokladně v daném období. Pokladna vám byla přiřazena až od ' . date('j.n.Y', strtotime($assignment['platne_od'])));
                }
            }
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
        
        // 🆕 MULTI-LP: Načíst detail položky pro každý záznam, který má ma_detail = 1
        foreach ($entries as &$entry) {
            if (isset($entry['ma_detail']) && $entry['ma_detail'] == 1) {
                $entry['detail_items'] = $entryModel->getDetailItems($entry['id']);
            } else {
                $entry['detail_items'] = [];
            }
        }
        unset($entry);
        
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
        
        // Validace dat nejdříve (potřebujeme pokladna_id)
        $validator = new CashbookValidator();
        $data = $validator->validateCreate($input);
        
        // Kontrola oprávnění - nyní s pokladna_id pro kontrolu přiřazení
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canCreateBook($data['pokladna_id'])) {
            return api_error(403, 'Nedostatečná oprávnění pro vytváření pokladní knihy. Musíte mít oprávnění CASH_BOOK_CREATE nebo být přiřazeni k této pokladně.');
        }
        
        // 🆕 Kontrola platnosti přiřazení - nelze vytvořit knihu pro měsíc před přiřazením pokladny
        if ($data['uzivatel_id'] == $userData['id'] && isset($data['pokladna_id'])) {
            $stmt = $db->prepare("
                SELECT platne_od, platne_do
                FROM " . TBL_POKLADNY_UZIVATELE . "
                WHERE uzivatel_id = ? 
                  AND pokladna_id = ?
                  AND (platne_do IS NULL OR platne_do >= CURDATE())
                ORDER BY platne_od ASC
                LIMIT 1
            ");
            $stmt->execute(array($userData['id'], $data['pokladna_id']));
            $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($assignment && $assignment['platne_od']) {
                $requestedMonthStart = sprintf('%04d-%02d-01', $data['rok'], $data['mesic']);
                
                if ($requestedMonthStart < $assignment['platne_od']) {
                    return api_error(403, 'Nelze vytvořit pokladní knihu pro měsíc před přiřazením pokladny. Pokladna vám byla přiřazena až od ' . date('j.n.Y', strtotime($assignment['platne_od'])));
                }
            }
        }
        
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
        if (!$permissions->canEditCashbook($book['uzivatel_id'], $book['pokladna_id'])) {
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
            
            // === PŘEPOČET LIMITOVANÝCH PŘÍSLIBŮ ===
            // ✅ LP přepočty jsou nyní automatické v background tasků
            // Tato funkcionalita je nyní řešena v limitovanePrislibyCerpaniHandlers_v2_pdo.php
            
            // Commit transakce až po všech operacích
            $db->commit();
            
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
 * 🆕 MULTI-LP SUPPORT: Pokud input obsahuje 'detail_items', vytvoří multi-LP záznam
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
        
        if (!$permissions->canEditCashbook($book['uzivatel_id'], $book['pokladna_id'])) {
            return api_error(403, 'Nedostatečná oprávnění pro editaci této knihy');
        }
        
        // ✅ KONTROLA LP KÓDU POVINNOSTI podle nastavení pokladny
        $lpKodPovinny = isset($book['pokladna_lp_kod_povinny']) && ($book['pokladna_lp_kod_povinny'] == 1 || $book['pokladna_lp_kod_povinny'] === '1');
        $isExpense = isset($input['castka_vydaj']) && floatval($input['castka_vydaj']) > 0;
        $hasDetailItems = isset($input['detail_items']) && is_array($input['detail_items']) && !empty($input['detail_items']);
        
        // Pokud je LP povinný a jde o výdaj bez detail položek, musí mít LP kód
        if ($lpKodPovinny && $isExpense && !$hasDetailItems && empty($input['lp_kod'])) {
            return api_error(400, 'LP kód je povinný u výdajů pro tuto pokladnu');
        }
        
        // Pokud má detail položky a LP je povinný, všechny musí mít LP kód
        if ($lpKodPovinny && $hasDetailItems) {
            foreach ($input['detail_items'] as $idx => $item) {
                if (empty($item['lp_kod'])) {
                    return api_error(400, 'LP kód je povinný u všech detail položek pro tuto pokladnu');
                }
            }
        }
        
        // 🆕 DETEKCE MULTI-LP: Pokud existuje detail_items, použít nový flow
        $hasDetailItems = isset($input['detail_items']) && is_array($input['detail_items']) && !empty($input['detail_items']);
        
        $entryModel = new CashbookEntryModel($db);
        
        if ($hasDetailItems) {
            // 🆕 MULTI-LP FLOW - model má vlastní transakci
            $validator = new EntryValidator($db);
            
            // ✅ FIX: Předat lpKodPovinny flag do validátoru
            $validation = $validator->validateEntryWithDetails($input, $input['detail_items'], (int)$book['rok'], $lpKodPovinny);
            
            if (!$validation['valid']) {
                return api_error(400, 'Validace selhala: ' . implode(', ', $validation['errors']));
            }
            
            // Varování logovat (ne blokovat)
            if (!empty($validation['warnings'])) {
                error_log("LP warnings: " . implode(', ', $validation['warnings']));
            }
            
            // 🔧 Vygenerovat číslo dokladu a pořadové číslo
            require_once __DIR__ . '/../services/DocumentNumberService.php';
            $docNumberService = new DocumentNumberService($db);
            $docNumberData = $docNumberService->generateDocumentNumber(
                $input['book_id'],
                $input['typ_dokladu'],
                $input['datum_zapisu'],
                $book['uzivatel_id']
            );
            
            // 🔧 Vypočítat zůstatek po operaci
            require_once __DIR__ . '/../services/BalanceCalculator.php';
            $balanceCalculator = new BalanceCalculator($db);
            // ✅ OPRAVA: Spočítat celkovou částku z detail_items (ne z frontendu)
            $amount = array_sum(array_column($input['detail_items'], 'castka'));
            $balance = $balanceCalculator->calculateNewEntryBalance(
                $input['book_id'],
                $amount,
                $input['typ_dokladu'],
                $input['datum_zapisu']
            );
            
            // 🔧 OPRAVA: Mapovat book_id → pokladni_kniha_id + přidat vše potřebné
            $masterData = array_merge($input, [
                'pokladni_kniha_id' => $input['book_id'],
                'cislo_dokladu' => $docNumberData['cislo_dokladu'],
                'cislo_poradi_v_roce' => $docNumberData['cislo_poradi_v_roce'],
                'zustatek_po_operaci' => $balance,
                'castka_prijem' => $input['typ_dokladu'] === 'prijem' ? $amount : null,
                'castka_vydaj' => $input['typ_dokladu'] === 'vydaj' ? $amount : null
            ]);
            
            // Vytvořit master + details (model má vlastní transakci)
            $entryId = $entryModel->createEntryWithDetails($masterData, $input['detail_items'], $userData['id']);
            
        } else {
            // PŮVODNÍ FLOW (zpětná kompatibilita) - služba má vlastní transakci
            $validator = new EntryValidator();
            $data = $validator->validateCreate($input);
            
            $service = new CashbookService($db);
            $entryId = $service->createEntry($input['book_id'], $data, $userData['id']);
        }
        
        // Načíst vytvořenou položku
        if ($hasDetailItems) {
            $entryData = $entryModel->getEntryWithDetails($entryId);
            // Transformovat do flat struktury
            $entry = array_merge($entryData['master'], [
                'detail_items' => $entryData['details']
            ]);
        } else {
            $entry = $entryModel->getEntryById($entryId);
        }
        
        // 🆕 KASKÁDOVÝ PŘEPOČET
        if ($book['pokladna_id'] && $book['uzivatel_id']) {
            $bookModel->recalculateFollowingMonths(
                $book['uzivatel_id'],
                $book['pokladna_id'],
                $book['rok'],
                $book['mesic']
            );
        }
        
        return api_ok([
            'entry_id' => $entryId,
            'entry' => $entry,
            'has_details' => $hasDetailItems,
            'message' => 'Položka byla úspěšně vytvořena'
        ]);
        
    } catch (Exception $e) {
        error_log("handle_cashbook_entry_create_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-entry-update
 * Aktualizovat položku
 * 🆕 MULTI-LP SUPPORT: Pokud input obsahuje 'detail_items', aktualizuje multi-LP záznam
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
        if (!$permissions->canEditCashbook($book['uzivatel_id'], $book['pokladna_id'])) {
            return api_error(403, 'Nedostatečná oprávnění');
        }
        
        // ✅ KONTROLA LP KÓDU POVINNOSTI podle nastavení pokladny
        $lpKodPovinny = isset($book['pokladna_lp_kod_povinny']) && ($book['pokladna_lp_kod_povinny'] == 1 || $book['pokladna_lp_kod_povinny'] === '1');
        $isExpense = isset($input['castka_vydaj']) && floatval($input['castka_vydaj']) > 0;
        $hasDetailItems = isset($input['detail_items']) && is_array($input['detail_items']) && !empty($input['detail_items']);
        
        // Pokud je LP povinný a jde o výdaj bez detail položek, musí mít LP kód
        if ($lpKodPovinny && $isExpense && !$hasDetailItems && empty($input['lp_kod'])) {
            return api_error(400, 'LP kód je povinný u výdajů pro tuto pokladnu');
        }
        
        // Pokud má detail položky a LP je povinný, všechny musí mít LP kód
        if ($lpKodPovinny && $hasDetailItems) {
            foreach ($input['detail_items'] as $idx => $item) {
                if (empty($item['lp_kod'])) {
                    return api_error(400, 'LP kód je povinný u všech detail položek pro tuto pokladnu');
                }
            }
        }
        
        // 🆕 DETEKCE MULTI-LP: Pokud existuje detail_items klíč (i když prázdné pole), použít multi-LP flow
        // ✅ FIX: Prázdné pole [] znamená "smazat detail položky", ne "použít starý flow"
        $hasDetailItemsKey = isset($input['detail_items']) && is_array($input['detail_items']);
        
        // Aktualizovat
        if ($hasDetailItemsKey) {
            // 🆕 MULTI-LP UPDATE - model má vlastní transakci (i pro prázdné pole)
            $validator = new EntryValidator($db);
            
            // ✅ FIX: Předat lpKodPovinny flag do validátoru
            $validation = $validator->validateEntryWithDetails($input, $input['detail_items'], (int)$book['rok'], $lpKodPovinny);
            
            if (!$validation['valid']) {
                return api_error(400, 'Validace selhala: ' . implode(', ', $validation['errors']));
            }
            
            if (!empty($validation['warnings'])) {
                error_log("LP warnings: " . implode(', ', $validation['warnings']));
            }
            
            // ✅ FIX: Pokud je detail_items prázdné, NEMĚNIT částku - použít původní z payloadu
            // Prázdné detail_items = "smazat rozpad LP", ale zachovat původní částku
            if (empty($input['detail_items'])) {
                // Použít částky z payloadu (původní hodnoty)
                $masterData = array_merge($input, [
                    'pokladni_kniha_id' => $input['book_id']
                ]);
            } else {
                // ✅ OPRAVA: Spočítat celkovou částku z detail_items a nastavit správně castka_prijem/castka_vydaj
                $amount = array_sum(array_column($input['detail_items'], 'castka'));
                
                // 🔧 OPRAVA: Mapovat book_id → pokladni_kniha_id pro model + nastavit správné částky
                $masterData = array_merge($input, [
                    'pokladni_kniha_id' => $input['book_id'],
                    'castka_prijem' => $input['typ_dokladu'] === 'prijem' ? $amount : null,
                    'castka_vydaj' => $input['typ_dokladu'] === 'vydaj' ? $amount : null
                ]);
            }
            
            // Update master + details (model má vlastní transakci)
            $entryModel->updateEntryWithDetails($input['entry_id'], $masterData, $input['detail_items'], $userData['id']);
            $entryData = $entryModel->getEntryWithDetails($input['entry_id']);
            
            // Transformovat do flat struktury
            $updatedEntry = array_merge($entryData['master'], [
                'detail_items' => $entryData['details']
            ]);
            
        } else {
            // PŮVODNÍ FLOW - služba má vlastní transakci
            $validator = new EntryValidator();
            $data = $validator->validateUpdate($input);
            
            $service = new CashbookService($db);
            $service->updateEntry($input['entry_id'], $data, $userData['id']);
            $updatedEntry = $entryModel->getEntryById($input['entry_id']);
        }
        
        // 🆕 KASKÁDOVÝ PŘEPOČET
        if ($book['pokladna_id'] && $book['uzivatel_id']) {
            $bookModel->recalculateFollowingMonths(
                $book['uzivatel_id'],
                $book['pokladna_id'],
                $book['rok'],
                $book['mesic']
            );
        }
        
        // ✅ FIX: Přepočítat čerpání LP kódů po změně detail položek
        require_once __DIR__ . '/../services/LPCalculationService.php';
        $lpService = new LPCalculationService($db);
        $lpService->recalculateLPForUserYear($book['uzivatel_id'], $book['rok']);
        
        return api_ok(array(
            'entry' => $updatedEntry,
            'message' => 'Položka byla úspěšně aktualizována'
        ));
        
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
        error_log("🔍 cashbook-entry-delete START");
        error_log("  - entry_id: " . ($input['entry_id'] ?? 'MISSING'));
        error_log("  - username: " . ($input['username'] ?? 'MISSING'));
        
        // Ověření tokenu
        if (empty($input['username']) || empty($input['token'])) {
            error_log("❌ Missing username or token");
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['entry_id'])) {
            error_log("❌ Missing entry_id");
            return api_error(400, 'Chybí entry_id');
        }
        
        $db = get_db($config);
        error_log("✓ DB connection OK");
        
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            error_log("❌ Invalid token for user: " . $input['username']);
            return api_error(401, 'Neplatný token');
        }
        
        error_log("✓ Token verified - user_id: " . $userData['id']);
        error_log("✓ Token verified - user_id: " . $userData['id']);
        
        // Načíst položku
        $entryModel = new CashbookEntryModel($db);
        $entry = $entryModel->getEntryById($input['entry_id']);
        
        if (!$entry) {
            error_log("❌ Entry not found: " . $input['entry_id']);
            return api_error(404, 'Položka nenalezena');
        }
        
        error_log("✓ Entry loaded - kniha_id: " . $entry['pokladni_kniha_id']);
        
        // Načíst knihu
        $bookModel = new CashbookModel($db);
        $book = $bookModel->getBookById($entry['pokladni_kniha_id']);
        
        if (!$book) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Book not found']);
            exit;
        }
        
        error_log("✓ Book loaded - stav: " . $book['stav_knihy']);
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        if (!$permissions->canDeleteEntry($book['uzivatel_id'])) {
            error_log("❌ Permission denied for user_id: " . $userData['id']);
            return api_error(403, 'Nedostatečná oprávnění pro mazání');
        }
        
        error_log("✓ Permissions OK - starting delete");
        
        // Smazat
        $db->beginTransaction();
        
        try {
            $service = new CashbookService($db);
            $service->deleteEntry($input['entry_id'], $userData['id']);
            
            error_log("✓ Entry deleted successfully");
            
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
        error_log("Stack trace: " . $e->getTraceAsString());
        
        // DEBUG: Vracíme detailní chybu včetně souboru a řádku
        return api_error(500, 'Chyba při mazání: ' . $e->getMessage() . ' (soubor: ' . basename($e->getFile()) . ':' . $e->getLine() . ')');
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
        if (!$permissions->canEditCashbook($book['uzivatel_id'], $book['pokladna_id'])) {
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
        if (!$permissions->canReadCashbook($book['uzivatel_id'], $book['pokladna_id'])) {
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

// ===========================================================================
// LP CALCULATION - Přepočet čerpání LP kódů
// ===========================================================================

/**
 * POST /cashbook-lp-summary
 * Získat přehled čerpání LP kódů včetně multi-LP položek
 * 
 * Input:
 * - username, token (auth)
 * - user_id (volitelné, default = přihlášený uživatel)
 * - year (volitelné, default = aktuální rok)
 */
function handle_cashbook_lp_summary_post($config, $input) {
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
        
        // Parametry
        $year = isset($input['year']) ? intval($input['year']) : intval(date('Y'));
        
        // Zjistit oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        
        // Určit režim zobrazení podle oprávnění
        $viewMode = 'own'; // Default: jen vlastní knihy
        $filterUserId = $userData['id'];
        $filterUsekId = null;
        
        // 1. ADMIN nebo CASH_BOOK_MANAGE nebo CASH_BOOK_READ_ALL - vidí VŠE
        $isSuperAdmin = isset($userData['super_admin']) && $userData['super_admin'] == 1;
        $hasManage = $permissions->hasPermission('CASH_BOOK_MANAGE');
        $hasReadAll = $permissions->hasPermission('CASH_BOOK_READ_ALL');
        
        if ($isSuperAdmin || $hasManage || $hasReadAll) {
            $viewMode = 'all';
            $filterUserId = null; // Null = všichni uživatelé
        }
        // 2. Příkazce (PRIKAZCE_OPERACE) - vidí všechny LP kódy v rámci svého úseku
        else if ($permissions->hasRole('PRIKAZCE_OPERACE')) {
            $viewMode = 'department';
            $filterUsekId = isset($userData['usek_id']) ? $userData['usek_id'] : null;
            $filterUserId = null;
        }
        // 3. Běžný uživatel - vidí jen své knihy
        else {
            $viewMode = 'own';
            $filterUserId = $userData['id'];
        }
        
        require_once __DIR__ . '/../services/LPCalculationService.php';
        $lpService = new LPCalculationService($db);
        
        // Získat přehled čerpání LP podle režimu
        $summary = $lpService->getLPSummaryWithLimits($filterUserId, $year, $viewMode, $filterUsekId);
        
        return api_ok([
            'view_mode' => $viewMode,
            'filter_user_id' => $filterUserId,
            'filter_usek_id' => $filterUsekId,
            'year' => $year,
            'lp_summary' => $summary,
            'count' => count($summary)
        ]);
        
    } catch (Exception $e) {
        error_log("handle_cashbook_lp_summary_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

/**
 * POST /cashbook-lp-detail
 * Získat detailní rozpis čerpání konkrétního LP kódu
 * 
 * Input:
 * - username, token (auth)
 * - lp_kod (povinné)
 * - user_id (volitelné)
 * - year (volitelné)
 */
function handle_cashbook_lp_detail_post($config, $input) {
    try {
        // Ověření tokenu
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        if (empty($input['lp_kod'])) {
            return api_error(400, 'Chybí lp_kod');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Parametry
        $lpKod = $input['lp_kod'];
        $userId = isset($input['user_id']) ? intval($input['user_id']) : $userData['id'];
        $year = isset($input['year']) ? intval($input['year']) : intval(date('Y'));
        
        // Kontrola oprávnění
        $permissions = new CashbookPermissions($userData, $db);
        if ($userId !== $userData['id'] && !$permissions->canReadCashbook($userId)) {
            return api_error(403, 'Nedostatečná oprávnění');
        }
        
        require_once __DIR__ . '/../services/LPCalculationService.php';
        $lpService = new LPCalculationService($db);
        
        // Získat detail čerpání
        $detail = $lpService->getLPDetail($lpKod, $userId, $year);
        
        // Spočítat celkem
        $celkem = 0;
        foreach ($detail as $item) {
            $celkem += floatval($item['castka']);
        }
        
        return api_ok([
            'lp_kod' => $lpKod,
            'user_id' => $userId,
            'year' => $year,
            'celkem_vydano' => $celkem,
            'pocet_zaznamu' => count($detail),
            'detail' => $detail
        ]);
        
    } catch (Exception $e) {
        error_log("handle_cashbook_lp_detail_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}


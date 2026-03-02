<?php
/**
 * CashbookService.php
 * Hlavní service pro business logiku pokladních knih
 * PHP 5.6 kompatibilní
 */

require_once __DIR__ . '/../models/CashbookModel.php';
require_once __DIR__ . '/../models/CashbookEntryModel.php';
require_once __DIR__ . '/../models/CashbookAuditModel.php';
require_once __DIR__ . '/BalanceCalculator.php';
require_once __DIR__ . '/DocumentNumberService.php';

class CashbookService {
    
    private $db;
    private $bookModel;
    private $entryModel;
    private $auditModel;
    private $balanceCalculator;
    private $docNumberService;
    
    public function __construct($db) {
        $this->db = $db;
        $this->bookModel = new CashbookModel($db);
        $this->entryModel = new CashbookEntryModel($db);
        $this->auditModel = new CashbookAuditModel($db);
        $this->balanceCalculator = new BalanceCalculator($db);
        $this->docNumberService = new DocumentNumberService($db);
    }
    
    /**
     * Vytvořit novou položku v knize
     */
    public function createEntry($bookId, $data, $userId) {
        try {
            // Načíst knihu
            $book = $this->bookModel->getBookById($bookId);
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            // Kontrola, že kniha není uzavřená
            if ($book['stav_knihy'] != 'aktivni') {
                throw new Exception('Pokladní kniha je uzavřená a nelze ji upravovat (stav: ' . $book['stav_knihy'] . ')');
            }
            
            // Validace - musí být buď příjem nebo výdaj
            if (empty($data['castka_prijem']) && empty($data['castka_vydaj'])) {
                throw new Exception('Musí být uvedena částka příjmu nebo výdaje');
            }
            if (!empty($data['castka_prijem']) && !empty($data['castka_vydaj'])) {
                throw new Exception('Nelze uvést zároveň příjem i výdaj');
            }
            
            // Určit typ
            $type = !empty($data['castka_prijem']) ? 'prijem' : 'vydaj';
            $amount = !empty($data['castka_prijem']) ? $data['castka_prijem'] : $data['castka_vydaj'];
            
            // Vygenerovat číslo dokladu (vrací array s cislo_dokladu a cislo_poradi_v_roce)
            $docNumberData = $this->docNumberService->generateDocumentNumber(
                $bookId, 
                $type, 
                $data['datum_zapisu'],
                $book['uzivatel_id']
            );
            
            // Vypočítat balance
            $balance = $this->balanceCalculator->calculateNewEntryBalance(
                $bookId,
                $amount,
                $type,
                $data['datum_zapisu']
            );
            
            // Připravit data pro insert
            $entryData = array(
                'pokladni_kniha_id' => $bookId,
                'datum_zapisu' => $data['datum_zapisu'],
                'cislo_dokladu' => $docNumberData['cislo_dokladu'],
                'cislo_poradi_v_roce' => $docNumberData['cislo_poradi_v_roce'],
                'typ_dokladu' => $type,
                'obsah_zapisu' => $data['obsah_zapisu'],
                'komu_od_koho' => isset($data['komu_od_koho']) ? $data['komu_od_koho'] : null,
                'castka_prijem' => $type === 'prijem' ? $amount : null,
                'castka_vydaj' => $type === 'vydaj' ? $amount : null,
                'zustatek_po_operaci' => $balance,
                'lp_kod' => isset($data['lp_kod']) ? $data['lp_kod'] : null,
                'lp_popis' => isset($data['lp_popis']) ? $data['lp_popis'] : null,
                'poznamka' => isset($data['poznamka']) ? $data['poznamka'] : null,
                'poradi_radku' => isset($data['poradi_radku']) ? $data['poradi_radku'] : 0
            );
            
            // Vložit položku
            $entryId = $this->entryModel->createEntry($entryData, $userId);
            
            // 🆕 KRITICKÉ: Přepočítat CELOU knihu od začátku, ne jen od data!
            // Důvod: calculateNewEntryBalance() může mít neaktuální pocatecni_stav
            // nebo předchozí položky mohly mít špatné zůstatky
            $this->balanceCalculator->recalculateBookBalances($bookId);
            
            // 🆕 KRITICKÉ: Přečíslovat celou pokladnu (číslování je per pokladna, ne per uživatel!)
            // Přečísluje všechny knihy se stejným pokladna_id
            $this->docNumberService->renumberBookDocuments($bookId);
            
            // Audit log
            $this->auditModel->logAction('polozka', $entryId, 'vytvoreni', $userId, null, $entryData);
            
            return $entryId;
            
        } catch (Exception $e) {
            error_log("Chyba při vytváření položky: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Aktualizovat položku
     */
    public function updateEntry($entryId, $data, $userId) {
        try {
            // Načíst položku
            $entry = $this->entryModel->getEntryById($entryId);
            if (!$entry) {
                throw new Exception('Položka nenalezena');
            }
            
            // Načíst knihu
            $book = $this->bookModel->getBookById($entry['pokladni_kniha_id']);
            
            // Kontrola, že kniha není uzavřená
            if ($book['stav_knihy'] != 'aktivni') {
                throw new Exception('Pokladní kniha je uzavřená a nelze ji upravovat (stav: ' . $book['stav_knihy'] . ')');
            }
            
            // Uložit staré hodnoty pro audit
            $oldValues = $entry;
            
            // Aktualizovat položku
            $this->entryModel->updateEntry($entryId, $data, $userId);
            
            // Pokud se změnila částka nebo datum, přepočítat balances
            if (isset($data['castka_prijem']) || isset($data['castka_vydaj']) || isset($data['datum_zapisu'])) {
                // 🆕 KRITICKÉ: Přepočítat CELOU knihu od začátku místo jen od data
                $this->balanceCalculator->recalculateBookBalances($entry['pokladni_kniha_id']);
            }
            
            // Audit log
            $this->auditModel->logAction('polozka', $entryId, 'uprava', $userId, $oldValues, $data);
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při aktualizaci položky: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Smazat položku (soft delete)
     */
    public function deleteEntry($entryId, $userId) {
        try {
            // Načíst položku
            $entry = $this->entryModel->getEntryById($entryId);
            if (!$entry) {
                throw new Exception('Položka nenalezena');
            }
            
            // Načíst knihu
            $book = $this->bookModel->getBookById($entry['pokladni_kniha_id']);
            
            // Kontrola, že kniha není uzavřená
            if ($book['stav_knihy'] != 'aktivni') {
                throw new Exception('Pokladní kniha je uzavřená a nelze ji upravovat (stav: ' . $book['stav_knihy'] . ')');
            }
            
            // Soft delete
            $this->entryModel->deleteEntry($entryId, $userId);
            
            // 🆕 KRITICKÉ: Přepočítat CELOU knihu od začátku
            $this->balanceCalculator->recalculateBookBalances($entry['pokladni_kniha_id']);
            
            // 🆕 KRITICKÉ: Přečíslovat celou pokladnu (číslování je per pokladna, ne per uživatel!)
            $this->docNumberService->renumberBookDocuments($entry['pokladni_kniha_id']);
            
            // Audit log
            $this->auditModel->logAction('polozka', $entryId, 'smazani', $userId, $entry, null);
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při mazání položky: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Obnovit smazanou položku
     */
    public function restoreEntry($entryId, $userId) {
        try {
            // Načíst položku
            $entry = $this->entryModel->getEntryById($entryId);
            if (!$entry) {
                throw new Exception('Položka nenalezena');
            }
            
            // Obnovit
            $this->entryModel->restoreEntry($entryId);
            
            // 🆕 KRITICKÉ: Přepočítat CELOU knihu od začátku
            $this->balanceCalculator->recalculateBookBalances($entry['pokladni_kniha_id']);
            
            // 🆕 KRITICKÉ: Přečíslovat celou pokladnu (číslování je per pokladna, ne per uživatel!)
            $this->docNumberService->renumberBookDocuments($entry['pokladni_kniha_id']);
            
            // Audit log
            $this->auditModel->logAction('polozka', $entryId, 'obnoveni', $userId, null, $entry);
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při obnově položky: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Uzavřít knihu uživatelem (stav 1: uzavrena_uzivatelem)
     * Uživatel uzavře měsíc -> čeká na schválení správcem
     */
    public function closeBookByUser($bookId, $userId) {
        try {
            // Načíst knihu
            $book = $this->bookModel->getBookById($bookId);
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            // ⚠️ OPRÁVNĚNÍ: Handler už zkontroloval canCloseBook() (majitel nebo admin s EDIT_ALL/EDIT_OWN)
            // Zde neprovádíme duplicitní kontrolu uzivatel_id
            
            // Kontrola stavu - musí být aktivní
            if ($book['stav_knihy'] != 'aktivni') {
                throw new Exception('Kniha již je uzavřená');
            }
            
            // ✅ KONTROLA CHRONOLOGIE: Předchozí měsíc musí být uzavřený (PRO STEJNOU POKLADNU)
            $prevMonth = $book['mesic'] == 1 ? 12 : $book['mesic'] - 1;
            $prevYear = $book['mesic'] == 1 ? $book['rok'] - 1 : $book['rok'];
            
            // Načíst předchozí měsíc PRO STEJNOU POKLADNU
            $prevBooks = $this->bookModel->getBooks(array(
                'uzivatel_id' => $book['uzivatel_id'],
                'rok' => $prevYear,
                'mesic' => $prevMonth,
                'pokladna_ids' => array($book['pokladna_id'])  // ✅ KRITICKÉ: Kontrolovat STEJNOU pokladnu
            ));
            
            if (!empty($prevBooks['books'])) {
                // ✅ Najít knihu pro STEJNOU pokladnu (může být více knih pro různé pokladny)
                $prevBook = null;
                foreach ($prevBooks['books'] as $b) {
                    if ($b['pokladna_id'] == $book['pokladna_id']) {
                        $prevBook = $b;
                        break;
                    }
                }
                
                // Pokud existuje předchozí kniha pro stejnou pokladnu a je AKTIVNÍ → blokovat
                if ($prevBook && $prevBook['stav_knihy'] === 'aktivni') {
                    throw new Exception('Nelze uzavřít měsíc. Nejprve uzavřete předchozí měsíc pro tuto pokladnu (' . $prevMonth . '/' . $prevYear . ').');
                }
            }
            
            // Uzavřít uživatelem
            $this->bookModel->closeBookByUser($bookId, $userId);
            
            // Audit log - ✅ FIX: použít 'uzavreni' místo 'uzavreni_uzivatelem' (ENUM omezení)
            $this->auditModel->logAction('kniha', $bookId, 'uzavreni', $userId, 
                array('stav_knihy' => 'aktivni'), 
                array('stav_knihy' => 'uzavrena_uzivatelem'));
            
            // 🔔 NOTIFICATION TRIGGER: CASHBOOK_MONTH_CLOSED
            try {
                require_once __DIR__ . '/../lib/notificationHandlers.php';
                triggerNotification($this->db, 'CASHBOOK_MONTH_CLOSED', $bookId, $userId);
                error_log("🔔 Triggered: CASHBOOK_MONTH_CLOSED for book $bookId");
            } catch (Exception $e) {
                error_log("⚠️ Notification trigger failed: " . $e->getMessage());
            }
            
            return array(
                'status' => 'ok',
                'message' => 'Měsíc byl uzavřen. Čeká na schválení správce.'
            );
            
        } catch (Exception $e) {
            error_log("Chyba při uzavírání knihy uživatelem: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Zamknout knihu správcem (stav 2: zamknuta_spravcem)
     * Správce zkontroloval a uzamkl -> nelze měnit
     */
    public function lockBookByAdmin($bookId, $adminId) {
        try {
            // Načíst knihu
            $book = $this->bookModel->getBookById($bookId);
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            // Kontrola stavu - musí být uzavřená uživatelem
            if ($book['stav_knihy'] != 'uzavrena_uzivatelem') {
                throw new Exception('Kniha musí být nejdříve uzavřena uživatelem');
            }
            
            // Zamknout správcem
            $this->bookModel->lockBookByAdmin($bookId, $adminId);
            
            // Audit log - ✅ FIX: použít 'zamknuti' místo 'zamknuti_spravcem' (ENUM omezení)
            $this->auditModel->logAction('kniha', $bookId, 'zamknuti', $adminId, 
                array('stav_knihy' => 'uzavrena_uzivatelem'), 
                array('stav_knihy' => 'zamknuta_spravcem'));
            
            // 🔔 NOTIFICATION TRIGGER: CASHBOOK_MONTH_LOCKED (URGENT!)
            try {
                require_once __DIR__ . '/../lib/notificationHandlers.php';
                triggerNotification($this->db, 'CASHBOOK_MONTH_LOCKED', $bookId, $adminId);
                error_log("🔔 Triggered: CASHBOOK_MONTH_LOCKED for book $bookId");
            } catch (Exception $e) {
                error_log("⚠️ Notification trigger failed: " . $e->getMessage());
            }
            
            return array(
                'status' => 'ok',
                'message' => 'Kniha byla zamknuta správcem.'
            );
            
        } catch (Exception $e) {
            error_log("Chyba při zamykání knihy správcem: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Odemknout knihu správcem (zpět na aktivní)
     * Pouze správce může odemknout
     */
    public function unlockBook($bookId, $adminId) {
        try {
            // Načíst knihu
            $book = $this->bookModel->getBookById($bookId);
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            // Kontrola stavu - musí být uzavřená nebo zamknutá
            if ($book['stav_knihy'] == 'aktivni') {
                throw new Exception('Kniha již je aktivní');
            }
            
            $oldState = $book['stav_knihy'];
            
            // Odemknout
            $this->bookModel->unlockBook($bookId);
            
            // Audit log - ✅ FIX: použít 'odemknuti' místo 'odemknuti_spravcem' (ENUM omezení)
            $this->auditModel->logAction('kniha', $bookId, 'odemknuti', $adminId, 
                array('stav_knihy' => $oldState), 
                array('stav_knihy' => 'aktivni'));
            
            return array(
                'status' => 'ok',
                'message' => 'Kniha byla odemknuta a je opět aktivní.'
            );
            
        } catch (Exception $e) {
            error_log("Chyba při odemykání knihy: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Backwards compatibility - stará metoda closeBook
     * @deprecated Použít closeBookByUser() nebo lockBookByAdmin()
     */
    public function closeBook($bookId, $userId) {
        return $this->closeBookByUser($bookId, $userId);
    }
    
    /**
     * Backwards compatibility - stará metoda reopenBook
     * @deprecated Použít unlockBook()
     */
    public function reopenBook($bookId, $userId) {
        return $this->unlockBook($bookId, $userId);
    }
}

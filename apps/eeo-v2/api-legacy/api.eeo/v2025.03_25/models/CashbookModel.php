<?php
/**
 * CashbookModel.php
 * Model pro práci s pokladními knihami (TBL_POKLADNI_KNIHY (25a_pokladni_knihy))
 * PHP 5.6 kompatibilní
 */

class CashbookModel {
    
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Získat seznam knih s filtrováním a stránkováním
     */
    public function getBooks($filters = array()) {
        $sql = "
            SELECT 
                kb.*,
                u.id AS uzivatel_db_id,
                u.jmeno AS uzivatel_jmeno,
                u.prijmeni AS uzivatel_prijmeni,
                CONCAT(u.jmeno, ' ', u.prijmeni) AS uzivatel_cele_jmeno,
                u.username AS uzivatel_username,
                
                -- ✅ NOVÉ: Celé jméno s titulem (pro PDF export)
                CONCAT_WS(' ', 
                    NULLIF(u.titul_pred, ''),
                    u.jmeno, 
                    u.prijmeni, 
                    NULLIF(u.titul_za, '')
                ) AS uzivatel_jmeno_plne,
                
                -- ✅ NOVÉ: Jméno správce, který knihu zamknul
                CONCAT_WS(' ', 
                    NULLIF(s.titul_pred, ''),
                    s.jmeno, 
                    s.prijmeni, 
                    NULLIF(s.titul_za, '')
                ) AS zamknul_spravce_jmeno_plne,
                
                -- ✅ NOVÉ: LP kód povinnost z pokladny
                p.lp_kod_povinny AS pokladna_lp_kod_povinny,
                
                lok.id AS lokalita_id,
                lok.nazev AS lokalita_nazev,
                lok.kod AS lokalita_kod,
                lok.typ AS lokalita_typ,
                lok.parent_id AS lokalita_parent_id,
                
                us.id AS usek_id,
                us.usek_nazev AS usek_nazev,
                us.usek_zkr AS usek_zkratka
            FROM " . TBL_POKLADNI_KNIHY . " kb
            LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = kb.uzivatel_id
            LEFT JOIN " . TBL_UZIVATELE . " s ON s.id = kb.zamknuta_spravcem_kym
            LEFT JOIN " . TBL_POKLADNY . " p ON p.id = kb.pokladna_id
            LEFT JOIN " . TBL_LOKALITY . " lok ON lok.id = u.lokalita_id
            LEFT JOIN " . TBL_USEKY . " us ON us.id = u.usek_id
            WHERE 1=1
        ";
        
        $params = array();
        
        // Aplikovat filtry
        
        // ✅ NOVÝ: Filtr podle seznamu pokladen (pro zobrazení knih uživatele)
        if (!empty($filters['pokladna_ids']) && is_array($filters['pokladna_ids'])) {
            $placeholders = implode(',', array_fill(0, count($filters['pokladna_ids']), '?'));
            $sql .= " AND kb.pokladna_id IN (" . $placeholders . ")";
            foreach ($filters['pokladna_ids'] as $pokladnaId) {
                $params[] = $pokladnaId;
            }
        }
        
        // ✅ Zachováno pro zpětnou kompatibilitu (admin může filtrovat podle konkrétního uživatele)
        if (!empty($filters['uzivatel_id'])) {
            $sql .= " AND kb.uzivatel_id = ?";
            $params[] = $filters['uzivatel_id'];
        }
        
        if (!empty($filters['rok'])) {
            $sql .= " AND kb.rok = ?";
            $params[] = $filters['rok'];
        }
        
        if (!empty($filters['mesic'])) {
            $sql .= " AND kb.mesic = ?";
            $params[] = $filters['mesic'];
        }
        
        if (!empty($filters['stav_knihy'])) {
            $sql .= " AND kb.stav_knihy = ?";
            $params[] = $filters['stav_knihy'];
        }
        
        // Počet celkem (pro pagination)
        $countSql = "SELECT COUNT(*) as total FROM (" . $sql . ") as subquery";
        $stmt = $this->db->prepare($countSql);
        $stmt->execute($params);
        $totalRecords = $stmt->fetch(PDO::FETCH_ASSOC);
        $totalRecords = $totalRecords['total'];
        
        // Stránkování
        $page = isset($filters['page']) ? max(1, intval($filters['page'])) : 1;
        $limit = isset($filters['limit']) ? max(1, min(100, intval($filters['limit']))) : 50;
        $offset = ($page - 1) * $limit;
        
        // V MySQL 5.6 nelze použít placeholdery pro LIMIT/OFFSET
        $sql .= " ORDER BY kb.rok DESC, kb.mesic DESC LIMIT " . $limit . " OFFSET " . $offset;
        
        // Provést dotaz
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $books = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return array(
            'books' => $books,
            'pagination' => array(
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $totalRecords,
                'total_pages' => ceil($totalRecords / $limit)
            )
        );
    }
    
    /**
     * Získat knihu podle ID
     */
    public function getBookById($bookId) {
        $stmt = $this->db->prepare("
            SELECT 
                kb.*,
                u.id AS uzivatel_db_id,
                u.jmeno AS uzivatel_jmeno,
                u.prijmeni AS uzivatel_prijmeni,
                CONCAT(u.jmeno, ' ', u.prijmeni) AS uzivatel_cele_jmeno,
                u.username AS uzivatel_username,
                
                -- ✅ NOVÉ: Celé jméno s titulem (pro PDF export)
                CONCAT_WS(' ', 
                    NULLIF(u.titul_pred, ''),
                    u.jmeno, 
                    u.prijmeni, 
                    NULLIF(u.titul_za, '')
                ) AS uzivatel_jmeno_plne,
                
                -- ✅ NOVÉ: Jméno správce, který knihu zamknul
                CONCAT_WS(' ', 
                    NULLIF(s.titul_pred, ''),
                    s.jmeno, 
                    s.prijmeni, 
                    NULLIF(s.titul_za, '')
                ) AS zamknul_spravce_jmeno_plne,
                
                -- ✅ NOVÉ: LP kód povinnost z pokladny
                p.lp_kod_povinny AS pokladna_lp_kod_povinny,
                
                lok.id AS lokalita_id,
                lok.nazev AS lokalita_nazev,
                lok.kod AS lokalita_kod,
                lok.typ AS lokalita_typ,
                lok.parent_id AS lokalita_parent_id,
                
                us.id AS usek_id,
                us.usek_nazev AS usek_nazev,
                us.usek_zkr AS usek_zkratka
            FROM " . TBL_POKLADNI_KNIHY . " kb
            LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = kb.uzivatel_id
            LEFT JOIN " . TBL_UZIVATELE . " s ON s.id = kb.zamknuta_spravcem_kym
            LEFT JOIN " . TBL_POKLADNY . " p ON p.id = kb.pokladna_id
            LEFT JOIN " . TBL_LOKALITY . " lok ON lok.id = u.lokalita_id
            LEFT JOIN " . TBL_USEKY . " us ON us.id = u.usek_id
            WHERE kb.id = ?
        ");
        $stmt->execute(array($bookId));
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat knihu podle pokladny, roku a měsíce
     * ✅ SPRÁVNĚ: JEDNA společná kniha pro celou pokladnu, ne pro každého uživatele!
     */
    public function getBookByPeriod($pokladnaId, $year, $month) {
        $stmt = $this->db->prepare("
            SELECT * FROM " . TBL_POKLADNI_KNIHY . " 
            WHERE pokladna_id = ? AND rok = ? AND mesic = ?
        ");
        $stmt->execute(array($pokladnaId, $year, $month));
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * @deprecated NEPOUŽÍVAT! Vytvářelo to duplicitní knihy pro každého uživatele
     */
    public function getBookByUserPeriod($userId, $year, $month) {
        $stmt = $this->db->prepare("
            SELECT * FROM " . TBL_POKLADNI_KNIHY . " 
            WHERE uzivatel_id = ? AND rok = ? AND mesic = ?
        ");
        $stmt->execute(array($userId, $year, $month));
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Vytvořit novou knihu
     */
    public function createBook($data, $userId) {
        // Získat pokladna_id a denormalizovaná data z prirazeni_id
        $pokladnaId = null;
        $cisloPokladny = null;
        $kodPracoviste = null;
        $nazevPracoviste = null;
        $ciselnaRadaVpd = null;
        $ciselnaRadaPpd = null;
        
        if (isset($data['prirazeni_id'])) {
            $stmt = $this->db->prepare("
                SELECT 
                    pu.pokladna_id,
                    p.cislo_pokladny,
                    p.kod_pracoviste,
                    p.nazev_pracoviste,
                    p.ciselna_rada_vpd,
                    p.ciselna_rada_ppd
                FROM " . TBL_POKLADNY_UZIVATELE . " pu
                JOIN " . TBL_POKLADNY . " p ON pu.pokladna_id = p.id
                WHERE pu.id = ?
            ");
            $stmt->execute(array($data['prirazeni_id']));
            $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($assignment) {
                $pokladnaId = $assignment['pokladna_id'];
                $cisloPokladny = $assignment['cislo_pokladny'];
                $kodPracoviste = $assignment['kod_pracoviste'];
                $nazevPracoviste = $assignment['nazev_pracoviste'];
                $ciselnaRadaVpd = $assignment['ciselna_rada_vpd'];
                $ciselnaRadaPpd = $assignment['ciselna_rada_ppd'];
            }
        }
        
        // Přepsat číselné řady pokud jsou explicitně zadány
        if (isset($data['ciselna_rada_vpd'])) {
            $ciselnaRadaVpd = $data['ciselna_rada_vpd'];
        }
        if (isset($data['ciselna_rada_ppd'])) {
            $ciselnaRadaPpd = $data['ciselna_rada_ppd'];
        }
        
        // 🆕 AUTOMATICKÝ VÝPOČET PŘEVODU Z PŘEDCHOZÍHO MĚSÍCE
        $prevodZPredchoziho = 0.00;
        if ($pokladnaId && isset($data['uzivatel_id']) && isset($data['rok']) && isset($data['mesic'])) {
            $prevodZPredchoziho = $this->getPreviousMonthBalance(
                $data['uzivatel_id'], 
                $pokladnaId, 
                $data['rok'], 
                $data['mesic']
            );
        }
        
        // Lze přepsat explicitně zadanou hodnotou (pro manuální opravu)
        if (isset($data['prevod_z_predchoziho'])) {
            $prevodZPredchoziho = floatval($data['prevod_z_predchoziho']);
        }
        
        // Počáteční stav = převod z předchozího (pokud není explicitně zadán)
        $pocatecniStav = isset($data['pocatecni_stav']) ? floatval($data['pocatecni_stav']) : $prevodZPredchoziho;
        
        $sql = "
            INSERT INTO " . TBL_POKLADNI_KNIHY . " (
                prirazeni_id, pokladna_id, uzivatel_id,
                rok, mesic,
                cislo_pokladny, kod_pracoviste, nazev_pracoviste,
                ciselna_rada_vpd, ciselna_rada_ppd,
                prevod_z_predchoziho, pocatecni_stav, koncovy_stav,
                stav_knihy, poznamky,
                vytvoreno, vytvoril
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktivni', ?, NOW(), ?)
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array(
            $data['prirazeni_id'],
            $pokladnaId,
            $data['uzivatel_id'],
            $data['rok'],
            $data['mesic'],
            $cisloPokladny,
            $kodPracoviste,
            $nazevPracoviste,
            $ciselnaRadaVpd,
            $ciselnaRadaPpd,
            $prevodZPredchoziho,  // ✅ Automaticky vypočteno
            $pocatecniStav,       // ✅ = převod (pokud není jinak zadáno)
            $pocatecniStav,       // ✅ koncový stav = počáteční (zatím bez záznamů)
            isset($data['poznamky']) ? $data['poznamky'] : null,
            $userId
        ));
        
        return $this->db->lastInsertId();
    }
    
    /**
     * Aktualizovat knihu
     */
    public function updateBook($bookId, $data, $userId) {
        $fields = array();
        $params = array();
        
        if (isset($data['prirazeni_id'])) {
            // Získat pokladna_id a všechna denormalizovaná data
            $stmt = $this->db->prepare("
                SELECT 
                    pu.pokladna_id,
                    p.cislo_pokladny,
                    p.kod_pracoviste,
                    p.nazev_pracoviste,
                    p.ciselna_rada_vpd,
                    p.ciselna_rada_ppd
                FROM " . TBL_POKLADNY_UZIVATELE . " pu
                JOIN " . TBL_POKLADNY . " p ON pu.pokladna_id = p.id
                WHERE pu.id = ?
            ");
            $stmt->execute(array($data['prirazeni_id']));
            $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($assignment) {
                $fields[] = "prirazeni_id = ?";
                $params[] = $data['prirazeni_id'];
                $fields[] = "pokladna_id = ?";
                $params[] = $assignment['pokladna_id'];
                $fields[] = "cislo_pokladny = ?";
                $params[] = $assignment['cislo_pokladny'];
                $fields[] = "kod_pracoviste = ?";
                $params[] = $assignment['kod_pracoviste'];
                $fields[] = "nazev_pracoviste = ?";
                $params[] = $assignment['nazev_pracoviste'];
                // Číselné řady se neaktualizují automaticky při změně přiřazení
                // (uživatel si je mohl upravit individuálně)
            }
        }
        if (isset($data['ciselna_rada_vpd'])) {
            $fields[] = "ciselna_rada_vpd = ?";
            $params[] = $data['ciselna_rada_vpd'];
        }
        if (isset($data['ciselna_rada_ppd'])) {
            $fields[] = "ciselna_rada_ppd = ?";
            $params[] = $data['ciselna_rada_ppd'];
        }
        if (isset($data['prevod_z_predchoziho'])) {
            $fields[] = "prevod_z_predchoziho = ?";
            $params[] = $data['prevod_z_predchoziho'];
            $fields[] = "pocatecni_stav = ?";
            $params[] = $data['prevod_z_predchoziho'];
        }
        if (isset($data['poznamky'])) {
            $fields[] = "poznamky = ?";
            $params[] = $data['poznamky'];
        }
        
        $fields[] = "aktualizoval = ?";
        $params[] = $userId;
        
        $params[] = $bookId;
        
        $sql = "UPDATE " . TBL_POKLADNI_KNIHY . " SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }
    
    /**
     * Aktualizovat souhrnné hodnoty knihy (balance, příjmy, výdaje)
     */
    public function updateBookSummary($bookId, $totalIncome, $totalExpense, $closingBalance, $entryCount) {
        $stmt = $this->db->prepare("
            UPDATE " . TBL_POKLADNI_KNIHY . " 
            SET 
                celkove_prijmy = ?,
                celkove_vydaje = ?,
                koncovy_stav = ?,
                pocet_zaznamu = ?
            WHERE id = ?
        ");
        return $stmt->execute(array($totalIncome, $totalExpense, $closingBalance, $entryCount, $bookId));
    }
    
    /**
     * Uzavřít knihu uživatelem (stav 1)
     */
    public function closeBookByUser($bookId, $userId) {
        // ⚠️ DŮLEŽITÉ: WHERE obsahuje pouze id, protože oprávnění je zkontrolováno v handleru
        // Admin nebo vlastník může uzavřít knihu (kontrola: canCloseBook)
        $stmt = $this->db->prepare("
            UPDATE " . TBL_POKLADNI_KNIHY . " 
            SET stav_knihy = 'uzavrena_uzivatelem', 
                uzavrena_uzivatelem_kdy = NOW()
            WHERE id = ?
        ");
        return $stmt->execute(array($bookId));
    }
    
    /**
     * Zamknout knihu správcem (stav 2)
     */
    public function lockBookByAdmin($bookId, $adminId) {
        $stmt = $this->db->prepare("
            UPDATE " . TBL_POKLADNI_KNIHY . " 
            SET stav_knihy = 'zamknuta_spravcem', 
                zamknuta_spravcem_kdy = NOW(),
                zamknuta_spravcem_kym = ?
            WHERE id = ?
        ");
        return $stmt->execute(array($adminId, $bookId));
    }
    
    /**
     * Odemknout knihu správcem (zpět na aktivní)
     */
    public function unlockBook($bookId) {
        $stmt = $this->db->prepare("
            UPDATE " . TBL_POKLADNI_KNIHY . " 
            SET stav_knihy = 'aktivni', 
                uzavrena_uzivatelem_kdy = NULL,
                zamknuta_spravcem_kdy = NULL, 
                zamknuta_spravcem_kym = NULL 
            WHERE id = ?
        ");
        return $stmt->execute(array($bookId));
    }
    
    /**
     * Smazat knihu
     */
    public function deleteBook($bookId) {
        $stmt = $this->db->prepare("DELETE FROM " . TBL_POKLADNI_KNIHY . " WHERE id = ?");
        return $stmt->execute(array($bookId));
    }
    
    /**
     * Získat koncový stav z předchozího měsíce
     * Pro automatický převod do nového měsíce
     */
    public function getPreviousMonthBalance($userId, $pokladnaId, $year, $month) {
        // 🆕 SPECIÁLNÍ LOGIKA PRO LEDEN - kontrola pocatecni_stav_rok
        if ($month === 1) {
            // Načíst nastavení pokladny
            $stmt = $this->db->prepare("
                SELECT pocatecni_stav_rok 
                FROM " . TBL_POKLADNY . " 
                WHERE id = ?
                LIMIT 1
            ");
            $stmt->execute(array($pokladnaId));
            $pokladna = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Pokud je pocatecni_stav_rok nastaven (NOT NULL), použít ho
            if ($pokladna && $pokladna['pocatecni_stav_rok'] !== null) {
                return floatval($pokladna['pocatecni_stav_rok']);
            }
            
            // Jinak pokračovat normální logikou (převod z prosince předchozího roku)
        }
        
        // Vypočítat předchozí měsíc
        $prevMonth = ($month === 1) ? 12 : $month - 1;
        $prevYear = ($month === 1) ? $year - 1 : $year;
        
        $stmt = $this->db->prepare("
            SELECT koncovy_stav 
            FROM " . TBL_POKLADNI_KNIHY . " 
            WHERE uzivatel_id = ? 
              AND pokladna_id = ?
              AND rok = ? 
              AND mesic = ?
            LIMIT 1
        ");
        $stmt->execute(array($userId, $pokladnaId, $prevYear, $prevMonth));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            return floatval($result['koncovy_stav']);
        }
        
        return 0.00;
    }
    
    /**
     * Aktualizovat převod z předchozího měsíce a přepočítat koncový stav
     * Pro opravu starých záznamů s nulovým převodem
     * 
     * @param int $bookId - ID knihy
     * @param float $transfer - Převod z předchozího měsíce
     * @param float|null $koncovyStav - Koncový stav (pokud null, přepočítá se automaticky)
     */
    public function updatePreviousMonthTransfer($bookId, $transfer, $koncovyStav = null) {
        // Pokud není zadán koncový stav, přepočítat z položek
        if ($koncovyStav === null) {
            $stmt = $this->db->prepare("
                SELECT 
                    COALESCE(SUM(castka_prijem), 0) as total_income,
                    COALESCE(SUM(castka_vydaj), 0) as total_expense
                FROM " . TBL_POKLADNI_POLOZKY . " 
                WHERE pokladni_kniha_id = ? 
                  AND (smazano = 0 OR smazano IS NULL)
            ");
            $stmt->execute(array($bookId));
            $sums = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $totalIncome = floatval($sums['total_income']);
            $totalExpense = floatval($sums['total_expense']);
            $koncovyStav = $transfer + $totalIncome - $totalExpense;
        }
        
        $stmt = $this->db->prepare("
            UPDATE " . TBL_POKLADNI_KNIHY . " 
            SET prevod_z_predchoziho = ?,
                pocatecni_stav = ?,
                koncovy_stav = ?
            WHERE id = ?
        ");
        $result = $stmt->execute(array($transfer, $transfer, $koncovyStav, $bookId));
        
        // 🆕 KRITICKÉ: Přepočítat zůstatky POLOŽEK v knize po změně počátečního stavu
        if ($result) {
            require_once __DIR__ . '/../services/BalanceCalculator.php';
            $balanceCalc = new BalanceCalculator($this->db);
            $balanceCalc->recalculateBookBalances($bookId);
        }
        
        return $result;
    }
    
    /**
     * Přepočítat převody ve všech následujících měsících
     * Kaskádový přepočet - když se změní měsíc X, přepočítají se X+1, X+2, X+3...
     * 
     * @param int $userId - ID uživatele
     * @param int $pokladnaId - ID pokladny
     * @param int $fromYear - Rok, od kterého začít přepočet
     * @param int $fromMonth - Měsíc, od kterého začít přepočet
     * @return int - Počet aktualizovaných měsíců
     */
    public function recalculateFollowingMonths($userId, $pokladnaId, $fromYear, $fromMonth) {
        $updated = 0;
        $maxIterations = 60; // Max 5 let do budoucna
        $iteration = 0;
        
        $currentYear = $fromYear;
        $currentMonth = $fromMonth;
        
        while ($iteration < $maxIterations) {
            // Vypočítat následující měsíc
            $nextMonth = ($currentMonth === 12) ? 1 : $currentMonth + 1;
            $nextYear = ($currentMonth === 12) ? $currentYear + 1 : $currentYear;
            
            // Zkontrolovat, zda existuje kniha v následujícím měsíci
            $stmt = $this->db->prepare("
                SELECT id, koncovy_stav 
                FROM " . TBL_POKLADNI_KNIHY . " 
                WHERE uzivatel_id = ? 
                  AND pokladna_id = ?
                  AND rok = ? 
                  AND mesic = ?
                LIMIT 1
            ");
            $stmt->execute(array($userId, $pokladnaId, $nextYear, $nextMonth));
            $nextBook = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$nextBook) {
                // Žádná další kniha - konec
                break;
            }
            
            // Načíst koncový stav aktuálního měsíce
            $stmt = $this->db->prepare("
                SELECT koncovy_stav 
                FROM " . TBL_POKLADNI_KNIHY . " 
                WHERE uzivatel_id = ? 
                  AND pokladna_id = ?
                  AND rok = ? 
                  AND mesic = ?
                LIMIT 1
            ");
            $stmt->execute(array($userId, $pokladnaId, $currentYear, $currentMonth));
            $currentBook = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($currentBook) {
                // Aktualizovat převod v následujícím měsíci
                $prevTransfer = floatval($currentBook['koncovy_stav']);
                $this->updatePreviousMonthTransfer($nextBook['id'], $prevTransfer);
                $updated++;
            }
            
            // Posunout se na následující měsíc
            $currentYear = $nextYear;
            $currentMonth = $nextMonth;
            $iteration++;
        }
        
        return $updated;
    }
}

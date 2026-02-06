<?php
/**
 * BalanceCalculator.php
 * Service pro přepočítávání zůstatků v pokladní knize
 * PHP 5.6 kompatibilní
 */

class BalanceCalculator {
    
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Přepočítat všechny zůstatky v pokladní knize
     * 
     * @param int $bookId ID pokladní knihy
     * @return bool Success
     */
    public function recalculateBookBalances($bookId) {
        try {
            // Načíst knihu
            $stmt = $this->db->prepare("SELECT * FROM 25a_pokladni_knihy WHERE id = ?");
            $stmt->execute(array($bookId));
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            // Načíst všechny aktivní položky seřazené chronologicky
            $stmt = $this->db->prepare("
                SELECT * FROM 25a_pokladni_polozky 
                WHERE pokladni_kniha_id = ? AND smazano = 0
                ORDER BY datum_zapisu ASC, poradi_radku ASC, id ASC
            ");
            $stmt->execute(array($bookId));
            $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // ✅ FIX: Začít s převodem z předchozího měsíce (ne pocatecni_stav!)
            $runningBalance = floatval($book['prevod_z_predchoziho']);
            
            $totalIncome = 0;
            $totalExpense = 0;
            
            // Procházet položky a přepočítávat
            foreach ($entries as $entry) {
                // Aktualizovat running balance
                if ($entry['castka_prijem']) {
                    $runningBalance += floatval($entry['castka_prijem']);
                    $totalIncome += floatval($entry['castka_prijem']);
                }
                if ($entry['castka_vydaj']) {
                    $runningBalance -= floatval($entry['castka_vydaj']);
                    $totalExpense += floatval($entry['castka_vydaj']);
                }
                
                // Uložit nový balance
                $updateStmt = $this->db->prepare("
                    UPDATE 25a_pokladni_polozky 
                    SET zustatek_po_operaci = ? 
                    WHERE id = ?
                ");
                $updateStmt->execute(array($runningBalance, $entry['id']));
            }
            
            // Aktualizovat souhrnné hodnoty v cashbooks
            $updateBookStmt = $this->db->prepare("
                UPDATE 25a_pokladni_knihy 
                SET 
                    celkove_prijmy = ?,
                    celkove_vydaje = ?,
                    koncovy_stav = ?,
                    pocet_zaznamu = ?
                WHERE id = ?
            ");
            $updateBookStmt->execute(array(
                $totalIncome,
                $totalExpense,
                $runningBalance,
                count($entries),
                $bookId
            ));
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při přepočítávání balances: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Přepočítat zůstatky pouze pro položky po určitém datu
     * (optimalizace - nemusíme přepočítávat celou knihu)
     */
    public function recalculateBalancesAfterDate($bookId, $entryDate) {
        try {
            // Načíst knihu
            $stmt = $this->db->prepare("SELECT * FROM 25a_pokladni_knihy WHERE id = ?");
            $stmt->execute(array($bookId));
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            // Najít poslední položku před datem (pro výchozí balance)
            $stmt = $this->db->prepare("
                SELECT * FROM 25a_pokladni_polozky 
                WHERE pokladni_kniha_id = ? 
                  AND datum_zapisu < ? 
                  AND smazano = 0
                ORDER BY datum_zapisu DESC, poradi_radku DESC, id DESC
                LIMIT 1
            ");
            $stmt->execute(array($bookId, $entryDate));
            $lastBeforeEntry = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // ✅ FIX: Výchozí balance z převodu z předchozího (ne pocatecni_stav!)
            $runningBalance = $lastBeforeEntry 
                ? floatval($lastBeforeEntry['zustatek_po_operaci']) 
                : floatval($book['prevod_z_predchoziho']);
            
            // Načíst položky od daného data
            $stmt = $this->db->prepare("
                SELECT * FROM 25a_pokladni_polozky 
                WHERE pokladni_kniha_id = ? 
                  AND datum_zapisu >= ? 
                  AND smazano = 0
                ORDER BY datum_zapisu ASC, poradi_radku ASC, id ASC
            ");
            $stmt->execute(array($bookId, $entryDate));
            $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Přepočítat balances
            foreach ($entries as $entry) {
                if ($entry['castka_prijem']) {
                    $runningBalance += floatval($entry['castka_prijem']);
                }
                if ($entry['castka_vydaj']) {
                    $runningBalance -= floatval($entry['castka_vydaj']);
                }
                
                $updateStmt = $this->db->prepare("
                    UPDATE 25a_pokladni_polozky 
                    SET zustatek_po_operaci = ? 
                    WHERE id = ?
                ");
                $updateStmt->execute(array($runningBalance, $entry['id']));
            }
            
            // Aktualizovat konečný stav v knize
            // Spočítat celkové příjmy a výdaje
            $stmt = $this->db->prepare("
                SELECT 
                    SUM(castka_prijem) as total_income,
                    SUM(castka_vydaj) as total_expense,
                    COUNT(*) as entry_count
                FROM 25a_pokladni_polozky
                WHERE pokladni_kniha_id = ? AND smazano = 0
            ");
            $stmt->execute(array($bookId));
            $totals = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $updateBookStmt = $this->db->prepare("
                UPDATE 25a_pokladni_knihy 
                SET 
                    celkove_prijmy = ?,
                    celkove_vydaje = ?,
                    koncovy_stav = ?,
                    pocet_zaznamu = ?
                WHERE id = ?
            ");
            $updateBookStmt->execute(array(
                $totals['total_income'] ? $totals['total_income'] : 0,
                $totals['total_expense'] ? $totals['total_expense'] : 0,
                $runningBalance,
                $totals['entry_count'],
                $bookId
            ));
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při přepočítávání balances after date: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Vypočítat balance pro novou položku
     */
    public function calculateNewEntryBalance($bookId, $amount, $type, $insertDate) {
        try {
            // Najít poslední položku před datem
            $stmt = $this->db->prepare("
                SELECT * FROM 25a_pokladni_polozky 
                WHERE pokladni_kniha_id = ? 
                  AND datum_zapisu <= ? 
                  AND smazano = 0
                ORDER BY datum_zapisu DESC, poradi_radku DESC, id DESC
                LIMIT 1
            ");
            $stmt->execute(array($bookId, $insertDate));
            $lastEntry = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($lastEntry) {
                $previousBalance = floatval($lastEntry['zustatek_po_operaci']);
            } else {
                // Žádná položka před datem - použít počáteční stav
                $stmt = $this->db->prepare("SELECT pocatecni_stav FROM 25a_pokladni_knihy WHERE id = ?");
                $stmt->execute(array($bookId));
                $book = $stmt->fetch(PDO::FETCH_ASSOC);
                $previousBalance = floatval($book['pocatecni_stav']);
            }
            
            // Vypočítat nový balance
            if ($type === 'prijem') {
                return $previousBalance + floatval($amount);
            } else {
                return $previousBalance - floatval($amount);
            }
            
        } catch (Exception $e) {
            error_log("Chyba při výpočtu balance: " . $e->getMessage());
            return 0;
        }
    }
}

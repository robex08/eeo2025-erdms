<?php
/**
 * CashbookRenumberService.php
 * Service pro FORCE přepočet číslování dokladů v pokladní knize
 * ⚠️ NEBEZPEČNÁ OPERACE - pouze pro admin!
 * 
 * PHP 5.6 kompatibilní
 */

class CashbookRenumberService {
    
    private $db;
    private $settingsModel;
    private $debugInfo = array(); // 🔍 DEBUG INFO
    
    public function __construct($db) {
        $this->db = $db;
        require_once __DIR__ . '/../models/GlobalSettingsModel.php';
        $this->settingsModel = new GlobalSettingsModel($db);
    }
    
    /**
     * FORCE PŘEPOČET všech dokladů v roce pro danou pokladnu
     * ⚠️ NEBEZPEČNÁ OPERACE - pouze pro admin s CASH_BOOK_MANAGE!
     * 
     * Přečísluje všechny doklady (VPD i PPD) v daném roce bez ohledu na stav měsíců.
     * Ignoruje uzavřené i zamčené měsíce!
     * 
     * @param int $pokladnaId ID pokladny z 25a_pokladny
     * @param int $year Rok pro přepočet (např. 2025)
     * @param int $userId ID uživatele, který spustil přepočet
     * @return array Response s počtem přečíslovaných položek
     * @throws Exception
     */
    public function forceRenumberAllDocuments($pokladnaId, $year, $userId) {
        try {
            $this->db->beginTransaction();
            
            // 1. Načíst data pokladny
            $stmt = $this->db->prepare("
                SELECT 
                    p.id,
                    p.cislo_pokladny,
                    p.ciselna_rada_vpd,
                    p.ciselna_rada_ppd,
                    p.vpd_od_cislo,
                    p.ppd_od_cislo
                FROM 25a_pokladny p
                WHERE p.id = ?
            ");
            $stmt->execute(array($pokladnaId));
            $pokladna = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$pokladna) {
                throw new Exception('Pokladna nenalezena');
            }
            
            $vpdStart = !empty($pokladna['vpd_od_cislo']) ? intval($pokladna['vpd_od_cislo']) : 1;
            $ppdStart = !empty($pokladna['ppd_od_cislo']) ? intval($pokladna['ppd_od_cislo']) : 1;
            
            // 🔍 DEBUG INFO - uložit načtená data
            $this->debugInfo['pokladna_loaded'] = $pokladna;
            $this->debugInfo['vpd_start'] = $vpdStart;
            $this->debugInfo['ppd_start'] = $ppdStart;
            
            // DEBUG: Log načtených dat
            error_log(sprintf(
                "🔍 Force renumber POKLADNA: pokladna_id=%d, vpd_start=%d, ppd_start=%d",
                $pokladnaId,
                $vpdStart,
                $ppdStart
            ));
            
            // 2. Načíst globální nastavení prefix
            $usePrefix = $this->settingsModel->isDocumentPrefixEnabled();
            $this->debugInfo['use_prefix'] = $usePrefix;
            
            // 3. PŘEČÍSLOVAT VÝDAJE (VPD)
            // Kontinuálně napříč všemi měsíci v roce (září→říjen→listopad: V001, V002, V003...)
            $vpdCount = $this->forceRenumberDocumentsByType(
                $userId,
                $pokladnaId,
                $year,
                'vydaj',
                $vpdStart,
                $usePrefix ? $pokladna['ciselna_rada_vpd'] : null,
                $usePrefix
            );
            
            // 4. PŘEČÍSLOVAT PŘÍJMY (PPD)
            // Kontinuálně napříč všemi měsíci v roce (září→říjen→listopad: P001, P002, P003...)
            $ppdCount = $this->forceRenumberDocumentsByType(
                $userId,
                $pokladnaId,
                $year,
                'prijem',
                $ppdStart,
                $usePrefix ? $pokladna['ciselna_rada_ppd'] : null,
                $usePrefix
            );
            
            error_log("🔒 COMMIT TRANSACTION - začínám commit...");
            $commitResult = $this->db->commit();
            error_log("🔒 COMMIT DONE - result: " . var_export($commitResult, true));
            
            error_log(sprintf(
                "Force renumber completed: pokladna_id=%d, year=%d, VPD=%d, PPD=%d",
                $pokladnaId,
                $year,
                $vpdCount,
                $ppdCount
            ));
            
            return array(
                'status' => 'ok',
                'message' => 'Doklady byly úspěšně přečíslovány',
                'data' => array(
                    'year' => $year,
                    'pokladna_id' => $pokladnaId,
                    'vpd_renumbered' => $vpdCount,
                    'ppd_renumbered' => $ppdCount,
                    'total_renumbered' => $vpdCount + $ppdCount,
                    // 🔍 DEBUG INFO - všechny informace z procesu
                    'debug' => $this->debugInfo
                )
            );
            
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Chyba při force přepočtu dokladů: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Přečíslovat doklady V RÁMCI KAŽDÉ KNIHY (měsíce) ZVLÁŠŤ
     * 
     * Každá kniha má vlastní číslování od ppd_od_cislo/vpd_od_cislo.
     * Knihy jsou seřazené chronologicky (leden → prosinec).
     * 
     * @param int $pokladnaId ID pokladny
     * @param int $year Rok
     * @param int $vpdStart Počáteční číslo VPD
     * @param int $ppdStart Počáteční číslo PPD
     * @param string|null $vpdPrefix Číselná řada VPD
     * @param string|null $ppdPrefix Číselná řada PPD
     * @param bool $usePrefix Použít prefix?
     * @return array ['vpd_count' => int, 'ppd_count' => int]
     */
    private function forceRenumberByBooks($pokladnaId, $year, $vpdStart, $ppdStart, $vpdPrefix, $ppdPrefix, $usePrefix) {
        // 1. Načíst všechny knihy v roce (seřazené podle měsíce)
        $sql = "
            SELECT id, mesic
            FROM 25a_pokladni_knihy
            WHERE pokladna_id = ?
              AND rok = ?
            ORDER BY mesic ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array($pokladnaId, $year));
        $books = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($books)) {
            error_log("Force renumber: Žádné knihy k přečíslování (pokladna_id=$pokladnaId, year=$year)");
            return array('vpd_count' => 0, 'ppd_count' => 0);
        }
        
        $totalVpdCount = 0;
        $totalPpdCount = 0;
        
        // 2. Přečíslovat každou knihu ZVLÁŠŤ
        foreach ($books as $book) {
            // VPD v této knize (začíná vždy od vpdStart)
            $vpdCount = $this->forceRenumberBookEntries(
                $book['id'],
                'vydaj',
                $vpdStart,
                $vpdPrefix,
                $usePrefix
            );
            
            // PPD v této knize (začíná vždy od ppdStart)
            $ppdCount = $this->forceRenumberBookEntries(
                $book['id'],
                'prijem',
                $ppdStart,
                $ppdPrefix,
                $usePrefix
            );
            
            error_log(sprintf(
                "Force renumber: Kniha měsíc=%d, kniha_id=%d → VPD=%d, PPD=%d",
                $book['mesic'],
                $book['id'],
                $vpdCount,
                $ppdCount
            ));
            
            $totalVpdCount += $vpdCount;
            $totalPpdCount += $ppdCount;
        }
        
        return array(
            'vpd_count' => $totalVpdCount,
            'ppd_count' => $totalPpdCount
        );
    }
    
    /**
     * Přečíslovat položky V JEDNÉ KNIZE (měsíci)
     * 
     * @param int $bookId ID knihy (25a_pokladni_knihy.id)
     * @param string $docType 'vydaj' nebo 'prijem'
     * @param int $startNumber Počáteční číslo (vpd_od_cislo nebo ppd_od_cislo)
     * @param string|null $prefix Číselná řada nebo null
     * @param bool $usePrefix Použít prefix?
     * @return int Počet přečíslovaných položek
     */
    private function forceRenumberBookEntries($bookId, $docType, $startNumber, $prefix, $usePrefix) {
        // 1. Načíst položky v knize (seřazené podle data zápisu)
        $sql = "
            SELECT 
                id,
                datum_zapisu,
                cislo_poradi_v_roce AS old_order,
                cislo_dokladu AS old_document_number
            FROM 25a_pokladni_polozky
            WHERE pokladni_kniha_id = ?
              AND typ_dokladu = ?
              AND smazano = 0
            ORDER BY datum_zapisu ASC, id ASC
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array($bookId, $docType));
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($entries)) {
            return 0;
        }
        
        // 2. Přečíslovat od startNumber
        $currentNumber = $startNumber;
        $count = 0;
        $letter = $docType === 'prijem' ? 'P' : 'V';
        
        foreach ($entries as $entry) {
            if ($usePrefix && $prefix) {
                $newDocumentNumber = sprintf('%s%s-%03d', $letter, $prefix, $currentNumber);
            } else {
                $newDocumentNumber = sprintf('%s%03d', $letter, $currentNumber);
            }
            
            // FORCE UPDATE - vždy
            $updateSql = "
                UPDATE 25a_pokladni_polozky
                SET 
                    cislo_poradi_v_roce = ?,
                    cislo_dokladu = ?
                WHERE id = ?
            ";
            
            $updateStmt = $this->db->prepare($updateSql);
            $updateStmt->execute(array($currentNumber, $newDocumentNumber, $entry['id']));
            
            error_log(sprintf(
                "🔧 Force renumber: kniha_id=%d, ID=%d, %s→%s (order %s→%d)",
                $bookId,
                $entry['id'],
                $entry['old_document_number'],
                $newDocumentNumber,
                $entry['old_order'],
                $currentNumber
            ));
            
            $count++;
            $currentNumber++;
        }
        
        return $count;
    }
    
    /**
     * STARÁ FUNKCE - přečíslovat doklady podle typu (výdaj nebo příjem)
     * 
     * Načte všechny položky daného typu v roce (seřazené chronologicky PO MĚSÍCÍCH)
     * a přečísluje je od startNumber postupně nahoru.
     * 
     * DŮLEŽITÉ: Přečíslovává od nejstaršího měsíce k aktuálnímu (leden → prosinec)
     * 
     * @param int $userId ID uživatele
     * @param int $pokladnaId ID pokladny
     * @param int $year Rok
     * @param string $docType 'vydaj' nebo 'prijem'
     * @param int $startNumber Počáteční číslo (vpd_od_cislo nebo ppd_od_cislo)
     * @param string|null $prefix Číselná řada (591, 491, ...) nebo null
     * @param bool $usePrefix Použít prefix v čísle dokladu?
     * @return int Počet přečíslovaných položek
     * @deprecated Nahrazeno forceRenumberByBooks() - každá kniha má vlastní číslování
     */
    private function forceRenumberDocumentsByType($userId, $pokladnaId, $year, $docType, $startNumber, $prefix, $usePrefix) {
        // DEBUG: Log parametrů PŘED SQL
        error_log(sprintf(
            "🔍 Force renumber SELECT PARAMS: pokladna_id=%s (type=%s), year=%s (type=%s), typ=%s",
            var_export($pokladnaId, true),
            gettype($pokladnaId),
            var_export($year, true),
            gettype($year),
            $docType
        ));
        
        // 1. Načíst všechny položky daného typu v roce
        // ⚠️ DŮLEŽITÉ: Filtrujeme podle pokladna_id (tabulka 25a_pokladni_knihy má tento sloupec)
        // Denormalizováno pro rychlejší dotazy - každá kniha si drží pokladna_id
        // Seřazeno: MĚSÍC (1-12), DATUM ZÁPISU, ID
        // Tím zajistíme kontinuitu: leden→únor→březen...→prosinec
        $sql = "
            SELECT 
                p.id,
                p.datum_zapisu,
                p.cislo_poradi_v_roce AS old_order,
                p.cislo_dokladu AS old_document_number,
                k.mesic,
                k.stav_knihy
            FROM 25a_pokladni_polozky p
            JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
            WHERE k.pokladna_id = ?
              AND k.rok = ?
              AND p.typ_dokladu = ?
              AND p.smazano = 0
            ORDER BY k.mesic ASC, p.datum_zapisu ASC, p.id ASC
        ";
        
        error_log("🔍 Force renumber SQL: " . preg_replace('/\s+/', ' ', $sql));
        
        $stmt = $this->db->prepare($sql);
        $params = array($pokladnaId, $year, $docType);
        error_log("🔍 Force renumber EXECUTE with: " . json_encode($params));
        
        $stmt->execute($params);
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 🔍 DEBUG INFO - uložit nalezené položky
        $debugKey = $docType === 'prijem' ? 'ppd_entries_found' : 'vpd_entries_found';
        $this->debugInfo[$debugKey] = count($entries);
        $this->debugInfo[$debugKey . '_sample'] = array_slice($entries, 0, 3); // První 3 položky
        
        // DEBUG: Počet nalezených položek
        error_log(sprintf(
            "🔍 Force renumber FOUND: %d položek (pokladna_id=%d, year=%d, typ=%s)",
            count($entries),
            $pokladnaId,
            $year,
            $docType
        ));
        
        if (empty($entries)) {
            error_log(sprintf(
                "Force renumber: Žádné položky k přečíslování (pokladna_id=%d, year=%d, typ=%s)",
                $pokladnaId,
                $year,
                $docType
            ));
            return 0; // Žádné položky k přečíslování
        }
        
        // 2. Přečíslovat postupně od startNumber
        $currentNumber = $startNumber;
        $count = 0;
        
        foreach ($entries as $entry) {
            // Vytvořit nové číslo dokladu
            $letter = $docType === 'prijem' ? 'P' : 'V';
            
            if ($usePrefix && $prefix) {
                $newDocumentNumber = sprintf('%s%s-%03d', $letter, $prefix, $currentNumber);
                // Příklad: V591-050, P491-100
            } else {
                $newDocumentNumber = sprintf('%s%03d', $letter, $currentNumber);
                // Příklad: V050, P100
            }
            
            // FORCE UPDATE - vždy přečíslovat (i když se číslo nezměnilo)
            // ⚠️ DŮLEŽITÉ: Aktualizovat aktualizovano, aktualizoval pro audit a refresh frontendu!
            $updateSql = "
                UPDATE 25a_pokladni_polozky
                SET 
                    cislo_poradi_v_roce = ?,
                    cislo_dokladu = ?,
                    aktualizovano = NOW(),
                    aktualizoval = ?
                WHERE id = ?
            ";
            
            error_log(sprintf(
                "🔧 Force renumber UPDATE: ID=%d, old_order=%s, new_order=%d, old_doc=%s, new_doc=%s (user_id=%d)",
                $entry['id'],
                $entry['old_order'],
                $currentNumber,
                $entry['old_document_number'],
                $newDocumentNumber,
                $userId
            ));
            
            $updateStmt = $this->db->prepare($updateSql);
            $updateParams = array($currentNumber, $newDocumentNumber, $userId, $entry['id']);
            $updateResult = $updateStmt->execute($updateParams);
            
            if ($updateResult) {
                $rowsAffected = $updateStmt->rowCount();
                error_log(sprintf("✅ UPDATE OK: %d rows affected", $rowsAffected));
                $count++; // Počítáme všechny položky (i když rowCount=0)
            } else {
                error_log(sprintf("❌ UPDATE FAILED: %s", json_encode($updateStmt->errorInfo())));
            }
            
            // Log změny
            error_log(sprintf(
                "Force renumber: Entry ID=%d, Old=%s (order=%d), New=%s (order=%d), Date=%s, Month=%d, Status=%s",
                $entry['id'],
                $entry['old_document_number'],
                $entry['old_order'],
                $newDocumentNumber,
                $currentNumber,
                $entry['datum_zapisu'],
                $entry['mesic'],
                $entry['stav_knihy']
            ));
            
            $currentNumber++;
        }
        
        return $count;
    }
}

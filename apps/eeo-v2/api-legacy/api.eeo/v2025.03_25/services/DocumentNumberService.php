<?php
/**
 * DocumentNumberService.php
 * Service pro generování a správu čísel dokladů s podporou prefixů
 * PHP 5.6 kompatibilní
 */

class DocumentNumberService {
    
    private $db;
    private $settingsModel;
    
    public function __construct($db) {
        $this->db = $db;
        require_once __DIR__ . '/../models/GlobalSettingsModel.php';
        $this->settingsModel = new GlobalSettingsModel($db);
    }
    
    /**
     * Vygenerovat nové číslo dokladu s kontinuálním číslováním
     * 
     * @param int $bookId ID pokladní knihy
     * @param string $type 'prijem' nebo 'vydaj'
     * @param string $entryDate Datum zápisu (pro správné pořadí)
     * @param int $userId ID uživatele (vlastník knihy)
     * @return array ['cislo_dokladu' => 'P003', 'cislo_poradi_v_roce' => 3]
     */
    public function generateDocumentNumber($bookId, $type, $entryDate, $userId) {
        try {
            // Načíst knihu
            $stmt = $this->db->prepare("
                SELECT rok FROM 25a_pokladni_knihy k WHERE k.id = ?
            ");
            $stmt->execute(array($bookId));
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            $year = $book['rok'];
            
            // Určit prefix podle typu
            $letter = ($type === 'prijem') ? 'P' : 'V';
            
            // Získat další kontinuální pořadové číslo v roce
            $nextNumber = $this->getNextDocumentNumber($bookId, $year, $type);
            
            // Sestavit číslo dokladu s prefixem
            $documentNumber = sprintf('%s%03d', $letter, $nextNumber);
            
            return array(
                'cislo_dokladu' => $documentNumber,
                'cislo_poradi_v_roce' => $nextNumber
            );
            
        } catch (Exception $e) {
            error_log("Chyba při generování čísla dokladu: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Získat další pořadové číslo v rámci roku PRO DANÝ TYP dokladu
     * Každý typ má vlastní řadu: příjmy P001, P002... a výdaje V001, V002...
     * Číslování per: typ dokladu + rok + POKLADNA (pokladna_id) - ignoruje uživatele a měsíc
     * 
     * @param int $bookId ID pokladní knihy
     * @param int $year Rok
     * @param string $type Typ dokladu ('prijem' nebo 'vydaj')
     * @return int Další pořadové číslo (1-999)
     */
    private function getNextDocumentNumber($bookId, $year, $type) {
        // Zjistit ID pokladny
        $stmt = $this->db->prepare("
            SELECT pokladna_id 
            FROM 25a_pokladni_knihy 
            WHERE id = ?
        ");
        $stmt->execute(array($bookId));
        $book = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$book) {
            return 1;
        }
        
        $pokladnaId = $book['pokladna_id'];
        
        // Najít maximum napříč VŠEMI knihami se STEJNOU pokladnou
        $sql = "
            SELECT COALESCE(MAX(p.cislo_poradi_v_roce), 0) + 1 AS next_number
            FROM 25a_pokladni_polozky p
            JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
            WHERE k.pokladna_id = :pokladnaId
              AND k.rok = :year
              AND p.typ_dokladu = :docType
              AND p.smazano = 0
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':pokladnaId', $pokladnaId, PDO::PARAM_INT);
        $stmt->bindValue(':year', $year, PDO::PARAM_INT);
        $stmt->bindValue(':docType', $type, PDO::PARAM_STR);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return intval($result['next_number']);
    }
    
    /**
     * Přečíslovat všechny doklady v knize
     * Oddělené řady podle typu: příjmy P001, P002... a výdaje V001, V002...
     * Číslování per: typ dokladu + rok + POKLADNA (pokladna_id)
     */
    public function renumberBookDocuments($bookId) {
        try {
            // Načíst knihu a zjistit ID pokladny
            $stmt = $this->db->prepare("
                SELECT rok, pokladna_id 
                FROM 25a_pokladni_knihy 
                WHERE id = ?
            ");
            $stmt->execute(array($bookId));
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            $year = $book['rok'];
            $pokladnaId = $book['pokladna_id'];
            
            // Přečíslovat příjmy napříč VŠEMI knihami stejné pokladny
            $this->renumberDocumentsByPokladna($year, $pokladnaId, 'prijem', 'P');
            
            // Přečíslovat výdaje napříč VŠEMI knihami stejné pokladny
            $this->renumberDocumentsByPokladna($year, $pokladnaId, 'vydaj', 'V');
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při přečíslování dokladů: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Přečíslovat všechny doklady uživatele v daném roce
     * @deprecated NEPOUŽÍVAT! Číslování je per POKLADNA, ne per UŽIVATEL
     * Používat renumberBookDocuments() místo toho
     */
    public function renumberUserYearDocuments($userId, $year) {
        try {
            // Najít všechny knihy uživatele v daném roce
            $stmt = $this->db->prepare("
                SELECT id FROM 25a_pokladni_knihy 
                WHERE uzivatel_id = ? AND rok = ?
            ");
            $stmt->execute(array($userId, $year));
            $books = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Přečíslovat každou knihu podle typu samostatně
            foreach ($books as $book) {
                $this->renumberDocumentsByTypeForBook($book['id'], $year, 'prijem', 'P');
                $this->renumberDocumentsByTypeForBook($book['id'], $year, 'vydaj', 'V');
            }
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při přečíslování dokladů pro rok: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Přečíslovat doklady podle typu pro konkrétní pokladnu
     * Čísluje napříč VŠEMI knihami se STEJNÝM pokladna_id
     * @param int $year Rok
     * @param int $pokladnaId ID pokladny
     * @param string $type Typ dokladu ('prijem' nebo 'vydaj') 
     * @param string $prefix Prefix pro číslo dokladu ('P' nebo 'V')
     */
    private function renumberDocumentsByPokladna($year, $pokladnaId, $type, $prefix) {
        // Načíst VŠECHNY položky daného typu napříč VŠEMI knihami stejné pokladny
        $stmt = $this->db->prepare("
            SELECT e.id
            FROM 25a_pokladni_polozky e
            JOIN 25a_pokladni_knihy k ON e.pokladni_kniha_id = k.id
            WHERE k.pokladna_id = ?
              AND k.rok = ?
              AND e.typ_dokladu = ?
              AND e.smazano = 0
            ORDER BY e.datum_zapisu ASC, e.id ASC
        ");
        $stmt->execute(array($pokladnaId, $year, $type));
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Přečíslovat všechny doklady napříč knihami
        $position = 1;
        foreach ($entries as $entry) {
            $documentNumber = sprintf('%s%03d', $prefix, $position);
            
            $updateStmt = $this->db->prepare("
                UPDATE 25a_pokladni_polozky 
                SET cislo_dokladu = ?, cislo_poradi_v_roce = ?
                WHERE id = ?
            ");
            $updateStmt->execute(array($documentNumber, $position, $entry['id']));
            
            $position++;
        }
    }

    /**
     * Přečíslovat doklady podle typu pro konkrétní knihu
     * @param int $bookId ID pokladní knihy
     * @param int $year Rok
     * @param string $type Typ dokladu ('prijem' nebo 'vydaj') 
     * @param string $prefix Prefix pro číslo dokladu ('P' nebo 'V')
     */
    private function renumberDocumentsByTypeForBook($bookId, $year, $type, $prefix) {
        // Načíst všechny položky daného typu v knize, seřazené chronologicky
        $stmt = $this->db->prepare("
            SELECT e.id
            FROM 25a_pokladni_polozky e
            WHERE e.pokladni_kniha_id = ?
              AND YEAR(e.datum_zapisu) = ?
              AND e.typ_dokladu = ?
              AND e.smazano = 0
            ORDER BY e.datum_zapisu ASC, e.id ASC
        ");
        $stmt->execute(array($bookId, $year, $type));
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Přečíslovat podle typu - jednoduchý formát bez číselných řad
        $position = 1;
        foreach ($entries as $entry) {
            // Sestavit číslo dokladu - jen prefix a číslo (P001, V002...)
            $documentNumber = sprintf('%s%03d', $prefix, $position);
            
            $updateStmt = $this->db->prepare("
                UPDATE 25a_pokladni_polozky 
                SET cislo_dokladu = ?, cislo_poradi_v_roce = ?
                WHERE id = ?
            ");
            $updateStmt->execute(array($documentNumber, $position, $entry['id']));
            
            $position++;
        }
    }

    /**
     * Přečíslovat všechny doklady v knize kontinuálně
     * Číslování napříč typy: P001, V002, P003, V004... podle data zápisu
     * 
     * @param int $bookId ID pokladní knihy
     * @param int $year Rok
     */
    private function renumberAllDocumentsInBook($bookId, $year) {
        // Načíst všechny položky v knize, seřazené chronologicky
        $stmt = $this->db->prepare("
            SELECT e.id, e.typ_dokladu
            FROM 25a_pokladni_polozky e
            WHERE e.pokladni_kniha_id = ?
              AND YEAR(e.datum_zapisu) = ?
              AND e.smazano = 0
            ORDER BY e.datum_zapisu ASC, e.id ASC
        ");
        $stmt->execute(array($bookId, $year));
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Kontinuální přečíslování všech dokladů
        $position = 1;
        foreach ($entries as $entry) {
            // Určit prefix podle typu
            $prefix = ($entry['typ_dokladu'] === 'prijem') ? 'P' : 'V';
            
            // Sestavit číslo dokladu - prefix a kontinuální číslo
            $documentNumber = sprintf('%s%03d', $prefix, $position);
            
            $updateStmt = $this->db->prepare("
                UPDATE 25a_pokladni_polozky 
                SET cislo_dokladu = ?, cislo_poradi_v_roce = ?
                WHERE id = ?
            ");
            $updateStmt->execute(array($documentNumber, $position, $entry['id']));
            
            $position++;
        }
    }
    
    /**
     * Přečíslovat doklady podle typu s podporou prefixů
     * @deprecated Používat renumberDocumentsByTypeForBook pro přečíslování konkrétní knihy
     */
    private function renumberDocumentsByType($year, $userId, $type, $prefix) {
        // Zjistit, zda používat prefix
        $usePrefix = $this->settingsModel->isDocumentPrefixEnabled();
        
        // Načíst všechny položky typu v roce pro daného uživatele (napříč všemi knihami!)
        $stmt = $this->db->prepare("
            SELECT e.id, e.pokladni_kniha_id,
                   k.ciselna_rada_vpd, k.ciselna_rada_ppd
            FROM 25a_pokladni_polozky e
            JOIN 25a_pokladni_knihy k ON e.pokladni_kniha_id = k.id
            WHERE k.rok = ? 
              AND k.uzivatel_id = ?
              AND e.typ_dokladu = ?
              AND e.smazano = 0
            ORDER BY e.datum_zapisu ASC, e.id ASC
        ");
        $stmt->execute(array($year, $userId, $type));
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Přečíslovat
        $position = 1;
        foreach ($entries as $entry) {
            // Sestavit číslo dokladu s/bez prefixu
            if ($usePrefix) {
                $rada = ($type === 'prijem') ? $entry['ciselna_rada_ppd'] : $entry['ciselna_rada_vpd'];
                if ($rada) {
                    $documentNumber = sprintf('%s%s-%03d', $prefix, $rada, $position);
                } else {
                    $documentNumber = sprintf('%s%03d', $prefix, $position);
                }
            } else {
                $documentNumber = sprintf('%s%03d', $prefix, $position);
            }
            
            $updateStmt = $this->db->prepare("
                UPDATE 25a_pokladni_polozky 
                SET cislo_dokladu = ?, cislo_poradi_v_roce = ?
                WHERE id = ?
            ");
            $updateStmt->execute(array($documentNumber, $position, $entry['id']));
            
            $position++;
        }
    }
    
}

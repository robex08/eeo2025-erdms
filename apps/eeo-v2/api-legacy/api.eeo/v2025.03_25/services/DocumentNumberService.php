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
     * Vygenerovat nové číslo dokladu s volitelným prefixem
     * 
     * @param int $bookId ID pokladní knihy
     * @param string $type 'prijem' nebo 'vydaj'
     * @param string $entryDate Datum zápisu (pro správné pořadí)
     * @param int $userId ID uživatele (vlastník knihy)
     * @return array ['cislo_dokladu' => 'V591-001', 'cislo_poradi_v_roce' => 1]
     */
    public function generateDocumentNumber($bookId, $type, $entryDate, $userId) {
        try {
            // Načíst knihu s informacemi o číselných řadách
            $stmt = $this->db->prepare("
                SELECT 
                    k.rok, 
                    k.ciselna_rada_vpd, 
                    k.ciselna_rada_ppd
                FROM 25a_pokladni_knihy k
                WHERE k.id = ?
            ");
            $stmt->execute(array($bookId));
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            $year = $book['rok'];
            
            // Zjistit, zda používat prefix
            $usePrefix = $this->settingsModel->isDocumentPrefixEnabled();
            
            // Určit prefix podle typu
            $letter = ($type === 'prijem') ? 'P' : 'V';
            
            // Získat další pořadové číslo v roce
            $nextNumber = $this->getNextDocumentNumber($userId, $year, $type);
            
            // Sestavit číslo dokladu
            if ($usePrefix) {
                $rada = ($type === 'prijem') ? $book['ciselna_rada_ppd'] : $book['ciselna_rada_vpd'];
                if ($rada) {
                    // S prefixem: V591-001, P491-023
                    $documentNumber = sprintf('%s%s-%03d', $letter, $rada, $nextNumber);
                } else {
                    // Pokud není číselná řada, použít bez prefixu
                    $documentNumber = sprintf('%s%03d', $letter, $nextNumber);
                }
            } else {
                // Bez prefixu: V001, P023
                $documentNumber = sprintf('%s%03d', $letter, $nextNumber);
            }
            
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
     * Získat další pořadové číslo v rámci roku pro daný typ dokladu
     * 
     * @param int $userId ID uživatele
     * @param int $year Rok
     * @param string $type Typ dokladu ('prijem' nebo 'vydaj')
     * @return int Další pořadové číslo (1-999)
     */
    private function getNextDocumentNumber($userId, $year, $type) {
        $sql = "
            SELECT COALESCE(MAX(p.cislo_poradi_v_roce), 0) + 1 AS next_number
            FROM 25a_pokladni_polozky p
            JOIN 25a_pokladni_knihy k ON p.pokladni_kniha_id = k.id
            WHERE k.uzivatel_id = :userId 
              AND k.rok = :year
              AND p.typ_dokladu = :docType
              AND p.smazano = 0
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':userId', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':year', $year, PDO::PARAM_INT);
        $stmt->bindValue(':docType', $type, PDO::PARAM_STR);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return intval($result['next_number']);
    }
    
    /**
     * Přečíslovat všechny doklady v knize
     * (volat po smazání/obnovení záznamu)
     */
    public function renumberBookDocuments($bookId) {
        try {
            // Načíst knihu
            $stmt = $this->db->prepare("SELECT rok, uzivatel_id FROM 25a_pokladni_knihy WHERE id = ?");
            $stmt->execute(array($bookId));
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$book) {
                throw new Exception('Pokladní kniha nenalezena');
            }
            
            $year = $book['rok'];
            $userId = $book['uzivatel_id'];
            
            // Přečíslovat příjmy
            $this->renumberDocumentsByType($year, $userId, 'prijem', 'P');
            
            // Přečíslovat výdaje
            $this->renumberDocumentsByType($year, $userId, 'vydaj', 'V');
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při přečíslování dokladů: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Přečíslovat všechny doklady uživatele v daném roce
     */
    public function renumberUserYearDocuments($userId, $year) {
        try {
            // Přečíslovat příjmy
            $this->renumberDocumentsByType($year, $userId, 'prijem', 'P');
            
            // Přečíslovat výdaje
            $this->renumberDocumentsByType($year, $userId, 'vydaj', 'V');
            
            return true;
            
        } catch (Exception $e) {
            error_log("Chyba při přečíslování dokladů pro rok: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Přečíslovat doklady podle typu s podporou prefixů
     */
    private function renumberDocumentsByType($year, $userId, $type, $prefix) {
        // Zjistit, zda používat prefix
        $usePrefix = $this->settingsModel->isDocumentPrefixEnabled();
        
        // Načíst všechny položky typu v roce pro daného uživatele
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

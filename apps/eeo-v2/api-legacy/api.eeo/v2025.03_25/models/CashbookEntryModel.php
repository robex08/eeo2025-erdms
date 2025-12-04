<?php
/**
 * CashbookEntryModel.php
 * Model pro práci s položkami pokladní knihy (25a_pokladni_polozky)
 * PHP 5.6 kompatibilní
 */

class CashbookEntryModel {
    
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Získat všechny položky knihy
     */
    public function getEntriesByBookId($bookId, $includeDeleted = false) {
        $sql = "
            SELECT 
                e.*,
                u.username AS created_by_username,
                CONCAT(u.jmeno, ' ', u.prijmeni) AS created_by_name
            FROM 25a_pokladni_polozky e
            LEFT JOIN 25_uzivatele u ON e.vytvoril = u.id
            WHERE e.pokladni_kniha_id = ?
        ";
        
        if (!$includeDeleted) {
            $sql .= " AND e.smazano = 0";
        }
        
        $sql .= " ORDER BY e.datum_zapisu ASC, e.poradi_radku ASC, e.id ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array($bookId));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat položku podle ID
     */
    public function getEntryById($entryId) {
        $stmt = $this->db->prepare("
            SELECT 
                e.*,
                u.username AS created_by_username,
                CONCAT(u.jmeno, ' ', u.prijmeni) AS created_by_name
            FROM 25a_pokladni_polozky e
            LEFT JOIN 25_uzivatele u ON e.vytvoril = u.id
            WHERE e.id = ?
        ");
        $stmt->execute(array($entryId));
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Vytvořit novou položku
     */
    public function createEntry($data, $userId) {
        $sql = "
            INSERT INTO 25a_pokladni_polozky (
                pokladni_kniha_id, datum_zapisu, cislo_dokladu, cislo_poradi_v_roce, typ_dokladu,
                obsah_zapisu, komu_od_koho, castka_prijem, castka_vydaj,
                zustatek_po_operaci, lp_kod, lp_popis, poznamka,
                poradi_radku, vytvoreno, vytvoril
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array(
            $data['pokladni_kniha_id'],
            $data['datum_zapisu'],
            $data['cislo_dokladu'],
            $data['cislo_poradi_v_roce'],
            $data['typ_dokladu'],
            $data['obsah_zapisu'],
            isset($data['komu_od_koho']) ? $data['komu_od_koho'] : null,
            isset($data['castka_prijem']) ? $data['castka_prijem'] : null,
            isset($data['castka_vydaj']) ? $data['castka_vydaj'] : null,
            $data['zustatek_po_operaci'],
            isset($data['lp_kod']) ? $data['lp_kod'] : null,
            isset($data['lp_popis']) ? $data['lp_popis'] : null,
            isset($data['poznamka']) ? $data['poznamka'] : null,
            isset($data['poradi_radku']) ? $data['poradi_radku'] : 0,
            $userId
        ));
        
        return $this->db->lastInsertId();
    }
    
    /**
     * Aktualizovat položku
     */
    public function updateEntry($entryId, $data, $userId) {
        $fields = array();
        $params = array();
        
        if (isset($data['datum_zapisu'])) {
            $fields[] = "datum_zapisu = ?";
            $params[] = $data['datum_zapisu'];
        }
        if (isset($data['obsah_zapisu'])) {
            $fields[] = "obsah_zapisu = ?";
            $params[] = $data['obsah_zapisu'];
        }
        if (isset($data['komu_od_koho'])) {
            $fields[] = "komu_od_koho = ?";
            $params[] = $data['komu_od_koho'];
        }
        if (isset($data['castka_prijem'])) {
            $fields[] = "castka_prijem = ?";
            $params[] = $data['castka_prijem'];
        }
        if (isset($data['castka_vydaj'])) {
            $fields[] = "castka_vydaj = ?";
            $params[] = $data['castka_vydaj'];
        }
        if (isset($data['lp_kod'])) {
            $fields[] = "lp_kod = ?";
            $params[] = $data['lp_kod'];
        }
        if (isset($data['lp_popis'])) {
            $fields[] = "lp_popis = ?";
            $params[] = $data['lp_popis'];
        }
        if (isset($data['poznamka'])) {
            $fields[] = "poznamka = ?";
            $params[] = $data['poznamka'];
        }
        
        // 🆕 NOVÉ SLOUPCE - pokud frontend pošle, uložit do DB
        if (isset($data['cislo_dokladu'])) {
            $fields[] = "cislo_dokladu = ?";
            $params[] = $data['cislo_dokladu'];
        }
        if (isset($data['cislo_poradi_v_roce'])) {
            $fields[] = "cislo_poradi_v_roce = ?";
            $params[] = $data['cislo_poradi_v_roce'];
        }
        if (isset($data['typ_dokladu'])) {
            $fields[] = "typ_dokladu = ?";
            $params[] = $data['typ_dokladu'];
        }
        if (isset($data['poradove_cislo'])) {
            $fields[] = "poradove_cislo = ?";
            $params[] = $data['poradove_cislo'];
        }
        
        $fields[] = "aktualizoval = ?";
        $params[] = $userId;
        
        $params[] = $entryId;
        
        if (empty($fields)) {
            return true;
        }
        
        $sql = "UPDATE 25a_pokladni_polozky SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }
    
    /**
     * Aktualizovat balance položky
     */
    public function updateEntryBalance($entryId, $balance) {
        $stmt = $this->db->prepare("
            UPDATE 25a_pokladni_polozky 
            SET zustatek_po_operaci = ? 
            WHERE id = ?
        ");
        return $stmt->execute(array($balance, $entryId));
    }
    
    /**
     * Aktualizovat číslo dokladu
     */
    public function updateDocumentNumber($entryId, $documentNumber) {
        $stmt = $this->db->prepare("
            UPDATE 25a_pokladni_polozky 
            SET cislo_dokladu = ? 
            WHERE id = ?
        ");
        return $stmt->execute(array($documentNumber, $entryId));
    }
    
    /**
     * Soft delete položky
     */
    public function deleteEntry($entryId, $userId) {
        $stmt = $this->db->prepare("
            UPDATE 25a_pokladni_polozky 
            SET smazano = 1, smazano_kdy = NOW(), smazano_kym = ? 
            WHERE id = ?
        ");
        return $stmt->execute(array($userId, $entryId));
    }
    
    /**
     * Obnovit smazanou položku
     */
    public function restoreEntry($entryId) {
        $stmt = $this->db->prepare("
            UPDATE 25a_pokladni_polozky 
            SET smazano = 0, smazano_kdy = NULL, smazano_kym = NULL 
            WHERE id = ?
        ");
        return $stmt->execute(array($entryId));
    }
    
    /**
     * Trvale smazat položku (hard delete) - pouze pro admin
     */
    public function hardDeleteEntry($entryId) {
        $stmt = $this->db->prepare("DELETE FROM 25a_pokladni_polozky WHERE id = ?");
        return $stmt->execute(array($entryId));
    }
    
    /**
     * Získat všechny položky daného typu v roce (pro generování čísel dokladů)
     */
    public function getEntriesByTypeAndYear($year, $type, $userId) {
        $stmt = $this->db->prepare("
            SELECT e.* 
            FROM 25a_pokladni_polozky e
            JOIN 25a_pokladni_knihy b ON e.pokladni_kniha_id = b.id
            WHERE b.rok = ? 
              AND b.uzivatel_id = ?
              AND e.typ_dokladu = ?
              AND e.smazano = 0
            ORDER BY e.datum_zapisu ASC, e.id ASC
        ");
        $stmt->execute(array($year, $userId, $type));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat počet položek v knize
     */
    public function getEntryCount($bookId, $includeDeleted = false) {
        $sql = "SELECT COUNT(*) as count FROM 25a_pokladni_polozky WHERE pokladni_kniha_id = ?";
        
        if (!$includeDeleted) {
            $sql .= " AND smazano = 0";
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array($bookId));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'];
    }
}

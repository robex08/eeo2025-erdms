<?php
/**
 * CashbookEntryModel.php
 * Model pro práci s položkami pokladní knihy (25a_pokladni_polozky)
 * PHP 8.4+ s podporou multi-LP detail položek
 */

class CashbookEntryModel {
    
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    // ============================================
    // DETAIL POLOŽKY (multi-LP)
    // ============================================
    
    /**
     * Získat detail položky pro záznam
     * @param int $entryId
     * @return array
     */
    public function getDetailItems(int $entryId): array {
        $stmt = $this->db->prepare("
            SELECT * 
            FROM 25a_pokladni_polozky_detail
            WHERE polozka_id = ?
            ORDER BY poradi ASC
        ");
        $stmt->execute([$entryId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Vložit detail položku
     * @param int $entryId
     * @param int $poradi
     * @param array $data ['popis', 'castka', 'lp_kod', 'lp_popis', 'poznamka']
     * @return int ID nové detail položky
     */
    public function insertDetailItem(int $entryId, int $poradi, array $data): int {
        $stmt = $this->db->prepare("
            INSERT INTO 25a_pokladni_polozky_detail (
                polozka_id, poradi, popis, castka, lp_kod, lp_popis, poznamka, vytvoreno
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $entryId,
            $poradi,
            $data['popis'],
            $data['castka'],
            $data['lp_kod'],
            $data['lp_popis'] ?? null,
            $data['poznamka'] ?? null
        ]);
        
        return (int) $this->db->lastInsertId();
    }
    
    /**
     * Aktualizovat detail položku
     * @param int $detailId
     * @param array $data
     * @return bool
     */
    public function updateDetailItem(int $detailId, array $data): bool {
        $fields = [];
        $params = [];
        
        if (isset($data['popis'])) {
            $fields[] = "popis = ?";
            $params[] = $data['popis'];
        }
        if (isset($data['castka'])) {
            $fields[] = "castka = ?";
            $params[] = $data['castka'];
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
        
        if (empty($fields)) {
            return true;
        }
        
        $fields[] = "aktualizovano = NOW()";
        $params[] = $detailId;
        
        $sql = "UPDATE 25a_pokladni_polozky_detail SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }
    
    /**
     * Smazat všechny detail položky pro záznam
     * @param int $entryId
     * @return bool
     */
    public function deleteDetailItems(int $entryId): bool {
        $stmt = $this->db->prepare("DELETE FROM 25a_pokladni_polozky_detail WHERE polozka_id = ?");
        return $stmt->execute([$entryId]);
    }
    
    /**
     * Vytvořit záznam včetně detail položek (atomická operace)
     * @param array $masterData Data hlavičky
     * @param array $detailItems Pole detail položek
     * @param int $userId
     * @return int ID nového záznamu
     * @throws Exception
     */
    public function createEntryWithDetails(array $masterData, array $detailItems, int $userId): int {
        $this->db->beginTransaction();
        
        try {
            // 1. Spočítat celkovou částku z detailů
            $castka_celkem = array_sum(array_column($detailItems, 'castka'));
            
            // 2. Vytvořit master záznam
            $entryId = $this->createEntry(array_merge($masterData, [
                'castka_celkem' => $castka_celkem,
                'ma_detail' => !empty($detailItems) ? 1 : 0
            ]), $userId);
            
            // 3. Vložit detail položky
            foreach ($detailItems as $idx => $item) {
                $this->insertDetailItem($entryId, $idx + 1, $item);
            }
            
            $this->db->commit();
            return $entryId;
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    /**
     * Aktualizovat záznam včetně detail položek
     * @param int $entryId
     * @param array $masterData
     * @param array $detailItems
     * @param int $userId
     * @return bool
     * @throws Exception
     */
    public function updateEntryWithDetails(int $entryId, array $masterData, array $detailItems, int $userId): bool {
        $this->db->beginTransaction();
        
        try {
            // 1. Spočítat celkovou částku
            $castka_celkem = array_sum(array_column($detailItems, 'castka'));
            
            // 2. Aktualizovat master záznam
            $this->updateEntry($entryId, array_merge($masterData, [
                'castka_celkem' => $castka_celkem,
                'ma_detail' => !empty($detailItems) ? 1 : 0
            ]), $userId);
            
            // 3. Smazat staré detail položky
            $this->deleteDetailItems($entryId);
            
            // 4. Vložit nové detail položky
            foreach ($detailItems as $idx => $item) {
                $this->insertDetailItem($entryId, $idx + 1, $item);
            }
            
            $this->db->commit();
            return true;
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    /**
     * Získat záznam včetně detail položek
     * @param int $entryId
     * @return array|null ['master' => ..., 'details' => [...]]
     */
    public function getEntryWithDetails(int $entryId): ?array {
        $master = $this->getEntryById($entryId);
        
        if (!$master) {
            return null;
        }
        
        // Pro zpětnou kompatibilitu: pokud nemá ma_detail flag, vytvořit detail z původních sloupců
        if (!isset($master['ma_detail']) || $master['ma_detail'] == 0) {
            $details = [];
            
            // Pokud má starý LP kód, vytvořit z něj detail položku
            if (!empty($master['lp_kod'])) {
                $details[] = [
                    'id' => null,
                    'poradi' => 1,
                    'popis' => $master['obsah_zapisu'],
                    'castka' => $master['castka_celkem'] ?? ($master['castka_vydaj'] ?? $master['castka_prijem']),
                    'lp_kod' => $master['lp_kod'],
                    'lp_popis' => $master['lp_popis'],
                    'poznamka' => null
                ];
            }
        } else {
            $details = $this->getDetailItems($entryId);
        }
        
        return [
            'master' => $master,
            'details' => $details
        ];
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
                obsah_zapisu, komu_od_koho, castka_prijem, castka_vydaj, castka_celkem,
                zustatek_po_operaci, lp_kod, lp_popis, poznamka,
                poradi_radku, ma_detail, vytvoreno, vytvoril
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['pokladni_kniha_id'],
            $data['datum_zapisu'],
            $data['cislo_dokladu'],
            $data['cislo_poradi_v_roce'],
            $data['typ_dokladu'],
            $data['obsah_zapisu'],
            $data['komu_od_koho'] ?? null,
            $data['castka_prijem'] ?? null,
            $data['castka_vydaj'] ?? null,
            $data['castka_celkem'] ?? ($data['castka_vydaj'] ?? $data['castka_prijem']),
            $data['zustatek_po_operaci'],
            $data['lp_kod'] ?? null,
            $data['lp_popis'] ?? null,
            $data['poznamka'] ?? null,
            $data['poradi_radku'] ?? 0,
            $data['ma_detail'] ?? 0,
            $userId
        ]);
        
        return (int) $this->db->lastInsertId();
    }
    
    /**
     * Aktualizovat položku
     */
    public function updateEntry($entryId, $data, $userId) {
        $fields = [];
        $params = [];
        
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
        if (isset($data['castka_celkem'])) {
            $fields[] = "castka_celkem = ?";
            $params[] = $data['castka_celkem'];
        }
        if (isset($data['ma_detail'])) {
            $fields[] = "ma_detail = ?";
            $params[] = $data['ma_detail'];
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
        
        if (empty($fields)) {
            return true;
        }
        
        $fields[] = "aktualizoval = ?";
        $fields[] = "aktualizovano = NOW()";
        $params[] = $userId;
        $params[] = $entryId;
        
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

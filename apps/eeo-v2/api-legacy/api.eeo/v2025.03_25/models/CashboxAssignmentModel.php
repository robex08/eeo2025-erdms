<?php
/**
 * Model pro přiřazení pokladen k uživatelům
 * 
 * Spravuje tabulku 25a_pokladny_uzivatele
 * - Více pokladen na uživatele
 * - Zástupy (dočasné přiřazení)
 * - Historie přiřazení
 * - Definice číselných řad VPD/PPD
 * 
 * @package CashbookAPI
 * @version 1.0
 */

class CashboxAssignmentModel {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Získat všechna přiřazení (pro admin číselník)
     * ✅ REFACTORED: JOIN na 25a_pokladny pro normalizovanou strukturu
     * 
     * @param bool $activeOnly Pouze aktivní přiřazení
     * @return array Seznam všech přiřazení
     */
    public function getAllAssignments($activeOnly = true) {
        $sql = "
            SELECT 
                pu.id,
                pu.pokladna_id,
                pu.uzivatel_id,
                pu.je_hlavni,
                pu.platne_od,
                pu.platne_do,
                pu.poznamka,
                pu.vytvoreno,
                pu.vytvoril,
                
                -- Data z tabulky pokladen
                p.cislo_pokladny,
                p.nazev AS nazev_pokladny,
                p.kod_pracoviste,
                p.nazev_pracoviste,
                p.ciselna_rada_vpd,
                p.vpd_od_cislo,
                p.ciselna_rada_ppd,
                p.ppd_od_cislo,
                p.aktivni AS pokladna_aktivni,
                
                -- Data uživatele
                u.jmeno AS uzivatel_jmeno,
                u.prijmeni AS uzivatel_prijmeni,
                
                -- Kdo vytvořil přiřazení
                vytvoril_u.jmeno AS vytvoril_jmeno,
                vytvoril_u.prijmeni AS vytvoril_prijmeni,
                
                -- Vypočítané pole pro FE
                (pu.platne_do IS NULL OR pu.platne_do >= CURDATE()) AS aktivni
                
            FROM 25a_pokladny_uzivatele pu
            
            -- ✅ NOVÝ JOIN na pokladny
            INNER JOIN 25a_pokladny p ON p.id = pu.pokladna_id
            
            LEFT JOIN 25_uzivatele u ON u.id = pu.uzivatel_id
            LEFT JOIN 25_uzivatele vytvoril_u ON vytvoril_u.id = pu.vytvoril
        ";
        
        if ($activeOnly) {
            $sql .= " WHERE (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())";
        }
        
        $sql .= " ORDER BY u.prijmeni, u.jmeno, pu.je_hlavni DESC, pu.platne_od DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat seznam přiřazení pro uživatele
     * ✅ REFACTORED: JOIN na 25a_pokladny
     * 
     * @param int $userId ID uživatele
     * @param bool $activeOnly Pouze aktivní přiřazení
     * @return array Seznam přiřazení
     */
    public function getAssignmentsByUserId($userId, $activeOnly = true) {
        $sql = "
            SELECT 
                pu.id,
                pu.pokladna_id,
                pu.uzivatel_id,
                pu.je_hlavni,
                pu.platne_od,
                pu.platne_do,
                pu.poznamka,
                pu.vytvoreno,
                pu.vytvoril,
                
                -- Data z tabulky pokladen
                p.cislo_pokladny,
                p.nazev AS nazev_pokladny,
                p.kod_pracoviste,
                p.nazev_pracoviste,
                p.ciselna_rada_vpd,
                p.vpd_od_cislo,
                p.ciselna_rada_ppd,
                p.ppd_od_cislo,
                p.aktivni AS pokladna_aktivni,
                
                -- Data uživatele
                u.jmeno AS uzivatel_jmeno,
                u.prijmeni AS uzivatel_prijmeni,
                
                -- Kdo vytvořil přiřazení
                vytvoril_u.jmeno AS vytvoril_jmeno,
                vytvoril_u.prijmeni AS vytvoril_prijmeni,
                
                -- Vypočítané pole
                (pu.platne_do IS NULL OR pu.platne_do >= CURDATE()) AS aktivni
                
            FROM 25a_pokladny_uzivatele pu
            
            -- ✅ NOVÝ JOIN na pokladny
            INNER JOIN 25a_pokladny p ON p.id = pu.pokladna_id
            
            LEFT JOIN 25_uzivatele u ON u.id = pu.uzivatel_id
            LEFT JOIN 25_uzivatele vytvoril_u ON vytvoril_u.id = pu.vytvoril
            WHERE pu.uzivatel_id = :userId
        ";
        
        if ($activeOnly) {
            $sql .= " AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())";
        }
        
        $sql .= " ORDER BY pu.je_hlavni DESC, p.cislo_pokladny, pu.platne_od DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':userId', $userId, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat přiřazení podle ID
     * ✅ REFACTORED: JOIN na 25a_pokladny
     * 
     * @param int $assignmentId ID přiřazení
     * @return array|null Data přiřazení
     */
    public function getAssignmentById($assignmentId) {
        $sql = "
            SELECT 
                pu.id,
                pu.pokladna_id,
                pu.uzivatel_id,
                pu.je_hlavni,
                pu.platne_od,
                pu.platne_do,
                pu.poznamka,
                pu.vytvoreno,
                pu.vytvoril,
                
                -- Data z tabulky pokladen
                p.cislo_pokladny,
                p.nazev AS nazev_pokladny,
                p.kod_pracoviste,
                p.nazev_pracoviste,
                p.ciselna_rada_vpd,
                p.vpd_od_cislo,
                p.ciselna_rada_ppd,
                p.ppd_od_cislo,
                p.aktivni AS pokladna_aktivni,
                
                -- Data uživatele
                u.jmeno AS uzivatel_jmeno,
                u.prijmeni AS uzivatel_prijmeni,
                
                -- Kdo vytvořil přiřazení
                vytvoril_u.jmeno AS vytvoril_jmeno,
                vytvoril_u.prijmeni AS vytvoril_prijmeni,
                
                -- Vypočítané pole
                (pu.platne_do IS NULL OR pu.platne_do >= CURDATE()) AS aktivni
                
            FROM 25a_pokladny_uzivatele pu
            
            -- ✅ NOVÝ JOIN na pokladny
            INNER JOIN 25a_pokladny p ON p.id = pu.pokladna_id
            
            LEFT JOIN 25_uzivatele u ON u.id = pu.uzivatel_id
            LEFT JOIN 25_uzivatele vytvoril_u ON vytvoril_u.id = pu.vytvoril
            WHERE pu.id = :id
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':id', $assignmentId, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat aktivní hlavní pokladnu uživatele
     * ✅ REFACTORED: JOIN na 25a_pokladny
     * 
     * @param int $userId ID uživatele
     * @return array|null Hlavní pokladna
     */
    public function getMainAssignment($userId) {
        $sql = "
            SELECT 
                pu.*,
                p.cislo_pokladny,
                p.nazev AS nazev_pokladny,
                p.kod_pracoviste,
                p.nazev_pracoviste,
                p.ciselna_rada_vpd,
                p.vpd_od_cislo,
                p.ciselna_rada_ppd,
                p.ppd_od_cislo,
                p.aktivni AS pokladna_aktivni,
                (pu.platne_do IS NULL OR pu.platne_do >= CURDATE()) AS aktivni
            FROM 25a_pokladny_uzivatele pu
            INNER JOIN 25a_pokladny p ON p.id = pu.pokladna_id
            WHERE pu.uzivatel_id = :userId
              AND pu.je_hlavni = 1
              AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
            LIMIT 1
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':userId', $userId, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat aktivní přiřazení pro konkrétní pokladnu
     * ✅ REFACTORED: JOIN na 25a_pokladny
     * 
     * @param int $userId ID uživatele
     * @param int $cisloPokladny Číslo pokladny
     * @return array|null Přiřazení
     */
    public function getActiveAssignment($userId, $cisloPokladny) {
        $sql = "
            SELECT 
                pu.*,
                p.cislo_pokladny,
                p.nazev AS nazev_pokladny,
                p.kod_pracoviste,
                p.nazev_pracoviste,
                p.ciselna_rada_vpd,
                p.vpd_od_cislo,
                p.ciselna_rada_ppd,
                p.ppd_od_cislo,
                p.aktivni AS pokladna_aktivni,
                (pu.platne_do IS NULL OR pu.platne_do >= CURDATE()) AS aktivni
            FROM 25a_pokladny_uzivatele pu
            INNER JOIN 25a_pokladny p ON p.id = pu.pokladna_id
            WHERE pu.uzivatel_id = :userId
              AND p.cislo_pokladny = :cisloPokladny
              AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
            ORDER BY pu.platne_od DESC
            LIMIT 1
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':userId', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':cisloPokladny', $cisloPokladny, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Vytvořit nové přiřazení pokladny
     * ✅ REFACTORED: 2-krokový proces
     * KROK 1: Najít nebo vytvořit pokladnu v 25a_pokladny
     * KROK 2: Vytvořit přiřazení v 25a_pokladny_uzivatele
     * 
     * @param array $data Data přiřazení
     * @param int $createdBy ID uživatele, který vytváří
     * @return int|bool ID nového přiřazení nebo false
     */
    public function createAssignment($data, $createdBy) {
        // Pokud se vytváří hlavní pokladna, deaktivovat ostatní hlavní
        if (isset($data['je_hlavni']) && $data['je_hlavni'] == 1) {
            $this->unsetMainAssignment($data['uzivatel_id']);
        }
        
        // ========================================================
        // KROK 1: Najít nebo vytvořit pokladnu v 25a_pokladny
        // ========================================================
        
        // 1a) Zkusit najít existující pokladnu podle čísla
        $sqlFind = "SELECT id FROM 25a_pokladny WHERE cislo_pokladny = ? LIMIT 1";
        $stmtFind = $this->db->prepare($sqlFind);
        $stmtFind->execute(array($data['cislo_pokladny']));
        $existing = $stmtFind->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // Pokladna již existuje - použít její ID
            $pokladnaId = $existing['id'];
            
            // VOLITELNÉ: Pokud FE poslal jiné VPD/PPD, můžeme je aktualizovat
            // nebo ignorovat (záleží na business logice)
            // Pro teď: POUŽÍVÁME EXISTUJÍCÍ POKLADNU BEZ ÚPRAV
            
        } else {
            // 1b) Vytvořit novou pokladnu
            $sqlCreatePokladna = "
                INSERT INTO 25a_pokladny (
                    cislo_pokladny,
                    nazev,
                    kod_pracoviste,
                    nazev_pracoviste,
                    ciselna_rada_vpd,
                    vpd_od_cislo,
                    ciselna_rada_ppd,
                    ppd_od_cislo,
                    aktivni,
                    vytvoreno,
                    vytvoril
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?)
            ";
            
            $nazev = isset($data['nazev_pokladny']) ? $data['nazev_pokladny'] : 'Pokladna ' . $data['cislo_pokladny'];
            
            $stmtCreate = $this->db->prepare($sqlCreatePokladna);
            $stmtCreate->execute(array(
                $data['cislo_pokladny'],
                $nazev,
                isset($data['kod_pracoviste']) ? $data['kod_pracoviste'] : null,
                isset($data['nazev_pracoviste']) ? $data['nazev_pracoviste'] : null,
                isset($data['ciselna_rada_vpd']) ? $data['ciselna_rada_vpd'] : null,
                isset($data['vpd_od_cislo']) ? $data['vpd_od_cislo'] : 1,
                isset($data['ciselna_rada_ppd']) ? $data['ciselna_rada_ppd'] : null,
                isset($data['ppd_od_cislo']) ? $data['ppd_od_cislo'] : 1,
                $createdBy
            ));
            
            $pokladnaId = $this->db->lastInsertId();
        }
        
        // ========================================================
        // KROK 2: Vytvořit přiřazení v 25a_pokladny_uzivatele
        // ========================================================
        
        $sqlCreateAssignment = "
            INSERT INTO 25a_pokladny_uzivatele (
                pokladna_id,
                uzivatel_id,
                je_hlavni,
                platne_od,
                platne_do,
                poznamka,
                vytvoreno,
                vytvoril
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
        ";
        
        $stmtAssignment = $this->db->prepare($sqlCreateAssignment);
        $stmtAssignment->execute(array(
            $pokladnaId,
            $data['uzivatel_id'],
            isset($data['je_hlavni']) ? $data['je_hlavni'] : 0,
            $data['platne_od'],
            isset($data['platne_do']) ? $data['platne_do'] : null,
            isset($data['poznamka']) ? $data['poznamka'] : null,
            $createdBy
        ));
        
        return $this->db->lastInsertId();
    }
    
    /**
     * Aktualizovat přiřazení
     * ✅ REFACTORED: Možnost A - upravit sdílenou pokladnu (ovlivní všechny uživatele)
     * 
     * Logika:
     * - Pokud se mění VPD/PPD → UPDATE v 25a_pokladny (ovlivní VŠECHNY uživatele sdílené pokladny)
     * - Pokud se mění pouze datumy/poznámka → UPDATE jen v 25a_pokladny_uzivatele
     * 
     * @param int $assignmentId ID přiřazení
     * @param array $data Nová data
     * @return bool|array Úspěch operace nebo array s detaily
     */
    public function updateAssignment($assignmentId, $data) {
        $assignment = $this->getAssignmentById($assignmentId);
        if (!$assignment) {
            return false;
        }
        
        // Pokud se nastavuje jako hlavní, deaktivovat ostatní hlavní
        if (isset($data['je_hlavni']) && $data['je_hlavni'] == 1) {
            $this->unsetMainAssignment($assignment['uzivatel_id'], $assignmentId);
        }
        
        $affectedUsers = 0;
        
        // ========================================================
        // KROK 1: Pokud se mění VPD/PPD → UPDATE pokladny
        // ========================================================
        
        $vpdPpdChanged = (
            (isset($data['ciselna_rada_vpd']) && $data['ciselna_rada_vpd'] != $assignment['ciselna_rada_vpd']) ||
            (isset($data['vpd_od_cislo']) && $data['vpd_od_cislo'] != $assignment['vpd_od_cislo']) ||
            (isset($data['ciselna_rada_ppd']) && $data['ciselna_rada_ppd'] != $assignment['ciselna_rada_ppd']) ||
            (isset($data['ppd_od_cislo']) && $data['ppd_od_cislo'] != $assignment['ppd_od_cislo'])
        );
        
        if ($vpdPpdChanged) {
            // Zjistit, kolik uživatelů bude ovlivněno
            $sqlCount = "SELECT COUNT(*) as cnt FROM 25a_pokladny_uzivatele WHERE pokladna_id = ?";
            $stmtCount = $this->db->prepare($sqlCount);
            $stmtCount->execute(array($assignment['pokladna_id']));
            $result = $stmtCount->fetch(PDO::FETCH_ASSOC);
            $affectedUsers = $result['cnt'];
            
            // UPDATE pokladny (ovlivní VŠECHNY uživatele)
            $sqlUpdatePokladna = "
                UPDATE 25a_pokladny
                SET 
                    ciselna_rada_vpd = ?,
                    vpd_od_cislo = ?,
                    ciselna_rada_ppd = ?,
                    ppd_od_cislo = ?,
                    aktualizovano = NOW()
                WHERE id = ?
            ";
            
            $stmtPokladna = $this->db->prepare($sqlUpdatePokladna);
            $stmtPokladna->execute(array(
                isset($data['ciselna_rada_vpd']) ? $data['ciselna_rada_vpd'] : $assignment['ciselna_rada_vpd'],
                isset($data['vpd_od_cislo']) ? $data['vpd_od_cislo'] : $assignment['vpd_od_cislo'],
                isset($data['ciselna_rada_ppd']) ? $data['ciselna_rada_ppd'] : $assignment['ciselna_rada_ppd'],
                isset($data['ppd_od_cislo']) ? $data['ppd_od_cislo'] : $assignment['ppd_od_cislo'],
                $assignment['pokladna_id']
            ));
        }
        
        // ========================================================
        // KROK 2: UPDATE přiřazení (datumy, hlavní, poznámka)
        // ========================================================
        
        $sqlUpdateAssignment = "
            UPDATE 25a_pokladny_uzivatele
            SET
                je_hlavni = ?,
                platne_od = ?,
                platne_do = ?,
                poznamka = ?
            WHERE id = ?
        ";
        
        $stmtAssignment = $this->db->prepare($sqlUpdateAssignment);
        $stmtAssignment->execute(array(
            isset($data['je_hlavni']) ? $data['je_hlavni'] : $assignment['je_hlavni'],
            isset($data['platne_od']) ? $data['platne_od'] : $assignment['platne_od'],
            isset($data['platne_do']) ? $data['platne_do'] : $assignment['platne_do'],
            isset($data['poznamka']) ? $data['poznamka'] : $assignment['poznamka'],
            $assignmentId
        ));
        
        // Vrátit info o ovlivněných uživatelích
        return array(
            'success' => true,
            'affected_users' => $affectedUsers
        );
    }
    
    /**
     * Smazat přiřazení
     * 
     * @param int $assignmentId ID přiřazení
     * @return bool Úspěch operace
     */
    public function deleteAssignment($assignmentId) {
        $sql = "DELETE FROM 25a_pokladny_uzivatele WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':id', $assignmentId, PDO::PARAM_INT);
        
        return $stmt->execute();
    }
    
    /**
     * Deaktivovat všechny hlavní pokladny uživatele
     * 
     * @param int $userId ID uživatele
     * @param int|null $exceptId ID přiřazení, které nevynulovat
     * @return bool Úspěch operace
     */
    private function unsetMainAssignment($userId, $exceptId = null) {
        $sql = "
            UPDATE 25a_pokladny_uzivatele
            SET je_hlavni = 0
            WHERE uzivatel_id = :userId
              AND je_hlavni = 1
        ";
        
        if ($exceptId !== null) {
            $sql .= " AND id != :exceptId";
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':userId', $userId, PDO::PARAM_INT);
        
        if ($exceptId !== null) {
            $stmt->bindValue(':exceptId', $exceptId, PDO::PARAM_INT);
        }
        
        return $stmt->execute();
    }
    
    /**
     * Zkontrolovat, zda existuje překrývající se přiřazení
     * ✅ REFACTORED: JOIN na 25a_pokladny
     * 
     * @param int $userId ID uživatele
     * @param int $cisloPokladny Číslo pokladny
     * @param string $platneOd Platnost od
     * @param string|null $platneDo Platnost do
     * @param int|null $excludeId ID přiřazení k vyloučení (při update)
     * @return bool True pokud existuje konflikt
     */
    public function hasOverlappingAssignment($userId, $cisloPokladny, $platneOd, $platneDo, $excludeId = null) {
        $sql = "
            SELECT COUNT(*) as count
            FROM 25a_pokladny_uzivatele pu
            INNER JOIN 25a_pokladny p ON p.id = pu.pokladna_id
            WHERE pu.uzivatel_id = :userId
              AND p.cislo_pokladny = :cisloPokladny
              AND (
                  -- Nové období začíná v existujícím období
                  (:platneOd BETWEEN pu.platne_od AND COALESCE(pu.platne_do, '9999-12-31'))
                  OR
                  -- Nové období končí v existujícím období
                  (:platneDo BETWEEN pu.platne_od AND COALESCE(pu.platne_do, '9999-12-31'))
                  OR
                  -- Nové období obklopuje existující období
                  (pu.platne_od >= :platneOd AND COALESCE(pu.platne_do, '9999-12-31') <= :platneDo)
              )
        ";
        
        if ($excludeId !== null) {
            $sql .= " AND pu.id != :excludeId";
        }
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':userId', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':cisloPokladny', $cisloPokladny, PDO::PARAM_INT);
        $stmt->bindValue(':platneOd', $platneOd, PDO::PARAM_STR);
        $stmt->bindValue(':platneDo', $platneDo ? $platneDo : '9999-12-31', PDO::PARAM_STR);
        
        if ($excludeId !== null) {
            $stmt->bindValue(':excludeId', $excludeId, PDO::PARAM_INT);
        }
        
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result['count'] > 0;
    }
    
    /**
     * Synchronizovat uživatele pro pokladnu (batch operace)
     * ✅ NOVÝ: Pro dialog Save - smaže všechny a vloží nové
     * 
     * @param int $pokladnaId ID pokladny
     * @param array $uzivatele Seznam uživatelů k přiřazení
     * @param string $username Username operátora (pro audit)
     * @return array Počet smazaných a vložených záznamů
     */
    public function syncUsersForCashbox($pokladnaId, $uzivatele, $username) {
        try {
            $this->db->beginTransaction();
            
            // 1. Smazat všechny stávající přiřazení
            $sqlDelete = "DELETE FROM 25a_pokladny_uzivatele WHERE pokladna_id = ?";
            $stmtDelete = $this->db->prepare($sqlDelete);
            $stmtDelete->execute(array($pokladnaId));
            $deleted = $stmtDelete->rowCount();
            
            error_log("CASHBOX SYNC: Deleted $deleted users from cashbox $pokladnaId");
            
            // 2. Vložit nová přiřazení
            $inserted = 0;
            if (!empty($uzivatele)) {
                $sqlInsert = "
                    INSERT INTO 25a_pokladny_uzivatele 
                    (pokladna_id, uzivatel_id, je_hlavni, platne_od, platne_do, poznamka, vytvoril, vytvoreno)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                ";
                $stmtInsert = $this->db->prepare($sqlInsert);
                
                foreach ($uzivatele as $u) {
                    // platne_do: NULL = navždy, jinak konkrétní datum
                    $platneDo = null;
                    if (isset($u['platne_do']) && !empty($u['platne_do'])) {
                        $platneDo = $u['platne_do'];
                    }
                    
                    $stmtInsert->execute(array(
                        $pokladnaId,
                        $u['uzivatel_id'],
                        isset($u['je_hlavni']) ? $u['je_hlavni'] : 1,
                        isset($u['platne_od']) ? $u['platne_od'] : date('Y-m-d'),
                        $platneDo,
                        isset($u['poznamka']) ? $u['poznamka'] : '',
                        $username
                    ));
                    $inserted++;
                }
            }
            
            $this->db->commit();
            
            error_log("CASHBOX SYNC: Inserted $inserted new users to cashbox $pokladnaId");
            
            return array(
                'deleted' => $deleted,
                'inserted' => $inserted
            );
            
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("CASHBOX SYNC ERROR: " . $e->getMessage());
            throw $e;
        }
    }
}

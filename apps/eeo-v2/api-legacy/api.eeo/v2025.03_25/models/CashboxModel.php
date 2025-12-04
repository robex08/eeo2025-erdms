<?php
/**
 * Model pro správu pokladen (master data)
 * 
 * Spravuje tabulku 25a_pokladny
 * - Definice pokladen (číslo, název, pracoviště)
 * - VPD/PPD číselné řady
 * - Aktivace/deaktivace pokladen
 * 
 * PHP 5.6 kompatibilní
 * MySQL 5.5.43 kompatibilní
 * 
 * @package CashbookAPI
 * @version 1.0
 * @date 2025-11-08
 */

class CashboxModel {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Získat seznam všech pokladen
     * 
     * @param bool $activeOnly Pouze aktivní pokladny
     * @return array Seznam pokladen
     */
    public function getAllCashboxes($activeOnly = true) {
        $sql = "
            SELECT 
                p.id,
                p.cislo_pokladny,
                p.nazev,
                p.kod_pracoviste,
                p.nazev_pracoviste,
                p.ciselna_rada_vpd,
                p.vpd_od_cislo,
                p.ciselna_rada_ppd,
                p.ppd_od_cislo,
                p.aktivni,
                p.poznamka,
                p.vytvoreno,
                p.aktualizovano,
                
                -- Počet přiřazených uživatelů (aktivních)
                (SELECT COUNT(*) 
                 FROM 25a_pokladny_uzivatele pu 
                 WHERE pu.pokladna_id = p.id 
                   AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
                ) AS pocet_uzivatelu
                
            FROM 25a_pokladny p
        ";
        
        if ($activeOnly) {
            $sql .= " WHERE p.aktivni = 1";
        }
        
        $sql .= " ORDER BY p.cislo_pokladny";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat pokladnu podle ID
     * 
     * @param int $cashboxId ID pokladny
     * @return array|null Data pokladny
     */
    public function getCashboxById($cashboxId) {
        $sql = "
            SELECT 
                p.*,
                (SELECT COUNT(*) 
                 FROM 25a_pokladny_uzivatele pu 
                 WHERE pu.pokladna_id = p.id 
                   AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
                ) AS pocet_uzivatelu
            FROM 25a_pokladny p
            WHERE p.id = ?
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array($cashboxId));
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Získat pokladnu podle čísla pokladny
     * 
     * @param int $cisloPokladny Číslo pokladny
     * @return array|null Data pokladny
     */
    public function getCashboxByNumber($cisloPokladny) {
        $sql = "
            SELECT 
                p.*,
                (SELECT COUNT(*) 
                 FROM 25a_pokladny_uzivatele pu 
                 WHERE pu.pokladna_id = p.id 
                   AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
                ) AS pocet_uzivatelu
            FROM 25a_pokladny p
            WHERE p.cislo_pokladny = ?
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array($cisloPokladny));
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Vytvořit novou pokladnu
     * 
     * @param array $data Data pokladny
     * @param int $createdBy ID uživatele, který vytváří
     * @return int|bool ID nové pokladny nebo false
     */
    public function createCashbox($data, $createdBy) {
        // Kontrola, zda číslo pokladny již neexistuje
        $existing = $this->getCashboxByNumber($data['cislo_pokladny']);
        if ($existing) {
            return false; // Pokladna již existuje
        }
        
        $sql = "
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
                poznamka,
                vytvoreno,
                vytvoril
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        ";
        
        $nazev = isset($data['nazev']) ? $data['nazev'] : 'Pokladna ' . $data['cislo_pokladny'];
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array(
            $data['cislo_pokladny'],
            $nazev,
            isset($data['kod_pracoviste']) ? $data['kod_pracoviste'] : null,
            isset($data['nazev_pracoviste']) ? $data['nazev_pracoviste'] : null,
            isset($data['ciselna_rada_vpd']) ? $data['ciselna_rada_vpd'] : null,
            isset($data['vpd_od_cislo']) ? $data['vpd_od_cislo'] : 1,
            isset($data['ciselna_rada_ppd']) ? $data['ciselna_rada_ppd'] : null,
            isset($data['ppd_od_cislo']) ? $data['ppd_od_cislo'] : 1,
            isset($data['aktivni']) ? $data['aktivni'] : 1,
            isset($data['poznamka']) ? $data['poznamka'] : null,
            $createdBy
        ));
        
        return $this->db->lastInsertId();
    }
    
    /**
     * Aktualizovat pokladnu
     * 
     * @param int $cashboxId ID pokladny
     * @param array $data Nová data
     * @param int $updatedBy ID uživatele, který upravuje
     * @return bool Úspěch operace
     */
    public function updateCashbox($cashboxId, $data, $updatedBy) {
        $cashbox = $this->getCashboxById($cashboxId);
        if (!$cashbox) {
            return false;
        }
        
        $sql = "
            UPDATE 25a_pokladny
            SET
                nazev = ?,
                kod_pracoviste = ?,
                nazev_pracoviste = ?,
                ciselna_rada_vpd = ?,
                vpd_od_cislo = ?,
                ciselna_rada_ppd = ?,
                ppd_od_cislo = ?,
                aktivni = ?,
                poznamka = ?,
                aktualizovano = NOW(),
                aktualizoval = ?
            WHERE id = ?
        ";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(array(
            isset($data['nazev']) ? $data['nazev'] : $cashbox['nazev'],
            isset($data['kod_pracoviste']) ? $data['kod_pracoviste'] : $cashbox['kod_pracoviste'],
            isset($data['nazev_pracoviste']) ? $data['nazev_pracoviste'] : $cashbox['nazev_pracoviste'],
            isset($data['ciselna_rada_vpd']) ? $data['ciselna_rada_vpd'] : $cashbox['ciselna_rada_vpd'],
            isset($data['vpd_od_cislo']) ? $data['vpd_od_cislo'] : $cashbox['vpd_od_cislo'],
            isset($data['ciselna_rada_ppd']) ? $data['ciselna_rada_ppd'] : $cashbox['ciselna_rada_ppd'],
            isset($data['ppd_od_cislo']) ? $data['ppd_od_cislo'] : $cashbox['ppd_od_cislo'],
            isset($data['aktivni']) ? $data['aktivni'] : $cashbox['aktivni'],
            isset($data['poznamka']) ? $data['poznamka'] : $cashbox['poznamka'],
            $updatedBy,
            $cashboxId
        ));
    }
    
    /**
     * Deaktivovat pokladnu (soft delete)
     * 
     * @param int $cashboxId ID pokladny
     * @param int $updatedBy ID uživatele, který deaktivuje
     * @return bool Úspěch operace
     */
    public function deactivateCashbox($cashboxId, $updatedBy) {
        $sql = "
            UPDATE 25a_pokladny
            SET
                aktivni = 0,
                aktualizovano = NOW(),
                aktualizoval = ?
            WHERE id = ?
        ";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(array($updatedBy, $cashboxId));
    }
    
    /**
     * Aktivovat pokladnu
     * 
     * @param int $cashboxId ID pokladny
     * @param int $updatedBy ID uživatele, který aktivuje
     * @return bool Úspěch operace
     */
    public function activateCashbox($cashboxId, $updatedBy) {
        $sql = "
            UPDATE 25a_pokladny
            SET
                aktivni = 1,
                aktualizovano = NOW(),
                aktualizoval = ?
            WHERE id = ?
        ";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(array($updatedBy, $cashboxId));
    }
    
    /**
     * Smazat pokladnu (pouze pokud nemá žádná přiřazení)
     * 
     * @param int $cashboxId ID pokladny
     * @return bool Úspěch operace
     */
    public function deleteCashbox($cashboxId) {
        // Zkontrolovat, zda pokladna nemá přiřazení
        $sql = "SELECT COUNT(*) as cnt FROM 25a_pokladny_uzivatele WHERE pokladna_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array($cashboxId));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['cnt'] > 0) {
            return false; // Nelze smazat - existují přiřazení
        }
        
        // Smazat pokladnu
        $sql = "DELETE FROM 25a_pokladny WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute(array($cashboxId));
    }
    
    /**
     * Najít nebo vytvořit pokladnu podle čísla
     * Helper metoda pro createAssignment
     * 
     * @param int $cisloPokladny Číslo pokladny
     * @param array $data Data pro vytvoření (pokud neexistuje)
     * @param int $createdBy ID uživatele
     * @return int|bool ID pokladny nebo false
     */
    public function findOrCreateCashbox($cisloPokladny, $data, $createdBy) {
        // Zkusit najít
        $existing = $this->getCashboxByNumber($cisloPokladny);
        
        if ($existing) {
            return $existing['id'];
        }
        
        // Vytvořit novou
        $data['cislo_pokladny'] = $cisloPokladny;
        return $this->createCashbox($data, $createdBy);
    }
}

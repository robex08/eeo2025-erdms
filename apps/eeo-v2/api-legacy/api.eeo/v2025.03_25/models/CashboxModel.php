<?php
/**
 * Model pro správu pokladen (master data)
 * 
 * Spravuje tabulku TBL_POKLADNY (25a_pokladny)
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
                p.pocatecni_stav_rok,
                p.ciselna_rada_vpd,
                p.vpd_od_cislo,
                p.ciselna_rada_ppd,
                p.ppd_od_cislo,
                p.aktivni,
                p.lp_kod_povinny,
                p.poznamka,
                p.vytvoreno,
                p.aktualizovano,
                
                -- Počet přiřazených uživatelů (aktivních)
                (SELECT COUNT(*) 
                 FROM " . TBL_POKLADNY_UZIVATELE . " pu 
                 WHERE pu.pokladna_id = p.id 
                   AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
                ) AS pocet_uzivatelu
                
            FROM " . TBL_POKLADNY . " p
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
                 FROM " . TBL_POKLADNY_UZIVATELE . " pu 
                 WHERE pu.pokladna_id = p.id 
                   AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
                ) AS pocet_uzivatelu
            FROM " . TBL_POKLADNY . " p
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
                 FROM " . TBL_POKLADNY_UZIVATELE . " pu 
                 WHERE pu.pokladna_id = p.id 
                   AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
                ) AS pocet_uzivatelu
            FROM " . TBL_POKLADNY . " p
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
            INSERT INTO " . TBL_POKLADNY . " (
                cislo_pokladny,
                nazev,
                kod_pracoviste,
                nazev_pracoviste,
                pocatecni_stav_rok,
                ciselna_rada_vpd,
                vpd_od_cislo,
                ciselna_rada_ppd,
                ppd_od_cislo,
                aktivni,
                poznamka,
                vytvoreno,
                vytvoril
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        ";
        
        $nazev = isset($data['nazev']) ? $data['nazev'] : 'Pokladna ' . $data['cislo_pokladny'];
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array(
            $data['cislo_pokladny'],
            $nazev,
            isset($data['kod_pracoviste']) ? $data['kod_pracoviste'] : null,
            isset($data['nazev_pracoviste']) ? $data['nazev_pracoviste'] : null,
            isset($data['pocatecni_stav_rok']) && $data['pocatecni_stav_rok'] !== null && $data['pocatecni_stav_rok'] !== '' ? $data['pocatecni_stav_rok'] : null,
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
            UPDATE " . TBL_POKLADNY . "
            SET
                nazev = ?,
                kod_pracoviste = ?,
                nazev_pracoviste = ?,
                pocatecni_stav_rok = ?,
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
            isset($data['pocatecni_stav_rok']) && $data['pocatecni_stav_rok'] !== '' ? $data['pocatecni_stav_rok'] : null,
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
            UPDATE " . TBL_POKLADNY . "
            SET
                aktivni = 0,
                aktualizovano = NOW(),
                aktualizoval = ?
            WHERE id = ?
        ";
        
        $stmt = $this->db->prepare($sql);
        // OPRAVA: Parametry musí být v pořadí podle SQL: aktualizoval (SET), id (WHERE)
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
            UPDATE " . TBL_POKLADNY . "
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
        $sql = "SELECT COUNT(*) as cnt FROM " . TBL_POKLADNY_UZIVATELE . " WHERE pokladna_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array($cashboxId));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['cnt'] > 0) {
            return false; // Nelze smazat - existují přiřazení
        }
        
        // Smazat pokladnu
        $sql = "DELETE FROM " . TBL_POKLADNY . " WHERE id = ?";
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
    
    /**
     * 🆕 Přepočítat počáteční stavy všech lednových knih pro tuto pokladnu
     * Volá se po změně pocatecni_stav_rok v nastavení pokladny
     * 
     * @param int $pokladnaId - ID pokladny
     * @return int - Počet aktualizovaných lednových knih
     */
    public function recalculateJanuaryBooks($pokladnaId) {
        // Načíst aktuální pocatecni_stav_rok z nastavení pokladny
        $stmt = $this->db->prepare("
            SELECT pocatecni_stav_rok 
            FROM " . TBL_POKLADNY . " 
            WHERE id = ?
            LIMIT 1
        ");
        $stmt->execute(array($pokladnaId));
        $pokladna = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$pokladna) {
            return 0; // Pokladna neexistuje
        }
        
        $pocatecniStavRok = $pokladna['pocatecni_stav_rok'];
        
        // Najít všechny lednové knihy pro tuto pokladnu
        $stmt = $this->db->prepare("
            SELECT id, uzivatel_id, rok, pocatecni_stav, prevod_z_predchoziho
            FROM " . TBL_POKLADNI_KNIHY . " 
            WHERE pokladna_id = ?
              AND mesic = 1
            ORDER BY rok, uzivatel_id
        ");
        $stmt->execute(array($pokladnaId));
        $januaryBooks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $updated = 0;
        
        foreach ($januaryBooks as $book) {
            // Vypočítat nový počáteční stav
            $novyPocatecniStav = 0.00;
            
            if ($pocatecniStavRok !== null) {
                // Použít pocatecni_stav_rok z nastavení pokladny
                $novyPocatecniStav = floatval($pocatecniStavRok);
            } else {
                // Použít standardní logiku - převod z prosince předchozího roku
                $novyPocatecniStav = $this->getPreviousMonthBalance(
                    $book['uzivatel_id'], 
                    $pokladnaId, 
                    $book['rok'], 
                    1 // leden
                );
            }
            
            // Přepočítat koncový stav
            $stmt = $this->db->prepare("
                SELECT 
                    COALESCE(SUM(castka_prijem), 0) as total_income,
                    COALESCE(SUM(castka_vydaj), 0) as total_expense
                FROM " . TBL_POKLADNI_POLOZKY . " 
                WHERE pokladni_kniha_id = ?
            ");
            $stmt->execute(array($book['id']));
            $sums = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $totalIncome = floatval($sums['total_income']);
            $totalExpense = floatval($sums['total_expense']);
            $novyKoncovyStav = $novyPocatecniStav + $totalIncome - $totalExpense;
            
            // Aktualizovat knihu
            $stmt = $this->db->prepare("
                UPDATE " . TBL_POKLADNI_KNIHY . " 
                SET 
                    prevod_z_predchoziho = ?,
                    pocatecni_stav = ?,
                    koncovy_stav = ?
                WHERE id = ?
            ");
            $result = $stmt->execute(array(
                $novyPocatecniStav,  // prevod_z_predchoziho
                $novyPocatecniStav,  // pocatecni_stav
                $novyKoncovyStav,    // koncovy_stav
                $book['id']
            ));
            
            if ($result) {
                $updated++;
                
                // 🆕 KRITICKÉ: Přepočítat zůstatky POLOŽEK v knize
                require_once __DIR__ . '/../services/BalanceCalculator.php';
                $balanceCalc = new BalanceCalculator($this->db);
                $balanceCalc->recalculateBookBalances($book['id']);
                
                // Přepočítat všechny následující měsíce pro tohoto uživatele
                $this->recalculateFollowingMonths(
                    $book['uzivatel_id'], 
                    $pokladnaId, 
                    $book['rok'], 
                    1  // od ledna
                );
            }
        }
        
        return $updated;
    }
    
    /**
     * Získat koncový stav z předchozího měsíce
     * Pro výpočet počátečního stavu aktuálního měsíce
     * 
     * @param int $uzivatelId ID uživatele
     * @param int $pokladnaId ID pokladny
     * @param int $rok Aktuální rok
     * @param int $mesic Aktuální měsíc
     * @return float Koncový stav předchozího měsíce
     */
    private function getPreviousMonthBalance($uzivatelId, $pokladnaId, $rok, $mesic) {
        $prevMesic = $mesic - 1;
        $prevRok = $rok;
        
        if ($prevMesic < 1) {
            $prevMesic = 12;
            $prevRok = $rok - 1;
        }
        
        $stmt = $this->db->prepare("
            SELECT koncovy_stav
            FROM " . TBL_POKLADNI_KNIHY . " 
            WHERE uzivatel_id = ?
              AND pokladna_id = ?
              AND rok = ?
              AND mesic = ?
            LIMIT 1
        ");
        $stmt->execute(array($uzivatelId, $pokladnaId, $prevRok, $prevMesic));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result ? floatval($result['koncovy_stav']) : 0.00;
    }
    
    /**
     * Přepočítat všechny následující měsíce po změně
     * Propaguje změny počátečního stavu do všech dalších měsíců
     * 
     * @param int $uzivatelId ID uživatele
     * @param int $pokladnaId ID pokladny
     * @param int $rok Rok
     * @param int $odMesic Od kterého měsíce přepočítat
     */
    private function recalculateFollowingMonths($uzivatelId, $pokladnaId, $rok, $odMesic) {
        for ($mesic = $odMesic + 1; $mesic <= 12; $mesic++) {
            $prevBalance = $this->getPreviousMonthBalance($uzivatelId, $pokladnaId, $rok, $mesic);
            
            // Načíst aktuální knihu
            $stmt = $this->db->prepare("
                SELECT id
                FROM " . TBL_POKLADNI_KNIHY . " 
                WHERE uzivatel_id = ?
                  AND pokladna_id = ?
                  AND rok = ?
                  AND mesic = ?
                LIMIT 1
            ");
            $stmt->execute(array($uzivatelId, $pokladnaId, $rok, $mesic));
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$book) {
                continue; // Měsíc neexistuje, přeskočit
            }
            
            // Přepočítat sumy
            $stmt = $this->db->prepare("
                SELECT 
                    COALESCE(SUM(castka_prijem), 0) as total_income,
                    COALESCE(SUM(castka_vydaj), 0) as total_expense
                FROM " . TBL_POKLADNI_POLOZKY . " 
                WHERE pokladni_kniha_id = ?
            ");
            $stmt->execute(array($book['id']));
            $sums = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $totalIncome = floatval($sums['total_income']);
            $totalExpense = floatval($sums['total_expense']);
            $novyKoncovyStav = $prevBalance + $totalIncome - $totalExpense;
            
            // Aktualizovat knihu
            $stmt = $this->db->prepare("
                UPDATE " . TBL_POKLADNI_KNIHY . " 
                SET 
                    prevod_z_predchoziho = ?,
                    pocatecni_stav = ?,
                    koncovy_stav = ?
                WHERE id = ?
            ");
            $stmt->execute(array(
                $prevBalance,
                $prevBalance,
                $novyKoncovyStav,
                $book['id']
            ));
            
            // 🆕 KRITICKÉ: Přepočítat zůstatky POLOŽEK v knize
            require_once __DIR__ . '/../services/BalanceCalculator.php';
            $balanceCalc = new BalanceCalculator($this->db);
            $balanceCalc->recalculateBookBalances($book['id']);
        }
    }
}

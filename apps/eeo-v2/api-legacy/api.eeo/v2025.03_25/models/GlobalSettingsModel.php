<?php
/**
 * Model pro globální nastavení systému
 * 
 * Spravuje tabulku 25a_nastaveni_globalni
 * - Uložení konfiguračních hodnot
 * - cashbook_use_prefix (prefix v číslování dokladů)
 * 
 * @package CashbookAPI
 * @version 1.0
 */

class GlobalSettingsModel {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Získat hodnotu nastavení podle klíče
     * 
     * @param string $key Klíč nastavení
     * @return string|null Hodnota nastavení
     */
    public function getSetting($key) {
        $sql = "
            SELECT hodnota
            FROM 25a_nastaveni_globalni
            WHERE klic = :key
            LIMIT 1
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':key', $key, PDO::PARAM_STR);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result ? $result['hodnota'] : null;
    }
    
    /**
     * Získat všechna nastavení
     * 
     * @return array Pole nastavení (klíč => hodnota)
     */
    public function getAllSettings() {
        $sql = "
            SELECT klic, hodnota, popis
            FROM 25a_nastaveni_globalni
            ORDER BY klic
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $settings = array();
        
        foreach ($results as $row) {
            $settings[$row['klic']] = array(
                'hodnota' => $row['hodnota'],
                'popis' => $row['popis']
            );
        }
        
        return $settings;
    }
    
    /**
     * Nastavit hodnotu nastavení
     * 
     * @param string $key Klíč nastavení
     * @param string $value Nová hodnota
     * @param string|null $description Popis nastavení
     * @return bool Úspěch operace
     */
    public function setSetting($key, $value, $description = null) {
        // Zkontrolovat, zda nastavení existuje
        $existing = $this->getSetting($key);
        
        if ($existing !== null) {
            // UPDATE
            $sql = "
                UPDATE 25a_nastaveni_globalni
                SET hodnota = :value,
                    aktualizovano = NOW()
            ";
            
            if ($description !== null) {
                $sql .= ", popis = :description";
            }
            
            $sql .= " WHERE klic = :key";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':value', $value, PDO::PARAM_STR);
            $stmt->bindValue(':key', $key, PDO::PARAM_STR);
            
            if ($description !== null) {
                $stmt->bindValue(':description', $description, PDO::PARAM_STR);
            }
            
            return $stmt->execute();
        } else {
            // INSERT
            $sql = "
                INSERT INTO 25a_nastaveni_globalni (
                    klic,
                    hodnota,
                    popis,
                    vytvoreno
                ) VALUES (
                    :key,
                    :value,
                    :description,
                    NOW()
                )
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':key', $key, PDO::PARAM_STR);
            $stmt->bindValue(':value', $value, PDO::PARAM_STR);
            $stmt->bindValue(':description', $description, PDO::PARAM_STR);
            
            return $stmt->execute();
        }
    }
    
    /**
     * Smazat nastavení
     * 
     * @param string $key Klíč nastavení
     * @return bool Úspěch operace
     */
    public function deleteSetting($key) {
        $sql = "DELETE FROM 25a_nastaveni_globalni WHERE klic = :key";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':key', $key, PDO::PARAM_STR);
        
        return $stmt->execute();
    }
    
    /**
     * Zkontrolovat, zda je zapnutý prefix v číslování dokladů
     * 
     * @return bool True pokud je prefix zapnutý
     */
    public function isDocumentPrefixEnabled() {
        $value = $this->getSetting('cashbook_use_prefix');
        return $value === '1';
    }
}

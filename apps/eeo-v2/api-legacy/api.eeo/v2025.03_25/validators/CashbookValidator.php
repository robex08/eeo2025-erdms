<?php
/**
 * CashbookValidator.php
 * Validace vstupních dat pro pokladní knihy
 * PHP 5.6 kompatibilní
 */

class CashbookValidator {
    
    /**
     * Validovat data pro vytvoření knihy
     */
    public function validateCreate($data) {
        $errors = array();
        
        // Povinné pole: uzivatel_id
        if (empty($data['uzivatel_id'])) {
            $errors[] = 'uzivatel_id je povinné';
        } elseif (!is_numeric($data['uzivatel_id'])) {
            $errors[] = 'uzivatel_id musí být číslo';
        }
        
        // Povinné pole: rok
        if (empty($data['rok'])) {
            $errors[] = 'rok je povinný';
        } elseif (!is_numeric($data['rok']) || $data['rok'] < 2000 || $data['rok'] > 2100) {
            $errors[] = 'rok musí být platné číslo mezi 2000 a 2100';
        }
        
        // Povinné pole: mesic
        if (empty($data['mesic'])) {
            $errors[] = 'mesic je povinný';
        } elseif (!is_numeric($data['mesic']) || $data['mesic'] < 1 || $data['mesic'] > 12) {
            $errors[] = 'mesic musí být číslo mezi 1 a 12';
        }
        
        // Volitelné: cislo_pokladny
        if (isset($data['cislo_pokladny']) && !is_numeric($data['cislo_pokladny'])) {
            $errors[] = 'cislo_pokladny musí být číslo';
        }
        
        // Volitelné: prevod_z_predchoziho
        if (isset($data['prevod_z_predchoziho']) && !is_numeric($data['prevod_z_predchoziho'])) {
            $errors[] = 'prevod_z_predchoziho musí být číslo';
        }
        
        // Volitelné: pocatecni_stav
        if (isset($data['pocatecni_stav']) && !is_numeric($data['pocatecni_stav'])) {
            $errors[] = 'pocatecni_stav musí být číslo';
        }
        
        if (!empty($errors)) {
            throw new Exception('Validační chyby: ' . implode(', ', $errors));
        }
        
        return $data;
    }
    
    /**
     * Validovat data pro update knihy
     */
    public function validateUpdate($data) {
        $errors = array();
        
        // Volitelné: cislo_pokladny
        if (isset($data['cislo_pokladny']) && !is_numeric($data['cislo_pokladny'])) {
            $errors[] = 'cislo_pokladny musí být číslo';
        }
        
        // Volitelné: prevod_z_predchoziho
        if (isset($data['prevod_z_predchoziho']) && !is_numeric($data['prevod_z_predchoziho'])) {
            $errors[] = 'prevod_z_predchoziho musí být číslo';
        }
        
        if (!empty($errors)) {
            throw new Exception('Validační chyby: ' . implode(', ', $errors));
        }
        
        return $data;
    }
}

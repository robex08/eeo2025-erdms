<?php

/**
 * Order V2 - Handlers pro práci s LP kódy na úrovni položek
 * 
 * Rozšíření pro práci s LP_ID na úrovni jednotlivých položek objednávky.
 * Zachovává zpětnou kompatibilitu - stávající systém zůstává funkční.
 * 
 * Funkcionality:
 * - Ukládání lp_id při vytvoření/update položky
 * - Enrichment položek o LP data
 * - Validace LP proti seznamu v objednavce
 * - Přepočet čerpání LP podle položek
 * 
 * @compatibility PHP 5.6 + PDO, MySQL 5.5.43
 * @author Senior Developer
 * @date 29. listopadu 2025
 */

// Definice konstant pro názvy tabulek (pokud ještě nejsou definované)
if (!defined('TBL_LP_MASTER')) define('TBL_LP_MASTER', '25_limitovane_prisliby');
if (!defined('TBL_USEKY')) define('TBL_USEKY', '25_useky');

// Include orderQueries.php pro get_order_items_table_name()
require_once __DIR__ . '/orderQueries.php';

/**
 * Uložení LP ID pro položky objednávky
 * 
 * @param PDO $db Database connection (PDO)
 * @param int $objednavka_id ID objednávky
 * @param array $polozky Pole položek s lp_id
 * @return array Výsledek operace
 */
function ulozit_polozky_lp($db, $objednavka_id, $polozky) {
    if (!is_array($polozky) || empty($polozky)) {
        return array(
            'status' => 'ok',
            'message' => 'Žádné položky k uložení',
            'saved_count' => 0
        );
    }
    
    $saved_count = 0;
    $errors = array();
    
    foreach ($polozky as $index => $polozka) {
        // Pouze pokud má položka lp_id
        if (!isset($polozka['lp_id']) || $polozka['lp_id'] === null || $polozka['lp_id'] === '') {
            continue;
        }
        
        $lp_id = intval($polozka['lp_id']);
        $polozka_id = isset($polozka['id']) ? intval($polozka['id']) : 0;
        
        if ($polozka_id > 0) {
            try {
                // Update existující položky - PDO
                $stmt = $db->prepare("
                    UPDATE " . get_order_items_table_name() . " 
                    SET lp_id = :lp_id 
                    WHERE id = :id AND objednavka_id = :objednavka_id
                ");
                
                $stmt->bindValue(':lp_id', $lp_id, PDO::PARAM_INT);
                $stmt->bindValue(':id', $polozka_id, PDO::PARAM_INT);
                $stmt->bindValue(':objednavka_id', $objednavka_id, PDO::PARAM_INT);
                
                if ($stmt->execute()) {
                    $saved_count++;
                }
            } catch (Exception $e) {
                $errors[] = "Chyba update položky $index (ID: $polozka_id): " . $e->getMessage();
            }
        }
    }
    
    return array(
        'status' => empty($errors) ? 'ok' : 'partial',
        'saved_count' => $saved_count,
        'errors' => $errors
    );
}

/**
 * Načtení LP ID pro položky objednávky
 * 
 * @param PDO $db Database connection (PDO)
 * @param int $objednavka_id ID objednávky
 * @return array Mapa polozka_id => lp_id
 */
function nacist_polozky_lp($db, $objednavka_id) {
    $lp_map = array();
    
    try {
        $stmt = $db->prepare("
            SELECT id, lp_id 
            FROM " . get_order_items_table_name() . " 
            WHERE objednavka_id = :objednavka_id AND lp_id IS NOT NULL
        ");
        
        $stmt->bindValue(':objednavka_id', $objednavka_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            $lp_map[intval($row['id'])] = intval($row['lp_id']);
        }
    } catch (Exception $e) {
        error_log("Chyba načítání LP pro položky: " . $e->getMessage());
    }
    
    return $lp_map;
}

/**
 * Enrichment položek o LP data
 * 
 * @param PDO $db Database connection (PDO)
 * @param array $polozky Pole položek k obohacení
 * @param array $dostupne_lp_ids Pole ID LP dostupných pro objednávku (pro validaci)
 * @return array Obohacené položky
 */
function enrich_polozky_s_lp($db, $polozky, $dostupne_lp_ids = array()) {
    error_log("🔍 enrich_polozky_s_lp: START - počet položek: " . count($polozky));
    
    if (!is_array($polozky) || empty($polozky)) {
        error_log("⚠️ enrich_polozky_s_lp: Prázdné pole položek");
        return $polozky;
    }
    
    // Sesbírej všechna lp_id z položek
    $lp_ids_v_polozkach = array();
    foreach ($polozky as $polozka) {
        if (isset($polozka['lp_id']) && $polozka['lp_id'] > 0) {
            $lp_ids_v_polozkach[] = intval($polozka['lp_id']);
        }
    }
    
    error_log("🔍 enrich_polozky_s_lp: Nalezených LP IDs: " . json_encode($lp_ids_v_polozkach));
    
    if (empty($lp_ids_v_polozkach)) {
        error_log("⚠️ enrich_polozky_s_lp: Žádné LP ID v položkách");
        return $polozky;
    }
    
    // Načti LP data pro všechna ID najednou
    $lp_data_map = nacist_lp_data_batch($db, $lp_ids_v_polozkach);
    error_log("🔍 enrich_polozky_s_lp: Načteno LP dat: " . count($lp_data_map));
    error_log("🔍 enrich_polozky_s_lp: LP data: " . json_encode($lp_data_map));
    
    // Obohať každou položku
    foreach ($polozky as &$polozka) {
        if (isset($polozka['lp_id']) && $polozka['lp_id'] > 0) {
            $lp_id = intval($polozka['lp_id']);
            
            if (isset($lp_data_map[$lp_id])) {
                $lp_info = $lp_data_map[$lp_id];
                
                // Přidej LP data do položky
                $polozka['lp_kod'] = $lp_info['cislo_lp'];
                $polozka['lp_nazev'] = $lp_info['nazev_uctu'];
                $polozka['lp_kategorie'] = $lp_info['kategorie'];
                $polozka['lp_limit'] = isset($lp_info['vyse_financniho_kryti']) ? floatval($lp_info['vyse_financniho_kryti']) : 0;
                $polozka['lp_rok'] = isset($lp_info['platne_od']) ? intval(date('Y', strtotime($lp_info['platne_od']))) : 0;
                $polozka['lp_usek_nazev'] = $lp_info['usek_nazev'];
                
                // Validace: Je toto LP mezi dostupnými?
                if (!empty($dostupne_lp_ids)) {
                    $polozka['lp_je_platne'] = in_array($lp_id, $dostupne_lp_ids);
                } else {
                    $polozka['lp_je_platne'] = true;
                }
            } else {
                // LP neexistuje nebo nebylo nalezeno
                $polozka['lp_kod'] = null;
                $polozka['lp_nazev'] = 'LP nenalezeno';
                $polozka['lp_je_platne'] = false;
            }
        } else {
            // Položka nemá přiřazené LP
            $polozka['lp_id'] = null;
            $polozka['lp_kod'] = null;
            $polozka['lp_nazev'] = null;
            $polozka['lp_je_platne'] = true; // není požadováno LP
        }
    }
    unset($polozka); // Uvolnit referenci
    
    return $polozky;
}

/**
 * Dávkové načtení LP dat pro více ID najednou
 * 
 * @param PDO $db Database connection (PDO)
 * @param array $lp_ids Pole LP ID
 * @return array Mapa lp_id => LP data
 */
function nacist_lp_data_batch($db, $lp_ids) {
    $lp_data_map = array();
    
    if (empty($lp_ids)) {
        return $lp_data_map;
    }
    
    try {
        // Sanitize IDs
        $safe_ids = array_map('intval', $lp_ids);
        $placeholders = implode(',', array_fill(0, count($safe_ids), '?'));
        
        $query = "
            SELECT 
                lp.id,
                lp.cislo_lp,
                lp.nazev_uctu,
                lp.kategorie,
                lp.vyse_financniho_kryti,
                lp.platne_od,
                lp.platne_do,
                u.usek_nazev AS usek_nazev
            FROM " . TBL_LP_MASTER . " lp
            LEFT JOIN " . TBL_USEKY . " u ON lp.usek_id = u.id
            WHERE lp.id IN ($placeholders)
        ";
        
        error_log("🔍 LP SQL: " . $query);
        error_log("🔍 LP IDs: " . print_r($safe_ids, true));
        
        $stmt = $db->prepare($query);
        $stmt->execute($safe_ids);
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("🔍 LP počet řádků: " . count($rows));
        error_log("🔍 LP data: " . print_r($rows, true));
        
        foreach ($rows as $row) {
            $lp_data_map[intval($row['id'])] = $row;
        }
    } catch (Exception $e) {
        error_log("❌ Chyba načítání LP batch: " . $e->getMessage());
        error_log("❌ SQL: " . $query);
    }
    
    return $lp_data_map;
}

/**
 * Validace LP ID proti seznamu dostupných LP v objednávce
 * 
 * @param PDO $db Database connection (PDO)
 * @param int $objednavka_id ID objednávky
 * @param array $polozky Pole položek k validaci
 * @return array Validační výsledek
 */
function validovat_lp_v_polozkach($db, $objednavka_id, $polozky) {
    try {
        // Načti dostupná LP z objednavka_data.lp_kody
        $stmt = $db->prepare("
            SELECT objednavka_data 
            FROM " . get_orders_table_name() . " 
            WHERE id = :objednavka_id
        ");
        
        $stmt->bindValue(':objednavka_id', $objednavka_id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return array(
            'valid' => false,
            'errors' => array('Chyba načtení objednávky: ' . $e->getMessage())
        );
    }
    
    if (!$row) {
        return array(
            'valid' => false,
            'errors' => array('Objednávka nenalezena')
        );
    }
    
    $objednavka_data = json_decode($row['objednavka_data'], true);
    $dostupne_lp_ids = isset($objednavka_data['lp_kody']) && is_array($objednavka_data['lp_kody']) 
        ? $objednavka_data['lp_kody'] 
        : array();
    
    $errors = array();
    $warnings = array();
    
    foreach ($polozky as $index => $polozka) {
        if (!isset($polozka['lp_id']) || $polozka['lp_id'] === null) {
            continue; // LP není povinné
        }
        
        $lp_id = intval($polozka['lp_id']);
        
        // Validace: Je LP v seznamu dostupných?
        if (!empty($dostupne_lp_ids) && !in_array($lp_id, $dostupne_lp_ids)) {
            $polozka_nazev = isset($polozka['nazev']) ? $polozka['nazev'] : "Položka #$index";
            $warnings[] = "LP ID $lp_id u '$polozka_nazev' není v seznamu dostupných LP objednávky";
        }
        
        // Validace: Existuje LP?
        $lp_exists = overit_existenci_lp($db, $lp_id);
        if (!$lp_exists) {
            $polozka_nazev = isset($polozka['nazev']) ? $polozka['nazev'] : "Položka #$index";
            $errors[] = "LP ID $lp_id u '$polozka_nazev' neexistuje v databázi";
        }
    }
    
    return array(
        'valid' => empty($errors),
        'errors' => $errors,
        'warnings' => $warnings,
        'dostupne_lp_ids' => $dostupne_lp_ids
    );
}

/**
 * Ověření existence LP v databázi
 * 
 * @param PDO $db Database connection (PDO)
 * @param int $lp_id ID LP
 * @return bool True pokud LP existuje
 */
function overit_existenci_lp($db, $lp_id) {
    try {
        $stmt = $db->prepare("
            SELECT 1 
            FROM " . TBL_LP_MASTER . " 
            WHERE id = :lp_id 
            LIMIT 1
        ");
        
        $stmt->bindValue(':lp_id', $lp_id, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    } catch (Exception $e) {
        error_log("Chyba ověření LP: " . $e->getMessage());
        return false;
    }
}

/**
 * Přepočet čerpání LP na základě položek (volitelné - pro budoucí rozšíření)
 * 
 * @param PDO $db Database connection (PDO)
 * @param int $lp_id ID LP k přepočtu
 * @return array Výsledek přepočtu
 */
function prepocitat_cerpani_lp_z_polozek($db, $lp_id) {
    try {
        // Volání uložené procedure sp_prepocet_lp_z_polozek_v2
        $stmt = $db->prepare("CALL sp_prepocet_lp_z_polozek_v2(:lp_id)");
        $stmt->bindValue(':lp_id', $lp_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Ukončit procedure volání (PHP 5.6 PDO kompatibilita)
        $stmt->closeCursor();
        
        return array(
            'status' => 'ok',
            'data' => $data ? $data : array()
        );
    } catch (Exception $e) {
        return array(
            'status' => 'error',
            'message' => 'Chyba přepočtu: ' . $e->getMessage()
        );
    }
}

/**
 * Helper: Získání seznamu LP pro výběr ve formuláři
 * 
 * @param PDO $db Database connection (PDO)
 * @param array $lp_ids_filter Filtr na konkrétní LP IDs (z objednavka_data.lp_kody)
 * @param int $rok Rok platnosti
 * @return array Seznam LP pro dropdown
 */
function ziskat_lp_pro_vyber($db, $lp_ids_filter = array(), $rok = null) {
    if ($rok === null) {
        $rok = date('Y');
    }
    
    // Pokud není filtr, vrať prázdný seznam
    if (empty($lp_ids_filter)) {
        return array();
    }
    
    try {
        $safe_ids = array_map('intval', $lp_ids_filter);
        $placeholders = implode(',', array_fill(0, count($safe_ids), '?'));
        
        $query = "
            SELECT 
                id,
                cislo_lp,
                nazev_uctu,
                kategorie
            FROM " . TBL_LP_MASTER . "
            WHERE id IN ($placeholders)
            ORDER BY kategorie, cislo_lp
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute($safe_ids);
        
        $lp_list = array();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($rows as $row) {
            $nazev = $row['nazev_uctu'] ? $row['nazev_uctu'] : $row['cislo_lp'];
            
            $lp_list[] = array(
                'id' => intval($row['id']),
                'cislo_lp' => $row['cislo_lp'],
                'nazev' => $nazev,
                'kategorie' => $row['kategorie'],
                'label' => $row['cislo_lp'] . ' - ' . $nazev
            );
        }
        
        return $lp_list;
    } catch (Exception $e) {
        error_log("Chyba načítání LP pro výběr: " . $e->getMessage());
        return array();
    }
}
?>

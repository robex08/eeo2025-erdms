<?php
/**
 * Import Handlers for Orders25
 * PHP 5.6 & MySQL 5.5.43 compatible
 * 
 * Importuje staré objednávky z DEMO tabulek do nových 25a_* tabulek
 */

// Načtení verify_token funkce z handlers.php (pokud ještě není načtena)
if (!function_exists('verify_token')) {
    require_once __DIR__ . '/handlers.php';
}

/**
 * Extrakce LP kódu z poznámky s rozšířenou logikou pro číselný suffix
 * 
 * @param string $poznamka - Poznámka ze staré DB
 * @return string - Normalizovaný LP kód nebo prázdný string
 */
function extractLPKod($poznamka) {
    if (empty($poznamka)) {
        return '';
    }
    
    // ROZŠÍŘENÉ MAPOVÁNÍ LP KÓDŮ s číselným suffixem
    // Podle poskytnutých dat: kategorie + číselný suffix (1-5)
    
    // 1. Přímé mapování známých kategorií s čísly
    $known_lp_codes = array(
        // LPIT kategorie (IT)
        'LPIT1', 'LPIT2', 'LPIT3', 'LPIT4', 'LPIT5',
        // LPIA kategorie (A)
        'LPIA1', 'LPIA2',
        // LPT kategorie (T)
        'LPT1', 'LPT2', 'LPT3',
        // LPP kategorie (P)
        'LPP1', 'LPP2', 'LPP3',
        // LPN kategorie (N)
        'LPN1', 'LPN2', 'LPN3', 'LPN4',
        // LPL kategorie (L)
        'LPL1', 'LPL2', 'LPL3',
        // LPPT kategorie (PT)
        'LPPT1', 'LPPT2', 'LPPT3', 'LPPT4', 'LPPT5',
        // LPR kategorie (R)
        'LPR1', 'LPR2',
        // LPZOS kategorie (ZOS)
        'LPZOS1', 'LPZOS2', 'LPZOS3'
    );
    
    // 2. Vyhledání přímého výskytu známých kódů v poznámce
    foreach ($known_lp_codes as $lp_code) {
        if (stripos($poznamka, $lp_code) !== false) {
            return strtoupper($lp_code);
        }
    }
    
    // 3. Pokročilé rozpoznávání vzorů s flexibilní syntaxí
    // Vzory: LP + kategorie + číslo s různými oddělovači
    
    // Vzor 1: LPPT 02, LP PT 02, LPPT02, LP-PT-02, LP_PT_02
    $pattern1 = '/LP[\s\-_]*([A-Z]{1,4})[\s\-_]*(\d{1,2})/i';
    if (preg_match($pattern1, $poznamka, $matches)) {
        $category = strtoupper($matches[1]);
        $number = intval($matches[2]);
        
        // Validace kategorie podle známých typů
        $valid_categories = array('IT', 'A', 'T', 'P', 'N', 'L', 'PT', 'R', 'ZOS');
        if (in_array($category, $valid_categories)) {
            return 'LP' . $category . $number;
        }
    }
    
    // Vzor 2: Pouze kategorie bez LP prefixu (PT02, IT05, atd.)
    $pattern2 = '/\b([A-Z]{1,4})(\d{1,2})\b/';
    if (preg_match($pattern2, $poznamka, $matches)) {
        $category = strtoupper($matches[1]);
        $number = intval($matches[2]);
        
        // Validace kategorie podle známých typů
        $valid_categories = array('IT', 'A', 'T', 'P', 'N', 'L', 'PT', 'R', 'ZOS');
        if (in_array($category, $valid_categories)) {
            return 'LP' . $category . $number;
        }
    }
    
    // Vzor 3: Starý formát s dvojciferným číslem
    $pattern3 = '/LP[\s\-]*([A-Z]{2,})[\s\-]*(\d{2,})/i';
    if (preg_match($pattern3, $poznamka, $matches)) {
        $category = strtoupper($matches[1]);
        $number = $matches[2];
        
        // Pokus o převod na nový formát
        if ($category === 'PT' && strlen($number) >= 2) {
            $num = intval(ltrim($number, '0')); // Odstraní leading zeros
            if ($num >= 1 && $num <= 5) {
                return 'LPPT' . $num;
            }
        }
        
        return 'LP' . $category . $number;
    }
    
    // 4. Fallback - hledání jakéhokoliv LP kódu
    $pattern_fallback = '/LP[A-Z0-9\s\-_]+/i';
    if (preg_match($pattern_fallback, $poznamka, $matches)) {
        // Vyčištění a normalizace
        $lp_code = preg_replace('/[\s\-_]+/', '', strtoupper($matches[0]));
        
        // Kontrola, zda má rozumnou délku (4-10 znaků)
        if (strlen($lp_code) >= 4 && strlen($lp_code) <= 10) {
            return $lp_code;
        }
    }
    
    return '';
}

/**
 * Kombinace kategorie a číselného suffixu pro vytvoření LP kódu
 * 
 * @param string $kategorie - Kategorie z DB (IT, A, T, P, N, L, PT, R, ZOS)
 * @param string $cislo_lp - Číselný suffix (1-5)
 * @param string $poznamka - Poznámka pro fallback (volitelné)
 * @return string - Kompletní LP kód (např. LPIT1, LPPT3)
 */
function buildLPKodFromCategory($kategorie, $cislo_lp, $poznamka = '') {
    // 1. Přímé kombinování kategorie + číselný suffix
    if (!empty($kategorie) && !empty($cislo_lp)) {
        $kategorie = strtoupper(trim($kategorie));
        $cislo = trim($cislo_lp);
        
        // Mapování kategorií na LP prefixy
        $category_mapping = array(
            'IT' => 'LPIT',
            'A' => 'LPIA', 
            'T' => 'LPT',
            'P' => 'LPP',
            'N' => 'LPN',
            'L' => 'LPL',
            'PT' => 'LPPT',
            'R' => 'LPR',
            'ZOS' => 'LPZOS'
        );
        
        if (isset($category_mapping[$kategorie])) {
            // Extrakce čísla z cislo_lp (může obsahovat prefix)
            if (preg_match('/(\d+)$/', $cislo, $matches)) {
                $number = intval($matches[1]);
                return $category_mapping[$kategorie] . $number;
            }
            
            // Pokud cislo_lp obsahuje již kompletní LP kód, použij ho
            if (strpos($cislo, $category_mapping[$kategorie]) === 0) {
                return strtoupper($cislo);
            }
        }
    }
    
    // 2. Pokus o extrakci z cislo_lp pokud obsahuje kompletní kód
    if (!empty($cislo_lp)) {
        $cislo_upper = strtoupper(trim($cislo_lp));
        
        // Kontrola, zda cislo_lp již obsahuje kompletní LP kód
        if (strpos($cislo_upper, 'LP') === 0) {
            return $cislo_upper;
        }
    }
    
    // 3. Fallback na extrakci z poznámky
    if (!empty($poznamka)) {
        return extractLPKod($poznamka);
    }
    
    return '';
}

/**
 * Pokročilá validace LP kódu podle databáze
 * 
 * @param string $lp_code - LP kód k validaci
 * @param PDO $db - Databázové spojení
 * @return string|null - Validní LP kód nebo null
 */
function validateLPKod($lp_code, $db) {
    if (empty($lp_code)) {
        return null;
    }
    
    try {
        // Kontrola existence v databázi LP
        $stmt = $db->prepare("SELECT cislo_lp FROM lps WHERE cislo_lp = :lp_code AND aktivni = 1 LIMIT 1");
        $stmt->bindParam(':lp_code', $lp_code);
        $stmt->execute();
        
        if ($stmt->fetch()) {
            return $lp_code;
        }
        
        // Pokus o nalezení podobného kódu
        $similar_stmt = $db->prepare("SELECT cislo_lp FROM lps WHERE cislo_lp LIKE :lp_pattern AND aktivni = 1 LIMIT 1");
        $pattern = $lp_code . '%';
        $similar_stmt->bindParam(':lp_pattern', $pattern);
        $similar_stmt->execute();
        
        $similar = $similar_stmt->fetch();
        if ($similar) {
            return $similar['cislo_lp'];
        }
        
        return null;
        
    } catch (PDOException $e) {
        error_log("Chyba při validaci LP kódu: " . $e->getMessage());
        return null;
    }
}

/**
 * Generování mapovací tabulky LP kódů pro import
 * 
 * @param PDO $db - Databázové spojení
 * @return array - Mapovací tabulka [old_lp_format => new_lp_code]
 */
function generateLPMappingTable($db) {
    $mapping = array();
    
    try {
        // Načtení všech aktivních LP kódů z nové databáze
        $stmt = $db->prepare("SELECT cislo_lp, nazev FROM lps WHERE aktivni = 1 ORDER BY cislo_lp");
        $stmt->execute();
        $lp_codes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($lp_codes as $lp) {
            $code = $lp['cislo_lp'];
            
            // Vytvoření všech možných variací pro mapování
            $variations = array();
            
            // Přímé mapování
            $variations[] = $code;
            
            // Bez LP prefixu
            if (strpos($code, 'LP') === 0) {
                $variations[] = substr($code, 2);
            }
            
            // S oddělovači
            if (preg_match('/LP([A-Z]+)(\d+)/', $code, $matches)) {
                $category = $matches[1];
                $number = $matches[2];
                
                $variations[] = 'LP ' . $category . ' ' . str_pad($number, 2, '0', STR_PAD_LEFT);
                $variations[] = 'LP-' . $category . '-' . str_pad($number, 2, '0', STR_PAD_LEFT);
                $variations[] = 'LP_' . $category . '_' . str_pad($number, 2, '0', STR_PAD_LEFT);
                $variations[] = $category . str_pad($number, 2, '0', STR_PAD_LEFT);
                $variations[] = $category . ' ' . str_pad($number, 2, '0', STR_PAD_LEFT);
                $variations[] = $category . $number;
            }
            
            // Přidání všech variací do mapování
            foreach ($variations as $variation) {
                $mapping[strtoupper($variation)] = $code;
            }
        }
        
        return $mapping;
        
    } catch (PDOException $e) {
        error_log("Chyba při generování LP mapování: " . $e->getMessage());
        return array();
    }
}

/**
 * Mapování druh_sml_id ze staré DB na druh_objednavky_kod
 * 
 * @param int $druh_sml_id - ID druhu smlouvy ze staré DB
 * @return string - Kód druhu objednávky
 */
function mapDruhSmlouvyKod($druh_sml_id) {
    $mapping = array(
        1 => 'AUTA',
        2 => 'DAROVACI',
        3 => 'ENERGIE',
        4 => 'FKSP',
        5 => 'KUPNI',
        6 => 'LICENCNI',
        7 => 'LSPP',
        8 => 'MANDATNI',
        9 => 'NAJEMNI',
        10 => 'O_DILO',
        11 => 'ODPAD',
        12 => 'OSTATNI',
        13 => 'PRAXE',
        14 => 'PRONAJEM',
        15 => 'PRESTAVBY',
        16 => 'RADIOSTANICE',
        17 => 'RLP',
        18 => 'SERVISNI',
        19 => 'SLUZBY',
        20 => 'SPOLUPRACE',
        21 => 'STAZ',
        22 => 'VYPOCETNI_TECHNIKA',
        23 => 'ZDR_DOZOR',
        24 => 'VYPUJCKA',
        25 => 'POSKYTNUTI_PROSTOR',
        26 => 'BEZUPLATNY_PREVOD',
        27 => 'PRODEJ',
        29 => 'VZDELAVACI_AKCE'
    );
    
    return isset($mapping[$druh_sml_id]) ? $mapping[$druh_sml_id] : 'OSTATNI';
}

/**
 * Kontrola existence uživatele v nové DB
 * 
 * @param PDO $db - Databázové spojení
 * @param int $uzivatel_id - ID uživatele
 * @return bool - True pokud existuje
 */
function checkUserExists($db, $uzivatel_id) {
    try {
        $stmt = $db->prepare("SELECT id FROM " . TBL_UZIVATELE . " WHERE id = :id LIMIT 1");
        $stmt->bindParam(':id', $uzivatel_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Kontrola, zda objednávka s daným číslem už existuje
 * 
 * @param PDO $db - Databázové spojení
 * @param string $cislo_objednavky - Evidenční číslo
 * @return array|null - ['id' => X, 'stav_objednavky' => Y] nebo null
 */
function checkOrderExists($db, $cislo_objednavky) {
    try {
        $stmt = $db->prepare("SELECT id, stav_objednavky FROM " . TBL_OBJEDNAVKY . " WHERE cislo_objednavky = :cislo LIMIT 1");
        $stmt->bindParam(':cislo', $cislo_objednavky, PDO::PARAM_STR);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result : null;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Načte starou objednávku z DEMO tabulky
 * 
 * @param PDO $db - Databázové spojení
 * @param string $tabulka_obj - Název tabulky se starými objednávkami
 * @param int $old_id - ID staré objednávky
 * @return array|null - Data objednávky nebo null
 */
function loadOldOrder($db, $tabulka_obj, $old_id) {
    try {
        $sql = "SELECT * FROM " . $tabulka_obj . " WHERE id = :id LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id', $old_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result : null;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Načte přílohy staré objednávky
 * 
 * @param PDO $db - Databázové spojení
 * @param string $tabulka_opriloh - Název tabulky s přílohami
 * @param int $old_id - ID staré objednávky
 * @return array - Pole příloh
 */
function loadOldAttachments($db, $tabulka_opriloh, $old_id) {
    try {
        $sql = "SELECT * FROM " . $tabulka_opriloh . " WHERE id_smlouvy = :id_smlouvy";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id_smlouvy', $old_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        return array();
    }
}

/**
 * Vloží importovanou objednávku do 25a_objednavky
 * 
 * @param PDO $db - Databázové spojení
 * @param array $oldOrder - Data ze staré objednávky
 * @param int $uzivatel_id - ID uživatele provádějícího import
 * @return int|null - ID nové objednávky nebo null při chybě
 */
function insertImportedOrder($db, $oldOrder, $uzivatel_id) {
    try {
        // Příprava dat
        $evidencni_c = isset($oldOrder['evidencni_c']) ? $oldOrder['evidencni_c'] : '';
        $predmet = "Importovaná obj. ev.č. " . $evidencni_c;
        $dt_objednavky = isset($oldOrder['datum_u']) ? $oldOrder['datum_u'] . ' 00:00:00' : null;
        $max_cena_s_dph = isset($oldOrder['cena_rok']) ? $oldOrder['cena_rok'] : 0;
        $poznamka = isset($oldOrder['poznamka']) ? $oldOrder['poznamka'] : '';
        
        // ROZŠÍŘENÁ LOGIKA PRO LP KÓDY - kombinace kategorie + číselný suffix
        $kategorie = isset($oldOrder['kategorie']) ? $oldOrder['kategorie'] : '';
        $cislo_lp = isset($oldOrder['cislo_lp']) ? $oldOrder['cislo_lp'] : '';
        
        // Pokus o vytvoření LP kódu z kategorie + číselný suffix
        $financovani = buildLPKodFromCategory($kategorie, $cislo_lp, $poznamka);
        
        // Fallback na původní extrakci z poznámky
        if (empty($financovani)) {
            $financovani = extractLPKod($poznamka);
        }
        
        // Validace LP kódu proti databázi (pokud není prázdný)
        if (!empty($financovani)) {
            $validated_lp = validateLPKod($financovani, $db);
            if ($validated_lp) {
                $financovani = $validated_lp;
            }
        }
        $dt_vytvoreni = isset($oldOrder['dt_pridani']) ? $oldOrder['dt_pridani'] : date('Y-m-d H:i:s');
        $dt_aktualizace = date('Y-m-d H:i:s');
        $dt_odeslani = $dt_vytvoreni;
        $dt_akceptace = $dt_vytvoreni;
        
        // Partner data
        $dodavatel_nazev = isset($oldOrder['partner_nazev']) ? $oldOrder['partner_nazev'] : '';
        $dodavatel_ico = isset($oldOrder['partner_ic']) ? $oldOrder['partner_ic'] : '';
        $dodavatel_adresa = isset($oldOrder['partner_adresa']) ? $oldOrder['partner_adresa'] : '';
        
        // Zveřejnění
        $zverejnit = isset($oldOrder['zverejnit']) ? $oldOrder['zverejnit'] : 'Ne';
        $dt_zverejneni = '1970-01-01 00:00:00';
        $registr_iddt = null;
        
        if ($zverejnit === 'Ano') {
            if (isset($oldOrder['dt_zverejneni']) && $oldOrder['dt_zverejneni'] !== '0000-00-00') {
                $dt_zverejneni = $oldOrder['dt_zverejneni'] . ' 00:00:00';
            }
            $registr_iddt = isset($oldOrder['idds']) ? $oldOrder['idds'] : null;
        }
        
        // Mapování druhu
        $druh_sml_id = isset($oldOrder['druh_sml_id']) ? intval($oldOrder['druh_sml_id']) : 12;
        $druh_objednavky_kod = mapDruhSmlouvyKod($druh_sml_id);
        
        // SQL Insert
        $sql = "INSERT INTO " . TBL_OBJEDNAVKY . " (
            cislo_objednavky, dt_objednavky, predmet, 
            strediska_kod, max_cena_s_dph, financovani,
            druh_objednavky_kod, stav_workflow_kod, stav_objednavky,
            uzivatel_id, uzivatel_akt_id, garant_uzivatel_id, objednatel_id,
            schvalovatel_id, dt_schvaleni, schvaleni_komentar, prikazce_id,
            dodavatel_id, dodavatel_nazev, dodavatel_ico, dodavatel_adresa,
            dodavatel_dic, dodavatel_zastoupeny,
            dodavatel_kontakt_jmeno, dodavatel_kontakt_email, dodavatel_kontakt_telefon,
            dt_predpokladany_termin_dodani, misto_dodani, zaruka,
            dt_odeslani, odeslani_storno_duvod, dodavatel_zpusob_potvrzeni,
            dt_akceptace, dt_zverejneni, registr_iddt,
            poznamka, dt_vytvoreni, dt_aktualizace,
            dt_zamek, zamek_uzivatel_id, aktivni
        ) VALUES (
            :cislo_objednavky, :dt_objednavky, :predmet,
            :strediska_kod, :max_cena_s_dph, :financovani,
            :druh_objednavky_kod, :stav_workflow_kod, :stav_objednavky,
            :uzivatel_id, :uzivatel_akt_id, :garant_uzivatel_id, :objednatel_id,
            :schvalovatel_id, :dt_schvaleni, :schvaleni_komentar, :prikazce_id,
            :dodavatel_id, :dodavatel_nazev, :dodavatel_ico, :dodavatel_adresa,
            :dodavatel_dic, :dodavatel_zastoupeny,
            :dodavatel_kontakt_jmeno, :dodavatel_kontakt_email, :dodavatel_kontakt_telefon,
            :dt_predpokladany_termin_dodani, :misto_dodani, :zaruka,
            :dt_odeslani, :odeslani_storno_duvod, :dodavatel_zpusob_potvrzeni,
            :dt_akceptace, :dt_zverejneni, :registr_iddt,
            :poznamka, :dt_vytvoreni, :dt_aktualizace,
            :dt_zamek, :zamek_uzivatel_id, :aktivni
        )";
        
        $stmt = $db->prepare($sql);
        
        // Bind parameters
        $stmt->bindParam(':cislo_objednavky', $evidencni_c, PDO::PARAM_STR);
        $stmt->bindParam(':dt_objednavky', $dt_objednavky, PDO::PARAM_STR);
        $stmt->bindParam(':predmet', $predmet, PDO::PARAM_STR);
        
        $strediska_kod = '[]';
        $stmt->bindParam(':strediska_kod', $strediska_kod, PDO::PARAM_STR);
        $stmt->bindParam(':max_cena_s_dph', $max_cena_s_dph, PDO::PARAM_STR);
        $stmt->bindParam(':financovani', $financovani, PDO::PARAM_STR);
        
        $stmt->bindParam(':druh_objednavky_kod', $druh_objednavky_kod, PDO::PARAM_STR);
        $stav_workflow = '["SCHVALENA","ODESLANA","POTVRZENA"]';
        $stmt->bindParam(':stav_workflow_kod', $stav_workflow, PDO::PARAM_STR);
        $stav_obj = 'ARCHIVOVANO';
        $stmt->bindParam(':stav_objednavky', $stav_obj, PDO::PARAM_STR);
        
        // Použití původních hodnot ze staré databáze
        $old_user_id = isset($oldOrder['user_id']) ? intval($oldOrder['user_id']) : $uzivatel_id;
        $old_upd_user_id = isset($oldOrder['upd_user_id']) ? intval($oldOrder['upd_user_id']) : $uzivatel_id;
        
        $stmt->bindParam(':uzivatel_id', $old_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':uzivatel_akt_id', $old_upd_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':garant_uzivatel_id', $old_user_id, PDO::PARAM_INT);  // garant_id = user_id
        $stmt->bindParam(':objednatel_id', $old_user_id, PDO::PARAM_INT);       // objednatel_id = user_id
        
        // Systémové hodnoty (skutečné číslo 0, ne NULL)
        $zero_id = 0;
        $stmt->bindParam(':schvalovatel_id', $zero_id, PDO::PARAM_INT);
        $null_val = null;
        $stmt->bindParam(':dt_schvaleni', $null_val, PDO::PARAM_NULL);
        $stmt->bindParam(':schvaleni_komentar', $null_val, PDO::PARAM_NULL);
        $stmt->bindParam(':prikazce_id', $zero_id, PDO::PARAM_INT);
        $stmt->bindParam(':dodavatel_id', $null_val, PDO::PARAM_NULL);
        
        $stmt->bindParam(':dodavatel_nazev', $dodavatel_nazev, PDO::PARAM_STR);
        $stmt->bindParam(':dodavatel_ico', $dodavatel_ico, PDO::PARAM_STR);
        $stmt->bindParam(':dodavatel_adresa', $dodavatel_adresa, PDO::PARAM_STR);
        $stmt->bindParam(':dodavatel_dic', $null_val, PDO::PARAM_NULL);
        $stmt->bindParam(':dodavatel_zastoupeny', $null_val, PDO::PARAM_NULL);
        $stmt->bindParam(':dodavatel_kontakt_jmeno', $null_val, PDO::PARAM_NULL);
        $stmt->bindParam(':dodavatel_kontakt_email', $null_val, PDO::PARAM_NULL);
        $stmt->bindParam(':dodavatel_kontakt_telefon', $null_val, PDO::PARAM_NULL);
        $stmt->bindParam(':dt_predpokladany_termin_dodani', $null_val, PDO::PARAM_NULL);
        $stmt->bindParam(':misto_dodani', $null_val, PDO::PARAM_NULL);
        $stmt->bindParam(':zaruka', $null_val, PDO::PARAM_NULL);
        
        $stmt->bindParam(':dt_odeslani', $dt_odeslani, PDO::PARAM_STR);
        $empty_str = '';
        $stmt->bindParam(':odeslani_storno_duvod', $empty_str, PDO::PARAM_STR);
        $stmt->bindParam(':dodavatel_zpusob_potvrzeni', $empty_str, PDO::PARAM_STR);
        $stmt->bindParam(':dt_akceptace', $dt_akceptace, PDO::PARAM_STR);
        $stmt->bindParam(':dt_zverejneni', $dt_zverejneni, PDO::PARAM_STR);
        $stmt->bindParam(':registr_iddt', $registr_iddt, PDO::PARAM_STR);
        
        $stmt->bindParam(':poznamka', $poznamka, PDO::PARAM_STR);
        $stmt->bindParam(':dt_vytvoreni', $dt_vytvoreni, PDO::PARAM_STR);
        $stmt->bindParam(':dt_aktualizace', $dt_aktualizace, PDO::PARAM_STR);
        
        $dt_zamek = '1970-01-01 00:00:00';
        $stmt->bindParam(':dt_zamek', $dt_zamek, PDO::PARAM_STR);
        $stmt->bindParam(':zamek_uzivatel_id', $null_val, PDO::PARAM_NULL);
        $aktivni = 1;
        $stmt->bindParam(':aktivni', $aktivni, PDO::PARAM_INT);
        
        $stmt->execute();
        
        return $db->lastInsertId();
        
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Aktualizuje existující archivovanou objednávku
 * 
 * @param PDO $db - Databázové spojení
 * @param int $existing_id - ID existující objednávky
 * @param array $oldOrder - Data ze staré objednávky
 * @param int $uzivatel_id - ID uživatele provádějícího import
 * @return bool - True při úspěchu
 */
function updateImportedOrder($db, $existing_id, $oldOrder, $uzivatel_id) {
    try {
        // Příprava dat (stejně jako u INSERT)
        $evidencni_c = isset($oldOrder['evidencni_c']) ? $oldOrder['evidencni_c'] : '';
        $predmet = "Importovaná obj. ev.č. " . $evidencni_c;
        $dt_objednavky = isset($oldOrder['datum_u']) ? $oldOrder['datum_u'] . ' 00:00:00' : null;
        $max_cena_s_dph = isset($oldOrder['cena_rok']) ? $oldOrder['cena_rok'] : 0;
        $poznamka = isset($oldOrder['poznamka']) ? $oldOrder['poznamka'] : '';
        
        // ROZŠÍŘENÁ LOGIKA PRO LP KÓDY - kombinace kategorie + číselný suffix
        $kategorie = isset($oldOrder['kategorie']) ? $oldOrder['kategorie'] : '';
        $cislo_lp = isset($oldOrder['cislo_lp']) ? $oldOrder['cislo_lp'] : '';
        
        // Pokus o vytvoření LP kódu z kategorie + číselný suffix
        $financovani = buildLPKodFromCategory($kategorie, $cislo_lp, $poznamka);
        
        // Fallback na původní extrakci z poznámky
        if (empty($financovani)) {
            $financovani = extractLPKod($poznamka);
        }
        
        // Validace LP kódu proti databázi (pokud není prázdný)
        if (!empty($financovani)) {
            $validated_lp = validateLPKod($financovani, $db);
            if ($validated_lp) {
                $financovani = $validated_lp;
            }
        }
        $dt_vytvoreni = isset($oldOrder['dt_pridani']) ? $oldOrder['dt_pridani'] : date('Y-m-d H:i:s');
        $dt_aktualizace = date('Y-m-d H:i:s');
        
        // Partner data
        $dodavatel_nazev = isset($oldOrder['partner_nazev']) ? $oldOrder['partner_nazev'] : '';
        $dodavatel_ico = isset($oldOrder['partner_ico']) ? $oldOrder['partner_ico'] : '';
        $dodavatel_adresa = isset($oldOrder['partner_adresa']) ? $oldOrder['partner_adresa'] : '';
        
        // Datum zveřejnění
        $dt_zverejneni = isset($oldOrder['datum_zv']) ? $oldOrder['datum_zv'] . ' 00:00:00' : null;
        $registr_iddt = isset($oldOrder['regis_iddt']) ? $oldOrder['regis_iddt'] : '';
        
        // Mapping druhu smlouvy
        $druh_sml_id = isset($oldOrder['druh_sml_id']) ? intval($oldOrder['druh_sml_id']) : 0;
        $druh_objednavky_kod = mapDruhSmlouvyKod($druh_sml_id);
        
        // Střediska - z poznámky extrahujeme LP kód a použijeme jako střediska_kod
        $strediska_kod = $financovani;
        
        $sql = "UPDATE " . TBL_OBJEDNAVKY . " SET
            predmet = :predmet,
            dt_objednavky = :dt_objednavky,
            strediska_kod = :strediska_kod,
            max_cena_s_dph = :max_cena_s_dph,
            financovani = :financovani,
            druh_objednavky_kod = :druh_objednavky_kod,
            stav_workflow_kod = :stav_workflow_kod,
            stav_objednavky = :stav_objednavky,
            uzivatel_id = :uzivatel_id,
            uzivatel_akt_id = :uzivatel_akt_id,
            garant_uzivatel_id = :garant_uzivatel_id,
            objednatel_id = :objednatel_id,
            dodavatel_nazev = :dodavatel_nazev,
            dodavatel_ico = :dodavatel_ico,
            dodavatel_adresa = :dodavatel_adresa,
            dt_akceptace = :dt_akceptace,
            dt_zverejneni = :dt_zverejneni,
            registr_iddt = :registr_iddt,
            poznamka = :poznamka,
            dt_aktualizace = :dt_aktualizace
        WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        
        $stmt->bindParam(':predmet', $predmet, PDO::PARAM_STR);
        $stmt->bindParam(':dt_objednavky', $dt_objednavky, PDO::PARAM_STR);
        $stmt->bindParam(':strediska_kod', $strediska_kod, PDO::PARAM_STR);
        $stmt->bindParam(':max_cena_s_dph', $max_cena_s_dph, PDO::PARAM_STR);
        $stmt->bindParam(':financovani', $financovani, PDO::PARAM_STR);
        $stmt->bindParam(':druh_objednavky_kod', $druh_objednavky_kod, PDO::PARAM_STR);
        
        $stav_workflow = '["SCHVALENA","ODESLANA","POTVRZENA"]';
        $stmt->bindParam(':stav_workflow_kod', $stav_workflow, PDO::PARAM_STR);
        $stav_obj = 'ARCHIVOVANO';
        $stmt->bindParam(':stav_objednavky', $stav_obj, PDO::PARAM_STR);
        
        // Použití původních hodnot ze staré databáze
        $old_user_id = isset($oldOrder['user_id']) ? intval($oldOrder['user_id']) : $uzivatel_id;
        $old_upd_user_id = isset($oldOrder['upd_user_id']) ? intval($oldOrder['upd_user_id']) : $uzivatel_id;
        
        $stmt->bindParam(':uzivatel_id', $old_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':uzivatel_akt_id', $old_upd_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':garant_uzivatel_id', $old_user_id, PDO::PARAM_INT);  // garant_id = user_id
        $stmt->bindParam(':objednatel_id', $old_user_id, PDO::PARAM_INT);       // objednatel_id = user_id
        
        $stmt->bindParam(':dodavatel_nazev', $dodavatel_nazev, PDO::PARAM_STR);
        $stmt->bindParam(':dodavatel_ico', $dodavatel_ico, PDO::PARAM_STR);
        $stmt->bindParam(':dodavatel_adresa', $dodavatel_adresa, PDO::PARAM_STR);
        
        $dt_akceptace = $dt_vytvoreni;
        $stmt->bindParam(':dt_akceptace', $dt_akceptace, PDO::PARAM_STR);
        $stmt->bindParam(':dt_zverejneni', $dt_zverejneni, PDO::PARAM_STR);
        $stmt->bindParam(':registr_iddt', $registr_iddt, PDO::PARAM_STR);
        
        $stmt->bindParam(':poznamka', $poznamka, PDO::PARAM_STR);
        $stmt->bindParam(':dt_aktualizace', $dt_aktualizace, PDO::PARAM_STR);
        $stmt->bindParam(':id', $existing_id, PDO::PARAM_INT);
        
        $stmt->execute();
        
        return true;
        
    } catch (Exception $e) {
        error_log("updateImportedOrder error: " . $e->getMessage());
        return false;
    }
}

/**
 * Smaže všechny položky objednávky
 * 
 * @param PDO $db - Databázové spojení
 * @param int $objednavka_id - ID objednávky
 * @return bool - True při úspěchu
 */
function deleteOrderItems($db, $objednavka_id) {
    try {
        $stmt = $db->prepare("DELETE FROM " . TBL_OBJEDNAVKY_POLOZKY . " WHERE objednavka_id = :objednavka_id");
        $stmt->bindParam(':objednavka_id', $objednavka_id, PDO::PARAM_INT);
        $stmt->execute();
        return true;
    } catch (Exception $e) {
        error_log("deleteOrderItems error: " . $e->getMessage());
        return false;
    }
}

/**
 * Smaže všechny přílohy objednávky
 * 
 * @param PDO $db - Databázové spojení
 * @param int $objednavka_id - ID objednávky
 * @return bool - True při úspěchu
 */
function deleteOrderAttachments($db, $objednavka_id) {
    try {
        $stmt = $db->prepare("DELETE FROM " . TBL_OBJEDNAVKY_PRILOHY . " WHERE objednavka_id = :objednavka_id");
        $stmt->bindParam(':objednavka_id', $objednavka_id, PDO::PARAM_INT);
        $stmt->execute();
        return true;
    } catch (Exception $e) {
        error_log("deleteOrderAttachments error: " . $e->getMessage());
        return false;
    }
}

/**
 * Vloží položku objednávky (ze starého pole 'obsah' a 'cena')
 * 
 * @param PDO $db - Databázové spojení
 * @param int $objednavka_id - ID nové objednávky
 * @param array $oldOrder - Data ze staré objednávky
 * @return bool - True při úspěchu
 */
function insertImportedOrderItem($db, $objednavka_id, $oldOrder) {
    try {
        $popis = isset($oldOrder['obsah']) ? $oldOrder['obsah'] : 'Importovaná položka';
        $cena_bez_dph = isset($oldOrder['cena']) ? floatval($oldOrder['cena']) : 0;
        $cena_s_dph = isset($oldOrder['cena_rok']) ? floatval($oldOrder['cena_rok']) : 0;
        
        // Pokud není cena_rok (cena_s_dph), vypočítáme z cena (cena_bez_dph)
        $sazba_dph = 21;
        if ($cena_s_dph == 0 && $cena_bez_dph > 0) {
            $cena_s_dph = round($cena_bez_dph * 1.21, 2);
        }
        
        $sql = "INSERT INTO " . TBL_OBJEDNAVKY_POLOZKY . " (
            objednavka_id, popis, cena_bez_dph, sazba_dph, cena_s_dph,
            dt_vytvoreni, dt_aktualizace
        ) VALUES (
            :objednavka_id, :popis, :cena_bez_dph, :sazba_dph, :cena_s_dph,
            NOW(), NOW()
        )";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':objednavka_id', $objednavka_id, PDO::PARAM_INT);
        $stmt->bindParam(':popis', $popis, PDO::PARAM_STR);
        $stmt->bindParam(':cena_bez_dph', $cena_bez_dph, PDO::PARAM_STR);
        $stmt->bindParam(':sazba_dph', $sazba_dph, PDO::PARAM_INT);
        $stmt->bindParam(':cena_s_dph', $cena_s_dph, PDO::PARAM_STR);
        
        $stmt->execute();
        return true;
        
    } catch (Exception $e) {
        error_log("insertImportedOrderItem error (objednavka_id=$objednavka_id): " . $e->getMessage());
        return false;
    }
}

/**
 * Vloží přílohy z importované objednávky
 * 
 * @param PDO $db - Databázové spojení
 * @param int $objednavka_id - ID nové objednávky
 * @param array $oldAttachments - Pole příloh ze staré DB
 * @param int $uzivatel_id - ID uživatele
 * @param string $base_url - (volitelné) Základní URL pro stažení příloh ze starého systému
 * @return array - ['count' => počet, 'details' => pole detailů příloh]
 */
function insertImportedAttachments($db, $objednavka_id, $oldAttachments, $uzivatel_id, $base_url = null) {
    $count = 0;
    $details = array();
    
    foreach ($oldAttachments as $att) {
        try {
            $soubor = isset($att['soubor']) ? $att['soubor'] : '';
            $popis = isset($att['popis']) ? $att['popis'] : '';
            $dt_pridani = isset($att['dt_pridani']) ? $att['dt_pridani'] : date('Y-m-d H:i:s');
            
            // Pro importované přílohy: guid = název souboru (místo generovaného GUID)
            $guid = $soubor;
            
            // Cesta k souboru - pokud je zadána base_url, použije se URL, jinak lokální cesta
            if (!empty($base_url)) {
                // Odebereme případné trailing slash z base_url
                $base_url_clean = rtrim($base_url, '/');
                $systemova_cesta = $base_url_clean . '/' . $soubor;
            } else {
                // Standardní lokální cesta
                $systemova_cesta = '/var/www/eeo2025/doc/prilohy/' . $soubor;
            }
            
            // Typ přílohy - pro importované nastavíme jako "IMPORT"
            $typ_prilohy = 'IMPORT';
            
            // Velikost souboru - pro import nastavíme 0 (neznámo)
            $velikost_souboru_b = 0;
            
            $sql = "INSERT INTO " . TBL_OBJEDNAVKY_PRILOHY . " (
                objednavka_id, guid, typ_prilohy, originalni_nazev_souboru, systemova_cesta, 
                velikost_souboru_b, nahrano_uzivatel_id, dt_vytvoreni
            ) VALUES (
                :objednavka_id, :guid, :typ_prilohy, :originalni_nazev_souboru, :systemova_cesta,
                :velikost_souboru_b, :nahrano_uzivatel_id, NOW()
            )";
            
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':objednavka_id', $objednavka_id, PDO::PARAM_INT);
            $stmt->bindParam(':guid', $guid, PDO::PARAM_STR);
            $stmt->bindParam(':typ_prilohy', $typ_prilohy, PDO::PARAM_STR);
            $stmt->bindParam(':originalni_nazev_souboru', $soubor, PDO::PARAM_STR);
            $stmt->bindParam(':systemova_cesta', $systemova_cesta, PDO::PARAM_STR);
            $stmt->bindParam(':velikost_souboru_b', $velikost_souboru_b, PDO::PARAM_INT);
            $stmt->bindParam(':nahrano_uzivatel_id', $uzivatel_id, PDO::PARAM_INT);
            
            $stmt->execute();
            $count++;
            
            // Přidání detailu o úspěšně vložené příloze
            $details[] = array(
                'soubor' => $soubor,
                'guid' => $guid,
                'systemova_cesta' => $systemova_cesta,
                'popis' => $popis,
                'typ_prilohy' => $typ_prilohy,
                'dt_pridani_old' => $dt_pridani,
                'status' => 'OK'
            );
            
        } catch (Exception $e) {
            // Log error ale pokračujeme (přílohy nejsou kritické)
            error_log("insertImportedAttachments error (objednavka_id=$objednavka_id, soubor=$soubor): " . $e->getMessage());
            
            // Přidání detailu o chybě
            $details[] = array(
                'soubor' => $soubor,
                'guid' => null,
                'systemova_cesta' => null,
                'popis' => $popis,
                'status' => 'ERROR',
                'error' => $e->getMessage()
            );
            
            continue;
        }
    }
    
    return array(
        'count' => $count,
        'details' => $details
    );
}

/**
 * Odesílá progress update ve streaming módu (Server-Sent Events)
 * 
 * @param int $current - Aktuální index zpracovávaného záznamu
 * @param int $total - Celkový počet záznamů
 * @param array $result - Výsledek zpracování aktuální objednávky
 * @param int $imported - Počet nově importovaných
 * @param int $updated - Počet aktualizovaných
 * @param int $failed - Počet chybných
 */
function sendProgressUpdate($current, $total, $result, $imported, $updated, $failed) {
    $progress_event = array(
        'type' => 'progress',
        'current' => $current,
        'total' => $total,
        'percentage' => round(($current / $total) * 100, 1),
        'imported' => $imported,
        'updated' => $updated,
        'failed' => $failed,
        'last_result' => array(
            'old_id' => $result['old_id'],
            'new_id' => $result['new_id'],
            'cislo_objednavky' => $result['cislo_objednavky'],
            'status' => $result['status'],
            'operation' => $result['operation'],
            'error' => $result['error'],
            'processing_time' => isset($result['processing_time']) ? $result['processing_time'] : 0,
            'polozky_count' => $result['polozky_count'],
            'prilohy_count' => $result['prilohy_count']
        ),
        'timestamp' => date('Y-m-d H:i:s')
    );
    
    echo "data: " . json_encode($progress_event) . "\n\n";
    flush();
}

/**
 * Hlavní handler pro import starých objednávek
 * 
 * @param PDO $db - Databázové spojení
 * @param array $input - Input data z API
 * @return array - Response
 */
function handle_orders25_import_oldies($db, $input) {
    // ========================================
    // KROK 1: Ověření tokenu (stejně jako všechny ostatní orders25 endpointy)
    // ========================================
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token($token, $db);
    if (!$token_data) {
        http_response_code(401);
        return array('err' => 'Neplatný nebo chybějící token');
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        return array('err' => 'Uživatelské jméno z tokenu neodpovídá zadanému uživatelskému jménu');
    }
    
    // ID ověřeného uživatele z tokenu
    $authenticated_user_id = $token_data['id'];
    
    // ========================================
    // KROK 2: Validace vstupních dat
    // ========================================
    if (!isset($input['old_order_ids']) || !is_array($input['old_order_ids'])) {
        return array(
            'success' => false,
            'error' => 'Parametr old_order_ids musí být pole'
        );
    }
    
    // ZMĚNA: uzivatel_id už nemusí být v inputu - použije se authenticated_user_id z tokenu
    $uzivatel_id = $authenticated_user_id;
    
    // Kontrola zda chce streaming progress (real-time updates)
    $streaming = isset($input['streaming']) && $input['streaming'] === true;
    
    if (!isset($input['tabulka_obj']) || empty($input['tabulka_obj'])) {
        return array(
            'success' => false,
            'error' => 'Parametr tabulka_obj je povinný'
        );
    }
    
    if (!isset($input['tabulka_opriloh']) || empty($input['tabulka_opriloh'])) {
        return array(
            'success' => false,
            'error' => 'Parametr tabulka_opriloh je povinný'
        );
    }
    
    $old_order_ids = $input['old_order_ids'];
    $tabulka_obj = $input['tabulka_obj'];
    $tabulka_opriloh = $input['tabulka_opriloh'];
    
    // VOLITELNÝ: base_url pro přílohy (pokud jsou na jiném serveru)
    $base_url = isset($input['base_url']) ? $input['base_url'] : null;
    
    // Kontrola existence uživatele
    if (!checkUserExists($db, $uzivatel_id)) {
        return array(
            'success' => false,
            'error' => 'Uživatel s ID ' . $uzivatel_id . ' neexistuje'
        );
    }
    
    // ========================================
    // STREAMING MODE: Nastavení headers pro real-time progress
    // ========================================
    if ($streaming) {
        // Vypnutí output buffering pro okamžitý streaming
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('X-Accel-Buffering: no'); // Nginx fix
        
        // Odeslání počáteční informace
        $start_event = array(
            'type' => 'start',
            'total' => count($old_order_ids),
            'timestamp' => date('Y-m-d H:i:s')
        );
        echo "data: " . json_encode($start_event) . "\n\n";
        flush();
    }
    
    // ========================================
    // KROK 3: Import objednávek
    // ========================================
    $results = array();
    $imported_count = 0;
    $failed_count = 0;
    $updated_count = 0;
    $current_index = 0;
    $total_count = count($old_order_ids);
    
    foreach ($old_order_ids as $old_id) {
        $current_index++;
        $start_time = microtime(true);
        $old_id = intval($old_id);
        $result = array(
            'old_id' => $old_id,
            'new_id' => null,
            'cislo_objednavky' => null,
            'polozky_count' => 0,
            'prilohy_count' => 0,
            'prilohy_details' => array(),
            'status' => 'ERROR',
            'operation' => null,  // 'INSERT' nebo 'UPDATE'
            'error' => null,
            'processing_time' => 0
        );
        
        try {
            // Načtení staré objednávky
            $oldOrder = loadOldOrder($db, $tabulka_obj, $old_id);
            
            if (!$oldOrder) {
                $result['error'] = 'Objednávka s ID ' . $old_id . ' nebyla nalezena';
                $failed_count++;
                $results[] = $result;
                
                // STREAMING: Odeslání progress update
                if ($streaming) {
                    sendProgressUpdate($current_index, $total_count, $result, $imported_count, $updated_count, $failed_count);
                }
                continue;
            }
            
            $evidencni_c = isset($oldOrder['evidencni_c']) ? $oldOrder['evidencni_c'] : '';
            $result['cislo_objednavky'] = $evidencni_c;
            
            // Kontrola existence objednávky
            $existingOrder = checkOrderExists($db, $evidencni_c);
            
            // BEGIN TRANSACTION
            $db->beginTransaction();
            
            $new_order_id = null;
            
            if ($existingOrder && $existingOrder['stav_objednavky'] === 'ARCHIVOVANO') {
                // ========================================
                // VARIANTA UPDATE - Objednávka existuje a je archivovaná
                // ========================================
                $new_order_id = intval($existingOrder['id']);
                $result['new_id'] = $new_order_id;
                $result['operation'] = 'UPDATE';
                
                // 1. Aktualizace objednávky
                $updated = updateImportedOrder($db, $new_order_id, $oldOrder, $uzivatel_id);
                if (!$updated) {
                    $db->rollBack();
                    $result['error'] = 'Chyba při aktualizaci objednávky';
                    $failed_count++;
                    $results[] = $result;
                    
                    // STREAMING: Odeslání progress update
                    if ($streaming) {
                        sendProgressUpdate($current_index, $total_count, $result, $imported_count, $updated_count, $failed_count);
                    }
                    continue;
                }
                
                // 2. Smazání starých položek
                deleteOrderItems($db, $new_order_id);
                
                // 3. Smazání starých příloh
                deleteOrderAttachments($db, $new_order_id);
                
            } elseif ($existingOrder) {
                // Objednávka existuje, ale NENÍ archivovaná - přeskočíme
                $db->rollBack();
                $result['error'] = 'Objednávka s číslem ' . $evidencni_c . ' již existuje a není archivovaná (stav: ' . $existingOrder['stav_objednavky'] . ')';
                $failed_count++;
                $results[] = $result;
                
                // STREAMING: Odeslání progress update
                if ($streaming) {
                    sendProgressUpdate($current_index, $total_count, $result, $imported_count, $updated_count, $failed_count);
                }
                continue;
                
            } else {
                // ========================================
                // VARIANTA INSERT - Objednávka neexistuje
                // ========================================
                $result['operation'] = 'INSERT';
                
                // Vložení objednávky
                $new_order_id = insertImportedOrder($db, $oldOrder, $uzivatel_id);
                
                if (!$new_order_id) {
                    $db->rollBack();
                    $result['error'] = 'Chyba při vkládání objednávky';
                    $failed_count++;
                    $results[] = $result;
                    
                    // STREAMING: Odeslání progress update
                    if ($streaming) {
                        sendProgressUpdate($current_index, $total_count, $result, $imported_count, $updated_count, $failed_count);
                    }
                    continue;
                }
                
                $result['new_id'] = $new_order_id;
            }
            
            // ========================================
            // Společné pro INSERT i UPDATE: Vložení položek a příloh
            // ========================================
            
            // Vložení položky
            $item_inserted = insertImportedOrderItem($db, $new_order_id, $oldOrder);
            if (!$item_inserted) {
                $db->rollBack();
                $result['error'] = 'Chyba při vkládání položky objednávky';
                $failed_count++;
                $results[] = $result;
                
                // STREAMING: Odeslání progress update
                if ($streaming) {
                    sendProgressUpdate($current_index, $total_count, $result, $imported_count, $updated_count, $failed_count);
                }
                continue;
            }
            $result['polozky_count'] = 1;
            
            // Vložení příloh
            $oldAttachments = loadOldAttachments($db, $tabulka_opriloh, $old_id);
            $prilohy_result = insertImportedAttachments($db, $new_order_id, $oldAttachments, $uzivatel_id, $base_url);
            $result['prilohy_count'] = $prilohy_result['count'];
            $result['prilohy_details'] = $prilohy_result['details'];
            
            // COMMIT
            $db->commit();
            
            $result['status'] = 'OK';
            $result['processing_time'] = round((microtime(true) - $start_time) * 1000, 2); // ms
            
            if ($result['operation'] === 'UPDATE') {
                $updated_count++;
            } else {
                $imported_count++;
            }
            
        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            $result['error'] = 'Výjimka: ' . $e->getMessage();
            $result['error_trace'] = $e->getTraceAsString();
            $failed_count++;
        }
        
        $result['processing_time'] = round((microtime(true) - $start_time) * 1000, 2); // ms
        $results[] = $result;
        
        // STREAMING: Odeslání progress update po každé objednávce
        if ($streaming) {
            sendProgressUpdate($current_index, $total_count, $result, $imported_count, $updated_count, $failed_count);
        }
    }
    
    // ========================================
    // KROK 4: Vrácení odpovědi
    // ========================================
    
    // STREAMING: Odeslání finální summary
    if ($streaming) {
        $summary_event = array(
            'type' => 'complete',
            'imported_count' => $imported_count,
            'updated_count' => $updated_count,
            'failed_count' => $failed_count,
            'total_count' => $total_count,
            'timestamp' => date('Y-m-d H:i:s')
        );
        echo "data: " . json_encode($summary_event) . "\n\n";
        flush();
        
        // V streaming módu nevrací JSON, jen ukončí stream
        exit(0);
    }
    
    // NORMÁLNÍ MÓD: Vrácení celé odpovědi jako JSON
    return array(
        'success' => true,
        'imported_count' => $imported_count,
        'updated_count' => $updated_count,
        'failed_count' => $failed_count,
        'total_count' => $total_count,
        'uzivatel_id' => $uzivatel_id,
        'username' => $request_username,
        'results' => $results
    );
}

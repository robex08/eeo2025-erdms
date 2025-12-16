<?php
/**
 * API handlers pro přepočet a správu čerpání limitovaných příslibů - VERZE 3.0
 * 
 * ARCHITEKTURA: DVĚ TABULKY
 * 1. 25_limitovane_prisliby - master data (záznamy LP, BEZE ZMĚN)
 * 2. 25_limitovane_prisliby_cerpani - agregovaná data (jeden řádek = jeden kód)
 * 
 * Kompatibilita: PHP 5.6+, MySQL 5.5.43
 * Datum: 2025-11-20 (update: 2025-11-21)
 * 
 * LOGIKA ČERPÁNÍ:
 * - Jeden kód LP (např. LPIT1) může mít více záznamů (původní + navýšení)
 * - Čerpání se agreguje ze všech objednávek a pokladny podle datumů platnosti
 * - Ukladá se do agregační tabulky 25_limitovane_prisliby_cerpani
 */

/**
 * Přepočítá agregované čerpání pro konkrétní KÓD LP (např. 'LPIT1')
 * 
 * KROK 1: Získat metadata o kódu LP (suma limitů, počet záznamů, rozsah platnosti)
 * KROK 2: Spočítat celkové čerpání z objednávek (status: schvaleno/dokonceno/realizovano)
 * KROK 3: Spočítat celkové čerpání z pokladny (status: uzavrena)
 * KROK 4: Upsert do tabulky 25_limitovane_prisliby_cerpani
 * 
 * @param mysqli $conn Databázové spojení
 * @param string $cislo_lp Kód LP (např. 'LPIT1')
 * @return bool Úspěch operace
 */
function prepocetCerpaniPodleCislaLP($conn, $cislo_lp) {
    $cislo_lp_safe = mysqli_real_escape_string($conn, $cislo_lp);
    
    // KROK 1: Získat metadata o kódu LP (agregace z master tabulky)
    $sql_meta = "
        SELECT 
            lp.cislo_lp,
            lp.kategorie,
            lp.usek_id,
            lp.user_id,
            YEAR(MIN(lp.platne_od)) as rok,
            SUM(lp.vyse_financniho_kryti) as celkovy_limit,
            COUNT(*) as pocet_zaznamu,
            (COUNT(*) > 1) as ma_navyseni,
            MIN(lp.platne_od) as nejstarsi_platnost,
            MAX(lp.platne_do) as nejnovejsi_platnost
        FROM 25_limitovane_prisliby lp
        WHERE lp.cislo_lp = '$cislo_lp_safe'
        GROUP BY lp.cislo_lp, lp.kategorie, lp.usek_id, lp.user_id
        LIMIT 1
    ";
    
    $result_meta = mysqli_query($conn, $sql_meta);
    
    if (!$result_meta || mysqli_num_rows($result_meta) === 0) {
        error_log("prepocetCerpaniPodleCislaLP: LP '$cislo_lp' neexistuje v master tabulce");
        return false;
    }
    
    $meta = mysqli_fetch_assoc($result_meta);
    
    // KROK 2: Spočítat celkové čerpání z objednávek
    // Filtruje podle datumu vytvoření objednávky BETWEEN nejstarší a nejnovější platnost
    $sql_cerpani_obj = "
        SELECT COALESCE(SUM(pol.celkova_cena), 0) as cerpano_obj
        FROM " . TABLE_OBJEDNAVKY . " obj
        JOIN " . TABLE_OBJEDNAVKY_POLOZKY . " pol ON obj.id = pol.objednavka_id
        WHERE pol.limitovana_prisliba = '$cislo_lp_safe'
        AND obj.status IN ('schvaleno', 'dokonceno', 'realizovano')
        AND DATE(obj.datum_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
    ";
    
    $result_obj = mysqli_query($conn, $sql_cerpani_obj);
    
    if (!$result_obj) {
        error_log("prepocetCerpaniPodleCislaLP: Chyba při výpočtu čerpání z objednávek: " . mysqli_error($conn));
        return false;
    }
    
    $row_obj = mysqli_fetch_assoc($result_obj);
    $cerpano_obj = (float)$row_obj['cerpano_obj'];
    
    // KROK 3: Spočítat celkové čerpání z pokladny
    // Filtruje podle datumu pokladny BETWEEN nejstarší a nejnovější platnost
    $sql_cerpani_pokl = "
        SELECT COALESCE(SUM(pol.castka), 0) as cerpano_pokl
        FROM 25_pokladna p
        JOIN 25_pokladna_polozky pol ON p.id = pol.pokladna_id
        WHERE pol.limitovana_prisliba = '$cislo_lp_safe'
        AND p.status = 'uzavrena'
        AND DATE(p.datum) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
    ";
    
    $result_pokl = mysqli_query($conn, $sql_cerpani_pokl);
    
    if (!$result_pokl) {
        error_log("prepocetCerpaniPodleCislaLP: Chyba při výpočtu čerpání z pokladny: " . mysqli_error($conn));
        return false;
    }
    
    $row_pokl = mysqli_fetch_assoc($result_pokl);
    $cerpano_pokl = (float)$row_pokl['cerpano_pokl'];
    
    // Agregované výpočty
    $celkove_cerpano = $cerpano_obj + $cerpano_pokl;
    $celkove_zbyva = $meta['celkovy_limit'] - $celkove_cerpano;
    $celkove_procento = $meta['celkovy_limit'] > 0 
        ? round(($celkove_cerpano / $meta['celkovy_limit']) * 100, 2) 
        : 0;
    
    // KROK 4: Upsert do agregační tabulky 25_limitovane_prisliby_cerpani
    // MySQL 5.5 podporuje INSERT ... ON DUPLICATE KEY UPDATE
    $sql_upsert = "
        INSERT INTO 25_limitovane_prisliby_cerpani 
        (cislo_lp, kategorie, usek_id, user_id, rok, 
         celkovy_limit, celkove_cerpano, celkove_zbyva, celkove_procento, 
         pocet_zaznamu, ma_navyseni, posledni_prepocet)
        VALUES (
            '$cislo_lp_safe',
            '{$meta['kategorie']}',
            {$meta['usek_id']},
            {$meta['user_id']},
            {$meta['rok']},
            {$meta['celkovy_limit']},
            $celkove_cerpano,
            $celkove_zbyva,
            $celkove_procento,
            {$meta['pocet_zaznamu']},
            {$meta['ma_navyseni']},
            NOW()
        )
        ON DUPLICATE KEY UPDATE
            celkovy_limit = {$meta['celkovy_limit']},
            celkove_cerpano = $celkove_cerpano,
            celkove_zbyva = $celkove_zbyva,
            celkove_procento = $celkove_procento,
            pocet_zaznamu = {$meta['pocet_zaznamu']},
            ma_navyseni = {$meta['ma_navyseni']},
            posledni_prepocet = NOW()
    ";
    
    $result = mysqli_query($conn, $sql_upsert);
    
    if (!$result) {
        error_log("prepocetCerpaniPodleCislaLP: Chyba při upsert do agregační tabulky: " . mysqli_error($conn));
        return false;
    }
    
    return true;
}

/**
 * Přepočítá všechna LP pro daný rok
 * Získá všechny unikátní kódy LP a přepočítá každý pomocí prepocetCerpaniPodleCislaLP()
 * 
 * @param mysqli $conn Databázové spojení
 * @param int $rok Rok pro přepočet (výchozí: aktuální rok)
 * @return array array('success' => bool, 'updated' => int, 'failed' => int, 'message' => string)
 */
function prepocetVsechLP($conn, $rok = null) {
    if ($rok === null) {
        $rok = date('Y');
    }
    $rok = (int)$rok;
    
    // Získat všechny unikátní kódy LP pro daný rok z master tabulky
    $sql_kody = "
        SELECT DISTINCT cislo_lp
        FROM 25_limitovane_prisliby
        WHERE YEAR(platne_od) = $rok
        ORDER BY cislo_lp
    ";
    
    $result_kody = mysqli_query($conn, $sql_kody);
    
    if (!$result_kody) {
        return array(
            'success' => false,
            'updated' => 0,
            'failed' => 0,
            'message' => 'Chyba při získávání kódů LP: ' . mysqli_error($conn)
        );
    }
    
    $updated = 0;
    $failed = 0;
    $kody_count = mysqli_num_rows($result_kody);
    
    // Přepočítat každý kód LP
    while ($row = mysqli_fetch_assoc($result_kody)) {
        if (prepocetCerpaniPodleCislaLP($conn, $row['cislo_lp'])) {
            $updated++;
        } else {
            $failed++;
        }
    }
    
    if ($failed > 0) {
        return array(
            'success' => false,
            'updated' => $updated,
            'failed' => $failed,
            'message' => "Přepočítáno $updated z $kody_count kódů LP, $failed selhalo pro rok $rok"
        );
    }
    
    return array(
        'success' => true,
        'updated' => $updated,
        'failed' => 0,
        'message' => "Přepočítáno $updated kódů LP pro rok $rok"
    );
}

/**
 * INICIALIZACE - Přepočítá všechna LP a nastaví počáteční stav
 * Tato funkce by měla být spuštěna jednorázově po implementaci nebo při změnách
 * 
 * @param mysqli $conn Databázové spojení
 * @param int $rok Rok pro inicializaci (výchozí: 2025)
 * @return array Detailní výsledek inicializace
 */
function inicializaceCerpaniLP($conn, $rok = 2025) {
    $rok = (int)$rok;
    $log = array();
    
    // 1. Vymazat staré záznamy z agregační tabulky pro daný rok
    $sql_delete = "
        DELETE FROM 25_limitovane_prisliby_cerpani 
        WHERE rok = $rok
    ";
    
    if (mysqli_query($conn, $sql_delete)) {
        $deleted_count = mysqli_affected_rows($conn);
        $log[] = "Vymazáno $deleted_count starých záznamů z agregační tabulky";
    } else {
        return array(
            'success' => false,
            'message' => 'Chyba při mazání starých záznamů: ' . mysqli_error($conn),
            'log' => $log
        );
    }
    
    // 2. Statistika z objednávek (jen pro log)
    $sql_obj = "
        SELECT 
            COUNT(DISTINCT pol.limitovana_prisliba) as pocet_lp,
            COALESCE(SUM(pol.celkova_cena), 0) as celkem_obj
        FROM " . TABLE_OBJEDNAVKY . " obj
        JOIN " . TABLE_OBJEDNAVKY_POLOZKY . " pol ON obj.id = pol.objednavka_id
        WHERE obj.status IN ('schvaleno', 'dokonceno', 'realizovano')
        AND YEAR(obj.datum_vytvoreni) = $rok
        AND pol.limitovana_prisliba IS NOT NULL
        AND pol.limitovana_prisliba != ''
    ";
    
    $result_obj = mysqli_query($conn, $sql_obj);
    
    if ($result_obj) {
        $row = mysqli_fetch_assoc($result_obj);
        $log[] = "Objednávky: Nalezeno {$row['pocet_lp']} různých kódů LP, celkem " . number_format($row['celkem_obj'], 2, ',', ' ') . " Kč";
    }
    
    // 3. Statistika z pokladny (jen pro log)
    $sql_pokl = "
        SELECT 
            COUNT(DISTINCT pol.limitovana_prisliba) as pocet_lp,
            COALESCE(SUM(pol.castka), 0) as celkem_pokl
        FROM 25_pokladna p
        JOIN 25_pokladna_polozky pol ON p.id = pol.pokladna_id
        WHERE p.status = 'uzavrena'
        AND YEAR(p.datum) = $rok
        AND pol.limitovana_prisliba IS NOT NULL
        AND pol.limitovana_prisliba != ''
    ";
    
    $result_pokl = mysqli_query($conn, $sql_pokl);
    
    if ($result_pokl) {
        $row = mysqli_fetch_assoc($result_pokl);
        $log[] = "Pokladna: Nalezeno {$row['pocet_lp']} různých kódů LP, celkem " . number_format($row['celkem_pokl'], 2, ',', ' ') . " Kč";
    }
    
    // 4. Provést kompletní přepočet všech kódů LP
    $result = prepocetVsechLP($conn, $rok);
    $log[] = $result['message'];
    
    if (!$result['success']) {
        return array(
            'success' => false,
            'message' => 'Chyba při přepočtu LP',
            'log' => $log
        );
    }
    
    // 5. Získat statistiku z agregační tabulky
    $sql_stats = "
        SELECT 
            COUNT(*) as celkem_kodu,
            COALESCE(SUM(celkovy_limit), 0) as celkovy_limit,
            COALESCE(SUM(celkove_cerpano), 0) as celkove_cerpano,
            COALESCE(SUM(celkove_zbyva), 0) as celkem_zbyva,
            COALESCE(AVG(celkove_procento), 0) as prumerne_procento,
            COALESCE(SUM(pocet_zaznamu), 0) as celkem_zaznamu,
            COALESCE(SUM(ma_navyseni), 0) as pocet_s_navysenim,
            COUNT(CASE WHEN celkove_zbyva < 0 THEN 1 END) as prekroceno
        FROM 25_limitovane_prisliby_cerpani
        WHERE rok = $rok
    ";
    
    $result_stats = mysqli_query($conn, $sql_stats);
    $stats = mysqli_fetch_assoc($result_stats);
    
    return array(
        'success' => true,
        'rok' => $rok,
        'statistika' => $stats,
        'log' => $log,
        'message' => 'Inicializace čerpání LP úspěšně dokončena'
    );
}

/**
 * Získá agregovaný stav konkrétního kódu LP z tabulky 25_limitovane_prisliby_cerpani
 * 
 * @param mysqli $conn Databázové spojení
 * @param string $cislo_lp Kód LP (např. 'LPIT1')
 * @param int $rok Rok (výchozí: aktuální)
 * @return array|null Agregovaný stav nebo null
 */
function getStavLP($conn, $cislo_lp, $rok = null) {
    $cislo_lp_safe = mysqli_real_escape_string($conn, $cislo_lp);
    
    if ($rok === null) {
        $rok = date('Y');
    }
    $rok = (int)$rok;
    
    // Agregovaný stav z tabulky čerpání
    $sql = "
        SELECT 
            c.id,
            c.cislo_lp,
            c.kategorie,
            c.usek_id,
            c.user_id,
            c.rok,
            c.celkovy_limit,
            c.celkove_cerpano,
            c.celkove_zbyva,
            c.celkove_procento,
            c.pocet_zaznamu,
            c.ma_navyseni,
            c.posledni_prepocet,
            u.prijmeni,
            u.jmeno,
            us.nazev as usek_nazev
        FROM 25_limitovane_prisliby_cerpani c
        LEFT JOIN 25_uzivatele u ON c.user_id = u.id
        LEFT JOIN 25_useky us ON c.usek_id = us.id
        WHERE c.cislo_lp = '$cislo_lp_safe'
        AND c.rok = $rok
        LIMIT 1
    ";
    
    $result = mysqli_query($conn, $sql);
    
    if (!$result || mysqli_num_rows($result) === 0) {
        return null;
    }
    
    $row = mysqli_fetch_assoc($result);
    
    // Formátování výstupu (PHP 5.6 kompatibilní)
    return array(
        'id' => (int)$row['id'],
        'cislo_lp' => $row['cislo_lp'],
        'kategorie' => $row['kategorie'],
        'celkovy_limit' => (float)$row['celkovy_limit'],
        'celkove_cerpano' => (float)$row['celkove_cerpano'],
        'celkove_zbyva' => (float)$row['celkove_zbyva'],
        'celkove_procento' => (float)$row['celkove_procento'],
        'je_prekroceno' => (float)$row['celkove_zbyva'] < 0,
        'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
        'ma_navyseni' => (bool)$row['ma_navyseni'],
        'rok' => (int)$row['rok'],
        'posledni_prepocet' => $row['posledni_prepocet'],
        'spravce' => array(
            'prijmeni' => $row['prijmeni'],
            'jmeno' => $row['jmeno']
        ),
        'usek_nazev' => $row['usek_nazev']
    );
}

/**
 * Získá seznam všech LP pro uživatele (agregované kódy)
 * 
 * @param mysqli $conn Databázové spojení
 * @param int $user_id ID uživatele
 * @param int $rok Rok (výchozí: aktuální)
 * @return array Seznam LP
 */
function getStavLPProUzivatele($conn, $user_id, $rok = null) {
    $user_id = (int)$user_id;
    
    if ($rok === null) {
        $rok = date('Y');
    }
    $rok = (int)$rok;
    
    $sql = "
        SELECT 
            c.id,
            c.cislo_lp,
            c.kategorie,
            c.celkovy_limit,
            c.celkove_cerpano,
            c.celkove_zbyva,
            c.celkove_procento,
            c.pocet_zaznamu,
            c.ma_navyseni,
            us.nazev as usek_nazev
        FROM 25_limitovane_prisliby_cerpani c
        LEFT JOIN 25_useky us ON c.usek_id = us.id
        WHERE c.user_id = $user_id
        AND c.rok = $rok
        ORDER BY c.kategorie, c.cislo_lp
    ";
    
    $result = mysqli_query($conn, $sql);
    $lp_list = array();
    
    while ($row = mysqli_fetch_assoc($result)) {
        $lp_list[] = array(
            'id' => (int)$row['id'],
            'cislo_lp' => $row['cislo_lp'],
            'kategorie' => $row['kategorie'],
            'celkovy_limit' => (float)$row['celkovy_limit'],
            'celkove_cerpano' => (float)$row['celkove_cerpano'],
            'celkove_zbyva' => (float)$row['celkove_zbyva'],
            'celkove_procento' => (float)$row['celkove_procento'],
            'je_prekroceno' => (float)$row['celkove_zbyva'] < 0,
            'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
            'ma_navyseni' => (bool)$row['ma_navyseni'],
            'usek_nazev' => $row['usek_nazev']
        );
    }
    
    return $lp_list;
}

/**
 * Získá seznam všech LP pro úsek (agregované kódy)
 * 
 * @param mysqli $conn Databázové spojení
 * @param int $usek_id ID úseku
 * @param int $rok Rok (výchozí: aktuální)
 * @return array Seznam LP
 */
function getStavLPProUsek($conn, $usek_id, $rok = null) {
    $usek_id = (int)$usek_id;
    
    if ($rok === null) {
        $rok = date('Y');
    }
    $rok = (int)$rok;
    
    $sql = "
        SELECT 
            c.id,
            c.cislo_lp,
            c.kategorie,
            c.celkovy_limit,
            c.celkove_cerpano,
            c.celkove_zbyva,
            c.celkove_procento,
            c.pocet_zaznamu,
            c.ma_navyseni,
            u.prijmeni,
            u.jmeno
        FROM 25_limitovane_prisliby_cerpani c
        LEFT JOIN 25_uzivatele u ON c.user_id = u.id
        WHERE c.usek_id = $usek_id
        AND c.rok = $rok
        ORDER BY c.kategorie, c.cislo_lp
    ";
    
    $result = mysqli_query($conn, $sql);
    $lp_list = array();
    
    while ($row = mysqli_fetch_assoc($result)) {
        $lp_list[] = array(
            'id' => (int)$row['id'],
            'cislo_lp' => $row['cislo_lp'],
            'kategorie' => $row['kategorie'],
            'celkovy_limit' => (float)$row['celkovy_limit'],
            'celkove_cerpano' => (float)$row['celkove_cerpano'],
            'celkove_zbyva' => (float)$row['celkove_zbyva'],
            'celkove_procento' => (float)$row['celkove_procento'],
            'je_prekroceno' => (float)$row['celkove_zbyva'] < 0,
            'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
            'ma_navyseni' => (bool)$row['ma_navyseni'],
            'spravce' => array(
                'prijmeni' => $row['prijmeni'],
                'jmeno' => $row['jmeno']
            )
        );
    }
    
    return $lp_list;
}

/**
 * Handler pro API endpoint - přepočet LP
 * 
 * @param mysqli $conn Databázové spojení
 * @param array $input Vstupní data z requestu
 * @param array $user_data Data přihlášeného uživatele
 * @return array Response
 */
function handleLimitovanePrislibyCerpaniPrepocet($conn, $input, $user_data) {
    // POST /api/limitovane-prisliby/prepocet
    // Body: { "cislo_lp": "LPIT1" } nebo { "vsechna": true, "rok": 2025 }
    
    if (isset($input['cislo_lp'])) {
        $success = prepocetCerpaniPodleCislaLP($conn, $input['cislo_lp']);
        return array(
            'success' => $success,
            'message' => $success ? 'Přepočet dokončen' : 'Chyba při přepočtu nebo LP neexistuje'
        );
    } 
    elseif (isset($input['vsechna']) && $input['vsechna']) {
        $rok = isset($input['rok']) ? (int)$input['rok'] : null;
        $result = prepocetVsechLP($conn, $rok);
        return $result;
    } 
    else {
        return array(
            'error' => 'Vyžadováno cislo_lp nebo vsechna=true',
            'success' => false
        );
    }
}

/**
 * Handler pro API endpoint - inicializace LP
 * 
 * @param mysqli $conn Databázové spojení
 * @param array $input Vstupní data z requestu
 * @param array $user_data Data přihlášeného uživatele
 * @return array Response
 */
function handleLimitovanePrislibyCerpaniInicializace($conn, $input, $user_data) {
    // POST /api/limitovane-prisliby/inicializace
    // Body: { "rok": 2025 }
    
    // Pouze admin může inicializovat
    if (!isset($user_data['role']) || $user_data['role'] !== 'admin') {
        return array(
            'error' => 'Nedostatečná oprávnění - vyžadována role admin',
            'success' => false
        );
    }
    
    $rok = isset($input['rok']) ? (int)$input['rok'] : 2025;
    
    $result = inicializaceCerpaniLP($conn, $rok);
    return $result;
}

/**
 * Handler pro API endpoint - získání stavu LP
 * 
 * @param mysqli $conn Databázové spojení
 * @param array $params GET parametry
 * @param array $user_data Data přihlášeného uživatele
 * @return array Response
 */
function handleLimitovanePrislibyCerpaniStav($conn, $params, $user_data) {
    // GET /api/limitovane-prisliby/stav?cislo_lp=LPIT1
    // GET /api/limitovane-prisliby/stav?user_id=123&rok=2025
    // GET /api/limitovane-prisliby/stav?usek_id=4&rok=2025
    
    $rok = isset($params['rok']) ? (int)$params['rok'] : null;
    
    if (isset($params['cislo_lp'])) {
        $cislo_lp = $params['cislo_lp'];
        $stav = getStavLP($conn, $cislo_lp, $rok);
        
        if ($stav === null) {
            return array(
                'error' => 'LP nenalezeno nebo nebylo přepočítáno',
                'success' => false
            );
        } else {
            return $stav;
        }
    }
    
    if (isset($params['user_id'])) {
        $user_id = (int)$params['user_id'];
        $list = getStavLPProUzivatele($conn, $user_id, $rok);
        return array(
            'data' => $list, 
            'count' => count($list),
            'success' => true
        );
    }
    
    if (isset($params['usek_id'])) {
        $usek_id = (int)$params['usek_id'];
        $list = getStavLPProUsek($conn, $usek_id, $rok);
        return array(
            'data' => $list, 
            'count' => count($list),
            'success' => true
        );
    }
    
    return array(
        'error' => 'Vyžadován parametr cislo_lp, user_id nebo usek_id',
        'success' => false
    );
}
?>

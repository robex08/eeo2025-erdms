<?php
/**
 * API handlers pro přepočet a správu čerpání limitovaných příslibů - VERZE 3.0 + TŘI TYPY
 * 
 * ARCHITEKTURA: DVĚ TABULKY + TŘI TYPY ČERPÁNÍ
 * 1. 25_limitovane_prisliby - master data (záznamy LP, BEZE ZMĚN)
 * 2. 25_limitovane_prisliby_cerpani - agregovaná data s třemi typy čerpání
 * 
 * TŘI TYPY ČERPÁNÍ (objednávky):
 * 1. REZERVACE (rezervovano) - pesimistický odhad podle max_cena_s_dph
 * 2. PŘEDPOKLAD (predpokladane_cerpani) - reálný odhad podle součtu položek
 * 3. SKUTEČNOST (skutecne_cerpano) - finální čerpání podle fakturovaných částek
 * 
 * POKLADNA: Vždy jen skutečné čerpání (finální částky)
 * 
 * Kompatibilita: PHP 5.6+, MySQL 5.5.43
 * Datum: 2025-11-21
 */

/**
 * Přepočítá agregované čerpání pro konkrétní LP podle ID s TŘEMI TYPY ČERPÁNÍ
 * 
 * @param mysqli $conn Databázové spojení
 * @param int $lp_id ID LP z tabulky 25_limitovane_prisliby
 * @return bool Úspěch operace
 */
function prepocetCerpaniPodleIdLP($conn, $lp_id) {
    $lp_id = (int)$lp_id;
    
    // KROK 1: Získat metadata o LP (agregace z master tabulky podle ID)
    $sql_meta = "
        SELECT 
            lp.id as lp_id,
            lp.cislo_lp,
            lp.kategorie,
            lp.usek_id,
            lp.user_id,
            YEAR(MIN(lp.platne_od)) as rok,
            SUM(lp.vyse_financniho_kryti) as celkovy_limit,
            MIN(lp.cislo_uctu) as cislo_uctu,
            MIN(lp.nazev_uctu) as nazev_uctu,
            COUNT(*) as pocet_zaznamu,
            (COUNT(*) > 1) as ma_navyseni,
            MIN(lp.platne_od) as nejstarsi_platnost,
            MAX(lp.platne_do) as nejnovejsi_platnost
        FROM 25_limitovane_prisliby lp
        WHERE lp.id = $lp_id
        GROUP BY lp.id, lp.cislo_lp, lp.kategorie, lp.usek_id, lp.user_id
        LIMIT 1
    ";
    
    $result_meta = mysqli_query($conn, $sql_meta);
    
    if (!$result_meta || mysqli_num_rows($result_meta) === 0) {
        error_log("prepocetCerpaniPodleIdLP: LP ID '$lp_id' neexistuje v master tabulce");
        return false;
    }
    
    $meta = mysqli_fetch_assoc($result_meta);
    $cislo_lp_safe = mysqli_real_escape_string($conn, $meta['cislo_lp']);
    
    // KROK 2: REZERVACE - Parsovat JSON financovani a dělit částku podle počtu LP
    // POUZE STATUS = 'SCHVALENA' (velkými písmeny!)
    $sql_rezervace = "
        SELECT 
            obj.id,
            obj.max_cena_s_dph,
            obj.financovani
        FROM 25a_objednavky obj
        WHERE obj.financovani IS NOT NULL
        AND obj.financovani != ''
        AND obj.financovani LIKE '%\"typ\":\"LP\"%'
        AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
        AND DATE(obj.dt_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
    ";
    
    $result_rez = mysqli_query($conn, $sql_rezervace);
    $rezervovano = 0;
    
    if ($result_rez) {
        while ($row = mysqli_fetch_assoc($result_rez)) {
            $financovani = json_decode($row['financovani'], true);
            
            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                $lp_ids = $financovani['lp_kody'];
                
                // Normalizovat pole na inty pro porovnání
                $lp_ids_int = array_map('intval', $lp_ids);
                
                if (in_array($lp_id, $lp_ids_int)) {
                    $pocet_lp = count($lp_ids);
                    $podil = $pocet_lp > 0 ? ((float)$row['max_cena_s_dph'] / $pocet_lp) : 0;
                    $rezervovano += $podil;
                }
            }
        }
    }
    
    // KROK 3: PŘEDPOKLAD - Parsovat JSON a dělit SUM(cena_s_dph)
    // VŠECHNY SCHVÁLENÉ objednávky (včetně fakturovaných)
    // Předpoklad = celková výše rezervovaných prostředků
    $sql_predpoklad = "
        SELECT 
            obj.id,
            obj.financovani,
            SUM(pol.cena_s_dph) as suma_cena
        FROM 25a_objednavky obj
        INNER JOIN 25a_objednavky_polozky pol ON obj.id = pol.objednavka_id
        WHERE obj.financovani IS NOT NULL
        AND obj.financovani != ''
        AND obj.financovani LIKE '%\"typ\":\"LP\"%'
        AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
        AND DATE(obj.dt_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
        GROUP BY obj.id, obj.financovani
    ";
    
    $result_pred = mysqli_query($conn, $sql_predpoklad);
    $predpokladane_cerpani = 0;
    
    if ($result_pred) {
        while ($row = mysqli_fetch_assoc($result_pred)) {
            $financovani = json_decode($row['financovani'], true);
            
            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                $lp_ids = $financovani['lp_kody'];
                
                // Normalizovat pole na inty pro porovnání
                $lp_ids_int = array_map('intval', $lp_ids);
                
                if (in_array($lp_id, $lp_ids_int)) {
                    $pocet_lp = count($lp_ids);
                    $podil = $pocet_lp > 0 ? ((float)$row['suma_cena'] / $pocet_lp) : 0;
                    $predpokladane_cerpani += $podil;
                }
            }
        }
    }
    
    // KROK 4: SKUTEČNOST - Parsovat JSON a dělit SUM(fa_castka) z tabulky faktur
    $sql_fakturovano = "
        SELECT 
            obj.id,
            obj.financovani,
            SUM(fakt.fa_castka) as suma_faktur
        FROM 25a_objednavky obj
        INNER JOIN 25a_objednavky_faktury fakt ON obj.id = fakt.objednavka_id
        WHERE obj.financovani IS NOT NULL
        AND obj.financovani != ''
        AND obj.financovani LIKE '%\"typ\":\"LP\"%'
        AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
        AND DATE(obj.dt_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
        GROUP BY obj.id, obj.financovani
    ";
    
    $result_fakt = mysqli_query($conn, $sql_fakturovano);
    $fakturovano = 0;
    
    if ($result_fakt) {
        while ($row = mysqli_fetch_assoc($result_fakt)) {
            $financovani = json_decode($row['financovani'], true);
            
            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                $lp_ids = $financovani['lp_kody'];
                
                // Normalizovat pole na inty pro porovnání
                $lp_ids_int = array_map('intval', $lp_ids);
                
                if (in_array($lp_id, $lp_ids_int)) {
                    $pocet_lp = count($lp_ids);
                    $podil = $pocet_lp > 0 ? ((float)$row['suma_faktur'] / $pocet_lp) : 0;
                    $fakturovano += $podil;
                }
            }
        }
    }
    
    // KROK 5: Čerpání z pokladny (jen VÝDAJE z uzavřených/zamknutých knih)
    $sql_pokladna = "
        SELECT COALESCE(SUM(pol.castka_vydaj), 0) as cerpano_pokl
        FROM 25a_pokladni_knihy p
        JOIN 25a_pokladni_polozky pol ON p.id = pol.pokladni_kniha_id
        WHERE pol.lp_kod = '$cislo_lp_safe'
        AND p.stav_knihy IN ('uzavrena_uzivatelem', 'zamknuta_spravcem')
        AND p.rok = {$meta['rok']}
    ";
    
    $result_pokl = mysqli_query($conn, $sql_pokladna);
    $cerpano_pokladna = 0;
    
    if ($result_pokl) {
        $row = mysqli_fetch_assoc($result_pokl);
        $cerpano_pokladna = (float)$row['cerpano_pokl'];
    }
    
    // SKUTEČNÉ ČERPÁNÍ = fakturované objednávky + pokladna
    $skutecne_cerpano = $fakturovano + $cerpano_pokladna;
    
    // KROK 6: Vypočítat zůstatky a procenta pro každý typ
    $celkovy_limit = (float)$meta['celkovy_limit'];
    
    $zbyva_rezervace = $celkovy_limit - $rezervovano;
    $zbyva_predpoklad = $celkovy_limit - $predpokladane_cerpani;
    $zbyva_skutecne = $celkovy_limit - $skutecne_cerpano;
    
    $procento_rezervace = $celkovy_limit > 0 ? round(($rezervovano / $celkovy_limit) * 100, 2) : 0;
    $procento_predpoklad = $celkovy_limit > 0 ? round(($predpokladane_cerpani / $celkovy_limit) * 100, 2) : 0;
    $procento_skutecne = $celkovy_limit > 0 ? round(($skutecne_cerpano / $celkovy_limit) * 100, 2) : 0;
    
    // KROK 7: Upsert do agregační tabulky 25_limitovane_prisliby_cerpani
    $sql_upsert = "
        INSERT INTO 25_limitovane_prisliby_cerpani 
        (cislo_lp, kategorie, usek_id, user_id, rok, 
         celkovy_limit,
         rezervovano, predpokladane_cerpani, skutecne_cerpano, cerpano_pokladna,
         zbyva_rezervace, zbyva_predpoklad, zbyva_skutecne,
         procento_rezervace, procento_predpoklad, procento_skutecne,
         pocet_zaznamu, ma_navyseni, posledni_prepocet)
        VALUES (
            '$cislo_lp_safe',
            '{$meta['kategorie']}',
            {$meta['usek_id']},
            {$meta['user_id']},
            {$meta['rok']},
            $celkovy_limit,
            $rezervovano,
            $predpokladane_cerpani,
            $skutecne_cerpano,
            $cerpano_pokladna,
            $zbyva_rezervace,
            $zbyva_predpoklad,
            $zbyva_skutecne,
            $procento_rezervace,
            $procento_predpoklad,
            $procento_skutecne,
            {$meta['pocet_zaznamu']},
            {$meta['ma_navyseni']},
            NOW()
        )
        ON DUPLICATE KEY UPDATE
            celkovy_limit = $celkovy_limit,
            rezervovano = $rezervovano,
            predpokladane_cerpani = $predpokladane_cerpani,
            skutecne_cerpano = $skutecne_cerpano,
            cerpano_pokladna = $cerpano_pokladna,
            zbyva_rezervace = $zbyva_rezervace,
            zbyva_predpoklad = $zbyva_predpoklad,
            zbyva_skutecne = $zbyva_skutecne,
            procento_rezervace = $procento_rezervace,
            procento_predpoklad = $procento_predpoklad,
            procento_skutecne = $procento_skutecne,
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
            'message' => "Přepočítáno $updated kódů LP, $failed selhalo pro rok $rok"
        );
    }
    
    return array(
        'success' => true,
        'updated' => $updated,
        'message' => "Přepočítáno $updated kódů LP pro rok $rok"
    );
}

/**
 * INICIALIZACE - Přepočítá všechna LP a nastaví počáteční stav
 * 
 * @param mysqli $conn Databázové spojení
 * @param int $rok Rok pro inicializaci
 * @return array Detailní výsledek inicializace
 */
function inicializaceCerpaniLP($conn, $rok = null) {
    if ($rok === null) {
        $rok = date('Y');
    }
    $rok = (int)$rok;
    
    $log = array();
    
    // 1. Vymazat staré záznamy z tabulky čerpání pro daný rok
    $sql_delete = "DELETE FROM 25_limitovane_prisliby_cerpani WHERE rok = $rok";
    
    if (mysqli_query($conn, $sql_delete)) {
        $deleted_count = mysqli_affected_rows($conn);
        $log[] = "Zahájení inicializace pro rok $rok";
        $log[] = "Vymazáno $deleted_count starých záznamů čerpání";
    } else {
        return array(
            'success' => false,
            'message' => 'Chyba při mazání starých záznamů: ' . mysqli_error($conn),
            'log' => $log
        );
    }
    
    // 2. Provést kompletní přepočet všech kódů LP
    $result = prepocetVsechLP($conn, $rok);
    $log[] = $result['message'];
    
    if (!$result['success'] && $result['failed'] > 0) {
        return array(
            'success' => false,
            'message' => 'Chyba při přepočtu LP',
            'log' => $log
        );
    }
    
    $log[] = "Inicializace dokončena";
    
    // 3. Získat statistiku z agregační tabulky - TŘI TYPY
    $sql_stats = "
        SELECT 
            COUNT(*) as celkem_kodu,
            SUM(celkovy_limit) as celkovy_limit,
            SUM(rezervovano) as celkem_rezervovano,
            SUM(predpokladane_cerpani) as celkem_predpoklad,
            SUM(skutecne_cerpano) as celkem_skutecne,
            SUM(cerpano_pokladna) as celkem_pokladna,
            SUM(zbyva_rezervace) as celkem_zbyva_rezervace,
            SUM(zbyva_predpoklad) as celkem_zbyva_predpoklad,
            SUM(zbyva_skutecne) as celkem_zbyva_skutecne,
            AVG(procento_rezervace) as prumerne_procento_rezervace,
            AVG(procento_predpoklad) as prumerne_procento_predpoklad,
            AVG(procento_skutecne) as prumerne_procento_skutecne,
            SUM(pocet_zaznamu) as celkem_zaznamu,
            SUM(ma_navyseni) as pocet_s_navysenim,
            COUNT(CASE WHEN zbyva_rezervace < 0 THEN 1 END) as prekroceno_rezervace,
            COUNT(CASE WHEN zbyva_predpoklad < 0 THEN 1 END) as prekroceno_predpoklad,
            COUNT(CASE WHEN zbyva_skutecne < 0 THEN 1 END) as prekroceno_skutecne
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
 * Získá agregovaný stav konkrétního kódu LP s TŘEMI TYPY ČERPÁNÍ
 * 
 * @param mysqli $conn Databázové spojení
 * @param string $cislo_lp Kód LP (např. 'LPIT1')
 * @param int $rok Rok (výchozí: aktuální)
 * @return array|null Agregovaný stav nebo null
 */
function getStavLP($conn, $cislo_lp, $rok = null) {
    if ($rok === null) {
        $rok = date('Y');
    }
    $rok = (int)$rok;
    
    $cislo_lp_safe = mysqli_real_escape_string($conn, $cislo_lp);
    
    $sql = "
        SELECT 
            c.id,
            c.cislo_lp,
            c.kategorie,
            c.usek_id,
            c.user_id,
            c.rok,
            c.celkovy_limit,
            c.rezervovano,
            c.predpokladane_cerpani,
            c.skutecne_cerpano,
            c.cerpano_pokladna,
            c.zbyva_rezervace,
            c.zbyva_predpoklad,
            c.zbyva_skutecne,
            c.procento_rezervace,
            c.procento_predpoklad,
            c.procento_skutecne,
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
    
    return array(
        'id' => (int)$row['id'],
        'cislo_lp' => $row['cislo_lp'],
        'kategorie' => $row['kategorie'],
        'celkovy_limit' => (float)$row['celkovy_limit'],
        
        // TŘI TYPY ČERPÁNÍ
        'rezervovano' => (float)$row['rezervovano'],
        'predpokladane_cerpani' => (float)$row['predpokladane_cerpani'],
        'skutecne_cerpano' => (float)$row['skutecne_cerpano'],
        'cerpano_pokladna' => (float)$row['cerpano_pokladna'],
        
        // ZŮSTATKY
        'zbyva_rezervace' => (float)$row['zbyva_rezervace'],
        'zbyva_predpoklad' => (float)$row['zbyva_predpoklad'],
        'zbyva_skutecne' => (float)$row['zbyva_skutecne'],
        
        // PROCENTA
        'procento_rezervace' => (float)$row['procento_rezervace'],
        'procento_predpoklad' => (float)$row['procento_predpoklad'],
        'procento_skutecne' => (float)$row['procento_skutecne'],
        
        // STAVY
        'je_prekroceno_rezervace' => (float)$row['zbyva_rezervace'] < 0,
        'je_prekroceno_predpoklad' => (float)$row['zbyva_predpoklad'] < 0,
        'je_prekroceno_skutecne' => (float)$row['zbyva_skutecne'] < 0,
        
        // METADATA
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
 * Získá seznam všech LP pro uživatele (agregované kódy) s TŘEMI TYPY
 * 
 * @param mysqli $conn Databázové spojení
 * @param int $user_id ID uživatele
 * @param int $rok Rok (výchozí: aktuální)
 * @return array Seznam LP
 */
function getStavLPProUzivatele($conn, $user_id, $rok = null) {
    if ($rok === null) {
        $rok = date('Y');
    }
    
    $user_id = (int)$user_id;
    $rok = (int)$rok;
    
    $sql = "
        SELECT 
            c.id,
            c.cislo_lp,
            c.kategorie,
            c.celkovy_limit,
            c.rezervovano,
            c.predpokladane_cerpani,
            c.skutecne_cerpano,
            c.cerpano_pokladna,
            c.zbyva_rezervace,
            c.zbyva_predpoklad,
            c.zbyva_skutecne,
            c.procento_rezervace,
            c.procento_predpoklad,
            c.procento_skutecne,
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
            'rezervovano' => (float)$row['rezervovano'],
            'predpokladane_cerpani' => (float)$row['predpokladane_cerpani'],
            'skutecne_cerpano' => (float)$row['skutecne_cerpano'],
            'cerpano_pokladna' => (float)$row['cerpano_pokladna'],
            'zbyva_rezervace' => (float)$row['zbyva_rezervace'],
            'zbyva_predpoklad' => (float)$row['zbyva_predpoklad'],
            'zbyva_skutecne' => (float)$row['zbyva_skutecne'],
            'procento_rezervace' => (float)$row['procento_rezervace'],
            'procento_predpoklad' => (float)$row['procento_predpoklad'],
            'procento_skutecne' => (float)$row['procento_skutecne'],
            'je_prekroceno_skutecne' => (float)$row['zbyva_skutecne'] < 0,
            'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
            'ma_navyseni' => (bool)$row['ma_navyseni'],
            'usek_nazev' => $row['usek_nazev']
        );
    }
    
    return $lp_list;
}

/**
 * Získá seznam všech LP pro úsek (agregované kódy) s TŘEMI TYPY
 * 
 * @param mysqli $conn Databázové spojení
 * @param int $usek_id ID úseku
 * @param int $rok Rok (výchozí: aktuální)
 * @return array Seznam LP
 */
function getStavLPProUsek($conn, $usek_id, $rok = null) {
    if ($rok === null) {
        $rok = date('Y');
    }
    
    $usek_id = (int)$usek_id;
    $rok = (int)$rok;
    
    $sql = "
        SELECT 
            c.id,
            c.cislo_lp,
            c.kategorie,
            c.celkovy_limit,
            c.rezervovano,
            c.predpokladane_cerpani,
            c.skutecne_cerpano,
            c.cerpano_pokladna,
            c.zbyva_rezervace,
            c.zbyva_predpoklad,
            c.zbyva_skutecne,
            c.procento_rezervace,
            c.procento_predpoklad,
            c.procento_skutecne,
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
            'rezervovano' => (float)$row['rezervovano'],
            'predpokladane_cerpani' => (float)$row['predpokladane_cerpani'],
            'skutecne_cerpano' => (float)$row['skutecne_cerpano'],
            'cerpano_pokladna' => (float)$row['cerpano_pokladna'],
            'zbyva_rezervace' => (float)$row['zbyva_rezervace'],
            'zbyva_predpoklad' => (float)$row['zbyva_predpoklad'],
            'zbyva_skutecne' => (float)$row['zbyva_skutecne'],
            'procento_rezervace' => (float)$row['procento_rezervace'],
            'procento_predpoklad' => (float)$row['procento_predpoklad'],
            'procento_skutecne' => (float)$row['procento_skutecne'],
            'je_prekroceno_skutecne' => (float)$row['zbyva_skutecne'] < 0,
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
 * Vrátí čerpání podle uživatelů pro konkrétní LP
 * 
 * @param mysqli $conn Databázové spojení
 * @param int $lp_id ID LP z tabulky 25_limitovane_prisliby
 * @return array Pole s daty čerpání podle uživatelů
 */
function getCerpaniPodleUzivatele($conn, $lp_id) {
    $lp_id = (int)$lp_id;
    
    // KROK 1: Získat metadata o LP
    $sql_meta = "
        SELECT 
            lp.id as lp_id,
            lp.cislo_lp,
            lp.kategorie,
            lp.usek_id,
            lp.user_id,
            YEAR(MIN(lp.platne_od)) as rok,
            SUM(lp.vyse_financniho_kryti) as celkovy_limit,
            MIN(lp.platne_od) as nejstarsi_platnost,
            MAX(lp.platne_do) as nejnovejsi_platnost,
            u.prijmeni as prikazce_prijmeni,
            u.jmeno as prikazce_jmeno
        FROM 25_limitovane_prisliby lp
        LEFT JOIN users u ON lp.user_id = u.id
        WHERE lp.id = $lp_id
        GROUP BY lp.id, lp.cislo_lp, lp.kategorie, lp.usek_id, lp.user_id, u.prijmeni, u.jmeno
        LIMIT 1
    ";
    
    $result_meta = mysqli_query($conn, $sql_meta);
    
    if (!$result_meta || mysqli_num_rows($result_meta) === 0) {
        return array(
            'status' => 'error',
            'message' => 'LP s tímto ID neexistuje'
        );
    }
    
    $meta = mysqli_fetch_assoc($result_meta);
    $cislo_lp_safe = mysqli_real_escape_string($conn, $meta['cislo_lp']);
    
    // KROK 2: Získat seznam uživatelů, kteří vytvořili objednávky s tímto LP
    $sql_users = "
        SELECT DISTINCT obj.vytvoril_user_id
        FROM 25a_objednavky obj
        WHERE obj.financovani IS NOT NULL
        AND obj.financovani != ''
        AND obj.financovani LIKE '%\"typ\":\"LP\"%'
        AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
        AND DATE(obj.dt_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
    ";
    
    $result_users = mysqli_query($conn, $sql_users);
    $users_data = array();
    $celkem_rezervovano = 0;
    $celkem_predpoklad = 0;
    $celkem_skutecne = 0;
    $celkem_objednavek = 0;
    
    if ($result_users) {
        while ($user_row = mysqli_fetch_assoc($result_users)) {
            $user_id = (int)$user_row['vytvoril_user_id'];
            
            // Získat jméno uživatele
            $sql_user_info = "
                SELECT id, prijmeni, jmeno
                FROM users
                WHERE id = $user_id
                LIMIT 1
            ";
            $result_user_info = mysqli_query($conn, $sql_user_info);
            $user_info = mysqli_fetch_assoc($result_user_info);
            
            // REZERVACE pro tohoto uživatele
            $sql_rez = "
                SELECT obj.id, obj.max_cena_s_dph, obj.financovani
                FROM 25a_objednavky obj
                WHERE obj.financovani IS NOT NULL
                AND obj.financovani != ''
                AND obj.financovani LIKE '%\"typ\":\"LP\"%'
                AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
                AND obj.vytvoril_user_id = $user_id
                AND DATE(obj.dt_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
            ";
            
            $result_rez = mysqli_query($conn, $sql_rez);
            $rezervovano = 0;
            $pocet_obj = 0;
            
            if ($result_rez) {
                while ($row = mysqli_fetch_assoc($result_rez)) {
                    $financovani = json_decode($row['financovani'], true);
                    
                    if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                        $lp_ids = $financovani['lp_kody'];
                        $lp_ids_int = array_map('intval', $lp_ids);
                        
                        if (in_array($lp_id, $lp_ids_int)) {
                            $pocet_lp = count($lp_ids);
                            $podil = $pocet_lp > 0 ? ((float)$row['max_cena_s_dph'] / $pocet_lp) : 0;
                            $rezervovano += $podil;
                            $pocet_obj++;
                        }
                    }
                }
            }
            
            // PŘEDPOKLAD pro tohoto uživatele (všechny schválené objednávky)
            $sql_pred = "
                SELECT obj.id, obj.financovani, SUM(pol.cena_s_dph) as suma_cena
                FROM 25a_objednavky obj
                JOIN 25a_objednavky_polozky pol ON obj.id = pol.objednavka_id
                WHERE obj.financovani IS NOT NULL
                AND obj.financovani != ''
                AND obj.financovani LIKE '%\"typ\":\"LP\"%'
                AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
                AND obj.vytvoril_user_id = $user_id
                AND DATE(obj.dt_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
                GROUP BY obj.id, obj.financovani
            ";
            
            $result_pred = mysqli_query($conn, $sql_pred);
            $predpoklad = 0;
            
            if ($result_pred) {
                while ($row = mysqli_fetch_assoc($result_pred)) {
                    $financovani = json_decode($row['financovani'], true);
                    
                    if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                        $lp_ids = $financovani['lp_kody'];
                        $lp_ids_int = array_map('intval', $lp_ids);
                        
                        if (in_array($lp_id, $lp_ids_int)) {
                            $pocet_lp = count($lp_ids);
                            $podil = $pocet_lp > 0 ? ((float)$row['suma_cena'] / $pocet_lp) : 0;
                            $predpoklad += $podil;
                        }
                    }
                }
            }
            
            // SKUTEČNOST (faktury) pro tohoto uživatele
            $sql_fakt = "
                SELECT obj.id, obj.financovani, SUM(fakt.fa_castka) as suma_faktur
                FROM 25a_objednavky obj
                INNER JOIN 25a_objednavky_faktury fakt ON obj.id = fakt.objednavka_id
                WHERE obj.financovani IS NOT NULL
                AND obj.financovani != ''
                AND obj.financovani LIKE '%\"typ\":\"LP\"%'
                AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
                AND obj.vytvoril_user_id = $user_id
                AND DATE(obj.dt_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
                GROUP BY obj.id, obj.financovani
            ";
            
            $result_fakt = mysqli_query($conn, $sql_fakt);
            $skutecne = 0;
            
            if ($result_fakt) {
                while ($row = mysqli_fetch_assoc($result_fakt)) {
                    $financovani = json_decode($row['financovani'], true);
                    
                    if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                        $lp_ids = $financovani['lp_kody'];
                        $lp_ids_int = array_map('intval', $lp_ids);
                        
                        if (in_array($lp_id, $lp_ids_int)) {
                            $pocet_lp = count($lp_ids);
                            $podil = $pocet_lp > 0 ? ((float)$row['suma_faktur'] / $pocet_lp) : 0;
                            $skutecne += $podil;
                        }
                    }
                }
            }
            
            // Přidat data uživatele jen pokud má nějaké čerpání
            if ($pocet_obj > 0) {
                $celkovy_limit = (float)$meta['celkovy_limit'];
                
                $users_data[] = array(
                    'user_id' => $user_id,
                    'prijmeni' => $user_info ? $user_info['prijmeni'] : '',
                    'jmeno' => $user_info ? $user_info['jmeno'] : '',
                    'pocet_objednavek' => $pocet_obj,
                    'rezervovano' => round($rezervovano, 2),
                    'predpokladane_cerpani' => round($predpoklad, 2),
                    'skutecne_cerpano' => round($skutecne, 2),
                    'procento_rezervace' => $celkovy_limit > 0 ? round(($rezervovano / $celkovy_limit) * 100, 2) : 0,
                    'procento_predpoklad' => $celkovy_limit > 0 ? round(($predpoklad / $celkovy_limit) * 100, 2) : 0,
                    'procento_skutecne' => $celkovy_limit > 0 ? round(($skutecne / $celkovy_limit) * 100, 2) : 0
                );
                
                $celkem_rezervovano += $rezervovano;
                $celkem_predpoklad += $predpoklad;
                $celkem_skutecne += $skutecne;
                $celkem_objednavek += $pocet_obj;
            }
        }
    }
    
    // KROK 3: Přidat čerpání z pokladny (pokud existuje)
    $sql_pokladna = "
        SELECT COALESCE(SUM(pol.castka_vydaj), 0) as cerpano_pokl
        FROM 25a_pokladni_knihy p
        JOIN 25a_pokladni_polozky pol ON p.id = pol.pokladni_kniha_id
        WHERE pol.lp_kod = '$cislo_lp_safe'
        AND p.stav_knihy IN ('uzavrena_uzivatelem', 'zamknuta_spravcem')
        AND p.rok = {$meta['rok']}
    ";
    
    $result_pokl = mysqli_query($conn, $sql_pokladna);
    $cerpano_pokladna = 0;
    
    if ($result_pokl) {
        $row = mysqli_fetch_assoc($result_pokl);
        $cerpano_pokladna = (float)$row['cerpano_pokl'];
    }
    
    $celkem_skutecne += $cerpano_pokladna;
    
    // Seřadit podle rezervovano DESC
    usort($users_data, function($a, $b) {
        return $b['rezervovano'] - $a['rezervovano'];
    });
    
    return array(
        'status' => 'ok',
        'data' => array(
            'lp_info' => array(
                'lp_id' => (int)$meta['lp_id'],
                'cislo_lp' => $meta['cislo_lp'],
                'kategorie' => $meta['kategorie'],
                'celkovy_limit' => (float)$meta['celkovy_limit'],
                'prikazce_user_id' => (int)$meta['user_id'],
                'prikazce_prijmeni' => $meta['prikazce_prijmeni'],
                'prikazce_jmeno' => $meta['prikazce_jmeno'],
                'usek_id' => (int)$meta['usek_id'],
                'rok' => (int)$meta['rok']
            ),
            'cerpani_podle_uzivatelu' => $users_data,
            'cerpano_pokladna' => round($cerpano_pokladna, 2),
            'celkem' => array(
                'pocet_uzivatelu' => count($users_data),
                'pocet_objednavek' => $celkem_objednavek,
                'rezervovano' => round($celkem_rezervovano, 2),
                'predpokladane_cerpani' => round($celkem_predpoklad, 2),
                'skutecne_cerpano' => round($celkem_skutecne, 2),
                'procento_rezervace' => (float)$meta['celkovy_limit'] > 0 ? round(($celkem_rezervovano / (float)$meta['celkovy_limit']) * 100, 2) : 0,
                'procento_predpoklad' => (float)$meta['celkovy_limit'] > 0 ? round(($celkem_predpoklad / (float)$meta['celkovy_limit']) * 100, 2) : 0,
                'procento_skutecne' => (float)$meta['celkovy_limit'] > 0 ? round(($celkem_skutecne / (float)$meta['celkovy_limit']) * 100, 2) : 0
            )
        ),
        'meta' => array(
            'version' => 'v3.0',
            'timestamp' => date('Y-m-d H:i:s')
        )
    );
}

/**
 * Vrátí čerpání podle úseku - všechna LP úseku s detailem po uživatelích
 * 
 * @param mysqli $conn Databázové spojení
 * @param int $usek_id ID úseku
 * @param int $rok Rok (volitelné)
 * @return array Pole s daty čerpání podle úseku
 */
function getCerpaniPodleUseku($conn, $usek_id, $rok = null) {
    $usek_id = (int)$usek_id;
    $rok = $rok ? (int)$rok : (int)date('Y');
    
    // KROK 1: Získat informace o úseku
    $sql_usek = "
        SELECT id, usek_nazev
        FROM 25a_useky
        WHERE id = $usek_id
        LIMIT 1
    ";
    
    $result_usek = mysqli_query($conn, $sql_usek);
    
    if (!$result_usek || mysqli_num_rows($result_usek) === 0) {
        return array(
            'status' => 'error',
            'message' => 'Úsek s tímto ID neexistuje'
        );
    }
    
    $usek_info = mysqli_fetch_assoc($result_usek);
    
    // KROK 2: Získat všechna LP pro tento úsek
    $sql_lp_list = "
        SELECT DISTINCT id, cislo_lp
        FROM 25_limitovane_prisliby
        WHERE usek_id = $usek_id
        AND YEAR(platne_od) = $rok
        ORDER BY cislo_lp
    ";
    
    $result_lp_list = mysqli_query($conn, $sql_lp_list);
    $lp_data = array();
    
    $celkovy_limit_usek = 0;
    $celkem_rezervovano_usek = 0;
    $celkem_predpoklad_usek = 0;
    $celkem_skutecne_usek = 0;
    $celkem_pokladna_usek = 0;
    $celkem_lp = 0;
    
    if ($result_lp_list) {
        while ($lp_row = mysqli_fetch_assoc($result_lp_list)) {
            $lp_id = (int)$lp_row['id'];
            
            // Pro každé LP získat detail čerpání podle uživatelů
            $lp_detail = getCerpaniPodleUzivatele($conn, $lp_id);
            
            if ($lp_detail['status'] === 'ok') {
                $lp_data[] = array(
                    'lp_id' => $lp_id,
                    'cislo_lp' => $lp_detail['data']['lp_info']['cislo_lp'],
                    'kategorie' => $lp_detail['data']['lp_info']['kategorie'],
                    'celkovy_limit' => $lp_detail['data']['lp_info']['celkovy_limit'],
                    'prikazce_user_id' => $lp_detail['data']['lp_info']['prikazce_user_id'],
                    'prikazce_prijmeni' => $lp_detail['data']['lp_info']['prikazce_prijmeni'],
                    'prikazce_jmeno' => $lp_detail['data']['lp_info']['prikazce_jmeno'],
                    'cerpani_podle_uzivatelu' => $lp_detail['data']['cerpani_podle_uzivatelu'],
                    'cerpano_pokladna' => $lp_detail['data']['cerpano_pokladna'],
                    'celkem' => $lp_detail['data']['celkem']
                );
                
                // Agregace za celý úsek
                $celkovy_limit_usek += $lp_detail['data']['lp_info']['celkovy_limit'];
                $celkem_rezervovano_usek += $lp_detail['data']['celkem']['rezervovano'];
                $celkem_predpoklad_usek += $lp_detail['data']['celkem']['predpokladane_cerpani'];
                $celkem_skutecne_usek += $lp_detail['data']['celkem']['skutecne_cerpano'];
                $celkem_pokladna_usek += $lp_detail['data']['cerpano_pokladna'];
                $celkem_lp++;
            }
        }
    }
    
    // KROK 3: Agregace uživatelů napříč všemi LP úseku
    $users_aggregate = array();
    
    foreach ($lp_data as $lp) {
        foreach ($lp['cerpani_podle_uzivatelu'] as $user) {
            $user_id = $user['user_id'];
            
            if (!isset($users_aggregate[$user_id])) {
                $users_aggregate[$user_id] = array(
                    'user_id' => $user_id,
                    'prijmeni' => $user['prijmeni'],
                    'jmeno' => $user['jmeno'],
                    'pocet_objednavek' => 0,
                    'rezervovano' => 0,
                    'predpokladane_cerpani' => 0,
                    'skutecne_cerpano' => 0
                );
            }
            
            $users_aggregate[$user_id]['pocet_objednavek'] += $user['pocet_objednavek'];
            $users_aggregate[$user_id]['rezervovano'] += $user['rezervovano'];
            $users_aggregate[$user_id]['predpokladane_cerpani'] += $user['predpokladane_cerpani'];
            $users_aggregate[$user_id]['skutecne_cerpano'] += $user['skutecne_cerpano'];
        }
    }
    
    // Zaokrouhlit a převést na pole
    $users_aggregate_array = array_values($users_aggregate);
    foreach ($users_aggregate_array as &$user) {
        $user['rezervovano'] = round($user['rezervovano'], 2);
        $user['predpokladane_cerpani'] = round($user['predpokladane_cerpani'], 2);
        $user['skutecne_cerpano'] = round($user['skutecne_cerpano'], 2);
        
        // Procenta z celkového limitu úseku
        $user['procento_rezervace'] = $celkovy_limit_usek > 0 ? round(($user['rezervovano'] / $celkovy_limit_usek) * 100, 2) : 0;
        $user['procento_predpoklad'] = $celkovy_limit_usek > 0 ? round(($user['predpokladane_cerpani'] / $celkovy_limit_usek) * 100, 2) : 0;
        $user['procento_skutecne'] = $celkovy_limit_usek > 0 ? round(($user['skutecne_cerpano'] / $celkovy_limit_usek) * 100, 2) : 0;
    }
    
    // Seřadit podle rezervovano DESC
    usort($users_aggregate_array, function($a, $b) {
        return $b['rezervovano'] - $a['rezervovano'];
    });
    
    return array(
        'status' => 'ok',
        'data' => array(
            'usek_info' => array(
                'usek_id' => $usek_id,
                'usek_nazev' => $usek_info['usek_nazev'],
                'rok' => $rok
            ),
            'lp_seznam' => $lp_data,
            'cerpani_podle_uzivatelu_agregace' => $users_aggregate_array,
            'celkem_usek' => array(
                'pocet_lp' => $celkem_lp,
                'celkovy_limit' => round($celkovy_limit_usek, 2),
                'rezervovano' => round($celkem_rezervovano_usek, 2),
                'predpokladane_cerpani' => round($celkem_predpoklad_usek, 2),
                'skutecne_cerpano' => round($celkem_skutecne_usek, 2),
                'cerpano_pokladna' => round($celkem_pokladna_usek, 2),
                'zbyva_rezervace' => round($celkovy_limit_usek - $celkem_rezervovano_usek, 2),
                'zbyva_predpoklad' => round($celkovy_limit_usek - $celkem_predpoklad_usek, 2),
                'zbyva_skutecne' => round($celkovy_limit_usek - $celkem_skutecne_usek, 2),
                'procento_rezervace' => $celkovy_limit_usek > 0 ? round(($celkem_rezervovano_usek / $celkovy_limit_usek) * 100, 2) : 0,
                'procento_predpoklad' => $celkovy_limit_usek > 0 ? round(($celkem_predpoklad_usek / $celkovy_limit_usek) * 100, 2) : 0,
                'procento_skutecne' => $celkovy_limit_usek > 0 ? round(($celkem_skutecne_usek / $celkovy_limit_usek) * 100, 2) : 0
            )
        ),
        'meta' => array(
            'version' => 'v3.0',
            'timestamp' => date('Y-m-d H:i:s')
        )
    );
}

?>

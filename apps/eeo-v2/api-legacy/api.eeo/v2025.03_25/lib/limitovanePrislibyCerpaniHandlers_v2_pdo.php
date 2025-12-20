<?php
/**
 * API handlers pro přepočet a správu čerpání limitovaných příslibů - VERZE 2 PDO
 * 
 * ARCHITEKTURA: DVĚ TABULKY + TŘI TYPY ČERPÁNÍ
 * 1. 25_limitovane_prisliby - master data (záznamy LP)
 * 2. 25_limitovane_prisliby_cerpani - agregovaná data s třemi typy čerpání
 * 
 * TŘI TYPY ČERPÁNÍ (objednávky):
 * 1. REZERVACE (rezervovano) - pesimistický odhad podle max_cena_s_dph
 * 2. PŘEDPOKLAD (predpokladane_cerpani) - reálný odhad podle součtu položek
 * 3. SKUTEČNOST (skutecne_cerpano) - finální čerpání podle fakturovaných částek
 * 
 * POKLADNA: Vždy jen skutečné čerpání (finální částky)
 * 
 * REFACTOR: mysqli -> PDO prepared statements (PHP 5.6+, MySQL 5.5.43)
 * Datum: 2025-12-20
 */

// Table constants (define only if not already defined)
if (!defined('TBL_LP_MASTER')) define('TBL_LP_MASTER', '25_limitovane_prisliby');
if (!defined('TBL_LP_CERPANI')) define('TBL_LP_CERPANI', '25_limitovane_prisliby_cerpani');
if (!defined('TBL_OBJEDNAVKY')) define('TBL_OBJEDNAVKY', '25a_objednavky');
if (!defined('TBL_OBJEDNAVKY_POLOZKY')) define('TBL_OBJEDNAVKY_POLOZKY', '25a_objednavky_polozky');
if (!defined('TBL_POKLADNI_KNIHY')) define('TBL_POKLADNI_KNIHY', '25a_pokladni_knihy');
if (!defined('TBL_POKLADNI_POLOZKY')) define('TBL_POKLADNI_POLOZKY', '25a_pokladni_polozky');
if (!defined('TBL_UZIVATELE')) define('TBL_UZIVATELE', '25_uzivatele');
if (!defined('TBL_USEKY')) define('TBL_USEKY', '25_useky');

/**
 * Přepočítá agregované čerpání pro konkrétní LP podle ID s TŘEMI TYPY ČERPÁNÍ
 * 
 * @param PDO $pdo Databázové spojení
 * @param int $lp_id ID LP z tabulky 25_limitovane_prisliby
 * @return array Result array with status
 */
function prepocetCerpaniPodleIdLP_PDO($pdo, $lp_id) {
    $lp_id = (int)$lp_id;
    
    try {
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
            FROM " . TBL_LP_MASTER . " lp
            WHERE lp.id = :lp_id
            GROUP BY lp.id, lp.cislo_lp, lp.kategorie, lp.usek_id, lp.user_id
            LIMIT 1
        ";
        
        $stmt = $pdo->prepare($sql_meta);
        $stmt->execute(['lp_id' => $lp_id]);
        $meta = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$meta) {
            return [
                'success' => false,
                'error' => "LP ID '$lp_id' neexistuje v master tabulce"
            ];
        }
        
        // KROK 2: REZERVACE - Parsovat JSON financovani a dělit částku podle počtu LP
        // POUZE STATUS = 'SCHVALENA' (velkými písmeny!)
        $sql_rezervace = "
            SELECT 
                obj.id,
                obj.max_cena_s_dph,
                obj.financovani
            FROM " . TBL_OBJEDNAVKY . " obj
            WHERE obj.financovani IS NOT NULL
            AND obj.financovani != ''
            AND obj.financovani LIKE '%\"typ\":\"LP\"%'
            AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
            AND DATE(obj.dt_vytvoreni) BETWEEN :datum_od AND :datum_do
        ";
        
        $stmt_rez = $pdo->prepare($sql_rezervace);
        $stmt_rez->execute([
            'datum_od' => $meta['nejstarsi_platnost'],
            'datum_do' => $meta['nejnovejsi_platnost']
        ]);
        
        $rezervovano = 0;
        while ($row = $stmt_rez->fetch(PDO::FETCH_ASSOC)) {
            $financovani = json_decode($row['financovani'], true);
            
            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                $lp_ids = $financovani['lp_kody'];
                $lp_ids_int = array_map('intval', $lp_ids);
                
                if (in_array($lp_id, $lp_ids_int)) {
                    $pocet_lp = count($lp_ids);
                    $podil = $pocet_lp > 0 ? ((float)$row['max_cena_s_dph'] / $pocet_lp) : 0;
                    $rezervovano += $podil;
                }
            }
        }
        
        // KROK 3: PŘEDPOKLAD - Parsovat JSON a dělit SUM(cena_s_dph) položek
        $sql_predpoklad = "
            SELECT 
                obj.id,
                obj.financovani,
                SUM(pol.cena_s_dph) as suma_cena
            FROM " . TBL_OBJEDNAVKY . " obj
            INNER JOIN " . TBL_OBJEDNAVKY_POLOZKY . " pol ON pol.objednavka_id = obj.id
            WHERE obj.financovani IS NOT NULL
            AND obj.financovani != ''
            AND obj.financovani LIKE '%\"typ\":\"LP\"%'
            AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
            AND DATE(obj.dt_vytvoreni) BETWEEN :datum_od AND :datum_do
            GROUP BY obj.id, obj.financovani
        ";
        
        $stmt_pred = $pdo->prepare($sql_predpoklad);
        $stmt_pred->execute([
            'datum_od' => $meta['nejstarsi_platnost'],
            'datum_do' => $meta['nejnovejsi_platnost']
        ]);
        
        $predpokladane_cerpani = 0;
        while ($row = $stmt_pred->fetch(PDO::FETCH_ASSOC)) {
            $financovani = json_decode($row['financovani'], true);
            
            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                $lp_ids = $financovani['lp_kody'];
                $lp_ids_int = array_map('intval', $lp_ids);
                
                if (in_array($lp_id, $lp_ids_int)) {
                    $pocet_lp = count($lp_ids);
                    $podil = $pocet_lp > 0 ? ((float)$row['suma_cena'] / $pocet_lp) : 0;
                    $predpokladane_cerpani += $podil;
                }
            }
        }
        
        // KROK 4: SKUTEČNOST - Parsovat JSON a dělit SUM(fa_castka) z tabulky faktur
        $sql_fakturovano = "
            SELECT 
                obj.id,
                obj.financovani,
                SUM(fakt.fa_castka) as suma_faktur
            FROM " . TBL_OBJEDNAVKY . " obj
            INNER JOIN 25a_objednavky_faktury fakt ON fakt.objednavka_id = obj.id
            WHERE obj.financovani IS NOT NULL
            AND obj.financovani != ''
            AND obj.financovani LIKE '%\"typ\":\"LP\"%'
            AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
            AND DATE(obj.dt_vytvoreni) BETWEEN :datum_od AND :datum_do
            GROUP BY obj.id, obj.financovani
        ";
        
        $stmt_fakt = $pdo->prepare($sql_fakturovano);
        $stmt_fakt->execute([
            'datum_od' => $meta['nejstarsi_platnost'],
            'datum_do' => $meta['nejnovejsi_platnost']
        ]);
        
        $fakturovano = 0;
        while ($row = $stmt_fakt->fetch(PDO::FETCH_ASSOC)) {
            $financovani = json_decode($row['financovani'], true);
            
            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                $lp_ids = $financovani['lp_kody'];
                $lp_ids_int = array_map('intval', $lp_ids);
                
                if (in_array($lp_id, $lp_ids_int)) {
                    $pocet_lp = count($lp_ids);
                    $podil = $pocet_lp > 0 ? ((float)$row['suma_faktur'] / $pocet_lp) : 0;
                    $fakturovano += $podil;
                }
            }
        }
        
        // KROK 5: Čerpání z pokladny (jen VÝDAJE z uzavřených/zamknutých knih)
        $sql_pokladna = "
            SELECT COALESCE(SUM(pp.castka_vydaj), 0) as cerpano_pokl
            FROM " . TBL_POKLADNI_KNIHY . " pk
            JOIN " . TBL_POKLADNI_POLOZKY . " pp ON pp.pokladni_kniha_id = pk.id
            WHERE pp.lp_kod = :cislo_lp
            AND pk.stav_knihy IN ('uzavrena_uzivatelem', 'zamknuta_spravcem')
            AND pk.rok = :rok
        ";
        
        $stmt_pokl = $pdo->prepare($sql_pokladna);
        $stmt_pokl->execute([
            'cislo_lp' => $meta['cislo_lp'],
            'rok' => $meta['rok']
        ]);
        
        $row_pokl = $stmt_pokl->fetch(PDO::FETCH_ASSOC);
        $cerpano_pokladna = (float)($row_pokl['cerpano_pokl'] ?? 0);
        
        // SKUTEČNÉ ČERPÁNÍ = fakturované objednávky + pokladna
        $skutecne_cerpano = $fakturovano + $cerpano_pokladna;
        
        // KROK 6: Vypočítat zůstatky a procenta
        // Zajistit že všechny hodnoty jsou validní floats (ne NULL)
        $celkovy_limit = (float)($meta['celkovy_limit'] ?? 0);
        $rezervovano = (float)($rezervovano ?? 0);
        $predpokladane_cerpani = (float)($predpokladane_cerpani ?? 0);
        $skutecne_cerpano = (float)($skutecne_cerpano ?? 0);
        $cerpano_pokladna = (float)($cerpano_pokladna ?? 0);
        
        $zbyva_rezervace = $celkovy_limit - $rezervovano;
        $zbyva_predpoklad = $celkovy_limit - $predpokladane_cerpani;
        $zbyva_skutecne = $celkovy_limit - $skutecne_cerpano;
        
        // Omezit procenta na max 999.99 (DECIMAL(5,2) rozsah) a zajistit platnou hodnotu
        $procento_rezervace = $celkovy_limit > 0 ? min(999.99, round(($rezervovano / $celkovy_limit) * 100, 2)) : 0.00;
        $procento_predpoklad = $celkovy_limit > 0 ? min(999.99, round(($predpokladane_cerpani / $celkovy_limit) * 100, 2)) : 0.00;
        $procento_skutecne = $celkovy_limit > 0 ? min(999.99, round(($skutecne_cerpano / $celkovy_limit) * 100, 2)) : 0.00;
        
        // KROK 7: UPSERT do čerpání tabulky
        $sql_upsert = "
            INSERT INTO " . TBL_LP_CERPANI . " (
                cislo_lp, kategorie, usek_id, user_id, rok,
                celkovy_limit, 
                rezervovano, predpokladane_cerpani, skutecne_cerpano, cerpano_pokladna,
                zbyva_rezervace, zbyva_predpoklad, zbyva_skutecne,
                procento_rezervace, procento_predpoklad, procento_skutecne,
                pocet_zaznamu, ma_navyseni, posledni_prepocet
            ) VALUES (
                :cislo_lp, :kategorie, :usek_id, :user_id, :rok,
                :celkovy_limit,
                :rezervovano, :predpokladane_cerpani, :skutecne_cerpano, :cerpano_pokladna,
                :zbyva_rezervace, :zbyva_predpoklad, :zbyva_skutecne,
                :procento_rezervace, :procento_predpoklad, :procento_skutecne,
                :pocet_zaznamu, :ma_navyseni, NOW()
            )
            ON DUPLICATE KEY UPDATE
                celkovy_limit = VALUES(celkovy_limit),
                rezervovano = VALUES(rezervovano),
                predpokladane_cerpani = VALUES(predpokladane_cerpani),
                skutecne_cerpano = VALUES(skutecne_cerpano),
                cerpano_pokladna = VALUES(cerpano_pokladna),
                zbyva_rezervace = VALUES(zbyva_rezervace),
                zbyva_predpoklad = VALUES(zbyva_predpoklad),
                zbyva_skutecne = VALUES(zbyva_skutecne),
                procento_rezervace = VALUES(procento_rezervace),
                procento_predpoklad = VALUES(procento_predpoklad),
                procento_skutecne = VALUES(procento_skutecne),
                pocet_zaznamu = VALUES(pocet_zaznamu),
                ma_navyseni = VALUES(ma_navyseni),
                posledni_prepocet = NOW()
        ";
        
        $stmt_upsert = $pdo->prepare($sql_upsert);
        $stmt_upsert->execute([
            'cislo_lp' => $meta['cislo_lp'],
            'kategorie' => $meta['kategorie'],
            'usek_id' => $meta['usek_id'],
            'user_id' => $meta['user_id'],
            'rok' => $meta['rok'],
            'celkovy_limit' => $celkovy_limit,
            'rezervovano' => $rezervovano,
            'predpokladane_cerpani' => $predpokladane_cerpani,
            'skutecne_cerpano' => $skutecne_cerpano,
            'cerpano_pokladna' => $cerpano_pokladna,
            'zbyva_rezervace' => $zbyva_rezervace,
            'zbyva_predpoklad' => $zbyva_predpoklad,
            'zbyva_skutecne' => $zbyva_skutecne,
            'procento_rezervace' => $procento_rezervace,
            'procento_predpoklad' => $procento_predpoklad,
            'procento_skutecne' => $procento_skutecne,
            'pocet_zaznamu' => $meta['pocet_zaznamu'],
            'ma_navyseni' => $meta['ma_navyseni']
        ]);
        
        return [
            'success' => true,
            'lp_id' => $lp_id,
            'cislo_lp' => $meta['cislo_lp'],
            'data' => [
                'cislo_lp' => $meta['cislo_lp'],
                'kategorie' => $meta['kategorie'],
                'usek_id' => (int)$meta['usek_id'],
                'user_id' => (int)$meta['user_id'],
                'rok' => (int)$meta['rok'],
                'celkovy_limit' => (float)$celkovy_limit,
                
                'rezervovano' => (float)$rezervovano,
                'predpokladane_cerpani' => (float)$predpokladane_cerpani,
                'skutecne_cerpano' => (float)$skutecne_cerpano,
                'cerpano_pokladna' => (float)$cerpano_pokladna,
                
                'zbyva_rezervace' => (float)$zbyva_rezervace,
                'zbyva_predpoklad' => (float)$zbyva_predpoklad,
                'zbyva_skutecne' => (float)$zbyva_skutecne,
                
                'procento_rezervace' => (float)$procento_rezervace,
                'procento_predpoklad' => (float)$procento_predpoklad,
                'procento_skutecne' => (float)$procento_skutecne,
                
                'pocet_zaznamu' => (int)$meta['pocet_zaznamu'],
                'ma_navyseni' => (int)$meta['ma_navyseni'],
                'posledni_prepocet' => date('Y-m-d H:i:s')
            ]
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * Inicializace čerpání všech LP (admin funkce)
 * 
 * @param PDO $pdo Databázové spojení
 * @return array Result with stats
 */
function inicializaceVsechLP_PDO($pdo) {
    try {
        // Získat všechna unikátní LP podle ID
        $sql_lp_ids = "SELECT DISTINCT id FROM " . TBL_LP_MASTER . " ORDER BY id";
        $stmt = $pdo->query($sql_lp_ids);
        $lp_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $uspesne = 0;
        $chyby = 0;
        $errors = [];
        
        foreach ($lp_ids as $lp_id) {
            $result = prepocetCerpaniPodleIdLP_PDO($pdo, $lp_id);
            if ($result['success']) {
                $uspesne++;
            } else {
                $chyby++;
                $errors[] = "LP ID $lp_id: " . $result['error'];
            }
        }
        
        return [
            'success' => true,
            'zpracovano_celkem' => count($lp_ids),
            'uspesne' => $uspesne,
            'chyby' => $chyby,
            'error_details' => $errors
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * Získání stavu konkrétního LP
 * 
 * @param PDO $pdo Databázové spojení
 * @param int $lp_id ID LP
 * @return array LP data with stats
 */
function getStavLP_PDO($pdo, $lp_id) {
    try {
        $sql = "
            SELECT 
                c.*,
                u.jmeno as user_jmeno,
                u.prijmeni as user_prijmeni,
                us.nazev as usek_nazev
            FROM " . TBL_LP_CERPANI . " c
            LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = c.user_id
            LEFT JOIN " . TBL_USEKY . " us ON us.id = c.usek_id
            WHERE c.lp_id = :lp_id
            LIMIT 1
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['lp_id' => $lp_id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data) {
            return [
                'success' => false,
                'error' => "LP ID '$lp_id' nemá vypočítaná data čerpání"
            ];
        }
        
        return [
            'success' => true,
            'data' => $data
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * Získání čerpání LP podle uživatele
 * 
 * @param PDO $pdo Databázové spojení  
 * @param int $lp_id ID LP
 * @return array User consumption data
 */
function getCerpaniPodleUzivatele_PDO($pdo, $lp_id) {
    try {
        // Získat metadata LP
        $sql_meta = "
            SELECT cislo_lp, kategorie, usek_id, user_id, 
                   MIN(platne_od) as platne_od, MAX(platne_do) as platne_do
            FROM " . TBL_LP_MASTER . "
            WHERE id = :lp_id
            GROUP BY cislo_lp, kategorie, usek_id, user_id
            LIMIT 1
        ";
        
        $stmt = $pdo->prepare($sql_meta);
        $stmt->execute(['lp_id' => $lp_id]);
        $meta = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$meta) {
            return [
                'success' => false,
                'error' => "LP ID '$lp_id' neexistuje"
            ];
        }
        
        // TODO: Implement user-specific consumption logic
        // This is placeholder for the full implementation
        
        return [
            'success' => true,
            'lp_id' => $lp_id,
            'cislo_lp' => $meta['cislo_lp'],
            'users' => []
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'error' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * PDO VERZE: Získá agregované čerpání LP podle úseku (všechna LP + jejich uživatelé)
 * 
 * @param PDO $pdo Databázové spojení (PDO)
 * @param int $usek_id ID úseku
 * @param int|null $rok Rok (default aktuální rok)
 * @return array Agregované čerpání LP podle úseku
 */
function getCerpaniPodleUseku_PDO($pdo, $usek_id, $rok = null) {
    $usek_id = (int)$usek_id;
    $rok = $rok ? (int)$rok : (int)date('Y');
    
    try {
        // KROK 1: Získat informace o úseku
        $sql_usek = "
            SELECT id, usek_nazev
            FROM 25a_useky
            WHERE id = :usek_id
            LIMIT 1
        ";
        
        $stmt_usek = $pdo->prepare($sql_usek);
        $stmt_usek->execute([':usek_id' => $usek_id]);
        $usek_info = $stmt_usek->fetch(PDO::FETCH_ASSOC);
        
        if (!$usek_info) {
            return array(
                'status' => 'error',
                'message' => 'Úsek s tímto ID neexistuje'
            );
        }
        
        // KROK 2: Získat všechna LP pro tento úsek
        $sql_lp_list = "
            SELECT DISTINCT id, cislo_lp
            FROM 25_limitovane_prisliby
            WHERE usek_id = :usek_id
            AND YEAR(platne_od) = :rok
            ORDER BY cislo_lp
        ";
        
        $stmt_lp_list = $pdo->prepare($sql_lp_list);
        $stmt_lp_list->execute([':usek_id' => $usek_id, ':rok' => $rok]);
        $lp_list = $stmt_lp_list->fetchAll(PDO::FETCH_ASSOC);
        
        $lp_data = array();
        $celkovy_limit_usek = 0;
        $celkem_rezervovano_usek = 0;
        $celkem_predpoklad_usek = 0;
        $celkem_skutecne_usek = 0;
        $celkem_pokladna_usek = 0;
        $celkem_lp = 0;
        
        foreach ($lp_list as $lp_row) {
            $lp_id = (int)$lp_row['id'];
            
            // Pro každé LP získat detail čerpání podle uživatelů
            $lp_detail = getCerpaniPodleUzivatele_PDO($pdo, $lp_id);
            
            if ($lp_detail['success']) {
                $lp_data[] = array(
                    'lp_id' => $lp_id,
                    'cislo_lp' => $lp_detail['cislo_lp'],
                    'kategorie' => $lp_detail['kategorie'],
                    'celkovy_limit' => $lp_detail['celkovy_limit'],
                    'prikazce_user_id' => $lp_detail['prikazce_user_id'],
                    'prikazce_prijmeni' => $lp_detail['prikazce_prijmeni'],
                    'prikazce_jmeno' => $lp_detail['prikazce_jmeno'],
                    'cerpani_podle_uzivatelu' => $lp_detail['users'],
                    'cerpano_pokladna' => $lp_detail['cerpano_pokladna'],
                    'celkem' => array(
                        'rezervovano' => $lp_detail['celkem_rezervovano'],
                        'predpokladane_cerpani' => $lp_detail['celkem_predpoklad'],
                        'skutecne_cerpano' => $lp_detail['celkem_skutecne']
                    )
                );
                
                // Agregace za celý úsek
                $celkovy_limit_usek += $lp_detail['celkovy_limit'];
                $celkem_rezervovano_usek += $lp_detail['celkem_rezervovano'];
                $celkem_predpoklad_usek += $lp_detail['celkem_predpoklad'];
                $celkem_skutecne_usek += $lp_detail['celkem_skutecne'];
                $celkem_pokladna_usek += $lp_detail['cerpano_pokladna'];
                $celkem_lp++;
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
            return $b['rezervovano'] <=> $a['rezervovano'];
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
                'version' => 'v2.0',
                'timestamp' => date('Y-m-d H:i:s')
            )
        );
        
    } catch (PDOException $e) {
        return array(
            'status' => 'error',
            'message' => 'Database error: ' . $e->getMessage()
        );
    }
}


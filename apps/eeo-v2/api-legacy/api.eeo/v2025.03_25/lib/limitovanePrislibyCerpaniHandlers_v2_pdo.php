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

// Table constants
define('TBL_LP_MASTER_V2', '25_limitovane_prisliby');
define('TBL_LP_CERPANI_V2', '25_limitovane_prisliby_cerpani');
define('TBL_OBJEDNAVKY_V2', '25a_objednavky');
define('TBL_OBJEDNAVKY_POLOZKY_V2', '25a_objednavky_polozky');
define('TBL_POKLADNI_KNIHY_V2', '25a_pokladni_knihy');
define('TBL_POKLADNI_POLOZKY_V2', '25a_pokladni_polozky');
define('TBL_UZIVATELE_V2', '25_uzivatele');
define('TBL_USEKY_V2', '25_useky');

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
            FROM " . TBL_LP_MASTER_V2 . " lp
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
            FROM " . TBL_OBJEDNAVKY_V2 . " obj
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
                COALESCE(SUM(pol.cena_s_dph), 0) as suma_polozek
            FROM " . TBL_OBJEDNAVKY_V2 . " obj
            LEFT JOIN " . TBL_OBJEDNAVKY_POLOZKY_V2 . " pol ON pol.order_id = obj.id
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
                    $podil = $pocet_lp > 0 ? ((float)$row['suma_polozek'] / $pocet_lp) : 0;
                    $predpokladane_cerpani += $podil;
                }
            }
        }
        
        // KROK 4: SKUTEČNOST - Parsovat JSON a dělit SUM(castka_fakturovana)
        $sql_fakturovano = "
            SELECT 
                obj.id,
                obj.financovani,
                COALESCE(SUM(fakt.castka_fakturovana), 0) as suma_faktur
            FROM " . TBL_OBJEDNAVKY_V2 . " obj
            LEFT JOIN 25a_objednavky_faktury fakt ON fakt.objednavka_id = obj.id
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
        
        $skutecne_cerpano = 0;
        while ($row = $stmt_fakt->fetch(PDO::FETCH_ASSOC)) {
            $financovani = json_decode($row['financovani'], true);
            
            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                $lp_ids = $financovani['lp_kody'];
                $lp_ids_int = array_map('intval', $lp_ids);
                
                if (in_array($lp_id, $lp_ids_int)) {
                    $pocet_lp = count($lp_ids);
                    $podil = $pocet_lp > 0 ? ((float)$row['suma_faktur'] / $pocet_lp) : 0;
                    $skutecne_cerpano += $podil;
                }
            }
        }
        
        // KROK 5: POKLADNA - čerpání z pokladny
        $sql_pokladna = "
            SELECT COALESCE(SUM(pp.castka), 0) as suma_pokladna
            FROM " . TBL_POKLADNI_KNIHY_V2 . " pk
            JOIN " . TBL_POKLADNI_POLOZKY_V2 . " pp ON pp.pokladni_kniha_id = pk.id
            WHERE pk.uzivatel_id = :user_id
            AND pp.lp_kod = :cislo_lp
            AND YEAR(pp.datum_transakce) = :rok
        ";
        
        $stmt_pokl = $pdo->prepare($sql_pokladna);
        $stmt_pokl->execute([
            'user_id' => $meta['user_id'],
            'cislo_lp' => $meta['cislo_lp'],
            'rok' => $meta['rok']
        ]);
        
        $row_pokl = $stmt_pokl->fetch(PDO::FETCH_ASSOC);
        $cerpano_pokladna = (float)($row_pokl['suma_pokladna'] ?? 0);
        
        // KROK 6: UPSERT do čerpání tabulky
        $zbyvajici = $meta['celkovy_limit'] - $rezervovano;
        $zbyvajici_pred = $meta['celkovy_limit'] - $predpokladane_cerpani;
        $zbyvajici_skut = $meta['celkovy_limit'] - $skutecne_cerpano - $cerpano_pokladna;
        
        $sql_upsert = "
            INSERT INTO " . TBL_LP_CERPANI_V2 . " (
                lp_id, cislo_lp, usek_id, user_id, kategorie, rok,
                celkovy_limit, rezervovano, zbyvajici,
                predpokladane_cerpani, zbyvajici_pred,
                skutecne_cerpano, cerpano_pokladna, zbyvajici_skut,
                ma_navyseni, pocet_zaznamu_master,
                dt_aktualizace
            ) VALUES (
                :lp_id, :cislo_lp, :usek_id, :user_id, :kategorie, :rok,
                :celkovy_limit, :rezervovano, :zbyvajici,
                :predpokladane_cerpani, :zbyvajici_pred,
                :skutecne_cerpano, :cerpano_pokladna, :zbyvajici_skut,
                :ma_navyseni, :pocet_zaznamu_master,
                NOW()
            )
            ON DUPLICATE KEY UPDATE
                celkovy_limit = VALUES(celkovy_limit),
                rezervovano = VALUES(rezervovano),
                zbyvajici = VALUES(zbyvajici),
                predpokladane_cerpani = VALUES(predpokladane_cerpani),
                zbyvajici_pred = VALUES(zbyvajici_pred),
                skutecne_cerpano = VALUES(skutecne_cerpano),
                cerpano_pokladna = VALUES(cerpano_pokladna),
                zbyvajici_skut = VALUES(zbyvajici_skut),
                ma_navyseni = VALUES(ma_navyseni),
                pocet_zaznamu_master = VALUES(pocet_zaznamu_master),
                dt_aktualizace = NOW()
        ";
        
        $stmt_upsert = $pdo->prepare($sql_upsert);
        $stmt_upsert->execute([
            'lp_id' => $lp_id,
            'cislo_lp' => $meta['cislo_lp'],
            'usek_id' => $meta['usek_id'],
            'user_id' => $meta['user_id'],
            'kategorie' => $meta['kategorie'],
            'rok' => $meta['rok'],
            'celkovy_limit' => $meta['celkovy_limit'],
            'rezervovano' => $rezervovano,
            'zbyvajici' => $zbyvajici,
            'predpokladane_cerpani' => $predpokladane_cerpani,
            'zbyvajici_pred' => $zbyvajici_pred,
            'skutecne_cerpano' => $skutecne_cerpano,
            'cerpano_pokladna' => $cerpano_pokladna,
            'zbyvajici_skut' => $zbyvajici_skut,
            'ma_navyseni' => $meta['ma_navyseni'],
            'pocet_zaznamu_master' => $meta['pocet_zaznamu']
        ]);
        
        return [
            'success' => true,
            'lp_id' => $lp_id,
            'cislo_lp' => $meta['cislo_lp'],
            'data' => [
                'celkovy_limit' => $meta['celkovy_limit'],
                'rezervovano' => $rezervovano,
                'zbyvajici' => $zbyvajici,
                'predpokladane_cerpani' => $predpokladane_cerpani,
                'zbyvajici_pred' => $zbyvajici_pred,
                'skutecne_cerpano' => $skutecne_cerpano,
                'cerpano_pokladna' => $cerpano_pokladna,
                'zbyvajici_skut' => $zbyvajici_skut
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
        $sql_lp_ids = "SELECT DISTINCT id FROM " . TBL_LP_MASTER_V2 . " ORDER BY id";
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
            FROM " . TBL_LP_CERPANI_V2 . " c
            LEFT JOIN " . TBL_UZIVATELE_V2 . " u ON u.id = c.user_id
            LEFT JOIN " . TBL_USEKY_V2 . " us ON us.id = c.usek_id
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
            FROM " . TBL_LP_MASTER_V2 . "
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

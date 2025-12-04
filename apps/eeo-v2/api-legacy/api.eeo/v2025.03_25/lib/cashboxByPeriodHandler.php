<?php
/**
 * cashboxByPeriodHandler.php
 * Endpoint pro filtrování pokladen podle měsíce/roku
 * Vrátí jen pokladny, které mají vytvořenou knihu v daném období
 * PHP 5.6 kompatibilní
 */

/**
 * POST /cashbox-list-by-period
 * Vrátí seznam všech pokladen, které mají vytvořenou knihu v daném měsíci a roce
 * 
 * Parametry:
 * - rok (int, povinné) - Rok (např. 2025)
 * - mesic (int, povinné) - Měsíc 1-12
 * - active_only (bool, volitelné, default: true) - Jen aktivní pokladny
 * - include_users (bool, volitelné, default: false) - Zahrnout info o uživatelích
 */
function handle_cashbox_list_by_period_post($config, $input) {
    try {
        // Autentizace
        if (empty($input['username']) || empty($input['token'])) {
            return api_error(401, 'Chybí username nebo token');
        }
        
        $db = get_db($config);
        $userData = verify_token_v2($input['username'], $input['token'], $db);
        
        if (!$userData) {
            return api_error(401, 'Neplatný token');
        }
        
        // Validace parametrů
        if (!isset($input['rok']) || !isset($input['mesic'])) {
            return api_error(400, 'Chybí povinné parametry: rok a mesic');
        }
        
        $rok = intval($input['rok']);
        $mesic = intval($input['mesic']);
        
        if ($mesic < 1 || $mesic > 12) {
            return api_error(400, 'Neplatný měsíc (musí být 1-12)');
        }
        
        if ($rok < 2000 || $rok > 2100) {
            return api_error(400, 'Neplatný rok (musí být mezi 2000-2100)');
        }
        
        // Volitelné parametry
        $activeOnly = isset($input['active_only']) ? (bool)$input['active_only'] : true;
        $includeUsers = isset($input['include_users']) ? (bool)$input['include_users'] : false;
        
        // Měsíce v češtině
        $mesice = array(
            1 => 'leden', 2 => 'únor', 3 => 'březen', 4 => 'duben',
            5 => 'květen', 6 => 'červen', 7 => 'červenec', 8 => 'srpen',
            9 => 'září', 10 => 'říjen', 11 => 'listopad', 12 => 'prosinec'
        );
        
        // Sestavit SQL dotaz
        if ($includeUsers) {
            $sql = "
                SELECT DISTINCT
                  p.id,
                  p.nazev,
                  p.kod_pracoviste,
                  p.nazev_pracoviste,
                  p.ciselna_rada_vpd,
                  p.vpd_od_cislo,
                  p.ciselna_rada_ppd,
                  p.ppd_od_cislo,
                  p.poznamka,
                  p.aktivni,
                  pk.cislo_pokladny,
                  pk.rok,
                  pk.mesic,
                  pk.stav_knihy,
                  pk.koncovy_stav,
                  pk.pocet_zaznamu,
                  pu.id AS prirazeni_id,
                  pu.uzivatel_id,
                  u.jmeno AS uzivatel_jmeno,
                  u.prijmeni AS uzivatel_prijmeni,
                  CONCAT(u.jmeno, ' ', u.prijmeni) AS uzivatel_cele_jmeno
                FROM 25a_pokladny p
                INNER JOIN 25a_pokladni_knihy pk 
                  ON pk.pokladna_id = p.id
                LEFT JOIN 25a_pokladny_uzivatele pu 
                  ON pu.pokladna_id = p.id 
                  AND pu.je_hlavni = 1
                  AND (pu.platne_do IS NULL OR pu.platne_do >= CURDATE())
                LEFT JOIN 25_uzivatele u 
                  ON u.id = pu.uzivatel_id
                WHERE pk.rok = ?
                  AND pk.mesic = ?
            ";
        } else {
            $sql = "
                SELECT DISTINCT
                  p.id,
                  p.nazev,
                  p.kod_pracoviste,
                  p.nazev_pracoviste,
                  p.ciselna_rada_vpd,
                  p.vpd_od_cislo,
                  p.ciselna_rada_ppd,
                  p.ppd_od_cislo,
                  p.poznamka,
                  p.aktivni,
                  pk.cislo_pokladny,
                  pk.rok,
                  pk.mesic,
                  pk.stav_knihy,
                  pk.koncovy_stav,
                  pk.pocet_zaznamu
                FROM 25a_pokladny p
                INNER JOIN 25a_pokladni_knihy pk 
                  ON pk.pokladna_id = p.id
                WHERE pk.rok = ?
                  AND pk.mesic = ?
            ";
        }
        
        // Přidat podmínku pro aktivní pokladny
        if ($activeOnly) {
            $sql .= " AND p.aktivni = 1";
        }
        
        $sql .= " ORDER BY p.id ASC";
        
        // Vykonat dotaz
        $stmt = $db->prepare($sql);
        $stmt->execute(array($rok, $mesic));
        $pokladny = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Formátovat výsledek
        $response = array(
            'pokladny' => $pokladny,
            'count' => count($pokladny),
            'period' => array(
                'rok' => $rok,
                'mesic' => $mesic,
                'mesic_nazev' => $mesice[$mesic]
            )
        );
        
        // Přidat message pokud je prázdný
        if (count($pokladny) === 0) {
            $response['message'] = 'V daném měsíci nejsou žádné pokladny';
        }
        
        return api_ok($response);
        
    } catch (Exception $e) {
        error_log("handle_cashbox_list_by_period_post error: " . $e->getMessage());
        return api_error(500, 'Interní chyba serveru: ' . $e->getMessage());
    }
}

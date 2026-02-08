<?php
/**
 * LP (Limitované příslíby) Handlers
 * 
 * Endpointy pro práci s limitovanými příslíby
 * Datum: 8. února 2026
 */

/**
 * GET lp/list
 * Načte seznam všech aktivních limitovaných příslibů
 * 
 * REQUEST BODY:
 * {
 *   "token": "xxx",
 *   "username": "user@domain.cz"
 * }
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "data": [
 *     {
 *       "id": 1,
 *       "cislo_lp": "LPIT1",
 *       "nazev_uctu": "IT Projekt 2026",
 *       "limit_celkem": "1500000.00",
 *       "rezervovano": "50000.00",
 *       "predpoklad": "120000.00",
 *       "fakturovano": "80000.00",
 *       "pokladna": "10000.00",
 *       "cerpano_celkem": "260000.00"
 *     },
 *     ...
 *   ]
 * }
 */
function handle_lp_list($input, $config) {
    // 1. Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // 2. Autentizace
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    try {
        // 3. Připojení k DB
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        TimezoneHelper::setMysqlTimezone($db);

        // 4. Načíst seznam aktivních LP (platnost zasahuje do aktuálního roku - průnik intervalů)
        // + agregované čerpání (plánováno + rezervováno + fakturováno + pokladna)
        $current_year = date('Y');
        $year_start = $current_year . '-01-01';
        $year_end = $current_year . '-12-31';
        
        $sql = "
            SELECT 
                lp.id,
                lp.cislo_lp,
                lp.nazev_uctu,
                lp.vyse_financniho_kryti as limit_celkem,
                COALESCE(c.rezervovano, 0) as rezervovano,
                COALESCE(c.predpokladane_cerpani, 0) as predpoklad,
                COALESCE(c.skutecne_cerpano, 0) as fakturovano,
                COALESCE(c.cerpano_pokladna, 0) as pokladna,
                (COALESCE(c.rezervovano, 0) + COALESCE(c.predpokladane_cerpani, 0) + COALESCE(c.skutecne_cerpano, 0) + COALESCE(c.cerpano_pokladna, 0)) as cerpano_celkem,
                u.usek_zkr,
                u.usek_nazev
            FROM " . TBL_LIMITOVANE_PRISLIBY . " lp
            LEFT JOIN " . TBL_LP_CERPANI . " c ON c.cislo_lp = lp.cislo_lp AND c.rok = :current_year
            LEFT JOIN " . TBL_USEKY . " u ON lp.usek_id = u.id
            WHERE lp.platne_od <= :year_end 
            AND lp.platne_do >= :year_start
            ORDER BY lp.cislo_lp ASC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':current_year' => (int)$current_year,
            ':year_start' => $year_start,
            ':year_end' => $year_end
        ]);
        $lp_list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 5. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $lp_list,
            'count' => count($lp_list),
            'message' => 'Seznam LP načten úspěšně'
        ));

    } catch (Exception $e) {
        error_log("[LP List] Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání LP: ' . $e->getMessage()
        ));
    }
}

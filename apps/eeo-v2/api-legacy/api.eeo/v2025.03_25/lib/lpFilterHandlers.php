<?php
/**
 * Limitované přísliby - Filtrování LP podle druhu objednávky
 *
 * Endpoint: POST /api.eeo/limitovane-prisliby/filter-by-druh-objednavky
 *
 * Vstup:
 *   - token, username (povinné)
 *   - druh_objednavky_kody: array (povinné, např. ["AUTA","BTK"])
 *   - rok: int (volitelně, default aktuální rok)
 *   - requesting_user_id: int (volitelně, pro filtrování jen objednávek uživatele)
 *
 * Výstup (stejný formát jako fulltext-search pro snadné použití na FE):
 *   {
 *     status: 'success',
 *     data: {
 *       matching_lp_ids: [int, int, ...],
 *       matched_orders_by_lp: { "lp_master_id": [order_id, ...] },
 *       all_orders_by_lp: { "lp_master_id": [order_id, ...] }
 *     },
 *     meta: { rok, count_lp, count_orders }
 *   }
 *
 * Logika:
 * - Najde objednávky které mají druh_objednavky_kod.kod_stavu v zadaném seznamu
 * - Z financovani.lp_kody vytáhne lp_master_id
 * - Vrátí mapu LP → seznam objednávek
 */

if (!function_exists('handle_lp_filter_by_druh_objednavky')) {
function handle_lp_filter_by_druh_objednavky($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    $auth = verify_token_v2($username, $token);
    if (!$auth) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Nepřihlášen']);
        return;
    }

    $druh_kody = isset($input['druh_objednavky_kody']) && is_array($input['druh_objednavky_kody'])
        ? array_values(array_filter(array_map('strval', $input['druh_objednavky_kody']), function ($s) { return $s !== ''; }))
        : [];
    $rok = isset($input['rok']) ? (int)$input['rok'] : (int)date('Y');
    $requesting_user_id = isset($input['requesting_user_id']) ? (int)$input['requesting_user_id'] : null;

    if (empty($druh_kody)) {
        echo json_encode([
            'status' => 'success',
            'data' => [
                'matching_lp_ids' => [],
                'matched_orders_by_lp' => (object)[],
                'all_orders_by_lp' => (object)[]
            ],
            'meta' => [
                'rok' => $rok,
                'count_lp' => 0,
                'count_orders' => 0
            ]
        ]);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) throw new Exception('Chyba připojení k databázi');
        if (class_exists('TimezoneHelper')) {
            TimezoneHelper::setMysqlTimezone($db);
        }

        // Najdi objednávky které mají druh_objednavky_kod.kod_stavu v zadaném seznamu
        // a které mají financovani.lp_kody (tj. čerpají z LP)
        $kod_placeholders = implode(',', array_fill(0, count($druh_kody), '?'));

        $user_condition = '';
        $user_params = [];
        if ($requesting_user_id) {
            $user_condition = ' AND (o.uzivatel_id = ? OR o.garant_uzivatel_id = ? OR o.prikazce_id = ? OR o.schvalovatel_id = ?)';
            $user_params = [$requesting_user_id, $requesting_user_id, $requesting_user_id, $requesting_user_id];
        }

        // Načíst objednávky s druh_objednavky_kod a financovani
        // druh_objednavky_kod je JSON string ve tvaru {"kod_stavu":"AUTA","nazev_stavu":"Auta"}
        $sql = "
            SELECT 
                o.id,
                o.druh_objednavky_kod,
                o.financovani
            FROM " . TBL_OBJEDNAVKY . " o
            WHERE o.aktivni = 1
              AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
              AND o.druh_objednavky_kod IS NOT NULL
              AND o.financovani IS NOT NULL
              AND JSON_UNQUOTE(JSON_EXTRACT(o.druh_objednavky_kod, '$.kod_stavu')) IN ($kod_placeholders)
              AND YEAR(o.dt_vytvoreni) = ?
              $user_condition
        ";

        $params = array_merge($druh_kody, [$rok], $user_params);
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        error_log("🔍 [LP-FILTER-DRUH] druh_kody=" . json_encode($druh_kody) . ", rok=$rok, počet_objednavek=" . count($orders));

        // Mapa lp_master_id -> [order_ids]
        $matched_orders_by_lp = [];

        foreach ($orders as $ord) {
            $oid = (int)$ord['id'];
            $financovani = json_decode($ord['financovani'], true);
            if (!$financovani || empty($financovani['lp_kody']) || !is_array($financovani['lp_kody'])) {
                continue;
            }
            foreach ($financovani['lp_kody'] as $lp_id) {
                $lp_id_int = (int)$lp_id;
                if ($lp_id_int <= 0) continue;
                if (!isset($matched_orders_by_lp[$lp_id_int])) {
                    $matched_orders_by_lp[$lp_id_int] = [];
                }
                $matched_orders_by_lp[$lp_id_int][] = $oid;
            }
        }

        // ⚠️ DŮLEŽITÉ: lp_master_id z financovani.lp_kody odkazuje na 25_limitovane_prisliby
        // ale FE pracuje s lp_master_id z 25_limitovane_prisliby_cerpani (cislo_lp)
        // Potřebujeme rozšířit matching_lp_ids o všechny master_ids pro stejný cislo_lp
        // (kvůli navýšení LP - více záznamů se stejným cislo_lp)
        $matching_lp_ids = array_keys($matched_orders_by_lp);
        $cerpani_ids = [];

        if (!empty($matching_lp_ids)) {
            // Najdi cislo_lp pro každé master_id
            $master_placeholders = implode(',', array_fill(0, count($matching_lp_ids), '?'));
            $sql_cislo = "SELECT id, cislo_lp FROM " . TBL_LP_MASTER . " WHERE id IN ($master_placeholders)";
            $stmt_cislo = $db->prepare($sql_cislo);
            $stmt_cislo->execute($matching_lp_ids);
            $master_to_cislo = [];
            $cisla_lp = [];
            foreach ($stmt_cislo->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $master_to_cislo[(int)$row['id']] = $row['cislo_lp'];
                $cisla_lp[$row['cislo_lp']] = true;
            }

            // Najdi cerpani ID pro tyto cislo_lp a daný rok
            // FE používá cerpani.id jako lp_master_id v expand key
            if (!empty($cisla_lp)) {
                $cisla_list = array_keys($cisla_lp);
                $cisla_ph = implode(',', array_fill(0, count($cisla_list), '?'));
                $sql_cerpani = "SELECT id, cislo_lp FROM " . TBL_LP_CERPANI . " WHERE cislo_lp IN ($cisla_ph) AND rok = ?";
                $params_cerpani = array_merge($cisla_list, [$rok]);
                $stmt_cerpani = $db->prepare($sql_cerpani);
                $stmt_cerpani->execute($params_cerpani);
                foreach ($stmt_cerpani->fetchAll(PDO::FETCH_ASSOC) as $row) {
                    $cerpani_ids[] = (int)$row['id'];
                    // Pro cerpani id, použij stejné objednávky jako pro master_id (přes cislo_lp)
                    $cislo = $row['cislo_lp'];
                    $cerpani_id = (int)$row['id'];
                    if (!isset($matched_orders_by_lp[$cerpani_id])) {
                        $matched_orders_by_lp[$cerpani_id] = [];
                    }
                    // Najdi všechna master_ids se stejným cislo_lp a zkopíruj jejich objednávky
                    foreach ($master_to_cislo as $mid => $cislo_m) {
                        if ($cislo_m === $cislo && isset($matched_orders_by_lp[$mid])) {
                            $matched_orders_by_lp[$cerpani_id] = array_unique(array_merge(
                                $matched_orders_by_lp[$cerpani_id],
                                $matched_orders_by_lp[$mid]
                            ));
                        }
                    }
                }
            }
        }

        // Sjednoť matching_lp_ids - master IDs + cerpani IDs
        $matching_lp_ids = array_values(array_unique(array_merge($matching_lp_ids, $cerpani_ids)));

        // Deduplicate order IDs v matched_orders_by_lp
        $matched_orders_by_lp_clean = [];
        $total_orders = 0;
        foreach ($matched_orders_by_lp as $lp_id => $order_ids) {
            $unique = array_values(array_unique(array_map('intval', $order_ids)));
            $matched_orders_by_lp_clean[(string)$lp_id] = $unique;
            $total_orders += count($unique);
        }

        echo json_encode([
            'status' => 'success',
            'data' => [
                'matching_lp_ids' => array_values(array_map('intval', $matching_lp_ids)),
                'matched_orders_by_lp' => empty($matched_orders_by_lp_clean) ? (object)[] : $matched_orders_by_lp_clean,
                'all_orders_by_lp' => empty($matched_orders_by_lp_clean) ? (object)[] : $matched_orders_by_lp_clean
            ],
            'meta' => [
                'rok' => $rok,
                'druh_kody' => $druh_kody,
                'count_lp' => count($matching_lp_ids),
                'count_orders' => $total_orders
            ]
        ]);

    } catch (Exception $e) {
        error_log("[LP Filter Druh Objednavky] Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}
}

<?php
/**
 * Reports Handlers - Order V2 API
 * 
 * Handlery pro reporty a analýzy objednávek.
 * 
 * Endpoints:
 * - POST /reports/urgent-payments - Report faktur s blížící se splatností
 * 
 * @author Backend Developer
 * @date 27. listopadu 2025
 */

/**
 * POST /reports/urgent-payments
 * Report "Urgentní platby" - faktury s blížící se splatností
 * 
 * Request body:
 * {
 *   "pocet_dni": 5,              // Počet dní do splatnosti (výchozí: 5)
 *   "datum_od": "2025-01-01",    // VOLITELNÉ - období vytvoření objednávky od
 *   "datum_do": "2025-12-31",    // VOLITELNÉ - období vytvoření objednávky do
 *   "utvar": "ZZS",              // VOLITELNÉ - filtr podle útvaru
 *   "dodavatel": "ABC s.r.o.",   // VOLITELNÉ - filtr podle názvu dodavatele (LIKE)
 *   "limit": 100,                // VOLITELNÉ - max počet výsledků (výchozí: 100)
 *   "offset": 0                  // VOLITELNÉ - pro stránkování (výchozí: 0)
 * }
 */
function handle_report_urgent_payments($input, $config, $queries) {
    // Ověření tokenu
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array(
            'success' => false,
            'error' => array(
                'code' => 'UNAUTHORIZED',
                'message' => 'Neplatný nebo chybějící token'
            )
        ));
        return;
    }
    
    $current_user = $auth_result;
    $current_user_id = $current_user['id'];
    
    // Kontrola oprávnění - pouze ADMIN, NAKUP, UCTARNA, VEDENI
    $allowed_roles = array('ADMIN', 'NAKUP', 'UCTARNA', 'VEDENI', 'SUPERADMIN', 'ADMINISTRATOR');
    $user_roles = get_user_roles($current_user_id, $config);
    
    $has_permission = false;
    foreach ($user_roles as $role) {
        if (in_array(strtoupper($role), $allowed_roles)) {
            $has_permission = true;
            break;
        }
    }
    
    if (!$has_permission) {
        http_response_code(403);
        echo json_encode(array(
            'success' => false,
            'error' => array(
                'code' => 'FORBIDDEN',
                'message' => 'Nemáte oprávnění pro přístup k tomuto reportu'
            )
        ));
        return;
    }
    
    // Načtení a validace parametrů
    $pocet_dni = isset($input['pocet_dni']) ? $input['pocet_dni'] : 5;
    $datum_od = isset($input['datum_od']) ? $input['datum_od'] : null;
    $datum_do = isset($input['datum_do']) ? $input['datum_do'] : null;
    $utvar = isset($input['utvar']) ? $input['utvar'] : null;
    $dodavatel = isset($input['dodavatel']) ? $input['dodavatel'] : null;
    $limit = isset($input['limit']) ? $input['limit'] : 100;
    $offset = isset($input['offset']) ? $input['offset'] : 0;
    
    // Validace pocet_dni
    if (!is_null($pocet_dni)) {
        if (!is_numeric($pocet_dni) || $pocet_dni < 1 || $pocet_dni > 90) {
            http_response_code(400);
            echo json_encode(array(
                'success' => false,
                'error' => array(
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Parametr pocet_dni musí být číslo mezi 1 a 90'
                )
            ));
            return;
        }
        $pocet_dni = (int)$pocet_dni;
    }
    
    // Validace datum_od
    if (!is_null($datum_od) && !empty($datum_od)) {
        if (!strtotime($datum_od)) {
            http_response_code(400);
            echo json_encode(array(
                'success' => false,
                'error' => array(
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Parametr datum_od musí být platné datum (YYYY-MM-DD)'
                )
            ));
            return;
        }
    } else {
        $datum_od = null;
    }
    
    // Validace datum_do
    if (!is_null($datum_do) && !empty($datum_do)) {
        if (!strtotime($datum_do)) {
            http_response_code(400);
            echo json_encode(array(
                'success' => false,
                'error' => array(
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Parametr datum_do musí být platné datum (YYYY-MM-DD)'
                )
            ));
            return;
        }
    } else {
        $datum_do = null;
    }
    
    // Validace limit
    if (!is_numeric($limit) || $limit < 1 || $limit > 500) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => array(
                'code' => 'VALIDATION_ERROR',
                'message' => 'Parametr limit musí být číslo mezi 1 a 500'
            )
        ));
        return;
    }
    $limit = (int)$limit;
    
    // Validace offset
    if (!is_numeric($offset) || $offset < 0) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => array(
                'code' => 'VALIDATION_ERROR',
                'message' => 'Parametr offset musí být nezáporné číslo'
            )
        ));
        return;
    }
    $offset = (int)$offset;
    
    // Pokud user NENÍ admin, filtrovat pouze podle jeho útvaru
    $is_admin = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles) || in_array('ADMIN', $user_roles);
    if (!$is_admin && isset($current_user['utvar'])) {
        $utvar = $current_user['utvar'];
    }
    
    // Připojení k DB
    $db = get_db($config);
    if (!$db) {
        http_response_code(500);
        echo json_encode(array(
            'success' => false,
            'error' => array(
                'code' => 'DB_ERROR',
                'message' => 'Chyba připojení k databázi'
            )
        ));
        return;
    }
    
    try {
        // Sestavení SQL dotazu s JOINem na faktury
        $sql = "
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.dodavatel_nazev,
                o.dodavatel_ico,
                f.fa_cislo_vema as fa_cislo,
                f.fa_datum_vystaveni,
                f.fa_datum_splatnosti,
                DATEDIFF(f.fa_datum_splatnosti, CURDATE()) as dnu_do_splatnosti,
                f.fa_castka as fakturovana_cena_bez_dph,
                f.fa_castka_celkem as fakturovana_cena_s_dph,
                o.mena,
                o.utvar,
                o.oddeleni,
                o.dt_vytvoreni as datum_vytvoreni,
                o.vytvoril_uzivatel,
                o.stav_workflow_nazev as stav
            FROM 25a_objednavky o
            INNER JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id
            WHERE 
                -- Pouze aktivní objednávky
                o.aktivni = 1
                
                -- Pouze aktivní faktury
                AND f.aktivni = 1
                
                -- Pouze NEZAPLACENÉ faktury
                AND (f.fa_zaplaceno = 0 OR f.fa_zaplaceno IS NULL)
                
                -- Faktura musí existovat
                AND f.fa_datum_splatnosti IS NOT NULL
                
                -- Splatnost je do X dní od dneška
                AND f.fa_datum_splatnosti BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ";
        
        $params = array($pocet_dni);
        $types = 'i';
        
        // VOLITELNÉ FILTRY
        
        // Filtr podle období vytvoření objednávky
        if (!is_null($datum_od)) {
            $sql .= " AND o.dt_vytvoreni >= ?";
            $params[] = $datum_od;
            $types .= 's';
        }
        
        if (!is_null($datum_do)) {
            $sql .= " AND o.dt_vytvoreni <= ?";
            $params[] = $datum_do . ' 23:59:59';
            $types .= 's';
        }
        
        // Filtr podle útvaru
        if (!is_null($utvar) && !empty($utvar)) {
            $sql .= " AND o.utvar = ?";
            $params[] = $utvar;
            $types .= 's';
        }
        
        // Filtr podle dodavatele (LIKE)
        if (!is_null($dodavatel) && !empty($dodavatel)) {
            $sql .= " AND o.dodavatel_nazev LIKE ?";
            $params[] = '%' . $dodavatel . '%';
            $types .= 's';
        }
        
        // Řazení
        $sql .= "
            ORDER BY 
                f.fa_datum_splatnosti ASC,
                f.fa_castka_celkem DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $limit;
        $params[] = $offset;
        $types .= 'ii';
        
        // Příprava a provedení dotazu - PDO style
        $stmt = $db->prepare($sql);
        if (!$stmt) {
            throw new Exception('Chyba přípravy SQL dotazu');
        }
        
        // Execute s parametry - PDO automaticky binduje
        $stmt->execute($params);
        
        // Fetch all results
        $data = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $data[] = array(
                'id' => $row['id'],
                'cislo_objednavky' => $row['cislo_objednavky'],
                'dodavatel_nazev' => $row['dodavatel_nazev'],
                'dodavatel_ico' => $row['dodavatel_ico'],
                'fa_cislo' => $row['fa_cislo'],
                'fa_datum_vystaveni' => $row['fa_datum_vystaveni'],
                'fa_datum_splatnosti' => $row['fa_datum_splatnosti'],
                'dnu_do_splatnosti' => (int)$row['dnu_do_splatnosti'],
                'fakturovana_cena_bez_dph' => $row['fakturovana_cena_bez_dph'] ? (float)$row['fakturovana_cena_bez_dph'] : 0.0,
                'fakturovana_cena_s_dph' => $row['fakturovana_cena_s_dph'] ? (float)$row['fakturovana_cena_s_dph'] : 0.0,
                'mena' => $row['mena'],
                'utvar' => $row['utvar'],
                'oddeleni' => $row['oddeleni'],
                'datum_vytvoreni' => $row['datum_vytvoreni'],
                'vytvoril_uzivatel' => $row['vytvoril_uzivatel'],
                'stav' => $row['stav']
            );
        }
        
        // Summary SQL - stejné filtry
        $sql_summary = "
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(f.fa_castka), 0) as total_amount_bez_dph,
                COALESCE(SUM(f.fa_castka_celkem), 0) as total_amount_s_dph,
                MIN(f.fa_datum_splatnosti) as earliest_due_date,
                MAX(f.fa_datum_splatnosti) as latest_due_date
            FROM 25a_objednavky o
            INNER JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id
            WHERE 
                o.aktivni = 1
                AND f.aktivni = 1
                AND (f.fa_zaplaceno = 0 OR f.fa_zaplaceno IS NULL)
                AND f.fa_datum_splatnosti IS NOT NULL
                AND f.fa_datum_splatnosti BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ";
        
        $params_summary = array($pocet_dni);
        $types_summary = 'i';
        
        if (!is_null($datum_od)) {
            $sql_summary .= " AND o.dt_vytvoreni >= ?";
            $params_summary[] = $datum_od;
            $types_summary .= 's';
        }
        
        if (!is_null($datum_do)) {
            $sql_summary .= " AND o.dt_vytvoreni <= ?";
            $params_summary[] = $datum_do . ' 23:59:59';
            $types_summary .= 's';
        }
        
        if (!is_null($utvar) && !empty($utvar)) {
            $sql_summary .= " AND o.utvar = ?";
            $params_summary[] = $utvar;
            $types_summary .= 's';
        }
        
        if (!is_null($dodavatel) && !empty($dodavatel)) {
            $sql_summary .= " AND o.dodavatel_nazev LIKE ?";
            $params_summary[] = '%' . $dodavatel . '%';
            $types_summary .= 's';
        }
        
        $stmt_summary = $db->prepare($sql_summary);
        if (!$stmt_summary) {
            throw new Exception('Chyba přípravy summary SQL');
        }
        
        // Execute s parametry - PDO automaticky binduje
        $stmt_summary->execute($params_summary);
        
        // Fetch summary results
        $summary_row = $stmt_summary->fetch(PDO::FETCH_ASSOC);
        
        $summary = array(
            'total_count' => (int)$summary_row['total_count'],
            'total_amount_bez_dph' => (float)$summary_row['total_amount_bez_dph'],
            'total_amount_s_dph' => (float)$summary_row['total_amount_s_dph'],
            'earliest_due_date' => $summary_row['earliest_due_date'],
            'latest_due_date' => $summary_row['latest_due_date']
        );
        
        // Odpověď
        $response = array(
            'success' => true,
            'data' => $data,
            'summary' => $summary,
            'filters_applied' => array(
                'pocet_dni' => $pocet_dni,
                'datum_od' => $datum_od,
                'datum_do' => $datum_do,
                'utvar' => $utvar,
                'dodavatel' => $dodavatel
            )
        );
        
        http_response_code(200);
        echo json_encode($response);
        
    } catch (Exception $e) {
        error_log("Report Urgent Payments Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'success' => false,
            'error' => array(
                'code' => 'SERVER_ERROR',
                'message' => 'Chyba při generování reportu: ' . $e->getMessage()
            )
        ));
    }
    // PDO automaticky uzavře spojení
}

/**
 * Získá role uživatele z databáze
 * @param int $user_id ID uživatele
 * @param array $config DB konfigurace
 * @return array Pole rolí
 */
function get_user_roles($user_id, $config) {
    $db = get_db($config);
    if (!$db) {
        return array();
    }
    
    $sql = "SELECT role FROM " . TBL_UZIVATELE . " WHERE id = ? AND aktivni = 1";
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        return array();
    }
    
    $stmt->execute(array($user_id));
    
    $roles = array();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && !empty($row['role'])) {
        // Role mohou být oddělené čárkou nebo středníkem
        $roles = preg_split('/[,;]+/', $row['role']);
        $roles = array_map('trim', $roles);
        $roles = array_map('strtoupper', $roles);
    }
    
    // PDO automaticky uzavře spojení
    return $roles;
}

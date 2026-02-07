<?php
/**
 * Order V3 API Handlers - REFACTORED VERSION
 * 
 * 🎯 PODLE ORDERS25LIST VZORU - ZJEDNODUŠENÍ!
 * 
 * ✅ ZMĚNY:
 * - Jednodušší SQL queries (bez overcomplexity)
 * - Backend paging/streaming jako Order25List
 * - Stejná permission logika jako Orders25List
 * - Odstranění zbytečného mappingu
 * - Fokus na rychlost a čitelnost
 * 
 * 📅 Refactored: 2026-02-07
 */

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/hierarchyOrderFilters.php';

// Import Order V2 permissions functions for compatibility
if (file_exists(__DIR__ . '/orderV2Endpoints.php')) {
    require_once __DIR__ . '/orderV2Endpoints.php';
}

/**
 * 🎯 HELPER: Vypočítá datový rozsah podle období
 */
function calculatePeriodRange($period) {
    $today = date('Y-m-d');
    
    switch ($period) {
        case 'current-month':
            return ['date_from' => date('Y-m-01'), 'date_to' => $today];
        case 'last-month':
            return ['date_from' => date('Y-m-d', strtotime('-30 days')), 'date_to' => $today];
        case 'last-quarter':
            return ['date_from' => date('Y-m-d', strtotime('-90 days')), 'date_to' => $today];
        case 'all-months':
            return ['date_from' => date('Y') . '-01-01', 'date_to' => date('Y') . '-12-31'];
        case 'all':
        default:
            return null; // Bez omezení
    }
}

/**
 * 🎯 HELPER: Parsuje operátor a hodnotu (>=10000, >10000, =10000)
 */
function parseOperatorValue($input) {
    if (empty($input)) return null;
    
    // Regex pro operátor a číslo
    if (preg_match('/^(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)$/', trim($input), $matches)) {
        return ['operator' => $matches[1], 'value' => floatval($matches[2])];
    }
    
    // Default operátor =
    if (is_numeric($input)) {
        return ['operator' => '=', 'value' => floatval($input)];
    }
    
    return null;
}

/**
 * 🎯 HELPER: Bezpečné JSON parsování
 */
function safeJsonDecode($json, $default = null) {
    if ($json === null || $json === '') return $default;
    
    $decoded = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg());
        return $default;
    }
    
    return $decoded;
}

/**
 * 🎯 POST order-v3/list
 * Načte seznam objednávek s paging a statistikami
 * 
 * STEJNÁ LOGIKA JAKO ORDERS25LIST - pouze backend paging!
 */
function handle_order_v3_list($input, $config, $queries) {
    // 1. Validace
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    // 2. Autentizace
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    $user_id = (int)($token_data['id'] ?? 0);

    try {
        // 3. DB připojení
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        TimezoneHelper::setMysqlTimezone($db);

        // 4. Parametry paginace
        $page = max(1, (int)($input['page'] ?? 1));
        $per_page = max(1, min(500, (int)($input['per_page'] ?? 50)));
        $offset = ($page - 1) * $per_page;
        
        // 5. Období
        $period = $input['period'] ?? 'all';
        $period_range = calculatePeriodRange($period);
        
        // 6. Filtry a třídění
        $filters = $input['filters'] ?? [];
        $sorting = $input['sorting'] ?? [];
        
        // ============================================================================
        // 7. SESTAVIT WHERE PODMÍNKY - JEDNODUCHÉ!
        // ============================================================================
        
        $where_conditions = [];
        $where_params = [];
        
        // Základní filtry
        $where_conditions[] = "o.aktivni = 1";
        $where_conditions[] = "o.id != 1"; // Vyloučit testovací objednávku
        
        // Období
        if ($period_range !== null) {
            $where_conditions[] = "o.dt_objednavky BETWEEN ? AND ?";
            $where_params[] = $period_range['date_from'];
            $where_params[] = $period_range['date_to'];
        }
        
        // Fulltext search - JEDNODUCHÝ přístup!
        if (!empty($filters['fulltext_search'])) {
            $search = '%' . $filters['fulltext_search'] . '%';
            $where_conditions[] = "(
                o.cislo_objednavky LIKE ? OR
                o.predmet LIKE ? OR
                o.poznamka LIKE ? OR
                d.nazev LIKE ? OR
                CONCAT(u1.jmeno, ' ', u1.prijmeni) LIKE ? OR
                CONCAT(u2.jmeno, ' ', u2.prijmeni) LIKE ? OR
                CONCAT(u3.jmeno, ' ', u3.prijmeni) LIKE ? OR
                CONCAT(u4.jmeno, ' ', u4.prijmeni) LIKE ?
            )";
            // 8x search param
            for ($i = 0; $i < 8; $i++) {
                $where_params[] = $search;
            }
        }
        
        // Číslo objednávky
        if (!empty($filters['cislo_objednavky'])) {
            $where_conditions[] = "o.cislo_objednavky LIKE ?";
            $where_params[] = '%' . $filters['cislo_objednavky'] . '%';
        }
        
        // Předmět
        if (!empty($filters['predmet'])) {
            $where_conditions[] = "o.predmet LIKE ?";
            $where_params[] = '%' . $filters['predmet'] . '%';
        }
        
        // Dodavatel
        if (!empty($filters['dodavatel_nazev'])) {
            $where_conditions[] = "d.nazev LIKE ?";
            $where_params[] = '%' . $filters['dodavatel_nazev'] . '%';
        }
        
        // Objednatel ID (pole)
        if (!empty($filters['objednatel']) && is_array($filters['objednatel'])) {
            $ids = array_map('intval', $filters['objednatel']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.objednatel_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Garant ID (pole)
        if (!empty($filters['garant']) && is_array($filters['garant'])) {
            $ids = array_map('intval', $filters['garant']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.garant_uzivatel_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Příkazce ID (pole)
        if (!empty($filters['prikazce']) && is_array($filters['prikazce'])) {
            $ids = array_map('intval', $filters['prikazce']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.prikazce_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Schvalovatel ID (pole)
        if (!empty($filters['schvalovatel']) && is_array($filters['schvalovatel'])) {
            $ids = array_map('intval', $filters['schvalovatel']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.schvalovatel_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Status - ZJEDNODUŠENÁ LOGIKA!
        if (!empty($filters['stav']) && is_array($filters['stav'])) {
            $stav_conditions = [];
            foreach ($filters['stav'] as $stav_kod) {
                if ($stav_kod === 'NOVA') {
                    $stav_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, '$[0]')) = ?";
                } else {
                    $stav_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = ?";
                }
                $where_params[] = $stav_kod;
            }
            if (!empty($stav_conditions)) {
                $where_conditions[] = '(' . implode(' OR ', $stav_conditions) . ')';
            }
        }
        
        // Moje objednávky
        if (!empty($filters['moje_objednavky']) && $filters['moje_objednavky'] === true) {
            $where_conditions[] = "(o.objednatel_id = ? OR o.garant_uzivatel_id = ? OR o.prikazce_id = ? OR o.schvalovatel_id = ?)";
            $where_params[] = $user_id;
            $where_params[] = $user_id;
            $where_params[] = $user_id;
            $where_params[] = $user_id;
        }
        
        // Mimořádné události
        if (!empty($filters['mimoradne_udalosti']) && $filters['mimoradne_udalosti'] === true) {
            $where_conditions[] = "o.mimoradna_udalost = 1";
        }
        
        // S fakturou
        if (!empty($filters['s_fakturou']) && $filters['s_fakturou'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1)";
        }
        
        // S přílohami
        if (!empty($filters['s_prilohami']) && $filters['s_prilohami'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p WHERE p.objednavka_id = o.id AND p.aktivni = 1)";
        }
        
        // Částkové filtry s operátory
        if (!empty($filters['cena_max'])) {
            $parsed = parseOperatorValue($filters['cena_max']);
            if ($parsed) {
                $where_conditions[] = "o.max_cena_s_dph {$parsed['operator']} ?";
                $where_params[] = $parsed['value'];
            }
        }
        
        // ============================================================================
        // 8. USER PERMISSIONS - STEJNÁ LOGIKA JAKO ORDERS25LIST!
        // ============================================================================
        
        // Načtení user permissions
        $user_permissions = function_exists('getUserOrderPermissions') ? 
            getUserOrderPermissions($user_id, $db) : [];
        $user_roles = function_exists('getUserRoles') ? 
            getUserRoles($user_id, $db) : [];
            
        // Check admin
        $isAdminByRole = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
        $hasOrderReadAll = in_array('ORDER_READ_ALL', $user_permissions);
        $hasOrderViewAll = in_array('ORDER_VIEW_ALL', $user_permissions);
        $is_admin = $isAdminByRole || $hasOrderReadAll || $hasOrderViewAll;
        
        error_log("[OrderV3 REFACTORED] User $user_id - Admin: " . ($is_admin ? 'YES' : 'NO'));
        
        if (!$is_admin && $user_id > 0) {
            // Non-admin: 12-field filter + hierarchie (stejně jako Orders25List)
            $visibilityConditions = [];
            
            // 12 základních polí
            $roleBasedCondition = "(
                o.uzivatel_id = ? OR
                o.objednatel_id = ? OR
                o.garant_uzivatel_id = ? OR
                o.schvalovatel_id = ? OR
                o.prikazce_id = ? OR
                o.uzivatel_akt_id = ? OR
                o.odesilatel_id = ? OR
                o.dodavatel_potvrdil_id = ? OR
                o.zverejnil_id = ? OR
                o.fakturant_id = ? OR
                o.dokoncil_id = ? OR
                o.potvrdil_vecnou_spravnost_id = ?
            )";
            $visibilityConditions[] = $roleBasedCondition;
            // 12x user_id
            for ($i = 0; $i < 12; $i++) {
                $where_params[] = $user_id;
            }
            
            // Hierarchie
            if (function_exists('applyHierarchyFilterToOrders')) {
                $hierarchyFilter = applyHierarchyFilterToOrders($user_id, $db);
                if ($hierarchyFilter !== null) {
                    $visibilityConditions[] = $hierarchyFilter;
                    error_log("[OrderV3 REFACTORED] Hierarchy filter APPLIED");
                }
            }
            
            // Department subordinates
            $hasOrderReadSubordinate = in_array('ORDER_READ_SUBORDINATE', $user_permissions);
            $hasOrderEditSubordinate = in_array('ORDER_EDIT_SUBORDINATE', $user_permissions);
            
            if ($hasOrderReadSubordinate || $hasOrderEditSubordinate) {
                if (function_exists('getUserDepartmentColleagueIds')) {
                    $departmentColleagueIds = getUserDepartmentColleagueIds($user_id, $db);
                    if (!empty($departmentColleagueIds)) {
                        $departmentColleagueIdsStr = implode(',', array_map('intval', $departmentColleagueIds));
                        $departmentCondition = "(
                            o.uzivatel_id IN ($departmentColleagueIdsStr) OR
                            o.objednatel_id IN ($departmentColleagueIdsStr) OR
                            o.garant_uzivatel_id IN ($departmentColleagueIdsStr)
                        )";
                        $visibilityConditions[] = $departmentCondition;
                        error_log("[OrderV3 REFACTORED] Department filter APPLIED (" . count($departmentColleagueIds) . " colleagues)");
                    }
                }
            }
            
            // Kombinace s OR logikou
            if (!empty($visibilityConditions)) {
                $where_conditions[] = "(" . implode(" OR ", $visibilityConditions) . ")";
            }
        }

        $where_sql = implode(' AND ', $where_conditions);

        // ============================================================================
        // 9. SESTAVIT ORDER BY - JEDNODUCHÉ!
        // ============================================================================
        
        $order_by_parts = [];
        if (!empty($sorting)) {
            foreach ($sorting as $sort) {
                if (isset($sort['id'])) {
                    $column = $sort['id'];
                    $direction = ($sort['desc'] ?? false) ? 'DESC' : 'ASC';
                    
                    // Mapování sloupců
                    $column_map = [
                        'dt_objednavky' => 'o.dt_objednavky',
                        'cislo_objednavky' => 'o.cislo_objednavky',
                        'predmet' => 'o.predmet',
                        'dodavatel_nazev' => 'COALESCE(o.dodavatel_nazev, d.nazev)',
                        'objednatel_jmeno' => 'u1.prijmeni',
                        'garant_jmeno' => 'u2.prijmeni',
                        'prikazce_jmeno' => 'u3.prijmeni',
                        'schvalovatel_jmeno' => 'u4.prijmeni',
                        'max_cena_s_dph' => 'o.max_cena_s_dph',
                    ];
                    
                    if (isset($column_map[$column])) {
                        $order_by_parts[] = $column_map[$column] . ' ' . $direction;
                    }
                }
            }
        }
        
        // Výchozí třídění
        if (empty($order_by_parts)) {
            $order_by_parts[] = 'o.dt_objednavky DESC';
        }
        
        $order_by_sql = implode(', ', $order_by_parts);

        // ============================================================================
        // 10. SPOČÍTAT CELKOVÝ POČET
        // ============================================================================
        
        $sql_count = "
            SELECT COUNT(DISTINCT o.id) as total
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
            LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
            LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
            LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
            WHERE $where_sql
        ";
        
        $stmt_count = $db->prepare($sql_count);
        $stmt_count->execute($where_params);
        $total_count = (int)$stmt_count->fetchColumn();
        $total_pages = ceil($total_count / $per_page);
        
        error_log("[OrderV3 REFACTORED] Total: $total_count, Pages: $total_pages");

        // ============================================================================
        // 11. NAČÍST STATISTIKY (pouze na první stránce)
        // ============================================================================
        
        $stats = null;
        if ($page === 1) {
            $stats = getOrderStatsSimple($db, $period, $user_id, $is_admin, $where_sql, $where_params);
        }

        // ============================================================================
        // 12. HLAVNÍ QUERY - STREAMING DATA!
        // ============================================================================
        
        $sql_orders = "
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.predmet,
                o.poznamka,
                o.dt_objednavky,
                o.dt_vytvoreni,
                o.dt_aktualizace,
                o.financovani,
                o.max_cena_s_dph,
                o.stav_objednavky,
                o.stav_workflow_kod,
                o.mimoradna_udalost,
                o.zverejnit,
                o.dt_zverejneni,
                o.registr_iddt,
                
                -- Dodavatel
                o.dodavatel_id,
                COALESCE(o.dodavatel_nazev, d.nazev) as dodavatel_nazev,
                COALESCE(o.dodavatel_ico, d.ico) as dodavatel_ico,
                
                -- Uživatelé
                u1.id as objednatel_id,
                CONCAT(u1.jmeno, ' ', u1.prijmeni) as objednatel_jmeno,
                u1.email as objednatel_email,
                
                u2.id as garant_id,
                CONCAT(u2.jmeno, ' ', u2.prijmeni) as garant_jmeno,
                
                u3.id as prikazce_id,
                CONCAT(u3.jmeno, ' ', u3.prijmeni) as prikazce_jmeno,
                
                u4.id as schvalovatel_id,
                CONCAT(u4.jmeno, ' ', u4.prijmeni) as schvalovatel_jmeno,
                
                -- Počty (subqueries)
                (SELECT COUNT(*) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) as pocet_polozek,
                (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) as cena_s_dph,
                (SELECT COUNT(*) FROM " . TBL_OBJEDNAVKY_PRILOHY . " pr WHERE pr.objednavka_id = o.id) as pocet_priloh,
                (SELECT COUNT(*) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) as pocet_faktur,
                (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) as faktury_celkova_castka_s_dph
                
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
            LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
            LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
            LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
            WHERE $where_sql
            ORDER BY $order_by_sql
            LIMIT $per_page OFFSET $offset
        ";
        
        $stmt_orders = $db->prepare($sql_orders);
        $stmt_orders->execute($where_params);
        $orders = $stmt_orders->fetchAll(PDO::FETCH_ASSOC);

        // ============================================================================
        // 13. POST-PROCESSING - POUZE ZÁKLADNÍ!
        // ============================================================================
        
        foreach ($orders as &$order) {
            // Parsovat JSON pole
            if (isset($order['financovani'])) {
                $order['financovani'] = safeJsonDecode($order['financovani'], null);
            }
            if (isset($order['stav_workflow_kod'])) {
                $order['stav_workflow_kod'] = safeJsonDecode($order['stav_workflow_kod'], []);
            }
        }
        unset($order); // Break reference

        // ============================================================================
        // 14. ÚSPĚŠNÁ ODPOVĚĎ
        // ============================================================================
        
        http_response_code(200);
        $response = [
            'status' => 'success',
            'data' => [
                'orders' => $orders,
                'pagination' => [
                    'page' => $page,
                    'per_page' => $per_page,
                    'total' => $total_count,
                    'total_pages' => $total_pages
                ]
            ],
            'message' => 'Data načtena úspěšně'
        ];
        
        if ($stats !== null) {
            $response['data']['stats'] = $stats;
        }
        
        echo json_encode($response);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání objednávek: ' . $e->getMessage()
        ]);
        error_log("[OrderV3 REFACTORED ERROR] " . $e->getMessage());
    }
}

/**
 * 🎯 HELPER: Zjednodušené statistiky (bez over-complexity)
 */
function getOrderStatsSimple($db, $period, $user_id, $is_admin, $where_sql, $where_params) {
    // Pro adminy - nezahrnout user filtr do stats
    // Pro non-admins - použít stejný WHERE jako pro data
    
    $sql_stats = "
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, '$[0]')) = 'NOVA' THEN 1 ELSE 0 END) as nove,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI') THEN 1 ELSE 0 END) as ke_schvaleni,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'SCHVALENA' THEN 1 ELSE 0 END) as schvalena,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'POTVRZENA' THEN 1 ELSE 0 END) as potvrzena,
            SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'DOKONCENA' THEN 1 ELSE 0 END) as dokoncena,
            SUM(CASE WHEN o.mimoradna_udalost = 1 THEN 1 ELSE 0 END) as mimoradneUdalosti
        FROM " . TBL_OBJEDNAVKY . " o
        LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
        LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
        LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
        LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
        LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
        WHERE $where_sql
    ";
    
    $stmt_stats = $db->prepare($sql_stats);
    $stmt_stats->execute($where_params);
    $stats = $stmt_stats->fetch(PDO::FETCH_ASSOC);
    
    // Převést na INT
    foreach ($stats as $key => $value) {
        $stats[$key] = intval($value);
    }
    
    return $stats;
}

/**
 * 🎯 POST order-v3/stats
 * Načte pouze statistiky (lehký endpoint pro dashboard)
 */
function handle_order_v3_stats($input, $config, $queries) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    $user_id = (int)($token_data['id'] ?? 0);

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        TimezoneHelper::setMysqlTimezone($db);
        
        $period = $input['period'] ?? 'all';
        
        // Jednoduché WHERE pro stats
        $where_conditions = [];
        $where_params = [];
        
        $where_conditions[] = "o.aktivni = 1";
        $where_conditions[] = "o.id != 1";
        
        $period_range = calculatePeriodRange($period);
        if ($period_range !== null) {
            $where_conditions[] = "o.dt_objednavky BETWEEN ? AND ?";
            $where_params[] = $period_range['date_from'];
            $where_params[] = $period_range['date_to'];
        }
        
        $where_sql = implode(' AND ', $where_conditions);
        
        // Check admin
        $user_permissions = function_exists('getUserOrderPermissions') ? getUserOrderPermissions($user_id, $db) : [];
        $user_roles = function_exists('getUserRoles') ? getUserRoles($user_id, $db) : [];
        $isAdminByRole = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
        $hasOrderReadAll = in_array('ORDER_READ_ALL', $user_permissions);
        $hasOrderViewAll = in_array('ORDER_VIEW_ALL', $user_permissions);
        $is_admin = $isAdminByRole || $hasOrderReadAll || $hasOrderViewAll;
        
        $stats = getOrderStatsSimple($db, $period, $user_id, $is_admin, $where_sql, $where_params);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $stats,
            'message' => 'Statistiky načteny úspěšně'
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání statistik: ' . $e->getMessage()
        ]);
    }
}

/**
 * 🎯 POST order-v3/items
 * Načte položky objednávky (lazy loading)
 */
function handle_order_v3_items($input, $config, $queries) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $order_id = (int)($input['order_id'] ?? 0);
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }
    
    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí order_id']);
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        TimezoneHelper::setMysqlTimezone($db);

        // Načíst položky
        $sql_items = "
            SELECT 
                p.id,
                p.popis,
                p.cena_bez_dph,
                p.sazba_dph,
                p.cena_s_dph,
                p.usek_kod,
                p.budova_kod,
                p.mistnost_kod,
                p.poznamka,
                p.lp_id,
                p.dt_vytvoreni,
                lp.cislo_lp as lppts_cislo,
                lp.nazev_uctu as lppts_nazev
            FROM " . TBL_OBJEDNAVKY_POLOZKY . " p
            LEFT JOIN " . TBL_LIMITOVANE_PRISLIBY . " lp ON p.lp_id = lp.id
            WHERE p.objednavka_id = ? AND p.aktivni = 1
            ORDER BY p.id ASC
        ";
        
        $stmt_items = $db->prepare($sql_items);
        $stmt_items->execute([$order_id]);
        $items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

        // Načíst přílohy
        $sql_attachments = "
            SELECT 
                id,
                nazev_souboru,
                nazev_originalu,
                typ_souboru,
                velikost_souboru,
                popis,
                dt_nahrani
            FROM " . TBL_OBJEDNAVKY_PRILOHY . "
            WHERE objednavka_id = ? AND aktivni = 1
            ORDER BY dt_nahrani DESC
        ";
        
        $stmt_attachments = $db->prepare($sql_attachments);
        $stmt_attachments->execute([$order_id]);
        $attachments = $stmt_attachments->fetchAll(PDO::FETCH_ASSOC);

        // Poznámky
        $sql_notes = "SELECT poznamka FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1";
        $stmt_notes = $db->prepare($sql_notes);
        $stmt_notes->execute([$order_id]);
        $notes = $stmt_notes->fetchColumn();

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => [
                'order_id' => $order_id,
                'items' => $items,
                'attachments' => $attachments,
                'notes' => $notes
            ],
            'message' => 'Detail objednávky načten úspěšně'
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání detailu objednávky: ' . $e->getMessage()
        ]);
    }
}

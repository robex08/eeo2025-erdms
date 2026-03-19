<?php
/**
 * Order V3 API Handlers - OPTIMALIZOVANÉ PRO REACT FRONTEND
 * 
 * 🎯 ENDPOINTY:
 * - POST order-v3/list        → Seznam objednávek s paging a statistikami
 * - POST order-v3/stats       → Pouze statistiky (pro dashboard)
 * - POST order-v3/items       → Detail položek objednávky (lazy loading)
 * 
 * ✅ FEATURES:
 * - Server-side pagination
 * - Optimalizované queries (JOINy, indexy)
 * - Timezone handling přes TimezoneHelper
 * - Filtrování a třídění
 * - Lazy loading podřádků
 * 
 * 📅 Created: 2026-01-23
 */

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/hierarchyOrderFilters.php';

// Import Order V2 permissions functions for compatibility
if (file_exists(__DIR__ . '/orderV2Endpoints.php')) {
    require_once __DIR__ . '/orderV2Endpoints.php';
}

/**
 * 🔒 HELPER: Aplikuje user permissions na WHERE podmínky
 * Používá STEJNOU logiku jako Order V2 (orderlist25) včetně hierarchie!
 * 
 * @param int $user_id
 * @param PDO $db
 * @param array &$where_conditions - Reference na pole WHERE podmínek (bude doplněno)
 * @param array &$where_params - Reference na pole parametrů (bude doplněno)
 * @return bool - TRUE pokud je admin (vidí všechno), FALSE pokud non-admin (filtry aplikovány)
 */
function applyOrderV3UserPermissions($user_id, $db, &$where_conditions, &$where_params) {
    // Načtení user permissions a rolí (Order V2 compatible)
    $user_permissions = function_exists('getUserOrderPermissions') ? 
        getUserOrderPermissions($user_id, $db) : [];
    $user_roles = function_exists('getUserRoles') ? 
        getUserRoles($user_id, $db) : [];
        
    error_log("[OrderV3 Permissions] User $user_id - permissions: " . json_encode($user_permissions));
    error_log("[OrderV3 Permissions] User $user_id - roles: " . json_encode($user_roles));
    
    // Check admin role (SUPERADMIN nebo ADMINISTRATOR)
    $isAdminByRole = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
    
    // Check read all permissions
    $hasOrderReadAll = in_array('ORDER_READ_ALL', $user_permissions);
    $hasOrderViewAll = in_array('ORDER_VIEW_ALL', $user_permissions);
    $hasReadAllPermissions = $hasOrderReadAll || $hasOrderViewAll;
    
    // Final admin status
    $is_admin = $isAdminByRole || $hasReadAllPermissions;
    
    error_log("[OrderV3 Permissions] Admin check - by role: " . ($isAdminByRole ? 'YES' : 'NO') . 
              ", by permissions: " . ($hasReadAllPermissions ? 'YES' : 'NO') . 
              ", FINAL: " . ($is_admin ? 'ADMIN' : 'USER'));
    
    if ($is_admin) {
        // ADMIN - vidí všechny objednávky, žádné filtry
        error_log("[OrderV3 Permissions] ADMIN mode - showing ALL orders (like Order V2)");
        return true;
    }
    
    // ========================================================================
    // NON-ADMIN: Order V2 Compatible Visibility Logic
    // ========================================================================
    
    if ($user_id <= 0) {
        error_log("[OrderV3 Permissions] Invalid user_id, no permissions applied");
        return false;
    }
    
    $visibilityConditions = [];
    
    // 1️⃣ ROLE-BASED FILTER (12 polí) - ZÁKLAD
    error_log("[OrderV3 Permissions] Building role-based filter (12 fields) for user $user_id");
    
    $roleBasedCondition = "(
        o.uzivatel_id = ?
        OR o.objednatel_id = ?
        OR o.garant_uzivatel_id = ?
        OR o.schvalovatel_id = ?
        OR o.prikazce_id = ?
        OR o.uzivatel_akt_id = ?
        OR o.odesilatel_id = ?
        OR o.dodavatel_potvrdil_id = ?
        OR o.zverejnil_id = ?
        OR o.fakturant_id = ?
        OR o.dokoncil_id = ?
        OR o.potvrdil_vecnou_spravnost_id = ?
    )";
    
    $visibilityConditions[] = $roleBasedCondition;
    
    // Přidat 12x user_id do parametrů
    for ($i = 0; $i < 12; $i++) {
        $where_params[] = $user_id;
    }
    
    // 2️⃣ HIERARCHIE - ROZŠÍŘENÍ (pokud je aktivní)
    if (function_exists('applyHierarchyFilterToOrders')) {
        error_log("[OrderV3 Permissions] Checking hierarchy filter for user $user_id");
        $hierarchyFilter = applyHierarchyFilterToOrders($user_id, $db);
        
        if ($hierarchyFilter !== null) {
            $visibilityConditions[] = $hierarchyFilter;
            error_log("[OrderV3 Permissions] Hierarchy filter ADDED (expands visibility)");
        } else {
            error_log("[OrderV3 Permissions] Hierarchy filter NOT applied");
        }
    }
    
    // 3️⃣ DEPARTMENT SUBORDINATE - ROZŠÍŘENÍ
    $hasOrderReadSubordinate = in_array('ORDER_READ_SUBORDINATE', $user_permissions);
    $hasOrderEditSubordinate = in_array('ORDER_EDIT_SUBORDINATE', $user_permissions);
    
    if ($hasOrderReadSubordinate || $hasOrderEditSubordinate) {
        if (function_exists('getUserDepartmentColleagueIds')) {
            error_log("[OrderV3 Permissions] Building department filter for user $user_id");
            $departmentColleagueIds = getUserDepartmentColleagueIds($user_id, $db);
            
            if (!empty($departmentColleagueIds)) {
                $departmentColleagueIdsStr = implode(',', array_map('intval', $departmentColleagueIds));
                
                $departmentCondition = "(
                    o.uzivatel_id IN ($departmentColleagueIdsStr)
                    OR o.objednatel_id IN ($departmentColleagueIdsStr)
                    OR o.garant_uzivatel_id IN ($departmentColleagueIdsStr)
                    OR o.schvalovatel_id IN ($departmentColleagueIdsStr)
                    OR o.prikazce_id IN ($departmentColleagueIdsStr)
                    OR o.uzivatel_akt_id IN ($departmentColleagueIdsStr)
                    OR o.odesilatel_id IN ($departmentColleagueIdsStr)
                    OR o.dodavatel_potvrdil_id IN ($departmentColleagueIdsStr)
                    OR o.zverejnil_id IN ($departmentColleagueIdsStr)
                    OR o.fakturant_id IN ($departmentColleagueIdsStr)
                    OR o.dokoncil_id IN ($departmentColleagueIdsStr)
                    OR o.potvrdil_vecnou_spravnost_id IN ($departmentColleagueIdsStr)
                )";
                
                $visibilityConditions[] = $departmentCondition;
                error_log("[OrderV3 Permissions] Department filter ADDED for " . count($departmentColleagueIds) . " colleagues");
            }
        }
    }
    
    // 4️⃣ KOMBINACE S OR LOGIKOU - Order V2 compatible
    if (!empty($visibilityConditions)) {
        if (count($visibilityConditions) == 1) {
            // Jen role-based
            $where_conditions[] = $visibilityConditions[0];
            error_log("[OrderV3 Permissions] Visibility: Only role-based filter applied");
        } else {
            // Role-based + rozšíření
            $combinedFilter = "(" . implode(" OR ", $visibilityConditions) . ")";
            $where_conditions[] = $combinedFilter;
            error_log("[OrderV3 Permissions] Visibility: Combined " . count($visibilityConditions) . " filters with OR logic");
        }
    }
    
    return false; // Not admin
}

/**
 * Vypočítá datový rozsah podle zvoleného období
 * @param string $period - 'all', 'current-year', 'current-month', 'last-month', 'last-quarter', 'all-months'
 * @return array|null - ['date_from' => 'Y-m-d', 'date_to' => 'Y-m-d'] nebo null pro 'all'
 */
function calculatePeriodRange($period) {
    $today = date('Y-m-d');
    
    switch ($period) {
        case 'current-year':
        case 'all-months':
            // Celý aktuální rok
            return array(
                'date_from' => date('Y') . '-01-01',
                'date_to' => date('Y') . '-12-31'
            );
            
        case 'current-month':
            // První den aktuálního měsíce až dnes
            return array(
                'date_from' => date('Y-m-01'),
                'date_to' => $today
            );
            
        case 'last-month':
            // Posledních 30 dní
            return array(
                'date_from' => date('Y-m-d', strtotime('-30 days')),
                'date_to' => $today
            );
            
        case 'last-quarter':
            // Posledních 90 dní (~ kvartál)
            return array(
                'date_from' => date('Y-m-d', strtotime('-90 days')),
                'date_to' => $today
            );
            
        case 'all':
        default:
            // Bez omezení
            return null;
    }
}

/**
 * Parsuje hodnotu s operátorem (>=10000, >10000, =10000, <10000, <=10000)
 * @param string $input - Input z frontendu (např. ">=10000")
 * @return array|null - ['operator' => '>=', 'value' => 10000] nebo null
 */
function parseOperatorValue($input) {
    if (empty($input)) {
        return null;
    }
    
    // Regex pro operátor a číslo
    if (preg_match('/^(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)$/', trim($input), $matches)) {
        return array(
            'operator' => $matches[1],
            'value' => floatval($matches[2])
        );
    }
    
    // Pokud není operátor, default je =
    if (is_numeric($input)) {
        return array(
            'operator' => '=',
            'value' => floatval($input)
        );
    }
    
    return null;
}

/**
 * Bezpečné JSON parsování - stejné jako v OrderV2Handler
 * 
 * @param string|null $json JSON string
 * @param mixed $default Výchozí hodnota pokud parsování selže
 * @return mixed Parsovaná data nebo $default
 */
function safeJsonDecode($json, $default = null) {
    if ($json === null || $json === '') {
        return $default;
    }
    
    $decoded = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg() . " for: " . $json);
        return $default;
    }
    
    return $decoded;
}

/**
 * Normalizuje text pro diakritiku + lowercase (CZE)
 * @param string|null $value
 * @return string
 */
function normalizeSearchString($value) {
    if ($value === null) {
        return '';
    }
    $normalized = mb_strtolower((string)$value, 'UTF-8');
    $map = array(
        'á' => 'a', 'č' => 'c', 'ď' => 'd', 'é' => 'e', 'ě' => 'e',
        'í' => 'i', 'ň' => 'n', 'ó' => 'o', 'ř' => 'r', 'š' => 's',
        'ť' => 't', 'ú' => 'u', 'ů' => 'u', 'ý' => 'y', 'ž' => 'z'
    );
    return strtr($normalized, $map);
}

/**
 * Vytvoří SQL výraz pro porovnání bez diakritiky (lowercase + replace)
 * @param string $expression SQL výraz/sloupec
 * @return string
 */
function sqlNormalizeExpression($expression) {
    $normalized = "LOWER($expression)";
    $map = array(
        'á' => 'a', 'č' => 'c', 'ď' => 'd', 'é' => 'e', 'ě' => 'e',
        'í' => 'i', 'ň' => 'n', 'ó' => 'o', 'ř' => 'r', 'š' => 's',
        'ť' => 't', 'ú' => 'u', 'ů' => 'u', 'ý' => 'y', 'ž' => 'z'
    );
    foreach ($map as $from => $to) {
        $normalized = "REPLACE($normalized, '$from', '$to')";
    }
    return $normalized;
}

/**
 * Parsuje pole financování z DB - vrací array nebo null
 * Stejná logika jako OrderV2Handler::transformRawData()
 * 
 * @param string|null $financovaniRaw Surová hodnota z DB (TEXT/JSON)
 * @return array|null Parsované pole nebo null
 */
function parseFinancovani($financovaniRaw) {
    if ($financovaniRaw === null || $financovaniRaw === '') {
        return null;
    }
    
    $financovani = safeJsonDecode($financovaniRaw, null);
    if (is_array($financovani)) {
        return $financovani;
    }
    
    return null;
}

/**
 * Načte LP detaily podle ID z tabulky 25_limitovane_prisliby
 * @param PDO $db
 * @param int $lp_id
 * @return array|null - Array s cislo_lp a nazev_uctu nebo null
 */
function getLPDetailyV3($db, $lp_id) {
    if (empty($lp_id)) return null;
    
    try {
        $stmt = $db->prepare("SELECT cislo_lp, nazev_uctu FROM " . TBL_LIMITOVANE_PRISLIBY . " WHERE id = ? LIMIT 1");
        $stmt->execute(array($lp_id));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result : null;
    } catch (Exception $e) {
        error_log("getLPDetailyV3 Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Obohacení financování o LP názvy z tabulky 25_limitovane_prisliby
 * @param PDO $db
 * @param array $order - Reference na objednávku (bude upravena)
 */
function enrichFinancovaniV3($db, &$order) {
    if (!isset($order['financovani']) || !is_array($order['financovani'])) {
        return;
    }
    
    // Manuální mapování typů financování na lidské názvy
    if (isset($order['financovani']['typ']) && !empty($order['financovani']['typ'])) {
        $typ_nazvy = array(
            'LP' => 'Limitovaný příslib',
            'SMLOUVA' => 'Smlouva',
            'INDIVIDUALNI_SCHVALENI' => 'Individuální schválení',
            'POJISTNA_UDALOST' => 'Pojistná událost',
            'FINKP' => 'Finanční kontrola'
        );
        
        if (isset($typ_nazvy[$order['financovani']['typ']])) {
            $order['financovani']['typ_nazev'] = $typ_nazvy[$order['financovani']['typ']];
        }
    }
    
    // LP názvy - načíst z tabulky limitovane_prisliby
    if (isset($order['financovani']['lp_kody']) && is_array($order['financovani']['lp_kody'])) {
        $lp_nazvy = array();
        
        foreach ($order['financovani']['lp_kody'] as $lp_id) {
            $lp = getLPDetailyV3($db, $lp_id);
            
            if ($lp) {
                $lp_nazvy[] = array(
                    'id' => $lp_id,
                    'cislo_lp' => $lp['cislo_lp'],
                    'kod' => $lp['cislo_lp'],
                    'nazev' => $lp['nazev_uctu']
                );
            }
        }
        
        if (!empty($lp_nazvy)) {
            $order['financovani']['lp_nazvy'] = $lp_nazvy;
        }
    }
}

/**
 * Obohacení dodavatele - pokud je dodavatel_id, načte celé info z tabulky dodavatelů
 * @param PDO $db
 * @param array $order - Reference na objednávku (bude upravena)
 */
function enrichDodavatelV3($db, &$order) {
    if (empty($order['dodavatel_id'])) {
        return;
    }
    
    try {
        $stmt = $db->prepare("
            SELECT id, nazev, ico, dic, ulice, mesto, psc, stat, kontakt_jmeno, kontakt_email, kontakt_telefon
            FROM " . TBL_DODAVATELE . "
            WHERE id = ?
            LIMIT 1
        ");
        $stmt->execute(array($order['dodavatel_id']));
        $dodavatel = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($dodavatel) {
            if (!isset($order['_enriched'])) {
                $order['_enriched'] = array();
            }
            $order['_enriched']['dodavatel'] = $dodavatel;
        }
    } catch (Exception $e) {
        error_log("enrichDodavatelV3 Error: " . $e->getMessage());
    }
}

/**
 * Obohacení registru zveřejnění - data PŘÍMO z objednávky (ne z modulu smluv)
 * @param PDO $db
 * @param array $order - Reference na objednávku (bude upravena)
 */
function enrichRegistrZverejneniV3($db, &$order) {
    $registr = array(
        'zverejnit' => isset($order['zverejnit']) ? $order['zverejnit'] : null,
        'dt_zverejneni' => isset($order['dt_zverejneni']) ? $order['dt_zverejneni'] : null,
        'registr_iddt' => isset($order['registr_iddt']) ? $order['registr_iddt'] : null,
        'zverejnil' => null
    );
    
    // Načíst uživatele který zveřejnil
    if (!empty($order['zverejnil_id'])) {
        try {
            $stmt = $db->prepare("
                SELECT id, jmeno, prijmeni, email, titul_pred, titul_za
                FROM " . TBL_UZIVATELE . "
                WHERE id = ?
                LIMIT 1
            ");
            $stmt->execute(array($order['zverejnil_id']));
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                $celeMeno = '';
                if (!empty($user['titul_pred'])) {
                    $celeMeno .= $user['titul_pred'] . ' ';
                }
                $celeMeno .= trim($user['jmeno'] . ' ' . $user['prijmeni']);
                if (!empty($user['titul_za'])) {
                    $celeMeno .= ', ' . $user['titul_za'];
                }
                
                $registr['zverejnil'] = array(
                    'cele_jmeno' => $celeMeno,
                    'email' => $user['email'],
                    'datum' => $registr['dt_zverejneni']
                );
            }
        } catch (Exception $e) {
            error_log("enrichRegistrZverejneniV3 Error: " . $e->getMessage());
        }
    }
    
    $order['registr_smluv'] = $registr;
}

/**
 * POST order-v3/list
 * Načte seznam objednávek s paging a statistikami
 * 
 * REQUEST BODY:
 * {
 *   "token": "xxx",
 *   "username": "user@domain.cz",
 *   "page": 1,
 *   "per_page": 50,
 *   "year": 2026,
 *   "filters": {
 *     "cislo_objednavky": "OBJ",
 *     "dodavatel_nazev": "ČSOB",
 *     "stav_objednavky": "SCHVALENA"
 *   },
 *   "sorting": [
 *     {"id": "dt_objednavky", "desc": true},
 *     {"id": "cislo_objednavky", "desc": false}
 *   ]
 * }
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "data": {
 *     "orders": [...],
 *     "pagination": {
 *       "page": 1,
 *       "per_page": 50,
 *       "total": 127,
 *       "total_pages": 3
 *     },
 *     "stats": {
 *       "total": 127,
 *       "nove": 5,
 *       "ke_schvaleni": 12,
 *       "schvalene": 45,
 *       "potvrzene": 30,
 *       "uverejnene": 25,
 *       "dokoncene": 10
 *     }
 *   }
 * }
 */
function handle_order_v3_list($input, $config, $queries) {
    // 1. Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // 2. Autentizace
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    // DEBUG: Log celý input
    error_log("[OrderV3 DEBUG] Full input: " . json_encode($input));
    
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

    $user_id = isset($token_data['id']) ? (int)$token_data['id'] : 0;

    try {
        // 3. Připojení k DB
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        TimezoneHelper::setMysqlTimezone($db);

        // 4. Parametry paginace
        $page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
        $per_page = isset($input['per_page']) ? max(1, min(500, (int)$input['per_page'])) : 50;
        $offset = ($page - 1) * $per_page;
        
        // DEBUG: Log pagination params
        error_log("[OrderV3] Pagination params: page=$page, per_page=$per_page, offset=$offset");
        
        // 5. Období pro filtrování (místo roku)
        $period = isset($input['period']) ? $input['period'] : 'all';
        
        // 6. Filtry
        $filters = isset($input['filters']) ? $input['filters'] : array();
        
        // 7. Třídění
        $sorting = isset($input['sorting']) ? $input['sorting'] : array();

        // 8. Sestavit WHERE podmínky
        $where_conditions = array();
        $where_params = array();
        
        // Aktivní záznamy
        $where_conditions[] = "o.aktivni = 1";
        
        // ⚠️ IGNORE testovací/vzorová objednávka s ID 1 - VŽDY vyloučit ze všech výsledků
        $where_conditions[] = "o.id != 1";
        
        // Období - filtrování podle datumu
        $period_range = calculatePeriodRange($period);
        if ($period_range !== null) {
            $where_conditions[] = "o.dt_objednavky BETWEEN ? AND ?";
            $where_params[] = $period_range['date_from'];
            $where_params[] = $period_range['date_to'];
            error_log("[OrderV3] Period filter: {$period} -> {$period_range['date_from']} to {$period_range['date_to']}");
        } else {
            error_log("[OrderV3] Period filter: {$period} -> no date restriction");
        }
        
        // Dynamické filtry
        if (!empty($filters['cislo_objednavky'])) {
            // ⚠️ KOMBINOVANÝ SLOUPEC: Evidenční číslo zobrazuje cislo_objednavky + predmet
            // Hledat v OBOU sloupcích + v položkách (case-insensitive + bez diakritiky)
            $filter_value = normalizeSearchString($filters['cislo_objednavky']);
            $filter_pattern = '%' . $filter_value . '%';
            $where_conditions[] = "(
                " . sqlNormalizeExpression('o.cislo_objednavky') . " LIKE ?
                OR " . sqlNormalizeExpression('o.predmet') . " LIKE ?
                    OR EXISTS (
                        SELECT 1 FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                        WHERE pol.objednavka_id = o.id 
                        AND " . sqlNormalizeExpression('pol.popis') . " LIKE ?
                    )
            )";
            $where_params[] = $filter_pattern;
            $where_params[] = $filter_pattern;
            $where_params[] = $filter_pattern;
        }
        
        if (!empty($filters['dodavatel_nazev'])) {
            // ⚠️ DODAVATEL: Hledat v názvu + IČO + adrese + kontaktech (case-insensitive + bez diakritiky)
            $filter_value = normalizeSearchString($filters['dodavatel_nazev']);
            $filter_pattern = '%' . $filter_value . '%';
            $where_conditions[] = "(
                " . sqlNormalizeExpression('d.nazev') . " LIKE ?
                OR " . sqlNormalizeExpression('o.dodavatel_nazev') . " LIKE ?
                OR o.dodavatel_ico LIKE ?
                OR " . sqlNormalizeExpression('o.dodavatel_adresa') . " LIKE ?
                OR " . sqlNormalizeExpression('o.dodavatel_kontakt_jmeno') . " LIKE ?
                OR " . sqlNormalizeExpression('o.dodavatel_kontakt_email') . " LIKE ?
            )";
            $where_params[] = $filter_pattern;
            $where_params[] = $filter_pattern;
            $where_params[] = $filter_pattern;
            $where_params[] = $filter_pattern;
            $where_params[] = $filter_pattern;
            $where_params[] = $filter_pattern;
        }
        
        // ⚠️ KOMBINOVANÝ SLOUPEC: Objednatel / Garant (pouze jména, ne emaily)
        if (!empty($filters['objednatel_garant'])) {
            $filter_value = normalizeSearchString($filters['objednatel_garant']);
            $filter_pattern = '%' . $filter_value . '%';
            $where_conditions[] = "(
                " . sqlNormalizeExpression("CONCAT(u1.prijmeni, ' ', u1.jmeno)") . " LIKE ?
                OR " . sqlNormalizeExpression("CONCAT(u2.prijmeni, ' ', u2.jmeno)") . " LIKE ?
            )";
            $where_params[] = $filter_pattern;
            $where_params[] = $filter_pattern;
        }
        
        // ⚠️ KOMBINOVANÝ SLOUPEC: Příkazce / Schvalovatel (pouze jména, ne emaily)
        if (!empty($filters['prikazce_schvalovatel'])) {
            $filter_value = normalizeSearchString($filters['prikazce_schvalovatel']);
            $filter_pattern = '%' . $filter_value . '%';
            $where_conditions[] = "(
                " . sqlNormalizeExpression("CONCAT(u3.prijmeni, ' ', u3.jmeno)") . " LIKE ?
                OR " . sqlNormalizeExpression("CONCAT(u4.prijmeni, ' ', u4.jmeno)") . " LIKE ?
            )";
            $where_params[] = $filter_pattern;
            $where_params[] = $filter_pattern;
        }
        
        // 🔍 DEBUG: Log příchozích filtrů
        error_log("[OrderV3 FILTERS] Received filters: " . json_encode($filters));
        
        // ========================================================================
        // FILTRY PODLE ID (POLE) - priorita před textovými filtry
        // ========================================================================
        
        // Objednatel - filtr podle pole ID
        if (!empty($filters['objednatel']) && is_array($filters['objednatel'])) {
            $ids = array_map('intval', $filters['objednatel']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.objednatel_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Garant - filtr podle pole ID
        if (!empty($filters['garant']) && is_array($filters['garant'])) {
            $ids = array_map('intval', $filters['garant']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.garant_uzivatel_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Příkazce - filtr podle pole ID
        if (!empty($filters['prikazce']) && is_array($filters['prikazce'])) {
            $ids = array_map('intval', $filters['prikazce']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.prikazce_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Schvalovatel - filtr podle pole ID
        if (!empty($filters['schvalovatel']) && is_array($filters['schvalovatel'])) {
            $ids = array_map('intval', $filters['schvalovatel']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.schvalovatel_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Status - filtr podle pole workflow kódů
        if (!empty($filters['stav']) && is_array($filters['stav'])) {
            
            // UNIVERZÁLNÍ MAPOVÁNÍ - podporuje jak UI klíče tak workflow kódy
            // ✅ Podporuje i lowercase varianty z Dashboard toggle
            $stav_map = array(
                // ✅ UI klíče UPPERCASE (z číselníku select / Advanced filtru)
                'NOVA' => 'NOVA',
                'KE_SCHVALENI' => 'ODESLANA_KE_SCHVALENI',
                'SCHVALENA' => 'SCHVALENA',
                'ZAMITNUTA' => 'ZAMITNUTA',
                'ROZPRACOVANA' => 'ROZPRACOVANA',
                'ODESLANA' => 'ODESLANA',
                'POTVRZENA' => 'POTVRZENA',
                'K_UVEREJNENI_DO_REGISTRU' => 'UVEREJNIT',
                // UVEREJNENA je řešena speciálně přes registr, ne přes workflow
                'FAKTURACE' => 'FAKTURACE',
                'VECNA_SPRAVNOST' => 'VECNA_SPRAVNOST',
                'ZKONTROLOVANA' => 'ZKONTROLOVANA',
                'DOKONCENA' => 'DOKONCENA',
                'ZRUSENA' => 'ZRUSENA',
                'SMAZANA' => 'SMAZANA',
                // ✅ Workflow kódy (identity mapping) - pro přímé API volání
                'ODESLANA_KE_SCHVALENI' => 'ODESLANA_KE_SCHVALENI',
                'UVEREJNIT' => 'UVEREJNIT',
            );
            
            $status_conditions = array();
            foreach ($filters['stav'] as $stav_key) {
                // ✅ Normalizuj na UPPERCASE pro mapování (Dashboard posílá lowercase)
                $stav_key_upper = strtoupper(trim($stav_key));
                
                // Skip prázdné hodnoty
                if (empty($stav_key_upper)) {
                    continue;
                }
                
                // Speciální logika pro registr (bez workflow)
                if ($stav_key_upper === 'UVEREJNENA') {
                    $status_conditions[] = "(
                        (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
                        OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
                    )";
                    continue;
                }
                if ($stav_key_upper === 'K_UVEREJNENI_DO_REGISTRU') {
                    $status_conditions[] = "(
                        (
                            JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'UVEREJNIT'
                            OR " . sqlNormalizeExpression('o.zverejnit') . " = 'ano'
                            OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'ke zverejneni'
                        )
                        AND NOT (
                            (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
                            OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
                        )
                    )";
                    continue;
                }

                $workflow_kod = $stav_map[$stav_key_upper] ?? $stav_key_upper; // Fallback na původní hodnotu
                
                // ✅ LOGIKA: Filtruj podle POSLEDNÍHO prvku v workflow poli
                // NOVA je vždy první, ostatní hledáme jako poslední
                // Např. ["ODESLANA_KE_SCHVALENI"] - poslední je index 0
                // Např. ["SCHVALENA","ODESLANA"] - poslední je index 1
                if ($workflow_kod === 'NOVA') {
                    // NOVA je vždy na začátku workflow
                    $status_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, '$[0]')) = ?";
                    $where_params[] = $workflow_kod;
                } else {
                    // Všechny ostatní stavy - hledej jako poslední prvek
                    $status_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = ?";
                    $where_params[] = $workflow_kod;
                }
                
            }
            
            if (!empty($status_conditions)) {
                $sql_condition = '(' . implode(' OR ', $status_conditions) . ')';
                $where_conditions[] = $sql_condition;
            }
        }
        
        // LP kódy - filtr podle pole ID limitovaných příslibů
        if (!empty($filters['lp_kody']) && is_array($filters['lp_kody'])) {
            // Filtrovat objednávky které mají v JSON financovani.lp_kody některý z vybraných LP ID
            $lp_ids = array_map('intval', $filters['lp_kody']);
            error_log("[OrderV3 LP FILTER] User $user_id - LP IDs: " . json_encode($lp_ids));
            $lp_conditions = array();
            
            foreach ($lp_ids as $lp_id) {
                // Hledej LP ID v JSON poli financovani.lp_kody
                $lp_conditions[] = "JSON_SEARCH(JSON_EXTRACT(o.financovani, '$.lp_kody'), 'one', CAST(? AS CHAR)) IS NOT NULL";
                $where_params[] = $lp_id;
            }
            
            if (!empty($lp_conditions)) {
                $where_conditions[] = '(' . implode(' OR ', $lp_conditions) . ')';
                error_log("[OrderV3 LP FILTER] LP filter conditions added");
            }
        }
        
        // ========================================================================
        // TEXTOVÉ FILTRY (SLOUPCOVÉ) - pro kombinované sloupce z tabulky
        // ========================================================================
        
        // Filtr pro objednatele a garanta - pokud jsou stejné, použít OR logiku
        $objednatel_filter_raw = !empty($filters['objednatel_jmeno']) ? $filters['objednatel_jmeno'] : '';
        $garant_filter_raw = !empty($filters['garant_jmeno']) ? $filters['garant_jmeno'] : '';
        $objednatel_filter = normalizeSearchString($objednatel_filter_raw);
        $garant_filter = normalizeSearchString($garant_filter_raw);
        
        // Pokud jsou oba filtry stejné (kombinovaný sloupec z FE), použít OR
        if ($objednatel_filter && $garant_filter && $objednatel_filter === $garant_filter) {
            $where_conditions[] = "(" . sqlNormalizeExpression("CONCAT(u1.jmeno, ' ', u1.prijmeni)") . " LIKE ? OR " . sqlNormalizeExpression("CONCAT(u2.jmeno, ' ', u2.prijmeni)") . " LIKE ?)";
            $where_params[] = '%' . $objednatel_filter . '%';
            $where_params[] = '%' . $objednatel_filter . '%';
        } else {
            // Jinak jsou to samostatné filtry, použít AND
            if ($objednatel_filter) {
                $where_conditions[] = sqlNormalizeExpression("CONCAT(u1.jmeno, ' ', u1.prijmeni)") . " LIKE ?";
                $where_params[] = '%' . $objednatel_filter . '%';
            }
            if ($garant_filter) {
                $where_conditions[] = sqlNormalizeExpression("CONCAT(u2.jmeno, ' ', u2.prijmeni)") . " LIKE ?";
                $where_params[] = '%' . $garant_filter . '%';
            }
        }
        
        // Filtr pro příkazce a schvalovatele - pokud jsou stejné, použít OR logiku
        $prikazce_filter_raw = !empty($filters['prikazce_jmeno']) ? $filters['prikazce_jmeno'] : '';
        $schvalovatel_filter_raw = !empty($filters['schvalovatel_jmeno']) ? $filters['schvalovatel_jmeno'] : '';
        $prikazce_filter = normalizeSearchString($prikazce_filter_raw);
        $schvalovatel_filter = normalizeSearchString($schvalovatel_filter_raw);
        
        // Pokud jsou oba filtry stejné (kombinovaný sloupec z FE), použít OR
        if ($prikazce_filter && $schvalovatel_filter && $prikazce_filter === $schvalovatel_filter) {
            $where_conditions[] = "(" . sqlNormalizeExpression("CONCAT(u3.jmeno, ' ', u3.prijmeni)") . " LIKE ? OR " . sqlNormalizeExpression("CONCAT(u4.jmeno, ' ', u4.prijmeni)") . " LIKE ?)";
            $where_params[] = '%' . $prikazce_filter . '%';
            $where_params[] = '%' . $prikazce_filter . '%';
        } else {
            // Jinak jsou to samostatné filtry, použít AND
            if ($prikazce_filter) {
                $where_conditions[] = sqlNormalizeExpression("CONCAT(u3.jmeno, ' ', u3.prijmeni)") . " LIKE ?";
                $where_params[] = '%' . $prikazce_filter . '%';
            }
            if ($schvalovatel_filter) {
                $where_conditions[] = sqlNormalizeExpression("CONCAT(u4.jmeno, ' ', u4.prijmeni)") . " LIKE ?";
                $where_params[] = '%' . $schvalovatel_filter . '%';
            }
        }
        
        // Filtr pro financování - hledá v JSON poli dle typu, názvu, LP kódů, smlouvy, atd.
        if (!empty($filters['financovani'])) {
            $financovani_search_raw = trim($filters['financovani']);
            $financovani_search = normalizeSearchString($financovani_search_raw);
            
            // Hledáme v:
            // 1. typ (LP) - při hledání "Limit", "Příslib" apod.
            // 2. LP kódy - pomocí JOIN na tabulku limitovaných příslibů (LPIT1, LPKO1, ...)
            // 3. cislo_smlouvy (pro SMLOUVA)
            // 4. individualni_schvaleni (pro INDIVIDUALNI_SCHVALENI)
            
            // Sestavení podmínek
            $financovani_conditions = [];
            
            // Původní LIKE na celý JSON (najde "LP", čísla smluv, texty)
            $financovani_conditions[] = sqlNormalizeExpression("o.financovani") . " LIKE ?";
            $where_params[] = '%' . $financovani_search . '%';
            
            // Hledání v čísle smlouvy
            $financovani_conditions[] = sqlNormalizeExpression("JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy'))") . " LIKE ?";
            $where_params[] = '%' . $financovani_search . '%';
            
            // Hledání v čísle pojistné události
            $financovani_conditions[] = sqlNormalizeExpression("JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.pojistna_udalost_cislo'))") . " LIKE ?";
            $where_params[] = '%' . $financovani_search . '%';
            
            // Hledání v poznámce pojistné události
            $financovani_conditions[] = sqlNormalizeExpression("JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.poznamka'))") . " LIKE ?";
            $where_params[] = '%' . $financovani_search . '%';
            
            // Hledání v individuálním schválení
            $financovani_conditions[] = sqlNormalizeExpression("JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.individualni_schvaleni'))") . " LIKE ?";
            $where_params[] = '%' . $financovani_search . '%';
            
            // Rozpoznání textů "Limit", "Příslib" -> hledat typ=LP
            $search_norm = $financovani_search;

            $lp_hint = false;
            if (stripos($search_norm, 'limit') !== false ||
                stripos($search_norm, 'lim') !== false ||
                stripos($search_norm, 'prislib') !== false ||
                stripos($search_norm, 'prisli') !== false ||
                stripos($search_norm, 'prisl') !== false ||
                stripos($search_norm, 'pris') !== false) {
                $lp_hint = true;
            }

            if (!$lp_hint && preg_match('/\blp\b/u', $search_norm)) {
                $lp_hint = true;
            }

            if ($lp_hint) {
                $financovani_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.typ')) = 'LP'";
            }
            
            // Hledání v LP kódech (LPIT1, LPKO1, ...)
            $financovani_conditions[] = "EXISTS (
                SELECT 1 FROM " . TBL_LIMITOVANE_PRISLIBY . " lp
                WHERE " . sqlNormalizeExpression('lp.cislo_lp') . " LIKE ?
                AND JSON_SEARCH(
                    JSON_EXTRACT(o.financovani, '$.lp_kody'),
                    'one',
                    CAST(lp.id AS CHAR)
                ) IS NOT NULL
            )";
            $where_params[] = '%' . $financovani_search . '%';
            
            $where_conditions[] = "(" . implode(" OR ", $financovani_conditions) . ")";
        }
        
        // ✅ STARÝ FILTR ODSTRANĚN - viz řádek 663 pro správný filtr filters['stav'] jako pole
        
        // Filtr "moje objednávky" - kde jsem objednatel, garant, příkazce nebo schvalovatel
        if (!empty($filters['moje_objednavky']) && $filters['moje_objednavky'] === true) {
            $where_conditions[] = "(o.objednatel_id = ? OR o.garant_uzivatel_id = ? OR o.prikazce_id = ? OR o.schvalovatel_id = ?)";
            $where_params[] = $user_id;
            $where_params[] = $user_id;
            $where_params[] = $user_id;
            $where_params[] = $user_id;
        }
        
        // Filtr pro mimořádné události
        if (!empty($filters['mimoradne_udalosti']) && $filters['mimoradne_udalosti'] === true) {
            $where_conditions[] = "o.mimoradna_udalost = 1";
        }
        
        // Filtr pro objednávky s fakturami
        if (!empty($filters['s_fakturou']) && $filters['s_fakturou'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1)";
        }
        
        // Filtr pro objednávky s přílohami / bez příloh (vzájemně se vylučují)
        // Priorita: bez_obj_priloh > s_prilohami
        if (!empty($filters['bez_obj_priloh']) && $filters['bez_obj_priloh'] === true) {
            error_log("[OrderV3 FILTER] ✅ Aplikuji filtr BEZ_OBJ_PRILOH (negace s_prilohami)");
            error_log("[OrderV3 FILTER] Filters state: " . json_encode($filters));
            $where_conditions[] = "NOT EXISTS (SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p WHERE p.objednavka_id = o.id)";
        } elseif (!empty($filters['s_prilohami']) && $filters['s_prilohami'] === true) {
            error_log("[OrderV3 FILTER] ✅ Aplikuji filtr S_PRILOHAMI");
            error_log("[OrderV3 FILTER] Filters state: " . json_encode($filters));
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p WHERE p.objednavka_id = o.id)";
        }
        
        // Filtr pro objednávky s komentáři (všemi)
        if (!empty($filters['s_komentari']) && $filters['s_komentari'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_OBJEDNAVKY_KOMENTARE . " kom WHERE kom.objednavka_id = o.id AND kom.smazano = 0)";
        }
        
        // Filtr pro objednávky s mými komentáři
        if (!empty($filters['s_mymi_komentari']) && $filters['s_mymi_komentari'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_OBJEDNAVKY_KOMENTARE . " kom WHERE kom.objednavka_id = o.id AND kom.user_id = ? AND kom.smazano = 0)";
            $where_params[] = $user_id;
        }
        
        // ========================================================================
        // ❌ DUPLIKÁTNÍ LP FILTR ODSTRANĚN (řádky 854-871)
        // Důvod: LP kódy jsou uloženy v JSON poli o.financovani.lp_kody (hlavička objednávky),
        //        ne v položkách pol.lp_id. Používáme JSON filtr výše (řádky ~703-720).
        // Bug: Tento EXISTS filtr odfiltroval objednávky s LP v hlavičce, ale bez lp_id v položkách.
        // Fix: Používat POUZE JSON_SEARCH filtr (řádky 693-715)
        // ========================================================================
        
        // ========================================================================
        // 🔍 FULLTEXT SEARCH - hledání ve všech důležitých textových sloupcích
        // Case-insensitive + bez diakritiky
        // ========================================================================
        if (!empty($filters['fulltext_search'])) {
            $search_term = trim($filters['fulltext_search']);
            if ($search_term !== '') {
                // Odstranění diakritiky z vyhledávaného textu
                $search_term_normalized = normalizeSearchString($search_term);
                
                // Hledá v: číslo objednávky, předmět, dodavatel, jména uživatelů, poznámka
                // + FAKTURY: číslo, poznámka, věcná správnost
                // + PŘÍLOHY: název souboru, typ přílohy
                // + POLOŽKY: popis, poznámka
                // + UŽIVATELÉ: všechna uživatelská ID + emaily
                // + SMLOUVY: číslo a název smluv + individuální schválení z JSON
                // + LP KÓDY: číslo LP a název účtu z tabulky + kódy z JSON financování
                // Case-insensitive pomocí LOWER() a bez diakritiky pomocí REPLACE()
                $where_conditions[] = "(
                    " . sqlNormalizeExpression('o.cislo_objednavky') . " LIKE ? OR
                    " . sqlNormalizeExpression('o.predmet') . " LIKE ? OR
                    " . sqlNormalizeExpression('o.poznamka') . " LIKE ? OR
                    " . sqlNormalizeExpression('o.dodavatel_nazev') . " LIKE ? OR
                    o.dodavatel_ico LIKE ? OR
                    " . sqlNormalizeExpression("CONCAT(u1.prijmeni, ' ', u1.jmeno)") . " LIKE ? OR
                    LOWER(u1.email) LIKE ? OR
                    " . sqlNormalizeExpression("CONCAT(u2.prijmeni, ' ', u2.jmeno)") . " LIKE ? OR
                    LOWER(u2.email) LIKE ? OR
                    " . sqlNormalizeExpression("CONCAT(u3.prijmeni, ' ', u3.jmeno)") . " LIKE ? OR
                    LOWER(u3.email) LIKE ? OR
                    " . sqlNormalizeExpression("CONCAT(u4.prijmeni, ' ', u4.jmeno)") . " LIKE ? OR
                    LOWER(u4.email) LIKE ? OR
                    -- Další uživatelé přes dodatečné EXISTS (nemůžeme dělat nekonečně JOINů)
                    EXISTS (
                        SELECT 1 FROM " . TBL_UZIVATELE . " ux 
                        WHERE (
                            ux.id = o.uzivatel_id OR ux.id = o.uzivatel_akt_id OR ux.id = o.odesilatel_id OR 
                            ux.id = o.dodavatel_potvrdil_id OR ux.id = o.zverejnil_id OR ux.id = o.fakturant_id OR 
                            ux.id = o.dokoncil_id OR ux.id = o.potvrdil_vecnou_spravnost_id OR ux.id = o.zamek_uzivatel_id
                        ) AND (
                            " . sqlNormalizeExpression("CONCAT(ux.jmeno, ' ', ux.prijmeni)") . " LIKE ? OR
                            LOWER(ux.email) LIKE ?
                        )
                    ) OR
                    EXISTS (
                        SELECT 1 FROM " . TBL_FAKTURY . " f 
                        LEFT JOIN " . TBL_CISELNIK_STAVY . " cs
                          ON cs.kod_stavu = f.stav
                         AND cs.typ_objektu IN ('FAKTURA_STAV', 'FAKTURA_STATUS')
                        WHERE f.objednavka_id = o.id AND f.aktivni = 1 AND (
                            " . sqlNormalizeExpression('f.fa_cislo_vema') . " LIKE ? OR
                            " . sqlNormalizeExpression('f.fa_poznamka') . " LIKE ? OR
                            " . sqlNormalizeExpression('f.vecna_spravnost_poznamka') . " LIKE ? OR
                            " . sqlNormalizeExpression('f.vecna_spravnost_umisteni_majetku') . " LIKE ? OR
                            " . sqlNormalizeExpression('f.stav') . " LIKE ? OR
                            " . sqlNormalizeExpression('cs.nazev_stavu') . " LIKE ?
                        )
                    ) OR
                    EXISTS (
                        SELECT 1 FROM " . TBL_FAKTURY_PRILOHY . " fp
                        INNER JOIN " . TBL_FAKTURY . " ff ON fp.faktura_id = ff.id
                        WHERE ff.objednavka_id = o.id AND ff.aktivni = 1 AND (
                            " . sqlNormalizeExpression('fp.originalni_nazev_souboru') . " LIKE ? OR
                            " . sqlNormalizeExpression('fp.typ_prilohy') . " LIKE ?
                        )
                    ) OR
                    EXISTS (
                        SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " pr
                        WHERE pr.objednavka_id = o.id AND (
                            " . sqlNormalizeExpression('pr.originalni_nazev_souboru') . " LIKE ? OR
                            " . sqlNormalizeExpression('pr.typ_prilohy') . " LIKE ?
                        )
                    ) OR
                    EXISTS (
                        SELECT 1 FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol
                        WHERE pol.objednavka_id = o.id AND (
                            " . sqlNormalizeExpression('pol.popis') . " LIKE ? OR
                            " . sqlNormalizeExpression('pol.poznamka') . " LIKE ?
                        )
                    )
                )";
                
                $search_pattern = '%' . $search_term_normalized . '%';
                
                // Celkem 27 parametrů pro fulltext (včetně dodavatel_ico)
                for ($i = 0; $i < 27; $i++) {
                    $where_params[] = $search_pattern;
                }
                
                error_log("[OrderV3 FULLTEXT] Fulltext search applied: '$search_term' (normalized: '$search_term_normalized')");
            }
        }
        
        // Filtr pro dodavatele (mapování z dodavatel_nazev na dodavatel)
        if (!empty($filters['dodavatel'])) {
            $filter_value = normalizeSearchString($filters['dodavatel']);
            $where_conditions[] = sqlNormalizeExpression('o.dodavatel_nazev') . " LIKE ?";
            $where_params[] = '%' . $filter_value . '%';
        }
        
        // Datumové filtry
        if (!empty($filters['datum_od'])) {
            $where_conditions[] = "DATE(o.dt_objednavky) >= ?";
            $where_params[] = $filters['datum_od'];
        }
        
        if (!empty($filters['datum_do'])) {
            $where_conditions[] = "DATE(o.dt_objednavky) <= ?";
            $where_params[] = $filters['datum_do'];
        }
        
        // Přesné datum z tabulkového sloupce
        if (!empty($filters['datum_presne'])) {
            $where_conditions[] = "DATE(o.dt_objednavky) = ?";
            $where_params[] = $filters['datum_presne'];
        }
        
        // Číselné filtry s operátory (>=10000, <=50000, =25000)
        // Format: ">=10000" nebo ">10000" nebo "=10000"
        
        // DEBUG: Log příchozích číselných filtrů
        if (!empty($filters['cena_max']) || !empty($filters['cena_polozky']) || !empty($filters['cena_faktury'])) {
            error_log("[OrderV3] Number filters received: cena_max=" . ($filters['cena_max'] ?? 'null') . 
                      ", cena_polozky=" . ($filters['cena_polozky'] ?? 'null') . 
                      ", cena_faktury=" . ($filters['cena_faktury'] ?? 'null'));
        }
        
        // max_cena_s_dph - maximální cena objednávky
        // Podporuje buď operátory (>=10000) nebo rozsah (cena_max + cena_max_to)
        if (!empty($filters['cena_max'])) {
            $parsed = parseOperatorValue($filters['cena_max']);
            if ($parsed) {
                error_log("[OrderV3] Parsed cena_max: operator={$parsed['operator']}, value={$parsed['value']}");
                $where_conditions[] = "o.max_cena_s_dph {$parsed['operator']} ?";
                $where_params[] = $parsed['value'];
            } else {
                error_log("[OrderV3] Failed to parse cena_max: {$filters['cena_max']}");
            }
        }
        
        // Cenový rozsah (od-do) z filtrovacího panelu
        if (!empty($filters['cena_max_od']) && !empty($filters['cena_max_do'])) {
            $where_conditions[] = "o.max_cena_s_dph BETWEEN ? AND ?";
            $where_params[] = floatval($filters['cena_max_od']);
            $where_params[] = floatval($filters['cena_max_do']);
        } elseif (!empty($filters['cena_max_od'])) {
            $where_conditions[] = "o.max_cena_s_dph >= ?";
            $where_params[] = floatval($filters['cena_max_od']);
        } elseif (!empty($filters['cena_max_do'])) {
            $where_conditions[] = "o.max_cena_s_dph <= ?";
            $where_params[] = floatval($filters['cena_max_do']);
        }
        
        // cena_polozky - součet cen položek (HAVING klauzule kvůli subquery)
        if (!empty($filters['cena_polozky'])) {
            $parsed = parseOperatorValue($filters['cena_polozky']);
            if ($parsed) {
                // Použijeme EXISTS s subquery, protože nemůžeme použít HAVING ve WHERE
                $where_conditions[] = "EXISTS (
                    SELECT 1 
                    FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                    WHERE pol.objednavka_id = o.id 
                    GROUP BY pol.objednavka_id 
                    HAVING SUM(pol.cena_s_dph) {$parsed['operator']} ?
                )";
                $where_params[] = $parsed['value'];
            }
        }
        
        // cena_faktury - součet částek faktur
        if (!empty($filters['cena_faktury'])) {
            $parsed = parseOperatorValue($filters['cena_faktury']);
            if ($parsed) {
                // Použijeme EXISTS s subquery
                $where_conditions[] = "EXISTS (
                    SELECT 1 
                    FROM " . TBL_FAKTURY . " f 
                    WHERE f.objednavka_id = o.id AND f.aktivni = 1
                    GROUP BY f.objednavka_id 
                    HAVING SUM(f.fa_castka) {$parsed['operator']} ?
                )";
                $where_params[] = $parsed['value'];
            }
        }
        
        // ========================================================================
        // STAV REGISTRU (checkboxy: publikováno, nepublikováno, nezveřejňovat)
        // ========================================================================
        if (!empty($filters['stav_registru']) && is_array($filters['stav_registru'])) {
            $stav_conditions = array();
            
            foreach ($filters['stav_registru'] as $stav) {
                switch ($stav) {
                    case 'publikovano':
                        // Bylo zveřejněno v registru (musí mít DT + IDDT, případně explicitní stav)
                        $stav_conditions[] = "(
                            (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
                            OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
                        )";
                        break;
                    case 'nepublikovano':
                        // Má být zveřejněno, ale ještě nebylo
                        $stav_conditions[] = "(
                            (
                                JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'UVEREJNIT'
                                OR " . sqlNormalizeExpression('o.zverejnit') . " = 'ano'
                                OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'ke zverejneni'
                            )
                            AND NOT (
                                (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
                                OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
                            )
                        )";
                        break;
                    case 'nezverejnovat':
                        // Nemá být vůbec zveřejněno - stav "NEUVEREJNIT" nebo jiné neaktivní stavy
                        $stav_conditions[] = "(
                            " . sqlNormalizeExpression('o.stav_objednavky') . " = 'neuverejnit'
                            OR (
                                " . sqlNormalizeExpression('o.stav_objednavky') . " NOT IN ('ke zverejneni', 'uverejnena v registru smluv')
                                AND o.dt_zverejneni IS NULL
                                AND o.registr_iddt IS NULL
                            )
                        )";
                        break;
                }
            }
            
            if (!empty($stav_conditions)) {
                $where_conditions[] = '(' . implode(' OR ', $stav_conditions) . ')';
            }
        }

        // ========================================================================
        // USER PERMISSIONS - Order V2 COMPATIBLE IMPLEMENTATION
        // ========================================================================
        // 🎯 PODLE ZADÁNÍ: "naprosto identicky vc. zohledneni prip. org heirachie"
        // Používáme STEJNOU logiku jako Order V2 pro maximální kompatibilitu!
        // ✅ JEDNOTNÁ FUNKCE pro všechny endpointy (list, stats, count)
        // ========================================================================
        
        // 🔍 Zapamatovat si počet podmínek PŘED permissions (pro stats)
        $business_filter_count = count($where_conditions);
        $business_filter_params = $where_params; // Shallow copy parametrů
        
        $is_admin_v2 = applyOrderV3UserPermissions($user_id, $db, $where_conditions, $where_params);

        $where_sql = implode(' AND ', $where_conditions);

        // 9. Sestavit ORDER BY
        error_log("[OrderV3] Sorting params received: " . json_encode($sorting));
        $order_by_parts = array();
        if (!empty($sorting)) {
            foreach ($sorting as $sort) {
                if (isset($sort['id'])) {
                    $column = $sort['id'];
                    $direction = isset($sort['desc']) && $sort['desc'] ? 'DESC' : 'ASC';
                    error_log("[OrderV3] Processing sort: column='{$column}', direction='{$direction}'");
                    
                    // Mapování sloupců
                    $column_map = array(
                        // Datumy
                        'dt_objednavky' => 'o.dt_objednavky',
                        'dt_vytvoreni' => 'o.dt_vytvoreni',
                        'dt_aktualizace' => 'o.dt_aktualizace',
                        'dt_zverejneni' => 'o.dt_zverejneni',
                        
                        // Základní info
                        'cislo_objednavky' => 'o.cislo_objednavky',
                        'predmet' => 'o.predmet',

                        // Financování (UI umožňuje sort)
                        // Pozn.: `o.financovani` je ukládáno jako text/JSON - řadíme lexikograficky.
                        'financovani' => 'o.financovani',
                        
                        // Dodavatel
                        'dodavatel_nazev' => 'COALESCE(o.dodavatel_nazev, d.nazev)',
                        'dodavatel_ico' => 'COALESCE(o.dodavatel_ico, d.ico)',
                        
                        // Osoby - staré názvy (backward compatibility)
                        'objednatel_jmeno' => 'u1.prijmeni',
                        'garant_jmeno' => 'u2.prijmeni',
                        'prikazce_jmeno' => 'u3.prijmeni',
                        'schvalovatel_jmeno' => 'u4.prijmeni',
                        
                        // Osoby - kombinované sloupce (třídí podle PRVNÍHO jména)
                        'objednatel_garant' => 'u1.prijmeni', // ✅ Třídí podle objednatele
                        'prikazce_schvalovatel' => 'u3.prijmeni', // ✅ Třídí podle příkazce
                        
                        // Ceny
                        'max_cena_s_dph' => 'o.max_cena_s_dph',
                        'cena_s_dph' => 'cena_s_dph',
                        'faktury_celkova_castka_s_dph' => 'faktury_celkova_castka_s_dph',
                        
                        // Stavy
                        'stav_objednavky' => 'o.stav_objednavky',
                        'mimoradna_udalost' => 'o.mimoradna_udalost',

                        // REGISTR (UI sloupec `stav_registru`)
                        // Řazení podle stavu registru:
                        // 2 = zveřejněno (má dt_zverejneni nebo registr_iddt)
                        // 1 = má být zveřejněno (zverejnit=1 / "ANO")
                        // 0 = prázdné/ostatní
                        'stav_registru' => "(
                            CASE
                                WHEN (o.dt_zverejneni IS NOT NULL OR o.registr_iddt IS NOT NULL) THEN 2
                                WHEN (
                                    o.zverejnit = 1
                                    OR UPPER(TRIM(COALESCE(o.zverejnit, ''))) IN ('ANO','YES','TRUE')
                                ) THEN 1
                                ELSE 0
                            END
                        )",
                        
                        // Počty
                        'pocet_polozek' => 'pocet_polozek',
                        'pocet_priloh' => 'pocet_priloh',
                        'pocet_faktur' => 'pocet_faktur'
                    );
                    
                    if (isset($column_map[$column])) {
                        $mapped_column = $column_map[$column];
                        $order_by_parts[] = $mapped_column . ' ' . $direction;
                        error_log("[OrderV3] Mapped sort: '{$column}' -> '{$mapped_column} {$direction}'");
                    } else {
                        error_log("[OrderV3] WARNING: Unmapped sort column: '{$column}'");
                    }
                }
            }
        }
        
        // Výchozí třídění
        if (empty($order_by_parts)) {
            $order_by_parts[] = 'o.dt_objednavky DESC';
            error_log("[OrderV3] Using default sort: o.dt_objednavky DESC");
        }
        
        $order_by_sql = implode(', ', $order_by_parts);
        error_log("[OrderV3] Final ORDER BY: {$order_by_sql}");

        // 10. Spočítat celkový počet záznamů
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
        $stmt_count->closeCursor();
        $total_pages = ceil($total_count / $per_page);

        // 11. Načíst statistiky (pokud je první stránka)
        $stats = null;
        $unfilteredStats = null;
        
        $should_calculate_stats = ($page === 1) || ($business_filter_count > 2);

        if ($should_calculate_stats) {
            // 🎯 unfilteredStats - Bez business filtrů, ale SE permissions!
            // Permissions se aplikují UVNITŘ getOrderStatsWithPeriod pomocí applyOrderV3UserPermissions
            $unfilteredStats = getOrderStatsWithPeriod($db, $period, $user_id, null, array());
            
            // 🔍 Pokud jsou aktivní business filtry, načíst i filtrované stats
            // Extrahujeme jen business podmínky BEZ permissions (ty přidá stats funkce sama)
            if ($business_filter_count > 2) { // > 2 protože máme aktivni=1 a id!=1
                // Sestavit business WHERE bez permissions
                $business_where_conditions = array_slice($where_conditions, 0, $business_filter_count);
                $business_where_sql = implode(' AND ', $business_where_conditions);
                
                error_log("[OrderV3] Filtered stats - business filters: " . $business_filter_count);
                $stats = getOrderStatsWithPeriod($db, $period, $user_id, $business_where_sql, $business_filter_params);
            } else {
                // Bez business filtrů jsou stats stejné jako unfilteredStats
                $stats = $unfilteredStats;
            }
        }

        // 12. Hlavní query pro data
        $sql_orders = "
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.predmet,
                o.poznamka,
                o.dt_objednavky,
                o.dt_vytvoreni,
                o.dt_aktualizace,
                o.dt_schvaleni,
                o.dt_odeslani,
                o.dt_akceptace,
                o.dt_zverejneni,
                o.dt_dokonceni,
                o.financovani,
                o.druh_objednavky_kod,
                o.max_cena_s_dph,
                o.stav_objednavky,
                o.stav_workflow_kod,
                o.mimoradna_udalost,
                o.zverejnit,
                o.registr_iddt,
                o.zverejnil_id,
                o.dokoncil_id,
                o.fakturant_id,
                o.dt_faktura_pridana,
                o.potvrdil_vecnou_spravnost_id,
                o.dt_potvrzeni_vecne_spravnosti,
                
                -- Dodavatel - prioritizovat přímé sloupce z objednávky, pak z číselníku
                o.dodavatel_id,
                COALESCE(o.dodavatel_nazev, d.nazev) as dodavatel_nazev,
                COALESCE(o.dodavatel_ico, d.ico) as dodavatel_ico,
                o.dodavatel_adresa,
                o.dodavatel_kontakt_jmeno,
                o.dodavatel_kontakt_email,
                o.dodavatel_kontakt_telefon,
                
                -- Objednatel
                u1.id as objednatel_id,
                u1.jmeno as objednatel_jmeno,
                u1.prijmeni as objednatel_prijmeni,
                u1.titul_pred as objednatel_titul_pred,
                u1.titul_za as objednatel_titul_za,
                u1.email as objednatel_email,
                
                -- Vytvořil (užíváme pro fallback pokud není objednatel)
                COALESCE(o.objednatel_id, o.uzivatel_id) as vytvoril_id,
                
                -- Garant
                u2.id as garant_id,
                u2.jmeno as garant_jmeno,
                u2.prijmeni as garant_prijmeni,
                
                -- Příkazce
                u3.id as prikazce_id,
                u3.jmeno as prikazce_jmeno,
                u3.prijmeni as prikazce_prijmeni,
                
                -- Schvalovatel
                u4.id as schvalovatel_id,
                u4.jmeno as schvalovatel_jmeno,
                u4.prijmeni as schvalovatel_prijmeni,
                u4.titul_pred as schvalovatel_titul_pred,
                u4.titul_za as schvalovatel_titul_za,
                
                -- Odesilatel (osoba, která odeslala dodavateli)
                u5.id as odesilatel_id,
                u5.jmeno as odesilatel_jmeno,
                u5.prijmeni as odesilatel_prijmeni,
                u5.titul_pred as odesilatel_titul_pred,
                u5.titul_za as odesilatel_titul_za,
                
                -- Dodavatel potvrdil (osoba, která potvrdila)
                u6.id as dodavatel_potvrdil_id,
                u6.jmeno as dodavatel_potvrdil_jmeno,
                u6.prijmeni as dodavatel_potvrdil_prijmeni,
                u6.titul_pred as dodavatel_potvrdil_titul_pred,
                u6.titul_za as dodavatel_potvrdil_titul_za,
                
                -- Zveřejnil
                u7.id as zverejnil_uid,
                u7.jmeno as zverejnil_jmeno,
                u7.prijmeni as zverejnil_prijmeni,
                u7.titul_pred as zverejnil_titul_pred,
                u7.titul_za as zverejnil_titul_za,
                
                -- Dokončil objednávku
                u8.id as dokoncil_uid,
                u8.jmeno as dokoncil_jmeno,
                u8.prijmeni as dokoncil_prijmeni,
                u8.titul_pred as dokoncil_titul_pred,
                u8.titul_za as dokoncil_titul_za,
                
                -- Fakturant (osoba, která přidala fakturu)
                u9.id as fakturant_uid,
                u9.jmeno as fakturant_jmeno,
                u9.prijmeni as fakturant_prijmeni,
                u9.titul_pred as fakturant_titul_pred,
                u9.titul_za as fakturant_titul_za,
                
                -- Potvrdil věcnou správnost
                u10.id as potvrdil_vecnou_spravnost_uid,
                u10.jmeno as potvrdil_vecnou_spravnost_jmeno,
                u10.prijmeni as potvrdil_vecnou_spravnost_prijmeni,
                u10.titul_pred as potvrdil_vecnou_spravnost_titul_pred,
                u10.titul_za as potvrdil_vecnou_spravnost_titul_za,
                
                -- Počet položek
                (SELECT COUNT(*) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) as pocet_polozek,
                
                -- Součet cen položek (cena_s_dph)
                (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) as cena_s_dph,
                
                -- Počet příloh
                (SELECT COUNT(*) FROM " . TBL_OBJEDNAVKY_PRILOHY . " pr WHERE pr.objednavka_id = o.id) as pocet_priloh,
                
                -- Faktury - součet a count
                (SELECT COUNT(*) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) as pocet_faktur,
                (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) as faktury_celkova_castka_s_dph,
                
                -- 🆕 Kontrola a komentáře (Order V3)
                o.kontrola_metadata,
                (SELECT COUNT(*) FROM 25a_objednavky_komentare kom WHERE kom.objednavka_id = o.id AND kom.smazano = 0) as comments_count,
                
                -- 🆕 Poslední komentář (pro bubble tooltip)
                (SELECT CONCAT(u.jmeno, ' ', u.prijmeni)
                 FROM 25a_objednavky_komentare kom
                 INNER JOIN " . TBL_UZIVATELE . " u ON kom.user_id = u.id
                 WHERE kom.objednavka_id = o.id AND kom.smazano = 0
                 ORDER BY kom.dt_vytvoreni DESC
                 LIMIT 1) as last_comment_author,
                
                (SELECT kom.dt_vytvoreni
                 FROM 25a_objednavky_komentare kom
                 WHERE kom.objednavka_id = o.id AND kom.smazano = 0
                 ORDER BY kom.dt_vytvoreni DESC
                 LIMIT 1) as last_comment_date
                
                -- 🆕 Zjistit, zda aktuální uživatel reagoval na nějaký komentář
                -- ⚠️ DISABLED: Způsobovalo problém s PDO parametry
                -- (SELECT COUNT(*) > 0
                --  FROM 25a_objednavky_komentare kom
                --  WHERE kom.objednavka_id = o.id 
                --    AND kom.user_id = ?
                --    AND kom.smazano = 0) as user_has_replied
                
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
            LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
            LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
            LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
            LEFT JOIN " . TBL_UZIVATELE . " u5 ON o.odesilatel_id = u5.id
            LEFT JOIN " . TBL_UZIVATELE . " u6 ON o.dodavatel_potvrdil_id = u6.id
            LEFT JOIN " . TBL_UZIVATELE . " u7 ON o.zverejnil_id = u7.id
            LEFT JOIN " . TBL_UZIVATELE . " u8 ON o.dokoncil_id = u8.id
            LEFT JOIN " . TBL_UZIVATELE . " u9 ON o.fakturant_id = u9.id
            LEFT JOIN " . TBL_UZIVATELE . " u10 ON o.potvrdil_vecnou_spravnost_id = u10.id
            WHERE $where_sql
            ORDER BY $order_by_sql
            LIMIT $per_page OFFSET $offset
        ";
        
        
        // Přidat user_id pro subselect user_has_replied
        // ⚠️ DISABLED: user_has_replied subselect removed, no need for extra param
        $final_params = $where_params;
        
        $stmt_orders = $db->prepare($sql_orders);
        $stmt_orders->execute($final_params);
        $orders = $stmt_orders->fetchAll(PDO::FETCH_ASSOC);
        if (count($orders) > 0) {
            $order_ids = array_column($orders, 'id');
            $order_nums = array_column($orders, 'cislo_objednavky');
            error_log("[OrderV3 RESULT] First 10 order IDs: " . implode(', ', array_slice($order_ids, 0, 10)));
            error_log("[OrderV3 RESULT] First 10 order numbers: " . implode(', ', array_slice($order_nums, 0, 10)));
            
            // 🔍 Speciální check pro O-0404 (ID 415)
            if (in_array(415, $order_ids)) {
                error_log("[OrderV3 RESULT] ✅ ORDER 415 (O-0404) JE VRACENA!");
            } else {
                error_log("[OrderV3 RESULT] ❌ ORDER 415 (O-0404) NENÍ VRACENA!");
            }
        }

        // 13. Post-processing - parsování JSON polí a enrichment
        
        foreach ($orders as &$order) {
            // Parsovat financovani z TEXT/JSON do array
            if (isset($order['financovani'])) {
                $order['financovani'] = parseFinancovani($order['financovani']);
            }
            
            // Parsovat stav_workflow_kod z JSON do array
            if (isset($order['stav_workflow_kod'])) {
                $order['stav_workflow_kod'] = safeJsonDecode($order['stav_workflow_kod'], array());
            }
            
            // ENRICHMENT - obohacení dat z dalších tabulek
            enrichFinancovaniV3($db, $order);
            enrichDodavatelV3($db, $order);
            enrichRegistrZverejneniV3($db, $order);
            enrichOrderWithInvoices($db, $order); // ✅ Přidáno načítání faktur pro workflow tooltip
        }
        unset($order);

        // 14. Úspěšná odpověď
        http_response_code(200);
        $response = array(
            'status' => 'success',
            'data' => array(
                'orders' => $orders,
                'pagination' => array(
                    'page' => $page,
                    'per_page' => $per_page,
                    'total' => $total_count,
                    'total_pages' => $total_pages
                )
            ),
            'message' => 'Data načtena úspěšně'
        );
        
        if ($stats !== null) {
            $response['data']['stats'] = $stats;
        }
        
        if ($unfilteredStats !== null) {
            $response['data']['unfilteredStats'] = $unfilteredStats;
        }
        
        echo json_encode($response);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání objednávek: ' . $e->getMessage()
        ));
    }
}

/**
 * Načte přehled majetkových objednávek (MAJETEK) pro přehled majetku
 * POST /order-v3/majetek-list
 *
 * Podporuje period + filtr stav[] (workflow) a vrací rozšířená data:
 * - polozky_celkova_cena_s_dph
 * - umisteni_polozky (usek/budova/mistnost)
 * - strediska_nazvy
 * - druh_objednavky_nazev
 */
function handle_order_v3_majetek_list($input, $config, $queries) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

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

    $user_id = isset($token_data['id']) ? (int)$token_data['id'] : 0;

    try {
        error_log('[OrderV3 MAJETEK] Start, input=' . json_encode($input));
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
        $per_page = isset($input['per_page']) ? max(1, min(500, (int)$input['per_page'])) : 50;
        $offset = ($page - 1) * $per_page;

        $period = isset($input['period']) ? $input['period'] : 'last-month';
        $filters = isset($input['filters']) ? $input['filters'] : array();

        $where_conditions = array();
        $where_params = array();

        $where_conditions[] = "o.aktivni = 1";
        $where_conditions[] = "o.id != 1";

        $period_range = calculatePeriodRange($period);
        if ($period_range !== null) {
            $where_conditions[] = "o.dt_objednavky BETWEEN ? AND ?";
            $where_params[] = $period_range['date_from'];
            $where_params[] = $period_range['date_to'];
        }

        // Filtr: pouze MAJETEK druhy (atribut_objektu = 1)
        $sql_majetek_codes = "SELECT kod_stavu FROM " . TBL_CISELNIK_STAVY . " WHERE typ_objektu = 'DRUH_OBJEDNAVKY' AND atribut_objektu = 1";
        $stmt_majetek = $db->prepare($sql_majetek_codes);
        $stmt_majetek->execute();
        $majetek_codes = $stmt_majetek->fetchAll(PDO::FETCH_COLUMN);
        error_log('[OrderV3 MAJETEK] Majetek codes count=' . count($majetek_codes));

        if (empty($majetek_codes)) {
            http_response_code(200);
            echo json_encode(array(
                'status' => 'success',
                'data' => array(
                    'orders' => array(),
                    'pagination' => array(
                        'page' => $page,
                        'per_page' => $per_page,
                        'total' => 0,
                        'total_pages' => 0
                    )
                ),
                'message' => 'Data načtena úspěšně'
            ));
            return;
        }

        $placeholders = implode(',', array_fill(0, count($majetek_codes), '?'));
        $where_conditions[] = "(CASE 
            WHEN o.druh_objednavky_kod LIKE '{%' THEN JSON_UNQUOTE(JSON_EXTRACT(o.druh_objednavky_kod, '$.kod_stavu'))
            ELSE o.druh_objednavky_kod
        END) IN ($placeholders)";
        $where_params = array_merge($where_params, $majetek_codes);

        // Filtr: stav workflow (poslední stav)
        if (!empty($filters['stav']) && is_array($filters['stav'])) {
            $stav_map = array(
                'NOVA' => 'NOVA',
                'KE_SCHVALENI' => 'ODESLANA_KE_SCHVALENI',
                'SCHVALENA' => 'SCHVALENA',
                'ZAMITNUTA' => 'ZAMITNUTA',
                'ROZPRACOVANA' => 'ROZPRACOVANA',
                'ODESLANA' => 'ODESLANA',
                'POTVRZENA' => 'POTVRZENA',
                'K_UVEREJNENI_DO_REGISTRU' => 'UVEREJNIT',
                'FAKTURACE' => 'FAKTURACE',
                'VECNA_SPRAVNOST' => 'VECNA_SPRAVNOST',
                'ZKONTROLOVANA' => 'ZKONTROLOVANA',
                'DOKONCENA' => 'DOKONCENA',
                'ZRUSENA' => 'ZRUSENA',
                'SMAZANA' => 'SMAZANA'
            );

            $workflow_codes = array();
            foreach ($filters['stav'] as $stav_value) {
                $key = strtoupper(trim($stav_value));
                $workflow_codes[] = isset($stav_map[$key]) ? $stav_map[$key] : $key;
            }

            $workflow_codes = array_values(array_unique(array_filter($workflow_codes)));
            if (!empty($workflow_codes)) {
                $wf_placeholders = implode(',', array_fill(0, count($workflow_codes), '?'));
                $where_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) IN ($wf_placeholders)";
                $where_params = array_merge($where_params, $workflow_codes);
            }
        }

        // Permissions
        applyOrderV3UserPermissions($user_id, $db, $where_conditions, $where_params);

        $where_sql = implode(' AND ', $where_conditions);

        $sql_count = "
            SELECT COUNT(DISTINCT o.id) as total
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            WHERE $where_sql
        ";
        $stmt_count = $db->prepare($sql_count);
        $stmt_count->execute($where_params);
        $total_count = (int)$stmt_count->fetchColumn();
        $total_pages = $total_count > 0 ? ceil($total_count / $per_page) : 0;
        error_log('[OrderV3 MAJETEK] Count=' . $total_count . ', pages=' . $total_pages);

        $sql_orders = "
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.predmet,
                o.dt_objednavky,
                o.stav_workflow_kod,
                o.max_cena_s_dph,
                o.druh_objednavky_kod,
                o.strediska_kod,
                COALESCE(o.dodavatel_nazev, d.nazev) as dodavatel_nazev,
                (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) as polozky_celkova_cena_s_dph,
                (SELECT COUNT(*) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) as pocet_faktur,
                (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) as faktury_celkova_castka_s_dph
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            WHERE $where_sql
            ORDER BY o.dt_objednavky DESC
            LIMIT $per_page OFFSET $offset
        ";

        $stmt_orders = $db->prepare($sql_orders);
        $stmt_orders->execute($where_params);
        $orders = $stmt_orders->fetchAll(PDO::FETCH_ASSOC);
        error_log('[OrderV3 MAJETEK] Orders loaded=' . count($orders));

        if (!empty($orders)) {
            $order_ids = array_column($orders, 'id');
            $order_placeholders = implode(',', array_fill(0, count($order_ids), '?'));

            // Načíst umístění položek pro všechny objednávky v dávce
            $sql_items = "
                SELECT objednavka_id, usek_kod, budova_kod, mistnost_kod, poznamka
                FROM " . TBL_OBJEDNAVKY_POLOZKY . "
                WHERE objednavka_id IN ($order_placeholders)
                ORDER BY id ASC
            ";
            $stmt_items = $db->prepare($sql_items);
            $stmt_items->execute($order_ids);
            $items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

            $items_by_order = array();
            foreach ($items as $item) {
                $oid = (int)$item['objednavka_id'];
                if (!isset($items_by_order[$oid])) {
                    $items_by_order[$oid] = array();
                }
                $items_by_order[$oid][] = array(
                    'usek_kod' => $item['usek_kod'],
                    'budova_kod' => $item['budova_kod'],
                    'mistnost_kod' => $item['mistnost_kod'],
                    'poznamka' => $item['poznamka']
                );
            }

            // Přednačíst druhy objednávek (kod -> nazev)
            $druh_kody = array();
            foreach ($orders as $order) {
                $druh_kod = $order['druh_objednavky_kod'] ?? null;
                if (!$druh_kod) continue;
                $decoded = json_decode($druh_kod, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && isset($decoded['kod_stavu'])) {
                    $druh_kod = $decoded['kod_stavu'];
                }
                if ($druh_kod) {
                    $druh_kody[] = $druh_kod;
                }
            }
            $druh_kody = array_values(array_unique(array_filter($druh_kody)));
            $druh_map = array();
            if (!empty($druh_kody)) {
                $druh_placeholders = implode(',', array_fill(0, count($druh_kody), '?'));
                $sql_druhy = "SELECT kod_stavu, nazev_stavu, atribut_objektu FROM " . TBL_CISELNIK_STAVY . " WHERE typ_objektu = 'DRUH_OBJEDNAVKY' AND kod_stavu IN ($druh_placeholders)";
                $stmt_druhy = $db->prepare($sql_druhy);
                $stmt_druhy->execute($druh_kody);
                $druhy = $stmt_druhy->fetchAll(PDO::FETCH_ASSOC);
                foreach ($druhy as $druh) {
                    $druh_map[$druh['kod_stavu']] = $druh;
                }
            }

            $strediska_cache = array();

            foreach ($orders as &$order) {
                $order_id = (int)$order['id'];

                // workflow JSON -> array
                if (isset($order['stav_workflow_kod'])) {
                    $order['stav_workflow_kod'] = safeJsonDecode($order['stav_workflow_kod'], array());
                }

                // Umístění položek
                $order['umisteni_polozky'] = isset($items_by_order[$order_id]) ? $items_by_order[$order_id] : array();

                // Střediska - názvy
                if (!empty($order['strediska_kod'])) {
                    $cache_key = $order['strediska_kod'];
                    if (isset($strediska_cache[$cache_key])) {
                        $order['strediska_nazvy'] = $strediska_cache[$cache_key];
                    } else {
                        $strediska_array = json_decode($order['strediska_kod'], true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($strediska_array)) {
                            $strediska_enriched = loadStrediskaByKod($db, $strediska_array);
                            $strediska_nazvy = array_column($strediska_enriched, 'nazev');
                            $strediska_cache[$cache_key] = implode(', ', $strediska_nazvy);
                            $order['strediska_nazvy'] = $strediska_cache[$cache_key];
                        }
                    }
                }

                // Druh objednávky - název
                if (!empty($order['druh_objednavky_kod'])) {
                    $druh_kod = $order['druh_objednavky_kod'];
                    $decoded = json_decode($druh_kod, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && isset($decoded['kod_stavu'])) {
                        $druh_kod = $decoded['kod_stavu'];
                    }
                    if ($druh_kod && isset($druh_map[$druh_kod])) {
                        $order['druh_objednavky_nazev'] = $druh_map[$druh_kod]['nazev_stavu'];
                        $order['druh_objednavky_atribut'] = isset($druh_map[$druh_kod]['atribut_objektu']) ? (int)$druh_map[$druh_kod]['atribut_objektu'] : 0;
                    }
                }
            }
            unset($order);
        }

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'orders' => $orders,
                'pagination' => array(
                    'page' => $page,
                    'per_page' => $per_page,
                    'total' => $total_count,
                    'total_pages' => $total_pages
                )
            ),
            'message' => 'Data načtena úspěšně'
        ));

    } catch (Exception $e) {
        error_log('[OrderV3 MAJETEK] ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání majetku: ' . $e->getMessage()
        ));
    }
}

/**
 * Načte statistiky objednávek pro daný rok
 * @param PDO $db Database connection
 * @param int $year Rok pro filtrování
 * @param int $user_id ID přihlášeného uživatele (pro "moje objednávky")
 * @param string $filtered_where_sql WHERE podmínky pro filtrované objednávky (volitelné)
 * @param array $filtered_where_params Parametry pro WHERE podmínky (volitelné)
 */
/**
 * Wrapper funkce pro statistiky s podporou období
 * @param PDO $db
 * @param string $period - 'all', 'current-month', 'last-month', 'last-quarter', 'all-months'
 * @param int $user_id
 * @param string|null $filtered_where_sql - Volitelné dodatečné WHERE podmínky
 * @param array $filtered_where_params - Parametry pro additional WHERE
 * @return array Statistiky
 */
function getOrderStatsWithPeriod($db, $period, $user_id = 0, $filtered_where_sql = null, $filtered_where_params = array()) {
    $period_range = calculatePeriodRange($period);
    
    error_log("[OrderV3 STATS] User ID: {$user_id}, Period: {$period}");
    if ($period_range) {
        error_log("[OrderV3 STATS] Period range: {$period_range['date_from']} to {$period_range['date_to']}");
    }
    
    // Sestavit WHERE podmínky
    $where_conditions = array();
    $where_params = array();
    
    // 1. Aktivní objednávky (vždy)
    $where_conditions[] = "o.aktivni = 1";
    
    // ⚠️ IGNORE testovací/vzorová objednávka s ID 1 - VŽDY vyloučit ze všech výsledků
    $where_conditions[] = "o.id != 1";
    
    // 2. Period filtr
    if ($period_range !== null) {
        $where_conditions[] = "o.dt_objednavky BETWEEN ? AND ?";
        $where_params[] = $period_range['date_from'];
        $where_params[] = $period_range['date_to'];
    }
    
    // 3. ✅ CRITICAL: User permissions - STEJNÁ LOGIKA JAKO handle_order_v3_list!
    // Používáme jednotnou funkci applyOrderV3UserPermissions pro konzistenci
    $is_admin = applyOrderV3UserPermissions($user_id, $db, $where_conditions, $where_params);
    
    // 4. Dodatečné filtry (pokud jsou předané z hlavní query)
    if ($filtered_where_sql !== null && trim($filtered_where_sql) !== '') {
        $where_conditions[] = "($filtered_where_sql)";
        $where_params = array_merge($where_params, $filtered_where_params);
    }
    
    $where_clause = implode(' AND ', $where_conditions);
    
    // Sestavit stats query
    $sql_stats = "
        SELECT 
            COUNT(*) as total,
            -- NOVÉ (první stav v array)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, '$[0]')) = 'NOVA' THEN 1 
                ELSE 0 
            END) as nove,
            -- KE SCHVÁLENÍ (ODESLANA_KE_SCHVALENI nebo KE_SCHVALENI)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI') THEN 1 
                ELSE 0 
            END) as ke_schvaleni,
            -- SCHVÁLENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'SCHVALENA' THEN 1 
                ELSE 0 
            END) as schvalena,
            -- ZAMÍTNUTÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZAMITNUTA' THEN 1 
                ELSE 0 
            END) as zamitnuta,
            -- ROZPRACOVANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ROZPRACOVANA' THEN 1 
                ELSE 0 
            END) as rozpracovana,
            -- ODESLANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ODESLANA' THEN 1 
                ELSE 0 
            END) as odeslana,
            -- POTVRZENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'POTVRZENA' THEN 1 
                ELSE 0 
            END) as potvrzena,
            -- K UVEŘEJNĚNÍ (stejná logika jako stav_registru=nepublikovano)
            SUM(CASE 
                WHEN (
                    (
                        JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'UVEREJNIT'
                        OR " . sqlNormalizeExpression('o.zverejnit') . " = 'ano'
                        OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'ke zverejneni'
                    )
                    AND NOT (
                        (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
                        OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
                    )
                ) THEN 1 
                ELSE 0 
            END) as k_uverejneni_do_registru,
            -- UVEŘEJNĚNÉ (stejná logika jako stav_registru=publikovano)
            SUM(CASE 
                WHEN (
                    (o.dt_zverejneni IS NOT NULL AND o.registr_iddt IS NOT NULL)
                    OR " . sqlNormalizeExpression('o.stav_objednavky') . " = 'uverejnena v registru smluv'
                ) THEN 1 
                ELSE 0 
            END) as uverejnena,
            -- FAKTURACE
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'FAKTURACE' THEN 1 
                ELSE 0 
            END) as fakturace,
            -- VĚCNÁ SPRÁVNOST
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'VECNA_SPRAVNOST' THEN 1 
                ELSE 0 
            END) as vecna_spravnost,
            -- ZKONTROLOVANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZKONTROLOVANA' THEN 1 
                ELSE 0 
            END) as zkontrolovana,
            -- DOKONČENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'DOKONCENA' THEN 1 
                ELSE 0 
            END) as dokoncena,
            -- ZRUŠENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZRUSENA' THEN 1 
                ELSE 0 
            END) as zrusena,
            -- SMAZANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'SMAZANA' THEN 1 
                ELSE 0 
            END) as smazana,
            -- S FAKTURAMI
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_FAKTURY . " f 
                    WHERE f.objednavka_id = o.id AND f.aktivni = 1
                ) THEN 1 
                ELSE 0 
            END) as withInvoices,
            -- S PŘÍLOHAMI (všechny typy příloh)
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p 
                    WHERE p.objednavka_id = o.id
                ) THEN 1 
                ELSE 0 
            END) as withAttachments,
            -- BEZ PŘÍLOH (objednávky bez jakýchkoliv příloh v tabulce objednavky_prilohy)
            SUM(CASE 
                WHEN NOT EXISTS (
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p 
                    WHERE p.objednavka_id = o.id
                ) THEN 1 
                ELSE 0 
            END) as withoutObjAttachments,
            -- MIMOŘÁDNÉ UDÁLOSTI
            SUM(CASE 
                WHEN o.mimoradna_udalost = 1 THEN 1 
                ELSE 0 
            END) as mimoradneUdalosti,
            -- MOJE OBJEDNÁVKY
            SUM(CASE 
                WHEN o.objednatel_id = ? OR 
                    o.garant_uzivatel_id = ? OR 
                    o.prikazce_id = ? OR 
                    o.schvalovatel_id = ?
                THEN 1 
                ELSE 0 
            END) as mojeObjednavky,
            -- S KOMENTÁŘI (VŠEMI)
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_KOMENTARE . " kom 
                    WHERE kom.objednavka_id = o.id AND kom.smazano = 0
                ) THEN 1 
                ELSE 0 
            END) as withComments,
            -- S MÝMI KOMENTÁŘI
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_KOMENTARE . " kom 
                    WHERE kom.objednavka_id = o.id 
                      AND kom.user_id = ? 
                      AND kom.smazano = 0
                ) THEN 1 
                ELSE 0 
            END) as withMyComments
        FROM " . TBL_OBJEDNAVKY . " o
        LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
        LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
        LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
        LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
        LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
        WHERE $where_clause
    ";
    
    // Parametry: user_id (4x pro "moje objednávky" count) + user_id (pro "s mými komentáři") + where_params
    $stmt_params = array_merge(array($user_id, $user_id, $user_id, $user_id, $user_id), $where_params);
    error_log("[OrderV3 STATS] SQL params count: " . count($stmt_params) . ", values: " . json_encode($stmt_params));
    $stmt_stats = $db->prepare($sql_stats);
    $stmt_stats->execute($stmt_params);
    $stats = $stmt_stats->fetch(PDO::FETCH_ASSOC);
    
    error_log("[OrderV3 STATS] Basic stats: total={$stats['total']}, nove={$stats['nove']}");
    
    // Částky (s DPH) – musí odpovídat STEJNÉ množině jako COUNTS (tj. stejný WHERE + permissions + filtry)
    // Priorita pro částku objednávky: faktury > položky > max_cena_s_dph
    $sql_amounts = "
        SELECT
            COALESCE(SUM(
                CASE
                    WHEN (SELECT COALESCE(SUM(f.fa_castka), 0)
                          FROM " . TBL_FAKTURY . " f
                          WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                    THEN (SELECT COALESCE(SUM(f.fa_castka), 0)
                          FROM " . TBL_FAKTURY . " f
                          WHERE f.objednavka_id = o.id AND f.aktivni = 1)

                    WHEN (SELECT COALESCE(SUM(p.cena_s_dph), 0)
                          FROM " . TBL_OBJEDNAVKY_POLOZKY . " p
                          WHERE p.objednavka_id = o.id) > 0
                    THEN (SELECT COALESCE(SUM(p.cena_s_dph), 0)
                          FROM " . TBL_OBJEDNAVKY_POLOZKY . " p
                          WHERE p.objednavka_id = o.id)

                    ELSE COALESCE(o.max_cena_s_dph, 0)
                END
            ), 0) AS totalAmount,

            -- Skupina „ROZPRACOVANÉ“ = více workflow stavů (musí sedět s FE počítáním)
            -- Pozn.: SCHVALENA se bere jako „rozpracovaná“ (tj. není NOVA ani KE_SCHVALENI)
            COALESCE(SUM(
                CASE
                    WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
                        IN ('SCHVALENA', 'ROZPRACOVANA', 'ODESLANA', 'POTVRZENA', 'UVEREJNIT', 'UVEREJNENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'CEKA_SE', 'NEUVEREJNIT')
                    THEN
                        CASE
                            WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                            THEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                            WHEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " p WHERE p.objednavka_id = o.id) > 0
                            THEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " p WHERE p.objednavka_id = o.id)
                            ELSE COALESCE(o.max_cena_s_dph, 0)
                        END
                    ELSE 0
                END
            ), 0) AS rozpracovaneAmount,

            -- Dokončené
            COALESCE(SUM(
                CASE
                    WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'DOKONCENA'
                    THEN
                        CASE
                            WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                            THEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                            WHEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " p WHERE p.objednavka_id = o.id) > 0
                            THEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " p WHERE p.objednavka_id = o.id)
                            ELSE COALESCE(o.max_cena_s_dph, 0)
                        END
                    ELSE 0
                END
            ), 0) AS dokoncenaAmount
        FROM " . TBL_OBJEDNAVKY . " o
        LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
        LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
        LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
        LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
        LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
        WHERE $where_clause
    ";

    $stmt_amount = $db->prepare($sql_amounts);
    $stmt_amount->execute($where_params);
    $amount_result = $stmt_amount->fetch(PDO::FETCH_ASSOC);

    $stats['totalAmount'] = isset($amount_result['totalAmount']) ? floatval($amount_result['totalAmount']) : 0.0;
    $stats['rozpracovaneAmount'] = isset($amount_result['rozpracovaneAmount']) ? floatval($amount_result['rozpracovaneAmount']) : 0.0;
    $stats['dokoncenaAmount'] = isset($amount_result['dokoncenaAmount']) ? floatval($amount_result['dokoncenaAmount']) : 0.0;

    // Kompatibilita (někde se ještě používá snake_case)
    $stats['total_amount'] = $stats['totalAmount'];

    // „filteredTotalAmount“ je pro současnou sadu (už obsahuje filtry, pokud byly předány)
    // - unfilteredStats call: je to unfiltered množina
    // - filtered stats call: je to filtered množina
    $stats['filteredTotalAmount'] = $stats['totalAmount'];

    // Převést všechny countery na INT (MySQL SUM/COUNT vrací string)
    $counter_fields = array(
        'total', 'nove', 'ke_schvaleni', 'schvalena', 'zamitnuta', 'rozpracovana',
        'odeslana', 'potvrzena', 'k_uverejneni_do_registru', 'uverejnena',
        'fakturace', 'vecna_spravnost', 'zkontrolovana', 'dokoncena', 'zrusena',
        'smazana', 'withInvoices', 'withAttachments', 'withoutObjAttachments', 'mimoradneUdalosti', 'mojeObjednavky',
        'withComments', 'withMyComments'
    );
    foreach ($counter_fields as $field) {
        if (isset($stats[$field])) {
            $stats[$field] = intval($stats[$field]);
        }
    }

    error_log("[OrderV3 STATS] Amounts: total={$stats['totalAmount']}, rozpracovane={$stats['rozpracovaneAmount']}, dokoncena={$stats['dokoncenaAmount']}");
    
    return $stats;
}

/**
 * Načte statistiky objednávek podle roku (původní funkce - zachována pro backward compatibility)
 * @deprecated Použij getOrderStatsWithPeriod
 */
function getOrderStats($db, $year, $user_id = 0, $filtered_where_sql = null, $filtered_where_params = array()) {
    // Počty objednávek podle stavů (poslední stav v workflow array)
    $sql_stats = "
        SELECT 
            COUNT(*) as total,
            -- NOVÉ (první stav v array)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, '$[0]')) = 'NOVA' THEN 1 
                ELSE 0 
            END) as nove,
            -- KE SCHVÁLENÍ (ODESLANA_KE_SCHVALENI nebo KE_SCHVALENI)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI') THEN 1 
                ELSE 0 
            END) as ke_schvaleni,
            -- SCHVÁLENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'SCHVALENA' THEN 1 
                ELSE 0 
            END) as schvalena,
            -- ZAMÍTNUTÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZAMITNUTA' THEN 1 
                ELSE 0 
            END) as zamitnuta,
            -- ROZPRACOVANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ROZPRACOVANA' THEN 1 
                ELSE 0 
            END) as rozpracovana,
            -- ODESLANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ODESLANA' THEN 1 
                ELSE 0 
            END) as odeslana,
            -- POTVRZENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'POTVRZENA' THEN 1 
                ELSE 0 
            END) as potvrzena,
            -- K UVEŘEJNĚNÍ (UVEREJNIT v workflow)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'UVEREJNIT' THEN 1 
                ELSE 0 
            END) as k_uverejneni_do_registru,
            -- UVEŘEJNĚNÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'UVEREJNENA' THEN 1 
                ELSE 0 
            END) as uverejnena,
            -- FAKTURACE
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'FAKTURACE' THEN 1 
                ELSE 0 
            END) as fakturace,
            -- VĚCNÁ SPRÁVNOST
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'VECNA_SPRAVNOST' THEN 1 
                ELSE 0 
            END) as vecna_spravnost,
            -- ZKONTROLOVANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZKONTROLOVANA' THEN 1 
                ELSE 0 
            END) as zkontrolovana,
            -- DOKONČENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'DOKONCENA' THEN 1 
                ELSE 0 
            END) as dokoncena,
            -- ZRUŠENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZRUSENA' THEN 1 
                ELSE 0 
            END) as zrusena,
            -- SMAZANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'SMAZANA' THEN 1 
                ELSE 0 
            END) as smazana,
            -- S FAKTURAMI (alespoň 1 faktura)
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_FAKTURY . " f 
                    WHERE f.objednavka_id = o.id AND f.aktivni = 1
                ) THEN 1 
                ELSE 0 
            END) as withInvoices,
            -- S PŘÍLOHAMI (alespoň 1 příloha)
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p 
                    WHERE p.objednavka_id = o.id
                ) THEN 1 
                ELSE 0 
            END) as withAttachments,
            -- BEZ PŘÍLOH (objednávky bez jakýchkoliv příloh v tabulce objednavky_prilohy)
            SUM(CASE 
                WHEN NOT EXISTS (
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p 
                    WHERE p.objednavka_id = o.id
                ) THEN 1 
                ELSE 0 
            END) as withoutObjAttachments,
            -- MIMOŘÁDNÉ UDÁLOSTI
            SUM(CASE 
                WHEN o.mimoradna_udalost = 1 THEN 1 
                ELSE 0 
            END) as mimoradneUdalosti,
            -- MOJE OBJEDNÁVKY (kde jsem objednatel, garant, příkazce nebo schvalovatel)
            SUM(CASE 
                WHEN o.objednatel_id = ? OR 
                    o.garant_uzivatel_id = ? OR 
                    o.prikazce_id = ? OR 
                    o.schvalovatel_id = ?
                THEN 1 
                ELSE 0 
            END) as mojeObjednavky,
            -- S KOMENTÁŘI (VŠEMI)
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_KOMENTARE . " kom 
                    WHERE kom.objednavka_id = o.id AND kom.smazano = 0
                ) THEN 1 
                ELSE 0 
            END) as withComments,
            -- S MÝMI KOMENTÁŘI
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_KOMENTARE . " kom 
                    WHERE kom.objednavka_id = o.id 
                      AND kom.user_id = ? 
                      AND kom.smazano = 0
                ) THEN 1 
                ELSE 0 
            END) as withMyComments
        FROM " . TBL_OBJEDNAVKY . " o
        WHERE o.aktivni = 1 AND YEAR(o.dt_objednavky) = ?
    ";
    
    $stmt_stats = $db->prepare($sql_stats);
    $stmt_stats->execute(array($user_id, $user_id, $user_id, $user_id, $user_id, $year));
    $stats = $stmt_stats->fetch(PDO::FETCH_ASSOC);
    
    // Celková cena s DPH - priorita: faktury > položky > max_cena_s_dph
    $sql_total_amount = "
        SELECT 
            COALESCE(SUM(
                CASE
                    -- Priorita 1: Pokud existují faktury, použij součet faktur
                    WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) 
                          FROM " . TBL_FAKTURY . " f 
                          WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                    THEN (SELECT COALESCE(SUM(f.fa_castka), 0) 
                          FROM " . TBL_FAKTURY . " f 
                          WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                    
                    -- Priorita 2: Pokud existují položky, použij součet položek
                    WHEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) 
                          FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                          WHERE pol.objednavka_id = o.id) > 0
                    THEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) 
                          FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                          WHERE pol.objednavka_id = o.id)
                    
                    -- Priorita 3: Použij max_cena_s_dph
                    ELSE COALESCE(o.max_cena_s_dph, 0)
                END
            ), 0) as totalAmount,
            
            -- Částka ROZPRACOVANÝCH objednávek
            COALESCE(SUM(
                CASE
                    WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'ROZPRACOVANA'
                    THEN
                        CASE
                            WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                            THEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                            WHEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) > 0
                            THEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id)
                            ELSE COALESCE(o.max_cena_s_dph, 0)
                        END
                    ELSE 0
                END
            ), 0) as rozpracovanaAmount,
            
            -- Částka DOKONČENÝCH objednávek
            COALESCE(SUM(
                CASE
                    WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'DOKONCENA'
                    THEN
                        CASE
                            WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                            THEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                            WHEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) > 0
                            THEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id)
                            ELSE COALESCE(o.max_cena_s_dph, 0)
                        END
                    ELSE 0
                END
            ), 0) as dokoncenaAmount
        FROM " . TBL_OBJEDNAVKY . " o
        WHERE o.aktivni = 1 AND YEAR(o.dt_objednavky) = ?
    ";
    
    $stmt_amount = $db->prepare($sql_total_amount);
    $stmt_amount->execute(array($year));
    $amount_data = $stmt_amount->fetch(PDO::FETCH_ASSOC);
    
    // Přidat totalAmount a další částky do stats
    $stats['totalAmount'] = floatval($amount_data['totalAmount']);
    $stats['rozpracovanaAmount'] = floatval($amount_data['rozpracovanaAmount']);
    $stats['dokoncenaAmount'] = floatval($amount_data['dokoncenaAmount']);
    
    // 🔥 NOVĚ: Pokud máme filtrované WHERE podmínky, spočítej filteredTotalAmount
    if ($filtered_where_sql !== null && !empty($filtered_where_params)) {
        $sql_filtered_amount = "
            SELECT 
                COALESCE(SUM(
                    CASE
                        -- Priorita 1: Pokud existují faktury, použij součet faktur
                        WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) 
                              FROM " . TBL_FAKTURY . " f 
                              WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                        THEN (SELECT COALESCE(SUM(f.fa_castka), 0) 
                              FROM " . TBL_FAKTURY . " f 
                              WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                        
                        -- Priorita 2: Pokud existují položky, použij součet položek
                        WHEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) 
                              FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                              WHERE pol.objednavka_id = o.id) > 0
                        THEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) 
                              FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                              WHERE pol.objednavka_id = o.id)
                        
                        -- Priorita 3: Použij max_cena_s_dph
                        ELSE COALESCE(o.max_cena_s_dph, 0)
                    END
                ), 0) as filteredTotalAmount
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
            LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
            LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
            LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
            WHERE $filtered_where_sql
        ";
        
        $stmt_filtered = $db->prepare($sql_filtered_amount);
        $stmt_filtered->execute($filtered_where_params);
        $filtered_amount_data = $stmt_filtered->fetch(PDO::FETCH_ASSOC);
        
        $stats['filteredTotalAmount'] = floatval($filtered_amount_data['filteredTotalAmount']);
    } else {
        // Pokud nejsou filtry, filtered = total
        $stats['filteredTotalAmount'] = $stats['totalAmount'];
    }
    
    // Převést všechny countery na INT (MySQL SUM vrací string)
    $counter_fields = array(
        'total', 'nove', 'ke_schvaleni', 'schvalena', 'zamitnuta', 'rozpracovana', 
        'odeslana', 'potvrzena', 'k_uverejneni_do_registru', 'uverejnena',
        'fakturace', 'vecna_spravnost', 'zkontrolovana', 'dokoncena', 'zrusena', 
        'smazana', 'withInvoices', 'withAttachments', 'withoutObjAttachments', 'mimoradneUdalosti', 'mojeObjednavky',
        'withComments', 'withMyComments'
    );
    
    foreach ($counter_fields as $field) {
        if (isset($stats[$field])) {
            $stats[$field] = intval($stats[$field]);
        }
    }
    
    return $stats;
}

/**
 * POST order-v3/stats
 * Načte pouze statistiky (lehčí endpoint pro dashboard refresh)
 * 
 * REQUEST BODY:
 * {
 *   "token": "xxx",
 *   "username": "user@domain.cz",
 *   "year": 2026
 * }
 */
function handle_order_v3_stats($input, $config, $queries) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

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

    $user_id = isset($token_data['id']) ? (int)$token_data['id'] : 0;

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        TimezoneHelper::setMysqlTimezone($db);
        
        // Období pro filtrování (místo roku)
        $period = isset($input['period']) ? $input['period'] : 'all';
        $stats = getOrderStatsWithPeriod($db, $period, $user_id);

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $stats,
            'message' => 'Statistiky načteny úspěšně'
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání statistik: ' . $e->getMessage()
        ));
    }
}

/**
 * POST order-v3/items
 * Načte položky objednávky (lazy loading podřádků)
 * 
 * REQUEST BODY:
 * {
 *   "token": "xxx",
 *   "username": "user@domain.cz",
 *   "order_id": 123
 * }
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "data": {
 *     "order_id": 123,
 *     "items": [
 *       {
 *         "id": 1,
 *         "nazev": "Notebook",
 *         "mnozstvi": 2,
 *         "jednotka": "ks",
 *         "cena_za_jednotku": 25000,
 *         "castka_celkem": 50000,
 *         "poznamka": "..."
 *       }
 *     ],
 *     "attachments": [...],
 *     "notes": "..."
 *   }
 * }
 */
function handle_order_v3_items($input, $config, $queries) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['order_id']) ? (int)$input['order_id'] : 0;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }
    
    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí order_id'));
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $user_id = isset($token_data['id']) ? (int)$token_data['id'] : 0;

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        TimezoneHelper::setMysqlTimezone($db);
        
        // ✅ KRITICKÉ: Zkontrolovat permissions na objednávku PŘED načtením položek!
        // Používáme STEJNOU logiku jako Order V2
        $where_conditions = array();
        $where_params = array();
        
        $where_conditions[] = "o.id = ?";
        $where_params[] = $order_id;
        
        $where_conditions[] = "o.aktivni = 1";
        
        // Aplikovat user permissions (admin vidí všechno, non-admin jen své objednávky)
        $is_admin = applyOrderV3UserPermissions($user_id, $db, $where_conditions, $where_params);
        
        $where_sql = implode(' AND ', $where_conditions);
        
        // Ověřit, že uživatel má právo vidět tuto objednávku
        $sql_check = "SELECT COUNT(*) FROM " . TBL_OBJEDNAVKY . " o WHERE $where_sql";
        $stmt_check = $db->prepare($sql_check);
        $stmt_check->execute($where_params);
        $has_access = (int)$stmt_check->fetchColumn() > 0;
        
        if (!$has_access) {
            http_response_code(403);
            echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k této objednávce'));
            return;
        }

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
        $stmt_items->execute(array($order_id));
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
        $stmt_attachments->execute(array($order_id));
        $attachments = $stmt_attachments->fetchAll(PDO::FETCH_ASSOC);

        // Načíst poznámky z objednávky
        $sql_notes = "SELECT poznamka FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1";
        $stmt_notes = $db->prepare($sql_notes);
        $stmt_notes->execute(array($order_id));
        $notes = $stmt_notes->fetchColumn();

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'order_id' => $order_id,
                'items' => $items,
                'attachments' => $attachments,
                'notes' => $notes
            ),
            'message' => 'Detail objednávky načten úspěšně'
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání detailu objednávky: ' . $e->getMessage()
        ));
    }
}

/**
 * 📈 POST order-v3/timeline
 * Vrací denní agregaci částek objednávek (pro čárový graf)
 * 
 * INPUT (JSON):
 * - token (string)
 * - username (string)
 * - year (int, optional) - Rok pro filtrování (default: aktuální rok)
 * 
 * OUTPUT (JSON):
 * {
 *   "status": "success",
 *   "data": {
 *     "timeline": [
 *       {
 *         "datum": "2026-01-01",
 *         "max_dph_cumulative": 123456.78,
 *         "polozky_sum_cumulative": 98765.43,
 *         "faktury_sum_cumulative": 87654.32
 *       },
 *       ...
 *     ],
 *     "year": 2026,
 *     "start_date": "2026-01-01",
 *     "end_date": "2026-12-31"
 *   }
 * }
 */
function handle_orderV3_timeline($input, $config) {
    // Validace metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    // Parametry
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $year = isset($input['year']) ? (int)$input['year'] : (int)date('Y');

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    try {
        // DB připojení
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // Nastavit timezone
        TimezoneHelper::setMysqlTimezone($db);

        // Ověřit token
        $token_data = verify_token($token);
        if (!$token_data || $token_data['username'] !== $username) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
            return;
        }

        // Získat user_id
        $user_id = get_user_id_from_username($username, $db);
        if (!$user_id) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Uživatel nenalezen']);
            return;
        }

        // Datum rozsahu (celý rok)
        $start_date = "$year-01-01";
        $end_date = "$year-12-31";

        // WHERE podmínky + user permissions
        $where_conditions = ["o.aktivni = 1"];
        $where_params = [];
        
        // Aplikovat user permissions
        $is_admin = applyOrderV3UserPermissions($user_id, $db, $where_conditions, $where_params);
        
        // Přidat datum rozsahu
        $where_conditions[] = "DATE(o.dt_vytvoreni) >= ?";
        $where_params[] = $start_date;
        $where_conditions[] = "DATE(o.dt_vytvoreni) <= ?";
        $where_params[] = $end_date;

        $where_sql = implode(' AND ', $where_conditions);

        // Query pro denní agregaci - KUMULATIVNÍ součty
        $sql = "
            WITH RECURSIVE dates AS (
                SELECT DATE('$start_date') as datum
                UNION ALL
                SELECT DATE_ADD(datum, INTERVAL 1 DAY)
                FROM dates
                WHERE datum < DATE('$end_date')
            ),
            daily_orders AS (
                SELECT 
                    DATE(o.dt_vytvoreni) as den,
                    SUM(o.cena_celkem_dph) as max_dph,
                    SUM(o.cena_polozek_celkem) as polozky_sum,
                    SUM(IFNULL(f.castka, 0)) as faktury_sum
                FROM " . TBL_OBJEDNAVKY . " o
                LEFT JOIN (
                    SELECT 
                        objednavka_id,
                        SUM(castka) as castka
                    FROM " . TBL_FAKTURY . "
                    WHERE aktivni = 1
                    GROUP BY objednavka_id
                ) f ON o.id = f.objednavka_id
                WHERE $where_sql
                GROUP BY den
            )
            SELECT 
                d.datum,
                IFNULL(SUM(do.max_dph) OVER (ORDER BY d.datum ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 0) as max_dph_cumulative,
                IFNULL(SUM(do.polozky_sum) OVER (ORDER BY d.datum ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 0) as polozky_sum_cumulative,
                IFNULL(SUM(do.faktury_sum) OVER (ORDER BY d.datum ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 0) as faktury_sum_cumulative
            FROM dates d
            LEFT JOIN daily_orders do ON d.datum = do.den
            ORDER BY d.datum ASC
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute($where_params);
        $timeline = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Konverze na float
        foreach ($timeline as &$row) {
            $row['max_dph_cumulative'] = (float)$row['max_dph_cumulative'];
            $row['polozky_sum_cumulative'] = (float)$row['polozky_sum_cumulative'];
            $row['faktury_sum_cumulative'] = (float)$row['faktury_sum_cumulative'];
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => [
                'timeline' => $timeline,
                'year' => $year,
                'start_date' => $start_date,
                'end_date' => $end_date
            ],
            'message' => 'Timeline data načtena úspěšně'
        ]);

    } catch (Exception $e) {
        error_log("[OrderV3 Timeline] Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání timeline dat: ' . $e->getMessage()
        ]);
    }
}

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

function getUserSpecificPermissions($user_id, $db, $permission_codes) {
    if (!is_array($permission_codes) || empty($permission_codes)) return array();

    try {
        $placeholders = implode(',', array_fill(0, count($permission_codes), '?'));
        $sql = "
            SELECT DISTINCT p.kod_prava
            FROM " . TBL_PRAVA . " p
            WHERE p.kod_prava IN ($placeholders)
            AND p.id IN (
                -- Přímá práva (user_id != -1, role_id = -1)
                SELECT rp.pravo_id FROM " . TBL_ROLE_PRAVA . " rp
                WHERE rp.user_id = ? AND rp.role_id = -1

                UNION

                -- Práva z rolí (user_id = -1, role_id = X)
                SELECT rp.pravo_id
                FROM " . TBL_UZIVATELE_ROLE . " ur
                JOIN " . TBL_ROLE_PRAVA . " rp ON ur.role_id = rp.role_id AND rp.user_id = -1
                WHERE ur.uzivatel_id = ?
            )
        ";

        $stmt = $db->prepare($sql);
        if (!$stmt) {
            error_log("Order V3 getUserSpecificPermissions: FAILED to prepare statement!");
            return array();
        }

        $params = array_merge($permission_codes, array($user_id, $user_id));
        $result = $stmt->execute($params);
        if (!$result) {
            error_log("Order V3 getUserSpecificPermissions: FAILED to execute! Error: " . print_r($stmt->errorInfo(), true));
            return array();
        }

        $permissions = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $permissions[] = $row['kod_prava'];
        }

        return $permissions;
    } catch (Exception $e) {
        error_log("Order V3 getUserSpecificPermissions: Error getting permissions for user $user_id: " . $e->getMessage());
        return array();
    }
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
function applyOrderV3UserPermissions($user_id, $db, &$where_conditions, &$where_params, $access_context = null) {
    // Načtení user permissions a rolí (Order V2 compatible)
    $user_permissions = function_exists('getUserOrderPermissions') ? 
        getUserOrderPermissions($user_id, $db) : [];
    $user_roles = function_exists('getUserRoles') ? 
        getUserRoles($user_id, $db) : [];

    if ($access_context === 'vzdel') {
        $extra_permissions = getUserSpecificPermissions($user_id, $db, array('EDUCATION_VIEW_ALL'));
        if (!empty($extra_permissions)) {
            $user_permissions = array_values(array_unique(array_merge($user_permissions, $extra_permissions)));
        }
    }
    
    // Check admin role (SUPERADMIN nebo ADMINISTRATOR)
    $isAdminByRole = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
    
    // Check read all permissions
    $hasOrderReadAll = in_array('ORDER_READ_ALL', $user_permissions);
    $hasOrderViewAll = in_array('ORDER_VIEW_ALL', $user_permissions);
    $hasEducationViewAll = in_array('EDUCATION_VIEW_ALL', $user_permissions);
    $allowEducationViewAll = $access_context === 'vzdel';
    $hasReadAllPermissions = $hasOrderReadAll || $hasOrderViewAll || ($allowEducationViewAll && $hasEducationViewAll);
    
    // Final admin status
    $is_admin = $isAdminByRole || $hasReadAllPermissions;
    
    if ($is_admin) {
        // ADMIN - vidí všechny objednávky, žádné filtry
        return true;
    }
    
    // ========================================================================
    // NON-ADMIN: Order V2 Compatible Visibility Logic
    // ========================================================================
    
    if ($user_id <= 0) {
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
    // Pouze legacy structure_json logika přes hierarchyOrderFilters.php
    if (function_exists('applyHierarchyFilterToOrders')) {
        $hierarchyFilter = applyHierarchyFilterToOrders($user_id, $db);

        if ($hierarchyFilter !== null) {
            $visibilityConditions[] = $hierarchyFilter;
            error_log("[OrderV3 Permissions] Hierarchy filter ADDED from hierarchyOrderFilters");
        }
    }
    
    // 3️⃣ DEPARTMENT SUBORDINATE - ROZŠÍŘENÍ
    $hasOrderReadSubordinate = in_array('ORDER_READ_SUBORDINATE', $user_permissions);
    $hasOrderEditSubordinate = in_array('ORDER_EDIT_SUBORDINATE', $user_permissions);
    
    if ($hasOrderReadSubordinate || $hasOrderEditSubordinate) {
        if (function_exists('getUserDepartmentColleagueIds')) {
            $departmentColleagueIds = getUserDepartmentColleagueIds($user_id, $db);
            
            if (!empty($departmentColleagueIds)) {
                $departmentColleagueIdsStr = implode(',', array_map('intval', $departmentColleagueIds));
                
                // 🔒 BEZPEČNOSTNÍ FIX: Rozlišení adminů od normálních uživatelů
                // Subquery pro identifikaci adminů (ADMINISTRATOR, SUPERADMIN role)
                $adminSubquery = "
                    SELECT DISTINCT ur.uzivatel_id 
                    FROM " . TBL_UZIVATELE_ROLE . " ur
                    JOIN " . TBL_ROLE . " r ON ur.role_id = r.id
                    WHERE r.kod_role IN ('ADMINISTRATOR', 'SUPERADMIN')
                ";
                
                // Objednávka je viditelná pokud:
                // 1. Alespoň jeden NON-ADMIN kolega je účastníkem (kterákoliv z 12 rolí)
                // Tím eliminujeme objednávky, kde z daného úseku jsou POUZE admini
                $departmentCondition = "(
                    -- Alespoň jeden NON-ADMIN kolega v kterékoliv z 12 rolí
                    (o.uzivatel_id IN ($departmentColleagueIdsStr) AND o.uzivatel_id NOT IN ($adminSubquery))
                    OR (o.objednatel_id IN ($departmentColleagueIdsStr) AND o.objednatel_id NOT IN ($adminSubquery))
                    OR (o.garant_uzivatel_id IN ($departmentColleagueIdsStr) AND o.garant_uzivatel_id NOT IN ($adminSubquery))
                    OR (o.schvalovatel_id IN ($departmentColleagueIdsStr) AND o.schvalovatel_id NOT IN ($adminSubquery))
                    OR (o.prikazce_id IN ($departmentColleagueIdsStr) AND o.prikazce_id NOT IN ($adminSubquery))
                    OR (o.uzivatel_akt_id IN ($departmentColleagueIdsStr) AND o.uzivatel_akt_id NOT IN ($adminSubquery))
                    OR (o.odesilatel_id IN ($departmentColleagueIdsStr) AND o.odesilatel_id NOT IN ($adminSubquery))
                    OR (o.dodavatel_potvrdil_id IN ($departmentColleagueIdsStr) AND o.dodavatel_potvrdil_id NOT IN ($adminSubquery))
                    OR (o.zverejnil_id IN ($departmentColleagueIdsStr) AND o.zverejnil_id NOT IN ($adminSubquery))
                    OR (o.fakturant_id IN ($departmentColleagueIdsStr) AND o.fakturant_id NOT IN ($adminSubquery))
                    OR (o.dokoncil_id IN ($departmentColleagueIdsStr) AND o.dokoncil_id NOT IN ($adminSubquery))
                    OR (o.potvrdil_vecnou_spravnost_id IN ($departmentColleagueIdsStr) AND o.potvrdil_vecnou_spravnost_id NOT IN ($adminSubquery))
                )";
                
                $visibilityConditions[] = $departmentCondition;
                error_log("[OrderV3 Permissions] STRICT Department filter ADDED: shows orders with at least one NON-ADMIN colleague from " . count($departmentColleagueIds) . " colleagues");
            }
        }
    }
    
    // 4️⃣ ZASTUPOVÁNÍ - ROZŠÍŘENÍ (pokud je aktivní v APP SETTING)
    if (function_exists('get_user_ids_with_substitution')) {
        try {
            $scope_info = null;
            $substitution_ids = get_user_ids_with_substitution($db, $user_id, ['view'], $scope_info);
            
            // INHERIT scope: pokud zastupovaný je admin → zástupce vidí VŠE
            if ($scope_info && !empty($scope_info['has_inherit_full_access'])) {
                error_log("[OrderV3 Permissions] ✅ SUBSTITUTION INHERIT: User $user_id dědí PLNÝ PŘÍSTUP ze zastupování → showing ALL orders");
                // Zahodit dosavadní visibility conditions - admin vidí vše
                // Musíme ale smazat i parametry co jsme přidali pro 12 polí
                array_splice($where_params, -12); // Odeber 12 parametrů z role-based
                $visibilityConditions = []; // Reset - žádné filtry
                // Nebudeme přidávat podmínku → podmínky budou prázdné → vidí vše
                return true; // Admin access přes zastupování
            }
            
            // Pokud jsou zastupovaní uživatelé (víc než jen vlastní ID)
            if (count($substitution_ids) > 1) {
                $substitutionIdsStr = implode(',', array_map('intval', $substitution_ids));
                
                $substitutionCondition = "(
                    o.uzivatel_id IN ($substitutionIdsStr)
                    OR o.objednatel_id IN ($substitutionIdsStr)
                    OR o.garant_uzivatel_id IN ($substitutionIdsStr)
                    OR o.schvalovatel_id IN ($substitutionIdsStr)
                    OR o.prikazce_id IN ($substitutionIdsStr)
                    OR o.uzivatel_akt_id IN ($substitutionIdsStr)
                    OR o.odesilatel_id IN ($substitutionIdsStr)
                    OR o.dodavatel_potvrdil_id IN ($substitutionIdsStr)
                    OR o.zverejnil_id IN ($substitutionIdsStr)
                    OR o.fakturant_id IN ($substitutionIdsStr)
                    OR o.dokoncil_id IN ($substitutionIdsStr)
                    OR o.potvrdil_vecnou_spravnost_id IN ($substitutionIdsStr)
                )";
                
                $visibilityConditions[] = $substitutionCondition;
                error_log("[OrderV3 Permissions] ✅ SUBSTITUTION filter ADDED - user $user_id sees orders of users: $substitutionIdsStr");
            }
            
            // INHERIT scope: přidej subordinates zastupovaného uživatele
            if ($scope_info && !empty($scope_info['inherit_subordinate_ids'])) {
                $inheritSubIds = implode(',', array_map('intval', $scope_info['inherit_subordinate_ids']));
                
                $inheritSubCondition = "(
                    o.uzivatel_id IN ($inheritSubIds)
                    OR o.objednatel_id IN ($inheritSubIds)
                    OR o.garant_uzivatel_id IN ($inheritSubIds)
                    OR o.schvalovatel_id IN ($inheritSubIds)
                    OR o.prikazce_id IN ($inheritSubIds)
                    OR o.uzivatel_akt_id IN ($inheritSubIds)
                    OR o.odesilatel_id IN ($inheritSubIds)
                    OR o.dodavatel_potvrdil_id IN ($inheritSubIds)
                    OR o.zverejnil_id IN ($inheritSubIds)
                    OR o.fakturant_id IN ($inheritSubIds)
                    OR o.dokoncil_id IN ($inheritSubIds)
                    OR o.potvrdil_vecnou_spravnost_id IN ($inheritSubIds)
                )";
                
                $visibilityConditions[] = $inheritSubCondition;
                error_log("[OrderV3 Permissions] ✅ SUBSTITUTION INHERIT subordinates ADDED: $inheritSubIds");
            }
        } catch (Exception $e) {
            error_log("[OrderV3 Permissions] ⚠️ SUBSTITUTION error (fail-safe, continuing without): " . $e->getMessage());
            // Fail-safe: pokud selže, pokračujeme bez zastupování
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
 * Vrátí prioritní seznam typů schvalovací akce pro objednávku.
 * Potřeba pro korektní dohledání zastupování u stavů SCHVALENA/ZAMITNUTA/CEKA_SE.
 *
 * @param array $order
 * @return array
 */
function resolveOrderApprovalActionTypesForSubstitution(array $order) {
    $last_state = '';
    if (!empty($order['stav_workflow_kod'])) {
        $workflow = $order['stav_workflow_kod'];
        if (is_string($workflow)) {
            $workflow = safeJsonDecode($workflow, array());
        }

        if (is_array($workflow) && !empty($workflow)) {
            $last = end($workflow);
            if (is_string($last)) {
                $last_state = strtoupper(trim($last));
            } elseif (is_array($last)) {
                $last_state = strtoupper(trim((string)($last['kod_stavu'] ?? $last['nazev_stavu'] ?? '')));
            }
        } elseif (is_string($workflow)) {
            $last_state = strtoupper(trim($workflow));
        }
    }

    $approval_status = strtolower(trim((string)($order['stav_schvaleni'] ?? '')));

    if ($last_state === 'ZAMITNUTA' || $approval_status === 'neschvaleno') {
        return array('REJECT', 'APPROVE', 'CONFIRM', 'POSTPONE');
    }

    if ($last_state === 'CEKA_SE' || $approval_status === 'ceka_se') {
        return array('CONFIRM', 'POSTPONE', 'APPROVE', 'REJECT');
    }

    if ($last_state === 'SCHVALENA' || $approval_status === 'schvaleno') {
        return array('APPROVE', 'CONFIRM', 'REJECT', 'POSTPONE');
    }

    return array('APPROVE', 'REJECT', 'CONFIRM', 'POSTPONE');
}

/**
 * Dohledá substitution info pro schvalovatele objednávky s fallbackem napříč typy akcí.
 *
 * @param PDO $db
 * @param array $order
 * @return array|bool
 */
function resolveOrderApprovalSubstitutionInfo($db, array $order) {
    if (empty($order['schvalovatel_id']) || empty($order['dt_schvaleni']) || empty($order['id'])) {
        return false;
    }

    $action_types = resolveOrderApprovalActionTypesForSubstitution($order);

    foreach ($action_types as $action_type) {
        $sub_info = get_substitution_info_for_action(
            $db,
            (int)$order['schvalovatel_id'],
            $action_type,
            'OBJEDNAVKA',
            (int)$order['id'],
            $order['dt_schvaleni']
        );

        if (!empty($sub_info)) {
            return $sub_info;
        }
    }

    if (defined('TBL_ZASTUPOVANI_AKCE_LOG')) {
        try {
            $placeholders = implode(', ', array_fill(0, count($action_types), '?'));
            $params = [
                (int)$order['schvalovatel_id'],
                'OBJEDNAVKA',
                (int)$order['id']
            ];

            foreach ($action_types as $action_type) {
                $params[] = $action_type;
            }

            $params[] = $order['dt_schvaleni'];

            $stmt = $db->prepare(
                "SELECT z.zastupovani_id, z.zastupovany_id, u.jmeno, u.prijmeni, z.dt_akce
                 FROM " . TBL_ZASTUPOVANI_AKCE_LOG . " z
                 LEFT JOIN " . TBL_UZIVATELE . " u ON z.zastupovany_id = u.id
                 WHERE z.zastupce_id = ?
                   AND z.objekt_typ = ?
                   AND z.objekt_id = ?
                   AND z.akce_typ IN (" . $placeholders . ")
                 ORDER BY ABS(TIMESTAMPDIFF(SECOND, z.dt_akce, ?)) ASC, z.dt_akce DESC, z.id DESC
                 LIMIT 1"
            );
            $stmt->execute($params);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!empty($record)) {
                return [
                    'is_substitution' => true,
                    'zastupovany_id' => (int)$record['zastupovany_id'],
                    'zastupovany_jmeno' => trim(($record['jmeno'] ?? '') . ' ' . ($record['prijmeni'] ?? '')),
                    'dt_akce' => $record['dt_akce']
                ];
            }
        } catch (Exception $e) {
            error_log('[OrderV3] resolveOrderApprovalSubstitutionInfo fallback error: ' . $e->getMessage());
        }
    }

    return false;
}

/**
 * Vrátí prioritní seznam typů akcí pro věcnou správnost faktury.
 * Potřeba pro korektní dohledání zastoupení u potvrzení i zamítnutí.
 *
 * @param array $invoice
 * @return array
 */
function resolveInvoiceMaterialCheckActionTypesForSubstitution(array $invoice) {
    $status = isset($invoice['vecna_spravnost_potvrzeno']) ? (int)$invoice['vecna_spravnost_potvrzeno'] : 0;

    if ($status === 2) {
        return array('REJECT', 'CONFIRM');
    }

    if ($status === 1) {
        return array('CONFIRM', 'REJECT');
    }

    return array('CONFIRM', 'REJECT');
}

/**
 * Dohledá substitution info pro věcnou správnost faktury s fallbackem napříč typy akcí.
 *
 * @param PDO $db
 * @param array $invoice
 * @return array|bool
 */
function resolveInvoiceMaterialCheckSubstitutionInfo($db, array $invoice) {
    if (empty($invoice['potvrdil_vecnou_spravnost_id']) || empty($invoice['dt_potvrzeni_vecne_spravnosti']) || empty($invoice['id'])) {
        return false;
    }

    $action_types = resolveInvoiceMaterialCheckActionTypesForSubstitution($invoice);

    foreach ($action_types as $action_type) {
        $sub_info = get_substitution_info_for_action(
            $db,
            (int)$invoice['potvrdil_vecnou_spravnost_id'],
            $action_type,
            'FAKTURA',
            (int)$invoice['id'],
            $invoice['dt_potvrzeni_vecne_spravnosti']
        );

        if (!empty($sub_info)) {
            return $sub_info;
        }
    }

    if (defined('TBL_ZASTUPOVANI_AKCE_LOG')) {
        try {
            $placeholders = implode(', ', array_fill(0, count($action_types), '?'));
            $params = [
                (int)$invoice['potvrdil_vecnou_spravnost_id'],
                'FAKTURA',
                (int)$invoice['id']
            ];

            foreach ($action_types as $action_type) {
                $params[] = $action_type;
            }

            $params[] = $invoice['dt_potvrzeni_vecne_spravnosti'];

            $stmt = $db->prepare(
                "SELECT z.zastupovani_id, z.zastupovany_id, u.jmeno, u.prijmeni, z.dt_akce
                 FROM " . TBL_ZASTUPOVANI_AKCE_LOG . " z
                 LEFT JOIN " . TBL_UZIVATELE . " u ON z.zastupovany_id = u.id
                 WHERE z.zastupce_id = ?
                   AND z.objekt_typ = ?
                   AND z.objekt_id = ?
                   AND z.akce_typ IN (" . $placeholders . ")
                 ORDER BY ABS(TIMESTAMPDIFF(SECOND, z.dt_akce, ?)) ASC, z.dt_akce DESC, z.id DESC
                 LIMIT 1"
            );
            $stmt->execute($params);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!empty($record)) {
                return [
                    'is_substitution' => true,
                    'zastupovany_id' => (int)$record['zastupovany_id'],
                    'zastupovany_jmeno' => trim(($record['jmeno'] ?? '') . ' ' . ($record['prijmeni'] ?? '')),
                    'dt_akce' => $record['dt_akce']
                ];
            }
        } catch (Exception $e) {
            error_log('[OrderV3] resolveInvoiceMaterialCheckSubstitutionInfo fallback error: ' . $e->getMessage());
        }
    }

    return false;
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

// ============================================================================
// 🚀 BATCH OPTIMIZATION FUNKCE (Fáze F1 - Eliminace N+1 problému)
// ============================================================================

/**
 * BATCH: Načte všechny LP detaily najednou pro všechny objednávky
 * @param PDO $db
 * @param array $lp_ids - Pole LP ID čísel
 * @return array - Mapa [lp_id => LP data]
 */
function getLPDetailyBatch($db, $lp_ids) {
    if (empty($lp_ids)) return array();
    
    // Deduplikace a sanitizace
    $lp_ids = array_unique(array_map('intval', array_filter($lp_ids)));
    if (empty($lp_ids)) return array();
    
    // ✅ Přeindexovat pole od 0 (PDO vyžaduje sekvenční klíče)
    $lp_ids = array_values($lp_ids);
    
    try {
        $placeholders = implode(',', array_fill(0, count($lp_ids), '?'));
        $stmt = $db->prepare("
            SELECT
                lp.id,
                lp.cislo_lp,
                lp.cislo_uctu,
                lp.nazev_uctu,
                lp.vyse_financniho_kryti,
                lp.platne_do,
                u.usek_zkr,
                TRIM(CONCAT(COALESCE(uz.jmeno, ''), ' ', COALESCE(uz.prijmeni, ''))) AS prikazce_jmeno
            FROM " . TBL_LIMITOVANE_PRISLIBY . " lp
            LEFT JOIN " . TBL_USEKY . " u ON u.id = lp.usek_id
            LEFT JOIN " . TBL_UZIVATELE . " uz ON uz.id = lp.user_id
            WHERE lp.id IN ($placeholders)
        ");
        $stmt->execute($lp_ids);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Převést na mapu [id => data]
        $map = array();
        foreach ($results as $row) {
            $map[(int)$row['id']] = $row;
        }
        return $map;
    } catch (Exception $e) {
        error_log("getLPDetailyBatch Error: " . $e->getMessage());
        return array();
    }
}

/**
 * BATCH: Načte všechny smlouvy najednou
 * @param PDO $db
 * @param array $cisla_smluv - Pole čísel smluv (string)
 * @return array - Mapa [cislo_smlouvy => smlouva data]
 */
function getSmlouvyBatch($db, $cisla_smluv) {
    if (empty($cisla_smluv)) return array();
    
    // Deduplikace
    $cisla_smluv = array_unique(array_filter($cisla_smluv));
    if (empty($cisla_smluv)) return array();
    
    // ✅ Přeindexovat pole od 0 (PDO vyžaduje sekvenční klíče)
    $cisla_smluv = array_values($cisla_smluv);
    
    try {
        $placeholders = implode(',', array_fill(0, count($cisla_smluv), '?'));
        $stmt = $db->prepare("
            SELECT 
                s.cislo_smlouvy,
                s.hodnota_s_dph as hodnota,
                s.cerpano_pozadovano,
                s.cerpano_planovano,
                s.cerpano_skutecne,
                s.zbyva_pozadovano,
                s.zbyva_planovano,
                s.zbyva_skutecne,
                s.nazev_firmy,
                s.ico,
                s.nazev_smlouvy,
                u.usek_zkr
            FROM " . TBL_SMLOUVY . " s
            LEFT JOIN " . TBL_USEKY . " u ON s.usek_id = u.id
            WHERE s.cislo_smlouvy IN ($placeholders)
              AND s.aktivni = 1
        ");
        $stmt->execute($cisla_smluv);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Převést na mapu [cislo_smlouvy => data]
        $map = array();
        foreach ($results as $row) {
            $map[$row['cislo_smlouvy']] = $row;
        }
        return $map;
    } catch (Exception $e) {
        error_log("getSmlouvyBatch Error: " . $e->getMessage());
        return array();
    }
}

/**
 * BATCH: Spočítá cerpano_v_procesu pro všechny smlouvy najednou
 * @param PDO $db
 * @param array $cisla_smluv - Pole čísel smluv
 * @return array - Mapa [cislo_smlouvy => cerpano_v_procesu (float)]
 */
function getCerpanoVProceseBatch($db, $cisla_smluv) {
    if (empty($cisla_smluv)) return array();
    
    $cisla_smluv = array_unique(array_filter($cisla_smluv));
    if (empty($cisla_smluv)) return array();
    
    // ✅ Přeindexovat pole od 0 (PDO vyžaduje sekvenční klíče)
    $cisla_smluv = array_values($cisla_smluv);
    
    try {
        $v_procesu_stavy = array('Schválená', 'Odeslaná', 'Potvrzená', 'Fakturace', 'Ke zveřejnění');
        $stav_ph = implode(',', array_fill(0, count($v_procesu_stavy), '?'));
        $smlouvy_ph = implode(',', array_fill(0, count($cisla_smluv), '?'));
        
        $stmt = $db->prepare("
            SELECT
                JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy')) AS cislo_smlouvy,
                COALESCE(SUM(
                    CASE WHEN o.max_cena_s_dph > 0 THEN o.max_cena_s_dph
                         ELSE COALESCE((SELECT SUM(p.cena_s_dph) 
                                       FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p 
                                       WHERE p.objednavka_id = o.id), 0)
                    END
                ), 0) AS cerpano_v_procesu
            FROM `" . TBL_OBJEDNAVKY . "` o
            WHERE JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy')) IN ($smlouvy_ph)
              AND o.aktivni = 1
              AND o.stav_objednavky IN ($stav_ph)
              AND NOT EXISTS (
                  SELECT 1 FROM `" . TBL_FAKTURY . "` f 
                  WHERE f.objednavka_id = o.id AND f.aktivni = 1
              )
            GROUP BY cislo_smlouvy
        ");
        $stmt->execute(array_merge($cisla_smluv, $v_procesu_stavy));
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Převést na mapu
        $map = array();
        foreach ($results as $row) {
            if ($row['cislo_smlouvy']) {
                $map[$row['cislo_smlouvy']] = (float)$row['cerpano_v_procesu'];
            }
        }
        return $map;
    } catch (Exception $e) {
        error_log("getCerpanoVProceseBatch Error: " . $e->getMessage());
        return array();
    }
}

/**
 * BATCH: Načte LP rozklad pro všechny faktury najednou
 * @param PDO $db
 * @param array $faktura_ids - Pole ID faktur
 * @return array - Mapa [faktura_id => [lp_rozklad_pole]]
 */
function loadFakturyLpCerpaniBatch($db, $faktura_ids) {
    if (empty($faktura_ids)) return array();
    
    $faktura_ids = array_unique(array_map('intval', array_filter($faktura_ids)));
    if (empty($faktura_ids)) return array();
    
    $faktura_ids = array_values($faktura_ids);
    
    try {
        $placeholders = implode(',', array_fill(0, count($faktura_ids), '?'));
        
        $sql = "
            SELECT 
                lpc.faktura_id,
                lpc.lp_id,
                lpc.lp_cislo,
                lpc.castka as castka,
                lp.cislo_lp,
                lp.nazev_uctu,
                lp.vyuziti
            FROM 25a_faktury_lp_cerpani lpc
            LEFT JOIN 25_limitovane_prisliby lp ON lpc.lp_id = lp.id
            WHERE lpc.faktura_id IN ($placeholders)
            ORDER BY lpc.faktura_id, lpc.id
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($faktura_ids);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Seskupit podle faktura_id
        $map = array();
        foreach ($rows as $row) {
            $fid = (int)$row['faktura_id'];
            if (!isset($map[$fid])) {
                $map[$fid] = array();
            }
            $cislo_lp = $row['cislo_lp'];
            if (!$cislo_lp && !empty($row['lp_cislo'])) {
                $cislo_lp = $row['lp_cislo'];
            }
            $map[$fid][] = array(
                'lp_id' => (int)$row['lp_id'],
                'cislo_lp' => $cislo_lp,
                'lp_cislo' => $row['lp_cislo'],
                'castka' => (float)$row['castka'],
                'nazev_uctu' => $row['nazev_uctu'],
                'vyuziti' => $row['vyuziti']
            );
        }
        
        return $map;
        
    } catch (PDOException $e) {
        error_log("loadFakturyLpCerpaniBatch error: " . $e->getMessage());
        return array();
    }
}

/**
 * BATCH: Načte faktury pro všechny objednávky najednou
 * @param PDO $db
 * @param array $order_ids - Pole ID objednávek
 * @return array - Mapa [objednavka_id => [array faktur]]
 */
function loadOrderInvoicesBatch($db, $order_ids) {
    if (empty($order_ids)) return array();
    
    $order_ids = array_unique(array_map('intval', array_filter($order_ids)));
    if (empty($order_ids)) return array();
    
    // ✅ Přeindexovat pole od 0 (PDO vyžaduje sekvenční klíče)
    $order_ids = array_values($order_ids);
    
    try {
        $placeholders = implode(',', array_fill(0, count($order_ids), '?'));
        
        // Stejný dotaz jako loadOrderInvoices(), jen batch
        $sql = "
            SELECT 
                f.*,
                CONCAT(COALESCE(u_prijem.titul_pred,''), ' ', u_prijem.jmeno, ' ', u_prijem.prijmeni, ' ', COALESCE(u_prijem.titul_za,'')) as prijal_user_jmeno,
                CONCAT(COALESCE(u_upd.titul_pred,''), ' ', u_upd.jmeno, ' ', u_upd.prijmeni, ' ', COALESCE(u_upd.titul_za,'')) as upd_user_jmeno,
                CONCAT(COALESCE(u_schval.titul_pred,''), ' ', u_schval.jmeno, ' ', u_schval.prijmeni, ' ', COALESCE(u_schval.titul_za,'')) as schvalil_user_jmeno
            FROM " . TBL_FAKTURY . " f
            LEFT JOIN " . TBL_UZIVATELE . " u_prijem ON f.fa_predana_zam_id = u_prijem.id
            LEFT JOIN " . TBL_UZIVATELE . " u_upd ON f.aktualizoval_uzivatel_id = u_upd.id
            LEFT JOIN " . TBL_UZIVATELE . " u_schval ON f.potvrdil_vecnou_spravnost_id = u_schval.id
            WHERE f.objednavka_id IN ($placeholders)
              AND f.aktivni = 1
            ORDER BY f.objednavka_id, f.id
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($order_ids);
        $all_invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // ✨ NOVÉ: Načíst LP rozklad pro všechny faktury najednou
        if (!empty($all_invoices)) {
            $faktura_ids = array_column($all_invoices, 'id');
            $lp_rozklad_map = loadFakturyLpCerpaniBatch($db, $faktura_ids);
            
            // Připojit LP rozklad k fakturám
            foreach ($all_invoices as &$invoice) {
                $fid = (int)$invoice['id'];
                $invoice['lp_rozklad'] = isset($lp_rozklad_map[$fid]) ? $lp_rozklad_map[$fid] : array();
            }
            unset($invoice); // Uvolnit referenci
        }
        
        // Seskupit podle objednavka_id
        $map = array();
        foreach ($order_ids as $oid) {
            $map[(int)$oid] = array();
        }
        
        foreach ($all_invoices as $invoice) {
            $oid = (int)$invoice['objednavka_id'];
            if (!isset($map[$oid])) {
                $map[$oid] = array();
            }
            $map[$oid][] = $invoice;
        }
        
        return $map;
    } catch (Exception $e) {
        error_log("loadOrderInvoicesBatch Error: " . $e->getMessage());
        return array();
    }
}

/**
 * BATCH: Načte attachment status pro všechny objednávky najednou
 * @param PDO $db
 * @param array $order_ids - Pole ID objednávek
 * @return array - Mapa [objednavka_id => attachment_color]
 */
function getAttachmentStatusBatch($db, $order_ids) {
    if (empty($order_ids)) return array();
    
    $order_ids = array_unique(array_map('intval', array_filter($order_ids)));
    if (empty($order_ids)) return array();
    
    // ✅ Přeindexovat pole od 0 (PDO vyžaduje sekvenční klíče)
    $order_ids = array_values($order_ids);
    
    try {
        $placeholders = implode(',', array_fill(0, count($order_ids), '?'));
        
        // 1. Načti všechny přílohy objednávek
        $stmt_order = $db->prepare("
            SELECT objednavka_id, typ_prilohy 
            FROM " . TBL_OBJEDNAVKY_PRILOHY . " 
            WHERE objednavka_id IN ($placeholders)
        ");
        $stmt_order->execute($order_ids);
        $order_attachments = $stmt_order->fetchAll(PDO::FETCH_ASSOC);
        
        // 2. Načti všechna faktura ID pro tyto objednávky
        $stmt_invoices = $db->prepare("
            SELECT id, objednavka_id 
            FROM " . TBL_FAKTURY . " 
            WHERE objednavka_id IN ($placeholders) AND aktivni = 1
        ");
        $stmt_invoices->execute($order_ids);
        $invoice_data = $stmt_invoices->fetchAll(PDO::FETCH_ASSOC);
        
        // Mapa faktura_id => objednavka_id
        $invoice_to_order = array();
        $invoice_ids = array();
        foreach ($invoice_data as $row) {
            $fid = (int)$row['id'];
            $invoice_ids[] = $fid;
            $invoice_to_order[$fid] = (int)$row['objednavka_id'];
        }
        
        // 3. Načti přílohy faktur (pokud existují)
        $invoice_attachments = array();
        if (!empty($invoice_ids)) {
            // ✅ Přeindexovat pole od 0 (pro jistotu)
            $invoice_ids = array_values($invoice_ids);
            
            $placeholders_fa = implode(',', array_fill(0, count($invoice_ids), '?'));
            $stmt_fa = $db->prepare("
                SELECT faktura_id, typ_prilohy 
                FROM " . TBL_FAKTURY_PRILOHY . " 
                WHERE faktura_id IN ($placeholders_fa)
            ");
            $stmt_fa->execute($invoice_ids);
            $invoice_attachments = $stmt_fa->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // 4. Seskupit přílohy podle objednávky
        $order_attachments_map = array();
        $invoice_attachments_map = array();
        
        foreach ($order_ids as $oid) {
            $order_attachments_map[(int)$oid] = array();
            $invoice_attachments_map[(int)$oid] = array();
        }
        
        foreach ($order_attachments as $att) {
            $oid = (int)$att['objednavka_id'];
            $order_attachments_map[$oid][] = $att['typ_prilohy'];
        }
        
        foreach ($invoice_attachments as $att) {
            $fid = (int)$att['faktura_id'];
            if (isset($invoice_to_order[$fid])) {
                $oid = $invoice_to_order[$fid];
                $invoice_attachments_map[$oid][] = $att['typ_prilohy'];
            }
        }
        
        // 5. Vyhodnotit barvu pro každou objednávku
        $colors = array();
        foreach ($order_ids as $oid) {
            $obj_atts = $order_attachments_map[(int)$oid];
            $inv_atts = $invoice_attachments_map[(int)$oid];
            
            $total_count = count($obj_atts) + count($inv_atts);
            $obj_podklady = count(array_filter($obj_atts, fn($t) => $t === 'PODKLADY'));
            $obj_cestovni_prikaz = count(array_filter($obj_atts, fn($t) => $t === 'CESTOVNI_PRIKAZ'));
            $obj_certifikat = count(array_filter($obj_atts, fn($t) => $t === 'CERTIFIKAT'));
            $fa_faktura = count(array_filter($inv_atts, fn($t) => $t === 'FAKTURA'));
            
            // Logika vyhodnocení barvy (stejná jako v enrichOrderWithAttachmentStatus)
            if ($total_count === 0) {
                $colors[(int)$oid] = '#cbd5e1'; // Světle šedá - žádné přílohy
                continue;
            }
            
            $has_basic_obj = $obj_podklady >= 1 || $obj_cestovni_prikaz >= 1;
            
            if (!$has_basic_obj) {
                $colors[(int)$oid] = '#dc2626'; // Červená
                continue;
            }
            
            $has_complete_fa = $fa_faktura >= 2;
            $has_complete_obj = $obj_podklady >= 2 || ($obj_cestovni_prikaz >= 1 && $obj_certifikat >= 1);
            if ($has_complete_fa && $has_complete_obj) {
                $colors[(int)$oid] = '#16a34a'; // Zelená
                continue;
            }
            
            if ($fa_faktura >= 2) {
                $colors[(int)$oid] = '#fbbf24'; // Žlutá
                continue;
            }
            
            $colors[(int)$oid] = '#f97316'; // Oranžová
        }
        
        return $colors;
        
    } catch (Exception $e) {
        error_log("getAttachmentStatusBatch Error: " . $e->getMessage());
        // Return default gray for all
        $colors = array();
        foreach ($order_ids as $oid) {
            $colors[(int)$oid] = '#64748b';
        }
        return $colors;
    }
}

// ============================================================================
// 🔧 PŮVODNÍ JEDNOTLIVÉ FUNKCE (zachovány pro backward compatibility)
// ============================================================================

/**
 * Načte LP detaily podle ID z tabulky 25_limitovane_prisliby
 * @param PDO $db
 * @param int $lp_id
 * @return array|null - Array s cislo_lp a nazev_uctu nebo null
 */
function getLPDetailyV3($db, $lp_id) {
    if (empty($lp_id)) return null;
    
    try {
        $stmt = $db->prepare("
            SELECT
                lp.cislo_lp,
                lp.cislo_uctu,
                lp.nazev_uctu,
                lp.vyuziti,
                lp.vyse_financniho_kryti,
                lp.platne_do,
                u.usek_zkr,
                TRIM(CONCAT(COALESCE(uz.jmeno, ''), ' ', COALESCE(uz.prijmeni, ''))) AS prikazce_jmeno
            FROM " . TBL_LIMITOVANE_PRISLIBY . " lp
            LEFT JOIN " . TBL_USEKY . " u ON u.id = lp.usek_id
            LEFT JOIN " . TBL_UZIVATELE . " uz ON uz.id = lp.user_id
            WHERE lp.id = ?
            LIMIT 1
        ");
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
    
    // LP názvy - načíst z tabulky limitovane_prisliby (+ úsek a příkazce z číselníků)
    if (isset($order['financovani']['lp_kody']) && is_array($order['financovani']['lp_kody'])) {
        $lp_nazvy = array();
        
        foreach ($order['financovani']['lp_kody'] as $lp_id) {
            $lp = getLPDetailyV3($db, $lp_id);
            
            if ($lp) {
                $lp_nazvy[] = array(
                    'id' => $lp_id,
                    'cislo_lp' => $lp['cislo_lp'],
                    'cislo_uctu' => isset($lp['cislo_uctu']) ? $lp['cislo_uctu'] : null,
                    'kod' => $lp['cislo_lp'],
                    'nazev' => isset($lp['vyuziti']) && $lp['vyuziti'] ? $lp['vyuziti'] : $lp['nazev_uctu'],
                    'vyuziti' => isset($lp['vyuziti']) ? $lp['vyuziti'] : null,
                    'platne_do' => isset($lp['platne_do']) ? $lp['platne_do'] : null,
                    'usek_zkr' => isset($lp['usek_zkr']) ? $lp['usek_zkr'] : null,
                    'prikazce_jmeno' => isset($lp['prikazce_jmeno']) ? trim($lp['prikazce_jmeno']) : null,
                    'vyse_financniho_kryti' => isset($lp['vyse_financniho_kryti']) ? $lp['vyse_financniho_kryti'] : null
                );
            }
        }
        
        if (!empty($lp_nazvy)) {
            $order['financovani']['lp_nazvy'] = $lp_nazvy;
        }
    }
    
    // Smlouva - načíst dodavatele (nazev_firmy) a IČO z číselníku smluv (tabulka 25_smlouvy)
    if (isset($order['financovani']['cislo_smlouvy']) && !empty($order['financovani']['cislo_smlouvy'])) {
        $cislo_smlouvy = $order['financovani']['cislo_smlouvy'];
        
        try {
            $stmt = $db->prepare("
                SELECT 
                    s.hodnota_s_dph as hodnota,
                    s.cerpano_pozadovano,
                    s.cerpano_planovano,
                    s.cerpano_skutecne,
                    s.zbyva_pozadovano,
                    s.zbyva_planovano,
                    s.zbyva_skutecne,
                    s.nazev_firmy,
                    s.ico,
                    s.nazev_smlouvy,
                    u.usek_zkr
                FROM " . TBL_SMLOUVY . " s
                LEFT JOIN " . TBL_USEKY . " u ON s.usek_id = u.id
                WHERE s.cislo_smlouvy = ?
                AND s.aktivni = 1
                LIMIT 1
            ");
            $stmt->execute(array($cislo_smlouvy));
            $smlouva = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!isset($order['_enriched'])) {
                $order['_enriched'] = array();
            }
            
            if ($smlouva) {
                // Dynamicky spočítat cerpano_v_procesu = součet objednávek v procesu (bez fakturovaných/dokončených)
                // Zahrnuje jen schválené a aktivně zpracovávané - NE drafty ani neschválené
                // Věcná správnost+ se nepocitaji - tam uz existuje faktura (=skutecnost)
                $v_procesu_stavy_e = ['Schválená', 'Odeslaná', 'Potvrzená', 'Fakturace', 'Ke zveřejnění'];
                $stav_ph_e = implode(',', array_fill(0, count($v_procesu_stavy_e), '?'));
                $stmt_vp = $db->prepare("
                    SELECT COALESCE(SUM(
                        CASE WHEN o.max_cena_s_dph > 0 THEN o.max_cena_s_dph
                             ELSE COALESCE((SELECT SUM(p.cena_s_dph) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id), 0)
                        END
                    ), 0) AS cerpano_v_procesu
                    FROM `" . TBL_OBJEDNAVKY . "` o
                    WHERE JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy')) = ?
                      AND o.aktivni = 1
                      AND o.stav_objednavky IN ($stav_ph_e)
                      AND NOT EXISTS (
                          SELECT 1 FROM `" . TBL_FAKTURY . "` f WHERE f.objednavka_id = o.id AND f.aktivni = 1
                      )
                ");
                $stmt_vp->execute(array_merge([$cislo_smlouvy], $v_procesu_stavy_e));
                $vp_row = $stmt_vp->fetch(PDO::FETCH_ASSOC);
                $cerpano_v_procesu = $vp_row ? (float)$vp_row['cerpano_v_procesu'] : 0.0;

                // Přidat název smlouvy a úsek přímo do financovani pro snadný přístup
                if (isset($smlouva['nazev_smlouvy']) && !empty($smlouva['nazev_smlouvy'])) {
                    $order['financovani']['nazev_smlouvy'] = $smlouva['nazev_smlouvy'];
                }
                if (isset($smlouva['usek_zkr']) && !empty($smlouva['usek_zkr'])) {
                    $order['financovani']['usek_zkr'] = $smlouva['usek_zkr'];
                }

                $order['_enriched']['smlouva_info'] = array(
                    'cislo_smlouvy' => $cislo_smlouvy,
                    'hodnota' => $smlouva['hodnota'],
                    'cerpano_v_procesu' => $cerpano_v_procesu,
                    'cerpano_pozadovano' => $smlouva['cerpano_pozadovano'],
                    'cerpano_planovano' => $smlouva['cerpano_planovano'],
                    'cerpano_skutecne' => $smlouva['cerpano_skutecne'],
                    'zbyva_pozadovano' => $smlouva['zbyva_pozadovano'],
                    'zbyva_planovano' => $smlouva['zbyva_planovano'],
                    'zbyva_skutecne' => $smlouva['zbyva_skutecne'],
                    'nazev_firmy' => isset($smlouva['nazev_firmy']) ? $smlouva['nazev_firmy'] : null,
                    'ico' => isset($smlouva['ico']) ? $smlouva['ico'] : null,
                    'nazev_smlouvy' => isset($smlouva['nazev_smlouvy']) ? $smlouva['nazev_smlouvy'] : null
                );
            } else {
                $order['_enriched']['smlouva_info'] = array(
                    'cislo_smlouvy' => $cislo_smlouvy,
                    'hodnota' => null,
                    'cerpano_pozadovano' => null,
                    'cerpano_planovano' => null,
                    'cerpano_skutecne' => null,
                    'zbyva_pozadovano' => null,
                    'zbyva_planovano' => null,
                    'zbyva_skutecne' => null,
                    'nazev_firmy' => null,
                    'ico' => null,
                    'nazev_smlouvy' => null
                );
            }
        } catch (Exception $e) {
            error_log("enrichFinancovaniV3 Smlouva Error: " . $e->getMessage());
        }
    }
}

/**
 * Obohacení dodavatele - OPTIMALIZOVÁNO (používá data z hlavního JOIN)
 * Data dodavatele už jsou načtené v hlavním SELECTu přes LEFT JOIN d.*
 * @param PDO $db - UNUSED (pro backward compatibility)
 * @param array $order - Reference na objednávku (bude upravena)
 */
function enrichDodavatelV3($db, &$order) {
    if (empty($order['dodavatel_id'])) {
        return;
    }
    
    // 🚀 OPTIMALIZACE: Místo DB volání použít data z hlavního JOIN
    // Hlavní SELECT obsahuje: COALESCE(o.dodavatel_nazev, d.nazev) AS dodavatel_nazev
    // a další sloupce z dodavatele (pokud existují)
    
    if (!isset($order['_enriched'])) {
        $order['_enriched'] = array();
    }
    
    // Mapovat existující data do struktury _enriched.dodavatel
    $order['_enriched']['dodavatel'] = array(
        'id' => $order['dodavatel_id'],
        'nazev' => isset($order['dodavatel_nazev']) ? $order['dodavatel_nazev'] : null,
        'ico' => isset($order['dodavatel_ico']) ? $order['dodavatel_ico'] : null,
        // Poznámka: Další pole (dic, ulice, mesto...) nejsou v hlavním SELECTu
        // Pokud je FE potřebuje, musí být přidány do hlavního JOIN
        // Pro současnou funkcionalitu stačí nazev a ico (které tam už jsou)
    );
}

/**
 * Obohacení registru zveřejnění - OPTIMALIZOVÁNO (používá data z hlavního JOIN)
 * Data uživatele zverejnil_id už jsou načtené v hlavním SELECTu přes LEFT JOIN u7.*
 * @param PDO $db - UNUSED (pro backward compatibility)
 * @param array $order - Reference na objednávku (bude upravena)
 */
function enrichRegistrZverejneniV3($db, &$order) {
    $registr = array(
        'zverejnit' => isset($order['zverejnit']) ? $order['zverejnit'] : null,
        'dt_zverejneni' => isset($order['dt_zverejneni']) ? $order['dt_zverejneni'] : null,
        'registr_iddt' => isset($order['registr_iddt']) ? $order['registr_iddt'] : null,
        'zverejnil' => null
    );
    
    // 🚀 OPTIMALIZACE: Místo DB volání použít data z hlavního JOIN u7.*
    // Hlavní SELECT obsahuje LEFT JOIN u7 pro zverejnil_id
    if (!empty($order['zverejnil_id'])) {
        // Postavit jméno z polí u7_* (pokud existují v response)
        // Alternativně můžeme předpokládat, že pole jsou pojmenovaná přímo
        
        $jmeno = isset($order['zverejnil_jmeno']) ? $order['zverejnil_jmeno'] : '';
        $prijmeni = isset($order['zverejnil_prijmeni']) ? $order['zverejnil_prijmeni'] : '';
        $email = isset($order['zverejnil_email']) ? $order['zverejnil_email'] : '';
        $titul_pred = isset($order['zverejnil_titul_pred']) ? $order['zverejnil_titul_pred'] : '';
        $titul_za = isset($order['zverejnil_titul_za']) ? $order['zverejnil_titul_za'] : '';
        
        $celeMeno = '';
        if (!empty($titul_pred)) {
            $celeMeno .= $titul_pred . ' ';
        }
        $celeMeno .= trim($jmeno . ' ' . $prijmeni);
        if (!empty($titul_za)) {
            $celeMeno .= ', ' . $titul_za;
        }
        
        if (!empty($celeMeno)) {
            $registr['zverejnil'] = array(
                'cele_jmeno' => $celeMeno,
                'email' => $email,
                'datum' => $registr['dt_zverejneni']
            );
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

/**
 * 🚀 BATCH SUBSTITUTION ENRICHMENT
 * Nahradí per-order N+1 loop (get_substitution_info_for_action)
 * jedním dotazem na TBL_ZASTUPOVANI_AKCE_LOG pro celou stránku objednávek.
 */
function enrichOrdersV3WithSubstitutionBatch($db, &$orders) {
    if (empty($orders)) return;
    if (!defined('TBL_ZASTUPOVANI_AKCE_LOG')) {
        foreach ($orders as &$order) {
            if (!isset($order['substitution_info'])) $order['substitution_info'] = [];
        }
        unset($order);
        return;
    }

    $order_ids = array();
    foreach ($orders as $order) {
        $order_ids[] = (int)$order['id'];
    }
    $order_ids = array_values(array_unique(array_filter($order_ids)));
    if (empty($order_ids)) return;

    $ids_sql = implode(',', $order_ids);
    try {
        $sql = "SELECT z.zastupce_id, z.zastupovany_id, z.objekt_id, z.akce_typ, z.dt_akce,
                       u.jmeno AS zastupovany_jmeno_first, u.prijmeni AS zastupovany_jmeno_last
                FROM " . TBL_ZASTUPOVANI_AKCE_LOG . " z
                LEFT JOIN " . TBL_UZIVATELE . " u ON z.zastupovany_id = u.id
                WHERE z.objekt_typ = 'OBJEDNAVKA'
                  AND z.objekt_id IN ($ids_sql)";
        $stmt = $db->query($sql);
        $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : array();
    } catch (Exception $e) {
        error_log('[OrderV3 SubBatch] query failed: ' . $e->getMessage());
        $rows = array();
    }

    // Index: log_index[objekt_id][zastupce_id][] = row
    $log_index = array();
    foreach ($rows as $row) {
        $oid = (int)$row['objekt_id'];
        $zid = (int)$row['zastupce_id'];
        $log_index[$oid][$zid][] = $row;
    }

    $find_match = function($oid, $zastupce_id, $action_types, $dt_akce) use ($log_index) {
        if (empty($log_index[$oid][$zastupce_id])) return false;
        $target_ts = strtotime((string)$dt_akce);
        if ($target_ts === false) return false;
        $priority = array_flip(array_values($action_types));

        $best = null;
        $best_score = PHP_INT_MAX;
        $fallback = null;
        $fallback_score = PHP_INT_MAX;
        foreach ($log_index[$oid][$zastupce_id] as $candidate) {
            if (!isset($priority[$candidate['akce_typ']])) continue;
            $cand_ts = strtotime((string)$candidate['dt_akce']);
            if ($cand_ts === false) continue;
            $diff = abs($cand_ts - $target_ts);
            $score = $priority[$candidate['akce_typ']] * 1000000 + $diff;
            if ($score < $fallback_score) {
                $fallback_score = $score;
                $fallback = $candidate;
            }
            if ($diff <= 60 && $score < $best_score) {
                $best_score = $score;
                $best = $candidate;
            }
        }
        $winner = $best !== null ? $best : $fallback;
        if ($winner === null) return false;
        return array(
            'is_substitution' => true,
            'zastupovany_id' => (int)$winner['zastupovany_id'],
            'zastupovany_jmeno' => trim(($winner['zastupovany_jmeno_first'] ?? '') . ' ' . ($winner['zastupovany_jmeno_last'] ?? '')),
            'dt_akce' => $winner['dt_akce']
        );
    };

    foreach ($orders as &$order) {
        if (!isset($order['substitution_info']) || !is_array($order['substitution_info'])) {
            $order['substitution_info'] = array();
        }
        $oid = (int)$order['id'];

        // Schvalovatel
        if (!empty($order['schvalovatel_id']) && !empty($order['dt_schvaleni'])) {
            $action_types = resolveOrderApprovalActionTypesForSubstitution($order);
            $info = $find_match($oid, (int)$order['schvalovatel_id'], $action_types, $order['dt_schvaleni']);
            if ($info) $order['substitution_info']['schvalovatel'] = $info;
        }

        // Potvrdil věcnou správnost
        if (!empty($order['potvrdil_vecnou_spravnost_id']) && !empty($order['dt_potvrzeni_vecne_spravnosti'])) {
            $info = $find_match($oid, (int)$order['potvrdil_vecnou_spravnost_id'], array('CONFIRM'), $order['dt_potvrzeni_vecne_spravnosti']);
            if ($info) $order['substitution_info']['potvrdil_vecnou_spravnost'] = $info;
        }
    }
    unset($order);
}

/**
 * 🚀 MASTER BATCH ENRICHMENT FUNKCE
 * Nahrazuje per-order enrichment loop - optimalizace N+1 → batch queries
 * 
 * @param PDO $db
 * @param array &$orders - Reference na pole objednávek (budou obohaceny)
 */
function enrichOrdersV3Batch($db, &$orders) {
    if (empty($orders)) return;
    
    error_log("[OrderV3 Batch] Enriching " . count($orders) . " orders...");
    
    // ========================================================================
    // 1. PŘÍPRAVA - Sesbírat všechna potřebná ID
    // ========================================================================
    
    $order_ids = array();
    $lp_ids_all = array();
    $cisla_smluv = array();
    
    foreach ($orders as $order) {
        $order_ids[] = (int)$order['id'];
        
        // Sesbírat LP IDs z financovani.lp_kody
        if (isset($order['financovani']['lp_kody']) && is_array($order['financovani']['lp_kody'])) {
            foreach ($order['financovani']['lp_kody'] as $lp_id) {
                $lp_ids_all[] = (int)$lp_id;
            }
        }
        
        // Sesbírat čísla smluv
        if (isset($order['financovani']['cislo_smlouvy']) && !empty($order['financovani']['cislo_smlouvy'])) {
            $cisla_smluv[] = $order['financovani']['cislo_smlouvy'];
        }
    }
    
    // ========================================================================
    // 2. BATCH QUERIES - Načíst všechna data najednou
    // ========================================================================
    
    $lp_data = array();
    $smlouvy_data = array();
    $cerpano_data = array();
    $invoices_data = array();
    $attachments_data = array();
    
    if (!empty($lp_ids_all)) {
        $lp_data = getLPDetailyBatch($db, $lp_ids_all);
        error_log("[OrderV3 Batch] Loaded " . count($lp_data) . " LP records");
    }
    
    if (!empty($cisla_smluv)) {
        $smlouvy_data = getSmlouvyBatch($db, $cisla_smluv);
        $cerpano_data = getCerpanoVProceseBatch($db, $cisla_smluv);
        error_log("[OrderV3 Batch] Loaded " . count($smlouvy_data) . " smlouvy, " . count($cerpano_data) . " cerpano");
    }
    
    if (!empty($order_ids)) {
        $invoices_data = loadOrderInvoicesBatch($db, $order_ids);
        $attachments_data = getAttachmentStatusBatch($db, $order_ids);
        error_log("[OrderV3 Batch] Loaded invoices and attachments for " . count($order_ids) . " orders");
    }
    
    // ========================================================================
    // 3. APLIKACE - Obohacení jednotlivých objednávek z načtených dat
    // ========================================================================
    
    foreach ($orders as &$order) {
        $order_id = (int)$order['id'];
        
        // 3.1 Financování - typ_nazev mapping
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
        
        // 3.2 Financování - LP názvy
        if (isset($order['financovani']['lp_kody']) && is_array($order['financovani']['lp_kody'])) {
            $lp_nazvy = array();
            
            foreach ($order['financovani']['lp_kody'] as $lp_id) {
                if (isset($lp_data[(int)$lp_id])) {
                    $lp = $lp_data[(int)$lp_id];
                    $lp_nazvy[] = array(
                        'id' => $lp_id,
                        'cislo_lp' => $lp['cislo_lp'],
                        'cislo_uctu' => isset($lp['cislo_uctu']) ? $lp['cislo_uctu'] : null,
                        'kod' => $lp['cislo_lp'],
                        'nazev' => isset($lp['vyuziti']) && $lp['vyuziti'] ? $lp['vyuziti'] : $lp['nazev_uctu'],
                        'vyuziti' => isset($lp['vyuziti']) ? $lp['vyuziti'] : null,
                        'platne_do' => isset($lp['platne_do']) ? $lp['platne_do'] : null,
                        'usek_zkr' => isset($lp['usek_zkr']) ? $lp['usek_zkr'] : null,
                        'prikazce_jmeno' => isset($lp['prikazce_jmeno']) ? trim($lp['prikazce_jmeno']) : null,
                        'vyse_financniho_kryti' => isset($lp['vyse_financniho_kryti']) ? $lp['vyse_financniho_kryti'] : null
                    );
                }
            }
            
            if (!empty($lp_nazvy)) {
                $order['financovani']['lp_nazvy'] = $lp_nazvy;
            }
        }
        
        // 3.3 Financování - Smlouva info
        if (isset($order['financovani']['cislo_smlouvy']) && !empty($order['financovani']['cislo_smlouvy'])) {
            $cislo_smlouvy = $order['financovani']['cislo_smlouvy'];
            
            if (!isset($order['_enriched'])) {
                $order['_enriched'] = array();
            }
            
            if (isset($smlouvy_data[$cislo_smlouvy])) {
                $smlouva = $smlouvy_data[$cislo_smlouvy];
                $cerpano_v_procesu = isset($cerpano_data[$cislo_smlouvy]) ? $cerpano_data[$cislo_smlouvy] : 0.0;
                
                // Přidat název smlouvy a úsek přímo do financovani pro snadný přístup
                if (isset($smlouva['nazev_smlouvy']) && !empty($smlouva['nazev_smlouvy'])) {
                    $order['financovani']['nazev_smlouvy'] = $smlouva['nazev_smlouvy'];
                }
                if (isset($smlouva['usek_zkr']) && !empty($smlouva['usek_zkr'])) {
                    $order['financovani']['usek_zkr'] = $smlouva['usek_zkr'];
                }
                
                $order['_enriched']['smlouva_info'] = array(
                    'cislo_smlouvy' => $cislo_smlouvy,
                    'hodnota' => $smlouva['hodnota'],
                    'cerpano_v_procesu' => $cerpano_v_procesu,
                    'cerpano_pozadovano' => $smlouva['cerpano_pozadovano'],
                    'cerpano_planovano' => $smlouva['cerpano_planovano'],
                    'cerpano_skutecne' => $smlouva['cerpano_skutecne'],
                    'zbyva_pozadovano' => $smlouva['zbyva_pozadovano'],
                    'zbyva_planovano' => $smlouva['zbyva_planovano'],
                    'zbyva_skutecne' => $smlouva['zbyva_skutecne'],
                    'nazev_firmy' => isset($smlouva['nazev_firmy']) ? $smlouva['nazev_firmy'] : null,
                    'ico' => isset($smlouva['ico']) ? $smlouva['ico'] : null,
                    'nazev_smlouvy' => isset($smlouva['nazev_smlouvy']) ? $smlouva['nazev_smlouvy'] : null
                );
            } else {
                // Smlouva neexistuje - prázdná struktura
                $order['_enriched']['smlouva_info'] = array(
                    'cislo_smlouvy' => $cislo_smlouvy,
                    'hodnota' => null,
                    'cerpano_v_procesu' => 0.0,
                    'cerpano_pozadovano' => null,
                    'cerpano_planovano' => null,
                    'cerpano_skutecne' => null,
                    'zbyva_pozadovano' => null,
                    'zbyva_planovano' => null,
                    'zbyva_skutecne' => null,
                    'nazev_firmy' => null,
                    'ico' => null,
                    'nazev_smlouvy' => null
                );
            }
        }
        
        // 3.4 Faktury (nahrazuje enrichOrderWithInvoices)
        if (isset($invoices_data[$order_id])) {
            $order['faktury'] = $invoices_data[$order_id];
        } else {
            $order['faktury'] = array();
        }
        
        $order['faktury_count'] = count($order['faktury']);
        
        // ⚠️ DŮLEŽITÉ: Částka faktur je JIŽ spočítaná v hlavním SELECT jako subquery!
        // NEPŘEPISOVAT ji, protože by se ztratila správná hodnota z DB.
        // Původní enrichment logika přepisovala hodnotu na 0, pokud faktury nebyly v batchi.
        // -> Zachovat hodnotu z hlavního SELECT
        
        // Celková cena objednávky (podle priority: faktury > položky > max cena)
        $order['celkova_cena_s_dph'] = calculateOrderTotalPrice($order);
        
        // 3.5 Attachment status (nahrazuje enrichOrderWithAttachmentStatus)
        if (isset($attachments_data[$order_id])) {
            $order['attachment_color'] = $attachments_data[$order_id];
        } else {
            $order['attachment_color'] = '#cbd5e1'; // Default gray
        }
    }
    unset($order);
    
    error_log("[OrderV3 Batch] Enrichment completed");
}

function handle_order_v3_list($input, $config, $queries) {
    // 1. Validace požadavku - podporuj POST i GET
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST nebo GET metoda'));
        return;
    }

    // Merge GET parametry do $input (pro Excel Power Query kompatibilitu)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $input = array_merge($input, $_GET);
    }

    // 2. KONTROLA AUTENTIZACE - MUSÍ BÝT EXPLICITNĚ POVINNÁ
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $password = isset($input['password']) ? $input['password'] : '';
    
    // 🚨 POKUD CHYBÍ VŠECHNY CREDENTIALS - VRÁTIT 401 HNED!
    if (empty($username) && empty($password) && empty($token)) {
        // DEBUG: Log co Excel posílá
        error_log("[OrderV3 AUTH] NO CREDENTIALS - Logging request details:");
        error_log("[OrderV3 AUTH] METHOD: " . $_SERVER['REQUEST_METHOD']);
        error_log("[OrderV3 AUTH] HTTP_AUTHORIZATION: " . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET'));
        error_log("[OrderV3 AUTH] PHP_AUTH_USER: " . ($_SERVER['PHP_AUTH_USER'] ?? 'NOT SET'));
        
        // ⚠️ PROBLÉM: Nginx/FastCGI nedává Authorization header do PHP!
        http_response_code(401);
        header('WWW-Authenticate: Basic realm="ERDMS API"');
        header('Content-Type: application/json; charset=utf-8');
        
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Autentizace selhala',
            'auth_required' => true
        ));
        return;
    }

    // 🚀 EARLY DB CONNECTION - Potřebujeme $db pro ověření hesla
    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        TimezoneHelper::setMysqlTimezone($db);
    } catch (Exception $e) {
        error_log("[OrderV3] DB connection failed: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba serveru - nelze se připojit k databázi'));
        return;
    }
    
    // 3. OVĚŘENÍ CREDENTIALS
    // Pokud je heslo → ověř heslo a vygeneruj token
    if (!empty($username) && !empty($password)) {
        error_log("[OrderV3] Basic Auth attempt for user: " . $username);
        $token_data = verify_basic_auth($username, $password, $db);
        if ($token_data) {
            $token = $token_data['token'];
            error_log("[OrderV3] ✅ Basic Auth successful for user: " . $username);
        } else {
            error_log("[OrderV3] ❌ Basic Auth failed for user: " . $username);
            http_response_code(401);
            echo json_encode(array('status' => 'error', 'message' => 'Neplatné přihlašovací údaje'));
            return;
        }
    }
    
    // Pokud máme token, ověř ho
    if (!$token || !$username) {
        http_response_code(401);
        header('WWW-Authenticate: Basic realm="ERDMS API"');
        echo json_encode(array('status' => 'error', 'message' => 'Vyžaduje autentizaci'));
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
        // 3. Parametry paginace
        $page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
        $per_page = isset($input['per_page']) ? max(1, min(1000, (int)$input['per_page'])) : 50;
        $offset = ($page - 1) * $per_page;
        
        // DEBUG: Log pagination params
        error_log("[OrderV3] Pagination params: page=$page, per_page=$per_page, offset=$offset");
        
        // 5. Období pro filtrování (místo roku)
        $period = isset($input['period']) ? $input['period'] : 'all';
        
        // 6. Filtry
        $filters = isset($input['filters']) ? $input['filters'] : array();
        
        // 7. Třídění
        $sorting = isset($input['sorting']) ? $input['sorting'] : array();

        // 7.1 Kontext přístupu (např. vzdel)
        $access_context = isset($input['access_context']) ? $input['access_context'] : null;

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
                // lp_kody jsou integer pole v JSON → JSON_CONTAINS(financovani, id, '$.lp_kody')
                $lp_conditions[] = "JSON_CONTAINS(o.financovani, ?, '$.lp_kody')";
                $where_params[] = (string)$lp_id;
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
        
        // Filtr pro objednávky s nezaplacenými fakturami
        if (!empty($filters['s_nezaplacenymi_fakturami']) && $filters['s_nezaplacenymi_fakturami'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1 AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(f.stav, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ů', 'u')) NOT IN ('zaplaceno', 'dokoncena'))";
        }
        
        // Filtr pro objednávky se zaplacenými fakturami
        // Logika: stejná jako u badge "✓ zaplaceno" v UI - VŠECHNY faktury musí být ZAPLACENO/DOKONCENA
        if (!empty($filters['se_zaplacenou_fakturou']) && $filters['se_zaplacenou_fakturou'] === true) {
            $where_conditions[] = "(
                (SELECT COUNT(*) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                AND (SELECT COUNT(*) FROM " . TBL_FAKTURY . " f 
                     WHERE f.objednavka_id = o.id AND f.aktivni = 1
                     AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(f.stav, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ů', 'u')) NOT IN ('zaplaceno', 'dokoncena')
                ) = 0
            )";
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
        
        // 🎯 DASHBOARD FILTR: Fakturace v prodlení
        // Objednávky ve stavech POTVRZENA/FAKTURACE/VECNA_SPRAVNOST, které čekají na akci > 7 dní
        if (!empty($filters['fakturace_prodleni']) && $filters['fakturace_prodleni'] === true) {
            $where_conditions[] = "(
                JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']')))
                    IN ('POTVRZENA', 'FAKTURACE', 'VECNA_SPRAVNOST')
                AND DATEDIFF(CURDATE(), COALESCE(o.dt_aktualizace, o.dt_vytvoreni)) > 7
            )";
            error_log("[OrderV3 FILTER] ✅ Aplikuji FAKTURACE_PRODLENI filter (dashboard)");
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
        
        $is_admin_v2 = applyOrderV3UserPermissions($user_id, $db, $where_conditions, $where_params, $access_context);

        // ========================================================================
        // Volitelne filtrovani zrusenych/zamitnutych objednavek
        // ========================================================================
        // Defaultne v Order V3 listu zobrazujeme vse (krome id=1 a aktivni=0).
        // Pro Stats/Report lze explicitne pozadovat vylouceni techto stavu.
        // ========================================================================
        $exclude_cancelled = false;
        if (isset($input['exclude_cancelled'])) {
            $exclude_cancelled = filter_var($input['exclude_cancelled'], FILTER_VALIDATE_BOOLEAN);
        }
        if (isset($filters['exclude_cancelled'])) {
            $exclude_cancelled = $exclude_cancelled || filter_var($filters['exclude_cancelled'], FILTER_VALIDATE_BOOLEAN);
        }

        if ($exclude_cancelled) {
            $where_conditions[] = "(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))), '') NOT IN (?, ?, ?)"
                . " AND " . sqlNormalizeExpression('o.stav_objednavky') . " NOT IN ('zrusena', 'zamitnuta', 'smazana', 'storno', 'stornovana'))";
            $where_params[] = 'ZRUSENA';
            $where_params[] = 'ZAMITNUTA';
            $where_params[] = 'SMAZANA';
        }

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
                o.schvaleni_komentar,
                o.odeslani_storno_duvod,
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
                
                -- Naposledy aktualizoval (= kdo stornoval při stavu ZRUSENA)
                u11.id as aktualizoval_uid,
                u11.jmeno as aktualizoval_jmeno,
                u11.prijmeni as aktualizoval_prijmeni,
                u11.titul_pred as aktualizoval_titul_pred,
                u11.titul_za as aktualizoval_titul_za,
                
                                -- Položky (agregované v jednom JOINu)
                                COALESCE(polagg.pocet_polozek, 0) as pocet_polozek,
                                COALESCE(polagg.cena_s_dph, 0) as cena_s_dph,

                                -- Přílohy (agregované v jednom JOINu)
                                COALESCE(pragg.pocet_priloh, 0) as pocet_priloh,

                                -- Faktury - součet a count (agregované v jednom JOINu)
                                COALESCE(fagg.pocet_faktur, 0) as pocet_faktur,
                                COALESCE(fagg.faktury_celkova_castka_s_dph, 0) as faktury_celkova_castka_s_dph,

                                -- 🔍 Indikátor: 1 = všechny faktury jsou ZAPLACENO/DOKONCENA, 0 = jinak
                                (
                                    CASE
                                        WHEN COALESCE(fagg.pocet_faktur, 0) = 0 THEN 0
                                        WHEN COALESCE(fagg.nezaplacene_faktury_count, 0) = 0 THEN 1
                                        ELSE 0
                                    END
                                ) as faktury_vs_zaplaceno,

                                -- 🔍 Indikátor: 1 = alespoň jedna faktura má zamítnutou věcnou správnost (vecna_spravnost_potvrzeno = 2)
                                (COALESCE(fagg.vecna_spravnost_zamitnuto_count, 0) > 0) as faktury_vecna_spravnost_zamitnuta,

                                -- 🔍 Počet zamítnutých faktur
                                COALESCE(fagg.vecna_spravnost_zamitnuto_count, 0) as faktury_vecna_spravnost_zamitnuto_count,

                                -- 🔍 Důvod/poznámka zamítnutí věcné správnosti (z první zamítnuté faktury)
                                frejf.vecna_spravnost_duvod as faktury_vecna_spravnost_duvod,
                                frejf.vecna_spravnost_poznamka as faktury_vecna_spravnost_poznamka,
                
                -- Střediska (JSON array kódů)
                o.strediska_kod,
                
                -- 🆕 Kontrola a komentáře (Order V3)
                o.kontrola_metadata,
                COALESCE(komagg.comments_count, 0) as comments_count,
                komlast.last_comment_author,
                komagg.last_comment_date
                
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
            LEFT JOIN " . TBL_UZIVATELE . " u11 ON o.uzivatel_akt_id = u11.id
            LEFT JOIN (
                SELECT
                    pol.objednavka_id,
                    COUNT(*) as pocet_polozek,
                    COALESCE(SUM(pol.cena_s_dph), 0) as cena_s_dph
                FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol
                GROUP BY pol.objednavka_id
            ) polagg ON polagg.objednavka_id = o.id
            LEFT JOIN (
                SELECT
                    pr.objednavka_id,
                    COUNT(*) as pocet_priloh
                FROM " . TBL_OBJEDNAVKY_PRILOHY . " pr
                GROUP BY pr.objednavka_id
            ) pragg ON pragg.objednavka_id = o.id
            LEFT JOIN (
                SELECT
                    f.objednavka_id,
                    COUNT(*) as pocet_faktur,
                    COALESCE(SUM(f.fa_castka), 0) as faktury_celkova_castka_s_dph,
                    SUM(
                        CASE
                            WHEN LOWER(REPLACE(REPLACE(REPLACE(REPLACE(f.stav, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ů', 'u')) NOT IN ('zaplaceno', 'dokoncena') THEN 1
                            ELSE 0
                        END
                    ) as nezaplacene_faktury_count,
                    SUM(CASE WHEN f.vecna_spravnost_potvrzeno = 2 THEN 1 ELSE 0 END) as vecna_spravnost_zamitnuto_count
                FROM " . TBL_FAKTURY . " f
                WHERE f.aktivni = 1
                GROUP BY f.objednavka_id
            ) fagg ON fagg.objednavka_id = o.id
            LEFT JOIN (
                SELECT
                    f.objednavka_id,
                    MIN(f.id) as first_reject_faktura_id
                FROM " . TBL_FAKTURY . " f
                WHERE f.aktivni = 1
                  AND f.vecna_spravnost_potvrzeno = 2
                GROUP BY f.objednavka_id
            ) frej ON frej.objednavka_id = o.id
            LEFT JOIN " . TBL_FAKTURY . " frejf ON frejf.id = frej.first_reject_faktura_id
            LEFT JOIN (
                SELECT
                    kom.objednavka_id,
                    COUNT(*) as comments_count,
                    MAX(kom.dt_vytvoreni) as last_comment_date
                FROM " . TBL_OBJEDNAVKY_KOMENTARE . " kom
                WHERE kom.smazano = 0
                GROUP BY kom.objednavka_id
            ) komagg ON komagg.objednavka_id = o.id
            LEFT JOIN (
                SELECT
                    kom.objednavka_id,
                    SUBSTRING_INDEX(
                        GROUP_CONCAT(CONCAT(COALESCE(u.jmeno, ''), ' ', COALESCE(u.prijmeni, '')) ORDER BY kom.dt_vytvoreni DESC, kom.id DESC SEPARATOR '||'),
                        '||',
                        1
                    ) as last_comment_author
                FROM " . TBL_OBJEDNAVKY_KOMENTARE . " kom
                LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = kom.user_id
                WHERE kom.smazano = 0
                GROUP BY kom.objednavka_id
            ) komlast ON komlast.objednavka_id = o.id
            WHERE $where_sql
            ORDER BY $order_by_sql
            LIMIT $per_page OFFSET $offset
        ";
        
        
        // Přidat user_id pro subselect user_has_replied
        // ⚠️ DISABLED: user_has_replied subselect removed, no need for extra param
        $final_params = $where_params;
        
        $t_main = microtime(true);
        $stmt_orders = $db->prepare($sql_orders);
        $stmt_orders->execute($final_params);
        $orders = $stmt_orders->fetchAll(PDO::FETCH_ASSOC);
        error_log(sprintf("[OrderV3 PERF] mainSelect: %.1f ms (rows=%d)", (microtime(true) - $t_main) * 1000, count($orders)));
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
        
        // 13.1 Parsování JSON polí (musí být před batch enrichmentem)
        foreach ($orders as &$order) {
            // Parsovat financovani z TEXT/JSON do array
            if (isset($order['financovani'])) {
                $order['financovani'] = parseFinancovani($order['financovani']);
            }
            
            // Parsovat stav_workflow_kod z JSON do array
            if (isset($order['stav_workflow_kod'])) {
                $order['stav_workflow_kod'] = safeJsonDecode($order['stav_workflow_kod'], array());
            }
            
            // Parsovat strediska_kod z JSON string na array
            if (isset($order['strediska_kod']) && is_string($order['strediska_kod']) && $order['strediska_kod'] !== '') {
                $decoded = json_decode($order['strediska_kod'], true);
                $order['strediska_kod'] = (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) ? $decoded : [];
            } elseif (!isset($order['strediska_kod'])) {
                $order['strediska_kod'] = [];
            }
        }
        unset($order);
        
        // 13.2 🚀 BATCH ENRICHMENT - optimalizované obohacení dat (NOVÁ VERZE)
        // Nahrazuje per-order loop který volal 5× enrichment funkcí pro každou objednávku
        // Nová verze: VŠECHNY dotazy najednou → 300-400 dotazů → ~10 dotazů
        $t_enrich = microtime(true);
        enrichOrdersV3Batch($db, $orders);
        error_log(sprintf("[OrderV3 PERF] enrichOrdersV3Batch: %.1f ms", (microtime(true) - $t_enrich) * 1000));
        
        // 13.3 Jednotlivé enrichmenty které používají existující JOIN data (bez DB volání)
        foreach ($orders as &$order) {
            // enrichDodavatelV3 a enrichRegistrZverejneniV3 teď jen mapují existující data
            enrichDodavatelV3($db, $order);
            enrichRegistrZverejneniV3($db, $order);
        }
        unset($order);
        
        // 13.4 🎯 SUBSTITUTION INFO - Přidej informace o zastoupení ke každé akci
        // 🚀 BATCH VERZE: nahrazuje per-order N+1 loop jedním query na TBL_ZASTUPOVANI_AKCE_LOG
        $t_sub = microtime(true);
        foreach ($orders as &$order) {
            if (!isset($order['substitution_info'])) $order['substitution_info'] = [];
        }
        unset($order);
        enrichOrdersV3WithSubstitutionBatch($db, $orders);
        error_log(sprintf("[OrderV3 PERF] substitutionBatch: %.1f ms", (microtime(true) - $t_sub) * 1000));

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
 * Export všech objednávek bez pagingu - pro Excel Power Query
 * GET nebo POST /order-v3/export
 * 
 * ⚠️ KOPIE handle_order_v3_list s odstraněním pagingu!
 * Vrací VŠECHNY objednávky bez LIMIT/OFFSET jako přímé pole.
 * 
 * Autentizace:
 * 1. Bearer Token (EntraID) - preferovaná metoda
 * 2. Query string (username + password) - fallback
 */
function handle_order_v3_export($input, $config, $queries) {
    // 1. Validace požadavku - podporuj POST i GET
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST nebo GET metoda'));
        return;
    }

    // Merge GET parametry do $input (pro Excel Power Query kompatibilitu)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $input = array_merge($input, $_GET);
    }

    // 2. KONTROLA AUTENTIZACE - podpora Bearer Token + Basic Auth
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $password = isset($input['password']) ? $input['password'] : '';
    $bearer_token = '';
    
    // Zkus Bearer Token (EntraID) z HTTP Authorization header
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        if (preg_match('/^Bearer\s+(.+)$/i', $auth_header, $matches)) {
            $bearer_token = $matches[1];
        }
    }
    
    // 🚨 POKUD CHYBÍ VŠECHNY CREDENTIALS - VRÁTIT 401 HNED!
    if (empty($bearer_token) && empty($username) && empty($password) && empty($token)) {
        http_response_code(401);
        header('WWW-Authenticate: Bearer realm="ERDMS API"');
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Autentizace selhala'
        ));
        return;
    }

    // 🚀 EARLY DB CONNECTION - Potřebujeme $db pro ověření hesla a Bearer tokenu
    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        TimezoneHelper::setMysqlTimezone($db);
    } catch (Exception $e) {
        error_log("[OrderV3Export] DB connection failed: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba serveru - nelze se připojit k databázi'));
        return;
    }
    
    // 3. OVĚŘENÍ CREDENTIALS
    $user_id = 0;
    
    // 3a. Zkus Bearer Token (EntraID) - PRIORITA
    if ($bearer_token) {
        $token_data = verify_entra_bearer_token($bearer_token, $db);
        if ($token_data) {
            $username = $token_data['username'];
            $user_id = $token_data['user_id'];
            $token = $token_data['token'];
        } else {
            http_response_code(401);
            echo json_encode(array('status' => 'error', 'message' => 'Neplatný EntraID token'));
            return;
        }
    }
    // 3b. Zkus Basic Auth (heslo z query string nebo body)
    elseif (!empty($username) && !empty($password)) {
        $token_data = verify_basic_auth($username, $password, $db);
        if ($token_data) {
            $token = $token_data['token'];
            $user_id = $token_data['user_id'];
        } else {
            http_response_code(401);
            echo json_encode(array('status' => 'error', 'message' => 'Neplatné přihlašovací údaje'));
            return;
        }
    }
    
    // Pokud máme token, ověř ho
    if (!$token || !$username) {
        http_response_code(401);
        header('WWW-Authenticate: Bearer realm="ERDMS API"');
        echo json_encode(array('status' => 'error', 'message' => 'Vyžaduje autentizaci'));
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    $user_id = isset($token_data['id']) ? (int)$token_data['id'] : $user_id;

    try {
        // ⚠️ EXPORT MODE: BEZ PAGINGU! Vrací všechny záznamy najednou.
        
        // Parametry zůstávají stejné jako v list (pro filtrování)
        $period = isset($input['period']) ? $input['period'] : null;
        $filters = isset($input['filters']) && is_array($input['filters']) ? $input['filters'] : array();
        
        // KOPIE LOGIKY Z handle_order_v3_list - bez pagingu!
        // ... použijeme stejné getOrdersWithFullFilters jako v list
        // ... ale bez LIMIT/OFFSET
        
        // Načti objednávky (viz handle_order_v3_list pro full logiku)
        // Tady zjednodušení: vezmi stejný SQL jako v list, jen bez LIMIT
        
        // Zavolej getOrdersWithFullFilters (pokud existuje) nebo построй query
        // Pro teď: zjednodušená verze bez komplexních filtrů
        
        $sql = "
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
                o.schvaleni_komentar,
                o.odeslani_storno_duvod,
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
                o.dodavatel_id,
                COALESCE(o.dodavatel_nazev, d.nazev) as dodavatel_nazev,
                COALESCE(o.dodavatel_ico, d.ico) as dodavatel_ico,
                o.dodavatel_adresa,
                o.dodavatel_kontakt_jmeno,
                o.dodavatel_kontakt_email,
                o.dodavatel_kontakt_telefon,
                u1.id as objednatel_id,
                u1.jmeno as objednatel_jmeno,
                u1.prijmeni as objednatel_prijmeni,
                u1.titul_pred as objednatel_titul_pred,
                u1.titul_za as objednatel_titul_za,
                u1.email as objednatel_email,
                COALESCE(o.objednatel_id, o.uzivatel_id) as vytvoril_id,
                u2.id as garant_id,
                u2.jmeno as garant_jmeno,
                u2.prijmeni as garant_prijmeni,
                u3.id as prikazce_id,
                u3.jmeno as prikazce_jmeno,
                u3.prijmeni as prikazce_prijmeni,
                u4.id as schvalovatel_id,
                u4.jmeno as schvalovatel_jmeno,
                u4.prijmeni as schvalovatel_prijmeni,
                u4.titul_pred as schvalovatel_titul_pred,
                u4.titul_za as schvalovatel_titul_za,
                o.strediska_kod,
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
            WHERE o.aktivni = 1
            ORDER BY o.dt_vytvoreni DESC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        

        
        // EXPORT RESPONSE - Vrátit přímo pole bez pagination wrapperu!
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($orders, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při exportu objednávek: ' . $e->getMessage()
        ));
    }
}

/**
 * Načte přehled majetku (rozšířený majetek + faktury s umístěním)
 * POST /order-v3/majetek-list
 *
 * Vrací:
 * 1. Všechny objednávky klasifikované jako MAJETEK (ELEKTRONIKA, FKSP, MAJETEK, NABYTEK, VZDELAVANI_VYBAVENI)
 * 2. PLUS všechny faktury s vyplněným vecna_spravnost_umisteni_majetku (bez ohledu na vazbu)
 * 
 * Podporuje period + filtr stav[] (workflow) a vrací rozšířená data:
 * - polozky_celkova_cena_s_dph
 * - umisteni_polozky (usek/budova/mistnost) - z položek objednávky
 * - umisteni_majetku - z faktury (věcná správnost)
 * - strediska_nazvy
 * - druh_objednavky_nazev
 * - cislo_smlouvy
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
        $per_page = isset($input['per_page']) ? max(1, min(1000, (int)$input['per_page'])) : 50;
        $offset = ($page - 1) * $per_page;

        $period = isset($input['period']) ? $input['period'] : 'last-month';
        $filters = isset($input['filters']) ? $input['filters'] : array();

        // MAJETEK kódy druhu objednávky
        $majetek_codes = array('ELEKTRONIKA', 'FKSP', 'MAJETEK', 'NABYTEK', 'VZDELAVANI_VYBAVENI');

        // Podmínky pro OBJEDNÁVKY MAJETEK
        $where_orders = array();
        $params_orders = array();
        $where_orders[] = "o.aktivni = 1";
        $where_orders[] = "o.id != 1";
        
        // Druh objednávky - MAJETEK
        $majetek_placeholders = implode(',', array_fill(0, count($majetek_codes), '?'));
        $where_orders[] = "(JSON_UNQUOTE(JSON_EXTRACT(o.druh_objednavky_kod, '$.kod_stavu')) IN ($majetek_placeholders))";
        $params_orders = array_merge($params_orders, $majetek_codes);

        $period_range = calculatePeriodRange($period);
        if ($period_range !== null) {
            $where_orders[] = "o.dt_objednavky BETWEEN ? AND ?";
            $params_orders[] = $period_range['date_from'];
            $params_orders[] = $period_range['date_to'];
        }

        // Filtr: stav workflow
        $workflow_condition = '';
        $workflow_params = array();
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
                $workflow_condition = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) IN ($wf_placeholders)";
                $workflow_params = $workflow_codes;
                $where_orders[] = $workflow_condition;
                $params_orders = array_merge($params_orders, $workflow_params);
            }
        }

        // 🔐 ASSET SPECIFIC PERMISSIONS CHECK
        // ASSET_MANAGE → vidí všechny majetkové objednávky (jako admin)
        // ASSET_VIEW/ASSET_EDIT → vidí jen své + kolegy z úseku (pokud má subordinate)
        $asset_permissions = getUserSpecificPermissions($user_id, $db, array('ASSET_MANAGE', 'ASSET_VIEW', 'ASSET_EDIT', 'ASSET_EXPORT'));
        $has_asset_manage = in_array('ASSET_MANAGE', $asset_permissions);
        
        error_log("[OrderV3 MAJETEK] User $user_id - asset_permissions: " . json_encode($asset_permissions));
        error_log("[OrderV3 MAJETEK] Has ASSET_MANAGE: " . ($has_asset_manage ? 'YES (vidí vše)' : 'NO (jen své + kolegy)'));
        
        // Permissions pro objednávky - pokud NEMÁ ASSET_MANAGE → aplikovat běžný filtr
        if (!$has_asset_manage) {
            applyOrderV3UserPermissions($user_id, $db, $where_orders, $params_orders);
            error_log("[OrderV3 MAJETEK] Applied standard user permissions (personal + department subordinate)");
        } else {
            error_log("[OrderV3 MAJETEK] ASSET_MANAGE detected - showing ALL asset orders (no filter)");
        }

        // Vyloučit zrušené, zamítnuté a smazané objednávky (vždy, bez ohledu na user filtr)
        $where_orders[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('\$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) NOT IN (?, ?, ?)";
        $params_orders[] = 'ZRUSENA';
        $params_orders[] = 'ZAMITNUTA';
        $params_orders[] = 'SMAZANA';

        $where_orders_sql = implode(' AND ', $where_orders);

        // 🔐 Podmínky pro FAKTURY s umístěním
        $where_faktury = array();
        $params_faktury = array();
        $where_faktury[] = "f.aktivni = 1";
        $where_faktury[] = "f.vecna_spravnost_umisteni_majetku IS NOT NULL";
        $where_faktury[] = "f.vecna_spravnost_umisteni_majetku != ''";

        if ($period_range !== null) {
            $where_faktury[] = "f.fa_datum_vystaveni BETWEEN ? AND ?";
            $params_faktury[] = $period_range['date_from'];
            $params_faktury[] = $period_range['date_to'];
        }
        
        // 🔐 ASSET PERMISSIONS: Faktury vidí jen pokud má právo nebo je účastníkem
        if (!$has_asset_manage) {
            error_log("[OrderV3 MAJETEK] Applying invoice filter for user $user_id (no ASSET_MANAGE)");
            
            // Faktury kde:
            // 1. Je přiřazena k objednávce kde je user účastníkem (bude v UNION části s objednávkami)
            // 2. Není přiřazena k objednávce, ALE:
            //    - user fakturu vytvořil, NEBO
            //    - user je zodpovědný za věcnou správnost, NEBO
            //    - user má subordinate práva a faktura patří kolegovi z úseku
            
            $user_permissions = getUserOrderPermissions($user_id, $db);
            $hasOrderReadSubordinate = in_array('ORDER_READ_SUBORDINATE', $user_permissions);
            $hasOrderEditSubordinate = in_array('ORDER_EDIT_SUBORDINATE', $user_permissions);
            
            $invoice_conditions = array();
            
            // Základní: faktury kde je user přímo zapojen
            $invoice_conditions[] = "(f.vytvoril_uzivatel_id = {$user_id})";
            $invoice_conditions[] = "(f.potvrdil_vecnou_spravnost_id = {$user_id})";
            $invoice_conditions[] = "(f.fa_predana_zam_id = {$user_id})";
            
            // Pokud má subordinate práva → vidí faktury kolegů z úseku
            if ($hasOrderReadSubordinate || $hasOrderEditSubordinate) {
                if (function_exists('getUserDepartmentColleagueIds')) {
                    $departmentColleagueIds = getUserDepartmentColleagueIds($user_id, $db);
                    if (!empty($departmentColleagueIds)) {
                        $dept_ids_str = implode(',', array_map('intval', $departmentColleagueIds));
                        $invoice_conditions[] = "(f.vytvoril_uzivatel_id IN ({$dept_ids_str}))";
                        $invoice_conditions[] = "(f.potvrdil_vecnou_spravnost_id IN ({$dept_ids_str}))";
                        $invoice_conditions[] = "(f.fa_predana_zam_id IN ({$dept_ids_str}))";
                        error_log("[OrderV3 MAJETEK] Added department invoice filter for " . count($departmentColleagueIds) . " colleagues");
                    }
                }
            }
            
            if (!empty($invoice_conditions)) {
                $where_faktury[] = '(' . implode(' OR ', $invoice_conditions) . ')';
            } else {
                // Uživatel nemá přístup k žádným fakturám bez objednávky
                $where_faktury[] = '1=0';
                error_log("[OrderV3 MAJETEK] User $user_id has NO access to invoices without orders");
            }
        } else {
            error_log("[OrderV3 MAJETEK] ASSET_MANAGE - showing ALL invoices (no filter)");
        }

        $where_faktury_sql = implode(' AND ', $where_faktury);

        // COUNT - celkový počet záznamů (objednávky MAJETEK + faktury s umístěním)
        $sql_count = "
            SELECT COUNT(*) as total FROM (
                SELECT o.id FROM " . TBL_OBJEDNAVKY . " o
                LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
                WHERE $where_orders_sql
                UNION
                SELECT CONCAT('F', f.id) as id FROM " . TBL_FAKTURY . " f
                WHERE $where_faktury_sql
            ) combined
        ";
        
        $all_params = array_merge($params_orders, $params_faktury);
        $stmt_count = $db->prepare($sql_count);
        $stmt_count->execute($all_params);
        $total_count = (int)$stmt_count->fetchColumn();
        $total_pages = $total_count > 0 ? ceil($total_count / $per_page) : 0;
        error_log('[OrderV3 MAJETEK] Count=' . $total_count . ' (orders+invoices), pages=' . $total_pages);

        // Hlavní UNION dotaz - objednávky MAJETEK + faktury s umístěním
        $sql_combined = "
            SELECT * FROM (
                SELECT 
                    o.id,
                    o.cislo_objednavky,
                    o.predmet,
                    o.dt_objednavky as datum,
                    o.stav_workflow_kod,
                    o.max_cena_s_dph,
                    o.druh_objednavky_kod,
                    o.strediska_kod,
                    COALESCE(o.dodavatel_nazev, d.nazev) as dodavatel_nazev,
                    (SELECT COALESCE(SUM(p.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " p WHERE p.objednavka_id = o.id) as polozky_celkova_cena_s_dph,
                    (SELECT COUNT(*) FROM " . TBL_FAKTURY . " f2 WHERE f2.objednavka_id = o.id AND f2.aktivni = 1) as pocet_faktur,
                    (SELECT COALESCE(SUM(f2.fa_castka), 0) FROM " . TBL_FAKTURY . " f2 WHERE f2.objednavka_id = o.id AND f2.aktivni = 1) as faktury_celkova_castka_s_dph,
                    (SELECT f2.vecna_spravnost_umisteni_majetku FROM " . TBL_FAKTURY . " f2 WHERE f2.objednavka_id = o.id AND f2.aktivni = 1 AND f2.vecna_spravnost_umisteni_majetku IS NOT NULL ORDER BY f2.id DESC LIMIT 1) as umisteni_majetku,
                    (SELECT COUNT(*) FROM " . TBL_OBJEDNAVKY_PRILOHY . " pr WHERE pr.objednavka_id = o.id) as pocet_priloh,
                    NULL as cislo_smlouvy,
                    NULL as fa_cislo_vema,
                    NULL as fa_vema_kod,
                    'ORDER' as source_type,
                    us_ord.usek_zkr as usek_zkr,
                    COALESCE(u_obj.prijmeni, '') as objednatel_prijmeni,
                    COALESCE(LEFT(u_obj.jmeno, 1), '') as objednatel_jmeno_init,
                    COALESCE(u_prik.prijmeni, '') as schvalovatel_prijmeni,
                    COALESCE(LEFT(u_prik.jmeno, 1), '') as schvalovatel_jmeno_init
                FROM " . TBL_OBJEDNAVKY . " o
                LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
                LEFT JOIN " . TBL_UZIVATELE . " uzad_ord ON uzad_ord.id = o.uzivatel_id
                LEFT JOIN " . TBL_USEKY . " us_ord ON us_ord.id = uzad_ord.usek_id
                LEFT JOIN " . TBL_UZIVATELE . " u_obj ON u_obj.id = COALESCE(o.objednatel_id, o.uzivatel_id)
                LEFT JOIN " . TBL_UZIVATELE . " u_prik ON u_prik.id = o.prikazce_id
                WHERE $where_orders_sql
                
                UNION ALL
                
                SELECT 
                    CONCAT('F', f.id) as id,
                    NULL as cislo_objednavky,
                    CONCAT('Faktura - ', COALESCE(s.nazev_smlouvy, 'Nezařazeno')) as predmet,
                    f.fa_datum_vystaveni as datum,
                    NULL as stav_workflow_kod,
                    f.fa_castka as max_cena_s_dph,
                    NULL as druh_objednavky_kod,
                    f.fa_strediska_kod as strediska_kod,
                    COALESCE(s.nazev_firmy, '') as dodavatel_nazev,
                    0 as polozky_celkova_cena_s_dph,
                    1 as pocet_faktur,
                    f.fa_castka as faktury_celkova_castka_s_dph,
                    f.vecna_spravnost_umisteni_majetku as umisteni_majetku,
                    0 as pocet_priloh,
                    s.cislo_smlouvy,
                    f.fa_cislo_vema,
                    f.fa_vema_kod,
                    'INVOICE' as source_type,
                    NULL as usek_zkr,
                    COALESCE(u_fvyt.prijmeni, '') as objednatel_prijmeni,
                    COALESCE(LEFT(u_fvyt.jmeno, 1), '') as objednatel_jmeno_init,
                    COALESCE(u_fvec.prijmeni, '') as schvalovatel_prijmeni,
                    COALESCE(LEFT(u_fvec.jmeno, 1), '') as schvalovatel_jmeno_init
                FROM " . TBL_FAKTURY . " f
                LEFT JOIN 25_smlouvy s ON f.smlouva_id = s.id
                LEFT JOIN " . TBL_UZIVATELE . " u_fvyt ON u_fvyt.id = f.vytvoril_uzivatel_id
                LEFT JOIN " . TBL_UZIVATELE . " u_fvec ON u_fvec.id = f.potvrdil_vecnou_spravnost_id
                WHERE $where_faktury_sql
                AND f.objednavka_id IS NULL
            ) combined
            ORDER BY datum DESC
            LIMIT $per_page OFFSET $offset
        ";

        $stmt_combined = $db->prepare($sql_combined);
        $stmt_combined->execute($all_params);
        $orders = $stmt_combined->fetchAll(PDO::FETCH_ASSOC);
        error_log('[OrderV3 MAJETEK] Combined loaded=' . count($orders));

        if (!empty($orders)) {
            // Separovat skutečné order IDs (ne faktury s prefixem "F")
            $real_order_ids = array();
            foreach ($orders as $row) {
                if ($row['source_type'] === 'ORDER') {
                    $real_order_ids[] = (int)$row['id'];
                }
            }

            $items_by_order = array();
            
            // Načíst položky s umístěním pouze pro skutečné objednávky
            if (!empty($real_order_ids)) {
                $order_placeholders = implode(',', array_fill(0, count($real_order_ids), '?'));
                $sql_items = "
                    SELECT objednavka_id, usek_kod, budova_kod, mistnost_kod, poznamka
                    FROM " . TBL_OBJEDNAVKY_POLOZKY . "
                    WHERE objednavka_id IN ($order_placeholders)
                    ORDER BY id ASC
                ";
                $stmt_items = $db->prepare($sql_items);
                $stmt_items->execute($real_order_ids);
                $items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

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
                $source_type = $order['source_type'] ?? 'ORDER';
                $order_id = ($source_type === 'ORDER') ? (int)$order['id'] : null;

                // Pro objednávky: workflow JSON -> array
                if ($source_type === 'ORDER' && isset($order['stav_workflow_kod'])) {
                    $order['stav_workflow_kod'] = safeJsonDecode($order['stav_workflow_kod'], array());
                }

                // Umístění položek (pouze pro objednávky)
                if ($source_type === 'ORDER' && $order_id) {
                    $order['umisteni_polozky'] = isset($items_by_order[$order_id]) ? $items_by_order[$order_id] : array();
                } else {
                    $order['umisteni_polozky'] = array();
                }

                // Střediska - názvy (může být i pro faktury)
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

                // Druh objednávky - název (pouze pro objednávky)
                if ($source_type === 'ORDER' && !empty($order['druh_objednavky_kod'])) {
                    $druh_kod = $order['druh_objednavky_kod'];
                    $decoded = json_decode($druh_kod, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && isset($decoded['kod_stavu'])) {
                        $druh_kod = $decoded['kod_stavu'];
                    }
                    if ($druh_kod && isset($druh_map[$druh_kod])) {
                        $order['druh_objednavky_nazev'] = $druh_map[$druh_kod]['nazev_stavu'];
                        $order['druh_objednavky_atribut'] = isset($druh_map[$druh_kod]['atribut_objektu']) ? (int)$druh_map[$druh_kod]['atribut_objektu'] : 0;
                    }
                } elseif ($source_type === 'INVOICE') {
                    // Pro faktury nastavit fake druh
                    $order['druh_objednavky_nazev'] = 'Faktura (samostatná)';
                    $order['druh_objednavky_atribut'] = 1; // MAJETEK atribut
                }

                // Attachment color - pro objednávky spočti barvu příloh, pro faktury šedá
                if ($source_type === 'ORDER' && $order_id) {
                    enrichOrderWithAttachmentStatus($db, $order);
                } else {
                    $order['attachment_color'] = '#cbd5e1'; // Šedá - samostatná faktura (bez příloh objednávky)
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
    
    // ⚠️ Vyloučit zrušené, zamítnuté a smazané objednávky (vždy při výpočtu statistik)
    $where_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) NOT IN (?, ?, ?)";
    $where_params[] = 'ZRUSENA';
    $where_params[] = 'ZAMITNUTA';
    $where_params[] = 'SMAZANA';
    
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
            -- FAKTURACE V PRODLENÍ (>7 dní ve stavech POTVRZENA/FAKTURACE/VECNA_SPRAVNOST)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']')))
                        IN ('POTVRZENA', 'FAKTURACE', 'VECNA_SPRAVNOST')
                    AND DATEDIFF(CURDATE(), COALESCE(o.dt_aktualizace, o.dt_vytvoreni)) > 7
                THEN 1 
                ELSE 0 
            END) as fakturace_prodleni,
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
            -- S NEZAPLACENÝMI FAKTURAMI (alespoň jedna faktura není v stavu ZAPLACENO/DOKONCENA)
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_FAKTURY . " f 
                    WHERE f.objednavka_id = o.id AND f.aktivni = 1
                    AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(f.stav, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ů', 'u')) NOT IN ('zaplaceno', 'dokoncena')
                ) THEN 1 
                ELSE 0 
            END) as withUnpaidInvoices,
            -- SE ZAPLACENÝMI FAKTURAMI (VŠECHNY faktury musí být ZAPLACENO/DOKONCENA - stejně jako badge v UI)
            SUM(CASE 
                WHEN (SELECT COUNT(*) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                  AND (SELECT COUNT(*) FROM " . TBL_FAKTURY . " f 
                       WHERE f.objednavka_id = o.id AND f.aktivni = 1
                       AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(f.stav, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ů', 'u')) NOT IN ('zaplaceno', 'dokoncena')
                  ) = 0
                THEN 1 
                ELSE 0 
            END) as withPaidInvoices,
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
        'fakturace', 'vecna_spravnost', 'fakturace_prodleni', 'zkontrolovana', 'dokoncena', 'zrusena',
        'smazana', 'withInvoices', 'withUnpaidInvoices', 'withPaidInvoices', 'withAttachments', 'withoutObjAttachments', 'mimoradneUdalosti', 'mojeObjednavky',
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
            -- FAKTURACE V PRODLENÍ (>7 dní ve stavech POTVRZENA/FAKTURACE/VECNA_SPRAVNOST)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']')))
                        IN ('POTVRZENA', 'FAKTURACE', 'VECNA_SPRAVNOST')
                    AND DATEDIFF(CURDATE(), COALESCE(o.dt_aktualizace, o.dt_vytvoreni)) > 7
                THEN 1 
                ELSE 0 
            END) as fakturace_prodleni,
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
        'fakturace', 'vecna_spravnost', 'fakturace_prodleni', 'zkontrolovana', 'dokoncena', 'zrusena', 
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
            WHERE p.objednavka_id = ?
            ORDER BY p.id ASC
        ";
        
        $stmt_items = $db->prepare($sql_items);
        $stmt_items->execute(array($order_id));
        $items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

        // Načíst přílohy
        $sql_attachments = "
            SELECT 
                p.id,
                p.guid,
                p.originalni_nazev_souboru,
                p.systemova_cesta,
                p.typ_prilohy,
                p.velikost_souboru_b,
                p.nahrano_uzivatel_id,
                p.dt_vytvoreni,
                u.jmeno as nahral_jmeno,
                u.prijmeni as nahral_prijmeni,
                u.email as nahral_email,
                u.titul_pred as nahral_titul_pred,
                u.titul_za as nahral_titul_za
            FROM " . TBL_OBJEDNAVKY_PRILOHY . " p
            LEFT JOIN " . TBL_UZIVATELE . " u ON p.nahrano_uzivatel_id = u.id
            WHERE p.objednavka_id = ?
            ORDER BY p.dt_vytvoreni DESC
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
 *         "max_dph": 123456.78,
 *         "polozky_sum": 98765.43,
 *         "faktury_sum": 87654.32
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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $year = isset($input['year']) ? (int)$input['year'] : (int)date('Y');

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    // Ověření tokenu - stejný pattern jako handle_order_v3_stats
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

        $start_date = "$year-01-01";
        $end_date = "$year-12-31";

        // WHERE podmínky + user permissions
        // Správné sloupce ověřeny z DB: max_cena_s_dph, dt_vytvoreni, aktivni
        $where_conditions = array('o.aktivni = 1');
        $where_params = array();
        applyOrderV3UserPermissions($user_id, $db, $where_conditions, $where_params);

        // Přidat datum rozsahu
        $where_conditions[] = 'DATE(o.dt_vytvoreni) >= ?';
        $where_conditions[] = 'DATE(o.dt_vytvoreni) <= ?';
        $where_params[] = $start_date;
        $where_params[] = $end_date;

        $where_sql = implode(' AND ', $where_conditions);

        // SQL - denní agregace
        // Ověřené sloupce z DB:
        //   25a_objednavky: max_cena_s_dph, dt_vytvoreni, aktivni
        //   25a_objednavky_polozky: cena_s_dph, objednavka_id
        //   25a_objednavky_faktury: fa_castka, objednavka_id, aktivni
        $sql = "
            SELECT
                DATE(o.dt_vytvoreni) as datum,
                COALESCE(SUM(o.max_cena_s_dph), 0) as max_dph,
                COALESCE(SUM(
                    (SELECT COALESCE(SUM(pol.cena_s_dph), 0)
                     FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol
                     WHERE pol.objednavka_id = o.id)
                ), 0) as polozky_sum,
                COALESCE(SUM(
                    (SELECT COALESCE(SUM(f.fa_castka), 0)
                     FROM " . TBL_FAKTURY . " f
                     WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                ), 0) as faktury_sum
            FROM " . TBL_OBJEDNAVKY . " o
            WHERE $where_sql
            GROUP BY DATE(o.dt_vytvoreni)
            ORDER BY datum ASC
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute($where_params);
        $timeline = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Frontend očekává _cumulative pole + kumulativní součty
        $cum_max_dph = 0.0;
        $cum_polozky = 0.0;
        $cum_faktury = 0.0;
        foreach ($timeline as &$row) {
            $cum_max_dph += (float)$row['max_dph'];
            $cum_polozky += (float)$row['polozky_sum'];
            $cum_faktury += (float)$row['faktury_sum'];
            $row['max_dph_cumulative']     = $cum_max_dph;
            $row['polozky_sum_cumulative'] = $cum_polozky;
            $row['faktury_sum_cumulative'] = $cum_faktury;
        }
        unset($row);

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'timeline' => $timeline,
                'year' => $year,
                'start_date' => $start_date,
                'end_date' => $end_date
            ),
            'message' => 'Timeline data načtena úspěšně'
        ));

    } catch (Exception $e) {
        error_log('[OrderV3 Timeline] Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání timeline dat: ' . $e->getMessage()
        ));
    }
}

/**
 * 🎨 ENRICHMENT: Vypočítá barvu ikony přílohy podle klasifikací (pro vzdělávání tab)
 * 
 * Logika barev:
 * - 🔴 Červená (#dc2626): 0 příloh NEBO chybí základní OBJ příloha (PODKLADY nebo CESTOVNI_PRIKAZ)
 * - 🟢 Zelená (#16a34a): Kompletní - 2+ FAKTURA + (2+ PODKLADY NEBO CESTOVNI_PRIKAZ + CERTIFIKAT)
 * - 🟡 Žlutá (#fbbf24): Má 2+ FAKTURA příloh z faktur
 * - 🟠 Oranžová (#f97316): Má základní OBJ přílohy, ale chybí/neúplné faktury
 * - ⚪ Světle šedá (#cbd5e1): 0 příloh celkem
 * 
 * @param PDO $db
 * @param array &$order - Reference na objednávku (bude doplněno pole attachment_color)
 */
function enrichOrderWithAttachmentStatus($db, &$order) {
    try {
        $order_id = (int)$order['id'];
        
        // 1. Načti přílohy objednávky
        $sql_order = "SELECT typ_prilohy FROM " . TBL_OBJEDNAVKY_PRILOHY . " 
                      WHERE objednavka_id = ?";
        $stmt = $db->prepare($sql_order);
        $stmt->execute([$order_id]);
        $order_attachments = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // 2. Načti přílohy všech faktur objednávky
        $sql_invoices = "SELECT id FROM " . TBL_FAKTURY . " 
                         WHERE objednavka_id = ? AND aktivni = 1";
        $stmt = $db->prepare($sql_invoices);
        $stmt->execute([$order_id]);
        $invoice_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $invoice_attachments = [];
        if (!empty($invoice_ids)) {
            $placeholders = implode(',', array_fill(0, count($invoice_ids), '?'));
            $sql_fa_prilohy = "SELECT typ_prilohy FROM " . TBL_FAKTURY_PRILOHY . " 
                               WHERE faktura_id IN ($placeholders)";
            $stmt = $db->prepare($sql_fa_prilohy);
            $stmt->execute($invoice_ids);
            $invoice_attachments = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
        
        // 3. Spočítej klasifikace
        $total_count = count($order_attachments) + count($invoice_attachments);
        $obj_podklady = count(array_filter($order_attachments, fn($t) => $t === 'PODKLADY'));
        $obj_cestovni_prikaz = count(array_filter($order_attachments, fn($t) => $t === 'CESTOVNI_PRIKAZ'));
        $obj_certifikat = count(array_filter($order_attachments, fn($t) => $t === 'CERTIFIKAT'));
        $fa_faktura = count(array_filter($invoice_attachments, fn($t) => $t === 'FAKTURA'));
        
        // 4. Vyhodnoť barvu podle logiky
        if ($total_count === 0) {
            $order['attachment_color'] = '#cbd5e1'; // Světle šedá - žádné přílohy
            return;
        }
        
        // Kontrola základních OBJ příloh
        $has_basic_obj = $obj_podklady >= 1 || $obj_cestovni_prikaz >= 1;
        
        // Červená - chybí základní OBJ přílohy
        if (!$has_basic_obj) {
            $order['attachment_color'] = '#dc2626';
            return;
        }
        
        // Zelená - kompletní: 2+ FAKTURA + (2+ PODKLADY NEBO CESTOVNI_PRIKAZ + CERTIFIKAT)
        $has_complete_fa = $fa_faktura >= 2;
        $has_complete_obj = $obj_podklady >= 2 || ($obj_cestovni_prikaz >= 1 && $obj_certifikat >= 1);
        if ($has_complete_fa && $has_complete_obj) {
            $order['attachment_color'] = '#16a34a';
            return;
        }
        
        // Žlutá - má 2+ faktury
        if ($fa_faktura >= 2) {
            $order['attachment_color'] = '#fbbf24';
            return;
        }
        
        // Oranžová - má základní OBJ přílohy, ale chybí faktury
        $order['attachment_color'] = '#f97316';
        
    } catch (Exception $e) {
        error_log('[OrderV3] enrichOrderWithAttachmentStatus error: ' . $e->getMessage());
        $order['attachment_color'] = '#64748b'; // Šedá - chyba
    }
}

/**
 * POST - Expand objednávek + faktur pro LP kód
 * Endpoint: order-v3/lp-expand
 * POST: {token, username, lp_master_id, requesting_user_id (optional)}
 * Vrací objednávky s přiřazenými fakturami pro dané LP (dle lp_master_id v financovani.lp_kody)
 * Pokud je requesting_user_id, vrací jen objednávky kde je uživatel účastníkem
 */
function handle_orderV3_lp_expand($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $lp_master_id = isset($input['lp_master_id']) ? (int)$input['lp_master_id'] : 0;
    $requesting_user_id = isset($input['requesting_user_id']) ? (int)$input['requesting_user_id'] : null;

    // 🔍 DEBUG: Log vstupních parametrů
    if ($lp_master_id == 128) {
        error_log("🔍 LP-EXPAND INPUT: lp_master_id=$lp_master_id, requesting_user_id=$requesting_user_id, username=$username");
    }

    if (!$token || !$username || !$lp_master_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token, username nebo lp_master_id']);
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
        if (!$db) throw new Exception('Chyba připojení k databázi');
        TimezoneHelper::setMysqlTimezone($db);

        $user_id = (int)($token_data['user_id'] ?? $token_data['id'] ?? 0);

        // lp_master_id může být buď ID z master tabulky (25_limitovane_prisliby)
        // nebo ID z cerpani tabulky (25_limitovane_prisliby_cerpani) - FE posílá cerpani ID
        // Nejdříve zjistíme cislo_lp ze cerpani tabulky, pak najdeme všechna master IDs
        $stmt_cislo = $db->prepare("SELECT cislo_lp FROM " . TBL_LP_CERPANI . " WHERE id = ? LIMIT 1");
        $stmt_cislo->execute([$lp_master_id]);
        $cislo_lp = $stmt_cislo->fetchColumn();

        // Fallback: zkusit přímo master tabulku (pokud přijde skutečné master ID)
        if (!$cislo_lp) {
            $stmt_cislo2 = $db->prepare("SELECT cislo_lp FROM " . TBL_LP_MASTER . " WHERE id = ? LIMIT 1");
            $stmt_cislo2->execute([$lp_master_id]);
            $cislo_lp = $stmt_cislo2->fetchColumn();
        }

        if (!$cislo_lp) {
            echo json_encode(['status' => 'ok', 'data' => [], 'meta' => ['count' => 0]]);
            return;
        }

        // Všechna master IDs pro tento cislo_lp (pokud má navýšení = více záznamů)
        $stmt_ids = $db->prepare("SELECT id FROM " . TBL_LP_MASTER . " WHERE cislo_lp = ?");
        $stmt_ids->execute([$cislo_lp]);
        $master_ids = $stmt_ids->fetchAll(PDO::FETCH_COLUMN);
        $master_ids_int = array_map('intval', $master_ids);

        // 🔍 DEBUG: Log nalezených master IDs
        if ($cislo_lp === 'LPN3') {
            error_log("🔍 LP-EXPAND MASTER_IDS: cislo_lp=$cislo_lp, master_ids=" . json_encode($master_ids) . ", requesting_user_id=$requesting_user_id");
        }

        if (empty($master_ids)) {
            echo json_encode(['status' => 'ok', 'data' => [], 'meta' => ['count' => 0]]);
            return;
        }

        // Objednávky které mají v financovani.lp_kody některé z master IDs
        // JSON_CONTAINS porovnává správně čísla (int), ne stringy
        $id_conditions = implode(' OR ', array_fill(0, count($master_ids), 'JSON_CONTAINS(o.financovani, ?, \'$.lp_kody\')'));
        
        // Pokud je requesting_user_id, přidat podmínku na účastníka objednávky - s prepared statements!
        $user_conditions = [];
        $user_params = [];
        if ($requesting_user_id) {
            // Přidat čtyři podmínky s placeholdery
            $user_conditions[] = 'o.uzivatel_id = ?';
            $user_conditions[] = 'o.garant_uzivatel_id = ?';
            $user_conditions[] = 'o.prikazce_id = ?';
            $user_conditions[] = 'o.schvalovatel_id = ?';
            // Přidat user_id čtyřikrát
            $user_params = [$requesting_user_id, $requesting_user_id, $requesting_user_id, $requesting_user_id];
        }
        $user_condition = $user_conditions ? ' AND (' . implode(' OR ', $user_conditions) . ')' : '';
        
        $sql = "
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.predmet,
                o.stav_objednavky,
                o.dodavatel_nazev,
                o.max_cena_s_dph,
                o.druh_objednavky_kod,
                o.financovani,
                o.dt_vytvoreni,
                o.uzivatel_id,
                CONCAT(u.jmeno, ' ', u.prijmeni) as objednatel_jmeno
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN 25_uzivatele u ON o.uzivatel_id = u.id
            WHERE ($id_conditions)
              AND o.aktivni = 1
              AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
              $user_condition
            ORDER BY o.dt_vytvoreni DESC
        ";
        $stmt = $db->prepare($sql);
        // Kombinuj master_ids + user_params
        $exec_params = array_merge(array_map('intval', $master_ids), $user_params);
        // 🔍 DEBUG: Log parametrů
        error_log("🔍 [LP-EXPAND SQL] cislo_lp=$cislo_lp, master_ids=" . json_encode($master_ids) . ", user_params=" . json_encode($user_params) . ", exec_params=" . json_encode($exec_params));
        $stmt->execute($exec_params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 🔍 DEBUG: Log počtu načtených objednávek z DB
        error_log("🔍 [LP-EXPAND RESULT] cislo_lp=$cislo_lp, master_ids=" . json_encode($master_ids) . ", requesting_user_id=$requesting_user_id, počet_objednavek=" . count($orders));
        
        // 🔍 DEBUG: Log jednotlivých objednávek a jejich financovani
        foreach ($orders as $ord) {
            $lp_kody = isset($ord['financovani']) ? @json_decode($ord['financovani'], true)['lp_kody'] ?? [] : [];
            error_log("  ├─ OBJ " . $ord['cislo_objednavky'] . ": id=" . $ord['id'] . ", lp_kody=" . json_encode($lp_kody) . ", má_master_id?" . (array_intersect($lp_kody, $master_ids) ? 'YES' : 'NO'));
        }

        // Pro každou objednávku načteme faktury + LP rozpis
        $order_ids = array_column($orders, 'id');
        $faktury_map = [];
        $polozky_map = [];
        $lp_rozpis_map = []; // LP rozpis z faktur
        
        if (!empty($order_ids)) {
            $placeholders = implode(',', array_fill(0, count($order_ids), '?'));
            
            // Faktury - přidáno f.fa_typ a JOIN na ciselnik stavů
            $sql_fa = "
                SELECT f.id, f.objednavka_id, f.fa_cislo_vema, f.fa_vema_kod, f.fa_castka, f.stav, 
                       f.fa_datum_vystaveni, f.fa_datum_splatnosti, f.fa_zaplacena, f.fa_poznamka,
                       f.vecna_spravnost_potvrzeno, f.fa_typ,
                       s.nazev_stavu as fa_typ_nazev
                FROM " . TBL_FAKTURY . " f
                LEFT JOIN `25_ciselnik_stavy` s ON s.typ_objektu = 'FAKTURA' AND s.kod_stavu = f.fa_typ
                WHERE f.objednavka_id IN ($placeholders) AND f.aktivni = 1
                ORDER BY f.fa_datum_vystaveni DESC
            ";
            $stmt_fa = $db->prepare($sql_fa);
            $stmt_fa->execute($order_ids);
            $faktury = $stmt_fa->fetchAll(PDO::FETCH_ASSOC);
            
            // Načíst LP cerpani pro všechny faktury
            if (!empty($faktury)) {
                $faktura_ids = array_column($faktury, 'id');
                $lp_cerpani_map = loadFakturyLpCerpaniBatch($db, $faktura_ids);
                
                // Přidat lp_castka a ma_jiny_lp ke každé faktuře
                foreach ($faktury as &$fa) {
                    $fid = (int)$fa['id'];
                    $lp_items = $lp_cerpani_map[$fid] ?? [];
                    
                    // Součet všech LP cerpani pro tuto fakturu
                    $fa['lp_castka'] = !empty($lp_items) ? array_sum(array_column($lp_items, 'castka')) : null;
                    
                    // Kontrola: je-li faktura v LP rozpisu (ma_jiny_lp = true když má rozpis)
                    $fa['ma_jiny_lp'] = false; // Výchozí - FE bude kontrolovat sám v LP context
                    $fa['lp_rozklad'] = $lp_items;
                }
                unset($fa);
            }
            $faktura_ids = [];
            foreach ($faktury as $fa) {
                $faktury_map[(int)$fa['objednavka_id']][] = [
                    'id' => (int)$fa['id'],
                    'fa_cislo_vema' => $fa['fa_cislo_vema'],
                    'fa_vema_kod' => $fa['fa_vema_kod'],
                    'fa_castka' => (float)$fa['fa_castka'],
                    'stav' => $fa['stav'],
                    'fa_datum_vystaveni' => $fa['fa_datum_vystaveni'],
                    'fa_datum_splatnosti' => $fa['fa_datum_splatnosti'],
                    'fa_zaplacena' => (bool)$fa['fa_zaplacena'],
                    'fa_poznamka' => $fa['fa_poznamka'],
                    'vecna_spravnost_potvrzeno' => (int)$fa['vecna_spravnost_potvrzeno'], // 0=neověřeno, 1=potvrzeno, 2=zamítnuto
                    'fa_typ' => $fa['fa_typ'],
                    'fa_typ_nazev' => $fa['fa_typ_nazev']
                ];
                $faktura_ids[] = (int)$fa['id'];
            }
            
            // LP rozpis z faktur (25a_faktury_lp_cerpani)
            // ⚠️ FIX: Musíme rozlišit 2 případy pro lp_castka = 0:
            // 1. Faktura má LP rozpis PRO TENTO LP s částkou 0 Kč → normální zobrazení
            // 2. Faktura má LP rozpis PRO JINÝ LP, ne pro tento → badge "JINÉ LP"
            $faktury_jine_lp_map = []; // Faktury které čerpají z JINÉHO LP (ne aktuálního)
            if (!empty($faktura_ids)) {
                $fa_placeholders = implode(',', array_fill(0, count($faktura_ids), '?'));
                $lp_placeholders = implode(',', array_fill(0, count($master_ids_int), '?'));
                
                // 1. Načíst LP rozpis pro AKTUÁLNÍ LP kódy
                $sql_lp_rozpis = "
                    SELECT flp.faktura_id, SUM(flp.castka) as lp_castka
                    FROM 25a_faktury_lp_cerpani flp
                    WHERE flp.faktura_id IN ($fa_placeholders)
                      AND flp.lp_id IN ($lp_placeholders)
                    GROUP BY flp.faktura_id
                ";
                $stmt_lp = $db->prepare($sql_lp_rozpis);
                $stmt_lp->execute(array_merge($faktura_ids, $master_ids_int));
                foreach ($stmt_lp->fetchAll(PDO::FETCH_ASSOC) as $lp_row) {
                    $lp_rozpis_map[(int)$lp_row['faktura_id']] = (float)$lp_row['lp_castka'];
                }
                
                // 2. Najít faktury které MAJÍ LP rozpis, ale NE pro aktuální LP
                // (čerpají z JINÉHO LP kódu)
                $sql_check_any_lp = "
                    SELECT DISTINCT flp_check.faktura_id
                    FROM 25a_faktury_lp_cerpani flp_check
                    WHERE flp_check.faktura_id IN ($fa_placeholders)
                ";
                $stmt_check = $db->prepare($sql_check_any_lp);
                $stmt_check->execute($faktura_ids);
                $faktury_s_lp_rozpisem = $stmt_check->fetchAll(PDO::FETCH_COLUMN);
                
                foreach ($faktury_s_lp_rozpisem as $fa_id_with_lp) {
                    $fa_id_int = (int)$fa_id_with_lp;
                    if (!isset($lp_rozpis_map[$fa_id_int])) {
                        // Faktura má LP rozpis, ale NE pro aktuálně zobrazovaný LP
                        // → nastavit 0 + přidat do "jiné LP" mapy
                        $lp_rozpis_map[$fa_id_int] = 0.0;
                        $faktury_jine_lp_map[$fa_id_int] = true;
                    }
                }
            }
            
            // Položky objednávek s tímto LP (plánované čerpání)
            $lp_placeholders = implode(',', array_fill(0, count($master_ids_int), '?'));
            $sql_pol = "
                SELECT p.objednavka_id, SUM(p.cena_s_dph) as planovana_castka
                FROM " . TBL_OBJEDNAVKY_POLOZKY . " p
                WHERE p.objednavka_id IN ($placeholders)
                  AND p.lp_id IN ($lp_placeholders)
                GROUP BY p.objednavka_id
            ";
            $stmt_pol = $db->prepare($sql_pol);
            $stmt_pol->execute(array_merge($order_ids, $master_ids_int));
            foreach ($stmt_pol->fetchAll(PDO::FETCH_ASSOC) as $pol) {
                $polozky_map[(int)$pol['objednavka_id']] = (float)$pol['planovana_castka'];
            }
        }

        // Sestavit výstup
        $result = [];
        foreach ($orders as $ord) {
            $oid = (int)$ord['id'];
            $faktury = $faktury_map[$oid] ?? [];
            
            // PRIORITA ČERPÁNÍ:
            // 1. LP rozpis z faktur (25a_faktury_lp_cerpani) - i když je 0 pro tento LP
            // 2. Položky objednávky s LP
            // 3. max_cena_s_dph / počet LP (pokud nic není)
            
            $suma_lp_z_faktur = 0.0;
            $ma_lp_rozpis = false; // Má JAKÁKOLIV faktura LP rozpis?
            foreach ($faktury as &$fa) {
                $fa_id = (int)$fa['id'];
                $fa_lp_castka = $lp_rozpis_map[$fa_id] ?? null;
                $fa_ma_jiny_lp = isset($faktury_jine_lp_map[$fa_id]) && $faktury_jine_lp_map[$fa_id];
                
                $fa['lp_castka'] = $fa_lp_castka; // LP částka pro tento LP
                $fa['ma_jiny_lp'] = $fa_ma_jiny_lp; // True = čerpá z JINÉHO LP (ne aktuálního)
                
                if ($fa_lp_castka !== null) {
                    $suma_lp_z_faktur += $fa_lp_castka;
                    $ma_lp_rozpis = true; // Faktura má LP rozpis (i když 0 pro tento LP)
                }
            }
            unset($fa); // Ukončit referenci
            
            $planovana_castka_polozky = $polozky_map[$oid] ?? 0.0;
            $suma_faktur_total = array_sum(array_column($faktury, 'fa_castka'));

            $pocet_lp = 1;
            if (!empty($ord['financovani'])) {
                $financovani = json_decode($ord['financovani'], true);
                if ($financovani && isset($financovani['typ']) && $financovani['typ'] === 'LP') {
                    if (!empty($financovani['lp_kody']) && is_array($financovani['lp_kody'])) {
                        $pocet_lp = max(1, count($financovani['lp_kody']));
                    }
                }
            }
            
            // Určit plánovanou částku LP
            // ⚠️ FIX: Pokud JAKÁKOLIV faktura má LP rozpis → použij ho (i když je 0 pro tento LP)
            $planovana_castka_lp = 0.0;
            if ($ma_lp_rozpis) {
                // Priorita 1: LP rozpis z faktur existuje → použij suma_lp_z_faktur (i když je 0)
                $planovana_castka_lp = $suma_lp_z_faktur;
            } elseif ($planovana_castka_polozky > 0) {
                // Priorita 2: Položky s LP
                $planovana_castka_lp = $planovana_castka_polozky;
            } else {
                // Priorita 3: fallback - rozdělit dle počtu LP v objednávce
                $fallback_base = $suma_faktur_total > 0 ? $suma_faktur_total : (float)$ord['max_cena_s_dph'];
                $planovana_castka_lp = $pocet_lp > 0 ? ($fallback_base / $pocet_lp) : 0.0;
            }
            
            // ⚠️ FILTR: Pokud objednávka má LP rozpis (fakturu s věcnou) a částka = 0 pro tento LP
            // → NEZOBRAZZIT JI (nečerpá z tohoto LP)
            // Zobrazit POUZE:
            // 1. Objednávky s planovana_castka_lp > 0 (čerpají z tohoto LP)
            // 2. Objednávky BEZ LP rozpisu (ještě nemají fakturu s věcnou, mohou čerpat v budoucnu)
            if ($ma_lp_rozpis && $planovana_castka_lp == 0) {
                // Objednávka má fakturu s LP rozpisem, ale NE pro tento LP → skip
                continue;
            }
            
            $result[] = [
                'id' => $oid,
                'cislo_objednavky' => $ord['cislo_objednavky'],
                'predmet' => $ord['predmet'],
                'stav' => $ord['stav_objednavky'],
                'dodavatel_nazev' => $ord['dodavatel_nazev'],
                'max_cena_s_dph' => (float)$ord['max_cena_s_dph'],
                'druh_objednavky_kod' => $ord['druh_objednavky_kod'],
                'planovana_castka_lp' => $planovana_castka_lp,
                'planovana_castka_polozky' => $planovana_castka_polozky,
                'suma_lp_z_faktur' => $suma_lp_z_faktur,
                'dt_vytvoreni' => $ord['dt_vytvoreni'],
                'objednatel_jmeno' => $ord['objednatel_jmeno'],
                'financovani' => $ord['financovani'], // JSON s lp_kody pro tooltip
                'ma_lp_rozpis' => $ma_lp_rozpis, // True = má fakturu s věcnou (čerpání z faktur)
                'faktury' => $faktury,
                'pocet_faktur' => count($faktury),
                'suma_faktur' => $suma_faktur_total,
                'rozdil_planovano_skutecne' => $planovana_castka_lp - $suma_lp_z_faktur
            ];
        }

        // ============================================================
        // ROZŠÍŘENÍ: Odborové faktury (25a_odbory_lp_prirazeni) bez napojené LP-objednávky
        // - faktury přímo přiřazené k LP přes odbory_lp_prirazeni
        // - které NEJSOU součástí žádné z již vrácených objednávek
        // - vrátí se jako "virtuální objednávka" s id=null a cislo_objednavky='—'
        // ============================================================
        $lp_placeholders_odb = implode(',', array_fill(0, count($master_ids_int), '?'));
        $excluded_order_ids = !empty($order_ids) ? $order_ids : [];
        $excluded_placeholder = '';
        if (!empty($excluded_order_ids)) {
            $excluded_placeholder = ' AND (f.objednavka_id IS NULL OR f.objednavka_id NOT IN (' .
                implode(',', array_fill(0, count($excluded_order_ids), '?')) . '))';
        }

        $sql_odb = "
            SELECT 
                f.id as faktura_id,
                f.objednavka_id,
                f.fa_cislo_vema, f.fa_vema_kod, f.fa_castka, f.stav,
                f.fa_datum_vystaveni, f.fa_datum_splatnosti, f.fa_zaplacena, f.fa_poznamka,
                f.vecna_spravnost_potvrzeno, f.fa_typ,
                s.nazev_stavu as fa_typ_nazev,
                olp.lp_id,
                COALESCE(flp_sum.lp_castka, 0) as lp_castka_z_rozpisu
            FROM " . TBL_ODBORY_LP_PRIRAZENI . " olp
            INNER JOIN " . TBL_FAKTURY . " f ON f.id = olp.faktura_id
            LEFT JOIN `25_ciselnik_stavy` s ON s.typ_objektu = 'FAKTURA' AND s.kod_stavu = f.fa_typ
            LEFT JOIN (
                SELECT faktura_id, SUM(castka) as lp_castka
                FROM " . TBL_FAKTURY_LP_CERPANI . "
                WHERE lp_id IN ($lp_placeholders_odb)
                GROUP BY faktura_id
            ) flp_sum ON flp_sum.faktura_id = f.id
            WHERE olp.lp_id IN ($lp_placeholders_odb)
              AND f.aktivni = 1
              AND f.stav != 'STORNO'
              $excluded_placeholder
            ORDER BY f.fa_datum_vystaveni DESC
        ";
        $params_odb = array_merge($master_ids_int, $master_ids_int); // 2x pro IN klauzule (subquery + WHERE)
        if (!empty($excluded_order_ids)) {
            $params_odb = array_merge($params_odb, $excluded_order_ids);
        }
        $stmt_odb = $db->prepare($sql_odb);
        $stmt_odb->execute($params_odb);
        $odborove_faktury = $stmt_odb->fetchAll(PDO::FETCH_ASSOC);

        // Agregace odborových faktur po faktuře
        $odb_by_faktura = [];
        foreach ($odborove_faktury as $row) {
            $fid = (int)$row['faktura_id'];
            if (!isset($odb_by_faktura[$fid])) {
                // Částka LP: primárně z rozpisu, fallback fa_castka
                $lp_castka = (float)$row['lp_castka_z_rozpisu'] > 0 ? (float)$row['lp_castka_z_rozpisu'] : (float)$row['fa_castka'];
                
                $odb_by_faktura[$fid] = [
                    'faktura' => [
                        'id' => $fid,
                        'fa_cislo_vema' => $row['fa_cislo_vema'],
                        'fa_vema_kod' => $row['fa_vema_kod'],
                        'fa_castka' => (float)$row['fa_castka'],
                        'stav' => $row['stav'],
                        'fa_datum_vystaveni' => $row['fa_datum_vystaveni'],
                        'fa_datum_splatnosti' => $row['fa_datum_splatnosti'],
                        'fa_zaplacena' => (bool)$row['fa_zaplacena'],
                        'fa_poznamka' => $row['fa_poznamka'],
                        'vecna_spravnost_potvrzeno' => (int)$row['vecna_spravnost_potvrzeno'], // 0=neověřeno, 1=potvrzeno, 2=zamítnuto
                        'fa_typ' => $row['fa_typ'],
                        'fa_typ_nazev' => $row['fa_typ_nazev'],
                        'lp_castka' => $lp_castka
                    ],
                    'objednavka_id' => $row['objednavka_id'] !== null ? (int)$row['objednavka_id'] : null
                ];
            }
        }

        // Přidat každou odborovou fakturu jako "virtuální objednávku"
        // Použijeme negativní id na základě faktura_id, aby FE nekonfliktoval s reálnými objednávkami
        foreach ($odb_by_faktura as $fid => $rec) {
            $fa = $rec['faktura'];
            $lp_castka = $fa['lp_castka'];
            $result[] = [
                'id' => -$fid, // negativní = virtuální záznam (odborová faktura)
                'cislo_objednavky' => '— odborová faktura',
                'predmet' => 'Odborové čerpání LP – faktura bez objednávky',
                'stav' => 'ODBORY',
                'dodavatel_nazev' => null,
                'max_cena_s_dph' => (float)$fa['fa_castka'],
                'druh_objednavky_kod' => null, // virtuální faktury nemají druh_objednavky
                'planovana_castka_lp' => $lp_castka,
                'planovana_castka_polozky' => 0.0,
                'suma_lp_z_faktur' => $lp_castka,
                'dt_vytvoreni' => $fa['fa_datum_vystaveni'],
                'objednatel_jmeno' => '—',
                'faktury' => [$fa],
                'pocet_faktur' => 1,
                'suma_faktur' => (float)$fa['fa_castka'],
                'rozdil_planovano_skutecne' => 0.0,
                'je_odborova_faktura' => true
            ];
        }

        // 🔍 DEBUG: Log počtu objednávek pro konkrétní LP
        if (!empty($master_ids) && in_array(128, $master_ids)) {
            error_log("🔍 LP-EXPAND DEBUG: LPN3 (master_id=128), requesting_user_id=$requesting_user_id, počet_objednávek=" . count($result) . ", odborových_faktur=" . count($odb_by_faktura));
        }

        echo json_encode([
            'status' => 'ok',
            'data' => $result,
            'count' => count($result)
        ]);

    } catch (Exception $e) {
        error_log("[OrderV3 LP-Expand] Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}

/**
 * POST - Expand objednávek + faktur pro smlouvu
 * Endpoint: order-v3/smlouva-expand
 * POST: {token, username, smlouva_id, requesting_user_id}
 * Vrací: objednávky které odkazují na smlouvu (financovani.cislo_smlouvy) + přímé faktury na smlouvu
 */
function handle_orderV3_smlouva_expand($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $smlouva_id = isset($input['smlouva_id']) ? (int)$input['smlouva_id'] : 0;
    $requesting_user_id = isset($input['requesting_user_id']) ? (int)$input['requesting_user_id'] : 0;

    if (!$token || !$username || !$smlouva_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token, username nebo smlouva_id']);
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
        if (!$db) throw new Exception('Chyba připojení k databázi');
        TimezoneHelper::setMysqlTimezone($db);

        // Nejprve získat cislo_smlouvy z ID
        $stmt_s = $db->prepare("SELECT id, cislo_smlouvy FROM " . TBL_SMLOUVY . " WHERE id = ? LIMIT 1");
        $stmt_s->execute([$smlouva_id]);
        $smlouva = $stmt_s->fetch(PDO::FETCH_ASSOC);
        if (!$smlouva) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Smlouva nenalezena']);
            return;
        }
        $cislo_smlouvy = $smlouva['cislo_smlouvy'];

        $participant_where = '';
        $participant_params = [];
        if ($requesting_user_id > 0) {
            $participant_where = " AND (o.objednatel_id = ? OR o.uzivatel_id = ? OR o.garant_uzivatel_id = ? OR o.prikazce_id = ? OR o.schvalovatel_id = ?)";
            $participant_params = array_fill(0, 5, $requesting_user_id);
        }

        // 1) Objednávky které mají financovani.cislo_smlouvy = cislo_smlouvy
        // ⚠️ OPRAVA: Používat REPLACE + LIKE kvůli escaped \/ v JSON (stejný pattern jako smlouvyHandlers.php)
        $sql = "
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.predmet,
                o.stav_objednavky,
                o.dodavatel_nazev,
                o.max_cena_s_dph,
                o.dt_vytvoreni,
                o.uzivatel_id,
                CONCAT(u.jmeno, ' ', u.prijmeni) as objednatel_jmeno
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN 25_uzivatele u ON o.uzivatel_id = u.id
            WHERE o.aktivni = 1
                            AND " . sqlFinancovaniCisloSmlouvyLike('o.financovani', '?') . "
              AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
              $participant_where
            ORDER BY o.dt_vytvoreni DESC
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute(array_merge([$cislo_smlouvy], $participant_params));
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Faktury na objednávkách
        $order_ids = array_column($orders, 'id');
        $faktury_obj_map = [];
        if (!empty($order_ids)) {
            $placeholders = implode(',', array_fill(0, count($order_ids), '?'));
            $sql_fa = "
                SELECT f.id, f.objednavka_id, f.fa_cislo_vema, f.fa_vema_kod, f.fa_poznamka, f.fa_castka, f.stav,
                       f.fa_datum_vystaveni, f.fa_datum_splatnosti, f.fa_zaplacena
                FROM " . TBL_FAKTURY . " f
                WHERE f.objednavka_id IN ($placeholders) AND f.aktivni = 1
                ORDER BY f.fa_datum_vystaveni DESC
            ";
            $stmt_fa = $db->prepare($sql_fa);
            $stmt_fa->execute($order_ids);
            foreach ($stmt_fa->fetchAll(PDO::FETCH_ASSOC) as $fa) {
                $faktury_obj_map[(int)$fa['objednavka_id']][] = [
                    'id' => (int)$fa['id'],
                    'fa_cislo_vema' => $fa['fa_cislo_vema'],
                    'fa_vema_kod' => $fa['fa_vema_kod'],
                    'fa_poznamka' => $fa['fa_poznamka'],
                    'fa_castka' => (float)$fa['fa_castka'],
                    'stav' => $fa['stav'],
                    'fa_datum_vystaveni' => $fa['fa_datum_vystaveni'],
                    'fa_datum_splatnosti' => $fa['fa_datum_splatnosti'],
                    'fa_zaplacena' => (bool)$fa['fa_zaplacena']
                ];
            }
        }

        $orders_result = [];
        foreach ($orders as $ord) {
            $oid = (int)$ord['id'];
            $orders_result[] = [
                'id' => $oid,
                'cislo_objednavky' => $ord['cislo_objednavky'],
                'predmet' => $ord['predmet'],
                'stav' => $ord['stav_objednavky'],
                'dodavatel_nazev' => $ord['dodavatel_nazev'],
                'max_cena_s_dph' => (float)$ord['max_cena_s_dph'],
                'dt_vytvoreni' => $ord['dt_vytvoreni'],
                'objednatel_jmeno' => $ord['objednatel_jmeno'],
                'faktury' => $faktury_obj_map[$oid] ?? [],
                'pocet_faktur' => count($faktury_obj_map[$oid] ?? []),
                'suma_faktur' => array_sum(array_column($faktury_obj_map[$oid] ?? [], 'fa_castka'))
            ];
        }

        // 2) Přímé faktury na smlouvu (bez objednávky)
        $direct_where = '';
        $direct_params = [$smlouva_id];
        if ($requesting_user_id > 0) {
            $direct_where = " AND (f.vytvoril_uzivatel_id = ? OR f.potvrdil_vecnou_spravnost_id = ?)";
            $direct_params[] = $requesting_user_id;
            $direct_params[] = $requesting_user_id;
        }
        $sql_direct = "
            SELECT f.id, f.fa_cislo_vema, f.fa_vema_kod, f.fa_poznamka, f.fa_castka, f.stav,
                   f.fa_datum_vystaveni, f.fa_datum_splatnosti, f.fa_zaplacena
            FROM " . TBL_FAKTURY . " f
            WHERE f.smlouva_id = ? AND f.objednavka_id IS NULL AND f.aktivni = 1
            $direct_where
            ORDER BY f.fa_datum_vystaveni DESC
        ";
        $stmt_direct = $db->prepare($sql_direct);
        $stmt_direct->execute($direct_params);
        $direct_faktury = [];
        foreach ($stmt_direct->fetchAll(PDO::FETCH_ASSOC) as $fa) {
            $direct_faktury[] = [
                'id' => (int)$fa['id'],
                'fa_cislo_vema' => $fa['fa_cislo_vema'],
                'fa_vema_kod' => $fa['fa_vema_kod'],
                'fa_poznamka' => $fa['fa_poznamka'],
                'fa_castka' => (float)$fa['fa_castka'],
                'stav' => $fa['stav'],
                'fa_datum_vystaveni' => $fa['fa_datum_vystaveni'],
                'fa_datum_splatnosti' => $fa['fa_datum_splatnosti'],
                'fa_zaplacena' => (bool)$fa['fa_zaplacena']
            ];
        }

        echo json_encode([
            'status' => 'ok',
            'data' => [
                'objednavky' => $orders_result,
                'prime_faktury' => $direct_faktury,
                'cislo_smlouvy' => $cislo_smlouvy
            ],
            'count_objednavky' => count($orders_result),
            'count_prime_faktury' => count($direct_faktury)
        ]);

    } catch (Exception $e) {
        error_log("[OrderV3 Smlouva-Expand] Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}

/**
 * POST /api.eeo/orders-v3/lp-v-procesu
 * Vrátí seznam objednávek "v procesu" pro daný LP kód (rezervovano + predpokladane, bez dokončených).
 * POST: { token, username, lp_id }  – lp_id = ID z 25_limitovane_prisliby_cerpani nebo 25_limitovane_prisliby
 */
function handle_orderV3_lp_v_procesu($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token    = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $lp_id    = isset($input['lp_id']) ? (int)$input['lp_id'] : 0;

    if (!$token || !$username || !$lp_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token, username nebo lp_id']);
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
        if (!$db) throw new Exception('Chyba připojení k databázi');
        TimezoneHelper::setMysqlTimezone($db);

        // Zjistit cislo_lp — zkusit nejdříve cerpani tabulku, pak master
        $stmt = $db->prepare("SELECT cislo_lp FROM " . TBL_LP_CERPANI . " WHERE id = ? LIMIT 1");
        $stmt->execute([$lp_id]);
        $cislo_lp = $stmt->fetchColumn();

        if (!$cislo_lp) {
            $stmt = $db->prepare("SELECT cislo_lp FROM " . TBL_LP_MASTER . " WHERE id = ? LIMIT 1");
            $stmt->execute([$lp_id]);
            $cislo_lp = $stmt->fetchColumn();
        }

        if (!$cislo_lp) {
            echo json_encode(['status' => 'ok', 'data' => [], 'meta' => ['cislo_lp' => null, 'count' => 0]]);
            return;
        }

        // Všechna master IDs pro tento cislo_lp (může mít navýšení = více záznamů)
        $stmt = $db->prepare("SELECT id FROM " . TBL_LP_MASTER . " WHERE cislo_lp = ?");
        $stmt->execute([$cislo_lp]);
        $master_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($master_ids)) {
            echo json_encode(['status' => 'ok', 'data' => [], 'meta' => ['cislo_lp' => $cislo_lp, 'count' => 0]]);
            return;
        }

        // Stavy "v procesu" = přispívají do rezervovano nebo predpokladane_cerpani (ne skutecne)
        // Zahrnuje schválené a aktivně zpracovávané včetně Věcné správnosti - NE drafty ani neschválené
        $v_procesu_stavy = ['Schválená', 'Odeslaná', 'Potvrzená', 'Fakturace', 'Ke zveřejnění', 'Věcná správnost'];

        // Objednávky které mají daný LP kód v financovani.lp_kody a jsou ve stavu v procesu
        $id_conditions = implode(' OR ', array_fill(0, count($master_ids), 'JSON_CONTAINS(o.financovani, ?, \'$.lp_kody\')'));
        $stav_placeholders = implode(',', array_fill(0, count($v_procesu_stavy), '?'));

        $sql = "
            SELECT
                o.id,
                o.cislo_objednavky,
                o.predmet,
                o.stav_objednavky,
                o.max_cena_s_dph,
                o.dt_vytvoreni,
                o.dt_odeslani,
                u1.jmeno     AS objednatel_jmeno,
                u1.prijmeni  AS objednatel_prijmeni,
                u2.jmeno     AS schvalovatel_jmeno,
                u2.prijmeni  AS schvalovatel_prijmeni,
                u3.jmeno     AS prikazce_jmeno,
                u3.prijmeni  AS prikazce_prijmeni,
                COALESCE(
                    (SELECT SUM(p.cena_s_dph) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id),
                    0
                ) AS suma_polozky,
                (SELECT COUNT(*) FROM `" . TBL_OBJEDNAVKY_KOMENTARE . "` k WHERE k.objednavka_id = o.id AND k.smazano = 0) AS comments_count
            FROM `" . TBL_OBJEDNAVKY . "` o
            LEFT JOIN `" . TBL_UZIVATELE . "` u1 ON u1.id = o.objednatel_id
            LEFT JOIN `" . TBL_UZIVATELE . "` u2 ON u2.id = o.schvalovatel_id
            LEFT JOIN `" . TBL_UZIVATELE . "` u3 ON u3.id = o.prikazce_id
            WHERE ($id_conditions)
              AND o.aktivni = 1
              AND o.stav_objednavky IN ($stav_placeholders)
            ORDER BY o.dt_vytvoreni DESC
        ";

        $params = array_merge(
            array_map('intval', $master_ids),
            $v_procesu_stavy
        );
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $data = [];
        foreach ($rows as $row) {
            $castka = $row['max_cena_s_dph'] > 0
                ? (float)$row['max_cena_s_dph']
                : (float)$row['suma_polozky'];

            $schvalovatel = trim(($row['schvalovatel_jmeno'] ?? '') . ' ' . ($row['schvalovatel_prijmeni'] ?? ''));
            if (!$schvalovatel) {
                $schvalovatel = trim(($row['prikazce_jmeno'] ?? '') . ' ' . ($row['prikazce_prijmeni'] ?? ''));
            }

            $data[] = [
                'id'              => (int)$row['id'],
                'cislo_objednavky'=> $row['cislo_objednavky'],
                'predmet'         => $row['predmet'],
                'stav'            => $row['stav_objednavky'],
                'castka'          => $castka,
                'dt_vytvoreni'    => $row['dt_vytvoreni'],
                'dt_odeslani'     => $row['dt_odeslani'],
                'objednatel'      => trim(($row['objednatel_jmeno'] ?? '') . ' ' . ($row['objednatel_prijmeni'] ?? '')),
                'schvalovatel'    => $schvalovatel,
                'comments_count'  => (int)($row['comments_count'] ?? 0),
            ];
        }

        echo json_encode([
            'status' => 'ok',
            'data'   => $data,
            'meta'   => ['cislo_lp' => $cislo_lp, 'count' => count($data)],
        ]);

    } catch (Exception $e) {
        error_log("[OrderV3 LP-v-procesu] Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}

/**
 * POST /api.eeo/orders-v3/smlouva-v-procesu
 * Vrátí seznam objednávek "v procesu" pro danou smlouvu (bez dokončených/fakturovaných).
 * POST: { token, username, cislo_smlouvy }
 */
function handle_orderV3_smlouva_v_procesu($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token         = $input['token'] ?? '';
    $username      = $input['username'] ?? '';
    $cislo_smlouvy = trim($input['cislo_smlouvy'] ?? '');

    if (!$token || !$username || !$cislo_smlouvy) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token, username nebo cislo_smlouvy']);
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
        if (!$db) throw new Exception('Chyba připojení k databázi');
        TimezoneHelper::setMysqlTimezone($db);

        // Zahrnuje jen schválené a aktivně zpracovávané - NE drafty ani neschválené
        // Věcná správnost+ se nepocitaji - tam uz existuje faktura (=skutecnost)
        $v_procesu_stavy = ['Schválená', 'Odeslaná', 'Potvrzená', 'Fakturace', 'Ke zveřejnění'];
        $stav_placeholders = implode(',', array_fill(0, count($v_procesu_stavy), '?'));

        $sql = "
            SELECT
                o.id,
                o.cislo_objednavky,
                o.predmet,
                o.stav_objednavky,
                o.max_cena_s_dph,
                o.dt_vytvoreni,
                o.dt_odeslani,
                u1.jmeno     AS objednatel_jmeno,
                u1.prijmeni  AS objednatel_prijmeni,
                u2.jmeno     AS schvalovatel_jmeno,
                u2.prijmeni  AS schvalovatel_prijmeni,
                u3.jmeno     AS prikazce_jmeno,
                u3.prijmeni  AS prikazce_prijmeni,
                COALESCE(
                    (SELECT SUM(p.cena_s_dph) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id),
                    0
                ) AS suma_polozky,
                (SELECT COUNT(*) FROM `" . TBL_OBJEDNAVKY_KOMENTARE . "` k WHERE k.objednavka_id = o.id AND k.smazano = 0) AS comments_count
            FROM `" . TBL_OBJEDNAVKY . "` o
            LEFT JOIN `" . TBL_UZIVATELE . "` u1 ON u1.id = o.objednatel_id
            LEFT JOIN `" . TBL_UZIVATELE . "` u2 ON u2.id = o.schvalovatel_id
            LEFT JOIN `" . TBL_UZIVATELE . "` u3 ON u3.id = o.prikazce_id
            WHERE JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy')) = ?
              AND o.aktivni = 1
              AND o.stav_objednavky IN ($stav_placeholders)
              AND NOT EXISTS (
                  SELECT 1 FROM `" . TBL_FAKTURY . "` f WHERE f.objednavka_id = o.id AND f.aktivni = 1
              )
            ORDER BY o.dt_vytvoreni DESC
        ";

        $params = array_merge([$cislo_smlouvy], $v_procesu_stavy);
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $data = [];
        foreach ($rows as $row) {
            $castka = $row['max_cena_s_dph'] > 0
                ? (float)$row['max_cena_s_dph']
                : (float)$row['suma_polozky'];

            $schvalovatel = trim(($row['schvalovatel_jmeno'] ?? '') . ' ' . ($row['schvalovatel_prijmeni'] ?? ''));
            if (!$schvalovatel) {
                $schvalovatel = trim(($row['prikazce_jmeno'] ?? '') . ' ' . ($row['prikazce_prijmeni'] ?? ''));
            }

            $data[] = [
                'id'              => (int)$row['id'],
                'cislo_objednavky'=> $row['cislo_objednavky'],
                'predmet'         => $row['predmet'],
                'stav'            => $row['stav_objednavky'],
                'castka'          => $castka,
                'dt_vytvoreni'    => $row['dt_vytvoreni'],
                'dt_odeslani'     => $row['dt_odeslani'],
                'objednatel'      => trim(($row['objednatel_jmeno'] ?? '') . ' ' . ($row['objednatel_prijmeni'] ?? '')),
                'schvalovatel'    => $schvalovatel,
                'comments_count'  => (int)($row['comments_count'] ?? 0),
            ];
        }

        echo json_encode([
            'status' => 'ok',
            'data'   => $data,
            'meta'   => ['cislo_smlouvy' => $cislo_smlouvy, 'count' => count($data)],
        ]);

    } catch (Exception $e) {
        error_log("[OrderV3 Smlouva-v-procesu] Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}

/**
 * POST /api.eeo/orders-v3/lp-ke-schvaleni
 * Vrátí seznam objednávek "Ke schválení" pro daný LP kód (bez aktuální objednávky).
 * POST: { token, username, lp_id, current_order_id }
 */
function handle_orderV3_lp_ke_schvaleni($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token            = $input['token'] ?? '';
    $username         = $input['username'] ?? '';
    $lp_id            = isset($input['lp_id']) ? (int)$input['lp_id'] : 0;
    $current_order_id = isset($input['current_order_id']) ? (int)$input['current_order_id'] : 0;

    if (!$token || !$username || !$lp_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token, username nebo lp_id']);
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
        if (!$db) throw new Exception('Chyba připojení k databázi');
        TimezoneHelper::setMysqlTimezone($db);

        // Použij přesně stejný EXISTS pattern jako enrichOrderFinancovani
        $exclude_clause = $current_order_id > 0 ? 'AND o.id != :exclude_id' : '';

        $sql = "
            SELECT
                o.id,
                o.cislo_objednavky,
                o.predmet,
                o.stav_objednavky,
                o.max_cena_s_dph,
                o.dt_vytvoreni,
                o.dt_odeslani,
                u1.jmeno     AS objednatel_jmeno,
                u1.prijmeni  AS objednatel_prijmeni,
                u2.jmeno     AS schvalovatel_jmeno,
                u2.prijmeni  AS schvalovatel_prijmeni,
                u3.jmeno     AS prikazce_jmeno,
                u3.prijmeni  AS prikazce_prijmeni,
                COALESCE(
                    (SELECT SUM(p.cena_s_dph) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id),
                    0
                ) AS suma_polozky,
                (SELECT COUNT(*) FROM `" . TBL_OBJEDNAVKY_KOMENTARE . "` k WHERE k.objednavka_id = o.id AND k.smazano = 0) AS comments_count
            FROM `" . TBL_OBJEDNAVKY . "` o
            LEFT JOIN `" . TBL_UZIVATELE . "` u1 ON u1.id = o.objednatel_id
            LEFT JOIN `" . TBL_UZIVATELE . "` u2 ON u2.id = o.schvalovatel_id
            LEFT JOIN `" . TBL_UZIVATELE . "` u3 ON u3.id = o.prikazce_id
            WHERE o.aktivni = 1
              AND o.stav_objednavky = 'Ke schválení'
              AND EXISTS (
                  SELECT 1 FROM `" . TBL_LP_MASTER . "` lpm
                  WHERE lpm.id = :lp_id
                    AND JSON_CONTAINS(o.financovani, CAST(lpm.id AS CHAR), '$.lp_kody')
              )
              $exclude_clause
            ORDER BY o.dt_vytvoreni DESC
        ";

        $params = [':lp_id' => $lp_id];
        if ($current_order_id > 0) $params[':exclude_id'] = $current_order_id;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $data = [];
        foreach ($rows as $row) {
            $castka = $row['max_cena_s_dph'] > 0
                ? (float)$row['max_cena_s_dph']
                : (float)$row['suma_polozky'];

            $schvalovatel = trim(($row['schvalovatel_jmeno'] ?? '') . ' ' . ($row['schvalovatel_prijmeni'] ?? ''));
            if (!$schvalovatel) {
                $schvalovatel = trim(($row['prikazce_jmeno'] ?? '') . ' ' . ($row['prikazce_prijmeni'] ?? ''));
            }

            $data[] = [
                'id'               => (int)$row['id'],
                'cislo_objednavky' => $row['cislo_objednavky'],
                'predmet'          => $row['predmet'],
                'stav'             => $row['stav_objednavky'],
                'castka'           => $castka,
                'dt_vytvoreni'     => $row['dt_vytvoreni'],
                'dt_odeslani'      => $row['dt_odeslani'],
                'objednatel'       => trim(($row['objednatel_jmeno'] ?? '') . ' ' . ($row['objednatel_prijmeni'] ?? '')),
                'schvalovatel'     => $schvalovatel,
                'comments_count'   => (int)($row['comments_count'] ?? 0),
            ];
        }

        echo json_encode([
            'status' => 'ok',
            'data'   => $data,
            'meta'   => ['lp_id' => $lp_id, 'count' => count($data)],
        ]);

    } catch (Exception $e) {
        error_log("[OrderV3 LP-ke-schvaleni] Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}

/**
 * POST /api.eeo/orders-v3/smlouva-ke-schvaleni
 * Vrátí seznam objednávek "Ke schválení" pro danou smlouvu (bez aktuální objednávky).
 * POST: { token, username, cislo_smlouvy, current_order_id }
 */
function handle_orderV3_smlouva_ke_schvaleni($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token            = $input['token'] ?? '';
    $username         = $input['username'] ?? '';
    $cislo_smlouvy    = trim($input['cislo_smlouvy'] ?? '');
    $current_order_id = isset($input['current_order_id']) ? (int)$input['current_order_id'] : 0;

    if (!$token || !$username || !$cislo_smlouvy) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token, username nebo cislo_smlouvy']);
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
        if (!$db) throw new Exception('Chyba připojení k databázi');
        TimezoneHelper::setMysqlTimezone($db);

        $exclude_clause = $current_order_id > 0 ? 'AND o.id != ?' : '';

        $sql = "
            SELECT
                o.id,
                o.cislo_objednavky,
                o.predmet,
                o.stav_objednavky,
                o.max_cena_s_dph,
                o.dt_vytvoreni,
                o.dt_odeslani,
                u1.jmeno     AS objednatel_jmeno,
                u1.prijmeni  AS objednatel_prijmeni,
                u2.jmeno     AS schvalovatel_jmeno,
                u2.prijmeni  AS schvalovatel_prijmeni,
                u3.jmeno     AS prikazce_jmeno,
                u3.prijmeni  AS prikazce_prijmeni,
                COALESCE(
                    (SELECT SUM(p.cena_s_dph) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id),
                    0
                ) AS suma_polozky,
                (SELECT COUNT(*) FROM `" . TBL_OBJEDNAVKY_KOMENTARE . "` k WHERE k.objednavka_id = o.id AND k.smazano = 0) AS comments_count
            FROM `" . TBL_OBJEDNAVKY . "` o
            LEFT JOIN `" . TBL_UZIVATELE . "` u1 ON u1.id = o.objednatel_id
            LEFT JOIN `" . TBL_UZIVATELE . "` u2 ON u2.id = o.schvalovatel_id
            LEFT JOIN `" . TBL_UZIVATELE . "` u3 ON u3.id = o.prikazce_id
            WHERE JSON_UNQUOTE(JSON_EXTRACT(o.financovani, '$.cislo_smlouvy')) = ?
              AND o.aktivni = 1
              AND o.stav_objednavky = 'Ke schválení'
              $exclude_clause
            ORDER BY o.dt_vytvoreni DESC
        ";

        $params = [$cislo_smlouvy];
        if ($current_order_id > 0) $params[] = $current_order_id;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $data = [];
        foreach ($rows as $row) {
            $castka = $row['max_cena_s_dph'] > 0
                ? (float)$row['max_cena_s_dph']
                : (float)$row['suma_polozky'];

            $schvalovatel = trim(($row['schvalovatel_jmeno'] ?? '') . ' ' . ($row['schvalovatel_prijmeni'] ?? ''));
            if (!$schvalovatel) {
                $schvalovatel = trim(($row['prikazce_jmeno'] ?? '') . ' ' . ($row['prikazce_prijmeni'] ?? ''));
            }

            $data[] = [
                'id'               => (int)$row['id'],
                'cislo_objednavky' => $row['cislo_objednavky'],
                'predmet'          => $row['predmet'],
                'stav'             => $row['stav_objednavky'],
                'castka'           => $castka,
                'dt_vytvoreni'     => $row['dt_vytvoreni'],
                'dt_odeslani'      => $row['dt_odeslani'],
                'objednatel'       => trim(($row['objednatel_jmeno'] ?? '') . ' ' . ($row['objednatel_prijmeni'] ?? '')),
                'schvalovatel'     => $schvalovatel,
                'comments_count'   => (int)($row['comments_count'] ?? 0),
            ];
        }

        echo json_encode([
            'status' => 'ok',
            'data'   => $data,
            'meta'   => ['cislo_smlouvy' => $cislo_smlouvy, 'count' => count($data)],
        ]);

    } catch (Exception $e) {
        error_log("[OrderV3 Smlouva-ke-schvaleni] Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba: ' . $e->getMessage()]);
    }
}

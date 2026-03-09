<?php

/**
 * Order V2 Endpoints - Standardized API Implementation
 * 
 * Nové API endpointy s prefixem /order-v2/ podle standardizačního dokumentu.
 * Zachovává zpětnou kompatibilitu - nemodifikuje stávající /orders25/ endpointy.
 * 
 * Endpoints:
 * - GET /api/order-v2/{id} - Načtení objednávky podle ID
 * - GET /api/order-v2/list - Listing objednávek s filtering
 * - POST /api/order-v2 - Vytvoření nové objednávky  
 * - PUT /api/order-v2/{id} - Update objednávky
 * - DELETE /api/order-v2/{id} - Smazání objednávky
 * 
 * @author Senior Developer
 * @date 29. října 2025
 */

require_once __DIR__ . '/orderQueries.php';
require_once __DIR__ . '/OrderV2Handler.php';
require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/limitovanePrislibyCerpaniHandlers_v2_pdo.php';
require_once __DIR__ . '/smlouvyHandlers.php';
require_once __DIR__ . '/hierarchyOrderFilters.php';

/**
 * GET /api/order-v2/{id}
 * Načtení objednávky podle ID s standardizovaným výstupem
 */
function handle_order_v2_get($input, $config, $queries) {
    // Ověření tokenu - V2 authentication pattern
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    $order_id = isset($input['id']) ? $input['id'] : null;
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    if (!$order_id) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí ID objednávky'));
        return;
    }
    
    // Special handling for draft IDs (string IDs starting with "draft_")
    if (is_string($order_id) && strpos($order_id, 'draft_') === 0) {
        // Return a default draft structure since we don't have a draft storage system yet
        $draft_data = array(
            'id' => $order_id,
            'cislo_objednavky' => '',
            'stav_workflow_kod' => 'DRAFT',
            'is_draft' => true,
            'dt_vytvoreni' => TimezoneHelper::getCzechDateTime(),
            'dt_aktualizace' => TimezoneHelper::getCzechDateTime(),
            'aktivni' => 1
        );
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $draft_data,
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'is_draft' => true,
                'timestamp' => TimezoneHelper::getApiTimestamp()
            )
        ));
        return;
    }
    
    // Convert to int for database lookup if it's numeric
    $numeric_order_id = is_numeric($order_id) ? (int)$order_id : 0;
    if ($numeric_order_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky'));
        return;
    }
    
    try {
        $handler = new OrderV2Handler($config);
        $current_user_id = $auth_result['id'];
        
        // Volitelný parametr archivovano
        $includeArchived = isset($input['archivovano']) && $input['archivovano'] == 1;
        
        $order = $handler->getOrderById($numeric_order_id, $current_user_id, $includeArchived);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka nebyla nalezena'));
            return;
        }
        
        // 🌲 HIERARCHIE WORKFLOW: Zkontrolovat, zda uživatel může vidět tuto objednávku
        require_once __DIR__ . '/hierarchyOrderFilters.php';
        
        // Vytvoř PDO spojení pro hierarchy check a enrichment
        $pdo = get_db($config);
        
        if (!canUserViewOrder($numeric_order_id, $current_user_id, $pdo)) {
            error_log("Order V2 GET: User $current_user_id cannot view order $numeric_order_id (hierarchy restriction)");
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Nemáte oprávnění k zobrazení této objednávky podle aktuálního organizačního řádu'
            ));
            return;
        }
        
        // Volitelný enrichment (pokud parametr enriched=1)
        $is_enriched = false;
        if (isset($input['enriched']) && $input['enriched'] == 1) {
            enrichOrderWithItems($pdo, $order);
            enrichOrderWithInvoices($pdo, $order);
            enrichOrderWithCodebooks($pdo, $order);
            enrichOrderFinancovani($pdo, $order);
            enrichOrderRegistrSmluv($pdo, $order);
            enrichOrderWithWorkflowUsers($pdo, $order);
            
            $is_enriched = true;
        }
        
        $meta = array(
            'version' => 'v2',
            'standardized' => true,
            'timestamp' => TimezoneHelper::getApiTimestamp()
        );
        
        if ($is_enriched) {
            $meta['enriched'] = true;
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $order,
            'meta' => $meta
        ));
        
    } catch (Exception $e) {
        $error_details = array(
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        );
        error_log("Order V2 GET Error [" . basename(__FILE__) . ":" . __LINE__ . "]: " . json_encode($error_details));
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání objednávky: ' . $e->getMessage()));
    }
}

/**
 * 🔥 NOVÁ FUNKCE: Načte role uživatele (pro SUPERADMIN/ADMINISTRATOR detekci)
 * @param int $user_id ID uživatele  
 * @param PDO $db Databázové spojení
 * @return array Pole kódů rolí (kod_role)
 */
function getUserRoles($user_id, $db) {
    try {
        $sql = "
            SELECT DISTINCT r.kod_role
            FROM " . TBL_ROLE . " r
            JOIN " . TBL_UZIVATELE_ROLE . " ur ON r.id = ur.role_id
            WHERE ur.uzivatel_id = :user_id
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $roles = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $roles[] = $row['kod_role'];
        }
        
        error_log("Order V2 LIST: User $user_id roles: " . implode(', ', $roles));
        return $roles;
        
    } catch (Exception $e) {
        error_log("Order V2 LIST: Error getting roles for user $user_id: " . $e->getMessage());
        return array();
    }
}

/**
 * Získá permissions uživatele pro ORDER modul
 * @param int $user_id ID uživatele
 * @param PDO $db Databázové spojení
 * @return array Pole permissions (kod_prava)
 */
/**
 * Získá všechny user ID kolegů ze stejného úseku (usek_id)
 * 
 * Pomocná funkce pro department-based subordinate permissions.
 * Použití: ORDER_READ_SUBORDINATE, ORDER_EDIT_SUBORDINATE
 * 
 * @param int $user_id ID uživatele
 * @param PDO $db Database connection
 * @return array Pole user IDs ze stejného úseku
 */
function getUserDepartmentColleagueIds($user_id, $db) {
    try {
        // Načíst usek_id aktuálního uživatele
        $sql = "SELECT usek_id FROM " . TBL_UZIVATELE . " WHERE id = :user_id LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || empty($user['usek_id'])) {
            error_log("Order V2 getDepartmentColleagues: User $user_id has no usek_id assigned");
            return array();
        }
        
        $usek_id = $user['usek_id'];
        error_log("Order V2 getDepartmentColleagues: User $user_id is in usek $usek_id");
        
        // Načíst všechny kolegy ze stejného úseku
        $sql = "SELECT id FROM " . TBL_UZIVATELE . " WHERE usek_id = :usek_id AND aktivni = 1";
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':usek_id', $usek_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $colleague_ids = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $colleague_ids[] = $row['id'];
        }
        
        error_log("Order V2 getDepartmentColleagues: Found " . count($colleague_ids) . " colleagues in usek $usek_id");
        
        return $colleague_ids;
        
    } catch (Exception $e) {
        error_log("Order V2 getDepartmentColleagues ERROR: " . $e->getMessage());
        return array();
    }
}

function getUserOrderPermissions($user_id, $db) {
    try {
        // SQL pro získání všech ORDER permissions uživatele (přímé + role + zastupování)
        // STRUKTURA DB:
        // - 25_role_prava (role_id, pravo_id, user_id) - matice práv
        //   user_id = -1 → právo z role (platí pro všechny v roli)
        //   user_id = X → přímé přiřazení práva uživateli X
        // MySQL 5.5.43 kompatibilní SQL - bez složitých EXISTS subqueries
        // OPRAVENO 2026-03-06: Přidána podmínka role_id = -1 pro přímo přiřazená práva
        $sql = "
            SELECT DISTINCT p.kod_prava
            FROM " . TBL_PRAVA . " p
            WHERE p.kod_prava LIKE 'ORDER_%'
            AND p.id IN (
                -- Přímá práva (user_id != -1, role_id = -1)
                SELECT rp.pravo_id FROM " . TBL_ROLE_PRAVA . " rp 
                WHERE rp.user_id = :user_id AND rp.role_id = -1
                
                UNION
                
                -- Práva z rolí (user_id = -1, role_id = X)
                SELECT rp.pravo_id 
                FROM " . TBL_UZIVATELE_ROLE . " ur
                JOIN " . TBL_ROLE_PRAVA . " rp ON ur.role_id = rp.role_id AND rp.user_id = -1
                WHERE ur.uzivatel_id = :user_id
            )
        ";
        
        error_log("Order V2 getUserOrderPermissions: Preparing SQL for user $user_id");
        error_log("Order V2 getUserOrderPermissions: SQL query: " . $sql);
        
        $stmt = $db->prepare($sql);
        if (!$stmt) {
            error_log("Order V2 getUserOrderPermissions: FAILED to prepare statement!");
            return array();
        }
        
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        error_log("Order V2 getUserOrderPermissions: Executing query for user_id = $user_id");
        
        $result = $stmt->execute();
        if (!$result) {
            error_log("Order V2 getUserOrderPermissions: FAILED to execute! Error: " . print_r($stmt->errorInfo(), true));
            return array();
        }
        
        error_log("Order V2 getUserOrderPermissions: Query executed successfully");
        
        $permissions = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            error_log("Order V2 getUserOrderPermissions: Found permission: " . $row['kod_prava']);
            $permissions[] = $row['kod_prava'];
        }
        
        error_log("Order V2 LIST: User $user_id permissions TOTAL COUNT: " . count($permissions));
        error_log("Order V2 LIST: User $user_id permissions: " . implode(', ', $permissions));
        return $permissions;
        
    } catch (Exception $e) {
        error_log("Order V2 LIST: Error getting permissions for user $user_id: " . $e->getMessage());
        return array();
    }
}

/**
 * GET /api/order-v2/list
 * Listing objednávek s filtering a pagination
 */
function handle_order_v2_list($input, $config, $queries) {
    error_log("=== handle_order_v2_list START ===");
    
    // 🔥 FINAL: Full implementation with detailed error logging
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    error_log("Order V2 LIST: Token/username check");
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        error_log("Order V2 LIST: Auth failed");
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    error_log("Order V2 LIST: Auth OK, user_id=" . $auth_result['id']);
    
    try {
        error_log("Order V2 LIST: Starting with user " . $auth_result['id']);
        
        $current_user_id = $auth_result['id'];
        $handler = new OrderV2Handler($config);
        
        // Připojení k databázi pro business logiku
        $db = get_db($config);
        
        // 🔐 ROLE-BASED FILTERING: Automatická detekce permissions A ROLÍ
        $user_permissions = getUserOrderPermissions($current_user_id, $db);
        // 🔥 KRITICKÉ FIX: Načítanie user rolí pre SUPERADMIN/ADMINISTRATOR detekciu 
        $user_roles = getUserRoles($current_user_id, $db);
        
        // Pagination parametry - volitelné, bez limitu vrátí všechny záznamy
        $limit = isset($input['limit']) ? (int)$input['limit'] : null;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        
        error_log("Order V2 LIST: Pagination - limit: " . ($limit !== null ? $limit : 'ALL') . ", offset: $offset");
        
        // Filtering parametry
        $params = array();
        
        // Základní WHERE podmínka
        $whereConditions = array();
        
        // 🔥 KRITICKÉ FIX: Kontrola ADMIN ROLÍ (SUPERADMIN, ADMINISTRATOR = automaticky admin)
        $isAdminByRole = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
        
        // 🔧 ADMIN FEATURE: Filter pro zobrazení POUZE neaktivních objednávek (aktivni = 0)
        // Pouze pro ADMIN uživatele
        $showOnlyInactive = isset($input['show_only_inactive']) && $input['show_only_inactive'] == 1;
        
        if ($isAdminByRole && $showOnlyInactive) {
            // ADMIN chce vidět POUZE smazané objednávky (aktivni = 0)
            $whereConditions[] = "o.aktivni = 0";
            error_log("Order V2 LIST: ADMIN filter - showing ONLY inactive orders (aktivni = 0)");
        } else {
            // Standardní filtr - pouze aktivní objednávky (aktivni = 1)
            $whereConditions[] = "o.aktivni = 1";
            error_log("Order V2 LIST: Standard filter - showing only active orders (aktivni = 1)");
        }
        
        // 🔐 PERMISSIONS: Načtení ORDER_* permissions pro detailní kontrolu
        $hasOrderManage = in_array('ORDER_MANAGE', $user_permissions);
        $hasOrderReadAll = in_array('ORDER_READ_ALL', $user_permissions);
        $hasOrderViewAll = in_array('ORDER_VIEW_ALL', $user_permissions);
        $hasOrderApproveAll = in_array('ORDER_APPROVE_ALL', $user_permissions);
        $hasOrderEditAll = in_array('ORDER_EDIT_ALL', $user_permissions);
        $hasOrderDeleteAll = in_array('ORDER_DELETE_ALL', $user_permissions);
        $hasOrderOld = in_array('ORDER_OLD', $user_permissions);
        
        // 🔥 CRITICAL: Definice $hasReadAllPermissions PŘED použitím!
        $hasReadAllPermissions = $hasOrderReadAll || $hasOrderViewAll;
        $hasWriteAllPermissions = $hasOrderEditAll || $hasOrderDeleteAll || $hasOrderApproveAll;
        
        // 🔥 KRITICKÉ FIX: Full admin = POUZE role SUPERADMIN nebo ADMINISTRATOR
        $isFullAdmin = $isAdminByRole;
        
        error_log("Order V2 LIST: Role check - SUPERADMIN/ADMINISTRATOR: " . ($isAdminByRole ? 'YES' : 'NO'));
        error_log("Order V2 LIST: Permission check - ORDER_READ_ALL: " . ($hasOrderReadAll ? 'YES' : 'NO') . 
                  ", ORDER_VIEW_ALL: " . ($hasOrderViewAll ? 'YES' : 'NO') .
                  ", hasReadAllPermissions: " . ($hasReadAllPermissions ? 'YES' : 'NO'));
        
        // 🌲 VISIBILITY FILTERS: Kombinace role-based + hierarchie + department (OR logika)
        // ============================================================================
        // 🎯 NOVÁ LOGIKA (2026-01-19):
        // - Role-based filtr (12 polí) = ZÁKLAD (base viditelnost)
        // - Hierarchie = ROZŠÍŘENÍ (přidává viditelnost OR metodou)
        // - Department subordinate = ROZŠÍŘENÍ (přidává viditelnost OR metodou)
        // - Výsledek: (role-based) OR (hierarchie) OR (department) = MAX viditelnost
        
        $visibilityConditions = [];
        $hierarchyApplied = false;
        $departmentFilterApplied = false;
        
        // Aplikuje se POUZE pro non-admins BEZ ORDER_READ_ALL
        if (!$isFullAdmin && !$hasReadAllPermissions) {
            
            // 1️⃣ ROLE-BASED FILTER (12 polí) - ZÁKLAD pro všechny
            // ========================================================
            error_log("📋 VISIBILITY: Building role-based filter (BASE) for user $current_user_id");
            
            $roleBasedCondition = "(
                o.uzivatel_id = :role_user_id
                OR o.objednatel_id = :role_user_id
                OR o.garant_uzivatel_id = :role_user_id
                OR o.schvalovatel_id = :role_user_id
                OR o.prikazce_id = :role_user_id
                OR o.uzivatel_akt_id = :role_user_id
                OR o.odesilatel_id = :role_user_id
                OR o.dodavatel_potvrdil_id = :role_user_id
                OR o.zverejnil_id = :role_user_id
                OR o.fakturant_id = :role_user_id
                OR o.dokoncil_id = :role_user_id
                OR o.potvrdil_vecnou_spravnost_id = :role_user_id
            )";
            
            $visibilityConditions[] = $roleBasedCondition;
            $params['role_user_id'] = $current_user_id;
            error_log("✅ VISIBILITY: Role-based filter added as BASE");
            
            // 2️⃣ HIERARCHIE - ROZŠÍŘENÍ (pokud je aktivní a uživatel v profilu)
            // ========================================================
            error_log("🔍 HIERARCHY CHECK: Checking if user $current_user_id is in hierarchy profile");
            global $HIERARCHY_DEBUG_INFO;
            $hierarchyFilter = applyHierarchyFilterToOrders($current_user_id, $db);
            error_log("🔍 HIERARCHY CHECK: Result=" . ($hierarchyFilter === null ? 'NULL' : 'FILTER'));
            
            if ($hierarchyFilter !== null) {
                $visibilityConditions[] = $hierarchyFilter;
                $hierarchyApplied = true;
                error_log("✅ HIERARCHY: Filter ADDED as OR extension (expands visibility)");
            } else {
                error_log("ℹ️ HIERARCHY: Not applied (user not in profile or no relationships)");
            }
            
            // 3️⃣ DEPARTMENT SUBORDINATE - ROZŠÍŘENÍ (pokud má právo)
            // ========================================================
            $hasOrderReadSubordinate = in_array('ORDER_READ_SUBORDINATE', $user_permissions);
            $hasOrderEditSubordinate = in_array('ORDER_EDIT_SUBORDINATE', $user_permissions);
            
            if ($hasOrderReadSubordinate || $hasOrderEditSubordinate) {
                error_log("🔍 DEPARTMENT CHECK: User has subordinate permissions");
                $departmentColleagueIds = getUserDepartmentColleagueIds($current_user_id, $db);
                
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
                    $departmentFilterApplied = true;
                    
                    $permission_type = $hasOrderEditSubordinate ? 'ORDER_EDIT_SUBORDINATE' : 'ORDER_READ_SUBORDINATE';
                    error_log("✅ DEPARTMENT: Filter ADDED as OR extension for " . count($departmentColleagueIds) . " colleagues ($permission_type)");
                } else {
                    error_log("ℹ️ DEPARTMENT: User has no colleagues in department");
                }
            }
            
            // 4️⃣ KOMBINACE S OR LOGIKOU
            // ========================================================
            // Spojíme všechny podmínky s OR → uživatel vidí objednávky z KTERÉHOKOLIV filtru
            if (!empty($visibilityConditions)) {
                if (count($visibilityConditions) == 1) {
                    // Jen role-based (žádné rozšíření)
                    $whereConditions[] = $visibilityConditions[0];
                    error_log("📊 VISIBILITY RESULT: Only role-based filter (no extensions)");
                } else {
                    // Role-based + rozšíření (hierarchie/department) spojené s OR
                    $combinedFilter = "(" . implode(" OR ", $visibilityConditions) . ")";
                    $whereConditions[] = $combinedFilter;
                    error_log("📊 VISIBILITY RESULT: Combined " . count($visibilityConditions) . " filters with OR logic");
                    error_log("   - Role-based: YES");
                    error_log("   - Hierarchy: " . ($hierarchyApplied ? 'YES (extends)' : 'NO'));
                    error_log("   - Department: " . ($departmentFilterApplied ? 'YES (extends)' : 'NO'));
                }
            }
            
        } else if ($isFullAdmin) {
            error_log("✅ ADMIN BYPASS: SUPERADMIN/ADMINISTRATOR - SKIPPING all visibility filters");
        } else if ($hasReadAllPermissions) {
            error_log("✅ READ_ALL BYPASS: User has ORDER_READ_ALL/VIEW_ALL - SKIPPING all visibility filters");
        }
        // ============================================================================
        
        // 🔥 Kontrola parametru archivovano z FE
        $includeArchived = isset($input['archivovano']) && $input['archivovano'] == 1;
        
        error_log("Order V2 LIST: Permission check - ORDER_MANAGE: " . ($hasOrderManage ? 'YES' : 'NO') . 
                  ", ORDER_APPROVE_ALL: " . ($hasOrderApproveAll ? 'YES' : 'NO') .
                  ", ORDER_OLD: " . ($hasOrderOld ? 'YES' : 'NO'));
        
        if ($hasOrderOld && $includeArchived) {
            // 🔥 ORDER_OLD + archivovano=1 = Vidí VŠECHNY archivované objednávky BEZ role filtru
            error_log("Order V2 LIST: User has ORDER_OLD and archivovano=1 - will see ALL archived orders");
            
            if ($isFullAdmin || $hasReadAllPermissions) {
                // ORDER_OLD + (ADMIN nebo READ_ALL) + archivovano=1 = Vidí VŠECHNY objednávky
                error_log("Order V2 LIST: ORDER_OLD + (ADMIN or READ_ALL) + archivovano=1 - showing ALL orders");
                // Žádný filtr
                
            } else {
                // ORDER_OLD bez READ_ALL + archivovano=1 = HYBRID: VŠECHNY archivované + role filter pro nearchivované
                error_log("Order V2 LIST: ORDER_OLD (without READ_ALL) + archivovano=1 - HYBRID filter");
                
                $hybridRoleCondition = "(
                    -- ARCHIVOVANÉ: Vidí VŠETKY (bez role filtru)
                    o.stav_objednavky = 'ARCHIVOVANO'
                    
                    OR
                    
                    -- NEARCHIVOVANÉ: Jen kde má roli (12-role WHERE filter)
                    (
                        o.stav_objednavky != 'ARCHIVOVANO'
                        AND (
                            o.uzivatel_id = :role_user_id
                            OR o.objednatel_id = :role_user_id
                            OR o.garant_uzivatel_id = :role_user_id
                            OR o.schvalovatel_id = :role_user_id
                            OR o.prikazce_id = :role_user_id
                            OR o.uzivatel_akt_id = :role_user_id
                            OR o.odesilatel_id = :role_user_id
                            OR o.dodavatel_potvrdil_id = :role_user_id
                            OR o.zverejnil_id = :role_user_id
                            OR o.fakturant_id = :role_user_id
                            OR o.dokoncil_id = :role_user_id
                            OR o.potvrdil_vecnou_spravnost_id = :role_user_id
                        )
                    )
                )";
                
                $whereConditions[] = $hybridRoleCondition;
                $params['role_user_id'] = $current_user_id;
                error_log("Order V2 LIST: Applied ORDER_OLD hybrid filtering for user $current_user_id");
            }
            
        } else if ($isFullAdmin) {
            // FULL ADMIN bez ORDER_OLD nebo archivovano=0
            // → Vidí VŠECHNY objednávky, ale archivované jen pokud archivovano=1
            if (!$includeArchived) {
                error_log("Order V2 LIST: FULL ADMIN - excluding archived (archivovano=0 or not set)");
                $whereConditions[] = "o.stav_objednavky != 'ARCHIVOVANO'";
            } else {
                error_log("Order V2 LIST: FULL ADMIN - including archived (archivovano=1)");
                // Žádný filtr - vidí všechny včetně archivovaných
            }
            
        } else if ($hasReadAllPermissions) {
            // ORDER_READ_ALL/VIEW_ALL
            // → Vidí všechny objednávky, ale archivované jen pokud archivovano=1
            if (!$includeArchived) {
                error_log("Order V2 LIST: ORDER_READ_ALL/VIEW_ALL - excluding archived (archivovano=0 or not set)");
                $whereConditions[] = "o.stav_objednavky != 'ARCHIVOVANO'";
            } else {
                error_log("Order V2 LIST: ORDER_READ_ALL/VIEW_ALL - including archived (archivovano=1)");
                // Žádný filtr - vidí všechny včetně archivovaných
            }
            
        } else {
            // 🔥 Běžný uživatel bez speciálních práv
            // Viditelnost už byla nastavena výše přes visibility filters (role-based + hierarchie + department)
            // Zde jen řešíme archivované objednávky
            
            if (!$includeArchived) {
                $whereConditions[] = "o.stav_objednavky != 'ARCHIVOVANO'";
                error_log("Order V2 LIST: Regular user - excluding archived orders (archivovano=0 or not set)");
            } else {
                error_log("Order V2 LIST: Regular user - including archived orders where user has visibility (archivovano=1)");
            }
        }
        
        // 🔥 KRITICKÉ FIX: Podpora pro 'rok' a 'mesic' parametry z frontendu
        // Frontend posílá { rok: 2026 } nebo { rok: 2026, mesic: "1" } nebo { rok: 2026, mesic: "10-12" }
        // Backend musí převést na datum_od a datum_do
        
        if (isset($input['rok']) && !empty($input['rok'])) {
            $rok = (int)$input['rok'];
            
            if (isset($input['mesic']) && !empty($input['mesic'])) {
                // Konkrétní měsíc nebo rozsah měsíců
                $mesic = $input['mesic'];
                
                if (strpos($mesic, '-') !== false) {
                    // Rozsah měsíců (např. "10-12" = říjen až prosinec)
                    list($mesic_od, $mesic_do) = explode('-', $mesic);
                    $mesic_od = (int)$mesic_od;
                    $mesic_do = (int)$mesic_do;
                    
                    $whereConditions[] = "DATE(o.dt_objednavky) >= :datum_od";
                    $whereConditions[] = "DATE(o.dt_objednavky) <= :datum_do";
                    $params['datum_od'] = sprintf('%04d-%02d-01', $rok, $mesic_od);
                    $params['datum_do'] = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $rok, $mesic_do)));
                    
                    error_log("Order V2 LIST: Year-Month RANGE filter: rok=$rok, mesic=$mesic_od-$mesic_do");
                    error_log("Order V2 LIST: Converted to datum_od=" . $params['datum_od'] . ", datum_do=" . $params['datum_do']);
                } else {
                    // Jeden měsíc
                    $mesic_cislo = (int)$mesic;
                    
                    $whereConditions[] = "DATE(o.dt_objednavky) >= :datum_od";
                    $whereConditions[] = "DATE(o.dt_objednavky) <= :datum_do";
                    $params['datum_od'] = sprintf('%04d-%02d-01', $rok, $mesic_cislo);
                    $params['datum_do'] = date('Y-m-t', strtotime($params['datum_od']));
                    
                    error_log("Order V2 LIST: Year-Month filter: rok=$rok, mesic=$mesic_cislo");
                    error_log("Order V2 LIST: Converted to datum_od=" . $params['datum_od'] . ", datum_do=" . $params['datum_do']);
                }
            } else {
                // Celý rok bez měsíce
                $whereConditions[] = "YEAR(o.dt_objednavky) = :rok_filter";
                $params['rok_filter'] = $rok;
                
                error_log("Order V2 LIST: Year filter: rok=$rok");
            }
        } else {
            // Fallback na datum_od a datum_do (původní logika)
            if (isset($input['datum_od']) && !empty($input['datum_od'])) {
                $whereConditions[] = "DATE(o.dt_objednavky) >= :datum_od";
                $params['datum_od'] = $input['datum_od'];
                error_log("Order V2 LIST: Date filter FROM: " . $input['datum_od']);
            }
            
            if (isset($input['datum_do']) && !empty($input['datum_do'])) {
                $whereConditions[] = "DATE(o.dt_objednavky) <= :datum_do";
                $params['datum_do'] = $input['datum_do'];
                error_log("Order V2 LIST: Date filter TO: " . $input['datum_do']);
            }
        }
        
        error_log("Order V2 LIST: All filters applied, whereConditions: " . json_encode($whereConditions));
        
        // Sestavení WHERE klauzule
        $whereClause = '';
        if (!empty($whereConditions)) {
            $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
        }
        
        error_log("Order V2 LIST: DB connection OK");
        error_log("Order V2 LIST: Table name = " . get_orders_table_name());
        
        // Hlavní dotaz pro data
        $sql = "SELECT o.*
                FROM " . get_orders_table_name() . " o
                " . $whereClause . "
                ORDER BY o.dt_vytvoreni DESC";
        
        if ($limit !== null) {
            $sql .= " LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
        }
        
        error_log("Order V2 LIST: SQL query: " . $sql);
        error_log("Order V2 LIST: Params: " . json_encode($params));
        
        try {
            $stmt = $db->prepare($sql);
            error_log("Order V2 LIST: SQL prepared OK");
            
            // Bind filter parametry
            foreach ($params as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            
            error_log("Order V2 LIST: Executing query...");
            $stmt->execute();
            error_log("Order V2 LIST: Query executed OK");
            
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("Order V2 LIST: Found " . count($orders) . " orders");
        } catch (Exception $sqlEx) {
            error_log("Order V2 LIST: SQL ERROR: " . $sqlEx->getMessage());
            throw $sqlEx;
        }
        
        // Count dotaz
        $countSql = "SELECT COUNT(*) as total FROM " . get_orders_table_name() . " o " . $whereClause;
        $countStmt = $db->prepare($countSql);
        
        foreach ($params as $key => $value) {
            $countStmt->bindValue(':' . $key, $value);
        }
        
        $countStmt->execute();
        $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
        $totalCount = $countResult['total'];
        
        error_log("Order V2 LIST: Total count: " . $totalCount);
        
        // 🔥 NOVÉ: Celkový počet objednávok bez permission/role filtrov (len dátum + aktivni)
        $totalWithoutPermissionFilters = 0;
        try {
            $noFilterParams = array();
            $noFilterConditions = array("o.aktivni = 1");
            
            // Pridaj len dátumové filtre (bez role/permission filtrov)
            // Podpor jak rok/mesic tak datum_od/datum_do
            if (isset($input['rok']) && !empty($input['rok'])) {
                $rok = (int)$input['rok'];
                
                if (isset($input['mesic']) && !empty($input['mesic'])) {
                    $mesic = $input['mesic'];
                    
                    if (strpos($mesic, '-') !== false) {
                        list($mesic_od, $mesic_do) = explode('-', $mesic);
                        $mesic_od = (int)$mesic_od;
                        $mesic_do = (int)$mesic_do;
                        
                        $noFilterConditions[] = "DATE(o.dt_objednavky) >= :datum_od_nf";
                        $noFilterConditions[] = "DATE(o.dt_objednavky) <= :datum_do_nf";
                        $noFilterParams['datum_od_nf'] = sprintf('%04d-%02d-01', $rok, $mesic_od);
                        $noFilterParams['datum_do_nf'] = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $rok, $mesic_do)));
                    } else {
                        $mesic_cislo = (int)$mesic;
                        
                        $noFilterConditions[] = "DATE(o.dt_objednavky) >= :datum_od_nf";
                        $noFilterConditions[] = "DATE(o.dt_objednavky) <= :datum_do_nf";
                        $noFilterParams['datum_od_nf'] = sprintf('%04d-%02d-01', $rok, $mesic_cislo);
                        $noFilterParams['datum_do_nf'] = date('Y-m-t', strtotime($noFilterParams['datum_od_nf']));
                    }
                } else {
                    $noFilterConditions[] = "YEAR(o.dt_objednavky) = :rok_filter_nf";
                    $noFilterParams['rok_filter_nf'] = $rok;
                }
            } else {
                if (isset($input['datum_od']) && !empty($input['datum_od'])) {
                    $noFilterConditions[] = "DATE(o.dt_objednavky) >= :datum_od_nf";
                    $noFilterParams['datum_od_nf'] = $input['datum_od'];
                }
                
                if (isset($input['datum_do']) && !empty($input['datum_do'])) {
                    $noFilterConditions[] = "DATE(o.dt_objednavky) <= :datum_do_nf";
                    $noFilterParams['datum_do_nf'] = $input['datum_do'];
                }
            }
            
            // Archivované filter (ak frontend nepožadoval archivované, vyfiltruj ich)
            if (!isset($input['archivovano']) || $input['archivovano'] != 1) {
                $noFilterConditions[] = "o.stav_objednavky != 'ARCHIVOVANO'";
            }
            
            $noFilterWhereClause = 'WHERE ' . implode(' AND ', $noFilterConditions);
            
            $totalNoFilterSql = "SELECT COUNT(*) as total FROM " . get_orders_table_name() . " o " . $noFilterWhereClause;
            $totalNoFilterStmt = $db->prepare($totalNoFilterSql);
            
            foreach ($noFilterParams as $key => $value) {
                $totalNoFilterStmt->bindValue(':' . $key, $value);
            }
            
            $totalNoFilterStmt->execute();
            $totalNoFilterResult = $totalNoFilterStmt->fetch(PDO::FETCH_ASSOC);
            $totalWithoutPermissionFilters = $totalNoFilterResult['total'];
            
            error_log("Order V2 LIST: Total WITHOUT permission filters: " . $totalWithoutPermissionFilters);
            
        } catch (Exception $totalEx) {
            error_log("Order V2 LIST: Error counting total without filters: " . $totalEx->getMessage());
            $totalWithoutPermissionFilters = 0;
        }
        
        // Standardizace výstupu pomocí OrderV2Handler
        $standardizedOrders = array();
        $isEnriched = isset($input['enriched']) && $input['enriched'] == 1;
        
        error_log("Order V2 LIST: Enrichment requested: " . ($isEnriched ? 'YES' : 'NO'));
        
        // OCHRANA: Pro velké množství záznamů zakážeme enrichment
        // VÝJIMKA: Pokud je nastaveno _force_enrichment (z list-enriched endpointu), enrichment NESMÍ být vypnut
        $recordCount = count($orders);
        $forceEnrichment = isset($input['_force_enrichment']) && $input['_force_enrichment'] === true;
        
        if ($isEnriched && $recordCount > 100 && !$forceEnrichment) {
            error_log("Order V2 LIST: WARNING - Too many records ($recordCount) for enrichment, disabling enrichment");
            $isEnriched = false;
        } elseif ($forceEnrichment && $recordCount > 100) {
            error_log("Order V2 LIST: FORCE ENRICHMENT MODE - Processing $recordCount records with enrichment (may be slow)");
        }
        
        foreach ($orders as $order) {
            try {
                error_log("Order V2 LIST: Processing order ID " . $order['id'] . ", stav: " . (isset($order['stav_objednavky']) ? $order['stav_objednavky'] : 'N/A'));
                
                $standardOrder = $handler->transformFromDB($order);
                error_log("Order V2 LIST: Transform OK for order ID " . $order['id']);
                
                // Enrichment pokud je vyžadován
                if ($isEnriched) {
                    error_log("Order V2 LIST: Starting enrichment for order ID " . $order['id']);
                    require_once __DIR__ . '/orderHandlers.php';
                    
                    error_log("Order V2 LIST: - enrichOrderWithItems");
                    enrichOrderWithItems($db, $standardOrder);
                    
                    error_log("Order V2 LIST: - enrichOrderWithInvoices");
                    enrichOrderWithInvoices($db, $standardOrder);
                    
                    error_log("Order V2 LIST: - enrichOrderWithCodebooks");
                    enrichOrderWithCodebooks($db, $standardOrder);
                    
                    error_log("Order V2 LIST: - enrichOrderFinancovani");
                    enrichOrderFinancovani($db, $standardOrder);
                    
                    error_log("Order V2 LIST: - enrichOrderRegistrSmluv");
                    enrichOrderRegistrSmluv($db, $standardOrder);
                    
                    error_log("Order V2 LIST: - enrichOrderWithWorkflowUsers");
                    enrichOrderWithWorkflowUsers($db, $standardOrder);
                    
                    error_log("Order V2 LIST: Enrichment complete for order ID " . $order['id']);
                }
                
                $standardizedOrders[] = $standardOrder;
                error_log("Order V2 LIST: Order ID " . $order['id'] . " added to results");
                
            } catch (Exception $e) {
                error_log("Order V2 LIST ERROR: Failed processing order ID " . $order['id'] . ": " . $e->getMessage());
                error_log("Order V2 LIST ERROR: Stack trace: " . $e->getTraceAsString());
                // Re-throw to see full error
                throw $e;
            }
        }
        
        error_log("Order V2 LIST: Standardized " . count($standardizedOrders) . " orders" . ($isEnriched ? " (enriched)" : ""));
        
        require_once __DIR__ . '/TimezoneHelper.php';
        
        // PHP 5.6 kompatibilní - has_more jen když máme limit
        $hasMore = false;
        if ($limit !== null) {
            $hasMore = ($offset + $limit) < $totalCount;
        }
        
        // PHP 5.6 kompatibilní - timestamp může selhat
        $apiTimestamp = date('Y-m-d\TH:i:s\Z');
        try {
            $apiTimestamp = TimezoneHelper::getApiTimestamp();
        } catch (Exception $timestampEx) {
            error_log("Order V2 LIST: Timestamp error: " . $timestampEx->getMessage());
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $standardizedOrders,
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'pagination' => array(
                    'total' => (int)$totalCount,
                    'limit' => $limit,
                    'offset' => $offset,
                    'has_more' => $hasMore
                ),
                'filters_applied' => count($params),
                'timestamp' => $apiTimestamp,
                'debug' => array(
                    'user_id' => $current_user_id,
                    'is_admin' => $isAdminByRole,
                    'hierarchy_applied' => $hierarchyApplied,
                    'permissions' => $user_permissions,
                    'roles' => $user_roles,
                    'sql_preview' => substr($sql, 0, 500),
                    'params' => $params
                )
            )
        ));
        
    } catch (Exception $e) {
        error_log("=== Order V2 LIST FATAL ERROR ===");
        error_log("Order V2 LIST Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
        error_log("Order V2 LIST Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chyba při načítání seznamu objednávek: ' . $e->getMessage(),
            'debug_info' => array(
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            )
        ));
    }
    
    /* COMMENTED OUT FOR DEBUG
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    try {
        $current_user_id = $auth_result['id'];
        $handler = new OrderV2Handler($config);
        
        // Pagination parametry
        $limit = isset($input['limit']) ? (int)$input['limit'] : 20;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        
        // Filtering parametry
        $filters = array();
    END DEBUG COMMENT */
    
    /* COMMENTED OUT - entire function body for debug
        $params = array();
        
        // Základní WHERE podmínka
        $whereConditions = array();
        
        // Filter: aktivni objednávky (default)
        if (!isset($input['archivovano']) || $input['archivovano'] != 1) {
            $whereConditions[] = "o.aktivni = 1";
        }
        
        // Filter: podle uživatele
        if (isset($input['uzivatel_id']) && is_numeric($input['uzivatel_id'])) {
            $whereConditions[] = "(o.objednatel_id = :uzivatel_id OR o.garant_uzivatel_id = :uzivatel_id)";
            $params['uzivatel_id'] = (int)$input['uzivatel_id'];
        }
        
        // Filter: podle stavu workflow
        if (isset($input['stav']) && !empty($input['stav'])) {
            $whereConditions[] = "JSON_CONTAINS(o.stav_workflow_kod, :stav_json)";
            $params['stav_json'] = json_encode($input['stav']);
        }
        
        // Filter: podle druhu objednávky
        if (isset($input['druh']) && !empty($input['druh'])) {
            $whereConditions[] = "o.druh_objednavky_kod = :druh";
            $params['druh'] = $input['druh'];
        }
        
        // Filter: podle střediska
        if (isset($input['stredisko']) && !empty($input['stredisko'])) {
            $whereConditions[] = "JSON_CONTAINS(o.strediska_kod, :stredisko_json)";
            $params['stredisko_json'] = json_encode($input['stredisko']);
        }
        
        // Filter: podle data od-do
        if (isset($input['datum_od']) && !empty($input['datum_od'])) {
            $whereConditions[] = "DATE(o.dt_objednavky) >= :datum_od";
            $params['datum_od'] = $input['datum_od'];
        }
        
        if (isset($input['datum_do']) && !empty($input['datum_do'])) {
            $whereConditions[] = "DATE(o.dt_objednavky) <= :datum_do";
            $params['datum_do'] = $input['datum_do'];
        }
        
        // Sestavení WHERE klauzule
        $whereClause = '';
        if (!empty($whereConditions)) {
            $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
        }
        
        // Připojení k databázi pro business logiku
        $db = get_db($config);
        
        // Hlavní dotaz pro data
        $sql = "SELECT o.*
                FROM " . get_orders_table_name() . " o
                {$whereClause}
                ORDER BY o.dt_vytvoreni DESC
                LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($sql);
        
        // Bind parametry
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        $rawOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Dotaz pro celkový počet (bez LIMIT)
        $countSql = "SELECT COUNT(*) as total
                     FROM " . get_orders_table_name() . " o
                     {$whereClause}";
        
        $countStmt = $db->prepare($countSql);
        foreach ($params as $key => $value) {
            $countStmt->bindValue(':' . $key, $value);
        }
        $countStmt->execute();
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Transformace dat do standardizovaného formátu
        $orders = array();
        foreach ($rawOrders as $rawOrder) {
            $standardOrder = $handler->transformFromDB($rawOrder);
            
            // Volitelný enrichment pro listing (pokud parametr enriched=1)
            if (isset($input['enriched']) && $input['enriched'] == 1) {
                enrichOrderWithItems($db, $standardOrder);
                enrichOrderWithInvoices($db, $standardOrder);
                enrichOrderWithCodebooks($db, $standardOrder);
            }
            
            $orders[] = $standardOrder;
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $orders,
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'pagination' => array(
                    'total' => (int)$totalCount,
                    'limit' => $limit,
                    'offset' => $offset,
                    'has_more' => ($offset + $limit) < $totalCount
                ),
                'filters_applied' => count($params),
                'timestamp' => TimezoneHelper::getApiTimestamp()
            )
        ));
        
    END COMMENTED OUT FUNCTION BODY */
        
    /* COMMENTED OUT FOR DEBUG - catch block
    } catch (Exception $e) {
        error_log("Order V2 LIST Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání seznamu objednávek: ' . $e->getMessage()));
    }
    END DEBUG COMMENT */
}

/**
 * POST /api/order-v2
 * Vytvoření nové objednávky se standardizovanými daty
 */
function handle_order_v2_create($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    try {
        $handler = new OrderV2Handler($config);
        
        // AUTOMATICKÉ GENEROVÁNÍ ČÍSLA OBJEDNÁVKY pokud není zadáno
        if (empty($input['cislo_objednavky'])) {
            $numberData = $handler->generateNextOrderNumber($username);
            if (!$numberData) {
                http_response_code(400);
                echo json_encode(array(
                    'status' => 'error',
                    'message' => 'Nepodařilo se vygenerovat číslo objednávky - uživatel nemá přiřazenou organizaci/úsek'
                ));
                return;
            }
            // Přidej vygenerované číslo do inputu
            $input['cislo_objednavky'] = $numberData['next_order_string'];
        }
        
        // Validace vstupních dat
        $validation = $handler->validateOrderData($input);
        if (!$validation['valid']) {
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Chyba validace dat',
                'errors' => $validation['errors']
            ));
            return;
        }
        
        // Transformace dat pro DB
        $dbData = $handler->transformToDB($input);
        
        // Automatické nastavení - opraveno timezone handling
        $db = get_db($config);
        TimezoneHelper::setMysqlTimezone($db);
        $dbData['dt_vytvoreni'] = TimezoneHelper::getCzechDateTime();
        $dbData['aktivni'] = 1;
        $dbData['uzivatel_id'] = $auth_result['id']; // ✅ CRITICAL FIX: Set creator ID from auth
        
        // OPRAVA: Pokud není nastaveno dt_objednavky, použij aktuální datum a čas
        if (!isset($dbData['dt_objednavky']) || $dbData['dt_objednavky'] === '' || $dbData['dt_objednavky'] === null) {
            $dbData['dt_objednavky'] = TimezoneHelper::getCzechDateTime();
        }
        
        // Sestavení INSERT dotazu
        $fields = array();
        $placeholders = array();
        $values = array();
        
        foreach ($dbData as $key => $value) {
            if ($key !== 'id') { // ID je auto-increment
                $fields[] = "`{$key}`";
                $placeholders[] = ":{$key}";
                $values[$key] = $value;
            }
        }
        
        $sql = "INSERT INTO " . get_orders_table_name() . " (" . implode(', ', $fields) . ") 
                VALUES (" . implode(', ', $placeholders) . ")";
        
        $db = get_db($config);
        $stmt = $db->prepare($sql);
        
        foreach ($values as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }
        
        $stmt->execute();
        $newOrderId = $db->lastInsertId();
        
        // === PŘEPOČET ČERPÁNÍ SMLOUVY - NEVOLÁ SE PŘI CREATE ===
        // Přepočet smluv má smysl až při schválení nebo změně položek (stejně jako u LP)
        // Při CREATE objednávka ještě není schválená, takže se nezapočítává do čerpání
        
        // Načtení vytvořené objednávky ve standardizovaném formátu
        $newOrder = $handler->getOrderById($newOrderId, $auth_result['id']);
        
        // ENRICHMENT: Přidej položky (včetně LP dat), faktury a přílohy
        enrichOrderWithItems($db, $newOrder);
        enrichOrderWithInvoices($db, $newOrder);
        enrichOrderWithCodebooks($db, $newOrder);
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Objednávka byla úspěšně vytvořena',
            'data' => $newOrder,
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'enriched' => true,
                'created_id' => (int)$newOrderId,
                'timestamp' => TimezoneHelper::getApiTimestamp()
            )
        ));
        
    } catch (Exception $e) {
        $error_details = array(
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        );
        error_log("Order V2 CREATE Error [" . basename(__FILE__) . ":" . __LINE__ . "]: " . json_encode($error_details));
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření objednávky: ' . $e->getMessage()));
    }
}

/**
 * PUT /api/order-v2/{id}
 * Update objednávky se standardizovanými daty
 */
function handle_order_v2_update($input, $config, $queries) {
    error_log("=== Order V2 UPDATE START === Order ID: " . (isset($input['id']) ? $input['id'] : 'N/A'));
    
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        error_log("Order V2 UPDATE: Auth failed");
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if ($order_id <= 0) {
        error_log("Order V2 UPDATE: Invalid order ID: $order_id");
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky'));
        return;
    }
    
    error_log("Order V2 UPDATE: Auth OK, user_id=" . $auth_result['id'] . ", order_id=$order_id");
    
    try {
        $handler = new OrderV2Handler($config);
        $current_user_id = $auth_result['id'];
        
        // Ověř že objednávka existuje
        $existingOrder = $handler->getOrderById($order_id, $current_user_id);
        if (!$existingOrder) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka nebyla nalezena'));
            return;
        }
        
        // Kontrola lock stavu
        if ($existingOrder['lock_info']['locked'] === true) {
            http_response_code(423); // Locked
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Objednávka je zamčená jiným uživatelem',
                'lock_info' => $existingOrder['lock_info']
            ));
            return;
        }
        
        // 🔥 DETEKCE PARTIAL UPDATE - různé scénáře bez úplné validace
        $is_partial_update = false;
        $skip_items_validation = false;
        
        // Scénář 1: Archivace - jen změna stavu
        if (isset($input['stav_workflow_kod']) && is_array($input['stav_workflow_kod']) && 
            count($input['stav_workflow_kod']) === 1 && $input['stav_workflow_kod'][0] === 'ARCHIVOVANO') {
            $is_partial_update = true;
            $skip_items_validation = true;
            error_log("Order V2 UPDATE: Detected ARCHIVATION partial update - skipping full validation");
        }
        
        // Scénář 2: Admin odemkl UZAVŘENOU objednávku k ex post opravě
        // Ex post oprava = objednávka je POUZE v locked state BEZ editovatelných stavů (ROZPRACOVANA, NOVA)
        $locked_states = ['SCHVALENA', 'ODESLAN_DODAVATELI', 'ZKONTROLOVANA', 'VECNA_SPRAVNOST', 'FAKTURACE', 'DOKONCENA'];
        $editable_states = ['ROZPRACOVANA', 'NOVA'];
        $is_ex_post_edit = false;
        
        if (isset($existingOrder['stav_workflow_kod']) && is_array($existingOrder['stav_workflow_kod'])) {
            $has_locked_state = false;
            $has_editable_state = false;
            
            foreach ($existingOrder['stav_workflow_kod'] as $state) {
                if (in_array($state, $locked_states)) {
                    $has_locked_state = true;
                }
                if (in_array($state, $editable_states)) {
                    $has_editable_state = true;
                }
            }
            
            // Ex post oprava = má locked state ALE NEMÁ editovatelný stav
            if ($has_locked_state && !$has_editable_state) {
                $is_ex_post_edit = true;
                error_log("Order V2 UPDATE: Order $order_id is EX POST EDIT (locked without editable state)");
            } elseif ($has_locked_state && $has_editable_state) {
                error_log("Order V2 UPDATE: Order $order_id has locked state BUT ALSO editable state - NORMAL WORKFLOW");
            }
        }
        
        // 🔥 Ex post oprava: Skipni validaci položek JEN pokud frontend NEPOSLAL položky
        // Normální workflow (má ROZPRACOVANA/NOVA): VŽDY zpracuj položky pokud je frontend poslal
        $frontend_sent_items = array_key_exists('polozky', $input) || array_key_exists('polozky_objednavky', $input);
        
        if ($is_ex_post_edit && !$frontend_sent_items) {
            $skip_items_validation = true;
            $is_partial_update = true;
            error_log("Order V2 UPDATE: Ex post edit WITHOUT items in payload - enabling partial update mode");
        } elseif ($is_ex_post_edit && $frontend_sent_items) {
            error_log("Order V2 UPDATE: Ex post edit WITH items in payload - WILL SAVE items");
        }
        
        // Validace vstupních dat - přeskočit pro partial updates
        if (!$is_partial_update) {
            $validation = $handler->validateOrderDataForUpdate($input);
            if (!$validation['valid']) {
                http_response_code(400);
                echo json_encode(array(
                    'status' => 'error', 
                    'message' => 'Chyba validace dat pro UPDATE',
                    'errors' => $validation['errors']
                ));
                return;
            }
        } else {
            error_log("Order V2 UPDATE: Partial update detected - skipping full data validation");
        }
        
        // Transformace dat pro DB
        $dbData = $handler->transformToDB($input, true); // ✅ isUpdate = true
        
        $db = get_db($config);
        $db->beginTransaction();
        
        // Automatické nastavení - timezone handling PO inicializaci DB
        TimezoneHelper::setMysqlTimezone($db);
        $dbData['dt_aktualizace'] = TimezoneHelper::getCzechDateTime();
        $dbData['uzivatel_akt_id'] = $current_user_id; // ✅ FIXED: Set user who updated the order
        
        // ✅ AUTOMATICKÉ NASTAVENÍ dt_schvaleni při změně workflow stavu na SCHVALENA
        if (isset($dbData['stav_workflow_kod'])) {
            $new_workflow_decoded = json_decode($dbData['stav_workflow_kod'], true);
            $old_workflow_array = isset($existingOrder['stav_workflow_kod']) && is_array($existingOrder['stav_workflow_kod']) 
                ? $existingOrder['stav_workflow_kod'] 
                : array();
            
            // Pokud se přidává SCHVALENA stav (dříve nebyl, teď je)
            if (is_array($new_workflow_decoded) && in_array('SCHVALENA', $new_workflow_decoded) &&
                !in_array('SCHVALENA', $old_workflow_array)) {
                $dbData['dt_schvaleni'] = TimezoneHelper::getCzechDateTime();
                $dbData['schvalovatel_id'] = $current_user_id; // Nastavit schvalovatele
                error_log("Order V2 UPDATE: Auto-setting dt_schvaleni=" . $dbData['dt_schvaleni'] . " and schvalovatel_id=$current_user_id for order $order_id");
            }
        }
        
        try {
            // ========== UPDATE HLAVNÍ OBJEDNÁVKY ==========
            $setParts = array();
            $values = array();
            
            foreach ($dbData as $key => $value) {
                // ✅ CRITICAL FIX: Never update core IDs (creator/orderer) or id
                if ($key !== 'id' && $key !== 'uzivatel_id' && $key !== 'objednatel_id') {
                    $setParts[] = "`{$key}` = :{$key}";
                    $values[$key] = $value;
                }
            }
            
            $sql = "UPDATE " . get_orders_table_name() . " SET " . implode(', ', $setParts) . " WHERE id = :id";
            $values['id'] = $order_id;
            
            $stmt = $db->prepare($sql);
            foreach ($values as $key => $value) {
                $stmt->bindValue(":{$key}", $value);
            }
            $stmt->execute();
            
            // ========== UPDATE POLOŽEK OBJEDNÁVKY ==========
            // Zpracování položek podle vzoru z Order25 (saveOrderItems pattern)
            $items_processed = 0;
            $items_updated = false;
            
            // � DEBUG: Zalogovat informace o položkách v inputu
            $has_polozky = array_key_exists('polozky', $input);
            $has_polozky_objednavky = array_key_exists('polozky_objednavky', $input);
            error_log("Order V2 UPDATE [{$order_id}]: DEBUG položky - has_polozky=" . ($has_polozky ? 'YES' : 'NO') . ", has_polozky_objednavky=" . ($has_polozky_objednavky ? 'YES' : 'NO'));
            
            if ($has_polozky) {
                $polozky_count = is_array($input['polozky']) ? count($input['polozky']) : 'NOT_ARRAY';
                error_log("Order V2 UPDATE [{$order_id}]: polozky count = {$polozky_count}");
                if (is_array($input['polozky']) && count($input['polozky']) > 0) {
                    error_log("Order V2 UPDATE [{$order_id}]: polozky[0] = " . json_encode($input['polozky'][0]));
                }
            }
            
            if ($has_polozky_objednavky) {
                $polozky_objednavky_count = is_array($input['polozky_objednavky']) ? count($input['polozky_objednavky']) : 'NOT_ARRAY';
                error_log("Order V2 UPDATE [{$order_id}]: polozky_objednavky count = {$polozky_objednavky_count}");
                if (is_array($input['polozky_objednavky']) && count($input['polozky_objednavky']) > 0) {
                    error_log("Order V2 UPDATE [{$order_id}]: polozky_objednavky[0] = " . json_encode($input['polozky_objednavky'][0]));
                }
            }
            
            // �🔥 SKIP validace položek pro partial updates (admin mění zamčenou objednávku)
            if ($skip_items_validation) {
                error_log("Order V2 UPDATE: Skipping items validation/update (partial update mode)");
                // Položky se neaktualizují, zůstávají původní
            }
            // Kontrola, zda jsou v input datech položky k aktualizaci
            elseif (array_key_exists('polozky', $input) || array_key_exists('polozky_objednavky', $input)) {
                // Validace a parsování položek (lp_id je součástí validateAndParseOrderItems)
                $order_items = validateAndParseOrderItems($input);
                
                // ✅ Zpracování chyb validace položek
                if (is_array($order_items) && isset($order_items['valid']) && $order_items['valid'] === false) {
                    // Validace selhala - vrátit chyby
                    $db->rollBack();
                    http_response_code(400);
                    echo json_encode(array(
                        'status' => 'error', 
                        'error_code' => 'VALIDATION_ERROR',
                        'message' => 'Chyba validace položek objednávky',
                        'errors' => $order_items['errors']
                    ));
                    return;
                }
                
                if ($order_items !== false) {
                    // saveOrderItems pattern: smaž stávající + vlož nové
                    if (saveOrderV2Items($db, $order_id, $order_items)) {
                        $items_processed = count($order_items);
                        $items_updated = true;
                    } else {
                        throw new Exception('Chyba při aktualizaci položek objednávky');
                    }
                } else {
                    // Prázdné položky nebo chybný formát - ale můžeme pokračovat pro partial update
                    error_log("Order V2 UPDATE: Empty or invalid items format, but continuing (may be partial update)");
                }
            }
            
            // ========== ZPRACOVÁNÍ FAKTUR V2 ==========
            // Frontend může poslat pole faktur podle vzoru Order25:
            // - Pokud má faktura id=null nebo chybí → CREATE nové faktury
            // - Pokud má faktura id (number) → UPDATE existující faktury
            // - Přílohy se spravují separátně v invoice attachments API
            
            $invoices_processed = 0;
            $invoices_updated = false;
            
            if (isset($input['faktury']) && is_array($input['faktury'])) {
                $faktury_table = get_invoices_table_name(); // TBL_FAKTURY (25a_objednavky_faktury)
                
                foreach ($input['faktury'] as $faktura) {
                    $faktura_id = isset($faktura['id']) ? (int)$faktura['id'] : null;
                    
                    if ($faktura_id === null || $faktura_id === 0) {
                        // ========== CREATE nová faktura ==========
                        $fa_castka = isset($faktura['fa_castka']) ? $faktura['fa_castka'] : null;
                        $fa_cislo_vema = isset($faktura['fa_cislo_vema']) ? trim($faktura['fa_cislo_vema']) : '';
                        
                        if (!$fa_castka || empty($fa_cislo_vema)) {
                            continue; // Přeskoč neplatnou fakturu
                        }
                        
                        // ✅ fa_strediska_kod → JSON array stringů (BEZ MODIFIKACE)
                        $fa_strediska_value = null;
                        if (isset($faktura['fa_strediska_kod'])) {
                            if (is_array($faktura['fa_strediska_kod'])) {
                                // Uložit bez modifikace - pouze odstranit prázdné hodnoty
                                $cleanedStrediska = array_values(array_filter($faktura['fa_strediska_kod']));
                                $fa_strediska_value = json_encode($cleanedStrediska);
                            } else {
                                // Už je to string (možná JSON)
                                $fa_strediska_value = $faktura['fa_strediska_kod'];
                            }
                        }
                        
                        // Zpracuj rozsirujici_data - array → JSON, string → přímo (PHP 5.6)
                        $rozsirujici_value = null;
                        if (isset($faktura['rozsirujici_data'])) {
                            if (is_array($faktura['rozsirujici_data'])) {
                                $rozsirujici_value = json_encode($faktura['rozsirujici_data']);
                            } else {
                                $rozsirujici_value = $faktura['rozsirujici_data'];
                            }
                        }
                        
                        // MySQL 5.5.43 kompatibilní INSERT
                        $sql_insert = "INSERT INTO `{$faktury_table}` (
                            objednavka_id,
                            fa_dorucena,
                            fa_castka,
                            fa_cislo_vema,
                            fa_datum_vystaveni,
                            fa_datum_splatnosti,
                            fa_datum_doruceni,
                            fa_strediska_kod,
                            fa_poznamka,
                            rozsirujici_data,
                            vecna_spravnost_umisteni_majetku,
                            vecna_spravnost_poznamka,
                            vecna_spravnost_potvrzeno,
                            potvrdil_vecnou_spravnost_id,
                            dt_potvrzeni_vecne_spravnosti,
                            vytvoril_uzivatel_id,
                            dt_vytvoreni,
                            aktivni
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)";
                        
                        $stmt_insert = $db->prepare($sql_insert);
                        $stmt_insert->execute(array(
                            $order_id,
                            isset($faktura['fa_dorucena']) ? (int)$faktura['fa_dorucena'] : 0,
                            $fa_castka,
                            $fa_cislo_vema,
                            isset($faktura['fa_datum_vystaveni']) ? $faktura['fa_datum_vystaveni'] : null,
                            isset($faktura['fa_datum_splatnosti']) ? $faktura['fa_datum_splatnosti'] : null,
                            isset($faktura['fa_datum_doruceni']) ? $faktura['fa_datum_doruceni'] : null,
                            $fa_strediska_value,
                            isset($faktura['fa_poznamka']) ? $faktura['fa_poznamka'] : null,
                            $rozsirujici_value,
                            isset($faktura['vecna_spravnost_umisteni_majetku']) ? $faktura['vecna_spravnost_umisteni_majetku'] : null,
                            isset($faktura['vecna_spravnost_poznamka']) ? $faktura['vecna_spravnost_poznamka'] : null,
                            isset($faktura['vecna_spravnost_potvrzeno']) ? (int)$faktura['vecna_spravnost_potvrzeno'] : 0,
                            isset($faktura['potvrdil_vecnou_spravnost_id']) ? (int)$faktura['potvrdil_vecnou_spravnost_id'] : null,
                            isset($faktura['dt_potvrzeni_vecne_spravnosti']) ? $faktura['dt_potvrzeni_vecne_spravnosti'] : null,
                            $current_user_id
                        ));
                        
                        $invoices_processed++;
                        $invoices_updated = true;
                        
                        // ✅ AKTUALIZACE: Pokud je to první faktura, nastav fakturant_id v objednávce
                        // Kontrola, zda objednávka už nemá nastaveného fakturanta
                        $stmt_check = $db->prepare("SELECT fakturant_id FROM `25a_objednavky` WHERE id = ?");
                        $stmt_check->execute(array($order_id));
                        $order_data = $stmt_check->fetch(PDO::FETCH_ASSOC);
                        
                        if (!$order_data['fakturant_id']) {
                            // První faktura - nastav fakturanta a datum přidání první faktury
                            $orders_table = get_orders_table_name();
                            $stmt_update_order = $db->prepare("
                                UPDATE `{$orders_table}` 
                                SET fakturant_id = ?,
                                    dt_faktura_pridana = NOW(),
                                    dt_aktualizace = NOW(),
                                    uzivatel_akt_id = ?
                                WHERE id = ?
                            ");
                            $stmt_update_order->execute(array($current_user_id, $current_user_id, $order_id));
                            
                            error_log("✅ [FAKTURA] Nastaven fakturant_id={$current_user_id} pro objednávku ID={$order_id}");
                        }
                        
                    } else {
                        // ========== UPDATE existující faktura ==========
                        $update_fields = array();
                        $update_values = array();
                        
                        // Pouze zadané hodnoty budou aktualizovány (PHP 5.6 array syntax)
                        if (isset($faktura['fa_castka'])) {
                            $update_fields[] = 'fa_castka = ?';
                            $update_values[] = $faktura['fa_castka'];
                        }
                        if (isset($faktura['fa_cislo_vema'])) {
                            $update_fields[] = 'fa_cislo_vema = ?';
                            $update_values[] = trim($faktura['fa_cislo_vema']);
                        }
                        if (isset($faktura['fa_dorucena'])) {
                            $update_fields[] = 'fa_dorucena = ?';
                            $update_values[] = (int)$faktura['fa_dorucena'];
                        }
                        if (isset($faktura['fa_datum_vystaveni'])) {
                            $update_fields[] = 'fa_datum_vystaveni = ?';
                            $update_values[] = $faktura['fa_datum_vystaveni'];
                        }
                        if (isset($faktura['fa_datum_splatnosti'])) {
                            $update_fields[] = 'fa_datum_splatnosti = ?';
                            $update_values[] = $faktura['fa_datum_splatnosti'];
                        }
                        if (isset($faktura['fa_datum_doruceni'])) {
                            $update_fields[] = 'fa_datum_doruceni = ?';
                            $update_values[] = $faktura['fa_datum_doruceni'];
                        }
                        
                        // ✅ fa_strediska_kod → JSON array stringů (BEZ MODIFIKACE) při UPDATE
                        if (isset($faktura['fa_strediska_kod'])) {
                            $update_fields[] = 'fa_strediska_kod = ?';
                            if (is_array($faktura['fa_strediska_kod'])) {
                                // Uložit bez modifikace - pouze odstranit prázdné hodnoty
                                $cleanedStrediska = array_values(array_filter($faktura['fa_strediska_kod']));
                                $update_values[] = json_encode($cleanedStrediska);
                            } else {
                                $update_values[] = $faktura['fa_strediska_kod'];
                            }
                        }
                        
                        if (isset($faktura['rozsirujici_data'])) {
                            $update_fields[] = 'rozsirujici_data = ?';
                            if (is_array($faktura['rozsirujici_data'])) {
                                $update_values[] = json_encode($faktura['rozsirujici_data']);
                            } else {
                                $update_values[] = $faktura['rozsirujici_data'];
                            }
                        }
                        
                        if (isset($faktura['fa_poznamka'])) {
                            $update_fields[] = 'fa_poznamka = ?';
                            $update_values[] = $faktura['fa_poznamka'];
                        }
                        
                        // ✅ VĚCNÁ SPRÁVNOST - 5 polí (1:1 DB mapping)
                        if (isset($faktura['vecna_spravnost_umisteni_majetku'])) {
                            $update_fields[] = 'vecna_spravnost_umisteni_majetku = ?';
                            $update_values[] = $faktura['vecna_spravnost_umisteni_majetku'];
                        }
                        if (isset($faktura['vecna_spravnost_poznamka'])) {
                            $update_fields[] = 'vecna_spravnost_poznamka = ?';
                            $update_values[] = $faktura['vecna_spravnost_poznamka'];
                        }
                        if (isset($faktura['vecna_spravnost_potvrzeno'])) {
                            $update_fields[] = 'vecna_spravnost_potvrzeno = ?';
                            $update_values[] = (int)$faktura['vecna_spravnost_potvrzeno'];
                        }
                        if (isset($faktura['potvrdil_vecnou_spravnost_id'])) {
                            $update_fields[] = 'potvrdil_vecnou_spravnost_id = ?';
                            $update_values[] = !empty($faktura['potvrdil_vecnou_spravnost_id']) ? (int)$faktura['potvrdil_vecnou_spravnost_id'] : null;
                        }
                        if (isset($faktura['dt_potvrzeni_vecne_spravnosti'])) {
                            $update_fields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
                            $update_values[] = $faktura['dt_potvrzeni_vecne_spravnosti'];
                        }
                        
                        // ✅ AUTOMATIKA: Potvrzení věcné správnosti → změnit stav POUZE pokud je aktuálně ZAEVIDOVANA
                        // Stejná logika jako v InvoiceEvidence modulu
                        if (isset($faktura['vecna_spravnost_potvrzeno']) && (int)$faktura['vecna_spravnost_potvrzeno'] === 1) {
                            // Načíst aktuální stav faktury
                            $current_check = $db->prepare("SELECT stav FROM `{$faktury_table}` WHERE id = ?");
                            $current_check->execute(array($faktura_id));
                            $current_row = $current_check->fetch(PDO::FETCH_ASSOC);
                            
                            if ($current_row && $current_row['stav'] === 'ZAEVIDOVANA') {
                                // Je ve stavu ZAEVIDOVANA → automaticky přepnout na VECNA_SPRAVNOST
                                $update_fields[] = 'stav = ?';
                                $update_values[] = 'VECNA_SPRAVNOST';
                                error_log("🔄 [OrderV2] Auto změna stavu faktury #{$faktura_id}: ZAEVIDOVANA → VECNA_SPRAVNOST (potvrzena věcná správnost)");
                            }
                        }
                        
                        // Pokud jsou nějaká pole k aktualizaci
                        if (!empty($update_fields)) {
                            // Automatické pole
                            $update_fields[] = 'dt_aktualizace = NOW()';
                            $update_fields[] = 'aktualizoval_uzivatel_id = ?'; // ✅ FIXED: faktury mají aktualizoval_uzivatel_id, ne uzivatel_akt_id
                            $update_values[] = $current_user_id;
                            
                            // ID faktury na konec
                            $update_values[] = $faktura_id;
                            
                            // MySQL 5.5.43 kompatibilní UPDATE
                            $sql_update = "UPDATE `{$faktury_table}` SET " . implode(', ', $update_fields) . " WHERE id = ?";
                            $stmt_update = $db->prepare($sql_update);
                            $stmt_update->execute($update_values);
                            
                            $invoices_processed++;
                            $invoices_updated = true;
                        }
                    }
                }
            }
            
            // === PŘEPOČET LIMITOVANÝCH PŘÍSLIBŮ (PŘED COMMIT) ===
            // Pokud se změnil status na ODESLANA/SCHVALENA/DOKONCENA nebo se aktualizovaly položky
            $lp_codes = array();
            if ($items_updated || (isset($dbData['stav_workflow_kod']) && 
                in_array($dbData['stav_workflow_kod'], array('["ODESLANA"]', '["SCHVALENA"]', '["DOKONCENA"]')))) {
                
                // Získat LP kódy z JSON financovani (PŘED COMMIT)
                $sql_lp = "
                    SELECT financovani 
                    FROM " . TBL_OBJEDNAVKY . " 
                    WHERE id = :order_id
                ";
                
                $stmt_lp = $db->prepare($sql_lp);
                $stmt_lp->bindValue(':order_id', $order_id);
                $stmt_lp->execute();
                
                // Parsovat JSON a extrahovat lp_kody
                if ($row_lp = $stmt_lp->fetch(PDO::FETCH_ASSOC)) {
                    $financovani = json_decode($row_lp['financovani'], true);
                    
                    if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                        $lp_codes = $financovani['lp_kody'];
                    }
                }
            }
            
            $db->commit();
            
        } catch (Exception $e) {
            // Rollback pouze pokud je transakce aktivní
            if ($db->inTransaction()) {
                $db->rollback();
            }
            throw $e; // Re-throw pro vnější catch
        }
        
        // === PO COMMITU: Přepočty a načtení dat ===
        // Tyto operace jsou už mimo transakci, takže případná chyba nezpůsobí rollback
        
        // Přepočítat LP kódy (použít existující PDO spojení)
        if (!empty($lp_codes)) {
            foreach ($lp_codes as $lp_id) {
                // ✅ Přepočítat bez explicitního roku - funkce sama určí primární rok LP
                // Pro LP přecházející přes roky (2025-12-31 až 2026-12-31) se použije rok 2026
                prepocetCerpaniPodleIdLP_PDO($db, $lp_id, null);
            }
        }
        
        // === PŘEPOČET ČERPÁNÍ SMLOUVY (pokud je smlouva A došlo ke změně) ===
        $should_recalculate_smlouvy = $items_updated || (isset($dbData['stav_workflow_kod']) && 
            in_array($dbData['stav_workflow_kod'], array('["ODESLANA"]', '["SCHVALENA"]', '["DOKONCENA"]')));
        
        if ($should_recalculate_smlouvy) {
            // financovani je JSON: {"typ":"SMLOUVA","cislo_smlouvy":"XXX",...}
            if (isset($dbData['financovani']) && !empty($dbData['financovani'])) {
                $fin_data = json_decode($dbData['financovani'], true);
                if ($fin_data && isset($fin_data['typ']) && $fin_data['typ'] === 'SMLOUVA' && isset($fin_data['cislo_smlouvy'])) {
                    prepocetCerpaniSmlouvyAuto($fin_data['cislo_smlouvy']);
                }
            } else {
                // Zkontrolovat existující financování (pokud nebylo aktualizováno)
                $sql_check_fin = "SELECT financovani FROM " . TBL_OBJEDNAVKY . " WHERE id = :order_id";
                $stmt_check = $db->prepare($sql_check_fin);
                $stmt_check->bindValue(':order_id', $order_id);
                $stmt_check->execute();
                $existing = $stmt_check->fetch(PDO::FETCH_ASSOC);
                if ($existing && !empty($existing['financovani'])) {
                    $fin_data = json_decode($existing['financovani'], true);
                    if ($fin_data && isset($fin_data['typ']) && $fin_data['typ'] === 'SMLOUVA' && isset($fin_data['cislo_smlouvy'])) {
                        prepocetCerpaniSmlouvyAuto($fin_data['cislo_smlouvy']);
                    }
                }
            }
        }
        
        // Načtení aktualizované objednávky ve standardizovaném formátu
        $updatedOrder = $handler->getOrderById($order_id, $current_user_id);
        
        // Obohacení dat stejně jako u POST (položky včetně LP dat, faktury, číselníky)
        enrichOrderWithItems($db, $updatedOrder);
        enrichOrderWithInvoices($db, $updatedOrder);
        enrichOrderWithCodebooks($db, $updatedOrder);
        
        // === NOTIFIKAČNÍ SYSTÉM ===
        error_log("Order V2 UPDATE: Starting notification check for order ID $order_id");
        
        // 🔥 DEBUG: Force immediate debug info
        file_put_contents('/var/www/erdms-dev/logs/debug_order_update.log', date('Y-m-d H:i:s') . " - Starting notification check for order ID $order_id\n", FILE_APPEND);
        
        // Zjistit, jaká událost nastala podle změny workflow stavu
        require_once __DIR__ . '/notificationHandlers.php';
        
        // $existingOrder má stav_workflow_kod jako ARRAY (po transformFromDB)
        // $dbData má stav_workflow_kod jako JSON STRING (po transformToDB)
        // Převedu oba na arraye pro porovnání
        $old_workflow_array = isset($existingOrder['stav_workflow_kod']) && is_array($existingOrder['stav_workflow_kod']) 
            ? $existingOrder['stav_workflow_kod'] 
            : array();
        
        $new_workflow_array = array();
        if (isset($dbData['stav_workflow_kod'])) {
            $decoded = json_decode($dbData['stav_workflow_kod'], true);
            $new_workflow_array = is_array($decoded) ? $decoded : array();
        }
        
        error_log("Order V2 UPDATE: Old workflow: " . json_encode($old_workflow_array));
        error_log("Order V2 UPDATE: New workflow: " . json_encode($new_workflow_array));
        
        // 🔥 DEBUG: Force immediate debug info
        file_put_contents('/var/www/erdms-dev/logs/debug_order_update.log', date('Y-m-d H:i:s') . " - Old workflow: " . json_encode($old_workflow_array) . " | New workflow: " . json_encode($new_workflow_array) . "\n", FILE_APPEND);
        
        // Helper funkce pro detekci workflow stavu v array
        $hasWorkflowState = function($workflow_array, $state_to_find) {
            return is_array($workflow_array) && in_array($state_to_find, $workflow_array);
        };
        
        // ✅ NOTIFIKACE: Nyní se posílají CENTRÁLNĚ přes frontend triggerNotification()
        // Backend už neposílá automatické notifikace při změně workflow stavu.
        // Frontend explicitně volá /notifications/trigger s hierarchií.
        error_log("Order V2 UPDATE: Notification check complete for order ID $order_id (handled by frontend)");
        
        // Sestavení zprávy o úspěšné aktualizaci
        $message_parts = array('Objednávka byla úspěšně aktualizována');
        if ($items_updated) {
            $message_parts[] = "{$items_processed} položek";
        }
        if ($invoices_updated) {
            $message_parts[] = "{$invoices_processed} faktur";
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => implode(' včetně ', $message_parts),
            'data' => $updatedOrder,
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'enriched' => true,
                'updated_id' => $order_id,
                'items_processed' => $items_processed,
                'items_updated' => $items_updated,
                'invoices_processed' => $invoices_processed,
                'invoices_updated' => $invoices_updated,
                'timestamp' => TimezoneHelper::getApiTimestamp()
            )
        ));
        
    } catch (Exception $e) {
        $error_details = array(
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        );
        error_log("=== Order V2 UPDATE ERROR === Order ID: $order_id");
        error_log("Order V2 UPDATE Error [" . basename(__FILE__) . ":" . __LINE__ . "]: " . json_encode($error_details));
        error_log("Order V2 UPDATE Error Message: " . $e->getMessage());
        error_log("Order V2 UPDATE Error File: " . $e->getFile() . " Line: " . $e->getLine());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci objednávky: ' . $e->getMessage()));
    }
}

/**
 * DELETE /api/order-v2/{id}
 * Smazání objednávky (soft delete - aktivni = 0)
 */
function handle_order_v2_delete($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    $hard_delete = isset($input['hard_delete']) && $input['hard_delete'] === true;
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    // 🔒 HARD DELETE - pouze admin
    if ($hard_delete) {
        $isAdmin = isset($auth_result['is_admin']) && $auth_result['is_admin'];
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k trvalému smazání objednávky'));
            return;
        }
    }
    
    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky'));
        return;
    }
    
    try {
        $handler = new OrderV2Handler($config);
        $current_user_id = $auth_result['id'];
        
        // Ověř že objednávka existuje (includeArchived=true aby fungovalo i na neaktivní objednávky)
        $existingOrder = $handler->getOrderById($order_id, $current_user_id, true);
        if (!$existingOrder) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka nebyla nalezena'));
            return;
        }
        
        // Kontrola lock stavu
        if ($existingOrder['lock_info']['locked'] === true) {
            http_response_code(423); // Locked
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Objednávka je zamčená jiným uživatelem',
                'lock_info' => $existingOrder['lock_info']
            ));
            return;
        }
        
        $db = get_db($config);
        TimezoneHelper::setMysqlTimezone($db);
        
        if ($hard_delete) {
            // HARD DELETE - fyzické smazání z databáze (pouze admin)
            // ⚠️ MUSÍ se provádět v pořadí kvůli FK constraints!
            
            $db->beginTransaction();
            try {
                // 1. Odpojit faktury od objednávky (faktury zůstávají, jen se odpojí)
                // Faktury jsou samostatné entity a nesmí se mazat!
                $stmt = $db->prepare("UPDATE " . TBL_FAKTURY . " SET objednavka_id = NULL WHERE objednavka_id = :id");
                $stmt->execute([':id' => $order_id]);
                $detachedInvoices = $stmt->rowCount();
                
                // 2. Načíst přílohy objednávky před smazáním (pro mazání souborů z disku)
                $stmt = $db->prepare("SELECT id, systemova_cesta FROM " . TBL_OBJEDNAVKY_PRILOHY . " WHERE objednavka_id = :id");
                $stmt->execute([':id' => $order_id]);
                $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // 3. Smazat fyzické soubory příloh z disku
                $deletedFiles = 0;
                $failedFiles = 0;
                $missingFiles = 0;
                $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
                $basePath = '';
                if (isset($uploadConfig['root_path']) && !empty($uploadConfig['root_path'])) {
                    $basePath = $uploadConfig['root_path'];
                } else {
                    // Fallback z environment
                    require_once __DIR__ . '/environment-utils.php';
                    $basePath = get_upload_root_path();
                }
                
                foreach ($attachments as $att) {
                    $fullPath = $att['systemova_cesta'];
                    // Pokud není absolutní cesta, doplň base path
                    if (strpos($fullPath, '/') !== 0) {
                        $fullPath = rtrim($basePath, '/') . '/' . ltrim($fullPath, '/');
                    }
                    
                    if (file_exists($fullPath)) {
                        if (@unlink($fullPath)) {
                            $deletedFiles++;
                        } else {
                            $failedFiles++;
                            error_log("HARD DELETE: Nepodařilo se smazat soubor: $fullPath");
                        }
                    } else {
                        // Soubor neexistuje - pouze poznamenat, není to chyba
                        $missingFiles++;
                    }
                }
                
                // 4. Smazat položky objednávky
                $stmt = $db->prepare("DELETE FROM " . TBL_OBJEDNAVKY_POLOZKY . " WHERE objednavka_id = :id");
                $stmt->execute([':id' => $order_id]);
                $deletedItems = $stmt->rowCount();
                
                // 5. Smazat přílohy objednávky z databáze
                $stmt = $db->prepare("DELETE FROM " . TBL_OBJEDNAVKY_PRILOHY . " WHERE objednavka_id = :id");
                $stmt->execute([':id' => $order_id]);
                $deletedAttachments = $stmt->rowCount();
                
                // 6. Nakonec smazat samotnou objednávku
                $stmt = $db->prepare("DELETE FROM " . get_orders_table_name() . " WHERE id = :id");
                $stmt->execute([':id' => $order_id]);
                
                $db->commit();
                
                $response = array(
                    'status' => 'ok',
                    'message' => 'Objednávka byla trvale smazána',
                    'meta' => array(
                        'version' => 'v2',
                        'deleted_id' => $order_id,
                        'hard_delete' => true,
                        'detached_invoices' => $detachedInvoices,
                        'deleted_items' => $deletedItems,
                        'deleted_attachments' => $deletedAttachments,
                        'deleted_files' => $deletedFiles,
                        'missing_files' => $missingFiles,
                        'timestamp' => TimezoneHelper::getApiTimestamp()
                    )
                );
                
                if ($failedFiles > 0) {
                    $response['warning'] = "Některé soubory se nepodařilo smazat z disku ($failedFiles). Pravděpodobně problém s oprávněními.";
                }
                
                echo json_encode($response);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
        } else {
            // SOFT DELETE - nastavíme aktivni = 0
            $sql = "UPDATE " . get_orders_table_name() . " 
                    SET aktivni = 0, dt_aktualizace = :dt_aktualizace 
                    WHERE id = :id";
            
            $stmt = $db->prepare($sql);
            $stmt->bindValue(':dt_aktualizace', TimezoneHelper::getCzechDateTime());
            $stmt->bindValue(':id', $order_id, PDO::PARAM_INT);
            $stmt->execute();
            
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Objednávka byla úspěšně smazána',
                'meta' => array(
                    'version' => 'v2',
                    'deleted_id' => $order_id,
                    'soft_delete' => true,
                    'timestamp' => TimezoneHelper::getApiTimestamp()
                )
            ));
        }
        
    } catch (Exception $e) {
        $error_details = array(
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        );
        error_log("Order V2 DELETE Error [" . basename(__FILE__) . ":" . __LINE__ . "]: " . json_encode($error_details));
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání objednávky: ' . $e->getMessage()));
    }
}

/**
 * POST /api/order-v2/{id}/restore
 * Obnovení smazané objednávky (aktivni = 0 → aktivni = 1)
 * Pouze pro ADMIN
 */
function handle_order_v2_restore($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    // 🔒 ADMIN CHECK - pouze admin může obnovovat
    $isAdmin = isset($auth_result['is_admin']) && $auth_result['is_admin'];
    if (!$isAdmin) {
        http_response_code(403);
        echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k obnovení objednávky'));
        return;
    }
    
    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky'));
        return;
    }
    
    try {
        $db = get_db($config);
        TimezoneHelper::setMysqlTimezone($db);
        
        // Ověř že objednávka existuje a je neaktivní
        $checkSql = "SELECT id, aktivni FROM " . get_orders_table_name() . " WHERE id = :id";
        $checkStmt = $db->prepare($checkSql);
        $checkStmt->bindValue(':id', $order_id, PDO::PARAM_INT);
        $checkStmt->execute();
        $order = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka nebyla nalezena'));
            return;
        }
        
        if ($order['aktivni'] == 1) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka není smazaná (už je aktivní)'));
            return;
        }
        
        // Restore - nastavíme aktivni = 1
        $sql = "UPDATE " . get_orders_table_name() . " 
                SET aktivni = 1, dt_aktualizace = :dt_aktualizace 
                WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':dt_aktualizace', TimezoneHelper::getCzechDateTime());
        $stmt->bindValue(':id', $order_id, PDO::PARAM_INT);
        $stmt->execute();
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Objednávka byla úspěšně obnovena',
            'meta' => array(
                'version' => 'v2',
                'restored_id' => $order_id,
                'timestamp' => TimezoneHelper::getApiTimestamp()
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 RESTORE Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při obnovení objednávky: ' . $e->getMessage()));
    }
} 

/**
 * GET/POST /api/order-v2/{id}/enriched
 * Načtení objednávky podle ID s VŽDY enriched daty (položky, faktury, číselníky)
 */
function handle_order_v2_get_enriched($input, $config, $queries) {
    // Force enriched = 1
    $input['enriched'] = 1;
    
    // Zavolej standardní GET handler s vynuceným enrichment
    handle_order_v2_get($input, $config, $queries);
}

/**
 * GET/POST /api/order-v2/list-enriched  
 * Listing objednávek s VŽDY enriched daty (položky, faktury, číselníky)
 */
function handle_order_v2_list_enriched($input, $config, $queries) {
    // Zvýšíme timeout pro archivované objednávky
    set_time_limit(120); // 2 minuty
    ini_set('memory_limit', '256M');
    
    error_log("@@@ POZDRAV Z API - handle_order_v2_list_enriched ZAVOLANA @@@");
    error_log("@@@ Input data: " . json_encode($input));
    error_log("@@@ Timeout nastaven na 120s, memory na 256M");
    
    // Force enriched = 1 + příznak, že enrichment je POVINNÝ (nesmí se vypnout při limitu 100)
    $input['enriched'] = 1;
    $input['_force_enrichment'] = true; // INTERNAL FLAG - enrichment NESMÍ být zakázán
    
    try {
        error_log("@@@ Zavolam handle_order_v2_list");
        // Zavolej standardní LIST handler s vynuceným enrichment
        handle_order_v2_list($input, $config, $queries);
        error_log("=== handle_order_v2_list_enriched END SUCCESS ===");
    } catch (Exception $e) {
        error_log("=== handle_order_v2_list_enriched FATAL ERROR ===");
        error_log("Error: " . $e->getMessage());
        error_log("File: " . $e->getFile() . " Line: " . $e->getLine());
        error_log("Trace: " . $e->getTraceAsString());
        
        // Vrátím error response
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'FATAL: ' . $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ));
        return;
    }
}

/**
 * POST /api/order-v2/next-number
 * Generování dalšího dostupného evidenčního čísla objednávky
 */
function handle_order_v2_next_number($input, $config, $queries) {
    // Ověření tokenu
    
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    $auth_result = verify_token_v2($username, $token);

    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
   
    try {
        error_log("Order V2 NEXT NUMBER: Starting for user " . $username);
        
        $handler = new OrderV2Handler($config);
        
        // Generování dalšího čísla
        $numberData = $handler->generateNextOrderNumber($username);
        
        error_log("Order V2 NEXT NUMBER: Generated data: " . json_encode($numberData));
    
        if (!$numberData) {
            http_response_code(404);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Uživatel nenalezen nebo nemá přiřazenou organizaci/úsek'
            ));
            return;
        }
        
        // Přidání note pro FE kompatibilitu s Order25
        $numberData['note'] = 'order_number_string = následující volné číslo pro novou objednávku';
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $numberData,
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'timestamp' => TimezoneHelper::getApiTimestamp()
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 NEXT-NUMBER Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
        error_log("Order V2 NEXT-NUMBER Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chyba při získávání dalšího čísla objednávky: ' . $e->getMessage(),
            'debug_info' => array(
                'file' => $e->getFile(),
                'line' => $e->getLine()
            )
        ));
    }
}

/**
 * POST /api/order-v2/check-number
 * Kontrola dostupnosti evidenčního čísla objednávky
 */
function handle_order_v2_check_number($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    // Získání orderNumber - podporujeme různé formáty pro kompatibilitu
    $orderNumber = null;
    if (isset($input['orderNumber'])) {
        $orderNumber = trim($input['orderNumber']);
    } elseif (isset($input['payload']['orderNumber'])) {
        $orderNumber = trim($input['payload']['orderNumber']);
    }
    
    // Suggest flag - zda navrhnout alternativní číslo
    $suggest = false;
    if (isset($input['suggest'])) {
        $suggest = (bool)$input['suggest'];
    } elseif (isset($input['payload']['suggest'])) {
        $suggest = (bool)$input['payload']['suggest'];
    }
    
    if (!$orderNumber) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí orderNumber'));
        return;
    }
    
    try {
        error_log("Order V2 CHECK NUMBER: Starting for orderNumber: " . $orderNumber . ", suggest: " . ($suggest ? 'true' : 'false'));
        
        $handler = new OrderV2Handler($config);
        
        // Kontrola čísla
        $checkResult = $handler->checkOrderNumber($orderNumber, $username, $suggest);
        
        error_log("Order V2 CHECK NUMBER: Result: " . json_encode($checkResult));
        
        if (!$checkResult) {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => 'Chyba při kontrole čísla objednávky'));
            return;
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $checkResult,
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'timestamp' => TimezoneHelper::getApiTimestamp()
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 CHECK-NUMBER Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
        error_log("Order V2 CHECK-NUMBER Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chyba při kontrole čísla objednávky: ' . $e->getMessage(),
            'debug_info' => array(
                'file' => $e->getFile(),
                'line' => $e->getLine()
            )
        ));
    }
}

/**
 * GET /api/order-v2/{id}/dt-aktualizace
 * Načtení pouze dt_aktualizace objednávky podle ID
 * PHP 5.6 + MySQL 5.5.43 compatible
 */
function handle_order_v2_get_dt_aktualizace($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky'));
        return;
    }
    
    try {
        error_log("Order V2 GET DT_AKTUALIZACE: Starting for order ID " . $order_id);
        
        $db = get_db($config);
        
        // SQL query pro načtení pouze dt_aktualizace podle ID
        $sql = "SELECT dt_aktualizace FROM " . get_orders_table_name() . " WHERE id = :id AND aktivni = 1";
        
        error_log("Order V2 GET DT_AKTUALIZACE: SQL: " . $sql);
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':id', $order_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        error_log("Order V2 GET DT_AKTUALIZACE: Result: " . json_encode($result));
        
        if (!$result) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka nebyla nalezena nebo není aktivní'));
            return;
        }
        
        // Standardizovaná response s dt_aktualizace
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'id' => $order_id,
                'dt_aktualizace' => $result['dt_aktualizace']
            ),
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'dt-aktualizace',
                'timestamp' => TimezoneHelper::getApiTimestamp(),
                'compatibility' => 'PHP 5.6 + MySQL 5.5.43'
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 GET DT-AKTUALIZACE Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
        error_log("Order V2 GET DT-AKTUALIZACE Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chyba při načítání dt_aktualizace: ' . $e->getMessage(),
            'debug_info' => array(
                'file' => $e->getFile(),
                'line' => $e->getLine()
            )
        ));
    }
}

// ========== ORDER V2 ITEMS MANAGEMENT FUNCTIONS ==========

/**
 * Vloží položky objednávky pro Order V2 (TBL_OBJEDNAVKY_POLOZKY (25a_objednavky_polozky))
 * Batch insert pro lepší výkon - PHP 5.6 kompatibilní
 * @param PDO $db - Databázové spojení
 * @param int $order_id - ID objednávky
 * @param array $items - Pole položek k vložení
 * @return bool - True při úspěchu
 */
function insertOrderV2Items($db, $order_id, $items) {
    if (empty($items)) {
        return true; // Žádné položky k vložení
    }
    
    try {
        // Batch insert pro lepší výkon
        $itemsCount = count($items);
        $sql = insertOrderItemsBatchQuery($itemsCount);
        $stmt = $db->prepare($sql);
        
        $params = array(':objednavka_id' => $order_id);
        
        foreach ($items as $index => $item) {
            $params[":popis_{$index}"] = $item['popis'];
            $params[":cena_bez_dph_{$index}"] = $item['cena_bez_dph'];
            $params[":sazba_dph_{$index}"] = $item['sazba_dph'];
            $params[":cena_s_dph_{$index}"] = $item['cena_s_dph'];
            // Lokalizační data - 3 kódy + poznamka
            $params[":usek_kod_{$index}"] = isset($item['usek_kod']) ? $item['usek_kod'] : null;
            $params[":budova_kod_{$index}"] = isset($item['budova_kod']) ? $item['budova_kod'] : null;
            $params[":mistnost_kod_{$index}"] = isset($item['mistnost_kod']) ? $item['mistnost_kod'] : null;
            $params[":poznamka_{$index}"] = isset($item['poznamka']) ? $item['poznamka'] : null;
            // LP kód na úrovni položky
            $params[":lp_id_{$index}"] = isset($item['lp_id']) && $item['lp_id'] > 0 ? (int)$item['lp_id'] : null;
        }
        
        $stmt->execute($params);
        return true;
        
    } catch (Exception $e) {
        error_log("Order V2 insertOrderV2Items Error: " . $e->getMessage());
        return false;
    }
}

/**
 * Uloží položky objednávky Order V2 (smaže staré, vloží nové)
 * Implementuje "saveOrderItems" pattern pro 25a_objednavky_polozky
 * @param PDO $db - Databázové spojení
 * @param int $order_id - ID objednávky
 * @param array $items - Pole položek k uložení
 * @return bool - True při úspěchu
 */
function saveOrderV2Items($db, $order_id, $items) {
    try {
        // Nejprve smažeme všechny stávající položky
        $deleteStmt = $db->prepare(deleteOrderItemsByOrderIdQuery());
        $deleteStmt->bindParam(':objednavka_id', $order_id, PDO::PARAM_INT);
        $deleteStmt->execute();
        
        // Pak vložíme nové položky
        return insertOrderV2Items($db, $order_id, $items);
        
    } catch (Exception $e) {
        error_log("Order V2 saveOrderV2Items Error: " . $e->getMessage());
        return false;
    }
}

/**
 * Aktualizuje položky objednávky Order V2 (smaže staré, vloží nové)
 * Alias pro saveOrderV2Items() - zachovává konzistenci s Order25 API
 * @param PDO $db - Databázové spojení
 * @param int $order_id - ID objednávky
 * @param array $items - Pole nových položek
 * @return bool - True při úspěchu
 */
function updateOrderV2Items($db, $order_id, $items) {
    return saveOrderV2Items($db, $order_id, $items);
}

/**
 * Enrich objednávky o seznam povolených LP pro položky (lp_options)
 * Přidá pole 'lp_options' s LP kódy, které může uživatel vybrat pro položky.
 * Filtruje podle objednavka_data.lp_kody (pokud existují).
 * 
 * @param PDO $db - Database connection
 * @param array &$order - Reference na objednávku (modifikuje se)
 */
function enrichOrderWithLPOptions($db, &$order) {
    try {
        $lp_options = array();
        
        // Získat LP kódy z financování objednávky
        if (isset($order['financovani']) && isset($order['financovani']['lp_kody']) && is_array($order['financovani']['lp_kody'])) {
            $lp_options = $order['financovani']['lp_kody'];
        }
        
        // Přidat do objednávky
        $order['lp_options'] = $lp_options;
        
    } catch (Exception $e) {
        error_log("enrichOrderWithLPOptions Error: " . $e->getMessage());
        $order['lp_options'] = array();
    }
}

?>


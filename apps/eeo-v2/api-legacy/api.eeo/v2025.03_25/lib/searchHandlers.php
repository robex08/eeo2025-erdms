<?php
/**
 * Universal Search - Main Handler
 * PHP 5.6 + MySQL 5.5.43 compatible
 * 
 * Hlavní orchestrace univerzálního vyhledávání
 * Volá jednotlivé search funkce a agreguje výsledky
 */

require_once __DIR__ . '/searchHelpers.php';
require_once __DIR__ . '/searchQueries.php';

/**
 * Hlavní entry point pro univerzální vyhledávání
 * Validuje vstup, volá search pro každou kategorii, agreguje výsledky
 * 
 * @param array $input POST data z requestu
 * @param array $config DB konfigurace
 * @return void Echoes JSON response
 */
function handle_universal_search($input, $config) {
    $startTime = microtime(true);
    
    try {
        // Validace vstupu
        $validation = validateSearchInput($input);
        if (!$validation['valid']) {
            echo json_encode(array(
                'status' => 'error',
                'error_code' => 'VALIDATION_ERROR',
                'message' => 'Invalid input parameters',
                'errors' => $validation['errors']
            ));
            return;
        }
        
        // Validace tokenu - stejný pattern jako Order V2
        $username = isset($input['username']) ? $input['username'] : '';
        $token = isset($input['token']) ? $input['token'] : '';
        
        $auth_result = verify_token_v2($username, $token);
        if (!$auth_result) {
            echo json_encode(array(
                'status' => 'error',
                'error_code' => 'AUTH_ERROR',
                'message' => 'Neplatný nebo chybějící token'
            ));
            return;
        }
        
        // Připravíme parametry
        $query = trim($input['query']);
        $limit = isset($input['limit']) ? intval($input['limit']) : 50;
        $includeInactive = isset($input['include_inactive']) ? normalizeBool($input['include_inactive']) : false;
        $includeArchived = isset($input['archivovano']) ? normalizeBool($input['archivovano']) : false;
        $categories = isset($input['categories']) ? $input['categories'] : getDefaultSearchCategories();
        
        // NOVÝ PARAMETR: search_all = ignoruj permissions, vrať všechno
        // FE může poslat search_all=true aby prohledal všechno bez omezení na aktuálního uživatele
        $searchAll = isset($input['search_all']) ? normalizeBool($input['search_all']) : false;
        
        // NOVÝ PARAMETR: filter_obj_form = pouze smlouvy pro obj. formulář (pouzit_v_obj_formu=1)
        // FALSE/NULL = všechny smlouvy (modul smluv, faktury)
        // TRUE = pouze smlouvy pro obj. formulář
        $filterObjForm = isset($input['filter_obj_form']) ? normalizeBool($input['filter_obj_form']) : false;
        
        // Admin check - používá is_admin z verify_token_v2 (kontroluje SUPERADMIN nebo ADMINISTRATOR role)
        $isAdmin = isset($auth_result['is_admin']) && $auth_result['is_admin'];
        
        // Pokud je search_all=true, chovej se jako admin (všechny výsledky)
        if ($searchAll) {
            $isAdmin = true;
        }
        
        // DEBUG logging - DETAILNÍ INFO
        error_log("🔍 UniversalSearch DEBUG:");
        error_log("  - Query: '$query'");
        error_log("  - User ID: " . $auth_result['id']);
        error_log("  - is_admin from token: " . (isset($auth_result['is_admin']) ? ($auth_result['is_admin'] ? 'TRUE' : 'FALSE') : 'NOT SET'));
        error_log("  - Final isAdmin: " . ($isAdmin ? 'TRUE' : 'FALSE'));
        error_log("  - search_all: " . ($searchAll ? 'TRUE' : 'FALSE'));
        
        // Escapujeme query pro LIKE
        $escapedQuery = escapeLikeWildcards($query);
        $likeQuery = '%' . $escapedQuery . '%';
        
        // Normalizovaný query BEZ diakritiky (pro vyhledávání "Novak" → najde "Nováк")
        $normalizedQuery = '%' . escapeLikeWildcards(removeDiacritics($query)) . '%';
        
        // Připojení k DB
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Database connection failed');
        }
        
        // Vyhledávání v jednotlivých kategoriích
        $results = array();
        
        if (in_array('users', $categories)) {
            $results['users'] = array(
                'category_label' => getCategoryLabel('users'),
                'total' => 0,
                'results' => searchUsers($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $isAdmin)
            );
            $results['users']['total'] = count($results['users']['results']);
        }
        
        if (in_array('orders_2025', $categories)) {
            $results['orders_2025'] = array(
                'category_label' => getCategoryLabel('orders_2025'),
                'total' => 0,
                'results' => searchOrders2025($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $includeArchived, $isAdmin, $auth_result['id'])
            );
            $results['orders_2025']['total'] = count($results['orders_2025']['results']);
        }
        
        // orders_legacy - DEPRECATED, NEPOUŽÍVÁ SE
        
        if (in_array('contracts', $categories)) {
            $results['contracts'] = array(
                'category_label' => getCategoryLabel('contracts'),
                'total' => 0,
                'results' => searchContracts($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $isAdmin, $filterObjForm)
            );
            $results['contracts']['total'] = count($results['contracts']['results']);
        }
        
        if (in_array('invoices', $categories)) {
            $results['invoices'] = array(
                'category_label' => getCategoryLabel('invoices'),
                'total' => 0,
                'results' => searchInvoices($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $isAdmin, $auth_result['id'])
            );
            $results['invoices']['total'] = count($results['invoices']['results']);
        }
        
        if (in_array('suppliers', $categories)) {
            $results['suppliers'] = array(
                'category_label' => getCategoryLabel('suppliers'),
                'total' => 0,
                'results' => searchSuppliers($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $isAdmin)
            );
            $results['suppliers']['total'] = count($results['suppliers']['results']);
        }
        
        if (in_array('suppliers_from_orders', $categories)) {
            $results['suppliers_from_orders'] = array(
                'category_label' => getCategoryLabel('suppliers_from_orders'),
                'total' => 0,
                'results' => searchSuppliersFromOrders($db, $likeQuery, $normalizedQuery, $limit, $includeArchived)
            );
            $results['suppliers_from_orders']['total'] = count($results['suppliers_from_orders']['results']);
        }
        
        // Spočítáme celkový počet výsledků
        $totalResults = 0;
        foreach ($results as $category) {
            $totalResults += $category['total'];
        }
        
        // Log do audit (volitelně, později)
        // logSearchToAudit($db, $user['id'], $query, $totalResults, $categories);
        
        // Sestavíme response
        $response = array(
            'status' => 'ok',
            'search_query' => $query,
            'search_duration_ms' => getElapsedTimeMs($startTime),
            'total_results' => $totalResults,
            'categories' => $results,
            'meta' => array(
                'searched_categories' => $categories,
                'limit_per_category' => $limit,
                'include_inactive' => $includeInactive,
                'archivovano' => $includeArchived,
                'search_all' => $searchAll
            )
        );
        
        echo json_encode($response);
        
    } catch (Exception $e) {
        logSearchError($e->getMessage(), array(
            'query' => isset($query) ? $query : 'N/A',
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ));
        
        echo json_encode(array(
            'status' => 'error',
            'error_code' => 'SEARCH_ERROR',
            'message' => 'Search failed: ' . $e->getMessage()
        ));
    }
}

/**
 * Vyhledá uživatele
 * 
 * @param PDO $db Database connection
 * @param string $likeQuery Escapovaný query s % wildcardy
 * @param int $limit Max počet výsledků
 * @param bool $includeInactive Zahrnout neaktivní
 * @return array Pole výsledků
 */
function searchUsers($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $isAdmin) {
    try {
        $sql = getSqlSearchUsers();
        $stmt = $db->prepare($sql);
        
        // Bind named parametrů (stejně jako ostatní kategorie)
        $stmt->bindValue(':query', $likeQuery, PDO::PARAM_STR);
        $stmt->bindValue(':query_normalized', $normalizedQuery, PDO::PARAM_STR);
        $stmt->bindValue(':include_inactive', $includeInactive ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':is_admin', $isAdmin ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Přidáme highlight ke každému výsledku
        foreach ($results as &$row) {
            // Vytvoříme highlight hodnotu podle match_type
            $highlightValue = '';
            if ($row['match_type'] == 'telefon') {
                $highlightValue = $row['telefon'];
            } else if ($row['match_type'] == 'email') {
                $highlightValue = $row['email'];
            } else if ($row['match_type'] == 'jmeno') {
                $highlightValue = $row['jmeno'] . ' ' . $row['prijmeni'];
            } else if ($row['match_type'] == 'username') {
                $highlightValue = $row['username'];
            } else if ($row['match_type'] == 'titul') {
                $highlightValue = trim($row['titul_pred'] . ' ' . $row['titul_za']);
            }
            
            $row['highlight'] = createHighlight($row['match_type'], $highlightValue);
        }
        
        return $results;
        
    } catch (Exception $e) {
        logSearchError('searchUsers failed: ' . $e->getMessage());
        return array();
    }
}

/**
 * Vyhledá objednávky 2025
 * 
 * @param PDO $db Database connection
 * @param string $likeQuery Escapovaný query s % wildcardy
 * @param int $limit Max počet výsledků
 * @param bool $includeInactive Zahrnout neaktivní
 * @return array Pole výsledků
 */
function searchOrders2025($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $includeArchived, $isAdmin, $current_user_id) {
    try {
        $sql = getSqlSearchOrders2025();
        $stmt = $db->prepare($sql);
        
        // DEBUG logging
        error_log("searchOrders2025: isAdmin=" . ($isAdmin ? '1' : '0') . 
                  ", user_id=" . $current_user_id . 
                  ", query=" . substr($likeQuery, 1, -1));
        
        $stmt->bindValue(':query', $likeQuery, PDO::PARAM_STR);
        $stmt->bindValue(':query_normalized', $normalizedQuery, PDO::PARAM_STR);
        $stmt->bindValue(':include_inactive', $includeInactive ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':archivovano', $includeArchived ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':is_admin', $isAdmin ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':current_user_id', $current_user_id, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("searchOrders2025: found " . count($results) . " results");
        
        // Přidáme highlight a seznam příloh
        foreach ($results as &$row) {
            $highlightValue = isset($row[$row['match_type']]) ? $row[$row['match_type']] : '';
            $row['highlight'] = createHighlight($row['match_type'], $highlightValue);
            
            // Načteme přílohy objednávky (objednávkové + fakturní)
            $row['prilohy'] = getOrderAttachments($db, $row['id']);
        }
        
        return $results;
        
    } catch (Exception $e) {
        logSearchError('searchOrders2025 failed: ' . $e->getMessage());
        return array();
    }
}

// searchOrdersLegacy() - DEPRECATED, NEPOUŽÍVÁ SE

/**
 * Vyhledá smlouvy
 * 
 * @param PDO $db Database connection
 * @param string $likeQuery Escapovaný query s % wildcardy
 * @param int $limit Max počet výsledků
 * @param bool $includeInactive Zahrnout neaktivní
 * @param bool $isAdmin Je admin
 * @param bool $filterObjForm TRUE = pouze smlouvy pro obj. formulář (pouzit_v_obj_formu=1)
 * @return array Pole výsledků
 */
function searchContracts($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $isAdmin, $filterObjForm = false) {
    try {
        $sql = getSqlSearchContracts($filterObjForm);
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':query', $likeQuery, PDO::PARAM_STR);
        $stmt->bindValue(':query_normalized', $normalizedQuery, PDO::PARAM_STR);
        $stmt->bindValue(':include_inactive', $includeInactive ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':is_admin', $isAdmin ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        
        // Bind filter_obj_form pouze pokud je aktivní
        if ($filterObjForm) {
            $stmt->bindValue(':filter_obj_form', 1, PDO::PARAM_INT);
        }
        
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Přidáme highlight
        foreach ($results as &$row) {
            $highlightValue = isset($row[$row['match_type']]) ? $row[$row['match_type']] : '';
            $row['highlight'] = createHighlight($row['match_type'], $highlightValue);
        }
        
        return $results;
        
    } catch (Exception $e) {
        logSearchError('searchContracts failed: ' . $e->getMessage());
        return array();
    }
}

/**
 * Vyhledá faktury
 * 
 * @param PDO $db Database connection
 * @param string $likeQuery Escapovaný query s % wildcardy
 * @param int $limit Max počet výsledků
 * @param bool $includeInactive Zahrnout neaktivní
 * @param int $userId ID uživatele pro permission filtering
 * @return array Pole výsledků
 */
function searchInvoices($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $isAdmin, $userId) {
    try {
        // DEBUG: Log parameters
        error_log("📋 searchInvoices called:");
        error_log("  - likeQuery: '$likeQuery'");
        error_log("  - isAdmin: " . ($isAdmin ? 'TRUE (1)' : 'FALSE (0)'));
        error_log("  - userId: $userId");
        error_log("  - limit: $limit");
        
        $sql = getSqlSearchInvoices();
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':query', $likeQuery, PDO::PARAM_STR);
        $stmt->bindValue(':query_normalized', $normalizedQuery, PDO::PARAM_STR);
        $stmt->bindValue(':include_inactive', $includeInactive ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':is_admin', $isAdmin ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // DEBUG: Log result count
        error_log("  ✅ Found " . count($results) . " invoices");
        
        // Přidáme highlight
        foreach ($results as &$row) {
            $highlightValue = isset($row[$row['match_type']]) ? $row[$row['match_type']] : '';
            $row['highlight'] = createHighlight($row['match_type'], $highlightValue);
        }
        
        return $results;
        
    } catch (Exception $e) {
        error_log("❌ searchInvoices ERROR: " . $e->getMessage());
        error_log("   SQL Error: " . print_r($stmt->errorInfo(), true));
        logSearchError('searchInvoices failed: ' . $e->getMessage());
        return array();
    }
}

/**
 * Vyhledá dodavatele
 * 
 * @param PDO $db Database connection
 * @param string $likeQuery Escapovaný query s % wildcardy
 * @param int $limit Max počet výsledků
 * @param bool $includeInactive Ignorováno (dodavatelé nemají aktivni flag)
 * @return array Pole výsledků
 */
function searchSuppliers($db, $likeQuery, $normalizedQuery, $limit, $includeInactive, $isAdmin) {
    try {
        $sql = getSqlSearchSuppliers();
        $stmt = $db->prepare($sql);
        
        $stmt->bindValue(':query', $likeQuery, PDO::PARAM_STR);
        $stmt->bindValue(':query_normalized', $normalizedQuery, PDO::PARAM_STR);
        $stmt->bindValue(':is_admin', $isAdmin ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Přidáme highlight
        foreach ($results as &$row) {
            $highlightValue = isset($row[$row['match_type']]) ? $row[$row['match_type']] : '';
            $row['highlight'] = createHighlight($row['match_type'], $highlightValue);
        }
        
        return $results;
        
    } catch (Exception $e) {
        logSearchError('searchSuppliers failed: ' . $e->getMessage());
        return array();
    }
}

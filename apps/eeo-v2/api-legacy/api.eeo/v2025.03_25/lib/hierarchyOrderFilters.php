<?php
/**
 * Hierarchy Order Filters - Hierarchie workflow pro filtraci objednávek
 * 
 * Implementace hierarchického řízení viditelnosti objednávek podle
 * organizačního řádu (hierarchy_profiles a hierarchy_relationships).
 * 
 * Klíčové principy:
 * 1. Hierarchie má PRIORITU nad standardními právy a rolemi
 * 2. Může rozšířit i omezit viditelnost dat
 * 3. Pokud vypnuta → žádný vliv
 * 4. HIERARCHY_IMMUNE právo → bypass hierarchie
 * 
 * @author GitHub Copilot & robex08
 * @date 13. prosince 2025
 * @version 1.0
 */

require_once __DIR__ . '/dbconfig.php';

/**
 * Zkontroluje, zda je hierarchie workflow aktivní
 * 
 * @param mysqli $db Database connection
 * @return array ['enabled' => bool, 'profile_id' => int|null, 'logic' => string]
 */
function getHierarchySettings($db) {
    $query = "
        SELECT 
            hierarchy_enabled,
            hierarchy_profile_id,
            hierarchy_logic
        FROM global_settings
        LIMIT 1
    ";
    
    $result = $db->query($query);
    if (!$result || $result->num_rows === 0) {
        return [
            'enabled' => false,
            'profile_id' => null,
            'logic' => 'OR'
        ];
    }
    
    $row = $result->fetch_assoc();
    return [
        'enabled' => (bool)$row['hierarchy_enabled'],
        'profile_id' => $row['hierarchy_profile_id'] ? (int)$row['hierarchy_profile_id'] : null,
        'logic' => $row['hierarchy_logic'] ?? 'OR'
    ];
}

/**
 * Zkontroluje, zda má uživatel právo HIERARCHY_IMMUNE
 * (= hierarchie se na něj nevztahuje)
 * 
 * @param int $userId User ID
 * @param mysqli $db Database connection
 * @return bool
 */
function isUserHierarchyImmune($userId, $db) {
    // 1. Check přímých práv uživatele
    $query = "
        SELECT COUNT(*) as cnt
        FROM 25_uzivatele_prava up
        INNER JOIN 25_prava p ON p.id = up.pravo_id
        WHERE up.uzivatel_id = ?
          AND p.kod_prava = 'HIERARCHY_IMMUNE'
          AND p.aktivni = 1
    ";
    
    $stmt = $db->prepare($query);
    if (!$stmt) {
        error_log("HIERARCHY ERROR: Failed to prepare immune check query: " . $db->error);
        return false;
    }
    
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    if ($row['cnt'] > 0) {
        return true;
    }
    
    // 2. Check práv přes role uživatele
    $queryRoles = "
        SELECT COUNT(*) as cnt
        FROM 25_uzivatele_role ur
        INNER JOIN 25_role_prava rp ON rp.role_id = ur.role_id
        INNER JOIN 25_prava p ON p.id = rp.pravo_id
        WHERE ur.uzivatel_id = ?
          AND p.kod_prava = 'HIERARCHY_IMMUNE'
          AND p.aktivni = 1
    ";
    
    $stmt2 = $db->prepare($queryRoles);
    if (!$stmt2) {
        error_log("HIERARCHY ERROR: Failed to prepare role immune check query: " . $db->error);
        return false;
    }
    
    $stmt2->bind_param('i', $userId);
    $stmt2->execute();
    $result2 = $stmt2->get_result();
    $row2 = $result2->fetch_assoc();
    
    return $row2['cnt'] > 0;
}

/**
 * Získá všechny ID objednávek viditelné pro uživatele podle hierarchie
 * 
 * Logika:
 * - OR: Uživatel vidí objednávku, pokud má vztah v JAKÉKOLIV úrovni hierarchie
 * - AND: Uživatel vidí objednávku pouze pokud splňuje VŠECHNY požadované úrovně
 * 
 * @param int $userId User ID
 * @param int $profileId Hierarchy profile ID
 * @param string $logic 'OR' nebo 'AND'
 * @param mysqli $db Database connection
 * @return array|null Array of order IDs nebo NULL (= žádná filtrace)
 */
function getVisibleOrderIdsForUser($userId, $profileId, $logic, $db) {
    // Načti všechny hierarchické vztahy uživatele z daného profilu
    $query = "
        SELECT 
            hr.level_type,
            hr.parent_id,
            hr.child_id
        FROM hierarchy_relationships hr
        WHERE hr.profile_id = ?
          AND hr.is_active = 1
          AND (hr.parent_id = ? OR hr.child_id = ?)
    ";
    
    $stmt = $db->prepare($query);
    if (!$stmt) {
        error_log("HIERARCHY ERROR: Failed to prepare relationships query: " . $db->error);
        return null;
    }
    
    $stmt->bind_param('iii', $profileId, $userId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $relationships = [];
    while ($row = $result->fetch_assoc()) {
        $relationships[] = $row;
    }
    
    if (empty($relationships)) {
        // Uživatel nemá žádné hierarchické vztahy → nevidí nic (prázdný array)
        error_log("HIERARCHY: User $userId has no relationships in profile $profileId - returning empty array");
        return [];
    }
    
    // Extrahuj relevantní entity z hierarchie
    // (userId může být parent i child v různých vztazích)
    $visibleUserIds = [$userId]; // Uživatel vidí vždy sebe
    $visibleUskyIds = [];
    $visibleLokality = [];
    $visibleOrganizace = [];
    
    foreach ($relationships as $rel) {
        $levelType = $rel['level_type'];
        $parentId = (int)$rel['parent_id'];
        $childId = (int)$rel['child_id'];
        
        // Pokud je userId parent → vidí child
        // Pokud je userId child → vidí parent
        $relatedId = ($parentId === $userId) ? $childId : $parentId;
        
        // Podle level_type přiřaď do správné kategorie
        // POZOR: Musíme mapovat level_type na konkrétní databázové sloupce
        switch ($levelType) {
            case 'user':
            case 'uzivatel':
                $visibleUserIds[] = $relatedId;
                break;
                
            case 'usek':
            case 'department':
                $visibleUskyIds[] = $relatedId;
                break;
                
            case 'lokalita':
            case 'location':
                $visibleLokality[] = $relatedId;
                break;
                
            case 'organizace':
            case 'organization':
                $visibleOrganizace[] = $relatedId;
                break;
                
            default:
                error_log("HIERARCHY WARNING: Unknown level_type '$levelType' for user $userId");
                break;
        }
    }
    
    // Deduplikace
    $visibleUserIds = array_unique($visibleUserIds);
    $visibleUskyIds = array_unique($visibleUskyIds);
    $visibleLokality = array_unique($visibleLokality);
    $visibleOrganizace = array_unique($visibleOrganizace);
    
    error_log("HIERARCHY: User $userId visible entities - Users: " . count($visibleUserIds) . 
              ", Useky: " . count($visibleUskyIds) . 
              ", Lokality: " . count($visibleLokality) . 
              ", Organizace: " . count($visibleOrganizace));
    
    // Nyní sestavíme WHERE podmínku pro filtraci objednávek
    // Objednávky mají sloupce: uzivatel_id, usek_id, lokalita_id, organizace_id
    
    if ($logic === 'AND') {
        // AND logika: Musí splňovat VŠECHNY úrovně současně
        // (restriktivnější - v praxi málokdy použitelné)
        error_log("HIERARCHY: Using AND logic (restrictive)");
        
        // Pro AND logiku potřebujeme, aby objednávka měla hodnoty ve VŠECH kategoriích
        // které jsou v hierarchii definovány
        // To je velmi komplexní - pro zjednodušení použijeme průnik
        
        // Pro tento případ vrátíme pouze objednávky, které odpovídají VŠEM kritériím
        $conditions = [];
        
        if (!empty($visibleUserIds)) {
            $userIdsList = implode(',', $visibleUserIds);
            $conditions[] = "o.uzivatel_id IN ($userIdsList)";
        }
        
        if (!empty($visibleUskyIds)) {
            $uskyIdsList = implode(',', $visibleUskyIds);
            $conditions[] = "o.usek_id IN ($uskyIdsList)";
        }
        
        if (!empty($visibleLokality)) {
            $lokalityList = implode(',', $visibleLokality);
            $conditions[] = "o.lokalita_id IN ($lokalityList)";
        }
        
        if (!empty($visibleOrganizace)) {
            $orgList = implode(',', $visibleOrganizace);
            $conditions[] = "o.organizace_id IN ($orgList)";
        }
        
        if (empty($conditions)) {
            return [];
        }
        
        $whereClause = implode(' AND ', $conditions);
        
    } else {
        // OR logika: Stačí splňovat ALESPOŇ JEDNU úroveň (liberálnější)
        error_log("HIERARCHY: Using OR logic (liberal)");
        
        $conditions = [];
        
        if (!empty($visibleUserIds)) {
            $userIdsList = implode(',', $visibleUserIds);
            $conditions[] = "o.uzivatel_id IN ($userIdsList)";
        }
        
        if (!empty($visibleUskyIds)) {
            $uskyIdsList = implode(',', $visibleUskyIds);
            $conditions[] = "o.usek_id IN ($uskyIdsList)";
        }
        
        if (!empty($visibleLokality)) {
            $lokalityList = implode(',', $visibleLokality);
            $conditions[] = "o.lokalita_id IN ($lokalityList)";
        }
        
        if (!empty($visibleOrganizace)) {
            $orgList = implode(',', $visibleOrganizace);
            $conditions[] = "o.organizace_id IN ($orgList)";
        }
        
        if (empty($conditions)) {
            return [];
        }
        
        $whereClause = '(' . implode(' OR ', $conditions) . ')';
    }
    
    // Spusť query pro získání ID objednávek
    $orderQuery = "
        SELECT o.id
        FROM 25a_objednavky o
        WHERE o.aktivni = 1
          AND $whereClause
    ";
    
    $orderResult = $db->query($orderQuery);
    if (!$orderResult) {
        error_log("HIERARCHY ERROR: Failed to fetch order IDs: " . $db->error);
        return null;
    }
    
    $visibleOrderIds = [];
    while ($row = $orderResult->fetch_assoc()) {
        $visibleOrderIds[] = (int)$row['id'];
    }
    
    error_log("HIERARCHY: User $userId can see " . count($visibleOrderIds) . " orders via hierarchy");
    
    return $visibleOrderIds;
}

/**
 * Aplikuje hierarchickou filtraci na WHERE podmínky
 * 
 * Použití v orderV2Endpoints.php:
 * 
 * $hierarchyFilter = applyHierarchyFilterToOrders($current_user_id, $db);
 * if ($hierarchyFilter !== null) {
 *     $whereConditions[] = $hierarchyFilter;
 * }
 * 
 * @param int $userId User ID
 * @param mysqli $db Database connection
 * @return string|null WHERE clause nebo NULL (= žádná filtrace)
 */
function applyHierarchyFilterToOrders($userId, $db) {
    // 1. Načti nastavení hierarchie
    $settings = getHierarchySettings($db);
    
    if (!$settings['enabled'] || !$settings['profile_id']) {
        // Hierarchie vypnuta nebo není vybrán profil
        error_log("HIERARCHY: Disabled or no profile selected - no filtering");
        return null;
    }
    
    // 2. Zkontroluj, zda má uživatel HIERARCHY_IMMUNE
    if (isUserHierarchyImmune($userId, $db)) {
        error_log("HIERARCHY: User $userId is IMMUNE - no filtering");
        return null;
    }
    
    // 3. Získej viditelné order IDs podle hierarchie
    $visibleOrderIds = getVisibleOrderIdsForUser(
        $userId,
        $settings['profile_id'],
        $settings['logic'],
        $db
    );
    
    if ($visibleOrderIds === null) {
        // Chyba při načítání - raději nefiltrovat
        error_log("HIERARCHY ERROR: Failed to get visible order IDs - no filtering applied");
        return null;
    }
    
    if (empty($visibleOrderIds)) {
        // Uživatel nemá viditelné žádné objednávky přes hierarchii
        // Vrátit podmínku, která nic nenajde
        error_log("HIERARCHY: User $userId has NO visible orders via hierarchy - returning FALSE condition");
        return "1 = 0"; // Podmínka, která nikdy není pravdivá
    }
    
    // 4. Vytvoř WHERE clause
    $orderIdsList = implode(',', $visibleOrderIds);
    $whereClause = "o.id IN ($orderIdsList)";
    
    error_log("HIERARCHY: Applied filter for user $userId - " . count($visibleOrderIds) . " orders visible");
    
    return $whereClause;
}

/**
 * Zkontroluje, zda uživatel může vidět konkrétní objednávku
 * (pro použití v detail view)
 * 
 * @param int $userId User ID
 * @param int $orderId Order ID
 * @param mysqli $db Database connection
 * @return bool
 */
function canUserViewOrder($userId, $orderId, $db) {
    // 1. Načti nastavení hierarchie
    $settings = getHierarchySettings($db);
    
    if (!$settings['enabled'] || !$settings['profile_id']) {
        // Hierarchie vypnuta → může vidět (rozhodnou standardní práva)
        return true;
    }
    
    // 2. Zkontroluj HIERARCHY_IMMUNE
    if (isUserHierarchyImmune($userId, $db)) {
        return true;
    }
    
    // 3. Získej viditelné order IDs
    $visibleOrderIds = getVisibleOrderIdsForUser(
        $userId,
        $settings['profile_id'],
        $settings['logic'],
        $db
    );
    
    if ($visibleOrderIds === null) {
        // Chyba → raději povolit (lepší než zakázat)
        return true;
    }
    
    // 4. Zkontroluj, zda orderId je v seznamu
    return in_array($orderId, $visibleOrderIds);
}

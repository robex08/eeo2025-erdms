<?php
/**
 * Hierarchy Order Filters - Hierarchie workflow pro filtraci objednávek
 * 
 * Implementace hierarchického řízení viditelnosti objednávek podle
 * organizačního řádu (25_hierarchie_profily a 25_hierarchie_vztahy).
 * 
 * Klíčové principy:
 * 1. Hierarchie má PRIORITU nad standardními právy a rolemi
 * 2. Může rozšířit i omezit viditelnost dat
 * 3. Pokud vypnuta → žádný vliv
 * 4. HIERARCHY_IMMUNE právo → bypass hierarchie
 * 
 * @author GitHub Copilot & robex08
 * @date 13. prosince 2025
 * @version 2.0 - Opraveno dle skutečné DB struktury
 */

require_once __DIR__ . '/dbconfig.php';

/**
 * Zkontroluje, zda je hierarchie workflow aktivní
 * 
 * @param mysqli $db Database connection
 * @return array ['enabled' => bool, 'profile_id' => int|null, 'logic' => string]
 */
function getHierarchySettings($db) {
    // Načítání jednotlivých nastavení z key-value tabulky
    $query = "
        SELECT klic, hodnota
        FROM 25a_nastaveni_globalni
        WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id', 'hierarchy_logic')
    ";
    
    $result = $db->query($query);
    if (!$result) {
        error_log("HIERARCHY ERROR: Failed to load settings: " . $db->error);
        return [
            'enabled' => false,
            'profile_id' => null,
            'logic' => 'OR'
        ];
    }
    
    $settings = [
        'enabled' => false,
        'profile_id' => null,
        'logic' => 'OR'
    ];
    
    while ($row = $result->fetch_assoc()) {
        switch ($row['klic']) {
            case 'hierarchy_enabled':
                $settings['enabled'] = (int)$row['hodnota'] === 1;
                break;
            case 'hierarchy_profile_id':
                $settings['profile_id'] = ($row['hodnota'] && $row['hodnota'] !== 'NULL') 
                    ? (int)$row['hodnota'] 
                    : null;
                break;
            case 'hierarchy_logic':
                $settings['logic'] = $row['hodnota'] ?? 'OR';
                break;
        }
    }
    
    return $settings;
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
    // Check práv přes role uživatele (HIERARCHY_IMMUNE je přiřazeno k rolím SUPERADMIN/ADMINISTRATOR)
    $queryRoles = "
        SELECT COUNT(*) as cnt
        FROM 25_uzivatele_role ur
        INNER JOIN 25_role_prava rp ON rp.role_id = ur.role_id
        INNER JOIN 25_prava p ON p.id = rp.pravo_id
        WHERE ur.uzivatel_id = ?
          AND p.kod_prava = 'HIERARCHY_IMMUNE'
          AND p.aktivni = 1
    ";
    
    $stmt = $db->prepare($queryRoles);
    if (!$stmt) {
        error_log("HIERARCHY ERROR: Failed to prepare role immune check query: " . $db->error);
        return false;
    }
    
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    return $row['cnt'] > 0;
}

/**
 * Aplikuje hierarchii na filtraci objednávek
 * Vrací WHERE podmínku nebo NULL (= žádná filtrace)
 * 
 * @param int $userId User ID
 * @param mysqli $db Database connection
 * @return string|null SQL WHERE podmínka nebo NULL
 */
function applyHierarchyFilterToOrders($userId, $db) {
    // 1. Načti nastavení hierarchie
    $settings = getHierarchySettings($db);
    
    if (!$settings['enabled']) {
        error_log("HIERARCHY: Disabled globally - no filter");
        return null;
    }
    
    if (!$settings['profile_id']) {
        error_log("HIERARCHY: No profile selected - no filter");
        return null;
    }
    
    // 2. Check HIERARCHY_IMMUNE
    if (isUserHierarchyImmune($userId, $db)) {
        error_log("HIERARCHY: User $userId is IMMUNE - no filter");
        return null;
    }
    
    // 3. Načti všechny hierarchické vztahy uživatele
    $profileId = $settings['profile_id'];
    $logic = $settings['logic'];
    
    $query = "
        SELECT 
            hz.typ_vztahu,
            hz.user_id_1,
            hz.user_id_2,
            hz.lokalita_id,
            hz.usek_id,
            hz.role_id,
            hz.viditelnost_objednavky
        FROM 25_hierarchie_vztahy hz
        WHERE hz.profil_id = ?
          AND hz.aktivni = 1
          AND hz.viditelnost_objednavky = 1
          AND (
              hz.user_id_1 = ? 
              OR hz.user_id_2 = ?
              OR hz.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = ?)
          )
    ";
    
    $stmt = $db->prepare($query);
    if (!$stmt) {
        error_log("HIERARCHY ERROR: Failed to prepare relationships query: " . $db->error);
        return null;
    }
    
    $stmt->bind_param('iiii', $profileId, $userId, $userId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $relationships = [];
    while ($row = $result->fetch_assoc()) {
        $relationships[] = $row;
    }
    
    if (empty($relationships)) {
        // Uživatel nemá žádné hierarchické vztahy → nevidí NIC
        error_log("HIERARCHY: User $userId has NO relationships in profile $profileId - showing NOTHING");
        return "1 = 0"; // Podmínka která nikdy není pravdivá
    }
    
    error_log("HIERARCHY: User $userId has " . count($relationships) . " relationships in profile $profileId");
    
    // 4. Sestavení WHERE podmínky
    $visibleUserIds = [$userId]; // Uživatel vidí vždy sebe
    $visibleUskyIds = [];
    $visibleLokality = [];
    
    foreach ($relationships as $rel) {
        $typVztahu = $rel['typ_vztahu'];
        
        // Extrahuj entity podle typu vztahu
        switch ($typVztahu) {
            case 'user-user':
                // Obousměrná viditelnost mezi uživateli
                if ($rel['user_id_1'] == $userId && $rel['user_id_2']) {
                    $visibleUserIds[] = (int)$rel['user_id_2'];
                }
                if ($rel['user_id_2'] == $userId && $rel['user_id_1']) {
                    $visibleUserIds[] = (int)$rel['user_id_1'];
                }
                break;
                
            case 'user-department':
            case 'department-user':
                // Uživatel vidí celý úsek
                if ($rel['usek_id']) {
                    $visibleUskyIds[] = (int)$rel['usek_id'];
                }
                break;
                
            case 'user-location':
            case 'location-user':
                // Uživatel vidí celou lokalitu
                if ($rel['lokalita_id']) {
                    $visibleLokality[] = (int)$rel['lokalita_id'];
                }
                break;
                
            // Můžeme přidat další typy podle potřeby
        }
    }
    
    // Deduplikace
    $visibleUserIds = array_unique($visibleUserIds);
    $visibleUskyIds = array_unique($visibleUskyIds);
    $visibleLokality = array_unique($visibleLokality);
    
    error_log("HIERARCHY: Visible entities - Users: " . count($visibleUserIds) . 
              ", Useky: " . count($visibleUskyIds) . 
              ", Lokality: " . count($visibleLokality));
    
    // 5. Sestavení WHERE podmínky
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
    
    if (empty($conditions)) {
        // Žádné podmínky → nevidí nic
        error_log("HIERARCHY WARNING: No filter conditions generated - showing NOTHING");
        return "1 = 0";
    }
    
    // Logika OR/AND
    if ($logic === 'AND') {
        // AND logika: musí splňovat VŠECHNY podmínky
        $whereClause = "(" . implode(" AND ", $conditions) . ")";
        error_log("HIERARCHY: Using AND logic (restrictive): $whereClause");
    } else {
        // OR logika (výchozí): stačí splnit JEDNU podmínku
        $whereClause = "(" . implode(" OR ", $conditions) . ")";
        error_log("HIERARCHY: Using OR logic (permissive): $whereClause");
    }
    
    return $whereClause;
}

/**
 * Zkontroluje, zda uživatel může vidět konkrétní objednávku
 * (pro použití v detail view)
 * 
 * @param int $orderId Order ID
 * @param int $userId User ID
 * @param mysqli $db Database connection
 * @return bool
 */
function canUserViewOrder($orderId, $userId, $db) {
    // 1. Načti nastavení hierarchie
    $settings = getHierarchySettings($db);
    
    if (!$settings['enabled'] || !$settings['profile_id']) {
        // Hierarchie vypnuta → ano (řeší se standardními právy)
        return true;
    }
    
    // 2. Check HIERARCHY_IMMUNE
    if (isUserHierarchyImmune($userId, $db)) {
        return true;
    }
    
    // 3. Načti objednávku
    $query = "
        SELECT uzivatel_id, usek_id, lokalita_id
        FROM 25a_objednavky
        WHERE id = ? AND aktivni = 1
    ";
    
    $stmt = $db->prepare($query);
    if (!$stmt) {
        error_log("HIERARCHY ERROR: Failed to prepare order query: " . $db->error);
        return false;
    }
    
    $stmt->bind_param('i', $orderId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        return false; // Objednávka neexistuje
    }
    
    $order = $result->fetch_assoc();
    
    // 4. Zkontroluj hierarchické vztahy
    $profileId = $settings['profile_id'];
    
    $checkQuery = "
        SELECT COUNT(*) as cnt
        FROM 25_hierarchie_vztahy hz
        WHERE hz.profil_id = ?
          AND hz.aktivni = 1
          AND hz.viditelnost_objednavky = 1
          AND (
              (hz.user_id_1 = ? OR hz.user_id_2 = ?)
              OR hz.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = ?)
          )
          AND (
              (hz.typ_vztahu LIKE '%user%' AND (hz.user_id_1 = ? OR hz.user_id_2 = ?))
              OR (hz.typ_vztahu LIKE '%department%' AND hz.usek_id = ?)
              OR (hz.typ_vztahu LIKE '%location%' AND hz.lokalita_id = ?)
          )
    ";
    
    $stmt2 = $db->prepare($checkQuery);
    if (!$stmt2) {
        error_log("HIERARCHY ERROR: Failed to prepare visibility check query: " . $db->error);
        return false;
    }
    
    $stmt2->bind_param('iiiiiiii', 
        $profileId, 
        $userId, $userId, $userId,
        $order['uzivatel_id'], $order['uzivatel_id'],
        $order['usek_id'],
        $order['lokalita_id']
    );
    
    $stmt2->execute();
    $result2 = $stmt2->get_result();
    $row = $result2->fetch_assoc();
    
    $canView = $row['cnt'] > 0;
    
    error_log("HIERARCHY: User $userId " . ($canView ? "CAN" : "CANNOT") . " view order $orderId");
    
    return $canView;
}

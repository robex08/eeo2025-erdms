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

// Note: dbconfig.php is already included in orderV2Endpoints.php

/**
 * Zkontroluje, zda je hierarchie workflow aktivní
 * 
 * @param PDO $db Database connection
 * @return array ['enabled' => bool, 'profile_id' => int|null, 'logic' => string]
 */
function getHierarchySettings($db) {
    error_log("🔍 HIERARCHY DEBUG: Loading settings from 25a_nastaveni_globalni");
    
    // Načítání jednotlivých nastavení z key-value tabulky
    $query = "
        SELECT klic, hodnota
        FROM 25a_nastaveni_globalni
        WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id', 'hierarchy_logic')
    ";
    
    try {
        $stmt = $db->query($query);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("❌ HIERARCHY ERROR: Failed to load settings: " . $e->getMessage());
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
    
    foreach ($rows as $row) {
        error_log("🔍 HIERARCHY DEBUG: Setting loaded - {$row['klic']} = {$row['hodnota']}");
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
    
    error_log("✅ HIERARCHY DEBUG: Final settings - enabled=" . ($settings['enabled'] ? 'YES' : 'NO') . 
              ", profile_id=" . ($settings['profile_id'] ?? 'NULL') . 
              ", logic=" . $settings['logic']);
    
    return $settings;
}

/**
 * Zkontroluje, zda má uživatel právo HIERARCHY_IMMUNE
 * (= hierarchie se na něj nevztahuje)
 * 
 * @param int $userId User ID
 * @param PDO $db Database connection
 * @return bool
 */
function isUserHierarchyImmune($userId, $db) {
    error_log("🔍 HIERARCHY DEBUG: Checking HIERARCHY_IMMUNE for user $userId");
    
    // Check práv přes role uživatele (HIERARCHY_IMMUNE je přiřazeno k rolím SUPERADMIN/ADMINISTRATOR)
    $queryRoles = "
        SELECT COUNT(*) as cnt
        FROM 25_uzivatele_role ur
        INNER JOIN 25_role_prava rp ON rp.role_id = ur.role_id
        INNER JOIN 25_prava p ON p.id = rp.pravo_id
        WHERE ur.uzivatel_id = :userId
          AND p.kod_prava = 'HIERARCHY_IMMUNE'
          AND p.aktivni = 1
    ";
    
    try {
        $stmt = $db->prepare($queryRoles);
        $stmt->execute(['userId' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $isImmune = $row['cnt'] > 0;
        error_log("✅ HIERARCHY DEBUG: User $userId is " . ($isImmune ? "IMMUNE" : "NOT immune"));
        
        return $isImmune;
    } catch (PDOException $e) {
        error_log("HIERARCHY ERROR: Failed to check immune status: " . $e->getMessage());
        return false;
    }
}

/**
 * Aplikuje hierarchii na filtraci objednávek
 * Vrací WHERE podmínku nebo NULL (= žádná filtrace)
 * 
 * @param int $userId User ID
 * @param PDO $db Database connection
 * @return string|null SQL WHERE podmínka nebo NULL
 */
function applyHierarchyFilterToOrders($userId, $db) {
    global $HIERARCHY_DEBUG_INFO; // 🔥 GLOBAL pro JSON response v F12
    
    $HIERARCHY_DEBUG_INFO = array(
        'called' => true,
        'user_id' => $userId,
        'config' => array(),
        'relationships' => array(),
        'visible_entities' => array(),
        'filter_generated' => false,
        'filter_preview' => null,
        'immune' => false
    );
    
    error_log("════════════════════════════════════════════════════════");
    error_log("🚀 HIERARCHY DEBUG: applyHierarchyFilterToOrders() START");
    error_log("   User ID: $userId");
    error_log("════════════════════════════════════════════════════════");
    
    // 1. Načti nastavení hierarchie
    $settings = getHierarchySettings($db);
    
    // 🔥 Ulož config do debug info
    $HIERARCHY_DEBUG_INFO['config'] = array(
        'enabled' => $settings['enabled'],
        'profile_id' => $settings['profile_id'],
        'logic' => $settings['logic']
    );
    error_log("📋 HIERARCHY CONFIG: enabled=" . ($settings['enabled'] ? 'YES' : 'NO') . 
              ", profile_id=" . ($settings['profile_id'] ?? 'NULL') . 
              ", logic=" . $settings['logic']);
    
    if (!$settings['enabled']) {
        error_log("❌ HIERARCHY DISABLED - skipping filter");
        $HIERARCHY_DEBUG_INFO['reason'] = 'disabled';
        return null;
    }
    
    if (!$settings['profile_id']) {
        error_log("❌ NO PROFILE SELECTED - skipping filter");
        $HIERARCHY_DEBUG_INFO['reason'] = 'no_profile';
        return null;
    }
    
    error_log("✅ Hierarchy ENABLED, profile=" . $settings['profile_id']);
    
    // 2. Check HIERARCHY_IMMUNE
    if (isUserHierarchyImmune($userId, $db)) {
        error_log("🛡️ User $userId is IMMUNE - skipping filter");
        $HIERARCHY_DEBUG_INFO['immune'] = true;
        $HIERARCHY_DEBUG_INFO['reason'] = 'user_immune';
        return null;
    }
    
    error_log("✅ User is NOT immune - will apply hierarchy filter");
    
    // 3. Načti všechny hierarchické vztahy uživatele
    $profileId = $settings['profile_id'];
    $logic = $settings['logic'];
    
    // ✅ SPRÁVNÁ QUERY: Všechny sloupce existují v DB
    $query = "
        SELECT 
            hz.typ_vztahu,
            hz.user_id_1,
            hz.user_id_2,
            hz.lokalita_id,
            hz.usek_id,
            hz.role_id
        FROM 25_hierarchie_vztahy hz
        WHERE hz.profil_id = :profileId
          AND hz.aktivni = 1
          AND hz.viditelnost_objednavky = 1
          AND (
              hz.user_id_1 = :userId1
              OR hz.user_id_2 = :userId2
              OR (hz.role_id IS NOT NULL AND hz.role_id IN (
                  SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = :userId3
              ))
          )
    ";
    
    error_log("🔍 HIERARCHY DEBUG: Loading relationships for user $userId, profile $profileId");
    
    try {
        $stmt = $db->prepare($query);
        $stmt->execute([
            'profileId' => $profileId,
            'userId1' => $userId,
            'userId2' => $userId,
            'userId3' => $userId
        ]);
        
        $relationships = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 🔥 Ulož do debug info
        $HIERARCHY_DEBUG_INFO['relationships'] = $relationships;
        $HIERARCHY_DEBUG_INFO['relationships_count'] = count($relationships);
        
    } catch (PDOException $e) {
        error_log("❌ HIERARCHY ERROR: Failed to load relationships: " . $e->getMessage());
        $HIERARCHY_DEBUG_INFO['error'] = $e->getMessage();
        return null;
    }
    
    if (empty($relationships)) {
        // Uživatel nemá žádné hierarchické vztahy
        // ALE musí vidět minimálně své vlastní objednávky (kde je tvůrce/objednatel/garant)
        error_log("⚠️ User $userId has NO relationships in profile $profileId");
        error_log("✅ Will see ONLY OWN orders (uzivatel_id, objednatel_id, garant_uzivatel_id)");
        
        $HIERARCHY_DEBUG_INFO['reason'] = 'no_relationships_own_only';
        $HIERARCHY_DEBUG_INFO['filter_generated'] = true;
        $HIERARCHY_DEBUG_INFO['filter_preview'] = "User sees only own orders";
        
        // Vrátíme filtr, který umožňuje vidět pouze vlastní objednávky
        return "(o.uzivatel_id = $userId OR o.objednatel_id = $userId OR o.garant_uzivatel_id = $userId)";
    }
    
    error_log("✅ Found " . count($relationships) . " relationships for user $userId in profile $profileId");
    
    // 4. Sestavení WHERE podmínky
    $visibleUserIds = [$userId]; // Uživatel vidí vždy sebe
    $visibleUskyIds = [];
    $visibleLokality = [];
    
    foreach ($relationships as $rel) {
        $typVztahu = $rel['typ_vztahu'];
        
        error_log("🔍 HIERARCHY DEBUG: Processing relationship type='$typVztahu', lokalita_id=" . 
                  ($rel['lokalita_id'] ?? 'NULL') . ", usek_id=" . 
                  ($rel['usek_id'] ?? 'NULL') . ", role_id=" . 
                  ($rel['role_id'] ?? 'NULL'));
        
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
                
            case 'role-location':
            case 'location-role':
                // Uživatel s danou rolí vidí celou lokalitu
                // Role už byla ověřena v WHERE podmínce dotazu
                if ($rel['lokalita_id']) {
                    $visibleLokality[] = (int)$rel['lokalita_id'];
                    error_log("✅ HIERARCHY DEBUG: Added lokalita_id={$rel['lokalita_id']} via role-location");
                }
                break;
                
            case 'role-department':
            case 'department-role':
                // Uživatel s danou rolí vidí celý úsek
                if ($rel['usek_id']) {
                    $visibleUskyIds[] = (int)$rel['usek_id'];
                    error_log("✅ HIERARCHY DEBUG: Added usek_id={$rel['usek_id']} via role-department");
                }
                break;
                
            // Můžeme přidat další typy podle potřeby
        }
    }
    
    // Deduplikace
    $visibleUserIds = array_unique($visibleUserIds);
    $visibleUskyIds = array_unique($visibleUskyIds);
    $visibleLokality = array_unique($visibleLokality);
    
    // 🔥 Ulož visible entities do debug info
    $HIERARCHY_DEBUG_INFO['visible_entities'] = array(
        'users' => $visibleUserIds,
        'useky' => $visibleUskyIds,
        'lokality' => $visibleLokality,
        'users_count' => count($visibleUserIds),
        'useky_count' => count($visibleUskyIds),
        'lokality_count' => count($visibleLokality)
    );
    
    error_log("════════════════════════════════════════════════════════");
    error_log("📊 VISIBLE ENTITIES:");
    error_log("   👥 Users: " . count($visibleUserIds) . " → [" . implode(', ', $visibleUserIds) . "]");
    error_log("   🏢 Useky: " . count($visibleUskyIds) . " → [" . implode(', ', $visibleUskyIds) . "]");
    error_log("   📍 Lokality: " . count($visibleLokality) . " → [" . implode(', ', $visibleLokality) . "]");
    error_log("════════════════════════════════════════════════════════");
    
    // 5. Sestavení WHERE podmínky
    // DŮLEŽITÉ: Objednávky NEMAJÍ přímo lokalita_id/usek_id!
    // Musíme filtrovat přes zúčastněné uživatele (objednatel, uzivatel, garant, atd.)
    $conditions = [];
    
    // 🔥 PRIORITA: Uživatel VŽDY vidí své vlastní objednávky (nezávisle na hierarchii)
    $conditions[] = "(
        o.uzivatel_id = $userId
        OR o.objednatel_id = $userId
        OR o.garant_uzivatel_id = $userId
    )";
    error_log("✅ Added OWN orders condition for user $userId");
    
    if (!empty($visibleUserIds) && count($visibleUserIds) > 1) {
        // Pokud má uživatel hierarchické vztahy, přidáme i je (kromě sebe, který už je výše)
        $otherUserIds = array_diff($visibleUserIds, [$userId]);
        if (!empty($otherUserIds)) {
            $userIdsList = implode(',', array_map('intval', $otherUserIds));
            // Hierarchie filtruje pouze přes 3 klíčové role
            $conditions[] = "(
                o.uzivatel_id IN ($userIdsList)
                OR o.objednatel_id IN ($userIdsList)
                OR o.garant_uzivatel_id IN ($userIdsList)
            )";
            error_log("✅ Added hierarchy users condition: " . count($otherUserIds) . " users");
        }
    }
    
    if (!empty($visibleUskyIds)) {
        $uskyIdsList = implode(',', array_map('intval', $visibleUskyIds));
        // Objednávky přes uživatele z daných úseků
        $conditions[] = "(
            o.uzivatel_id IN (SELECT id FROM 25_uzivatele WHERE usek_id IN ($uskyIdsList))
            OR o.objednatel_id IN (SELECT id FROM 25_uzivatele WHERE usek_id IN ($uskyIdsList))
            OR o.garant_uzivatel_id IN (SELECT id FROM 25_uzivatele WHERE usek_id IN ($uskyIdsList))
        )";
    }
    
    if (!empty($visibleLokality)) {
        $lokalityList = implode(',', array_map('intval', $visibleLokality));
        // Objednávky přes uživatele z daných lokalit
        $conditions[] = "(
            o.uzivatel_id IN (SELECT id FROM 25_uzivatele WHERE lokalita_id IN ($lokalityList))
            OR o.objednatel_id IN (SELECT id FROM 25_uzivatele WHERE lokalita_id IN ($lokalityList))
            OR o.garant_uzivatel_id IN (SELECT id FROM 25_uzivatele WHERE lokalita_id IN ($lokalityList))
        )";
    }
    
    if (empty($conditions)) {
        // Žádné podmínky z hierarchických vztahů
        // ALE uživatel musí vidět minimálně své vlastní objednávky
        error_log("⚠️ NO CONDITIONS GENERATED from relationships");
        error_log("✅ Will see ONLY OWN orders (uzivatel_id, objednatel_id, garant_uzivatel_id)");
        
        $HIERARCHY_DEBUG_INFO['reason'] = 'no_conditions_own_only';
        $HIERARCHY_DEBUG_INFO['filter_generated'] = true;
        $HIERARCHY_DEBUG_INFO['filter_preview'] = "User sees only own orders";
        
        // Vrátíme filtr, který umožňuje vidět pouze vlastní objednávky
        return "(o.uzivatel_id = $userId OR o.objednatel_id = $userId OR o.garant_uzivatel_id = $userId)";
    }
    
    // Logika OR/AND
    if ($logic === 'AND') {
        // AND logika: musí splňovat VŠECHNY podmínky
        $whereClause = "(" . implode(" AND ", $conditions) . ")";
        error_log("🔗 Using AND logic (restrictive)");
    } else {
        // OR logika (výchozí): stačí splnit JEDNU podmínku
        $whereClause = "(" . implode(" OR ", $conditions) . ")";
        error_log("🔗 Using OR logic (permissive)");
    }
    
    // 🔥 Ulož WHERE clause do debug info
    $HIERARCHY_DEBUG_INFO['filter_generated'] = true;
    $HIERARCHY_DEBUG_INFO['filter_logic'] = $logic;
    $HIERARCHY_DEBUG_INFO['filter_conditions_count'] = count($conditions);
    $HIERARCHY_DEBUG_INFO['filter_length'] = strlen($whereClause);
    $HIERARCHY_DEBUG_INFO['filter_preview'] = substr($whereClause, 0, 200) . (strlen($whereClause) > 200 ? '...' : '');
    $HIERARCHY_DEBUG_INFO['filter_full'] = $whereClause; // 🔥 FULL pro debug
    
    error_log("════════════════════════════════════════════════════════");
    error_log("✅ FINAL WHERE CLAUSE:");
    error_log("   Length: " . strlen($whereClause) . " chars");
    error_log("   Conditions: " . count($conditions));
    error_log("   Preview: " . substr($whereClause, 0, 300));
    error_log("════════════════════════════════════════════════════════");
    
    return $whereClause;
}

/**
 * Zkontroluje, zda uživatel může vidět konkrétní objednávku
 * (pro použití v detail view)
 * 
 * @param int $orderId Order ID
 * @param int $userId User ID
 * @param PDO $db Database connection
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
    
    // 3. Načti objednávku s 3 KLÍČOVÝMI ROLEMI (uzivatel, objednatel, garant)
    // Hierarchie filtruje pouze přes 3 klíčové role - ostatní účastníci workflow jsou irelevantní
    $query = "
        SELECT 
            o.id,
            o.uzivatel_id,
            o.objednatel_id,
            o.garant_uzivatel_id
        FROM 25a_objednavky o
        WHERE o.id = :orderId AND o.aktivni = 1
    ";
    
    try {
        $stmt = $db->prepare($query);
        $stmt->execute(['orderId' => $orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            return false; // Objednávka neexistuje
        }
    } catch (PDOException $e) {
        error_log("HIERARCHY ERROR: Failed to load order: " . $e->getMessage());
        return false;
    }
    
    // 4. Zkontroluj hierarchické vztahy
    // Musíme zjistit, zda některý ze zúčastněných uživatelů splňuje hierarchické podmínky
    $profileId = $settings['profile_id'];
    
    // POUZE 3 KLÍČOVÉ ROLE (uzivatel, objednatel, garant)
    $participantIds = array_filter([
        $order['uzivatel_id'],
        $order['objednatel_id'],
        $order['garant_uzivatel_id']
    ]);
    
    if (empty($participantIds)) {
        return false; // Žádní zúčastnění uživatelé
    }
    
    // Pro bezpečnost: použijeme placeholdery pro každý participantId
    $participantPlaceholders = [];
    $participantParams = [];
    foreach ($participantIds as $idx => $participantId) {
        $key = "participant{$idx}";
        $participantPlaceholders[] = ":{$key}";
        $participantParams[$key] = (int)$participantId;
    }
    $participantIdsStr = implode(',', $participantPlaceholders);
    
    // Zkontrolujeme, zda uživatel má hierarchický vztah k některému z účastníků
    $checkQuery = "
        SELECT COUNT(*) as cnt
        FROM 25_hierarchie_vztahy hz
        WHERE hz.profil_id = :profileId
          AND hz.aktivni = 1
          AND hz.viditelnost_objednavky = 1
          AND (
              -- Uživatel má vztah přes svou roli nebo direct vztah
              (hz.user_id_1 = :userId1 OR hz.user_id_2 = :userId2)
              OR hz.role_id IN (SELECT role_id FROM 25_uzivatele_role WHERE uzivatel_id = :userId3)
          )
          AND (
              -- A tento vztah pokrývá některého z účastníků objednávky
              (hz.typ_vztahu LIKE '%user%' AND (hz.user_id_1 IN ($participantIdsStr) OR hz.user_id_2 IN ($participantIdsStr)))
              OR (hz.typ_vztahu LIKE '%department%' AND hz.usek_id IN (
                  SELECT usek_id FROM 25_uzivatele WHERE id IN ($participantIdsStr)
              ))
              OR (hz.typ_vztahu LIKE '%location%' AND hz.lokalita_id IN (
                  SELECT lokalita_id FROM 25_uzivatele WHERE id IN ($participantIdsStr)
              ))
          )
    ";
    
    try {
        $params = array_merge([
            'profileId' => $profileId,
            'userId1' => $userId,
            'userId2' => $userId,
            'userId3' => $userId
        ], $participantParams);
        
        $stmt = $db->prepare($checkQuery);
        $stmt->execute($params);
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $canView = $row['cnt'] > 0;
        
        error_log("HIERARCHY: User $userId " . ($canView ? "CAN" : "CANNOT") . " view order $orderId");
        
        return $canView;
    } catch (PDOException $e) {
        error_log("HIERARCHY ERROR: Failed to check visibility: " . $e->getMessage());
        return false;
    }
}

<?php
/**
 * ============================================================================
 * HIERARCHY PERMISSIONS - Kontrola práv na základě workflow hierarchie
 * ============================================================================
 * 
 * Tento soubor obsahuje funkce pro kontrolu oprávnění v modulech
 * na základě vztahů definovaných v structure_json (25_hierarchie_profily).
 * 
 * @package EEO v2025
 * @author  GitHub Copilot
 * @date    2025-12-16
 * @version 3.0 - Refactored to use structure_json
 */

/**
 * Získá seznam ID záznamů, které může uživatel vidět v daném modulu
 * na základě hierarchy vztahů ze structure_json.
 * 
 * @param PDO    $pdo        Database connection
 * @param int    $userId     ID uživatele (nadřízeného)
 * @param string $module     Název modulu ('orders', 'invoices', 'cashbook')
 * @param int    $profileId  ID profilu hierarchie (výchozí NULL = aktivní)
 * @return array Array ID záznamů, které může vidět
 */
function getVisibleRecordsByHierarchy($pdo, $userId, $module, $profileId = null) {
    // Načíst aktivní profil
    if (!$profileId) {
        $stmt = $pdo->prepare("SELECT id FROM 25_hierarchie_profily WHERE aktivni = 1 LIMIT 1");
        $stmt->execute();
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        $profileId = $profile ? $profile['id'] : null;
    }
    
    if (!$profileId) {
        return [];
    }
    
    // Načíst structure_json
    $stmt = $pdo->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = :profileId");
    $stmt->execute(['profileId' => $profileId]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile || empty($profile['structure_json'])) {
        return [];
    }
    
    $structure = json_decode($profile['structure_json'], true);
    if (!$structure || !isset($structure['edges'])) {
        return [];
    }
    
    // Najít user node
    $userNodeId = null;
    foreach ($structure['nodes'] as $node) {
        if ($node['typ'] === 'user' && isset($node['data']['uzivatel_id']) && $node['data']['uzivatel_id'] == $userId) {
            $userNodeId = $node['id'];
            break;
        }
    }
    
    if (!$userNodeId) {
        return [];
    }
    
    // Projít edges a extrahovat vztahy
    $relationships = [];
    
    foreach ($structure['edges'] as $edge) {
        if ($edge['source'] !== $userNodeId && $edge['target'] !== $userNodeId) {
            continue;
        }
        
        $modules = isset($edge['data']['modules']) ? $edge['data']['modules'] : [];
        if (!isset($modules[$module]) || !$modules[$module]) {
            continue;
        }
        
        $targetNodeId = ($edge['source'] === $userNodeId) ? $edge['target'] : $edge['source'];
        
        foreach ($structure['nodes'] as $node) {
            if ($node['id'] === $targetNodeId) {
                $relationships[] = [
                    'node' => $node,
                    'scope' => isset($edge['data']['scope']) ? $edge['data']['scope'] : 'OWN'
                ];
                break;
            }
        }
    }
    
    if (empty($relationships)) {
        return [];
    }
    
    if (empty($relationships)) {
        return [];
    }
    
    $visibleUserIds = [];
    
    foreach ($relationships as $rel) {
        $node = $rel['node'];
        $scope = $rel['scope'];
        
        if ($node['typ'] === 'user' && isset($node['data']['uzivatel_id'])) {
            $subordinateUserId = $node['data']['uzivatel_id'];
            
            // Získat údaje podřízeného
            $subordinate = getUserById($pdo, $subordinateUserId);
            
            if ($subordinate) {
                switch ($scope) {
                    case 'OWN':
                        // Jen záznamy podřízeného
                        $visibleUserIds[] = $subordinateUserId;
                        break;
                        
                    case 'TEAM':
                        // Celý úsek podřízeného
                        $teamUsers = getUsersByDepartment($pdo, $subordinate['usek_id']);
                        $visibleUserIds = array_merge($visibleUserIds, array_column($teamUsers, 'uzivatel_id'));
                        break;
                        
                    case 'LOCATION':
                        // Celá lokalita podřízeného
                        $locationUsers = getUsersByLocation($pdo, $subordinate['lokalita_id']);
                        $visibleUserIds = array_merge($visibleUserIds, array_column($locationUsers, 'uzivatel_id'));
                        break;
                        
                    case 'ALL':
                        // Všichni uživatelé - vrátit NULL pro signalizaci "all"
                        return null; // Speciální hodnota = vidí všechno
                }
            }
        }
        
        // Rozšířené lokality
        if (!empty($rel['rozsirene_lokality'])) {
            $extendedLocations = json_decode($rel['rozsirene_lokality'], true);
            if (is_array($extendedLocations)) {
                foreach ($extendedLocations as $locationId) {
                    $locationUsers = getUsersByLocation($pdo, $locationId);
                    $visibleUserIds = array_merge($visibleUserIds, array_column($locationUsers, 'uzivatel_id'));
                }
            }
        }
        
        // Rozšířené úseky
        if (!empty($rel['rozsirene_useky'])) {
            $extendedDepartments = json_decode($rel['rozsirene_useky'], true);
            if (is_array($extendedDepartments)) {
                foreach ($extendedDepartments as $deptId) {
                    $deptUsers = getUsersByDepartment($pdo, $deptId);
                    $visibleUserIds = array_merge($visibleUserIds, array_column($deptUsers, 'uzivatel_id'));
                }
            }
        }
        
        // Kombinace lokalita+úsek
        if (!empty($rel['kombinace_lokalita_usek'])) {
            $combinations = json_decode($rel['kombinace_lokalita_usek'], true);
            if (is_array($combinations)) {
                foreach ($combinations as $combo) {
                    $comboUsers = getUsersByLocationAndDepartment(
                        $pdo, 
                        $combo['locationId'], 
                        $combo['departmentId']
                    );
                    $visibleUserIds = array_merge($visibleUserIds, array_column($comboUsers, 'uzivatel_id'));
                }
            }
        }
    }
    
    // Vrátit unikátní ID
    return array_unique($visibleUserIds);
}

/**
 * Zkontroluje, zda uživatel může vidět konkrétní záznam.
 * 
 * @param PDO    $pdo        Database connection
 * @param int    $userId     ID uživatele (kdo se ptá)
 * @param string $module     Název modulu
 * @param int    $recordId   ID záznamu
 * @param int    $profileId  ID profilu
 * @return bool  True pokud může vidět
 */
function canViewRecord($pdo, $userId, $module, $recordId, $profileId = 1) {
    // Získat visible user IDs
    $visibleUserIds = getVisibleRecordsByHierarchy($pdo, $userId, $module, $profileId);
    
    // NULL = vidí všechno (scope=ALL)
    if ($visibleUserIds === null) {
        return true;
    }
    
    // Získat autora záznamu
    $recordCreatorId = getRecordCreatorId($pdo, $module, $recordId);
    
    if (!$recordCreatorId) {
        return false;
    }
    
    // Zkontrolovat, zda je autor v seznamu viditelných
    return in_array($recordCreatorId, $visibleUserIds);
}

/**
 * Vytvoří SQL WHERE podmínku pro filtrování záznamů podle hierarchie.
 * 
 * @param PDO    $pdo        Database connection
 * @param int    $userId     ID uživatele
 * @param string $module     Název modulu
 * @param string $alias      Alias tabulky (např. 'o' pro orders)
 * @param int    $profileId  ID profilu
 * @return string SQL WHERE podmínka
 */
function getHierarchyFilterSQL($pdo, $userId, $module, $alias = 'o', $profileId = 1) {
    $visibleUserIds = getVisibleRecordsByHierarchy($pdo, $userId, $module, $profileId);
    
    // Vidí všechno
    if ($visibleUserIds === null) {
        return "1=1"; // No restriction
    }
    
    // Žádná viditelnost
    if (empty($visibleUserIds)) {
        return "1=0"; // Block all
    }
    
    // Filtr podle vytvoril_user_id
    $ids = implode(',', array_map('intval', $visibleUserIds));
    return "{$alias}.vytvoril_user_id IN ($ids)";
}

// ============================================================================
// HELPER FUNKCE
// ============================================================================

function getUserById($pdo, $userId) {
    $stmt = $pdo->prepare("
        SELECT uzivatel_id, jmeno, prijmeni, email, lokalita_id, usek_id
        FROM 25_uzivatele
        WHERE uzivatel_id = :userId AND aktivni = 1
    ");
    $stmt->execute(['userId' => $userId]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function getUsersByDepartment($pdo, $departmentId) {
    $stmt = $pdo->prepare("
        SELECT uzivatel_id, jmeno, prijmeni, email, lokalita_id, usek_id
        FROM 25_uzivatele
        WHERE usek_id = :deptId AND aktivni = 1
    ");
    $stmt->execute(['deptId' => $departmentId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getUsersByLocation($pdo, $locationId) {
    $stmt = $pdo->prepare("
        SELECT uzivatel_id, jmeno, prijmeni, email, lokalita_id, usek_id
        FROM 25_uzivatele
        WHERE lokalita_id = :locationId AND aktivni = 1
    ");
    $stmt->execute(['locationId' => $locationId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getUsersByLocationAndDepartment($pdo, $locationId, $departmentId) {
    $stmt = $pdo->prepare("
        SELECT uzivatel_id, jmeno, prijmeni, email, lokalita_id, usek_id
        FROM 25_uzivatele
        WHERE lokalita_id = :locationId 
          AND usek_id = :deptId 
          AND aktivni = 1
    ");
    $stmt->execute([
        'locationId' => $locationId,
        'deptId' => $departmentId
    ]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getRecordCreatorId($pdo, $module, $recordId) {
    $tables = [
        'orders' => '25_objednavky',
        'invoices' => '25_faktury',
        'cashbook' => '25_pokladna',
        'contracts' => '25_smlouvy'
    ];
    
    if (!isset($tables[$module])) {
        return null;
    }
    
    $table = $tables[$module];
    $stmt = $pdo->prepare("SELECT vytvoril_user_id FROM $table WHERE id = :recordId");
    $stmt->execute(['recordId' => $recordId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $result ? $result['vytvoril_user_id'] : null;
}

// ============================================================================
// PŘÍKLAD POUŽITÍ
// ============================================================================

/*
// V Orders API endpoint:
$userId = $_SESSION['user_id'];

// Získat WHERE podmínku pro hierarchii
$hierarchyFilter = getHierarchyFilterSQL($pdo, $userId, 'orders', 'o');

$sql = "
    SELECT o.*, u.jmeno, u.prijmeni
    FROM 25_objednavky o
    INNER JOIN 25_uzivatele u ON o.vytvoril_user_id = u.uzivatel_id
    WHERE $hierarchyFilter
      AND o.aktivni = 1
    ORDER BY o.dt_vytvoreni DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute();
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Nebo kontrola konkrétního záznamu:
$orderId = 12345;
if (!canViewRecord($pdo, $userId, 'orders', $orderId)) {
    http_response_code(403);
    echo json_encode(['error' => 'Nemáte oprávnění k zobrazení této objednávky']);
    exit;
}
*/

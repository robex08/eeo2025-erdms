<?php
/**
 * Multi-profilový systém viditelnosti - Backend implementace
 * 
 * Filtruje objekty aplikace (objednávky, faktury, smlouvy, pokladna)
 * podle hierarchických vztahů s podporou:
 * - Personifikace (konkrétní uživatelé)
 * - Úseků (departments)
 * - Lokalit (locations)
 * - Multi-profilů (NOTIFIKACE, VIDITELNOST, PRAVA)
 * 
 * @package EEO2025
 * @subpackage Hierarchy
 * @author Robert Novák
 * @date 2026-01-15
 * @version 1.0
 */

require_once __DIR__ . '/queries.php';

/**
 * Získá ID objednávek viditelných pro uživatele
 * podle VŠECH aktivních profilů a vztahů
 * 
 * @param int $userId ID uživatele
 * @param PDO $pdo Databázové připojení
 * @param string|null $cacheKey Volitelný cache klíč (pro Redis)
 * @return array Pole ID objednávek
 */
function getVisibleOrderIdsForUser($userId, $pdo, $cacheKey = null) {
  // Cache check (volitelné - pro production použít Redis)
  if ($cacheKey && function_exists('apc_fetch')) {
    $cached = apc_fetch($cacheKey);
    if ($cached !== false) {
      return $cached;
    }
  }
  
  $visibleOrderIds = [];
  
  // 1. Načíst všechny AKTIVNÍ profily
  $stmt = $pdo->query("
    SELECT id FROM ".TBL_HIERARCHIE_PROFILY." WHERE aktivni = 1
  ");
  $activeProfiles = $stmt->fetchAll(PDO::FETCH_COLUMN);
  
  if (empty($activeProfiles)) {
    return []; // Žádný profil aktivní → standardní práva
  }
  
  // 2. Načíst vztahy uživatele pro viditelnost
  $profilesPlaceholder = implode(',', array_fill(0, count($activeProfiles), '?'));
  
  $stmt = $pdo->prepare("
    SELECT 
      v.id,
      v.profil_id,
      v.profil_type,
      v.typ_vztahu,
      v.scope,
      v.user_id_2,
      v.lokalita_id,
      v.usek_id,
      v.rozsirene_lokality,
      v.rozsirene_useky,
      v.personalized_users,
      v.kombinace_lokalita_usek,
      v.viditelnost_objednavky
    FROM ".TBL_HIERARCHIE_VZTAHY." v
    WHERE v.user_id_1 = ?
      AND v.profil_id IN ($profilesPlaceholder)
      AND v.aktivni = 1
      AND v.profil_type IN ('VIDITELNOST', 'PRAVA', 'ALL')
      AND v.viditelnost_objednavky = 1
  ");
  
  $params = array_merge([$userId], $activeProfiles);
  $stmt->execute($params);
  $relations = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  // Debug logging (volitelné)
  if (defined('DEBUG_HIERARCHY') && DEBUG_HIERARCHY) {
    error_log("HIERARCHY DEBUG: User $userId has ".count($relations)." visibility relations");
  }
  
  // 3. Sbírat viditelné IDs podle různých kritérií
  foreach ($relations as $rel) {
    
    // 3a. Personalizovaní uživatelé (nejvyšší priorita)
    if (!empty($rel['personalized_users'])) {
      $userIds = json_decode($rel['personalized_users'], true);
      if (is_array($userIds) && !empty($userIds)) {
        $orderIds = getOrderIdsByCreators($userIds, $pdo);
        $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
        
        if (defined('DEBUG_HIERARCHY') && DEBUG_HIERARCHY) {
          error_log("  → Personalized users: ".count($orderIds)." orders");
        }
      }
    }
    
    // 3b. Přímý vztah user-user
    if ($rel['typ_vztahu'] === 'user-user' && $rel['user_id_2']) {
      $orderIds = getOrderIdsByCreators([$rel['user_id_2']], $pdo);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
      
      if (defined('DEBUG_HIERARCHY') && DEBUG_HIERARCHY) {
        error_log("  → User-user relation: ".count($orderIds)." orders");
      }
    }
    
    // 3c. Viditelnost podle úseků
    $useky = [];
    if ($rel['usek_id']) {
      $useky[] = $rel['usek_id'];
    }
    if (!empty($rel['rozsirene_useky'])) {
      $extended = json_decode($rel['rozsirene_useky'], true);
      if (is_array($extended)) {
        $useky = array_merge($useky, $extended);
      }
    }
    if (!empty($useky)) {
      $orderIds = getOrderIdsByDepartments($useky, $pdo);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
      
      if (defined('DEBUG_HIERARCHY') && DEBUG_HIERARCHY) {
        error_log("  → Departments: ".count($orderIds)." orders");
      }
    }
    
    // 3d. Viditelnost podle lokalit
    $lokality = [];
    if ($rel['lokalita_id']) {
      $lokality[] = $rel['lokalita_id'];
    }
    if (!empty($rel['rozsirene_lokality'])) {
      $extended = json_decode($rel['rozsirene_lokality'], true);
      if (is_array($extended)) {
        $lokality = array_merge($lokality, $extended);
      }
    }
    if (!empty($lokality)) {
      $orderIds = getOrderIdsByLocations($lokality, $pdo);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
      
      if (defined('DEBUG_HIERARCHY') && DEBUG_HIERARCHY) {
        error_log("  → Locations: ".count($orderIds)." orders");
      }
    }
    
    // 3e. Kombinace lokalita + úsek (AND logika)
    if (!empty($rel['kombinace_lokalita_usek'])) {
      $combinations = json_decode($rel['kombinace_lokalita_usek'], true);
      if (is_array($combinations)) {
        foreach ($combinations as $combo) {
          if (isset($combo['locationId']) && isset($combo['departmentId'])) {
            $orderIds = getOrderIdsByLocationAndDepartment(
              $combo['locationId'], 
              $combo['departmentId'], 
              $pdo
            );
            $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
          }
        }
      }
    }
    
    // 3f. Scope = ALL (vidí všechny objednávky)
    if ($rel['scope'] === 'ALL') {
      $stmt = $pdo->query("SELECT id FROM 25_objednavky");
      $orderIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
      $visibleOrderIds = array_merge($visibleOrderIds, $orderIds);
      
      if (defined('DEBUG_HIERARCHY') && DEBUG_HIERARCHY) {
        error_log("  → Scope ALL: ".count($orderIds)." orders");
      }
    }
  }
  
  // 4. Deduplikace
  $visibleOrderIds = array_unique($visibleOrderIds);
  
  // Cache store (volitelné)
  if ($cacheKey && function_exists('apc_store')) {
    apc_store($cacheKey, $visibleOrderIds, 300); // 5 minut
  }
  
  if (defined('DEBUG_HIERARCHY') && DEBUG_HIERARCHY) {
    error_log("HIERARCHY DEBUG: Total visible orders: ".count($visibleOrderIds));
  }
  
  return $visibleOrderIds;
}

/**
 * Helper: Načíst objednávky vytvořené konkrétními uživateli
 * 
 * @param array $userIds Pole user IDs
 * @param PDO $pdo Databázové připojení
 * @return array Pole order IDs
 */
function getOrderIdsByCreators($userIds, $pdo) {
  if (empty($userIds)) return [];
  
  $placeholders = implode(',', array_fill(0, count($userIds), '?'));
  $stmt = $pdo->prepare("
    SELECT DISTINCT id FROM 25_objednavky
    WHERE vytvoril IN ($placeholders)
       OR objednatel_id IN ($placeholders)
       OR prikazce_id IN ($placeholders)
       OR garant_id IN ($placeholders)
  ");
  
  // 4x stejné parametry (pro každý sloupec)
  $params = array_merge($userIds, $userIds, $userIds, $userIds);
  $stmt->execute($params);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * Helper: Načíst objednávky uživatelů z daných úseků
 * 
 * @param array $departmentIds Pole department IDs
 * @param PDO $pdo Databázové připojení
 * @return array Pole order IDs
 */
function getOrderIdsByDepartments($departmentIds, $pdo) {
  if (empty($departmentIds)) return [];
  
  $placeholders = implode(',', array_fill(0, count($departmentIds), '?'));
  $stmt = $pdo->prepare("
    SELECT DISTINCT o.id
    FROM 25_objednavky o
    JOIN 25_uzivatele u ON o.vytvoril = u.id
    WHERE u.usek_id IN ($placeholders)
  ");
  $stmt->execute($departmentIds);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * Helper: Načíst objednávky uživatelů z daných lokalit
 * 
 * @param array $locationIds Pole location IDs
 * @param PDO $pdo Databázové připojení
 * @return array Pole order IDs
 */
function getOrderIdsByLocations($locationIds, $pdo) {
  if (empty($locationIds)) return [];
  
  $placeholders = implode(',', array_fill(0, count($locationIds), '?'));
  $stmt = $pdo->prepare("
    SELECT DISTINCT o.id
    FROM 25_objednavky o
    JOIN 25_uzivatele u ON o.vytvoril = u.id
    WHERE u.lokalita_id IN ($placeholders)
  ");
  $stmt->execute($locationIds);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * Helper: Načíst objednávky uživatelů z kombinace lokalita + úsek
 * 
 * @param int $locationId ID lokality
 * @param int $departmentId ID úseku
 * @param PDO $pdo Databázové připojení
 * @return array Pole order IDs
 */
function getOrderIdsByLocationAndDepartment($locationId, $departmentId, $pdo) {
  $stmt = $pdo->prepare("
    SELECT DISTINCT o.id
    FROM 25_objednavky o
    JOIN 25_uzivatele u ON o.vytvoril = u.id
    WHERE u.lokalita_id = ? AND u.usek_id = ?
  ");
  $stmt->execute([$locationId, $departmentId]);
  
  return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * Zkontroluje, zda uživatel může vidět konkrétní objednávku
 * 
 * @param int $userId ID uživatele
 * @param int $orderId ID objednávky
 * @param PDO $pdo Databázové připojení
 * @return bool True pokud může vidět
 */
function canUserViewOrder($userId, $orderId, $pdo) {
  // Optimalizovaný dotaz - načte jen ID
  $visibleOrderIds = getVisibleOrderIdsForUser($userId, $pdo, "hierarchy_user_{$userId}_orders");
  
  return in_array($orderId, $visibleOrderIds);
}

/**
 * Aplikuje hierarchický filtr na SQL dotaz pro objednávky
 * 
 * @param int $userId ID uživatele
 * @param PDO $pdo Databázové připojení
 * @return array Array s WHERE clause a parametry ['where' => string, 'params' => array]
 */
function applyHierarchyFilterToOrdersQuery($userId, $pdo) {
  $visibleOrderIds = getVisibleOrderIdsForUser($userId, $pdo);
  
  if (empty($visibleOrderIds)) {
    // Žádné viditelné objednávky → vrátit vždy false
    return [
      'where' => '1 = 0',
      'params' => []
    ];
  }
  
  $placeholders = implode(',', array_fill(0, count($visibleOrderIds), '?'));
  
  return [
    'where' => "o.id IN ($placeholders)",
    'params' => $visibleOrderIds
  ];
}

/**
 * Rozšířené funkce pro další moduly
 */

/**
 * Získá viditelné faktury podle hierarchie
 */
function getVisibleInvoiceIdsForUser($userId, $pdo) {
  // Podobná logika jako getVisibleOrderIdsForUser()
  // ale kontroluje v.viditelnost_faktury = 1
  
  $stmt = $pdo->query("SELECT id FROM ".TBL_HIERARCHIE_PROFILY." WHERE aktivni = 1");
  $activeProfiles = $stmt->fetchAll(PDO::FETCH_COLUMN);
  
  if (empty($activeProfiles)) return [];
  
  $profilesPlaceholder = implode(',', array_fill(0, count($activeProfiles), '?'));
  
  $stmt = $pdo->prepare("
    SELECT 
      v.user_id_2,
      v.usek_id,
      v.lokalita_id,
      v.rozsirene_lokality,
      v.rozsirene_useky,
      v.personalized_users,
      v.scope
    FROM ".TBL_HIERARCHIE_VZTAHY." v
    WHERE v.user_id_1 = ?
      AND v.profil_id IN ($profilesPlaceholder)
      AND v.aktivni = 1
      AND v.profil_type IN ('VIDITELNOST', 'PRAVA', 'ALL')
      AND v.viditelnost_faktury = 1
  ");
  
  // ... zbytek implementace podobně jako pro objednávky
  
  return [];
}

/**
 * Získá viditelné smlouvy podle hierarchie
 */
function getVisibleContractIdsForUser($userId, $pdo) {
  // Podobná logika, ale kontroluje v.viditelnost_smlouvy = 1
  return [];
}

/**
 * Získá viditelné položky pokladny podle hierarchie
 */
function getVisibleCashRegisterIdsForUser($userId, $pdo) {
  // Podobná logika, ale kontroluje v.viditelnost_pokladna = 1
  return [];
}

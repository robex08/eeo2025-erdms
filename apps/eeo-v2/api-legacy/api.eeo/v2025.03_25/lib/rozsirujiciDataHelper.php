<?php
/**
 * ============================================================================
 * 🔧 ROZSIRUJICI DATA HELPER - Centrální správa JSON dat
 * ============================================================================
 * 
 * Utility funkce pro bezpečnou práci s polem rozsirujici_data v tabulkách.
 * Zajišťuje že se data MERGUJÍ, ne přepisují.
 * 
 * Používá se napříč všemi moduly (faktury, objednávky, roční poplatky, atd.)
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

/**
 * Načte a dekóduje rozsirujici_data z entity
 * 
 * @param PDO $pdo Database connection
 * @param string $table Název tabulky (použij konstanty TBL_*)
 * @param int $entityId ID entity
 * @return array Dekódovaná data nebo prázdné pole
 */
function getRozsirujiciData($pdo, $table, $entityId) {
    $stmt = $pdo->prepare("SELECT rozsirujici_data FROM `$table` WHERE id = :id");
    $stmt->execute(['id' => $entityId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$result || empty($result['rozsirujici_data'])) {
        return [];
    }
    
    $decoded = json_decode($result['rozsirujici_data'], true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Merguje nová data do existujících rozsirujici_data
 * 
 * @param array $existingData Existující data (pole)
 * @param array $newData Nová data k přidání/aktualizaci
 * @param bool $deepMerge Použít hluboké sloučení (default: true)
 * @return array Sloučená data
 */
function mergeRozsirujiciData($existingData, $newData, $deepMerge = true) {
    if (!is_array($existingData)) {
        $existingData = [];
    }
    if (!is_array($newData)) {
        $newData = [];
    }
    
    if ($deepMerge) {
        return array_merge_recursive($existingData, $newData);
    } else {
        return array_merge($existingData, $newData);
    }
}

/**
 * Aktualizuje rozsirujici_data entity s mergováním
 * 
 * @param PDO $pdo Database connection
 * @param string $table Název tabulky (použij konstanty TBL_*)
 * @param int $entityId ID entity
 * @param array $newData Nová data k přidání/sloučení
 * @param array $additionalUpdates Další pole k aktualizaci ['field' => 'value']
 * @param int $userId ID uživatele provádějícího změnu
 * @return bool Success
 * 
 * @example
 * updateRozsirujiciData(
 *     $pdo, 
 *     TBL_FAKTURY, 
 *     123, 
 *     ['rocni_poplatek' => ['id' => 5, 'nazev' => 'Energie']],
 *     ['aktualizoval_uzivatel_id' => 1],
 *     1
 * );
 */
function updateRozsirujiciData($pdo, $table, $entityId, $newData, $additionalUpdates = [], $userId = null) {
    // Načíst existující data
    $existingData = getRozsirujiciData($pdo, $table, $entityId);
    
    // Mergovat s novými daty
    $mergedData = mergeRozsirujiciData($existingData, $newData);
    
    // Sestavit UPDATE query
    $fields = ['rozsirujici_data = :rozsirujici_data'];
    $params = [
        'id' => $entityId,
        'rozsirujici_data' => json_encode($mergedData)
    ];
    
    // Přidat další pole k aktualizaci
    foreach ($additionalUpdates as $field => $value) {
        $fields[] = "$field = :$field";
        $params[$field] = $value;
    }
    
    // Přidat timestamp pokud existuje sloupec dt_aktualizace
    $fields[] = 'dt_aktualizace = :dt_aktualizace';
    $params['dt_aktualizace'] = date('Y-m-d H:i:s');
    
    // Přidat user_id pokud je poskytnut
    if ($userId !== null) {
        $fields[] = 'aktualizoval_uzivatel_id = :user_id';
        $params['user_id'] = $userId;
    }
    
    $sql = "UPDATE `$table` SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    
    return $stmt->execute($params);
}

/**
 * Přidá nebo aktualizuje specifický klíč v rozsirujici_data
 * 
 * @param PDO $pdo Database connection
 * @param string $table Název tabulky
 * @param int $entityId ID entity
 * @param string $key Klíč v rozsirujici_data (např. 'rocni_poplatek')
 * @param mixed $value Hodnota k uložení
 * @param int|null $userId ID uživatele
 * @return bool Success
 * 
 * @example
 * setRozsirujiciDataKey(
 *     $pdo, 
 *     TBL_FAKTURY, 
 *     123, 
 *     'rocni_poplatek', 
 *     ['id' => 5, 'rok' => 2026],
 *     1
 * );
 */
function setRozsirujiciDataKey($pdo, $table, $entityId, $key, $value, $userId = null) {
    $newData = [$key => $value];
    return updateRozsirujiciData($pdo, $table, $entityId, $newData, [], $userId);
}

/**
 * Získá specifický klíč z rozsirujici_data
 * 
 * @param PDO $pdo Database connection
 * @param string $table Název tabulky
 * @param int $entityId ID entity
 * @param string $key Klíč k načtení
 * @param mixed $default Výchozí hodnota pokud klíč neexistuje
 * @return mixed Hodnota klíče nebo $default
 */
function getRozsirujiciDataKey($pdo, $table, $entityId, $key, $default = null) {
    $data = getRozsirujiciData($pdo, $table, $entityId);
    return isset($data[$key]) ? $data[$key] : $default;
}

/**
 * Odebere klíč z rozsirujici_data
 * 
 * @param PDO $pdo Database connection
 * @param string $table Název tabulky
 * @param int $entityId ID entity
 * @param string $key Klíč k odebrání
 * @param int|null $userId ID uživatele
 * @return bool Success
 */
function removeRozsirujiciDataKey($pdo, $table, $entityId, $key, $userId = null) {
    $existingData = getRozsirujiciData($pdo, $table, $entityId);
    
    if (isset($existingData[$key])) {
        unset($existingData[$key]);
        
        $params = [
            'id' => $entityId,
            'rozsirujici_data' => json_encode($existingData),
            'dt_aktualizace' => date('Y-m-d H:i:s')
        ];
        
        $fields = [
            'rozsirujici_data = :rozsirujici_data',
            'dt_aktualizace = :dt_aktualizace'
        ];
        
        if ($userId !== null) {
            $fields[] = 'aktualizoval_uzivatel_id = :user_id';
            $params['user_id'] = $userId;
        }
        
        $sql = "UPDATE `$table` SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute($params);
    }
    
    return true; // Klíč už neexistuje
}

/**
 * Zkontroluje jestli entity má specifický klíč v rozsirujici_data
 * 
 * @param PDO $pdo Database connection
 * @param string $table Název tabulky
 * @param int $entityId ID entity
 * @param string $key Klíč k ověření
 * @return bool True pokud klíč existuje
 */
function hasRozsirujiciDataKey($pdo, $table, $entityId, $key) {
    $data = getRozsirujiciData($pdo, $table, $entityId);
    return isset($data[$key]);
}

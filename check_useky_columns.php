<?php
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/config.php';

try {
    $db = get_db($config);
    $result = $db->query('SHOW COLUMNS FROM 25_useky');
    
    echo "=== SLOUPCE V TABULCE 25_useky ===\n";
    while($row = $result->fetch(PDO::FETCH_ASSOC)) {
        echo $row['Field'] . " - " . $row['Type'] . "\n";
    }
    
    echo "\n=== SAMPLE DATA ===\n";
    $result2 = $db->query('SELECT * FROM 25_useky LIMIT 3');
    while($row = $result2->fetch(PDO::FETCH_ASSOC)) {
        print_r($row);
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

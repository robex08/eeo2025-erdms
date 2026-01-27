<?php
/**
 * Test annual-fees/list endpoint - lokální test bez HTTP
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesHandlers.php';

echo "=== Test Annual Fees List ===\n\n";

try {
    // Získání PDO připojení
    $pdo = get_db();
    if (!$pdo) {
        die("❌ Chyba: Nelze získat PDO připojení\n");
    }
    echo "✅ PDO připojení OK\n";

    // Simulace uživatele (minimální data)
    $user = [
        'id' => 1,
        'username' => 'test'
    ];

    // Testovací input data (prázdné filtry)
    $input = [
        'page' => 1,
        'limit' => 10
    ];

    echo "📡 Volám handleAnnualFeesList()...\n";
    
    $result = handleAnnualFeesList($pdo, $input, $user);
    
    echo "\n✅ Výsledek:\n";
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    echo "\n";

} catch (Exception $e) {
    echo "\n❌ FATAL ERROR:\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}

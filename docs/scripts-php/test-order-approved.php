<?php
/**
 * Test ORDER_APPROVED notifikace
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "════════════════════════════════════════════════════════════════\n";
echo "🧪 TEST: ORDER_APPROVED Notifikace\n";
echo "════════════════════════════════════════════════════════════════\n\n";

$dbConfig = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

try {
    $dsn = "mysql:host={$dbConfig['mysql']['host']};dbname={$dbConfig['mysql']['database']};charset=utf8mb4";
    $db = new PDO($dsn, $dbConfig['mysql']['username'], $dbConfig['mysql']['password']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Připojeno k DB\n\n";
    
    // Najít objednávku
    $stmt = $db->query("SELECT id, cislo_objednavky, objednatel_id, prikazce_id, garant_uzivatel_id, stav_workflow_kod 
                        FROM 25a_objednavky 
                        WHERE id = 11476");
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        die("❌ Objednávka 11476 nenalezena!\n");
    }
    
    echo "✅ Objednávka: {$order['cislo_objednavky']} (ID: {$order['id']})\n";
    echo "   Objednatel: {$order['objednatel_id']}\n";
    echo "   Příkazce: {$order['prikazce_id']}\n";
    echo "   Garant: {$order['garant_uzivatel_id']}\n\n";
    
    // Načíst notifikace handler
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php';
    
    echo "Volám notificationRouter()...\n";
    echo "   Event Type: ORDER_APPROVED\n";
    echo "   Object ID: {$order['id']}\n";
    echo "   Trigger User ID: {$order['prikazce_id']}\n\n";
    
    // Zavolat notificationRouter
    $result = notificationRouter(
        $db,
        'ORDER_APPROVED',
        $order['id'],
        $order['prikazce_id'], // Příkazce schválil
        []
    );
    
    echo "\n════════════════════════════════════════════════════════════════\n";
    echo "VÝSLEDEK\n";
    echo "════════════════════════════════════════════════════════════════\n";
    echo "   Success: " . ($result['success'] ? '✅ ANO' : '❌ NE') . "\n";
    echo "   Sent: {$result['sent']} notifikací\n";
    
    if (!empty($result['errors'])) {
        echo "   Errors:\n";
        foreach ($result['errors'] as $error) {
            echo "      - $error\n";
        }
    }
    
} catch (Exception $e) {
    echo "\n❌ FATAL ERROR:\n";
    echo "   " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . "\n";
    echo "   Line: " . $e->getLine() . "\n\n";
    echo "Stack trace:\n";
    echo $e->getTraceAsString() . "\n";
}

<?php
/**
 * Simulace skutečného triggeru notifikace pro Order 11487
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include API files
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/db.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/helpers.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php';

$config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

echo "🔔 Simulace triggeru notifikace pro Order 11487\n";
echo "════════════════════════════════════════════════\n\n";

// Připojení k DB
$db = get_db($config);
if (!$db) {
    die("❌ DB connection failed\n");
}

echo "✅ DB connected\n\n";

// Parametry z frontendu
$eventType = 'ORDER_SENT_FOR_APPROVAL';
$objectId = 11487;
$triggerUserId = 100;
$placeholderData = [
    'order_number' => 'O-2027/75030926/2025/IT',
    'order_subject' => 'Nákup UPS pro VS',
    'commander_id' => 1,
    'garant_id' => '100',
    'creator_id' => 100,
];

echo "📊 Parametry:\n";
echo "   Event Type: $eventType\n";
echo "   Object ID: $objectId\n";
echo "   Trigger User ID: $triggerUserId\n";
echo "   Placeholder Data: " . json_encode($placeholderData, JSON_UNESCAPED_UNICODE) . "\n\n";

try {
    echo "🚀 Volám notificationRouter()...\n\n";
    
    $result = notificationRouter($db, $eventType, $objectId, $triggerUserId, $placeholderData);
    
    echo "\n════════════════════════════════════════════════\n";
    echo "📊 VÝSLEDEK:\n";
    echo "   Success: " . ($result['success'] ? 'YES' : 'NO') . "\n";
    echo "   Sent: {$result['sent']}\n";
    
    if (!empty($result['errors'])) {
        echo "   Errors:\n";
        foreach ($result['errors'] as $error) {
            echo "      • $error\n";
        }
    }
    echo "════════════════════════════════════════════════\n";
    
} catch (Exception $e) {
    echo "\n❌ EXCEPTION: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . "\n";
    echo "   Line: " . $e->getLine() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
}

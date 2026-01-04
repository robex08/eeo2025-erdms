<?php
// Test deduplication logic
$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8', 'erdms_user', 'AhchohTahnoh7eim', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

echo "Testing notification deduplication logic...\n";
echo "============================================\n";

$objectId = 11541; // O-0029
$eventType = 'ORDER_APPROVED';

// Simulate first call
$stmt = $pdo->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
$stmt->execute(['notificationRouter START', json_encode([
    'event' => $eventType,
    'object_id' => $objectId,
    'trigger_user' => 1,
    'placeholder_count' => 0,
    'called_by' => 'orderV2Endpoints.php::handleOrderUpdate'
])]);

echo "✅ Inserted first call log\n";

// Wait a second
sleep(1);

// Simulate second call
$stmt->execute(['notificationRouter START', json_encode([
    'event' => $eventType,
    'object_id' => $objectId,
    'trigger_user' => 1,
    'placeholder_count' => 2,
    'called_by' => 'api.php::handle_notifications_trigger'
])]);

echo "✅ Inserted second call log\n";

// Test deduplication query
$stmt = $pdo->prepare("
    SELECT dt_created, data 
    FROM debug_notification_log 
    WHERE message = 'notificationRouter START' 
    AND data LIKE CONCAT('%\"object_id\":', ?, '%')
    AND data LIKE CONCAT('%\"event\":\"', ?, '\"%')
    AND dt_created >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
    ORDER BY dt_created DESC 
    LIMIT 2
");
$stmt->execute([$objectId, $eventType]);
$recentCalls = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "\nFound " . count($recentCalls) . " recent calls:\n";
foreach ($recentCalls as $idx => $call) {
    $data = json_decode($call['data'], true);
    echo "  " . ($idx + 1) . ". " . $call['dt_created'] . " - " . ($data['called_by'] ?? 'unknown') . "\n";
}

if (count($recentCalls) >= 2) {
    echo "\n❌ DUPLICATE DETECTED - would skip second call\n";
} else {
    echo "\n✅ No duplicates - would process normally\n";
}

echo "\nCleaning up test data...\n";
$pdo->prepare("DELETE FROM debug_notification_log WHERE data LIKE CONCAT('%\"object_id\":', ?, '%')")->execute([$objectId]);
echo "✅ Cleanup done\n";
?>
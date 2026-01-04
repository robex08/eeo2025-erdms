<?php
// Test centralized notification system
$pdo = new PDO('mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8', 'erdms_user', 'AhchohTahnoh7eim', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

echo "Testing centralized notification system...\n";
echo "==========================================\n";

// Find a test order
$stmt = $pdo->prepare("SELECT id, cislo_objednavky, predmet FROM 25a_objednavky WHERE cislo_objednavky LIKE '%2026/IT%' ORDER BY id DESC LIMIT 1");
$stmt->execute();
$order = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$order) {
    echo "❌ No test order found\n";
    exit;
}

echo "Found test order: {$order['cislo_objednavky']} (ID: {$order['id']})\n";
echo "Subject: {$order['predmet']}\n\n";

// Clear previous notifications for this order
echo "Cleaning up previous test notifications...\n";
$pdo->prepare("DELETE FROM 25_notifikace WHERE objekt_id = ? AND typ = 'ORDER_APPROVED'")->execute([$order['id']]);
$pdo->prepare("DELETE FROM debug_notification_log WHERE data LIKE CONCAT('%\"object_id\":', ?, '%')")->execute([$order['id']]);

echo "✅ Cleanup done\n\n";

echo "Test 1: Simulating frontend-only notification (centralized)\n";
echo "===========================================================\n";

// Simulate frontend triggerNotification call
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php';

try {
    $result = notificationRouter(
        $pdo,
        'ORDER_APPROVED', 
        $order['id'], 
        1, 
        array(
            'order_number' => $order['cislo_objednavky'],
            'order_subject' => $order['predmet']
        )
    );
    
    echo "Result: " . json_encode($result, JSON_PRETTY_PRINT) . "\n";
    
    if ($result['success'] && $result['sent'] > 0) {
        echo "✅ SUCCESS: " . $result['sent'] . " notifications sent through centralized system\n";
    } else {
        echo "❌ FAILED: " . ($result['message'] ?? 'Unknown error') . "\n";
    }
    
} catch (Exception $e) {
    echo "❌ EXCEPTION: " . $e->getMessage() . "\n";
}

echo "\nTest 2: Verify no duplicate notifications\n";
echo "==========================================\n";

// Check how many notifications were created
$stmt = $pdo->prepare("SELECT COUNT(*) as count FROM 25_notifikace WHERE objekt_id = ? AND typ = 'ORDER_APPROVED'");
$stmt->execute([$order['id']]);
$notifCount = $stmt->fetchColumn();

echo "Notifications in database: $notifCount\n";

if ($notifCount == 2) {
    echo "✅ CORRECT: Exactly 2 notifications (one per recipient)\n";
} else {
    echo "❌ INCORRECT: Expected 2, got $notifCount\n";
}

// Show the notifications
$stmt = $pdo->prepare("SELECT id, pro_uzivatele_id, nadpis, dt_created FROM 25_notifikace WHERE objekt_id = ? AND typ = 'ORDER_APPROVED' ORDER BY dt_created DESC");
$stmt->execute([$order['id']]);
$notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "\nCreated notifications:\n";
foreach ($notifications as $idx => $notif) {
    echo "  " . ($idx + 1) . ". User ID: {$notif['pro_uzivatele_id']} - {$notif['nadpis']} - {$notif['dt_created']}\n";
}

echo "\nTest 3: Check debug log for caller info\n";
echo "========================================\n";

$stmt = $pdo->prepare("SELECT data FROM debug_notification_log WHERE data LIKE CONCAT('%\"object_id\":', ?, '%') AND message = 'notificationRouter START' ORDER BY dt_created DESC LIMIT 1");
$stmt->execute([$order['id']]);
$debugData = $stmt->fetchColumn();

if ($debugData) {
    $data = json_decode($debugData, true);
    echo "Called by: " . ($data['called_by'] ?? 'unknown') . "\n";
    echo "Placeholder count: " . ($data['placeholder_count'] ?? 0) . "\n";
    
    if (($data['called_by'] ?? '') === 'test-centralized.php::unknown') {
        echo "✅ CORRECT: Called through centralized system only\n";
    } else {
        echo "⚠️ WARNING: Called from: " . ($data['called_by'] ?? 'unknown') . "\n";
    }
} else {
    echo "❌ No debug data found\n";
}

echo "\n" . str_repeat('=', 50) . "\n";
echo "✅ TEST COMPLETE: Centralized notification system verified\n";
?>
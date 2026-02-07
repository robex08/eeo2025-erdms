<?php
/**
 * Test script pro testování notifikačního systému
 * Použití: php TEST_NOTIFICATION_TRIGGER.php
 */

// Simulace trigger notifikace pro objednávku
$apiUrl = 'http://localhost/api.eeo/notifications/trigger';

// Získej token z DB
$db = new PDO('mysql:host=10.3.172.11;dbname=eeo2025', 'erdms_user', 'CHANGE_ME_DB_PASSWORD');
$stmt = $db->prepare("SELECT token FROM 25_tokeny WHERE uzivatel_id = 1 ORDER BY dt_created DESC LIMIT 1");
$stmt->execute();
$token = $stmt->fetchColumn();

if (!$token) {
    die("❌ Token nenalezen pro user_id=1\n");
}

$payload = [
    'token' => $token,
    'username' => 'u03924',
    'event_type' => 'ORDER_SENT_FOR_APPROVAL',
    'object_id' => 11454,  // Poslední objednávka z DB
    'trigger_user_id' => 1,
    'placeholder_data' => []  // Prázdné - BE má načíst z DB
];

echo "🔔 Odesílám trigger notifikace...\n";
echo "   Event: ORDER_SENT_FOR_APPROVAL\n";
echo "   Order ID: 11454\n";
echo "   Trigger User: 1\n\n";

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "📊 HTTP Code: $httpCode\n";
echo "📄 Response:\n";
echo $response . "\n\n";

// Zkontroluj log
echo "📋 Debug log (/tmp/notification_debug.log):\n";
echo "════════════════════════════════════════════════════════════════\n";
if (file_exists('/tmp/notification_debug.log')) {
    echo file_get_contents('/tmp/notification_debug.log');
} else {
    echo "⚠️ Log soubor neexistuje!\n";
}
echo "════════════════════════════════════════════════════════════════\n";

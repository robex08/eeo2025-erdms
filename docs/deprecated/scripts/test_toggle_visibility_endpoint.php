<?php
/**
 * Test endpointu users/toggle-visibility
 * Pro debug účely
 */

echo "🔵 TEST: users/toggle-visibility endpoint\n";
echo str_repeat("=", 80) . "\n";

// Test data
$base_url = 'http://localhost/dev/api.eeo';
$token = 'base64_encoded_token'; // Zde by musel být skutečný token
$username = 'admin';

// Test payload
$data = [
    'token' => $token,
    'username' => $username,
    'user_id' => 1,
    'viditelny_v_tel_seznamu' => 0  // Zkusíme skrýt
];

echo "🔧 Test URL: $base_url/users/toggle-visibility\n";
echo "📋 Test Payload:\n";
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

echo "ℹ️ POZNÁMKA: Tento test pouze zobrazuje strukturu požadavku.\n";
echo "Pro skutečný test je potřeba:\n";
echo "1. Platný token z přihlášení\n";
echo "2. Spuštění přes webový server (Apache)\n";
echo "3. Volání endpointu přes HTTP POST\n\n";

echo "✅ Test struktury dokončen - endpoint by měl být připraven na použití.\n";
?>
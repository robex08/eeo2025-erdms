<?php
/**
 * Debug script pro testování Spisovka zpracování API
 */

// Simulace správného API volání
$api_url = 'https://eeo.zachranka.cz/api.eeo/spisovka-zpracovani/list';

// Test data (nahraďte skutečným tokenem a username)
$test_data = [
    'username' => 'SKUTECNY_USERNAME',  // ← EDIT THIS
    'token' => 'SKUTECNY_TOKEN',       // ← EDIT THIS
    'limit' => 100,
    'offset' => 0
];

echo "🧪 Testing Spisovka zpracování API...\n\n";
echo "URL: $api_url\n";
echo "Request data: " . json_encode($test_data, JSON_PRETTY_PRINT) . "\n\n";

// Initialize cURL
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $api_url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($test_data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For development only

// Execute request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);

curl_close($ch);

echo "📡 RESPONSE:\n";
echo "HTTP Code: $http_code\n";

if ($curl_error) {
    echo "❌ cURL Error: $curl_error\n";
} else {
    echo "✅ Response Body:\n";
    
    // Try to decode JSON
    $decoded = json_decode($response, true);
    if ($decoded) {
        echo json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    } else {
        echo "Raw response (not JSON):\n";
        echo $response . "\n";
    }
}

echo "\n🔍 DEBUGGING TIPS:\n";
echo "- Endpoint is routed in: /api.eeo/api.php line ~5331\n";
echo "- Handler is: handle_spisovka_zpracovani_list()\n";
echo "- File: /api.eeo/v2025.03_25/lib/spisovkaZpracovaniEndpoints.php\n";
echo "- Check error logs: /tmp/php_errors.log\n";
echo "- Debug table: eeo2025.debug_api_log\n";
?>
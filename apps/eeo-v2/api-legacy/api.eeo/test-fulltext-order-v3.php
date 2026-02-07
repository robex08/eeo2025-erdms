<?php
/**
 * Test Order V3 Fulltext Search
 * Kontrola, zda nový rozšířený fulltext search funguje bez chyb
 */

require_once __DIR__ . '/v2025.03_25/lib/orderV3Handlers.php';

echo "🔍 TESTING ORDER V3 FULLTEXT SEARCH...\n";

// Test data
$test_input = [
    'token' => 'test_token',
    'username' => 'test_user',
    'filters' => [
        'fulltext_search' => 'test'  // Simple test term
    ],
    'page' => 1,
    'per_page' => 10,
    'period' => 'all'
];

$test_config = [
    'db_host' => '10.3.172.11',
    'db_user' => 'erdms_user',
    'db_password' => 'AhchohTahnoh7eim',
    'db_name' => 'EEO-OSTRA-DEV',
    'db_charset' => 'utf8mb4'
];

echo "📋 Test parametry:\n";
echo "- Fulltext search: '{$test_input['filters']['fulltext_search']}'\n";
echo "- Page: {$test_input['page']}\n";
echo "- Per page: {$test_input['per_page']}\n\n";

try {
    // Disable authentication for testing
    $_SERVER['REQUEST_METHOD'] = 'POST';
    
    // Mock token verification (simplified for testing)
    function verify_token($token) {
        return ['username' => 'test_user', 'user_id' => 1];
    }
    
    echo "🚀 Spouštím test...\n";
    
    // This should not throw parameter mismatch error
    ob_start();
    handle_order_v3_list($test_input, $test_config);
    $output = ob_get_clean();
    
    echo "✅ Test ÚSPĚŠNÝ - žádná SQL parameter chyba!\n";
    
    // Try to decode the JSON response
    $response = json_decode($output, true);
    if ($response) {
        echo "📊 Response status: " . ($response['status'] ?? 'unknown') . "\n";
        if (isset($response['data'])) {
            echo "📦 Data count: " . count($response['data']) . "\n";
        }
        if (isset($response['message'])) {
            echo "💬 Message: " . $response['message'] . "\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Test FAILED: " . $e->getMessage() . "\n";
    echo "📍 File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n🏁 Test dokončen\n";
?>
<?php
/**
 * Test API endpointů přímo v PHP bez HTTP
 */

echo "🔍 API ENDPOINTS PHP TEST\n";
echo "======================================================================\n\n";

// Simuluj request
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REQUEST_URI'] = '/dev/api.eeo/user/login';
$_POST = array();

// Test data
$test_input = [
    'username' => 'admin',
    'password' => 'test123'
];

echo "📡 Simulating POST to /dev/api.eeo/user/login\n";
echo "📊 Input data: " . json_encode($test_input) . "\n\n";

try {
    // Načti celé API
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/api.php';
    
} catch (Exception $e) {
    echo "❌ API Load Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "   Stack:\n" . $e->getTraceAsString() . "\n";
}

echo "\n======================================================================\n";
echo "🎯 API TEST COMPLETED\n";
?>
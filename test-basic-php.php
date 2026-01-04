<?php
/**
 * Základní PHP test - kontrola syntax
 */

echo "🔍 BASIC PHP SYNTAX TEST\n";
echo "======================================================================\n\n";

echo "✅ PHP version: " . phpversion() . "\n";

// Test základních PHP funkcí
if (function_exists('json_encode')) {
    echo "✅ JSON functions available\n";
} else {
    echo "❌ JSON functions NOT available\n";
}

if (class_exists('PDO')) {
    echo "✅ PDO class available\n";
} else {
    echo "❌ PDO class NOT available\n";
}

if (function_exists('curl_init')) {
    echo "✅ cURL functions available\n";
} else {
    echo "❌ cURL functions NOT available\n";
}

// Test souboru orderV2Endpoints.php
$orderFile = __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php';

if (file_exists($orderFile)) {
    echo "✅ OrderV2Endpoints.php exists\n";
    
    // Test syntax
    $output = array();
    $return_var = 0;
    exec("php -l " . escapeshellarg($orderFile), $output, $return_var);
    
    if ($return_var === 0) {
        echo "✅ OrderV2Endpoints.php syntax OK\n";
    } else {
        echo "❌ OrderV2Endpoints.php syntax ERROR:\n";
        echo implode("\n", $output) . "\n";
    }
} else {
    echo "❌ OrderV2Endpoints.php NOT found\n";
}

echo "\n======================================================================\n";
echo "🎯 BASIC PHP TEST COMPLETED\n";
?>
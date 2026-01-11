<?php
/**
 * Test pro toggle visibility endpoint
 */

// Předstírej POST request
$_SERVER['REQUEST_METHOD'] = 'POST';

// Simulace vstupních dat
$input = [
    'token' => 'admin|1735999999',  // Test token pro admin uživatele
    'username' => 'admin',
    'user_id' => 1,
    'viditelny_v_tel_seznamu' => 0  // Zkusíme schovat zaměstnance
];

// Load configuration
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/api.php';  // Pro konstanty
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';

// Test funkce
$config = get_db_config_from_env();
$queries = [];  // Není potřeba pro tento test

echo "🔵 TEST: Toggle visibility endpoint\n";
echo str_repeat("=", 50) . "\n";

try {
    // Spusť handler
    ob_start();
    handle_users_toggle_visibility($input, $config, $queries);
    $output = ob_get_clean();
    
    echo "✅ Handler response:\n";
    echo $output . "\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
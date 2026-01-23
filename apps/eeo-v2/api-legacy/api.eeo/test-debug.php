<?php
// Test DEBUG logování pro DEV prostředí

// Test 1: error_log
error_log("=== DEBUG TEST START ===");
error_log("Test message 1: Basic error_log function");

// Test 2: Warning
trigger_error("Test Warning: Tento warning by měl být v logu", E_USER_WARNING);

// Test 3: Notice (simulace undefined variable)
// @$undefined_var = $some_undefined_variable;

// Test 4: Info o PHP konfiguraci
error_log("PHP Error Log Path: " . ini_get('error_log'));
error_log("Error Reporting Level: " . ini_get('error_reporting'));
error_log("Display Errors: " . ini_get('display_errors'));
error_log("Log Errors: " . ini_get('log_errors'));
error_log("PHP_DEBUG_MODE ENV: " . ($_ENV['PHP_DEBUG_MODE'] ?? 'not set'));

error_log("=== DEBUG TEST END ===");

// Vrátit JSON odpověď
header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'message' => 'Debug test completed',
    'php_version' => PHP_VERSION,
    'error_log' => ini_get('error_log'),
    'error_reporting' => ini_get('error_reporting'),
    'timestamp' => date('Y-m-d H:i:s')
]);
?>

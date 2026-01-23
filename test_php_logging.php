<?php
/**
 * TEST PHP LOGGING - DEV
 * Účel: Otestovat PHP error logging do /var/log/apache2/erdms-dev-php-error.log
 */

// Test 1: error_log() funkce
error_log("=== TEST PHP LOGGING START ===");
error_log("Čas: " . date('Y-m-d H:i:s'));
error_log("Script: " . __FILE__);

// Test 2: PHP info o error logu
$error_log = ini_get('error_log');
error_log("PHP error_log setting: " . ($error_log ?: 'NOT SET'));
error_log("log_errors: " . (ini_get('log_errors') ? 'ON' : 'OFF'));
error_log("display_errors: " . (ini_get('display_errors') ? 'ON' : 'OFF'));
error_log("error_reporting: " . ini_get('error_reporting'));

// Test 3: Vyvolání warningů a chyb
trigger_error("Test WARNING message", E_USER_WARNING);
trigger_error("Test NOTICE message", E_USER_NOTICE);

// Test 4: Try-catch error
try {
    throw new Exception("Test EXCEPTION message");
} catch (Exception $e) {
    error_log("Caught exception: " . $e->getMessage());
}

error_log("=== TEST PHP LOGGING END ===");

// Výstup pro browser
header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'Test dokončen - zkontroluj log soubor',
    'log_file' => $error_log ?: '/var/log/apache2/erdms-dev-php-error.log',
    'command' => 'tail -f /var/log/apache2/erdms-dev-php-error.log'
]);

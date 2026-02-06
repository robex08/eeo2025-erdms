<?php
/**
 * TEST DEBUG LOGGER
 */

// Musíme includovat api.php pro IS_DEV_ENV a debug_logger
require_once __DIR__ . '/api.php';

// Test 1: Jednoduchá zpráva
debug_log("Test 1: Jednoduchá zpráva");

// Test 2: Zpráva s daty
debug_log("Test 2: User login attempt", ['username' => 'testuser', 'ip' => '127.0.0.1']);

// Test 3: SQL query
debug_log_sql("SELECT * FROM users WHERE id = ?", [123], 0.025);

// Test 4: Exception
try {
    throw new Exception("Test exception message");
} catch (Exception $e) {
    debug_log_exception($e, "Test context");
}

// Test 5: Více zpráv
for ($i = 1; $i <= 3; $i++) {
    debug_log("Loop iteration $i", ['counter' => $i]);
}

debug_log("=== TEST COMPLETE ===");

// Přečti a vrať obsah logu
$log_file = '/var/www/erdms-dev/logs/php-debug.log';
$log_content = file_exists($log_file) ? file_get_contents($log_file) : 'Log soubor neexistuje';

header('Content-Type: text/plain; charset=utf-8');
echo "DEBUG LOGGER TEST RESULTS:\n";
echo "=========================\n\n";
echo "Log file: {$log_file}\n";
echo "File exists: " . (file_exists($log_file) ? 'YES' : 'NO') . "\n";
echo "File size: " . (file_exists($log_file) ? filesize($log_file) : 0) . " bytes\n\n";
echo "LOG CONTENT:\n";
echo "=========================\n";
echo $log_content;

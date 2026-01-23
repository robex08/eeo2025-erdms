<?php
/**
 * DIRECT FILE WRITE TEST - Bypass error_log()
 */

$log_file = '/var/log/apache2/erdms-dev-php-error.log';
$message = "[" . date('Y-m-d H:i:s') . "] DIRECT WRITE TEST - From PHP script\n";

// Test 1: file_put_contents
$result = file_put_contents($log_file, $message, FILE_APPEND);

// Test 2: error_log s cílem  3 (file append)
error_log($message, 3, $log_file);

// Test 3: Standardní error_log
error_log("Standard error_log() call - test 3");

// Test 4: fwrite
$fp = fopen($log_file, 'a');
if ($fp) {
    fwrite($fp, "[" . date('Y-m-d H:i:s') . "] fwrite TEST\n");
    fclose($fp);
}

header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'file_put_contents_result' => $result,
    'message' => 'Zkontroluj log soubor',
    'log_file' => $log_file
]);

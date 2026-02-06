<?php
// Minimální test pro debug cashbook-entry-delete
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

echo json_encode([
    'status' => 'debug',
    'message' => 'Test endpoint funguje',
    'php_version' => PHP_VERSION,
    'time' => date('Y-m-d H:i:s')
]);

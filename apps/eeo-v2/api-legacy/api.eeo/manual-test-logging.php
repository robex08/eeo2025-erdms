<?php
error_log("=== MANUAL TEST ===");
error_log("Timestamp: " . date('Y-m-d H:i:s'));
error_log("Error log path: " . ini_get('error_log'));
error_log("Error reporting: " . ini_get('error_reporting'));
echo json_encode([
    'status' => 'ok',
    'message' => 'Test log byl zapsán',
    'error_log' => ini_get('error_log'),
    'timestamp' => date('Y-m-d H:i:s')
]);
?>

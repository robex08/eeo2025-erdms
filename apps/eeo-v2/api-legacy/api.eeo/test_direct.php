<?php
/**
 * DIRECT TEST - PHP Error Logging
 */

error_log("=== DIRECT TEST LOGGING ===");
error_log("Time: " . date('Y-m-d H:i:s'));
error_log("PHP error_log: " . ini_get('error_log'));
error_log("log_errors: " . (ini_get('log_errors') ? 'ON' : 'OFF'));
error_log("=== END DIRECT TEST ===");

header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'Test direct logging',
    'log_file' => ini_get('error_log'),
    'check_command' => 'tail -f /var/log/apache2/erdms-dev-php-error.log'
]);

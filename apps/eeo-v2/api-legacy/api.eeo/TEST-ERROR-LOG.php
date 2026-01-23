<?php
// Testovací soubor - měl by logovat do /var/log/apache2/erdms-dev-php-error.log
error_log("========================================");
error_log("TEST Z PHP: " . date('Y-m-d H:i:s'));
error_log("Error log cesta: " . ini_get('error_log'));
error_log("Error reporting: " . ini_get('error_reporting'));
error_log("========================================");

header('Content-Type: application/json');
echo json_encode([
    'test' => 'ok',
    'time' => date('Y-m-d H:i:s'),
    'error_log' => ini_get('error_log'),
    'error_reporting' => ini_get('error_reporting')
]);
?>

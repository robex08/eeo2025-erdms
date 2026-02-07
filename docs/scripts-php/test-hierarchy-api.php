<?php
// Test hierarchy API přímo

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== TEST HIERARCHY API ===\n\n";

// Simulace API požadavku
$_SERVER['REQUEST_METHOD'] = 'POST';
$input = [
    'action' => 'hierarchy/users',
    'username' => 'admin',
    'token' => 'YWRtaW58MTc2NTQ0NzQwNg==' // Fresh token
];

// Načtení konfigurace
$VERSION = 'v2025.03_25';
$_config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/' . $VERSION . '/lib/dbconfig.php';
$config = $_config['mysql'];

echo "1. Config načten: {$config['database']}@{$config['host']}\n";

// PDO connection
try {
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password'],
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        )
    );
    echo "2. PDO připojeno\n";
} catch (PDOException $e) {
    die("PDO ERROR: " . $e->getMessage() . "\n");
}

// Načtení funkcí
require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/' . $VERSION . '/lib/handlers.php';
require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/' . $VERSION . '/lib/hierarchyHandlers.php';

echo "3. Handlers načteny\n";

// Zavolání funkce
echo "4. Volám handle_hierarchy_users_list()...\n\n";
$response = handle_hierarchy_users_list($input, $pdo);

echo "=== RESPONSE ===\n";
echo "Response type: " . gettype($response) . "\n";
echo "Response is array: " . (is_array($response) ? 'YES' : 'NO') . "\n";
if (is_array($response)) {
    echo "Response keys: " . implode(', ', array_keys($response)) . "\n";
    echo "Success: " . ($response['success'] ? 'true' : 'false') . "\n";
    if (isset($response['data'])) {
        echo "Data count: " . count($response['data']) . "\n";
        echo "First user: " . json_encode($response['data'][0] ?? 'N/A', JSON_UNESCAPED_UNICODE) . "\n";
    }
}
echo "\nFull JSON:\n";
$json = json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if ($json === false) {
    echo "JSON encode failed: " . json_last_error_msg() . "\n";
} else {
    echo $json . "\n";
}

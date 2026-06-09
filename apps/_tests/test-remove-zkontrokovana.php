<?php
/**
 * Test removeZkontrokovanaFromWorkflow() pro objednávku 960
 */

// Načíst .env ručně
$envFile = '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env';
$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

// Připojení k DB
$db = new PDO(
    "mysql:host=" . $_ENV['DB_HOST'] . ";port=" . $_ENV['DB_PORT'] . ";dbname=" . $_ENV['DB_NAME'] . ";charset=utf8mb4",
    $_ENV['DB_USER'],
    $_ENV['DB_PASSWORD'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// Definice konstant
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_FAKTURY', '25a_objednavky_faktury');
define('TBL_CISELNIK_STAVY', '25_ciselnik_stav_objednavky');

// Načíst knihovny - musí být v správném pořadí kvůli závislostem
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php'; // get_orders_table_name()
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderWorkflowHelpers.php';

echo "=== TEST removeZkontrokovanaFromWorkflow() ===\n\n";

$orderId = 960;

echo "PŘED:\n";
$stmt = $db->prepare("SELECT potvrzeni_dokonceni_objednavky, dokoncil_id, dt_dokonceni, stav_workflow_kod, stav_objednavky FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
$stmt->execute([$orderId]);
$before = $stmt->fetch(PDO::FETCH_ASSOC);
print_r($before);

echo "\nSpouštím removeZkontrokovanaFromWorkflow($orderId)...\n";
$result = removeZkontrokovanaFromWorkflow($db, $orderId);
echo "Výsledek: " . ($result ? "✅ SUCCESS" : "❌ FAILED") . "\n\n";

echo "PO:\n";
$stmt->execute([$orderId]);
$after = $stmt->fetch(PDO::FETCH_ASSOC);
print_r($after);

echo "\n=== KONEC TESTU ===\n";

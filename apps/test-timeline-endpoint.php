<?php
/**
 * Test timeline endpointu - přímé volání funkce
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

echo "🔍 Test timeline endpoint začíná...\n\n";

// Simulace $_SERVER proměnných pro POST request
$_SERVER['REQUEST_METHOD'] = 'POST';

// Includovat všechny potřebné soubory
echo "📚 Loading dependencies...\n";
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php';

// Načítat konstanty tabulek
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_FAKTURY', '25a_objednavky_faktury');

echo "✅ Dependencies loaded\n\n";

// Config
$config = [
    'db_host' => '10.3.172.11',
    'db_name' => 'EEO-OSTRA-DEV',
    'db_user' => 'erdms_user',
    'db_password' => 'CHANGE_ME_DB_PASSWORD',
    'db_charset' => 'utf8mb4'
];

// Test input
$input = [
    'token' => 'invalid_token_for_test',  // Neplatný token - měl by vrátit 401
    'username' => 'admin',
    'year' => 2026
];

echo "📝 Calling handle_orderV3_timeline()...\n\n";

// Zavolat funkci
handle_orderV3_timeline($input, $config);

echo "\n\n✅ Test dokončen";

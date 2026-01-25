<?php
/**
 * Test script pro cashbook-lp-summary endpoint debugging
 */

// Simulace API environment
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REQUEST_URI'] = '/dev/api.eeo/cashbook-lp-summary';

// Načti konstanty a konfig z api.php
define('IS_DEV_ENV', true);
define('ENV_NAME', 'DEV');
define('VERSION', 'v2025.03_25');

// Table constants
define('TBL_UZIVATELE', '25_uzivatele');
define('TBL_ROLE', '25_role');
define('TBL_UZIVATELE_ROLE', '25_uzivatele_role');
define('TBL_ROLE_PRAVA', '25_role_prava');
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_LP_MASTER', '25_limitovane_prisliby');
define('TBL_LP_CERPANI', '25_limitovane_prisliby_cerpani');
define('TBL_POKLADNI_POLOZKY_DETAIL', '25a_pokladni_polozky_detail');
define('TBL_FAKTURY_LP_CERPANI', '25a_faktury_lp_cerpani');

// Načti handlers
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';

// Test vstupní data - použij reálný token z browseru
// !!! NAHRAĎ tímto: TVŮJ AKTUÁLNÍ TOKEN !!!
$test_token = 'YOUR_TOKEN_HERE';
$test_username = 'YOUR_USERNAME_HERE';

echo "=== TEST CASHBOOK-LP-SUMMARY AUTHENTICATION ===\n\n";

// Načti DB config
$_config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$config = $_config['mysql'];

// Test 1: Připojení k databázi
echo "1. Test DB připojení...\n";
try {
    $db = new PDO(
        "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password'],
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        )
    );
    echo "   ✅ DB připojeno: {$config['database']}\n\n";
} catch (Exception $e) {
    echo "   ❌ DB chyba: " . $e->getMessage() . "\n";
    exit(1);
}

// Test 2: Dekódování tokenu
echo "2. Test dekódování tokenu...\n";
$decoded = base64_decode($test_token);
if (!$decoded) {
    echo "   ❌ Neplatný base64 token\n";
    exit(1);
}
$parts = explode('|', $decoded);
if (count($parts) !== 2) {
    echo "   ❌ Špatný formát tokenu (očekává se: username|timestamp)\n";
    echo "   Dekódovaný token: $decoded\n";
    exit(1);
}
list($token_username, $timestamp) = $parts;
$now = time();
$age = $now - $timestamp;
echo "   Username: $token_username\n";
echo "   Timestamp: $timestamp (" . date('Y-m-d H:i:s', $timestamp) . ")\n";
echo "   Age: " . floor($age / 3600) . "h " . floor(($age % 3600) / 60) . "m\n";
echo "   Expired: " . ($age > 86400 ? 'ANO ❌' : 'NE ✅') . "\n\n";

// Test 3: Username match
echo "3. Test username match...\n";
if ($token_username !== $test_username) {
    echo "   ❌ Username nesedí!\n";
    echo "   Request: $test_username\n";
    echo "   Token:   $token_username\n\n";
} else {
    echo "   ✅ Username OK\n\n";
}

// Test 4: verify_token()
echo "4. Test verify_token()...\n";
$token_data = verify_token($test_token, $db);
if ($token_data) {
    echo "   ✅ verify_token: OK\n";
    echo "   User ID: {$token_data['id']}\n";
    echo "   Username: {$token_data['username']}\n\n";
} else {
    echo "   ❌ verify_token: FAILED\n\n";
    exit(1);
}

// Test 5: verify_token_v2()
echo "5. Test verify_token_v2()...\n";
$userData = verify_token_v2($test_username, $test_token, $db);
if ($userData) {
    echo "   ✅ verify_token_v2: OK\n";
    echo "   User ID: {$userData['id']}\n";
    echo "   Username: {$userData['username']}\n";
    echo "   Is Admin: " . ($userData['is_admin'] ? 'ANO' : 'NE') . "\n";
    echo "   Roles: " . (!empty($userData['roles']) ? implode(', ', $userData['roles']) : 'ŽÁDNÉ') . "\n\n";
} else {
    echo "   ❌ verify_token_v2: FAILED\n\n";
    exit(1);
}

// Test 6: Kontrola rolí v DB
echo "6. Test načtení rolí z DB...\n";
try {
    $stmt = $db->prepare("
        SELECT r.kod_role, r.nazev_role
        FROM " . TBL_ROLE . " r
        INNER JOIN " . TBL_UZIVATELE_ROLE . " ur ON ur.role_id = r.id
        WHERE ur.uzivatel_id = ?
    ");
    $stmt->execute(array($userData['id']));
    $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($roles)) {
        echo "   ⚠️ Uživatel nemá žádné role přiřazené\n\n";
    } else {
        echo "   ✅ Nalezené role:\n";
        foreach ($roles as $role) {
            echo "      - {$role['kod_role']}: {$role['nazev_role']}\n";
        }
        echo "\n";
    }
} catch (Exception $e) {
    echo "   ❌ Chyba při načítání rolí: " . $e->getMessage() . "\n\n";
}

echo "=== TEST COMPLETED ===\n";
echo "Pokud všechny testy prošly, problém není v autentizaci, ale někde jinde v endpointu.\n";

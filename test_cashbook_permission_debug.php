<?php
/**
 * DEBUG script pro cashbook permissions - user 53
 * Spustit: php test_cashbook_permission_debug.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include potřebné soubory
require_once(__DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/config.php');
require_once(__DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/db.php');
require_once(__DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/middleware/CashbookPermissions.php');
require_once(__DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/models/CashbookModel.php');

$config = get_api_config();
$db = get_db($config);

echo "=== CASHBOOK PERMISSION DEBUG FOR USER 53 ===\n\n";

// Simulovat userData pro user 53
$userData = array(
    'id' => 53,
    'username' => 'u06818',
    'usek_id' => 6
);

echo "1. User data:\n";
print_r($userData);
echo "\n";

// Vytvořit permissions objekt
$permissions = new CashbookPermissions($userData, $db);

echo "2. Permission checks:\n";
echo "   - isSuperAdmin(): " . ($permissions->isSuperAdmin() ? 'YES' : 'NO') . "\n";
echo "   - hasPermission('CASH_BOOK_MANAGE'): " . ($permissions->hasPermission('CASH_BOOK_MANAGE') ? 'YES' : 'NO') . "\n";
echo "   - hasPermission('CASH_BOOK_READ_ALL'): " . ($permissions->hasPermission('CASH_BOOK_READ_ALL') ? 'YES' : 'NO') . "\n";
echo "   - hasPermission('CASH_BOOK_READ_OWN'): " . ($permissions->hasPermission('CASH_BOOK_READ_OWN') ? 'YES' : 'NO') . "\n";
echo "\n";

// Načíst knihu ID=3
$bookModel = new CashbookModel($db);
$book = $bookModel->getBookById(3);

if ($book) {
    echo "3. Book data (ID=3):\n";
    echo "   - uzivatel_id: " . $book['uzivatel_id'] . " (type: " . gettype($book['uzivatel_id']) . ")\n";
    echo "   - pokladna_id: " . $book['pokladna_id'] . " (type: " . gettype($book['pokladna_id']) . ")\n";
    echo "   - rok/mesic: " . $book['rok'] . "/" . $book['mesic'] . "\n";
    echo "\n";
    
    echo "4. Comparison tests:\n";
    echo "   - book[uzivatel_id] == userData[id]: " . ($book['uzivatel_id'] == $userData['id'] ? 'TRUE' : 'FALSE') . "\n";
    echo "   - (int)book[uzivatel_id] == (int)userData[id]: " . ((int)$book['uzivatel_id'] == (int)$userData['id'] ? 'TRUE' : 'FALSE') . "\n";
    echo "   - book[uzivatel_id] === userData[id]: " . ($book['uzivatel_id'] === $userData['id'] ? 'TRUE' : 'FALSE') . "\n";
    echo "\n";
    
    echo "5. canReadCashbook() test:\n";
    $canRead = $permissions->canReadCashbook($book['uzivatel_id'], $book['pokladna_id']);
    echo "   - Result: " . ($canRead ? '✅ TRUE (ACCESS GRANTED)' : '❌ FALSE (ACCESS DENIED)') . "\n";
    echo "\n";
    
    if (!$canRead) {
        echo "6. Fallback checks:\n";
        echo "   - isOwnCashbox(pokladna_id={$book['pokladna_id']}): ";
        // Zavolat isOwnCashbox pomocí reflection, protože je private
        $reflection = new ReflectionClass($permissions);
        $method = $reflection->getMethod('isOwnCashbox');
        $method->setAccessible(true);
        $isOwn = $method->invoke($permissions, $book['pokladna_id']);
        echo ($isOwn ? 'YES' : 'NO') . "\n";
    }
} else {
    echo "❌ Book ID=3 not found!\n";
}

echo "\n=== END DEBUG ===\n";

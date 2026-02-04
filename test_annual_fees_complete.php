<?php
/**
 * TEST: Kompletní test Annual Fees permissions po opravě
 */

// Načtení konfigurace
$config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$config = $config['mysql'];

// Připojení k databázi
$pdo = new PDO(
    "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
    $config['username'],
    $config['password'],
    array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    )
);

// Načtení handlers
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesHandlers.php';

$test_user_id = 100;

echo "🧪 Test Annual Fees permissions pro user_id: {$test_user_id}\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Načtení user dat
$stmt = $pdo->prepare("SELECT id, username, jmeno, prijmeni FROM 25_uzivatele WHERE id = ?");
$stmt->execute([$test_user_id]);
$user_base = $stmt->fetch();

if (!$user_base) {
    echo "❌ Uživatel s ID {$test_user_id} neexistuje!\n";
    exit(1);
}

echo "👤 Uživatel: {$user_base['jmeno']} {$user_base['prijmeni']} ({$user_base['username']})\n\n";

// Načtení rolí
$stmt = $pdo->prepare("
    SELECT r.kod_role 
    FROM 25_role r
    INNER JOIN 25_uzivatele_role ur ON ur.role_id = r.id
    WHERE ur.uzivatel_id = ?
");
$stmt->execute([$test_user_id]);
$roles = $stmt->fetchAll(PDO::FETCH_COLUMN);

// Načtení oprávnění (OPRAVENÁ VERZE)
$stmt = $pdo->prepare("
    SELECT p.kod_prava, p.popis 
    FROM 25_role_prava rp
    INNER JOIN 25_prava p ON p.id = rp.pravo_id
    WHERE rp.user_id = ? AND rp.aktivni = 1
");
$stmt->execute([$test_user_id]);
$permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Sestavení user objektu
$user = array_merge($user_base, [
    'roles' => $roles,
    'permissions' => $permissions,
    'is_admin' => !empty(array_intersect($roles, ['SUPERADMIN', 'ADMINISTRATOR']))
]);

echo "📊 User data:\n";
echo "   Is Admin: " . ($user['is_admin'] ? 'YES' : 'NO') . "\n";
echo "   Roles: " . implode(', ', $user['roles'] ?: ['none']) . "\n";
echo "   Permissions count: " . count($user['permissions']) . "\n\n";

// Vypsat pouze ANNUAL_FEES permissions
echo "📜 ANNUAL_FEES permissions:\n";
$has_annual_fees = false;
foreach ($user['permissions'] as $perm) {
    if (strpos($perm['kod_prava'], 'ANNUAL_FEES_') === 0) {
        echo "   ✓ {$perm['kod_prava']}\n";
        $has_annual_fees = true;
    }
}
if (!$has_annual_fees) {
    echo "   (žádné)\n";
}
echo "\n";

// TEST permission checking functions
echo "🧪 Testování permission funkcí:\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$checks = [
    'isAnnualFeesAdmin($user)' => isAnnualFeesAdmin($user),
    'isAccountant($user)' => isAccountant($user),
    'hasAnnualFeesPermission($user, "ANNUAL_FEES_VIEW")' => hasAnnualFeesPermission($user, 'ANNUAL_FEES_VIEW'),
    'hasAnnualFeesPermission($user, "ANNUAL_FEES_ITEM_PAYMENT")' => hasAnnualFeesPermission($user, 'ANNUAL_FEES_ITEM_PAYMENT'),
    'canViewAnnualFees($user)' => canViewAnnualFees($user),
    'canMarkPaymentAnnualFees($user)' => canMarkPaymentAnnualFees($user),
];

foreach ($checks as $check_name => $result) {
    $icon = $result ? '✅' : '❌';
    $text = $result ? 'TRUE' : 'FALSE';
    echo "{$icon} {$check_name}: {$text}\n";
}

echo "\n";

if (canViewAnnualFees($user)) {
    echo "✅ ÚSPĚCH: Uživatel může zobrazit roční poplatky!\n";
    echo "   → Backend by měl vrátit 200 OK místo 403 Forbidden\n";
} else {
    echo "❌ PROBLÉM: Uživatel stále nemůže zobrazit roční poplatky!\n";
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ Test dokončen\n";

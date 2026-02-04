<?php
/**
 * TEST: Debug Annual Fees Permissions
 * 
 * Tento skript testuje permission checking pro Annual Fees
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

// Načtení handlers (které obsahují permission checking funkce)
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/annualFeesHandlers.php';

// TEST: Najdi uživatele s ANNUAL_FEES_ITEM_PAYMENT oprávněním
echo "🔍 Hledání uživatelů s ANNUAL_FEES_ITEM_PAYMENT oprávněním...\n\n";

$stmt = $pdo->prepare("
    SELECT 
        u.id,
        u.login,
        u.jmeno,
        u.prijmeni,
        p.kod_prava,
        p.nazev_prava
    FROM 25_uzivatele u
    INNER JOIN 25_uzivatele_prava up ON up.uzivatel_id = u.id
    INNER JOIN 25_prava p ON p.id = up.pravo_id
    WHERE p.kod_prava LIKE 'ANNUAL_FEES_%'
      AND up.aktivni = 1
      AND u.aktivni = 1
    ORDER BY u.id, p.kod_prava
");
$stmt->execute();
$results = $stmt->fetchAll();

$users_by_id = [];
foreach ($results as $row) {
    $user_id = $row['id'];
    if (!isset($users_by_id[$user_id])) {
        $users_by_id[$user_id] = [
            'id' => $row['id'],
            'login' => $row['login'],
            'name' => $row['jmeno'] . ' ' . $row['prijmeni'],
            'permissions' => []
        ];
    }
    $users_by_id[$user_id]['permissions'][] = [
        'kod_prava' => $row['kod_prava'],
        'nazev_prava' => $row['nazev_prava']
    ];
}

if (empty($users_by_id)) {
    echo "❌ Žádní uživatelé s ANNUAL_FEES_* oprávněními nenalezeni!\n";
    exit(1);
}

echo "📋 Nalezeno " . count($users_by_id) . " uživatelů s ANNUAL_FEES_* oprávněními:\n\n";

// Vyber prvního uživatele pro test
$test_user_data = reset($users_by_id);
$test_user_id = $test_user_data['id'];

foreach ($users_by_id as $user) {
    echo "👤 {$user['name']} ({$user['login']}) - ID: {$user['id']}\n";
    foreach ($user['permissions'] as $perm) {
        echo "   ✓ {$perm['kod_prava']} - {$perm['nazev_prava']}\n";
    }
    echo "\n";
}

// Načtení kompletního user objektu přes verify_token_v2
echo "🔐 Testování permission checkingu pro uživatele: {$test_user_data['name']}\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Načtení kompletních dat uživatele
$stmt = $pdo->prepare("
    SELECT 
        u.id,
        u.login as username,
        u.jmeno,
        u.prijmeni
    FROM 25_uzivatele u
    WHERE u.id = ?
");
$stmt->execute([$test_user_id]);
$user_base = $stmt->fetch();

// Načtení rolí
$stmt = $pdo->prepare("
    SELECT r.kod_role 
    FROM 25_role r
    INNER JOIN 25_uzivatele_role ur ON ur.role_id = r.id
    WHERE ur.uzivatel_id = ?
");
$stmt->execute([$test_user_id]);
$roles = $stmt->fetchAll(PDO::FETCH_COLUMN);

// Načtení oprávnění
$stmt = $pdo->prepare("
    SELECT p.kod_prava, p.nazev_prava, p.popis 
    FROM 25_uzivatele_prava up
    INNER JOIN 25_prava p ON p.id = up.pravo_id
    WHERE up.uzivatel_id = ? AND up.aktivni = 1
");
$stmt->execute([$test_user_id]);
$permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Sestavení user objektu
$user = array_merge($user_base, [
    'roles' => $roles,
    'permissions' => $permissions,
    'is_admin' => !empty(array_intersect($roles, ['SUPERADMIN', 'ADMINISTRATOR']))
]);

echo "📊 User object structure:\n";
echo "   ID: {$user['id']}\n";
echo "   Username: {$user['username']}\n";
echo "   Is Admin: " . ($user['is_admin'] ? 'YES' : 'NO') . "\n";
echo "   Roles: " . implode(', ', $user['roles'] ?: ['none']) . "\n";
echo "   Permissions count: " . count($user['permissions']) . "\n\n";

echo "📜 Permissions array:\n";
foreach ($user['permissions'] as $perm) {
    echo "   • {$perm['kod_prava']}\n";
}
echo "\n";

// TEST permission checking functions
echo "🧪 Testování permission checking funkcí:\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$checks = [
    'isAnnualFeesAdmin' => isAnnualFeesAdmin($user),
    'isAccountant' => isAccountant($user),
    'hasAnnualFeesPermission(ANNUAL_FEES_VIEW)' => hasAnnualFeesPermission($user, 'ANNUAL_FEES_VIEW'),
    'hasAnnualFeesPermission(ANNUAL_FEES_ITEM_PAYMENT)' => hasAnnualFeesPermission($user, 'ANNUAL_FEES_ITEM_PAYMENT'),
    'canViewAnnualFees' => canViewAnnualFees($user),
];

foreach ($checks as $check_name => $result) {
    $icon = $result ? '✅' : '❌';
    $text = $result ? 'TRUE' : 'FALSE';
    echo "{$icon} {$check_name}: {$text}\n";
}

echo "\n";

if (!canViewAnnualFees($user)) {
    echo "❌ PROBLÉM: canViewAnnualFees() vrací FALSE!\n";
    echo "\n🔍 Detailní analýza:\n\n";
    
    // Debug každé části podmínky
    $is_admin = isAnnualFeesAdmin($user);
    $is_accountant = isAccountant($user);
    
    echo "1. isAnnualFeesAdmin($user) = " . ($is_admin ? 'TRUE' : 'FALSE') . "\n";
    echo "2. isAccountant($user) = " . ($is_accountant ? 'TRUE' : 'FALSE') . "\n";
    
    $all_perms = [
        'ANNUAL_FEES_MANAGE',
        'ANNUAL_FEES_VIEW',
        'ANNUAL_FEES_EDIT',
        'ANNUAL_FEES_CREATE',
        'ANNUAL_FEES_DELETE',
        'ANNUAL_FEES_ITEM_CREATE',
        'ANNUAL_FEES_ITEM_UPDATE',
        'ANNUAL_FEES_ITEM_DELETE',
        'ANNUAL_FEES_ITEM_PAYMENT'
    ];
    
    echo "3. hasAnyAnnualFeesPermission() kontroluje:\n";
    $has_any = false;
    foreach ($all_perms as $perm) {
        $has_it = hasAnnualFeesPermission($user, $perm);
        echo "   " . ($has_it ? '✓' : '✗') . " {$perm}\n";
        if ($has_it) $has_any = true;
    }
    
    echo "\n   Má alespoň jedno oprávnění: " . ($has_any ? 'ANO' : 'NE') . "\n\n";
    
    if (!$is_admin && !$is_accountant && !$has_any) {
        echo "⚠️  ZÁVĚR: Uživatel nemá žádné z požadovaných oprávnění!\n";
    } else {
        echo "⚠️  ZÁVĚR: Logická chyba v canViewAnnualFees() nebo hasAnyAnnualFeesPermission()!\n";
    }
} else {
    echo "✅ ÚSPĚCH: canViewAnnualFees() vrací TRUE - uživatel by měl vidět roční poplatky!\n";
}

echo "\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ Test dokončen\n";

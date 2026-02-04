<?php
/**
 * TEST: Simulace verify_token_v2 po opravě
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

echo "🧪 Test simulace verify_token_v2 po opravě\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Simulace verify_token_v2 s OPRAVENOU logikou
$stmt = $pdo->prepare("SELECT id, username, jmeno, prijmeni FROM 25_uzivatele WHERE id = ?");
$stmt->execute([$test_user_id]);
$token_data = $stmt->fetch();

// Načtení rolí
$stmt = $pdo->prepare("
    SELECT r.kod_role 
    FROM 25_role r
    INNER JOIN 25_uzivatele_role ur ON ur.role_id = r.id
    WHERE ur.uzivatel_id = ?
");
$stmt->execute([$test_user_id]);
$roles = $stmt->fetchAll(PDO::FETCH_COLUMN);

// OPRAVENÉ načítání permissions z 25_role_prava
$stmt = $pdo->prepare("
    SELECT p.kod_prava, p.popis 
    FROM 25_role_prava rp
    INNER JOIN 25_prava p ON p.id = rp.pravo_id
    WHERE rp.user_id = ? AND rp.aktivni = 1
");
$stmt->execute([$test_user_id]);
$permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

$token_data['roles'] = $roles;
$token_data['permissions'] = $permissions;
$token_data['is_admin'] = !empty(array_intersect($roles, ['SUPERADMIN', 'ADMINISTRATOR']));

echo "👤 User: {$token_data['jmeno']} {$token_data['prijmeni']} ({$token_data['username']})\n";
echo "   ID: {$token_data['id']}\n";
echo "   Is Admin: " . ($token_data['is_admin'] ? 'YES' : 'NO') . "\n";
echo "   Roles: " . implode(', ', $token_data['roles'] ?: ['none']) . "\n\n";

echo "📜 Annual Fees Permissions:\n";
$annual_fees_perms = array_filter($permissions, function($p) {
    return strpos($p['kod_prava'], 'ANNUAL_FEES_') === 0;
});

if (empty($annual_fees_perms)) {
    echo "   (žádné)\n\n";
} else {
    foreach ($annual_fees_perms as $perm) {
        echo "   ✓ {$perm['kod_prava']}\n";
    }
    echo "\n";
}

// Test permission checks
echo "🧪 Permission Checks:\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$checks = [
    'canViewAnnualFees()' => canViewAnnualFees($token_data),
    'canEditAnnualFees()' => canEditAnnualFees($token_data),
    'canMarkPaymentAnnualFees()' => canMarkPaymentAnnualFees($token_data),
];

foreach ($checks as $name => $result) {
    $icon = $result ? '✅' : '❌';
    echo "{$icon} {$name}: " . ($result ? 'TRUE' : 'FALSE') . "\n";
}

echo "\n";

// Simulace update-item requestu (payment-only)
echo "📦 Simulace payment-only requestu:\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$paymentRequest = [
    'id' => 123,
    'stav' => 'ZAPLACENO',
    'datum_zaplaceno' => '2026-02-04',
    'cislo_dokladu' => 'F-2026-001',
    'token' => 'dummy_token',
    'username' => 'u03924'
];

// Simulace detekce payment-only
$paymentFields = ['id', 'stav', 'datum_zaplaceno', 'cislo_dokladu', 'datum_zaplaceni', 'faktura_id'];
$systemFields = ['token', 'username', 'aktualizoval_uzivatel_id', 'dt_aktualizace'];
$changedFields = array_keys($paymentRequest);
$relevantFields = array_diff($changedFields, $systemFields);
$nonPaymentFields = array_diff($relevantFields, $paymentFields);
$isOnlyPaymentChange = empty($nonPaymentFields);

echo "Posílaná pole: " . implode(', ', $changedFields) . "\n";
echo "Relevantní pole: " . implode(', ', $relevantFields) . "\n";
echo "Non-payment pole: " . implode(', ', $nonPaymentFields) . "\n";
echo "Je payment-only: " . ($isOnlyPaymentChange ? '✅ ANO' : '❌ NE') . "\n\n";

if ($isOnlyPaymentChange) {
    if (canMarkPaymentAnnualFees($token_data)) {
        echo "✅ Request by BYL POVOLEN (má PAYMENT právo)\n";
    } else {
        echo "❌ Request by byl ZAMÍTNUT (nemá PAYMENT právo)\n";
    }
} else {
    if (canEditAnnualFees($token_data)) {
        echo "✅ Request by BYL POVOLEN (má EDIT právo)\n";
    } else {
        echo "❌ Request by byl ZAMÍTNUT (nemá EDIT právo)\n";
    }
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ Test dokončen\n";

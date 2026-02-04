<?php
/**
 * TEST: Simulace verify_token_v2 s opraveným načítáním permissions
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

// Načtení konstant
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php';

// Test uživatele s ID 100 (který má ANNUAL_FEES permissions)
$test_user_id = 100;

echo "🧪 Test načítání permissions pro user_id: {$test_user_id}\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// STARÁ VERZE (nefunkční)
echo "❌ STARÁ VERZE (25_uzivatele_prava - neexistuje):\n";
try {
    $stmt = $pdo->prepare("
        SELECT p.kod_prava, p.popis 
        FROM 25_uzivatele_prava up
        INNER JOIN 25_prava p ON p.id = up.pravo_id
        WHERE up.uzivatel_id = ? AND up.aktivni = 1
    ");
    $stmt->execute([$test_user_id]);
    $old_permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   Nalezeno permissions: " . count($old_permissions) . "\n\n";
} catch (PDOException $e) {
    echo "   ⚠️  CHYBA: " . $e->getMessage() . "\n\n";
}

// NOVÁ VERZE (opravená)
echo "✅ NOVÁ VERZE (25_role_prava):\n";
try {
    $stmt = $pdo->prepare("
        SELECT p.kod_prava, p.popis 
        FROM 25_role_prava rp
        INNER JOIN 25_prava p ON p.id = rp.pravo_id
        WHERE rp.user_id = ? AND rp.aktivni = 1
    ");
    $stmt->execute([$test_user_id]);
    $new_permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   Nalezeno permissions: " . count($new_permissions) . "\n\n";
    
    if (count($new_permissions) > 0) {
        echo "   📜 Seznam permissions:\n";
        foreach ($new_permissions as $perm) {
            echo "      • {$perm['kod_prava']}\n        ({$perm['popis']})\n";
        }
    }
} catch (PDOException $e) {
    echo "   ⚠️  CHYBA: " . $e->getMessage() . "\n\n";
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ Test dokončen\n";

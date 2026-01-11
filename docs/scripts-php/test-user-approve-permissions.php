<?php
/**
 * Test: Zkontrolovat, zda uživatel má právo ORDER_APPROVE
 * 
 * Použití: php test-user-approve-permissions.php <user_id>
 */

require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

$userId = isset($argv[1]) ? (int)$argv[1] : null;

if (!$userId) {
    echo "❌ Chybí user_id!\n";
    echo "Použití: php test-user-approve-permissions.php <user_id>\n";
    exit(1);
}

// Direct PDO connection
try {
    $db = new PDO(
        'mysql:host=10.3.172.11;dbname=eeo2025;charset=utf8mb4',
        'erdms_user',
        'Uh@7xErd!2024',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    echo "❌ Chyba připojení k DB: " . $e->getMessage() . "\n";
    exit(1);
}

echo "═══════════════════════════════════════════════════════════\n";
echo "KONTROLA PRÁV UŽIVATELE pro ORDER_APPROVE\n";
echo "═══════════════════════════════════════════════════════════\n\n";

// 1. Načíst uživatele
$stmt = $db->prepare("SELECT id, username, jmeno, prijmeni FROM 25_uzivatele WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo "❌ Uživatel s ID $userId NEEXISTUJE!\n";
    exit(1);
}

echo "👤 UŽIVATEL:\n";
echo "   ID: {$user['id']}\n";
echo "   Username: {$user['username']}\n";
echo "   Jméno: {$user['jmeno']} {$user['prijmeni']}\n\n";

// 2. Načíst role uživatele
echo "👥 ROLE UŽIVATELE:\n";
$stmt = $db->prepare("
    SELECT r.id, r.nazev_role, r.kod_role 
    FROM 25_role r
    INNER JOIN 25_uzivatele_role ur ON ur.role_id = r.id
    WHERE ur.uzivatel_id = ?
");
$stmt->execute([$userId]);
$roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($roles)) {
    echo "   ❌ Uživatel NEMÁ ŽÁDNÉ ROLE!\n\n";
} else {
    foreach ($roles as $role) {
        echo "   - ID: {$role['id']}, Název: {$role['nazev_role']}, Kód: {$role['kod_role']}\n";
    }
    echo "\n";
}

// 3. Zkontrolovat právo ORDER_APPROVE
echo "🔐 PRÁVO ORDER_APPROVE:\n";
$stmt = $db->query("SELECT id, kod_prava, nazev FROM 25_prava WHERE kod_prava = 'ORDER_APPROVE'");
$pravo = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$pravo) {
    echo "   ❌ PRÁVO ORDER_APPROVE NEEXISTUJE V DB!\n\n";
    exit(1);
}

echo "   ID: {$pravo['id']}, Kód: {$pravo['kod_prava']}, Název: {$pravo['nazev']}\n\n";

// 4. Zkontrolovat, zda uživatel má ORDER_APPROVE přes role
echo "✅ KONTROLA PŘÍMÉHO PRÁVA (přes role):\n";
$stmt = $db->prepare("
    SELECT DISTINCT r.nazev_role, p.kod_prava, p.nazev as pravo_nazev
    FROM 25_uzivatele_role ur
    INNER JOIN 25_role_prava rp ON rp.role_id = ur.role_id
    INNER JOIN 25_prava p ON p.id = rp.pravo_id
    INNER JOIN 25_role r ON r.id = ur.role_id
    WHERE ur.uzivatel_id = ? AND p.kod_prava = 'ORDER_APPROVE'
");
$stmt->execute([$userId]);
$directRights = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($directRights)) {
    echo "   ❌ Uživatel NEMÁ ORDER_APPROVE přímo přes role!\n\n";
} else {
    echo "   ✅ Uživatel MÁ ORDER_APPROVE přes tyto role:\n";
    foreach ($directRights as $right) {
        echo "      - Role: {$right['nazev_role']}, Právo: {$right['kod_prava']} ({$right['pravo_nazev']})\n";
    }
    echo "\n";
}

// 5. Zkontrolovat právo ORDER_MANAGE
echo "🔐 PRÁVO ORDER_MANAGE:\n";
$stmt = $db->prepare("
    SELECT DISTINCT r.nazev_role, p.kod_prava, p.nazev as pravo_nazev
    FROM 25_uzivatele_role ur
    INNER JOIN 25_role_prava rp ON rp.role_id = ur.role_id
    INNER JOIN 25_prava p ON p.id = rp.pravo_id
    INNER JOIN 25_role r ON r.id = ur.role_id
    WHERE ur.uzivatel_id = ? AND p.kod_prava = 'ORDER_MANAGE'
");
$stmt->execute([$userId]);
$manageRights = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($manageRights)) {
    echo "   ❌ Uživatel NEMÁ ORDER_MANAGE přímo přes role!\n\n";
} else {
    echo "   ✅ Uživatel MÁ ORDER_MANAGE přes tyto role:\n";
    foreach ($manageRights as $right) {
        echo "      - Role: {$right['nazev_role']}, Právo: {$right['kod_prava']} ({$right['pravo_nazev']})\n";
    }
    echo "\n";
}

// 6. Zkontrolovat všechna ORDER_* práva
echo "📋 VŠECHNA ORDER_* PRÁVA:\n";
$stmt = $db->prepare("
    SELECT DISTINCT r.nazev_role, p.kod_prava, p.nazev as pravo_nazev
    FROM 25_uzivatele_role ur
    INNER JOIN 25_role_prava rp ON rp.role_id = ur.role_id
    INNER JOIN 25_prava p ON p.id = rp.pravo_id
    INNER JOIN 25_role r ON r.id = ur.role_id
    WHERE ur.uzivatel_id = ? AND p.kod_prava LIKE 'ORDER_%'
    ORDER BY p.kod_prava
");
$stmt->execute([$userId]);
$allOrderRights = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($allOrderRights)) {
    echo "   ❌ Uživatel NEMÁ ŽÁDNÁ ORDER_* PRÁVA!\n\n";
} else {
    echo "   ✅ Uživatel má celkem " . count($allOrderRights) . " ORDER_* práv:\n";
    foreach ($allOrderRights as $right) {
        echo "      - {$right['kod_prava']} (role: {$right['nazev_role']})\n";
    }
    echo "\n";
}

// 7. VERDIKT
echo "═══════════════════════════════════════════════════════════\n";
echo "VERDIKT:\n";
echo "═══════════════════════════════════════════════════════════\n";

$hasApprove = !empty($directRights);
$hasManage = !empty($manageRights);

if ($hasApprove || $hasManage) {
    echo "✅ Uživatel $userId MÁ právo vidět schvalovací blok!\n";
    if ($hasApprove) echo "   → Má ORDER_APPROVE\n";
    if ($hasManage) echo "   → Má ORDER_MANAGE\n";
} else {
    echo "❌ Uživatel $userId NEMÁ právo vidět schvalovací blok!\n";
    echo "   → Chybí ORDER_APPROVE i ORDER_MANAGE\n";
}

echo "═══════════════════════════════════════════════════════════\n";

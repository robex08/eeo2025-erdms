<?php
$db = new PDO(
    'mysql:host=10.3.172.11;dbname=eeo2025;charset=utf8mb4',
    'erdms_user',
    'AhchohTahnoh7eim',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "═══════════════════════════════════════════════════════════\n";
echo "KONTROLA PRÁV UŽIVATELE 100 (Robert Holovsky)\n";
echo "═══════════════════════════════════════════════════════════\n\n";

// 1. Uživatel
$stmt = $db->prepare("SELECT id, username, jmeno, prijmeni FROM 25_uzivatele WHERE id = 100");
$stmt->execute();
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo "❌ Uživatel 100 neexistuje!\n";
    exit(1);
}

echo "👤 UŽIVATEL:\n";
echo "   ID: {$user['id']}\n";
echo "   Username: {$user['username']}\n";
echo "   Jméno: {$user['jmeno']} {$user['prijmeni']}\n\n";

// 2. Role
echo "👥 ROLE:\n";
$stmt = $db->prepare("
    SELECT r.id, r.nazev_role, r.kod_role 
    FROM 25_role r
    INNER JOIN 25_uzivatele_role ur ON ur.role_id = r.id
    WHERE ur.uzivatel_id = 100
");
$stmt->execute();
$roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($roles as $role) {
    echo "   - {$role['nazev_role']} (kód: {$role['kod_role']})\n";
}
echo "\n";

// 3. ORDER_APPROVE a ORDER_MANAGE
echo "🔐 PRÁVA ORDER_APPROVE / ORDER_MANAGE:\n";
$stmt = $db->prepare("
    SELECT DISTINCT r.nazev_role, p.kod_prava
    FROM 25_uzivatele_role ur
    INNER JOIN 25_role_prava rp ON rp.role_id = ur.role_id
    INNER JOIN 25_prava p ON p.id = rp.pravo_id
    INNER JOIN 25_role r ON r.id = ur.role_id
    WHERE ur.uzivatel_id = 100 AND p.kod_prava IN ('ORDER_APPROVE', 'ORDER_MANAGE')
");
$stmt->execute();
$rights = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($rights)) {
    echo "   ❌ Uživatel NEMÁ ORDER_APPROVE ani ORDER_MANAGE\n\n";
} else {
    echo "   ✅ Uživatel MÁ tato práva:\n";
    foreach ($rights as $r) {
        echo "      - {$r['kod_prava']} přes roli: {$r['nazev_role']}\n";
    }
    echo "\n";
}

// 4. Všechna ORDER_* práva
echo "📋 VŠECHNA ORDER_* PRÁVA:\n";
$stmt = $db->prepare("
    SELECT DISTINCT p.kod_prava
    FROM 25_uzivatele_role ur
    INNER JOIN 25_role_prava rp ON rp.role_id = ur.role_id
    INNER JOIN 25_prava p ON p.id = rp.pravo_id
    WHERE ur.uzivatel_id = 100 AND p.kod_prava LIKE 'ORDER_%'
    ORDER BY p.kod_prava
");
$stmt->execute();
$allRights = $stmt->fetchAll(PDO::FETCH_COLUMN);

if (empty($allRights)) {
    echo "   ❌ Žádná ORDER_* práva\n";
} else {
    echo "   Celkem: " . count($allRights) . " práv\n";
    foreach ($allRights as $r) {
        echo "   - $r\n";
    }
}

echo "\n═══════════════════════════════════════════════════════════\n";
echo "VERDIKT:\n";
if (!empty($rights)) {
    echo "✅ Uživatel 100 MÁ právo vidět schvalovací blok!\n";
} else {
    echo "❌ Uživatel 100 NEMÁ právo vidět schvalovací blok!\n";
    echo "   → Měl by vidět pouze READ-ONLY info box (pokud je objednávka schválená)\n";
}
echo "═══════════════════════════════════════════════════════════\n";

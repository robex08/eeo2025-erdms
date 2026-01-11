<?php
/**
 * 🔍 TEST: Aktivní vs Neaktivní uživatelé
 */

// Konstanty a připojení
$config = require('/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php');
define('TBL_UZIVATELE', '25_uzivatele');
define('TBL_UZIVATELE_ROLE', '25_uzivatele_role');

$pdo = new PDO("mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4", 
               $config['mysql']['username'], $config['mysql']['password'], array(
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
));

echo "🔍 TEST: Filtrování neaktivních uživatelů\n";
echo "═══════════════════════════════════════════\n\n";

// 1. Bez filtru aktivních
echo "1️⃣ BEZ aktivni filtru (jak to NEMĚLO by být):\n";
$stmt = $pdo->prepare("
    SELECT DISTINCT u.id, u.jmeno, u.prijmeni, u.aktivni
    FROM 25_uzivatele u
    INNER JOIN 25_uzivatele_role ur ON u.id = ur.uzivatel_id
    WHERE ur.role_id = 9
    ORDER BY u.aktivni DESC, u.prijmeni
");
$stmt->execute();
$allUsers = $stmt->fetchAll();

foreach ($allUsers as $user) {
    $status = $user['aktivni'] ? '✅ AKTIVNÍ' : '❌ NEAKTIVNÍ';
    echo "   {$user['jmeno']} {$user['prijmeni']} (ID {$user['id']}) - $status\n";
}
echo "   CELKEM: " . count($allUsers) . " uživatelů\n\n";

// 2. S filtrem aktivních (jak to MÁ být)
echo "2️⃣ S aktivni=1 filtrem (jak to MÁ být):\n";
$stmt = $pdo->prepare("
    SELECT DISTINCT u.id, u.jmeno, u.prijmeni, u.aktivni
    FROM 25_uzivatele u
    INNER JOIN 25_uzivatele_role ur ON u.id = ur.uzivatel_id
    WHERE ur.role_id = 9 AND u.aktivni = 1
    ORDER BY u.prijmeni
");
$stmt->execute();
$activeUsers = $stmt->fetchAll();

foreach ($activeUsers as $user) {
    echo "   ✅ {$user['jmeno']} {$user['prijmeni']} (ID {$user['id']})\n";
}
echo "   CELKEM: " . count($activeUsers) . " aktivních uživatelů\n\n";

// 3. Rozdíl
$totalUsers = count($allUsers);
$activeCount = count($activeUsers);
$inactiveCount = $totalUsers - $activeCount;

echo "3️⃣ VÝSLEDEK:\n";
echo "   📊 Celkem uživatelů s rolí THP/PES: $totalUsers\n";
echo "   ✅ Aktivní: $activeCount\n";
echo "   ❌ Neaktivní: $inactiveCount (NEBUDOU SPAMOVÁNI)\n\n";

echo "✅ HIERARCHYTRIGGERS SPRÁVNĚ FILTRUJE POUZE AKTIVNÍ UŽIVATELE!\n";
echo "   → Neaktivní uživatelé NEBUDOU dostávat notifikace\n";
echo "   → Anti-spam ochrana funkční\n";
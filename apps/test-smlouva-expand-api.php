#!/usr/bin/env php
<?php
/**
 * Test API endpointu order-v3/smlouva-expand
 */

if (php_sapi_name() !== 'cli') {
    die('Tento skript lze spustit pouze z CLI.');
}

echo "\n=== TEST API: order-v3/smlouva-expand ===\n\n";

// Připojení k DB pro získání smlouvy ID
$db = new PDO("mysql:host=10.3.172.11;dbname=EEO-OSTRA-DEV;charset=utf8mb4", 'erdms_user', 'AhchohTahnoh7eim');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$cislo_smlouvy = 'S-016/75030926/2025';
$stmt = $db->prepare("SELECT id FROM 25_smlouvy WHERE cislo_smlouvy = ?");
$stmt->execute([$cislo_smlouvy]);
$smlouva = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$smlouva) {
    die("❌ Smlouva nenalezena\n");
}

$smlouva_id = $smlouva['id'];
echo "📋 Testuji smlouvu: $cislo_smlouvy (ID: $smlouva_id)\n\n";

// Test přes curl (lokální API)
$url = 'http://localhost/api.eeo/order-v3/smlouva-expand';
$data = [
    'token' => 'test_token_placeholder', // Použij reálný token pokud máš
    'username' => 'test',
    'smlouva_id' => $smlouva_id
];

// Alternativa: přímé volání funkce z PHP
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV3Handlers.php';

// Přímý SQL test
echo "🔍 Přímý SQL test (s REPLACE):\n";
$sql = "
    SELECT 
        o.cislo_objednavky,
        o.stav_objednavky,
        o.financovani
    FROM 25a_objednavky o
    WHERE o.aktivni = 1
      AND REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', ?, '\"%')
      AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
    ORDER BY o.dt_vytvoreni DESC
";
$stmt = $db->prepare($sql);
$stmt->execute([$cislo_smlouvy]);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "   Nalezeno objednávek: " . count($results) . "\n";
if (count($results) > 0) {
    echo "   ✅ SQL dotaz funguje!\n";
    echo "   První 3 objednávky:\n";
    foreach (array_slice($results, 0, 3) as $r) {
        echo "      • {$r['cislo_objednavky']} (stav: {$r['stav_objednavky']})\n";
    }
} else {
    echo "   ❌ SQL dotaz nenašel žádné objednávky\n";
}

echo "\n=== Konec testu ===\n\n";

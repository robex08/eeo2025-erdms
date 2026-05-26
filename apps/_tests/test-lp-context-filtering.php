<?php
/**
 * TEST: LP Context Filtering
 * Ověřuje, že context parametr správně filtruje LP podle modulu
 */

require_once __DIR__ . '/../eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

// Přímé DB připojení
$db = new PDO(
    'mysql:host=10.3.172.11;port=3306;dbname=EEO-OSTRA-DEV;charset=utf8mb4',
    'erdms_user',
    'AhchohTahnoh7eim'
);

echo "===========================================\n";
echo "TEST 1: LP s modulem 'fp' (faktury+pokladna)\n";
echo "===========================================\n\n";

// Najít LP s modulem fp
$stmt = $db->query("SELECT id, cislo_lp, nazev_uctu, modul FROM 25_limitovane_prisliby WHERE modul = 'fp'");
$lp_fp = $stmt->fetch(PDO::FETCH_ASSOC);

if ($lp_fp) {
    echo "✅ LP nalezen:\n";
    echo "   ID: {$lp_fp['id']}\n";
    echo "   Kód: {$lp_fp['cislo_lp']}\n";
    echo "   Název: {$lp_fp['nazev_uctu']}\n";
    echo "   Modul: {$lp_fp['modul']}\n\n";
} else {
    echo "❌ LP s modulem 'fp' nenalezen!\n";
    exit(1);
}

echo "===========================================\n";
echo "TEST 2: Context='invoices' (měl by vrátit LP s 'f')\n";
echo "===========================================\n\n";

// Simuluj filtr pro faktury (context='invoices' → modul LIKE '%f%')
$stmt = $db->prepare("
    SELECT id, cislo_lp, nazev_uctu, modul
    FROM 25_limitovane_prisliby
    WHERE (modul LIKE :modul_filter OR modul IS NULL)
    LIMIT 10
");
$stmt->execute([':modul_filter' => '%f%']);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Počet LP s modulem obsahujícím 'f': " . count($results) . "\n\n";

$found_lpp4 = false;
foreach ($results as $lp) {
    if ($lp['cislo_lp'] === 'LPP4') {
        echo "✅ LPP4 nalezen ve výsledcích!\n";
        $found_lpp4 = true;
    }
    echo "   - {$lp['cislo_lp']} (modul: {$lp['modul']})\n";
}

if (!$found_lpp4) {
    echo "\n❌ LPP4 NEBYL nalezen ve výsledcích!\n";
}

echo "\n===========================================\n";
echo "TEST 3: Context='orders' (NEMĚL by vrátit LPP4)\n";
echo "===========================================\n\n";

// Simuluj filtr pro objednávky (context='orders' → modul LIKE '%o%')
$stmt = $db->prepare("
    SELECT id, cislo_lp, nazev_uctu, modul
    FROM 25_limitovane_prisliby
    WHERE (modul LIKE :modul_filter OR modul IS NULL)
    LIMIT 10
");
$stmt->execute([':modul_filter' => '%o%']);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Počet LP s modulem obsahujícím 'o': " . count($results) . "\n\n";

$found_lpp4 = false;
foreach ($results as $lp) {
    if ($lp['cislo_lp'] === 'LPP4') {
        echo "❌ LPP4 nalezen (NEMĚL BY!)\n";
        $found_lpp4 = true;
    }
}

if (!$found_lpp4) {
    echo "✅ LPP4 správně NENÍ ve výsledcích pro context='orders'\n";
}

echo "\n===========================================\n";
echo "TEST 4: Context='cashbook' (MĚL by vrátit LPP4)\n";
echo "===========================================\n\n";

// Simuluj filtr pro pokladnu (context='cashbook' → modul LIKE '%p%')
$stmt = $db->prepare("
    SELECT id, cislo_lp, nazev_uctu, modul
    FROM 25_limitovane_prisliby
    WHERE (modul LIKE :modul_filter OR modul IS NULL)
    LIMIT 10
");
$stmt->execute([':modul_filter' => '%p%']);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Počet LP s modulem obsahujícím 'p': " . count($results) . "\n\n";

$found_lpp4 = false;
foreach ($results as $lp) {
    if ($lp['cislo_lp'] === 'LPP4') {
        echo "✅ LPP4 nalezen ve výsledcích!\n";
        $found_lpp4 = true;
    }
    echo "   - {$lp['cislo_lp']} (modul: {$lp['modul']})\n";
}

if (!$found_lpp4) {
    echo "\n❌ LPP4 NEBYL nalezen ve výsledcích!\n";
}

echo "\n===========================================\n";
echo "✅ TESTY DOKONČENY\n";
echo "===========================================\n";

<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Načíst konstanty z api.php
define('TBL_LP_MASTER', '25_limitovane_prisliby');
define('TBL_LP_CERPANI', '25_limitovane_prisliby_cerpani');
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_OBJEDNAVKY_POLOZKY', '25a_objednavky_polozky');
define('TBL_POKLADNI_KNIHY', '25a_pokladni_knihy');
define('TBL_POKLADNI_POLOZKY', '25a_pokladni_polozky');

// DB config
$config = [
    'host' => '10.3.172.11',
    'username' => 'erdms_user',
    'password' => 'AhchohTahnoh7eim',
    'database' => 'eeo2025'
];

// PDO připojení
try {
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password'],
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        )
    );
    echo "✓ PDO connection OK\n";
} catch (PDOException $e) {
    die("❌ PDO connection failed: " . $e->getMessage() . "\n");
}

// Načíst PDO handler
require_once __DIR__ . '/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php';
echo "✓ PDO handler loaded\n";

// Test: Najít první LP z roku 2025
$stmt = $pdo->prepare("SELECT id, cislo_lp FROM " . TBL_LP_MASTER . " WHERE YEAR(platne_od) = 2025 LIMIT 1");
$stmt->execute();
$lp = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$lp) {
    die("❌ Žádné LP pro rok 2025 nenalezeno\n");
}

echo "✓ Nalezeno LP: {$lp['cislo_lp']} (ID: {$lp['id']})\n\n";

// Test: Zavolat prepocetCerpaniPodleIdLP_PDO
echo "Volám prepocetCerpaniPodleIdLP_PDO({$lp['id']})...\n";

try {
    $result = prepocetCerpaniPodleIdLP_PDO($pdo, (int)$lp['id']);
    
    if ($result['success']) {
        echo "✅ Přepočet OK\n";
        echo "  Cislo LP: {$result['cislo_lp']}\n";
        echo "  Data:\n";
        foreach ($result['data'] as $key => $value) {
            echo "    $key: $value\n";
        }
    } else {
        echo "❌ Přepočet selhal: {$result['error']}\n";
    }
} catch (Exception $e) {
    echo "❌ Exception: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

// Zkontrolovat, jestli se data uložila
echo "\n🔍 Kontrola dat v tabulce čerpání:\n";
$stmt = $pdo->prepare("SELECT * FROM " . TBL_LP_CERPANI . " WHERE cislo_lp = ? LIMIT 1");
$stmt->execute([$lp['cislo_lp']]);
$saved = $stmt->fetch(PDO::FETCH_ASSOC);

if ($saved) {
    echo "✅ Data uložena:\n";
    foreach ($saved as $key => $value) {
        echo "  $key: $value\n";
    }
} else {
    echo "❌ Data nebyla uložena do tabulky!\n";
}

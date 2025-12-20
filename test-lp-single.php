<?php
/**
 * Test script - spustit prepocet pro jeden LP
 */

// Load config
$_config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$config = $_config['mysql'];

// Create PDO connection
$db = new PDO(
    "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
    $config['username'],
    $config['password'],
    array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    )
);

// Define table constants (needed by handler)
define('TBL_LP_MASTER', '25_limitovane_prisliby');
define('TBL_LP_CERPANI', '25_limitovane_prisliby_cerpani');
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_OBJEDNAVKY_POLOZKY', '25a_objednavky_polozky');
define('TBL_POKLADNI_KNIHY', '25a_pokladni_knihy');
define('TBL_POKLADNI_POLOZKY', '25a_pokladni_polozky');

require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php';

// Test pro LP ID = 6 (LPIA1)
$lp_id = 6;

echo "=== Test prepoctu LP ID: $lp_id ===\n\n";

try {
    $result = prepocetCerpaniPodleIdLP_PDO($db, $lp_id);
    
    echo "Vysledek:\n";
    print_r($result);
    echo "\n\n";
    
    if ($result['success']) {
        echo "✓ Prepocet probehl uspesne!\n";
        
        // Zkontrolovat zda se zaznam zapsal do tabulky
        $stmt = $db->prepare("SELECT * FROM 25_limitovane_prisliby_cerpani WHERE cislo_lp = :cislo_lp");
        $stmt->execute(['cislo_lp' => $result['cislo_lp']]);
        $saved = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($saved) {
            echo "\n✓ Zaznam nalezen v tabulce:\n";
            echo "  - Cislo LP: {$saved['cislo_lp']}\n";
            echo "  - Rok: {$saved['rok']}\n";
            echo "  - Celkovy limit: {$saved['celkovy_limit']}\n";
            echo "  - Rezervovano: {$saved['rezervovano']}\n";
            echo "  - Predpoklad: {$saved['predpokladane_cerpani']}\n";
            echo "  - Skutecnost: {$saved['skutecne_cerpano']}\n";
            echo "  - Pokladna: {$saved['cerpano_pokladna']}\n";
            echo "  - Pocet zaznamu: {$saved['pocet_zaznamu']}\n";
        } else {
            echo "\n✗ CHYBA: Zaznam nebyl zapsán do tabulky!\n";
        }
    } else {
        echo "✗ Chyba pri prepoctu: " . ($result['error'] ?? 'Neznama chyba') . "\n";
    }
    
} catch (Exception $e) {
    echo "✗ EXCEPTION: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

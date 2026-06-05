<?php
/**
 * Jednoduchý test - co je v databázi s "TEST"
 */

// Hardcoded DB credentials (jen pro test)
$host = '10.3.174.11';
$db = 'eeo2025-dev';
$user = 'eeo_api';
$pass = 'Erdms24!dev';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✓ Připojeno k databázi\n\n";
    
    // Hledej "TEST" v různých polích
    $queries = [
        'LP cislo_lp' => "SELECT id, cislo_lp FROM `25_limitovane_prisliby_master` WHERE cislo_lp LIKE '%TEST%' LIMIT 5",
        'LP nazev_uctu' => "SELECT id, nazev_uctu FROM `25_limitovane_prisliby_master` WHERE nazev_uctu LIKE '%TEST%' LIMIT 5",
        'Order cislo_objednavky' => "SELECT id, cislo_objednavky, SUBSTR(predmet, 1, 50) as predmet FROM `25a_objednavky` WHERE cislo_objednavky LIKE '%TEST%' LIMIT 5",
        'Order predmet' => "SELECT id, cislo_objednavky, SUBSTR(predmet, 1, 80) as predmet FROM `25a_objednavky` WHERE predmet LIKE '%TEST%' LIMIT 5",
        'Order dodavatel' => "SELECT id, cislo_objednavky, dodavatel_nazev FROM `25a_objednavky` WHERE dodavatel_nazev LIKE '%TEST%' LIMIT 5",
        'Faktura cislo_vema' => "SELECT id, SUBSTR(fa_cislo_vema, 1, 50) as fa_cislo_vema FROM `25a_objednavky_faktury` WHERE fa_cislo_vema LIKE '%TEST%' LIMIT 5",
        'LP cerpani' => "SELECT id, cislo_lp FROM `25_limitovane_prisliby_cerpani` WHERE cislo_lp LIKE '%TEST%' LIMIT 5"
    ];
    
    foreach ($queries as $desc => $sql) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "[$desc]: " . count($rows) . " výsledků\n";
        if ($rows) {
            foreach ($rows as $r) {
                echo "  - " . json_encode($r) . "\n";
            }
        }
    }
    
    // Zkus "DEV"
    echo "\n\n=== HLEDÁNÍ 'DEV' ===\n";
    $queries2 = [
        'Order predmet DEV' => "SELECT id, cislo_objednavky, SUBSTR(predmet, 1, 80) as predmet FROM `25a_objednavky` WHERE predmet LIKE '%DEV%' LIMIT 3",
        'Order cislo DEV' => "SELECT id, cislo_objednavky FROM `25a_objednavky` WHERE cislo_objednavky LIKE '%DEV%' LIMIT 3"
    ];
    
    foreach ($queries2 as $desc => $sql) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "[$desc]: " . count($rows) . " výsledků\n";
        if ($rows) {
            foreach ($rows as $r) {
                echo "  - " . json_encode($r) . "\n";
            }
        }
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
?>

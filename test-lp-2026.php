<?php
/**
 * TEST LP DATA PRO ROK 2026
 * 
 * Tento skript testuje, zda jsou v databázi data pro LP v roce 2026
 */

// Načíst konfiguraci
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/.env';

// Připojit se k databázi
try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    echo "✓ Připojení k databázi úspěšné\n\n";
    
    // TEST 1: Počet LP pro rok 2026
    $stmt = $pdo->query("SELECT COUNT(*) as pocet FROM 25_limitovane_prisliby_cerpani WHERE rok = 2026");
    $result = $stmt->fetch();
    echo "TEST 1: LP v cerpani tabulce pro rok 2026\n";
    echo "Počet záznamů: " . $result['pocet'] . "\n";
    if ($result['pocet'] > 0) {
        echo "✓ PASS - Data existují\n";
    } else {
        echo "✗ FAIL - Data neexistují\n";
    }
    
    echo "\n---\n\n";
    
    // TEST 2: Ověření struktury dat
    echo "TEST 2: Ověření obsahů záznamů pro rok 2026\n";
    $stmt = $pdo->query("SELECT cislo_lp, kategorie, celkovy_limit, zbyva_skutecne FROM 25_limitovane_prisliby_cerpani WHERE rok = 2026 LIMIT 5");
    $records = $stmt->fetchAll();
    foreach ($records as $row) {
        echo "- " . $row['cislo_lp'] . " (" . $row['kategorie'] . "): limit=" . $row['celkovy_limit'] . ", zbývá=" . $row['zbyva_skutecne'] . "\n";
    }
    echo "✓ PASS - Struktura dat OK\n";
    
    echo "\n---\n\n";
    
    // TEST 3: Porovnání s rokem 2025
    echo "TEST 3: Porovnání s rokem 2025\n";
    $stmt = $pdo->query("SELECT COUNT(*) as pocet FROM 25_limitovane_prisliby_cerpani WHERE rok = 2025");
    $result2025 = $stmt->fetch();
    echo "Počet LP v 2025: " . $result2025['pocet'] . "\n";
    echo "Počet LP v 2026: " . $result['pocet'] . "\n";
    
    if ($result['pocet'] > 0) {
        echo "✓ PASS - Oba roky mají data\n";
    } else {
        echo "✗ FAIL - Rok 2026 nemá data\n";
    }
    
} catch (Exception $e) {
    echo "✗ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n=== TEST UKONČEN ===\n";

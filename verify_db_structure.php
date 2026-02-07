<?php
/**
 * OVĚŘENÍ STRUKTURY DATABÁZE podle PHP_api.prompt.md pravidel
 * - NIKDY nepředpokládej názvy sloupců - zkontroluj je v databázi
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

$host = '10.3.172.11';
$dbname = 'EEO-OSTRA-DEV';
$user = 'erdms_user';
$pass = 'AhchohTahnoh7eim';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== OVĚŘENÍ STRUKTURY TABULEK ===\n\n";
    
    // 1. Tabulka 25a_pokladni_knihy
    echo "1️⃣ TABULKA: 25a_pokladni_knihy\n";
    echo str_repeat("-", 80) . "\n";
    $stmt = $pdo->query("DESCRIBE 25a_pokladni_knihy");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $col) {
        echo sprintf("  %-30s %-20s %s\n", $col['Field'], $col['Type'], $col['Key']);
    }
    echo "\n";
    
    // 2. Tabulka 25a_pokladni_polozky
    echo "2️⃣ TABULKA: 25a_pokladni_polozky\n";
    echo str_repeat("-", 80) . "\n";
    $stmt = $pdo->query("DESCRIBE 25a_pokladni_polozky");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $col) {
        echo sprintf("  %-30s %-20s %s\n", $col['Field'], $col['Type'], $col['Key']);
    }
    echo "\n";
    
    // 3. Praktický test - zjistit správný název sloupce pro JOIN
    echo "3️⃣ TEST SPOJENÍ KNIHY → POLOŽKY:\n";
    echo str_repeat("-", 80) . "\n";
    
    // Zkusit různé varianty názvu sloupce
    $variants = ['kniha_id', 'id_knihy', 'pokladni_kniha_id', 'knihy_id'];
    
    foreach ($variants as $variant) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM 25a_pokladni_polozky WHERE $variant = 20");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo "  ✅ SPRÁVNÝ SLOUPEC: '$variant' (nalezeno {$result['cnt']} položek pro book_id=20)\n";
            
            // Pokud najdeme správný sloupec, vypsat položky
            if ($result['cnt'] > 0) {
                echo "\n4️⃣ POLOŽKY V KNIZE ID=20 (user 100, pokladna 999):\n";
                echo str_repeat("-", 80) . "\n";
                $stmt = $pdo->query("SELECT * FROM 25a_pokladni_polozky WHERE $variant = 20");
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($items as $idx => $item) {
                    echo "\n  POLOŽKA #" . ($idx + 1) . ":\n";
                    foreach ($item as $key => $val) {
                        echo sprintf("    %-25s: %s\n", $key, $val);
                    }
                }
            }
            
            break; // Našli jsme správný sloupec
        } catch (PDOException $e) {
            echo "  ❌ Nesprávný sloupec: '$variant' ({$e->getMessage()})\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
}

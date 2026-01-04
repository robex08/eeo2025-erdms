<?php
// Načítáme konfiguraci databáze
$config = require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$mysql_config = $config['mysql'];

// PDO connection string
$dsn = "mysql:host={$mysql_config['host']};dbname={$mysql_config['database']};charset=utf8mb4";
$username = $mysql_config['username'];
$password = $mysql_config['password'];

echo "=== JEDNODUCHÁ OPRAVA NOLOGIN → u0xxxx ===\n";
echo "Datum: " . date("Y-m-d H:i:s") . "\n\n";

try {
    // Připojení k databázi
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Načteme všechny uživatele s nologin username z databáze
    $stmt = $pdo->query("SELECT id, username, jmeno, prijmeni, email, telefon, aktivni FROM 25_uzivatele WHERE username LIKE 'nologin%' ORDER BY id");
    $dbNologinUsers = $stmt->fetchAll();
    
    echo "V databázi nalezeno " . count($dbNologinUsers) . " uživatelů s nologin username:\n\n";
    
    $updateQueries = [];
    
    foreach ($dbNologinUsers as $dbUser) {
        echo "🔍 ID: {$dbUser['id']}, Username: {$dbUser['username']}\n";
        echo "   Jméno: {$dbUser['jmeno']} {$dbUser['prijmeni']}\n";
        echo "   Email: {$dbUser['email']}\n";
        echo "   Status: {$dbUser['aktivni']}\n";
        
        // Extrahujeme číslo z username a převedeme na u0xxxx
        $personalNumber = '';
        
        if (preg_match('/nologin_(\d+)/', $dbUser['username'], $matches)) {
            $personalNumber = 'u' . str_pad($matches[1], 5, '0', STR_PAD_LEFT);
            echo "   ✅ Extraktováno číslo: {$matches[1]} → $personalNumber\n";
        } elseif (preg_match('/nologin_0(\d+)/', $dbUser['username'], $matches)) {
            $personalNumber = 'u' . str_pad($matches[1], 5, '0', STR_PAD_LEFT);
            echo "   ✅ Extraktováno číslo: 0{$matches[1]} → $personalNumber\n";
        } else {
            // Pro textové suffyxy vytvoříme random číslo
            $personalNumber = 'u' . str_pad(rand(50000, 99999), 5, '0', STR_PAD_LEFT);
            echo "   ⚠️ Textový suffix '{$dbUser['username']}' → generuji: $personalNumber\n";
        }
        
        $updateQueries[] = [
            'id' => $dbUser['id'],
            'old_username' => $dbUser['username'],
            'new_username' => $personalNumber,
            'current_status' => $dbUser['aktivni'],
            'query' => "UPDATE 25_uzivatele SET username = '$personalNumber', aktivni = 1 WHERE id = {$dbUser['id']};"
        ];
        
        echo "   📝 Nový username: $personalNumber\n";
        echo "   📝 Status: {$dbUser['aktivni']} → 1 (aktivní)\n";
        echo "\n";
    }
    
    echo "=== SOUHRN ===\n";
    echo "DB uživatelů s nologin: " . count($dbNologinUsers) . "\n";
    echo "Potřebuje UPDATE: " . count($updateQueries) . "\n\n";
    
    if (count($updateQueries) > 0) {
        echo "=== UPDATE PŘÍKAZY ===\n\n";
        
        $sqlFile = "fix_nologin_SIMPLE_" . date("Y-m-d_H-i-s") . ".sql";
        file_put_contents($sqlFile, "-- Jednoduchá oprava nologin uživatelů\n");
        file_put_contents($sqlFile, "-- Generováno: " . date("Y-m-d H:i:s") . "\n");
        file_put_contents($sqlFile, "-- Převádí nologin_xxxx na u0xxxx a aktivuje uživatele\n\n", FILE_APPEND);
        
        foreach ($updateQueries as $update) {
            echo "ID: {$update['id']} | {$update['old_username']} → {$update['new_username']} | Status: {$update['current_status']} → 1\n";
            
            file_put_contents($sqlFile, "-- ID {$update['id']}: {$update['old_username']} → {$update['new_username']}\n", FILE_APPEND);
            file_put_contents($sqlFile, $update['query'] . "\n\n", FILE_APPEND);
        }
        
        echo "\n💾 SQL příkazy uloženy do: $sqlFile\n\n";
        
        echo "⚠️  SQL SOUBOR PŘIPRAVEN - NESPOUŠTÍ SE AUTOMATICKY!\n";
        echo "⚠️  PŘED SPUŠTĚNÍM ZKONTROLUJTE OBSAH SOUBORU!\n";
        echo "⚠️  SPUSŤTE POUZE POTÉ, CO POTVRDÍTE SPRÁVNOST ZMĚN!\n\n";
        
        echo "📋 PREVIEW PRVNÍCH 10 PŘÍKAZŮ:\n";
        echo str_repeat("-", 50) . "\n";
        for ($i = 0; $i < min(10, count($updateQueries)); $i++) {
            echo $updateQueries[$i]['query'] . "\n";
        }
        if (count($updateQueries) > 10) {
            echo "... a " . (count($updateQueries) - 10) . " dalších příkazů\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
}
?>
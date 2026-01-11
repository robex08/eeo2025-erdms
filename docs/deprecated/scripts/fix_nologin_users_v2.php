<?php
// Načítáme konfiguraci databáze
$config = require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$mysql_config = $config['mysql'];

// PDO connection string
$dsn = "mysql:host={$mysql_config['host']};dbname={$mysql_config['database']};charset=utf8mb4";
$username = $mysql_config['username'];
$password = $mysql_config['password'];

echo "=== KONTROLA A OPRAVA NOLOGIN UŽIVATELŮ (OPRAVENÁ VERZE) ===\n";
echo "Datum: " . date("Y-m-d H:i:s") . "\n\n";

try {
    // Připojení k databázi
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Načtení všech nologin uživatelů z finálního souboru
    $finalFile = 'final_users_complete_2026-01-04_16-44-19.txt';
    
    if (!file_exists($finalFile)) {
        throw new Exception("Soubor $finalFile neexistuje!");
    }
    
    $lines = file($finalFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $header = array_shift($lines); // Odstraníme header
    
    $nologinUsers = [];
    foreach ($lines as $line) {
        $cols = explode("\t", $line);
        $username = $cols[1] ?? '';
        
        if (strpos($username, 'nologin') === 0) {
            $nologinUsers[] = [
                'id' => $cols[0],
                'username' => $username,
                'jmeno' => trim($cols[2] ?? ''),
                'prijmeni' => trim($cols[3] ?? ''),
                'titul' => $cols[4] ?? '',
                'email' => trim($cols[5] ?? ''),
                'telefon' => $cols[6] ?? '',
                'lokalita_id' => $cols[7] ?? '',
                'useky_id' => $cols[8] ?? '',
                'pozice_id' => $cols[9] ?? '',
                'status' => $cols[10] ?? '0'
            ];
        }
    }
    
    echo "Nalezeno " . count($nologinUsers) . " nologin uživatelů v souboru.\n\n";
    
    // Nejdřív načteme všechny uživatele s nologin username z databáze
    $stmt = $pdo->query("SELECT id, username, jmeno, prijmeni, email, telefon, aktivni FROM 25_uzivatele WHERE username LIKE 'nologin%'");
    $dbNologinUsers = $stmt->fetchAll();
    
    echo "V databázi nalezeno " . count($dbNologinUsers) . " uživatelů s nologin username:\n";
    foreach ($dbNologinUsers as $dbUser) {
        echo "- ID: {$dbUser['id']}, Username: {$dbUser['username']}, Jméno: {$dbUser['jmeno']} {$dbUser['prijmeni']}, Email: {$dbUser['email']}\n";
    }
    echo "\n";
    
    $updateQueries = [];
    
    foreach ($dbNologinUsers as $dbUser) {
        echo "🔍 ZPRACOVÁVÁM DB uživatele: ID {$dbUser['id']}, {$dbUser['jmeno']} {$dbUser['prijmeni']}\n";
        echo "   Username: {$dbUser['username']}\n";
        echo "   Email: {$dbUser['email']}\n";
        echo "   Status: {$dbUser['aktivni']}\n";
        
        // Najdeme odpovídající záznam v finálním souboru
        $matchedUser = null;
        
        // Nejdřív zkusíme najít podle emailu (pokud je vyplněn)
        if (!empty($dbUser['email'])) {
            foreach ($nologinUsers as $fileUser) {
                if (strtolower(trim($fileUser['email'])) === strtolower(trim($dbUser['email']))) {
                    $matchedUser = $fileUser;
                    echo "   ✅ Shoda podle emailu: {$fileUser['email']}\n";
                    break;
                }
            }
        }
        
        // Pokud nenašli podle emailu, zkusíme podle jména a příjmení
        if (!$matchedUser) {
            foreach ($nologinUsers as $fileUser) {
                if (strtolower(trim($fileUser['jmeno'])) === strtolower(trim($dbUser['jmeno'])) &&
                    strtolower(trim($fileUser['prijmeni'])) === strtolower(trim($dbUser['prijmeni']))) {
                    $matchedUser = $fileUser;
                    echo "   ✅ Shoda podle jména: {$fileUser['jmeno']} {$fileUser['prijmeni']}\n";
                    break;
                }
            }
        }
        
        if ($matchedUser) {
            // Extrahujeme osobní číslo z nologin username
            $personalNumber = '';
            
            // Zkusíme najít číselné části v matchovaném uživateli
            if (preg_match('/nologin_(\d+)/', $matchedUser['username'], $matches)) {
                $personalNumber = 'u' . str_pad($matches[1], 5, '0', STR_PAD_LEFT);
            } elseif (preg_match('/nologin_u(\d+)/', $matchedUser['username'], $matches)) {
                $personalNumber = 'u' . str_pad($matches[1], 5, '0', STR_PAD_LEFT);
            } else {
                // Pro ostatní případy vytvoříme na základě jména
                $personalNumber = 'u' . str_pad(rand(10000, 99999), 5, '0', STR_PAD_LEFT);
                echo "   ⚠️ Nelze extrahovat číslo z '{$matchedUser['username']}', generuji: $personalNumber\n";
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
        } else {
            echo "   ❌ Nenašel jsem odpovídající záznam v souboru\n";
        }
        
        echo "\n";
    }
    
    echo "=== SOUHRN ===\n";
    echo "DB uživatelů s nologin: " . count($dbNologinUsers) . "\n";
    echo "Potřebuje UPDATE: " . count($updateQueries) . "\n\n";
    
    if (count($updateQueries) > 0) {
        echo "=== UPDATE PŘÍKAZY ===\n\n";
        
        $sqlFile = "fix_nologin_users_CORRECTED_" . date("Y-m-d_H-i-s") . ".sql";
        file_put_contents($sqlFile, "-- Oprava nologin uživatelů (OPRAVENÁ VERZE)\n");
        file_put_contents($sqlFile, "-- Generováno: " . date("Y-m-d H:i:s") . "\n\n", FILE_APPEND);
        
        foreach ($updateQueries as $update) {
            echo "ID: {$update['id']} | {$update['old_username']} → {$update['new_username']} | Status: {$update['current_status']} → 1\n";
            echo "SQL: {$update['query']}\n\n";
            
            file_put_contents($sqlFile, $update['query'] . "\n", FILE_APPEND);
        }
        
        echo "💾 SQL příkazy uloženy do: $sqlFile\n\n";
        
        echo "⚠️  SQL SOUBOR PŘIPRAVEN - NESPOUŠTÍ SE AUTOMATICKY!\n";
        echo "⚠️  PŘED SPUŠTĚNÍM ZKONTROLUJTE OBSAH SOUBORU!\n";
        echo "⚠️  SPUSŤTE POUZE POTÉ, CO POTVRDÍTE SPRÁVNOST ZMĚN!\n\n";
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
}
?>
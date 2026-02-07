<?php
// Načítáme konfiguraci databáze
$config = require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$mysql_config = $config['mysql'];

// PDO connection string
$dsn = "mysql:host={$mysql_config['host']};dbname={$mysql_config['database']};charset=utf8mb4";
$username = $mysql_config['username'];
$password = $mysql_config['password'];

echo "=== VYTVOŘENÍ TESTOVACÍ KOPIE TABULKY 25_uzivatele ===\n";
echo "Datum: " . date("Y-m-d H:i:s") . "\n\n";

$testTable = '25_uzivatele_TEST_' . date('Ymd_His');

try {
    // Připojení k databázi
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    echo "🔍 Kontrolujem původní tabulku...\n";
    
    // Získáme počet záznamů v původní tabulce
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM 25_uzivatele");
    $originalCount = $stmt->fetch()['count'];
    echo "✅ Původní tabulka: $originalCount záznamů\n\n";
    
    echo "🚧 Vytvářím testovací tabulku: $testTable\n";
    
    // Vytvoříme kopii struktury tabulky
    $createTableSQL = "CREATE TABLE `$testTable` LIKE `25_uzivatele`";
    $pdo->exec($createTableSQL);
    echo "✅ Struktura tabulky vytvořena\n";
    
    // Zkopírujeme všechna data z původní tabulky
    $copyDataSQL = "INSERT INTO `$testTable` SELECT * FROM `25_uzivatele`";
    $pdo->exec($copyDataSQL);
    echo "✅ Data zkopírována z původní tabulky\n";
    
    // Ověříme kopii
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$testTable`");
    $testCount = $stmt->fetch()['count'];
    echo "✅ Testovací tabulka: $testCount záznamů\n\n";
    
    if ($originalCount == $testCount) {
        echo "✅ ÚSPĚCH: Kopie je kompletní!\n\n";
    } else {
        throw new Exception("❌ Kopie není kompletní! Původní: $originalCount, Kopie: $testCount");
    }
    
    echo "📁 Nyní importuji finální data z souboru...\n";
    
    // Načteme finální soubor
    $finalFile = 'final_users_complete_2026-01-04_16-44-19.txt';
    
    if (!file_exists($finalFile)) {
        throw new Exception("Soubor $finalFile neexistuje!");
    }
    
    $lines = file($finalFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $header = array_shift($lines); // Odstraníme header
    
    echo "📊 Finální soubor obsahuje " . count($lines) . " záznamů\n";
    
    // Smazat všechna data z testovací tabulky a vložit nové
    $pdo->exec("DELETE FROM `$testTable`");
    echo "🗑️ Stará data smazána z testovací tabulky\n";
    
    // Připravíme INSERT dotaz
    $insertSQL = "INSERT INTO `$testTable` 
                  (id, username, titul_pred, jmeno, prijmeni, titul_za, email, telefon, 
                   pozice_id, lokalita_id, organizace_id, usek_id, aktivni, 
                   dt_vytvoreni, dt_aktualizace, dt_posledni_aktivita) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $pdo->prepare($insertSQL);
    
    $importedCount = 0;
    $errors = [];
    
    foreach ($lines as $lineNum => $line) {
        $cols = explode("\t", $line);
        
        // Ošetříme prázdné hodnoty a uvozovky
        for ($i = 0; $i < count($cols); $i++) {
            $cols[$i] = trim($cols[$i], '"');
            if ($cols[$i] === '') {
                $cols[$i] = null;
            }
        }
        
        // Doplníme chybějící sloupce
        while (count($cols) < 16) {
            $cols[] = null;
        }
        
        try {
            $stmt->execute([
                $cols[0],  // id
                $cols[1],  // username
                $cols[2],  // titul_pred
                $cols[3],  // jmeno
                $cols[4],  // prijmeni
                $cols[5],  // titul_za
                $cols[6],  // email
                $cols[7],  // telefon
                $cols[8],  // pozice_id
                $cols[9],  // lokalita_id
                $cols[10], // organizace_id
                $cols[11], // usek_id
                $cols[12], // aktivni
                $cols[13], // dt_vytvoreni
                $cols[14], // dt_aktualizace
                $cols[15]  // dt_posledni_aktivita
            ]);
            $importedCount++;
        } catch (Exception $e) {
            $errors[] = "Řádek " . ($lineNum + 2) . ": " . $e->getMessage();
        }
    }
    
    echo "📥 Importováno: $importedCount záznamů\n";
    if (count($errors) > 0) {
        echo "⚠️ Chyby při importu (" . count($errors) . "):\n";
        foreach (array_slice($errors, 0, 5) as $error) {
            echo "   $error\n";
        }
        if (count($errors) > 5) {
            echo "   ... a " . (count($errors) - 5) . " dalších chyb\n";
        }
    }
    
    // Ověříme finální počet
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$testTable`");
    $finalCount = $stmt->fetch()['count'];
    echo "✅ Finální počet v testovací tabulce: $finalCount záznamů\n\n";
    
    echo "🔧 Nyní aplikuji opravy nologin uživatelů...\n";
    
    // Najdeme nologin uživatele v testovací tabulce
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$testTable` WHERE username LIKE 'nologin%'");
    $nologinCount = $stmt->fetch()['count'];
    echo "🔍 Nalezeno $nologinCount nologin uživatelů\n";
    
    if ($nologinCount > 0) {
        // Načteme opravy z našeho předchozího souboru
        $fixFile = 'fix_nologin_SIMPLE_2026-01-04_16-53-10.sql';
        
        if (file_exists($fixFile)) {
            $fixLines = file($fixFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            $appliedFixes = 0;
            
            foreach ($fixLines as $line) {
                $line = trim($line);
                if (strpos($line, 'UPDATE') === 0) {
                    // Nahradíme název tabulky na testovací
                    $fixedLine = str_replace('25_uzivatele', $testTable, $line);
                    try {
                        $pdo->exec($fixedLine);
                        $appliedFixes++;
                    } catch (Exception $e) {
                        echo "⚠️ Chyba při aplikaci: $line - " . $e->getMessage() . "\n";
                    }
                }
            }
            
            echo "🔧 Aplikováno $appliedFixes oprav\n";
        }
        
        // Zkontrolujeme, kolik nologin uživatelů zbylo
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$testTable` WHERE username LIKE 'nologin%'");
        $remainingNologin = $stmt->fetch()['count'];
        echo "✅ Zbývá $remainingNologin nologin uživatelů\n";
    }
    
    echo "\n" . str_repeat("=", 60) . "\n";
    echo "🎯 TESTOVACÍ TABULKA PŘIPRAVENA: `$testTable`\n";
    echo str_repeat("=", 60) . "\n\n";
    
    echo "📊 STATISTIKY:\n";
    echo "- Původní tabulka: $originalCount záznamů\n";
    echo "- Testovací tabulka: $finalCount záznamů\n";
    echo "- Importované z finálního souboru: $importedCount záznamů\n";
    echo "- Aplikované opravy nologin: " . ($nologinCount - $remainingNologin) . "\n";
    echo "- Zbývající nologin uživatelé: $remainingNologin\n\n";
    
    echo "🔍 KONTROLNÍ DOTAZY PRO OVĚŘENÍ:\n";
    echo "-- Zobrazit všechny uživatele v testovací tabulce:\n";
    echo "SELECT COUNT(*) FROM `$testTable`;\n\n";
    
    echo "-- Zobrazit nologin uživatele (pokud zbyli):\n";
    echo "SELECT id, username, jmeno, prijmeni, aktivni FROM `$testTable` WHERE username LIKE 'nologin%';\n\n";
    
    echo "-- Zobrazit nové uživatele (ID > 103):\n";
    echo "SELECT id, username, jmeno, prijmeni, email FROM `$testTable` WHERE id > 103 ORDER BY id;\n\n";
    
    echo "-- Zobrazit uživatele s u0xxxx usernamey:\n";
    echo "SELECT id, username, jmeno, prijmeni, aktivni FROM `$testTable` WHERE username LIKE 'u%' ORDER BY username;\n\n";
    
    echo "⚠️ DŮLEŽITÉ:\n";
    echo "1. Zkontrolujte data v testovací tabulce `$testTable`\n";
    echo "2. Pokud bude vše v pořádku, řekněte mi a připravím prohození s produkční tabulkou\n";
    echo "3. Testovací tabulku můžete kdykoliv smazat: DROP TABLE `$testTable`;\n\n";
    
    // Uložíme název testovací tabulky pro další použití
    file_put_contents('test_table_name.txt', $testTable);
    echo "📝 Název testovací tabulky uložen do: test_table_name.txt\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    
    // Pokud se něco pokazilo, pokusíme se smazat testovací tabulku
    if (isset($testTable)) {
        try {
            $pdo->exec("DROP TABLE IF EXISTS `$testTable`");
            echo "🗑️ Testovací tabulka smazána kvůli chybě\n";
        } catch (Exception $dropError) {
            echo "⚠️ Nepodařilo se smazat testovací tabulku: " . $dropError->getMessage() . "\n";
        }
    }
}
?>
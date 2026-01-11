<?php
// Načítáme konfiguraci databáze
$config = require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$mysql_config = $config['mysql'];

// PDO connection string
$dsn = "mysql:host={$mysql_config['host']};dbname={$mysql_config['database']};charset=utf8mb4";
$username = $mysql_config['username'];
$password = $mysql_config['password'];

echo "=== VYTVOŘENÍ TESTOVACÍ KOPIE TABULKY 25_uzivatele (FIXED) ===\n";
echo "Datum: " . date("Y-m-d H:i:s") . "\n\n";

$testTable = '25_uzivatele_TEST_' . date('Ymd_His');

try {
    // Připojení k databázi
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Nejdřív smažeme předchozí testovací tabulky
    $stmt = $pdo->query("SHOW TABLES LIKE '25_uzivatele_TEST_%'");
    $oldTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($oldTables) > 0) {
        echo "🗑️ Mažu staré testovací tabulky...\n";
        foreach ($oldTables as $oldTable) {
            try {
                $pdo->exec("DROP TABLE `$oldTable`");
                echo "   Smazána: $oldTable\n";
            } catch (Exception $e) {
                echo "   ⚠️ Chyba při mazání $oldTable: " . $e->getMessage() . "\n";
            }
        }
        echo "\n";
    }

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
    
    echo "📁 Importuji finální data z souboru...\n";
    
    // Načteme finální soubor
    $finalFile = 'final_users_complete_2026-01-04_16-44-19.txt';
    
    if (!file_exists($finalFile)) {
        throw new Exception("Soubor $finalFile neexistuje!");
    }
    
    $lines = file($finalFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $header = array_shift($lines); // Odstraníme header
    
    echo "📊 Finální soubor obsahuje " . count($lines) . " záznamů\n";
    echo "📋 Header: $header\n\n";
    
    // Připravíme INSERT dotaz s přesným mapováním sloupců
    $insertSQL = "INSERT INTO `$testTable` 
                  (id, username, password_hash, titul_pred, jmeno, prijmeni, titul_za, email, telefon, 
                   pozice_id, lokalita_id, organizace_id, usek_id, aktivni, vynucena_zmena_hesla,
                   dt_vytvoreni, dt_aktualizace, dt_posledni_aktivita) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $pdo->prepare($insertSQL);
    
    $importedCount = 0;
    $errors = [];
    
    foreach ($lines as $lineNum => $line) {
        $cols = explode("\t", $line);
        
        // Ošetříme prázdné hodnoty a uvozovky
        for ($i = 0; $i < count($cols); $i++) {
            $cols[$i] = trim($cols[$i], '"');
            if ($cols[$i] === '' || $cols[$i] === 'NULL') {
                $cols[$i] = null;
            }
        }
        
        // Mapování podle našeho souboru:
        // 0=ID, 1=Username, 2=Titul_pred, 3=Jmeno, 4=Prijmeni, 5=Titul_za, 6=Email, 7=Telefon
        // 8=Pozice_ID, 9=Lokalita_ID, 10=Organizace_ID, 11=Usek_ID, 12=Aktivni
        // 13=DT_Vytvoreni, 14=DT_Aktualizace, 15=DT_Posledni_aktivita
        
        try {
            $stmt->execute([
                $cols[0] ?? null,                    // id
                $cols[1] ?? null,                    // username
                'temporary_hash_' . ($cols[0] ?? rand(1000,9999)), // password_hash (dočasný)
                $cols[2] ?? null,                    // titul_pred
                $cols[3] ?? null,                    // jmeno
                $cols[4] ?? null,                    // prijmeni
                $cols[5] ?? null,                    // titul_za
                $cols[6] ?? null,                    // email
                $cols[7] ?? null,                    // telefon
                $cols[8] ?? null,                    // pozice_id
                $cols[9] ?? null,                    // lokalita_id
                $cols[10] ?? 40,                     // organizace_id (default 40)
                $cols[11] ?? null,                   // usek_id
                $cols[12] ?? 0,                      // aktivni
                0,                                   // vynucena_zmena_hesla
                $cols[13] ?? date('Y-m-d H:i:s'),    // dt_vytvoreni
                $cols[14] ?? null,                   // dt_aktualizace
                $cols[15] ?? '0000-00-00 00:00:00'   // dt_posledni_aktivita
            ]);
            $importedCount++;
        } catch (Exception $e) {
            $errors[] = "Řádek " . ($lineNum + 2) . " (ID: " . ($cols[0] ?? 'NULL') . "): " . $e->getMessage();
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
        echo "\n";
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
    
    $appliedFixes = 0;
    $remainingNologin = $nologinCount;
    
    if ($nologinCount > 0) {
        // Načteme opravy z našeho předchozího souboru
        $fixFile = 'fix_nologin_SIMPLE_2026-01-04_16-53-10.sql';
        
        if (file_exists($fixFile)) {
            $fixLines = file($fixFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            
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
    echo "- Chyby při importu: " . count($errors) . "\n";
    echo "- Aplikované opravy nologin: $appliedFixes\n";
    echo "- Zbývající nologin uživatelé: $remainingNologin\n\n";
    
    echo "🔍 KONTROLNÍ DOTAZY PRO OVĚŘENÍ:\n";
    echo "-- Zobrazit celkový počet:\n";
    echo "SELECT COUNT(*) as celkem FROM `$testTable`;\n\n";
    
    echo "-- Porovnání s původní tabulkou:\n";
    echo "SELECT 'Původní' as tabulka, COUNT(*) as pocet FROM 25_uzivatele\n";
    echo "UNION ALL\n";
    echo "SELECT 'Testovací' as tabulka, COUNT(*) as pocet FROM `$testTable`;\n\n";
    
    echo "-- Nologin uživatelé (pokud zbyli):\n";
    echo "SELECT id, username, jmeno, prijmeni, aktivni FROM `$testTable` WHERE username LIKE 'nologin%';\n\n";
    
    echo "-- Nové uživatele (ID > $originalCount):\n";
    echo "SELECT id, username, jmeno, prijmeni, email FROM `$testTable` WHERE id > $originalCount ORDER BY id;\n\n";
    
    echo "-- Uživatelé s u0xxxx usernamey:\n";
    echo "SELECT id, username, jmeno, prijmeni, aktivni FROM `$testTable` WHERE username LIKE 'u%' ORDER BY username;\n\n";
    
    echo "-- Kontrola aktivních uživatelů:\n";
    echo "SELECT aktivni, COUNT(*) as pocet FROM `$testTable` GROUP BY aktivni;\n\n";
    
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
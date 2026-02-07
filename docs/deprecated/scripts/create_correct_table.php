<?php
// Načítáme konfiguraci databáze
$config = require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$mysql_config = $config['mysql'];

// PDO connection string
$dsn = "mysql:host={$mysql_config['host']};dbname={$mysql_config['database']};charset=utf8mb4";
$username = $mysql_config['username'];
$password = $mysql_config['password'];

echo "=== SPRÁVNÁ AKTUALIZACE - ZACHOVAT PŮVODNÍ USERNAMES ===\n";
echo "Datum: " . date("Y-m-d H:i:s") . "\n\n";

try {
    // Připojení k databázi
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Smažeme špatnou testovací tabulku
    if (file_exists('test_table_name.txt')) {
        $oldTable = trim(file_get_contents('test_table_name.txt'));
        try {
            $pdo->exec("DROP TABLE `$oldTable`");
            echo "🗑️ Smazána špatná testovací tabulka: $oldTable\n";
        } catch (Exception $e) {
            echo "⚠️ Chyba při mazání: " . $e->getMessage() . "\n";
        }
    }

    $newTestTable = '25_uzivatele_FIXED_' . date('Ymd_His');
    
    echo "🚧 Vytvářím novou správnou testovací tabulku: $newTestTable\n";
    
    // Vytvoříme kopii struktury a dat z původní tabulky
    $pdo->exec("CREATE TABLE `$newTestTable` LIKE `25_uzivatele`");
    $pdo->exec("INSERT INTO `$newTestTable` SELECT * FROM `25_uzivatele`");
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$newTestTable`");
    $count = $stmt->fetch()['count'];
    echo "✅ Zkopírováno $count uživatelů z původní tabulky\n\n";
    
    // Nyní přidáme pouze NOVÉ uživatele z třetího seznamu
    echo "📋 Přidávám nové uživatele z třetího seznamu...\n";
    
    $thirdSourceFile = 'podklady/Seznam osob - mail.csv';
    
    if (!file_exists($thirdSourceFile)) {
        throw new Exception("Soubor $thirdSourceFile neexistuje!");
    }
    
    $lines = file($thirdSourceFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $header = array_shift($lines); // Přeskočíme hlavičku CSV
    
    echo "📊 Třetí seznam obsahuje " . count($lines) . " záznamů\n";
    
    // Načteme mapování lokalit a pozic
    $lokalityMap = [];
    $stmt = $pdo->query("SELECT id, nazev FROM 25_lokality");
    while ($row = $stmt->fetch()) {
        $lokalityMap[strtolower(trim($row['nazev']))] = $row['id'];
    }
    
    $poziceMap = [];
    $stmt = $pdo->query("SELECT id, nazev_pozice FROM 25_pozice");
    while ($row = $stmt->fetch()) {
        $poziceMap[strtolower(trim($row['nazev_pozice']))] = $row['id'];
    }
    
    $addedNewUsers = 0;
    $updatedNologin = 0;
    
    foreach ($lines as $line) {
        $cols = explode(";", $line); // CSV používá středníky
        if (count($cols) < 7) continue; // Musí mít alespoň 7 sloupců
        
        // Mapování sloupců podle CSV:
        // Titul;Prijmeni;Jmeno;Titul_Za;Pozice;Lokalita;Osobni_cislo;Role;nesoulad
        $titul = trim($cols[0]);
        $prijmeni = trim($cols[1]);
        $jmeno = trim($cols[2]);
        $titulZa = trim($cols[3]);
        $pozice = trim($cols[4]);
        $lokalita = trim($cols[5]);
        $osobniCislo = trim($cols[6]);
        $role = isset($cols[7]) ? trim($cols[7]) : '';
        
        if (empty($osobniCislo) || empty($jmeno) || empty($prijmeni)) continue;
        
        // Najdeme lokality a pozice ID
        $lokalitaId = $lokalityMap[strtolower($lokalita)] ?? 40;
        $poziceId = $poziceMap[strtolower($pozice)] ?? 1;
        
        // Zkontrolujeme, jestli už uživatel existuje (podle jména)
        $stmt = $pdo->prepare("SELECT id, username, jmeno, prijmeni FROM `$newTestTable` WHERE jmeno = ? AND prijmeni = ?");
        $stmt->execute([$jmeno, $prijmeni]);
        $existingUser = $stmt->fetch();
        
        if ($existingUser) {
            // Uživatel už existuje
            if (strpos($existingUser['username'], 'nologin') === 0) {
                // Má nologin username - opravíme ho na správné osobní číslo
                $stmt = $pdo->prepare("UPDATE `$newTestTable` SET username = ?, aktivni = 1 WHERE id = ?");
                $stmt->execute([$osobniCislo, $existingUser['id']]);
                echo "🔧 Opraven nologin: ID {$existingUser['id']}, {$existingUser['username']} → $osobniCislo ({$jmeno} {$prijmeni})\n";
                $updatedNologin++;
            } else {
                echo "✅ Ponechán: ID {$existingUser['id']}, username {$existingUser['username']} ({$jmeno} {$prijmeni})\n";
            }
        } else {
            // Nový uživatel - přidáme ho
            $newId = 200 + $addedNewUsers; // Začneme od ID 200
            
            $stmt = $pdo->prepare("INSERT INTO `$newTestTable` 
                (id, username, password_hash, jmeno, prijmeni, pozice_id, lokalita_id, 
                 organizace_id, usek_id, aktivni, vynucena_zmena_hesla, dt_vytvoreni, dt_posledni_aktivita) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 40, 1, 1, 0, NOW(), NOW())");
            
            $stmt->execute([
                $newId,
                $osobniCislo,
                'temporary_hash_' . $newId,
                $jmeno,
                $prijmeni,
                $poziceId,
                $lokalitaId
            ]);
            
            echo "➕ Přidán nový: ID $newId, $osobniCislo ({$jmeno} {$prijmeni})\n";
            $addedNewUsers++;
        }
    }
    
    // Zkontrolujeme zbývající nologin uživatele
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$newTestTable` WHERE username LIKE 'nologin%'");
    $remainingNologin = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$newTestTable`");
    $totalUsers = $stmt->fetch()['count'];
    
    echo "\n" . str_repeat("=", 60) . "\n";
    echo "✅ SPRÁVNÁ TESTOVACÍ TABULKA PŘIPRAVENA: `$newTestTable`\n";
    echo str_repeat("=", 60) . "\n\n";
    
    echo "📊 VÝSLEDKY:\n";
    echo "- Celkem uživatelů: $totalUsers\n";
    echo "- Opravené nologin uživatele: $updatedNologin\n";
    echo "- Přidaní noví uživatelé: $addedNewUsers\n";
    echo "- Zbývající nologin uživatelé: $remainingNologin\n\n";
    
    echo "🔍 KONTROLNÍ DOTAZY:\n";
    echo "-- Michaela Nováková:\n";
    echo "SELECT id, username, jmeno, prijmeni FROM `$newTestTable` WHERE jmeno = 'Michaela' AND prijmeni = 'Nováková';\n\n";
    
    echo "-- Zbývající nologin:\n";
    echo "SELECT id, username, jmeno, prijmeni FROM `$newTestTable` WHERE username LIKE 'nologin%';\n\n";
    
    echo "-- Nově přidaní:\n";
    echo "SELECT id, username, jmeno, prijmeni FROM `$newTestTable` WHERE id >= 200;\n\n";
    
    // Uložíme název nové tabulky
    file_put_contents('test_table_name.txt', $newTestTable);
    echo "📝 Název tabulky uložen do: test_table_name.txt\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
}
?>
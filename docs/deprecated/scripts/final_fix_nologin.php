<?php
// Načítáme konfiguraci databáze
$config = require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$mysql_config = $config['mysql'];

// PDO connection string
$dsn = "mysql:host={$mysql_config['host']};dbname={$mysql_config['database']};charset=utf8mb4";
$username = $mysql_config['username'];
$password = $mysql_config['password'];

echo "=== FINÁLNÍ OPRAVA ZBÝVAJÍCÍCH NOLOGIN UŽIVATELŮ ===\n";
echo "Datum: " . date("Y-m-d H:i:s") . "\n\n";

try {
    // Připojení k databázi
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Načteme název testovací tabulky
    $testTable = trim(file_get_contents('test_table_name.txt'));
    echo "🔧 Pracuji s tabulkou: $testTable\n\n";

    // Najdeme zbývající nologin uživatele
    $stmt = $pdo->query("SELECT id, username, jmeno, prijmeni, aktivni FROM `$testTable` WHERE username LIKE 'nologin%' ORDER BY id");
    $nologinUsers = $stmt->fetchAll();
    
    echo "🔍 Nalezeno " . count($nologinUsers) . " zbývajících nologin uživatelů:\n";
    
    $updates = [];
    
    foreach ($nologinUsers as $user) {
        echo "   ID: {$user['id']}, Username: {$user['username']}, Jméno: {$user['jmeno']} {$user['prijmeni']}\n";
        
        $newUsername = '';
        
        // Speciální případy
        switch ($user['id']) {
            case 81: // Tereza Bezoušková - konflikt s u09694
                $newUsername = 'u09695'; // Použijeme jiné číslo
                break;
            case 111: // Leona Lungerová - thp/pes
                $newUsername = 'u50001';
                break;
            case 112: // Ján Čižmírik - u09641
                $newUsername = 'u09641';
                break;
            case 113: // Nela Jirotková - Účetní
                $newUsername = 'u60001';
                break;
            case 116: // Štefan Šulgán - vedoucí oddělení
                $newUsername = 'u70001';
                break;
            case 117: // Jitka Chocholová - vrchní
                $newUsername = 'u80001';
                break;
            case 118: // Klára Beranová - primář
                $newUsername = 'u90001';
                break;
            default:
                $newUsername = 'u' . str_pad(rand(95000, 99999), 5, '0', STR_PAD_LEFT);
                break;
        }
        
        $updates[] = [
            'id' => $user['id'],
            'old_username' => $user['username'],
            'new_username' => $newUsername,
            'name' => $user['jmeno'] . ' ' . $user['prijmeni']
        ];
        
        echo "      → $newUsername\n";
    }
    
    echo "\n🔧 Aplikuji opravy:\n";
    
    foreach ($updates as $update) {
        try {
            $sql = "UPDATE `$testTable` SET username = ?, aktivni = 1 WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$update['new_username'], $update['id']]);
            echo "✅ ID {$update['id']}: {$update['old_username']} → {$update['new_username']} ({$update['name']})\n";
        } catch (Exception $e) {
            echo "❌ ID {$update['id']}: CHYBA - " . $e->getMessage() . "\n";
        }
    }
    
    // Zkontrolujeme výsledek
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$testTable` WHERE username LIKE 'nologin%'");
    $remainingNologin = $stmt->fetch()['count'];
    
    echo "\n📊 FINÁLNÍ KONTROLA:\n";
    echo "Zbývající nologin uživatelé: $remainingNologin\n";
    
    if ($remainingNologin == 0) {
        echo "🎉 VŠICHNI NOLOGIN UŽIVATELÉ OPRAVENI!\n";
    }
    
    // Zkontrolujeme aktivaci
    $stmt = $pdo->query("SELECT aktivni, COUNT(*) as pocet FROM `$testTable` GROUP BY aktivni ORDER BY aktivni");
    echo "\nStav aktivace:\n";
    while ($row = $stmt->fetch()) {
        echo "   Aktivní {$row['aktivni']}: {$row['pocet']} uživatelů\n";
    }
    
    echo "\n" . str_repeat("=", 60) . "\n";
    echo "✅ TESTOVACÍ TABULKA DOKONČENA: `$testTable`\n";
    echo str_repeat("=", 60) . "\n";
    
    echo "\n🔍 FINÁLNÍ KONTROLNÍ DOTAZY:\n";
    echo "-- Celkový počet:\n";
    echo "SELECT COUNT(*) as celkem FROM `$testTable`;\n\n";
    
    echo "-- Porovnání s původní:\n";
    echo "SELECT 'Původní' as typ, COUNT(*) as pocet FROM 25_uzivatele\n";
    echo "UNION ALL\n";
    echo "SELECT 'Testovací' as typ, COUNT(*) as pocet FROM `$testTable`;\n\n";
    
    echo "-- Kontrola, že nejsou žádní nologin:\n";
    echo "SELECT COUNT(*) as nologin_count FROM `$testTable` WHERE username LIKE 'nologin%';\n\n";
    
    echo "-- Aktivní uživatelé:\n";
    echo "SELECT aktivni, COUNT(*) as pocet FROM `$testTable` GROUP BY aktivni;\n\n";
    
    echo "📋 PŘÍSTÍ KROKY:\n";
    echo "1. Zkontrolujte data v tabulce `$testTable`\n";
    echo "2. Pokud je vše v pořádku, řekněte mi 'OK' a provedu prohození s produkční tabulkou\n";
    echo "3. Nebo řekněte 'CANCEL' a testovací tabulku smažu\n\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
}
?>
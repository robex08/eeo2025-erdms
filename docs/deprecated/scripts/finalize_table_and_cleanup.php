<?php
/**
 * FINALIZACE TABULKY A CLEANUP
 * 
 * 1. Doplní správné MD5 hashy pro nové uživatele
 * 2. Smaže všechny testovací tabulky
 * 3. Zobrazí výslednou finální tabulku
 */

try {
    $pdo = new PDO(
        'mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4',
        'erdms_user',
        'CHANGE_ME_DB_PASSWORD',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    echo str_repeat("=", 80) . "\n";
    echo "🔧 FINALIZACE TABULKY A CLEANUP\n";
    echo str_repeat("=", 80) . "\n\n";

    $finalTable = '25_uzivatele_FINAL_20260104_173140';
    
    // 1. DOPLNĚNÍ SPRÁVNÝCH HASHŮ HESEL
    echo "🔐 KROK 1: Doplňování správných hashů hesel\n";
    echo str_repeat("-", 50) . "\n";
    
    // Najdi všechny uživatele s temporary_hash
    $stmt = $pdo->query("SELECT id, username, password_hash FROM `$finalTable` WHERE password_hash LIKE 'temporary_hash%'");
    $tempUsers = $stmt->fetchAll();
    
    echo "📋 Nalezeno " . count($tempUsers) . " uživatelů s temporary hashem\n\n";
    
    foreach ($tempUsers as $user) {
        // Vygeneruj MD5 hash z username (jako default heslo)
        // Můžeš použít jiný vzorec, třeba: md5('password123') nebo md5($username)
        $defaultPassword = 'password123'; // Default heslo pro nové uživatele
        $hash = md5($defaultPassword);
        
        $stmt = $pdo->prepare("UPDATE `$finalTable` SET password_hash = ?, vynucena_zmena_hesla = 1 WHERE id = ?");
        $stmt->execute([$hash, $user['id']]);
        
        echo "✅ ID {$user['id']} ({$user['username']}): hash nastaven (vynucená změna hesla)\n";
    }
    
    // 2. SMAZÁNÍ TESTOVACÍCH TABULEK
    echo "\n🗑️  KROK 2: Mazání testovacích tabulek\n";
    echo str_repeat("-", 50) . "\n";
    
    // Najdi všechny testovací a finální tabulky (kromě té správné)
    $stmt = $pdo->query("SHOW TABLES LIKE '25_uzivatele_%'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $deletedCount = 0;
    foreach ($tables as $table) {
        if ($table === $finalTable) {
            echo "✅ Zachována: $table\n";
            continue;
        }
        
        try {
            $pdo->exec("DROP TABLE IF EXISTS `$table`");
            echo "🗑️  Smazána: $table\n";
            $deletedCount++;
        } catch (Exception $e) {
            echo "⚠️  Nelze smazat $table: " . $e->getMessage() . "\n";
        }
    }
    
    // 3. FINÁLNÍ STATISTIKY
    echo "\n" . str_repeat("=", 80) . "\n";
    echo "🎯 FINALIZACE DOKONČENA\n";
    echo str_repeat("=", 80) . "\n\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$finalTable`");
    $totalUsers = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$finalTable` WHERE username LIKE 'nologin%'");
    $nologinCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$finalTable` WHERE password_hash LIKE 'temporary%'");
    $tempHashCount = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$finalTable` WHERE vynucena_zmena_hesla = 1");
    $forceChangeCount = $stmt->fetch()['count'];
    
    echo "📊 VÝSLEDNÁ TABULKA: `$finalTable`\n";
    echo "- Celkem uživatelů: $totalUsers\n";
    echo "- Zbývající nologin usernames: $nologinCount\n";
    echo "- Temporary hashe: $tempHashCount\n";
    echo "- Vynucená změna hesla: $forceChangeCount\n";
    echo "- Smazáno testovacích tabulek: $deletedCount\n\n";
    
    echo "🔍 KONTROLNÍ DOTAZY:\n";
    echo "-- Zobrazit nové uživatele (ID >= 111):\n";
    echo "SELECT id, username, jmeno, prijmeni, vynucena_zmena_hesla FROM `$finalTable` WHERE id >= 111;\n\n";
    
    echo "-- Zbývající nologin uživatelé:\n";
    echo "SELECT id, username, jmeno, prijmeni FROM `$finalTable` WHERE username LIKE 'nologin%';\n\n";
    
    echo "✅ Tabulka `$finalTable` je připravena k použití!\n\n";
    
} catch (Exception $e) {
    echo "\n❌ CHYBA: " . $e->getMessage() . "\n\n";
    exit(1);
}
?>

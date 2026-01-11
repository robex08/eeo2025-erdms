<?php
/**
 * SWAP TABULEK - NAHRAZENÍ PŮVODNÍ TABULKY FINÁLNÍ
 * 
 * 1. Přejmenuje původní 25_uzivatele na 25_uzivatele_BACKUP_<timestamp>
 * 2. Přejmenuje 25_uzivatele_FINAL_20260104_173140 na 25_uzivatele
 */

try {
    $pdo = new PDO(
        'mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4',
        'erdms_user',
        'AhchohTahnoh7eim',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    echo str_repeat("=", 80) . "\n";
    echo "🔄 SWAP TABULEK - NASAZENÍ FINÁLNÍ TABULKY\n";
    echo str_repeat("=", 80) . "\n\n";

    $finalTable = '25_uzivatele_FINAL_20260104_173140';
    $backupName = '25_uzivatele_BACKUP_' . date('Ymd_His');
    
    // Ověření, že finální tabulka existuje
    $stmt = $pdo->query("SHOW TABLES LIKE '$finalTable'");
    if ($stmt->rowCount() === 0) {
        throw new Exception("Finální tabulka $finalTable neexistuje!");
    }
    
    // Ověření, že původní tabulka existuje
    $stmt = $pdo->query("SHOW TABLES LIKE '25_uzivatele'");
    if ($stmt->rowCount() === 0) {
        throw new Exception("Původní tabulka 25_uzivatele neexistuje!");
    }
    
    echo "📋 PŘED SWAPEM:\n";
    echo str_repeat("-", 50) . "\n";
    
    // Počet uživatelů v původní tabulce
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM 25_uzivatele");
    $oldCount = $stmt->fetch()['count'];
    echo "- Původní 25_uzivatele: $oldCount uživatelů\n";
    
    // Počet uživatelů ve finální tabulce
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$finalTable`");
    $newCount = $stmt->fetch()['count'];
    echo "- Finální $finalTable: $newCount uživatelů\n\n";
    
    echo "⚠️  POTVRZENÍ:\n";
    echo "   Původní tabulka bude přejmenována na: $backupName\n";
    echo "   Finální tabulka se stane novou: 25_uzivatele\n\n";
    
    // ATOMICKÝ SWAP pomocí RENAME TABLE
    echo "🔄 Provádím SWAP...\n";
    echo str_repeat("-", 50) . "\n";
    
    // MySQL RENAME TABLE je atomická operace
    $pdo->exec("RENAME TABLE 
        25_uzivatele TO `$backupName`,
        `$finalTable` TO 25_uzivatele
    ");
    
    echo "✅ SWAP dokončen!\n\n";
    
    // Ověření výsledku
    echo "📊 PO SWAPU:\n";
    echo str_repeat("-", 50) . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM 25_uzivatele");
    $currentCount = $stmt->fetch()['count'];
    echo "- Aktivní 25_uzivatele: $currentCount uživatelů\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$backupName`");
    $backupCount = $stmt->fetch()['count'];
    echo "- Backup $backupName: $backupCount uživatelů\n\n";
    
    // Zobrazení několika uživatelů pro kontrolu
    echo "🔍 KONTROLA - Prvních 5 uživatelů v nové tabulce:\n";
    echo str_repeat("-", 50) . "\n";
    $stmt = $pdo->query("SELECT id, username, jmeno, prijmeni, telefon FROM 25_uzivatele ORDER BY id LIMIT 5");
    while ($row = $stmt->fetch()) {
        echo sprintf("ID %3d: %-15s %s %s %s\n", 
            $row['id'], 
            $row['username'], 
            $row['jmeno'], 
            $row['prijmeni'],
            $row['telefon'] ?? '(bez telefonu)'
        );
    }
    
    echo "\n" . str_repeat("=", 80) . "\n";
    echo "🎉 SWAP ÚSPĚŠNĚ DOKONČEN!\n";
    echo str_repeat("=", 80) . "\n\n";
    
    echo "✅ Nová aktivní tabulka: 25_uzivatele ($currentCount uživatelů)\n";
    echo "💾 Backup uložen jako: $backupName ($backupCount uživatelů)\n\n";
    
    echo "⚠️  POZNÁMKA:\n";
    echo "   Pokud vše funguje správně, můžeš později smazat backup tabulku:\n";
    echo "   DROP TABLE `$backupName`;\n\n";
    
} catch (Exception $e) {
    echo "\n❌ CHYBA: " . $e->getMessage() . "\n\n";
    echo "⚠️  Tabulky nebyly změněny!\n\n";
    exit(1);
}
?>

<?php
/**
 * DEBUG: Test cashbook entry delete flow
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "=== DEBUG CASHBOOK DELETE ===\n\n";

// Načíst konfiguraci
$config = require '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php';

echo "1. Připojení k databázi...\n";
try {
    $db = new PDO(
        "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
        $config['mysql']['username'],
        $config['mysql']['password'],
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        )
    );
    echo "✓ DB připojení OK\n\n";
} catch (Exception $e) {
    die("✗ DB CHYBA: " . $e->getMessage() . "\n");
}

echo "2. Test SELECT položky...\n";
try {
    $stmt = $db->prepare("
        SELECT id, pokladni_kniha_id, datum_zapisu, obsah_zapisu, smazano 
        FROM " . TBL_POKLADNI_POLOZKY . " 
        WHERE smazano = 0 
        ORDER BY id DESC 
        LIMIT 1
    ");
    $stmt->execute();
    $entry = $stmt->fetch();
    
    if ($entry) {
        echo "✓ Nalezena položka ID: {$entry['id']}\n";
        echo "  - Kniha ID: {$entry['pokladni_kniha_id']}\n";
        echo "  - Datum: {$entry['datum_zapisu']}\n";
        echo "  - Obsah: {$entry['obsah_zapisu']}\n";
        echo "  - Smazáno: {$entry['smazano']}\n\n";
    } else {
        die("✗ Žádné položky k testování\n");
    }
} catch (Exception $e) {
    die("✗ SELECT CHYBA: " . $e->getMessage() . "\n");
}

echo "3. Test UPDATE (soft delete) - DRY RUN...\n";
try {
    // Nejdřív zkusíme EXPLAIN
    $stmt = $db->prepare("
        EXPLAIN UPDATE " . TBL_POKLADNI_POLOZKY . " 
        SET smazano = 1, smazano_kdy = NOW(), smazano_kym = ? 
        WHERE id = ?
    ");
    $stmt->execute(array(1, $entry['id']));
    $explain = $stmt->fetch();
    echo "✓ EXPLAIN UPDATE OK\n";
    print_r($explain);
    echo "\n";
} catch (Exception $e) {
    die("✗ EXPLAIN CHYBA: " . $e->getMessage() . "\n");
}

echo "4. Test skutečného UPDATE...\n";
try {
    $db->beginTransaction();
    
    $stmt = $db->prepare("
        UPDATE " . TBL_POKLADNI_POLOZKY . " 
        SET smazano = 1, smazano_kdy = NOW(), smazano_kym = ? 
        WHERE id = ?
    ");
    $result = $stmt->execute(array(999, $entry['id'])); // Použijeme fake user_id 999
    
    echo "✓ UPDATE provedeno: " . ($result ? 'TRUE' : 'FALSE') . "\n";
    echo "  - Affected rows: " . $stmt->rowCount() . "\n\n";
    
    // Ověříme změnu
    $stmt = $db->prepare("SELECT smazano, smazano_kdy, smazano_kym FROM " . TBL_POKLADNI_POLOZKY . " WHERE id = ?");
    $stmt->execute(array($entry['id']));
    $updated = $stmt->fetch();
    
    echo "5. Ověření změny:\n";
    echo "  - smazano: {$updated['smazano']}\n";
    echo "  - smazano_kdy: {$updated['smazano_kdy']}\n";
    echo "  - smazano_kym: {$updated['smazano_kym']}\n\n";
    
    // ROLLBACK - nechceme skutečně smazat
    $db->rollBack();
    echo "✓ ROLLBACK - změny nebyly uloženy\n\n";
    
} catch (Exception $e) {
    $db->rollBack();
    die("✗ UPDATE CHYBA: " . $e->getMessage() . "\n");
}

echo "6. Test konstanty TBL_POKLADNI_POLOZKY...\n";
echo "  - Konstanta: " . TBL_POKLADNI_POLOZKY . "\n";
echo "  - Defined: " . (defined('TBL_POKLADNI_POLOZKY') ? 'YES' : 'NO') . "\n\n";

echo "=== VŠECHNY TESTY ÚSPĚŠNÉ ===\n";
echo "SQL dotazy fungují správně!\n";

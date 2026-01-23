<?php
/**
 * Debug script pro testování invoice upload handleru
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== TEST INVOICE UPLOAD DEBUG ===\n\n";

// Načti konfiguraci
$_config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$config = $_config['mysql'];

echo "1. Konfigurace načtena:\n";
echo "   DB: " . $config['database'] . "\n";
echo "   Upload root: " . $_config['upload']['root_path'] . "\n\n";

// Načti handler funkce
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/api.php';

echo "2. API.php načteno\n\n";

// Test připojení k DB
try {
    $db = get_db($config);
    echo "3. Připojení k DB OK\n\n";
    
    // Zjisti, jestli existuje faktura 78
    $sql = "SELECT f.id, f.objednavka_id FROM " . TBL_FAKTURY . " f WHERE f.id = 78";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($invoice) {
        echo "4. Faktura 78 existuje:\n";
        echo "   ID: " . $invoice['id'] . "\n";
        echo "   Objednávka ID: " . $invoice['objednavka_id'] . "\n\n";
    } else {
        echo "4. CHYBA: Faktura 78 neexistuje!\n\n";
    }
    
    // Test upload path funkce
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceAttachmentHandlers.php';
    
    $uploadPath = get_order_v2_invoice_upload_path($_config, 78, 1);
    echo "5. Upload path pro fakturu 78:\n";
    echo "   $uploadPath\n";
    echo "   Existuje: " . (is_dir($uploadPath) ? "ANO" : "NE") . "\n\n";
    
    // Test tabulky příloh
    $sql = "SELECT COUNT(*) as cnt FROM " . TBL_FAKTURY_PRILOHY;
    $stmt = $db->query($sql);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "6. Tabulka příloh faktur:\n";
    echo "   Počet záznamů: " . $result['cnt'] . "\n\n";
    
    // Test validate funkce
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2AttachmentHandlers.php';
    
    $testFile = array(
        'name' => 'test.pdf',
        'size' => 1024,
        'error' => UPLOAD_ERR_OK
    );
    
    $validation = validate_order_v2_file_upload($_config, $testFile);
    echo "7. Validace testovacího souboru:\n";
    echo "   " . print_r($validation, true) . "\n";
    
    echo "\n=== TEST DOKONČEN ===\n";
    
} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

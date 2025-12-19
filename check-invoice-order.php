<?php
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/db.php';

$config = array(
    'db_host' => '10.3.172.11',
    'db_name' => 'erdms_eeo_v2_test',
    'db_user' => 'eeo_v2_user',
    'db_pass' => 'eeo_Secure_4567'
);

try {
    $db = get_db($config);
    
    echo "=== Kontrola objednavka_id u duplikovaných faktur ===\n\n";
    
    $sql = "SELECT id, objednavka_id, fa_cislo_vema, aktivni FROM 25a_objednavky_faktury WHERE id IN (138, 139, 140, 141, 142, 143)";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $faktury = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($faktury as $f) {
        echo "ID: {$f['id']}, objednavka_id: {$f['objednavka_id']}, fa_cislo: {$f['fa_cislo_vema']}, aktivni: {$f['aktivni']}\n";
        
        if ($f['objednavka_id']) {
            // Zkontrolovat existenci objednávky
            $sql_order = "SELECT id, aktivni, uzivatel_id FROM 25a_objednavky WHERE id = ?";
            $stmt_order = $db->prepare($sql_order);
            $stmt_order->execute(array($f['objednavka_id']));
            $order = $stmt_order->fetch(PDO::FETCH_ASSOC);
            
            if ($order) {
                echo "  → Objednávka {$order['id']}: aktivni={$order['aktivni']}, uzivatel_id={$order['uzivatel_id']}\n";
            } else {
                echo "  → ❌ Objednávka {$f['objednavka_id']} NEEXISTUJE!\n";
            }
        } else {
            echo "  → ❌ objednavka_id je NULL!\n";
        }
        echo "\n";
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

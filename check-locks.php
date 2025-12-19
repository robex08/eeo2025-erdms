<?php
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/db.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/config.php';

$order_id = isset($argv[1]) ? (int)$argv[1] : null;

try {
    $config = get_api_config();
    $db = get_db($config);
    
    if ($order_id) {
        $stmt = $db->prepare("
            SELECT o.id, o.cislo_objednavky, o.zamek_uzivatel_id, o.dt_zamek,
                   TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) as mins,
                   CONCAT(u.jmeno, ' ', u.prijmeni) as user_name
            FROM 25_objednavky o
            LEFT JOIN uzivatel u ON o.zamek_uzivatel_id = u.id
            WHERE o.id = :id
        ");
        $stmt->execute([':id' => $order_id]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            echo "Objednávka #$order_id nenalezena\n";
            exit(1);
        }
        
        echo "Objednávka: {$order['cislo_objednavky']}\n";
        if ($order['zamek_uzivatel_id']) {
            echo "ZAMČENÁ: {$order['user_name']} (ID: {$order['zamek_uzivatel_id']})\n";
            echo "Čas: {$order['dt_zamek']} (před {$order['mins']} min)\n";
        } else {
            echo "ODEMČENÁ\n";
        }
    } else {
        $stmt = $db->query("
            SELECT o.id, o.cislo_objednavky, o.zamek_uzivatel_id,
                   TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) as mins,
                   CONCAT(u.jmeno, ' ', u.prijmeni) as user_name
            FROM 25_objednavky o
            LEFT JOIN uzivatel u ON o.zamek_uzivatel_id = u.id
            WHERE o.zamek_uzivatel_id > 0
            ORDER BY o.dt_zamek DESC
            LIMIT 20
        ");
        
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($orders)) {
            echo "Žádné zamčené objednávky\n";
        } else {
            echo "Zamčené objednávky (" . count($orders) . "):\n\n";
            foreach ($orders as $o) {
                $exp = $o['mins'] > 15 ? ' [VYPRŠELO]' : '';
                echo "#{$o['id']} {$o['cislo_objednavky']} - {$o['user_name']} (před {$o['mins']} min)$exp\n";
            }
        }
    }
} catch (Exception $e) {
    echo "CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}

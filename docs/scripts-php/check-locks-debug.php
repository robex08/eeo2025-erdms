<?php
/**
 * DEBUG SCRIPT: Kontrola LOCK statusu objednávek
 * Použití: php check-locks-debug.php [order_id]
 */

require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/db.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/config.php';

$order_id = isset($argv[1]) ? (int)$argv[1] : null;

try {
    $config = get_api_config();
    $db = get_db($config);
    
    if ($order_id) {
        // Konkrétní objednávka
        echo "🔍 Kontrola objednávky #$order_id\n";
        echo str_repeat("=", 60) . "\n\n";
        
        $stmt = $db->prepare("
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.zamek_uzivatel_id,
                o.dt_zamek,
                TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) as lock_age_minutes,
                CASE 
                    WHEN o.dt_zamek IS NULL OR o.zamek_uzivatel_id = 0 THEN 'unlocked'
                    WHEN TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) > 15 THEN 'expired'
                    ELSE 'locked'
                END as lock_status,
                CONCAT(u.jmeno, ' ', u.prijmeni) as locked_by_user,
                u.email as locked_by_email,
                u.telefon as locked_by_telefon
            FROM 25_objednavky o
            LEFT JOIN uzivatel u ON o.zamek_uzivatel_id = u.id
            WHERE o.id = :id
        ");
        
        $stmt->execute([':id' => $order_id]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            echo "❌ Objednávka nenalezena!\n";
            exit(1);
        }
        
        echo "📋 Objednávka: {$order['cislo_objednavky']}\n";
        echo "🔒 Status: {$order['lock_status']}\n";
        
        if ($order['zamek_uzivatel_id']) {
            echo "👤 Zamčeno uživatelem: {$order['locked_by_user']} (ID: {$order['zamek_uzivatel_id']})\n";
            echo "📧 Email: {$order['locked_by_email']}\n";
            echo "📞 Telefon: {$order['locked_by_telefon']}\n";
            echo "🕐 Čas zamčení: {$order['dt_zamek']}\n";
            echo "⏱️  Zamčeno před: {$order['lock_age_minutes']} minutami\n";
            
            if ($order['lock_status'] === 'expired') {
                echo "\n⚠️  POZOR: Zámek vypršel (> 15 minut)!\n";
            }
        } else {
            echo "✅ Objednávka je ODEMČENÁ\n";
        }
        
    } else {
        // Všechny zamčené objednávky
        echo "🔍 Kontrola všech zamčených objednávek\n";
        echo str_repeat("=", 60) . "\n\n";
        
        $stmt = $db->prepare("
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.zamek_uzivatel_id,
                o.dt_zamek,
                TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) as lock_age_minutes,
                CASE 
                    WHEN TIMESTAMPDIFF(MINUTE, o.dt_zamek, NOW()) > 15 THEN 'expired'
                    ELSE 'locked'
                END as lock_status,
                CONCAT(u.jmeno, ' ', u.prijmeni) as locked_by_user,
                u.email as locked_by_email
            FROM 25_objednavky o
            LEFT JOIN uzivatel u ON o.zamek_uzivatel_id = u.id
            WHERE o.zamek_uzivatel_id IS NOT NULL 
              AND o.zamek_uzivatel_id > 0
            ORDER BY o.dt_zamek DESC
            LIMIT 50
        ");
        
        $stmt->execute();
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($orders)) {
            echo "✅ Žádné zamčené objednávky!\n";
            exit(0);
        }
        
        echo "Nalezeno " . count($orders) . " zamčených objednávek:\n\n";
        
        foreach ($orders as $order) {
            $status_icon = $order['lock_status'] === 'expired' ? '⚠️ ' : '🔒';
            echo "{$status_icon} #{$order['id']} - {$order['cislo_objednavky']}\n";
            echo "   👤 {$order['locked_by_user']} (ID: {$order['zamek_uzivatel_id']})\n";
            echo "   📧 {$order['locked_by_email']}\n";
            echo "   🕐 {$order['dt_zamek']} (před {$order['lock_age_minutes']} min)\n";
            
            if ($order['lock_status'] === 'expired') {
                echo "   ⚠️  VYPRŠELO!\n";
            }
            
            echo "\n";
        }
        
        // Statistika
        $expired_count = count(array_filter($orders, function($o) { return $o['lock_status'] === 'expired'; }));
        $active_count = count($orders) - $expired_count;
        
        echo str_repeat("=", 60) . "\n";
        echo "📊 Statistika:\n";
        echo "   Aktivní zámky: $active_count\n";
        echo "   Vypršelé zámky: $expired_count\n";
    }
    
} catch (Exception $e) {
    echo "❌ Chyba: " . $e->getMessage() . "\n";
    exit(1);
}

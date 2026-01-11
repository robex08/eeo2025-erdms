<?php
/**
 * 🔍 WORKFLOW VERIFICATION TEST
 * 
 * Test průchodu workflow "odeslána ke schválení":
 * 1. Simuluje trigger z orderV2Endpoints.php
 * 2. Testuje notificationRouter()
 * 3. Ověří příjemce z profilu PRIKAZCI
 */

// DB konfigurace
$config = require('/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php');
require_once('/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php');

// DB připojení funkce
function create_db_connection() {
    global $config;
    $dsn = "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4";
    return new PDO($dsn, $config['mysql']['username'], $config['mysql']['password'], array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ));
}

try {
    echo "🔍 WORKFLOW VERIFICATION TEST\n";
    echo "═══════════════════════════════════════════════════════════\n\n";

    // 1. DB Connection
    echo "1️⃣ Připojení k databázi...\n";
    $pdo = create_db_connection();
    echo "   ✅ Připojeno k: " . DB_HOST . "/" . DB_NAME . "\n\n";

    // 2. Kontrola global settings
    echo "2️⃣ Global settings...\n";
    $stmt = $pdo->prepare("SELECT klic, hodnota FROM 25a_nastaveni_globalni WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id')");
    $stmt->execute();
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    foreach ($settings as $key => $value) {
        echo "   ✅ $key = $value\n";
    }
    
    if ($settings['hierarchy_enabled'] != '1') {
        echo "   ❌ PROBLÉM: Hierarchie není aktivní!\n";
        exit(1);
    }
    
    if (!isset($settings['hierarchy_profile_id'])) {
        echo "   ❌ PROBLÉM: hierarchy_profile_id není nastaven!\n";
        exit(1);
    }
    
    $profileId = $settings['hierarchy_profile_id'];
    echo "\n";

    // 3. Kontrola profilu
    echo "3️⃣ Profil $profileId...\n";
    $stmt = $pdo->prepare("SELECT id, nazev, aktivni FROM 25_hierarchie_profily WHERE id = ?");
    $stmt->execute([$profileId]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile) {
        echo "   ❌ PROBLÉM: Profil $profileId neexistuje!\n";
        exit(1);
    }
    
    if ($profile['aktivni'] != 1) {
        echo "   ❌ PROBLÉM: Profil není aktivní!\n";
        exit(1);
    }
    
    echo "   ✅ Profil '{$profile['nazev']}' je aktivní\n\n";

    // 4. Kontrola event type
    echo "4️⃣ Event type ORDER_PENDING_APPROVAL...\n";
    $stmt = $pdo->prepare("SELECT id, kod, nazev FROM 25_notifikace_typy_udalosti WHERE kod = 'ORDER_PENDING_APPROVAL'");
    $stmt->execute();
    $eventType = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$eventType) {
        echo "   ❌ PROBLÉM: Event type ORDER_PENDING_APPROVAL neexistuje!\n";
        exit(1);
    }
    
    echo "   ✅ ID {$eventType['id']}: {$eventType['kod']} - {$eventType['nazev']}\n\n";

    // 5. Test simulace objednávky
    echo "5️⃣ Simulace objednávky ke schválení...\n";
    
    // Vytvoř test objednávku nebo použij existující
    $stmt = $pdo->prepare("SELECT id FROM 25_objednavky LIMIT 1");
    $stmt->execute();
    $testOrder = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$testOrder) {
        echo "   ⚠️  Žádná testovací objednávka nenalezena - vytvářím mock ID\n";
        $orderId = 99999; // Mock ID
        $triggerUserId = 1; // Admin
    } else {
        $orderId = $testOrder['id'];
        $triggerUserId = 1; // Admin jako trigger user
        echo "   ✅ Používám objednávku ID: $orderId\n";
    }

    // 6. SPUŠTĚNÍ WORKFLOW TRIGGERU
    echo "\n6️⃣ Spuštění workflow triggeru...\n";
    echo "   Event: ORDER_PENDING_APPROVAL\n";
    echo "   Object: $orderId\n";
    echo "   Trigger User: $triggerUserId\n\n";
    
    // Simuluj volání z orderV2Endpoints.php:1467
    echo "   📞 Volám notificationRouter()...\n";
    
    $result = notificationRouter($pdo, 'ORDER_PENDING_APPROVAL', $orderId, $triggerUserId, array(
        'order_number' => 'TEST-O-2025-' . $orderId,
        'subject' => 'Test objednávka pro workflow verifikaci'
    ));
    
    echo "\n7️⃣ Výsledek notificationRouter:\n";
    echo "   Success: " . ($result['success'] ? '✅ ANO' : '❌ NE') . "\n";
    echo "   Sent: {$result['sent']}\n";
    
    if (!empty($result['errors'])) {
        echo "   Errors:\n";
        foreach ($result['errors'] as $error) {
            echo "     ❌ $error\n";
        }
    }

    echo "\n";
    
    // 8. Kontrola debug logů
    echo "8️⃣ Debug logy (posledních 10)...\n";
    $stmt = $pdo->prepare("SELECT created_at, message, data FROM debug_notification_log ORDER BY id DESC LIMIT 10");
    $stmt->execute();
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($logs as $log) {
        echo "   📝 {$log['created_at']}: {$log['message']}\n";
        if ($log['data']) {
            $data = json_decode($log['data'], true);
            if ($data) {
                echo "       Data: " . json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
            }
        }
        echo "\n";
    }

    echo "═══════════════════════════════════════════════════════════\n";
    echo "✅ WORKFLOW VERIFICATION DOKONČENO\n";
    
    if ($result['success'] && $result['sent'] > 0) {
        echo "🎉 TRIGGER FUNGUJE! Bylo odesláno {$result['sent']} notifikací.\n";
    } else {
        echo "⚠️  TRIGGER NEPOSLAL ŽÁDNÉ NOTIFIKACE - kontrolujte logy výše\n";
    }

} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
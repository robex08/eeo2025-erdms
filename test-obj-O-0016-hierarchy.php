<?php
/**
 * TEST: Objednávka O-0016 - Org Hierarchy Notification
 * 
 * Testuje notifikační systém s org hierarchií pro konkrétní objednávku
 * podle profilu PRIKAZCI (ID: 12) z databáze
 */

// Nastavení error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// PHP Error Logging
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/test-hierarchy-o0016.log');

echo "=== TEST: Objednávka O-0016 - Org Hierarchy Notifications ===\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n\n";

// Include potřebných souborů
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

// Tabulkové konstanty (z api.php)
define('TBL_UZIVATELE', '25_uzivatele');
define('TBL_UZIVATELE_ROLE', '25_uzivatele_role');
define('TBL_HIERARCHIE_PROFILY', '25_hierarchie_profily');
define('TBL_NASTAVENI_GLOBALNI', '25a_nastaveni_globalni');
define('TBL_NOTIFIKACE_TYPY_UDALOSTI', '25_notifikace_typy_udalosti');

require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php';

try {
    // 1. Připojení k databázi (DEV databáze podle PHP_api.prompt.md)
    $pdo = new PDO(
        "mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8",
        "erdms_user",
        "AhchohTahnoh7eim", 
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );
    
    echo "✅ Database connected successfully (eeo2025-dev)\n\n";
    
    // 2. Najít objednávku O-0016 (formát O-0016/75030926/2026/IT)
    $stmt = $pdo->prepare("
        SELECT o.*, 
               p.username as prikazce_username,
               ob.username as objednatel_username,
               s.username as schvalovatel_username
        FROM 25a_objednavky o
        LEFT JOIN 25_uzivatele p ON o.prikazce_id = p.id
        LEFT JOIN 25_uzivatele ob ON o.objednatel_id = ob.id  
        LEFT JOIN 25_uzivatele s ON o.schvalovatel_id = s.id
        WHERE o.cislo_objednavky LIKE 'O-0016%'
        LIMIT 1
    ");
    $stmt->execute();
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        echo "❌ ERROR: Objednávka O-0016 nebyla nalezena!\n";
        exit(1);
    }
    
    echo "✅ Objednávka O-0016 nalezena:\n";
    echo "   ID: {$order['id']}\n";
    echo "   Název: {$order['predmet']}\n";
    echo "   Stav: {$order['stav_objednavky']}\n";
    echo "   Příkazce: ID {$order['prikazce_id']} ({$order['prikazce_username']})\n";
    echo "   Objednatel: ID {$order['objednatel_id']} ({$order['objednatel_username']})\n";
    echo "   Schvalovatel: ID {$order['schvalovatel_id']} ({$order['schvalovatel_username']})\n";
    echo "   Mimořádná událost: " . ($order['mimoradna_udalost'] ? 'ANO' : 'NE') . "\n\n";
    
    // 3. Zkontrolovat null values
    echo "🔍 NULL CHECK analýza:\n";
    $nullFields = [];
    $keyFields = ['prikazce_id', 'objednatel_id', 'schvalovatel_id', 'garant_uzivatel_id'];
    foreach ($keyFields as $field) {
        if ($order[$field] === null || $order[$field] === 0) {
            $nullFields[] = $field;
            echo "   ⚠️  {$field}: NULL/0 - notifications will be SKIPPED\n";
        } else {
            echo "   ✅ {$field}: {$order[$field]}\n";
        }
    }
    echo "\n";
    
    // 4. Test ORDER_PENDING_APPROVAL event
    echo "🎯 Testing ORDER_PENDING_APPROVAL workflow...\n";
    
    // Příprava eventData
    $eventData = [
        'order_id' => $order['id'],
        'prikazce_id' => $order['prikazce_id'],
        'objednatel_id' => $order['objednatel_id'], 
        'schvalovatel_id' => $order['schvalovatel_id'],
        'garant_uzivatel_id' => $order['garant_uzivatel_id'],
        'mimoradna_udalost' => $order['mimoradna_udalost'],
        'order_number' => $order['cislo_objednavky'],
        'order_subject' => $order['predmet'],
        'max_price_with_dph' => $order['max_cena_s_dph']
    ];
    
    // Volat hierarchyTriggers
    $result = resolveHierarchyNotificationRecipients('ORDER_PENDING_APPROVAL', $eventData, $pdo);
    
    if ($result === false) {
        echo "❌ Hierarchy system returned FALSE (disabled or no profile)\n";
        
        // Check global settings
        echo "\n🔍 Checking global settings:\n";
        $settingsStmt = $pdo->query("
            SELECT klic, hodnota 
            FROM 25a_nastaveni_globalni 
            WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id')
        ");
        while ($row = $settingsStmt->fetch(PDO::FETCH_ASSOC)) {
            echo "   {$row['klic']}: {$row['hodnota']}\n";
        }
        exit(1);
    }
    
    echo "✅ Hierarchy resolve SUCCESS!\n";
    echo "   Profile: {$result['profile_name']} (ID: {$result['profile_id']})\n";
    echo "   Template ID: {$result['variant_id']}\n";
    echo "   Priority: {$result['priority']}\n";
    echo "   Recipients count: " . count($result['recipients']) . "\n\n";
    
    // 5. Analýza příjemců
    if (empty($result['recipients'])) {
        echo "⚠️  NO RECIPIENTS - možné důvody:\n";
        echo "   - Všichni uživatelé mají NULL ID (správně přeskočeno)\n";
        echo "   - Neaktivní uživatelé (aktivni=0)\n";
        echo "   - Nesprávné role assignments\n";
        echo "   - Chybná scope configuration\n\n";
        
        if (!empty($nullFields)) {
            echo "   ✅ NULL fields detected: " . implode(', ', $nullFields) . "\n";
            echo "   → Notifications correctly SKIPPED due to null values!\n";
        }
    } else {
        echo "👥 RECIPIENTS ANALYSIS:\n";
        foreach ($result['recipients'] as $i => $r) {
            echo "   " . ($i+1) . ". User ID: {$r['user_id']}\n";
            echo "      Email: {$r['email']}\n";
            echo "      Username: {$r['username']}\n";
            echo "      Priority: {$r['priority']}\n";
            echo "      Delivery: Email=" . ($r['delivery']['email'] ? 'ON' : 'OFF');
            echo ", InApp=" . ($r['delivery']['inApp'] ? 'ON' : 'OFF');
            echo ", SMS=" . ($r['delivery']['sms'] ? 'ON' : 'OFF') . "\n\n";
        }
    }
    
    // 6. Test template existence
    echo "📧 Template verification:\n";
    if ($result['variant_id']) {
        $templateStmt = $pdo->prepare("
            SELECT id, type, name, app_title, email_subject
            FROM 25_notification_templates 
            WHERE id = ?
        ");
        $templateStmt->execute([$result['variant_id']]);
        $template = $templateStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($template) {
            echo "   ✅ Template found: {$template['name']} (Type: {$template['type']})\n";
            echo "   📱 App Title: {$template['app_title']}\n";
            echo "   📧 Email Subject: {$template['email_subject']}\n";
        } else {
            echo "   ❌ Template ID {$result['variant_id']} NOT FOUND!\n";
        }
    } else {
        echo "   ⚠️  No template ID returned\n";
    }
    
    echo "\n";
    
    // 7. Shrnutí testu
    echo "📊 TEST SUMMARY:\n";
    echo "   Objednávka: O-0016 (ID: {$order['id']})\n";
    echo "   Event: ORDER_PENDING_APPROVAL\n";
    echo "   Hierarchy: " . ($result ? "ENABLED" : "DISABLED") . "\n";
    echo "   Recipients: " . ($result ? count($result['recipients']) : 0) . "\n";
    echo "   NULL fields: " . (empty($nullFields) ? "none" : implode(', ', $nullFields)) . "\n";
    echo "   NULL protection: " . (!empty($nullFields) && empty($result['recipients']) ? "WORKING" : "n/a") . "\n";
    
    echo "\n✅ Test completed successfully!\n";
    
} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
?>
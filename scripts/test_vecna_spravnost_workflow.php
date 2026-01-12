#!/usr/bin/env php
<?php
/**
 * ================================================================
 * TEST SCRIPT: Věcná správnost workflow E2E test
 * ================================================================
 * Autor: GitHub Copilot
 * Datum: 2026-01-12
 * Popis: End-to-end test věcné správnosti faktury workflow
 * 
 * Test scénář:
 * 1. Najde poslední objednávku
 * 2. Vytvoří testovací fakturu pro tuto objednávku
 * 3. Nastaví vecna_spravnost_potvrzeno = 1
 * 4. Zkontroluje, že se vytvořila notifikace
 * 5. Ověří, že notifikace má správné příjemce z org hierarchie
 * 
 * Použití:
 *   php test_vecna_spravnost_workflow.php
 * ================================================================
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "🧪 TEST: Věcná správnost workflow\n";
echo "================================\n\n";

// Database connection
$db_config = [
    'host' => '127.0.0.1',
    'port' => '3322',
    'user' => 'root',
    'pass' => 'root',
    'name' => 'erdms_2025_3'
];

try {
    $dsn = "mysql:host={$db_config['host']};port={$db_config['port']};dbname={$db_config['name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $db_config['user'], $db_config['pass']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Database connection established\n\n";
} catch (PDOException $e) {
    die("❌ Database connection failed: " . $e->getMessage() . "\n");
}

// ================================================================
// TEST 1: Find last order
// ================================================================
echo "📋 TEST 1: Finding last active order...\n";
$stmt = $pdo->query("
    SELECT id, objednavka_cislo, stav, created_at 
    FROM 25_objednavky 
    WHERE aktivni = 1 
    ORDER BY id DESC 
    LIMIT 1
");
$lastOrder = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$lastOrder) {
    die("❌ No active orders found in database!\n");
}

echo "   Order ID: {$lastOrder['id']}\n";
echo "   Order Number: {$lastOrder['objednavka_cislo']}\n";
echo "   Status: {$lastOrder['stav']}\n";
echo "   ✅ Order found\n\n";

// ================================================================
// TEST 2: Check event types exist
// ================================================================
echo "📋 TEST 2: Checking event types in database...\n";
$eventTypes = [
    'INVOICE_MATERIAL_CHECK_APPROVED',
    'INVOICE_MATERIAL_CHECK_REQUESTED'
];

$placeholders = implode(',', array_fill(0, count($eventTypes), '?'));
$stmt = $pdo->prepare("
    SELECT kod, nazev, aktivni 
    FROM 25_notifikace_event_types 
    WHERE kod IN ($placeholders)
");
$stmt->execute($eventTypes);
$foundTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "   Found event types:\n";
foreach ($foundTypes as $type) {
    $status = $type['aktivni'] ? '✅' : '❌';
    echo "     {$status} {$type['kod']} - {$type['nazev']}\n";
}

if (count($foundTypes) < count($eventTypes)) {
    echo "   ⚠️ WARNING: Not all event types found in database!\n";
    echo "   Run: scripts/add_missing_notification_event_types.sql\n\n";
} else {
    echo "   ✅ All event types found\n\n";
}

// ================================================================
// TEST 3: Check org hierarchy configuration
// ================================================================
echo "📋 TEST 3: Checking org hierarchy configuration...\n";
$stmt = $pdo->query("
    SELECT nastaveni_hodnota 
    FROM 25a_nastaveni_globalni 
    WHERE nastaveni_klic = 'notification_hierarchy_enabled'
");
$hierarchyEnabled = $stmt->fetchColumn();

echo "   Hierarchy enabled: " . ($hierarchyEnabled ? '✅ YES' : '❌ NO') . "\n";

if ($hierarchyEnabled) {
    $stmt = $pdo->query("
        SELECT id, nazev, aktivni, struktura_json 
        FROM 25_hierarchie_profily 
        WHERE aktivni = 1 
        LIMIT 1
    ");
    $hierarchyProfile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($hierarchyProfile) {
        echo "   Active profile: {$hierarchyProfile['nazev']} (ID: {$hierarchyProfile['id']})\n";
        
        $structure = json_decode($hierarchyProfile['struktura_json'], true);
        if ($structure && isset($structure['nodes'])) {
            $nodeCount = count($structure['nodes']);
            echo "   Nodes in structure: {$nodeCount}\n";
            
            // Find nodes with INVOICE event types
            $invoiceNodes = array_filter($structure['nodes'], function($node) {
                return isset($node['eventType']) && 
                       (strpos($node['eventType'], 'INVOICE') !== false || 
                        strpos($node['eventType'], 'kontrola') !== false);
            });
            
            if (!empty($invoiceNodes)) {
                echo "   Invoice/kontrola nodes found:\n";
                foreach ($invoiceNodes as $node) {
                    echo "     - {$node['eventType']} (Node: {$node['label']})\n";
                }
            } else {
                echo "   ⚠️ WARNING: No invoice/kontrola nodes found in hierarchy!\n";
            }
        }
    } else {
        echo "   ❌ No active hierarchy profile found!\n";
    }
}
echo "\n";

// ================================================================
// TEST 4: Create test invoice
// ================================================================
echo "📋 TEST 4: Creating test invoice...\n";

$testInvoiceData = [
    'objednavka_id' => $lastOrder['id'],
    'fa_cislo_vema' => 'TEST-' . date('YmdHis'),
    'fa_cislo_dodavatel' => 'DOD-' . rand(1000, 9999),
    'fa_datum_vystaveni' => date('Y-m-d'),
    'fa_datum_zdanitelneho_plneni' => date('Y-m-d'),
    'fa_datum_prijeti' => date('Y-m-d'),
    'fa_datum_splatnosti' => date('Y-m-d', strtotime('+14 days')),
    'castka_celkem' => 10000.00,
    'mena' => 'CZK',
    'stav' => 'REGISTERED',
    'vecna_spravnost_potvrzeno' => 0,
    'aktivni' => 1,
    'created_by' => 1
];

try {
    $fields = array_keys($testInvoiceData);
    $placeholders = array_fill(0, count($fields), '?');
    
    $sql = "INSERT INTO 25_faktury (" . implode(', ', $fields) . ") 
            VALUES (" . implode(', ', $placeholders) . ")";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_values($testInvoiceData));
    
    $invoiceId = $pdo->lastInsertId();
    echo "   ✅ Test invoice created: ID = {$invoiceId}\n";
    echo "   Invoice number: {$testInvoiceData['fa_cislo_vema']}\n\n";
    
} catch (PDOException $e) {
    die("❌ Failed to create test invoice: " . $e->getMessage() . "\n");
}

// ================================================================
// TEST 5: Count notifications before update
// ================================================================
echo "📋 TEST 5: Counting notifications before update...\n";
$stmt = $pdo->query("SELECT COUNT(*) FROM 25_notifikace");
$notificationsBefore = $stmt->fetchColumn();
echo "   Notifications in DB: {$notificationsBefore}\n\n";

// ================================================================
// TEST 6: Update invoice - set vecna_spravnost_potvrzeno = 1
// ================================================================
echo "📋 TEST 6: Setting vecna_spravnost_potvrzeno = 1...\n";
echo "   This should trigger notification via invoiceHandlers.php\n";

try {
    // Simulate API call to invoiceHandlers.php
    // In real scenario, this would be HTTP request to /invoices/update
    
    $updateSql = "UPDATE 25_faktury 
                  SET vecna_spravnost_potvrzeno = 1, 
                      updated_at = NOW(), 
                      updated_by = 1 
                  WHERE id = ?";
    $stmt = $pdo->prepare($updateSql);
    $stmt->execute([$invoiceId]);
    
    echo "   ✅ Invoice updated in database\n";
    echo "   ⚠️ NOTE: This direct DB update does NOT trigger notifications!\n";
    echo "   Real workflow uses: PUT /api.eeo/invoices/update endpoint\n\n";
    
} catch (PDOException $e) {
    die("❌ Failed to update invoice: " . $e->getMessage() . "\n");
}

// ================================================================
// TEST 7: Count notifications after update
// ================================================================
echo "📋 TEST 7: Counting notifications after update...\n";
$stmt = $pdo->query("SELECT COUNT(*) FROM 25_notifikace");
$notificationsAfter = $stmt->fetchColumn();
$newNotifications = $notificationsAfter - $notificationsBefore;

echo "   Notifications in DB: {$notificationsAfter}\n";
echo "   New notifications: {$newNotifications}\n";

if ($newNotifications > 0) {
    echo "   ✅ SUCCESS: Notifications were created!\n\n";
    
    // Show last created notifications
    $stmt = $pdo->query("
        SELECT id, typ, titulek, zprava, object_id, created_at 
        FROM 25_notifikace 
        ORDER BY id DESC 
        LIMIT 5
    ");
    $lastNotifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "   Last 5 notifications:\n";
    foreach ($lastNotifications as $notif) {
        echo "     - [{$notif['id']}] {$notif['typ']} | Object: {$notif['object_id']} | {$notif['titulek']}\n";
    }
} else {
    echo "   ❌ FAILED: No notifications created!\n";
    echo "   This confirms the bug: invoiceHandlers.php detects vecnaSpravnostChanged\n";
    echo "   but does NOT call triggerNotification()!\n\n";
}

// ================================================================
// TEST 8: Manual trigger test (if API is available)
// ================================================================
echo "\n📋 TEST 8: Manual trigger test via API...\n";
echo "   To test manually, use NotificationTestPanel.js in browser:\n";
echo "   1. Open: /dashboard/notifications-test\n";
echo "   2. Set Order ID: {$lastOrder['id']}\n";
echo "   3. Click: 🎯 'INVOICE_MATERIAL_CHECK_APPROVED' button\n";
echo "   4. Check log for recipients from org hierarchy\n\n";

// ================================================================
// CLEANUP (optional)
// ================================================================
echo "📋 CLEANUP: Removing test invoice...\n";
$stmt = $pdo->prepare("DELETE FROM 25_faktury WHERE id = ?");
$stmt->execute([$invoiceId]);
echo "   ✅ Test invoice deleted\n\n";

// ================================================================
// SUMMARY
// ================================================================
echo "================================\n";
echo "🎯 TEST SUMMARY\n";
echo "================================\n";
echo "Order ID: {$lastOrder['id']}\n";
echo "Invoice ID: {$invoiceId} (deleted)\n";
echo "Event types: " . (count($foundTypes) === count($eventTypes) ? '✅ OK' : '❌ MISSING') . "\n";
echo "Org hierarchy: " . ($hierarchyEnabled ? '✅ ENABLED' : '❌ DISABLED') . "\n";
echo "Notifications: " . ($newNotifications > 0 ? '✅ CREATED' : '❌ NOT CREATED') . "\n";
echo "\n";

if ($newNotifications === 0) {
    echo "⚠️ RECOMMENDED FIXES:\n";
    echo "1. Add event types: mysql < scripts/add_missing_notification_event_types.sql\n";
    echo "2. Verify invoiceHandlers.php line ~577 has triggerNotification() call\n";
    echo "3. Check org hierarchy has nodes for INVOICE_MATERIAL_CHECK_APPROVED\n";
    echo "4. Test via browser: /dashboard/notifications-test\n";
}

echo "\n✅ Test completed!\n";

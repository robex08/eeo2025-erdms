<?php
/**
 * Debug ORDER_APPROVED notifikačního systému
 */

echo "🔍 ORDER_APPROVED NOTIFICATION DEBUG\n";
echo "======================================================================\n\n";

// Simuluj environment
$_SERVER['REQUEST_URI'] = '/dev/api.eeo/test';
define('IS_DEV_ENV', true);
define('VERSION', 'v2025.03_25');

// Načti konstanty
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/api.php';

try {
    $config = $_config['mysql'];
    $db = get_db($config);
    
    echo "✅ Database connected\n\n";
    
    // 1. Zkontroluj global settings
    echo "🔍 Checking global settings...\n";
    $stmt = $db->query("
        SELECT klic, hodnota 
        FROM 25a_nastaveni_globalni 
        WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id')
    ");
    
    $settings = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $settings[$row['klic']] = $row['hodnota'];
        echo "   {$row['klic']}: {$row['hodnota']}\n";
    }
    
    if (!isset($settings['hierarchy_enabled']) || $settings['hierarchy_enabled'] !== '1') {
        echo "❌ Hierarchy is DISABLED!\n";
        exit;
    }
    
    if (!isset($settings['hierarchy_profile_id'])) {
        echo "❌ No hierarchy profile selected!\n";
        exit;
    }
    
    $profileId = (int)$settings['hierarchy_profile_id'];
    echo "✅ Hierarchy enabled, profile ID: $profileId\n\n";
    
    // 2. Zkontroluj event types
    echo "🔍 Checking event types...\n";
    $stmt = $db->query("SELECT id, kod, nazev FROM 25_notifikace_typy_udalosti WHERE aktivni = 1 ORDER BY kod");
    $eventTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "   Available event types:\n";
    foreach ($eventTypes as $et) {
        $isTargeted = ($et['kod'] === 'ORDER_APPROVED') ? '👈 TARGET' : '';
        echo "     {$et['id']}: {$et['kod']} - {$et['nazev']} $isTargeted\n";
    }
    
    $orderApprovedExists = false;
    foreach ($eventTypes as $et) {
        if ($et['kod'] === 'ORDER_APPROVED') {
            $orderApprovedExists = $et['id'];
            break;
        }
    }
    
    if (!$orderApprovedExists) {
        echo "❌ EVENT TYPE 'ORDER_APPROVED' NOT FOUND in database!\n";
        echo "   This is the problem - the event type doesn't exist.\n";
        exit;
    }
    
    echo "✅ EVENT TYPE 'ORDER_APPROVED' exists with ID: $orderApprovedExists\n\n";
    
    // 3. Zkontroluj profil struktuře
    echo "🔍 Checking profile structure...\n";
    $stmt = $db->prepare("SELECT nazev, structure_json FROM 25_hierarchie_profily WHERE id = ? AND aktivni = 1");
    $stmt->execute([$profileId]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile) {
        echo "❌ Profile $profileId not found!\n";
        exit;
    }
    
    echo "   Profile: {$profile['nazev']}\n";
    
    $structure = json_decode($profile['structure_json'], true);
    if (!$structure) {
        echo "❌ Invalid JSON structure!\n";
        exit;
    }
    
    echo "   Nodes: " . count($structure['nodes'] ?? []) . "\n";
    echo "   Edges: " . count($structure['edges'] ?? []) . "\n\n";
    
    // 4. Hledej template nodes s ORDER_APPROVED
    echo "🔍 Looking for template nodes with ORDER_APPROVED...\n";
    $templateNodes = array_filter($structure['nodes'] ?? [], function($node) {
        return isset($node['type']) && $node['type'] === 'template';
    });
    
    echo "   Template nodes: " . count($templateNodes) . "\n";
    
    $orderApprovedTemplates = [];
    foreach ($templateNodes as $node) {
        if (isset($node['data']['notifications']['types'])) {
            $types = $node['data']['notifications']['types'];
            if (in_array('ORDER_APPROVED', $types) || in_array('order_status_schvalena', $types)) {
                $orderApprovedTemplates[] = $node;
                echo "     ✅ Node {$node['id']}: " . json_encode($types) . "\n";
            }
        }
    }
    
    if (empty($orderApprovedTemplates)) {
        echo "❌ NO TEMPLATE NODES with ORDER_APPROVED found!\n";
        echo "   This might be the problem - no notification rules for ORDER_APPROVED.\n";
    } else {
        echo "✅ Found " . count($orderApprovedTemplates) . " template nodes with ORDER_APPROVED\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n======================================================================\n";
echo "🎯 ORDER_APPROVED DEBUG COMPLETED\n";
?>
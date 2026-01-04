<?php
/**
 * Debug hierarchie struktury
 */

echo "🔍 HIERARCHY STRUCTURE DEBUG\n";
echo "======================================================================\n\n";

try {
    // Připojení k DB bez načítání celého API
    define('TBL_HIERARCHIE_PROFILY', '25_hierarchie_profily');
    
    $config = [
        'host' => '10.3.172.11',
        'username' => 'erdms_user', 
        'password' => 'AhchohTahnoh7eim',
        'database' => 'eeo2025-dev'
    ];
    
    $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4";
    $db = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    // Načti profil 12
    $stmt = $db->prepare("SELECT nazev, structure_json FROM " . TBL_HIERARCHIE_PROFILY . " WHERE id = 12");
    $stmt->execute();
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "📊 Profile: {$profile['nazev']}\n";
    
    $structure = json_decode($profile['structure_json'], true);
    
    echo "📊 Structure keys: " . implode(', ', array_keys($structure)) . "\n";
    echo "📊 Nodes count: " . count($structure['nodes']) . "\n";
    echo "📊 Edges count: " . count($structure['edges']) . "\n\n";
    
    // Analyzuj nodes
    echo "🔍 NODE ANALYSIS:\n";
    foreach ($structure['nodes'] as $node) {
        $type = $node['type'] ?? 'unknown';
        $label = $node['data']['label'] ?? 'no label';
        echo "   {$node['id']}: $type - $label\n";
        
        if ($type === 'template' && isset($node['data']['notifications']['types'])) {
            echo "     Notification types: " . implode(', ', $node['data']['notifications']['types']) . "\n";
        }
    }
    
    echo "\n🔍 TEMPLATE NODES WITH NOTIFICATIONS:\n";
    $templateCount = 0;
    $orderApprovedFound = false;
    
    foreach ($structure['nodes'] as $node) {
        if (isset($node['type']) && $node['type'] === 'template') {
            $templateCount++;
            $label = $node['data']['label'] ?? 'no label';
            $notifications = $node['data']['notifications']['types'] ?? [];
            
            echo "   Template {$node['id']}: $label\n";
            echo "     Notifications: " . (empty($notifications) ? 'NONE' : implode(', ', $notifications)) . "\n";
            
            // Hledej všechny varianty ORDER_APPROVED
            $variants = ['ORDER_APPROVED', 'order_status_schvalena', 'order_approved'];
            foreach ($variants as $variant) {
                if (in_array($variant, $notifications)) {
                    echo "     ✅ Found $variant!\n";
                    $orderApprovedFound = true;
                }
            }
            
            echo "\n";
        }
    }
    
    echo "📊 Total template nodes: $templateCount\n";
    echo "📊 ORDER_APPROVED found: " . ($orderApprovedFound ? 'YES' : 'NO') . "\n";
    
    if (!$orderApprovedFound) {
        echo "\n❌ ŽÁDNÝ TEMPLATE NODE nemá ORDER_APPROVED notifikaci!\n";
        echo "   Proto backend vrací 'Žádní příjemci nenalezeni'\n";
        echo "   Řešení: V hierarchii profilu přidat template s ORDER_APPROVED notifikací\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n======================================================================\n";
echo "🎯 HIERARCHY STRUCTURE DEBUG COMPLETED\n";
?>
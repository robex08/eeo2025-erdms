<?php
/**
 * Event Types Naming Refactor - Org Hierarchy JSON Migration
 */

$db_config = [
    'host' => '10.3.172.11',
    'user' => 'erdms_user',
    'pass' => 'AhchohTahnoh7eim',
    'db' => 'eeo2025-dev'
];

$mapping = [
    'order_status_nova' => 'ORDER_CREATED',
    'order_status_rozpracovana' => 'ORDER_DRAFT',
    'order_status_ke_schvaleni' => 'ORDER_PENDING_APPROVAL',
    'order_status_schvalena' => 'ORDER_APPROVED',
    'order_status_zamitnuta' => 'ORDER_REJECTED',
    'order_status_ceka_se' => 'ORDER_AWAITING_CHANGES',
    'order_status_odeslana' => 'ORDER_SENT_TO_SUPPLIER',
    'order_status_ceka_potvrzeni' => 'ORDER_AWAITING_CONFIRMATION',
    'order_status_potvrzena' => 'ORDER_CONFIRMED_BY_SUPPLIER',
    'order_status_registr_ceka' => 'ORDER_REGISTRY_PENDING',
    'order_status_registr_zverejnena' => 'ORDER_REGISTRY_PUBLISHED',
    'order_status_faktura_ceka' => 'ORDER_INVOICE_PENDING',
    'order_status_faktura_pridana' => 'ORDER_INVOICE_ADDED',
    'order_status_faktura_schvalena' => 'ORDER_INVOICE_APPROVED',
    'order_status_faktura_uhrazena' => 'ORDER_INVOICE_PAID',
    'order_status_kontrola_ceka' => 'ORDER_VERIFICATION_PENDING',
    'order_status_kontrola_potvrzena' => 'ORDER_VERIFICATION_APPROVED',
    'order_status_kontrola_zamitnuta' => 'ORDER_VERIFICATION_REJECTED',
    'order_status_dokoncena' => 'ORDER_COMPLETED'
];

try {
    $pdo = new PDO(
        "mysql:host={$db_config['host']};dbname={$db_config['db']};charset=utf8mb4",
        $db_config['user'],
        $db_config['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "📊 Načítám org hierarchy profily...\n";
    
    $stmt = $pdo->query("SELECT id, nazev, structure_json FROM 25_hierarchie_profily");
    $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "   Nalezeno " . count($profiles) . " profilů\n\n";
    
    $updated = 0;
    $skipped = 0;
    
    foreach ($profiles as $profile) {
        $structure = json_decode($profile['structure_json'], true);
        
        if (!$structure || !isset($structure['nodes'])) {
            echo "⚠️  Profil #{$profile['id']} nemá nodes\n";
            $skipped++;
            continue;
        }
        
        $changed = false;
        
        foreach ($structure['nodes'] as &$node) {
            if (isset($node['data']['eventTypes']) && is_array($node['data']['eventTypes'])) {
                foreach ($node['data']['eventTypes'] as &$eventType) {
                    if (isset($mapping[$eventType])) {
                        echo "  🔄 Profil #{$profile['id']} Node {$node['id']}: $eventType -> {$mapping[$eventType]}\n";
                        $eventType = $mapping[$eventType];
                        $changed = true;
                    }
                }
            }
        }
        
        if ($changed) {
            $new_json = json_encode($structure, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $update = $pdo->prepare("UPDATE 25_hierarchie_profily SET structure_json = ? WHERE id = ?");
            $update->execute([$new_json, $profile['id']]);
            echo "✅ Profil #{$profile['id']} '{$profile['nazev']}' aktualizován\n\n";
            $updated++;
        } else {
            $skipped++;
        }
    }
    
    echo "\n✅ HOTOVO: $updated aktualizováno, $skipped přeskočeno\n";
    
} catch (PDOException $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    exit(1);
}

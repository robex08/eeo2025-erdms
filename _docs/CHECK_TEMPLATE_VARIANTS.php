<?php
$pdo = new PDO(
    'mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4',
    'erdms_user',
    'AhchohTahnoh7eim',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$stmt = $pdo->query("SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12");
$profile = $stmt->fetch(PDO::FETCH_ASSOC);
$structure = json_decode($profile['structure_json'], true);

// Najít template node
foreach ($structure['nodes'] as $node) {
    if ($node['id'] === 'template-2-1766007051172') {
        echo "TEMPLATE: Objednávka odeslána ke schválení\n\n";
        echo "normalVariant: " . ($node['data']['normalVariant'] ?? 'NULL') . "\n";
        echo "urgentVariant: " . ($node['data']['urgentVariant'] ?? 'NULL') . "\n";
        echo "infoVariant: " . ($node['data']['infoVariant'] ?? 'NULL') . "\n";
        echo "previewVariant: " . ($node['data']['previewVariant'] ?? 'NULL') . "\n\n";
        
        // Najít edges s ORDER_PENDING_APPROVAL a jejich priority
        echo "EDGES s ORDER_PENDING_APPROVAL:\n\n";
        foreach ($structure['edges'] as $edge) {
            if ($edge['source'] === 'template-2-1766007051172' && 
                isset($edge['data']['eventTypes']) && 
                in_array('ORDER_PENDING_APPROVAL', $edge['data']['eventTypes'])) {
                
                $priority = $edge['data']['priority'] ?? 'WARNING';
                echo "Edge: {$edge['id']}\n";
                echo "  Priority: {$priority}\n";
                echo "  Target: {$edge['target']}\n\n";
            }
        }
        break;
    }
}

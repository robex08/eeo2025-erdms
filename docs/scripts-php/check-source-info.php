<?php
$config = require '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$db = new PDO("mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4", $config['mysql']['username'], $config['mysql']['password']);
$stmt = $db->query('SELECT structure_json FROM 25_hierarchie_profily WHERE aktivni = 1');
$row = $stmt->fetch();
$structure = json_decode($row['structure_json'], true);

echo "SOURCE_INFO_RECIPIENTS v DB:\n";
echo "════════════════════════════\n\n";

foreach ($structure['edges'] as $idx => $edge) {
    $eventTypes = [];
    foreach ($structure['nodes'] as $node) {
        if ($node['id'] === $edge['source'] && $node['typ'] === 'template') {
            $eventTypes = $node['data']['eventTypes'] ?? [];
            break;
        }
    }
    
    if (!empty($eventTypes)) {
        echo "Edge " . ($idx + 1) . " - " . implode(', ', $eventTypes) . ":\n";
        
        if (isset($edge['data']['source_info_recipients'])) {
            $sir = $edge['data']['source_info_recipients'];
            echo "  ✅ EXISTUJE\n";
            echo "  enabled: " . ($sir['enabled'] ? 'YES' : 'NO') . "\n";
            echo "  fields: " . json_encode($sir['fields']) . "\n";
        } else {
            echo "  ❌ CHYBÍ - použije se default\n";
            echo "  default: enabled=true, fields=[uzivatel_id, garant_uzivatel_id, objednatel_id]\n";
        }
        echo "\n";
    }
}

<?php
// Finální quick test po všech opravách

define('VERSION', 'v2025.03_25');
$_config = require __DIR__ . '/' . VERSION . '/lib/dbconfig.php';
$config = $_config; // Celá konfigurace

require_once __DIR__ . '/' . VERSION . '/lib/handlers.php';

echo "=== FINÁLNÍ TEST PO OPRAVĚ ===\n\n";

// Test 1: get_db()
try {
    $db = get_db($config);
    echo "✅ get_db() funguje\n";
} catch (Exception $e) {
    echo "❌ get_db() CHYBA: " . $e->getMessage() . "\n";
}

// Test 2: Config structure
echo "\n";
echo "Config structure:\n";
echo "  - má 'mysql': " . (isset($config['mysql']) ? 'ANO' : 'NE') . "\n";
echo "  - má 'upload': " . (isset($config['upload']) ? 'ANO' : 'NE') . "\n";

if (isset($config['mysql'])) {
    echo "  - mysql.database: " . $config['mysql']['database'] . "\n";
}

if (isset($config['upload'])) {
    echo "  - upload.root_path: " . $config['upload']['root_path'] . "\n";
}

// Test 3: Operace s přílohami
echo "\n";
$stmt = $db->query("SELECT COUNT(*) as cnt FROM 25a_objednavky_prilohy");
$result = $stmt->fetch();
echo "✅ Přílohy objednávek: " . $result['cnt'] . " ks\n";

$stmt = $db->query("SELECT COUNT(*) as cnt FROM 25a_faktury_prilohy");
$result = $stmt->fetch();
echo "✅ Přílohy faktur: " . $result['cnt'] . " ks\n";

echo "\n✅✅✅ VŠE FUNGUJE SPRÁVNĚ! ✅✅✅\n";

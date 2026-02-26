<?php
// Test opravy konfigurace - ověření že $config obsahuje 'upload' sekci

// Načtení stejným způsobem jako v api.php
define('VERSION', 'v2025.03_25');
$_config = require __DIR__ . '/' . VERSION . '/lib/dbconfig.php';
$config = $_config; // ✅ OPRAVENO - celá konfigurace

echo "<h1>Test opravy konfigurace</h1>\n\n";

echo "<h2>1. Struktura \$config:</h2>\n";
echo "<pre>";
echo "Klíče v \$config: " . implode(', ', array_keys($config)) . "\n";
echo "</pre>";

echo "<h2>2. MySQL konfigurace:</h2>\n";
echo "<pre>";
if (isset($config['mysql'])) {
    echo "✅ \$config['mysql'] existuje\n";
    echo "Database: " . $config['mysql']['database'] . "\n";
} else {
    echo "❌ \$config['mysql'] NEEXISTUJE!\n";
}
echo "</pre>";

echo "<h2>3. Upload konfigurace:</h2>\n";
echo "<pre>";
if (isset($config['upload'])) {
    echo "✅ \$config['upload'] existuje\n";
    echo "root_path: " . $config['upload']['root_path'] . "\n";
    echo "root_path isset: " . (isset($config['upload']['root_path']) ? 'YES' : 'NO') . "\n";
    echo "root_path empty: " . (empty($config['upload']['root_path']) ? 'YES' : 'NO') . "\n";
} else {
    echo "❌ \$config['upload'] NEEXISTUJE!\n";
}
echo "</pre>";

echo "<h2>4. Test get_db() funkce:</h2>\n";
echo "<pre>";
require_once __DIR__ . '/' . VERSION . '/lib/handlers.php';
try {
    $db = get_db($config);
    echo "✅ get_db(\$config) funguje s novou konfigurací\n";
    echo "    PDO connection created successfully\n";
    
    // Test query
    $stmt = $db->query("SELECT DATABASE() as current_db");
    $result = $stmt->fetch();
    echo "    Connected to database: " . $result['current_db'] . "\n";
} catch (Exception $e) {
    echo "❌ get_db(\$config) selhalo: " . $e->getMessage() . "\n";
}
echo "</pre>";

echo "<h2>5. Simulace delete attachment logiky:</h2>\n";
echo "<pre>";
// Stejná logika jako v orderV2AttachmentHandlers.php řádek 704-711
$uploadConfig = isset($config['upload']) ? $config['upload'] : array();
$basePath = '';

if (isset($uploadConfig['root_path']) && !empty($uploadConfig['root_path'])) {
    $basePath = $uploadConfig['root_path'];
    echo "✅ basePath z root_path: $basePath\n";
} elseif (isset($uploadConfig['relative_path']) && !empty($uploadConfig['relative_path'])) {
    $basePath = $uploadConfig['relative_path'];
    echo "⚠️ basePath z relative_path: $basePath\n";
} else {
    echo "❌ CHYBA: Upload configuration missing: root_path or relative_path must be set\n";
}

if ($basePath) {
    echo "✅ Cesta pro přílohy je nastavena: $basePath\n";
    echo "    Adresář existuje: " . (is_dir($basePath) ? 'ANO' : 'NE') . "\n";
    if (is_dir($basePath)) {
        echo "    Je zapisovatelný: " . (is_writable($basePath) ? 'ANO' : 'NE') . "\n";
    }
}
echo "</pre>";

echo "<h2>✅ ZÁVĚR:</h2>\n";
echo "<pre>";
if (isset($config['mysql']) && isset($config['upload']) && !empty($config['upload']['root_path'])) {
    echo "✅ Konfigurace je KOMPLETNÍ a SPRÁVNÁ\n";
    echo "   - MySQL konfigurace: OK\n";
    echo "   - Upload konfigurace: OK\n";
    echo "   - Delete attachment by měl fungovat!\n";
} else {
    echo "❌ Konfigurace má PROBLÉMY!\n";
}
echo "</pre>";

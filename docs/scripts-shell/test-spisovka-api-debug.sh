#!/bin/bash
# Test API endpointu s debug výstupem

echo "=== Test /api.eeo/spisovka-zpracovani/list ==="
echo ""

# Získat token (použij skutečný token z browseru)
TOKEN="your-token-here"
USERNAME="admin"

echo "Testing with:"
echo "  Username: $USERNAME"
echo "  Token: ${TOKEN:0:20}..."
echo ""

# Zavolat API
curl -X POST "https://erdms.zachranka.cz/api.eeo/spisovka-zpracovani/list" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"token\":\"$TOKEN\",\"limit\":10}" \
  -v 2>&1 | tee /tmp/api-test-output.txt

echo ""
echo "=== Kontrola debug logu v DB ==="
php << 'EOPHP'
<?php
$config = require '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/dbconfig.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
        $config['mysql']['username'],
        $config['mysql']['password']
    );
    
    $stmt = $pdo->query("SELECT * FROM debug_api_log ORDER BY id DESC LIMIT 3");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($rows as $row) {
        echo "\n--- Log ID: {$row['id']} ---\n";
        echo "Time: {$row['timestamp']}\n";
        echo "Endpoint: {$row['endpoint']}\n";
        echo "Method: {$row['method']}\n";
        if ($row['input_data']) echo "Input: " . substr($row['input_data'], 0, 100) . "...\n";
        if ($row['error_message']) echo "Error: {$row['error_message']}\n";
        if ($row['stack_trace']) echo "Stack:\n{$row['stack_trace']}\n";
    }
    
} catch (Exception $e) {
    echo "❌ DB Error: " . $e->getMessage() . "\n";
}
EOPHP

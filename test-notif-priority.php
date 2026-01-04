<?php
require_once('apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php');
require_once('apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php');

echo "═══════════════════════════════════════════════════════════════════\n";
echo "🧪 TEST: Notification Priority After Fix (1.95e)\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";

// Test 1: Běžná objednávka bez mimořádné události
echo "📋 Test 1: Běžná objednávka (mimoradna_udalost = false)\n";
echo "Expected: INFO priority\n\n";

$normalOrderData = [
    'id' => 999,
    'mimoradna_udalost' => false, // Klíčové pole - použije se pro priority
    'stav_workflow_kod' => 'approved',
    'predmet' => 'Test běžná objednávka'
];

$priority1 = resolveAutoPriority($normalOrderData);
echo "Result: " . $priority1 . "\n\n";

// Test 2: Mimořádná objednávka
echo "📋 Test 2: Mimořádná objednávka (mimoradna_udalost = true)\n";
echo "Expected: URGENT priority\n\n";

$urgentOrderData = [
    'id' => 998,
    'mimoradna_udalost' => true, // Klíčové pole - použije se pro priority
    'stav_workflow_kod' => 'approved',
    'predmet' => 'Test URGENT objednávka'
];

$priority2 = resolveAutoPriority($urgentOrderData);
echo "Result: " . $priority2 . "\n\n";

// Ověření
echo "═══════════════════════════════════════════════════════════════════\n";
echo "✅ VÝSLEDKY:\n";
echo "Běžná objednávka: " . ($priority1 === 'INFO' ? '✅ SPRÁVNĚ (INFO)' : '❌ CHYBA (' . $priority1 . ')') . "\n";
echo "Mimořádná objednávka: " . ($priority2 === 'URGENT' ? '✅ SPRÁVNĚ (URGENT)' : '❌ CHYBA (' . $priority2 . ')') . "\n";
echo "═══════════════════════════════════════════════════════════════════\n";
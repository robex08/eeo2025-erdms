<?php
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/old/config.php';
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php';

echo "======= Testování THP Notifikace Fix =======\n\n";

// Testovací data pro THP uživatele (uzivatel_id = 100)
$testOrderData = [
    'mimoradna_udalost' => 0,    // Fixed: používáme mimoradna_udalost místo is_urgent
    'objednatel_id' => 1,        // ID příkazce
    'uzivatel_id' => 100,        // ID THP uživatele (Veronika)
    'garant_uzivatel_id' => 107  // ID garanta
];

echo "Testovací data pro objednávku:\n";
echo "- mimoradna_udalost: " . $testOrderData['mimoradna_udalost'] . "\n";
echo "- objednatel_id: " . $testOrderData['objednatel_id'] . "\n";
echo "- uzivatel_id: " . $testOrderData['uzivatel_id'] . "\n";
echo "- garant_uzivatel_id: " . $testOrderData['garant_uzivatel_id'] . "\n\n";

// Test priority resolve
$hierarchyTriggers = new HierarchyTriggers();

echo "=== Test resolvePriorityForUser ===\n";

try {
    $template_id = 2; // Objednávka schválena
    
    echo "Testování priority pro template $template_id...\n";
    
    $priority = $hierarchyTriggers->resolvePriorityForUser($template_id, $testOrderData);
    
    echo "Výsledná priorita: " . $priority . "\n";
    
    if ($priority === 'INFO') {
        echo "✅ SUCCESS: THP uživatel dostane INFO prioritu (zelená notifikace)\n";
    } else {
        echo "❌ FAIL: THP uživatel dostane $priority místo INFO (oranžová notifikace)\n";
    }
    
} catch (Exception $e) {
    echo "Chyba při testování: " . $e->getMessage() . "\n";
}

echo "\n=== Test AUTO priority resolve ===\n";

try {
    $autoPriority = $hierarchyTriggers->resolveAutoPriority($testOrderData);
    echo "AUTO priorita: " . $autoPriority . "\n";
    
    if ($autoPriority === 'INFO') {
        echo "✅ SUCCESS: AUTO priorita je INFO pro normální objednávky\n";
    } else {
        echo "❌ FAIL: AUTO priorita je $autoPriority místo INFO\n";
    }
    
} catch (Exception $e) {
    echo "Chyba při AUTO priority: " . $e->getMessage() . "\n";
}

// Test jiných templates
echo "\n=== Test různých templates ===\n";

$templates = [3, 6, 9]; // Různé notifikační templates

foreach ($templates as $template_id) {
    try {
        $priority = $hierarchyTriggers->resolvePriorityForUser($template_id, $testOrderData);
        echo "Template $template_id -> Priority: $priority\n";
    } catch (Exception $e) {
        echo "Template $template_id -> Chyba: " . $e->getMessage() . "\n";
    }
}

echo "\n======= Konec testu =======\n";
?>
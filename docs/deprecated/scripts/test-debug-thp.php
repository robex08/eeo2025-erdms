<?php
echo "=== DEBUG THP NOTIFIKACE ===\n\n";

// Test data z nejnovější objednávky
$testOrderData = [
    'id' => 11547,
    'uzivatel_id' => 100,      // THP uživatel
    'objednatel_id' => 100,    // THP uživatel (opraveno!)
    'prikazce_id' => 1,
    'garant_uzivatel_id' => 107,
    'schvalovatel_id' => 1,
    'mimoradna_udalost' => 0   // Normální objednávka
];

echo "Testovací data z objednávky ID " . $testOrderData['id'] . ":\n";
foreach ($testOrderData as $key => $value) {
    echo "- $key: $value\n";
}
echo "\n";

echo "=== ANALÝZA PROBLÉMU ===\n\n";

echo "1. HIERARCHIE:\n";
echo "   THP role 9 hledá pole: objednatel_id, garant_uzivatel_id\n";
echo "   Objednávka má: objednatel_id=100 ✅\n";
echo "   THP uživatel má ID=100 ✅\n";
echo "   → Matching by měl fungovat!\n\n";

echo "2. PRIORITA:\n";
echo "   THP role má priority='INFO'\n";
echo "   Objednávka má mimoradna_udalost=0 (normální)\n";
echo "   → Měla by být INFO (zelená)!\n\n";

echo "3. MOŽNÉ PROBLÉMY:\n";
echo "   ❓ Používá se špatný template ID?\n";
echo "   ❓ Role mapping nefunguje správně?\n";
echo "   ❓ Backend posílá špatná data?\n";
echo "   ❓ Cache problémy?\n\n";

echo "=== DOPORUČENÍ ===\n";
echo "1. Zkontrolovat, jaký template_id se používá pro notifikaci\n";
echo "2. Otestovat resolvePriorityForUser() s těmito daty\n";
echo "3. Zkontrolovat logy v hierarchyTriggers.php\n";
echo "4. Možná je problém ve frontendu - posílá špatná data?\n\n";

echo "Pro debug spusť:\n";
echo "triggerNotification({\n";
echo "  orderId: 11547,\n";
echo "  templateId: 2,  // Nebo jaký se používá\n";
echo "  mimoradna_udalost: 0,\n";
echo "  objednatel_id: 100,\n";
echo "  garant_uzivatel_id: 107\n";
echo "});\n\n";

echo "=== KONEC DEBUG ===\n";
?>
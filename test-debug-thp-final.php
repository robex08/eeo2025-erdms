<?php
echo "=== DEBUG THP NOTIFIKACE ===\n\n";

// Testovací data na základě skutečné objednávky 11548
$testData = [
    'templateId' => 2,  // Template "Objednávka odeslána ke schválení"
    'orderId' => 11548,
    'mimoradna_udalost' => 0,  // Normální objednávka
    'objednatel_id' => 100,    // THP uživatel
    'uzivatel_id' => 100,      // THP uživatel 
    'garant_uzivatel_id' => 102,
    'eventType' => 'order_status_ke_schvaleni'
];

echo "Test data:\n";
foreach ($testData as $key => $value) {
    echo "  $key: $value\n";
}
echo "\n";

echo "Hierarchie očekávání:\n";
echo "  - Template 2 → Role 9 (THP/PES) → Priority: INFO\n";
echo "  - Uživatel 100 má role_id = 9 (THP/PES)\n";
echo "  - objednatel_id = 100 by se měl matchovat s fields=[\"objednatel_id\",\"garant_uzivatel_id\"]\n\n";

echo "Backend by měl:\n";
echo "  1. Najít template-2 v hierarchii\n";
echo "  2. Najít edge template-2 → role-9\n";
echo "  3. Použít priority=\"INFO\" z edge\n";
echo "  4. Výsledek: Zelená INFO notifikace ✅\n\n";

echo "Problém může být v:\n";
echo "  A) Frontend neposílá templateId: 2\n";
echo "  B) Backend nehledá správně v hierarchii\n";
echo "  C) Event matching se nestává správně\n";
echo "  D) Priority z edge se neaplikuje správně\n\n";

echo "=== DOPORUČENÍ ===\n";
echo "1. Zkontroluj log hierarchyTriggers.php při odeslání ke schválení\n";
echo "2. Ověř, jaký templateId skutečně posílá frontend\n";
echo "3. Debuguj, jestli se najde edge template-2 → role-9\n";
echo "4. Zkontroluj, jestli se použije priority=\"INFO\" z edge\n\n";
?>
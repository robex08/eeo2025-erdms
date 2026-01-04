<?php
/**
 * Test ORDER_APPROVED s real hierarchyTriggers funkcí
 */

echo "🔍 ORDER_APPROVED REAL TEST\n";
echo "======================================================================\n\n";

// Skutečná data z objednávky 11539
$eventData = [
    'objednavka_id' => 11539,
    'prikazce_id' => 1,         // admin
    'garant_uzivatel_id' => 107, // jurova (má THP_PES roli!)
    'objednatel_id' => 1,       // admin
    'uzivatel_id' => 1,         // admin (vytvořil)
    'schvalovatel_id' => 1,     // admin
    'cislo_objednavky' => 'O-0027/75030926/2026/IT'
];

echo "📊 Test event data:\n";
foreach ($eventData as $key => $value) {
    echo "   $key: $value\n";
}
echo "\n";

try {
    // Připoj se k DB
    define('TBL_NASTAVENI_GLOBALNI', '25a_nastaveni_globalni');
    define('TBL_HIERARCHIE_PROFILY', '25_hierarchie_profily'); 
    define('TBL_NOTIFIKACE_TYPY_UDALOSTI', '25_notifikace_typy_udalosti');
    define('TBL_UZIVATELE', '25_uzivatele');
    define('TBL_UZIVATELE_ROLE', '25_uzivatele_role');
    define('TBL_ROLE', '25_role');
    
    $config = [
        'host' => '10.3.172.11',
        'username' => 'erdms_user', 
        'password' => 'AhchohTahnoh7eim',
        'database' => 'eeo2025-dev'
    ];
    
    $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4";
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "✅ Database connected\n\n";
    
    // Načti hierarchyTriggers funkci
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php';
    
    echo "🎯 Calling resolveHierarchyNotificationRecipients...\n";
    
    $result = resolveHierarchyNotificationRecipients('ORDER_APPROVED', $eventData, $pdo);
    
    echo "📤 Result:\n";
    if ($result === false) {
        echo "   ❌ FALSE (hierarchie není aktivní nebo není nakonfigurovaná)\n";
    } else {
        echo "   ✅ SUCCESS\n";
        echo "   Recipients count: " . count($result['recipients'] ?? []) . "\n";
        echo "   Variant ID: " . ($result['variant_id'] ?? 'NULL') . "\n";
        echo "   Priority: " . ($result['priority'] ?? 'NULL') . "\n\n";
        
        if (!empty($result['recipients'])) {
            echo "   Recipients detail:\n";
            foreach ($result['recipients'] as $i => $recipient) {
                echo "     " . ($i + 1) . ". User ID: {$recipient['user_id']}, Priority: {$recipient['priority']}\n";
                echo "        Email: " . ($recipient['delivery']['email'] ? 'YES' : 'NO') . "\n";
                echo "        InApp: " . ($recipient['delivery']['inApp'] ? 'YES' : 'NO') . "\n";
            }
        } else {
            echo "   ❌ No recipients found!\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "   Trace: " . $e->getTraceAsString() . "\n";
}

echo "\n======================================================================\n";
echo "🎯 ORDER_APPROVED REAL TEST COMPLETED\n";
?>
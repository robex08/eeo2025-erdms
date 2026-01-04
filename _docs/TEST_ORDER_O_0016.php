<?php
/**
 * TEST: Kdo dostane notifikaci ORDER_PENDING_APPROVAL pro objednávku O-0016 (#11528)
 */

require_once(__DIR__ . '/../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php');

// Table constants
define('TBL_HIERARCHIE_PROFILY', '25_hierarchie_profily');
define('TBL_UZIVATELE', '25_uzivatele');
define('TBL_UZIVATELE_ROLE', '25_uzivatele_role');
define('TBL_ROLE', '25_role');
define('TBL_NASTAVENI_GLOBALNI', '25a_nastaveni_globalni');
define('TBL_NOTIFIKACE_TYPY_UDALOSTI', '25_notifikace_typy_udalosti');

// DB Connection
$pdo = new PDO(
    'mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4',
    'erdms_user',
    'AhchohTahnoh7eim',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// REÁLNÁ DATA z objednávky O-0016 (#11528)
$eventData = [
    'order_id' => 11528,
    'uzivatel_id' => 1,           // Uživatel
    'objednatel_id' => 1,         // Objednatel
    'garant_uzivatel_id' => 100,  // Garant
    'prikazce_id' => 1,           // Příkazce
    'mimoradna_udalost' => 1,     // ⚡ MIMOŘÁDNÁ UDÁLOST!
];

echo "\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "TEST: ORDER_PENDING_APPROVAL workflow\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "Objednávka: O-0016/75030926/2026/IT (ID: 11528)\n";
echo "Uživatel: {$eventData['uzivatel_id']}\n";
echo "Objednatel: {$eventData['objednatel_id']}\n";
echo "Garant: {$eventData['garant_uzivatel_id']}\n";
echo "Příkazce: {$eventData['prikazce_id']}\n";
echo "═══════════════════════════════════════════════════════════════\n";

try {
    $result = resolveHierarchyNotificationRecipients(
        'ORDER_PENDING_APPROVAL',
        $eventData,
        $pdo
    );
    
    if ($result === false) {
        echo "❌ Hierarchie není aktivní nebo není nakonfigurovaná\n";
        exit(1);
    }
    
    echo "✅ PŘÍJEMCI: " . count($result['recipients']) . "\n";
    echo "   Priorita: {$result['priority']}\n";
    echo "   Varianta šablony: {$result['variant_id']}\n";
    echo "   Profil: {$result['profile_name']} (ID: {$result['profile_id']})\n";
    echo "\n";
    
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "SEZNAM PŘÍJEMCŮ:\n";
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "\n";
    
    foreach ($result['recipients'] as $i => $recipient) {
        $num = $i + 1;
        echo "{$num}. {$recipient['email']}\n";
        echo "   User ID: {$recipient['user_id']}\n";
        echo "   Priorita: " . ($recipient['priority'] ?? 'N/A') . "\n";
        
        $delivery = $recipient['delivery'] ?? [];
        echo "   📧 EMAIL: " . (($delivery['email'] ?? false) ? "✅ ANO" : "❌ NE") . "\n";
        echo "   📱 IN-APP: " . (($delivery['inApp'] ?? false) ? "✅ ANO" : "❌ NE") . "\n";
        echo "   📲 SMS: " . (($delivery['sms'] ?? false) ? "✅ ANO" : "❌ NE") . "\n";
        echo "\n";
    }
    
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "HOTOVO\n";
    echo "═══════════════════════════════════════════════════════════════\n";
    
} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}

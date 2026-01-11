<?php
/**
 * TEST: Kdo dostane notifikaci ORDER_PENDING_APPROVAL pro objednávku #11533
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

// REÁLNÁ DATA z objednávky #11533
$eventData = [
    'order_id' => 11533,
    'uzivatel_id' => 107,
    'objednatel_id' => 107,
    'garant_uzivatel_id' => 100,
    'prikazce_id' => 1,
    'schvalovatel_id' => 1
];

echo "\n╔══════════════════════════════════════════════════════════════╗\n";
echo "║  NOTIFIKACE ORDER_PENDING_APPROVAL - Objednávka #11533      ║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";

echo "📦 OBJEDNÁVKA:\n";
echo "   ID: {$eventData['order_id']}\n";
echo "   Vytvořil: User #{$eventData['uzivatel_id']}\n";
echo "   Objednatel: User #{$eventData['objednatel_id']}\n";
echo "   Garant: User #{$eventData['garant_uzivatel_id']}\n";
echo "   Příkazce: User #{$eventData['prikazce_id']}\n";
echo "   Schvalovatel: User #{$eventData['schvalovatel_id']}\n\n";

// Resolve recipients
$result = resolveHierarchyNotificationRecipients('ORDER_PENDING_APPROVAL', $eventData, $pdo);

if ($result === false) {
    echo "❌ Hierarchie není aktivní nebo není nakonfigurovaná\n";
    exit(1);
}

echo "✅ PŘÍJEMCI: " . count($result['recipients']) . "\n";
echo "   Priorita: {$result['priority']}\n";
echo "   Varianta šablony: {$result['variant_id']}\n";
echo "   Profil: {$result['profile_name']} (ID: {$result['profile_id']})\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "SEZNAM PŘÍJEMCŮ:\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

foreach ($result['recipients'] as $i => $recipient) {
    $num = $i + 1;
    echo "{$num}. {$recipient['email']}\n";
    echo "   User ID: {$recipient['user_id']}\n";
    echo "   Priorita: " . ($recipient['priority'] ?? 'N/A') . "\n";
    
    $delivery = $recipient['delivery'] ?? [];
    echo "   📧 EMAIL: " . (($delivery['email'] ?? false) ? '✅ ANO' : '❌ NE') . "\n";
    echo "   📱 IN-APP: " . (($delivery['inApp'] ?? false) ? '✅ ANO' : '❌ NE') . "\n";
    echo "   📲 SMS: " . (($delivery['sms'] ?? false) ? '✅ ANO' : '❌ NE') . "\n\n";
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "HOTOVO\n";
echo "═══════════════════════════════════════════════════════════════\n";

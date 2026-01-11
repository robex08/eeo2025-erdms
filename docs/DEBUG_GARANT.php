<?php
require_once(__DIR__ . '/../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php');

define('TBL_HIERARCHIE_PROFILY', '25_hierarchie_profily');
define('TBL_UZIVATELE', '25_uzivatele');
define('TBL_UZIVATELE_ROLE', '25_uzivatele_role');
define('TBL_ROLE', '25_role');
define('TBL_NASTAVENI_GLOBALNI', '25a_nastaveni_globalni');
define('TBL_NOTIFIKACE_TYPY_UDALOSTI', '25_notifikace_typy_udalosti');

$pdo = new PDO(
    'mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4',
    'erdms_user',
    'AhchohTahnoh7eim',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$eventData = [
    'order_id' => 11533,
    'uzivatel_id' => 107,
    'objednatel_id' => 107,
    'garant_uzivatel_id' => 100,
    'prikazce_id' => 1,
    'schvalovatel_id' => 1
];

$result = resolveHierarchyNotificationRecipients('ORDER_PENDING_APPROVAL', $eventData, $pdo);

echo "\n═══ DEBUG: PŘED DEDUPLIKACÍ ═══\n\n";
echo "Garant field: " . ($eventData['garant_uzivatel_id'] ?? 'CHYBÍ') . "\n\n";

if ($result) {
    echo "Příjemci po deduplikaci:\n";
    foreach ($result['recipients'] as $r) {
        echo "  User {$r['user_id']}: Priority={$r['priority']}, Email={$r['delivery']['email']}, InApp={$r['delivery']['inApp']}\n";
    }
}

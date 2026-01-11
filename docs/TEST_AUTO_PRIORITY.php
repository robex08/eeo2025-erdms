<?php
/**
 * TEST: AUTO priority podle mimoradna_udalost
 * 
 * Test 1: Objednávka #11533 BEZ mimořádné události → priority AUTO = WARNING
 * Test 2: Objednávka #11533 S mimořádnou událostí → priority AUTO = URGENT
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

echo "\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "TEST: AUTO PRIORITY podle mimoradna_udalost\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// TEST 1: BEZ mimořádné události
echo "TEST 1: Objednávka #11533 BEZ mimořádné události\n";
echo "─────────────────────────────────────────────────────────────\n";

$eventData1 = [
    'order_id' => 11533,
    'uzivatel_id' => 107,
    'objednatel_id' => 107,
    'garant_uzivatel_id' => 100,
    'prikazce_id' => 1,
    'mimoradna_udalost' => 0,  // ❌ NENÍ mimořádná
];

$result1 = resolveHierarchyNotificationRecipients('ORDER_PENDING_APPROVAL', $eventData1, $pdo);

if ($result1 && isset($result1['recipients'])) {
    echo "✅ Příjemci: " . count($result1['recipients']) . "\n\n";
    foreach ($result1['recipients'] as $r) {
        echo "  • User {$r['user_id']}: {$r['email']} → Priorita: {$r['priority']}\n";
    }
} else {
    echo "❌ Žádní příjemci!\n";
}

echo "\n";

// TEST 2: S mimořádnou událostí
echo "TEST 2: Objednávka #11533 S mimořádnou událostí\n";
echo "─────────────────────────────────────────────────────────────\n";

$eventData2 = [
    'order_id' => 11533,
    'uzivatel_id' => 107,
    'objednatel_id' => 107,
    'garant_uzivatel_id' => 100,
    'prikazce_id' => 1,
    'mimoradna_udalost' => 1,  // ✅ MIMOŘÁDNÁ!
];

$result2 = resolveHierarchyNotificationRecipients('ORDER_PENDING_APPROVAL', $eventData2, $pdo);

if ($result2 && isset($result2['recipients'])) {
    echo "✅ Příjemci: " . count($result2['recipients']) . "\n\n";
    foreach ($result2['recipients'] as $r) {
        echo "  • User {$r['user_id']}: {$r['email']} → Priorita: {$r['priority']}\n";
    }
} else {
    echo "❌ Žádní příjemci!\n";
}

echo "\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "OČEKÁVANÝ VÝSLEDEK:\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "Test 1 - Příkazce má prioritu AUTO v DB, ale mimoradna=0:\n";
echo "  → Příkazce (User 1): WARNING\n";
echo "  → Objednatel (User 107): INFO (statická)\n";
echo "  → Garant (User 100): INFO (statická)\n";
echo "\n";
echo "Test 2 - Příkazce má prioritu AUTO v DB, ale mimoradna=1:\n";
echo "  → Příkazce (User 1): URGENT ⚡\n";
echo "  → Objednatel (User 107): INFO (statická)\n";
echo "  → Garant (User 100): INFO (statická)\n";
echo "═══════════════════════════════════════════════════════════════\n";

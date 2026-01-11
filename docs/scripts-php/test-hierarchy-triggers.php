<?php
/**
 * TEST SCRIPT - Hierarchy Notification Triggers
 * 
 * Testuje nový workflow systém pro notifikace
 */

// Nastavení error reportingu
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== HIERARCHY NOTIFICATION TRIGGERS TEST ===\n\n";

// Načíst API
require_once __DIR__ . '/../../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

// DB připojení
try {
    $config = require __DIR__ . '/../../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
    $mysqlConfig = $config['mysql'];
    
    $dsn = "mysql:host={$mysqlConfig['host']};dbname={$mysqlConfig['database']};charset=utf8mb4";
    $pdo = new PDO($dsn, $mysqlConfig['username'], $mysqlConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "✅ DB připojení OK\n\n";
    
} catch (Exception $e) {
    die("❌ CHYBA připojení k DB: " . $e->getMessage() . "\n");
}

// Definovat konstanty tabulek (zkopírováno z api.php)
define('TBL_UZIVATELE', '25_uzivatele');
define('TBL_UZIVATELE_ROLE', '25_uzivatele_role');
define('TBL_HIERARCHIE_PROFILY', '25_hierarchie_profily');
define('TBL_NASTAVENI_GLOBALNI', '25a_nastaveni_globalni');
define('TBL_NOTIFIKACE_TYPY_UDALOSTI', '25_notifikace_typy_udalosti');

// Načíst hierarchyTriggers.php
require_once __DIR__ . '/../../apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyTriggers.php';

echo "✅ hierarchyTriggers.php načten\n\n";

// TEST 1: Kontrola Global Settings
echo "--- TEST 1: Global Settings ---\n";
$stmt = $pdo->query("
    SELECT klic, hodnota 
    FROM " . TBL_NASTAVENI_GLOBALNI . " 
    WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id')
");

$settings = [];
while ($row = $stmt->fetch()) {
    $settings[$row['klic']] = $row['hodnota'];
    echo "  {$row['klic']} = {$row['hodnota']}\n";
}

if (!isset($settings['hierarchy_enabled']) || $settings['hierarchy_enabled'] !== '1') {
    echo "\n⚠️  POZOR: Hierarchie není zapnutá! (hierarchy_enabled != 1)\n";
    echo "  Pro test nastavte: UPDATE 25a_nastaveni_globalni SET hodnota='1' WHERE klic='hierarchy_enabled';\n\n";
}

if (!isset($settings['hierarchy_profile_id']) || empty($settings['hierarchy_profile_id'])) {
    echo "\n⚠️  POZOR: Není vybraný profil! (hierarchy_profile_id je NULL)\n";
    echo "  Pro test nastavte: UPDATE 25a_nastaveni_globalni SET hodnota='1' WHERE klic='hierarchy_profile_id';\n\n";
}

// TEST 2: Načtení profilu
if (isset($settings['hierarchy_profile_id']) && !empty($settings['hierarchy_profile_id'])) {
    echo "\n--- TEST 2: Načtení profilu ---\n";
    $profileId = (int)$settings['hierarchy_profile_id'];
    
    $stmt = $pdo->prepare("
        SELECT id, nazev, aktivni, 
               JSON_LENGTH(structure_json, '$.nodes') as nodes_count,
               JSON_LENGTH(structure_json, '$.edges') as edges_count
        FROM " . TBL_HIERARCHIE_PROFILY . "
        WHERE id = ?
    ");
    $stmt->execute([$profileId]);
    $profile = $stmt->fetch();
    
    if ($profile) {
        echo "  Profil: {$profile['nazev']} (ID: {$profile['id']})\n";
        echo "  Aktivní: " . ($profile['aktivni'] ? 'ANO' : 'NE') . "\n";
        echo "  Nodes: {$profile['nodes_count']}\n";
        echo "  Edges: {$profile['edges_count']}\n";
    } else {
        echo "  ❌ Profil ID $profileId nenalezen!\n";
    }
}

// TEST 3: Event Types
echo "\n--- TEST 3: Event Types v DB ---\n";
$stmt = $pdo->query("SELECT id, kod, nazev FROM " . TBL_NOTIFIKACE_TYPY_UDALOSTI . " LIMIT 5");
$eventTypes = $stmt->fetchAll();
echo "  Nalezeno " . count($eventTypes) . " event types (první 5):\n";
foreach ($eventTypes as $et) {
    echo "    - {$et['kod']} / {$et['nazev']} (ID: {$et['id']})\n";
}

// TEST 4: Simulace resolve s testovacími daty
echo "\n--- TEST 4: Simulace resolveHierarchyNotificationRecipients ---\n";

$testEventType = 'ORDER_APPROVED';
$testEventData = [
    'id' => 999,
    'prikazce_id' => 1,
    'garant_uzivatel_id' => 2,
    'mimoradna_udalost' => 1 // Mělo by trigger URGENT priority
];

echo "  Event Type: $testEventType\n";
echo "  Event Data: " . json_encode($testEventData) . "\n\n";

try {
    $result = resolveHierarchyNotificationRecipients($testEventType, $testEventData, $pdo);
    
    if ($result === false) {
        echo "  ⚠️  Funkce vrátila FALSE\n";
        echo "  Důvody:\n";
        echo "    - Hierarchie není zapnutá\n";
        echo "    - Není vybraný profil\n";
        echo "    - Profil neexistuje nebo není aktivní\n";
        echo "    - Žádné template nodes nemají event type '$testEventType'\n";
        echo "    - Event type '$testEventType' neexistuje v DB\n";
    } else {
        echo "  ✅ ÚSPĚCH! Resolve proběhl.\n\n";
        echo "  Výsledek:\n";
        echo "  - Počet příjemců: " . count($result['recipients']) . "\n";
        echo "  - Priority: {$result['priority']}\n";
        echo "  - Variant ID: {$result['variant_id']}\n";
        echo "  - Profil: {$result['profile_name']} (ID: {$result['profile_id']})\n\n";
        
        if (!empty($result['recipients'])) {
            echo "  Příjemci:\n";
            foreach ($result['recipients'] as $i => $recipient) {
                echo "    " . ($i + 1) . ". User ID: {$recipient['user_id']}, Email: {$recipient['email']}, Username: {$recipient['username']}\n";
                echo "       Delivery: " . json_encode($recipient['delivery']) . "\n";
            }
        }
    }
    
} catch (Exception $e) {
    echo "  ❌ CHYBA: " . $e->getMessage() . "\n";
    echo "  Stack trace:\n" . $e->getTraceAsString() . "\n";
}

// TEST 5: Helper funkce
echo "\n--- TEST 5: Helper funkce ---\n";

$hierarchyEnabled = isHierarchyEnabled($pdo);
echo "  isHierarchyEnabled(): " . ($hierarchyEnabled ? 'TRUE' : 'FALSE') . "\n";

$activeProfileId = getActiveHierarchyProfileId($pdo);
echo "  getActiveHierarchyProfileId(): " . ($activeProfileId ?? 'NULL') . "\n";

$urgentTest = resolveAutoPriority(['mimoradna_udalost' => 1]);
echo "  resolveAutoPriority([mimoradna_udalost=1]): $urgentTest\n";

$warningTest = resolveAutoPriority(['mimoradna_udalost' => 0]);
echo "  resolveAutoPriority([mimoradna_udalost=0]): $warningTest\n";

echo "\n=== TEST DOKONČEN ===\n";

<?php
/**
 * TEST: Multi-field DYNAMIC_FROM_ENTITY
 * 
 * Simuluje node kde je nastaveno:
 * scopeDefinition: {
 *   type: "DYNAMIC_FROM_ENTITY",
 *   fields: ["prikazce_id", "objednatel_id", "garant_uzivatel_id"]
 * }
 */

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

echo "\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "TEST: MULTI-FIELD DYNAMIC_FROM_ENTITY\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// Načíst profil z DB a upravit edge na multi-field
$stmt = $pdo->query("SELECT id, structure_json FROM 25_hierarchie_profily WHERE id = 12");
$profile = $stmt->fetch(PDO::FETCH_ASSOC);
$structure = json_decode($profile['structure_json'], true);

// Najít edge pro Příkazce a změnit na multi-field
$edgeFound = false;
foreach ($structure['edges'] as &$edge) {
    if ($edge['target'] === 'role-5-1766006577394' && 
        isset($edge['data']['eventTypes']) && 
        in_array('ORDER_PENDING_APPROVAL', $edge['data']['eventTypes'])) {
        
        // Najít target node
        foreach ($structure['nodes'] as &$node) {
            if ($node['id'] === 'role-5-1766006577394') {
                // ZMĚNIT scopeDefinition na MULTI-FIELD
                $node['data']['scopeDefinition'] = [
                    'type' => 'DYNAMIC_FROM_ENTITY',
                    'fields' => ['prikazce_id', 'objednatel_id', 'garant_uzivatel_id']
                ];
                echo "✅ Změněno scopeDefinition na MULTI-FIELD:\n";
                echo "   fields: prikazce_id, objednatel_id, garant_uzivatel_id\n\n";
                $edgeFound = true;
                break 2;
            }
        }
    }
}

if (!$edgeFound) {
    echo "❌ Edge nenalezen!\n";
    exit(1);
}

// Dočasně uložit změněný profil
$stmt = $pdo->prepare("UPDATE 25_hierarchie_profily SET structure_json = ? WHERE id = 12");
$stmt->execute([json_encode($structure)]);

echo "TEST 1: Objednávka #11533\n";
echo "─────────────────────────────────────────────────────────────\n";
echo "Data:\n";
echo "  - prikazce_id: 1\n";
echo "  - objednatel_id: 107\n";
echo "  - garant_uzivatel_id: 100\n\n";

$eventData = [
    'order_id' => 11533,
    'uzivatel_id' => 107,
    'objednatel_id' => 107,
    'garant_uzivatel_id' => 100,
    'prikazce_id' => 1,
    'mimoradna_udalost' => 0,
];

$result = resolveHierarchyNotificationRecipients('ORDER_PENDING_APPROVAL', $eventData, $pdo);

if ($result && isset($result['recipients'])) {
    echo "✅ Příjemci z JEDNOHO node: " . count($result['recipients']) . "\n\n";
    foreach ($result['recipients'] as $r) {
        echo "  • User {$r['user_id']}: {$r['email']} (Priorita: {$r['priority']})\n";
    }
} else {
    echo "❌ Žádní příjemci!\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "OČEKÁVANÝ VÝSLEDEK:\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "Měli bychom dostat 3 uživatele z JEDNOHO node (role-5):\n";
echo "  - User 1 (prikazce_id) - má roli 5 ✓\n";
echo "  - User 107 (objednatel_id) - NEMÁ roli 5 ✗ (přeskočeno)\n";
echo "  - User 100 (garant_uzivatel_id) - NEMÁ roli 5 ✗ (přeskočeno)\n\n";
echo "Výsledek: Pouze User 1, protože ostatní nemají roli 5\n";
echo "═══════════════════════════════════════════════════════════════\n";

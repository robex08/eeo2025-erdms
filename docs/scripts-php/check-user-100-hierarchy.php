<?php
/**
 * Zkontrolovat, zda hierarchie přidává ORDER_APPROVE uživateli 100
 */

require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyOrderFilters.php';

$db = new PDO(
    'mysql:host=10.3.172.11;dbname=eeo2025;charset=utf8mb4',
    'erdms_user',
    'AhchohTahnoh7eim',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "═══════════════════════════════════════════════════════════\n";
echo "KONTROLA HIERARCHIE PRO UŽIVATELE 100\n";
echo "═══════════════════════════════════════════════════════════\n\n";

// 1. Nastavení hierarchie
$settings = getHierarchySettings($db);
echo "📋 NASTAVENÍ HIERARCHIE:\n";
echo "   Enabled: " . ($settings['enabled'] ? 'ANO' : 'NE') . "\n";
echo "   Profile ID: " . ($settings['profile_id'] ?? 'NULL') . "\n";
echo "   Logic: {$settings['logic']}\n\n";

if (!$settings['enabled'] || !$settings['profile_id']) {
    echo "❌ Hierarchie je VYPNUTÁ - nemůže přidávat práva\n";
    exit(0);
}

// 2. Je uživatel 100 IMMUNE?
$isImmune = isUserHierarchyImmune(100, $db);
echo "🛡️ HIERARCHY_IMMUNE:\n";
echo "   " . ($isImmune ? "✅ ANO - hierarchie se na něj NEVZTAHUJE" : "❌ NE - hierarchie se vztahuje") . "\n\n";

// 3. Vztahy uživatele
echo "🔗 VZTAHY UŽIVATELE 100 V HIERARCHII:\n";
$relationships = getUserRelationshipsFromStructure(100, $db);

if (empty($relationships)) {
    echo "   ❌ Žádné vztahy\n";
} else {
    echo "   Celkem: " . count($relationships) . " vztahů\n";
    foreach ($relationships as $idx => $rel) {
        echo "   " . ($idx+1) . ". Typ: {$rel['typ_vztahu']}";
        if ($rel['lokalita_id']) echo ", Lokalita: {$rel['lokalita_id']}";
        if ($rel['usek_id']) echo ", Úsek: {$rel['usek_id']}";
        if ($rel['role_id']) echo ", Role: {$rel['role_id']}";
        if ($rel['user_id_2']) echo ", User: {$rel['user_id_2']}";
        echo "\n";
    }
}

echo "\n═══════════════════════════════════════════════════════════\n";
echo "VERDIKT:\n";
echo "Hierarchie " . ($settings['enabled'] ? "MŮŽE" : "NEMŮŽE") . " ovlivnit práva uživatele 100\n";
if ($isImmune) {
    echo "ALE uživatel je IMMUNE → hierarchie se nevztahuje\n";
}
echo "═══════════════════════════════════════════════════════════\n";

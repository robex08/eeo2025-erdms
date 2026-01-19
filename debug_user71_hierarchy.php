<?php
/**
 * DEBUG: Zjistit, proč uživatelka 71 nevidí všechny objednávky
 * Má právo ORDER_READ_ALL, ale vidí jen 30 z 162
 */

require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/hierarchyOrderFilters.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/db.php';

$db = getDBConnection();

$userId = 71;

echo "═══════════════════════════════════════════════════════════════\n";
echo "DEBUG: Hierarchie pro uživatelku ID 71\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// 1. Zjistit, zda je uživatelka IMMUNE
echo "1. HIERARCHY IMMUNE CHECK:\n";
$stmt = $db->prepare("
    SELECT 
        un.uzivatel_id,
        un.klic_nastaveni,
        un.hodnota
    FROM 25_uzivatel_nastaveni un
    WHERE un.uzivatel_id = :user_id 
    AND un.klic_nastaveni = 'HIERARCHY_IMMUNE'
");
$stmt->execute(['user_id' => $userId]);
$immune = $stmt->fetch(PDO::FETCH_ASSOC);

if ($immune && $immune['hodnota'] == '1') {
    echo "   ✅ User IS IMMUNE - hierarchie se na ni nevztahuje\n\n";
} else {
    echo "   ❌ User IS NOT IMMUNE - hierarchie SE APLIKUJE\n\n";
}

// 2. Načíst hierarchický profil
echo "2. ACTIVE HIERARCHY PROFILE:\n";
$stmt = $db->prepare("SELECT hodnota FROM 25a_nastaveni_globalni WHERE klic = 'hierarchy_profile_id'");
$stmt->execute();
$profileId = $stmt->fetchColumn();
echo "   Profile ID: $profileId\n";

$stmt = $db->prepare("SELECT nazev, popis, structure_json FROM 25_hierarchie_profily WHERE id = :id");
$stmt->execute(['id' => $profileId]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);
echo "   Profile name: " . $profile['nazev'] . "\n";
echo "   Profile description: " . ($profile['popis'] ?? 'N/A') . "\n\n";

// 3. Parsovat structure_json a najít vztahy pro user 71
echo "3. USER RELATIONSHIPS IN PROFILE:\n";
$structure = json_decode($profile['structure_json'], true);

$userRelationships = [];
$roleRelationships = [];

// Najít user 71 v nodech
foreach ($structure['nodes'] as $node) {
    if ($node['typ'] == 'user' && $node['data']['userId'] == $userId) {
        echo "   ✅ User 71 FOUND in profile (direct assignment)\n";
        echo "      Node ID: " . $node['id'] . "\n";
        echo "      Name: " . $node['data']['name'] . "\n";
        
        // Najít incoming edges (šablony → user 71)
        foreach ($structure['edges'] as $edge) {
            if ($edge['target'] == $node['id']) {
                $userRelationships[] = $edge;
                echo "      → Incoming edge from: " . $edge['source'] . "\n";
            }
        }
    }
}

// Najít role uživatelky (Role ID 7 = Účetní)
echo "\n   Checking role-based relationships:\n";
$stmt = $db->prepare("
    SELECT r.id, r.kod_role, r.nazev_role 
    FROM 25_uzivatele_role ur
    JOIN 25_role r ON ur.role_id = r.id
    WHERE ur.uzivatel_id = :user_id
");
$stmt->execute(['user_id' => $userId]);
$userRoles = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($userRoles as $role) {
    echo "      User role: " . $role['nazev_role'] . " (ID " . $role['id'] . ", kod: " . $role['kod_role'] . ")\n";
    
    // Najít tuto roli v profile
    foreach ($structure['nodes'] as $node) {
        if ($node['typ'] == 'role' && $node['data']['roleId'] == $role['id']) {
            echo "         ✅ Role FOUND in profile\n";
            echo "            Scope: " . ($node['data']['scopeDefinition']['type'] ?? 'N/A') . "\n";
            echo "            Fields: " . json_encode($node['data']['scopeDefinition']['fields'] ?? []) . "\n";
            
            // Najít incoming edges (šablony → role)
            foreach ($structure['edges'] as $edge) {
                if ($edge['target'] == $node['id']) {
                    $roleRelationships[] = [
                        'edge' => $edge,
                        'role' => $role,
                        'scope' => $node['data']['scopeDefinition'] ?? null
                    ];
                    echo "            → Incoming edge from: " . $edge['source'] . "\n";
                }
            }
        }
    }
}

if (empty($userRelationships) && empty($roleRelationships)) {
    echo "\n   ❌ NO RELATIONSHIPS FOUND FOR USER 71 in profile!\n";
    echo "   ⚠️  This means hierarchy will NOT be applied\n";
    echo "   ⚠️  System will fall back to ROLE-BASED filter (12 fields)\n\n";
} else {
    echo "\n   ✅ Found " . count($userRelationships) . " direct user relationships\n";
    echo "   ✅ Found " . count($roleRelationships) . " role-based relationships\n\n";
}

// 4. Zjistit, jaký SQL filtr se generuje
echo "4. GENERATED SQL FILTER:\n";
global $HIERARCHY_DEBUG_INFO;
$filter = applyHierarchyFilterToOrders($userId, $db);

if ($filter === null) {
    echo "   ❌ NO FILTER GENERATED (hierarchy not applied)\n";
    echo "   → Reason: " . ($HIERARCHY_DEBUG_INFO['reason'] ?? 'unknown') . "\n";
    echo "   → Will use ROLE-BASED filter (12 fields WHERE clause)\n\n";
} else {
    echo "   ✅ FILTER GENERATED:\n";
    echo "   " . substr($filter, 0, 200) . "...\n\n";
}

// 5. Debug info
echo "5. HIERARCHY DEBUG INFO:\n";
echo json_encode($HIERARCHY_DEBUG_INFO, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 6. Zkontrolovat, kolik objednávek uživatelka MĚLA vidět
echo "6. ORDERS VISIBILITY CHECK:\n";
$stmt = $db->prepare("
    SELECT COUNT(*) as total
    FROM 25a_objednavky o
    WHERE o.stav_objednavky != 'ARCHIVOVANO'
");
$stmt->execute();
$total = $stmt->fetchColumn();
echo "   Total non-archived orders: $total\n";

// Kolik vidí podle role-based filtru (12 polí)
$stmt = $db->prepare("
    SELECT COUNT(*) as count
    FROM 25a_objednavky o
    WHERE o.stav_objednavky != 'ARCHIVOVANO'
    AND (
        o.uzivatel_id = :uid
        OR o.objednatel_id = :uid
        OR o.garant_uzivatel_id = :uid
        OR o.schvalovatel_id = :uid
        OR o.prikazce_id = :uid
        OR o.uzivatel_akt_id = :uid
        OR o.odesilatel_id = :uid
        OR o.dodavatel_potvrdil_id = :uid
        OR o.zverejnil_id = :uid
        OR o.fakturant_id = :uid
        OR o.dokoncil_id = :uid
        OR o.potvrdil_vecnou_spravnost_id = :uid
    )
");
$stmt->execute(['uid' => $userId]);
$roleBasedCount = $stmt->fetchColumn();
echo "   Orders visible by role-based filter (12 fields): $roleBasedCount\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "ZÁVĚR:\n";
echo "═══════════════════════════════════════════════════════════════\n";
if ($roleBasedCount < $total) {
    echo "⚠️  PROBLÉM: Uživatelka má právo ORDER_READ_ALL, ale nevidí všechny objednávky!\n";
    echo "   Má vidět: $total objednávek\n";
    echo "   Vidí jen: $roleBasedCount objednávek\n";
    echo "\n";
    echo "PŘÍČINA: Hierarchie je zapnutá, ale uživatelka nemá vztahy v profilu.\n";
    echo "         Systém aplikuje ROLE-BASED filter místo ORDER_READ_ALL.\n";
    echo "\n";
    echo "ŘEŠENÍ:\n";
    echo "   1. Přidat uživatelku 71 do hierarchického profilu PRIKAZCI\n";
    echo "   2. NEBO nastavit uživatelku jako HIERARCHY_IMMUNE\n";
    echo "   3. NEBO vypnout hierarchii globálně\n";
} else {
    echo "✅ Vše OK - uživatelka vidí všechny objednávky\n";
}
echo "═══════════════════════════════════════════════════════════════\n";

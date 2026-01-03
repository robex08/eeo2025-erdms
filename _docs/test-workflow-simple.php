<?php
/**
 * 🔍 SIMPLIFIED WORKFLOW VERIFICATION TEST
 * 
 * Ověří setup pro trigger "odeslána ke schválení"
 */

try {
    echo "🔍 WORKFLOW VERIFICATION TEST\n";
    echo "═══════════════════════════════════════════════════════════\n\n";

    // DB připojení
    $pdo = new PDO("mysql:host=10.3.172.11;dbname=eeo2025-dev;charset=utf8mb4", "erdms_user", "CHANGE_ME_DB_PASSWORD", array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ));
    
    echo "1️⃣ Připojeno k DB: eeo2025-dev\n\n";

    // Global settings
    echo "2️⃣ Global settings:\n";
    $stmt = $pdo->prepare("SELECT klic, hodnota FROM 25a_nastaveni_globalni WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id')");
    $stmt->execute();
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    foreach ($settings as $key => $value) {
        echo "   ✅ $key = $value\n";
    }
    echo "\n";

    // Profil info
    echo "3️⃣ Profil info:\n";
    $profileId = $settings['hierarchy_profile_id'];
    $stmt = $pdo->prepare("SELECT id, nazev, aktivni FROM 25_hierarchie_profily WHERE id = ?");
    $stmt->execute([$profileId]);
    $profile = $stmt->fetch();
    echo "   ✅ ID {$profile['id']}: '{$profile['nazev']}' (aktivni={$profile['aktivni']})\n\n";

    // Event type
    echo "4️⃣ Event type:\n";
    $stmt = $pdo->prepare("SELECT id, kod, nazev FROM 25_notifikace_typy_udalosti WHERE kod = 'ORDER_PENDING_APPROVAL'");
    $stmt->execute();
    $eventType = $stmt->fetch();
    echo "   ✅ ID {$eventType['id']}: {$eventType['kod']} - {$eventType['nazev']}\n\n";

    // Template v profilu
    echo "5️⃣ Template s ORDER_PENDING_APPROVAL:\n";
    $stmt = $pdo->prepare("
        SELECT structure_json 
        FROM 25_hierarchie_profily 
        WHERE id = ? 
        AND structure_json LIKE '%ORDER_PENDING_APPROVAL%'
    ");
    $stmt->execute([$profileId]);
    $hasTemplate = $stmt->fetch();
    
    if ($hasTemplate) {
        echo "   ✅ Template s ORDER_PENDING_APPROVAL nalezen v profilu\n";
    } else {
        echo "   ❌ Template s ORDER_PENDING_APPROVAL NENALEZEN!\n";
    }
    echo "\n";

    // Backend trigger point
    echo "6️⃣ Backend trigger v orderV2Endpoints.php:\n";
    $triggerFile = '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2Endpoints.php';
    if (file_exists($triggerFile)) {
        $content = file_get_contents($triggerFile);
        if (strpos($content, 'ORDER_PENDING_APPROVAL') !== false) {
            echo "   ✅ ORDER_PENDING_APPROVAL trigger nalezen v orderV2Endpoints.php\n";
            
            // Najdi řádek s triggerem
            $lines = file($triggerFile);
            foreach ($lines as $num => $line) {
                if (strpos($line, 'ORDER_PENDING_APPROVAL') !== false && strpos($line, 'notificationRouter') !== false) {
                    echo "   ✅ Řádek " . ($num + 1) . ": " . trim($line) . "\n";
                    break;
                }
            }
        } else {
            echo "   ❌ ORDER_PENDING_APPROVAL trigger NENALEZEN!\n";
        }
    } else {
        echo "   ❌ orderV2Endpoints.php neexistuje!\n";
    }
    echo "\n";

    // Test hierarchy struktura - podrobnější analýza
    echo "7️⃣ Analýza struktury profilu:\n";
    $stmt = $pdo->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = ?");
    $stmt->execute([$profileId]);
    $structure = json_decode($stmt->fetchColumn(), true);
    
    if ($structure) {
        echo "   📊 Celkem nodes: " . count($structure['nodes']) . "\n";
        echo "   📊 Celkem edges: " . count($structure['edges']) . "\n\n";
        
        // Najdi template s ORDER_PENDING_APPROVAL
        $templateNode = null;
        foreach ($structure['nodes'] as $node) {
            if ($node['typ'] == 'template' && 
                isset($node['data']['eventTypes']) && 
                in_array('ORDER_PENDING_APPROVAL', $node['data']['eventTypes'])) {
                $templateNode = $node;
                break;
            }
        }
        
        if ($templateNode) {
            echo "   ✅ Template node nalezen:\n";
            echo "      ID: {$templateNode['id']}\n";
            echo "      Název: {$templateNode['data']['name']}\n";
            echo "      Event types: " . implode(', ', $templateNode['data']['eventTypes']) . "\n\n";
            
            // Najdi edges z tohoto template
            $edges = array();
            foreach ($structure['edges'] as $edge) {
                if ($edge['source'] == $templateNode['id']) {
                    $edges[] = $edge;
                }
            }
            
            echo "   📊 Edges z template: " . count($edges) . "\n";
            foreach ($edges as $i => $edge) {
                echo "      Edge #" . ($i+1) . ":\n";
                echo "         Target: {$edge['target']}\n";
                echo "         Priority: " . ($edge['data']['priority'] ?? 'N/A') . "\n";
                echo "         Send Email: " . ($edge['data']['sendEmail'] ?? 'false') . "\n";
                echo "         Send InApp: " . ($edge['data']['sendInApp'] ?? 'true') . "\n";
                
                // Najdi target node
                foreach ($structure['nodes'] as $node) {
                    if ($node['id'] == $edge['target']) {
                        echo "         Target Node: {$node['data']['name']} (type: {$node['typ']})\n";
                        if (isset($node['data']['roleId'])) {
                            echo "         Role ID: {$node['data']['roleId']}\n";
                        }
                        break;
                    }
                }
                echo "\n";
            }
        } else {
            echo "   ❌ Template s ORDER_PENDING_APPROVAL NENALEZEN v nodes!\n";
        }
    }

    // Target role info
    echo "8️⃣ Target role info:\n";
    $stmt = $pdo->prepare("SELECT id, kod_role, nazev_role, aktivni FROM 25_role WHERE id IN (5, 9)");
    $stmt->execute();
    $roles = $stmt->fetchAll();
    
    foreach ($roles as $role) {
        echo "   Role #{$role['id']}: {$role['nazev_role']} ({$role['kod_role']}) - aktivni: {$role['aktivni']}\n";
    }

    echo "\n═══════════════════════════════════════════════════════════\n";
    echo "✅ VERIFIKACE DOKONČENA\n\n";

    // Závěr
    $isWorking = (
        $settings['hierarchy_enabled'] == '1' &&
        $profile['aktivni'] == '1' &&
        $hasTemplate &&
        $templateNode &&
        count($edges) > 0
    );

    if ($isWorking) {
        echo "🎉 WORKFLOW JE SPRÁVNĚ NASTAVEN!\n";
        echo "   → Když se objednávka odešle ke schválení (ODESLANA_KE_SCHVALENI)\n";
        echo "   → Backend zavolá notificationRouter() s ORDER_PENDING_APPROVAL\n";
        echo "   → Systém najde template v profilu PRIKAZCI\n";
        echo "   → Projde " . count($edges) . " edge(s) a odešle notifikace cílovým rolím\n";
    } else {
        echo "❌ WORKFLOW NENÍ KOMPLETNĚ NASTAVEN!\n";
        echo "   → Zkontrolujte výše uvedené problémy\n";
    }

} catch (Exception $e) {
    echo "❌ CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
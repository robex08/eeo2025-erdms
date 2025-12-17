<?php
/**
 * Debug skript - Analýza hierarchického profilu
 * Zjistí, jak jsou nakonfigurovány event types pro notifikace
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Načíst DB config
$dbConfig = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

try {
    $dsn = "mysql:host={$dbConfig['mysql']['host']};dbname={$dbConfig['mysql']['database']};charset=utf8mb4";
    $db = new PDO($dsn, $dbConfig['mysql']['username'], $dbConfig['mysql']['password']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Připojeno k DB: {$dbConfig['mysql']['database']}@{$dbConfig['mysql']['host']}\n\n";
    
    // 1. Najít aktivní hierarchický profil z global settings
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "1️⃣  GLOBÁLNÍ NASTAVENÍ\n";
    echo "═══════════════════════════════════════════════════════════════\n";
    
    $stmt = $db->query("SELECT klic, hodnota FROM 25a_nastaveni_globalni WHERE klic IN ('hierarchy_enabled', 'hierarchy_profile_id')");
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    foreach ($settings as $key => $value) {
        echo "   $key = $value\n";
    }
    
    if (empty($settings['hierarchy_profile_id'])) {
        die("\n❌ Žádný hierarchický profil není nastaven!\n");
    }
    
    $profileId = (int)$settings['hierarchy_profile_id'];
    
    // 2. Načíst profil
    echo "\n═══════════════════════════════════════════════════════════════\n";
    echo "2️⃣  HIERARCHICKÝ PROFIL\n";
    echo "═══════════════════════════════════════════════════════════════\n";
    
    $stmt = $db->prepare("SELECT id, nazev, popis, structure_json FROM 25_hierarchie_profily WHERE id = ?");
    $stmt->execute([$profileId]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile) {
        die("\n❌ Profil ID=$profileId neexistuje!\n");
    }
    
    echo "   ID: {$profile['id']}\n";
    echo "   Název: {$profile['nazev']}\n";
    echo "   Popis: {$profile['popis']}\n\n";
    
    $structure = json_decode($profile['structure_json'], true);
    if (!$structure) {
        die("❌ Neplatný JSON ve structure_json!\n");
    }
    
    $nodeCount = count($structure['nodes'] ?? []);
    $edgeCount = count($structure['edges'] ?? []);
    echo "   📊 Struktura: $nodeCount nodes, $edgeCount edges\n\n";
    
    // 3. Analyzovat TEMPLATE nodes s event types ORDER_SENT_FOR_APPROVAL a ORDER_APPROVED
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "3️⃣  TEMPLATE NODES - EVENT TYPES\n";
    echo "═══════════════════════════════════════════════════════════════\n\n";
    
    $targetEvents = ['ORDER_SENT_FOR_APPROVAL', 'ORDER_APPROVED'];
    $templatesByEvent = [];
    
    foreach ($structure['nodes'] as $node) {
        if ($node['typ'] !== 'template') continue;
        
        $eventTypes = $node['data']['eventTypes'] ?? [];
        
        foreach ($targetEvents as $eventType) {
            if (in_array($eventType, $eventTypes)) {
                if (!isset($templatesByEvent[$eventType])) {
                    $templatesByEvent[$eventType] = [];
                }
                $templatesByEvent[$eventType][] = $node;
            }
        }
    }
    
    foreach ($targetEvents as $eventType) {
        echo "🔍 Event Type: $eventType\n";
        echo "   ───────────────────────────────────────────────────────────\n";
        
        if (empty($templatesByEvent[$eventType])) {
            echo "   ❌ Žádné template nodes nenalezeny!\n\n";
            continue;
        }
        
        foreach ($templatesByEvent[$eventType] as $node) {
            echo "   ✅ Template: {$node['data']['name']}\n";
            echo "      Node ID: {$node['id']}\n";
            echo "      Template ID v DB: {$node['data']['templateId']}\n";
            
            // Načíst template z DB
            $stmt = $db->prepare("SELECT typ, app_nadpis FROM 25_notifikace_sablony WHERE id = ?");
            $stmt->execute([$node['data']['templateId']]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($template) {
                echo "      Template typ: {$template['typ']}\n";
                echo "      Nadpis: {$template['app_nadpis']}\n";
            }
            
            echo "      Event Types: " . json_encode($node['data']['eventTypes']) . "\n";
            
            // Varianty
            if (!empty($node['data']['normalVariant'])) {
                echo "      Normal Variant: {$node['data']['normalVariant']}\n";
            }
            if (!empty($node['data']['urgentVariant'])) {
                echo "      Urgent Variant: {$node['data']['urgentVariant']}\n";
            }
            if (!empty($node['data']['infoVariant'])) {
                echo "      Info Variant: {$node['data']['infoVariant']}\n";
            }
            
            echo "\n";
            
            // 4. Najít EDGES z tohoto template
            echo "      📤 EDGES (příjemci):\n";
            echo "      ───────────────────────────────────────────────────────\n";
            
            $edgeCount = 0;
            foreach ($structure['edges'] as $edge) {
                if ($edge['source'] !== $node['id']) continue;
                
                $edgeCount++;
                echo "         Edge #{$edgeCount}: {$edge['id']}\n";
                
                // Target node
                $targetNode = null;
                foreach ($structure['nodes'] as $n) {
                    if ($n['id'] === $edge['target']) {
                        $targetNode = $n;
                        break;
                    }
                }
                
                if ($targetNode) {
                    echo "         → Target: {$targetNode['typ']} - {$targetNode['data']['name']}\n";
                }
                
                // Edge data
                echo "         → Recipient Type: " . ($edge['data']['recipient_type'] ?? 'N/A') . "\n";
                echo "         → Scope Filter: " . ($edge['data']['scope_filter'] ?? 'N/A') . "\n";
                echo "         → Recipient Role: " . ($edge['data']['recipientRole'] ?? 'N/A') . "\n";
                echo "         → Send Email: " . (($edge['data']['sendEmail'] ?? false) ? 'ANO' : 'NE') . "\n";
                echo "         → Send InApp: " . (($edge['data']['sendInApp'] ?? true) ? 'ANO' : 'NE') . "\n";
                echo "\n";
            }
            
            if ($edgeCount === 0) {
                echo "         ❌ Žádné edges nenalezeny!\n\n";
            }
        }
        
        echo "\n";
    }
    
    // 5. ZÁVĚR - Diagnostika problému
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "4️⃣  DIAGNOSTIKA\n";
    echo "═══════════════════════════════════════════════════════════════\n\n";
    
    $sentForApprovalCount = count($templatesByEvent['ORDER_SENT_FOR_APPROVAL'] ?? []);
    $approvedCount = count($templatesByEvent['ORDER_APPROVED'] ?? []);
    
    echo "📊 Počet template nodes:\n";
    echo "   - ORDER_SENT_FOR_APPROVAL: $sentForApprovalCount templates\n";
    echo "   - ORDER_APPROVED: $approvedCount templates\n\n";
    
    if ($sentForApprovalCount > 0 && $approvedCount > 0) {
        echo "✅ Oba event types mají přiřazené templates.\n\n";
        echo "🔍 MOŽNÝ PROBLÉM:\n";
        echo "   Backend možná nerozlišuje správně mezi těmito dvěma event types.\n";
        echo "   Zkontrolujte:\n";
        echo "   1. Že frontend volá správný event type v notificationRouter()\n";
        echo "   2. Že backend v findNotificationRecipients() správně filtruje podle eventType\n";
        echo "   3. Že se nepoužívá stejný template pro oba eventy\n\n";
    } elseif ($sentForApprovalCount > 1) {
        echo "⚠️  DUPLICITNÍ TEMPLATES!\n";
        echo "   Pro ORDER_SENT_FOR_APPROVAL existuje více než 1 template.\n";
        echo "   Backend může být zmaten, kterou použít.\n\n";
    } elseif ($approvedCount > 1) {
        echo "⚠️  DUPLICITNÍ TEMPLATES!\n";
        echo "   Pro ORDER_APPROVED existuje více než 1 template.\n";
        echo "   Backend může být zmaten, kterou použít.\n\n";
    } elseif ($sentForApprovalCount === 0) {
        echo "❌ CHYBÍ template pro ORDER_SENT_FOR_APPROVAL!\n\n";
    } elseif ($approvedCount === 0) {
        echo "❌ CHYBÍ template pro ORDER_APPROVED!\n\n";
    }
    
} catch (PDOException $e) {
    die("❌ Chyba DB: " . $e->getMessage() . "\n");
}

<?php
/**
 * Debug script pro analýzu 500 chyby při triggerování notifikací
 * Order ID: 11487, 11488
 * Event Type: ORDER_SENT_FOR_APPROVAL
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// 1. Načíst DB config
$config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

// 2. Připojit se k DB
try {
    $db = new PDO(
        "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
        $config['mysql']['username'],
        $config['mysql']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
    echo "✅ DB Connection OK\n";
} catch (PDOException $e) {
    die("❌ DB Connection FAILED: " . $e->getMessage() . "\n");
}

echo "════════════════════════════════════════════════════════════════\n";
echo "📊 ANALÝZA NOTIFIKAČNÍHO SYSTÉMU\n";
echo "════════════════════════════════════════════════════════════════\n\n";

// 3. Zkontrolovat objednávky 11487 a 11488
echo "1️⃣ Kontrola objednávek 11487 a 11488:\n";
$stmt = $db->prepare("SELECT id, cislo_objednavky, predmet, uzivatel_id, prikazce_id, garant_uzivatel_id, stav_workflow_kod FROM 25a_objednavky WHERE id IN (11487, 11488)");
$stmt->execute();
$orders = $stmt->fetchAll();

foreach ($orders as $order) {
    echo "   Order ID: {$order['id']}\n";
    echo "      Number: {$order['cislo_objednavky']}\n";
    echo "      Subject: {$order['predmet']}\n";
    echo "      Creator (uzivatel_id): {$order['uzivatel_id']}\n";
    echo "      Commander (prikazce_id): {$order['prikazce_id']}\n";
    echo "      Guarantor (garant_uzivatel_id): {$order['garant_uzivatel_id']}\n";
    echo "      Workflow State: {$order['stav_workflow_kod']}\n\n";
}

// 4. Zkontrolovat hierarchický profil
echo "2️⃣ Kontrola aktivního hierarchického profilu:\n";
$stmt = $db->query("SELECT id, nazev, aktivni FROM 25_hierarchie_profily WHERE aktivni = 1");
$profile = $stmt->fetch();

if ($profile) {
    echo "   ✅ Profil ID: {$profile['id']}, Název: {$profile['nazev']}\n";
    
    // Načíst structure_json
    $stmt = $db->prepare("SELECT structure_json FROM 25_hierarchie_profily WHERE id = ?");
    $stmt->execute([$profile['id']]);
    $row = $stmt->fetch();
    $structure = json_decode($row['structure_json'], true);
    
    echo "   📊 Struktura: " . count($structure['nodes']) . " nodes, " . count($structure['edges']) . " edges\n\n";
    
    // Najít template nodes s ORDER_SENT_FOR_APPROVAL
    echo "3️⃣ Hledám template nodes s eventType='ORDER_SENT_FOR_APPROVAL':\n";
    $found = false;
    
    foreach ($structure['nodes'] as $node) {
        if ($node['typ'] === 'template') {
            $eventTypes = isset($node['data']['eventTypes']) ? $node['data']['eventTypes'] : [];
            if (in_array('ORDER_SENT_FOR_APPROVAL', $eventTypes)) {
                $found = true;
                echo "   ✅ Template: {$node['data']['name']}\n";
                echo "      Node ID: {$node['id']}\n";
                echo "      Template ID: " . ($node['data']['templateId'] ?? 'NOT SET') . "\n";
                echo "      Event Types: " . implode(', ', $eventTypes) . "\n\n";
                
                // Najít edges z tohoto template
                echo "      📋 Edges z tohoto template:\n";
                foreach ($structure['edges'] as $edge) {
                    if ($edge['source'] === $node['id']) {
                        echo "         Edge ID: {$edge['id']}\n";
                        echo "            Target: {$edge['target']}\n";
                        echo "            Recipient Type: " . ($edge['data']['recipient_type'] ?? 'NOT SET') . "\n";
                        echo "            Recipient Role: " . ($edge['data']['recipientRole'] ?? 'NOT SET') . "\n";
                        echo "            Scope Filter: " . ($edge['data']['scope_filter'] ?? 'NOT SET') . "\n";
                        echo "            Send Email: " . (($edge['data']['sendEmail'] ?? false) ? 'YES' : 'NO') . "\n";
                        echo "            Send InApp: " . (($edge['data']['sendInApp'] ?? true) ? 'YES' : 'NO') . "\n";
                        
                        // Najít target node
                        foreach ($structure['nodes'] as $targetNode) {
                            if ($targetNode['id'] === $edge['target']) {
                                echo "            Target Node Type: {$targetNode['typ']}\n";
                                echo "            Target Node Name: " . ($targetNode['data']['name'] ?? 'N/A') . "\n";
                                
                                if ($targetNode['typ'] === 'role') {
                                    $roleId = $targetNode['data']['roleId'] ?? null;
                                    if ($roleId) {
                                        // Najít uživatele s touto rolí
                                        $stmtRole = $db->prepare("
                                            SELECT DISTINCT u.id, u.username, u.jmeno, u.prijmeni 
                                            FROM 25_uzivatele u
                                            JOIN 25_uzivatele_role ur ON u.id = ur.uzivatel_id
                                            WHERE ur.role_id = ? AND u.aktivni = 1
                                        ");
                                        $stmtRole->execute([$roleId]);
                                        $users = $stmtRole->fetchAll();
                                        echo "            → Role ID: $roleId → " . count($users) . " users\n";
                                        foreach ($users as $user) {
                                            echo "               • User {$user['id']}: {$user['username']} ({$user['jmeno']} {$user['prijmeni']})\n";
                                        }
                                    }
                                }
                                break;
                            }
                        }
                        echo "\n";
                    }
                }
            }
        }
    }
    
    if (!$found) {
        echo "   ❌ Žádný template s ORDER_SENT_FOR_APPROVAL nenalezen!\n\n";
    }
} else {
    echo "   ❌ Žádný aktivní hierarchický profil!\n\n";
}

// 5. Zkontrolovat notification templates
echo "4️⃣ Kontrola notification templates:\n";
$stmt = $db->query("SELECT id, nazev, aktivni, email_telo IS NOT NULL as has_email FROM 25_notifikace_sablony WHERE aktivni = 1");
$templates = $stmt->fetchAll();

echo "   Aktivních templates: " . count($templates) . "\n";
foreach ($templates as $t) {
    echo "      • ID {$t['id']}: {$t['nazev']} (Email: " . ($t['has_email'] ? 'YES' : 'NO') . ")\n";
}
echo "\n";

// 6. Zkontrolovat debug log pro poslední pokusy
echo "5️⃣ Poslední debug záznamy:\n";
$stmt = $db->query("SELECT * FROM debug_notification_log ORDER BY id DESC LIMIT 10");
$logs = $stmt->fetchAll();

foreach ($logs as $log) {
    echo "   [ID: {$log['id']}] {$log['message']}\n";
    if (!empty($log['data'])) {
        $data = json_decode($log['data'], true);
        if ($data) {
            $dataStr = json_encode($data, JSON_UNESCAPED_UNICODE);
            if (strlen($dataStr) > 200) {
                $dataStr = substr($dataStr, 0, 200) . '...';
            }
            echo "      Data: $dataStr\n";
        }
    }
    echo "\n";
}

// 7. Zkontrolovat global settings
echo "6️⃣ Global notification settings:\n";
$stmt = $db->query("SELECT * FROM 25a_nastaveni_globalni LIMIT 1");
$settings = $stmt->fetch();

if ($settings) {
    echo "   notifications_enabled: " . ($settings['notifications_enabled'] ?? 'NOT SET') . "\n";
    echo "   notifications_email_enabled: " . ($settings['notifications_email_enabled'] ?? 'NOT SET') . "\n";
    echo "   notifications_inapp_enabled: " . ($settings['notifications_inapp_enabled'] ?? 'NOT SET') . "\n";
} else {
    echo "   ❌ Žádné global settings!\n";
}

echo "\n════════════════════════════════════════════════════════════════\n";
echo "✅ ANALÝZA DOKONČENA\n";
echo "════════════════════════════════════════════════════════════════\n";

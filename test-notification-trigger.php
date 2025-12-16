<?php
/**
 * Test skript pro Notification Trigger API
 * 
 * Testuje:
 * 1. Notification Router s org. hierarchií
 * 2. Email sending funkci
 * 3. Resolving rolí/lokalit/oddělení na uživatele
 * 
 * Použití:
 * php test-notification-trigger.php
 */

require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/queries.php';
require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php';

echo "=== TEST NOTIFICATION TRIGGER API ===\n\n";

try {
    // Připojení k DB
    $config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
    $db = new PDO(
        "mysql:host={$config['mysql']['host']};dbname={$config['mysql']['database']};charset=utf8mb4",
        $config['mysql']['username'],
        $config['mysql']['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "✅ DB připojena\n\n";
    
    // === TEST 1: Základní trigger notifikace ===
    echo "TEST 1: Trigger notifikace pro ORDER_APPROVED\n";
    echo "----------------------------------------------\n";
    
    // Placeholder data pro šablonu
    $placeholderData = array(
        'order_number' => 'OBJ-2025-TEST-001',
        'order_id' => 999,
        'predmet' => 'Test objednávka pro notifikace',
        'amount' => '25000',
        'approver_name' => 'Test Admin',
        'creator_name' => 'Robert Test',
        'approval_date' => date('d.m.Y H:i'),
        'strediska' => 'IT, Finance',
        'financovani' => 'Investice',
        'garant_name' => 'Garant Test'
    );
    
    // Simulace triggeru (použij skutečné ID uživatele z DB)
    echo "Volám notificationRouter()...\n";
    $result = notificationRouter(
        $db,
        'ORDER_APPROVED',      // Event type
        999,                   // Object ID (testovací objednávka)
        1,                     // Trigger user ID (admin)
        $placeholderData
    );
    
    echo "\nVýsledek:\n";
    echo "- Success: " . ($result['success'] ? '✅ ANO' : '❌ NE') . "\n";
    echo "- Odesláno: {$result['sent']} notifikací\n";
    
    if (!empty($result['errors'])) {
        echo "- Chyby:\n";
        foreach ($result['errors'] as $error) {
            echo "  ❌ $error\n";
        }
    } else {
        echo "- Chyby: ✅ Žádné\n";
    }
    
    echo "\n";
    
    // === TEST 2: Kontrola vytvořených notifikací v DB ===
    echo "TEST 2: Kontrola notifikací v databázi\n";
    echo "--------------------------------------\n";
    
    $stmt = $db->prepare("
        SELECT 
            n.id,
            n.typ,
            n.nadpis,
            n.priorita,
            n.pro_uzivatele_id,
            u.jmeno,
            u.prijmeni,
            u.email
        FROM 25_notifikace n
        LEFT JOIN 25_uzivatele u ON n.pro_uzivatele_id = u.uzivatel_id
        WHERE n.objekt_id = 999
        ORDER BY n.dt_created DESC
        LIMIT 10
    ");
    $stmt->execute();
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($notifications)) {
        echo "⚠️ Žádné notifikace nenalezeny v DB\n";
        echo "   MOŽNÉ PŘÍČINY:\n";
        echo "   1. Org. hierarchie nemá aktivní profil\n";
        echo "   2. Žádný Template NODE s eventType 'ORDER_APPROVED'\n";
        echo "   3. Žádné EDGES vedoucí z Template NODE\n";
        echo "   4. Uživatelé mají notifikace vypnuté\n";
    } else {
        echo "✅ Nalezeno {count($notifications)} notifikací:\n\n";
        foreach ($notifications as $notif) {
            echo "  ID: {$notif['id']}\n";
            echo "  Typ: {$notif['typ']}\n";
            echo "  Nadpis: {$notif['nadpis']}\n";
            echo "  Priorita: {$notif['priorita']}\n";
            echo "  Příjemce: {$notif['jmeno']} {$notif['prijmeni']} ({$notif['email']})\n";
            echo "  ---\n";
        }
    }
    
    echo "\n";
    
    // === TEST 3: Kontrola org. hierarchie ===
    echo "TEST 3: Kontrola organizační hierarchie\n";
    echo "---------------------------------------\n";
    
    $stmt = $db->prepare("
        SELECT id, nazev, aktivni 
        FROM 25_hierarchy_profiles 
        WHERE aktivni = 1
        LIMIT 1
    ");
    $stmt->execute();
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$profile) {
        echo "❌ Žádný aktivní profil hierarchie!\n";
        echo "   ŘEŠENÍ: Vytvoř profil v Org. Hierarchy editoru a aktivuj jej.\n";
    } else {
        echo "✅ Aktivní profil: {$profile['nazev']} (ID: {$profile['id']})\n";
        
        // Načíst strukturu
        $stmt = $db->prepare("SELECT structure_json FROM 25_hierarchy_profiles WHERE id = :id");
        $stmt->execute([':id' => $profile['id']]);
        $structureJson = $stmt->fetchColumn();
        $structure = json_decode($structureJson, true);
        
        if (!$structure) {
            echo "❌ Struktura je prázdná nebo neplatná!\n";
        } else {
            $nodeCount = count($structure['nodes'] ?? []);
            $edgeCount = count($structure['edges'] ?? []);
            echo "  - Nodes: $nodeCount\n";
            echo "  - Edges: $edgeCount\n";
            
            // Najít Template nodes
            $templateNodes = array_filter($structure['nodes'] ?? [], function($node) {
                return ($node['typ'] ?? '') === 'template';
            });
            
            echo "  - Template nodes: " . count($templateNodes) . "\n";
            
            if (!empty($templateNodes)) {
                echo "\n  Template nodes:\n";
                foreach ($templateNodes as $node) {
                    $name = $node['data']['name'] ?? 'Bez názvu';
                    $eventTypes = $node['data']['eventTypes'] ?? [];
                    echo "    - $name (eventTypes: " . implode(', ', $eventTypes) . ")\n";
                }
            }
        }
    }
    
    echo "\n";
    
    // === SOUHRNNÁ ZPRÁVA ===
    echo "=== SOUHRN ===\n";
    if ($result['success'] && $result['sent'] > 0) {
        echo "✅ TEST ÚSPĚŠNÝ!\n";
        echo "   Notifikační systém funguje správně.\n";
        echo "   Org. hierarchie je nastavena a odesílá notifikace.\n";
    } else {
        echo "⚠️ TEST ČÁSTEČNĚ ÚSPĚŠNÝ\n";
        echo "   Backend funguje, ale notifikace nebyly odeslány.\n";
        echo "   Zkontroluj org. hierarchii (Template nodes + EDGES).\n";
    }
    
} catch (Exception $e) {
    echo "❌ CHYBA: {$e->getMessage()}\n";
    echo "Stack trace:\n{$e->getTraceAsString()}\n";
}

echo "\n=== KONEC TESTU ===\n";
?>

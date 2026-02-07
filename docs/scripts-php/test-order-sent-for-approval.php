<?php
/**
 * Test ORDER_SENT_FOR_APPROVAL notifikace
 * Simuluje frontend volání z OrderForm25
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "════════════════════════════════════════════════════════════════\n";
echo "🧪 TEST: ORDER_SENT_FOR_APPROVAL Notifikace\n";
echo "════════════════════════════════════════════════════════════════\n\n";

// Načíst DB config
$dbConfig = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';

try {
    $dsn = "mysql:host={$dbConfig['mysql']['host']};dbname={$dbConfig['mysql']['database']};charset=utf8mb4";
    $db = new PDO($dsn, $dbConfig['mysql']['username'], $dbConfig['mysql']['password']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Připojeno k DB\n\n";
    
    // 1. Najít poslední objednávku
    echo "1️⃣  Hledám poslední objednávku...\n";
    $stmt = $db->query("SELECT id, cislo_objednavky, objednatel_id, prikazce_id, garant_uzivatel_id, stav_workflow_kod 
                        FROM 25a_objednavky 
                        WHERE cislo_objednavky IS NOT NULL 
                        ORDER BY id DESC 
                        LIMIT 1");
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        die("❌ Žádná objednávka nenalezena!\n");
    }
    
    echo "   ✅ Objednávka: {$order['cislo_objednavky']} (ID: {$order['id']})\n";
    echo "      Objednatel: {$order['objednatel_id']}\n";
    echo "      Příkazce: {$order['prikazce_id']}\n";
    echo "      Garant: {$order['garant_uzivatel_id']}\n";
    echo "      Stav: {$order['stav_workflow_kod']}\n\n";
    
    // 2. Zkontrolovat workflow stav
    $workflowKod = json_decode($order['stav_workflow_kod'], true);
    if (!is_array($workflowKod)) {
        $workflowKod = [];
    }
    
    $hasKeSchvaleni = in_array('ODESLANA_KE_SCHVALENI', $workflowKod);
    
    echo "2️⃣  Analýza workflow stavu:\n";
    echo "   Workflow kódy: " . implode(', ', $workflowKod) . "\n";
    echo "   Má ODESLANA_KE_SCHVALENI? " . ($hasKeSchvaleni ? '✅ ANO' : '❌ NE') . "\n\n";
    
    if (!$hasKeSchvaleni) {
        echo "⚠️  Tato objednávka NENÍ ve stavu ODESLANA_KE_SCHVALENI!\n";
        echo "   Proto se notifikace nepošle (frontend toto detekuje).\n\n";
        echo "   Chceš pokračovat a přesto poslat notifikaci? (a/n): ";
        $answer = trim(fgets(STDIN));
        if (strtolower($answer) !== 'a') {
            die("❌ Test ukončen.\n");
        }
    }
    
    // 3. Načíst notifikace handler
    require_once __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHandlers.php';
    
    echo "3️⃣  Volám notificationRouter()...\n";
    echo "   Event Type: ORDER_SENT_FOR_APPROVAL\n";
    echo "   Object ID: {$order['id']}\n";
    echo "   Trigger User ID: {$order['objednatel_id']}\n\n";
    
    // 4. Zavolat notificationRouter
    $result = notificationRouter(
        $db,
        'ORDER_SENT_FOR_APPROVAL',
        $order['id'],
        $order['objednatel_id'],
        [] // Prázdné placeholders - backend si je načte sám
    );
    
    echo "\n════════════════════════════════════════════════════════════════\n";
    echo "4️⃣  VÝSLEDEK\n";
    echo "════════════════════════════════════════════════════════════════\n";
    echo "   Success: " . ($result['success'] ? '✅ ANO' : '❌ NE') . "\n";
    echo "   Sent: {$result['sent']} notifikací\n";
    
    if (!empty($result['errors'])) {
        echo "   Errors:\n";
        foreach ($result['errors'] as $error) {
            echo "      - $error\n";
        }
    }
    
    echo "\n";
    
    if ($result['sent'] > 0) {
        echo "5️⃣  Kontrola vytvořených notifikací v DB...\n";
        $stmt = $db->prepare("
            SELECT id, pro_uzivatele_id, nadpis, zprava, priorita, dt_created
            FROM 25_notifikace
            WHERE objekt_id = ? AND objekt_typ = 'orders'
            ORDER BY dt_created DESC
            LIMIT 5
        ");
        $stmt->execute([$order['id']]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "   Nalezeno: " . count($notifications) . " notifikací\n\n";
        
        foreach ($notifications as $notif) {
            echo "   ─────────────────────────────────────────────────────────\n";
            echo "   ID: {$notif['id']}\n";
            echo "   Pro uživatele: {$notif['pro_uzivatele_id']}\n";
            echo "   Nadpis: {$notif['nadpis']}\n";
            echo "   Priorita: {$notif['priorita']}\n";
            echo "   Vytvořeno: {$notif['dt_created']}\n";
            echo "\n";
        }
    }
    
    echo "════════════════════════════════════════════════════════════════\n";
    echo "✅ TEST DOKONČEN\n";
    echo "════════════════════════════════════════════════════════════════\n\n";
    
    echo "📋 DALŠÍ KROKY:\n";
    echo "   1. Zkontroluj PHP error log:\n";
    echo "      tail -f /var/log/php/error.log | grep Notification\n\n";
    echo "   2. Zkontroluj debug log:\n";
    echo "      tail -f /tmp/notification_debug.log\n\n";
    echo "   3. Pokud se notifikace neposlaly, zkontroluj:\n";
    echo "      - Je hierarchický profil aktivní? (25a_nastaveni_globalni)\n";
    echo "      - Má profil template pro ORDER_SENT_FOR_APPROVAL?\n";
    echo "      - Má template edges s příjemci?\n\n";
    
} catch (Exception $e) {
    die("❌ Chyba: " . $e->getMessage() . "\n");
}

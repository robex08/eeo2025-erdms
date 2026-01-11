<?php
/**
 * Test Workflow Update po přidání faktury
 * 
 * Testuje novou logiku workflow update replikovanou z OrderForm25.js
 */

require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php';
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/api.php'; // Pro TBL_ konstanty
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderWorkflowHelpers.php';

echo "\n=== TEST WORKFLOW UPDATE PO PŘIDÁNÍ FAKTURY ===\n\n";

try {
    // Načíst DB konfiguraci
    $config = [
        'host' => '10.3.172.11',
        'port' => '3306',
        'database' => 'eeo2025-dev', // Opraveno z 'dbname' na 'database'
        'username' => 'erdms_user',
        'password' => 'AhchohTahnoh7eim',
        'charset' => 'utf8mb4'
    ];
    
    $db = get_db($config);
    
    // Test Order ID (O-0046 z předchozí analýzy)
    $orderId = 11558;
    
    echo "1. Načtení aktuálního stavu objednávky ID {$orderId}...\n";
    
    $stmt = $db->prepare("SELECT cislo_objednavky, stav_workflow_kod, stav_objednavky, financovani FROM " . get_orders_table_name() . " WHERE id = :id");
    $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
    $stmt->execute();
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        throw new Exception("Objednávka ID {$orderId} nenalezena");
    }
    
    echo "   Číslo objednávky: " . $order['cislo_objednavky'] . "\n";
    echo "   Aktuální workflow: " . $order['stav_workflow_kod'] . "\n";
    echo "   Aktuální stav: " . $order['stav_objednavky'] . "\n";
    
    // Test parseWorkflowStates funkce
    echo "\n2. Test parseWorkflowStates funkce...\n";
    $parsedStates = parseWorkflowStates($order['stav_workflow_kod']);
    echo "   Parsované stavy: " . json_encode($parsedStates) . "\n";
    
    // Test hasWorkflowState funkce
    echo "\n3. Test hasWorkflowState funkce...\n";
    echo "   Má FAKTURACE? " . (hasWorkflowState($order['stav_workflow_kod'], 'FAKTURACE') ? 'ANO' : 'NE') . "\n";
    echo "   Má VECNA_SPRAVNOST? " . (hasWorkflowState($order['stav_workflow_kod'], 'VECNA_SPRAVNOST') ? 'ANO' : 'NE') . "\n";
    
    // Test detekce pokladny
    echo "\n4. Test detekce platby pokladnou...\n";
    $isPokladna = isOrderPaidByPokladna($db, $orderId);
    echo "   Je placeno pokladnou? " . ($isPokladna ? 'ANO' : 'NE') . "\n";
    if (!empty($order['financovani'])) {
        $financovani = json_decode($order['financovani'], true);
        echo "   Financování: " . json_encode($financovani) . "\n";
    }
    
    // Test simulovaného workflow update (BEZ skutečné změny v DB)
    echo "\n5. Simulace workflow update...\n";
    echo "   POZOR: Toto je pouze simulace - DB se nezmění!\n";
    
    // Simulovat přidání faktury
    $workflowStates = parseWorkflowStates($order['stav_workflow_kod']);
    $originalStates = $workflowStates;
    echo "   Původní stavy: " . json_encode($workflowStates) . "\n";
    
    if (!$isPokladna) {
        $updated = false;
        
        if (!in_array('FAKTURACE', $workflowStates)) {
            $workflowStates[] = 'FAKTURACE';
            $updated = true;
            echo "   → Přidán FAKTURACE\n";
        }
        
        if (in_array('FAKTURACE', $workflowStates) && !in_array('VECNA_SPRAVNOST', $workflowStates)) {
            $workflowStates[] = 'VECNA_SPRAVNOST';
            $updated = true;
            echo "   → Přidán VECNA_SPRAVNOST\n";
        }
        
        if ($updated) {
            // Seřadit stavy
            $workflowOrder = [
                'NOVA', 'ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'ZAMITNUTA', 'SCHVALENA',
                'ROZPRACOVANA', 'ODESLANA', 'ZRUSENA', 'POTVRZENA', 'UVEREJNIT', 'NEUVEREJNIT', 
                'UVEREJNENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA'
            ];
            
            usort($workflowStates, function($a, $b) use ($workflowOrder) {
                $indexA = array_search($a, $workflowOrder);
                $indexB = array_search($b, $workflowOrder);
                $indexA = ($indexA === false) ? 999 : $indexA;
                $indexB = ($indexB === false) ? 999 : $indexB;
                return $indexA - $indexB;
            });
            
            $workflowStates = array_unique($workflowStates);
            $workflowStates = array_values($workflowStates);
            
            $newWorkflowCode = json_encode($workflowStates);
            $newStavObjednavky = getStavObjednavkyFromWorkflow($db, $newWorkflowCode);
            
            echo "   Nové stavy: " . json_encode($workflowStates) . "\n";
            echo "   Nový stav_objednavky: " . $newStavObjednavky . "\n";
        } else {
            echo "   → Žádné změny nejsou potřeba\n";
        }
    } else {
        echo "   → Přeskočeno (platba pokladnou)\n";
    }
    
    echo "\n6. Kontrola faktur v DB...\n";
    $stmt = $db->prepare("SELECT COUNT(*) as pocet FROM " . TBL_FAKTURY . " WHERE objednavka_id = :id AND aktivni = 1");
    $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
    $stmt->execute();
    $faktury = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "   Počet aktivních faktur: " . $faktury['pocet'] . "\n";
    
    echo "\n✅ Test dokončen úspěšně!\n";
    echo "\nPOZNÁMKA: Pro skutečný test přidání faktury použij OrderForm25 nebo API endpoint.\n";
    
} catch (Exception $e) {
    echo "\n❌ CHYBA: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

echo "\n=== KONEC TESTU ===\n\n";
?>
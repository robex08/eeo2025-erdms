<?php
/**
 * Jednoduchý test workflow helper funkcí
 */

// Definovat jen potřebné konstanty
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_CISELNIK_STAVY', '25_ciselnik_stavy');
define('TBL_FAKTURY', '25a_objednavky_faktury');

require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderWorkflowHelpers.php';

echo "\n=== JEDNODUCHÝ TEST WORKFLOW HELPER FUNKCÍ ===\n\n";

try {
    $config = [
        'host' => '10.3.172.11',
        'database' => 'eeo2025-dev',
        'username' => 'erdms_user',
        'password' => 'AhchohTahnoh7eim',
        'charset' => 'utf8mb4'
    ];
    
    $db = get_db($config);
    
    echo "✅ Připojení k databázi: OK\n";
    
    // Test parseWorkflowStates funkcí
    echo "\n1. Test parseWorkflowStates funkce...\n";
    
    $testCases = [
        '["SCHVALENA", "FAKTURACE"]',
        'SCHVALENA',
        'null',
        '',
        '[]',
        '["NOVA", "SCHVALENA", "ODESLANA", "FAKTURACE", "VECNA_SPRAVNOST"]'
    ];
    
    foreach ($testCases as $i => $case) {
        if ($case === 'null') $input = null;
        elseif ($case === '') $input = '';
        else $input = $case;
        
        $result = parseWorkflowStates($input);
        echo "   Test " . ($i+1) . ": '$case' → " . json_encode($result) . "\n";
    }
    
    // Test hasWorkflowState funkce
    echo "\n2. Test hasWorkflowState funkce...\n";
    
    $workflow = '["SCHVALENA", "ODESLANA", "FAKTURACE"]';
    $states = ['SCHVALENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'NOVA'];
    
    echo "   Testovaný workflow: $workflow\n";
    foreach ($states as $state) {
        $result = hasWorkflowState($workflow, $state);
        echo "   Má '$state'? " . ($result ? 'ANO' : 'NE') . "\n";
    }
    
    // Test getStavObjednavkyFromWorkflow funkce
    echo "\n3. Test getStavObjednavkyFromWorkflow funkce...\n";
    
    // Načteme nějaké stavy z číselníku
    $stmt = $db->prepare("SELECT kod_stavu, nazev_stavu FROM " . TBL_CISELNIK_STAVY . " WHERE typ_objektu = 'OBJEDNAVKA' LIMIT 5");
    $stmt->execute();
    $stavy = $stmt->fetchAll();
    
    echo "   Dostupné stavy v číselníku:\n";
    foreach ($stavy as $stav) {
        echo "     {$stav['kod_stavu']} → {$stav['nazev_stavu']}\n";
    }
    
    $testWorkflows = [
        '["SCHVALENA"]',
        '["SCHVALENA", "FAKTURACE"]',
        '["FAKTURACE", "VECNA_SPRAVNOST"]',
        'NOVA'
    ];
    
    foreach ($testWorkflows as $workflow) {
        $result = getStavObjednavkyFromWorkflow($db, $workflow);
        echo "   '$workflow' → '$result'\n";
    }
    
    // Test Order ID 11558
    echo "\n4. Test s reálnou objednávkou ID 11558...\n";
    
    $stmt = $db->prepare("SELECT cislo_objednavky, stav_workflow_kod, stav_objednavky FROM " . TBL_OBJEDNAVKY . " WHERE id = 11558");
    $stmt->execute();
    $order = $stmt->fetch();
    
    if ($order) {
        echo "   Číslo: {$order['cislo_objednavky']}\n";
        echo "   Workflow: {$order['stav_workflow_kod']}\n";
        echo "   Stav: {$order['stav_objednavky']}\n";
        
        $states = parseWorkflowStates($order['stav_workflow_kod']);
        echo "   Parsované stavy: " . json_encode($states) . "\n";
        
        echo "   Má FAKTURACE? " . (hasWorkflowState($order['stav_workflow_kod'], 'FAKTURACE') ? 'ANO' : 'NE') . "\n";
        echo "   Má VECNA_SPRAVNOST? " . (hasWorkflowState($order['stav_workflow_kod'], 'VECNA_SPRAVNOST') ? 'ANO' : 'NE') . "\n";
    } else {
        echo "   Objednávka ID 11558 nenalezena\n";
    }
    
    echo "\n✅ Test dokončen úspěšně!\n";
    
} catch (Exception $e) {
    echo "\n❌ CHYBA: " . $e->getMessage() . "\n";
}

echo "\n=== KONEC TESTU ===\n\n";
?>
<?php
/**
 * orderWorkflowHelpers.php
 *
 * 🎯 WORKFLOW HELPER FUNKCE pro BACKEND
 *
 * Účel:
 * - Jednotná logika pro manipulaci s workflow stavy objednávek
 * - Replikace logiky z OrderForm25.js pro konzistenci mezi FE a BE
 * - Automatické workflow transitions při backend operacích
 *
 * Používá se v:
 * - orderV2InvoiceHandlers.php - pro automatický workflow update po přidání faktury
 * - ostatních backend handlerech dle potřeby
 *
 * @author Senior Developer
 * @date 4. ledna 2026
 */

require_once __DIR__ . '/orderHandlers.php';

/**
 * Parsuje workflow kódy z DB formátu na PHP array
 * 
 * Replika parseWorkflowStates z OrderForm25/hooks/useWorkflowManager.js
 * 
 * @param string|array $workflowCode - JSON string, array nebo null z DB
 * @return array - Array workflow stavů
 */
function parseWorkflowStates($workflowCode) {
    if (empty($workflowCode)) {
        return ['ODESLANA_KE_SCHVALENI'];
    }
    
    if (is_string($workflowCode)) {
        // Pokud je to JSON string, dekóduj
        if (strpos($workflowCode, '[') === 0 || strpos($workflowCode, '{') === 0) {
            try {
                $parsed = json_decode($workflowCode, true);
                if (is_array($parsed) && !empty($parsed)) {
                    return $parsed;
                }
                // Fallback pokud JSON je prázdné pole
                return ['ODESLANA_KE_SCHVALENI'];
            } catch (Exception $e) {
                // Pokud JSON decode selže, použij string jako jediný stav
                return [$workflowCode];
            }
        } else {
            // Obyčejný string - jeden stav
            return [$workflowCode];
        }
    }
    
    // Už je to array
    if (is_array($workflowCode)) {
        return !empty($workflowCode) ? $workflowCode : ['ODESLANA_KE_SCHVALENI'];
    }
    
    // Fallback pro neznámé typy
    return ['ODESLANA_KE_SCHVALENI'];
}

/**
 * Kontroluje zda workflow obsahuje daný stav
 * 
 * Replika hasWorkflowState z OrderForm25/hooks/useWorkflowManager.js
 * 
 * @param string|array $workflowCode - Workflow z DB
 * @param string $state - Hledaný stav
 * @return bool
 */
function hasWorkflowState($workflowCode, $state) {
    $states = parseWorkflowStates($workflowCode);
    return in_array($state, $states);
}

/**
 * Aktualizuje workflow stav objednávky po přidání faktury
 * 
 * Replika logiky z OrderForm25.js řádky 10010-10040:
 * - Přidá FAKTURACE pokud má faktury a ještě tam není
 * - Přidá VECNA_SPRAVNOST automaticky po FAKTURACI
 * - Seřadí stavy podle logického pořadí
 * - Aktualizuje stav_objednavky podle posledního workflow stavu
 * 
 * @param PDO $db - Databázové spojení
 * @param int $orderId - ID objednávky
 * @param bool $isPokladna - Je platba pokladnou? (pokud ano, přeskočí fakturaci)
 * @return bool - Úspěch aktualizace
 */
function updateWorkflowAfterInvoiceAdded($db, $orderId, $isPokladna = false) {
    try {
        // Načíst aktuální objednávku
        $stmt = $db->prepare("SELECT stav_workflow_kod FROM " . get_orders_table_name() . " WHERE id = :id");
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            return false;
        }
        
        // Skip pokud je stornováno (ZRUSENA stav)
        $workflowStates = parseWorkflowStates($order['stav_workflow_kod']);
        if (in_array('ZRUSENA', $workflowStates)) {
            return true; // Není chyba, jen nic neděláme
        }
        
        // LOGIKA Z OrderForm25.js - FAKTURACE workflow update
        // Pouze pokud NENÍ pokladna
        if (!$isPokladna) {
            $updated = false;
            
            // 1. Přidat FAKTURACE pokud ještě není
            if (!in_array('FAKTURACE', $workflowStates)) {
                $workflowStates[] = 'FAKTURACE';
                $updated = true;
                error_log("[WORKFLOW] Přidán stav FAKTURACE pro objednávku ID {$orderId}");
            }
            
            // 2. Automaticky přidat VECNA_SPRAVNOST po FAKTURACI
            if (in_array('FAKTURACE', $workflowStates) && !in_array('VECNA_SPRAVNOST', $workflowStates)) {
                $workflowStates[] = 'VECNA_SPRAVNOST';
                $updated = true;
                error_log("[WORKFLOW] Přidán stav VECNA_SPRAVNOST pro objednávku ID {$orderId}");
            }
            
            if (!$updated) {
                return true; // Nic se nezměnilo, ale není to chyba
            }
        }
        
        // 3. Seřadit stavy podle logického pořadí (replika z OrderForm25.js)
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
        
        // 4. Odstranit duplicity (zachovat pořadí)
        $workflowStates = array_unique($workflowStates);
        $workflowStates = array_values($workflowStates); // Reindex
        
        // 5. Uložit zpět jako JSON
        $newWorkflowCode = json_encode($workflowStates);
        
        // 6. Nastavit stav_objednavky podle posledního workflow stavu
        $newStavObjednavky = getStavObjednavkyFromWorkflow($db, $newWorkflowCode);
        
        // 7. Aktualizovat DB
        $stmt = $db->prepare("UPDATE " . get_orders_table_name() . " 
                              SET stav_workflow_kod = :workflow_kod, stav_objednavky = :stav_objednavky 
                              WHERE id = :id");
        $stmt->bindParam(':workflow_kod', $newWorkflowCode, PDO::PARAM_STR);
        $stmt->bindParam(':stav_objednavky', $newStavObjednavky, PDO::PARAM_STR);
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $result = $stmt->execute();
        
        if ($result) {
            error_log("[WORKFLOW] Aktualizován workflow pro objednávku ID {$orderId}: " . $newWorkflowCode . " → stav: {$newStavObjednavky}");
        }
        
        return $result;
        
    } catch (Exception $e) {
        error_log("[WORKFLOW] Chyba při aktualizaci workflow pro objednávku ID {$orderId}: " . $e->getMessage());
        return false;
    }
}

/**
 * Zkontroluje zda je objednávka placena pokladnou
 * 
 * Replika isPokladna logiky z OrderForm25.js
 * 
 * @param PDO $db - Databázové spojení  
 * @param int $orderId - ID objednávky
 * @return bool - Je platba pokladnou?
 */
function isOrderPaidByPokladna($db, $orderId) {
    try {
        // Načíst způsob platby z objednávky
        $stmt = $db->prepare("SELECT financovani, dodavatel_zpusob_potvrzeni FROM " . get_orders_table_name() . " WHERE id = :id");
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            return false;
        }
        
        // Dekódovat JSON pole
        $financovani = null;
        $dodavatelZpusob = null;
        
        if (!empty($order['financovani'])) {
            $financovani = json_decode($order['financovani'], true);
        }
        
        if (!empty($order['dodavatel_zpusob_potvrzeni'])) {
            $dodavatelZpusob = json_decode($order['dodavatel_zpusob_potvrzeni'], true);
        }
        
        // Logika z OrderForm25.js
        $isPlatbaPokladnaObj = isset($financovani['platba']) && $financovani['platba'] === 'pokladna';
        $isPlatbaPokladnaDodavatel = isset($dodavatelZpusob['platba']) && $dodavatelZpusob['platba'] === 'pokladna';
        
        return $isPlatbaPokladnaObj || $isPlatbaPokladnaDodavatel;
        
    } catch (Exception $e) {
        error_log("[WORKFLOW] Chyba při kontrole pokladny pro objednávku ID {$orderId}: " . $e->getMessage());
        return false;
    }
}

/**
 * Hlavní funkce pro aktualizaci workflow po přidání faktury
 * 
 * Používá se v orderV2InvoiceHandlers.php po úspěšném přidání faktury
 * 
 * @param PDO $db - Databázové spojení
 * @param int $orderId - ID objednávky
 * @return bool - Úspěch aktualizace
 */
function handleInvoiceWorkflowUpdate($db, $orderId) {
    try {
        // Zkontrolovat způsob platby
        $isPokladna = isOrderPaidByPokladna($db, $orderId);
        
        // Aktualizovat workflow
        return updateWorkflowAfterInvoiceAdded($db, $orderId, $isPokladna);
        
    } catch (Exception $e) {
        error_log("[WORKFLOW] Chyba při workflow update po přidání faktury pro objednávku ID {$orderId}: " . $e->getMessage());
        return false;
    }
}

?>
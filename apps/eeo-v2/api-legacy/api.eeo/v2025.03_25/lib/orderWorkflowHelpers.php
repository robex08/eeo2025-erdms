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

/**
 * Aktualizuje workflow stav objednávky po vyplnění údajů o zveřejnění
 * 
 * Logika:
 * - Pokud má workflow UVEREJNIT a jsou vyplněny údaje o zveřejnění (datum, idds)
 * - Přidá UVEREJNENA a FAKTURACE
 * 
 * @param PDO $db - Databázové spojení
 * @param int $orderId - ID objednávky
 * @param array $updateData - Data která se právě ukládají (datum_zverejneni, registr_smluv_id atd.)
 * @return bool - Úspěch aktualizace
 */
function updateWorkflowAfterRegistrFilled($db, $orderId, $updateData = []) {
    try {
        // Načíst aktuální objednávku
        $stmt = $db->prepare("SELECT stav_workflow_kod, datum_zverejneni, registr_smluv_id FROM " . get_orders_table_name() . " WHERE id = :id");
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            return false;
        }
        
        $workflowStates = parseWorkflowStates($order['stav_workflow_kod']);
        
        // Skip pokud workflow neobsahuje UVEREJNIT
        if (!in_array('UVEREJNIT', $workflowStates)) {
            return true; // Není chyba, jen nic neděláme
        }
        
        // Skip pokud už má UVEREJNENA
        if (in_array('UVEREJNENA', $workflowStates)) {
            return true; // Už je ve správném stavu
        }
        
        // Zkontrolovat zda jsou vyplněny údaje o zveřejnění
        $datumZverejneni = isset($updateData['datum_zverejneni']) ? $updateData['datum_zverejneni'] : $order['datum_zverejneni'];
        $registrSmluv = isset($updateData['registr_smluv_id']) ? $updateData['registr_smluv_id'] : $order['registr_smluv_id'];
        
        // Pokud nejsou vyplněny údaje, neděláme nic
        if (empty($datumZverejneni) && empty($registrSmluv)) {
            return true;
        }
        
        // Přidat UVEREJNENA
        $workflowStates[] = 'UVEREJNENA';
        error_log("[WORKFLOW] Přidán stav UVEREJNENA pro objednávku ID {$orderId}");
        
        // Automaticky přidat FAKTURACE po UVEREJNENA
        $workflowStates[] = 'FAKTURACE';
        error_log("[WORKFLOW] Přidán stav FAKTURACE po UVEREJNENA pro objednávku ID {$orderId}");
        
        // Seřadit stavy podle logického pořadí
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
        
        // Odstranit duplicity
        $workflowStates = array_unique($workflowStates);
        $workflowStates = array_values($workflowStates);
        
        // Uložit zpět jako JSON
        $newWorkflowCode = json_encode($workflowStates);
        
        // Nastavit stav_objednavky podle posledního workflow stavu
        $newStavObjednavky = getStavObjednavkyFromWorkflow($db, $newWorkflowCode);
        
        // Aktualizovat DB
        $stmt = $db->prepare("UPDATE " . get_orders_table_name() . " 
                              SET stav_workflow_kod = :workflow_kod, stav_objednavky = :stav_objednavky 
                              WHERE id = :id");
        $stmt->bindParam(':workflow_kod', $newWorkflowCode, PDO::PARAM_STR);
        $stmt->bindParam(':stav_objednavky', $newStavObjednavky, PDO::PARAM_STR);
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $result = $stmt->execute();
        
        if ($result) {
            error_log("[WORKFLOW] Aktualizován workflow po vyplnění registru pro objednávku ID {$orderId}: " . $newWorkflowCode . " → stav: {$newStavObjednavky}");
        }
        
        return $result;
        
    } catch (Exception $e) {
        error_log("[WORKFLOW] Chyba při aktualizaci workflow po vyplnění registru pro objednávku ID {$orderId}: " . $e->getMessage());
        return false;
    }
}

/**
 * Aktualizuje workflow stav objednávky po potvrzení věcné správnosti faktury
 * 
 * Logika:
 * - Pokud je objednávka ve stavu VECNA_SPRAVNOST a faktura byla potvrzena
 * - Zkontroluje, zda všechny faktury objednávky mají potvrzenou věcnou správnost
 * - Pokud ano, přidá ZKONTROLOVANA do workflow
 * 
 * @param PDO $db - Databázové spojení
 * @param int $orderId - ID objednávky
 * @return bool - Úspěch aktualizace
 */
function updateWorkflowAfterVecnaSpravnostApproved($db, $orderId) {
    try {
        // Načíst aktuální objednávku
        $stmt = $db->prepare("SELECT stav_workflow_kod FROM " . get_orders_table_name() . " WHERE id = :id");
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            error_log("🔍 [VECNA-SPRAVNOST-CHECK] Order ID {$orderId} - NOT FOUND");
            return false;
        }
        
        $workflowStates = parseWorkflowStates($order['stav_workflow_kod']);
        error_log("🔍 [VECNA-SPRAVNOST-CHECK] Order ID {$orderId} - Current workflow states: " . json_encode($workflowStates));
        
        // Skip pokud workflow neobsahuje VECNA_SPRAVNOST
        if (!in_array('VECNA_SPRAVNOST', $workflowStates)) {
            error_log("⏭️  [VECNA-SPRAVNOST-CHECK] Order ID {$orderId} - NO VECNA_SPRAVNOST state, skipping");
            return true;
        }
        
        // Skip pokud už má ZKONTROLOVANA
        if (in_array('ZKONTROLOVANA', $workflowStates)) {
            error_log("⏭️  [VECNA-SPRAVNOST-CHECK] Order ID {$orderId} - Already has ZKONTROLOVANA, skipping");
            return true;
        }
        
        // Zkontrolovat, zda VŠECHNY faktury objednávky mají potvrzenou věcnou správnost
        $stmt_invoices = $db->prepare("
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN vecna_spravnost_potvrzeno = 1 THEN 1 ELSE 0 END) as confirmed
            FROM " . TBL_FAKTURY . "
            WHERE objednavka_id = :order_id AND aktivni = 1
        ");
        $stmt_invoices->bindParam(':order_id', $orderId, PDO::PARAM_INT);
        $stmt_invoices->execute();
        $invoice_stats = $stmt_invoices->fetch(PDO::FETCH_ASSOC);
        
        $totalInvoices = (int)$invoice_stats['total'];
        $confirmedInvoices = (int)$invoice_stats['confirmed'];
        
        error_log("🔍 [VECNA-SPRAVNOST-CHECK] Order ID {$orderId} - Invoices: {$confirmedInvoices}/{$totalInvoices} confirmed");
        
        // Pokud nemá žádné faktury nebo ne všechny jsou potvrzeny, neděláme nic
        if ($totalInvoices === 0) {
            error_log("⏭️  [VECNA-SPRAVNOST-CHECK] Order ID {$orderId} - NO invoices");
            return true;
        }
        
        if ($confirmedInvoices < $totalInvoices) {
            error_log("⏭️  [VECNA-SPRAVNOST-CHECK] Order ID {$orderId} - NOT all invoices confirmed ({$confirmedInvoices}/{$totalInvoices})");
            return true;
        }
        
        // Všechny faktury jsou potvrzeny → přidat ZKONTROLOVANA
        $workflowStates[] = 'ZKONTROLOVANA';
        error_log("✅ [VECNA-SPRAVNOST-CHECK] Order ID {$orderId} - ALL {$totalInvoices} invoices confirmed → ADDING ZKONTROLOVANA state");
        
        // Seřadit stavy podle logického pořadí
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
        
        // Odstranit duplicity
        $workflowStates = array_unique($workflowStates);
        $workflowStates = array_values($workflowStates);
        
        // Uložit zpět jako JSON
        $newWorkflowCode = json_encode($workflowStates);
        
        // Nastavit stav_objednavky podle posledního workflow stavu
        $newStavObjednavky = getStavObjednavkyFromWorkflow($db, $newWorkflowCode);
        
        error_log("🔄 [VECNA-SPRAVNOST-UPDATE] Order ID {$orderId} - Updating DB:");
        error_log("   - Old workflow: " . $order['stav_workflow_kod']);
        error_log("   - New workflow: {$newWorkflowCode}");
        error_log("   - New stav_objednavky: {$newStavObjednavky}");
        
        // Aktualizovat DB
        $stmt = $db->prepare("UPDATE " . get_orders_table_name() . " 
                              SET stav_workflow_kod = :workflow_kod, stav_objednavky = :stav_objednavky 
                              WHERE id = :id");
        $stmt->bindParam(':workflow_kod', $newWorkflowCode, PDO::PARAM_STR);
        $stmt->bindParam(':stav_objednavky', $newStavObjednavky, PDO::PARAM_STR);
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $result = $stmt->execute();
        
        if ($result) {
            error_log("✅ [VECNA-SPRAVNOST-SUCCESS] Order ID {$orderId} workflow updated, now has ZKONTROLOVANA");
        } else {
            error_log("❌ [VECNA-SPRAVNOST-ERROR] Order ID {$orderId} - UPDATE FAILED");
        }
        
        return $result;
        
    } catch (Exception $e) {
        error_log("❌ [VECNA-SPRAVNOST-EXCEPTION] Order ID {$orderId} - Exception: " . $e->getMessage());
        return false;
    }
}

/**
 * Odebere ZKONTROLOVANA z workflow a vrátí objednávku na VECNA_SPRAVNOST
 * 
 * Používá se když je věcná správnost faktury zamítnuta nebo resetována
 * a už nejsou všechny faktury potvrzeny.
 * 
 * @param PDO $db - Databázové spojení
 * @param int $orderId - ID objednávky
 * @return bool - Úspěch aktualizace
 */
function removeZkontrolovanaFromWorkflow($db, $orderId) {
    try {
        // Načíst aktuální objednávku včetně completion checkboxu
        $stmt = $db->prepare("SELECT stav_workflow_kod, potvrzeni_dokonceni_objednavky, dokoncil_id, dt_dokonceni
                              FROM " . get_orders_table_name() . " WHERE id = :id");
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            error_log("❌ [REMOVE-ZKONTROLOVANA] Order ID {$orderId} NOT FOUND");
            return false;
        }
        
        $workflowStates = parseWorkflowStates($order['stav_workflow_kod']);
        
        error_log("🔍 [REMOVE-ZKONTROLOVANA] Order ID {$orderId} - Current state:");
        error_log("   - Workflow states: " . json_encode($workflowStates));
        error_log("   - potvrzeni_dokonceni_objednavky: " . ($order["potvrzeni_dokonceni_objednavky"] == 1 ? "CHECKED (1)" : "UNCHECKED (0)"));
        error_log("   - dokoncil_id: " . ($order['dokoncil_id'] ? $order['dokoncil_id'] : "NULL"));
        error_log("   - dt_dokonceni: " . ($order['dt_dokonceni'] ? $order['dt_dokonceni'] : "NULL"));
        
        // ⚠️ KRITICKÉ: Odebrat ZKONTROLOVANA i DOKONCENA
        $workflowStates = array_filter($workflowStates, function($state) {
            return $state !== 'ZKONTROLOVANA' && $state !== 'DOKONCENA';
        });
        $workflowStates = array_values($workflowStates); // Reindex
        
        error_log("🔄 [REMOVE-ZKONTROLOVANA] After removing ZKONTROLOVANA+DOKONCENA: " . json_encode($workflowStates));
        
        // Seřadit stavy podle logického pořadí
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
        
        // Uložit zpět jako JSON
        $newWorkflowCode = json_encode($workflowStates);
        
        // Nastavit stav_objednavky podle posledního workflow stavu
        $newStavObjednavky = getStavObjednavkyFromWorkflow($db, $newWorkflowCode);
        
        error_log("🔄 [REMOVE-ZKONTROLOVANA] Will UPDATE Order ID {$orderId} with:");
        error_log("   - New workflow: {$newWorkflowCode}");
        error_log("   - New stav_objednavky: {$newStavObjednavky}");
        error_log("   - RESET: potvrzeni_dokonceni_objednavky → 0");
        error_log("   - RESET: dokoncil_id → NULL");
        error_log("   - RESET: dt_dokonceni → NULL");
        
        // ⚠️ KRITICKÉ: VŽDY RESETOVAT DOKONČENÍ - BEZ VÝJIMEK
        $stmt = $db->prepare("UPDATE " . get_orders_table_name() . " 
                              SET stav_workflow_kod = :workflow_kod, 
                                  stav_objednavky = :stav_objednavky,
                                  potvrzeni_dokonceni_objednavky = 0,
                                  dokoncil_id = NULL,
                                  dt_dokonceni = NULL
                              WHERE id = :id");
        $stmt->bindParam(':workflow_kod', $newWorkflowCode, PDO::PARAM_STR);
        $stmt->bindParam(':stav_objednavky', $newStavObjednavky, PDO::PARAM_STR);
        $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
        $result = $stmt->execute();
        
        error_log("🔄 [REMOVE-ZKONTROLOVANA] UPDATE executed, rows affected: " . $stmt->rowCount());
        
        if ($result) {
            // Reload from DB to verify
            $reload_stmt = $db->prepare("SELECT stav_workflow_kod, stav_objednavky, potvrzeni_dokonceni_objednavky, dokoncil_id, dt_dokonceni FROM " . get_orders_table_name() . " WHERE id = ?");
            $reload_stmt->execute([$orderId]);
            $reloaded = $reload_stmt->fetch(PDO::FETCH_ASSOC);
            
            error_log("✅ [REMOVE-ZKONTROLOVANA] Order ID {$orderId} state AFTER UPDATE:");
            error_log("   - stav_workflow_kod: " . $reloaded['stav_workflow_kod']);
            error_log("   - stav_objednavky: " . $reloaded['stav_objednavky']);
            error_log("   - potvrzeni_dokonceni_objednavky: " . $reloaded['potvrzeni_dokonceni_objednavky']);
            error_log("   - dokoncil_id: " . ($reloaded['dokoncil_id'] ? $reloaded['dokoncil_id'] : "NULL"));
            error_log("   - dt_dokonceni: " . ($reloaded['dt_dokonceni'] ? $reloaded['dt_dokonceni'] : "NULL"));
            return true;
        } else {
            $errorInfo = $stmt->errorInfo();
            error_log("❌ [REMOVE-ZKONTROLOVANA] Order ID {$orderId} UPDATE FAILED - SQL Error: " . json_encode($errorInfo));
            return false;
        }
        
    } catch (Exception $e) {
        error_log("❌ [REMOVE-ZKONTROLOVANA] Order ID {$orderId} - Exception: " . $e->getMessage());
        return false;
    }
}

?>
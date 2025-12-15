<?php
/**
 * Notification Helpers - PHP 5.6 Compatible
 * 
 * Helper funkce pro notifikační systém
 * Automatické naplňování placeholderů z objednávek
 * 
 * POŽADAVKY: PHP 5.6, MySQL 5.5.43
 */

// Include orderQueries.php pro funkce get_orders_table_name(), get_order_items_table_name(), atd.
require_once __DIR__ . '/orderQueries.php';

// ==========================================
// FORMÁTOVACÍ FUNKCE
// ==========================================

/**
 * Formátuje číslo s mezerami jako oddělovači tisíců
 * @param float|int $number
 * @return string
 */
function formatNumber($number) {
    if ($number === null || $number === '') {
        return '-';
    }
    return number_format((float)$number, 0, ',', ' ');
}

/**
 * Formátuje datum a čas
 * @param string $datetime
 * @return string
 */
function formatDateTime($datetime) {
    if (empty($datetime) || $datetime === '0000-00-00 00:00:00') {
        return '-';
    }
    $dt = new DateTime($datetime);
    return $dt->format('d.m.Y H:i');
}

/**
 * Formátuje pouze datum
 * @param string $datetime
 * @return string
 */
function formatDate($datetime) {
    if (empty($datetime) || $datetime === '0000-00-00 00:00:00' || $datetime === '0000-00-00') {
        return '-';
    }
    $dt = new DateTime($datetime);
    return $dt->format('d.m.Y');
}

/**
 * Formátuje pouze čas
 * @param string $datetime
 * @return string
 */
function formatTime($datetime) {
    if (empty($datetime) || $datetime === '0000-00-00 00:00:00') {
        return '-';
    }
    $dt = new DateTime($datetime);
    return $dt->format('H:i');
}

// ==========================================
// LABEL A IKONY
// ==========================================

/**
 * Vrátí popisný label akce podle typu notifikace
 * @param string $notificationType
 * @return string
 */
function getActionLabel($notificationType) {
    $labels = array(
        'order_status_nova' => 'Vytvořil',
        'order_status_rozpracovana' => 'Rozpracoval',
        'order_status_ke_schvaleni' => 'Odeslal ke schválení',
        'order_status_schvalena' => 'Schválil', // ✅ FÁZE 1 - Template ready
        'order_status_zamitnuta' => 'Zamítl', // ✅ FÁZE 1 - Template ready
        'order_status_ceka_se' => 'Vrátil k doplnění', // ✅ FÁZE 1 - Template ready
        'order_status_odeslana' => 'Odeslal dodavateli',
        'order_status_ceka_potvrzeni' => 'Čeká na potvrzení',
        'order_status_potvrzena' => 'Potvrdil',
        'order_status_registr_ceka' => 'Čeká na registr',
        'order_status_registr_zverejnena' => 'Zveřejnil v registru',
        'order_status_faktura_ceka' => 'Čeká na fakturu',
        'order_status_faktura_pridana' => 'Přidal fakturu',
        'order_status_faktura_schvalena' => 'Schválil fakturu',
        'order_status_faktura_uhrazena' => 'Uhradil fakturu',
        'order_status_kontrola_ceka' => 'Čeká na kontrolu',
        'order_status_kontrola_potvrzena' => 'Potvrdil věcnou správnost',
        'order_status_kontrola_zamitnuta' => 'Zamítl věcnou správnost',
        'order_status_dokoncena' => 'Dokončil',
        'order_status_zrusena' => 'Zrušil',
        'order_status_smazana' => 'Smazal'
    );
    
    return isset($labels[$notificationType]) ? $labels[$notificationType] : 'Provedl akci';
}

/**
 * Vrátí ikonu podle typu notifikace
 * @param string $notificationType
 * @return string
 */
function getActionIcon($notificationType) {
    // Emoji ikony pro notifikace (zobrazitelné v aplikaci i emailu)
    $icons = array(
        'order_status_nova' => '📄',
        'order_status_rozpracovana' => '✏️',
        'order_status_ke_schvaleni' => '⬆️',
        'order_status_schvalena' => '✅', // ✅ FÁZE 1 - 2 varianty (RECIPIENT/SUBMITTER)
        'order_status_zamitnuta' => '❌', // ✅ FÁZE 1 - 2 varianty (RECIPIENT/SUBMITTER)
        'order_status_ceka_se' => '⏸️', // ✅ FÁZE 1 - 2 varianty (RECIPIENT/SUBMITTER)
        'order_status_odeslana' => '📤',
        'order_status_ceka_potvrzeni' => '⏳',
        'order_status_potvrzena' => '✔️',
        'order_status_registr_ceka' => '📋',
        'order_status_registr_zverejnena' => '✅✅',
        'order_status_faktura_ceka' => '💵',
        'order_status_faktura_pridana' => '💲',
        'order_status_faktura_schvalena' => '☑️',
        'order_status_faktura_uhrazena' => '💳',
        'order_status_kontrola_ceka' => '🔍',
        'order_status_kontrola_potvrzena' => '✅',
        'order_status_kontrola_zamitnuta' => '🚫',
        'order_status_dokoncena' => '🏆',
        'order_status_zrusena' => '⊖',
        'order_status_smazana' => '🗑️'
    );
    
    return isset($icons[$notificationType]) ? $icons[$notificationType] : '🔔';
}

/**
 * Vrátí ikonu podle priority
 * @param string $priority
 * @return string
 */
function getPriorityIcon($priority) {
    $icons = array(
        'urgent' => '🔴',
        'high' => '🟠',
        'normal' => '🟢',
        'low' => '⚪'
    );
    
    return isset($icons[$priority]) ? $icons[$priority] : '🟢';
}

// ==========================================
// WORKFLOW A STAVY
// ==========================================

/**
 * Vrátí název stavu workflow
 * @param string $state
 * @return string
 */
function getWorkflowStateName($state) {
    $states = array(
        'nova' => 'Nová',
        'rozpracovana' => 'Rozpracovaná',
        'ke_schvaleni' => 'Ke schválení',
        'schvalena' => 'Schválená',
        'zamitnuta' => 'Zamítnutá',
        'ceka_se' => 'Čeká se',
        'odeslana' => 'Odeslaná',
        'ceka_potvrzeni' => 'Čeká na potvrzení',
        'potvrzena' => 'Potvrzená',
        'registr_ceka' => 'Čeká na registr',
        'registr_zverejnena' => 'Zveřejněná v registru',
        'fakturace' => 'Fakturace',
        'kontrola' => 'Věcná kontrola',
        'dokoncena' => 'Dokončená',
        'zrusena' => 'Zrušená',
        'smazana' => 'Smazaná'
    );
    
    return isset($states[$state]) ? $states[$state] : $state;
}

/**
 * Vrátí název stavu faktury
 * @param string $status
 * @return string
 */
function getInvoiceStatusName($status) {
    $statuses = array(
        'nova' => 'Nová',
        'schvalena' => 'Schválená',
        'uhrazena' => 'Uhrazená',
        'zamitnuta' => 'Zamítnutá'
    );
    
    return isset($statuses[$status]) ? $statuses[$status] : $status;
}

// ==========================================
// PLACEHOLDER FUNKCE
// ==========================================

/**
 * Nahradí placeholdery v textu
 * @param string $text
 * @param array $data
 * @return string
 */
function notif_replacePlaceholders($text, $data) {
    if (empty($text)) {
        return $text;
    }
    
    // I když je $data prázdné, stejně nahraď placeholdery pomlčkou
    if (!empty($data)) {
        foreach ($data as $key => $value) {
            // XSS prevence pro stringové hodnoty
            if (is_string($value)) {
                $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
            }
            $text = str_replace('{' . $key . '}', $value, $text);
        }
    }
    
    // Odstranit nenaplněné placeholdery (nahradit pomlčkou)
    $text = preg_replace('/\{[a-z_]+\}/', '-', $text);
    
    return $text;
}

/**
 * Generuje stručný přehled položek
 * @param array $items
 * @param int $maxLines
 * @return string
 */
function generateItemsSummary($items, $maxLines = 3) {
    if (empty($items)) {
        return 'Žádné položky';
    }
    
    $summary = array();
    $count = 0;
    
    foreach ($items as $item) {
        if ($count >= $maxLines) {
            $remaining = count($items) - $count;
            $summary[] = "... a další " . $remaining . " položky";
            break;
        }
        
        $nazev = isset($item['nazev']) ? $item['nazev'] : (isset($item['name']) ? $item['name'] : 'Položka');
        $mnozstvi = isset($item['mnozstvi']) ? $item['mnozstvi'] : (isset($item['quantity']) ? $item['quantity'] : 1);
        $jednotka = isset($item['jednotka']) ? $item['jednotka'] : (isset($item['unit']) ? $item['unit'] : 'ks');
        
        $summary[] = $mnozstvi . ' ' . $jednotka . ' - ' . $nazev;
        $count++;
    }
    
    return implode("\n", $summary);
}

// ==========================================
// HLAVNÍ FUNKCE PRO NAČTENÍ DAT
// ==========================================

/**
 * Načte kompletní data objednávky a připraví placeholder data
 * @param PDO $db
 * @param int $orderId
 * @param int $actionUserId
 * @param array $additionalData
 * @return array
 */
function getOrderPlaceholderData($db, $orderId, $actionUserId = null, $additionalData = array()) {
    try {
        // Načtení názvů tabulek pomocí helper funkcí (stejně jako Order V2)
        $ordersTable = get_orders_table_name();
        $usersTable = get_users_table_name();
        
        // Načtení základních dat objednávky přes standardní SQL (Order V2 struktura)
        // Poznámka: 25a_objednavky + 25_uzivatele (jmeno + prijmeni jako samostatné sloupce)
        $sql = "SELECT o.*,
                       CONCAT(COALESCE(objednatel.titul_pred, ''), ' ', COALESCE(objednatel.jmeno, ''), ' ', COALESCE(objednatel.prijmeni, ''), ' ', COALESCE(objednatel.titul_za, '')) as objednatel_full_name,
                       CONCAT(COALESCE(garant.titul_pred, ''), ' ', COALESCE(garant.jmeno, ''), ' ', COALESCE(garant.prijmeni, ''), ' ', COALESCE(garant.titul_za, '')) as garant_full_name,
                       CONCAT(COALESCE(prikazce.titul_pred, ''), ' ', COALESCE(prikazce.jmeno, ''), ' ', COALESCE(prikazce.prijmeni, ''), ' ', COALESCE(prikazce.titul_za, '')) as prikazce_full_name,
                       CONCAT(COALESCE(schvalovatel.titul_pred, ''), ' ', COALESCE(schvalovatel.jmeno, ''), ' ', COALESCE(schvalovatel.prijmeni, ''), ' ', COALESCE(schvalovatel.titul_za, '')) as schvalovatel_full_name
                FROM {$ordersTable} o
                LEFT JOIN {$usersTable} objednatel ON o.objednatel_id = objednatel.id
                LEFT JOIN {$usersTable} garant ON o.garant_uzivatel_id = garant.id
                LEFT JOIN {$usersTable} prikazce ON o.prikazce_id = prikazce.id
                LEFT JOIN {$usersTable} schvalovatel ON o.schvalovatel_id = schvalovatel.id
                WHERE o.id = :order_id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array(':order_id' => $orderId));
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            error_log("[NotificationHelpers] Order not found: $orderId in table: $ordersTable");
            return array('error' => 'Objednávka nenalezena (ID: ' . $orderId . ')');
        }
        
        // DEBUG: Log všechny klíče které jsme dostali z DB
        error_log("[NotificationHelpers] Order found with " . count($order) . " columns");
        error_log("[NotificationHelpers] Available columns: " . implode(', ', array_keys($order)));
        error_log("[NotificationHelpers] Sample data - cislo_objednavky: " . (isset($order['cislo_objednavky']) ? $order['cislo_objednavky'] : 'NOT_SET') . 
                  ", predmet: " . (isset($order['predmet']) ? substr($order['predmet'], 0, 30) : 'NOT_SET') .
                  ", objednatel_id: " . (isset($order['objednatel_id']) ? $order['objednatel_id'] : 'NOT_SET') .
                  ", objednatel_full_name: " . (isset($order['objednatel_full_name']) ? $order['objednatel_full_name'] : 'NOT_SET') .
                  ", max_cena_s_dph: " . (isset($order['max_cena_s_dph']) ? $order['max_cena_s_dph'] : 'NOT_SET'));
        
        // Načtení položek objednávky (25a_objednavky_polozky)
        $itemsTable = get_order_items_table_name();
        $itemsSql = "SELECT * FROM {$itemsTable} WHERE objednavka_id = :order_id ORDER BY id ASC";
        $itemsStmt = $db->prepare($itemsSql);
        $itemsStmt->execute(array(':order_id' => $orderId));
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Spočítání celkové ceny položek
        $itemsTotalNoDph = 0;
        $itemsTotalWithDph = 0;
        foreach ($items as $item) {
            $itemsTotalNoDph += isset($item['cena_celkem_bez_dph']) ? (float)$item['cena_celkem_bez_dph'] : 0;
            $itemsTotalWithDph += isset($item['cena_celkem_s_dph']) ? (float)$item['cena_celkem_s_dph'] : 0;
        }
        
        // Načtení dat uživatele, který provedl akci
        $actionUserData = array(
            'action_performed_by' => '-',
            'action_performed_by_id' => null
        );
        
        if ($actionUserId) {
            $userSql = "SELECT CONCAT(COALESCE(titul_pred, ''), ' ', COALESCE(jmeno, ''), ' ', COALESCE(prijmeni, ''), ' ', COALESCE(titul_za, '')) as full_name 
                        FROM {$usersTable} 
                        WHERE id = :user_id";
            $userStmt = $db->prepare($userSql);
            $userStmt->execute(array(':user_id' => $actionUserId));
            $actionUser = $userStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($actionUser) {
                $actionUserData['action_performed_by'] = trim($actionUser['full_name']);
                $actionUserData['action_performed_by_id'] = $actionUserId;
            }
        }
        
        // Načtení faktur (25a_objednavky_faktury)
        $invoicesTable = get_invoices_table_name();
        $invoicesSql = "SELECT * FROM {$invoicesTable} WHERE objednavka_id = :order_id ORDER BY dt_vytvoreni DESC";
        $invoicesStmt = $db->prepare($invoicesSql);
        $invoicesStmt->execute(array(':order_id' => $orderId));
        $invoices = $invoicesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $invoiceData = array(
            'invoices_count' => count($invoices),
            'invoice_number' => '-',
            'invoice_amount' => '-',
            'invoice_date' => '-',
            'invoice_due_date' => '-',
            'invoice_paid_date' => '-',
            'invoice_status' => '-'
        );
        
        // Pokud existuje faktura, použijeme první (poslední přidanou)
        // Poznámka: Tabulka 25a_objednavky_faktury používá prefixy fa_*
        if (!empty($invoices)) {
            $invoice = $invoices[0];
            $invoiceData['invoice_number'] = isset($invoice['fa_cislo_vema']) ? $invoice['fa_cislo_vema'] : '-';
            $invoiceData['invoice_amount'] = formatNumber(isset($invoice['fa_castka']) ? $invoice['fa_castka'] : 0);
            $invoiceData['invoice_date'] = formatDate(isset($invoice['fa_datum_vystaveni']) ? $invoice['fa_datum_vystaveni'] : null);
            $invoiceData['invoice_due_date'] = formatDate(isset($invoice['fa_datum_splatnosti']) ? $invoice['fa_datum_splatnosti'] : null);
            $invoiceData['invoice_paid_date'] = formatDate(isset($invoice['fa_datum_uhrazeni']) ? $invoice['fa_datum_uhrazeni'] : null);
            $invoiceData['invoice_status'] = getInvoiceStatusName(isset($invoice['fa_stav']) ? $invoice['fa_stav'] : 'nova');
        }
        
        // Příprava placeholder dat
        // DŮLEŽITÉ: Mapování DB sloupců na placeholdery
        // Tabulka 25a_objednavky: cislo_objednavky, predmet, objednatel_id, garant_uzivatel_id, prikazce_id, max_cena_s_dph
        $placeholderData = array(
            // ZÁKLADNÍ
            'order_number' => isset($order['cislo_objednavky']) ? $order['cislo_objednavky'] : '-',
            'order_id' => $orderId,
            'order_subject' => isset($order['predmet']) ? $order['predmet'] : '-',
            'order_name' => isset($order['predmet']) ? $order['predmet'] : '-',    // Alias pro order_subject
            'order_description' => isset($order['poznamka']) ? $order['poznamka'] : '-',
            'max_price' => formatNumber(isset($order['max_cena_s_dph']) ? $order['max_cena_s_dph'] : 0),
            'max_price_with_dph' => formatNumber(isset($order['max_cena_s_dph']) ? $order['max_cena_s_dph'] : 0),
            'workflow_state' => getWorkflowStateName(isset($order['stav_objednavky']) ? $order['stav_objednavky'] : 'nova'),
            'workflow_phase' => isset($order['stav_workflow_kod']) ? $order['stav_workflow_kod'] : '-',
            
            // OSOBY
            'creator_name' => isset($order['objednatel_full_name']) ? $order['objednatel_full_name'] : '-',
            'creator_id' => isset($order['objednatel_id']) ? $order['objednatel_id'] : null,
            'garant_name' => isset($order['garant_full_name']) ? $order['garant_full_name'] : '-',
            'garant_id' => isset($order['garant_uzivatel_id']) ? $order['garant_uzivatel_id'] : null,
            'prikazce_name' => isset($order['prikazce_full_name']) ? $order['prikazce_full_name'] : '-',
            'prikazce_id' => isset($order['prikazce_id']) ? $order['prikazce_id'] : null,
            'supplier_name' => isset($order['dodavatel_nazev']) ? $order['dodavatel_nazev'] : '-',
            'supplier_ic' => isset($order['dodavatel_ico']) ? $order['dodavatel_ico'] : '-',
            'supplier_contact' => isset($order['dodavatel_kontakt_jmeno']) ? $order['dodavatel_kontakt_jmeno'] : '-',
            
            // AKCE
            'action_performed_by' => $actionUserData['action_performed_by'],
            'action_performed_by_id' => $actionUserData['action_performed_by_id'],
            'action_date' => formatDateTime(date('Y-m-d H:i:s')),
            'action_date_short' => formatDate(date('Y-m-d')),
            'action_time' => formatTime(date('Y-m-d H:i:s')),
            'creation_date' => formatDateTime(isset($order['dt_vytvoreni']) ? $order['dt_vytvoreni'] : null),
            
            // SCHVALOVÁNÍ
            'approver_name' => isset($order['schvalovatel_full_name']) ? $order['schvalovatel_full_name'] : '-',
            'approver_id' => isset($order['schvalovatel_id']) ? $order['schvalovatel_id'] : null,
            'approval_date' => formatDate(isset($order['dt_schvaleni']) ? $order['dt_schvaleni'] : null),
            'rejection_reason' => isset($additionalData['rejection_reason']) ? $additionalData['rejection_reason'] : '-',
            'cancellation_reason' => isset($additionalData['cancellation_reason']) ? $additionalData['cancellation_reason'] : '-',
            
            // POLOŽKY
            'items_count' => count($items),
            'items_total_bez_dph' => formatNumber($itemsTotalNoDph),
            'items_total_s_dph' => formatNumber($itemsTotalWithDph),
            'items_summary' => generateItemsSummary($items, 3),
            
            // ODKAZY
            'app_link' => 'https://eeo.domain.cz/orders/' . $orderId,
            'app_link_edit' => 'https://eeo.domain.cz/orders/' . $orderId . '/edit',
            'app_link_approve' => 'https://eeo.domain.cz/orders/' . $orderId . '/approve',
            
            // REGISTR SMLUV
            'registr_iddt' => isset($order['registr_iddt']) ? $order['registr_iddt'] : '-',
            'dt_zverejneni' => formatDate(isset($order['dt_zverejneni']) ? $order['dt_zverejneni'] : null),
            'ma_byt_zverejnena' => (isset($order['zverejnit']) && $order['zverejnit'] == 1) ? 'Ano' : 'Ne',
            
            // FAKTURACE
            'invoices_count' => $invoiceData['invoices_count'],
            'invoice_number' => $invoiceData['invoice_number'],
            'invoice_amount' => $invoiceData['invoice_amount'],
            'invoice_date' => $invoiceData['invoice_date'],
            'invoice_due_date' => $invoiceData['invoice_due_date'],
            'invoice_paid_date' => $invoiceData['invoice_paid_date'],
            'invoice_status' => $invoiceData['invoice_status'],
            
            // VĚCNÁ SPRÁVNOST
            'asset_location' => isset($order['vecna_spravnost_umisteni_majetku']) ? $order['vecna_spravnost_umisteni_majetku'] : '-',
            'vecna_spravnost_poznamka' => isset($order['vecna_spravnost_poznamka']) ? $order['vecna_spravnost_poznamka'] : '-',
            'kontroloval_name' => '-',
            'dt_potvrzeni_vecne_spravnosti' => formatDate(isset($order['dt_potvrzeni_vecne_spravnosti']) ? $order['dt_potvrzeni_vecne_spravnosti'] : null)
        );
        
        // Načtení kontrolora věcné správnosti
        if (isset($order['potvrdil_vecnou_spravnost_id']) && $order['potvrdil_vecnou_spravnost_id']) {
            $kontrolorSql = "SELECT CONCAT(COALESCE(titul_pred, ''), ' ', COALESCE(jmeno, ''), ' ', COALESCE(prijmeni, ''), ' ', COALESCE(titul_za, '')) as full_name 
                             FROM {$usersTable} 
                             WHERE id = :user_id";
            $kontrolorStmt = $db->prepare($kontrolorSql);
            $kontrolorStmt->execute(array(':user_id' => $order['potvrdil_vecnou_spravnost_id']));
            $kontrolor = $kontrolorStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($kontrolor) {
                $placeholderData['kontroloval_name'] = trim($kontrolor['full_name']);
            }
        }
        
        // Přidání dodatečných dat z parametru
        if (!empty($additionalData)) {
            foreach ($additionalData as $key => $value) {
                $placeholderData[$key] = $value;
            }
        }
        
        // DEBUG: Log finální placeholder data
        error_log("[NotificationHelpers] Placeholder data prepared with " . count($placeholderData) . " keys");
        error_log("[NotificationHelpers] order_number=" . $placeholderData['order_number'] . 
                  ", order_subject=" . substr($placeholderData['order_subject'], 0, 30) .
                  ", max_price=" . $placeholderData['max_price'] .
                  ", creator_name=" . $placeholderData['creator_name']);
        
        return $placeholderData;
        
    } catch (Exception $e) {
        error_log("[NotificationHelpers] Error in getOrderPlaceholderData: " . $e->getMessage());
        return array('error' => 'Chyba při načítání dat objednávky: ' . $e->getMessage());
    }
}

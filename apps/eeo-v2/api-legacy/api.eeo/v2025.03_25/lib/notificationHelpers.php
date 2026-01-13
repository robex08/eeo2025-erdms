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
/**
 * Formátuje datum a čas pro notifikace (používá Czech timezone)
 * @param string $datetime
 * @return string
 */
function formatDateTime($datetime) {
    if (empty($datetime) || $datetime === '0000-00-00 00:00:00') {
        return '-';
    }
    // ✅ Použij TimezoneHelper pro konzistentní timezone
    $original_timezone = date_default_timezone_get();
    date_default_timezone_set('Europe/Prague');
    
    $dt = new DateTime($datetime);
    $formatted = $dt->format('d.m.Y H:i');
    
    date_default_timezone_set($original_timezone);
    return $formatted;
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
    $original_timezone = date_default_timezone_get();
    date_default_timezone_set('Europe/Prague');
    
    $dt = new DateTime($datetime);
    $formatted = $dt->format('d.m.Y');
    
    date_default_timezone_set($original_timezone);
    return $formatted;
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
    $original_timezone = date_default_timezone_get();
    date_default_timezone_set('Europe/Prague');
    
    $dt = new DateTime($datetime);
    $formatted = $dt->format('H:i');
    
    date_default_timezone_set($original_timezone);
    return $formatted;
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
        'ORDER_CREATED' => 'Vytvořil',
        'ORDER_DRAFT' => 'Rozpracoval',
        'ORDER_PENDING_APPROVAL' => 'Odeslal ke schválení',
        'ORDER_APPROVED' => 'Schválil', // ✅ FÁZE 1 - Template ready
        'ORDER_REJECTED' => 'Zamítl', // ✅ FÁZE 1 - Template ready
        'ORDER_AWAITING_CHANGES' => 'Vrátil k doplnění', // ✅ FÁZE 1 - Template ready
        'ORDER_SENT_TO_SUPPLIER' => 'Odeslal dodavateli',
        'ORDER_AWAITING_CONFIRMATION' => 'Čeká na potvrzení',
        'ORDER_CONFIRMED_BY_SUPPLIER' => 'Potvrdil',
        'ORDER_REGISTRY_PENDING' => 'Čeká na registr',
        'ORDER_REGISTRY_PUBLISHED' => 'Zveřejnil v registru',
        'ORDER_INVOICE_PENDING' => 'Čeká na fakturu',
        'ORDER_INVOICE_ADDED' => 'Přidal fakturu',
        'ORDER_INVOICE_APPROVED' => 'Schválil fakturu',
        'ORDER_INVOICE_PAID' => 'Uhradil fakturu',
        'ORDER_VERIFICATION_PENDING' => 'Čeká na kontrolu',
        'ORDER_VERIFICATION_APPROVED' => 'Potvrdil věcnou správnost',
        'ORDER_VERIFICATION_REJECTED' => 'Zamítl věcnou správnost',
        'ORDER_COMPLETED' => 'Dokončil',
        'ORDER_CANCELLED' => 'Zrušil',
        'ORDER_DELETED' => 'Smazal'
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
        'ORDER_CREATED' => '📄',
        'ORDER_DRAFT' => '✏️',
        'ORDER_PENDING_APPROVAL' => '⬆️',
        'ORDER_APPROVED' => '✅', // ✅ FÁZE 1 - 2 varianty (RECIPIENT/SUBMITTER)
        'ORDER_REJECTED' => '❌', // ✅ FÁZE 1 - 2 varianty (RECIPIENT/SUBMITTER)
        'ORDER_AWAITING_CHANGES' => '⏸️', // ✅ FÁZE 1 - 2 varianty (RECIPIENT/SUBMITTER)
        'ORDER_SENT_TO_SUPPLIER' => '📤',
        'ORDER_AWAITING_CONFIRMATION' => '⏳',
        'ORDER_CONFIRMED_BY_SUPPLIER' => '✔️',
        'ORDER_REGISTRY_PENDING' => '📋',
        'ORDER_REGISTRY_PUBLISHED' => '✅✅',
        'ORDER_INVOICE_PENDING' => '💵',
        'ORDER_INVOICE_ADDED' => '💲',
        'ORDER_INVOICE_APPROVED' => '☑️',
        'ORDER_INVOICE_PAID' => '💳',
        'ORDER_VERIFICATION_PENDING' => '🔍',
        'ORDER_VERIFICATION_APPROVED' => '✅',
        'ORDER_VERIFICATION_REJECTED' => '🚫',
        'ORDER_COMPLETED' => '🏆',
        'ORDER_CANCELLED' => '⊖',
        'ORDER_DELETED' => '🗑️'
    );
    
    return isset($icons[$notificationType]) ? $icons[$notificationType] : '🔔';
}

/**
 * Vrátí ikonu podle priorita
 * @param string $priorita
 * @return string
 */
function getPriorityIcon($priorita) {
    $icons = array(
        'INFO' => 'ℹ️',           // zelená ikona I
        'APPROVAL' => 'ℹ️',       // zelená ikona I
        'WARNING' => '⚠️',        // oranžová ikona výkřičník
        'normal' => '⚠️',         // oranžová ikona výkřičník
        'URGENT' => '🚨',         // červená ikona alarm
        'high' => '🚨',           // červená ikona alarm
        'urgent' => '🚨',         // červená ikona alarm
        'EXCEPTIONAL' => '🚨',    // červená ikona alarm
        'low' => '🟢'            // zelená
    );
    
    return isset($icons[$priorita]) ? $icons[$priorita] : 'ℹ️';
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
    // ✅ OPRAVA: Přidána podpora pro číslice (order_id, invoice_id, atd.)
    $text = preg_replace('/\{[a-z0-9_]+\}/', '-', $text);
    
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
        
        $nazev = isset($item['nazev']) ? $item['nazev'] : (isset($item['nazev']) ? $item['nazev'] : 'Položka');
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
function getOrderPlaceholderData($db, $orderId, $actionUserId = null, $additionalData = array(), $invoiceId = null) {
    try {
        // Načtení názvů tabulek pomocí helper funkcí (stejně jako Order V2)
        $ordersTable = get_orders_table_name();
        $usersTable = get_users_table_name();
        
        error_log("[NotificationHelpers] Loading data for order: $orderId" . ($invoiceId ? ", invoice: $invoiceId" : ""));
        
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
        
        // ✅ NOVÉ: Načtení dat faktury (pokud je zadané invoice_id)
        $invoiceData = array();
        if ($invoiceId) {
            error_log("[NotificationHelpers] Loading invoice data for ID: $invoiceId");
            $fakturyTable = get_invoices_table_name();
            $invoiceSql = "SELECT f.*,
                                  CONCAT(COALESCE(potvrdil.titul_pred, ''), ' ', COALESCE(potvrdil.jmeno, ''), ' ', COALESCE(potvrdil.prijmeni, ''), ' ', COALESCE(potvrdil.titul_za, '')) as potvrdil_full_name
                           FROM {$fakturyTable} f
                           LEFT JOIN {$usersTable} potvrdil ON f.potvrdil_vecnou_spravnost_id = potvrdil.id
                           WHERE f.fa_id = :invoice_id";
            $invoiceStmt = $db->prepare($invoiceSql);
            $invoiceStmt->execute(array(':invoice_id' => $invoiceId));
            $invoiceData = $invoiceStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($invoiceData) {
                error_log("[NotificationHelpers] ✅ Invoice loaded: " . $invoiceData['fa_cislo'] . ", potvrdil: " . ($invoiceData['potvrdil_full_name'] ?: 'NULL'));
            } else {
                error_log("[NotificationHelpers] ⚠️ Invoice not found for ID: $invoiceId");
            }
        }
        
        // Načtení dat uživatele, který provedl akci
        $actionUserData = array(
            'action_performed_by' => '-',
            'action_performed_by_id' => null
        );
        
        if ($actionUserId) {
            $userSql = "SELECT CONCAT(COALESCE(titul_pred, ''), ' ', COALESCE(jmeno, ''), ' ', COALESCE(prijmeni, ''), ' ', COALESCE(titul_za, '')) as full_name 
                        FROM {$usersTable} 
                        WHERE id = :uzivatel_id";
            $userStmt = $db->prepare($userSql);
            $userStmt->execute(array(':uzivatel_id' => $actionUserId));
            $actionUser = $userStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($actionUser) {
                $actionUserData['action_performed_by'] = trim($actionUser['full_name']);
                $actionUserData['action_performed_by_id'] = $actionUserId;
            }
        }
        
        // Načtení faktur (25a_objednavky_faktury)
        $invoicesTable = get_invoices_table_name();
        $invoicesSql = "SELECT * FROM {$invoicesTable} WHERE obj_id = :order_id ORDER BY dt_vytvoreni DESC";
        $invoicesStmt = $db->prepare($invoicesSql);
        $invoicesStmt->execute(array(':order_id' => $orderId));
        $invoices = $invoicesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $invoicePlaceholders = array(
            'invoices_count' => count($invoices),
            'invoice_number' => '-',
            'invoice_amount' => '-',
            'invoice_date' => '-',
            'invoice_due_date' => '-',
            'invoice_paid_date' => '-',
            'invoice_status' => '-',
            'vecna_spravnost_kontroloval' => '-',
            'vecna_spravnost_datum_potvrzeni' => '-'
        );
        
        // ✅ PRIORITA: Pokud je zadané konkrétní invoiceId (z načtených dat výše), použij tu fakturu
        $invoice_to_use = null;
        if ($invoiceData && isset($invoiceData['fa_id'])) {
            // Máme konkrétní fakturu načtenou pomocí invoiceId
            $invoice_to_use = $invoiceData;
            error_log("[NotificationHelpers] Using specific invoice: " . $invoiceData['fa_cislo']);
        } elseif (!empty($invoices)) {
            // Jinak použijeme první (nejnovější) fakturu
            $invoice_to_use = $invoices[0];
            error_log("[NotificationHelpers] Using first invoice from list");
        }
        
        // Naplň placeholdery z vybrané faktury
        if ($invoice_to_use) {
            $invoicePlaceholders['invoice_number'] = isset($invoice_to_use['fa_cislo']) ? $invoice_to_use['fa_cislo'] : '-';
            $invoicePlaceholders['invoice_amount'] = formatNumber(isset($invoice_to_use['fa_castka_celkem']) ? $invoice_to_use['fa_castka_celkem'] : 0);
            $invoicePlaceholders['invoice_date'] = formatDate(isset($invoice_to_use['fa_datum_vystaveni']) ? $invoice_to_use['fa_datum_vystaveni'] : null);
            $invoicePlaceholders['invoice_due_date'] = formatDate(isset($invoice_to_use['fa_datum_splatnosti']) ? $invoice_to_use['fa_datum_splatnosti'] : null);
            $invoicePlaceholders['invoice_paid_date'] = formatDate(isset($invoice_to_use['fa_datum_uhrazeni']) ? $invoice_to_use['fa_datum_uhrazeni'] : null);
            $invoicePlaceholders['invoice_status'] = 'Vystavena'; // TODO: getInvoiceStatusName()
            
            // ✅ VĚCNÁ SPRÁVNOST z konkrétní faktury
            if (isset($invoice_to_use['potvrdil_full_name']) && $invoice_to_use['potvrdil_full_name']) {
                $invoicePlaceholders['vecna_spravnost_kontroloval'] = trim($invoice_to_use['potvrdil_full_name']);
            }
            if (isset($invoice_to_use['dt_potvrzeni_vecne_spravnosti']) && $invoice_to_use['dt_potvrzeni_vecne_spravnosti']) {
                $invoicePlaceholders['vecna_spravnost_datum_potvrzeni'] = formatDateTime($invoice_to_use['dt_potvrzeni_vecne_spravnosti']);
            }
            
            error_log("[NotificationHelpers] Invoice placeholders: number=" . $invoicePlaceholders['invoice_number'] . 
                      ", amount=" . $invoicePlaceholders['invoice_amount'] .
                      ", potvrdil=" . $invoicePlaceholders['vecna_spravnost_kontroloval'] .
                      ", datum=" . $invoicePlaceholders['vecna_spravnost_datum_potvrzeni']);
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
            'trigger_user_name' => $actionUserData['action_performed_by'], // Alias pro trigger uživatele
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
            'invoices_count' => $invoicePlaceholders['invoices_count'],
            'invoice_number' => $invoicePlaceholders['invoice_number'],
            'invoice_amount' => $invoicePlaceholders['invoice_amount'],
            'invoice_date' => $invoicePlaceholders['invoice_date'],
            'invoice_due_date' => $invoicePlaceholders['invoice_due_date'],
            'invoice_paid_date' => $invoicePlaceholders['invoice_paid_date'],
            'invoice_status' => $invoicePlaceholders['invoice_status'],
            
            // VĚCNÁ SPRÁVNOST (z faktury pokud je načtená, jinak z objednávky)
            'asset_location' => isset($order['vecna_spravnost_umisteni_majetku']) ? $order['vecna_spravnost_umisteni_majetku'] : '-',
            'vecna_spravnost_poznamka' => isset($order['vecna_spravnost_poznamka']) ? $order['vecna_spravnost_poznamka'] : '-',
            'kontroloval_name' => $invoicePlaceholders['vecna_spravnost_kontroloval'],
            'vecna_spravnost_kontroloval' => $invoicePlaceholders['vecna_spravnost_kontroloval'],  // Alias
            'potvrdil_name' => $invoicePlaceholders['vecna_spravnost_kontroloval'],  // Alias pro šablonu
            'vecna_spravnost_datum_potvrzeni' => $invoicePlaceholders['vecna_spravnost_datum_potvrzeni'],
            'dt_potvrzeni_vecne_spravnosti' => $invoicePlaceholders['vecna_spravnost_datum_potvrzeni']  // Alias
        );
        
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

/**
 * Triggeruje notifikaci pro objednávku
 * 
 * @param string $notification_type Typ notifikace (INVOICE_MATERIAL_CHECK_REQUESTED, etc.)
 * @param int $order_id ID objednávky
 * @param int $action_user_id ID uživatele který spustil akci
 * @param array $custom_placeholders Další data pro placeholdery
 * @return array ['success' => bool, 'error' => string]
 */
function triggerOrderNotification($notification_type, $order_id, $action_user_id, $custom_placeholders = array()) {
    try {
        // Získej databázové připojení
        global $config;
        if (!isset($config)) {
            // Fallback - načti config
            require_once __DIR__ . '/../config.php';
        }
        $db = get_db($config);
        
        // Načti data objednávky pro placeholdery
        $order_data = getOrderPlaceholderData($db, $order_id);
        if (isset($order_data['error'])) {
            return array('success' => false, 'error' => $order_data['error']);
        }
        
        // Slouč s custom placeholders
        $placeholders = array_merge($order_data, $custom_placeholders);
        
        // Připrav input pro notifications/create API
        $notification_input = array(
            'typ' => $notification_type,
            'order_id' => $order_id,
            'action_user_id' => $action_user_id,
            'custom_placeholders' => $placeholders,
            'send_email' => true,
            'send_push' => false
        );
        
        // Simuluj token data (pro interní volání)
        // Získej username podle action_user_id
        $stmt = $db->prepare("SELECT jmeno, prijmeni FROM " . TBL_UZIVATELE . " WHERE id = ? LIMIT 1");
        $stmt->execute(array($action_user_id));
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return array('success' => false, 'error' => "Uživatel s ID $action_user_id neexistuje");
        }
        
        // Přidej username a token placeholder (pro interní volání použijeme jméno)
        $notification_input['username'] = trim($user['jmeno'] . ' ' . $user['prijmeni']);
        $notification_input['token'] = 'internal_call'; // Pro interní volání
        
        // Zavolej notifications/create handler
        require_once __DIR__ . '/notificationHandlers.php';
        
        // Zachyť output
        ob_start();
        handle_notifications_create($notification_input, $config, array());
        $output = ob_get_clean();
        
        // Parse JSON response
        $response = json_decode($output, true);
        
        if ($response && isset($response['status']) && $response['status'] === 'ok') {
            error_log("[NotificationHelpers] Successfully triggered notification: $notification_type for order: $order_id");
            return array('success' => true, 'notification_id' => $response['notification_id'] ?? null);
        } else {
            $error = isset($response['err']) ? $response['err'] : 'Neznámá chyba';
            error_log("[NotificationHelpers] Failed to trigger notification: $error");
            return array('success' => false, 'error' => $error);
        }
        
    } catch (Exception $e) {
        error_log("[NotificationHelpers] Exception in triggerOrderNotification: " . $e->getMessage());
        return array('success' => false, 'error' => 'Exception: ' . $e->getMessage());
    }
}

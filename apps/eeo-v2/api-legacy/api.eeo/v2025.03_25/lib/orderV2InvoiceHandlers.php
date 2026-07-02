<?php

/**
 * Order V2 Invoice Management Handlers - PRIMÁRNÍ API PRO FAKTURY
 * PHP 5.6 Compatible - uses array() syntax, string status codes
 * 
 * ✅ AKTUÁLNÍ A DOPORUČENÝ - Od 21.12.2025 jediný aktivní invoice API
 * 
 * 🎯 PODPOROVANÉ ENDPOINTY:
 * - order-v2/invoices/create                             → Standalone faktury (bez objednávky)
 * - order-v2/invoices/create-with-attachment             → Standalone faktury s přílohou
 * - order-v2/{order_id}/invoices/create                  → Faktury pro objednávku
 * - order-v2/{order_id}/invoices/create-with-attachment  → Faktury pro objednávku s přílohou
 * - order-v2/invoices/{invoice_id}/update                → Update faktury (časová značka + uživatel)
 * - order-v2/invoices/{invoice_id}/delete                → Delete faktury (soft/hard)
 * 
 * ✅ FUNKČNOSTI:
 * - Úplný audit trail (vytvoril_uzivatel_id, dt_vytvoreni, aktualizoval_uzivatel_id, dt_aktualizace)
 * - Správné timezone handling přes TimezoneHelper
 * - Konzistentní response formát (status: 'ok'/'error')
 * - Podpora standalone faktur (bez vazby na objednávku)
 * - Věcná správnost a předání zaměstnanci
 * - Soft/hard delete s kontrolou oprávnění
 */

// Include všechny potřebné závislosti
require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/handlers.php'; // Pro get_db a verify_token* funkce  
require_once __DIR__ . '/orderHandlers.php';
require_once __DIR__ . '/orderWorkflowHelpers.php';
require_once __DIR__ . '/smlouvyHandlers.php'; // Pro prepocetCerpaniSmlouvyAuto()
require_once __DIR__ . '/limitovanePrislibyCerpaniHandlers_v2_pdo.php'; // Pro prepocetCerpaniPodleIdLP_PDO()

/**
 * 💰 Normalizace peněžní částky pro DB (fa_castka)
 *
 * Podporuje běžné vstupy z UI:
 * - "12500" / "12500.5" / "12500,50"
 * - "12 500,50" / "12A0500,50" (mezery, NBSP)
 * - "12 500,50 Kč" (měna)
 *
 * Výstup: string "12345.67" nebo null (a nastaví $error)
 */
function order_v2_normalize_money_to_decimal_string($raw, &$error) {
    $error = null;

    if ($raw === null) {
        $error = 'Částka faktury je prázdná';
        return null;
    }

    // Převod na string
    $value = is_string($raw) ? $raw : strval($raw);

    // NBSP -> space, trim
    $value = str_replace("\xC2\xA0", ' ', $value);
    $value = trim($value);

    if ($value === '') {
        $error = 'Částka faktury je prázdná';
        return null;
    }

    // Odstranit měnu a všechny znaky kromě číslic, tečky, čárky, mínusu a mezer
    $value = preg_replace('/[^0-9,\.\-\s]/u', '', $value);
    $value = trim($value);

    // Odstranit mezery (thousand separators)
    $value = preg_replace('/\s+/', '', $value);

    if ($value === '' || $value === '-' || $value === ',' || $value === '.') {
        $error = 'Částka faktury není validní';
        return null;
    }

    $hasComma = (strpos($value, ',') !== false);
    $hasDot = (strpos($value, '.') !== false);

    // Pokud obsahuje obojí, rozhodni podle posledního výskytu
    if ($hasComma && $hasDot) {
        $lastComma = strrpos($value, ',');
        $lastDot = strrpos($value, '.');

        if ($lastComma > $lastDot) {
            // desetinná je čárka -> tečky jsou tisíce
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        } else {
            // desetinná je tečka -> čárky jsou tisíce
            $value = str_replace(',', '', $value);
        }
    } elseif ($hasComma && !$hasDot) {
        // pouze čárka -> desetinná
        $value = str_replace(',', '.', $value);
    }

    // Validace finálního tvaru
    if (!preg_match('/^-?\d+(\.\d+)?$/', $value)) {
        $error = 'Částka faktury není validní';
        return null;
    }

    // Finální formát na 2 desetinná místa (DB očekává decimal)
    $num = (float)$value;

    // Bezpečnost: NaN / INF
    if (!is_finite($num)) {
        $error = 'Částka faktury není validní';
        return null;
    }

    // DECIMAL guard (typicky DECIMAL(10,2) -> max 99999999.99)
    if (abs($num) > 99999999.99) {
        $error = 'Částka faktury je příliš vysoká';
        return null;
    }

    return number_format($num, 2, '.', '');
}

/**
 * Najde aktivní fakturu podle čísla VEMA.
 */
function order_v2_find_active_invoice_by_number($db, $fa_cislo_vema) {
    $sql = "SELECT id, objednavka_id, smlouva_id, fa_castka, fa_datum_vystaveni, vytvoril_uzivatel_id, dt_vytvoreni
            FROM " . TBL_FAKTURY . "
            WHERE fa_cislo_vema = ? AND aktivni = 1
            ORDER BY id DESC
            LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->execute(array($fa_cislo_vema));
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Heuristika idempotentního retry create requestu.
 *
 * Vrací true pouze když je to velmi pravděpodobně stejný request:
 * - stejný uživatel
 * - stejné vazby objednávka/smlouva
 * - stejná částka a datum vystavení
 * - vytvořeno nedávno (výchozí 180s)
 */
function order_v2_is_probable_idempotent_create_retry($existing_invoice, $token_data, $input, $order_id, $window_seconds) {
    if (!$existing_invoice) {
        return false;
    }

    $window_seconds = (int)$window_seconds;
    if ($window_seconds <= 0) {
        $window_seconds = 180;
    }

    $existing_user_id = isset($existing_invoice['vytvoril_uzivatel_id']) ? (int)$existing_invoice['vytvoril_uzivatel_id'] : 0;
    $current_user_id = isset($token_data['id']) ? (int)$token_data['id'] : 0;
    if ($existing_user_id <= 0 || $current_user_id <= 0 || $existing_user_id !== $current_user_id) {
        return false;
    }

    $requested_order_id = ($order_id !== null && (int)$order_id > 0) ? (int)$order_id : 0;
    $existing_order_id = !empty($existing_invoice['objednavka_id']) ? (int)$existing_invoice['objednavka_id'] : 0;
    if ($requested_order_id !== $existing_order_id) {
        return false;
    }

    $requested_smlouva_id = (isset($input['smlouva_id']) && (int)$input['smlouva_id'] > 0) ? (int)$input['smlouva_id'] : 0;
    $existing_smlouva_id = !empty($existing_invoice['smlouva_id']) ? (int)$existing_invoice['smlouva_id'] : 0;
    if ($requested_smlouva_id !== $existing_smlouva_id) {
        return false;
    }

    $requested_ts = isset($input['fa_datum_vystaveni']) ? strtotime($input['fa_datum_vystaveni']) : false;
    $existing_date_ts = !empty($existing_invoice['fa_datum_vystaveni']) ? strtotime($existing_invoice['fa_datum_vystaveni']) : false;
    if ($requested_ts === false || $existing_date_ts === false) {
        return false;
    }

    $requested_date = date('Y-m-d', $requested_ts);
    $existing_date = date('Y-m-d', $existing_date_ts);
    if ($requested_date !== $existing_date) {
        return false;
    }

    $requested_amount = number_format((float)$input['fa_castka'], 2, '.', '');
    $existing_amount = number_format((float)$existing_invoice['fa_castka'], 2, '.', '');
    if ($requested_amount !== $existing_amount) {
        return false;
    }

    $existing_ts = !empty($existing_invoice['dt_vytvoreni']) ? strtotime($existing_invoice['dt_vytvoreni']) : false;
    if ($existing_ts === false) {
        return false;
    }

    $age_seconds = time() - (int)$existing_ts;
    if ($age_seconds < 0 || $age_seconds > $window_seconds) {
        return false;
    }

    return true;
}

/**
 * Standardní response při detekci duplicity čísla faktury.
 */
function order_v2_emit_duplicate_create_response($existing_invoice, $is_idempotent_retry) {
    $existing_id = isset($existing_invoice['id']) ? (int)$existing_invoice['id'] : null;

    if ($is_idempotent_retry && $existing_id) {
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Faktura již byla vytvořena (idempotentní opakování požadavku).',
            'data' => array(
                'invoice_id' => $existing_id,
                'idempotent_reused' => true
            )
        ));
        return;
    }

    http_response_code(409);
    echo json_encode(array(
        'status' => 'error',
        'message' => 'Faktura s tímto číslem již existuje.',
        'error_code' => 'INVOICE_DUPLICATE',
        'existing_invoice' => array(
            'id' => $existing_id,
            'objednavka_id' => isset($existing_invoice['objednavka_id']) && $existing_invoice['objednavka_id'] !== null ? (int)$existing_invoice['objednavka_id'] : null,
            'smlouva_id' => isset($existing_invoice['smlouva_id']) && $existing_invoice['smlouva_id'] !== null ? (int)$existing_invoice['smlouva_id'] : null,
            'fa_castka' => isset($existing_invoice['fa_castka']) ? $existing_invoice['fa_castka'] : null,
            'fa_datum_vystaveni' => isset($existing_invoice['fa_datum_vystaveni']) ? $existing_invoice['fa_datum_vystaveni'] : null
        )
    ));
}

/**
 * Udržuje fakturant metadata objednávky v souladu s aktivními fakturami.
 * - pokud objednávka nemá aktivní faktury: vynuluje fakturant_id + dt_faktura_pridana
 * - pokud má aktivní faktury, ale chybí metadata: inicializuje je aktuálním uživatelem
 */
function sync_order_v2_invoice_tracking_metadata($db, $order_id, $current_user_id) {
    $order_id = (int)$order_id;
    $current_user_id = (int)$current_user_id;

    if ($order_id <= 0) {
        return;
    }

    $orders_table = get_orders_table_name();

    $sql_count = "SELECT COUNT(*) AS cnt FROM " . TBL_FAKTURY . " WHERE objednavka_id = ? AND aktivni = 1";
    $stmt_count = $db->prepare($sql_count);
    $stmt_count->execute(array($order_id));
    $active_count = (int)$stmt_count->fetchColumn();

    if ($active_count === 0) {
        $sql_reset = "UPDATE `{$orders_table}`
                      SET fakturant_id = NULL,
                          dt_faktura_pridana = NULL,
                          dt_aktualizace = NOW(),
                          uzivatel_akt_id = ?
                      WHERE id = ?";
        $stmt_reset = $db->prepare($sql_reset);
        $stmt_reset->execute(array($current_user_id, $order_id));
        return;
    }

    $sql_current = "SELECT fakturant_id, dt_faktura_pridana FROM `{$orders_table}` WHERE id = ? LIMIT 1";
    $stmt_current = $db->prepare($sql_current);
    $stmt_current->execute(array($order_id));
    $current_tracking = $stmt_current->fetch(PDO::FETCH_ASSOC);

    $missing_tracking = !$current_tracking || empty($current_tracking['fakturant_id']) || empty($current_tracking['dt_faktura_pridana']);
    if ($missing_tracking) {
        $sql_init = "UPDATE `{$orders_table}`
                     SET fakturant_id = ?,
                         dt_faktura_pridana = NOW(),
                         dt_aktualizace = NOW(),
                         uzivatel_akt_id = ?
                     WHERE id = ?";
        $stmt_init = $db->prepare($sql_init);
        $stmt_init->execute(array($current_user_id, $current_user_id, $order_id));
    }
}

/**
 * LP guard: při potvrzení věcné správnosti musí mít LP financovaná objednávka
 * alespoň jeden řádek LP rozkladu u faktury.
 *
 * @throws Exception při porušení pravidla
 */
function ensure_order_v2_lp_split_exists_for_vs_approval($db, $invoice_id, $order_id) {
    if (empty($order_id)) {
        return;
    }

    $stmt_order_fin = $db->prepare("SELECT financovani FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1 LIMIT 1");
    $stmt_order_fin->execute(array((int)$order_id));
    $order_fin = $stmt_order_fin->fetch(PDO::FETCH_ASSOC);

    if (!$order_fin || empty($order_fin['financovani'])) {
        return;
    }

    $financovani = json_decode($order_fin['financovani'], true);
    if (!is_array($financovani) || !isset($financovani['typ']) || $financovani['typ'] !== 'LP') {
        return;
    }

    $stmt_lp = $db->prepare("\n        SELECT COUNT(*) AS cnt\n        FROM " . TBL_FAKTURY_LP_CERPANI . "\n        WHERE faktura_id = ?\n          AND (lp_cislo IS NOT NULL AND TRIM(lp_cislo) != '')\n          AND castka IS NOT NULL\n    ");
    $stmt_lp->execute(array((int)$invoice_id));
    $lp_count_row = $stmt_lp->fetch(PDO::FETCH_ASSOC);
    $lp_count = $lp_count_row ? (int)$lp_count_row['cnt'] : 0;

    if ($lp_count <= 0) {
        throw new Exception('Pro LP financování nelze potvrdit věcnou správnost bez LP rozkladu faktury.');
    }
}

/**
 * 🔄 Automaticky přepočítá čerpání smluv související s fakturou
 * 
 * Přepočítává čerpání pro:
 * 1. Smlouvu přímo navázanou na fakturu (smlouva_id)
 * 2. Smlouvy navázané přes objednávku (financovani JSON)
 * 
 * @param int $invoice_id ID faktury
 * @param array|null $invoice_data Volitelně data faktury (jinak se načtou z DB)
 */
function autoRecalculateContractSpendingForInvoice($invoice_id, $invoice_data = null) {
    try {
        // Get config and DB
        $_config = require __DIR__ . '/dbconfig.php';
        $config = $_config['mysql'];
        $db = get_db($config);
        
        if (!$db) {
            return;
        }
        
        // Načíst data faktury, pokud nejsou poskytnuty
        if ($invoice_data === null) {
            $stmt = $db->prepare("SELECT objednavka_id, smlouva_id FROM " . TBL_FAKTURY . " WHERE id = ?");
            $stmt->execute(array($invoice_id));
            $invoice_data = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$invoice_data) {
                return;
            }
        }
        
        $contract_numbers_to_recalculate = array();
        
        // 1. Přímá vazba na smlouvu (smlouva_id)
        if (isset($invoice_data['smlouva_id']) && $invoice_data['smlouva_id'] > 0) {
            $stmt = $db->prepare("SELECT cislo_smlouvy FROM " . TBL_SMLOUVY . " WHERE id = ? AND aktivni = 1");
            $stmt->execute(array($invoice_data['smlouva_id']));
            $contract = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($contract) {
                $contract_numbers_to_recalculate[] = $contract['cislo_smlouvy'];
            }
        }
        
        // 2. Vazba přes objednávku (financovani JSON)
        if (isset($invoice_data['objednavka_id']) && $invoice_data['objednavka_id'] > 0) {
            $stmt = $db->prepare("SELECT financovani FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1");
            $stmt->execute(array($invoice_data['objednavka_id']));
            $order = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($order && !empty($order['financovani'])) {
                $financovani = json_decode($order['financovani'], true);
                
                if (isset($financovani['cislo_smlouvy']) && !empty($financovani['cislo_smlouvy'])) {
                    $contract_numbers_to_recalculate[] = $financovani['cislo_smlouvy'];
                }
            }
        }
        
        // Odstranit duplicity
        $contract_numbers_to_recalculate = array_unique($contract_numbers_to_recalculate);
        
        // Provést přepočet pro každou nalezenou smlouvu
        foreach ($contract_numbers_to_recalculate as $contract_number) {
            prepocetCerpaniSmlouvyAuto($contract_number);
        }
        
        if (empty($contract_numbers_to_recalculate)) {
        }
        
    } catch (Exception $e) {
        // Neblokujeme operaci s fakturou, jen logujeme chybu
    }
}

function handle_order_v2_create_invoice_with_attachment($input, $config, $queries) {
    // Token verification for production - V2 enhanced
    $token_data = verify_token_v2($input['username'], $input['token']);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    // ✅ order_id může být NULL (standalone faktura) nebo validní ID objednávky
    $order_id = isset($input['order_id']) && (int)$input['order_id'] > 0 ? (int)$input['order_id'] : null;
    
    // ✅ VALIDACE WORKFLOW STAVU - faktura se může přidat JEN v určitých stavech
    if ($order_id !== null) {
        $db = get_db($config);
        $sql_check = "SELECT stav_workflow_kod FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1";
        $stmt_check = $db->prepare($sql_check);
        $stmt_check->execute(array($order_id));
        $order = $stmt_check->fetch(PDO::FETCH_ASSOC);
        
        if (!$order) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka nenalezena'));
            return;
        }
        
        $workflow = json_decode($order['stav_workflow_kod'], true);
        if (!is_array($workflow) || count($workflow) === 0) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka nemá definovaný workflow'));
            return;
        }
        
        // Zkontrolovat POSLEDNÍ stav (aktuální stav objednávky)
        $currentState = end($workflow);
        $allowedStates = array('NEUVEREJNIT', 'UVEREJNENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA');
        
        if (!in_array($currentState, $allowedStates)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Fakturu lze přidat pouze k objednávce ve stavu: NEUVEŘEJNIT, UVEŘEJNĚNA, FAKTURACE, VĚCNÁ SPRÁVNOST nebo ZKONTROLOVANÁ. Aktuální stav: ' . $currentState));
            return;
        }
    }
    
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí soubor k nahrání'));
        return;
    }
    
    // Validate required fields
    // ⚠️ Pozor: empty('0') === true, takže pro částky nepoužívat empty()
    $required = array('fa_cislo_vema', 'fa_datum_vystaveni', 'fa_castka');
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Chybí povinné pole: ' . $field));
            return;
        }

        $raw = $input[$field];
        $rawStr = is_string($raw) ? trim($raw) : strval($raw);

        if ($rawStr === '') {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Chybí povinné pole: ' . $field));
            return;
        }
    }

    // ✅ Normalizace částky - zabrání SQL warning 1265 "Data truncated"
    $moneyError = null;
    $normalizedAmount = order_v2_normalize_money_to_decimal_string($input['fa_castka'], $moneyError);
    if ($normalizedAmount === null) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatná částka faktury (fa_castka): ' . $moneyError));
        return;
    }
    $input['fa_castka'] = $normalizedAmount;
    
    try {
        $db = get_db($config);

        // Duplicitní VS je pouze informativní (kontrola probíhá přes check-duplicate endpoint),
        // vytvoření faktury nesmí být blokováno.
        
        // Nastavit MySQL timezone pro konzistentní datetime handling
        TimezoneHelper::setMysqlTimezone($db);
        
        $db->beginTransaction();
        
        // Create invoice record
        $sql_insert = "INSERT INTO " . TBL_FAKTURY . " (
            objednavka_id, smlouva_id, fa_dorucena, fa_castka, fa_cislo_vema, fa_vema_kod,
            fa_datum_vystaveni, fa_datum_splatnosti, fa_datum_doruceni,
            fa_strediska_kod, fa_poznamka, rozsirujici_data,
            vytvoril_uzivatel_id, aktualizoval_uzivatel_id, dt_vytvoreni, dt_aktualizace, aktivni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)";
        
        $stmt_insert = $db->prepare($sql_insert);
        $stmt_insert->execute(array(
            $order_id,
            isset($input['smlouva_id']) && (int)$input['smlouva_id'] > 0 ? (int)$input['smlouva_id'] : null,
            isset($input['fa_dorucena']) ? (int)$input['fa_dorucena'] : 0,
            $input['fa_castka'],
            trim($input['fa_cislo_vema']),
            isset($input['fa_vema_kod']) ? trim($input['fa_vema_kod']) : null,
            isset($input['fa_datum_vystaveni']) ? $input['fa_datum_vystaveni'] : null,
            isset($input['fa_datum_splatnosti']) ? $input['fa_datum_splatnosti'] : null,
            isset($input['fa_datum_doruceni']) ? $input['fa_datum_doruceni'] : null,
            isset($input['fa_strediska_kod']) ? $input['fa_strediska_kod'] : null,
            isset($input['fa_poznamka']) ? $input['fa_poznamka'] : null,
            isset($input['rozsirujici_data']) ? json_encode($input['rozsirujici_data']) : null,
            $token_data['id'],  // Použít ID z tokenu
            $token_data['id']
        ));
        
        $invoice_id = $db->lastInsertId();
        
        // Handle file upload with fa- prefix
        $file = $_FILES['file'];
        $originalName = $file['name'];
        
        // Generate filename with fa-datum-guid format
        $guid = uniqid('', true);
        $datePrefix = TimezoneHelper::getCzechDateTime('Ymd');
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $fileName = 'fa-' . $datePrefix . '-' . $guid . ($extension ? '.' . $extension : '');
        
        $uploadDir = isset($config['upload_dir']) ? $config['upload_dir'] : '/tmp';
        $filePath = $uploadDir . '/' . $fileName;
        
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            throw new Exception('Nepodařilo se nahrát soubor');
        }
        
        // Create attachment record in faktury_prilohy table
        $sql_att = "INSERT INTO " . TBL_FAKTURY_PRILOHY . " (
            faktura_id, nazev_souboru, nazev_originalu, 
            cesta_k_souboru, typ_souboru, velikost_souboru,
            dt_nahrani, aktivni
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)";
        
        $stmt_att = $db->prepare($sql_att);
        $stmt_att->execute(array(
            $invoice_id,
            $fileName,
            $originalName,
            $filePath,
            $file['type'],
            $file['size']
        ));
        
        $attachment_id = $db->lastInsertId();
        
        // 🆕 WORKFLOW UPDATE - automatická aktualizace workflow po přidání faktury
        // Replika logiky z OrderForm25.js - přidá FAKTURACE + VECNA_SPRAVNOST
        if ($order_id !== null && $order_id > 0) {
            $workflowSuccess = handleInvoiceWorkflowUpdate($db, $order_id);
            if (!$workflowSuccess) {
                // Pokračujeme - workflow update není kritická chyba pro vytvoření faktury
            }
        }
        
        $db->commit();
        
        // 🔄 AUTO PŘEPOČET čerpání smluv po vytvoření faktury s přílohou
        autoRecalculateContractSpendingForInvoice($invoice_id, array(
            'objednavka_id' => $order_id,
            'smlouva_id' => isset($input['smlouva_id']) ? $input['smlouva_id'] : null
        ));
        
        // 🔄 AUTO PŘEPOČET LP čerpání po vytvoření faktury s přílohou
        try {
            
            $lp_ids_to_recalc = array();
            
            // Načíst LP z objednávky (pokud existuje)
            if (!empty($order_id)) {
                $stmt_ord = $db->prepare("SELECT financovani FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                $stmt_ord->execute(array($order_id));
                $order_data = $stmt_ord->fetch(PDO::FETCH_ASSOC);
                
                if ($order_data && !empty($order_data['financovani'])) {
                    $financovani = json_decode($order_data['financovani'], true);
                    if ($financovani && isset($financovani['typ']) && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                        $lp_ids_to_recalc = $financovani['lp_kody'];
                    }
                }
            }
            
            // Přepočítat všechny nalezené LP
            if (!empty($lp_ids_to_recalc)) {
                foreach ($lp_ids_to_recalc as $lp_id) {
                    prepocetCerpaniPodleIdLP_PDO($db, (int)$lp_id, null);
                }
            }
        } catch (Exception $lp_error) {
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Faktura s přílohou byla úspěšně vytvořena',
            'data' => array(
                'invoice_id' => $invoice_id,
                'attachment_id' => $attachment_id,
                'filename' => $fileName
            )
        ));
        
    } catch (Exception $e) {
        if (isset($db)) {
            $db->rollBack();
        }
        if (isset($filePath) && file_exists($filePath)) {
            unlink($filePath);
        }
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření faktury: ' . $e->getMessage()));
    }
}

function handle_order_v2_create_invoice($input, $config, $queries) {
    // Token verification for production - using V2 enhanced verification
    $token_data = verify_token_v2($input['username'], $input['token']);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    // ✅ order_id může být NULL (standalone faktura) nebo validní ID objednávky
    $order_id = isset($input['order_id']) && (int)$input['order_id'] > 0 ? (int)$input['order_id'] : null;
    
    // Validate required fields
    // ⚠️ Pozor: empty('0') === true, takže pro částky nepoužívat empty()
    $required = array('fa_cislo_vema', 'fa_datum_vystaveni', 'fa_castka');
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Chybí povinné pole: ' . $field));
            return;
        }

        $raw = $input[$field];
        $rawStr = is_string($raw) ? trim($raw) : strval($raw);

        if ($rawStr === '') {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Chybí povinné pole: ' . $field));
            return;
        }
    }

    // ✅ Normalizace částky - zabrání SQL warning 1265 "Data truncated"
    $moneyError = null;
    $normalizedAmount = order_v2_normalize_money_to_decimal_string($input['fa_castka'], $moneyError);
    if ($normalizedAmount === null) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatná částka faktury (fa_castka): ' . $moneyError));
        return;
    }
    $input['fa_castka'] = $normalizedAmount;
    
    try {
        $db = get_db($config);

        // Duplicitní VS je pouze informativní (kontrola probíhá přes check-duplicate endpoint),
        // vytvoření faktury nesmí být blokováno.
        
        // Nastavit MySQL timezone pro konzistentní datetime handling
        TimezoneHelper::setMysqlTimezone($db);
        
        // ✅ VALIDACE WORKFLOW STAVU - faktura se může přidat JEN v určitých stavech
        if ($order_id !== null) {
            $sql_check = "SELECT stav_workflow_kod FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1";
            $stmt_check = $db->prepare($sql_check);
            $stmt_check->execute(array($order_id));
            $order = $stmt_check->fetch(PDO::FETCH_ASSOC);
            
            if (!$order) {
                http_response_code(404);
                echo json_encode(array('status' => 'error', 'message' => 'Objednávka nenalezena'));
                return;
            }
            
            $workflow = json_decode($order['stav_workflow_kod'], true);
            if (!is_array($workflow) || count($workflow) === 0) {
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Objednávka nemá definovaný workflow'));
                return;
            }
            
            // Zkontrolovat POSLEDNÍ stav (aktuální stav objednávky)
            $currentState = end($workflow);
            $allowedStates = array('NEUVEREJNIT', 'UVEREJNENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA');
            
            if (!in_array($currentState, $allowedStates)) {
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Fakturu lze přidat pouze k objednávce ve stavu: NEUVEŘEJNIT, UVEŘEJNĚNA, FAKTURACE, VĚCNÁ SPRÁVNOST nebo ZKONTROLOVANÁ. Aktuální stav: ' . $currentState));
                return;
            }
        }
        
        // Create invoice record
        $sql_insert = "INSERT INTO " . TBL_FAKTURY . " (
            objednavka_id, smlouva_id, fa_dorucena, fa_zaplacena, fa_castka, fa_cislo_vema, fa_vema_kod,
            fa_typ, fa_datum_vystaveni, fa_datum_splatnosti, fa_datum_doruceni,
            fa_strediska_kod, fa_poznamka,
            potvrdil_vecnou_spravnost_id, dt_potvrzeni_vecne_spravnosti,
            vecna_spravnost_umisteni_majetku, vecna_spravnost_poznamka, vecna_spravnost_potvrzeno,
            rozsirujici_data, fa_predana_zam_id, fa_datum_predani_zam, fa_datum_vraceni_zam,
            vytvoril_uzivatel_id, aktualizoval_uzivatel_id, dt_vytvoreni, dt_aktualizace, aktivni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)";
        
        $stmt_insert = $db->prepare($sql_insert);
        $stmt_insert->execute(array(
            $order_id,
            isset($input['smlouva_id']) && !empty($input['smlouva_id']) ? (int)$input['smlouva_id'] : null,
            isset($input['fa_dorucena']) ? (int)$input['fa_dorucena'] : 0,
            isset($input['fa_zaplacena']) ? (int)$input['fa_zaplacena'] : 0,
            $input['fa_castka'],
            trim($input['fa_cislo_vema']),
            isset($input['fa_vema_kod']) ? trim($input['fa_vema_kod']) : null,
            isset($input['fa_typ']) ? $input['fa_typ'] : 'BEZNA',
            isset($input['fa_datum_vystaveni']) ? $input['fa_datum_vystaveni'] : null,
            isset($input['fa_datum_splatnosti']) ? $input['fa_datum_splatnosti'] : null,
            isset($input['fa_datum_doruceni']) ? $input['fa_datum_doruceni'] : null,
            isset($input['fa_strediska_kod']) ? $input['fa_strediska_kod'] : null,
            isset($input['fa_poznamka']) ? $input['fa_poznamka'] : null,
            isset($input['potvrdil_vecnou_spravnost_id']) && !empty($input['potvrdil_vecnou_spravnost_id']) ? (int)$input['potvrdil_vecnou_spravnost_id'] : null,
            isset($input['dt_potvrzeni_vecne_spravnosti']) ? $input['dt_potvrzeni_vecne_spravnosti'] : null,
            isset($input['vecna_spravnost_umisteni_majetku']) ? $input['vecna_spravnost_umisteni_majetku'] : null,
            isset($input['vecna_spravnost_poznamka']) ? $input['vecna_spravnost_poznamka'] : null,
            isset($input['vecna_spravnost_potvrzeno']) ? (int)$input['vecna_spravnost_potvrzeno'] : 0,
            isset($input['rozsirujici_data']) ? json_encode($input['rozsirujici_data']) : null,
            isset($input['fa_predana_zam_id']) && !empty($input['fa_predana_zam_id']) ? (int)$input['fa_predana_zam_id'] : null,
            isset($input['fa_datum_predani_zam']) ? $input['fa_datum_predani_zam'] : null,
            isset($input['fa_datum_vraceni_zam']) ? $input['fa_datum_vraceni_zam'] : null,
            $token_data['id'],  // Použít ID z tokenu
            $token_data['id']
        ));
        
        $invoice_id = $db->lastInsertId();
        
        // =========================================================================
        // 🔄 AUTOMATICKÁ ZMĚNA WORKFLOW OBJEDNÁVKY PO VYTVOŘENÍ FAKTURY
        // =========================================================================
        // ✅ POŽADAVEK: Pokud se přidá nová faktura k objednávce ve stavu ZKONTROLOVANA,
        //    automaticky vrátit objednávku na VECNA_SPRAVNOST (musí projít novou kontrolou).
        // ✅ Také automaticky přidat FAKTURACE a VECNA_SPRAVNOST pokud ještě nejsou.
        
        if ($order_id !== null && $order_id > 0) {
            try {
                // Načíst aktuální stav objednávky
                $sql_order = "SELECT id, stav_workflow_kod FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1";
                $stmt_order = $db->prepare($sql_order);
                $stmt_order->execute(array($order_id));
                $order = $stmt_order->fetch(PDO::FETCH_ASSOC);
                
                if ($order) {
                    // Parsovat workflow stavy
                    $workflow_states = json_decode($order['stav_workflow_kod'], true);
                    if (!is_array($workflow_states)) {
                        $workflow_states = array();
                    }
                    
                    $workflow_changed = false;
                    
                    // PRAVIDLO 1: Ujistit se, že má FAKTURACE
                    if (!in_array('FAKTURACE', $workflow_states)) {
                        $workflow_states[] = 'FAKTURACE';
                        $workflow_changed = true;
                    }
                    
                    // PRAVIDLO 2: Ujistit se, že má VECNA_SPRAVNOST
                    if (!in_array('VECNA_SPRAVNOST', $workflow_states)) {
                        $workflow_states[] = 'VECNA_SPRAVNOST';
                        $workflow_changed = true;
                    }
                    
                    // PRAVIDLO 3: Pokud byla ZKONTROLOVANA → vrátit na VECNA_SPRAVNOST
                    $had_zkontrolovana = in_array('ZKONTROLOVANA', $workflow_states);
                    if ($had_zkontrolovana) {
                        $workflow_states = array_values(array_filter($workflow_states, function($s) {
                            return $s !== 'ZKONTROLOVANA';
                        }));
                        $workflow_changed = true;
                    }
                    
                    // Pokud se workflow změnil → uložit do DB
                    if ($workflow_changed) {
                        // Aktualizovat workflow objednávky
                        $new_workflow_json = json_encode($workflow_states);
                        
                        // Určit textový stav podle posledního workflow kódu
                        $last_workflow_code = end($workflow_states);
                        $stav_objednavky_text = 'Věcná správnost'; // Výchozí pro VECNA_SPRAVNOST
                        
                        $sql_update_order = "UPDATE " . TBL_OBJEDNAVKY . " 
                                             SET stav_workflow_kod = ?, 
                                                 stav_objednavky = ?,
                                                 dt_aktualizace = NOW(),
                                                 uzivatel_akt_id = ?
                                             WHERE id = ? AND aktivni = 1";
                        $stmt_update_order = $db->prepare($sql_update_order);
                        $stmt_update_order->execute(array(
                            $new_workflow_json,
                            $stav_objednavky_text,
                            $token_data['id'],
                            $order_id
                        ));
                        
                        
                        // 🔔 NOTIFIKACE 2026-04-24: Po přidání NOVÉ faktury poslat žádost o věcnou
                        //    správnost POUZE pro tuto novou fakturu (invoice-level), ne pro celou
                        //    objednávku – aby uživatele u ostatních (už potvrzených) faktur systém
                        //    znovu neobtěžoval.
                        if (in_array('VECNA_SPRAVNOST', $workflow_states)) {
                            try {
                                require_once __DIR__ . '/notificationHandlers.php';
                                triggerNotification(
                                    $db,
                                    'INVOICE_MATERIAL_CHECK_REQUESTED',
                                    $invoice_id,
                                    $token_data['id']
                                );
                            } catch (Exception $notif_error) {
                            }
                        }
                    }
                }
            } catch (Exception $order_update_error) {
                // Neblokovat úspěch faktury, jen zalogovat chybu
                error_log("⚠️ INVOICE CREATE: Chyba při aktualizaci workflow objednávky: " . $order_update_error->getMessage());
            }
        }
        
        // 🔄 AUTO PŘEPOČET čerpání smluv po vytvoření faktury
        autoRecalculateContractSpendingForInvoice($invoice_id, array(
            'objednavka_id' => $order_id,
            'smlouva_id' => isset($input['smlouva_id']) ? $input['smlouva_id'] : null
        ));
        
        // 🔄 AUTO PŘEPOČET LP čerpání po vytvoření faktury
        try {
            
            $lp_ids_to_recalc = array();
            
            // Načíst LP z objednávky (pokud existuje)
            if (!empty($order_id)) {
                $stmt_ord = $db->prepare("SELECT financovani FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                $stmt_ord->execute(array($order_id));
                $order_data = $stmt_ord->fetch(PDO::FETCH_ASSOC);
                
                if ($order_data && !empty($order_data['financovani'])) {
                    $financovani = json_decode($order_data['financovani'], true);
                    if ($financovani && isset($financovani['typ']) && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                        $lp_ids_to_recalc = $financovani['lp_kody'];
                    }
                }
            }
            
            // Přepočítat všechny nalezené LP
            if (!empty($lp_ids_to_recalc)) {
                foreach ($lp_ids_to_recalc as $lp_id) {
                    prepocetCerpaniPodleIdLP_PDO($db, (int)$lp_id, null);
                }
            }
        } catch (Exception $lp_error) {
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Faktura byla úspěšně vytvořena',
            'data' => array(
                'invoice_id' => $invoice_id
            )
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při vytváření faktury: ' . $e->getMessage()));
    }
}

function handle_order_v2_update_invoice($input, $config, $queries) {
    // Token verification for production - using V2 enhanced verification
    $token_data = verify_token_v2($input['username'], $input['token']);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    
    if (!$invoice_id) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí ID faktury'));
        return;
    }
    
    
    try {
        $db = get_db($config);
        
        // Nastavit MySQL timezone pro konzistentní datetime handling
        TimezoneHelper::setMysqlTimezone($db);
        
        // 🔒 ADMIN CHECK - potřeba pro práci s neaktivními fakturami
        $is_admin = isset($token_data['is_admin']) ? (bool)$token_data['is_admin'] : false;
        
        
        // Načíst současný stav faktury
        // ✅ Admin může aktualizovat i neaktivní faktury
        $sql_current = "SELECT * FROM " . TBL_FAKTURY . " WHERE id = ?";
        if (!$is_admin) {
            $sql_current .= " AND aktivni = 1";
        }
        
        
        $stmt_current = $db->prepare($sql_current);
        $stmt_current->execute(array($invoice_id));
        $current_invoice = $stmt_current->fetch(PDO::FETCH_ASSOC);
        
        if (!$current_invoice) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nebyla nalezena'));
            return;
        }
        

        // ✅ Normalizace částky faktury (fa_castka) před porovnáním i uložením
        // Důvod: UI může posílat částku s čárkou (např. "1277,77"), což MySQL může uložit/truncovat.
        if (array_key_exists('fa_castka', $input)) {
            $moneyError = null;
            $normalizedAmount = order_v2_normalize_money_to_decimal_string($input['fa_castka'], $moneyError);
            if ($normalizedAmount === null) {
                http_response_code(400);
                echo json_encode(array('status' => 'error', 'message' => 'Neplatná částka faktury (fa_castka): ' . $moneyError));
                return;
            }
            $input['fa_castka'] = $normalizedAmount;
        }
        
        // Build dynamic update query based on provided fields
        $updateFields = array();
        $updateValues = array();
        
        $allowedFields = array(
            'fa_cislo_vema', 'fa_vema_kod', 'fa_datum_vystaveni', 'fa_datum_splatnosti', 'fa_datum_doruceni',
            'fa_castka', 'fa_dorucena', 'fa_zaplacena', 'fa_typ',
            'fa_strediska_kod', 'fa_poznamka', 'rozsirujici_data',
            'potvrdil_vecnou_spravnost_id', 'dt_potvrzeni_vecne_spravnosti',
            'vecna_spravnost_umisteni_majetku', 'vecna_spravnost_poznamka', 'vecna_spravnost_duvod', 'vecna_spravnost_potvrzeno',
            // Nové fieldy - předání zaměstnanci
            'fa_datum_zaplaceni', 'fa_predana_zam_id', 'fa_datum_predani_zam', 'fa_datum_vraceni_zam',
            // Vazba na smlouvu A OBJEDNÁVKU - přidáno 08.01.2026
            'smlouva_id', 'objednavka_id',
            // Workflow stav - přidáno 22.12.2025
            'stav'
        );

        // 🆕 Načíst app settings pro invoice_accountant_edit
        $appSettings = array();
        $invoiceEditEnabled = false;
        try {
            $settingsStmt = $db->prepare("SELECT klic, hodnota FROM " . TBL_NASTAVENI_GLOBALNI . " WHERE klic LIKE 'invoice_accountant_edit_%'");
            $settingsStmt->execute();
            while ($settingRow = $settingsStmt->fetch(PDO::FETCH_ASSOC)) {
                $appSettings[$settingRow['klic']] = $settingRow['hodnota'] === '1';
            }
            $invoiceEditEnabled = !empty($appSettings['invoice_accountant_edit_enabled']);
        } catch (Exception $e) {
            error_log("⚠️ UPDATE INVOICE #$invoice_id - Chyba při načítání app settings: " . $e->getMessage());
        }

        $fieldSettingMap = array(
            'fa_cislo_vema' => 'invoice_accountant_edit_variabilni_symbol',
            'fa_datum_vystaveni' => 'invoice_accountant_edit_datum_vystaveni',
            'fa_datum_splatnosti' => 'invoice_accountant_edit_datum_splatnosti',
            'fa_datum_doruceni' => 'invoice_accountant_edit_datum_doruceni',
            'fa_typ' => 'invoice_accountant_edit_typ_faktury',
            'fa_strediska_kod' => 'invoice_accountant_edit_strediska'
        );
        
        // Pole vyžadující re-schválení věcné správnosti
        $fields_requiring_reapproval = array(
            'fa_castka', 'fa_cislo_vema', 'fa_strediska_kod', 'fa_typ',
            'fa_datum_vystaveni', 'fa_datum_splatnosti', 'fa_datum_doruceni'
        );
        
        // ✅ OPRAVA 2026-04-24: Normalizované porovnání aby se věcná správnost
        //    neresetovala falešně (např. fa_strediska_kod je v inputu array a v DB JSON string,
            //    data mohou přijít v různých formátech). Reset musí nastat POUZE pokud se hodnota
        //    reálně změnila.
        $normalizeForCompare = function($field, $value) {
            if ($value === null || $value === '') return '';
            // Pole strediska – porovnávat jako normalizovaný JSON array UPPERCASE stringů
            if ($field === 'fa_strediska_kod') {
                $arr = is_array($value) ? $value : json_decode($value, true);
                if (!is_array($arr)) $arr = array();
                $arr = array_map(function($k) { return strtoupper(trim((string)$k)); }, $arr);
                $arr = array_values(array_unique(array_filter($arr, function($k) { return $k !== ''; })));
                sort($arr);
                return json_encode($arr);
            }
            // Datumová pole – jen Y-m-d část
            if (in_array($field, array('fa_datum_vystaveni', 'fa_datum_splatnosti', 'fa_datum_doruceni'), true)) {
                $ts = strtotime((string)$value);
                return $ts ? date('Y-m-d', $ts) : trim((string)$value);
            }
            // Částka – float s 2 des. místy
            if ($field === 'fa_castka') {
                return number_format((float)$value, 2, '.', '');
            }
            // Ostatní – trim string
            return trim((string)$value);
        };
        
        // Detekce změny kritických polí
        $requires_reapproval = false;
        
        // 🆕 Force reset z frontendu (checkbox "Resetovat věcnou správnost")
        $forceReset = isset($input['force_vecna_reset']) && (int)$input['force_vecna_reset'] === 1;
        
        if ($forceReset) {
            error_log("🔴 UPDATE INVOICE #$invoice_id - FORCE RESET aktivní - věcná správnost bude vynulována bez ohledu na app settings");
            $requires_reapproval = true;
        } else {
            foreach ($fields_requiring_reapproval as $field) {
                if (array_key_exists($field, $input) && array_key_exists($field, $current_invoice)) {
                    $newNorm = $normalizeForCompare($field, $input[$field]);
                    $oldNorm = $normalizeForCompare($field, $current_invoice[$field]);
                    if ($newNorm !== $oldNorm) {
                        $editAllowed = false;
                        if ($field !== 'fa_castka' && $invoiceEditEnabled && isset($fieldSettingMap[$field]) && !empty($appSettings[$fieldSettingMap[$field]])) {
                            $editAllowed = true;
                        }
                        if ($editAllowed) {
                            error_log("✅ UPDATE INVOICE #$invoice_id - pole '$field' změněno, ale JE povoleno v settings - bez resetu");
                            continue;
                        }
                        $requires_reapproval = true;
                        error_log("🔄 REQUIRES REAPPROVAL: pole '$field' změněno ('$oldNorm' -> '$newNorm') pro fakturu #$invoice_id");
                        break;
                    }
                }
            }
        }
        
        // Automatické vynulování věcné správnosti při změně kritických polí
        $isExplicitVecnaUpdate = false;
        if (array_key_exists('vecna_spravnost_potvrzeno', $input)) {
            $newVecnaStatus = (int)$input['vecna_spravnost_potvrzeno'];
            $oldVecnaStatus = (int)$current_invoice['vecna_spravnost_potvrzeno'];
            if ($newVecnaStatus !== $oldVecnaStatus) {
                $isExplicitVecnaUpdate = true;
                error_log("🔍 UPDATE INVOICE #$invoice_id - Explicitní změna vecna_spravnost_potvrzeno ($oldVecnaStatus → $newVecnaStatus) - NEPROVÁDÍM reset");
            }
        }

        if ($requires_reapproval && (int)$current_invoice['vecna_spravnost_potvrzeno'] !== 0 && !$isExplicitVecnaUpdate) {
            $updateFields[] = 'vecna_spravnost_potvrzeno = ?';
            $updateValues[] = 0;
            $updateFields[] = 'potvrdil_vecnou_spravnost_id = ?';
            $updateValues[] = null;
            $updateFields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
            $updateValues[] = null;
            $updateFields[] = 'vecna_spravnost_duvod = ?';
            $updateValues[] = null;

            if ((int)$current_invoice['vecna_spravnost_potvrzeno'] === 2) {
                $updateFields[] = 'stav = ?';
                $updateValues[] = INVOICE_STATUS_REGISTERED;
                unset($input['stav']);
                error_log("🔄 UPDATE INVOICE #$invoice_id - Reset věcné správnosti zamítnuté faktury → stav V_RESENI → ZAEVIDOVANA");
            }

            unset($input['vecna_spravnost_potvrzeno']);
            unset($input['potvrdil_vecnou_spravnost_id']);
            unset($input['dt_potvrzeni_vecne_spravnosti']);
            unset($input['vecna_spravnost_duvod']);
        }
        
        // Automatické nastavení fa_datum_zaplaceni při změně fa_zaplacena na 1
        if (isset($input['fa_zaplacena']) && (int)$input['fa_zaplacena'] === 1) {
            if ((int)$current_invoice['fa_zaplacena'] === 0 && empty($current_invoice['fa_datum_zaplaceni'])) {
                $updateFields[] = 'fa_datum_zaplaceni = ?';
                $updateValues[] = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
            }
        }
        
        // Automatické vynulování fa_datum_zaplaceni při změně fa_zaplacena na 0
        if (isset($input['fa_zaplacena']) && (int)$input['fa_zaplacena'] === 0) {
            $updateFields[] = 'fa_datum_zaplaceni = ?';
            $updateValues[] = null;
        }
        
        // ✅ AUTOMATIKA: Pokud stav = 'ZAPLACENO' → nastavit fa_zaplacena = 1
        if (isset($input['stav']) && $input['stav'] === INVOICE_STATUS_PAID) {
            $updateFields[] = 'fa_zaplacena = ?';
            $updateValues[] = 1;
            // Nastavit datum zaplacení pokud ještě není
            if (empty($current_invoice['fa_datum_zaplaceni'])) {
                $updateFields[] = 'fa_datum_zaplaceni = ?';
                $updateValues[] = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
            }
        }
        
        // LP guard: kontrolovat pouze při skutečném přechodu do stavu "potvrzena" (0/2 -> 1).
        // Běžný update může posílat vecna_spravnost_potvrzeno beze změny a nesmí být blokován.
        $incoming_vecna_status_for_guard = array_key_exists('vecna_spravnost_potvrzeno', $input)
            ? (int)$input['vecna_spravnost_potvrzeno']
            : null;
        $current_vecna_status_for_guard = isset($current_invoice['vecna_spravnost_potvrzeno'])
            ? (int)$current_invoice['vecna_spravnost_potvrzeno']
            : 0;
        $is_transition_to_vecna_approved = ($incoming_vecna_status_for_guard === 1 && $current_vecna_status_for_guard !== 1);

        if ($is_transition_to_vecna_approved) {
            try {
                ensure_order_v2_lp_split_exists_for_vs_approval($db, $invoice_id, (int)$current_invoice['objednavka_id']);
            } catch (Exception $lpGuardError) {
                http_response_code(400);
                echo json_encode(array(
                    'status' => 'error',
                    'message' => $lpGuardError->getMessage()
                ));
                return;
            }
        }

        // ✅ AUTOMATIKA: Potvrzení nebo zamítnutí věcné správnosti → změnit stav POUZE pokud je aktuálně ZAEVIDOVANA
        if (isset($input['vecna_spravnost_potvrzeno']) && (int)$input['vecna_spravnost_potvrzeno'] !== 0) {
            if ($current_invoice['stav'] === INVOICE_STATUS_REGISTERED) {
                // Je ve stavu ZAEVIDOVANA → automaticky přepnout na VECNA_SPRAVNOST nebo V_RESENI
                $newStatus = ((int)$input['vecna_spravnost_potvrzeno'] === 1) ? INVOICE_STATUS_VERIFICATION : INVOICE_STATUS_IN_PROGRESS;
                $updateFields[] = 'stav = ?';
                $updateValues[] = $newStatus;
                $statusName = ((int)$input['vecna_spravnost_potvrzeno'] === 1) ? 'VECNA_SPRAVNOST' : 'V_RESENI';
            }
        }
        
        // Validace: datum vrácení musí být >= datum předání
        if (isset($input['fa_datum_predani_zam']) && isset($input['fa_datum_vraceni_zam'])) {
            $predani = strtotime($input['fa_datum_predani_zam']);
            $vraceni = strtotime($input['fa_datum_vraceni_zam']);
            
            if ($vraceni < $predani) {
                http_response_code(400);
                echo json_encode(array(
                    'status' => 'error',
                    'message' => 'Datum vrácení nemůže být dřívější než datum předání'
                ));
                return;
            }
        }
        
        // ✅ SPECIÁLNÍ ZPRACOVÁNÍ: objednavka_id a smlouva_id - povolí nastavit null pro unlink
        // ⚠️ KONTROLA: Zákaz odpojení pokud objednávka nebo faktura je ve stavu DOKONCENA
        if (array_key_exists('objednavka_id', $input)) {
            $new_objednavka_id = !empty($input['objednavka_id']) ? (int)$input['objednavka_id'] : null;
            
            // Pokud se odpojuje od objednávky (null) a aktuálně je přiřazena
            if ($new_objednavka_id === null && !empty($current_invoice['objednavka_id'])) {
                // Kontrola stavu faktury
                if (!empty($current_invoice['stav']) && $current_invoice['stav'] === 'DOKONCENA') {
                    http_response_code(400);
                    echo json_encode(array(
                        'status' => 'error',
                        'message' => 'Nelze odpojit fakturu ve stavu DOKONČENA. Prosím změňte nejprve stav faktury.'
                    ));
                    return;
                }
                
                // Kontrola stavu objednávky
                $stmt_check_order = $db->prepare("SELECT stav_workflow_kod FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1");
                $stmt_check_order->execute(array($current_invoice['objednavka_id']));
                $check_order = $stmt_check_order->fetch(PDO::FETCH_ASSOC);
                
                if ($check_order) {
                    $workflow_states = json_decode($check_order['stav_workflow_kod'], true);
                    if (is_array($workflow_states) && in_array('DOKONCENA', $workflow_states)) {
                        http_response_code(400);
                        echo json_encode(array(
                            'status' => 'error',
                            'message' => 'Nelze odpojit fakturu od objednávky ve stavu DOKONČENA. Prosím změňte nejprve stav objednávky.'
                        ));
                        return;
                    }
                }
                
                error_log("🔓 UNLINK: Odpojování faktury #{$invoice_id} od objednávky #{$current_invoice['objednavka_id']}");
            }
            
            $updateFields[] = 'objednavka_id = ?';
            $updateValues[] = $new_objednavka_id;
        }
        if (array_key_exists('smlouva_id', $input)) {
            $updateFields[] = 'smlouva_id = ?';
            $updateValues[] = !empty($input['smlouva_id']) ? (int)$input['smlouva_id'] : null;
        }
        
        foreach ($allowedFields as $field) {
            // Skip objednavka_id a smlouva_id - už zpracované výše
            if (in_array($field, array('objednavka_id', 'smlouva_id'))) {
                continue;
            }
            
            // ✅ OPRAVA: Používat array_key_exists() místo isset() aby se správně zpracovaly NULL hodnoty
            if (array_key_exists($field, $input)) {
                // 🔍 DEBUG: Log věcné správnosti
                if ($field === 'vecna_spravnost_umisteni_majetku' || $field === 'vecna_spravnost_poznamka') {
                }
                
                if ($field === 'fa_cislo_vema') {
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = trim($input[$field]);
                } else if (in_array($field, array('fa_dorucena', 'fa_zaplacena', 'vecna_spravnost_potvrzeno'))) {
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = (int)$input[$field];
                } else if (in_array($field, array('potvrdil_vecnou_spravnost_id', 'fa_predana_zam_id'))) {
                    // ✅ Pro ID pole: povolit NULL hodnoty
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = !empty($input[$field]) ? (int)$input[$field] : null;
                } else if (in_array($field, array('fa_datum_predani_zam', 'fa_datum_vraceni_zam', 
                                                    'dt_potvrzeni_vecne_spravnosti', 'fa_datum_zaplaceni'))) {
                    // ✅ Pro datumová pole: povolit NULL hodnoty
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = !empty($input[$field]) ? $input[$field] : null;
                } else if (in_array($field, array('vecna_spravnost_umisteni_majetku', 'vecna_spravnost_poznamka', 'vecna_spravnost_duvod'))) {
                    // ✅ Pro textová pole věcné správnosti: povolit prázdné stringy nebo NULL
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = ($input[$field] !== null && $input[$field] !== '') ? $input[$field] : null;
                } else if ($field === 'rozsirujici_data') {
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = is_array($input[$field]) ? json_encode($input[$field]) : $input[$field];
                } else {
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = $input[$field];
                }
            }
        }
        
        error_log("  Values: " . json_encode($updateValues));
        
        if (empty($updateFields)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Nebyla poskytnutá žádná data k aktualizaci'));
            return;
        }
        
        // ✅ AUTOMATIKA: Změna stavu faktury při potvrzení/zrušení věcné správnosti
        if (isset($input['vecna_spravnost_potvrzeno'])) {
            // Načíst aktuální stav faktury
            $stmt_current_stav = $db->prepare("SELECT stav FROM " . TBL_FAKTURY . " WHERE id = ?");
            $stmt_current_stav->execute(array($invoice_id));
            $current_stav_row = $stmt_current_stav->fetch(PDO::FETCH_ASSOC);
            
            if ($current_stav_row) {
                $current_stav = $current_stav_row['stav'];
                
                // Potvrzení věcné správnosti: ZAEVIDOVANA → VECNA_SPRAVNOST
                if ((int)$input['vecna_spravnost_potvrzeno'] === 1 && $current_stav === 'ZAEVIDOVANA') {
                    $updateFields[] = 'stav = ?';
                    $updateValues[] = 'VECNA_SPRAVNOST';
                    error_log("🔄 [Invoice Update] Auto změna stavu faktury #{$invoice_id}: ZAEVIDOVANA → VECNA_SPRAVNOST (potvrzena věcná správnost)");
                }

                // Zamítnutí věcné správnosti: ZAEVIDOVANA → V_RESENI
                if ((int)$input['vecna_spravnost_potvrzeno'] === 2 && $current_stav === 'ZAEVIDOVANA') {
                    $updateFields[] = 'stav = ?';
                    $updateValues[] = 'V_RESENI';
                    error_log("🔄 [Invoice Update] Auto změna stavu faktury #{$invoice_id}: ZAEVIDOVANA → V_RESENI (zamítnutá věcná správnost)");
                }
                
                // Zrušení věcné správnosti: VECNA_SPRAVNOST/V_RESENI → ZAEVIDOVANA
                if ((int)$input['vecna_spravnost_potvrzeno'] === 0 && ($current_stav === 'VECNA_SPRAVNOST' || $current_stav === 'V_RESENI')) {
                    $updateFields[] = 'stav = ?';
                    $updateValues[] = 'ZAEVIDOVANA';
                    error_log("🔙 [Invoice Update] Auto změna stavu faktury #{$invoice_id}: VECNA_SPRAVNOST → ZAEVIDOVANA (zrušena věcná správnost)");
                }
            }
        }
        
        // Vždy aktualizuj dt_aktualizace a aktualizoval_uzivatel_id
        $updateFields[] = 'dt_aktualizace = NOW()';
        $updateFields[] = 'aktualizoval_uzivatel_id = ?';
        $updateValues[] = $token_data['id'];
        
        $updateValues[] = $invoice_id;
        
        // ✅ Admin může aktualizovat i neaktivní faktury
        $sql_update = "UPDATE " . TBL_FAKTURY . " SET " . implode(', ', $updateFields) . " WHERE id = ?";
        if (!$is_admin) {
            $sql_update .= " AND aktivni = 1";
        }
        
        
        $stmt = $db->prepare($sql_update);
        $stmt->execute($updateValues);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nebyla nalezena nebo není aktivní'));
            return;
        }
        
        
        // =========================================================================
        // 🔄 SPECIÁLNÍ LOGIKA: ODPOJENÍ FAKTURY OD OBJEDNÁVKY
        // =========================================================================
        // ✅ POŽADAVEK: Po odpojení faktury zkontrolovat zbývající faktury objednávky.
        //    Pokud objednávka nemá žádnou jinou věcně zkontrolovanou fakturu,
        //    vrátit workflow do stavu FAKTURACE (odebrat VECNA_SPRAVNOST, ZKONTROLOVANA, DOKONCENA).
        
        $detached_from_order_id = null;
        if (array_key_exists('objednavka_id', $input) && 
            !empty($current_invoice['objednavka_id']) && 
            (empty($input['objednavka_id']) || $input['objednavka_id'] === null)) {
            
            $detached_from_order_id = (int)$current_invoice['objednavka_id'];
            error_log("🔓 UNLINK: Faktura #{$invoice_id} byla odpojena od objednávky #{$detached_from_order_id}");
            
            try {
                // Načíst aktuální stav objednávky
                $sql_order = "SELECT id, stav_workflow_kod FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1";
                $stmt_order = $db->prepare($sql_order);
                $stmt_order->execute(array($detached_from_order_id));
                $detached_order = $stmt_order->fetch(PDO::FETCH_ASSOC);
                
                if ($detached_order) {
                    // Zkontrolovat zbývající faktury objednávky
                    $sql_remaining = "SELECT id, vecna_spravnost_potvrzeno FROM " . TBL_FAKTURY . " 
                                     WHERE objednavka_id = ? AND aktivni = 1 AND id != ?";
                    $stmt_remaining = $db->prepare($sql_remaining);
                    $stmt_remaining->execute(array($detached_from_order_id, $invoice_id));
                    $remaining_invoices = $stmt_remaining->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Zjistit, zda existuje alespoň jedna věcně zkontrolovaná faktura
                    $has_verified_invoice = false;
                    foreach ($remaining_invoices as $inv) {
                        if ((int)$inv['vecna_spravnost_potvrzeno'] === 1) {
                            $has_verified_invoice = true;
                            break;
                        }
                    }
                    
                    // Pokud NENÍ žádná věcně zkontrolovaná faktura → vrátit workflow na FAKTURACE
                    if (!$has_verified_invoice) {
                        $workflow_states = json_decode($detached_order['stav_workflow_kod'], true);
                        if (!is_array($workflow_states)) {
                            $workflow_states = array();
                        }
                        
                        $original_workflow = implode(', ', $workflow_states);
                        
                        // Odebrat stavy VECNA_SPRAVNOST, ZKONTROLOVANA, DOKONCENA
                        $workflow_states = array_values(array_filter($workflow_states, function($s) {
                            return !in_array($s, array('VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA'));
                        }));
                        
                        // Ujistit se, že FAKTURACE je v workflow
                        if (!in_array('FAKTURACE', $workflow_states)) {
                            $workflow_states[] = 'FAKTURACE';
                        }
                        
                        // Seřadit workflow podle logického pořadí
                        $workflowOrder = array(
                            'NOVA', 'ODESLANA_KE_SCHVALENI', 'CEKA_SE', 'ZAMITNUTA', 'SCHVALENA',
                            'ROZPRACOVANA', 'ODESLANA', 'ZRUSENA', 'POTVRZENA', 'UVEREJNIT', 'NEUVEREJNIT', 
                            'UVEREJNENA', 'FAKTURACE', 'VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA'
                        );
                        
                        usort($workflow_states, function($a, $b) use ($workflowOrder) {
                            $indexA = array_search($a, $workflowOrder);
                            $indexB = array_search($b, $workflowOrder);
                            $indexA = ($indexA === false) ? 999 : $indexA;
                            $indexB = ($indexB === false) ? 999 : $indexB;
                            return $indexA - $indexB;
                        });
                        
                        $new_workflow_json = json_encode(array_values($workflow_states));
                        
                        // Nastavit stav_objednavky podle posledního workflow stavu
                        $last_workflow_code = end($workflow_states);
                        $stav_objednavky_text = 'Fakturace';
                        
                        if ($last_workflow_code === 'FAKTURACE') {
                            $stav_objednavky_text = 'Fakturace';
                        } else if ($last_workflow_code === 'UVEREJNENA') {
                            $stav_objednavky_text = 'Uveřejněna';
                        } else if ($last_workflow_code === 'SCHVALENA') {
                            $stav_objednavky_text = 'Schválena';
                        }
                        
                        // Aktualizovat objednávku
                        $sql_update_order = "UPDATE " . TBL_OBJEDNAVKY . " 
                                            SET stav_workflow_kod = ?, 
                                                stav_objednavky = ?,
                                                dt_aktualizace = NOW(),
                                                uzivatel_akt_id = ?
                                            WHERE id = ? AND aktivni = 1";
                        $stmt_update_order = $db->prepare($sql_update_order);
                        $stmt_update_order->execute(array(
                            $new_workflow_json,
                            $stav_objednavky_text,
                            $token_data['id'],
                            $detached_from_order_id
                        ));
                        
                        error_log("🔙 UNLINK: Objednávka #{$detached_from_order_id} nemá žádnou věcně zkontrolovanou fakturu → workflow vráceno na FAKTURACE");
                        error_log("   Původní workflow: [{$original_workflow}]");
                        error_log("   Nové workflow: [" . implode(', ', $workflow_states) . "]");
                    } else {
                        error_log("✅ UNLINK: Objednávka #{$detached_from_order_id} má ještě " . count($remaining_invoices) . " faktur(u), z toho alespoň jednu věcně zkontrolovanou → workflow se nemění");
                    }
                }
            } catch (Exception $unlink_error) {
                error_log("⚠️ UNLINK: Chyba při aktualizaci workflow po odpojení faktury: " . $unlink_error->getMessage());
                // Neblokovat úspěch faktury, jen zalogovat chybu
            }

            try {
                sync_order_v2_invoice_tracking_metadata($db, $detached_from_order_id, (int)$token_data['id']);
            } catch (Exception $tracking_error) {
                error_log("⚠️ UNLINK: Chyba při synchronizaci fakturace metadata objednávky #{$detached_from_order_id}: " . $tracking_error->getMessage());
            }
        }
        
        // =========================================================================
        // 🔄 AUTOMATICKÁ ZMĚNA WORKFLOW OBJEDNÁVKY PO UPDATE FAKTURY
        // =========================================================================
        // ✅ POŽADAVEK: Pokud uživatel potvrdí věcnou správnost faktury v modulu Faktury,
        //    zkontrolovat VŠECHNY faktury objednávky a pokud jsou všechny zkontrolované,
        //    automaticky přidat ZKONTROLOVANA do workflow objednávky.
        // ✅ REVERSE: Pokud se upraví kritická pole faktury nebo přidá nová faktura,
        //    vrátit objednávku ze stavu ZKONTROLOVANA zpět na VECNA_SPRAVNOST.
        
        $order_id = (int)$current_invoice['objednavka_id'];
        $incoming_vecna_status = isset($input['vecna_spravnost_potvrzeno']) ? (int)$input['vecna_spravnost_potvrzeno'] : null;
        $skip_legacy_order_workflow_update = false;

        if ($order_id > 0 && $detached_from_order_id === null) {
            try {
                if ($incoming_vecna_status === 1) {
                    updateWorkflowAfterVecnaSpravnostApproved($db, $order_id, array(
                        'token_data' => $token_data,
                        'endpoint' => 'order-v2/invoices/update',
                        'action_type' => 'APPROVE',
                        'note' => 'Workflow objednávky po potvrzení věcné správnosti faktury v modulu Faktury'
                    ));
                    $skip_legacy_order_workflow_update = true;
                    error_log("✅ INVOICE MODULE: Workflow helper potvrzení VS spuštěn pro objednávku #{$order_id} po potvrzení faktury #{$invoice_id}");
                } elseif ($incoming_vecna_status === 2 || $incoming_vecna_status === 0 || $requires_reapproval) {
                    removeZkontrolovanaFromWorkflow($db, $order_id, array(
                        'token_data' => $token_data,
                        'endpoint' => 'order-v2/invoices/update',
                        'action_type' => ($incoming_vecna_status === 2 ? 'REJECT' : 'RESET'),
                        'note' => ($incoming_vecna_status === 2)
                            ? 'Workflow objednávky po zamítnutí věcné správnosti faktury v modulu Faktury'
                            : 'Workflow objednávky po resetu věcné správnosti faktury v modulu Faktury'
                    ));
                    $skip_legacy_order_workflow_update = true;
                    error_log("🔄 INVOICE MODULE: Workflow helper resetu VS spuštěn pro objednávku #{$order_id} po změně faktury #{$invoice_id} (status=" . ($incoming_vecna_status === null ? 'NULL' : $incoming_vecna_status) . ", requires_reapproval=" . ($requires_reapproval ? 'true' : 'false') . ")");
                }
            } catch (Exception $order_update_error) {
                error_log("⚠️ INVOICE MODULE: Chyba při centralizované aktualizaci workflow objednávky: " . $order_update_error->getMessage());
            }
        }
        
        // Pokud byla faktura odpojena, přeskočit běžnou workflow logiku (už jsme ji zpracovali výše)
        if ($order_id > 0 && $detached_from_order_id === null && !$skip_legacy_order_workflow_update) {
            try {
                // Načíst aktuální stav objednávky
                $sql_order = "SELECT id, stav_workflow_kod FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1";
                $stmt_order = $db->prepare($sql_order);
                $stmt_order->execute(array($order_id));
                $order = $stmt_order->fetch(PDO::FETCH_ASSOC);
                
                if ($order) {
                    // Parsovat workflow stavy
                    $workflow_states = json_decode($order['stav_workflow_kod'], true);
                    if (!is_array($workflow_states)) {
                        $workflow_states = array();
                    }
                    
                    $workflow_changed = false;
                    $needCompletionReset = false;
                    
                    // PRAVIDLO 1: Pokud se potvrdila věcná správnost → zkontrolovat všechny faktury
                    if (isset($input['vecna_spravnost_potvrzeno']) && (int)$input['vecna_spravnost_potvrzeno'] === 1) {
                        // Načíst všechny faktury objednávky
                        $sql_all_invoices = "SELECT id, vecna_spravnost_potvrzeno FROM " . TBL_FAKTURY . " 
                                             WHERE objednavka_id = ? AND aktivni = 1";
                        $stmt_all = $db->prepare($sql_all_invoices);
                        $stmt_all->execute(array($order_id));
                        $all_invoices = $stmt_all->fetchAll(PDO::FETCH_ASSOC);
                        
                        // Zkontrolovat, zda VŠECHNY faktury mají vecna_spravnost_potvrzeno = 1
                        $all_approved = true;
                        foreach ($all_invoices as $inv) {
                            if ((int)$inv['vecna_spravnost_potvrzeno'] !== 1) {
                                $all_approved = false;
                                break;
                            }
                        }
                        
                        if ($all_approved && count($all_invoices) > 0) {
                            // ✅ Všechny faktury jsou zkontrolované → přidat ZKONTROLOVANA
                            if (!in_array('ZKONTROLOVANA', $workflow_states)) {
                                $workflow_states[] = 'ZKONTROLOVANA';
                                $workflow_changed = true;
                                $invoice_count = count($all_invoices);
                                error_log("✅ INVOICE MODULE: Všechny faktury ({$invoice_count}x) objednávky #{$order_id} jsou zkontrolované → přidán stav ZKONTROLOVANA");
                            }
                        } else {
                            // ❌ Ne všechny faktury jsou zkontrolované → odebrat ZKONTROLOVANA
                            $had_zkontrolovana = in_array('ZKONTROLOVANA', $workflow_states);
                            $workflow_states = array_values(array_filter($workflow_states, function($s) {
                                return $s !== 'ZKONTROLOVANA';
                            }));
                            if ($had_zkontrolovana) {
                                $workflow_changed = true;
                                error_log("🔓 INVOICE MODULE: Ne všechny faktury objednávky #{$order_id} jsou zkontrolované → odebrán stav ZKONTROLOVANA");
                            }
                        }
                    }
                    
                    // PRAVIDLO 2: Pokud se změnila kritická pole / forceReset → vrátit objednávku na VECNA_SPRAVNOST
                    // ⚠️ KRITICKÉ: Při zrušení věcné správnosti VŽDY:
                    //  - odebrat ZKONTROLOVANA i DOKONCENA z workflow_stav_kod
                    //  - resetovat completion fields (potvrzeni_dokonceni_objednavky, dokoncil_id, dt_dokonceni)
                    $needCompletionReset = false;
                    if ($requires_reapproval) {
                        error_log("🔙 INVOICE MODULE: requires_reapproval=TRUE pro fakturu #{$invoice_id} → odebírám ZKONTROLOVANA+DOKONCENA z workflow objednávky #{$order_id}");
                        
                        // Odebrat ZKONTROLOVANA i DOKONCENA z workflow_states
                        $had_zkontrolovana = in_array('ZKONTROLOVANA', $workflow_states);
                        $had_dokoncena = in_array('DOKONCENA', $workflow_states);
                        
                        $workflow_states = array_values(array_filter($workflow_states, function($s) {
                            return $s !== 'ZKONTROLOVANA' && $s !== 'DOKONCENA';
                        }));
                        
                        if ($had_zkontrolovana || $had_dokoncena) {
                            $workflow_changed = true;
                            $needCompletionReset = true;
                            error_log("🔙 INVOICE MODULE: Odebrány stavy " . ($had_zkontrolovana ? "ZKONTROLOVANA " : "") . ($had_dokoncena ? "DOKONCENA " : "") . "→ workflow vrácen na VECNA_SPRAVNOST, completion fields budou resetovány");
                        }
                    }
                    
                    // Pokud se workflow změnil → uložit do DB
                    if ($workflow_changed) {
                        // Ujistit se, že máme VECNA_SPRAVNOST před ZKONTROLOVANA
                        if (!in_array('VECNA_SPRAVNOST', $workflow_states)) {
                            // Přidat VECNA_SPRAVNOST před ZKONTROLOVANA
                            $zkontrolovana_index = array_search('ZKONTROLOVANA', $workflow_states);
                            if ($zkontrolovana_index !== false) {
                                array_splice($workflow_states, $zkontrolovana_index, 0, 'VECNA_SPRAVNOST');
                            } else {
                                $workflow_states[] = 'VECNA_SPRAVNOST';
                            }
                        }
                        
                        // Aktualizovat workflow objednávky
                        $new_workflow_json = json_encode($workflow_states);
                        
                        // Určit textový stav podle posledního workflow kódu
                        $last_workflow_code = end($workflow_states);
                        $stav_objednavky_text = 'Věcná správnost'; // Výchozí
                        if ($last_workflow_code === 'ZKONTROLOVANA') {
                            $stav_objednavky_text = 'Zkontrolována';
                        } else if ($last_workflow_code === 'VECNA_SPRAVNOST') {
                            $stav_objednavky_text = 'Věcná správnost';
                        }
                        
                        // ⚠️ KRITICKÉ: Pokud se odebrala ZKONTROLOVANA/DOKONCENA → resetovat completion fields
                        if ($needCompletionReset) {
                            error_log("🔄 INVOICE MODULE: Resetuji completion fields při UPDATE workflow objednávky #{$order_id}");
                            $sql_update_order = "UPDATE " . TBL_OBJEDNAVKY . " 
                                                 SET stav_workflow_kod = ?, 
                                                     stav_objednavky = ?,
                                                     potvrzeni_dokonceni_objednavky = 0,
                                                     dokoncil_id = NULL,
                                                     dt_dokonceni = NULL,
                                                     dt_aktualizace = NOW(),
                                                     uzivatel_akt_id = ?
                                                 WHERE id = ? AND aktivni = 1";
                            $stmt_update_order = $db->prepare($sql_update_order);
                            $stmt_update_order->execute(array(
                                $new_workflow_json,
                                $stav_objednavky_text,
                                $token_data['id'],
                                $order_id
                            ));
                        } else {
                            // Standardní update bez reset completion fields
                            $sql_update_order = "UPDATE " . TBL_OBJEDNAVKY . " 
                                                 SET stav_workflow_kod = ?, 
                                                     stav_objednavky = ?,
                                                     dt_aktualizace = NOW(),
                                                     uzivatel_akt_id = ?
                                                 WHERE id = ? AND aktivni = 1";
                            $stmt_update_order = $db->prepare($sql_update_order);
                            $stmt_update_order->execute(array(
                                $new_workflow_json,
                                $stav_objednavky_text,
                                $token_data['id'],
                                $order_id
                            ));
                        }
                        
                        error_log("📋 INVOICE MODULE: Workflow objednávky #{$order_id} aktualizováno: " . implode(' → ', $workflow_states));
                    }
                }
            } catch (Exception $order_update_error) {
                // Neblokovat úspěch faktury, jen zalogovat chybu
                error_log("⚠️ INVOICE MODULE: Chyba při aktualizaci workflow objednávky: " . $order_update_error->getMessage());
            }
        }
        
        // =========================================================================
        // 🔔 NOTIFIKACE: Věcná správnost potvrzena
        // =========================================================================
        // ✅ TRIGGER: INVOICE_MATERIAL_CHECK_APPROVED - pokud se potvrdila věcná správnost
        if (isset($input['vecna_spravnost_potvrzeno']) && (int)$input['vecna_spravnost_potvrzeno'] === 1) {
            // Zkontrolovat, zda nebyla již dříve potvrzena (předchozí stav byl 0)
            if ((int)$current_invoice['vecna_spravnost_potvrzeno'] === 0) {
                try {
                    require_once __DIR__ . '/notificationHandlers.php';
                    triggerNotification($db, 'INVOICE_MATERIAL_CHECK_APPROVED', $invoice_id, $token_data['id']);
                    error_log("🔔 ORDER FORM: Triggered INVOICE_MATERIAL_CHECK_APPROVED for invoice #{$invoice_id}");
                } catch (Exception $e) {
                    error_log("⚠️ ORDER FORM: Notification trigger failed: " . $e->getMessage());
                }
            }
        }
        
        // ✅ TRIGGER 2026-04-24: INVOICE_MATERIAL_CHECK_REQUESTED - pokud došlo ke ZRUŠENÍ
        //    dříve potvrzené věcné správnosti kvůli změně kritických polí (viz $requires_reapproval).
        //    Pravidlo uživatele: opakovaná notifikace jen tehdy, když se skutečně zrušilo potvrzení.
        if ($requires_reapproval && (int)$current_invoice['vecna_spravnost_potvrzeno'] === 1) {
            try {
                require_once __DIR__ . '/notificationHandlers.php';
                triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', $invoice_id, $token_data['id']);
                error_log("🔔 ORDER FORM: Triggered INVOICE_MATERIAL_CHECK_REQUESTED (reset po změně polí) for invoice #{$invoice_id}");
            } catch (Exception $e) {
                error_log("⚠️ ORDER FORM: Notification trigger (reset) failed: " . $e->getMessage());
            }
        }
        
        // Return updated fields for confirmation
        $updatedFieldNames = array();
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $updatedFieldNames[] = $field;
            }
        }
        
        // 🔄 AUTO PŘEPOČET čerpání smluv po aktualizaci faktury
        // Přepočítáme, pokud se změnila částka, smlouva nebo objednávka
        $contractRelevantFields = array('fa_castka', 'smlouva_id', 'objednavka_id');
        $shouldRecalculate = false;
        foreach ($contractRelevantFields as $field) {
            if (isset($input[$field])) {
                $shouldRecalculate = true;
                break;
            }
        }
        
        if ($shouldRecalculate) {
            // Načíst aktuální data faktury po UPDATE (mohou se změnit smlouva_id nebo objednavka_id)
            $stmt_updated = $db->prepare("SELECT objednavka_id, smlouva_id FROM " . TBL_FAKTURY . " WHERE id = ?");
            $stmt_updated->execute(array($invoice_id));
            $updated_invoice = $stmt_updated->fetch(PDO::FETCH_ASSOC);
            
            if ($updated_invoice) {
                autoRecalculateContractSpendingForInvoice($invoice_id, $updated_invoice);
            }
        }
        
        // 🔄 AUTO PŘEPOČET LP čerpání po aktualizaci faktury (zejména po potvrzení věcné správnosti)
        // Přepočítáme, pokud se změnila částka, věcná správnost nebo LP rozpis
        $lpRelevantFields = array('fa_castka', 'vecna_spravnost_potvrzeno', 'objednavka_id');
        $shouldRecalculateLP = false;
        foreach ($lpRelevantFields as $field) {
            if (isset($input[$field])) {
                $shouldRecalculateLP = true;
                break;
            }
        }
        
        if ($shouldRecalculateLP) {
            try {
                error_log("🔄 [Invoice Update] Spouštím přepočet LP pro fakturu #{$invoice_id}");
                
                // Načíst aktuální data faktury včetně objednávky
                $stmt_lp = $db->prepare("
                    SELECT f.id, f.objednavka_id, o.financovani 
                    FROM " . TBL_FAKTURY . " f
                    LEFT JOIN " . TBL_OBJEDNAVKY . " o ON f.objednavka_id = o.id
                    WHERE f.id = ?
                ");
                $stmt_lp->execute(array($invoice_id));
                $invoice_lp_data = $stmt_lp->fetch(PDO::FETCH_ASSOC);
                
                $lp_ids_to_recalc = array();
                
                // 1. Pokud má faktura objednávku s LP financováním → načíst LP kódy
                if ($invoice_lp_data && !empty($invoice_lp_data['objednavka_id']) && !empty($invoice_lp_data['financovani'])) {
                    $financovani = json_decode($invoice_lp_data['financovani'], true);
                    if ($financovani && isset($financovani['typ']) && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                        $lp_ids_to_recalc = array_merge($lp_ids_to_recalc, $financovani['lp_kody']);
                        error_log("🔍 [Invoice Update] Nalezeno " . count($financovani['lp_kody']) . " LP z objednávky #{$invoice_lp_data['objednavka_id']}");
                    }
                }
                
                // 2. Odborové faktury - načíst LP z 25a_odbory_lp_prirazeni
                $stmt_odbory = $db->prepare("SELECT DISTINCT lp_id FROM " . TBL_ODBORY_LP_PRIRAZENI . " WHERE faktura_id = ?");
                $stmt_odbory->execute(array($invoice_id));
                while ($row = $stmt_odbory->fetch(PDO::FETCH_ASSOC)) {
                    if (!in_array($row['lp_id'], $lp_ids_to_recalc)) {
                        $lp_ids_to_recalc[] = $row['lp_id'];
                    }
                }
                if ($stmt_odbory->rowCount() > 0) {
                    error_log("🔍 [Invoice Update] Nalezeno " . $stmt_odbory->rowCount() . " odborových LP pro fakturu #{$invoice_id}");
                }
                
                // 3. Přepočítat všechny nalezené LP
                if (!empty($lp_ids_to_recalc)) {
                    foreach ($lp_ids_to_recalc as $lp_id) {
                        prepocetCerpaniPodleIdLP_PDO($db, (int)$lp_id, null);
                        error_log("✅ [Invoice Update] LP #{$lp_id} přepočítáno");
                    }
                    error_log("✅ [Invoice Update] Celkem přepočítáno " . count($lp_ids_to_recalc) . " LP pro fakturu #{$invoice_id}");
                } else {
                }
                
            } catch (Exception $lp_error) {
                // Neblokovat úspěch faktury, jen zalogovat chybu
                error_log("⚠️ [Invoice Update] Chyba při přepočtu LP: " . $lp_error->getMessage());
            }
        }
        
        // === AUDIT LOG: field-level diff faktury z order-v2 modulu (fail-safe) ===
        try {
            if (function_exists('audit_log_field_changes')) {
                $audit_new_stmt = $db->prepare("SELECT * FROM " . TBL_FAKTURY . " WHERE id = ? LIMIT 1");
                $audit_new_stmt->execute(array($invoice_id));
                $audit_new_invoice = $audit_new_stmt->fetch(PDO::FETCH_ASSOC) ?: array();

                $audit_batch = audit_log_field_changes(
                    $db, $token_data, 'FAKTURA', $invoice_id, 'order-v2/invoices/update',
                    (array)$current_invoice, (array)$audit_new_invoice
                );

                $audit_incomingVecna = array_key_exists('vecna_spravnost_potvrzeno', $input) ? (int)$input['vecna_spravnost_potvrzeno'] : null;
                $audit_oldVecna = (int)($current_invoice['vecna_spravnost_potvrzeno'] ?? 0);
                if ($audit_incomingVecna !== null && $audit_incomingVecna !== $audit_oldVecna && function_exists('audit_log_action')) {
                    if ($audit_incomingVecna === 1) {
                        audit_log_action($db, $token_data, 'FAKTURA', $invoice_id, 'APPROVE', 'order-v2/invoices/update', 'Potvrzení věcné správnosti', $audit_batch);
                    } elseif ($audit_incomingVecna === 2) {
                        audit_log_action($db, $token_data, 'FAKTURA', $invoice_id, 'REJECT', 'order-v2/invoices/update', 'Zamítnutí věcné správnosti', $audit_batch);
                    } elseif ($audit_incomingVecna === 0) {
                        audit_log_action($db, $token_data, 'FAKTURA', $invoice_id, 'UPDATE', 'order-v2/invoices/update', 'Reset věcné správnosti', $audit_batch);
                    }
                } elseif ($requires_reapproval && $audit_oldVecna !== 0 && function_exists('audit_log_action')) {
                    audit_log_action($db, $token_data, 'FAKTURA', $invoice_id, 'UPDATE', 'order-v2/invoices/update', 'Automatický reset věcné správnosti (změna kritického pole)', $audit_batch);
                }
            }
        } catch (Exception $ae) { error_log('[AUDIT] order_v2_update_invoice audit error: ' . $ae->getMessage()); }

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Faktura byla úspěšně aktualizována',
            'data' => array(
                'invoice_id' => $invoice_id,
                'updated_fields' => $updatedFieldNames,
                'fa_datum_splatnosti' => isset($input['fa_datum_splatnosti']) ? $input['fa_datum_splatnosti'] : null,
                'vecna_spravnost_reset' => $requires_reapproval && (int)$current_invoice['vecna_spravnost_potvrzeno'] === 1
            )
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci faktury: ' . $e->getMessage()));
    }
}

/**
 * DELETE /order-v2/invoices/{id}
 * Smazání faktury (soft delete - nastaví aktivni = 0)
 * 
 * @param array $input - Vstupní data obsahující invoice_id
 * @param array $config - Databázová konfigurace
 * @param array $queries - SQL dotazy (nepoužito)
 * 
 * PHP 5.6 Compatible - array() syntax, PDO exceptions
 */
function handle_order_v2_delete_invoice($input, $config, $queries) {
    
    // Token verification - V2 enhanced
    try {
        $token_data = verify_token_v2($input['username'], $input['token']);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Token verification failed'));
        return;
    }
    
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    $hard_delete = isset($input['hard_delete']) ? (int)$input['hard_delete'] : 0;
    
    if ($invoice_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID faktury'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        $db->beginTransaction();
        
        // Kontrola existence faktury (LEFT JOIN - vazba na objednávku není povinná)
        // Admin může mazat i neaktivní faktury, běžný uživatel jen aktivní
        $sql_check = "SELECT f.id, f.objednavka_id, f.smlouva_id, f.vytvoril_uzivatel_id, f.aktivni, o.uzivatel_id as objednavka_uzivatel_id
                      FROM " . TBL_FAKTURY . " f
                      LEFT JOIN " . TBL_OBJEDNAVKY . " o ON f.objednavka_id = o.id
                      WHERE f.id = ?";
        
        $stmt_check = $db->prepare($sql_check);
        $stmt_check->execute(array($invoice_id));
        $invoice = $stmt_check->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nenalezena'));
            return;
        }
        
        // Kontrola oprávnění - ADMIN může mazat vše, invoice_manage může faktury bez přiřazení
        $is_admin = isset($token_data['is_admin']) && $token_data['is_admin'] === true;
        $current_user_id = (int)$token_data['id']; // Backward compatible - 'id' je vždy přítomné
        
        // 🔍 DEBUG: Detailní log token_data
        error_log("🔍 is_admin check: isset=" . (isset($token_data['is_admin']) ? 'YES' : 'NO') . 
                  ", value=" . (isset($token_data['is_admin']) ? var_export($token_data['is_admin'], true) : 'N/A') .
                  ", strict_check=" . ($is_admin ? 'TRUE' : 'FALSE'));
        
        // ✅ Kontrola práva INVOICE_MANAGE přes NOVÝ SYSTÉM (25_role_prava + 25_prava)
        $has_invoice_manage = false;
        if (!$is_admin) {
            $prava_sql = "SELECT DISTINCT p.kod_prava 
                         FROM " . TBL_PRAVA . " p
                         INNER JOIN " . TBL_ROLE_PRAVA . " rp ON rp.pravo_id = p.id
                         INNER JOIN " . TBL_UZIVATELE_ROLE . " ur ON ur.role_id = rp.role_id
                         WHERE ur.uzivatel_id = ? AND p.kod_prava = 'INVOICE_MANAGE'";
            $prava_stmt = $db->prepare($prava_sql);
            $prava_stmt->execute(array($current_user_id));
            $has_invoice_manage = ($prava_stmt->rowCount() > 0);
        }
        
        // DEBUG: Log pro debugging
        
        // Neaktivní faktury může mazat pouze ADMIN
        if ($invoice['aktivni'] == 0 && !$is_admin) {
            $db->rollBack();
            http_response_code(403);
            echo json_encode(array('status' => 'error', 'message' => 'Neaktivní faktury může mazat pouze administrátor'));
            return;
        }
        
        // HARD DELETE - pouze ADMIN (SUPERADMIN nebo ADMINISTRATOR)
        // INVOICE_MANAGE může mazat soft delete, ale NE hard delete
        if ($hard_delete === 1 && !$is_admin) {
            $db->rollBack();
            http_response_code(403);
            echo json_encode(array('status' => 'error', 'message' => 'Hard delete může provést pouze administrátor (SUPERADMIN/ADMINISTRATOR)'));
            return;
        }
        
        // Faktura BEZ přiřazení (ani OBJ ani SML) - může smazat ADMIN nebo INVOICE_MANAGE
        $is_without_assignment = (empty($invoice['objednavka_id']) || $invoice['objednavka_id'] == 0) && 
                                  (empty($invoice['smlouva_id']) || $invoice['smlouva_id'] == 0);
        
        if (!$is_admin && !$has_invoice_manage) {
            // Non-admin bez invoice_manage: kontrola vlastnictví
            // 1. Má objednávku? → musí být vlastníkem objednávky
            // 2. Nemá objednávku, ale má vytvoril_uzivatel_id? → musí být tvůrce
            // 3. Nemá žádnou vazbu (testovací data)? → povolit komukoli
            if (!empty($invoice['objednavka_uzivatel_id'])) {
                // Vazba na objednávku existuje
                if ((int)$invoice['objednavka_uzivatel_id'] !== $current_user_id) {
                    $db->rollBack();
                    http_response_code(403);
                    echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění smazat tuto fakturu (vlastník objednávky)'));
                    return;
                }
            } elseif (!empty($invoice['vytvoril_uzivatel_id'])) {
                // Nemá objednávku, ale má tvůrce
                if ((int)$invoice['vytvoril_uzivatel_id'] !== $current_user_id) {
                    $db->rollBack();
                    http_response_code(403);
                    echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění smazat tuto fakturu (tvůrce)'));
                    return;
                }
            }
            // Jinak (nemá žádnou vazbu) → povolit komukoli smazat (testovací data)
        }
        // Admin může smazat cokoliv, invoice_manage může faktury bez přiřazení
        
        if ($hard_delete === 1) {
            // ========== HARD DELETE ==========
            // 1. Načtení příloh před smazáním (pro smazání souborů z disku)
            $sql_get_attachments = "SELECT systemova_cesta FROM " . TBL_FAKTURY_PRILOHY . " WHERE faktura_id = ?";
            $stmt_get_att = $db->prepare($sql_get_attachments);
            $stmt_get_att->execute(array($invoice_id));
            $attachments = $stmt_get_att->fetchAll(PDO::FETCH_ASSOC);
            
            // 2. Smazání příloh z databáze
            $sql_delete_att = "DELETE FROM " . TBL_FAKTURY_PRILOHY . " WHERE faktura_id = ?";
            $stmt_del_att = $db->prepare($sql_delete_att);
            $stmt_del_att->execute(array($invoice_id));
            
            // 3. Smazání souborů z disku
            foreach ($attachments as $attachment) {
                $file_path = $attachment['systemova_cesta'];
                if (!empty($file_path) && file_exists($file_path)) {
                    @unlink($file_path); // @ suppress warnings if file doesn't exist
                }
            }
            
            // 4. Smazání faktury z databáze (HARD DELETE)
            $sql_delete = "DELETE FROM " . TBL_FAKTURY . " WHERE id = ?";
            $stmt_delete = $db->prepare($sql_delete);
            $stmt_delete->execute(array($invoice_id));
            
            $message = 'Faktura včetně příloh byla trvale smazána (z DB i z disku)';
            
        } else {
            // ========== SOFT DELETE (default) ==========
            // 1. Soft delete faktury - nastavení aktivni = 0
            // Admin může mazat i už neaktivní faktury (pro konzistenci), běžný uživatel jen aktivní
            if ($is_admin) {
                // Admin: Update bez kontroly aktivni (může "přemazat" již neaktivní fakturu)
                $sql_update = "UPDATE " . TBL_FAKTURY . " SET aktivni = 0, dt_aktualizace = NOW() WHERE id = ?";
            } else {
                // Non-admin: Jen aktivní faktury
                $sql_update = "UPDATE " . TBL_FAKTURY . " SET aktivni = 0, dt_aktualizace = NOW() WHERE id = ? AND aktivni = 1";
            }
            $stmt_update = $db->prepare($sql_update);
            $stmt_update->execute(array($invoice_id));
            
            if ($stmt_update->rowCount() === 0) {
                $db->rollBack();
                http_response_code(404);
                echo json_encode(array('status' => 'error', 'message' => 'Faktura nenalezena nebo již byla smazána'));
                return;
            }
            
            // 2. Soft delete příloh - nastavení jako neaktivní (pokud má tabulka sloupec aktivni)
            // Poznámka: Přílohy v DB zůstanou, soubory na disku zůstanou
            $sql_deactivate_att = "UPDATE " . TBL_FAKTURY_PRILOHY . " SET dt_aktualizace = NOW() WHERE faktura_id = ?";
            $stmt_deact_att = $db->prepare($sql_deactivate_att);
            $stmt_deact_att->execute(array($invoice_id));
            
            $message = 'Faktura byla označena jako neaktivní (přílohy zůstaly v DB)';
        }
        
        // 🔄 AUTO PŘEPOČET čerpání smluv po smazání faktury
        // Používáme $invoice data načtená na začátku (obsahuje objednavka_id i smlouva_id)
        autoRecalculateContractSpendingForInvoice($invoice_id, array(
            'objednavka_id' => $invoice['objednavka_id'],
            'smlouva_id' => isset($invoice['smlouva_id']) ? $invoice['smlouva_id'] : null
        ));
        
        // 🔄 AUTO PŘEPOČET LP čerpání po smazání faktury
        try {
            error_log("🔄 [Invoice Delete] Spouštím přepočet LP pro smazanou fakturu #{$invoice_id}");
            
            $lp_ids_to_recalc = array();
            
            // 1. Načíst LP z objednávky (pokud existuje)
            if (!empty($invoice['objednavka_id'])) {
                $stmt_ord = $db->prepare("SELECT financovani FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                $stmt_ord->execute(array($invoice['objednavka_id']));
                $order_data = $stmt_ord->fetch(PDO::FETCH_ASSOC);
                
                if ($order_data && !empty($order_data['financovani'])) {
                    $financovani = json_decode($order_data['financovani'], true);
                    if ($financovani && isset($financovani['typ']) && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                        $lp_ids_to_recalc = $financovani['lp_kody'];
                    }
                }
            }
            
            // 2. Odborové faktury - načíst LP z 25a_odbory_lp_prirazeni
            $stmt_odbory = $db->prepare("SELECT DISTINCT lp_id FROM " . TBL_ODBORY_LP_PRIRAZENI . " WHERE faktura_id = ?");
            $stmt_odbory->execute(array($invoice_id));
            while ($row = $stmt_odbory->fetch(PDO::FETCH_ASSOC)) {
                if (!in_array($row['lp_id'], $lp_ids_to_recalc)) {
                    $lp_ids_to_recalc[] = $row['lp_id'];
                }
            }
            
            // 3. Přepočítat všechny nalezené LP
            if (!empty($lp_ids_to_recalc)) {
                foreach ($lp_ids_to_recalc as $lp_id) {
                    prepocetCerpaniPodleIdLP_PDO($db, (int)$lp_id, null);
                }
                error_log("✅ [Invoice Delete] Přepočítáno " . count($lp_ids_to_recalc) . " LP po smazání faktury #{$invoice_id}");
            }
        } catch (Exception $lp_error) {
            error_log("⚠️ [Invoice Delete] Chyba při přepočtu LP: " . $lp_error->getMessage());
        }

        if (!empty($invoice['objednavka_id'])) {
            try {
                sync_order_v2_invoice_tracking_metadata($db, (int)$invoice['objednavka_id'], $current_user_id);
            } catch (Exception $tracking_error) {
                error_log("⚠️ [Invoice Delete] Chyba při synchronizaci fakturace metadata objednávky #" . (int)$invoice['objednavka_id'] . ": " . $tracking_error->getMessage());
            }
        }
        
        $db->commit();
        
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'message' => $message,
            'data' => array(
                'invoice_id' => $invoice_id,
                'hard_delete' => $hard_delete === 1
            )
        ));
        
    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání faktury: ' . $e->getMessage()));
    }
}

/**
 * POST - Kontrola existence čísla faktury (fa_cislo_vema)
 * Endpoint: order-v2/invoices/check-duplicate
 * POST: {token, username, fa_cislo_vema, exclude_invoice_id (optional)}
 * 
 * @param array $input POST data including token, username, fa_cislo_vema
 * @param array $config Database configuration
 * @return JSON Response with exists flag and invoice details if found
 */
function handle_order_v2_check_duplicate_invoice($input, $config, $queries) {
    // Token verification
    $token_data = verify_token_v2($input['username'], $input['token']);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    // Validate fa_cislo_vema
    if (!isset($input['fa_cislo_vema']) || trim($input['fa_cislo_vema']) === '') {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí číslo faktury'));
        return;
    }
    
    $fa_cislo_vema = trim($input['fa_cislo_vema']);
    $exclude_invoice_id = isset($input['exclude_invoice_id']) && (int)$input['exclude_invoice_id'] > 0 
        ? (int)$input['exclude_invoice_id'] 
        : null;
    
    try {
        $db = get_db($config);
        
        // Check if fa_cislo_vema already exists (exclude current invoice if editing)
        // JOIN s tabulkou uživatelů pro získání jména
        $sql_check = "SELECT 
                        f.id, 
                        f.fa_cislo_vema, 
                        f.objednavka_id, 
                        f.fa_castka, 
                        f.fa_datum_vystaveni, 
                        f.fa_datum_splatnosti,
                        u.jmeno,
                        u.prijmeni,
                        CONCAT(u.jmeno, ' ', u.prijmeni) as jmeno_uzivatele
                      FROM " . TBL_FAKTURY . " f
                      LEFT JOIN " . TBL_UZIVATELE . " u ON f.vytvoril_uzivatel_id = u.id
                      WHERE f.fa_cislo_vema = ? AND f.aktivni = 1";
        
        $params = array($fa_cislo_vema);
        
        // If editing existing invoice, exclude it from check
        if ($exclude_invoice_id !== null) {
            $sql_check .= " AND f.id != ?";
            $params[] = $exclude_invoice_id;
        }
        
        $stmt_check = $db->prepare($sql_check);
        $stmt_check->execute($params);
        $existing = $stmt_check->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            // Faktura existuje - vrátit info
            http_response_code(200);
            echo json_encode(array(
                'status' => 'ok',
                'exists' => true,
                'invoice' => array(
                    'id' => (int)$existing['id'],
                    'fa_cislo_vema' => $existing['fa_cislo_vema'],
                    'objednavka_id' => $existing['objednavka_id'] ? (int)$existing['objednavka_id'] : null,
                    'fa_castka' => $existing['fa_castka'],
                    'fa_datum_vystaveni' => $existing['fa_datum_vystaveni'],
                    'fa_splatnost' => $existing['fa_datum_splatnosti'], // Pro frontend kompatibilitu
                    'fa_datum_splatnosti' => $existing['fa_datum_splatnosti'],
                    'jmeno_uzivatele' => $existing['jmeno_uzivatele']
                )
            ));
        } else {
            // Faktura neexistuje - OK
            http_response_code(200);
            echo json_encode(array(
                'status' => 'ok',
                'exists' => false
            ));
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při kontrole duplicity: ' . $e->getMessage()));
    }
}

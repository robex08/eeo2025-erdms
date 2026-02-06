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
    $required = array('fa_cislo_vema', 'fa_datum_vystaveni', 'fa_castka');
    foreach ($required as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Chybí povinné pole: ' . $field));
            return;
        }
    }
    
    try {
        $db = get_db($config);
        
        // Nastavit MySQL timezone pro konzistentní datetime handling
        TimezoneHelper::setMysqlTimezone($db);
        
        $db->beginTransaction();
        
        // Create invoice record
        $sql_insert = "INSERT INTO " . TBL_FAKTURY . " (
            objednavka_id, smlouva_id, fa_dorucena, fa_castka, fa_cislo_vema, 
            fa_datum_vystaveni, fa_datum_splatnosti, fa_datum_doruceni,
            fa_strediska_kod, fa_poznamka, rozsirujici_data,
            vytvoril_uzivatel_id, dt_vytvoreni, dt_aktualizace, aktivni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)";
        
        $stmt_insert = $db->prepare($sql_insert);
        $stmt_insert->execute(array(
            $order_id,
            isset($input['smlouva_id']) && (int)$input['smlouva_id'] > 0 ? (int)$input['smlouva_id'] : null,
            isset($input['fa_dorucena']) ? (int)$input['fa_dorucena'] : 0,
            $input['fa_castka'],
            trim($input['fa_cislo_vema']),
            isset($input['fa_datum_vystaveni']) ? $input['fa_datum_vystaveni'] : null,
            isset($input['fa_datum_splatnosti']) ? $input['fa_datum_splatnosti'] : null,
            isset($input['fa_datum_doruceni']) ? $input['fa_datum_doruceni'] : null,
            isset($input['fa_strediska_kod']) ? $input['fa_strediska_kod'] : null,
            isset($input['fa_poznamka']) ? $input['fa_poznamka'] : null,
            isset($input['rozsirujici_data']) ? json_encode($input['rozsirujici_data']) : null,
            $token_data['id']  // Použít ID z tokenu
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
                error_log("[WORKFLOW] Varování: Nepodařilo se aktualizovat workflow pro objednávku ID {$order_id} po přidání faktury");
                // Pokračujeme - workflow update není kritická chyba pro vytvoření faktury
            }
        }
        
        $db->commit();
        
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
    $required = array('fa_cislo_vema', 'fa_datum_vystaveni', 'fa_castka');
    foreach ($required as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Chybí povinné pole: ' . $field));
            return;
        }
    }
    
    try {
        $db = get_db($config);
        
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
            objednavka_id, smlouva_id, fa_dorucena, fa_zaplacena, fa_castka, fa_cislo_vema, 
            fa_typ, fa_datum_vystaveni, fa_datum_splatnosti, fa_datum_doruceni,
            fa_strediska_kod, fa_poznamka,
            potvrdil_vecnou_spravnost_id, dt_potvrzeni_vecne_spravnosti,
            vecna_spravnost_umisteni_majetku, vecna_spravnost_poznamka, vecna_spravnost_potvrzeno,
            rozsirujici_data, fa_predana_zam_id, fa_datum_predani_zam, fa_datum_vraceni_zam,
            vytvoril_uzivatel_id, dt_vytvoreni, dt_aktualizace, aktivni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)";
        
        $stmt_insert = $db->prepare($sql_insert);
        $stmt_insert->execute(array(
            $order_id,
            isset($input['smlouva_id']) && !empty($input['smlouva_id']) ? (int)$input['smlouva_id'] : null,
            isset($input['fa_dorucena']) ? (int)$input['fa_dorucena'] : 0,
            isset($input['fa_zaplacena']) ? (int)$input['fa_zaplacena'] : 0,
            $input['fa_castka'],
            trim($input['fa_cislo_vema']),
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
            $token_data['id']  // Použít ID z tokenu
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
                        error_log("✅ INVOICE CREATE: Přidán stav FAKTURACE pro objednávku #{$order_id}");
                    }
                    
                    // PRAVIDLO 2: Ujistit se, že má VECNA_SPRAVNOST
                    if (!in_array('VECNA_SPRAVNOST', $workflow_states)) {
                        $workflow_states[] = 'VECNA_SPRAVNOST';
                        $workflow_changed = true;
                        error_log("✅ INVOICE CREATE: Přidán stav VECNA_SPRAVNOST pro objednávku #{$order_id}");
                    }
                    
                    // PRAVIDLO 3: Pokud byla ZKONTROLOVANA → vrátit na VECNA_SPRAVNOST
                    $had_zkontrolovana = in_array('ZKONTROLOVANA', $workflow_states);
                    if ($had_zkontrolovana) {
                        $workflow_states = array_values(array_filter($workflow_states, function($s) {
                            return $s !== 'ZKONTROLOVANA';
                        }));
                        $workflow_changed = true;
                        error_log("🔙 INVOICE CREATE: Přidána nová faktura → objednávka #{$order_id} vrácena ze ZKONTROLOVANA na VECNA_SPRAVNOST");
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
                        
                        error_log("📋 INVOICE CREATE: Workflow objednávky #{$order_id} aktualizováno: " . implode(' → ', $workflow_states));
                        
                        // 🔔 NOTIFIKACE: Poslat notifikaci při přechodu na VECNA_SPRAVNOST
                        if (in_array('VECNA_SPRAVNOST', $workflow_states)) {
                            try {
                                // Import notification helpers
                                require_once __DIR__ . '/notificationHelpers.php';
                                
                                // Triggerovat notifikaci pro věcnou správnost
                                $notification_result = triggerOrderNotification(
                                    'INVOICE_MATERIAL_CHECK_REQUESTED',
                                    $order_id,
                                    $token_data['id'],
                                    array(
                                        'invoice_number' => $fa_cislo_vema,
                                        'invoice_amount' => $fa_castka
                                    )
                                );
                                
                                if ($notification_result['success']) {
                                    error_log("✅ NOTIFIKACE: Věcná správnost notifikace odeslána pro objednávku #{$order_id}");
                                } else {
                                    error_log("⚠️ NOTIFIKACE: Chyba při odesílání věcné správnosti: " . ($notification_result['error'] ?? 'Neznámá chyba'));
                                }
                            } catch (Exception $notif_error) {
                                error_log("❌ NOTIFIKACE: Exception při odesílání notifikace: " . $notif_error->getMessage());
                            }
                        }
                    }
                }
            } catch (Exception $order_update_error) {
                // Neblokovat úspěch faktury, jen zalogovat chybu
                error_log("⚠️ INVOICE CREATE: Chyba při aktualizaci workflow objednávky: " . $order_update_error->getMessage());
            }
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
    
    debug_log("📝 UPDATE INVOICE #$invoice_id - User: {$input['username']}, token_data: " . json_encode($token_data, JSON_UNESCAPED_UNICODE));
    
    try {
        $db = get_db($config);
        
        // Nastavit MySQL timezone pro konzistentní datetime handling
        TimezoneHelper::setMysqlTimezone($db);
        
        // 🔒 ADMIN CHECK - potřeba pro práci s neaktivními fakturami
        $is_admin = isset($token_data['is_admin']) ? (bool)$token_data['is_admin'] : false;
        
        debug_log("🔒 UPDATE INVOICE #$invoice_id - is_admin: " . ($is_admin ? 'TRUE' : 'FALSE'));
        
        // Načíst současný stav faktury
        // ✅ Admin může aktualizovat i neaktivní faktury
        $sql_current = "SELECT * FROM " . TBL_FAKTURY . " WHERE id = ?";
        if (!$is_admin) {
            $sql_current .= " AND aktivni = 1";
        }
        
        debug_log("🔍 UPDATE INVOICE #$invoice_id - SQL: $sql_current");
        
        $stmt_current = $db->prepare($sql_current);
        $stmt_current->execute(array($invoice_id));
        $current_invoice = $stmt_current->fetch(PDO::FETCH_ASSOC);
        
        if (!$current_invoice) {
            debug_log("⛔ UPDATE INVOICE #$invoice_id - Faktura nebyla nalezena (is_admin=$is_admin)");
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nebyla nalezena'));
            return;
        }
        
        debug_log("✅ UPDATE INVOICE #$invoice_id - Faktura nalezena, aktivni={$current_invoice['aktivni']}");
        
        // Build dynamic update query based on provided fields
        $updateFields = array();
        $updateValues = array();
        
        $allowedFields = array(
            'fa_cislo_vema', 'fa_datum_vystaveni', 'fa_datum_splatnosti', 'fa_datum_doruceni',
            'fa_castka', 'fa_dorucena', 'fa_zaplacena', 'fa_typ',
            'fa_strediska_kod', 'fa_poznamka', 'rozsirujici_data',
            'potvrdil_vecnou_spravnost_id', 'dt_potvrzeni_vecne_spravnosti',
            'vecna_spravnost_umisteni_majetku', 'vecna_spravnost_poznamka', 'vecna_spravnost_potvrzeno',
            // Nové fieldy - předání zaměstnanci
            'fa_datum_zaplaceni', 'fa_predana_zam_id', 'fa_datum_predani_zam', 'fa_datum_vraceni_zam',
            // Vazba na smlouvu A OBJEDNÁVKU - přidáno 08.01.2026
            'smlouva_id', 'objednavka_id',
            // Workflow stav - přidáno 22.12.2025
            'stav'
        );
        
        // Pole vyžadující re-schválení věcné správnosti
        $fields_requiring_reapproval = array(
            'fa_castka', 'fa_cislo_vema', 'fa_strediska_kod', 'fa_typ',
            'fa_datum_vystaveni', 'fa_datum_splatnosti', 'fa_datum_doruceni'
        );
        
        // Detekce změny kritických polí
        $requires_reapproval = false;
        foreach ($fields_requiring_reapproval as $field) {
            if (isset($input[$field]) && isset($current_invoice[$field])) {
                if ($input[$field] != $current_invoice[$field]) {
                    $requires_reapproval = true;
                    break;
                }
            }
        }
        
        // Automatické vynulování věcné správnosti při změně kritických polí
        if ($requires_reapproval && (int)$current_invoice['vecna_spravnost_potvrzeno'] === 1) {
            $updateFields[] = 'vecna_spravnost_potvrzeno = ?';
            $updateValues[] = 0;
            $updateFields[] = 'potvrdil_vecnou_spravnost_id = ?';
            $updateValues[] = null;
            $updateFields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
            $updateValues[] = null;
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
        
        // ✅ AUTOMATIKA: Potvrzení věcné správnosti → změnit stav POUZE pokud je aktuálně ZAEVIDOVANA
        if (isset($input['vecna_spravnost_potvrzeno']) && (int)$input['vecna_spravnost_potvrzeno'] === 1) {
            if ($current_invoice['stav'] === INVOICE_STATUS_REGISTERED) {
                // Je ve stavu ZAEVIDOVANA → automaticky přepnout na VECNA_SPRAVNOST
                $updateFields[] = 'stav = ?';
                $updateValues[] = INVOICE_STATUS_VERIFICATION;
                error_log("🔄 Auto změna stavu: ZAEVIDOVANA → VECNA_SPRAVNOST (potvrzena věcná správnost)");
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
                    error_log("🔍 DEBUG - Ukládání faktury #$invoice_id - pole $field: " . json_encode($input[$field]));
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
                } else if (in_array($field, array('vecna_spravnost_umisteni_majetku', 'vecna_spravnost_poznamka'))) {
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
        
        error_log("🔍 DEBUG - UPDATE SQL pro fakturu #$invoice_id:");
        error_log("  Fields: " . implode(', ', $updateFields));
        error_log("  Values: " . json_encode($updateValues));
        
        if (empty($updateFields)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Nebyla poskytnutá žádná data k aktualizaci'));
            return;
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
        
        debug_log("🔧 UPDATE INVOICE #$invoice_id - SQL: $sql_update");
        
        $stmt = $db->prepare($sql_update);
        $stmt->execute($updateValues);
        
        if ($stmt->rowCount() === 0) {
            debug_log("⛔ UPDATE INVOICE #$invoice_id - rowCount=0, faktura nebyla aktualizována");
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nebyla nalezena nebo není aktivní'));
            return;
        }
        
        debug_log("✅ UPDATE INVOICE #$invoice_id - Aktualizováno {$stmt->rowCount()} řádků");
        
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
        
        // Pokud byla faktura odpojena, přeskočit běžnou workflow logiku (už jsme ji zpracovali výše)
        if ($order_id > 0 && $detached_from_order_id === null) {
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
                    
                    // PRAVIDLO 2: Pokud se změnila kritická pole → vrátit z ZKONTROLOVANA na VECNA_SPRAVNOST
                    if ($requires_reapproval) {
                        $had_zkontrolovana = in_array('ZKONTROLOVANA', $workflow_states);
                        $workflow_states = array_values(array_filter($workflow_states, function($s) {
                            return $s !== 'ZKONTROLOVANA';
                        }));
                        if ($had_zkontrolovana) {
                            $workflow_changed = true;
                            error_log("🔙 INVOICE MODULE: Kritická pole faktury #{$invoice_id} byla změněna → objednávka #{$order_id} vrácena ze ZKONTROLOVANA na VECNA_SPRAVNOST");
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
        
        // Return updated fields for confirmation
        $updatedFieldNames = array();
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $updatedFieldNames[] = $field;
            }
        }
        
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
    debug_log("🗑️ DELETE INVOICE HANDLER START - invoice_id: " . $input['invoice_id'] . ", user: " . $input['username']);
    
    // Token verification - V2 enhanced
    try {
        $token_data = verify_token_v2($input['username'], $input['token']);
        debug_log("✅ Token verified successfully");
    } catch (Exception $e) {
        debug_log("❌ Token verification FAILED: " . $e->getMessage());
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
        $sql_check = "SELECT f.id, f.objednavka_id, f.vytvoril_uzivatel_id, f.aktivni, o.uzivatel_id as objednavka_uzivatel_id
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
        error_log("🔍 DELETE INVOICE #{$invoice_id} - Token data: " . json_encode($token_data));
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
        error_log("DELETE invoice #{$invoice_id} - user_id: {$current_user_id}, is_admin: " . ($is_admin ? 'YES' : 'NO') . ", has_invoice_manage: " . ($has_invoice_manage ? 'YES' : 'NO') . ", invoice_owner: {$invoice['vytvoril_uzivatel_id']}, order_owner: {$invoice['objednavka_uzivatel_id']}, aktivni: {$invoice['aktivni']}");
        
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

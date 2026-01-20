<?php

/**
 * Invoice Handlers - Faktury API  
 * PHP 5.6 kompatibilní
 * 
 * 🚨 PLNĚ DEPRECATED - POUŽÍVAT POUZE orderV2InvoiceHandlers.php! 🚨
 * 
 * ⚠️  DŮLEŽITÉ: Frontend byl převeden na čisté V2 API endpointy
 * ⚠️  Legacy API endpointy nejsou již používány od 21.12.2025
 * 
 * MIGRACE DOKONČENA:
 * - invoices25/create           → order-v2/invoices/create (standalone) nebo order-v2/{order_id}/invoices/create
 * - invoices25/create-with-att  → order-v2/invoices/create-with-attachment (standalone) nebo order-v2/{order_id}/invoices/create-with-attachment  
 * - invoices25/update           → order-v2/invoices/{invoice_id}/update
 * - invoices25/delete           → order-v2/invoices/{invoice_id}/delete
 * - invoices25/attachments/*    → order-v2/invoices/{id}/attachments/*
 * 
 * 🗑️  PLÁN ODEBRÁNÍ:
 * - Q1 2026: Kompletní odstranění legacy endpointů z api.php
 * - Q2 2026: Smazání tohoto souboru
 * 
 * ✅ PRO NOVÝ VÝVOJ POUŽÍVEJ:
 * - /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderV2InvoiceHandlers.php
 */

require_once 'orderQueries.php';

/**
 * POST - Načte faktury pro konkrétní objednávku
 * Endpoint: invoices25/by-order
 * POST: {token, username, objednavka_id}
 * 
 * @deprecated Používej order-v2 API pro získání faktur přes order detail
 */
function handle_invoices25_by_order($input, $config, $queries) {
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $objednavka_id = isset($input['objednavka_id']) ? (int)$input['objednavka_id'] : 0;
    
    if (!$token || !$request_username || $objednavka_id <= 0) {
        http_response_code(400);
        echo json_encode([
            'err' => 'Chybí povinné parametry'
        ]);
        return;
    }

    // Ověř token
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    // Kontrola uživatele
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        // Připojení k DB - stejný způsob jako orders25
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }

        // Načti faktury pro objednávku - bez kontroly oprávnění (stejně jako orders25)
        // Pokud má uživatel platný token, má přístup k fakturám
        $faktury_table = get_invoices_table_name();
        $stmt = $db->prepare("SELECT * FROM `$faktury_table` WHERE objednavka_id = ? AND aktivni = 1 ORDER BY dt_vytvoreni DESC");
        $stmt->execute([$objednavka_id]);
        $faktury = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Úspěšná odpověď
        http_response_code(200);
        echo json_encode([
            'faktury' => $faktury,
            'count' => count($faktury),
            'objednavka_id' => $objednavka_id
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání faktur: ' . $e->getMessage()]);
    }
}

/**
 * POST - Vytvoření nové faktury
 * Endpoint: invoices25/create
 * POST: {token, username, objednavka_id, fa_castka, fa_cislo_vema, ...}
 * 
 * @deprecated Používej handle_order_v2_create_invoice() z orderV2InvoiceHandlers.php
 */
function handle_invoices25_create($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token || !$request_username) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí token nebo username']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    // Validace povinných polí
    // ✅ objednavka_id může být NULL (standalone faktura) nebo validní ID objednávky (> 0)
    $objednavka_id = isset($input['objednavka_id']) && (int)$input['objednavka_id'] > 0 ? (int)$input['objednavka_id'] : null;
    $fa_castka = isset($input['fa_castka']) ? $input['fa_castka'] : null;
    $fa_cislo_vema = isset($input['fa_cislo_vema']) ? trim($input['fa_cislo_vema']) : '';

    // ✅ objednavka_id je nyní NEPOVINNÉ (může být NULL)
    if (!$fa_castka || empty($fa_cislo_vema)) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí povinná pole: fa_castka, fa_cislo_vema']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }
        
        // Nastavit MySQL timezone pro konzistentní datetime handling
        TimezoneHelper::setMysqlTimezone($db);

        // Sestavení INSERT dotazu
        $faktury_table = get_invoices_table_name();
        $sql = "INSERT INTO `$faktury_table` (
            objednavka_id,
            smlouva_id,
            fa_dorucena,
            fa_zaplacena,
            fa_castka,
            fa_cislo_vema,
            fa_typ,
            fa_datum_vystaveni,
            fa_datum_splatnosti,
            fa_datum_doruceni,
            fa_strediska_kod,
            fa_poznamka,
            fa_predana_zam_id,
            fa_datum_predani_zam,
            fa_datum_vraceni_zam,
            potvrdil_vecnou_spravnost_id,
            dt_potvrzeni_vecne_spravnosti,
            vecna_spravnost_umisteni_majetku,
            vecna_spravnost_poznamka,
            vecna_spravnost_potvrzeno,
            rozsirujici_data,
            stav,
            vytvoril_uzivatel_id,
            dt_vytvoreni,
            dt_aktualizace,
            aktivni
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1
        )";

        $stmt = $db->prepare($sql);
        
        // Připrav hodnoty
        $fa_dorucena = isset($input['fa_dorucena']) ? (int)$input['fa_dorucena'] : 0;
        $fa_zaplacena = isset($input['fa_zaplacena']) ? (int)$input['fa_zaplacena'] : 0;
        
        // 🔍 DEBUG: fa_typ
        error_log("🔍 PHP API fa_typ INPUT: " . json_encode(['isset' => isset($input['fa_typ']), 'value' => $input['fa_typ'] ?? 'NOT_SET', 'input_keys' => array_keys($input)]));
        
        $fa_typ = isset($input['fa_typ']) ? $input['fa_typ'] : 'BEZNA';
        
        error_log("🔍 PHP API fa_typ FINAL: " . $fa_typ);
        $fa_datum_vystaveni = isset($input['fa_datum_vystaveni']) ? $input['fa_datum_vystaveni'] : null;
        $fa_datum_splatnosti = isset($input['fa_datum_splatnosti']) ? $input['fa_datum_splatnosti'] : null;
        $fa_datum_doruceni = isset($input['fa_datum_doruceni']) ? $input['fa_datum_doruceni'] : null;
        
        // ✅ NORMALIZACE: fa_strediska_kod → JSON array stringů (UPPERCASE)
        $fa_strediska_kod = null;
        if (isset($input['fa_strediska_kod'])) {
            error_log("🔍 PHP fa_strediska_kod INPUT: type=" . gettype($input['fa_strediska_kod']) . ", value=" . json_encode($input['fa_strediska_kod']));
            
            if (is_array($input['fa_strediska_kod'])) {
                // Normalizace: UPPERCASE + odstranění prázdných hodnot
                $normalizedStrediska = array_map(function($kod) {
                    return strtoupper(trim($kod));
                }, $input['fa_strediska_kod']);
                $normalizedStrediska = array_values(array_unique(array_filter($normalizedStrediska)));
                $fa_strediska_kod = json_encode($normalizedStrediska);
                error_log("🔍 PHP fa_strediska_kod NORMALIZED: " . $fa_strediska_kod);
            } else if (is_string($input['fa_strediska_kod'])) {
                // Je to string - pokusit se ho parsovat jako JSON
                $decoded = json_decode($input['fa_strediska_kod'], true);
                if (is_array($decoded)) {
                    // Byl to JSON array - normalizovat
                    $normalizedStrediska = array_map(function($kod) {
                        return strtoupper(trim($kod));
                    }, $decoded);
                    $normalizedStrediska = array_values(array_unique(array_filter($normalizedStrediska)));
                    $fa_strediska_kod = json_encode($normalizedStrediska);
                    error_log("🔍 PHP fa_strediska_kod FROM JSON: " . $fa_strediska_kod);
                } else {
                    // Není to JSON - uložit jako prázdný array
                    $fa_strediska_kod = json_encode([]);
                    error_log("⚠️ PHP fa_strediska_kod IS STRING (not JSON): " . $input['fa_strediska_kod'] . " - saving empty array");
                }
            }
        }
        
        $fa_poznamka = isset($input['fa_poznamka']) ? $input['fa_poznamka'] : null;
        
        // Předání zaměstnanci
        $fa_predana_zam_id = isset($input['fa_predana_zam_id']) && !empty($input['fa_predana_zam_id']) ? (int)$input['fa_predana_zam_id'] : null;
        $fa_datum_predani_zam = isset($input['fa_datum_predani_zam']) && !empty($input['fa_datum_predani_zam']) ? $input['fa_datum_predani_zam'] : null;
        $fa_datum_vraceni_zam = isset($input['fa_datum_vraceni_zam']) && !empty($input['fa_datum_vraceni_zam']) ? $input['fa_datum_vraceni_zam'] : null;
        
        // Věcná kontrola
        $potvrdil_vecnou_spravnost_id = isset($input['potvrdil_vecnou_spravnost_id']) && !empty($input['potvrdil_vecnou_spravnost_id']) ? (int)$input['potvrdil_vecnou_spravnost_id'] : null;
        $dt_potvrzeni_vecne_spravnosti = isset($input['dt_potvrzeni_vecne_spravnosti']) ? $input['dt_potvrzeni_vecne_spravnosti'] : null;
        $vecna_spravnost_umisteni_majetku = isset($input['vecna_spravnost_umisteni_majetku']) ? $input['vecna_spravnost_umisteni_majetku'] : null;
        $vecna_spravnost_poznamka = isset($input['vecna_spravnost_poznamka']) ? $input['vecna_spravnost_poznamka'] : null;
        $vecna_spravnost_potvrzeno = isset($input['vecna_spravnost_potvrzeno']) ? (int)$input['vecna_spravnost_potvrzeno'] : 0;
        
        $rozsirujici_data = isset($input['rozsirujici_data']) ? json_encode($input['rozsirujici_data']) : null;
        $smlouva_id = isset($input['smlouva_id']) && !empty($input['smlouva_id']) ? (int)$input['smlouva_id'] : null;
        
        // ✅ WORKFLOW STAV - výchozí hodnota ZAEVIDOVANA (přidáno 22.12.2025)
        $stav = isset($input['stav']) ? $input['stav'] : INVOICE_STATUS_REGISTERED;

        $stmt->execute([
            $objednavka_id,
            $smlouva_id,
            $fa_dorucena,
            $fa_zaplacena,
            $fa_castka,
            $fa_cislo_vema,
            $fa_typ,
            $fa_datum_vystaveni,
            $fa_datum_splatnosti,
            $fa_datum_doruceni,
            $fa_strediska_kod,
            $fa_poznamka,
            $fa_predana_zam_id,
            $fa_datum_predani_zam,
            $fa_datum_vraceni_zam,
            $potvrdil_vecnou_spravnost_id,
            $dt_potvrzeni_vecne_spravnosti,
            $vecna_spravnost_umisteni_majetku,
            $vecna_spravnost_poznamka,
            $vecna_spravnost_potvrzeno,
            $rozsirujici_data,
            $stav,
            $token_data['id']
        ]);

        $new_id = $db->lastInsertId();

        // 🔔 TRIGGER: INVOICE_MATERIAL_CHECK_REQUESTED - pokud má faktura objednávku NEBO předáno komu (s datem) NEBO smlouvu
        // ⚠️ DŮLEŽITÉ: Stav faktury NEkontrolujeme - faktura NEMÁ workflow! (stav je jen informační poznámka)
        $hasFaPredana = $fa_predana_zam_id > 0 && !empty($fa_datum_predani_zam);
        $shouldTrigger = ($objednavka_id > 0 || $hasFaPredana || $smlouva_id > 0);
        
        if ($shouldTrigger) {
            try {
                require_once __DIR__ . '/notificationHandlers.php';
                triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', $new_id, $token_data['id']);
                $reason = [];
                if ($objednavka_id > 0) $reason[] = "order #{$objednavka_id}";
                if ($hasFaPredana) $reason[] = "fa_predana_zam #{$fa_predana_zam_id} (datum: {$fa_datum_predani_zam})";
                if ($smlouva_id > 0) $reason[] = "smlouva #{$smlouva_id}";
                error_log("🔔 CREATE INVOICE: Triggered INVOICE_MATERIAL_CHECK_REQUESTED for invoice #{$new_id} (" . implode(', ', $reason) . ")");
            } catch (Exception $e) {
                error_log("⚠️ CREATE INVOICE: Notification trigger failed: " . $e->getMessage());
            }
        }

        http_response_code(201);
        echo json_encode([
            'status' => 'ok',
            'message' => 'Faktura byla úspěšně vytvořena',
            'id' => (int)$new_id
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při vytváření faktury: ' . $e->getMessage()]);
    }
}

/**
 * POST - Aktualizace faktury
 * Endpoint: invoices25/update
 * POST: {token, username, id, ...pole k aktualizaci}
 * 
 * @deprecated Používej handle_order_v2_update_invoice() z orderV2InvoiceHandlers.php
 */
function handle_invoices25_update($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $faktura_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if (!$token || !$request_username || $faktura_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí token, username nebo ID faktury']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }
        
        // Nastavit MySQL timezone pro konzistentní datetime handling
        TimezoneHelper::setMysqlTimezone($db);

        // Ověř, že faktura existuje + načti aktuální data pro detekci změn
        $faktury_table = get_invoices_table_name();
        $check_stmt = $db->prepare("SELECT id, stav, objednavka_id, vecna_spravnost_potvrzeno FROM `$faktury_table` WHERE id = ? AND aktivni = 1");
        $check_stmt->execute([$faktura_id]);
        $oldInvoiceData = $check_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$oldInvoiceData) {
            http_response_code(404);
            echo json_encode(['err' => 'Faktura nenalezena']);
            return;
        }

        // Sestavení UPDATE dotazu - jen pole která přišla
        $fields = [];
        $values = [];

        if (isset($input['objednavka_id'])) {
            $fields[] = 'objednavka_id = ?';
            $values[] = !empty($input['objednavka_id']) ? (int)$input['objednavka_id'] : null;
        }
        if (isset($input['smlouva_id'])) {
            $fields[] = 'smlouva_id = ?';
            $values[] = !empty($input['smlouva_id']) ? (int)$input['smlouva_id'] : null;
        }
        if (isset($input['fa_dorucena'])) {
            $fields[] = 'fa_dorucena = ?';
            $values[] = (int)$input['fa_dorucena'];
        }
        if (isset($input['fa_zaplacena'])) {
            $fields[] = 'fa_zaplacena = ?';
            $values[] = (int)$input['fa_zaplacena'];
        }
        if (isset($input['fa_castka'])) {
            $fields[] = 'fa_castka = ?';
            $values[] = $input['fa_castka'];
        }
        if (isset($input['fa_cislo_vema'])) {
            $fields[] = 'fa_cislo_vema = ?';
            $values[] = $input['fa_cislo_vema'];
        }
        if (isset($input['fa_typ'])) {
            $fields[] = 'fa_typ = ?';
            $values[] = $input['fa_typ'];
        }
        if (isset($input['fa_datum_vystaveni'])) {
            $fields[] = 'fa_datum_vystaveni = ?';
            $values[] = ($input['fa_datum_vystaveni'] === '' || $input['fa_datum_vystaveni'] === null) ? null : $input['fa_datum_vystaveni'];
        }
        if (isset($input['fa_datum_splatnosti'])) {
            $fields[] = 'fa_datum_splatnosti = ?';
            $values[] = ($input['fa_datum_splatnosti'] === '' || $input['fa_datum_splatnosti'] === null) ? null : $input['fa_datum_splatnosti'];
        }
        if (isset($input['fa_datum_doruceni'])) {
            $fields[] = 'fa_datum_doruceni = ?';
            $values[] = ($input['fa_datum_doruceni'] === '' || $input['fa_datum_doruceni'] === null) ? null : $input['fa_datum_doruceni'];
        }
        // ✅ NORMALIZACE: fa_strediska_kod → JSON array stringů (UPPERCASE)
        if (isset($input['fa_strediska_kod'])) {
            $fields[] = 'fa_strediska_kod = ?';
            error_log("🔍 UPDATE fa_strediska_kod INPUT: type=" . gettype($input['fa_strediska_kod']) . ", value=" . json_encode($input['fa_strediska_kod']));
            
            if (is_array($input['fa_strediska_kod'])) {
                // Normalizace: UPPERCASE + odstranění prázdných hodnot
                $normalizedStrediska = array_map(function($kod) {
                    return strtoupper(trim($kod));
                }, $input['fa_strediska_kod']);
                $normalizedStrediska = array_values(array_unique(array_filter($normalizedStrediska)));
                $values[] = json_encode($normalizedStrediska);
                error_log("🔍 UPDATE fa_strediska_kod NORMALIZED: " . json_encode($normalizedStrediska));
            } else if (is_string($input['fa_strediska_kod'])) {
                // Je to string - pokusit se ho parsovat jako JSON
                $decoded = json_decode($input['fa_strediska_kod'], true);
                if (is_array($decoded)) {
                    // Byl to JSON array - normalizovat
                    $normalizedStrediska = array_map(function($kod) {
                        return strtoupper(trim($kod));
                    }, $decoded);
                    $normalizedStrediska = array_values(array_unique(array_filter($normalizedStrediska)));
                    $values[] = json_encode($normalizedStrediska);
                    error_log("🔍 UPDATE fa_strediska_kod FROM JSON: " . json_encode($normalizedStrediska));
                } else {
                    // Není to JSON - uložit jako prázdný array
                    $values[] = json_encode([]);
                    error_log("⚠️ UPDATE fa_strediska_kod IS STRING (not JSON): " . $input['fa_strediska_kod'] . " - saving empty array");
                }
            }
        }
        if (isset($input['fa_poznamka'])) {
            $fields[] = 'fa_poznamka = ?';
            $values[] = $input['fa_poznamka'];
        }
        // Předání zaměstnanci
        if (isset($input['fa_predana_zam_id'])) {
            $fields[] = 'fa_predana_zam_id = ?';
            $values[] = !empty($input['fa_predana_zam_id']) ? (int)$input['fa_predana_zam_id'] : null;
        }
        if (isset($input['fa_datum_predani_zam'])) {
            $fields[] = 'fa_datum_predani_zam = ?';
            $values[] = !empty($input['fa_datum_predani_zam']) ? $input['fa_datum_predani_zam'] : null;
        }
        if (isset($input['fa_datum_vraceni_zam'])) {
            $fields[] = 'fa_datum_vraceni_zam = ?';
            $values[] = !empty($input['fa_datum_vraceni_zam']) ? $input['fa_datum_vraceni_zam'] : null;
        }
        // Věcná kontrola
        if (isset($input['potvrdil_vecnou_spravnost_id'])) {
            $fields[] = 'potvrdil_vecnou_spravnost_id = ?';
            $values[] = !empty($input['potvrdil_vecnou_spravnost_id']) ? (int)$input['potvrdil_vecnou_spravnost_id'] : null;
        }
        if (isset($input['dt_potvrzeni_vecne_spravnosti'])) {
            $fields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
            $values[] = $input['dt_potvrzeni_vecne_spravnosti'];
        }
        if (isset($input['vecna_spravnost_umisteni_majetku'])) {
            $fields[] = 'vecna_spravnost_umisteni_majetku = ?';
            $values[] = $input['vecna_spravnost_umisteni_majetku'];
        }
        if (isset($input['vecna_spravnost_poznamka'])) {
            $fields[] = 'vecna_spravnost_poznamka = ?';
            $values[] = $input['vecna_spravnost_poznamka'];
        }
        if (isset($input['vecna_spravnost_potvrzeno'])) {
            $fields[] = 'vecna_spravnost_potvrzeno = ?';
            $values[] = (int)$input['vecna_spravnost_potvrzeno'];
        }
        if (isset($input['rozsirujici_data'])) {
            $fields[] = 'rozsirujici_data = ?';
            $values[] = json_encode($input['rozsirujici_data']);
        }

        // ✅ WORKFLOW STAV - Přidáno 22.12.2025
        if (isset($input['stav'])) {
            $fields[] = 'stav = ?';
            $values[] = $input['stav'];
            
            // AUTOMATIKA: Pokud stav = 'ZAPLACENO' → nastavit fa_zaplacena = 1
            if ($input['stav'] === INVOICE_STATUS_PAID) {
                $fields[] = 'fa_zaplacena = ?';
                $values[] = 1;
            }
        }
        
        // ✅ AUTOMATIKA: Potvrzení věcné správnosti → změnit stav POUZE pokud je aktuálně ZAEVIDOVANA
        if (isset($input['vecna_spravnost_potvrzeno']) && (int)$input['vecna_spravnost_potvrzeno'] === 1) {
            // Načíst aktuální stav faktury
            $current_check = $db->prepare("SELECT stav FROM `$faktury_table` WHERE id = ?");
            $current_check->execute([$faktura_id]);
            $current_row = $current_check->fetch(PDO::FETCH_ASSOC);
            
            if ($current_row && $current_row['stav'] === INVOICE_STATUS_REGISTERED) {
                // Je ve stavu ZAEVIDOVANA → automaticky přepnout na VECNA_SPRAVNOST
                $fields[] = 'stav = ?';
                $values[] = INVOICE_STATUS_VERIFICATION;
                error_log("🔄 Auto změna stavu: ZAEVIDOVANA → VECNA_SPRAVNOST (potvrzena věcná správnost)");
            }
        }

        // Vždy aktualizuj dt_aktualizace a aktualizoval_uzivatel_id
        $fields[] = 'dt_aktualizace = NOW()';
        $fields[] = 'aktualizoval_uzivatel_id = ?';
        $values[] = $token_data['id'];
        
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['err' => 'Žádná data k aktualizaci']);
            return;
        }

        $values[] = $faktura_id;
        $sql = "UPDATE `$faktury_table` SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        // ==========================================
        // 🔔 NOTIFICATION TRIGGERS - Nové události
        // ==========================================
        
        // Načti aktuální user_id z tokenu
        $currentUserId = $token_data['id'];
        
        // TRIGGER 1: INVOICE_UPDATED - Pouze pokud se nezměnil stav (jinak jsou specifické triggery)
        $stavChanged = isset($input['stav']) && $input['stav'] !== $oldInvoiceData['stav'];
        $vecnaSpravnostChanged = isset($input['vecna_spravnost_potvrzeno']) && 
                                  (int)$input['vecna_spravnost_potvrzeno'] === 1 && 
                                  (int)$oldInvoiceData['vecna_spravnost_potvrzeno'] !== 1;
        
        if (!$stavChanged && !$vecnaSpravnostChanged) {
            // Standardní update bez změny stavu → INVOICE_UPDATED
            try {
                require_once __DIR__ . '/notificationHandlers.php';
                triggerNotification($db, 'INVOICE_UPDATED', $faktura_id, $currentUserId);
                error_log("🔔 Triggered: INVOICE_UPDATED for invoice $faktura_id");
            } catch (Exception $e) {
                error_log("⚠️ Notification trigger failed: " . $e->getMessage());
            }
        }
        
        // TRIGGER 2: INVOICE_MATERIAL_CHECK_REQUESTED - Pokud se změnil stav na věcnou správnost
        if ($stavChanged) {
            $newStav = $input['stav'];
            
            // Specifický trigger pro věcnou správnost faktury
            if (strtoupper($newStav) === 'VECNA_SPRAVNOST') {
                try {
                    require_once __DIR__ . '/notificationHandlers.php';
                    triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', $faktura_id, $currentUserId);
                    error_log("🔔 Triggered: INVOICE_MATERIAL_CHECK_REQUESTED for invoice $faktura_id");
                } catch (Exception $e) {
                    error_log("⚠️ Notification trigger failed: " . $e->getMessage());
                }
            }
            
            // Obecný trigger pro ostatní stavy předání
            $submitStates = ['PREDANA', 'KE_KONTROLE', 'SUBMITTED'];
            if (in_array(strtoupper($newStav), $submitStates)) {
                try {
                    require_once __DIR__ . '/notificationHandlers.php';
                    triggerNotification($db, 'INVOICE_SUBMITTED', $faktura_id, $currentUserId);
                    error_log("🔔 Triggered: INVOICE_SUBMITTED for invoice $faktura_id");
                } catch (Exception $e) {
                    error_log("⚠️ Notification trigger failed: " . $e->getMessage());
                }
            }
            
            // TRIGGER 3: INVOICE_RETURNED - Pokud se změnil stav na vráceno
            $returnStates = ['VRACENA', 'RETURNED', 'K_DOPLNENI'];
            if (in_array(strtoupper($newStav), $returnStates)) {
                try {
                    require_once __DIR__ . '/notificationHandlers.php';
                    triggerNotification($db, 'INVOICE_RETURNED', $faktura_id, $currentUserId);
                    error_log("🔔 Triggered: INVOICE_RETURNED for invoice $faktura_id");
                } catch (Exception $e) {
                    error_log("⚠️ Notification trigger failed: " . $e->getMessage());
                }
            }
            
            // TRIGGER 4: INVOICE_REGISTRY_PUBLISHED - Pokud se změnil stav na uveřejněno
            $publishStates = ['UVEREJNENA', 'PUBLISHED'];
            if (in_array(strtoupper($newStav), $publishStates)) {
                try {
                    require_once __DIR__ . '/notificationHandlers.php';
                    triggerNotification($db, 'INVOICE_REGISTRY_PUBLISHED', $faktura_id, $currentUserId);
                    error_log("🔔 Triggered: INVOICE_REGISTRY_PUBLISHED for invoice $faktura_id");
                } catch (Exception $e) {
                    error_log("⚠️ Notification trigger failed: " . $e->getMessage());
                }
            }
        }
        
        // TRIGGER 5: INVOICE_MATERIAL_CHECK_APPROVED - Pokud se potvrdila věcná správnost
        if ($vecnaSpravnostChanged) {
            try {
                require_once __DIR__ . '/notificationHandlers.php';
                triggerNotification($db, 'INVOICE_MATERIAL_CHECK_APPROVED', $faktura_id, $currentUserId);
                error_log("🔔 Triggered: INVOICE_MATERIAL_CHECK_APPROVED for invoice $faktura_id");
            } catch (Exception $e) {
                error_log("⚠️ Notification trigger failed: " . $e->getMessage());
            }
        }
        
        // TRIGGER 6: INVOICE_MATERIAL_CHECK_REQUESTED - Pokud se přiřadila k objednávce
        $orderAssigned = isset($input['objednavka_id']) && 
                         !empty($input['objednavka_id']) && 
                         empty($oldInvoiceData['objednavka_id']);
        
        if ($orderAssigned) {
            try {
                require_once __DIR__ . '/notificationHandlers.php';
                triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', $faktura_id, $currentUserId);
                error_log("🔔 Triggered: INVOICE_MATERIAL_CHECK_REQUESTED for invoice $faktura_id (order assigned)");
            } catch (Exception $e) {
                error_log("⚠️ Notification trigger failed: " . $e->getMessage());
            }
        }
        
        // TRIGGER 7: INVOICE_MATERIAL_CHECK_REQUESTED - Pokud se změnilo fa_predana_zam_id (a je datum_predani)
        $faPredanaChanged = isset($input['fa_predana_zam_id']) && 
                            (string)$input['fa_predana_zam_id'] !== (string)$oldInvoiceData['fa_predana_zam_id'];
        
        // Načíst aktuální datum_predani (buď z inputu nebo z DB)
        $currentDatumPredani = isset($input['fa_datum_predani_zam']) ? $input['fa_datum_predani_zam'] : $oldInvoiceData['fa_datum_predani_zam'];
        $hasDatumPredani = !empty($currentDatumPredani) && $currentDatumPredani !== '0000-00-00';
        
        if ($faPredanaChanged && $hasDatumPredani) {
            try {
                require_once __DIR__ . '/notificationHandlers.php';
                triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', $faktura_id, $currentUserId);
                error_log("🔔 Triggered: INVOICE_MATERIAL_CHECK_REQUESTED for invoice $faktura_id (fa_predana_zam_id changed: {$oldInvoiceData['fa_predana_zam_id']} → {$input['fa_predana_zam_id']}, datum: {$currentDatumPredani})");
            } catch (Exception $e) {
                error_log("⚠️ Notification trigger failed: " . $e->getMessage());
            }
        } elseif ($faPredanaChanged && !$hasDatumPredani) {
            error_log("⚠️ SKIP TRIGGER: fa_predana_zam_id changed but fa_datum_predani_zam is missing for invoice $faktura_id");
        }
        
        // TRIGGER 8: INVOICE_MATERIAL_CHECK_REQUESTED - Pokud se změnilo smlouva_id
        $smlouvaChanged = isset($input['smlouva_id']) && 
                          (string)$input['smlouva_id'] !== (string)$oldInvoiceData['smlouva_id'];
        
        if ($smlouvaChanged) {
            try {
                require_once __DIR__ . '/notificationHandlers.php';
                triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REQUESTED', $faktura_id, $currentUserId);
                error_log("🔔 Triggered: INVOICE_MATERIAL_CHECK_REQUESTED for invoice $faktura_id (smlouva_id changed: {$oldInvoiceData['smlouva_id']} → {$input['smlouva_id']})");
            } catch (Exception $e) {
                error_log("⚠️ Notification trigger failed: " . $e->getMessage());
            }
            
            // ✅ OPRAVA: Aktualizovat stav objednávky na VECNA_SPRAVNOST
            // Když se přiřadí faktura z modulu Faktury k objednávce, měl by se stav objednávky změnit
            $orderId = (int)$input['objednavka_id'];
            $objednavky_table = get_orders_table_name();
            
            // Načíst aktuální stav objednávky
            $order_check = $db->prepare("SELECT id, stav_workflow_kod FROM `$objednavky_table` WHERE id = ?");
            $order_check->execute([$orderId]);
            $order_row = $order_check->fetch(PDO::FETCH_ASSOC);
            
            if ($order_row) {
                // Parsovat workflow stavy
                $workflow_states = json_decode($order_row['stav_workflow_kod'], true);
                if (!is_array($workflow_states)) {
                    $workflow_states = [];
                }
                
                // Pokud objednávka je ve stavu FAKTURACE nebo UVEREJNENA a ještě není ve VECNA_SPRAVNOST
                if ((in_array('FAKTURACE', $workflow_states) || in_array('UVEREJNENA', $workflow_states)) 
                    && !in_array('VECNA_SPRAVNOST', $workflow_states)) {
                    
                    // Přidat stav VECNA_SPRAVNOST
                    $workflow_states[] = 'VECNA_SPRAVNOST';
                    $workflow_states = array_unique($workflow_states);
                    
                    // Aktualizovat objednávku
                    $update_order = $db->prepare("UPDATE `$objednavky_table` SET stav_workflow_kod = ?, dt_aktualizace = NOW(), aktualizoval_uzivatel_id = ? WHERE id = ?");
                    $update_order->execute([json_encode($workflow_states), $currentUserId, $orderId]);
                    
                    error_log("✅ Auto změna workflow objednávky #$orderId: přidán stav VECNA_SPRAVNOST (faktura přiřazena z modulu Faktury)");
                }
            }
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'ok',
            'message' => 'Faktura byla úspěšně aktualizována'
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při aktualizaci faktury: ' . $e->getMessage()]);
    }
}

/**
 * POST - Smazání faktury
 * Endpoint: invoices25/delete
 * POST: {token, username, id, hard_delete}
 * 
 * hard_delete = 0 (default): Soft delete - faktura neaktivní, přílohy v DB zůstanou
 * hard_delete = 1: Hard delete - přílohy smazány z DB i z disku
 * 
 * @deprecated Používej handle_order_v2_delete_invoice() z orderV2InvoiceHandlers.php
 */
function handle_invoices25_delete($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $faktura_id = isset($input['id']) ? (int)$input['id'] : 0;
    $hard_delete = isset($input['hard_delete']) ? (int)$input['hard_delete'] : 0;
    
    if (!$token || !$request_username || $faktura_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí token, username nebo ID faktury']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }

        // Začni transakci
        $db->beginTransaction();

        if ($hard_delete === 1) {
            // ========== HARD DELETE ==========
            // 1. Načti přílohy před smazáním (abychom věděli, co mazat z disku)
            $sql_get_prilohy = "SELECT systemova_cesta FROM `" . TBL_FAKTURY_PRILOHY . "` WHERE faktura_id = ?";
            $stmt_get = $db->prepare($sql_get_prilohy);
            $stmt_get->execute(array($faktura_id));
            $prilohy = $stmt_get->fetchAll(PDO::FETCH_ASSOC);

            // 2. Smaž přílohy z databáze
            $sql_delete_prilohy = "DELETE FROM `" . TBL_FAKTURY_PRILOHY . "` WHERE faktura_id = ?";
            $stmt_prilohy = $db->prepare($sql_delete_prilohy);
            $stmt_prilohy->execute(array($faktura_id));

            // 3. Smaž soubory z disku
            foreach ($prilohy as $priloha) {
                $file_path = $priloha['systemova_cesta'];
                if (file_exists($file_path)) {
                    unlink($file_path);
                }
            }

            // 4. Smaž fakturu z databáze (HARD DELETE)
            $faktury_table = get_invoices_table_name();
            $sql = "DELETE FROM `$faktury_table` WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute(array($faktura_id));

            if ($stmt->rowCount() === 0) {
                $db->rollBack();
                http_response_code(404);
                echo json_encode(['err' => 'Faktura nenalezena']);
                return;
            }

            $message = 'Faktura včetně příloh byla trvale smazána (z DB i z disku)';

        } else {
            // ========== SOFT DELETE (default) ==========
            // 1. Soft delete faktury - nastavení aktivni = 0
            $faktury_table = get_invoices_table_name();
            $sql = "UPDATE `$faktury_table` SET aktivni = 0, dt_aktualizace = NOW() WHERE id = ? AND aktivni = 1";
            
            $stmt = $db->prepare($sql);
            $stmt->execute(array($faktura_id));

            if ($stmt->rowCount() === 0) {
                $db->rollBack();
                http_response_code(404);
                echo json_encode(['err' => 'Faktura nenalezena nebo již byla smazána']);
                return;
            }

            // 2. Soft delete příloh - nastavíme je jako neaktivní
            // (Přílohy v DB zůstanou, soubory na disku zůstanou)
            $sql_deactivate_prilohy = "UPDATE `" . TBL_FAKTURY_PRILOHY . "` SET dt_aktualizace = NOW() WHERE faktura_id = ?";
            $stmt_prilohy = $db->prepare($sql_deactivate_prilohy);
            $stmt_prilohy->execute(array($faktura_id));

            $message = 'Faktura byla označena jako neaktivní (přílohy zůstaly v DB)';
        }

        // Commit transakce
        $db->commit();

        http_response_code(200);
        echo json_encode([
            'status' => 'ok',
            'message' => $message,
            'hard_delete' => $hard_delete === 1
        ]);

    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při mazání faktury: ' . $e->getMessage()]);
    }
}

/**
 * POST - Načtení konkrétní faktury podle ID
 * Endpoint: invoices25/by-id
 * POST: {token, username, id}
 * 
 * @deprecated Používej order-v2 API pro získání faktury přes order detail
 */
function handle_invoices25_by_id($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $faktura_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if (!$token || !$request_username || $faktura_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí token, username nebo ID faktury']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }

        // 🔧 FIX: Nastavit UTF-8 encoding pro MySQL připojení
        $db->exec("SET NAMES utf8mb4");
        $db->exec("SET CHARACTER SET utf8mb4");

        $faktury_table = get_invoices_table_name();
        $states_table = get_states_table_name();
        $users_table = get_users_table_name();
        
        $stmt = $db->prepare("
            SELECT 
                f.*,
                o.cislo_objednavky,
                sm.cislo_smlouvy,
                sm.nazev_smlouvy,
                s.nazev_stavu as fa_typ_nazev,
                s.popis as fa_typ_popis,
                u_vecna.jmeno as potvrdil_vecnou_spravnost_jmeno,
                u_vecna.prijmeni as potvrdil_vecnou_spravnost_prijmeni,
                u_vecna.titul_pred as potvrdil_vecnou_spravnost_titul_pred,
                u_vecna.titul_za as potvrdil_vecnou_spravnost_titul_za,
                u_vecna.email as potvrdil_vecnou_spravnost_email,
                u_predana.jmeno as fa_predana_zam_jmeno,
                u_predana.prijmeni as fa_predana_zam_prijmeni,
                u_predana.titul_pred as fa_predana_zam_titul_pred,
                u_predana.titul_za as fa_predana_zam_titul_za,
                u_predana.email as fa_predana_zam_email
            FROM `$faktury_table` f
            LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
            LEFT JOIN `25_smlouvy` sm ON f.smlouva_id = sm.id
            LEFT JOIN `$states_table` s ON s.typ_objektu = 'FAKTURA' AND s.kod_stavu = f.fa_typ
            LEFT JOIN `$users_table` u_vecna ON f.potvrdil_vecnou_spravnost_id = u_vecna.id
            LEFT JOIN `$users_table` u_predana ON f.fa_predana_zam_id = u_predana.id
            WHERE f.id = ? AND f.aktivni = 1
        ");
        $stmt->execute([$faktura_id]);
        $faktura = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$faktura) {
            http_response_code(404);
            echo json_encode(['err' => 'Faktura nenalezena']);
            return;
        }

        // Formátovat jméno zaměstnance - zkrácené (Bezoušková T.)
        if (isset($faktura['fa_predana_zam_jmeno']) && isset($faktura['fa_predana_zam_prijmeni'])
            && $faktura['fa_predana_zam_jmeno'] !== '' && $faktura['fa_predana_zam_prijmeni'] !== '') {
            // První písmeno jména s tečkou
            $jmeno_zkracene = substr($faktura['fa_predana_zam_jmeno'], 0, 1) . '.';
            // Příjmení + zkrácené jméno
            $predana_jmeno_cele = trim($faktura['fa_predana_zam_prijmeni'] . ' ' . $jmeno_zkracene);
            $faktura['fa_predana_zam_jmeno'] = $predana_jmeno_cele;
        }

        // � FIX: Ošetření nevalidních UTF-8 znaků před json_encode
        array_walk_recursive($faktura, function(&$value) {
            if (is_string($value)) {
                // Odstranit nevalidní UTF-8 znaky
                $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
            }
        });

        // Enkódovat s podporou UTF-8
        $json_string = json_encode($faktura, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
        if (json_last_error() !== JSON_ERROR_NONE || !$json_string) {
            // Fallback: vrátit error zprávu
            http_response_code(500);
            echo json_encode([
                'err' => 'Chyba při zpracování dat faktury',
                'detail' => json_last_error_msg()
            ]);
            return;
        }
        
        http_response_code(200);
        echo $json_string;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání faktury: ' . $e->getMessage()]);
    }
}

/**
 * Vytvoření faktury + Upload přílohy (ISDOC nebo jiný soubor) v jedné transakci
 * Používá se pro frontend kde faktura vždy přichází s přílohou
 * 
 * Očekává multipart/form-data:
 *   - token, username (autentizace)
 *   - objednavka_id (povinné)
 *   - fa_castka, fa_cislo_vema (povinné metadata faktury)
 *   - fa_datum_vystaveni, fa_datum_splatnosti, fa_poznamka... (volitelné)
 *   - file (povinné - ISDOC nebo jiný soubor)
 *   - typ_prilohy (default: ISDOC)
 * 
 * Response: {faktura_id, priloha_id, faktura: {...}, priloha: {...}}
 * 
 * @deprecated Používej handle_order_v2_create_invoice_with_attachment() z orderV2InvoiceHandlers.php
 */
function handle_invoices25_create_with_attachment($input, $config, $queries) {
    // Pro multipart/form-data používáme $_POST místo $input
    $token = isset($_POST['token']) ? $_POST['token'] : '';
    $request_username = isset($_POST['username']) ? $_POST['username'] : '';
    // ✅ objednavka_id může být NULL (standalone faktura) nebo validní ID objednávky (> 0)
    $objednavka_id = isset($_POST['objednavka_id']) && (int)$_POST['objednavka_id'] > 0 ? (int)$_POST['objednavka_id'] : null;
    $fa_castka = isset($_POST['fa_castka']) ? $_POST['fa_castka'] : null;
    $fa_cislo_vema = isset($_POST['fa_cislo_vema']) ? trim($_POST['fa_cislo_vema']) : '';
    $typ_prilohy = isset($_POST['typ_prilohy']) ? $_POST['typ_prilohy'] : 'ISDOC';
    
    // ✅ objednavka_id je nyní NEPOVINNÉ (může být NULL)
    if (!$token || !$request_username || !$fa_castka || empty($fa_cislo_vema)) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí povinné parametry: token, username, fa_castka, fa_cislo_vema']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    // Kontrola uploaded file
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['err' => 'Chyba při nahrávání souboru']);
        return;
    }

    $file = $_FILES['file'];
    $original_name = basename($file['name']);
    $file_size = $file['size'];
    $tmp_path = $file['tmp_name'];

    // Validace typu souboru (whitelist)
    $allowed_extensions = array('pdf', 'isdoc', 'jpg', 'jpeg', 'png', 'xml');
    $pathinfo = pathinfo($original_name);
    $ext = isset($pathinfo['extension']) ? strtolower($pathinfo['extension']) : '';
    
    if (!in_array($ext, $allowed_extensions)) {
        http_response_code(400);
        echo json_encode(['err' => 'Nepodporovaný typ souboru. Povolené: ' . implode(', ', $allowed_extensions)]);
        return;
    }

    // Validace velikosti - načti z konfigurace nebo fallback
    $_config = require __DIR__ . '/dbconfig.php';
    $uploadConfig = isset($_config['upload']) ? $_config['upload'] : array();
    $max_size = isset($uploadConfig['max_file_size']) ? $uploadConfig['max_file_size'] : (20 * 1024 * 1024); // 20MB default
    
    if ($file_size > $max_size) {
        http_response_code(400);
        echo json_encode(['err' => 'Soubor je příliš velký. Maximum: ' . ($max_size / 1024 / 1024) . 'MB']);
        return;
    }

    // Validace MIME type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime_type = finfo_file($finfo, $tmp_path);
    finfo_close($finfo);
    
    $allowed_mimes = array(
        'application/pdf',
        'application/xml',
        'text/xml',
        'image/jpeg',
        'image/png'
    );
    
    if (!in_array($mime_type, $allowed_mimes)) {
        http_response_code(400);
        echo json_encode(['err' => 'Nepodporovaný MIME type souboru']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }

        // ========== TRANSAKCE: Vytvoř fakturu + nahraj přílohu ==========
        $db->beginTransaction();

        // 1. VYTVOŘ FAKTURU
        $faktury_table = get_invoices_table_name();
        $sql_faktura = "INSERT INTO `$faktury_table` (
            objednavka_id,
            fa_dorucena,
            fa_castka,
            fa_cislo_vema,
            fa_datum_vystaveni,
            fa_datum_splatnosti,
            fa_datum_doruceni,
            fa_strediska_kod,
            fa_poznamka,
            rozsirujici_data,
            vytvoril_uzivatel_id,
            dt_vytvoreni,
            dt_aktualizace,
            aktivni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)";

        $stmt_faktura = $db->prepare($sql_faktura);
        
        $fa_dorucena = isset($_POST['fa_dorucena']) ? (int)$_POST['fa_dorucena'] : 0;
        $fa_datum_vystaveni = isset($_POST['fa_datum_vystaveni']) ? $_POST['fa_datum_vystaveni'] : null;
        $fa_datum_splatnosti = isset($_POST['fa_datum_splatnosti']) ? $_POST['fa_datum_splatnosti'] : null;
        $fa_datum_doruceni = isset($_POST['fa_datum_doruceni']) ? $_POST['fa_datum_doruceni'] : null;
        $fa_strediska_kod = isset($_POST['fa_strediska_kod']) ? $_POST['fa_strediska_kod'] : null;
        $fa_poznamka = isset($_POST['fa_poznamka']) ? $_POST['fa_poznamka'] : null;
        $rozsirujici_data = isset($_POST['rozsirujici_data']) ? json_encode($_POST['rozsirujici_data']) : null;

        $stmt_faktura->execute(array(
            $objednavka_id,
            $fa_dorucena,
            $fa_castka,
            $fa_cislo_vema,
            $fa_datum_vystaveni,
            $fa_datum_splatnosti,
            $fa_datum_doruceni,
            $fa_strediska_kod,
            $fa_poznamka,
            $rozsirujici_data,
            $token_data['id']
        ));

        $faktura_id = $db->lastInsertId();

        // 2. PŘIPRAV PŘÍLOHU
        $upload_dir = get_orders25_upload_path($config, $objednavka_id, $token_data['id']);
        
        $guid_part = sprintf('%08x%04x%04x%04x%012x',
            mt_rand(), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff), mt_rand()
        );
        $systemovy_nazev = 'fa-' . date('Y-m-d') . '_' . $guid_part;
        $filename = $systemovy_nazev . '.' . $ext;
        $full_path = $upload_dir . $filename;
        
        // Vytvoř složky pokud neexistují
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }

        // Přesuň soubor
        if (!move_uploaded_file($tmp_path, $full_path)) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(['err' => 'Chyba při ukládání souboru na disk']);
            return;
        }

        // 3. VYTVOŘ ZÁZNAM PŘÍLOHY
        $je_isdoc = ($ext === 'isdoc') ? 1 : 0;

        $sql_priloha = "INSERT INTO `" . TBL_FAKTURY_PRILOHY . "` (
            faktura_id,
            objednavka_id,
            guid,
            typ_prilohy,
            originalni_nazev_souboru,
            systemova_cesta,
            velikost_souboru_b,
            je_isdoc,
            nahrano_uzivatel_id,
            dt_vytvoreni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt_priloha = $db->prepare($sql_priloha);
        $stmt_priloha->execute(array(
            $faktura_id,
            $objednavka_id,
            $systemovy_nazev,
            $typ_prilohy,
            $original_name,
            $full_path,
            $file_size,
            $je_isdoc,
            $token_data['id']
        ));

        $priloha_id = $db->lastInsertId();

        // 4. COMMIT transakce
        $db->commit();

        // 5. Načti vytvořenou fakturu
        $stmt_get_faktura = $db->prepare("SELECT * FROM `$faktury_table` WHERE id = ?");
        $stmt_get_faktura->execute(array($faktura_id));
        $faktura = $stmt_get_faktura->fetch(PDO::FETCH_ASSOC);

        // 6. Načti vytvořenou přílohu
        $stmt_get_priloha = $db->prepare("
            SELECT 
                fp.*,
                u.jmeno AS nahrano_uzivatel_jmeno,
                u.prijmeni AS nahrano_uzivatel_prijmeni
            FROM `" . TBL_FAKTURY_PRILOHY . "` fp
            LEFT JOIN `25_uzivatele` u ON fp.nahrano_uzivatel_id = u.id
            WHERE fp.id = ?
        ");
        $stmt_get_priloha->execute(array($priloha_id));
        $priloha = $stmt_get_priloha->fetch(PDO::FETCH_ASSOC);
        
        // Formátuj pro frontend
        $priloha['velikost_kb'] = round($priloha['velikost_souboru_b'] / 1024, 2);
        $priloha['velikost_mb'] = round($priloha['velikost_souboru_b'] / 1024 / 1024, 2);
        $priloha['nahrano_uzivatel'] = trim($priloha['nahrano_uzivatel_jmeno'] . ' ' . $priloha['nahrano_uzivatel_prijmeni']);
        $priloha['je_isdoc'] = (int)$priloha['je_isdoc'] === 1;
        $priloha['isdoc_parsed'] = (int)$priloha['isdoc_parsed'] === 1;

        http_response_code(201);
        echo json_encode([
            'status' => 'ok',
            'message' => 'Faktura včetně přílohy byla úspěšně vytvořena',
            'faktura_id' => (int)$faktura_id,
            'priloha_id' => (int)$priloha_id,
            'faktura' => $faktura,
            'priloha' => $priloha
        ]);

    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        
        // Pokud nastala chyba, smaž soubor pokud existuje
        if (isset($full_path) && file_exists($full_path)) {
            unlink($full_path);
        }
        
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při vytváření faktury s přílohou: ' . $e->getMessage()]);
    }
}

/**
 * POST - Seznam všech faktur s filtrováním a stránkováním
 * Endpoint: invoices25/list
 * POST: {token, username, page, per_page, filters: {...}}
 * 
 * Filtry:
 * - objednavka_id (int)
 * - fa_dorucena (0/1)
 * - fa_cislo_vema (string, partial match)
 * - datum_od, datum_do (date range pro fa_datum_vystaveni)
 * - stredisko (string, kontrola v JSON poli fa_strediska_kod)
 * 
 * Response: {faktury: [...], pagination: {...}, stats: {...}}
 */
function handle_invoices25_list($input, $config, $queries) {
    // 🐛 DEBUG: Log úplný payload
    error_log("INVOICE LIST PAYLOAD DEBUG: " . json_encode($input, JSON_UNESCAPED_UNICODE));
    
    // 🔍 DEBUG: Specifically log amount filter parameters
    if (isset($input['castka_gt']) || isset($input['castka_lt']) || isset($input['castka_eq'])) {
        error_log("🔥 AMOUNT FILTERS DETECTED:");
        if (isset($input['castka_gt'])) error_log("  castka_gt = " . $input['castka_gt']);
        if (isset($input['castka_lt'])) error_log("  castka_lt = " . $input['castka_lt']);
        if (isset($input['castka_eq'])) error_log("  castka_eq = " . $input['castka_eq']);
    }
    
    if (isset($input['filter_dt_aktualizace'])) {
        error_log("PAYLOAD CONTAINS filter_dt_aktualizace: " . $input['filter_dt_aktualizace']);
    } else {
        error_log("PAYLOAD MISSING filter_dt_aktualizace!");
    }
    
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token || !$request_username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(array('status' => 'error', 'message' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => 'Chyba připojení k databázi'));
            return;
        }

        // Stránkování (volitelné - pro FE kompatibilitu)
        $page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
        $per_page = isset($input['per_page']) ? max(1, (int)$input['per_page']) : 50;
        $offset = ($page - 1) * $per_page;
        
        // Zjistit, jestli použít stránkování (pokud FE nechce pagination, vrátit vše)
        $use_pagination = isset($input['page']) || isset($input['per_page']);

        // Filtry - podporujeme obojí formáty:
        // 1. Vnořené: filters.objednavka_id (původní návrh)
        // 2. Root level: objednavka_id (FE kompatibilita)
        $filters = isset($input['filters']) && is_array($input['filters']) ? $input['filters'] : array();
        
        // DEBUG: Log raw input to see what we receive
        error_log("Invoices25 LIST: Raw input keys: " . implode(', ', array_keys($input)));
        error_log("Invoices25 LIST: castka_min in input? " . (isset($input['castka_min']) ? 'YES (' . $input['castka_min'] . ')' : 'NO'));
        error_log("Invoices25 LIST: castka_max in input? " . (isset($input['castka_max']) ? 'YES (' . $input['castka_max'] . ')' : 'NO'));
        
        // Merge root level parametrů do filters (pro FE kompatibilitu)
        // FE může poslat přímo: { token, username, year, objednavka_id, fa_dorucena, usek_id, filter_status, ... }
        $filter_keys = array(
            'objednavka_id', 'fa_dorucena', 'fa_cislo_vema', 'datum_od', 'datum_do', 
            'stredisko', 'organizace_id', 'usek_id', 'filter_status',
            // Nové filtry pro globální vyhledávání a sloupcové filtry
            'search_term', 'cislo_objednavky', 'filter_datum_doruceni', 'filter_datum_vystaveni', 'filter_datum_splatnosti', 'filter_dt_aktualizace',
            'filter_stav', 'filter_vytvoril_uzivatel', 'filter_fa_typ',
            // Filtry pro částku (operator-based: =, <, >)
            'castka_gt', 'castka_lt', 'castka_eq', 'filter_ma_prilohy',
            // Filtry pro věcnou kontrolu a předání zaměstnanci
            'filter_vecna_kontrola', 'filter_vecnou_provedl', 'filter_predano_zamestnanec',
            // Filtr pro kontrolu řádku
            'filter_kontrola_radku',
            // ŘAZENÍ - order_by a order_direction  
            'order_by', 'order_direction'
        );
        foreach ($filter_keys as $key) {
            if (isset($input[$key]) && !isset($filters[$key])) {
                $filters[$key] = $input[$key];
                error_log("Invoices25 LIST: Merged from root: $key = " . json_encode($input[$key]));
            }
        }
        
        // DEBUG: Log merged filters
        error_log("Invoices25 LIST: Final filters array: " . json_encode($filters));
        
        $where_conditions = array('f.aktivni = 1');
        $params = array();
        
        // 🔒 VALIDACE: Faktury s neaktivní objednávkou nebo smlouvou se nebudou zobrazovat
        // - Pokud je faktura navázána na objednávku (objednavka_id IS NOT NULL) → objednávka MUSÍ být aktivní
        // - Pokud je faktura navázána na smlouvu (smlouva_id IS NOT NULL) → smlouva MUSÍ být aktivní
        // - Faktury bez přiřazení (objednavka_id/smlouva_id = NULL) → zobrazit normálně
        $where_conditions[] = '(
            (f.objednavka_id IS NULL OR o.aktivni = 1)
            AND
            (f.smlouva_id IS NULL OR sm.aktivni = 1)
        )';
        error_log("Invoices25 LIST: Applied validation for active orders and contracts");
        
        // 🔐 USER PERMISSIONS: Načíst role a permissions uživatele (stejný pattern jako Order V2)
        $user_id = (int)$token_data['id'];
        
        // Načíst role uživatele z DB
        $roles_sql = "SELECT r.kod_role 
                      FROM `25_role` r 
                      JOIN `25_uzivatele_role` ur ON r.id = ur.role_id 
                      WHERE ur.uzivatel_id = ?";
        $roles_stmt = $db->prepare($roles_sql);
        $roles_stmt->execute(array($user_id));
        $user_roles = array();
        while ($row = $roles_stmt->fetch(PDO::FETCH_ASSOC)) {
            $user_roles[] = $row['kod_role'];
        }
        
        // Načíst úsek uživatele z DB (pro filtrování podle úseku)
        $usek_sql = "SELECT u.usek_id, us.usek_zkr 
                     FROM `25_uzivatele` u 
                     LEFT JOIN `25_useky` us ON u.usek_id = us.id 
                     WHERE u.id = ?";
        $usek_stmt = $db->prepare($usek_sql);
        $usek_stmt->execute(array($user_id));
        $usek_data = $usek_stmt->fetch(PDO::FETCH_ASSOC);
        $user_usek_id = $usek_data ? (int)$usek_data['usek_id'] : null;
        $user_usek_zkr = $usek_data ? $usek_data['usek_zkr'] : null;
        
        // Načíst permissions uživatele z DB (pro kontrolu INVOICE_MANAGE)
        $perms_sql = "
            SELECT DISTINCT p.kod_prava
            FROM " . TBL_PRAVA . " p
            WHERE p.kod_prava LIKE 'INVOICE_%'
            AND p.id IN (
                -- Přímá práva (user_id v 25_role_prava)
                SELECT rp.pravo_id FROM " . TBL_ROLE_PRAVA . " rp 
                WHERE rp.user_id = ?
                
                UNION
                
                -- Práva z rolí (user_id = -1 znamená právo z role)
                SELECT rp.pravo_id 
                FROM " . TBL_UZIVATELE_ROLE . " ur
                JOIN " . TBL_ROLE_PRAVA . " rp ON ur.role_id = rp.role_id AND rp.user_id = -1
                WHERE ur.uzivatel_id = ?
            )
        ";
        $perms_stmt = $db->prepare($perms_sql);
        $perms_stmt->execute(array($user_id, $user_id));
        $user_permissions = array();
        while ($row = $perms_stmt->fetch(PDO::FETCH_ASSOC)) {
            $user_permissions[] = $row['kod_prava'];
        }
        
        // Kontrola INVOICE_MANAGE práva
        $has_invoice_manage = in_array('INVOICE_MANAGE', $user_permissions);
        
        // 🔥 ADMIN CHECK: SUPERADMIN, ADMINISTRATOR, UCETNI nebo INVOICE_MANAGE = plný přístup (vidí VŠE)
        // Role UCETNI má automatický přístup ke všem fakturám pro účetní operace
        // Právo INVOICE_MANAGE umožňuje správu všech faktur v systému
        $is_admin = in_array('SUPERADMIN', $user_roles) || 
                    in_array('ADMINISTRATOR', $user_roles) || 
                    in_array('UCETNI', $user_roles) ||
                    in_array('HLAVNI_UCETNI', $user_roles) ||
                    $has_invoice_manage;
        
        // DEBUG logging
        error_log("Invoices25 LIST: User $user_id roles: " . implode(', ', $user_roles));
        error_log("Invoices25 LIST: User $user_id permissions: " . implode(', ', $user_permissions));
        error_log("Invoices25 LIST: User usek_id: " . ($user_usek_id ?: 'NULL') . ", usek_zkr: " . ($user_usek_zkr ?: 'NULL'));
        error_log("Invoices25 LIST: Has INVOICE_MANAGE: " . ($has_invoice_manage ? 'YES' : 'NO'));
        error_log("Invoices25 LIST: Is admin (SUPERADMIN/ADMINISTRATOR/UCETNI/HLAVNI_UCETNI/INVOICE_MANAGE): " . ($is_admin ? 'YES' : 'NO'));

        // USER ISOLATION: non-admin vidí pouze své faktury nebo faktury kde je účastníkem
        if (!$is_admin) {
            // 🔐 ROZŠÍŘENÁ LOGIKA PRO BĚŽNÉ UŽIVATELE:
            // 1. Faktury k objednávkám kde je uživatel účastníkem (objednavatel, schvalovatel, příkazce, garant, atd.)
            // 2. Faktury předané uživateli k věcné kontrole
            // 3. Faktury které sám vytvořil
            // 4. U smluv: faktury k smlouvám přiřazeným k úseku uživatele
            
            $user_access_conditions = array();
            $user_access_params = array();
            
            // 1️⃣ OBJEDNÁVKY - kde je uživatel účastníkem v jakékoli roli
            // Sloupce garant_uzivatel_id, objednatel_id, schvalovatel_id, prikazce_id jsou přímo v tabulce 25a_objednavky
            $user_orders_sql = "
                SELECT DISTINCT o.id 
                FROM `" . TBL_OBJEDNAVKY . "` o
                WHERE (
                    o.uzivatel_id = ?                     -- vytvořil objednávku
                    OR o.garant_uzivatel_id = ?           -- je garant objednávky  
                    OR o.objednatel_id = ?                -- je objednavatel
                    OR o.schvalovatel_id = ?              -- je schvalovatel
                    OR o.prikazce_id = ?                  -- je příkazce objednávky
                    OR o.potvrdil_vecnou_spravnost_id = ? -- potvrdil věcnou správnost objednávky
                    OR o.fakturant_id = ?                 -- je fakturant
                )
            ";
            $user_orders_stmt = $db->prepare($user_orders_sql);
            $user_orders_stmt->execute(array($user_id, $user_id, $user_id, $user_id, $user_id, $user_id, $user_id));
            $user_order_ids = array();
            while ($row = $user_orders_stmt->fetch(PDO::FETCH_ASSOC)) {
                $user_order_ids[] = (int)$row['id'];
            }
            
            // 2️⃣ FAKTURY K OBJEDNÁVKÁM - kde je účastníkem
            if (!empty($user_order_ids)) {
                $user_access_conditions[] = 'f.objednavka_id IN (' . implode(',', $user_order_ids) . ')';
                error_log("Invoices25 LIST: User $user_id has access to " . count($user_order_ids) . " orders");
            }
            
            // 3️⃣ FAKTURY PŘEDANÉ K VĚCNÉ KONTROLE (sloupec fa_predana_zam_id přímo v tabulce faktur)
            $user_access_conditions[] = 'f.fa_predana_zam_id = ?';
            $user_access_params[] = $user_id;
            
            // 4️⃣ FAKTURY POTVRZENÉ UŽIVATELEM (sloupec potvrdil_vecnou_spravnost_id přímo v tabulce faktur)
            $user_access_conditions[] = 'f.potvrdil_vecnou_spravnost_id = ?';
            $user_access_params[] = $user_id;
            
            // 5️⃣ FAKTURY KTERÉ SAM VYTVOŘIL
            $user_access_conditions[] = 'f.vytvoril_uzivatel_id = ?';
            $user_access_params[] = $user_id;
            
            // 6️⃣ SMLOUVY - faktury k smlouvám přiřazeným k úseku uživatele
            if ($user_usek_id) {
                $user_access_conditions[] = '(f.smlouva_id IS NOT NULL AND sm.usek_id = ?)';
                $user_access_params[] = $user_usek_id;
                error_log("Invoices25 LIST: User $user_id - added access to contracts for usek_id: $user_usek_id");
            }
            
            // Sestavit finální podmínku
            if (empty($user_access_conditions)) {
                // Uživatel nemá přístup k žádným fakturám
                error_log("Invoices25 LIST: User $user_id has NO access to any invoices - returning empty list");
                http_response_code(200);
                echo json_encode(array(
                    'status' => 'ok', 
                    'faktury' => array(),
                    'pagination' => array(
                        'page' => $page,
                        'per_page' => $per_page,
                        'total' => 0,
                        'total_pages' => 0
                    )
                ));
                return;
            }
            
            // Přidat podmínku do WHERE
            $where_conditions[] = '(' . implode(' OR ', $user_access_conditions) . ')';
            $params = array_merge($params, $user_access_params);
            
            error_log("Invoices25 LIST: User $user_id - applying EXTENDED user isolation with " . count($user_access_conditions) . " access conditions");
        } else {
            error_log("Invoices25 LIST: User $user_id IS ADMIN - showing ALL invoices WITHOUT user filter");
        }

        // Filtr: year (FE kompatibilita - root level parametr)
        if (isset($input['year']) && (int)$input['year'] > 0) {
            $where_conditions[] = 'YEAR(f.fa_datum_vystaveni) = ?';
            $params[] = (int)$input['year'];
        }

        // Filtr: objednavka_id
        if (isset($filters['objednavka_id']) && $filters['objednavka_id'] > 0) {
            $where_conditions[] = 'f.objednavka_id = ?';
            $params[] = (int)$filters['objednavka_id'];
        }

        // Filtr: fa_dorucena
        if (isset($filters['fa_dorucena']) && $filters['fa_dorucena'] !== '') {
            $where_conditions[] = 'f.fa_dorucena = ?';
            $params[] = (int)$filters['fa_dorucena'];
        }

        // Filtr: fa_cislo_vema (partial match)
        if (isset($filters['fa_cislo_vema']) && trim($filters['fa_cislo_vema']) !== '') {
            $where_conditions[] = 'f.fa_cislo_vema LIKE ?';
            $params[] = '%' . trim($filters['fa_cislo_vema']) . '%';
        }

        // Filtr: datum vystavení - od
        if (isset($filters['datum_od']) && !empty($filters['datum_od'])) {
            $where_conditions[] = 'f.fa_datum_vystaveni >= ?';
            $params[] = $filters['datum_od'];
        }

        // Filtr: datum vystavení - do
        if (isset($filters['datum_do']) && !empty($filters['datum_do'])) {
            $where_conditions[] = 'f.fa_datum_vystaveni <= ?';
            $params[] = $filters['datum_do'];
        }

        // Filtr: stredisko (hledá v JSON poli fa_strediska_kod)
        if (isset($filters['stredisko']) && trim($filters['stredisko']) !== '') {
            $where_conditions[] = 'f.fa_strediska_kod LIKE ?';
            $params[] = '%' . strtoupper(trim($filters['stredisko'])) . '%';
        }
        
        // Filtr: organizace_id (filtr podle organizace z objednávky)
        if (isset($filters['organizace_id']) && (int)$filters['organizace_id'] > 0) {
            $where_conditions[] = 'u_obj.organizace_id = ?';
            $params[] = (int)$filters['organizace_id'];
        }
        
        // Filtr: usek_id (filtr podle úseku uživatele objednávky)
        // Uživatel může filtrovat faktury podle úseku (např. admin vidí jen faktury svého úseku)
        if (isset($filters['usek_id']) && (int)$filters['usek_id'] > 0) {
            $where_conditions[] = 'u_obj.usek_id = ?';
            $params[] = (int)$filters['usek_id'];
            error_log("Invoices25 LIST: Applying usek_id filter = " . (int)$filters['usek_id']);
        }
        
        // ========================================================================
        // SLOUPCOVÉ FILTRY (columnFilters z FE)
        // ========================================================================
        
        // Filtr: filter_datum_doruceni (přesná shoda na den - datum doručení)
        if (isset($filters['filter_datum_doruceni']) && !empty($filters['filter_datum_doruceni'])) {
            $where_conditions[] = 'DATE(f.fa_datum_doruceni) = ?';
            $params[] = $filters['filter_datum_doruceni'];
        }
        
        // Filtr: filter_dt_aktualizace (přesná shoda na den - datum aktualizace)
        if (isset($filters['filter_dt_aktualizace']) && !empty($filters['filter_dt_aktualizace'])) {
            $where_conditions[] = 'DATE(f.dt_aktualizace) = ?';
            $params[] = $filters['filter_dt_aktualizace'];
            error_log("Invoices25 LIST: Applying filter_dt_aktualizace = " . $filters['filter_dt_aktualizace']);
        }
        
        // Filtr: filter_fa_typ (typ faktury - přesná shoda)
        if (isset($filters['filter_fa_typ']) && !empty($filters['filter_fa_typ'])) {
            $where_conditions[] = 'f.fa_typ = ?';
            $params[] = strtoupper(trim($filters['filter_fa_typ']));
            error_log("Invoices25 LIST: Applying filter_fa_typ = " . strtoupper(trim($filters['filter_fa_typ'])));
        }
        
        // Filtr: cislo_objednavky (částečná shoda - LIKE)
        // ⚠️ UNIVERSAL: Hledá v čísle objednávky NEBO v čísle smlouvy!
        if (isset($filters['cislo_objednavky']) && trim($filters['cislo_objednavky']) !== '') {
            $search_obj_sml = strtolower(trim($filters['cislo_objednavky']));
            $where_conditions[] = '(LOWER(o.cislo_objednavky) LIKE ? OR LOWER(sm.cislo_smlouvy) LIKE ?)';
            $params[] = '%' . $search_obj_sml . '%';
            $params[] = '%' . $search_obj_sml . '%';
            error_log("Invoices25 LIST: Applying cislo_objednavky filter (OBJ + SML) = '$search_obj_sml'");
        }
        
        // Filtr: filter_datum_vystaveni (přesná shoda na den)
        if (isset($filters['filter_datum_vystaveni']) && !empty($filters['filter_datum_vystaveni'])) {
            $where_conditions[] = 'DATE(f.fa_datum_vystaveni) = ?';
            $params[] = $filters['filter_datum_vystaveni'];
        }
        
        // Filtr: filter_datum_splatnosti (přesná shoda na den)
        if (isset($filters['filter_datum_splatnosti']) && !empty($filters['filter_datum_splatnosti'])) {
            $where_conditions[] = 'DATE(f.fa_datum_splatnosti) = ?';
            $params[] = $filters['filter_datum_splatnosti'];
        }
        
        // Filtr: filter_stav (sloupcový filtr stavu workflow)
        // POZNÁMKA: Toto je sloupcový filtr, ne dashboard filter_status!
        // Podporuje nové workflow stavy: ZAEVIDOVANA, VECNA_SPRAVNOST, V_RESENI, PREDANA_PO, K_ZAPLACENI, ZAPLACENO, DOKONCENA, STORNO
        if (isset($filters['filter_stav']) && !empty($filters['filter_stav'])) {
            $filter_stav = strtoupper(trim($filters['filter_stav']));
            
            // Workflow stavy - přesná shoda ENUM hodnoty
            $valid_workflow_states = array('ZAEVIDOVANA', 'VECNA_SPRAVNOST', 'V_RESENI', 'PREDANA_PO', 'K_ZAPLACENI', 'ZAPLACENO', 'DOKONCENA', 'STORNO');
            if (in_array($filter_stav, $valid_workflow_states)) {
                $where_conditions[] = 'f.stav = ?';
                $params[] = $filter_stav;
                error_log("Invoices25 LIST: Applying filter_stav workflow = " . $filter_stav);
            }
            // Zpětná kompatibilita se starými hodnotami (paid/unpaid/overdue)
            else {
                $filter_stav_lower = strtolower($filter_stav);
                switch ($filter_stav_lower) {
                    case 'paid':
                        $where_conditions[] = 'f.fa_zaplacena = 1';
                        break;
                    case 'unpaid':
                        $where_conditions[] = 'f.fa_zaplacena = 0 AND (f.fa_datum_splatnosti >= CURDATE() OR f.fa_datum_splatnosti IS NULL)';
                        break;
                    case 'overdue':
                        $where_conditions[] = 'f.fa_zaplacena = 0 AND f.fa_datum_splatnosti < CURDATE()';
                        break;
                }
            }
        }
        
        // Filtr: filter_vytvoril_uzivatel (uživatel který fakturu vytvořil - hledá v celém jméně)
        if (isset($filters['filter_vytvoril_uzivatel']) && trim($filters['filter_vytvoril_uzivatel']) !== '') {
            $search_user = strtolower(trim($filters['filter_vytvoril_uzivatel']));
            $where_conditions[] = '(LOWER(u_vytvoril.jmeno) LIKE ? OR LOWER(u_vytvoril.prijmeni) LIKE ? OR LOWER(CONCAT(u_vytvoril.jmeno, " ", u_vytvoril.prijmeni)) LIKE ? OR LOWER(CONCAT_WS(" ", u_vytvoril.titul_pred, u_vytvoril.jmeno, u_vytvoril.prijmeni, u_vytvoril.titul_za)) LIKE ?)';
            $params[] = '%' . $search_user . '%';
            $params[] = '%' . $search_user . '%';
            $params[] = '%' . $search_user . '%';
            $params[] = '%' . $search_user . '%';
        }
        
        // Filtr: castka_gt, castka_lt, castka_eq (operator-based filtrování částky)
        // Formát z FE: castka_gt = 5000 (větší než), castka_lt = 1000 (menší než), castka_eq = 1234 (rovná se)
        if (isset($filters['castka_gt']) && $filters['castka_gt'] !== '' && is_numeric($filters['castka_gt'])) {
            $where_conditions[] = 'f.fa_castka > ?';
            $params[] = (float)$filters['castka_gt'];
        }
        
        if (isset($filters['castka_lt']) && $filters['castka_lt'] !== '' && is_numeric($filters['castka_lt'])) {
            $where_conditions[] = 'f.fa_castka < ?';
            $params[] = (float)$filters['castka_lt'];
        }
        
        if (isset($filters['castka_eq']) && $filters['castka_eq'] !== '' && is_numeric($filters['castka_eq'])) {
            // Pro rovnost použijeme malou toleranci (0.01 Kč) kvůli floating point aritmetice
            $where_conditions[] = 'ABS(f.fa_castka - ?) < 0.01';
            $params[] = (float)$filters['castka_eq'];
        }
        
        // Filtr: filter_ma_prilohy (filtrace podle přítomnosti příloh)
        // NOTE: Tento filtr se aplikuje pomocí HAVING, ne WHERE (pocet_priloh je agregace)
        $having_ma_prilohy = null;
        if (isset($filters['filter_ma_prilohy']) && $filters['filter_ma_prilohy'] !== '') {
            if ((int)$filters['filter_ma_prilohy'] === 1) {
                // Pouze s přílohami
                $having_ma_prilohy = 'COUNT(DISTINCT prilohy.id) > 0';
                error_log("Invoices25 LIST: Applying filter_ma_prilohy = 1 (s přílohami) via HAVING");
            } else if ((int)$filters['filter_ma_prilohy'] === 0) {
                // Pouze bez příloh
                $having_ma_prilohy = 'COUNT(DISTINCT prilohy.id) = 0';
                error_log("Invoices25 LIST: Applying filter_ma_prilohy = 0 (bez příloh) via HAVING");
            }
        }
        
        // Filtr: filter_vecna_kontrola (věcná kontrola provedena/neprovedena)
        if (isset($filters['filter_vecna_kontrola']) && $filters['filter_vecna_kontrola'] !== '') {
            if ((int)$filters['filter_vecna_kontrola'] === 1) {
                // Pouze provedena
                $where_conditions[] = 'f.vecna_spravnost_potvrzeno = 1';
            } else if ((int)$filters['filter_vecna_kontrola'] === 0) {
                // Pouze neprovedena
                $where_conditions[] = '(f.vecna_spravnost_potvrzeno = 0 OR f.vecna_spravnost_potvrzeno IS NULL)';
            }
        }
        
        // Filtr: filter_vecnou_provedl (uživatel který provedl věcnou kontrolu)
        if (isset($filters['filter_vecnou_provedl']) && trim($filters['filter_vecnou_provedl']) !== '') {
            $search_vecna = strtolower(trim($filters['filter_vecnou_provedl']));
            error_log("Invoices25 LIST: Applying filter_vecnou_provedl = '$search_vecna'");
            // Hledá v celém jméně včetně titulů - MUSÍ existovat JOIN (u_vecna.id IS NOT NULL)
            $where_conditions[] = '(u_vecna.id IS NOT NULL AND (LOWER(u_vecna.jmeno) LIKE ? OR LOWER(u_vecna.prijmeni) LIKE ? OR LOWER(CONCAT(u_vecna.jmeno, " ", u_vecna.prijmeni)) LIKE ? OR LOWER(CONCAT_WS(" ", u_vecna.titul_pred, u_vecna.jmeno, u_vecna.prijmeni, u_vecna.titul_za)) LIKE ?))';
            $params[] = '%' . $search_vecna . '%';
            $params[] = '%' . $search_vecna . '%';
            $params[] = '%' . $search_vecna . '%';
            $params[] = '%' . $search_vecna . '%';
        }
        
        // Filtr: filter_predano_zamestnanec (zaměstnanec kterému byla faktura předána)
        if (isset($filters['filter_predano_zamestnanec']) && trim($filters['filter_predano_zamestnanec']) !== '') {
            $search_predano = strtolower(trim($filters['filter_predano_zamestnanec']));
            error_log("Invoices25 LIST: Applying filter_predano_zamestnanec = '$search_predano'");
            // Hledá v celém jméně včetně titulů - MUSÍ existovat JOIN (u_predana.id IS NOT NULL)
            $where_conditions[] = '(u_predana.id IS NOT NULL AND (LOWER(u_predana.jmeno) LIKE ? OR LOWER(u_predana.prijmeni) LIKE ? OR LOWER(CONCAT(u_predana.jmeno, " ", u_predana.prijmeni)) LIKE ? OR LOWER(CONCAT_WS(" ", u_predana.titul_pred, u_predana.jmeno, u_predana.prijmeni, u_predana.titul_za)) LIKE ?))';
            $params[] = '%' . $search_predano . '%';
            $params[] = '%' . $search_predano . '%';
            $params[] = '%' . $search_predano . '%';
            $params[] = '%' . $search_predano . '%';
        }
        
        // Filtr: filter_kontrola_radku (kontrola řádku - kontrolovano/nekontrolovano)
        if (isset($filters['filter_kontrola_radku']) && trim($filters['filter_kontrola_radku']) !== '') {
            $filter_kontrola = trim($filters['filter_kontrola_radku']);
            error_log("Invoices25 LIST: Applying filter_kontrola_radku = '$filter_kontrola'");
            
            if ($filter_kontrola === 'kontrolovano') {
                // Pouze kontrolované - JSON obsahuje kontrola.kontrolovano = true
                $where_conditions[] = 'JSON_EXTRACT(f.rozsirujici_data, "$.kontrola_radku.kontrolovano") = TRUE';
            } else if ($filter_kontrola === 'nekontrolovano') {
                // Pouze nekontrolované - buď JSON neobsahuje kontrola_radku, nebo kontrolovano = false/null
                $where_conditions[] = '(JSON_EXTRACT(f.rozsirujici_data, "$.kontrola_radku.kontrolovano") IS NULL OR JSON_EXTRACT(f.rozsirujici_data, "$.kontrola_radku.kontrolovano") = FALSE)';
            }
        }
        
        // Filtr: filter_status (dashboard stav faktury - zaplaceno, nezaplaceno, po splatnosti, atd.)
        if (isset($filters['filter_status']) && !empty($filters['filter_status'])) {
            $filter_status = trim($filters['filter_status']);
            error_log("Invoices25 LIST: Applying filter_status = " . $filter_status);
            
            switch ($filter_status) {
                case 'paid':
                    // Zaplaceno: fa_zaplacena = 1
                    $where_conditions[] = 'f.fa_zaplacena = 1';
                    break;
                    
                case 'unpaid':
                    // Nezaplaceno (ještě NEpřekročily splatnost)
                    $where_conditions[] = 'f.fa_zaplacena = 0 AND f.fa_datum_splatnosti >= CURDATE()';
                    break;
                    
                case 'overdue':
                    // Po splatnosti (nezaplacené a překročily splatnost)
                    $where_conditions[] = 'f.fa_zaplacena = 0 AND f.fa_datum_splatnosti < CURDATE()';
                    break;
                    
                case 'without_order':
                    // Bez objednávky
                    $where_conditions[] = '(f.objednavka_id IS NULL OR f.objednavka_id = 0)';
                    break;
                    
                case 'my_invoices':
                    // Moje faktury (kde se vyskytuju - OR logika: zaevidoval, předáno, věcná správnost)
                    $where_conditions[] = '(f.vytvoril_uzivatel_id = ? OR f.fa_predana_zam_id = ? OR f.potvrdil_vecnou_spravnost_id = ?)';
                    $params[] = $user_id;
                    $params[] = $user_id;
                    $params[] = $user_id;
                    break;
                    
                case 'with_contract':
                    // Přiřazené ke smlouvě
                    $where_conditions[] = 'f.smlouva_id IS NOT NULL AND f.smlouva_id > 0';
                    break;
                    
                case 'with_order':
                    // Přiřazené k objednávce
                    $where_conditions[] = 'f.objednavka_id IS NOT NULL AND f.objednavka_id > 0';
                    break;
                    
                case 'without_assignment':
                    // Bez přiřazení (ani OBJ ani SML)
                    $where_conditions[] = '(f.objednavka_id IS NULL OR f.objednavka_id = 0) AND (f.smlouva_id IS NULL OR f.smlouva_id = 0)';
                    break;
                    
                case 'from_spisovka':
                    // Ze Spisovky (má tracking záznam)
                    $where_conditions[] = 'szl.id IS NOT NULL';
                    break;
                    
                case 'kontrolovano':
                    // Zkontrolované faktury (kontrola_radku.kontrolovano = true)
                    $where_conditions[] = 'JSON_EXTRACT(f.rozsirujici_data, "$.kontrola_radku.kontrolovano") = TRUE';
                    break;
                    
                default:
                    // Neznámá hodnota - ignorovat
                    error_log("Invoices25 LIST: Unknown filter_status value: " . $filter_status);
                    break;
            }
        }
        
        // ========================================================================
        // 🔍 GLOBÁLNÍ VYHLEDÁVÁNÍ (search_term)
        // Hledá v LIBOVOLNÉM z těchto polí (OR logika)
        // ========================================================================
        if (isset($filters['search_term']) && trim($filters['search_term']) !== '') {
            $search_term = strtolower(trim($filters['search_term']));
            $search_like = '%' . $search_term . '%';
            
            // OR podmínky pro všechna vyhledávací pole
            $search_conditions = array(
                'LOWER(f.fa_cislo_vema) LIKE ?',              // Číslo faktury
                'LOWER(o.cislo_objednavky) LIKE ?',           // Číslo objednávky
                'LOWER(sm.cislo_smlouvy) LIKE ?',             // Číslo smlouvy ✅ PŘIDÁNO
                'LOWER(sm.nazev_smlouvy) LIKE ?',             // Název smlouvy ✅ PŘIDÁNO
                'LOWER(org.nazev_organizace) LIKE ?',         // Název organizace
                'LOWER(us_obj.usek_zkr) LIKE ?',              // Zkratka úseku
                'LOWER(CONCAT_WS(" ", u_vytvoril.titul_pred, u_vytvoril.jmeno, u_vytvoril.prijmeni, u_vytvoril.titul_za)) LIKE ?',  // Celé jméno uživatele
                'LOWER(CONCAT_WS(" ", u_vecna.titul_pred, u_vecna.jmeno, u_vecna.prijmeni, u_vecna.titul_za)) LIKE ?',  // Věcnou provedl ✅ PŘIDÁNO
                'LOWER(CONCAT_WS(" ", u_predana.titul_pred, u_predana.jmeno, u_predana.prijmeni, u_predana.titul_za)) LIKE ?',  // Předáno zaměstnanci ✅ PŘIDÁNO
                'LOWER(f.fa_poznamka) LIKE ?',                // Poznámka
                'LOWER(f.fa_strediska_kod) LIKE ?',           // Střediska (JSON jako text)
                'LOWER(f.fa_typ) LIKE ?',                     // Typ faktury ✅ PŘIDÁNO
                'LOWER(f.stav) LIKE ?'                        // Workflow stav ✅ PŘIDÁNO
            );
            
            // Přidání parametrů pro každou search podmínku
            foreach ($search_conditions as $condition) {
                $params[] = $search_like;
            }
            
            // Spojení všech search podmínek jako OR a přidání jako AND do hlavních podmínek
            $where_conditions[] = '(' . implode(' OR ', $search_conditions) . ')';
            
            error_log("Invoices25 LIST: Applying global search_term = " . $search_term . " (13 fields)");
        }

        // Sestavení WHERE klauzule
        $where_sql = implode(' AND ', $where_conditions);

        // Načtení faktur s JOINy
        $faktury_table = get_invoices_table_name();
        
        // KROK 1: Spočítat celkový počet záznamů a statistiky (před LIMIT)
        // Statistiky pro FE: celková částka, zaplaceno, nezaplaceno, po splatnosti + počty faktur + moje faktury
        $stats_sql = "SELECT 
            COUNT(*) as total,
            COALESCE(SUM(f.fa_castka), 0) as celkem_castka,
            COUNT(CASE WHEN f.fa_zaplacena = 1 THEN 1 END) as pocet_zaplaceno,
            COALESCE(SUM(CASE WHEN f.fa_zaplacena = 1 THEN f.fa_castka ELSE 0 END), 0) as celkem_zaplaceno,
            COUNT(CASE WHEN f.fa_zaplacena = 0 THEN 1 END) as pocet_nezaplaceno,
            COALESCE(SUM(CASE WHEN f.fa_zaplacena = 0 THEN f.fa_castka ELSE 0 END), 0) as celkem_nezaplaceno,
            COUNT(CASE WHEN f.fa_zaplacena = 0 AND f.fa_datum_splatnosti < CURDATE() THEN 1 END) as pocet_po_splatnosti,
            COALESCE(SUM(CASE WHEN f.fa_zaplacena = 0 AND f.fa_datum_splatnosti < CURDATE() THEN f.fa_castka ELSE 0 END), 0) as celkem_po_splatnosti,
            COUNT(CASE WHEN f.vytvoril_uzivatel_id = $user_id OR f.fa_predana_zam_id = $user_id OR f.potvrdil_vecnou_spravnost_id = $user_id THEN 1 END) as pocet_moje_faktury,
            COALESCE(SUM(CASE WHEN f.vytvoril_uzivatel_id = $user_id OR f.fa_predana_zam_id = $user_id OR f.potvrdil_vecnou_spravnost_id = $user_id THEN f.fa_castka ELSE 0 END), 0) as celkem_moje_faktury,
            COUNT(CASE WHEN f.smlouva_id IS NOT NULL THEN 1 END) as pocet_s_smlouvou,
            COUNT(CASE WHEN f.objednavka_id IS NOT NULL THEN 1 END) as pocet_s_objednavkou,
            COUNT(CASE WHEN f.objednavka_id IS NULL AND f.smlouva_id IS NULL THEN 1 END) as pocet_bez_prirazeni,
            COUNT(CASE WHEN szl.id IS NOT NULL THEN 1 END) as pocet_ze_spisovky,
            COUNT(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(f.rozsirujici_data, '$.kontrola_radku.kontrolovano')) = 'true' THEN 1 END) as pocet_zkontrolovano
        FROM `$faktury_table` f
        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
        LEFT JOIN `25_smlouvy` sm ON f.smlouva_id = sm.id
        LEFT JOIN `25_uzivatele` u_vytvoril ON f.vytvoril_uzivatel_id = u_vytvoril.id
        LEFT JOIN `25_uzivatele` u_obj ON o.uzivatel_id = u_obj.id
        LEFT JOIN `25_organizace_vizitka` org ON u_obj.organizace_id = org.id
        LEFT JOIN `25_useky` us_obj ON u_obj.usek_id = us_obj.id
        LEFT JOIN `25_uzivatele` u_vecna ON f.potvrdil_vecnou_spravnost_id = u_vecna.id
        LEFT JOIN `25_uzivatele` u_predana ON f.fa_predana_zam_id = u_predana.id
        LEFT JOIN `25_spisovka_zpracovani_log` szl ON f.id = szl.faktura_id
        WHERE $where_sql";
        
        $stats_stmt = $db->prepare($stats_sql);
        $stats_stmt->execute($params);
        $stats = $stats_stmt->fetch(PDO::FETCH_ASSOC);
        $total_count = (int)$stats['total'];
        
        // Statistiky jako floaty (částky) + počty (int)
        $statistiky = array(
            'celkem_castka' => (float)$stats['celkem_castka'],
            'pocet_zaplaceno' => (int)$stats['pocet_zaplaceno'],
            'celkem_zaplaceno' => (float)$stats['celkem_zaplaceno'],
            'pocet_nezaplaceno' => (int)$stats['pocet_nezaplaceno'],
            'celkem_nezaplaceno' => (float)$stats['celkem_nezaplaceno'],
            'pocet_po_splatnosti' => (int)$stats['pocet_po_splatnosti'],
            'celkem_po_splatnosti' => (float)$stats['celkem_po_splatnosti'],
            'pocet_moje_faktury' => (int)$stats['pocet_moje_faktury'],
            'celkem_moje_faktury' => (float)$stats['celkem_moje_faktury'],
            'pocet_s_smlouvou' => (int)$stats['pocet_s_smlouvou'],
            'pocet_s_objednavkou' => (int)$stats['pocet_s_objednavkou'],
            'pocet_bez_prirazeni' => (int)$stats['pocet_bez_prirazeni'],
            'pocet_ze_spisovky' => (int)$stats['pocet_ze_spisovky'],
            'pocet_zkontrolovano' => (int)$stats['pocet_zkontrolovano']
        );
        
        // KROK 2: Načíst samotné záznamy
        $sql = "SELECT 
            f.*,
            o.cislo_objednavky,
            o.uzivatel_id AS objednavka_uzivatel_id,
            o.dodavatel_nazev AS objednavka_dodavatel_nazev,
            o.dodavatel_ico AS objednavka_dodavatel_ico,
            o.stav_workflow_kod AS objednavka_stav_workflow_kod,
            sm.cislo_smlouvy,
            sm.nazev_smlouvy,
            sm.nazev_firmy AS smlouva_nazev_firmy,
            sm.ico AS smlouva_ico,
            u_vytvoril.jmeno AS vytvoril_jmeno,
            u_vytvoril.prijmeni AS vytvoril_prijmeni,
            u_vytvoril.titul_pred AS vytvoril_titul_pred,
            u_vytvoril.titul_za AS vytvoril_titul_za,
            u_vytvoril.email AS vytvoril_email,
            u_vytvoril.telefon AS vytvoril_telefon,
            u_obj.jmeno AS objednavka_uzivatel_jmeno,
            u_obj.prijmeni AS objednavka_uzivatel_prijmeni,
            COUNT(DISTINCT prilohy.id) AS pocet_priloh,
            u_obj.titul_pred AS objednavka_uzivatel_titul_pred,
            u_obj.titul_za AS objednavka_uzivatel_titul_za,
            u_obj.email AS objednavka_uzivatel_email,
            u_obj.telefon AS objednavka_uzivatel_telefon,
            u_obj.organizace_id,
            u_obj.usek_id AS objednavka_usek_id,
            org.nazev_organizace AS organizace_nazev,
            us_obj.usek_zkr AS objednavka_usek_zkr,
            s.nazev_stavu AS fa_typ_nazev,
            s.popis AS fa_typ_popis,
            u_vecna.jmeno AS potvrdil_vecnou_spravnost_jmeno,
            u_vecna.prijmeni AS potvrdil_vecnou_spravnost_prijmeni,
            u_vecna.titul_pred AS potvrdil_vecnou_spravnost_titul_pred,
            u_vecna.titul_za AS potvrdil_vecnou_spravnost_titul_za,
            u_vecna.email AS potvrdil_vecnou_spravnost_email,
            u_predana.jmeno AS fa_predana_zam_jmeno,
            u_predana.prijmeni AS fa_predana_zam_prijmeni,
            u_predana.titul_pred AS fa_predana_zam_titul_pred,
            u_predana.titul_za AS fa_predana_zam_titul_za,
            szl.id AS spisovka_tracking_id,
            szl.dokument_id AS spisovka_dokument_id,
            szl.spisovka_priloha_id AS spisovka_priloha_id
        FROM `$faktury_table` f
        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
        LEFT JOIN `25_smlouvy` sm ON f.smlouva_id = sm.id
        LEFT JOIN `25_uzivatele` u_vytvoril ON f.vytvoril_uzivatel_id = u_vytvoril.id
        LEFT JOIN `25_uzivatele` u_obj ON o.uzivatel_id = u_obj.id
        LEFT JOIN `25_organizace_vizitka` org ON u_obj.organizace_id = org.id
        LEFT JOIN `25_useky` us_obj ON u_obj.usek_id = us_obj.id
        LEFT JOIN `" . TBL_FAKTURY_PRILOHY . "` prilohy ON f.id = prilohy.faktura_id
        LEFT JOIN `25_ciselnik_stavy` s ON s.typ_objektu = 'FAKTURA' AND s.kod_stavu = f.fa_typ
        LEFT JOIN `25_uzivatele` u_vecna ON f.potvrdil_vecnou_spravnost_id = u_vecna.id
        LEFT JOIN `25_uzivatele` u_predana ON f.fa_predana_zam_id = u_predana.id
        LEFT JOIN `25_spisovka_zpracovani_log` szl ON f.id = szl.faktura_id
        WHERE $where_sql
        GROUP BY f.id";
        
        // Přidat HAVING pokud je filtr na přílohy
        if ($having_ma_prilohy !== null) {
            $sql .= " HAVING $having_ma_prilohy";
        }
        
        // Řazení podle FE parametrů (order_by + order_direction)
        $order_by = isset($filters['order_by']) ? $filters['order_by'] : 'dt_aktualizace';
        $order_direction = isset($filters['order_direction']) ? strtoupper($filters['order_direction']) : 'DESC';
        
        // Validace order_direction
        if (!in_array($order_direction, array('ASC', 'DESC'))) {
            $order_direction = 'DESC';
        }
        
        // Mapování FE pole na DB sloupce + validace
        $valid_order_fields = array(
            'dt_aktualizace' => 'f.dt_aktualizace',
            'cislo_faktury' => 'f.fa_cislo_vema', 
            'fa_typ' => 'f.fa_typ',
            'cislo_objednavky' => 'o.cislo',
            'datum_doruceni' => 'f.fa_datum_doruceni',
            'datum_vystaveni' => 'f.fa_datum_vystaveni',
            'datum_splatnosti' => 'f.fa_datum_splatnosti',
            'castka' => 'f.fa_castka',
            'status' => 'f.fa_zaplacena', // status se počítá podle fa_zaplacena + splatnosti
            'vytvoril_uzivatel' => 'u_vytvoril.prijmeni',
            'fa_predana_zam_jmeno' => 'u_predana.prijmeni'
        );
        
        if (isset($valid_order_fields[$order_by])) {
            $db_field = $valid_order_fields[$order_by];
            $sql .= " ORDER BY $db_field $order_direction, f.id DESC";
            error_log("Invoices25 LIST: Using ORDER BY: $db_field $order_direction");
        } else {
            // Neplatné pole -> default řazení 
            $sql .= " ORDER BY f.dt_aktualizace DESC, f.id DESC";
            error_log("Invoices25 LIST: Invalid order_by '$order_by', using default ORDER BY f.dt_aktualizace DESC");
        }
        
        // Přidat LIMIT pouze pokud FE požaduje stránkování
        if ($use_pagination) {
            $sql .= " LIMIT $per_page OFFSET $offset";
        }

        // 🐛 DEBUG: Sestavit plný SQL dotaz s vloženými parametry (pro test v DB)
        $debug_sql = $sql;
        $debug_params_escaped = array();
        foreach ($params as $param) {
            if (is_null($param)) {
                $debug_params_escaped[] = 'NULL';
            } elseif (is_numeric($param)) {
                $debug_params_escaped[] = $param;
            } else {
                $debug_params_escaped[] = "'" . addslashes($param) . "'";
            }
        }
        // Nahradit ? za skutečné hodnoty (jednoduchá náhrada)
        foreach ($debug_params_escaped as $param_value) {
            $debug_sql = preg_replace('/\?/', $param_value, $debug_sql, 1);
        }
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $faktury = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 🐛 KRITICKÝ DEBUG - surová data z DB
        if (!empty($faktury)) {
            file_put_contents('/tmp/invoice_debug.json', json_encode([
                'first_invoice_raw' => $faktury[0],
                'fields' => array_keys($faktury[0])
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        }

        // Formátování dat pro FE kompatibilitu
        foreach ($faktury as &$faktura) {
            // Konverze typů pro FE (integer místo string kde je to vhodné)
            $faktura['id'] = (int)$faktura['id'];
            $faktura['objednavka_id'] = (int)$faktura['objednavka_id'];
            $faktura['fa_dorucena'] = (int)$faktura['fa_dorucena'];
            $faktura['aktivni'] = (int)$faktura['aktivni'];
            $faktura['vytvoril_uzivatel_id'] = (int)$faktura['vytvoril_uzivatel_id'];
            
            // Počet příloh - konverze na int
            $faktura['pocet_priloh'] = (int)$faktura['pocet_priloh'];
            $faktura['ma_prilohy'] = $faktura['pocet_priloh'] > 0;
            
            // Organizace - konverze na int nebo null
            $faktura['organizace_id'] = !empty($faktura['organizace_id']) ? (int)$faktura['organizace_id'] : null;
            
            // Úsek objednávky - konverze na int nebo null
            $faktura['objednavka_usek_id'] = !empty($faktura['objednavka_usek_id']) ? (int)$faktura['objednavka_usek_id'] : null;
            
            // Vytvoril uzivatel - sestavit celé jméno s tituly
            $vytvoril_jmeno_cele = trim($faktura['vytvoril_prijmeni'] . ' ' . $faktura['vytvoril_jmeno']);
            if (!empty($faktura['vytvoril_titul_pred'])) {
                $vytvoril_jmeno_cele = trim($faktura['vytvoril_titul_pred']) . ' ' . $vytvoril_jmeno_cele;
            }
            if (!empty($faktura['vytvoril_titul_za'])) {
                $vytvoril_jmeno_cele = $vytvoril_jmeno_cele . ', ' . trim($faktura['vytvoril_titul_za']);
            }
            $faktura['vytvoril_uzivatel'] = $vytvoril_jmeno_cele;
            
            // Vytvoril uzivatel - zkrácené jméno (Bezoušková T.)
            $vytvoril_jmeno_zkracene = '';
            if (!empty($faktura['vytvoril_jmeno']) && !empty($faktura['vytvoril_prijmeni'])) {
                $vytvoril_jmeno_zkracene = trim($faktura['vytvoril_prijmeni'] . ' ' . mb_substr($faktura['vytvoril_jmeno'], 0, 1, 'UTF-8') . '.');
            }
            $faktura['vytvoril_uzivatel_zkracene'] = $vytvoril_jmeno_zkracene;
            
            // Vytvoril uzivatel - detail object pro FE (ten kdo fakturu EVIDOVAL v systému)
            $faktura['vytvoril_uzivatel_detail'] = array(
                'id' => (int)$faktura['vytvoril_uzivatel_id'],
                'jmeno' => $faktura['vytvoril_jmeno'],
                'prijmeni' => $faktura['vytvoril_prijmeni'],
                'titul_pred' => $faktura['vytvoril_titul_pred'],
                'titul_za' => $faktura['vytvoril_titul_za'],
                'email' => $faktura['vytvoril_email'],
                'telefon' => $faktura['vytvoril_telefon'],
                'jmeno_cele' => $vytvoril_jmeno_cele
            );
            
            // Objednavka uzivatel - sestavit celé jméno s tituly
            $objednavka_uzivatel_jmeno_cele = '';
            if (!empty($faktura['objednavka_uzivatel_jmeno']) && !empty($faktura['objednavka_uzivatel_prijmeni'])) {
                $objednavka_uzivatel_jmeno_cele = trim($faktura['objednavka_uzivatel_prijmeni'] . ' ' . $faktura['objednavka_uzivatel_jmeno']);
                if (!empty($faktura['objednavka_uzivatel_titul_pred'])) {
                    $objednavka_uzivatel_jmeno_cele = trim($faktura['objednavka_uzivatel_titul_pred']) . ' ' . $objednavka_uzivatel_jmeno_cele;
                }
                if (!empty($faktura['objednavka_uzivatel_titul_za'])) {
                    $objednavka_uzivatel_jmeno_cele = $objednavka_uzivatel_jmeno_cele . ', ' . trim($faktura['objednavka_uzivatel_titul_za']);
                }
            }
            
            // Objednavka uzivatel - detail object pro FE (ten kdo objednávku vytvořil)
            $faktura['objednavka_uzivatel_detail'] = !empty($faktura['objednavka_uzivatel_id']) ? array(
                'id' => (int)$faktura['objednavka_uzivatel_id'],
                'jmeno' => $faktura['objednavka_uzivatel_jmeno'],
                'prijmeni' => $faktura['objednavka_uzivatel_prijmeni'],
                'titul_pred' => $faktura['objednavka_uzivatel_titul_pred'],
                'titul_za' => $faktura['objednavka_uzivatel_titul_za'],
                'email' => $faktura['objednavka_uzivatel_email'],
                'telefon' => $faktura['objednavka_uzivatel_telefon'],
                'jmeno_cele' => $objednavka_uzivatel_jmeno_cele
            ) : null;
            
            // fa_castka ponechat jako string (decimal)
            
            // KRITICKÉ: Parse JSON polí na backendu, aby FE nemusel řešit různé formáty
            // fa_strediska_kod může být: null, "KLADNO", "[\"KLADNO\"]", empty string
            if (!empty($faktura['fa_strediska_kod'])) {
                // Pokusit se naparsovat jako JSON
                $decoded = json_decode($faktura['fa_strediska_kod'], true);
                if (is_array($decoded)) {
                    // Již je JSON array - použít
                    $faktura['fa_strediska_kod'] = $decoded;
                } else {
                    // Plain text string - převést na array
                    $faktura['fa_strediska_kod'] = array($faktura['fa_strediska_kod']);
                }
            } else {
                // Prázdné - prázdný array
                $faktura['fa_strediska_kod'] = array();
            }
            
            // rozsirujici_data - parse JSON nebo null
            if (!empty($faktura['rozsirujici_data'])) {
                $decoded = json_decode($faktura['rozsirujici_data'], true);
                $faktura['rozsirujici_data'] = is_array($decoded) ? $decoded : null;
            } else {
                $faktura['rozsirujici_data'] = null;
            }
            
            // Potvrdil věcnou správnost - zkrácené jméno (Bezoušková T.)
            $potvrdil_vecnou_spravnost_zkracene = '';
            if (!empty($faktura['potvrdil_vecnou_spravnost_jmeno']) && !empty($faktura['potvrdil_vecnou_spravnost_prijmeni'])) {
                $potvrdil_vecnou_spravnost_zkracene = trim($faktura['potvrdil_vecnou_spravnost_prijmeni'] . ' ' . mb_substr($faktura['potvrdil_vecnou_spravnost_jmeno'], 0, 1, 'UTF-8') . '.');
            }
            $faktura['potvrdil_vecnou_spravnost_zkracene'] = $potvrdil_vecnou_spravnost_zkracene;
            
            // Předáno zaměstnanci - sestavit PLNÉ jméno s tituly (NE zkrácené!)
            $predana_jmeno_cele = '';
            if (!empty($faktura['fa_predana_zam_jmeno']) && !empty($faktura['fa_predana_zam_prijmeni'])) {
                $predana_jmeno_cele = trim($faktura['fa_predana_zam_prijmeni'] . ' ' . $faktura['fa_predana_zam_jmeno']);
                if (!empty($faktura['fa_predana_zam_titul_pred'])) {
                    $predana_jmeno_cele = trim($faktura['fa_predana_zam_titul_pred']) . ' ' . $predana_jmeno_cele;
                }
                if (!empty($faktura['fa_predana_zam_titul_za'])) {
                    $predana_jmeno_cele = $predana_jmeno_cele . ', ' . trim($faktura['fa_predana_zam_titul_za']);
                }
            }
            $faktura['fa_predana_zam_jmeno_cele'] = $predana_jmeno_cele;
            
            // 🎯 DODAVATEL - sestavit info o dodavateli (přednost má objednávka před smlouvou)
            // Pokud je faktura přiřazena k objednávce, použij dodavatele z objednávky
            // Pokud je přiřazena ke smlouvě, použij dodavatele ze smlouvy
            $dodavatel_nazev = null;
            $dodavatel_ico = null;
            
            if (!empty($faktura['objednavka_dodavatel_nazev'])) {
                // Dodavatel z objednávky má přednost
                $dodavatel_nazev = $faktura['objednavka_dodavatel_nazev'];
                $dodavatel_ico = $faktura['objednavka_dodavatel_ico'];
            } elseif (!empty($faktura['smlouva_nazev_firmy'])) {
                // Dodavatel ze smlouvy jako fallback
                $dodavatel_nazev = $faktura['smlouva_nazev_firmy'];
                $dodavatel_ico = $faktura['smlouva_ico'];
            }
            
            // Přidat informace o dodavateli do struktury faktury
            $faktura['dodavatel_nazev'] = $dodavatel_nazev;
            $faktura['dodavatel_ico'] = $dodavatel_ico;
            
            // 🎯 STAV OBJEDNÁVKY - pro určení barvy prokliku
            $objednavka_je_dokoncena = false;
            if (!empty($faktura['objednavka_stav_workflow_kod'])) {
                // Stav workflow je uložen jako JSON array, např. ["DOKONCENA"]
                $workflow_states = json_decode($faktura['objednavka_stav_workflow_kod'], true);
                if (is_array($workflow_states) && in_array('DOKONCENA', $workflow_states)) {
                    $objednavka_je_dokoncena = true;
                }
            }
            $faktura['objednavka_je_dokoncena'] = $objednavka_je_dokoncena;
            
            // Odstraníme pomocné sloupce pro dodavatele a stav
            unset($faktura['objednavka_dodavatel_nazev']);
            unset($faktura['objednavka_dodavatel_ico']);
            unset($faktura['smlouva_nazev_firmy']);
            unset($faktura['smlouva_ico']);
            unset($faktura['objednavka_stav_workflow_kod']);
            
            // Spisovka tracking - přidat informaci o původu ze Spisovky
            $faktura['from_spisovka'] = !empty($faktura['spisovka_tracking_id']);
            $faktura['spisovka_dokument_id'] = $faktura['from_spisovka'] ? $faktura['spisovka_dokument_id'] : null;
            
            // Odstraníme pouze pomocné sloupce (detail už je v vytvoril_uzivatel_detail)
            unset($faktura['vytvoril_jmeno']);
            unset($faktura['vytvoril_prijmeni']);
            unset($faktura['vytvoril_titul_pred']);
            unset($faktura['vytvoril_titul_za']);
            unset($faktura['vytvoril_email']);
            unset($faktura['vytvoril_telefon']);
            unset($faktura['objednavka_uzivatel_id']);
            unset($faktura['fa_predana_zam_prijmeni']);
            unset($faktura['fa_predana_zam_titul_pred']);
            unset($faktura['fa_predana_zam_titul_za']);
            unset($faktura['spisovka_tracking_id']);
            unset($faktura['spisovka_priloha_id']);
        }
        
        // KROK 3: Načíst přílohy pro každou fakturu (enriched data)
        // Získat IDs všech faktur pro batch dotaz
        $faktura_ids = array();
        foreach ($faktury as $fakt) {
            $faktura_ids[] = $fakt['id'];
        }
        
        // Načíst všechny přílohy jedním dotazem
        $prilohy_map = array(); // faktura_id => array of attachments
        if (!empty($faktura_ids)) {
            $ids_placeholder = implode(',', array_fill(0, count($faktura_ids), '?'));
            $prilohy_sql = "SELECT 
                p.id,
                p.faktura_id,
                p.typ_prilohy,
                p.originalni_nazev_souboru,
                p.systemova_cesta,
                p.velikost_souboru_b,
                p.je_isdoc,
                p.nahrano_uzivatel_id,
                p.dt_vytvoreni,
                p.dt_aktualizace,
                u.jmeno AS nahrano_jmeno,
                u.prijmeni AS nahrano_prijmeni,
                u.titul_pred AS nahrano_titul_pred,
                u.titul_za AS nahrano_titul_za,
                u.email AS nahrano_email,
                u.telefon AS nahrano_telefon
            FROM `" . TBL_FAKTURY_PRILOHY . "` p
            LEFT JOIN `25_uzivatele` u ON p.nahrano_uzivatel_id = u.id
            WHERE p.faktura_id IN ($ids_placeholder)
            ORDER BY p.dt_vytvoreni DESC";
            
            $prilohy_stmt = $db->prepare($prilohy_sql);
            $prilohy_stmt->execute($faktura_ids);
            $all_prilohy = $prilohy_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Seskupit přílohy podle faktura_id
            foreach ($all_prilohy as $priloha) {
                $fid = (int)$priloha['faktura_id'];
                if (!isset($prilohy_map[$fid])) {
                    $prilohy_map[$fid] = array();
                }
                
                // Sestavit celé jméno uživatele
                $priloha_uzivatel_jmeno = '';
                if (!empty($priloha['nahrano_prijmeni']) && !empty($priloha['nahrano_jmeno'])) {
                    $priloha_uzivatel_jmeno = trim($priloha['nahrano_prijmeni'] . ' ' . $priloha['nahrano_jmeno']);
                    if (!empty($priloha['nahrano_titul_pred'])) {
                        $priloha_uzivatel_jmeno = trim($priloha['nahrano_titul_pred']) . ' ' . $priloha_uzivatel_jmeno;
                    }
                    if (!empty($priloha['nahrano_titul_za'])) {
                        $priloha_uzivatel_jmeno = $priloha_uzivatel_jmeno . ', ' . trim($priloha['nahrano_titul_za']);
                    }
                }
                
                // Vypočítat velikost v KB a MB
                $velikost_b = (int)$priloha['velikost_souboru_b'];
                $velikost_kb = round($velikost_b / 1024, 0);
                $velikost_mb = round($velikost_b / (1024 * 1024), 2);
                
                // Formátovat přílohu pro FE
                $prilohy_map[$fid][] = array(
                    'id' => (int)$priloha['id'],
                    'faktura_id' => (int)$priloha['faktura_id'],
                    'typ_prilohy' => $priloha['typ_prilohy'],
                    'original_filename' => $priloha['originalni_nazev_souboru'],
                    'systemova_cesta' => $priloha['systemova_cesta'],
                    'velikost_b' => $velikost_b,
                    'velikost_kb' => $velikost_kb,
                    'velikost_mb' => $velikost_mb,
                    'je_isdoc' => (int)$priloha['je_isdoc'],
                    'nahrano_uzivatel_id' => !empty($priloha['nahrano_jmeno']) ? (int)$priloha['nahrano_uzivatel_id'] : null,
                    'nahrano_uzivatel' => $priloha_uzivatel_jmeno,
                    'nahrano_uzivatel_detail' => !empty($priloha['nahrano_jmeno']) ? array(
                        'jmeno' => $priloha['nahrano_jmeno'],
                        'prijmeni' => $priloha['nahrano_prijmeni'],
                        'titul_pred' => $priloha['nahrano_titul_pred'],
                        'titul_za' => $priloha['nahrano_titul_za'],
                        'email' => $priloha['nahrano_email'],
                        'telefon' => $priloha['nahrano_telefon'],
                        'jmeno_cele' => $priloha_uzivatel_jmeno
                    ) : null,
                    'dt_vytvoreni' => $priloha['dt_vytvoreni'],
                    'dt_aktualizace' => $priloha['dt_aktualizace']
                );
            }
        }
        
        // Přidat přílohy k fakturám
        foreach ($faktury as &$faktura) {
            $fid = $faktura['id'];
            $faktura['prilohy'] = isset($prilohy_map[$fid]) ? $prilohy_map[$fid] : array();
        }

        // Vypočítat pagination metadata
        $total_pages = $use_pagination ? (int)ceil($total_count / $per_page) : 1;
        
        // Response - OrderV2 formát s pagination + statistiky + user metadata
        // FE očekává: { status: "ok", faktury: [...], pagination: {...}, statistiky: {...}, user_info: {...} }
        
        // 🐛 KRITICKÝ DEBUG - zpracovaná data před odesláním
        if (!empty($faktury)) {
            file_put_contents('/tmp/invoice_debug_processed.json', json_encode([
                'first_invoice_processed' => $faktury[0],
                'has_dodavatel_nazev' => isset($faktury[0]['dodavatel_nazev']),
                'dodavatel_nazev_value' => $faktury[0]['dodavatel_nazev'] ?? 'NOT_SET',
                'has_dodavatel_ico' => isset($faktury[0]['dodavatel_ico']),
                'dodavatel_ico_value' => $faktury[0]['dodavatel_ico'] ?? 'NOT_SET',
                'has_objednavka_je_dokoncena' => isset($faktury[0]['objednavka_je_dokoncena']),
                'objednavka_je_dokoncena_value' => $faktury[0]['objednavka_je_dokoncena'] ?? 'NOT_SET'
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        }
        
        $response_data = array(
            'status' => 'ok',
            'faktury' => $faktury,
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total_count,
                'total_pages' => $total_pages
            ),
            'statistiky' => $statistiky,
            'user_info' => array(
                'user_id' => $user_id,
                'is_admin' => $is_admin,
                'roles' => $user_roles,
                'usek_id' => $user_usek_id,
                'usek_zkr' => $user_usek_zkr,
                'filter_applied' => !$is_admin
            )
        );
        
        // 🛡️ SANITIZACE UTF-8 - předejdeme JSON encoding chybám
        array_walk_recursive($response_data, function(&$value) {
            if (is_string($value)) {
                // Odstranit nevalidní UTF-8 znaky
                $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
            }
        });
        
        http_response_code(200);
        // ⚠️ Kompletní ošetření českých znaků pro JSON
        $json_output = json_encode($response_data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($json_output === false) {
            // Fallback: pokud JSON encoding selže, vrátit minimální response
            $minimal_response = array(
                'status' => 'error',
                'message' => 'Chyba při kódování dat: ' . json_last_error_msg(),
                'faktury' => array(),
                'pagination' => $response_data['pagination']
            );
            $json_output = json_encode($minimal_response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        }
        echo $json_output;

    } catch (Exception $e) {
        http_response_code(500);
        $error_message = mb_convert_encoding($e->getMessage(), 'UTF-8', 'UTF-8');
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání faktur: ' . $error_message), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }
}


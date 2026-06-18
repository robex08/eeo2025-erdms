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
require_once 'searchHelpers.php';

/**
 * 💰 Normalizace peněžní částky pro DB (fa_castka) - legacy invoices25
 *
 * Pozn.: Tento soubor je deprecated, ale endpointy mohou být ještě volané.
 * Cíl: zabránit SQL warning 1265 "Data truncated for column fa_castka".
 *
 * Výstup: string "12345.67" nebo null (a nastaví $error)
 */
if (!function_exists('invoices25_normalize_money_to_decimal_string')) {
    function invoices25_normalize_money_to_decimal_string($raw, &$error) {
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
}

if (!function_exists('invoices25_sync_order_invoice_tracking_metadata')) {
    /**
     * Udržuje fakturant metadata objednávky v souladu s aktivními fakturami.
     * - pokud objednávka nemá aktivní faktury: vynuluje fakturant_id + dt_faktura_pridana
     * - pokud má aktivní faktury, ale chybí metadata: inicializuje je aktuálním uživatelem
     */
    function invoices25_sync_order_invoice_tracking_metadata($db, $order_id, $current_user_id) {
        $order_id = (int)$order_id;
        $current_user_id = (int)$current_user_id;

        if ($order_id <= 0) {
            return;
        }

        $orders_table = get_orders_table_name();
        $faktury_table = get_invoices_table_name();

        $sql_count = "SELECT COUNT(*) AS cnt FROM `{$faktury_table}` WHERE objednavka_id = ? AND aktivni = 1";
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
            error_log("🔄 [INVOICES25 TRACKING] Order #{$order_id}: reset fakturant_id/dt_faktura_pridana (0 aktivních faktur)");
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
            error_log("🔄 [INVOICES25 TRACKING] Order #{$order_id}: inicializace fakturant_id/dt_faktura_pridana (chybějící metadata)");
        }
    }
}

/**
 * POST - Načte faktury pro konkrétní objednávku
 * Endpoint: invoices25/by-order
 * POST: {token, username, objednavka_id}
 * 
 * @deprecated Používej order-v2 API pro získání faktur přes order detail
 */
function handle_invoices25_by_order($input, $config, $queries) {
    debug_log("START invoices25/by-order", ['objednavka_id' => $input['objednavka_id'] ?? null]);
    
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $objednavka_id = isset($input['objednavka_id']) ? (int)$input['objednavka_id'] : 0;
    
    if (!$token || !$request_username || $objednavka_id <= 0) {
        debug_log("ERROR: Missing parameters", ['token' => !!$token, 'username' => !!$request_username, 'objednavka_id' => $objednavka_id]);
        http_response_code(400);
        echo json_encode([
            'err' => 'Chybí povinné parametry'
        ]);
        return;
    }

    // Ověř token
    $token_data = verify_token($token);
    if (!$token_data) {
        debug_log("ERROR: Invalid token");
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    debug_log("Token verified", ['username' => $token_data['username']]);
    
    // Kontrola uživatele
    if ($token_data['username'] !== $request_username) {
        debug_log("ERROR: Username mismatch");
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

        // =====================================================================
        // 💰 NAČÍST LP ČERPÁNÍ PRO VŠECHNY FAKTURY NAJEDNOU
        // =====================================================================
        if (!empty($faktury)) {
            $faktura_ids = array_map(function($f) { return (int)$f['id']; }, $faktury);
            $lp_cerpani_map = array();
            $lp_ids_placeholder = implode(',', array_fill(0, count($faktura_ids), '?'));
            
            $lp_sql = "SELECT 
                id, faktura_id, lp_cislo, lp_id, castka, poznamka,
                datum_pridani, pridal_user_id, datum_upravy, upravil_user_id
            FROM `" . TBL_FAKTURY_LP_CERPANI . "` 
            WHERE faktura_id IN ($lp_ids_placeholder)
            ORDER BY faktura_id, id";
            
            $lp_stmt = $db->prepare($lp_sql);
            $lp_stmt->execute($faktura_ids);
            $all_lp_cerpani = $lp_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Seskupit LP čerpání podle faktura_id
            foreach ($all_lp_cerpani as $lp) {
                $fid = (int)$lp['faktura_id'];
                if (!isset($lp_cerpani_map[$fid])) {
                    $lp_cerpani_map[$fid] = array();
                }
                
                $lp_cerpani_map[$fid][] = array(
                    'id' => (int)$lp['id'],
                    'faktura_id' => (int)$lp['faktura_id'],
                    'lp_cislo' => $lp['lp_cislo'],
                    'lp_id' => !empty($lp['lp_id']) ? (int)$lp['lp_id'] : null,
                    'castka' => $lp['castka'],
                    'poznamka' => $lp['poznamka'],
                    'datum_pridani' => $lp['datum_pridani'],
                    'pridal_user_id' => !empty($lp['pridal_user_id']) ? (int)$lp['pridal_user_id'] : null,
                    'datum_upravy' => $lp['datum_upravy'],
                    'upravil_user_id' => !empty($lp['upravil_user_id']) ? (int)$lp['upravil_user_id'] : null
                );
            }
            
            // Přidat LP čerpání k fakturám
            foreach ($faktury as &$faktura) {
                $fid = (int)$faktura['id'];
                $faktura['lp_cerpani'] = isset($lp_cerpani_map[$fid]) ? $lp_cerpani_map[$fid] : array();
                $faktura['substitution_info'] = array();

                $sub_info = resolveInvoiceMaterialCheckSubstitutionInfo($db, $faktura);
                if ($sub_info) {
                    $faktura['substitution_info']['potvrdil_vecnou_spravnost'] = $sub_info;
                }
            }
            unset($faktura);
        }

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
    // ⚠️ Pozor: empty('0') === true, takže pro částky nepoužívat empty() ani !$fa_castka
    $fa_castka_str = ($fa_castka === null) ? '' : (is_string($fa_castka) ? trim($fa_castka) : trim(strval($fa_castka)));
    if ($fa_castka_str === '' || empty($fa_cislo_vema)) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí povinná pole: fa_castka, fa_cislo_vema']);
        return;
    }

    // ✅ Normalizace částky - zabrání SQL warning 1265 "Data truncated"
    $moneyError = null;
    $normalizedAmount = invoices25_normalize_money_to_decimal_string($fa_castka, $moneyError);
    if ($normalizedAmount === null) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatná částka faktury (fa_castka): ' . $moneyError]);
        return;
    }
    $fa_castka = $normalizedAmount;

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
            fa_vema_kod,
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
            vecna_spravnost_duvod,
            vecna_spravnost_potvrzeno,
            rozsirujici_data,
            stav,
            vytvoril_uzivatel_id,
            aktualizoval_uzivatel_id,
            dt_vytvoreni,
            dt_aktualizace,
            aktivni
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1
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
        $vecna_spravnost_duvod = isset($input['vecna_spravnost_duvod']) ? $input['vecna_spravnost_duvod'] : null;
        $vecna_spravnost_potvrzeno = isset($input['vecna_spravnost_potvrzeno']) ? (int)$input['vecna_spravnost_potvrzeno'] : 0;
        
        $fa_vema_kod = isset($input['fa_vema_kod']) ? trim($input['fa_vema_kod']) : null;
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
            $fa_vema_kod,
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
            $vecna_spravnost_duvod,
            $vecna_spravnost_potvrzeno,
            $rozsirujici_data,
            $stav,
            $token_data['id'],
            $token_data['id']
        ]);

        $new_id = $db->lastInsertId();

        // AUDIT LOG: CREATE faktury včetně počátečních hodnot (fail-safe)
        try {
            if (function_exists('audit_log_create_with_data')) {
                $created_faktura_stmt = $db->prepare("SELECT * FROM `{$faktury_table}` WHERE id = ? LIMIT 1");
                $created_faktura_stmt->execute([(int)$new_id]);
                $created_faktura = $created_faktura_stmt->fetch(PDO::FETCH_ASSOC) ?: [];

                audit_log_create_with_data(
                    $db,
                    $token_data,
                    'FAKTURA',
                    (int)$new_id,
                    'invoices25/create',
                    (array)$created_faktura,
                    'Vytvoření nové faktury'
                );
            }
        } catch (Exception $ae) {
            error_log('[AUDIT] invoice create audit error: ' . $ae->getMessage());
        }

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
        $check_stmt = $db->prepare("
            SELECT id, stav, objednavka_id, vecna_spravnost_potvrzeno,
                   fa_castka, fa_datum_vystaveni, fa_datum_splatnosti, fa_datum_doruceni,
                   fa_cislo_vema, fa_typ, fa_strediska_kod, fa_predana_zam_id
            FROM `$faktury_table` 
            WHERE id = ? AND aktivni = 1
        ");
        $check_stmt->execute([$faktura_id]);
        $oldInvoiceData = $check_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$oldInvoiceData) {
            http_response_code(404);
            echo json_encode(['err' => 'Faktura nenalezena']);
            return;
        }

        // ✨ LOGOVÁNÍ ZASTUPOVÁNÍ: Detekce a zaznamenání akcí v zastoupení
        $substitutionTargetUserId = null;
        if (!empty($oldInvoiceData['fa_predana_zam_id']) && (int)$oldInvoiceData['fa_predana_zam_id'] > 0) {
            $substitutionTargetUserId = (int)$oldInvoiceData['fa_predana_zam_id'];
        }
        check_and_log_substitution_action(
            $db,
            $token_data,
            'UPDATE',
            'FAKTURA',
            $faktura_id,
            'Úprava faktury (potvrz. věcné správnosti)',
            $substitutionTargetUserId
        );

        // ⚠️ DETEKCE ZMĚN pro automatické zrušení věcné správnosti
        $resetVecnaSpravnost = false;
        $wasVecnaConfirmed = (int)$oldInvoiceData['vecna_spravnost_potvrzeno'] !== 0; // 1 = potvrzena, 2 = zamitnuta
        
        // ⚠️ NEZRUŠOVAT pokud uživatel MĚNÍ hodnotu vecna_spravnost_potvrzeno (tj. explicitně toggleuje věcnou správnost)
        $isExplicitVecnaUpdate = false;
        if (isset($input['vecna_spravnost_potvrzeno'])) {
            $newVecnaStatus = (int)$input['vecna_spravnost_potvrzeno'];
            $oldVecnaStatus = (int)$oldInvoiceData['vecna_spravnost_potvrzeno'];
            // Je to explicitní update POUZE pokud se hodnota ZMĚNILA
            if ($newVecnaStatus !== $oldVecnaStatus) {
                $isExplicitVecnaUpdate = true;
                error_log("🔍 INVOICE UPDATE: Explicitní změna vecna_spravnost_potvrzeno ($oldVecnaStatus → $newVecnaStatus) - NEPROVÁDÍM zrušení");
            }
        }
        
        if ($wasVecnaConfirmed && !$isExplicitVecnaUpdate) {
            // 🆕 Načíst app settings pro invoice_accountant_edit
            $appSettings = array();
            try {
                $settingsStmt = $db->prepare("SELECT klic, hodnota FROM " . TBL_NASTAVENI_GLOBALNI . " WHERE klic LIKE 'invoice_accountant_edit_%'");
                $settingsStmt->execute();
                while ($settingRow = $settingsStmt->fetch(PDO::FETCH_ASSOC)) {
                    $appSettings[$settingRow['klic']] = $settingRow['hodnota'] === '1';
                }
                error_log("📋 APP SETTINGS loaded: " . json_encode($appSettings));
            } catch (Exception $e) {
                error_log("⚠️ Chyba při načítání app settings: " . $e->getMessage());
            }
            
            // Zkontroluj zda se změnilo něco důležitého
            $criticalFieldsChanged = false;
            
            // ⚠️ ČÁSTKA FAKTURY - VŽDY resetuje (není v app settings)
            if (isset($input['fa_castka'])) {
                $rawAmount = $input['fa_castka'];
                $moneyError = null;
                $normalizedAmount = invoices25_normalize_money_to_decimal_string($rawAmount, $moneyError);
                if ($normalizedAmount !== null) {
                    $oldAmount = $oldInvoiceData['fa_castka'] ?? '0';
                    // Porovnat jako desetinná čísla (tolerance 0.01)
                    if (abs((float)$normalizedAmount - (float)$oldAmount) > 0.01) {
                        $criticalFieldsChanged = true;
                        error_log("⚠️ INVOICE UPDATE: fa_castka changed ($oldAmount → $normalizedAmount) - VŽDY zruší věcnou (není v settings)");
                    }
                }
            }
            
            // Datum vystavení - kontrola app settings
            if (isset($input['fa_datum_vystaveni'])) {
                $oldDate = $oldInvoiceData['fa_datum_vystaveni'] ?? '';
                $newDate = ($input['fa_datum_vystaveni'] === '' || $input['fa_datum_vystaveni'] === null) ? '' : $input['fa_datum_vystaveni'];
                if ($oldDate != $newDate) {
                    // Zkontroluj zda je povoleno v settings
                    if (empty($appSettings['invoice_accountant_edit_datum_vystaveni'])) {
                        $criticalFieldsChanged = true;
                        error_log("⚠️ INVOICE UPDATE: fa_datum_vystaveni changed ($oldDate → $newDate) - zrušení (NENÍ v settings)");
                    } else {
                        error_log("✅ INVOICE UPDATE: fa_datum_vystaveni changed ale JE povoleno v settings - NEZRUŠÍ");
                    }
                }
            }
            
            // Datum splatnosti - kontrola app settings
            if (isset($input['fa_datum_splatnosti'])) {
                $oldDate = $oldInvoiceData['fa_datum_splatnosti'] ?? '';
                $newDate = ($input['fa_datum_splatnosti'] === '' || $input['fa_datum_splatnosti'] === null) ? '' : $input['fa_datum_splatnosti'];
                if ($oldDate != $newDate) {
                    if (empty($appSettings['invoice_accountant_edit_datum_splatnosti'])) {
                        $criticalFieldsChanged = true;
                        error_log("⚠️ INVOICE UPDATE: fa_datum_splatnosti changed ($oldDate → $newDate) - zrušení (NENÍ v settings)");
                    } else {
                        error_log("✅ INVOICE UPDATE: fa_datum_splatnosti changed ale JE povoleno v settings - NEZRUŠÍ");
                    }
                }
            }
            
            // Datum doručení - kontrola app settings
            if (isset($input['fa_datum_doruceni'])) {
                $oldDate = $oldInvoiceData['fa_datum_doruceni'] ?? '';
                $newDate = ($input['fa_datum_doruceni'] === '' || $input['fa_datum_doruceni'] === null) ? '' : $input['fa_datum_doruceni'];
                if ($oldDate != $newDate) {
                    if (empty($appSettings['invoice_accountant_edit_datum_doruceni'])) {
                        $criticalFieldsChanged = true;
                        error_log("⚠️ INVOICE UPDATE: fa_datum_doruceni changed ($oldDate → $newDate) - zrušení (NENÍ v settings)");
                    } else {
                        error_log("✅ INVOICE UPDATE: fa_datum_doruceni changed ale JE povoleno v settings - NEZRUŠÍ");
                    }
                }
            }
            
            // Číslo VEMA (variabilní symbol) - kontrola app settings
            if (isset($input['fa_cislo_vema'])) {
                $oldCislo = $oldInvoiceData['fa_cislo_vema'] ?? '';
                $newCislo = $input['fa_cislo_vema'] ?? '';
                if ($oldCislo != $newCislo) {
                    if (empty($appSettings['invoice_accountant_edit_variabilni_symbol'])) {
                        $criticalFieldsChanged = true;
                        error_log("⚠️ INVOICE UPDATE: fa_cislo_vema changed ($oldCislo → $newCislo) - zrušení (NENÍ v settings)");
                    } else {
                        error_log("✅ INVOICE UPDATE: fa_cislo_vema changed ale JE povoleno v settings - NEZRUŠÍ");
                    }
                }
            }
            
            // Typ faktury - kontrola app settings
            if (isset($input['fa_typ'])) {
                $oldTyp = $oldInvoiceData['fa_typ'] ?? '';
                $newTyp = $input['fa_typ'] ?? '';
                if ($oldTyp != $newTyp) {
                    if (empty($appSettings['invoice_accountant_edit_typ_faktury'])) {
                        $criticalFieldsChanged = true;
                        error_log("⚠️ INVOICE UPDATE: fa_typ changed ($oldTyp → $newTyp) - zrušení (NENÍ v settings)");
                    } else {
                        error_log("✅ INVOICE UPDATE: fa_typ changed ale JE povoleno v settings - NEZRUŠÍ");
                    }
                }
            }
            
            // Střediska - kontrola app settings
            if (isset($input['fa_strediska_kod'])) {
                $oldStrediska = json_decode($oldInvoiceData['fa_strediska_kod'] ?? '[]', true);
                if (!is_array($oldStrediska)) $oldStrediska = array();
                
                $newStrediska = array();
                if (is_array($input['fa_strediska_kod'])) {
                    $newStrediska = $input['fa_strediska_kod'];
                } else if (is_string($input['fa_strediska_kod'])) {
                    $decoded = json_decode($input['fa_strediska_kod'], true);
                    if (is_array($decoded)) $newStrediska = $decoded;
                }
                
                sort($oldStrediska);
                sort($newStrediska);
                if (json_encode($oldStrediska) !== json_encode($newStrediska)) {
                    if (empty($appSettings['invoice_accountant_edit_strediska'])) {
                        $criticalFieldsChanged = true;
                        error_log("⚠️ INVOICE UPDATE: fa_strediska_kod changed - zrušení (NENÍ v settings)");
                    } else {
                        error_log("✅ INVOICE UPDATE: fa_strediska_kod changed ale JE povoleno v settings - NEZRUŠÍ");
                    }
                }
            }
            
            if ($criticalFieldsChanged) {
                $resetVecnaSpravnost = true;
                error_log("🔄 INVOICE UPDATE: Zrušení věcné správnosti faktury #$faktura_id (důvod: změna kritických polí)");
            }
        }
        
        // ⚠️ DŮLEŽITÉ: Pokud dojde ke zrušení věcné správnosti, odstranit tyto pole z $input
        // aby se nepřepsaly hodnotami z frontendu (duplikace v SQL query)
        if ($resetVecnaSpravnost) {
            unset($input['vecna_spravnost_potvrzeno']);
            unset($input['potvrdil_vecnou_spravnost_id']);
            unset($input['dt_potvrzeni_vecne_spravnosti']);
            unset($input['vecna_spravnost_duvod']);
            error_log("🔒 INVOICE UPDATE: Odstraněna pole věcné správnosti z \$input před sestavením UPDATE (zrušení aktivní)");
        }

        // 🔒 OCHRANA: Pokud věcná správnost už má finální stav (1/2) a status se nemění,
        // nesmí dojít k přepsání potvrdil_vecnou_spravnost_id ani dt potvrzení při běžné editaci faktury.
        $oldVecnaStatus = (int)($oldInvoiceData['vecna_spravnost_potvrzeno'] ?? 0);
        $incomingVecnaStatus = isset($input['vecna_spravnost_potvrzeno']) ? (int)$input['vecna_spravnost_potvrzeno'] : null;
        $isSameVecnaStatusResend = ($incomingVecnaStatus !== null && $incomingVecnaStatus === $oldVecnaStatus);
        if (!$resetVecnaSpravnost && $oldVecnaStatus !== 0 && ($incomingVecnaStatus === null || $isSameVecnaStatusResend)) {
            unset($input['potvrdil_vecnou_spravnost_id']);
            unset($input['dt_potvrzeni_vecne_spravnosti']);

            if ($isSameVecnaStatusResend) {
                unset($input['vecna_spravnost_potvrzeno']);
            }

            error_log("🔒 INVOICE UPDATE: Zachovávám původního potvrzujícího uživatele VS (faktura #$faktura_id, status=$oldVecnaStatus)");
        }

        // Sestavení UPDATE dotazu - jen pole která přišla
        $fields = [];
        $values = [];

        $old_order_id = !empty($oldInvoiceData['objednavka_id']) ? (int)$oldInvoiceData['objednavka_id'] : 0;
        $new_order_id = $old_order_id;

        if (isset($input['objednavka_id'])) {
            $fields[] = 'objednavka_id = ?';
            $new_order_id = !empty($input['objednavka_id']) ? (int)$input['objednavka_id'] : 0;
            $values[] = $new_order_id > 0 ? $new_order_id : null;
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
            $rawAmount = $input['fa_castka'];
            $rawAmountStr = is_string($rawAmount) ? trim($rawAmount) : trim(strval($rawAmount));
            if ($rawAmountStr === '') {
                http_response_code(400);
                echo json_encode(['err' => 'Neplatná částka faktury (fa_castka): prázdná hodnota']);
                return;
            }

            $moneyError = null;
            $normalizedAmount = invoices25_normalize_money_to_decimal_string($rawAmount, $moneyError);
            if ($normalizedAmount === null) {
                http_response_code(400);
                echo json_encode(['err' => 'Neplatná částka faktury (fa_castka): ' . $moneyError]);
                return;
            }

            $fields[] = 'fa_castka = ?';
            $values[] = $normalizedAmount;
        }
        if (isset($input['fa_cislo_vema'])) {
            $fields[] = 'fa_cislo_vema = ?';
            $values[] = $input['fa_cislo_vema'];
        }
        if (isset($input['fa_vema_kod'])) {
            $fields[] = 'fa_vema_kod = ?';
            $values[] = trim($input['fa_vema_kod']);
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
        if (isset($input['vecna_spravnost_duvod'])) {
            $fields[] = 'vecna_spravnost_duvod = ?';
            $values[] = $input['vecna_spravnost_duvod'];
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
        
        // ✅ AUTOMATIKA: Potvrzení nebo zamítnutí věcné správnosti → změnit stav POUZE pokud je aktuálně ZAEVIDOVANA
        if (isset($input['vecna_spravnost_potvrzeno']) && (int)$input['vecna_spravnost_potvrzeno'] !== 0) {
            // Načíst aktuální stav faktury
            $current_check = $db->prepare("SELECT stav FROM `$faktury_table` WHERE id = ?");
            $current_check->execute([$faktura_id]);
            $current_row = $current_check->fetch(PDO::FETCH_ASSOC);
            
            if ($current_row && $current_row['stav'] === INVOICE_STATUS_REGISTERED) {
                // Je ve stavu ZAEVIDOVANA → automaticky přepnout na VECNA_SPRAVNOST nebo V_RESENI
                $newStatus = ((int)$input['vecna_spravnost_potvrzeno'] === 1) ? INVOICE_STATUS_VERIFICATION : INVOICE_STATUS_IN_PROGRESS;
                $fields[] = 'stav = ?';
                $values[] = $newStatus;
                $statusName = ((int)$input['vecna_spravnost_potvrzeno'] === 1) ? 'VECNA_SPRAVNOST' : 'V_RESENI';
                error_log("🔄 Auto změna stavu: ZAEVIDOVANA → $statusName (věcná správnost změněna)");
            }
        }
        
        // ⚠️ AUTOMATIKA: Zrušení věcné správnosti při změně kritických polí
        if ($resetVecnaSpravnost) {
            // Přepsat všechna pole vezna_spravnost_* na výchozí hodnoty
            // ⚠️ NEMAZAT umisteni_majetku a poznamka - ty zůstávají zachované
            $fields[] = 'vecna_spravnost_potvrzeno = ?';
            $values[] = 0;
            
            $fields[] = 'potvrdil_vecnou_spravnost_id = ?';
            $values[] = null;
            
            $fields[] = 'dt_potvrzeni_vecne_spravnosti = ?';
            $values[] = null;
            
            $fields[] = 'vecna_spravnost_duvod = ?';
            $values[] = null;
            
            // ⚠️ KRITICKÉ: Pokud byla faktura zamítnuta (vecna=2) → měla stav V_RESENI
            // Při zrušení vrátit stav na ZAEVIDOVANA
            if ((int)$oldInvoiceData['vecna_spravnost_potvrzeno'] === 2) {
                $fields[] = 'stav = ?';
                $values[] = INVOICE_STATUS_REGISTERED;
                error_log("🔄 INVOICE UPDATE: Zrušení věcné správnosti zamítnuté faktury → stav V_RESENI → ZAEVIDOVANA");
            }
            
            error_log("✅ INVOICE UPDATE: Zrušena věcná správnost faktury #$faktura_id (potvrzeno={$oldInvoiceData['vecna_spravnost_potvrzeno']} → 0, duvod → NULL)");
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

        if (isset($input['objednavka_id'])) {
            $sync_order_ids = array();
            if ($old_order_id > 0) {
                $sync_order_ids[$old_order_id] = true;
            }
            if ($new_order_id > 0) {
                $sync_order_ids[$new_order_id] = true;
            }

            foreach (array_keys($sync_order_ids) as $sync_order_id) {
                try {
                    invoices25_sync_order_invoice_tracking_metadata($db, (int)$sync_order_id, (int)$token_data['id']);
                } catch (Exception $tracking_error) {
                    error_log("⚠️ [INVOICES25 TRACKING] Sync chyba u objednávky #{$sync_order_id}: " . $tracking_error->getMessage());
                }
            }
        }

        // === AUDIT LOG: field-level diff faktury (fail-safe) ===
        try {
            if (function_exists('audit_log_field_changes')) {
                $audit_new_stmt = $db->prepare("SELECT * FROM `$faktury_table` WHERE id = ? LIMIT 1");
                $audit_new_stmt->execute(array($faktura_id));
                $audit_new_invoice = $audit_new_stmt->fetch(PDO::FETCH_ASSOC) ?: array();

                $audit_batch = audit_log_field_changes(
                    $db,
                    $token_data,
                    'FAKTURA',
                    $faktura_id,
                    'invoices25/update',
                    (array)$oldInvoiceData,
                    (array)$audit_new_invoice
                );

                // Pokud se explicitně změnila věcná správnost, zalogovat i jako akci APPROVE/REJECT
                $audit_incomingVecna = isset($input['vecna_spravnost_potvrzeno']) ? (int)$input['vecna_spravnost_potvrzeno'] : null;
                $audit_oldVecna = (int)($oldInvoiceData['vecna_spravnost_potvrzeno'] ?? 0);
                if ($audit_incomingVecna !== null && $audit_incomingVecna !== $audit_oldVecna && function_exists('audit_log_action')) {
                    if ($audit_incomingVecna === 1) {
                        audit_log_action($db, $token_data, 'FAKTURA', $faktura_id, 'APPROVE', 'invoices25/update', 'Potvrzení věcné správnosti', $audit_batch);
                    } elseif ($audit_incomingVecna === 2) {
                        audit_log_action($db, $token_data, 'FAKTURA', $faktura_id, 'REJECT', 'invoices25/update', 'Zamítnutí věcné správnosti', $audit_batch);
                    } elseif ($audit_incomingVecna === 0) {
                        audit_log_action($db, $token_data, 'FAKTURA', $faktura_id, 'RESET', 'invoices25/update', 'Reset věcné správnosti', $audit_batch);
                    }
                } elseif ($resetVecnaSpravnost && function_exists('audit_log_action')) {
                    audit_log_action($db, $token_data, 'FAKTURA', $faktura_id, 'RESET', 'invoices25/update', 'Automatický reset věcné správnosti (změna kritického pole)', $audit_batch);
                }

                // Klíčové stavové přechody faktury - explicitní akce
                $old_status = strtoupper(trim((string)($oldInvoiceData['stav'] ?? '')));
                $new_status = strtoupper(trim((string)($audit_new_invoice['stav'] ?? '')));
                if ($new_status !== '' && $new_status !== $old_status && function_exists('audit_log_action')) {
                    $status_action = 'RESET';
                    if (in_array($new_status, array('VECNA_SPRAVNOST', 'ZAEVIDOVANA'), true)) {
                        $status_action = 'APPROVE';
                    } elseif (in_array($new_status, array('VRACENA', 'K_DOPLNENI', 'V_RESENI'), true)) {
                        $status_action = 'REJECT';
                    }

                    audit_log_action(
                        $db,
                        $token_data,
                        'FAKTURA',
                        $faktura_id,
                        $status_action,
                        'invoices25/update',
                        'Změna stavu faktury: ' . $old_status . ' -> ' . $new_status,
                        $audit_batch
                    );
                }

                // Předání PO (fa_predana_zam_id / fa_datum_predani_zam) - explicitní audit
                $old_predana_id = (string)($oldInvoiceData['fa_predana_zam_id'] ?? '');
                $new_predana_id = (string)($audit_new_invoice['fa_predana_zam_id'] ?? '');
                $old_predana_dt = (string)($oldInvoiceData['fa_datum_predani_zam'] ?? '');
                $new_predana_dt = (string)($audit_new_invoice['fa_datum_predani_zam'] ?? '');
                if (($old_predana_id !== $new_predana_id || $old_predana_dt !== $new_predana_dt) && function_exists('audit_log_action')) {
                    audit_log_action(
                        $db,
                        $token_data,
                        'FAKTURA',
                        $faktura_id,
                        'RESET',
                        'invoices25/update',
                        'Změna předání PO: ID ' . $old_predana_id . ' -> ' . $new_predana_id . ', datum ' . $old_predana_dt . ' -> ' . $new_predana_dt,
                        $audit_batch
                    );
                }
            }
        } catch (Exception $ae) {
            error_log('[AUDIT] invoices25_update audit error: ' . $ae->getMessage());
        }

        // ==========================================
        // 🔄 LP PŘEPOČET po změně věcné správnosti
        // Faktura s LP rozpisem / odborovým přiřazením musí přepočítat
        // čerpání → mezi "v procesu" (predpoklad) a "skutečně"
        // ==========================================
        $vecnaChanged = isset($input['vecna_spravnost_potvrzeno']) &&
                        (int)$input['vecna_spravnost_potvrzeno'] !== (int)($oldInvoiceData['vecna_spravnost_potvrzeno'] ?? 0);
        $potvrdilChanged = isset($input['potvrdil_vecnou_spravnost_id']);

        if ($vecnaChanged || $potvrdilChanged) {
            try {
                require_once __DIR__ . '/limitovanePrislibyCerpaniHandlers_v2_pdo.php';
                $lp_ids_to_recalc = [];

                // 1) Odborové přiřazení (25a_odbory_lp_prirazeni)
                $stmt_olp = $db->prepare("SELECT lp_id FROM `" . TBL_ODBORY_LP_PRIRAZENI . "` WHERE faktura_id = ?");
                $stmt_olp->execute([$faktura_id]);
                foreach ($stmt_olp->fetchAll(PDO::FETCH_COLUMN) as $olp_lp_id) {
                    if ((int)$olp_lp_id > 0) $lp_ids_to_recalc[(int)$olp_lp_id] = true;
                }

                // 2) LP rozpis na faktuře (25a_faktury_lp_cerpani)
                $stmt_flp = $db->prepare("SELECT DISTINCT lp_id FROM `" . TBL_FAKTURY_LP_CERPANI . "` WHERE faktura_id = ? AND lp_id IS NOT NULL");
                $stmt_flp->execute([$faktura_id]);
                foreach ($stmt_flp->fetchAll(PDO::FETCH_COLUMN) as $flp_lp_id) {
                    if ((int)$flp_lp_id > 0) $lp_ids_to_recalc[(int)$flp_lp_id] = true;
                }

                // 3) LP z financování objednávky (lp_kody)
                $objednavky_tbl = get_orders_table_name();
                $stmt_fin = $db->prepare("SELECT o.financovani FROM `$objednavky_tbl` o INNER JOIN `$faktury_table` f ON f.objednavka_id = o.id WHERE f.id = ?");
                $stmt_fin->execute([$faktura_id]);
                $fin_row = $stmt_fin->fetch(PDO::FETCH_ASSOC);
                if ($fin_row && !empty($fin_row['financovani'])) {
                    $fin = json_decode($fin_row['financovani'], true);
                    if (is_array($fin) && isset($fin['lp_kody']) && is_array($fin['lp_kody'])) {
                        foreach ($fin['lp_kody'] as $lpid) {
                            if ((int)$lpid > 0) $lp_ids_to_recalc[(int)$lpid] = true;
                        }
                    }
                }

                foreach (array_keys($lp_ids_to_recalc) as $rec_lp_id) {
                    if (function_exists('prepocetCerpaniPodleIdLP_PDO')) {
                        $res = prepocetCerpaniPodleIdLP_PDO($db, $rec_lp_id);
                        error_log("🔄 LP recalc (věcná spr. faktury $faktura_id): LP#$rec_lp_id - " . json_encode($res));
                    }
                }
            } catch (Exception $e) {
                error_log("⚠️ LP přepočet po věcné správnosti selhal (faktura $faktura_id): " . $e->getMessage());
            }
        }

        // ==========================================
        // �🔔 NOTIFICATION TRIGGERS - Nové události
        // ==========================================
        
        // Načti aktuální user_id z tokenu
        $currentUserId = $token_data['id'];
        
        // TRIGGER 1: INVOICE_UPDATED - Pouze pokud se nezměnil stav (jinak jsou specifické triggery)
        $stavChanged = isset($input['stav']) && $input['stav'] !== $oldInvoiceData['stav'];
        $vecnaSpravnostChanged = isset($input['vecna_spravnost_potvrzeno']) && 
                                  (int)$input['vecna_spravnost_potvrzeno'] !== 0 && 
                                  (int)$oldInvoiceData['vecna_spravnost_potvrzeno'] === 0;
        
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

        // AUDIT LOG: field-level diff faktury (po odpovědi, fail-safe)
        try {
            if (function_exists('audit_log_field_changes') && !empty($oldInvoiceData)) {
                $fa_after_stmt = $db->prepare("SELECT * FROM `$faktury_table` WHERE id = ? LIMIT 1");
                $fa_after_stmt->execute([$faktura_id]);
                $fa_after = $fa_after_stmt->fetch(PDO::FETCH_ASSOC) ?: [];
                audit_log_field_changes(
                    $db, $token_data, 'FAKTURA', $faktura_id,
                    'invoices25/update',
                    (array)$oldInvoiceData, (array)$fa_after
                );
            }
        } catch (Exception $ae) { error_log('[AUDIT] invoice update audit error: ' . $ae->getMessage()); }

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

        $faktury_table = get_invoices_table_name();

        $sql_invoice_meta = "SELECT objednavka_id FROM `{$faktury_table}` WHERE id = ? LIMIT 1";
        $stmt_invoice_meta = $db->prepare($sql_invoice_meta);
        $stmt_invoice_meta->execute(array($faktura_id));
        $invoice_meta = $stmt_invoice_meta->fetch(PDO::FETCH_ASSOC);

        if (!$invoice_meta) {
            http_response_code(404);
            echo json_encode(['err' => 'Faktura nenalezena']);
            return;
        }

        $affected_order_id = !empty($invoice_meta['objednavka_id']) ? (int)$invoice_meta['objednavka_id'] : 0;

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

        if ($affected_order_id > 0) {
            try {
                invoices25_sync_order_invoice_tracking_metadata($db, $affected_order_id, (int)$token_data['id']);
            } catch (Exception $tracking_error) {
                error_log("⚠️ [INVOICES25 TRACKING] Chyba při synchronizaci objednávky #{$affected_order_id}: " . $tracking_error->getMessage());
            }
        }

        // Commit transakce
        $db->commit();

        // AUDIT LOG: DELETE faktury (fail-safe)
        try {
            if (function_exists('audit_log_action')) {
                $delete_note = ($hard_delete === 1)
                    ? 'Hard delete faktury (včetně příloh)'
                    : 'Soft delete faktury (aktivni=0)';
                audit_log_action(
                    $db,
                    $token_data,
                    'FAKTURA',
                    (int)$faktura_id,
                    'DELETE',
                    'invoices25/delete',
                    $delete_note
                );
            }
        } catch (Exception $ae) {
            error_log('[AUDIT] invoice delete audit error: ' . $ae->getMessage());
        }

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
                f.vecna_spravnost_duvod,
                f.vecna_spravnost_poznamka,
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
                u_predana.email as fa_predana_zam_email,
                olp.id as odbory_lp_id,
                olp.lp_id as odbory_lp_lp_id,
                olp.poznamka as odbory_lp_poznamka,
                lp.cislo_lp as odbory_lp_cislo,
                lp.nazev_uctu as odbory_lp_nazev,
                lp.modul as odbory_lp_modul,
                lp.platne_od as odbory_lp_platne_od,
                lp.platne_do as odbory_lp_platne_do,
                lp.vyse_financniho_kryti as odbory_lp_limit
            FROM `$faktury_table` f
            LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
            LEFT JOIN `25_smlouvy` sm ON f.smlouva_id = sm.id
            LEFT JOIN `$states_table` s ON s.typ_objektu = 'FAKTURA' AND s.kod_stavu = f.fa_typ
            LEFT JOIN `$users_table` u_vecna ON f.potvrdil_vecnou_spravnost_id = u_vecna.id
            LEFT JOIN `$users_table` u_predana ON f.fa_predana_zam_id = u_predana.id
            LEFT JOIN `" . TBL_ODBORY_LP_PRIRAZENI . "` olp ON f.id = olp.faktura_id
            LEFT JOIN `" . TBL_LIMITOVANE_PRISLIBY . "` lp ON olp.lp_id = lp.id
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

        $faktura['substitution_info'] = array();
        $sub_info = resolveInvoiceMaterialCheckSubstitutionInfo($db, $faktura);
        if ($sub_info) {
            $faktura['substitution_info']['potvrdil_vecnou_spravnost'] = $sub_info;
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
    // ⚠️ Pozor: empty('0') === true, takže pro částky nepoužívat empty() ani !$fa_castka
    $fa_castka_str = ($fa_castka === null) ? '' : (is_string($fa_castka) ? trim($fa_castka) : trim(strval($fa_castka)));
    if (!$token || !$request_username || $fa_castka_str === '' || empty($fa_cislo_vema)) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí povinné parametry: token, username, fa_castka, fa_cislo_vema']);
        return;
    }

    // ✅ Normalizace částky - zabrání SQL warning 1265 "Data truncated"
    $moneyError = null;
    $normalizedAmount = invoices25_normalize_money_to_decimal_string($fa_castka, $moneyError);
    if ($normalizedAmount === null) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatná částka faktury (fa_castka): ' . $moneyError]);
        return;
    }
    $fa_castka = $normalizedAmount;

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
            fa_vema_kod,
            fa_datum_vystaveni,
            fa_datum_splatnosti,
            fa_datum_doruceni,
            fa_strediska_kod,
            fa_poznamka,
            rozsirujici_data,
            vytvoril_uzivatel_id,
            aktualizoval_uzivatel_id,
            dt_vytvoreni,
            dt_aktualizace,
            aktivni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)";

        $stmt_faktura = $db->prepare($sql_faktura);
        
        $fa_dorucena = isset($_POST['fa_dorucena']) ? (int)$_POST['fa_dorucena'] : 0;
        $fa_vema_kod = isset($_POST['fa_vema_kod']) ? trim($_POST['fa_vema_kod']) : null;
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
            $fa_vema_kod,
            $fa_datum_vystaveni,
            $fa_datum_splatnosti,
            $fa_datum_doruceni,
            $fa_strediska_kod,
            $fa_poznamka,
            $rozsirujici_data,
            $token_data['id'],
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
    // ==========================================
    // 🐛 DEV DEBUG LOGGING - MODUL FAKTUR
    // ==========================================
    error_log("╔═══════════════════════════════════════════════════════════");
    error_log("║ 📋 MODUL FAKTUR - NAČÍTÁNÍ SEZNAMU");
    error_log("║ Čas: " . date('Y-m-d H:i:s'));
    error_log("║ Uživatel: " . (isset($input['username']) ? $input['username'] : 'N/A'));
    error_log("║ Endpoint: invoices25/list");
    error_log("╚═══════════════════════════════════════════════════════════");
    
    // � FORCE WARNING TEST
    trigger_error("TEST WARNING - Tento warning MUSÍ být v logu!", E_USER_WARNING);
    
    // �🐛 DEBUG: Log úplný payload
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
        $access_context = isset($input['access_context']) ? $input['access_context'] : null;
        
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
            'filter_vecna_kontrola', 'filter_vecna_spravnost_status', 'filter_vecnou_provedl', 'filter_predano_zamestnanec',
            // Filtr pro kontrolu řádku
            'filter_kontrola_radku',
            // ADMIN FEATURE: Zobrazení pouze neaktivních faktur
            'show_only_inactive',
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
        debug_log("Invoices25 LIST: Final filters array", $filters);
        
        // 🔧 ADMIN FEATURE: Zobrazení POUZE neaktivních faktur (aktivni = 0)
        // Tento filtr je viditelný pouze pro role ADMINISTRATOR a SUPERADMIN
        // Pokud je show_only_inactive = 1 → zobrazí POUZE neaktivní faktury (soft-deleted)
        $show_only_inactive = isset($filters['show_only_inactive']) && (int)$filters['show_only_inactive'] === 1;
        debug_log("Invoices25 LIST: show_only_inactive check", [
            'isset' => isset($filters['show_only_inactive']),
            'value' => isset($filters['show_only_inactive']) ? $filters['show_only_inactive'] : null,
            'result' => $show_only_inactive
        ]);
        
        if ($show_only_inactive) {
            $where_conditions = array('f.aktivni = 0');
            debug_log("Invoices25 LIST: ADMIN MODE - showing ONLY inactive invoices (aktivni = 0)");
        } else {
            $where_conditions = array('f.aktivni = 1');
            debug_log("Invoices25 LIST: STANDARD MODE - showing only active invoices (aktivni = 1)");
        }
        $params = array();
        
        // �🔒 VALIDACE: Faktury s neaktivní objednávkou nebo smlouvou se nebudou zobrazovat
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
        // OPRAVENO 2026-03-06: Přidána podmínka role_id = -1 pro přímo přiřazená práva
        $permissions_where = "p.kod_prava LIKE 'INVOICE_%'";
        if ($access_context === 'vzdel') {
            $permissions_where .= " OR p.kod_prava = 'EDUCATION_VIEW_ALL'";
        }
        $perms_sql = "
            SELECT DISTINCT p.kod_prava
            FROM " . TBL_PRAVA . " p
            WHERE ($permissions_where)
            AND p.id IN (
                -- Přímá práva (user_id != -1, role_id = -1)
                SELECT rp.pravo_id FROM " . TBL_ROLE_PRAVA . " rp 
                WHERE rp.user_id = ? AND rp.role_id = -1
                
                UNION
                
                -- Práva z rolí (user_id = -1, role_id = X)
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
        $has_education_view_all = $access_context === 'vzdel' && in_array('EDUCATION_VIEW_ALL', $user_permissions);
        
        // 🔥 ADMIN CHECK: SUPERADMIN, ADMINISTRATOR, UCETNI, KONTROLOR_FAKTUR nebo INVOICE_MANAGE = plný přístup (vidí VŠE)
        // Role UCETNI má automatický přístup ke všem fakturám pro účetní operace
        // Role KONTROLOR_FAKTUR má automatický přístup ke všem fakturám pro kontrolu (readonly)
        // Právo INVOICE_MANAGE umožňuje správu všech faktur v systému
        $is_admin = in_array('SUPERADMIN', $user_roles) || 
                    in_array('ADMINISTRATOR', $user_roles) || 
                    in_array('UCETNI', $user_roles) ||
                    in_array('HLAVNI_UCETNI', $user_roles) ||
                    in_array('KONTROLOR_FAKTUR', $user_roles) ||
                $has_invoice_manage ||
                $has_education_view_all;
        
        // DEBUG logging
        error_log("Invoices25 LIST: User $user_id roles: " . implode(', ', $user_roles));
        error_log("Invoices25 LIST: User $user_id permissions: " . implode(', ', $user_permissions));
        error_log("Invoices25 LIST: User usek_id: " . ($user_usek_id ?: 'NULL') . ", usek_zkr: " . ($user_usek_zkr ?: 'NULL'));
        error_log("Invoices25 LIST: Has INVOICE_MANAGE: " . ($has_invoice_manage ? 'YES' : 'NO'));
        error_log("Invoices25 LIST: Has EDUCATION_VIEW_ALL (vzdel context): " . ($has_education_view_all ? 'YES' : 'NO'));
        error_log("Invoices25 LIST: Is admin (SUPERADMIN/ADMINISTRATOR/UCETNI/HLAVNI_UCETNI/KONTROLOR_FAKTUR/INVOICE_MANAGE): " . ($is_admin ? 'YES' : 'NO'));

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
            
            // 7️⃣ ZASTUPOVÁNÍ - faktury k objednávkám zastupovaného uživatele
            if (function_exists('get_user_ids_with_substitution')) {
                try {
                    $scope_info = null;
                    $substitution_ids = get_user_ids_with_substitution($db, $user_id, ['view'], $scope_info);
                    
                    // INHERIT scope: pokud zastupovaný je admin → zástupce vidí VŠE
                    if ($scope_info && !empty($scope_info['has_inherit_full_access'])) {
                        error_log("Invoices25 LIST: ✅ SUBSTITUTION INHERIT FULL ACCESS - user $user_id dědí admin přístup → showing ALL invoices");
                        // Nahradíme user_access podmínky za prázdné - uživatel vidí vše
                        $user_access_conditions = ['1=1'];
                        $user_access_params = [];
                    } elseif (count($substitution_ids) > 1) {
                        // OWN scope: vidí záznamy kde je zastupovaný účastníkem
                        $sub_ids_only = array_diff($substitution_ids, [$user_id]);
                        $sub_placeholders = implode(',', array_map('intval', $sub_ids_only));
                        
                        $sub_orders_sql = "
                            SELECT DISTINCT o.id 
                            FROM `" . TBL_OBJEDNAVKY . "` o
                            WHERE (
                                o.uzivatel_id IN ($sub_placeholders)
                                OR o.garant_uzivatel_id IN ($sub_placeholders)
                                OR o.objednatel_id IN ($sub_placeholders)
                                OR o.schvalovatel_id IN ($sub_placeholders)
                                OR o.prikazce_id IN ($sub_placeholders)
                                OR o.potvrdil_vecnou_spravnost_id IN ($sub_placeholders)
                                OR o.fakturant_id IN ($sub_placeholders)
                            )
                        ";
                        $sub_orders_stmt = $db->query($sub_orders_sql);
                        $sub_order_ids = [];
                        while ($row = $sub_orders_stmt->fetch(PDO::FETCH_ASSOC)) {
                            $sub_order_ids[] = (int)$row['id'];
                        }
                        
                        if (!empty($sub_order_ids)) {
                            $user_access_conditions[] = 'f.objednavka_id IN (' . implode(',', $sub_order_ids) . ')';
                            error_log("Invoices25 LIST: ✅ SUBSTITUTION - user $user_id sees invoices for " . count($sub_order_ids) . " orders of substituted users");
                        }
                        
                        // Také faktury přímo vytvořené/předané zastupovaným
                        $user_access_conditions[] = 'f.vytvoril_uzivatel_id IN (' . $sub_placeholders . ')';
                        $user_access_conditions[] = 'f.fa_predana_zam_id IN (' . $sub_placeholders . ')';
                        error_log("Invoices25 LIST: ✅ SUBSTITUTION - also added direct invoice access for substituted users: $sub_placeholders");
                        
                        // INHERIT subordinate IDs - přidej podřízené zastupovaného
                        if ($scope_info && !empty($scope_info['inherit_subordinate_ids'])) {
                            $inheritSubIds = implode(',', array_map('intval', $scope_info['inherit_subordinate_ids']));
                            
                            $inherit_sub_sql = "
                                SELECT DISTINCT o.id 
                                FROM `" . TBL_OBJEDNAVKY . "` o
                                WHERE (
                                    o.uzivatel_id IN ($inheritSubIds)
                                    OR o.garant_uzivatel_id IN ($inheritSubIds)
                                    OR o.objednatel_id IN ($inheritSubIds)
                                    OR o.schvalovatel_id IN ($inheritSubIds)
                                    OR o.prikazce_id IN ($inheritSubIds)
                                    OR o.potvrdil_vecnou_spravnost_id IN ($inheritSubIds)
                                    OR o.fakturant_id IN ($inheritSubIds)
                                )
                            ";
                            $inherit_orders_stmt = $db->query($inherit_sub_sql);
                            $inherit_order_ids = [];
                            while ($row = $inherit_orders_stmt->fetch(PDO::FETCH_ASSOC)) {
                                $inherit_order_ids[] = (int)$row['id'];
                            }
                            if (!empty($inherit_order_ids)) {
                                $user_access_conditions[] = 'f.objednavka_id IN (' . implode(',', $inherit_order_ids) . ')';
                                error_log("Invoices25 LIST: ✅ SUBSTITUTION INHERIT subordinates - " . count($inherit_order_ids) . " additional orders");
                            }
                        }
                    }
                } catch (Exception $e) {
                    error_log("Invoices25 LIST: ⚠️ SUBSTITUTION error (fail-safe): " . $e->getMessage());
                }
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
        // Filtruje podle jednoho z datumů (OR): vystavení, doručení nebo splatnost
        if (isset($input['year']) && (int)$input['year'] > 0) {
            $where_conditions[] = '(YEAR(f.fa_datum_vystaveni) = ? OR YEAR(f.fa_datum_doruceni) = ? OR YEAR(f.fa_datum_splatnosti) = ?)';
            $params[] = (int)$input['year'];
            $params[] = (int)$input['year'];
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

        // Filtr: fa_cislo_vema + fa_vema_kod + fa_poznamka (partial match, bez diakritiky, case-insensitive)
        if (isset($filters['fa_cislo_vema']) && trim($filters['fa_cislo_vema']) !== '') {
            $search_raw = trim($filters['fa_cislo_vema']);
            $search_norm = mb_strtolower(removeDiacritics($search_raw), 'UTF-8');
            $search_like = '%' . escapeLikeWildcards($search_norm) . '%';

            $where_conditions[] = "(\n" .
                "  LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(\n" .
                "    f.fa_cislo_vema, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s')) LIKE ? OR\n" .
                "  LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(\n" .
                "    f.fa_vema_kod, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s')) LIKE ? OR\n" .
                "  LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(\n" .
                "    f.fa_poznamka, 'á','a'), 'č','c'), 'ď','d'), 'é','e'), 'í','i'), 'ň','n'), 'ó','o'), 'ř','r'), 'š','s')) LIKE ?\n" .
                ")";
            $params[] = $search_like;
            $params[] = $search_like;
            $params[] = $search_like;
        }

        // Filtr: datum OD - kontroluje vystavení, doručení nebo splatnost (OR)
        if (isset($filters['datum_od']) && !empty($filters['datum_od'])) {
            $where_conditions[] = '(f.fa_datum_vystaveni >= ? OR f.fa_datum_doruceni >= ? OR f.fa_datum_splatnosti >= ?)';
            $params[] = $filters['datum_od'];
            $params[] = $filters['datum_od'];
            $params[] = $filters['datum_od'];
        }

        // Filtr: datum DO - kontroluje vystavení, doručení nebo splatnost (OR)
        if (isset($filters['datum_do']) && !empty($filters['datum_do'])) {
            $where_conditions[] = '(f.fa_datum_vystaveni <= ? OR f.fa_datum_doruceni <= ? OR f.fa_datum_splatnosti <= ?)';
            $params[] = $filters['datum_do'];
            $params[] = $filters['datum_do'];
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
        // ⚠️ UNIVERSAL: Hledá v čísle objednávky, čísle smlouvy, názvu dodavatele, IČO a LP (odborové)
        if (isset($filters['cislo_objednavky']) && trim($filters['cislo_objednavky']) !== '') {
            $search_obj_sml = strtolower(trim($filters['cislo_objednavky']));
            $where_conditions[] = '(LOWER(o.cislo_objednavky) LIKE ? OR LOWER(sm.cislo_smlouvy) LIKE ? OR LOWER(o.dodavatel_nazev) LIKE ? OR LOWER(sm.nazev_firmy) LIKE ? OR o.dodavatel_ico LIKE ? OR sm.ico LIKE ? OR LOWER(lp_odbory.cislo_lp) LIKE ? OR LOWER(lp_odbory.nazev_uctu) LIKE ?)';
            $params[] = '%' . $search_obj_sml . '%';
            $params[] = '%' . $search_obj_sml . '%';
            $params[] = '%' . $search_obj_sml . '%';
            $params[] = '%' . $search_obj_sml . '%';
            $params[] = '%' . $search_obj_sml . '%';
            $params[] = '%' . $search_obj_sml . '%';
            $params[] = '%' . $search_obj_sml . '%';
            $params[] = '%' . $search_obj_sml . '%';
            error_log("Invoices25 LIST: Applying cislo_objednavky filter (OBJ + SML + dodavatel) = '$search_obj_sml'");
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
        // Podporuje multi-value: comma-separated hodnoty (např. "ZAPLACENO,STORNO")
        if (isset($filters['filter_stav']) && !empty($filters['filter_stav'])) {
            $filter_stav_raw = strtoupper(trim($filters['filter_stav']));
            
            // Workflow stavy - přesná shoda ENUM hodnoty
            $valid_workflow_states = array('ZAEVIDOVANA', 'VECNA_SPRAVNOST', 'V_RESENI', 'PREDANA_PO', 'K_ZAPLACENI', 'ZAPLACENO', 'DOKONCENA', 'STORNO');

            // Podpora multi-value: comma-separated
            if (strpos($filter_stav_raw, ',') !== false) {
                $stav_arr = array_filter(array_map('trim', explode(',', $filter_stav_raw)));
                $valid_arr = array_filter($stav_arr, function($s) use ($valid_workflow_states) {
                    return in_array($s, $valid_workflow_states);
                });
                if (!empty($valid_arr)) {
                    $placeholders = implode(',', array_fill(0, count($valid_arr), '?'));
                    $where_conditions[] = "f.stav IN ($placeholders)";
                    foreach ($valid_arr as $s) {
                        $params[] = $s;
                    }
                    error_log("Invoices25 LIST: Applying filter_stav multi = " . implode(',', $valid_arr));
                }
            } else {
            $filter_stav = $filter_stav_raw;
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
                        // POUZE stavy ZAPLACENO/DOKONCENA
                        $where_conditions[] = 'f.stav IN ("ZAPLACENO", "DOKONCENA")';
                        break;
                    case 'unpaid':
                        // Nezaplaceno = všechny kromě ZAPLACENO/DOKONCENA/STORNO (včetně po splatnosti)
                        $where_conditions[] = 'f.stav NOT IN ("ZAPLACENO", "DOKONCENA", "STORNO")';
                        break;
                    case 'within_due':
                        // Ve splatnosti = nezaplacené faktury, které NEJSOU po splatnosti
                        $where_conditions[] = 'f.stav NOT IN ("ZAPLACENO", "DOKONCENA", "STORNO") AND (f.fa_datum_splatnosti >= CURDATE() OR f.fa_datum_splatnosti IS NULL)';
                        break;
                    case 'overdue':
                        // ⚠️ K_ZAPLACENI může být po splatnosti! Pouze ZAPLACENO, DOKONCENA a STORNO jsou výjimky.
                        $where_conditions[] = '(f.fa_zaplacena = 0 OR f.fa_zaplacena IS NULL) AND f.stav NOT IN ("ZAPLACENO", "DOKONCENA", "STORNO") AND f.fa_datum_splatnosti IS NOT NULL AND f.fa_datum_splatnosti < CURDATE()';
                        break;
                    case 'storno':
                        $where_conditions[] = 'f.stav = "STORNO"';
                        break;
                    case 'vecna_spravnost':
                        $where_conditions[] = 'f.stav = "VECNA_SPRAVNOST"';
                        break;
                }
            }
            } // end else (single value)
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
        
        // Filtr: filter_vecna_spravnost_status (věcná správnost: schváleno/zamítnuto/nepotvrzeno)
        if (isset($filters['filter_vecna_spravnost_status']) && is_numeric($filters['filter_vecna_spravnost_status'])) {
            $status = (int)$filters['filter_vecna_spravnost_status'];
            if ($status === 1) {
                // Pouze potvrzena
                $where_conditions[] = 'f.vecna_spravnost_potvrzeno = 1';
                error_log("Invoices25 LIST: Applying filter_vecna_spravnost_status = 1 (potvrzena)");
            } else if ($status === 2) {
                // Pouze zamítnuto
                $where_conditions[] = 'f.vecna_spravnost_potvrzeno = 2';
                error_log("Invoices25 LIST: Applying filter_vecna_spravnost_status = 2 (zamítnuto)");
            } else if ($status === 0) {
                // Pouze nepotvrzeno
                $where_conditions[] = '(f.vecna_spravnost_potvrzeno = 0 OR f.vecna_spravnost_potvrzeno IS NULL)';
                error_log("Invoices25 LIST: Applying filter_vecna_spravnost_status = 0 (nepotvrzeno)");
            }
        }
        
        // Podpora starého filtru filter_vecna_kontrola (provedena/neprovedena) - DEPRECATED
        if (isset($filters['filter_vecna_kontrola']) && $filters['filter_vecna_kontrola'] !== '' && 
            !isset($filters['filter_vecna_spravnost_status'])) {
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
                    // Zaplaceno: POUZE stavy ZAPLACENO nebo DOKONCENA (fa_zaplacena ignorujeme)
                    $where_conditions[] = 'f.stav IN ("ZAPLACENO", "DOKONCENA")';
                    break;
                    
                case 'unpaid':
                    // Nezaplaceno = VŠECHNY faktury kromě ZAPLACENO, DOKONCENA, STORNO (včetně po splatnosti!)
                    // ⚠️ "Po splatnosti" je subset "Nezaplaceno"
                    $where_conditions[] = 'f.stav NOT IN ("ZAPLACENO", "DOKONCENA", "STORNO")';
                    break;
                    
                case 'within_due':
                    // Ve splatnosti = Nezaplacené faktury, které NEJSOU po splatnosti
                    // (datum splatnosti >= dnes NEBO nemají datum splatnosti)
                    $where_conditions[] = 'f.stav NOT IN ("ZAPLACENO", "DOKONCENA", "STORNO") AND (f.fa_datum_splatnosti >= CURDATE() OR f.fa_datum_splatnosti IS NULL)';
                    break;
                    
                case 'overdue':
                    // Po splatnosti (nezaplacené, nejsou DOKONCENA/ZAPLACENO/STORNO a překročily splatnost)
                    // ⚠️ K_ZAPLACENI může být po splatnosti! Pouze ZAPLACENO, DOKONCENA a STORNO jsou výjimky.
                    $where_conditions[] = '(f.fa_zaplacena = 0 OR f.fa_zaplacena IS NULL) AND f.stav NOT IN ("ZAPLACENO", "DOKONCENA", "STORNO") AND f.fa_datum_splatnosti IS NOT NULL AND f.fa_datum_splatnosti < CURDATE()';
                    break;
                    
                case 'storno':
                    // Stornované faktury
                    $where_conditions[] = 'f.stav = "STORNO"';
                    break;
                    
                case 'vecna_spravnost':
                    // Faktury ve stavu Věcná správnost
                    $where_conditions[] = 'f.stav = "VECNA_SPRAVNOST"';
                    break;
                    
                case 'without_order':
                    // Bez objednávky a bez smlouvy (faktury bez přiřazení)
                    $where_conditions[] = '(f.objednavka_id IS NULL OR f.objednavka_id = 0) AND (f.smlouva_id IS NULL OR f.smlouva_id = 0)';
                    break;
                    
                case 'my_invoices':
                    // Moje faktury (kde se vyskytuju - OR logika: zaevidoval, předáno, věcná správnost)
                    $where_conditions[] = '(f.vytvoril_uzivatel_id = ? OR f.fa_predana_zam_id = ? OR f.potvrdil_vecnou_spravnost_id = ?)';
                    $params[] = $user_id;
                    $params[] = $user_id;
                    $params[] = $user_id;
                    break;
                    
                case 'my_unchecked_invoices':
                    // Moje nezkontrolované faktury (předané na mě, ale ještě bez věcné kontroly)
                    $where_conditions[] = '(f.fa_predana_zam_id = ? AND (f.potvrdil_vecnou_spravnost_id IS NULL OR f.potvrdil_vecnou_spravnost_id = 0))';
                    $params[] = $user_id;
                    break;
                    
                case 'with_contract':
                    // Přiřazené ke smlouvě
                    $where_conditions[] = 'f.smlouva_id IS NOT NULL AND f.smlouva_id > 0';
                    break;

                case 'with_lp':
                    // Přiřazené k LP (odborové LP)
                    $where_conditions[] = 'olp.lp_id IS NOT NULL';
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

                case 'with_note':
                    // Faktury s vyplněnou poznámkou
                    $where_conditions[] = '(f.fa_poznamka IS NOT NULL AND TRIM(f.fa_poznamka) <> "")';
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
                'LOWER(lp_odbory.cislo_lp) LIKE ?',            // LP kód (odborové)
                'LOWER(lp_odbory.nazev_uctu) LIKE ?',          // LP název (odborové)
                'LOWER(f.fa_typ) LIKE ?',                     // Typ faktury ✅ PŘIDÁNO
                'LOWER(f.stav) LIKE ?'                        // Workflow stav ✅ PŘIDÁNO
            );
            
            // Přidání parametrů pro každou search podmínku
            foreach ($search_conditions as $condition) {
                $params[] = $search_like;
            }
            
            // Spojení všech search podmínek jako OR a přidání jako AND do hlavních podmínek
            $where_conditions[] = '(' . implode(' OR ', $search_conditions) . ')';
            
            error_log("Invoices25 LIST: Applying global search_term = " . $search_term . " (15 fields)");
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
            COUNT(CASE WHEN f.stav IN ('ZAPLACENO', 'DOKONCENA') THEN 1 END) as pocet_zaplaceno,
            COALESCE(SUM(CASE WHEN f.stav IN ('ZAPLACENO', 'DOKONCENA') THEN f.fa_castka ELSE 0 END), 0) as celkem_zaplaceno,
            COUNT(CASE WHEN f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') THEN 1 END) as pocet_nezaplaceno,
            COALESCE(SUM(CASE WHEN f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') THEN f.fa_castka ELSE 0 END), 0) as celkem_nezaplaceno,
            COUNT(CASE WHEN (f.fa_zaplacena = 0 OR f.fa_zaplacena IS NULL) AND f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') AND f.fa_datum_splatnosti IS NOT NULL AND f.fa_datum_splatnosti < CURDATE() THEN 1 END) as pocet_po_splatnosti,
            COALESCE(SUM(CASE WHEN (f.fa_zaplacena = 0 OR f.fa_zaplacena IS NULL) AND f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') AND f.fa_datum_splatnosti IS NOT NULL AND f.fa_datum_splatnosti < CURDATE() THEN f.fa_castka ELSE 0 END), 0) as celkem_po_splatnosti,
            COUNT(CASE WHEN f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') AND (f.fa_datum_splatnosti >= CURDATE() OR f.fa_datum_splatnosti IS NULL) THEN 1 END) as pocet_ve_splatnosti,
            COALESCE(SUM(CASE WHEN f.stav NOT IN ('ZAPLACENO', 'DOKONCENA', 'STORNO') AND (f.fa_datum_splatnosti >= CURDATE() OR f.fa_datum_splatnosti IS NULL) THEN f.fa_castka ELSE 0 END), 0) as celkem_ve_splatnosti,
            COUNT(CASE WHEN f.stav = 'STORNO' THEN 1 END) as pocet_storno,
            COALESCE(SUM(CASE WHEN f.stav = 'STORNO' THEN f.fa_castka ELSE 0 END), 0) as celkem_storno,
            COUNT(CASE WHEN f.stav = 'VECNA_SPRAVNOST' THEN 1 END) as pocet_vecna_spravnost,
            COALESCE(SUM(CASE WHEN f.stav = 'VECNA_SPRAVNOST' THEN f.fa_castka ELSE 0 END), 0) as celkem_vecna_spravnost,
            COUNT(CASE WHEN f.vecna_spravnost_potvrzeno = 2 THEN 1 END) as pocet_vecna_spravnost_zamitnuty,
            COALESCE(SUM(CASE WHEN f.vecna_spravnost_potvrzeno = 2 THEN f.fa_castka ELSE 0 END), 0) as celkem_vecna_spravnost_zamitnuty,
            COUNT(CASE WHEN f.vytvoril_uzivatel_id = $user_id OR f.fa_predana_zam_id = $user_id OR f.potvrdil_vecnou_spravnost_id = $user_id THEN 1 END) as pocet_moje_faktury,
            COALESCE(SUM(CASE WHEN f.vytvoril_uzivatel_id = $user_id OR f.fa_predana_zam_id = $user_id OR f.potvrdil_vecnou_spravnost_id = $user_id THEN f.fa_castka ELSE 0 END), 0) as celkem_moje_faktury,
            COUNT(CASE WHEN f.fa_predana_zam_id = $user_id AND (f.potvrdil_vecnou_spravnost_id IS NULL OR f.potvrdil_vecnou_spravnost_id = 0) THEN 1 END) as pocet_moje_nezkontrolovane,
            COALESCE(SUM(CASE WHEN f.fa_predana_zam_id = $user_id AND (f.potvrdil_vecnou_spravnost_id IS NULL OR f.potvrdil_vecnou_spravnost_id = 0) THEN f.fa_castka ELSE 0 END), 0) as celkem_moje_nezkontrolovane,
            COUNT(CASE WHEN f.smlouva_id IS NOT NULL THEN 1 END) as pocet_s_smlouvou,
            COUNT(CASE WHEN f.objednavka_id IS NOT NULL THEN 1 END) as pocet_s_objednavkou,
            COUNT(CASE WHEN olp.lp_id IS NOT NULL THEN 1 END) as pocet_s_lp,
            COUNT(CASE WHEN f.objednavka_id IS NULL AND f.smlouva_id IS NULL THEN 1 END) as pocet_bez_prirazeni,
            COUNT(CASE WHEN szl.id IS NOT NULL THEN 1 END) as pocet_ze_spisovky,
            COUNT(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(f.rozsirujici_data, '$.kontrola_radku.kontrolovano')) = 'true' THEN 1 END) as pocet_zkontrolovano,
            COUNT(CASE WHEN f.fa_poznamka IS NOT NULL AND TRIM(f.fa_poznamka) <> '' THEN 1 END) as pocet_s_poznamkou
        FROM `$faktury_table` f
        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
        LEFT JOIN `25_smlouvy` sm ON f.smlouva_id = sm.id
        LEFT JOIN `25_uzivatele` u_vytvoril ON f.vytvoril_uzivatel_id = u_vytvoril.id
        LEFT JOIN `25_uzivatele` u_obj ON o.uzivatel_id = u_obj.id
        LEFT JOIN `25_organizace_vizitka` org ON u_obj.organizace_id = org.id
        LEFT JOIN `25_useky` us_obj ON u_obj.usek_id = us_obj.id
        LEFT JOIN `25_uzivatele` u_vecna ON f.potvrdil_vecnou_spravnost_id = u_vecna.id
        LEFT JOIN `25_uzivatele` u_predana ON f.fa_predana_zam_id = u_predana.id
        LEFT JOIN (SELECT DISTINCT faktura_id, MIN(id) as id FROM `25_spisovka_zpracovani_log` GROUP BY faktura_id) szl ON f.id = szl.faktura_id
        LEFT JOIN `" . TBL_ODBORY_LP_PRIRAZENI . "` olp ON f.id = olp.faktura_id
        LEFT JOIN `" . TBL_LIMITOVANE_PRISLIBY . "` lp_odbory ON olp.lp_id = lp_odbory.id
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
            'pocet_ve_splatnosti' => (int)$stats['pocet_ve_splatnosti'],
            'celkem_ve_splatnosti' => (float)$stats['celkem_ve_splatnosti'],
            'pocet_storno' => (int)$stats['pocet_storno'],
            'celkem_storno' => (float)$stats['celkem_storno'],
            'pocet_vecna_spravnost' => (int)$stats['pocet_vecna_spravnost'],
            'celkem_vecna_spravnost' => (float)$stats['celkem_vecna_spravnost'],
            'pocet_vecna_spravnost_zamitnuty' => (int)$stats['pocet_vecna_spravnost_zamitnuty'],
            'celkem_vecna_spravnost_zamitnuty' => (float)$stats['celkem_vecna_spravnost_zamitnuty'],
            'pocet_moje_faktury' => (int)$stats['pocet_moje_faktury'],
            'celkem_moje_faktury' => (float)$stats['celkem_moje_faktury'],
            'pocet_moje_nezkontrolovane' => (int)$stats['pocet_moje_nezkontrolovane'],
            'celkem_moje_nezkontrolovane' => (float)$stats['celkem_moje_nezkontrolovane'],
            'pocet_s_smlouvou' => (int)$stats['pocet_s_smlouvou'],
            'pocet_s_objednavkou' => (int)$stats['pocet_s_objednavkou'],
            'pocet_s_lp' => (int)$stats['pocet_s_lp'],
            'pocet_bez_prirazeni' => (int)$stats['pocet_bez_prirazeni'],
            'pocet_ze_spisovky' => (int)$stats['pocet_ze_spisovky'],
            'pocet_zkontrolovano' => (int)$stats['pocet_zkontrolovano'],
            'pocet_s_poznamkou' => (int)$stats['pocet_s_poznamkou']
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
            u_aktualizoval.jmeno AS aktualizoval_jmeno,
            u_aktualizoval.prijmeni AS aktualizoval_prijmeni,
            u_aktualizoval.titul_pred AS aktualizoval_titul_pred,
            u_aktualizoval.titul_za AS aktualizoval_titul_za,
            szl.id AS spisovka_tracking_id,
            szl.dokument_id AS spisovka_dokument_id,
            szl.spisovka_priloha_id AS spisovka_priloha_id,
            (SELECT COUNT(*) FROM `" . TBL_FAKTURY_LP_CERPANI . "` lpc WHERE lpc.faktura_id = f.id) AS lp_cerpani_count,
            olp.id AS odbory_lp_id,
            olp.lp_id AS odbory_lp_lp_id,
            olp.poznamka AS odbory_lp_poznamka,
            lp_odbory.cislo_lp AS odbory_lp_cislo,
            lp_odbory.nazev_uctu AS odbory_lp_nazev,
            lp_odbory.modul AS odbory_lp_modul,
            lp_odbory.platne_od AS odbory_lp_platne_od,
            lp_odbory.platne_do AS odbory_lp_platne_do,
            lp_odbory.vyse_financniho_kryti AS odbory_lp_limit
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
        LEFT JOIN `25_uzivatele` u_aktualizoval ON f.aktualizoval_uzivatel_id = u_aktualizoval.id
        LEFT JOIN `25_spisovka_zpracovani_log` szl ON f.id = szl.faktura_id
        LEFT JOIN `" . TBL_ODBORY_LP_PRIRAZENI . "` olp ON f.id = olp.faktura_id
        LEFT JOIN `" . TBL_LIMITOVANE_PRISLIBY . "` lp_odbory ON olp.lp_id = lp_odbory.id
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
            'cislo_objednavky' => 'o.cislo_objednavky',
            'datum_doruceni' => 'f.fa_datum_doruceni',
            'datum_vystaveni' => 'f.fa_datum_vystaveni',
            'datum_splatnosti' => 'f.fa_datum_splatnosti',
            'castka' => 'f.fa_castka',
            'status' => 'f.stav', // workflow stav faktury (ZAEVIDOVANA, VECNA_SPRAVNOST, atd.)
            'vytvoril_uzivatel' => 'u_vytvoril.prijmeni',
            'fa_predana_zam_jmeno' => 'u_predana.prijmeni',
            'potvrdil_vecnou_spravnost_jmeno' => 'u_vecna.prijmeni',
            'vecna_spravnost_potvrzeno' => 'f.vecna_spravnost_potvrzeno',
            'pocet_priloh' => 'pocet_priloh'
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
            file_put_contents('/var/www/erdms-dev/logs/invoice_debug.json', json_encode([
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
                
                // ✅ TŘÍFÁZOVÝ SYSTÉM KONTROLY: Přidat check_status přímo do faktury
                if (isset($faktura['rozsirujici_data']['kontrola_radku'])) {
                    $kontrola = $faktura['rozsirujici_data']['kontrola_radku'];
                    
                    if (!empty($kontrola['kontrolovano'])) {
                        $dt_kontroly = isset($kontrola['dt_kontroly']) ? $kontrola['dt_kontroly'] : null;
                        $dt_aktualizace = isset($faktura['dt_aktualizace']) ? $faktura['dt_aktualizace'] : null;
                        
                        if ($dt_kontroly && $dt_aktualizace) {
                            $ts_kontroly = strtotime($dt_kontroly);
                            $ts_aktualizace = strtotime($dt_aktualizace);
                            
                            if ($ts_kontroly >= $ts_aktualizace) {
                                $faktura['check_status'] = 'checked_ok';  // ✅ Zelená - zkontrolováno, beze změn
                            } else {
                                $faktura['check_status'] = 'checked_modified';  // ⚠️ Oranžová - zkontrolováno, ale upraveno
                            }
                        } else {
                            $faktura['check_status'] = 'checked_ok';  // Pokud nemáme dt_aktualizace, považujeme za OK
                        }
                    } else {
                        $faktura['check_status'] = 'unchecked';  // ⚪ Nezkontrolováno
                    }
                } else {
                    $faktura['check_status'] = 'unchecked';  // ⚪ Nezkontrolováno (žádné kontrola_radku)
                }
                
                // ✨ Doplnit username uživatele, který přiřadil roční poplatek
                if (isset($faktura['rozsirujici_data']['rocni_poplatek']['prirazeno_uzivatelem_id'])) {
                    $userId = (int)$faktura['rozsirujici_data']['rocni_poplatek']['prirazeno_uzivatelem_id'];
                    try {
                        $stmtUser = $db->prepare("
                            SELECT CONCAT(prijmeni, ' ', jmeno) as jmeno_cele, 
                                   CONCAT(prijmeni, ' ', SUBSTRING(jmeno, 1, 1), '.') as jmeno_zkracene
                            FROM 25_uzivatele 
                            WHERE id = ?
                        ");
                        $stmtUser->execute([$userId]);
                        $user = $stmtUser->fetch(PDO::FETCH_ASSOC);
                        if ($user) {
                            $faktura['rozsirujici_data']['rocni_poplatek']['prirazeno_uzivatelem_jmeno'] = $user['jmeno_cele'];
                            $faktura['rozsirujici_data']['rocni_poplatek']['prirazeno_uzivatelem_jmeno_zkracene'] = $user['jmeno_zkracene'];
                        }
                    } catch (Exception $e) {
                        error_log("Chyba při načítání uživatele pro roční poplatek: " . $e->getMessage());
                    }
                }
            } else {
                $faktura['rozsirujici_data'] = null;
                $faktura['check_status'] = 'unchecked';  // ⚪ Nezkontrolováno (žádné rozsirujici_data)
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
            $objednavka_je_zkontrolovana = false;
            if (!empty($faktura['objednavka_stav_workflow_kod'])) {
                // Stav workflow je uložen jako JSON array, např. ["DOKONCENA"]
                $workflow_states = json_decode($faktura['objednavka_stav_workflow_kod'], true);
                if (is_array($workflow_states)) {
                    if (in_array('DOKONCENA', $workflow_states)) {
                        $objednavka_je_dokoncena = true;
                    }
                    if (in_array('ZKONTROLOVANA', $workflow_states)) {
                        $objednavka_je_zkontrolovana = true;
                    }
                }
            }
            $faktura['objednavka_je_dokoncena'] = $objednavka_je_dokoncena;
            $faktura['objednavka_je_zkontrolovana'] = $objednavka_je_zkontrolovana;
            
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
        unset($faktura); // ⚠️ KRITICKÉ: Zruš referenci z prvního foreach!
        
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
        unset($faktura); // ⚠️ KRITICKÉ: Unset reference aby se nepřepsala později

        // =====================================================================
        // 💰 NAČÍST LP ČERPÁNÍ PRO VŠECHNY FAKTURY NAJEDNOU (S KATEGORIEMI LP)
        // =====================================================================
        if (!empty($faktura_ids)) {
            $lp_cerpani_map = array();
            $lp_ids_placeholder = implode(',', array_fill(0, count($faktura_ids), '?'));
            
            // ✅ JOIN s 25_limitovane_prisliby pro získání kategorie LP (LPIT1, LPIT5, ...)
            $lp_sql = "SELECT 
                fc.id, fc.faktura_id, fc.lp_cislo, fc.lp_id, fc.castka, fc.poznamka,
                fc.datum_pridani, fc.pridal_user_id, fc.datum_upravy, fc.upravil_user_id,
                lp.cislo_lp AS lp_kod
            FROM `" . TBL_FAKTURY_LP_CERPANI . "` fc
            LEFT JOIN `" . TBL_LIMITOVANE_PRISLIBY . "` lp ON lp.id = fc.lp_id
            WHERE fc.faktura_id IN ($lp_ids_placeholder)
            ORDER BY fc.faktura_id, fc.id";
            
            $lp_stmt = $db->prepare($lp_sql);
            $lp_stmt->execute($faktura_ids);
            $all_lp_cerpani = $lp_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Seskupit LP čerpání podle faktura_id
            foreach ($all_lp_cerpani as $lp) {
                $fid = (int)$lp['faktura_id'];
                if (!isset($lp_cerpani_map[$fid])) {
                    $lp_cerpani_map[$fid] = array();
                }
                
                // Formátovat LP čerpání pro FE (včetně lp_kod kategorie)
                $lp_cerpani_map[$fid][] = array(
                    'id' => (int)$lp['id'],
                    'faktura_id' => (int)$lp['faktura_id'],
                    'lp_cislo' => $lp['lp_cislo'],
                    'lp_id' => !empty($lp['lp_id']) ? (int)$lp['lp_id'] : null,
                    'lp_kod' => $lp['lp_kod'], // ✅ Kategorie LP (LPIT1, LPIT5, ...)
                    'castka' => $lp['castka'], // decimal as string
                    'poznamka' => $lp['poznamka'],
                    'datum_pridani' => $lp['datum_pridani'],
                    'pridal_user_id' => !empty($lp['pridal_user_id']) ? (int)$lp['pridal_user_id'] : null,
                    'datum_upravy' => $lp['datum_upravy'],
                    'upravil_user_id' => !empty($lp['upravil_user_id']) ? (int)$lp['upravil_user_id'] : null
                );
            }
            
            // Přidat LP čerpání k fakturám
            foreach ($faktury as &$faktura) {
                $fid = $faktura['id'];
                $faktura['lp_cerpani'] = isset($lp_cerpani_map[$fid]) ? $lp_cerpani_map[$fid] : array();
            }
            unset($faktura); // ⚠️ KRITICKÉ: Unset reference
        }

        // 🎯 SUBSTITUTION INFO - Přidej informace o zastoupení ke každé faktuře
        foreach ($faktury as &$faktura) {
            // Inicializuj pole pro substitution info
            $faktura['substitution_info'] = [];
            
            // Potvrzení věcné správnosti (potvrdil_vecnou_spravnost_id + dt_potvrzeni_vecne_spravnosti)
            $sub_info = resolveInvoiceMaterialCheckSubstitutionInfo($db, $faktura);
            if ($sub_info) {
                $faktura['substitution_info']['potvrdil_vecnou_spravnost'] = $sub_info;
            }
        }
        unset($faktura); // ⚠️ KRITICKÉ: Unset reference

        // Vypočítat pagination metadata
        $total_pages = $use_pagination ? (int)ceil($total_count / $per_page) : 1;
        
        // Response - OrderV2 formát s pagination + statistiky + user metadata
        // FE očekává: { status: "ok", faktury: [...], pagination: {...}, statistiky: {...}, user_info: {...} }
        
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
        
        // 🔍 DEBUG - log prvních 3 faktur v JSON response
        if (!empty($response_data['faktury']) && count($response_data['faktury']) > 0) {
            $first_invoice = $response_data['faktury'][0];
            error_log("JSON RESPONSE First Invoice #" . $first_invoice['id'] . ": has_check_status=" . (isset($first_invoice['check_status']) ? 'YES (' . $first_invoice['check_status'] . ')' : 'NO'));
        }
        
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

/**
 * POST /invoices25/restore
 * Obnovení neaktivní faktury (nastavení aktivni = 1)
 * Pouze pro ADMIN role (SUPERADMIN, ADMINISTRATOR)
 */
function handle_invoices25_restore($input, $config, $queries) {
    debug_log("🚀 RESTORE invoices25 STARTED - Input: " . json_encode($input));
    
    // Ověření tokenu z POST dat
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    debug_log("🔑 Token: " . substr($token, 0, 20) . "..., Username: $request_username, Invoice ID: $invoice_id");

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($invoice_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID faktury']);
        return;
    }

    try {
        $db = get_db($config);
        
        // 🔒 ADMIN CHECK - pouze admin může obnovit fakturu
        $is_admin = isset($token_data['is_admin']) && $token_data['is_admin'] === true;
        
        debug_log("🔍 RESTORE invoices25: User {$token_data['username']} (ID {$token_data['id']}), is_admin: " . ($is_admin ? 'TRUE' : 'FALSE'));
        
        if (!$is_admin) {
            http_response_code(403);
            echo json_encode(['err' => 'Pouze ADMIN může obnovit faktury']);
            debug_log("⛔ RESTORE invoices25: Uživatel {$token_data['username']} (ID {$token_data['id']}) nemá ADMIN oprávnění");
            return;
        }

        $db->beginTransaction();

        // Zkontrolovat, zda faktura existuje (včetně deaktivovaných)
        $checkStmt = $db->prepare("SELECT * FROM " . TBL_FAKTURY . " WHERE id = :id");
        $checkStmt->bindParam(':id', $invoice_id, PDO::PARAM_INT);
        $checkStmt->execute();
        $invoice = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$invoice) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(['err' => 'Faktura nebyla nalezena']);
            debug_log("⛔ RESTORE invoices25: Faktura #$invoice_id neexistuje");
            return;
        }

        // Zkontrolovat, zda je deaktivovaná
        if ($invoice['aktivni'] == 1) {
            $db->rollBack();
            http_response_code(400);
            echo json_encode(['err' => 'Faktura je již aktivní']);
            debug_log("⚠️ RESTORE invoices25: Faktura #$invoice_id je již aktivní");
            return;
        }

        // Restore - nastavit aktivni = 1 a aktualizovat datum
        $restoreStmt = $db->prepare("UPDATE " . TBL_FAKTURY . " 
                                     SET aktivni = 1, 
                                         dt_aktualizace = NOW()
                                     WHERE id = :id");
        $restoreStmt->bindParam(':id', $invoice_id, PDO::PARAM_INT);
        $restoreStmt->execute();

        $db->commit();

        debug_log("✅ RESTORE invoices25: Faktura #$invoice_id (číslo: {$invoice['cislo_faktury']}) byla obnovena uživatelem {$token_data['username']} (ID {$token_data['id']})");

        echo json_encode([
            'status' => 'ok',
            'message' => 'Faktura byla úspěšně obnovena',
            'data' => [
                'id' => $invoice_id,
                'cislo_faktury' => $invoice['cislo_faktury'],
                'aktivni' => 1,
                'obnoveno_uzivatelem' => $token_data['id']
            ]
        ]);
        
    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        http_response_code(500);
        debug_log("⛔ RESTORE invoices25 ERROR: " . $e->getMessage());
        echo json_encode(['err' => 'Chyba při obnově faktury: ' . $e->getMessage()]);
    }
}


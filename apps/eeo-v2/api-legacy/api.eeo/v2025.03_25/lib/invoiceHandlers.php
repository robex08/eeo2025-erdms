<?php
/**
 * Invoice Handlers - Faktury API
 * PHP 5.6 kompatibilní
 * Všechny endpointy jsou POST s token + username autorizací
 * 
 * ⚠️ DEPRECATED - Pro nový vývoj používej orderV2InvoiceHandlers.php
 * 
 * DŮVOD DEPRECATION:
 * - Nejednotný response formát (používá 'err', 'success', 'faktury' místo 'status')
 * - Chybí standardizace (každý endpoint vrací jiný formát)
 * - Omezenější funkcionalita (chybí update/delete příloh)
 * 
 * MIGRACE NA V2:
 * - invoices25/by-order        → pouze přes order detail (order-v2/{id})
 * - invoices25/create           → order-v2/{order_id}/invoices/create
 * - invoices25/create-with-att  → order-v2/{order_id}/invoices/create-with-attachment
 * - invoices25/update           → order-v2/invoices/{invoice_id}/update
 * - invoices25/delete           → order-v2/invoices/{invoice_id}/delete
 * - invoices25/attachments/*    → order-v2/invoices/{id}/attachments/*
 * 
 * PONECHÁNO PRO:
 * - Starší objednávky které používají starý upload path
 * - Legacy FE kód který ještě nebyl migrován
 * - Backward compatibility během přechodného období
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
            'err' => 'Chybí povinné parametry',
            'debug' => [
                'has_token' => !empty($token),
                'username' => $request_username,
                'objednavka_id' => $objednavka_id
            ]
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
    $objednavka_id = isset($input['objednavka_id']) && !empty($input['objednavka_id']) ? (int)$input['objednavka_id'] : null;
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
            vytvoril_uzivatel_id,
            dt_vytvoreni,
            aktivni
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1
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
            $token_data['id']
        ]);

        $new_id = $db->lastInsertId();

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

        // Ověř, že faktura existuje
        $faktury_table = get_invoices_table_name();
        $check_stmt = $db->prepare("SELECT id FROM `$faktury_table` WHERE id = ? AND aktivni = 1");
        $check_stmt->execute([$faktura_id]);
        
        if (!$check_stmt->fetch()) {
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
            $values[] = $input['fa_datum_vystaveni'];
        }
        if (isset($input['fa_datum_splatnosti'])) {
            $fields[] = 'fa_datum_splatnosti = ?';
            $values[] = $input['fa_datum_splatnosti'];
        }
        if (isset($input['fa_datum_doruceni'])) {
            $fields[] = 'fa_datum_doruceni = ?';
            $values[] = $input['fa_datum_doruceni'];
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

        // Vždy aktualizuj dt_aktualizace
        $fields[] = 'dt_aktualizace = NOW()';
        
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['err' => 'Žádná data k aktualizaci']);
            return;
        }

        $values[] = $faktura_id;
        $sql = "UPDATE `$faktury_table` SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

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
            $sql_get_prilohy = "SELECT systemova_cesta FROM `25a_faktury_prilohy` WHERE faktura_id = ?";
            $stmt_get = $db->prepare($sql_get_prilohy);
            $stmt_get->execute(array($faktura_id));
            $prilohy = $stmt_get->fetchAll(PDO::FETCH_ASSOC);

            // 2. Smaž přílohy z databáze
            $sql_delete_prilohy = "DELETE FROM `25a_faktury_prilohy` WHERE faktura_id = ?";
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
            $sql_deactivate_prilohy = "UPDATE `25a_faktury_prilohy` SET dt_aktualizace = NOW() WHERE faktura_id = ?";
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
            LEFT JOIN `25a_objednavky` o ON f.objednavka_id = o.id
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

        http_response_code(200);
        echo json_encode($faktura);

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
    $objednavka_id = isset($_POST['objednavka_id']) && !empty($_POST['objednavka_id']) ? (int)$_POST['objednavka_id'] : null;
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
            aktivni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)";

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

        $sql_priloha = "INSERT INTO `25a_faktury_prilohy` (
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
            FROM `25a_faktury_prilohy` fp
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
            'search_term', 'cislo_objednavky', 'filter_datum_vystaveni', 'filter_datum_splatnosti',
            'filter_stav', 'filter_vytvoril_uzivatel',
            // Filtry pro částku a přílohy
            'castka_min', 'castka_max', 'filter_ma_prilohy',
            // Filtry pro věcnou kontrolu a předání zaměstnanci
            'filter_vecna_kontrola', 'filter_vecnou_provedl', 'filter_predano_zamestnanec'
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
        
        // 🔥 ADMIN CHECK: SUPERADMIN nebo ADMINISTRATOR = plný přístup (vidí VŠE)
        $is_admin = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
        
        // DEBUG logging
        error_log("Invoices25 LIST: User $user_id roles: " . implode(', ', $user_roles));
        error_log("Invoices25 LIST: User usek_id: " . ($user_usek_id ?: 'NULL') . ", usek_zkr: " . ($user_usek_zkr ?: 'NULL'));
        error_log("Invoices25 LIST: Is admin (SUPERADMIN/ADMINISTRATOR): " . ($is_admin ? 'YES' : 'NO'));

        // USER ISOLATION: non-admin vidí pouze své faktury nebo faktury svých objednávek
        if (!$is_admin) {
            // Najít objednávky uživatele
            $user_orders_sql = "SELECT id FROM `25a_objednavky` WHERE uzivatel_id = ?";
            $user_orders_stmt = $db->prepare($user_orders_sql);
            $user_orders_stmt->execute(array($user_id));
            $user_order_ids = array();
            while ($row = $user_orders_stmt->fetch(PDO::FETCH_ASSOC)) {
                $user_order_ids[] = (int)$row['id'];
            }
            
            if (empty($user_order_ids)) {
                // Uživatel nemá žádné objednávky - vrátit prázdný seznam
                error_log("Invoices25 LIST: User $user_id has NO orders - returning empty list");
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
            
            // Filtr: pouze faktury objednávek uživatele NEBO faktury které vytvořil
            error_log("Invoices25 LIST: User $user_id - applying user isolation (orders: " . count($user_order_ids) . ")");
            $where_conditions[] = '(f.objednavka_id IN (' . implode(',', $user_order_ids) . ') OR f.vytvoril_uzivatel_id = ?)';
            $params[] = $user_id;
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
        
        // Filtr: filter_stav (sloupcový filtr stavu - paid/unpaid/overdue)
        // POZNÁMKA: Toto je sloupcový filtr, ne dashboard filter_status!
        if (isset($filters['filter_stav']) && !empty($filters['filter_stav'])) {
            $filter_stav = trim($filters['filter_stav']);
            switch ($filter_stav) {
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
        
        // Filtr: filter_vytvoril_uzivatel (uživatel který fakturu vytvořil - hledá v celém jméně)
        if (isset($filters['filter_vytvoril_uzivatel']) && trim($filters['filter_vytvoril_uzivatel']) !== '') {
            $search_user = strtolower(trim($filters['filter_vytvoril_uzivatel']));
            $where_conditions[] = '(LOWER(u_vytvoril.jmeno) LIKE ? OR LOWER(u_vytvoril.prijmeni) LIKE ? OR LOWER(CONCAT(u_vytvoril.jmeno, " ", u_vytvoril.prijmeni)) LIKE ? OR LOWER(CONCAT_WS(" ", u_vytvoril.titul_pred, u_vytvoril.jmeno, u_vytvoril.prijmeni, u_vytvoril.titul_za)) LIKE ?)';
            $params[] = '%' . $search_user . '%';
            $params[] = '%' . $search_user . '%';
            $params[] = '%' . $search_user . '%';
            $params[] = '%' . $search_user . '%';
        }
        
        // Filtr: castka_min (minimální částka faktury)
        error_log("Invoices25 LIST: DEBUG castka_min - isset: " . (isset($filters['castka_min']) ? 'YES' : 'NO') . ", value: " . ($filters['castka_min'] ?? 'NULL') . ", is_numeric: " . (isset($filters['castka_min']) && is_numeric($filters['castka_min']) ? 'YES' : 'NO'));
        if (isset($filters['castka_min']) && $filters['castka_min'] !== '' && is_numeric($filters['castka_min'])) {
            $where_conditions[] = 'f.fa_castka >= ?';
            $params[] = (float)$filters['castka_min'];
            error_log("Invoices25 LIST: ✅ Applying castka_min filter = " . (float)$filters['castka_min']);
        }
        
        // Filtr: castka_max (maximální částka faktury)
        error_log("Invoices25 LIST: DEBUG castka_max - isset: " . (isset($filters['castka_max']) ? 'YES' : 'NO') . ", value: " . ($filters['castka_max'] ?? 'NULL') . ", is_numeric: " . (isset($filters['castka_max']) && is_numeric($filters['castka_max']) ? 'YES' : 'NO'));
        if (isset($filters['castka_max']) && $filters['castka_max'] !== '' && is_numeric($filters['castka_max'])) {
            $where_conditions[] = 'f.fa_castka <= ?';
            $params[] = (float)$filters['castka_max'];
            error_log("Invoices25 LIST: ✅ Applying castka_max filter = " . (float)$filters['castka_max']);
        }
        
        // Filtr: filter_ma_prilohy (filtrace podle přítomnosti příloh)
        if (isset($filters['filter_ma_prilohy']) && $filters['filter_ma_prilohy'] !== '') {
            if ((int)$filters['filter_ma_prilohy'] === 1) {
                // Pouze s přílohami
                $where_conditions[] = 'pocet_priloh > 0';
                error_log("Invoices25 LIST: Applying filter_ma_prilohy = 1 (s přílohami)");
            } else if ((int)$filters['filter_ma_prilohy'] === 0) {
                // Pouze bez příloh
                $where_conditions[] = '(pocet_priloh = 0 OR pocet_priloh IS NULL)';
                error_log("Invoices25 LIST: Applying filter_ma_prilohy = 0 (bez příloh)");
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
            // Hledá v celém jméně včetně titulů
            $where_conditions[] = '(LOWER(u_vecna.jmeno) LIKE ? OR LOWER(u_vecna.prijmeni) LIKE ? OR LOWER(CONCAT(u_vecna.jmeno, " ", u_vecna.prijmeni)) LIKE ? OR LOWER(CONCAT_WS(" ", u_vecna.titul_pred, u_vecna.jmeno, u_vecna.prijmeni, u_vecna.titul_za)) LIKE ?)';
            $params[] = '%' . $search_vecna . '%';
            $params[] = '%' . $search_vecna . '%';
            $params[] = '%' . $search_vecna . '%';
            $params[] = '%' . $search_vecna . '%';
        }
        
        // Filtr: filter_predano_zamestnanec (zaměstnanec kterému byla faktura předána)
        if (isset($filters['filter_predano_zamestnanec']) && trim($filters['filter_predano_zamestnanec']) !== '') {
            $search_predano = strtolower(trim($filters['filter_predano_zamestnanec']));
            error_log("Invoices25 LIST: Applying filter_predano_zamestnanec = '$search_predano'");
            // Hledá v celém jméně včetně titulů
            $where_conditions[] = '(LOWER(u_predana.jmeno) LIKE ? OR LOWER(u_predana.prijmeni) LIKE ? OR LOWER(CONCAT(u_predana.jmeno, " ", u_predana.prijmeni)) LIKE ? OR LOWER(CONCAT_WS(" ", u_predana.titul_pred, u_predana.jmeno, u_predana.prijmeni, u_predana.titul_za)) LIKE ?)';
            $params[] = '%' . $search_predano . '%';
            $params[] = '%' . $search_predano . '%';
            $params[] = '%' . $search_predano . '%';
            $params[] = '%' . $search_predano . '%';
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
                    // Moje faktury (které jsem zaevidoval)
                    $where_conditions[] = 'f.vytvoril_uzivatel_id = ?';
                    $params[] = $user_id;
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
                'LOWER(f.fa_typ) LIKE ?'                      // Typ faktury ✅ PŘIDÁNO
            );
            
            // Přidání parametrů pro každou search podmínku
            foreach ($search_conditions as $condition) {
                $params[] = $search_like;
            }
            
            // Spojení všech search podmínek jako OR a přidání jako AND do hlavních podmínek
            $where_conditions[] = '(' . implode(' OR ', $search_conditions) . ')';
            
            error_log("Invoices25 LIST: Applying global search_term = " . $search_term . " (12 fields)");
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
            COUNT(CASE WHEN f.vytvoril_uzivatel_id = $user_id THEN 1 END) as pocet_moje_faktury,
            COALESCE(SUM(CASE WHEN f.vytvoril_uzivatel_id = $user_id THEN f.fa_castka ELSE 0 END), 0) as celkem_moje_faktury
        FROM `$faktury_table` f
        LEFT JOIN `25a_objednavky` o ON f.objednavka_id = o.id
        LEFT JOIN `25_smlouvy` sm ON f.smlouva_id = sm.id
        LEFT JOIN `25_uzivatele` u_vytvoril ON f.vytvoril_uzivatel_id = u_vytvoril.id
        LEFT JOIN `25_uzivatele` u_obj ON o.uzivatel_id = u_obj.id
        LEFT JOIN `25_organizace_vizitka` org ON u_obj.organizace_id = org.id
        LEFT JOIN `25_useky` us_obj ON u_obj.usek_id = us_obj.id
        LEFT JOIN `25_uzivatele` u_vecna ON f.potvrdil_vecnou_spravnost_id = u_vecna.id
        LEFT JOIN `25_uzivatele` u_predana ON f.fa_predana_zam_id = u_predana.id
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
            'celkem_moje_faktury' => (float)$stats['celkem_moje_faktury']
        );
        
        // KROK 2: Načíst samotné záznamy
        $sql = "SELECT 
            f.*,
            o.cislo_objednavky,
            o.uzivatel_id AS objednavka_uzivatel_id,
            sm.cislo_smlouvy,
            sm.nazev_smlouvy,
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
            u_predana.titul_za AS fa_predana_zam_titul_za
        FROM `$faktury_table` f
        LEFT JOIN `25a_objednavky` o ON f.objednavka_id = o.id
        LEFT JOIN `25_smlouvy` sm ON f.smlouva_id = sm.id
        LEFT JOIN `25_uzivatele` u_vytvoril ON f.vytvoril_uzivatel_id = u_vytvoril.id
        LEFT JOIN `25_uzivatele` u_obj ON o.uzivatel_id = u_obj.id
        LEFT JOIN `25_organizace_vizitka` org ON u_obj.organizace_id = org.id
        LEFT JOIN `25_useky` us_obj ON u_obj.usek_id = us_obj.id
        LEFT JOIN `25a_faktury_prilohy` prilohy ON f.id = prilohy.faktura_id
        LEFT JOIN `25_ciselnik_stavy` s ON s.typ_objektu = 'FAKTURA' AND s.kod_stavu = f.fa_typ
        LEFT JOIN `25_uzivatele` u_vecna ON f.potvrdil_vecnou_spravnost_id = u_vecna.id
        LEFT JOIN `25_uzivatele` u_predana ON f.fa_predana_zam_id = u_predana.id
        WHERE $where_sql
        GROUP BY f.id
        ORDER BY f.fa_datum_vystaveni DESC, f.id DESC";
        
        // Přidat LIMIT pouze pokud FE požaduje stránkování
        if ($use_pagination) {
            $sql .= " LIMIT $per_page OFFSET $offset";
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $faktury = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
                $vytvoril_jmeno_zkracene = trim($faktura['vytvoril_prijmeni'] . ' ' . substr($faktura['vytvoril_jmeno'], 0, 1) . '.');
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
                $potvrdil_vecnou_spravnost_zkracene = trim($faktura['potvrdil_vecnou_spravnost_prijmeni'] . ' ' . substr($faktura['potvrdil_vecnou_spravnost_jmeno'], 0, 1) . '.');
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
                p.dt_vytvoreni,
                p.dt_aktualizace,
                u.jmeno AS nahrano_jmeno,
                u.prijmeni AS nahrano_prijmeni,
                u.titul_pred AS nahrano_titul_pred,
                u.titul_za AS nahrano_titul_za,
                u.email AS nahrano_email,
                u.telefon AS nahrano_telefon
            FROM `25a_faktury_prilohy` p
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
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'faktury' => $faktury,
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total_count,
                'total_pages' => $total_pages
            ),
            'statistiky' => $statistiky,
            '_debug' => array(
                'filters_received' => $filters,
                'castka_min_applied' => isset($filters['castka_min']) ? 'YES (' . $filters['castka_min'] . ')' : 'NO',
                'castka_max_applied' => isset($filters['castka_max']) ? 'YES (' . $filters['castka_max'] . ')' : 'NO'
            ),
            'user_info' => array(
                'user_id' => $user_id,
                'is_admin' => $is_admin,
                'roles' => $user_roles,
                'usek_id' => $user_usek_id,
                'usek_zkr' => $user_usek_zkr,
                'filter_applied' => !$is_admin
            )
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání faktur: ' . $e->getMessage()));
    }
}


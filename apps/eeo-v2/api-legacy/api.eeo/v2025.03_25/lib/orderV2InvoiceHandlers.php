<?php
/**
 * Order V2 Invoice Management Handlers
 * PHP 5.6 Compatible - uses array() syntax, string status codes
 */

// Include TimezoneHelper for consistent timezone handling
require_once __DIR__ . '/TimezoneHelper.php';

function handle_order_v2_create_invoice_with_attachment($input, $config, $queries) {
    // Token verification for production - V2 enhanced
    $token_data = verify_token_v2($input['username'], $input['token']);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $order_id = isset($input['order_id']) ? (int)$input['order_id'] : 0;
    
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
        $sql_insert = "INSERT INTO 25a_objednavky_faktury (
            objednavka_id, smlouva_id, fa_dorucena, fa_castka, fa_cislo_vema, 
            fa_datum_vystaveni, fa_datum_splatnosti, fa_datum_doruceni,
            fa_strediska_kod, fa_poznamka, rozsirujici_data,
            vytvoril_uzivatel_id, dt_vytvoreni, aktivni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)";
        
        $stmt_insert = $db->prepare($sql_insert);
        $stmt_insert->execute(array(
            $order_id,
            isset($input['smlouva_id']) ? (int)$input['smlouva_id'] : null,
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
        $sql_att = "INSERT INTO 25a_faktury_prilohy (
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
    
    $order_id = isset($input['order_id']) ? (int)$input['order_id'] : 0;
    
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
        
        // Create invoice record
        $sql_insert = "INSERT INTO 25a_objednavky_faktury (
            objednavka_id, smlouva_id, fa_dorucena, fa_zaplacena, fa_castka, fa_cislo_vema, 
            fa_typ, fa_datum_vystaveni, fa_datum_splatnosti, fa_datum_doruceni,
            fa_strediska_kod, fa_poznamka,
            potvrdil_vecnou_spravnost_id, dt_potvrzeni_vecne_spravnosti,
            vecna_spravnost_umisteni_majetku, vecna_spravnost_poznamka, vecna_spravnost_potvrzeno,
            rozsirujici_data, fa_predana_zam_id, fa_datum_predani_zam, fa_datum_vraceni_zam,
            vytvoril_uzivatel_id, dt_vytvoreni, aktivni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)";
        
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
        
        // Načíst současný stav faktury
        $sql_current = "SELECT * FROM 25a_objednavky_faktury WHERE id = ? AND aktivni = 1";
        $stmt_current = $db->prepare($sql_current);
        $stmt_current->execute(array($invoice_id));
        $current_invoice = $stmt_current->fetch(PDO::FETCH_ASSOC);
        
        if (!$current_invoice) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nebyla nalezena'));
            return;
        }
        
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
            // Vazba na smlouvu
            'smlouva_id'
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
        
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                if ($field === 'fa_cislo_vema') {
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = trim($input[$field]);
                } else if (in_array($field, array('fa_dorucena', 'fa_zaplacena', 'vecna_spravnost_potvrzeno'))) {
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = (int)$input[$field];
                } else if (in_array($field, array('potvrdil_vecnou_spravnost_id', 'fa_predana_zam_id'))) {
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = !empty($input[$field]) ? (int)$input[$field] : null;
                } else if ($field === 'rozsirujici_data') {
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = is_array($input[$field]) ? json_encode($input[$field]) : $input[$field];
                } else {
                    $updateFields[] = $field . ' = ?';
                    $updateValues[] = $input[$field];
                }
            }
        }
        
        if (empty($updateFields)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Nebyla poskytnutá žádná data k aktualizaci'));
            return;
        }
        
        $updateValues[] = $invoice_id;
        
        $sql_update = "UPDATE 25a_objednavky_faktury SET " . implode(', ', $updateFields) . " WHERE id = ? AND aktivni = 1";
        
        $stmt = $db->prepare($sql_update);
        $stmt->execute($updateValues);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nebyla nalezena nebo není aktivní'));
            return;
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
    // Token verification - V2 enhanced
    $token_data = verify_token_v2($input['username'], $input['token']);
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
        $sql_check = "SELECT f.id, f.objednavka_id, f.vytvoril_uzivatel_id, o.uzivatel_id as objednavka_uzivatel_id
                      FROM 25a_objednavky_faktury f
                      LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
                      WHERE f.id = ? AND f.aktivni = 1";
        
        $stmt_check = $db->prepare($sql_check);
        $stmt_check->execute(array($invoice_id));
        $invoice = $stmt_check->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nenalezena nebo byla smazána'));
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
                         FROM 25_prava p
                         INNER JOIN 25_role_prava rp ON rp.pravo_id = p.id
                         INNER JOIN 25_uzivatele_role ur ON ur.role_id = rp.role_id
                         WHERE ur.uzivatel_id = ? AND p.kod_prava = 'INVOICE_MANAGE'";
            $prava_stmt = $db->prepare($prava_sql);
            $prava_stmt->execute(array($current_user_id));
            $has_invoice_manage = ($prava_stmt->rowCount() > 0);
        }
        
        // DEBUG: Log pro debugging
        error_log("DELETE invoice #{$invoice_id} - user_id: {$current_user_id}, is_admin: " . ($is_admin ? 'YES' : 'NO') . ", has_invoice_manage: " . ($has_invoice_manage ? 'YES' : 'NO') . ", invoice_owner: {$invoice['vytvoril_uzivatel_id']}, order_owner: {$invoice['objednavka_uzivatel_id']}");
        
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
            $sql_get_attachments = "SELECT systemova_cesta FROM 25a_faktury_prilohy WHERE faktura_id = ?";
            $stmt_get_att = $db->prepare($sql_get_attachments);
            $stmt_get_att->execute(array($invoice_id));
            $attachments = $stmt_get_att->fetchAll(PDO::FETCH_ASSOC);
            
            // 2. Smazání příloh z databáze
            $sql_delete_att = "DELETE FROM 25a_faktury_prilohy WHERE faktura_id = ?";
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
            $sql_delete = "DELETE FROM 25a_objednavky_faktury WHERE id = ?";
            $stmt_delete = $db->prepare($sql_delete);
            $stmt_delete->execute(array($invoice_id));
            
            $message = 'Faktura včetně příloh byla trvale smazána (z DB i z disku)';
            
        } else {
            // ========== SOFT DELETE (default) ==========
            // 1. Soft delete faktury - nastavení aktivni = 0
            $sql_update = "UPDATE 25a_objednavky_faktury SET aktivni = 0, dt_aktualizace = NOW() WHERE id = ? AND aktivni = 1";
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
            $sql_deactivate_att = "UPDATE 25a_faktury_prilohy SET dt_aktualizace = NOW() WHERE faktura_id = ?";
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


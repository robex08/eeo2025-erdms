<?php
/**
 * Invoice Attachment Handlers - ORDER-V2 API
 * PHP 5.6 kompatibilní, MySQL 5.5.43
 * 
 * Endpointy pro frontend InvoiceAttachmentsCompact komponentu
 * 
 * @author Senior PHP Developer
 * @date 2025-11-12
 */

/**
 * POST /order-v2/invoices/{invoice_id}/attachments
 * Seznam příloh faktury
 * 
 * Request: {username, token, order_id}
 * Response: {success: true, data: {attachments: [...], count: N}}
 */
function handle_order_v2_list_invoice_attachments($input, $config, $queries) {
    // Validace parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    $order_id = isset($input['order_id']) ? (int)$input['order_id'] : 0;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí povinné parametry: username nebo token'
        ));
        return;
    }
    
    if ($invoice_id <= 0) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí nebo je neplatné invoice_id'
        ));
        return;
    }

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('success' => false, 'error' => 'Neplatný token'));
        return;
    }
    
    if ($token_data['username'] !== $username) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'error' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(array('success' => false, 'error' => 'Chyba připojení k databázi'));
            return;
        }

        // SQL dotaz - načíst přílohy faktury
        // ✅ OPRAVENO: Odstraněn LEFT JOIN na neexistující tabulku slovníku
        $sql = "SELECT 
            fp.id,
            fp.faktura_id,
            fp.objednavka_id,
            fp.guid,
            fp.typ_prilohy,
            fp.originalni_nazev_souboru,
            fp.systemova_cesta,
            fp.velikost_souboru_b,
            fp.je_isdoc,
            fp.isdoc_parsed,
            fp.isdoc_data_json,
            fp.nahrano_uzivatel_id,
            fp.dt_vytvoreni,
            fp.dt_aktualizace
        FROM `25a_faktury_prilohy` fp
        WHERE fp.faktura_id = ?";
        
        // Přidat filtr podle objednávky pokud je zadáno
        if ($order_id > 0) {
            $sql .= " AND fp.objednavka_id = ?";
        }
        
        $sql .= " ORDER BY fp.dt_vytvoreni ASC";
        
        $stmt = $db->prepare($sql);
        if ($order_id > 0) {
            $stmt->execute(array($invoice_id, $order_id));
        } else {
            $stmt->execute(array($invoice_id));
        }
        
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Formátovat data pro frontend - POUZE snake_case podle požadavku FE
        $formatted_attachments = array();
        foreach ($attachments as $att) {
            // Kontrola existence souboru na disku
            // systemova_cesta může být absolutní (začíná /) nebo relativní
            $systemova_cesta = $att['systemova_cesta'];
            if (substr($systemova_cesta, 0, 1) === '/') {
                // Absolutní cesta
                $file_path = $systemova_cesta;
            } else {
                // Relativní cesta - přidej DOCUMENT_ROOT
                $file_path = $_SERVER['DOCUMENT_ROOT'] . '/' . $systemova_cesta;
            }
            $file_exists = file_exists($file_path);
            
            $formatted_attachments[] = array(
                'id' => (int)$att['id'],
                'faktura_id' => (int)$att['faktura_id'],
                'objednavka_id' => (int)$att['objednavka_id'],
                'guid' => $att['guid'],
                'typ_prilohy' => $att['typ_prilohy'],
                'originalni_nazev_souboru' => $att['originalni_nazev_souboru'],
                'systemova_cesta' => $att['systemova_cesta'],
                'velikost_souboru_b' => (int)$att['velikost_souboru_b'],
                'je_isdoc' => (int)$att['je_isdoc'],
                'isdoc_parsed' => (int)$att['isdoc_parsed'],
                'isdoc_data_json' => $att['isdoc_data_json'],
                'nahrano_uzivatel_id' => (int)$att['nahrano_uzivatel_id'],
                'dt_vytvoreni' => $att['dt_vytvoreni'],
                'dt_aktualizace' => $att['dt_aktualizace'],
                'file_exists' => $file_exists
            );
        }

        // Response ve formátu, který frontend očekává
        http_response_code(200);
        echo json_encode(array(
            'success' => true,
            'data' => array(
                'attachments' => $formatted_attachments,
                'count' => count($formatted_attachments)
            )
        ));

    } catch (Exception $e) {
        error_log("handle_order_v2_list_invoice_attachments error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chyba při načítání příloh: ' . $e->getMessage()
        ));
    }
}

/**
 * POST /order-v2/invoices/{invoice_id}/attachments/upload
 * Upload přílohy faktury
 * 
 * Request: multipart/form-data {file, username, token, order_id, typ_prilohy}
 * Response: {success: true, message: "...", priloha: {...}}
 */
function handle_order_v2_upload_invoice_attachment($input, $config, $queries) {
    // Validace parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    $order_id = isset($input['order_id']) ? (int)$input['order_id'] : 0;
    $typ_prilohy = isset($input['typ_prilohy']) ? $input['typ_prilohy'] : 'FAKTURA';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí povinné parametry: username nebo token'
        ));
        return;
    }
    
    if ($invoice_id <= 0) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí nebo je neplatné invoice_id'
        ));
        return;
    }
    
    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí nebo je neplatné order_id (povinné)'
        ));
        return;
    }
    
    // Kontrola, zda byl nahrán soubor
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Nebyl nahrán žádný soubor nebo došlo k chybě při uploadu'
        ));
        return;
    }

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('success' => false, 'error' => 'Neplatný token'));
        return;
    }
    
    if ($token_data['username'] !== $username) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'error' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(array('success' => false, 'error' => 'Chyba připojení k databázi'));
            return;
        }
        
        // Získat ID uživatele
        $stmt = $db->prepare("SELECT id FROM `25_uzivatele` WHERE username = ? LIMIT 1");
        $stmt->execute(array($username));
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            http_response_code(404);
            echo json_encode(array('success' => false, 'error' => 'Uživatel nenalezen'));
            return;
        }
        $user_id = (int)$user['id'];

        // Informace o souboru
        $file = $_FILES['file'];
        $original_filename = basename($file['name']);
        $file_size = (int)$file['size'];
        $file_tmp_path = $file['tmp_name'];
        
        // Validace typu souboru
        $allowed_extensions = array('pdf', 'isdoc', 'jpg', 'jpeg', 'png', 'xls', 'xlsx', 'doc', 'docx');
        $file_extension = strtolower(pathinfo($original_filename, PATHINFO_EXTENSION));
        
        if (!in_array($file_extension, $allowed_extensions)) {
            http_response_code(400);
            echo json_encode(array(
                'success' => false,
                'error' => 'Nepodporovaný typ souboru. Povolené typy: PDF, ISDOC, JPG, PNG, XLS, XLSX, DOC, DOCX'
            ));
            return;
        }
        
        // Validace velikosti (max 10 MB)
        $max_file_size = 10 * 1024 * 1024; // 10 MB
        if ($file_size > $max_file_size) {
            http_response_code(400);
            echo json_encode(array(
                'success' => false,
                'error' => 'Soubor je příliš velký. Maximální velikost je 10 MB'
            ));
            return;
        }
        
        // Detekce ISDOC
        $je_isdoc = ($file_extension === 'isdoc') ? 1 : 0;
        
        // Automatická klasifikace typu přílohy pokud není zadán
        if (empty($typ_prilohy) || $typ_prilohy === 'FAKTURA') {
            if ($je_isdoc) {
                $typ_prilohy = 'ISDOC';
            } else {
                $typ_prilohy = 'FAKTURA';
            }
        }
        
        // GUID: Použij GUID od FE pokud existuje, jinak vygeneruj nový (stejně jako u OBJ příloh)
        $systemovy_guid = isset($input['guid']) && !empty($input['guid']) 
            ? $input['guid'] 
            : generate_order_v2_file_guid();
        
        // PREFIX: Pro faktury vždy 'fa-' (na rozdíl od 'obj-' u objednávek)
        $file_prefix = 'fa-';
        
        // Získání upload cesty (stejná jako pro objednávky)
        $uploadPath = get_order_v2_upload_path($config, $order_id, $user_id);
        
        // Vytvoření adresáře pokud neexistuje
        if (!is_dir($uploadPath)) {
            if (!mkdir($uploadPath, 0755, true)) {
                http_response_code(500);
                echo json_encode(array('success' => false, 'error' => 'Nelze vytvořit upload adresář'));
                return;
            }
        }
        
        // Název souboru s prefixem fa- a guid (který už obsahuje datum YYYY-MM-DD)
        // Formát: fa-2025-11-01_abc123def456.ext
        $finalFileName = $file_prefix . $systemovy_guid . ($file_extension ? '.' . $file_extension : '');
        $destination_path = $uploadPath . $finalFileName;
        
        // Relativní cesta pro DB (bez DOCUMENT_ROOT)
        $relative_path = str_replace($_SERVER['DOCUMENT_ROOT'] . '/', '', $destination_path);
        
        // Přesunout soubor
        if (!move_uploaded_file($file_tmp_path, $destination_path)) {
            http_response_code(500);
            echo json_encode(array(
                'success' => false,
                'error' => 'Chyba při ukládání souboru na server'
            ));
            return;
        }
        
        // Uložit do databáze
        $sql = "INSERT INTO `25a_faktury_prilohy` (
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
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            $invoice_id,
            $order_id,
            $systemovy_guid,
            $typ_prilohy,
            $original_filename,
            $relative_path,
            $file_size,
            $je_isdoc,
            $user_id
        ));
        
        $priloha_id = (int)$db->lastInsertId();
        
        // Vrátit response
        http_response_code(200);
        echo json_encode(array(
            'success' => true,
            'message' => 'Příloha faktury byla úspěšně nahrána',
            'priloha' => array(
                'id' => $priloha_id,
                'faktura_id' => $invoice_id,
                'objednavka_id' => $order_id,
                'guid' => $systemovy_guid,
                'typ_prilohy' => $typ_prilohy,
                'originalni_nazev_souboru' => $original_filename,
                'systemova_cesta' => $relative_path,
                'velikost_souboru_b' => $file_size,
                'je_isdoc' => $je_isdoc,
                'nahrano_uzivatel_id' => $user_id,
                'dt_vytvoreni' => date('Y-m-d H:i:s')
            )
        ));

    } catch (Exception $e) {
        error_log("handle_order_v2_upload_invoice_attachment error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chyba při uploadu přílohy: ' . $e->getMessage()
        ));
    }
}

/**
 * DELETE /order-v2/invoices/{invoice_id}/attachments/{attachment_id}
 * Smazání přílohy faktury
 * 
 * Request: {username, token}
 * Response: {success: true, message: "..."}
 */
function handle_order_v2_delete_invoice_attachment($input, $config, $queries) {
    // Validace parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    $attachment_id = isset($input['attachment_id']) ? (int)$input['attachment_id'] : 0;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí povinné parametry: username nebo token'
        ));
        return;
    }
    
    if ($invoice_id <= 0 || $attachment_id <= 0) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí nebo je neplatné invoice_id nebo attachment_id'
        ));
        return;
    }

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('success' => false, 'error' => 'Neplatný token'));
        return;
    }
    
    if ($token_data['username'] !== $username) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'error' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(array('success' => false, 'error' => 'Chyba připojení k databázi'));
            return;
        }

        // Načíst přílohu pro získání cesty k souboru
        $sql = "SELECT systemova_cesta FROM `25a_faktury_prilohy` 
                WHERE id = ? AND faktura_id = ? LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute(array($attachment_id, $invoice_id));
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attachment) {
            http_response_code(404);
            echo json_encode(array(
                'success' => false,
                'error' => 'Příloha nenalezena'
            ));
            return;
        }
        
        // Smazat fyzický soubor z disku
        $systemova_cesta = $attachment['systemova_cesta'];
        if (substr($systemova_cesta, 0, 1) === '/') {
            $file_path = $systemova_cesta;
        } else {
            $file_path = $_SERVER['DOCUMENT_ROOT'] . '/' . $systemova_cesta;
        }
        if (file_exists($file_path)) {
            if (!unlink($file_path)) {
                error_log("Chyba při mazání souboru: " . $file_path);
                // Pokračujeme dál a smažeme záznam z DB i tak
            }
        }
        
        // Smazat záznam z databáze
        $sql = "DELETE FROM `25a_faktury_prilohy` WHERE id = ? AND faktura_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute(array($attachment_id, $invoice_id));
        
        http_response_code(200);
        echo json_encode(array(
            'success' => true,
            'message' => 'Příloha byla úspěšně smazána'
        ));

    } catch (Exception $e) {
        error_log("handle_order_v2_delete_invoice_attachment error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chyba při mazání přílohy: ' . $e->getMessage()
        ));
    }
}

/**
 * POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/download
 * Download přílohy faktury
 * 
 * Request: {username, token}
 * Response: Binary file download
 */
function handle_order_v2_download_invoice_attachment($input, $config, $queries) {
    // Validace parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    $attachment_id = isset($input['attachment_id']) ? (int)$input['attachment_id'] : 0;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí povinné parametry: username nebo token'
        ));
        return;
    }
    
    if ($invoice_id <= 0 || $attachment_id <= 0) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí nebo je neplatné invoice_id nebo attachment_id'
        ));
        return;
    }

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('success' => false, 'error' => 'Neplatný token'));
        return;
    }
    
    if ($token_data['username'] !== $username) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'error' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(array('success' => false, 'error' => 'Chyba připojení k databázi'));
            return;
        }

        // Načíst přílohu
        $sql = "SELECT originalni_nazev_souboru, systemova_cesta 
                FROM `25a_faktury_prilohy` 
                WHERE id = ? AND faktura_id = ? LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute(array($attachment_id, $invoice_id));
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attachment) {
            http_response_code(404);
            echo json_encode(array(
                'success' => false,
                'error' => 'Příloha nenalezena'
            ));
            return;
        }
        
        // Sestavit absolutní cestu k souboru
        $systemova_cesta = $attachment['systemova_cesta'];
        if (substr($systemova_cesta, 0, 1) === '/') {
            $file_path = $systemova_cesta;
        } else {
            $file_path = $_SERVER['DOCUMENT_ROOT'] . '/' . $systemova_cesta;
        }
        
        // Kontrola existence souboru
        if (!file_exists($file_path)) {
            // ✅ Uživatelsky přívětivá chybová zpráva
            $errorMsg = 'Nepodařilo se stáhnout přílohu faktury "' . $attachment['originalni_nazev_souboru'] . '". ';
            $errorMsg .= 'Soubor nebyl nalezen na serveru (chybí fyzický soubor). ';
            $errorMsg .= 'Příloha mohla být odstraněna, přesunuta nebo se nepodařilo její nahrání. ';
            $errorMsg .= 'Pro obnovení přílohy kontaktujte prosím administrátora.';
            
            // Log pro administrátora s plnou cestou
            error_log('PŘÍLOHA FAKTURY NENALEZENA (Order V2): ' . $file_path . ' (attachment_id: ' . $attachment_id . ', invoice_id: ' . $invoice_id . ', original: ' . $attachment['originalni_nazev_souboru'] . ')');
            
            http_response_code(404);
            echo json_encode(array(
                'success' => false,
                'error' => $errorMsg,
                'original_filename' => $attachment['originalni_nazev_souboru'],
                'missing_file' => basename($file_path)
            ));
            return;
        }
        
        // Odeslat soubor
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $attachment['originalni_nazev_souboru'] . '"');
        header('Content-Length: ' . filesize($file_path));
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        
        readfile($file_path);
        exit;

    } catch (Exception $e) {
        error_log("handle_order_v2_download_invoice_attachment error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chyba při stahování přílohy: ' . $e->getMessage()
        ));
    }
}

/**
 * PUT /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update
 * Aktualizace metadat přílohy faktury
 * 
 * Request: {username, token, type, original_name}
 * Response: {success: true, message: "...", attachment: {...}}
 */
function handle_order_v2_update_invoice_attachment($input, $config, $queries) {
    // Validace parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    $attachment_id = isset($input['attachment_id']) ? (int)$input['attachment_id'] : 0;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí povinné parametry: username nebo token'
        ));
        return;
    }
    
    if ($invoice_id <= 0 || $attachment_id <= 0) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí nebo je neplatné invoice_id nebo attachment_id'
        ));
        return;
    }

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('success' => false, 'error' => 'Neplatný token'));
        return;
    }
    
    if ($token_data['username'] !== $username) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'error' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(array('success' => false, 'error' => 'Chyba připojení k databázi'));
            return;
        }

        // Sestavit UPDATE dotaz
        $update_fields = array();
        $update_values = array();
        
        if (isset($input['type']) && !empty($input['type'])) {
            $update_fields[] = "typ_prilohy = ?";
            $update_values[] = $input['type'];
        }
        
        if (isset($input['original_name']) && !empty($input['original_name'])) {
            $update_fields[] = "originalni_nazev_souboru = ?";
            $update_values[] = $input['original_name'];
        }
        
        if (empty($update_fields)) {
            http_response_code(400);
            echo json_encode(array(
                'success' => false,
                'error' => 'Nebyla zadána žádná data k aktualizaci'
            ));
            return;
        }
        
        // Přidat dt_aktualizace
        $update_fields[] = "dt_aktualizace = NOW()";
        
        // Přidat WHERE podmínky
        $update_values[] = $attachment_id;
        $update_values[] = $invoice_id;
        
        $sql = "UPDATE `25a_faktury_prilohy` 
                SET " . implode(', ', $update_fields) . " 
                WHERE id = ? AND faktura_id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($update_values);
        
        // Ověřit, že záznam byl aktualizován
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(array(
                'success' => false,
                'error' => 'Příloha nenalezena nebo nebyla změněna'
            ));
            return;
        }
        
        // Načíst aktualizovanou přílohu
        $sql = "SELECT * FROM `25a_faktury_prilohy` WHERE id = ? LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute(array($attachment_id));
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode(array(
            'success' => true,
            'message' => 'Příloha byla aktualizována',
            'attachment' => array(
                'id' => (int)$attachment['id'],
                'typ_prilohy' => $attachment['typ_prilohy'],
                'originalni_nazev_souboru' => $attachment['originalni_nazev_souboru']
            )
        ));

    } catch (Exception $e) {
        error_log("handle_order_v2_update_invoice_attachment error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chyba při aktualizaci přílohy: ' . $e->getMessage()
        ));
    }
}

/**
 * POST /order-v2/invoices/{invoice_id}/attachments/verify
 * Kontrola fyzické existence všech souborů přílohy faktury
 * 
 * Request: {username, token, objednavka_id}
 * Response: {success: true, summary: {...}, attachments: [...]}
 */
function handle_order_v2_verify_invoice_attachments($input, $config, $queries) {
    // Validace parametrů
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí povinné parametry: username nebo token'
        ));
        return;
    }
    
    if ($invoice_id <= 0) {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chybí nebo je neplatné invoice_id'
        ));
        return;
    }

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('success' => false, 'error' => 'Neplatný token'));
        return;
    }
    
    if ($token_data['username'] !== $username) {
        http_response_code(403);
        echo json_encode(array('success' => false, 'error' => 'Neautorizovaný přístup'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(array('success' => false, 'error' => 'Chyba připojení k databázi'));
            return;
        }

        // Načíst všechny přílohy faktury
        $sql = "SELECT id, guid, systemova_cesta, originalni_nazev_souboru
                FROM `25a_faktury_prilohy` 
                WHERE faktura_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute(array($invoice_id));
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Kontrola existence každého souboru
        $result = array();
        $missing = 0;
        
        foreach ($attachments as $att) {
            // Sestavit absolutní cestu - systemova_cesta může být:
            // 1. Absolutní cesta (začíná /) - použij přímo
            // 2. Relativní cesta (nezačíná /) - přidej DOCUMENT_ROOT
            $systemova_cesta = $att['systemova_cesta'];
            if (substr($systemova_cesta, 0, 1) === '/') {
                // Absolutní cesta
                $file_path = $systemova_cesta;
            } else {
                // Relativní cesta - přidej DOCUMENT_ROOT
                $file_path = $_SERVER['DOCUMENT_ROOT'] . '/' . $systemova_cesta;
            }
            
            $exists = file_exists($file_path);
            
            if (!$exists) {
                $missing++;
            }
            
            $result[] = array(
                'attachment_id' => (int)$att['id'],
                'guid' => $att['guid'],
                'systemova_cesta' => $att['systemova_cesta'],
                'checked_path' => $file_path,
                'originalni_nazev_souboru' => $att['originalni_nazev_souboru'],
                'file_exists' => $exists,
                'status' => $exists ? 'OK' : 'MISSING_FILE'
            );
        }
        
        http_response_code(200);
        echo json_encode(array(
            'success' => true,
            'summary' => array(
                'total_attachments' => count($attachments),
                'existing_files' => count($attachments) - $missing,
                'missing_files' => $missing
            ),
            'attachments' => $result
        ));

    } catch (Exception $e) {
        error_log("handle_order_v2_verify_invoice_attachments error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'success' => false,
            'error' => 'Chyba při verifikaci příloh: ' . $e->getMessage()
        ));
    }
}

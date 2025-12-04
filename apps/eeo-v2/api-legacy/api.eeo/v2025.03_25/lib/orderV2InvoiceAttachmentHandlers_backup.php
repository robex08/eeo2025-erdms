<?php
/**
 * Order V2 Invoice Attachment Handlers - Správa příloh faktur
 * 
 * Implementuje attachment operace pro faktury v Order V2 API:
 * - Upload příloh k fakturám
 * - Download příloh faktur
 * - Listing příloh faktur
 * - Mazání příloh faktur
 * 
 * Kompatibilita: PHP 5.6+ / MySQL 5.5.43+
 * 
 * @author Senior Developer
 * @date 30. října 2025
 */

require_once __DIR__ . '/orderQueries.php';
require_once __DIR__ . '/dbconfig.php';

// Include necessary functions from handlers.php
if (!function_exists('verify_token')) {
    require_once __DIR__ . '/handlers.php';
}
if (!function_exists('get_db')) {
    require_once __DIR__ . '/handlers.php';
}

// ========== HELPER FUNCTIONS PRO INVOICE ATTACHMENTS ==========

/**
 * Získání upload cesty pro Order V2 invoice attachments
 * PHP 5.6 compatible
 */
function get_order_v2_invoice_upload_path($config, $faktura_id, $user_id) {
    // Načtení upload konfigurace
    $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
    
    // Základní cesta - preferuj root_path, jinak fallback
    $basePath = '';
    if (isset($uploadConfig['root_path']) && !empty($uploadConfig['root_path']) && is_dir($uploadConfig['root_path'])) {
        $basePath = $uploadConfig['root_path'];
    } elseif (isset($uploadConfig['relative_path']) && !empty($uploadConfig['relative_path'])) {
        $basePath = $uploadConfig['relative_path'];
    } else {
        // Fallback - použij hardcoded cestu pro tento projekt
        $basePath = '/var/www/eeo2025/doc/prilohy/';
    }
    
    // Přidání lomítka na konec pokud chybí
    if (substr($basePath, -1) !== '/') {
        $basePath .= '/';
    }
    
    // Struktura adresářů - Order V2 invoice má vlastní strukturu
    $subPath = 'order-v2/invoices/';
    
    // Podle data pro organizaci
    $subPath .= date('Y') . '/' . date('m') . '/';
    
    // Podle faktury pro separaci
    $subPath .= 'invoice_' . $faktura_id . '/';
    
    return $basePath . $subPath;
}

/**
 * Funkce pro název tabulky faktur příloh (zatím stejná jako order attachments)
 */
// Odstraněno - používáme globální funkci z orderQueries.php

// ========== ORDER V2 INVOICE ATTACHMENT HANDLERS ==========

/**
 * POST /order-v2/invoices/{invoice_id}/attachments/upload
 * Upload přílohy k faktuře
 * PHP 5.6 + MySQL 5.5.43 compatible
 */
function handle_order_v2_upload_invoice_attachment($input, $config, $queries) {
    // Token authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? $input['invoice_id'] : '';
    $order_id = isset($input['order_id']) ? $input['order_id'] : ''; // Pro kontrolu přístupu
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if ($invoice_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID faktury'));
        return;
    }
    
    // Kontrola uploaded file
    if (!isset($_FILES['file']) || empty($_FILES['file']['name'])) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí soubor k nahrání'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Kontrola existence faktury a její příslušnosti k objednávce
        $sql = "SELECT f.id, f.objednavka_id, o.id as order_exists 
                FROM " . get_invoices_table_name() . " f
                INNER JOIN " . get_orders_table_name() . " o ON f.objednavka_id = o.id
                WHERE f.id = :invoice_id AND o.aktivni = 1";
        
        if ($order_id > 0) {
            $sql .= " AND f.objednavka_id = :order_id";
        }
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':invoice_id', $invoice_id, PDO::PARAM_INT);
        if ($order_id > 0) {
            $stmt->bindValue(':order_id', $order_id, PDO::PARAM_INT);
        }
        $stmt->execute();
        
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$invoice) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nebyla nalezena nebo nepatří k aktivní objednávce'));
            return;
        }
        
        $actual_order_id = $invoice['objednavka_id'];
        
        // Validace uploaded file (použijeme stejnou funkci jako pro objednávky)
        // Include orderV2AttachmentHandlers.php pro helper funkce
        require_once __DIR__ . '/orderV2AttachmentHandlers.php';
        $validation = validate_order_v2_file_upload($config, $_FILES['file']);
        if (isset($validation['error'])) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => $validation['error']));
            return;
        }
        
        // Příprava dat pro uložení
        $originalni_nazev = $_FILES['file']['name'];
        $velikost = $_FILES['file']['size'];
        $systemovy_guid = generate_order_v2_file_guid(); // Použijeme stejnou funkci
        $typ_prilohy = isset($input['typ_prilohy']) ? $input['typ_prilohy'] : 'fa'; // default: faktura
        
        // Získání upload cesty
        $uploadPath = get_order_v2_invoice_upload_path($config, $invoice_id, $token_data['id']);
        
        // Vytvoření adresáře pokud neexistuje
        if (!is_dir($uploadPath)) {
            if (!mkdir($uploadPath, 0755, true)) {
                http_response_code(500);
                echo json_encode(array('status' => 'error', 'message' => 'Nelze vytvořit upload adresář'));
                return;
            }
        }
        
        // Cesta k finálnímu souboru
        $fileExt = $validation['extension'];
        $finalFileName = $systemovy_guid . ($fileExt ? '.' . $fileExt : '');
        $systemova_cesta = $uploadPath . $finalFileName;
        
        // Přesun souboru
        if (!move_uploaded_file($_FILES['file']['tmp_name'], $systemova_cesta)) {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => 'Nelze uložit soubor'));
            return;
        }
        
        // Uložení do databáze (do invoice attachments tabulky)
        $insertSql = "INSERT INTO " . get_invoice_attachments_table_name() . " (
            faktura_id, objednavka_id, guid, typ_prilohy, originalni_nazev_souboru, 
            systemova_cesta, velikost_souboru_b, nahrano_uzivatel_id
        ) VALUES (
            :faktura_id, :objednavka_id, :guid, :typ_prilohy, :originalni_nazev_souboru, 
            :systemova_cesta, :velikost_souboru_b, :nahrano_uzivatel_id
        )";
        
        $stmt = $db->prepare($insertSql);
        $stmt->execute(array(
            ':faktura_id' => $invoice_id,
            ':objednavka_id' => $actual_order_id,
            ':guid' => $systemovy_guid,
            ':typ_prilohy' => $typ_prilohy,
            ':originalni_nazev_souboru' => $originalni_nazev,
            ':systemova_cesta' => $systemova_cesta,
            ':velikost_souboru_b' => $velikost,
            ':nahrano_uzivatel_id' => $token_data['id']
        ));
        
        $attachment_id = $db->lastInsertId();
        
        // Úspěšná odpověď
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'attachment_id' => $attachment_id,
                'invoice_id' => $invoice_id,
                'order_id' => $actual_order_id,
                'original_name' => $originalni_nazev,
                'system_guid' => $systemovy_guid,
                'file_size' => $velikost,
                'type' => $typ_prilohy,
                'upload_path' => $finalFileName // Relativní cesta pro FE
            ),
            'message' => 'Příloha faktury byla úspěšně nahrána',
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'upload-invoice-attachment',
                'timestamp' => TimezoneHelper::getApiTimestamp(),
                'compatibility' => 'PHP 5.6 + MySQL 5.5.43'
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 UPLOAD INVOICE ATTACHMENT Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při nahrávání přílohy faktury: ' . $e->getMessage()));
    }
}

/**
 * GET /order-v2/invoices/{invoice_id}/attachments
 * Seznam příloh faktury
 */
function handle_order_v2_list_invoice_attachments($input, $config, $queries) {
    // Auth stejně jako ostatní V2 endpointy
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if ($invoice_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID faktury'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Kontrola faktury
        $checkSql = "SELECT f.id, f.objednavka_id FROM " . get_invoices_table_name() . " f WHERE f.id = :invoice_id";
        $stmt = $db->prepare($checkSql);
        $stmt->bindValue(':invoice_id', $invoice_id, PDO::PARAM_INT);
        $stmt->execute();
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nebyla nalezena'));
            return;
        }
        
        // Načtení příloh
        $sql = "SELECT id, guid, typ_prilohy, originalni_nazev_souboru, velikost_souboru_b, dt_vytvoreni, nahrano_uzivatel_id FROM " . get_invoice_attachments_table_name() . " WHERE faktura_id = :faktura_id ORDER BY dt_vytvoreni DESC";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':faktura_id', $invoice_id, PDO::PARAM_INT);
        $stmt->execute();
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Response
        $result = array();
        foreach ($attachments as $attachment) {
            $result[] = array(
                'id' => (int)$attachment['id'],
                'guid' => $attachment['guid'],
                'type' => $attachment['typ_prilohy'],
                'original_name' => $attachment['originalni_nazev_souboru'],
                'file_size' => (int)$attachment['velikost_souboru_b'],
                'upload_date' => $attachment['dt_vytvoreni'],
                'uploaded_by_user_id' => (int)$attachment['nahrano_uzivatel_id']
            );
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'invoice_id' => $invoice_id,
                'order_id' => (int)$invoice['objednavka_id'],
                'attachments' => $result,
                'count' => count($result)
            )
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'DB Error: ' . $e->getMessage()));
    }
}

/**
 * POST /order-v2/invoices/{invoice_id}/attachments/{attachment_id}/download
 * Download konkrétní přílohy faktury (POST-only pro bezpečnost)
 */
function handle_order_v2_download_invoice_attachment($input, $config, $queries) {
    // Token authentication z POST body (ne z URL!)
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    $attachment_id = isset($input['attachment_id']) ? (int)$input['attachment_id'] : 0;
    
    // Validace povinných parametrů
    if (empty($token) || empty($request_username)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username v request body'));
        return;
    }
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if ($invoice_id <= 0 || $attachment_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID faktury nebo přílohy'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Načtení přílohy s kontrolou příslušnosti k faktuře
        $sql = "SELECT originalni_nazev_souboru, systemova_cesta, velikost_souboru_b, typ_prilohy
                FROM " . get_invoice_attachments_table_name() . " 
                WHERE id = :attachment_id AND faktura_id = :faktura_id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':attachment_id', $attachment_id, PDO::PARAM_INT);
        $stmt->bindValue(':faktura_id', $invoice_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attachment) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Příloha faktury nebyla nalezena'));
            return;
        }
        
        // Kontrola existence souboru
        if (!file_exists($attachment['systemova_cesta'])) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Soubor nebyl nalezen na disku'));
            return;
        }
        
        // Nastavení headers pro download (stejné jako u objednávek)
        $fileExt = strtolower(pathinfo($attachment['originalni_nazev_souboru'], PATHINFO_EXTENSION));
        $mimeType = 'application/octet-stream'; // Default
        
        // Základní MIME typy
        $mimeTypes = array(
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'txt' => 'text/plain',
            'zip' => 'application/zip'
        );
        
        if (isset($mimeTypes[$fileExt])) {
            $mimeType = $mimeTypes[$fileExt];
        }
        
        // Headers
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: attachment; filename="' . $attachment['originalni_nazev_souboru'] . '"');
        header('Content-Length: ' . $attachment['velikost_souboru_b']);
        header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
        header('Pragma: public');
        
        // Výstup souboru
        readfile($attachment['systemova_cesta']);
        
    } catch (Exception $e) {
        error_log("Order V2 DOWNLOAD INVOICE ATTACHMENT Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při stahování přílohy faktury: ' . $e->getMessage()));
    }
}

/**
 * DELETE /order-v2/invoices/{invoice_id}/attachments/{attachment_id}
 * Smazání konkrétní přílohy faktury
 * PHP 5.6+ compatible
 */
function handle_order_v2_delete_invoice_attachment($input, $config, $queries) {
    // Token authentication z POST body
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    $attachment_id = isset($input['attachment_id']) ? (int)$input['attachment_id'] : 0;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if ($invoice_id <= 0 || $attachment_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID faktury nebo přílohy'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Include TimezoneHelper pro timestamp
        require_once __DIR__ . '/TimezoneHelper.php';
        
        // Načtení přílohy s kontrolou příslušnosti k faktuře
        $sql = "SELECT id, originalni_nazev_souboru, systemova_cesta
                FROM " . get_invoice_attachments_table_name() . " 
                WHERE id = ? AND faktura_id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array($attachment_id, $invoice_id));
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attachment) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Příloha faktury nebyla nalezena'));
            return;
        }
        
        // Smazání záznamu z databáze
        $deleteStmt = $db->prepare("DELETE FROM " . get_invoice_attachments_table_name() . " WHERE id = ?");
        $deleteStmt->execute(array($attachment_id));
        
        // Smazání souboru z disku (pokud existuje)
        $fileDeleted = false;
        if (file_exists($attachment['systemova_cesta'])) {
            $fileDeleted = unlink($attachment['systemova_cesta']);
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'deleted_attachment_id' => $attachment_id,
                'invoice_id' => $invoice_id,
                'original_name' => $attachment['originalni_nazev_souboru'],
                'file_deleted_from_disk' => $fileDeleted
            ),
            'message' => 'Příloha faktury byla úspěšně smazána',
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'delete-invoice-attachment',
                'timestamp' => TimezoneHelper::getApiTimestamp(),
                'compatibility' => 'PHP 5.6 + MySQL 5.5.43'
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 DELETE INVOICE ATTACHMENT Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání přílohy faktury: ' . $e->getMessage()));
    }
}

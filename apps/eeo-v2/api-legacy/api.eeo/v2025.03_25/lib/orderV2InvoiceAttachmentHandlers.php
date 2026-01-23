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
require_once __DIR__ . '/TimezoneHelper.php';

// Include necessary functions from handlers.php
if (!function_exists('verify_token')) {
    require_once __DIR__ . '/handlers.php';
}
if (!function_exists('verify_token_v2')) {
    require_once __DIR__ . '/handlers.php';
}
if (!function_exists('get_db')) {
    require_once __DIR__ . '/handlers.php';
}

// ========== HELPER FUNCTIONS PRO INVOICE ATTACHMENTS ==========

/**
 * Získání upload cesty pro Order V2 invoice attachments
 * SIMPLIFIED: Bez adresářového členění, pouze root path
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
    
    // BEZ adresářového členění - všechny soubory v root
    // Prefix fa- a datum/guid v názvu souboru zajistí unikátnost
    return $basePath;
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
    error_log("=== UPLOAD START ===");
    error_log("Input: " . print_r($input, true));
    error_log("FILES: " . print_r($_FILES, true));
    
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? $input['invoice_id'] : '';
    $order_id = isset($input['order_id']) ? $input['order_id'] : '';
    
    error_log("Token: $token, Username: $request_username, Invoice ID: $invoice_id");
    
    $token_data = verify_token_v2($request_username, $token);
    error_log("Token data: " . print_r($token_data, true));
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        exit;
    }
    
    if ($invoice_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID faktury'));
        exit;
    }
    
    if (!isset($_FILES['file']) || empty($_FILES['file']['name'])) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí soubor'));
        exit;
    }
    
    try {
        $db = get_db($config);
        
        $sql = "SELECT f.id, f.objednavka_id FROM " . get_invoices_table_name() . " f WHERE f.id = :invoice_id";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':invoice_id', $invoice_id, PDO::PARAM_INT);
        $stmt->execute();
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nenalezena'));
            exit;
        }
        
        require_once __DIR__ . '/orderV2AttachmentHandlers.php';
        $validation = validate_order_v2_file_upload($config, $_FILES['file']);
        if (isset($validation['error'])) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => $validation['error']));
            exit;
        }
        
        $originalni_nazev = $_FILES['file']['name'];
        $velikost = $_FILES['file']['size'];
        $systemovy_guid = generate_order_v2_file_guid();
        $typ_prilohy = isset($input['typ_prilohy']) ? $input['typ_prilohy'] : 'FAKTURA';
        
        // Získání upload cesty z konfigurace
        $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
        $uploadPath = '';
        if (isset($uploadConfig['root_path']) && !empty($uploadConfig['root_path'])) {
            $uploadPath = $uploadConfig['root_path'];
        } elseif (isset($uploadConfig['relative_path']) && !empty($uploadConfig['relative_path'])) {
            $uploadPath = $uploadConfig['relative_path'];
        } else {
            $uploadPath = '/var/www/erdms-dev/data/eeo-v2/prilohy/';
        }
        
        // Přidat lomítko na konec pokud chybí
        if (substr($uploadPath, -1) !== '/') {
            $uploadPath .= '/';
        }
        
        // Název souboru: fa-{datum}_{guid}.{ext}
        $fileExt = $validation['extension'];
        $finalFileName = 'fa-' . $systemovy_guid . ($fileExt ? '.' . $fileExt : '');
        $systemova_cesta = $uploadPath . $finalFileName;
        
        if (!move_uploaded_file($_FILES['file']['tmp_name'], $systemova_cesta)) {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => 'Nelze uložit soubor'));
            exit;
        }
        
        $insertSql = "INSERT INTO " . get_invoice_attachments_table_name() . " (
            faktura_id, objednavka_id, guid, typ_prilohy, originalni_nazev_souboru, 
            systemova_cesta, velikost_souboru_b, nahrano_uzivatel_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $db->prepare($insertSql);
        $stmt->execute(array(
            $invoice_id,
            $invoice['objednavka_id'],
            $systemovy_guid,
            $typ_prilohy,
            $originalni_nazev,
            $systemova_cesta,
            $velikost,
            $token_data['id']
        ));
        
        $attachment_id = $db->lastInsertId();
        
        // Načtení čerstvě vytvořené přílohy pro kompletní response s údaji o uživateli
        $selectSql = "SELECT 
            a.id, a.guid, a.typ_prilohy, a.originalni_nazev_souboru, a.systemova_cesta, 
            a.velikost_souboru_b, a.dt_vytvoreni, a.nahrano_uzivatel_id, a.je_isdoc,
            u.jmeno AS nahrano_uzivatel_jmeno,
            u.prijmeni AS nahrano_uzivatel_prijmeni,
            u.usek_id AS nahrano_uzivatel_usek_id
        FROM " . get_invoice_attachments_table_name() . " a
        LEFT JOIN `25_uzivatele` u ON a.nahrano_uzivatel_id = u.id
        WHERE a.id = ?";
        $stmt = $db->prepare($selectSql);
        $stmt->execute(array($attachment_id));
        $priloha = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 🔍 DEBUG: Log uživatelských dat
        error_log("UPLOAD SUCCESS: User data - ID: " . $priloha['nahrano_uzivatel_id'] . 
                  ", Jmeno: " . $priloha['nahrano_uzivatel_jmeno'] . 
                  ", Prijmeni: " . $priloha['nahrano_uzivatel_prijmeni'] .
                  ", Usek: " . $priloha['nahrano_uzivatel_usek_id']);
        
        // ✅ ORDER V2 STANDARD: status + data + ČESKÉ NÁZVY SLOUPCŮ
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Příloha byla úspěšně nahrána',
            'priloha' => array(
                'id' => (int)$priloha['id'],
                'guid' => $priloha['guid'],
                'typ_prilohy' => $priloha['typ_prilohy'],
                'originalni_nazev_souboru' => $priloha['originalni_nazev_souboru'],
                'systemova_cesta' => $priloha['systemova_cesta'],
                'velikost_souboru_b' => (int)$priloha['velikost_souboru_b'],
                'dt_vytvoreni' => $priloha['dt_vytvoreni'],
                'nahrano_uzivatel_id' => (int)$priloha['nahrano_uzivatel_id'],
                'je_isdoc' => (int)$priloha['je_isdoc'],
                'nahrano_uzivatel' => array(
                    'id' => (int)$priloha['nahrano_uzivatel_id'],
                    'jmeno' => $priloha['nahrano_uzivatel_jmeno'],
                    'prijmeni' => $priloha['nahrano_uzivatel_prijmeni'],
                    'usek_id' => (int)$priloha['nahrano_uzivatel_usek_id']
                )
            )
        ));
        
    } catch (Exception $e) {
        error_log("UPLOAD ERROR: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error', 
            'message' => 'Chyba při nahrávání přílohy faktury: ' . $e->getMessage()
        ));
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
        
        // Načtení příloh s informacemi o uživateli
        $sql = "SELECT 
            a.id, a.guid, a.typ_prilohy, a.originalni_nazev_souboru, a.systemova_cesta, 
            a.velikost_souboru_b, a.dt_vytvoreni, a.nahrano_uzivatel_id, a.je_isdoc,
            u.jmeno AS nahrano_uzivatel_jmeno,
            u.prijmeni AS nahrano_uzivatel_prijmeni,
            u.usek_id AS nahrano_uzivatel_usek_id
        FROM " . get_invoice_attachments_table_name() . " a
        LEFT JOIN `25_uzivatele` u ON a.nahrano_uzivatel_id = u.id
        WHERE a.faktura_id = :faktura_id 
        ORDER BY a.dt_vytvoreni DESC";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':faktura_id', $invoice_id, PDO::PARAM_INT);
        $stmt->execute();
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Response - VRÁTIT PŘESNĚ SLOUPCE Z DB (ČESKÉ NÁZVY 1:1)
        $result = array();
        foreach ($attachments as $attachment) {
            $result[] = array(
                'id' => (int)$attachment['id'],
                'guid' => $attachment['guid'],
                'typ_prilohy' => $attachment['typ_prilohy'],
                'originalni_nazev_souboru' => $attachment['originalni_nazev_souboru'],
                'systemova_cesta' => $attachment['systemova_cesta'],
                'velikost_souboru_b' => (int)$attachment['velikost_souboru_b'],
                'dt_vytvoreni' => $attachment['dt_vytvoreni'],
                'nahrano_uzivatel_id' => (int)$attachment['nahrano_uzivatel_id'],
                'je_isdoc' => (int)$attachment['je_isdoc'],
                'nahrano_uzivatel' => array(
                    'id' => (int)$attachment['nahrano_uzivatel_id'],
                    'jmeno' => $attachment['nahrano_uzivatel_jmeno'],
                    'prijmeni' => $attachment['nahrano_uzivatel_prijmeni'],
                    'usek_id' => (int)$attachment['nahrano_uzivatel_usek_id']
                )
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
        
        // Načtení přílohy s kontrolou příslušnosti k faktuře + info o nahrávajícím uživateli
        $sql = "SELECT 
            a.id, a.originalni_nazev_souboru, a.systemova_cesta, a.nahrano_uzivatel_id,
            u.usek_id as nahrano_uzivatel_usek_id
        FROM " . get_invoice_attachments_table_name() . " a
        LEFT JOIN `25_uzivatele` u ON a.nahrano_uzivatel_id = u.id
        WHERE a.id = ? AND a.faktura_id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array($attachment_id, $invoice_id));
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attachment) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Příloha faktury nebyla nalezena'));
            return;
        }
        
        // ===== KONTROLA OPRÁVNĚNÍ =====
        // Získání údajů o aktuálním uživateli
        $currentUserId = $token_data['id'];
        
        $userSql = "SELECT usek_id FROM `25_uzivatele` WHERE id = ?";
        $userStmt = $db->prepare($userSql);
        $userStmt->execute(array($currentUserId));
        $currentUser = $userStmt->fetch(PDO::FETCH_ASSOC);
        $currentUserUsekId = $currentUser ? $currentUser['usek_id'] : null;
        
        // Kontrola rolí - ADMIN a SUPERADMIN mohou mazat vše
        $roles = isset($token_data['role']) ? $token_data['role'] : array();
        if (!is_array($roles)) {
            $roles = array($roles);
        }
        $isAdmin = in_array('SUPERADMIN', $roles) || in_array('ADMINISTRATOR', $roles);
        
        // Kontrola INVOICE_MANAGE práva
        $hasInvoiceManage = false;
        try {
            $permsSql = "SELECT COUNT(*) as cnt FROM `25_prava` p
                        WHERE p.kod_prava = 'INVOICE_MANAGE'
                        AND p.id IN (
                            SELECT rp.pravo_id FROM `25_role_prava` rp WHERE rp.user_id = ?
                            UNION
                            SELECT rp.pravo_id FROM `25_uzivatele_role` ur
                            JOIN `25_role_prava` rp ON ur.role_id = rp.role_id AND rp.user_id = -1
                            WHERE ur.uzivatel_id = ?
                        )";
            $permsStmt = $db->prepare($permsSql);
            $permsStmt->execute(array($currentUserId, $currentUserId));
            $result = $permsStmt->fetch(PDO::FETCH_ASSOC);
            $hasInvoiceManage = $result && $result['cnt'] > 0;
        } catch (Exception $e) {
            error_log("INVOICE_MANAGE check error: " . $e->getMessage());
        }
        
        // Rozhodnutí o oprávnění
        $canDelete = false;
        $deleteReason = '';
        
        if ($isAdmin || $hasInvoiceManage) {
            $canDelete = true;
            $deleteReason = $isAdmin ? 'ADMIN' : 'INVOICE_MANAGE';
        } elseif ($attachment['nahrano_uzivatel_id'] == $currentUserId) {
            $canDelete = true;
            $deleteReason = 'VLASTNÍ_PŘÍLOHA';
        } elseif ($currentUserUsekId && $attachment['nahrano_uzivatel_usek_id'] && 
                  $currentUserUsekId == $attachment['nahrano_uzivatel_usek_id']) {
            $canDelete = true;
            $deleteReason = 'STEJNÝ_ÚSEK';
        }
        
        if (!$canDelete) {
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'Nemáte oprávnění smazat tuto přílohu. Můžete mazat pouze vlastní přílohy nebo přílohy ze svého úseku.'
            ));
            return;
        }
        
        error_log("DELETE INVOICE ATTACHMENT: User {$currentUserId} deleting attachment {$attachment_id} - Reason: {$deleteReason}");
        
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

/**
 * POST /order-v2/invoices/{invoice_id}/attachments/verify
 * Ověření integrity příloh faktury - kontrola existence souborů na disku
 * PHP 5.6 + MySQL 5.5.43 compatible
 */
function handle_order_v2_verify_invoice_attachments($input, $config, $queries) {
    // Token authentication
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
        
        // Načíst všechny přílohy faktury
        $sql = "SELECT id, guid, systemova_cesta, originalni_nazev_souboru, velikost_souboru_b
                FROM " . get_invoice_attachments_table_name() . " 
                WHERE faktura_id = :faktura_id";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':faktura_id', $invoice_id, PDO::PARAM_INT);
        $stmt->execute();
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Kontrola existence každého souboru
        $result = array();
        $missing = 0;
        
        foreach ($attachments as $att) {
            $file_path = $att['systemova_cesta'];
            $exists = file_exists($file_path);
            
            if (!$exists) {
                $missing++;
            }
            
            $result[] = array(
                'id' => (int)$att['id'],
                'guid' => $att['guid'],
                'systemova_cesta' => $att['systemova_cesta'],
                'originalni_nazev_souboru' => $att['originalni_nazev_souboru'],
                'velikost_souboru_b' => (int)$att['velikost_souboru_b'],
                'file_exists' => $exists,
                'status' => $exists ? 'OK' : 'MISSING_FILE'
            );
        }
        
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'invoice_id' => $invoice_id,
                'summary' => array(
                    'total_attachments' => count($attachments),
                    'existing_files' => count($attachments) - $missing,
                    'missing_files' => $missing
                ),
                'attachments' => $result
            ),
            'message' => $missing > 0 ? "Nalezeno $missing chybějících souborů" : 'Všechny soubory jsou v pořádku'
        ));

    } catch (Exception $e) {
        error_log("Order V2 VERIFY INVOICE ATTACHMENTS Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při verifikaci příloh: ' . $e->getMessage()));
    }
}

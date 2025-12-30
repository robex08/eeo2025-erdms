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
 * Bezpečné spojení cesty a názvu souboru
 * Ošetří duplicitní nebo chybějící lomítka
 * 
 * @param string $basePath Základní cesta (např. /var/www/uploads/)
 * @param string $filename Název souboru (např. fa-2025-11-16_abc.pdf)
 * @return string Správně spojená cesta
 */
function safe_path_join($basePath, $filename) {
    // Ošetření prázdných hodnot
    if (empty($basePath)) {
        return $filename;
    }
    if (empty($filename)) {
        return $basePath;
    }
    
    // Odstranění koncového lomítka z base path
    $basePath = rtrim($basePath, '/');
    
    // Odstranění úvodního lomítka z filename (kdyby tam byl)
    $filename = ltrim($filename, '/');
    
    // Spojení s právě jedním lomítkem
    return $basePath . '/' . $filename;
}

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
    
    
    // Draft ID handling
    if (is_string($invoice_id) && strpos($invoice_id, "draft_") === 0) {
        http_response_code(422);
        echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft faktury"));
        return;
    }
    $numeric_invoice_id = intval($invoice_id);
    if ($numeric_invoice_id <= 0) {
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
        $stmt->bindValue(':invoice_id', $numeric_invoice_id, PDO::PARAM_INT);
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
        
        // GUID: Použij GUID od FE pokud existuje, jinak vygeneruj nový
        $systemovy_guid = isset($input['guid']) && !empty($input['guid']) 
            ? $input['guid'] 
            : generate_order_v2_file_guid();
        
        $typ_prilohy = isset($input['typ_prilohy']) ? $input['typ_prilohy'] : 'fa'; // default: faktura
        
        // PREFIX: Použij prefix od FE pokud existuje, jinak použij výchozí 'fa-'
        // Kontroluj jak v $input (JSON), tak v $_POST (FormData)
        $file_prefix = 'fa-'; // výchozí
        if (isset($input['file_prefix']) && !empty($input['file_prefix'])) {
            $file_prefix = $input['file_prefix'];
        } elseif (isset($_POST['file_prefix']) && !empty($_POST['file_prefix'])) {
            $file_prefix = $_POST['file_prefix'];
        }
        
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
        
        // Název souboru s prefixem (výchozí fa- nebo custom) a guid (který už obsahuje datum YYYY-MM-DD)
        // Formát: {prefix}2025-11-01_abc123def456.ext
        // Příklady:
        //   - fa-2025-11-01_abc123.ext (výchozí pro faktury)
        //   - inv-2025-11-01_abc123.ext (custom prefix)
        //   - doc-2025-11-01_abc123.ext (custom prefix pro dokumenty)
        $fileExt = $validation['extension'];
        $finalFileName = $file_prefix . $systemovy_guid . ($fileExt ? '.' . $fileExt : '');
        $systemova_cesta = $uploadPath . $finalFileName;
        
        // Přesun souboru
        if (!move_uploaded_file($_FILES['file']['tmp_name'], $systemova_cesta)) {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => 'Nelze uložit soubor'));
            return;
        }
        
        // Uložení do databáze (do invoice attachments tabulky)
        // ✅ OPRAVA: Ukládáme POUZE název souboru, NE celou cestu
        // Plnou cestu poskládáme na FE nebo při downloadu z config['upload']['root_path']
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
            ':systemova_cesta' => $finalFileName, // ✅ POUZE název souboru, ne plná cesta
            ':velikost_souboru_b' => $velikost,
            ':nahrano_uzivatel_id' => $token_data['id']
        ));
        
        $attachment_id = $db->lastInsertId();
        
        // Načtení dt_vytvoreni a dt_aktualizace z DB
        $selectStmt = $db->prepare("SELECT dt_vytvoreni, dt_aktualizace FROM " . get_invoice_attachments_table_name() . " WHERE id = :id");
        $selectStmt->bindValue(':id', $attachment_id, PDO::PARAM_INT);
        $selectStmt->execute();
        $timestamps = $selectStmt->fetch(PDO::FETCH_ASSOC);
        
        // Úspěšná odpověď
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'attachment_id' => $attachment_id,
                'invoice_id' => $invoice_id,
                'order_id' => $actual_order_id,
                'original_name' => $originalni_nazev,
                'system_guid' => $systemovy_guid,
                'file_prefix' => $file_prefix,
                'final_filename' => $finalFileName,
                'file_size' => $velikost,
                'type' => $typ_prilohy,
                'upload_path' => $finalFileName, // Relativní cesta pro FE
                'created_at' => $timestamps ? $timestamps['dt_vytvoreni'] : null,
                'updated_at' => $timestamps ? $timestamps['dt_aktualizace'] : null
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
    $invoice_id = isset($input['invoice_id']) ? $input['invoice_id'] : 0;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    // Draft ID handling
    if (is_string($invoice_id) && strpos($invoice_id, "draft_") === 0) {
        http_response_code(422);
        echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft faktury"));
        return;
    }
    $numeric_invoice_id = intval($invoice_id);
    if ($numeric_invoice_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID faktury'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Kontrola faktury
        $checkSql = "SELECT f.id, f.objednavka_id FROM " . get_invoices_table_name() . " f WHERE f.id = :invoice_id";
        $stmt = $db->prepare($checkSql);
        $stmt->bindValue(':invoice_id', $numeric_invoice_id, PDO::PARAM_INT);
        $stmt->execute();
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nebyla nalezena'));
            return;
        }
        
        // Načtení příloh
        $sql = "SELECT id, guid, typ_prilohy, originalni_nazev_souboru, systemova_cesta, velikost_souboru_b, dt_vytvoreni, nahrano_uzivatel_id FROM " . get_invoice_attachments_table_name() . " WHERE faktura_id = :faktura_id ORDER BY dt_vytvoreni DESC";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':faktura_id', $invoice_id, PDO::PARAM_INT);
        $stmt->execute();
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Získání base path z konfigurace
        $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
        $basePath = '';
        if (isset($uploadConfig['root_path']) && !empty($uploadConfig['root_path'])) {
            $basePath = $uploadConfig['root_path'];
        } elseif (isset($uploadConfig['relative_path']) && !empty($uploadConfig['relative_path'])) {
            $basePath = $uploadConfig['relative_path'];
        } else {
            $basePath = '/var/www/eeo2025/doc/prilohy/';
        }
        
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
                'je_isdoc' => (int)$attachment['je_isdoc']
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
    $invoice_id = isset($input['invoice_id']) ? $input['invoice_id'] : 0;
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
    
    // Convert invoice_id to numeric
    $numeric_invoice_id = intval($invoice_id);
    
    if ($numeric_invoice_id <= 0 || $attachment_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID faktury nebo přílohy'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Update last activity for the authenticated user
        try {
            $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
            $stmtUpd->bindParam(':id', $token_data['id']);
            $stmtUpd->execute();
        } catch (Exception $e) {
            // non-fatal: continue even if update fails
        }
        
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
        
        // ✅ OPRAVA: Sestavení plné cesty ze systemova_cesta
        // Pokud systemova_cesta obsahuje plnou cestu (starý záznam), použij ji přímo
        // Pokud obsahuje pouze název souboru (nový záznam), spoj s base path z configu
        $fullPath = $attachment['systemova_cesta'];
        if (strpos($fullPath, '/') !== 0) {
            // Není to absolutní cesta -> je to pouze název souboru -> přidej base path
            $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
            $basePath = '';
            if (isset($uploadConfig['root_path']) && !empty($uploadConfig['root_path'])) {
                $basePath = $uploadConfig['root_path'];
            } elseif (isset($uploadConfig['relative_path']) && !empty($uploadConfig['relative_path'])) {
                $basePath = $uploadConfig['relative_path'];
            } else {
                $basePath = '/var/www/eeo2025/doc/prilohy/';
            }
            $fullPath = safe_path_join($basePath, $fullPath);
        }
        
        // Kontrola existence souboru
        if (!file_exists($fullPath)) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Soubor nebyl nalezen na disku: ' . basename($fullPath)));
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
        
        // Výstup souboru (používáme sestavený $fullPath)
        readfile($fullPath);
        
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
    $invoice_id = isset($input['invoice_id']) ? $input['invoice_id'] : 0;
    $attachment_id = isset($input['attachment_id']) ? (int)$input['attachment_id'] : 0;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    // Convert invoice_id to numeric
    $numeric_invoice_id = intval($invoice_id);
    
    if ($numeric_invoice_id <= 0 || $attachment_id <= 0) {
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
        
        // ✅ OPRAVA: Sestavení plné cesty ze systemova_cesta
        $fullPath = $attachment['systemova_cesta'];
        if (strpos($fullPath, '/') !== 0) {
            // Není to absolutní cesta -> je to pouze název souboru -> přidej base path
            $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
            $basePath = '';
            if (isset($uploadConfig['root_path']) && !empty($uploadConfig['root_path'])) {
                $basePath = $uploadConfig['root_path'];
            } elseif (isset($uploadConfig['relative_path']) && !empty($uploadConfig['relative_path'])) {
                $basePath = $uploadConfig['relative_path'];
            } else {
                $basePath = '/var/www/eeo2025/doc/prilohy/';
            }
            $fullPath = safe_path_join($basePath, $fullPath);
        }
        
        // Kontrola existence souboru na disku PŘED smazáním z DB
        $fileExists = file_exists($fullPath);
        $fileDeleted = false;
        $warning = null;
        
        // Smazání záznamu z databáze (vždy)
        $deleteStmt = $db->prepare("DELETE FROM " . get_invoice_attachments_table_name() . " WHERE id = ?");
        $deleteStmt->execute(array($attachment_id));
        
        // Pokus o smazání souboru z disku
        if ($fileExists) {
            $fileDeleted = @unlink($fullPath);
            if (!$fileDeleted) {
                $warning = 'Záznam v DB byl smazán, ale soubor na disku se nepodařilo smazat (chyba oprávnění?)';
            }
        } else {
            $warning = 'Záznam v DB byl smazán, ale soubor na disku již neexistoval';
        }
        
        $response = array(
            'status' => 'ok',
            'data' => array(
                'deleted_attachment_id' => $attachment_id,
                'invoice_id' => $invoice_id,
                'original_name' => $attachment['originalni_nazev_souboru'],
                'file_existed' => $fileExists,
                'file_deleted_from_disk' => $fileDeleted,
                'db_record_deleted' => true
            ),
            'message' => 'Příloha faktury byla úspěšně smazána',
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'delete-invoice-attachment',
                'timestamp' => TimezoneHelper::getApiTimestamp(),
                'compatibility' => 'PHP 5.6 + MySQL 5.5.43'
            )
        );
        
        // Přidej warning pokud byl nějaký problém
        if ($warning) {
            $response['warning'] = $warning;
        }
        
        echo json_encode($response);
        
    } catch (Exception $e) {
        error_log("Order V2 DELETE INVOICE ATTACHMENT Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání přílohy faktury: ' . $e->getMessage()));
    }
}

/**
 * POST /order-v2/invoices/{invoice_id}/attachments/verify
 * Ověření integrity všech příloh faktury
 */
function handle_order_v2_verify_invoice_attachments($input, $config, $queries) {
    // Token authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? (int)$input['invoice_id'] : 0;
    // objednavka_id je volitelné (frontend může posílat, ale nepotřebujeme ho)
    $order_id = isset($input['objednavka_id']) ? (int)$input['objednavka_id'] : 0;
    
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
        
        // Kontrola existence faktury
        $invoiceStmt = $db->prepare("SELECT id FROM " . get_invoices_table_name() . " WHERE id = ?");
        $invoiceStmt->execute(array($invoice_id));
        
        if (!$invoiceStmt->fetch()) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Faktura nebyla nalezena'));
            return;
        }
        
        // Načtení všech příloh
        $sql = "SELECT id, guid, originalni_nazev_souboru, systemova_cesta, velikost_souboru_b
                FROM " . get_invoice_attachments_table_name() . " 
                WHERE faktura_id = ? 
                ORDER BY dt_vytvoreni";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array($invoice_id));
        
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Ověření každé přílohy
        $results = array();
        $totalAttachments = count($attachments);
        $validAttachments = 0;
        $missingFiles = 0;
        $sizeMatches = 0;
        
        foreach ($attachments as $attachment) {
            $verification = array(
                'attachment_id' => (int)$attachment['id'],
                'guid' => $attachment['guid'],
                'original_name' => $attachment['originalni_nazev_souboru'],
                'db_size' => (int)$attachment['velikost_souboru_b']
            );
            
            // Kontrola existence souboru
            if (file_exists($attachment['systemova_cesta'])) {
                $verification['file_exists'] = true;
                $actualSize = filesize($attachment['systemova_cesta']);
                $verification['actual_size'] = $actualSize;
                
                // Kontrola velikosti
                if ($actualSize == $attachment['velikost_souboru_b']) {
                    $verification['size_match'] = true;
                    $verification['status'] = 'OK';
                    $sizeMatches++;
                    $validAttachments++;
                } else {
                    $verification['size_match'] = false;
                    $verification['status'] = 'SIZE_MISMATCH';
                }
            } else {
                $verification['file_exists'] = false;
                $verification['actual_size'] = null;
                $verification['size_match'] = false;
                $verification['status'] = 'FILE_MISSING';
                $missingFiles++;
            }
            
            $results[] = $verification;
        }
        
        // Summary
        $summary = array(
            'total_attachments' => $totalAttachments,
            'valid_attachments' => $validAttachments,
            'missing_files' => $missingFiles,
            'size_matches' => $sizeMatches,
            'integrity_ok' => ($validAttachments === $totalAttachments)
        );
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'invoice_id' => $invoice_id,
                'summary' => $summary,
                'attachments' => $results
            ),
            'message' => $totalAttachments > 0 ? 
                ($summary['integrity_ok'] ? 'Všechny přílohy jsou v pořádku' : 'Nalezeny problémy s přílohami') :
                'Faktura nemá žádné přílohy',
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'verify-invoice-attachments',
                'timestamp' => TimezoneHelper::getApiTimestamp(),
                'compatibility' => 'PHP 5.6 + MySQL 5.5.43'
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 VERIFY INVOICE ATTACHMENTS Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při ověřování příloh faktury: ' . $e->getMessage()));
    }
}

/**
 * ORDER V2 API - List ALL invoice attachments (všechny přílohy všech faktur)
 * 
 * POST /api.eeo/order-v2/invoices/attachments/list
 * 
 * Input (POST JSON):
 * - username: uživatelské jméno
 * - token: autentizační token
 * - limit: (optional) počet záznamů (default 100)
 * - offset: (optional) offset pro stránkování (default 0)
 * 
 * Response: JSON seznam všech příloh faktur s info o faktuře a objednávce
 * PHP 5.6 compatible with TimezoneHelper
 */
function handle_order_v2_list_all_invoice_attachments($input, $config, $queries) {
    // Token authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $limit = isset($input['limit']) ? intval($input['limit']) : 100;
    $offset = isset($input['offset']) ? intval($input['offset']) : 0;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Načtení všech příloh faktur se základními info
        $sql = "SELECT 
                    a.id,
                    a.faktura_id,
                    a.originalni_nazev_souboru,
                    a.systemova_cesta,
                    a.velikost_souboru_b,
                    a.dt_vytvoreni,
                    a.dt_aktualizace,
                    a.nahrano_uzivatel_id,
                    f.fa_cislo_vema as cislo_faktury,
                    f.objednavka_id,
                    o.cislo_objednavky,
                    o.predmet as objednavka_nazev
                FROM " . get_invoice_attachments_table_name() . " a
                INNER JOIN " . get_invoices_table_name() . " f ON a.faktura_id = f.id
                INNER JOIN " . get_orders_table_name() . " o ON f.objednavka_id = o.id
                WHERE o.aktivni = 1
                ORDER BY a.dt_vytvoreni DESC
                LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Count total
        $countSql = "SELECT COUNT(*) as total 
                     FROM " . get_invoice_attachments_table_name() . " a
                     INNER JOIN " . get_invoices_table_name() . " f ON a.faktura_id = f.id
                     INNER JOIN " . get_orders_table_name() . " o ON f.objednavka_id = o.id
                     WHERE o.aktivni = 1";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute();
        $total = $countStmt->fetch(PDO::FETCH_ASSOC);
        
        // Mapping DB fields to English API format
        $mappedAttachments = array();
        foreach ($attachments as $att) {
            $mappedAttachments[] = array(
                'id' => (int)$att['id'],
                'invoice_id' => (int)$att['faktura_id'],
                'original_name' => $att['originalni_nazev_souboru'],
                'system_path' => $att['systemova_cesta'],
                'file_size' => (int)$att['velikost_souboru_b'],
                'created_at' => $att['dt_vytvoreni'],
                'updated_at' => $att['dt_aktualizace'],
                'uploaded_by_user_id' => (int)$att['nahrano_uzivatel_id'],
                'invoice_number' => $att['cislo_faktury'],
                'order_id' => (int)$att['objednavka_id'],
                'order_number' => $att['cislo_objednavky'],
                'order_name' => $att['objednavka_nazev']
            );
        }
        
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'data' => $mappedAttachments,
            'pagination' => array(
                'total' => intval($total['total']),
                'limit' => $limit,
                'offset' => $offset,
                'returned' => count($mappedAttachments)
            ),
            'timestamp' => TimezoneHelper::getApiTimestamp()
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 LIST ALL INVOICE ATTACHMENTS Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání příloh faktur: ' . $e->getMessage()));
    }
}

/**
 * Update metadata přílohy faktury v Order V2 API
 * PUT /api.eeo/order-v2/invoices/{invoice_id}/attachments/{attachment_id}/update
 * 
 * Aktualizuje metadata přílohy faktury (typ, název).
 * Stejně jako u order attachments, umožňuje změnit klasifikaci nebo opravit název.
 * 
 * @param array $input Input data (token, username, invoice_id, attachment_id, type, original_name)
 * @param array $config Config array
 * @param array $queries Query templates
 * @return void (JSON response)
 */
function handle_order_v2_update_invoice_attachment($input, $config, $queries) {
    // Token authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $invoice_id = isset($input['invoice_id']) ? $input['invoice_id'] : '';
    $attachment_id = isset($input['attachment_id']) ? (int)$input['attachment_id'] : 0;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    if (empty($invoice_id) || $attachment_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID faktury nebo přílohy'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Nastav MySQL timezone na Europe/Prague pro NOW()
        TimezoneHelper::setMysqlTimezone($db);
        
        // Kontrola existence přílohy a její vazby na fakturu
        $invoicesTable = get_invoices_table_name();
        $attachmentsTable = get_invoice_attachments_table_name();
        
        $checkSql = "SELECT 
                fp.id,
                fp.guid,
                fp.originalni_nazev_souboru,
                fp.typ_prilohy,
                fp.velikost_souboru_b,
                f.fa_cislo_vema as cislo_faktury,
                f.objednavka_id
            FROM " . $attachmentsTable . " fp
            INNER JOIN " . $invoicesTable . " f ON fp.faktura_id = f.id
            WHERE fp.id = :attachment_id";
        
        // Pokud je invoice_id numerické, přidáme podmínku
        $numeric_invoice_id = null;
        if (is_numeric($invoice_id)) {
            $numeric_invoice_id = intval($invoice_id);
            $checkSql .= " AND f.id = :invoice_id";
        }
        
        $checkStmt = $db->prepare($checkSql);
        $checkStmt->bindValue(':attachment_id', $attachment_id, PDO::PARAM_INT);
        if ($numeric_invoice_id !== null) {
            $checkStmt->bindValue(':invoice_id', $numeric_invoice_id, PDO::PARAM_INT);
        }
        $checkStmt->execute();
        
        $attachment = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attachment) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Příloha faktury nebyla nalezena'));
            return;
        }
        
        // Příprava dat pro update - pouze ta pole která přišla
        $updateFields = array();
        $updateValues = array();
        
        if (isset($input['original_name']) && !empty($input['original_name'])) {
            $updateFields[] = 'originalni_nazev_souboru = :original_name';
            $updateValues[':original_name'] = $input['original_name'];
        }
        
        // ✅ OPRAVA: Podpora pro oba názvy parametrů (kompatibilita FE)
        // FE může poslat 'type' nebo 'typ_prilohy'
        $typ_prilohy = null;
        if (isset($input['type']) && !empty($input['type'])) {
            $typ_prilohy = $input['type'];
        } elseif (isset($input['typ_prilohy']) && !empty($input['typ_prilohy'])) {
            $typ_prilohy = $input['typ_prilohy'];
        }
        
        if ($typ_prilohy !== null) {
            $updateFields[] = 'typ_prilohy = :type';
            $updateValues[':type'] = $typ_prilohy;
        }
        
        if (empty($updateFields)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Žádná data k aktualizaci'));
            return;
        }
        
        // Přidání dt_aktualizace
        $updateFields[] = 'dt_aktualizace = NOW()';
        
        // Update query
        $sql = "UPDATE " . $attachmentsTable . " SET " . implode(', ', $updateFields) . " WHERE id = :id";
        $updateValues[':id'] = $attachment_id;
        
        $stmt = $db->prepare($sql);
        $stmt->execute($updateValues);
        
        // Načtení aktualizovaných dat
        $selectStmt = $db->prepare("SELECT 
                fp.id,
                fp.guid,
                fp.typ_prilohy,
                fp.originalni_nazev_souboru,
                fp.velikost_souboru_b,
                fp.dt_vytvoreni,
                fp.dt_aktualizace,
                fp.nahrano_uzivatel_id,
                f.id as faktura_id,
                f.fa_cislo_vema as cislo_faktury,
                f.objednavka_id
            FROM " . $attachmentsTable . " fp
            INNER JOIN " . $invoicesTable . " f ON fp.faktura_id = f.id
            WHERE fp.id = :id");
        $selectStmt->bindValue(':id', $attachment_id, PDO::PARAM_INT);
        $selectStmt->execute();
        $updated = $selectStmt->fetch(PDO::FETCH_ASSOC);
        
        // Response podle Order V2 standardu
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'attachment_id' => (int)$updated['id'],
                'invoice_id' => (int)$updated['faktura_id'],
                'invoice_number' => $updated['cislo_faktury'],
                'order_id' => (int)$updated['objednavka_id'],
                'guid' => $updated['guid'],
                'original_name' => $updated['originalni_nazev_souboru'],
                'type' => $updated['typ_prilohy'],
                'file_size' => (int)$updated['velikost_souboru_b'],
                'uploaded_by' => (int)$updated['nahrano_uzivatel_id'],
                'created_at' => $updated['dt_vytvoreni'],
                'updated_at' => $updated['dt_aktualizace']
            ),
            'message' => 'Metadata přílohy faktury byla úspěšně aktualizována',
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'update-invoice-attachment',
                'timestamp' => TimezoneHelper::getApiTimestamp(),
                'compatibility' => 'PHP 5.6 + MySQL 5.5.43'
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 UPDATE INVOICE ATTACHMENT Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci přílohy faktury: ' . $e->getMessage()));
    }
}

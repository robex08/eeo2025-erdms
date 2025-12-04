<?php
require_once __DIR__ . "/TimezoneHelper.php";
/**
 * Order V2 Attachment Handlers - Kompletní správa příloh
 * 
 * Implementuje všechny attachment operace pro Order V2 API:
 * - Upload příloh k objednávkám
 * - Download příloh
 * - Listing příloh  
 * - Mazání příloh
 * - Update metadat příloh
 * - Verifikace integrity příloh
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
if (!function_exists('get_db')) {
    require_once __DIR__ . '/handlers.php';
}

// ========== HELPER FUNCTIONS PRO ATTACHMENTS ==========

/**
 * Bezpečné spojení cesty a názvu souboru
 * Ošetří duplicitní nebo chybějící lomítka
 * 
 * @param string $basePath Základní cesta (např. /var/www/uploads/)
 * @param string $filename Název souboru (např. obj-2025-11-16_abc.pdf)
 * @return string Správně spojená cesta
 */
if (!function_exists('safe_path_join')) {
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
}

// ========== HELPER FUNCTIONS ==========

/**
 * Získání upload cesty pro Order V2 attachments
 * SIMPLIFIED: Bez adresářového členění, pouze root path
 * PHP 5.6 compatible
 */
function get_order_v2_upload_path($config, $objednavka_id, $user_id) {
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
    // Prefix a datum/guid v názvu souboru zajistí unikátnost
    return $basePath;
}

/**
 * Validace file upload pro Order V2
 * PHP 5.6 compatible
 */
function validate_order_v2_file_upload($config, $file_data) {
    $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
    
    // Povolené přípony
    $allowedExtensions = isset($uploadConfig['allowed_extensions']) ? 
        $uploadConfig['allowed_extensions'] : 
        array(
            // Dokumenty
            'pdf', 'doc', 'docx', 'rtf', 'odt', 'isdoc',
            // Tabulky
            'xls', 'xlsx', 'ods', 'csv',
            // Prezentace  
            'ppt', 'pptx', 'odp',
            // Text
            'txt', 'md',
            // Obrázky
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
            // Archivy
            'zip', 'rar', '7z', 'tar', 'gz'
        );
    
    // Maximální velikost souboru
    $maxFileSize = isset($uploadConfig['max_file_size']) ? 
        $uploadConfig['max_file_size'] : (20 * 1024 * 1024); // 20MB default
    
    // Validace přípony
    $fileExt = strtolower(pathinfo($file_data['name'], PATHINFO_EXTENSION));
    if ($fileExt && !in_array($fileExt, $allowedExtensions)) {
        return array('error' => 'Nepodporovaný typ souboru. Povolené typy: ' . implode(', ', $allowedExtensions));
    }
    
    // Validace velikosti
    if ($file_data['size'] > $maxFileSize) {
        return array('error' => 'Soubor je příliš velký. Maximální velikost: ' . ($maxFileSize / 1024 / 1024) . ' MB');
    }
    
    // Upload error check
    if ($file_data['error'] !== UPLOAD_ERR_OK) {
        return array('error' => 'Chyba při uploadu souboru: ' . $file_data['error']);
    }
    
    return array('success' => true, 'extension' => $fileExt);
}

/**
 * Generování GUID pro systemový název souboru s datem
 * Formát: 2025-11-01_abc123def456
 * PHP 5.6 compatible
 */
function generate_order_v2_file_guid() {
    // Generuj GUID s datem ve formátu YYYY-MM-DD_guid (český čas)
    $guid = sprintf(
        '%04x%04x%04x%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
    
    return TimezoneHelper::getCzechDateTime('Y-m-d') . '_' . $guid;
}

// ========== ORDER V2 ATTACHMENT HANDLERS ==========

/**
 * POST /order-v2/{id}/attachments/upload
 * Upload přílohy k objednávce
 * PHP 5.6 + MySQL 5.5.43 compatible
 */
function handle_order_v2_upload_attachment($input, $config, $queries) {
    // Token authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? $input['id'] : null;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if (!$order_id) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí ID objednávky'));
        return;
    }
    
    // Special handling for draft IDs (string IDs starting with "draft_")
    
    // Convert to int for database operations
    $numeric_order_id = is_numeric($order_id) ? (int)$order_id : 0;
    if ($numeric_order_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky'));
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
        
        // Kontrola existence objednávky
        $stmt = $db->prepare("SELECT id FROM " . get_orders_table_name() . " WHERE id = :id AND aktivni = 1");
    $numeric_order_id = intval($order_id);
    if (strpos($order_id, "draft_") === 0) {
        http_response_code(422);
        echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft objednávky"));

    }
        $stmt->bindValue(":id", $numeric_order_id, PDO::PARAM_INT);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka nebyla nalezena nebo není aktivní'));
            return;
        }
        
        // Validace uploaded file
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
        
        $typ_prilohy = isset($input['typ_prilohy']) ? $input['typ_prilohy'] : 'obj'; // default: objekt
        
        // PREFIX: Použij prefix od FE pokud existuje, jinak použij výchozí 'obj-'
        // Kontroluj jak v $input (JSON), tak v $_POST (FormData)
        $file_prefix = 'obj-'; // výchozí
        if (isset($input['file_prefix']) && !empty($input['file_prefix'])) {
            $file_prefix = $input['file_prefix'];
        } elseif (isset($_POST['file_prefix']) && !empty($_POST['file_prefix'])) {
            $file_prefix = $_POST['file_prefix'];
        }
        
        // Získání upload cesty
        $uploadPath = get_order_v2_upload_path($config, $numeric_order_id, $token_data['id']);
        
        // Vytvoření adresáře pokud neexistuje
        if (!is_dir($uploadPath)) {
            if (!mkdir($uploadPath, 0755, true)) {
                http_response_code(500);
                echo json_encode(array('status' => 'error', 'message' => 'Nelze vytvořit upload adresář'));
                return;
            }
        }
        
        // Název souboru s prefixem (výchozí obj- nebo custom) a guid (který už obsahuje datum YYYY-MM-DD)
        // Formát: {prefix}2025-11-01_abc123def456.ext
        // Příklady:
        //   - obj-2025-11-01_abc123.ext (výchozí)
        //   - fa-2025-11-01_abc123.ext (custom prefix pro faktury)
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
        
        // Uložení do databáze
        // ✅ OPRAVA: Ukládáme POUZE název souboru, NE celou cestu
        // Plnou cestu poskládáme na FE nebo při downloadu z config['upload']['root_path']
        $stmt = $db->prepare(insertOrderAttachmentQuery());
        $stmt->execute(array(
            ':objednavka_id' => $numeric_order_id,
            ':guid' => $systemovy_guid,
            ':typ_prilohy' => $typ_prilohy,
            ':originalni_nazev_souboru' => $originalni_nazev,
            ':systemova_cesta' => $finalFileName, // ✅ POUZE název souboru, ne plná cesta
            ':velikost_souboru_b' => $velikost,
            ':nahrano_uzivatel_id' => $token_data['id']
        ));
        
        $attachment_id = $db->lastInsertId();
        
        // Načtení dt_vytvoreni a dt_aktualizace z DB
        $selectStmt = $db->prepare("SELECT dt_vytvoreni, dt_aktualizace FROM " . get_order_attachments_table_name() . " WHERE id = :id");
        $selectStmt->bindValue(':id', $attachment_id, PDO::PARAM_INT);
        $selectStmt->execute();
        $timestamps = $selectStmt->fetch(PDO::FETCH_ASSOC);
        
        // Úspěšná odpověď
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'attachment_id' => $attachment_id,
                'order_id' => $numeric_order_id,
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
            'message' => 'Příloha byla úspěšně nahrána',
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'upload-attachment',
                'timestamp' => TimezoneHelper::getApiTimestamp(),
                'compatibility' => 'PHP 5.6 + MySQL 5.5.43'
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 UPLOAD ATTACHMENT Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při nahrávání přílohy: ' . $e->getMessage()));
    }
}

/**
 * GET /order-v2/{id}/attachments
 * Seznam příloh objednávky
 */
function handle_order_v2_list_attachments($input, $config, $queries) {
    // Token authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? $input['id'] : null;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if (!$order_id) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí ID objednávky'));
        return;
    }
    
    // Special handling for draft IDs (string IDs starting with "draft_")
    if (is_string($order_id) && strpos($order_id, 'draft_') === 0) {
        // Return empty attachments for drafts since they don't exist in DB yet
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(),
            'message' => 'Žádné přílohy pro draft objednávku',
            'meta' => array(
                'version' => 'v2',
                'is_draft' => true,
                'total_attachments' => 0,
                'timestamp' => TimezoneHelper::getApiTimestamp()
            )
        ));
        return;
    }
    
    // Convert to int for database lookup if it's numeric
    $numeric_order_id = is_numeric($order_id) ? (int)$order_id : 0;
    if ($numeric_order_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Kontrola existence objednávky
        $stmt = $db->prepare("SELECT id FROM " . get_orders_table_name() . " WHERE id = :id AND aktivni = 1");
    $numeric_order_id = intval($order_id);
    if (strpos($order_id, "draft_") === 0) {
        http_response_code(422);
        echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft objednávky"));
        return;
    }
        $stmt->bindValue(":id", $numeric_order_id, PDO::PARAM_INT);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka nebyla nalezena nebo není aktivní'));
            return;
        }
        
        // Načtení příloh
        $sql = "SELECT id, guid, typ_prilohy, originalni_nazev_souboru, 
                       velikost_souboru_b, systemova_cesta, dt_vytvoreni, nahrano_uzivatel_id
                FROM " . get_order_attachments_table_name() . " 
                WHERE objednavka_id = :objednavka_id 
                ORDER BY dt_vytvoreni DESC";
        
        $stmt = $db->prepare($sql);
    $numeric_order_id = intval($order_id);
    if (strpos($order_id, "draft_") === 0) {
        http_response_code(422);
        echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft objednávky"));
        return;
    }
        $stmt->bindValue(':objednavka_id', $numeric_order_id, PDO::PARAM_INT);
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
        
        // Standardizace výstupu
        $result = array();
        foreach ($attachments as $attachment) {
            // ✅ OPRAVA: Sestavení plné cesty ze systemova_cesta
            $fullPath = $attachment['systemova_cesta'];
            if (strpos($fullPath, '/') !== 0) {
                // Není to absolutní cesta -> je to pouze název souboru
                $fullPath = safe_path_join($basePath, $fullPath);
            }
            
            $result[] = array(
                'id' => (int)$attachment['id'],
                'guid' => $attachment['guid'],
                'type' => $attachment['typ_prilohy'],
                'original_name' => $attachment['originalni_nazev_souboru'],
                'filename' => $attachment['systemova_cesta'], // Pouze název souboru (nový) nebo plná cesta (starý)
                'file_path' => $basePath, // Base path z configu
                'file_size' => (int)$attachment['velikost_souboru_b'],
                'upload_date' => $attachment['dt_vytvoreni'],
                'uploaded_by_user_id' => (int)$attachment['nahrano_uzivatel_id'],
                'file_exists' => file_exists($fullPath)
            );
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'order_id' => $order_id,
                'attachments' => $result,
                'count' => count($result)
            ),
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'list-attachments',
                'timestamp' => TimezoneHelper::getApiTimestamp(),
                'compatibility' => 'PHP 5.6 + MySQL 5.5.43'
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 LIST ATTACHMENTS Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání příloh: ' . $e->getMessage()));
    }
}

/**
 * GET /order-v2/{id}/attachments/{attachment_id}
 * Download konkrétní přílohy
 */
function handle_order_v2_download_attachment($input, $config, $queries) {
    // Token authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? $input['id'] : null;
    $attachment_id = isset($input['attachment_id']) ? (int)$input['attachment_id'] : 0;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if ($order_id <= 0 || $attachment_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky nebo přílohy'));
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
        
        // Načtení přílohy s kontrolou příslušnosti k objednávce
        $sql = "SELECT originalni_nazev_souboru, systemova_cesta, velikost_souboru_b, typ_prilohy
                FROM " . get_order_attachments_table_name() . " 
                WHERE id = :attachment_id AND objednavka_id = :objednavka_id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':attachment_id', $attachment_id, PDO::PARAM_INT);
    $numeric_order_id = intval($order_id);
    if (strpos($order_id, "draft_") === 0) {
        http_response_code(422);
        echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft objednávky"));
        return;
    }
        $stmt->bindValue(':objednavka_id', $numeric_order_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attachment) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Příloha nebyla nalezena'));
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
        
        // Kontrola existence souboru
        if (!file_exists($fullPath)) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Soubor nebyl nalezen na disku: ' . basename($fullPath)));
            return;
        }
        
        // Nastavení headers pro download
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
        error_log("Order V2 DOWNLOAD ATTACHMENT Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při stahování přílohy: ' . $e->getMessage()));
    }
}

/**
 * DELETE /order-v2/{id}/attachments/{attachment_id}
 * Smazání konkrétní přílohy
 */
function handle_order_v2_delete_attachment($input, $config, $queries) {
    // Token authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? $input['id'] : null;
    $attachment_id = isset($input['attachment_id']) ? (int)$input['attachment_id'] : 0;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if ($order_id <= 0 || $attachment_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky nebo přílohy'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Načtení přílohy s kontrolou příslušnosti k objednávce
        $sql = "SELECT id, originalni_nazev_souboru, systemova_cesta
                FROM " . get_order_attachments_table_name() . " 
                WHERE id = :attachment_id AND objednavka_id = :objednavka_id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':attachment_id', $attachment_id, PDO::PARAM_INT);
    $numeric_order_id = intval($order_id);
    if (strpos($order_id, "draft_") === 0) {
        http_response_code(422);
        echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft objednávky"));
        return;
    }
        $stmt->bindValue(':objednavka_id', $numeric_order_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attachment) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Příloha nebyla nalezena'));
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
        $deleteStmt = $db->prepare("DELETE FROM " . get_order_attachments_table_name() . " WHERE id = :id");
        $deleteStmt->bindValue(':id', $attachment_id, PDO::PARAM_INT);
        $deleteStmt->execute();
        
        // Pokus o smazání souboru z disku (používáme sestavený $fullPath)
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
                'order_id' => $order_id,
                'original_name' => $attachment['originalni_nazev_souboru'],
                'file_existed' => $fileExists,
                'file_deleted_from_disk' => $fileDeleted,
                'db_record_deleted' => true
            ),
            'message' => 'Příloha byla úspěšně smazána',
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'delete-attachment',
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
        error_log("Order V2 DELETE ATTACHMENT Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání přílohy: ' . $e->getMessage()));
    }
}

/**
 * PUT /order-v2/{id}/attachments/{attachment_id}
 * Update metadat přílohy (název, typ, apod.)
 */
function handle_order_v2_update_attachment($input, $config, $queries) {
    // Token authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    $attachment_id = isset($input['attachment_id']) ? (int)$input['attachment_id'] : 0;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if ($order_id <= 0 || $attachment_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky nebo přílohy'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Nastav MySQL timezone na Europe/Prague pro NOW()
        TimezoneHelper::setMysqlTimezone($db);
        
        // Update last activity for the authenticated user
        try {
            $stmtUpd = $db->prepare($queries['uzivatele_update_last_activity']);
            $stmtUpd->bindParam(':id', $token_data['id']);
            $stmtUpd->execute();
        } catch (Exception $e) {
            // non-fatal: continue even if update fails
        }
        
        // Kontrola existence přílohy
        $checkStmt = $db->prepare("SELECT id FROM " . get_order_attachments_table_name() . " WHERE id = :id AND objednavka_id = :objednavka_id");
        $checkStmt->bindValue(':id', $attachment_id, PDO::PARAM_INT);
    $numeric_order_id = intval($order_id);
    if (strpos($order_id, "draft_") === 0) {
        http_response_code(422);
        echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft objednávky"));
        return;
    }
        $checkStmt->bindValue(':objednavka_id', $numeric_order_id, PDO::PARAM_INT);
        $checkStmt->execute();
        
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Příloha nebyla nalezena'));
            return;
        }
        
        // Příprava dat pro update - pouze ta pole která přišla
        $updateFields = array();
        $updateValues = array();
        
        if (isset($input['original_name']) && !empty($input['original_name'])) {
            $updateFields[] = 'originalni_nazev_souboru = :original_name';
            $updateValues[':original_name'] = $input['original_name'];
        }
        
        if (isset($input['type']) && !empty($input['type'])) {
            $updateFields[] = 'typ_prilohy = :type';
            $updateValues[':type'] = $input['type'];
        }
        
        if (empty($updateFields)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => 'Žádná data k aktualizaci'));
            return;
        }
        
        // Přidání dt_aktualizace
        $updateFields[] = 'dt_aktualizace = NOW()';
        
        // Update query
        $sql = "UPDATE " . get_order_attachments_table_name() . " SET " . implode(', ', $updateFields) . " WHERE id = :id";
        $updateValues[':id'] = $attachment_id;
        
        $stmt = $db->prepare($sql);
        $stmt->execute($updateValues);
        
        // Načtení aktualizovaných dat
        $selectStmt = $db->prepare("SELECT id, guid, typ_prilohy, originalni_nazev_souboru, velikost_souboru_b, dt_aktualizace FROM " . get_order_attachments_table_name() . " WHERE id = :id");
        $selectStmt->bindValue(':id', $attachment_id, PDO::PARAM_INT);
        $selectStmt->execute();
        $updated = $selectStmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'attachment_id' => (int)$updated['id'],
                'order_id' => $order_id,
                'guid' => $updated['guid'],
                'original_name' => $updated['originalni_nazev_souboru'],
                'type' => $updated['typ_prilohy'],
                'file_size' => (int)$updated['velikost_souboru_b'],
                'updated_at' => $updated['dt_aktualizace']
            ),
            'message' => 'Metadata přílohy byla úspěšně aktualizována',
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'update-attachment',
                'timestamp' => TimezoneHelper::getApiTimestamp(),
                'compatibility' => 'PHP 5.6 + MySQL 5.5.43'
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 UPDATE ATTACHMENT Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při aktualizaci přílohy: ' . $e->getMessage()));
    }
}

/**
 * POST /order-v2/{id}/attachments/verify
 * Ověření integrity všech příloh objednávky
 */
function handle_order_v2_verify_attachments($input, $config, $queries) {
    // Token authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    
    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné ID objednávky'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Kontrola existence objednávky
        $orderStmt = $db->prepare("SELECT id FROM " . get_orders_table_name() . " WHERE id = :id AND aktivni = 1");
    $numeric_order_id = intval($order_id);
    if (strpos($order_id, "draft_") === 0) {
        http_response_code(422);
        echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft objednávky"));
        return;
    }
        $orderStmt->bindValue(':id', $numeric_order_id, PDO::PARAM_INT);
        $orderStmt->execute();
        
        if (!$orderStmt->fetch()) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Objednávka nebyla nalezena nebo není aktivní'));
            return;
        }
        
        // Načtení všech příloh
        $sql = "SELECT id, guid, originalni_nazev_souboru, systemova_cesta, velikost_souboru_b
                FROM " . get_order_attachments_table_name() . " 
                WHERE objednavka_id = :objednavka_id 
                ORDER BY dt_vytvoreni";
        
        $stmt = $db->prepare($sql);
    $numeric_order_id = intval($order_id);
    if (strpos($order_id, "draft_") === 0) {
        http_response_code(422);
        echo json_encode(array("status" => "error", "message" => "Přílohy nejsou podporovány pro draft objednávky"));
        return;
    }
        $stmt->bindValue(':objednavka_id', $numeric_order_id, PDO::PARAM_INT);
        $stmt->execute();
        
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
                'order_id' => $order_id,
                'summary' => $summary,
                'attachments' => $results
            ),
            'message' => $totalAttachments > 0 ? 
                ($summary['integrity_ok'] ? 'Všechny přílohy jsou v pořádku' : 'Nalezeny problémy s přílohami') :
                'Objednávka nemá žádné přílohy',
            'meta' => array(
                'version' => 'v2',
                'endpoint' => 'verify-attachments',
                'timestamp' => TimezoneHelper::getApiTimestamp(),
                'compatibility' => 'PHP 5.6 + MySQL 5.5.43'
            )
        ));
        
    } catch (Exception $e) {
        error_log("Order V2 VERIFY ATTACHMENTS Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při ověřování příloh: ' . $e->getMessage()));
    }
}

/**
 * ORDER V2 API - List ALL attachments (všechny přílohy všech objednávek)
 * 
 * POST /api.eeo/order-v2/attachments/list
 * 
 * Input (POST JSON):
 * - username: uživatelské jméno
 * - token: autentizační token
 * - limit: (optional) počet záznamů (default 100)
 * - offset: (optional) offset pro stránkování (default 0)
 * 
 * Response: JSON seznam všech příloh s info o objednávce
 * PHP 5.6 compatible with TimezoneHelper
 */
function handle_order_v2_list_all_attachments($input, $config, $queries) {
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
        
        // Načtení všech příloh se základními info o objednávce
        $sql = "SELECT 
                    a.id,
                    a.objednavka_id,
                    a.originalni_nazev_souboru,
                    a.systemova_cesta,
                    a.velikost_souboru_b,
                    a.dt_vytvoreni,
                    a.dt_aktualizace,
                    a.nahrano_uzivatel_id,
                    o.cislo_objednavky,
                    o.predmet as objednavka_nazev
                FROM " . get_order_attachments_table_name() . " a
                INNER JOIN " . get_orders_table_name() . " o ON a.objednavka_id = o.id
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
                     FROM " . get_order_attachments_table_name() . " a
                     INNER JOIN " . get_orders_table_name() . " o ON a.objednavka_id = o.id
                     WHERE o.aktivni = 1";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute();
        $total = $countStmt->fetch(PDO::FETCH_ASSOC);
        
        // Mapping DB fields to English API format
        $mappedAttachments = array();
        foreach ($attachments as $att) {
            $mappedAttachments[] = array(
                'id' => (int)$att['id'],
                'order_id' => (int)$att['objednavka_id'],
                'original_name' => $att['originalni_nazev_souboru'],
                'system_path' => $att['systemova_cesta'],
                'file_size' => (int)$att['velikost_souboru_b'],
                'created_at' => $att['dt_vytvoreni'],
                'updated_at' => $att['dt_aktualizace'],
                'uploaded_by_user_id' => (int)$att['nahrano_uzivatel_id'],
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
        error_log("Order V2 LIST ALL ATTACHMENTS Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání příloh: ' . $e->getMessage()));
    }
}
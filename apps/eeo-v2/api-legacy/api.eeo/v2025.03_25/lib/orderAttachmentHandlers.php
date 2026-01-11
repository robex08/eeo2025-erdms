<?php

require_once 'dbconfig.php';
require_once 'orderQueries.php';
require_once __DIR__ . '/TimezoneHelper.php';

// Include necessary functions from handlers.php
if (!function_exists('verify_token')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}
if (!function_exists('api_ok')) {
    require_once 'handlers.php';
}
if (!function_exists('api_error')) {
    require_once 'handlers.php';
}

// ========== HELPER FUNCTIONS ==========

/**
 * Get upload path for orders25 attachments
 * ✅ UPDATED: objednavka_id může být NULL pro faktury bez objednávky
 */
function get_orders25_upload_path($config, $objednavka_id, $user_id) {
    // Načtení upload konfigurace
    $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
    
    // Základní cesta - preferuj root_path, jinak fallback
    $basePath = '';
    if (isset($uploadConfig['root_path']) && !empty($uploadConfig['root_path']) && is_dir($uploadConfig['root_path'])) {
        $basePath = $uploadConfig['root_path'];
    } else if (isset($uploadConfig['relative_path']) && !empty($uploadConfig['relative_path'])) {
        $basePath = $uploadConfig['relative_path'];
    } else {
        // ✅ Fallback - použij centrální environment utility
        require_once __DIR__ . '/environment-utils.php';
        $basePath = get_upload_root_path();
    }
    
    // Přidání lomítka na konec pokud chybí
    if (substr($basePath, -1) !== '/') {
        $basePath .= '/';
    }
    
    // Struktura adresářů podle konfigurace
    $subPath = '';
    $dirStructure = isset($uploadConfig['directory_structure']) ? $uploadConfig['directory_structure'] : array();
    
    if (isset($dirStructure['by_date']) && $dirStructure['by_date']) {
        $subPath .= TimezoneHelper::getCzechDateTime('Y') . '/' . TimezoneHelper::getCzechDateTime('m') . '/';
    }
    
    if (isset($dirStructure['by_order']) && $dirStructure['by_order']) {
        // ✅ Pokud není objednávka, použij "invoices_standalone" složku
        if ($objednavka_id && $objednavka_id > 0) {
            $subPath .= 'order_' . $objednavka_id . '/';
        } else {
            $subPath .= 'invoices_standalone/';
        }
    }
    
    if (isset($dirStructure['by_user']) && $dirStructure['by_user']) {
        $subPath .= 'user_' . $user_id . '/';
    }
    
    return $basePath . $subPath;
}

// ========== ATTACHMENT HANDLERS ==========

/**
 * Upload přílohy k objednávce orders25 - zpracuje metadata z FE
 * Endpoint: orders25/attachments/upload
 */
function handle_orders25_upload_attachment($config, $queries) {
    try {
        // Ověření tokenu a username
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        // Kontrola povinných parametrů z FE
        if (!isset($_POST['objednavka_id']) || empty($_POST['objednavka_id'])) {
            api_error(400, 'Chybí ID objednávky');
        }
        if (!isset($_POST['originalni_nazev']) || empty($_POST['originalni_nazev'])) {
            api_error(400, 'Chybí originální název souboru');
        }
        if (!isset($_POST['systemovy_nazev']) || empty($_POST['systemovy_nazev'])) {
            api_error(400, 'Chybí systemový GUID název');
        }
        if (!isset($_POST['velikost']) || !is_numeric($_POST['velikost'])) {
            api_error(400, 'Chybí nebo neplatná velikost souboru');
        }
        if (!isset($_POST['typ_prilohy']) || empty($_POST['typ_prilohy'])) {
            api_error(400, 'Chybí klasifikace dokumentu');
        }

        $objednavka_id = (int)$_POST['objednavka_id'];
        $originalni_nazev = $_POST['originalni_nazev'];
        $systemovy_nazev = $_POST['systemovy_nazev'];
        $velikost = (int)$_POST['velikost'];
        $typ_prilohy = $_POST['typ_prilohy']; // Obj, fa, apod.
        
        // Vyčisti možné whitespace znaky
        $systemovy_nazev = trim($systemovy_nazev);
        
        // Ověření/generování systemového názvu s prefixem (obj-/fa-) a datem
        // Podporované formáty:
        // 1. GUID samotný (bude doplněn prefix a datum)
        // 2. obj-YYYY-MM-DD_GUID nebo fa-YYYY-MM-DD_GUID (s prefixem)
        // 3. YYYY-MM-DD_GUID (bez prefixu - bude doplněn)
        // 4. obj-YYYY-MM-DD_xxxxxxxxxx nebo fa-YYYY-MM-DD_xxxxxxxxxx (alt formát)
        $is_guid = preg_match('/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/', $systemovy_nazev);
        $is_prefixed_guid = preg_match('/^(obj-|fa-)[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/', $systemovy_nazev);
        $is_date_guid = preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/', $systemovy_nazev);
        $is_alt_format = preg_match('/^(obj-|fa-)?[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9A-Fa-f]{10,}(\.[a-zA-Z0-9]+)?$/', $systemovy_nazev);
        
        // Pokud obsahuje příponu, odstraň ji pro další zpracování
        if ($is_alt_format && strpos($systemovy_nazev, '.') !== false) {
            $systemovy_nazev = substr($systemovy_nazev, 0, strrpos($systemovy_nazev, '.'));
        }
        
        // Automaticky přidej datum a prefix obj- pokud chybí
        // Formát: obj-YYYY-MM-DD_GUID (prefix obj- pro objednávky, fa- pro faktury)
        if ($is_guid) {
            // Čistý GUID → přidej prefix a datum
            $systemovy_nazev = 'obj-' . TimezoneHelper::getCzechDateTime('Y-m-d') . '_' . $systemovy_nazev;
        } else if ($is_date_guid) {
            // Má datum ale chybí prefix → přidej obj-
            if (strpos($systemovy_nazev, 'obj-') !== 0 && strpos($systemovy_nazev, 'fa-') !== 0) {
                $systemovy_nazev = 'obj-' . $systemovy_nazev;
            }
        } else if ($is_alt_format) {
            // Alt formát - zkontroluj prefix
            if (strpos($systemovy_nazev, 'obj-') !== 0 && strpos($systemovy_nazev, 'fa-') !== 0) {
                $systemovy_nazev = 'obj-' . $systemovy_nazev;
            }
        }
        // $is_prefixed_guid už má správný formát, necháme ho být
        
        if (!$is_guid && !$is_date_guid && !$is_alt_format && !$is_prefixed_guid) {
            api_error(400, 'Neplatný formát systemového názvu - očekáván GUID, obj-YYYY-MM-DD_GUID nebo fa-YYYY-MM-DD_GUID formát');
        }
        
        // Kontrola existence objednávky v tabulce 25a_objednavky
        $stmt = $db->prepare(selectOrderByIdQuery());
        $stmt->execute(array(':id' => $objednavka_id));
        if (!$stmt->fetch()) {
            api_error(404, 'Objednávka nenalezena');
        }

        // Určení cesty pro uložení souboru
        $uploadPath = get_orders25_upload_path($config, $objednavka_id, $user['id']);
        
        // Vytvoření adresáře pokud neexistuje
        if (!is_dir($uploadPath)) {
            if (!mkdir($uploadPath, 0755, true)) {
                api_error(500, 'Nelze vytvořit upload adresář');
            }
        }
        
        // Získání přípony z originálního názvu pro systemový soubor
        $fileExt = strtolower(pathinfo($originalni_nazev, PATHINFO_EXTENSION));
        $systemova_cesta = $uploadPath . $systemovy_nazev . ($fileExt ? '.' . $fileExt : '');
        
        // Načtení upload konfigurace pro validaci
        $uploadConfig = isset($config['upload']) ? $config['upload'] : array();
        
        // Validace přípony souboru
        $allowedExtensions = isset($uploadConfig['allowed_extensions']) ? 
            $uploadConfig['allowed_extensions'] : 
            array(
                // Dokumenty
                'pdf', 'doc', 'docx', 'rtf', 'odt',
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
        
        if ($fileExt && !in_array($fileExt, $allowedExtensions)) {
            api_error(400, 'Nepodporovaný typ souboru. Povolené typy: ' . implode(', ', $allowedExtensions));
        }

        // Validace velikosti podle konfigurace
        $maxFileSize = isset($uploadConfig['max_file_size']) ? 
            $uploadConfig['max_file_size'] : (20 * 1024 * 1024); // 20MB default
            
        if ($velikost > $maxFileSize) {
            api_error(400, 'Soubor je příliš velký. Maximální velikost: ' . ($maxFileSize / 1024 / 1024) . ' MB');
        }

        // Zpracování nahraného souboru pokud byl poslán
        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            // Přesun souboru na finální místo s GUID názvem
            if (!move_uploaded_file($_FILES['file']['tmp_name'], $systemova_cesta)) {
                api_error(500, 'Nelze uložit soubor');
            }
        } else {
            // Pokud soubor nebyl nahrán, vytvoř prázdný soubor (placeholder)
            if (!touch($systemova_cesta)) {
                api_error(500, 'Nelze vytvořit soubor');
            }
        }

        // Vygenerování GUID pro záznam v DB - extrahování z systemového názvu
        // Podporuje formáty: obj-YYYY-MM-DD_GUID, fa-YYYY-MM-DD_GUID, YYYY-MM-DD_GUID
        if (preg_match('/^(obj-|fa-)?[0-9]{4}-[0-9]{2}-[0-9]{2}_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i', $systemovy_nazev, $matches)) {
            $guid = strtoupper($matches[2]); // Extrahuj GUID část (druhá skupina)
        } else {
            $guid = strtoupper($systemovy_nazev); // Fallback pro starý formát
        }
        
        // Kontrola duplicitního GUID
        $stmtCheck = $db->prepare(selectAttachmentByGuidQuery());
        $stmtCheck->execute(array(':guid' => $guid));
        if ($stmtCheck->fetch()) {
            // Smaž vytvořený soubor a vrat chybu
            if (file_exists($systemova_cesta)) {
                unlink($systemova_cesta);
            }
            api_error(400, 'GUID již existuje v databázi');
        }
        
        // Uložení záznamu do databáze
        $stmt = $db->prepare(insertOrderAttachmentQuery());
        $result = $stmt->execute(array(
            ':objednavka_id' => $objednavka_id,
            ':guid' => $guid,
            ':typ_prilohy' => $typ_prilohy,
            ':originalni_nazev_souboru' => $originalni_nazev,
            ':systemova_cesta' => $systemova_cesta,
            ':velikost_souboru_b' => $velikost,
            ':nahrano_uzivatel_id' => $user['id']
        ));
        
        if (!$result) {
            // Smaž soubor pokud se nepodařilo uložit do DB
            if (file_exists($systemova_cesta)) {
                unlink($systemova_cesta);
            }
            api_error(500, 'Chyba při ukládání do databáze');
        }
        
        $attachment_id = $db->lastInsertId();
        
        // Úspěšná odpověď
        api_ok(array(
            'id' => (int)$attachment_id,
            'guid' => $guid,
            'originalni_nazev' => $originalni_nazev,
            'systemovy_nazev' => $systemovy_nazev,
            'velikost' => $velikost,
            'typ_prilohy' => $typ_prilohy,
            'message' => 'Příloha úspěšně nahrána'
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při nahrávání přílohy: ' . $e->getMessage());
    }
}

/**
 * Seznam příloh k objednávce orders25
 * Endpoint: orders25/attachments/list
 */
function handle_orders25_get_attachments($config, $queries) {
    try {
        // Dekódování JSON vstupu
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            api_error(400, 'Neplatný JSON vstup');
        }

        // Ověření tokenu a username
        $token = isset($input['token']) ? $input['token'] : '';
        $username = isset($input['username']) ? $input['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        // Kontrola povinného parametru
        if (!isset($input['objednavka_id']) || empty($input['objednavka_id'])) {
            api_error(400, 'Chybí ID objednávky');
        }

        $objednavka_id = (int)$input['objednavka_id'];
        
        // Kontrola existence objednávky
        $stmt = $db->prepare(selectOrderByIdQuery());
        $stmt->execute(array(':id' => $objednavka_id));
        if (!$stmt->fetch()) {
            api_error(404, 'Objednávka nenalezena');
        }

        // Získání příloh
        $stmt = $db->prepare(selectAttachmentsByOrderIdQuery());
        $stmt->execute(array(':objednavka_id' => $objednavka_id));
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Přidání informací o uživatelích
        foreach ($attachments as &$attachment) {
            if ($attachment['nahrano_uzivatel_id']) {
                $userStmt = $db->prepare("SELECT username, jmeno, prijmeni FROM 25_uzivatele WHERE id = :id");
                $userStmt->execute(array(':id' => $attachment['nahrano_uzivatel_id']));
                $userInfo = $userStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($userInfo) {
                    $attachment['nahrano_uzivatel'] = array(
                        'username' => $userInfo['username'],
                        'jmeno' => $userInfo['jmeno'],
                        'prijmeni' => $userInfo['prijmeni']
                    );
                }
            }
            
            // Přidání informace o existenci souboru na disku
            $attachment['file_exists'] = file_exists($attachment['systemova_cesta']);
        }

        api_ok(array(
            'attachments' => $attachments,
            'count' => count($attachments),
            'objednavka_id' => $objednavka_id
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při načítání příloh: ' . $e->getMessage());
    }
}

/**
 * Stažení přílohy orders25
 * Endpoint: orders25/attachments/download
 */
function handle_orders25_download_attachment($config, $queries) {
    try {
        // Dekódování JSON vstupu
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            api_error(400, 'Neplatný JSON vstup');
        }

        // Ověření tokenu a username
        $token = isset($input['token']) ? $input['token'] : '';
        $username = isset($input['username']) ? $input['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        // Kontrola povinného parametru
        if (!isset($input['attachment_id']) && !isset($input['guid'])) {
            api_error(400, 'Chybí ID přílohy nebo GUID');
        }

        // Získání přílohy podle ID nebo GUID
        if (isset($input['attachment_id'])) {
            $stmt = $db->prepare(selectAttachmentByIdQuery());
            $stmt->execute(array(':id' => (int)$input['attachment_id']));
        } else {
            $stmt = $db->prepare(selectAttachmentByGuidQuery());
            $stmt->execute(array(':guid' => $input['guid']));
        }
        
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$attachment) {
            api_error(404, 'Příloha nenalezena');
        }

        // Kontrola existence souboru
        $filePath = $attachment['systemova_cesta'];
        $originalName = $attachment['originalni_nazev_souboru'];
        
        // Kontrola, zda je systemova_cesta URL (začíná http:// nebo https://)
        $isUrl = (stripos($filePath, 'http://') === 0 || stripos($filePath, 'https://') === 0);
        
        // Pro importované přílohy - speciální zpracování
        if (isset($attachment['typ_prilohy']) && $attachment['typ_prilohy'] === 'IMPORT') {
            if ($isUrl) {
                // Systemova_cesta je URL - přesměrujeme na ni
                header('Location: ' . $filePath);
                exit;
            } else {
                // Lokální cesta - importované přílohy - soubor může neexistovat v novém systému
                if (!file_exists($filePath)) {
                    api_error(404, 'Importovaná příloha - soubor není dostupný v novém systému. Kontaktujte administrátora pro přístup k archivu.');
                }
            }
        } else {
            // Nové přílohy - měly by být vždy lokální soubory
            if ($isUrl) {
                api_error(400, 'Nepodporovaný typ přílohy - URL u běžných příloh');
            }
            if (!file_exists($filePath)) {
                // ✅ Uživatelsky přívětivá chybová zpráva
                $errorMsg = 'Nepodařilo se stáhnout přílohu "' . $originalName . '". ';
                $errorMsg .= 'Soubor nebyl nalezen na serveru. ';
                $errorMsg .= 'Příloha mohla být odstraněna nebo přesunuta. ';
                $errorMsg .= 'Pro obnovení přílohy kontaktujte prosím administrátora.';
                
                // Log pro administrátora s plnou cestou
                error_log('PŘÍLOHA NENALEZENA: ' . $filePath . ' (attachment_id: ' . $attachment['id'] . ', original: ' . $originalName . ')');
                
                api_error(404, $errorMsg);
            }
        }

        // Příprava pro stažení
        $fileSize = filesize($filePath);
        
        // Nastavení headers pro download
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $originalName . '"');
        header('Content-Length: ' . $fileSize);
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        // Výstup souboru
        readfile($filePath);
        exit;

    } catch (Exception $e) {
        api_error(500, 'Chyba při stahování přílohy: ' . $e->getMessage());
    }
}

/**
 * Smazání přílohy orders25
 * Endpoint: orders25/attachments/delete
 */
function handle_orders25_delete_attachment($config, $queries) {
    try {
        // Dekódování JSON vstupu
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            api_error(400, 'Neplatný JSON vstup');
        }

        // Ověření tokenu a username
        $token = isset($input['token']) ? $input['token'] : '';
        $username = isset($input['username']) ? $input['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        // Kontrola povinného parametru
        if (!isset($input['attachment_id']) && !isset($input['guid'])) {
            api_error(400, 'Chybí ID přílohy nebo GUID');
        }

        // Získání přílohy pro ověření existence a cesty k souboru
        if (isset($input['attachment_id'])) {
            $stmt = $db->prepare(selectAttachmentByIdQuery());
            $stmt->execute(array(':id' => (int)$input['attachment_id']));
            $deleteStmt = $db->prepare(deleteAttachmentByIdQuery());
            $deleteParams = array(':id' => (int)$input['attachment_id']);
        } else {
            $stmt = $db->prepare(selectAttachmentByGuidQuery());
            $stmt->execute(array(':guid' => $input['guid']));
            $deleteStmt = $db->prepare(deleteAttachmentByGuidQuery());
            $deleteParams = array(':guid' => $input['guid']);
        }
        
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$attachment) {
            api_error(404, 'Příloha nenalezena');
        }

        // Smazání souboru z disku
        $fileDeleted = false;
        if (file_exists($attachment['systemova_cesta'])) {
            $fileDeleted = unlink($attachment['systemova_cesta']);
        } else {
            $fileDeleted = true; // Soubor už neexistuje, považujeme za úspěch
        }

        // Smazání záznamu z databáze
        $dbResult = $deleteStmt->execute($deleteParams);
        
        if (!$dbResult) {
            api_error(500, 'Chyba při mazání z databáze');
        }

        api_ok(array(
            'message' => 'Příloha byla úspěšně smazána',
            'file_deleted' => $fileDeleted,
            'db_deleted' => true,
            'attachment_id' => $attachment['id'],
            'guid' => $attachment['guid']
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při mazání přílohy: ' . $e->getMessage());
    }
}

/**
 * Aktualizace přílohy orders25 (pouze metadata, ne soubor)
 * Endpoint: orders25/attachments/update
 */
function handle_orders25_update_attachment($config, $queries) {
    try {
        // Dekódování JSON vstupu
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            api_error(400, 'Neplatný JSON vstup');
        }

        // Ověření tokenu a username
        $token = isset($input['token']) ? $input['token'] : '';
        $username = isset($input['username']) ? $input['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }
        
        // Nastav MySQL timezone na Europe/Prague pro NOW()
        TimezoneHelper::setMysqlTimezone($db);

        // Kontrola povinných parametrů
        if (!isset($input['attachment_id'])) {
            api_error(400, 'Chybí ID přílohy');
        }
        if (!isset($input['typ_prilohy'])) {
            api_error(400, 'Chybí typ přílohy');
        }

        $attachment_id = (int)$input['attachment_id'];
        $typ_prilohy = $input['typ_prilohy'];

        // Kontrola existence přílohy
        $stmt = $db->prepare(selectAttachmentByIdQuery());
        $stmt->execute(array(':id' => $attachment_id));
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$attachment) {
            api_error(404, 'Příloha nenalezena');
        }

        // Aktualizace přílohy (používá NOW() pro dt_aktualizace)
        $updateStmt = $db->prepare(updateAttachmentQuery());
        $result = $updateStmt->execute(array(
            ':id' => $attachment_id,
            ':typ_prilohy' => $typ_prilohy
        ));
        
        if (!$result) {
            api_error(500, 'Chyba při aktualizaci přílohy');
        }

        api_ok(array(
            'message' => 'Příloha byla úspěšně aktualizována',
            'attachment_id' => $attachment_id,
            'typ_prilohy' => $typ_prilohy
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při aktualizaci přílohy: ' . $e->getMessage());
    }
}

/**
 * Ověření integrity příloh orders25
 * Endpoint: orders25/attachments/verify
 */
function handle_orders25_verify_attachments($config, $queries) {
    try {
        // Dekódování JSON vstupu
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            api_error(400, 'Neplatný JSON vstup');
        }

        // Ověření tokenu a username
        $token = isset($input['token']) ? $input['token'] : '';
        $username = isset($input['username']) ? $input['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        // Kontrola povinného parametru
        if (!isset($input['objednavka_id'])) {
            api_error(400, 'Chybí ID objednávky');
        }

        $objednavka_id = (int)$input['objednavka_id'];
        
        // Kontrola existence objednávky
        $stmt = $db->prepare(selectOrderByIdQuery());
        $stmt->execute(array(':id' => $objednavka_id));
        if (!$stmt->fetch()) {
            api_error(404, 'Objednávka nenalezena');
        }

        // Získání všech příloh k objednávce
        $stmt = $db->prepare(selectAttachmentsByOrderIdQuery());
        $stmt->execute(array(':objednavka_id' => $objednavka_id));
        $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $verificationResults = array();
        $totalAttachments = count($attachments);
        $validAttachments = 0;
        $missingFiles = 0;
        $sizeMismatch = 0;

        foreach ($attachments as $attachment) {
            $result = array(
                'id' => $attachment['id'],
                'guid' => $attachment['guid'],
                'originalni_nazev' => $attachment['originalni_nazev_souboru'],
                'systemova_cesta' => $attachment['systemova_cesta'],
                'db_velikost' => $attachment['velikost_souboru_b'],
                'file_exists' => false,
                'file_size' => null,
                'size_matches' => false,
                'status' => 'error'
            );

            // Kontrola existence souboru
            if (file_exists($attachment['systemova_cesta'])) {
                $result['file_exists'] = true;
                $result['file_size'] = filesize($attachment['systemova_cesta']);
                
                // Kontrola velikosti
                if ($result['file_size'] == $attachment['velikost_souboru_b']) {
                    $result['size_matches'] = true;
                    $result['status'] = 'ok';
                    $validAttachments++;
                } else {
                    $result['status'] = 'size_mismatch';
                    $sizeMismatch++;
                }
            } else {
                $result['status'] = 'missing_file';
                $missingFiles++;
            }

            $verificationResults[] = $result;
        }

        api_ok(array(
            'objednavka_id' => $objednavka_id,
            'summary' => array(
                'total_attachments' => $totalAttachments,
                'valid_attachments' => $validAttachments,
                'missing_files' => $missingFiles,
                'size_mismatch' => $sizeMismatch,
                'integrity_ok' => ($validAttachments === $totalAttachments)
            ),
            'attachments' => $verificationResults
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při ověřování příloh: ' . $e->getMessage());
    }
}
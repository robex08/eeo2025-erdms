<?php
/**
 * ============================================================================
 * 📎 ROČNÍ POPLATKY - ATTACHMENTS HANDLERS
 * ============================================================================
 * 
 * Obslužné funkce pro správu příloh ročních poplatků
 * 
 * Endpointy:
 * - annual-fees/attachments/upload      - Nahrání přílohy
 * - annual-fees/attachments/list        - Seznam příloh pro roční poplatek
 * - annual-fees/attachments/download    - Stažení přílohy
 * - annual-fees/attachments/delete      - Smazání přílohy
 * 
 * Prefix souborů: "rp-" (roční poplatek)
 * Ukládání: /data/eeo-v2/prilohy/ (bez podsložky, pouze prefix)
 * 
 * DŮLEŽITÉ: Používá TBL_ROCNI_POPLATKY_PRILOHY konstantu z api.php
 * 
 * @version 1.0.1
 * @date 2026-01-31
 */

require_once __DIR__ . '/annualFeesHandlers.php'; // Pro kontrolu oprávnění
require_once __DIR__ . '/TimezoneHelper.php'; // Pro správnou timezone

// ============================================================================
// KONSTANTY
// ============================================================================

define('ANNUAL_FEES_UPLOAD_DIR', ''); // Žádný subdirectory - soubory přímo v /data/eeo-v2/prilohy/
define('ANNUAL_FEES_FILE_PREFIX', 'rp-'); // Prefix pro soubory (jako obj-, fa-)
define('ANNUAL_FEES_MAX_FILE_SIZE', 10 * 1024 * 1024); // 10 MB

// Funkce pro povolené typy souborů
function getAnnualFeesAllowedTypes() {
    return [
        'pdf'  => 'application/pdf',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'doc'  => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls'  => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xml'  => 'text/xml',
    ];
}

// ============================================================================
// 📤 UPLOAD PŘÍLOHY
// ============================================================================

/**
 * Nahrání přílohy k ročnímu poplatku
 * 
 * @param PDO $pdo
 * @param array $input - POST data
 * @param array $user - Uživatelská session
 * @return array Response
 */
function handleAnnualFeeAttachmentUpload($pdo, $input, $user) {
    try {
        error_log("=== ANNUAL FEES UPLOAD START ===");
        error_log("User: " . json_encode($user));
        error_log("Input: " . json_encode($input));
        error_log("Files: " . json_encode($_FILES));
        
        // Kontrola oprávnění - musí mít VIEW nebo vyšší
        if (!canViewAnnualFees($user)) {
            error_log("Permission denied for user");
            return [
                'success' => false,
                'error' => 'Nemáte oprávnění pro nahrávání příloh ročních poplatků',
                'error_code' => 'PERMISSION_DENIED'
            ];
        }
        
        error_log("Permission check passed");
        
        // Validace vstupu
        if (!isset($input['rocni_poplatek_id']) || empty($input['rocni_poplatek_id'])) {
            error_log("Missing rocni_poplatek_id");
            return [
                'success' => false,
                'error' => 'Chybí ID ročního poplatku',
                'error_code' => 'MISSING_ROCNI_POPLATEK_ID'
            ];
        }
        
        $rocniPoplatekId = intval($input['rocni_poplatek_id']);
        error_log("rocni_poplatek_id: " . $rocniPoplatekId);
        
        // Nastavení timezone pro MySQL session
        TimezoneHelper::setMysqlTimezone($pdo);
        
        // Kontrola existence ročního poplatku - použití konstanty
        $stmt = $pdo->prepare("SELECT id, nazev FROM " . TBL_ROCNI_POPLATKY . " WHERE id = ?");
        $stmt->execute([$rocniPoplatekId]);
        $rocniPoplatek = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$rocniPoplatek) {
            return [
                'success' => false,
                'error' => 'Roční poplatek nenalezen',
                'error_code' => 'ROCNI_POPLATEK_NOT_FOUND'
            ];
        }
        
        // Kontrola nahraného souboru
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = isset($_FILES['file']) ? 'Upload error: ' . $_FILES['file']['error'] : 'No file uploaded';
            return [
                'success' => false,
                'error' => 'Chyba při nahrávání souboru: ' . $errorMsg,
                'error_code' => 'UPLOAD_ERROR'
            ];
        }
        
        $file = $_FILES['file'];
        $originalName = $file['name'];
        $fileSize = $file['size'];
        $tmpPath = $file['tmp_name'];
        
        // Kontrola velikosti
        if ($fileSize > ANNUAL_FEES_MAX_FILE_SIZE) {
            return [
                'success' => false,
                'error' => 'Soubor je příliš velký (max 10 MB)',
                'error_code' => 'FILE_TOO_LARGE'
            ];
        }
        
        // Kontrola přípony
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $allowedTypes = getAnnualFeesAllowedTypes();
        
        if (!array_key_exists($extension, $allowedTypes)) {
            return [
                'success' => false,
                'error' => 'Nepodporovaný typ souboru: ' . $extension,
                'error_code' => 'INVALID_FILE_TYPE',
                'allowed_types' => array_keys($allowedTypes)
            ];
        }
        
        $mimeType = $allowedTypes[$extension];
        
        // Generování unikátního názvu
        $timestamp = date('YmdHis');
        $randomString = bin2hex(random_bytes(8));
        $storedName = ANNUAL_FEES_FILE_PREFIX . $timestamp . '_' . $randomString . '.' . $extension;
        
        // Cesta k uložení (relativní)
        $uploadDir = ANNUAL_FEES_UPLOAD_DIR;
        $relativeFilePath = !empty($uploadDir) ? $uploadDir . '/' . $storedName : $storedName;
        
        // Absolutní cesta (detekce z ENV nebo fallback)
        $uploadRootPath = getenv('UPLOAD_ROOT_PATH') ?: '/var/www/erdms-dev/data/eeo-v2/prilohy/';
        $fullUploadDir = rtrim($uploadRootPath, '/');
        if (!empty($uploadDir)) {
            $fullUploadDir .= '/' . $uploadDir;
        }
        $fullFilePath = $fullUploadDir . '/' . $storedName;
        
        // Vytvoření adresáře, pokud neexistuje
        if (!is_dir($fullUploadDir)) {
            if (!mkdir($fullUploadDir, 0755, true)) {
                return [
                    'success' => false,
                    'error' => 'Nepodařilo se vytvořit upload adresář',
                    'error_code' => 'DIRECTORY_CREATE_ERROR'
                ];
            }
        }
        
        // Přesun souboru
        if (!move_uploaded_file($tmpPath, $fullFilePath)) {
            return [
                'success' => false,
                'error' => 'Nepodařilo se uložit soubor',
                'error_code' => 'FILE_MOVE_ERROR'
            ];
        }
        
        // Generování GUID
        $guid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
        
        // Uložení do databáze - správné názvy sloupců
        $typPrilohy = $input['typ_prilohy'] ?? 'PRILOHA';
        
        $stmt = $pdo->prepare("
            INSERT INTO " . TBL_ROCNI_POPLATKY_PRILOHY . " 
            (rocni_poplatek_id, guid, typ_prilohy, originalni_nazev_souboru, 
             systemova_cesta, velikost_souboru_b, nahrano_uzivatel_id, dt_vytvoreni)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $rocniPoplatekId,
            $guid,
            $typPrilohy,
            $originalName,
            $relativeFilePath,
            $fileSize,
            $user['id']
        ]);
        
        $attachmentId = $pdo->lastInsertId();
        
        // Načtení vytvořené přílohy
        $stmt = $pdo->prepare("
            SELECT 
                p.*,
                CONCAT(u.jmeno, ' ', u.prijmeni) as nahrano_jmeno
            FROM " . TBL_ROCNI_POPLATKY_PRILOHY . " p
            LEFT JOIN " . TBL_UZIVATELE . " u ON p.nahrano_uzivatel_id = u.id
            WHERE p.id = ?
        ");
        $stmt->execute([$attachmentId]);
        $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
        
        error_log("Upload successful, attachment_id: " . $attachmentId);
        
        return [
            'success' => true,
            'message' => 'Příloha byla úspěšně nahrána',
            'attachment' => $attachment,
            'attachment_id' => $attachmentId
        ];
        
    } catch (Exception $e) {
        error_log("❌ UPLOAD ERROR: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        return [
            'success' => false,
            'error' => 'Chyba při nahrávání: ' . $e->getMessage(),
            'error_code' => 'UPLOAD_EXCEPTION'
        ];
    }
}

// ============================================================================
// 📋 SEZNAM PŘÍLOH
// ============================================================================

/**
 * Seznam příloh pro roční poplatek
 * 
 * @param PDO $pdo
 * @param array $input - POST data
 * @param array $user - Uživatelská session
 * @return array Response
 */
function handleAnnualFeeAttachmentsList($pdo, $input, $user) {
    // Kontrola oprávnění
    if (!canViewAnnualFees($user)) {
        return [
            'success' => false,
            'error' => 'Nemáte oprávnění pro zobrazení příloh',
            'error_code' => 'PERMISSION_DENIED'
        ];
    }
    
    if (!isset($input['rocni_poplatek_id']) || empty($input['rocni_poplatek_id'])) {
        return [
            'success' => false,
            'error' => 'Chybí ID ročního poplatku',
            'error_code' => 'MISSING_ROCNI_POPLATEK_ID'
        ];
    }
    
    $rocniPoplatekId = intval($input['rocni_poplatek_id']);
    
    // Nastavení timezone
    TimezoneHelper::setMysqlTimezone($pdo);
    
    // Seznam příloh
    $stmt = $pdo->prepare("
        SELECT 
            p.*,
            CONCAT(u.jmeno, ' ', u.prijmeni) as nahrano_jmeno
        FROM " . TBL_ROCNI_POPLATKY_PRILOHY . " p
        LEFT JOIN " . TBL_UZIVATELE . " u ON p.nahrano_uzivatel_id = u.id
        WHERE p.rocni_poplatek_id = ?
        ORDER BY p.dt_vytvoreni DESC
    ");
    
    $stmt->execute([$rocniPoplatekId]);
    $attachments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Kontrola existence souborů na disku
    $uploadRootPath = getenv('UPLOAD_ROOT_PATH') ?: '/var/www/erdms-dev/data/eeo-v2/prilohy/';
    
    foreach ($attachments as &$att) {
        $fullPath = rtrim($uploadRootPath, '/') . '/' . $att['systemova_cesta'];
        $att['file_exists'] = file_exists($fullPath);
    }
    unset($att);
    
    return [
        'success' => true,
        'data' => $attachments,
        'count' => count($attachments)
    ];
}

// ============================================================================
// 📥 DOWNLOAD PŘÍLOHY
// ============================================================================

/**
 * Stažení přílohy
 * 
 * @param PDO $pdo
 * @param array $input - POST data
 * @param array $user - Uživatelská session
 * @return void (sends file or JSON error)
 */
function handleAnnualFeeAttachmentDownload($pdo, $input, $user) {
    // Kontrola oprávnění
    if (!canViewAnnualFees($user)) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Nemáte oprávnění pro stahování příloh',
            'error_code' => 'PERMISSION_DENIED'
        ]);
        exit;
    }
    
    if (!isset($input['attachment_id']) || empty($input['attachment_id'])) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Chybí ID přílohy',
            'error_code' => 'MISSING_ATTACHMENT_ID'
        ]);
        exit;
    }
    
    $attachmentId = intval($input['attachment_id']);
    
    // Nastavení timezone
    TimezoneHelper::setMysqlTimezone($pdo);
    
    // Načtení přílohy
    $stmt = $pdo->prepare("
        SELECT * FROM " . TBL_ROCNI_POPLATKY_PRILOHY . " WHERE id = ?
    ");
    $stmt->execute([$attachmentId]);
    $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$attachment) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Příloha nenalezena',
            'error_code' => 'ATTACHMENT_NOT_FOUND'
        ]);
        exit;
    }
    
    // Cesta k souboru
    $uploadRootPath = getenv('UPLOAD_ROOT_PATH') ?: '/var/www/erdms-dev/data/eeo-v2/prilohy/';
    $fullPath = rtrim($uploadRootPath, '/') . '/' . $attachment['systemova_cesta'];
    
    if (!file_exists($fullPath)) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Soubor nenalezen na disku',
            'error_code' => 'FILE_NOT_FOUND',
            'expected_path' => $fullPath
        ]);
        exit;
    }
    
    // Zjistění MIME typu z přípony
    $extension = strtolower(pathinfo($attachment['originalni_nazev_souboru'], PATHINFO_EXTENSION));
    $allowedTypes = getAnnualFeesAllowedTypes();
    $mimeType = $allowedTypes[$extension] ?? 'application/octet-stream';
    
    // Odeslání souboru
    header('Content-Type: ' . $mimeType);
    header('Content-Disposition: attachment; filename="' . $attachment['originalni_nazev_souboru'] . '"');
    header('Content-Length: ' . filesize($fullPath));
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    
    readfile($fullPath);
    exit;
}

// ============================================================================
// 🗑️ SMAZÁNÍ PŘÍLOHY
// ============================================================================

/**
 * Smazání přílohy
 * 
 * @param PDO $pdo
 * @param array $input - POST data
 * @param array $user - Uživatelská session
 * @return array Response
 */
function handleAnnualFeeAttachmentDelete($pdo, $input, $user) {
    // Kontrola oprávnění - musí mít EDIT nebo MANAGE
    if (!hasAnyAnnualFeesPermission($user, ['ANNUAL_FEES_MANAGE', 'ANNUAL_FEES_EDIT']) && !isAnnualFeesAdmin($user)) {
        return [
            'success' => false,
            'error' => 'Nemáte oprávnění pro mazání příloh',
            'error_code' => 'PERMISSION_DENIED'
        ];
    }
    
    if (!isset($input['attachment_id']) || empty($input['attachment_id'])) {
        return [
            'success' => false,
            'error' => 'Chybí ID přílohy',
            'error_code' => 'MISSING_ATTACHMENT_ID'
        ];
    }
    
    $attachmentId = intval($input['attachment_id']);
    
    // Nastavení timezone
    TimezoneHelper::setMysqlTimezone($pdo);
    
    // Načtení přílohy
    $stmt = $pdo->prepare("
        SELECT * FROM " . TBL_ROCNI_POPLATKY_PRILOHY . " WHERE id = ?
    ");
    $stmt->execute([$attachmentId]);
    $attachment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$attachment) {
        return [
            'success' => false,
            'error' => 'Příloha nenalezena',
            'error_code' => 'ATTACHMENT_NOT_FOUND'
        ];
    }
    
    // Cesta k souboru
    $uploadRootPath = getenv('UPLOAD_ROOT_PATH') ?: '/var/www/erdms-dev/data/eeo-v2/prilohy/';
    $fullPath = rtrim($uploadRootPath, '/') . '/' . $attachment['systemova_cesta'];
    
    // Smazání souboru z disku
    $fileDeleted = false;
    if (file_exists($fullPath)) {
        $fileDeleted = unlink($fullPath);
    }
    
    // Smazání záznamu z databáze
    $stmt = $pdo->prepare("DELETE FROM " . TBL_ROCNI_POPLATKY_PRILOHY . " WHERE id = ?");
    $stmt->execute([$attachmentId]);
    
    return [
        'success' => true,
        'message' => 'Příloha byla úspěšně smazána',
        'file_deleted' => $fileDeleted,
        'db_deleted' => $stmt->rowCount() > 0
    ];
}

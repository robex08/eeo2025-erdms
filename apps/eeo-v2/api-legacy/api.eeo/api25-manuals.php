<?php
/**
 * API25 - Manuals Endpoint
 * Správa a distribuce PDF manuálů
 * 
 * @version 1.0.0
 * @date 2025-12-30
 */

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 3600');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Načtení environment proměnných
require_once __DIR__ . '/v2025.03_25/lib/env-loader.php';
require_once __DIR__ . '/v2025.03_25/middleware/authentication.php';
require_once __DIR__ . '/v2025.03_25/lib/handlers.php';
require_once __DIR__ . '/v2025.03_25/lib/environment-utils.php';

// Cesta k manuálům - automatická detekce prostředí z ENV
$manualsPath = get_manuals_path();

// Routing
$requestUri = $_SERVER['REQUEST_URI'];
$pathInfo = parse_url($requestUri, PHP_URL_PATH);

// Odstranění base path - detekce prostředí
$isDev = is_dev_environment();
$basePath = $isDev ? '/dev/api.eeo/api25/manuals' : '/api.eeo/api25/manuals';
$route = str_replace($basePath, '', $pathInfo);
$route = trim($route, '/');

// Router
switch ($route) {
    case 'list':
        handleListManuals($manualsPath);
        break;
    
    case 'upload':
        handleUploadManual($manualsPath);
        break;
    
    case 'delete':
        handleDeleteManual($manualsPath);
        break;
    
    case (preg_match('/^download\/(.+)$/', $route, $matches) ? true : false):
        handleDownloadManual($manualsPath, $matches[1]);
        break;
    
    default:
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Endpoint nenalezen'
        ]);
        break;
}

/**
 * Seznam všech dostupných manuálů
 */
function handleListManuals($manualsPath) {
    header('Content-Type: application/json; charset=utf-8');
    
    if (!is_dir($manualsPath)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Adresář s manuály nebyl nalezen'
        ]);
        return;
    }
    
    $manuals = [];
    $files = scandir($manualsPath);
    
    foreach ($files as $file) {
        // Pouze PDF soubory
        if (pathinfo($file, PATHINFO_EXTENSION) !== 'pdf') {
            continue;
        }
        
        $filePath = $manualsPath . '/' . $file;
        
        if (!is_file($filePath)) {
            continue;
        }
        
        $fileSize = filesize($filePath);
        $fileTime = filemtime($filePath);
        
        // Získání "hezčího" názvu (bez .pdf)
        $displayName = pathinfo($file, PATHINFO_FILENAME);
        
        $manuals[] = [
            'filename' => $file,
            'displayName' => $displayName,
            'size' => $fileSize,
            'modified' => date('Y-m-d H:i:s', $fileTime),
            'modifiedTimestamp' => $fileTime
        ];
    }
    
    // Seřadit podle názvu
    usort($manuals, function($a, $b) {
        return strcmp($a['displayName'], $b['displayName']);
    });
    
    echo json_encode([
        'success' => true,
        'manuals' => $manuals,
        'count' => count($manuals)
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

/**
 * Stažení/zobrazení manuálu
 */
function handleDownloadManual($manualsPath, $filename) {
    // Dekódování URL encoding
    $filename = urldecode($filename);
    
    // Bezpečnostní kontrola - zabránit directory traversal
    $filename = basename($filename);
    
    // Kontrola, že je to PDF
    if (pathinfo($filename, PATHINFO_EXTENSION) !== 'pdf') {
        http_response_code(400);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => 'Pouze PDF soubory jsou povoleny'
        ]);
        return;
    }
    
    $filePath = $manualsPath . '/' . $filename;
    
    // Kontrola existence souboru
    if (!file_exists($filePath) || !is_file($filePath)) {
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => 'Soubor nebyl nalezen'
        ]);
        return;
    }
    
    // Parametr download=1 pro force download
    $forceDownload = isset($_GET['download']) && $_GET['download'] == '1';
    
    // Headers pro PDF
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($filePath));
    
    if ($forceDownload) {
        // Force download
        header('Content-Disposition: attachment; filename="' . $filename . '"');
    } else {
        // Inline zobrazení v prohlížeči
        header('Content-Disposition: inline; filename="' . $filename . '"');
    }
    
    // Cache control
    header('Cache-Control: private, max-age=3600');
    header('Pragma: cache');
    
    // Odeslání souboru
    readfile($filePath);
    exit();
}

/**
 * Upload nového manuálu (pouze pro adminy)
 */
function handleUploadManual($manualsPath) {
    header('Content-Type: application/json; charset=utf-8');
    
    // Kontrola POST metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Pouze POST metoda je podporována'
        ]);
        return;
    }
    
    // Získání token a username z POST dat
    $token = $_POST['token'] ?? '';
    $username = $_POST['username'] ?? '';
    
    if (empty($token) || empty($username)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Chybí token nebo username'
        ]);
        return;
    }
    
    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Neplatný token'
        ]);
        return;
    }
    
    // Kontrola admin práv
    $userRoles = $token_data['roles'] ?? [];
    if (!in_array('admin', $userRoles)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Nedostatečná oprávnění - pouze administrátoři mohou nahrávat manuály'
        ]);
        return;
    }
    
    // Kontrola adresáře
    if (!is_dir($manualsPath)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Adresář s manuály nebyl nalezen'
        ]);
        return;
    }
    
    // Kontrola uploadu souboru
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Chyba při nahrávání souboru'
        ]);
        return;
    }
    
    $file = $_FILES['file'];
    $filename = basename($file['name']);
    
    // Kontrola, že je to PDF
    if (pathinfo($filename, PATHINFO_EXTENSION) !== 'pdf') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Pouze PDF soubory jsou povoleny'
        ]);
        return;
    }
    
    // Kontrola velikosti (max 50 MB)
    $maxSize = 50 * 1024 * 1024; // 50 MB
    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Soubor je příliš velký (max 50 MB)'
        ]);
        return;
    }
    
    // Bezpečnostní kontrola názvu souboru
    if (!preg_match('/^[\p{L}\p{N}\s_\-\.]+\.pdf$/ui', $filename)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Neplatný název souboru'
        ]);
        return;
    }
    
    // Cílová cesta
    $targetPath = $manualsPath . '/' . $filename;
    
    // Kontrola, že soubor už neexistuje
    if (file_exists($targetPath)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Soubor s tímto názvem už existuje'
        ]);
        return;
    }
    
    // Přesunout soubor
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Nepodařilo se nahrát soubor'
        ]);
        return;
    }
    
    // Úspěch
    echo json_encode([
        'success' => true,
        'message' => 'Manuál byl úspěšně nahrán',
        'filename' => $filename
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Smazání manuálu (pouze pro adminy)
 */
function handleDeleteManual($manualsPath) {
    header('Content-Type: application/json; charset=utf-8');
    
    // Kontrola POST metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Pouze POST metoda je podporována'
        ]);
        return;
    }
    
    // Získání dat z body
    $input = json_decode(file_get_contents('php://input'), true);
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $filename = $input['filename'] ?? '';
    
    if (empty($token) || empty($username)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Chybí token nebo username'
        ]);
        return;
    }
    
    if (empty($filename)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Chybí název souboru'
        ]);
        return;
    }
    
    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Neplatný token'
        ]);
        return;
    }
    
    // Kontrola admin práv
    $userRoles = $token_data['roles'] ?? [];
    if (!in_array('admin', $userRoles)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Nedostatečná oprávnění - pouze administrátoři mohou mazat manuály'
        ]);
        return;
    }
    
    // Bezpečnostní kontrola názvu souboru
    $filename = basename($filename);
    
    if (!preg_match('/^[\p{L}\p{N}\s_\-\.]+\.pdf$/ui', $filename)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Neplatný název souboru'
        ]);
        return;
    }
    
    // Cesta k souboru
    $filePath = $manualsPath . '/' . $filename;
    
    // Kontrola existence
    if (!file_exists($filePath) || !is_file($filePath)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Soubor nebyl nalezen'
        ]);
        return;
    }
    
    // Smazat soubor
    if (!unlink($filePath)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Nepodařilo se smazat soubor'
        ]);
        return;
    }
    
    // Úspěch
    echo json_encode([
        'success' => true,
        'message' => 'Manuál byl úspěšně smazán',
        'filename' => $filename
    ], JSON_UNESCAPED_UNICODE);
}

?>

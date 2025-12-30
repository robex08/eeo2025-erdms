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
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

// Cesta k manuálům - DEV vs PRODUKCE
$isDev = strpos($_SERVER['REQUEST_URI'], '/dev/') !== false;
$manualsPath = $isDev 
    ? '/var/www/erdms-data/eeo-v2/manualy' 
    : '/var/www/erdms-platform/manualy';

// Ověření autentizace
$authResult = authenticateRequest();
if (!$authResult['authenticated']) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Neautorizovaný přístup'
    ]);
    exit();
}

// Routing
$requestUri = $_SERVER['REQUEST_URI'];
$pathInfo = parse_url($requestUri, PHP_URL_PATH);

// Odstranění base path
$basePath = $isDev ? '/dev/api.eeo/api25/manuals' : '/api.eeo/api25/manuals';
$route = str_replace($basePath, '', $pathInfo);
$route = trim($route, '/');

// Router
switch ($route) {
    case 'list':
        handleListManuals($manualsPath);
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

?>

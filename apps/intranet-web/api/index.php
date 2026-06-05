<?php
/**
 * Intranet Web API - Main Router
 * 
 * @version 1.0.0
 * @author ZZS HMP
 * @created 2026-06-03
 */

// Error reporting pro development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Headers
header('Content-Type: application/json; charset=utf-8');

// CORS - Allow requests from same origin
$allowedOrigins = [
    'https://erdms.zachranka.cz',
    'http://localhost:5174',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load environment variables
require_once __DIR__ . '/config/env.php';

// Load libraries
require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/auth.php';

// Get request path
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$path = str_replace($scriptName, '', $requestUri);
$path = parse_url($path, PHP_URL_PATH);
$path = trim($path, '/');

// Remove 'api' prefix if present
if (strpos($path, 'api/') === 0) {
    $path = substr($path, 4);
}

// Parse path segments
$segments = $path ? explode('/', $path) : [];
$endpoint = $segments[0] ?? 'health';

// Route handling
try {
    switch ($endpoint) {
        case 'health':
            sendSuccess([
                'status' => 'ok',
                'message' => 'Intranet Web API is running',
                'version' => getenv('API_VERSION') ?: '1.0.0',
                'timestamp' => date('c')
            ]);
            break;

        case 'user':
            // Vyžaduje autentizaci
            $user = authenticateRequest();
            if (!$user) {
                sendError('Neautorizovaný přístup', 401);
            }
            
            require_once __DIR__ . '/handlers/userHandlers.php';
            handleUserRequest($user, $_SERVER['REQUEST_METHOD']);
            break;

        case 'test':
            // Test endpoint
            sendSuccess([
                'message' => 'API test úspěšný',
                'method' => $_SERVER['REQUEST_METHOD'],
                'path' => $path,
                'segments' => $segments
            ]);
            break;

        default:
            sendError('Endpoint nenalezen: ' . $endpoint, 404);
            break;
    }
} catch (Exception $e) {
    error_log('API Error: ' . $e->getMessage());
    sendError('Interní chyba serveru: ' . $e->getMessage(), 500);
}

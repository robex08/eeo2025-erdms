<?php
/**
 * System Info API Endpoint - Order V2 Standard
 * Vrací informace o databázi a prostředí
 * 
 * POST: {token, username}
 * Response: {status: 'success', data: {...}, message: '...'}
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 1. Pouze POST metoda
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Pouze POST metoda je povolena'
    ]);
    exit;
}

// 2. Načtení parametrů z body
$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';
$username = $input['username'] ?? '';

if (!$token || !$username) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Chybí povinné parametry: token a username'
    ]);
    exit;
}

// 3. Načtení konfigurace a funkcí
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../v2025.03_25/lib/auth.php';

try {
    // 4. Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Neplatný token nebo uživatelské jméno'
        ]);
        exit;
    }

    // 5. Získání informací o systému
    $dbName = DB_NAME;
    $isDevEnvironment = (strpos($dbName, '-dev') !== false);
    
    $systemInfo = [
        'database' => [
            'name' => $dbName,
            'display_name' => strtoupper($dbName)
        ],
        'environment' => [
            'is_dev' => $isDevEnvironment,
            'type' => $isDevEnvironment ? 'development' : 'production'
        ],
        'api' => [
            'version' => defined('VERSION') ? VERSION : '1.94',
            'host' => $_SERVER['HTTP_HOST'] ?? 'unknown'
        ],
        'timestamp' => date('c')
    ];
    
    // 6. Úspěšná odpověď
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => $systemInfo,
        'message' => 'Systémové informace načteny úspěšně'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // 7. Error handling
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Chyba při načítání systémových informací: ' . $e->getMessage()
    ]);
}
?>
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

// 3. Načtení konfigurace a funkcí
require_once __DIR__ . '/../v2025.03_25/lib/dbconfig.php';
$config = require __DIR__ . '/../v2025.03_25/lib/dbconfig.php';

// 4. Pokud jsou credentials, ověřit token (optional auth)
$isAuthenticated = false;
if ($token && $username) {
    try {
        require_once __DIR__ . '/../v2025.03_25/lib/auth.php';
        $token_data = verify_token($token);
        if ($token_data && $token_data['username'] === $username) {
            $isAuthenticated = true;
        }
    } catch (Exception $e) {
        // Token není validní, ale můžeme pokračovat s basic info
    }
}

try {
    // 5. Získání informací o systému - SKUTEČNÁ DATABÁZE Z CONFIG!
    $dbName = $config['mysql']['database'];
    $isDevEnvironment = (strpos($dbName, '-dev') !== false || strpos($dbName, 'DEV') !== false);
    
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
            'host' => $_SERVER['HTTP_HOST'] ?? 'unknown',
            'authenticated' => $isAuthenticated
        ],
        'timestamp' => date('c')
    ];
    
    // 6. Úspěšná odpověď
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => $systemInfo,
        'message' => $isAuthenticated 
            ? 'Systémové informace načteny úspěšně (authenticated)' 
            : 'Systémové informace načteny úspěšně (public)'
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
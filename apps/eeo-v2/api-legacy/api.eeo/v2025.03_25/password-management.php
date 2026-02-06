<?php
/**
 * Password Management API
 * 
 * Endpointy pro správu hesel uživatelů:
 * - Reset hesla s dočasným heslem
 * - Změna hesla uživatelem
 * - Nastavení/zrušení vynucené změny hesla
 */

// CORS headers pro development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'lib/dbconfig.php';
require_once 'lib/handlers.php';
require_once 'lib/userHandlers.php';
require_once 'lib/queries.php';

// Pouze POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Získání JSON dat
$json = file_get_contents('php://input');
$input = json_decode($json, true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    exit;
}

$action = isset($input['action']) ? $input['action'] : '';

switch ($action) {
    case 'reset-password':
        handle_reset_password($input);
        break;
        
    case 'change-password':
        handle_change_password($input);
        break;
        
    case 'force-password-change':
        handle_force_password_change($input);
        break;
        
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Unknown action']);
        break;
}

/**
 * Reset hesla uživatele (pouze pro adminy)
 * Nastaví dočasné heslo a vynucenou změnu
 */
function handle_reset_password($input) {
    global $config, $queries;
    
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $target_user_id = isset($input['target_user_id']) ? (int)$input['target_user_id'] : 0;
    
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        return;
    }
    
    if ($target_user_id <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing target_user_id']);
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Kontrola existence cílového uživatele
        $stmt = $db->prepare($queries['uzivatele_detail']);
        $stmt->bindParam(':id', $target_user_id, PDO::PARAM_INT);
        $stmt->execute();
        $target_user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$target_user) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'User not found']);
            return;
        }
        
        // Generování dočasného hesla
        $temp_password = generate_temporary_password();
        $password_hash = password_hash($temp_password, PASSWORD_DEFAULT);
        
        // Update hesla a nastavení vynucené změny
        $sql = "UPDATE " . TBL_UZIVATELE . " 
                SET password_hash = :password_hash, 
                    vynucena_zmena_hesla = 1,
                    dt_aktualizace = NOW()
                WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':password_hash', $password_hash, PDO::PARAM_STR);
        $stmt->bindParam(':id', $target_user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Heslo bylo resetováno',
            'data' => [
                'temporary_password' => $temp_password,
                'user_id' => $target_user_id,
                'username' => $target_user['username'],
                'forced_change' => true
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

/**
 * Změna hesla uživatelem
 * Resetuje vynucenou změnu po úspěšné změně
 */
function handle_change_password($input) {
    global $config, $queries;
    
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $old_password = isset($input['old_password']) ? $input['old_password'] : '';
    $new_password = isset($input['new_password']) ? $input['new_password'] : '';
    
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        return;
    }
    
    if (empty($old_password) || empty($new_password)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing passwords']);
        return;
    }
    
    if (strlen($new_password) < 6) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Nové heslo musí mít alespoň 6 znaků']);
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Načtení uživatele
        $stmt = $db->prepare($queries['uzivatele_login']);
        $stmt->bindParam(':username', $username, PDO::PARAM_STR);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'User not found']);
            return;
        }
        
        // Ověření starého hesla
        if (!password_verify($old_password, $user['password_hash'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Nesprávné staré heslo']);
            return;
        }
        
        // Nastavení nového hesla a zrušení vynucené změny
        $new_hash = password_hash($new_password, PASSWORD_DEFAULT);
        
        $sql = "UPDATE " . TBL_UZIVATELE . " 
                SET password_hash = :password_hash, 
                    vynucena_zmena_hesla = 0,
                    dt_aktualizace = NOW()
                WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':password_hash', $new_hash, PDO::PARAM_STR);
        $stmt->bindParam(':id', $user['id'], PDO::PARAM_INT);
        $stmt->execute();
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Heslo bylo úspěšně změněno',
            'data' => [
                'user_id' => $user['id'],
                'forced_change_reset' => true
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

/**
 * Nastavení/zrušení vynucené změny hesla (pouze pro adminy)
 */
function handle_force_password_change($input) {
    global $config, $queries;
    
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $target_user_id = isset($input['target_user_id']) ? (int)$input['target_user_id'] : 0;
    $force = isset($input['force']) ? (bool)$input['force'] : true;
    
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        return;
    }
    
    if ($target_user_id <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing target_user_id']);
        return;
    }
    
    try {
        $db = get_db($config);
        
        $sql = "UPDATE " . TBL_UZIVATELE . " 
                SET vynucena_zmena_hesla = :force,
                    dt_aktualizace = NOW()
                WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':force', $force, PDO::PARAM_INT);
        $stmt->bindParam(':id', $target_user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'User not found']);
            return;
        }
        
        echo json_encode([
            'status' => 'success',
            'message' => $force ? 'Vynucená změna hesla nastavena' : 'Vynucená změna hesla zrušena',
            'data' => [
                'user_id' => $target_user_id,
                'forced_change' => $force
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

/**
 * Generuje dočasné heslo ve formátu UXxxxxx
 */
function generate_temporary_password() {
    $numbers = str_pad(mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);
    return 'U' . $numbers;
}
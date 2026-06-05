<?php
/**
 * Response Helper Functions
 */

/**
 * Odeslat JSON success response
 */
function sendSuccess($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'status' => 'success',
        'data' => $data
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Odeslat JSON error response
 */
function sendError($message, $statusCode = 400, $errorCode = null) {
    http_response_code($statusCode);
    $response = [
        'status' => 'error',
        'message' => $message
    ];
    
    if ($errorCode) {
        $response['error_code'] = $errorCode;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Získat JSON input z request body
 */
function getJsonInput() {
    $input = file_get_contents('php://input');
    if (empty($input)) {
        return [];
    }
    
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendError('Neplatný JSON formát', 400);
    }
    
    return $data ?: [];
}

/**
 * Validovat povinné parametry
 */
function validateRequired($data, $required) {
    $missing = [];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            $missing[] = $field;
        }
    }
    
    if (!empty($missing)) {
        sendError('Chybějící povinné parametry: ' . implode(', ', $missing), 400);
    }
}

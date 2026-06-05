<?php
/**
 * Authentication Library
 * EntraID Token Validation
 */

/**
 * Ověřit Bearer token z Authorization header
 * 
 * @return array|false User data nebo false při chybě
 */
function authenticateRequest() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (empty($authHeader)) {
        return false;
    }
    
    // Extract Bearer token
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return false;
    }
    
    $token = $matches[1];
    
    // Validate token with EntraID
    return validateEntraIdToken($token);
}

/**
 * Validovat EntraID (Azure AD) token
 * 
 * @param string $token Access token
 * @return array|false User data nebo false
 */
function validateEntraIdToken($token) {
    // Dekódovat JWT token (bez validace pro development)
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }
    
    try {
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        
        if (!$payload) {
            return false;
        }
        
        // V produkci: validujte signature, exp, aud, iss!
        // Pro development: pouze dekódujeme payload
        
        // Check expiration
        if (isset($payload['exp']) && time() > $payload['exp']) {
            error_log('Token expired');
            return false;
        }
        
        // Extract user info
        return [
            'id' => $payload['oid'] ?? $payload['sub'] ?? null,
            'email' => $payload['email'] ?? $payload['preferred_username'] ?? null,
            'name' => $payload['name'] ?? null,
            'username' => $payload['preferred_username'] ?? null,
            'payload' => $payload
        ];
        
    } catch (Exception $e) {
        error_log('Token validation error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Vyžadovat autentizaci - ukončí request pokud není přihlášen
 */
function requireAuth() {
    $user = authenticateRequest();
    if (!$user) {
        sendError('Vyžadována autentizace', 401);
    }
    return $user;
}

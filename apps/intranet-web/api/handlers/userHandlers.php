<?php
/**
 * User Request Handlers
 */

/**
 * Handle user endpoint requests
 */
function handleUserRequest($user, $method) {
    switch ($method) {
        case 'GET':
            getUserInfo($user);
            break;
            
        default:
            sendError('Metoda není podporována', 405);
            break;
    }
}

/**
 * Získat informace o aktuálním uživateli
 */
function getUserInfo($user) {
    sendSuccess([
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'username' => $user['username']
    ]);
}

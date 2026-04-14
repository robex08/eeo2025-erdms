<?php
/**
 * System Authentication Configuration Handlers
 * 
 * Endpoints for EntraID authentication configuration and callback handling
 * 
 * @version 2026-04-14
 */

require_once __DIR__ . '/../models/GlobalSettingsModel.php';

/**
 * GET /api/eeo/v2.0/system/auth-config
 * 
 * Returns current authentication mode and EntraID status
 * Public endpoint - no authentication required (needed for login page)
 * 
 * @return JSON {auth_mode: 'local_only'|'entra_all'|'entra_admin_local', entra_enabled: '0'|'1'}
 */
function handle_system_auth_config_get($input, $config) {
    global $pdo;
    
    try {
        // Get global settings model
        $settingsModel = new GlobalSettingsModel($pdo);
        
        // Fetch auth settings with defaults
        $auth_mode = $settingsModel->getSetting('auth_mode');
        $entra_enabled = $settingsModel->getSetting('entra_enabled');
        
        // Apply defaults if not found (backward compatible)
        if ($auth_mode === null || $auth_mode === '') {
            $auth_mode = 'local_only';
        }
        
        if ($entra_enabled === null || $entra_enabled === '') {
            $entra_enabled = '0';
        }
        
        // Return configuration
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'auth_mode' => $auth_mode,
            'entra_enabled' => $entra_enabled,
            'timestamp' => date('c')
        ), JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        error_log("System auth config error: " . $e->getMessage());
        
        // Return safe defaults on error
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Failed to load auth configuration',
            'auth_mode' => 'local_only', // Safe default
            'entra_enabled' => '0',
            'error_detail' => IS_DEV_ENV ? $e->getMessage() : 'Internal error'
        ), JSON_UNESCAPED_UNICODE);
    }
}

/**
 * POST /api/eeo/v2.0/system/auth-config
 * 
 * Update authentication mode and EntraID status
 * Requires SUPERADMIN permission
 * 
 * @param $input {username, token, auth_mode, entra_enabled}
 */
function handle_system_auth_config_post($input, $config, $queries) {
    global $pdo;
    
    // Verify authentication
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Nepřihlášen'
        ), JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // Check SUPERADMIN permission
    global $G_user_data;
    if (!isset($G_user_data['is_superadmin']) || $G_user_data['is_superadmin'] !== true) {
        http_response_code(403);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Nedostatečná oprávnění. Pouze SUPERADMIN může měnit systémové nastavení autentizace.'
        ), JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // Validate input
    $auth_mode = isset($input['auth_mode']) ? $input['auth_mode'] : null;
    $entra_enabled = isset($input['entra_enabled']) ? $input['entra_enabled'] : null;
    
    $valid_modes = array('local_only', 'entra_all', 'entra_admin_local');
    
    if ($auth_mode && !in_array($auth_mode, $valid_modes)) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Neplatný režim autentizace. Povolené: ' . implode(', ', $valid_modes)
        ), JSON_UNESCAPED_UNICODE);
        return;
    }
    
    if ($entra_enabled !== null && !in_array($entra_enabled, array('0', '1', 0, 1))) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Neplatná hodnota entra_enabled. Povolené: 0, 1'
        ), JSON_UNESCAPED_UNICODE);
        return;
    }
    
    try {
        $settingsModel = new GlobalSettingsModel($pdo);
        $updated = array();
        
        // Update auth_mode if provided
        if ($auth_mode !== null) {
            $settingsModel->setSetting(
                'auth_mode', 
                $auth_mode, 
                'Režim autentizace: local_only | entra_all | entra_admin_local'
            );
            $updated['auth_mode'] = $auth_mode;
        }
        
        // Update entra_enabled if provided
        if ($entra_enabled !== null) {
            $entra_enabled_str = (string)$entra_enabled;
            $settingsModel->setSetting(
                'entra_enabled', 
                $entra_enabled_str, 
                'EntraID přihlášení povoleno (0/1)'
            );
            $updated['entra_enabled'] = $entra_enabled_str;
        }
        
        // Audit log
        error_log(sprintf(
            "AUTH CONFIG CHANGED by %s: %s",
            $username,
            json_encode($updated)
        ));
        
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Nastavení autentizace aktualizováno',
            'updated' => $updated,
            'timestamp' => date('c')
        ), JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        error_log("System auth config update error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Nepodařilo se uložit nastavení',
            'error_detail' => IS_DEV_ENV ? $e->getMessage() : 'Internal error'
        ), JSON_UNESCAPED_UNICODE);
    }
}

<?php
/**
 * EntraID Authentication Handler
 * 
 * Handles EntraID OAuth callback and user provisioning
 * 
 * @version 2026-04-14
 */

require_once __DIR__ . '/../models/GlobalSettingsModel.php';

// Default role for auto-provisioned users
define('DEFAULT_ROLE_ID_THP_PES', 9); // THP/PES role
define('DEFAULT_ROLE_CODE', 'THP_PES');

/**
 * POST /api/eeo/v2.0/auth/entra-callback
 * 
 * Processes EntraID authentication callback and provisions/updates users
 * 
 * Flow:
 * 1. Verify session with central Auth API
 * 2. Extract username from UPN (u03924@zachranka.cz -> u03924)
 * 3. Check if user exists in DB
 * 4. If not exists: check groups, auto-provision if has eeoUser group
 * 5. If exists: update EntraID metadata
 * 6. Load permissions and create session token
 * 7. Return user data with token
 * 
 * @param array $input POST data {session_token?: string}
 * @param array $config Database and app configuration
 * @param array $queries SQL queries
 */
function handle_entra_callback($input, $config, $queries) {
    global $pdo;
    
    try {
        // ===== STEP 1: Get authentication mode settings =====
        $settingsModel = new GlobalSettingsModel($pdo);
        $auth_mode = $settingsModel->getSetting('auth_mode') ?: 'local_only';
        $entra_enabled = $settingsModel->getSetting('entra_enabled') ?: '0';
        
        // Reject if EntraID is disabled
        if ($entra_enabled !== '1') {
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error',
                'code' => 'ENTRA_DISABLED',
                'message' => 'EntraID přihlášení je zakázáno. Použijte lokální přihlášení.'
            ), JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // ===== STEP 2: Get session data from frontend =====
        // Frontend already called /auth/me and sends us the session data
        $session_data = isset($input['session_data']) ? $input['session_data'] : null;
        
        if (!$session_data || !isset($session_data['upn'])) {
            http_response_code(401);
            echo json_encode(array(
                'status' => 'error',
                'code' => 'INVALID_SESSION_DATA',
                'message' => 'Chybí data ze session. Přihlaste se znovu.',
                'debug' => IS_DEV_ENV ? array('has_session_data' => !!$session_data, 'input_keys' => array_keys($input)) : null
            ), JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // ===== STEP 3: Extract username from UPN =====
        $upn = $session_data['upn']; // e.g., u03924@zachranka.cz
        $entra_id = $session_data['id'] ?? $session_data['entra_id'] ?? null;
        $email = $session_data['email'] ?? $upn;
        $display_name = $session_data['displayName'] ?? $session_data['name'] ?? '';
        $groups = $session_data['groups'] ?? array();
        
        // Extract username from UPN (before @)
        $username_parts = explode('@', $upn);
        $username = $username_parts[0];
        
        if (!$username || !$entra_id) {
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error',
                'code' => 'INVALID_UPN',
                'message' => 'Nepodařilo se extrahovat username z UPN.',
                'debug' => IS_DEV_ENV ? array('upn' => $upn, 'entra_id' => $entra_id) : null
            ), JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // ===== STEP 4: Check if user exists in DB =====
        $stmt = $pdo->prepare("
            SELECT * FROM " . TBL_UZIVATELE . " 
            WHERE username = ? 
            LIMIT 1
        ");
        $stmt->execute(array($username));
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $user_id = null;
        $is_new_user = false;
        
        // ===== STEP 5a: USER NOT FOUND -> AUTO-PROVISION =====
        if (!$user) {
            // Check if user has eeoUser group (case-insensitive)
            $has_eeo_group = false;
            foreach ($groups as $group) {
                if (stripos($group, 'eeo') !== false) {
                    $has_eeo_group = true;
                    break;
                }
            }
            
            if (!$has_eeo_group) {
                // User doesn't have required group - ACCESS DENIED
                http_response_code(403);
                echo json_encode(array(
                    'status' => 'error',
                    'code' => 'ACCESS_DENIED',
                    'message' => 'Nemáte přístup do systému EEO. Kontaktujte administrátora pro přidělení přístupových práv.',
                    'upn' => $upn,
                    'debug' => IS_DEV_ENV ? array('groups' => $groups) : null
                ), JSON_UNESCAPED_UNICODE);
                return;
            }
            
            // User has eeoUser group -> CREATE NEW ACCOUNT
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO " . TBL_UZIVATELE . " (
                        username, 
                        jmeno, 
                        email, 
                        entra_id, 
                        upn, 
                        auth_source, 
                        heslo, 
                        aktivni,
                        entra_sync_at,
                        dt_vytvoreni
                    ) VALUES (
                        :username, 
                        :jmeno, 
                        :email, 
                        :entra_id, 
                        :upn, 
                        'entra_id', 
                        NULL, 
                        1,
                        NOW(),
                        NOW()
                    )
                ");
                
                $stmt->execute(array(
                    ':username' => $username,
                    ':jmeno' => $display_name,
                    ':email' => $email,
                    ':entra_id' => $entra_id,
                    ':upn' => $upn
                ));
                
                $user_id = $pdo->lastInsertId();
                $is_new_user = true;
                
                // Assign THP/PES role to new user
                $stmt = $pdo->prepare("
                    INSERT INTO " . TBL_UZIVATELE_ROLE . " (
                        uzivatel_id, 
                        role_id, 
                        vytvoreno
                    ) VALUES (
                        :user_id, 
                        :role_id, 
                        NOW()
                    )
                ");
                $stmt->execute(array(
                    ':user_id' => $user_id,
                    ':role_id' => DEFAULT_ROLE_ID_THP_PES
                ));
                
                error_log("EntraID: Auto-provisioned new user: username=$username, entra_id=$entra_id, role=" . DEFAULT_ROLE_CODE);
                
                // Fetch newly created user
                $stmt = $pdo->prepare("SELECT * FROM " . TBL_UZIVATELE . " WHERE id = ?");
                $stmt->execute(array($user_id));
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
            } catch (Exception $e) {
                error_log("EntraID: Failed to auto-provision user: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(array(
                    'status' => 'error',
                    'code' => 'PROVISION_FAILED',
                    'message' => 'Nepodařilo se vytvořit uživatelský účet.',
                    'debug' => IS_DEV_ENV ? $e->getMessage() : null
                ), JSON_UNESCAPED_UNICODE);
                return;
            }
        } 
        // ===== STEP 5b: USER EXISTS -> UPDATE METADATA =====
        else {
            $user_id = $user['id'];
            
            // Check if user is active
            if (isset($user['aktivni']) && (int)$user['aktivni'] !== 1) {
                http_response_code(403);
                echo json_encode(array(
                    'status' => 'error',
                    'code' => 'USER_INACTIVE',
                    'message' => 'Uživatel nemá oprávnění k přihlášení (neaktivní).'
                ), JSON_UNESCAPED_UNICODE);
                return;
            }
            
            // Update EntraID metadata
            try {
                $stmt = $pdo->prepare("
                    UPDATE " . TBL_UZIVATELE . " 
                    SET entra_id = :entra_id,
                        upn = :upn,
                        auth_source = 'entra_id',
                        entra_sync_at = NOW(),
                        dt_posledni_prihlaseni = NOW(),
                        dt_posledni_aktivita = NOW()
                    WHERE id = :user_id
                ");
                $stmt->execute(array(
                    ':entra_id' => $entra_id,
                    ':upn' => $upn,
                    ':user_id' => $user_id
                ));
                
            } catch (Exception $e) {
                error_log("EntraID: Failed to update user metadata: " . $e->getMessage());
                // Non-fatal - continue with login
            }
        }
        
        // ===== STEP 6: Validate auth mode restrictions =====
        if ($auth_mode === 'entra_admin_local') {
            // In this mode, only admins can use EntraID
            // Check if user has admin role
            $stmt = $pdo->prepare("
                SELECT r.kod_role 
                FROM " . TBL_ROLE . " r
                INNER JOIN " . TBL_UZIVATELE_ROLE . " ur ON ur.role_id = r.id
                WHERE ur.uzivatel_id = ?
            ");
            $stmt->execute(array($user_id));
            $roles = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            $is_admin = !empty(array_intersect($roles, array('SUPERADMIN', 'ADMINISTRATOR')));
            
            if (!$is_admin && !$is_new_user) {
                // Regular user in entra_admin_local mode - reject
                http_response_code(403);
                echo json_encode(array(
                    'status' => 'error',
                    'code' => 'ENTRA_ADMIN_ONLY',
                    'message' => 'V aktuálním nastavení je EntraID přihlášení povoleno pouze pro administrátory. Použijte lokální přihlášení.'
                ), JSON_UNESCAPED_UNICODE);
                return;
            }
        }
        
        // ===== STEP 7: Load permissions using verify_token_v2 =====
        // Create temporary token for verify_token_v2
        $temp_token = base64_encode($username . '|' . time());
        
        // Call verify_token_v2 to load roles and permissions
        $auth_result = verify_token_v2($username, $temp_token, $pdo);
        
        if (!$auth_result) {
            http_response_code(500);
            echo json_encode(array(
                'status' => 'error',
                'code' => 'PERMISSION_LOAD_FAILED',
                'message' => 'Nepodařilo se načíst oprávnění uživatele.'
            ), JSON_UNESCAPED_UNICODE);
            return;
        }
        
        // ===== STEP 8: Create session token =====
        $token = base64_encode($username . '|' . time());
        
        // ===== STEP 9: Prepare response =====
        unset($user['password_hash']); // Never send password hash
        unset($user['heslo']);
        
        $user['token'] = $token;
        $user['roles'] = $auth_result['roles'] ?? array();
        $user['permissions'] = $auth_result['permissions'] ?? array();
        $user['is_admin'] = $auth_result['is_admin'] ?? false;
        $user['auth_method'] = 'entra_id';
        $user['is_new_user'] = $is_new_user;
        
        // Log successful login
        error_log(sprintf(
            "EntraID login: username=%s, entra_id=%s, new_user=%s, roles=%s",
            $username,
            $entra_id,
            $is_new_user ? 'yes' : 'no',
            implode(',', $user['roles'])
        ));
        
        http_response_code(200);
        echo json_encode($user, JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        error_log("EntraID callback error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'code' => 'SERVER_ERROR',
            'message' => 'Nepodařilo se zpracovat EntraID přihlášení.',
            'debug' => IS_DEV_ENV ? array(
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ) : null
        ), JSON_UNESCAPED_UNICODE);
    }
}

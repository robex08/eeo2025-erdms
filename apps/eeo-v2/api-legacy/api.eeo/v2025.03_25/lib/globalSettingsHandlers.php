<?php

/**
 * API Handlers pro globální nastavení systému
 * Pattern: POST /global-settings s token a username v body
 * 
 * @package EEO API v2025.03_25
 */

/**
 * POST /global-settings
 * Načte nebo uloží globální nastavení podle operation v inputu
 */
function handle_global_settings($input, $db) {
    // Autentizace
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token, $db);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    $user_id = $auth_result['id'];
    
    // Určit operaci
    $operation = isset($input['operation']) ? $input['operation'] : 'get';
    
    error_log("=== HANDLE GLOBAL SETTINGS ===");
    error_log("Operation: " . $operation);
    error_log("User ID: " . $user_id);
    
    // Pro čtení (get) nemusí být admin, pro save musí
    if ($operation === 'save') {
        // Kontrola oprávnění - pouze Admin nebo SuperAdmin nebo MAINTENANCE_ADMIN
        $sql = "
            SELECT DISTINCT r.kod_role
            FROM 25_role r
            JOIN 25_uzivatele_role ur ON r.id = ur.role_id
            WHERE ur.uzivatel_id = :user_id
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $isAdmin = false;
        $isSuperAdmin = false;
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if ($row['kod_role'] === 'SUPERADMIN') {
                $isSuperAdmin = true;
                $isAdmin = true;
                break;
            }
            if ($row['kod_role'] === 'ADMINISTRATOR') {
                $isAdmin = true;
            }
        }
        
        error_log("Admin check: isAdmin=" . ($isAdmin ? 'YES' : 'NO') . ", isSuperAdmin=" . ($isSuperAdmin ? 'YES' : 'NO'));
        
        // Kontrola práva MAINTENANCE_ADMIN
        $hasMaintenanceAdmin = false;
        $sqlPerm = "
            SELECT COUNT(*) as cnt
            FROM 25_prava p
            LEFT JOIN 25_uzivatel_prava up ON p.id = up.pravo_id AND up.uzivatel_id = :user_id
            LEFT JOIN 25_role_prava rp ON p.id = rp.pravo_id
            LEFT JOIN 25_uzivatele_role ur2 ON rp.role_id = ur2.role_id AND ur2.uzivatel_id = :user_id
            WHERE p.kod_prava = 'MAINTENANCE_ADMIN'
            AND (up.uzivatel_id IS NOT NULL OR ur2.uzivatel_id IS NOT NULL)
            LIMIT 1
        ";
        
        try {
            $stmtPerm = $db->prepare($sqlPerm);
            $stmtPerm->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmtPerm->execute();
            $permRow = $stmtPerm->fetch(PDO::FETCH_ASSOC);
            $hasMaintenanceAdmin = ($permRow && $permRow['cnt'] > 0);
            error_log("MAINTENANCE_ADMIN check: " . ($hasMaintenanceAdmin ? 'YES' : 'NO'));
        } catch (Exception $e) {
            error_log("ERROR checking MAINTENANCE_ADMIN: " . $e->getMessage());
            $hasMaintenanceAdmin = false;
        }
        
        if (!$isAdmin && !$hasMaintenanceAdmin) {
            error_log("Access denied: Neither admin nor MAINTENANCE_ADMIN");
            http_response_code(403);
            echo json_encode(array('status' => 'error', 'message' => 'Přístup odepřen'));
            return;
        }
        
        error_log("Calling handle_save_settings...");
        // Uložit nastavení
        handle_save_settings($db, isset($input['settings']) ? $input['settings'] : array(), $isSuperAdmin, $hasMaintenanceAdmin);
    } else {
        // Načíst nastavení - dostupné pro všechny přihlášené uživatele
        $forDisplay = isset($input['for_display']) && $input['for_display'] === true;
        handle_get_settings($db, $forDisplay);
    }
}

/**
 * Načte nastavení z DB
 * @param PDO $db - databázové připojení
 * @param bool $forDisplay - true = načíst obsah z notifikace pro zobrazení, false = čistý fallback pro admin
 */
function handle_get_settings($db, $forDisplay = false) {
    try {
        $stmt = $db->prepare("SELECT klic, hodnota FROM " . TBL_NASTAVENI_GLOBALNI . "");
        $stmt->execute();
        
        $settings = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['klic']] = $row['hodnota'];
        }
        
        // Převod na boolean kde je potřeba
        
        // Načíst HTML obsah z tabulky 25_notifikace podle message_id (POUZE pro display)
        $modalContent = '';
        $messageId = isset($settings['post_login_modal_message_id']) ? $settings['post_login_modal_message_id'] : null;
        
        if ($forDisplay && $messageId && $messageId !== 'NULL' && $messageId !== '' && !is_null($messageId)) {
            try {
                $stmt2 = $db->prepare("SELECT zprava FROM 25_notifikace WHERE id = ? AND aktivni = 1 LIMIT 1");
                $stmt2->execute([(int)$messageId]);
                $notification = $stmt2->fetch(PDO::FETCH_ASSOC);
                
                if ($notification && !empty($notification['zprava'])) {
                    $modalContent = $notification['zprava'];
                }
            } catch (Exception $e) {
                error_log('Chyba při načítání obsahu notifikace ID ' . $messageId . ': ' . $e->getMessage());
            }
        }
        
        // Fallback na post_login_modal_content z global settings
        if (empty($modalContent)) {
            $modalContent = $settings['post_login_modal_content'] ?? '';
        }
        
        $result = array(
            'notifications_enabled' => ($settings['notifications_enabled'] ?? '1') === '1',
            'notifications_bell_enabled' => ($settings['notifications_inapp_enabled'] ?? '1') === '1',
            'notifications_email_enabled' => ($settings['notifications_email_enabled'] ?? '1') === '1',
            'hierarchy_enabled' => ($settings['hierarchy_enabled'] ?? '0') === '1',
            'hierarchy_profile_id' => isset($settings['hierarchy_profile_id']) && $settings['hierarchy_profile_id'] !== 'NULL' && $settings['hierarchy_profile_id'] !== null ? (int)$settings['hierarchy_profile_id'] : null,
            'hierarchy_logic' => $settings['hierarchy_logic'] ?? 'OR',
            'maintenance_mode' => ($settings['maintenance_mode'] ?? '0') === '1',
            'maintenance_message' => $settings['maintenance_message'] ?? 'Systém je momentálně v údržbě.',
            
            // Post-login modal settings - obsah se načítá z 25_notifikace, fallback z DB
            'post_login_modal_enabled' => ($settings['post_login_modal_enabled'] ?? '0') === '1',
            'post_login_modal_guid' => $settings['post_login_modal_guid'] ?? 'modal_init_v1',
            'post_login_modal_title' => $settings['post_login_modal_title'] ?? 'Informace',
            'post_login_modal_valid_from' => $settings['post_login_modal_valid_from'] ?? null,
            'post_login_modal_valid_to' => $settings['post_login_modal_valid_to'] ?? null,
            'post_login_modal_message_id' => isset($settings['post_login_modal_message_id']) && $settings['post_login_modal_message_id'] !== 'NULL' && $settings['post_login_modal_message_id'] !== null ? (int)$settings['post_login_modal_message_id'] : null,
            'post_login_modal_content' => $modalContent
        );
        
        http_response_code(200);
        echo json_encode(array('status' => 'ok', 'data' => $result));
    } catch (Exception $e) {
        error_log("Chyba při načítání nastavení: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání nastavení'));
    }
}

/**
 * Uloží nastavení do DB
 */
function handle_save_settings($db, $settings, $isSuperAdmin, $hasMaintenanceAdmin = false) {
    error_log("=== GLOBAL SETTINGS SAVE DEBUG ===");
    error_log("isSuperAdmin: " . ($isSuperAdmin ? 'YES' : 'NO'));
    error_log("hasMaintenanceAdmin: " . ($hasMaintenanceAdmin ? 'YES' : 'NO'));
    error_log("Settings: " . json_encode($settings));
    
    try {
        // Kontrola oprávnění pro maintenance_mode
        // Může měnit: SUPERADMIN nebo uživatel s právem MAINTENANCE_ADMIN
        if (isset($settings['maintenance_mode']) && !$isSuperAdmin && !$hasMaintenanceAdmin) {
            error_log("ERROR: Permission denied for maintenance_mode");
            http_response_code(403);
            echo json_encode(array('status' => 'error', 'message' => 'Pouze SUPERADMIN nebo MAINTENANCE_ADMIN může měnit maintenance_mode'));
            return;
        }
        
        // Mapování frontend -> DB klíčů
        $mapping = array(
            'notifications_enabled' => 'notifications_enabled',
            'notifications_bell_enabled' => 'notifications_inapp_enabled',
            'notifications_email_enabled' => 'notifications_email_enabled',
            'hierarchy_enabled' => 'hierarchy_enabled',
            'hierarchy_profile_id' => 'hierarchy_profile_id',
            'hierarchy_logic' => 'hierarchy_logic',
            'maintenance_mode' => 'maintenance_mode',
            'maintenance_message' => 'maintenance_message',
            // Post-login modal
            'post_login_modal_enabled' => 'post_login_modal_enabled',
            'post_login_modal_title' => 'post_login_modal_title',
            'post_login_modal_guid' => 'post_login_modal_guid',
            'post_login_modal_valid_from' => 'post_login_modal_valid_from',
            'post_login_modal_valid_to' => 'post_login_modal_valid_to',
            'post_login_modal_message_id' => 'post_login_modal_message_id',
            'post_login_modal_content' => 'post_login_modal_content'
        );
        
        $db->beginTransaction();
        error_log("Transaction started");
        
        foreach ($mapping as $frontKey => $dbKey) {
            if (!isset($settings[$frontKey])) continue;
            
            $value = $settings[$frontKey];
            error_log("Processing: $frontKey => $dbKey = " . json_encode($value));
            
            // Převod boolean na string
            if (is_bool($value)) {
                $value = $value ? '1' : '0';
            }
            
            // Převod NULL na string 'NULL' pro hierarchy_profile_id
            if ($value === null || $value === 'null') {
                $value = 'NULL';
            }
            
            // Převod čísel na string
            if (is_numeric($value)) {
                $value = (string)$value;
            }
            
            error_log("Final value for $dbKey: " . $value);
            
            // INSERT nebo UPDATE
            $sql = "
                INSERT INTO " . TBL_NASTAVENI_GLOBALNI . " (klic, hodnota, vytvoreno) 
                VALUES (:klic, :hodnota, NOW())
                ON DUPLICATE KEY UPDATE hodnota = VALUES(hodnota), aktualizovano = NOW()
            ";
            
            try {
                $stmt = $db->prepare($sql);
                $stmt->bindValue(':klic', $dbKey, PDO::PARAM_STR);
                $stmt->bindValue(':hodnota', $value, PDO::PARAM_STR);
                $stmt->execute();
                error_log("✓ Saved: $dbKey");
            } catch (Exception $e) {
                error_log("✗ ERROR saving $dbKey: " . $e->getMessage());
                throw $e;
            }
        }
        
        $db->commit();
        error_log("Transaction committed");
        
        http_response_code(200);
        echo json_encode(array('status' => 'ok', 'message' => 'Nastavení uloženo'));
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("ERROR in handle_save_settings: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při ukládání nastavení: ' . $e->getMessage()));
    }
}

// STARÝ KÓD - SMAZAT
function handle_global_settings_get_OLD($db, $token_user_id) {
    try {
        // Zkontroluj oprávnění - pouze Admin nebo SuperAdmin
        $userRoles = getUserRolesForSettings($token_user_id, $db);
        
        $isAdmin = false;
        foreach ($userRoles as $role) {
            if ($role['kod_role'] === 'SUPERADMIN' || $role['kod_role'] === 'ADMINISTRATOR') {
                $isAdmin = true;
                break;
            }
        }
        
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode([
                'error' => 'forbidden',
                'message' => 'Přístup odepřen. Pouze administrátoři mohou zobrazit globální nastavení.'
            ]);
            return;
        }
        
        $settingsModel = new GlobalSettingsModel($db);
        $allSettings = $settingsModel->getAllSettings();
        
        // Načíst HTML obsah z tabulky 25_notifikace podle message_id
        $modalContent = '';
        $messageId = $allSettings['post_login_modal_message_id']['hodnota'] ?? null;
        
        error_log('=== POST LOGIN MODAL DEBUG ===');
        error_log('Message ID from settings: ' . var_export($messageId, true));
        
        if ($messageId && $messageId !== 'NULL' && $messageId !== '' && !is_null($messageId)) {
            try {
                error_log('Načítám notifikaci ID: ' . $messageId);
                $stmt = $db->prepare("SELECT zprava FROM 25_notifikace WHERE id = ? AND aktivni = 1 LIMIT 1");
                $stmt->execute([(int)$messageId]);
                $notification = $stmt->fetch(PDO::FETCH_ASSOC);
                
                error_log('Notification result: ' . var_export($notification ? 'FOUND' : 'NOT FOUND', true));
                
                if ($notification && !empty($notification['zprava'])) {
                    $modalContent = $notification['zprava'];
                    error_log('Modal content loaded from 25_notifikace, length: ' . strlen($modalContent));
                }
            } catch (Exception $e) {
                error_log('CHYBA při načítání obsahu notifikace ID ' . $messageId . ': ' . $e->getMessage());
            }
        }
        
        // Fallback na post_login_modal_content z global settings, pokud není načteno z notifikace
        if (empty($modalContent)) {
            $modalContent = $allSettings['post_login_modal_content']['hodnota'] ?? '';
            error_log('Using fallback from global settings, length: ' . strlen($modalContent));
        }
        
        error_log('Final modal content length: ' . strlen($modalContent));
        error_log('=== END DEBUG ===');
        
        // Převést na strukturu pro frontend
        $settings = [
            'notifications_enabled' => ($allSettings['notifications_enabled']['hodnota'] ?? '1') === '1',
            'notifications_bell_enabled' => ($allSettings['notifications_bell_enabled']['hodnota'] ?? '1') === '1',
            'notifications_email_enabled' => ($allSettings['notifications_email_enabled']['hodnota'] ?? '1') === '1',
            'hierarchy_enabled' => ($allSettings['hierarchy_enabled']['hodnota'] ?? '0') === '1',
            'hierarchy_profile_id' => $allSettings['hierarchy_profile_id']['hodnota'] !== 'NULL' && $allSettings['hierarchy_profile_id']['hodnota'] !== null ? (int)$allSettings['hierarchy_profile_id']['hodnota'] : null,
            'hierarchy_logic' => $allSettings['hierarchy_logic']['hodnota'] ?? 'OR',
            'maintenance_mode' => ($allSettings['maintenance_mode']['hodnota'] ?? '0') === '1',
            'maintenance_message' => $allSettings['maintenance_message']['hodnota'] ?? 'Systém je momentálně v údržbě. Omlouváme se za komplikace.',
            // Post-login modal - obsah se načítá z 25_notifikace
            'post_login_modal_enabled' => ($allSettings['post_login_modal_enabled']['hodnota'] ?? '0') === '1',
            'post_login_modal_title' => $allSettings['post_login_modal_title']['hodnota'] ?? 'Důležité upozornění',
            'post_login_modal_guid' => $allSettings['post_login_modal_guid']['hodnota'] ?? 'modal_init_v1',
            'post_login_modal_valid_from' => $allSettings['post_login_modal_valid_from']['hodnota'] ?? null,
            'post_login_modal_valid_to' => $allSettings['post_login_modal_valid_to']['hodnota'] ?? null,
            'post_login_modal_message_id' => $messageId && $messageId !== 'NULL' ? (int)$messageId : null,
            'post_login_modal_content' => $modalContent
        ];
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $settings
        ]);
        
    } catch (Exception $e) {
        error_log('Chyba při načítání globálního nastavení: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'error' => 'server_error',
            'message' => 'Chyba při načítání globálního nastavení'
        ]);
    }
}

/**
 * POST /global-settings
 * Uloží globální nastavení
 */
function handle_global_settings_save($db, $token_user_id, $data) {
    try {
        // Zkontroluj oprávnění - pouze Admin nebo SuperAdmin
        $userRoles = getUserRolesForSettings($token_user_id, $db);
        
        $isAdmin = false;
        $isSuperAdmin = false;
        foreach ($userRoles as $role) {
            if ($role['kod_role'] === 'SUPERADMIN') {
                $isSuperAdmin = true;
                $isAdmin = true;
                break;
            }
            if ($role['kod_role'] === 'ADMINISTRATOR') {
                $isAdmin = true;
            }
        }
        
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode([
                'error' => 'forbidden',
                'message' => 'Přístup odepřen. Pouze administrátoři mohou měnit globální nastavení.'
            ]);
            return;
        }
        
        // Kontrola maintenance mode - pouze SUPERADMIN může měnit
        if (isset($data['maintenance_mode']) && !$isSuperAdmin) {
            http_response_code(403);
            echo json_encode([
                'error' => 'forbidden',
                'message' => 'Pouze SUPERADMIN může měnit režim údržby.'
            ]);
            return;
        }
        
        $settingsModel = new GlobalSettingsModel($db);
        
        // Uložit jednotlivá nastavení
        $keysToSave = [
            'notifications_enabled' => 'boolean',
            'notifications_bell_enabled' => 'boolean',
            'notifications_email_enabled' => 'boolean',
            'hierarchy_enabled' => 'boolean',
            'hierarchy_profile_id' => 'integer',
            'hierarchy_logic' => 'string',
            'maintenance_mode' => 'boolean',
            'maintenance_message' => 'string'
        ];
        
        foreach ($keysToSave as $key => $type) {
            if (!isset($data[$key])) continue;
            
            $value = $data[$key];
            
            // Převést na string pro DB
            if ($type === 'boolean') {
                $value = $value ? '1' : '0';
            } elseif ($type === 'integer') {
                $value = $value !== null ? (string)$value : 'NULL';
            } else {
                $value = (string)$value;
            }
            
            $settingsModel->setSetting($key, $value);
        }
        
        // Logování změn
        error_log("Globální nastavení změněno uživatelem ID: $token_user_id");
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Globální nastavení bylo úspěšně uloženo'
        ]);
        
    } catch (Exception $e) {
        error_log('Chyba při ukládání globálního nastavení: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'error' => 'server_error',
            'message' => 'Chyba při ukládání globálního nastavení'
        ]);
    }
}

/**
 * GET /global-settings/:key
 * Načte jedno konkrétní nastavení podle klíče
 */
function handle_global_settings_get_single($db, $token_user_id, $key) {
    try {
        // Zkontroluj oprávnění - pouze Admin nebo SuperAdmin
        $userRoles = getUserRolesForSettings($token_user_id, $db);
        
        $isAdmin = false;
        foreach ($userRoles as $role) {
            if ($role['kod_role'] === 'SUPERADMIN' || $role['kod_role'] === 'ADMINISTRATOR') {
                $isAdmin = true;
                break;
            }
        }
        
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode([
                'error' => 'forbidden',
                'message' => 'Přístup odepřen'
            ]);
            return;
        }
        
        $settingsModel = new GlobalSettingsModel($db);
        $value = $settingsModel->getSetting($key);
        
        if ($value === null) {
            http_response_code(404);
            echo json_encode([
                'error' => 'not_found',
                'message' => 'Nastavení nebylo nalezeno'
            ]);
            return;
        }
        
        // Převést hodnotu podle typu
        $typedValue = $value;
        if ($value === '1' || $value === '0') {
            $typedValue = $value === '1';
        } elseif (is_numeric($value) && $value !== 'NULL') {
            $typedValue = (int)$value;
        } elseif ($value === 'NULL') {
            $typedValue = null;
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'key' => $key,
            'value' => $typedValue
        ]);
        
    } catch (Exception $e) {
        error_log('Chyba při načítání nastavení: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'error' => 'server_error',
            'message' => 'Chyba při načítání nastavení'
        ]);
    }
}

/**
 * GET /maintenance-status
 * Kontrola údržbového režimu - dostupné i bez autentizace
 */
function handle_maintenance_status_check($db) {
    try {
        $settingsModel = new GlobalSettingsModel($db);
        $maintenanceMode = $settingsModel->getSetting('maintenance_mode');
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'maintenance_mode' => $maintenanceMode === '1'
        ]);
        
    } catch (Exception $e) {
        error_log('Chyba při kontrole maintenance mode: ' . $e->getMessage());
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'maintenance_mode' => false
        ]);
    }
}

/**
 * POST /maintenance-message
 * Načte údržbovou zprávu - dostupné pro přihlášené uživatele
 */
function handle_maintenance_message($input, $db) {
    // Autentizace - pouze ověří že je přihlášený
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token, $db);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }
    
    try {
        $stmt = $db->prepare("SELECT hodnota FROM " . TBL_NASTAVENI_GLOBALNI . " WHERE klic = 'maintenance_message'");
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $message = $row ? $row['hodnota'] : 'Systém je momentálně v údržbě. Omlouváme se za komplikace.';
        
        http_response_code(200);
        echo json_encode(array(
            'status' => 'ok',
            'message' => $message
        ));
    } catch (Exception $e) {
        error_log("Chyba při načítání údržbové zprávy: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při načítání zprávy'));
    }
}

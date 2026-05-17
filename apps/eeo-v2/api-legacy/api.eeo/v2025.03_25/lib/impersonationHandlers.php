<?php
/**
 * User Impersonation Handlers
 * 
 * Umožňuje superadmin/administrator účtům dočasně se přepnout na jiného uživatele.
 * 
 * Endpointy:
 *  POST impersonation/start    - Spustit impersonation na target uživatele
 *  POST impersonation/stop     - Vrátit se zpět na původního admina
 * 
 * Bezpečnost:
 *  - Feature flag kontrola (user_impersonation_enabled v GlobalSettings)
 *  - Pouze SUPERADMIN/ADMINISTRATOR
 *  - Kompletní audit trail
 *  - Target user musí být aktivní
 * 
 * @version 1.0
 * @date 2026-05-17
 */

require_once __DIR__ . '/../models/GlobalSettingsModel.php';
require_once __DIR__ . '/TimezoneHelper.php';

/**
 * POST impersonation/start
 * Spustí impersonation - přepne admina na jiného uživatele
 * 
 * Input: {token, username, target_user_id}
 * Output: {status, data: {id, username, token, userDetail, roles, permissions}}
 */
function handle_impersonation_start($input, $config, $queries) {
    // 1. AUTENTIZACE - ověř volajícího admina
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chybí token nebo username'
        ]);
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Ověř token a načti user data volajícího
        $admin_user = verify_token_v2($username, $token, $db);
        if (!$admin_user) {
            http_response_code(401);
            echo json_encode([
                'status' => 'error',
                'message' => 'Neplatný nebo expirovaný token'
            ]);
            return;
        }
        
        $admin_id = $admin_user['id'];
        $admin_username = $admin_user['username'];
        
        // 2. FEATURE FLAG - kontrola zda je impersonation povolen
        $settingsModel = new GlobalSettingsModel($db);
        $impersonationEnabled = $settingsModel->getSetting('user_impersonation_enabled');
        
        if ($impersonationEnabled !== '1') {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'message' => 'Impersonation je zakázáno systémovým nastavením',
                'error_code' => 'FEATURE_DISABLED'
            ]);
            
            // Audit log pokusu o zakázanou akci
            logImpersonationAttempt($db, $admin_id, null, 'BLOCKED_FEATURE_DISABLED');
            return;
        }
        
        // 3. AUTORIZACE - pouze SUPERADMIN nebo ADMINISTRATOR
        $isAdmin = $admin_user['is_admin'] ?? false;
        $adminRoles = $admin_user['roles'] ?? [];
        
        $isSuperAdminOrAdmin = $isAdmin || 
            in_array('SUPERADMIN', $adminRoles) || 
            in_array('ADMINISTRATOR', $adminRoles);
        
        if (!$isSuperAdminOrAdmin) {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'message' => 'Pouze superadmin a administrator mohou použít impersonation',
                'error_code' => 'INSUFFICIENT_PERMISSIONS'
            ]);
            
            logImpersonationAttempt($db, $admin_id, null, 'BLOCKED_INSUFFICIENT_PERMISSIONS');
            return;
        }
        
        // 4. VALIDACE TARGET USER
        $target_user_id = isset($input['target_user_id']) ? (int)$input['target_user_id'] : 0;
        
        if (!$target_user_id || $target_user_id <= 0) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Chybí nebo neplatné target_user_id'
            ]);
            return;
        }
        
        // Zabránit self-impersonation (nemá smysl)
        if ($target_user_id === $admin_id) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Nelze se přepnout sám na sebe'
            ]);
            return;
        }
        
        // 4. NAČTI KOMPLETNÍ USER DETAIL pro target uživatele (SE VŠEMI JOINy)
        // Použij user_detail_full dotaz z queries.php
        if (!isset($queries['user_detail_full'])) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Chyba: user_detail_full query není definován'
            ]);
            return;
        }
        
        $stmt = $db->prepare($queries['user_detail_full']);
        $stmt->bindParam(':user_id', $target_user_id, PDO::PARAM_INT);
        $stmt->execute();
        $target_user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$target_user) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => 'Cílový uživatel neexistuje',
                'error_code' => 'TARGET_USER_NOT_FOUND'
            ]);
            return;
        }
        
        // Ověř, že target user je aktivní
        if ($target_user['aktivni'] != 1) {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'message' => 'Cílový uživatel není aktivní',
                'error_code' => 'TARGET_USER_INACTIVE'
            ]);
            return;
        }
        
        // 5. VYTVOŘ IMPERSONATION TOKEN pro target uživatele
        $target_username = $target_user['username'];
        $impersonation_token = generate_new_token($target_username);
        
        // 6. NAČTI ROLE pro target uživatele
        $stmtRoles = $db->prepare("
            SELECT DISTINCT r.id, r.kod_role, r.popis
            FROM " . TBL_ROLE . " r
            JOIN " . TBL_UZIVATELE_ROLE . " ur ON r.id = ur.role_id
            WHERE ur.uzivatel_id = :user_id
        ");
        $stmtRoles->bindParam(':user_id', $target_user_id, PDO::PARAM_INT);
        $stmtRoles->execute();
        $target_roles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);
        
        // 🔒 BEZPEČNOST: ADMINISTRATOR nesmí eskalovat práva na SUPERADMIN
        $adminIsSuperAdmin = in_array('SUPERADMIN', $adminRoles);
        $targetIsSuperAdmin = false;
        foreach ($target_roles as $role) {
            if ($role['kod_role'] === 'SUPERADMIN') {
                $targetIsSuperAdmin = true;
                break;
            }
        }
        
        // Pokud admin je pouze ADMINISTRATOR (nemá SUPERADMIN) a cíl je SUPERADMIN → ZAMÍTNOUT
        if (!$adminIsSuperAdmin && $targetIsSuperAdmin) {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'message' => 'Nelze se přepnout na uživatele s rolí SUPERADMIN. Pouze SUPERADMIN může přepnout na jiného SUPERADMIN.',
                'error_code' => 'PRIVILEGE_ESCALATION_BLOCKED'
            ]);
            
            // Audit log - pokus o eskalaci práv
            logImpersonationAttempt(
                $db, 
                $admin_id, 
                $target_user_id, 
                'BLOCKED_PRIVILEGE_ESCALATION',
                "ADMINISTRATOR [{$admin_username}] se pokusil přepnout na SUPERADMIN [{$target_username}]"
            );
            
            return;
        }
        
        // Načti práva (permissions) - OBOJí (přímá + z rolí)
        // 25_role_prava struktura:
        //   user_id=-1, role_id=X → právo přiřazené roli X
        //   user_id=Y, role_id=-1 → právo přiřazené přímo uživateli Y
        $stmtPerms = $db->prepare("
            SELECT DISTINCT p.id, p.kod_prava, p.popis
            FROM " . TBL_ROLE_PRAVA . " rp
            INNER JOIN " . TBL_PRAVA . " p ON p.id = rp.pravo_id
            WHERE (
                (rp.user_id = :user_id AND rp.role_id = -1)  -- přímo přiřazená práva uživateli
                OR (
                    rp.user_id = -1  -- práva z role
                    AND rp.role_id IN (
                        SELECT role_id 
                        FROM " . TBL_UZIVATELE_ROLE . " 
                        WHERE uzivatel_id = :user_id2
                    )
                )
            )
            AND rp.aktivni = 1
            AND p.aktivni = 1
        ");
        $stmtPerms->bindParam(':user_id', $target_user_id, PDO::PARAM_INT);
        $stmtPerms->bindParam(':user_id2', $target_user_id, PDO::PARAM_INT);
        $stmtPerms->execute();
        $target_permissions = $stmtPerms->fetchAll(PDO::FETCH_ASSOC);
        
        // 7. SESTAVIT KOMPLETNÍ userDetail objekt (jako při normálním loginu)
        // Struktura musí odpovídat tomu, co frontend očekává (včetně usek_zkr, lokalita_nazev, atd.)
        $userDetail = [
            // Základní údaje
            'id' => (int)$target_user['uzivatel_id'],
            'uzivatel_id' => (int)$target_user['uzivatel_id'],
            'username' => $target_user['username'],
            'login' => $target_user['login'],
            'email' => $target_user['email'] ?? '',
            'jmeno' => $target_user['jmeno'] ?? '',
            'prijmeni' => $target_user['prijmeni'] ?? '',
            'titul_pred' => $target_user['titul_pred'] ?? '',
            'titul_za' => $target_user['titul_za'] ?? '',
            'telefon' => $target_user['telefon'] ?? '',
            'aktivni' => (int)$target_user['aktivni'],
            'dt_vytvoreni' => $target_user['dt_vytvoreni'] ?? null,
            'dt_aktualizace' => $target_user['dt_aktualizace'] ?? null,
            'dt_posledni_aktivita' => $target_user['dt_posledni_aktivita'] ?? null,
            
            // Úsek (usek_zkr může být array nebo string)
            'usek_id' => $target_user['usek_id'] ? (int)$target_user['usek_id'] : null,
            'usek_zkr' => $target_user['usek_zkratka'] ?? '',  // Frontend používá usek_zkr!
            'usek_nazev' => $target_user['usek_nazev'] ?? '',
            
            // Pozice
            'pozice_id' => $target_user['pozice_id'] ? (int)$target_user['pozice_id'] : null,
            'nazev_pozice' => $target_user['pozice_nazev'] ?? '',
            'pozice_parent_id' => $target_user['pozice_parent_id'] ? (int)$target_user['pozice_parent_id'] : null,
            
            // Lokalita - frontend očekává lokalita_nazev jako OBJEKT {nazev: "..."}
            'lokalita_id' => $target_user['lokalita_id'] ? (int)$target_user['lokalita_id'] : null,
            'lokalita_nazev' => [
                'nazev' => $target_user['lokalita_nazev'] ?? ''
            ],
            'lokalita_typ' => $target_user['lokalita_typ'] ?? '',
            'lokalita_parent_id' => $target_user['lokalita_parent_id'] ? (int)$target_user['lokalita_parent_id'] : null,
            
            // Organizace
            'organizace_id' => $target_user['organizace_id'] ? (int)$target_user['organizace_id'] : null,
            'organizace' => [
                'id' => $target_user['organizace_id'] ? (int)$target_user['organizace_id'] : null,
                'nazev' => $target_user['organizace_nazev'] ?? '',
                'ico' => $target_user['organizace_ico'] ?? '',
                'dic' => $target_user['organizace_dic'] ?? ''
            ],
            
            // Role a práva
            'roles' => $target_roles,
            'permissions' => $target_permissions,
            'direct_rights' => $target_permissions  // Alias pro frontend
        ];
        
        // 8. AUDIT LOG - zaznamenej start impersonation
        logImpersonationAction($db, $admin_id, $target_user_id, 'START', [
            'admin_username' => $admin_username,
            'target_username' => $target_username,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        // 9. RESPONSE - vrať data pro target uživatele
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Impersonation úspěšně spuštěn',
            'data' => [
                'id' => (int)$target_user['uzivatel_id'],
                'username' => $target_username,
                'token' => $impersonation_token,
                'userDetail' => $userDetail,
                'impersonated_by_admin_id' => $admin_id,
                'impersonated_by_username' => $admin_username
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("❌ Impersonation start error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při spuštění impersonation: ' . $e->getMessage()
        ]);
    }
}

/**
 * POST impersonation/stop
 * Ukončí impersonation - vrátí se zpět na původního admina
 * 
 * Input: {original_token, original_username}
 * Output: {status, data: {id, username, token, userDetail}}
 */
function handle_impersonation_stop($input, $config, $queries) {
    // 1. VALIDACE INPUTU
    $original_token = isset($input['original_token']) ? $input['original_token'] : '';
    $original_username = isset($input['original_username']) ? $input['original_username'] : '';
    
    if (!$original_token || !$original_username) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chybí original_token nebo original_username'
        ]);
        return;
    }
    
    try {
        $db = get_db($config);
        
        // 2. OVĚŘ PŮVODNÍ TOKEN
        $admin_user = verify_token_v2($original_username, $original_token, $db);
        if (!$admin_user) {
            http_response_code(401);
            echo json_encode([
                'status' => 'error',
                'message' => 'Neplatný nebo expirovaný původní token'
            ]);
            return;
        }
        
        $admin_id = $admin_user['id'];
        $admin_username = $admin_user['username'];
        
        // 3. NAČTI KOMPLETNÍ USER DETAIL pro původního admina (SE VŠEMI JOINy)
        if (!isset($queries['user_detail_full'])) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => 'Chyba: user_detail_full query není definován'
            ]);
            return;
        }
        
        $stmt = $db->prepare($queries['user_detail_full']);
        $stmt->bindParam(':user_id', $admin_id, PDO::PARAM_INT);
        $stmt->execute();
        $admin_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$admin_data) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => 'Původní admin účet nenalezen nebo není aktivní'
            ]);
            return;
        }
        
        // Načti role a práva
        $stmtRoles = $db->prepare("
            SELECT DISTINCT r.id, r.kod_role, r.popis
            FROM " . TBL_ROLE . " r
            JOIN " . TBL_UZIVATELE_ROLE . " ur ON r.id = ur.role_id
            WHERE ur.uzivatel_id = :user_id
        ");
        $stmtRoles->bindParam(':user_id', $admin_id, PDO::PARAM_INT);
        $stmtRoles->execute();
        $admin_roles = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);
        
        // Načti práva (permissions) - OBOJí (přímá + z rolí)
        $stmtPerms = $db->prepare("
            SELECT DISTINCT p.id, p.kod_prava, p.popis
            FROM " . TBL_ROLE_PRAVA . " rp
            INNER JOIN " . TBL_PRAVA . " p ON p.id = rp.pravo_id
            WHERE (
                (rp.user_id = :user_id AND rp.role_id = -1)  -- přímo přiřazená práva uživateli
                OR (
                    rp.user_id = -1  -- práva z role
                    AND rp.role_id IN (
                        SELECT role_id 
                        FROM " . TBL_UZIVATELE_ROLE . " 
                        WHERE uzivatel_id = :user_id2
                    )
                )
            )
            AND rp.aktivni = 1
            AND p.aktivni = 1
        ");
        $stmtPerms->bindParam(':user_id', $admin_id, PDO::PARAM_INT);
        $stmtPerms->bindParam(':user_id2', $admin_id, PDO::PARAM_INT);
        $stmtPerms->execute();
        $admin_permissions = $stmtPerms->fetchAll(PDO::FETCH_ASSOC);
        
        // 4. SESTAVIT KOMPLETNÍ userDetail objekt pro admina (jako při normálním loginu)
        $userDetail = [
            // Základní údaje
            'id' => (int)$admin_data['uzivatel_id'],
            'uzivatel_id' => (int)$admin_data['uzivatel_id'],
            'username' => $admin_data['username'],
            'login' => $admin_data['login'],
            'email' => $admin_data['email'] ?? '',
            'jmeno' => $admin_data['jmeno'] ?? '',
            'prijmeni' => $admin_data['prijmeni'] ?? '',
            'titul_pred' => $admin_data['titul_pred'] ?? '',
            'titul_za' => $admin_data['titul_za'] ?? '',
            'telefon' => $admin_data['telefon'] ?? '',
            'aktivni' => (int)$admin_data['aktivni'],
            'dt_vytvoreni' => $admin_data['dt_vytvoreni'] ?? null,
            'dt_aktualizace' => $admin_data['dt_aktualizace'] ?? null,
            'dt_posledni_aktivita' => $admin_data['dt_posledni_aktivita'] ?? null,
            
            // Úsek (usek_zkr může být array nebo string)
            'usek_id' => $admin_data['usek_id'] ? (int)$admin_data['usek_id'] : null,
            'usek_zkr' => $admin_data['usek_zkratka'] ?? '',  // Frontend používá usek_zkr!
            'usek_nazev' => $admin_data['usek_nazev'] ?? '',
            
            // Pozice
            'pozice_id' => $admin_data['pozice_id'] ? (int)$admin_data['pozice_id'] : null,
            'nazev_pozice' => $admin_data['pozice_nazev'] ?? '',
            'pozice_parent_id' => $admin_data['pozice_parent_id'] ? (int)$admin_data['pozice_parent_id'] : null,
            
            // Lokalita - frontend očekává lokalita_nazev jako OBJEKT {nazev: "..."}
            'lokalita_id' => $admin_data['lokalita_id'] ? (int)$admin_data['lokalita_id'] : null,
            'lokalita_nazev' => [
                'nazev' => $admin_data['lokalita_nazev'] ?? ''
            ],
            'lokalita_typ' => $admin_data['lokalita_typ'] ?? '',
            'lokalita_parent_id' => $admin_data['lokalita_parent_id'] ? (int)$admin_data['lokalita_parent_id'] : null,
            
            // Organizace
            'organizace_id' => $admin_data['organizace_id'] ? (int)$admin_data['organizace_id'] : null,
            'organizace' => [
                'id' => $admin_data['organizace_id'] ? (int)$admin_data['organizace_id'] : null,
                'nazev' => $admin_data['organizace_nazev'] ?? '',
                'ico' => $admin_data['organizace_ico'] ?? '',
                'dic' => $admin_data['organizace_dic'] ?? ''
            ],
            
            // Role a práva
            'roles' => $admin_roles,
            'permissions' => $admin_permissions,
            'direct_rights' => $admin_permissions  // Alias pro frontend
        ];
        
        // 5. AUDIT LOG - zaznamenej stop impersonation
        logImpersonationAction($db, $admin_id, null, 'STOP', [
            'admin_username' => $admin_username,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        // 6. RESPONSE - vrať data pro původního admina
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Impersonation úspěšně ukončen',
            'data' => [
                'id' => (int)$admin_data['uzivatel_id'],
                'username' => $admin_username,
                'token' => $original_token, // Použij stejný token (je stále platný)
                'userDetail' => $userDetail
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("❌ Impersonation stop error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při ukončení impersonation: ' . $e->getMessage()
        ]);
    }
}

/**
 * Helper: Zaloguj impersonation akci do audit logu
 */
function logImpersonationAction($db, $admin_user_id, $target_user_id, $action, $metadata = []) {
    try {
        TimezoneHelper::setMysqlTimezone($db);
        
        $metadata_json = json_encode($metadata, JSON_UNESCAPED_UNICODE);
        
        $stmt = $db->prepare("
            INSERT INTO " . TBL_UZIVATELE_AKTIVITA_LOG . " 
            (uzivatel_id, modul, akce, metadata, dt_vytvoreni)
            VALUES (:user_id, 'USER_IMPERSONATION', :action, :metadata, NOW())
        ");
        
        $stmt->bindParam(':user_id', $admin_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':action', $action, PDO::PARAM_STR);
        $stmt->bindParam(':metadata', $metadata_json, PDO::PARAM_STR);
        $stmt->execute();
        
        // Pokud je START, zaloguj i target user ID
        if ($action === 'START' && $target_user_id) {
            $metadata['action_type'] = 'IMPERSONATED';
            $metadata_json2 = json_encode($metadata, JSON_UNESCAPED_UNICODE);
            
            $stmt2 = $db->prepare("
                INSERT INTO " . TBL_UZIVATELE_AKTIVITA_LOG . " 
                (uzivatel_id, modul, akce, metadata, dt_vytvoreni)
                VALUES (:user_id, 'USER_IMPERSONATION', 'IMPERSONATED_BY_ADMIN', :metadata, NOW())
            ");
            $stmt2->bindParam(':user_id', $target_user_id, PDO::PARAM_INT);
            $stmt2->bindParam(':metadata', $metadata_json2, PDO::PARAM_STR);
            $stmt2->execute();
        }
        
    } catch (Exception $e) {
        error_log("❌ Failed to log impersonation action: " . $e->getMessage());
        // Non-fatal - pokračuj i když log selže
    }
}

/**
 * Helper: Zaloguj pokus o impersonation (pro security audit)
 */
function logImpersonationAttempt($db, $admin_user_id, $target_user_id, $reason, $custom_message = null) {
    try {
        TimezoneHelper::setMysqlTimezone($db);
        
        $metadata = [
            'reason' => $reason,
            'target_user_id' => $target_user_id,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        // Přidat custom message pokud je zadaný
        if ($custom_message !== null) {
            $metadata['message'] = $custom_message;
        }
        
        $metadata_json = json_encode($metadata, JSON_UNESCAPED_UNICODE);
        
        $stmt = $db->prepare("
            INSERT INTO " . TBL_UZIVATELE_AKTIVITA_LOG . " 
            (uzivatel_id, modul, akce, metadata, dt_vytvoreni)
            VALUES (:user_id, 'USER_IMPERSONATION', 'ATTEMPT_BLOCKED', :metadata, NOW())
        ");
        
        $stmt->bindParam(':user_id', $admin_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':metadata', $metadata_json, PDO::PARAM_STR);
        $stmt->execute();
        
    } catch (Exception $e) {
        error_log("❌ Failed to log impersonation attempt: " . $e->getMessage());
    }
}

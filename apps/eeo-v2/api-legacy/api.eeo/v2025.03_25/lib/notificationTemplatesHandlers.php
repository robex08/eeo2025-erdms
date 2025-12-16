<?php
/**
 * Notification Templates CRUD API Handlers
 * 
 * Funkce pro správu notifikačních šablon (CRUD operace)
 * Vyžaduje admin oprávnění
 */

// Include necessary functions
if (!function_exists('verify_token')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}

// Include TimezoneHelper for consistent datetime handling
require_once __DIR__ . '/TimezoneHelper.php';

// ==========================================
// HELPER FUNKCE
// ==========================================

/**
 * Ověří, že uživatel má admin práva
 */
function checkAdminPermission($token_data) {
    // TODO: Implementovat kontrolu admin role podle vaší logiky
    // Zatím假設 všichni ověření uživatelé mohou spravovat šablony
    // V produkci: zkontrolovat role_id nebo specific permission
    
    // Příklad:
    // if ($token_data['role_id'] != 1) { // 1 = admin
    //     return false;
    // }
    
    return true; // TEMPORARY - všichni mohou upravovat
}

// ==========================================
// API HANDLERY PRO TEMPLATES CRUD
// ==========================================

/**
 * Seznam všech notifikačních šablon
 * POST /notifications/templates/list
 */
function handle_notifications_templates_list($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    // Kontrola oprávnění
    if (!checkAdminPermission($token_data)) {
        http_response_code(403);
        echo json_encode(['err' => 'Nemáte oprávnění pro správu šablon']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Parametry
        $active_only = isset($input['active_only']) ? (bool)$input['active_only'] : false;
        $search = isset($input['search']) ? trim($input['search']) : '';
        
        // Sestavení dotazu
        $where_conditions = [];
        $params = [];
        
        if ($active_only) {
            $where_conditions[] = "aktivni = 1";
        }
        
        if (!empty($search)) {
            $where_conditions[] = "(typ LIKE :search OR nazev LIKE :search)";
            $params[':search'] = "%{$search}%";
        }
        
        $where_sql = !empty($where_conditions) 
            ? "WHERE " . implode(' AND ', $where_conditions) 
            : "";
        
        $sql = "SELECT * FROM " . TABLE_NOTIFIKACE_SABLONY . " 
                {$where_sql}
                ORDER BY typ ASC";
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Formátování pro frontend
        $result = array_map(function($t) {
            return [
                'id' => (int)$t['id'],
                'typ' => $t['typ'],
                'nazev' => $t['nazev'],
                'email_predmet' => $t['email_predmet'],
                'email_telo' => $t['email_telo'],
                'app_nadpis' => $t['app_nadpis'],
                'app_message' => $t['app_message'],
                'odeslat_email_default' => (bool)$t['odeslat_email_default'],
                'priorita_vychozi' => $t['priorita_vychozi'],
                'aktivni' => (bool)$t['aktivni'],
                'dt_created' => $t['dt_created'],
                'dt_updated' => $t['dt_updated']
            ];
        }, $templates);
        
        echo json_encode([
            'status' => 'ok',
            'data' => $result,
            'total' => count($result)
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání šablon: ' . $e->getMessage()]);
        error_log("[Templates] Exception in handle_notifications_templates_list: " . $e->getMessage());
    }
}

/**
 * Detail jedné šablony
 * POST /notifications/templates/detail
 */
function handle_notifications_templates_detail($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $template_id = isset($input['template_id']) ? (int)$input['template_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($template_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID šablony']);
        return;
    }

    try {
        $db = get_db($config);
        
        $stmt = $db->prepare("SELECT * FROM " . TABLE_NOTIFIKACE_SABLONY . " WHERE id = ?");
        $stmt->execute([$template_id]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$template) {
            http_response_code(404);
            echo json_encode(['err' => 'Šablona nenalezena']);
            return;
        }
        
        // Formátování
        $result = [
            'id' => (int)$template['id'],
            'typ' => $template['typ'],
            'nazev' => $template['nazev'],
            'email_predmet' => $template['email_predmet'],
            'email_telo' => $template['email_telo'],
            'app_nadpis' => $template['app_nadpis'],
            'app_message' => $template['app_message'],
            'odeslat_email_default' => (bool)$template['odeslat_email_default'],
            'priorita_vychozi' => $template['priorita_vychozi'],
            'aktivni' => (bool)$template['aktivni'],
            'dt_created' => $template['dt_created'],
            'dt_updated' => $template['dt_updated']
        ];
        
        echo json_encode([
            'status' => 'ok',
            'data' => $result
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání šablony: ' . $e->getMessage()]);
    }
}

/**
 * Vytvoření nové šablony
 * POST /notifications/templates/create
 */
function handle_notifications_templates_create($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    // Kontrola oprávnění
    if (!checkAdminPermission($token_data)) {
        http_response_code(403);
        echo json_encode(['err' => 'Nemáte oprávnění pro vytváření šablon']);
        return;
    }

    // Validace povinných polí
    $required_fields = ['typ', 'nazev'];
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['err' => "Chybí povinné pole: $field"]);
            return;
        }
    }

    try {
        $db = get_db($config);
        
        // Kontrola, zda typ již neexistuje
        $stmt = $db->prepare("SELECT id FROM " . TABLE_NOTIFIKACE_SABLONY . " WHERE typ = ?");
        $stmt->execute([$input['typ']]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['err' => 'Šablona s tímto typem již existuje']);
            return;
        }
        
        // Příprava dat
        $current_time = TimezoneHelper::getCzechDateTime();
        
        $sql = "INSERT INTO " . TABLE_NOTIFIKACE_SABLONY . " (
                    typ, nazev, email_predmet, email_telo, app_nadpis, app_message,
                    odeslat_email_default, priorita_vychozi, aktivni, dt_created
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute([
            $input['typ'],
            $input['nazev'],
            isset($input['email_predmet']) ? $input['email_predmet'] : null,
            isset($input['email_telo']) ? $input['email_telo'] : null,
            isset($input['app_nadpis']) ? $input['app_nadpis'] : null,
            isset($input['app_message']) ? $input['app_message'] : null,
            isset($input['odeslat_email_default']) ? (int)$input['odeslat_email_default'] : 0,
            isset($input['priorita_vychozi']) ? $input['priorita_vychozi'] : 'normal',
            isset($input['aktivni']) ? (int)$input['aktivni'] : 1,
            $current_time
        ]);
        
        if (!$result) {
            throw new Exception('INSERT selhal');
        }
        
        $template_id = $db->lastInsertId();
        
        echo json_encode([
            'status' => 'ok',
            'zprava' => 'Šablona byla vytvořena',
            'template_id' => (int)$template_id
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při vytváření šablony: ' . $e->getMessage()]);
        error_log("[Templates] Exception in handle_notifications_templates_create: " . $e->getMessage());
    }
}

/**
 * Úprava existující šablony
 * POST /notifications/templates/update
 */
function handle_notifications_templates_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $template_id = isset($input['template_id']) ? (int)$input['template_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    // Kontrola oprávnění
    if (!checkAdminPermission($token_data)) {
        http_response_code(403);
        echo json_encode(['err' => 'Nemáte oprávnění pro úpravu šablon']);
        return;
    }

    if ($template_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID šablony']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Kontrola existence
        $stmt = $db->prepare("SELECT id FROM " . TABLE_NOTIFIKACE_SABLONY . " WHERE id = ?");
        $stmt->execute([$template_id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['err' => 'Šablona nenalezena']);
            return;
        }
        
        // Sestavení UPDATE dotazu - jen pole, která byla poslána
        $update_fields = [];
        $params = [];
        
        $allowed_fields = [
            'nazev', 'email_predmet', 'email_telo', 'app_nadpis', 'app_message',
            'odeslat_email_default', 'priorita_vychozi', 'aktivni'
        ];
        
        foreach ($allowed_fields as $field) {
            if (isset($input[$field])) {
                $update_fields[] = "$field = ?";
                
                // Speciální zpracování pro boolean hodnoty
                if (in_array($field, ['odeslat_email_default', 'aktivni'])) {
                    $params[] = (int)$input[$field];
                } else {
                    $params[] = $input[$field];
                }
            }
        }
        
        if (empty($update_fields)) {
            http_response_code(400);
            echo json_encode(['err' => 'Žádná pole k aktualizaci']);
            return;
        }
        
        // Přidat dt_updated
        $update_fields[] = "dt_updated = ?";
        $params[] = TimezoneHelper::getCzechDateTime();
        
        // Přidat template_id na konec
        $params[] = $template_id;
        
        $sql = "UPDATE " . TABLE_NOTIFIKACE_SABLONY . " 
                SET " . implode(', ', $update_fields) . "
                WHERE id = ?";
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute($params);
        
        if (!$result) {
            throw new Exception('UPDATE selhal');
        }
        
        echo json_encode([
            'status' => 'ok',
            'zprava' => 'Šablona byla aktualizována'
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při aktualizaci šablony: ' . $e->getMessage()]);
        error_log("[Templates] Exception in handle_notifications_templates_update: " . $e->getMessage());
    }
}

/**
 * Smazání šablony
 * POST /notifications/templates/delete
 */
function handle_notifications_templates_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $template_id = isset($input['template_id']) ? (int)$input['template_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    // Kontrola oprávnění
    if (!checkAdminPermission($token_data)) {
        http_response_code(403);
        echo json_encode(['err' => 'Nemáte oprávnění pro mazání šablon']);
        return;
    }

    if ($template_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID šablony']);
        return;
    }

    try {
        $db = get_db($config);
        
        // Kontrola existence
        $stmt = $db->prepare("SELECT typ FROM " . TABLE_NOTIFIKACE_SABLONY . " WHERE id = ?");
        $stmt->execute([$template_id]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$template) {
            http_response_code(404);
            echo json_encode(['err' => 'Šablona nenalezena']);
            return;
        }
        
        // Smazání
        $stmt = $db->prepare("DELETE FROM " . TABLE_NOTIFIKACE_SABLONY . " WHERE id = ?");
        $result = $stmt->execute([$template_id]);
        
        if (!$result) {
            throw new Exception('DELETE selhal');
        }
        
        error_log("[Templates] Deleted template ID: $template_id, typ: {$template['typ']}");
        
        echo json_encode([
            'status' => 'ok',
            'zprava' => 'Šablona byla smazána'
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při mazání šablony: ' . $e->getMessage()]);
        error_log("[Templates] Exception in handle_notifications_templates_delete: " . $e->getMessage());
    }
}

/**
 * Deaktivace šablony
 * POST /notifications/templates/deactivate
 */
function handle_notifications_templates_deactivate($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $template_id = isset($input['template_id']) ? (int)$input['template_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    // Kontrola oprávnění
    if (!checkAdminPermission($token_data)) {
        http_response_code(403);
        echo json_encode(['err' => 'Nemáte oprávnění']);
        return;
    }

    if ($template_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID šablony']);
        return;
    }

    try {
        $db = get_db($config);
        
        $current_time = TimezoneHelper::getCzechDateTime();
        $stmt = $db->prepare("UPDATE " . TABLE_NOTIFIKACE_SABLONY . " 
                             SET aktivni = 0, dt_updated = ? 
                             WHERE id = ?");
        $result = $stmt->execute([$current_time, $template_id]);
        
        if (!$result || $stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['err' => 'Šablona nenalezena']);
            return;
        }
        
        echo json_encode([
            'status' => 'ok',
            'zprava' => 'Šablona byla deaktivována'
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při deaktivaci: ' . $e->getMessage()]);
    }
}

/**
 * Aktivace šablony
 * POST /notifications/templates/activate
 */
function handle_notifications_templates_activate($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $template_id = isset($input['template_id']) ? (int)$input['template_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    // Kontrola oprávnění
    if (!checkAdminPermission($token_data)) {
        http_response_code(403);
        echo json_encode(['err' => 'Nemáte oprávnění']);
        return;
    }

    if ($template_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID šablony']);
        return;
    }

    try {
        $db = get_db($config);
        
        $current_time = TimezoneHelper::getCzechDateTime();
        $stmt = $db->prepare("UPDATE " . TABLE_NOTIFIKACE_SABLONY . " 
                             SET aktivni = 1, dt_updated = ? 
                             WHERE id = ?");
        $result = $stmt->execute([$current_time, $template_id]);
        
        if (!$result || $stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['err' => 'Šablona nenalezena']);
            return;
        }
        
        echo json_encode([
            'status' => 'ok',
            'zprava' => 'Šablona byla aktivována'
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při aktivaci: ' . $e->getMessage()]);
    }
}

?>

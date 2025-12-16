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
            $where_conditions[] = "active = 1";
        }
        
        if (!empty($search)) {
            $where_conditions[] = "(type LIKE :search OR name LIKE :search)";
            $params[':search'] = "%{$search}%";
        }
        
        $where_sql = !empty($where_conditions) 
            ? "WHERE " . implode(' AND ', $where_conditions) 
            : "";
        
        $sql = "SELECT * FROM " . TABLE_NOTIFIKACE_SABLONY . " 
                {$where_sql}
                ORDER BY type ASC";
        
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
                'type' => $t['type'],
                'name' => $t['name'],
                'email_subject' => $t['email_subject'],
                'email_body' => $t['email_body'],
                'app_title' => $t['app_title'],
                'app_message' => $t['app_message'],
                'send_email_default' => (bool)$t['send_email_default'],
                'priority_default' => $t['priority_default'],
                'active' => (bool)$t['active'],
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
            'type' => $template['type'],
            'name' => $template['name'],
            'email_subject' => $template['email_subject'],
            'email_body' => $template['email_body'],
            'app_title' => $template['app_title'],
            'app_message' => $template['app_message'],
            'send_email_default' => (bool)$template['send_email_default'],
            'priority_default' => $template['priority_default'],
            'active' => (bool)$template['active'],
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
    $required_fields = ['type', 'name'];
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['err' => "Chybí povinné pole: $field"]);
            return;
        }
    }

    try {
        $db = get_db($config);
        
        // Kontrola, zda type již neexistuje
        $stmt = $db->prepare("SELECT id FROM " . TABLE_NOTIFIKACE_SABLONY . " WHERE type = ?");
        $stmt->execute([$input['type']]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['err' => 'Šablona s tímto typem již existuje']);
            return;
        }
        
        // Příprava dat
        $current_time = TimezoneHelper::getCzechDateTime();
        
        $sql = "INSERT INTO " . TABLE_NOTIFIKACE_SABLONY . " (
                    type, name, email_subject, email_body, app_title, app_message,
                    send_email_default, priority_default, active, dt_created
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute([
            $input['type'],
            $input['name'],
            isset($input['email_subject']) ? $input['email_subject'] : null,
            isset($input['email_body']) ? $input['email_body'] : null,
            isset($input['app_title']) ? $input['app_title'] : null,
            isset($input['app_message']) ? $input['app_message'] : null,
            isset($input['send_email_default']) ? (int)$input['send_email_default'] : 0,
            isset($input['priority_default']) ? $input['priority_default'] : 'normal',
            isset($input['active']) ? (int)$input['active'] : 1,
            $current_time
        ]);
        
        if (!$result) {
            throw new Exception('INSERT selhal');
        }
        
        $template_id = $db->lastInsertId();
        
        echo json_encode([
            'status' => 'ok',
            'message' => 'Šablona byla vytvořena',
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
            'name', 'email_subject', 'email_body', 'app_title', 'app_message',
            'send_email_default', 'priority_default', 'active'
        ];
        
        foreach ($allowed_fields as $field) {
            if (isset($input[$field])) {
                $update_fields[] = "$field = ?";
                
                // Speciální zpracování pro boolean hodnoty
                if (in_array($field, ['send_email_default', 'active'])) {
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
            'message' => 'Šablona byla aktualizována'
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
        $stmt = $db->prepare("SELECT type FROM " . TABLE_NOTIFIKACE_SABLONY . " WHERE id = ?");
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
        
        error_log("[Templates] Deleted template ID: $template_id, type: {$template['type']}");
        
        echo json_encode([
            'status' => 'ok',
            'message' => 'Šablona byla smazána'
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
                             SET active = 0, dt_updated = ? 
                             WHERE id = ?");
        $result = $stmt->execute([$current_time, $template_id]);
        
        if (!$result || $stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['err' => 'Šablona nenalezena']);
            return;
        }
        
        echo json_encode([
            'status' => 'ok',
            'message' => 'Šablona byla deaktivována'
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
                             SET active = 1, dt_updated = ? 
                             WHERE id = ?");
        $result = $stmt->execute([$current_time, $template_id]);
        
        if (!$result || $stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['err' => 'Šablona nenalezena']);
            return;
        }
        
        echo json_encode([
            'status' => 'ok',
            'message' => 'Šablona byla aktivována'
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při aktivaci: ' . $e->getMessage()]);
    }
}

?>

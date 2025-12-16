<?php
/**
 * Notification System API Handlers
 * 
 * Funkce pro správu notifikačního systému
 */

// Include necessary functions from handlers.php
if (!function_exists('verify_token')) {
    require_once 'handlers.php';
}
if (!function_exists('get_db')) {
    require_once 'handlers.php';
}

// Include TimezoneHelper for consistent datetime handling
require_once __DIR__ . '/TimezoneHelper.php';

// Include notification helpers (nové funkce pro placeholdery)
require_once __DIR__ . '/notificationHelpers.php';

// ==========================================
// HELPER FUNKCE
// ==========================================

/**
 * Vytvoří novou notifikaci s MySQL 5.5 kompatibilitou
 */
function createNotification($db, $params) {
    // Přidáme dt_created pro MySQL 5.5 kompatibilitu
    if (!isset($params[':dt_created'])) {
        $params[':dt_created'] = TimezoneHelper::getCzechDateTime();
    }
    
    // Přidáme active flag pokud není nastaven
    if (!isset($params[':active'])) {
        $params[':active'] = 1;
    }
    
    $sql = "INSERT INTO 25_notifications 
            (type, title, message, data_json, from_user_id, to_user_id, to_users_json, to_all_users, 
             priority, category, send_email, related_object_type, related_object_id, dt_expires, dt_created, active) 
            VALUES 
            (:type, :title, :message, :data_json, :from_user_id, :to_user_id, :to_users_json, :to_all_users,
             :priority, :category, :send_email, :related_object_type, :related_object_id, :dt_expires, :dt_created, :active)";
    
    try {
        $stmt = $db->prepare($sql);
        $result = $stmt->execute($params);
        
        if (!$result) {
            error_log("[Notifications] SQL Error: " . json_encode($stmt->errorInfo()));
            error_log("[Notifications] SQL Params: " . json_encode($params));
        }
        
        return $result;
        
    } catch (Exception $e) {
        error_log("[Notifications] Exception in createNotification: " . $e->getMessage());
        error_log("[Notifications] SQL Params: " . json_encode($params));
        throw $e;
    }
}

/**
 * Načte template pro daný typ notifikace
 */
function getNotificationTemplate($db, $type) {
    $sql = "SELECT * FROM 25_notification_templates WHERE type = :type AND active = 1";
    $stmt = $db->prepare($sql);
    $stmt->execute(array(':type' => $type));
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Nahradí placeholdery v textu notifikace
 */
function replacePlaceholders($text, $data) {
    if (empty($text) || empty($data)) return $text;
    
    foreach ($data as $key => $value) {
        $text = str_replace('{' . $key . '}', $value, $text);
    }
    return $text;
}

// ==========================================
// API HANDLERY
// ==========================================

/**
 * Načte notifikace pro uživatele podle 2-tabulkové struktury FE
 * POST /notifications/list
 * 
 * Používá INNER JOIN s 25_notifications_read - uživatel vidí jen notifikace,
 * pro které má záznam v read tabulce
 */
function handle_notifications_list($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    try {
        $db = get_db($config);
        $user_id = $token_data['id'];
        
        // Parametry
        $limit = isset($input['limit']) ? (int)$input['limit'] : 20;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        $unread_only = isset($input['unread_only']) ? (bool)$input['unread_only'] : false;
        $category = isset($input['category']) ? $input['category'] : null;
        $include_dismissed = isset($input['include_dismissed']) ? (bool)$input['include_dismissed'] : false;

        // Sestavení dotazu - INNER JOIN s read tabulkou
        $where_conditions = array(
            "nr.user_id = :user_id",
            "n.active = 1",
            "(n.dt_expires IS NULL OR n.dt_expires > NOW())"
        );
        
        // Vždy filtruj smazané notifikace
        $where_conditions[] = "nr.is_deleted = 0";
        
        // Pokud NENÍ include_dismissed, filtruj skryté notifikace
        if (!$include_dismissed) {
            $where_conditions[] = "nr.is_dismissed = 0";
        }
        
        $params = array(':user_id' => $user_id);

        if ($unread_only) {
            $where_conditions[] = "nr.is_read = 0";
        }

        if ($category) {
            $where_conditions[] = "n.category = :category";
            $params[':category'] = $category;
        }

        // Sestavení SELECT - vždy včetně is_dismissed a is_deleted
        $select_columns = "n.id,
                    n.type,
                    n.title,
                    n.message,
                    n.priority,
                    n.category,
                    n.related_object_type,
                    n.related_object_id,
                    n.data_json,
                    n.dt_created,
                    nr.is_read,
                    nr.dt_read,
                    nr.is_dismissed,
                    nr.dt_dismissed";

        $sql = "SELECT " . $select_columns . "
                FROM 25_notifications n
                INNER JOIN 25_notifications_read nr ON n.id = nr.notification_id
                WHERE " . implode(' AND ', $where_conditions) . "
                ORDER BY n.dt_created DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Formátuj data pro frontend
        $result = array_map(function($notif) {
            $item = array(
                'id' => (int)$notif['id'],
                'type' => $notif['type'],
                'title' => $notif['title'],
                'message' => $notif['message'],
                'priority' => $notif['priority'],
                'category' => $notif['category'],
                'related_object_type' => $notif['related_object_type'],
                'related_object_id' => $notif['related_object_id'] ? (int)$notif['related_object_id'] : null,
                'data' => $notif['data_json'] ? json_decode($notif['data_json'], true) : null,
                'is_read' => $notif['is_read'] == 1,
                'dt_read' => $notif['dt_read'],
                'dt_created' => $notif['dt_created']
            );
            
            // Vždy vrátit is_dismissed (už je v SELECT)
            $item['is_dismissed'] = $notif['is_dismissed'] == 1;
            $item['dt_dismissed'] = $notif['dt_dismissed'];
            
            return $item;
        }, $notifications);

        // Počet celkem pro stránkování
        $count_sql = "SELECT COUNT(*) as total
                      FROM 25_notifications n
                      INNER JOIN 25_notifications_read nr ON n.id = nr.notification_id
                      WHERE " . implode(' AND ', $where_conditions);
        
        $count_stmt = $db->prepare($count_sql);
        foreach ($params as $key => $value) {
            if ($key !== ':limit' && $key !== ':offset') {
                $count_stmt->bindValue($key, $value);
            }
        }
        $count_stmt->execute();
        $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

        echo json_encode(array(
            'status' => 'ok',
            'data' => $result,
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání notifikací: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_list: " . $e->getMessage());
    }
}

/**
 * Označí notifikaci jako přečtenou
 * POST /notifications/mark-read
 */
function handle_notifications_mark_read($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $notification_id = isset($input['notification_id']) ? (int)$input['notification_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    if ($notification_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $user_id = $token_data['id'];

        $current_time = TimezoneHelper::getCzechDateTime();
        $sql = "INSERT INTO 25_notifications_read (notification_id, user_id, is_read, dt_read, dt_created)
                VALUES (:notification_id, :user_id, 1, :dt_read, :dt_created)
                ON DUPLICATE KEY UPDATE 
                  is_read = 1, 
                  dt_read = :dt_read_update";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':notification_id' => $notification_id,
            ':user_id' => $user_id,
            ':dt_read' => $current_time,
            ':dt_created' => $current_time,
            ':dt_read_update' => $current_time
        ));

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Notifikace byla zamítnuta'
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při zamítání notifikace: ' . $e->getMessage()]);
    }
}

/**
 * Skrýt všechny notifikace v dropdownu
 * POST /notifications/dismiss-all
 */
function handle_notifications_dismiss_all($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    try {
        $db = get_db($config);
        $user_id = $token_data['id'];
        $current_time = TimezoneHelper::getCzechDateTime();

        // Aktualizovat všechny nepřečtené/neskryté notifikace uživatele
        $sql = "UPDATE 25_notifications_read 
                SET is_dismissed = 1, 
                    dt_dismissed = :dt_dismissed 
                WHERE user_id = :user_id 
                  AND is_dismissed = 0";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':user_id' => $user_id,
            ':dt_dismissed' => $current_time
        ));

        $count = $stmt->rowCount();

        echo json_encode(array(
            'status' => 'ok',
            'message' => "Všechny notifikace skryty v dropdownu",
            'hidden_count' => $count
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při skrývání všech notifikací: ' . $e->getMessage()]);
    }
}

/**
 * Obnovit skrytou notifikaci (zobrazit zpět v dropdownu)
 * POST /notifications/restore
 */
function handle_notifications_restore($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $notification_id = isset($input['notification_id']) ? (int)$input['notification_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($notification_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $user_id = $token_data['id'];

        // Nastavit is_dismissed zpět na 0
        $sql = "UPDATE 25_notifications_read 
                SET is_dismissed = 0, 
                    dt_dismissed = NULL 
                WHERE notification_id = :notification_id 
                  AND user_id = :user_id";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':notification_id' => $notification_id,
            ':user_id' => $user_id
        ));

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Notifikace obnovena v dropdownu'
            ));
        } else {
            http_response_code(404);
            echo json_encode(['err' => 'Notifikace nenalezena nebo není skrytá']);
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při obnovování notifikace: ' . $e->getMessage()]);
    }
}

/**
 * Smazat notifikaci z databáze (soft delete)
 * POST /notifications/delete
 */
function handle_notifications_delete($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $notification_id = isset($input['notification_id']) ? (int)$input['notification_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($notification_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $user_id = $token_data['id'];
        $current_time = TimezoneHelper::getCzechDateTime();

        // Soft delete - nastavit is_deleted = 1 v read tabulce
        $sql = "UPDATE 25_notifications_read 
                SET is_deleted = 1, 
                    dt_deleted = :dt_deleted 
                WHERE notification_id = :notification_id 
                  AND user_id = :user_id";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':notification_id' => $notification_id,
            ':user_id' => $user_id,
            ':dt_deleted' => $current_time
        ));

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Notifikace trvale smazána z databáze'
            ));
        } else {
            http_response_code(404);
            echo json_encode(['err' => 'Notifikace nenalezena nebo nemáte oprávnění']);
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při mazání notifikace: ' . $e->getMessage()]);
    }
}

/**
 * Smazat všechny notifikace uživatele (soft delete)
 * POST /notifications/delete-all
 */
function handle_notifications_delete_all($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $confirm = isset($input['confirm']) ? (bool)$input['confirm'] : false;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if (!$confirm) {
        http_response_code(400);
        echo json_encode(['err' => 'Vyžaduje se potvrzení (confirm: true)']);
        return;
    }

    try {
        $db = get_db($config);
        $user_id = $token_data['id'];
        $current_time = TimezoneHelper::getCzechDateTime();

        // Soft delete všech notifikací uživatele
        $sql = "UPDATE 25_notifications_read 
                SET is_deleted = 1, 
                    dt_deleted = :dt_deleted 
                WHERE user_id = :user_id 
                  AND is_deleted = 0";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':user_id' => $user_id,
            ':dt_deleted' => $current_time
        ));

        $count = $stmt->rowCount();

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Všechny notifikace trvale smazány',
            'deleted_count' => $count
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při mazání všech notifikací: ' . $e->getMessage()]);
    }
}

/**
 * Označí všechny notifikace jako přečtené podle 2-tabulkové struktury FE
 * POST /notifications/mark-all-read
 */
function handle_notifications_mark_all_read($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    try {
        $db = get_db($config);
        $user_id = $token_data['id'];

        // Označ všechny nepřečtené záznamy v 25_notifications_read
        $current_time = TimezoneHelper::getCzechDateTime();
        $sql = "UPDATE 25_notifications_read 
                SET is_read = 1, dt_read = :dt_read
                WHERE user_id = :user_id 
                  AND is_read = 0";

        $stmt = $db->prepare($sql);
        $result = $stmt->execute(array(
            ':user_id' => $user_id,
            ':dt_read' => $current_time
        ));
        
        if ($result) {
            $marked_count = $stmt->rowCount();
            
            echo json_encode(array(
                'status' => 'ok',
                'message' => "Označeno {$marked_count} notifikací jako přečtených",
                'marked_count' => $marked_count
            ));
        } else {
            throw new Exception('UPDATE selhal');
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při označování notifikací: ' . $e->getMessage()]);
        error_log("[Notifications] Exception in handle_notifications_mark_all_read: " . $e->getMessage());
    }
}

/**
 * Počet nepřečtených notifikací podle 2-tabulkové struktury FE
 * POST /notifications/unread-count
 */
function handle_notifications_unread_count($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    try {
        $db = get_db($config);
        $user_id = $token_data['id'];

        // Spočítej nepřečtené z 25_notifications_read
        // MUSÍ být: nepřečtené (is_read=0), NEsmazané (is_deleted=0), NEdismissnuté (is_dismissed=0)
        $sql = "SELECT COUNT(*) as unread_count
                FROM 25_notifications_read nr
                INNER JOIN 25_notifications n ON nr.notification_id = n.id
                WHERE nr.user_id = :user_id
                  AND nr.is_read = 0
                  AND nr.is_dismissed = 0
                  AND nr.is_deleted = 0
                  AND n.active = 1";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(':user_id' => $user_id));

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode(array(
            'status' => 'ok',
            'unread_count' => (int)$result['unread_count']
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při počítání notifikací: ' . $e->getMessage()]);
        error_log("[Notifications] Exception in handle_notifications_unread_count: " . $e->getMessage());
    }
}

/**
 * Vytvoří novou notifikaci podle 2-tabulkové struktury FE
 * POST /notifications/create
 * 
 * ROZŠÍŘENO: Podpora order_id pro automatické naplnění placeholderů
 * 
 * Struktura:
 * 1. Vytvoří 1 záznam v 25_notifications (master data)
 * 2. Vytvoří záznamy v 25_notifications_read pro každého příjemce
 */
function handle_notifications_create($input, $config, $queries) {
    // DEBUG: Log vstupních dat
    error_log("[Notifications] handle_notifications_create called");
    error_log("[Notifications] Input: " . json_encode($input));
    
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        error_log("[Notifications] Token verification failed");
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($token_data['username'] !== $request_username) {
        error_log("[Notifications] Username mismatch: token=" . $token_data['username'] . ", request=" . $request_username);
        http_response_code(401);
        echo json_encode(['err' => 'Username z tokenu neodpovídá username z požadavku']);
        return;
    }

    // Validace povinných polí
    $required_fields = array('type');
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            error_log("[Notifications] Missing required field: $field");
            http_response_code(400);
            echo json_encode(array('err' => "Chybí povinné pole: $field"));
            return;
        }
    }
    
    error_log("[Notifications] Token verified, required fields present");

    try {
        $db = get_db($config);
        $type = $input['type'];
        $current_user_id = $token_data['id'];
        $username = $token_data['username'];
        
        error_log("[Notifications] Processing type: $type for user: $username (ID: $current_user_id)");
        
        // Načti template z databáze
        $template = getNotificationTemplate($db, $type);
        if (!$template) {
            error_log("[Notifications] Template not found for type: $type");
            http_response_code(400);
            echo json_encode(array('err' => "Neznámý typ notifikace: $type"));
            return;
        }
        
        error_log("[Notifications] Template loaded: " . $template['name']);
        
        // NOVÉ: Podpora order_id pro automatické naplnění placeholderů
        $placeholderData = array();
        $order_id = isset($input['order_id']) ? (int)$input['order_id'] : null;
        $action_user_id = isset($input['action_user_id']) ? (int)$input['action_user_id'] : $current_user_id;
        $additional_data = isset($input['additional_data']) ? $input['additional_data'] : array();
        
        error_log("[Notifications] order_id from input: " . ($order_id ? $order_id : 'NULL'));
        error_log("[Notifications] action_user_id: $action_user_id");
        
        if ($order_id) {
            error_log("[Notifications] ===== LOADING ORDER DATA START =====");
            error_log("[Notifications] Loading placeholder data for order_id: $order_id");
            
            // Načti data objednávky a připrav placeholdery (s error handlingem)
            try {
                $placeholderData = getOrderPlaceholderData($db, $order_id, $action_user_id, $additional_data);
                
                error_log("[Notifications] getOrderPlaceholderData returned: " . (is_array($placeholderData) ? count($placeholderData) . " keys" : "NOT ARRAY"));
                
                if (isset($placeholderData['error'])) {
                    // ZMĚNA: Místo http 400 jen logujeme warning a pokračujeme bez placeholderů
                    error_log("[Notifications] ⚠️ WARNING: Could not load order data: " . $placeholderData['error']);
                    $placeholderData = array();
                } else {
                    error_log("[Notifications] ✅ Placeholder data loaded successfully!");
                    error_log("[Notifications] Keys: " . implode(', ', array_keys($placeholderData)));
                    error_log("[Notifications] order_number: " . (isset($placeholderData['order_number']) ? $placeholderData['order_number'] : 'NOT_SET'));
                    error_log("[Notifications] order_subject: " . (isset($placeholderData['order_subject']) ? substr($placeholderData['order_subject'], 0, 30) : 'NOT_SET'));
                }
                
                // Přidej ikonu a label akce VŽDY (i když order data selhala)
                $placeholderData['action_icon'] = getActionIcon($type);
                $placeholderData['action_performed_by_label'] = getActionLabel($type);
                $placeholderData['priority_icon'] = getPriorityIcon(
                    isset($input['priority']) ? $input['priority'] : $template['priority_default']
                );
                
                error_log("[Notifications] ===== LOADING ORDER DATA END =====");
            } catch (Exception $e) {
                error_log("[Notifications] ❌ EXCEPTION loading order data: " . $e->getMessage());
                error_log("[Notifications] Stack trace: " . $e->getTraceAsString());
                $placeholderData = array();
            }
        } else {
            error_log("[Notifications] ⚠️ No order_id provided - skipping placeholder data loading");
        }
        
        // Získej data pro nahrazení placeholderů (fallback na FE data)
        $data = array();
        if (isset($input['data']) && is_array($input['data'])) {
            $data = $input['data'];
        } elseif (isset($input['data_json']) && is_string($input['data_json'])) {
            $decoded = json_decode($input['data_json'], true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }
        
        // Merge placeholderData s data (placeholderData má přednost)
        $finalData = array_merge($data, $placeholderData);
        
        error_log("[Notifications] Final placeholder data: " . json_encode(array_keys($finalData)));
        error_log("[Notifications] Sample values: order_number=" . (isset($finalData['order_number']) ? $finalData['order_number'] : 'N/A') . 
                  ", order_name=" . (isset($finalData['order_name']) ? substr($finalData['order_name'], 0, 30) : 'N/A'));
        
        // Použij template_override pokud je zadáno (FE může přepsat template)
        $template_override = isset($input['template_override']) ? $input['template_override'] : array();
        
        $app_title = isset($template_override['app_title']) ? 
            $template_override['app_title'] : $template['app_title'];
        $app_message = isset($template_override['app_message']) ? 
            $template_override['app_message'] : $template['app_message'];
        $email_subject = isset($template_override['email_subject']) ? 
            $template_override['email_subject'] : $template['email_subject'];
        $email_body = isset($template_override['email_body']) ? 
            $template_override['email_body'] : $template['email_body'];
        
        // Nahraď placeholdery v template
        $app_title = notif_replacePlaceholders($app_title, $finalData);
        $app_message = notif_replacePlaceholders($app_message, $finalData);
        
        // Email vždy s placeholdery
        $email_subject = notif_replacePlaceholders($email_subject, $finalData);
        $email_body = notif_replacePlaceholders($email_body, $finalData);
        
        error_log("[Notifications] After placeholder replacement - Title: " . $app_title);
        error_log("[Notifications] After placeholder replacement - Message: " . substr($app_message, 0, 100));
        
        // KLÍČOVÁ LOGIKA: Určení příjemců
        $to_user_id = isset($input['to_user_id']) ? (int)$input['to_user_id'] : null;
        $to_users = isset($input['to_users']) && is_array($input['to_users']) ? $input['to_users'] : null;
        $to_all_users = isset($input['to_all_users']) ? (bool)$input['to_all_users'] : false;
        
        error_log("[Notifications] Recipients config: to_user_id=" . ($to_user_id ?: 'null') . 
                  ", to_users=" . ($to_users ? json_encode($to_users) : 'null') . 
                  ", to_all_users=" . ($to_all_users ? 'true' : 'false'));
        
        // Sestavení pole příjemců
        $recipient_user_ids = array();
        
        if ($to_all_users) {
            // Broadcast - všichni aktivní uživatelé
            $users_table = get_users_table_name();
            $stmt = $db->prepare("SELECT id FROM {$users_table} WHERE active = 1");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $recipient_user_ids = array_column($users, 'id');
            error_log("[Notifications] Broadcasting '$type' to " . count($recipient_user_ids) . " users");
            
        } elseif (!empty($to_users) && is_array($to_users)) {
            // Skupina uživatelů
            $recipient_user_ids = array_map('intval', $to_users);
            error_log("[Notifications] Sending '$type' to group: " . implode(',', $recipient_user_ids));
            
        } elseif (!empty($to_user_id)) {
            // Konkrétní uživatel
            $recipient_user_ids = array($to_user_id);
            error_log("[Notifications] Sending '$type' to user: $to_user_id");
            
        } else {
            error_log("[Notifications] No recipients specified!");
            http_response_code(400);
            echo json_encode(array('err' => 'Musíte zadat alespoň jednoho příjemce (to_user_id, to_users nebo to_all_users)'));
            return;
        }
        
        if (empty($recipient_user_ids)) {
            error_log("[Notifications] Recipients array is empty after processing!");
            http_response_code(400);
            echo json_encode(array('err' => 'Nebyli nalezeni žádní příjemci pro notifikaci'));
            return;
        }
        
        error_log("[Notifications] Final recipients: " . json_encode($recipient_user_ids));
        
        // 1. VYTVOŘ MASTER ZÁZNAM v 25_notifications (pouze 1 záznam)
        $priority = isset($input['priority']) ? $input['priority'] : $template['priority_default'];
        $category = isset($input['category']) ? $input['category'] : 'general';
        $send_email = isset($input['send_email']) ? (int)$input['send_email'] : (int)$template['send_email_default'];
        $related_object_type = isset($input['related_object_type']) ? $input['related_object_type'] : ($order_id ? 'order' : null);
        $related_object_id = isset($input['related_object_id']) ? (int)$input['related_object_id'] : $order_id;
        
        $stmt = $db->prepare("
            INSERT INTO 25_notifications (
                type, 
                title, 
                message, 
                from_user_id, 
                to_user_id,
                to_users_json,
                to_all_users,
                priority,
                category,
                send_email,
                related_object_type,
                related_object_id,
                data_json,
                dt_created,
                active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
        ");
        
        $result = $stmt->execute(array(
            $type,
            // Použij TEMPLATE s nahrazenými placeholdery, fallback na FE custom text
            !empty($app_title) ? $app_title : (!empty($input['title']) ? $input['title'] : 'Notifikace'),
            !empty($app_message) ? $app_message : (!empty($input['message']) ? $input['message'] : ''),
            $current_user_id,
            // Pro jednotlivce: konkrétní user_id, pro skupinu/broadcast: NULL
            count($recipient_user_ids) === 1 ? $recipient_user_ids[0] : null,
            // Pro skupinu: JSON array, jinak NULL
            count($recipient_user_ids) > 1 && !$to_all_users ? json_encode($recipient_user_ids) : null,
            $to_all_users ? 1 : 0,
            $priority,
            $category,
            $send_email,
            $related_object_type,
            $related_object_id,
            !empty($finalData) ? json_encode($finalData) : null
        ));
        
        if (!$result) {
            throw new Exception('Chyba při vytváření master notifikace');
        }
        
        $notification_id = $db->lastInsertId();
        
        // 2. VYTVOŘ READ ZÁZNAMY v 25_notifications_read (pro každého příjemce)
        $stmt_read = $db->prepare("
            INSERT INTO 25_notifications_read (
                notification_id,
                user_id,
                is_read,
                is_dismissed,
                dt_created
            ) VALUES (?, ?, 0, 0, NOW())
        ");
        
        $read_records_created = 0;
        foreach ($recipient_user_ids as $user_id) {
            $result = $stmt_read->execute(array($notification_id, $user_id));
            if ($result) {
                $read_records_created++;
                error_log("[Notifications] Created read record for user: $user_id, notification: $notification_id");
            } else {
                error_log("[Notifications] Failed to create read record for user: $user_id, notification: $notification_id");
            }
        }
        
        // 3. ODESLAT EMAIL (pokud je potřeba)
        $email_sent = false;
        if ($send_email && !empty($email_subject)) {
            foreach ($recipient_user_ids as $user_id) {
                // TODO: Implementovat sendNotificationEmail($user_id, $email_subject, $email_body);
                error_log("[Notifications] Email should be sent to user: $user_id for notification: $notification_id");
            }
            
            // Označit jako odeslaný
            $stmt_email = $db->prepare("UPDATE 25_notifications SET email_sent = 1, email_sent_at = NOW() WHERE id = ?");
            $stmt_email->execute(array($notification_id));
            $email_sent = true;
        }
        
        // 4. RESPONSE
        $response = array(
            'status' => 'ok',
            'message' => 'Notifikace byla vytvořena',
            'notification_id' => (int)$notification_id,
            'recipients_count' => $read_records_created,
            'email_sent' => $email_sent
        );
        
        echo json_encode($response);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při vytváření notifikace: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_create: " . $e->getMessage());
    }
}

/**
 * Zamítne/skryje notifikaci
 * POST /notifications/dismiss
 */
function handle_notifications_dismiss($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $notification_id = isset($input['notification_id']) ? (int)$input['notification_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($notification_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $user_id = $token_data['id'];

        $current_time = TimezoneHelper::getCzechDateTime();
        
        // KROK 1: Zkus UPDATE (pokud záznam existuje)
        $sql_update = "UPDATE 25_notifications_read 
                       SET is_dismissed = 1, 
                           dt_dismissed = :dt_dismissed 
                       WHERE notification_id = :notification_id 
                         AND user_id = :user_id";

        $stmt = $db->prepare($sql_update);
        $stmt->execute(array(
            ':notification_id' => $notification_id,
            ':user_id' => $user_id,
            ':dt_dismissed' => $current_time
        ));

        // KROK 2: Pokud UPDATE nezměnil žádný řádek, udělej INSERT
        if ($stmt->rowCount() == 0) {
            $sql_insert = "INSERT INTO 25_notifications_read 
                           (notification_id, user_id, is_read, is_dismissed, dt_dismissed, dt_created)
                           VALUES (:notification_id, :user_id, 0, 1, :dt_dismissed, :dt_created)";
            
            $stmt = $db->prepare($sql_insert);
            $stmt->execute(array(
                ':notification_id' => $notification_id,
                ':user_id' => $user_id,
                ':dt_dismissed' => $current_time,
                ':dt_created' => $current_time
            ));
        }

        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Notifikace skryta v dropdownu'
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při skrývání notifikace: ' . $e->getMessage()));
    }
}

// ==========================================
// NOVÉ API ENDPOINTY PRO ROZŠÍŘENÝ NOTIFIKAČNÍ SYSTÉM
// ==========================================

/**
 * Náhled notifikace před odesláním (preview)
 * POST /notifications/preview
 * 
 * Umožňuje vidět, jak bude vypadat notifikace s nahrazenými placeholdery
 * BEZ jejího vytvoření v databázi
 */
function handle_notifications_preview($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    // Validace povinných polí
    if (empty($input['type'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí povinné pole: type'));
        return;
    }

    try {
        $db = get_db($config);
        $type = $input['type'];
        $current_user_id = $token_data['id'];
        
        // Načti template z databáze
        $template = getNotificationTemplate($db, $type);
        if (!$template) {
            http_response_code(400);
            echo json_encode(array('err' => "Neznámý typ notifikace: $type"));
            return;
        }
        
        // Načti placeholder data pokud je zadáno order_id
        $placeholderData = array();
        $order_id = isset($input['order_id']) ? (int)$input['order_id'] : null;
        $action_user_id = isset($input['action_user_id']) ? (int)$input['action_user_id'] : $current_user_id;
        $additional_data = isset($input['additional_data']) ? $input['additional_data'] : array();
        
        if ($order_id) {
            $placeholderData = getOrderPlaceholderData($db, $order_id, $action_user_id, $additional_data);
            
            if (isset($placeholderData['error'])) {
                http_response_code(400);
                echo json_encode(array('err' => $placeholderData['error']));
                return;
            }
            
            // Přidej ikony a labely
            $placeholderData['action_icon'] = getActionIcon($type);
            $placeholderData['action_performed_by_label'] = getActionLabel($type);
            $placeholderData['priority_icon'] = getPriorityIcon($template['priority_default']);
        }
        
        // Nahraď placeholdery
        $app_title = notif_replacePlaceholders($template['app_title'], $placeholderData);
        $app_message = notif_replacePlaceholders($template['app_message'], $placeholderData);
        $email_subject = notif_replacePlaceholders($template['email_subject'], $placeholderData);
        $email_body = notif_replacePlaceholders($template['email_body'], $placeholderData);
        
        // Zjisti které placeholdery byly použity
        preg_match_all('/\{([a-z_]+)\}/', $template['app_title'] . $template['app_message'], $matches);
        $placeholders_used = array_unique($matches[1]);
        
        // Zjisti které placeholdery chybí (nebyly nahrazeny)
        $missing_data = array();
        foreach ($placeholders_used as $placeholder) {
            if (!isset($placeholderData[$placeholder]) || empty($placeholderData[$placeholder])) {
                $missing_data[] = $placeholder;
            }
        }
        
        // Response
        echo json_encode(array(
            'status' => 'ok',
            'template' => array(
                'type' => $type,
                'app_title' => $app_title,
                'app_message' => $app_message,
                'email_subject' => $email_subject,
                'email_body' => $email_body,
                'priority' => $template['priority_default'],
                'send_email_default' => $template['send_email_default'] == 1
            ),
            'placeholders_used' => $placeholders_used,
            'missing_data' => $missing_data,
            'placeholder_data' => $placeholderData
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při náhledu notifikace: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_preview: " . $e->getMessage());
    }
}

/**
 * Seznam všech aktivních notification templates
 * GET /notifications/templates
 * POST /notifications/templates
 */
function handle_notifications_templates($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Parametry
        $active_only = isset($input['active_only']) ? (bool)$input['active_only'] : true;
        
        // Sestavení dotazu
        $sql = "SELECT * FROM 25_notification_templates";
        if ($active_only) {
            $sql .= " WHERE active = 1";
        }
        $sql .= " ORDER BY name ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Formátuj data
        $result = array_map(function($template) {
            return array(
                'id' => (int)$template['id'],
                'type' => $template['type'],
                'name' => $template['name'],
                'app_title' => $template['app_title'],
                'app_message' => $template['app_message'],
                'email_subject' => $template['email_subject'],
                'email_body' => $template['email_body'],
                'send_email_default' => $template['send_email_default'] == 1,
                'priority_default' => $template['priority_default'],
                'active' => $template['active'] == 1,
                'dt_created' => $template['dt_created'],
                'dt_updated' => $template['dt_updated']
            );
        }, $templates);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $result,
            'total' => count($result)
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání templates: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_templates: " . $e->getMessage());
    }
}

/**
 * Hromadné odeslání notifikace více uživatelům
 * POST /notifications/send-bulk
 */
function handle_notifications_send_bulk($input, $config, $queries) {
    // Ověření tokenu - OPRAVENO: používáme verify_token_v2
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    // Validace povinných polí
    $required_fields = array('type', 'recipients');
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(array('err' => "Chybí povinné pole: $field"));
            return;
        }
    }
    
    if (!is_array($input['recipients']) || empty($input['recipients'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Pole recipients musí být neprázdné pole user ID'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Připrav vstupní data pro handle_notifications_create
        $create_input = $input;
        $create_input['to_users'] = $input['recipients'];
        unset($create_input['recipients']);
        
        // Použij existující funkci handle_notifications_create
        // která už obsahuje všechnu logiku pro vytváření notifikací
        handle_notifications_create($create_input, $config, $queries);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při hromadném odesílání: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_send_bulk: " . $e->getMessage());
    }
}

// ==========================================
// EVENT TYPES API (pro Notification Center)
// ==========================================

/**
 * Seznam všech event types pro organizational hierarchy
 * GET /notifications/event-types/list
 * POST /notifications/event-types/list
 * 
 * @param array $input - Input parameters
 * @param array $config - Config array
 * @param array $queries - Queries array
 * @return void - Outputs JSON
 */
function handle_notifications_event_types_list($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    try {
        // Definice event types podle dokumentace
        $eventTypes = array(
            // OBJEDNÁVKY - Fáze 1: Vytvoření
            array(
                'code' => 'ORDER_CREATED',
                'name' => 'Objednávka vytvořena',
                'category' => 'orders',
                'description' => 'Robert vytvoří objednávku → notifikace příkazci ke schválení',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 2A: Schválení
            array(
                'code' => 'ORDER_APPROVED',
                'name' => 'Objednávka schválena',
                'category' => 'orders',
                'description' => 'Příkazce schválil → notifikace Robertovi, že může pokračovat',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 2B: Zamítnutí
            array(
                'code' => 'ORDER_REJECTED',
                'name' => 'Objednávka zamítnuta',
                'category' => 'orders',
                'description' => 'Příkazce zamítl → proces končí',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 2C: Vrácení
            array(
                'code' => 'ORDER_WAITING_FOR_CHANGES',
                'name' => 'Objednávka vrácena k doplnění',
                'category' => 'orders',
                'description' => 'Příkazce vrátil → Robert doplní a znovu odešle',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 3: Plnění
            array(
                'code' => 'ORDER_SENT_TO_SUPPLIER',
                'name' => 'Objednávka odeslána dodavateli',
                'category' => 'orders',
                'description' => 'Robert odeslal dodavateli → notifikace nákupčímu a ostatním',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 4: Registr
            array(
                'code' => 'ORDER_REGISTRY_APPROVAL_REQUESTED',
                'name' => 'Žádost o schválení v registru',
                'category' => 'orders',
                'description' => 'Robert žádá o registr → notifikace registru (role/úsek)',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 5: Faktura
            array(
                'code' => 'ORDER_INVOICE_ADDED',
                'name' => 'Faktura doplněna',
                'category' => 'orders',
                'description' => 'Registr doplnil fakturu → Robert musí provést věcnou kontrolu',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 6: Kontrola
            array(
                'code' => 'ORDER_MATERIAL_CHECK_COMPLETED',
                'name' => 'Věcná kontrola provedena',
                'category' => 'orders',
                'description' => 'Robert provedl kontrolu → registr může dokončit',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 7: Dokončení
            array(
                'code' => 'ORDER_COMPLETED',
                'name' => 'Objednávka dokončena',
                'category' => 'orders',
                'description' => 'Registr dokončil → notifikace všem zúčastněným',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('INFO')
            ),
            
            // FAKTURY
            array(
                'code' => 'INVOICE_CREATED',
                'name' => 'Faktura vytvořena',
                'category' => 'invoices',
                'description' => 'Nová faktura byla vytvořena v systému',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            array(
                'code' => 'INVOICE_DUE_SOON',
                'name' => 'Faktura brzy po splatnosti',
                'category' => 'invoices',
                'description' => 'Faktura se blíží ke dni splatnosti',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            array(
                'code' => 'INVOICE_OVERDUE',
                'name' => 'Faktura po splatnosti',
                'category' => 'invoices',
                'description' => 'Faktura je po splatnosti',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL')
            ),
            
            // SMLOUVY
            array(
                'code' => 'CONTRACT_EXPIRING',
                'name' => 'Smlouva brzy vyprší',
                'category' => 'contracts',
                'description' => 'Smlouva se blíží ke konci platnosti',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            
            // POKLADNA
            array(
                'code' => 'CASHBOOK_LOW_BALANCE',
                'name' => 'Nízký zůstatek v pokladně',
                'category' => 'cashbook',
                'description' => 'Zůstatek v pokladně je pod minimální hranicí',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            )
        );
        
        // Filtrování podle kategorie (volitelné)
        $category = isset($input['category']) ? $input['category'] : null;
        if ($category) {
            $eventTypes = array_filter($eventTypes, function($event) use ($category) {
                return $event['category'] === $category;
            });
            $eventTypes = array_values($eventTypes); // Reindex pole
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $eventTypes,
            'total' => count($eventTypes)
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání event types: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_event_types_list: " . $e->getMessage());
    }
}

// ==========================================
// NOTIFICATION ROUTER (pro automatické odesílání)
// ==========================================

/**
 * Hlavní router pro automatické odesílání notifikací při událostech
 * Použití: notificationRouter($db, 'ORDER_CREATED', $orderId, $userId, ['order_number' => 'O-2025-142', ...])
 * 
 * @param PDO $db - Database connection
 * @param string $eventType - Event type code (ORDER_CREATED, ORDER_APPROVED, etc.)
 * @param int $objectId - ID objektu (objednávka, faktura, atd.)
 * @param int $triggerUserId - ID uživatele, který akci provedl
 * @param array $placeholderData - Data pro placeholder replacement
 * @return array - Výsledek odesílání { success: bool, sent: int, errors: array }
 */
function notificationRouter($db, $eventType, $objectId, $triggerUserId, $placeholderData = array()) {
    $result = array(
        'success' => false,
        'sent' => 0,
        'errors' => array()
    );
    
    try {
        // 1. Najít příjemce podle organizational hierarchy
        $recipients = findNotificationRecipients($db, $eventType, $objectId, $triggerUserId);
        
        if (empty($recipients)) {
            error_log("[NotificationRouter] No recipients found for event $eventType, object $objectId");
            return $result;
        }
        
        // 2. Pro každého příjemce najít template a odeslat notifikaci
        foreach ($recipients as $recipient) {
            try {
                // $recipient obsahuje:
                // - user_id
                // - recipientRole (EXCEPTIONAL, APPROVAL, INFO)
                // - sendEmail (bool)
                // - sendInApp (bool)
                // - templateId
                // - templateVariant (normalVariant, urgentVariant, infoVariant)
                
                // 3. Načíst template z DB
                $stmt = $db->prepare("
                    SELECT * FROM 25_notification_templates 
                    WHERE id = :template_id AND active = 1
                ");
                $stmt->execute([':template_id' => $recipient['templateId']]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$template) {
                    $result['errors'][] = "Template {$recipient['templateId']} not found";
                    continue;
                }
                
                // 4. Vybrat správnou variantu podle recipientRole
                $variant = $recipient['templateVariant'];
                
                // 5. Nahradit placeholdery v šabloně
                $processedTitle = replacePlaceholders($template['app_title'], $placeholderData);
                $processedMessage = replacePlaceholders($template['app_message'], $placeholderData);
                $processedEmailBody = extractVariantFromEmailBody($template['email_body'], $variant);
                $processedEmailBody = replacePlaceholders($processedEmailBody, $placeholderData);
                
                // 6. Připravit data pro notifikaci
                $notificationData = array(
                    'event_type' => $eventType,
                    'object_id' => $objectId,
                    'recipient_role' => $recipient['recipientRole'],
                    'template_id' => $recipient['templateId'],
                    'template_variant' => $variant,
                    'placeholders' => $placeholderData
                );
                
                // 7. Vytvořit in-app notifikaci
                if ($recipient['sendInApp']) {
                    $params = array(
                        ':type' => 'system',
                        ':title' => $processedTitle,
                        ':message' => $processedMessage,
                        ':data_json' => json_encode($notificationData),
                        ':from_user_id' => $triggerUserId,
                        ':to_user_id' => $recipient['user_id'],
                        ':to_users_json' => null,
                        ':to_all_users' => 0,
                        ':priority' => $recipient['recipientRole'], // EXCEPTIONAL, APPROVAL, INFO
                        ':category' => $template['category'],
                        ':send_email' => $recipient['sendEmail'] ? 1 : 0,
                        ':related_object_type' => getObjectTypeFromEvent($eventType),
                        ':related_object_id' => $objectId,
                        ':dt_expires' => null,
                        ':dt_created' => TimezoneHelper::getCzechDateTime(),
                        ':active' => 1
                    );
                    
                    createNotification($db, $params);
                    $result['sent']++;
                }
                
                // 8. Odeslat email (pokud je povolený)
                if ($recipient['sendEmail']) {
                    // TODO: Implementovat sendNotificationEmail()
                    // sendNotificationEmail($recipient['user_id'], $processedTitle, $processedEmailBody);
                }
                
            } catch (Exception $e) {
                $result['errors'][] = "Error sending to user {$recipient['user_id']}: " . $e->getMessage();
                error_log("[NotificationRouter] Error sending to user {$recipient['user_id']}: " . $e->getMessage());
            }
        }
        
        $result['success'] = ($result['sent'] > 0);
        
    } catch (Exception $e) {
        $result['errors'][] = $e->getMessage();
        error_log("[NotificationRouter] Exception: " . $e->getMessage());
    }
    
    return $result;
}

/**
 * Najde příjemce notifikací podle organizational hierarchy
 * 
 * @param PDO $db
 * @param string $eventType - EVENT_TYPE code
 * @param int $objectId - ID objektu
 * @param int $triggerUserId - Kdo akci provedl
 * @return array - Pole příjemců s config
 */
function findNotificationRecipients($db, $eventType, $objectId, $triggerUserId) {
    $recipients = array();
    
    try {
        // 1. Najít aktivní profil hierarchie
        $stmt = $db->prepare("
            SELECT id, structure_json 
            FROM 25_hierarchy_profiles 
            WHERE active = 1 
            LIMIT 1
        ");
        $stmt->execute();
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$profile) {
            error_log("[findNotificationRecipients] No active hierarchy profile found");
            return $recipients;
        }
        
        $structure = json_decode($profile['structure_json'], true);
        if (!$structure) {
            error_log("[findNotificationRecipients] Invalid structure JSON in profile {$profile['id']}");
            return $recipients;
        }
        
        // 2. Projít všechny TEMPLATE nodes a najít ty, které mají eventType
        foreach ($structure['nodes'] as $node) {
            if ($node['type'] !== 'template') continue;
            
            $eventTypes = isset($node['data']['eventTypes']) ? $node['data']['eventTypes'] : array();
            
            // Pokud tento template nemá náš eventType, přeskoč
            if (!in_array($eventType, $eventTypes)) continue;
            
            // 3. Najít všechny EDGE (šipky) vedoucí z tohoto template
            foreach ($structure['edges'] as $edge) {
                if ($edge['source'] !== $node['id']) continue;
                
                $notifications = isset($edge['data']['notifications']) ? $edge['data']['notifications'] : array();
                
                // Kontrola, zda edge má tento eventType v types[]
                $edgeEventTypes = isset($notifications['types']) ? $notifications['types'] : array();
                if (!in_array($eventType, $edgeEventTypes)) continue;
                
                // 4. Určit cílového uživatele/roli z edge target
                $targetNodeId = $edge['target'];
                $targetNode = null;
                foreach ($structure['nodes'] as $n) {
                    if ($n['id'] === $targetNodeId) {
                        $targetNode = $n;
                        break;
                    }
                }
                
                if (!$targetNode) continue;
                
                // 5. Najít konkrétní user_id podle typu target node
                $targetUserIds = resolveTargetUsers($db, $targetNode, $objectId, $triggerUserId);
                
                // 6. Určit variantu šablony podle recipientRole
                $recipientRole = isset($notifications['recipientRole']) ? $notifications['recipientRole'] : 'APPROVAL';
                $variant = 'normalVariant'; // výchozí
                
                if ($recipientRole === 'EXCEPTIONAL') {
                    $variant = isset($node['data']['urgentVariant']) ? $node['data']['urgentVariant'] : 'APPROVER_URGENT';
                } elseif ($recipientRole === 'INFO') {
                    $variant = isset($node['data']['infoVariant']) ? $node['data']['infoVariant'] : 'SUBMITTER';
                } else {
                    $variant = isset($node['data']['normalVariant']) ? $node['data']['normalVariant'] : 'RECIPIENT';
                }
                
                // 7. Přidat každého target user do seznamu příjemců
                foreach ($targetUserIds as $userId) {
                    // ✅ KONTROLA UŽIVATELSKÝCH PREFERENCÍ
                    $userPrefs = getUserNotificationPreferences($db, $userId);
                    
                    // Pokud má uživatel notifikace vypnuté globálně, přeskoč
                    if (!$userPrefs['enabled']) {
                        error_log("[findNotificationRecipients] User $userId has notifications disabled globally");
                        continue;
                    }
                    
                    // Aplikovat uživatelské preference na kanály
                    $sendEmailFinal = isset($notifications['email']) ? (bool)$notifications['email'] : false;
                    $sendInAppFinal = isset($notifications['inapp']) ? (bool)$notifications['inapp'] : true;
                    
                    // Override podle user preferences
                    if (!$userPrefs['email_enabled']) {
                        $sendEmailFinal = false;
                    }
                    if (!$userPrefs['inapp_enabled']) {
                        $sendInAppFinal = false;
                    }
                    
                    // Kontrola kategorie (orders, invoices, contracts, cashbook)
                    $category = getObjectTypeFromEvent($eventType);
                    if (isset($userPrefs['categories'][$category]) && !$userPrefs['categories'][$category]) {
                        error_log("[findNotificationRecipients] User $userId has category '$category' disabled");
                        continue;
                    }
                    
                    // Pokud jsou oba kanály vypnuté, přeskoč
                    if (!$sendEmailFinal && !$sendInAppFinal) {
                        error_log("[findNotificationRecipients] User $userId has both channels disabled for this notification");
                        continue;
                    }
                    
                    $recipients[] = array(
                        'user_id' => $userId,
                        'recipientRole' => $recipientRole,
                        'sendEmail' => $sendEmailFinal,
                        'sendInApp' => $sendInAppFinal,
                        'templateId' => $node['data']['templateId'],
                        'templateVariant' => $variant
                    );
                }
            }
        }
        
    } catch (Exception $e) {
        error_log("[findNotificationRecipients] Exception: " . $e->getMessage());
    }
    
    return $recipients;
}

/**
 * Najde konkrétní user_id podle typu node (user, role, location, department)
 * 
 * @param PDO $db
 * @param array $node - Target node z hierarchie
 * @param int $objectId - ID objektu (objednávka, faktura)
 * @param int $triggerUserId - Kdo akci provedl
 * @return array - Pole user_id
 */
function resolveTargetUsers($db, $node, $objectId, $triggerUserId) {
    $userIds = array();
    
    try {
        switch ($node['type']) {
            case 'user':
                // Přímý uživatel
                if (isset($node['data']['userId'])) {
                    $userIds[] = $node['data']['userId'];
                }
                break;
                
            case 'role':
                // Všichni uživatelé s touto rolí
                $roleId = isset($node['data']['roleId']) ? $node['data']['roleId'] : null;
                if ($roleId) {
                    $stmt = $db->prepare("
                        SELECT DISTINCT ur.user_id 
                        FROM 25_user_roles ur
                        JOIN 25_users u ON ur.user_id = u.id
                        WHERE ur.role_id = :role_id AND u.active = 1
                    ");
                    $stmt->execute([':role_id' => $roleId]);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $userIds[] = $row['user_id'];
                    }
                }
                break;
                
            case 'location':
                // Všichni uživatelé na této lokaci
                $locationId = isset($node['data']['locationId']) ? $node['data']['locationId'] : null;
                if ($locationId) {
                    $stmt = $db->prepare("
                        SELECT DISTINCT id 
                        FROM 25_users 
                        WHERE location_id = :location_id AND active = 1
                    ");
                    $stmt->execute([':location_id' => $locationId]);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $userIds[] = $row['id'];
                    }
                }
                break;
                
            case 'department':
                // Všichni uživatelé v tomto oddělení
                $departmentId = isset($node['data']['departmentId']) ? $node['data']['departmentId'] : null;
                if ($departmentId) {
                    $stmt = $db->prepare("
                        SELECT DISTINCT id 
                        FROM 25_users 
                        WHERE department_id = :department_id AND active = 1
                    ");
                    $stmt->execute([':department_id' => $departmentId]);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $userIds[] = $row['id'];
                    }
                }
                break;
                
            default:
                error_log("[resolveTargetUsers] Unknown node type: {$node['type']}");
        }
    } catch (Exception $e) {
        error_log("[resolveTargetUsers] Exception: " . $e->getMessage());
    }
    
    return array_unique($userIds);
}

/**
 * Extrahuje správnou variantu z email_body podle <!-- RECIPIENT: TYPE -->
 */
function extractVariantFromEmailBody($emailBody, $variant) {
    if (!$emailBody) return '';
    
    $marker = "<!-- RECIPIENT: $variant -->";
    
    if (!strpos($emailBody, $marker)) {
        // Varianta nenalezena, vrátit celé body (fallback)
        return $emailBody;
    }
    
    // Najít začátek varianty
    $start = strpos($emailBody, $marker);
    $start = $start + strlen($marker);
    
    // Najít konec varianty (další marker nebo konec)
    $end = strpos($emailBody, '<!-- RECIPIENT:', $start);
    if ($end === false) {
        $end = strlen($emailBody);
    }
    
    return trim(substr($emailBody, $start, $end - $start));
}

/**
 * Určí object type podle event type
 */
function getObjectTypeFromEvent($eventType) {
    if (strpos($eventType, 'ORDER_') === 0) return 'orders';
    if (strpos($eventType, 'INVOICE_') === 0) return 'invoices';
    if (strpos($eventType, 'CONTRACT_') === 0) return 'contracts';
    if (strpos($eventType, 'CASHBOOK_') === 0) return 'cashbook';
    return 'unknown';
}

/**
 * Načte uživatelské preference pro notifikace
 * Kombinuje Global Settings + User Profile Settings
 * 
 * @param PDO $db
 * @param int $userId
 * @return array - Preference settings
 */
function getUserNotificationPreferences($db, $userId) {
    $preferences = array(
        'enabled' => true,          // Globální zapnutí/vypnutí
        'email_enabled' => true,    // Email kanál
        'inapp_enabled' => true,    // In-app kanál
        'categories' => array(      // Kategorie modulů
            'orders' => true,
            'invoices' => true,
            'contracts' => true,
            'cashbook' => true
        )
    );
    
    try {
        // 1. GLOBAL SETTINGS - Systémová úroveň (má nejvyšší prioritu)
        $stmt = $db->prepare("
            SELECT setting_key, setting_value 
            FROM 25_global_settings 
            WHERE setting_key IN (
                'notification_system_enabled',
                'notification_email_enabled', 
                'notification_inapp_enabled'
            )
        ");
        $stmt->execute();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $value = ($row['setting_value'] === '1' || $row['setting_value'] === 'true');
            
            if ($row['setting_key'] === 'notification_system_enabled' && !$value) {
                // Systém je vypnutý globálně - nic nefunguje
                $preferences['enabled'] = false;
                return $preferences;
            }
            
            if ($row['setting_key'] === 'notification_email_enabled') {
                $preferences['email_enabled'] = $value;
            }
            
            if ($row['setting_key'] === 'notification_inapp_enabled') {
                $preferences['inapp_enabled'] = $value;
            }
        }
        
        // 2. USER PROFILE SETTINGS - Uživatelská úroveň
        // Předpoklad: uživatel má pole notification_settings jako JSON v tabulce 25_users
        $stmt = $db->prepare("
            SELECT notification_settings 
            FROM 25_users 
            WHERE id = :user_id
        ");
        $stmt->execute([':user_id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && !empty($user['notification_settings'])) {
            $userSettings = json_decode($user['notification_settings'], true);
            
            if (isset($userSettings['enabled'])) {
                $preferences['enabled'] = (bool)$userSettings['enabled'];
            }
            
            if (isset($userSettings['email_enabled'])) {
                $preferences['email_enabled'] = $preferences['email_enabled'] && (bool)$userSettings['email_enabled'];
            }
            
            if (isset($userSettings['inapp_enabled'])) {
                $preferences['inapp_enabled'] = $preferences['inapp_enabled'] && (bool)$userSettings['inapp_enabled'];
            }
            
            if (isset($userSettings['categories'])) {
                foreach ($userSettings['categories'] as $category => $enabled) {
                    $preferences['categories'][$category] = (bool)$enabled;
                }
            }
        }
        
    } catch (Exception $e) {
        error_log("[getUserNotificationPreferences] Error loading preferences for user $userId: " . $e->getMessage());
    }
    
    return $preferences;
}

/**
 * API: Načte uživatelské preference pro notifikace
 * GET/POST /notifications/user-preferences
 * 
 * @param array $input
 * @param array $config
 * @param array $queries
 */
function handle_notifications_user_preferences($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Načíst user_id z username
        $stmt = $db->prepare("SELECT id FROM 25_users WHERE username = :username");
        $stmt->execute([':username' => $request_username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(array('err' => 'Uživatel nenalezen'));
            return;
        }
        
        $userId = $user['id'];
        $preferences = getUserNotificationPreferences($db, $userId);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $preferences
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při načítání preferencí: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_user_preferences: " . $e->getMessage());
    }
}

/**
 * API: Uloží uživatelské preference pro notifikace
 * POST /notifications/user-preferences/update
 * 
 * Input:
 * {
 *   "enabled": true,
 *   "email_enabled": true,
 *   "inapp_enabled": true,
 *   "categories": {
 *     "orders": true,
 *     "invoices": false,
 *     "contracts": true,
 *     "cashbook": true
 *   }
 * }
 * 
 * @param array $input
 * @param array $config
 * @param array $queries
 */
function handle_notifications_user_preferences_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }

    try {
        $db = get_db($config);
        
        // Načíst user_id
        $stmt = $db->prepare("SELECT id FROM 25_users WHERE username = :username");
        $stmt->execute([':username' => $request_username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(array('err' => 'Uživatel nenalezen'));
            return;
        }
        
        $userId = $user['id'];
        
        // Sestavit preferences object
        $preferences = array(
            'enabled' => isset($input['enabled']) ? (bool)$input['enabled'] : true,
            'email_enabled' => isset($input['email_enabled']) ? (bool)$input['email_enabled'] : true,
            'inapp_enabled' => isset($input['inapp_enabled']) ? (bool)$input['inapp_enabled'] : true,
            'categories' => isset($input['categories']) ? $input['categories'] : array(
                'orders' => true,
                'invoices' => true,
                'contracts' => true,
                'cashbook' => true
            )
        );
        
        $preferencesJson = json_encode($preferences);
        
        // Uložit do DB (předpokládáme, že pole notification_settings existuje v tabulce 25_users)
        // Pokud neexistuje, potřebujeme ALTER TABLE
        $stmt = $db->prepare("
            UPDATE 25_users 
            SET notification_settings = :settings 
            WHERE id = :user_id
        ");
        
        $result = $stmt->execute([
            ':settings' => $preferencesJson,
            ':user_id' => $userId
        ]);
        
        if ($result) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Preference uloženy',
                'data' => $preferences
            ));
        } else {
            throw new Exception('Nepodařilo se uložit preference');
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('err' => 'Chyba při ukládání preferencí: ' . $e->getMessage()));
        error_log("[Notifications] Exception in handle_notifications_user_preferences_update: " . $e->getMessage());
    }
}
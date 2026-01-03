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

// Include queries.php for table constants (TBL_UZIVATELE, TBL_OBJEDNAVKY, etc.)
require_once __DIR__ . '/queries.php';

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
    
    // Přidáme aktivni flag pokud není nastaven
    if (!isset($params[':aktivni'])) {
        $params[':aktivni'] = 1;
    }
    
    $sql = "INSERT INTO " . TBL_NOTIFIKACE . " 
            (typ, nadpis, zprava, data_json, od_uzivatele_id, pro_uzivatele_id, prijemci_json, pro_vsechny, 
             priorita, kategorie, odeslat_email, objekt_typ, objekt_id, dt_expires, dt_created, aktivni) 
            VALUES 
            (:typ, :nadpis, :zprava, :data_json, :od_uzivatele_id, :pro_uzivatele_id, :prijemci_json, :pro_vsechny,
             :priorita, :kategorie, :odeslat_email, :objekt_typ, :objekt_id, :dt_expires, :dt_created, :aktivni)";
    
    try {
        $stmt = $db->prepare($sql);
        $result = $stmt->execute($params);
        
        if (!$result) {
            error_log("[Notifications] SQL Error: " . json_encode($stmt->errorInfo()));
            error_log("[Notifications] SQL Params: " . json_encode($params));
            return false;
        }
        
        // Získat ID vytvořené notifikace
        $notifikace_id = $db->lastInsertId();
        
        // Vytvořit záznam v read tabulce pro příjemce
        if ($notifikace_id && isset($params[':pro_uzivatele_id']) && $params[':pro_uzivatele_id']) {
            $read_sql = "INSERT INTO " . TBL_NOTIFIKACE_PRECTENI . " 
                        (notifikace_id, uzivatel_id, precteno, dt_precteno, skryto, dt_skryto, dt_created, smazano, dt_smazano)
                        VALUES (:notifikace_id, :uzivatel_id, 0, NULL, 0, NULL, :dt_created, 0, NULL)";
            
            $read_stmt = $db->prepare($read_sql);
            $read_stmt->execute([
                ':notifikace_id' => $notifikace_id,
                ':uzivatel_id' => $params[':pro_uzivatele_id'],
                ':dt_created' => $params[':dt_created']
            ]);
        }
        
        return $notifikace_id;
        
    } catch (Exception $e) {
        error_log("[Notifications] Exception in createNotification: " . $e->getMessage());
        error_log("[Notifications] SQL Params: " . json_encode($params));
        throw $e;
    }
}

/**
 * Načte template pro daný typ notifikace
 */
function getNotificationTemplate($db, $typ) {
    $sql = "SELECT * FROM " . TBL_NOTIFIKACE_SABLONY . " WHERE LOWER(typ) = LOWER(:typ) AND aktivni = 1";
    $stmt = $db->prepare($sql);
    $stmt->execute(array(':typ' => $typ));
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Nahradí placeholdery v textu notifikace
 */
function replacePlaceholders($text, $data) {
    if (empty($text) || empty($data)) return $text;
    
    foreach ($data as $key => $value) {
        // Konvertovat hodnotu na string (pokud je to pole nebo objekt)
        if (is_array($value)) {
            $value = implode(', ', $value);
        } elseif (is_object($value)) {
            $value = json_encode($value, JSON_UNESCAPED_UNICODE);
        } elseif (!is_string($value) && !is_numeric($value)) {
            $value = (string)$value;
        }
        
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
 * Používá INNER JOIN s " . TBL_NOTIFIKACE_PRECTENI . " - uživatel vidí jen notifikace,
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
        $uzivatel_id = $token_data['id'];
        
        // Parametry
        $limit = isset($input['limit']) ? (int)$input['limit'] : 20;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        $unread_only = isset($input['unread_only']) ? (bool)$input['unread_only'] : false;
        $kategorie = isset($input['kategorie']) ? $input['kategorie'] : null;
        $include_dismissed = isset($input['include_dismissed']) ? (bool)$input['include_dismissed'] : false;

        // Sestavení dotazu - INNER JOIN s read tabulkou
        $where_conditions = array(
            "nr.uzivatel_id = :uzivatel_id",
            "n.aktivni = 1",
            "(n.dt_expires IS NULL OR n.dt_expires > NOW())"
        );
        
        // Vždy filtruj smazané notifikace
        $where_conditions[] = "nr.smazano = 0";
        
        // Pokud NENÍ include_dismissed, filtruj skryté notifikace
        if (!$include_dismissed) {
            $where_conditions[] = "nr.skryto = 0";
        }
        
        $params = array(':uzivatel_id' => $uzivatel_id);

        if ($unread_only) {
            $where_conditions[] = "nr.precteno = 0";
        }

        if ($kategorie) {
            $where_conditions[] = "n.kategorie = :kategorie";
            $params[':kategorie'] = $kategorie;
        }

        // Sestavení SELECT - vždy včetně skryto a smazano
        $select_columns = "n.id,
                    n.typ,
                    n.nadpis,
                    n.zprava,
                    n.priorita,
                    n.kategorie,
                    n.objekt_typ,
                    n.objekt_id,
                    n.data_json,
                    n.dt_created,
                    nr.precteno,
                    nr.dt_precteno,
                    nr.skryto,
                    nr.dt_skryto";

        $sql = "SELECT " . $select_columns . "
                FROM " . TBL_NOTIFIKACE . " n
                INNER JOIN " . TBL_NOTIFIKACE_PRECTENI . " nr ON n.id = nr.notifikace_id
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

        // Formátuj data pro frontend (české názvy)
        $result = array_map(function($notif) {
            $item = array(
                'id' => (int)$notif['id'],
                'typ' => $notif['typ'],
                'nadpis' => $notif['nadpis'],
                'zprava' => $notif['zprava'],
                'priorita' => $notif['priorita'],
                'kategorie' => $notif['kategorie'],
                'objekt_typ' => $notif['objekt_typ'],
                'objekt_id' => $notif['objekt_id'] ? (int)$notif['objekt_id'] : null,
                'data' => $notif['data_json'] ? json_decode($notif['data_json'], true) : null,
                'precteno' => $notif['precteno'] == 1,
                'dt_precteno' => $notif['dt_precteno'],
                'dt_created' => $notif['dt_created']
            );
            
            // Vždy vrátit skryto
            $item['skryto'] = $notif['skryto'] == 1;
            $item['dt_skryto'] = $notif['dt_skryto'];
            
            return $item;
        }, $notifications);

        // Počet celkem pro stránkování
        $count_sql = "SELECT COUNT(*) as total
                      FROM " . TBL_NOTIFIKACE . " n
                      INNER JOIN " . TBL_NOTIFIKACE_PRECTENI . " nr ON n.id = nr.notifikace_id
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
    $notifikace_id = isset($input['notifikace_id']) ? (int)$input['notifikace_id'] : 0;

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

    if ($notifikace_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];

        $current_time = TimezoneHelper::getCzechDateTime();
        $sql = "INSERT INTO " . TBL_NOTIFIKACE_PRECTENI . " (notifikace_id, uzivatel_id, precteno, dt_precteno, dt_created)
                VALUES (:notifikace_id, :uzivatel_id, 1, :dt_precteno, :dt_created)
                ON DUPLICATE KEY UPDATE 
                  precteno = 1, 
                  dt_precteno = :dt_precteno_update";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':notifikace_id' => $notifikace_id,
            ':uzivatel_id' => $uzivatel_id,
            ':dt_precteno' => $current_time,
            ':dt_created' => $current_time,
            ':dt_precteno_update' => $current_time
        ));

        echo json_encode(array(
            'status' => 'ok',
            'zprava' => 'Notifikace byla zamítnuta'
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
        $uzivatel_id = $token_data['id'];
        $current_time = TimezoneHelper::getCzechDateTime();

        // Aktualizovat všechny nepřečtené/neskryté notifikace uživatele
        $sql = "UPDATE " . TBL_NOTIFIKACE_PRECTENI . " 
                SET skryto = 1, 
                    dt_skryto = :dt_skryto 
                WHERE uzivatel_id = :uzivatel_id 
                  AND skryto = 0";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':uzivatel_id' => $uzivatel_id,
            ':dt_skryto' => $current_time
        ));

        $count = $stmt->rowCount();

        echo json_encode(array(
            'status' => 'ok',
            'zprava' => "Všechny notifikace skryty v dropdownu",
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
    $notifikace_id = isset($input['notifikace_id']) ? (int)$input['notifikace_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($notifikace_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];

        // Nastavit skryto zpět na 0
        $sql = "UPDATE " . TBL_NOTIFIKACE_PRECTENI . " 
                SET skryto = 0, 
                    dt_skryto = NULL 
                WHERE notifikace_id = :notifikace_id 
                  AND uzivatel_id = :uzivatel_id";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':notifikace_id' => $notifikace_id,
            ':uzivatel_id' => $uzivatel_id
        ));

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'zprava' => 'Notifikace obnovena v dropdownu'
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
    $notifikace_id = isset($input['notifikace_id']) ? (int)$input['notifikace_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($notifikace_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];
        $current_time = TimezoneHelper::getCzechDateTime();

        // Soft delete - nastavit smazano = 1 v read tabulce
        $sql = "UPDATE " . TBL_NOTIFIKACE_PRECTENI . " 
                SET smazano = 1, 
                    dt_smazano = :dt_smazano 
                WHERE notifikace_id = :notifikace_id 
                  AND uzivatel_id = :uzivatel_id";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':notifikace_id' => $notifikace_id,
            ':uzivatel_id' => $uzivatel_id,
            ':dt_smazano' => $current_time
        ));

        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok',
                'zprava' => 'Notifikace trvale smazána z databáze'
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
        $uzivatel_id = $token_data['id'];
        $current_time = TimezoneHelper::getCzechDateTime();

        // Soft delete všech notifikací uživatele
        $sql = "UPDATE " . TBL_NOTIFIKACE_PRECTENI . " 
                SET smazano = 1, 
                    dt_smazano = :dt_smazano 
                WHERE uzivatel_id = :uzivatel_id 
                  AND smazano = 0";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(
            ':uzivatel_id' => $uzivatel_id,
            ':dt_smazano' => $current_time
        ));

        $count = $stmt->rowCount();

        echo json_encode(array(
            'status' => 'ok',
            'zprava' => 'Všechny notifikace trvale smazány',
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
        $uzivatel_id = $token_data['id'];

        // Označ všechny nepřečtené záznamy v " . TBL_NOTIFIKACE_PRECTENI . "
        $current_time = TimezoneHelper::getCzechDateTime();
        $sql = "UPDATE " . TBL_NOTIFIKACE_PRECTENI . " 
                SET precteno = 1, dt_precteno = :dt_precteno
                WHERE uzivatel_id = :uzivatel_id 
                  AND precteno = 0";

        $stmt = $db->prepare($sql);
        $result = $stmt->execute(array(
            ':uzivatel_id' => $uzivatel_id,
            ':dt_precteno' => $current_time
        ));
        
        if ($result) {
            $marked_count = $stmt->rowCount();
            
            echo json_encode(array(
                'status' => 'ok',
                'zprava' => "Označeno {$marked_count} notifikací jako přečtených",
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
 * Načte notifikaci podle ID (pro post-login modal systém)
 * POST /notifications/get-by-id
 */
function handle_notifications_get_by_id($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $notification_id = isset($input['id']) ? (int)$input['id'] : 0;

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
        $result = getNotificationByIdHandler($db, $notification_id);
        
        if ($result['status'] === 'success') {
            echo json_encode($result['data']);
        } else {
            http_response_code(404);
            echo json_encode(['err' => $result['message']]);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání notifikace: ' . $e->getMessage()]);
        error_log("[Notifications] Exception in handle_notifications_get_by_id: " . $e->getMessage());
    }
}

/**
 * Načte seznam notifikací pro select v admin rozhraní
 * POST /notifications/list-for-select
 */
/**
 * POST /notifications/list-for-select
 * Načte seznam notifikací pro admin select dropdown
 * OrderV2 Standard
 */
function handle_notifications_list_for_select($input, $config, $queries) {
    // 1. Parametry z POST body
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token || !$request_username) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chybí token nebo username'
        ));
        return;
    }

    // 2. Ověření tokenu
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Neplatný nebo chybějící token'
        ));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Username z tokenu neodpovídá username z požadavku'
        ));
        return;
    }

    // 3. Kontrola admin oprávnění
    $uzivatel_id = $token_data['id'];
    
    try {
        // 4. DB připojení
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        // 5. Kontrola admin role
        $sql = "SELECT COUNT(*) as count FROM " . TBL_ROLE . " r
                JOIN " . TBL_UZIVATELE_ROLE . " ur ON r.id = ur.role_id
                WHERE ur.uzivatel_id = :uzivatel_id 
                AND r.kod_role IN ('ADMINISTRATOR', 'SUPERADMIN')";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':uzivatel_id', $uzivatel_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] == 0) {
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Přístup odepřen - vyžaduje se role Admin nebo SuperAdmin'
            ));
            return;
        }

        // 6. Načíst pouze systémové notifikace pro post-login modal
        $sql = "SELECT id, nadpis, zprava, dt_created, typ, kategorie
                FROM " . TBL_NOTIFIKACE . "
                WHERE aktivni = 1 
                AND (
                    (typ LIKE 'system_%' AND kategorie = 'system')
                    OR typ = 'system_announcement'
                    OR typ = 'system_notification'
                )
                ORDER BY dt_created DESC
                LIMIT 50";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 7. Formátovat pro select
        $result = array();
        foreach ($notifications as $notif) {
            $result[] = array(
                'id' => (int)$notif['id'],
                'title' => $notif['nadpis'] . ' (' . $notif['typ'] . ')',
                'preview' => substr(strip_tags($notif['zprava']), 0, 100) . '...'
            );
        }

        // 8. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $result,
            'message' => 'Notifikace načteny úspěšně',
            'count' => count($result)
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání notifikací: ' . $e->getMessage()
        ));
        error_log("[Notifications] Exception in handle_notifications_list_for_select: " . $e->getMessage());
    }
}

/**
 * POST /notifications/get-content
 * Načte konkrétní notifikaci pro náhled v admin UI
 * OrderV2 Standard
 */
function handle_notifications_get_content($input, $config, $queries) {
    // 1. Parametry z POST body
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $notification_id = isset($input['id']) ? (int)$input['id'] : 0;
    
    if (!$token || !$request_username || !$notification_id) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chybí token, username nebo ID notifikace'
        ));
        return;
    }

    // 2. Ověření tokenu
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Neplatný nebo chybějící token'
        ));
        return;
    }

    if ($token_data['username'] !== $request_username) {
        http_response_code(401);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Username z tokenu neodpovídá username z požadavku'
        ));
        return;
    }

    // 3. Kontrola admin oprávnění
    $uzivatel_id = $token_data['id'];
    
    try {
        // 4. DB připojení
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        // 5. Kontrola admin role
        $sql = "SELECT COUNT(*) as count FROM " . TBL_ROLE . " r
                JOIN " . TBL_UZIVATELE_ROLE . " ur ON r.id = ur.role_id
                WHERE ur.uzivatel_id = :uzivatel_id 
                AND r.kod_role IN ('ADMINISTRATOR', 'SUPERADMIN')";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':uzivatel_id', $uzivatel_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] == 0) {
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Přístup odepřen - vyžaduje se role Admin nebo SuperAdmin'
            ));
            return;
        }

        // 6. Načíst konkrétní notifikaci
        $sql = "SELECT id, nadpis, zprava, typ, kategorie, dt_created
                FROM " . TBL_NOTIFIKACE . "
                WHERE id = :id AND aktivni = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':id', $notification_id, PDO::PARAM_INT);
        $stmt->execute();
        $notification = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$notification) {
            http_response_code(404);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Notifikace s ID ' . $notification_id . ' nebyla nalezena nebo není aktivní'
            ));
            return;
        }

        // 7. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $notification,
            'message' => 'Notifikace načtena úspěšně'
        ));
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání notifikace: ' . $e->getMessage()
        ));
        error_log("[Notifications] Exception in handle_notifications_get_content: " . $e->getMessage());
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
        $uzivatel_id = $token_data['id'];
        
        error_log("🔔 [UnreadCount] Počítám nepřečtené pro user_id=$uzivatel_id...");

        // Spočítej nepřečtené z " . TBL_NOTIFIKACE_PRECTENI . "
        // MUSÍ být: nepřečtené (precteno=0), NEsmazané (smazano=0), NEdismissnuté (skryto=0)
        $sql = "SELECT COUNT(*) as unread_count
                FROM " . TBL_NOTIFIKACE_PRECTENI . " nr
                INNER JOIN " . TBL_NOTIFIKACE . " n ON nr.notifikace_id = n.id
                WHERE nr.uzivatel_id = :uzivatel_id
                  AND nr.precteno = 0
                  AND nr.skryto = 0
                  AND nr.smazano = 0
                  AND n.aktivni = 1";

        $stmt = $db->prepare($sql);
        $stmt->execute(array(':uzivatel_id' => $uzivatel_id));

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $count = (int)$result['unread_count'];
        
        error_log("   ✅ Výsledek: $count nepřečtených notifikací");

        echo json_encode(array(
            'status' => 'ok',
            'unread_count' => $count
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
 * 1. Vytvoří 1 záznam v " . TBL_NOTIFIKACE . " (master data)
 * 2. Vytvoří záznamy v " . TBL_NOTIFIKACE_PRECTENI . " pro každého příjemce
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
    $required_fields = array('typ');
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
        $typ = $input['typ'];
        $current_uzivatel_id = $token_data['id'];
        $username = $token_data['username'];
        
        error_log("[Notifications] Processing typ: $typ for user: $username (ID: $current_uzivatel_id)");
        
        // Načti template z databáze
        $template = getNotificationTemplate($db, $typ);
        if (!$template) {
            error_log("[Notifications] Template not found for typ: $typ");
            http_response_code(400);
            echo json_encode(array('err' => "Neznámý typ notifikace: $typ"));
            return;
        }
        
        error_log("[Notifications] Template loaded: " . $template['nazev']);
        
        // NOVÉ: Podpora order_id pro automatické naplnění placeholderů
        $placeholderData = array();
        $order_id = isset($input['order_id']) ? (int)$input['order_id'] : null;
        $action_uzivatel_id = isset($input['action_uzivatel_id']) ? (int)$input['action_uzivatel_id'] : $current_uzivatel_id;
        $additional_data = isset($input['additional_data']) ? $input['additional_data'] : array();
        
        error_log("[Notifications] order_id from input: " . ($order_id ? $order_id : 'NULL'));
        error_log("[Notifications] action_uzivatel_id: $action_uzivatel_id");
        
        if ($order_id) {
            error_log("[Notifications] ===== LOADING ORDER DATA START =====");
            error_log("[Notifications] Loading placeholder data for order_id: $order_id");
            
            // Načti data objednávky a připrav placeholdery (s error handlingem)
            try {
                $placeholderData = getOrderPlaceholderData($db, $order_id, $action_uzivatel_id, $additional_data);
                
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
                $placeholderData['action_icon'] = getActionIcon($typ);
                $placeholderData['action_performed_by_label'] = getActionLabel($typ);
                $placeholderData['priority_icon'] = getPriorityIcon(
                    isset($input['priorita']) ? $input['priorita'] : $template['priorita_vychozi']
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
        
        $app_nadpis = isset($template_override['app_nadpis']) ? 
            $template_override['app_nadpis'] : $template['app_nadpis'];
        $app_message = isset($template_override['app_zprava']) ? 
            $template_override['app_zprava'] : $template['app_zprava'];
        $email_predmet = isset($template_override['email_predmet']) ? 
            $template_override['email_predmet'] : $template['email_predmet'];
        $email_telo = isset($template_override['email_telo']) ? 
            $template_override['email_telo'] : $template['email_telo'];
        
        // Nahraď placeholdery v template
        $app_nadpis = notif_replacePlaceholders($app_nadpis, $finalData);
        $app_message = notif_replacePlaceholders($app_message, $finalData);
        
        // Email vždy s placeholdery
        $email_predmet = notif_replacePlaceholders($email_predmet, $finalData);
        $email_telo = notif_replacePlaceholders($email_telo, $finalData);
        
        error_log("[Notifications] After placeholder replacement - Title: " . $app_nadpis);
        error_log("[Notifications] After placeholder replacement - Message: " . substr($app_message, 0, 100));
        
        // KLÍČOVÁ LOGIKA: Určení příjemců
        $pro_uzivatele_id = isset($input['pro_uzivatele_id']) ? (int)$input['pro_uzivatele_id'] : null;
        $to_users = isset($input['to_users']) && is_array($input['to_users']) ? $input['to_users'] : null;
        $pro_vsechny = isset($input['pro_vsechny']) ? (bool)$input['pro_vsechny'] : false;
        
        error_log("[Notifications] Recipients config: pro_uzivatele_id=" . ($pro_uzivatele_id ?: 'null') . 
                  ", to_users=" . ($to_users ? json_encode($to_users) : 'null') . 
                  ", pro_vsechny=" . ($pro_vsechny ? 'true' : 'false'));
        
        // Sestavení pole příjemců
        $recipient_uzivatel_ids = array();
        
        if ($pro_vsechny) {
            // Broadcast - všichni aktivní uživatelé
            $users_table = get_users_table_name();
            $stmt = $db->prepare("SELECT id FROM {$users_table} WHERE aktivni = 1");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $recipient_uzivatel_ids = array_column($users, 'id');
            error_log("[Notifications] Broadcasting '$typ' to " . count($recipient_uzivatel_ids) . " users");
            
        } elseif (!empty($to_users) && is_array($to_users)) {
            // Skupina uživatelů
            $recipient_uzivatel_ids = array_map('intval', $to_users);
            error_log("[Notifications] Sending '$typ' to group: " . implode(',', $recipient_uzivatel_ids));
            
        } elseif (!empty($pro_uzivatele_id)) {
            // Konkrétní uživatel
            $recipient_uzivatel_ids = array($pro_uzivatele_id);
            error_log("[Notifications] Sending '$typ' to user: $pro_uzivatele_id");
            
        } else {
            error_log("[Notifications] No recipients specified!");
            http_response_code(400);
            echo json_encode(array('err' => 'Musíte zadat alespoň jednoho příjemce (pro_uzivatele_id, to_users nebo pro_vsechny)'));
            return;
        }
        
        if (empty($recipient_uzivatel_ids)) {
            error_log("[Notifications] Recipients array is empty after processing!");
            http_response_code(400);
            echo json_encode(array('err' => 'Nebyli nalezeni žádní příjemci pro notifikaci'));
            return;
        }
        
        error_log("[Notifications] Final recipients: " . json_encode($recipient_uzivatel_ids));
        
        // 1. VYTVOŘ MASTER ZÁZNAM v " . TBL_NOTIFIKACE . " (pouze 1 záznam)
        $priorita = isset($input['priorita']) ? $input['priorita'] : $template['priorita_vychozi'];
        $kategorie = isset($input['kategorie']) ? $input['kategorie'] : 'general';
        $odeslat_email = isset($input['odeslat_email']) ? (int)$input['odeslat_email'] : (int)$template['email_vychozi'];
        $objekt_typ = isset($input['objekt_typ']) ? $input['objekt_typ'] : ($order_id ? 'order' : null);
        $objekt_id = isset($input['objekt_id']) ? (int)$input['objekt_id'] : $order_id;
        
        $stmt = $db->prepare("
            INSERT INTO " . TBL_NOTIFIKACE . " (
                typ, 
                nadpis, 
                zprava, 
                od_uzivatele_id, 
                pro_uzivatele_id,
                prijemci_json,
                pro_vsechny,
                priorita,
                kategorie,
                odeslat_email,
                objekt_typ,
                objekt_id,
                data_json,
                dt_created,
                aktivni
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
        ");
        
        $result = $stmt->execute(array(
            $typ,
            // Použij TEMPLATE s nahrazenými placeholdery, fallback na FE custom text
            !empty($app_nadpis) ? $app_nadpis : (!empty($input['nadpis']) ? $input['nadpis'] : 'Notifikace'),
            !empty($app_message) ? $app_message : (!empty($input['zprava']) ? $input['zprava'] : ''),
            $current_uzivatel_id,
            // Pro jednotlivce: konkrétní uzivatel_id, pro skupinu/broadcast: NULL
            count($recipient_uzivatel_ids) === 1 ? $recipient_uzivatel_ids[0] : null,
            // Pro skupinu: JSON array, jinak NULL
            count($recipient_uzivatel_ids) > 1 && !$pro_vsechny ? json_encode($recipient_uzivatel_ids) : null,
            $pro_vsechny ? 1 : 0,
            $priorita,
            $kategorie,
            $odeslat_email,
            $objekt_typ,
            $objekt_id,
            !empty($finalData) ? json_encode($finalData) : null
        ));
        
        if (!$result) {
            throw new Exception('Chyba při vytváření master notifikace');
        }
        
        $notifikace_id = $db->lastInsertId();
        
        // 2. VYTVOŘ READ ZÁZNAMY v " . TBL_NOTIFIKACE_PRECTENI . " (pro každého příjemce)
        $stmt_read = $db->prepare("
            INSERT INTO " . TBL_NOTIFIKACE_PRECTENI . " (
                notifikace_id,
                uzivatel_id,
                precteno,
                skryto,
                dt_created
            ) VALUES (?, ?, 0, 0, NOW())
        ");
        
        $read_records_created = 0;
        foreach ($recipient_uzivatel_ids as $uzivatel_id) {
            $result = $stmt_read->execute(array($notifikace_id, $uzivatel_id));
            if ($result) {
                $read_records_created++;
                error_log("[Notifications] Created read record for user: $uzivatel_id, notification: $notifikace_id");
            } else {
                error_log("[Notifications] Failed to create read record for user: $uzivatel_id, notification: $notifikace_id");
            }
        }
        
        // 3. ODESLAT EMAIL (pokud je potřeba)
        $email_odeslan = false;
        if ($odeslat_email && !empty($email_predmet)) {
            foreach ($recipient_uzivatel_ids as $uzivatel_id) {
                // TODO: Implementovat sendNotificationEmail($uzivatel_id, $email_predmet, $email_telo);
                error_log("[Notifications] Email should be sent to user: $uzivatel_id for notification: $notifikace_id");
            }
            
            // Označit jako odeslaný
            $stmt_email = $db->prepare("UPDATE " . TBL_NOTIFIKACE . " SET email_odeslan = 1, email_odeslan_kdy = NOW() WHERE id = ?");
            $stmt_email->execute(array($notifikace_id));
            $email_odeslan = true;
        }
        
        // 4. RESPONSE
        $response = array(
            'status' => 'ok',
            'zprava' => 'Notifikace byla vytvořena',
            'notifikace_id' => (int)$notifikace_id,
            'recipients_count' => $read_records_created,
            'email_odeslan' => $email_odeslan
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
    $notifikace_id = isset($input['notifikace_id']) ? (int)$input['notifikace_id'] : 0;

    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný nebo chybějící token']);
        return;
    }

    if ($notifikace_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Neplatné ID notifikace']);
        return;
    }

    try {
        $db = get_db($config);
        $uzivatel_id = $token_data['id'];

        $current_time = TimezoneHelper::getCzechDateTime();
        
        // KROK 1: Zkus UPDATE (pokud záznam existuje)
        $sql_update = "UPDATE " . TBL_NOTIFIKACE_PRECTENI . " 
                       SET skryto = 1, 
                           dt_skryto = :dt_skryto 
                       WHERE notifikace_id = :notifikace_id 
                         AND uzivatel_id = :uzivatel_id";

        $stmt = $db->prepare($sql_update);
        $stmt->execute(array(
            ':notifikace_id' => $notifikace_id,
            ':uzivatel_id' => $uzivatel_id,
            ':dt_skryto' => $current_time
        ));

        // KROK 2: Pokud UPDATE nezměnil žádný řádek, udělej INSERT
        if ($stmt->rowCount() == 0) {
            $sql_insert = "INSERT INTO " . TBL_NOTIFIKACE_PRECTENI . " 
                           (notifikace_id, uzivatel_id, precteno, skryto, dt_skryto, dt_created)
                           VALUES (:notifikace_id, :uzivatel_id, 0, 1, :dt_skryto, :dt_created)";
            
            $stmt = $db->prepare($sql_insert);
            $stmt->execute(array(
                ':notifikace_id' => $notifikace_id,
                ':uzivatel_id' => $uzivatel_id,
                ':dt_skryto' => $current_time,
                ':dt_created' => $current_time
            ));
        }

        echo json_encode(array(
            'status' => 'ok',
            'zprava' => 'Notifikace skryta v dropdownu'
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
    if (empty($input['typ'])) {
        http_response_code(400);
        echo json_encode(array('err' => 'Chybí povinné pole: typ'));
        return;
    }

    try {
        $db = get_db($config);
        $typ = $input['typ'];
        $current_uzivatel_id = $token_data['id'];
        
        // Načti template z databáze
        $template = getNotificationTemplate($db, $typ);
        if (!$template) {
            http_response_code(400);
            echo json_encode(array('err' => "Neznámý typ notifikace: $typ"));
            return;
        }
        
        // Načti placeholder data pokud je zadáno order_id
        $placeholderData = array();
        $order_id = isset($input['order_id']) ? (int)$input['order_id'] : null;
        $action_uzivatel_id = isset($input['action_uzivatel_id']) ? (int)$input['action_uzivatel_id'] : $current_uzivatel_id;
        $additional_data = isset($input['additional_data']) ? $input['additional_data'] : array();
        
        if ($order_id) {
            $placeholderData = getOrderPlaceholderData($db, $order_id, $action_uzivatel_id, $additional_data);
            
            if (isset($placeholderData['error'])) {
                http_response_code(400);
                echo json_encode(array('err' => $placeholderData['error']));
                return;
            }
            
            // Přidej ikony a labely
            $placeholderData['action_icon'] = getActionIcon($typ);
            $placeholderData['action_performed_by_label'] = getActionLabel($typ);
            $placeholderData['priority_icon'] = getPriorityIcon($template['priorita_vychozi']);
        }
        
        // Nahraď placeholdery
        $app_nadpis = notif_replacePlaceholders($template['app_nadpis'], $placeholderData);
        $app_message = notif_replacePlaceholders($template['app_zprava'], $placeholderData);
        $email_predmet = notif_replacePlaceholders($template['email_predmet'], $placeholderData);
        $email_telo = notif_replacePlaceholders($template['email_telo'], $placeholderData);
        
        // Zjisti které placeholdery byly použity
        preg_match_all('/\{([a-z_]+)\}/', $template['app_nadpis'] . $template['app_zprava'], $matches);
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
                'typ' => $typ,
                'app_nadpis' => $app_nadpis,
                'app_message' => $app_message,
                'email_predmet' => $email_predmet,
                'email_telo' => $email_telo,
                'priorita' => $template['priorita_vychozi'],
                'odeslat_email_default' => $template['email_vychozi'] == 1
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
        $sql = "SELECT * FROM " . TBL_NOTIFIKACE_SABLONY . "";
        if ($active_only) {
            $sql .= " WHERE aktivni = 1";
        }
        $sql .= " ORDER BY nazev ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Formátuj data
        $result = array_map(function($template) {
            return array(
                'id' => (int)$template['id'],
                'typ' => $template['typ'],
                'nazev' => $template['nazev'],
                'app_nadpis' => $template['app_nadpis'],
                'app_zprava' => $template['app_zprava'],
                'email_predmet' => $template['email_predmet'],
                'email_telo' => $template['email_telo'],
                'odeslat_email_default' => $template['email_vychozi'] == 1,
                'priorita_vychozi' => $template['priorita_vychozi'],
                'aktivni' => $template['aktivni'] == 1,
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
    $required_fields = array('typ', 'recipients');
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
                'code' => 'ORDER_SENT_FOR_APPROVAL',
                'nazev' => 'Objednávka vytvořena',
                'kategorie' => 'orders',
                'description' => 'Robert vytvoří objednávku → notifikace příkazci ke schválení',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 2A: Schválení
            array(
                'code' => 'ORDER_APPROVED',
                'nazev' => 'Objednávka schválena',
                'kategorie' => 'orders',
                'description' => 'Příkazce schválil → notifikace Robertovi, že může pokračovat',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 2B: Zamítnutí
            array(
                'code' => 'ORDER_REJECTED',
                'nazev' => 'Objednávka zamítnuta',
                'kategorie' => 'orders',
                'description' => 'Příkazce zamítl → proces končí',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 2C: Vrácení
            array(
                'code' => 'ORDER_WAITING_FOR_CHANGES',
                'nazev' => 'Objednávka vrácena k doplnění',
                'kategorie' => 'orders',
                'description' => 'Příkazce vrátil → Robert doplní a znovu odešle',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 3: Plnění
            array(
                'code' => 'ORDER_SENT_TO_SUPPLIER',
                'nazev' => 'Objednávka odeslána dodavateli',
                'kategorie' => 'orders',
                'description' => 'Robert odeslal dodavateli → notifikace nákupčímu a ostatním',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 4: Registr
            array(
                'code' => 'ORDER_REGISTRY_APPROVAL_REQUESTED',
                'nazev' => 'Žádost o schválení v registru',
                'kategorie' => 'orders',
                'description' => 'Robert žádá o registr → notifikace registru (role/úsek)',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 5: Faktura
            array(
                'code' => 'ORDER_INVOICE_ADDED',
                'nazev' => 'Faktura doplněna',
                'kategorie' => 'orders',
                'description' => 'Registr doplnil fakturu → Robert musí provést věcnou kontrolu',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 6: Kontrola
            array(
                'code' => 'ORDER_MATERIAL_CHECK_COMPLETED',
                'nazev' => 'Věcná kontrola provedena',
                'kategorie' => 'orders',
                'description' => 'Robert provedl kontrolu → registr může dokončit',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            
            // OBJEDNÁVKY - Fáze 7: Dokončení
            array(
                'code' => 'ORDER_COMPLETED',
                'nazev' => 'Objednávka dokončena',
                'kategorie' => 'orders',
                'description' => 'Registr dokončil → notifikace všem zúčastněným',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('INFO')
            ),
            
            // FAKTURY
            array(
                'code' => 'INVOICE_CREATED',
                'nazev' => 'Faktura vytvořena',
                'kategorie' => 'invoices',
                'description' => 'Nová faktura byla vytvořena v systému',
                'urgencyLevel' => 'NORMAL',
                'recipientRoles' => array('APPROVAL', 'INFO')
            ),
            array(
                'code' => 'INVOICE_DUE_SOON',
                'nazev' => 'Faktura brzy po splatnosti',
                'kategorie' => 'invoices',
                'description' => 'Faktura se blíží ke dni splatnosti',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            array(
                'code' => 'INVOICE_OVERDUE',
                'nazev' => 'Faktura po splatnosti',
                'kategorie' => 'invoices',
                'description' => 'Faktura je po splatnosti',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL')
            ),
            
            // SMLOUVY
            array(
                'code' => 'CONTRACT_EXPIRING',
                'nazev' => 'Smlouva brzy vyprší',
                'kategorie' => 'contracts',
                'description' => 'Smlouva se blíží ke konci platnosti',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            ),
            
            // POKLADNA
            array(
                'code' => 'CASHBOOK_LOW_BALANCE',
                'nazev' => 'Nízký zůstatek v pokladně',
                'kategorie' => 'cashbook',
                'description' => 'Zůstatek v pokladně je pod minimální hranicí',
                'urgencyLevel' => 'EXCEPTIONAL',
                'recipientRoles' => array('EXCEPTIONAL', 'INFO')
            )
        );
        
        // Filtrování podle kategorie (volitelné)
        $kategorie = isset($input['kategorie']) ? $input['kategorie'] : null;
        if ($kategorie) {
            $eventTypes = array_filter($eventTypes, function($event) use ($kategorie) {
                return $event['kategorie'] === $kategorie;
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
 * Najít definici události podle event type code
 * Vrací asociativní pole s klíči: code, nazev, kategorie, description, urgencyLevel, recipientRoles
 */
function getEventDefinition($eventTypeCode) {
    // Načíst všechny event definitions
    $eventTypes = array(
        // OBJEDNÁVKY - Fáze 1: Vytvoření
        array(
            'code' => 'ORDER_SENT_FOR_APPROVAL',
            'nazev' => 'Objednávka vytvořena',
            'kategorie' => 'orders',
            'description' => 'Robert vytvoří objednávku → notifikace příkazci ke schválení',
            'urgencyLevel' => 'EXCEPTIONAL',
            'recipientRoles' => array('EXCEPTIONAL', 'APPROVAL', 'INFO')
        ),
        array(
            'code' => 'ORDER_APPROVED',
            'nazev' => 'Objednávka schválena',
            'kategorie' => 'orders',
            'urgencyLevel' => 'NORMAL',
            'recipientRoles' => array('APPROVAL', 'INFO')
        ),
        array(
            'code' => 'ORDER_REJECTED',
            'nazev' => 'Objednávka zamítnuta',
            'kategorie' => 'orders',
            'urgencyLevel' => 'EXCEPTIONAL',
            'recipientRoles' => array('EXCEPTIONAL', 'INFO')
        ),
        array(
            'code' => 'ORDER_WAITING_FOR_CHANGES',
            'nazev' => 'Objednávka vrácena k doplnění',
            'kategorie' => 'orders',
            'urgencyLevel' => 'EXCEPTIONAL',
            'recipientRoles' => array('EXCEPTIONAL', 'INFO')
        ),
        array(
            'code' => 'ORDER_SENT_TO_SUPPLIER',
            'nazev' => 'Objednávka odeslána dodavateli',
            'kategorie' => 'orders',
            'urgencyLevel' => 'NORMAL',
            'recipientRoles' => array('APPROVAL', 'INFO')
        ),
        array(
            'code' => 'ORDER_CONFIRMED_BY_SUPPLIER',
            'nazev' => 'Objednávka potvrzena dodavatelem',
            'kategorie' => 'orders',
            'urgencyLevel' => 'NORMAL',
            'recipientRoles' => array('APPROVAL', 'INFO')
        ),
        array(
            'code' => 'ORDER_FULFILLED',
            'nazev' => 'Objednávka splněna',
            'kategorie' => 'orders',
            'urgencyLevel' => 'EXCEPTIONAL',
            'recipientRoles' => array('EXCEPTIONAL', 'INFO')
        ),
        array(
            'code' => 'ORDER_CANCELLED',
            'nazev' => 'Objednávka zrušena',
            'kategorie' => 'orders',
            'urgencyLevel' => 'EXCEPTIONAL',
            'recipientRoles' => array('EXCEPTIONAL')
        ),
        array(
            'code' => 'ORDER_ARCHIVED',
            'nazev' => 'Objednávka archivována',
            'kategorie' => 'orders',
            'urgencyLevel' => 'NORMAL',
            'recipientRoles' => array('INFO')
        ),
        array(
            'code' => 'ORDER_WAITING',
            'nazev' => 'Objednávka pozastavena',
            'kategorie' => 'orders',
            'urgencyLevel' => 'EXCEPTIONAL',
            'recipientRoles' => array('EXCEPTIONAL', 'INFO')
        ),
        array(
            'code' => 'INVOICE_RECEIVED',
            'nazev' => 'Faktura přijata',
            'kategorie' => 'invoices',
            'urgencyLevel' => 'NORMAL',
            'recipientRoles' => array('APPROVAL', 'INFO')
        ),
        array(
            'code' => 'INVOICE_APPROVED',
            'nazev' => 'Faktura schválena',
            'kategorie' => 'invoices',
            'urgencyLevel' => 'NORMAL',
            'recipientRoles' => array('INFO')
        ),
        array(
            'code' => 'CASHBOOK_ENTRY_CREATED',
            'nazev' => 'Záznam v pokladně vytvořen',
            'kategorie' => 'cashbook',
            'urgencyLevel' => 'NORMAL',
            'recipientRoles' => array('INFO')
        )
    );
    
    // Najít event podle code
    foreach ($eventTypes as $event) {
        if ($event['code'] === $eventTypeCode) {
            return $event;
        }
    }
    
    return null; // Event nenalezen
}

/**
 * Mapování recipient role na DB ENUM priorita
 * AUTHOR_INFO a GUARANTOR_INFO se mapují na INFO (modrá, normální priorita)
 */
function mapRecipientRoleToPriority($recipientRole) {
    switch ($recipientRole) {
        case 'EXCEPTIONAL':
            return 'EXCEPTIONAL';  // Urgentní (červená)
        case 'APPROVAL':
            return 'APPROVAL';     // Ke schválení (oranžová)
        case 'INFO':
        case 'AUTHOR_INFO':        // ← Pro autora objednávky (modrá)
        case 'GUARANTOR_INFO':     // ← Pro garanta objednávky (modrá)
            return 'INFO';         // Informativní (modrá)
        default:
            return 'INFO';         // Fallback
    }
}

/**
 * Načte placeholder data z databáze podle object typu
 */
function loadOrderPlaceholders($db, $objectId, $triggerUserId = null) {
    error_log("[loadOrderPlaceholders] START for order $objectId, trigger user: " . ($triggerUserId ?? 'NULL'));
    
    // DEBUG do DB
    try {
        $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
        $stmt->execute(['loadOrderPlaceholders START', json_encode(['object_id' => $objectId, 'trigger_user' => $triggerUserId])]);
    } catch (Exception $e) {
        error_log("DEBUG LOG FAILED: " . $e->getMessage());
    }
    
    // Načíst table names pomocí funkcí z orderQueries.php
    if (!function_exists('get_orders_table_name')) {
        require_once __DIR__ . '/orderQueries.php';
    }
    
    $orders_table = get_orders_table_name(); // 25a_objednavky
    $order_items_table = get_order_items_table_name(); // 25a_objednavky_polozky
    $users_table = get_users_table_name(); // 25_uzivatele
    
    error_log("[loadOrderPlaceholders] Tables: orders=$orders_table, items=$order_items_table, users=$users_table");
    
    // DEBUG do DB
    try {
        $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
        $stmt->execute(['After get_table_names', json_encode([
            'orders_table' => $orders_table,
            'users_table' => $users_table
        ])]);
    } catch (Exception $e) {}
    
    try {
        error_log("[loadOrderPlaceholders] Preparing SQL query...");
        
        // DEBUG do DB
        try {
            $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
            $stmt_debug->execute(['Before SQL prepare', json_encode(['object_id' => $objectId])]);
        } catch (Exception $e) {}
        
        // Načti objednávku s JOINy na všechny účastníky
        // ⚠️ DŮLEŽITÉ: creator_name = objednatel (ne uzivatel_id, ten je jen tech. creator v DB)
        $sql = "
            SELECT o.*, 
                   CONCAT(objednatel.jmeno, ' ', objednatel.prijmeni) as creator_name,
                   CONCAT(objednatel.jmeno, ' ', objednatel.prijmeni) as objednatel_name,
                   CONCAT(prikazce.jmeno, ' ', prikazce.prijmeni) as prikazce_name,
                   CONCAT(garant.jmeno, ' ', garant.prijmeni) as garant_name,
                   CONCAT(schvalovatel.jmeno, ' ', schvalovatel.prijmeni) as schvalovatel_name
            FROM $orders_table o
            LEFT JOIN $users_table objednatel ON o.objednatel_id = objednatel.id
            LEFT JOIN $users_table prikazce ON o.prikazce_id = prikazce.id
            LEFT JOIN $users_table garant ON o.garant_uzivatel_id = garant.id
            LEFT JOIN $users_table schvalovatel ON o.schvalovatel_id = schvalovatel.id
            WHERE o.id = :order_id
        ";
        
        error_log("[loadOrderPlaceholders] SQL: " . substr($sql, 0, 200));
        
        $stmt = $db->prepare($sql);
        error_log("[loadOrderPlaceholders] SQL prepared, executing...");
        
        // DEBUG do DB
        try {
            $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
            $stmt_debug->execute(['After SQL prepare, before execute', json_encode(['object_id' => $objectId])]);
        } catch (Exception $e) {}
        
        $stmt->execute([':order_id' => $objectId]);
        error_log("[loadOrderPlaceholders] SQL executed, fetching...");
        
        // DEBUG do DB
        try {
            $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
            $stmt_debug->execute(['After SQL execute, before fetch', json_encode(['object_id' => $objectId])]);
        } catch (Exception $e) {}
        
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        error_log("[loadOrderPlaceholders] Fetched: " . ($order ? "SUCCESS" : "NOT FOUND"));
        
        // DEBUG do DB
        try {
            $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
            $stmt_debug->execute(['After fetch', json_encode([
                'found' => $order ? true : false,
                'order_id' => $order ? $order['id'] : null,
                'cislo' => $order ? $order['cislo_objednavky'] : null
            ])]);
        } catch (Exception $e) {}
        
        if (!$order) {
            error_log("[loadOrderPlaceholders] Order not found: $objectId");
            return array();
        }
        
        // Načíst jméno trigger uživatele (toho kdo akci vykonal)
        $trigger_user_name = 'Neznámý';
        if ($triggerUserId) {
            $stmt_trigger = $db->prepare("SELECT CONCAT(jmeno, ' ', prijmeni) as full_name FROM $users_table WHERE id = :user_id");
            $stmt_trigger->execute([':user_id' => $triggerUserId]);
            $trigger_row = $stmt_trigger->fetch(PDO::FETCH_ASSOC);
            if ($trigger_row) {
                $trigger_user_name = $trigger_row['full_name'];
            }
            error_log("[loadOrderPlaceholders] Trigger user: $trigger_user_name (ID: $triggerUserId)");
        }
        
        // Načti položky
        $stmt = $db->prepare("
            SELECT COUNT(*) as items_count, SUM(COALESCE(cena_s_dph, 0)) as items_total_s_dph
            FROM $order_items_table
            WHERE objednavka_id = :order_id
        ");
        $stmt->execute([':order_id' => $objectId]);
        $items = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Dekóduj JSON pole - STŘEDISKA a načti názvy z číselníku
        $strediska_arr = json_decode($order['strediska_kod'] ?? '[]', true);
        $strediska_names = [];
        
        if (is_array($strediska_arr) && !empty($strediska_arr)) {
            $placeholders_str = implode(',', array_fill(0, count($strediska_arr), '?'));
            $stmt_str = $db->prepare("SELECT kod_stavu, nazev_stavu FROM " . TBL_CISELNIK_STAVY . " WHERE typ_objektu = 'STREDISKA' AND kod_stavu IN ($placeholders_str)");
            $stmt_str->execute($strediska_arr);
            
            while ($str_row = $stmt_str->fetch(PDO::FETCH_ASSOC)) {
                $strediska_names[] = $str_row['nazev_stavu'];
            }
        }
        
        $strediska_text = !empty($strediska_names) ? implode(', ', $strediska_names) : 'Neuvedeno';
        
        // Dekóduj JSON - FINANCOVÁNÍ (komplexní struktura)
        $financovani_obj = json_decode($order['financovani'] ?? '{}', true);
        $financovani_text = 'Neuvedeno';
        
        if (is_array($financovani_obj) && !empty($financovani_obj)) {
            // Určit typ financování
            $typ = isset($financovani_obj['typ']) ? $financovani_obj['typ'] : '';
            $nazev = isset($financovani_obj['nazev']) ? $financovani_obj['nazev'] : '';
            
            // Sestavit text podle typu
            if ($typ === 'SMLOUVA' && isset($financovani_obj['cislo_smlouvy'])) {
                $financovani_text = 'Smlouva č. ' . $financovani_obj['cislo_smlouvy'];
            } elseif ($typ === 'FAKTURA' && isset($financovani_obj['cislo_faktury'])) {
                $financovani_text = 'Faktura č. ' . $financovani_obj['cislo_faktury'];
            } elseif ($typ === 'LP' && isset($financovani_obj['lp_kody']) && is_array($financovani_obj['lp_kody'])) {
                // LP jsou uložené jako pole ID - načíst z DB (OPRAVENO: použít správnou tabulku 25_limitovane_prisliby)
                $lp_ids = array_map('intval', $financovani_obj['lp_kody']);
                if (!empty($lp_ids)) {
                    $placeholders_lp = implode(',', array_fill(0, count($lp_ids), '?'));
                    $stmt_lp = $db->prepare("SELECT cislo_lp, nazev_uctu FROM " . TBL_LP_MASTER . " WHERE id IN ($placeholders_lp)");
                    $stmt_lp->execute($lp_ids);
                    $lp_names = [];
                    while ($lp_row = $stmt_lp->fetch(PDO::FETCH_ASSOC)) {
                        $lp_names[] = $lp_row['cislo_lp'] . ' (' . $lp_row['nazev_uctu'] . ')';
                    }
                    $financovani_text = 'LP: ' . implode(', ', $lp_names);
                }
            } elseif ($typ === 'INDIVIDUALNI_SCHVALENI' && isset($financovani_obj['individualni_schvaleni'])) {
                $financovani_text = 'Individuální schválení: ' . $financovani_obj['individualni_schvaleni'];
            } elseif ($typ === 'POJISTNA_UDALOST' && isset($financovani_obj['pojistna_udalost_cislo'])) {
                $financovani_text = 'Pojistná událost: ' . $financovani_obj['pojistna_udalost_cislo'];
            } elseif (!empty($nazev)) {
                $financovani_text = $nazev;
            }
        }
        
        // Extrahovat poznámku podle typu financování
        $financovani_poznamka = '';
        if (is_array($financovani_obj)) {
            $typ = $financovani_obj['typ'] ?? '';
            if ($typ === 'SMLOUVA' && !empty($financovani_obj['smlouva_poznamka'])) {
                $financovani_poznamka = $financovani_obj['smlouva_poznamka'];
            } elseif ($typ === 'INDIVIDUALNI_SCHVALENI' && !empty($financovani_obj['individualni_poznamka'])) {
                $financovani_poznamka = $financovani_obj['individualni_poznamka'];
            } elseif ($typ === 'POJISTNA_UDALOST' && !empty($financovani_obj['pojistna_udalost_poznamka'])) {
                $financovani_poznamka = $financovani_obj['pojistna_udalost_poznamka'];
            } elseif (!empty($financovani_obj['poznamka'])) {
                // Fallback pro starý formát
                $financovani_poznamka = $financovani_obj['poznamka'];
            }
        }
        
        // SCHVALOVATEL / PŘÍKAZCE - použij toho, kdo NENÍ NULL
        $approver_display = 'Nepřiřazen';
        if (!empty($order['schvalovatel_name']) && $order['schvalovatel_name'] !== 'Nepřiřazen') {
            $approver_display = $order['schvalovatel_name'];
        } elseif (!empty($order['prikazce_name']) && $order['prikazce_name'] !== 'Nepřiřazen') {
            $approver_display = $order['prikazce_name'];
        }
        
        // Určit ikonu podle urgentnosti
        // ⚠️ Toto je výchozí ikona - přepíše se později podle recipientRole v notificationRouter
        $default_icon = '📋';
        
        // Připrav placeholders - KOMPLETNÍ SET
        $placeholders = array(
            // Ikona a základní info (přepíše se později podle recipientRole)
            'action_icon' => $default_icon,
            'order_number' => $order['cislo_objednavky'] ?? '',
            'order_subject' => $order['predmet'] ?? '',
            'predmet' => $order['predmet'] ?? '',  // alias
            
            // Cena
            'max_price_with_dph' => number_format($order['max_cena_s_dph'] ?? 0, 0, ',', ' ') . ' Kč',
            'amount' => number_format($order['max_cena_s_dph'] ?? 0, 0, ',', ' ') . ' Kč',  // alias
            
            // Datum
            'action_date' => date('d.m.Y H:i', strtotime($order['dt_objednavky'] ?? 'now')),
            'date' => date('d.m.Y', strtotime($order['dt_objednavky'] ?? 'now')),  // alias
            
            // Položky
            'items_count' => $items['items_count'] ?? 0,
            'items_total_s_dph' => number_format($items['items_total_s_dph'] ?? 0, 0, ',', ' ') . ' Kč',
            
            // Účastníci
            'creator_name' => $order['creator_name'] ?? 'Neznámý',
            'objednatel_name' => $order['objednatel_name'] ?? 'Nepřiřazen',
            'prikazce_name' => $order['prikazce_name'] ?? 'Nepřiřazen',
            'garant_name' => $order['garant_name'] ?? 'Nepřiřazen',
            'schvalovatel_name' => $approver_display,  // použije schvalovatele NEBO příkazce
            'approver_name' => $approver_display,  // alias
            'approval_date' => !empty($order['dt_schvaleni']) ? date('d.m.Y', strtotime($order['dt_schvaleni'])) : '-',
            'trigger_user_name' => $trigger_user_name,  // Ten kdo akci vykonal (schvalovatel/zamítač)
            'action_performed_by' => $trigger_user_name,  // ✅ OPRAVENO: Stejný jako trigger_user_name pro frontend (NotificationDropdown.js řádek 663)
            
            // Střediska a financování
            'strediska' => $strediska_text,
            'financovani' => $financovani_text,
            'financovani_poznamka' => $financovani_poznamka,
            
            // Stav
            'stav_objednavky' => $order['stav_objednavky'] ?? '',
            
            // Urgentnost - mimořádná událost
            'is_urgent' => !empty($order['mimoradna_udalost']) ? (bool)$order['mimoradna_udalost'] : false,
            
            // User_name se doplní později podle příjemce
            'user_name' => '{user_name}',  // placeholder pro pozdější nahrazení
        );
        
        error_log("[loadOrderPlaceholders] Loaded " . count($placeholders) . " placeholders for order $objectId");
        error_log("   objednatel: " . $placeholders['objednatel_name']);
        error_log("   prikazce: " . $placeholders['prikazce_name']);
        error_log("   garant: " . $placeholders['garant_name']);
        
        return $placeholders;
        
    } catch (Exception $e) {
        error_log("[loadOrderPlaceholders] Error: " . $e->getMessage());
        return array();
    }
}

// ==========================================
// GENERIC RECIPIENT SYSTEM - NOVÉ FUNKCE
// ==========================================

/**
 * Vrátí seznam účastníků konkrétní entity (objednávka, faktura, ...)
 * 
 * @param PDO $db - Database connection
 * @param string $entityType - Typ entity ('orders', 'invoices', 'todos', 'cashbook')
 * @param int $entityId - ID entity
 * @return array - Pole user_id účastníků
 */
function getEntityParticipants($db, $entityType, $entityId) {
    $participants = array();
    
    try {
        switch ($entityType) {
            case 'orders':
                // Objednávka: autor + garant + schvalovatel + příkazce + objednatel
                $stmt = $db->prepare("
                    SELECT DISTINCT user_id
                    FROM (
                        SELECT uzivatel_id as user_id FROM " . TBL_OBJEDNAVKY . " WHERE id = :entity_id
                        UNION
                        SELECT objednatel_id FROM " . TBL_OBJEDNAVKY . " WHERE id = :entity_id AND objednatel_id IS NOT NULL
                        UNION
                        SELECT garant_uzivatel_id FROM " . TBL_OBJEDNAVKY . " WHERE id = :entity_id AND garant_uzivatel_id IS NOT NULL
                        UNION
                        SELECT schvalovatel_id FROM " . TBL_OBJEDNAVKY . " WHERE id = :entity_id AND schvalovatel_id IS NOT NULL
                        UNION
                        SELECT prikazce_id FROM " . TBL_OBJEDNAVKY . " WHERE id = :entity_id AND prikazce_id IS NOT NULL
                    ) as participants
                    WHERE user_id IS NOT NULL
                ");
                $stmt->execute([':entity_id' => $entityId]);
                $participants = $stmt->fetchAll(PDO::FETCH_COLUMN);
                break;
                
            case 'invoices':
                // Faktura: autor + schvalovatel + účetní
                $stmt = $db->prepare("
                    SELECT DISTINCT user_id
                    FROM (
                        SELECT created_by_user_id as user_id FROM " . TBL_FAKTURY . " WHERE id = :entity_id
                        UNION
                        SELECT approver_user_id FROM " . TBL_FAKTURY . " WHERE id = :entity_id AND approver_user_id IS NOT NULL
                        UNION
                        SELECT accountant_user_id FROM " . TBL_FAKTURY . " WHERE id = :entity_id AND accountant_user_id IS NOT NULL
                    ) as participants
                    WHERE user_id IS NOT NULL
                ");
                $stmt->execute([':entity_id' => $entityId]);
                $participants = $stmt->fetchAll(PDO::FETCH_COLUMN);
                break;
                
            case 'cashbook':
                // Pokladna: autor
                $stmt = $db->prepare("
                    SELECT created_by_user_id as user_id 
                    FROM " . TBL_POKLADNI_KNIHA . " 
                    WHERE id = :entity_id
                ");
                $stmt->execute([':entity_id' => $entityId]);
                $participants = $stmt->fetchAll(PDO::FETCH_COLUMN);
                break;
                
            default:
                error_log("[getEntityParticipants] Unknown entity type: $entityType");
        }
        
        error_log("[getEntityParticipants] $entityType #$entityId: " . count($participants) . " participants - " . json_encode($participants));
        
    } catch (Exception $e) {
        error_log("[getEntityParticipants] Error: " . $e->getMessage());
    }
    
    return $participants;
}

/**
 * Aplikuje scope filter na seznam uživatelů
 * 
 * @param PDO $db - Database connection
 * @param array $userIds - Pole user_id k filtrování
 * @param string $scopeFilter - 'NONE', 'ALL', 'LOCATION', 'DEPARTMENT', 'PARTICIPANTS_ALL'
 * @param string $entityType - Typ entity ('orders', 'invoices', ...)
 * @param int $entityId - ID entity
 * @return array - Filtrované pole user_id
 */
function applyScopeFilter($db, $userIds, $scopeFilter, $entityType, $entityId) {
    if (empty($userIds)) {
        return array();
    }
    
    switch ($scopeFilter) {
        case 'NONE':
        case 'ALL':
            // Bez filtru - vrátit všechny
            error_log("[applyScopeFilter] NONE/ALL: " . count($userIds) . " users (no filter)");
            return $userIds;
            
        case 'PARTICIPANTS_ALL':
            // ⭐ VŠICHNI účastníci této konkrétní entity
            $participants = getEntityParticipants($db, $entityType, $entityId);
            $filtered = array_intersect($userIds, $participants);
            error_log("[applyScopeFilter] PARTICIPANTS_ALL: " . count($userIds) . " → " . count($filtered) . " users");
            return array_values($filtered);
            
        case 'PARTICIPANTS_OBJEDNATEL':
            // ✍️ JEN objednatel této entity
            $objednatelId = getEntityField($db, $entityType, $entityId, 'objednatel_id');
            if (!$objednatelId) {
                error_log("[applyScopeFilter] PARTICIPANTS_OBJEDNATEL: No objednatel_id found");
                return array();
            }
            $filtered = array_intersect($userIds, [$objednatelId]);
            error_log("[applyScopeFilter] PARTICIPANTS_OBJEDNATEL: " . count($userIds) . " → " . count($filtered) . " users (objednatel_id=$objednatelId)");
            return array_values($filtered);
            
        case 'PARTICIPANTS_PRIKAZCE':
            // 👤 JEN příkazce této entity
            $prikazceId = getEntityField($db, $entityType, $entityId, 'prikazce_id');
            if (!$prikazceId) {
                error_log("[applyScopeFilter] PARTICIPANTS_PRIKAZCE: No prikazce_id found");
                return array();
            }
            $filtered = array_intersect($userIds, [$prikazceId]);
            error_log("[applyScopeFilter] PARTICIPANTS_PRIKAZCE: " . count($userIds) . " → " . count($filtered) . " users (prikazce_id=$prikazceId)");
            return array_values($filtered);
            
        case 'PARTICIPANTS_GARANT':
            // 🛡️ JEN garant této entity
            $garantId = getEntityField($db, $entityType, $entityId, 'garant_id');
            if (!$garantId) {
                error_log("[applyScopeFilter] PARTICIPANTS_GARANT: No garant_id found");
                return array();
            }
            $filtered = array_intersect($userIds, [$garantId]);
            error_log("[applyScopeFilter] PARTICIPANTS_GARANT: " . count($userIds) . " → " . count($filtered) . " users (garant_id=$garantId)");
            return array_values($filtered);
            
        case 'PARTICIPANTS_SCHVALOVATEL':
            // ✅ JEN schvalovatelé této entity
            $schvalovatelIds = array();
            for ($i = 1; $i <= 5; $i++) {
                $schvalId = getEntityField($db, $entityType, $entityId, "schvalovatel_{$i}_id");
                if ($schvalId) {
                    $schvalovatelIds[] = $schvalId;
                }
            }
            if (empty($schvalovatelIds)) {
                error_log("[applyScopeFilter] PARTICIPANTS_SCHVALOVATEL: No schvalovatelé found");
                return array();
            }
            $filtered = array_intersect($userIds, $schvalovatelIds);
            error_log("[applyScopeFilter] PARTICIPANTS_SCHVALOVATEL: " . count($userIds) . " → " . count($filtered) . " users (schvalovatelIds: " . implode(',', $schvalovatelIds) . ")");
            return array_values($filtered);
            
        case 'LOCATION':
            // Jen z lokality entity
            $entityLocation = getEntityLocation($db, $entityType, $entityId);
            if (!$entityLocation) {
                error_log("[applyScopeFilter] LOCATION: No location found");
                return array();
            }
            
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $stmt = $db->prepare("
                SELECT id FROM " . TBL_UZIVATELE . " 
                WHERE id IN ($placeholders) 
                AND lokalita_id = ?
            ");
            $params = array_merge($userIds, [$entityLocation]);
            $stmt->execute($params);
            $filtered = $stmt->fetchAll(PDO::FETCH_COLUMN);
            error_log("[applyScopeFilter] LOCATION: " . count($userIds) . " → " . count($filtered) . " users (lokalita_id=$entityLocation)");
            return $filtered;
            
        case 'DEPARTMENT':
            // Jen z úseku entity
            $entityDepartment = getEntityDepartment($db, $entityType, $entityId);
            if (!$entityDepartment) {
                error_log("[applyScopeFilter] DEPARTMENT: No department found");
                return array();
            }
            
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $stmt = $db->prepare("
                SELECT id FROM " . TBL_UZIVATELE . " 
                WHERE id IN ($placeholders) 
                AND usek_id = ?
            ");
            $params = array_merge($userIds, [$entityDepartment]);
            $stmt->execute($params);
            $filtered = $stmt->fetchAll(PDO::FETCH_COLUMN);
            error_log("[applyScopeFilter] DEPARTMENT: " . count($userIds) . " → " . count($filtered) . " users (usek_id=$entityDepartment)");
            return $filtered;
            
        default:
            error_log("[applyScopeFilter] Unknown scope filter: $scopeFilter - using no filter");
            return $userIds;
    }
}

/**
 * Univerzální helper pro získání konkrétního fieldu z entity
 * 
 * @param PDO $db
 * @param string $entityType - 'orders', 'invoices', ...
 * @param int $entityId
 * @param string $fieldName - 'objednatel_id', 'prikazce_id', 'garant_id', 'schvalovatel_1_id', ...
 * @return mixed - Hodnota fieldu nebo null
 */
function getEntityField($db, $entityType, $entityId, $fieldName) {
    try {
        switch ($entityType) {
            case 'orders':
                $stmt = $db->prepare("SELECT $fieldName FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                break;
            case 'invoices':
                $stmt = $db->prepare("SELECT $fieldName FROM " . TBL_FAKTURY . " WHERE id = ?");
                break;
            default:
                return null;
        }
        $stmt->execute([$entityId]);
        $value = $stmt->fetchColumn();
        return $value !== false ? $value : null;
    } catch (Exception $e) {
        error_log("[getEntityField] Error getting $fieldName for $entityType $entityId: " . $e->getMessage());
        return null;
    }
}

/**
 * Vrátí location_id entity
 */
function getEntityLocation($db, $entityType, $entityId) {
    try {
        switch ($entityType) {
            case 'orders':
                $stmt = $db->prepare("SELECT lokalita_id FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                break;
            case 'invoices':
                $stmt = $db->prepare("SELECT location_id FROM " . TBL_FAKTURY . " WHERE id = ?");
                break;
            default:
                return null;
        }
        $stmt->execute([$entityId]);
        return $stmt->fetchColumn();
    } catch (Exception $e) {
        error_log("[getEntityLocation] Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Vrátí department_id entity
 */
function getEntityDepartment($db, $entityType, $entityId) {
    try {
        switch ($entityType) {
            case 'orders':
                $stmt = $db->prepare("SELECT usek_id FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                break;
            case 'invoices':
                $stmt = $db->prepare("SELECT department_id FROM " . TBL_FAKTURY . " WHERE id = ?");
                break;
            default:
                return null;
        }
        $stmt->execute([$entityId]);
        return $stmt->fetchColumn();
    } catch (Exception $e) {
        error_log("[getEntityDepartment] Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Resolves recipient user IDs based on recipient_type
 * 
 * @param PDO $db - Database connection
 * @param string $recipientType - 'USER', 'ROLE', 'GROUP', 'TRIGGER_USER', 'ENTITY_AUTHOR', 'ENTITY_OWNER', 'ENTITY_GUARANTOR', 'ENTITY_APPROVER'
 * @param mixed $recipientData - Node data (user_id, role_id, group_id, nebo null pro generic types)
 * @param string $entityType - Typ entity ('orders', 'invoices', ...)
 * @param int $entityId - ID entity
 * @param int $triggerUserId - ID uživatele, který akci provedl
 * @return array - Pole user_id příjemců
 */
function resolveRecipients($db, $recipientType, $recipientData, $entityType, $entityId, $triggerUserId) {
    $recipients = array();
    
    try {
        switch ($recipientType) {
            case 'USER':
                // Konkrétní uživatel
                if (isset($recipientData['userId'])) {
                    $recipients = [$recipientData['userId']];
                } elseif (isset($recipientData['uzivatel_id'])) {
                    $recipients = [$recipientData['uzivatel_id']];
                }
                break;
                
            case 'ROLE':
                // Všichni uživatelé s danou rolí
                $roleId = isset($recipientData['roleId']) ? $recipientData['roleId'] : (isset($recipientData['role_id']) ? $recipientData['role_id'] : null);
                if ($roleId) {
                    $stmt = $db->prepare("
                        SELECT DISTINCT u.id 
                        FROM ".TBL_UZIVATELE." u
                        JOIN ".TBL_UZIVATELE_ROLE." ur ON u.id = ur.uzivatel_id
                        WHERE ur.role_id = ? AND u.aktivni = 1
                    ");
                    $stmt->execute([$roleId]);
                    $recipients = $stmt->fetchAll(PDO::FETCH_COLUMN);
                    error_log("[resolveRecipients] ROLE $roleId: Found " . count($recipients) . " users");
                }
                break;
                
            case 'GROUP':
                // Skupina uživatelů
                $groupId = isset($recipientData['groupId']) ? $recipientData['groupId'] : (isset($recipientData['group_id']) ? $recipientData['group_id'] : null);
                if ($groupId) {
                    $stmt = $db->prepare("
                        SELECT uzivatel_id FROM " . TBL_USER_GROUPS_MEMBERS . " WHERE group_id = ?
                    ");
                    $stmt->execute([$groupId]);
                    $recipients = $stmt->fetchAll(PDO::FETCH_COLUMN);
                }
                break;
                
            case 'TRIGGER_USER':
                // Uživatel, který akci provedl
                if ($triggerUserId) {
                    $recipients = [$triggerUserId];
                }
                break;
                
            case 'ENTITY_AUTHOR':
                // Autor entity (tvůrce objednávky/faktury/...)
                $author = getEntityAuthor($db, $entityType, $entityId);
                if ($author) {
                    $recipients = [$author];
                }
                break;
                
            case 'ENTITY_OWNER':
                // Vlastník/příkazce entity
                $owner = getEntityOwner($db, $entityType, $entityId);
                if ($owner) {
                    $recipients = [$owner];
                }
                break;
                
            case 'ENTITY_GUARANTOR':
                // Garant entity
                $guarantor = getEntityGuarantor($db, $entityType, $entityId);
                if ($guarantor) {
                    $recipients = [$guarantor];
                }
                break;
                
            case 'ENTITY_APPROVER':
                // Schvalovatel entity
                $approver = getEntityApprover($db, $entityType, $entityId);
                if ($approver) {
                    $recipients = [$approver];
                }
                break;
                
            default:
                error_log("[resolveRecipients] Unknown recipient type: $recipientType");
        }
        
        error_log("[resolveRecipients] $recipientType: " . count($recipients) . " recipients");
        
    } catch (Exception $e) {
        error_log("[resolveRecipients] Error: " . $e->getMessage());
    }
    
    return $recipients;
}

/**
 * Helper funkce pro získání autora entity
 */
function getEntityAuthor($db, $entityType, $entityId) {
    try {
        switch ($entityType) {
            case 'orders':
                $stmt = $db->prepare("SELECT uzivatel_id FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                break;
            case 'invoices':
                $stmt = $db->prepare("SELECT created_by_user_id FROM " . TBL_FAKTURY . " WHERE id = ?");
                break;
            case 'cashbook':
                $stmt = $db->prepare("SELECT created_by_user_id FROM " . TBL_POKLADNI_KNIHA . " WHERE id = ?");
                break;
            default:
                return null;
        }
        $stmt->execute([$entityId]);
        return $stmt->fetchColumn();
    } catch (Exception $e) {
        error_log("[getEntityAuthor] Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Helper funkce pro získání vlastníka/příkazce entity
 */
function getEntityOwner($db, $entityType, $entityId) {
    try {
        switch ($entityType) {
            case 'orders':
                $stmt = $db->prepare("SELECT prikazce_uzivatel_id FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                break;
            default:
                return null;
        }
        $stmt->execute([$entityId]);
        return $stmt->fetchColumn();
    } catch (Exception $e) {
        error_log("[getEntityOwner] Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Helper funkce pro získání garanta entity
 */
function getEntityGuarantor($db, $entityType, $entityId) {
    try {
        switch ($entityType) {
            case 'orders':
                $stmt = $db->prepare("SELECT garant_uzivatel_id FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                break;
            default:
                return null;
        }
        $stmt->execute([$entityId]);
        return $stmt->fetchColumn();
    } catch (Exception $e) {
        error_log("[getEntityGuarantor] Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Helper funkce pro získání schvalovatele entity
 */
function getEntityApprover($db, $entityType, $entityId) {
    try {
        switch ($entityType) {
            case 'orders':
                $stmt = $db->prepare("SELECT schvalovatel_uzivatel_id FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                break;
            case 'invoices':
                $stmt = $db->prepare("SELECT approver_user_id FROM " . TBL_FAKTURY . " WHERE id = ?");
                break;
            default:
                return null;
        }
        $stmt->execute([$entityId]);
        return $stmt->fetchColumn();
    } catch (Exception $e) {
        error_log("[getEntityApprover] Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Hlavní router pro automatické odesílání notifikací při událostech
 * Použití: notificationRouter($db, 'ORDER_SENT_FOR_APPROVAL', $orderId, $userId, ['order_number' => 'O-2025-142', ...])
 * 
 * @param PDO $db - Database connection
 * @param string $eventType - Event typ code (ORDER_SENT_FOR_APPROVAL, ORDER_APPROVED, etc.)
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
    
    error_log("");
    error_log("╔════════════════════════════════════════════════════════════════╗");
    error_log("║  🎯 NOTIFICATION ROUTER - Processing Trigger                   ║");
    error_log("╠════════════════════════════════════════════════════════════════╣");
    error_log("║  Event:     " . str_pad($eventType, 50) . "║");
    error_log("║  Object:    " . str_pad($objectId, 50) . "║");
    error_log("║  User:      " . str_pad($triggerUserId, 50) . "║");
    error_log("║  Frontend:  " . str_pad(count($placeholderData) . " placeholders", 50) . "║");
    error_log("╚════════════════════════════════════════════════════════════════╝");
    error_log("");
    
    // DEBUG do DB - START
    try {
        $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
        $stmt->execute(['notificationRouter START', json_encode([
            'event' => $eventType,
            'object_id' => $objectId,
            'trigger_user' => $triggerUserId,
            'placeholder_count' => count($placeholderData)
        ])]);
    } catch (Exception $e) {
        error_log("DEBUG LOG FAILED: " . $e->getMessage());
    }
    
    try {
        // 0. Načíst entity data z DB a mergovat s frontend placeholders
        error_log("🔍 [NotificationRouter] Getting object type...");
        
        // DEBUG do DB
        try {
            $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
            $stmt->execute(['Before getObjectTypeFromEvent', json_encode(['event' => $eventType])]);
        } catch (Exception $e) {}
        
        $objectType = getObjectTypeFromEvent($eventType);
        error_log("✅ [NotificationRouter] Object type: $objectType");
        
        // DEBUG do DB
        try {
            $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
            $stmt->execute(['After getObjectTypeFromEvent', json_encode(['objectType' => $objectType])]);
        } catch (Exception $e) {}
        
        // ✅ OPRAVA: Načíst placeholders pro VŠECHNY typy objektů
        if ($objectType === 'orders') {
            // DEBUG do DB
            try {
                $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                $stmt->execute(['Before loadOrderPlaceholders', json_encode(['object_id' => $objectId])]);
            } catch (Exception $e) {}
            
            $dbPlaceholders = loadOrderPlaceholders($db, $objectId, $triggerUserId);
            error_log("📊 [NotificationRouter] DB placeholders loaded: " . count($dbPlaceholders) . " keys");
            if (!empty($dbPlaceholders)) {
                error_log("   Keys: " . implode(', ', array_keys($dbPlaceholders)));
            }
            
            // DEBUG do DB
            try {
                $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                $stmt->execute(['After loadOrderPlaceholders', json_encode([
                    'count' => count($dbPlaceholders),
                    'keys' => array_keys($dbPlaceholders)
                ])]);
            } catch (Exception $e) {}
        } elseif ($objectType === 'invoices') {
            // Načti placeholders pro faktury
            $dbPlaceholders = loadInvoicePlaceholders($db, $objectId, $triggerUserId);
            error_log("📊 [NotificationRouter] Invoice placeholders loaded: " . count($dbPlaceholders) . " keys");
        } elseif ($objectType === 'cashbook') {
            // Načti placeholders pro pokladnu
            $dbPlaceholders = loadCashbookPlaceholders($db, $objectId, $triggerUserId);
            error_log("📊 [NotificationRouter] Cashbook placeholders loaded: " . count($dbPlaceholders) . " keys");
        } else {
            $dbPlaceholders = array();
            error_log("⚠️ [NotificationRouter] No placeholder loader for object type: $objectType");
        }
        
        // Merguj: frontend data mají prioritu, ale DB data doplní chybějící
        $placeholderData = array_merge($dbPlaceholders, $placeholderData);
        error_log("✅ [NotificationRouter] Merged placeholders: " . count($placeholderData) . " keys total");
        
        // 1. Najít příjemce podle organizational hierarchy
        error_log("🔍 [NotificationRouter] Hledám příjemce v org. hierarchii...");
        
        // DEBUG do DB
        try {
            $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
            $stmt->execute(['Before findNotificationRecipients', json_encode([
                'event' => $eventType,
                'object_id' => $objectId,
                'trigger_user' => $triggerUserId
            ])]);
        } catch (Exception $e) {}
        
        $recipients = findNotificationRecipients($db, $eventType, $objectId, $triggerUserId, $placeholderData);
        
        // DEBUG do DB
        try {
            $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
            $stmt->execute(['After findNotificationRecipients', json_encode([
                'count' => count($recipients),
                'recipients' => array_map(function($r) {
                    return ['user_id' => $r['uzivatel_id'], 'role' => $r['recipientRole']];
                }, $recipients)
            ])]);
        } catch (Exception $e) {}
        
        if (empty($recipients)) {
            error_log("❌ [NotificationRouter] Žádní příjemci nenalezeni pro event $eventType, object $objectId");
            error_log("   → Zkontrolujte, zda existuje pravidlo v organizační hierarchii pro tento event type");
            
            // DEBUG do DB
            try {
                $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                $stmt->execute(['NO RECIPIENTS FOUND', json_encode(['event' => $eventType, 'object_id' => $objectId])]);
            } catch (Exception $e) {}
            
            return $result;
        }
        
        error_log("✅ [NotificationRouter] Nalezeno " . count($recipients) . " příjemců:");
        foreach ($recipients as $idx => $r) {
            error_log("   Příjemce #" . ($idx+1) . ": User ID={$r['uzivatel_id']}, Role={$r['recipientRole']}, Email=" . ($r['sendEmail'] ? 'ANO' : 'NE') . ", InApp=" . ($r['sendInApp'] ? 'ANO' : 'NE'));
        }
        
        // 2. Pro každého příjemce najít template a odeslat notifikaci
        foreach ($recipients as $recipient) {
            // DEBUG do DB - START recipient loop
            try {
                $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                $stmt_debug->execute(['Recipient loop START', json_encode([
                    'user_id' => $recipient['uzivatel_id'],
                    'role' => $recipient['recipientRole'],
                    'template_id' => $recipient['templateId']
                ])]);
            } catch (Exception $e) {}
            
            try {
                // $recipient obsahuje:
                // - uzivatel_id
                // - recipientRole (EXCEPTIONAL, APPROVAL, INFO)
                // - sendEmail (bool)
                // - sendInApp (bool)
                // - templateId
                // - templateVariant (normalVariant, urgentVariant, infoVariant)
                
                // 3. Načíst template z DB
                $stmt = $db->prepare("
                    SELECT * FROM " . TBL_NOTIFIKACE_SABLONY . " 
                    WHERE id = :template_id AND aktivni = 1
                ");
                $stmt->execute([':template_id' => $recipient['templateId']]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // DEBUG do DB
                try {
                    $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                    $stmt_debug->execute(['After template fetch', json_encode([
                        'found' => $template ? true : false,
                        'template_id' => $recipient['templateId']
                    ])]);
                } catch (Exception $e) {}
                
                if (!$template) {
                    error_log("   ❌ Template {$recipient['templateId']} NOT FOUND or inactive");
                    $result['errors'][] = "Template {$recipient['templateId']} not found";
                    continue;
                }
                
                // ✅ VALIDACE: Zkontrolovat že template má email_telo pokud má poslat email
                if ($recipient['sendEmail'] && empty($template['email_telo'])) {
                    error_log("   ⚠️ Template {$recipient['templateId']} has NO email_telo, disabling email for user {$recipient['uzivatel_id']}");
                    $recipient['sendEmail'] = false;
                    
                    // Pokud ani in-app není zapnuté, přeskoč
                    if (!$recipient['sendInApp']) {
                        error_log("   ⚠️ User {$recipient['uzivatel_id']}: no channels available, skipping");
                        continue;
                    }
                }
                
                // 4. Vybrat správnou variantu podle recipientRole
                $variant = $recipient['templateVariant'];
                
                // 🔍 DEBUG: Co máme PŘED nahrazením
                error_log("   🔍 DEBUG před replacePlaceholders:");
                error_log("      Template nadpis: " . $template['app_nadpis']);
                error_log("      Template zprava: " . substr($template['app_zprava'], 0, 100));
                error_log("      Placeholders: " . json_encode($placeholderData));
                
                // DEBUG do DB
                try {
                    $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                    $stmt_debug->execute(['Before replacePlaceholders', json_encode([
                        'user_id' => $recipient['uzivatel_id'],
                        'placeholder_count' => count($placeholderData)
                    ])]);
                } catch (Exception $e) {}
                
                // 5. Načíst jméno příjemce a doplnit do placeholderů
                $stmt_user = $db->prepare("SELECT jmeno, prijmeni FROM " . TBL_UZIVATELE . " WHERE id = :user_id");
                $stmt_user->execute([':user_id' => $recipient['uzivatel_id']]);
                $user_data = $stmt_user->fetch(PDO::FETCH_ASSOC);
                
                $placeholderDataWithUser = $placeholderData;
                // ✅ OPRAVA: Použít recipient_name místo user_name pro univerzální oslovení
                $recipientFullName = $user_data ? trim($user_data['jmeno'] . ' ' . $user_data['prijmeni']) : 'Uživatel';
                $placeholderDataWithUser['recipient_name'] = $recipientFullName;
                $placeholderDataWithUser['user_name'] = $recipientFullName; // Backward compatibility
                
                // ✅ IKONA podle recipientRole a urgentnosti
                if ($recipient['recipientRole'] === 'EXCEPTIONAL') {
                    // Urgentní schválení - maják
                    $placeholderDataWithUser['action_icon'] = '🚨';
                } elseif ($recipient['recipientRole'] === 'APPROVAL') {
                    // Normální schválení - vykřičník
                    $placeholderDataWithUser['action_icon'] = '❗';
                } else {
                    // INFO - zelené kolečko s "i"
                    $placeholderDataWithUser['action_icon'] = 'ℹ️';
                }
                
                // 🔍 DEBUG: Vypsat VŠECHNY placeholdery před nahrazením
                error_log("   🔍 FINANCOVÁNÍ DEBUG pro User {$recipient['uzivatel_id']}:");
                error_log("      financovani value: " . ($placeholderDataWithUser['financovani'] ?? 'NOT SET'));
                error_log("      All placeholders: " . json_encode($placeholderDataWithUser, JSON_UNESCAPED_UNICODE));
                
                // 6. Nahradit placeholdery v šabloně
                $processedTitle = replacePlaceholders($template['app_nadpis'], $placeholderDataWithUser);
                $processedMessage = replacePlaceholders($template['app_zprava'], $placeholderDataWithUser);
                
                // 🔍 DEBUG: Před extrakcí varianty
                error_log("   🔍 DEBUG BEFORE extractVariantFromEmailBody:");
                error_log("      Variant to extract: '$variant'");
                error_log("      Email body length: " . strlen($template['email_telo']));
                error_log("      Email body starts with: " . substr($template['email_telo'], 0, 100));
                error_log("      Looking for marker: '<!-- RECIPIENT: $variant -->'");
                
                $processedEmailBody = extractVariantFromEmailBody($template['email_telo'], $variant);
                
                // 🔍 DEBUG: Po extrakci varianty
                error_log("   🔍 DEBUG AFTER extractVariantFromEmailBody:");
                error_log("      Extracted length: " . strlen($processedEmailBody));
                error_log("      Extracted starts with: " . substr($processedEmailBody, 0, 100));
                
                $processedEmailBody = replacePlaceholders($processedEmailBody, $placeholderDataWithUser);
                
                // 🔍 DEBUG: Zkontrolovat jestli se financování nahradilo
                error_log("   🔍 EMAIL BODY AFTER replacePlaceholders (first 500 chars):");
                error_log("      " . substr($processedEmailBody, 0, 500));
                
                // ✅ OPRAVA: Logování pro debugging placeholder problems
                error_log("   📝 Placeholder replacement for User {$recipient['uzivatel_id']}:");
                error_log("      Title AFTER: " . $processedTitle);
                error_log("      Message AFTER: " . substr($processedMessage, 0, 150));
                
                // DEBUG do DB
                try {
                    $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                    $stmt_debug->execute(['After replacePlaceholders', json_encode([
                        'user_id' => $recipient['uzivatel_id'],
                        'title_length' => strlen($processedTitle),
                        'message_length' => strlen($processedMessage)
                    ])]);
                } catch (Exception $e) {}
                
                // 6. Připravit data pro notifikaci
                $notificationData = array(
                    'event_type' => $eventType,
                    'object_id' => $objectId,
                    'order_id' => $objectId,  // ✅ OPRAVA: Frontend očekává order_id pro navigaci!
                    'recipient_role' => $recipient['recipientRole'],
                    'template_id' => $recipient['templateId'],
                    'template_variant' => $variant,
                    'placeholders' => $placeholderDataWithUser  // ✅ OPRAVENO: Použít placeholders včetně recipient_name a action_performed_by
                );
                
                // 7. Vytvořit in-app notifikaci
                if ($recipient['sendInApp']) {
                    $params = array(
                        ':typ' => $eventType,  // ✅ OPRAVA: Musí být eventType (order_status_ke_schvaleni), ne 'user'! Frontend filtruje notification.typ.includes('order')
                        ':nadpis' => $processedTitle,
                        ':zprava' => $processedMessage,
                        ':data_json' => json_encode($notificationData),
                        ':od_uzivatele_id' => $triggerUserId,  // ✅ Autor akce (user_id=100)
                        ':pro_uzivatele_id' => $recipient['uzivatel_id'],
                        ':prijemci_json' => null,
                        ':pro_vsechny' => 0,
                        ':priorita' => mapRecipientRoleToPriority($recipient['recipientRole']), // ✅ MAP: AUTHOR_INFO/GUARANTOR_INFO → INFO
                        ':kategorie' => 'general',
                        ':odeslat_email' => $recipient['sendEmail'] ? 1 : 0,
                        ':objekt_typ' => getObjectTypeFromEvent($eventType),
                        ':objekt_id' => $objectId,
                        ':dt_expires' => null,
                        ':dt_created' => TimezoneHelper::getCzechDateTime(),
                        ':aktivni' => 1
                    );
                    
                    // DEBUG do DB - před createNotification
                    try {
                        $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                        $stmt_debug->execute(['Before createNotification', json_encode([
                            'user_id' => $recipient['uzivatel_id'],
                            'params_keys' => array_keys($params)
                        ])]);
                    } catch (Exception $e) {}
                    
                    createNotification($db, $params);
                    
                    // DEBUG do DB - po createNotification
                    try {
                        $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                        $stmt_debug->execute(['After createNotification SUCCESS', json_encode([
                            'user_id' => $recipient['uzivatel_id']
                        ])]);
                    } catch (Exception $e) {}
                    
                    $result['sent']++;
                }
                
                // 8. Odeslat email (pokud je povolený)
                // DEBUG do DB - kontrola sendEmail flag
                try {
                    $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                    $stmt_debug->execute(['Before email check', json_encode([
                        'user_id' => $recipient['uzivatel_id'],
                        'sendEmail' => $recipient['sendEmail'],
                        'sendEmail_type' => gettype($recipient['sendEmail'])
                    ])]);
                } catch (Exception $e) {}
                
                if ($recipient['sendEmail']) {
                    // DEBUG do DB
                    try {
                        $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                        $stmt_debug->execute(['Calling sendNotificationEmail', json_encode([
                            'user_id' => $recipient['uzivatel_id']
                        ])]);
                    } catch (Exception $e) {}
                    
                    $emailResult = sendNotificationEmail($db, $recipient['uzivatel_id'], $processedTitle, $processedEmailBody);
                    
                    // DEBUG do DB
                    try {
                        $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                        $stmt_debug->execute(['After sendNotificationEmail', json_encode([
                            'user_id' => $recipient['uzivatel_id'],
                            'result' => $emailResult
                        ])]);
                    } catch (Exception $e) {}
                    
                    if (!$emailResult['ok']) {
                        $result['errors'][] = "Email failed for user {$recipient['uzivatel_id']}: " . ($emailResult['error'] ?? 'Unknown error');
                    }
                } else {
                    // DEBUG do DB - email byl vypnutý
                    try {
                        $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                        $stmt_debug->execute(['Email SKIPPED', json_encode([
                            'user_id' => $recipient['uzivatel_id'],
                            'reason' => 'sendEmail = false'
                        ])]);
                    } catch (Exception $e) {}
                }
                
            } catch (Exception $e) {
                $result['errors'][] = "Error sending to user {$recipient['uzivatel_id']}: " . $e->getMessage();
                error_log("[NotificationRouter] Error sending to user {$recipient['uzivatel_id']}: " . $e->getMessage());
            }
        }
        
        $result['success'] = ($result['sent'] > 0);
        
        // ═══════════════════════════════════════════════════════════════════
        // FINÁLNÍ SHRNUTÍ
        // ═══════════════════════════════════════════════════════════════════
        error_log("");
        error_log("╔══════════════════════════════════════════════════════════════╗");
        error_log("║  🎯 NOTIFICATION ROUTER - FINAL SUMMARY                      ║");
        error_log("╠══════════════════════════════════════════════════════════════╣");
        error_log("║  Event:              " . str_pad($eventType, 38) . "║");
        error_log("║  Object ID:          " . str_pad($objectId, 38) . "║");
        error_log("║  Recipients Found:   " . str_pad(count($recipients), 38) . "║");
        error_log("║  Notifications Sent: " . str_pad($result['sent'], 38) . "║");
        error_log("║  Errors:             " . str_pad(count($result['errors']), 38) . "║");
        
        if ($result['success']) {
            error_log("║                                                              ║");
            error_log("║  ✅ ✅ ✅  SUCCESS - Notifications sent successfully!         ║");
        } else {
            error_log("║                                                              ║");
            error_log("║  ❌ FAILED - No notifications sent!                          ║");
        }
        
        error_log("╚══════════════════════════════════════════════════════════════╝");
        error_log("");
        
    } catch (Exception $e) {
        $result['errors'][] = $e->getMessage();
        error_log("❌ [NotificationRouter] Exception: " . $e->getMessage());
        error_log("");
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
 * @param array $placeholderData - Placeholder data (obsahuje is_urgent flag)
 * @return array - Pole příjemců s config
 */
function findNotificationRecipients($db, $eventType, $objectId, $triggerUserId, $placeholderData = array()) {
    $recipients = array();
    
    error_log("");
    error_log("┌──────────────────────────────────────────────────────────────┐");
    error_log("│  📊 ORGANIZATIONAL HIERARCHY - Finding Recipients             │");
    error_log("├──────────────────────────────────────────────────────────────┤");
    error_log("│  Event Type:   " . str_pad($eventType, 46) . "│");
    error_log("│  Object ID:    " . str_pad($objectId, 46) . "│");
    error_log("│  Trigger User: " . str_pad($triggerUserId, 46) . "│");
    error_log("└──────────────────────────────────────────────────────────────┘");
    error_log("");
    
    try {
        // 1. Najít aktivní profil hierarchie
        error_log("   🔍 Hledám aktivní hierarchický profil...");
        $stmt = $db->prepare("
            SELECT id, structure_json 
            FROM " . TBL_HIERARCHIE_PROFILY . " 
            WHERE aktivni = 1 
            LIMIT 1
        ");
        $stmt->execute();
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$profile) {
            error_log("❌ ❌ ❌ ŽÁDNÝ AKTIVNÍ HIERARCHICKÝ PROFIL NENALEZEN!");
            error_log("");
            return $recipients;
        }
        
        error_log("✅ Nalezen aktivní profil: ID={$profile['id']}");
        
        $structure = json_decode($profile['structure_json'], true);
        if (!$structure) {
            error_log("❌ Neplatný JSON ve structure_json");
            error_log("");
            return $recipients;
        }
        
        error_log("📊 Hierarchie: " . count($structure['nodes']) . " nodes, " . count($structure['edges']) . " edges");
        
        // Určit object type z event type
        $objectType = getObjectTypeFromEvent($eventType);
        error_log("📦 Object type: $objectType");
        error_log("");
        
        // 2. Najít TEMPLATE nodes s tímto event typem
        error_log("🔍 Hledám templates s event typem '$eventType'...");
        $matchingTemplates = 0;
        
        foreach ($structure['nodes'] as $node) {
            if ($node['typ'] !== 'template') continue;
            
            $eventTypes = isset($node['data']['eventTypes']) ? $node['data']['eventTypes'] : array();
            
            // Pokud tento template nemá náš eventType, přeskoč
            if (!in_array($eventType, $eventTypes)) continue;
            
            $matchingTemplates++;
            error_log("");
            error_log("   ✅ MATCH! Template: '{$node['data']['name']}'");
            error_log("      ↪ Event: '$eventType'");
            
            // 3. Najít všechny EDGES vedoucí z tohoto template
            $edgeCount = 0;
            
            foreach ($structure['edges'] as $edge) {
                if ($edge['source'] !== $node['id']) continue;
                
                $edgeCount++;
                error_log("         Edge #{$edgeCount}: {$edge['id']}");
                
                // ════════════════════════════════════════════════════════════
                // GENERIC RECIPIENT SYSTEM - NOVÁ LOGIKA
                // ════════════════════════════════════════════════════════════
                
                // Načíst recipient_type a scope_filter z edge.data
                $recipientType = isset($edge['data']['recipient_type']) ? $edge['data']['recipient_type'] : 'USER';
                $scopeFilter = isset($edge['data']['scope_filter']) ? $edge['data']['scope_filter'] : 'NONE';
                $recipientRole = isset($edge['data']['recipientRole']) ? $edge['data']['recipientRole'] : 'INFO';
                $sendEmail = isset($edge['data']['sendEmail']) ? (bool)$edge['data']['sendEmail'] : false;
                $sendInApp = isset($edge['data']['sendInApp']) ? (bool)$edge['data']['sendInApp'] : true;
                
                // ✅ URGENTNÍ UDÁLOSTI: Pokud má objednávka zaškrtnutou mimořádnou událost (is_urgent=true) a recipientRole=APPROVAL → změnit na EXCEPTIONAL
                $isUrgent = isset($placeholderData['is_urgent']) ? (bool)$placeholderData['is_urgent'] : false;
                if ($isUrgent && $recipientRole === 'APPROVAL') {
                    $recipientRole = 'EXCEPTIONAL';
                    error_log("         🚨 Objednávka má mimořádnou událost (is_urgent=true) → změna role APPROVAL → EXCEPTIONAL");
                }
                
                error_log("         → recipient_type=$recipientType, scope_filter=$scopeFilter, recipientRole=$recipientRole");
                error_log("         → sendEmail=" . ($sendEmail ? 'ANO' : 'NE') . ", sendInApp=" . ($sendInApp ? 'ANO' : 'NE'));
                
                // 4. Najít target node
                $targetNodeId = $edge['target'];
                $targetNode = null;
                foreach ($structure['nodes'] as $n) {
                    if ($n['id'] === $targetNodeId) {
                        $targetNode = $n;
                        break;
                    }
                }
                
                if (!$targetNode) {
                    error_log("         ❌ Target node nenalezen: $targetNodeId");
                    continue;
                }
                
                error_log("         ✅ Target node: type={$targetNode['typ']}, name=" . ($targetNode['data']['name'] ?? 'N/A'));
                
                // 5. RESOLVE RECIPIENTS - použij novou Generic funkci
                $recipientData = $targetNode['data'] ?? array();
                $targetUserIds = resolveRecipients($db, $recipientType, $recipientData, $objectType, $objectId, $triggerUserId);
                
                if (empty($targetUserIds)) {
                    error_log("         ❌ Žádní příjemci po resolve");
                    continue;
                }
                
                error_log("         → Resolved " . count($targetUserIds) . " recipients: " . implode(', ', $targetUserIds));
                
                // 6. APPLY SCOPE FILTER
                $targetUserIds = applyScopeFilter($db, $targetUserIds, $scopeFilter, $objectType, $objectId);
                
                if (empty($targetUserIds)) {
                    error_log("         ❌ Žádní příjemci po scope filter");
                    continue;
                }
                
                error_log("         → After scope filter: " . count($targetUserIds) . " recipients");
                
                // 7. Načíst data entity jednou pro všechny (potřeba pro source_info_recipients)
                $entityData = null;
                if ($objectType === 'orders') {
                    $stmt = $db->prepare("SELECT uzivatel_id, garant_uzivatel_id, objednatel_id, schvalovatel_id, prikazce_id FROM " . TBL_OBJEDNAVKY . " WHERE id = ?");
                    $stmt->execute([$objectId]);
                    $entityData = $stmt->fetch(PDO::FETCH_ASSOC);
                }
                
                // 8. Určit variantu šablony podle recipientRole (OPRAVENO: názvy variant odpovídají HTML markerům)
                $variant = 'APPROVER_NORMAL'; // default
                
                if ($recipientRole === 'EXCEPTIONAL') {
                    // ✅ OPRAVA: Zkontrolovat že není prázdný string!
                    $variant = (!empty($node['data']['urgentVariant'])) ? $node['data']['urgentVariant'] : 'APPROVER_URGENT';
                } elseif ($recipientRole === 'INFO' || $recipientRole === 'AUTHOR_INFO' || $recipientRole === 'GUARANTOR_INFO') {
                    // ✅ OPRAVA: Zkontrolovat že není prázdný string!
                    $variant = (!empty($node['data']['infoVariant'])) ? $node['data']['infoVariant'] : 'SUBMITTER';
                } else {
                    // ✅ OPRAVA: Zkontrolovat že není prázdný string!
                    $variant = (!empty($node['data']['normalVariant'])) ? $node['data']['normalVariant'] : 'APPROVER_NORMAL';
                }
                
                error_log("         → Template variant: $variant");
                
                // ✅ VALIDACE: Zkontrolovat že template node má templateId
                $templateId = isset($node['data']['templateId']) ? $node['data']['templateId'] : null;
                
                if (!$templateId) {
                    error_log("         ❌ Template node '{$node['data']['name']}' has NO templateId! Skipping edge.");
                    continue;
                }
                
                // 8. Přidat každého target user do seznamu příjemců
                foreach ($targetUserIds as $userId) {
                    // Kontrola uživatelských preferencí
                    $userPrefs = getUserNotificationPreferences($db, $userId);
                    
                    if (!$userPrefs['enabled']) {
                        error_log("         ⚠️ User $userId: notifications disabled globally");
                        continue;
                    }
                    
                    // Aplikovat uživatelské preference
                    $sendEmailFinal = $sendEmail;
                    $sendInAppFinal = $sendInApp;
                    
                    if (!$userPrefs['email_enabled']) {
                        $sendEmailFinal = false;
                        error_log("         → User $userId: email disabled by user prefs");
                    }
                    if (!$userPrefs['inapp_enabled']) {
                        $sendInAppFinal = false;
                        error_log("         → User $userId: inapp disabled by user prefs");
                    }
                    
                    // Kontrola kategorie
                    $kategorie = getObjectTypeFromEvent($eventType);
                    if (isset($userPrefs['categories'][$kategorie]) && !$userPrefs['categories'][$kategorie]) {
                        error_log("         ⚠️ User $userId: kategorie '$kategorie' disabled");
                        continue;
                    }
                    
                    // Pokud oba kanály vypnuté, přeskoč
                    if (!$sendEmailFinal && !$sendInAppFinal) {
                        error_log("         ⚠️ User $userId: both channels disabled");
                        continue;
                    }
                    
                    // ✅ OPRAVA: Určit roli podle KONKRÉTNÍHO přiřazení v objednávce
                    // Pokud má org hierarchie roli APPROVAL/EXCEPTIONAL (schvalovatel),
                    // ale v TÉTO objednávce je garant/objednatel (ne schvalovatel),
                    // změnit na INFO (zelená) místo APPROVER (oranžová)
                    $finalRecipientRole = $recipientRole;
                    $finalVariant = $variant;
                    
                    if ($objectType === 'orders' && !empty($entityData)) {
                        $isActualApprover = false;
                        
                        // Je tento user OPRAVDU schvalovatel TÉTO objednávky?
                        if (!empty($entityData['schvalovatel_id']) && $entityData['schvalovatel_id'] == $userId) {
                            $isActualApprover = true;
                        } elseif (!empty($entityData['prikazce_id']) && $entityData['prikazce_id'] == $userId) {
                            $isActualApprover = true;
                        }
                        
                        // Je garant nebo objednatel TÉTO objednávky?
                        $isGarant = !empty($entityData['garant_uzivatel_id']) && $entityData['garant_uzivatel_id'] == $userId;
                        $isObjednatel = !empty($entityData['objednatel_id']) && $entityData['objednatel_id'] == $userId;
                        $isAuthor = !empty($entityData['uzivatel_id']) && $entityData['uzivatel_id'] == $userId;
                        
                        // Pokud má být APPROVER, ale není skutečný schvalovatel této objednávky
                        if (($recipientRole === 'APPROVAL' || $recipientRole === 'EXCEPTIONAL') && !$isActualApprover) {
                            // Pokud je garant/objednatel/autor → změnit na INFO
                            if ($isGarant || $isObjednatel || $isAuthor) {
                                $finalRecipientRole = 'INFO';
                                $finalVariant = !empty($node['data']['infoVariant']) ? $node['data']['infoVariant'] : 'SUBMITTER';
                                error_log("         🔄 User $userId: Changed from $recipientRole to INFO (is garant/objednatel in THIS order, not actual approver)");
                            }
                        }
                    }
                    
                    // ✅ DEDUPLIKACE: Zkontrolovat, zda už není v seznamu se STEJNOU rolí
                    // Pokud je už přidán se STEJNOU rolí → přeskočit (duplicita)
                    // Pokud je přidán s JINOU rolí → přidat (např. INFO + APPROVER)
                    $isDuplicate = false;
                    foreach ($recipients as $existingRecipient) {
                        if ($existingRecipient['uzivatel_id'] == $userId &&
                            $existingRecipient['templateId'] == $templateId &&
                            $existingRecipient['recipientRole'] == $finalRecipientRole) {
                            $isDuplicate = true;
                            error_log("         ⚠️ User $userId: Already in recipients with same role ($finalRecipientRole) - skipping duplicate");
                            break;
                        }
                    }
                    
                    if ($isDuplicate) {
                        continue; // Přeskočit duplicitu se stejnou rolí
                    }
                    
                    $recipients[] = array(
                        'uzivatel_id' => $userId,
                        'recipientRole' => $finalRecipientRole,
                        'sendEmail' => $sendEmailFinal,
                        'sendInApp' => $sendInAppFinal,
                        'templateId' => $templateId,
                        'templateVariant' => $finalVariant
                    );
                    
                    error_log("         ✅ User $userId: Added to recipients (role=$finalRecipientRole, email=" . ($sendEmailFinal ? 'YES' : 'NO') . ", inapp=" . ($sendInAppFinal ? 'YES' : 'NO') . ")");
                    
                    // DEBUG do DB
                    try {
                        $stmt_debug = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                        $stmt_debug->execute(['Recipient added', json_encode([
                            'user_id' => $userId,
                            'role' => $recipientRole,
                            'sendEmail' => $sendEmailFinal,
                            'sendInApp' => $sendInAppFinal,
                            'templateId' => $templateId,
                            'variant' => $variant
                        ])]);
                    } catch (Exception $e) {}
                }
                
                // 9. 🆕 Přidat tvůrce notifikace (source účastníky) s INFO prioritou
                // Tito dostanou notifikaci BEZ OHLEDU na NODE filtr (roli)
                if ($objectType === 'orders' && !empty($entityData)) {
                    // Kontrola, zda je zapnuto odesílání INFO tvůrcům
                    $sourceInfoEnabled = isset($edge['data']['source_info_recipients']['enabled'])
                        ? (bool)$edge['data']['source_info_recipients']['enabled']
                        : true;  // Default: zapnuto pro zpětnou kompatibilitu
                    
                    if (!$sourceInfoEnabled) {
                        error_log("         ⚠️ Source INFO recipients vypnuto v EDGE konfiguraci");
                    } else {
                        error_log("         🔄 Přidávám source účastníky (tvůrce notifikace) s INFO prioritou...");
                        
                        // Pokud není definováno pole 'fields', použij default seznam
                        $defaultFields = ['uzivatel_id', 'garant_uzivatel_id', 'objednatel_id'];
                        $selectedFields = isset($edge['data']['source_info_recipients']['fields'])
                            ? $edge['data']['source_info_recipients']['fields']
                            : $defaultFields;
                        
                        error_log("         → Selected fields: " . implode(', ', $selectedFields));
                        
                        $sourceParticipants = array();
                        foreach ($selectedFields as $field) {
                            if (!empty($entityData[$field])) {  // NULL se automaticky přeskočí
                                $sourceParticipants[] = $entityData[$field];
                            }
                        }
                        
                        $sourceParticipants = array_unique($sourceParticipants);  // Odstranit duplicity
                        
                        // Získat INFO variantu z NODE (OPRAVENO: default na SUBMITTER)
                        $infoVariantName = !empty($node['data']['infoVariant']) ? $node['data']['infoVariant'] : 'SUBMITTER';
                        
                        foreach ($sourceParticipants as $sourceUserId) {
                            // Zkontrolovat, zda už není v seznamu (z NODE filtru)
                            $alreadyAdded = false;
                            foreach ($recipients as $existingRecipient) {
                                if ($existingRecipient['uzivatel_id'] == $sourceUserId &&
                                    $existingRecipient['templateId'] == $templateId) {
                                    $alreadyAdded = true;
                                    break;
                                }
                            }
                            
                            if ($alreadyAdded) {
                                error_log("         → User $sourceUserId už je v seznamu (z NODE filtru)");
                                continue;
                            }
                            
                            // Kontrola uživatelských preferencí
                            $userPrefs = getUserNotificationPreferences($db, $sourceUserId);
                            
                            if (!$userPrefs['enabled']) {
                                error_log("         → User $sourceUserId: notifications disabled globally");
                                continue;
                            }
                            
                            $sendEmailInfo = $sendEmail;
                            $sendInAppInfo = $sendInApp;
                            
                            if (!$userPrefs['email_enabled']) {
                                $sendEmailInfo = false;
                            }
                            if (!$userPrefs['inapp_enabled']) {
                                $sendInAppInfo = false;
                            }
                            
                            // Kontrola kategorie
                            $kategorie = getObjectTypeFromEvent($eventType);
                            if (isset($userPrefs['categories'][$kategorie]) && !$userPrefs['categories'][$kategorie]) {
                                error_log("         → User $sourceUserId: kategorie '$kategorie' disabled");
                                continue;
                            }
                            
                            if (!$sendEmailInfo && !$sendInAppInfo) {
                                error_log("         → User $sourceUserId: both channels disabled");
                                continue;
                            }
                            
                            $recipients[] = array(
                                'uzivatel_id' => $sourceUserId,
                                'recipientRole' => 'INFO',  // Vždy INFO pro source účastníky
                                'sendEmail' => $sendEmailInfo,
                                'sendInApp' => $sendInAppInfo,
                                'templateId' => $templateId,
                                'templateVariant' => $infoVariantName
                            );
                            
                            error_log("         ✅ Source User $sourceUserId: Added as INFO recipient (email=" . ($sendEmailInfo ? 'YES' : 'NO') . ", inapp=" . ($sendInAppInfo ? 'YES' : 'NO') . ")");
                        }
                    }
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════
        // SHRNUTÍ
        // ═══════════════════════════════════════════════════════════════════
        error_log("");
        error_log("┌────────────────────────────────────────────────────────────────┐");
        error_log("│  📊 ORGANIZATIONAL HIERARCHY - SUMMARY                         │");
        error_log("├────────────────────────────────────────────────────────────────┤");
        error_log("│  Event:              " . str_pad($eventType, 38) . "│");
        error_log("│  Matching Templates: " . str_pad($matchingTemplates, 38) . "│");
        error_log("│  Total Recipients:   " . str_pad(count($recipients), 38) . "│");
        
        if ($matchingTemplates === 0) {
            error_log("│                                                                │");
            error_log("│  ⚠️  WARNING: No templates matched this event type!           │");
            error_log("│      Check organizational hierarchy configuration.            │");
        } else if (count($recipients) === 0) {
            error_log("│                                                                │");
            error_log("│  ⚠️  WARNING: Templates matched but no recipients found!      │");
            error_log("│      Check edge configurations and user filters.              │");
        } else {
            error_log("│                                                                │");
            error_log("│  ✅ Recipients found and ready to receive notifications       │");
        }
        
        error_log("└────────────────────────────────────────────────────────────────┘");
        error_log("");
        
    } catch (Exception $e) {
        error_log("❌ [findNotificationRecipients] Exception: " . $e->getMessage());
        error_log("");
    }
    
    return $recipients;
}

/**
 * Najde konkrétní uzivatel_id podle typu node (user, role, location, department)
 * 
 * @param PDO $db
 * @param array $node - Target node z hierarchie
 * @param int $objectId - ID objektu (objednávka, faktura)
 * @param int $triggerUserId - Kdo akci provedl
 * @return array - Pole uzivatel_id
 */
function resolveTargetUsers($db, $node, $objectId, $triggerUserId) {
    $userIds = array();
    
    try {
        switch ($node['typ']) {
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
                        SELECT DISTINCT ur.uzivatel_id 
                        FROM ".TBL_UZIVATELE_ROLE." ur
                        JOIN ".TBL_UZIVATELE." u ON ur.uzivatel_id = u.id
                        WHERE ur.role_id = :role_id AND u.aktivni = 1
                    ");
                    $stmt->execute([':role_id' => $roleId]);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $userIds[] = $row['uzivatel_id'];
                    }
                }
                break;
                
            case 'location':
                // Všichni uživatelé na této lokaci
                $locationId = isset($node['data']['locationId']) ? $node['data']['locationId'] : null;
                if ($locationId) {
                    $stmt = $db->prepare("
                        SELECT DISTINCT id 
                        FROM ".TBL_UZIVATELE." 
                        WHERE location_id = :location_id AND aktivni = 1
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
                        FROM ".TBL_UZIVATELE." 
                        WHERE department_id = :department_id AND aktivni = 1
                    ");
                    $stmt->execute([':department_id' => $departmentId]);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $userIds[] = $row['id'];
                    }
                }
                break;
                
            default:
                error_log("[resolveTargetUsers] Unknown node typ: {$node['typ']}");
        }
    } catch (Exception $e) {
        error_log("[resolveTargetUsers] Exception: " . $e->getMessage());
    }
    
    return array_unique($userIds);
}

/**
 * Extrahuje správnou variantu z email_telo podle <!-- RECIPIENT: TYPE -->
 */
function extractVariantFromEmailBody($emailBody, $variant) {
    if (empty($emailBody)) {
        error_log("[extractVariantFromEmailBody] ❌ Empty emailBody provided");
        return '';
    }
    
    $marker = "<!-- RECIPIENT: $variant -->";
    
    // 🔍 DEBUG: Vypsat co hledáme a co máme
    error_log("[extractVariantFromEmailBody] 🔍 Searching for variant: '$variant'");
    error_log("[extractVariantFromEmailBody]    Marker: '$marker'");
    error_log("[extractVariantFromEmailBody]    Email body length: " . strlen($emailBody));
    error_log("[extractVariantFromEmailBody]    First 150 chars: " . substr($emailBody, 0, 150));
    
    // Zkontrolovat všechny markery v emailBody
    preg_match_all('/<!-- RECIPIENT: ([A-Z_]+) -->/', $emailBody, $matches);
    if (!empty($matches[1])) {
        error_log("[extractVariantFromEmailBody]    Found markers in body: " . implode(', ', $matches[1]));
    } else {
        error_log("[extractVariantFromEmailBody]    ⚠️ NO markers found in body!");
    }
    
    // ✅ OPRAVENO: Správná kontrola - strpos() vrací 0 pokud je marker na začátku!
    if (strpos($emailBody, $marker) === false) {
        // Varianta nenalezena, vrátit celé body (fallback)
        error_log("[extractVariantFromEmailBody] ⚠️ Marker '$marker' not found, returning full body");
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
    
    $extracted = trim(substr($emailBody, $start, $end - $start));
    
    if (empty($extracted)) {
        error_log("[extractVariantFromEmailBody] ⚠️ WARNING: Extracted variant '$variant' is EMPTY!");
    } else {
        error_log("[extractVariantFromEmailBody] ✅ Extracted variant '$variant': " . strlen($extracted) . " bytes");
    }
    
    return $extracted;
}

/**
 * Určí object typ podle event typ
 */
function getObjectTypeFromEvent($eventType) {
    // Podporuj jak uppercase (ORDER_SENT_FOR_APPROVAL) tak lowercase (order_status_ke_schvaleni)
    if (strpos($eventType, 'ORDER_') === 0 || strpos($eventType, 'order_') === 0) return 'orders';
    if (strpos($eventType, 'INVOICE_') === 0 || strpos($eventType, 'invoice_') === 0) return 'invoices';
    if (strpos($eventType, 'CONTRACT_') === 0 || strpos($eventType, 'contract_') === 0) return 'contracts';
    if (strpos($eventType, 'CASHBOOK_') === 0 || strpos($eventType, 'cashbook_') === 0) return 'cashbook';
    return 'unknown';
}

/**
 * Načte uživatelské preference pro notifikace
 * 
 * HIERARCHIE (od nejvyšší priority):
 * 1. GLOBAL SETTINGS (app_global_settings) - Celá aplikace ON/OFF
 * 2. USER PROFILE SETTINGS (25_uzivatel_nastaveni) - Uživatel si může vypnout doručení
 * 3. ORGANIZATION HIERARCHY (25_hierarchie_profily) - Definuje jaké typy notifikací vůbec existují
 * 
 * Logika:
 * - Global Settings = OFF → NIČEHO se nepošle
 * - User Settings inapp/email = OFF → Uživatel nedostane notifikace tímto kanálem
 * - Org Hierarchy definuje sendEmail/sendInApp pro konkrétní typ události → Pokud není definováno, notifikace se nevygeneruje
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
            SELECT klic, hodnota 
            FROM " . TBL_NASTAVENI_GLOBALNI . " 
            WHERE klic IN (
                'notifications_enabled',
                'notifications_email_enabled', 
                'notifications_inapp_enabled'
            )
        ");
        $stmt->execute();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $value = ($row['hodnota'] === '1' || $row['hodnota'] === 'true');
            
            if ($row['klic'] === 'notifications_enabled' && !$value) {
                // Systém je vypnutý globálně - nic nefunguje
                $preferences['enabled'] = false;
                return $preferences;
            }
            
            if ($row['klic'] === 'notifications_email_enabled') {
                $preferences['email_enabled'] = $value;
            }
            
            if ($row['klic'] === 'notifications_inapp_enabled') {
                $preferences['inapp_enabled'] = $value;
            }
        }
        
        // 2. USER PROFILE SETTINGS - Uživatelská úroveň
        // Načtení z tabulky 25_uzivatel_nastaveni
        $stmt = $db->prepare("
            SELECT nastaveni_data 
            FROM " . TBL_UZIVATEL_NASTAVENI . " 
            WHERE uzivatel_id = :uzivatel_id
        ");
        $stmt->execute([':uzivatel_id' => $userId]);
        $userSettings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($userSettings && !empty($userSettings['nastaveni_data'])) {
            $settings = json_decode($userSettings['nastaveni_data'], true);
            
            if (isset($settings['notifikace_povoleny'])) {
                $preferences['enabled'] = (bool)$settings['notifikace_povoleny'];
            }
            
            if (isset($settings['notifikace_email_povoleny'])) {
                $preferences['email_enabled'] = $preferences['email_enabled'] && (bool)$settings['notifikace_email_povoleny'];
            }
            
            if (isset($settings['notifikace_inapp_povoleny'])) {
                $preferences['inapp_enabled'] = $preferences['inapp_enabled'] && (bool)$settings['notifikace_inapp_povoleny'];
            }
            
            if (isset($settings['notifikace_kategorie'])) {
                // Mapování českých názvů na anglické klíče
                $categoryMap = [
                    'objednavky' => 'orders',
                    'faktury' => 'invoices',
                    'smlouvy' => 'contracts',
                    'pokladna' => 'cashbook'
                ];
                
                foreach ($settings['notifikace_kategorie'] as $czCategory => $enabled) {
                    $enCategory = isset($categoryMap[$czCategory]) ? $categoryMap[$czCategory] : $czCategory;
                    $preferences['categories'][$enCategory] = (bool)$enabled;
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
        
        // Načíst uzivatel_id z username
        $stmt = $db->prepare("SELECT id FROM " . TBL_UZIVATELE . " WHERE username = :username");
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
        
        // Načíst uzivatel_id
        $stmt = $db->prepare("SELECT id FROM " . TBL_UZIVATELE . " WHERE username = :username");
        $stmt->execute([':username' => $request_username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(array('err' => 'Uživatel nenalezen'));
            return;
        }
        
        $userId = $user['id'];
        
        // Mapování anglických názvů na české
        $categoryMap = [
            'orders' => 'objednavky',
            'invoices' => 'faktury',
            'contracts' => 'smlouvy',
            'cashbook' => 'pokladna'
        ];
        
        $czCategories = array();
        if (isset($input['categories'])) {
            foreach ($input['categories'] as $enKey => $value) {
                $czKey = isset($categoryMap[$enKey]) ? $categoryMap[$enKey] : $enKey;
                $czCategories[$czKey] = (bool)$value;
            }
        } else {
            $czCategories = array(
                'objednavky' => true,
                'faktury' => true,
                'smlouvy' => true,
                'pokladna' => true
            );
        }
        
        // Sestavit preferences object (české klíče)
        $preferences = array(
            'notifikace_povoleny' => isset($input['enabled']) ? (bool)$input['enabled'] : true,
            'notifikace_email_povoleny' => isset($input['email_enabled']) ? (bool)$input['email_enabled'] : true,
            'notifikace_inapp_povoleny' => isset($input['inapp_enabled']) ? (bool)$input['inapp_enabled'] : true,
            'notifikace_kategorie' => $czCategories
        );
        
        $preferencesJson = json_encode($preferences);
        
        // Uložit do DB (INSERT nebo UPDATE)
        $stmt = $db->prepare("
            INSERT INTO " . TBL_UZIVATEL_NASTAVENI . " (uzivatel_id, nastaveni_data, nastaveni_verze, vytvoreno)
            VALUES (:uzivatel_id, :settings, '1.0', NOW())
            ON DUPLICATE KEY UPDATE 
                nastaveni_data = :settings,
                upraveno = NOW()
        ");
        
        $result = $stmt->execute([
            ':settings' => $preferencesJson,
            ':uzivatel_id' => $userId
        ]);
        
        if ($result) {
            echo json_encode(array(
                'status' => 'ok',
                'zprava' => 'Preference uloženy',
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

/**
 * Odešle notifikační email uživateli
 * 
 * @param PDO $db
 * @param int $userId
 * @param string $subject
 * @param string $htmlBody
 * @return array - ['ok' => bool, 'error' => string]
 */
function sendNotificationEmail($db, $userId, $subject, $htmlBody) {
    try {
        // ❌ OCHRANA: Neposlat prázdné emaily
        if (empty($subject) || empty($htmlBody)) {
            error_log("[sendNotificationEmail] ❌ BLOCKED: Empty subject or body for user $userId");
            return array('ok' => false, 'error' => 'Empty subject or body - email not sent');
        }
        
        // 1. Načíst email uživatele z DB
        $stmt = $db->prepare("
            SELECT email, jmeno, prijmeni 
            FROM " . TBL_UZIVATELE . " 
            WHERE id = :user_id AND aktivni = 1
        ");
        $stmt->execute([':user_id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || empty($user['email'])) {
            error_log("[sendNotificationEmail] User $userId has no email address");
            return array('ok' => false, 'error' => 'No email address');
        }
        
        // 2. Zavolat eeo_mail_send()
        require_once __DIR__ . '/mail.php';
        
        $result = eeo_mail_send(
            $user['email'],
            $subject,
            $htmlBody,
            array('html' => true)
        );
        
        // 3. Logovat výsledek
        if ($result['ok']) {
            error_log("[sendNotificationEmail] Email sent to {$user['email']} for user $userId");
        } else {
            error_log("[sendNotificationEmail] Email FAILED to {$user['email']} for user $userId");
        }
        
        return $result;
        
    } catch (Exception $e) {
        error_log("[sendNotificationEmail] Exception: " . $e->getMessage());
        return array('ok' => false, 'error' => $e->getMessage());
    }
}

/**
 * API Handler: Trigger notifikace podle event typu (použije org. hierarchii)
 * 
 * Endpoint: POST /api.eeo/notifications/trigger
 * Body: {
 *   token: string,
 *   username: string,
 *   event_type: string (ORDER_APPROVED, ORDER_REJECTED, ...),
 *   object_id: int (ID objednávky/faktury/...),
 *   trigger_user_id: int (kdo akci provedl)
 * }
 */
function handle_notifications_trigger($input, $config, $queries) {
    $db = get_db($config);
    
    // DEBUG: Logovat začátek
    if ($db) {
        try {
            $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
            $stmt->execute(['handle_notifications_trigger START', json_encode(['input' => $input])]);
        } catch (Exception $e) {
            error_log("DEBUG LOG FAILED: " . $e->getMessage());
        }
    }
    
    // ✅ Ověření tokenu - STEJNĚ JAKO V /notifications/list
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('err' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    if ($token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('err' => 'Username z tokenu neodpovídá username z požadavku'));
        return;
    }
    
    $db = get_db($config);
    
    if (!$db) {
        http_response_code(500);
        echo json_encode(array('err' => 'Database connection failed'));
        return;
    }
    
    try {
        // Validace vstupních parametrů
        $eventType = isset($input['event_type']) ? $input['event_type'] : null;
        $objectId = isset($input['object_id']) ? intval($input['object_id']) : null;
        $triggerUserId = isset($input['trigger_user_id']) ? intval($input['trigger_user_id']) : null;
        
        if (!$eventType || !$objectId || !$triggerUserId) {
            http_response_code(400);
            echo json_encode(array(
                'err' => 'Missing required parameters',
                'required' => ['event_type', 'object_id', 'trigger_user_id']
            ));
            return;
        }
        
        // Volitelné placeholder data (pokud je poskytne frontend)
        $placeholderData = isset($input['placeholder_data']) ? $input['placeholder_data'] : array();
        
        // Zavolat notification router (hlavní logika)
        error_log("[NotificationTrigger] Calling notificationRouter with event=$eventType, object=$objectId, user=$triggerUserId");
        $result = notificationRouter($db, $eventType, $objectId, $triggerUserId, $placeholderData);
        error_log("[NotificationTrigger] Router returned: " . json_encode($result));
        
        if ($result['success']) {
            error_log("[NotificationTrigger] ✅ SUCCESS - Sent: " . $result['sent']);
            error_log("════════════════════════════════════════════════════════════════");
            echo json_encode(array(
                'status' => 'ok',
                'zprava' => 'Notifikace odeslány',
                'sent' => $result['sent'],
                'errors' => $result['errors']
            ));
        } else {
            error_log("[NotificationTrigger] ❌ FAILED - sent=" . $result['sent'] . ", errors=" . json_encode($result['errors']));
            error_log("════════════════════════════════════════════════════════════════");
            // ⚠️ Pokud se neposlaly notifikace ale není to chyba, vracíme 200 (ne 500)
            // 500 jen pokud je skutečná technická chyba
            if (empty($result['errors'])) {
                // Žádní příjemci nalezeni - to není chyba serveru
                echo json_encode(array(
                    'status' => 'ok',
                    'zprava' => 'Žádní příjemci nenalezeni',
                    'sent' => 0,
                    'errors' => array()
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    'err' => 'Failed to trigger notifications',
                    'errors' => $result['errors']
                ));
            }
        }
        
    } catch (Exception $e) {
        error_log("[NotificationTrigger] ❌ EXCEPTION: " . $e->getMessage());
        error_log("[NotificationTrigger] Stack trace: " . $e->getTraceAsString());
        error_log("════════════════════════════════════════════════════════════════");
        
        // DEBUG: Logovat exception
        if ($db) {
            try {
                $stmt = $db->prepare("INSERT INTO debug_notification_log (message, data) VALUES (?, ?)");
                $stmt->execute(['EXCEPTION in handle_notifications_trigger', json_encode([
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ])]);
            } catch (Exception $logErr) {
                error_log("DEBUG LOG FAILED: " . $logErr->getMessage());
            }
        }
        
        http_response_code(500);
        echo json_encode(array('err' => 'Exception: ' . $e->getMessage()));
    }
}

/**
 * Načte seznam všech emailových šablon
 */
function handle_notifications_templates_list($input, $config, $queries) {
    error_log('📧 [Templates] handle_notifications_templates_list called');
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    
    error_log('📧 [Templates] Token: ' . ($token ? 'YES' : 'NO') . ', Username: ' . $request_username);
    
    $token_data = verify_token_v2($request_username, $token);
    if (!$token_data) {
        error_log('📧 [Templates] Token verification FAILED');
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'err' => 'Neplatný nebo chybějící token'));
        return;
    }
    
    error_log('📧 [Templates] Token verified, loading templates from DB');
    
    try {
        $db = get_db($config);
        error_log('📧 [Templates] DB connection OK');
        
        $sql = "SELECT 
                    id,
                    typ,
                    nazev,
                    email_predmet,
                    email_telo,
                    app_nadpis,
                    app_zprava,
                    aktivni,
                    dt_created,
                    dt_updated
                FROM " . TBL_NOTIFIKACE_SABLONY . "
                WHERE aktivni = 1
                ORDER BY nazev ASC";
        
        error_log('📧 [Templates] SQL: ' . $sql);
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log('📧 [Templates] Loaded ' . count($templates) . ' templates');
        
        echo json_encode(array('status' => 'ok', 'data' => $templates));
        
    } catch (Exception $e) {
        error_log('📧 [Templates] ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'err' => 'Chyba při načítání šablon: ' . $e->getMessage()));
    }
}

// ==========================================
// NOVÉ FUNKCE PRO TRIGGERY FAKTUR A POKLADNY
// ==========================================

/**
 * Načte placeholder data pro faktury
 * Používá se v notificationRouter pro typ 'invoices'
 */
function loadInvoicePlaceholders($db, $invoiceId, $triggerUserId = null) {
    error_log("[loadInvoicePlaceholders] START for invoice $invoiceId");
    
    try {
        // Načti fakturu s joiny
        $sql = "
            SELECT f.*, 
                   o.cislo_objednavky as order_number,
                   o.id as order_id,
                   o.nazev_objednavky as order_name,
                   d.nazev as supplier_name,
                   CONCAT(u.jmeno, ' ', u.prijmeni) as creator_name
            FROM 25_faktury f
            LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
            LEFT JOIN 25_dodavatele d ON f.dodavatel_id = d.id
            LEFT JOIN 25_uzivatele u ON f.uzivatel_id = u.id
            WHERE f.id = :invoice_id
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':invoice_id' => $invoiceId]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            error_log("[loadInvoicePlaceholders] Invoice $invoiceId not found");
            return array();
        }
        
        // Formátuj placeholders
        $placeholders = array(
            'invoice_id' => $invoiceId,
            'invoice_number' => $invoice['cislo_faktury'] ?? '',
            'invoice_vs' => $invoice['vs'] ?? '',
            'supplier_name' => $invoice['supplier_name'] ?? 'Neznámý dodavatel',
            'amount' => number_format((float)($invoice['castka'] ?? 0), 2, ',', ' ') . ' Kč',
            'amount_raw' => $invoice['castka'] ?? 0,
            'due_date' => $invoice['datum_splatnosti'] ?? '',
            'invoice_date' => $invoice['datum_vystaveni'] ?? '',
            'order_number' => $invoice['order_number'] ?? '',
            'order_id' => $invoice['order_id'] ?? null,
            'order_name' => $invoice['order_name'] ?? '',
            'creator_name' => $invoice['creator_name'] ?? '',
            'stav' => $invoice['stav'] ?? '',
            'poznamka' => $invoice['poznamka'] ?? '',
            'user_name' => '{user_name}', // placeholder pro pozdější nahrazení
        );
        
        error_log("[loadInvoicePlaceholders] Loaded placeholders for invoice $invoiceId");
        return $placeholders;
        
    } catch (Exception $e) {
        error_log("[loadInvoicePlaceholders] Error: " . $e->getMessage());
        return array();
    }
}

/**
 * Načte placeholder data pro pokladnu
 * Používá se v notificationRouter pro typ 'cashbook'
 */
function loadCashbookPlaceholders($db, $cashbookId, $triggerUserId = null) {
    error_log("[loadCashbookPlaceholders] START for cashbook entry $cashbookId");
    
    try {
        // Načti pokladní záznam
        $sql = "
            SELECT p.*, 
                   CONCAT(u.jmeno, ' ', u.prijmeni) as creator_name,
                   s.kod as stredisko_kod,
                   s.nazev as stredisko_nazev
            FROM 25_pokladna p
            LEFT JOIN 25_uzivatele u ON p.uzivatel_id = u.id
            LEFT JOIN 25_strediska s ON p.stredisko_id = s.id
            WHERE p.id = :cashbook_id
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':cashbook_id' => $cashbookId]);
        $entry = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$entry) {
            error_log("[loadCashbookPlaceholders] Cashbook entry $cashbookId not found");
            return array();
        }
        
        // Formátuj placeholders
        $placeholders = array(
            'cashbook_id' => $cashbookId,
            'month' => $entry['mesic'] ?? '',
            'year' => $entry['rok'] ?? '',
            'period' => ($entry['mesic'] ?? '') . '/' . ($entry['rok'] ?? ''),
            'balance' => number_format((float)($entry['zustatek'] ?? 0), 2, ',', ' ') . ' Kč',
            'balance_raw' => $entry['zustatek'] ?? 0,
            'income_total' => number_format((float)($entry['prijmy_celkem'] ?? 0), 2, ',', ' ') . ' Kč',
            'expense_total' => number_format((float)($entry['vydaje_celkem'] ?? 0), 2, ',', ' ') . ' Kč',
            'stredisko_kod' => $entry['stredisko_kod'] ?? '',
            'stredisko_nazev' => $entry['stredisko_nazev'] ?? '',
            'creator_name' => $entry['creator_name'] ?? '',
            'closed_date' => $entry['datum_uzavreni'] ?? '',
            'locked_date' => $entry['datum_uzamceni'] ?? '',
            'user_name' => '{user_name}', // placeholder pro pozdější nahrazení
        );
        
        error_log("[loadCashbookPlaceholders] Loaded placeholders for cashbook $cashbookId");
        return $placeholders;
        
    } catch (Exception $e) {
        error_log("[loadCashbookPlaceholders] Error: " . $e->getMessage());
        return array();
    }
}

/**
 * Helper funkce pro triggering notifikací z business logiky
 * Volá se z invoice/cashbook handlerů místo přímého volání notificationRouter
 * 
 * @param PDO $db - Database connection
 * @param string $eventType - Event type kód (např. 'INVOICE_SUBMITTED')
 * @param int $objectId - ID objektu (invoice_id, cashbook_id, ...)
 * @param int $triggerUserId - ID uživatele který vyvolal akci
 * @param array $customPlaceholders - Volitelné custom placeholders
 * @return array - Výsledek z notificationRouter
 */
function triggerNotification($db, $eventType, $objectId, $triggerUserId, $customPlaceholders = array()) {
    // ╔══════════════════════════════════════════════════════════════════╗
    error_log("║                                                                  ║");
    error_log("║  🔔 NOTIFICATION TRIGGER CALLED!                                ║");
    error_log("║                                                                  ║");
    error_log("║  Event Type:   " . str_pad($eventType, 47) . "║");
    error_log("║  Object ID:    " . str_pad($objectId, 47) . "║");
    error_log("║  Trigger User: " . str_pad($triggerUserId, 47) . "║");
    error_log("║                                                                  ║");
    error_log("╚══════════════════════════════════════════════════════════════════╝");
    
    try {
        // Zavolej notificationRouter
        $result = notificationRouter($db, $eventType, $objectId, $triggerUserId, $customPlaceholders);
        
        error_log("✅ ✅ ✅ [triggerNotification] SUCCESS for $eventType - Sent: {$result['sent']} notifications");
        return $result;
        
    } catch (Exception $e) {
        error_log("❌ [triggerNotification] Error for $eventType: " . $e->getMessage());
        // Neblokujeme business logiku kvůli chybě notifikace
        return array('status' => 'error', 'message' => $e->getMessage());
    }
}

/**
 * Načte notifikaci podle ID (pro post-login modal systém)
 */
function getNotificationByIdHandler($db, $notification_id) {
    try {
        $sql = "SELECT id, typ, nadpis, zprava, data_json, priorita, kategorie, 
                       objekt_typ, objekt_id, dt_created, dt_expires, aktivni
                FROM " . TBL_NOTIFIKACE . " 
                WHERE id = :notification_id AND aktivni = 1
                LIMIT 1";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':notification_id', $notification_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $notification = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$notification) {
            return array(
                'status' => 'error',
                'message' => 'Notifikace nebyla nalezena nebo není aktivní'
            );
        }
        
        return array(
            'status' => 'success',
            'data' => $notification
        );
        
    } catch (Exception $e) {
        error_log("❌ [getNotificationByIdHandler] Error: " . $e->getMessage());
        return array(
            'status' => 'error',
            'message' => 'Chyba při načítání notifikace: ' . $e->getMessage()
        );
    }
}

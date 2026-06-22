<?php
/**
 * VEMA Kontrola & Metadata Handlers
 * 
 * Endpointy pro práci s kontrolními záznamy k VEMA datům
 * 
 * Dostupné endpointy:
 * - POST vema-kontrola/get    - Načíst kontrolu pro záznam
 * - POST vema-kontrola/save   - Uložit/aktualizovat kontrolu
 * - POST vema-kontrola/list   - Seznam kontrol (filter dle statusu)
 * - POST vema-kontrola/stats  - Statistiky kontrol
 */

require_once __DIR__ . '/dbconfig.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/TimezoneHelper.php';

/**
 * GET - Načíst kontrolu pro konkrétní VEMA záznam
 * POST: {token, username, typ_zaznamu, vema_id}
 */
function handle_vema_kontrola_get($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $typ_zaznamu = $input['typ_zaznamu'] ?? ''; // faktura|firma|smlouva
    $vema_id = $input['vema_id'] ?? '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (!$typ_zaznamu || !$vema_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí typ_zaznamu nebo vema_id']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $query = "
            SELECT 
                k.*,
                u1.jmeno as kontroloval_jmeno,
                u1.prijmeni as kontroloval_prijmeni,
                u2.jmeno as vytvoril_jmeno,
                u2.prijmeni as vytvoril_prijmeni
            FROM `25v_kontrola_metadata` k
            LEFT JOIN `25_uzivatele` u1 ON k.kontroloval_uzivatel_id = u1.id
            LEFT JOIN `25_uzivatele` u2 ON k.vytvoril_uzivatel_id = u2.id
            WHERE k.typ_zaznamu = ? AND k.vema_id = ?
            LIMIT 1
        ";

        $stmt = $db->prepare($query);
        $stmt->execute([$typ_zaznamu, $vema_id]);
        $kontrola = $stmt->fetch(PDO::FETCH_ASSOC);

        // Dekóduj JSON metadata
        if ($kontrola && !empty($kontrola['metadata_json'])) {
            $kontrola['metadata'] = json_decode($kontrola['metadata_json'], true);
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $kontrola,
            'message' => $kontrola ? 'Kontrola načtena' : 'Kontrola neexistuje'
        ]);

    } catch (Exception $e) {
        error_log("VEMA kontrola/get error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání kontroly: ' . $e->getMessage()
        ]);
    }
}

/**
 * SAVE - Uložit nebo aktualizovat kontrolu
 * POST: {token, username, typ_zaznamu, vema_id, kontrola_status, poznamka, priorita, metadata}
 */
function handle_vema_kontrola_save($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $typ_zaznamu = $input['typ_zaznamu'] ?? '';
    $vema_id = $input['vema_id'] ?? '';
    $kontrola_status = $input['kontrola_status'] ?? 'nezkontrolovano';
    $poznamka = $input['poznamka'] ?? null;
    $priorita = isset($input['priorita']) ? (int)$input['priorita'] : 0;
    $metadata = $input['metadata'] ?? null;
    $vema_id_secondary = $input['vema_id_secondary'] ?? null;

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    if (!$typ_zaznamu || !$vema_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí typ_zaznamu nebo vema_id']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $user_id = $token_data['user_id'];
        $now = date('Y-m-d H:i:s');
        
        // Převeď metadata na JSON
        $metadata_json = null;
        if ($metadata !== null) {
            $metadata_json = is_string($metadata) ? $metadata : json_encode($metadata, JSON_UNESCAPED_UNICODE);
        }

        // Kontrola existence záznamu
        $check = $db->prepare("SELECT id FROM `25v_kontrola_metadata` WHERE typ_zaznamu = ? AND vema_id = ?");
        $check->execute([$typ_zaznamu, $vema_id]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // UPDATE existujícího záznamu
            $query = "
                UPDATE `25v_kontrola_metadata` SET
                    kontrola_status = ?,
                    poznamka = ?,
                    priorita = ?,
                    metadata_json = ?,
                    vema_id_secondary = ?,
                    kontroloval_uzivatel_id = ?,
                    dt_kontroly = ?,
                    upravil_uzivatel_id = ?,
                    dt_upravy = ?
                WHERE id = ?
            ";
            $stmt = $db->prepare($query);
            $stmt->execute([
                $kontrola_status,
                $poznamka,
                $priorita,
                $metadata_json,
                $vema_id_secondary,
                $user_id,
                $now,
                $user_id,
                $now,
                $existing['id']
            ]);

            $result_id = $existing['id'];
            $action = 'aktualizována';

        } else {
            // INSERT nového záznamu
            $query = "
                INSERT INTO `25v_kontrola_metadata` (
                    typ_zaznamu, vema_id, vema_id_secondary,
                    kontrola_status, poznamka, priorita, metadata_json,
                    kontroloval_uzivatel_id, dt_kontroly,
                    vytvoril_uzivatel_id, dt_vytvoreni
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";
            $stmt = $db->prepare($query);
            $stmt->execute([
                $typ_zaznamu,
                $vema_id,
                $vema_id_secondary,
                $kontrola_status,
                $poznamka,
                $priorita,
                $metadata_json,
                $user_id,
                $now,
                $user_id,
                $now
            ]);

            $result_id = $db->lastInsertId();
            $action = 'vytvořena';
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => ['id' => $result_id],
            'message' => "Kontrola {$action} úspěšně"
        ]);

    } catch (Exception $e) {
        error_log("VEMA kontrola/save error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při ukládání kontroly: ' . $e->getMessage()
        ]);
    }
}

/**
 * LIST - Seznam kontrol s filtrováním
 * POST: {token, username, typ_zaznamu?, kontrola_status?, limit?, offset?}
 */
function handle_vema_kontrola_list($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $typ_zaznamu = $input['typ_zaznamu'] ?? null;
    $kontrola_status = $input['kontrola_status'] ?? null;
    $limit = isset($input['limit']) ? (int)$input['limit'] : 100;
    $offset = isset($input['offset']) ? (int)$input['offset'] : 0;

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $where = [];
        $params = [];

        if ($typ_zaznamu) {
            $where[] = "k.typ_zaznamu = ?";
            $params[] = $typ_zaznamu;
        }

        if ($kontrola_status) {
            $where[] = "k.kontrola_status = ?";
            $params[] = $kontrola_status;
        }

        $where_sql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $query = "
            SELECT 
                k.*,
                u1.jmeno as kontroloval_jmeno,
                u1.prijmeni as kontroloval_prijmeni
            FROM `25v_kontrola_metadata` k
            LEFT JOIN `25_uzivatele` u1 ON k.kontroloval_uzivatel_id = u1.id
            {$where_sql}
            ORDER BY k.dt_kontroly DESC, k.id DESC
            LIMIT ? OFFSET ?
        ";

        $params[] = $limit;
        $params[] = $offset;

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $kontroly = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Dekóduj JSON metadata
        foreach ($kontroly as &$k) {
            if (!empty($k['metadata_json'])) {
                $k['metadata'] = json_decode($k['metadata_json'], true);
            }
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $kontroly,
            'count' => count($kontroly),
            'message' => 'Seznam kontrol načten'
        ]);

    } catch (Exception $e) {
        error_log("VEMA kontrola/list error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání seznamu kontrol: ' . $e->getMessage()
        ]);
    }
}

/**
 * STATS - Statistiky kontrol
 * POST: {token, username, typ_zaznamu?}
 */
function handle_vema_kontrola_stats($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $typ_zaznamu = $input['typ_zaznamu'] ?? null;

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $where = $typ_zaznamu ? "WHERE typ_zaznamu = ?" : "";
        $params = $typ_zaznamu ? [$typ_zaznamu] : [];

        $query = "
            SELECT 
                kontrola_status,
                COUNT(*) as pocet
            FROM `25v_kontrola_metadata`
            {$where}
            GROUP BY kontrola_status
        ";

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $stats,
            'message' => 'Statistiky načteny'
        ]);

    } catch (Exception $e) {
        error_log("VEMA kontrola/stats error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání statistik: ' . $e->getMessage()
        ]);
    }
}

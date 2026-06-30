<?php
/**
 * VEMA Kontrola & Metadata Handlers
 * 
 * Endpointy pro práci s kontrolními záznamy k VEMA datům
 * 
 * Dostupné endpointy:
 * - POST vema-kontrola/get    - Načíst kontrolu pro záznam (+ historie)
 * - POST vema-kontrola/save   - Uložit/aktualizovat kontrolu (s automatickou historií)
 * - POST vema-kontrola/list   - Seznam kontrol (filter dle statusu)
 * - POST vema-kontrola/stats  - Statistiky kontrol
 */

require_once __DIR__ . '/dbconfig.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/TimezoneHelper.php';

// ====================================================
// POMOCNÉ FUNKCE PRO HISTORII
// ====================================================

/**
 * Načte události/historii pro danou kontrolu
 */
function vema_get_udalosti($db, $kontrola_metadata_id) {
    $stmt = $db->prepare("
        SELECT h.*, u.prijmeni, u.jmeno
        FROM `25v_kontrola_metadata_historie` h
        LEFT JOIN `25_uzivatele` u ON u.id = h.vytvoril_user_id
        WHERE h.kontrola_metadata_id = ?
        ORDER BY h.dt_vytvoreni ASC
    ");
    $stmt->execute(array((int)$kontrola_metadata_id));
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Zapíše novou událost do historie
 */
function vema_add_udalost($db, $kontrola_metadata_id, $typ, $text_zprava, $stav_pred, $stav_po, $user_id) {
    $dt = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
    $stmt = $db->prepare("
        INSERT INTO `25v_kontrola_metadata_historie`
        (kontrola_metadata_id, typ, text_zprava, stav_pred, stav_po, vytvoril_user_id, dt_vytvoreni)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute(array(
        (int)$kontrola_metadata_id,
        $typ,
        $text_zprava,
        $stav_pred,
        $stav_po,
        $user_id ? (int)$user_id : null,
        $dt
    ));
    return $db->lastInsertId();
}

// ====================================================
// ENDPOINTY
// ====================================================

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

        // Načti historii událostí
        $udalosti = [];
        if ($kontrola) {
            $udalosti = vema_get_udalosti($db, $kontrola['id']);
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => [
                'case' => $kontrola,
                'udalosti' => $udalosti
            ],
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

    // Povolené stavy (sjednocený číselník)
    $legacy_status_map = [
        'v_kontrole' => 'v_reseni',
        'zkontrolovano' => 'v_poradku',
        'ma_problem' => 'nelze_vyresit',
        'pozastaveno' => 'v_reseni'
    ];
    if (isset($legacy_status_map[$kontrola_status])) {
        $kontrola_status = $legacy_status_map[$kontrola_status];
    }

    $allowed_statuses = ['nezkontrolovano', 'v_poradku', 'nelze_vyresit', 'v_reseni'];
    if (!in_array($kontrola_status, $allowed_statuses, true)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Neplatná hodnota kontrola_status']);
        return;
    }

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

        $user_id = $token_data['id'];
        $now = date('Y-m-d H:i:s');
        
        // Převeď metadata na JSON
        $metadata_json = null;
        if ($metadata !== null) {
            $metadata_json = is_string($metadata) ? $metadata : json_encode($metadata, JSON_UNESCAPED_UNICODE);
        }

        // Kontrola existence záznamu + načtení starých hodnot
        $check = $db->prepare("SELECT * FROM `25v_kontrola_metadata` WHERE typ_zaznamu = ? AND vema_id = ?");
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

            // 📝 HISTORIE: Zjisti co se změnilo a zapiš do historie
            
            // Změna stavu?
            if ($existing['kontrola_status'] !== $kontrola_status) {
                vema_add_udalost(
                    $db, 
                    $result_id, 
                    'ZMENA_STAVU', 
                    null, 
                    $existing['kontrola_status'], 
                    $kontrola_status, 
                    $user_id
                );
            }

            // Změna priority?
            if ((int)$existing['priorita'] !== (int)$priorita) {
                vema_add_udalost(
                    $db, 
                    $result_id, 
                    'ZMENA_PRIORITY', 
                    null, 
                    (string)$existing['priorita'], 
                    (string)$priorita, 
                    $user_id
                );
            }

            // Nová poznámka? (pokud se text změnil)
            if ($poznamka && trim($poznamka) !== '' && $poznamka !== $existing['poznamka']) {
                vema_add_udalost(
                    $db, 
                    $result_id, 
                    'KOMENTAR', 
                    $poznamka, 
                    null, 
                    null, 
                    $user_id
                );
            }

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

            // 📝 HISTORIE: První záznam - automatická systémová událost
            vema_add_udalost(
                $db, 
                $result_id, 
                'AUTO_SYSTEM', 
                'Kontrola vytvořena', 
                null, 
                $kontrola_status, 
                $user_id
            );

            // Pokud je poznámka, přidej i ji
            if ($poznamka && trim($poznamka) !== '') {
                vema_add_udalost(
                    $db, 
                    $result_id, 
                    'KOMENTAR', 
                    $poznamka, 
                    null, 
                    null, 
                    $user_id
                );
            }
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

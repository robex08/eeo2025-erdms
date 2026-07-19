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

// Sjednocené statusy pro API/UI a mapování na legacy DB ENUM hodnoty.
const VEMA_STATUS_DB_TO_API = [
    'nezkontrolovano' => 'nezkontrolovano',
    'v_kontrole' => 'v_reseni',
    'zkontrolovano' => 'v_poradku',
    'ma_problem' => 'nelze_vyresit',
    'pozastaveno' => 'v_reseni'
];

const VEMA_STATUS_API_TO_DB = [
    'nezkontrolovano' => 'nezkontrolovano',
    'v_poradku' => 'zkontrolovano',
    'nelze_vyresit' => 'ma_problem',
    'v_reseni' => 'v_kontrole'
];

function vema_normalize_status_for_api($status) {
    $value = trim((string)$status);
    if ($value === '') return 'nezkontrolovano';
    if (isset(VEMA_STATUS_DB_TO_API[$value])) return VEMA_STATUS_DB_TO_API[$value];
    if (isset(VEMA_STATUS_API_TO_DB[$value])) return $value;
    return 'nezkontrolovano';
}

function vema_status_to_db($status) {
    $normalized = vema_normalize_status_for_api($status);
    return VEMA_STATUS_API_TO_DB[$normalized] ?? 'nezkontrolovano';
}

/**
 * Normalizace sekundárního VEMA ID pro stabilní identitu metadat.
 * - faktura: povinné (firma)
 * - firma/smlouva: ukládáme prázdný řetězec
 */
function vema_normalize_secondary_id($typ_zaznamu, $vema_id_secondary) {
    if ($typ_zaznamu === 'faktura') {
        $secondary = trim((string)$vema_id_secondary);
        return $secondary !== '' ? $secondary : null;
    }
    return '';
}

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
 * POST: {token, username, typ_zaznamu, vema_id, vema_id_secondary?}
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
    $vema_id_secondary = $input['vema_id_secondary'] ?? '';

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

    $normalized_secondary = vema_normalize_secondary_id($typ_zaznamu, $vema_id_secondary);
    if ($typ_zaznamu === 'faktura' && $normalized_secondary === null) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Pro typ faktura je povinné vema_id_secondary (firma)']);
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
            WHERE k.typ_zaznamu = ? AND k.vema_id = ? AND k.vema_id_secondary = ?
            LIMIT 1
        ";

        $stmt = $db->prepare($query);
        $stmt->execute([$typ_zaznamu, $vema_id, $normalized_secondary]);
        $kontrola = $stmt->fetch(PDO::FETCH_ASSOC);

        // Dekóduj JSON metadata
        if ($kontrola && !empty($kontrola['metadata_json'])) {
            $kontrola['metadata'] = json_decode($kontrola['metadata_json'], true);
        }

        if ($kontrola) {
            $kontrola['kontrola_status'] = vema_normalize_status_for_api($kontrola['kontrola_status'] ?? null);
        }

        // Načti historii událostí
        $udalosti = [];
        if ($kontrola) {
            $udalosti = vema_get_udalosti($db, $kontrola['id']);
            foreach ($udalosti as &$u) {
                if (($u['typ'] ?? '') === 'ZMENA_STAVU') {
                    $u['stav_pred'] = vema_normalize_status_for_api($u['stav_pred'] ?? null);
                    $u['stav_po'] = vema_normalize_status_for_api($u['stav_po'] ?? null);
                }
            }
            unset($u);
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
 * POST: {token, username, typ_zaznamu, vema_id, vema_id_secondary?, kontrola_status, poznamka, priorita, metadata}
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

    $kontrola_status = vema_normalize_status_for_api($kontrola_status);
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

    $normalized_secondary = vema_normalize_secondary_id($typ_zaznamu, $vema_id_secondary);
    if ($typ_zaznamu === 'faktura' && $normalized_secondary === null) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Pro typ faktura je povinné vema_id_secondary (firma)']);
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
        $kontrola_status_db = vema_status_to_db($kontrola_status);
        
        // Převeď metadata na JSON
        $metadata_json = null;
        if ($metadata !== null) {
            $metadata_json = is_string($metadata) ? $metadata : json_encode($metadata, JSON_UNESCAPED_UNICODE);
        }

        // Kontrola existence záznamu + načtení starých hodnot
        $check = $db->prepare("SELECT * FROM `25v_kontrola_metadata` WHERE typ_zaznamu = ? AND vema_id = ? AND vema_id_secondary = ?");
        $check->execute([$typ_zaznamu, $vema_id, $normalized_secondary]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);
        $existing_status_api = vema_normalize_status_for_api(
            is_array($existing) ? ($existing['kontrola_status'] ?? null) : null
        );

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
                $kontrola_status_db,
                $poznamka,
                $priorita,
                $metadata_json,
                $normalized_secondary,
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
            if ($existing_status_api !== $kontrola_status) {
                vema_add_udalost(
                    $db, 
                    $result_id, 
                    'ZMENA_STAVU', 
                    null, 
                    $existing_status_api, 
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
                $normalized_secondary,
                $kontrola_status_db,
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
            $kontrola_status = vema_status_to_db($kontrola_status);
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
            $k['kontrola_status'] = vema_normalize_status_for_api($k['kontrola_status'] ?? null);
        }
        unset($k);

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

        $normalized_stats = [];
        foreach ($stats as $row) {
            $normalized_status = vema_normalize_status_for_api($row['kontrola_status'] ?? null);
            if (!isset($normalized_stats[$normalized_status])) {
                $normalized_stats[$normalized_status] = 0;
            }
            $normalized_stats[$normalized_status] += (int)($row['pocet'] ?? 0);
        }

        $stats_result = [];
        foreach ($normalized_stats as $status => $count) {
            $stats_result[] = [
                'kontrola_status' => $status,
                'pocet' => $count
            ];
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $stats_result,
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

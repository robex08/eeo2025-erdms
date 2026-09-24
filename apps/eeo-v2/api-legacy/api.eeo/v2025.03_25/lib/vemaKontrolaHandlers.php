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
 * BATCH GET - Načíst kontroly pro víc VEMA záznamů NAJEDNOU (jeden HTTP
 * request místo N) - viz VemaKontrolaCell.js, který si dřív dělal vlastní
 * fetch přes vema-kontrola/get pro KAŽDOU instanci sebe sama. V seskupeném
 * pohledu (Kontrola SML i Kontrola OBJ BETA ve VemaDenik.js) se najednou
 * vykreslí stovky instancí této buňky (jedna na VEMA doklad napříč všemi
 * skupinami na stránce) a každá střílela vlastní request - naměřeno reálně
 * 533 sekvenčních requestů (~25-30s waterfall) na jednu stránku.
 *
 * Vrací jen "case" objekt (bez historie událostí - ta zůstává na
 * vema-kontrola/get, dotahuje se až při otevření popoveru, kdy uživatel
 * skutečně jednu konkrétní historii chce vidět/editovat) - stejně
 * normalizovaný (kontrola_status, metadata) jako handle_vema_kontrola_get.
 *
 * Stejný párovací klíč (typ_zaznamu, vema_id, vema_id_secondary) a stejná
 * normalizace sekundárního ID (vema_normalize_secondary_id) jako
 * handle_vema_kontrola_get, aby výsledek byl 1:1 shodný s tím, co by vrátilo
 * volání get() pro každou položku zvlášť.
 *
 * POST: {token, username, typ_zaznamu, items: [{vema_id, vema_id_secondary?}, ...]}
 * Response: {status, data: {items: {"<vema_id>__<vema_id_secondary>": kontrola|null, ...}}}
 */
function handle_vema_kontrola_batch_get($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $typ_zaznamu = $input['typ_zaznamu'] ?? '';
    $items_raw = isset($input['items']) && is_array($input['items']) ? $input['items'] : [];

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }
    if (!$typ_zaznamu) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí typ_zaznamu']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný token']);
        return;
    }

    // Normalizace + dedup položek - stejný klíč a stejná validace jako
    // handle_vema_kontrola_get výše (vema_normalize_secondary_id).
    $pairs = array(); // "vema_id__secondary" => [vema_id, normalized_secondary]
    foreach ($items_raw as $item) {
        $vema_id = is_array($item) ? ($item['vema_id'] ?? '') : '';
        $vema_id_secondary = is_array($item) ? ($item['vema_id_secondary'] ?? '') : '';
        $vema_id = trim((string)$vema_id);
        if ($vema_id === '') continue;

        $normalized_secondary = vema_normalize_secondary_id($typ_zaznamu, $vema_id_secondary);
        if ($typ_zaznamu === 'faktura' && $normalized_secondary === null) continue;

        $key = $vema_id . '__' . ($normalized_secondary ?? '');
        $pairs[$key] = array($vema_id, $normalized_secondary);
    }

    // Bezpečnostní strop - stejný řád jako u ostatních batch endpointů VEMA
    // modulu (vema-smlouvy/faktury-list, vema-objednavky/faktury-list).
    if (count($pairs) > 1000) {
        $pairs = array_slice($pairs, 0, 1000, true);
    }

    $result = array();
    foreach (array_keys($pairs) as $key) { $result[$key] = null; }

    if (empty($pairs)) {
        http_response_code(200);
        echo json_encode(array('status' => 'success', 'data' => array('items' => new stdClass())));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        TimezoneHelper::setMysqlTimezone($db);

        // Row-constructor IN - jeden dotaz pro celou dávku párů (vema_id,
        // vema_id_secondary), místo N samostatných SELECT (nebo OR řetězce).
        $tuples = implode(',', array_fill(0, count($pairs), '(?,?)'));
        $params = array($typ_zaznamu);
        foreach ($pairs as $pair) {
            $params[] = $pair[0];
            $params[] = $pair[1];
        }

        $sql = "
            SELECT
                k.*,
                u1.jmeno as kontroloval_jmeno,
                u1.prijmeni as kontroloval_prijmeni,
                u2.jmeno as vytvoril_jmeno,
                u2.prijmeni as vytvoril_prijmeni
            FROM `25v_kontrola_metadata` k
            LEFT JOIN `25_uzivatele` u1 ON k.kontroloval_uzivatel_id = u1.id
            LEFT JOIN `25_uzivatele` u2 ON k.vytvoril_uzivatel_id = u2.id
            WHERE k.typ_zaznamu = ? AND (k.vema_id, k.vema_id_secondary) IN ($tuples)
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $byKey = array();
        foreach ($rows as $row) {
            $key = $row['vema_id'] . '__' . ($row['vema_id_secondary'] ?? '');
            if (!empty($row['metadata_json'])) {
                $row['metadata'] = json_decode($row['metadata_json'], true);
            }
            $row['kontrola_status'] = vema_normalize_status_for_api($row['kontrola_status'] ?? null);
            $byKey[$key] = $row;
        }

        foreach ($pairs as $key => $pair) {
            $result[$key] = isset($byKey[$key]) ? $byKey[$key] : null;
        }

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array('items' => empty($result) ? new stdClass() : $result),
        ));
    } catch (Exception $e) {
        error_log("VEMA kontrola/batch-get error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání kontrol: ' . $e->getMessage(),
        ));
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
 * RUČNÍ VAZBA - Uživatel ručně označí, který EEO doklad je ten správný
 * (přebíjí automatický odhad "nejspíš tahle faktura" ve VemaDenik.js).
 *
 * Ukládá se do stejného sloupce `metadata_json` v `25v_kontrola_metadata`
 * jako ostatní metadata kontroly (klíč `rucni_vazba`), vázané na stabilní
 * VEMA ID (cfak+firma) - přežije reimport dat z VEMA stejně jako kontrola
 * samotná. Na rozdíl od handle_vema_kontrola_save mění POUZE tento jeden
 * klíč v metadata_json a nesahá na kontrola_status/poznamka/priorita, aby
 * souběžná úprava "kontroly" (stav/poznámka) o ruční vazbu nepřišla a naopak.
 *
 * POST: {token, username, vema_id, vema_id_secondary, action: 'set'|'clear',
 *        eeo_typ?, eeo_id?, eeo_cislo?, cislo_objednavky?}
 * (typ_zaznamu je zatím vždy 'faktura' - jediné místo, které to používá)
 */
function handle_vema_kontrola_rucni_vazba_save($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $typ_zaznamu = $input['typ_zaznamu'] ?? 'faktura';
    $vema_id = trim((string)($input['vema_id'] ?? ''));
    $vema_id_secondary = $input['vema_id_secondary'] ?? '';
    $action = $input['action'] ?? 'set';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }
    if (!$vema_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí vema_id']);
        return;
    }
    if (!in_array($action, ['set', 'clear', 'reject', 'unreject'], true)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'action musí být set, clear, reject nebo unreject']);
        return;
    }

    $normalized_secondary = vema_normalize_secondary_id($typ_zaznamu, $vema_id_secondary);
    if ($typ_zaznamu === 'faktura' && $normalized_secondary === null) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Pro typ faktura je povinné vema_id_secondary (firma)']);
        return;
    }

    if ($action !== 'clear') {
        $eeo_id = $input['eeo_id'] ?? null;
        if ($eeo_id === null || $eeo_id === '') {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Chybí eeo_id']);
            return;
        }
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
        $now = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');

        $new_vazba = null;
        if ($action === 'set') {
            $new_vazba = [
                'eeo_typ' => (string)($input['eeo_typ'] ?? 'eeo_faktura'),
                'eeo_id' => $input['eeo_id'],
                'eeo_cislo' => $input['eeo_cislo'] ?? null,
                'cislo_objednavky' => $input['cislo_objednavky'] ?? null,
                'oznacil_uzivatel_id' => $user_id,
                'dt' => $now,
            ];
        }

        $check = $db->prepare("SELECT * FROM `25v_kontrola_metadata` WHERE typ_zaznamu = ? AND vema_id = ? AND vema_id_secondary = ?");
        $check->execute([$typ_zaznamu, $vema_id, $normalized_secondary]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);

        $metadata = ($existing && !empty($existing['metadata_json'])) ? json_decode($existing['metadata_json'], true) : [];
        if (!is_array($metadata)) $metadata = [];
        $previous_vazba = $metadata['rucni_vazba'] ?? null;

        // Zamítnuté EEO doklady ("tenhle doklad k VEMA faktuře nepatří") -
        // klíčované stringovým eeo_id, jak ho posílá FE (int ID EEO faktury,
        // nebo 'rp_<id>' u položky ročního poplatku).
        $zamitnute = (isset($metadata['zamitnute_vazby']) && is_array($metadata['zamitnute_vazby'])) ? $metadata['zamitnute_vazby'] : [];
        $eeo_key = isset($input['eeo_id']) ? (string)$input['eeo_id'] : '';
        $udalost_typ = 'RUCNI_VAZBA';
        $udalost_pred = $previous_vazba;
        $udalost_po = $new_vazba;

        if ($action === 'reject') {
            $zamitnute[$eeo_key] = [
                'eeo_typ' => (string)($input['eeo_typ'] ?? 'eeo_faktura'),
                'eeo_id' => $input['eeo_id'],
                'eeo_cislo' => $input['eeo_cislo'] ?? null,
                'oznacil_uzivatel_id' => $user_id,
                'dt' => $now,
            ];
            if ($previous_vazba && (string)($previous_vazba['eeo_id'] ?? '') === $eeo_key) {
                $metadata['rucni_vazba'] = null;
            }
            $udalost_typ = 'ZAMITNUTI_VAZBY';
            $udalost_pred = null;
            $udalost_po = $zamitnute[$eeo_key];
        } elseif ($action === 'unreject') {
            $udalost_typ = 'ZAMITNUTI_VAZBY';
            $udalost_pred = $zamitnute[$eeo_key] ?? null;
            $udalost_po = null;
            unset($zamitnute[$eeo_key]);
        } else {
            $metadata['rucni_vazba'] = $new_vazba;
            if ($action === 'set') unset($zamitnute[$eeo_key]);
        }
        $metadata['zamitnute_vazby'] = $zamitnute;
        $metadata_json = json_encode($metadata, JSON_UNESCAPED_UNICODE);

        if ($existing) {
            $stmt = $db->prepare("
                UPDATE `25v_kontrola_metadata` SET
                    metadata_json = ?,
                    upravil_uzivatel_id = ?,
                    dt_upravy = ?
                WHERE id = ?
            ");
            $stmt->execute([$metadata_json, $user_id, $now, $existing['id']]);
            $result_id = $existing['id'];
        } else {
            $stmt = $db->prepare("
                INSERT INTO `25v_kontrola_metadata` (
                    typ_zaznamu, vema_id, vema_id_secondary,
                    kontrola_status, priorita, metadata_json,
                    kontroloval_uzivatel_id, dt_kontroly,
                    vytvoril_uzivatel_id, dt_vytvoreni
                ) VALUES (?, ?, ?, 'nezkontrolovano', 0, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$typ_zaznamu, $vema_id, $normalized_secondary, $metadata_json, $user_id, $now, $user_id, $now]);
            $result_id = $db->lastInsertId();
        }

        // Historie - stejná tabulka/mechanismus jako u ZMENA_STAVU apod.,
        // takže výběr správného dokladu má vlastní auditní stopu (kdo, kdy,
        // co bylo předtím) a nic se při dalším ručním výběru neztrácí.
        // stav_pred/stav_po jsou VARCHAR(50) (sdílené se ZMENA_STAVU/ZMENA_PRIORITY),
        // takže sem jde jen stručný popis - celý JSON výběru je v text_zprava (TEXT).
        $vazba_summary = function ($v) use ($udalost_typ) {
            if (!$v) return 'žádný';
            $cislo = $v['eeo_cislo'] ?? $v['eeo_id'] ?? '?';
            return mb_substr(($udalost_typ === 'ZAMITNUTI_VAZBY' ? 'zamítnut ' : 'EEO faktura ') . $cislo, 0, 50);
        };
        vema_add_udalost(
            $db,
            $result_id,
            // Historie.typ je ENUM bez samostatné hodnoty pro zamítnutí -
            // zapisuje se pod RUCNI_VAZBA, druh akce je v JSON (akce).
            'RUCNI_VAZBA',
            json_encode(['akce' => $action, 'pred' => $udalost_pred, 'po' => $udalost_po], JSON_UNESCAPED_UNICODE),
            $vazba_summary($udalost_pred),
            $vazba_summary($udalost_po),
            $user_id
        );

        $messages = [
            'set' => 'Doklad označen jako správný',
            'clear' => 'Ruční výběr zrušen',
            'reject' => 'Doklad zamítnut',
            'unreject' => 'Zamítnutí dokladu zrušeno',
        ];
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => [
                'id' => $result_id,
                'rucni_vazba' => $metadata['rucni_vazba'] ?? null,
                'zamitnute_vazby' => array_values($zamitnute),
            ],
            'message' => $messages[$action],
        ]);

    } catch (Exception $e) {
        error_log("VEMA kontrola/rucni-vazba/save error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při ukládání ruční vazby: ' . $e->getMessage(),
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

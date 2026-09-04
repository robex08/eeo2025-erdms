<?php
/**
 * VEMA Deník - API Handlers
 * PHP 5.6 kompatibilní, MariaDB
 * 
 * Endpointy pro správu importu dat z VEMA systému
 * 
 * Tabulky:
 * - 25v_firmyupl - Firmy (dodavatelé/odběratelé)
 * - 25v_fpazahl - Faktury přijaté
 * - 25v_smla - Smlouvy
 * 
 * @author EEO Development Team
 * @date 2026-06-22
 */

require_once __DIR__ . '/dbconfig.php';
require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/vemaPropojenHandlers.php';

// ============================================================================
// 1. SEZNAM FIREM - GET /vema/firmy/list
// ============================================================================

/**
 * Seznam všech firem z VEMA systému
 * POST /vema/firmy/list
 * 
 * Parametry:
 * - token (string, required)
 * - username (string, required)
 * - limit (int, optional, default 1000)
 * - offset (int, optional, default 0)
 * - search (string, optional) - hledání v názvu, IČO
 * - stav (string, optional) - 'aktivni', 'smazano', 'neaktivni'
 * 
 * Response: {status, data: [...], count, pagination}
 */
function handle_vema_firmy_list($input, $config, $queries) {
    // Validace metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // Autentizace
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Uživatelské jméno neodpovídá tokenu'));
        return;
    }

    // Kontrola oprávnění VEMA_VIEW
    if (!has_permission($token_data['id'], 'VEMA_VIEW')) {
        http_response_code(403);
        echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k zobrazení Deníku VEMA'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // Nastavit timezone
        TimezoneHelper::setMysqlTimezone($db);

        // Parametry
        $limit = isset($input['limit']) ? (int)$input['limit'] : 50000;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        $search = isset($input['search']) ? trim($input['search']) : '';
        $stav = isset($input['stav']) ? $input['stav'] : '';

        // Buildování WHERE podmínek
        $where = array();
        $params = array();

        // Výchozí chování: vracet pouze aktivní záznamy.
        $where[] = "f.stav_zaznamu = 'aktivni'";

        if ($search !== '') {
            // Fulltext search přes klíčové sloupce firem
            $where[] = "(f.nazev LIKE ? OR f.ico LIKE ? OR f.email LIKE ?
                        OR f.regcisph LIKE ? OR f.ulice LIKE ? OR f.obec LIKE ?
                        OR f.telefon LIKE ? OR f.mobil LIKE ? OR f.web LIKE ?
                        OR f.dnazev LIKE ? OR f.dic LIKE ?)";
            $search_param = '%' . $search . '%';
            $params[] = $search_param; // nazev
            $params[] = $search_param; // ico
            $params[] = $search_param; // email
            $params[] = $search_param; // regcisph
            $params[] = $search_param; // ulice
            $params[] = $search_param; // obec
            $params[] = $search_param; // telefon
            $params[] = $search_param; // mobil
            $params[] = $search_param; // web
            $params[] = $search_param; // dnazev
            $params[] = $search_param; // dic
        }

        if ($stav !== '') {
            // Parametr stav mapujeme na interní stav lifecycle (stav_zaznamu).
            $where[] = "f.stav_zaznamu = ?";
            $params[] = $stav;
        }

        $where_sql = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

        // Celkový počet
        $count_sql = "SELECT COUNT(*) as total FROM `" . TBL_VEMA_FIRMYUPL . "` f " . $where_sql;
        $count_stmt = $db->prepare($count_sql);
        $count_stmt->execute($params);
        $total = $count_stmt->fetchColumn();

        // Data s JOINem na kontrolu
        $sql = "SELECT
                    f.id, f.firma, f.nazev, f.ico, f.regcisph,
                    f.ulice, f.cp, f.obec, f.psc,
                    f.telefon, f.mobil, f.email, f.web,
                    f.dnazev, f.dic,
                    f.stav, f.import_batch_id,
                    f.dt_importu, f.dt_posledni_aktualizace,
                    f.dt_vytvoreni,
                    COALESCE(k.kontrola_status, 'nezkontrolovano') as kontrola
                FROM `" . TBL_VEMA_FIRMYUPL . "` f
                    LEFT JOIN `25v_kontrola_metadata` k
                         ON k.typ_zaznamu = 'firma'
                        AND k.vema_id COLLATE utf8mb4_unicode_ci = f.firma
                " . $where_sql . "
                ORDER BY CASE k.kontrola_status
                    WHEN 'ma_problem' THEN 1
                    WHEN 'pozastaveno' THEN 2
                    WHEN 'v_kontrole' THEN 3
                    WHEN 'nezkontrolovano' THEN 4
                    WHEN 'zkontrolovano' THEN 5
                    ELSE 6
                END ASC, f.nazev ASC
                LIMIT $limit OFFSET $offset";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $firmy = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $firmy,
            'count' => count($firmy),
            'pagination' => array(
                'total' => (int)$total,
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $total
            ),
            'message' => 'Data načtena úspěšně'
        ));

    } catch (Exception $e) {
        error_log("VEMA Firmy List Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání firem: ' . $e->getMessage()
        ));
    }
}

// ============================================================================
// 2. SEZNAM FAKTUR - GET /vema/faktury/list
// ============================================================================

/**
 * Seznam všech faktur z VEMA systému
 * POST /vema/faktury/list
 * 
 * Parametry:
 * - token (string, required)
 * - username (string, required)
 * - limit (int, optional, default 500)
 * - offset (int, optional, default 0)
 * - firma (int, optional) - filtr na ID firmy
 * - stav (int, optional) - filtr na stav faktury
 * - vlast (int, optional) - filtr na vlastníka
 * - usek (int, optional) - filtr na úsek
 * - search (string, optional) - hledání v čísle faktury, názvu
 * 
 * Response: {status, data: [...], count, pagination}
 */
function handle_vema_faktury_list($input, $config, $queries) {
    // Validace metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // Autentizace
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Uživatelské jméno neodpovídá tokenu'));
        return;
    }

    // Kontrola oprávnění VEMA_VIEW
    if (!has_permission($token_data['id'], 'VEMA_VIEW')) {
        http_response_code(403);
        echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k zobrazení Deníku VEMA'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // Nastavit timezone
        TimezoneHelper::setMysqlTimezone($db);

        // Parametry
        $limit = isset($input['limit']) ? (int)$input['limit'] : 50000;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        $firma = isset($input['firma']) ? (int)$input['firma'] : null;
        $stav = isset($input['stav']) ? (int)$input['stav'] : null;
        $vlast = isset($input['vlast']) ? (int)$input['vlast'] : null;
        $usek = isset($input['usek']) ? (int)$input['usek'] : null;
        $search = isset($input['search']) ? trim($input['search']) : '';

        // Buildování WHERE podmínek
        $where = array();
        $params = array();

        // Vždy filtrovat jen aktivní záznamy
        $where[] = "f.stav_zaznamu = 'aktivni'";

        if ($firma !== null) {
            $where[] = "f.firma = ?";
            $params[] = $firma;
        }

        if ($stav !== null) {
            $where[] = "f.stav = ?";
            $params[] = $stav;
        }

        if ($vlast !== null) {
            $where[] = "f.vlast = ?";
            $params[] = $vlast;
        }

        // POZNÁMKA: sloupec 'usek' neexistuje v tabulce 25v_fpazahl
        // if ($usek !== null) {
        //     $where[] = "f.usek = ?";
        //     $params[] = $usek;
        // }

        if ($search !== '') {
            // Fulltext search přes klíčové sloupce faktur
                        // Poznámka: JOIN sloupce (firmy.nazev) nelze použít v WHERE - filtrují se až v aplikační vrstvě.
                        // Ev. číslo smlouvy bereme přes EXISTS do 25v_smla (f.csml -> s.csml, s.ecsml).
            $where[] = "(f.cfak LIKE ? OR f.nazevfak LIKE ? OR f.cdok LIKE ? 
                        OR f.csml LIKE ? OR f.cobj LIKE ? OR f.typdok LIKE ? 
                        OR f.ksymb LIKE ? OR f.vsymb LIKE ? OR f.ssymb LIKE ?
                        OR f.dicp LIKE ? OR f.cfakdupl LIKE ? OR f.dobrdok LIKE ?
                                                OR f.dobrfak LIKE ?
                                                OR EXISTS (
                                                        SELECT 1
                                                        FROM `" . TBL_VEMA_SMLA . "` s_map
                                                        WHERE s_map.csml = f.csml
                                                            AND s_map.ecsml LIKE ?
                                                            AND s_map.stav_zaznamu = 'aktivni'
                                                ))";
            $search_param = '%' . $search . '%';
            $params[] = $search_param; // cfak
            $params[] = $search_param; // nazevfak
            $params[] = $search_param; // cdok
            $params[] = $search_param; // csml
            $params[] = $search_param; // cobj
            $params[] = $search_param; // typdok
            $params[] = $search_param; // ksymb
            $params[] = $search_param; // vsymb
            $params[] = $search_param; // ssymb
            $params[] = $search_param; // dicp
            $params[] = $search_param; // cfakdupl
            $params[] = $search_param; // dobrdok
            $params[] = $search_param; // dobrfak
            $params[] = $search_param; // ecsml z 25v_smla
        }

        $where_sql = 'WHERE ' . implode(' AND ', $where);

        // Celkový počet
        $count_sql = "SELECT COUNT(*) as total 
                      FROM `" . TBL_VEMA_FPAZAHL . "` f 
                      " . $where_sql;
        $count_stmt = $db->prepare($count_sql);
        $count_stmt->execute($params);
        $total = $count_stmt->fetchColumn();

        // Data s JOINem na firmy, smlouvy a kontrolu
        $sql = "SELECT
                    f.id, f.stav, f.firma, f.cfak, f.cdok, f.nazevfak,
                    f.typdok, f.ksymb, f.vsymb,
                    f.datpri, f.dof, f.spl,
                    f.csml, f.cobj, f.vlast,
                    f.celkem, f.cplatby, f.czbyva,
                    f.stav_zaznamu, f.import_batch_id,
                    f.dt_importu, f.dt_posledni_aktualizace,
                    firmy.nazev as firma_nazev,
                    firmy.ico as firma_ico,
                    smlouvy.ecsml as smlouva_ecsml,
                    COALESCE(k.kontrola_status, 'nezkontrolovano') as kontrola
                FROM `" . TBL_VEMA_FPAZAHL . "` f
                    LEFT JOIN `" . TBL_VEMA_FIRMYUPL . "` firmy
                         ON f.firma = firmy.firma
                        AND firmy.stav_zaznamu = 'aktivni'
                    LEFT JOIN `" . TBL_VEMA_SMLA . "` smlouvy
                         ON f.csml = smlouvy.csml
                        AND smlouvy.stav_zaznamu = 'aktivni'
                    LEFT JOIN `25v_kontrola_metadata` k
                         ON k.typ_zaznamu = 'faktura'
                        AND k.vema_id COLLATE utf8mb4_unicode_ci = f.cfak
                        AND (k.vema_id_secondary COLLATE utf8mb4_unicode_ci = f.firma OR k.vema_id_secondary = '')
                " . $where_sql . "
                ORDER BY CASE k.kontrola_status
                    WHEN 'ma_problem' THEN 1
                    WHEN 'pozastaveno' THEN 2
                    WHEN 'v_kontrole' THEN 3
                    WHEN 'nezkontrolovano' THEN 4
                    WHEN 'zkontrolovano' THEN 5
                    ELSE 6
                END ASC, f.datpri DESC, f.cfak DESC
                LIMIT $limit OFFSET $offset";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $faktury = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Post-processing: formátování čísla objednávky
        foreach ($faktury as &$faktura) {
            // Formátování čísla objednávky: O-1234/2026 → O-1234/75030926/2026
            // POUZE pro čísla začínající O-, vložit KONSTANTU 75030926
            if (!empty($faktura['cobj'])) {
                $cobj = trim($faktura['cobj']); // Odstranit bílé znaky na začátku/konci
                
                // Odstranit mezery za O- (např. "O- 0176" → "O-0176")
                $cobj = preg_replace('/^(O-)\s+/i', '$1', $cobj);
                
                // Kontrola, zda začíná O-
                if (stripos($cobj, 'O-') === 0) {
                    $ico_konstanta = '75030926'; // KONSTANTA, ne z firmy!
                    
                    // 1. Pokud má formát O-xxxx/ROK, vložit konstantu doprostřed
                    if (preg_match('/^(O-\d+)\/(\d{4})$/i', $cobj, $matches)) {
                        $prefix = $matches[1]; // např. O-1234
                        $rok = $matches[2];    // např. 2026
                        $faktura['cobj_formatovane'] = $prefix . '/' . $ico_konstanta . '/' . $rok;
                    } 
                    // 2. Pokud má formát O-xxxx-ROK, převést na /konstanta/ formát
                    else if (preg_match('/^(O-\d+)-(\d{2,4})$/i', $cobj, $matches)) {
                        $prefix = $matches[1]; // např. O-1234
                        $rok = $matches[2];    // např. 2026 nebo 26
                        // Rozšířit zkrácený rok 26 → 2026
                        if (strlen($rok) == 2) {
                            $rok = '20' . $rok;
                        }
                        $faktura['cobj_formatovane'] = $prefix . '/' . $ico_konstanta . '/' . $rok;
                    }
                    // 3. Pokud má formát O-xxxROK (bez oddělovače), např. O-01972026
                    else if (preg_match('/^(O-\d+?)(20\d{2})$/i', $cobj, $matches)) {
                        $prefix = $matches[1]; // např. O-0197
                        $rok = $matches[2];    // např. 2026
                        $faktura['cobj_formatovane'] = $prefix . '/' . $ico_konstanta . '/' . $rok;
                    }
                    // Jinak nechat původní
                    else {
                        $faktura['cobj_formatovane'] = $cobj;
                    }
                } else {
                    // Není O-xxxx, nechat původní
                    $faktura['cobj_formatovane'] = $cobj;
                }
            } else {
                $faktura['cobj_formatovane'] = null;
            }
        }
        unset($faktura); // Break reference

        // BULK: Spočítat propojení s EEO pro všechny faktury najednou (4 dotazy místo 4*N)
        $t_start = microtime(true);
        bulk_calculate_vema_propojeni_counts($faktury, $db);
        $t_elapsed = round((microtime(true) - $t_start) * 1000, 2);
        error_log("⚡ VEMA bulk propojení: {$t_elapsed}ms pro " . count($faktury) . " faktur");

        // Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $faktury,
            'count' => count($faktury),
            'pagination' => array(
                'total' => (int)$total,
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $total
            ),
            'message' => 'Data načtena úspěšně'
        ));

    } catch (Exception $e) {
        error_log("VEMA Faktury List Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání faktur: ' . $e->getMessage()
        ));
    }
}

// ============================================================================
// 3. SEZNAM SMLUV - GET /vema/smlouvy/list
// ============================================================================

/**
 * Seznam všech smluv z VEMA systému
 * POST /vema/smlouvy/list
 * 
 * Parametry:
 * - token (string, required)
 * - username (string, required)
 * - limit (int, optional, default 500)
 * - offset (int, optional, default 0)
 * - firma (int, optional) - filtr na ID firmy
 * - typsml (int, optional) - filtr na typ smlouvy
 * - usek (int, optional) - filtr na úsek
 * - search (string, optional) - hledání v čísle smlouvy, názvu
 * 
 * Response: {status, data: [...], count, pagination}
 */
function handle_vema_smlouvy_list($input, $config, $queries) {
    // Validace metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // Autentizace
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Uživatelské jméno neodpovídá tokenu'));
        return;
    }

    // Kontrola oprávnění VEMA_VIEW
    if (!has_permission($token_data['id'], 'VEMA_VIEW')) {
        http_response_code(403);
        echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k zobrazení Deníku VEMA'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // Nastavit timezone
        TimezoneHelper::setMysqlTimezone($db);

        // Parametry
        $limit = isset($input['limit']) ? (int)$input['limit'] : 50000;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        $firma = isset($input['firma']) ? (int)$input['firma'] : null;
        $typsml = isset($input['typsml']) ? (int)$input['typsml'] : null;
        $usek = isset($input['usek']) ? (int)$input['usek'] : null;
        $search = isset($input['search']) ? trim($input['search']) : '';

        // Buildování WHERE podmínek
        $where = array();
        $params = array();

        // Vždy filtrovat jen aktivní záznamy
        $where[] = "s.stav_zaznamu = 'aktivni'";

        if ($firma !== null) {
            $where[] = "s.firma = ?";
            $params[] = $firma;
        }

        if ($typsml !== null) {
            $where[] = "s.typsml = ?";
            $params[] = $typsml;
        }

        if ($usek !== null) {
            $where[] = "s.usek = ?";
            $params[] = $usek;
        }

        if ($search !== '') {
            // Fulltext search přes klíčové sloupce smluv
            // Poznámka: JOIN sloupce (firmy.nazev) nelze použít v WHERE
            $where[] = "(s.csml LIKE ? OR s.nazsml LIKE ? OR s.dnazsml LIKE ? 
                        OR s.ecsml LIKE ? OR s.popis LIKE ? OR s.text LIKE ?)";
            $search_param = '%' . $search . '%';
            $params[] = $search_param; // csml
            $params[] = $search_param; // nazsml
            $params[] = $search_param; // dnazsml
            $params[] = $search_param; // ecsml
            $params[] = $search_param; // popis
            $params[] = $search_param; // text
        }

        $where_sql = 'WHERE ' . implode(' AND ', $where);

        // Celkový počet
        $count_sql = "SELECT COUNT(*) as total FROM `" . TBL_VEMA_SMLA . "` s " . $where_sql;
        $count_stmt = $db->prepare($count_sql);
        $count_stmt->execute($params);
        $total = $count_stmt->fetchColumn();

        // Data s JOINem na firmy a kontrolu
        $sql = "SELECT
                    s.id, s.typsml, s.csml, s.ecsml, s.nazsml, s.firma,
                    s.dnazsml, s.datuzavr, s.datumdo,
                    s.hodnota, s.usek, s.prolsml, s.stavrs,
                    s.stav_zaznamu, s.import_batch_id,
                    s.dt_importu, s.dt_posledni_aktualizace,
                    firmy.nazev as firma_nazev,
                    COALESCE(k.kontrola_status, 'nezkontrolovano') as kontrola
                FROM `" . TBL_VEMA_SMLA . "` s
                    LEFT JOIN `" . TBL_VEMA_FIRMYUPL . "` firmy
                         ON s.firma = firmy.firma
                        AND firmy.stav_zaznamu = 'aktivni'
                    LEFT JOIN `25v_kontrola_metadata` k
                         ON k.typ_zaznamu = 'smlouva'
                        AND k.vema_id COLLATE utf8mb4_unicode_ci = s.csml
                " . $where_sql . "
                ORDER BY CASE k.kontrola_status
                    WHEN 'ma_problem' THEN 1
                    WHEN 'pozastaveno' THEN 2
                    WHEN 'v_kontrole' THEN 3
                    WHEN 'nezkontrolovano' THEN 4
                    WHEN 'zkontrolovano' THEN 5
                    ELSE 6
                END ASC, s.datuzavr DESC, s.csml DESC
                LIMIT $limit OFFSET $offset";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $smlouvy = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $smlouvy,
            'count' => count($smlouvy),
            'pagination' => array(
                'total' => (int)$total,
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $total
            ),
            'message' => 'Data načtena úspěšně'
        ));

    } catch (Exception $e) {
        error_log("VEMA Smlouvy List Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání smluv: ' . $e->getMessage()
        ));
    }
}

// ============================================================================
// 3B. EEO FAKTURY BEZ VEMA VAZBY - POST /vema/faktury/eeo-bez-vema/list
// ============================================================================

/**
 * Seznam EEO faktur, které nemají žádnou vazbu na VEMA import.
 *
 * Vazby testujeme proti aktivním VEMA fakturám:
 * - VS (fa_cislo_vema <-> vsymb) + částka
 * - VEMA kód (fa_vema_kod <-> cdok) + částka
 * - číslo objednávky (cislo_objednavky <-> cobj)
 * - evidenční číslo smlouvy (cislo_smlouvy <-> ecsml přes 25v_smla)
 */
function handle_vema_faktury_eeo_bez_vema_list($input, $config, $queries) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    if (!has_permission($token_data['id'], 'VEMA_VIEW')) {
        http_response_code(403);
        echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k zobrazení Deníku VEMA'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $limit = isset($input['limit']) ? (int)$input['limit'] : 50000;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        $search = isset($input['search']) ? trim($input['search']) : '';

        $where = array();
        $params = array();

        $where[] = "f.aktivni = 1";

        // ⚡ Optimalizace: rozdělené NOT IN podmínky využijí indexy:
        //  - 25v_fpazahl(vsymb, cdok, cobj)
        //  - 25v_smla(ecsml)
        // Sekce hledá EEO faktury, které VEMA vůbec nezná → bez částkové tolerance.
        $where[] = "(
            f.fa_cislo_vema IS NULL OR f.fa_cislo_vema = ''
            OR f.fa_cislo_vema NOT IN (
                SELECT v.vsymb FROM `" . TBL_VEMA_FPAZAHL . "` v
                WHERE v.stav_zaznamu = 'aktivni' AND v.vsymb IS NOT NULL AND v.vsymb != ''
            )
        )";
        $where[] = "(
            f.fa_vema_kod IS NULL OR f.fa_vema_kod = ''
            OR f.fa_vema_kod NOT IN (
                SELECT v.cdok FROM `" . TBL_VEMA_FPAZAHL . "` v
                WHERE v.stav_zaznamu = 'aktivni' AND v.cdok IS NOT NULL AND v.cdok != ''
            )
        )";
        $where[] = "(
            o.cislo_objednavky IS NULL OR o.cislo_objednavky = ''
            OR o.cislo_objednavky NOT IN (
                SELECT v.cobj FROM `" . TBL_VEMA_FPAZAHL . "` v
                WHERE v.stav_zaznamu = 'aktivni' AND v.cobj IS NOT NULL AND v.cobj != ''
            )
        )";
        $where[] = "(
            sm.cislo_smlouvy IS NULL OR sm.cislo_smlouvy = ''
            OR sm.cislo_smlouvy NOT IN (
                SELECT vs.ecsml FROM `" . TBL_VEMA_SMLA . "` vs
                WHERE vs.stav_zaznamu = 'aktivni' AND vs.ecsml IS NOT NULL AND vs.ecsml != ''
            )
        )";

        if ($search !== '') {
            $where[] = "(
                f.fa_cislo_vema LIKE ?
                OR f.fa_vema_kod LIKE ?
                OR o.cislo_objednavky LIKE ?
                OR sm.cislo_smlouvy LIKE ?
                OR JSON_VALUE(o.financovani, '$.cislo_smlouvy') LIKE ?
                OR o.dodavatel_nazev LIKE ?
                OR sm.nazev_firmy LIKE ?
                OR o.dodavatel_ico LIKE ?
                OR sm.ico LIKE ?
                OR CAST(f.id AS CHAR) LIKE ?
            )";
            $search_param = '%' . $search . '%';
            for ($i = 0; $i < 10; $i++) {
                $params[] = $search_param;
            }
        }

        $where_sql = 'WHERE ' . implode(' AND ', $where);

        $count_sql = "SELECT COUNT(*) as total
                      FROM `" . TBL_FAKTURY . "` f
                      LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
                      LEFT JOIN `" . TBL_SMLOUVY . "` sm ON f.smlouva_id = sm.id
                      " . $where_sql;
        $count_stmt = $db->prepare($count_sql);
        $count_stmt->execute($params);
        $total = (int)$count_stmt->fetchColumn();

        $sql = "SELECT
                    CONCAT('EEO-', f.id) as id,
                    f.id as eeo_faktura_id,
                    NULL as firma,
                    f.fa_cislo_vema as cfak,
                    f.fa_cislo_vema as vsymb,
                    f.fa_vema_kod as cdok,
                    COALESCE(NULLIF(o.predmet, ''), NULLIF(sm.nazev_smlouvy, ''), f.fa_cislo_vema) as nazevfak,
                    COALESCE(NULLIF(o.dodavatel_nazev, ''), NULLIF(sm.nazev_firmy, '')) as firma_nazev,
                    COALESCE(NULLIF(o.dodavatel_ico, ''), NULLIF(sm.ico, '')) as firma_ico,
                    f.fa_castka as celkem,
                    f.fa_datum_vystaveni as dof,
                    f.fa_datum_doruceni as datpri,
                    f.fa_datum_splatnosti as spl,
                    o.cislo_objednavky as cobj,
                    o.cislo_objednavky as cobj_formatovane,
                    sm.cislo_smlouvy as csml,
                    sm.cislo_smlouvy as smlouva_ecsml,
                    f.stav as stav_zaznamu,
                    NULL as dt_importu,
                    0 as pocet_objednavek,
                    0 as pocet_faktur,
                    0 as pocet_smluv,
                    0 as pocet_rocnich_poplatku,
                    1 as _isEeoOnly
                FROM `" . TBL_FAKTURY . "` f
                LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
                LEFT JOIN `" . TBL_SMLOUVY . "` sm ON f.smlouva_id = sm.id
                " . $where_sql . "
                ORDER BY f.id DESC
                LIMIT $limit OFFSET $offset";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $rows,
            'count' => count($rows),
            'pagination' => array(
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $total
            ),
            'message' => 'Data načtena úspěšně'
        ));
    } catch (Exception $e) {
        error_log('VEMA EEO bez VEMA list error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání EEO faktur bez VEMA vazby: ' . $e->getMessage()
        ));
    }
}

// ============================================================================
// 4. IMPORT DAT - POST /vema/import/upload
// ============================================================================

/**
 * Import XLSX souborů z VEMA systému
 * POST /vema/import/upload
 * 
 * Parametry:
 * - token (string, required)
 * - username (string, required)
 * - files[] (multipart, required) - XLSX soubory (firmyupl.xlsx, fpazahl.xlsx, smla.xlsx)
 * 
 * Response: {status, message, imported_counts: {firmy, faktury, smlouvy}, batch_id}
 * 
 * TODO: Implementace Excel parsingu a bulk insertu
 */
function handle_vema_import_upload($input, $config, $queries) {
    // Validace metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // Autentizace
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Uživatelské jméno neodpovídá tokenu'));
        return;
    }

    // Kontrola oprávnění VEMA_VIEW
    if (!has_permission($token_data['id'], 'VEMA_VIEW')) {
        http_response_code(403);
        echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k importu Deníku VEMA'));
        return;
    }

    try {
        // DB připojení
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // Nastavit timezone
        TimezoneHelper::setMysqlTimezone($db);

        // Získat data ze vstupu
        $firmyupl = isset($input['firmyupl']) ? $input['firmyupl'] : null;
        $fpazahl = isset($input['fpazahl']) ? $input['fpazahl'] : null;
        $smla = isset($input['smla']) ? $input['smla'] : null;

        // ====== DEBUG: START IMPORT ======
        error_log("╔═══════════════════════════════════════════════════════════════");
        error_log("║ 🚀 VEMA IMPORT START");
        error_log("║ User: " . $username . " (ID: " . $token_data['id'] . ")");
        error_log("║ Timestamp: " . date('Y-m-d H:i:s'));
        error_log("╠═══════════════════════════════════════════════════════════════");

        // Validace - všechna 3 pole musí být přítomna a neprázdna
        if (!$firmyupl || !is_array($firmyupl) || count($firmyupl) === 0) {
            error_log("║ ❌ CHYBA: Chybí nebo jsou prázdná data pro firmy (firmyupl)");
            error_log("║    - Typ: " . gettype($firmyupl));
            error_log("║    - Je pole: " . (is_array($firmyupl) ? 'ANO' : 'NE'));
            error_log("║    - Počet prvků: " . (is_array($firmyupl) ? count($firmyupl) : 'N/A'));
            error_log("╚═══════════════════════════════════════════════════════════════");
            throw new Exception('Chybí nebo jsou prázdná data pro firmy (firmyupl)');
        }
        if (!$fpazahl || !is_array($fpazahl) || count($fpazahl) === 0) {
            error_log("║ ❌ CHYBA: Chybí nebo jsou prázdná data pro faktury (fpazahl)");
            error_log("║    - Typ: " . gettype($fpazahl));
            error_log("║    - Je pole: " . (is_array($fpazahl) ? 'ANO' : 'NE'));
            error_log("║    - Počet prvků: " . (is_array($fpazahl) ? count($fpazahl) : 'N/A'));
            error_log("╚═══════════════════════════════════════════════════════════════");
            throw new Exception('Chybí nebo jsou prázdná data pro faktury (fpazahl)');
        }
        if (!$smla || !is_array($smla) || count($smla) === 0) {
            error_log("║ ❌ CHYBA: Chybí nebo jsou prázdná data pro smlouvy (smla)");
            error_log("║    - Typ: " . gettype($smla));
            error_log("║    - Je pole: " . (is_array($smla) ? 'ANO' : 'NE'));
            error_log("║    - Počet prvků: " . (is_array($smla) ? count($smla) : 'N/A'));
            error_log("╚═══════════════════════════════════════════════════════════════");
            throw new Exception('Chybí nebo jsou prázdná data pro smlouvy (smla)');
        }

        // ====== DEBUG: DATA INFO ======
        error_log("║ 📊 VALIDACE DAT - OK");
        error_log("║    ├─ Firmy (firmyupl): " . count($firmyupl) . " záznamů");
        error_log("║    ├─ Faktury (fpazahl): " . count($fpazahl) . " záznamů");
        error_log("║    └─ Smlouvy (smla): " . count($smla) . " záznamů");
        error_log("║");
        error_log("║ 🔍 UKÁZKA DAT (první záznamy):");
        
        // Ukázka firmy
        if (count($firmyupl) > 0) {
            $sample = $firmyupl[0];
            error_log("║    📌 Firma #1:");
            error_log("║       - firma: " . ($sample['firma'] ?? 'null'));
            error_log("║       - nazev: " . ($sample['nazev'] ?? 'null'));
            error_log("║       - ico: " . ($sample['ico'] ?? 'null'));
            error_log("║       - Sloupců celkem: " . count($sample));
        }
        
        // Ukázka faktury
        if (count($fpazahl) > 0) {
            $sample = $fpazahl[0];
            error_log("║    📌 Faktura #1:");
            error_log("║       - firma: " . ($sample['firma'] ?? 'null'));
            error_log("║       - cfak: " . ($sample['cfak'] ?? 'null'));
            error_log("║       - nazevfak: " . ($sample['nazevfak'] ?? 'null'));
            error_log("║       - Sloupců celkem: " . count($sample));
        }
        
        // Ukázka smlouvy
        if (count($smla) > 0) {
            $sample = $smla[0];
            error_log("║    📌 Smlouva #1:");
            error_log("║       - firma: " . ($sample['firma'] ?? 'null'));
            error_log("║       - csml: " . ($sample['csml'] ?? 'null'));
            error_log("║       - nazsml: " . ($sample['nazsml'] ?? 'null'));
            error_log("║       - Sloupců celkem: " . count($sample));
        }
        error_log("╠═══════════════════════════════════════════════════════════════");

        // Generování batch_id
        $batch_id = date('Ymd_His') . '_' . $token_data['id'];
        $dt_importu = date('Y-m-d H:i:s');
        $user_id = $token_data['id'];
        
        error_log("║ 🎫 BATCH ID: " . $batch_id);
        error_log("║ 📅 DATUM IMPORTU: " . $dt_importu);
        error_log("╠═══════════════════════════════════════════════════════════════");

        error_log("║ 🎫 BATCH ID: " . $batch_id);
        error_log("║ 📅 DATUM IMPORTU: " . $dt_importu);
        error_log("╠═══════════════════════════════════════════════════════════════");

        // ====== START TRANSACTION ======
        error_log("║ 🔒 START TRANSACTION");
        $db->beginTransaction();

        // ===== 1. IMPORT FIRMYUPL =====
        error_log("║");
        error_log("║ ┌─────────────────────────────────────────────────────────────");
        error_log("║ │ 1️⃣  IMPORT FIRMYUPL");
        error_log("║ │ Celkem záznamů: " . count($firmyupl));
        error_log("║ └─────────────────────────────────────────────────────────────");
        
        $firmy_inserted = 0;
        $firmy_errors = array();
        $total_firmy = count($firmyupl);
        
        foreach ($firmyupl as $index => $row) {
            // Mapování Excel sloupců na DB sloupce
            $sql = "INSERT INTO `" . TBL_VEMA_FIRMYUPL . "` (
                firma, nazev, ico, icodl, rocis, regcisph, zaplf, koplf,
                sidlo, fakt, dodav, ulice, cp, obec, psc, posta, stat,
                telefon, mobil, fax, email, web, datschr, dnazev,
                dul, pln, odb, dod, druhorg, ins, stara, prfyz,
                dgdpr, pozn, souhlas, zakaz, redgdpr, txtgdpr, dic, hod,
                stav, stav_zaznamu, import_batch_id, dt_importu, vytvoril_uzivatel_id, dt_vytvoreni
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                'aktivni', 'aktivni', ?, ?, ?, NOW()
            ) ON DUPLICATE KEY UPDATE
                nazev=VALUES(nazev), ico=VALUES(ico), icodl=VALUES(icodl),
                rocis=VALUES(rocis), regcisph=VALUES(regcisph), zaplf=VALUES(zaplf),
                koplf=VALUES(koplf), sidlo=VALUES(sidlo), fakt=VALUES(fakt),
                dodav=VALUES(dodav), ulice=VALUES(ulice), cp=VALUES(cp),
                obec=VALUES(obec), psc=VALUES(psc), posta=VALUES(posta),
                stat=VALUES(stat), telefon=VALUES(telefon), mobil=VALUES(mobil),
                fax=VALUES(fax), email=VALUES(email), web=VALUES(web),
                datschr=VALUES(datschr), dnazev=VALUES(dnazev), dul=VALUES(dul),
                pln=VALUES(pln), odb=VALUES(odb), dod=VALUES(dod),
                druhorg=VALUES(druhorg), ins=VALUES(ins), stara=VALUES(stara),
                prfyz=VALUES(prfyz), dgdpr=VALUES(dgdpr), pozn=VALUES(pozn),
                souhlas=VALUES(souhlas), zakaz=VALUES(zakaz), redgdpr=VALUES(redgdpr),
                txtgdpr=VALUES(txtgdpr), dic=VALUES(dic), hod=VALUES(hod),
                stav='aktivni',
                stav_zaznamu='aktivni',
                import_batch_id=VALUES(import_batch_id),
                dt_posledni_aktualizace=NOW(),
                aktualizoval_uzivatel_id=VALUES(vytvoril_uzivatel_id)";

            try {
                $stmt = $db->prepare($sql);
                $stmt->execute(array(
                    $row['firma'] ?? null,
                    $row['nazev'] ?? null,
                    $row['ico'] ?? null,
                    $row['icodl'] ?? null,
                    $row['rocis'] ?? null,
                    $row['regcisph'] ?? null,
                    $row['zaplf'] ?? null,
                    $row['koplf'] ?? null,
                    $row['sidlo'] ?? 0,
                    $row['fakt'] ?? 0,
                    $row['dodav'] ?? 0,
                    $row['ulice'] ?? null,
                    $row['cp'] ?? null,
                    $row['obec'] ?? null,
                    $row['psc'] ?? null,
                    $row['posta'] ?? null,
                    $row['stat'] ?? null,
                    $row['telefon'] ?? null,
                    $row['mobil'] ?? null,
                    $row['fax'] ?? null,
                    $row['email'] ?? null,
                    $row['web'] ?? null,
                    $row['datschr'] ?? null,
                    $row['dnazev'] ?? null,
                    $row['dul'] ?? null,
                    $row['pln'] ?? null,
                    $row['odb'] ?? null,
                    $row['dod'] ?? null,
                    $row['druhorg'] ?? null,
                    $row['ins'] ?? null,
                    $row['stara'] ?? null,
                    $row['prfyz'] ?? null,
                    $row['dgdpr'] ?? null,
                    $row['pozn'] ?? null,
                    $row['souhlas'] ?? null,
                    $row['zakaz'] ?? null,
                    $row['redgdpr'] ?? 0,
                    $row['txtgdpr'] ?? null,
                    $row['dic'] ?? null,
                    $row['hod'] ?? null,
                    $batch_id,
                    $dt_importu,
                    $user_id
                ));
                $firmy_inserted++;
                
                // Progress každých 50 záznamů
                if (($index + 1) % 50 === 0 || ($index + 1) === $total_firmy) {
                    $percent = round((($index + 1) / $total_firmy) * 100);
                    error_log("║    Progress: " . ($index + 1) . "/" . $total_firmy . " ($percent%)");
                }
            } catch (PDOException $e) {
                $firmy_errors[] = array(
                    'index' => $index + 1,
                    'data' => array(
                        'firma' => $row['firma'] ?? null,
                        'nazev' => $row['nazev'] ?? null,
                        'ico' => $row['ico'] ?? null
                    ),
                    'error' => $e->getMessage(),
                    'sql_state' => $e->getCode()
                );
                // Logovat první chybu detailně
                if (count($firmy_errors) === 1) {
                    error_log("║    ⚠️  PRVNÍ CHYBA při INSERT:");
                    error_log("║       - Záznam #" . ($index + 1));
                    error_log("║       - SQL State: " . $e->getCode());
                    error_log("║       - Chyba: " . $e->getMessage());
                    error_log("║       - Data: firma=" . ($row['firma'] ?? 'null') . ", nazev=" . ($row['nazev'] ?? 'null'));
                }
            }
        }
        
        error_log("║    ✅ Firmyupl: Úspěšně vloženo " . $firmy_inserted . "/" . $total_firmy . " záznamů");
        if (count($firmy_errors) > 0) {
            error_log("║    ⚠️  Chyby: " . count($firmy_errors) . " záznamů se nepodařilo vložit");
        }

        // ===== 2. IMPORT FPAZAHL (Faktury) =====
        error_log("║");
        error_log("║ ┌─────────────────────────────────────────────────────────────");
        error_log("║ │ 2️⃣  IMPORT FPAZAHL (Faktury)");
        error_log("║ │ Celkem záznamů: " . count($fpazahl));
        error_log("║ └─────────────────────────────────────────────────────────────");
        
        $faktury_inserted = 0;
        $faktury_errors = array();
        $total_faktury = count($fpazahl);
        
        foreach ($fpazahl as $index => $row) {
            $sql = "INSERT INTO `" . TBL_VEMA_FPAZAHL . "` (
                stav, firma, cfak, storno, cdok, dicp, likdok, cfakdupl,
                nazevfak, typdok, dobrdok, dobrfak, ksymb, vsymb, ssymb,
                uhrada, zadrz, bancisn, bancisf, tuzzahr, firmapuv,
                datpri, dof, spl, plndod, datuskut, rmzu, rmzustor,
                adr, csml, cdodsml, cobj, cpperf, fpzadav, vlast, fakmist,
                budejsd, dopr, douct, zauct, zauctlik, zauctpst, zauctlst,
                pracvd, cind, ucetd, zak, difpl, cdokrozp, datrozp,
                stavwkf, kdoschfp, fpzadat, datschvz, fpprik, datschvp,
                fpsprozp, datschvs, fpzodpov, datschvu, idproc, datpros,
                odkud, fpjs, link, idext, datz, datu, text, pripoj, dzap,
                splzadr, stav1, stav2, stav3, cpredmet, cprir, celkem,
                cdobrop, czdobrop, czalohy, cplatby, czbyva, cprepl,
                csaldo, cklikv, czlikv, cdodlist, cpoz, czadr, cnezadr,
                cprzal, radkylik, dob, dodlist, poz, zadr, vyuc, sdok, prilohy,
                stav_zaznamu, import_batch_id, dt_importu, vytvoril_uzivatel_id, dt_vytvoreni
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                'aktivni', ?, ?, ?, NOW()
            ) ON DUPLICATE KEY UPDATE
                stav=VALUES(stav), storno=VALUES(storno), cdok=VALUES(cdok), dicp=VALUES(dicp),
                likdok=VALUES(likdok), cfakdupl=VALUES(cfakdupl), nazevfak=VALUES(nazevfak),
                typdok=VALUES(typdok), dobrdok=VALUES(dobrdok), dobrfak=VALUES(dobrfak),
                ksymb=VALUES(ksymb), vsymb=VALUES(vsymb), ssymb=VALUES(ssymb),
                uhrada=VALUES(uhrada), zadrz=VALUES(zadrz), bancisn=VALUES(bancisn),
                bancisf=VALUES(bancisf), tuzzahr=VALUES(tuzzahr), firmapuv=VALUES(firmapuv),
                datpri=VALUES(datpri), dof=VALUES(dof), spl=VALUES(spl),
                plndod=VALUES(plndod), datuskut=VALUES(datuskut), rmzu=VALUES(rmzu),
                rmzustor=VALUES(rmzustor), adr=VALUES(adr), csml=VALUES(csml),
                cdodsml=VALUES(cdodsml), cobj=VALUES(cobj), cpperf=VALUES(cpperf),
                fpzadav=VALUES(fpzadav), vlast=VALUES(vlast), fakmist=VALUES(fakmist),
                budejsd=VALUES(budejsd), dopr=VALUES(dopr), douct=VALUES(douct),
                zauct=VALUES(zauct), zauctlik=VALUES(zauctlik), zauctpst=VALUES(zauctpst),
                zauctlst=VALUES(zauctlst), pracvd=VALUES(pracvd), cind=VALUES(cind),
                ucetd=VALUES(ucetd), zak=VALUES(zak), difpl=VALUES(difpl),
                cdokrozp=VALUES(cdokrozp), datrozp=VALUES(datrozp), stavwkf=VALUES(stavwkf),
                kdoschfp=VALUES(kdoschfp), fpzadat=VALUES(fpzadat), datschvz=VALUES(datschvz),
                fpprik=VALUES(fpprik), datschvp=VALUES(datschvp), fpsprozp=VALUES(fpsprozp),
                datschvs=VALUES(datschvs), fpzodpov=VALUES(fpzodpov), datschvu=VALUES(datschvu),
                idproc=VALUES(idproc), datpros=VALUES(datpros), odkud=VALUES(odkud),
                fpjs=VALUES(fpjs), link=VALUES(link), idext=VALUES(idext),
                datz=VALUES(datz), datu=VALUES(datu), text=VALUES(text),
                pripoj=VALUES(pripoj), dzap=VALUES(dzap), splzadr=VALUES(splzadr),
                stav1=VALUES(stav1), stav2=VALUES(stav2), stav3=VALUES(stav3),
                cpredmet=VALUES(cpredmet), cprir=VALUES(cprir),
                cdobrop=VALUES(cdobrop), czdobrop=VALUES(czdobrop), czalohy=VALUES(czalohy),
                cplatby=VALUES(cplatby), czbyva=VALUES(czbyva), cprepl=VALUES(cprepl),
                csaldo=VALUES(csaldo), cklikv=VALUES(cklikv), czlikv=VALUES(czlikv),
                cdodlist=VALUES(cdodlist), cpoz=VALUES(cpoz), czadr=VALUES(czadr),
                cnezadr=VALUES(cnezadr), cprzal=VALUES(cprzal), radkylik=VALUES(radkylik),
                dob=VALUES(dob), dodlist=VALUES(dodlist), poz=VALUES(poz),
                zadr=VALUES(zadr), vyuc=VALUES(vyuc), sdok=VALUES(sdok),
                prilohy=VALUES(prilohy),
                stav_zaznamu='aktivni',
                import_batch_id=VALUES(import_batch_id),
                dt_posledni_aktualizace=NOW(),
                aktualizoval_uzivatel_id=VALUES(vytvoril_uzivatel_id)";

            $stmt = $db->prepare($sql);
            $params = array(
                $row['stav'] ?? null,
                $row['firma'] ?? null,
                $row['cfak'] ?? null,
                $row['storno'] ?? 0,
                $row['cdok'] ?? null,
                $row['dicp'] ?? null,
                $row['likdok'] ?? null,
                $row['cfakdupl'] ?? null,
                $row['nazevfak'] ?? null,
                $row['typdok'] ?? null,
                $row['dobrdok'] ?? null,
                $row['dobrfak'] ?? null,
                $row['ksymb'] ?? null,
                $row['vsymb'] ?? null,
                $row['ssymb'] ?? null,
                $row['uhrada'] ?? null,
                $row['zadrz'] ?? 0,
                $row['bancisn'] ?? null,
                $row['bancisf'] ?? null,
                $row['tuzzahr'] ?? null,
                $row['firmapuv'] ?? null,
                $row['datpri'] ?? null,
                $row['dof'] ?? null,
                $row['spl'] ?? null,
                $row['plndod'] ?? null,
                $row['datuskut'] ?? null,
                $row['rmzu'] ?? null,
                $row['rmzustor'] ?? null,
                $row['adr'] ?? null,
                $row['csml'] ?? null,
                $row['cdodsml'] ?? null,
                $row['cobj'] ?? null,
                $row['cpperf'] ?? null,
                $row['fpzadav'] ?? null,
                $row['vlast'] ?? null,
                $row['fakmist'] ?? null,
                $row['budejsd'] ?? 0,
                $row['dopr'] ?? null,
                $row['douct'] ?? null,
                $row['zauct'] ?? null,
                $row['zauctlik'] ?? null,
                $row['zauctpst'] ?? null,
                $row['zauctlst'] ?? null,
                $row['pracvd'] ?? null,
                $row['cind'] ?? null,
                $row['ucetd'] ?? null,
                $row['zak'] ?? null,
                $row['difpl'] ?? null,
                $row['cdokrozp'] ?? null,
                $row['datrozp'] ?? null,
                $row['stavwkf'] ?? null,
                $row['kdoschfp'] ?? null,
                $row['fpzadat'] ?? null,
                $row['datschvz'] ?? null,
                $row['fpprik'] ?? null,
                $row['datschvp'] ?? null,
                $row['fpsprozp'] ?? null,
                $row['datschvs'] ?? null,
                $row['fpzodpov'] ?? null,
                $row['datschvu'] ?? null,
                $row['idproc'] ?? null,
                $row['datpros'] ?? null,
                $row['odkud'] ?? null,
                $row['fpjs'] ?? null,
                $row['link'] ?? null,
                $row['idext'] ?? null,
                $row['datz'] ?? null,
                $row['datu'] ?? null,
                $row['text'] ?? null,
                $row['pripoj'] ?? null,
                $row['dzap'] ?? null,
                $row['splzadr'] ?? null,
                $row['stav1'] ?? null,
                $row['stav2'] ?? null,
                $row['stav3'] ?? null,
                $row['cpredmet'] ?? null,
                $row['cprir'] ?? null,
                $row['celkem'] ?? null,
                $row['cdobrop'] ?? null,
                $row['czdobrop'] ?? null,
                $row['czalohy'] ?? null,
                $row['cplatby'] ?? null,
                $row['czbyva'] ?? null,
                $row['cprepl'] ?? null,
                $row['csaldo'] ?? null,
                $row['cklikv'] ?? null,
                $row['czlikv'] ?? null,
                $row['cdodlist'] ?? null,
                $row['cpoz'] ?? null,
                $row['czadr'] ?? null,
                $row['cnezadr'] ?? null,
                $row['cprzal'] ?? null,
                $row['radkylik'] ?? null,
                $row['dob'] ?? null,
                $row['dodlist'] ?? null,
                $row['poz'] ?? null,
                $row['zadr'] ?? null,
                $row['vyuc'] ?? null,
                $row['sdok'] ?? null,
                $row['prilohy'] ?? null,
                $batch_id,
                $dt_importu,
                $user_id
            );
            
            try {
                $stmt->execute($params);
                $faktury_inserted++;
                
                // Progress každých 100 záznamů (faktury bývají více)
                if (($index + 1) % 100 === 0 || ($index + 1) === $total_faktury) {
                    $percent = round((($index + 1) / $total_faktury) * 100);
                    error_log("║    Progress: " . ($index + 1) . "/" . $total_faktury . " ($percent%)");
                }
            } catch (PDOException $e) {
                $faktury_errors[] = array(
                    'index' => $index + 1,
                    'data' => array(
                        'firma' => $row['firma'] ?? null,
                        'cfak' => $row['cfak'] ?? null,
                        'nazevfak' => $row['nazevfak'] ?? null
                    ),
                    'error' => $e->getMessage(),
                    'sql_state' => $e->getCode()
                );
                // Logovat první chybu detailně
                if (count($faktury_errors) === 1) {
                    error_log("║    ⚠️  PRVNÍ CHYBA při INSERT:");
                    error_log("║       - Záznam #" . ($index + 1));
                    error_log("║       - SQL State: " . $e->getCode());
                    error_log("║       - Chyba: " . $e->getMessage());
                    error_log("║       - Data: firma=" . ($row['firma'] ?? 'null') . ", cfak=" . ($row['cfak'] ?? 'null'));
                }
            }
        }
        
        error_log("║    ✅ Fpazahl: Úspěšně vloženo " . $faktury_inserted . "/" . $total_faktury . " záznamů");
        if (count($faktury_errors) > 0) {
            error_log("║    ⚠️  Chyby: " . count($faktury_errors) . " záznamů se nepodařilo vložit");
        }

        // ===== 3. IMPORT SMLA (Smlouvy) =====
        error_log("║");
        error_log("║ ┌─────────────────────────────────────────────────────────────");
        error_log("║ │ 3️⃣  IMPORT SMLA (Smlouvy)");
        error_log("║ │ Celkem záznamů: " . count($smla));
        error_log("║ └─────────────────────────────────────────────────────────────");
        
        $smlouvy_inserted = 0;
        $smlouvy_errors = array();
        $total_smlouvy = count($smla);
        
        foreach ($smla as $index => $row) {
            $sql = "INSERT INTO `" . TBL_VEMA_SMLA . "` (
                typsml, csml, nazsml, ecsml, csmlp, verzak, firma, str3,
                duver, puvod, dnazsml, popis, text, datuzavr, datumod,
                datumdo, zavazdo, perioda, termin, hodnota, duvnulc, jistota,
                ukonc, datukon, notsml, prac, usek, cinnost, zak, poznsml,
                dodatky, etapy, kalendar, aktual, souv, prolsml, proldnyz,
                proldoba, stavrs, predmsml, hodnbdph, hodnsdph, rspriloh,
                rsprilzv, idrs, datumrs, komrs, uctuj, ucetmd, ucetd,
                zucobd, datzauct, zu, pre, prilohy,
                stav_zaznamu, import_batch_id, dt_importu, vytvoril_uzivatel_id, dt_vytvoreni
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                'aktivni', ?, ?, ?, NOW()
            ) ON DUPLICATE KEY UPDATE
                typsml=VALUES(typsml), nazsml=VALUES(nazsml), ecsml=VALUES(ecsml),
                csmlp=VALUES(csmlp), verzak=VALUES(verzak), firma=VALUES(firma),
                str3=VALUES(str3), duver=VALUES(duver), puvod=VALUES(puvod),
                dnazsml=VALUES(dnazsml), popis=VALUES(popis), text=VALUES(text),
                datuzavr=VALUES(datuzavr), datumod=VALUES(datumod), datumdo=VALUES(datumdo),
                zavazdo=VALUES(zavazdo), perioda=VALUES(perioda), termin=VALUES(termin),
                hodnota=VALUES(hodnota), duvnulc=VALUES(duvnulc), jistota=VALUES(jistota),
                ukonc=VALUES(ukonc), datukon=VALUES(datukon), notsml=VALUES(notsml),
                prac=VALUES(prac), usek=VALUES(usek), cinnost=VALUES(cinnost),
                zak=VALUES(zak), poznsml=VALUES(poznsml), dodatky=VALUES(dodatky),
                etapy=VALUES(etapy), kalendar=VALUES(kalendar), aktual=VALUES(aktual),
                souv=VALUES(souv), prolsml=VALUES(prolsml), proldnyz=VALUES(proldnyz),
                proldoba=VALUES(proldoba), stavrs=VALUES(stavrs), predmsml=VALUES(predmsml),
                hodnbdph=VALUES(hodnbdph), hodnsdph=VALUES(hodnsdph), rspriloh=VALUES(rspriloh),
                rsprilzv=VALUES(rsprilzv), idrs=VALUES(idrs), datumrs=VALUES(datumrs),
                komrs=VALUES(komrs), uctuj=VALUES(uctuj), ucetmd=VALUES(ucetmd),
                ucetd=VALUES(ucetd), zucobd=VALUES(zucobd), datzauct=VALUES(datzauct),
                zu=VALUES(zu), pre=VALUES(pre), prilohy=VALUES(prilohy),
                stav_zaznamu='aktivni',
                import_batch_id=VALUES(import_batch_id),
                dt_posledni_aktualizace=NOW(),
                aktualizoval_uzivatel_id=VALUES(vytvoril_uzivatel_id)";

            try {
                $stmt = $db->prepare($sql);
                $stmt->execute(array(
                    $row['typsml'] ?? null,
                    $row['csml'] ?? null,
                    $row['nazsml'] ?? null,
                    $row['ecsml'] ?? null,
                    $row['csmlp'] ?? null,
                    $row['verzak'] ?? null,
                    $row['firma'] ?? null,
                    $row['str3'] ?? null,
                    $row['duver'] ?? null,
                    $row['puvod'] ?? null,
                    $row['dnazsml'] ?? null,
                    $row['popis'] ?? null,
                    $row['text'] ?? null,
                    $row['datuzavr'] ?? null,
                    $row['datumod'] ?? null,
                    $row['datumdo'] ?? null,
                    $row['zavazdo'] ?? null,
                    $row['perioda'] ?? null,
                    $row['termin'] ?? null,
                    $row['hodnota'] ?? null,
                    $row['duvnulc'] ?? null,
                    $row['jistota'] ?? null,
                    $row['ukonc'] ?? null,
                    $row['datukon'] ?? null,
                    $row['notsml'] ?? null,
                    $row['prac'] ?? null,
                    $row['usek'] ?? null,
                    $row['cinnost'] ?? null,
                    $row['zak'] ?? null,
                    $row['poznsml'] ?? null,
                    $row['dodatky'] ?? null,
                    $row['etapy'] ?? null,
                    $row['kalendar'] ?? null,
                    $row['aktual'] ?? null,
                    $row['souv'] ?? null,
                    $row['prolsml'] ?? null,
                    $row['proldnyz'] ?? null,
                    $row['proldoba'] ?? null,
                    $row['stavrs'] ?? null,
                    $row['predmsml'] ?? null,
                    $row['hodnbdph'] ?? null,
                    $row['hodnsdph'] ?? null,
                    $row['rspriloh'] ?? null,
                    $row['rsprilzv'] ?? null,
                    $row['idrs'] ?? null,
                    $row['datumrs'] ?? null,
                    $row['komrs'] ?? null,
                    $row['uctuj'] ?? null,
                    $row['ucetmd'] ?? null,
                    $row['ucetd'] ?? null,
                    $row['zucobd'] ?? null,
                    $row['datzauct'] ?? null,
                    $row['zu'] ?? null,
                    $row['pre'] ?? null,
                    $row['prilohy'] ?? null,
                    $batch_id,
                    $dt_importu,
                    $user_id
                ));
                $smlouvy_inserted++;
                
                // Progress každých 50 záznamů
                if (($index + 1) % 50 === 0 || ($index + 1) === $total_smlouvy) {
                    $percent = round((($index + 1) / $total_smlouvy) * 100);
                    error_log("║    Progress: " . ($index + 1) . "/" . $total_smlouvy . " ($percent%)");
                }
            } catch (PDOException $e) {
                $smlouvy_errors[] = array(
                    'index' => $index + 1,
                    'data' => array(
                        'firma' => $row['firma'] ?? null,
                        'csml' => $row['csml'] ?? null,
                        'nazsml' => $row['nazsml'] ?? null
                    ),
                    'error' => $e->getMessage(),
                    'sql_state' => $e->getCode()
                );
                // Logovat první chybu detailně
                if (count($smlouvy_errors) === 1) {
                    error_log("║    ⚠️  PRVNÍ CHYBA při INSERT:");
                    error_log("║       - Záznam #" . ($index + 1));
                    error_log("║       - SQL State: " . $e->getCode());
                    error_log("║       - Chyba: " . $e->getMessage());
                    error_log("║       - Data: firma=" . ($row['firma'] ?? 'null') . ", csml=" . ($row['csml'] ?? 'null'));
                }
            }
        }
        
        error_log("║    ✅ Smla: Úspěšně vloženo " . $smlouvy_inserted . "/" . $total_smlouvy . " záznamů");
        if (count($smlouvy_errors) > 0) {
            error_log("║    ⚠️  Chyby: " . count($smlouvy_errors) . " záznamů se nepodařilo vložit");
        }

        // ===== 4. OZNAČENÍ SMAZANÝCH ZÁZNAMŮ =====
        error_log("║");
        error_log("║ ┌─────────────────────────────────────────────────────────────");
        error_log("║ │ 4️⃣  OZNAČENÍ SMAZANÝCH ZÁZNAMŮ");
        error_log("║ │ (Záznamy které nejsou v aktuálním importu)");
        error_log("║ └─────────────────────────────────────────────────────────────");
        
        // Označit firmy které nejsou v aktuálním batch_id jako 'smazano'
        $stmt_firmy_del = $db->prepare("
            UPDATE `" . TBL_VEMA_FIRMYUPL . "` 
            SET stav = 'smazano',
                stav_zaznamu = 'smazano',
                dt_posledni_aktualizace = NOW()
            WHERE import_batch_id != ? 
              AND stav_zaznamu = 'aktivni'
        ");
        $stmt_firmy_del->execute(array($batch_id));
        $firmy_smazano = $stmt_firmy_del->rowCount();
        error_log("║    ├─ Firmy označeno jako smazáno: " . $firmy_smazano);
        
        // Označit faktury které nejsou v aktuálním batch_id jako 'smazano'
        $stmt_faktury_del = $db->prepare("
            UPDATE `" . TBL_VEMA_FPAZAHL . "` 
            SET stav_zaznamu = 'smazano',
                dt_posledni_aktualizace = NOW()
            WHERE import_batch_id != ? 
              AND stav_zaznamu = 'aktivni'
        ");
        $stmt_faktury_del->execute(array($batch_id));
        $faktury_smazano = $stmt_faktury_del->rowCount();
        error_log("║    ├─ Faktury označeno jako smazáno: " . $faktury_smazano);
        
        // Označit smlouvy které nejsou v aktuálním batch_id jako 'smazano'
        $stmt_smlouvy_del = $db->prepare("
            UPDATE `" . TBL_VEMA_SMLA . "` 
            SET stav_zaznamu = 'smazano',
                dt_posledni_aktualizace = NOW()
            WHERE import_batch_id != ? 
              AND stav_zaznamu = 'aktivni'
        ");
        $stmt_smlouvy_del->execute(array($batch_id));
        $smlouvy_smazano = $stmt_smlouvy_del->rowCount();
        error_log("║    └─ Smlouvy označeno jako smazáno: " . $smlouvy_smazano);
        
        $total_smazano = $firmy_smazano + $faktury_smazano + $smlouvy_smazano;
        if ($total_smazano > 0) {
            error_log("║");
            error_log("║    🗑️  Celkem označeno jako smazáno: " . $total_smazano . " záznamů");
        }

        // ====== COMMIT TRANSACTION ======
        error_log("║");
        error_log("║ 🔒 COMMIT TRANSACTION");
        $db->commit();
        
        $total_inserted = $firmy_inserted + $faktury_inserted + $smlouvy_inserted;
        $total_records = $total_firmy + $total_faktury + $total_smlouvy;
        $total_errors = count($firmy_errors) + count($faktury_errors) + count($smlouvy_errors);

        error_log("╠═══════════════════════════════════════════════════════════════");
        error_log("║ ✅ VEMA IMPORT DOKONČEN");
        error_log("║");
        error_log("║ 📋 SOUHRN:");
        error_log("║    ├─ Batch ID: " . $batch_id);
        error_log("║    ├─ Celkem záznamů: " . $total_records);
        error_log("║    ├─ Úspěšně vloženo/aktualizováno: " . $total_inserted);
        error_log("║    ├─ Označeno jako smazáno: " . $total_smazano);
        error_log("║    └─ Chyb: " . $total_errors);
        error_log("║");
        error_log("║ 📊 DETAILY:");
        error_log("║    ├─ Firmy: " . $firmy_inserted . "/" . $total_firmy . ($firmy_errors ? " (chyb: " . count($firmy_errors) . ")" : "") . " | Smazáno: " . $firmy_smazano);
        error_log("║    ├─ Faktury: " . $faktury_inserted . "/" . $total_faktury . ($faktury_errors ? " (chyb: " . count($faktury_errors) . ")" : "") . " | Smazáno: " . $faktury_smazano);
        error_log("║    └─ Smlouvy: " . $smlouvy_inserted . "/" . $total_smlouvy . ($smlouvy_errors ? " (chyb: " . count($smlouvy_errors) . ")" : "") . " | Smazáno: " . $smlouvy_smazano);
        error_log("╚═══════════════════════════════════════════════════════════════");

        // Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'message' => 'Import byl úspěšně dokončen',
            'data' => array(
                'batch_id' => $batch_id,
                'imported' => array(
                    'firmyupl' => $firmy_inserted,
                    'fpazahl' => $faktury_inserted,
                    'smla' => $smlouvy_inserted,
                    'total' => $firmy_inserted + $faktury_inserted + $smlouvy_inserted
                ),
                'deleted' => array(
                    'firmyupl' => $firmy_smazano,
                    'fpazahl' => $faktury_smazano,
                    'smla' => $smlouvy_smazano,
                    'total' => $total_smazano
                ),
                'dt_importu' => $dt_importu
            )
        ));

    } catch (Exception $e) {
        // Rollback při chybě
        if (isset($db) && $db->inTransaction()) {
            error_log("║ 🔄 ROLLBACK TRANSACTION");
            $db->rollBack();
        }
        
        error_log("╠═══════════════════════════════════════════════════════════════");
        error_log("║ ❌ VEMA IMPORT CHYBA");
        error_log("║");
        error_log("║ 🔴 CHYBOVÁ ZPRÁVA:");
        error_log("║    " . $e->getMessage());
        error_log("║");
        error_log("║ 📍 SOUBOR: " . $e->getFile());
        error_log("║ 📍 ŘÁDEK: " . $e->getLine());
        error_log("║");
        error_log("║ 📚 STACK TRACE:");
        
        $trace = $e->getTraceAsString();
        $trace_lines = explode("\n", $trace);
        foreach ($trace_lines as $trace_line) {
            error_log("║    " . $trace_line);
        }
        
        error_log("╚═══════════════════════════════════════════════════════════════");
        
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při importu: ' . $e->getMessage(),
            'debug' => array(
                'file' => $e->getFile(),
                'line' => $e->getLine()
            )
        ));
    }
}

// ============================================================================
// HELPER FUNKCE
// ============================================================================

/**
 * Kontrola, zda uživatel má dané oprávnění
 * 
 * @param int $user_id ID uživatele
 * @param string $kod_prava Kód práva (např. 'VEMA_VIEW')
 * @return bool
 */
function has_permission($user_id, $kod_prava) {
    try {
        $config = require __DIR__ . '/dbconfig.php';
        $db = get_db($config);

        if (!$db) {
            return false;
        }
        
        // ✅ PRVNÍ: Kontrola admin rolí - SUPERADMIN a ADMINISTRATOR mají vše automaticky
        $admin_check_sql = "SELECT r.kod_role 
                            FROM `25_role` r 
                            JOIN `25_uzivatele_role` ur ON r.id = ur.role_id 
                            WHERE ur.uzivatel_id = ? 
                              AND r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')";
        $admin_stmt = $db->prepare($admin_check_sql);
        $admin_stmt->execute(array($user_id));
        
        if ($admin_stmt->rowCount() > 0) {
            // ✅ Je SUPERADMIN nebo ADMINISTRATOR - má automaticky všechna práva
            return true;
        }

        // ✅ DRUHÝ: Kontrola konkrétního práva
        // Právo může být přiřazeno buď přes roli (rp.role_id), nebo přímo uživateli (rp.user_id).
        $sql = "SELECT COUNT(*) as count
                FROM `25_prava` p
                LEFT JOIN `25_role_prava` rp_role ON p.id = rp_role.pravo_id
                LEFT JOIN `25_uzivatele_role` ur ON ur.role_id = rp_role.role_id AND ur.uzivatel_id = ?
                LEFT JOIN `25_role_prava` rp_user ON p.id = rp_user.pravo_id AND rp_user.user_id = ?
                WHERE p.kod_prava = ?
                  AND p.aktivni = 1
                  AND (ur.uzivatel_id IS NOT NULL OR rp_user.user_id IS NOT NULL)";

        $stmt = $db->prepare($sql);
        $stmt->execute(array($user_id, $user_id, $kod_prava));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result['count'] > 0;
    } catch (Exception $e) {
        error_log("Permission check error: " . $e->getMessage());
        return false;
    }
}

/**
 * POST - Vymaže všechna data ze všech 3 VEMA tabulek (TRUNCATE)
 * Endpoint: vema/truncate
 * POST: {token, username}
 * 
 * Pouze pro SUPERADMIN role!
 * 
 * Response: {status, message, deleted_counts}
 */
function handle_vema_truncate($input, $config, $queries) {
    // Validace metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // Autentizace
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }

    if ($token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Uživatelské jméno neodpovídá tokenu'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // Kontrola SUPERADMIN role
        $user_id = $token_data['id'];
        $role_check_sql = "SELECT COUNT(*) as count 
                          FROM `" . TBL_UZIVATELE . "` u
                          LEFT JOIN `" . TBL_ROLE . "` r ON u.role_id = r.id
                          WHERE u.id = ? AND r.kod IN ('SUPERADMIN')";
        $stmt = $db->prepare($role_check_sql);
        $stmt->execute(array($user_id));
        $role_result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($role_result['count'] == 0) {
            http_response_code(403);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Pouze SUPERADMIN může mazat VEMA data!'
            ));
            return;
        }

        // Nastavit timezone
        TimezoneHelper::setMysqlTimezone($db);

        // Počítat záznamy před smazáním
        $firmy_count_sql = "SELECT COUNT(*) as count FROM `" . TBL_VEMA_FIRMYUPL . "`";
        $faktury_count_sql = "SELECT COUNT(*) as count FROM `" . TBL_VEMA_FPAZAHL . "`";
        $smlouvy_count_sql = "SELECT COUNT(*) as count FROM `" . TBL_VEMA_SMLA . "`";

        $stmt = $db->query($firmy_count_sql);
        $firmy_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

        $stmt = $db->query($faktury_count_sql);
        $faktury_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

        $stmt = $db->query($smlouvy_count_sql);
        $smlouvy_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

        $total_before = $firmy_count + $faktury_count + $smlouvy_count;

        // TRUNCATE všech 3 tabulek
        $db->exec("TRUNCATE TABLE `" . TBL_VEMA_FIRMYUPL . "`");
        $db->exec("TRUNCATE TABLE `" . TBL_VEMA_FPAZAHL . "`");
        $db->exec("TRUNCATE TABLE `" . TBL_VEMA_SMLA . "`");

        // Log do error logu
        error_log("╔════════════════════════════════════════════════════════════════════════");
        error_log("║  🗑️  VEMA TRUNCATE");
        error_log("╠════════════════════════════════════════════════════════════════════════");
        error_log("   Uživatel: {$username} (ID: {$user_id})");
        error_log("   Datum: " . date('Y-m-d H:i:s'));
        error_log("   Smazáno:");
        error_log("      - Firmy: {$firmy_count}");
        error_log("      - Faktury: {$faktury_count}");
        error_log("      - Smlouvy: {$smlouvy_count}");
        error_log("      - CELKEM: {$total_before}");
        error_log("╚════════════════════════════════════════════════════════════════════════");

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'message' => 'Všechna VEMA data byla úspěšně smazána',
            'deleted_counts' => array(
                'firmyupl' => $firmy_count,
                'fpazahl' => $faktury_count,
                'smla' => $smlouvy_count,
                'total' => $total_before
            )
        ));

    } catch (Exception $e) {
        error_log("❌ CHYBA při TRUNCATE VEMA dat: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při mazání dat: ' . $e->getMessage()
        ));
    }
}

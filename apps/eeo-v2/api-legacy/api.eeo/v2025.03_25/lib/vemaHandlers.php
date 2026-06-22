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

        if ($search !== '') {
            $where[] = "(nazev LIKE ? OR ico LIKE ? OR email LIKE ?)";
            $search_param = '%' . $search . '%';
            $params[] = $search_param;
            $params[] = $search_param;
            $params[] = $search_param;
        }

        if ($stav !== '') {
            $where[] = "stav = ?";
            $params[] = $stav;
        }

        $where_sql = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

        // Celkový počet
        $count_sql = "SELECT COUNT(*) as total FROM `" . TBL_VEMA_FIRMYUPL . "` " . $where_sql;
        $count_stmt = $db->prepare($count_sql);
        $count_stmt->execute($params);
        $total = $count_stmt->fetchColumn();

        // Data
        $sql = "SELECT 
                    id, firma, nazev, ico, regcisph, 
                    ulice, cp, obec, psc, 
                    telefon, mobil, email, web,
                    dnazev, dic,
                    stav, import_batch_id, 
                    dt_importu, dt_posledni_aktualizace,
                    dt_vytvoreni
                FROM `" . TBL_VEMA_FIRMYUPL . "`
                " . $where_sql . "
                ORDER BY nazev ASC
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
            $where[] = "(f.cfak LIKE ? OR f.nazevfak LIKE ? OR f.cdok LIKE ?)";
            $search_param = '%' . $search . '%';
            $params[] = $search_param;
            $params[] = $search_param;
            $params[] = $search_param;
        }

        $where_sql = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

        // Celkový počet
        $count_sql = "SELECT COUNT(*) as total FROM `" . TBL_VEMA_FPAZAHL . "` f " . $where_sql;
        $count_stmt = $db->prepare($count_sql);
        $count_stmt->execute($params);
        $total = $count_stmt->fetchColumn();

        // Data s JOINem na firmy a smlouvy
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
                    smlouvy.ecsml as smlouva_ecsml
                FROM `" . TBL_VEMA_FPAZAHL . "` f
                LEFT JOIN `" . TBL_VEMA_FIRMYUPL . "` firmy ON f.firma = firmy.firma
                LEFT JOIN `" . TBL_VEMA_SMLA . "` smlouvy ON f.csml = smlouvy.csml
                " . $where_sql . "
                ORDER BY f.datpri DESC, f.cfak DESC
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
            $where[] = "(s.csml LIKE ? OR s.nazsml LIKE ? OR s.dnazsml LIKE ?)";
            $search_param = '%' . $search . '%';
            $params[] = $search_param;
            $params[] = $search_param;
            $params[] = $search_param;
        }

        $where_sql = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

        // Celkový počet
        $count_sql = "SELECT COUNT(*) as total FROM `" . TBL_VEMA_SMLA . "` s " . $where_sql;
        $count_stmt = $db->prepare($count_sql);
        $count_stmt->execute($params);
        $total = $count_stmt->fetchColumn();

        // Data s JOINem na firmy
        $sql = "SELECT 
                    s.id, s.typsml, s.csml, s.ecsml, s.nazsml, s.firma, 
                    s.dnazsml, s.datuzavr, s.datumdo, 
                    s.hodnota, s.usek, s.prolsml, s.stavrs,
                    s.stav_zaznamu, s.import_batch_id,
                    s.dt_importu, s.dt_posledni_aktualizace,
                    firmy.nazev as firma_nazev
                FROM `" . TBL_VEMA_SMLA . "` s
                LEFT JOIN `" . TBL_VEMA_FIRMYUPL . "` firmy ON s.firma = firmy.firma
                " . $where_sql . "
                ORDER BY s.datuzavr DESC, s.csml DESC
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
                stav, import_batch_id, dt_importu, vytvoril_uzivatel_id, dt_vytvoreni
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                'aktivni', ?, ?, ?, NOW()
            )";

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
            )";

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
            )";

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
        error_log("║    ├─ Úspěšně vloženo: " . $total_inserted);
        error_log("║    └─ Chyb: " . $total_errors);
        error_log("║");
        error_log("║ 📊 DETAILY:");
        error_log("║    ├─ Firmy: " . $firmy_inserted . "/" . $total_firmy . ($firmy_errors ? " (chyb: " . count($firmy_errors) . ")" : ""));
        error_log("║    ├─ Faktury: " . $faktury_inserted . "/" . $total_faktury . ($faktury_errors ? " (chyb: " . count($faktury_errors) . ")" : ""));
        error_log("║    └─ Smlouvy: " . $smlouvy_inserted . "/" . $total_smlouvy . ($smlouvy_errors ? " (chyb: " . count($smlouvy_errors) . ")" : ""));
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
        
        // ✅ DRUHÝ: Běžná kontrola přes 25_role_prava
        $sql = "SELECT COUNT(*) as count
                FROM `25_uzivatele_role` ur
                JOIN `25_role_prava` rp ON ur.role_id = rp.role_id
                JOIN `25_prava` p ON rp.pravo_id = p.id
                WHERE ur.uzivatel_id = ? 
                  AND p.kod_prava = ?
                  AND p.aktivni = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array($user_id, $kod_prava));
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

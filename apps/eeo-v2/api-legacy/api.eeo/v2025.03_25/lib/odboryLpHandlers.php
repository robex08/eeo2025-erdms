<?php
/**
 * ODBOROVÉ LP PŘIŘAZENÍ HANDLERS
 * 
 * Slouží k přímému přiřazení LP kódů k samostatným fakturám a pokladním položkám
 * (odborové LP - bez objednávek nebo smluv)
 * 
 * Tabulka: 25a_odbory_lp_prirazeni
 * PHP 5.6 Compatible
 * 
 * @autor AI Assistant + robex08
 * @datum 26.05.2026
 */

require_once 'TimezoneHelper.php';

/**
 * POST /odbory-lp/save
 * Uloží nebo aktualizuje odborové LP přiřazení
 * 
 * Body: {
 *   token, username,
 *   faktura_id: int | null,
 *   pokladni_polozka_id: int | null,
 *   lp_id: int (required),
 *   poznamka: string | null
 * }
 * 
 * Response: { status: "success", data: { id, ... } }
 */
function handle_odbory_lp_save($input, $config) {
    // Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // Parametry z body
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    // Parametry pro přiřazení
    $faktura_id = isset($input['faktura_id']) && $input['faktura_id'] ? (int)$input['faktura_id'] : null;
    $pokladni_polozka_id = isset($input['pokladni_polozka_id']) && $input['pokladni_polozka_id'] ? (int)$input['pokladni_polozka_id'] : null;
    $lp_id = isset($input['lp_id']) ? (int)$input['lp_id'] : 0;
    $poznamka = isset($input['poznamka']) ? trim($input['poznamka']) : null;
    $user_id = $token_data['id'];

    // Validace: musí být vyplněno PRÁVĚ jedno ID
    if ((!$faktura_id && !$pokladni_polozka_id) || ($faktura_id && $pokladni_polozka_id)) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Musí být vyplněno právě jedno: faktura_id NEBO pokladni_polozka_id'
        ));
        return;
    }

    // Validace LP ID
    if (!$lp_id || $lp_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatné lp_id'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        // Nastavení timezone
        TimezoneHelper::setMysqlTimezone($db);

        // Validace: LP musí existovat a mít správný modul
        $expected_modul = $faktura_id ? 'f' : 'p';
        $stmt_validate = $db->prepare("
            SELECT id, cislo_lp, modul 
            FROM `" . TBL_LIMITOVANE_PRISLIBY . "` 
            WHERE id = :lp_id
        ");
        $stmt_validate->execute(array(':lp_id' => $lp_id));
        $lp = $stmt_validate->fetch(PDO::FETCH_ASSOC);

        if (!$lp) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'LP s ID ' . $lp_id . ' neexistuje'));
            return;
        }

        // Kontrola modulu (musí obsahovat 'f' nebo 'p')
        if (strpos($lp['modul'], $expected_modul) === false) {
            $modul_nazev = $expected_modul === 'f' ? 'faktury' : 'pokladny';
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error',
                'message' => "LP '{$lp['cislo_lp']}' není dostupný pro modul {$modul_nazev} (má modul='{$lp['modul']}')"
            ));
            return;
        }

        // INSERT nebo UPDATE (na základě UNIQUE constraint)
        if ($faktura_id) {
            // Faktura
            $stmt = $db->prepare("
                INSERT INTO `25a_odbory_lp_prirazeni` 
                (faktura_id, lp_id, poznamka, vytvoril_uzivatel_id, dt_vytvoreni)
                VALUES (:faktura_id, :lp_id, :poznamka, :user_id, NOW())
                ON DUPLICATE KEY UPDATE
                    lp_id = :lp_id,
                    poznamka = :poznamka,
                    dt_aktualizace = NOW()
            ");
            $stmt->execute(array(
                ':faktura_id' => $faktura_id,
                ':lp_id' => $lp_id,
                ':poznamka' => $poznamka,
                ':user_id' => $user_id
            ));
        } else {
            // Pokladní položka
            $stmt = $db->prepare("
                INSERT INTO `25a_odbory_lp_prirazeni` 
                (pokladni_polozka_id, lp_id, poznamka, vytvoril_uzivatel_id, dt_vytvoreni)
                VALUES (:pokladni_polozka_id, :lp_id, :poznamka, :user_id, NOW())
                ON DUPLICATE KEY UPDATE
                    lp_id = :lp_id,
                    poznamka = :poznamka,
                    dt_aktualizace = NOW()
            ");
            $stmt->execute(array(
                ':pokladni_polozka_id' => $pokladni_polozka_id,
                ':lp_id' => $lp_id,
                ':poznamka' => $poznamka,
                ':user_id' => $user_id
            ));
        }

        $inserted_id = $db->lastInsertId();

        // Načíst kompletní záznam pro odpověď
        $stmt_get = $db->prepare("
            SELECT 
                p.id,
                p.faktura_id,
                p.pokladni_polozka_id,
                p.lp_id,
                p.poznamka,
                p.vytvoril_uzivatel_id,
                p.dt_vytvoreni,
                p.dt_aktualizace,
                lp.cislo_lp,
                lp.nazev_uctu,
                lp.modul
            FROM `25a_odbory_lp_prirazeni` p
            LEFT JOIN `" . TBL_LIMITOVANE_PRISLIBY . "` lp ON p.lp_id = lp.id
            WHERE p.id = :id
        ");
        $stmt_get->execute(array(':id' => $inserted_id));
        $result = $stmt_get->fetch(PDO::FETCH_ASSOC);

        // ✅ PŘEPOČET ČERPÁNÍ LP po uložení přiřazení
        try {
            require_once __DIR__ . '/limitovanePrislibyCerpaniHandlers_v2_pdo.php';
            $prepocet_result = prepocetCerpaniPodleIdLP_PDO($db, $lp_id, date('Y'));
            if ($prepocet_result['status'] === 'success') {
                error_log("✅ LP přepočet čerpání po uložení odbory LP: LP#{$lp_id} - " . $prepocet_result['message']);
            } else {
                error_log("⚠️ LP přepočet čerpání selhal: " . $prepocet_result['message']);
            }
        } catch (Exception $prepocet_err) {
            error_log("⚠️ LP přepočet čerpání chyba: " . $prepocet_err->getMessage());
            // Nepřerušujeme proces - přepočet je bonusová akce
        }

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'message' => 'Odborové LP přiřazení uloženo',
            'data' => $result
        ));

    } catch (Exception $e) {
        error_log("❌ CHYBA odbory-lp/save: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při ukládání: ' . $e->getMessage()
        ));
    }
}

/**
 * POST /odbory-lp/get
 * Získá odborové LP přiřazení pro fakturu nebo pokladní položku
 * 
 * Body: {
 *   token, username,
 *   faktura_id: int | null,
 *   pokladni_polozka_id: int | null
 * }
 * 
 * Response: { status: "success", data: { id, lp_id, ... } | null }
 */
function handle_odbory_lp_get($input, $config) {
    // Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // Parametry z body
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    $faktura_id = isset($input['faktura_id']) && $input['faktura_id'] ? (int)$input['faktura_id'] : null;
    $pokladni_polozka_id = isset($input['pokladni_polozka_id']) && $input['pokladni_polozka_id'] ? (int)$input['pokladni_polozka_id'] : null;

    // Validace: musí být vyplněno PRÁVĚ jedno ID
    if ((!$faktura_id && !$pokladni_polozka_id) || ($faktura_id && $pokladni_polozka_id)) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Musí být vyplněno právě jedno: faktura_id NEBO pokladni_polozka_id'
        ));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        $sql = "
            SELECT 
                p.id,
                p.faktura_id,
                p.pokladni_polozka_id,
                p.lp_id,
                p.poznamka,
                p.vytvoril_uzivatel_id,
                p.dt_vytvoreni,
                p.dt_aktualizace,
                lp.cislo_lp,
                lp.nazev_uctu,
                lp.modul,
                u.jmeno as vytvoril_jmeno,
                u.prijmeni as vytvoril_prijmeni
            FROM `25a_odbory_lp_prirazeni` p
            LEFT JOIN `" . TBL_LIMITOVANE_PRISLIBY . "` lp ON p.lp_id = lp.id
            LEFT JOIN `" . TBL_UZIVATELE . "` u ON p.vytvoril_uzivatel_id = u.id
            WHERE " . ($faktura_id ? "p.faktura_id = :id" : "p.pokladni_polozka_id = :id");

        $stmt = $db->prepare($sql);
        $stmt->execute(array(':id' => $faktura_id ? $faktura_id : $pokladni_polozka_id));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $result ? $result : null
        ));

    } catch (Exception $e) {
        error_log("❌ CHYBA odbory-lp/get: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání: ' . $e->getMessage()
        ));
    }
}

/**
 * POST /odbory-lp/delete
 * Smaže odborové LP přiřazení
 * 
 * Body: {
 *   token, username,
 *   faktura_id: int | null,
 *   pokladni_polozka_id: int | null
 * }
 * 
 * Response: { status: "success", message: "..." }
 */
function handle_odbory_lp_delete($input, $config) {
    // Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // Parametry z body
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    // Ověření tokenu
    $token_data = verify_token($token);
    if (!$token_data || $token_data['username'] !== $username) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    $faktura_id = isset($input['faktura_id']) && $input['faktura_id'] ? (int)$input['faktura_id'] : null;
    $pokladni_polozka_id = isset($input['pokladni_polozka_id']) && $input['pokladni_polozka_id'] ? (int)$input['pokladni_polozka_id'] : null;

    // Validace: musí být vyplněno PRÁVĚ jedno ID
    if ((!$faktura_id && !$pokladni_polozka_id) || ($faktura_id && $pokladni_polozka_id)) {
        http_response_code(400);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Musí být vyplněno právě jedno: faktura_id NEBO pokladni_polozka_id'
        ));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        $sql = "DELETE FROM `25a_odbory_lp_prirazeni` WHERE " . 
               ($faktura_id ? "faktura_id = :id" : "pokladni_polozka_id = :id");

        $stmt = $db->prepare($sql);
        $stmt->execute(array(':id' => $faktura_id ? $faktura_id : $pokladni_polozka_id));

        $deleted_rows = $stmt->rowCount();

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'message' => $deleted_rows > 0 ? 'Odborové LP přiřazení smazáno' : 'Žádné přiřazení nebylo nalezeno',
            'deleted_rows' => $deleted_rows
        ));

    } catch (Exception $e) {
        error_log("❌ CHYBA odbory-lp/delete: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při mazání: ' . $e->getMessage()
        ));
    }
}

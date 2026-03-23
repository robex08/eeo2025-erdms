<?php

/**
 * FK Sledovani Handlers – Finanční kontrola: sledování případů
 * PHP 5.6 Compatible
 * Autor: Development Team
 * Datum: 2026-03-23
 *
 * 🎯 ÚČEL:
 * - DB-backed sledování výsledků finanční kontroly v modulu StatsReports
 * - Nahrazuje localStorage notičky (renderNoteCell) sdílenou DB verzí
 * - Jeden případ (case) per entita (OBJ / FA / OBJ_FA), journal событij
 *
 * 📋 ENDPOINTY:
 * - POST fk/get-by-entity  → Načte případ + události pro danou entitu
 * - POST fk/upsert         → Vytvoří nebo aktualizuje případ (lazy init)
 * - POST fk/add-komentar   → Přidá komentář do journalu
 * - POST fk/set-stav       → Změní stav případu + zapíše ZMENA_STAVU událost
 *
 * 📊 TABULKY:
 *   25a_fk_sledovani          – jeden případ per entita
 *   25a_fk_sledovani_udalosti – journal událostí
 *
 * 🔔 NOTIFIKACE:
 * - Při přiřazení (prirazeno_user_id) → notifikace přiřazenému uživateli
 * - Při přidání komentáře / změně stavu → notifikace vlastníkovi případu
 *
 * ✅ PRAVIDLA:
 * - Pouze POST metoda
 * - Token + username z POST body
 * - Prepared statements, UTF-8, Czech error messages
 * - Standard JSON response {status, data, message}
 * - HTTP status codes
 */

if (!function_exists('verify_token')) {
    require_once __DIR__ . '/handlers.php';
}
if (!function_exists('get_db')) {
    require_once __DIR__ . '/handlers.php';
}

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/queries.php';
require_once __DIR__ . '/notificationHandlers.php';

// ====================================================
// TABULKY
// ====================================================
if (!defined('TBL_FK_SLEDOVANI'))          define('TBL_FK_SLEDOVANI',          '25a_fk_sledovani');
if (!defined('TBL_FK_SLEDOVANI_UDALOSTI')) define('TBL_FK_SLEDOVANI_UDALOSTI', '25a_fk_sledovani_udalosti');

// ====================================================
// POMOCNÉ FUNKCE
// ====================================================

/**
 * Vrátí sentinel hodnotu pro ID (0 = neaplikuje se)
 */
function fk_id($value) {
    $v = (int)$value;
    return ($v > 0) ? $v : 0;
}

/**
 * Načte případ z DB podle objednavka_id + faktura_id (se sentinel 0)
 * Vrací pole nebo false
 */
function fk_get_case($db, $objednavka_id, $faktura_id) {
    $stmt = $db->prepare(
        "SELECT * FROM " . TBL_FK_SLEDOVANI . "
         WHERE objednavka_id = ? AND faktura_id = ?
         LIMIT 1"
    );
    $stmt->execute(array($objednavka_id, $faktura_id));
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Načte události pro daný případ (sledovani_id), řazeno od nejstaršího
 */
function fk_get_udalosti($db, $sledovani_id) {
    $stmt = $db->prepare(
        "SELECT u.*, usr.prijmeni, usr.jmeno
         FROM " . TBL_FK_SLEDOVANI_UDALOSTI . " u
         LEFT JOIN " . TBL_UZIVATELE . " usr ON usr.id = u.vytvoril_user_id
         WHERE u.sledovani_id = ?
         ORDER BY u.dt_vytvoreni ASC"
    );
    $stmt->execute(array((int)$sledovani_id));
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Zapíše novou událost do journalu
 */
function fk_add_udalost($db, $sledovani_id, $typ, $text_zprava, $stav_pred, $stav_po, $user_id) {
    $dt = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
    $stmt = $db->prepare(
        "INSERT INTO " . TBL_FK_SLEDOVANI_UDALOSTI . "
         (sledovani_id, typ, text_zprava, stav_pred, stav_po, vytvoril_user_id, dt_vytvoreni)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute(array(
        (int)$sledovani_id,
        $typ,
        $text_zprava,
        $stav_pred,
        $stav_po,
        $user_id ? (int)$user_id : null,
        $dt
    ));
    return $db->lastInsertId();
}

/**
 * Odešle interní notifikaci přiřazenému uživateli
 * (ignoruje chyby – notifikace není kritická cesta)
 */
function fk_notify($db, $pro_user_id, $od_user_id, $sledovani_id, $nadpis, $zprava) {
    if (!$pro_user_id || $pro_user_id == $od_user_id) {
        return; // nezasílat sobě samému / uknown user
    }
    try {
        $dt = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
        createNotification($db, array(
            ':typ'               => 'FK_SLEDOVANI',
            ':nadpis'            => $nadpis,
            ':zprava'            => $zprava,
            ':data_json'         => json_encode(array('sledovani_id' => (int)$sledovani_id)),
            ':od_uzivatele_id'   => (int)$od_user_id,
            ':pro_uzivatele_id'  => (int)$pro_user_id,
            ':prijemci_json'     => null,
            ':pro_vsechny'       => 0,
            ':priorita'          => 2,
            ':kategorie'         => 'FK_SLEDOVANI',
            ':odeslat_email'     => 0,
            ':objekt_typ'        => 'FK',
            ':objekt_id'         => (int)$sledovani_id,
            ':dt_expires'        => null,
            ':dt_created'        => $dt,
            ':aktivni'           => 1,
        ));
    } catch (Exception $e) {
        error_log('[fkSledovani] Notifikace chyba: ' . $e->getMessage());
    }
}

// ====================================================
// ENDPOINT: fk/get-by-entity
// ====================================================

/**
 * POST fk/get-by-entity
 * Načte případ + události pro danou entitu.
 * Pokud případ neexistuje, vrátí null (nevytváří lazily – to dělá upsert).
 *
 * POST: {token, username, objednavka_id, faktura_id, entita_typ}
 * Odpověď: {status:'success', data:{case, udalosti}} nebo data:null
 */
function handle_fk_get_by_entity($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    $token    = isset($input['token'])    ? $input['token']    : '';
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

    $objednavka_id = fk_id(isset($input['objednavka_id']) ? $input['objednavka_id'] : 0);
    $faktura_id    = fk_id(isset($input['faktura_id'])    ? $input['faktura_id']    : 0);

    if ($objednavka_id === 0 && $faktura_id === 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Musí být zadáno objednavka_id nebo faktura_id'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) throw new Exception('Chyba připojení k DB');
        TimezoneHelper::setMysqlTimezone($db);

        $sledovani = fk_get_case($db, $objednavka_id, $faktura_id);

        if (!$sledovani) {
            http_response_code(200);
            echo json_encode(array('status' => 'success', 'data' => null));
            return;
        }

        $udalosti = fk_get_udalosti($db, $sledovani['id']);

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data'   => array(
                'case'     => $sledovani,
                'udalosti' => $udalosti,
            )
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'DB chyba: ' . $e->getMessage()));
    }
}

// ====================================================
// ENDPOINT: fk/upsert
// ====================================================

/**
 * POST fk/upsert
 * Vytvoří případ pokud neexistuje (lazy init), nebo ho aktualizuje.
 * Při změně prirazeno_user_id pošle notifikaci.
 *
 * POST: {
 *   token, username,
 *   objednavka_id, faktura_id, entita_typ,
 *   section_kontext?,
 *   stav?,           // OPEN|IN_PROGRESS|RESOLVED|IGNORED
 *   priorita?,       // 1|2|3
 *   vyzaduje_akci?,  // 0|1
 *   prirazeno_user_id?
 * }
 */
function handle_fk_upsert($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    $token    = isset($input['token'])    ? $input['token']    : '';
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

    $user_id       = (int)$token_data['id'];
    $objednavka_id = fk_id(isset($input['objednavka_id']) ? $input['objednavka_id'] : 0);
    $faktura_id    = fk_id(isset($input['faktura_id'])    ? $input['faktura_id']    : 0);
    $entita_typ    = isset($input['entita_typ']) ? $input['entita_typ'] : 'OBJ';

    $allowed_typy = array('OBJ', 'FA', 'OBJ_FA');
    if (!in_array($entita_typ, $allowed_typy)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný entita_typ'));
        return;
    }

    if ($objednavka_id === 0 && $faktura_id === 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Musí být zadáno objednavka_id nebo faktura_id'));
        return;
    }

    // Volitelné parametry
    $section_kontext   = isset($input['section_kontext'])   ? trim($input['section_kontext'])  : null;
    $stav              = isset($input['stav'])              ? $input['stav']                   : 'OPEN';
    $priorita          = isset($input['priorita'])          ? (int)$input['priorita']          : 1;
    $vyzaduje_akci     = isset($input['vyzaduje_akci'])     ? ($input['vyzaduje_akci'] ? 1 : 0): 1;
    $prirazeno_user_id = isset($input['prirazeno_user_id']) ? (int)$input['prirazeno_user_id'] : null;

    $allowed_stavy = array('OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED');
    if (!in_array($stav, $allowed_stavy)) $stav = 'OPEN';
    if ($priorita < 1 || $priorita > 3) $priorita = 1;

    try {
        $db = get_db($config);
        if (!$db) throw new Exception('Chyba připojení k DB');
        TimezoneHelper::setMysqlTimezone($db);

        $dt = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');

        // Zjistit zda případ existuje
        $existing = fk_get_case($db, $objednavka_id, $faktura_id);

        if (!$existing) {
            // === VYTVOŘENÍ NOVÉHO PŘÍPADU ===
            $stmt = $db->prepare(
                "INSERT INTO " . TBL_FK_SLEDOVANI . "
                 (objednavka_id, faktura_id, entita_typ, section_kontext,
                  stav, priorita, vyzaduje_akci, prirazeno_user_id,
                  vytvoril_user_id, dt_vytvoreni)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute(array(
                $objednavka_id,
                $faktura_id,
                $entita_typ,
                $section_kontext,
                $stav,
                $priorita,
                $vyzaduje_akci,
                $prirazeno_user_id ?: null,
                $user_id,
                $dt
            ));
            $sledovani_id = (int)$db->lastInsertId();

            // Journal: AUTO_SYSTEM - vytvoření
            fk_add_udalost($db, $sledovani_id, 'AUTO_SYSTEM',
                'Případ byl vytvořen', null, $stav, $user_id);

            // Notifikace při přiřazení
            if ($prirazeno_user_id && $prirazeno_user_id != $user_id) {
                fk_notify($db, $prirazeno_user_id, $user_id, $sledovani_id,
                    'FK Sledování: Nový případ přiřazen',
                    'Byl vám přiřazen nový případ FK sledování.');
            }

            $sledovani = fk_get_case($db, $objednavka_id, $faktura_id);

        } else {
            // === AKTUALIZACE EXISTUJÍCÍHO PŘÍPADU ===
            $sledovani_id = (int)$existing['id'];

            // Sady změn pro journal
            if ($stav !== $existing['stav']) {
                fk_add_udalost($db, $sledovani_id, 'ZMENA_STAVU', null,
                    $existing['stav'], $stav, $user_id);

                // Notifikace vlastníkovi / přiřazenému
                $notify_user = $existing['prirazeno_user_id'] ?: $existing['vytvoril_user_id'];
                fk_notify($db, $notify_user, $user_id, $sledovani_id,
                    'FK Sledování: Změna stavu',
                    'Stav případu byl změněn z ' . $existing['stav'] . ' na ' . $stav . '.');
            }

            if ((int)$priorita !== (int)$existing['priorita']) {
                fk_add_udalost($db, $sledovani_id, 'ZMENA_PRIORITY', null,
                    (string)$existing['priorita'], (string)$priorita, $user_id);
            }

            if ((int)$vyzaduje_akci !== (int)$existing['vyzaduje_akci']) {
                fk_add_udalost($db, $sledovani_id, 'ZMENA_VYZADUJE_AKCI', null,
                    (string)$existing['vyzaduje_akci'], (string)$vyzaduje_akci, $user_id);
            }

            $old_prirazeni = $existing['prirazeno_user_id'] ? (int)$existing['prirazeno_user_id'] : null;
            $new_prirazeni = $prirazeno_user_id ?: null;
            if ($new_prirazeni !== $old_prirazeni) {
                fk_add_udalost($db, $sledovani_id, 'PRIRAZENI', null,
                    $old_prirazeni ? (string)$old_prirazeni : 'nikdo',
                    $new_prirazeni ? (string)$new_prirazeni : 'nikdo',
                    $user_id);
                if ($new_prirazeni && $new_prirazeni != $user_id) {
                    fk_notify($db, $new_prirazeni, $user_id, $sledovani_id,
                        'FK Sledování: Přiřazení případu',
                        'Byl vám přiřazen případ FK sledování.');
                }
            }

            // Nastavit dt_uzavreni při RESOLVED
            $dt_uzavreni    = null;
            $uzavrel_user_id = null;
            if ($stav === 'RESOLVED' && $existing['stav'] !== 'RESOLVED') {
                $dt_uzavreni    = $dt;
                $uzavrel_user_id = $user_id;
            }

            $stmt = $db->prepare(
                "UPDATE " . TBL_FK_SLEDOVANI . " SET
                  stav              = ?,
                  priorita          = ?,
                  vyzaduje_akci     = ?,
                  prirazeno_user_id = ?,
                  section_kontext   = COALESCE(?, section_kontext),
                  dt_uzavreni       = COALESCE(?, dt_uzavreni),
                  uzavrel_user_id   = COALESCE(?, uzavrel_user_id),
                  upravil_user_id   = ?,
                  dt_upravy         = ?
                 WHERE id = ?"
            );
            $stmt->execute(array(
                $stav,
                $priorita,
                $vyzaduje_akci,
                $new_prirazeni,
                $section_kontext,
                $dt_uzavreni,
                $uzavrel_user_id,
                $user_id,
                $dt,
                $sledovani_id
            ));

            $sledovani = fk_get_case($db, $objednavka_id, $faktura_id);
        }

        $udalosti = fk_get_udalosti($db, $sledovani_id);

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data'   => array(
                'case'     => $sledovani,
                'udalosti' => $udalosti,
            )
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'DB chyba: ' . $e->getMessage()));
    }
}

// ====================================================
// ENDPOINT: fk/add-komentar
// ====================================================

/**
 * POST fk/add-komentar
 * Přidá komentář (KOMENTAR událost) k existujícímu případu.
 * Pokud případ neexistuje, vrátí 404.
 *
 * POST: {token, username, objednavka_id, faktura_id, text_zprava}
 */
function handle_fk_add_komentar($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    $token    = isset($input['token'])    ? $input['token']    : '';
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

    $user_id       = (int)$token_data['id'];
    $objednavka_id = fk_id(isset($input['objednavka_id']) ? $input['objednavka_id'] : 0);
    $faktura_id    = fk_id(isset($input['faktura_id'])    ? $input['faktura_id']    : 0);
    $text_zprava   = isset($input['text_zprava']) ? trim($input['text_zprava']) : '';

    if ($objednavka_id === 0 && $faktura_id === 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Musí být zadáno objednavka_id nebo faktura_id'));
        return;
    }

    if ($text_zprava === '') {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'text_zprava nesmí být prázdný'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) throw new Exception('Chyba připojení k DB');
        TimezoneHelper::setMysqlTimezone($db);

        $sledovani = fk_get_case($db, $objednavka_id, $faktura_id);

        if (!$sledovani) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Případ nebyl nalezen. Nejdříve ho vytvořte.'));
            return;
        }

        $sledovani_id = (int)$sledovani['id'];

        fk_add_udalost($db, $sledovani_id, 'KOMENTAR', $text_zprava, null, null, $user_id);

        // Notifikace vlastníkovi / přiřazenému (pokud nejde o sebe)
        $notify_user = $sledovani['prirazeno_user_id'] ?: $sledovani['vytvoril_user_id'];
        fk_notify($db, $notify_user, $user_id, $sledovani_id,
            'FK Sledování: Nový komentář',
            'Byl přidán nový komentář k případu FK sledování.');

        $udalosti = fk_get_udalosti($db, $sledovani_id);

        http_response_code(200);
        echo json_encode(array(
            'status'   => 'success',
            'message'  => 'Komentář byl přidán',
            'data'     => array(
                'case'     => $sledovani,
                'udalosti' => $udalosti,
            )
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'DB chyba: ' . $e->getMessage()));
    }
}

// ====================================================
// ENDPOINT: fk/set-stav
// ====================================================

/**
 * POST fk/set-stav
 * Zkrácený endpoint pouze pro změnu stavu (rychlá akce z UI).
 * Zapíše ZMENA_STAVU událost, pošle notifikaci.
 *
 * POST: {token, username, objednavka_id, faktura_id, stav}
 */
function handle_fk_set_stav($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    $token    = isset($input['token'])    ? $input['token']    : '';
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

    $user_id       = (int)$token_data['id'];
    $objednavka_id = fk_id(isset($input['objednavka_id']) ? $input['objednavka_id'] : 0);
    $faktura_id    = fk_id(isset($input['faktura_id'])    ? $input['faktura_id']    : 0);
    $stav          = isset($input['stav']) ? $input['stav'] : '';

    $allowed_stavy = array('OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED');

    if ($objednavka_id === 0 && $faktura_id === 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Musí být zadáno objednavka_id nebo faktura_id'));
        return;
    }

    if (!in_array($stav, $allowed_stavy)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný stav. Povoleno: ' . implode(', ', $allowed_stavy)));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) throw new Exception('Chyba připojení k DB');
        TimezoneHelper::setMysqlTimezone($db);

        $sledovani = fk_get_case($db, $objednavka_id, $faktura_id);

        if (!$sledovani) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Případ nebyl nalezen.'));
            return;
        }

        $sledovani_id = (int)$sledovani['id'];
        $stav_pred    = $sledovani['stav'];
        $dt           = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');

        if ($stav === $stav_pred) {
            // Žádná změna – vrátit aktuální stav
            http_response_code(200);
            echo json_encode(array(
                'status'  => 'success',
                'message' => 'Stav není změněn (stejná hodnota)',
                'data'    => array('case' => $sledovani, 'udalosti' => fk_get_udalosti($db, $sledovani_id))
            ));
            return;
        }

        // Nastavit dt_uzavreni při RESOLVED
        $dt_uzavreni    = ($stav === 'RESOLVED') ? $dt : null;
        $uzavrel_user_id = ($stav === 'RESOLVED') ? $user_id : null;

        // Pokud znovu otevíráme RESOLVED případ, vynulovat dt_uzavreni
        if ($stav !== 'RESOLVED' && $stav_pred === 'RESOLVED') {
            $dt_uzavreni    = false; // sentinel pro NULL update
            $uzavrel_user_id = false;
        }

        if ($dt_uzavreni === false) {
            $stmt = $db->prepare(
                "UPDATE " . TBL_FK_SLEDOVANI . " SET
                  stav = ?, dt_uzavreni = NULL, uzavrel_user_id = NULL,
                  upravil_user_id = ?, dt_upravy = ?
                 WHERE id = ?"
            );
            $stmt->execute(array($stav, $user_id, $dt, $sledovani_id));
        } else {
            $stmt = $db->prepare(
                "UPDATE " . TBL_FK_SLEDOVANI . " SET
                  stav = ?,
                  dt_uzavreni     = COALESCE(?, dt_uzavreni),
                  uzavrel_user_id = COALESCE(?, uzavrel_user_id),
                  upravil_user_id = ?, dt_upravy = ?
                 WHERE id = ?"
            );
            $stmt->execute(array($stav, $dt_uzavreni, $uzavrel_user_id, $user_id, $dt, $sledovani_id));
        }

        // Journal
        fk_add_udalost($db, $sledovani_id, 'ZMENA_STAVU', null, $stav_pred, $stav, $user_id);

        // Notifikace
        $notify_user = $sledovani['prirazeno_user_id'] ?: $sledovani['vytvoril_user_id'];
        fk_notify($db, $notify_user, $user_id, $sledovani_id,
            'FK Sledování: Změna stavu',
            'Stav případu byl změněn z ' . $stav_pred . ' na ' . $stav . '.');

        $updated_case = fk_get_case($db, $objednavka_id, $faktura_id);
        $udalosti     = fk_get_udalosti($db, $sledovani_id);

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data'   => array(
                'case'     => $updated_case,
                'udalosti' => $udalosti,
            )
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'DB chyba: ' . $e->getMessage()));
    }
}

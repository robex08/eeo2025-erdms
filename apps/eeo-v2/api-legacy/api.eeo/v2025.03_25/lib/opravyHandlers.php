<?php
/**
 * Opravy (BETA) - nástroje pro ruční opravu vazeb v datech.
 *
 * Oprava OBJ-SML-FA:
 *   Objednávky financované ze SMLOUVY, které zatím nemají žádnou fakturu,
 *   a k nim faktury, které jsou napojené PŘÍMO na tutéž smlouvu (smlouva_id
 *   vyplněné, objednavka_id prázdné). Uživatel ručně vyhodnotí, zda některá
 *   z faktur SML-FA nemá být ve skutečnosti OBJ-SML-FA (tj. přiřazená přes
 *   objednávku).
 *
 *   Jen OBJ ve fázi FAKTURACE a vyšší (bez zrušených/zamítnutých). OBJ za fází
 *   FAKTURACE (VECNA_SPRAVNOST/ZKONTROLOVANA/DOKONCENA) bez faktury = anomálie.
 *
 *   Vazba OBJ -> SML je přes JSON financovani ($.typ = 'SMLOUVA',
 *   $.cislo_smlouvy = 25_smlouvy.cislo_smlouvy).
 *
 * Přístup: pouze SUPERADMIN / ADMINISTRATOR.
 */

require_once __DIR__ . '/dbconfig.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/TimezoneHelper.php';

/**
 * Společná autorizace pro Opravy - POST, token z body, jen admin role.
 * Při chybě rovnou odešle response a vrátí null.
 */
function opravy_authorize($input, $db) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda']);
        return null;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
    $tokenData = verify_token_v2($username, $token, $db);
    if (!$tokenData) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný nebo chybějící token']);
        return null;
    }

    if (empty($tokenData['is_admin'])) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Modul Opravy je dostupný pouze pro SUPERADMIN a ADMINISTRATOR']);
        return null;
    }

    return $tokenData;
}

/**
 * POST opravy/obj-sml-faktury/list
 *
 * Response data:
 *   objednavky: [{ ...objednavka, smlouvy: [{ ...smlouva, faktury: [...] }] }]
 *   souhrn: { pocet_objednavek, pocet_smluv, pocet_faktur }
 */
function handle_opravy_obj_sml_faktury_list($input, $config) {
    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        TimezoneHelper::setMysqlTimezone($db);

        if (!opravy_authorize($input, $db)) {
            return;
        }

        // ---- 1. Objednávky financované ze smlouvy bez jakékoliv aktivní faktury ----
        $sqlObj = "
            SELECT
                o.id,
                o.cislo_objednavky,
                o.dt_objednavky,
                o.predmet,
                o.max_cena_s_dph,
                (SELECT SUM(p.cena_s_dph) FROM " . TBL_OBJEDNAVKY_POLOZKY . " p WHERE p.objednavka_id = o.id) AS polozky_cena_s_dph,
                (SELECT SUM(p.cena_bez_dph) FROM " . TBL_OBJEDNAVKY_POLOZKY . " p WHERE p.objednavka_id = o.id) AS polozky_cena_bez_dph,
                (SELECT COUNT(*) FROM " . TBL_OBJEDNAVKY_POLOZKY . " p WHERE p.objednavka_id = o.id) AS pocet_polozek,
                o.stav_objednavky,
                o.dodavatel_nazev,
                o.dodavatel_ico,
                o.strediska_kod,
                TRIM(JSON_VALUE(o.financovani, '$.cislo_smlouvy')) AS cislo_smlouvy,
                JSON_VALUE(o.stav_workflow_kod, '$[last]') AS workflow_faze,
                TRIM(CONCAT_WS(' ', u.jmeno, u.prijmeni)) AS objednatel
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = COALESCE(NULLIF(o.objednatel_id, 0), o.uzivatel_id)
            WHERE o.aktivni = 1
              AND JSON_VALUE(o.financovani, '$.typ') = 'SMLOUVA'
              -- Jen fáze FAKTURACE a vyšší (rozpracované/odeslané OBJ fakturu ještě mít nemusí)
              AND (
                  JSON_CONTAINS(o.stav_workflow_kod, JSON_QUOTE('FAKTURACE'))
                  OR JSON_VALUE(o.stav_workflow_kod, '$[last]') IN ('VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA')
              )
              AND COALESCE(JSON_VALUE(o.stav_workflow_kod, '$[last]'), '') NOT IN ('ZRUSENA', 'ZAMITNUTA', 'STORNO')
              AND NOT EXISTS (
                  SELECT 1 FROM " . TBL_FAKTURY . " f
                  WHERE f.objednavka_id = o.id AND f.aktivni = 1
              )
            ORDER BY o.dt_objednavky DESC, o.id DESC
        ";
        $objednavky = $db->query($sqlObj)->fetchAll(PDO::FETCH_ASSOC);

        $cislaSmluv = array_values(array_unique(array_filter(
            array_map(fn($o) => (string)($o['cislo_smlouvy'] ?? ''), $objednavky),
            fn($c) => $c !== ''
        )));

        // ---- 2. Smlouvy obsažené v těchto objednávkách ----
        $smlouvyByCislo = [];
        $smlouvyById = [];
        if ($cislaSmluv) {
            $ph = implode(',', array_fill(0, count($cislaSmluv), '?'));
            $stmt = $db->prepare("
                SELECT
                    s.id, s.cislo_smlouvy, s.nazev_smlouvy, s.nazev_firmy, s.ico,
                    s.platnost_od, s.platnost_do, s.hodnota_s_dph, s.cerpano_celkem, s.zbyva, s.procento_cerpani,
                    s.stav, s.aktivni,
                    s.usek_zkr, s.druh_smlouvy
                FROM " . TBL_SMLOUVY . " s
                WHERE s.cislo_smlouvy IN ($ph)
                ORDER BY s.cislo_smlouvy, s.id
            ");
            $stmt->execute($cislaSmluv);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $s) {
                $s['id'] = (int)$s['id'];
                $s['faktury'] = [];
                $smlouvyById[$s['id']] = $s;
                $smlouvyByCislo[mb_strtolower(trim($s['cislo_smlouvy']))][] = $s['id'];
            }
        }

        // ---- 3. Faktury napojené přímo na tyto smlouvy (bez objednávky) ----
        $pocetFaktur = 0;
        if ($smlouvyById) {
            $ids = array_keys($smlouvyById);
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $stmt = $db->prepare("
                SELECT
                    f.id, f.smlouva_id, f.fa_cislo_vema, f.fa_castka, f.fa_typ, f.stav,
                    f.fa_datum_vystaveni, f.fa_datum_splatnosti, f.fa_datum_doruceni,
                    f.fa_zaplacena, f.fa_datum_zaplaceni, f.fa_strediska_kod, f.fa_poznamka,
                    f.dt_vytvoreni,
                    TRIM(CONCAT_WS(' ', u.jmeno, u.prijmeni)) AS vytvoril
                FROM " . TBL_FAKTURY . " f
                LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = f.vytvoril_uzivatel_id
                WHERE f.smlouva_id IN ($ph)
                  AND (f.objednavka_id IS NULL OR f.objednavka_id = 0)
                  AND f.aktivni = 1
                ORDER BY f.fa_datum_vystaveni DESC, f.id DESC
            ");
            $stmt->execute($ids);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $f) {
                $f['id'] = (int)$f['id'];
                $f['smlouva_id'] = (int)$f['smlouva_id'];
                $f['fa_castka'] = $f['fa_castka'] !== null ? (float)$f['fa_castka'] : null;
                $f['fa_zaplacena'] = (int)$f['fa_zaplacena'];
                $smlouvyById[$f['smlouva_id']]['faktury'][] = $f;
                $pocetFaktur++;
            }
        }

        // ---- 4. Složit strom OBJ -> SML -> FA ----
        foreach ($objednavky as &$o) {
            $o['id'] = (int)$o['id'];
            $o['max_cena_s_dph'] = $o['max_cena_s_dph'] !== null ? (float)$o['max_cena_s_dph'] : null;
            $o['polozky_cena_s_dph'] = $o['polozky_cena_s_dph'] !== null ? (float)$o['polozky_cena_s_dph'] : null;
            $o['polozky_cena_bez_dph'] = $o['polozky_cena_bez_dph'] !== null ? (float)$o['polozky_cena_bez_dph'] : null;
            $o['pocet_polozek'] = (int)$o['pocet_polozek'];
            // Anomálie: OBJ je za fází FAKTURACE (věcná správnost / zkontrolovaná / dokončená), ale nemá fakturu
            $o['anomalie'] = in_array($o['workflow_faze'], ['VECNA_SPRAVNOST', 'ZKONTROLOVANA', 'DOKONCENA'], true);
            $key = mb_strtolower(trim((string)($o['cislo_smlouvy'] ?? '')));
            $o['smlouvy'] = array_map(fn($id) => $smlouvyById[$id], $smlouvyByCislo[$key] ?? []);
        }
        unset($o);

        // ---- 5. Sdílené koncepty spárování (faktura se zatím nemění) ----
        $koncepty = opravy_load_koncepty($db);

        echo json_encode([
            'status' => 'success',
            'data' => [
                'objednavky' => $objednavky,
                'koncepty' => $koncepty,
                'souhrn' => [
                    'pocet_objednavek' => count($objednavky),
                    'pocet_smluv' => count($smlouvyById),
                    'pocet_faktur' => $pocetFaktur,
                    'pocet_anomalii' => count(array_filter($objednavky, fn($o) => $o['anomalie'])),
                ],
            ],
            'message' => 'OK',
            'meta' => ['timestamp' => date('c'), 'version' => 'v2'],
        ]);
    } catch (PDOException $e) {
        error_log('handle_opravy_obj_sml_faktury_list DB: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'code' => 'DB_ERROR', 'message' => 'Chyba databáze při načítání dat pro opravy']);
    } catch (Exception $e) {
        error_log('handle_opravy_obj_sml_faktury_list: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba při načítání dat pro opravy: ' . $e->getMessage()]);
    }
}


// ============================================================================
// Koncepty a uložení oprav OBJ-SML-FA
//
// Uložení mění na faktuře VÝHRADNĚ vazbu: smlouva_id -> NULL, objednavka_id ->
// id OBJ (stejný tvar jako běžné faktury OBJ financované ze smlouvy). Nic
// dalšího (ani dt_aktualizace/aktualizoval) se na faktuře nemění. Změna se
// zapisuje do auditu (25a_audit_zmen) a do 25_opravy_navrhy kvůli Undo.
// ============================================================================

function opravy_json_success($data, $message = 'OK') {
    echo json_encode([
        'status' => 'success',
        'data' => $data,
        'message' => $message,
        'meta' => ['timestamp' => date('c'), 'version' => 'v2'],
    ]);
}

function opravy_json_error($httpCode, $message, $code = null) {
    http_response_code($httpCode);
    $out = ['status' => 'error', 'message' => $message];
    if ($code) $out['code'] = $code;
    echo json_encode($out);
}

function opravy_int_list($value) {
    if (!is_array($value)) return [];
    return array_values(array_unique(array_filter(array_map('intval', $value), fn($v) => $v > 0)));
}

function opravy_load_koncepty($db) {
    $stmt = $db->query("
        SELECT n.id, n.faktura_id, n.objednavka_id, n.smlouva_id, n.dt_vytvoreni,
               TRIM(CONCAT_WS(' ', u.jmeno, u.prijmeni)) AS vytvoril
        FROM " . TBL_OPRAVY_NAVRHY . " n
        LEFT JOIN " . TBL_UZIVATELE . " u ON u.id = n.vytvoril_id
        WHERE n.stav = 'KONCEPT' AND n.typ = 'OBJ_SML_FA'
        ORDER BY n.dt_vytvoreni, n.id
    ");
    return array_map(fn($r) => [
        'id' => (int)$r['id'],
        'faktura_id' => (int)$r['faktura_id'],
        'objednavka_id' => (int)$r['objednavka_id'],
        'smlouva_id' => $r['smlouva_id'] !== null ? (int)$r['smlouva_id'] : null,
        'dt_vytvoreni' => $r['dt_vytvoreni'],
        'vytvoril' => $r['vytvoril'],
    ], $stmt->fetchAll(PDO::FETCH_ASSOC));
}

/**
 * Společný obal handleru: DB, timezone, autorizace, try/catch.
 * $fn($db, $tokenData) provede vlastní práci a odešle response.
 */
function opravy_run($input, $config, $logName, callable $fn) {
    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        TimezoneHelper::setMysqlTimezone($db);

        $tokenData = opravy_authorize($input, $db);
        if (!$tokenData) {
            return;
        }
        $fn($db, $tokenData);
    } catch (PDOException $e) {
        if (isset($db) && $db && $db->inTransaction()) $db->rollBack();
        error_log("$logName DB: " . $e->getMessage());
        opravy_json_error(500, 'Chyba databáze při zpracování opravy', 'DB_ERROR');
    } catch (Exception $e) {
        if (isset($db) && $db && $db->inTransaction()) $db->rollBack();
        error_log("$logName: " . $e->getMessage());
        opravy_json_error(500, 'Chyba při zpracování opravy: ' . $e->getMessage());
    }
}

/**
 * POST opravy/navrhy/create
 * body: pairs: [{faktura_id, objednavka_id}]
 * Založí (nebo přesune) KONCEPT spárování. Faktura se NEMĚNÍ.
 */
function handle_opravy_navrhy_create($input, $config) {
    opravy_run($input, $config, 'handle_opravy_navrhy_create', function ($db, $tokenData) use ($input) {
        $pairs = is_array($input['pairs'] ?? null) ? $input['pairs'] : [];
        if (!$pairs) {
            opravy_json_error(400, 'Nejsou vybrány žádné faktury ke spárování');
            return;
        }

        $stmtFa = $db->prepare("
            SELECT f.id, f.objednavka_id, f.smlouva_id, f.aktivni, s.cislo_smlouvy
            FROM " . TBL_FAKTURY . " f
            LEFT JOIN " . TBL_SMLOUVY . " s ON s.id = f.smlouva_id
            WHERE f.id = ?
        ");
        $stmtObj = $db->prepare("
            SELECT o.id, o.aktivni, JSON_VALUE(o.financovani, '$.typ') AS fin_typ,
                   TRIM(JSON_VALUE(o.financovani, '$.cislo_smlouvy')) AS cislo_smlouvy
            FROM " . TBL_OBJEDNAVKY . " o
            WHERE o.id = ?
        ");
        $stmtDel = $db->prepare("DELETE FROM " . TBL_OPRAVY_NAVRHY . " WHERE stav = 'KONCEPT' AND faktura_id = ?");
        $stmtIns = $db->prepare("
            INSERT INTO " . TBL_OPRAVY_NAVRHY . "
                (typ, faktura_id, objednavka_id, smlouva_id, stav, vytvoril_id, dt_vytvoreni)
            VALUES ('OBJ_SML_FA', ?, ?, ?, 'KONCEPT', ?, NOW())
        ");

        $created = 0;
        $errors = [];
        $db->beginTransaction();
        foreach ($pairs as $pair) {
            $faId = (int)($pair['faktura_id'] ?? 0);
            $objId = (int)($pair['objednavka_id'] ?? 0);

            $stmtFa->execute([$faId]);
            $fa = $stmtFa->fetch(PDO::FETCH_ASSOC);
            $stmtObj->execute([$objId]);
            $obj = $stmtObj->fetch(PDO::FETCH_ASSOC);

            $err = match (true) {
                !$fa || (int)$fa['aktivni'] !== 1 => 'faktura neexistuje nebo není aktivní',
                !empty($fa['objednavka_id']) => 'faktura už má objednávku',
                empty($fa['smlouva_id']) => 'faktura není napojená na smlouvu',
                !$obj || (int)$obj['aktivni'] !== 1 => 'objednávka neexistuje nebo není aktivní',
                $obj['fin_typ'] !== 'SMLOUVA' => 'objednávka není financovaná ze smlouvy',
                mb_strtolower(trim((string)$obj['cislo_smlouvy'])) !== mb_strtolower(trim((string)$fa['cislo_smlouvy'])) => 'smlouva faktury a objednávky se liší',
                default => null,
            };
            if ($err) {
                $errors[] = ['faktura_id' => $faId, 'objednavka_id' => $objId, 'message' => $err];
                continue;
            }

            $stmtDel->execute([$faId]);
            $stmtIns->execute([$faId, $objId, (int)$fa['smlouva_id'], (int)$tokenData['id']]);
            $created++;
        }
        $db->commit();

        opravy_json_success(
            ['created' => $created, 'errors' => $errors, 'koncepty' => opravy_load_koncepty($db)],
            $errors ? "Spárováno $created, přeskočeno " . count($errors) : "Spárováno $created"
        );
    });
}

/**
 * POST opravy/navrhy/revert
 * body: ids: [id konceptu] nebo all: true
 * Vrátí (smaže) KONCEPTY - faktura se nikdy neměnila, není co vracet v datech.
 */
function handle_opravy_navrhy_revert($input, $config) {
    opravy_run($input, $config, 'handle_opravy_navrhy_revert', function ($db) use ($input) {
        if (!empty($input['all'])) {
            $deleted = $db->exec("DELETE FROM " . TBL_OPRAVY_NAVRHY . " WHERE stav = 'KONCEPT' AND typ = 'OBJ_SML_FA'");
        } else {
            $ids = opravy_int_list($input['ids'] ?? null);
            if (!$ids) {
                opravy_json_error(400, 'Nejsou vybrány žádné koncepty k vrácení');
                return;
            }
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $stmt = $db->prepare("DELETE FROM " . TBL_OPRAVY_NAVRHY . " WHERE stav = 'KONCEPT' AND id IN ($ph)");
            $stmt->execute($ids);
            $deleted = $stmt->rowCount();
        }
        opravy_json_success(['reverted' => (int)$deleted, 'koncepty' => opravy_load_koncepty($db)], "Vráceno $deleted");
    });
}

/**
 * POST opravy/navrhy/commit
 * body: ids: [id konceptu] (volitelné, jinak všechny KONCEPTY)
 * Zapíše koncepty do faktur: smlouva_id -> NULL, objednavka_id -> OBJ.
 * Faktura, která se mezitím změnila, se přeskočí (konflikt) a koncept zůstane.
 */
function handle_opravy_navrhy_commit($input, $config) {
    opravy_run($input, $config, 'handle_opravy_navrhy_commit', function ($db, $tokenData) use ($input) {
        $ids = opravy_int_list($input['ids'] ?? null);
        $sql = "SELECT * FROM " . TBL_OPRAVY_NAVRHY . " WHERE stav = 'KONCEPT' AND typ = 'OBJ_SML_FA'";
        if ($ids) {
            $sql .= " AND id IN (" . implode(',', array_fill(0, count($ids), '?')) . ")";
        }
        $sql .= " ORDER BY id FOR UPDATE";

        $db->beginTransaction();
        $stmt = $db->prepare($sql);
        $stmt->execute($ids);
        $navrhy = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtFa = $db->prepare("SELECT id, objednavka_id, smlouva_id, aktivni FROM " . TBL_FAKTURY . " WHERE id = ? FOR UPDATE");
        $stmtUpdFa = $db->prepare("UPDATE " . TBL_FAKTURY . " SET objednavka_id = ?, smlouva_id = NULL WHERE id = ?");
        $stmtUpdNavrh = $db->prepare("
            UPDATE " . TBL_OPRAVY_NAVRHY . "
            SET stav = 'ULOZENO', puvodni_objednavka_id = ?, puvodni_smlouva_id = ?, ulozil_id = ?, dt_ulozeni = NOW()
            WHERE id = ?
        ");

        $saved = 0;
        $conflicts = [];
        $auditBatch = '';
        foreach ($navrhy as $n) {
            $stmtFa->execute([(int)$n['faktura_id']]);
            $fa = $stmtFa->fetch(PDO::FETCH_ASSOC);
            if (!$fa || (int)$fa['aktivni'] !== 1 || !empty($fa['objednavka_id']) || (int)$fa['smlouva_id'] !== (int)$n['smlouva_id']) {
                $conflicts[] = ['id' => (int)$n['id'], 'faktura_id' => (int)$n['faktura_id'], 'message' => 'Faktura se mezitím změnila - koncept nebyl uložen'];
                continue;
            }

            $stmtUpdFa->execute([(int)$n['objednavka_id'], (int)$fa['id']]);
            $stmtUpdNavrh->execute([$fa['objednavka_id'] !== null ? (int)$fa['objednavka_id'] : null, (int)$fa['smlouva_id'], (int)$tokenData['id'], (int)$n['id']]);

            $auditBatch = audit_log_field_changes(
                $db, $tokenData, 'FAKTURA', (int)$fa['id'], 'opravy/navrhy/commit',
                ['objednavka_id' => $fa['objednavka_id'], 'smlouva_id' => $fa['smlouva_id']],
                ['objednavka_id' => (int)$n['objednavka_id'], 'smlouva_id' => null],
                $auditBatch,
                'Opravy: přepojení FA ze SML na OBJ (OBJ-SML-FA)'
            );
            $saved++;
        }
        $db->commit();

        opravy_json_success(
            ['saved' => $saved, 'conflicts' => $conflicts, 'koncepty' => opravy_load_koncepty($db)],
            $conflicts ? "Uloženo $saved, konflikty " . count($conflicts) : "Uloženo $saved"
        );
    });
}

/**
 * POST opravy/navrhy/historie
 * Uložené a vrácené opravy (pro Undo po uložení).
 */
function handle_opravy_navrhy_historie($input, $config) {
    opravy_run($input, $config, 'handle_opravy_navrhy_historie', function ($db) {
        $stmt = $db->query("
            SELECT
                n.id, n.stav, n.faktura_id, n.objednavka_id, n.puvodni_smlouva_id,
                n.dt_vytvoreni, n.dt_ulozeni, n.dt_vraceni,
                f.fa_cislo_vema, f.fa_castka, f.fa_datum_vystaveni, f.objednavka_id AS aktualni_objednavka_id,
                o.cislo_objednavky, o.predmet,
                s.cislo_smlouvy, s.nazev_firmy,
                TRIM(CONCAT_WS(' ', uv.jmeno, uv.prijmeni)) AS vytvoril,
                TRIM(CONCAT_WS(' ', uu.jmeno, uu.prijmeni)) AS ulozil,
                TRIM(CONCAT_WS(' ', ur.jmeno, ur.prijmeni)) AS vratil
            FROM " . TBL_OPRAVY_NAVRHY . " n
            LEFT JOIN " . TBL_FAKTURY . " f ON f.id = n.faktura_id
            LEFT JOIN " . TBL_OBJEDNAVKY . " o ON o.id = n.objednavka_id
            LEFT JOIN " . TBL_SMLOUVY . " s ON s.id = COALESCE(n.puvodni_smlouva_id, n.smlouva_id)
            LEFT JOIN " . TBL_UZIVATELE . " uv ON uv.id = n.vytvoril_id
            LEFT JOIN " . TBL_UZIVATELE . " uu ON uu.id = n.ulozil_id
            LEFT JOIN " . TBL_UZIVATELE . " ur ON ur.id = n.vratil_id
            WHERE n.stav IN ('ULOZENO', 'VRACENO') AND n.typ = 'OBJ_SML_FA'
            ORDER BY COALESCE(n.dt_vraceni, n.dt_ulozeni) DESC, n.id DESC
        ");
        $rows = array_map(function ($r) {
            $r['id'] = (int)$r['id'];
            $r['faktura_id'] = (int)$r['faktura_id'];
            $r['objednavka_id'] = (int)$r['objednavka_id'];
            $r['fa_castka'] = $r['fa_castka'] !== null ? (float)$r['fa_castka'] : null;
            // Undo jde jen pokud je faktura stále na té objednávce, kam ji oprava dala
            $r['lze_vratit'] = $r['stav'] === 'ULOZENO' && (int)$r['aktualni_objednavka_id'] === (int)$r['objednavka_id'];
            return $r;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));

        opravy_json_success(['historie' => $rows]);
    });
}

/**
 * POST opravy/navrhy/undo
 * body: id (uložené opravy)
 * Vrátí faktuře původní vazbu (objednavka_id/smlouva_id), jen pokud ji od
 * uložení nikdo nezměnil.
 */
function handle_opravy_navrhy_undo($input, $config) {
    opravy_run($input, $config, 'handle_opravy_navrhy_undo', function ($db, $tokenData) use ($input) {
        $id = (int)($input['id'] ?? 0);

        $db->beginTransaction();
        $stmt = $db->prepare("SELECT * FROM " . TBL_OPRAVY_NAVRHY . " WHERE id = ? AND stav = 'ULOZENO' FOR UPDATE");
        $stmt->execute([$id]);
        $n = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$n) {
            $db->rollBack();
            opravy_json_error(404, 'Uložená oprava nebyla nalezena (možná už byla vrácena)');
            return;
        }

        $stmtFa = $db->prepare("SELECT id, objednavka_id, smlouva_id FROM " . TBL_FAKTURY . " WHERE id = ? FOR UPDATE");
        $stmtFa->execute([(int)$n['faktura_id']]);
        $fa = $stmtFa->fetch(PDO::FETCH_ASSOC);
        if (!$fa || (int)$fa['objednavka_id'] !== (int)$n['objednavka_id'] || $fa['smlouva_id'] !== null) {
            $db->rollBack();
            opravy_json_error(409, 'Faktura se od uložení opravy změnila - vrácení není bezpečné', 'CONFLICT');
            return;
        }

        $puvObj = $n['puvodni_objednavka_id'] !== null ? (int)$n['puvodni_objednavka_id'] : null;
        $puvSml = $n['puvodni_smlouva_id'] !== null ? (int)$n['puvodni_smlouva_id'] : null;
        $db->prepare("UPDATE " . TBL_FAKTURY . " SET objednavka_id = ?, smlouva_id = ? WHERE id = ?")
            ->execute([$puvObj, $puvSml, (int)$fa['id']]);
        $db->prepare("UPDATE " . TBL_OPRAVY_NAVRHY . " SET stav = 'VRACENO', vratil_id = ?, dt_vraceni = NOW() WHERE id = ?")
            ->execute([(int)$tokenData['id'], $id]);

        audit_log_field_changes(
            $db, $tokenData, 'FAKTURA', (int)$fa['id'], 'opravy/navrhy/undo',
            ['objednavka_id' => $fa['objednavka_id'], 'smlouva_id' => $fa['smlouva_id']],
            ['objednavka_id' => $puvObj, 'smlouva_id' => $puvSml],
            '',
            'Opravy: vrácení přepojení FA zpět na SML'
        );
        $db->commit();

        opravy_json_success(['id' => $id], 'Oprava vrácena');
    });
}

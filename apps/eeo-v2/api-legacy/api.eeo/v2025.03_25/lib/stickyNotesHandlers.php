<?php

// Sticky Notes API Handlers (v2025.03_25)
// - 1 řádek = 1 sticky poznámka (menší konflikty mezi PC)
// - Sdílení konkrétní sticky: USER / USEK / ALL

require_once __DIR__ . '/TimezoneHelper.php';

// Práva bitmask
// 1 = READ, 2 = WRITE, 4 = COMMENT
if (!defined('STICKY_RIGHT_READ')) define('STICKY_RIGHT_READ', 1);
if (!defined('STICKY_RIGHT_WRITE')) define('STICKY_RIGHT_WRITE', 2);
if (!defined('STICKY_RIGHT_COMMENT')) define('STICKY_RIGHT_COMMENT', 4);

/**
 * Vrátí přístup k poznámce (owner + sdílecí maska) pro konkrétního uživatele.
 * Používá stejné vyhodnocení masky jako sticky/list.
 */
function sticky_get_note_access_mask($db, $user_id, $sticky_id, $queries) {
    try {
        // usek_id uživatele (pro sdílení per-úsek)
        $usek_id = 0;
        if (isset($queries['sticky_user_usek_id'])) {
            $stmt_usek = $db->prepare($queries['sticky_user_usek_id']);
            $stmt_usek->bindValue(':user_id', (int)$user_id, PDO::PARAM_INT);
            $stmt_usek->execute();
            $row_usek = $stmt_usek->fetch(PDO::FETCH_ASSOC);
            if ($row_usek && array_key_exists('usek_id', $row_usek) && $row_usek['usek_id'] !== null) {
                $usek_id = (int)$row_usek['usek_id'];
            }
        }

        $sql = "
            SELECT
                n.vlastnik_id AS owner_user_id,
                MAX(
                    CASE
                        WHEN n.vlastnik_id = :user_id THEN 7
                        WHEN s.cil_typ = 'VSICHNI' THEN s.prava_mask
                        WHEN s.cil_typ = 'USEK' AND s.cil_id = :usek_id THEN s.prava_mask
                        WHEN s.cil_typ = 'UZIVATEL' AND s.cil_id = :user_id THEN s.prava_mask
                        ELSE 0
                    END
                ) AS prava_mask
            FROM " . TBL_STICKY_POZNAMKY . " n
            LEFT JOIN " . TBL_STICKY_POZNAMKY_SDILENI . " s ON s.poznamka_id = n.id
            WHERE n.id = :id
              AND n.smazano = 0
            GROUP BY n.id
            LIMIT 1
        ";
        $st = $db->prepare($sql);
        $st->bindValue(':id', (int)$sticky_id, PDO::PARAM_INT);
        $st->bindValue(':user_id', (int)$user_id, PDO::PARAM_INT);
        $st->bindValue(':usek_id', (int)$usek_id, PDO::PARAM_INT);
        $st->execute();
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        return [
            'owner_user_id' => isset($row['owner_user_id']) ? (int)$row['owner_user_id'] : null,
            'prava_mask' => isset($row['prava_mask']) ? (int)$row['prava_mask'] : 0,
        ];
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Ověření oprávnění pro Sticky poznámky.
 * - SUPERADMIN má automaticky přístup.
 * - Jinak vyžaduje právo STICKY_MANAGE.
 */
function sticky_has_manage_permission($db, $user_id) {
    try {
        // 1) SUPERADMIN role bypass
        $sqlRole = "
            SELECT 1
            FROM " . TBL_UZIVATELE_ROLE . " ur
            INNER JOIN " . TBL_ROLE . " r ON ur.role_id = r.id
            WHERE ur.uzivatel_id = :user_id
              AND r.kod_role = 'SUPERADMIN'
              AND r.aktivni = 1
            LIMIT 1
        ";
        $st = $db->prepare($sqlRole);
        $st->bindValue(':user_id', (int)$user_id, PDO::PARAM_INT);
        $st->execute();
        if ($st->fetchColumn()) return true;

                // 2) Právo STICKY_MANAGE – standardní model:
                //    a) Přímé právo uživatele: 25_role_prava (user_id = :user_id, role_id = -1)
                //    b) Právo z rolí: 25_role_prava (user_id = -1, role_id = ur.role_id)
                // Pozn.: Stejná logika se používá i jinde (např. CashbookPermissions).
                $sql = "
                        SELECT 1
                        FROM " . TBL_PRAVA . " p
                        WHERE p.kod_prava = :kod_prava
                            AND p.aktivni = 1
                            AND (
                                p.id IN (
                                    SELECT rp.pravo_id
                                    FROM " . TBL_ROLE_PRAVA . " rp
                                    WHERE rp.user_id = :user_id
                                        AND rp.role_id = -1
                                        AND rp.aktivni = 1
                                )
                                OR p.id IN (
                                    SELECT rp2.pravo_id
                                    FROM " . TBL_UZIVATELE_ROLE . " ur
                                    INNER JOIN " . TBL_ROLE_PRAVA . " rp2
                                        ON rp2.role_id = ur.role_id
                                     AND rp2.user_id = -1
                                     AND rp2.aktivni = 1
                                    WHERE ur.uzivatel_id = :user_id
                                )
                            )
                        LIMIT 1
                ";
                $st2 = $db->prepare($sql);
                $st2->bindValue(':user_id', (int)$user_id, PDO::PARAM_INT);
                $st2->bindValue(':kod_prava', 'STICKY_MANAGE', PDO::PARAM_STR);
                $st2->execute();
                return (bool)$st2->fetchColumn();
    } catch (Exception $e) {
        // Pokud selže kontrola, raději nepovolovat.
        return false;
    }
}

function sticky_require_auth($input, $config) {
    $required = ['username', 'token'];
    foreach ($required as $param) {
        if (!isset($input[$param]) || $input[$param] === '') {
            api_error(400, "Chybí povinný parametr: $param", 'MISSING_PARAMETERS');
            return null;
        }
    }

    $username = $input['username'];
    $token = $input['token'];

    try {
        $db = get_db($config);
        TimezoneHelper::setMysqlTimezone($db);
    } catch (Exception $e) {
        api_error(500, 'Chyba připojení k databázi', 'DB_CONNECTION_ERROR');
        return null;
    }

    $token_data = verify_token($token, $db);
    if (!$token_data) {
        api_error(401, 'Neplatný token', 'UNAUTHORIZED');
        return null;
    }

    if ($token_data['username'] !== $username) {
        api_error(401, 'Token nepatří k uživateli', 'TOKEN_USER_MISMATCH');
        return null;
    }

    $user_id = (int)$token_data['id'];

    // Oprávnění pro sticky (feature gate)
    if (!sticky_has_manage_permission($db, $user_id)) {
        api_error(403, 'Nemáte oprávnění používat sticky poznámky', 'FORBIDDEN');
        return null;
    }

    return ['db' => $db, 'user_id' => $user_id, 'username' => $username];
}

/**
 * Seznam sticky poznámek (vlastní + sdílené)
 * Endpoint: POST /sticky/list
 * Body: { username, token }
 */
function handle_sticky_list($input, $config, $queries) {
    $auth = sticky_require_auth($input, $config);
    if (!$auth) return;
    $db = $auth['db'];
    $user_id = $auth['user_id'];

    try {
        // usek_id uživatele (pro sdílení per-úsek)
        $usek_id = null;
        if (isset($queries['sticky_user_usek_id'])) {
            $stmt_usek = $db->prepare($queries['sticky_user_usek_id']);
            $stmt_usek->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt_usek->execute();
            $row_usek = $stmt_usek->fetch(PDO::FETCH_ASSOC);
            if ($row_usek && isset($row_usek['usek_id'])) {
                $usek_id = $row_usek['usek_id'] !== null ? (int)$row_usek['usek_id'] : null;
            }
        }
        if ($usek_id === null) $usek_id = 0;

        $stmt = $db->prepare($queries['sticky_notes_list_accessible']);
        $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindValue(':usek_id', $usek_id, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $notes = [];
        foreach ($rows as $r) {
            $data = null;
            if (isset($r['data_json']) && $r['data_json'] !== '') {
                $data = json_decode($r['data_json'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $data = null;
                }
            }

            $notes[] = [
                'id' => (int)$r['id'],
                'owner_user_id' => (int)$r['owner_user_id'],
                'client_uid' => (string)$r['client_uid'],
                'data' => $data,
                'version' => isset($r['version']) ? (int)$r['version'] : 1,
                'prava_mask' => isset($r['prava_mask']) ? (int)$r['prava_mask'] : 0,
                'dt_sdileni' => $r['dt_sdileni'] ?? null,
                'dt_vytvoreni' => $r['dt_vytvoreni'] ?? null,
                'dt_aktualizace' => $r['dt_aktualizace'] ?? null,
            ];
        }

        api_ok($notes, ['count' => count($notes)]);

    } catch (Exception $e) {
        api_error(500, 'Chyba při načítání sticky poznámek: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Bulk upsert sticky poznámek (autosave)
 * Endpoint: POST /sticky/bulk-upsert
 * Body: { username, token, notes: [{ id?, client_uid, data, version? }] }
 */
function handle_sticky_bulk_upsert($input, $config, $queries) {
    $auth = sticky_require_auth($input, $config);
    if (!$auth) return;
    $db = $auth['db'];
    $user_id = $auth['user_id'];

    $notes = isset($input['notes']) ? $input['notes'] : null;
    if (!is_array($notes)) {
        api_error(400, 'Chybí pole notes', 'MISSING_NOTES');
        return;
    }

    $results = [];

    try {
        foreach ($notes as $n) {
            $client_uid = isset($n['client_uid']) ? trim((string)$n['client_uid']) : '';
            $db_id = isset($n['id']) ? (int)$n['id'] : null;
            $version = isset($n['version']) ? (int)$n['version'] : null;
            $data = isset($n['data']) ? $n['data'] : null;

            if ($client_uid === '' || $data === null) {
                $results[] = [
                    'client_uid' => $client_uid,
                    'ok' => false,
                    'status' => 'invalid',
                    'message' => 'Chybí client_uid nebo data'
                ];
                continue;
            }

            $data_json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
            if ($data_json === false) {
                $results[] = [
                    'client_uid' => $client_uid,
                    'ok' => false,
                    'status' => 'invalid_json',
                    'message' => 'Neplatný JSON v data'
                ];
                continue;
            }

            // Pokud nemáme db_id, zkusíme dohledat podle owner + client_uid (migrace / opakovaný insert)
            if (!$db_id) {
                $stmt_find = $db->prepare($queries['sticky_note_select_by_owner_client_uid']);
                $stmt_find->bindValue(':owner_user_id', $user_id, PDO::PARAM_INT);
                $stmt_find->bindValue(':client_uid', $client_uid, PDO::PARAM_STR);
                $stmt_find->execute();
                $found = $stmt_find->fetch(PDO::FETCH_ASSOC);
                if ($found) {
                    $db_id = (int)$found['id'];
                    if ($version === null && isset($found['version'])) {
                        $version = (int)$found['version'];
                    }
                }
            }

            if (!$db_id) {
                // INSERT
                $stmt_ins = $db->prepare($queries['sticky_note_insert']);
                $stmt_ins->bindValue(':owner_user_id', $user_id, PDO::PARAM_INT);
                $stmt_ins->bindValue(':client_uid', $client_uid, PDO::PARAM_STR);
                $stmt_ins->bindValue(':data_json', $data_json, PDO::PARAM_STR);
                $stmt_ins->execute();

                $new_id = (int)$db->lastInsertId();

                $results[] = [
                    'client_uid' => $client_uid,
                    'ok' => true,
                    'status' => 'created',
                    'id' => $new_id,
                    'version' => 1
                ];
                continue;
            }

            // UPDATE
            $used_lock = ($version !== null);
            if ($used_lock) {
                $stmt_upd = $db->prepare($queries['sticky_note_update_with_version']);
                $stmt_upd->bindValue(':id', $db_id, PDO::PARAM_INT);
                $stmt_upd->bindValue(':owner_user_id', $user_id, PDO::PARAM_INT);
                $stmt_upd->bindValue(':data_json', $data_json, PDO::PARAM_STR);
                $stmt_upd->bindValue(':version', $version, PDO::PARAM_INT);
                $stmt_upd->execute();

                if ($stmt_upd->rowCount() < 1) {
                    // Buď konflikt verze, nebo uživatel není owner.
                    // Pokud má sdílení s WRITE, povolíme update i pro sdílenou poznámku.
                    $access = sticky_get_note_access_mask($db, $user_id, $db_id, $queries);
                    if ($access && isset($access['owner_user_id']) && (int)$access['owner_user_id'] !== (int)$user_id) {
                        $mask = (int)($access['prava_mask'] ?? 0);
                        if (($mask & STICKY_RIGHT_WRITE) === STICKY_RIGHT_WRITE) {
                            $stmt_upd2 = $db->prepare($queries['sticky_note_update_with_version_any_owner']);
                            $stmt_upd2->bindValue(':id', $db_id, PDO::PARAM_INT);
                            $stmt_upd2->bindValue(':data_json', $data_json, PDO::PARAM_STR);
                            $stmt_upd2->bindValue(':version', $version, PDO::PARAM_INT);
                            $stmt_upd2->execute();

                            if ($stmt_upd2->rowCount() < 1) {
                                $results[] = [
                                    'client_uid' => $client_uid,
                                    'ok' => false,
                                    'status' => 'conflict',
                                    'id' => $db_id,
                                    'message' => 'Konflikt verze (sticky byla mezitím změněna)'
                                ];
                                continue;
                            }

                            $results[] = [
                                'client_uid' => $client_uid,
                                'ok' => true,
                                'status' => 'updated',
                                'id' => $db_id,
                                'version' => $version + 1
                            ];
                            continue;
                        }

                        $results[] = [
                            'client_uid' => $client_uid,
                            'ok' => false,
                            'status' => 'forbidden',
                            'id' => $db_id,
                            'message' => 'Poznámku nelze uložit (sdílená jen pro čtení)'
                        ];
                        continue;
                    }

                    $results[] = [
                        'client_uid' => $client_uid,
                        'ok' => false,
                        'status' => 'conflict',
                        'id' => $db_id,
                        'message' => 'Konflikt verze (sticky byla mezitím změněna)'
                    ];
                    continue;
                }

                $results[] = [
                    'client_uid' => $client_uid,
                    'ok' => true,
                    'status' => 'updated',
                    'id' => $db_id,
                    'version' => $version + 1
                ];
                continue;
            }

            // Fallback: LWW update bez version
            $stmt_force = $db->prepare($queries['sticky_note_update_force']);
            $stmt_force->bindValue(':id', $db_id, PDO::PARAM_INT);
            $stmt_force->bindValue(':owner_user_id', $user_id, PDO::PARAM_INT);
            $stmt_force->bindValue(':data_json', $data_json, PDO::PARAM_STR);
            $stmt_force->execute();

            if ($stmt_force->rowCount() < 1) {
                $access = sticky_get_note_access_mask($db, $user_id, $db_id, $queries);
                if ($access && isset($access['owner_user_id']) && (int)$access['owner_user_id'] !== (int)$user_id) {
                    $mask = (int)($access['prava_mask'] ?? 0);
                    if (($mask & STICKY_RIGHT_WRITE) === STICKY_RIGHT_WRITE) {
                        $stmt_force2 = $db->prepare($queries['sticky_note_update_force_any_owner']);
                        $stmt_force2->bindValue(':id', $db_id, PDO::PARAM_INT);
                        $stmt_force2->bindValue(':data_json', $data_json, PDO::PARAM_STR);
                        $stmt_force2->execute();

                        if ($stmt_force2->rowCount() < 1) {
                            $results[] = [
                                'client_uid' => $client_uid,
                                'ok' => false,
                                'status' => 'forbidden',
                                'id' => $db_id,
                                'message' => 'Poznámku nelze uložit (neexistuje nebo nemáte oprávnění)'
                            ];
                            continue;
                        }

                        $results[] = [
                            'client_uid' => $client_uid,
                            'ok' => true,
                            'status' => 'updated',
                            'id' => $db_id,
                            'version' => null
                        ];
                        continue;
                    }

                    $results[] = [
                        'client_uid' => $client_uid,
                        'ok' => false,
                        'status' => 'forbidden',
                        'id' => $db_id,
                        'message' => 'Poznámku nelze uložit (sdílená jen pro čtení)'
                    ];
                    continue;
                }

                $results[] = [
                    'client_uid' => $client_uid,
                    'ok' => false,
                    'status' => 'forbidden',
                    'id' => $db_id,
                    'message' => 'Poznámku nelze uložit (neexistuje nebo nemáte oprávnění)'
                ];
                continue;
            }

            $results[] = [
                'client_uid' => $client_uid,
                'ok' => true,
                'status' => 'updated',
                'id' => $db_id,
                'version' => null
            ];
        }

        api_ok($results, ['count' => count($results)]);

    } catch (Exception $e) {
        api_error(500, 'Chyba při ukládání sticky poznámek: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Smazání sticky poznámky (soft delete) – jen owner
 * Endpoint: POST /sticky/delete
 * Body: { username, token, id }
 */
function handle_sticky_delete($input, $config, $queries) {
    $auth = sticky_require_auth($input, $config);
    if (!$auth) return;
    $db = $auth['db'];
    $user_id = $auth['user_id'];

    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if (!$id) {
        api_error(400, 'Chybí ID poznámky', 'MISSING_ID');
        return;
    }

    try {
        $stmt = $db->prepare($queries['sticky_note_soft_delete']);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':owner_user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();

        api_ok([
            'deleted' => $stmt->rowCount() > 0,
            'id' => $id
        ]);
    } catch (Exception $e) {
        api_error(500, 'Chyba při mazání sticky poznámky: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Smazání všech vlastních sticky poznámek uživatele (soft delete)
 * Endpoint: POST /sticky/clear
 * Body: { username, token }
 */
function handle_sticky_clear($input, $config, $queries) {
    $auth = sticky_require_auth($input, $config);
    if (!$auth) return;
    $db = $auth['db'];
    $user_id = $auth['user_id'];

    try {
        if (!isset($queries['sticky_note_soft_delete_all_owner'])) {
            api_error(500, 'Chybí DB query pro clear all', 'MISSING_QUERY');
            return;
        }

        $stmt = $db->prepare($queries['sticky_note_soft_delete_all_owner']);
        $stmt->bindValue(':owner_user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();

        api_ok([
            'cleared' => true,
            'affected_rows' => (int)$stmt->rowCount()
        ]);
    } catch (Exception $e) {
        api_error(500, 'Chyba při mazání všech sticky poznámek: ' . $e->getMessage(), 'DB_ERROR');
    }
}

function sticky_validate_target($target_type, $target_id) {
    $t = strtoupper(trim((string)$target_type));

    // Backward-compatible map (kdyby FE/klient posílal angličtinu)
    if ($t === 'USER') $t = 'UZIVATEL';
    if ($t === 'ALL') $t = 'VSICHNI';

    if (!in_array($t, ['UZIVATEL', 'USEK', 'VSICHNI'])) {
        api_error(400, 'Neplatný target_type. Povolené: UZIVATEL, USEK, VSICHNI', 'INVALID_TARGET_TYPE');
        return null;
    }

    if ($t === 'VSICHNI') {
        return ['target_type' => 'VSICHNI', 'target_id' => null];
    }

    $id = (int)$target_id;
    if (!$id) {
        api_error(400, 'Chybí target_id', 'MISSING_TARGET_ID');
        return null;
    }

    return ['target_type' => $t, 'target_id' => $id];
}

/**
 * Sdílení sticky poznámky
 * Endpoint: POST /sticky/share/grant
 * Body: { username, token, sticky_id, target_type, target_id?, prava_mask }
 */
function handle_sticky_share_grant($input, $config, $queries) {
    $auth = sticky_require_auth($input, $config);
    if (!$auth) return;
    $db = $auth['db'];
    $user_id = $auth['user_id'];

    $sticky_id = isset($input['sticky_id']) ? (int)$input['sticky_id'] : 0;
    if (!$sticky_id) {
        api_error(400, 'Chybí sticky_id', 'MISSING_STICKY_ID');
        return;
    }

    $target = sticky_validate_target($input['target_type'] ?? '', $input['target_id'] ?? null);
    if (!$target) return;

    $prava_mask = isset($input['prava_mask']) ? (int)$input['prava_mask'] : STICKY_RIGHT_READ;
    if ($prava_mask < 1 || $prava_mask > 7) {
        api_error(400, 'Neplatná prava_mask (povolené 1..7)', 'INVALID_RIGHTS');
        return;
    }

    try {
        // Ověřit, že je owner
        $stmt_owner = $db->prepare("SELECT vlastnik_id AS owner_user_id FROM ".TBL_STICKY_POZNAMKY." WHERE id = :id AND smazano = 0 LIMIT 1");
        $stmt_owner->bindValue(':id', $sticky_id, PDO::PARAM_INT);
        $stmt_owner->execute();
        $row = $stmt_owner->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            api_error(404, 'Sticky poznámka nebyla nalezena', 'NOT_FOUND');
            return;
        }
        if ((int)$row['owner_user_id'] !== $user_id) {
            api_error(403, 'Nemáte oprávnění sdílet tuto sticky poznámku', 'FORBIDDEN');
            return;
        }

        $stmt = $db->prepare($queries['sticky_share_upsert']);
        $stmt->bindValue(':sticky_id', $sticky_id, PDO::PARAM_INT);
        $stmt->bindValue(':target_type', $target['target_type'], PDO::PARAM_STR);
        if ($target['target_id'] === null) {
            $stmt->bindValue(':target_id', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':target_id', (int)$target['target_id'], PDO::PARAM_INT);
        }
        $stmt->bindValue(':prava_mask', $prava_mask, PDO::PARAM_INT);
        $stmt->bindValue(':created_by_user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindValue(':prava_mask_update', $prava_mask, PDO::PARAM_INT);
        $stmt->execute();

        api_ok([
            'sticky_id' => $sticky_id,
            'target_type' => $target['target_type'],
            'target_id' => $target['target_id'],
            'prava_mask' => $prava_mask
        ]);

    } catch (Exception $e) {
        api_error(500, 'Chyba při sdílení sticky poznámky: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Zrušení sdílení sticky poznámky
 * Endpoint: POST /sticky/share/revoke
 * Body: { username, token, sticky_id, target_type, target_id? }
 */
function handle_sticky_share_revoke($input, $config, $queries) {
    $auth = sticky_require_auth($input, $config);
    if (!$auth) return;
    $db = $auth['db'];
    $user_id = $auth['user_id'];

    $sticky_id = isset($input['sticky_id']) ? (int)$input['sticky_id'] : 0;
    if (!$sticky_id) {
        api_error(400, 'Chybí sticky_id', 'MISSING_STICKY_ID');
        return;
    }

    $target = sticky_validate_target($input['target_type'] ?? '', $input['target_id'] ?? null);
    if (!$target) return;

    try {
        // Ověřit, že je owner
        $stmt_owner = $db->prepare("SELECT vlastnik_id AS owner_user_id FROM ".TBL_STICKY_POZNAMKY." WHERE id = :id AND smazano = 0 LIMIT 1");
        $stmt_owner->bindValue(':id', $sticky_id, PDO::PARAM_INT);
        $stmt_owner->execute();
        $row = $stmt_owner->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            api_error(404, 'Sticky poznámka nebyla nalezena', 'NOT_FOUND');
            return;
        }
        if ((int)$row['owner_user_id'] !== $user_id) {
            api_error(403, 'Nemáte oprávnění měnit sdílení této sticky poznámky', 'FORBIDDEN');
            return;
        }

        $stmt = $db->prepare($queries['sticky_share_delete']);
        $stmt->bindValue(':sticky_id', $sticky_id, PDO::PARAM_INT);
        $stmt->bindValue(':target_type', $target['target_type'], PDO::PARAM_STR);
        if ($target['target_id'] === null) {
            $stmt->bindValue(':target_id', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':target_id', (int)$target['target_id'], PDO::PARAM_INT);
        }
        $stmt->execute();

        api_ok([
            'revoked' => $stmt->rowCount() > 0,
            'sticky_id' => $sticky_id,
            'target_type' => $target['target_type'],
            'target_id' => $target['target_id']
        ]);
    } catch (Exception $e) {
        api_error(500, 'Chyba při rušení sdílení sticky poznámky: ' . $e->getMessage(), 'DB_ERROR');
    }
}

/**
 * Seznam sdílení sticky poznámky (jen owner)
 * Endpoint: POST /sticky/share/list
 * Body: { username, token, sticky_id }
 */
function handle_sticky_share_list($input, $config, $queries) {
    $auth = sticky_require_auth($input, $config);
    if (!$auth) return;
    $db = $auth['db'];
    $user_id = $auth['user_id'];

    $sticky_id = isset($input['sticky_id']) ? (int)$input['sticky_id'] : 0;
    if (!$sticky_id) {
        api_error(400, 'Chybí sticky_id', 'MISSING_STICKY_ID');
        return;
    }

    try {
        // Ověřit owner
        $stmt_owner = $db->prepare("SELECT vlastnik_id AS owner_user_id FROM ".TBL_STICKY_POZNAMKY." WHERE id = :id AND smazano = 0 LIMIT 1");
        $stmt_owner->bindValue(':id', $sticky_id, PDO::PARAM_INT);
        $stmt_owner->execute();
        $row = $stmt_owner->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            api_error(404, 'Sticky poznámka nebyla nalezena', 'NOT_FOUND');
            return;
        }
        if ((int)$row['owner_user_id'] !== $user_id) {
            api_error(403, 'Nemáte oprávnění zobrazit sdílení této sticky poznámky', 'FORBIDDEN');
            return;
        }

        $stmt = $db->prepare($queries['sticky_share_list']);
        $stmt->bindValue(':sticky_id', $sticky_id, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        api_ok($rows, ['count' => count($rows)]);
    } catch (Exception $e) {
        api_error(500, 'Chyba při načítání sdílení sticky poznámky: ' . $e->getMessage(), 'DB_ERROR');
    }
}

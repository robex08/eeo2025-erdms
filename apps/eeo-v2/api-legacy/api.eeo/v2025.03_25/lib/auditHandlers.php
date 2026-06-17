<?php
/**
 * AUDIT HANDLERS - EEO Fáze 1
 *
 * Read endpointy pro audit timeline.
 * Přístup: každý autentizovaný uživatel.
 *
 * Endpointy:
 *   POST audit/history  – Timeline změn objektu nebo uživatele
 *   POST audit/detail   – Detail konkrétního batche (full old/new)
 */

// ============================================================================
// POST audit/history
// ============================================================================
/**
 * Vrátí chronologicky seřazenou timeline změn.
 *
 * Filtrování (všechna pole jsou volitelná):
 *   objekt_typ   string  OBJEDNAVKA | FAKTURA | ROCNI_POPLATEK | ...
 *   objekt_id    int
 *   uzivatel_id  int
 *   q            string  fulltext přes uživatele/objekt/endpoint/pole/poznámku/hodnoty
 *   akce_typ     string  (volitelné)
 *   od           string  datum YYYY-MM-DD
 *   do           string  datum YYYY-MM-DD
 *   limit        int     výchozí 10, max 500
 *   offset       int     výchozí 0
 */
function handle_audit_history($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';

    $db = get_db($config);
    $token_data = verify_token_v2($username, $token, $db);

    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný nebo chybějící token']);
        return;
    }

    // Parametry
    $objekt_typ  = isset($input['objekt_typ']) ? strtoupper(trim($input['objekt_typ'])) : null;
    $objekt_id   = isset($input['objekt_id']) && $input['objekt_id'] > 0 ? (int)$input['objekt_id'] : null;
    $uzivatel_id = isset($input['uzivatel_id']) && $input['uzivatel_id'] > 0 ? (int)$input['uzivatel_id'] : null;
    $q           = trim($input['q'] ?? '');
    $akce_typ    = isset($input['akce_typ']) ? strtoupper(trim($input['akce_typ'])) : null;
    $od          = $input['od'] ?? null;
    $do_dt       = $input['do'] ?? null;
    $limit       = min((int)($input['limit'] ?? 10), 500);
    $offset      = max((int)($input['offset'] ?? 0), 0);

    try {
        TimezoneHelper::setMysqlTimezone($db);

        $where = ['1=1'];
        $params = [];

        if ($objekt_typ) {
            $where[] = 'a.objekt_typ = :objekt_typ';
            $params[':objekt_typ'] = $objekt_typ;
        }
        if ($objekt_id) {
            $where[] = 'a.objekt_id = :objekt_id';
            $params[':objekt_id'] = $objekt_id;
        }
        if ($uzivatel_id) {
            $where[] = 'a.uzivatel_id = :uzivatel_id';
            $params[':uzivatel_id'] = $uzivatel_id;
        }
        if ($q !== '') {
            $where[] = '(
                a.username_snapshot LIKE :q
                OR a.jmeno_snapshot LIKE :q
                OR a.prijmeni_snapshot LIKE :q
                OR a.objekt_typ LIKE :q
                OR CAST(a.objekt_id AS CHAR) LIKE :q
                OR a.endpoint LIKE :q
                OR a.pole LIKE :q
                OR a.poznamka LIKE :q
                OR a.stara_hodnota_json LIKE :q
                OR a.nova_hodnota_json LIKE :q
            )';
            $params[':q'] = '%' . $q . '%';
        }
        if ($akce_typ) {
            $where[] = 'a.akce_typ = :akce_typ';
            $params[':akce_typ'] = $akce_typ;
        }
        if ($od) {
            $where[] = 'a.dt_akce >= :od';
            $params[':od'] = $od . ' 00:00:00';
        }
        if ($do_dt) {
            $where[] = 'a.dt_akce <= :do_dt';
            $params[':do_dt'] = $do_dt . ' 23:59:59';
        }

        $where_sql = implode(' AND ', $where);

        // COUNT
        $count_stmt = $db->prepare("
            SELECT COUNT(*) FROM `" . TBL_AUDIT_ZMEN . "` a
            WHERE $where_sql
        ");
        $count_stmt->execute($params);
        $total = (int)$count_stmt->fetchColumn();

        // DATA s LEFT JOIN na zastupování
        $sql = "
            SELECT
                a.id,
                a.dt_akce,
                a.uzivatel_id,
                a.username_snapshot,
                a.jmeno_snapshot,
                a.prijmeni_snapshot,
                a.objekt_typ,
                a.objekt_id,
                a.akce_typ,
                a.pole,
                a.stara_hodnota_json,
                a.nova_hodnota_json,
                a.endpoint,
                a.batch_id,
                a.poznamka,
                a.zastupovani_id,
                o.cislo_objednavky AS objednavka_cislo,
                o.stav_objednavky AS objednavka_stav,
                f.fa_vema_kod,
                f.fa_cislo_vema,
                f.objednavka_id AS faktura_objednavka_id,
                f.smlouva_id AS faktura_smlouva_id,
                f.stav AS faktura_stav,
                -- Zastupování kontext (zobrazí se, jméno zastupce/zastupovaného)
                uz_zastupce.username    AS zastupce_username,
                uz_zastupce.jmeno       AS zastupce_jmeno,
                uz_zastupce.prijmeni    AS zastupce_prijmeni,
                uz_zastupovany.username AS zastupovany_username,
                uz_zastupovany.jmeno    AS zastupovany_jmeno,
                uz_zastupovany.prijmeni AS zastupovany_prijmeni
            FROM `" . TBL_AUDIT_ZMEN . "` a
            LEFT JOIN `" . TBL_OBJEDNAVKY . "` o
                ON a.objekt_typ = 'OBJEDNAVKA' AND a.objekt_id = o.id
            LEFT JOIN `" . TBL_FAKTURY . "` f
                ON a.objekt_typ = 'FAKTURA' AND a.objekt_id = f.id
            LEFT JOIN `25_uzivatele_zastupovani` zast
                ON a.zastupovani_id = zast.id
            LEFT JOIN `" . TBL_UZIVATELE . "` uz_zastupce
                ON zast.zastupce_id = uz_zastupce.id
            LEFT JOIN `" . TBL_UZIVATELE . "` uz_zastupovany
                ON zast.zastupovany_id = uz_zastupovany.id
            WHERE $where_sql
            ORDER BY a.dt_akce DESC, a.id DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $db->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Mapovat výsledky a přidat zastupovani_kontext
        $data = array_map(function($row) {
            $zastupovani_kontext = null;
            if ($row['zastupovani_id']) {
                $zastupovani_kontext = [
                    'zastupovani_id'      => (int)$row['zastupovani_id'],
                    'zastupce_username'   => $row['zastupce_username'],
                    'zastupce_jmeno'      => $row['zastupce_jmeno'],
                    'zastupce_prijmeni'   => $row['zastupce_prijmeni'],
                    'zastupovany_username'=> $row['zastupovany_username'],
                    'zastupovany_jmeno'   => $row['zastupovany_jmeno'],
                    'zastupovany_prijmeni'=> $row['zastupovany_prijmeni'],
                ];
            }

            $objekt_hodnota = null;
            $objekt_typ = strtoupper((string)($row['objekt_typ'] ?? ''));
            if ($objekt_typ === 'OBJEDNAVKA') {
                $objekt_hodnota = trim((string)($row['objednavka_cislo'] ?? ''));
                if ($objekt_hodnota === '') {
                    $objekt_hodnota = null;
                }
            } elseif ($objekt_typ === 'FAKTURA') {
                $fa_vema_kod = trim((string)($row['fa_vema_kod'] ?? ''));
                $fa_cislo_vema = trim((string)($row['fa_cislo_vema'] ?? ''));

                if ($fa_vema_kod !== '' && $fa_cislo_vema !== '') {
                    $objekt_hodnota = 'FA VS ' . $fa_vema_kod . ' / ' . $fa_cislo_vema;
                } elseif ($fa_vema_kod !== '') {
                    $objekt_hodnota = 'FA VS ' . $fa_vema_kod;
                } elseif ($fa_cislo_vema !== '') {
                    $objekt_hodnota = 'FA ' . $fa_cislo_vema;
                }
            }

            return [
                'id'               => (int)$row['id'],
                'dt_akce'          => $row['dt_akce'],
                'uzivatel_id'      => (int)$row['uzivatel_id'],
                'uzivatel'         => trim($row['jmeno_snapshot'] . ' ' . $row['prijmeni_snapshot']),
                'username'         => $row['username_snapshot'],
                'objekt_typ'       => $row['objekt_typ'],
                'objekt_id'        => (int)$row['objekt_id'],
                'objekt_hodnota'   => $objekt_hodnota,
                'objednavka_stav'  => $row['objednavka_stav'] ?? null,
                'faktura_stav'     => $row['faktura_stav'] ?? null,
                'faktura_objednavka_id' => !empty($row['faktura_objednavka_id']) ? (int)$row['faktura_objednavka_id'] : null,
                'faktura_smlouva_id' => !empty($row['faktura_smlouva_id']) ? (int)$row['faktura_smlouva_id'] : null,
                'akce_typ'         => $row['akce_typ'],
                'pole'             => $row['pole'],
                'stara_hodnota'    => $row['stara_hodnota_json'],
                'nova_hodnota'     => $row['nova_hodnota_json'],
                'endpoint'         => $row['endpoint'],
                'batch_id'         => $row['batch_id'],
                'poznamka'         => $row['poznamka'],
                'zastupovani_kontext' => $zastupovani_kontext,
            ];
        }, $rows);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data'   => $data,
            'meta'   => [
                'total'  => $total,
                'limit'  => $limit,
                'offset' => $offset,
                'count'  => count($data),
            ],
        ]);

    } catch (Exception $e) {
        error_log('[AUDIT] handle_audit_history error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba při načítání audit logu']);
    }
}

// ============================================================================
// POST audit/detail
// ============================================================================
/**
 * Vrátí všechny záznamy jednoho batche (kompletní old/new pro každé pole).
 *
 * Parametry:
 *   batch_id  string  UUID batche
 */
function handle_audit_detail($input, $config) {
    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';

    $db = get_db($config);
    $token_data = verify_token_v2($username, $token, $db);

    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Neplatný nebo chybějící token']);
        return;
    }

    $batch_id = trim($input['batch_id'] ?? '');
    if (!$batch_id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí batch_id']);
        return;
    }

    try {
        TimezoneHelper::setMysqlTimezone($db);

        $stmt = $db->prepare("
            SELECT
                a.*,
                uz_zastupce.username    AS zastupce_username,
                uz_zastupce.jmeno       AS zastupce_jmeno,
                uz_zastupce.prijmeni    AS zastupce_prijmeni,
                uz_zastupovany.username AS zastupovany_username,
                uz_zastupovany.jmeno    AS zastupovany_jmeno,
                uz_zastupovany.prijmeni AS zastupovany_prijmeni
            FROM `" . TBL_AUDIT_ZMEN . "` a
            LEFT JOIN `25_uzivatele_zastupovani` zast ON a.zastupovani_id = zast.id
            LEFT JOIN `" . TBL_UZIVATELE . "` uz_zastupce ON zast.zastupce_id = uz_zastupce.id
            LEFT JOIN `" . TBL_UZIVATELE . "` uz_zastupovany ON zast.zastupovany_id = uz_zastupovany.id
            WHERE a.batch_id = :batch_id
            ORDER BY a.id ASC
        ");
        $stmt->execute([':batch_id' => $batch_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Batch nenalezen']);
            return;
        }

        // Sestavit souhrnné info z prvního záznamu
        $first = $rows[0];
        $zastupovani_kontext = null;
        if ($first['zastupovani_id']) {
            $zastupovani_kontext = [
                'zastupovani_id'       => (int)$first['zastupovani_id'],
                'zastupce_username'    => $first['zastupce_username'],
                'zastupce_jmeno'       => $first['zastupce_jmeno'],
                'zastupce_prijmeni'    => $first['zastupce_prijmeni'],
                'zastupovany_username' => $first['zastupovany_username'],
                'zastupovany_jmeno'    => $first['zastupovany_jmeno'],
                'zastupovany_prijmeni' => $first['zastupovany_prijmeni'],
            ];
        }

        $zmeny = array_map(function($row) {
            return [
                'id'            => (int)$row['id'],
                'akce_typ'      => $row['akce_typ'],
                'pole'          => $row['pole'],
                'stara_hodnota' => $row['stara_hodnota_json'],
                'nova_hodnota'  => $row['nova_hodnota_json'],
            ];
        }, $rows);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data'   => [
                'batch_id'            => $batch_id,
                'dt_akce'             => $first['dt_akce'],
                'uzivatel_id'         => (int)$first['uzivatel_id'],
                'uzivatel'            => trim($first['jmeno_snapshot'] . ' ' . $first['prijmeni_snapshot']),
                'username'            => $first['username_snapshot'],
                'objekt_typ'          => $first['objekt_typ'],
                'objekt_id'           => (int)$first['objekt_id'],
                'endpoint'            => $first['endpoint'],
                'poznamka'            => $first['poznamka'],
                'zastupovani_kontext' => $zastupovani_kontext,
                'zmeny'               => $zmeny,
            ],
        ]);

    } catch (Exception $e) {
        error_log('[AUDIT] handle_audit_detail error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba při načítání detailu audit záznamu']);
    }
}

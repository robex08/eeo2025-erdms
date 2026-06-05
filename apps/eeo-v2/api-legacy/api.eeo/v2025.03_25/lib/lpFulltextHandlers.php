<?php
/**
 * Limitované přísliby - Komplexní fulltext vyhledávání
 *
 * Endpoint: POST /api.eeo/limitovane-prisliby/fulltext-search
 *
 * Hledá ve všech relevantních polích:
 * - LP master: cislo_lp, nazev_uctu, kategorie, cislo_uctu, správce
 * - Objednávky: cislo_objednavky, predmet, dodavatel_nazev, příkazce, garant, objednatel
 * - Faktury: fa_cislo_vema, fa_vema_kod, fa_poznamka
 *
 * Vrací:
 * - matching_lp_ids: pole LP master_id které matchují přímo nebo přes objednávku/fakturu
 * - matched_orders_by_lp: mapa lp_master_id -> [order_ids matchujících v rámci LP]
 * - matched_faktury_by_order: mapa order_id -> [faktura_ids matchujících]
 * - orders_detail: detail matchujících objednávek (pro auto-expand a zvýraznění)
 *
 * Vstup:
 *   token, username, query, rok (volitelně)
 *
 * Výstup: { status, data: { matching_lp_ids, matched_orders_by_lp, matched_faktury_by_order, orders_detail }, meta }
 */

if (!function_exists('handle_lp_fulltext_search')) {
function handle_lp_fulltext_search($input, $config) {
    // Timezone
    if (function_exists('setMysqlTimezone')) {
        global $pdo;
        if ($pdo) setMysqlTimezone($pdo);
    }

    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';

    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Chybí token nebo username']);
        return;
    }

    $auth = verify_token_v2($username, $token);
    if (!$auth) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Nepřihlášen']);
        return;
    }

    $query = isset($input['query']) ? trim((string)$input['query']) : '';
    $rok = isset($input['rok']) ? (int)$input['rok'] : (int)date('Y');

    if (mb_strlen($query) < 2) {
        // Pro prázdný / krátký dotaz vrátíme prázdný výsledek
        echo json_encode([
            'status' => 'success',
            'data' => [
                'matching_lp_ids' => [],
                'matched_orders_by_lp' => (object)[],
                'matched_faktury_by_order' => (object)[],
                'orders_detail' => []
            ],
            'meta' => [
                'query' => $query,
                'rok' => $rok,
                'count_lp' => 0,
                'count_orders' => 0,
                'count_faktury' => 0
            ]
        ]);
        return;
    }

    global $pdo;
    if (!$pdo) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Chyba připojení k databázi']);
        return;
    }

    $matching_lp_ids = [];
    $matched_orders_by_lp = [];
    $matched_faktury_by_order = [];
    $orders_detail = [];

    $like = '%' . $query . '%';
    
    error_log("🔍 [LP-FULLTEXT] START query='$query' rok=$rok");

    try {
        // ============================================
        // 1) Hledat v LP master tabulce (přes cerpani pro správce a rok)
        // ============================================
        $sql_lp = "
            SELECT DISTINCT lpm.id AS lp_master_id, lpm.cislo_lp
            FROM " . TBL_LP_MASTER . " lpm
            LEFT JOIN " . TBL_LP_CERPANI . " c ON c.cislo_lp = lpm.cislo_lp AND c.usek_id = lpm.usek_id AND c.rok = :rok
            LEFT JOIN " . TBL_UZIVATELE . " spr ON spr.id = c.user_id
            WHERE (
                lpm.cislo_lp LIKE :q1
                OR lpm.nazev_uctu LIKE :q2
                OR lpm.kategorie LIKE :q3
                OR lpm.cislo_uctu LIKE :q4
                OR CONCAT(COALESCE(spr.jmeno, ''), ' ', COALESCE(spr.prijmeni, '')) LIKE :q5
                OR CONCAT(COALESCE(spr.prijmeni, ''), ' ', COALESCE(spr.jmeno, '')) LIKE :q6
              )
        ";
        $stmt = $pdo->prepare($sql_lp);
        $stmt->execute([
            ':rok' => $rok,
            ':q1' => $like, ':q2' => $like, ':q3' => $like,
            ':q4' => $like, ':q5' => $like, ':q6' => $like
        ]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $matching_lp_ids[(int)$row['lp_master_id']] = true;
        }

        // ============================================
        // 2) Hledat v objednávkách (cislo, predmet, dodavatel, příkazce/garant/objednatel)
        // ============================================
        $sql_orders = "
            SELECT DISTINCT
                o.id AS order_id,
                o.cislo_objednavky,
                o.predmet,
                o.dodavatel_nazev,
                o.stav_objednavky,
                o.dt_vytvoreni,
                o.financovani,
                o.max_cena_s_dph,
                TRIM(CONCAT(COALESCE(prik.jmeno, ''), ' ', COALESCE(prik.prijmeni, ''))) AS prikazce_jmeno,
                TRIM(CONCAT(COALESCE(gar.jmeno, ''), ' ', COALESCE(gar.prijmeni, ''))) AS garant_jmeno,
                TRIM(CONCAT(COALESCE(uz.jmeno, ''), ' ', COALESCE(uz.prijmeni, ''))) AS objednatel_jmeno
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_UZIVATELE . " prik ON prik.id = o.prikazce_id
            LEFT JOIN " . TBL_UZIVATELE . " gar  ON gar.id  = o.garant_uzivatel_id
            LEFT JOIN " . TBL_UZIVATELE . " uz   ON uz.id   = o.uzivatel_id
            WHERE o.aktivni = 1
              AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
              AND YEAR(o.dt_vytvoreni) = :rok
              AND (
                o.cislo_objednavky LIKE :q1
                OR o.predmet LIKE :q2
                OR o.dodavatel_nazev LIKE :q3
                OR CONCAT(COALESCE(prik.jmeno, ''), ' ', COALESCE(prik.prijmeni, '')) LIKE :q4
                OR CONCAT(COALESCE(prik.prijmeni, ''), ' ', COALESCE(prik.jmeno, '')) LIKE :q5
                OR CONCAT(COALESCE(gar.jmeno, ''), ' ', COALESCE(gar.prijmeni, '')) LIKE :q6
                OR CONCAT(COALESCE(gar.prijmeni, ''), ' ', COALESCE(gar.jmeno, '')) LIKE :q7
                OR CONCAT(COALESCE(uz.jmeno, ''), ' ', COALESCE(uz.prijmeni, '')) LIKE :q8
                OR CONCAT(COALESCE(uz.prijmeni, ''), ' ', COALESCE(uz.jmeno, '')) LIKE :q9
              )
            ORDER BY o.dt_vytvoreni DESC
            LIMIT 500
        ";
        $stmt = $pdo->prepare($sql_orders);
        $stmt->execute([
            ':rok' => $rok,
            ':q1' => $like, ':q2' => $like, ':q3' => $like,
            ':q4' => $like, ':q5' => $like, ':q6' => $like,
            ':q7' => $like, ':q8' => $like, ':q9' => $like
        ]);
        $matched_orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // ============================================
        // 3) Hledat ve fakturách
        // ============================================
        $sql_faktury = "
            SELECT DISTINCT
                f.id AS faktura_id,
                f.objednavka_id,
                f.fa_cislo_vema,
                f.fa_vema_kod,
                f.fa_castka,
                f.fa_poznamka,
                f.stav,
                f.fa_typ,
                s.nazev_stavu AS fa_typ_nazev,
                o.cislo_objednavky,
                o.predmet,
                o.dodavatel_nazev,
                o.financovani,
                o.dt_vytvoreni,
                o.max_cena_s_dph,
                TRIM(CONCAT(COALESCE(prik.jmeno, ''), ' ', COALESCE(prik.prijmeni, ''))) AS prikazce_jmeno
            FROM " . TBL_FAKTURY . " f
            INNER JOIN " . TBL_OBJEDNAVKY . " o ON o.id = f.objednavka_id
            LEFT JOIN `25_ciselnik_stavy` s ON s.typ_objektu = 'FAKTURA' AND s.kod_stavu = f.fa_typ
            LEFT JOIN " . TBL_UZIVATELE . " prik ON prik.id = o.prikazce_id
            WHERE f.aktivni = 1
              AND o.aktivni = 1
              AND (YEAR(f.fa_datum_vystaveni) = :rok OR YEAR(o.dt_vytvoreni) = :rok2)
              AND (
                f.fa_cislo_vema LIKE :q1
                OR f.fa_vema_kod LIKE :q2
                OR f.fa_poznamka LIKE :q3
                OR f.fa_typ LIKE :q4
                OR s.nazev_stavu LIKE :q5
              )
            ORDER BY f.fa_datum_vystaveni DESC
            LIMIT 500
        ";
        $stmt = $pdo->prepare($sql_faktury);
        $stmt->execute([
            ':rok' => $rok, ':rok2' => $rok,
            ':q1' => $like, ':q2' => $like, ':q3' => $like,
            ':q4' => $like, ':q5' => $like
        ]);
        $matched_faktury_rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // ============================================
        // 4) Pro každou matchující objednávku/fakturu zjistit lp_master_id z financovani
        // ============================================
        $all_order_ids = [];
        foreach ($matched_orders as $o) {
            $all_order_ids[(int)$o['order_id']] = $o;
        }
        foreach ($matched_faktury_rows as $f) {
            $oid = (int)$f['objednavka_id'];
            if (!isset($all_order_ids[$oid])) {
                $all_order_ids[$oid] = [
                    'order_id' => $oid,
                    'cislo_objednavky' => $f['cislo_objednavky'],
                    'predmet' => $f['predmet'],
                    'dodavatel_nazev' => $f['dodavatel_nazev'],
                    'stav_objednavky' => null,
                    'dt_vytvoreni' => $f['dt_vytvoreni'],
                    'financovani' => $f['financovani'],
                    'max_cena_s_dph' => $f['max_cena_s_dph'],
                    'prikazce_jmeno' => $f['prikazce_jmeno'] ?? null,
                    'garant_jmeno' => null,
                    'objednatel_jmeno' => null
                ];
            }
            // Eviduj fakturu pro tu objednávku
            if (!isset($matched_faktury_by_order[$oid])) {
                $matched_faktury_by_order[$oid] = [];
            }
            $matched_faktury_by_order[$oid][] = [
                'id' => (int)$f['faktura_id'],
                'fa_cislo_vema' => $f['fa_cislo_vema'],
                'fa_vema_kod' => $f['fa_vema_kod'],
                'fa_castka' => (float)$f['fa_castka'],
                'fa_poznamka' => $f['fa_poznamka'],
                'stav' => $f['stav'],
                'fa_typ' => $f['fa_typ'],
                'fa_typ_nazev' => $f['fa_typ_nazev']
            ];
        }

        // Pro každou objednávku rozparsovat financovani.lp_kody a přiřadit k LP
        foreach ($all_order_ids as $oid => $ord) {
            $lp_ids_of_order = [];
            if (!empty($ord['financovani'])) {
                $fin = json_decode($ord['financovani'], true);
                if (is_array($fin) && isset($fin['typ']) && $fin['typ'] === 'LP') {
                    if (!empty($fin['lp_kody']) && is_array($fin['lp_kody'])) {
                        foreach ($fin['lp_kody'] as $lpid) {
                            $lp_ids_of_order[] = (int)$lpid;
                        }
                    }
                }
            }

            foreach ($lp_ids_of_order as $lp_id) {
                if ($lp_id <= 0) continue;
                $matching_lp_ids[$lp_id] = true;
                if (!isset($matched_orders_by_lp[$lp_id])) {
                    $matched_orders_by_lp[$lp_id] = [];
                }
                if (!in_array($oid, $matched_orders_by_lp[$lp_id], true)) {
                    $matched_orders_by_lp[$lp_id][] = $oid;
                }
            }

            // Detail objednávky pro frontend + faktury
            $orders_detail[$oid] = [
                'id' => $oid,
                'cislo_objednavky' => $ord['cislo_objednavky'],
                'predmet' => $ord['predmet'],
                'dodavatel_nazev' => $ord['dodavatel_nazev'],
                'stav' => $ord['stav_objednavky'],
                'dt_vytvoreni' => $ord['dt_vytvoreni'],
                'max_cena_s_dph' => (float)$ord['max_cena_s_dph'],
                'prikazce_jmeno' => $ord['prikazce_jmeno'] ?? null,
                'garant_jmeno' => $ord['garant_jmeno'] ?? null,
                'objednatel_jmeno' => $ord['objednatel_jmeno'] ?? null,
                'lp_ids' => $lp_ids_of_order,
                'faktury' => $matched_faktury_by_order[$oid] ?? []  // Faktury přiřazené k objednávce
            ];
        }

        // ============================================
        // 5) Načíst VŠECHNY objednávky pro matchující LP (bez ohledu na fulltext match)
        // ============================================
        $all_orders_by_lp = [];
        $lp_ids_final = array_values(array_map('intval', array_keys($matching_lp_ids)));
        
        if (!empty($lp_ids_final)) {
            $placeholders = implode(',', array_fill(0, count($lp_ids_final), '?'));
            $sql_all_orders = "
                SELECT DISTINCT
                    o.id AS order_id,
                    o.cislo_objednavky,
                    o.predmet,
                    o.dodavatel_nazev,
                    o.stav_objednavky,
                    o.dt_vytvoreni,
                    o.financovani,
                    o.max_cena_s_dph,
                    TRIM(CONCAT(COALESCE(prik.jmeno, ''), ' ', COALESCE(prik.prijmeni, ''))) AS prikazce_jmeno,
                    TRIM(CONCAT(COALESCE(gar.jmeno, ''), ' ', COALESCE(gar.prijmeni, ''))) AS garant_jmeno,
                    TRIM(CONCAT(COALESCE(uz.jmeno, ''), ' ', COALESCE(uz.prijmeni, ''))) AS objednatel_jmeno
                FROM " . TBL_OBJEDNAVKY . " o
                LEFT JOIN " . TBL_UZIVATELE . " prik ON prik.id = o.prikazce_id
                LEFT JOIN " . TBL_UZIVATELE . " gar  ON gar.id  = o.garant_uzivatel_id
                LEFT JOIN " . TBL_UZIVATELE . " uz   ON uz.id   = o.uzivatel_id
                WHERE o.aktivni = 1
                  AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena')
                  AND YEAR(o.dt_vytvoreni) = ?
                  AND JSON_CONTAINS(o.financovani, JSON_ARRAY(" . $placeholders . "), '$.lp_kody')
                ORDER BY o.dt_vytvoreni DESC
                LIMIT 1000
            ";
            
            $stmt = $pdo->prepare($sql_all_orders);
            $params = array_merge([$rok], array_values($lp_ids_final));
            $stmt->execute($params);
            $all_orders_rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Indexovat všechny objednávky podle LP IDs
            foreach ($all_orders_rows as $ord) {
                $lp_ids_of_order = [];
                if (!empty($ord['financovani'])) {
                    $fin = json_decode($ord['financovani'], true);
                    if (is_array($fin) && isset($fin['typ']) && $fin['typ'] === 'LP') {
                        if (!empty($fin['lp_kody']) && is_array($fin['lp_kody'])) {
                            foreach ($fin['lp_kody'] as $lpid) {
                                $lpid_int = (int)$lpid;
                                if ($lpid_int > 0 && in_array($lpid_int, $lp_ids_final)) {
                                    $lp_ids_of_order[] = $lpid_int;
                                }
                            }
                        }
                    }
                }
                
                // Přidat objednávku ke všem její LP
                foreach ($lp_ids_of_order as $lp_id) {
                    if (!isset($all_orders_by_lp[$lp_id])) {
                        $all_orders_by_lp[$lp_id] = [];
                    }
                    if (!in_array($ord['order_id'], $all_orders_by_lp[$lp_id], true)) {
                        $all_orders_by_lp[$lp_id][] = (int)$ord['order_id'];
                    }
                    
                    // Přidat detail objednávky (pokud není v $orders_detail ze fulltext match)
                    if (!isset($orders_detail[$ord['order_id']])) {
                        $orders_detail[$ord['order_id']] = [
                            'id' => (int)$ord['order_id'],
                            'cislo_objednavky' => $ord['cislo_objednavky'],
                            'predmet' => $ord['predmet'],
                            'dodavatel_nazev' => $ord['dodavatel_nazev'],
                            'stav' => $ord['stav_objednavky'],
                            'dt_vytvoreni' => $ord['dt_vytvoreni'],
                            'max_cena_s_dph' => (float)$ord['max_cena_s_dph'],
                            'prikazce_jmeno' => $ord['prikazce_jmeno'] ?? null,
                            'garant_jmeno' => $ord['garant_jmeno'] ?? null,
                            'objednatel_jmeno' => $ord['objednatel_jmeno'] ?? null,
                            'lp_ids' => $lp_ids_of_order,
                            'faktury' => [],  // Načetly se později
                            'matched_fulltext' => false  // Flaga - není fulltext match
                        ];
                    } else {
                        // Už je v orders_detail ze fulltext - přidej flag
                        $orders_detail[$ord['order_id']]['matched_fulltext'] = true;
                    }
                }
            }
            
            // Načíst faktury pro všechny objednávky (ne jen fulltext matched)
            $all_order_ids_from_section5 = [];
            foreach ($all_orders_by_lp as $lp_id => $order_ids) {
                foreach ($order_ids as $oid) {
                    if (!in_array($oid, $all_order_ids_from_section5, true)) {
                        $all_order_ids_from_section5[] = $oid;
                    }
                }
            }
            if (!empty($all_order_ids_from_section5)) {
                $placeholders = implode(',', array_fill(0, count($all_order_ids_from_section5), '?'));
                $sql_faktury_all = "
                    SELECT
                        f.id AS faktura_id,
                        f.objednavka_id,
                        f.fa_cislo_vema,
                        f.fa_vema_kod,
                        f.fa_castka,
                        f.fa_poznamka,
                        f.stav,
                        f.je_odborova_faktura
                    FROM " . TBL_FAKTURY . " f
                    WHERE f.objednavka_id IN ($placeholders)
                      AND f.aktivni = 1
                    ORDER BY f.fa_datum_vystaveni DESC
                ";
                
                $stmt = $pdo->prepare($sql_faktury_all);
                $stmt->execute($all_order_ids_from_section5);
                $faktury_all_rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Indexovat faktury podle order_id
                foreach ($faktury_all_rows as $f) {
                    $oid = (int)$f['objednavka_id'];
                    if (!isset($matched_faktury_by_order[$oid])) {
                        $matched_faktury_by_order[$oid] = [];
                    }
                    $matched_faktury_by_order[$oid][] = [
                        'id' => (int)$f['faktura_id'],
                        'fa_cislo_vema' => $f['fa_cislo_vema'],
                        'fa_vema_kod' => $f['fa_vema_kod'],
                        'fa_castka' => (float)$f['fa_castka'],
                        'fa_poznamka' => $f['fa_poznamka'],
                        'stav' => $f['stav']
                    ];
                }
            }
        }

        // ============================================
        // 5.5) Doplnit faktury do orders_detail (pro všechny objednávky)
        // ============================================
        foreach ($orders_detail as $oid => $ord) {
            if (!isset($orders_detail[$oid]['faktury'])) {
                $orders_detail[$oid]['faktury'] = [];
            }
            if (isset($matched_faktury_by_order[$oid])) {
                $orders_detail[$oid]['faktury'] = $matched_faktury_by_order[$oid];
            }
        }

        // ============================================
        // 6) Sestavit výstup
        // ============================================
        
        // Konverze map: keys → strings (pro JSON object)
        $matched_orders_by_lp_out = [];
        foreach ($matched_orders_by_lp as $lp_id => $oids) {
            $matched_orders_by_lp_out[(string)$lp_id] = array_values(array_unique($oids));
        }
        
        // Všechny objednávky pro matchující LP
        $all_orders_by_lp_out = [];
        foreach ($all_orders_by_lp as $lp_id => $oids) {
            $all_orders_by_lp_out[(string)$lp_id] = array_values(array_unique($oids));
        }
        
        $matched_faktury_by_order_out = [];
        foreach ($matched_faktury_by_order as $oid => $faktury) {
            $matched_faktury_by_order_out[(string)$oid] = $faktury;
        }

        // orders_detail jako objekt indexovaný order_id
        $orders_detail_out = [];
        foreach ($orders_detail as $oid => $det) {
            $orders_detail_out[(string)$oid] = $det;
        }

        echo json_encode([
            'status' => 'success',
            'data' => [
                'matching_lp_ids' => $lp_ids_final,
                'matched_orders_by_lp' => empty($matched_orders_by_lp_out) ? (object)[] : $matched_orders_by_lp_out,
                'all_orders_by_lp' => empty($all_orders_by_lp_out) ? (object)[] : $all_orders_by_lp_out,
                'matched_faktury_by_order' => empty($matched_faktury_by_order_out) ? (object)[] : $matched_faktury_by_order_out,
                'orders_detail' => empty($orders_detail_out) ? (object)[] : $orders_detail_out
            ],
            'meta' => [
                'query' => $query,
                'rok' => $rok,
                'count_lp' => count($lp_ids_final),
                'count_orders_fulltext' => count($orders_detail_out),
                'count_orders_all' => array_sum(array_map('count', $all_orders_by_lp)),
                'count_faktury' => array_sum(array_map('count', $matched_faktury_by_order))
            ]
        ]);

    } catch (Exception $e) {
        error_log('[LP Fulltext Search] Error: ' . $e->getMessage());
        error_log('[LP Fulltext Search] Trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při fulltext vyhledávání: ' . $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
    } catch (Error $e) {
        error_log('[LP Fulltext Search] PHP Error: ' . $e->getMessage());
        error_log('[LP Fulltext Search] Trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'PHP Error: ' . $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
    }
}
}

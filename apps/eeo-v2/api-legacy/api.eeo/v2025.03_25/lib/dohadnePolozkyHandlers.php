<?php

/**
 * Dohadné položky Handlers - Order V2 API
 *
 * Handlery pro přehled dohadných položek (objednávky bez faktur vázané na LP nebo Smlouvu).
 * NEZAPOČÍTÁVAT: pokladenské záznamy (25a_pokladni_*), zrušené, zamítnuté, smazané, archivované, dokončené.
 *
 * Endpoints:
 * - POST /stats/dohadne-polozky - LP přehled + Smlouvy přehled
 *
 * @author Backend Developer
 */

require_once __DIR__ . '/TimezoneHelper.php';

/**
 * POST /stats/dohadne-polozky
 *
 * Request body:
 * {
 *   "token":    "...",
 *   "username": "...",
 *   "datum_od": "2026-01-01",   // volitelné
 *   "datum_do": "2026-12-31"    // volitelné
 * }
 */
function handle_dohadne_polozky($input, $config) {
    // 1. Auth
    $username = isset($input['username']) ? trim($input['username']) : '';
    $token    = isset($input['token'])    ? trim($input['token'])    : '';

    $auth = verify_token_v2($username, $token);
    if (!$auth) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
        return;
    }

    // 2. Parametry
    $datum_od = isset($input['datum_od']) && $input['datum_od'] !== '' ? $input['datum_od'] : null;
    $datum_do = isset($input['datum_do']) && $input['datum_do'] !== '' ? $input['datum_do'] : null;

    // Validace formátu datumů
    if ($datum_od && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $datum_od)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný formát datum_od (očekáváno YYYY-MM-DD)'));
        return;
    }
    if ($datum_do && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $datum_do)) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný formát datum_do (očekáváno YYYY-MM-DD)'));
        return;
    }

    // 3. DB
    $db = get_db($config);
    if (!$db) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba připojení k databázi'));
        return;
    }

    // 4. Stavový filtr z checkboxů (FE posílá pole zaškrtnutých stavů)
    $stav_filter = isset($input['stav_filter']) && is_array($input['stav_filter']) ? $input['stav_filter'] : null;

    // Povolené hodnoty checkboxů
    $filterable_states = array('Ke schválení', 'Schválená', 'Rozpracovaná');

    try {
        TimezoneHelper::setMysqlTimezone($db);

        // ─── Stavové filtry ───────────────────────────────────────────────────
        // Stavy, které NEZAHRNUJEME (objednávky jsou ukončené, neplatné, nebo již mají fakturu)
        // - Věcná správnost / Zkontrolovaná: faktura je zaevidována, probíhá/proběhla věcná správnost
        // - Ke zveřejnění / Uveřejněna: post-dokončení (smlouvy v registru)
        $excluded_states = array(
            'Zamítnutá', 'Zrušena', 'Smazaná', 'Archivovaná', 'Dokončená',
            'Věcná správnost', 'Zkontrolovaná', 'Ke zveřejnění', 'Uveřejněna v registru smluv'
        );

        // Pokud FE poslal stav_filter → odškrtnuté checkboxy přidáme do excluded
        if ($stav_filter !== null) {
            $valid_filter = array_values(array_intersect($stav_filter, $filterable_states));
            $unchecked = array_diff($filterable_states, $valid_filter);
            if (!empty($unchecked)) {
                $excluded_states = array_merge($excluded_states, array_values($unchecked));
            }
        }

        // Stavy "před odeslením" → částka = max_cena_s_dph / počet LP vazeb
        $pre_schvaleni_states = array('Nová', 'Rozpracovaná', 'Ke schválení', 'Schválená');

        // ─── 1) LP dohadné položky dle čísla účtu ────────────────────────────
        $lp_uctu_result = _dohadne_get_lp_by_uctu_data($db, $datum_od, $datum_do, $excluded_states, $pre_schvaleni_states);

        // ─── 2) LP dohadné položky dle LP kódu ───────────────────────────────
        $lp_result = _dohadne_get_lp_data($db, $datum_od, $datum_do, $excluded_states, $pre_schvaleni_states);

        // ─── 3) SMLOUVY dohadné položky ───────────────────────────────────────
        $smlouvy_result = _dohadne_get_smlouvy_data($db, $datum_od, $datum_do, $excluded_states, $pre_schvaleni_states);

        http_response_code(200);
        echo json_encode(array(
            'status'  => 'success',
            'data'    => array(
                'lp_uctu' => $lp_uctu_result,
                'lp'      => $lp_result,
                'smlouvy' => $smlouvy_result,
            ),
            'filters' => array(
                'datum_od' => $datum_od,
                'datum_do' => $datum_do,
            ),
        ));

    } catch (Exception $e) {
        error_log('handle_dohadne_polozky error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při zpracování: ' . $e->getMessage()));
    }
}

/**
 * Vrátí LP dohadné položky seskupené dle čísla účtu (cislo_uctu).
 * Každý účet (např. 501) sdružuje více LP kódů (LPIT1, LPIA1, LPT1…).
 * Používá identická stavová omezení jako _dohadne_get_lp_data().
 */
function _dohadne_get_lp_by_uctu_data($db, $datum_od, $datum_do, $excluded_states, $pre_schvaleni_states) {
    $where  = array('o.aktivni = 1');
    $params = array();

    $where[] = "o.financovani LIKE '%\"typ\":\"LP\"%'";

    if (!empty($excluded_states)) {
        $placeholders = implode(',', array_fill(0, count($excluded_states), '?'));
        $where[] = "o.stav_objednavky NOT IN ($placeholders)";
        $params   = array_merge($params, $excluded_states);
    }

    if ($datum_od) { $where[] = 'DATE(o.dt_vytvoreni) >= ?'; $params[] = $datum_od; }
    if ($datum_do) { $where[] = 'DATE(o.dt_vytvoreni) <= ?'; $params[] = $datum_do; }

    $where_sql = implode(' AND ', $where);

    $sql = "
        SELECT
            o.id,
            o.cislo_objednavky,
            o.predmet,
            o.dodavatel_nazev,
            o.stav_objednavky,
            o.max_cena_s_dph,
            o.financovani,
            o.dt_vytvoreni,
            o.strediska_kod,
            o.druh_objednavky_kod,
            u1.jmeno     AS objednatel_jmeno,
            u1.prijmeni  AS objednatel_prijmeni,
            u2.jmeno     AS schvalovatel_jmeno,
            u2.prijmeni  AS schvalovatel_prijmeni,
            u3.jmeno     AS prikazce_jmeno,
            u3.prijmeni  AS prikazce_prijmeni,
            COALESCE(
                (SELECT SUM(p.cena_s_dph) FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p WHERE p.objednavka_id = o.id),
                0
            ) AS suma_polozky
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u1 ON u1.id = o.objednatel_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u2 ON u2.id = o.schvalovatel_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u3 ON u3.id = o.prikazce_id
        LEFT JOIN `" . TBL_FAKTURY . "` f
            ON f.objednavka_id = o.id AND f.aktivni = 1 AND f.stav != 'STORNO'
        WHERE $where_sql
          AND f.id IS NULL
        ORDER BY o.dt_vytvoreni DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Předem načteme LP info (id → cislo_lp, cislo_uctu, nazev_uctu)
    $lp_ids_needed = array();
    foreach ($rows as $row) {
        $fin = json_decode($row['financovani'], true);
        if ($fin && isset($fin['lp_kody']) && is_array($fin['lp_kody'])) {
            foreach ($fin['lp_kody'] as $lp_id) {
                $lp_ids_needed[(int)$lp_id] = true;
            }
        }
    }

    $lp_info_map = array(); // lp_id → { cislo_lp, cislo_uctu, nazev_uctu }
    if (!empty($lp_ids_needed)) {
        $lp_ids_list = implode(',', array_map('intval', array_keys($lp_ids_needed)));
        $lp_stmt = $db->query(
            "SELECT id, cislo_lp, cislo_uctu, nazev_uctu FROM `" . TBL_LP_MASTER . "` WHERE id IN ($lp_ids_list)"
        );
        foreach ($lp_stmt->fetchAll(PDO::FETCH_ASSOC) as $lp) {
            $lp_info_map[(int)$lp['id']] = $lp;
        }
    }

    // Seskupit dle (cislo_uctu, nazev_uctu)
    $groups = array(); // key = "cislo_uctu|nazev_uctu"
    $total_castka                = 0;
    $total_objednavek            = 0;
    $castka_pre_schvaleni_total  = 0;
    $castka_odeslane_total       = 0;

    foreach ($rows as $row) {
        $fin = json_decode($row['financovani'], true);
        if (!$fin || !isset($fin['lp_kody']) || !is_array($fin['lp_kody']) || empty($fin['lp_kody'])) {
            continue;
        }

        $lp_kody  = $fin['lp_kody'];
        $pocet_lp = count($lp_kody);

        $je_pre_schvaleni = in_array($row['stav_objednavky'], $pre_schvaleni_states);
        $suma_polozky     = (float)$row['suma_polozky'];
        $max_cena         = (float)$row['max_cena_s_dph'];

        if ($je_pre_schvaleni) {
            $castka_na_lp     = $pocet_lp > 0 ? round($max_cena / $pocet_lp, 2) : $max_cena;
            $castka_objednavky = $max_cena;
            $typ_castky       = 'pre_schvaleni';
        } else {
            $castka_zaklad    = $suma_polozky > 0 ? $suma_polozky : $max_cena;
            $castka_na_lp     = $pocet_lp > 0 ? round($castka_zaklad / $pocet_lp, 2) : $castka_zaklad;
            $castka_objednavky = $castka_zaklad;
            $typ_castky       = 'odeslana';
        }

        // Zpracujeme každý LP kód → zjistíme jeho účet → zařadíme do skupiny
        // Jedna objednávka může být přes více LP různých účtů → správně ji rozúčtujeme
        foreach ($lp_kody as $lp_id) {
            $lp_id   = (int)$lp_id;
            $lp_info = isset($lp_info_map[$lp_id]) ? $lp_info_map[$lp_id] : null;

            $cislo_uctu = $lp_info ? (string)$lp_info['cislo_uctu'] : 'Neznámý';
            $nazev_uctu = $lp_info ? $lp_info['nazev_uctu']         : '';
            $cislo_lp   = $lp_info ? $lp_info['cislo_lp']           : 'LP#' . $lp_id;
            $grp_key    = $cislo_uctu . '|' . $nazev_uctu;

            if (!isset($groups[$grp_key])) {
                $groups[$grp_key] = array(
                    'cislo_uctu'           => $cislo_uctu,
                    'nazev_uctu'           => $nazev_uctu,
                    'lp_kody_v_uctu'       => array(), // unikátní LP kódy v tomto účtu
                    'pocet_objednavek'     => 0,
                    'castka_pre_schvaleni' => 0.0,
                    'castka_odeslane'      => 0.0,
                    'castka_celkem'        => 0.0,
                    'objednavky'           => array(),
                );
            }

            // Přidat LP kód do setu účtu
            if (!in_array($cislo_lp, $groups[$grp_key]['lp_kody_v_uctu'])) {
                $groups[$grp_key]['lp_kody_v_uctu'][] = $cislo_lp;
            }

            if ($typ_castky === 'pre_schvaleni') {
                $groups[$grp_key]['castka_pre_schvaleni'] += $castka_na_lp;
                $castka_pre_schvaleni_total              += $castka_na_lp;
            } else {
                $groups[$grp_key]['castka_odeslane'] += $castka_na_lp;
                $castka_odeslane_total               += $castka_na_lp;
            }
            $groups[$grp_key]['castka_celkem']      += $castka_na_lp;
            $total_castka                           += $castka_na_lp;

            // Přidat objednávku do skupiny (jen jednou za skupinu+objednávku)
            $already = false;
            foreach ($groups[$grp_key]['objednavky'] as $ex) {
                if ($ex['id'] === (int)$row['id']) { $already = true; break; }
            }
            if (!$already) {
                $groups[$grp_key]['pocet_objednavek']++;
                $total_objednavek++;
                $groups[$grp_key]['objednavky'][] = array(
                    'id'                   => (int)$row['id'],
                    'cislo_objednavky'     => $row['cislo_objednavky'],
                    'predmet'              => $row['predmet'],
                    'dodavatel_nazev'      => $row['dodavatel_nazev'],
                    'stav_objednavky'      => $row['stav_objednavky'],
                    'castka'               => $castka_na_lp,
                    'castka_celkem'        => $castka_objednavky,
                    'typ_castky'           => $typ_castky,
                    'dt_vytvoreni'         => $row['dt_vytvoreni'],
                    'strediska_kod'        => $row['strediska_kod'],
                    'druh_objednavky_kod'  => $row['druh_objednavky_kod'],
                    'cislo_lp'             => $cislo_lp,
                    'objednatel_jmeno'     => $row['objednatel_jmeno'],
                    'objednatel_prijmeni'  => $row['objednatel_prijmeni'],
                    'schvalovatel_jmeno'   => $row['schvalovatel_jmeno'],
                    'schvalovatel_prijmeni'=> $row['schvalovatel_prijmeni'],
                    'prikazce_jmeno'       => $row['prikazce_jmeno'],
                    'prikazce_prijmeni'    => $row['prikazce_prijmeni'],
                );
            }
        }
    }

    // Seřadit skupiny dle cislo_uctu ASC
    usort($groups, function($a, $b) {
        return strnatcmp((string)$a['cislo_uctu'], (string)$b['cislo_uctu']);
    });

    // Zaokrouhlit + seřadit LP kódy v každé skupině
    foreach ($groups as &$g) {
        $g['castka_pre_schvaleni'] = round($g['castka_pre_schvaleni'], 2);
        $g['castka_odeslane']      = round($g['castka_odeslane'], 2);
        $g['castka_celkem']        = round($g['castka_celkem'], 2);
        sort($g['lp_kody_v_uctu']);
    }
    unset($g);

    return array(
        'groups'               => array_values($groups),
        'total_objednavek'     => $total_objednavek,
        'total_uctu_skupin'    => count($groups),
        'castka_pre_schvaleni' => round($castka_pre_schvaleni_total, 2),
        'castka_odeslane'      => round($castka_odeslane_total, 2),
        'castka_celkem'        => round($total_castka, 2),
    );
}

/**
 * Vrátí LP dohadné položky — objednávky s LP financováním BEZ aktivní faktury,
 * seskupené dle LP kódu.
 */
function _dohadne_get_lp_data($db, $datum_od, $datum_do, $excluded_states, $pre_schvaleni_states) {
    $where = array('o.aktivni = 1');
    $params = array();

    // Vyloučit objednávky z pokladny – mají financovani NULL nebo bez LP/SMLOUVA typ
    // LP objednávky musí mít typ "LP" v JSON
    $where[] = "o.financovani LIKE '%\"typ\":\"LP\"%'";

    // Žádná aktivní faktura (LEFT JOIN podmínka níže)
    // (filtr přes AND f.id IS NULL)

    // Vyloučit ukončené stavy
    if (!empty($excluded_states)) {
        $placeholders = implode(',', array_fill(0, count($excluded_states), '?'));
        $where[] = "o.stav_objednavky NOT IN ($placeholders)";
        $params = array_merge($params, $excluded_states);
    }

    if ($datum_od) {
        $where[] = 'DATE(o.dt_vytvoreni) >= ?';
        $params[] = $datum_od;
    }
    if ($datum_do) {
        $where[] = 'DATE(o.dt_vytvoreni) <= ?';
        $params[] = $datum_do;
    }

    $where_sql = implode(' AND ', $where);

    $sql = "
        SELECT
            o.id,
            o.cislo_objednavky,
            o.predmet,
            o.dodavatel_nazev,
            o.stav_objednavky,
            o.max_cena_s_dph,
            o.financovani,
            o.dt_vytvoreni,
            o.strediska_kod,
            o.druh_objednavky_kod,
            u1.jmeno        AS objednatel_jmeno,
            u1.prijmeni     AS objednatel_prijmeni,
            u2.jmeno        AS schvalovatel_jmeno,
            u2.prijmeni     AS schvalovatel_prijmeni,
            u3.jmeno        AS prikazce_jmeno,
            u3.prijmeni     AS prikazce_prijmeni,
            COALESCE(
                (SELECT SUM(p.cena_s_dph)
                 FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p
                 WHERE p.objednavka_id = o.id),
                0
            ) AS suma_polozky
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u1 ON u1.id = o.objednatel_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u2 ON u2.id = o.schvalovatel_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u3 ON u3.id = o.prikazce_id
        LEFT JOIN `" . TBL_FAKTURY . "` f
            ON f.objednavka_id = o.id
            AND f.aktivni = 1
            AND f.stav != 'STORNO'
        WHERE $where_sql
          AND f.id IS NULL
        ORDER BY o.dt_vytvoreni DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Seskupit dle LP kódu
    $groups = array();  // [lp_id => [cislo_lp, nazev_uctu, cislo_uctu, objednavky => []]]

    // Předem načteme info o LP kódech (id → cislo_lp, nazev_uctu, cislo_uctu)
    $lp_ids_needed = array();
    foreach ($rows as $row) {
        $fin = json_decode($row['financovani'], true);
        if ($fin && isset($fin['lp_kody']) && is_array($fin['lp_kody'])) {
            foreach ($fin['lp_kody'] as $lp_id) {
                $lp_ids_needed[(int)$lp_id] = true;
            }
        }
    }

    $lp_info_map = array();
    if (!empty($lp_ids_needed)) {
        $lp_ids_list = implode(',', array_map('intval', array_keys($lp_ids_needed)));
        $lp_stmt = $db->query("SELECT id, cislo_lp, nazev_uctu, cislo_uctu FROM `" . TBL_LP_MASTER . "` WHERE id IN ($lp_ids_list)");
        foreach ($lp_stmt->fetchAll(PDO::FETCH_ASSOC) as $lp) {
            $lp_info_map[(int)$lp['id']] = $lp;
        }
    }

    $total_castka = 0;
    $total_objednavek = 0;
    $castka_pre_schvaleni_total = 0;
    $castka_odeslane_total = 0;

    foreach ($rows as $row) {
        $fin = json_decode($row['financovani'], true);
        if (!$fin || !isset($fin['lp_kody']) || !is_array($fin['lp_kody']) || empty($fin['lp_kody'])) {
            continue;
        }

        $lp_kody = $fin['lp_kody'];
        $pocet_lp = count($lp_kody);

        // Výpočet částky dle stavu
        $je_pre_schvaleni = in_array($row['stav_objednavky'], $pre_schvaleni_states);
        $suma_polozky = (float)$row['suma_polozky'];
        $max_cena = (float)$row['max_cena_s_dph'];

        if ($je_pre_schvaleni) {
            // Před schválením → max_cena / počet LP
            $castka_na_lp = $pocet_lp > 0 ? round($max_cena / $pocet_lp, 2) : $max_cena;
            $castka_objednavky = $max_cena;
            $typ_castky = 'pre_schvaleni';
        } else {
            // Odeslané → suma_polozky nebo fallback max_cena
            $castka_zaklad = $suma_polozky > 0 ? $suma_polozky : $max_cena;
            $castka_na_lp = $pocet_lp > 0 ? round($castka_zaklad / $pocet_lp, 2) : $castka_zaklad;
            $castka_objednavky = $castka_zaklad;
            $typ_castky = 'odeslana';
        }

        // Přidat do skupin dle LP kódu
        foreach ($lp_kody as $lp_id) {
            $lp_id = (int)$lp_id;
            $lp_info = isset($lp_info_map[$lp_id]) ? $lp_info_map[$lp_id] : null;
            $key = $lp_id;

            if (!isset($groups[$key])) {
                $groups[$key] = array(
                    'lp_id'          => $lp_id,
                    'cislo_lp'       => $lp_info ? $lp_info['cislo_lp'] : 'LP#' . $lp_id,
                    'nazev_uctu'     => $lp_info ? $lp_info['nazev_uctu'] : '',
                    'cislo_uctu'     => $lp_info ? $lp_info['cislo_uctu'] : null,
                    'pocet_objednavek' => 0,
                    'castka_pre_schvaleni' => 0,
                    'castka_odeslane' => 0,
                    'castka_celkem'  => 0,
                    'objednavky'     => array(),
                );
            }

            if ($typ_castky === 'pre_schvaleni') {
                $groups[$key]['castka_pre_schvaleni'] += $castka_na_lp;
                $castka_pre_schvaleni_total += $castka_na_lp;
            } else {
                $groups[$key]['castka_odeslane'] += $castka_na_lp;
                $castka_odeslane_total += $castka_na_lp;
            }
            $groups[$key]['castka_celkem'] += $castka_na_lp;
            $groups[$key]['pocet_objednavek']++;
            $total_castka += $castka_na_lp;

            $groups[$key]['objednavky'][] = array(
                'id'                   => (int)$row['id'],
                'cislo_objednavky'     => $row['cislo_objednavky'],
                'predmet'              => $row['predmet'],
                'dodavatel_nazev'      => $row['dodavatel_nazev'],
                'stav_objednavky'      => $row['stav_objednavky'],
                'castka'               => $castka_na_lp,
                'castka_celkem'        => $castka_objednavky,
                'typ_castky'           => $typ_castky,
                'dt_vytvoreni'         => $row['dt_vytvoreni'],
                'strediska_kod'        => $row['strediska_kod'],
                'druh_objednavky_kod'  => $row['druh_objednavky_kod'],
                'objednatel_jmeno'     => $row['objednatel_jmeno'],
                'objednatel_prijmeni'  => $row['objednatel_prijmeni'],
                'schvalovatel_jmeno'   => $row['schvalovatel_jmeno'],
                'schvalovatel_prijmeni'=> $row['schvalovatel_prijmeni'],
                'prikazce_jmeno'       => $row['prikazce_jmeno'],
                'prikazce_prijmeni'    => $row['prikazce_prijmeni'],
            );
        }
        $total_objednavek++;
    }

    // Seřadit skupiny: dle počtu objednávek sestupně
    usort($groups, function($a, $b) {
        return $b['pocet_objednavek'] - $a['pocet_objednavek'];
    });

    // Zaokrouhlení souhrnů
    foreach ($groups as &$g) {
        $g['castka_pre_schvaleni'] = round($g['castka_pre_schvaleni'], 2);
        $g['castka_odeslane']      = round($g['castka_odeslane'], 2);
        $g['castka_celkem']        = round($g['castka_celkem'], 2);
    }
    unset($g);

    return array(
        'groups'                  => array_values($groups),
        'total_objednavek'        => $total_objednavek,
        'total_lp_skupin'         => count($groups),
        'castka_pre_schvaleni'    => round($castka_pre_schvaleni_total, 2),
        'castka_odeslane'         => round($castka_odeslane_total, 2),
        'castka_celkem'           => round($total_castka, 2),
    );
}

/**
 * Vrátí SMLOUVY dohadné položky — objednávky se Smlouva financováním BEZ aktivní faktury,
 * seskupené dle čísla smlouvy.
 */
function _dohadne_get_smlouvy_data($db, $datum_od, $datum_do, $excluded_states, $pre_schvaleni_states) {
    $where = array('o.aktivni = 1');
    $params = array();

    $where[] = "o.financovani LIKE '%\"typ\":\"SMLOUVA\"%'";

    if (!empty($excluded_states)) {
        $placeholders = implode(',', array_fill(0, count($excluded_states), '?'));
        $where[] = "o.stav_objednavky NOT IN ($placeholders)";
        $params = array_merge($params, $excluded_states);
    }

    if ($datum_od) {
        $where[] = 'DATE(o.dt_vytvoreni) >= ?';
        $params[] = $datum_od;
    }
    if ($datum_do) {
        $where[] = 'DATE(o.dt_vytvoreni) <= ?';
        $params[] = $datum_do;
    }

    $where_sql = implode(' AND ', $where);

    $sql = "
        SELECT
            o.id,
            o.cislo_objednavky,
            o.predmet,
            o.dodavatel_nazev,
            o.stav_objednavky,
            o.max_cena_s_dph,
            o.financovani,
            o.dt_vytvoreni,
            o.strediska_kod,
            o.druh_objednavky_kod,
            u1.jmeno        AS objednatel_jmeno,
            u1.prijmeni     AS objednatel_prijmeni,
            u2.jmeno        AS schvalovatel_jmeno,
            u2.prijmeni     AS schvalovatel_prijmeni,
            u3.jmeno        AS prikazce_jmeno,
            u3.prijmeni     AS prikazce_prijmeni,
            COALESCE(
                (SELECT SUM(p.cena_s_dph)
                 FROM `" . TBL_OBJEDNAVKY_POLOZKY . "` p
                 WHERE p.objednavka_id = o.id),
                0
            ) AS suma_polozky
        FROM `" . TBL_OBJEDNAVKY . "` o
        LEFT JOIN `" . TBL_UZIVATELE . "` u1 ON u1.id = o.objednatel_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u2 ON u2.id = o.schvalovatel_id
        LEFT JOIN `" . TBL_UZIVATELE . "` u3 ON u3.id = o.prikazce_id
        LEFT JOIN `" . TBL_FAKTURY . "` f
            ON f.objednavka_id = o.id
            AND f.aktivni = 1
            AND f.stav != 'STORNO'
        WHERE $where_sql
          AND f.id IS NULL
        ORDER BY o.dt_vytvoreni DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Načteme info o smlouvách z 25_smlouvy
    $cisla_smluv = array();
    foreach ($rows as $row) {
        $fin = json_decode($row['financovani'], true);
        if ($fin && isset($fin['cislo_smlouvy']) && $fin['cislo_smlouvy'] !== '') {
            $cisla_smluv[$fin['cislo_smlouvy']] = true;
        }
    }

    $smlouva_info_map = array();
    if (!empty($cisla_smluv)) {
        $placeholders = implode(',', array_fill(0, count($cisla_smluv), '?'));
        $sm_stmt = $db->prepare(
            "SELECT cislo_smlouvy, nazev_smlouvy, nazev_firmy, hodnota_s_dph, platnost_od, platnost_do
             FROM `" . TBL_SMLOUVY . "`
             WHERE cislo_smlouvy IN ($placeholders)"
        );
        $sm_stmt->execute(array_keys($cisla_smluv));
        foreach ($sm_stmt->fetchAll(PDO::FETCH_ASSOC) as $sm) {
            $smlouva_info_map[$sm['cislo_smlouvy']] = $sm;
        }
    }

    $groups = array();
    $total_castka = 0;
    $total_objednavek = 0;
    $castka_pre_schvaleni_total = 0;
    $castka_odeslane_total = 0;

    foreach ($rows as $row) {
        $fin = json_decode($row['financovani'], true);
        if (!$fin || !isset($fin['cislo_smlouvy']) || $fin['cislo_smlouvy'] === '') {
            continue;
        }

        $cislo_smlouvy = $fin['cislo_smlouvy'];
        $sm_info = isset($smlouva_info_map[$cislo_smlouvy]) ? $smlouva_info_map[$cislo_smlouvy] : null;

        $je_pre_schvaleni = in_array($row['stav_objednavky'], $pre_schvaleni_states);
        $suma_polozky = (float)$row['suma_polozky'];
        $max_cena = (float)$row['max_cena_s_dph'];

        if ($je_pre_schvaleni) {
            $castka = $max_cena;
            $typ_castky = 'pre_schvaleni';
        } else {
            $castka = $suma_polozky > 0 ? $suma_polozky : $max_cena;
            $typ_castky = 'odeslana';
        }

        if (!isset($groups[$cislo_smlouvy])) {
            $groups[$cislo_smlouvy] = array(
                'cislo_smlouvy'        => $cislo_smlouvy,
                'nazev_smlouvy'        => $sm_info ? $sm_info['nazev_smlouvy'] : '',
                'nazev_firmy'          => $sm_info ? $sm_info['nazev_firmy'] : '',
                'hodnota_smlouvy'      => $sm_info ? (float)$sm_info['hodnota_s_dph'] : null,
                'platnost_od'          => $sm_info ? $sm_info['platnost_od'] : null,
                'platnost_do'          => $sm_info ? $sm_info['platnost_do'] : null,
                'pocet_objednavek'     => 0,
                'castka_pre_schvaleni' => 0,
                'castka_odeslane'      => 0,
                'castka_celkem'        => 0,
                'objednavky'           => array(),
            );
        }

        if ($typ_castky === 'pre_schvaleni') {
            $groups[$cislo_smlouvy]['castka_pre_schvaleni'] += $castka;
            $castka_pre_schvaleni_total += $castka;
        } else {
            $groups[$cislo_smlouvy]['castka_odeslane'] += $castka;
            $castka_odeslane_total += $castka;
        }
        $groups[$cislo_smlouvy]['castka_celkem'] += $castka;
        $groups[$cislo_smlouvy]['pocet_objednavek']++;
        $total_castka += $castka;
        $total_objednavek++;

        $groups[$cislo_smlouvy]['objednavky'][] = array(
            'id'                   => (int)$row['id'],
            'cislo_objednavky'     => $row['cislo_objednavky'],
            'predmet'              => $row['predmet'],
            'dodavatel_nazev'      => $row['dodavatel_nazev'],
            'stav_objednavky'      => $row['stav_objednavky'],
            'castka'               => $castka,
            'castka_celkem'        => $castka,
            'typ_castky'           => $typ_castky,
            'dt_vytvoreni'         => $row['dt_vytvoreni'],
            'strediska_kod'        => $row['strediska_kod'],
            'druh_objednavky_kod'  => $row['druh_objednavky_kod'],
            'objednatel_jmeno'     => $row['objednatel_jmeno'],
            'objednatel_prijmeni'  => $row['objednatel_prijmeni'],
            'schvalovatel_jmeno'   => $row['schvalovatel_jmeno'],
            'schvalovatel_prijmeni'=> $row['schvalovatel_prijmeni'],
            'prikazce_jmeno'       => $row['prikazce_jmeno'],
            'prikazce_prijmeni'    => $row['prikazce_prijmeni'],
        );
    }

    // Seřadit skupiny: dle počtu objednávek sestupně
    usort($groups, function($a, $b) {
        return $b['pocet_objednavek'] - $a['pocet_objednavek'];
    });

    // Zaokrouhlení souhrnů
    foreach ($groups as &$g) {
        $g['castka_pre_schvaleni'] = round($g['castka_pre_schvaleni'], 2);
        $g['castka_odeslane']      = round($g['castka_odeslane'], 2);
        $g['castka_celkem']        = round($g['castka_celkem'], 2);
    }
    unset($g);

    return array(
        'groups'               => array_values($groups),
        'total_objednavek'     => $total_objednavek,
        'total_smluv'          => count($groups),
        'castka_pre_schvaleni' => round($castka_pre_schvaleni_total, 2),
        'castka_odeslane'      => round($castka_odeslane_total, 2),
        'castka_celkem'        => round($total_castka, 2),
    );
}

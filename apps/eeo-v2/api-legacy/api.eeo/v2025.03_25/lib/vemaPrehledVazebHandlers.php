<?php
/**
 * Přehled vazeb VEMA <-> EEO pro záložky "VEMA doklady bez EEO dokladů" a
 * "Faktury EEO bez VEMA dokladů".
 *
 * Pravidlo: co je v Kontrole objednávek nebo Kontrole smluv, nesmí být v
 * "bez" seznamech a obráceně. Proto se "bez" seznamy neodvozují vlastními
 * heuristikami (staré počty pocet_* / NOT IN podle VS, objednávky, smlouvy),
 * ale přímo z toho, co obě kontroly skutečně pokrývají:
 *  - VEMA doklad je "pokrytý", když je v Kontrole objednávek nebo smluv, nebo
 *    když k němu mimo obě kontroly existuje EEO faktura se stejným číslem
 *    dokladu (cdok = fa_vema_kod) - pak má protějšek, jen do žádné kontroly
 *    nespadá (nemá číslo objednávky ani smlouvy, které by EEO znalo).
 *  - EEO faktura je "pokrytá", když je spárovaná s VEMA dokladem v některé
 *    kontrole (nebo přes zmíněnou shodu čísla dokladu mimo kontroly).
 */

/**
 * @return array{vemaIds: string[], vemaIdsObj: string[], vemaIdsSml: string[], eeoFakturaIds: string[]}|null  null při chybě
 */
function vema_prehled_vazeb_collect($input, $config) {
    $base = array(
        'token' => $input['token'] ?? '',
        'username' => $input['username'] ?? '',
        '_membershipOnly' => true,
    );

    // Handlery při chybě (auth apod.) echují JSON - ten sem nesmí prosáknout.
    ob_start();
    $obj = handle_vema_beta_grouped_list($base, $config);
    $sml = is_array($obj)
        ? handle_vema_sml_grouped_list($base + array('_objVemaIds' => $obj['vemaIds']), $config)
        : null;
    ob_end_clean();

    if (!is_array($obj) || !is_array($sml)) return null;

    $vemaIds = array();
    $eeoIds = array();
    foreach (array($obj, $sml) as $part) {
        foreach ($part['vemaIds'] as $id) $vemaIds[(string)$id] = true;
        foreach ($part['eeoFakturaIds'] as $id) $eeoIds[(string)$id] = true;
    }

    // Shoda čísla dokladu mimo obě kontroly.
    $db = get_db($config);
    TimezoneHelper::setMysqlTimezone($db);
    // Dva prosté dotazy + párování v PHP - JOIN přes cdok = fa_vema_kod nemá
    // index a v SQL trval ~0,4 s, takhle jde o desítky ms.
    $eeoByDoklad = array();
    $sqlEeo = "SELECT id, fa_vema_kod FROM `" . TBL_FAKTURY . "`
               WHERE aktivni = 1 AND stav != 'STORNO' AND fa_vema_kod IS NOT NULL AND fa_vema_kod != ''";
    foreach ($db->query($sqlEeo)->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $eeoByDoklad[(string)$row['fa_vema_kod']][] = (string)$row['id'];
    }
    $sqlVema = "SELECT id, cdok FROM `" . TBL_VEMA_FPAZAHL . "`
                WHERE stav_zaznamu = 'aktivni' AND cdok IS NOT NULL AND cdok != ''";
    foreach ($db->query($sqlVema)->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $vid = (string)$row['id'];
        if (isset($vemaIds[$vid]) || empty($eeoByDoklad[(string)$row['cdok']])) continue;
        $vemaIds[$vid] = true;
        foreach ($eeoByDoklad[(string)$row['cdok']] as $eid) $eeoIds[$eid] = true;
    }

    // Shoda VS + částka + datum vystavení (±10 dní) - pro EEO faktury bez
    // čísla dokladu (nebo se stejným). Zachytí páry, kde VEMA u dokladu nevede
    // číslo objednávky ani smlouvy (do žádné kontroly nespadne), nebo se VS
    // liší jen úvodními nulami ("0141501835" x "141501835"). Obě strany
    // páru se tím berou jako pokryté (VEMA doklad v kontrole už pokrytý je).
    $normVs = function ($v) { return ltrim(trim((string)$v), '0'); };
    $eeoByVs = array();
    $sqlEeoVs = "SELECT id, fa_cislo_vema, fa_vema_kod, fa_castka, fa_datum_vystaveni FROM `" . TBL_FAKTURY . "`
                 WHERE aktivni = 1 AND stav != 'STORNO' AND fa_cislo_vema IS NOT NULL AND fa_cislo_vema != ''";
    foreach ($db->query($sqlEeoVs)->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $k = $normVs($row['fa_cislo_vema']);
        if ($k !== '') $eeoByVs[$k][] = $row;
    }
    $sqlVemaVs = "SELECT id, vsymb, cdok, celkem, dof, datpri FROM `" . TBL_VEMA_FPAZAHL . "`
                  WHERE stav_zaznamu = 'aktivni' AND vsymb IS NOT NULL AND vsymb != ''";
    foreach ($db->query($sqlVemaVs)->fetchAll(PDO::FETCH_ASSOC) as $v) {
        $k = $normVs($v['vsymb']);
        if ($k === '' || empty($eeoByVs[$k])) continue;
        $vDatum = vema_beta_parse_flexible_date($v['dof']);
        if ($vDatum === null) $vDatum = vema_beta_parse_flexible_date($v['datpri']);
        if ($vDatum === null) continue;
        $cdok = trim((string)$v['cdok']);
        foreach ($eeoByVs[$k] as $f) {
            $eeoDoklad = trim((string)$f['fa_vema_kod']);
            if ($eeoDoklad !== '' && $eeoDoklad !== $cdok) continue;
            if (abs((float)$f['fa_castka'] - (float)$v['celkem']) >= 0.01) continue;
            $fDatum = vema_beta_parse_flexible_date($f['fa_datum_vystaveni']);
            if ($fDatum === null || abs($fDatum - $vDatum) > 10 * 24 * 60 * 60) continue;
            $eeoIds[(string)$f['id']] = true;
            $vemaIds[(string)$v['id']] = true;
        }
    }

    return array(
        'vemaIds' => array_map('strval', array_keys($vemaIds)),
        'vemaIdsObj' => array_map('strval', $obj['vemaIds']),
        'vemaIdsSml' => array_map('strval', $sml['vemaIds']),
        'eeoFakturaIds' => array_map('strval', array_keys($eeoIds)),
    );
}

/**
 * POST /vema-faktury/prehled-vazeb
 * Response: {status, data: {vemaIdsPokryte, vemaIdsObj, vemaIdsSml}}
 * FE z toho filtruje ploché pohledy Kontroly objednávek / smluv a záložku
 * "VEMA doklady bez EEO dokladů" (= žádný z pokrytých).
 */
function handle_vema_prehled_vazeb($input, $config) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    $token = $input['token'] ?? '';
    $username = $input['username'] ?? '';
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
        $prehled = vema_prehled_vazeb_collect($input, $config);
        if ($prehled === null) {
            throw new Exception('Nepodařilo se sestavit přehled vazeb z kontrol');
        }
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'vemaIdsPokryte' => $prehled['vemaIds'],
                'vemaIdsObj' => $prehled['vemaIdsObj'],
                'vemaIdsSml' => $prehled['vemaIdsSml'],
            ),
        ));
    } catch (Exception $e) {
        error_log('VEMA prehled-vazeb error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při sestavení přehledu vazeb: ' . $e->getMessage()));
    }
}

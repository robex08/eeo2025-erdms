<?php
/**
 * VEMA vs EEO - Kontrola SML, seskupený pohled: hromadný BE endpoint.
 *
 * Analogie handle_vema_beta_grouped_list (vemaBetaGroupedHandlers.php), ale
 * s opačným párovacím pravidlem, jak explicitně specifikoval uživatel:
 *
 *   Kontrola OBJ BETA: VEMA faktura <-> EEO OBJEDNÁVKA (přes objednavka_id
 *   na EEO faktuře).
 *   Kontrola SML:      VEMA faktura <-> EEO SMLOUVA, a to jen u EEO faktur,
 *   které mají smlouva_id vyplněné A ZÁROVEŇ objednavka_id PRÁZDNÉ - tedy
 *   "EEO SML má PŘÍMO fakturu/faktury, BEZ EEO objednávky". Faktury s
 *   vyplněnými OBOU (smlouva_id i objednavka_id) sem nepatří (to je případ
 *   "objednávka financovaná ze smlouvy", řešený jinde).
 *
 * Zdrojová sada VEMA dokladů je zrcadlově opačná než u Kontroly OBJ BETA:
 * tam `WHERE (smlouvy.ecsml IS NULL OR TRIM(smlouvy.ecsml) = '')`, tady
 * `WHERE smlouvy.ecsml IS NOT NULL AND TRIM(smlouvy.ecsml) != ''` (shoduje se
 * s FE plochým filtrem filteredFakturyData, case 'kontrola-sml').
 *
 * Znovupoužívá čisté/generické utility z vemaBetaGroupedHandlers.php (union-find
 * vazebních skupin, klasifikace skupiny, normalizace stavu kontroly, formát
 * invoice row pro JSON) - beze změny toho souboru. Vlastní (SML-specifické)
 * jsou jen: zdrojový SQL predikát, resolve kandidátů (smlouva místo
 * objednávky), výpočet ticků/verdiktu (vazba na smlouvu + "hodnota smlouvy"
 * jako fallback částky) a fulltext/warning/badge pomocné funkce, které se
 * opírají o pole specifická pro smlouvu (cislo_smlouvy/nazev_smlouvy/
 * dodavatel), ne o objednávku.
 */

require_once __DIR__ . '/dbconfig.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/vemaPropojenHandlers.php';
require_once __DIR__ . '/vemaBetaGroupedHandlers.php';

// ============================================================================
// Pomocné funkce specifické pro Kontrolu SML
// ============================================================================

/**
 * Port vema_beta_get_badge_count, ale bez ročních poplatků v součtu - FE
 * plochý pohled Kontroly SML (filteredFakturyData, case 'kontrola-sml') roční
 * poplatky do badge NEPOČÍTÁ (na rozdíl od Kontroly OBJ BETA), viz
 * `includeRocniPoplatkyInBadge = !(fakturySubTab === 'kontrola-obj' ||
 * fakturySubTab === 'kontrola-sml')` v VemaDenik.js. Seskupený pohled musí
 * zůstat konzistentní s plochým, jinak by filtr na badge počet napočítával
 * jiná čísla v obou pohledech téže záložky.
 */
function vema_sml_get_badge_count($dedupRow) {
    $max = 0;
    foreach ($dedupRow['_group_invoices'] as $row) {
        $pocetObj = isset($row['pocet_objednavek']) ? (int)$row['pocet_objednavek'] : 0;
        $pocetFa = isset($row['pocet_faktur']) ? (int)$row['pocet_faktur'] : 0;
        $count = $pocetObj + $pocetFa;
        if ($count > $max) $max = $count;
    }
    return $max;
}

/**
 * Port vema_beta_group_faktury_for_kontrola, ale "varování" skupiny se řídí
 * has_chyba_sml (faktura bez objednávky I bez smlouvy), ne has_chyba_obj -
 * to je pole, které si FE plochý pohled Kontroly SML čte pro warningOnlyFilter
 * (viz hasWarningIssue/useSmlRules ve VemaDenik.js).
 */
function vema_sml_group_faktury_for_kontrola($rows) {
    $grouped = array();
    foreach ($rows as $item) {
        $key = vema_beta_build_group_key($item);
        if (!isset($grouped[$key])) $grouped[$key] = array();
        $grouped[$key][] = $item;
    }

    $result = array();
    foreach ($grouped as $key => $groupItems) {
        usort($groupItems, function ($a, $b) {
            $aTs = !empty($a['datpri']) ? strtotime((string)$a['datpri']) : 0;
            $bTs = !empty($b['datpri']) ? strtotime((string)$b['datpri']) : 0;
            if ($aTs === false) $aTs = 0;
            if ($bTs === false) $bTs = 0;
            return $bTs - $aTs;
        });

        $base = $groupItems[0];
        $hasChybaSml = false;
        foreach ($groupItems as $row) {
            if (!empty($row['has_chyba_sml']) && (int)$row['has_chyba_sml'] > 0) {
                $hasChybaSml = true;
                break;
            }
        }

        $dedupRow = $base;
        $dedupRow['_group_key'] = $key;
        $dedupRow['_group_invoices'] = $groupItems;
        $dedupRow['_group_has_chyba_sml'] = $hasChybaSml;
        $result[] = $dedupRow;
    }

    return $result;
}

/**
 * Fulltext hledání na úrovni vazební skupiny - port vema_beta_group_matches_search,
 * ale EEO strana hledá v polích SMLOUVY (cislo_smlouvy/nazev_smlouvy/dodavatel),
 * ne objednávky. Financování se u smlouvy jako kandidáta nepoužívá (na EEO
 * faktuře napojené přímo na smlouvu bez objednávky nedává typ financování
 * smysl - to pole existuje jen na objednávce), proto se tu ani nehledá.
 */
function vema_sml_group_matches_search($group, $search) {
    if ($search === '') return true;

    foreach ($group['entries'] as $entry) {
        $row = $entry['row'];
        $vemaFields = array(
            $row['cfak'] ?? null, $row['nazevfak'] ?? null, $row['cdok'] ?? null,
            $row['csml'] ?? null, $row['cobj'] ?? null, $row['cobj_formatovane'] ?? null,
            $row['typdok'] ?? null, $row['ksymb'] ?? null, $row['vsymb'] ?? null,
            $row['ssymb'] ?? null, $row['dicp'] ?? null, $row['cfakdupl'] ?? null,
            $row['dobrdok'] ?? null, $row['dobrfak'] ?? null, $row['smlouva_ecsml'] ?? null,
        );
        foreach ($vemaFields as $val) {
            if ($val !== null && $val !== '' && mb_stripos((string)$val, $search) !== false) return true;
        }
    }

    foreach ($group['candidates'] as $cand) {
        $eeoFields = array(
            $cand['cislo_smlouvy'] ?? null, $cand['nazev_smlouvy'] ?? null, $cand['dodavatel'] ?? null,
        );
        foreach ($eeoFields as $val) {
            if ($val !== null && $val !== '' && mb_stripos((string)$val, $search) !== false) return true;
        }
    }

    return false;
}

/**
 * Dohleda "polozky rocniho poplatku" (25a_rocni_poplatky_polozky) jako
 * ALTERNATIVNI zdroj shody pro VEMA fakturu, kdyz EEO na smlouve netvori
 * jednu EEO fakturu na doklad/obdobi, ale eviduje jednotlive platby v modulu
 * Rocni poplatky (typicky pravidelne mesicni platby - najem, sluzby apod.) -
 * viz zadani uzivatele: smlouva muze mit v `25a_objednavky_faktury` jen JEDNU
 * fakturu, zatimco realne "zaplacenych VEMA obdobi" je vic a kazde ma svuj
 * vlastni doklad evidovany jako `25a_rocni_poplatky_polozky.cislo_dokladu`.
 *
 * Parovaci klic je stejny, jaky uz pouziva VS-fallback filtr v
 * bulk_resolve_vema_faktura_propojeni/resolve_vema_faktura_propojeni
 * (vemaPropojenHandlers.php, sekce "2b. ROCNI POPLATKY") -
 * `TRIM(rpp.cislo_dokladu) = VEMA cdok` - ale na rozdil od nich tady RP
 * polozku nepouzivame jen jako filtr/kontext pro jinou fakturu, nybrz jako
 * PLNOHODNOTNEHO KANDIDATA shody, ktereho lze zobrazit a promitnout do
 * verdiktu (viz vema_sml_compute_condition_ticks nize). Proto je vlastni,
 * izolovana funkce v tomto (SML) souboru, ne uprava sdileneho
 * vemaPropojenHandlers.php.
 *
 * RP polozka se priradi k VEMA fakture, jen kdyz nalezi (pres
 * rp.smlouva_id) k nektere z kandidatnich smluv, ktere uz ma dana VEMA
 * faktura nalezene v $batchResults[$key]['smlouvy'] (ecsml shoda nebo
 * backfill) - jinak by shoda cisla dokladu s cizi smlouvou (kolize) mohla
 * matchovani zavadet.
 *
 * @param array $batchResults [$vema_faktura_id => {smlouvy, faktury, ...}] - MODIFIKOVANO
 *              (prida klic 'rp_polozky' ke kazdemu zaznamu).
 * @param array $invoicesFlat [$vema_faktura_id => {_key, cdok, ...}] - zdroj cdok hodnot.
 */
function vema_sml_attach_rp_polozky(&$batchResults, $invoicesFlat, $db) {
    foreach ($batchResults as &$res) {
        if (!isset($res['rp_polozky'])) $res['rp_polozky'] = array();
    }
    unset($res);

    $cdok_map = array(); // 'cdok' => [_key, ...]
    foreach ($invoicesFlat as $inv) {
        $cdok = !empty($inv['cdok']) ? trim((string)$inv['cdok']) : '';
        if ($cdok === '') continue;
        if (!isset($cdok_map[$cdok])) $cdok_map[$cdok] = array();
        $cdok_map[$cdok][] = $inv['_key'];
    }
    if (empty($cdok_map)) return;

    $unique_cdok = array_keys($cdok_map);
    $placeholders = implode(',', array_fill(0, count($unique_cdok), '?'));
    $sql = "SELECT
                rpp.id, rpp.rocni_poplatek_id, rpp.faktura_id,
                TRIM(rpp.cislo_dokladu) as cislo_dokladu, rpp.castka, rpp.stav,
                rpp.datum_splatnosti, rpp.datum_zaplaceno, rpp.nazev_polozky,
                rp.smlouva_id, rp.nazev as rp_nazev, rp.rok
            FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
            INNER JOIN `" . TBL_ROCNI_POPLATKY . "` rp ON rpp.rocni_poplatek_id = rp.id
            WHERE rpp.aktivni = 1 AND rp.aktivni = 1
              AND TRIM(rpp.cislo_dokladu) IN ($placeholders)";
    $stmt = $db->prepare($sql);
    $stmt->execute($unique_cdok);

    $rp_by_cdok = array(); // 'cdok' => [row, ...]
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $c = $row['cislo_dokladu'];
        if ($c === null || $c === '') continue;
        if (!isset($rp_by_cdok[$c])) $rp_by_cdok[$c] = array();
        $rp_by_cdok[$c][] = $row;
    }
    if (empty($rp_by_cdok)) return;

    foreach ($cdok_map as $cdok => $keys) {
        if (empty($rp_by_cdok[$cdok])) continue;
        foreach ($keys as $key) {
            if (!isset($batchResults[$key])) continue;
            $candSmlouvaIds = array();
            foreach ($batchResults[$key]['smlouvy'] as $s) {
                if (!empty($s['id'])) $candSmlouvaIds[(int)$s['id']] = true;
            }
            if (empty($candSmlouvaIds)) continue;
            foreach ($rp_by_cdok[$cdok] as $rp) {
                $rpSmlouvaId = !empty($rp['smlouva_id']) ? (int)$rp['smlouva_id'] : 0;
                if ($rpSmlouvaId <= 0 || !isset($candSmlouvaIds[$rpSmlouvaId])) continue;
                $batchResults[$key]['rp_polozky'][] = $rp;
            }
        }
    }
}

/**
 * Ponechá u každé VEMA faktury jen EEO faktury, které k ní opravdu patří:
 * číslo dokladu VEMA (cdok) = číslo dokladu v EEO (fa_vema_kod). EEO faktura
 * bez vyplněného čísla dokladu se uzná jen při shodě data vystavení (±10 dní -
 * do VEMA chodí doklady se zpožděním; měsíční období dělí ~30 dní). Shoda jen
 * přes VS + částku nestačí: VS bývá IČO organizace a měsíční platby mají
 * stejnou částku. VEMA faktura bez cdok se nefiltruje (nelze ověřit).
 *
 * @param array $batchResults [$vema_faktura_id => {faktury, ...}] - MODIFIKOVÁNO
 * @param array $invoicesFlat [$vema_faktura_id => {cdok, dof, datpri, ...}]
 */
function vema_sml_filter_faktury_by_doklad(&$batchResults, $invoicesFlat) {
    foreach ($batchResults as $key => &$res) {
        if (empty($res['faktury']) || !isset($invoicesFlat[$key])) continue;
        $inv = $invoicesFlat[$key];
        $cdok = trim((string)($inv['cdok'] ?? ''));
        if ($cdok === '') continue;

        $vemaDatumTs = vema_beta_parse_flexible_date($inv['dof'] ?? null);
        if ($vemaDatumTs === null) $vemaDatumTs = vema_beta_parse_flexible_date($inv['datpri'] ?? null);

        $res['faktury'] = array_values(array_filter($res['faktury'], function ($f) use ($cdok, $vemaDatumTs) {
            $eeoDoklad = trim((string)($f['fa_vema_kod'] ?? ''));
            if ($eeoDoklad !== '') return $eeoDoklad === $cdok;
            $eeoDatumTs = vema_beta_parse_flexible_date($f['datum_vystaveni'] ?? null);
            return $vemaDatumTs !== null && $eeoDatumTs !== null && abs($vemaDatumTs - $eeoDatumTs) <= 10 * 24 * 60 * 60;
        }));
    }
    unset($res);
}

/**
 * Doplní chybějící kandidátní smlouvy do $batchResults tam, kde se faktura
 * (bez objednávky) našla přes spolehlivou vazbu VS/doklad/částka, ale
 * kandidát (priorita podle rovnosti VEMA ecsml == EEO cislo_smlouvy) mezi
 * kandidáty chybí - typicky proto, že VEMA ecsml je textově jinak (překlep)
 * než EEO cislo_smlouvy, i když jde fakticky o tutéž smlouvu. Na rozdíl od
 * objednávkové varianty (vema_beta_backfill_missing_objednavky, která
 * dohledává podle TEXTU cislo_objednavky), tady máme k dispozici přímo
 * smlouva_id z nalezené EEO faktury (bulk_resolve_vema_faktura_propojeni už
 * ho vrací pro všechny SQL větve) - dohledání je tak jednoznačné, ne přes
 * text.
 *
 * @param array $batchResults [$vema_faktura_id => {objednavky, faktury}] - čerstvě vrácené
 *              z bulk_resolve_vema_faktura_propojeni(), MODIFIKOVÁNO (přidá klíč 'smlouvy').
 */
function vema_sml_backfill_missing_smlouvy(&$batchResults, $db) {
    // Nejdřív rozděl faktury na "bez OBJ" (jediné, co se v Kontrole SML smí
    // párovat, viz docblock souboru) a posbírej smlouva_id, která k danému
    // klíči ještě nemá odpovídající kandidátní smlouvu.
    $missing_ids = array(); // smlouva_id => [key, ...]
    foreach ($batchResults as $key => &$res) {
        $bezObj = array();
        foreach ($res['faktury'] as $f) {
            $hasObj = !empty($f['cislo_objednavky']);
            if ($hasObj) continue; // faktura MÁ objednávku - do Kontroly SML nepatří vůbec
            $bezObj[] = $f;
        }
        $res['faktury'] = $bezObj;

        $existingIds = array();
        foreach ($res['smlouvy'] as $s) {
            if (!empty($s['id'])) $existingIds[(int)$s['id']] = true;
        }
        foreach ($bezObj as $f) {
            $smlouvaId = !empty($f['smlouva_id']) ? (int)$f['smlouva_id'] : 0;
            if ($smlouvaId <= 0 || isset($existingIds[$smlouvaId])) continue;
            if (!isset($missing_ids[$smlouvaId])) $missing_ids[$smlouvaId] = array();
            $missing_ids[$smlouvaId][] = $key;
            $existingIds[$smlouvaId] = true;
        }
    }
    unset($res);
    if (empty($missing_ids)) return;

    $unique_ids = array_keys($missing_ids);
    $placeholders = implode(',', array_fill(0, count($unique_ids), '?'));
    $sql = "SELECT
                s.id, s.cislo_smlouvy, s.nazev_smlouvy, s.nazev_firmy as dodavatel, s.ico as dodavatel_ico,
                s.platnost_od, s.platnost_do, s.hodnota_s_dph as castka, s.stav, s.druh_smlouvy as typ_smlouvy,
                (SELECT COUNT(*) FROM `" . TBL_FAKTURY . "` f WHERE f.smlouva_id = s.id AND (f.objednavka_id IS NULL OR f.objednavka_id = 0) AND f.aktivni = 1 AND f.stav != 'STORNO') as pocet_faktur,
                (SELECT SUM(f.fa_castka) FROM `" . TBL_FAKTURY . "` f WHERE f.smlouva_id = s.id AND (f.objednavka_id IS NULL OR f.objednavka_id = 0) AND f.aktivni = 1 AND f.stav != 'STORNO') as zaplaceno,
                'smlouva' as typ_zaznamu
            FROM `" . TBL_SMLOUVY . "` s
            WHERE s.id IN ($placeholders)";
    $stmt = $db->prepare($sql);
    $stmt->execute($unique_ids);

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $id = (int)$row['id'];
        if (empty($missing_ids[$id])) continue;
        foreach ($missing_ids[$id] as $key) {
            $batchResults[$key]['smlouvy'][] = $row;
        }
    }
}

/**
 * Pro jednu "kontrola" skupinu sloučí+dedupuje předpočítané dávkové výsledky
 * (smlouvy/faktury) za všechny sloučené VEMA řádky skupiny - port
 * vema_beta_resolve_candidates_for_group, jen s klíčem 'smlouvy' místo
 * 'objednavky' a dedup podle cislo_smlouvy.
 */
function vema_sml_resolve_candidates_for_group($dedupRow, $batchResults) {
    $smlouvyRaw = array();
    $fakturyRaw = array();
    $rpPolozkyRaw = array();

    foreach ($dedupRow['_group_invoices'] as $inv) {
        $key = isset($inv['id']) ? $inv['id'] : null;
        $res = ($key !== null && isset($batchResults[$key])) ? $batchResults[$key] : array('smlouvy' => array(), 'faktury' => array(), 'rp_polozky' => array());

        $smlouvyRaw = array_merge($smlouvyRaw, $res['smlouvy'] ?? array());
        $fakturyRaw = array_merge($fakturyRaw, $res['faktury'] ?? array());
        $rpPolozkyRaw = array_merge($rpPolozkyRaw, $res['rp_polozky'] ?? array());
    }

    return array(
        'smlouvy' => vema_beta_dedupe_by_id($smlouvyRaw, 'cislo_smlouvy'),
        'faktury' => vema_beta_dedupe_by_id($fakturyRaw, 'cislo_faktury'),
        // Dedup fallback 'cislo_dokladu' - RP položka nemá vlastní pole 'id'
        // ve stejném jmenném prostoru jako faktura/smlouva, ale svoje ID
        // (rpp.id) v poli 'id' má, takže primární dedup podle 'id' funguje beze změny.
        'rpPolozky' => vema_beta_dedupe_by_id($rpPolozkyRaw, 'cislo_dokladu'),
    );
}

/**
 * Port vema_beta_compute_condition_ticks pro pár (VEMA faktura, kandidátní
 * EEO smlouva). Klíčové rozdíly proti objednávkové variantě:
 *  - vazba EEO se ověřuje přes cislo_smlouvy nalezené EEO faktury (ne
 *    cislo_objednavky) - $matchedFaktury sem chodí už předfiltrované jen na
 *    faktury BEZ objednávky (viz vema_sml_backfill_missing_smlouvy), jinak by
 *    "vazba EEO" mohla omylem uznat fakturu, která ve skutečnosti patří
 *    objednávce financované z téhle smlouvy (jiný, nepříbuzný případ).
 *  - částka: primárně proti konkrétní spárované EEO faktuře (stejná oprava
 *    jako u objednávek - žádné srovnávání proti součtu/stropu CELÉ smlouvy,
 *    pokud známe konkrétní fakturu), a teprve jako FALLBACK (žádná konkrétní
 *    faktura nenalezena) proti "hodnotě smlouvy" (s.hodnota_s_dph) - smlouva
 *    nemá položky jako objednávka, takže žádný ekvivalent castka_detail
 *    neexistuje.
 *  - datum: referenční je platnost_od smlouvy (analogie dt_objednavky) -
 *    faktura by měla být vystavena/přijata až po uzavření/platnosti smlouvy.
 *  - EEO faktura NENÍ jediný uznávaný zdroj vazby: u smluv s pravidelnou
 *    (měsíční) platbou EEO často eviduje jen JEDNU souhrnnou fakturu v
 *    25a_objednavky_faktury a ostatní jednotlivá období vede v modulu Roční
 *    poplatky (25a_rocni_poplatky_polozky, párováno přes cislo_dokladu =
 *    VEMA cdok - viz vema_sml_attach_rp_polozky). Pokud $matchedFaktury
 *    žádnou shodu nedá, ale $matchedRpPolozky ano, bere se RP položka jako
 *    rovnocenná náhrada (jiný typ dokladu, ale legitimní pár) - jinak by
 *    VEMA faktura s reálným protějškem skončila jako "bez vazby" jen proto,
 *    že se dívala na jeden ze dvou možných zdrojů.
 */
function vema_sml_compute_condition_ticks($invoiceRow, $candidate, $matchedFaktury, $matchedRpPolozky = array()) {
    $eeoVazba = 'unk';
    $eeoVazbaDetail = 'smlouva v EEO nemá zatím žádnou evidovanou fakturu bez objednávky';
    $eeoVazbaZdroj = null; // 'eeo_faktura' | 'rocni_poplatek' | null
    $candCisloSmlouvy = trim((string)($candidate['cislo_smlouvy'] ?? ''));
    $candSmlouvaId = isset($candidate['id']) ? (int)$candidate['id'] : 0;
    $faktury = is_array($matchedFaktury) ? $matchedFaktury : array();
    $rpPolozky = is_array($matchedRpPolozky) ? $matchedRpPolozky : array();
    $pocetFakturNaSml = isset($candidate['pocet_faktur']) && $candidate['pocet_faktur'] !== null ? (float)$candidate['pocet_faktur'] : null;
    $zaplacenoNaSml = isset($candidate['zaplaceno']) && $candidate['zaplaceno'] !== null ? (float)$candidate['zaplaceno'] : null;

    // Doklady, které uživatel u této VEMA faktury ručně zamítl
    // (metadata_json.zamitnute_vazby, klíč = FE id: EEO faktura id / 'rp_<id>').
    $zamitnuteIds = array();
    if (!empty($invoiceRow['metadata_json'])) {
        $meta = json_decode($invoiceRow['metadata_json'], true);
        if (is_array($meta) && !empty($meta['zamitnute_vazby']) && is_array($meta['zamitnute_vazby'])) {
            foreach ($meta['zamitnute_vazby'] as $k => $z) {
                $zamitnuteIds[(string)$k] = true;
            }
        }
    }
    if (!empty($zamitnuteIds)) {
        $faktury = array_values(array_filter($faktury, function ($f) use ($zamitnuteIds) {
            return !isset($zamitnuteIds[(string)($f['id'] ?? '')]);
        }));
        $rpPolozky = array_values(array_filter($rpPolozky, function ($rp) use ($zamitnuteIds) {
            return !isset($zamitnuteIds['rp_' . ($rp['id'] ?? '')]);
        }));
    }

    // Číslo dokladu VEMA se musí rovnat číslu dokladu v EEO. EEO faktura bez
    // vyplněného čísla dokladu se uzná jen při shodě data vystavení (±10 dní -
    // do VEMA chodí doklady se zpožděním; měsíční období dělí ~30 dní),
    // jinak by se u měsíčních plateb (stejné VS i částka) všechny VEMA
    // faktury "spárovaly" na jedinou EEO fakturu na smlouvě.
    $vemaCdok = trim((string)($invoiceRow['cdok'] ?? ''));
    if ($vemaCdok !== '') {
        $vemaDatumTs = vema_beta_parse_flexible_date($invoiceRow['dof'] ?? null);
        if ($vemaDatumTs === null) $vemaDatumTs = vema_beta_parse_flexible_date($invoiceRow['datpri'] ?? null);
        $faktury = array_values(array_filter($faktury, function ($f) use ($vemaCdok, $vemaDatumTs) {
            $eeoDoklad = trim((string)($f['fa_vema_kod'] ?? ''));
            if ($eeoDoklad !== '') return $eeoDoklad === $vemaCdok;
            $eeoDatumTs = vema_beta_parse_flexible_date($f['datum_vystaveni'] ?? null);
            return $vemaDatumTs !== null && $eeoDatumTs !== null && abs($vemaDatumTs - $eeoDatumTs) <= 10 * 24 * 60 * 60;
        }));
    }

    $shodnaFaktura = null;
    if (count($faktury) > 0) {
        foreach ($faktury as $f) {
            $fSml = trim((string)($f['cislo_smlouvy'] ?? ''));
            if ($candCisloSmlouvy !== '' && $fSml === $candCisloSmlouvy) {
                $shodnaFaktura = $f;
                break;
            }
        }
        $jinaSmlFaktura = null;
        if (!$shodnaFaktura) {
            foreach ($faktury as $f) {
                $fSml = trim((string)($f['cislo_smlouvy'] ?? ''));
                if ($fSml !== '') {
                    $jinaSmlFaktura = $f;
                    break;
                }
            }
        }

        if ($shodnaFaktura) {
            $eeoVazba = 'ok';
            $eeoVazbaZdroj = 'eeo_faktura';
            $eeoVazbaDetail = 'EEO už má tuto fakturu spárovanou s touto smlouvou (bez objednávky)';
        } elseif ($jinaSmlFaktura) {
            $eeoVazba = 'no';
            $eeoVazbaDetail = 'EEO má tuto fakturu spárovanou s jinou smlouvou (' . $jinaSmlFaktura['cislo_smlouvy'] . ')';
        } else {
            $eeoVazba = 'unk';
            $eeoVazbaDetail = 'EEO fakturu zná (VS/doklad/částka sedí), ale zatím bez vazby na smlouvu';
        }
    } elseif ($pocetFakturNaSml !== null && $pocetFakturNaSml > 0) {
        $eeoVazba = 'unk';
        $eeoVazbaDetail = 'smlouva už má v EEO evidováno ' . (int)$pocetFakturNaSml . ' '
            . ((int)$pocetFakturNaSml === 1 ? 'fakturu bez objednávky' : 'faktury bez objednávky')
            . (($zaplacenoNaSml !== null && $zaplacenoNaSml > 0) ? ' (' . vema_beta_format_kc($zaplacenoNaSml) . ')' : '')
            . ', ale přes VS/doklad/částku se k ní tahle konkrétní faktura nedohledala - zkontrolujte ručně';
    }

    // Žádná přímá EEO faktura pro tuhle konkrétní VEMA fakturu/období (buď
    // vůbec žádný $matchedFaktury kandidát, nebo měla jen "unk"/"no" výše) -
    // zkusit položku ročního poplatku patřící k TÉTO kandidátní smlouvě.
    $shodnaRp = null;
    if ($shodnaFaktura === null && count($rpPolozky) > 0 && $candSmlouvaId > 0) {
        foreach ($rpPolozky as $rp) {
            $rpSmlouvaId = isset($rp['smlouva_id']) ? (int)$rp['smlouva_id'] : 0;
            if ($rpSmlouvaId === $candSmlouvaId) {
                $shodnaRp = $rp;
                break;
            }
        }
        if ($shodnaRp !== null && $eeoVazba !== 'no') {
            $rpStav = strtoupper(trim((string)($shodnaRp['stav'] ?? '')));
            $rpZaplaceno = ($rpStav === 'ZAPLACENO' || !empty($shodnaRp['datum_zaplaceno']));
            $eeoVazba = 'ok';
            $eeoVazbaZdroj = 'rocni_poplatek';
            $eeoVazbaDetail = 'shoda přes položku ročního poplatku (doklad ' . ($shodnaRp['cislo_dokladu'] ?? '?') . ', '
                . ($rpZaplaceno ? 'zaplaceno' : 'nezaplaceno') . ') - EEO tuto smlouvu neúčtuje samostatnou fakturou za každé období';
        }
    }

    $castka = 'unk';
    $castkaDetail = 'smlouva nemá vyplněnou hodnotu k porovnání';

    $referencniCastka = null;
    $referenceLabel = '';
    $shodnaFakturaCastka = ($shodnaFaktura !== null && isset($shodnaFaktura['castka']) && $shodnaFaktura['castka'] !== null && $shodnaFaktura['castka'] !== '')
        ? (float)$shodnaFaktura['castka'] : null;
    $shodnaRpCastka = ($shodnaRp !== null && isset($shodnaRp['castka']) && $shodnaRp['castka'] !== null && $shodnaRp['castka'] !== '')
        ? (float)$shodnaRp['castka'] : null;
    if ($shodnaFakturaCastka !== null) {
        // Konkrétní spárovaná EEO faktura existuje (eeoVazba='ok') - porovnávat
        // JEN proti ní, ne proti hodnotě celé smlouvy (ta může mít víc faktur).
        $referencniCastka = $shodnaFakturaCastka;
        $referenceLabel = 'EEO faktura';
    } elseif ($shodnaRpCastka !== null) {
        // Konkrétní RP položka existuje (eeoVazba='ok' přes rocni_poplatek) -
        // stejná logika jako u EEO faktury, jen jiný zdroj referenční částky.
        $referencniCastka = $shodnaRpCastka;
        $referenceLabel = 'položka ročního poplatku';
    } else {
        $hodnotaSmlouvy = isset($candidate['castka']) && $candidate['castka'] !== null ? (float)$candidate['castka'] : null;
        if ($hodnotaSmlouvy !== null && $hodnotaSmlouvy > 0) {
            $referencniCastka = $hodnotaSmlouvy;
            $referenceLabel = 'hodnota smlouvy';
        }
    }

    $fakturaCastka = isset($invoiceRow['celkem']) && $invoiceRow['celkem'] !== null ? (float)$invoiceRow['celkem'] : null;
    if ($referencniCastka !== null && $fakturaCastka !== null) {
        $tolerance = max($referencniCastka * 0.01, 1);
        $castka = ($fakturaCastka <= $referencniCastka + $tolerance) ? 'ok' : 'no';
        $castkaDetail = 'fa. částka ' . vema_beta_format_kc($fakturaCastka) . ' · ' . $referenceLabel . ' ' . vema_beta_format_kc($referencniCastka);
    }

    $datum = 'unk';
    $datumDetail = 'datum faktury nebo platnosti smlouvy chybí / je neplatné';
    $fakturaDatumVystaveniTs = vema_beta_parse_flexible_date($invoiceRow['dof'] ?? null);
    $fakturaDatumPrijetiTs = vema_beta_parse_flexible_date($invoiceRow['datpri'] ?? null);
    $fakturaDatumTs = $fakturaDatumVystaveniTs !== null ? $fakturaDatumVystaveniTs : $fakturaDatumPrijetiTs;
    $fakturaDatumLabel = $fakturaDatumVystaveniTs !== null ? 'vystavení' : 'přijetí';
    $smlouvaDatumTs = vema_beta_parse_flexible_date($candidate['platnost_od'] ?? null);

    if ($fakturaDatumTs !== null && $smlouvaDatumTs !== null) {
        $toleranceSec = 3 * 24 * 60 * 60;
        $datum = ($fakturaDatumTs >= $smlouvaDatumTs - $toleranceSec) ? 'ok' : 'no';
        $datumDetail = 'fa. ' . $fakturaDatumLabel . ' ' . date('d.m.Y', $fakturaDatumTs) . ' · smlouva platná od ' . date('d.m.Y', $smlouvaDatumTs);
    }

    return array(
        'castka' => $castka, 'castkaDetail' => $castkaDetail,
        'datum' => $datum, 'datumDetail' => $datumDetail,
        'eeoVazba' => $eeoVazba, 'eeoVazbaDetail' => $eeoVazbaDetail,
        'eeoVazbaZdroj' => $eeoVazbaZdroj,
        'shodnaRpPolozka' => $shodnaRp ? array(
            'id' => $shodnaRp['id'] ?? null,
            'cislo_dokladu' => $shodnaRp['cislo_dokladu'] ?? null,
            'castka' => $shodnaRpCastka,
            'stav' => $shodnaRp['stav'] ?? null,
            'datum_splatnosti' => $shodnaRp['datum_splatnosti'] ?? null,
            'datum_zaplaceno' => $shodnaRp['datum_zaplaceno'] ?? null,
        ) : null,
    );
}

/**
 * Port vema_beta_derive_group_verdicts, jen volá vema_sml_compute_condition_ticks
 * (jinak beze změny - stejný cross-produkt přes CELOU skupinu kandidátů,
 * stejné ambiguity dampening pravidlo "jen když eeoVazba==='unk'", stejné
 * přebití verdiktu ručním potvrzením 'v_poradku').
 */
function vema_sml_derive_group_verdicts(&$group) {
    $entries = $group['entries'];

    $candidateCountByInvoice = array();
    $invoiceCountByCandidate = array();
    foreach ($entries as $entry) {
        $rowKey = $entry['row']['_group_key'];
        $ids = array();
        foreach ($entry['candidates'] as $cand) {
            if (isset($cand['id'])) $ids[] = $cand['id'];
        }
        $candidateCountByInvoice[$rowKey] = count($ids);
        foreach ($ids as $id) {
            $invoiceCountByCandidate[$id] = (isset($invoiceCountByCandidate[$id]) ? $invoiceCountByCandidate[$id] : 0) + 1;
        }
    }

    $pairVerdicts = array();
    foreach ($entries as $entry) {
        $rowKey = $entry['row']['_group_key'];
        $rowKontrola = vema_beta_normalize_kontrola_status($entry['row']['kontrola'] ?? null);
        $rowManuallyConfirmed = ($rowKontrola === 'v_poradku');

        // Cross-produkt přes VŠECHNY kandidáty CELÉ vazební skupiny (ne jen
        // entry['candidates']) - viz stejné zdůvodnění u vema_beta_derive_group_verdicts.
        foreach ($group['candidates'] as $cand) {
            if (!isset($cand['id'])) continue;
            $candId = $cand['id'];

            $ticks = vema_sml_compute_condition_ticks($entry['row'], $cand, $entry['faktury'], $entry['rpPolozky'] ?? array());

            $jednoznacne = (isset($candidateCountByInvoice[$rowKey]) ? $candidateCountByInvoice[$rowKey] : 0) === 1
                && (isset($invoiceCountByCandidate[$candId]) ? $invoiceCountByCandidate[$candId] : 0) === 1;

            if ($ticks['datum'] === 'ok' && !$jednoznacne && $ticks['eeoVazba'] === 'unk') {
                $ticks['datum'] = 'unk';
                $ticks['datumDetail'] .= ' — nejednoznačné (víc kandidátů ve skupině), nelze potvrdit automaticky';
            }

            $verdict = 'warn';
            if ($ticks['eeoVazba'] === 'ok') {
                $verdict = 'good';
            } elseif ($ticks['eeoVazba'] === 'no') {
                $verdict = 'bad';
            } elseif ($ticks['castka'] === 'no' || $ticks['datum'] === 'no') {
                $verdict = 'bad';
            } elseif ($ticks['castka'] === 'ok' && $ticks['datum'] === 'ok') {
                $verdict = 'warn';
            }

            if ($rowManuallyConfirmed && $verdict !== 'good') {
                $verdict = 'good';
                $ticks['manuallyConfirmed'] = true;
            }

            $ticks['verdict'] = $verdict;
            $pairVerdicts["{$rowKey}__{$candId}"] = $ticks;
        }
    }

    $group['pairVerdicts'] = $pairVerdicts;
}

/**
 * Klasifikace skupiny pro Kontrolu SML. Na rozdíl od objednávek (kde "víc
 * VEMA faktur na 1 objednávku" je sama o sobě podezřelá kategorie 'fan') je
 * u smlouvy víc faktur normální - čerpá se postupně (měsíční platby apod.) a
 * každá VEMA faktura má svůj vlastní doklad v EEO. Skupina s jednou smlouvou
 * se proto hodnotí podle nejhoršího verdiktu svých faktur; 'matrix' zůstává
 * jen pro skutečně nejednoznačné případy (víc kandidátních smluv).
 */
function vema_sml_classify_group($group) {
    $candidates = $group['candidates'];
    if (count($candidates) === 0) return 'no_candidate';
    if (count($candidates) > 1) return 'matrix';

    $candId = $candidates[0]['id'] ?? null;
    $maWarn = false;
    foreach ($group['entries'] as $entry) {
        $rowKey = $entry['row']['_group_key'];
        $pv = $group['pairVerdicts']["{$rowKey}__{$candId}"] ?? null;
        $verdict = $pv['verdict'] ?? 'warn';
        if ($verdict === 'bad') return 'bad';
        if ($verdict !== 'good') $maWarn = true;
    }
    return $maWarn ? 'warn' : 'good';
}

/**
 * Kontrola čerpání smlouvy (finanční krytí + datumový rozsah) pro jednu
 * vazební skupinu - viz požadavek uživatele: "SML může mít víc faktur
 * (čerpá se postupně), chci vidět finanční krytí a konec platnosti, a jestli
 * všechny faktury (VEMA i EEO) splňují datumový rozsah smlouvy a není
 * přečerpáno."
 *
 * Zdroj dat:
 *  - `smlouva_celkova_hodnota` = `s.hodnota_s_dph` (candidate['castka'],
 *    stejné pole, které používá vema_sml_compute_condition_ticks jako
 *    fallback částky) - jiné "finanční krytí" pole v `25_smlouvy` není
 *    (žádná vazba na limitovaný příslib v této tabulce; LP modul má
 *    vlastní čerpání nezávislé na téhle kontrole).
 *  - `smlouva_soucet_faktur` = `candidate['zaplaceno']` - SUM(fa_castka)
 *    přes VŠECHNY EEO faktury dané smlouvy bez objednávky (SQL podotázka o
 *    kousek výš, stejná jak u fallback-doplnění kandidátů), NE jen faktury
 *    spárované v aktuální vazební skupině - "přečerpáno" musí zohlednit
 *    celou smlouvu, ne jen zrovna zobrazenou dávku.
 *  - `smlouva_soucet_faktur_vema` - informativní součet částek VEMA
 *    faktur (`celkem`) NAPŘÍČ celou skupinou - NENÍ přičten do
 *    `smlouva_soucet_faktur`/`smlouva_precerpano` (reálná duplicita s
 *    `zaplaceno`, pokud VEMA faktura už byla spárována do EEO - jde jen o
 *    doplňkový údaj pro uživatele).
 *  - datumový rozsah smlouvy: `platnost_od` .. `platnost_do` (obě v
 *    `25_smlouvy`). Pokud `platnost_do` chybí, rozsahová kontrola faktury
 *    se přeskočí (nelze prokázat "mimo rozsah" bez horní meze).
 *
 * @return array{
 *   candidatesExtra: array<int,array>,  // candidate id => extra pole
 *   invoiceExtra: array<string,array>,  // row _group_key => extra pole
 *   warning: bool,
 *   reasons: string[],
 * }
 */
function vema_sml_compute_smlouva_financni_kontrola(&$group) {
    $candidatesExtra = array();
    $invoiceExtra = array();
    $reasons = array();
    $warning = false;

    // ---- 1. Finanční krytí + přečerpání za kandidátní smlouvu ----
    foreach ($group['candidates'] as $candidate) {
        if (!isset($candidate['id'])) continue;
        $candId = $candidate['id'];

        // 0 (nebo prázdno) bereme jako "hodnota smlouvy není v EEO vyplněná",
        // ne jako skutečný nulový limit - řada smluv má hodnota_s_dph
        // nevyplněnou/0, a takové by jinak vyšly jako "přečerpané" při
        // jakékoli nenulové faktuře (viz manuální ověření přes reálná data -
        // s castka=0 vycházelo 149/192 skupin jako "přečerpáno", což
        // neodpovídá realitě).
        $celkovaHodnotaRaw = (isset($candidate['castka']) && $candidate['castka'] !== null && $candidate['castka'] !== '')
            ? (float)$candidate['castka'] : null;
        $celkovaHodnota = ($celkovaHodnotaRaw !== null && $celkovaHodnotaRaw > 0) ? $celkovaHodnotaRaw : null;
        $soucetFakturEeo = (isset($candidate['zaplaceno']) && $candidate['zaplaceno'] !== null)
            ? (float)$candidate['zaplaceno'] : 0.0;

        $soucetVema = 0.0;
        foreach ($group['entries'] as $entry) {
            $candCisloSmlouvy = trim((string)($candidate['cislo_smlouvy'] ?? ''));
            $rowEcsml = trim((string)($entry['row']['smlouva_ecsml'] ?? ''));
            if ($candCisloSmlouvy === '' || $rowEcsml === '' || $rowEcsml !== $candCisloSmlouvy) continue;
            $castka = isset($entry['row']['celkem']) && $entry['row']['celkem'] !== null ? (float)$entry['row']['celkem'] : 0.0;
            $soucetVema += $castka;
        }

        $precerpano = ($celkovaHodnota !== null && $soucetFakturEeo > $celkovaHodnota + 0.01);

        $candidatesExtra[$candId] = array(
            'smlouva_platnost_do' => $candidate['platnost_do'] ?? null,
            'smlouva_celkova_hodnota' => $celkovaHodnota,
            'smlouva_soucet_faktur' => $soucetFakturEeo,
            'smlouva_soucet_faktur_vema' => $soucetVema,
            'smlouva_precerpano' => $precerpano,
        );

        if ($precerpano) {
            $warning = true;
            $reasons[] = 'smlouva ' . ($candidate['cislo_smlouvy'] ?? ('#' . $candId))
                . ' je pravděpodobně přečerpána (součet EEO faktur ' . vema_beta_format_kc($soucetFakturEeo)
                . ' > limit ' . vema_beta_format_kc($celkovaHodnota) . ')';
        }
    }

    // ---- 2. Datumový rozsah faktury vs. platnost smlouvy ----
    // Referenční kandidát pro danou fakturu: ten, se kterým má 'good' verdikt
    // (jednoznačná vazba), jinak - je-li ve skupině jediný kandidát - ten
    // jediný. Při víc kandidátech a bez jednoznačné vazby kontrolu
    // přeskakujeme (nejde spolehlivě určit, ke které smlouvě faktura patří).
    foreach ($group['entries'] as $entry) {
        $rowKey = $entry['row']['_group_key'];

        $refCandidate = null;
        $refPv = null;
        if (count($group['candidates']) === 1) {
            $refCandidate = $group['candidates'][0];
            $refPv = isset($group['pairVerdicts']["{$rowKey}__{$refCandidate['id']}"]) ? $group['pairVerdicts']["{$rowKey}__{$refCandidate['id']}"] : null;
        } else {
            foreach ($group['candidates'] as $cand) {
                if (!isset($cand['id'])) continue;
                $pv = isset($group['pairVerdicts']["{$rowKey}__{$cand['id']}"]) ? $group['pairVerdicts']["{$rowKey}__{$cand['id']}"] : null;
                if ($pv && $pv['verdict'] === 'good') { $refCandidate = $cand; $refPv = $pv; break; }
            }
        }

        $mimoRozsah = null; // null = nelze ověřit (chybí datum faktury nebo platnost_do smlouvy)
        if ($refCandidate) {
            $platnostOdTs = vema_beta_parse_flexible_date($refCandidate['platnost_od'] ?? null);
            $platnostDoTs = vema_beta_parse_flexible_date($refCandidate['platnost_do'] ?? null);

            // Faktura spárovaná přes položku ročního poplatku (cislo_dokladu =
            // VEMA cdok, viz vema_sml_attach_rp_polozky) - párovací klíč sám o
            // sobě je spolehlivý důkaz příslušnosti k tomuto období, takže
            // vlastní datum VEMA faktury (dof/datpri) tu NENÍ směrodatné - do
            // VEMA chodí se zpožděním oproti skutečnému období platby. Pro
            // rozsahovou kontrolu proto přednostně použij datum_splatnosti
            // RP položky (to uvádí skutečné období, ne datum zápisu ve VEMA).
            $rpDatumTs = null;
            $shodnaRp = $refPv['shodnaRpPolozka'] ?? null;
            if ($shodnaRp) {
                $rpDatumTs = vema_beta_parse_flexible_date($shodnaRp['datum_splatnosti'] ?? null);
            }

            $fakturaTs = $rpDatumTs;
            if ($fakturaTs === null) $fakturaTs = vema_beta_parse_flexible_date($entry['row']['dof'] ?? null);
            if ($fakturaTs === null) $fakturaTs = vema_beta_parse_flexible_date($entry['row']['datpri'] ?? null);

            if ($fakturaTs !== null && $platnostDoTs !== null) {
                $spodniMez = $platnostOdTs !== null ? $platnostOdTs : null;
                $mimoRozsah = ($fakturaTs > $platnostDoTs) || ($spodniMez !== null && $fakturaTs < $spodniMez);
            }
        }

        $invoiceExtra[$rowKey] = array('mimo_datumovy_rozsah' => $mimoRozsah);

        if ($mimoRozsah === true) {
            $warning = true;
            $reasons[] = 'faktura ' . ($entry['row']['cfak'] ?? $rowKey) . ' je pravděpodobně čerpána mimo datumový rozsah smlouvy';
        }
    }

    return array(
        'candidatesExtra' => $candidatesExtra,
        'invoiceExtra' => $invoiceExtra,
        'warning' => $warning,
        'reasons' => array_values(array_unique($reasons)),
    );
}

// ============================================================================
// POST /vema-faktury/kontrola-sml/grouped-list
// ============================================================================

/**
 * Hromadný endpoint pro seskupený pohled Kontrola SML - viz docblock na
 * začátku souboru pro celkový kontext/algoritmus a rozdíly proti Kontrole OBJ
 * BETA (handle_vema_beta_grouped_list).
 *
 * Parametry: stejné jako u handle_vema_beta_grouped_list, ale BEZ
 * financovaniFilter (financování EEO objednávky tady nedává smysl - kandidát
 * je smlouva a matchovaná EEO faktura na ní nemá pole financovani, to má jen
 * objednávka).
 *
 * Response: {status, data: {groups: [...], verdictCounts: {...}}, pagination: {...}}
 */
function handle_vema_sml_grouped_list($input, $config) {
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

        // ---- Parametry ----
        $search = isset($input['search']) ? trim((string)$input['search']) : '';
        $badgeFilter = isset($input['badgeFilter']) ? (string)$input['badgeFilter'] : 'all';
        $warningOnlyFilter = !empty($input['warningOnlyFilter']);
        if (!empty($input['kontrolaFilter'])) {
            $kontrolaFilter = is_array($input['kontrolaFilter'])
                ? array_values(array_filter(array_map('strval', $input['kontrolaFilter'])))
                : array((string)$input['kontrolaFilter']);
        } else {
            $kontrolaFilter = array();
        }
        $verdictFilter = (!empty($input['verdictFilter'])) ? (string)$input['verdictFilter'] : null;
        $smlouvaWarningFilter = !empty($input['smlouvaWarningFilter']);
        $page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
        $perPage = isset($input['perPage']) ? max(1, min(250, (int)$input['perPage'])) : 50;

        // ---- 1. Načíst VŠECHNY VEMA faktury odpovídající "Kontrola SML" predikátu ----
        // Zrcadlově opačná podmínka než handle_vema_beta_grouped_list - tam
        // "cobj musí existovat A ecsml nesmí", tady jen "ecsml musí existovat"
        // (číslo objednávky u SML dokladu je lhostejné, viz FE flat filtr
        // case 'kontrola-sml' - hasEvidencniSmlouva && (hasObj || !hasObj)).
        $where = array();
        $where[] = "f.stav_zaznamu = 'aktivni'";
        $where[] = "(smlouvy.ecsml IS NOT NULL AND TRIM(smlouvy.ecsml) != '')";

        $where_sql = 'WHERE ' . implode(' AND ', $where);

        $sql = "SELECT
                    f.id, f.stav, f.firma, f.cfak, f.cdok, f.nazevfak,
                    f.typdok, f.ksymb, f.vsymb, f.ssymb, f.dicp, f.cfakdupl,
                    f.dobrdok, f.dobrfak,
                    f.datpri, f.dof, f.spl,
                    f.csml, f.cobj, f.vlast,
                    f.celkem, f.cplatby, f.czbyva,
                    firmy.nazev as firma_nazev,
                    firmy.ico as firma_ico,
                    smlouvy.ecsml as smlouva_ecsml,
                    COALESCE(k.kontrola_status, 'nezkontrolovano') as kontrola,
                    k.metadata_json
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
                ORDER BY f.datpri DESC, f.cfak DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['cobj_formatovane'] = format_vema_cislo_objednavky(isset($row['cobj']) ? $row['cobj'] : null);
        }
        unset($row);

        bulk_calculate_vema_propojeni_counts($rows, $db);

        // ---- 1b. Vyřadit doklady, které patří do Kontroly objednávek ----
        // VEMA doklad s číslem objednávky i smlouvy, ke kterému EEO zná
        // objednávku (OBJ -> financování SML -> FA), páruje Kontrola objednávek -
        // tady by byl duplicitně a bez protějšku (páruje se jen FA bez OBJ).
        $objVemaIds = isset($input['_objVemaIds']) && is_array($input['_objVemaIds']) ? $input['_objVemaIds'] : null;
        if ($objVemaIds === null) {
            ob_start();
            $objMembership = handle_vema_beta_grouped_list(array(
                'token' => $token, 'username' => $username, '_membershipOnly' => true,
            ), $config);
            ob_end_clean();
            $objVemaIds = is_array($objMembership) ? $objMembership['vemaIds'] : array();
        }
        if (!empty($objVemaIds)) {
            $objSet = array_flip(array_map('strval', $objVemaIds));
            $rows = array_values(array_filter($rows, function ($r) use ($objSet) {
                return !isset($objSet[(string)$r['id']]);
            }));
        }

        // ---- 2. Seskupit duplicitní VEMA řádky ----
        $dedupRows = vema_sml_group_faktury_for_kontrola($rows);

        // ---- 3. Aplikovat badge/varování/kontrola filtry ----
        $filteredDedupRows = array();
        foreach ($dedupRows as $dedupRow) {
            if (!vema_beta_matches_badge_filter(vema_sml_get_badge_count($dedupRow), $badgeFilter)) continue;
            if ($warningOnlyFilter && empty($dedupRow['_group_has_chyba_sml'])) continue;
            if (!empty($kontrolaFilter)) {
                $rowStatus = vema_beta_normalize_kontrola_status($dedupRow['kontrola'] ?? null);
                $matchesAny = false;
                foreach ($kontrolaFilter as $kf) {
                    if ($kf === 'varovani') {
                        if (!empty($dedupRow['_group_has_chyba_sml'])) { $matchesAny = true; break; }
                    } elseif ($rowStatus === $kf) {
                        $matchesAny = true;
                        break;
                    }
                }
                if (!$matchesAny) continue;
            }
            $filteredDedupRows[] = $dedupRow;
        }

        // ---- 4. Pro každý zbylý řádek dohledat kandidátní EEO smlouvy/faktury ----
        $invoicesFlat = array();
        foreach ($filteredDedupRows as $dedupRow) {
            foreach ($dedupRow['_group_invoices'] as $inv) {
                if (!isset($inv['id'])) continue;
                $invoicesFlat[$inv['id']] = array(
                    '_key' => $inv['id'],
                    'cfak' => $inv['cfak'] ?? null,
                    'cobj' => $inv['cobj'] ?? null,
                    'csml' => $inv['csml'] ?? null,
                    'vsymb' => $inv['vsymb'] ?? null,
                    'cdok' => $inv['cdok'] ?? null,
                    'smlouva_ecsml' => $inv['smlouva_ecsml'] ?? null,
                    'cobj_formatovane' => $inv['cobj_formatovane'] ?? null,
                    'celkem' => $inv['celkem'] ?? null,
                    'dof' => $inv['dof'] ?? null,
                    'datpri' => $inv['datpri'] ?? null,
                );
            }
        }
        // bulk_resolve_vema_faktura_propojeni() vrací i 'objednavky' (podle
        // cobj), ale ty tady záměrně ignorujeme - Kontrola SML páruje jen na
        // smlouvy. 'faktury' obsahují i f.smlouva_id/s.cislo_smlouvy (SQL v
        // bulk_resolve je JOINuje ve všech větvích), takže je z nich jde
        // rozpoznat, na kterou smlouvu (pokud vůbec) skutečně patří.
        $batchResults = bulk_resolve_vema_faktura_propojeni($db, array_values($invoicesFlat));

        // ---- 4b. Kandidátní smlouvy podle evidenčního čísla (VEMA ecsml == EEO cislo_smlouvy) ----
        $ecsml_map = array(); // 'ecsml' => [_key, ...]
        foreach ($invoicesFlat as $inv) {
            $ecsml = !empty($inv['smlouva_ecsml']) ? trim((string)$inv['smlouva_ecsml']) : '';
            if ($ecsml === '') continue;
            if (!isset($ecsml_map[$ecsml])) $ecsml_map[$ecsml] = array();
            $ecsml_map[$ecsml][] = $inv['_key'];
            $batchResults[$inv['_key']]['smlouvy'] = array();
        }
        // Zajistit klíč 'smlouvy' i pro faktury bez ecsml (pro jednotnost níže).
        foreach ($invoicesFlat as $inv) {
            if (!isset($batchResults[$inv['_key']]['smlouvy'])) $batchResults[$inv['_key']]['smlouvy'] = array();
        }

        if (!empty($ecsml_map)) {
            $unique_ecsml = array_keys($ecsml_map);
            $placeholders = implode(',', array_fill(0, count($unique_ecsml), '?'));
            // Stejná podmínka (stav='AKTIVNI' AND aktivni=1) jako "2. PRIORITA:
            // Hledat podle evidenčního čísla smlouvy" v resolve_vema_faktura_propojeni
            // (vemaPropojenHandlers.php) - zavedená konvence pro tenhle typ vazby,
            // neměníme ji.
            $sql_sml = "SELECT
                            s.id, s.cislo_smlouvy, s.nazev_smlouvy, s.nazev_firmy as dodavatel, s.ico as dodavatel_ico,
                            s.platnost_od, s.platnost_do, s.hodnota_s_dph as castka, s.stav, s.druh_smlouvy as typ_smlouvy,
                            (SELECT COUNT(*) FROM `" . TBL_FAKTURY . "` f WHERE f.smlouva_id = s.id AND (f.objednavka_id IS NULL OR f.objednavka_id = 0) AND f.aktivni = 1 AND f.stav != 'STORNO') as pocet_faktur,
                            (SELECT SUM(f.fa_castka) FROM `" . TBL_FAKTURY . "` f WHERE f.smlouva_id = s.id AND (f.objednavka_id IS NULL OR f.objednavka_id = 0) AND f.aktivni = 1 AND f.stav != 'STORNO') as zaplaceno,
                            'smlouva' as typ_zaznamu
                        FROM `" . TBL_SMLOUVY . "` s
                        WHERE s.cislo_smlouvy IN ($placeholders)
                          AND s.stav = 'AKTIVNI'
                          AND s.aktivni = 1";
            $stmt_sml = $db->prepare($sql_sml);
            $stmt_sml->execute($unique_ecsml);
            foreach ($stmt_sml->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $ecsml = $row['cislo_smlouvy'];
                if (empty($ecsml_map[$ecsml])) continue;
                foreach ($ecsml_map[$ecsml] as $key) {
                    $batchResults[$key]['smlouvy'][] = $row;
                }
            }
        }

        // Musí běžet PŘED backfillem - jinak EEO faktura nalezená jen přes
        // stejné VS (často IČO organizace) a částku přidá VEMA faktuře cizí
        // smlouvu jako kandidáta a slepí nesouvisející smlouvy do jedné skupiny.
        vema_sml_filter_faktury_by_doklad($batchResults, $invoicesFlat);

        // Backfill (viz docblock funkce) + odfiltrování faktur, které MAJÍ
        // objednávku (do Kontroly SML nepatří) z každého dávkového výsledku.
        vema_sml_backfill_missing_smlouvy($batchResults, $db);

        // ---- 4c. Alternativní zdroj shody - položky ročního poplatku ----
        // Musí běžet AŽ PO backfillu výše, ať zohlední i dohledané (ne jen
        // ecsml-matchnuté) kandidátní smlouvy - viz docblock funkce.
        vema_sml_attach_rp_polozky($batchResults, $invoicesFlat, $db);

        // VEMA doklad bez JAKÉHOKOLIV kandidáta (smlouva) v tomto pohledu
        // vůbec nepatří - patří jen do "VEMA doklady bez EEO dokladů".
        $entries = array();
        foreach ($filteredDedupRows as $dedupRow) {
            $resolved = vema_sml_resolve_candidates_for_group($dedupRow, $batchResults);
            if (empty($resolved['smlouvy'])) continue;
            // Smlouva, na které VEMA fakturu vede (ecsml), je jediný kandidát.
            // Smlouva dohledaná jen přes EEO fakturu (backfill) se nepřidává
            // vedle ní - jinak by se nesouvisející smlouvy slepily do matice;
            // rozpor "EEO má doklad na jiné smlouvě" ukáže verdikt řádku.
            $rowEcsml = trim((string)($dedupRow['smlouva_ecsml'] ?? ''));
            if ($rowEcsml !== '') {
                $ecsmlOnly = array_values(array_filter($resolved['smlouvy'], function ($s) use ($rowEcsml) {
                    return trim((string)($s['cislo_smlouvy'] ?? '')) === $rowEcsml;
                }));
                if (!empty($ecsmlOnly)) $resolved['smlouvy'] = $ecsmlOnly;
            }
            $entries[] = array(
                'row' => $dedupRow,
                'candidates' => $resolved['smlouvy'],
                'faktury' => $resolved['faktury'],
                'rpPolozky' => $resolved['rpPolozky'],
            );
        }

        // Interní režim pro vema_prehled_vazeb_collect (vemaPrehledVazebHandlers.php) -
        // viz stejný blok v handle_vema_beta_grouped_list. Ručně zamítnuté
        // doklady se za spárované nepočítají.
        if (!empty($input['_membershipOnly'])) {
            $vemaIds = array();
            $eeoIds = array();
            foreach ($entries as $entry) {
                $zamitnute = array();
                if (!empty($entry['row']['metadata_json'])) {
                    $meta = json_decode($entry['row']['metadata_json'], true);
                    if (is_array($meta) && !empty($meta['zamitnute_vazby']) && is_array($meta['zamitnute_vazby'])) {
                        $zamitnute = $meta['zamitnute_vazby'];
                    }
                }
                foreach ($entry['row']['_group_invoices'] as $inv) {
                    if (isset($inv['id'])) $vemaIds[(string)$inv['id']] = true;
                }
                foreach ($entry['faktury'] as $f) {
                    if (!empty($f['id']) && !isset($zamitnute[(string)$f['id']])) $eeoIds[(string)$f['id']] = true;
                }
            }
            return array('vemaIds' => array_keys($vemaIds), 'eeoFakturaIds' => array_keys($eeoIds));
        }

        // ---- 5. Union-find - sloučit faktury sdílející kandidátní smlouvu (GLOBÁLNĚ) ----
        $groups = vema_beta_build_vazebni_skupiny($entries);

        // ---- 6. Verdikty párů + klasifikace skupiny ----
        $verdictCounts = array('no_candidate' => 0, 'bad' => 0, 'warn' => 0, 'matrix' => 0, 'good' => 0);
        $smlouvaWarningCount = 0;
        foreach ($groups as &$group) {
            vema_sml_derive_group_verdicts($group);
            $category = vema_sml_classify_group($group);
            $group['verdictCategory'] = $category;
            $group['smlouvaFinancniKontrola'] = vema_sml_compute_smlouva_financni_kontrola($group);
        }
        unset($group);

        // Počty na chipech se počítají "fasetově" - každý se zohledněním
        // ostatních aktivních filtrů (fulltext, druhý filtr), aby číslo na
        // chipu odpovídalo tomu, co uživatel po kliknutí opravdu uvidí.
        foreach ($groups as $g) {
            if ($search !== '' && !vema_sml_group_matches_search($g, $search)) continue;
            $jeWarning = !empty($g['smlouvaFinancniKontrola']['warning']);
            if (!$smlouvaWarningFilter || $jeWarning) {
                $verdictCounts[$g['verdictCategory']] = ($verdictCounts[$g['verdictCategory']] ?? 0) + 1;
            }
            if ($jeWarning && ($verdictFilter === null || $g['verdictCategory'] === $verdictFilter)) {
                $smlouvaWarningCount++;
            }
        }

        // ---- 7. Filtr podle vyhodnocení + fulltextu ----
        $filteredGroups = $groups;
        if ($verdictFilter !== null) {
            $filteredGroups = array_values(array_filter($filteredGroups, function ($g) use ($verdictFilter) {
                return $g['verdictCategory'] === $verdictFilter;
            }));
        }
        if ($search !== '') {
            $filteredGroups = array_values(array_filter($filteredGroups, function ($g) use ($search) {
                return vema_sml_group_matches_search($g, $search);
            }));
        }
        if ($smlouvaWarningFilter) {
            $filteredGroups = array_values(array_filter($filteredGroups, function ($g) {
                return !empty($g['smlouvaFinancniKontrola']['warning']);
            }));
        }

        // ---- 8. Stránkování ----
        $total = count($filteredGroups);
        $totalPages = max(1, (int)ceil($total / $perPage));
        $safePage = min($page, $totalPages);
        $offset = ($safePage - 1) * $perPage;
        $pageGroups = array_slice($filteredGroups, $offset, $perPage);

        // ---- 9. Sestavit odpověď ----
        $outputGroups = array();
        foreach ($pageGroups as $group) {
            $financniKontrola = isset($group['smlouvaFinancniKontrola']) ? $group['smlouvaFinancniKontrola'] : null;
            $candidatesExtra = $financniKontrola['candidatesExtra'] ?? array();
            $invoiceExtra = $financniKontrola['invoiceExtra'] ?? array();

            $candidatesOut = array_map(function ($cand) use ($candidatesExtra) {
                if (isset($cand['id']) && isset($candidatesExtra[$cand['id']])) {
                    $cand = array_merge($cand, $candidatesExtra[$cand['id']]);
                }
                return $cand;
            }, $group['candidates']);

            $invoiceRowsOut = array_map(function ($entry) use ($invoiceExtra) {
                $row = vema_beta_format_invoice_row($entry['row']);
                $rowKey = $entry['row']['_group_key'];
                if (isset($invoiceExtra[$rowKey])) {
                    $row = array_merge($row, $invoiceExtra[$rowKey]);
                }
                return $row;
            }, $group['entries']);

            $outputGroups[] = array(
                'groupId' => $group['groupId'],
                'verdictCategory' => $group['verdictCategory'],
                'invoiceRows' => $invoiceRowsOut,
                'candidates' => $candidatesOut,
                'pairVerdicts' => $group['pairVerdicts'],
                'matchedFakturyByRowId' => array_reduce($group['entries'], function ($carry, $entry) {
                    $carry[$entry['row']['_group_key']] = $entry['faktury'];
                    return $carry;
                }, array()),
                // Alternativní zdroj shody (RP položky, viz vema_sml_attach_rp_polozky) -
                // stejný tvar jako matchedFakturyByRowId, ať jde FE zpracovat analogicky.
                'matchedRpPolozkyByRowId' => array_reduce($group['entries'], function ($carry, $entry) {
                    $carry[$entry['row']['_group_key']] = $entry['rpPolozky'] ?? array();
                    return $carry;
                }, array()),
                'smlouvaWarning' => $financniKontrola['warning'] ?? false,
                'smlouvaWarningReasons' => $financniKontrola['reasons'] ?? array(),
            );
        }

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'groups' => $outputGroups,
                'verdictCounts' => $verdictCounts,
                'smlouvaWarningCount' => $smlouvaWarningCount,
            ),
            'pagination' => array(
                'page' => $safePage,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $totalPages,
            ),
        ));

    } catch (Exception $e) {
        error_log('❌ VEMA SML Grouped List Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání seskupeného pohledu Kontroly SML: ' . $e->getMessage(),
        ));
    }
}

// ============================================================================
// POST /vema-smlouvy/faktury-list
// ============================================================================

/**
 * Vrátí EEO faktury (25a_objednavky_faktury) přímo podle smlouva_id - BEZ
 * fuzzy hledání přes VS/doklad/částku. Analogie handle_vema_objednavky_faktury_list
 * (vemaPropojenHandlers.php), ale pro smlouvy - záměrně vlastní handler v
 * tomto (SML) souboru, ne ve sdíleném vemaPropojenHandlers.php, protože ho
 * potřebuje jen GroupedKontrolaSmlView.
 *
 * Navíc oproti objednávkové variantě omezuje výsledek na `objednavka_id IS
 * NULL OR objednavka_id = 0` - konzistentně s párovacím pravidlem celé
 * Kontroly SML (viz docblock nahoře souboru): faktura, která MÁ objednávku,
 * do tohohle pohledu vůbec nepatří, i kdyby náhodou měla vyplněné i
 * smlouva_id.
 *
 * @param array $input {token, username, smlouva_ids: int[]}
 */
function handle_vema_smlouvy_faktury_list($input, $config) {
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

    try {
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

        if (!has_permission($token_data['id'], 'VEMA_VIEW')) {
            http_response_code(403);
            echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k zobrazení Deníku VEMA'));
            return;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba autentizace: ' . $e->getMessage()));
        return;
    }

    $smlouva_ids_raw = isset($input['smlouva_ids']) && is_array($input['smlouva_ids']) ? $input['smlouva_ids'] : array();
    $smlouva_ids = array();
    foreach ($smlouva_ids_raw as $val) {
        $id = (int)$val;
        if ($id > 0) $smlouva_ids[$id] = true;
    }
    $smlouva_ids = array_keys($smlouva_ids);

    if (empty($smlouva_ids)) {
        http_response_code(200);
        echo json_encode(array('status' => 'success', 'data' => array('faktury_by_smlouva' => new stdClass())));
        return;
    }

    // Stejný bezpečnostní strop jako u objednávkové varianty.
    $smlouva_ids = array_slice($smlouva_ids, 0, 200);

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        $placeholders = implode(',', array_fill(0, count($smlouva_ids), '?'));
        $sql = "SELECT
                    f.id,
                    f.smlouva_id,
                    f.fa_cislo_vema,
                    f.fa_vema_kod,
                    f.fa_datum_vystaveni,
                    f.fa_datum_splatnosti,
                    f.fa_castka,
                    f.fa_typ,
                    f.stav
                FROM `" . TBL_FAKTURY . "` f
                WHERE f.smlouva_id IN ($placeholders)
                  AND (f.objednavka_id IS NULL OR f.objednavka_id = 0)
                  AND f.aktivni = 1
                  AND f.stav != 'STORNO'
                ORDER BY f.smlouva_id, f.fa_datum_vystaveni DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($smlouva_ids);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $faktury_by_smlouva = array();
        foreach ($rows as $row) {
            $sid = (string)$row['smlouva_id'];
            if (!isset($faktury_by_smlouva[$sid])) {
                $faktury_by_smlouva[$sid] = array();
            }
            $faktury_by_smlouva[$sid][] = array(
                'id' => (int)$row['id'],
                'smlouva_id' => (int)$row['smlouva_id'],
                'cislo_faktury' => $row['fa_cislo_vema'],
                'fa_vema_kod' => $row['fa_vema_kod'],
                'datum_vystaveni' => $row['fa_datum_vystaveni'],
                'datum_splatnosti' => $row['fa_datum_splatnosti'],
                'castka' => $row['fa_castka'] !== null ? (float)$row['fa_castka'] : null,
                'fa_typ' => $row['fa_typ'],
                'stav' => $row['stav'],
                'zdroj' => 'eeo_faktura',
            );
        }

        // ---- Doplnit položky ročního poplatku (25a_rocni_poplatky_polozky) ----
        // Stejný důvod jako u vema_sml_attach_rp_polozky výše v souboru: u
        // smluv s pravidelnou platbou (nájem/služby) EEO často eviduje jen
        // JEDNU souhrnnou fakturu výše a zbytek období vede v Ročních
        // poplatcích - bez tohohle doplnění by uživatel v panelu "FAKTURY NA
        // SMLOUVĚ" tahle období vůbec neviděl. Vrací se ve STEJNÉM tvaru jako
        // EEO faktura (aby to FE mohlo renderovat stejnou komponentou), jen s
        // 'zdroj' => 'rocni_poplatek' navíc a 'id' jako string prefixovaný
        // 'rp_' (ať nekoliduje s reálnými int ID EEO faktur - důležité pro
        // ruční výběr "tohle je ten správný doklad", který cílí jen na
        // eeo_faktura ID, RP položky proto ruční výběr nenabízejí, viz FE).
        $sql_rp = "SELECT
                        rpp.id, rp.smlouva_id, rpp.faktura_id,
                        TRIM(rpp.cislo_dokladu) as cislo_dokladu,
                        rpp.castka, rpp.stav, rpp.datum_splatnosti, rpp.datum_zaplaceno,
                        rpp.nazev_polozky, rp.nazev as rp_nazev, rp.rok
                    FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
                    INNER JOIN `" . TBL_ROCNI_POPLATKY . "` rp ON rpp.rocni_poplatek_id = rp.id
                    WHERE rp.smlouva_id IN ($placeholders)
                      AND rpp.aktivni = 1
                      AND rp.aktivni = 1
                    ORDER BY rp.smlouva_id, rpp.datum_splatnosti DESC";
        $stmt_rp = $db->prepare($sql_rp);
        $stmt_rp->execute($smlouva_ids);
        $rp_rows = $stmt_rp->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rp_rows as $row) {
            $sid = (string)$row['smlouva_id'];
            if (!isset($faktury_by_smlouva[$sid])) {
                $faktury_by_smlouva[$sid] = array();
            }
            $faktury_by_smlouva[$sid][] = array(
                'id' => 'rp_' . $row['id'],
                'smlouva_id' => (int)$row['smlouva_id'],
                'cislo_faktury' => null, // RP položka nemá vlastní VS
                'fa_vema_kod' => $row['cislo_dokladu'], // párovací klíč shodný s VEMA cdok
                'datum_vystaveni' => null,
                'datum_splatnosti' => $row['datum_splatnosti'],
                'castka' => $row['castka'] !== null ? (float)$row['castka'] : null,
                'fa_typ' => null,
                'stav' => $row['stav'],
                'zdroj' => 'rocni_poplatek',
                'rp_nazev' => $row['nazev_polozky'] ?: $row['rp_nazev'],
                'rp_rok' => $row['rok'],
                'rp_faktura_id' => !empty($row['faktura_id']) ? (int)$row['faktura_id'] : null,
                'datum_zaplaceno' => $row['datum_zaplaceno'],
            );
        }

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array('faktury_by_smlouva' => empty($faktury_by_smlouva) ? new stdClass() : $faktury_by_smlouva)
        ));

    } catch (Exception $e) {
        error_log("❌ VEMA Smlouvy Faktury Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání faktur smlouvy: ' . $e->getMessage()
        ));
    }
}

<?php
/**
 * VEMA vs EEO - Kontrola OBJ BETA, seskupený pohled: hromadný BE endpoint.
 *
 * Přesouvá na server to, co dřív dělal frontend nad jednou (klientsky
 * nastránkovanou) stránkou dat: seskupení duplicitních VEMA faktur
 * (groupFakturyForKontrola), fuzzy matchování na EEO objednávky/faktury
 * (resolve_vema_faktura_propojeni, viz vemaPropojenHandlers.php), sloučení
 * faktur sdílejících kandidátní objednávku (union-find, "vazební skupiny"),
 * výpočet verdiktu páru (good/bad/warn) a klasifikaci skupiny
 * (fan/matrix/no_candidate/good/bad/warn). Díky tomu počty ve filtrovacích
 * chipech (VerdictFilterBar na FE) sedí na CELÝ přefiltrovaný dataset, ne jen
 * na aktuálně nastránkovanou část.
 *
 * Toto je záměrně jediná "BETA" grouped-view logika - ostatní záložky modulu
 * VEMA vs EEO (tabulka, kontrola-sml, kontrola-rp, vema-bez-eeo, eeo-bez-vema)
 * a plochý pohled Kontrola OBJ BETA tímto nejsou dotčeny.
 */

require_once __DIR__ . '/dbconfig.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/vemaPropojenHandlers.php';

// ============================================================================
// Pomocné funkce - port klientské logiky z VemaDenik.js (1:1, viz komentáře)
// ============================================================================

/**
 * Port normalizeKontrolaStatus z client/src/services/apiVemaKontrola.js.
 */
function vema_beta_normalize_kontrola_status($status) {
    $known = array('nezkontrolovano', 'v_poradku', 'nelze_vyresit', 'v_reseni');
    $legacy = array(
        'v_kontrole' => 'v_reseni',
        'zkontrolovano' => 'v_poradku',
        'ma_problem' => 'nelze_vyresit',
        'pozastaveno' => 'v_reseni',
    );

    if (empty($status)) return 'nezkontrolovano';
    $value = trim((string)$status);
    if (in_array($value, $known, true)) return $value;
    if (isset($legacy[$value])) return $legacy[$value];
    return 'nezkontrolovano';
}

/**
 * Port buildKontrolaGroupKey z VemaDenik.js - priorita klíče pro seskupení
 * duplicitních VEMA řádků (stejná objednávka/smlouva + stejný doklad).
 */
function vema_beta_build_group_key($item) {
    $obj = trim((string)(!empty($item['cobj_formatovane']) ? $item['cobj_formatovane'] : (!empty($item['cobj']) ? $item['cobj'] : '')));
    $sml = trim((string)(!empty($item['smlouva_ecsml']) ? $item['smlouva_ecsml'] : (!empty($item['csml']) ? $item['csml'] : '')));
    $cdok = trim((string)(!empty($item['cdok']) ? $item['cdok'] : ''));

    if ($obj !== '' && $sml !== '' && $cdok !== '') return 'OBJ+SML:' . $obj . '|' . $sml . '|CDOK:' . $cdok;
    if ($obj !== '' && $cdok !== '') return 'OBJ:' . $obj . '|CDOK:' . $cdok;
    if ($sml !== '' && $cdok !== '') return 'SML:' . $sml . '|CDOK:' . $cdok;
    // Neseskupitelné - použij vlastní (unikátní) ID řádku, ne náhodu jako FE.
    return 'UNSET:' . (isset($item['id']) ? $item['id'] : uniqid('', true));
}

/**
 * Port groupFakturyForKontrola z VemaDenik.js - seskupí syrové VEMA řádky
 * podle vema_beta_build_group_key, seřadí uvnitř skupiny podle datpri sestupně
 * (nejnovější první = "base"), a vrátí jeden reprezentativní ("dedup") řádek
 * na skupinu s referencí na všechny původní členy (_group_invoices).
 */
function vema_beta_group_faktury_for_kontrola($rows) {
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
        $hasChybaObj = false;
        foreach ($groupItems as $row) {
            if (!empty($row['has_chyba_obj']) && (int)$row['has_chyba_obj'] > 0) {
                $hasChybaObj = true;
                break;
            }
        }

        $dedupRow = $base;
        $dedupRow['_group_key'] = $key;
        $dedupRow['_group_invoices'] = $groupItems;
        $dedupRow['_group_has_chyba_obj'] = $hasChybaObj;
        $result[] = $dedupRow;
    }

    return $result;
}

/**
 * Port getBadgeCount z VemaDenik.js - pro Kontrola OBJ BETA se roční poplatky
 * DO badge počítají (includeRocniPoplatkyInBadge=true pro tuto sub-záložku).
 * Počítá se MAX přes všechny sloučené faktury ve skupině, ne součet.
 */
function vema_beta_get_badge_count($dedupRow) {
    $max = 0;
    foreach ($dedupRow['_group_invoices'] as $row) {
        $pocetObj = isset($row['pocet_objednavek']) ? (int)$row['pocet_objednavek'] : 0;
        $pocetFa = isset($row['pocet_faktur']) ? (int)$row['pocet_faktur'] : 0;
        $pocetRp = isset($row['pocet_rocnich_poplatku']) ? (int)$row['pocet_rocnich_poplatku'] : 0;
        $count = $pocetObj + $pocetFa + $pocetRp;
        if ($count > $max) $max = $count;
    }
    return $max;
}

function vema_beta_matches_badge_filter($count, $badgeFilter) {
    if ($badgeFilter === null || $badgeFilter === '' || $badgeFilter === 'all') return true;
    if ($badgeFilter === '0') return $count === 0;
    if ($badgeFilter === '1') return $count === 1;
    if ($badgeFilter === '2') return $count === 2;
    if ($badgeFilter === '3plus') return $count >= 3;
    return true;
}

/**
 * Vytáhne TYP financování ('LP'|'SMLOUVA'|'INDIVIDUALNI'|'POJISTNA_UDALOST'|null)
 * z JSON pole `financovani` kandidátní EEO objednávky - port stejného parsování,
 * jaké FE dělá u sloupce "Financování" v matici (viz VemaDenik.js).
 */
function vema_beta_get_financovani_typ($candidate) {
    if (empty($candidate['financovani'])) return null;
    $raw = $candidate['financovani'];
    $data = null;
    if (is_string($raw)) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) $data = $decoded;
    } elseif (is_array($raw)) {
        $data = $raw;
    }
    if (!$data) return null;
    $typ = isset($data['TYP']) ? $data['TYP'] : (isset($data['typ']) ? $data['typ'] : null);
    return $typ !== null && $typ !== '' ? $typ : null;
}

/**
 * Skupina projde filtrem podle financování, pokud ALESPOŇ JEDEN kandidát ve
 * skupině odpovídá vybranému typu - multiselect, OR logika (stejný vzor jako
 * kontrolaFilter).
 */
function vema_beta_matches_financovani_filter($group, $financovaniFilter) {
    if (empty($financovaniFilter)) return true;
    foreach ($group['candidates'] as $cand) {
        $typ = vema_beta_get_financovani_typ($cand);
        if ($typ !== null && in_array($typ, $financovaniFilter, true)) return true;
    }
    return false;
}

/**
 * Port formatKc z VemaDenik.js (Number.toLocaleString('cs-CZ')) - jen pro
 * detailní texty ve verdiktech (castkaDetail), přesná shoda desetin není
 * kriticka.
 */
function vema_beta_format_kc($n) {
    $n = (float)$n;
    if ($n == floor($n)) {
        return number_format($n, 0, ',', ' ') . ' Kč';
    }
    return rtrim(rtrim(number_format($n, 2, ',', ' '), '0'), ',') . ' Kč';
}

/**
 * Port excelSerialToDate + parseFlexibleDate z VemaDenik.js/apiVema.js.
 * Vrací unixový timestamp, nebo null (chybí/neplatné/sentinel < rok 2000).
 */
function vema_beta_parse_flexible_date($val) {
    if ($val === null || $val === '') return null;

    $ts = null;
    if (is_numeric($val)) {
        // Excel epoch 1899-12-30 00:00:00 v lokálním čase - shodné s FE excelSerialToDate.
        $epoch = mktime(0, 0, 0, 12, 30, 1899);
        $ts = $epoch + ((float)$val) * 86400;
    } else {
        $parsed = strtotime((string)$val);
        $ts = ($parsed === false) ? null : $parsed;
    }

    if ($ts === null) return null;
    if ((int)date('Y', $ts) < 2000) return null;
    return $ts;
}

/**
 * Port dedupeBy z loadPropojeni (VemaDenik.js) - deduplikace EEO záznamů
 * nasbíraných napříč více VEMA fakturami ve stejné "kontrola" skupině.
 */
function vema_beta_dedupe_by_id($items, $fallbackField) {
    $seen = array();
    $result = array();
    foreach ($items as $idx => $item) {
        if (!empty($item['id'])) {
            $key = 'id:' . $item['id'];
        } elseif (!empty($item[$fallbackField])) {
            $key = 'fb:' . $item[$fallbackField];
        } else {
            $key = 'idx:' . $idx;
        }
        if (!isset($seen[$key])) {
            $seen[$key] = true;
            $result[] = $item;
        }
    }
    return $result;
}

/**
 * Pro jednu "kontrola" skupinu (může mít víc _group_invoices) vezme
 * předpočítané dávkové výsledky (viz bulk_resolve_vema_faktura_propojeni,
 * volané JEDNOU pro celý dataset v handle_vema_beta_grouped_list) a
 * sloučí+dedupuje je za všechny členy skupiny - mirror loadPropojeni's
 * _groupedKontrola větve, jen bez per-invoice DB volání.
 *
 * @param array $dedupRow
 * @param array $batchResults [$vema_faktura_id => {objednavky, faktury}] z bulk_resolve_vema_faktura_propojeni()
 */
function vema_beta_resolve_candidates_for_group($dedupRow, $batchResults) {
    $objednavkyRaw = array();
    $fakturyRaw = array();

    foreach ($dedupRow['_group_invoices'] as $inv) {
        $key = isset($inv['id']) ? $inv['id'] : null;
        $res = ($key !== null && isset($batchResults[$key])) ? $batchResults[$key] : array('objednavky' => array(), 'faktury' => array());

        $objednavkyRaw = array_merge($objednavkyRaw, $res['objednavky'] ?? array());
        $fakturyRaw = array_merge($fakturyRaw, $res['faktury'] ?? array());
    }

    return array(
        'objednavky' => vema_beta_dedupe_by_id($objednavkyRaw, 'cislo_objednavky'),
        'faktury' => vema_beta_dedupe_by_id($fakturyRaw, 'cislo_faktury'),
    );
}

/**
 * Port computeConditionTicks z VemaDenik.js - 1:1 stejné tolerance a
 * priority (částka max(1%,1Kč), datum 3 dny, eeoVazba 3-stavová logika).
 */
function vema_beta_compute_condition_ticks($invoiceRow, $candidate, $matchedFaktury) {
    $eeoVazba = 'unk';
    $eeoVazbaDetail = 'objednávka v EEO nemá zatím žádnou evidovanou fakturu';
    $candObjCislo = trim((string)($candidate['cislo_objednavky'] ?? ''));
    $faktury = is_array($matchedFaktury) ? $matchedFaktury : array();
    $pocetFakturNaObj = isset($candidate['pocet_faktur']) && $candidate['pocet_faktur'] !== null ? (float)$candidate['pocet_faktur'] : null;
    $zaplacenoNaObj = isset($candidate['zaplaceno']) && $candidate['zaplaceno'] !== null ? (float)$candidate['zaplaceno'] : null;

    if (count($faktury) > 0) {
        $shodnaFaktura = null;
        foreach ($faktury as $f) {
            $fObj = trim((string)($f['cislo_objednavky'] ?? ''));
            if ($candObjCislo !== '' && $fObj === $candObjCislo) {
                $shodnaFaktura = $f;
                break;
            }
        }
        $jinaObjFaktura = null;
        if (!$shodnaFaktura) {
            foreach ($faktury as $f) {
                $fObj = trim((string)($f['cislo_objednavky'] ?? ''));
                if ($fObj !== '') {
                    $jinaObjFaktura = $f;
                    break;
                }
            }
        }

        if ($shodnaFaktura) {
            $eeoVazba = 'ok';
            $eeoVazbaDetail = 'EEO už má tuto fakturu spárovanou s touto objednávkou';
        } elseif ($jinaObjFaktura) {
            $eeoVazba = 'no';
            $eeoVazbaDetail = 'EEO má tuto fakturu spárovanou s jinou objednávkou (' . $jinaObjFaktura['cislo_objednavky'] . ')';
        } else {
            $eeoVazba = 'unk';
            $eeoVazbaDetail = 'EEO fakturu zná (VS/doklad/částka sedí), ale zatím bez vazby na objednávku';
        }
    } elseif ($pocetFakturNaObj !== null && $pocetFakturNaObj > 0) {
        $eeoVazba = 'unk';
        $eeoVazbaDetail = 'objednávka už má v EEO evidováno ' . (int)$pocetFakturNaObj . ' '
            . ((int)$pocetFakturNaObj === 1 ? 'fakturu' : 'faktury')
            . (($zaplacenoNaObj !== null && $zaplacenoNaObj > 0) ? ' (' . vema_beta_format_kc($zaplacenoNaObj) . ')' : '')
            . ', ale přes VS/doklad/částku se k ní tahle konkrétní faktura nedohledala - zkontrolujte ručně';
    }

    $castka = 'unk';
    $castkaDetail = 'objednávka nemá položky ani strop k porovnání';
    $soucetPolozek = isset($candidate['castka_detail']) && $candidate['castka_detail'] !== null ? (float)$candidate['castka_detail'] : null;
    $stropObjednavky = isset($candidate['castka_max']) && $candidate['castka_max'] !== null ? (float)$candidate['castka_max'] : null;

    $referencniCastka = null;
    $referenceLabel = '';
    if ($soucetPolozek !== null && $soucetPolozek > 0) {
        $referencniCastka = $soucetPolozek;
        $referenceLabel = 'položky obj.';
    } elseif ($stropObjednavky !== null && $stropObjednavky > 0) {
        $referencniCastka = $stropObjednavky;
        $referenceLabel = 'max obj. (bez položek)';
    }

    $fakturaCastka = isset($invoiceRow['celkem']) && $invoiceRow['celkem'] !== null ? (float)$invoiceRow['celkem'] : null;
    if ($referencniCastka !== null && $fakturaCastka !== null) {
        $tolerance = max($referencniCastka * 0.01, 1);
        $castka = ($fakturaCastka <= $referencniCastka + $tolerance) ? 'ok' : 'no';
        $castkaDetail = 'fa. částka ' . vema_beta_format_kc($fakturaCastka) . ' · ' . $referenceLabel . ' ' . vema_beta_format_kc($referencniCastka);
    }

    $datum = 'unk';
    $datumDetail = 'datum faktury nebo objednávky chybí / je neplatné';
    $fakturaDatumVystaveniTs = vema_beta_parse_flexible_date($invoiceRow['dof'] ?? null);
    $fakturaDatumPrijetiTs = vema_beta_parse_flexible_date($invoiceRow['datpri'] ?? null);
    $fakturaDatumTs = $fakturaDatumVystaveniTs !== null ? $fakturaDatumVystaveniTs : $fakturaDatumPrijetiTs;
    $fakturaDatumLabel = $fakturaDatumVystaveniTs !== null ? 'vystavení' : 'přijetí';
    $objednavkaDatumTs = vema_beta_parse_flexible_date($candidate['dt_objednavky'] ?? null);

    if ($fakturaDatumTs !== null && $objednavkaDatumTs !== null) {
        $toleranceSec = 3 * 24 * 60 * 60;
        $datum = ($fakturaDatumTs >= $objednavkaDatumTs - $toleranceSec) ? 'ok' : 'no';
        $datumDetail = 'fa. ' . $fakturaDatumLabel . ' ' . date('d.m.Y', $fakturaDatumTs) . ' · objednáno ' . date('d.m.Y', $objednavkaDatumTs);
    }

    return array(
        'castka' => $castka, 'castkaDetail' => $castkaDetail,
        'datum' => $datum, 'datumDetail' => $datumDetail,
        'eeoVazba' => $eeoVazba, 'eeoVazbaDetail' => $eeoVazbaDetail,
    );
}

/**
 * Union-find nad vazbami faktura<->kandidátní objednávka NAPŘÍČ CELÝM
 * přefiltrovaným setem (na rozdíl od FE originálu, který groupoval jen
 * v rámci jedné stránky - viz poznámka v plánu).
 *
 * @param array $entries [{row: dedupRow, candidates: [...], faktury: [...]}, ...]
 * @return array [{groupId, entries: [...], candidates: [...]}, ...]
 */
function vema_beta_build_vazebni_skupiny($entries) {
    $parent = array();
    $find = function ($key) use (&$parent, &$find) {
        if (!isset($parent[$key])) $parent[$key] = $key;
        $root = $key;
        while ($parent[$root] !== $root) $root = $parent[$root];
        $cur = $key;
        while ($parent[$cur] !== $root) {
            $next = $parent[$cur];
            $parent[$cur] = $root;
            $cur = $next;
        }
        return $root;
    };

    foreach ($entries as $entry) {
        $invKey = 'inv:' . $entry['row']['_group_key'];
        $find($invKey);
        foreach ($entry['candidates'] as $cand) {
            if (!isset($cand['id'])) continue;
            $objKey = 'obj:' . $cand['id'];
            $find($objKey);
            $ra = $find($invKey);
            $rb = $find($objKey);
            if ($ra !== $rb) $parent[$ra] = $rb;
        }
    }

    $rootToEntries = array();
    $rootToCandidates = array();

    foreach ($entries as $entry) {
        $invKey = 'inv:' . $entry['row']['_group_key'];
        $root = $find($invKey);

        if (!isset($rootToEntries[$root])) $rootToEntries[$root] = array();
        $rootToEntries[$root][] = $entry;

        if (!isset($rootToCandidates[$root])) $rootToCandidates[$root] = array();
        foreach ($entry['candidates'] as $cand) {
            if (!isset($cand['id'])) continue;
            if (!isset($rootToCandidates[$root][$cand['id']])) {
                $rootToCandidates[$root][$cand['id']] = $cand;
            }
        }
    }

    $groups = array();
    foreach ($rootToEntries as $root => $groupEntries) {
        $groups[] = array(
            'groupId' => $root,
            'entries' => $groupEntries,
            'candidates' => array_values(isset($rootToCandidates[$root]) ? $rootToCandidates[$root] : array()),
        );
    }

    return $groups;
}

/**
 * Port deriveGroupVerdicts z VemaDenik.js - pro každý pár (faktura, kandidát)
 * ve vazební skupině spočítá ticks + finální verdikt (good/bad/warn), včetně
 * "ambiguity dampening" datumu u strukturálně nejednoznačných párů.
 */
function vema_beta_derive_group_verdicts(&$group) {
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
        foreach ($entry['candidates'] as $cand) {
            if (!isset($cand['id'])) continue;
            $candId = $cand['id'];

            $ticks = vema_beta_compute_condition_ticks($entry['row'], $cand, $entry['faktury']);

            $jednoznacne = (isset($candidateCountByInvoice[$rowKey]) ? $candidateCountByInvoice[$rowKey] : 0) === 1
                && (isset($invoiceCountByCandidate[$candId]) ? $invoiceCountByCandidate[$candId] : 0) === 1;

            if ($ticks['datum'] === 'ok' && !$jednoznacne) {
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

            $ticks['verdict'] = $verdict;
            $pairVerdicts["{$rowKey}__{$candId}"] = $ticks;
        }
    }

    $group['pairVerdicts'] = $pairVerdicts;
}

/**
 * Port isSimpleShape/isFanShape/matrix + verdictCategory klasifikace z
 * GroupedKontrolaObjView (VemaDenik.js) - přesná priorita: fan > matrix >
 * (pro 1:1/1:0) no_candidate > good > bad > warn.
 */
function vema_beta_classify_group($group) {
    $invoiceCount = count($group['entries']);
    $candidateCount = count($group['candidates']);
    $isSimpleShape = ($invoiceCount === 1 && $candidateCount <= 1);
    $isFanShape = ($invoiceCount > 1 && $candidateCount === 1);

    if ($isFanShape) return 'fan';
    if (!$isSimpleShape) return 'matrix';

    $entry = $group['entries'][0];
    $rowKey = $entry['row']['_group_key'];
    $candidate = isset($group['candidates'][0]) ? $group['candidates'][0] : null;

    if (!$candidate) return 'no_candidate';

    $pv = isset($group['pairVerdicts']["{$rowKey}__{$candidate['id']}"]) ? $group['pairVerdicts']["{$rowKey}__{$candidate['id']}"] : null;
    if ($pv && $pv['verdict'] === 'good') return 'good';
    if ($pv && $pv['verdict'] === 'bad') return 'bad';
    return 'warn';
}

/**
 * Zformátuje jednu "kontrola" dedup-row pro JSON odpověď - jen pole, která FE
 * render funkce (renderSimpleCard/renderFanCard/renderMatrixCard/kontrolaCellFor
 * v VemaDenik.js) skutečně čtou z `row.original`.
 */
function vema_beta_format_invoice_row($dedupRow) {
    // Ruční výběr "tohle je ten správný doklad" (viz handle_vema_kontrola_rucni_vazba_save
    // v vemaKontrolaHandlers.php) - uložený v metadata_json téhož záznamu kontroly,
    // vázaný na stabilní VEMA ID (cfak+firma), takže přežije reimport dat z VEMA.
    $rucniVazba = null;
    if (!empty($dedupRow['metadata_json'])) {
        $decoded = json_decode($dedupRow['metadata_json'], true);
        if (is_array($decoded) && !empty($decoded['rucni_vazba'])) {
            $rucniVazba = $decoded['rucni_vazba'];
        }
    }

    return array(
        'id' => $dedupRow['_group_key'],
        'cfak' => $dedupRow['cfak'] ?? null,
        'firma' => $dedupRow['firma'] ?? null,
        'firma_nazev' => $dedupRow['firma_nazev'] ?? null,
        'firma_ico' => $dedupRow['firma_ico'] ?? null,
        'nazevfak' => $dedupRow['nazevfak'] ?? null,
        'celkem' => $dedupRow['celkem'] ?? null,
        'dof' => $dedupRow['dof'] ?? null,
        'datpri' => $dedupRow['datpri'] ?? null,
        'spl' => $dedupRow['spl'] ?? null,
        'cobj' => $dedupRow['cobj'] ?? null,
        'cobj_formatovane' => $dedupRow['cobj_formatovane'] ?? null,
        'csml' => $dedupRow['csml'] ?? null,
        'smlouva_ecsml' => $dedupRow['smlouva_ecsml'] ?? null,
        'vsymb' => $dedupRow['vsymb'] ?? null,
        'cdok' => $dedupRow['cdok'] ?? null,
        'typdok' => $dedupRow['typdok'] ?? null,
        'kontrola' => $dedupRow['kontrola'] ?? null,
        'rucni_vazba' => $rucniVazba,
        '_masterCfak' => $dedupRow['cfak'] ?? null,
        '_groupedKontrola' => count($dedupRow['_group_invoices']) > 1,
        '_groupInvoicesCount' => count($dedupRow['_group_invoices']),
    );
}

// ============================================================================
// POST /vema-faktury/kontrola-obj-beta/grouped-list
// ============================================================================

/**
 * Hromadný endpoint pro seskupený pohled Kontrola OBJ BETA - viz docblock
 * na začátku souboru pro celkový kontext/algoritmus.
 *
 * Parametry:
 * - token, username (string, required)
 * - search (string, optional)
 * - badgeFilter ('all'|'0'|'1'|'2'|'3plus', optional, default 'all')
 * - warningOnlyFilter (bool, optional, default false)
 * - kontrolaFilter (string[]|string|null, optional - multiselect, hodnoty z 'nezkontrolovano'|'v_poradku'|'nelze_vyresit'|'v_reseni'|'varovani', OR logika)
 * - verdictFilter (string|null, optional - 'no_candidate'|'bad'|'warn'|'fan'|'matrix'|'good')
 * - financovaniFilter (string[]|string|null, optional - multiselect, hodnoty z 'LP'|'SMLOUVA'
 *   (a případně dalších TYP hodnot pole financovani na EEO objednávce) - OR logika,
 *   skupina projde, pokud alespoň jeden kandidát ve skupině odpovídá)
 * - page (int, optional, default 1)
 * - perPage (int, optional, default 50, max 250)
 *
 * Response: {status, data: {groups: [...], verdictCounts: {...}, financovaniCounts: {...}}, pagination: {...}}
 */
function handle_vema_beta_grouped_list($input, $config) {
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
        // Multiselect - přijímá pole hodnot (nebo zpětně kompatibilně jeden string).
        // Prázdné pole = žádný filtr.
        if (!empty($input['kontrolaFilter'])) {
            $kontrolaFilter = is_array($input['kontrolaFilter'])
                ? array_values(array_filter(array_map('strval', $input['kontrolaFilter'])))
                : array((string)$input['kontrolaFilter']);
        } else {
            $kontrolaFilter = array();
        }
        $verdictFilter = (!empty($input['verdictFilter'])) ? (string)$input['verdictFilter'] : null;
        if (!empty($input['financovaniFilter'])) {
            $financovaniFilter = is_array($input['financovaniFilter'])
                ? array_values(array_filter(array_map('strval', $input['financovaniFilter'])))
                : array((string)$input['financovaniFilter']);
        } else {
            $financovaniFilter = array();
        }
        $page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
        $perPage = isset($input['perPage']) ? max(1, min(250, (int)$input['perPage'])) : 50;

        // ---- 1. Načíst VŠECHNY VEMA faktury odpovídající "Kontrola OBJ/BETA" predikátu ----
        $where = array();
        $params = array();
        $where[] = "f.stav_zaznamu = 'aktivni'";
        // Kontrola OBJ/BETA (VemaDenik.js filteredFakturyData, case 'kontrola-obj'):
        // musí mít číslo objednávky A NESMÍ mít evidenční číslo smlouvy.
        $where[] = "TRIM(COALESCE(f.cobj, '')) != ''";
        $where[] = "(smlouvy.ecsml IS NULL OR TRIM(smlouvy.ecsml) = '')";

        if ($search !== '') {
            $where[] = "(f.cfak LIKE ? OR f.nazevfak LIKE ? OR f.cdok LIKE ?
                        OR f.csml LIKE ? OR f.cobj LIKE ? OR f.typdok LIKE ?
                        OR f.ksymb LIKE ? OR f.vsymb LIKE ? OR f.ssymb LIKE ?
                        OR f.dicp LIKE ? OR f.cfakdupl LIKE ? OR f.dobrdok LIKE ?
                        OR f.dobrfak LIKE ?
                        OR EXISTS (
                                SELECT 1
                                FROM `" . TBL_VEMA_SMLA . "` s_map
                                WHERE s_map.csml = f.csml
                                    AND s_map.ecsml LIKE ?
                                    AND s_map.stav_zaznamu = 'aktivni'
                        ))";
            $search_param = '%' . $search . '%';
            for ($i = 0; $i < 14; $i++) $params[] = $search_param;
        }

        $where_sql = 'WHERE ' . implode(' AND ', $where);

        $sql = "SELECT
                    f.id, f.stav, f.firma, f.cfak, f.cdok, f.nazevfak,
                    f.typdok, f.ksymb, f.vsymb,
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
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['cobj_formatovane'] = format_vema_cislo_objednavky(isset($row['cobj']) ? $row['cobj'] : null);
        }
        unset($row);

        // pocet_objednavek / pocet_faktur / pocet_rocnich_poplatku / has_chyba_obj (beze změny, sdílené s handle_vema_faktury_list)
        bulk_calculate_vema_propojeni_counts($rows, $db);

        // ---- 2. Seskupit duplicitní VEMA řádky (stejná objednávka/smlouva + doklad) ----
        $dedupRows = vema_beta_group_faktury_for_kontrola($rows);

        // ---- 3. Aplikovat badge/varování/kontrola filtry ----
        $filteredDedupRows = array();
        foreach ($dedupRows as $dedupRow) {
            if (!vema_beta_matches_badge_filter(vema_beta_get_badge_count($dedupRow), $badgeFilter)) continue;
            if ($warningOnlyFilter && empty($dedupRow['_group_has_chyba_obj'])) continue;
            if (!empty($kontrolaFilter)) {
                $rowStatus = vema_beta_normalize_kontrola_status($dedupRow['kontrola'] ?? null);
                $matchesAny = false;
                foreach ($kontrolaFilter as $kf) {
                    if ($kf === 'varovani') {
                        if (!empty($dedupRow['_group_has_chyba_obj'])) { $matchesAny = true; break; }
                    } elseif ($rowStatus === $kf) {
                        $matchesAny = true;
                        break;
                    }
                }
                if (!$matchesAny) continue;
            }
            $filteredDedupRows[] = $dedupRow;
        }

        // ---- 4. Pro každý zbylý řádek dohledat kandidátní EEO objednávky/faktury ----
        // Dávkově (1 sada dotazů pro celý filtrovaný set) místo sekvenčního
        // volání resolve_vema_faktura_propojeni() na skupinu - viz
        // bulk_resolve_vema_faktura_propojeni v vemaPropojenHandlers.php.
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
                );
            }
        }
        $batchResults = bulk_resolve_vema_faktura_propojeni($db, array_values($invoicesFlat));

        $entries = array();
        foreach ($filteredDedupRows as $dedupRow) {
            $resolved = vema_beta_resolve_candidates_for_group($dedupRow, $batchResults);
            $entries[] = array(
                'row' => $dedupRow,
                'candidates' => $resolved['objednavky'],
                'faktury' => $resolved['faktury'],
            );
        }

        // ---- 5. Union-find - sloučit faktury sdílející kandidátní objednávku (GLOBÁLNĚ) ----
        $groups = vema_beta_build_vazebni_skupiny($entries);

        // ---- 6. Verdikty párů + klasifikace skupiny + počty podle financování ----
        $verdictCounts = array('no_candidate' => 0, 'bad' => 0, 'warn' => 0, 'fan' => 0, 'matrix' => 0, 'good' => 0);
        $financovaniCounts = array();
        foreach ($groups as &$group) {
            vema_beta_derive_group_verdicts($group);
            $category = vema_beta_classify_group($group);
            $group['verdictCategory'] = $category;
            $verdictCounts[$category] = (isset($verdictCounts[$category]) ? $verdictCounts[$category] : 0) + 1;

            // Skupina se do počtu daného typu započítá max. jednou, i když má víc
            // kandidátů se stejným TYP financování.
            $seenTypy = array();
            foreach ($group['candidates'] as $cand) {
                $typ = vema_beta_get_financovani_typ($cand);
                if ($typ === null || isset($seenTypy[$typ])) continue;
                $seenTypy[$typ] = true;
                $financovaniCounts[$typ] = (isset($financovaniCounts[$typ]) ? $financovaniCounts[$typ] : 0) + 1;
            }
        }
        unset($group);

        // ---- 7. Filtr podle vyhodnocení + financování (nemění počty výše, jen zúží výsledky) ----
        $filteredGroups = $groups;
        if ($verdictFilter !== null) {
            $filteredGroups = array_values(array_filter($filteredGroups, function ($g) use ($verdictFilter) {
                return $g['verdictCategory'] === $verdictFilter;
            }));
        }
        if (!empty($financovaniFilter)) {
            $filteredGroups = array_values(array_filter($filteredGroups, function ($g) use ($financovaniFilter) {
                return vema_beta_matches_financovani_filter($g, $financovaniFilter);
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
            $outputGroups[] = array(
                'groupId' => $group['groupId'],
                'verdictCategory' => $group['verdictCategory'],
                'invoiceRows' => array_map(function ($entry) {
                    return vema_beta_format_invoice_row($entry['row']);
                }, $group['entries']),
                'candidates' => $group['candidates'],
                'pairVerdicts' => $group['pairVerdicts'],
                'matchedFakturyByRowId' => array_reduce($group['entries'], function ($carry, $entry) {
                    $carry[$entry['row']['_group_key']] = $entry['faktury'];
                    return $carry;
                }, array()),
            );
        }

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'groups' => $outputGroups,
                'verdictCounts' => $verdictCounts,
                'financovaniCounts' => $financovaniCounts,
            ),
            'pagination' => array(
                'page' => $safePage,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $totalPages,
            ),
        ));

    } catch (Exception $e) {
        error_log('❌ VEMA BETA Grouped List Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání seskupeného pohledu: ' . $e->getMessage(),
        ));
    }
}

<?php
/**
 * VEMA Propojení Handlers - Hledání vazeb mezi VEMA a EEO
 * 
 * Endpoint pro propojení VEMA faktur s EEO záznamy (objednávky, faktury, smlouvy)
 * podle různých kritérií (číslo obj, ev.číslo smlouvy, var.symbol, VEMA kód)
 */

require_once __DIR__ . '/dbconfig.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/TimezoneHelper.php';

/**
 * Spočítá počty propojení VEMA faktury s EEO záznamy (rychlá verze jen pro counts)
 * @param array $vema_faktura Data VEMA faktury
 * @param PDO $db Databázové připojení
 * @return array ['pocet_objednavek' => int, 'pocet_faktur' => int, 'pocet_smluv' => int]
 */
function get_vema_propojeni_counts($vema_faktura, $db) {
    $counts = array(
        'pocet_objednavek' => 0,
        'pocet_faktur' => 0,
        'pocet_smluv' => 0
    );

    try {
        // 1. Počet objednávek podle čísla objednávky
        if (!empty($vema_faktura['cobj_formatovane']) || !empty($vema_faktura['cobj'])) {
            $cobj = !empty($vema_faktura['cobj_formatovane']) ? $vema_faktura['cobj_formatovane'] : $vema_faktura['cobj'];
            $cobj_pattern = $cobj . '%';
            
            $stmt = $db->prepare("SELECT COUNT(*) FROM `" . TBL_OBJEDNAVKY . "` WHERE cislo_objednavky LIKE ? AND stav_objednavky NOT IN ('Zrušena', 'Zamítnutá', 'Odloženo')");
            $stmt->execute(array($cobj_pattern));
            $counts['pocet_objednavek'] = (int)$stmt->fetchColumn();
        }

        // 2. Počet smluv podle evidenčního čísla
        if (!empty($vema_faktura['smlouva_ecsml'])) {
            $stmt = $db->prepare("SELECT COUNT(*) FROM `" . TBL_SMLOUVY . "` WHERE cislo_smlouvy = ? AND stav = 'AKTIVNI' AND aktivni = 1");
            $stmt->execute(array($vema_faktura['smlouva_ecsml']));
            $counts['pocet_smluv'] = (int)$stmt->fetchColumn();
        }

        // 3. Počet faktur - stejná priorita jako detail:
        //    1) exact VS + fa_vema_kod
        //    2) fallback VS (jen bez fa_vema_kod)
        //    3) cdok-only pokud VS chybí
        $faktur_count = 0;
        $vsymb = !empty($vema_faktura['vsymb']) ? trim((string)$vema_faktura['vsymb']) : '';
        $cdok = !empty($vema_faktura['cdok']) ? trim((string)$vema_faktura['cdok']) : '';
        $vema_castka = !empty($vema_faktura['celkem']) ? floatval($vema_faktura['celkem']) : null;

        if ($vsymb !== '' && $cdok !== '') {
            if ($vema_castka !== null) {
                $stmt = $db->prepare("SELECT COUNT(DISTINCT id) FROM `" . TBL_FAKTURY . "`
                                     WHERE fa_cislo_vema = ?
                                       AND TRIM(COALESCE(fa_vema_kod, '')) = ?
                                       AND ABS(fa_castka - ?) < 0.01
                                       AND stav != 'STORNO'");
                $stmt->execute(array($vsymb, $cdok, $vema_castka));
            } else {
                $stmt = $db->prepare("SELECT COUNT(DISTINCT id) FROM `" . TBL_FAKTURY . "`
                                     WHERE fa_cislo_vema = ?
                                       AND TRIM(COALESCE(fa_vema_kod, '')) = ?
                                       AND stav != 'STORNO'");
                $stmt->execute(array($vsymb, $cdok));
            }
            $exact_count = (int)$stmt->fetchColumn();

            if ($exact_count > 0) {
                $faktur_count = $exact_count;
            } else {
                $stmt_paid = $db->prepare("SELECT COUNT(*) FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
                                          INNER JOIN `" . TBL_ROCNI_POPLATKY . "` rp ON rpp.rocni_poplatek_id = rp.id
                                          WHERE rpp.aktivni = 1
                                            AND rp.aktivni = 1
                                            AND TRIM(rpp.cislo_dokladu) = ?
                                            AND (
                                                rpp.stav = 'ZAPLACENO'
                                                OR rpp.datum_zaplaceno IS NOT NULL
                                            )");
                $stmt_paid->execute(array($cdok));
                $has_paid_rp = ((int)$stmt_paid->fetchColumn() > 0);

                if ($has_paid_rp) {
                    if ($vema_castka !== null) {
                        $stmt = $db->prepare("SELECT COUNT(DISTINCT id) FROM `" . TBL_FAKTURY . "`
                                             WHERE fa_cislo_vema = ?
                                               AND (fa_vema_kod IS NULL OR TRIM(fa_vema_kod) = '')
                                               AND ABS(fa_castka - ?) < 0.01
                                               AND stav != 'STORNO'");
                        $stmt->execute(array($vsymb, $vema_castka));
                    } else {
                        $stmt = $db->prepare("SELECT COUNT(DISTINCT id) FROM `" . TBL_FAKTURY . "`
                                             WHERE fa_cislo_vema = ?
                                               AND (fa_vema_kod IS NULL OR TRIM(fa_vema_kod) = '')
                                               AND stav != 'STORNO'");
                        $stmt->execute(array($vsymb));
                    }
                    $faktur_count = (int)$stmt->fetchColumn();
                } else {
                    $faktur_count = 0;
                }
            }
        } elseif ($vsymb !== '') {
            if ($vema_castka !== null) {
                $stmt = $db->prepare("SELECT COUNT(DISTINCT id) FROM `" . TBL_FAKTURY . "`
                                     WHERE fa_cislo_vema = ?
                                       AND ABS(fa_castka - ?) < 0.01
                                       AND stav != 'STORNO'");
                $stmt->execute(array($vsymb, $vema_castka));
            } else {
                $stmt = $db->prepare("SELECT COUNT(DISTINCT id) FROM `" . TBL_FAKTURY . "`
                                     WHERE fa_cislo_vema = ?
                                       AND stav != 'STORNO'");
                $stmt->execute(array($vsymb));
            }
            $faktur_count = (int)$stmt->fetchColumn();
        } elseif ($cdok !== '') {
            if ($vema_castka !== null) {
                $stmt = $db->prepare("SELECT COUNT(DISTINCT id) FROM `" . TBL_FAKTURY . "`
                                     WHERE fa_vema_kod = ?
                                       AND ABS(fa_castka - ?) < 0.01
                                       AND stav != 'STORNO'");
                $stmt->execute(array($cdok, $vema_castka));
            } else {
                $stmt = $db->prepare("SELECT COUNT(DISTINCT id) FROM `" . TBL_FAKTURY . "`
                                     WHERE fa_vema_kod = ?
                                       AND stav != 'STORNO'");
                $stmt->execute(array($cdok));
            }
            $faktur_count = (int)$stmt->fetchColumn();
        }

        $counts['pocet_faktur'] = $faktur_count;

    } catch (Exception $e) {
        error_log("⚠️ Chyba při počítání propojení: " . $e->getMessage());
    }

    return $counts;
}

/**
 * BULK verze: Spočítá propojení pro VŠECHNY VEMA faktury najednou (4 dotazy celkem)
 * Místo 4*N dotazů (po jedné fakturě) pouze 4 dotazy s IN/OR podmínkami
 * 
 * @param array $vema_faktury Pole VEMA faktur (reference, modifikuje přímo)
 * @param PDO $db Databázové připojení
 */
function bulk_calculate_vema_propojeni_counts(&$vema_faktury, $db) {
    if (empty($vema_faktury)) return;

    // Inicializace counts pro všechny faktury
    foreach ($vema_faktury as &$f) {
        $f['pocet_objednavek'] = 0;
        $f['pocet_faktur'] = 0;
        $f['pocet_smluv'] = 0;
        $f['pocet_rocnich_poplatku'] = 0;
    }
    unset($f);

    try {
        // ===== 1. OBJEDNÁVKY (LIKE pattern s prefix matching) =====
        // Posbírat unikátní cobj_formatovane (prefixy)
        $cobj_map = array(); // 'O-1234/75030926/2026' => [index1, index2, ...]
        foreach ($vema_faktury as $i => $f) {
            $cobj = !empty($f['cobj_formatovane']) ? $f['cobj_formatovane'] : (!empty($f['cobj']) ? $f['cobj'] : null);
            if ($cobj) {
                if (!isset($cobj_map[$cobj])) $cobj_map[$cobj] = array();
                $cobj_map[$cobj][] = $i;
            }
        }

        if (!empty($cobj_map)) {
            // 1 dotaz: SELECT cislo_objednavky WHERE cislo_objednavky LIKE prefix1% OR LIKE prefix2% ...
            $unique_cobjs = array_keys($cobj_map);
            $like_parts = array();
            $params = array();
            foreach ($unique_cobjs as $cobj) {
                $like_parts[] = "cislo_objednavky LIKE ?";
                $params[] = $cobj . '%';
            }
            $sql = "SELECT cislo_objednavky FROM `" . TBL_OBJEDNAVKY . "` 
                    WHERE (" . implode(' OR ', $like_parts) . ")
                    AND stav_objednavky NOT IN ('Zrušena', 'Zamítnutá', 'Odloženo')";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $eeo_obj_rows = $stmt->fetchAll(PDO::FETCH_COLUMN);

            // Spočítat: pro každý cobj prefix kolik EEO obj odpovídá
            $cobj_counts = array();
            foreach ($eeo_obj_rows as $eeo_cislo) {
                foreach ($unique_cobjs as $prefix) {
                    if (strpos($eeo_cislo, $prefix) === 0) {
                        if (!isset($cobj_counts[$prefix])) $cobj_counts[$prefix] = 0;
                        $cobj_counts[$prefix]++;
                        break;
                    }
                }
            }

            // Přiřadit counts do faktur
            foreach ($cobj_counts as $prefix => $count) {
                foreach ($cobj_map[$prefix] as $idx) {
                    $vema_faktury[$idx]['pocet_objednavek'] = $count;
                }
            }
        }

        // ===== 2. SMLOUVY (rovnost na cislo_smlouvy) =====
        $smlouva_map = array(); // 'ecsml' => [index1, index2, ...]
        foreach ($vema_faktury as $i => $f) {
            if (!empty($f['smlouva_ecsml'])) {
                if (!isset($smlouva_map[$f['smlouva_ecsml']])) $smlouva_map[$f['smlouva_ecsml']] = array();
                $smlouva_map[$f['smlouva_ecsml']][] = $i;
            }
        }

        if (!empty($smlouva_map)) {
            $unique_smluv = array_keys($smlouva_map);
            $placeholders = implode(',', array_fill(0, count($unique_smluv), '?'));
            $sql = "SELECT cislo_smlouvy, COUNT(*) as cnt FROM `" . TBL_SMLOUVY . "` 
                    WHERE cislo_smlouvy IN ($placeholders) 
                    AND stav = 'AKTIVNI' AND aktivni = 1
                    GROUP BY cislo_smlouvy";
            $stmt = $db->prepare($sql);
            $stmt->execute($unique_smluv);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($rows as $row) {
                if (isset($smlouva_map[$row['cislo_smlouvy']])) {
                    foreach ($smlouva_map[$row['cislo_smlouvy']] as $idx) {
                        $vema_faktury[$idx]['pocet_smluv'] = (int)$row['cnt'];
                    }
                }
            }
        }

        // ===== 2b. ROČNÍ POPLATKY podle čísla dokladu (cdok => cislo_dokladu) =====
        // Potřebné pro badge i pro řízení fallbacku VS (jen pokud existuje zaplacený RP).
        $cdok_rp_map = array(); // 'cdok' => [idx1, idx2]
        foreach ($vema_faktury as $i => $f) {
            $cdok = isset($f['cdok']) ? trim((string)$f['cdok']) : '';
            if ($cdok !== '') {
                if (!isset($cdok_rp_map[$cdok])) $cdok_rp_map[$cdok] = array();
                $cdok_rp_map[$cdok][] = $i;
            }
        }

        $cdok_has_paid_rp = array(); // 'cdok' => bool
        $cdok_rp_faktura_ids = array(); // 'cdok' => [faktura_id => true]
        $cdok_rp_castky = array(); // 'cdok' => [castka1, castka2, ...]
        $cdok_rp_splatnosti = array(); // 'cdok' => [datum1, datum2, ...]
        if (!empty($cdok_rp_map)) {
            $unique_cdok = array_keys($cdok_rp_map);
            $placeholders = implode(',', array_fill(0, count($unique_cdok), '?'));

            $sql_rp = "SELECT
                            TRIM(rpp.cislo_dokladu) as cislo_dokladu,
                            COUNT(*) as cnt,
                            MAX(CASE WHEN (rpp.stav = 'ZAPLACENO' OR rpp.datum_zaplaceno IS NOT NULL) THEN 1 ELSE 0 END) as has_paid
                       FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
                       INNER JOIN `" . TBL_ROCNI_POPLATKY . "` rp ON rpp.rocni_poplatek_id = rp.id
                       WHERE rpp.aktivni = 1
                         AND rp.aktivni = 1
                         AND TRIM(rpp.cislo_dokladu) IN ($placeholders)
                       GROUP BY TRIM(rpp.cislo_dokladu)";

            $stmt_rp = $db->prepare($sql_rp);
            $stmt_rp->execute($unique_cdok);
            $rows_rp = $stmt_rp->fetchAll(PDO::FETCH_ASSOC);

            foreach ($rows_rp as $row) {
                $key = trim((string)$row['cislo_dokladu']);
                $count = (int)$row['cnt'];
                $has_paid = ((int)$row['has_paid'] === 1);

                $cdok_has_paid_rp[$key] = $has_paid;

                if (isset($cdok_rp_map[$key])) {
                    foreach ($cdok_rp_map[$key] as $idx) {
                        $vema_faktury[$idx]['pocet_rocnich_poplatku'] = $count;
                    }
                }
            }

            // Detailní RP kontext pro přesný fallback VS (stejná logika jako detail endpoint)
            $sql_rp_detail = "SELECT
                                  TRIM(rpp.cislo_dokladu) as cislo_dokladu,
                                  rpp.faktura_id,
                                  rpp.castka,
                                  rpp.datum_splatnosti
                              FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
                              INNER JOIN `" . TBL_ROCNI_POPLATKY . "` rp ON rpp.rocni_poplatek_id = rp.id
                              WHERE rpp.aktivni = 1
                                AND rp.aktivni = 1
                                AND TRIM(rpp.cislo_dokladu) IN ($placeholders)";

            $stmt_rp_detail = $db->prepare($sql_rp_detail);
            $stmt_rp_detail->execute($unique_cdok);
            $rows_rp_detail = $stmt_rp_detail->fetchAll(PDO::FETCH_ASSOC);

            foreach ($rows_rp_detail as $row) {
                $cdok_key = trim((string)$row['cislo_dokladu']);
                if ($cdok_key === '') continue;

                if (!isset($cdok_rp_faktura_ids[$cdok_key])) $cdok_rp_faktura_ids[$cdok_key] = array();
                if (!isset($cdok_rp_castky[$cdok_key])) $cdok_rp_castky[$cdok_key] = array();
                if (!isset($cdok_rp_splatnosti[$cdok_key])) $cdok_rp_splatnosti[$cdok_key] = array();

                if (!empty($row['faktura_id'])) {
                    $fid = (int)$row['faktura_id'];
                    if ($fid > 0) {
                        $cdok_rp_faktura_ids[$cdok_key][$fid] = true;
                    }
                }

                if ($row['castka'] !== null && $row['castka'] !== '') {
                    $cdok_rp_castky[$cdok_key][] = floatval($row['castka']);
                }

                if (!empty($row['datum_splatnosti'])) {
                    $cdok_rp_splatnosti[$cdok_key][] = $row['datum_splatnosti'];
                }
            }
        }

        // ===== 3. FAKTURY podle vsymb (priorita: exact VS+cdok, pak fallback bez fa_vema_kod) =====
        $vsymb_map = array();
        foreach ($vema_faktury as $i => $f) {
            if (!empty($f['vsymb'])) {
                if (!isset($vsymb_map[$f['vsymb']])) $vsymb_map[$f['vsymb']] = array();
                $vsymb_map[$f['vsymb']][] = $i;
            }
        }

        if (!empty($vsymb_map)) {
            $unique_vsymb = array_keys($vsymb_map);
            $placeholders = implode(',', array_fill(0, count($unique_vsymb), '?'));
            // OPTIMALIZACE: používá idx_fa_vema_castka_stav (composite index)
                $sql = "SELECT id, fa_cislo_vema, fa_vema_kod, fa_castka, fa_datum_splatnosti FROM `" . TBL_FAKTURY . "` 
                    WHERE fa_cislo_vema IN ($placeholders) 
                    AND stav != 'STORNO'";
            $stmt = $db->prepare($sql);
            $stmt->execute($unique_vsymb);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Index kandidátů podle VS
            $kandidati_vsymb = array();
            foreach ($rows as $row) {
                $k = isset($row['fa_cislo_vema']) ? (string)$row['fa_cislo_vema'] : '';
                if ($k === '') continue;
                if (!isset($kandidati_vsymb[$k])) $kandidati_vsymb[$k] = array();
                $kandidati_vsymb[$k][] = $row;
            }

            // Pro každou VEMA fakturu aplikovat stejnou prioritu jako v detailu
            foreach ($vsymb_map as $vsymb => $idx_list) {
                if (!isset($kandidati_vsymb[$vsymb])) continue;

                foreach ($idx_list as $idx) {
                    $vema_castka = !empty($vema_faktury[$idx]['celkem']) ? floatval($vema_faktury[$idx]['celkem']) : null;
                    $cdok = !empty($vema_faktury[$idx]['cdok']) ? trim((string)$vema_faktury[$idx]['cdok']) : '';
                    $allow_fallback_for_cdok = ($cdok === '' || (!empty($cdok_has_paid_rp[$cdok]) && $cdok_has_paid_rp[$cdok] === true));
                    $rp_id_map = ($cdok !== '' && !empty($cdok_rp_faktura_ids[$cdok])) ? $cdok_rp_faktura_ids[$cdok] : array();
                    $rp_castky = ($cdok !== '' && !empty($cdok_rp_castky[$cdok])) ? $cdok_rp_castky[$cdok] : array();
                    $rp_splatnosti = ($cdok !== '' && !empty($cdok_rp_splatnosti[$cdok])) ? $cdok_rp_splatnosti[$cdok] : array();

                    $exact_ids = array();
                    $fallback_ids = array();

                    foreach ($kandidati_vsymb[$vsymb] as $row) {
                        $row_id = isset($row['id']) ? (int)$row['id'] : 0;
                        if ($row_id <= 0) continue;

                        if ($vema_castka !== null) {
                            $eeo_castka = isset($row['fa_castka']) ? floatval($row['fa_castka']) : null;
                            if ($eeo_castka === null || abs($eeo_castka - $vema_castka) >= 0.01) {
                                continue;
                            }
                        }

                        $fa_vema_kod = isset($row['fa_vema_kod']) ? trim((string)$row['fa_vema_kod']) : '';
                        $je_v_rp_vazbe = (!empty($rp_id_map[$row_id]));

                        if ($cdok !== '') {
                            if ($fa_vema_kod === $cdok) {
                                $exact_ids[$row_id] = true;
                            } elseif ($fa_vema_kod === '' && $allow_fallback_for_cdok) {
                                // Stejná detail logika pro staré faktury bez fa_vema_kod:
                                // 1) pokud je faktura přímo navázaná v RP položce, bereme ji,
                                // 2) jinak musí sedět RP částka + blízká splatnost.
                                if ($je_v_rp_vazbe) {
                                    $fallback_ids[$row_id] = true;
                                    continue;
                                }

                                $castka_ok = false;
                                if (!empty($rp_castky) && isset($row['fa_castka']) && $row['fa_castka'] !== null && $row['fa_castka'] !== '') {
                                    $fa_castka = floatval($row['fa_castka']);
                                    foreach ($rp_castky as $rp_castka) {
                                        if (abs($fa_castka - $rp_castka) < 0.01) {
                                            $castka_ok = true;
                                            break;
                                        }
                                    }
                                }

                                $datum_ok = false;
                                if (!empty($rp_splatnosti) && !empty($row['fa_datum_splatnosti'])) {
                                    $fa_ts = strtotime($row['fa_datum_splatnosti']);
                                    if ($fa_ts !== false) {
                                        foreach ($rp_splatnosti as $rp_splatnost) {
                                            $rp_ts = strtotime($rp_splatnost);
                                            if ($rp_ts !== false && abs($fa_ts - $rp_ts) <= (35 * 86400)) {
                                                $datum_ok = true;
                                                break;
                                            }
                                        }
                                    }
                                }

                                if ($castka_ok && $datum_ok) {
                                    $fallback_ids[$row_id] = true;
                                }
                            }
                        } elseif ($allow_fallback_for_cdok) {
                            $fallback_ids[$row_id] = true;
                        }
                    }

                    if ($cdok !== '' && count($exact_ids) > 0) {
                        $vema_faktury[$idx]['pocet_faktur'] += count($exact_ids);
                    } else {
                        $vema_faktury[$idx]['pocet_faktur'] += count($fallback_ids);
                    }
                }
            }
        }

        // ===== 4. FAKTURY podle cdok (fa_vema_kod) jen pokud faktura nemá VS =====
        $cdok_map = array();
        foreach ($vema_faktury as $i => $f) {
            if (!empty($f['cdok']) && empty($f['vsymb'])) {
                if (!isset($cdok_map[$f['cdok']])) $cdok_map[$f['cdok']] = array();
                $cdok_map[$f['cdok']][] = $i;
            }
        }

        if (!empty($cdok_map)) {
            $unique_cdok = array_keys($cdok_map);
            $placeholders = implode(',', array_fill(0, count($unique_cdok), '?'));
            // Vytáhnout všechny faktury s daným VEMA kódem (neagregovat - potřebujeme částku)
            $sql = "SELECT fa_vema_kod, fa_castka FROM `" . TBL_FAKTURY . "` 
                    WHERE fa_vema_kod IN ($placeholders) 
                    AND stav != 'STORNO'";
            $stmt = $db->prepare($sql);
            $stmt->execute($unique_cdok);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Post-processing: matchovat cdok + částka
            foreach ($rows as $row) {
                $cdok = $row['fa_vema_kod'];
                $eeo_castka = floatval($row['fa_castka']);
                
                if (isset($cdok_map[$cdok])) {
                    foreach ($cdok_map[$cdok] as $idx) {
                        $vema_castka = !empty($vema_faktury[$idx]['celkem']) ? floatval($vema_faktury[$idx]['celkem']) : 0;
                        // Match pouze pokud částka sedí (tolerance 0.01 Kč)
                        if (abs($eeo_castka - $vema_castka) < 0.01) {
                            $vema_faktury[$idx]['pocet_faktur'] += 1;
                        }
                    }
                }
            }
        }

    } catch (Exception $e) {
        error_log("⚠️ Chyba při bulk počítání propojení: " . $e->getMessage());
    }
}

/**
 * Najde EEO záznamy propojené s VEMA fakturou
 * POST /vema-faktury/propojeni-eeo
 * 
 * Parametry:
 * - token (string, required)
 * - username (string, required)
 * - vema_faktura (object, required) - data VEMA faktury {cfak, cobj, csml, vsymb, cdok, smlouva_ecsml}
 * 
 * Algoritmus hledání (podle priority):
 * 1. Č. objednávky - formát O-xxxx/75030926/2026 → EEO O-xxxx/75030926/2026/usek
 * 2. Ev.číslo smlouvy - smlouva_ecsml → EEO 25_smlouvy.cislo_smlouvy
 * 3. Variabilní symbol - vsymb → EEO 25a_objednavky_faktury (hledat v různých polích)
 * 4. VEMA kód - cdok → EEO 25a_objednavky_faktury.fa_vema_kod
 * 
 * Response: {
 *   status: 'success',
 *   data: {
 *     objednavky: [...],
 *     faktury: [...],
 *     smlouvy: [...],
 *     celkem: 10
 *   }
 * }
 */
function handle_vema_faktury_propojeni_eeo($input, $config) {
    error_log("🔍 VEMA Propojení - start handleru");
    
    // Validace metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        error_log("❌ VEMA Propojení - špatná metoda: " . $_SERVER['REQUEST_METHOD']);
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // Autentizace
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';

    error_log("🔍 VEMA Propojení - token: " . ($token ? 'OK' : 'MISSING') . ", username: $username");

    if (!$token || !$username) {
        error_log("❌ VEMA Propojení - chybí credentials");
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    try {
        $token_data = verify_token($token);
        if (!$token_data) {
            error_log("❌ VEMA Propojení - neplatný token");
            http_response_code(401);
            echo json_encode(array('status' => 'error', 'message' => 'Neplatný nebo chybějící token'));
            return;
        }

        if ($token_data['username'] !== $username) {
            error_log("❌ VEMA Propojení - username mismatch");
            http_response_code(401);
            echo json_encode(array('status' => 'error', 'message' => 'Uživatelské jméno neodpovídá tokenu'));
            return;
        }

            // Kontrola oprávnění VEMA_VIEW
        if (!has_permission($token_data['id'], 'VEMA_VIEW')) {
            error_log("❌ VEMA Propojení - nemá oprávnění");
            http_response_code(403);
            echo json_encode(array('status' => 'error', 'message' => 'Nemáte oprávnění k zobrazení Deníku VEMA'));
            return;
        }

        error_log("✅ VEMA Propojení - autentizace OK");

    } catch (Exception $e) {
        error_log("❌ VEMA Propojení - chyba autentizace: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba autentizace: ' . $e->getMessage()));
        return;
    }

    // Data VEMA faktury
    $vema_faktura = isset($input['vema_faktura']) ? $input['vema_faktura'] : array();
    
    error_log("🔍 VEMA Propojení - vema_faktura: " . json_encode($vema_faktura));
    
    if (empty($vema_faktura)) {
        error_log("❌ VEMA Propojení - prázdná data");
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí data VEMA faktury'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }

        TimezoneHelper::setMysqlTimezone($db);

        // Výsledky
        $objednavky = array();
        $faktury = array();
        $smlouvy = array();
        $rocni_poplatky = array();
        $exact_vs_cdok_found = false;
        $has_paid_rp = false;
        $vema_cdok_trim = !empty($vema_faktura['cdok']) ? trim((string)$vema_faktura['cdok']) : '';
        $rp_faktura_ids = array();
        $rp_castky = array();
        $rp_splatnosti = array();

        // ==================================================================
        // 1. PRIORITA: Hledat podle čísla objednávky
        // ==================================================================
        if (!empty($vema_faktura['cobj_formatovane']) || !empty($vema_faktura['cobj'])) {
            $cobj = !empty($vema_faktura['cobj_formatovane']) ? $vema_faktura['cobj_formatovane'] : $vema_faktura['cobj'];
            
            // VEMA má: O-1234/75030926/2026
            // EEO má: O-1234/75030926/2026/PTN (+ úsek na konci)
            // Hledat pomocí LIKE s wildcardou na konci
            $cobj_pattern = $cobj . '%';
            
            $sql = "SELECT 
                        o.id, 
                        o.cislo_objednavky,
                        o.predmet as nazev,
                        o.dt_objednavky,
                        o.max_cena_s_dph as castka_max,
                        (SELECT SUM(pol.cena_s_dph) FROM `" . TBL_OBJEDNAVKY . "_polozky` pol WHERE pol.objednavka_id = o.id) as castka_detail,
                        o.stav_objednavky as stav,
                        o.dodavatel_nazev as dodavatel,
                        o.druh_objednavky_kod,
                        o.financovani,
                        u.jmeno as zadavatel_jmeno,
                        u.prijmeni as zadavatel_prijmeni,
                        (SELECT COUNT(*) FROM `" . TBL_FAKTURY . "` f WHERE f.objednavka_id = o.id AND f.stav != 'STORNO') as pocet_faktur,
                        (SELECT SUM(f.fa_castka) FROM `" . TBL_FAKTURY . "` f WHERE f.objednavka_id = o.id AND f.stav != 'STORNO') as zaplaceno,
                        'objednavka' as typ_zaznamu
                    FROM `" . TBL_OBJEDNAVKY . "` o
                    LEFT JOIN `" . TBL_UZIVATELE . "` u ON o.uzivatel_id = u.id
                    WHERE o.cislo_objednavky LIKE ?
                      AND o.stav_objednavky NOT IN ('Zrušena', 'Zamítnutá', 'Odloženo')
                    LIMIT 50";
            
            $stmt = $db->prepare($sql);
            $stmt->execute(array($cobj_pattern));
            $objednavky = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // ==================================================================
        // 2. PRIORITA: Hledat podle evidenčního čísla smlouvy
        // ==================================================================
        if (!empty($vema_faktura['smlouva_ecsml'])) {
            $ecsml = $vema_faktura['smlouva_ecsml'];
            
            $sql = "SELECT 
                        s.id,
                        s.cislo_smlouvy,
                        s.nazev_smlouvy,
                        s.platnost_od,
                        s.platnost_do,
                        s.hodnota_s_dph as castka,
                        s.stav,
                        s.druh_smlouvy as typ_smlouvy,
                        s.nazev_firmy as dodavatel,
                        'smlouva' as typ_zaznamu
                    FROM `" . TBL_SMLOUVY . "` s
                    WHERE s.cislo_smlouvy = ?
                      AND s.stav = 'AKTIVNI'
                      AND s.aktivni = 1
                    LIMIT 10";
            
            $stmt = $db->prepare($sql);
            $stmt->execute(array($ecsml));
            $smlouvy = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Roční poplatky zde už nevážeme přes smlouvu, ale přes číslo dokladu (cdok).
        }

        // ==================================================================
        // 2b. ROČNÍ POPLATKY: vazba přes číslo dokladu (VEMA cdok = RP položka cislo_dokladu)
        // ==================================================================
        if (!empty($vema_faktura['cdok'])) {
            $cdok = trim((string)$vema_faktura['cdok']);
            if ($cdok !== '') {
                $sql_rp = "SELECT
                                rpp.id,
                                rpp.faktura_id,
                                rpp.stav as rp_stav,
                                TRIM(rpp.cislo_dokladu) as cislo_dokladu,
                                rp.druh,
                                rp.platba,
                                cs_druh.nazev_stavu as druh_nazev,
                                cs_platba.nazev_stavu as platba_nazev,
                                COALESCE(NULLIF(TRIM(rpp.nazev_polozky), ''), NULLIF(TRIM(rpp.poznamka), ''), NULLIF(TRIM(rp.nazev), '')) as poznamka,
                                rpp.datum_splatnosti,
                                rpp.castka,
                                rpp.datum_zaplaceno,
                                'rocni_poplatek_doklad' as typ_zaznamu
                            FROM `" . TBL_ROCNI_POPLATKY_POLOZKY . "` rpp
                            INNER JOIN `" . TBL_ROCNI_POPLATKY . "` rp ON rpp.rocni_poplatek_id = rp.id
                            LEFT JOIN `" . TBL_CISELNIK_STAVY . "` cs_druh
                                ON rp.druh = cs_druh.kod_stavu
                               AND cs_druh.typ_objektu = 'DRUH_ROCNIHO_POPLATKU'
                               AND cs_druh.aktivni = 1
                            LEFT JOIN `" . TBL_CISELNIK_STAVY . "` cs_platba
                                ON rp.platba = cs_platba.kod_stavu
                               AND cs_platba.typ_objektu = 'PLATBA_ROCNIHO_POPLATKU'
                               AND cs_platba.aktivni = 1
                            WHERE rpp.aktivni = 1
                              AND rp.aktivni = 1
                              AND TRIM(rpp.cislo_dokladu) = ?
                            ORDER BY rpp.datum_splatnosti DESC, rpp.id DESC
                            LIMIT 200";

                $stmt_rp = $db->prepare($sql_rp);
                $stmt_rp->execute(array($cdok));
                $rocni_poplatky = $stmt_rp->fetchAll(PDO::FETCH_ASSOC);

                foreach ($rocni_poplatky as $rp) {
                    if (!empty($rp['faktura_id'])) {
                        $rp_faktura_ids[] = (int)$rp['faktura_id'];
                    }
                    if ($rp['castka'] !== null && $rp['castka'] !== '') {
                        $rp_castky[] = floatval($rp['castka']);
                    }
                    if (!empty($rp['datum_splatnosti'])) {
                        $rp_splatnosti[] = $rp['datum_splatnosti'];
                    }
                    $rp_stav = isset($rp['rp_stav']) ? strtoupper(trim((string)$rp['rp_stav'])) : '';
                    if ($rp_stav === 'ZAPLACENO' || !empty($rp['datum_zaplaceno'])) {
                        $has_paid_rp = true;
                    }
                }

                $rp_faktura_ids = array_values(array_unique(array_filter($rp_faktura_ids, function ($id) {
                    return $id > 0;
                })));

                error_log("🔍 VEMA Propojení - nalezeno " . count($rocni_poplatky) . " ročních poplatků pro cdok=" . $cdok);
            }
        }

        // ==================================================================
        // 2c. PRIORITA: Přesná vazba faktury podle VS + číslo dokladu (fa_vema_kod)
        // ==================================================================
        if (!empty($vema_faktura['vsymb']) && !empty($vema_faktura['cdok'])) {
            $vsymb = trim((string)$vema_faktura['vsymb']);
            $cdok = trim((string)$vema_faktura['cdok']);
            $vema_castka = !empty($vema_faktura['celkem']) ? floatval($vema_faktura['celkem']) : null;

            if ($vsymb !== '' && $cdok !== '') {
                if ($vema_castka !== null) {
                    $sql_exact = "SELECT
                                    f.id,
                                    f.fa_cislo_vema as cislo_faktury,
                                    f.fa_vema_kod,
                                    f.fa_datum_vystaveni as datum_vystaveni,
                                    f.fa_datum_splatnosti as datum_splatnosti,
                                    f.fa_castka as castka,
                                    f.stav,
                                    o.cislo_objednavky,
                                    o.dodavatel_nazev as dodavatel,
                                    'faktura' as typ_zaznamu
                                FROM `" . TBL_FAKTURY . "` f
                                LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
                                WHERE f.fa_cislo_vema = ?
                                  AND TRIM(COALESCE(f.fa_vema_kod, '')) = ?
                                  AND ABS(f.fa_castka - ?) < 0.01
                                  AND f.stav != 'STORNO'
                                LIMIT 50";

                    $stmt_exact = $db->prepare($sql_exact);
                    $stmt_exact->execute(array($vsymb, $cdok, $vema_castka));
                } else {
                    $sql_exact = "SELECT
                                    f.id,
                                    f.fa_cislo_vema as cislo_faktury,
                                    f.fa_vema_kod,
                                    f.fa_datum_vystaveni as datum_vystaveni,
                                    f.fa_datum_splatnosti as datum_splatnosti,
                                    f.fa_castka as castka,
                                    f.stav,
                                    o.cislo_objednavky,
                                    o.dodavatel_nazev as dodavatel,
                                    'faktura' as typ_zaznamu
                                FROM `" . TBL_FAKTURY . "` f
                                LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
                                WHERE f.fa_cislo_vema = ?
                                  AND TRIM(COALESCE(f.fa_vema_kod, '')) = ?
                                  AND f.stav != 'STORNO'
                                LIMIT 50";

                    $stmt_exact = $db->prepare($sql_exact);
                    $stmt_exact->execute(array($vsymb, $cdok));
                }

                $faktury_exact = $stmt_exact->fetchAll(PDO::FETCH_ASSOC);
                $faktury = array_merge($faktury, $faktury_exact);
                $exact_vs_cdok_found = !empty($faktury_exact);
                error_log("🔍 VEMA Propojení - přesná vazba VS+cdok: nalezeno " . count($faktury_exact));
            }
        }

        // ==================================================================
        // 3. PRIORITA: Hledat podle variabilního symbolu + částka
        // OPTIMALIZACE: odstraněn LIKE '%vsymb%' v rozsirujici_data
        // (rozsirujici_data zatím nikdy neobsahuje var.symbol => 0 výsledků, full scan)
        // ==================================================================
        if (!empty($vema_faktura['vsymb']) && !$exact_vs_cdok_found && ($vema_cdok_trim === '' || $has_paid_rp)) {
            $vsymb = $vema_faktura['vsymb'];
            $vema_castka = !empty($vema_faktura['celkem']) ? floatval($vema_faktura['celkem']) : null;
            $has_rp_context = !empty($rocni_poplatky) && !empty($vema_faktura['cdok']);
            $cdok_trim = !empty($vema_faktura['cdok']) ? trim((string)$vema_faktura['cdok']) : '';
            
            // Hledat faktury se stejným var. symbolem + částkou (tolerance 0.01 Kč)
            if ($vema_castka !== null) {
                $sql = "SELECT 
                            f.id,
                            f.fa_cislo_vema as cislo_faktury,
                            f.fa_vema_kod,
                            f.fa_datum_vystaveni as datum_vystaveni,
                            f.fa_datum_splatnosti as datum_splatnosti,
                            f.fa_castka as castka,
                            f.stav,
                            o.cislo_objednavky,
                            o.dodavatel_nazev as dodavatel,
                            'faktura' as typ_zaznamu
                        FROM `" . TBL_FAKTURY . "` f
                        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
                        WHERE f.fa_cislo_vema = ?
                          AND ABS(f.fa_castka - ?) < 0.01
                                                    AND (
                                                                ? = ''
                                                                OR f.fa_vema_kod IS NULL
                                                                OR TRIM(f.fa_vema_kod) = ''
                                                            )
                          AND f.stav != 'STORNO'
                        LIMIT 50";
                
                $stmt = $db->prepare($sql);
                                $stmt->execute(array($vsymb, $vema_castka, $cdok_trim));
                $faktury_vsymb = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Pokud máme roční poplatky, zpřísníme fallback přes VS, aby se netahaly všechny kvartální faktury.
                if ($has_rp_context) {
                    $rp_faktura_id_map = array_flip($rp_faktura_ids);
                    $filtrovane = array();

                    foreach ($faktury_vsymb as $row) {
                        $faktura_id = isset($row['id']) ? (int)$row['id'] : 0;
                        $ma_cdok = ($cdok_trim !== '' && isset($row['fa_vema_kod']) && trim((string)$row['fa_vema_kod']) === $cdok_trim);
                        $je_v_rp_vazbe = ($faktura_id > 0 && isset($rp_faktura_id_map[$faktura_id]));

                        if ($ma_cdok || $je_v_rp_vazbe) {
                            $filtrovane[] = $row;
                            continue;
                        }

                        // Starší faktury bez fa_vema_kod: povol jen pokud sedí RP částka a splatnost je blízko RP splatnosti.
                        $castka_ok = false;
                        if (!empty($rp_castky) && isset($row['castka']) && $row['castka'] !== null && $row['castka'] !== '') {
                            $fa_castka = floatval($row['castka']);
                            foreach ($rp_castky as $rp_castka) {
                                if (abs($fa_castka - $rp_castka) < 0.01) {
                                    $castka_ok = true;
                                    break;
                                }
                            }
                        }

                        $datum_ok = false;
                        if (!empty($rp_splatnosti) && !empty($row['datum_splatnosti'])) {
                            $fa_ts = strtotime($row['datum_splatnosti']);
                            if ($fa_ts !== false) {
                                foreach ($rp_splatnosti as $rp_splatnost) {
                                    $rp_ts = strtotime($rp_splatnost);
                                    if ($rp_ts !== false && abs($fa_ts - $rp_ts) <= (35 * 86400)) {
                                        $datum_ok = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if ($castka_ok && $datum_ok) {
                            $filtrovane[] = $row;
                        }
                    }

                    $faktury_vsymb = $filtrovane;
                    error_log("🔍 VEMA Propojení - VS fallback filtrován v RP kontextu: " . count($faktury_vsymb) . " faktur");
                }

                $faktury = array_merge($faktury, $faktury_vsymb);
                
                error_log("🔍 VEMA Propojení - hledání podle vsymb=$vsymb + částka=$vema_castka: nalezeno " . count($faktury_vsymb));
            } else {
                // Fallback bez částky (pokud VEMA faktura nemá částku)
                $sql = "SELECT 
                            f.id,
                            f.fa_cislo_vema as cislo_faktury,
                            f.fa_vema_kod,
                            f.fa_datum_vystaveni as datum_vystaveni,
                            f.fa_datum_splatnosti as datum_splatnosti,
                            f.fa_castka as castka,
                            f.stav,
                            o.cislo_objednavky,
                            o.dodavatel_nazev as dodavatel,
                            'faktura' as typ_zaznamu
                        FROM `" . TBL_FAKTURY . "` f
                        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
                        WHERE f.fa_cislo_vema = ?
                                                    AND (
                                                                ? = ''
                                                                OR f.fa_vema_kod IS NULL
                                                                OR TRIM(f.fa_vema_kod) = ''
                                                            )
                          AND f.stav != 'STORNO'
                        LIMIT 50";
                
                $stmt = $db->prepare($sql);
                                $stmt->execute(array($vsymb, $cdok_trim));
                $faktury_vsymb = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $faktury = array_merge($faktury, $faktury_vsymb);
            }
        }

        // ==================================================================
        // 4. PRIORITA: Hledat podle VEMA kódu (cdok) + částka
        // ==================================================================
        if (!empty($vema_faktura['cdok'])) {
            $cdok = $vema_faktura['cdok'];
            $vema_castka = !empty($vema_faktura['celkem']) ? floatval($vema_faktura['celkem']) : null;
            
            // Hledat faktury se stejným VEMA kódem + částkou (tolerance 0.01 Kč)
            if ($vema_castka !== null) {
                $sql = "SELECT 
                            f.id,
                            f.fa_cislo_vema as cislo_faktury,
                            f.fa_vema_kod,
                            f.fa_datum_vystaveni as datum_vystaveni,
                            f.fa_datum_splatnosti as datum_splatnosti,
                            f.fa_castka as castka,
                            f.stav,
                            o.cislo_objednavky,
                            o.dodavatel_nazev as dodavatel,
                            'faktura' as typ_zaznamu
                        FROM `" . TBL_FAKTURY . "` f
                        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
                        WHERE f.fa_vema_kod = ?
                          AND ABS(f.fa_castka - ?) < 0.01
                          AND f.stav != 'STORNO'
                        LIMIT 50";
                
                $stmt = $db->prepare($sql);
                $stmt->execute(array($cdok, $vema_castka));
                $faktury_cdok = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $faktury = array_merge($faktury, $faktury_cdok);
                
                error_log("🔍 VEMA Propojení - hledání podle cdok=$cdok + částka=$vema_castka: nalezeno " . count($faktury_cdok));
            } else {
                // Fallback bez částky (pokud VEMA faktura nemá částku)
                $sql = "SELECT 
                            f.id,
                            f.fa_cislo_vema as cislo_faktury,
                            f.fa_vema_kod,
                            f.fa_datum_vystaveni as datum_vystaveni,
                            f.fa_datum_splatnosti as datum_splatnosti,
                            f.fa_castka as castka,
                            f.stav,
                            o.cislo_objednavky,
                            o.dodavatel_nazev as dodavatel,
                            'faktura' as typ_zaznamu
                        FROM `" . TBL_FAKTURY . "` f
                        LEFT JOIN `" . TBL_OBJEDNAVKY . "` o ON f.objednavka_id = o.id
                        WHERE f.fa_vema_kod = ?
                          AND f.stav != 'STORNO'
                        LIMIT 50";
                
                $stmt = $db->prepare($sql);
                $stmt->execute(array($cdok));
                $faktury_cdok = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $faktury = array_merge($faktury, $faktury_cdok);
            }
        }

        // Deduplikace faktur podle ID
        $faktury_unique = array();
        $seen_ids = array();
        foreach ($faktury as $faktura) {
            if (!in_array($faktura['id'], $seen_ids)) {
                $faktury_unique[] = $faktura;
                $seen_ids[] = $faktura['id'];
            }
        }

        // Celkový počet nalezených záznamů (bez smluv - ty se nezobrazují samostatně)
        $celkem = count($objednavky) + count($faktury_unique) + count($rocni_poplatky);

        // Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'objednavky' => $objednavky,
                'faktury' => $faktury_unique,
                'rocni_poplatky' => $rocni_poplatky,
                'celkem' => $celkem,
                'kriteria' => array(
                    'cobj' => !empty($vema_faktura['cobj_formatovane']) ? $vema_faktura['cobj_formatovane'] : (!empty($vema_faktura['cobj']) ? $vema_faktura['cobj'] : null),
                    'ecsml' => !empty($vema_faktura['smlouva_ecsml']) ? $vema_faktura['smlouva_ecsml'] : null,
                    'vsymb' => !empty($vema_faktura['vsymb']) ? $vema_faktura['vsymb'] : null,
                    'cdok' => !empty($vema_faktura['cdok']) ? $vema_faktura['cdok'] : null
                )
            ),
            'message' => 'Propojení nalezeno'
        ));

    } catch (Exception $e) {
        error_log("❌ VEMA Propojení Error: " . $e->getMessage());
        error_log("❌ VEMA Propojení Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při hledání propojení: ' . $e->getMessage(),
            'debug' => $e->getTraceAsString()
        ));
    }
}

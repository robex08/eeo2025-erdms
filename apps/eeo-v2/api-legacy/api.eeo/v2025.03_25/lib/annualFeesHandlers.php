<?php
/**
 * ============================================================================
 * 💰 ROČNÍ POPLATKY - API HANDLERS
 * ============================================================================
 * 
 * Obslužné funkce pro Evidence ročních poplatků
 * 
 * Endpointy:
 * - annual-fees/list            - Seznam ročních poplatků s filtry + rozbalitelné položky
 * - annual-fees/detail          - Detail jednoho ročního poplatku včetně všech položek
 * - annual-fees/create          - Vytvoření s automatickým generováním položek podle platby
 * - annual-fees/update          - Aktualizace hlavičky (přepočítává sumy)
 * - annual-fees/update-item     - Aktualizace jedné položky (stav, datum zaplacení)
 * - annual-fees/delete          - Soft delete (CASCADE smaže i položky)
 * - annual-fees/stats           - Statistiky (celkem, zaplaceno, nezaplaceno, prosrořeno)
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/annualFeesQueries.php';

// ============================================================================
// 📋 LIST - Seznam ročních poplatků s filtry
// ============================================================================

function handleAnnualFeesList($pdo, $data, $user) {
    try {
        // Nastavení české časové zóny pro MySQL spojení
        TimezoneHelper::setMysqlTimezone($pdo);
        
        // Filtry (volitelné)
        $filters = [
            'rok' => $data['rok'] ?? null,
            'druh' => $data['druh'] ?? null,
            'platba' => $data['platba'] ?? null,
            'stav' => $data['stav'] ?? null,
            'smlouva_search' => $data['smlouva_search'] ?? null, // Vyhledávání v čísle nebo názvu smlouvy
            'aktivni' => isset($data['aktivni']) ? (int)$data['aktivni'] : 1
        ];

        // Paginace
        $page = isset($data['page']) ? max(1, (int)$data['page']) : 1;
        $limit = isset($data['limit']) ? max(1, min(100, (int)$data['limit'])) : 50;
        $offset = ($page - 1) * $limit;

        $result = queryAnnualFeesList($pdo, $filters, $limit, $offset);
        
        return [
            'status' => 'success',
            'data' => $result['items'],
            'pagination' => [
                'total' => $result['total'],
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($result['total'] / $limit)
            ]
        ];
    } catch (Exception $e) {
        error_log("❌ Annual Fees List Error: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => 'Chyba při načítání seznamu ročních poplatků'
        ];
    }
}

// ============================================================================
// 🔍 DETAIL - Detail včetně všech položek
// ============================================================================

function handleAnnualFeesDetail($pdo, $data, $user) {
    try {
        // Nastavení české časové zóny
        TimezoneHelper::setMysqlTimezone($pdo);
        
        if (!isset($data['id'])) {
            return ['status' => 'error', 'message' => 'Chybí ID ročního poplatku'];
        }

        $id = (int)$data['id'];
        $detail = queryAnnualFeesDetail($pdo, $id);

        if (!$detail) {
            return ['status' => 'error', 'message' => 'Roční poplatek nenalezen'];
        }

        return [
            'status' => 'success',
            'data' => $detail
        ];
    } catch (Exception $e) {
        error_log("❌ Annual Fees Detail Error: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => 'Chyba při načítání detailu ročního poplatku'
        ];
    }
}

// ============================================================================
// ➕ CREATE - Vytvoření s automatickým generováním položek
// ============================================================================

function handleAnnualFeesCreate($pdo, $data, $user) {
    try {
        // Nastavení české časové zóny
        TimezoneHelper::setMysqlTimezone($pdo);
        
        // Validace povinných polí (flexibilní - přijímá castka i castka_na_polozku)
        $required = ['smlouva_id', 'nazev', 'rok', 'druh', 'platba'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                return ['status' => 'error', 'message' => "Chybí povinné pole: $field"];
            }
        }

        $smlouva_id = (int)$data['smlouva_id'];
        $rok = (int)$data['rok'];
        
        // Celková částka je vstup
        if (!isset($data['celkova_castka'])) {
            return ['status' => 'error', 'message' => 'Chybí celková částka'];
        }
        
        $celkova_castka = (float)$data['celkova_castka'];
        
        if ($celkova_castka <= 0) {
            return ['status' => 'error', 'message' => 'Celková částka musí být větší než 0'];
        }
        
        // Datum první splatnosti - pokud není zadáno, použije se 1. leden daného roku
        $datum_prvni_splatnosti = $data['datum_prvni_splatnosti'] ?? "$rok-01-01";

        // Validace smlouvy
        $smlouva = queryGetSmlouva($pdo, $smlouva_id);
        if (!$smlouva) {
            return ['status' => 'error', 'message' => 'Smlouva s daným ID neexistuje', 'error_code' => 'SMLOUVA_NOT_FOUND'];
        }

        // Validace číselníků
        if (!validateCiselnikValue($pdo, 'DRUH_ROCNIHO_POPLATKU', $data['druh'])) {
            return ['status' => 'error', 'message' => 'Neplatný druh poplatku'];
        }
        if (!validateCiselnikValue($pdo, 'PLATBA_ROCNIHO_POPLATKU', $data['platba'])) {
            return ['status' => 'error', 'message' => 'Neplatný typ platby'];
        }

        $pdo->beginTransaction();

        // 1️⃣ Generování položek podle typu platby (zatím bez částek)
        $polozky = generatePolozky(
            $data['platba'],
            $rok,
            0, // Částka se dopočítá níže
            $datum_prvni_splatnosti
        );

        // Výpočet částky na položku: celková / počet položek
        $pocet_polozek = count($polozky);
        $castka_na_polozku = $pocet_polozek > 0 ? ($celkova_castka / $pocet_polozek) : 0;

        // 2️⃣ Vytvoření hlavičky (dodavatel se načte automaticky ze smlouvy přes JOIN)
        $rocni_poplatek_id = queryInsertAnnualFee($pdo, [
            'smlouva_id' => $smlouva_id,
            'nazev' => $data['nazev'],
            'popis' => $data['popis'] ?? null,
            'rok' => $rok,
            'druh' => $data['druh'],
            'platba' => $data['platba'],
            'celkova_castka' => $celkova_castka,
            'zaplaceno_celkem' => 0,
            'zbyva_zaplatit' => $celkova_castka,
            'stav' => 'NEZAPLACENO',
            'rozsirujici_data' => isset($data['rozsirujici_data']) ? json_encode($data['rozsirujici_data']) : null,
            'vytvoril_uzivatel_id' => $user['id'],
            'dt_vytvoreni' => TimezoneHelper::getCzechDateTime()
        ]);

        // 3️⃣ Vytvoření položek (pokud nějaké jsou)
        $created_polozky = [];
        foreach ($polozky as $index => $polozka) {
            $polozka_id = queryInsertAnnualFeeItem($pdo, [
                'rocni_poplatek_id' => $rocni_poplatek_id,
                'poradi' => $index + 1,
                'nazev_polozky' => $polozka['nazev'],
                'castka' => $castka_na_polozku,
                'datum_splatnosti' => $polozka['splatnost'],
                'stav' => 'NEZAPLACENO',
                'vytvoril_uzivatel_id' => $user['id'],
                'dt_vytvoreni' => TimezoneHelper::getCzechDateTime()
            ]);

            $created_polozky[] = [
                'id' => $polozka_id,
                'poradi' => $index + 1,
                'nazev' => $polozka['nazev'],
                'castka' => $castka_na_polozku,
                'splatnost' => $polozka['splatnost']
            ];
        }

        $pdo->commit();

        return [
            'status' => 'success',
            'data' => [
                'id' => $rocni_poplatek_id,
                'nazev' => $data['nazev'],
                'rok' => $rok,
                'druh' => $data['druh'],
                'platba' => $data['platba'],
                'celkova_castka' => $celkova_castka,
                'castka_na_polozku' => $castka_na_polozku,
                'pocet_polozek' => count($polozky),
                'polozky_vytvoreno' => $created_polozky
            ],
            'message' => count($polozky) > 0
                ? "Roční poplatek byl úspěšně vytvořen včetně " . count($polozky) . " položek (celková částka " . number_format($celkova_castka, 2, ',', ' ') . " Kč rozpočítána na " . number_format($castka_na_polozku, 2, ',', ' ') . " Kč/položku)"
                : "Roční poplatek byl úspěšně vytvořen (typ JINÁ - položky se přidávají manuálně)"
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("❌ Annual Fees Create Error: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => 'Chyba při vytváření ročního poplatku: ' . $e->getMessage()
        ];
    }
}

// ============================================================================
// 🔄 UPDATE - Aktualizace hlavičky
// ============================================================================

function handleAnnualFeesUpdate($pdo, $data, $user) {
    try {
        // Nastavení české časové zóny
        TimezoneHelper::setMysqlTimezone($pdo);
        
        if (!isset($data['id'])) {
            return ['status' => 'error', 'message' => 'Chybí ID ročního poplatku'];
        }

        $id = (int)$data['id'];

        // Validace existence
        $existing = queryAnnualFeesDetail($pdo, $id);
        if (!$existing) {
            return ['status' => 'error', 'message' => 'Roční poplatek nenalezen'];
        }

        $pdo->beginTransaction();

        // Aktualizace hlavičky
        $updateData = [
            'id' => $id,
            'aktualizoval_uzivatel_id' => $user['id'],
            'dt_aktualizace' => TimezoneHelper::getCzechDateTime()
        ];

        $allowedFields = ['nazev', 'popis', 'druh', 'stav', 'rozsirujici_data'];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if ($field === 'rozsirujici_data' && is_array($data[$field])) {
                    $updateData[$field] = json_encode($data[$field]);
                } else {
                    $updateData[$field] = $data[$field];
                }
            }
        }

        queryUpdateAnnualFee($pdo, $updateData);

        // Přepočítání sum z položek
        queryRecalculateAnnualFeeSums($pdo, $id);

        $pdo->commit();

        // Načtení aktualizovaných dat
        $updated = queryAnnualFeesDetail($pdo, $id);

        return [
            'status' => 'success',
            'data' => $updated,
            'message' => 'Roční poplatek byl úspěšně aktualizován'
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("❌ Annual Fees Update Error: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => 'Chyba při aktualizaci ročního poplatku: ' . $e->getMessage()
        ];
    }
}

// ============================================================================
// ➕ CREATE-ITEM - Vytvoření nové manuální položky
// ============================================================================

function handleAnnualFeesCreateItem($pdo, $data, $user) {
    try {
        // Nastavení české časové zóny
        TimezoneHelper::setMysqlTimezone($pdo);
        
        // Validace povinných polí
        if (!isset($data['rocni_poplatek_id'])) {
            return ['status' => 'error', 'message' => 'Chybí ID ročního poplatku'];
        }
        if (!isset($data['nazev_polozky']) || $data['nazev_polozky'] === '') {
            return ['status' => 'error', 'message' => 'Chybí název položky'];
        }
        if (!isset($data['datum_splatnosti']) || $data['datum_splatnosti'] === '') {
            return ['status' => 'error', 'message' => 'Chybí datum splatnosti'];
        }
        if (!isset($data['castka']) || $data['castka'] <= 0) {
            return ['status' => 'error', 'message' => 'Chybí částka nebo je neplatná'];
        }
        
        $rocni_poplatek_id = (int)$data['rocni_poplatek_id'];
        
        // Validace existence ročního poplatku
        $existing = queryAnnualFeesDetail($pdo, $rocni_poplatek_id);
        if (!$existing) {
            return ['status' => 'error', 'message' => 'Roční poplatek nenalezen'];
        }
        
        $pdo->beginTransaction();
        
        // Zjištění nejvyššího pořadí pro novou položku
        $stmt = $pdo->prepare("
            SELECT COALESCE(MAX(poradi), 0) as max_poradi 
            FROM `25a_rocni_poplatky_polozky` 
            WHERE rocni_poplatek_id = :rocni_poplatek_id 
            AND aktivni = 1
        ");
        $stmt->execute([':rocni_poplatek_id' => $rocni_poplatek_id]);
        $maxPoradi = $stmt->fetchColumn();
        $novePoradi = $maxPoradi + 1;
        
        // Vytvoření nové položky
        $polozka_id = queryInsertAnnualFeeItem($pdo, [
            'rocni_poplatek_id' => $rocni_poplatek_id,
            'poradi' => $novePoradi,
            'nazev_polozky' => $data['nazev_polozky'],
            'castka' => (float)$data['castka'],
            'datum_splatnosti' => $data['datum_splatnosti'],
            'faktura_id' => isset($data['faktura_id']) ? (int)$data['faktura_id'] : null,
            'poznamka' => isset($data['poznamka']) ? $data['poznamka'] : null,
            'stav' => 'NEZAPLACENO',
            'vytvoril_uzivatel_id' => $user['id'],
            'dt_vytvoreni' => TimezoneHelper::getCzechDateTime()
        ]);
        
        // ✨ Pokud byla přiřazena faktura, aktualizovat fakturu o smlouvu z ročního poplatku
        if (isset($data['faktura_id']) && $data['faktura_id'] > 0 && isset($existing['smlouva_id']) && $existing['smlouva_id']) {
            $tblFaktury = defined('TBL_FAKTURY') ? TBL_FAKTURY : '25a_objednavky_faktury';
            
            $stmtInvoice = $pdo->prepare("
                UPDATE `$tblFaktury` 
                SET smlouva_id = :smlouva_id,
                    aktualizoval_uzivatel_id = :user_id,
                    dt_aktualizace = :dt_aktualizace
                WHERE id = :faktura_id
            ");
            $stmtInvoice->execute([
                'smlouva_id' => $existing['smlouva_id'],
                'user_id' => $user['id'],
                'dt_aktualizace' => TimezoneHelper::getCzechDateTime(),
                'faktura_id' => $data['faktura_id']
            ]);
        }
        
        // Přepočítání sum v hlavičce
        queryRecalculateAnnualFeeSums($pdo, $rocni_poplatek_id);
        
        $pdo->commit();
        
        return [
            'status' => 'success',
            'data' => [
                'id' => $polozka_id,
                'rocni_poplatek_id' => $rocni_poplatek_id,
                'poradi' => $novePoradi,
                'nazev_polozky' => $data['nazev_polozky'],
                'castka' => (float)$data['castka'],
                'datum_splatnosti' => $data['datum_splatnosti']
            ],
            'message' => 'Položka byla úspěšně přidána'
        ];
        
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("❌ Annual Fees Create Item Error: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => 'Chyba při vytváření položky: ' . $e->getMessage()
        ];
    }
}

// ============================================================================
// 📝 UPDATE-ITEM - Aktualizace jedné položky
// ============================================================================

function handleAnnualFeesUpdateItem($pdo, $data, $user) {
    try {
        // Nastavení české časové zóny
        TimezoneHelper::setMysqlTimezone($pdo);
        
        if (!isset($data['id'])) {
            return ['status' => 'error', 'message' => 'Chybí ID položky'];
        }

        $id = (int)$data['id'];

        $pdo->beginTransaction();

        // Aktualizace položky
        $updateData = [
            'id' => $id,
            'aktualizoval_uzivatel_id' => $user['id'],
            'dt_aktualizace' => TimezoneHelper::getCzechDateTime()
        ];

        $allowedFields = ['stav', 'datum_zaplaceni', 'poznamka', 'faktura_id', 'rozsirujici_data'];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                if ($field === 'rozsirujici_data' && is_array($data[$field])) {
                    $updateData[$field] = json_encode($data[$field]);
                } else {
                    $updateData[$field] = $data[$field];
                }
            }
        }

        $item = queryUpdateAnnualFeeItem($pdo, $updateData);

        if (!$item) {
            $pdo->rollBack();
            return ['status' => 'error', 'message' => 'Položka nenalezena'];
        }

        // ✨ Pokud byla přiřazena faktura, aktualizovat fakturu o smlouvu z ročního poplatku
        if (isset($data['faktura_id']) && $data['faktura_id'] > 0) {
            // Načíst roční poplatek pro získání smlouvy
            $tblRocniPoplatky = defined('TBL_ROCNI_POPLATKY') ? TBL_ROCNI_POPLATKY : '25a_rocni_poplatky';
            $tblFaktury = defined('TBL_FAKTURY') ? TBL_FAKTURY : '25a_objednavky_faktury';
            
            $stmtFee = $pdo->prepare("
                SELECT smlouva_id 
                FROM `$tblRocniPoplatky` 
                WHERE id = :fee_id AND aktivni = 1
            ");
            $stmtFee->execute(['fee_id' => $item['rocni_poplatek_id']]);
            $fee = $stmtFee->fetch(PDO::FETCH_ASSOC);
            
            if ($fee && $fee['smlouva_id']) {
                // Aktualizovat fakturu - přiřadit smlouvu
                $stmtInvoice = $pdo->prepare("
                    UPDATE `$tblFaktury` 
                    SET smlouva_id = :smlouva_id,
                        aktualizoval_uzivatel_id = :user_id,
                        dt_aktualizace = :dt_aktualizace
                    WHERE id = :faktura_id
                ");
                $stmtInvoice->execute([
                    'smlouva_id' => $fee['smlouva_id'],
                    'user_id' => $user['id'],
                    'dt_aktualizace' => TimezoneHelper::getCzechDateTime(),
                    'faktura_id' => $data['faktura_id']
                ]);
            }
        }

        // Přepočítání sum v hlavičce
        queryRecalculateAnnualFeeSums($pdo, $item['rocni_poplatek_id']);

        $pdo->commit();

        return [
            'status' => 'success',
            'data' => $item,
            'message' => 'Položka byla úspěšně aktualizována'
        ];

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("❌ Annual Fees Update Item Error: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => 'Chyba při aktualizaci položky: ' . $e->getMessage()
        ];
    }
}

// ============================================================================
// 🗑️ DELETE - Soft delete
// ============================================================================

function handleAnnualFeesDelete($pdo, $data, $user) {
    try {
        // Nastavení české časové zóny
        TimezoneHelper::setMysqlTimezone($pdo);
        
        if (!isset($data['id'])) {
            return ['status' => 'error', 'message' => 'Chybí ID ročního poplatku'];
        }

        $id = (int)$data['id'];

        $result = querySoftDeleteAnnualFee($pdo, $id, $user['id']);

        if (!$result) {
            return ['status' => 'error', 'message' => 'Roční poplatek nenalezen'];
        }

        return [
            'status' => 'success',
            'message' => 'Roční poplatek byl úspěšně smazán (včetně všech položek)'
        ];

    } catch (Exception $e) {
        error_log("❌ Annual Fees Delete Error: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => 'Chyba při mazání ročního poplatku: ' . $e->getMessage()
        ];
    }
}

// ============================================================================
// 📊 STATS - Statistiky
// ============================================================================

function handleAnnualFeesStats($pdo, $data, $user) {
    try {
        // Nastavení české časové zóny
        TimezoneHelper::setMysqlTimezone($pdo);
        
        $rok = isset($data['rok']) ? (int)$data['rok'] : null;
        $stats = queryAnnualFeesStats($pdo, $rok);

        return [
            'status' => 'success',
            'data' => $stats
        ];

    } catch (Exception $e) {
        error_log("❌ Annual Fees Stats Error: " . $e->getMessage());
        return [
            'status' => 'error',
            'message' => 'Chyba při načítání statistik: ' . $e->getMessage()
        ];
    }
}

// ============================================================================
// 🔧 HELPER FUNKCE - Generování položek podle typu platby
// ============================================================================

/**
 * Generuje položky podle typu platby
 * 
 * @param string $platba Typ platby: MESICNI|KVARTALNI|ROCNI|JINA
 * @param int $rok Rok poplatků
 * @param float $castka_na_polozku Částka na jednu položku
 * @param string $datum_prvni_splatnosti První splatnost (YYYY-MM-DD)
 * @return array Pole položek s názvy a splatnostmi
 */
function generatePolozky($platba, $rok, $castka_na_polozku, $datum_prvni_splatnosti) {
    $polozky = [];
    $datum = new DateTime($datum_prvni_splatnosti);
    
    $mesice_cesky = [
        1 => 'Leden', 2 => 'Únor', 3 => 'Březen', 4 => 'Duben',
        5 => 'Květen', 6 => 'Červen', 7 => 'Červenec', 8 => 'Srpen',
        9 => 'Září', 10 => 'Říjen', 11 => 'Listopad', 12 => 'Prosinec'
    ];

    switch ($platba) {
        case 'MESICNI':
            // 12 měsíčních položek
            for ($i = 0; $i < 12; $i++) {
                $mesic = (int)$datum->format('n');
                $polozky[] = [
                    'nazev' => $mesice_cesky[$mesic] . ' ' . $rok,
                    'splatnost' => $datum->format('Y-m-d')
                ];
                $datum->modify('+1 month');
            }
            break;

        case 'KVARTALNI':
            // 4 kvartální položky
            for ($i = 1; $i <= 4; $i++) {
                $polozky[] = [
                    'nazev' => "Q$i $rok",
                    'splatnost' => $datum->format('Y-m-d')
                ];
                $datum->modify('+3 months');
            }
            break;

        case 'ROCNI':
            // 1 roční položka
            $polozky[] = [
                'nazev' => "Roční poplatek $rok",
                'splatnost' => $datum->format('Y-m-d')
            ];
            break;

        case 'JINA':
            // Žádné položky - přidávají se manuálně přes add-item endpoint
            break;

        default:
            throw new Exception("Neznámý typ platby: $platba");
    }

    return $polozky;
}

/**
 * Validuje hodnotu z číselníku
 */
function validateCiselnikValue($pdo, $typ_objektu, $kod_stavu) {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM `25_ciselnik_stavy`
        WHERE typ_objektu = :typ_objektu
          AND kod_stavu = :kod_stavu
          AND aktivni = 1
    ");
    $stmt->execute([
        ':typ_objektu' => $typ_objektu,
        ':kod_stavu' => $kod_stavu
    ]);
    return $stmt->fetchColumn() > 0;
}

/**
 * Načte smlouvu pro validaci
 */
function queryGetSmlouva($pdo, $smlouva_id) {
    $stmt = $pdo->prepare("
        SELECT id, cislo_smlouvy, nazev_smlouvy, nazev_firmy, ico, dic
        FROM `25_smlouvy`
        WHERE id = :id AND aktivni = 1
    ");
    $stmt->execute([':id' => $smlouva_id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

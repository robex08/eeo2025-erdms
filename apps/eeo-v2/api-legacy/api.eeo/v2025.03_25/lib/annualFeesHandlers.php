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
 * OPRÁVNĚNÍ:
 * - ADMIN/ANNUAL_FEES_MANAGE    - Plný přístup ke všemu
 * - ANNUAL_FEES_VIEW            - Pouze čtení (bez editace/mazání/vytváření)
 * - ANNUAL_FEES_CREATE          - Vytváření nových poplatků
 * - ANNUAL_FEES_EDIT            - Editace existujících (hlavičky i položek)
 * - ANNUAL_FEES_DELETE          - Mazání poplatků (jen s EDIT)
 * - ANNUAL_FEES_ITEM_PAYMENT    - Označování položek k zaplacení (s VIEW nebo EDIT)
 * 
 * @version 1.1.0
 * @date 2026-01-31
 */

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/annualFeesQueries.php';

// ============================================================================
// 🔐 HELPER FUNKCE PRO KONTROLU PRÁV
// ============================================================================

/**
 * Kontrola, zda má uživatel konkrétní oprávnění
 * @param array $user - Objekt uživatele s permissions polem
 * @param string $permissionCode - Kód oprávnění
 * @return bool
 */
function hasAnnualFeesPermission($user, $permissionCode) {
    if (!isset($user['permissions']) || !is_array($user['permissions'])) {
        return false;
    }
    
    foreach ($user['permissions'] as $perm) {
        if (isset($perm['kod_prava']) && $perm['kod_prava'] === $permissionCode) {
            return true;
        }
    }
    
    return false;
}

/**
 * Kontrola, zda má uživatel alespoň jedno z oprávnění
 * @param array $user - Objekt uživatele
 * @param array $permissionCodes - Pole kódů oprávnění
 * @return bool
 */
function hasAnyAnnualFeesPermission($user, $permissionCodes) {
    foreach ($permissionCodes as $code) {
        if (hasAnnualFeesPermission($user, $code)) {
            return true;
        }
    }
    return false;
}

/**
 * Kontrola, zda je uživatel ADMIN (role SUPERADMIN nebo ADMINISTRATOR)
 * @param array $user - Objekt uživatele
 * @return bool
 */
function isAnnualFeesAdmin($user) {
    // Z verify_token_v2 máme is_admin flag
    if (isset($user['is_admin']) && $user['is_admin']) {
        return true;
    }
    
    // Fallback: kontrola rolí
    if (!isset($user['roles']) || !is_array($user['roles'])) {
        return false;
    }
    
    return in_array('SUPERADMIN', $user['roles']) || in_array('ADMINISTRATOR', $user['roles']);
}

/**
 * Kontrola, zda je uživatel ÚČETNÍ (role UCETNI nebo HLAVNI_UCETNI)
 * @param array $user - Objekt uživatele
 * @return bool
 */
function isAccountant($user) {
    if (!isset($user['roles']) || !is_array($user['roles'])) {
        return false;
    }
    
    return in_array('UCETNI', $user['roles']) || in_array('HLAVNI_UCETNI', $user['roles']);
}

/**
 * Kontrola práv pro VIEW (čtení)
 * ADMIN, ÚČETNÍ, nebo jakékoliv právo ANNUAL_FEES_*
 * 
 * ⚠️ PRAVIDLO: Pokud má uživatel JAKÉKOLIV právo *_FEE nebo roli ÚČETNÍ,
 *    vidí VŠECHNY roční poplatky bez omezení hierarchie!
 * 
 * @param array $user
 * @return bool
 */
function canViewAnnualFees($user) {
    return isAnnualFeesAdmin($user) || 
           isAccountant($user) ||
           hasAnyAnnualFeesPermission($user, ['ANNUAL_FEES_MANAGE', 'ANNUAL_FEES_VIEW', 'ANNUAL_FEES_EDIT', 'ANNUAL_FEES_CREATE', 'ANNUAL_FEES_DELETE', 'ANNUAL_FEES_ITEM_CREATE', 'ANNUAL_FEES_ITEM_UPDATE', 'ANNUAL_FEES_ITEM_DELETE', 'ANNUAL_FEES_ITEM_PAYMENT']);
}

/**
 * Kontrola práv pro CREATE (vytváření)
 * ADMIN, ANNUAL_FEES_MANAGE nebo ANNUAL_FEES_CREATE
 * @param array $user
 * @return bool
 */
function canCreateAnnualFees($user) {
    return isAnnualFeesAdmin($user) || 
           hasAnyAnnualFeesPermission($user, ['ANNUAL_FEES_MANAGE', 'ANNUAL_FEES_CREATE']);
}

/**
 * Kontrola práv pro EDIT (editace hlavičky)
 * ADMIN, ANNUAL_FEES_MANAGE nebo ANNUAL_FEES_EDIT
 * @param array $user
 * @return bool
 */
function canEditAnnualFees($user) {
    return isAnnualFeesAdmin($user) || 
           hasAnyAnnualFeesPermission($user, ['ANNUAL_FEES_MANAGE', 'ANNUAL_FEES_EDIT']);
}

/**
 * Kontrola práv pro EDIT POLOŽEK (editace jednotlivých položek)
 * ADMIN, ANNUAL_FEES_MANAGE nebo ANNUAL_FEES_EDIT nebo ANNUAL_FEES_ITEM_UPDATE
 * 
 * ⚠️ DŮLEŽITÉ: Tato funkce kontroluje práva pro editaci POLOŽEK ročních poplatků.
 * Je mírnější než canEditAnnualFees(), protože zahrnuje i granulární právo ANNUAL_FEES_ITEM_UPDATE.
 * 
 * @param array $user
 * @return bool
 */
function canEditAnnualFeesItems($user) {
    return isAnnualFeesAdmin($user) || 
           hasAnyAnnualFeesPermission($user, ['ANNUAL_FEES_MANAGE', 'ANNUAL_FEES_EDIT', 'ANNUAL_FEES_ITEM_UPDATE']);
}

/**
 * Kontrola práv pro DELETE (mazání)
 * ADMIN, ANNUAL_FEES_MANAGE nebo (ANNUAL_FEES_DELETE + ANNUAL_FEES_EDIT)
 * @param array $user
 * @return bool
 */
function canDeleteAnnualFees($user) {
    if (isAnnualFeesAdmin($user) || hasAnnualFeesPermission($user, 'ANNUAL_FEES_MANAGE')) {
        return true;
    }
    
    // DELETE musí být s EDIT, jinak je zbytečný
    return hasAnnualFeesPermission($user, 'ANNUAL_FEES_DELETE') && 
           hasAnnualFeesPermission($user, 'ANNUAL_FEES_EDIT');
}

/**
 * Kontrola práv pro PAYMENT (označení k zaplacení)
 * ADMIN, ANNUAL_FEES_MANAGE nebo (ANNUAL_FEES_ITEM_PAYMENT + (VIEW nebo EDIT))
 * @param array $user
 * @return bool
 */
function canMarkPaymentAnnualFees($user) {
    if (isAnnualFeesAdmin($user) || hasAnnualFeesPermission($user, 'ANNUAL_FEES_MANAGE')) {
        return true;
    }
    
    // PAYMENT musí být s VIEW nebo EDIT
    if (!hasAnnualFeesPermission($user, 'ANNUAL_FEES_ITEM_PAYMENT')) {
        return false;
    }
    
    return hasAnyAnnualFeesPermission($user, ['ANNUAL_FEES_VIEW', 'ANNUAL_FEES_EDIT']);
}

// ============================================================================
// 📋 LIST - Seznam ročních poplatků s filtry
// ============================================================================

function handleAnnualFeesList($pdo, $data, $user) {
    // 🔐 KONTROLA PRÁV: VIEW
    if (!canViewAnnualFees($user)) {
        return [
            'status' => 'error',
            'message' => 'Nemáte oprávnění k zobrazení ročních poplatků',
            'code' => 403
        ];
    }
    
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
            'fulltext_search' => $data['fulltext_search'] ?? null, // Obecné fulltext vyhledávání
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
    // 🔐 KONTROLA PRÁV: VIEW
    if (!canViewAnnualFees($user)) {
        return [
            'status' => 'error',
            'message' => 'Nemáte oprávnění k zobrazení detailu ročního poplatku',
            'code' => 403
        ];
    }
    
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
    // 1. Validace HTTP metody (PHPAPI.prompt.md standard)
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda povolena']);
        return;
    }
    
    // 🔐 KONTROLA PRÁV: CREATE
    if (!canCreateAnnualFees($user)) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Nemáte oprávnění k vytváření ročních poplatků'
        ]);
        return;
    }
    
    try {
        // Nastavení české časové zóny
        TimezoneHelper::setMysqlTimezone($pdo);
        
        // 🔧 DEBUG: Výpis přijatých dat z frontend
        if (isset($data['polozky'])) {
        }
        
        // Validace povinných polí
        $required = ['nazev', 'rok', 'druh', 'platba'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                error_log("❌ Annual Fees CREATE: Chybí povinné pole: $field");
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => "Chybí povinné pole: $field"]);
                return;
            }
        }
        
        // Smlouva je volitelná - pokud není zadána, zůstane NULL
        // Dodavatel se pak musí zadat ručně v dodavatel_nazev
        $smlouva_id = !empty($data['smlouva_id']) ? (int)$data['smlouva_id'] : null;
        $dodavatel_nazev = !empty($data['dodavatel_nazev']) ? trim($data['dodavatel_nazev']) : null;
        $rok = (int)$data['rok'];
        
        // Celková částka je vstup
        if (!isset($data['celkova_castka'])) {
            error_log("❌ Annual Fees CREATE: Chybí celková částka");
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Chybí celková částka']);
            return;
        }
        
        $celkova_castka = (float)$data['celkova_castka'];
        
        if ($celkova_castka <= 0) {
            error_log("❌ Annual Fees CREATE: Celková částka musí být větší než 0: $celkova_castka");
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Celková částka musí být větší než 0']);
            return;
        }
        
        // Datum první splatnosti - pokud není zadáno, použije se 1. leden daného roku
        $datum_prvni_splatnosti = $data['datum_prvni_splatnosti'] ?? "$rok-01-01";

        // Validace smlouvy (pouze pokud je vyplněna)
        if ($smlouva_id) {
            $smlouva = queryGetSmlouva($pdo, $smlouva_id);
            if (!$smlouva) {
                error_log("❌ Annual Fees CREATE: Smlouva s ID $smlouva_id neexistuje");
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Smlouva s daným ID neexistuje', 'error_code' => 'SMLOUVA_NOT_FOUND']);
                return;
            }
        }

        // Validace číselníků
        if (!validateCiselnikValue($pdo, 'DRUH_ROCNIHO_POPLATKU', $data['druh'])) {
            error_log("❌ Annual Fees CREATE: Neplatný druh poplatku: " . $data['druh']);
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Neplatný druh poplatku']);
            return;
        }
        if (!validateCiselnikValue($pdo, 'PLATBA_ROCNIHO_POPLATKU', $data['platba'])) {
            error_log("❌ Annual Fees CREATE: Neplatný typ platby: " . $data['platba']);
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Neplatný typ platby']);
            return;
        }

        $pdo->beginTransaction();

        // 1️⃣ Pokud frontend poslal vlastní položky, použít je; jinak vygenerovat
        if (isset($data['polozky']) && is_array($data['polozky']) && count($data['polozky']) > 0) {
            // Frontend poslal upravené položky
            $polozky = $data['polozky'];
        } else {
            // Generování položek podle typu platby
            $polozky = generatePolozky(
                $data['platba'],
                $rok,
                0, // Částka se dopočítá níže
                $datum_prvni_splatnosti
            );

            // Výpočet částky na položku: celková / počet položek
            $pocet_polozek = count($polozky);
            $castka_na_polozku = $pocet_polozek > 0 ? ($celkova_castka / $pocet_polozek) : 0;
            
            // Přidat částku do vygenerovaných položek
            foreach ($polozky as &$polozka) {
                $polozka['castka'] = $castka_na_polozku;
            }
        }
        
        // Vždy spočítej průměrnou částku na položku pro response
        $castka_na_polozku = count($polozky) > 0 ? ($celkova_castka / count($polozky)) : 0;

        // 2️⃣ Vytvoření hlavičky (pokud není smlouva, uložíme dodavatel_nazev do rozšiřujících dat)
        $rozsirujici_data = isset($data['rozsirujici_data']) ? $data['rozsirujici_data'] : [];
        
        // Pokud není smlouva ale je dodavatel_nazev, uložíme ho do rozšiřujících dat
        if (!$smlouva_id && $dodavatel_nazev) {
            $rozsirujici_data['dodavatel_nazev'] = $dodavatel_nazev;
        }
        
        $rocni_poplatek_id = queryInsertAnnualFee($pdo, [
            'smlouva_id' => $smlouva_id,
            'nazev' => $data['nazev'],
            'popis' => $data['popis'] ?? null,
            'poznamka' => $data['poznamka'] ?? null,
            'rok' => $rok,
            'druh' => $data['druh'],
            'platba' => $data['platba'],
            'celkova_castka' => $celkova_castka,
            'zaplaceno_celkem' => 0,
            'zbyva_zaplatit' => $celkova_castka,
            'stav' => 'NEZAPLACENO',
            'rozsirujici_data' => !empty($rozsirujici_data) ? json_encode($rozsirujici_data) : null,
            'vytvoril_uzivatel_id' => $user['id'],
            'dt_vytvoreni' => TimezoneHelper::getCzechDateTime()
        ]);

        // 3️⃣ Vytvoření položek (pokud nějaké jsou)
        $created_polozky = [];
        foreach ($polozky as $index => $polozka) {
            
            $polozka_id = queryInsertAnnualFeeItem($pdo, [
                'rocni_poplatek_id' => $rocni_poplatek_id,
                'poradi' => $index + 1,
                'nazev_polozky' => $polozka['nazev_polozky'] ?? $polozka['nazev'] ?? '',
                'castka' => $polozka['castka'] ?? 0,
                'datum_splatnosti' => $polozka['datum_splatnosti'] ?? $polozka['splatnost'] ?? null,
                'cislo_dokladu' => $polozka['cislo_dokladu'] ?? null,
                'datum_zaplaceno' => $polozka['datum_zaplaceno'] ?? null,
                'stav' => 'NEZAPLACENO',
                'vytvoril_uzivatel_id' => $user['id'],
                'dt_vytvoreni' => TimezoneHelper::getCzechDateTime()
            ]);
            

            $created_polozky[] = [
                'id' => $polozka_id,
                'poradi' => $index + 1,
                'nazev' => $polozka['nazev_polozky'] ?? $polozka['nazev'] ?? '',
                'castka' => $polozka['castka'] ?? 0,
                'splatnost' => $polozka['datum_splatnosti'] ?? $polozka['splatnost'] ?? null
            ];
        }

        $pdo->commit();

        // AUDIT LOG: CREATE ročního poplatku včetně počátečních hodnot (fail-safe)
        try {
            if (function_exists('audit_log_create_with_data')) {
                $tblRocniPoplatky = defined('TBL_ROCNI_POPLATKY') ? TBL_ROCNI_POPLATKY : '25a_rocni_poplatky';
                $created_fee_stmt = $pdo->prepare("SELECT * FROM `{$tblRocniPoplatky}` WHERE id = ? LIMIT 1");
                $created_fee_stmt->execute([(int)$rocni_poplatek_id]);
                $created_fee = $created_fee_stmt->fetch(PDO::FETCH_ASSOC) ?: [];

                audit_log_create_with_data(
                    $pdo,
                    ['id' => $user['id'], 'username' => $user['username'] ?? ''],
                    'ROCNI_POPLATEK',
                    $rocni_poplatek_id,
                    'annual-fees/create',
                    (array)$created_fee,
                    'Vytvoření nového ročního poplatku'
                );
            }
        } catch (Exception $ae) { error_log('[AUDIT] annual-fees create: ' . $ae->getMessage()); }

        // Úspěšná odpověď podle PHPAPI.prompt.md standardu
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => [
                'id' => $rocni_poplatek_id,
                'nazev' => $data['nazev'],
                'rok' => $rok,
                'druh' => $data['druh'],
                'platba' => $data['platba'],
                'celkova_castka' => $celkova_castka,
                'pocet_polozek' => count($polozky),
                'polozky_vytvoreno' => $created_polozky
            ],
            'message' => count($polozky) > 0
                ? "Roční poplatek byl úspěšně vytvořen včetně " . count($polozky) . " položek"
                : "Roční poplatek byl úspěšně vytvořen (typ JINÁ - položky se přidávají manuálně)"
        ]);
        return;

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("❌ Annual Fees Create Error: " . $e->getMessage());
        error_log("❌ Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při vytváření ročního poplatku: ' . $e->getMessage()
        ]);
        return;
    }
}

// ============================================================================
// 🔄 UPDATE - Aktualizace hlavičky
// ============================================================================

function handleAnnualFeesUpdate($pdo, $data, $user) {
    // 🔐 KONTROLA PRÁV: EDIT
    if (!canEditAnnualFees($user)) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Nemáte oprávnění k editaci ročních poplatků'
        ]);
        return;
    }
    
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

        // Detekce změny platby
        $platba_changed = isset($data['platba']) && $data['platba'] !== $existing['platba'];
        $celkova_castka_changed = isset($data['celkova_castka']) && (float)$data['celkova_castka'] !== (float)$existing['celkova_castka'];

        // Aktualizace hlavičky
        $updateData = [
            'id' => $id,
            'aktualizoval_uzivatel_id' => $user['id'],
            'dt_aktualizace' => TimezoneHelper::getCzechDateTime()
        ];

        $allowedFields = ['nazev', 'popis', 'poznamka', 'druh', 'stav', 'platba', 'celkova_castka', 'rozsirujici_data'];
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

        // 🔄 Pokud frontend poslal nové položky, použít je
        if (isset($data['polozky']) && is_array($data['polozky']) && count($data['polozky']) > 0) {
            // Frontend poslal upravené položky - smazat staré a vytvořit nové
            $stmt_delete = $pdo->prepare("DELETE FROM `25a_rocni_poplatky_polozky` WHERE rocni_poplatek_id = :id");
            $stmt_delete->execute([':id' => $id]);

            foreach ($data['polozky'] as $index => $polozka) {
                queryInsertAnnualFeeItem($pdo, [
                    'rocni_poplatek_id' => $id,
                    'poradi' => $index + 1,
                    'nazev_polozky' => $polozka['nazev_polozky'] ?? '',
                    'castka' => $polozka['castka'] ?? 0,
                    'datum_splatnosti' => $polozka['datum_splatnosti'] ?? null,
                    'cislo_dokladu' => $polozka['cislo_dokladu'] ?? null,
                    'datum_zaplaceno' => $polozka['datum_zaplaceno'] ?? null,
                    'stav' => 'NEZAPLACENO',
                    'vytvoril_uzivatel_id' => $user['id'],
                    'dt_vytvoreni' => TimezoneHelper::getCzechDateTime()
                ]);
            }
        } elseif ($platba_changed) {
            // 🔄 Pokud se změnila PLATBA (bez položek od frontendu), přegenerovat
            $new_platba = $data['platba'];
            $celkova_castka = isset($data['celkova_castka']) ? (float)$data['celkova_castka'] : (float)$existing['celkova_castka'];
            $rok = $existing['rok'];
            $datum_prvni_splatnosti = $existing['datum_prvni_splatnosti'] ?? "$rok-01-01";

            // Validace nové platby
            if (!validateCiselnikValue($pdo, 'PLATBA_ROCNIHO_POPLATKU', $new_platba)) {
                throw new Exception('Neplatný typ platby');
            }

            // 1️⃣ Smazat všechny existující položky
            $stmt_delete = $pdo->prepare("DELETE FROM `25a_rocni_poplatky_polozky` WHERE rocni_poplatek_id = :id");
            $stmt_delete->execute([':id' => $id]);

            // 2️⃣ Vygenerovat nové položky
            $polozky = generatePolozky($new_platba, $rok, 0, $datum_prvni_splatnosti);
            $pocet_polozek = count($polozky);
            $castka_na_polozku = $pocet_polozek > 0 ? ($celkova_castka / $pocet_polozek) : 0;

            // 3️⃣ Vytvořit nové položky
            foreach ($polozky as $index => $polozka) {
                queryInsertAnnualFeeItem($pdo, [
                    'rocni_poplatek_id' => $id,
                    'poradi' => $index + 1,
                    'nazev_polozky' => $polozka['nazev'],
                    'castka' => $castka_na_polozku,
                    'datum_splatnosti' => $polozka['splatnost'],
                    'stav' => 'NEZAPLACENO',
                    'vytvoril_uzivatel_id' => $user['id'],
                    'dt_vytvoreni' => TimezoneHelper::getCzechDateTime()
                ]);
            }
        } elseif ($celkova_castka_changed) {
            // 💰 Pokud se změnila jen částka (bez změny platby), přepočítat částky na položky
            $celkova_castka = (float)$data['celkova_castka'];
            $stmt_count = $pdo->prepare("SELECT COUNT(*) FROM `25a_rocni_poplatky_polozky` WHERE rocni_poplatek_id = :id");
            $stmt_count->execute([':id' => $id]);
            $pocet_polozek = $stmt_count->fetchColumn();
            
            if ($pocet_polozek > 0) {
                $castka_na_polozku = $celkova_castka / $pocet_polozek;
                $stmt_update = $pdo->prepare("UPDATE `25a_rocni_poplatky_polozky` SET castka = :castka WHERE rocni_poplatek_id = :id");
                $stmt_update->execute([':castka' => $castka_na_polozku, ':id' => $id]);
            }
        }

        // Přepočítání sum z položek
        queryRecalculateAnnualFeeSums($pdo, $id);

        $pdo->commit();

        // AUDIT LOG: update (fail-safe)
        try {
            if (function_exists('audit_log_field_changes') && !empty($existing)) {
                $updated_now = queryAnnualFeesDetail($pdo, $id);
                audit_log_field_changes(
                    $pdo,
                    ['id' => $user['id'], 'username' => $user['username'] ?? ''],
                    'ROCNI_POPLATEK', $id,
                    'annual-fees/update',
                    (array)$existing, (array)($updated_now ?? [])
                );
            }
        } catch (Exception $ae) { error_log('[AUDIT] annual-fees update: ' . $ae->getMessage()); }

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
    // 🔐 KONTROLA PRÁV: CREATE nebo EDIT (položky může přidávat i ten kdo edituje)
    if (!canCreateAnnualFees($user) && !canEditAnnualFees($user)) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Nemáte oprávnění k přidávání položek ročních poplatků'
        ]);
        return;
    }
    
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
            'cislo_dokladu' => (!empty($data['cislo_dokladu']) && $data['cislo_dokladu'] !== '') ? $data['cislo_dokladu'] : null,
            'datum_zaplaceno' => (!empty($data['datum_zaplaceno']) && $data['datum_zaplaceno'] !== '') ? $data['datum_zaplaceno'] : null,
            'faktura_id' => isset($data['faktura_id']) ? (int)$data['faktura_id'] : null,
            'poznamka' => isset($data['poznamka']) ? $data['poznamka'] : null,
            'stav' => 'NEZAPLACENO',
            'vytvoril_uzivatel_id' => $user['id'],
            'dt_vytvoreni' => TimezoneHelper::getCzechDateTime()
        ]);
        
        // ✨ Pokud byla přiřazena faktura, aktualizovat fakturu o smlouvu z ročního poplatku
        if (isset($data['faktura_id']) && $data['faktura_id'] > 0 && isset($existing['smlouva_id']) && $existing['smlouva_id']) {
            $tblFaktury = defined('TBL_FAKTURY') ? TBL_FAKTURY : '25a_objednavky_faktury';
            
            // ✅ Použití centralizované helper funkce pro bezpečnou aktualizaci rozsirujici_data
            updateRozsirujiciData(
                $pdo,
                $tblFaktury,
                $data['faktura_id'],
                [
                    'rocni_poplatek' => [
                        'id' => $rocni_poplatek_id,
                        'nazev' => $existing['nazev'],
                        'rok' => $existing['rok'],
                        'prirazeno_dne' => TimezoneHelper::getCzechDateTime(),
                        'prirazeno_uzivatelem_id' => $user['id']
                    ]
                ],
                ['smlouva_id' => $existing['smlouva_id']], // Také přiřadit smlouvu
                $user['id']
            );
        }
        
        // Přepočítání sum v hlavičce
        queryRecalculateAnnualFeeSums($pdo, $rocni_poplatek_id);
        
        $pdo->commit();

        // AUDIT LOG: create item (fail-safe)
        try {
            if (function_exists('audit_log_action')) {
                audit_log_action($pdo, ['id' => $user['id'], 'username' => $user['username'] ?? ''], 'ROCNI_POPLATEK_POLOZKA', $polozka_id, 'CREATE', 'annual-fees/create-item');
            }
        } catch (Exception $ae) { error_log('[AUDIT] annual-fees create-item: ' . $ae->getMessage()); }

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
    // 🔐 KONTROLA PRÁV: EDIT nebo PAYMENT
    // 
    // Pravidla:
    // 1. ANNUAL_FEES_EDIT nebo ANNUAL_FEES_MANAGE → může editovat VŠE
    // 2. ANNUAL_FEES_ITEM_PAYMENT (+ VIEW) → může editovat JEN:
    //    - stav (ZAPLACENO/NEZAPLACENO)
    //    - datum_zaplaceno
    //    - cislo_dokladu
    //
    // Detekce, zda se mění pouze platební údaje:
    // Ignorovat systemová pole (token, username) a metadata
    $paymentFields = ['id', 'stav', 'datum_zaplaceno', 'cislo_dokladu', 'datum_zaplaceni', 'faktura_id'];
    $systemFields = ['token', 'username', 'aktualizoval_uzivatel_id', 'dt_aktualizace'];
    $changedFields = array_keys($data);
    
    // Odfiltrovat systemová pole
    $relevantFields = array_diff($changedFields, $systemFields);
    
    // Zjistit, zda se mění něco kromě platebních polí
    $nonPaymentFields = array_diff($relevantFields, $paymentFields);
    
    $isOnlyPaymentChange = empty($nonPaymentFields);
    
    // 🔍 DEBUG: Logování pro kontrolu
    error_log("🔍 Payment check - relevant fields: " . implode(', ', $relevantFields));
    error_log("🔍 Payment check - non-payment fields: " . implode(', ', $nonPaymentFields));
    error_log("🔍 Payment check - isOnlyPaymentChange: " . ($isOnlyPaymentChange ? 'TRUE' : 'FALSE'));
    
    if ($isOnlyPaymentChange) {
        // Změna pouze platebních údajů - stačí PAYMENT právo
        if (!canMarkPaymentAnnualFees($user)) {
            return [
                'status' => 'error',
                'message' => 'Nemáte oprávnění k označování plateb a úpravě platebních údajů',
                'code' => 403
            ];
        }
    } else {
        // Editace ostatních polí položky - potřeba EDIT právo (včetně ITEM_UPDATE)
        if (!canEditAnnualFeesItems($user)) {
            return [
                'status' => 'error',
                'message' => 'Nemáte oprávnění k editaci položek ročních poplatků',
                'code' => 403
            ];
        }
    }
    
    try {
        // Nastavení české časové zóny
        TimezoneHelper::setMysqlTimezone($pdo);
        
        // 🔍 DEBUG: Logování příchozích dat
        error_log("🔍 handleAnnualFeesUpdateItem - příchozí data: " . json_encode($data, JSON_UNESCAPED_UNICODE));
        
        if (!isset($data['id'])) {
            return ['status' => 'error', 'message' => 'Chybí ID položky'];
        }

        $id = (int)$data['id'];
        
        $tblRocniPoplatky = defined('TBL_ROCNI_POPLATKY') ? TBL_ROCNI_POPLATKY : '25a_rocni_poplatky';
        $tblRocniPoplatkyPolozky = defined('TBL_ROCNI_POPLATKY_POLOZKY') ? TBL_ROCNI_POPLATKY_POLOZKY : '25a_rocni_poplatky_polozky';
        $tblFaktury = defined('TBL_FAKTURY') ? TBL_FAKTURY : '25a_objednavky_faktury';

        $pdo->beginTransaction();
        
        // 🔍 KROK 1: Načíst původní stav položky (před aktualizací)
        $stmtOldItem = $pdo->prepare("
            SELECT faktura_id, rocni_poplatek_id
            FROM `$tblRocniPoplatkyPolozky`
            WHERE id = :id
        ");
        $stmtOldItem->execute(['id' => $id]);
        $oldItem = $stmtOldItem->fetch(PDO::FETCH_ASSOC);
        
        if (!$oldItem) {
            $pdo->rollBack();
            return ['status' => 'error', 'message' => 'Položka nenalezena'];
        }
        
        $oldFakturaId = $oldItem['faktura_id'];
        // ✨ Použít array_key_exists pro detekci null hodnot
        $newFakturaId = array_key_exists('faktura_id', $data) 
            ? ($data['faktura_id'] ? (int)$data['faktura_id'] : null)
            : $oldFakturaId; // Pokud faktura_id není v requestu, ponechat původní

        // Aktualizace položky
        $updateData = [
            'id' => $id,
            'aktualizoval_uzivatel_id' => $user['id'],
            'dt_aktualizace' => TimezoneHelper::getCzechDateTime()
        ];

        $allowedFields = ['nazev_polozky', 'castka', 'datum_splatnosti', 'stav', 'datum_zaplaceni', 'poznamka', 'faktura_id', 'cislo_dokladu', 'datum_zaplaceno', 'rozsirujici_data'];
        foreach ($allowedFields as $field) {
            // ✨ Použít array_key_exists místo isset, protože isset(null) vrací false
            if (array_key_exists($field, $data)) {
                if ($field === 'rozsirujici_data' && is_array($data[$field])) {
                    $updateData[$field] = json_encode($data[$field]);
                } elseif (in_array($field, ['datum_splatnosti', 'datum_zaplaceno', 'datum_zaplaceni'])) {
                    // 🧹 Prázdné stringy pro datumy převést na NULL
                    $updateData[$field] = (!empty($data[$field]) && $data[$field] !== '') ? $data[$field] : null;
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

        // 🧹 KROK 2: Pokud se faktura změnila, vyčistit rocni_poplatek z původní faktury
        if ($oldFakturaId && $oldFakturaId != $newFakturaId) {
            removeRozsirujiciDataKey($pdo, $tblFaktury, $oldFakturaId, 'rocni_poplatek', $user['id']);
            
            // Pokud byla faktura odebrána (newFakturaId je NULL/0), odebrat i smlouvu z faktury
            if (!$newFakturaId || $newFakturaId == 0) {
                $stmtClearContract = $pdo->prepare("
                    UPDATE `$tblFaktury` 
                    SET smlouva_id = NULL,
                        aktualizoval_uzivatel_id = :user_id,
                        dt_aktualizace = :dt_aktualizace
                    WHERE id = :faktura_id
                ");
                $stmtClearContract->execute([
                    'faktura_id' => $oldFakturaId,
                    'user_id' => $user['id'],
                    'dt_aktualizace' => TimezoneHelper::getCzechDateTime()
                ]);
            }
        }

        // ✨ KROK 3: Pokud byla přiřazena nová faktura, aktualizovat ji o smlouvu z ročního poplatku
        if ($newFakturaId && $newFakturaId > 0) {
            // Načíst roční poplatek pro získání smlouvy
            $stmtFee = $pdo->prepare("
                SELECT smlouva_id, nazev, rok
                FROM `$tblRocniPoplatky` 
                WHERE id = :fee_id AND aktivni = 1
            ");
            $stmtFee->execute(['fee_id' => $item['rocni_poplatek_id']]);
            $fee = $stmtFee->fetch(PDO::FETCH_ASSOC);
            
            if ($fee && $fee['smlouva_id']) {
                // ✅ Použití centralizované helper funkce pro bezpečnou aktualizaci rozsirujici_data
                updateRozsirujiciData(
                    $pdo,
                    $tblFaktury,
                    $newFakturaId,
                    [
                        'rocni_poplatek' => [
                            'id' => $item['rocni_poplatek_id'],
                            'nazev' => $fee['nazev'],
                            'rok' => $fee['rok'],
                            'prirazeno_dne' => TimezoneHelper::getCzechDateTime(),
                            'prirazeno_uzivatelem_id' => $user['id']
                        ]
                    ],
                    ['smlouva_id' => $fee['smlouva_id']], // Také přiřadit smlouvu
                    $user['id']
                );
            }
        }

        // Přepočítání sum v hlavičce
        queryRecalculateAnnualFeeSums($pdo, $item['rocni_poplatek_id']);

        $pdo->commit();

        // AUDIT LOG: update item (fail-safe)
        try {
            if (function_exists('audit_log_field_changes') && !empty($item)) {
                $item_after = $pdo->prepare("SELECT * FROM `25a_rocni_poplatky_polozky` WHERE id = ? LIMIT 1");
                $item_after->execute([$item['id']]);
                $item_new = $item_after->fetch(PDO::FETCH_ASSOC) ?: [];
                audit_log_field_changes($pdo, ['id' => $user['id'], 'username' => $user['username'] ?? ''], 'ROCNI_POPLATEK_POLOZKA', (int)$item['id'], 'annual-fees/update-item', (array)$item, (array)$item_new);
            }
        } catch (Exception $ae) { error_log('[AUDIT] annual-fees update-item: ' . $ae->getMessage()); }

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
    // 1. Validace HTTP metody (PHPAPI.prompt.md standard)
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda povolena']);
        return;
    }
    
    // 🔐 KONTROLA PRÁV: DELETE (musí mít i EDIT)
    if (!canDeleteAnnualFees($user)) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Nemáte oprávnění k mazání ročních poplatků'
        ]);
        return;
    }
    
    try {
        // 2. Nastavení české časové zóny (PHPAPI.prompt.md požadavek)
        TimezoneHelper::setMysqlTimezone($pdo);
        
        // 3. Validace povinných parametrů podle PHPAPI.prompt.md
        if (!isset($data['id']) || empty($data['id'])) {
            error_log("❌ Annual Fees Delete: Chybí ID parametr");
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Chybí ID ročního poplatku']);
            return;
        }

        $id = filter_var($data['id'], FILTER_VALIDATE_INT);
        if ($id === false || $id <= 0) {
            error_log("❌ Annual Fees Delete: Neplatné ID: " . $data['id']);
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Neplatné ID ročního poplatku']);
            return;
        }

        error_log("🔥 Annual Fees Delete: Mazání ID $id, user: " . $user['id']);

        // AUDIT LOG: before hard delete (fail-safe)
        try {
            if (function_exists('audit_log_action')) {
                audit_log_action($pdo, ['id' => $user['id'], 'username' => $user['username'] ?? ''], 'ROCNI_POPLATEK', $id, 'DELETE', 'annual-fees/delete', 'Hard delete ročního poplatku');
            }
        } catch (Exception $ae) { error_log('[AUDIT] annual-fees delete: ' . $ae->getMessage()); }

        // 4. Hard delete s SQL DELETE příkazem (místo soft delete jak požadoval uživatel)
        $result = queryHardDeleteAnnualFee($pdo, $id);

        if (!$result) {
            error_log("❌ Annual Fees Delete: Roční poplatek ID $id nenalezen");
            http_response_code(404);
            echo json_encode([
                'status' => 'error', 
                'message' => 'Roční poplatek nenalezen'
            ]);
            return;
        }

        
        // 5. Úspěšná odpověď podle PHPAPI.prompt.md standardu
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Roční poplatek byl úspěšně smazán (včetně všech položek)'
        ]);
        return;

    } catch (Exception $e) {
        error_log("❌ Annual Fees Delete Handler Error: " . $e->getMessage());
        error_log("❌ Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při mazání ročního poplatku: ' . $e->getMessage()
        ]);
        return;
    }
}

// ============================================================================
// 📊 STATS - Statistiky
// ============================================================================

function handleAnnualFeesStats($pdo, $data, $user) {
    // 🔐 KONTROLA PRÁV: VIEW (pro statistiky stačí VIEW)
    if (!canViewAnnualFees($user)) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Nemáte oprávnění k zobrazení statistik ročních poplatků'
        ]);
        return;
    }
    
    try {
        // Nastavení české časové zóny
        TimezoneHelper::setMysqlTimezone($pdo);
        
        $rok = isset($data['rok']) ? (int)$data['rok'] : null;
        $stats = queryAnnualFeesStats($pdo, $rok);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => $stats
        ]);

    } catch (Exception $e) {
        error_log("❌ Annual Fees Stats Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při načítání statistik: ' . $e->getMessage()
        ]);
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

// ============================================================================
// ❌ DELETE ITEM - Smazání položky ročního poplatku
// ============================================================================

function handleAnnualFeesDeleteItem($pdo, $data, $user) {
    // 1. Validace HTTP metody
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Pouze POST metoda povolena']);
        return;
    }
    
    // 🔐 KONTROLA PRÁV: DELETE (musí mít i EDIT)
    if (!canDeleteAnnualFees($user)) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'Nemáte oprávnění k mazání položek ročních poplatků'
        ]);
        return;
    }
    
    try {
        TimezoneHelper::setMysqlTimezone($pdo);
        
        // Validace ID položky
        if (!isset($data['id']) || !is_numeric($data['id'])) {
            error_log("❌ Annual Fees DELETE ITEM: Chybí nebo neplatné ID položky");
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Chybí nebo neplatné ID položky']);
            return;
        }
        
        $polozka_id = (int)$data['id'];
        
        // Načíst existující položku pro kontrolu stavu a údajů
        $existing = queryGetAnnualFeeItem($pdo, $polozka_id);
        if (!$existing) {
            error_log("❌ Annual Fees DELETE ITEM: Položka s ID $polozka_id neexistuje");
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Položka neexistuje']);
            return;
        }
        
        // 🚫 KONTROLA: Nelze smazat zaplacenou položku
        if ($existing['stav'] === 'ZAPLACENO') {
            error_log("❌ Annual Fees DELETE ITEM: Nelze smazat zaplacenou položku ID $polozka_id");
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Nelze smazat zaplacenou položku. Nejprve zrušte platbu.']);
            return;
        }
        
        $rocni_poplatek_id = $existing['rocni_poplatek_id'];
        
        $pdo->beginTransaction();
        
        // Soft delete položky
        $sql = "UPDATE `" . TBL_ROCNI_POPLATKY_POLOZKY . "` 
                SET aktivni = 0, 
                    aktualizoval_uzivatel_id = :user_id,
                    dt_aktualizace = :dt_aktualizace
                WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $polozka_id,
            ':user_id' => $user['id'],
            ':dt_aktualizace' => TimezoneHelper::getCzechDateTime()
        ]);
        
        // Přepočítání sum v hlavičce
        queryRecalculateAnnualFeeSums($pdo, $rocni_poplatek_id);
        
        $pdo->commit();
        
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Položka byla úspěšně smazána',
            'data' => [
                'id' => $polozka_id,
                'rocni_poplatek_id' => $rocni_poplatek_id
            ]
        ]);
        return;
        
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("❌ Annual Fees Delete Item Error: " . $e->getMessage());
        error_log("❌ Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Chyba při mazání položky: ' . $e->getMessage()
        ]);
        return;
    }
}

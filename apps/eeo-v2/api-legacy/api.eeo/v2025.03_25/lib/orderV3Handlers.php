<?php
/**
 * Order V3 API Handlers - OPTIMALIZOVANÉ PRO REACT FRONTEND
 * 
 * 🎯 ENDPOINTY:
 * - POST order-v3/list        → Seznam objednávek s paging a statistikami
 * - POST order-v3/stats       → Pouze statistiky (pro dashboard)
 * - POST order-v3/items       → Detail položek objednávky (lazy loading)
 * 
 * ✅ FEATURES:
 * - Server-side pagination
 * - Optimalizované queries (JOINy, indexy)
 * - Timezone handling přes TimezoneHelper
 * - Filtrování a třídění
 * - Lazy loading podřádků
 * 
 * 📅 Created: 2026-01-23
 */

require_once __DIR__ . '/TimezoneHelper.php';
require_once __DIR__ . '/handlers.php';
require_once __DIR__ . '/hierarchyOrderFilters.php';

// Import Order V2 permissions functions for compatibility
if (file_exists(__DIR__ . '/orderV2Endpoints.php')) {
    require_once __DIR__ . '/orderV2Endpoints.php';
}

/**
 * Vypočítá datový rozsah podle zvoleného období
 * @param string $period - 'all', 'current-month', 'last-month', 'last-quarter', 'all-months'
 * @return array|null - ['date_from' => 'Y-m-d', 'date_to' => 'Y-m-d'] nebo null pro 'all'
 */
function calculatePeriodRange($period) {
    $today = date('Y-m-d');
    
    switch ($period) {
        case 'current-month':
            // První den aktuálního měsíce až dnes
            return array(
                'date_from' => date('Y-m-01'),
                'date_to' => $today
            );
            
        case 'last-month':
            // Posledních 30 dní
            return array(
                'date_from' => date('Y-m-d', strtotime('-30 days')),
                'date_to' => $today
            );
            
        case 'last-quarter':
            // Posledních 90 dní (~ kvartál)
            return array(
                'date_from' => date('Y-m-d', strtotime('-90 days')),
                'date_to' => $today
            );
            
        case 'all-months':
            // Celý aktuální rok
            return array(
                'date_from' => date('Y') . '-01-01',
                'date_to' => date('Y') . '-12-31'
            );
            
        case 'all':
        default:
            // Bez omezení
            return null;
    }
}

/**
 * Parsuje hodnotu s operátorem (>=10000, >10000, =10000, <10000, <=10000)
 * @param string $input - Input z frontendu (např. ">=10000")
 * @return array|null - ['operator' => '>=', 'value' => 10000] nebo null
 */
function parseOperatorValue($input) {
    if (empty($input)) {
        return null;
    }
    
    // Regex pro operátor a číslo
    if (preg_match('/^(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)$/', trim($input), $matches)) {
        return array(
            'operator' => $matches[1],
            'value' => floatval($matches[2])
        );
    }
    
    // Pokud není operátor, default je =
    if (is_numeric($input)) {
        return array(
            'operator' => '=',
            'value' => floatval($input)
        );
    }
    
    return null;
}

/**
 * Bezpečné JSON parsování - stejné jako v OrderV2Handler
 * 
 * @param string|null $json JSON string
 * @param mixed $default Výchozí hodnota pokud parsování selže
 * @return mixed Parsovaná data nebo $default
 */
function safeJsonDecode($json, $default = null) {
    if ($json === null || $json === '') {
        return $default;
    }
    
    $decoded = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg() . " for: " . $json);
        return $default;
    }
    
    return $decoded;
}

/**
 * Parsuje pole financování z DB - vrací array nebo null
 * Stejná logika jako OrderV2Handler::transformRawData()
 * 
 * @param string|null $financovaniRaw Surová hodnota z DB (TEXT/JSON)
 * @return array|null Parsované pole nebo null
 */
function parseFinancovani($financovaniRaw) {
    if ($financovaniRaw === null || $financovaniRaw === '') {
        return null;
    }
    
    $financovani = safeJsonDecode($financovaniRaw, null);
    if (is_array($financovani)) {
        return $financovani;
    }
    
    return null;
}

/**
 * Načte LP detaily podle ID z tabulky 25_limitovane_prisliby
 * @param PDO $db
 * @param int $lp_id
 * @return array|null - Array s cislo_lp a nazev_uctu nebo null
 */
function getLPDetailyV3($db, $lp_id) {
    if (empty($lp_id)) return null;
    
    try {
        $stmt = $db->prepare("SELECT cislo_lp, nazev_uctu FROM " . TBL_LIMITOVANE_PRISLIBY . " WHERE id = ? LIMIT 1");
        $stmt->execute(array($lp_id));
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result : null;
    } catch (Exception $e) {
        error_log("getLPDetailyV3 Error: " . $e->getMessage());
        return null;
    }
}

/**
 * Obohacení financování o LP názvy z tabulky 25_limitovane_prisliby
 * @param PDO $db
 * @param array $order - Reference na objednávku (bude upravena)
 */
function enrichFinancovaniV3($db, &$order) {
    if (!isset($order['financovani']) || !is_array($order['financovani'])) {
        return;
    }
    
    // Manuální mapování typů financování na lidské názvy
    if (isset($order['financovani']['typ']) && !empty($order['financovani']['typ'])) {
        $typ_nazvy = array(
            'LP' => 'Limitovaný příslib',
            'SMLOUVA' => 'Smlouva',
            'INDIVIDUALNI_SCHVALENI' => 'Individuální schválení',
            'FINKP' => 'Finanční kontrola'
        );
        
        if (isset($typ_nazvy[$order['financovani']['typ']])) {
            $order['financovani']['typ_nazev'] = $typ_nazvy[$order['financovani']['typ']];
        }
    }
    
    // LP názvy - načíst z tabulky limitovane_prisliby
    if (isset($order['financovani']['lp_kody']) && is_array($order['financovani']['lp_kody'])) {
        $lp_nazvy = array();
        
        foreach ($order['financovani']['lp_kody'] as $lp_id) {
            $lp = getLPDetailyV3($db, $lp_id);
            
            if ($lp) {
                $lp_nazvy[] = array(
                    'id' => $lp_id,
                    'cislo_lp' => $lp['cislo_lp'],
                    'kod' => $lp['cislo_lp'],
                    'nazev' => $lp['nazev_uctu']
                );
            }
        }
        
        if (!empty($lp_nazvy)) {
            $order['financovani']['lp_nazvy'] = $lp_nazvy;
        }
    }
}

/**
 * Obohacení dodavatele - pokud je dodavatel_id, načte celé info z tabulky dodavatelů
 * @param PDO $db
 * @param array $order - Reference na objednávku (bude upravena)
 */
function enrichDodavatelV3($db, &$order) {
    if (empty($order['dodavatel_id'])) {
        return;
    }
    
    try {
        $stmt = $db->prepare("
            SELECT id, nazev, ico, dic, ulice, mesto, psc, stat, kontakt_jmeno, kontakt_email, kontakt_telefon
            FROM " . TBL_DODAVATELE . "
            WHERE id = ?
            LIMIT 1
        ");
        $stmt->execute(array($order['dodavatel_id']));
        $dodavatel = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($dodavatel) {
            if (!isset($order['_enriched'])) {
                $order['_enriched'] = array();
            }
            $order['_enriched']['dodavatel'] = $dodavatel;
        }
    } catch (Exception $e) {
        error_log("enrichDodavatelV3 Error: " . $e->getMessage());
    }
}

/**
 * Obohacení registru zveřejnění - data PŘÍMO z objednávky (ne z modulu smluv)
 * @param PDO $db
 * @param array $order - Reference na objednávku (bude upravena)
 */
function enrichRegistrZverejneniV3($db, &$order) {
    $registr = array(
        'zverejnit' => isset($order['zverejnit']) ? $order['zverejnit'] : null,
        'dt_zverejneni' => isset($order['dt_zverejneni']) ? $order['dt_zverejneni'] : null,
        'registr_iddt' => isset($order['registr_iddt']) ? $order['registr_iddt'] : null,
        'zverejnil' => null
    );
    
    // Načíst uživatele který zveřejnil
    if (!empty($order['zverejnil_id'])) {
        try {
            $stmt = $db->prepare("
                SELECT id, jmeno, prijmeni, email, titul_pred, titul_za
                FROM " . TBL_UZIVATELE . "
                WHERE id = ?
                LIMIT 1
            ");
            $stmt->execute(array($order['zverejnil_id']));
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                $celeMeno = '';
                if (!empty($user['titul_pred'])) {
                    $celeMeno .= $user['titul_pred'] . ' ';
                }
                $celeMeno .= trim($user['jmeno'] . ' ' . $user['prijmeni']);
                if (!empty($user['titul_za'])) {
                    $celeMeno .= ', ' . $user['titul_za'];
                }
                
                $registr['zverejnil'] = array(
                    'cele_jmeno' => $celeMeno,
                    'email' => $user['email'],
                    'datum' => $registr['dt_zverejneni']
                );
            }
        } catch (Exception $e) {
            error_log("enrichRegistrZverejneniV3 Error: " . $e->getMessage());
        }
    }
    
    $order['registr_smluv'] = $registr;
}

/**
 * POST order-v3/list
 * Načte seznam objednávek s paging a statistikami
 * 
 * REQUEST BODY:
 * {
 *   "token": "xxx",
 *   "username": "user@domain.cz",
 *   "page": 1,
 *   "per_page": 50,
 *   "year": 2026,
 *   "filters": {
 *     "cislo_objednavky": "OBJ",
 *     "dodavatel_nazev": "ČSOB",
 *     "stav_objednavky": "SCHVALENA"
 *   },
 *   "sorting": [
 *     {"id": "dt_objednavky", "desc": true},
 *     {"id": "cislo_objednavky", "desc": false}
 *   ]
 * }
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "data": {
 *     "orders": [...],
 *     "pagination": {
 *       "page": 1,
 *       "per_page": 50,
 *       "total": 127,
 *       "total_pages": 3
 *     },
 *     "stats": {
 *       "total": 127,
 *       "nove": 5,
 *       "ke_schvaleni": 12,
 *       "schvalene": 45,
 *       "potvrzene": 30,
 *       "uverejnene": 25,
 *       "dokoncene": 10
 *     }
 *   }
 * }
 */
function handle_order_v3_list($input, $config, $queries) {
    // 1. Validace požadavku
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    // 2. Autentizace
    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    $user_id = isset($token_data['id']) ? (int)$token_data['id'] : 0;

    try {
        // 3. Připojení k DB
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        TimezoneHelper::setMysqlTimezone($db);

        // 4. Parametry paginace
        $page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
        $per_page = isset($input['per_page']) ? max(1, min(500, (int)$input['per_page'])) : 50;
        $offset = ($page - 1) * $per_page;
        
        // DEBUG: Log pagination params
        error_log("[OrderV3] Pagination params: page=$page, per_page=$per_page, offset=$offset");
        
        // 5. Období pro filtrování (místo roku)
        $period = isset($input['period']) ? $input['period'] : 'all';
        
        // 6. Filtry
        $filters = isset($input['filters']) ? $input['filters'] : array();
        
        // 7. Třídění
        $sorting = isset($input['sorting']) ? $input['sorting'] : array();

        // 8. Sestavit WHERE podmínky
        $where_conditions = array();
        $where_params = array();
        
        // Aktivní záznamy
        $where_conditions[] = "o.aktivni = 1";
        
        // ⚠️ IGNORE testovací/vzorová objednávka s ID 1 - VŽDY vyloučit ze všech výsledků
        $where_conditions[] = "o.id != 1";
        
        // Období - filtrování podle datumu
        $period_range = calculatePeriodRange($period);
        if ($period_range !== null) {
            $where_conditions[] = "o.dt_objednavky BETWEEN ? AND ?";
            $where_params[] = $period_range['date_from'];
            $where_params[] = $period_range['date_to'];
            error_log("[OrderV3] Period filter: {$period} -> {$period_range['date_from']} to {$period_range['date_to']}");
        } else {
            error_log("[OrderV3] Period filter: {$period} -> no date restriction");
        }
        
        // Dynamické filtry
        if (!empty($filters['cislo_objednavky'])) {
            $where_conditions[] = "o.cislo_objednavky LIKE ?";
            $where_params[] = '%' . $filters['cislo_objednavky'] . '%';
        }
        
        if (!empty($filters['dodavatel_nazev'])) {
            $where_conditions[] = "d.nazev LIKE ?";
            $where_params[] = '%' . $filters['dodavatel_nazev'] . '%';
        }
        
        if (!empty($filters['predmet'])) {
            $where_conditions[] = "o.predmet LIKE ?";
            $where_params[] = '%' . $filters['predmet'] . '%';
        }
        
        // 🔍 DEBUG: Log příchozích filtrů
        error_log("[OrderV3 FILTERS] Received filters: " . json_encode($filters));
        
        // ========================================================================
        // FILTRY PODLE ID (POLE) - priorita před textovými filtry
        // ========================================================================
        
        // Objednatel - filtr podle pole ID
        if (!empty($filters['objednatel']) && is_array($filters['objednatel'])) {
            $ids = array_map('intval', $filters['objednatel']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.objednatel_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Garant - filtr podle pole ID
        if (!empty($filters['garant']) && is_array($filters['garant'])) {
            $ids = array_map('intval', $filters['garant']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.garant_uzivatel_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Příkazce - filtr podle pole ID
        if (!empty($filters['prikazce']) && is_array($filters['prikazce'])) {
            $ids = array_map('intval', $filters['prikazce']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.prikazce_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Schvalovatel - filtr podle pole ID
        if (!empty($filters['schvalovatel']) && is_array($filters['schvalovatel'])) {
            $ids = array_map('intval', $filters['schvalovatel']);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where_conditions[] = "o.schvalovatel_id IN ($placeholders)";
            foreach ($ids as $id) {
                $where_params[] = $id;
            }
        }
        
        // Status - filtr podle pole workflow kódů
        if (!empty($filters['stav']) && is_array($filters['stav'])) {
            // Převést české názvy na workflow kódy
            $stav_map = array(
                'NOVA' => 'NOVA',
                'KE_SCHVALENI' => 'ODESLANA_KE_SCHVALENI',
                'SCHVALENA' => 'SCHVALENA',
                'ZAMITNUTA' => 'ZAMITNUTA',
                'ROZPRACOVANA' => 'ROZPRACOVANA',
                'ODESLANA' => 'ODESLANA',
                'POTVRZENA' => 'POTVRZENA',
                'K_UVEREJNENI_DO_REGISTRU' => 'UVEREJNIT', // ✅ Fixed mapping
                'UVEREJNENA' => 'UVEREJNIT',
                'FAKTURACE' => 'FAKTURACE',
                'VECNA_SPRAVNOST' => 'VECNA_SPRAVNOST',
                'ZKONTROLOVANA' => 'ZKONTROLOVANA',
                'DOKONCENA' => 'DOKONCENA',
                'ZRUSENA' => 'ZRUSENA',
                'SMAZANA' => 'SMAZANA'
            );
            
            $workflow_conditions = array();
            foreach ($filters['stav'] as $stav_key) {
                if (isset($stav_map[$stav_key])) {
                    $workflow_kod = $stav_map[$stav_key];
                    if ($stav_key === 'NOVA') {
                        $workflow_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, '$[0]')) = ?";
                    } else {
                        $workflow_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = ?";
                    }
                    $where_params[] = $workflow_kod;
                }
            }
            if (!empty($workflow_conditions)) {
                $where_conditions[] = '(' . implode(' OR ', $workflow_conditions) . ')';
            }
        }
        
        // ========================================================================
        // TEXTOVÉ FILTRY (SLOUPCOVÉ) - pro kombinované sloupce z tabulky
        // ========================================================================
        
        // Filtr pro objednatele a garanta - pokud jsou stejné, použít OR logiku
        $objednatel_filter = !empty($filters['objednatel_jmeno']) ? $filters['objednatel_jmeno'] : '';
        $garant_filter = !empty($filters['garant_jmeno']) ? $filters['garant_jmeno'] : '';
        
        // Pokud jsou oba filtry stejné (kombinovaný sloupec z FE), použít OR
        if ($objednatel_filter && $garant_filter && $objednatel_filter === $garant_filter) {
            $where_conditions[] = "(CONCAT(u1.jmeno, ' ', u1.prijmeni) LIKE ? OR CONCAT(u2.jmeno, ' ', u2.prijmeni) LIKE ?)";
            $where_params[] = '%' . $objednatel_filter . '%';
            $where_params[] = '%' . $objednatel_filter . '%';
        } else {
            // Jinak jsou to samostatné filtry, použít AND
            if ($objednatel_filter) {
                $where_conditions[] = "CONCAT(u1.jmeno, ' ', u1.prijmeni) LIKE ?";
                $where_params[] = '%' . $objednatel_filter . '%';
            }
            if ($garant_filter) {
                $where_conditions[] = "CONCAT(u2.jmeno, ' ', u2.prijmeni) LIKE ?";
                $where_params[] = '%' . $garant_filter . '%';
            }
        }
        
        // Filtr pro příkazce a schvalovatele - pokud jsou stejné, použít OR logiku
        $prikazce_filter = !empty($filters['prikazce_jmeno']) ? $filters['prikazce_jmeno'] : '';
        $schvalovatel_filter = !empty($filters['schvalovatel_jmeno']) ? $filters['schvalovatel_jmeno'] : '';
        
        // Pokud jsou oba filtry stejné (kombinovaný sloupec z FE), použít OR
        if ($prikazce_filter && $schvalovatel_filter && $prikazce_filter === $schvalovatel_filter) {
            $where_conditions[] = "(CONCAT(u3.jmeno, ' ', u3.prijmeni) LIKE ? OR CONCAT(u4.jmeno, ' ', u4.prijmeni) LIKE ?)";
            $where_params[] = '%' . $prikazce_filter . '%';
            $where_params[] = '%' . $prikazce_filter . '%';
        } else {
            // Jinak jsou to samostatné filtry, použít AND
            if ($prikazce_filter) {
                $where_conditions[] = "CONCAT(u3.jmeno, ' ', u3.prijmeni) LIKE ?";
                $where_params[] = '%' . $prikazce_filter . '%';
            }
            if ($schvalovatel_filter) {
                $where_conditions[] = "CONCAT(u4.jmeno, ' ', u4.prijmeni) LIKE ?";
                $where_params[] = '%' . $schvalovatel_filter . '%';
            }
        }
        
        // Filtr pro financování - hledá v JSON poli dle typu nebo typu názvu
        if (!empty($filters['financovani'])) {
            // Vyhledává v financovani JSON poli podle typu nebo typ_nazev
            $financovani_search = $filters['financovani'];
            // Hledáme v JSON: buď typ (LP, SMLOUVA), nebo typ_nazev (Limitovaný příslib, Smlouva)
            $where_conditions[] = "(o.financovani LIKE ?)";
            $where_params[] = '%' . $financovani_search . '%';
        }
        
        // Filtr pro workflow stav
        if (!empty($filters['stav_workflow'])) {
            $stav = $filters['stav_workflow'];
            
            // Mapování frontend stavu na backend workflow kód
            $stav_map = array(
                'nova' => 'NOVA',
                'ke_schvaleni' => 'ODESLANA_KE_SCHVALENI',
                'schvalena' => 'SCHVALENA',
                'zamitnuta' => 'ZAMITNUTA',
                'rozpracovana' => 'ROZPRACOVANA',
                'odeslana' => 'ODESLANA',
                'potvrzena' => 'POTVRZENA',
                'k_uverejneni_do_registru' => 'UVEREJNIT', // ✅ Fixed mapping
                'uverejnena' => 'UVEREJNIT',
                'fakturace' => 'FAKTURACE',
                'vecna_spravnost' => 'VECNA_SPRAVNOST',
                'zkontrolovana' => 'ZKONTROLOVANA',
                'dokoncena' => 'DOKONCENA',
                'zrusena' => 'ZRUSENA',
                'smazana' => 'SMAZANA'
            );
            
            if (isset($stav_map[$stav])) {
                $workflow_kod = $stav_map[$stav];
                
                // Pro NOVA kontroluj první element pole (index 0)
                if ($stav === 'nova') {
                    $where_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, '$[0]')) = ?";
                } else {
                    // Pro ostatní kontroluj poslední element
                    $where_conditions[] = "JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = ?";
                }
                $where_params[] = $workflow_kod;
            }
        }
        
        // Filtr "moje objednávky" - kde jsem objednatel, garant, příkazce nebo schvalovatel
        if (!empty($filters['moje_objednavky']) && $filters['moje_objednavky'] === true) {
            $where_conditions[] = "(o.objednatel_id = ? OR o.garant_uzivatel_id = ? OR o.prikazce_id = ? OR o.schvalovatel_id = ?)";
            $where_params[] = $user_id;
            $where_params[] = $user_id;
            $where_params[] = $user_id;
            $where_params[] = $user_id;
        }
        
        // Filtr pro mimořádné události
        if (!empty($filters['mimoradne_udalosti']) && $filters['mimoradne_udalosti'] === true) {
            $where_conditions[] = "o.mimoradna_udalost = 1";
        }
        
        // Filtr pro objednávky s fakturami
        if (!empty($filters['s_fakturou']) && $filters['s_fakturou'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1)";
        }
        
        // Filtr pro objednávky s přílohami
        if (!empty($filters['s_prilohami']) && $filters['s_prilohami'] === true) {
            $where_conditions[] = "EXISTS (SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p WHERE p.objednavka_id = o.id AND p.aktivni = 1)";
        }
        
        // Filtr pro dodavatele (mapování z dodavatel_nazev na dodavatel)
        if (!empty($filters['dodavatel'])) {
            $where_conditions[] = "d.nazev LIKE ?";
            $where_params[] = '%' . $filters['dodavatel'] . '%';
        }
        
        // Datumové filtry
        if (!empty($filters['datum_od'])) {
            $where_conditions[] = "DATE(o.dt_objednavky) >= ?";
            $where_params[] = $filters['datum_od'];
        }
        
        if (!empty($filters['datum_do'])) {
            $where_conditions[] = "DATE(o.dt_objednavky) <= ?";
            $where_params[] = $filters['datum_do'];
        }
        
        // Číselné filtry s operátory (>=10000, <=50000, =25000)
        // Format: ">=10000" nebo ">10000" nebo "=10000"
        
        // DEBUG: Log příchozích číselných filtrů
        if (!empty($filters['cena_max']) || !empty($filters['cena_polozky']) || !empty($filters['cena_faktury'])) {
            error_log("[OrderV3] Number filters received: cena_max=" . ($filters['cena_max'] ?? 'null') . 
                      ", cena_polozky=" . ($filters['cena_polozky'] ?? 'null') . 
                      ", cena_faktury=" . ($filters['cena_faktury'] ?? 'null'));
        }
        
        // max_cena_s_dph - maximální cena objednávky
        // Podporuje buď operátory (>=10000) nebo rozsah (cena_max + cena_max_to)
        if (!empty($filters['cena_max'])) {
            $parsed = parseOperatorValue($filters['cena_max']);
            if ($parsed) {
                error_log("[OrderV3] Parsed cena_max: operator={$parsed['operator']}, value={$parsed['value']}");
                $where_conditions[] = "o.max_cena_s_dph {$parsed['operator']} ?";
                $where_params[] = $parsed['value'];
            } else {
                error_log("[OrderV3] Failed to parse cena_max: {$filters['cena_max']}");
            }
        }
        
        // Cenový rozsah (od-do) z filtrovacího panelu
        if (!empty($filters['cena_max_od']) && !empty($filters['cena_max_do'])) {
            $where_conditions[] = "o.max_cena_s_dph BETWEEN ? AND ?";
            $where_params[] = floatval($filters['cena_max_od']);
            $where_params[] = floatval($filters['cena_max_do']);
        } elseif (!empty($filters['cena_max_od'])) {
            $where_conditions[] = "o.max_cena_s_dph >= ?";
            $where_params[] = floatval($filters['cena_max_od']);
        } elseif (!empty($filters['cena_max_do'])) {
            $where_conditions[] = "o.max_cena_s_dph <= ?";
            $where_params[] = floatval($filters['cena_max_do']);
        }
        
        // cena_polozky - součet cen položek (HAVING klauzule kvůli subquery)
        if (!empty($filters['cena_polozky'])) {
            $parsed = parseOperatorValue($filters['cena_polozky']);
            if ($parsed) {
                // Použijeme EXISTS s subquery, protože nemůžeme použít HAVING ve WHERE
                $where_conditions[] = "EXISTS (
                    SELECT 1 
                    FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                    WHERE pol.objednavka_id = o.id 
                    GROUP BY pol.objednavka_id 
                    HAVING SUM(pol.cena_s_dph) {$parsed['operator']} ?
                )";
                $where_params[] = $parsed['value'];
            }
        }
        
        // cena_faktury - součet částek faktur
        if (!empty($filters['cena_faktury'])) {
            $parsed = parseOperatorValue($filters['cena_faktury']);
            if ($parsed) {
                // Použijeme EXISTS s subquery
                $where_conditions[] = "EXISTS (
                    SELECT 1 
                    FROM " . TBL_FAKTURY . " f 
                    WHERE f.objednavka_id = o.id AND f.aktivni = 1
                    GROUP BY f.objednavka_id 
                    HAVING SUM(f.fa_castka) {$parsed['operator']} ?
                )";
                $where_params[] = $parsed['value'];
            }
        }
        
        // ========================================================================
        // STAV REGISTRU (checkboxy: publikováno, nepublikováno, nezveřejňovat)
        // ========================================================================
        if (!empty($filters['stav_registru']) && is_array($filters['stav_registru'])) {
            $stav_conditions = array();
            
            foreach ($filters['stav_registru'] as $stav) {
                switch ($stav) {
                    case 'publikovano':
                        // Bylo zveřejněno v registru (existuje dt_zverejneni)
                        $stav_conditions[] = "o.dt_zverejneni IS NOT NULL";
                        break;
                    case 'nepublikovano':
                        // Má být zveřejněno (zverejnit IS NOT NULL), ale ještě nebylo (dt_zverejneni IS NULL)
                        $stav_conditions[] = "(o.zverejnit IS NOT NULL AND o.dt_zverejneni IS NULL)";
                        break;
                    case 'nezverejnovat':
                        // Nemá být vůbec zveřejněno (zverejnit IS NULL)
                        $stav_conditions[] = "o.zverejnit IS NULL";
                        break;
                }
            }
            
            if (!empty($stav_conditions)) {
                $where_conditions[] = '(' . implode(' OR ', $stav_conditions) . ')';
            }
        }

        // ========================================================================
        // USER PERMISSIONS - Order V2 COMPATIBLE IMPLEMENTATION
        // ========================================================================
        // 🎯 PODLE ZADÁNÍ: "naprosto identicky vc. zohledneni prip. org heirachie"
        // Používáme STEJNOU logiku jako Order V2 pro maximální kompatibilitu!
        // ========================================================================
        
        // Načtení user permissions a rolí (Order V2 compatible)
        $user_permissions = function_exists('getUserOrderPermissions') ? 
            getUserOrderPermissions($user_id, $db) : [];
        $user_roles = function_exists('getUserRoles') ? 
            getUserRoles($user_id, $db) : [];
            
        error_log("[OrderV3] User permissions: " . json_encode($user_permissions));
        error_log("[OrderV3] User roles: " . json_encode($user_roles));
        
        // Check admin role (SUPERADMIN nebo ADMINISTRATOR)
        $isAdminByRole = in_array('SUPERADMIN', $user_roles) || in_array('ADMINISTRATOR', $user_roles);
        
        // Check read all permissions
        $hasOrderReadAll = in_array('ORDER_READ_ALL', $user_permissions);
        $hasOrderViewAll = in_array('ORDER_VIEW_ALL', $user_permissions);
        $hasReadAllPermissions = $hasOrderReadAll || $hasOrderViewAll;
        
        // Final admin status
        $is_admin_v2 = $isAdminByRole || $hasReadAllPermissions;
        
        error_log("[OrderV3] Admin check - by role: " . ($isAdminByRole ? 'YES' : 'NO') . 
                  ", by permissions: " . ($hasReadAllPermissions ? 'YES' : 'NO') . 
                  ", FINAL: " . ($is_admin_v2 ? 'ADMIN' : 'USER'));
        
        if (!$is_admin_v2 && $user_id > 0) {
            // ========================================================================
            // NON-ADMIN USERS: Order V2 Compatible Visibility Logic
            // ========================================================================
            
            $visibilityConditions = [];
            
            // 1️⃣ ROLE-BASED FILTER (12 polí) - ZÁKLAD
            error_log("[OrderV3] Building role-based filter (12 fields) for user $user_id");
            
            $roleBasedCondition = "(
                o.uzivatel_id = :role_user_id
                OR o.objednatel_id = :role_user_id
                OR o.garant_uzivatel_id = :role_user_id
                OR o.schvalovatel_id = :role_user_id
                OR o.prikazce_id = :role_user_id
                OR o.uzivatel_akt_id = :role_user_id
                OR o.odesilatel_id = :role_user_id
                OR o.dodavatel_potvrdil_id = :role_user_id
                OR o.zverejnil_id = :role_user_id
                OR o.fakturant_id = :role_user_id
                OR o.dokoncil_id = :role_user_id
                OR o.potvrdil_vecnou_spravnost_id = :role_user_id
            )";
            
            $visibilityConditions[] = $roleBasedCondition;
            $where_params[] = $user_id; // role_user_id
            
            // 2️⃣ HIERARCHIE - ROZŠÍŘENÍ (pokud je aktivní)
            if (function_exists('applyHierarchyFilterToOrders')) {
                error_log("[OrderV3] Checking hierarchy filter for user $user_id");
                $hierarchyFilter = applyHierarchyFilterToOrders($user_id, $db);
                
                if ($hierarchyFilter !== null) {
                    $visibilityConditions[] = $hierarchyFilter;
                    error_log("[OrderV3] Hierarchy filter ADDED (expands visibility)");
                } else {
                    error_log("[OrderV3] Hierarchy filter NOT applied");
                }
            }
            
            // 3️⃣ DEPARTMENT SUBORDINATE - ROZŠÍŘENÍ
            $hasOrderReadSubordinate = in_array('ORDER_READ_SUBORDINATE', $user_permissions);
            $hasOrderEditSubordinate = in_array('ORDER_EDIT_SUBORDINATE', $user_permissions);
            
            if ($hasOrderReadSubordinate || $hasOrderEditSubordinate) {
                if (function_exists('getUserDepartmentColleagueIds')) {
                    error_log("[OrderV3] Building department filter for user $user_id");
                    $departmentColleagueIds = getUserDepartmentColleagueIds($user_id, $db);
                    
                    if (!empty($departmentColleagueIds)) {
                        $departmentColleagueIdsStr = implode(',', array_map('intval', $departmentColleagueIds));
                        
                        $departmentCondition = "(
                            o.uzivatel_id IN ($departmentColleagueIdsStr)
                            OR o.objednatel_id IN ($departmentColleagueIdsStr)
                            OR o.garant_uzivatel_id IN ($departmentColleagueIdsStr)
                            OR o.schvalovatel_id IN ($departmentColleagueIdsStr)
                            OR o.prikazce_id IN ($departmentColleagueIdsStr)
                            OR o.uzivatel_akt_id IN ($departmentColleagueIdsStr)
                            OR o.odesilatel_id IN ($departmentColleagueIdsStr)
                            OR o.dodavatel_potvrdil_id IN ($departmentColleagueIdsStr)
                            OR o.zverejnil_id IN ($departmentColleagueIdsStr)
                            OR o.fakturant_id IN ($departmentColleagueIdsStr)
                            OR o.dokoncil_id IN ($departmentColleagueIdsStr)
                            OR o.potvrdil_vecnou_spravnost_id IN ($departmentColleagueIdsStr)
                        )";
                        
                        $visibilityConditions[] = $departmentCondition;
                        error_log("[OrderV3] Department filter ADDED for " . count($departmentColleagueIds) . " colleagues");
                    }
                }
            }
            
            // 4️⃣ KOMBINACE S OR LOGIKOU - Order V2 compatible
            if (!empty($visibilityConditions)) {
                if (count($visibilityConditions) == 1) {
                    // Jen role-based
                    $where_conditions[] = $visibilityConditions[0];
                    error_log("[OrderV3] Visibility: Only role-based filter applied");
                } else {
                    // Role-based + rozšíření
                    $combinedFilter = "(" . implode(" OR ", $visibilityConditions) . ")";
                    $where_conditions[] = $combinedFilter;
                    error_log("[OrderV3] Visibility: Combined " . count($visibilityConditions) . " filters with OR logic");
                }
            }
            
        } else {
            error_log("[OrderV3] ADMIN mode - showing ALL orders (Order V2 compatible)");
        }

        $where_sql = implode(' AND ', $where_conditions);

        // 9. Sestavit ORDER BY
        error_log("[OrderV3] Sorting params received: " . json_encode($sorting));
        $order_by_parts = array();
        if (!empty($sorting)) {
            foreach ($sorting as $sort) {
                if (isset($sort['id'])) {
                    $column = $sort['id'];
                    $direction = isset($sort['desc']) && $sort['desc'] ? 'DESC' : 'ASC';
                    error_log("[OrderV3] Processing sort: column='{$column}', direction='{$direction}'");
                    
                    // Mapování sloupců
                    $column_map = array(
                        // Datumy
                        'dt_objednavky' => 'o.dt_objednavky',
                        'dt_vytvoreni' => 'o.dt_vytvoreni',
                        'dt_aktualizace' => 'o.dt_aktualizace',
                        'dt_zverejneni' => 'o.dt_zverejneni',
                        
                        // Základní info
                        'cislo_objednavky' => 'o.cislo_objednavky',
                        'predmet' => 'o.predmet',
                        
                        // Dodavatel
                        'dodavatel_nazev' => 'COALESCE(o.dodavatel_nazev, d.nazev)',
                        'dodavatel_ico' => 'COALESCE(o.dodavatel_ico, d.ico)',
                        
                        // Osoby
                        'objednatel_jmeno' => 'u1.prijmeni',
                        'garant_jmeno' => 'u2.prijmeni',
                        'prikazce_jmeno' => 'u3.prijmeni',
                        'schvalovatel_jmeno' => 'u4.prijmeni',
                        
                        // Ceny
                        'max_cena_s_dph' => 'o.max_cena_s_dph',
                        'cena_s_dph' => 'cena_s_dph',
                        'faktury_celkova_castka_s_dph' => 'faktury_celkova_castka_s_dph',
                        
                        // Stavy
                        'stav_objednavky' => 'o.stav_objednavky',
                        'mimoradna_udalost' => 'o.mimoradna_udalost',
                        
                        // Počty
                        'pocet_polozek' => 'pocet_polozek',
                        'pocet_priloh' => 'pocet_priloh',
                        'pocet_faktur' => 'pocet_faktur'
                    );
                    
                    if (isset($column_map[$column])) {
                        $mapped_column = $column_map[$column];
                        $order_by_parts[] = $mapped_column . ' ' . $direction;
                        error_log("[OrderV3] Mapped sort: '{$column}' -> '{$mapped_column} {$direction}'");
                    } else {
                        error_log("[OrderV3] WARNING: Unmapped sort column: '{$column}'");
                    }
                }
            }
        }
        
        // Výchozí třídění
        if (empty($order_by_parts)) {
            $order_by_parts[] = 'o.dt_objednavky DESC';
            error_log("[OrderV3] Using default sort: o.dt_objednavky DESC");
        }
        
        $order_by_sql = implode(', ', $order_by_parts);
        error_log("[OrderV3] Final ORDER BY: {$order_by_sql}");

        // 10. Spočítat celkový počet záznamů
        $sql_count = "
            SELECT COUNT(DISTINCT o.id) as total
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
            LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
            LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
            LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
            WHERE $where_sql
        ";
        
        $stmt_count = $db->prepare($sql_count);
        $stmt_count->execute($where_params);
        $total_count = (int)$stmt_count->fetchColumn();
        $total_pages = ceil($total_count / $per_page);
        
        // DEBUG: Log total calculation
        error_log("[OrderV3] Total count: $total_count, per_page: $per_page, total_pages: $total_pages");

        // 11. Načíst statistiky (pokud je první stránka)
        $stats = null;
        if ($page === 1) {
            // Pokud je admin, předáme admin mode flag
            $stats_where_sql = $where_sql;
            if ($is_admin_v2) {
                $stats_where_sql = $stats_where_sql ? $stats_where_sql . " AND __ADMIN_MODE__" : "__ADMIN_MODE__";
            }
            $stats = getOrderStatsWithPeriod($db, $period, $user_id, $stats_where_sql, $where_params);
        }

        // 12. Hlavní query pro data
        $sql_orders = "
            SELECT 
                o.id,
                o.cislo_objednavky,
                o.predmet,
                o.poznamka,
                o.dt_objednavky,
                o.dt_vytvoreni,
                o.dt_aktualizace,
                o.financovani,
                o.max_cena_s_dph,
                o.stav_objednavky,
                o.stav_workflow_kod,
                o.mimoradna_udalost,
                o.zverejnit,
                o.dt_zverejneni,
                o.registr_iddt,
                o.zverejnil_id,
                
                -- Dodavatel - prioritizovat přímé sloupce z objednávky, pak z číselníku
                o.dodavatel_id,
                COALESCE(o.dodavatel_nazev, d.nazev) as dodavatel_nazev,
                COALESCE(o.dodavatel_ico, d.ico) as dodavatel_ico,
                o.dodavatel_adresa,
                o.dodavatel_kontakt_jmeno,
                o.dodavatel_kontakt_email,
                o.dodavatel_kontakt_telefon,
                
                -- Objednatel
                u1.id as objednatel_id,
                CONCAT(u1.jmeno, ' ', u1.prijmeni) as objednatel_jmeno,
                u1.email as objednatel_email,
                
                -- Garant
                u2.id as garant_id,
                CONCAT(u2.jmeno, ' ', u2.prijmeni) as garant_jmeno,
                
                -- Příkazce
                u3.id as prikazce_id,
                CONCAT(u3.jmeno, ' ', u3.prijmeni) as prikazce_jmeno,
                
                -- Schvalovatel
                u4.id as schvalovatel_id,
                CONCAT(u4.jmeno, ' ', u4.prijmeni) as schvalovatel_jmeno,
                
                -- Počet položek
                (SELECT COUNT(*) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) as pocet_polozek,
                
                -- Součet cen položek (cena_s_dph)
                (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) as cena_s_dph,
                
                -- Počet příloh
                (SELECT COUNT(*) FROM " . TBL_OBJEDNAVKY_PRILOHY . " pr WHERE pr.objednavka_id = o.id) as pocet_priloh,
                
                -- Faktury - součet a count
                (SELECT COUNT(*) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) as pocet_faktur,
                (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) as faktury_celkova_castka_s_dph,
                
                -- Registr - sloupce z objednávky
                o.dt_zverejneni,
                o.zverejnit,
                o.zverejnil_id
                
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
            LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
            LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
            LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
            WHERE $where_sql
            ORDER BY $order_by_sql
            LIMIT $per_page OFFSET $offset
        ";
        
        $stmt_orders = $db->prepare($sql_orders);
        $stmt_orders->execute($where_params);
        $orders = $stmt_orders->fetchAll(PDO::FETCH_ASSOC);

        // 13. Post-processing - parsování JSON polí a enrichment
        foreach ($orders as &$order) {
            // Parsovat financovani z TEXT/JSON do array
            if (isset($order['financovani'])) {
                $order['financovani'] = parseFinancovani($order['financovani']);
            }
            
            // Parsovat stav_workflow_kod z JSON do array
            if (isset($order['stav_workflow_kod'])) {
                $order['stav_workflow_kod'] = safeJsonDecode($order['stav_workflow_kod'], array());
            }
            
            // ENRICHMENT - obohacení dat z dalších tabulek
            enrichFinancovaniV3($db, $order);           // LP názvy z 25_limitovane_prisliby
            enrichDodavatelV3($db, $order);             // Dodavatel z 25_dodavatele
            enrichRegistrZverejneniV3($db, $order);     // Registr zveřejnění z objednávky (ne smlouvy!)
        }
        unset($order); // Break reference

        // 14. Úspěšná odpověď
        http_response_code(200);
        $response = array(
            'status' => 'success',
            'data' => array(
                'orders' => $orders,
                'pagination' => array(
                    'page' => $page,
                    'per_page' => $per_page,
                    'total' => $total_count,
                    'total_pages' => $total_pages
                )
            ),
            'message' => 'Data načtena úspěšně'
        );
        
        if ($stats !== null) {
            $response['data']['stats'] = $stats;
        }
        
        echo json_encode($response);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání objednávek: ' . $e->getMessage()
        ));
    }
}

/**
 * Načte statistiky objednávek pro daný rok
 * @param PDO $db Database connection
 * @param int $year Rok pro filtrování
 * @param int $user_id ID přihlášeného uživatele (pro "moje objednávky")
 * @param string $filtered_where_sql WHERE podmínky pro filtrované objednávky (volitelné)
 * @param array $filtered_where_params Parametry pro WHERE podmínky (volitelné)
 */
/**
 * Wrapper funkce pro statistiky s podporou období
 * @param PDO $db
 * @param string $period - 'all', 'current-month', 'last-month', 'last-quarter', 'all-months'
 * @param int $user_id
 * @param string|null $filtered_where_sql - Volitelné dodatečné WHERE podmínky
 * @param array $filtered_where_params - Parametry pro additional WHERE
 * @return array Statistiky
 */
function getOrderStatsWithPeriod($db, $period, $user_id = 0, $filtered_where_sql = null, $filtered_where_params = array()) {
    $period_range = calculatePeriodRange($period);
    
    error_log("[OrderV3 STATS] User ID: {$user_id}, Period: {$period}");
    if ($period_range) {
        error_log("[OrderV3 STATS] Period range: {$period_range['date_from']} to {$period_range['date_to']}");
    }
    
    // Sestavit WHERE podmínky
    $where_conditions = array();
    $where_params = array();
    
    // 1. Aktivní objednávky (vždy)
    $where_conditions[] = "o.aktivni = 1";
    
    // ⚠️ IGNORE testovací/vzorová objednávka s ID 1 - VŽDY vyloučit ze všech výsledků
    $where_conditions[] = "o.id != 1";
    
    // 2. Period filtr
    if ($period_range !== null) {
        $where_conditions[] = "o.dt_objednavky BETWEEN ? AND ?";
        $where_params[] = $period_range['date_from'];
        $where_params[] = $period_range['date_to'];
    }
    
    // 3. CRITICAL: User permissions - PŘESNĚ DLE ORDER25LIST
    // ✅ KONTROLA ADMIN PRÁV - pokud není admin, filtrujem
    
    // Pokud $filtered_where_sql obsahuje admin bypass marker, nepoužíváme user permissions  
    $admin_bypass = ($filtered_where_sql && strpos($filtered_where_sql, '__ADMIN_MODE__') !== false);
    
    if (!$admin_bypass && $user_id > 0) {
        // Non-admin user - Order V2 compatible permissions
        // POUŽÍVÁME STEJNÝCH 12 POLÍ jako v hlavní funkci!
        error_log("[OrderV3 STATS] NON-ADMIN mode - applying Order V2 compatible 12-field filter");
        $where_conditions[] = "(
            o.uzivatel_id = ? OR
            o.objednatel_id = ? OR
            o.garant_uzivatel_id = ? OR
            o.schvalovatel_id = ? OR
            o.prikazce_id = ? OR
            o.uzivatel_akt_id = ? OR
            o.odesilatel_id = ? OR
            o.dodavatel_potvrdil_id = ? OR
            o.zverejnil_id = ? OR
            o.fakturant_id = ? OR
            o.dokoncil_id = ? OR
            o.potvrdil_vecnou_spravnost_id = ?
        )";
        // Přidat 12x user_id do parametrů
        for ($i = 0; $i < 12; $i++) {
            $where_params[] = $user_id;
        }
        error_log("[OrderV3 STATS] NON-ADMIN mode - 12-field filter applied for user_id={$user_id}");
    } else {
        if ($admin_bypass) {
            // Odstranit __ADMIN_MODE__ z filtered_where_sql pro skutečný SQL
            if ($filtered_where_sql) {
                $filtered_where_sql = str_replace('__ADMIN_MODE__', '', $filtered_where_sql);
                $filtered_where_sql = str_replace('AND AND', 'AND', $filtered_where_sql);
                $filtered_where_sql = trim($filtered_where_sql, ' AND');
                if (empty($filtered_where_sql)) {
                    $filtered_where_sql = null;
                }
            }
            error_log("[OrderV3 STATS] ADMIN mode - showing ALL orders (like orders25/list)");
        }
    }
    
    // 3. Dodatečné filtry (pokud jsou předané)
    if ($filtered_where_sql !== null && trim($filtered_where_sql) !== '') {
        $where_conditions[] = "($filtered_where_sql)";
        $where_params = array_merge($where_params, $filtered_where_params);
    }
    
    $where_clause = implode(' AND ', $where_conditions);
    
    // Sestavit stats query
    $sql_stats = "
        SELECT 
            COUNT(*) as total,
            -- NOVÉ (první stav v array)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, '$[0]')) = 'NOVA' THEN 1 
                ELSE 0 
            END) as nove,
            -- KE SCHVÁLENÍ (ODESLANA_KE_SCHVALENI nebo KE_SCHVALENI)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI') THEN 1 
                ELSE 0 
            END) as ke_schvaleni,
            -- SCHVÁLENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'SCHVALENA' THEN 1 
                ELSE 0 
            END) as schvalena,
            -- ZAMÍTNUTÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZAMITNUTA' THEN 1 
                ELSE 0 
            END) as zamitnuta,
            -- ROZPRACOVANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ROZPRACOVANA' THEN 1 
                ELSE 0 
            END) as rozpracovana,
            -- ODESLANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ODESLANA' THEN 1 
                ELSE 0 
            END) as odeslana,
            -- POTVRZENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'POTVRZENA' THEN 1 
                ELSE 0 
            END) as potvrzena,
            -- K UVEŘEJNĚNÍ (UVEREJNIT v workflow)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'UVEREJNIT' THEN 1 
                ELSE 0 
            END) as k_uverejneni_do_registru,
            -- UVEŘEJNĚNÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'UVEREJNENA' THEN 1 
                ELSE 0 
            END) as uverejnene,
            -- FAKTURACE
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'FAKTURACE' THEN 1 
                ELSE 0 
            END) as fakturace,
            -- VĚCNÁ SPRÁVNOST
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'VECNA_SPRAVNOST' THEN 1 
                ELSE 0 
            END) as vecna_spravnost,
            -- ZKONTROLOVANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZKONTROLOVANA' THEN 1 
                ELSE 0 
            END) as zkontrolovana,
            -- DOKONČENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'DOKONCENA' THEN 1 
                ELSE 0 
            END) as dokoncena,
            -- ZRUŠENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZRUSENA' THEN 1 
                ELSE 0 
            END) as zrusena,
            -- SMAZANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'SMAZANA' THEN 1 
                ELSE 0 
            END) as smazana,
            -- S FAKTURAMI
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_FAKTURY . " f 
                    WHERE f.objednavka_id = o.id AND f.aktivni = 1
                ) THEN 1 
                ELSE 0 
            END) as withInvoices,
            -- S PŘÍLOHAMI
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p 
                    WHERE p.objednavka_id = o.id
                ) THEN 1 
                ELSE 0 
            END) as withAttachments,
            -- MIMOŘÁDNÉ UDÁLOSTI
            SUM(CASE 
                WHEN o.mimoradna_udalost = 1 THEN 1 
                ELSE 0 
            END) as mimoradneUdalosti,
            -- MOJE OBJEDNÁVKY
            SUM(CASE 
                WHEN o.objednatel_id = ? OR 
                    o.garant_uzivatel_id = ? OR 
                    o.prikazce_id = ? OR 
                    o.schvalovatel_id = ?
                THEN 1 
                ELSE 0 
            END) as mojeObjednavky
        FROM " . TBL_OBJEDNAVKY . " o
        WHERE $where_clause
    ";
    
    // Parametry: user_id (4x pro "moje objednávky" count) + where_params
    $stmt_params = array_merge(array($user_id, $user_id, $user_id, $user_id), $where_params);
    error_log("[OrderV3 STATS] SQL params count: " . count($stmt_params) . ", values: " . json_encode($stmt_params));
    $stmt_stats = $db->prepare($sql_stats);
    $stmt_stats->execute($stmt_params);
    $stats = $stmt_stats->fetch(PDO::FETCH_ASSOC);
    
    error_log("[OrderV3 STATS] Basic stats: total={$stats['total']}, nove={$stats['nove']}");
    
    // Celková cena s DPH
    $sql_total_amount = "
        SELECT 
            COALESCE(SUM(
                CASE
                    WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) 
                          FROM " . TBL_FAKTURY . " f 
                          WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0 
                    THEN (SELECT COALESCE(SUM(f.fa_castka), 0) 
                          FROM " . TBL_FAKTURY . " f 
                          WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                    WHEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) 
                          FROM " . TBL_OBJEDNAVKY_POLOZKY . " p 
                          WHERE p.objednavka_id = o.id) > 0 
                    THEN (SELECT COALESCE(SUM(p.cena_s_dph), 0) 
                          FROM " . TBL_OBJEDNAVKY_POLOZKY . " p 
                          WHERE p.objednavka_id = o.id)
                    ELSE o.max_cena_s_dph
                END
            ), 0) as total_amount
        FROM " . TBL_OBJEDNAVKY . " o
        WHERE $where_clause
    ";
    
    $stmt_amount = $db->prepare($sql_total_amount);
    $stmt_amount->execute($where_params);
    $amount_result = $stmt_amount->fetch(PDO::FETCH_ASSOC);
    
    $stats['total_amount'] = floatval($amount_result['total_amount']);
    error_log("[OrderV3 STATS] Total amount calculated: {$stats['total_amount']}");
    
    // ⚠️ FRONTEND COMPATIBILITY: Duplicates for camelCase
    $stats['totalAmount'] = $stats['total_amount'];
    
    return $stats;
}

/**
 * Načte statistiky objednávek podle roku (původní funkce - zachována pro backward compatibility)
 * @deprecated Použij getOrderStatsWithPeriod
 */
function getOrderStats($db, $year, $user_id = 0, $filtered_where_sql = null, $filtered_where_params = array()) {
    // Počty objednávek podle stavů (poslední stav v workflow array)
    $sql_stats = "
        SELECT 
            COUNT(*) as total,
            -- NOVÉ (první stav v array)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, '$[0]')) = 'NOVA' THEN 1 
                ELSE 0 
            END) as nove,
            -- KE SCHVÁLENÍ (ODESLANA_KE_SCHVALENI nebo KE_SCHVALENI)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) IN ('ODESLANA_KE_SCHVALENI', 'KE_SCHVALENI') THEN 1 
                ELSE 0 
            END) as ke_schvaleni,
            -- SCHVÁLENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'SCHVALENA' THEN 1 
                ELSE 0 
            END) as schvalena,
            -- ZAMÍTNUTÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZAMITNUTA' THEN 1 
                ELSE 0 
            END) as zamitnuta,
            -- ROZPRACOVANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ROZPRACOVANA' THEN 1 
                ELSE 0 
            END) as rozpracovana,
            -- ODESLANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ODESLANA' THEN 1 
                ELSE 0 
            END) as odeslana,
            -- POTVRZENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'POTVRZENA' THEN 1 
                ELSE 0 
            END) as potvrzena,
            -- K UVEŘEJNĚNÍ (UVEREJNIT v workflow)
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'UVEREJNIT' THEN 1 
                ELSE 0 
            END) as k_uverejneni_do_registru,
            -- UVEŘEJNĚNÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'UVEREJNENA' THEN 1 
                ELSE 0 
            END) as uverejnene,
            -- FAKTURACE
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'FAKTURACE' THEN 1 
                ELSE 0 
            END) as fakturace,
            -- VĚCNÁ SPRÁVNOST
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'VECNA_SPRAVNOST' THEN 1 
                ELSE 0 
            END) as vecna_spravnost,
            -- ZKONTROLOVANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZKONTROLOVANA' THEN 1 
                ELSE 0 
            END) as zkontrolovana,
            -- DOKONČENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'DOKONCENA' THEN 1 
                ELSE 0 
            END) as dokoncena,
            -- ZRUŠENÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'ZRUSENA' THEN 1 
                ELSE 0 
            END) as zrusena,
            -- SMAZANÉ
            SUM(CASE 
                WHEN JSON_UNQUOTE(JSON_EXTRACT(stav_workflow_kod, CONCAT('$[', JSON_LENGTH(stav_workflow_kod) - 1, ']'))) = 'SMAZANA' THEN 1 
                ELSE 0 
            END) as smazana,
            -- S FAKTURAMI (alespoň 1 faktura)
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_FAKTURY . " f 
                    WHERE f.objednavka_id = o.id AND f.aktivni = 1
                ) THEN 1 
                ELSE 0 
            END) as withInvoices,
            -- S PŘÍLOHAMI (alespoň 1 příloha)
            SUM(CASE 
                WHEN EXISTS (
                    SELECT 1 FROM " . TBL_OBJEDNAVKY_PRILOHY . " p 
                    WHERE p.objednavka_id = o.id
                ) THEN 1 
                ELSE 0 
            END) as withAttachments,
            -- MIMOŘÁDNÉ UDÁLOSTI
            SUM(CASE 
                WHEN o.mimoradna_udalost = 1 THEN 1 
                ELSE 0 
            END) as mimoradneUdalosti,
            -- MOJE OBJEDNÁVKY (kde jsem objednatel, garant, příkazce nebo schvalovatel)
            SUM(CASE 
                WHEN o.objednatel_id = ? OR 
                    o.garant_uzivatel_id = ? OR 
                    o.prikazce_id = ? OR 
                    o.schvalovatel_id = ?
                THEN 1 
                ELSE 0 
            END) as mojeObjednavky
        FROM " . TBL_OBJEDNAVKY . " o
        WHERE o.aktivni = 1 AND YEAR(o.dt_objednavky) = ?
    ";
    
    $stmt_stats = $db->prepare($sql_stats);
    $stmt_stats->execute(array($user_id, $user_id, $user_id, $user_id, $year));
    $stats = $stmt_stats->fetch(PDO::FETCH_ASSOC);
    
    // Celková cena s DPH - priorita: faktury > položky > max_cena_s_dph
    $sql_total_amount = "
        SELECT 
            COALESCE(SUM(
                CASE
                    -- Priorita 1: Pokud existují faktury, použij součet faktur
                    WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) 
                          FROM " . TBL_FAKTURY . " f 
                          WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                    THEN (SELECT COALESCE(SUM(f.fa_castka), 0) 
                          FROM " . TBL_FAKTURY . " f 
                          WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                    
                    -- Priorita 2: Pokud existují položky, použij součet položek
                    WHEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) 
                          FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                          WHERE pol.objednavka_id = o.id) > 0
                    THEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) 
                          FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                          WHERE pol.objednavka_id = o.id)
                    
                    -- Priorita 3: Použij max_cena_s_dph
                    ELSE COALESCE(o.max_cena_s_dph, 0)
                END
            ), 0) as totalAmount,
            
            -- Částka ROZPRACOVANÝCH objednávek
            COALESCE(SUM(
                CASE
                    WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'ROZPRACOVANA'
                    THEN
                        CASE
                            WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                            THEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                            WHEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) > 0
                            THEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id)
                            ELSE COALESCE(o.max_cena_s_dph, 0)
                        END
                    ELSE 0
                END
            ), 0) as rozpracovanaAmount,
            
            -- Částka DOKONČENÝCH objednávek
            COALESCE(SUM(
                CASE
                    WHEN JSON_UNQUOTE(JSON_EXTRACT(o.stav_workflow_kod, CONCAT('$[', JSON_LENGTH(o.stav_workflow_kod) - 1, ']'))) = 'DOKONCENA'
                    THEN
                        CASE
                            WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                            THEN (SELECT COALESCE(SUM(f.fa_castka), 0) FROM " . TBL_FAKTURY . " f WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                            WHEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id) > 0
                            THEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol WHERE pol.objednavka_id = o.id)
                            ELSE COALESCE(o.max_cena_s_dph, 0)
                        END
                    ELSE 0
                END
            ), 0) as dokoncenaAmount
        FROM " . TBL_OBJEDNAVKY . " o
        WHERE o.aktivni = 1 AND YEAR(o.dt_objednavky) = ?
    ";
    
    $stmt_amount = $db->prepare($sql_total_amount);
    $stmt_amount->execute(array($year));
    $amount_data = $stmt_amount->fetch(PDO::FETCH_ASSOC);
    
    // Přidat totalAmount a další částky do stats
    $stats['totalAmount'] = floatval($amount_data['totalAmount']);
    $stats['rozpracovanaAmount'] = floatval($amount_data['rozpracovanaAmount']);
    $stats['dokoncenaAmount'] = floatval($amount_data['dokoncenaAmount']);
    
    // 🔥 NOVĚ: Pokud máme filtrované WHERE podmínky, spočítej filteredTotalAmount
    if ($filtered_where_sql !== null && !empty($filtered_where_params)) {
        $sql_filtered_amount = "
            SELECT 
                COALESCE(SUM(
                    CASE
                        -- Priorita 1: Pokud existují faktury, použij součet faktur
                        WHEN (SELECT COALESCE(SUM(f.fa_castka), 0) 
                              FROM " . TBL_FAKTURY . " f 
                              WHERE f.objednavka_id = o.id AND f.aktivni = 1) > 0
                        THEN (SELECT COALESCE(SUM(f.fa_castka), 0) 
                              FROM " . TBL_FAKTURY . " f 
                              WHERE f.objednavka_id = o.id AND f.aktivni = 1)
                        
                        -- Priorita 2: Pokud existují položky, použij součet položek
                        WHEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) 
                              FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                              WHERE pol.objednavka_id = o.id) > 0
                        THEN (SELECT COALESCE(SUM(pol.cena_s_dph), 0) 
                              FROM " . TBL_OBJEDNAVKY_POLOZKY . " pol 
                              WHERE pol.objednavka_id = o.id)
                        
                        -- Priorita 3: Použij max_cena_s_dph
                        ELSE COALESCE(o.max_cena_s_dph, 0)
                    END
                ), 0) as filteredTotalAmount
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
            LEFT JOIN " . TBL_UZIVATELE . " u2 ON o.garant_uzivatel_id = u2.id
            LEFT JOIN " . TBL_UZIVATELE . " u3 ON o.prikazce_id = u3.id
            LEFT JOIN " . TBL_UZIVATELE . " u4 ON o.schvalovatel_id = u4.id
            WHERE $filtered_where_sql
        ";
        
        $stmt_filtered = $db->prepare($sql_filtered_amount);
        $stmt_filtered->execute($filtered_where_params);
        $filtered_amount_data = $stmt_filtered->fetch(PDO::FETCH_ASSOC);
        
        $stats['filteredTotalAmount'] = floatval($filtered_amount_data['filteredTotalAmount']);
    } else {
        // Pokud nejsou filtry, filtered = total
        $stats['filteredTotalAmount'] = $stats['totalAmount'];
    }
    
    // Převést všechny countery na INT (MySQL SUM vrací string)
    $counter_fields = array(
        'total', 'nove', 'ke_schvaleni', 'schvalena', 'zamitnuta', 'rozpracovana', 
        'odeslana', 'potvrzena', 'k_uverejneni_do_registru', 'uverejnene', 
        'fakturace', 'vecna_spravnost', 'zkontrolovana', 'dokoncena', 'zrusena', 
        'smazana', 'withInvoices', 'withAttachments', 'mimoradneUdalosti', 'mojeObjednavky'
    );
    
    foreach ($counter_fields as $field) {
        if (isset($stats[$field])) {
            $stats[$field] = intval($stats[$field]);
        }
    }
    
    return $stats;
}

/**
 * POST order-v3/stats
 * Načte pouze statistiky (lehčí endpoint pro dashboard refresh)
 * 
 * REQUEST BODY:
 * {
 *   "token": "xxx",
 *   "username": "user@domain.cz",
 *   "year": 2026
 * }
 */
function handle_order_v3_stats($input, $config, $queries) {
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

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    $user_id = isset($token_data['id']) ? (int)$token_data['id'] : 0;

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        TimezoneHelper::setMysqlTimezone($db);
        
        // Období pro filtrování (místo roku)
        $period = isset($input['period']) ? $input['period'] : 'all';
        $stats = getOrderStatsWithPeriod($db, $period, $user_id);

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $stats,
            'message' => 'Statistiky načteny úspěšně'
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání statistik: ' . $e->getMessage()
        ));
    }
}

/**
 * POST order-v3/items
 * Načte položky objednávky (lazy loading podřádků)
 * 
 * REQUEST BODY:
 * {
 *   "token": "xxx",
 *   "username": "user@domain.cz",
 *   "order_id": 123
 * }
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "data": {
 *     "order_id": 123,
 *     "items": [
 *       {
 *         "id": 1,
 *         "nazev": "Notebook",
 *         "mnozstvi": 2,
 *         "jednotka": "ks",
 *         "cena_za_jednotku": 25000,
 *         "castka_celkem": 50000,
 *         "poznamka": "..."
 *       }
 *     ],
 *     "attachments": [...],
 *     "notes": "..."
 *   }
 * }
 */
function handle_order_v3_items($input, $config, $queries) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Pouze POST metoda'));
        return;
    }

    $token = isset($input['token']) ? $input['token'] : '';
    $username = isset($input['username']) ? $input['username'] : '';
    $order_id = isset($input['order_id']) ? (int)$input['order_id'] : 0;
    
    if (!$token || !$username) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí token nebo username'));
        return;
    }
    
    if ($order_id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybí order_id'));
        return;
    }

    $token_data = verify_token_v2($username, $token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatný token'));
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        TimezoneHelper::setMysqlTimezone($db);

        // Načíst položky
        $sql_items = "
            SELECT 
                p.id,
                p.popis,
                p.cena_bez_dph,
                p.sazba_dph,
                p.cena_s_dph,
                p.usek_kod,
                p.budova_kod,
                p.mistnost_kod,
                p.poznamka,
                p.lp_id,
                p.dt_vytvoreni,
                lp.cislo_lp as lppts_cislo,
                lp.nazev_uctu as lppts_nazev
            FROM " . TBL_OBJEDNAVKY_POLOZKY . " p
            LEFT JOIN " . TBL_LIMITOVANE_PRISLIBY . " lp ON p.lp_id = lp.id
            WHERE p.objednavka_id = ? AND p.aktivni = 1
            ORDER BY p.id ASC
        ";
        
        $stmt_items = $db->prepare($sql_items);
        $stmt_items->execute(array($order_id));
        $items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

        // Načíst přílohy
        $sql_attachments = "
            SELECT 
                id,
                nazev_souboru,
                nazev_originalu,
                typ_souboru,
                velikost_souboru,
                popis,
                dt_nahrani
            FROM " . TBL_OBJEDNAVKY_PRILOHY . "
            WHERE objednavka_id = ? AND aktivni = 1
            ORDER BY dt_nahrani DESC
        ";
        
        $stmt_attachments = $db->prepare($sql_attachments);
        $stmt_attachments->execute(array($order_id));
        $attachments = $stmt_attachments->fetchAll(PDO::FETCH_ASSOC);

        // Načíst poznámky z objednávky
        $sql_notes = "SELECT poznamka FROM " . TBL_OBJEDNAVKY . " WHERE id = ? AND aktivni = 1";
        $stmt_notes = $db->prepare($sql_notes);
        $stmt_notes->execute(array($order_id));
        $notes = $stmt_notes->fetchColumn();

        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => array(
                'order_id' => $order_id,
                'items' => $items,
                'attachments' => $attachments,
                'notes' => $notes
            ),
            'message' => 'Detail objednávky načten úspěšně'
        ));

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání detailu objednávky: ' . $e->getMessage()
        ));
    }
}

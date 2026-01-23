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

    $user_id = isset($token_data['user_id']) ? (int)$token_data['user_id'] : 0;

    try {
        // 3. Připojení k DB
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        TimezoneHelper::setMysqlTimezone($db);

        // 4. Parametry paginace
        $page = isset($input['page']) ? max(1, (int)$input['page']) : 1;
        $per_page = isset($input['per_page']) ? max(1, min(100, (int)$input['per_page'])) : 50;
        $offset = ($page - 1) * $per_page;
        
        // 5. Rok pro filtrování
        $year = isset($input['year']) ? (int)$input['year'] : date('Y');
        
        // 6. Filtry
        $filters = isset($input['filters']) ? $input['filters'] : array();
        
        // 7. Třídění
        $sorting = isset($input['sorting']) ? $input['sorting'] : array();

        // 8. Sestavit WHERE podmínky
        $where_conditions = array();
        $where_params = array();
        
        // Aktivní záznamy
        $where_conditions[] = "o.aktivni = 1";
        
        // Rok
        $where_conditions[] = "YEAR(o.dt_objednavky) = ?";
        $where_params[] = $year;
        
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
        
        if (!empty($filters['objednatel_jmeno'])) {
            $where_conditions[] = "(u1.jmeno LIKE ? OR u1.prijmeni LIKE ?)";
            $where_params[] = '%' . $filters['objednatel_jmeno'] . '%';
            $where_params[] = '%' . $filters['objednatel_jmeno'] . '%';
        }

        $where_sql = implode(' AND ', $where_conditions);

        // 9. Sestavit ORDER BY
        $order_by_parts = array();
        if (!empty($sorting)) {
            foreach ($sorting as $sort) {
                if (isset($sort['id'])) {
                    $column = $sort['id'];
                    $direction = isset($sort['desc']) && $sort['desc'] ? 'DESC' : 'ASC';
                    
                    // Mapování sloupců
                    $column_map = array(
                        'dt_objednavky' => 'o.dt_objednavky',
                        'cislo_objednavky' => 'o.cislo_objednavky',
                        'dodavatel_nazev' => 'd.nazev',
                        'max_cena_s_dph' => 'o.max_cena_s_dph',
                        'cena_s_dph' => 'o.cena_s_dph'
                    );
                    
                    if (isset($column_map[$column])) {
                        $order_by_parts[] = $column_map[$column] . ' ' . $direction;
                    }
                }
            }
        }
        
        // Výchozí třídění
        if (empty($order_by_parts)) {
            $order_by_parts[] = 'o.dt_aktualizace DESC';
        }
        
        $order_by_sql = implode(', ', $order_by_parts);

        // 10. Spočítat celkový počet záznamů
        $sql_count = "
            SELECT COUNT(DISTINCT o.id) as total
            FROM " . TBL_OBJEDNAVKY . " o
            LEFT JOIN " . TBL_DODAVATELE . " d ON o.dodavatel_id = d.id
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON o.objednatel_id = u1.id
            WHERE $where_sql
        ";
        
        $stmt_count = $db->prepare($sql_count);
        $stmt_count->execute($where_params);
        $total_count = (int)$stmt_count->fetchColumn();
        $total_pages = ceil($total_count / $per_page);

        // 11. Načíst statistiky (pokud je první stránka)
        $stats = null;
        if ($page === 1) {
            $stats = getOrderStats($db, $year, $user_id);
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
 */
function getOrderStats($db, $year, $user_id = 0) {
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
            END) as schvalene,
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

    $user_id = isset($token_data['user_id']) ? (int)$token_data['user_id'] : 0;

    try {
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        TimezoneHelper::setMysqlTimezone($db);
        
        $year = isset($input['year']) ? (int)$input['year'] : date('Y');
        $stats = getOrderStats($db, $year, $user_id);

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
                id,
                nazev,
                mnozstvi,
                jednotka,
                cena_za_jednotku,
                castka_celkem,
                poznamka,
                dt_vytvoreni
            FROM " . TBL_OBJEDNAVKY_POLOZKY . "
            WHERE objednavka_id = ? AND aktivni = 1
            ORDER BY id ASC
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

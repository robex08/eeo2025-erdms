<?php
/**
 * LP (Limitované příslíby) Handlers
 * 
 * Endpointy pro práci s limitovanými příslíby
 * Datum: 8. února 2026
 */

/**
 * GET lp/list
 * Načte seznam všech aktivních limitovaných příslibů
 * 
 * REQUEST BODY:
 * {
 *   "token": "xxx",
 *   "username": "user@domain.cz",
 *   "context": "orders" | "invoices" | "cashbook" | null (volitelné)
 * }
 * 
 * CONTEXT FILTROVÁNÍ:
 * - "orders": Zobrazí LP s modulem obsahujícím 'o' (objednávky)
 * - "invoices": Zobrazí LP s modulem obsahujícím 'f' (faktury)
 * - "cashbook": Zobrazí LP s modulem obsahujícím 'p' (pokladna)
 * - null nebo nevyplněno: Zobrazí všechny LP
 * 
 * RESPONSE:
 * {
 *   "status": "success",
 *   "data": [
 *     {
 *       "id": 1,
 *       "cislo_lp": "LPIT1",
 *       "nazev_uctu": "IT Projekt 2026",
 *       "limit_celkem": "1500000.00",
 *       "rezervovano": "50000.00",
 *       "predpoklad": "120000.00",
 *       "fakturovano": "80000.00",
 *       "pokladna": "10000.00",
 *       "cerpano_celkem": "260000.00"
 *     },
 *     ...
 *   ]
 * }
 */
function handle_lp_list($input, $config) {
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

    // Context filtrování (volitelné)
    $context = isset($input['context']) ? trim($input['context']) : null;
    $context_filter_letter = null;
    
    if ($context === 'orders') {
        $context_filter_letter = 'o';
    } elseif ($context === 'invoices') {
        $context_filter_letter = 'f';
    } elseif ($context === 'cashbook') {
        $context_filter_letter = 'p';
    }

    try {
        // 3. Připojení k DB
        $db = get_db($config);
        if (!$db) {
            throw new Exception('Chyba připojení k databázi');
        }
        
        TimezoneHelper::setMysqlTimezone($db);

        // 4. Načíst seznam aktivních LP (platnost zasahuje do aktuálního roku - průnik intervalů)
        // + agregované čerpání (plánováno + rezervováno + fakturováno + pokladna)
        $current_year = date('Y');
        $year_start = $current_year . '-01-01';
        $year_end = $current_year . '-12-31';
        
        $sql = "
            SELECT 
                lp.id,
                lp.cislo_lp,
                lp.nazev_uctu,
                lp.vyuziti,
                lp.modul,
                lp.platne_od,
                lp.platne_do,
                lp.vyse_financniho_kryti,
                lp.vyse_financniho_kryti as limit_celkem,
                -- ✅ ŽIVÉ čerpání z reálných zdrojů (agregační tabulka 25_limitovane_prisliby_cerpani může být zastaralá)
                -- 1) Pokladna: SUM výdaj - příjem z 25a_pokladni_polozky
                (SELECT COALESCE(SUM(COALESCE(pp.castka_vydaj,0) - COALESCE(pp.castka_prijem,0)), 0)
                 FROM " . TBL_POKLADNI_POLOZKY . " pp
                 WHERE pp.lp_kod = lp.cislo_lp AND pp.smazano = 0) as pokladna,
                -- 2) Standalone faktury (odbory): SUM fa_castka z přiřazených faktur
                (SELECT COALESCE(SUM(f.fa_castka), 0)
                 FROM " . TBL_ODBORY_LP_PRIRAZENI . " olp
                 INNER JOIN " . TBL_FAKTURY . " f ON f.id = olp.faktura_id
                 WHERE olp.lp_id = lp.id AND olp.faktura_id IS NOT NULL
                 AND f.aktivni = 1 AND (f.vecna_spravnost_potvrzeno IS NULL OR f.vecna_spravnost_potvrzeno != 2)) as fakturovano_odbory,
                -- 3) Faktury z objednávek s tímto LP v JSON financovani
                (SELECT COALESCE(SUM(f.fa_castka), 0)
                 FROM " . TBL_OBJEDNAVKY . " o
                 INNER JOIN " . TBL_FAKTURY . " f ON f.objednavka_id = o.id
                 WHERE o.financovani IS NOT NULL
                 AND f.aktivni = 1 AND (f.vecna_spravnost_potvrzeno IS NULL OR f.vecna_spravnost_potvrzeno != 2)
                 AND (
                   JSON_CONTAINS(o.financovani, CONCAT('', lp.id), '$.lp_kody')
                   OR JSON_SEARCH(o.financovani, 'one', CONCAT('', lp.id), NULL, '$.doplnujici_data.lp_kod[*]') IS NOT NULL
                 )) as fakturovano_objednavky,
                -- ✅ Celkové skutečné čerpání = živý součet všech tří zdrojů
                (
                  (SELECT COALESCE(SUM(COALESCE(pp.castka_vydaj,0) - COALESCE(pp.castka_prijem,0)), 0)
                   FROM " . TBL_POKLADNI_POLOZKY . " pp WHERE pp.lp_kod = lp.cislo_lp AND pp.smazano = 0)
                  +
                  (SELECT COALESCE(SUM(f.fa_castka), 0)
                   FROM " . TBL_ODBORY_LP_PRIRAZENI . " olp
                   INNER JOIN " . TBL_FAKTURY . " f ON f.id = olp.faktura_id
                   WHERE olp.lp_id = lp.id AND olp.faktura_id IS NOT NULL
                   AND f.aktivni = 1 AND (f.vecna_spravnost_potvrzeno IS NULL OR f.vecna_spravnost_potvrzeno != 2))
                  +
                  (SELECT COALESCE(SUM(f.fa_castka), 0)
                   FROM " . TBL_OBJEDNAVKY . " o
                   INNER JOIN " . TBL_FAKTURY . " f ON f.objednavka_id = o.id
                   WHERE o.financovani IS NOT NULL
                   AND f.aktivni = 1 AND (f.vecna_spravnost_potvrzeno IS NULL OR f.vecna_spravnost_potvrzeno != 2)
                   AND (
                     JSON_CONTAINS(o.financovani, CONCAT('', lp.id), '$.lp_kody')
                     OR JSON_SEARCH(o.financovani, 'one', CONCAT('', lp.id), NULL, '$.doplnujici_data.lp_kod[*]') IS NOT NULL
                   ))
                ) as cerpano_celkem,
                COALESCE(c.rezervovano, 0) as rezervovano,
                COALESCE(c.predpokladane_cerpani, 0) as predpoklad,
                u.usek_zkr,
                u.usek_nazev,
                prikazce.id as prikazce_id,
                prikazce.jmeno as prikazce_jmeno,
                prikazce.prijmeni as prikazce_prijmeni,
                CONCAT(prikazce.jmeno, ' ', prikazce.prijmeni) as prikazce_cele_jmeno,
                -- Počet pokladních položek (lp_kod = cislo_lp jako string)
                (SELECT COUNT(*) 
                 FROM " . TBL_POKLADNI_POLOZKY . " pp 
                 WHERE pp.lp_kod = lp.cislo_lp) as pocet_pokladnich_polozek,
                -- Počet standalone faktur (odbory LP přes prirazeni tabulku)
                (SELECT COUNT(*) 
                 FROM " . TBL_ODBORY_LP_PRIRAZENI . " olp 
                 WHERE olp.lp_id = lp.id) as pocet_faktur_odbory,
                -- Počet faktur na objednávkách s LP v JSON financovani (nový formát: lp_kody pole čísel, starý formát: lp_kod pole stringů)
                (SELECT COUNT(DISTINCT f.id) 
                 FROM " . TBL_OBJEDNAVKY . " o
                 INNER JOIN " . TBL_FAKTURY . " f ON f.objednavka_id = o.id
                 WHERE o.financovani IS NOT NULL
                 AND (
                   JSON_CONTAINS(o.financovani, CONCAT('', lp.id), '$.lp_kody')
                   OR JSON_SEARCH(o.financovani, 'one', CONCAT('', lp.id), NULL, '$.doplnujici_data.lp_kod[*]') IS NOT NULL
                 )) as pocet_faktur_objednavky
            FROM " . TBL_LIMITOVANE_PRISLIBY . " lp
            LEFT JOIN " . TBL_LP_CERPANI . " c ON c.cislo_lp = lp.cislo_lp AND c.rok = :current_year
            LEFT JOIN " . TBL_USEKY . " u ON lp.usek_id = u.id
            LEFT JOIN " . TBL_UZIVATELE . " prikazce ON lp.user_id = prikazce.id
            WHERE lp.platne_od <= :year_end 
            AND lp.platne_do >= :year_start";
        
        // Context filtrování: STRICT - zobrazíme pouze LP které obsahují daný modul
        if ($context_filter_letter) {
            $sql .= " AND (lp.modul LIKE :modul_filter OR lp.modul IS NULL)";
        }
        
        $sql .= " ORDER BY lp.cislo_lp ASC";
        
        $stmt = $db->prepare($sql);
        $params = [
            ':current_year' => (int)$current_year,
            ':year_start' => $year_start,
            ':year_end' => $year_end
        ];
        
        if ($context_filter_letter) {
            $params[':modul_filter'] = '%' . $context_filter_letter . '%';
        }
        
        $stmt->execute($params);
        $lp_list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 5. Úspěšná odpověď
        http_response_code(200);
        echo json_encode(array(
            'status' => 'success',
            'data' => $lp_list,
            'count' => count($lp_list),
            'message' => 'Seznam LP načten úspěšně'
        ));

    } catch (Exception $e) {
        error_log("[LP List] Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(array(
            'status' => 'error',
            'message' => 'Chyba při načítání LP: ' . $e->getMessage()
        ));
    }
}

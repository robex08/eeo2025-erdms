<?php

/**
 * SMLOUVY API Handlers
 * 
 * Implementace 7 endpointů pro modul smluv podle specifikace
 * PHP 5.6, MySQL 5.5.43 kompatibilní
 * 
 * Endpointy:
 * - POST /ciselniky/smlouvy/list
 * - POST /ciselniky/smlouvy/detail
 * - POST /ciselniky/smlouvy/insert
 * - POST /ciselniky/smlouvy/update
 * - POST /ciselniky/smlouvy/delete
 * - POST /ciselniky/smlouvy/bulk-import
 * - POST /ciselniky/smlouvy/prepocet-cerpani
 * 
 * @author Backend Team
 * @date 23. listopadu 2025
 */

/**
 * Normalizace data "platnost_do"
 * 
 * Pokud je "platnost_do" prázdné, NULL nebo nevalidní,
 * nastaví se automaticky na 31.12.2099 (dlouhodobě platná smlouva)
 * 
 * Logika:
 * - Pokud je "platnost_do" prázdné nebo NULL → "2099-12-31"
 * - Pokud je datum nevalidní → "2099-12-31"
 * - Pokud je datum validní → vrátí jej v ISO formátu (YYYY-MM-DD)
 * - Pokud je "00.00.0000" nebo podobný → "2099-12-31"
 * 
 * @param mixed $platnost_do Vstupní datum (string, různé formáty povoleny)
 * @return string Normalizované datum ve formátu YYYY-MM-DD
 */
function normalizePlatnostDo($platnost_do) {
    // Pokud je prázdné nebo NULL
    if (empty($platnost_do)) {
        return '2099-12-31';
    }
    
    // Převod string -> string
    $value = trim((string)$platnost_do);
    
    // Kontrola na speciální "prázdné" hodnoty
    if ($value === '' || $value === '0' || $value === '00.00.0000' || $value === '1900-01-01') {
        return '2099-12-31';
    }
    
    // Pokus o parsování data
    $timestamp = strtotime($value);
    
    // Pokud je nevalidní nebo je starší než 1980
    if ($timestamp === false) {
        return '2099-12-31';
    }
    
    // Převod na YYYY-MM-DD formát
    $date = date('Y-m-d', $timestamp);
    
    // Pokud je rok < 2000, pravděpodobně jde o chybu v datech
    if ((int)date('Y', $timestamp) < 2000) {
        return '2099-12-31';
    }
    
    return $date;
}

/**
 * Normalizace finančních hodnot smlouvy
 * 
 * Automaticky:
 * 1. Parsuje hodnoty (i s mezerami, čárkami apod.)
 * 2. Pokud hodnota není číslo → nastaví 0
 * 3. Pokud chybí obě hodnoty → nastaví obě na 0
 * 4. Pokud existuje jen jedna hodnota → dopočítá druhou (DPH 21%)
 * 
 * @param array $data Reference na data smlouvy
 * @return array Upravená data s normalizovanými hodnotami
 */
function normalizeFinancialValues(&$data) {
    // Pomocná funkce pro parsování číselné hodnoty
    $parseNumber = function($value) {
        if ($value === null || $value === '') {
            return null;
        }
        
        // Převod na string
        $str = trim((string)$value);
        
        // Odstranění mezer (např. "100 000")
        $str = str_replace(' ', '', $str);
        
        // Nahrazení čárky tečkou (např. "1234,56" -> "1234.56")
        $str = str_replace(',', '.', $str);
        
        // Pokud není číslo, vrátit null
        if (!is_numeric($str)) {
            return null;
        }
        
        return (float)$str;
    };
    
    // Parsování hodnot
    $hodnota_bez_dph = isset($data['hodnota_bez_dph']) ? $parseNumber($data['hodnota_bez_dph']) : null;
    $hodnota_s_dph = isset($data['hodnota_s_dph']) ? $parseNumber($data['hodnota_s_dph']) : null;
    
    // Pravidlo 1: Pokud jsou obě hodnoty null/prázdné → nastavit obě na 0
    if ($hodnota_bez_dph === null && $hodnota_s_dph === null) {
        $data['hodnota_bez_dph'] = 0;
        $data['hodnota_s_dph'] = 0;
        $data['_note_hodnoty'] = 'AUTO: Obě hodnoty nastaveny na 0 (chyběly)';
        return $data;
    }
    
    // Pravidlo 2: Pokud jedna hodnota není číslo → nastavit na 0
    if ($hodnota_bez_dph === null) {
        $hodnota_bez_dph = 0;
    }
    if ($hodnota_s_dph === null) {
        $hodnota_s_dph = 0;
    }
    
    // Pravidlo 3: Pokud je jedna z hodnot 0 a druhá > 0 → dopočítat
    $dph_rate = 1.21; // DPH 21%
    
    if ($hodnota_bez_dph > 0 && $hodnota_s_dph == 0) {
        // Dopočítat hodnotu S DPH z hodnoty BEZ DPH
        $hodnota_s_dph = round($hodnota_bez_dph * $dph_rate, 2);
        $data['_note_hodnoty'] = 'AUTO: Hodnota s DPH dopočítána (21% DPH)';
    } elseif ($hodnota_s_dph > 0 && $hodnota_bez_dph == 0) {
        // Dopočítat hodnotu BEZ DPH z hodnoty S DPH
        $hodnota_bez_dph = round($hodnota_s_dph / $dph_rate, 2);
        $data['_note_hodnoty'] = 'AUTO: Hodnota bez DPH dopočítána (21% DPH)';
    }
    
    // Nastavení normalizovaných hodnot
    $data['hodnota_bez_dph'] = $hodnota_bez_dph;
    $data['hodnota_s_dph'] = $hodnota_s_dph;
    
    return $data;
}

/**
 * Automatický výpočet stavu smlouvy podle logiky:
 * 1. aktivni = 0 => "NEAKTIVNI" (manuálně deaktivováno)
 * 2. platnost_od je NULL => "AKTIVNI" (datum od nebylo zadáno, platí pouze datum do)
 * 3. CURDATE() < platnost_od => "PRIPRAVOVANA" (ještě nezačala)
 * 4. CURDATE() > platnost_do => "UKONCENA" (vypršela)
 * 5. Jinak => "AKTIVNI" (platná)
 * 
 * POZOR: Stav je ENUM('AKTIVNI','UKONCENA','PRERUSENA','PRIPRAVOVANA','NEAKTIVNI')
 * 
 * @param int $aktivni Aktivní (0/1)
 * @param string $platnost_od Datum platnosti od (YYYY-MM-DD) nebo NULL
 * @param string $platnost_do Datum platnosti do (YYYY-MM-DD)
 * @return string Vypočítaný stav (AKTIVNI/UKONCENA/PRIPRAVOVANA/NEAKTIVNI)
 */
function calculateSmlouvaStav($aktivni, $platnost_od, $platnost_do) {
    // Priorita 1: Neaktivní smlouva = NEAKTIVNI
    if ((int)$aktivni === 0) {
        return 'NEAKTIVNI';
    }
    
    $today = date('Y-m-d');
    
    // Priorita 2: Pokud platnost_od není zadáno, platí od okamžiku vytvoření
    if (empty($platnost_od) || $platnost_od === null) {
        // Kontrolujeme pouze datum do
        if ($today > $platnost_do) {
            return 'UKONCENA';
        }
        return 'AKTIVNI';
    }
    
    // Priorita 3: Ještě nezačala platit = PRIPRAVOVANA
    if ($today < $platnost_od) {
        return 'PRIPRAVOVANA';
    }
    
    // Priorita 4: Již vypršela = UKONCENA
    if ($today > $platnost_do) {
        return 'UKONCENA';
    }
    
    // Priorita 5: Je platná = AKTIVNI
    return 'AKTIVNI';
}

/**
 * Validace dat smlouvy
 * 
 * @param array $data Data k validaci
 * @param PDO $db Databázové připojení (pro validaci proti číselníku)
 * @param bool $is_insert TRUE pokud je INSERT (povinná všechna pole), FALSE pro UPDATE
 * @return array Pole chybových zpráv (prázdné = validace OK)
 */
function validateSmlouvaData($data, $db, $is_insert = true) {
    $errors = array();
    
    // Required fields pro INSERT nebo pokud jsou v UPDATE
    if ($is_insert || isset($data['cislo_smlouvy'])) {
        if (empty($data['cislo_smlouvy'])) {
            $errors[] = 'Cislo smlouvy je povinne';
        }
    }
    
    if ($is_insert || isset($data['usek_id'])) {
        if (empty($data['usek_id']) || !is_numeric($data['usek_id'])) {
            $errors[] = 'ID useku je povinne a musi byt cislo';
        }
    }
    
    if ($is_insert || isset($data['druh_smlouvy'])) {
        if (empty($data['druh_smlouvy'])) {
            $errors[] = 'Druh smlouvy je povinny';
        } else {
            // Validace proti číselníku
            $stmt = $db->prepare("
                SELECT COUNT(*) as cnt 
                FROM " . TBL_CISELNIK_STAVY . " 
                WHERE typ_objektu = 'DRUH_SMLOUVY' 
                  AND kod_stavu = :druh_smlouvy 
                  AND aktivni = 1
            ");
            $stmt->execute([':druh_smlouvy' => $data['druh_smlouvy']]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['cnt'] == 0) {
                $errors[] = 'Neplatny druh smlouvy: ' . $data['druh_smlouvy'];
            }
        }
    }
    
    if ($is_insert || isset($data['nazev_firmy'])) {
        if (empty($data['nazev_firmy'])) {
            $errors[] = 'Nazev firmy je povinny';
        }
    }
    
    if ($is_insert || isset($data['nazev_smlouvy'])) {
        if (empty($data['nazev_smlouvy'])) {
            $errors[] = 'Nazev smlouvy je povinny';
        }
    }
    
    // Date validation
    // platnost_od - NEPOVINNÉ (ekonomové často neuvádějí)
    if (!empty($data['platnost_od']) && !strtotime($data['platnost_od'])) {
        $errors[] = 'Platnost od musi byt platne datum';
    }
    
    // platnost_do - NORMALIZUJE SE NA 31.12.2099 POKUD CHYBÍ
    // (neměli bychom vyžadovat, aby ekonomové vždycky znali konec platnosti)
    // Normalizace se provádí v bulk-import handleru
    if (!empty($data['platnost_do']) && !strtotime($data['platnost_do'])) {
        // Pokud je zadáno, ale není validní → chyba
        $errors[] = 'Platnost do musi byt platne datum (nebo ponechte prázdné pro 2099-12-31)';
    }
    
    // Date range validation
    if (!empty($data['platnost_od']) && !empty($data['platnost_do']) && strtotime($data['platnost_do']) && strtotime($data['platnost_od'])) {
        if (strtotime($data['platnost_do']) < strtotime($data['platnost_od'])) {
            $errors[] = 'Datum platnosti do musi byt po datu platnosti od';
        }
    }
    
    // IČO validation - ZRUŠENO, akceptujeme jakýkoliv formát
    // (IČO může mít různé formáty, včetně prefixů, mezer atd.)
    
    // Financial validation - akceptujeme 0 Kč jako validní hodnotu (>= 0)
    // Hodnoty se normalizují PŘED validací pomocí normalizeFinancialValues()
    // Takže zde už jen kontrolujeme, že jsou numeric a >= 0
    if ($is_insert || isset($data['hodnota_bez_dph'])) {
        if (!isset($data['hodnota_bez_dph']) || !is_numeric($data['hodnota_bez_dph'])) {
            $errors[] = 'Hodnota bez DPH musi byt cislo (po normalizaci)';
        } elseif ($data['hodnota_bez_dph'] < 0) {
            $errors[] = 'Hodnota bez DPH nesmi byt zaporna';
        }
    }
    
    if ($is_insert || isset($data['hodnota_s_dph'])) {
        if (!isset($data['hodnota_s_dph']) || !is_numeric($data['hodnota_s_dph'])) {
            $errors[] = 'Hodnota s DPH musi byt cislo (po normalizaci)';
        } elseif ($data['hodnota_s_dph'] < 0) {
            $errors[] = 'Hodnota s DPH nesmi byt zaporna';
        }
    }
    
    // STAV a ZBYVA - ignorujeme z inputu, počítá se automaticky
    // (nevalidujeme, protože se přepočítá)
    
    return $errors;
}

/**
 * 1. SEZNAM SMLUV
 * POST /ciselniky/smlouvy/list
 */
function handle_ciselniky_smlouvy_list($input, $config, $queries) {
    // Verify token
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatny nebo chybejici token'));
        return;
    }
    
    $user_id = $auth_result['id'];
    
    // TODO: Check permission SMLOUVY_VIEW
    // if (!check_permission($user_id, 'SMLOUVY_VIEW')) { ... }
    
    try {
        $db = get_db($config);
        
        // Build WHERE clause
        $where = array();
        $params = array();
        
        // Filter: show_inactive
        $show_inactive = isset($input['show_inactive']) && $input['show_inactive'];
        if (!$show_inactive) {
            $where[] = 's.aktivni = 1';
        }
        
        // Filter: usek_id
        if (isset($input['usek_id']) && !empty($input['usek_id'])) {
            $where[] = 's.usek_id = :usek_id';
            $params['usek_id'] = (int)$input['usek_id'];
        }
        
        // Filter: druh_smlouvy
        if (isset($input['druh_smlouvy']) && !empty($input['druh_smlouvy'])) {
            $where[] = 's.druh_smlouvy = :druh_smlouvy';
            $params['druh_smlouvy'] = $input['druh_smlouvy'];
        }
        
        // Filter: stav
        if (isset($input['stav']) && !empty($input['stav'])) {
            $where[] = 's.stav = :stav';
            $params['stav'] = $input['stav'];
        }
        
        // Filter: pouzit_v_obj_formu (pro OrderForm25 autocomplete)
        // Pokud je true, vrátí pouze smlouvy použitelné v objednávkovém formuláři
        if (isset($input['pouzit_v_obj_formu']) && $input['pouzit_v_obj_formu']) {
            $where[] = 's.pouzit_v_obj_formu = 1';
        }
        
        // Filter: search (fulltext)
        if (isset($input['search']) && !empty($input['search'])) {
            // Normalizovaný search bez diakritiky
            $normalizedSearch = '%' . str_replace(
                array('á','Á','č','Č','ď','Ď','é','É','ě','Ě','í','Í','ň','Ň','ó','Ó','ř','Ř','š','Š','ť','Ť','ú','Ú','ů','Ů','ý','Ý','ž','Ž'),
                array('a','A','c','C','d','D','e','E','e','E','i','I','n','N','o','O','r','R','s','S','t','T','u','U','u','U','y','Y','z','Z'),
                $input['search']
            ) . '%';
            
            $where[] = '(s.cislo_smlouvy LIKE :search 
                OR s.nazev_smlouvy LIKE :search
                OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                   REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                   REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                   s.nazev_smlouvy,
                   \'á\',\'a\'),\'Á\',\'A\'),\'č\',\'c\'),\'Č\',\'C\'),\'ď\',\'d\'),\'Ď\',\'D\'),\'é\',\'e\'),\'É\',\'E\'),\'ě\',\'e\'),\'Ě\',\'E\'),
                   \'í\',\'i\'),\'Í\',\'I\'),\'ň\',\'n\'),\'Ň\',\'N\'),\'ó\',\'o\'),\'Ó\',\'O\'),\'ř\',\'r\'),\'Ř\',\'R\'),\'š\',\'s\'),\'Š\',\'S\'),
                   \'ť\',\'t\'),\'Ť\',\'T\'),\'ú\',\'u\'),\'Ú\',\'U\'),\'ů\',\'u\'),\'Ů\',\'U\'),\'ý\',\'y\'),\'Ý\',\'Y\'),\'ž\',\'z\'),\'Ž\',\'Z\')
                   LIKE :search_normalized
                OR s.popis_smlouvy LIKE :search 
                OR s.nazev_firmy LIKE :search)';
            $params['search'] = '%' . $input['search'] . '%';
            $params['search_normalized'] = $normalizedSearch;
        }
        
        // Filter: platnost_od
        if (isset($input['platnost_od']) && !empty($input['platnost_od'])) {
            $where[] = 's.platnost_od >= :platnost_od';
            $params['platnost_od'] = $input['platnost_od'];
        }
        
        // Filter: platnost_do
        if (isset($input['platnost_do']) && !empty($input['platnost_do'])) {
            $where[] = 's.platnost_do <= :platnost_do';
            $params['platnost_do'] = $input['platnost_do'];
        }
        
        $where_sql = empty($where) ? '' : 'WHERE ' . implode(' AND ', $where);
        
        // Count query
        $count_sql = "SELECT COUNT(*) as total FROM " . TBL_SMLOUVY . " s $where_sql";
        $stmt = $db->prepare($count_sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->execute();
        $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Main query with pagination
        $limit = isset($input['limit']) ? (int)$input['limit'] : 1000;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        
        // MySQL 5.5 nemá JSON_EXTRACT, takže JOIN na financovani musí používat LIKE
        // financovani obsahuje JSON: {"typ":"SMLOUVA","cislo_smlouvy":"XXX",...}
        $sql = "
            SELECT 
                s.*,
                u.usek_zkr,
                u.usek_nazev,
                (
                    SELECT COUNT(*)
                    FROM " . TBL_OBJEDNAVKY . " o
                    WHERE o.financovani LIKE CONCAT('%\"cislo_smlouvy\":\"', s.cislo_smlouvy, '\"%')
                      AND o.aktivni = 1
                      AND o.stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA')
                ) AS pocet_objednavek
            FROM " . TBL_SMLOUVY . " s
            LEFT JOIN " . TBL_USEKY . " u ON s.usek_id = u.id
            $where_sql
            ORDER BY s.dt_vytvoreni DESC
            LIMIT $limit OFFSET $offset
        ";
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->execute();
        
        $data = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Type casting
            $row['id'] = (int)$row['id'];
            $row['usek_id'] = (int)$row['usek_id'];
            $row['aktivni'] = (int)$row['aktivni'];
            $row['pouzit_v_obj_formu'] = isset($row['pouzit_v_obj_formu']) ? (int)$row['pouzit_v_obj_formu'] : 0;
            $row['pocet_objednavek'] = (int)$row['pocet_objednavek'];
            $row['hodnota_bez_dph'] = (float)$row['hodnota_bez_dph'];
            $row['hodnota_s_dph'] = (float)$row['hodnota_s_dph'];
            $row['sazba_dph'] = (float)$row['sazba_dph'];
            $row['hodnota_plneni_bez_dph'] = isset($row['hodnota_plneni_bez_dph']) ? (float)$row['hodnota_plneni_bez_dph'] : null;
            $row['hodnota_plneni_s_dph'] = isset($row['hodnota_plneni_s_dph']) ? (float)$row['hodnota_plneni_s_dph'] : null;
            $row['cerpano_celkem'] = (float)$row['cerpano_celkem'];
            $row['zbyva'] = (float)$row['zbyva'];
            $row['procento_cerpani'] = (float)$row['procento_cerpani'];
            
            $data[] = $row;
        }
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => $data,
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'timestamp' => date('c'),
                'total' => (int)$total,
                'limit' => $limit,
                'offset' => $offset,
                'returned' => count($data)
            )
        ));
        
    } catch (Exception $e) {
        error_log('SMLOUVY LIST ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba pri nacitani smluv: ' . $e->getMessage()));
    }
}

/**
 * 2. DETAIL SMLOUVY
 * POST /ciselniky/smlouvy/detail
 */
function handle_ciselniky_smlouvy_detail($input, $config, $queries) {
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatny nebo chybejici token'));
        return;
    }
    
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybi ID smlouvy'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Get contract
        $sql = "SELECT s.*, u.usek_zkr, u.usek_nazev 
                FROM " . TBL_SMLOUVY . " s
                LEFT JOIN " . TBL_USEKY . " u ON s.usek_id = u.id
                WHERE s.id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $smlouva = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$smlouva) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Smlouva nenalezena'));
            return;
        }
        
        // Type casting
        $smlouva['id'] = (int)$smlouva['id'];
        $smlouva['usek_id'] = (int)$smlouva['usek_id'];
        $smlouva['aktivni'] = (int)$smlouva['aktivni'];
        $smlouva['pouzit_v_obj_formu'] = isset($smlouva['pouzit_v_obj_formu']) ? (int)$smlouva['pouzit_v_obj_formu'] : 0;
        $smlouva['hodnota_bez_dph'] = (float)$smlouva['hodnota_bez_dph'];
        $smlouva['hodnota_s_dph'] = (float)$smlouva['hodnota_s_dph'];
        $smlouva['sazba_dph'] = (float)$smlouva['sazba_dph'];
        $smlouva['hodnota_plneni_bez_dph'] = isset($smlouva['hodnota_plneni_bez_dph']) ? (float)$smlouva['hodnota_plneni_bez_dph'] : null;
        $smlouva['hodnota_plneni_s_dph'] = isset($smlouva['hodnota_plneni_s_dph']) ? (float)$smlouva['hodnota_plneni_s_dph'] : null;
        $smlouva['cerpano_celkem'] = (float)$smlouva['cerpano_celkem'];
        $smlouva['zbyva'] = (float)$smlouva['zbyva'];
        $smlouva['procento_cerpani'] = (float)$smlouva['procento_cerpani'];
        
        // Get related orders
        // financovani obsahuje JSON: {"typ":"SMLOUVA","cislo_smlouvy":"XXX",...}
        // POZOR: MySQL escapuje lomítka jako \/ takže musíme použít REPLACE()
        $sql_objednavky = "
            SELECT 
                o.id,
                o.cislo_objednavky AS ev_cislo,
                o.predmet,
                o.stav_objednavky AS stav,
                o.max_cena_s_dph AS castka_s_dph,
                o.dt_vytvoreni AS dt_prirazeni
            FROM " . TBL_OBJEDNAVKY . " o
            WHERE REPLACE(o.financovani, '\\\\/', '/') LIKE CONCAT('%\"cislo_smlouvy\":\"', :cislo_smlouvy, '\"%')
              AND o.aktivni = 1
            ORDER BY o.dt_vytvoreni DESC
        ";
        
        $stmt = $db->prepare($sql_objednavky);
        $stmt->bindValue(':cislo_smlouvy', $smlouva['cislo_smlouvy'], PDO::PARAM_STR);
        $stmt->execute();
        
        $objednavky = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $row['id'] = (int)$row['id'];
            $row['castka_s_dph'] = (float)$row['castka_s_dph'];
            $objednavky[] = $row;
        }
        
        // Statistics
        $sql_stats = "
            SELECT 
                COUNT(*) as pocet_objednavek,
                COALESCE(SUM(max_cena_s_dph), 0) as celkem_cerpano,
                COALESCE(AVG(max_cena_s_dph), 0) as prumerna_objednavka,
                COALESCE(MAX(max_cena_s_dph), 0) as nejvetsi_objednavka,
                COALESCE(MIN(max_cena_s_dph), 0) as nejmensi_objednavka
            FROM " . TBL_OBJEDNAVKY . "
            WHERE financovani LIKE CONCAT('%\"cislo_smlouvy\":\"', :cislo_smlouvy, '\"%')
              AND aktivni = 1
              AND stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA')
        ";
        
        $stmt = $db->prepare($sql_stats);
        $stmt->bindValue(':cislo_smlouvy', $smlouva['cislo_smlouvy'], PDO::PARAM_STR);
        $stmt->execute();
        $statistiky = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Type casting stats
        $statistiky['pocet_objednavek'] = (int)$statistiky['pocet_objednavek'];
        $statistiky['celkem_cerpano'] = (float)$statistiky['celkem_cerpano'];
        $statistiky['prumerna_objednavka'] = (float)$statistiky['prumerna_objednavka'];
        $statistiky['nejvetsi_objednavka'] = (float)$statistiky['nejvetsi_objednavka'];
        $statistiky['nejmensi_objednavka'] = (float)$statistiky['nejmensi_objednavka'];
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'smlouva' => $smlouva,
                'objednavky' => $objednavky,
                'statistiky' => $statistiky
            ),
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'timestamp' => date('c')
            )
        ));
        
    } catch (Exception $e) {
        error_log('SMLOUVY DETAIL ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba pri nacitani detailu: ' . $e->getMessage()));
    }
}

/**
 * 3. VYTVOŘENÍ SMLOUVY
 * POST /ciselniky/smlouvy/insert
 */
function handle_ciselniky_smlouvy_insert($input, $config, $queries) {
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatny nebo chybejici token'));
        return;
    }
    
    $user_id = $auth_result['id'];
    
    // TODO: Check permission SMLOUVY_CREATE
    
    try {
        $db = get_db($config);
        
        // Validate
        $errors = validateSmlouvaData($input, $db);
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => implode(', ', $errors)));
            return;
        }
        
        // Check duplicate cislo_smlouvy
        $sql = "SELECT id FROM " . TBL_SMLOUVY . " WHERE cislo_smlouvy = :cislo_smlouvy";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':cislo_smlouvy', $input['cislo_smlouvy'], PDO::PARAM_STR);
        $stmt->execute();
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(array('status' => 'error', 'message' => 'Smlouva s timto cislem jiz existuje'));
            return;
        }
        
        // Get usek_zkr
        $sql = "SELECT usek_zkr FROM " . TBL_USEKY . " WHERE id = :usek_id";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':usek_id', (int)$input['usek_id'], PDO::PARAM_INT);
        $stmt->execute();
        $usek = $stmt->fetch(PDO::FETCH_ASSOC);
        $usek_zkr = $usek ? $usek['usek_zkr'] : null;
        
        // Prepare values
        $hodnota_s_dph = (float)$input['hodnota_s_dph'];
        $hodnota_bez_dph = isset($input['hodnota_bez_dph']) ? (float)$input['hodnota_bez_dph'] : 0;
        $sazba_dph = isset($input['sazba_dph']) ? (float)$input['sazba_dph'] : 21.00;
        $zbyva = 0; // Zbývá se počítá algoritmem, při vytvoření je vždy 0
        $aktivni = isset($input['aktivni']) ? (int)$input['aktivni'] : 1;
        
        // Automatický výpočet stavu (ignoruje $input['stav'])
        $stav = calculateSmlouvaStav($aktivni, $input['platnost_od'], $input['platnost_do']);
        
        // Hodnota plnění (nová pole)
        $hodnota_plneni_bez_dph = isset($input['hodnota_plneni_bez_dph']) ? (float)$input['hodnota_plneni_bez_dph'] : null;
        $hodnota_plneni_s_dph = isset($input['hodnota_plneni_s_dph']) ? (float)$input['hodnota_plneni_s_dph'] : null;
        
        // Pouzit_v_obj_formu - defaultně 0 (pouze v modulu smluv a faktur)
        $pouzit_v_obj_formu = isset($input['pouzit_v_obj_formu']) ? (int)$input['pouzit_v_obj_formu'] : 0;
        
        // Insert
        $sql = "
            INSERT INTO " . TBL_SMLOUVY . " (
                cislo_smlouvy, usek_id, usek_zkr, druh_smlouvy,
                nazev_firmy, ico, dic, nazev_smlouvy, popis_smlouvy,
                platnost_od, platnost_do,
                hodnota_bez_dph, hodnota_s_dph, sazba_dph,
                hodnota_plneni_bez_dph, hodnota_plneni_s_dph,
                aktivni, pouzit_v_obj_formu, stav, poznamka, cislo_dms, kategorie,
                dt_vytvoreni, vytvoril_user_id, dt_aktualizace, upravil_user_id,
                cerpano_celkem, zbyva, procento_cerpani
            ) VALUES (
                :cislo_smlouvy, :usek_id, :usek_zkr, :druh_smlouvy,
                :nazev_firmy, :ico, :dic, :nazev_smlouvy, :popis_smlouvy,
                :platnost_od, :platnost_do,
                :hodnota_bez_dph, :hodnota_s_dph, :sazba_dph,
                :hodnota_plneni_bez_dph, :hodnota_plneni_s_dph,
                :aktivni, :pouzit_v_obj_formu, :stav, :poznamka, :cislo_dms, :kategorie,
                NOW(), :vytvoril_user_id, NOW(), :upravil_user_id,
                0, :zbyva, 0
            )
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':cislo_smlouvy', $input['cislo_smlouvy'], PDO::PARAM_STR);
        $stmt->bindValue(':usek_id', (int)$input['usek_id'], PDO::PARAM_INT);
        $stmt->bindValue(':usek_zkr', $usek_zkr, PDO::PARAM_STR);
        $stmt->bindValue(':druh_smlouvy', $input['druh_smlouvy'], PDO::PARAM_STR);
        $stmt->bindValue(':nazev_firmy', $input['nazev_firmy'], PDO::PARAM_STR);
        $stmt->bindValue(':ico', isset($input['ico']) ? $input['ico'] : null, PDO::PARAM_STR);
        $stmt->bindValue(':dic', isset($input['dic']) ? $input['dic'] : null, PDO::PARAM_STR);
        $stmt->bindValue(':nazev_smlouvy', $input['nazev_smlouvy'], PDO::PARAM_STR);
        $stmt->bindValue(':popis_smlouvy', isset($input['popis_smlouvy']) ? $input['popis_smlouvy'] : null, PDO::PARAM_STR);
        // Ošetření NULL hodnot pro datumy - použit PDO::PARAM_NULL pro NULL hodnoty
        $platnost_od_value = (!empty($input['platnost_od']) && $input['platnost_od'] !== null) ? $input['platnost_od'] : null;
        if ($platnost_od_value === null) {
            $stmt->bindValue(':platnost_od', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':platnost_od', $platnost_od_value, PDO::PARAM_STR);
        }
        $stmt->bindValue(':platnost_do', $input['platnost_do'], PDO::PARAM_STR);
        $stmt->bindValue(':hodnota_bez_dph', $hodnota_bez_dph);
        $stmt->bindValue(':hodnota_s_dph', $hodnota_s_dph);
        $stmt->bindValue(':sazba_dph', $sazba_dph);
        $stmt->bindValue(':hodnota_plneni_bez_dph', $hodnota_plneni_bez_dph);
        $stmt->bindValue(':hodnota_plneni_s_dph', $hodnota_plneni_s_dph);
        $stmt->bindValue(':aktivni', $aktivni, PDO::PARAM_INT);
        $stmt->bindValue(':pouzit_v_obj_formu', $pouzit_v_obj_formu, PDO::PARAM_INT);
        $stmt->bindValue(':stav', $stav, PDO::PARAM_STR);
        $stmt->bindValue(':poznamka', isset($input['poznamka']) ? $input['poznamka'] : null, PDO::PARAM_STR);
        $stmt->bindValue(':cislo_dms', isset($input['cislo_dms']) ? $input['cislo_dms'] : null, PDO::PARAM_STR);
        $stmt->bindValue(':kategorie', isset($input['kategorie']) ? $input['kategorie'] : null, PDO::PARAM_STR);
        $stmt->bindValue(':vytvoril_user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindValue(':upravil_user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindValue(':zbyva', $zbyva); // zbyva z inputu nebo hodnota_s_dph
        
        if ($stmt->execute()) {
            $new_id = $db->lastInsertId();
            
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Smlouva byla uspesne vytvorena',
                'data' => array(
                    'id' => (int)$new_id
                ),
                'meta' => array(
                    'version' => 'v2',
                    'standardized' => true,
                    'created_id' => (int)$new_id,
                    'timestamp' => date('c')
                )
            ));
        } else {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => 'Chyba pri vytvareni smlouvy'));
        }
        
    } catch (Exception $e) {
        error_log('SMLOUVY INSERT ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba pri vytvareni smlouvy: ' . $e->getMessage()));
    }
}

/**
 * 4. AKTUALIZACE SMLOUVY
 * POST /ciselniky/smlouvy/update
 */
function handle_ciselniky_smlouvy_update($input, $config, $queries) {
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatny nebo chybejici token'));
        return;
    }
    
    $user_id = $auth_result['id'];
    
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybi ID smlouvy'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Validate
        $errors = validateSmlouvaData($input, $db, false);
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(array('status' => 'error', 'message' => implode(', ', $errors)));
            return;
        }
        
        // Check exists
        $sql = "SELECT id FROM " . TBL_SMLOUVY . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Smlouva nenalezena'));
            return;
        }
        
        // Build UPDATE query dynamically
        $set = array();
        $params = array('id' => $id, 'upravil_user_id' => $user_id);
        
        // Povolené sloupce k updatu (stav a zbyva se ignoruje - počítá se automaticky)
        $allowed_fields = array(
            'cislo_smlouvy', 'usek_id', 'druh_smlouvy',
            'nazev_firmy', 'ico', 'dic', 'nazev_smlouvy', 'popis_smlouvy',
            'platnost_od', 'platnost_do',
            'hodnota_bez_dph', 'hodnota_s_dph', 'sazba_dph',
            'hodnota_plneni_bez_dph', 'hodnota_plneni_s_dph',
            'aktivni', 'pouzit_v_obj_formu', 'poznamka', 'cislo_dms', 'kategorie'
        );
        
        foreach ($allowed_fields as $field) {
            if (array_key_exists($field, $input)) {
                // Ošetření NULL hodnot pro platnost_od - pokud je NULL nebo prázdný string, uložíme NULL
                if ($field === 'platnost_od' && ($input[$field] === null || $input[$field] === '' || $input[$field] === 'null')) {
                    $set[] = "$field = :$field";
                    $params[$field] = null;
                } else {
                    $set[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }
        }
        
        // Get usek_zkr if usek_id changed
        if (isset($input['usek_id'])) {
            $sql = "SELECT usek_zkr FROM " . TBL_USEKY . " WHERE id = :usek_id";
            $stmt = $db->prepare($sql);
            $stmt->bindValue(':usek_id', (int)$input['usek_id'], PDO::PARAM_INT);
            $stmt->execute();
            $usek = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($usek) {
                $set[] = "usek_zkr = :usek_zkr";
                $params['usek_zkr'] = $usek['usek_zkr'];
            }
        }
        
        // Automatický přepočet stavu (pokud se změnily relevantní pole)
        if (isset($input['aktivni']) || isset($input['platnost_od']) || isset($input['platnost_do'])) {
            // Načteme aktuální hodnoty z DB
            $sql_current = "SELECT aktivni, platnost_od, platnost_do FROM " . TBL_SMLOUVY . " WHERE id = :id";
            $stmt_current = $db->prepare($sql_current);
            $stmt_current->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt_current->execute();
            $current = $stmt_current->fetch(PDO::FETCH_ASSOC);
            
            // Použijeme nové hodnoty nebo současné
            $aktivni = isset($input['aktivni']) ? (int)$input['aktivni'] : (int)$current['aktivni'];
            $platnost_od = isset($input['platnost_od']) ? $input['platnost_od'] : $current['platnost_od'];
            $platnost_do = isset($input['platnost_do']) ? $input['platnost_do'] : $current['platnost_do'];
            
            // Přepočítáme stav
            $new_stav = calculateSmlouvaStav($aktivni, $platnost_od, $platnost_do);
            $set[] = "stav = :stav";
            $params['stav'] = $new_stav;
        }
        
        $set[] = "dt_aktualizace = NOW()";
        $set[] = "upravil_user_id = :upravil_user_id";
        
        $sql = "UPDATE " . TBL_SMLOUVY . " SET " . implode(', ', $set) . " WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            // Použit PDO::PARAM_NULL pro NULL hodnoty
            if ($value === null) {
                $stmt->bindValue(':' . $key, null, PDO::PARAM_NULL);
            } else if (is_int($value)) {
                $stmt->bindValue(':' . $key, $value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(':' . $key, $value, PDO::PARAM_STR);
            }
        }
        
        if ($stmt->execute()) {
            echo json_encode(array(
                'status' => 'ok',
                'message' => 'Smlouva byla uspesne aktualizovana',
                'meta' => array(
                    'version' => 'v2',
                    'standardized' => true,
                    'updated_id' => (int)$id,
                    'timestamp' => date('c')
                )
            ));
        } else {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => 'Chyba pri aktualizaci smlouvy'));
        }
        
    } catch (Exception $e) {
        error_log('SMLOUVY UPDATE ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba pri aktualizaci smlouvy: ' . $e->getMessage()));
    }
}

/**
 * 5. SMAZÁNÍ SMLOUVY (soft delete)
 * POST /ciselniky/smlouvy/delete
 */
function handle_ciselniky_smlouvy_delete($input, $config, $queries) {
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatny nebo chybejici token'));
        return;
    }
    
    $user_id = $auth_result['id'];
    
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybi ID smlouvy'));
        return;
    }
    
    try {
        $db = get_db($config);
        
        // Soft delete - set aktivni = 0 a přepočítej stav na "NEAKTIVNI"
        $sql = "UPDATE " . TBL_SMLOUVY . " SET aktivni = 0, stav = 'NEAKTIVNI', dt_aktualizace = NOW(), upravil_user_id = :upravil_user_id WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':upravil_user_id', $user_id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                echo json_encode(array(
                    'status' => 'ok',
                    'message' => 'Smlouva byla uspesne smazana',
                    'meta' => array(
                        'version' => 'v2',
                        'standardized' => true,
                        'deleted_id' => (int)$id,
                        'timestamp' => date('c')
                    )
                ));
            } else {
                http_response_code(404);
                echo json_encode(array('status' => 'error', 'message' => 'Smlouva nenalezena'));
            }
        } else {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => 'Chyba pri mazani smlouvy'));
        }
        
    } catch (Exception $e) {
        error_log('SMLOUVY DELETE ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba pri mazani smlouvy: ' . $e->getMessage()));
    }
}

/**
 * 6. HROMADNÝ IMPORT
 * POST /ciselniky/smlouvy/bulk-import
 */
function handle_ciselniky_smlouvy_bulk_import($input, $config, $queries) {
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatny nebo chybejici token'));
        return;
    }
    
    $user_id = $auth_result['id'];
    
    if (!isset($input['data']) || !is_array($input['data'])) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybi data pro import'));
        return;
    }
    
    $data = $input['data'];
    $overwrite = isset($input['overwrite_existing']) && $input['overwrite_existing'];
    
    $celkem = count($data);
    $uspesne = 0;
    $aktualizovano = 0;
    $preskoceno = 0;
    $chyby = array();
    
    $start_time = microtime(true);
    
    try {
        $db = get_db($config);
        $db->beginTransaction();
        
        foreach ($data as $index => $row) {
            $row_num = $index + 1;
            
            // NORMALIZACE 1: Pokud "platnost_do" chybí, nastav na 31.12.2099
            // Tohle se dělá PŘED validací, aby smlouva bez konce nebyly vyloučeny
            if (!isset($row['platnost_do']) || empty($row['platnost_do'])) {
                $row['platnost_do'] = '2099-12-31';
                // Log informace, že jsme normalizovali
                error_log("SMLOUVY IMPORT: Smlouva bez 'platnost_do' -> normalizace na 2099-12-31");
            } else {
                // Normalizuj už existující hodnotu (formátování)
                $row['platnost_do'] = normalizePlatnostDo($row['platnost_do']);
            }
            
            // NORMALIZACE 2: Finanční hodnoty (dopočet DPH, parsování, 0 pro chybějící)
            // Tohle se dělá PŘED validací, aby smlouva s nulovou hodnotou prošla
            $row = normalizeFinancialValues($row);
            error_log("SMLOUVY IMPORT: Normalizace hodnot - bez DPH: " . $row['hodnota_bez_dph'] . ", s DPH: " . $row['hodnota_s_dph']);
            
            // Map usek_zkr to usek_id
            if (isset($row['usek_zkr'])) {
                $sql = "SELECT id, usek_zkr FROM " . TBL_USEKY . " WHERE usek_zkr = :usek_zkr";
                $stmt = $db->prepare($sql);
                $stmt->bindValue(':usek_zkr', $row['usek_zkr'], PDO::PARAM_STR);
                $stmt->execute();
                $usek = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$usek) {
                    $chyby[] = array(
                        'row' => $row_num,
                        'cislo_smlouvy' => isset($row['cislo_smlouvy']) ? $row['cislo_smlouvy'] : 'N/A',
                        'error' => 'Usek nenalezen: ' . $row['usek_zkr']
                    );
                    continue;
                }
                
                $row['usek_id'] = $usek['id'];
            }
            
            // Validate
            $validation_errors = validateSmlouvaData($row, $db);
            if (!empty($validation_errors)) {
                $chyby[] = array(
                    'row' => $row_num,
                    'cislo_smlouvy' => isset($row['cislo_smlouvy']) ? $row['cislo_smlouvy'] : 'N/A',
                    'error' => implode(', ', $validation_errors)
                );
                continue;
            }
            
            // Check if exists
            $sql = "SELECT id FROM " . TBL_SMLOUVY . " WHERE cislo_smlouvy = :cislo_smlouvy";
            $stmt = $db->prepare($sql);
            $stmt->bindValue(':cislo_smlouvy', $row['cislo_smlouvy'], PDO::PARAM_STR);
            $stmt->execute();
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing && !$overwrite) {
                $preskoceno++;
                continue;
            }
            
            if ($existing && $overwrite) {
                // UPDATE existující smlouvy
                $hodnota_s_dph = (float)$row['hodnota_s_dph'];
                $hodnota_bez_dph = isset($row['hodnota_bez_dph']) ? (float)$row['hodnota_bez_dph'] : 0;
                $hodnota_plneni_bez_dph = isset($row['hodnota_plneni_bez_dph']) ? (float)$row['hodnota_plneni_bez_dph'] : null;
                $hodnota_plneni_s_dph = isset($row['hodnota_plneni_s_dph']) ? (float)$row['hodnota_plneni_s_dph'] : null;
                $aktivni = isset($row['aktivni']) ? (int)$row['aktivni'] : 1;
                $stav = calculateSmlouvaStav($aktivni, $row['platnost_od'], $row['platnost_do']);
                
                $sql_update = "
                    UPDATE " . TBL_SMLOUVY . " SET
                        usek_id = :usek_id,
                        usek_zkr = :usek_zkr,
                        druh_smlouvy = :druh_smlouvy,
                        nazev_firmy = :nazev_firmy,
                        ico = :ico,
                        dic = :dic,
                        nazev_smlouvy = :nazev_smlouvy,
                        popis_smlouvy = :popis_smlouvy,
                        platnost_od = :platnost_od,
                        platnost_do = :platnost_do,
                        hodnota_bez_dph = :hodnota_bez_dph,
                        hodnota_s_dph = :hodnota_s_dph,
                        sazba_dph = :sazba_dph,
                        hodnota_plneni_bez_dph = :hodnota_plneni_bez_dph,
                        hodnota_plneni_s_dph = :hodnota_plneni_s_dph,
                        aktivni = :aktivni,
                        stav = :stav,
                        poznamka = :poznamka,
                        cislo_dms = :cislo_dms,
                        kategorie = :kategorie,
                        dt_aktualizace = NOW(),
                        upravil_user_id = :upravil_user_id
                    WHERE cislo_smlouvy = :cislo_smlouvy
                ";
                
                $stmt = $db->prepare($sql_update);
                $stmt->bindValue(':cislo_smlouvy', $row['cislo_smlouvy'], PDO::PARAM_STR);
                $stmt->bindValue(':usek_id', (int)$row['usek_id'], PDO::PARAM_INT);
                $stmt->bindValue(':usek_zkr', $row['usek_zkr'], PDO::PARAM_STR);
                $stmt->bindValue(':druh_smlouvy', $row['druh_smlouvy'], PDO::PARAM_STR);
                $stmt->bindValue(':nazev_firmy', $row['nazev_firmy'], PDO::PARAM_STR);
                $stmt->bindValue(':ico', isset($row['ico']) ? $row['ico'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':dic', isset($row['dic']) ? $row['dic'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':nazev_smlouvy', $row['nazev_smlouvy'], PDO::PARAM_STR);
                $stmt->bindValue(':popis_smlouvy', isset($row['popis_smlouvy']) ? $row['popis_smlouvy'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':platnost_od', $row['platnost_od'], PDO::PARAM_STR);
                $stmt->bindValue(':platnost_do', $row['platnost_do'], PDO::PARAM_STR);
                $stmt->bindValue(':hodnota_bez_dph', $hodnota_bez_dph);
                $stmt->bindValue(':hodnota_s_dph', $hodnota_s_dph);
                $stmt->bindValue(':sazba_dph', isset($row['sazba_dph']) ? (float)$row['sazba_dph'] : 21.00);
                $stmt->bindValue(':hodnota_plneni_bez_dph', $hodnota_plneni_bez_dph);
                $stmt->bindValue(':hodnota_plneni_s_dph', $hodnota_plneni_s_dph);
                $stmt->bindValue(':aktivni', $aktivni, PDO::PARAM_INT);
                $stmt->bindValue(':stav', $stav, PDO::PARAM_STR);
                $stmt->bindValue(':poznamka', isset($row['poznamka']) ? $row['poznamka'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':cislo_dms', isset($row['cislo_dms']) ? $row['cislo_dms'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':kategorie', isset($row['kategorie']) ? $row['kategorie'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':upravil_user_id', $user_id, PDO::PARAM_INT);
                
                if ($stmt->execute()) {
                    $aktualizovano++;
                } else {
                    $chyby[] = array(
                        'row' => $row_num,
                        'cislo_smlouvy' => $row['cislo_smlouvy'],
                        'error' => 'DB UPDATE error'
                    );
                }
            } else {
                // INSERT nové smlouvy
                $hodnota_s_dph = (float)$row['hodnota_s_dph'];
                $hodnota_bez_dph = isset($row['hodnota_bez_dph']) ? (float)$row['hodnota_bez_dph'] : 0;
                $hodnota_plneni_bez_dph = isset($row['hodnota_plneni_bez_dph']) ? (float)$row['hodnota_plneni_bez_dph'] : null;
                $hodnota_plneni_s_dph = isset($row['hodnota_plneni_s_dph']) ? (float)$row['hodnota_plneni_s_dph'] : null;
                $aktivni = isset($row['aktivni']) ? (int)$row['aktivni'] : 1;
                
                // Import CSV: defaultně pouzit_v_obj_formu = 0 (pouze modul smluv + faktury)
                $pouzit_v_obj_formu = isset($row['pouzit_v_obj_formu']) ? (int)$row['pouzit_v_obj_formu'] : 0;
                
                // Automatický výpočet stavu (ignoruje $row['stav'])
                $stav = calculateSmlouvaStav($aktivni, $row['platnost_od'], $row['platnost_do']);
                
                $sql = "
                    INSERT INTO " . TBL_SMLOUVY . " (
                        cislo_smlouvy, usek_id, usek_zkr, druh_smlouvy,
                        nazev_firmy, ico, dic, nazev_smlouvy, popis_smlouvy,
                        platnost_od, platnost_do,
                        hodnota_bez_dph, hodnota_s_dph, sazba_dph,
                        hodnota_plneni_bez_dph, hodnota_plneni_s_dph,
                        aktivni, pouzit_v_obj_formu, stav, poznamka, cislo_dms, kategorie,
                        dt_vytvoreni, vytvoril_user_id, dt_aktualizace, upravil_user_id,
                        cerpano_celkem, zbyva, procento_cerpani
                    ) VALUES (
                        :cislo_smlouvy, :usek_id, :usek_zkr, :druh_smlouvy,
                        :nazev_firmy, :ico, :dic, :nazev_smlouvy, :popis_smlouvy,
                        :platnost_od, :platnost_do,
                        :hodnota_bez_dph, :hodnota_s_dph, :sazba_dph,
                        :hodnota_plneni_bez_dph, :hodnota_plneni_s_dph,
                        :aktivni, :pouzit_v_obj_formu, :stav, :poznamka, :cislo_dms, :kategorie,
                        NOW(), :vytvoril_user_id, NOW(), :upravil_user_id,
                        0, :zbyva, 0
                    )
                ";
                
                $stmt = $db->prepare($sql);
                $stmt->bindValue(':cislo_smlouvy', $row['cislo_smlouvy'], PDO::PARAM_STR);
                $stmt->bindValue(':usek_id', (int)$row['usek_id'], PDO::PARAM_INT);
                $stmt->bindValue(':usek_zkr', $row['usek_zkr'], PDO::PARAM_STR);
                $stmt->bindValue(':druh_smlouvy', $row['druh_smlouvy'], PDO::PARAM_STR);
                $stmt->bindValue(':nazev_firmy', $row['nazev_firmy'], PDO::PARAM_STR);
                $stmt->bindValue(':ico', isset($row['ico']) ? $row['ico'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':dic', isset($row['dic']) ? $row['dic'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':nazev_smlouvy', $row['nazev_smlouvy'], PDO::PARAM_STR);
                $stmt->bindValue(':popis_smlouvy', isset($row['popis_smlouvy']) ? $row['popis_smlouvy'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':platnost_od', $row['platnost_od'], PDO::PARAM_STR);
                $stmt->bindValue(':platnost_do', $row['platnost_do'], PDO::PARAM_STR);
                $stmt->bindValue(':hodnota_bez_dph', $hodnota_bez_dph);
                $stmt->bindValue(':hodnota_s_dph', $hodnota_s_dph);
                $stmt->bindValue(':sazba_dph', isset($row['sazba_dph']) ? (float)$row['sazba_dph'] : 21.00);
                $stmt->bindValue(':hodnota_plneni_bez_dph', $hodnota_plneni_bez_dph);
                $stmt->bindValue(':hodnota_plneni_s_dph', $hodnota_plneni_s_dph);
                $stmt->bindValue(':aktivni', $aktivni, PDO::PARAM_INT);
                $stmt->bindValue(':pouzit_v_obj_formu', $pouzit_v_obj_formu, PDO::PARAM_INT);
                $stmt->bindValue(':stav', $stav, PDO::PARAM_STR);
                $stmt->bindValue(':poznamka', isset($row['poznamka']) ? $row['poznamka'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':cislo_dms', isset($row['cislo_dms']) ? $row['cislo_dms'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':kategorie', isset($row['kategorie']) ? $row['kategorie'] : null, PDO::PARAM_STR);
                $stmt->bindValue(':vytvoril_user_id', $user_id, PDO::PARAM_INT);
                $stmt->bindValue(':upravil_user_id', $user_id, PDO::PARAM_INT);
                $stmt->bindValue(':zbyva', $hodnota_s_dph);
                
                if ($stmt->execute()) {
                    $uspesne++;
                } else {
                    $chyby[] = array(
                        'row' => $row_num,
                        'cislo_smlouvy' => $row['cislo_smlouvy'],
                        'error' => 'DB error'
                    );
                }
            }
        }
        
        // Log import
        $status = count($chyby) == 0 ? 'SUCCESS' : (count($chyby) < $celkem ? 'PARTIAL' : 'FAILED');
        $chyby_json = json_encode($chyby);
        
        // 🛡️ OCHRANA: Pokud JSON je větší než 15 MB (MEDIUMTEXT limit), zkrať ho
        // MEDIUMTEXT limit = 16,777,215 bytů (16 MB), používáme 15 MB jako safe limit
        $max_size = 15 * 1024 * 1024; // 15 MB
        if (strlen($chyby_json) > $max_size) {
            // Počet chyb k zachování (odhadujeme průměrnou velikost na 500 bytů/chyba)
            $keep_count = floor($max_size / 500);
            $truncated_chyby = array_slice($chyby, 0, $keep_count);
            $truncated_chyby[] = array(
                'warning' => 'TRUNCATED',
                'message' => 'Chybových záznamů bylo příliš mnoho (' . count($chyby) . '), zobrazeno pouze prvních ' . $keep_count,
                'total_errors' => count($chyby)
            );
            $chyby_json = json_encode($truncated_chyby);
            error_log("CSV Import: Chybové záznamy zkráceny z " . count($chyby) . " na " . $keep_count . " (JSON size: " . strlen($chyby_json) . " bytů)");
        }
        
        // Informace o souboru (volitelné, FE může poslat)
        $nazev_souboru = isset($input['nazev_souboru']) ? $input['nazev_souboru'] : null;
        $typ_souboru = isset($input['typ_souboru']) ? $input['typ_souboru'] : null;
        $velikost_souboru = isset($input['velikost_souboru']) ? (int)$input['velikost_souboru'] : null;
        
        $sql = "
            INSERT INTO 25_smlouvy_import_log (
                dt_importu, user_id, username,
                nazev_souboru, typ_souboru, velikost_souboru,
                pocet_radku, pocet_uspesnych, pocet_aktualizovanych,
                pocet_preskoceno, pocet_chyb,
                chybove_zaznamy, status, overwrite_existing
            ) VALUES (
                NOW(), :user_id, :username,
                :nazev_souboru, :typ_souboru, :velikost_souboru,
                :pocet_radku, :pocet_uspesnych, :pocet_aktualizovanych,
                :pocet_preskoceno, :pocet_chyb,
                :chybove_zaznamy, :status, :overwrite_existing
            )
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindValue(':username', $username, PDO::PARAM_STR);
        $stmt->bindValue(':nazev_souboru', $nazev_souboru, PDO::PARAM_STR);
        $stmt->bindValue(':typ_souboru', $typ_souboru, PDO::PARAM_STR);
        $stmt->bindValue(':velikost_souboru', $velikost_souboru, PDO::PARAM_INT);
        $stmt->bindValue(':pocet_radku', $celkem, PDO::PARAM_INT);
        $stmt->bindValue(':pocet_uspesnych', $uspesne, PDO::PARAM_INT);
        $stmt->bindValue(':pocet_aktualizovanych', $aktualizovano, PDO::PARAM_INT);
        $stmt->bindValue(':pocet_preskoceno', $preskoceno, PDO::PARAM_INT);
        $stmt->bindValue(':pocet_chyb', count($chyby), PDO::PARAM_INT);
        $stmt->bindValue(':chybove_zaznamy', $chyby_json, PDO::PARAM_STR);
        $stmt->bindValue(':status', $status, PDO::PARAM_STR);
        $stmt->bindValue(':overwrite_existing', $overwrite ? 1 : 0, PDO::PARAM_INT);
        $stmt->execute();
        
        $log_id = $db->lastInsertId();
        
        $db->commit();
        
        $elapsed_ms = round((microtime(true) - $start_time) * 1000);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'celkem_radku' => $celkem,
                'uspesne_importovano' => $uspesne,
                'aktualizovano' => $aktualizovano,
                'preskoceno_duplicit' => $preskoceno,
                'chyb' => count($chyby),
                'chybove_zaznamy' => $chyby,
                'import_log_id' => (int)$log_id,
                'cas_importu_ms' => $elapsed_ms
            ),
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'endpoint' => 'bulk-import',
                'timestamp' => date('c')
            )
        ));
        
    } catch (Exception $e) {
        if (isset($db)) {
            $db->rollback();
        }
        error_log('SMLOUVY BULK IMPORT ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Import selhal: ' . $e->getMessage()));
    }
}

/**
 * 7. PŘEPOČET ČERPÁNÍ
 * POST /ciselniky/smlouvy/prepocet-cerpani
 */
function handle_ciselniky_smlouvy_prepocet_cerpani($input, $config, $queries) {
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatny nebo chybejici token'));
        return;
    }
    
    $start_time = microtime(true);
    $cislo_smlouvy = isset($input['cislo_smlouvy']) ? $input['cislo_smlouvy'] : null;
    $usek_id = isset($input['usek_id']) ? (int)$input['usek_id'] : null;
    
    try {
        $db = get_db($config);
        
        // Call stored procedure (MySQL 5.5)
        $sql = "CALL sp_prepocet_cerpani_smluv(?, ?)";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(1, $cislo_smlouvy, PDO::PARAM_STR);
        $stmt->bindValue(2, $usek_id, PDO::PARAM_INT);
        $stmt->execute();
        
        // Get count of affected contracts
        $where = array();
        $params = array();
        
        if ($cislo_smlouvy) {
            $where[] = "cislo_smlouvy = :cislo_smlouvy";
            $params['cislo_smlouvy'] = $cislo_smlouvy;
        }
        if ($usek_id) {
            $where[] = "usek_id = :usek_id";
            $params['usek_id'] = $usek_id;
        }
        if (empty($where)) {
            $where[] = "aktivni = 1";
        }
        
        $sql = "SELECT COUNT(*) as pocet FROM " . TBL_SMLOUVY . " WHERE " . implode(' AND ', $where);
        $stmt = $db->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $elapsed_ms = round((microtime(true) - $start_time) * 1000);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'prepocitano_smluv' => (int)$result['pocet'],
                'cas_vypoctu_ms' => $elapsed_ms,
                'dt_prepoctu' => date('c')
            ),
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'endpoint' => 'prepocet-cerpani',
                'timestamp' => date('c')
            )
        ));
        
    } catch (Exception $e) {
        error_log('SMLOUVY PREPOCET ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba pri prepoctu cerpani: ' . $e->getMessage()));
    }
}

/**
 * Helper funkce pro automatický přepočet (volá se z apiv2Orders.php)
 * Použití: po uložení objednávky se smlouvou automaticky přepočítat čerpání
 * 
 * @param string $cislo_smlouvy Číslo smlouvy k přepočtu
 */
function prepocetCerpaniSmlouvyAuto($cislo_smlouvy) {
    try {
        // Get config
        $_config = require __DIR__ . '/dbconfig.php';
        $config = $_config['mysql'];
        $db = get_db($config);
        
        // Call stored procedure
        $sql = "CALL sp_prepocet_cerpani_smluv(?, NULL)";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(1, $cislo_smlouvy, PDO::PARAM_STR);
        $stmt->execute();
        
        error_log("AUTO PREPOCET: Smlouva $cislo_smlouvy prepoctena");
        
    } catch (Exception $e) {
        error_log("AUTO PREPOCET ERROR: " . $e->getMessage());
        // Nechceme aby chyba přepočtu zablokovala uložení objednávky
    }
}

/**
 * 8. IMPORT CSV/EXCEL SMLUV
 * POST /ciselniky/smlouvy/import-csv
 * 
 * Parsuje CSV/Excel soubor a vloží data do pole $data pro bulk-import
 * 
 * POVINNÉ SLOUPCE:
 * - ČÍSLO SML (cislo_smlouvy)
 * - ÚSEK (usek_zkr)
 * - DRUH SMLOUVY (druh_smlouvy) - NOVÝ! 
 * - PARTNER (nazev_firmy)
 * - NÁZEV SML (nazev_smlouvy)
 * - HODNOTA S DPH (hodnota_s_dph)
 * 
 * VOLITELNÉ SLOUPCE:
 * - IČO (ico)
 * - DIČ (dic)
 * - POPIS SML (popis_smlouvy)
 * - DATUM OD (platnost_od) - automaticky nastavi NA 31.12.2099 pokud chybí!
 * - DATUM DO (platnost_do) - automaticky nastavi NA 31.12.2099 pokud chybí!
 * 
 * FEATURES:
 * ✅ Automatická normalizace "DATUM DO" na 31.12.2099 pokud chybí
 * ✅ Povolí import i bez "DATA OD" i bez "DATA DO"
 * ✅ Validace IČO (8 číslic)
 * ✅ Párování ÚSEK => usek_id
 * ✅ Vytrimování bílých znaků
 * 
 * VRACÍ:
 * - Parsovaná data připravená pro bulk-import
 * - Počet vyanalyzovaných řádků
 * - Chyby parsování (pokud existují)
 * 
 * @author Backend Team
 * @date 30. prosince 2025 - CSV/Excel import s normalizací "platnost_do"
 */
function handle_ciselniky_smlouvy_import_csv($input, $config, $queries) {
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatny nebo chybejici token'));
        return;
    }
    
    // Expect CSV data in $input['csv_data'] (string) OR base64-encoded Excel
    if (!isset($input['csv_data']) && !isset($input['excel_data'])) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Chybi CSV data nebo Excel file'));
        return;
    }
    
    $csv_data = isset($input['csv_data']) ? $input['csv_data'] : '';
    $excel_base64 = isset($input['excel_data']) ? $input['excel_data'] : '';
    
    // Pokud je Excel (base64), vyžadujeme knihovnu PhpSpreadsheet
    // Pro teď: jen CSV support
    if ($excel_base64 && !$csv_data) {
        // TODO: Implementovat PhpSpreadsheet support
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Excel format momentálně není podporován, používejte CSV'));
        return;
    }
    
    $start_time = microtime(true);
    $parsed_rows = array();
    $parse_errors = array();
    $header_map = array();
    
    try {
        // Parse CSV
        $lines = preg_split("/[\r\n]+/", $csv_data);
        $header_row = null;
        $row_num = 0;
        
        // Očekávané sloupce a jejich mapování
        $column_mapping = array(
            // Povinné
            'číslo sml' => 'cislo_smlouvy',
            'číslo smlouvy' => 'cislo_smlouvy',
            'úsek' => 'usek_zkr',
            'druh smlouvy' => 'druh_smlouvy',
            'druh' => 'druh_smlouvy',
            'partner' => 'nazev_firmy',
            'název sml' => 'nazev_smlouvy',
            'název smlouvy' => 'nazev_smlouvy',
            'předmět sml' => 'nazev_smlouvy',
            'hodnota s dph' => 'hodnota_s_dph',
            'hodnota' => 'hodnota_s_dph',
            
            // Volitelné
            'iço' => 'ico',
            'ico' => 'ico',
            'dič' => 'dic',
            'dic' => 'dic',
            'popis sml' => 'popis_smlouvy',
            'popis' => 'popis_smlouvy',
            'datum od' => 'platnost_od',
            'od' => 'platnost_od',
            'datum do' => 'platnost_do',
            'do' => 'platnost_do',
            'poznámka' => 'poznamka',
            'poznámky' => 'poznamka',
            'aktivní' => 'aktivni',
        );
        
        foreach ($lines as $line) {
            $row_num++;
            
            if (empty(trim($line))) {
                continue; // Skip empty lines
            }
            
            // CSV parsing (jednoduché - pokud chcete komplexní CSV s uvozovkami, použijte str_getcsv)
            $cells = str_getcsv($line, ',', '"');
            
            if ($header_row === null) {
                // První řádek = hlavička
                $header_row = $row_num;
                
                // VALIDACE 1: Kontrola, že hlavička není prázdná
                if (empty($cells) || count($cells) < 6) {
                    http_response_code(400);
                    echo json_encode(array(
                        'status' => 'error',
                        'message' => 'CSV hlavička je neplatná nebo obsahuje méně než 6 sloupců',
                        'detected_columns' => $cells,
                        'min_required' => 6
                    ));
                    return;
                }
                
                // Mapování sloupců
                $unrecognized_columns = array();
                foreach ($cells as $idx => $cell) {
                    $cell_normalized = strtolower(trim($cell));
                    
                    // Pokus najít v mapování
                    $mapped_name = null;
                    foreach ($column_mapping as $pattern => $db_field) {
                        if (strpos($cell_normalized, $pattern) !== false || $pattern === $cell_normalized) {
                            $mapped_name = $db_field;
                            break;
                        }
                    }
                    
                    if ($mapped_name) {
                        $header_map[$idx] = $mapped_name;
                    } else {
                        // Sloupec nebyl rozpoznán
                        if (!empty(trim($cell))) {
                            $unrecognized_columns[] = $cell;
                        }
                    }
                }
                
                // VALIDACE 2: Kontrola povinných sloupců
                $required_fields = array(
                    'cislo_smlouvy' => 'ČÍSLO SML / ČÍSLO SMLOUVY',
                    'usek_zkr' => 'ÚSEK',
                    'druh_smlouvy' => 'DRUH SMLOUVY / DRUH',
                    'nazev_firmy' => 'PARTNER',
                    'nazev_smlouvy' => 'NÁZEV SML / NÁZEV SMLOUVY / PŘEDMĚT SML',
                    'hodnota_s_dph' => 'HODNOTA S DPH / HODNOTA'
                );
                
                $missing_fields = array();
                
                foreach ($required_fields as $field => $readable_name) {
                    if (!in_array($field, $header_map)) {
                        $missing_fields[] = $readable_name;
                    }
                }
                
                // VALIDACE 3: Pokud chybí povinné sloupce, vrať chybu s detaily
                if (!empty($missing_fields)) {
                    http_response_code(400);
                    echo json_encode(array(
                        'status' => 'error',
                        'message' => 'CSV neobsahuje všechny povinné sloupce',
                        'missing_columns' => $missing_fields,
                        'recognized_columns' => array_values(array_unique($header_map)),
                        'unrecognized_columns' => $unrecognized_columns,
                        'help' => 'Ujistěte se, že CSV má hlavičku s názvy: ČÍSLO SML, ÚSEK, DRUH SMLOUVY, PARTNER, NÁZEV SML, HODNOTA S DPH',
                        'detected_header_raw' => $cells
                    ));
                    return;
                }
                
                // VALIDACE 4: Log varování o nerozpoznaných sloupcích (pouze info)
                if (!empty($unrecognized_columns)) {
                    error_log('CSV import: Nerozpoznané sloupce (budou ignorovány): ' . implode(', ', $unrecognized_columns));
                }
                
                // VALIDACE 5: Ověř, že jsme našli dostatečný počet sloupců
                if (count($header_map) < 6) {
                    http_response_code(400);
                    echo json_encode(array(
                        'status' => 'error',
                        'message' => 'CSV obsahuje málo rozpoznaných sloupců (minimum 6 povinných)',
                        'recognized_count' => count($header_map),
                        'recognized_columns' => array_values(array_unique($header_map)),
                        'minimum_required' => 6
                    ));
                    return;
                }
                
                continue; // Skip header row
            }
            
            // Parsuj data řádku
            $row_data = array();
            foreach ($header_map as $col_idx => $db_field) {
                $value = isset($cells[$col_idx]) ? trim($cells[$col_idx]) : '';
                $row_data[$db_field] = $value;
            }
            
            // Normalizace PLATNOST_DO
            // Pokud chybí, nastav na 31.12.2099
            if (!isset($row_data['platnost_do']) || empty($row_data['platnost_do'])) {
                $row_data['platnost_do'] = '2099-12-31';
                $row_data['_note_platnost_do'] = 'AUTO (chybělo)'; // Info log
            } else {
                $row_data['platnost_do'] = normalizePlatnostDo($row_data['platnost_do']);
            }
            
            // Normalizace PLATNOST_OD (pokud existuje)
            if (isset($row_data['platnost_od']) && !empty($row_data['platnost_od'])) {
                $parsed_date = date('Y-m-d', strtotime($row_data['platnost_od']));
                if ($parsed_date) {
                    $row_data['platnost_od'] = $parsed_date;
                }
            }
            
            // NORMALIZACE FINANČNÍCH HODNOT
            // Dopočet DPH, parsování, 0 pro chybějící/nevalidní
            $row_data = normalizeFinancialValues($row_data);
            
            // Trimování a čistění
            foreach ($row_data as &$val) {
                $val = trim($val);
            }
            
            $parsed_rows[] = $row_data;
        }
        
        if (empty($parsed_rows)) {
            http_response_code(400);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Soubor neobsahuje žádné datové řádky',
                'parsed_rows_count' => 0
            ));
            return;
        }
        
        $elapsed_ms = round((microtime(true) - $start_time) * 1000);
        
        // Vrátíme parsovaná data - připravená na bulk-import
        // Frontend pošle tato data do bulk-import endpointu
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'parsed_data' => $parsed_rows,
                'parsed_rows_count' => count($parsed_rows),
                'header_map' => $header_map,
                'parse_errors' => $parse_errors,
                'parse_time_ms' => $elapsed_ms,
                '_info' => 'Data jsou připravena k importu. Pošli je na endpoint /ciselniky/smlouvy/bulk-import'
            ),
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'endpoint' => 'import-csv',
                'timestamp' => date('c')
            )
        ));
        
    } catch (Exception $e) {
        error_log('SMLOUVY CSV IMPORT ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'CSV import error: ' . $e->getMessage()));
    }
}

/**
 * 8. INICIALIZACE SYSTÉMU ČERPÁNÍ
 * POST /ciselniky/smlouvy/inicializace
 * 
 * Provede kompletní inicializaci systému čerpání smluv:
 * 1. Přepočítá všechny aktivní smlouvy (CALL sp_prepocet_cerpani_smluv)
 * 2. Identifikuje smlouvy s problematickými hodnotami (negativní zbytky, nelogické procenta)
 * 3. Vrátí statistiky a upozornění
 * 
 * Použití: Po migraci databáze, po velkých změnách v datech
 */
function handle_ciselniky_smlouvy_inicializace($input, $config, $queries) {
    $username = isset($input['username']) ? $input['username'] : '';
    $token = isset($input['token']) ? $input['token'] : '';
    
    $auth_result = verify_token_v2($username, $token);
    if (!$auth_result) {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Neplatny nebo chybejici token'));
        return;
    }
    
    $start_time = microtime(true);
    
    try {
        $db = get_db($config);
        
        // 1. Přepočítat všechny smlouvy
        $sql = "CALL sp_prepocet_cerpani_smluv(NULL, NULL)";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        
        // 2. Získat statistiky
        $stats = array();
        
        // Celkový počet aktivních smluv
        $sql = "SELECT COUNT(*) as pocet FROM " . TBL_SMLOUVY . " WHERE aktivni = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['celkem_smluv'] = (int)$result['pocet'];
        
        // Smlouvy s omezením (hodnota_s_dph > 0)
        $sql = "SELECT COUNT(*) as pocet FROM " . TBL_SMLOUVY . " WHERE aktivni = 1 AND hodnota_s_dph > 0";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['smlouvy_s_omezenim'] = (int)$result['pocet'];
        
        // Neomezené smlouvy (hodnota_s_dph = 0)
        $sql = "SELECT COUNT(*) as pocet FROM " . TBL_SMLOUVY . " WHERE aktivni = 1 AND hodnota_s_dph = 0";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['smlouvy_neomezene'] = (int)$result['pocet'];
        
        // Smlouvy s překročeným limitem (procento_cerpani > 100)
        $sql = "SELECT COUNT(*) as pocet FROM " . TBL_SMLOUVY . " WHERE aktivni = 1 AND procento_cerpani > 100";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['smlouvy_prekroceny_limit'] = (int)$result['pocet'];
        
        // Smlouvy s čerpáním > 90% (varování)
        $sql = "SELECT COUNT(*) as pocet FROM " . TBL_SMLOUVY . " WHERE aktivni = 1 AND procento_cerpani > 90 AND procento_cerpani <= 100";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['smlouvy_varovani'] = (int)$result['pocet'];
        
        // Celkové čerpání skutečně (všechny smlouvy)
        $sql = "SELECT SUM(cerpano_skutecne) as celkem FROM " . TBL_SMLOUVY . " WHERE aktivni = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['celkove_cerpani_skutecne'] = (float)$result['celkem'];
        
        // Celková hodnota smluv (jen s omezením)
        $sql = "SELECT SUM(hodnota_s_dph) as celkem FROM " . TBL_SMLOUVY . " WHERE aktivni = 1 AND hodnota_s_dph > 0";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['celkova_hodnota_smluv'] = (float)$result['celkem'];
        
        // 3. Seznam smluv s problémy (překročené limity)
        $sql = "SELECT cislo_smlouvy, hodnota_s_dph, cerpano_skutecne, procento_cerpani 
                FROM " . TBL_SMLOUVY . " 
                WHERE aktivni = 1 AND procento_cerpani > 100 
                ORDER BY procento_cerpani DESC 
                LIMIT 10";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $problematic = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $elapsed_ms = round((microtime(true) - $start_time) * 1000);
        
        echo json_encode(array(
            'status' => 'ok',
            'data' => array(
                'statistiky' => $stats,
                'problematicke_smlouvy' => $problematic,
                'cas_vypoctu_ms' => $elapsed_ms,
                'dt_inicializace' => date('c'),
                '_info' => 'Systém čerpání byl úspěšně inicializován. Všechny smlouvy přepočteny (3 typy: požadováno, plánováno, skutečně).'
            ),
            'meta' => array(
                'version' => 'v2',
                'standardized' => true,
                'endpoint' => 'inicializace',
                'timestamp' => date('c')
            )
        ));
        
    } catch (Exception $e) {
        error_log('SMLOUVY INICIALIZACE ERROR: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Chyba při inicializaci: ' . $e->getMessage()));
    }
}

?>

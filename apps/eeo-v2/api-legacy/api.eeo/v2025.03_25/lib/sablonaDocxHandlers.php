<?php

/**
 * DOCX Šablony - CRUD Handlers
 * Správa šablon DOCX dokumentů
 * 
 * Compatible with: PHP 5.6, MySQL 5.5.43
 * 
 * @version 1.0
 * @date 2025-10-19
 */

// ============================================================================
// POMOCNÉ FUNKCE
// ============================================================================

/**
 * Generuje GUID pro unikátní názvy souborů
 */
function generateGuidForDocx() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

/**
 * Kontrola zda má uživatel přístup k šabloně podle úseku
 */
function maUzivatelPristupKSabloneDocx($usek_omezeni_json, $uzivatel_usek_zkr) {
    // Pokud není omezení, šablona je pro všechny
    if (empty($usek_omezeni_json)) {
        return true;
    }
    
    // Dekódovat JSON
    $povolene_useky = json_decode($usek_omezeni_json, true);
    
    // Chyba v JSON nebo není pole
    if (!is_array($povolene_useky)) {
        return true; // Fallback na povoleno
    }
    
    // Prázdné pole = skryté pro všechny
    if (count($povolene_useky) === 0) {
        return false;
    }
    
    // Kontrola, zda je úsek uživatele v seznamu
    return in_array($uzivatel_usek_zkr, $povolene_useky);
}

/**
 * Pomocná funkce pro bind_param s referencemi (PHP 5.6 kompatibilita)
 */
function refValues($arr) {
    if (strnatcmp(phpversion(), '5.3') >= 0) {
        $refs = array();
        foreach ($arr as $key => $value) {
            $refs[$key] = &$arr[$key];
        }
        return $refs;
    }
    return $arr;
}

/**
 * Validace DOCX souboru
 */
function validateDocxFile($file) {
    $errors = array();
    
    // Kontrola uploadu
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors[] = 'Chyba při nahrávání souboru (kód: ' . $file['error'] . ')';
        return $errors;
    }
    
    // Kontrola MIME typu
    $allowed_mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if ($mime !== $allowed_mime) {
        $errors[] = 'Neplatný typ souboru. Pouze DOCX jsou povoleny. (Detekováno: ' . $mime . ')';
    }
    
    // Kontrola přípony
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($ext !== 'docx') {
        $errors[] = 'Soubor musí mít příponu .docx';
    }
    
    // Kontrola velikosti (max 10MB)
    $max_size = 10 * 1024 * 1024;
    if ($file['size'] > $max_size) {
        $errors[] = 'Soubor je příliš velký (max 10MB)';
    }
    
    if ($file['size'] === 0) {
        $errors[] = 'Soubor je prázdný';
    }
    
    return $errors;
}

// ============================================================================
// CREATE - Vytvoření nové šablony
// ============================================================================

/**
 * Vytvoření nové šablony s uploadem souboru  
 * POST /sablona_docx/create
 */
function handle_sablona_docx_create($input, $config, $queries) {
    try {
        // Ověření tokenu a username z POST dat (pro multipart/form-data)
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        // Získat user_id z tokenu pro audit
        $user_id = (int)$user['id'];
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při zpracování požadavku: ' . $e->getMessage());
    }

    try {
        // Načtení upload konfigurace
        $_config = require __DIR__ . '/dbconfig.php';
        $upload_config = $_config['upload'];
        
        // Ověření, že upload config existuje
        if (!isset($upload_config['docx_templates_path'])) {
            api_error(500, 'Chybí konfigurace pro DOCX šablony');
        }
        
        // Kontrola uploadu souboru
        if (!isset($_FILES['file'])) {
            api_error(400, 'Soubor nebyl nahrán');
        }
        
        $file = $_FILES['file'];
        
        // Kontrola upload chyb
        if ($file['error'] !== UPLOAD_ERR_OK) {
            api_error(400, 'Chyba při uploadu souboru: ' . $file['error']);
        }
    
        // Validace DOCX souboru
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($ext !== 'docx') {
            api_error(400, 'Pouze DOCX soubory jsou povoleny');
        }
        
        if ($file['size'] > 10 * 1024 * 1024) {
            api_error(400, 'Soubor je příliš velký (max 10MB)');
        }
        
        // Generovat opravdu unikátní název s mikrosekundami a random číslem
        $guid = uniqid('', true) . '_' . mt_rand(1000, 9999);
        $nazev_ulozeny = 'tpl_' . $guid . '.docx';
        
        // Cesta pro uložení
        $upload_dir = $upload_config['docx_templates_path'];
        
        if (!is_dir($upload_dir)) {
            if (!mkdir($upload_dir, 0755, true)) {
                api_error(500, 'Nelze vytvořit adresář pro šablony');
            }
        }
        
        $cesta_plna = $upload_dir . $nazev_ulozeny;
        
        // Kontrola kolize názvů - pokud soubor existuje, vygeneruj nový název
        $pokus = 0;
        while (file_exists($cesta_plna) && $pokus < 10) {
            $pokus++;
            $guid = uniqid('', true) . '_' . mt_rand(1000, 9999) . '_' . $pokus;
            $nazev_ulozeny = 'tpl_' . $guid . '.docx';
            $cesta_plna = $upload_dir . $nazev_ulozeny;
        }
        
        if (file_exists($cesta_plna)) {
            api_error(500, 'Nelze vygenerovat unikátní název souboru');
        }
        
        // Přesunout soubor
        if (!move_uploaded_file($file['tmp_name'], $cesta_plna)) {
            api_error(500, 'Chyba při ukládání souboru');
        }
        
        // Příprava dat pro databázi z $_POST
        $nazev = isset($_POST['nazev']) ? trim($_POST['nazev']) : pathinfo($file['name'], PATHINFO_FILENAME);
        $popis = isset($_POST['popis']) ? trim($_POST['popis']) : null;
        $typ_dokumentu = isset($_POST['typ_dokumentu']) ? trim($_POST['typ_dokumentu']) : null;
        $aktivni = isset($_POST['aktivni']) ? intval($_POST['aktivni']) : 1;
        $verze = isset($_POST['verze']) ? trim($_POST['verze']) : '1.0';
        $castka = isset($_POST['castka']) ? floatval($_POST['castka']) : 0.0;
        
        // Platnost - pokud není uvedeno, použij defaulty
        $platnost_od = isset($_POST['platnost_od']) && !empty($_POST['platnost_od']) ? $_POST['platnost_od'] : date('Y-m-d');
        $platnost_do = isset($_POST['platnost_do']) && !empty($_POST['platnost_do']) ? $_POST['platnost_do'] : '2100-12-31';
        
        // Audit trail - použij uživatele z tokenu (ne FE data)
        $vytvoril_uzivatel_id = $user['id']; // Z ověření tokenu
        $upravil_uzivatel_id = $user['id'];   // Při CREATE je stejný
        
        // Alternativně: pokud chceš respektovat FE data (ale to není bezpečné)
        // $vytvoril_username = isset($_POST['vytvoril_uzivatel']) ? trim($_POST['vytvoril_uzivatel']) : $user['username'];
        // $upravil_username = isset($_POST['upravil_uzivatel']) ? trim($_POST['upravil_uzivatel']) : $user['username'];
        
        // Mapování JSON (volitelné) - podpora pro oba názvy parametrů
        $mapovani_json = null;
        $mapping_data = null;
        
        // Kontrola mapovani_json (původní název)
        if (isset($_POST['mapovani_json']) && !empty($_POST['mapovani_json'])) {
            $mapping_data = $_POST['mapovani_json'];
        }
        // Kontrola docx_mapping (název z frontendu)
        else if (isset($_POST['docx_mapping']) && !empty($_POST['docx_mapping'])) {
            $mapping_data = $_POST['docx_mapping'];
        }
        
        if ($mapping_data !== null) {
            if (is_array($mapping_data)) {
                $mapovani_json = json_encode($mapping_data, JSON_UNESCAPED_UNICODE);
            } else {
                $mapovani_data = json_decode($mapping_data, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    unlink($cesta_plna); // Smazat nahraný soubor při chybě
                    api_error(400, 'Neplatný JSON formát v mapování');
                }
                $mapovani_json = $mapping_data;
            }
        }
        
        // Generovat MD5 hash po úspěšném uploadu
        $md5_hash = md5_file($cesta_plna);
        
        // Uložit do databáze
        $sql = "
            INSERT INTO " . TBL_SABLONY_DOCX . " 
            (nazev, popis, typ_dokumentu, nazev_souboru, nazev_souboru_ulozeny, cesta_souboru, 
             velikost_souboru, md5_hash, mapovani_json, platnost_od, platnost_do, aktivni, 
             vytvoril_uzivatel_id, dt_vytvoreni, aktualizoval_uzivatel_id, dt_aktualizace, verze, castka)
            VALUES (:nazev, :popis, :typ_dokumentu, :nazev_souboru, :nazev_ulozeny, :cesta, 
                    :velikost, :md5_hash, :mapovani_json, :platnost_od, :platnost_do, :aktivni, 
                    :vytvoril_id, NOW(), :aktualizoval_id, NOW(), :verze, :castka)
        ";
        
        $params = array(
            ':nazev' => $nazev,
            ':popis' => $popis,
            ':typ_dokumentu' => $typ_dokumentu,
            ':nazev_souboru' => $file['name'],
            ':nazev_ulozeny' => $nazev_ulozeny,
            ':cesta' => $nazev_ulozeny, // Jen název souboru, prefix cesty se přidá při čtení
            ':velikost' => $file['size'],
            ':md5_hash' => $md5_hash,
            ':mapovani_json' => $mapovani_json,
            ':platnost_od' => $platnost_od,
            ':platnost_do' => $platnost_do,
            ':aktivni' => $aktivni,
            ':vytvoril_id' => $vytvoril_uzivatel_id,    // Kdo vytvořil (INSERT)
            ':aktualizoval_id' => $upravil_uzivatel_id, // Kdo aktualizoval (INSERT = stejný)
            ':verze' => $verze,
            ':castka' => $castka
        );
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $new_id = $db->lastInsertId();
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Šablona byla úspěšně nahrána',
            'data' => array(
                'id' => (int)$new_id,
                'nazev_souboru_ulozeny' => $nazev_ulozeny,
                'md5_hash' => $md5_hash
            )
        ));
        
    } catch (Exception $e) {
        // Smazat nahraný soubor při chybě databáze
        if (isset($cesta_plna) && file_exists($cesta_plna)) {
            unlink($cesta_plna);
        }
        api_error(500, 'Chyba databáze: ' . $e->getMessage());
    }
}

// ============================================================================
// READ - Čtení šablon
// ============================================================================

/**
 * Seznam všech šablon
 * POST /sablona_docx/list
 */
function handle_sablona_docx_list($input, $config, $queries) {
    try {
        $db = get_db($config);
        
        $where = array("1=1");
        $params = array();
        
        // Filtr podle aktivnosti
        if (isset($input['aktivni'])) {
            $where[] = "s.aktivni = :aktivni";
            $params[':aktivni'] = intval($input['aktivni']);
        }
        
        // Filtr podle typu dokumentu
        if (isset($input['typ_dokumentu']) && !empty($input['typ_dokumentu'])) {
            $where[] = "s.typ_dokumentu = :typ_dokumentu";
            $params[':typ_dokumentu'] = $input['typ_dokumentu'];
        }
        
        // Filtr podle aktuální platnosti
        if (isset($input['pouze_platne']) && $input['pouze_platne'] == '1') {
            $where[] = "(s.platnost_od IS NULL OR s.platnost_od <= CURDATE())";
            $where[] = "(s.platnost_do IS NULL OR s.platnost_do >= CURDATE())";
        }
        
        // Fulltextové vyhledávání
        if (isset($input['search']) && !empty($input['search'])) {
            $where[] = "(s.nazev LIKE :search1 OR s.popis LIKE :search2)";
            $search_term = '%' . $input['search'] . '%';
            $params[':search1'] = $search_term;
            $params[':search2'] = $search_term;
        }
        
        $where_sql = implode(" AND ", $where);
        
        $sql = "
            SELECT 
                s.id, s.nazev, s.popis, s.typ_dokumentu, s.nazev_souboru, 
                s.nazev_souboru_ulozeny, s.cesta_souboru, s.velikost_souboru, s.md5_hash,
                s.mapovani_json, s.platnost_od, s.platnost_do, s.aktivni, s.usek_omezeni,
                s.verze, s.poznamka, s.dt_vytvoreni, s.dt_aktualizace, s.castka,
                u1.id AS vytvoril_id, 
                CONCAT(IFNULL(u1.titul_pred, ''), ' ', u1.jmeno, ' ', u1.prijmeni, ' ', IFNULL(u1.titul_za, '')) AS vytvoril_jmeno,
                u2.id AS aktualizoval_id,
                CONCAT(IFNULL(u2.titul_pred, ''), ' ', u2.jmeno, ' ', u2.prijmeni, ' ', IFNULL(u2.titul_za, '')) AS aktualizoval_jmeno
            FROM " . TBL_SABLONY_DOCX . " s
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON s.vytvoril_uzivatel_id = u1.id
            LEFT JOIN " . TBL_UZIVATELE . " u2 ON s.aktualizoval_uzivatel_id = u2.id
            WHERE $where_sql
            ORDER BY s.nazev ASC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        
        // Načíst konfiguraci pro cestu k souborům
        $_config = require __DIR__ . '/dbconfig.php';
        $upload_config = $_config['upload'];
        $upload_dir = $upload_config['docx_templates_path'];
        
        $sablony = array();
        foreach ($rows as $row) {
            // TODO: Kontrola přístupu podle úseku (až bude implementována autentizace)
            // if (!maUzivatelPristupKSabloneDocx($row['usek_omezeni'], $user['usek_zkr'])) continue;
            
            // Kontrola existence souboru na disku - pokud soubor neexistuje, automaticky deaktivuj šablonu
            $aktivni = (bool)$row['aktivni'];
            $file_exists_on_disk = true;
            
            if (!empty($row['cesta_souboru'])) {
                // Sestavit plnou cestu z konstanty + název souboru z DB
                $file_path = $upload_dir . $row['cesta_souboru'];
                
                if (!file_exists($file_path)) {
                    // Soubor neexistuje na disku - automaticky deaktivuj šablonu v DB
                    $file_exists_on_disk = false;
                    try {
                        $stmtDeactivate = $db->prepare("UPDATE " . TBL_SABLONY_DOCX . " SET aktivni = 0 WHERE id = :id");
                        $stmtDeactivate->execute(array(':id' => $row['id']));
                        $aktivni = false; // Změň i v response
                    } catch (Exception $e) {
                        // Pokud se nepodaří deaktivovat, pokračuj dál (non-fatal)
                    }
                }
            }
            
            $sablony[] = array(
                'id' => (int)$row['id'],
                'nazev' => $row['nazev'],
                'popis' => $row['popis'],
                'typ_dokumentu' => $row['typ_dokumentu'],
                'nazev_souboru' => $row['nazev_souboru'],
                'nazev_souboru_ulozeny' => $row['nazev_souboru_ulozeny'],
                'cesta_souboru' => $row['cesta_souboru'],
                'velikost_souboru' => (int)$row['velikost_souboru'],
                'md5_hash' => $row['md5_hash'],
                'platnost_od' => $row['platnost_od'],
                'platnost_do' => $row['platnost_do'],
                'aktivni' => $aktivni,
                'file_exists' => $file_exists_on_disk,
                'usek_omezeni' => $row['usek_omezeni'] ? json_decode($row['usek_omezeni'], true) : null,
                'verze' => $row['verze'],
                'poznamka' => $row['poznamka'],
                'castka' => (float)$row['castka'],
                'dt_vytvoreni' => $row['dt_vytvoreni'],
                'dt_aktualizace' => $row['dt_aktualizace'],
                'mapovani_json' => $row['mapovani_json'] ? json_decode($row['mapovani_json'], true) : null,
                'vytvoril' => $row['vytvoril_id'] ? array(
                    'id' => (int)$row['vytvoril_id'],
                    'jmeno' => trim($row['vytvoril_jmeno'])
                ) : null,
                'aktualizoval' => $row['aktualizoval_id'] ? array(
                    'id' => (int)$row['aktualizoval_id'],
                    'jmeno' => trim($row['aktualizoval_jmeno'])
                ) : null,
                'ma_mapovani' => !empty($row['mapovani_json'])
            );
        }
        
        echo json_encode(array('status' => 'ok', 'data' => $sablony));
        
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage());
    }
}

/**
 * Detail jedné šablony
 * POST /sablona_docx/detail
 */
function handle_sablona_docx_by_id($input, $config, $queries) {
    try {
        $db = get_db($config);
        
        if (!isset($input['id'])) {
            api_error(400, 'Chybí parametr ID');
            return;
        }
        
        $id = intval($input['id']);
        
        $sql = "
            SELECT 
                s.*,
                u1.id AS vytvoril_id,
                CONCAT(IFNULL(u1.titul_pred, ''), ' ', u1.jmeno, ' ', u1.prijmeni, ' ', IFNULL(u1.titul_za, '')) AS vytvoril_jmeno,
                u1.email AS vytvoril_email,
                u2.id AS aktualizoval_id,
                CONCAT(IFNULL(u2.titul_pred, ''), ' ', u2.jmeno, ' ', u2.prijmeni, ' ', IFNULL(u2.titul_za, '')) AS aktualizoval_jmeno,
                u2.email AS aktualizoval_email
            FROM " . TBL_SABLONY_DOCX . " s
            LEFT JOIN " . TBL_UZIVATELE . " u1 ON s.vytvoril_uzivatel_id = u1.id
            LEFT JOIN " . TBL_UZIVATELE . " u2 ON s.aktualizoval_uzivatel_id = u2.id
            WHERE s.id = :id
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute(array(':id' => $id));
        $row = $stmt->fetch();
        
        if (!$row) {
            api_error(404, 'Šablona nenalezena');
            return;
        }
        
        // TODO: Kontrola přístupu podle úseku (až bude implementována autentizace)
        
        $data = array(
            'id' => (int)$row['id'],
            'nazev' => $row['nazev'],
            'popis' => $row['popis'],
            'typ_dokumentu' => $row['typ_dokumentu'],
            'nazev_souboru' => $row['nazev_souboru'],
            'nazev_souboru_ulozeny' => $row['nazev_souboru_ulozeny'],
            'cesta_souboru' => $row['cesta_souboru'],
            'velikost_souboru' => (int)$row['velikost_souboru'],
            'md5_hash' => $row['md5_hash'],
            'mapovani_json' => $row['mapovani_json'] ? json_decode($row['mapovani_json'], true) : null,
            'platnost_od' => $row['platnost_od'],
            'platnost_do' => $row['platnost_do'],
            'aktivni' => (bool)$row['aktivni'],
            'usek_omezeni' => $row['usek_omezeni'] ? json_decode($row['usek_omezeni'], true) : null,
            'verze' => $row['verze'],
            'poznamka' => $row['poznamka'],
            'castka' => (float)$row['castka'],
            'dt_vytvoreni' => $row['dt_vytvoreni'],
            'dt_aktualizace' => $row['dt_aktualizace'],
            'vytvoril' => $row['vytvoril_id'] ? array(
                'id' => (int)$row['vytvoril_id'],
                'jmeno' => trim($row['vytvoril_jmeno']),
                'email' => $row['vytvoril_email']
            ) : null,
            'aktualizoval' => $row['aktualizoval_id'] ? array(
                'id' => (int)$row['aktualizoval_id'],
                'jmeno' => trim($row['aktualizoval_jmeno']),
                'email' => $row['aktualizoval_email']
            ) : null
        );
        
        echo json_encode(array('status' => 'ok', 'data' => $data));
        
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage());
    }
}

// ============================================================================
// UPDATE - Aktualizace šablony
// ============================================================================

/**
 * Aktualizace šablony
 * POST /sablona_docx/update
 */
function handle_sablona_docx_update($input, $config, $queries) {
    try {
        $db = get_db($config);
        
        if (!isset($input['id'])) {
            api_error(400, 'Chybí parametr ID');
            return;
        }
        
        if (!isset($input['token'])) {
            api_error(400, 'Chybí autentizační token');
            return;
        }
        
        // Ověřit autentizaci
        $uzivatel = verify_token($input['token'], $db);
        if (!$uzivatel) {
            api_error(401, 'Neplatný token');
            return;
        }
        
        $id = intval($input['id']);
        
        // Ověřit existenci záznamu
        $stmt = $db->prepare("SELECT id FROM " . TBL_SABLONY_DOCX . " WHERE id = :id");
        $stmt->execute(array(':id' => $id));
        
        if (!$stmt->fetch()) {
            api_error(404, 'Šablona nenalezena');
            return;
        }
        
        // Sestavit UPDATE query - základní pole
        $updates = array();
        $params = array(':id' => $id);
        
        $allowed_fields = array('nazev', 'popis', 'typ_dokumentu', 'aktivni', 'verze', 'poznamka', 'castka');
        
        foreach ($allowed_fields as $field) {
            // Použití isset() místo !empty() - umožní uložit i 0 hodnoty
            if (array_key_exists($field, $input)) {
                $updates[] = "$field = :$field";
                $params[":$field"] = $input[$field];
            }
        }
        
        // JSON mapování - podpora pro oba názvy parametrů
        $mapping_data = null;
        if (isset($input['mapovani_json'])) {
            $mapping_data = $input['mapovani_json'];
        } else if (isset($input['docx_mapping'])) {
            $mapping_data = $input['docx_mapping'];
        }
        
        if ($mapping_data !== null) {
            if (is_array($mapping_data)) {
                $updates[] = "mapovani_json = :mapovani_json";
                $params[':mapovani_json'] = json_encode($mapping_data, JSON_UNESCAPED_UNICODE);
            } else {
                $updates[] = "mapovani_json = :mapovani_json";
                $params[':mapovani_json'] = $mapping_data;
            }
        }
        
        if (empty($updates)) {
            api_error(400, 'Žádná data k aktualizaci');
            return;
        }
        
        // Přidat audit pole
        $updates[] = "aktualizoval_uzivatel_id = :uzivatel_id";
        $updates[] = "dt_aktualizace = NOW()";
        $params[':uzivatel_id'] = $uzivatel['id'];
        
        $sql = "UPDATE " . TBL_SABLONY_DOCX . " SET " . implode(", ", $updates) . " WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(array(
            'status' => 'ok', 
            'message' => 'Šablona byla aktualizována',
            'data' => array('id' => $id)
        ));
        
    } catch (Exception $e) {
        api_error(500, 'Chyba databáze: ' . $e->getMessage());
    }
}

/**
 * Částečná aktualizace šablony (partial update)
 * POST /sablona_docx/update_partial
 */
function handle_sablona_docx_update_partial($input, $config, $queries) {
    // Použije stejnou logiku jako plná aktualizace
    return handle_sablona_docx_update($input, $config, $queries);
}

/**
 * Aktualizace šablony s možností výměny souboru
 * POST /sablona_docx/update-with-file (multipart/form-data)
 */
function handle_sablona_docx_update_with_file($input, $config, $queries) {
    try {
        // Ověření tokenu a username z POST dat (pro multipart/form-data)
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        if (!isset($_POST['id'])) {
            api_error(400, 'Chybí ID šablony');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        $id = intval($_POST['id']);
        
        // Načíst současnou šablonu
        $stmt = $db->prepare("
            SELECT nazev, nazev_souboru_ulozeny, velikost_souboru, md5_hash 
            FROM " . TBL_SABLONY_DOCX . " 
            WHERE id = :id
        ");
        $stmt->execute(array(':id' => $id));
        $current = $stmt->fetch();
        
        if (!$current) {
            api_error(404, 'Šablona nenalezena');
        }
        
        // Načtení upload konfigurace
        $_config = require __DIR__ . '/dbconfig.php';
        $upload_config = $_config['upload'];
        
        $file_updated = false;
        $new_filename = $current['nazev_souboru_ulozeny'];
        $new_size = $current['velikost_souboru'];
        $new_md5 = $current['md5_hash'];
        
        // Kontrola, zda byl poslán nový soubor
        if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['file'];
            
            // Validace DOCX souboru
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if ($ext !== 'docx') {
                api_error(400, 'Pouze DOCX soubory jsou povoleny');
            }
            
            if ($file['size'] > 10 * 1024 * 1024) {
                api_error(400, 'Soubor je příliš velký (max 10MB)');
            }
            
            // Smazat starý soubor
            $old_file_path = $upload_config['docx_templates_path'] . $current['nazev_souboru_ulozeny'];
            if (file_exists($old_file_path)) {
                unlink($old_file_path);
            }
            
            // Generovat nový unikátní název
            $guid = uniqid('', true) . '_' . mt_rand(1000, 9999);
            $new_filename = 'tpl_' . $guid . '.docx';
            
            // Cesta pro uložení
            $upload_dir = $upload_config['docx_templates_path'];
            $new_file_path = $upload_dir . $new_filename;
            
            // Kontrola kolize názvů
            $pokus = 0;
            while (file_exists($new_file_path) && $pokus < 10) {
                $pokus++;
                $guid = uniqid('', true) . '_' . mt_rand(1000, 9999) . '_' . $pokus;
                $new_filename = 'tpl_' . $guid . '.docx';
                $new_file_path = $upload_dir . $new_filename;
            }
            
            if (file_exists($new_file_path)) {
                api_error(500, 'Nelze vygenerovat unikátní název souboru');
            }
            
            // Přesunout nový soubor
            if (!move_uploaded_file($file['tmp_name'], $new_file_path)) {
                api_error(500, 'Chyba při ukládání nového souboru');
            }
            
            // Aktualizovat file info
            $new_size = $file['size'];
            $new_md5 = md5_file($new_file_path);
            $file_updated = true;
        }
        
        // Sestavit UPDATE query
        $updates = array();
        $params = array(':id' => $id);
        
        // Základní pole z POST
        $allowed_fields = array('nazev', 'popis', 'typ_dokumentu', 'aktivni', 'verze', 'castka');
        foreach ($allowed_fields as $field) {
            // Použití array_key_exists místo isset - umožní uložit i 0 hodnoty
            if (array_key_exists($field, $_POST)) {
                $updates[] = "$field = :$field";
                $params[":$field"] = $_POST[$field];
            }
        }
        
        // Platnost
        if (isset($_POST['platnost_od']) && !empty($_POST['platnost_od'])) {
            $updates[] = "platnost_od = :platnost_od";
            $params[':platnost_od'] = $_POST['platnost_od'];
        }
        if (isset($_POST['platnost_do']) && !empty($_POST['platnost_do'])) {
            $updates[] = "platnost_do = :platnost_do";
            $params[':platnost_do'] = $_POST['platnost_do'];
        }
        
        // JSON mapování
        if (isset($_POST['mapovani_json']) && !empty($_POST['mapovani_json'])) {
            if (is_array($_POST['mapovani_json'])) {
                $updates[] = "mapovani_json = :mapovani_json";
                $params[':mapovani_json'] = json_encode($_POST['mapovani_json'], JSON_UNESCAPED_UNICODE);
            } else {
                $mapovani_data = json_decode($_POST['mapovani_json'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    api_error(400, 'Neplatný JSON formát v mapování');
                }
                $updates[] = "mapovani_json = :mapovani_json";
                $params[':mapovani_json'] = $_POST['mapovani_json'];
            }
        }
        
        // Pokud byl soubor aktualizován, aktualizovat i file info
        if ($file_updated) {
            if (isset($_FILES['file']['name'])) {
                $updates[] = "nazev_souboru = :nazev_souboru";
                $params[':nazev_souboru'] = $_FILES['file']['name'];
            }
            $updates[] = "nazev_souboru_ulozeny = :nazev_ulozeny";
            $updates[] = "cesta_souboru = :cesta";
            $updates[] = "velikost_souboru = :velikost";
            $updates[] = "md5_hash = :md5_hash";
            
            $params[':nazev_ulozeny'] = $new_filename;
            $params[':cesta'] = $new_filename;
            $params[':velikost'] = $new_size;
            $params[':md5_hash'] = $new_md5;
        }
        
        // Audit trail
        $updates[] = "aktualizoval_uzivatel_id = :uzivatel_id";
        $updates[] = "dt_aktualizace = NOW()";
        $params[':uzivatel_id'] = $user['id'];
        
        if (empty($updates)) {
            api_error(400, 'Žádná data k aktualizaci');
        }
        
        $sql = "UPDATE " . TBL_SABLONY_DOCX . " SET " . implode(", ", $updates) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Šablona byla úspěšně aktualizována',
            'data' => array(
                'id' => $id,
                'file_updated' => $file_updated,
                'new_filename' => $file_updated ? $new_filename : null,
                'new_md5' => $file_updated ? $new_md5 : null
            )
        ));
        
    } catch (Exception $e) {
        // Pokud se update nepodařil a byl nahrán nový soubor, smazat ho
        if (isset($new_file_path) && file_exists($new_file_path)) {
            unlink($new_file_path);
        }
        api_error(500, 'Chyba při aktualizaci šablony: ' . $e->getMessage());
    }
}

/**
 * Re-upload souboru existující šablony (jen výměna souboru)
 * POST /sablona_docx/reupload (multipart/form-data)
 */
function handle_sablona_docx_reupload($input, $config, $queries) {
    try {
        // Ověření tokenu a username z POST dat
        $token = isset($_POST['token']) ? $_POST['token'] : '';
        $username = isset($_POST['username']) ? $_POST['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        if (!isset($_POST['id'])) {
            api_error(400, 'Chybí ID šablony');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        $id = intval($_POST['id']);
        
        // Kontrola uploadu souboru
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            api_error(400, 'Soubor nebyl nahrán nebo obsahuje chyby');
        }
        
        // Načíst současnou šablonu
        $stmt = $db->prepare("
            SELECT nazev, nazev_souboru_ulozeny 
            FROM " . TBL_SABLONY_DOCX . " 
            WHERE id = :id
        ");
        $stmt->execute(array(':id' => $id));
        $current = $stmt->fetch();
        
        if (!$current) {
            api_error(404, 'Šablona nenalezena');
        }
        
        $file = $_FILES['file'];
        
        // Validace DOCX souboru
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($ext !== 'docx') {
            api_error(400, 'Pouze DOCX soubory jsou povoleny');
        }
        
        if ($file['size'] > 10 * 1024 * 1024) {
            api_error(400, 'Soubor je příliš velký (max 10MB)');
        }
        
        // Načtení upload konfigurace
        $_config = require __DIR__ . '/dbconfig.php';
        $upload_config = $_config['upload'];
        
        // Smazat starý soubor
        $old_file_path = $upload_config['docx_templates_path'] . $current['nazev_souboru_ulozeny'];
        if (file_exists($old_file_path)) {
            unlink($old_file_path);
        }
        
        // Generovat nový unikátní název
        $guid = uniqid('', true) . '_' . mt_rand(1000, 9999);
        $new_filename = 'tpl_' . $guid . '.docx';
        
        // Cesta pro uložení
        $upload_dir = $upload_config['docx_templates_path'];
        $new_file_path = $upload_dir . $new_filename;
        
        // Kontrola kolize názvů
        $pokus = 0;
        while (file_exists($new_file_path) && $pokus < 10) {
            $pokus++;
            $guid = uniqid('', true) . '_' . mt_rand(1000, 9999) . '_' . $pokus;
            $new_filename = 'tpl_' . $guid . '.docx';
            $new_file_path = $upload_dir . $new_filename;
        }
        
        if (file_exists($new_file_path)) {
            api_error(500, 'Nelze vygenerovat unikátní název souboru');
        }
        
        // Přesunout nový soubor
        if (!move_uploaded_file($file['tmp_name'], $new_file_path)) {
            api_error(500, 'Chyba při ukládání nového souboru');
        }
        
        // Generovat MD5 hash
        $new_md5 = md5_file($new_file_path);
        
        // Aktualizovat jen file info v databázi
        $stmt = $db->prepare("
            UPDATE " . TBL_SABLONY_DOCX . " 
            SET nazev_souboru = :nazev_souboru,
                nazev_souboru_ulozeny = :nazev_ulozeny,
                cesta_souboru = :cesta,
                velikost_souboru = :velikost,
                md5_hash = :md5_hash,
                aktualizoval_uzivatel_id = :uzivatel_id,
                dt_aktualizace = NOW()
            WHERE id = :id
        ");
        
        $stmt->execute(array(
            ':nazev_souboru' => $file['name'],
            ':nazev_ulozeny' => $new_filename,
            ':cesta' => $new_filename,
            ':velikost' => $file['size'],
            ':md5_hash' => $new_md5,
            ':uzivatel_id' => $user['id'],
            ':id' => $id
        ));
        
        echo json_encode(array(
            'status' => 'ok',
            'message' => 'Soubor šablony byl úspěšně přenahran',
            'data' => array(
                'id' => $id,
                'nazev_original' => $file['name'],
                'nazev_ulozeny' => $new_filename,
                'velikost' => $file['size'],
                'md5_hash' => $new_md5
            )
        ));
        
    } catch (Exception $e) {
        // Pokud se upload nepodařil, smazat nahraný soubor
        if (isset($new_file_path) && file_exists($new_file_path)) {
            unlink($new_file_path);
        }
        api_error(500, 'Chyba při přenahrávání souboru: ' . $e->getMessage());
    }
}

// ============================================================================
// DELETE - Smazání šablony
// ============================================================================

/**
 * Smazání šablony (hard delete)
 * POST /sablona_docx/delete
 */
function handle_sablona_docx_delete($input, $config, $queries) {
    try {
        // Ověření tokenu a username
        $token = isset($input['token']) ? $input['token'] : '';
        $username = isset($input['username']) ? $input['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }
        
        if (!isset($input['id'])) {
            api_error(400, 'Chybí parametr ID');
        }
        
        $id = intval($input['id']);
        
        // Načíst info o šabloně
        $stmt = $db->prepare("SELECT nazev_souboru_ulozeny, cesta_souboru, nazev FROM " . TBL_SABLONY_DOCX . " WHERE id = :id");
        $stmt->execute(array(':id' => $id));
        $sablona = $stmt->fetch();
        
        if (!$sablona) {
            api_error(404, 'Šablona nenalezena');
        }
        
        // Načtení upload konfigurace pro správnou cestu
        $_config = require __DIR__ . '/dbconfig.php';
        $upload_config = $_config['upload'];
        
        // Smazat soubor z disku
        if (!empty($sablona['nazev_souboru_ulozeny'])) {
            $file_path = $upload_config['docx_templates_path'] . $sablona['nazev_souboru_ulozeny'];
            if (file_exists($file_path)) {
                unlink($file_path);
            }
        }
        
        // Smazat z databáze (hard delete)
        $stmt = $db->prepare("DELETE FROM " . TBL_SABLONY_DOCX . " WHERE id = :id");
        $stmt->execute(array(':id' => $id));
        
        echo json_encode(array(
            'status' => 'ok', 
            'message' => 'Šablona byla trvale smazána',
            'data' => array(
                'id' => $id,
                'nazev' => $sablona['nazev'],
                'file_deleted' => !empty($sablona['nazev_souboru_ulozeny'])
            )
        ));
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při mazání šablony: ' . $e->getMessage());
    }
}

/**
 * Deaktivace šablony (soft delete)
 * POST /sablona_docx/deactivate
 */
function handle_sablona_docx_deactivate($input, $config, $queries) {
    try {
        // Ověření tokenu a username
        $token = isset($input['token']) ? $input['token'] : '';
        $username = isset($input['username']) ? $input['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }
        
        if (!isset($input['id'])) {
            api_error(400, 'Chybí parametr ID');
        }
        
        $id = intval($input['id']);
        
        // Načíst info o šabloně
        $stmt = $db->prepare("SELECT nazev FROM " . TBL_SABLONY_DOCX . " WHERE id = :id");
        $stmt->execute(array(':id' => $id));
        $sablona = $stmt->fetch();
        
        if (!$sablona) {
            api_error(404, 'Šablona nenalezena');
        }
        
        // Soft delete - pouze deaktivace
        $stmt = $db->prepare("
            UPDATE " . TBL_SABLONY_DOCX . " 
            SET aktivni = 0, aktualizoval_uzivatel_id = :uzivatel_id, dt_aktualizace = NOW()
            WHERE id = :id
        ");
        $stmt->execute(array(':uzivatel_id' => $user['id'], ':id' => $id));
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(array(
                'status' => 'ok', 
                'message' => 'Šablona byla deaktivována',
                'data' => array(
                    'id' => $id,
                    'nazev' => $sablona['nazev']
                )
            ));
        } else {
            api_error(404, 'Šablona nebyla nalezena nebo již byla deaktivována');
        }
        
    } catch (Exception $e) {
        api_error(500, 'Chyba při deaktivaci šablony: ' . $e->getMessage());
    }
}

// ============================================================================
// DOWNLOAD - Stažení šablony
// ============================================================================

/**
 * Stažení DOCX souboru šablony
 * POST /sablona_docx/download
 */
function handle_sablona_docx_download($input, $config, $queries) {
    try {
        $db = get_db($config);
        
        if (!isset($input['id'])) {
            http_response_code(400);
            die('Chybí parametr ID');
        }
        
        $id = intval($input['id']);
        
        $stmt = $db->prepare("
            SELECT nazev_souboru, nazev_souboru_ulozeny, md5_hash
            FROM " . TBL_SABLONY_DOCX . " 
            WHERE id = :id AND aktivni = 1
        ");
        $stmt->execute(array(':id' => $id));
        $sablona = $stmt->fetch();
        
        if (!$sablona) {
            http_response_code(404);
            die('Šablona nenalezena');
        }
        
        // TODO: Kontrola přístupu podle úseku
        
        // Načtení správné cesty z konfigurace
        $_config = require __DIR__ . '/dbconfig.php';
        $upload_config = $_config['upload'];
        $file_path = $upload_config['docx_templates_path'] . $sablona['nazev_souboru_ulozeny'];
        
        if (!file_exists($file_path)) {
            http_response_code(404);
            die('Soubor nenalezen');
        }
        
        // Kontrola integrity
        if ($sablona['md5_hash'] && md5_file($file_path) !== $sablona['md5_hash']) {
            http_response_code(500);
            die('Soubor je poškozený');
        }
        
        // Odeslat soubor
        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment; filename="' . $sablona['nazev_souboru'] . '"');
        header('Content-Length: ' . filesize($file_path));
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        
        readfile($file_path);
        exit;
        
    } catch (Exception $e) {
        http_response_code(500);
        die('Chyba: ' . $e->getMessage());
    }
}

// ============================================================================
// VERIFY - Ověření existence souborů šablon
// ============================================================================

/**
 * Ověření existence všech DOCX šablon na disku
 * POST /sablona_docx/verify
 */
function handle_sablona_docx_verify($input, $config, $queries) {
    try {
        // Ověření tokenu a username
        $token = isset($input['token']) ? $input['token'] : '';
        $username = isset($input['username']) ? $input['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        // Načtení upload konfigurace
        $_config = require __DIR__ . '/dbconfig.php';
        $upload_config = $_config['upload'];
        $upload_dir = $upload_config['docx_templates_path'];

        // Získání všech aktivních šablon z databáze
        $stmt = $db->prepare("
            SELECT id, nazev, nazev_souboru, nazev_souboru_ulozeny, velikost_souboru, 
                   md5_hash, aktivni, vytvoril_uzivatel_id, dt_vytvoreni
            FROM " . TBL_SABLONY_DOCX . " 
            ORDER BY dt_vytvoreni DESC
        ");
        $stmt->execute();
        $sablony = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $verificationResults = array();
        $totalTemplates = count($sablony);
        $validTemplates = 0;
        $missingFiles = 0;
        $sizeMismatch = 0;
        $hashMismatch = 0;
        $inactiveTemplates = 0;

        foreach ($sablony as $sablona) {
            $result = array(
                'id' => (int)$sablona['id'],
                'nazev' => $sablona['nazev'],
                'nazev_souboru' => $sablona['nazev_souboru'],
                'nazev_ulozeny' => $sablona['nazev_souboru_ulozeny'],
                'db_velikost' => (int)$sablona['velikost_souboru'],
                'db_md5' => $sablona['md5_hash'],
                'aktivni' => (int)$sablona['aktivni'],
                'file_exists' => false,
                'file_size' => null,
                'file_md5' => null,
                'size_matches' => false,
                'hash_matches' => false,
                'status' => 'error'
            );

            // Sestavit plnou cestu k souboru
            $file_path = $upload_dir . $sablona['nazev_souboru_ulozeny'];

            // Kontrola existence souboru (pro VŠECHNY šablony - aktivní i neaktivní)
            if (file_exists($file_path)) {
                $result['file_exists'] = true;
                $result['file_size'] = filesize($file_path);
                
                // Kontrola velikosti
                if ($result['file_size'] == $sablona['velikost_souboru']) {
                    $result['size_matches'] = true;
                    
                    // Kontrola MD5 hash (jen pokud velikost sedí)
                    $result['file_md5'] = md5_file($file_path);
                    if ($result['file_md5'] === $sablona['md5_hash']) {
                        $result['hash_matches'] = true;
                        // Pokud je šablona neaktivní ale soubor je OK, nastav status inactive_ok
                        if (!$sablona['aktivni']) {
                            $result['status'] = 'inactive_ok';
                            $inactiveTemplates++;
                        } else {
                            $result['status'] = 'ok';
                            $validTemplates++;
                        }
                    } else {
                        $result['status'] = 'hash_mismatch';
                        $hashMismatch++;
                    }
                } else {
                    $result['status'] = 'size_mismatch';
                    $sizeMismatch++;
                }
            } else {
                // Soubor neexistuje
                if (!$sablona['aktivni']) {
                    $result['status'] = 'inactive_missing';
                    $inactiveTemplates++;
                } else {
                    $result['status'] = 'missing_file';
                    $missingFiles++;
                }
            }

            $verificationResults[] = $result;
        }

        // Kontrola orphaned souborů na disku (soubory bez záznamu v DB)
        $orphanedFiles = array();
        if (is_dir($upload_dir)) {
            $diskFiles = glob($upload_dir . 'tpl_*.docx');
            $dbFiles = array_map(function($s) use ($upload_dir) { 
                return $upload_dir . $s['nazev_souboru_ulozeny']; 
            }, $sablony);
            
            $orphanedFiles = array_diff($diskFiles, $dbFiles);
        }

        echo json_encode(array(
            'status' => 'ok',
            'summary' => array(
                'total_templates' => $totalTemplates,
                'valid_templates' => $validTemplates,
                'missing_files' => $missingFiles,
                'size_mismatch' => $sizeMismatch,
                'hash_mismatch' => $hashMismatch,
                'inactive_templates' => $inactiveTemplates,
                'orphaned_files' => count($orphanedFiles),
                'integrity_ok' => ($validTemplates + $inactiveTemplates === $totalTemplates && count($orphanedFiles) === 0)
            ),
            'data' => $verificationResults,
            'orphaned_files' => array_map('basename', $orphanedFiles),
            'upload_directory' => $upload_dir,
            'directory_exists' => is_dir($upload_dir),
            'directory_writable' => is_writable($upload_dir)
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při ověřování šablon: ' . $e->getMessage());
    }
}

/**
 * Ověření existence konkrétní DOCX šablony
 * POST /sablona_docx/verify-single
 */
function handle_sablona_docx_verify_single($input, $config, $queries) {
    try {
        // Ověření tokenu a username
        $token = isset($input['token']) ? $input['token'] : '';
        $username = isset($input['username']) ? $input['username'] : '';
        
        if (empty($token)) {
            api_error(400, 'Chybí token');
        }
        if (empty($username)) {
            api_error(400, 'Chybí username');
        }
        
        if (!isset($input['id'])) {
            api_error(400, 'Chybí ID šablony');
        }
        
        $db = get_db($config);
        $user = verify_token($token, $db);
        if (!$user) {
            api_error(401, 'Neplatný token');
        }
        
        // Ověření username
        if ($user['username'] !== $username) {
            api_error(401, 'Neplatný username pro token');
        }

        $id = (int)$input['id'];

        // Načtení konfigurace
        $_config = require __DIR__ . '/dbconfig.php';
        $upload_config = $_config['upload'];
        $upload_dir = $upload_config['docx_templates_path'];

        // Získání konkrétní šablony
        $stmt = $db->prepare("
            SELECT id, nazev, nazev_souboru, nazev_souboru_ulozeny, velikost_souboru, 
                   md5_hash, aktivni, vytvoril_uzivatel_id, dt_vytvoreni
            FROM " . TBL_SABLONY_DOCX . " 
            WHERE id = :id
        ");
        $stmt->execute(array(':id' => $id));
        $sablona = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$sablona) {
            api_error(404, 'Šablona nenalezena');
        }

        $result = array(
            'id' => (int)$sablona['id'],
            'nazev' => $sablona['nazev'],
            'nazev_souboru' => $sablona['nazev_souboru'],
            'nazev_ulozeny' => $sablona['nazev_souboru_ulozeny'],
            'db_velikost' => (int)$sablona['velikost_souboru'],
            'db_md5' => $sablona['md5_hash'],
            'aktivni' => (int)$sablona['aktivni'],
            'file_exists' => false,
            'file_size' => null,
            'file_md5' => null,
            'size_matches' => false,
            'hash_matches' => false,
            'status' => 'error',
            'full_path' => $upload_dir . $sablona['nazev_souboru_ulozeny']
        );

        // Sestavit plnou cestu k souboru
        $file_path = $upload_dir . $sablona['nazev_souboru_ulozeny'];

        // Kontrola existence souboru
        if (file_exists($file_path)) {
            $result['file_exists'] = true;
            $result['file_size'] = filesize($file_path);
            
            // Kontrola velikosti
            if ($result['file_size'] == $sablona['velikost_souboru']) {
                $result['size_matches'] = true;
                
                // Kontrola MD5 hash
                $result['file_md5'] = md5_file($file_path);
                if ($result['file_md5'] === $sablona['md5_hash']) {
                    $result['hash_matches'] = true;
                    $result['status'] = 'ok';
                } else {
                    $result['status'] = 'hash_mismatch';
                }
            } else {
                $result['status'] = 'size_mismatch';
            }
        } else {
            $result['status'] = 'missing_file';
        }

        echo json_encode(array(
            'status' => 'ok',
            'data' => $result
        ));

    } catch (Exception $e) {
        api_error(500, 'Chyba při ověřování šablony: ' . $e->getMessage());
    }
}

?>

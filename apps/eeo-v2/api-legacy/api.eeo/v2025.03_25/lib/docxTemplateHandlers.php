<?php

require_once __DIR__ . '/../../api.php';
/**
 * DOCX Template Handlers
 * Správa šablon DOCX dokumentů a jejich generování
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
function generateGuid() {
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
function maUzivatelPristupKSablone($sablona, $uzivatel_usek_zkr) {
    // Pokud není omezení, šablona je pro všechny
    if (empty($sablona['usek_omezeni'])) {
        return true;
    }
    
    // Dekódovat JSON
    $povolene_useky = json_decode($sablona['usek_omezeni'], true);
    
    // Chyba v JSON
    if (!is_array($povolene_useky)) {
        return true; // Fallback na povoleno
    }
    
    // Prázdné pole = skryté
    if (count($povolene_useky) === 0) {
        return false;
    }
    
    // Kontrola, zda je úsek uživatele v seznamu
    return in_array($uzivatel_usek_zkr, $povolene_useky);
}

/**
 * Formátování hodnoty podle typu dat a formátu
 */
function formatValue($value, $typ_dat, $format = null) {
    if (is_null($value) || $value === '') {
        return $value;
    }
    
    switch ($typ_dat) {
        case 'date':
            if ($format) {
                $timestamp = is_numeric($value) ? $value : strtotime($value);
                return date($format, $timestamp);
            }
            return $value;
            
        case 'datetime':
            if ($format) {
                $timestamp = is_numeric($value) ? $value : strtotime($value);
                return date($format, $timestamp);
            }
            return $value;
            
        case 'number':
            if ($format) {
                // Formát typu: #,##0.00
                $decimals = 2;
                if (strpos($format, '.') !== false) {
                    $parts = explode('.', $format);
                    $decimals = strlen(rtrim($parts[1], '0'));
                }
                return number_format((float)$value, $decimals, ',', ' ');
            }
            return $value;
            
        case 'boolean':
            return $value ? 'Ano' : 'Ne';
            
        case 'json':
            return is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE);
            
        default:
            return $value;
    }
}

// ============================================================================
// API HANDLERY
// ============================================================================

/**
 * Seznam šablon
 * GET /api.php?action=docx_templates_list
 */
function handle_docx_templates_list($mysqli, $user) {
    $where = array("s.aktivni = 1");
    $params = array();
    $types = "";
    
    // Filtr podle aktivnosti
    if (isset($_GET['aktivni'])) {
        $where[] = "s.aktivni = ?";
        $params[] = intval($_GET['aktivni']);
        $types .= "i";
    }
    
    // Filtr podle typu dokumentu
    if (isset($_GET['typ_dokumentu']) && !empty($_GET['typ_dokumentu'])) {
        $where[] = "s.typ_dokumentu = ?";
        $params[] = $_GET['typ_dokumentu'];
        $types .= "s";
    }
    
    // Filtr podle kategorie
    if (isset($_GET['kategorie_id'])) {
        $where[] = "s.kategorie_id = ?";
        $params[] = intval($_GET['kategorie_id']);
        $types .= "i";
    }
    
    // Filtr podle aktuální platnosti
    if (isset($_GET['pouze_platne']) && $_GET['pouze_platne'] == '1') {
        $where[] = "(s.platnost_od IS NULL OR s.platnost_od <= CURDATE())";
        $where[] = "(s.platnost_do IS NULL OR s.platnost_do >= CURDATE())";
    }
    
    $where_sql = implode(" AND ", $where);
    
    $sql = "
        SELECT 
            s.id, s.nazev, s.popis, s.nazev_souboru, 
            s.platnost_od, s.platnost_do, s.aktivni, s.usek_omezeni,
            s.verze, s.typ_dokumentu, s.poznamka, s.dt_vytvoreni,
            k.id AS kategorie_id, k.nazev AS kategorie_nazev, k.barva AS kategorie_barva,
            u1.id AS vytvoril_id, u1.jmeno AS vytvoril_jmeno, u1.prijmeni AS vytvoril_prijmeni,
            u2.id AS aktualizoval_id, u2.jmeno AS aktualizoval_jmeno, u2.prijmeni AS aktualizoval_prijmeni,
            s.dt_aktualizace,
            (SELECT COUNT(*) FROM " . TBL_DOCX_MAPOVANI . " m WHERE m.sablona_id = s.id AND m.aktivni = 1) AS pocet_poli
        FROM " . TBL_DOCX_SABLONY . " s
        LEFT JOIN " . TBL_DOCX_KATEGORIE . " k ON s.kategorie_id = k.id
        LEFT JOIN " . TBL_UZIVATELE . " u1 ON s.vytvoril_uzivatel_id = u1.id
        LEFT JOIN " . TBL_UZIVATELE . " u2 ON s.aktualizoval_uzivatel_id = u2.id
        WHERE $where_sql
        ORDER BY s.nazev ASC
    ";
    
    $stmt = $mysqli->prepare($sql);
    if (!empty($params)) {
        $bind_params = array_merge(array($types), $params);
        call_user_func_array(array($stmt, 'bind_param'), refValues($bind_params));
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $sablony = array();
    while ($row = $result->fetch_assoc()) {
        // Kontrola přístupu podle úseku
        if (!maUzivatelPristupKSablone($row, $user['usek_zkr'])) {
            continue;
        }
        
        $sablony[] = array(
            'id' => (int)$row['id'],
            'nazev' => $row['nazev'],
            'popis' => $row['popis'],
            'nazev_souboru' => $row['nazev_souboru'],
            'platnost_od' => $row['platnost_od'],
            'platnost_do' => $row['platnost_do'],
            'aktivni' => (bool)$row['aktivni'],
            'verze' => $row['verze'],
            'typ_dokumentu' => $row['typ_dokumentu'],
            'poznamka' => $row['poznamka'],
            'kategorie' => $row['kategorie_id'] ? array(
                'id' => (int)$row['kategorie_id'],
                'nazev' => $row['kategorie_nazev'],
                'barva' => $row['kategorie_barva']
            ) : null,
            'vytvoril' => $row['vytvoril_id'] ? array(
                'id' => (int)$row['vytvoril_id'],
                'jmeno' => $row['vytvoril_jmeno'] . ' ' . $row['vytvoril_prijmeni']
            ) : null,
            'aktualizoval' => $row['aktualizoval_id'] ? array(
                'id' => (int)$row['aktualizoval_id'],
                'jmeno' => $row['aktualizoval_jmeno'] . ' ' . $row['aktualizoval_prijmeni']
            ) : null,
            'dt_vytvoreni' => $row['dt_vytvoreni'],
            'dt_aktualizace' => $row['dt_aktualizace'],
            'pocet_poli' => (int)$row['pocet_poli']
        );
    }
    
    return array('success' => true, 'data' => $sablony);
}

/**
 * Detail šablony včetně mapování
 * GET /api.php?action=docx_template_detail&id=1
 */
function handle_docx_template_detail($mysqli, $user) {
    $id = intval($_GET['id']);
    
    // Načíst šablonu
    $stmt = $mysqli->prepare("
        SELECT s.*, 
               k.nazev AS kategorie_nazev, k.barva AS kategorie_barva,
               u1.jmeno AS vytvoril_jmeno, u1.prijmeni AS vytvoril_prijmeni,
               u2.jmeno AS aktualizoval_jmeno, u2.prijmeni AS aktualizoval_prijmeni
        FROM " . TBL_DOCX_SABLONY . " s
        LEFT JOIN " . TBL_DOCX_KATEGORIE . " k ON s.kategorie_id = k.id
        LEFT JOIN " . TBL_UZIVATELE . " u1 ON s.vytvoril_uzivatel_id = u1.id
        LEFT JOIN " . TBL_UZIVATELE . " u2 ON s.aktualizoval_uzivatel_id = u2.id
        WHERE s.id = ?
    ");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $sablona = $stmt->get_result()->fetch_assoc();
    
    if (!$sablona) {
        return array('success' => false, 'error' => 'Šablona nenalezena');
    }
    
    // Kontrola přístupu
    if (!maUzivatelPristupKSablone($sablona, $user['usek_zkr'])) {
        return array('success' => false, 'error' => 'Nemáte oprávnění k této šabloně');
    }
    
    // Načíst mapování
    $stmt = $mysqli->prepare("
        SELECT * FROM " . TBL_DOCX_MAPOVANI . " 
        WHERE sablona_id = ? AND aktivni = 1 
        ORDER BY poradi ASC
    ");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $mapovani_raw = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    
    // Formátovat mapování
    $mapovani = array();
    foreach ($mapovani_raw as $map) {
        $mapovani[] = array(
            'id' => (int)$map['id'],
            'docvariable_nazev' => $map['docvariable_nazev'],
            'db_zdroj' => $map['db_zdroj'],
            'db_vyraz' => $map['db_vyraz'],
            'db_tabulka' => $map['db_tabulka'],
            'typ_dat' => $map['typ_dat'],
            'format' => $map['format'],
            'default_hodnota' => $map['default_hodnota'],
            'poradi' => (int)$map['poradi'],
            'popis' => $map['popis']
        );
    }
    
    return array(
        'success' => true,
        'data' => array(
            'sablona' => array(
                'id' => (int)$sablona['id'],
                'nazev' => $sablona['nazev'],
                'popis' => $sablona['popis'],
                'nazev_souboru' => $sablona['nazev_souboru'],
                'platnost_od' => $sablona['platnost_od'],
                'platnost_do' => $sablona['platnost_do'],
                'aktivni' => (bool)$sablona['aktivni'],
                'usek_omezeni' => $sablona['usek_omezeni'] ? json_decode($sablona['usek_omezeni'], true) : null,
                'verze' => $sablona['verze'],
                'typ_dokumentu' => $sablona['typ_dokumentu'],
                'poznamka' => $sablona['poznamka'],
                'kategorie' => $sablona['kategorie_nazev'] ? array(
                    'nazev' => $sablona['kategorie_nazev'],
                    'barva' => $sablona['kategorie_barva']
                ) : null
            ),
            'mapovani' => $mapovani
        )
    );
}

/**
 * Upload nové šablony
 * POST /api.php?action=docx_template_upload
 */
function handle_docx_template_upload($mysqli, $user) {
    // Kontrola uploadu
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        return array('success' => false, 'error' => 'Chyba při nahrávání souboru');
    }
    
    $file = $_FILES['file'];
    
    // Validace MIME typu
    $allowed_mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if ($mime !== $allowed_mime) {
        return array('success' => false, 'error' => 'Neplatný typ souboru. Pouze DOCX jsou povoleny.');
    }
    
    // Kontrola velikosti (max 10MB)
    $max_size = 10 * 1024 * 1024;
    if ($file['size'] > $max_size) {
        return array('success' => false, 'error' => 'Soubor je příliš velký (max 10MB)');
    }
    
    // Generovat unikátní název
    $guid = generateGuid();
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $nazev_ulozeny = 'tpl_' . $guid . '.' . $ext;
    
    // Cesta pro uložení
    $upload_dir = __DIR__ . '/../sablony/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }
    
    $cesta_plna = $upload_dir . $nazev_ulozeny;
    
    // Přesunout soubor
    if (!move_uploaded_file($file['tmp_name'], $cesta_plna)) {
        return array('success' => false, 'error' => 'Chyba při ukládání souboru na server');
    }
    
    // MD5 hash
    $md5_hash = md5_file($cesta_plna);
    
    // Uložit do databáze
    $stmt = $mysqli->prepare("
        INSERT INTO " . TBL_DOCX_SABLONY . " 
        (nazev, popis, nazev_souboru, nazev_souboru_ulozeny, cesta_souboru, 
         velikost_souboru, md5_hash, platnost_od, platnost_do, aktivni, 
         usek_omezeni, vytvoril_uzivatel_id, dt_vytvoreni, verze, 
         typ_dokumentu, kategorie_id, poznamka)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
    ");
    
    $nazev = isset($_POST['nazev']) ? $_POST['nazev'] : pathinfo($file['name'], PATHINFO_FILENAME);
    $popis = isset($_POST['popis']) ? $_POST['popis'] : null;
    $cesta_relativni = 'sablony/';
    $velikost = $file['size'];
    $platnost_od = isset($_POST['platnost_od']) && !empty($_POST['platnost_od']) ? $_POST['platnost_od'] : null;
    $platnost_do = isset($_POST['platnost_do']) && !empty($_POST['platnost_do']) ? $_POST['platnost_do'] : null;
    $aktivni = isset($_POST['aktivni']) ? intval($_POST['aktivni']) : 1;
    $usek_omezeni = isset($_POST['usek_omezeni']) ? $_POST['usek_omezeni'] : null;
    $uzivatel_id = $user['id'];
    $verze = isset($_POST['verze']) ? $_POST['verze'] : '1.0';
    $typ_dokumentu = isset($_POST['typ_dokumentu']) ? $_POST['typ_dokumentu'] : null;
    $kategorie_id = isset($_POST['kategorie_id']) && !empty($_POST['kategorie_id']) ? intval($_POST['kategorie_id']) : null;
    $poznamka = isset($_POST['poznamka']) ? $_POST['poznamka'] : null;
    
    $stmt->bind_param("sssssisssissis",
        $nazev, $popis, $file['name'], $nazev_ulozeny, $cesta_relativni,
        $velikost, $md5_hash, $platnost_od, $platnost_do, $aktivni,
        $usek_omezeni, $uzivatel_id, $verze, $typ_dokumentu, $kategorie_id, $poznamka
    );
    
    if ($stmt->execute()) {
        $new_id = $mysqli->insert_id;
        return array(
            'success' => true,
            'message' => 'Šablona byla úspěšně nahrána',
            'data' => array(
                'id' => $new_id,
                'nazev_souboru_ulozeny' => $nazev_ulozeny
            )
        );
    } else {
        // Smazat soubor při chybě DB
        unlink($cesta_plna);
        return array('success' => false, 'error' => 'Chyba při ukládání do databáze: ' . $stmt->error);
    }
}

/**
 * Aktualizace šablony
 * PUT /api.php?action=docx_template_update&id=1
 */
function handle_docx_template_update($mysqli, $user) {
    $id = intval($_GET['id']);
    
    // Načíst JSON data
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!$data) {
        return array('success' => false, 'error' => 'Neplatná JSON data');
    }
    
    // Sestavit UPDATE query
    $updates = array();
    $params = array();
    $types = "";
    
    $allowed_fields = array('nazev', 'popis', 'aktivni', 'platnost_od', 'platnost_do', 
                           'usek_omezeni', 'verze', 'typ_dokumentu', 'kategorie_id', 'poznamka');
    
    foreach ($allowed_fields as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = ?";
            $params[] = $data[$field];
            
            if ($field === 'aktivni' || $field === 'kategorie_id') {
                $types .= "i";
            } else {
                $types .= "s";
            }
        }
    }
    
    if (empty($updates)) {
        return array('success' => false, 'error' => 'Žádná data k aktualizaci');
    }
    
    // Přidat audit pole
    $updates[] = "aktualizoval_uzivatel_id = ?";
    $updates[] = "dt_aktualizace = NOW()";
    $params[] = $user['id'];
    $types .= "i";
    
    $params[] = $id;
    $types .= "i";
    
    $sql = "UPDATE " . TBL_DOCX_SABLONY . " SET " . implode(", ", $updates) . " WHERE id = ?";
    
    $stmt = $mysqli->prepare($sql);
    $bind_params = array_merge(array($types), $params);
    call_user_func_array(array($stmt, 'bind_param'), refValues($bind_params));
    
    if ($stmt->execute()) {
        return array('success' => true, 'message' => 'Šablona byla aktualizována');
    } else {
        return array('success' => false, 'error' => 'Chyba při aktualizaci: ' . $stmt->error);
    }
}

/**
 * Smazání šablony
 * DELETE /api.php?action=docx_template_delete&id=1
 */
function handle_docx_template_delete($mysqli, $user) {
    $id = intval($_GET['id']);
    
    // Načíst info o šabloně
    $stmt = $mysqli->prepare("SELECT nazev_souboru_ulozeny, cesta_souboru FROM " . TBL_DOCX_SABLONY . " WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $sablona = $stmt->get_result()->fetch_assoc();
    
    if (!$sablona) {
        return array('success' => false, 'error' => 'Šablona nenalezena');
    }
    
    // Kontrola zda existují vygenerované dokumenty
    $stmt = $mysqli->prepare("SELECT COUNT(*) AS cnt FROM " . TBL_DOCX_GENEROVANE . " WHERE sablona_id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $count = $stmt->get_result()->fetch_assoc()['cnt'];
    
    if ($count > 0) {
        // Pouze deaktivovat, nesmazat
        $stmt = $mysqli->prepare("UPDATE " . TBL_DOCX_SABLONY . " SET aktivni = 0 WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        
        return array(
            'success' => true,
            'message' => 'Šablona byla deaktivována (existují vygenerované dokumenty)'
        );
    }
    
    // Smazat soubor
    $file_path = __DIR__ . '/../' . $sablona['cesta_souboru'] . $sablona['nazev_souboru_ulozeny'];
    if (file_exists($file_path)) {
        unlink($file_path);
    }
    
    // Smazat z databáze (cascade smaže i mapování)
    $stmt = $mysqli->prepare("DELETE FROM " . TBL_DOCX_SABLONY . " WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        return array('success' => true, 'message' => 'Šablona byla smazána');
    } else {
        return array('success' => false, 'error' => 'Chyba při mazání: ' . $stmt->error);
    }
}

/**
 * Uložení mapování
 * POST /api.php?action=docx_mapping_save
 */
function handle_docx_mapping_save($mysqli, $user) {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!isset($data['sablona_id']) || !isset($data['mapovani'])) {
        return array('success' => false, 'error' => 'Chybí povinná data');
    }
    
    $sablona_id = intval($data['sablona_id']);
    
    // Začít transakci
    $mysqli->begin_transaction();
    
    try {
        // Deaktivovat stávající mapování
        $stmt = $mysqli->prepare("UPDATE 25_docx_mapovani SET aktivni = 0 WHERE sablona_id = ?");
        $stmt->bind_param("i", $sablona_id);
        $stmt->execute();
        
        // Vložit nové mapování
        $stmt = $mysqli->prepare("
            INSERT INTO 25_docx_mapovani 
            (sablona_id, docvariable_nazev, db_zdroj, db_vyraz, db_tabulka, 
             typ_dat, format, default_hodnota, poradi, aktivni, popis, dt_vytvoreni)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())
        ");
        
        foreach ($data['mapovani'] as $index => $map) {
            $poradi = isset($map['poradi']) ? $map['poradi'] : $index;
            
            $stmt->bind_param("isssssssis",
                $sablona_id,
                $map['docvariable_nazev'],
                $map['db_zdroj'],
                isset($map['db_vyraz']) ? $map['db_vyraz'] : null,
                isset($map['db_tabulka']) ? $map['db_tabulka'] : null,
                isset($map['typ_dat']) ? $map['typ_dat'] : 'text',
                isset($map['format']) ? $map['format'] : null,
                isset($map['default_hodnota']) ? $map['default_hodnota'] : null,
                $poradi,
                isset($map['popis']) ? $map['popis'] : null
            );
            
            $stmt->execute();
        }
        
        $mysqli->commit();
        return array('success' => true, 'message' => 'Mapování bylo uloženo');
        
    } catch (Exception $e) {
        $mysqli->rollback();
        return array('success' => false, 'error' => 'Chyba při ukládání: ' . $e->getMessage());
    }
}

/**
 * Seznam kategorií
 * GET /api.php?action=docx_categories_list
 */
function handle_docx_categories_list($mysqli, $user) {
    $stmt = $mysqli->query("
        SELECT id, nazev, popis, barva, poradi
        FROM " . TBL_DOCX_KATEGORIE . " 
        WHERE aktivni = 1 
        ORDER BY poradi ASC, nazev ASC
    ");
    
    $kategorie = array();
    while ($row = $stmt->fetch_assoc()) {
        $kategorie[] = array(
            'id' => (int)$row['id'],
            'nazev' => $row['nazev'],
            'popis' => $row['popis'],
            'barva' => $row['barva'],
            'poradi' => (int)$row['poradi']
        );
    }
    
    return array('success' => true, 'data' => $kategorie);
}

// ============================================================================
// POMOCNÁ FUNKCE PRO BIND_PARAM S REFERENCEMI (PHP 5.6 kompatibilita)
// ============================================================================
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

?>

<?php
/**
 * Invoice Attachment Handlers - Přílohy faktur API
 * PHP 5.6 kompatibilní, MySQL 5.5.43
 * Všechny endpointy jsou POST s token + username autorizací
 * 
 * POZOR: Tento soubor NESMÍ rozbít stávající API!
 * Vše je izolované a nezasahuje do existujících funkcí.
 * 
 * DŮLEŽITÉ: Používá stejnou upload strukturu jako objednávky!
 * Funkce get_orders25_upload_path() je definována v orderAttachmentHandlers.php
 * který je includován před tímto souborem.
 */

require_once __DIR__ . '/TimezoneHelper.php';

/**
 * POST - Načte přílohy konkrétní faktury
 * Endpoint: invoices25/attachments/by-invoice
 * POST: {token, username, faktura_id}
 * Response: {prilohy: [...], count: N}
 */
function handle_invoices25_attachments_by_invoice($input, $config, $queries) {
    // Ověření tokenu
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $faktura_id = isset($input['faktura_id']) ? (int)$input['faktura_id'] : 0;
    
    if (!$token || !$request_username || $faktura_id <= 0) {
        http_response_code(400);
        echo json_encode([
            'err' => 'Chybí povinné parametry',
            'debug' => [
                'has_token' => !empty($token),
                'username' => $request_username,
                'faktura_id' => $faktura_id
            ]
        ]);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }

        // Načti přílohy faktury s informacemi o uživateli (stejná struktura jako LIST)
        $sql = "SELECT 
            fp.id,
            fp.faktura_id,
            fp.objednavka_id,
            fp.guid,
            fp.typ_prilohy,
            fp.originalni_nazev_souboru,
            fp.systemova_cesta,
            fp.velikost_souboru_b,
            fp.je_isdoc,
            fp.isdoc_parsed,
            fp.nahrano_uzivatel_id,
            fp.dt_vytvoreni,
            fp.dt_aktualizace,
            u.jmeno AS nahrano_jmeno,
            u.prijmeni AS nahrano_prijmeni,
            u.titul_pred AS nahrano_titul_pred,
            u.titul_za AS nahrano_titul_za,
            u.email AS nahrano_email,
            u.telefon AS nahrano_telefon
        FROM `25a_faktury_prilohy` fp
        LEFT JOIN `25_uzivatele` u ON fp.nahrano_uzivatel_id = u.id
        WHERE fp.faktura_id = ?
        ORDER BY fp.dt_vytvoreni ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$faktura_id]);
        $prilohy = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Formátuj data pro frontend (stejná struktura jako LIST)
        foreach ($prilohy as &$priloha) {
            // Velikosti
            $velikost_b = (int)$priloha['velikost_souboru_b'];
            $priloha['velikost_b'] = $velikost_b;
            $priloha['velikost_kb'] = round($velikost_b / 1024, 2);
            $priloha['velikost_mb'] = round($velikost_b / 1024 / 1024, 2);
            
            // User info - enriched struktura
            $nahrano_uid = $priloha['nahrano_uzivatel_id'];
            $priloha['nahrano_uzivatel'] = $nahrano_uid ? trim($priloha['nahrano_prijmeni'] . ' ' . $priloha['nahrano_jmeno']) : null;
            
            $priloha['nahrano_uzivatel_detail'] = null;
            if ($nahrano_uid) {
                $priloha['nahrano_uzivatel_detail'] = array(
                    'id' => (int)$nahrano_uid,
                    'jmeno' => $priloha['nahrano_jmeno'],
                    'prijmeni' => $priloha['nahrano_prijmeni'],
                    'titul_pred' => $priloha['nahrano_titul_pred'],
                    'titul_za' => $priloha['nahrano_titul_za'],
                    'email' => $priloha['nahrano_email'],
                    'telefon' => $priloha['nahrano_telefon']
                );
            }
            
            // Boolean konverze
            $priloha['je_isdoc'] = (int)$priloha['je_isdoc'];
            $priloha['isdoc_parsed'] = (int)$priloha['isdoc_parsed'];
            
            // Vyčisti duplicitní sloupce
            unset($priloha['nahrano_jmeno'], $priloha['nahrano_prijmeni'],
                  $priloha['nahrano_titul_pred'], $priloha['nahrano_titul_za'],
                  $priloha['nahrano_email'], $priloha['nahrano_telefon']);
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'ok',
            'prilohy' => $prilohy,
            'count' => count($prilohy),
            'faktura_id' => $faktura_id
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání příloh: ' . $e->getMessage()]);
    }
}

/**
 * POST - Načte všechny přílohy všech faktur objednávky
 * Endpoint: invoices25/attachments/by-order
 * POST: {token, username, objednavka_id}
 * Response: {prilohy: [...], count: N, statistiky: {...}}
 */
function handle_invoices25_attachments_by_order($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $objednavka_id = isset($input['objednavka_id']) ? (int)$input['objednavka_id'] : 0;
    
    if (!$token || !$request_username || $objednavka_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí povinné parametry']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }

        // Načti přílohy všech faktur objednávky (stejná struktura jako LIST)
        $sql = "SELECT 
            fp.id,
            fp.faktura_id,
            fp.objednavka_id,
            fp.guid,
            fp.typ_prilohy,
            fp.originalni_nazev_souboru,
            fp.systemova_cesta,
            fp.velikost_souboru_b,
            fp.je_isdoc,
            fp.isdoc_parsed,
            fp.nahrano_uzivatel_id,
            fp.dt_vytvoreni,
            f.fa_cislo_vema,
            f.fa_castka,
            u.jmeno AS nahrano_jmeno,
            u.prijmeni AS nahrano_prijmeni,
            u.titul_pred AS nahrano_titul_pred,
            u.titul_za AS nahrano_titul_za,
            u.email AS nahrano_email,
            u.telefon AS nahrano_telefon
        FROM `25a_faktury_prilohy` fp
        LEFT JOIN `25a_objednavky_faktury` f ON fp.faktura_id = f.id
        LEFT JOIN `25_uzivatele` u ON fp.nahrano_uzivatel_id = u.id
        WHERE fp.objednavka_id = ?
        ORDER BY fp.faktura_id ASC, fp.dt_vytvoreni ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$objednavka_id]);
        $prilohy = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Formátuj data (stejná struktura jako LIST)
        foreach ($prilohy as &$priloha) {
            // Velikosti
            $velikost_b = (int)$priloha['velikost_souboru_b'];
            $priloha['velikost_b'] = $velikost_b;
            $priloha['velikost_kb'] = round($velikost_b / 1024, 2);
            $priloha['velikost_mb'] = round($velikost_b / 1024 / 1024, 2);
            
            // User info - enriched struktura
            $nahrano_uid = $priloha['nahrano_uzivatel_id'];
            $priloha['nahrano_uzivatel'] = $nahrano_uid ? trim($priloha['nahrano_prijmeni'] . ' ' . $priloha['nahrano_jmeno']) : null;
            
            $priloha['nahrano_uzivatel_detail'] = null;
            if ($nahrano_uid) {
                $priloha['nahrano_uzivatel_detail'] = array(
                    'id' => (int)$nahrano_uid,
                    'jmeno' => $priloha['nahrano_jmeno'],
                    'prijmeni' => $priloha['nahrano_prijmeni'],
                    'titul_pred' => $priloha['nahrano_titul_pred'],
                    'titul_za' => $priloha['nahrano_titul_za'],
                    'email' => $priloha['nahrano_email'],
                    'telefon' => $priloha['nahrano_telefon']
                );
            }
            
            // Boolean konverze
            $priloha['je_isdoc'] = (int)$priloha['je_isdoc'];
            $priloha['isdoc_parsed'] = (int)$priloha['isdoc_parsed'];
            
            // Vyčisti duplicitní sloupce
            unset($priloha['nahrano_jmeno'], $priloha['nahrano_prijmeni'],
                  $priloha['nahrano_titul_pred'], $priloha['nahrano_titul_za'],
                  $priloha['nahrano_email'], $priloha['nahrano_telefon']);
        }

        // Statistiky
        $stats_sql = "SELECT 
            COUNT(DISTINCT fp.faktura_id) AS pocet_faktur_s_prilohami,
            COUNT(*) AS celkem_priloh,
            SUM(fp.velikost_souboru_b) AS celkova_velikost_b,
            SUM(CASE WHEN fp.je_isdoc = 1 THEN 1 ELSE 0 END) AS pocet_isdoc,
            MAX(fp.dt_vytvoreni) AS posledni_priloha_dt
        FROM `25a_faktury_prilohy` fp
        WHERE fp.objednavka_id = ?";
        
        $stats_stmt = $db->prepare($stats_sql);
        $stats_stmt->execute([$objednavka_id]);
        $statistiky = $stats_stmt->fetch(PDO::FETCH_ASSOC);
        
        $statistiky['celkova_velikost_mb'] = round($statistiky['celkova_velikost_b'] / 1024 / 1024, 2);

        http_response_code(200);
        echo json_encode([
            'status' => 'ok',
            'prilohy' => $prilohy,
            'count' => count($prilohy),
            'objednavka_id' => $objednavka_id,
            'statistiky' => $statistiky
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání příloh: ' . $e->getMessage()]);
    }
}

/**
 * POST (Multipart) - Upload přílohy k faktuře
 * Endpoint: invoices25/attachments/upload
 * POST: {token, username, faktura_id, objednavka_id, typ_prilohy} + FILE
 * Response: {success: true, priloha: {...}}
 */
function handle_invoices25_attachments_upload($input, $config, $queries) {
    // Pro upload používáme $_POST místo $input kvůli multipart/form-data
    $token = isset($_POST['token']) ? $_POST['token'] : '';
    $request_username = isset($_POST['username']) ? $_POST['username'] : '';
    $faktura_id = isset($_POST['faktura_id']) ? (int)$_POST['faktura_id'] : 0;
    $objednavka_id = isset($_POST['objednavka_id']) ? (int)$_POST['objednavka_id'] : 0;
    $typ_prilohy = isset($_POST['typ_prilohy']) ? $_POST['typ_prilohy'] : 'FAKTURA';
    
    if (!$token || !$request_username || $faktura_id <= 0 || $objednavka_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí povinné parametry']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    // Kontrola uploaded file
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['err' => 'Chyba při nahrávání souboru']);
        return;
    }

    $file = $_FILES['file'];
    $original_name = basename($file['name']);
    $file_size = $file['size'];
    $tmp_path = $file['tmp_name'];

    // Validace typu souboru (whitelist)
    $allowed_extensions = array('pdf', 'isdoc', 'jpg', 'jpeg', 'png', 'xml');
    $pathinfo = pathinfo($original_name);
    $ext = strtolower($pathinfo['extension']);
    
    if (!in_array($ext, $allowed_extensions)) {
        http_response_code(400);
        echo json_encode(['err' => 'Nepodporovaný typ souboru. Povolené: ' . implode(', ', $allowed_extensions)]);
        return;
    }

    // Validace velikosti - načti z konfigurace nebo fallback
    $_config = require __DIR__ . '/dbconfig.php';
    $uploadConfig = isset($_config['upload']) ? $_config['upload'] : array();
    $max_size = isset($uploadConfig['max_file_size']) ? $uploadConfig['max_file_size'] : (20 * 1024 * 1024); // 20MB default
    
    if ($file_size > $max_size) {
        http_response_code(400);
        echo json_encode(['err' => 'Soubor je příliš velký. Maximum: ' . ($max_size / 1024 / 1024) . 'MB']);
        return;
    }

    // Validace MIME type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime_type = finfo_file($finfo, $tmp_path);
    finfo_close($finfo);
    
    $allowed_mimes = array(
        'application/pdf',
        'application/xml',
        'text/xml',
        'image/jpeg',
        'image/png'
    );
    
    if (!in_array($mime_type, $allowed_mimes)) {
        http_response_code(400);
        echo json_encode(['err' => 'Nepodporovaný MIME type souboru']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }

        // Validace že faktura patří k objednávce
        $check_sql = "SELECT COUNT(*) FROM `25a_objednavky_faktury` WHERE id = ? AND objednavka_id = ?";
        $check_stmt = $db->prepare($check_sql);
        $check_stmt->execute([$faktura_id, $objednavka_id]);
        if ($check_stmt->fetchColumn() == 0) {
            http_response_code(400);
            echo json_encode(['err' => 'Faktura nepatří k zadané objednávce']);
            return;
        }
        
        // Nastav MySQL timezone na Europe/Prague pro NOW()
        TimezoneHelper::setMysqlTimezone($db);

        // Generuj GUID a cesty podle Orders25 konvence
        // Použití stejné funkce jako pro objednávky
        $upload_dir = get_orders25_upload_path($config, $objednavka_id, $token_data['user_id']);
        
        // GUID ve formátu: fa-YYYY-MM-DD_GUID (prefix fa- pro faktury)
        $guid_part = sprintf('%08x%04x%04x%04x%012x',
            mt_rand(), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff), mt_rand()
        );
        $systemovy_nazev = 'fa-' . TimezoneHelper::getCzechDateTime('Y-m-d') . '_' . $guid_part;
        $filename = $systemovy_nazev . '.' . $ext;
        $full_path = $upload_dir . $filename;
        
        // Do DB ukládáme plnou fyzickou cestu (stejně jako u objednávek)
        $db_path = $full_path;

        // Vytvoř složky pokud neexistují
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }

        // Přesuň soubor
        if (!move_uploaded_file($tmp_path, $full_path)) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba při ukládání souboru na disk']);
            return;
        }

        // Detekce ISDOC
        $je_isdoc = ($ext === 'isdoc') ? 1 : 0;

        // Vlož záznam do DB
        $insert_sql = "INSERT INTO `25a_faktury_prilohy` (
            faktura_id,
            objednavka_id,
            guid,
            typ_prilohy,
            originalni_nazev_souboru,
            systemova_cesta,
            velikost_souboru_b,
            je_isdoc,
            nahrano_uzivatel_id,
            dt_vytvoreni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $insert_stmt = $db->prepare($insert_sql);
        $insert_stmt->execute([
            $faktura_id,
            $objednavka_id,
            $systemovy_nazev,
            $typ_prilohy,
            $original_name,
            $db_path,
            $file_size,
            $je_isdoc,
            $token_data['user_id']
        ]);

        $new_id = $db->lastInsertId();

        // Načti vytvořený záznam (stejná struktura jako LIST)
        $select_sql = "SELECT 
            fp.*,
            u.jmeno AS nahrano_jmeno,
            u.prijmeni AS nahrano_prijmeni,
            u.titul_pred AS nahrano_titul_pred,
            u.titul_za AS nahrano_titul_za,
            u.email AS nahrano_email,
            u.telefon AS nahrano_telefon
        FROM `25a_faktury_prilohy` fp
        LEFT JOIN `25_uzivatele` u ON fp.nahrano_uzivatel_id = u.id
        WHERE fp.id = ?";
        
        $select_stmt = $db->prepare($select_sql);
        $select_stmt->execute([$new_id]);
        $priloha = $select_stmt->fetch(PDO::FETCH_ASSOC);
        
        // Formátuj pro frontend (stejná struktura jako LIST)
        $velikost_b = (int)$priloha['velikost_souboru_b'];
        $priloha['velikost_b'] = $velikost_b;
        $priloha['velikost_kb'] = round($velikost_b / 1024, 2);
        $priloha['velikost_mb'] = round($velikost_b / 1024 / 1024, 2);
        
        // User info - enriched struktura
        $nahrano_uid = $priloha['nahrano_uzivatel_id'];
        $priloha['nahrano_uzivatel'] = $nahrano_uid ? trim($priloha['nahrano_prijmeni'] . ' ' . $priloha['nahrano_jmeno']) : null;
        
        $priloha['nahrano_uzivatel_detail'] = null;
        if ($nahrano_uid) {
            $priloha['nahrano_uzivatel_detail'] = array(
                'id' => (int)$nahrano_uid,
                'jmeno' => $priloha['nahrano_jmeno'],
                'prijmeni' => $priloha['nahrano_prijmeni'],
                'titul_pred' => $priloha['nahrano_titul_pred'],
                'titul_za' => $priloha['nahrano_titul_za'],
                'email' => $priloha['nahrano_email'],
                'telefon' => $priloha['nahrano_telefon']
            );
        }
        
        // Boolean konverze
        $priloha['je_isdoc'] = (int)$priloha['je_isdoc'];
        $priloha['isdoc_parsed'] = (int)$priloha['isdoc_parsed'];
        
        // Vyčisti duplicitní sloupce
        unset($priloha['nahrano_jmeno'], $priloha['nahrano_prijmeni'],
              $priloha['nahrano_titul_pred'], $priloha['nahrano_titul_za'],
              $priloha['nahrano_email'], $priloha['nahrano_telefon']);

        http_response_code(201);
        echo json_encode([
            'status' => 'ok',
            'message' => 'Příloha byla úspěšně nahrána',
            'priloha' => $priloha
        ]);

    } catch (Exception $e) {
        // Pokud nastala chyba, smaž soubor pokud existuje
        if (isset($full_path) && file_exists($full_path)) {
            unlink($full_path);
        }
        
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při nahrávání přílohy: ' . $e->getMessage()]);
    }
}


/**
 * POST - Stažení přílohy (download)
 * Endpoint: invoices25/attachments/download
 * POST: {token, username, priloha_id}
 * Response: FILE STREAM
 */
function handle_invoices25_attachments_download($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $priloha_id = isset($input['priloha_id']) ? (int)$input['priloha_id'] : 0;
    
    if (!$token || !$request_username || $priloha_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí povinné parametry']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }

        // Načti přílohu
        $sql = "SELECT * FROM `25a_faktury_prilohy` WHERE id = ? LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([$priloha_id]);
        $priloha = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$priloha) {
            http_response_code(404);
            $errorMsg = 'Přílohu faktury nelze stáhnout - záznam přílohy nebyl nalezen v databázi. ';
            $errorMsg .= 'Příloha mohla být odstraněna nebo neexistuje. ';
            $errorMsg .= 'Kontaktujte prosím administrátora.';
            echo json_encode(['err' => $errorMsg]);
            return;
        }

        // systemova_cesta je již plná fyzická cesta (stejně jako u objednávek)
        $full_path = $priloha['systemova_cesta'];

        // Kontrola existence souboru
        if (!file_exists($full_path)) {
            // ✅ Uživatelsky přívětivá chybová zpráva
            $errorMsg = 'Nepodařilo se stáhnout přílohu faktury "' . $priloha['originalni_nazev_souboru'] . '". ';
            $errorMsg .= 'Soubor nebyl nalezen na serveru (chybí fyzický soubor). ';
            $errorMsg .= 'Příloha mohla být odstraněna, přesunuta nebo se nepodařilo její nahrání. ';
            $errorMsg .= 'Pro obnovení přílohy kontaktujte prosím administrátora.';
            
            // Log pro administrátora s plnou cestou
            error_log('PŘÍLOHA FAKTURY NENALEZENA: ' . $full_path . ' (priloha_id: ' . $priloha_id . ', faktura_id: ' . $priloha['faktura_id'] . ', original: ' . $priloha['originalni_nazev_souboru'] . ')');
            
            http_response_code(404);
            echo json_encode([
                'err' => $errorMsg,
                'original_filename' => $priloha['originalni_nazev_souboru'],
                'missing_file' => basename($full_path)
            ]);
            return;
        }

        // Určení MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime_type = finfo_file($finfo, $full_path);
        finfo_close($finfo);

        // Nastavení hlaviček pro download
        header('Content-Type: ' . $mime_type);
        header('Content-Disposition: attachment; filename="' . $priloha['originalni_nazev_souboru'] . '"');
        header('Content-Length: ' . filesize($full_path));
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        // Odeslání souboru
        readfile($full_path);
        exit;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při stahování přílohy: ' . $e->getMessage()]);
    }
}

/**
 * POST - Smazání přílohy
 * Endpoint: invoices25/attachments/delete
 * POST: {token, username, priloha_id}
 * Response: {success: true, message: "..."}
 */
function handle_invoices25_attachments_delete($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $priloha_id = isset($input['priloha_id']) ? (int)$input['priloha_id'] : 0;
    
    if (!$token || !$request_username || $priloha_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí povinné parametry']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }

        // Načti přílohu před smazáním
        $sql = "SELECT * FROM `25a_faktury_prilohy` WHERE id = ? LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([$priloha_id]);
        $priloha = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$priloha) {
            http_response_code(404);
            echo json_encode(['err' => 'Příloha nenalezena']);
            return;
        }

        // systemova_cesta je již plná fyzická cesta
        $full_path = $priloha['systemova_cesta'];
        if (file_exists($full_path)) {
            unlink($full_path);
        }

        // Smaž záznam z DB
        $delete_sql = "DELETE FROM `25a_faktury_prilohy` WHERE id = ? LIMIT 1";
        $delete_stmt = $db->prepare($delete_sql);
        $delete_stmt->execute([$priloha_id]);

        // Zkontroluj jestli je složka prázdná a smaž ji (uklízíme po sobě)
        $dir = dirname($full_path);
        if (is_dir($dir)) {
            $files = array_diff(scandir($dir), array('.', '..'));
            if (count($files) === 0) {
                rmdir($dir);
            }
        }

        http_response_code(200);
        echo json_encode([
            'status' => 'ok',
            'message' => 'Příloha byla úspěšně smazána'
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při mazání přílohy: ' . $e->getMessage()]);
    }
}

/**
 * POST - Aktualizace metadat přílohy (typ, název)
 * Endpoint: invoices25/attachments/update
 * POST: {token, username, priloha_id, typ_prilohy?, originalni_nazev_souboru?}
 * Response: {success: true, priloha: {...}}
 */
function handle_invoices25_attachments_update($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $priloha_id = isset($input['priloha_id']) ? (int)$input['priloha_id'] : 0;
    
    if (!$token || !$request_username || $priloha_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí povinné parametry']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }
        
        // Nastav MySQL timezone na Europe/Prague
        TimezoneHelper::setMysqlTimezone($db);

        // Zkontroluj existenci přílohy
        $check_sql = "SELECT id FROM `25a_faktury_prilohy` WHERE id = ? LIMIT 1";
        $check_stmt = $db->prepare($check_sql);
        $check_stmt->execute([$priloha_id]);
        if (!$check_stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['err' => 'Příloha nenalezena']);
            return;
        }

        // Sestavení UPDATE dotazu
        $update_fields = array();
        $update_params = array();
        
        if (isset($input['typ_prilohy'])) {
            $update_fields[] = "`typ_prilohy` = ?";
            $update_params[] = $input['typ_prilohy'];
        }
        
        if (isset($input['originalni_nazev_souboru'])) {
            $update_fields[] = "`originalni_nazev_souboru` = ?";
            $update_params[] = $input['originalni_nazev_souboru'];
        }

        if (empty($update_fields)) {
            http_response_code(400);
            echo json_encode(['err' => 'Nebyla poskytnuta žádná pole k aktualizaci']);
            return;
        }

        // Přidej dt_aktualizace
        $update_fields[] = "`dt_aktualizace` = ?";
        $update_params[] = TimezoneHelper::getCzechDateTime('Y-m-d H:i:s');
        
        // Přidej ID na konec
        $update_params[] = $priloha_id;

        $update_sql = "UPDATE `25a_faktury_prilohy` SET " . implode(', ', $update_fields) . " WHERE id = ? LIMIT 1";
        $update_stmt = $db->prepare($update_sql);
        $update_stmt->execute($update_params);

        // Načti aktualizovaný záznam
        $select_sql = "SELECT 
            fp.*,
            u.jmeno AS nahrano_uzivatel_jmeno,
            u.prijmeni AS nahrano_uzivatel_prijmeni
        FROM `25a_faktury_prilohy` fp
        LEFT JOIN `25_uzivatele` u ON fp.nahrano_uzivatel_id = u.id
        WHERE fp.id = ?";
        
        $select_stmt = $db->prepare($select_sql);
        $select_stmt->execute([$priloha_id]);
        $priloha = $select_stmt->fetch(PDO::FETCH_ASSOC);
        
        // Formátuj pro frontend
        $priloha['velikost_kb'] = round($priloha['velikost_souboru_b'] / 1024, 2);
        $priloha['velikost_mb'] = round($priloha['velikost_souboru_b'] / 1024 / 1024, 2);
        $priloha['nahrano_uzivatel'] = trim($priloha['nahrano_uzivatel_prijmeni'] . ' ' . $priloha['nahrano_uzivatel_jmeno']);
        $priloha['je_isdoc'] = (int)$priloha['je_isdoc'] === 1;
        $priloha['isdoc_parsed'] = (int)$priloha['isdoc_parsed'] === 1;

        http_response_code(200);
        echo json_encode([
            'status' => 'ok',
            'message' => 'Příloha byla aktualizována',
            'priloha' => $priloha
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při aktualizaci přílohy: ' . $e->getMessage()]);
    }
}

/**
 * POST - Získání detailu jedné přílohy podle ID
 * Endpoint: invoices25/attachments/by-id
 * POST: {token, username, priloha_id}
 * Response: {priloha: {...}}
 */
function handle_invoices25_attachments_by_id($input, $config, $queries) {
    $token = isset($input['token']) ? $input['token'] : '';
    $request_username = isset($input['username']) ? $input['username'] : '';
    $priloha_id = isset($input['priloha_id']) ? (int)$input['priloha_id'] : 0;
    
    if (!$token || !$request_username || $priloha_id <= 0) {
        http_response_code(400);
        echo json_encode(['err' => 'Chybí povinné parametry']);
        return;
    }

    $token_data = verify_token($token);
    if (!$token_data) {
        http_response_code(401);
        echo json_encode(['err' => 'Neplatný token']);
        return;
    }
    
    if ($token_data['username'] !== $request_username) {
        http_response_code(403);
        echo json_encode(['err' => 'Neautorizovaný přístup']);
        return;
    }

    try {
        $db = get_db($config);
        if (!$db) {
            http_response_code(500);
            echo json_encode(['err' => 'Chyba připojení k databázi']);
            return;
        }

        $sql = "SELECT 
            fp.*,
            u.jmeno AS nahrano_uzivatel_jmeno,
            u.prijmeni AS nahrano_uzivatel_prijmeni,
            f.fa_cislo_vema
        FROM `25a_faktury_prilohy` fp
        LEFT JOIN `25_uzivatele` u ON fp.nahrano_uzivatel_id = u.id
        LEFT JOIN `25a_objednavky_faktury` f ON fp.faktura_id = f.id
        WHERE fp.id = ?
        LIMIT 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$priloha_id]);
        $priloha = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$priloha) {
            http_response_code(404);
            echo json_encode(['err' => 'Příloha nenalezena']);
            return;
        }

        // Formátuj pro frontend
        $priloha['velikost_kb'] = round($priloha['velikost_souboru_b'] / 1024, 2);
        $priloha['velikost_mb'] = round($priloha['velikost_souboru_b'] / 1024 / 1024, 2);
        $priloha['nahrano_uzivatel'] = trim($priloha['nahrano_uzivatel_prijmeni'] . ' ' . $priloha['nahrano_uzivatel_jmeno']);
        $priloha['je_isdoc'] = (int)$priloha['je_isdoc'] === 1;
        $priloha['isdoc_parsed'] = (int)$priloha['isdoc_parsed'] === 1;
        
        // Kontrola existence souboru (systemova_cesta je plná fyzická cesta)
        $priloha['soubor_existuje'] = file_exists($priloha['systemova_cesta']);

        http_response_code(200);
        echo json_encode([
            'status' => 'ok',
            'priloha' => $priloha
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['err' => 'Chyba při načítání přílohy: ' . $e->getMessage()]);
    }
}

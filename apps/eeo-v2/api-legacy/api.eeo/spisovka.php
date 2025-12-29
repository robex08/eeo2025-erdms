<?php
/**
 * Spisovka API Endpoint
 * Připojení k databázi spisovka350 na serveru 10.1.1.253
 * Read-only přístup k fakturám a jejich přílohám
 */

// Error reporting
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/php_spisovka_errors.log');
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);

// CORS headers are handled by Apache - do not send them from PHP to avoid duplication
header("Content-Type: application/json; charset=utf-8");

// Preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Konfigurace připojení k databázi spisovka350
$spisovka_config = array(
    'host' => '10.1.1.253',
    'username' => 'erdms_spis',
    'password' => 'SpisRO2024!',
    'database' => 'spisovka350'
);

// Získání request metody a URI
$request_method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];

// Parse URI
$uri_parts = explode('?', $request_uri);
$path = $uri_parts[0];
$path_parts = explode('/', trim($path, '/'));

// Najít endpoint (poslední část cesty)
$endpoint = end($path_parts);

// Response helper
function send_response($status, $data) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Error handler
function send_error($status, $message) {
    send_response($status, array(
        'status' => 'error',
        'message' => $message
    ));
}

// ============================================================
// ENDPOINT: GET /api.eeo/spisovka.php/faktury
// Vrátí seznam faktur (fa č.) s přílohami a download URL
// ============================================================
if ($endpoint === 'faktury' && $request_method === 'GET') {
    
    // Připojení k databázi
    $conn = new mysqli(
        $spisovka_config['host'],
        $spisovka_config['username'],
        $spisovka_config['password'],
        $spisovka_config['database']
    );
    
    if ($conn->connect_error) {
        send_error(500, 'Chyba připojení k databázi spisovka350: ' . $conn->connect_error);
    }
    
    $conn->set_charset('utf8');
    
    // Parametry z query string
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $rok = isset($_GET['rok']) ? (int)$_GET['rok'] : 2025;
    
    // SQL dotaz - seznam faktur s počtem příloh
    // REGEXP pattern odpovídá JS regex: /faktur[aáuú]|fa[\s\.]*(c|č)[\s\.]?|fak[\s\.]*(c|č)[\s\.]?|^fa\s/i
    $sql = "
        SELECT 
            d.id as dokument_id,
            d.jid,
            d.nazev,
            d.cislo_jednaci,
            d.datum_vzniku,
            d.datum_vyrizeni,
            d.stav,
            COUNT(DISTINCT dtf.file_id) as pocet_priloh
        FROM dokument d
        LEFT JOIN dokument_to_file dtf ON d.id = dtf.dokument_id AND dtf.active = 1
        WHERE d.nazev REGEXP 'faktur[aáuú]|fa[[:space:]\.]*[cč][[:space:]\.]?|fak[[:space:]\.]*[cč][[:space:]\.]?|^fa[[:space:]]'
          AND YEAR(d.datum_vzniku) = ?
        GROUP BY d.id
        ORDER BY d.id DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        send_error(500, 'Chyba přípravy SQL dotazu: ' . $conn->error);
    }
    
    $stmt->bind_param('iii', $rok, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $faktury = array();
    
    while ($row = $result->fetch_assoc()) {
        $dokument_id = $row['dokument_id'];
        
        // Získat přílohy pro tuto fakturu
        $sql_prilohy = "
            SELECT 
                f.id as file_id,
                f.real_name,
                f.real_path,
                f.mime_type,
                ROUND(f.size / 1024, 2) as size_kb,
                f.size,
                dtf.dokument_id
            FROM dokument_to_file dtf
            INNER JOIN file f ON dtf.file_id = f.id
            WHERE dtf.dokument_id = ?
              AND dtf.active = 1
            ORDER BY dtf.date_added ASC
        ";
        
        $stmt_prilohy = $conn->prepare($sql_prilohy);
        $stmt_prilohy->bind_param('i', $dokument_id);
        $stmt_prilohy->execute();
        $result_prilohy = $stmt_prilohy->get_result();
        
        $prilohy = array();
        while ($priloha = $result_prilohy->fetch_assoc()) {
            // Přímá URL k souboru (bez přihlášení)
            $direct_url = 'http://10.1.1.253/spisovka350/client' . $priloha['real_path'];
            
            $prilohy[] = array(
                'file_id' => (int)$priloha['file_id'],
                'filename' => $priloha['real_name'],
                'mime_type' => $priloha['mime_type'],
                'size' => (int)$priloha['size'],
                'size_kb' => (float)$priloha['size_kb'],
                'download_url' => $direct_url
            );
        }
        $stmt_prilohy->close();
        
        // Přidat fakturu do výsledku
        $faktury[] = array(
            'dokument_id' => (int)$row['dokument_id'],
            'jid' => $row['jid'],
            'nazev' => $row['nazev'],
            'cislo_jednaci' => $row['cislo_jednaci'],
            'datum_vzniku' => $row['datum_vzniku'],
            'datum_vyrizeni' => $row['datum_vyrizeni'],
            'stav' => (int)$row['stav'],
            'pocet_priloh' => (int)$row['pocet_priloh'],
            'prilohy' => $prilohy
        );
    }
    
    $stmt->close();
    
    // Celkový počet faktur
    $sql_count = "
        SELECT COUNT(*) as total
        FROM dokument
        WHERE nazev LIKE 'fa č. %'
          AND YEAR(datum_vzniku) = ?
    ";
    
    $stmt_count = $conn->prepare($sql_count);
    $stmt_count->bind_param('i', $rok);
    $stmt_count->execute();
    $result_count = $stmt_count->get_result();
    $total_row = $result_count->fetch_assoc();
    $total = (int)$total_row['total'];
    $stmt_count->close();
    
    $conn->close();
    
    // Response
    send_response(200, array(
        'status' => 'success',
        'data' => $faktury,
        'pagination' => array(
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'rok' => $rok,
            'count' => count($faktury)
        )
    ));
}

// ============================================================
// ENDPOINT: GET /api.eeo/spisovka.php/faktura/:id
// Vrátí detail konkrétní faktury včetně příloh
// ============================================================
if ($endpoint === 'faktura' && $request_method === 'GET') {
    
    // Získat ID z URL (např. /spisov ka.php/faktura/108116)
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if ($id === 0) {
        send_error(400, 'Chybí parametr id');
    }
    
    // Připojení k databázi
    $conn = new mysqli(
        $spisovka_config['host'],
        $spisovka_config['username'],
        $spisovka_config['password'],
        $spisovka_config['database']
    );
    
    if ($conn->connect_error) {
        send_error(500, 'Chyba připojení k databázi: ' . $conn->connect_error);
    }
    
    $conn->set_charset('utf8');
    
    // SQL dotaz pro detail faktury
    $sql = "
        SELECT 
            d.id as dokument_id,
            d.jid,
            d.nazev,
            d.popis,
            d.cislo_jednaci,
            d.datum_vzniku,
            d.datum_vyrizeni,
            d.stav,
            d.owner_user_id,
            d.owner_orgunit_id
        FROM dokument d
        WHERE d.id = ?
          AND d.nazev LIKE 'fa č. %'
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->close();
        send_error(404, 'Faktura nenalezena');
    }
    
    $faktura = $result->fetch_assoc();
    $stmt->close();
    
    // Získat přílohy
    $sql_prilohy = "
        SELECT 
            f.id as file_id,
            f.real_name,
            f.real_path,
            f.mime_type,
            f.size,
            ROUND(f.size / 1024, 2) as size_kb,
            dtf.dokument_id,
            dtf.date_added
        FROM dokument_to_file dtf
        INNER JOIN file f ON dtf.file_id = f.id
        WHERE dtf.dokument_id = ?
          AND dtf.active = 1
        ORDER BY dtf.date_added ASC
    ";
    
    $stmt_prilohy = $conn->prepare($sql_prilohy);
    $stmt_prilohy->bind_param('i', $id);
    $stmt_prilohy->execute();
    $result_prilohy = $stmt_prilohy->get_result();
    
    $prilohy = array();
    while ($priloha = $result_prilohy->fetch_assoc()) {
        // Přímá URL k souboru (bez přihlášení)
        $direct_url = 'https://spisovka.zachranka.cz/client/' . ltrim($priloha['real_path'], '/');
        
        $prilohy[] = array(
            'file_id' => (int)$priloha['file_id'],
            'filename' => $priloha['real_name'],
            'mime_type' => $priloha['mime_type'],
            'size' => (int)$priloha['size'],
            'size_kb' => (float)$priloha['size_kb'],
            'download_url' => $direct_url,
            'date_added' => $priloha['date_added']
        );
    }
    $stmt_prilohy->close();
    $conn->close();
    
    // Response
    send_response(200, array(
        'status' => 'success',
        'data' => array(
            'dokument_id' => (int)$faktura['dokument_id'],
            'jid' => $faktura['jid'],
            'nazev' => $faktura['nazev'],
            'popis' => $faktura['popis'],
            'cislo_jednaci' => $faktura['cislo_jednaci'],
            'datum_vzniku' => $faktura['datum_vzniku'],
            'datum_vyrizeni' => $faktura['datum_vyrizeni'],
            'stav' => (int)$faktura['stav'],
            'owner_user_id' => (int)$faktura['owner_user_id'],
            'owner_orgunit_id' => $faktura['owner_orgunit_id'] ? (int)$faktura['owner_orgunit_id'] : null,
            'pocet_priloh' => count($prilohy),
            'prilohy' => $prilohy
        )
    ));
}

// ============================================================
// ENDPOINT: GET /api.eeo/spisovka.php/proxy-pdf
// Proxy pro stažení PDF ze spisovky s CORS hlavičkami
// Parametry: dokument_id, file_id
// ============================================================
if ($endpoint === 'proxy-pdf' && $request_method === 'GET') {
    
    $dokument_id = isset($_GET['dokument_id']) ? (int)$_GET['dokument_id'] : 0;
    $file_id = isset($_GET['file_id']) ? (int)$_GET['file_id'] : 0;
    
    if ($dokument_id <= 0 || $file_id <= 0) {
        send_error(400, 'Chybí povinné parametry: dokument_id, file_id');
    }
    
    // Sestavení URL pro stažení ze spisovky
    $spisovka_url = "https://spisovka.zachranka.cz/dokumenty/{$dokument_id}/download?file={$file_id}";
    
    // Použití file_get_contents() místo cURL (cURL extension není nainstalována)
    $context = stream_context_create(array(
        'http' => array(
            'method' => 'GET',
            'timeout' => 30,
            'follow_location' => 1,
            'ignore_errors' => true
        ),
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false
        )
    ));
    
    // Stažení souboru
    $body = @file_get_contents($spisovka_url, false, $context);
    
    if ($body === false) {
        send_error(500, 'Chyba při stahování souboru ze spisovky');
    }
    
    // Získání HTTP response code z $http_response_header (automatická proměnná)
    $http_code = 200;
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $header_line) {
            if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $header_line, $matches)) {
                $http_code = (int)$matches[1];
                break;
            }
        }
    }
    
    if ($http_code !== 200) {
        send_error($http_code, 'Soubor nebyl nalezen ve spisovce');
    }
    
    // Parsování content-type z hlaviček
    $content_type = 'application/octet-stream';
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $header_line) {
            if (preg_match('/^Content-Type:\s*([^\r\n]+)/i', $header_line, $matches)) {
                $content_type = trim($matches[1]);
                break;
            }
        }
    }
    
    // Odeslání souboru s CORS hlavičkami (Apache je přidá automaticky)
    header("Content-Type: {$content_type}");
    header("Content-Length: " . strlen($body));
    header("Content-Disposition: inline");
    
    echo $body;
    exit;
}

// ============================================================
// ENDPOINT: GET /api.eeo/spisovka.php/count-today
// Vrátí počet faktur za dnešní den
// ============================================================
if ($endpoint === 'count-today' && $request_method === 'GET') {
    
    // Připojení k databázi
    $conn = new mysqli(
        $spisovka_config['host'],
        $spisovka_config['username'],
        $spisovka_config['password'],
        $spisovka_config['database']
    );
    
    if ($conn->connect_error) {
        send_error(500, 'Chyba připojení k databázi spisovka350: ' . $conn->connect_error);
    }
    
    $conn->set_charset('utf8');
    
    // Dnešní datum
    $today = date('Y-m-d');
    
    // SQL dotaz - počet faktur za dnešní den
    $sql = "
        SELECT COUNT(*) as count
        FROM dokument
        WHERE nazev LIKE 'fa č. %'
          AND DATE(datum_vzniku) = ?
    ";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        $conn->close();
        send_error(500, 'Chyba přípravy SQL dotazu: ' . $conn->error);
    }
    
    $stmt->bind_param('s', $today);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    $count = (int)$row['count'];
    
    $stmt->close();
    $conn->close();
    
    send_response(200, array(
        'status' => 'success',
        'count' => $count,
        'date' => $today
    ));
}

// ============================================================
// ENDPOINT: GET /api.eeo/spisovka.php/proxy-txt?url=...
// Proxy pro načtení TXT souborů ze spisovky (řešení CORS)
// ============================================================
if ($endpoint === 'proxy-txt' && $request_method === 'GET') {
    
    if (!isset($_GET['url'])) {
        send_error(400, 'Chybí parametr url');
    }
    
    $target_url = $_GET['url'];
    
    // Bezpečnostní kontrola - povolit pouze spisovka URLs
    if (strpos($target_url, '10.1.1.253') === false) {
        send_error(403, 'Nepovolená URL');
    }
    
    // Stáhnout soubor
    $context = stream_context_create(array(
        'http' => array(
            'timeout' => 30,
            'ignore_errors' => true
        ),
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false
        )
    ));
    
    $body = @file_get_contents($target_url, false, $context);
    
    if ($body === false) {
        send_error(500, 'Chyba při stahování souboru ze spisovky');
    }
    
    // Získání HTTP response code
    $http_code = 200;
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $header_line) {
            if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $header_line, $matches)) {
                $http_code = (int)$matches[1];
                break;
            }
        }
    }
    
    if ($http_code !== 200) {
        send_error($http_code, 'Soubor nebyl nalezen ve spisovce');
    }
    
    // ✅ Automatická detekce kódování (s fallbackem pro systémy bez mbstring)
    $detected_encoding = null;
    if (function_exists('mb_detect_encoding')) {
        $detected_encoding = mb_detect_encoding($body, ['UTF-8', 'ISO-8859-2', 'ASCII'], true);
    } else {
        // Fallback: jednoduchá heuristika bez mbstring
        if (preg_match('//u', $body)) {
            $detected_encoding = 'UTF-8'; // validní UTF-8
        } else {
            $detected_encoding = 'ISO-8859-2'; // předpokládáme ISO-8859-2
        }
    }
    
    // Pokud není UTF-8, konvertovat
    if ($detected_encoding && $detected_encoding !== 'UTF-8') {
        $body = iconv($detected_encoding, 'UTF-8//IGNORE', $body);
    } elseif (!$detected_encoding) {
        // Fallback - pokud detekce selhala, zkusit ISO-8859-2 (čeština)
        $body = iconv('ISO-8859-2', 'UTF-8//IGNORE', $body);
    }
    
    // Odeslat soubor jako plain text s UTF-8
    header("Content-Type: text/plain; charset=utf-8");
    header("Content-Length: " . strlen($body));
    header("X-Original-Encoding: " . ($detected_encoding ?: 'ISO-8859-2'));
    
    echo $body;
    exit;
}

// ============================================================
// ENDPOINT: GET /api.eeo/spisovka.php/proxy-file?url=...
// Proxy pro stažení libovolných souborů ze spisovky (řešení CORS pro drag & drop)
// ============================================================
if ($endpoint === 'proxy-file' && $request_method === 'GET') {
    
    if (!isset($_GET['url'])) {
        send_error(400, 'Chybí parametr url');
    }
    
    $target_url = $_GET['url'];
    
    // Bezpečnostní kontrola - povolit pouze spisovka URLs
    if (strpos($target_url, '10.1.1.253') === false) {
        send_error(403, 'Nepovolená URL');
    }
    
    // Stáhnout soubor
    $context = stream_context_create(array(
        'http' => array(
            'timeout' => 30,
            'ignore_errors' => true
        ),
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false
        )
    ));
    
    $body = @file_get_contents($target_url, false, $context);
    
    if ($body === false) {
        send_error(500, 'Chyba při stahování souboru ze spisovky');
    }
    
    // Získání HTTP response code
    $http_code = 200;
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $header_line) {
            if (preg_match('/^HTTP\/\d\.\d\s+(\d+)/', $header_line, $matches)) {
                $http_code = (int)$matches[1];
                break;
            }
        }
    }
    
    if ($http_code !== 200) {
        send_error($http_code, 'Soubor nebyl nalezen ve spisovce');
    }
    
    // Parsování content-type a filename z hlaviček
    $content_type = 'application/octet-stream';
    $original_filename = null;
    
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $header_line) {
            // Content-Type
            if (preg_match('/^Content-Type:\s*([^\r\n]+)/i', $header_line, $matches)) {
                $content_type = trim($matches[1]);
            }
            // Content-Disposition (původní název souboru)
            if (preg_match('/^Content-Disposition:.*filename[*]?=(["\']?)([^"\'\r\n]+)\1/i', $header_line, $matches)) {
                $original_filename = trim($matches[2]);
                // Dekódování URL-encoded názvu (např. filename*=UTF-8''nazev.pdf)
                if (strpos($original_filename, "UTF-8''") === 0) {
                    $original_filename = urldecode(substr($original_filename, 7));
                }
            }
        }
    }
    
    // ✅ Pro textové soubory provést detekci a konverzi kódování
    $is_text = (strpos($content_type, 'text/') === 0) || 
               ($original_filename && preg_match('/\.(txt|log|csv)$/i', $original_filename));
    
    if ($is_text) {
        // Automatická detekce kódování (s fallbackem pro systémy bez mbstring)
        $detected_encoding = null;
        if (function_exists('mb_detect_encoding')) {
            $detected_encoding = mb_detect_encoding($body, ['UTF-8', 'ISO-8859-2', 'ASCII'], true);
        } else {
            // Fallback: jednoduchá heuristika bez mbstring
            if (preg_match('//u', $body)) {
                $detected_encoding = 'UTF-8'; // validní UTF-8
            } else {
                $detected_encoding = 'ISO-8859-2'; // předpokládáme ISO-8859-2
            }
        }
        
        // Pokud není UTF-8, konvertovat
        if ($detected_encoding && $detected_encoding !== 'UTF-8') {
            $body = iconv($detected_encoding, 'UTF-8//IGNORE', $body);
        } elseif (!$detected_encoding) {
            // Fallback - pokud detekce selhala, zkusit ISO-8859-2
            $body = iconv('ISO-8859-2', 'UTF-8//IGNORE', $body);
        }
        
        // Vždy vrátit jako UTF-8
        $content_type = 'text/plain; charset=utf-8';
        header("X-Original-Encoding: " . ($detected_encoding ?: 'ISO-8859-2'));
    }
    
    // Odeslat soubor s původním názvem pokud je k dispozici
    header("Content-Type: {$content_type}");
    header("Content-Length: " . strlen($body));
    
    if ($original_filename) {
        // ✅ Předat původní název souboru klientovi
        header("X-Original-Filename: " . $original_filename);
        header("Content-Disposition: inline; filename=\"" . $original_filename . "\"");
    } else {
        header("Content-Disposition: inline");
    }
    
    echo $body;
    exit;
}

// ============================================================
// Neznámý endpoint
// ============================================================
send_error(404, 'Neznámý endpoint. Dostupné: /faktury, /faktura?id=X, /proxy-pdf?dokument_id=X&file_id=Y, /proxy-txt?url=..., /proxy-file?url=..., /count-today');

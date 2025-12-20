<?php
// TEMPORARY DEBUG - enable error reporting to see 500 error details
ini_set('display_errors', 0);
ini_set('display_startup_errors', 1); 
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/php_errors.log');
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);

// CORS headers are handled by Apache - do not send them from PHP to avoid duplication
header("Content-Type: application/json; charset=utf-8");

// Preflight request handling: respond OK to OPTIONS early
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Some browsers expect HTTP 200 with CORS headers for preflight
    http_response_code(200);
    exit;
}

define('VERSION', 'v2025.03_25');

// ============ JMENINY - DATA PRO ENDPOINT ============
function cz_get_namedays_list() {
    return array(
        // LEDEN
        '1.1.' => 'Nový rok', '2.1.' => 'Karina', '3.1.' => 'Radmila', '4.1.' => 'Diana', '5.1.' => 'Dalimil',
        '6.1.' => 'Tři králové', '7.1.' => 'Vilma', '8.1.' => 'Čestmír', '9.1.' => 'Vladan', '10.1.' => 'Břetislav',
        '11.1.' => 'Bohdana', '12.1.' => 'Pravoslav', '13.1.' => 'Edita', '14.1.' => 'Radovan', '15.1.' => 'Alice',
        '16.1.' => 'Ctirad', '17.1.' => 'Drahoslav', '18.1.' => 'Vladislav', '19.1.' => 'Doubravka', '20.1.' => 'Ilona',
        '21.1.' => 'Běla', '22.1.' => 'Slavomír', '23.1.' => 'Zdeněk', '24.1.' => 'Milena', '25.1.' => 'Miloš',
        '26.1.' => 'Zora', '27.1.' => 'Ingrid', '28.1.' => 'Otýlie', '29.1.' => 'Zdislava', '30.1.' => 'Robin', '31.1.' => 'Marika',

        // ÚNOR
        '1.2.' => 'Hynek', '2.2.' => 'Nela', '3.2.' => 'Blažej', '4.2.' => 'Jarmila', '5.2.' => 'Dobromila',
        '6.2.' => 'Vanda', '7.2.' => 'Veronika', '8.2.' => 'Milada', '9.2.' => 'Apolena', '10.2.' => 'Mojmír',
        '11.2.' => 'Božena', '12.2.' => 'Slavěna', '13.2.' => 'Věnceslav', '14.2.' => 'Valentýn', '15.2.' => 'Jiřina',
        '16.2.' => 'Ljuba', '17.2.' => 'Miloslava', '18.2.' => 'Gizela', '19.2.' => 'Patrik', '20.2.' => 'Oldřich',
        '21.2.' => 'Lenka', '22.2.' => 'Petr', '23.2.' => 'Svatopluk', '24.2.' => 'Matěj', '25.2.' => 'Liliana',
        '26.2.' => 'Dorota', '27.2.' => 'Alexandr', '28.2.' => 'Lumír', '29.2.' => 'Horymír',

        // BŘEZEN
        '1.3.' => 'Bedřich', '2.3.' => 'Anežka', '3.3.' => 'Kamil', '4.3.' => 'Stela', '5.3.' => 'Kazimír',
        '6.3.' => 'Miroslav', '7.3.' => 'Tomáš', '8.3.' => 'Gabriela', '9.3.' => 'Františka', '10.3.' => 'Viktorie',
        '11.3.' => 'Anděla', '12.3.' => 'Řehoř', '13.3.' => 'Růžena', '14.3.' => 'Rút a Matylda', '15.3.' => 'Ida',
        '16.3.' => 'Elena a Herbert', '17.3.' => 'Vlastimil', '18.3.' => 'Eduard', '19.3.' => 'Josef', '20.3.' => 'Světlana',
        '21.3.' => 'Radek', '22.3.' => 'Leona', '23.3.' => 'Ivona', '24.3.' => 'Gabriel', '25.3.' => 'Marián',
        '26.3.' => 'Emanuel', '27.3.' => 'Dita', '28.3.' => 'Soňa', '29.3.' => 'Taťána', '30.3.' => 'Arnošt', '31.3.' => 'Kvido',

        // DUBEN
        '1.4.' => 'Hugo', '2.4.' => 'Erika', '3.4.' => 'Richard', '4.4.' => 'Ivana', '5.4.' => 'Miroslava',
        '6.4.' => 'Vendula', '7.4.' => 'Heřman a Hermína', '8.4.' => 'Ema', '9.4.' => 'Dušan', '10.4.' => 'Darja',
        '11.4.' => 'Izabela', '12.4.' => 'Julius', '13.4.' => 'Aleš', '14.4.' => 'Vincenc', '15.4.' => 'Anastázie',
        '16.4.' => 'Irena', '17.4.' => 'Rudolf', '18.4.' => 'Valérie', '19.4.' => 'Rostislav', '20.4.' => 'Marcela',
        '21.4.' => 'Alexandra', '22.4.' => 'Evženie', '23.4.' => 'Vojtěch', '24.4.' => 'Jiří', '25.4.' => 'Marek',
        '26.4.' => 'Oto', '27.4.' => 'Jaroslav', '28.4.' => 'Vlastislav', '29.4.' => 'Robert', '30.4.' => 'Blahoslav',

        // KVĚTEN
        '1.5.' => 'Svátek práce', '2.5.' => 'Zikmund', '3.5.' => 'Alexej', '4.5.' => 'Květoslav', '5.5.' => 'Klaudie',
        '6.5.' => 'Radoslav', '7.5.' => 'Stanislav', '8.5.' => 'Den vítězství', '9.5.' => 'Ctibor', '10.5.' => 'Blažena',
        '11.5.' => 'Svatava', '12.5.' => 'Pankrác', '13.5.' => 'Servác', '14.5.' => 'Bonifác', '15.5.' => 'Žofie',
        '16.5.' => 'Přemysl', '17.5.' => 'Aneta', '18.5.' => 'Nataša', '19.5.' => 'Ivo', '20.5.' => 'Zbyšek',
        '21.5.' => 'Monika', '22.5.' => 'Emil', '23.5.' => 'Vladimír', '24.5.' => 'Jana', '25.5.' => 'Viola',
        '26.5.' => 'Filip', '27.5.' => 'Valdemar', '28.5.' => 'Vilém', '29.5.' => 'Maxmilián', '30.5.' => 'Ferdinand', '31.5.' => 'Kamila',

        // ČERVEN
        '1.6.' => 'Laura', '2.6.' => 'Jarmil', '3.6.' => 'Tamara', '4.6.' => 'Dalibor', '5.6.' => 'Dobroslav',
        '6.6.' => 'Norbert', '7.6.' => 'Iveta a Slavoj', '8.6.' => 'Medard', '9.6.' => 'Stanislava', '10.6.' => 'Gita',
        '11.6.' => 'Bruno', '12.6.' => 'Antonie', '13.6.' => 'Antonín', '14.6.' => 'Roland', '15.6.' => 'Vít',
        '16.6.' => 'Zbyněk', '17.6.' => 'Adolf', '18.6.' => 'Milan', '19.6.' => 'Leoš', '20.6.' => 'Květa',
        '21.6.' => 'Alois', '22.6.' => 'Pavla', '23.6.' => 'Zdeňka', '24.6.' => 'Jan', '25.6.' => 'Ivan',
        '26.6.' => 'Adriana', '27.6.' => 'Ladislav', '28.6.' => 'Lubomír', '29.6.' => 'Petr a Pavel', '30.6.' => 'Šárka',

        // ČERVENEC
        '1.7.' => 'Jaroslava', '2.7.' => 'Patricie', '3.7.' => 'Radomír', '4.7.' => 'Prokop', '5.7.' => 'Cyril a Metoděj',
        '6.7.' => 'Mistr Jan Hus', '7.7.' => 'Bohuslava', '8.7.' => 'Nora', '9.7.' => 'Drahoslava', '10.7.' => 'Libuše a Amálie',
        '11.7.' => 'Olga', '12.7.' => 'Bořek', '13.7.' => 'Markéta', '14.7.' => 'Karolína', '15.7.' => 'Jindřich',
        '16.7.' => 'Luboš', '17.7.' => 'Martina', '18.7.' => 'Drahomíra', '19.7.' => 'Čeněk', '20.7.' => 'Ilja',
        '21.7.' => 'Vítězslav', '22.7.' => 'Magdaléna', '23.7.' => 'Libor', '24.7.' => 'Kristýna', '25.7.' => 'Jakub',
        '26.7.' => 'Anna', '27.7.' => 'Věroslav', '28.7.' => 'Viktor', '29.7.' => 'Marta', '30.7.' => 'Bořivoj', '31.7.' => 'Ignác',

        // SRPEN
        '1.8.' => 'Oskar', '2.8.' => 'Gustav', '3.8.' => 'Miluše', '4.8.' => 'Dominik', '5.8.' => 'Kristián',
        '6.8.' => 'Oldřiška', '7.8.' => 'Lada', '8.8.' => 'Soběslav', '9.8.' => 'Roman', '10.8.' => 'Vavřinec',
        '11.8.' => 'Zuzana', '12.8.' => 'Klára', '13.8.' => 'Alena', '14.8.' => 'Alan', '15.8.' => 'Hana',
        '16.8.' => 'Jáchym', '17.8.' => 'Petra', '18.8.' => 'Helena', '19.8.' => 'Ludvík', '20.8.' => 'Bernard',
        '21.8.' => 'Johana', '22.8.' => 'Bohuslav', '23.8.' => 'Sandra', '24.8.' => 'Bartoloměj', '25.8.' => 'Radim',
        '26.8.' => 'Luděk', '27.8.' => 'Otakar', '28.8.' => 'Augustýn', '29.8.' => 'Evelína', '30.8.' => 'Vladěna', '31.8.' => 'Pavlína',

        // ZÁŘÍ
        '1.9.' => 'Linda a Samuel', '2.9.' => 'Adéla', '3.9.' => 'Bronislav', '4.9.' => 'Jindřiška', '5.9.' => 'Boris',
        '6.9.' => 'Boleslav', '7.9.' => 'Regína', '8.9.' => 'Mariana', '9.9.' => 'Daniela', '10.9.' => 'Irma',
        '11.9.' => 'Denisa', '12.9.' => 'Marie', '13.9.' => 'Lubor', '14.9.' => 'Radka', '15.9.' => 'Jolana',
        '16.9.' => 'Ludmila', '17.9.' => 'Naděžda', '18.9.' => 'Kryštof', '19.9.' => 'Zita', '20.9.' => 'Oleg',
        '21.9.' => 'Matouš', '22.9.' => 'Darina', '23.9.' => 'Berta', '24.9.' => 'Jaromír', '25.9.' => 'Zlata',
        '26.9.' => 'Andrea', '27.9.' => 'Jonáš', '28.9.' => 'Václav', '29.9.' => 'Michal', '30.9.' => 'Jeroným',

        // ŘÍJEN
        '1.10.' => 'Igor', '2.10.' => 'Olívie a Oliver', '3.10.' => 'Bohumil', '4.10.' => 'František', '5.10.' => 'Eliška',
        '6.10.' => 'Hanuš', '7.10.' => 'Justýna', '8.10.' => 'Věra', '9.10.' => 'Štefan a Sára', '10.10.' => 'Marina',
        '11.10.' => 'Andrej', '12.10.' => 'Marcel', '13.10.' => 'Renáta', '14.10.' => 'Agáta', '15.10.' => 'Tereza',
        '16.10.' => 'Havel', '17.10.' => 'Hedvika', '18.10.' => 'Lukáš', '19.10.' => 'Michaela', '20.10.' => 'Vendelín',
        '21.10.' => 'Brigita', '22.10.' => 'Sabina', '23.10.' => 'Teodor', '24.10.' => 'Nina', '25.10.' => 'Beáta',
        '26.10.' => 'Erik', '27.10.' => 'Šarlota a Zoe', '28.10.' => 'Alfréd', '29.10.' => 'Silvie', '30.10.' => 'Tadeáš', '31.10.' => 'Štěpánka',

        // LISTOPAD
        '1.11.' => 'Felix', '2.11.' => 'Památka zesnulých', '3.11.' => 'Hubert', '4.11.' => 'Karel', '5.11.' => 'Miriam',
        '6.11.' => 'Valerie', '7.11.' => 'Saskie', '8.11.' => 'Bohumír', '9.11.' => 'Bohdan', '10.11.' => 'Evžen',
        '11.11.' => 'Martin', '12.11.' => 'Benedikt', '13.11.' => 'Tibor', '14.11.' => 'Sáva', '15.11.' => 'Leopold',
        '16.11.' => 'Otmar', '17.11.' => 'Mahulena', '18.11.' => 'Romana', '19.11.' => 'Alžběta', '20.11.' => 'Nikola',
        '21.11.' => 'Albert', '22.11.' => 'Cecílie', '23.11.' => 'Klement', '24.11.' => 'Emílie', '25.11.' => 'Kateřina',
        '26.11.' => 'Artur', '27.11.' => 'Xenie', '28.11.' => 'René', '29.11.' => 'Zina', '30.11.' => 'Ondřej',

        // PROSINEC
        '1.12.' => 'Iva', '2.12.' => 'Blanka', '3.12.' => 'Svatoslav', '4.12.' => 'Barbora', '5.12.' => 'Jitka',
        '6.12.' => 'Mikuláš', '7.12.' => 'Ambrož a Benjamín', '8.12.' => 'Květoslava', '9.12.' => 'Vratislav', '10.12.' => 'Julie',
        '11.12.' => 'Dana', '12.12.' => 'Simona', '13.12.' => 'Lucie', '14.12.' => 'Lýdie', '15.12.' => 'Radana',
        '16.12.' => 'Albína', '17.12.' => 'Daniel', '18.12.' => 'Miloslav', '19.12.' => 'Ester', '20.12.' => 'Dagmar',
        '21.12.' => 'Natálie', '22.12.' => 'Šimon', '23.12.' => 'Vlasta', '24.12.' => 'Adam a Eva', '25.12.' => '1. svátek vánoční',
        '26.12.' => 'Štěpán', '27.12.' => 'Žaneta', '28.12.' => 'Bohumila', '29.12.' => 'Judita', '30.12.' => 'David', '31.12.' => 'Silvestr'
    );
}

// DATABASE TABLE NAMES - LP ČERPÁNÍ
define('TBL_OBJEDNAVKY', '25a_objednavky');
define('TBL_OBJEDNAVKY_POLOZKY', '25a_objednavky_polozky');
define('TBL_POKLADNI_KNIHY', '25a_pokladni_knihy');
define('TBL_POKLADNI_POLOZKY', '25a_pokladni_polozky');
define('TBL_LP_MASTER', '25_limitovane_prisliby');
define('TBL_LP_CERPANI', '25_limitovane_prisliby_cerpani');

// DATABASE TABLE NAMES - CORE ENTITIES
define('TBL_UZIVATELE', '25_uzivatele');
// define('TBL_OBJEDNAVKY_LEGACY', '25_objednavky'); // DEPRECATED - nepoužívá se
define('TBL_SMLOUVY', '25_smlouvy');
define('TBL_FAKTURY', '25a_objednavky_faktury');
define('TBL_DODAVATELE', '25_dodavatele');

// DATABASE TABLE NAMES - ČÍSELNÍKY
define('TBL_POZICE', '25_pozice');
define('TBL_CISELNIK_STAVY', '25_ciselnik_stavy');
define('TBL_USEKY', '25_useky');

// Načtení konfigurace a dotazů
$_config = require __DIR__ . '/' . VERSION . '/lib/dbconfig.php';
$config = $_config['mysql'];
require __DIR__ . '/' . VERSION . '/lib/queries.php';
require __DIR__ . '/' . VERSION . '/lib/handlers.php';
require_once __DIR__ . '/v2025.03_25/lib/orderHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/orderAttachmentHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/invoiceHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/invoiceAttachmentHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/invoiceAttachmentHandlersOrderV2.php';
require_once __DIR__ . '/v2025.03_25/lib/notificationHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/notificationTemplatesHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/ciselnikyHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/sablonaDocxHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/docxOrderDataHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/importHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/hierarchyHandlers.php';

// ORDER V2 - Standardized API endpoints
require_once __DIR__ . '/v2025.03_25/lib/orderQueries.php';
require_once __DIR__ . '/v2025.03_25/lib/orderV2Endpoints.php';
require_once __DIR__ . '/v2025.03_25/lib/orderV2AttachmentHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/orderV2InvoiceHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/orderV2PolozkyLPHandlers.php';

// CASHBOOK - Pokladní knihy
require_once __DIR__ . '/v2025.03_25/lib/cashbookHandlers.php';
require_once __DIR__ . '/v2025.03_25/lib/cashbookHandlersExtended.php';
require_once __DIR__ . '/v2025.03_25/lib/cashboxByPeriodHandler.php';

// USER DETAIL - User detail with statistics
require_once __DIR__ . '/v2025.03_25/lib/userDetailHandlers.php';

// USER STATS - User statistics for mobile dashboard
require_once __DIR__ . '/v2025.03_25/lib/userStatsHandlers.php';

// USER SETTINGS - User settings (filters, tiles, export)
require_once __DIR__ . '/v2025.03_25/lib/userSettingsHandlers.php';

// UNIVERSAL SEARCH - Search across multiple tables
require_once __DIR__ . '/v2025.03_25/lib/searchHandlers.php';

// REPORTS - Order V2 Reports
require_once __DIR__ . '/v2025.03_25/lib/reportsHandlers.php';

// SPISOVKA ZPRACOVANI - Tracking zpracovaných dokumentů ze Spisovka InBox
require_once __DIR__ . '/v2025.03_25/lib/spisovkaZpracovaniEndpoints.php';

// Routing endpointů
$request_uri = $_SERVER['REQUEST_URI'];
$request_method = $_SERVER['REQUEST_METHOD'];

// Parse input data - support both JSON and Form data
$raw_input = file_get_contents('php://input');
$input = json_decode($raw_input, true);

// If JSON parsing failed or no JSON data, use $_POST (form data)
if (json_last_error() !== JSON_ERROR_NONE || empty($input)) {
    $input = $_POST;
}

// Debug: log what we received
error_log("API Input parsing - Content-Type: " . (isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'unknown'));
error_log("API Input data: " . json_encode($input));

// Extrakce endpointu - priorita X-Endpoint header, pak URI
$endpoint = '';
if (isset($_SERVER['HTTP_X_ENDPOINT'])) {
    $endpoint = $_SERVER['HTTP_X_ENDPOINT'];
    error_log("Using X-Endpoint header: $endpoint");
} else {
    // Normalize request_uri - remove duplicate slashes
    $normalized_uri = preg_replace('#/+#', '/', $request_uri);
    
    if (preg_match('~/(api\.eeo/)?(.+?)(?:\?.*)?$~', $normalized_uri, $matches)) {
        $endpoint = rtrim($matches[2], '/');
        error_log("Using URI endpoint: $endpoint (normalized from: $request_uri)");
    }
}

// DEBUG: zobrazíme, co se rozpoznává (pouze DEV mode)
if (defined('DEBUG_MODE') && DEBUG_MODE) {
    error_log("URI: $request_uri, Endpoint: $endpoint, Method: $request_method, X-Endpoint: " . (isset($_SERVER['HTTP_X_ENDPOINT']) ? $_SERVER['HTTP_X_ENDPOINT'] : 'not set'));
}

// 🔍 DEBUG pro order attachments download (pouze DEV mode)
if (defined('DEBUG_MODE') && DEBUG_MODE && strpos($endpoint, 'attachments') !== false && strpos($endpoint, 'download') !== false) {
    header('X-Debug-Endpoint: ' . $endpoint);
    header('X-Debug-Method: ' . $request_method);
    header('X-Debug-Raw-Input-Length: ' . strlen($raw_input));
    error_log("🔍 ATTACHMENT DOWNLOAD REQUEST DETECTED:");
    error_log("  Raw endpoint: [$endpoint]");
    error_log("  Length: " . strlen($endpoint));
    error_log("  Request method: $request_method");
    error_log("  Raw input length: " . strlen($raw_input));
}

// 🔥 SPECIAL DEBUG ENDPOINT - pro testování routingu
if ($endpoint === 'debug-routing') {
    echo json_encode(array(
        'status' => 'ok',
        'debug_info' => array(
            'REQUEST_URI' => $_SERVER['REQUEST_URI'],
            'HTTP_X_ENDPOINT' => isset($_SERVER['HTTP_X_ENDPOINT']) ? $_SERVER['HTTP_X_ENDPOINT'] : null,
            'extracted_endpoint' => $endpoint,
            'request_method' => $request_method,
            'matches_from_regex' => isset($matches) ? $matches : null,
            'raw_input' => $input
        )
    ));
    exit;
}

// 🔥 TEST INVOICE ATTACHMENTS DEBUG
if ($endpoint === 'test-invoice-debug') {
    echo json_encode(array(
        'status' => 'ok', 
        'message' => 'Test endpoint works',
        'functions' => array(
            'get_invoices_table_name' => function_exists('get_invoices_table_name'),
            'get_invoice_attachments_table_name' => function_exists('get_invoice_attachments_table_name'),
            'handle_order_v2_list_invoice_attachments' => function_exists('handle_order_v2_list_invoice_attachments'),
            'get_db' => function_exists('get_db'),
            'verify_token' => function_exists('verify_token')
        ),
        'table_names' => array(
            'invoices' => function_exists('get_invoices_table_name') ? get_invoices_table_name() : 'FUNCTION_NOT_EXISTS',
            'invoice_attachments' => function_exists('get_invoice_attachments_table_name') ? get_invoice_attachments_table_name() : 'FUNCTION_NOT_EXISTS'
        )
    ));
    exit;
}

// === JMENINY ENDPOINT - GET /api.eeo/nameday?date=29.11. ===
if ($endpoint === 'nameday') {
    if ($request_method === 'GET') {
        $date_param = isset($_GET['date']) ? $_GET['date'] : date('j.n.');
        $namedays = cz_get_namedays_list();
        
        if (isset($namedays[$date_param])) {
            echo json_encode(array(
                'status' => 'ok',
                'date' => $date_param,
                'name' => $namedays[$date_param]
            ));
        } else {
            http_response_code(404);
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Datum nenalezeno',
                'date' => $date_param
            ));
        }
    } else {
        http_response_code(405);
        echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
    }
    exit;
}

// Debug removed - back to normal operation

// === SUPPORT FOR POST BODY ACTION + OPERATION ROUTING ===
// Pokud endpoint je "api.php" (nebo prázdný) a v POST body je action + operation,
// použijeme tento mechanismus pro routing
if (($endpoint === 'api.php' || $endpoint === '' || $endpoint === 'api.eeo') && isset($input['action'])) {
    $action = $input['action'];
    $operation = isset($input['operation']) ? $input['operation'] : '';
    
    // USER DETAIL WITH STATISTICS
    if ($action === 'user' && $operation === 'detail') {
        handle_user_detail_with_statistics($input, $config, $queries);
        exit;
    }
}

// Create PDO connection for handlers that need it
try {
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password'],
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        )
    );
} catch (PDOException $e) {
    error_log("PDO connection failed: " . $e->getMessage());
    $pdo = null;
}

// Routing podle endpointu
switch ($endpoint) {
    case 'login':
    case 'user/login':
        if ($request_method === 'POST') {
            handle_login($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'user/detail':
        if ($request_method === 'POST') {
            handle_user_detail($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'user/profile':
        if ($request_method === 'POST') {
            require_once __DIR__ . '/v2025.03_25/lib/userProfileHandlers.php';
            handle_user_profile($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'user/settings':
        if ($request_method === 'GET' || $request_method === 'POST') {
            if ($request_method === 'GET') {
                handle_user_settings_get($input, $config, $queries);
            } else {
                handle_user_settings_save($input, $config, $queries);
            }
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'user/change-password':
        if ($request_method === 'POST') {
            handle_user_change_password($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    
    case 'user/active':
        if ($request_method === 'POST') {
            handle_user_active($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    
    case 'user/active-with-stats':
        if ($request_method === 'POST') {
            handle_user_active_with_stats($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    
    case 'user/update-activity':
        if ($request_method === 'POST') {
            handle_user_update_activity($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'orders/create':
        if ($request_method === 'POST') {
            handle_orders_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'orders/next-number':
        if ($request_method === 'POST') {
            handle_orders_next_number($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'lokality':
        if ($request_method === 'POST') {
            handle_lokality($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;

    // === ČÍSELNÍKY API ENDPOINTY ===
    case 'lokality/list':
        if ($request_method === 'POST') {
            handle_lokality_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'lokality/detail':
        if ($request_method === 'POST') {
            handle_lokality_detail($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'lokality/create':
        if ($request_method === 'POST') {
            handle_lokality_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'lokality/update':
        if ($request_method === 'POST') {
            handle_lokality_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'lokality/delete':
        if ($request_method === 'POST') {
            handle_lokality_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'pozice/list':
        if ($request_method === 'POST') {
            handle_pozice_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'pozice/detail':
        if ($request_method === 'POST') {
            handle_pozice_detail($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'pozice/create':
        if ($request_method === 'POST') {
            handle_pozice_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'pozice/update':
        if ($request_method === 'POST') {
            handle_pozice_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'pozice/delete':
        if ($request_method === 'POST') {
            handle_pozice_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'organizace/list':
        if ($request_method === 'POST') {
            handle_organizace_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'organizace/detail':
        if ($request_method === 'POST') {
            handle_organizace_detail($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'organizace/create':
        if ($request_method === 'POST') {
            handle_organizace_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'organizace/update':
        if ($request_method === 'POST') {
            handle_organizace_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'organizace/delete':
        if ($request_method === 'POST') {
            handle_organizace_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'role/list':
        if ($request_method === 'POST') {
            handle_role_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'role/detail':
        if ($request_method === 'POST') {
            handle_role_detail($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'prava/list':
        if ($request_method === 'POST') {
            handle_prava_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'prava/detail':
        if ($request_method === 'POST') {
            handle_prava_detail($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'stavy/list':
        if ($request_method === 'POST') {
            handle_stavy_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'users/approvers':
        if ($request_method === 'POST') {
            handle_users_approvers($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky':
        // Support both GET and POST for ciselniky requests. Clients can POST {"typ":"OBJEDNAVKA"}
        if ($request_method === 'GET' || $request_method === 'POST') {
            handle_ciselniky($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'users/list':
        if ($request_method === 'POST') {
            handle_users_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;

    // === USER MANAGEMENT API ENDPOINTS ===
    case 'users/create':
        require_once 'v2025.03_25/lib/userHandlers.php';
        if ($request_method === 'POST') {
            handle_users_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'users/update':
        require_once 'v2025.03_25/lib/userHandlers.php';
        if ($request_method === 'POST') {
            handle_users_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'users/partial-update':
    case 'users/partial_update':  // Podpora obou variant (pomlčka i podtržítko)
        require_once 'v2025.03_25/lib/userHandlers.php';
        if ($request_method === 'POST') {
            handle_users_partial_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'users/deactivate':
        require_once 'v2025.03_25/lib/userHandlers.php';
        if ($request_method === 'POST') {
            handle_users_deactivate($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;

    case 'limitovane_prisliby':
        if ($request_method === 'POST') {
            handle_limitovane_prisliby($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'dodavatele/list':
        if ($request_method === 'POST') {
            handle_dodavatele_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'dodavatele/detail':
        if ($request_method === 'POST') {
            handle_dodavatele_detail($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'dodavatele/search-ico':
        if ($request_method === 'POST') {
            handle_dodavatele_search_ico($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'dodavatele/search':
        if ($request_method === 'POST') {
            handle_dodavatele_search($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'dodavatele/search-nazev':
        if ($request_method === 'POST') {
            handle_dodavatele_search_nazev($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'dodavatele/contacts':
        if ($request_method === 'POST') {
            handle_dodavatele_contacts($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;

    case 'dodavatele/create':
        if ($request_method === 'POST') {
            handle_dodavatele_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'dodavatele/update':
        if ($request_method === 'POST') {
            handle_dodavatele_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'dodavatele/update-by-ico':
        if ($request_method === 'POST') {
            handle_dodavatele_update_by_ico($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'dodavatele/delete':
        if ($request_method === 'POST') {
            handle_dodavatele_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'useky/list':
        if ($request_method === 'POST') {
            handle_useky_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'useky/list_hierarchy':
        if ($request_method === 'POST') {
            handle_useky_list_hierarchy($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'useky/detail':
        if ($request_method === 'POST') {
            handle_useky_detail($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'useky/by-zkr':
        if ($request_method === 'POST') {
            handle_useky_by_zkr($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'useky/create':
        if ($request_method === 'POST') {
            handle_useky_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'useky/update':
        if ($request_method === 'POST') {
            handle_useky_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'useky/delete':
        if ($request_method === 'POST') {
            handle_useky_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;

    // ============ HIERARCHIE UŽIVATELŮ ============
    case 'hierarchy/subordinates':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_subordinates($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'hierarchy/superiors':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_superiors($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    case 'hierarchy/add':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_add_relation($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    case 'hierarchy/remove':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_remove_relation($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;

    // ============ ORGANIZAČNÍ HIERARCHIE - NOVÉ ENDPOINTY ============
    case 'hierarchy/users':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_users_list($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/locations':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_locations_list($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/departments':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_departments_list($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/structure':
        // DEPRECATED: Redirect to new API
        if ($request_method === 'POST') {
            $response = handle_hierarchy_profiles_load_structure($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/save':
        // DEPRECATED: Redirect to new API
        if ($request_method === 'POST') {
            $response = handle_hierarchy_profiles_save_structure($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/notification-types':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_notification_types($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    // ==================== GLOBÁLNÍ NASTAVENÍ ====================
    case 'global-settings':
        require_once __DIR__ . '/v2025.03_25/lib/globalSettingsHandlers.php';
        
        if ($request_method === 'POST') {
            handle_global_settings($input, $pdo);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'maintenance-status':
        require_once __DIR__ . '/v2025.03_25/lib/globalSettingsHandlers.php';
        if ($request_method === 'GET') {
            handle_maintenance_status_check($pdo);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'maintenance-message':
        require_once __DIR__ . '/v2025.03_25/lib/globalSettingsHandlers.php';
        if ($request_method === 'POST') {
            handle_maintenance_message($input, $pdo);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/profiles/list':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_profiles_list($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/profiles/create':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_profiles_create($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/profiles/set-active':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_profiles_set_active($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/profiles/toggle-active':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_profiles_toggle_active($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/profiles/delete':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_profiles_delete($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/profiles/save-structure':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_profiles_save_structure($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    
    case 'hierarchy/profiles/load-structure':
        if ($request_method === 'POST') {
            $response = handle_hierarchy_profiles_load_structure($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;

    // ============ ZASTUPOVÁNÍ UŽIVATELŮ ============
    case 'substitution/list':
        if ($request_method === 'POST') {
            $response = handle_substitution_list($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    case 'substitution/create':
        if ($request_method === 'POST') {
            $response = handle_substitution_create($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    case 'substitution/update':
        if ($request_method === 'POST') {
            $response = handle_substitution_update($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    case 'substitution/deactivate':
        if ($request_method === 'POST') {
            $response = handle_substitution_deactivate($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
    case 'substitution/current':
        if ($request_method === 'POST') {
            $response = handle_substitution_current($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;

    // ============ SCHVALOVACÍ PRAVOMOCI ============
    case 'approval/permissions':
        if ($request_method === 'POST') {
            $response = handle_approval_permissions($input, $pdo);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(405);
            echo json_encode(array('error' => 'Method not allowed'));
        }
        break;
        
    // ============ ŠABLONY NOTIFIKACÍ ============
    case 'templates/list':
        if ($request_method === 'POST') {
            handle_templates_select($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'templates/create':
        if ($request_method === 'POST') {
            handle_templates_insert($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'templates/update':
        if ($request_method === 'POST') {
            handle_templates_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'templates/delete':
        if ($request_method === 'POST') {
            handle_templates_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'order/create':
        if ($request_method === 'POST') {
            handle_create_order($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'order/update':
        if ($request_method === 'POST') {
            handle_update_order($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'order/check-number':
        if ($request_method === 'POST') {
            handle_order_check_number($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'orders/list':
        if ($request_method === 'POST') {
            handle_orders_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'orders/list-raw':
        if ($request_method === 'POST') {
            handle_orders_list_raw($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'orders/list-enriched':
        if ($request_method === 'POST') {
            handle_orders_list_enriched($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'order/detail':
        if ($request_method === 'POST') {
            handle_order_detail($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'notify/email':
        if ($request_method === 'POST') {
            handle_notify_email($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'notifications/send-dual':
        if ($request_method === 'POST' || $request_method === 'GET') {
            handle_notifications_send_dual($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
    case 'old/react':
        if ($request_method === 'POST') {
            handle_old_react_action($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    // === ENDPOINTY PRO PŘÍLOHY ===
    case 'attachments/upload':
        if ($request_method === 'POST') {
            handle_upload_attachment($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'attachments/list':
        if ($request_method === 'POST') {
            handle_get_attachments($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'attachments/verify':
        if ($request_method === 'POST') {
            handle_verify_attachments($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'attachments/download':
        if ($request_method === 'POST') {
            handle_download_attachment($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'attachments/delete':
        if ($request_method === 'POST') {
            handle_delete_attachment($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'attachments/deactivate':
        if ($request_method === 'POST') {
            handle_deactivate_attachment($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'attachments/update':
        if ($request_method === 'POST') {
            handle_update_attachment($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    // === TODO/NOTES API ENDPOINTY (Final Design v2025.03_25) ===
    case 'todonotes/load':
        require_once __DIR__ . '/' . VERSION . '/lib/notes_handlers.php';
        if ($request_method === 'POST') {
            handle_todonotes_load($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'todonotes/save':
        require_once __DIR__ . '/' . VERSION . '/lib/notes_handlers.php';
        if ($request_method === 'POST') {
            handle_todonotes_save($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'todonotes/delete':
        require_once __DIR__ . '/' . VERSION . '/lib/notes_handlers.php';
        if ($request_method === 'POST') {
            handle_todonotes_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'todonotes/by-id':
        require_once __DIR__ . '/' . VERSION . '/lib/notes_handlers.php';
        if ($request_method === 'POST') {
            handle_todonotes_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'todonotes/search':
        require_once __DIR__ . '/' . VERSION . '/lib/notes_handlers.php';
        if ($request_method === 'POST') {
            handle_todonotes_search($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'todonotes/with-details':
        require_once __DIR__ . '/' . VERSION . '/lib/notes_handlers.php';
        if ($request_method === 'POST') {
            handle_todonotes_with_details($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'todonotes/recent':
        require_once __DIR__ . '/' . VERSION . '/lib/notes_handlers.php';
        if ($request_method === 'POST') {
            handle_todonotes_recent($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'todonotes/stats':
        require_once __DIR__ . '/' . VERSION . '/lib/notes_handlers.php';
        if ($request_method === 'POST') {
            handle_todonotes_stats($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    // === CHAT SYSTÉM ENDPOINTY ===
    case 'chat/conversations':
        require_once __DIR__ . '/' . VERSION . '/lib/chat_handlers.php';
        if ($request_method === 'POST') {
            handle_chat_conversations_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'chat/messages':
        require_once __DIR__ . '/' . VERSION . '/lib/chat_handlers.php';
        if ($request_method === 'POST') {
            handle_chat_messages_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'chat/messages/new':
        require_once __DIR__ . '/' . VERSION . '/lib/chat_handlers.php';
        if ($request_method === 'POST') {
            handle_chat_messages_new($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'chat/messages/send':
        require_once __DIR__ . '/' . VERSION . '/lib/chat_handlers.php';
        if ($request_method === 'POST') {
            handle_chat_messages_send($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'chat/mentions/unread':
        require_once __DIR__ . '/' . VERSION . '/lib/chat_handlers.php';
        if ($request_method === 'POST') {
            handle_chat_mentions_unread($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'chat/status/update':
        require_once __DIR__ . '/' . VERSION . '/lib/chat_handlers.php';
        if ($request_method === 'POST') {
            handle_chat_status_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'chat/search':
        require_once __DIR__ . '/' . VERSION . '/lib/chat_handlers.php';
        if ($request_method === 'POST') {
            handle_chat_search($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    // === JEDNODUCHÉ LOAD/SAVE ENDPOINTY ===
    case 'load':
        require_once __DIR__ . '/' . VERSION . '/lib/notes_handlers.php';
        if ($request_method === 'POST') {
            handle_simple_load($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'save':
        require_once __DIR__ . '/' . VERSION . '/lib/notes_handlers.php';
        if ($request_method === 'POST') {
            handle_simple_save($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    // === NOVÉ OBJEDNÁVKY API (25a_*) ===
    case 'orders25/list':
        if ($request_method === 'POST') {
            handle_orders25_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/by-id':
        if ($request_method === 'POST') {
            handle_orders25_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/by-user':
        if ($request_method === 'POST') {
            handle_orders25_by_user($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/insert':
        if ($request_method === 'POST') {
            handle_orders25_insert($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/update':
        if ($request_method === 'POST') {
            handle_orders25_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/delete':
        if ($request_method === 'POST') {
            handle_orders25_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/soft-delete':
        if ($request_method === 'POST') {
            handle_orders25_soft_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/import-oldies':
        if ($request_method === 'POST') {
            try {
                $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset=utf8";
                $db = new PDO($dsn, $config['username'], $config['password']);
                $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                $result = handle_orders25_import_oldies($db, $input);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode($result);
                exit; // KRITICKÉ: Zastaví další output, aby nedošlo k přidání null nebo whitespace
            } catch (Exception $e) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode(array(
                    'success' => 'NOK',
                    'error' => 'Chyba připojení k databázi: ' . $e->getMessage()
                ));
                exit;
            }
        } else {
            http_response_code(405);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(array('err' => 'Metoda není povolena'));
            exit;
        }
        break;
        
    case 'orders25/restore':
        if ($request_method === 'POST') {
            handle_orders25_restore($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/next-number':
        if ($request_method === 'POST') {
            handle_orders25_next_number($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/check-number':
        if ($request_method === 'POST') {
            handle_orders25_check_number($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/partial-insert':
        if ($request_method === 'POST') {
            handle_orders25_partial_insert($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/partial-update':
        if ($request_method === 'POST') {
            handle_orders25_partial_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;

    case 'orders25/status-by-id-and-user':
        if ($request_method === 'POST') {
            handle_orders25_status_by_id_and_user($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;

    // === LOCK MANAGEMENT ENDPOINTS ===
    case 'orders25/select-for-edit':
        if ($request_method === 'POST') {
            handle_orders25_select_for_edit($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'orders25/lock':
        if ($request_method === 'POST') {
            handle_orders25_lock($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/unlock':
        if ($request_method === 'POST') {
            handle_orders25_unlock($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;

    // === ATTACHMENT MANAGEMENT ENDPOINTS ===
    case 'orders25/attachments/upload':
        if ($request_method === 'POST') {
            handle_orders25_upload_attachment($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/attachments/list':
        if ($request_method === 'POST') {
            handle_orders25_get_attachments($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/attachments/download':
        if ($request_method === 'POST') {
            handle_orders25_download_attachment($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/attachments/delete':
        if ($request_method === 'POST') {
            handle_orders25_delete_attachment($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/attachments/update':
        if ($request_method === 'POST') {
            handle_orders25_update_attachment($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/attachments/verify':
        if ($request_method === 'POST') {
            handle_orders25_verify_attachments($config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/count-by-user':
        if ($request_method === 'POST') {
            handle_orders25_count_by_user($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;

    // === WORKFLOW TRACKING ENDPOINTS ===
    case 'orders25/send-to-supplier':
        if ($request_method === 'POST') {
            handle_orders25_send_to_supplier($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/cancel-order':
        if ($request_method === 'POST') {
            handle_orders25_cancel_order($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/confirm-acceptance':
        if ($request_method === 'POST') {
            handle_orders25_confirm_acceptance($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/add-invoice':
        if ($request_method === 'POST') {
            handle_orders25_add_invoice($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'orders25/complete-order':
        if ($request_method === 'POST') {
            handle_orders25_complete_order($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;

    // === ORDER V2 - STANDARDIZED API ENDPOINTS ===
    
    // POST /api.eeo/order-v2/list - listing objednavek s filtering (GET deprecated)
    case 'order-v2/list':
        if ($request_method === 'POST') {
            handle_order_v2_list($input, $config, $queries);
        } else if ($request_method === 'GET') {
            // GET method deprecated - return error message
            http_response_code(405);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'GET method not allowed. Use POST method.',
                'deprecated' => 'GET support removed. Migrate to POST.',
                'allowed_methods' => ['POST']
            ));
        } else {
            http_response_code(405);
            echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
        }
        break;
        
    // POST /api.eeo/order-v2/list-enriched - listing objednavek VZDY s enriched daty (GET deprecated)
    case 'order-v2/list-enriched':
        if ($request_method === 'POST') {
            handle_order_v2_list_enriched($input, $config, $queries);
        } else if ($request_method === 'GET') {
            // GET method deprecated - return error message
            http_response_code(405);
            echo json_encode(array(
                'status' => 'error', 
                'message' => 'GET method not allowed. Use POST method.',
                'deprecated' => 'GET support removed. Migrate to POST.',
                'allowed_methods' => ['POST']
            ));
        } else {
            http_response_code(405);
            echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
        }
        break;
        
    // POST /api.eeo/order-v2/create - vytvoreni nove objednavky
    case 'order-v2/create':
        if ($request_method === 'POST') {
            handle_order_v2_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
        }
        break;
        
    // POST /api.eeo/order-v2/next-number - generovani dalsiho cisla objednavky
    case 'order-v2/next-number':
        if ($request_method === 'POST') {
            
            handle_order_v2_next_number($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
        }
        break;
        
    // POST /api.eeo/order-v2/check-number - kontrola dostupnosti cisla objednavky
    case 'order-v2/check-number':
        if ($request_method === 'POST') {
            handle_order_v2_check_number($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
        }
        break;

    // === REPORTS - ORDER V2 REPORTING API ===
    
    // POST /api.eeo/reports/urgent-payments - report faktur s blizici se splatnosti
    case 'reports/urgent-payments':
        if ($request_method === 'POST') {
            handle_report_urgent_payments($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('success' => false, 'error' => array('code' => 'METHOD_NOT_ALLOWED', 'message' => 'Method not allowed')));
        }
        break;

    // === ORDER V2 SPECIALIZED ENDPOINTS ===
    
    // Endpoint musí být před default case kvůli dynamickému routingu
    // Přesun do statického routingu pro jednoznačné parsování

    // === ČÍSELNÍK STAVŮ API (25_ciselnik_stavy) ===
    case 'states25/list':
        if ($request_method === 'POST') {
            handle_states25_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'states25/by-id':
        if ($request_method === 'POST') {
            handle_states25_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'states25/by-type-and-code':
        if ($request_method === 'POST') {
            handle_states25_by_type_and_code($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'states25/by-parent-code':
        if ($request_method === 'POST') {
            handle_states25_by_parent_code($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'states25/by-object-type':
        if ($request_method === 'POST') {
            handle_states25_by_object_type($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;

    // === FAKTURY SYSTÉM API ===
    case 'invoices25/list':
        if ($request_method === 'POST') {
            handle_invoices25_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'invoices25/by-order':
        if ($request_method === 'POST') {
            handle_invoices25_by_order($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'invoices25/by-id':
        if ($request_method === 'POST') {
            handle_invoices25_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'invoices25/create':
        if ($request_method === 'POST') {
            handle_invoices25_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'invoices25/create-with-attachment':
        if ($request_method === 'POST') {
            handle_invoices25_create_with_attachment($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'invoices25/update':
        if ($request_method === 'POST') {
            handle_invoices25_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'invoices25/delete':
        if ($request_method === 'POST') {
            handle_invoices25_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;

    // === INVOICE ATTACHMENTS API (PŘÍLOHY FAKTUR) ===
    case 'invoices25/attachments/by-invoice':
        if ($request_method === 'POST') {
            handle_invoices25_attachments_by_invoice($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'invoices25/attachments/by-order':
        if ($request_method === 'POST') {
            handle_invoices25_attachments_by_order($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'invoices25/attachments/by-id':
        if ($request_method === 'POST') {
            handle_invoices25_attachments_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'invoices25/attachments/upload':
        if ($request_method === 'POST') {
            handle_invoices25_attachments_upload($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'invoices25/attachments/download':
        if ($request_method === 'POST') {
            handle_invoices25_attachments_download($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'invoices25/attachments/update':
        if ($request_method === 'POST') {
            handle_invoices25_attachments_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'invoices25/attachments/delete':
        if ($request_method === 'POST') {
            handle_invoices25_attachments_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;

    // === NOTIFIKAČNÍ SYSTÉM API ===
    case 'notifications/list':
        if ($request_method === 'POST') {
            handle_notifications_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/unread-count':
        if ($request_method === 'POST') {
            handle_notifications_unread_count($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/mark-read':
        if ($request_method === 'POST') {
            handle_notifications_mark_read($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/mark-all-read':
        if ($request_method === 'POST') {
            handle_notifications_mark_all_read($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/create':
        if ($request_method === 'POST') {
            handle_notifications_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/dismiss':
        if ($request_method === 'POST') {
            handle_notifications_dismiss($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/dismiss-all':
        if ($request_method === 'POST') {
            handle_notifications_dismiss_all($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/restore':
        if ($request_method === 'POST') {
            handle_notifications_restore($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/delete':
        if ($request_method === 'POST') {
            handle_notifications_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/delete-all':
        if ($request_method === 'POST') {
            handle_notifications_delete_all($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    // === NOVÉ NOTIFIKAČNÍ ENDPOINTY (ROZŠÍŘENÍ 2025) ===
    case 'notifications/preview':
        if ($request_method === 'POST') {
            handle_notifications_preview($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'notifications/templates':
        if ($request_method === 'POST' || $request_method === 'GET') {
            handle_notifications_templates($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'notifications/send-bulk':
        if ($request_method === 'POST') {
            handle_notifications_send_bulk($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'notifications/event-types/list':
        if ($request_method === 'POST' || $request_method === 'GET') {
            handle_notifications_event_types_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'notifications/user-preferences':
        if ($request_method === 'GET' || $request_method === 'POST') {
            handle_notifications_user_preferences($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    case 'notifications/user-preferences/update':
        if ($request_method === 'POST') {
            handle_notifications_user_preferences_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
    
    // === NOTIFIKAČNÍ CENTRUM - TRIGGER ENDPOINT ===
    case 'notifications/trigger':
        if ($request_method === 'POST') {
            handle_notifications_trigger($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;

    // === NOTIFIKAČNÍ ŠABLONY CRUD API ===
    case 'notifications/templates/list':
        if ($request_method === 'POST') {
            handle_notifications_templates_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/templates/detail':
        if ($request_method === 'POST') {
            handle_notifications_templates_detail($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/templates/create':
        if ($request_method === 'POST') {
            handle_notifications_templates_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/templates/update':
        if ($request_method === 'POST') {
            handle_notifications_templates_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/templates/delete':
        if ($request_method === 'POST') {
            handle_notifications_templates_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/templates/activate':
        if ($request_method === 'POST') {
            handle_notifications_templates_activate($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;
        
    case 'notifications/templates/deactivate':
        if ($request_method === 'POST') {
            handle_notifications_templates_deactivate($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Metoda není povolena'));
        }
        break;

    // ===== ČÍSELNÍKY API =====
    case 'ciselniky/lokality/list':
        if ($request_method === 'POST') {
            handle_ciselniky_lokality_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/lokality/by-id':
        if ($request_method === 'POST') {
            handle_ciselniky_lokality_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/lokality/insert':
        if ($request_method === 'POST') {
            handle_ciselniky_lokality_insert($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/lokality/update':
        if ($request_method === 'POST') {
            handle_ciselniky_lokality_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/lokality/delete':
        if ($request_method === 'POST') {
            handle_ciselniky_lokality_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/pozice/list':
        if ($request_method === 'POST') {
            handle_ciselniky_pozice_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/pozice/by-id':
        if ($request_method === 'POST') {
            handle_ciselniky_pozice_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/pozice/insert':
        if ($request_method === 'POST') {
            handle_ciselniky_pozice_insert($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/pozice/update':
        if ($request_method === 'POST') {
            handle_ciselniky_pozice_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/pozice/delete':
        if ($request_method === 'POST') {
            handle_ciselniky_pozice_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/useky/list':
        if ($request_method === 'POST') {
            handle_ciselniky_useky_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/useky/by-id':
        if ($request_method === 'POST') {
            handle_ciselniky_useky_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/useky/insert':
        if ($request_method === 'POST') {
            handle_ciselniky_useky_insert($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/useky/update':
        if ($request_method === 'POST') {
            handle_ciselniky_useky_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/useky/delete':
        if ($request_method === 'POST') {
            handle_ciselniky_useky_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/organizace/list':
        if ($request_method === 'POST') {
            handle_ciselniky_organizace_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/organizace/by-id':
        if ($request_method === 'POST') {
            handle_ciselniky_organizace_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/organizace/insert':
        if ($request_method === 'POST') {
            handle_ciselniky_organizace_insert($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/organizace/update':
        if ($request_method === 'POST') {
            handle_ciselniky_organizace_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/organizace/delete':
        if ($request_method === 'POST') {
            handle_ciselniky_organizace_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/dodavatele/list':
        if ($request_method === 'POST') {
            handle_ciselniky_dodavatele_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/dodavatele/by-id':
        if ($request_method === 'POST') {
            handle_ciselniky_dodavatele_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/dodavatele/insert':
        if ($request_method === 'POST') {
            handle_ciselniky_dodavatele_insert($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/dodavatele/update':
        if ($request_method === 'POST') {
            handle_ciselniky_dodavatele_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/dodavatele/delete':
        if ($request_method === 'POST') {
            handle_ciselniky_dodavatele_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/stavy/list':
        if ($request_method === 'POST') {
            handle_ciselniky_stavy_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/role/list':
        if ($request_method === 'POST') {
            handle_ciselniky_role_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/role/list-enriched':
        if ($request_method === 'POST') {
            handle_ciselniky_role_list_enriched($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/role/by-id':
        if ($request_method === 'POST') {
            handle_ciselniky_role_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/role/insert':
        if ($request_method === 'POST') {
            handle_ciselniky_role_insert($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/role/update':
        if ($request_method === 'POST') {
            handle_ciselniky_role_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/prava/list':
        if ($request_method === 'POST') {
            handle_ciselniky_prava_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/prava/by-id':
        if ($request_method === 'POST') {
            handle_ciselniky_prava_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/prava/insert':
        if ($request_method === 'POST') {
            handle_ciselniky_prava_insert($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/prava/update':
        if ($request_method === 'POST') {
            handle_ciselniky_prava_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/prava/delete':
        if ($request_method === 'POST') {
            handle_ciselniky_prava_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/role/assign-pravo':
        if ($request_method === 'POST') {
            handle_ciselniky_role_assign_pravo($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/role/remove-pravo':
        if ($request_method === 'POST') {
            handle_ciselniky_role_remove_pravo($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/role/cleanup-duplicates':
        if ($request_method === 'POST') {
            handle_ciselniky_role_cleanup_duplicates($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'ciselniky/role/bulk-update-prava':
        if ($request_method === 'POST') {
            handle_ciselniky_role_bulk_update_prava($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;

    // ===== DOCX ŠABLONY API =====
    case 'sablona_docx/list':
        if ($request_method === 'POST') {
            handle_sablona_docx_list($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/by-id':
        if ($request_method === 'POST') {
            handle_sablona_docx_by_id($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/detail':
        if ($request_method === 'POST') {
            handle_sablona_docx_by_id($input, $config, $queries); // Používá stejnou funkci jako by-id
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/create':
        if ($request_method === 'POST') {
            handle_sablona_docx_create($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/update':
        if ($request_method === 'POST') {
            handle_sablona_docx_update($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/update-partial':
        if ($request_method === 'POST') {
            handle_sablona_docx_update_partial($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/update-with-file':
        if ($request_method === 'POST') {
            handle_sablona_docx_update_with_file($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/reupload':
        if ($request_method === 'POST') {
            handle_sablona_docx_reupload($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/delete':
        if ($request_method === 'POST') {
            handle_sablona_docx_delete($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/deactivate':
        if ($request_method === 'POST') {
            handle_sablona_docx_deactivate($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/download':
        if ($request_method === 'POST') {
            handle_sablona_docx_download($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/verify':
        if ($request_method === 'POST') {
            handle_sablona_docx_verify($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/verify-single':
        if ($request_method === 'POST') {
            handle_sablona_docx_verify_single($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/order-data':
        if ($request_method === 'POST') {
            handle_sablona_docx_order_data($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    case 'sablona_docx/order-enriched-data':
        if ($request_method === 'POST') {
            handle_sablona_docx_order_enriched_data($input, $config, $queries);
        } else {
            http_response_code(405);
            echo json_encode(array('err' => 'Method not allowed'));
        }
        break;
        
    // === UNIVERSAL SEARCH ===
    case 'search/universal':
        if ($request_method === 'POST') {
            handle_universal_search($input, $config);
        } else {
            http_response_code(405);
            echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
        }
        break;

    default:
        // === ORDER V2 - DYNAMIC ENDPOINTS ===
        
        // ⚠️ IMPORTANT: Specific endpoints MUST come BEFORE generic /order-v2/{id} pattern
        // Otherwise "unlock" would be treated as an order ID!
        
        // POST /api.eeo/order-v2/unlock - odemknuti objednavky
        // ⚠️ MUST be before /order-v2/{id} pattern to avoid matching "unlock" as an ID
        if (preg_match('/^order-v2\/unlock$/', $endpoint, $matches)) {
            if ($request_method === 'POST') {
                error_log('🔓 [UNLOCK API] Request received - input: ' . json_encode($input));
                handle_orders25_unlock($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/{id}/lock - zamknuti objednavky pro editaci
        // ⚠️ MUST be before /order-v2/{id} pattern
        if (preg_match('/^order-v2\/(\d+)\/lock$/', $endpoint, $matches)) {
            $order_id = (int)$matches[1];
            
            if ($request_method === 'POST') {
                error_log('🔒 [LOCK API] Request received for order #' . $order_id);
                handle_order_v2_lock($input, $config, $queries, $order_id);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/{id}/unlock - odemknuti konkretni objednavky
        // ⚠️ MUST be before /order-v2/{id} pattern
        if (preg_match('/^order-v2\/(\d+)\/unlock$/', $endpoint, $matches)) {
            $order_id = (int)$matches[1];
            
            if ($request_method === 'POST') {
                error_log('🔓 [UNLOCK API] Request received for order #' . $order_id);
                handle_order_v2_unlock($input, $config, $queries, $order_id);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/{id} - nacte objednavku podle ID (GET deprecated)
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)$/', $endpoint, $matches)) {
            // Support both numeric and string IDs
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_get($input, $config, $queries);
            } else if ($request_method === 'GET') {
                // GET method deprecated - return error message
                http_response_code(405);
                echo json_encode(array(
                    'status' => 'error', 
                    'message' => 'GET method not allowed. Use POST method.',
                    'deprecated' => 'GET support removed. Migrate to POST.',
                    'allowed_methods' => ['POST']
                ));
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/{id}/enriched - nacte objednavku VZDY s enriched daty (GET deprecated)
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/enriched$/', $endpoint, $matches)) {
            // Support both numeric and string IDs
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_get_enriched($input, $config, $queries);
            } else if ($request_method === 'GET') {
                // GET method deprecated - return error message
                http_response_code(405);
                echo json_encode(array(
                    'status' => 'error', 
                    'message' => 'GET method not allowed. Use POST method.',
                    'deprecated' => 'GET support removed. Migrate to POST.',
                    'allowed_methods' => ['POST']
                ));
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // PUT /api.eeo/order-v2/{id}/update - update objednavky
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/update$/', $endpoint, $matches)) {
            // Support both numeric and string IDs
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            
            if ($request_method === 'POST' || $request_method === 'PUT') {
                handle_order_v2_update($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/{id}/dt-aktualizace - nacte pouze dt_aktualizace objednavky podle ID (GET deprecated)
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/dt-aktualizace$/', $endpoint, $matches)) {
            // Support both numeric and string IDs
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_get_dt_aktualizace($input, $config, $queries);
            } else if ($request_method === 'GET') {
                // GET method deprecated - return error message
                http_response_code(405);
                echo json_encode(array(
                    'status' => 'error', 
                    'message' => 'GET method not allowed. Use POST method.',
                    'deprecated' => 'GET support removed. Migrate to POST.',
                    'allowed_methods' => ['POST']
                ));
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // DELETE /api.eeo/order-v2/{id}/delete - smazani objednavky  
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/delete$/', $endpoint, $matches)) {
            // Support both numeric and string IDs
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            
            if ($request_method === 'POST' || $request_method === 'DELETE') {
                handle_order_v2_delete($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // === ORDER V2 ATTACHMENT ENDPOINTS ===
        
        // POST /api.eeo/order-v2/attachments/list - seznam VSECH priloh objednavek
        if (preg_match('/^order-v2\/attachments\/list$/', $endpoint, $matches)) {
            if ($request_method === 'POST') {
                handle_order_v2_list_all_attachments($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/{id}/attachments/upload - upload prilohy k objednavce
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/attachments\/upload$/', $endpoint, $matches)) {
            // Support both numeric and string IDs
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_upload_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/{id}/attachments - seznam priloh objednavky (GET deprecated)
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/attachments$/', $endpoint, $matches)) {
            // Support both numeric and string IDs
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_list_attachments($input, $config, $queries);
            } else if ($request_method === 'GET') {
                // GET method deprecated - return error message
                http_response_code(405);
                echo json_encode(array(
                    'status' => 'error', 
                    'message' => 'GET method not allowed. Use POST method.',
                    'deprecated' => 'GET support removed. Migrate to POST.',
                    'allowed_methods' => ['POST']
                ));
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/{id}/attachments/{att_id}/download - download prilohy (explicit endpoint)
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/attachments\/(\d+)\/download$/', $endpoint, $matches)) {
            // 🔍 DEBUG - endpoint SE MATCHUJE!
            error_log("🎯 MATCH! order-v2 download endpoint");
            error_log("  matches[1] = " . $matches[1]);
            error_log("  matches[2] = " . $matches[2]);
            error_log("  input before merge: " . json_encode($input));
            
            // Support both numeric and string IDs for order
            // ⚠️ FIX: Pokud $input je prázdné, použij $raw_input (už načtený na začátku)
            if (empty($input) || (!isset($input['token']) && !isset($input['username']))) {
                error_log("  input is empty or missing token/username, trying to parse raw_input");
                if (!empty($raw_input)) {
                    $parsed = json_decode($raw_input, true);
                    if (is_array($parsed)) {
                        $input = $parsed;
                        error_log("  Parsed from raw_input: " . json_encode($input));
                    }
                }
            }
            
            // Přidat parametry z URL
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            $input['attachment_id'] = (int)$matches[2];
            
            error_log("  Final input: " . json_encode($input));
            
            if ($request_method === 'POST' || $request_method === 'GET') {
                handle_order_v2_download_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // DELETE /api.eeo/order-v2/{id}/attachments/{att_id}/delete - delete prilohy (POST s /delete)
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/attachments\/(\d+)\/delete$/', $endpoint, $matches)) {
            // Support both numeric and string IDs for order
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            $input['attachment_id'] = (int)$matches[2];
            
            if ($request_method === 'POST' || $request_method === 'DELETE') {
                handle_order_v2_delete_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // GET/PUT/DELETE /api.eeo/order-v2/{id}/attachments/{att_id} - download/update/delete konkretni prilohy
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/attachments\/(\d+)$/', $endpoint, $matches)) {
            // Support both numeric and string IDs for order
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            $input['attachment_id'] = (int)$matches[2];
            
            if ($request_method === 'GET') {
                handle_order_v2_download_attachment($input, $config, $queries);
            } elseif ($request_method === 'PUT') {
                handle_order_v2_update_attachment($input, $config, $queries);
            } elseif ($request_method === 'DELETE' || $request_method === 'POST') {
                handle_order_v2_delete_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // PUT /api.eeo/order-v2/{id}/attachments/{att_id}/update - update metadat prilohy
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/attachments\/(\d+)\/update$/', $endpoint, $matches)) {
            // Support both numeric and string IDs for order
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            $input['attachment_id'] = (int)$matches[2];
            
            if ($request_method === 'PUT' || $request_method === 'POST') {
                handle_order_v2_update_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/{id}/attachments/verify - overeni integrity vsech priloh
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/attachments\/verify$/', $endpoint, $matches)) {
            // Support both numeric and string IDs for order
            $input['id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_verify_attachments($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // === ORDER V2 INVOICE MANAGEMENT ENDPOINTS ===
        
        // POST /api.eeo/order-v2/{order_id}/invoices/create-with-attachment - vytvoří fakturu s přílohou
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/invoices\/create-with-attachment$/', $endpoint, $matches)) {
            // Support both numeric and string IDs for order
            $input['order_id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_create_invoice_with_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/{order_id}/invoices/create - vytvoří fakturu bez přílohy
        if (preg_match('/^order-v2\/([a-zA-Z0-9_-]+)\/invoices\/create$/', $endpoint, $matches)) {
            // Support both numeric and string IDs for order
            $input['order_id'] = is_numeric($matches[1]) ? (int)$matches[1] : $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_create_invoice($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/invoices/{invoice_id}/update - update metadat faktury
        if (preg_match('/^order-v2\/invoices\/(\d+)\/update$/', $endpoint, $matches)) {
            $input['invoice_id'] = (int)$matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_update_invoice($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }

        // === ORDER V2 INVOICE ATTACHMENT ENDPOINTS ===
        
        // POST /api.eeo/order-v2/invoices/attachments/list - seznam VSECH priloh faktur
        if (preg_match('/^order-v2\/invoices\/attachments\/list$/', $endpoint, $matches)) {
            if ($request_method === 'POST') {
                handle_order_v2_list_all_invoice_attachments($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/invoices/{invoice_id}/attachments/upload - upload prilohy k fakture
        if (preg_match('/^order-v2\/invoices\/([a-zA-Z0-9_-]+)\/attachments\/upload$/', $endpoint, $matches)) {
            $input['invoice_id'] = $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_upload_invoice_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/invoices/{invoice_id}/attachments - seznam priloh faktury (GET deprecated)
        if (preg_match('/^order-v2\/invoices\/([a-zA-Z0-9_-]+)\/attachments$/', $endpoint, $matches)) {
            $input['invoice_id'] = $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_list_invoice_attachments($input, $config, $queries);
            } else if ($request_method === 'GET') {
                // GET method deprecated - return error message
                http_response_code(405);
                echo json_encode(array(
                    'status' => 'error', 
                    'message' => 'GET method not allowed. Use POST method.',
                    'deprecated' => 'GET support removed. Migrate to POST.',
                    'allowed_methods' => ['POST']
                ));
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // POST /api.eeo/order-v2/invoices/{invoice_id}/attachments/{att_id}/download - download prilohy faktury (POST-only)
        if (preg_match('/^order-v2\/invoices\/([a-zA-Z0-9_-]+)\/attachments\/(\d+)\/download$/', $endpoint, $matches)) {
            $input['invoice_id'] = $matches[1];
            $input['attachment_id'] = (int)$matches[2];
            
            if ($request_method === 'POST') {
                handle_order_v2_download_invoice_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }

        // POST /api.eeo/order-v2/invoices/attachments/verify - verify integrity prilohy faktury (invoice_id v POST data)
        if (preg_match('/^order-v2\/invoices\/attachments\/verify$/', $endpoint, $matches)) {
            // invoice_id se očekává v $input['invoice_id'] z POST dat
            if ($request_method === 'POST') {
                handle_order_v2_verify_invoice_attachments($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }

        // POST /api.eeo/order-v2/invoices/{invoice_id}/attachments/verify - verify integrity prilohy faktury (invoice_id v URL)
        if (preg_match('/^order-v2\/invoices\/([a-zA-Z0-9_-]+)\/attachments\/verify$/', $endpoint, $matches)) {
            $input['invoice_id'] = $matches[1];
            
            if ($request_method === 'POST') {
                handle_order_v2_verify_invoice_attachments($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // PUT /api.eeo/order-v2/invoices/{invoice_id}/attachments/{att_id}/update - update metadata prilohy faktury
        if (preg_match('/^order-v2\/invoices\/([a-zA-Z0-9_-]+)\/attachments\/(\d+)\/update$/', $endpoint, $matches)) {
            $input['invoice_id'] = $matches[1];
            $input['attachment_id'] = (int)$matches[2];
            
            if ($request_method === 'PUT' || $request_method === 'POST') {
                handle_order_v2_update_invoice_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use PUT or POST.'));
            }
            break;
        }

        // DELETE /api.eeo/order-v2/invoices/{invoice_id}/delete - delete faktury (soft delete, POST s /delete)
        if (preg_match('/^order-v2\/invoices\/(\d+)\/delete$/', $endpoint, $matches)) {
            $input['invoice_id'] = (int)$matches[1];
            
            if ($request_method === 'DELETE' || $request_method === 'POST') {
                handle_order_v2_delete_invoice($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use DELETE or POST.'));
            }
            break;
        }

        // DELETE /api.eeo/order-v2/invoices/{invoice_id} - delete faktury (RESTful DELETE)
        if (preg_match('/^order-v2\/invoices\/(\d+)$/', $endpoint, $matches)) {
            $input['invoice_id'] = (int)$matches[1];
            
            if ($request_method === 'DELETE' || $request_method === 'POST') {
                handle_order_v2_delete_invoice($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use DELETE or POST.'));
            }
            break;
        }

        // DELETE /api.eeo/order-v2/invoices/{invoice_id}/attachments/{att_id}/delete - delete prilohy faktury (POST s /delete)
        if (preg_match('/^order-v2\/invoices\/([a-zA-Z0-9_-]+)\/attachments\/(\d+)\/delete$/', $endpoint, $matches)) {
            $input['invoice_id'] = $matches[1];
            $input['attachment_id'] = (int)$matches[2];
            
            if ($request_method === 'POST' || $request_method === 'DELETE') {
                handle_order_v2_delete_invoice_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // DELETE /api.eeo/order-v2/invoices/{invoice_id}/attachments/{att_id} - delete prilohy faktury (RESTful DELETE)
        if (preg_match('/^order-v2\/invoices\/([a-zA-Z0-9_-]+)\/attachments\/(\d+)$/', $endpoint, $matches)) {
            $input['invoice_id'] = $matches[1];
            $input['attachment_id'] = (int)$matches[2];
            
            if ($request_method === 'DELETE' || $request_method === 'POST') {
                handle_order_v2_delete_invoice_attachment($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
            }
            break;
        }
        
        // ===========================================================================
        // CASHBOOK API - Pokladní knihy
        // ===========================================================================
        

        
        // POST /api.eeo/cashbook-list - seznam pokladních knih
        if ($endpoint === 'cashbook-list') {
            if ($request_method === 'POST') {
                handle_cashbook_list_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-get - detail pokladní knihy
        // ALIAS: cashbook-get-book (pro FE kompatibilitu)
        if ($endpoint === 'cashbook-get' || $endpoint === 'cashbook-get-book') {
            if ($request_method === 'POST') {
                // Normalizace parametrů - FE používá pokladni_kniha_id
                if (isset($input['pokladni_kniha_id']) && !isset($input['book_id'])) {
                    $input['book_id'] = $input['pokladni_kniha_id'];
                }
                handle_cashbook_get_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-create - vytvořit pokladní knihu
        if ($endpoint === 'cashbook-create') {
            if ($request_method === 'POST') {
                handle_cashbook_create_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-update - aktualizovat pokladní knihu
        if ($endpoint === 'cashbook-update') {
            if ($request_method === 'POST') {
                handle_cashbook_update_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-close - uzavřít pokladní knihu
        // ALIAS: cashbook-close-month (pro FE kompatibilitu)
        if ($endpoint === 'cashbook-close' || $endpoint === 'cashbook-close-month') {
            if ($request_method === 'POST') {
                // Normalizace parametrů - FE používá pokladni_kniha_id
                if (isset($input['pokladni_kniha_id']) && !isset($input['book_id'])) {
                    $input['book_id'] = $input['pokladni_kniha_id'];
                }
                handle_cashbook_close_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-reopen - otevřít uzavřenou knihu
        // ALIAS: cashbook-reopen-book (pro FE kompatibilitu)
        if ($endpoint === 'cashbook-reopen' || $endpoint === 'cashbook-reopen-book') {
            if ($request_method === 'POST') {
                // Normalizace parametrů - FE používá pokladni_kniha_id
                if (isset($input['pokladni_kniha_id']) && !isset($input['book_id'])) {
                    $input['book_id'] = $input['pokladni_kniha_id'];
                }
                handle_cashbook_reopen_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-entry-create - vytvořit položku
        if ($endpoint === 'cashbook-entry-create') {
            if ($request_method === 'POST') {
                handle_cashbook_entry_create_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-entry-update - aktualizovat položku
        if ($endpoint === 'cashbook-entry-update') {
            if ($request_method === 'POST') {
                handle_cashbook_entry_update_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // DELETE nebo POST /api.eeo/cashbook-entry-delete - smazat položku
        if ($endpoint === 'cashbook-entry-delete') {
            if ($request_method === 'DELETE' || $request_method === 'POST') {
                handle_cashbook_entry_delete_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST or DELETE.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-entry-restore - obnovit smazanou položku
        if ($endpoint === 'cashbook-entry-restore') {
            if ($request_method === 'POST') {
                handle_cashbook_entry_restore_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-audit-log - získat audit log
        if ($endpoint === 'cashbook-audit-log') {
            if ($request_method === 'POST') {
                handle_cashbook_audit_log_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-force-renumber - ADMIN force přepočet pořadí dokladů
        // ⚠️ NEBEZPEČNÁ OPERACE - přečísluje všechny doklady včetně uzavřených
        if ($endpoint === 'cashbook-force-renumber') {
            if ($request_method === 'POST') {
                handle_cashbook_force_renumber_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-lp-summary - přehled čerpání LP kódů (včetně multi-LP)
        if ($endpoint === 'cashbook-lp-summary') {
            if ($request_method === 'POST') {
                handle_cashbook_lp_summary_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-lp-detail - detailní rozpis čerpání LP kódu
        if ($endpoint === 'cashbook-lp-detail') {
            if ($request_method === 'POST') {
                handle_cashbook_lp_detail_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // ===========================================================================
        // CASHBOOK EXTENDED API - Přiřazení pokladen, nastavení, 3-stavové zamykání
        // ===========================================================================
        
        // POST /api.eeo/cashbox-list-by-period - seznam pokladen podle měsíce/roku
        if ($endpoint === 'cashbox-list-by-period') {
            if ($request_method === 'POST') {
                handle_cashbox_list_by_period_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-assignments-all - VŠECHNA přiřazení pokladen (admin)
        if ($endpoint === 'cashbook-assignments-all') {
            if ($request_method === 'POST') {
                handle_cashbook_assignments_all_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-assignments-list - seznam přiřazení pokladen
        if ($endpoint === 'cashbox-assignments-list') {
            if ($request_method === 'POST') {
                handle_cashbox_assignments_list_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-assignment-create - vytvořit přiřazení pokladny
        if ($endpoint === 'cashbox-assignment-create') {
            if ($request_method === 'POST') {
                handle_cashbox_assignment_create_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-assignment-update - upravit přiřazení pokladny
        if ($endpoint === 'cashbox-assignment-update') {
            if ($request_method === 'POST') {
                handle_cashbox_assignment_update_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // DELETE nebo POST /api.eeo/cashbox-assignment-delete - smazat přiřazení
        if ($endpoint === 'cashbox-assignment-delete') {
            if ($request_method === 'DELETE' || $request_method === 'POST') {
                handle_cashbox_assignment_delete_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST or DELETE.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-settings-get - získat globální nastavení
        // ALIAS: cashbook-get-settings (pro FE kompatibilitu)
        if ($endpoint === 'cashbox-settings-get' || $endpoint === 'cashbook-get-settings') {
            if ($request_method === 'POST') {
                handle_cashbox_settings_get_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-settings-update - upravit globální nastavení
        if ($endpoint === 'cashbox-settings-update') {
            if ($request_method === 'POST') {
                handle_cashbox_settings_update_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-list - seznam pokladen (master data)
        // ✅ NOVÝ ENDPOINT pro normalizovanou strukturu (upraveno 8.11.2025 - vrací i uživatele)
        if ($endpoint === 'cashbox-list') {
            if ($request_method === 'POST') {
                handle_cashbox_list_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-create - vytvořit novou pokladnu
        // ✅ NOVÝ ENDPOINT (8.11.2025)
        if ($endpoint === 'cashbox-create') {
            if ($request_method === 'POST') {
                handle_cashbox_create_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-update - upravit pokladnu
        // ✅ NOVÝ ENDPOINT (8.11.2025)
        if ($endpoint === 'cashbox-update') {
            if ($request_method === 'POST') {
                handle_cashbox_update_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-delete - smazat pokladnu
        // ✅ NOVÝ ENDPOINT (8.11.2025)
        if ($endpoint === 'cashbox-delete') {
            if ($request_method === 'POST') {
                handle_cashbox_delete_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-assign-user - přiřadit uživatele k pokladně
        // ✅ NOVÝ ENDPOINT (8.11.2025)
        if ($endpoint === 'cashbox-assign-user') {
            if ($request_method === 'POST') {
                handle_cashbox_assign_user_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-unassign-user - odebrat uživatele z pokladny
        // ✅ NOVÝ ENDPOINT (8.11.2025)
        if ($endpoint === 'cashbox-unassign-user') {
            if ($request_method === 'POST') {
                handle_cashbox_unassign_user_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-available-users - seznam dostupných uživatelů
        // ✅ NOVÝ ENDPOINT (8.11.2025)
        if ($endpoint === 'cashbox-available-users') {
            if ($request_method === 'POST') {
                handle_cashbox_available_users_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbox-sync-users - batch synchronizace uživatelů
        // ✅ NOVÝ ENDPOINT (8.11.2025) - pro dialog Save
        if ($endpoint === 'cashbox-sync-users') {
            if ($request_method === 'POST') {
                handle_cashbox_sync_users_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/cashbook-lock - zamknout knihu správcem
        // ALIAS: cashbook-lock-book (pro FE kompatibilitu)
        if ($endpoint === 'cashbook-lock' || $endpoint === 'cashbook-lock-book') {
            if ($request_method === 'POST') {
                // Normalizace parametrů - FE používá pokladni_kniha_id a locked
                if (isset($input['pokladni_kniha_id']) && !isset($input['book_id'])) {
                    $input['book_id'] = $input['pokladni_kniha_id'];
                }
                // FE posílá locked: true/false, BE očekává book_id
                if (isset($input['locked'])) {
                    // Pro zamčení/odemčení máme cashbook-lock endpoint
                    // locked: true = zamknout, locked: false = odemknout (použije se cashbook-reopen)
                    if ($input['locked'] === false || $input['locked'] === 'false' || $input['locked'] === 0) {
                        // Odemčení - přesměrovat na reopen
                        handle_cashbook_reopen_post($config, $input);
                        break;
                    }
                }
                handle_cashbook_lock_post($config, $input);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // === LIMITOVANÉ PŘÍSLIBY - ČERPÁNÍ API ===
        
        // POST /api.eeo/limitovane-prisliby/prepocet - přepočet čerpání LP
        if ($endpoint === 'limitovane-prisliby/prepocet') {
            if ($request_method === 'POST') {
                // Ověření přihlášení
                $token = isset($input['token']) ? $input['token'] : '';
                $username = isset($input['username']) ? $input['username'] : '';
                $auth_result = verify_token_v2($username, $token);
                
                if (!$auth_result) {
                    http_response_code(401);
                    echo json_encode(array('status' => 'error', 'message' => 'Nepřihlášen'));
                    break;
                }
                
                // Připojení k databázi
                $conn = new mysqli($config['host'], $config['username'], $config['password'], $config['database']);
                if ($conn->connect_error) {
                    http_response_code(500);
                    echo json_encode(array('status' => 'error', 'message' => 'Chyba připojení k databázi'));
                    break;
                }
                $conn->set_charset('utf8');
                
                // Získat parametry - preferuje lp_id, fallback na cislo_lp
                $lp_id = isset($input['lp_id']) ? (int)$input['lp_id'] : null;
                $cislo_lp = isset($input['cislo_lp']) ? $input['cislo_lp'] : null;
                $rok = isset($input['rok']) ? (int)$input['rok'] : (int)date('Y');
                
                // Přepočet konkrétního LP nebo všech?
                if ($lp_id || $cislo_lp) {
                    // Pokud je cislo_lp, převést na lp_id
                    if (!$lp_id && $cislo_lp) {
                        $cislo_lp_safe = mysqli_real_escape_string($conn, $cislo_lp);
                        $sql_get_id = "SELECT id FROM " . TBL_LP_MASTER . " WHERE cislo_lp = '$cislo_lp_safe' LIMIT 1";
                        $result_id = mysqli_query($conn, $sql_get_id);
                        if ($result_id && mysqli_num_rows($result_id) > 0) {
                            $row_id = mysqli_fetch_assoc($result_id);
                            $lp_id = (int)$row_id['id'];
                        } else {
                            http_response_code(404);
                            echo json_encode(array('status' => 'error', 'message' => "LP '$cislo_lp' neexistuje"));
                            $conn->close();
                            break;
                        }
                    }
                    
                    // Přepočet jednoho LP podle ID
                    $lp_id = (int)$lp_id;
                    
                    // KROK 1: Získat metadata o LP podle ID
                    $sql_meta = "
                        SELECT 
                            lp.id as lp_id,
                            lp.cislo_lp,
                            lp.kategorie,
                            lp.usek_id,
                            lp.user_id,
                            YEAR(MIN(lp.platne_od)) as rok,
                            SUM(lp.vyse_financniho_kryti) as celkovy_limit,
                            COUNT(*) as pocet_zaznamu,
                            (COUNT(*) > 1) as ma_navyseni,
                            MIN(lp.platne_od) as nejstarsi_platnost,
                            MAX(lp.platne_do) as nejnovejsi_platnost
                        FROM " . TBL_LP_MASTER . " lp
                        WHERE lp.id = $lp_id
                        GROUP BY lp.id, lp.cislo_lp, lp.kategorie, lp.usek_id, lp.user_id
                        LIMIT 1
                    ";
                    
                    $result_meta = mysqli_query($conn, $sql_meta);
                    
                    if (!$result_meta || mysqli_num_rows($result_meta) === 0) {
                        http_response_code(404);
                        echo json_encode(array('status' => 'error', 'message' => "LP ID '$lp_id' neexistuje"));
                        $conn->close();
                        break;
                    }
                    
                    $meta = mysqli_fetch_assoc($result_meta);
                    $cislo_lp_safe = mysqli_real_escape_string($conn, $meta['cislo_lp']);
                    
                    // KROK 2: REZERVACE - parsovat JSON a dělit max_cena_s_dph (POUZE SCHVALENA)
                    $sql_rezervace = "
                        SELECT obj.id, obj.max_cena_s_dph, obj.financovani
                        FROM " . TBL_OBJEDNAVKY . " obj
                        WHERE obj.financovani IS NOT NULL
                        AND obj.financovani != ''
                        AND obj.financovani LIKE '%\"typ\":\"LP\"%'
                        AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
                        AND DATE(obj.dt_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
                    ";
                    
                    $result_rez = mysqli_query($conn, $sql_rezervace);
                    $rezervovano = 0;
                    
                    if ($result_rez) {
                        while ($row = mysqli_fetch_assoc($result_rez)) {
                            $financovani = json_decode($row['financovani'], true);
                            
                            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                                $lp_ids = $financovani['lp_kody'];
                                
                                // Normalizovat pole na inty pro porovnání
                                $lp_ids_int = array_map('intval', $lp_ids);
                                
                                if (in_array($lp_id, $lp_ids_int)) {
                                    $pocet_lp = count($lp_ids);
                                    $podil = $pocet_lp > 0 ? ((float)$row['max_cena_s_dph'] / $pocet_lp) : 0;
                                    $rezervovano += $podil;
                                }
                            }
                        }
                    }
                    
                    // KROK 3: PŘEDPOKLAD - parsovat JSON a dělit SUM(cena_s_dph) (SCHVALENA BEZ faktury)
                    $sql_predpoklad = "
                        SELECT obj.id, obj.financovani, SUM(pol.cena_s_dph) as suma_cena
                        FROM " . TBL_OBJEDNAVKY . " obj
                        INNER JOIN " . TBL_OBJEDNAVKY_POLOZKY . " pol ON obj.id = pol.objednavka_id
                        WHERE obj.financovani IS NOT NULL
                        AND obj.financovani != ''
                        AND obj.financovani LIKE '%\"typ\":\"LP\"%'
                        AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
                        AND DATE(obj.dt_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
                        AND NOT EXISTS (
                            SELECT 1 FROM 25a_objednavky_faktury fakt 
                            WHERE fakt.objednavka_id = obj.id
                        )
                        GROUP BY obj.id, obj.financovani
                    ";
                    
                    $result_pred = mysqli_query($conn, $sql_predpoklad);
                    $predpokladane_cerpani = 0;
                    
                    if ($result_pred) {
                        while ($row = mysqli_fetch_assoc($result_pred)) {
                            $financovani = json_decode($row['financovani'], true);
                            
                            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                                $lp_ids = $financovani['lp_kody'];
                                
                                // Normalizovat pole na inty pro porovnání
                                $lp_ids_int = array_map('intval', $lp_ids);
                                
                                if (in_array($lp_id, $lp_ids_int)) {
                                    $pocet_lp = count($lp_ids);
                                    $podil = $pocet_lp > 0 ? ((float)$row['suma_cena'] / $pocet_lp) : 0;
                                    $predpokladane_cerpani += $podil;
                                }
                            }
                        }
                    }
                    
                    // KROK 4: SKUTEČNOST - parsovat JSON a dělit SUM(fa_castka) z faktur
                    $sql_fakturovano = "
                        SELECT obj.id, obj.financovani, SUM(fakt.fa_castka) as suma_faktur
                        FROM " . TBL_OBJEDNAVKY . " obj
                        INNER JOIN 25a_objednavky_faktury fakt ON obj.id = fakt.objednavka_id
                        WHERE obj.financovani IS NOT NULL
                        AND obj.financovani != ''
                        AND obj.financovani LIKE '%\"typ\":\"LP\"%'
                        AND obj.stav_workflow_kod LIKE '%SCHVALENA%'
                        AND DATE(obj.dt_vytvoreni) BETWEEN '{$meta['nejstarsi_platnost']}' AND '{$meta['nejnovejsi_platnost']}'
                        GROUP BY obj.id, obj.financovani
                    ";
                    
                    $result_fakt = mysqli_query($conn, $sql_fakturovano);
                    $fakturovano = 0;
                    
                    if ($result_fakt) {
                        while ($row = mysqli_fetch_assoc($result_fakt)) {
                            $financovani = json_decode($row['financovani'], true);
                            
                            if ($financovani && $financovani['typ'] === 'LP' && isset($financovani['lp_kody'])) {
                                $lp_ids = $financovani['lp_kody'];
                                
                                // Normalizovat pole na inty pro porovnání
                                $lp_ids_int = array_map('intval', $lp_ids);
                                
                                if (in_array($lp_id, $lp_ids_int)) {
                                    $pocet_lp = count($lp_ids);
                                    $podil = $pocet_lp > 0 ? ((float)$row['suma_faktur'] / $pocet_lp) : 0;
                                    $fakturovano += $podil;
                                }
                            }
                        }
                    }
                    
                    // KROK 5: Čerpání z pokladny (pouze VÝDAJE - příjmy nenavyšují limit příslib)
                    $sql_pokladna = "
                        SELECT COALESCE(SUM(pol.castka_vydaj), 0) as cerpano_pokl
                        FROM " . TBL_POKLADNI_KNIHY . " pkn
                        JOIN " . TBL_POKLADNI_POLOZKY . " pol ON pkn.id = pol.pokladni_kniha_id
                        WHERE pol.lp_kod = '$cislo_lp_safe'
                        AND pkn.rok = {$meta['rok']}
                        AND pkn.stav_knihy IN ('uzavrena_uzivatelem', 'zamknuta_spravcem')
                    ";
                    
                    $result_pokl = mysqli_query($conn, $sql_pokladna);
                    $cerpano_pokladna = 0;
                    
                    if ($result_pokl) {
                        $row = mysqli_fetch_assoc($result_pokl);
                        $cerpano_pokladna = (float)$row['cerpano_pokl'];
                    }
                    
                    $skutecne_cerpano = $fakturovano + $cerpano_pokladna;
                    
                    // KROK 6: Vypočítat zůstatky a procenta
                    $celkovy_limit = (float)$meta['celkovy_limit'];
                    
                    $zbyva_rezervace = $celkovy_limit - $rezervovano;
                    $zbyva_predpoklad = $celkovy_limit - $predpokladane_cerpani;
                    $zbyva_skutecne = $celkovy_limit - $skutecne_cerpano;
                    
                    $procento_rezervace = $celkovy_limit > 0 ? round(($rezervovano / $celkovy_limit) * 100, 2) : 0;
                    $procento_predpoklad = $celkovy_limit > 0 ? round(($predpokladane_cerpani / $celkovy_limit) * 100, 2) : 0;
                    $procento_skutecne = $celkovy_limit > 0 ? round(($skutecne_cerpano / $celkovy_limit) * 100, 2) : 0;
                    
                    // KROK 7: Upsert do agregační tabulky
                    $sql_upsert = "
                        INSERT INTO " . TBL_LP_CERPANI . " 
                        (cislo_lp, kategorie, usek_id, user_id, rok, 
                         celkovy_limit, 
                         rezervovano, predpokladane_cerpani, skutecne_cerpano, cerpano_pokladna,
                         zbyva_rezervace, zbyva_predpoklad, zbyva_skutecne,
                         procento_rezervace, procento_predpoklad, procento_skutecne,
                         pocet_zaznamu, ma_navyseni, posledni_prepocet)
                        VALUES (
                            '$cislo_lp_safe',
                            '{$meta['kategorie']}',
                            {$meta['usek_id']},
                            {$meta['user_id']},
                            {$meta['rok']},
                            $celkovy_limit,
                            $rezervovano,
                            $predpokladane_cerpani,
                            $skutecne_cerpano,
                            $cerpano_pokladna,
                            $zbyva_rezervace,
                            $zbyva_predpoklad,
                            $zbyva_skutecne,
                            $procento_rezervace,
                            $procento_predpoklad,
                            $procento_skutecne,
                            {$meta['pocet_zaznamu']},
                            {$meta['ma_navyseni']},
                            NOW()
                        )
                        ON DUPLICATE KEY UPDATE
                            celkovy_limit = $celkovy_limit,
                            rezervovano = $rezervovano,
                            predpokladane_cerpani = $predpokladane_cerpani,
                            skutecne_cerpano = $skutecne_cerpano,
                            cerpano_pokladna = $cerpano_pokladna,
                            zbyva_rezervace = $zbyva_rezervace,
                            zbyva_predpoklad = $zbyva_predpoklad,
                            zbyva_skutecne = $zbyva_skutecne,
                            procento_rezervace = $procento_rezervace,
                            procento_predpoklad = $procento_predpoklad,
                            procento_skutecne = $procento_skutecne,
                            pocet_zaznamu = {$meta['pocet_zaznamu']},
                            ma_navyseni = {$meta['ma_navyseni']},
                            posledni_prepocet = NOW()
                    ";
                    
                    $result = mysqli_query($conn, $sql_upsert);
                    
                    if (!$result) {
                        http_response_code(500);
                        echo json_encode(array('status' => 'error', 'message' => 'Chyba při uložení: ' . mysqli_error($conn)));
                        $conn->close();
                        break;
                    }
                    
                    echo json_encode(array(
                        'status' => 'ok',
                        'message' => 'Přepočet dokončen',
                        'cislo_lp' => $cislo_lp,
                        'rok' => $rok,
                        'data' => array(
                            'cislo_lp' => $cislo_lp,
                            'kategorie' => $meta['kategorie'],
                            'usek_id' => (int)$meta['usek_id'],
                            'user_id' => (int)$meta['user_id'],
                            'rok' => (int)$meta['rok'],
                            'celkovy_limit' => (float)$celkovy_limit,
                            
                            'rezervovano' => (float)$rezervovano,
                            'predpokladane_cerpani' => (float)$predpokladane_cerpani,
                            'skutecne_cerpano' => (float)$skutecne_cerpano,
                            'cerpano_pokladna' => (float)$cerpano_pokladna,
                            
                            'zbyva_rezervace' => (float)$zbyva_rezervace,
                            'zbyva_predpoklad' => (float)$zbyva_predpoklad,
                            'zbyva_skutecne' => (float)$zbyva_skutecne,
                            
                            'procento_rezervace' => (float)$procento_rezervace,
                            'procento_predpoklad' => (float)$procento_predpoklad,
                            'procento_skutecne' => (float)$procento_skutecne,
                            
                            'pocet_zaznamu' => (int)$meta['pocet_zaznamu'],
                            'ma_navyseni' => (int)$meta['ma_navyseni'],
                            'posledni_prepocet' => date('Y-m-d H:i:s')
                        ),
                        'meta' => array(
                            'version' => 'v3.0',
                            'tri_typy_cerpani' => true,
                            'timestamp' => date('Y-m-d H:i:s')
                        )
                    ));
                    
                } else {
                    // Přepočet všech LP pro daný rok - získáme ID místo cislo_lp
                    $sql_kody = "
                        SELECT DISTINCT id, cislo_lp
                        FROM " . TBL_LP_MASTER . "
                        WHERE YEAR(platne_od) = $rok
                        ORDER BY cislo_lp
                    ";
                    
                    $result_kody = mysqli_query($conn, $sql_kody);
                    
                    if (!$result_kody) {
                        http_response_code(500);
                        echo json_encode(array('status' => 'error', 'message' => 'Chyba při získávání kódů LP'));
                        $conn->close();
                        break;
                    }
                    
                    $updated = 0;
                    $failed = 0;
                    
                    // Použít handler funkci pro každé LP
                    require_once __DIR__ . '/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_tri_typy.php';
                    
                    while ($row = mysqli_fetch_assoc($result_kody)) {
                        $lp_id_batch = (int)$row['id'];
                        $result_handler = prepocetCerpaniPodleIdLP($conn, $lp_id_batch);
                        
                        if ($result_handler['status'] === 'ok') {
                            $updated++;
                        } else {
                            $failed++;
                        }
                    }
                    
                    // Statistika po prepoctu
                    $sql_stats = "
                        SELECT 
                            COUNT(*) as celkem_kodu,
                            SUM(celkovy_limit) as celkovy_limit,
                            SUM(rezervovano) as celkem_rezervovano,
                            SUM(predpokladane_cerpani) as celkem_predpoklad,
                            SUM(skutecne_cerpano) as celkem_skutecne,
                            SUM(cerpano_pokladna) as celkem_pokladna
                        FROM " . TBL_LP_CERPANI . "
                        WHERE rok = $rok
                    ";
                    
                    $result_stats = mysqli_query($conn, $sql_stats);
                    $stats = null;
                    if ($result_stats) {
                        $stats = mysqli_fetch_assoc($result_stats);
                    }
                    
                    echo json_encode(array(
                        'status' => 'ok',
                        'data' => array(
                            'rok' => $rok,
                            'updated' => $updated,
                            'failed' => $failed,
                            'statistika' => $stats
                        ),
                        'meta' => array(
                            'version' => 'v3.0',
                            'tri_typy_cerpani' => true,
                            'timestamp' => date('Y-m-d H:i:s')
                        ),
                        'message' => 'Prepocet LP dokoncen'
                    ));
                }
                
                $conn->close();
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/limitovane-prisliby/inicializace - inicializace čerpání všech LP (admin only)
        if ($endpoint === 'limitovane-prisliby/inicializace') {
            if ($request_method === 'POST') {
                // Ověření přihlášení
                $token = isset($input['token']) ? $input['token'] : '';
                $username = isset($input['username']) ? $input['username'] : '';
                $auth_result = verify_token_v2($username, $token);
                
                if (!$auth_result) {
                    http_response_code(401);
                    echo json_encode(array('status' => 'error', 'message' => 'Nepřihlášen'));
                    break;
                }
                
                // Připojení k databázi - PDO
                try {
                    $pdo = get_pdo_connection();
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode(array('status' => 'error', 'message' => 'Chyba připojení k databázi'));
                    break;
                }
                
                $rok = isset($input['rok']) ? (int)$input['rok'] : (int)date('Y');
                $log = array();
                
                // KROK 1: Vymazat staré záznamy z tabulky čerpání pro daný rok
                try {
                    $stmt_delete = $pdo->prepare("DELETE FROM " . TBL_LP_CERPANI . " WHERE rok = ?");
                    $stmt_delete->execute([$rok]);
                    $deleted_count = $stmt_delete->rowCount();
                    $log[] = "Vymazáno $deleted_count starých záznamů čerpání pro rok $rok";
                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode(array('status' => 'error', 'message' => 'Chyba při mazání starých záznamů: ' . $e->getMessage()));
                    break;
                }
                
                // KROK 2: Provést kompletní přepočet všech kódů LP pomocí PDO handler funkce
                require_once __DIR__ . '/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php';
                
                try {
                    $stmt_kody = $pdo->prepare("
                        SELECT DISTINCT id, cislo_lp
                        FROM " . TBL_LP_MASTER . "
                        WHERE YEAR(platne_od) = ?
                        ORDER BY cislo_lp
                    ");
                    $stmt_kody->execute([$rok]);
                    $lp_list = $stmt_kody->fetchAll(PDO::FETCH_ASSOC);
                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode(array('status' => 'error', 'message' => 'Chyba při získávání kódů LP: ' . $e->getMessage()));
                    break;
                }
                
                $updated = 0;
                $failed = 0;
                
                // Použít PDO handler funkci pro každé LP
                foreach ($lp_list as $row) {
                    $lp_id_batch = (int)$row['id'];
                    $result_handler = prepocetCerpaniPodleIdLP_PDO($pdo, $lp_id_batch);
                    
                    if ($result_handler['success']) {
                        $updated++;
                    } else {
                        $failed++;
                    }
                }
                
                $log[] = "Přepočítáno $updated kódů LP pro rok $rok";
                if ($failed > 0) {
                    $log[] = "Selhalo: $failed kódů LP";
                }
                $log[] = "Inicializace dokončena";
                
                // KROK 3: Získat statistiku z agregační tabulky
                try {
                    $stmt_stats = $pdo->prepare("
                        SELECT 
                            COUNT(*) as celkem_kodu,
                            SUM(celkovy_limit) as celkovy_limit,
                            SUM(rezervovano) as celkem_rezervovano,
                            SUM(predpokladane_cerpani) as celkem_predpoklad,
                            SUM(skutecne_cerpano) as celkem_skutecne,
                            SUM(cerpano_pokladna) as celkem_pokladna,
                            SUM(zbyva_rezervace) as celkem_zbyva_rezervace,
                            SUM(zbyva_predpoklad) as celkem_zbyva_predpoklad,
                            SUM(zbyva_skutecne) as celkem_zbyva_skutecne,
                            AVG(procento_rezervace) as prumerne_procento_rezervace,
                            AVG(procento_predpoklad) as prumerne_procento_predpoklad,
                            AVG(procento_skutecne) as prumerne_procento_skutecne,
                            SUM(pocet_zaznamu) as celkem_zaznamu,
                            SUM(ma_navyseni) as pocet_s_navysenim,
                            COUNT(CASE WHEN zbyva_rezervace < 0 THEN 1 END) as prekroceno_rezervace,
                            COUNT(CASE WHEN zbyva_predpoklad < 0 THEN 1 END) as prekroceno_predpoklad,
                            COUNT(CASE WHEN zbyva_skutecne < 0 THEN 1 END) as prekroceno_skutecne
                        FROM " . TBL_LP_CERPANI . "
                        WHERE rok = ?
                    ");
                    $stmt_stats->execute([$rok]);
                    $stats = $stmt_stats->fetch(PDO::FETCH_ASSOC);
                } catch (PDOException $e) {
                    $stats = null;
                }
                
                echo json_encode(array(
                    'status' => 'ok',
                    'data' => array(
                        'rok' => $rok,
                        'updated' => $updated,
                        'failed' => $failed,
                        'statistika' => $stats,
                        'log' => $log
                    ),
                    'meta' => array(
                        'version' => 'v2.0',
                        'tri_typy_cerpani' => true,
                        'timestamp' => date('Y-m-d H:i:s')
                    ),
                    'message' => 'Inicializace čerpání LP úspěšně dokončena'
                ));
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/limitovane-prisliby/stav - získání stavu LP
        if ($endpoint === 'limitovane-prisliby/stav') {
            if ($request_method === 'POST') {
                // Ověření přihlášení - z $input (už načteno z php://input)
                $token = isset($input['token']) ? $input['token'] : '';
                $username = isset($input['username']) ? $input['username'] : '';
                $auth_result = verify_token_v2($username, $token);
                
                if (!$auth_result) {
                    http_response_code(401);
                    echo json_encode(array('status' => 'error', 'message' => 'Nepřihlášen'));
                    break;
                }
                
                // Připojení k databázi
                $conn = new mysqli($config['host'], $config['username'], $config['password'], $config['database']);
                if ($conn->connect_error) {
                    http_response_code(500);
                    echo json_encode(array('status' => 'error', 'message' => 'Chyba připojení k databázi'));
                    break;
                }
                $conn->set_charset('utf8');
                
                // Parametry dotazu (z $input)
                $cislo_lp = isset($input['cislo_lp']) ? $input['cislo_lp'] : null;
                $user_id = isset($input['user_id']) ? (int)$input['user_id'] : null;
                $usek_id = isset($input['usek_id']) ? (int)$input['usek_id'] : null;
                $rok = isset($input['rok']) ? (int)$input['rok'] : (int)date('Y');
                // Flexibilní kontrola isAdmin (boolean true nebo string "true")
                $is_admin = isset($input['isAdmin']) && ($input['isAdmin'] === true || $input['isAdmin'] === 'true' || $input['isAdmin'] === 1);
                
                // ADMIN MODE: Pokud FE pošle isAdmin=true, vracíme VŠE bez filtrování
                if ($is_admin) {
                    $sql = "
                        SELECT 
                            c.id,
                            c.cislo_lp,
                            c.kategorie,
                            c.usek_id,
                            c.user_id,
                            c.rok,
                            c.celkovy_limit,
                            lp.cislo_uctu,
                            lp.nazev_uctu,
                            c.rezervovano,
                            c.predpokladane_cerpani,
                            c.skutecne_cerpano,
                            c.cerpano_pokladna,
                            c.zbyva_rezervace,
                            c.zbyva_predpoklad,
                            c.zbyva_skutecne,
                            c.procento_rezervace,
                            c.procento_predpoklad,
                            c.procento_skutecne,
                            c.pocet_zaznamu,
                            c.ma_navyseni,
                            c.posledni_prepocet,
                            u.prijmeni,
                            u.jmeno,
                            us.usek_nazev
                        FROM " . TBL_LP_CERPANI . " c
                        LEFT JOIN " . TBL_LP_MASTER . " lp ON c.cislo_lp = lp.cislo_lp
                        LEFT JOIN 25_uzivatele u ON c.user_id = u.id
                        LEFT JOIN 25_useky us ON c.usek_id = us.id
                        WHERE c.rok = $rok
                        ORDER BY c.kategorie, c.cislo_lp
                    ";
                    
                    $result = mysqli_query($conn, $sql);
                    $lp_list = array();
                    
                    if ($result === false) {
                        echo json_encode(array(
                            'status' => 'error',
                            'message' => 'SQL error',
                            'error' => mysqli_error($conn)
                        ));
                        exit;
                    }
                    
                    while ($row = mysqli_fetch_assoc($result)) {
                        $lp_list[] = array(
                            'id' => (int)$row['id'],
                            'cislo_lp' => $row['cislo_lp'],
                            'kategorie' => $row['kategorie'],
                            'celkovy_limit' => (float)$row['celkovy_limit'],
                            'cislo_uctu' => $row['cislo_uctu'],
                            'nazev_uctu' => $row['nazev_uctu'],
                            'rezervovano' => (float)$row['rezervovano'],
                            'predpokladane_cerpani' => (float)$row['predpokladane_cerpani'],
                            'skutecne_cerpano' => (float)$row['skutecne_cerpano'],
                            'cerpano_pokladna' => (float)$row['cerpano_pokladna'],
                            'zbyva_rezervace' => (float)$row['zbyva_rezervace'],
                            'zbyva_predpoklad' => (float)$row['zbyva_predpoklad'],
                            'zbyva_skutecne' => (float)$row['zbyva_skutecne'],
                            'procento_rezervace' => (float)$row['procento_rezervace'],
                            'procento_predpoklad' => (float)$row['procento_predpoklad'],
                            'procento_skutecne' => (float)$row['procento_skutecne'],
                            'je_prekroceno_skutecne' => ((float)$row['zbyva_skutecne'] < 0) ? true : false,
                            'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
                            'ma_navyseni' => $row['ma_navyseni'] ? true : false,
                            'posledni_prepocet' => $row['posledni_prepocet'],
                            'usek_nazev' => $row['usek_nazev'],
                            'spravce' => array(
                                'prijmeni' => $row['prijmeni'],
                                'jmeno' => $row['jmeno']
                            )
                        );
                    }
                    
                    echo json_encode(array(
                        'status' => 'ok',
                        'data' => $lp_list,
                        'meta' => array(
                            'version' => 'v3.0',
                            'tri_typy_cerpani' => true,
                            'admin_mode' => true,
                            'count' => count($lp_list),
                            'timestamp' => date('Y-m-d H:i:s')
                        )
                    ));
                    
                    $conn->close();
                    break;
                }
                
                // TŘI REŽIMY: konkrétní LP / uživatel / úsek
                
                if ($cislo_lp) {
                    // REŽIM 1: Konkrétní kód LP
                    $cislo_lp_safe = mysqli_real_escape_string($conn, $cislo_lp);
                    
                    $sql = "
                        SELECT 
                            c.id,
                            c.cislo_lp,
                            c.kategorie,
                            c.usek_id,
                            c.user_id,
                            c.rok,
                            c.celkovy_limit,
                            lp.cislo_uctu,
                            lp.nazev_uctu,
                            c.rezervovano,
                            c.predpokladane_cerpani,
                            c.skutecne_cerpano,
                            c.cerpano_pokladna,
                            c.zbyva_rezervace,
                            c.zbyva_predpoklad,
                            c.zbyva_skutecne,
                            c.procento_rezervace,
                            c.procento_predpoklad,
                            c.procento_skutecne,
                            c.pocet_zaznamu,
                            c.ma_navyseni,
                            c.posledni_prepocet,
                            u.prijmeni,
                            u.jmeno,
                            us.usek_nazev
                        FROM " . TBL_LP_CERPANI . " c
                        LEFT JOIN " . TBL_LP_MASTER . " lp ON c.cislo_lp = lp.cislo_lp
                        LEFT JOIN 25_uzivatele u ON c.user_id = u.id
                        LEFT JOIN 25_useky us ON c.usek_id = us.id
                        WHERE c.cislo_lp = '$cislo_lp_safe'
                        AND c.rok = $rok
                        LIMIT 1
                    ";
                    
                    $result = mysqli_query($conn, $sql);
                    
                    if (!$result || mysqli_num_rows($result) === 0) {
                        http_response_code(404);
                        echo json_encode(array('status' => 'error', 'message' => "LP '$cislo_lp' nebyl nalezen pro rok $rok"));
                        $conn->close();
                        break;
                    }
                    
                    $row = mysqli_fetch_assoc($result);
                    
                    $data = array(
                        'id' => (int)$row['id'],
                        'cislo_lp' => $row['cislo_lp'],
                        'kategorie' => $row['kategorie'],
                        'celkovy_limit' => (float)$row['celkovy_limit'],
                        'cislo_uctu' => $row['cislo_uctu'],
                        'nazev_uctu' => $row['nazev_uctu'],
                        'rezervovano' => (float)$row['rezervovano'],
                        'predpokladane_cerpani' => (float)$row['predpokladane_cerpani'],
                        'skutecne_cerpano' => (float)$row['skutecne_cerpano'],
                        'cerpano_pokladna' => (float)$row['cerpano_pokladna'],
                        'zbyva_rezervace' => (float)$row['zbyva_rezervace'],
                        'zbyva_predpoklad' => (float)$row['zbyva_predpoklad'],
                        'zbyva_skutecne' => (float)$row['zbyva_skutecne'],
                        'procento_rezervace' => (float)$row['procento_rezervace'],
                        'procento_predpoklad' => (float)$row['procento_predpoklad'],
                        'procento_skutecne' => (float)$row['procento_skutecne'],
                        'je_prekroceno_rezervace' => (float)$row['zbyva_rezervace'] < 0,
                        'je_prekroceno_predpoklad' => (float)$row['zbyva_predpoklad'] < 0,
                        'je_prekroceno_skutecne' => (float)$row['zbyva_skutecne'] < 0,
                        'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
                        'ma_navyseni' => (bool)$row['ma_navyseni'],
                        'rok' => (int)$row['rok'],
                        'posledni_prepocet' => $row['posledni_prepocet'],
                        'spravce' => array(
                            'prijmeni' => $row['prijmeni'],
                            'jmeno' => $row['jmeno']
                        ),
                        'usek_nazev' => $row['usek_nazev']
                    );
                    
                    echo json_encode(array(
                        'status' => 'ok',
                        'data' => $data,
                        'meta' => array(
                            'version' => 'v3.0',
                            'tri_typy_cerpani' => true,
                            'timestamp' => date('Y-m-d H:i:s')
                        )
                    ));
                    
                } elseif ($user_id) {
                    // REŽIM 2: Všechna LP pro uživatele
                    $sql = "
                        SELECT 
                            c.id,
                            c.cislo_lp,
                            c.kategorie,
                            c.celkovy_limit,
                            lp.cislo_uctu,
                            lp.nazev_uctu,
                            c.rezervovano,
                            c.predpokladane_cerpani,
                            c.skutecne_cerpano,
                            c.cerpano_pokladna,
                            c.zbyva_rezervace,
                            c.zbyva_predpoklad,
                            c.zbyva_skutecne,
                            c.procento_rezervace,
                            c.procento_predpoklad,
                            c.procento_skutecne,
                            c.pocet_zaznamu,
                            c.ma_navyseni,
                            us.usek_nazev
                        FROM " . TBL_LP_CERPANI . " c
                        LEFT JOIN " . TBL_LP_MASTER . " lp ON c.cislo_lp = lp.cislo_lp
                        LEFT JOIN 25_useky us ON c.usek_id = us.id
                        WHERE c.user_id = $user_id
                        AND c.rok = $rok
                        ORDER BY c.kategorie, c.cislo_lp
                    ";
                    
                    $result = mysqli_query($conn, $sql);
                    $lp_list = array();
                    
                    while ($row = mysqli_fetch_assoc($result)) {
                        $lp_list[] = array(
                            'id' => (int)$row['id'],
                            'cislo_lp' => $row['cislo_lp'],
                            'kategorie' => $row['kategorie'],
                            'celkovy_limit' => (float)$row['celkovy_limit'],
                            'cislo_uctu' => $row['cislo_uctu'],
                            'nazev_uctu' => $row['nazev_uctu'],
                            'rezervovano' => (float)$row['rezervovano'],
                            'predpokladane_cerpani' => (float)$row['predpokladane_cerpani'],
                            'skutecne_cerpano' => (float)$row['skutecne_cerpano'],
                            'cerpano_pokladna' => (float)$row['cerpano_pokladna'],
                            'zbyva_rezervace' => (float)$row['zbyva_rezervace'],
                            'zbyva_predpoklad' => (float)$row['zbyva_predpoklad'],
                            'zbyva_skutecne' => (float)$row['zbyva_skutecne'],
                            'procento_rezervace' => (float)$row['procento_rezervace'],
                            'procento_predpoklad' => (float)$row['procento_predpoklad'],
                            'procento_skutecne' => (float)$row['procento_skutecne'],
                            'je_prekroceno_skutecne' => (float)$row['zbyva_skutecne'] < 0,
                            'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
                            'ma_navyseni' => (bool)$row['ma_navyseni'],
                            'usek_nazev' => $row['usek_nazev']
                        );
                    }
                    
                    echo json_encode(array(
                        'status' => 'ok',
                        'data' => $lp_list,
                        'meta' => array(
                            'version' => 'v3.0',
                            'tri_typy_cerpani' => true,
                            'count' => count($lp_list),
                            'timestamp' => date('Y-m-d H:i:s')
                        )
                    ));
                    
                } elseif ($usek_id) {
                    // REŽIM 3: Všechna LP pro úsek
                    $sql = "
                        SELECT 
                            c.id,
                            c.cislo_lp,
                            c.kategorie,
                            c.celkovy_limit,
                            lp.cislo_uctu,
                            lp.nazev_uctu,
                            c.rezervovano,
                            c.predpokladane_cerpani,
                            c.skutecne_cerpano,
                            c.cerpano_pokladna,
                            c.zbyva_rezervace,
                            c.zbyva_predpoklad,
                            c.zbyva_skutecne,
                            c.procento_rezervace,
                            c.procento_predpoklad,
                            c.procento_skutecne,
                            c.pocet_zaznamu,
                            c.ma_navyseni,
                            u.prijmeni,
                            u.jmeno
                        FROM " . TBL_LP_CERPANI . " c
                        LEFT JOIN " . TBL_LP_MASTER . " lp ON c.cislo_lp = lp.cislo_lp
                        LEFT JOIN 25_uzivatele u ON c.user_id = u.id
                        WHERE c.usek_id = $usek_id
                        AND c.rok = $rok
                        ORDER BY c.kategorie, c.cislo_lp
                    ";
                    
                    $result = mysqli_query($conn, $sql);
                    $lp_list = array();
                    
                    while ($row = mysqli_fetch_assoc($result)) {
                        $lp_list[] = array(
                            'id' => (int)$row['id'],
                            'cislo_lp' => $row['cislo_lp'],
                            'kategorie' => $row['kategorie'],
                            'celkovy_limit' => (float)$row['celkovy_limit'],
                            'cislo_uctu' => $row['cislo_uctu'],
                            'nazev_uctu' => $row['nazev_uctu'],
                            'rezervovano' => (float)$row['rezervovano'],
                            'predpokladane_cerpani' => (float)$row['predpokladane_cerpani'],
                            'skutecne_cerpano' => (float)$row['skutecne_cerpano'],
                            'cerpano_pokladna' => (float)$row['cerpano_pokladna'],
                            'zbyva_rezervace' => (float)$row['zbyva_rezervace'],
                            'zbyva_predpoklad' => (float)$row['zbyva_predpoklad'],
                            'zbyva_skutecne' => (float)$row['zbyva_skutecne'],
                            'procento_rezervace' => (float)$row['procento_rezervace'],
                            'procento_predpoklad' => (float)$row['procento_predpoklad'],
                            'procento_skutecne' => (float)$row['procento_skutecne'],
                            'je_prekroceno_skutecne' => (float)$row['zbyva_skutecne'] < 0,
                            'pocet_zaznamu' => (int)$row['pocet_zaznamu'],
                            'ma_navyseni' => (bool)$row['ma_navyseni'],
                            'spravce' => array(
                                'prijmeni' => $row['prijmeni'],
                                'jmeno' => $row['jmeno']
                            )
                        );
                    }
                    
                    echo json_encode(array(
                        'status' => 'ok',
                        'data' => $lp_list,
                        'meta' => array(
                            'version' => 'v3.0',
                            'tri_typy_cerpani' => true,
                            'count' => count($lp_list),
                            'timestamp' => date('Y-m-d H:i:s')
                        )
                    ));
                    
                } else {
                    http_response_code(400);
                    echo json_encode(array('status' => 'error', 'message' => 'Chybí parametr cislo_lp, user_id nebo usek_id'));
                }
                
                $conn->close();
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use GET.'));
            }
            break;
        }
        
        // POST /api.eeo/limitovane-prisliby/cerpani-podle-uzivatele - čerpání podle uživatelů pro konkrétní LP
        if ($endpoint === 'limitovane-prisliby/cerpani-podle-uzivatele') {
            if ($request_method === 'POST') {
                // Ověření přihlášení
                $token = isset($input['token']) ? $input['token'] : '';
                $username = isset($input['username']) ? $input['username'] : '';
                $auth_result = verify_token_v2($username, $token);
                
                if (!$auth_result) {
                    http_response_code(401);
                    echo json_encode(array('status' => 'error', 'message' => 'Nepřihlášen'));
                    break;
                }
                
                // Připojení k databázi - PDO
                try {
                    $pdo = get_pdo_connection();
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode(array('status' => 'error', 'message' => 'Chyba připojení k databázi'));
                    break;
                }
                
                // Parametry
                $lp_id = isset($input['lp_id']) ? (int)$input['lp_id'] : null;
                
                if (!$lp_id) {
                    http_response_code(400);
                    echo json_encode(array('status' => 'error', 'message' => 'Parametr lp_id je povinný'));
                    break;
                }
                
                // Zavolat PDO handler funkci
                require_once __DIR__ . '/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_pdo.php';
                $result = getCerpaniPodleUzivatele_PDO($pdo, $lp_id);
                
                if (isset($result['success']) && !$result['success']) {
                    http_response_code(404);
                    echo json_encode(array('status' => 'error', 'message' => $result['error']));
                } else {
                    echo json_encode(array('status' => 'ok', 'data' => $result));
                }
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/limitovane-prisliby/cerpani-podle-useku - čerpání podle úseku (všechna LP + uživatelé)
        if ($endpoint === 'limitovane-prisliby/cerpani-podle-useku') {
            if ($request_method === 'POST') {
                // Ověření přihlášení
                $token = isset($input['token']) ? $input['token'] : '';
                $username = isset($input['username']) ? $input['username'] : '';
                $auth_result = verify_token_v2($username, $token);
                
                if (!$auth_result) {
                    http_response_code(401);
                    echo json_encode(array('status' => 'error', 'message' => 'Nepřihlášen'));
                    break;
                }
                
                // Připojení k databázi
                $conn = new mysqli($config['host'], $config['username'], $config['password'], $config['database']);
                if ($conn->connect_error) {
                    http_response_code(500);
                    echo json_encode(array('status' => 'error', 'message' => 'Chyba připojení k databázi'));
                    break;
                }
                $conn->set_charset('utf8');
                
                // Parametry
                $usek_id = isset($input['usek_id']) ? (int)$input['usek_id'] : null;
                $rok = isset($input['rok']) ? (int)$input['rok'] : (int)date('Y');
                
                if (!$usek_id) {
                    http_response_code(400);
                    echo json_encode(array('status' => 'error', 'message' => 'Parametr usek_id je povinný'));
                    $conn->close();
                    break;
                }
                
                // Zavolat handler funkci
                require_once __DIR__ . '/v2025.03_25/lib/limitovanePrislibyCerpaniHandlers_v2_tri_typy.php';
                $result = getCerpaniPodleUseku($conn, $usek_id, $rok);
                
                if ($result['status'] === 'error') {
                    http_response_code(404);
                }
                
                echo json_encode($result);
                $conn->close();
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/limitovane-prisliby/moje-cerpani - čerpání LP pro uživatele z jeho objednávek
        if ($endpoint === 'limitovane-prisliby/moje-cerpani') {
            if ($request_method === 'POST') {
                // Ověření přihlášení
                $token = isset($input['token']) ? $input['token'] : '';
                $username = isset($input['username']) ? $input['username'] : '';
                $auth_result = verify_token_v2($username, $token);
                
                if (!$auth_result) {
                    http_response_code(401);
                    echo json_encode(array('status' => 'error', 'message' => 'Nepřihlášen'));
                    break;
                }
                
                // Připojení k databázi - PDO
                try {
                    $db = get_db($config);
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode(array('status' => 'error', 'message' => 'Chyba připojení k databázi'));
                    break;
                }
                
                // Parametry
                $vytvoril_user_id = isset($input['user_id']) ? (int)$input['user_id'] : null;
                $rok = isset($input['rok']) ? (int)$input['rok'] : (int)date('Y');
                
                if (!$vytvoril_user_id) {
                    http_response_code(400);
                    echo json_encode(array('status' => 'error', 'message' => 'Parametr user_id je povinný'));
                    break;
                }
                
                // Načíst usek_id uživatele pro flag je_z_meho_useku
                $user_usek_id = null;
                try {
                    $stmt = $db->prepare("SELECT usek_id FROM " . TBL_UZIVATELE . " WHERE id = :user_id LIMIT 1");
                    $stmt->execute(['user_id' => $vytvoril_user_id]);
                    $user_row = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($user_row) {
                        $user_usek_id = (int)$user_row['usek_id'];
                    }
                } catch (Exception $e) {
                    // non-fatal
                }
                
                // KROK 0: Načíst všechna LP metadata z agregační tabulky
                $lp_metadata = array(); // cislo_lp => metadata
                $sql_all_lp = "
                    SELECT 
                        c.cislo_lp,
                        c.kategorie,
                        c.celkovy_limit,
                        c.cislo_uctu,
                        c.nazev_uctu,
                        c.usek_id,
                        us.usek_nazev
                    FROM " . TBL_LP_CERPANI . " c
                    LEFT JOIN 25_useky us ON c.usek_id = us.id
                    WHERE c.rok = :rok
                ";
                try {
                    $stmt = $db->prepare($sql_all_lp);
                    $stmt->execute(['rok' => $rok]);
                    while ($lp_row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $lp_metadata[$lp_row['cislo_lp']] = $lp_row;
                    }
                    // Pokud žádná LP metadata nejsou, je to OK - user prostě nemá LP
                } catch (Exception $e) {
                    error_log("LP metadata query error: " . $e->getMessage());
                    // Pokračuj s prázdným array - není to fatální chyba
                }
                
                // KROK 1: Najít všechny objednávky kde se uživatele týká (objednatel, garant, vytvořil)
                $sql_orders = "
                    SELECT 
                        obj.id,
                        obj.cislo_objednavky,
                        obj.max_cena_s_dph,
                        obj.financovani,
                        obj.stav_workflow_kod,
                        obj.dt_vytvoreni
                    FROM " . TBL_OBJEDNAVKY . " obj
                    WHERE (
                        obj.uzivatel_id = :user_id1
                        OR obj.garant_uzivatel_id = :user_id2
                    )
                    AND obj.financovani IS NOT NULL
                    AND obj.financovani != ''
                    AND obj.financovani LIKE '%\"typ\":\"LP\"%'
                    AND YEAR(obj.dt_vytvoreni) = :rok
                    AND obj.aktivni = 1
                    ORDER BY obj.dt_vytvoreni DESC
                ";
                
                try {
                    $stmt = $db->prepare($sql_orders);
                    $stmt->execute([
                        'user_id1' => $vytvoril_user_id,
                        'user_id2' => $vytvoril_user_id,
                        'rok' => $rok
                    ]);
                    $result_orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    // Pokud user nemá objednávky, je to OK - vrátíme prázdné pole
                } catch (Exception $e) {
                    error_log("LP orders query error for user $vytvoril_user_id: " . $e->getMessage());
                    // Pokračuj s prázdným polem - není to fatální chyba
                    $result_orders = array();
                }
                
                // KROK 2: Agregovat čerpání podle LP
                $lp_cerpani = array(); // cislo_lp => data
                $objednavky_list = array();
                
                foreach ($result_orders as $order) {
                    $financovani = json_decode($order['financovani'], true);
                    
                    if (!$financovani || $financovani['typ'] !== 'LP' || !isset($financovani['lp_kody'])) {
                        continue;
                    }
                    
                    $lp_ids = $financovani['lp_kody'];
                    $pocet_lp = count($lp_ids);
                    
                    if ($pocet_lp === 0) continue;
                    
                    // Je schválená?
                    $je_schvalena = (strpos($order['stav_workflow_kod'], 'SCHVALENA') !== false);
                    
                    // Rezervace = max_cena_s_dph / počet LP (pouze schválené)
                    $rezervace_podil = $je_schvalena ? ((float)$order['max_cena_s_dph'] / $pocet_lp) : 0;
                    
                    // Načíst faktury pro skutečnost
                    try {
                        $stmt_inv = $db->prepare("
                            SELECT SUM(fa_castka) as suma_faktur
                            FROM " . TBL_FAKTURY . "
                            WHERE objednavka_id = :order_id
                            AND aktivni = 1
                        ");
                        $stmt_inv->execute(['order_id' => $order['id']]);
                        $invoices_row = $stmt_inv->fetch(PDO::FETCH_ASSOC);
                        $suma_faktur = $invoices_row ? (float)$invoices_row['suma_faktur'] : 0;
                        $skutecne_podil = $suma_faktur / $pocet_lp;
                    } catch (Exception $e) {
                        $suma_faktur = 0;
                        $skutecne_podil = 0;
                    }
                    
                    // Načíst položky objednávky pro předpoklad (POUZE pokud není faktura)
                    $predpoklad_podil = 0;
                    if ($je_schvalena && $suma_faktur == 0) {
                        try {
                            $stmt_items = $db->prepare("
                                SELECT SUM(cena_s_dph) as suma_polozek
                                FROM " . TBL_OBJEDNAVKY_POLOZKY . "
                                WHERE objednavka_id = :order_id
                                AND aktivni = 1
                            ");
                            $stmt_items->execute(['order_id' => $order['id']]);
                            $items_row = $stmt_items->fetch(PDO::FETCH_ASSOC);
                            $suma_polozek = $items_row ? (float)$items_row['suma_polozek'] : 0;
                            $predpoklad_podil = $suma_polozek / $pocet_lp;
                        } catch (Exception $e) {
                            $predpoklad_podil = 0;
                        }
                    }
                    
                    // Přidat k objednávkám
                    $objednavky_list[] = array(
                        'id' => (int)$order['id'],
                        'cislo_objednavky' => $order['cislo_objednavky'],
                        'max_cena_s_dph' => (float)$order['max_cena_s_dph'],
                        'stav' => $order['stav_workflow_kod'],
                        'dt_vytvoreni' => $order['dt_vytvoreni'],
                        'lp_kody' => $lp_ids,
                        'pocet_lp' => $pocet_lp
                    );
                    
                    // Agregovat podle LP (používáme lp_ids, ne lp_detaily)
                    foreach ($lp_ids as $lp_id) {
                        // Načíst cislo_lp z master tabulky
                        $lp_id_int = (int)$lp_id;
                        try {
                            $stmt_lp = $db->prepare("SELECT cislo_lp FROM " . TBL_LP_MASTER . " WHERE id = :lp_id LIMIT 1");
                            $stmt_lp->execute(['lp_id' => $lp_id_int]);
                            $lp_kod_row = $stmt_lp->fetch(PDO::FETCH_ASSOC);
                        } catch (Exception $e) {
                            continue;
                        }
                        
                        if (!$lp_kod_row) continue;
                        
                        $cislo_lp = $lp_kod_row['cislo_lp'];
                        
                        if (!isset($lp_cerpani[$cislo_lp])) {
                            // Použít předem načtená metadata
                            if (isset($lp_metadata[$cislo_lp])) {
                                $lp_meta = $lp_metadata[$cislo_lp];
                                $lp_usek_id = isset($lp_meta['usek_id']) ? (int)$lp_meta['usek_id'] : null;
                                $je_z_meho_useku = ($user_usek_id && $lp_usek_id && $user_usek_id === $lp_usek_id);
                                
                                $lp_cerpani[$cislo_lp] = array(
                                    'cislo_lp' => $cislo_lp,
                                    'kategorie' => $lp_meta['kategorie'],
                                    'celkovy_limit' => (float)$lp_meta['celkovy_limit'],
                                    'cislo_uctu' => $lp_meta['cislo_uctu'],
                                    'nazev_uctu' => $lp_meta['nazev_uctu'],
                                    'usek_nazev' => $lp_meta['usek_nazev'],
                                    'je_z_meho_useku' => $je_z_meho_useku,
                                    'moje_rezervovano' => 0,
                                    'moje_predpoklad' => 0,
                                    'moje_skutecne' => 0,
                                    'moje_pokladna' => 0,
                                    'pocet_objednavek' => 0
                                );
                            } else {
                                // LP nenalezeno (nemělo by nastat)
                                $lp_cerpani[$cislo_lp] = array(
                                    'cislo_lp' => $cislo_lp,
                                    'kategorie' => null,
                                    'celkovy_limit' => 0,
                                    'cislo_uctu' => null,
                                    'nazev_uctu' => null,
                                    'usek_nazev' => null,
                                    'je_z_meho_useku' => false,
                                    'moje_rezervovano' => 0,
                                    'moje_predpoklad' => 0,
                                    'moje_skutecne' => 0,
                                    'moje_pokladna' => 0,
                                    'pocet_objednavek' => 0
                                );
                            }
                        }
                        
                        $lp_cerpani[$cislo_lp]['moje_rezervovano'] += $rezervace_podil;
                        $lp_cerpani[$cislo_lp]['moje_predpoklad'] += $predpoklad_podil;
                        $lp_cerpani[$cislo_lp]['moje_skutecne'] += $skutecne_podil;
                        $lp_cerpani[$cislo_lp]['pocet_objednavek']++;
                    }
                }
                
                // KROK 3: Detekovat čerpání z pokladny (pokud uživatel pokladnu má)
                foreach ($lp_cerpani as $cislo_lp => $data) {
                    try {
                        $stmt_pokl = $db->prepare("
                            SELECT COALESCE(SUM(pol.castka_vydaj), 0) as cerpano_pokl
                            FROM " . TBL_POKLADNI_KNIHY . " pkn
                            JOIN " . TBL_POKLADNI_POLOZKY . " pol ON pkn.id = pol.pokladni_kniha_id
                            WHERE pol.lp_kod = :lp_kod
                            AND pkn.rok = :rok
                            AND pkn.stav_knihy IN ('uzavrena_uzivatelem', 'zamknuta_spravcem')
                        ");
                        $stmt_pokl->execute(['lp_kod' => $cislo_lp, 'rok' => $rok]);
                        $pokl_row = $stmt_pokl->fetch(PDO::FETCH_ASSOC);
                        $lp_cerpani[$cislo_lp]['moje_pokladna'] = (float)$pokl_row['cerpano_pokl'];
                    } catch (Exception $e) {
                        $lp_cerpani[$cislo_lp]['moje_pokladna'] = 0;
                    }
                }
                
                // KROK 4: Vypočítat procenta a zbytky
                $lp_list = array();
                foreach ($lp_cerpani as $cislo_lp => $data) {
                    $limit = $data['celkovy_limit'];
                    
                    if ($limit > 0) {
                        $data['procento_rezervace'] = round(($data['moje_rezervovano'] / $limit) * 100, 2);
                        $data['procento_predpoklad'] = round(($data['moje_predpoklad'] / $limit) * 100, 2);
                        $data['procento_skutecne'] = round(($data['moje_skutecne'] / $limit) * 100, 2);
                    } else {
                        $data['procento_rezervace'] = 0;
                        $data['procento_predpoklad'] = 0;
                        $data['procento_skutecne'] = 0;
                    }
                    
                    $lp_list[] = $data;
                }
                
                // Response
                echo json_encode(array(
                    'status' => 'ok',
                    'data' => array(
                        'lp_cerpani' => $lp_list,
                        'objednavky' => $objednavky_list
                    ),
                    'meta' => array(
                        'version' => 'v3.0-PDO',
                        'tri_typy_cerpani' => true,
                        'user_id' => $vytvoril_user_id,
                        'rok' => $rok,
                        'count_lp' => count($lp_list),
                        'count_objednavky' => count($objednavky_list),
                        'timestamp' => date('Y-m-d H:i:s')
                    )
                ));
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // ============================================
        // SMLOUVY MODULE - 7 endpoints
        // ============================================
        
        // Require smlouvy handlers
        if (strpos($endpoint, 'ciselniky/smlouvy') === 0) {
            require_once __DIR__ . '/v2025.03_25/lib/smlouvyHandlers.php';
        }
        
        // POST /api.eeo/ciselniky/smlouvy/list
        if ($endpoint === 'ciselniky/smlouvy/list') {
            if ($request_method === 'POST') {
                handle_ciselniky_smlouvy_list($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/ciselniky/smlouvy/detail
        if ($endpoint === 'ciselniky/smlouvy/detail') {
            if ($request_method === 'POST') {
                handle_ciselniky_smlouvy_detail($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/ciselniky/smlouvy/insert
        if ($endpoint === 'ciselniky/smlouvy/insert') {
            if ($request_method === 'POST') {
                handle_ciselniky_smlouvy_insert($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/ciselniky/smlouvy/update
        if ($endpoint === 'ciselniky/smlouvy/update') {
            if ($request_method === 'POST') {
                handle_ciselniky_smlouvy_update($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/ciselniky/smlouvy/delete
        if ($endpoint === 'ciselniky/smlouvy/delete') {
            if ($request_method === 'POST') {
                handle_ciselniky_smlouvy_delete($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/ciselniky/smlouvy/bulk-import
        if ($endpoint === 'ciselniky/smlouvy/bulk-import') {
            if ($request_method === 'POST') {
                handle_ciselniky_smlouvy_bulk_import($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // POST /api.eeo/ciselniky/smlouvy/prepocet-cerpani
        if ($endpoint === 'ciselniky/smlouvy/prepocet-cerpani') {
            if ($request_method === 'POST') {
                handle_ciselniky_smlouvy_prepocet_cerpani($input, $config, $queries);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // ===============================================
        // SPISOVKA ZPRACOVÁNÍ - Tracking dokumentů
        // ===============================================
        
        // GET/POST /api.eeo/spisovka-zpracovani/list
        if ($endpoint === 'spisovka-zpracovani/list') {
            error_log("🔵 API.PHP: Matched endpoint spisovka-zpracovani/list");
            error_log("🔵 API.PHP: Method: $request_method");
            error_log("🔵 API.PHP: Input: " . json_encode($input));
            error_log("🔵 API.PHP: Config exists: " . (isset($_config) ? 'YES' : 'NO'));
            
            if ($request_method === 'GET' || $request_method === 'POST') {
                error_log("🔵 API.PHP: Calling handle_spisovka_zpracovani_list()");
                handle_spisovka_zpracovani_list($input, $_config);
                error_log("🔵 API.PHP: Function returned");
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use GET or POST.'));
            }
            break;
        }
        
        // GET/POST /api.eeo/spisovka-zpracovani/stats
        if ($endpoint === 'spisovka-zpracovani/stats') {
            if ($request_method === 'GET' || $request_method === 'POST') {
                handle_spisovka_zpracovani_stats($input, $_config);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use GET or POST.'));
            }
            break;
        }
        
        // POST /api.eeo/spisovka-zpracovani/mark
        if ($endpoint === 'spisovka-zpracovani/mark') {
            if ($request_method === 'POST') {
                handle_spisovka_zpracovani_mark($input, $_config);
            } else {
                http_response_code(405);
                echo json_encode(array('status' => 'error', 'message' => 'Method not allowed. Use POST.'));
            }
            break;
        }
        
        // Fallback - endpoint not found
        http_response_code(404);
        echo json_encode(array(
            'err' => 'Endpoint nenalezen',
            'debug' => array(
                'request_uri' => $request_uri,
                'endpoint' => $endpoint,
                'request_method' => $request_method
            )
        ));
        break;
}

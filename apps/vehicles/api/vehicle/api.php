<?php
/**
 * Vehicles API v2 - Hlavní router
 * 
 * Centrální vstupní bod pro všechny API požadavky.
 * 
 * GET endpointy (čtení z DB):
 *   ?action=dbCarsListDetail        - Seznam vozidel s detaily
 *   ?action=dbCarsPosition&carid=X  - Pozice vozidla
 *   ?action=dbCarsKmMonth&carid=X   - KM statistiky vozidla
 * 
 * POST endpointy (synchronizace z WebDispečinku):
 *   action=wdCarsList               - Sync seznam vozidel
 *   action=wdCarsGroup              - Sync skupiny vozidel
 *   action=wdCarsGeneralInfo        - Sync detaily vozidel
 *   action=wdCarsIDPosition         - Sync pozice vozidel
 *   action=wdCarsIDKmMesic          - Sync KM statistiky
 * 
 * @version 2.0
 * @date 2026-04-18
 */

// === CORS a HTTP hlavičky ===
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');

// Preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// === Timezone ===
date_default_timezone_set('Europe/Prague');

// === Autoload knihoven ===
require_once __DIR__ . '/lib/Config.php';
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/ProgressTracker.php';
require_once __DIR__ . '/inc/sql/queries.php';
require_once __DIR__ . '/lib/VehicleHandlers.php';
require_once __DIR__ . '/lib/WebDispecinkClient.php';
require_once __DIR__ . '/lib/WebDispecinkHandlers.php';

// === Načíst konfiguraci ===
try {
    Config::load();
} catch (RuntimeException $e) {
    Response::error('Chyba konfigurace serveru', 500);
}

// === Routing ===
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            handleGetRequest();
            break;

        case 'POST':
            handlePostRequest();
            break;

        default:
            Response::methodNotAllowed('GET, POST');
    }
} catch (Exception $e) {
    error_log("Vehicles API - Neočekávaná chyba: " . $e->getMessage());
    Response::error('Interní chyba serveru', 500);
}

// ============================================================
// GET handler - čtení dat z lokální DB
// ============================================================
function handleGetRequest(): void
{
    $action = $_GET['action'] ?? '';
    $carid = isset($_GET['carid']) ? intval($_GET['carid']) : 0;
    $progressId = $_GET['progressId'] ?? '';

    switch ($action) {
        case 'dbCarsListDetail':
            VehicleHandlers::getCarsListDetail();
            break;

        case 'dbCarsPosition':
            VehicleHandlers::getCarsPosition($carid);
            break;

        case 'dbCarsKmMonth':
            VehicleHandlers::getCarsKmMonth($carid);
            break;

        case 'dbCarsKmMonthAll':
            VehicleHandlers::getCarsKmMonthAll();
            break;

        case 'getSyncProgress':
            VehicleHandlers::getSyncProgress($progressId);
            break;

        default:
            Response::error('Neznámá akce. Dostupné: dbCarsListDetail, dbCarsPosition, dbCarsKmMonth, getSyncProgress', 400);
    }
}

// ============================================================
// POST handler - synchronizace dat z WebDispečinku
// ============================================================
function handlePostRequest(): void
{
    // Podpora JSON i form-data
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
    } else {
        $input = $_POST;
    }

    $action = $input['action'] ?? '';
    $carId = isset($input['id']) ? intval($input['id']) : 0;
    $interval = isset($input['interval']) ? intval($input['interval']) : 1;

    switch ($action) {
        case 'wdCarsGroup':
            WebDispecinkHandlers::syncCarsGroups();
            break;

        case 'wdCarsList':
            WebDispecinkHandlers::syncCarsList();
            break;

        case 'wdCarsGeneralInfo':
            WebDispecinkHandlers::syncCarsGeneralInfo();
            break;

        case 'wdCarsIDPosition':
            WebDispecinkHandlers::syncCarsPositions();
            break;

        case 'wdCarsIDKmMesic':
            $force = !empty($input['force']);
            WebDispecinkHandlers::syncCarsKmMonth($carId, $interval, $force);
            break;

        default:
            Response::error('Neznámá akce. Dostupné: wdCarsList, wdCarsGroup, wdCarsGeneralInfo, wdCarsIDPosition, wdCarsIDKmMesic', 400);
    }
}

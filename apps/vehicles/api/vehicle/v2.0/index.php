<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

date_default_timezone_set('Europe/Prague');

require_once __DIR__ . '/src/Config/Env.php';
require_once __DIR__ . '/src/Config/Database.php';
require_once __DIR__ . '/src/Http/Response.php';
require_once __DIR__ . '/src/Http/Request.php';
require_once __DIR__ . '/src/Security/AuthToken.php';
require_once __DIR__ . '/src/Repository/UserRepository.php';
require_once __DIR__ . '/src/Repository/VehicleRepository.php';
require_once __DIR__ . '/src/Repository/SyncJobRepository.php';
require_once __DIR__ . '/src/Service/EntraBridgeService.php';
require_once __DIR__ . '/src/Service/WebDispecinkClientV2.php';
require_once __DIR__ . '/src/Service/AuthService.php';
require_once __DIR__ . '/src/Service/VehicleService.php';
require_once __DIR__ . '/src/Controller/AuthController.php';
require_once __DIR__ . '/src/Controller/HealthController.php';
require_once __DIR__ . '/src/Controller/VehicleController.php';
require_once __DIR__ . '/src/Controller/SyncController.php';

try {
    Env::load(__DIR__ . '/.env');

    $pdo = Database::connect();
    $request = Request::capture();

    $userRepository = new UserRepository($pdo);
    $vehicleRepository = new VehicleRepository($pdo);
    $syncJobRepository = new SyncJobRepository($pdo);
    $entraBridgeService = new EntraBridgeService();
    $webDispecinkClient = new WebDispecinkClientV2();

    $authService = new AuthService($userRepository, $entraBridgeService);
    $vehicleService = new VehicleService($vehicleRepository, $syncJobRepository, $webDispecinkClient);

    $authController = new AuthController($authService);
    $healthController = new HealthController();
    $vehicleController = new VehicleController($vehicleService);
    $syncController = new SyncController($vehicleService, $authService);

    $method = $request->method;
    $path = $request->path;

    if ($method === 'GET' && $path === '/health') {
        $healthController->check();
        exit;
    }

    if ($method === 'POST' && $path === '/auth/login-local') {
        $authController->loginLocal($request);
        exit;
    }

    if ($method === 'GET' && $path === '/auth/entra-login-url') {
        $authController->entraLoginUrl($request);
        exit;
    }

    if ($method === 'POST' && $path === '/auth/login-entra') {
        $authController->loginEntra($request);
        exit;
    }

    if ($method === 'POST' && $path === '/auth/logout') {
        $authController->logout();
        exit;
    }

    if ($method === 'GET' && $path === '/auth/me') {
        $authController->me($request);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles') {
        $authService->requireAuthenticated($request);
        $vehicleController->list($request);
        exit;
    }

    if ($method === 'GET' && $path === '/stations/addresses') {
        $authService->requireAuthenticated($request);
        $vehicleController->stationAddresses();
        exit;
    }

    if ($method === 'GET' && $path === '/stations/webdispecink-locations') {
        $authService->requireAuthenticated($request);
        $vehicleController->webdispecinkLocations();
        exit;
    }

    if ($method === 'GET' && $path === '/stations/map-vs') {
        $authService->requireAuthenticated($request);
        $vehicleController->stationVsMap();
        exit;
    }

    if ($method === 'POST' && $path === '/stations/addresses/from-webdispecink') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $vehicleController->upsertStationAddressFromWebdispecink($request);
        exit;
    }

    if ($method === 'POST' && $path === '/stations/addresses/update') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $vehicleController->updateStationAddress($request);
        exit;
    }

    if ($method === 'POST' && $path === '/stations/addresses/delete') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $vehicleController->deleteStationAddress($request);
        exit;
    }

    if ($method === 'GET' && $path === '/dashboard/metrics') {
        $authService->requireAuthenticated($request);
        $vehicleController->dashboardMetrics($request);
        exit;
    }

    if ($method === 'GET' && $path === '/dashboard/fleet-forecast') {
        $authService->requireAuthenticated($request);
        $vehicleController->dashboardFleetForecast($request);
        exit;
    }

    if ($method === 'POST' && $path === '/dashboard/fleet-forecast/refresh') {
        $authService->requireAuthenticated($request);
        $vehicleController->refreshDashboardFleetForecast($request);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/detail') {
        $authService->requireAuthenticated($request);
        $vehicleController->detail($request);
        exit;
    }

    if ($method === 'POST' && $path === '/vehicles/detail') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $vehicleController->saveDetail($request);
        exit;
    }

    if ($method === 'POST' && $path === '/sync/vehicles') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $syncController->triggerVehiclesSync();
        exit;
    }

    if ($method === 'POST' && $path === '/sync/vehicles/quick') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $syncController->triggerVehiclesQuickSync();
        exit;
    }

    if ($method === 'GET' && $path === '/sync/progress') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $syncController->getSyncProgress($request);
        exit;
    }

    Response::error('Endpoint nebyl nalezen', 404);
} catch (Throwable $e) {
    error_log('Vehicles v2 API fatal: ' . $e->getMessage());
    Response::error('Interni chyba serveru', 500);
}

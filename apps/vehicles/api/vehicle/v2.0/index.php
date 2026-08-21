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
require_once __DIR__ . '/src/Utils/WebDispecinkDateHelper.php';
require_once __DIR__ . '/src/Security/AuthToken.php';
require_once __DIR__ . '/src/Repository/UserRepository.php';
require_once __DIR__ . '/src/Repository/VehicleRepository.php';
require_once __DIR__ . '/src/Repository/SyncJobRepository.php';
require_once __DIR__ . '/src/Service/EntraBridgeService.php';
require_once __DIR__ . '/src/Service/WebDispecinkClientV2.php';
require_once __DIR__ . '/src/Service/AuthService.php';
require_once __DIR__ . '/src/Service/UserService.php';
require_once __DIR__ . '/src/Service/VehicleService.php';
require_once __DIR__ . '/src/Controller/AuthController.php';
require_once __DIR__ . '/src/Controller/HealthController.php';
require_once __DIR__ . '/src/Controller/UserController.php';
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
    $userService = new UserService($userRepository);
    $vehicleService = new VehicleService($vehicleRepository, $userRepository, $syncJobRepository, $webDispecinkClient);

    $authController = new AuthController($authService);
    $healthController = new HealthController();
    $userController = new UserController($userService);
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

    if ($method === 'POST' && $path === '/auth/change-password') {
        $authController->changePassword($request);
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
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->list($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/drivers') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->drivers($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/drivers/sync-km') {
        $authService->requireAuthenticated($request);
        $vehicleController->syncDriversKm($request);
        exit;
    }

    if ($method === 'POST' && $path === '/drivers/sync-km-vehicle') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->syncDriversKmForVehicle($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/drivers/vehicles-for-sync') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->listVehiclesForDriversSync($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/users') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $userController->list();
        exit;
    }

    if ($method === 'GET' && $path === '/users/vehicles-catalog') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $userController->vehiclesCatalog();
        exit;
    }

    if ($method === 'GET' && $path === '/users/vehicle-assignments') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $userController->assignments($request);
        exit;
    }

    if ($method === 'POST' && $path === '/users/create') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $userController->create($request);
        exit;
    }

    if ($method === 'POST' && $path === '/users/update') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator']);
        $userController->update($request, (int) ($actor['id'] ?? 0));
        exit;
    }

    if ($method === 'POST' && $path === '/users/delete') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator']);
        $userController->delete($request, (int) ($actor['id'] ?? 0));
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

    if ($method === 'GET' && $path === '/lookups') {
        $authService->requireAuthenticated($request);
        $vehicleController->lookups($request);
        exit;
    }

    if ($method === 'POST' && $path === '/lookups/save') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $vehicleController->saveLookup($request);
        exit;
    }

    if ($method === 'POST' && $path === '/lookups/deactivate') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $vehicleController->deactivateLookup($request);
        exit;
    }

    if ($method === 'POST' && $path === '/stations/addresses/from-webdispecink') {
        $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->upsertStationAddressFromWebdispecink($request);
        exit;
    }

    if ($method === 'POST' && $path === '/stations/addresses/update') {
        $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->updateStationAddress($request);
        exit;
    }

    if ($method === 'POST' && $path === '/stations/addresses/create') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $vehicleController->createStationAddress($request);
        exit;
    }

    if ($method === 'POST' && $path === '/stations/addresses/delete') {
        $authService->requireRole($request, ['superadmin', 'administrator']);
        $vehicleController->deleteStationAddress($request);
        exit;
    }

    if ($method === 'GET' && $path === '/dashboard/metrics') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->dashboardMetrics($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/dashboard/fleet-forecast') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->dashboardFleetForecast($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/dashboard/fleet-forecast/refresh') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->refreshDashboardFleetForecast($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/detail') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->detail($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/events') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->events($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/card-history') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->cardHistory($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/attachments') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->attachments($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/service-records') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->serviceRecords($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/equipment') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->equipment($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/insurance-policies') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->insurancePolicies($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/insurance-policies') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->createInsurancePolicy($request, $actor);
        exit;
    }
    if ($method === 'GET' && $path === '/vehicles/claims') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->claims($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/tires') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->tires($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/funding') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->funding($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/funding') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->createFunding($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/funding/update') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->updateFunding($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/funding/delete') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->deleteFunding($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/tires') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->createTires($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/tires/update') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->updateTires($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/tires/delete') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->deleteTires($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/claims') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->createClaim($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/claims/update') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->updateClaim($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/claims/delete') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->deleteClaim($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/vehicles/equipment') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->createEquipment($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/equipment/update') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->updateEquipment($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/equipment/delete') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->deleteEquipment($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/vehicles/insurance-policies/update') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->updateInsurancePolicy($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/insurance-policies/delete') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->deleteInsurancePolicy($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/vehicles/service-records') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->createServiceRecord($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/service-records/update') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->updateServiceRecord($request, $actor);
        exit;
    }
    if ($method === 'POST' && $path === '/vehicles/service-records/delete') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->deleteServiceRecord($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/vehicles/attachments/upload') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->uploadAttachment($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/attachments/download') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->downloadAttachment($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/vehicles/attachments/delete') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->deleteAttachment($request, $actor);
        exit;
    }

    if ($method === 'GET' && $path === '/vehicles/billing/monthly') {
        $actor = $authService->requireAuthenticated($request);
        $vehicleController->monthlyBilling($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/vehicles/detail') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->saveDetail($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/vehicles/bulk/location-state') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->bulkUpdateLocationState($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/vehicles/bulk/status') {
        $actor = $authService->requireRole($request, ['superadmin', 'administrator', 'fleet_manager']);
        $vehicleController->bulkUpdateStatus($request, $actor);
        exit;
    }

    if ($method === 'POST' && $path === '/sync/vehicles') {
        $authService->requireAuthenticated($request);
        $syncController->triggerVehiclesSync();
        exit;
    }

    if ($method === 'POST' && $path === '/sync/vehicles/quick') {
        $authService->requireAuthenticated($request);
        $syncController->triggerVehiclesQuickSync();
        exit;
    }

    if ($method === 'POST' && $path === '/sync/drivers') {
        $authService->requireAuthenticated($request);
        $syncController->triggerDriversSync($request);
        exit;
    }

    if ($method === 'POST' && $path === '/sync/drivers/quick') {
        $authService->requireAuthenticated($request);
        $syncController->triggerDriversQuickSync($request);
        exit;
    }

    if ($method === 'GET' && $path === '/sync/progress') {
        $authService->requireAuthenticated($request);
        $syncController->getSyncProgress($request);
        exit;
    }

    Response::error('Endpoint nebyl nalezen', 404);
} catch (Throwable $e) {
    error_log('Vehicles v2 API fatal: ' . $e->getMessage());
    Response::error('Interni chyba serveru', 500);
}

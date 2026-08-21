<?php

declare(strict_types=1);

final class VehicleController
{
    public function __construct(private VehicleService $vehicles)
    {
    }

    public function list(Request $request, array $actor): void
    {
        $query = trim((string) ($request->query['q'] ?? ''));
        $sortBy = trim((string) ($request->query['sortBy'] ?? 'spz'));
        $sortDir = trim((string) ($request->query['sortDir'] ?? 'asc'));
        $page = (int) ($request->query['page'] ?? 1);
        $perPage = (int) ($request->query['perPage'] ?? 50);
        $statusFilter = trim((string) ($request->query['status'] ?? 'all'));
        $includeFilterOptionsRaw = strtolower(trim((string) ($request->query['includeFilterOptions'] ?? '1')));
        $includeFilterOptions = !in_array($includeFilterOptionsRaw, ['0', 'false', 'no'], true);
        $chartCarIdsRaw = trim((string) ($request->query['chartCarids'] ?? ''));
        $chartCarIds = [];
        if ($chartCarIdsRaw !== '') {
            $parts = array_filter(array_map('trim', explode(',', $chartCarIdsRaw)), static fn(string $value): bool => $value !== '');
            $chartCarIds = array_values(array_unique(array_map('intval', $parts)));
            $chartCarIds = array_values(array_filter($chartCarIds, static fn(int $id): bool => $id > 0));
        }

        $typesRaw = trim((string) ($request->query['types'] ?? ''));
        $callSignsRaw = trim((string) ($request->query['callSigns'] ?? ''));
        $groupsRaw = trim((string) ($request->query['groups'] ?? ''));
        $stationsRaw = trim((string) ($request->query['stations'] ?? ''));
        $locationStatesRaw = trim((string) ($request->query['locationStates'] ?? ''));
        $ccsStatesRaw = trim((string) ($request->query['ccsStates'] ?? ''));
        $ccsExpiryRaw = trim((string) ($request->query['ccsExpiry'] ?? ''));
        $modelsRaw = trim((string) ($request->query['models'] ?? ''));
        $manufacturersRaw = trim((string) ($request->query['manufacturers'] ?? ''));
        $fuelsRaw = trim((string) ($request->query['fuels'] ?? ''));
        $yearsRaw = trim((string) ($request->query['years'] ?? ''));
        $mileageBandsRaw = trim((string) ($request->query['mileageBands'] ?? ''));
        $mileageBandLegacy = trim((string) ($request->query['mileageBand'] ?? ''));

        $types = $typesRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $typesRaw)), static fn(string $value): bool => $value !== ''));
        $callSigns = $callSignsRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $callSignsRaw)), static fn(string $value): bool => $value !== ''));
        $groups = $groupsRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $groupsRaw)), static fn(string $value): bool => $value !== ''));
        $stations = $stationsRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $stationsRaw)), static fn(string $value): bool => $value !== ''));
        $locationStates = $locationStatesRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $locationStatesRaw)), static fn(string $value): bool => $value !== ''));
        $ccsStates = $ccsStatesRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $ccsStatesRaw)), static fn(string $value): bool => $value !== ''));
        $ccsExpiryNormalized = strtolower($ccsExpiryRaw);
        $ccsExpiryFilter = ($ccsExpiryNormalized === 'expiring' || $ccsExpiryNormalized === 'expired')
            ? $ccsExpiryNormalized
            : '';
        $models = $modelsRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $modelsRaw)), static fn(string $value): bool => $value !== ''));
        $manufacturers = $manufacturersRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $manufacturersRaw)), static fn(string $value): bool => $value !== ''));
        $fuels = $fuelsRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $fuelsRaw)), static fn(string $value): bool => $value !== ''));
        $years = $yearsRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $yearsRaw)), static fn(string $value): bool => $value !== ''));
        $mileageBands = $mileageBandsRaw === '' ? [] : array_values(array_filter(array_map('trim', explode(',', $mileageBandsRaw)), static fn(string $value): bool => $value !== ''));

        if ($mileageBandLegacy !== '') {
            $mileageBands[] = $mileageBandLegacy;
        }

        $mileageBands = array_values(array_unique(array_map(static fn(string $value): string => strtoupper(trim($value)), $mileageBands)));

        $result = $this->vehicles->listVehicles(
            $query,
            $sortBy,
            $sortDir,
            $page,
            $perPage,
            $chartCarIds,
            $statusFilter,
            $types,
            $callSigns,
            $groups,
            $stations,
            $locationStates,
            $ccsStates,
            $ccsExpiryFilter,
            $models,
            $manufacturers,
            $fuels,
            $years,
            $mileageBands,
            $includeFilterOptions,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        );

        Response::success($result);
    }

    public function stationAddresses(): void
    {
        $items = $this->vehicles->listStationAddresses();

        Response::success([
            'items' => $items,
            'count' => count($items),
        ]);
    }

    public function webdispecinkLocations(): void
    {
        $items = $this->vehicles->listWebdispecinkLocations();

        Response::success([
            'items' => $items,
            'count' => count($items),
        ]);
    }

    public function stationVsMap(): void
    {
        $items = $this->vehicles->listVsStationsForMap();

        Response::success([
            'items' => $items,
            'count' => count($items),
        ]);
    }

    public function lookups(Request $request): void
    {
        $categoriesRaw = trim((string) ($request->query['categories'] ?? ''));
        $categories = $categoriesRaw === ''
            ? []
            : array_values(array_filter(array_map('trim', explode(',', $categoriesRaw)), static fn(string $value): bool => $value !== ''));

        $includeInactive = in_array(strtolower(trim((string) ($request->query['includeInactive'] ?? ''))), ['1', 'true', 'yes'], true);
        $items = $this->vehicles->listLookupItems($categories, $includeInactive);
        $byCategory = [];
        foreach ($items as $item) {
            $category = strtolower(trim((string) ($item['category'] ?? '')));
            if ($category === '') {
                continue;
            }

            if (!array_key_exists($category, $byCategory)) {
                $byCategory[$category] = [];
            }

            $byCategory[$category][] = $item;
        }

        Response::success([
            'items' => $items,
            'byCategory' => $byCategory,
            'count' => count($items),
        ]);
    }

    public function saveLookup(Request $request): void
    {
        try {
            $item = $this->vehicles->saveLookupItem($request->body);
            Response::success(['item' => $item, 'message' => 'Číselník byl uložen.']);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function deactivateLookup(Request $request): void
    {
        $category = trim((string) ($request->body['category'] ?? ''));
        $code = trim((string) ($request->body['code'] ?? ''));
        if ($category === '' || $code === '') {
            Response::error('Kategorie a kód číselníku jsou povinné.', 422);
            return;
        }
        $changed = $this->vehicles->deactivateLookupItem($category, $code);
        Response::success(['changed' => $changed, 'message' => 'Číselník byl deaktivován.']);
    }

    public function drivers(Request $request, array $actor): void
    {
        $activeOnly = (int) ($request->query['activeOnly'] ?? 1);
        $query = trim((string) ($request->query['q'] ?? ''));
        $year = (int) ($request->query['year'] ?? 0);
        $month = (int) ($request->query['month'] ?? 0);

        $requestedKmMonth = null;
        if ($year >= 2000 && $year <= 2100 && $month >= 1 && $month <= 12) {
            $requestedKmMonth = sprintf('%04d-%02d', $year, $month);
        }

        $items = $this->vehicles->listDrivers(
            $activeOnly === 1,
            $query,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_drivers'] ?? true),
            $requestedKmMonth
        );

        Response::success([
            'items' => $items,
            'count' => count($items),
            'activeOnly' => $activeOnly === 1 ? 1 : 0,
        ]);
    }

    public function syncDriversKm(Request $request): void
    {
        $year = (int) ($request->body['year'] ?? date('Y'));
        $month = (int) ($request->body['month'] ?? date('n'));

        if ($month < 1 || $month > 12) {
            Response::error('Neplatný měsíc (1-12)', 422);
            return;
        }

        if ($year < 2000 || $year > 2100) {
            Response::error('Neplatný rok', 422);
            return;
        }

        $result = $this->vehicles->syncDriversKm($year, $month);

        Response::success([
            'total' => (int) ($result['total'] ?? 0),
            'updated' => (int) ($result['updated'] ?? 0),
            'failed' => (int) ($result['failed'] ?? 0),
            'message' => (string) ($result['message'] ?? 'OK'),
        ]);
    }

    public function syncDriversKmForVehicle(Request $request, array $actor): void
    {
        $logFile = '/tmp/vehicles-sync-debug.log';
        file_put_contents($logFile, sprintf("[%s] Controller START: request body=%s\n", date('Y-m-d H:i:s'), json_encode($request->body)), FILE_APPEND);
        
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        $year = (int) ($request->body['year'] ?? date('Y'));
        $month = (int) ($request->body['month'] ?? date('n'));

        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }

        if ($month < 1 || $month > 12) {
            Response::error('Neplatný měsíc (1-12)', 422);
            return;
        }

        if ($year < 2000 || $year > 2100) {
            Response::error('Neplatný rok', 422);
            return;
        }

        try {
            $result = $this->vehicles->syncDriversKmForVehicle(
                $vehicleId,
                $year,
                $month,
                (int) ($actor['id'] ?? 0),
                (bool) ($actor['has_all_vehicles'] ?? true)
            );

            Response::success($result);
        } catch (\RuntimeException $e) {
            file_put_contents($logFile, sprintf("[%s] Controller caught RuntimeException: %s\n", date('Y-m-d H:i:s'), $e->getMessage()), FILE_APPEND);
            Response::error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            file_put_contents($logFile, sprintf("[%s] Controller caught Throwable: %s in %s:%d\n", date('Y-m-d H:i:s'), $e->getMessage(), $e->getFile(), $e->getLine()), FILE_APPEND);
            Response::error('Interní chyba serveru: ' . $e->getMessage(), 500);
        }
    }

    public function listVehiclesForDriversSync(Request $request, array $actor): void
    {
        $year = (int) ($request->query['year'] ?? date('Y'));
        $month = (int) ($request->query['month'] ?? date('n'));
        $force = filter_var($request->query['force'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($month < 1 || $month > 12) {
            Response::error('Neplatný měsíc (1-12)', 422);
            return;
        }

        if ($year < 2000 || $year > 2100) {
            Response::error('Neplatný rok', 422);
            return;
        }

        $items = $this->vehicles->listVehiclesForDriversSync(
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true),
            $year,
            $month,
            $force
        );

        Response::success([
            'items' => $items,
            'count' => count($items),
        ]);
    }

    public function upsertStationAddressFromWebdispecink(Request $request): void
    {
        $wLn = trim((string) ($request->body['w_ln'] ?? ''));
        $typ = trim((string) ($request->body['typ'] ?? 'VS'));
        $organizace = trim((string) ($request->body['organizace'] ?? 'ZZS SK'));

        if ($wLn === '') {
            Response::error('Parametr w_ln je povinný', 422);
            return;
        }

        try {
            $result = $this->vehicles->upsertStationAddressFromWebdispecink($wLn, $typ, $organizace);
            Response::success([
                'message' => $result['action'] === 'created'
                    ? 'Adresa byla přidána do hlavní tabulky stanovišť.'
                    : 'Adresa byla aktualizována v hlavní tabulce stanovišť.',
                'item' => $result,
            ]);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function updateStationAddress(Request $request): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) {
            Response::error('Parametr id je povinný', 422);
            return;
        }

        try {
            $item = $this->vehicles->updateStationAddressById($id, $request->body);
            Response::success([
                'message' => 'Stanoviště bylo úspěšně upraveno.',
                'item' => $item,
            ]);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function createStationAddress(Request $request): void
    {
        try {
            $item = $this->vehicles->createStationAddress($request->body);
            Response::success([
                'message' => 'Stanoviště bylo úspěšně vytvořeno.',
                'item' => $item,
            ], 201);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function deleteStationAddress(Request $request): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) {
            Response::error('Parametr id je povinný', 422);
            return;
        }

        try {
            $deleted = $this->vehicles->deleteStationAddressById($id);
            Response::success([
                'message' => 'Záznam stanoviště byl smazán.',
                'item' => $deleted,
            ]);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function detail(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }

        $detail = $this->vehicles->getVehicleDetail(
            $vehicleId,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        );
        if ($detail === null) {
            Response::error('Vozidlo nebylo nalezeno', 404);
            return;
        }

        Response::success([
            'item' => $detail,
        ]);
    }

    public function events(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }

        $query = trim((string) ($request->query['q'] ?? ''));
        $limit = (int) ($request->query['limit'] ?? 50);

        $items = $this->vehicles->getVehicleManualEvents(
            $vehicleId,
            $query,
            $limit,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        );

        Response::success([
            'items' => $items,
            'count' => count($items),
        ]);
    }

    public function cardHistory(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }

        $fieldName = trim((string) ($request->query['fieldName'] ?? ''));
        $limit = (int) ($request->query['limit'] ?? 100);
        $items = $this->vehicles->getVehicleCardAudit(
            $vehicleId,
            $fieldName,
            $limit,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        );

        Response::success([
            'items' => $items,
            'count' => count($items),
        ]);
    }

    public function attachments(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }

        $documentTypeCode = trim((string) ($request->query['documentTypeCode'] ?? ''));
        $items = $this->vehicles->getVehicleAttachments(
            $vehicleId,
            $documentTypeCode,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        );

        Response::success([
            'items' => $items,
            'count' => count($items),
        ]);
    }

    public function serviceRecords(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }
        $items = $this->vehicles->getVehicleServiceRecords(
            $vehicleId,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        );
        Response::success(['items' => $items, 'count' => count($items)]);
    }

    public function equipment(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }
        $items = $this->vehicles->getVehicleEquipment($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        Response::success(['items' => $items, 'count' => count($items)]);
    }

    public function insurancePolicies(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) { Response::error('Parametr vehicleId je povinný', 422); return; }
        $items = $this->vehicles->getVehicleInsurancePolicies($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        Response::success(['items' => $items, 'count' => count($items)]);
    }

    public function createInsurancePolicy(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        if ($vehicleId <= 0) { Response::error('Parametr vehicleId je povinný', 422); return; }
        try {
            $existing = $this->vehicles->getVehicleDetail($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($existing === null) { Response::error('Vozidlo nebylo nalezeno', 404); return; }
            $id = $this->vehicles->createVehicleInsurancePolicy($vehicleId, $request->body, (int) ($actor['id'] ?? 0));
            Response::success(['message' => 'Pojistná smlouva byla uložena.', 'id' => $id], 201);
        } catch (RuntimeException $e) { Response::error($e->getMessage(), 422); }
    }

    public function claims(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) { Response::error('Parametr vehicleId je povinný', 422); return; }
        $items = $this->vehicles->getVehicleClaims($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        Response::success(['items' => $items, 'count' => count($items)]);
    }

    public function tires(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) { Response::error('Parametr vehicleId je povinný', 422); return; }
        $items = $this->vehicles->getVehicleTires($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        Response::success(['items' => $items, 'count' => count($items)]);
    }

    public function funding(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) { Response::error('Parametr vehicleId je povinný', 422); return; }
        $items = $this->vehicles->getVehicleFunding($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        Response::success(['items' => $items, 'count' => count($items)]);
    }

    public function createFunding(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        if ($vehicleId <= 0) { Response::error('Parametr vehicleId je povinný', 422); return; }
        try {
            $existing = $this->vehicles->getVehicleDetail($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($existing === null) { Response::error('Vozidlo nebylo nalezeno', 404); return; }
            $id = $this->vehicles->createVehicleFunding($vehicleId, $request->body, (int) ($actor['id'] ?? 0));
            Response::success(['message' => 'Financování bylo uloženo.', 'id' => $id], 201);
        } catch (RuntimeException $e) { Response::error($e->getMessage(), 422); }
    }

    public function updateFunding(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        try {
            $item = $this->vehicles->updateVehicleFunding($id, $request->body, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($item === null) { Response::error('Záznam financování nebyl nalezen', 404); return; }
            Response::success(['message' => 'Financování bylo upraveno.', 'item' => $item]);
        } catch (RuntimeException $e) { Response::error($e->getMessage(), 422); }
    }

    public function deleteFunding(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        $deleted = $this->vehicles->deleteVehicleFunding($id, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        if (!$deleted) { Response::error('Záznam financování nebyl nalezen', 404); return; }
        Response::success(['message' => 'Financování bylo smazáno.']);
    }

    public function createTires(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        if ($vehicleId <= 0) { Response::error('Parametr vehicleId je povinný', 422); return; }
        try {
            $existing = $this->vehicles->getVehicleDetail($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($existing === null) { Response::error('Vozidlo nebylo nalezeno', 404); return; }
            $id = $this->vehicles->createVehicleTires($vehicleId, $request->body, (int) ($actor['id'] ?? 0));
            Response::success(['message' => 'Sada pneumatik byla uložena.', 'id' => $id], 201);
        } catch (RuntimeException $e) { Response::error($e->getMessage(), 422); }
    }

    public function updateTires(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        try {
            $item = $this->vehicles->updateVehicleTires($id, $request->body, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($item === null) { Response::error('Sada pneumatik nebyla nalezena', 404); return; }
            Response::success(['message' => 'Sada pneumatik byla upravena.', 'item' => $item]);
        } catch (RuntimeException $e) { Response::error($e->getMessage(), 422); }
    }

    public function deleteTires(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        $deleted = $this->vehicles->deleteVehicleTires($id, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        if (!$deleted) { Response::error('Sada pneumatik nebyla nalezena', 404); return; }
        Response::success(['message' => 'Sada pneumatik byla smazána.']);
    }

    public function createClaim(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        if ($vehicleId <= 0) { Response::error('Parametr vehicleId je povinný', 422); return; }
        try {
            $existing = $this->vehicles->getVehicleDetail($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($existing === null) { Response::error('Vozidlo nebylo nalezeno', 404); return; }
            $id = $this->vehicles->createVehicleClaim($vehicleId, $request->body, (int) ($actor['id'] ?? 0));
            Response::success(['message' => 'Škodní událost byla uložena.', 'id' => $id], 201);
        } catch (RuntimeException $e) { Response::error($e->getMessage(), 422); }
    }

    public function updateClaim(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        try {
            $item = $this->vehicles->updateVehicleClaim($id, $request->body, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($item === null) { Response::error('Škodní událost nebyla nalezena', 404); return; }
            Response::success(['message' => 'Škodní událost byla upravena.', 'item' => $item]);
        } catch (RuntimeException $e) { Response::error($e->getMessage(), 422); }
    }

    public function deleteClaim(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        $deleted = $this->vehicles->deleteVehicleClaim($id, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        if (!$deleted) { Response::error('Škodní událost nebyla nalezena', 404); return; }
        Response::success(['message' => 'Škodní událost byla smazána.']);
    }

    public function createEquipment(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }
        try {
            $existing = $this->vehicles->getVehicleDetail($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($existing === null) {
                Response::error('Vozidlo nebylo nalezeno', 404);
                return;
            }
            $id = $this->vehicles->createVehicleEquipment($vehicleId, $request->body, (int) ($actor['id'] ?? 0));
            Response::success(['message' => 'Vybavení bylo uloženo.', 'id' => $id], 201);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function updateEquipment(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        try {
            $item = $this->vehicles->updateVehicleEquipment($id, $request->body, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($item === null) { Response::error('Vybavení nebylo nalezeno', 404); return; }
            Response::success(['message' => 'Vybavení bylo upraveno.', 'item' => $item]);
        } catch (RuntimeException $e) { Response::error($e->getMessage(), 422); }
    }

    public function deleteEquipment(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        $deleted = $this->vehicles->deleteVehicleEquipment($id, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        if (!$deleted) { Response::error('Vybavení nebylo nalezeno', 404); return; }
        Response::success(['message' => 'Vybavení bylo smazáno.']);
    }

    public function createServiceRecord(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }
        try {
            $existing = $this->vehicles->getVehicleDetail($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($existing === null) {
                Response::error('Vozidlo nebylo nalezeno', 404);
                return;
            }
            $id = $this->vehicles->createVehicleServiceRecord($vehicleId, $request->body, (int) ($actor['id'] ?? 0));
            Response::success(['message' => 'Servisní záznam byl uložen.', 'id' => $id], 201);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function updateServiceRecord(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        try {
            $item = $this->vehicles->updateVehicleServiceRecord($id, $request->body, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($item === null) { Response::error('Servisní záznam nebyl nalezen', 404); return; }
            Response::success(['message' => 'Servisní záznam byl upraven.', 'item' => $item]);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function deleteServiceRecord(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        $deleted = $this->vehicles->deleteVehicleServiceRecord($id, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        if (!$deleted) { Response::error('Servisní záznam nebyl nalezen', 404); return; }
        Response::success(['message' => 'Servisní záznam byl smazán.']);
    }

    public function updateInsurancePolicy(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        try {
            $item = $this->vehicles->updateVehicleInsurancePolicy($id, $request->body, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($item === null) { Response::error('Pojistná smlouva nebyla nalezena', 404); return; }
            Response::success(['message' => 'Pojistná smlouva byla upravena.', 'item' => $item]);
        } catch (RuntimeException $e) { Response::error($e->getMessage(), 422); }
    }

    public function deleteInsurancePolicy(Request $request, array $actor): void
    {
        $id = (int) ($request->body['id'] ?? 0);
        if ($id <= 0) { Response::error('Parametr id je povinný', 422); return; }
        $deleted = $this->vehicles->deleteVehicleInsurancePolicy($id, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        if (!$deleted) { Response::error('Pojistná smlouva nebyla nalezena', 404); return; }
        Response::success(['message' => 'Pojistná smlouva byla smazána.']);
    }

    public function uploadAttachment(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        $file = $_FILES['file'] ?? [];
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }

        try {
            $existing = $this->vehicles->getVehicleDetail($vehicleId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
            if ($existing === null) {
                Response::error('Vozidlo nebylo nalezeno', 404);
                return;
            }
            $item = $this->vehicles->uploadVehicleAttachment($vehicleId, $file, $request->body, (int) ($actor['id'] ?? 0));
            Response::success(['message' => 'Příloha byla uložena.', 'item' => $item], 201);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function downloadAttachment(Request $request, array $actor): void
    {
        $attachmentId = (int) ($request->query['id'] ?? 0);
        $item = $this->vehicles->findVehicleAttachment($attachmentId, (int) ($actor['id'] ?? 0), (bool) ($actor['has_all_vehicles'] ?? true));
        if ($item === null) {
            Response::error('Příloha nebyla nalezena', 404);
            return;
        }

        $root = rtrim(Env::get('VEHICLES_V2_ATTACHMENT_ROOT', '/var/www/erdms-dev/data/vehicles-v2/attachments'), '/');
        $rootReal = realpath($root);
        $pathReal = realpath($root . '/' . ltrim((string) $item['storage_key'], '/'));
        if ($rootReal === false || $pathReal === false || !str_starts_with($pathReal, $rootReal . DIRECTORY_SEPARATOR) || !is_file($pathReal)) {
            Response::error('Soubor přílohy není dostupný', 404);
            return;
        }

        header('Content-Type: ' . $item['mime_type']);
        header('Content-Length: ' . (string) filesize($pathReal));
        header('Content-Disposition: attachment; filename="' . addcslashes((string) $item['original_filename'], "\\\"") . '"');
        readfile($pathReal);
    }

    public function deleteAttachment(Request $request, array $actor): void
    {
        $attachmentId = (int) ($request->body['id'] ?? 0);
        if ($attachmentId <= 0) {
            Response::error('Parametr id je povinný', 422);
            return;
        }

        $item = $this->vehicles->deleteVehicleAttachment(
            $attachmentId,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        );
        if ($item === null) {
            Response::error('Příloha nebyla nalezena', 404);
            return;
        }

        Response::success(['message' => 'Příloha byla označena jako smazaná.']);
    }

    public function monthlyBilling(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        $year = (int) ($request->query['year'] ?? date('Y'));
        $month = (int) ($request->query['month'] ?? date('m'));

        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }

        if ($year < 2000 || $year > 2100) {
            Response::error('Parametr year je mimo povolený rozsah', 422);
            return;
        }

        if ($month < 1 || $month > 12) {
            Response::error('Parametr month musí být číslo 1-12', 422);
            return;
        }

        try {
            $payload = $this->vehicles->getMonthlyBilling(
                $vehicleId,
                $year,
                $month,
                (int) ($actor['id'] ?? 0),
                (bool) ($actor['has_all_vehicles'] ?? true)
            );

            Response::success($payload);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function saveDetail(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinný', 422);
            return;
        }

        $existing = $this->vehicles->getVehicleDetail(
            $vehicleId,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        );
        if ($existing === null) {
            Response::error('Vozidlo nebylo nalezeno', 404);
            return;
        }

        $this->vehicles->saveVehicleDetail($vehicleId, $request->body, (int) ($actor['id'] ?? 0));
        $updated = $this->vehicles->getVehicleDetail(
            $vehicleId,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        );

        Response::success([
            'message' => 'Detail vozidla byl uložen',
            'item' => $updated,
        ]);
    }

    public function bulkUpdateLocationState(Request $request, array $actor): void
    {
        $locationState = trim((string) ($request->body['locationState'] ?? ''));
        $serviceContext = $request->body['serviceContext'] ?? null;
        $serviceNote = trim((string) ($request->body['serviceNote'] ?? ''));
        $operationType = trim((string) ($request->body['operationType'] ?? ''));
        $cancelReason = trim((string) ($request->body['cancelReason'] ?? ''));
        $vehicleIdsRaw = $request->body['vehicleIds'] ?? [];

        $vehicleIds = [];
        if (is_array($vehicleIdsRaw)) {
            $vehicleIds = $vehicleIdsRaw;
        } elseif (is_string($vehicleIdsRaw)) {
            $vehicleIds = array_filter(array_map('trim', explode(',', $vehicleIdsRaw)), static fn(string $value): bool => $value !== '');
        }

        if ($vehicleIds === []) {
            Response::error('Parametr vehicleIds je povinný a musí obsahovat alespoň jedno vozidlo', 422);
            return;
        }

        if ($locationState === '') {
            Response::error('Parametr locationState je povinný', 422);
            return;
        }

        try {
            $updatedCount = $this->vehicles->bulkUpdateLocationState(
                $vehicleIds,
                $locationState,
                $serviceContext,
                $serviceNote,
                $operationType !== '' ? $operationType : null,
                $cancelReason !== '' ? $cancelReason : null,
                (int) ($actor['id'] ?? 0),
                (bool) ($actor['has_all_vehicles'] ?? true)
            );

            Response::success([
                'message' => sprintf('Hromadná změna polohy byla uložena (%d vozidel).', $updatedCount),
                'updatedCount' => $updatedCount,
                'locationState' => $locationState,
            ]);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function bulkUpdateStatus(Request $request, array $actor): void
    {
        $status = trim((string) ($request->body['status'] ?? ''));
        $statusReason = trim((string) ($request->body['statusReason'] ?? ''));
        $statusNote = trim((string) ($request->body['statusNote'] ?? ''));
        $vehicleIdsRaw = $request->body['vehicleIds'] ?? [];

        $vehicleIds = [];
        if (is_array($vehicleIdsRaw)) {
            $vehicleIds = $vehicleIdsRaw;
        } elseif (is_string($vehicleIdsRaw)) {
            $vehicleIds = array_filter(array_map('trim', explode(',', $vehicleIdsRaw)), static fn(string $value): bool => $value !== '');
        }

        if ($vehicleIds === []) {
            Response::error('Parametr vehicleIds je povinný a musí obsahovat alespoň jedno vozidlo', 422);
            return;
        }

        if ($status === '') {
            Response::error('Parametr status je povinný', 422);
            return;
        }

        try {
            $updatedCount = $this->vehicles->bulkUpdateStatus(
                $vehicleIds,
                $status,
                $statusReason !== '' ? $statusReason : null,
                $statusNote !== '' ? $statusNote : null,
                (int) ($actor['id'] ?? 0),
                (bool) ($actor['has_all_vehicles'] ?? true)
            );

            Response::success([
                'message' => sprintf('Hromadná změna stavu byla uložena (%d vozidel).', $updatedCount),
                'updatedCount' => $updatedCount,
                'status' => $status,
            ]);
        } catch (RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function dashboardMetrics(Request $request, array $actor): void
    {
        $status = trim((string) ($request->query['status'] ?? 'all'));
        Response::success($this->vehicles->getDashboardMetrics(
            $status,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        ));
    }

    public function dashboardFleetForecast(Request $request, array $actor): void
    {
        $months = (int) ($request->query['months'] ?? 3);
        $status = trim((string) ($request->query['status'] ?? 'aktivni'));

        Response::success($this->vehicles->getFleetMileageForecast(
            $months,
            $status,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        ));
    }

    public function refreshDashboardFleetForecast(Request $request, array $actor): void
    {
        $months = (int) ($request->body['months'] ?? 3);
        Response::success($this->vehicles->refreshFleetMileageForecastData(
            $months,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        ));
    }
}

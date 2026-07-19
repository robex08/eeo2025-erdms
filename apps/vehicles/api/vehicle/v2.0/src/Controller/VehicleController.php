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
            Response::error('Parametr vehicleId je povinny', 422);
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

    public function saveDetail(Request $request, array $actor): void
    {
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinny', 422);
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

        $this->vehicles->saveVehicleDetail($vehicleId, $request->body);
        $updated = $this->vehicles->getVehicleDetail(
            $vehicleId,
            (int) ($actor['id'] ?? 0),
            (bool) ($actor['has_all_vehicles'] ?? true)
        );

        Response::success([
            'message' => 'Detail vozidla byl ulozen',
            'item' => $updated,
        ]);
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

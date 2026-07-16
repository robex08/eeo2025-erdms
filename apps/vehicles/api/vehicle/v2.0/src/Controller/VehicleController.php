<?php

declare(strict_types=1);

final class VehicleController
{
    public function __construct(private VehicleService $vehicles)
    {
    }

    public function list(Request $request): void
    {
        $query = trim((string) ($request->query['q'] ?? ''));
        $sortBy = trim((string) ($request->query['sortBy'] ?? 'spz'));
        $sortDir = trim((string) ($request->query['sortDir'] ?? 'asc'));
        $page = (int) ($request->query['page'] ?? 1);
        $perPage = (int) ($request->query['perPage'] ?? 50);

        $result = $this->vehicles->listVehicles($query, $sortBy, $sortDir, $page, $perPage);

        Response::success($result);
    }

    public function detail(Request $request): void
    {
        $vehicleId = (int) ($request->query['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinny', 422);
            return;
        }

        $detail = $this->vehicles->getVehicleDetail($vehicleId);
        if ($detail === null) {
            Response::error('Vozidlo nebylo nalezeno', 404);
            return;
        }

        Response::success([
            'item' => $detail,
        ]);
    }

    public function saveDetail(Request $request): void
    {
        $vehicleId = (int) ($request->body['vehicleId'] ?? 0);
        if ($vehicleId <= 0) {
            Response::error('Parametr vehicleId je povinny', 422);
            return;
        }

        $existing = $this->vehicles->getVehicleDetail($vehicleId);
        if ($existing === null) {
            Response::error('Vozidlo nebylo nalezeno', 404);
            return;
        }

        $this->vehicles->saveVehicleDetail($vehicleId, $request->body);
        $updated = $this->vehicles->getVehicleDetail($vehicleId);

        Response::success([
            'message' => 'Detail vozidla byl ulozen',
            'item' => $updated,
        ]);
    }

    public function dashboardMetrics(): void
    {
        Response::success($this->vehicles->getDashboardMetrics());
    }

    public function dashboardFleetForecast(Request $request): void
    {
        $months = (int) ($request->query['months'] ?? 3);
        $status = trim((string) ($request->query['status'] ?? 'aktivni'));

        Response::success($this->vehicles->getFleetMileageForecast($months, $status));
    }

    public function refreshDashboardFleetForecast(Request $request): void
    {
        $months = (int) ($request->body['months'] ?? 3);
        Response::success($this->vehicles->refreshFleetMileageForecastData($months));
    }
}

<?php

declare(strict_types=1);

final class SyncController
{
    public function __construct(
        private VehicleService $vehicles,
        private AuthService $auth
    ) {
    }

    public function triggerVehiclesSync(): void
    {
        try {
            $result = $this->vehicles->runCarsListMigrationSync();
            Response::success([
                'message' => $result['message'],
                'jobId' => $result['jobId'],
                'affectedRows' => $result['affectedRows'],
            ], 202);
        } catch (Throwable $e) {
            Response::error('Synchronizace selhala: ' . $e->getMessage(), 500);
        }
    }

    public function triggerVehiclesQuickSync(): void
    {
        try {
            $result = $this->vehicles->runCarsListMigrationSync(false);
            Response::success([
                'message' => $result['message'],
                'jobId' => $result['jobId'],
                'affectedRows' => $result['affectedRows'],
            ], 202);
        } catch (Throwable $e) {
            Response::error('Rychlá synchronizace selhala: ' . $e->getMessage(), 500);
        }
    }

    public function triggerDriversSync(Request $request): void
    {
        $activeOnly = (int) ($request->body['activeOnly'] ?? $request->query['activeOnly'] ?? 0);

        try {
            $result = $this->vehicles->runDriversSync($activeOnly === 1);
            Response::success([
                'message' => $result['message'],
                'affectedRows' => $result['affectedRows'],
                'count' => $result['count'],
                'inserted' => $result['inserted'] ?? 0,
                'updated' => $result['updated'] ?? 0,
                'unchanged' => $result['unchanged'] ?? 0,
                'activeOnly' => $activeOnly === 1 ? 1 : 0,
            ], 202);
        } catch (Throwable $e) {
            Response::error('Synchronizace řidičů selhala: ' . $e->getMessage(), 500);
        }
    }

    public function triggerDriversQuickSync(Request $request): void
    {
        $request->body['activeOnly'] = 1;
        $this->triggerDriversSync($request);
    }

    public function getSyncProgress(Request $request): void
    {
        $jobId = (int) ($request->query['jobId'] ?? 0);
        if ($jobId <= 0) {
            Response::error('Chybi nebo je neplatne jobId', 422);
            return;
        }

        $job = $this->vehicles->getSyncProgress($jobId);
        if ($job === null) {
            Response::error('Sync job nebyl nalezen', 404);
            return;
        }

        Response::success([
            'job' => $job,
        ]);
    }
}

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

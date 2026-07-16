<?php

declare(strict_types=1);

final class VehicleService
{
    public function __construct(
        private VehicleRepository $vehicles,
        private SyncJobRepository $syncJobs,
        private WebDispecinkClientV2 $webDispecink
    ) {
    }

    public function listVehicles(
        string $query = '',
        string $sortBy = 'spz',
        string $sortDir = 'asc',
        int $page = 1,
        int $perPage = 50
    ): array
    {
        return $this->vehicles->listVehicles($query, $sortBy, $sortDir, $page, $perPage);
    }

    public function runCarsListMigrationSync(): array
    {
        $jobId = $this->syncJobs->createJob('webdispecink_sync', 'running', 'Synchronizace z WebDispecinku byla spustena');

        try {
            $warnings = [];
            $groupsUpdated = 0;
            try {
                $groups = $this->webDispecink->getCarsGroups();
                $groupsUpdated = $this->vehicles->upsertCarsGroupsFromWebDispecink($groups);
            } catch (Throwable $e) {
                $warnings[] = 'groupy: ' . $e->getMessage();
                error_log('Vehicles v2 groups sync: ' . $e->getMessage());
            }

            $cars = $this->webDispecink->getCarsList();
            if ($cars === []) {
                throw new RuntimeException('WebDispecink nevratil zadna vozidla. Synchronizace zastavena.');
            }

            $upserted = $this->vehicles->upsertCarsFromWebDispecink($cars);
            $returnedCarIds = array_values(array_unique(array_map(static fn(array $car): int => (int) ($car['carid'] ?? 0), $cars)));
            $retired = $this->vehicles->markCarsMissingFromWebDispecinkAsRetired($returnedCarIds);

            $generalInfo = $this->webDispecink->getCarsGeneralInfoByIds($returnedCarIds);
            $detailUpdated = $this->vehicles->upsertGeneralInfoFromWebDispecink($generalInfo);
            $typeUpdated = $this->vehicles->upsertZzsTypFromLegacyCarsList();

            $positionsSaved = 0;
            $kmSaved = 0;

            try {
                $positions = $this->webDispecink->getCarsPositionsByIds($returnedCarIds);
                $positionsSaved = $this->vehicles->insertCarsPositionsSnapshot($positions);
            } catch (Throwable $e) {
                $warnings[] = 'pozice: ' . $e->getMessage();
                error_log('Vehicles v2 positions sync: ' . $e->getMessage());
            }

            $kmMonthlyEnabled = Env::get('VEHICLES_V2_SYNC_KM_MONTHLY', '1') === '1';
            if ($kmMonthlyEnabled) {
                try {
                    $kmIntervals = $this->parseKmIntervals(Env::get('VEHICLES_V2_SYNC_KM_INTERVALS', '1,3,5'));
                    $totalKmSaved = 0;
                    foreach ($kmIntervals as $intervalMonths) {
                        $kmRows = $this->webDispecink->getCarsKmStatsByIds($returnedCarIds, $intervalMonths);
                        $totalKmSaved += $this->vehicles->replaceCarsKmMonthlyStats($kmRows, $intervalMonths);
                    }
                    $kmSaved = $totalKmSaved;
                } catch (Throwable $e) {
                    $warnings[] = 'km: ' . $e->getMessage();
                    error_log('Vehicles v2 km sync: ' . $e->getMessage());
                }
            }

            $affected = $upserted;
            $message = sprintf(
                'WebDispecink sync dokoncen: %d skupin aktualizovano, %d vozidel synchronizovano, %d vozidel oznaceno jako vyrazene, %d detailu aktualizovano, %d typu doplneno, %d pozic ulozeno, %d km zaznamu aktualizovano',
                $groupsUpdated,
                $upserted,
                $retired,
                $detailUpdated,
                $typeUpdated,
                $positionsSaved,
                $kmSaved
            );

            if ($warnings !== []) {
                $message .= ' (upozorneni: ' . implode('; ', $warnings) . ')';
            }

            try {
                $this->syncJobs->completeJob($jobId, 'done', $message);
            } catch (Throwable $logError) {
                error_log('Vehicles v2 sync completeJob(done) failed: ' . $logError->getMessage());
            }

            return [
                'jobId' => $jobId,
                'affectedRows' => $affected,
                'message' => $message,
            ];
        } catch (Throwable $e) {
            try {
                $this->syncJobs->completeJob($jobId, 'failed', $e->getMessage());
            } catch (Throwable $logError) {
                error_log('Vehicles v2 sync completeJob(failed) failed: ' . $logError->getMessage());
            }
            throw $e;
        }
    }

    public function getSyncProgress(int $jobId): ?array
    {
        return $this->syncJobs->findById($jobId);
    }

    public function getVehicleDetail(int $vehicleId): ?array
    {
        return $this->vehicles->getVehicleDetailById($vehicleId);
    }

    public function getDashboardMetrics(): array
    {
        return $this->vehicles->getDashboardMetrics();
    }

    public function getFleetMileageForecast(int $months, string $status): array
    {
        $defaultMonths = (int) Env::get('VEHICLES_V2_FLEET_FORECAST_MONTHS_DEFAULT', '3');
        $normalizedMonths = $months > 0 ? $months : $defaultMonths;

        return $this->vehicles->getFleetMileageForecast($normalizedMonths, $status);
    }

    public function refreshFleetMileageForecastData(int $months): array
    {
        $defaultMonths = (int) Env::get('VEHICLES_V2_FLEET_FORECAST_MONTHS_DEFAULT', '3');
        $months = $months > 0 ? $months : $defaultMonths;
        $months = max(1, min(24, $months));

        $cars = $this->webDispecink->getCarsList();
        if ($cars === []) {
            throw new RuntimeException('WebDispecink nevratil zadna vozidla.');
        }

        $carIds = array_values(array_unique(array_map(static fn(array $car): int => (int) ($car['carid'] ?? 0), $cars)));
        $carIds = array_values(array_filter($carIds, static fn(int $id): bool => $id > 0));
        if ($carIds === []) {
            throw new RuntimeException('Nepodarilo se ziskat ID vozidel pro obnovu predikce.');
        }

        $kmRows = $this->webDispecink->getCarsKmStatsByIds($carIds, $months);
        $saved = $this->vehicles->replaceCarsKmMonthlyStats($kmRows, $months);

        return [
            'message' => sprintf('Data pro predikci byla aktualizovana (%d mesicu, %d vozidel).', $months, $saved),
            'months' => $months,
            'savedRows' => $saved,
        ];
    }

    public function saveVehicleDetail(int $vehicleId, array $payload): void
    {
        $normalized = [
            'zzs_typ' => $this->normalizeShortText((string) ($payload['zzs_typ'] ?? '')),
            'service_notes' => trim((string) ($payload['service_notes'] ?? '')),
            'equipment_json' => $this->normalizeJson((string) ($payload['equipment_json'] ?? '')),
            'technical_notes' => trim((string) ($payload['technical_notes'] ?? '')),
            'insurance_policy' => trim((string) ($payload['insurance_policy'] ?? '')),
            'stk_valid_to' => $this->normalizeDate((string) ($payload['stk_valid_to'] ?? '')),
            'emission_valid_to' => $this->normalizeDate((string) ($payload['emission_valid_to'] ?? '')),
        ];

        $this->vehicles->saveVehicleDetailById($vehicleId, $normalized);
    }

    private function normalizeDate(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 ? $value : null;
    }

    private function normalizeJson(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $decoded = json_decode($value, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        return json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function normalizeShortText(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        return mb_substr($value, 0, 100);
    }

    private function parseKmIntervals(string $raw): array
    {
        $parts = array_filter(array_map('trim', explode(',', $raw)), static fn(string $value): bool => $value !== '');
        if ($parts === []) {
            return [1, 3, 5];
        }

        $intervals = [];
        foreach ($parts as $part) {
            $interval = (int) $part;
            if ($interval >= 1 && $interval <= 24) {
                $intervals[] = $interval;
            }
        }

        $intervals = array_values(array_unique($intervals));
        sort($intervals);

        return $intervals !== [] ? $intervals : [1, 3, 5];
    }
}

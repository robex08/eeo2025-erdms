<?php

declare(strict_types=1);

final class VehicleService
{
    public function __construct(
        private VehicleRepository $vehicles,
        private UserRepository $users,
        private SyncJobRepository $syncJobs,
        private WebDispecinkClientV2 $webDispecink
    ) {
    }

    public function listVehicles(
        string $query = '',
        string $sortBy = 'spz',
        string $sortDir = 'asc',
        int $page = 1,
        int $perPage = 50,
        array $chartCarIds = [],
        string $statusFilter = 'all',
        array $types = [],
        array $callSigns = [],
        array $groups = [],
        array $stations = [],
        array $locationStates = [],
        array $models = [],
        array $manufacturers = [],
        array $fuels = [],
        array $years = [],
        array $mileageBands = [],
        bool $includeFilterOptions = true,
        int $actorUserId = 0,
        bool $actorHasAllVehicles = true
    ): array
    {
        return $this->vehicles->listVehicles(
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
            $models,
            $manufacturers,
            $fuels,
            $years,
            $mileageBands,
            $includeFilterOptions,
            $actorUserId,
            $actorHasAllVehicles
        );
    }

    public function listStationAddresses(): array
    {
        return $this->vehicles->listStationAddresses();
    }

    public function listWebdispecinkLocations(): array
    {
        return $this->vehicles->listWebdispecinkLocations();
    }

    public function listVsStationsForMap(): array
    {
        return $this->vehicles->listVsStationsForMap();
    }

    public function listLookupItems(array $categories = []): array
    {
        return $this->vehicles->listLookupItems($categories);
    }

    public function upsertStationAddressFromWebdispecink(string $wLn, string $typ, string $organizace = 'ZZS SK'): array
    {
        return $this->vehicles->upsertStationAddressFromWebdispecink($wLn, $typ, $organizace);
    }

    public function updateStationAddressById(int $id, array $payload): array
    {
        return $this->vehicles->updateStationAddressById($id, $payload);
    }

    public function createStationAddress(array $payload): array
    {
        return $this->vehicles->createStationAddress($payload);
    }

    public function deleteStationAddressById(int $id): array
    {
        return $this->vehicles->deleteStationAddressById($id);
    }

    public function runCarsListMigrationSync(bool $includeKmMonthly = true): array
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

            $kmMonthlyEnabled = $includeKmMonthly && Env::get('VEHICLES_V2_SYNC_KM_MONTHLY', '1') === '1';
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
            $scopedUsersRebuilt = 0;
            try {
                $scopedUsersRebuilt = $this->users->rebuildUserVehicleAssignmentsForAllScopedUsers();
            } catch (Throwable $e) {
                $warnings[] = 'scope-prirazeni: ' . $e->getMessage();
                error_log('Vehicles v2 scoped assignments rebuild: ' . $e->getMessage());
            }

            $message = sprintf(
                'WebDispečink sync dokončen: %d skupin aktualizováno, %d vozidel synchronizováno, %d vozidel označeno jako vyřazené, %d detailů aktualizováno, %d typů doplněno, %d pozic uloženo, %d km záznamů aktualizováno, scope přepočítán pro %d uživatelů',
                $groupsUpdated,
                $upserted,
                $retired,
                $detailUpdated,
                $typeUpdated,
                $positionsSaved,
                $kmSaved,
                $scopedUsersRebuilt
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

    public function getVehicleDetail(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): ?array
    {
        return $this->vehicles->getVehicleDetailById($vehicleId, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleManualEvents(
        int $vehicleId,
        string $query = '',
        int $limit = 50,
        int $actorUserId = 0,
        bool $actorHasAllVehicles = true
    ): array {
        return $this->vehicles->listVehicleManualEvents($vehicleId, $query, $limit, $actorUserId, $actorHasAllVehicles);
    }

    public function getDashboardMetrics(string $status = 'all', int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        return $this->vehicles->getDashboardMetrics($status, $actorUserId, $actorHasAllVehicles);
    }

    public function getFleetMileageForecast(int $months, string $status, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        $defaultMonths = (int) Env::get('VEHICLES_V2_FLEET_FORECAST_MONTHS_DEFAULT', '3');
        $normalizedMonths = $months > 0 ? $months : $defaultMonths;
        $primary = $this->vehicles->getFleetMileageForecast($normalizedMonths, $status, $actorUserId, $actorHasAllVehicles);
        $withData = (int) (($primary['summary']['withData'] ?? 0));

        if ($withData > 0 || $normalizedMonths === $defaultMonths) {
            $primary['requestedMonths'] = $normalizedMonths;
            $primary['usedMonths'] = (int) ($primary['months'] ?? $normalizedMonths);
            $primary['usedFallback'] = false;
            return $primary;
        }

        $fallback = $this->vehicles->getFleetMileageForecast($defaultMonths, $status, $actorUserId, $actorHasAllVehicles);
        $fallback['requestedMonths'] = $normalizedMonths;
        $fallback['usedMonths'] = (int) ($fallback['months'] ?? $defaultMonths);
        $fallback['usedFallback'] = true;
        $fallback['fallbackMessage'] = sprintf(
            'Pro %d měsíce nejsou dostupná data, použit je interval %d měsíce.',
            $normalizedMonths,
            (int) ($fallback['months'] ?? $defaultMonths)
        );

        return $fallback;
    }

    public function refreshFleetMileageForecastData(int $months, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        $defaultMonths = (int) Env::get('VEHICLES_V2_FLEET_FORECAST_MONTHS_DEFAULT', '3');
        $months = $months > 0 ? $months : $defaultMonths;
        $months = max(1, min(24, $months));

        $carIds = $this->vehicles->getAccessibleLegacyCarIds($actorUserId, $actorHasAllVehicles);
        if ($carIds === []) {
            return [
                'message' => 'Pro tohoto uživatele nejsou dostupná žádná přiřazená vozidla k obnově predikce.',
                'months' => $months,
                'savedRows' => 0,
            ];
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
        $manualLocationState = $this->normalizeLocationState((string) ($payload['manual_location_state'] ?? ''));
        $serviceContextJson = $this->normalizeJsonFromMixed($payload['service_context_json'] ?? null);
        $normalized = [
            'zzs_typ' => $this->normalizeShortText((string) ($payload['zzs_typ'] ?? '')),
            'w_popis' => $this->normalizeShortText((string) ($payload['w_popis'] ?? '')),
            'service_notes' => trim((string) ($payload['service_notes'] ?? '')),
            'equipment_json' => $this->normalizeJson((string) ($payload['equipment_json'] ?? '')),
            'technical_notes' => trim((string) ($payload['technical_notes'] ?? '')),
            'insurance_policy' => trim((string) ($payload['insurance_policy'] ?? '')),
            'stk_valid_to' => $this->normalizeDate((string) ($payload['stk_valid_to'] ?? '')),
            'emission_valid_to' => $this->normalizeDate((string) ($payload['emission_valid_to'] ?? '')),
            'manual_location_state' => $manualLocationState,
            'manual_location_updated_at' => $manualLocationState !== null ? (new DateTimeImmutable('now', new DateTimeZone('Europe/Prague')))->format('Y-m-d H:i:s') : null,
            'service_context_json' => $serviceContextJson,
        ];

        $this->vehicles->saveVehicleDetailById($vehicleId, $normalized);
    }

    public function bulkUpdateLocationState(
        array $vehicleIds,
        string $locationState,
        mixed $serviceContext = null,
        ?string $serviceNote = null,
        ?string $operationType = null,
        ?string $cancelReason = null,
        int $actorUserId = 0,
        bool $actorHasAllVehicles = true
    ): int
    {
        $normalizedState = $this->normalizeBulkLocationState($locationState);
        if ($normalizedState === null) {
            throw new RuntimeException('Neplatný locationState. Povolené hodnoty: doma, v_akci, v_servisu, nezname, auto.');
        }

        $serviceContextJson = $this->normalizeJsonFromMixed($serviceContext);
        $serviceContextArray = null;
        if ($serviceContextJson !== null) {
            $decoded = json_decode($serviceContextJson, true);
            if (is_array($decoded)) {
                $serviceContextArray = $decoded;
            }
        }

        $normalizedServiceNote = trim((string) ($serviceNote ?? ''));
        $normalizedServiceNote = $normalizedServiceNote !== '' ? mb_substr($normalizedServiceNote, 0, 2000) : null;

        $normalizedOperationType = $this->normalizeServiceOperationType($operationType, $normalizedState);
        $normalizedCancelReason = $this->normalizeServiceCancelReason($cancelReason);

        if ($normalizedOperationType === 'service_cancel' && $normalizedCancelReason === null) {
            $normalizedCancelReason = 'service_finished';
        }

        return $this->vehicles->bulkUpdateLocationState(
            $vehicleIds,
            $normalizedState,
            $serviceContextArray,
            $normalizedServiceNote,
            $normalizedOperationType,
            $normalizedCancelReason,
            $actorUserId,
            $actorHasAllVehicles
        );
    }

    public function bulkUpdateStatus(
        array $vehicleIds,
        string $status,
        ?string $statusReason = null,
        ?string $statusNote = null,
        int $actorUserId = 0,
        bool $actorHasAllVehicles = true
    ): int
    {
        $normalizedStatus = $this->normalizeVehicleStatus($status);
        if ($normalizedStatus === null) {
            throw new RuntimeException('Neplatný status. Povolené hodnoty: aktivni, neaktivni.');
        }

        $normalizedStatusReason = $this->normalizeStatusReason($statusReason);
        $normalizedStatusNote = trim((string) ($statusNote ?? ''));
        $normalizedStatusNote = $normalizedStatusNote !== '' ? mb_substr($normalizedStatusNote, 0, 2000) : null;

        if ($normalizedStatus === 'neaktivni' && $normalizedStatusReason === null) {
            $normalizedStatusReason = 'jine';
        }

        return $this->vehicles->bulkUpdateStatus(
            $vehicleIds,
            $normalizedStatus,
            $normalizedStatusReason,
            $normalizedStatusNote,
            $actorUserId,
            $actorHasAllVehicles
        );
    }

    private function normalizeLocationState(string $value): ?string
    {
        $normalized = strtolower(trim($value));
        if ($normalized === '') {
            return null;
        }

        return in_array($normalized, ['doma', 'v_akci', 'v_servisu', 'nezname'], true)
            ? $normalized
            : null;
    }

    private function normalizeBulkLocationState(string $value): ?string
    {
        $normalized = strtolower(trim($value));
        if ($normalized === 'auto') {
            return 'auto';
        }

        return $this->normalizeLocationState($value);
    }

    private function normalizeVehicleStatus(string $value): ?string
    {
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['aktivni', 'neaktivni'], true)
            ? $normalized
            : null;
    }

    private function normalizeStatusReason(?string $value): ?string
    {
        $normalized = strtolower(trim((string) ($value ?? '')));
        if ($normalized === '') {
            return null;
        }

        return in_array($normalized, ['technicka_zavada', 'planovana_odstavka', 'administrativni_blokace', 'jine'], true)
            ? $normalized
            : null;
    }

    private function normalizeServiceOperationType(?string $value, string $normalizedState): string
    {
        $normalized = strtolower(trim((string) ($value ?? '')));
        if ($normalized === 'service_start' || $normalized === 'service_cancel') {
            return $normalized;
        }

        return $normalizedState === 'v_servisu' ? 'service_start' : 'service_cancel';
    }

    private function normalizeServiceCancelReason(?string $value): ?string
    {
        $normalized = strtolower(trim((string) ($value ?? '')));
        if ($normalized === '') {
            return null;
        }

        return in_array($normalized, ['auto_false_positive', 'service_finished'], true)
            ? $normalized
            : null;
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

    private function normalizeJsonFromMixed(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            return $this->normalizeJson($value);
        }

        if (is_array($value) || is_object($value)) {
            $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (!is_string($encoded) || $encoded === 'null') {
                return null;
            }

            return $encoded;
        }

        return null;
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

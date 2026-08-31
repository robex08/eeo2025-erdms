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
        array $ccsStates = [],
        string $ccsExpiryFilter = '',
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
            $ccsStates,
            $ccsExpiryFilter,
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

    public function listLookupItems(array $categories = [], bool $includeInactive = false): array
    {
        return $this->vehicles->listLookupItems($categories, $includeInactive);
    }

    public function saveLookupItem(array $payload): array
    {
        foreach (['category', 'code'] as $field) {
            $value = strtolower(trim((string) ($payload[$field] ?? '')));
            if (!preg_match('/^[a-z0-9_]{2,64}$/', $value)) {
                throw new RuntimeException('Neplatný kód číselníku: ' . $field);
            }
            $payload[$field] = $value;
        }
        $payload['category_name'] = mb_substr(trim((string) ($payload['category_name'] ?? '')), 0, 190);
        if ($payload['category_name'] === '') {
            $payload['category_name'] = $payload['category'];
        }
        $payload['item_name'] = mb_substr(trim((string) ($payload['item_name'] ?? '')), 0, 190);
        if ($payload['item_name'] === '') {
            throw new RuntimeException('Název položky číselníku je povinný.');
        }
        $payload['item_description'] = trim((string) ($payload['item_description'] ?? '')) ?: null;
        $payload['sort_order'] = max(0, min(999999, (int) ($payload['sort_order'] ?? 0)));
        $payload['is_active'] = !empty($payload['is_active']) ? 1 : 0;
        $payload['metadata_json'] = null;
        return $this->vehicles->saveLookupItem($payload);
    }

    public function deactivateLookupItem(string $category, string $code): bool
    {
        return $this->vehicles->deactivateLookupItem(strtolower(trim($category)), strtolower(trim($code)));
    }

    public function listDrivers(
        bool $activeOnly = true,
        string $query = '',
        int $actorUserId = 0,
        bool $actorHasAllDrivers = true,
        ?string $requestedKmMonth = null
    ): array
    {
        return $this->vehicles->listDrivers($activeOnly, $query, $actorUserId, $actorHasAllDrivers, $requestedKmMonth);
    }

    public function runDriversSync(bool $activeOnly = true): array
    {
        $drivers = $this->webDispecink->getDriversList(0);
        if ($activeOnly) {
            $drivers = array_values(array_filter(
                $drivers,
                static fn(array $row): bool => ((int) ($row['is_active'] ?? 0)) === 1
            ));
        }

        $stats = $this->vehicles->upsertDriversFromWebDispecink($drivers);
        $inserted = (int) ($stats['inserted'] ?? 0);
        $updated = (int) ($stats['updated'] ?? 0);
        $unchanged = (int) ($stats['unchanged'] ?? 0);
        $processed = (int) ($stats['processed'] ?? count($drivers));
        $touched = (int) ($stats['touched'] ?? ($inserted + $updated));

        return [
            'affectedRows' => $touched,
            'count' => $processed,
            'inserted' => $inserted,
            'updated' => $updated,
            'unchanged' => $unchanged,
            'message' => sprintf(
                'Synchronizace řidičů dokončena: načteno %d, nové %d, aktualizováno %d, beze změny %d.',
                $processed,
                $inserted,
                $updated,
                $unchanged
            ),
        ];
    }

    /**
     * Synchronizuje km statistiky a CCS accounting řidičů pro zadaný měsíc.
     * Načítá data z WebDispečinku a ukládá do cache.
     */
    public function syncDriversKm(int $year, int $month): array
    {
        $driversKm = $this->webDispecink->getDriversMonthlyKm($year, $month);
        
        $updated = 0;
        $failed = 0;
        
        foreach ($driversKm as $driverKm) {
            $personalNumber = trim((string) ($driverKm['personal_number'] ?? ''));
            $driverName = trim((string) ($driverKm['driver_name'] ?? ''));
            $kmBusiness = (float) ($driverKm['km_business'] ?? 0.0);
            $kmPrivate = (float) ($driverKm['km_private'] ?? 0.0);
            $kmTotal = (float) ($driverKm['km_total'] ?? 0.0);
            $costsTotal = (float) ($driverKm['costs_total'] ?? 0.0);
            $costsBusiness = (float) ($driverKm['costs_business'] ?? 0.0);
            $costsPrivate = (float) ($driverKm['costs_private'] ?? 0.0);
            
            if ($personalNumber === '' && $driverName === '') {
                $failed++;
                continue;
            }
            
            $success = $this->vehicles->updateDriverKmStats(
                $personalNumber,
                $driverName,
                $kmBusiness,
                $kmPrivate,
                $kmTotal,
                $costsTotal,
                $costsBusiness,
                $costsPrivate,
                0,
                '',
                $year,
                $month
            );
            
            if ($success) {
                $updated++;
            } else {
                $failed++;
            }
        }
        
        $total = count($driversKm);
        
        return [
            'total' => $total,
            'updated' => $updated,
            'failed' => $failed,
            'message' => sprintf(
                'Načtení km dokončeno: celkem %d řidičů, aktualizováno %d, chyby %d.',
                $total,
                $updated,
                $failed
            ),
        ];
    }

    /**
    /**
     * Synchronizuje km a costs data pro řidiče konkrétního vozidla.
     * Načítá data z WebDispečinku pro dané vozidlo a ukládá do cache.
     *
     * KAŽDÝ pokus o synchronizaci je zaznamenán do log tabulky
     * (vehicles_drivers_km_sync_log_v2) - i když WebDispečink nevrátí data
     * nebo řidiče nelze v DB dohledat. Díky tomu UI ví, že měsíc už byl
     * načten, a při dalším sync může nabídnout dialog force-resync.
     */
    public function syncDriversKmForVehicle(int $vehicleId, int $year, int $month, int $actorUserId, bool $actorHasAllVehicles): array
    {
        $kmMonth = sprintf('%04d-%02d', $year, $month);

        try {
            // Ověření přístupu k vozidlu
            $vehicle = $this->getVehicleDetail($vehicleId, $actorUserId, $actorHasAllVehicles);

            if ($vehicle === null) {
                throw new \RuntimeException('Vozidlo nebylo nalezeno nebo k němu nemáte přístup.');
            }

            $carId = (int) ($vehicle['legacy_carid'] ?? 0);
            $vehicleSpz = (string) ($vehicle['spz'] ?? '');
            $vehicleName = $this->formatVehicleName($vehicle);

            // Vozidlo bez WebDispečink ID: nemá smysl volat WD.
            if ($carId <= 0) {
                return [
                    'vehicle_id' => $vehicleId,
                    'vehicle_name' => $vehicleName,
                    'drivers_updated' => 0,
                    'message' => 'Vozidlo nemá přiřazené WebDispečink ID.',
                ];
            }

            // Načtení stats z WebDispečinku pro toto konkrétní vozidlo
            $wdError = null;
            $stats = [];
            try {
                $stats = $this->webDispecink->getMonthlyStats($carId, $year, $month);
            } catch (Throwable $e) {
                $wdError = $e->getMessage();
                error_log('VehicleService::syncDriversKmForVehicle - getMonthlyStats failed: ' . $wdError);
            }

            // WebDispečink selhal (výjimka) - vrátit chybu.
            if ($wdError !== null) {
                return [
                    'vehicle_id' => $vehicleId,
                    'vehicle_name' => $vehicleName,
                    'drivers_updated' => 0,
                    'message' => 'Načtení dat z WebDispečinku selhalo: ' . $wdError,
                ];
            }

            $hadData = !empty($stats);
            $updated = 0;

            if (!$hadData) {
                // WebDispečink nevrátil žádná data pro toto auto.
                // Uložit 0 km/náklady pro všechny aktivní řidiče tohoto auta,
                // aby zůstala per-vehicle stopa v raw_json._km_by_vehicle.
                $activeDrivers = $this->vehicles->getActiveDriversForVehicle($vehicleSpz);

                foreach ($activeDrivers as $driver) {
                    $personalNumber = trim((string) ($driver['personal_number'] ?? ''));
                    $driverName = trim((string) ($driver['driver_name'] ?? ''));

                    if ($personalNumber === '' && $driverName === '') {
                        continue;
                    }

                    $success = $this->vehicles->updateDriverKmStats(
                        $personalNumber,
                        $driverName,
                        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                        $carId,
                        $vehicleSpz,
                        $year,
                        $month
                    );

                    if ($success) {
                        $updated++;
                    }
                }
            } else {
                foreach ($stats as $stat) {
                    $personalNumber = trim((string) ($stat['driver_personal_number'] ?? ''));
                    $driverName = trim((string) ($stat['driver_name'] ?? ''));

                    if ($personalNumber === '' && $driverName === '') {
                        continue;
                    }

                    $kmBusiness = (float) ($stat['km_business'] ?? 0.0);
                    $kmPrivate = (float) ($stat['km_private'] ?? 0.0);
                    $kmTotal = (float) ($stat['km_total'] ?? 0.0);
                    $totalCosts = (float) ($stat['total_costs_czk'] ?? 0.0);

                    $costsBusiness = 0.0;
                    $costsPrivate = 0.0;

                    if ($kmTotal > 0 && $totalCosts > 0) {
                        $costsBusiness = $totalCosts * ($kmBusiness / $kmTotal);
                        $costsPrivate = $totalCosts * ($kmPrivate / $kmTotal);
                    }

                    $success = $this->vehicles->updateDriverKmStats(
                        $personalNumber,
                        $driverName,
                        $kmBusiness,
                        $kmPrivate,
                        $kmTotal,
                        $totalCosts,
                        $costsBusiness,
                        $costsPrivate,
                        $carId,
                        $vehicleSpz,
                        $year,
                        $month
                    );

                    if ($success) {
                        $updated++;
                    }
                }
            }

            // Pokud WD data přišla, ale nepodařilo se je spárovat na aktivní řidiče,
            // uložíme fallback 0 km pro aktivní řidiče vozidla. Tím vznikne měsíční
            // stopa pro vozidlo a nebude donekonečna vracené jako "nenačtené".
            if ($hadData && $updated === 0) {
                $activeDrivers = $this->vehicles->getActiveDriversForVehicle($vehicleSpz);
                foreach ($activeDrivers as $driver) {
                    $personalNumber = trim((string) ($driver['personal_number'] ?? ''));
                    $driverName = trim((string) ($driver['driver_name'] ?? ''));

                    if ($personalNumber === '' && $driverName === '') {
                        continue;
                    }

                    $success = $this->vehicles->updateDriverKmStats(
                        $personalNumber,
                        $driverName,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        $carId,
                        $vehicleSpz,
                        $year,
                        $month
                    );

                    if ($success) {
                        $updated++;
                    }
                }
            }

            if ($hadData) {
                $message = $updated > 0
                    ? "Aktualizováno {$updated} řidičů."
                    : 'Žádní řidiči nenalezeni.';
            } else {
                $message = $updated > 0
                    ? "Vozidlo bez dat z WebDispečinku - uloženo 0 km pro {$updated} řidičů."
                    : 'Vozidlo bez dat z WebDispečinku - synchronizace zaznamenána.';
            }

            return [
                'vehicle_id' => $vehicleId,
                'vehicle_name' => $vehicleName,
                'drivers_updated' => $updated,
                'message' => $message,
            ];
        } catch (\Throwable $e) {
            throw $e;
        }
    }

    /**
     * Vrátí seznam vozidel pro synchronizaci km řidičů.
     * 
     * Pro minulé měsíce: vrátí jen vozidla která NEMAJÍ uložená data v drivers cache
     * (kontrola přes vehicles_wd_drivers_v2/raw_json).
     * Pro aktuální měsíc: vrátí všechna vozidla (data se mohou měnit během dne).
     */
    public function listVehiclesForDriversSync(int $actorUserId, bool $actorHasAllVehicles, int $year, int $month, bool $force = false): array
    {
        $kmMonth = sprintf('%04d-%02d', $year, $month);
        $currentKmMonth = date('Y-m');
        $isCurrentMonth = ($kmMonth === $currentKmMonth);

        // Načteme VŠECHNA vozidla s aktivními řidiči
        $allVehicles = $this->vehicles->listVehiclesForDriversSync($actorUserId, $actorHasAllVehicles, $kmMonth, $isCurrentMonth, true);
        
        // Pro aktuální měsíc nebo force sync: vrátit vše
        if ($isCurrentMonth || $force) {
            return $allVehicles;
        }
        
        if ($allVehicles === []) {
            return [];
        }

        // Pro minulý měsíc bez force: vyfiltrovat vozidla která už byla synchronizována.
        // Zdrojem pravdy je log tabulka (zaznamenává pokus o sync i když WD nevrátí data).
            // Pro minulý měsíc bez force: vyfiltrovat vozidla která už mají data v DB.
        $needsSync = [];
        foreach ($allVehicles as $vehicle) {
            $vehicleId = (int) ($vehicle['id'] ?? 0);
                $vehicleSpz = (string) ($vehicle['spz'] ?? '');
                $carId = (int) ($vehicle['legacy_carid'] ?? 0);

            if ($vehicleId <= 0) {
                continue;
            }

                if ($carId <= 0) {
                    // Vozidlo bez legacy carId nelze přes WD načítat.
                    continue;
                }

                $hasData = $this->vehicles->vehicleHasKmDataForMonth($vehicleSpz, $carId, $kmMonth);
                if (!$hasData) {
                $needsSync[] = $vehicle;
            }
        }
        
        return $needsSync;
    }

    /**
     * Formátuje název vozidla pro zobrazení.
     */
    private function formatVehicleName(array $vehicle): string
    {
        $parts = [];
        
        $make = trim((string) ($vehicle['w_tovarni_znacka'] ?? ''));
        $model = trim((string) ($vehicle['w_model_vozu'] ?? ''));
        $spz = trim((string) ($vehicle['spz'] ?? ''));
        
        if ($make !== '' && $model !== '') {
            $parts[] = $make . ' ' . $model;
        } elseif ($make !== '') {
            $parts[] = $make;
        } elseif ($model !== '') {
            $parts[] = $model;
        }
        
        if ($spz !== '') {
            $parts[] = '(' . $spz . ')';
        }
        
        return implode(' ', $parts) ?: 'Vozidlo #' . ($vehicle['id'] ?? '?');
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
            // ZZS typ is maintained in the V2 detail card.
            $typeUpdated = 0;
            $ccsSynced = 0;

            try {
                $ccsCards = $this->webDispecink->getCcsCardsAssignedToVehicles();
                $ccsSynced = $this->vehicles->syncCcsCardsFromWebDispecink($returnedCarIds, $ccsCards);
            } catch (Throwable $e) {
                $warnings[] = 'ccs-karty: ' . $e->getMessage();
                error_log('Vehicles v2 CCS cards sync: ' . $e->getMessage());
            }

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
                'WebDispečink sync dokončen: %d skupin aktualizováno, %d vozidel synchronizováno, %d vozidel označeno jako vyřazené, %d detailů aktualizováno, %d typů doplněno, %d CCS karet spárováno, %d pozic uloženo, %d km záznamů aktualizováno, scope přepočítán pro %d uživatelů',
                $groupsUpdated,
                $upserted,
                $retired,
                $detailUpdated,
                $typeUpdated,
                $ccsSynced,
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

    public function getVehicleModuleSummary(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): ?array
    {
        return $this->vehicles->getVehicleModuleSummary($vehicleId, $actorUserId, $actorHasAllVehicles);
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

    public function getVehicleCardAudit(
        int $vehicleId,
        string $fieldName = '',
        int $limit = 100,
        int $actorUserId = 0,
        bool $actorHasAllVehicles = true
    ): array {
        return $this->vehicles->listVehicleCardAudit($vehicleId, $fieldName, $limit, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleEeoServiceHistory(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        return $this->vehicles->listVehicleEeoServiceHistory($vehicleId, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleAttachments(
        int $vehicleId,
        string $documentTypeCode = '',
        int $actorUserId = 0,
        bool $actorHasAllVehicles = true
    ): array {
        return $this->vehicles->listVehicleAttachments($vehicleId, $documentTypeCode, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleServiceRecords(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        return $this->vehicles->listVehicleServiceRecords($vehicleId, $actorUserId, $actorHasAllVehicles);
    }

    private function resolveServiceStationSnapshot(array $payload): array
    {
        $station = is_array($payload['service_station'] ?? null) ? $payload['service_station'] : [];
        $selectedStationId = (int) ($payload['service_station_id'] ?? 0);
        $organization = $this->normalizeShortText((string) ($station['organization'] ?? '')) ?: null;
        $name = $this->normalizeShortText((string) ($station['name'] ?? '')) ?: null;
        $city = $this->normalizeShortText((string) ($station['city'] ?? '')) ?: null;
        $street = $this->normalizeShortText((string) ($station['street'] ?? '')) ?: null;
        $postalCode = $this->normalizeShortText((string) ($station['postal_code'] ?? '')) ?: null;
        $register = filter_var($payload['register_service_station'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($selectedStationId > 0) {
            foreach ($this->vehicles->listStationAddresses() as $candidate) {
                if ((int) ($candidate['id'] ?? 0) !== $selectedStationId) {
                    continue;
                }
                if (strcasecmp(trim((string) ($candidate['typ'] ?? '')), 'Servis') !== 0) {
                    throw new RuntimeException('Vybrané stanoviště není servis.');
                }

                return [
                    'service_organization' => $this->normalizeShortText((string) ($candidate['organizace'] ?? '')) ?: null,
                    'service_station_name' => $this->normalizeShortText((string) ($candidate['nazev_stanoviste'] ?? $candidate['mesto'] ?? '')) ?: null,
                    'service_city' => $this->normalizeShortText((string) ($candidate['mesto'] ?? '')) ?: null,
                    'service_street' => $this->normalizeShortText((string) ($candidate['ulice'] ?? '')) ?: null,
                    'service_postal_code' => $this->normalizeShortText((string) ($candidate['psc'] ?? '')) ?: null,
                ];
            }

            throw new RuntimeException('Vybraný servis nebyl nalezen.');
        }

        if (!$register) {
            if ($name === null && $organization === null && $city === null) {
                throw new RuntimeException('Vyberte servis ze seznamu nebo zadejte nový servis.');
            }
            return [
                'service_organization' => $organization,
                'service_station_name' => $name,
                'service_city' => $city,
                'service_street' => $street,
                'service_postal_code' => $postalCode,
            ];
        }

        if ($organization === null || $name === null || $city === null) {
            throw new RuntimeException('Pro nový servis vyplňte organizaci, název a město.');
        }

        $existing = null;
        foreach ($this->vehicles->listStationAddresses() as $candidate) {
            if (strcasecmp(trim((string) ($candidate['organizace'] ?? '')), $organization) === 0
                && strcasecmp(trim((string) ($candidate['nazev_stanoviste'] ?? '')), $name) === 0
                && strcasecmp(trim((string) ($candidate['mesto'] ?? '')), $city) === 0
                && strcasecmp(trim((string) ($candidate['ulice'] ?? '')), (string) ($street ?? '')) === 0
                && strcasecmp(trim((string) ($candidate['typ'] ?? '')), 'Servis') === 0) {
                $existing = $candidate;
                break;
            }
        }

        if ($existing === null) {
            $this->vehicles->createStationAddress([
                'organizace' => $organization,
                'nazev_stanoviste' => $name,
                'mesto' => $city,
                'ulice' => $street ?? '',
                'psc' => $postalCode ?? '',
                'typ' => 'Servis',
            ]);
        }

        return [
            'service_organization' => $organization,
            'service_station_name' => $name,
            'service_city' => $city,
            'service_street' => $street,
            'service_postal_code' => $postalCode,
        ];
    }

    public function createVehicleServiceRecord(int $vehicleId, array $payload, int $actorUserId): int
    {
        $serviceType = $this->requireActiveLookupCode('service_type', $payload['service_type_code'] ?? null, 'Typ servisu');
        $serviceKind = $this->optionalActiveLookupCode('service_kind', $payload['service_kind_code'] ?? null, 'Druh servisního úkonu');
        $statusCode = $this->requireActiveLookupCode('service_status', $payload['status_code'] ?? 'planned', 'Stav servisu');
        $station = $this->resolveServiceStationSnapshot($payload);
        $serviceDate = $this->normalizeDate((string) ($payload['service_date'] ?? ''));
        $plannedDate = $this->normalizeDate((string) ($payload['planned_date'] ?? ''));
        $completedDate = $this->normalizeDate((string) ($payload['completed_date'] ?? ''));
        $this->assertDateOrder($plannedDate, $completedDate, 'Datum dokončení nemůže být před plánovaným datem.');
        $this->assertDateOrder($serviceDate, $completedDate, 'Datum dokončení nemůže být před datem servisu.');

        return $this->vehicles->createVehicleServiceRecord([
            'vehicle_id' => $vehicleId,
            'service_type_code' => $serviceType,
            'service_kind_code' => $serviceKind,
            'status_code' => $statusCode,
            'service_station_code' => null,
            'service_organization' => $station['service_organization'],
            'service_station_name' => $station['service_station_name'],
            'service_city' => $station['service_city'],
            'service_street' => $station['service_street'],
            'service_postal_code' => $station['service_postal_code'],
            'supplier_name' => $station['service_station_name'] ?: $this->normalizeShortText((string) ($payload['supplier_name'] ?? '')) ?: null,
            'service_date' => $serviceDate,
            'planned_date' => $plannedDate,
            'completed_date' => $completedDate,
            'description' => $this->normalizeLongText((string) ($payload['description'] ?? '')) ?: null,
            'parts_description' => $this->normalizeLongText((string) ($payload['parts_description'] ?? '')) ?: null,
            'cost_amount' => $this->normalizeNullableDecimal($payload['cost_amount'] ?? null, 0, 999999999999.99),
            'cost_currency' => 'CZK',
            'source' => 'v2',
            'external_reference' => $this->normalizeShortText((string) ($payload['external_reference'] ?? '')) ?: null,
            'created_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ]);
    }

    public function updateVehicleServiceRecord(int $recordId, array $payload, int $actorUserId, bool $actorHasAllVehicles = true): ?array
    {
        $serviceType = $this->requireActiveLookupCode('service_type', $payload['service_type_code'] ?? null, 'Typ servisu');
        $serviceKind = $this->optionalActiveLookupCode('service_kind', $payload['service_kind_code'] ?? null, 'Druh servisního úkonu');
        $statusCode = $this->requireActiveLookupCode('service_status', $payload['status_code'] ?? 'planned', 'Stav servisu');
        $station = $this->resolveServiceStationSnapshot($payload);
        $serviceDate = $this->normalizeDate((string) ($payload['service_date'] ?? ''));
        $plannedDate = $this->normalizeDate((string) ($payload['planned_date'] ?? ''));
        $completedDate = $this->normalizeDate((string) ($payload['completed_date'] ?? ''));
        $this->assertDateOrder($plannedDate, $completedDate, 'Datum dokončení nemůže být před plánovaným datem.');
        $this->assertDateOrder($serviceDate, $completedDate, 'Datum dokončení nemůže být před datem servisu.');
        return $this->vehicles->updateVehicleServiceRecord($recordId, [
            'service_type_code' => $serviceType,
            'service_kind_code' => $serviceKind,
            'status_code' => $statusCode,
            'service_station_code' => null,
            'service_organization' => $station['service_organization'],
            'service_station_name' => $station['service_station_name'],
            'service_city' => $station['service_city'],
            'service_street' => $station['service_street'],
            'service_postal_code' => $station['service_postal_code'],
            'supplier_name' => $station['service_station_name'] ?: $this->normalizeShortText((string) ($payload['supplier_name'] ?? '')) ?: null,
            'service_date' => $serviceDate,
            'planned_date' => $plannedDate,
            'completed_date' => $completedDate,
            'description' => $this->normalizeLongText((string) ($payload['description'] ?? '')) ?: null,
            'parts_description' => $this->normalizeLongText((string) ($payload['parts_description'] ?? '')) ?: null,
            'cost_amount' => $this->normalizeNullableDecimal($payload['cost_amount'] ?? null, 0, 999999999999.99),
            'cost_currency' => 'CZK',
            'external_reference' => $this->normalizeShortText((string) ($payload['external_reference'] ?? '')) ?: null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ], $actorUserId, $actorHasAllVehicles);
    }

    private function deleteAttachmentFile(string $storageKey): bool
    {
        $storageKey = trim((string) $storageKey);
        if ($storageKey === '') {
            return false;
        }

        $root = rtrim($this->getAttachmentStorageRoot(), '/\\');
        $rootReal = realpath($root);
        if ($rootReal === false) {
            return false;
        }
        $normalized = str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $storageKey);
        $candidates = [
            $root . DIRECTORY_SEPARATOR . ltrim($normalized, DIRECTORY_SEPARATOR),
            $root . DIRECTORY_SEPARATOR . ltrim($normalized, '/\\'),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate === '' || !is_file($candidate)) {
                continue;
            }

            $realCandidate = realpath($candidate);
            if ($realCandidate !== false && is_file($realCandidate) && str_starts_with($realCandidate, $rootReal . DIRECTORY_SEPARATOR)) {
                return @unlink($realCandidate);
            }
        }

        return false;
    }

    private function deleteAttachmentsForContext(int $vehicleId, string $contextModule, int $contextRecordId, int $actorUserId): int
    {
        $attachments = $this->vehicles->listVehicleAttachmentsForContext($vehicleId, $contextModule, $contextRecordId, $actorUserId, true);
        foreach ($attachments as $attachment) {
            $this->deleteAttachmentFile((string) ($attachment['storage_key'] ?? ''));
        }

        return $this->vehicles->softDeleteVehicleAttachmentsForContext($vehicleId, $contextModule, $contextRecordId, $actorUserId);
    }

    public function deleteVehicleServiceRecord(int $recordId, int $actorUserId, bool $actorHasAllVehicles = true): bool
    {
        $existing = $this->vehicles->findVehicleServiceRecordById($recordId, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) {
            return false;
        }

        $this->deleteAttachmentsForContext((int) $existing['vehicle_id'], 'service', $recordId, $actorUserId);
        return $this->vehicles->softDeleteVehicleServiceRecord($recordId, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleEquipment(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        return $this->vehicles->listVehicleEquipment($vehicleId, $actorUserId, $actorHasAllVehicles);
    }

    public function createVehicleEquipment(int $vehicleId, array $payload, int $actorUserId): int
    {
        $equipmentType = $this->requireActiveLookupCode('equipment_type', $payload['equipment_type_code'] ?? null, 'Typ vybavení');
        $statusCode = $this->requireActiveLookupCode('equipment_status', $payload['status_code'] ?? null, 'Stav vybavení');
        return $this->vehicles->createVehicleEquipment([
            'vehicle_id' => $vehicleId,
            'equipment_type_code' => $equipmentType,
            'status_code' => $statusCode,
            'equipment_name' => $this->normalizeShortText((string) ($payload['equipment_name'] ?? '')) ?: null,
            'manufacturer' => $this->normalizeShortText((string) ($payload['manufacturer'] ?? '')) ?: null,
            'model' => $this->normalizeShortText((string) ($payload['model'] ?? '')) ?: null,
            'serial_number' => $this->normalizeShortText((string) ($payload['serial_number'] ?? '')) ?: null,
            'inventory_number' => $this->normalizeShortText((string) ($payload['inventory_number'] ?? '')) ?: null,
            'supplier_name' => $this->normalizeShortText((string) ($payload['supplier_name'] ?? '')) ?: null,
            'acquired_at' => $this->normalizeDate((string) ($payload['acquired_at'] ?? '')),
            'warranty_valid_to' => $this->normalizeDate((string) ($payload['warranty_valid_to'] ?? '')),
            'revision_valid_to' => $this->normalizeDate((string) ($payload['revision_valid_to'] ?? '')),
            'cost_amount' => $this->normalizeNullableDecimal($payload['cost_amount'] ?? null, 0, 999999999999.99),
            'cost_currency' => 'CZK',
            'note' => $this->normalizeLongText((string) ($payload['note'] ?? '')) ?: null,
            'source' => 'v2',
            'created_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ]);
    }

    public function updateVehicleEquipment(int $equipmentId, array $payload, int $actorUserId, bool $actorHasAllVehicles = true): ?array
    {
        $equipmentType = $this->requireActiveLookupCode('equipment_type', $payload['equipment_type_code'] ?? null, 'Typ vybavení');
        $statusCode = $this->requireActiveLookupCode('equipment_status', $payload['status_code'] ?? null, 'Stav vybavení');
        return $this->vehicles->updateVehicleEquipment($equipmentId, [
            'equipment_type_code' => $equipmentType,
            'status_code' => $statusCode,
            'equipment_name' => $this->normalizeShortText((string) ($payload['equipment_name'] ?? '')) ?: null,
            'manufacturer' => $this->normalizeShortText((string) ($payload['manufacturer'] ?? '')) ?: null,
            'model' => $this->normalizeShortText((string) ($payload['model'] ?? '')) ?: null,
            'serial_number' => $this->normalizeShortText((string) ($payload['serial_number'] ?? '')) ?: null,
            'inventory_number' => $this->normalizeShortText((string) ($payload['inventory_number'] ?? '')) ?: null,
            'supplier_name' => $this->normalizeShortText((string) ($payload['supplier_name'] ?? '')) ?: null,
            'acquired_at' => $this->normalizeDate((string) ($payload['acquired_at'] ?? '')),
            'warranty_valid_to' => $this->normalizeDate((string) ($payload['warranty_valid_to'] ?? '')),
            'revision_valid_to' => $this->normalizeDate((string) ($payload['revision_valid_to'] ?? '')),
            'cost_amount' => $this->normalizeNullableDecimal($payload['cost_amount'] ?? null, 0, 999999999999.99),
            'cost_currency' => 'CZK',
            'note' => $this->normalizeLongText((string) ($payload['note'] ?? '')) ?: null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ], $actorUserId, $actorHasAllVehicles);
    }

    public function deleteVehicleEquipment(int $equipmentId, int $actorUserId, bool $actorHasAllVehicles = true): bool
    {
        $existing = $this->vehicles->findVehicleEquipmentById($equipmentId, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) {
            return false;
        }

        $this->deleteAttachmentsForContext((int) $existing['vehicle_id'], 'equipment', $equipmentId, $actorUserId);
        return $this->vehicles->softDeleteVehicleEquipment($equipmentId, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleInsurancePolicies(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        return $this->vehicles->listVehicleInsurancePolicies($vehicleId, $actorUserId, $actorHasAllVehicles);
    }

    public function createVehicleInsurancePolicy(int $vehicleId, array $payload, int $actorUserId): int
    {
        $validFrom = $this->normalizeDate((string) ($payload['valid_from'] ?? ''));
        $validTo = $this->normalizeDate((string) ($payload['valid_to'] ?? ''));
        $this->assertDateOrder($validFrom, $validTo, 'Platnost od nemůže být po platnosti do.');

        return $this->vehicles->createVehicleInsurancePolicy([
            'vehicle_id' => $vehicleId,
            'policy_type_code' => $this->requireActiveLookupCode('insurance_policy_type', $payload['policy_type_code'] ?? null, 'Typ pojištění'),
            'policy_number' => $this->normalizeShortText((string) ($payload['policy_number'] ?? '')) ?: null,
            'insurer_name' => $this->normalizeShortText((string) ($payload['insurer_name'] ?? '')) ?: null,
            'valid_from' => $validFrom,
            'valid_to' => $validTo,
            'premium_amount' => $this->normalizeNullableDecimal($payload['premium_amount'] ?? null, 0, 999999999999.99),
            'premium_currency' => 'CZK',
            'deductible_amount' => $this->normalizeNullableDecimal($payload['deductible_amount'] ?? null, 0, 999999999999.99),
            'deductible_currency' => 'CZK',
            'note' => $this->normalizeLongText((string) ($payload['note'] ?? '')) ?: null,
            'source' => 'v2',
            'created_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ]);
    }

    public function updateVehicleInsurancePolicy(int $policyId, array $payload, int $actorUserId, bool $actorHasAllVehicles = true): ?array
    {
        $validFrom = $this->normalizeDate((string) ($payload['valid_from'] ?? ''));
        $validTo = $this->normalizeDate((string) ($payload['valid_to'] ?? ''));
        $this->assertDateOrder($validFrom, $validTo, 'Platnost od nemůže být po platnosti do.');

        return $this->vehicles->updateVehicleInsurancePolicy($policyId, [
            'policy_type_code' => $this->requireActiveLookupCode('insurance_policy_type', $payload['policy_type_code'] ?? null, 'Typ pojištění'),
            'policy_number' => $this->normalizeShortText((string) ($payload['policy_number'] ?? '')) ?: null,
            'insurer_name' => $this->normalizeShortText((string) ($payload['insurer_name'] ?? '')) ?: null,
            'valid_from' => $validFrom,
            'valid_to' => $validTo,
            'premium_amount' => $this->normalizeNullableDecimal($payload['premium_amount'] ?? null, 0, 999999999999.99),
            'premium_currency' => 'CZK',
            'deductible_amount' => $this->normalizeNullableDecimal($payload['deductible_amount'] ?? null, 0, 999999999999.99),
            'deductible_currency' => 'CZK',
            'note' => $this->normalizeLongText((string) ($payload['note'] ?? '')) ?: null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ], $actorUserId, $actorHasAllVehicles);
    }

    public function deleteVehicleInsurancePolicy(int $policyId, int $actorUserId, bool $actorHasAllVehicles = true): bool
    {
        $existing = $this->vehicles->findVehicleInsurancePolicyById($policyId, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) {
            return false;
        }

        $this->deleteAttachmentsForContext((int) $existing['vehicle_id'], 'insurance_policy', $policyId, $actorUserId);
        return $this->vehicles->softDeleteVehicleInsurancePolicy($policyId, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleClaims(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        return $this->vehicles->listVehicleClaims($vehicleId, $actorUserId, $actorHasAllVehicles);
    }

    public function createVehicleClaim(int $vehicleId, array $payload, int $actorUserId): int
    {
        $claimDate = $this->normalizeDate((string) ($payload['claim_date'] ?? ''));
        $settledDate = $this->normalizeDate((string) ($payload['settled_date'] ?? ''));
        $this->assertDateOrder($claimDate, $settledDate, 'Datum uzavření nemůže být před datem události.');

        return $this->vehicles->createVehicleClaim([
            'vehicle_id' => $vehicleId,
            'insurance_policy_id' => $this->normalizeClaimPolicyId($payload['insurance_policy_id'] ?? null, $vehicleId, $actorUserId, true),
            'claim_status_code' => $this->requireActiveLookupCode('claim_status', $payload['claim_status_code'] ?? 'open', 'Stav škodní události'),
            'claim_date' => $claimDate,
            'settled_date' => $settledDate,
            'title' => $this->normalizeShortText((string) ($payload['title'] ?? '')) ?: null,
            'description' => $this->normalizeLongText((string) ($payload['description'] ?? '')) ?: null,
            'payout_amount' => $this->normalizeNullableDecimal($payload['payout_amount'] ?? null, 0, 999999999999.99),
            'payout_currency' => 'CZK',
            'deductible_amount' => $this->normalizeNullableDecimal($payload['deductible_amount'] ?? null, 0, 999999999999.99),
            'deductible_currency' => 'CZK',
            'source' => 'v2',
            'external_reference' => $this->normalizeShortText((string) ($payload['external_reference'] ?? '')) ?: null,
            'created_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ]);
    }

    public function updateVehicleClaim(int $claimId, array $payload, int $actorUserId, bool $actorHasAllVehicles = true): ?array
    {
        $existing = $this->vehicles->findVehicleClaimById($claimId, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) {
            return null;
        }
        $claimDate = $this->normalizeDate((string) ($payload['claim_date'] ?? ''));
        $settledDate = $this->normalizeDate((string) ($payload['settled_date'] ?? ''));
        $this->assertDateOrder($claimDate, $settledDate, 'Datum uzavření nemůže být před datem události.');

        return $this->vehicles->updateVehicleClaim($claimId, [
            'insurance_policy_id' => $this->normalizeClaimPolicyId($payload['insurance_policy_id'] ?? null, (int) $existing['vehicle_id'], $actorUserId, $actorHasAllVehicles),
            'claim_status_code' => $this->requireActiveLookupCode('claim_status', $payload['claim_status_code'] ?? 'open', 'Stav škodní události'),
            'claim_date' => $claimDate,
            'settled_date' => $settledDate,
            'title' => $this->normalizeShortText((string) ($payload['title'] ?? '')) ?: null,
            'description' => $this->normalizeLongText((string) ($payload['description'] ?? '')) ?: null,
            'payout_amount' => $this->normalizeNullableDecimal($payload['payout_amount'] ?? null, 0, 999999999999.99),
            'payout_currency' => 'CZK',
            'deductible_amount' => $this->normalizeNullableDecimal($payload['deductible_amount'] ?? null, 0, 999999999999.99),
            'deductible_currency' => 'CZK',
            'external_reference' => $this->normalizeShortText((string) ($payload['external_reference'] ?? '')) ?: null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ], $actorUserId, $actorHasAllVehicles);
    }

    public function deleteVehicleClaim(int $claimId, int $actorUserId, bool $actorHasAllVehicles = true): bool
    {
        $existing = $this->vehicles->findVehicleClaimById($claimId, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) {
            return false;
        }

        $this->deleteAttachmentsForContext((int) $existing['vehicle_id'], 'insurance_claim', $claimId, $actorUserId);
        return $this->vehicles->softDeleteVehicleClaim($claimId, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleTires(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        return $this->vehicles->listVehicleTires($vehicleId, $actorUserId, $actorHasAllVehicles);
    }

    public function createVehicleTires(int $vehicleId, array $payload, int $actorUserId): int
    {
        $seasonCode = $this->requireActiveLookupCode('tire_season', $payload['season_code'] ?? null, 'Sezóna pneumatik');
        $statusCode = $this->requireActiveLookupCode('tire_status', $payload['status_code'] ?? null, 'Stav pneumatik');
        $acquiredAt = $this->normalizeDate((string) ($payload['acquired_at'] ?? ''));
        $installedAt = $this->normalizeDate((string) ($payload['installed_at'] ?? ''));
        $removedAt = $this->normalizeDate((string) ($payload['removed_at'] ?? ''));
        $this->assertDateOrder($acquiredAt, $installedAt, 'Datum nasazení nemůže být před datem pořízení.');
        $this->assertDateOrder($installedAt, $removedAt, 'Datum sejmutí nemůže být před datem nasazení.');
        $quantity = (int) ($payload['quantity'] ?? 4);
        if ($quantity < 1 || $quantity > 20) throw new RuntimeException('Počet pneumatik musí být 1 až 20.');
        return $this->vehicles->createVehicleTires([
            'vehicle_id' => $vehicleId,
            'season_code' => $seasonCode,
            'status_code' => $statusCode,
            'tire_set_name' => $this->normalizeShortText((string) ($payload['tire_set_name'] ?? '')) ?: null,
            'dimension' => $this->normalizeShortText((string) ($payload['dimension'] ?? '')) ?: null,
            'quantity' => $quantity,
            'tread_depth_mm' => $this->normalizeNullableDecimal($payload['tread_depth_mm'] ?? null, 0, 99.99),
            'acquired_at' => $acquiredAt,
            'installed_at' => $installedAt,
            'removed_at' => $removedAt,
            'supplier_name' => $this->normalizeShortText((string) ($payload['supplier_name'] ?? '')) ?: null,
            'storage_location' => $this->normalizeShortText((string) ($payload['storage_location'] ?? '')) ?: null,
            'cost_amount' => $this->normalizeNullableDecimal($payload['cost_amount'] ?? null, 0, 999999999999.99),
            'cost_currency' => 'CZK',
            'note' => $this->normalizeLongText((string) ($payload['note'] ?? '')) ?: null,
            'source' => 'v2',
            'created_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ]);
    }

    public function updateVehicleTires(int $tiresId, array $payload, int $actorUserId, bool $actorHasAllVehicles = true): ?array
    {
        $seasonCode = $this->requireActiveLookupCode('tire_season', $payload['season_code'] ?? null, 'Sezóna pneumatik');
        $statusCode = $this->requireActiveLookupCode('tire_status', $payload['status_code'] ?? null, 'Stav pneumatik');
        $acquiredAt = $this->normalizeDate((string) ($payload['acquired_at'] ?? ''));
        $installedAt = $this->normalizeDate((string) ($payload['installed_at'] ?? ''));
        $removedAt = $this->normalizeDate((string) ($payload['removed_at'] ?? ''));
        $this->assertDateOrder($acquiredAt, $installedAt, 'Datum nasazení nemůže být před datem pořízení.');
        $this->assertDateOrder($installedAt, $removedAt, 'Datum sejmutí nemůže být před datem nasazení.');
        $quantity = (int) ($payload['quantity'] ?? 4);
        if ($quantity < 1 || $quantity > 20) throw new RuntimeException('Počet pneumatik musí být 1 až 20.');
        return $this->vehicles->updateVehicleTires($tiresId, [
            'season_code' => $seasonCode,
            'status_code' => $statusCode,
            'tire_set_name' => $this->normalizeShortText((string) ($payload['tire_set_name'] ?? '')) ?: null,
            'dimension' => $this->normalizeShortText((string) ($payload['dimension'] ?? '')) ?: null,
            'quantity' => $quantity,
            'tread_depth_mm' => $this->normalizeNullableDecimal($payload['tread_depth_mm'] ?? null, 0, 99.99),
            'acquired_at' => $acquiredAt,
            'installed_at' => $installedAt,
            'removed_at' => $removedAt,
            'supplier_name' => $this->normalizeShortText((string) ($payload['supplier_name'] ?? '')) ?: null,
            'storage_location' => $this->normalizeShortText((string) ($payload['storage_location'] ?? '')) ?: null,
            'cost_amount' => $this->normalizeNullableDecimal($payload['cost_amount'] ?? null, 0, 999999999999.99),
            'cost_currency' => 'CZK',
            'note' => $this->normalizeLongText((string) ($payload['note'] ?? '')) ?: null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ], $actorUserId, $actorHasAllVehicles);
    }

    public function deleteVehicleTires(int $tiresId, int $actorUserId, bool $actorHasAllVehicles = true): bool
    {
        $existing = $this->vehicles->findVehicleTiresById($tiresId, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) {
            return false;
        }

        $this->deleteAttachmentsForContext((int) $existing['vehicle_id'], 'tires', $tiresId, $actorUserId);
        return $this->vehicles->softDeleteVehicleTires($tiresId, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleFunding(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        return $this->vehicles->listVehicleFunding($vehicleId, $actorUserId, $actorHasAllVehicles);
    }

    public function createVehicleFunding(int $vehicleId, array $payload, int $actorUserId): int
    {
        $fundingStatus = $this->requireActiveLookupCode('funding_status', $payload['funding_status_code'] ?? null, 'Stav financování');
        $grantTitle = $this->optionalActiveLookupCode('grant_title', $payload['grant_title_code'] ?? null, 'Dotační titul');
        $sustainabilityFrom = $this->normalizeDate((string) ($payload['sustainability_from'] ?? ''));
        $sustainabilityTo = $this->normalizeDate((string) ($payload['sustainability_to'] ?? ''));
        $this->assertDateOrder($sustainabilityFrom, $sustainabilityTo, 'Udržitelnost od nemůže být po udržitelnosti do.');
        $eligibleAmount = $this->normalizeNullableDecimal($payload['eligible_amount'] ?? null, 0, 999999999999.99);
        $grantAmount = $this->normalizeNullableDecimal($payload['grant_amount'] ?? null, 0, 999999999999.99);
        $ownShareAmount = $this->normalizeNullableDecimal($payload['own_share_amount'] ?? null, 0, 999999999999.99);
        $this->assertFundingAmounts($eligibleAmount, $grantAmount, $ownShareAmount);
        return $this->vehicles->createVehicleFunding([
            'vehicle_id' => $vehicleId,
            'funding_status_code' => $fundingStatus,
            'grant_title_code' => $grantTitle,
            'call_code' => $this->normalizeShortText((string) ($payload['call_code'] ?? '')) ?: null,
            'provider_name' => $this->normalizeShortText((string) ($payload['provider_name'] ?? '')) ?: null,
            'reference_number' => $this->normalizeShortText((string) ($payload['reference_number'] ?? '')) ?: null,
            'award_date' => $this->normalizeDate((string) ($payload['award_date'] ?? '')),
            'eligible_amount' => $eligibleAmount,
            'grant_amount' => $grantAmount,
            'own_share_amount' => $ownShareAmount,
            'amount_currency' => 'CZK',
            'sustainability_from' => $sustainabilityFrom,
            'sustainability_to' => $sustainabilityTo,
            'note' => $this->normalizeLongText((string) ($payload['note'] ?? '')) ?: null,
            'source' => 'v2',
            'created_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ]);
    }

    public function updateVehicleFunding(int $fundingId, array $payload, int $actorUserId, bool $actorHasAllVehicles = true): ?array
    {
        $fundingStatus = $this->requireActiveLookupCode('funding_status', $payload['funding_status_code'] ?? null, 'Stav financování');
        $grantTitle = $this->optionalActiveLookupCode('grant_title', $payload['grant_title_code'] ?? null, 'Dotační titul');
        $sustainabilityFrom = $this->normalizeDate((string) ($payload['sustainability_from'] ?? ''));
        $sustainabilityTo = $this->normalizeDate((string) ($payload['sustainability_to'] ?? ''));
        $this->assertDateOrder($sustainabilityFrom, $sustainabilityTo, 'Udržitelnost od nemůže být po udržitelnosti do.');
        $eligibleAmount = $this->normalizeNullableDecimal($payload['eligible_amount'] ?? null, 0, 999999999999.99);
        $grantAmount = $this->normalizeNullableDecimal($payload['grant_amount'] ?? null, 0, 999999999999.99);
        $ownShareAmount = $this->normalizeNullableDecimal($payload['own_share_amount'] ?? null, 0, 999999999999.99);
        $this->assertFundingAmounts($eligibleAmount, $grantAmount, $ownShareAmount);
        return $this->vehicles->updateVehicleFunding($fundingId, [
            'funding_status_code' => $fundingStatus,
            'grant_title_code' => $grantTitle,
            'call_code' => $this->normalizeShortText((string) ($payload['call_code'] ?? '')) ?: null,
            'provider_name' => $this->normalizeShortText((string) ($payload['provider_name'] ?? '')) ?: null,
            'reference_number' => $this->normalizeShortText((string) ($payload['reference_number'] ?? '')) ?: null,
            'award_date' => $this->normalizeDate((string) ($payload['award_date'] ?? '')),
            'eligible_amount' => $eligibleAmount,
            'grant_amount' => $grantAmount,
            'own_share_amount' => $ownShareAmount,
            'amount_currency' => 'CZK',
            'sustainability_from' => $sustainabilityFrom,
            'sustainability_to' => $sustainabilityTo,
            'note' => $this->normalizeLongText((string) ($payload['note'] ?? '')) ?: null,
            'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
            'metadata_json' => null,
        ], $actorUserId, $actorHasAllVehicles);
    }

    public function deleteVehicleFunding(int $fundingId, int $actorUserId, bool $actorHasAllVehicles = true): bool
    {
        $existing = $this->vehicles->findVehicleFundingById($fundingId, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) {
            return false;
        }

        $this->deleteAttachmentsForContext((int) $existing['vehicle_id'], 'funding', $fundingId, $actorUserId);
        return $this->vehicles->softDeleteVehicleFunding($fundingId, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleSuppliers(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        return $this->vehicles->listVehicleSuppliers($vehicleId, $actorUserId, $actorHasAllVehicles);
    }

    public function createVehicleSupplier(int $vehicleId, array $payload, int $actorUserId): int
    {
        return $this->vehicles->createVehicleSupplier($this->normalizeSupplierPayload($vehicleId, $payload, $actorUserId, true));
    }

    public function updateVehicleSupplier(int $id, array $payload, int $actorUserId, bool $actorHasAllVehicles = true): ?array
    {
        $existing = $this->vehicles->findVehicleSupplierById($id, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) return null;
        return $this->vehicles->updateVehicleSupplier($id, $this->normalizeSupplierPayload((int) $existing['vehicle_id'], $payload, $actorUserId, false), $actorUserId, $actorHasAllVehicles);
    }

    public function deleteVehicleSupplier(int $id, int $actorUserId, bool $actorHasAllVehicles = true): bool
    {
        $existing = $this->vehicles->findVehicleSupplierById($id, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) return false;
        $this->deleteAttachmentsForContext((int) $existing['vehicle_id'], 'supplier', $id, $actorUserId);
        return $this->vehicles->softDeleteVehicleSupplier($id, $actorUserId, $actorHasAllVehicles);
    }

    public function getVehicleWarrantyClaims(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        return $this->vehicles->listVehicleWarrantyClaims($vehicleId, $actorUserId, $actorHasAllVehicles);
    }

    public function createVehicleWarrantyClaim(int $vehicleId, array $payload, int $actorUserId): int
    {
        return $this->vehicles->createVehicleWarrantyClaim($this->normalizeWarrantyClaimPayload($vehicleId, $payload, $actorUserId, true));
    }

    public function updateVehicleWarrantyClaim(int $id, array $payload, int $actorUserId, bool $actorHasAllVehicles = true): ?array
    {
        $existing = $this->vehicles->findVehicleWarrantyClaimById($id, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) return null;
        return $this->vehicles->updateVehicleWarrantyClaim($id, $this->normalizeWarrantyClaimPayload((int) $existing['vehicle_id'], $payload, $actorUserId, false), $actorUserId, $actorHasAllVehicles);
    }

    public function deleteVehicleWarrantyClaim(int $id, int $actorUserId, bool $actorHasAllVehicles = true): bool
    {
        $existing = $this->vehicles->findVehicleWarrantyClaimById($id, $actorUserId, $actorHasAllVehicles);
        if ($existing === null) return false;
        $this->deleteAttachmentsForContext((int) $existing['vehicle_id'], 'warranty_claim', $id, $actorUserId);
        return $this->vehicles->softDeleteVehicleWarrantyClaim($id, $actorUserId, $actorHasAllVehicles);
    }

    private function normalizeSupplierPayload(int $vehicleId, array $payload, int $actorUserId, bool $isCreate): array
    {
        $role = $this->requireActiveLookupCode('supplier_role', $payload['supplier_role_code'] ?? null, 'Role dodavatele');
        $name = $this->normalizeShortText((string) ($payload['supplier_name'] ?? ''));
        if ($name === null) throw new RuntimeException('Název dodavatele je povinný.');
        $data = ['supplier_role_code' => $role, 'supplier_name' => $name, 'company_id' => $this->normalizeShortText((string) ($payload['company_id'] ?? '')) ?: null, 'contact_person' => $this->normalizeShortText((string) ($payload['contact_person'] ?? '')) ?: null, 'phone' => $this->normalizeShortText((string) ($payload['phone'] ?? '')) ?: null, 'email' => $this->normalizeShortText((string) ($payload['email'] ?? '')) ?: null, 'address' => $this->normalizeLongText((string) ($payload['address'] ?? ''), 500) ?: null, 'contract_number' => $this->normalizeShortText((string) ($payload['contract_number'] ?? '')) ?: null, 'valid_from' => $this->normalizeDate((string) ($payload['valid_from'] ?? '')), 'valid_to' => $this->normalizeDate((string) ($payload['valid_to'] ?? '')), 'note' => $this->normalizeLongText((string) ($payload['note'] ?? '')) ?: null, 'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null, 'metadata_json' => null];
        if ($data['valid_from'] && $data['valid_to'] && $data['valid_from'] > $data['valid_to']) throw new RuntimeException('Platnost od nemůže být po platnosti do.');
        if ($isCreate) $data += ['vehicle_id' => $vehicleId, 'source' => 'v2', 'created_by_user_id' => $actorUserId > 0 ? $actorUserId : null];
        return $data;
    }

    private function normalizeWarrantyClaimPayload(int $vehicleId, array $payload, int $actorUserId, bool $isCreate): array
    {
        $recordType = $this->requireActiveLookupCode('warranty_record_type', $payload['record_type_code'] ?? null, 'Typ záznamu');
        $subjectType = $this->requireActiveLookupCode('warranty_subject_type', $payload['subject_type_code'] ?? null, 'Předmět');
        $status = $this->requireActiveLookupCode('warranty_status', $payload['status_code'] ?? null, 'Stav');
        $resolutionCode = $this->optionalActiveLookupCode('warranty_resolution', $payload['resolution_code'] ?? null, 'Způsob vyřízení');
        $data = ['record_type_code' => $recordType, 'subject_type_code' => $subjectType, 'equipment_id' => (int) ($payload['equipment_id'] ?? 0) ?: null, 'supplier_id' => (int) ($payload['supplier_id'] ?? 0) ?: null, 'warranty_provider' => $this->normalizeShortText((string) ($payload['warranty_provider'] ?? '')) ?: null, 'warranty_from' => $this->normalizeDate((string) ($payload['warranty_from'] ?? '')), 'warranty_to' => $this->normalizeDate((string) ($payload['warranty_to'] ?? '')), 'external_reference' => $this->normalizeShortText((string) ($payload['external_reference'] ?? '')) ?: null, 'status_code' => $status, 'reported_at' => $this->normalizeDate((string) ($payload['reported_at'] ?? '')), 'resolved_at' => $this->normalizeDate((string) ($payload['resolved_at'] ?? '')), 'title' => $this->normalizeShortText((string) ($payload['title'] ?? '')) ?: null, 'description' => $this->normalizeLongText((string) ($payload['description'] ?? '')) ?: null, 'resolution_code' => $resolutionCode, 'cost_amount' => $this->normalizeNullableDecimal($payload['cost_amount'] ?? null, 0, 999999999999.99), 'cost_currency' => 'CZK', 'note' => $this->normalizeLongText((string) ($payload['note'] ?? '')) ?: null, 'updated_by_user_id' => $actorUserId > 0 ? $actorUserId : null, 'metadata_json' => null];
        if ($data['warranty_from'] && $data['warranty_to'] && $data['warranty_from'] > $data['warranty_to']) throw new RuntimeException('Záruka od nemůže být po záruce do.');
        $equipment = $data['equipment_id'] ? $this->vehicles->findVehicleEquipmentById($data['equipment_id'], $actorUserId, true) : null;
        $supplier = $data['supplier_id'] ? $this->vehicles->findVehicleSupplierById($data['supplier_id'], $actorUserId, true) : null;
        if ($data['equipment_id'] && (int) ($equipment['vehicle_id'] ?? 0) !== $vehicleId) throw new RuntimeException('Vybrané vybavení nepatří k vozidlu.');
        if ($data['equipment_id'] && $data['subject_type_code'] !== 'equipment') throw new RuntimeException('Při výběru vybavení musí být předmět nastaven na Vybavení.');
        if ($data['supplier_id'] && (int) ($supplier['vehicle_id'] ?? 0) !== $vehicleId) throw new RuntimeException('Vybraný dodavatel nepatří k vozidlu.');
        if ($isCreate) $data += ['vehicle_id' => $vehicleId, 'source' => 'v2', 'created_by_user_id' => $actorUserId > 0 ? $actorUserId : null];
        return $data;
    }

    private function requireActiveLookupCode(string $category, mixed $value, string $fieldLabel): string
    {
        $code = $this->normalizeLookupCode($value);
        if ($code === null || !$this->vehicles->hasActiveLookupItem($category, $code)) {
            throw new RuntimeException($fieldLabel . ' musí být platná aktivní hodnota číselníku.');
        }
        return $code;
    }

    private function optionalActiveLookupCode(string $category, mixed $value, string $fieldLabel): ?string
    {
        $code = $this->normalizeLookupCode($value);
        if ($code !== null && !$this->vehicles->hasActiveLookupItem($category, $code)) {
            throw new RuntimeException($fieldLabel . ' musí být platná aktivní hodnota číselníku.');
        }
        return $code;
    }

    private function normalizeClaimPolicyId(mixed $value, int $vehicleId, int $actorUserId, bool $actorHasAllVehicles): ?int
    {
        $policyId = (int) ($value ?? 0);
        if ($policyId <= 0) {
            return null;
        }

        $policy = $this->vehicles->findVehicleInsurancePolicyById($policyId, $actorUserId, $actorHasAllVehicles);
        if ($policy === null || (int) ($policy['vehicle_id'] ?? 0) !== $vehicleId) {
            throw new RuntimeException('Vybraná pojistná smlouva nepatří k tomuto vozidlu.');
        }

        return $policyId;
    }

    private function assertDateOrder(?string $from, ?string $to, string $message): void
    {
        if ($from !== null && $to !== null && $from > $to) {
            throw new RuntimeException($message);
        }
    }

    private function assertFundingAmounts(?float $eligibleAmount, ?float $grantAmount, ?float $ownShareAmount): void
    {
        if ($eligibleAmount === null) {
            return;
        }
        if ($grantAmount !== null && $grantAmount > $eligibleAmount) {
            throw new RuntimeException('Dotace nemůže být vyšší než způsobilé výdaje.');
        }
        if ($ownShareAmount !== null && $ownShareAmount > $eligibleAmount) {
            throw new RuntimeException('Vlastní podíl nemůže být vyšší než způsobilé výdaje.');
        }
        if ($grantAmount !== null && $ownShareAmount !== null && ($grantAmount + $ownShareAmount) > ($eligibleAmount + 0.01)) {
            throw new RuntimeException('Součet dotace a vlastního podílu nemůže být vyšší než způsobilé výdaje.');
        }
    }

    public function uploadVehicleAttachment(int $vehicleId, array $file, array $payload, int $actorUserId): array
    {
        if ($vehicleId <= 0 || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Soubor přílohy nebyl správně přijat.');
        }

        $size = (int) ($file['size'] ?? 0);
        $maxAttachmentBytes = (int) Env::requireValue('VEHICLES_V2_ATTACHMENT_MAX_BYTES');
        if ($size <= 0 || $size > $maxAttachmentBytes) {
            throw new RuntimeException('Příloha překračuje povolenou velikost.');
        }

        $tmpName = (string) ($file['tmp_name'] ?? '');
        if (!is_uploaded_file($tmpName)) {
            throw new RuntimeException('Příloha nebyla přijata jako uploadovaný soubor.');
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = (string) $finfo->file($tmpName);
        $allowedMimeTypes = $this->attachmentMimeExtensions();
        if (!array_key_exists($mimeType, $allowedMimeTypes)) {
            throw new RuntimeException('Typ souboru není pro přílohy vozidla povolen.');
        }

        $documentTypeCode = strtolower(trim((string) ($payload['document_type_code'] ?? '')));
        if (!preg_match('/^[a-z0-9_]{2,64}$/', $documentTypeCode)) {
            throw new RuntimeException('Neplatný kód typu dokumentu.');
        }
        $contextModule = strtolower(trim((string) ($payload['context_module'] ?? 'vehicle')));
        $allowedContextModules = ['vehicle', 'service', 'equipment', 'insurance_policy', 'insurance_claim', 'tires', 'funding', 'supplier', 'warranty_claim'];
        if (!in_array($contextModule, $allowedContextModules, true)) {
            throw new RuntimeException('Neplatný zdrojový modul přílohy.');
        }
        $contextRecordId = (int) ($payload['context_record_id'] ?? 0);
        if ($contextRecordId > 0 && !$this->vehicles->attachmentContextRecordBelongsToVehicle($contextModule, $contextRecordId, $vehicleId)) {
            throw new RuntimeException('Navázaný záznam modulu nepatří k tomuto vozidlu.');
        }

        $originalFilename = $this->normalizeAttachmentOriginalFilename((string) ($file['name'] ?? ''));
        $storageRoot = $this->getAttachmentStorageRoot();
        $relativeKey = $vehicleId . '/' . bin2hex(random_bytes(16)) . '.' . $allowedMimeTypes[$mimeType];
        $targetDirectory = $storageRoot . '/' . $vehicleId;
        $targetPath = $storageRoot . '/' . $relativeKey;
        if (!is_dir($targetDirectory) && !mkdir($targetDirectory, 0770, true) && !is_dir($targetDirectory)) {
            throw new RuntimeException('Úložiště příloh se nepodařilo připravit.');
        }
        if (!move_uploaded_file($tmpName, $targetPath)) {
            throw new RuntimeException('Přílohu se nepodařilo uložit.');
        }

        $attachmentSnapshot = [
            'original_filename' => $originalFilename,
            'context_module' => $contextModule,
            'context_record_id' => $contextRecordId > 0 ? $contextRecordId : null,
            'document_type_code' => $documentTypeCode,
            'note' => $this->normalizeAttachmentText($payload['note'] ?? null),
            'valid_from' => $this->normalizeDate((string) ($payload['valid_from'] ?? '')),
            'valid_to' => $this->normalizeDate((string) ($payload['valid_to'] ?? '')),
            'mime_type' => $mimeType,
            'size_bytes' => $size,
            'uploaded_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
        ];

        try {
            $attachmentId = $this->vehicles->createVehicleAttachment([
                'vehicle_id' => $vehicleId,
                'context_module' => $contextModule,
                'context_record_id' => $contextRecordId > 0 ? $contextRecordId : null,
                'document_type_code' => $documentTypeCode,
                'original_filename' => $originalFilename,
                'storage_key' => $relativeKey,
                'mime_type' => $mimeType,
                'size_bytes' => $size,
                'sha256' => hash_file('sha256', $targetPath),
                'note' => $attachmentSnapshot['note'],
                'valid_from' => $attachmentSnapshot['valid_from'],
                'valid_to' => $attachmentSnapshot['valid_to'],
                'uploaded_by_user_id' => $actorUserId > 0 ? $actorUserId : null,
                'metadata_json' => null,
            ]);
            $this->vehicles->appendVehicleAuditEvent([
                'vehicle_id' => $vehicleId,
                'event_type' => 'attachment_uploaded',
                'field_name' => 'attachment',
                'new_value' => $originalFilename,
                'new_value_json' => json_encode($attachmentSnapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'actor_user_id' => $actorUserId > 0 ? $actorUserId : null,
                'actor_type' => $actorUserId > 0 ? 'user' : 'system',
                'source' => 'v2_attachment',
            ]);
        } catch (Throwable $e) {
            @unlink($targetPath);
            throw $e;
        }

        return [
            'id' => $attachmentId,
            'vehicle_id' => $vehicleId,
            'context_module' => $contextModule,
            'context_record_id' => $contextRecordId > 0 ? $contextRecordId : null,
            'document_type_code' => $documentTypeCode,
            'original_filename' => $originalFilename,
            'mime_type' => $mimeType,
            'size_bytes' => $size,
        ];
    }

    public function findVehicleAttachment(int $attachmentId, int $actorUserId, bool $actorHasAllVehicles): ?array
    {
        return $this->vehicles->findVehicleAttachmentById($attachmentId, $actorUserId, $actorHasAllVehicles);
    }

    public function getAttachmentStorageRoot(): string
    {
        $storageRoot = rtrim(Env::requireValue('VEHICLES_V2_ATTACHMENT_ROOT'), '/\\');
        if ($storageRoot === '' || !str_starts_with($storageRoot, DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('Konfigurace VEHICLES_V2_ATTACHMENT_ROOT musí obsahovat absolutní cestu.');
        }

        return $storageRoot;
    }

    public function deleteVehicleAttachment(int $attachmentId, int $actorUserId, bool $actorHasAllVehicles = true): ?array
    {
        $attachment = $this->vehicles->findVehicleAttachmentById($attachmentId, $actorUserId, $actorHasAllVehicles);
        if ($attachment === null) {
            return null;
        }

        $attachmentSnapshot = [
            'original_filename' => (string) ($attachment['original_filename'] ?? ''),
            'context_module' => (string) ($attachment['context_module'] ?? ''),
            'context_record_id' => $attachment['context_record_id'] ?? null,
            'document_type_code' => (string) ($attachment['document_type_code'] ?? ''),
            'note' => (string) ($attachment['note'] ?? ''),
            'valid_from' => $attachment['valid_from'] ?? null,
            'valid_to' => $attachment['valid_to'] ?? null,
            'mime_type' => (string) ($attachment['mime_type'] ?? ''),
            'size_bytes' => $attachment['size_bytes'] ?? null,
            'uploaded_by_user_id' => $attachment['uploaded_by_user_id'] ?? null,
        ];

        $this->deleteAttachmentFile((string) ($attachment['storage_key'] ?? ''));
        $attachment = $this->vehicles->softDeleteVehicleAttachment($attachmentId, $actorUserId, $actorHasAllVehicles);
        if ($attachment !== null) {
            $this->vehicles->appendVehicleAuditEvent([
                'vehicle_id' => (int) $attachment['vehicle_id'],
                'event_type' => 'attachment_deleted',
                'field_name' => 'attachment',
                'old_value' => $attachment['original_filename'],
                'old_value_json' => json_encode($attachmentSnapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'actor_user_id' => $actorUserId > 0 ? $actorUserId : null,
                'actor_type' => $actorUserId > 0 ? 'user' : 'system',
                'source' => 'v2_attachment',
            ]);
        }
        return $attachment;
    }

    private function normalizeAttachmentText(mixed $value): ?string
    {
        $text = trim((string) ($value ?? ''));
        return $text === '' ? null : mb_substr($text, 0, 1000);
    }

    private function normalizeAttachmentOriginalFilename(string $filename): string
    {
        $filename = basename(str_replace('\\', '/', trim($filename)));
        $filename = preg_replace('/[\x00-\x1F\x7F]/u', '', $filename) ?? '';
        $filename = trim($filename);
        if ($filename === '') {
            return 'attachment';
        }
        if (!mb_check_encoding($filename, 'UTF-8')) {
            throw new RuntimeException('Název přílohy není platný UTF-8 text.');
        }

        return mb_substr($filename, 0, 255);
    }

    private function attachmentMimeExtensions(): array
    {
        $mapping = [];
        foreach (explode(',', Env::requireValue('VEHICLES_V2_ATTACHMENT_ALLOWED_MIME_TYPES')) as $entry) {
            [$mimeType, $extension] = array_pad(explode('=', trim($entry), 2), 2, '');
            $mimeType = trim($mimeType);
            $extension = strtolower(trim($extension));
            if (!preg_match('#^[a-z0-9.+-]+/[a-z0-9.+-]+$#', $mimeType) || !preg_match('/^[a-z0-9]{1,10}$/', $extension)) {
                throw new RuntimeException('VEHICLES_V2_ATTACHMENT_ALLOWED_MIME_TYPES má neplatný formát.');
            }
            $mapping[$mimeType] = $extension;
        }

        if ($mapping === []) {
            throw new RuntimeException('VEHICLES_V2_ATTACHMENT_ALLOWED_MIME_TYPES nesmí být prázdné.');
        }

        return $mapping;
    }

    public function getMonthlyBilling(
        int $vehicleId,
        int $year,
        int $month,
        int $actorUserId = 0,
        bool $actorHasAllVehicles = true
    ): array {
        $detail = $this->vehicles->getVehicleDetailById($vehicleId, $actorUserId, $actorHasAllVehicles);
        if ($detail === null) {
            throw new RuntimeException('Vozidlo nebylo nalezeno nebo k němu nemáte přístup.');
        }

        $legacyCarId = (int) ($detail['legacy_carid'] ?? 0);
        if ($legacyCarId <= 0) {
            throw new RuntimeException('Vozidlo nemá dostupné WebDispečink ID (legacy_carid).');
        }

        $notice = null;
        try {
            $stats = $this->webDispecink->getMonthlyStats($legacyCarId, $year, $month);
            $consumption = $this->webDispecink->getMonthlyConsumption($legacyCarId, $year, $month);
            $ccsInfo = $this->webDispecink->getCcsCardInfo(
                $legacyCarId,
                $year,
                $month,
                (string) ($detail['spz'] ?? ''),
                (string) ($detail['w_popis'] ?? '')
            );
            $hasCcs = (bool) ($ccsInfo['imported'] ?? false);
            $ccsCardNumber = $ccsInfo['card_number'] ?? null;
            $ccsCardExpiration = $ccsInfo['card_expiration'] ?? null;
        } catch (RuntimeException $e) {
            if (!$this->webDispecink->isPackageNotActivatedError($e)) {
                throw $e;
            }

            $stats = [];
            $consumption = [];
            $hasCcs = false;
            $ccsCardNumber = null;
            $ccsCardExpiration = null;
            $notice = 'WebDispecink API balíček pro měsíční vyúčtování není pro tuto firmu aktivní.';
        }

        $stat = $stats[0] ?? [];
        $cons = $consumption[0] ?? [];

        $kmBusiness = (float) ($stat['km_business'] ?? 0);
        $kmPrivate = (float) ($stat['km_private'] ?? 0);
        $kmTotal = (float) ($stat['km_total'] ?? 0);
        $totalCosts = (float) ($stat['total_costs_czk'] ?? 0);

        $privateCosts = 0.0;
        $businessCosts = 0.0;
        if ($kmTotal > 0.0 && $totalCosts > 0.0) {
            $businessCosts = $totalCosts * ($kmBusiness / $kmTotal);
            $privateCosts = $totalCosts * ($kmPrivate / $kmTotal);
        }

        $avgConsumptionFromStats = (float) ($stat['avg_consumption_l_100km'] ?? 0);
        $avgConsumption = (float) ($cons['avg_consumption'] ?? 0);
        if ($avgConsumption <= 0.0 && $avgConsumptionFromStats > 0.0) {
            $avgConsumption = $avgConsumptionFromStats;
        }

        return [
            'period' => sprintf('%02d/%04d', $month, $year),
            'notice' => $notice,
            'item' => [
                'car_id' => $legacyCarId,
                'driver_name' => is_string($stat['driver_name'] ?? null) && trim((string) $stat['driver_name']) !== ''
                    ? trim((string) $stat['driver_name'])
                    : null,
                'driver_personal_number' => is_string($stat['driver_personal_number'] ?? null) && trim((string) $stat['driver_personal_number']) !== ''
                    ? trim((string) $stat['driver_personal_number'])
                    : null,
                'ccs_card_imported' => (bool) $hasCcs,
                'ccs_card_number' => is_string($ccsCardNumber) && trim($ccsCardNumber) !== '' ? trim($ccsCardNumber) : null,
                'ccs_card_expiration' => is_string($ccsCardExpiration) && trim($ccsCardExpiration) !== '' ? trim($ccsCardExpiration) : null,
                'km_business' => $kmBusiness,
                'km_private' => $kmPrivate,
                'km_total' => $kmTotal,
                'fuel_start_l' => (float) ($stat['fuel_start_l'] ?? 0),
                'fuel_end_l' => (float) ($stat['fuel_end_l'] ?? 0),
                'fuel_draw_l' => (float) ($stat['fuel_draw_l'] ?? 0),
                'fuel_draw_cost_czk' => (float) ($stat['fuel_draw_cost_czk'] ?? 0),
                'paid_by_driver_czk' => (float) ($stat['paid_by_driver_czk'] ?? 0),
                'avg_fuel_price_czk_l' => (float) ($stat['avg_fuel_price_czk_l'] ?? 0),
                'total_consumption_l' => (float) ($cons['total_consumption_l'] ?? 0),
                'avg_consumption' => $avgConsumption,
                'amortization_czk' => (float) ($stat['amortization_czk'] ?? 0),
                'driver_reimbursement_czk' => (float) ($stat['driver_reimbursement_czk'] ?? 0),
                'total_costs_czk' => $totalCosts,
                'costs_business_czk' => $businessCosts,
                'costs_private_czk' => $privateCosts,
            ],
        ];
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

    public function saveVehicleDetail(int $vehicleId, array $payload, int $actorUserId = 0): void
    {
        $manualLocationState = $this->normalizeLocationState((string) ($payload['manual_location_state'] ?? ''));
        $serviceContextJson = $this->normalizeJsonFromMixed($payload['service_context_json'] ?? null);
        $normalized = [
            'zzs_typ' => $this->normalizeShortText((string) ($payload['zzs_typ'] ?? ''), 100),
            'w_popis' => $this->normalizeShortText((string) ($payload['w_popis'] ?? ''), 255),
            'service_notes' => $this->normalizeLongText((string) ($payload['service_notes'] ?? '')),
            'equipment_json' => $this->normalizeJson((string) ($payload['equipment_json'] ?? '')),
            'technical_notes' => $this->normalizeLongText((string) ($payload['technical_notes'] ?? '')),
            'insurance_policy' => $this->normalizeLongText((string) ($payload['insurance_policy'] ?? '')),
            'stk_valid_to' => $this->normalizeDate((string) ($payload['stk_valid_to'] ?? '')),
            'emission_valid_to' => $this->normalizeDate((string) ($payload['emission_valid_to'] ?? '')),
            'evidencni_cislo_zzs' => $this->normalizeShortText((string) ($payload['evidencni_cislo_zzs'] ?? '')),
            'vin' => $this->normalizeShortText((string) ($payload['vin'] ?? ''), 64),
            'acquisition_year' => $this->normalizeNullableInt($payload['acquisition_year'] ?? null, 1900, 2100),
            'acquisition_supplier' => $this->normalizeShortText((string) ($payload['acquisition_supplier'] ?? '')),
            'warranty_valid_to' => $this->normalizeDate((string) ($payload['warranty_valid_to'] ?? '')),
            'acquisition_price' => $this->normalizeNullableDecimal($payload['acquisition_price'] ?? null, 0, 999999999999.99),
            'technical_condition_code' => $this->normalizeLookupCode($payload['technical_condition_code'] ?? null),
            'service_interval_km' => $this->normalizeNullableInt($payload['service_interval_km'] ?? null, 0, 999999999),
            'service_interval_months' => $this->normalizeNullableInt($payload['service_interval_months'] ?? null, 0, 1200),
            'battery_condition_code' => $this->normalizeLookupCode($payload['battery_condition_code'] ?? null),
            'vehicle_lifetime_percent' => $this->normalizeNullableDecimal($payload['vehicle_lifetime_percent'] ?? null, 0, 100),
            'manual_location_state' => $manualLocationState,
            'manual_location_updated_at' => $manualLocationState !== null ? (new DateTimeImmutable('now', new DateTimeZone('Europe/Prague')))->format('Y-m-d H:i:s') : null,
            'service_context_json' => $serviceContextJson,
        ];

        $this->vehicles->saveVehicleDetailById($vehicleId, $normalized, $actorUserId);
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

        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $matches) !== 1 || !checkdate((int) $matches[2], (int) $matches[3], (int) $matches[1])) {
            throw new RuntimeException('Datum musí být platné ve formátu RRRR-MM-DD.');
        }

        return $value;
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

    private function normalizeShortText(string $value, int $maxLength = 190): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        return mb_substr($value, 0, $maxLength);
    }

    private function normalizeLongText(string $value, int $maxLength = 1000): ?string
    {
        return $this->normalizeShortText($value, $maxLength);
    }

    private function normalizeNullableInt(mixed $value, int $min, int $max): ?int
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }
        if (filter_var($value, FILTER_VALIDATE_INT) === false && (string) (int) $value !== (string) $value) {
            throw new RuntimeException('Číselná hodnota není platné celé číslo.');
        }
        $normalized = (int) $value;
        if ($normalized < $min || $normalized > $max) {
            throw new RuntimeException(sprintf('Číselná hodnota musí být v rozsahu %d až %d.', $min, $max));
        }
        return $normalized;
    }

    private function normalizeNullableDecimal(mixed $value, float $min, float $max): ?float
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }
        $normalized = (float) str_replace(',', '.', (string) $value);
        if (!is_finite($normalized) || $normalized < $min || $normalized > $max) {
            throw new RuntimeException(sprintf('Desetinná hodnota musí být v rozsahu %s až %s.', $min, $max));
        }
        return $normalized;
    }

    private function normalizeLookupCode(mixed $value): ?string
    {
        $normalized = strtolower(trim((string) ($value ?? '')));
        if ($normalized === '') {
            return null;
        }
        if (!preg_match('/^[a-z0-9_]{2,64}$/', $normalized)) {
            throw new RuntimeException('Neplatný kód číselníku.');
        }
        return $normalized;
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

<?php

declare(strict_types=1);

final class VehicleRepository
{
    private const TBL_WD_GENERAL = 'vehicles_wd_cars_general_v2';
    private const TBL_WD_POSITIONS = 'vehicles_wd_positions_v2';
    private const TBL_WD_KM_STATS = 'vehicles_wd_km_stats_v2';

    public function __construct(private PDO $pdo)
    {
    }

    public function listVehicles(
        string $query = '',
        string $sortBy = 'spz',
        string $sortDir = 'asc',
        int $page = 1,
        int $perPage = 50
    ): array
    {
        $sortColumns = [
            'spz' => 'v.spz',
            'zzs_typ' => 'd.zzs_typ',
            'w_popis' => 'd.w_popis',
            'w_tovarni_znacka' => 'v.w_tovarni_znacka',
            'w_model_vozu' => 'v.w_model_vozu',
            'w_typ_phm' => 'v.w_typ_phm',
            'last_update' => 'v.last_update',
            'status' => 'v.status',
        ];

        $normalizedSortBy = array_key_exists($sortBy, $sortColumns) ? $sortBy : 'spz';
        $sortColumn = $sortColumns[$normalizedSortBy];
        $sortDirection = strtolower($sortDir) === 'desc' ? 'DESC' : 'ASC';
        $page = max(1, $page);
        $perPage = max(1, min(200, $perPage));
        $offset = ($page - 1) * $perPage;

        $fromSql = ' FROM vehicles_cars_list_v2 v
            LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id';

        $whereSql = '';
        $params = [];
        if ($query !== '') {
            $whereSql = ' WHERE v.spz LIKE :term OR v.w_tovarni_znacka LIKE :term OR v.w_model_vozu LIKE :term OR d.w_popis LIKE :term';
            $params['term'] = '%' . $query . '%';
        }

        $countStmt = $this->pdo->prepare('SELECT COUNT(*)' . $fromSql . $whereSql);
        $countStmt->execute($params);
        $totalFiltered = (int) $countStmt->fetchColumn();

        $totalAll = $totalFiltered;
        if ($query !== '') {
            $totalAllStmt = $this->pdo->query('SELECT COUNT(*) FROM vehicles_cars_list_v2');
            $totalAll = (int) $totalAllStmt->fetchColumn();
        }

        $sql = 'SELECT v.id,
                   v.spz,
                   v.status,
                   v.w_tovarni_znacka,
                   v.w_model_vozu,
                   v.w_typ_phm,
                   d.zzs_typ,
                   d.w_popis,
                   v.w_cargroupid,
                   v.w_groupname,
                   v.w_online,
                   v.w_disabled,
                   DATE_FORMAT(v.last_update, "%Y-%m-%d %H:%i:%s") AS last_update
            ' . $fromSql . $whereSql . " ORDER BY {$sortColumn} {$sortDirection}, v.id ASC LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        if (isset($params['term'])) {
            $stmt->bindValue(':term', $params['term'], PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => $stmt->fetchAll(),
            'total' => $totalFiltered,
            'totalAll' => $totalAll,
            'page' => $page,
            'perPage' => $perPage,
            'sortBy' => $normalizedSortBy,
            'sortDir' => strtolower($sortDirection),
            'query' => $query,
        ];
    }

    public function migrateFromLegacyCarsList(): int
    {
        $sql = 'INSERT INTO vehicles_cars_list_v2 (legacy_carid, spz, status, w_tovarni_znacka, w_model_vozu, w_typ_phm, last_update)
                SELECT
                    lc.w_carid,
                    REPLACE(lc.w_spz, " ", "") AS spz,
                    COALESCE(lc.status_vozidla, "") AS status,
                    cd.w_tovarni_znacka,
                    cd.w_model_vozu,
                    cd.w_typ_phm,
                    COALESCE(lc.last_update, NOW()) AS last_update
                FROM list_cars lc
                LEFT JOIN cars_detail cd ON cd.w_carid = lc.w_carid
                ON DUPLICATE KEY UPDATE
                    status = VALUES(status),
                    w_tovarni_znacka = VALUES(w_tovarni_znacka),
                    w_model_vozu = VALUES(w_model_vozu),
                    w_typ_phm = VALUES(w_typ_phm),
                    last_update = VALUES(last_update),
                    migrated_at = NOW()';

        return (int) $this->pdo->exec($sql);
    }

    public function upsertCarsFromWebDispecink(array $cars): int
    {
        $sql = 'INSERT INTO vehicles_cars_list_v2
                    (legacy_carid, spz, status, w_cargroupid, w_groupname, w_online, w_disabled, last_update)
                VALUES
                    (:carid, :spz, :status, :w_cargroupid, :w_groupname, :w_online, :w_disabled, :last_update)
                ON DUPLICATE KEY UPDATE
                    spz = VALUES(spz),
                    status = VALUES(status),
                    w_cargroupid = VALUES(w_cargroupid),
                    w_groupname = VALUES(w_groupname),
                    w_online = VALUES(w_online),
                    w_disabled = VALUES(w_disabled),
                    last_update = VALUES(last_update),
                    migrated_at = NOW()';

        $stmt = $this->pdo->prepare($sql);
        $now = date('Y-m-d H:i:s');
        $count = 0;

        foreach ($cars as $car) {
            $carId = (int) ($car['carid'] ?? 0);
            if ($carId <= 0) {
                continue;
            }

            $stmt->execute([
                'carid' => $carId,
                'spz' => (string) ($car['identifier'] ?? ''),
                'status' => (string) ($car['status_vozidla'] ?? ''),
                'w_cargroupid' => isset($car['w_cargroupid']) ? (int) $car['w_cargroupid'] : null,
                'w_groupname' => $car['w_groupname'] ?? null,
                'w_online' => isset($car['w_online']) ? (int) $car['w_online'] : null,
                'w_disabled' => isset($car['w_disabled']) ? (int) $car['w_disabled'] : null,
                'last_update' => $now,
            ]);

            $count++;
        }

        return $count;
    }

    public function upsertCarsGroupsFromWebDispecink(array $groups): int
    {
        if (!$this->tableExists('vehicles_cars_groups_v2')) {
            return 0;
        }

        $sql = 'INSERT INTO vehicles_cars_groups_v2
                    (legacy_groupid, groupname, numcars, last_update)
                VALUES
                    (:groupid, :groupname, :numcars, :last_update)
                ON DUPLICATE KEY UPDATE
                    groupname = VALUES(groupname),
                    numcars = VALUES(numcars),
                    last_update = VALUES(last_update),
                    migrated_at = NOW()';

        $stmt = $this->pdo->prepare($sql);
        $now = date('Y-m-d H:i:s');
        $count = 0;

        foreach ($groups as $group) {
            $groupId = (int) ($group['groupid'] ?? 0);
            if ($groupId <= 0) {
                continue;
            }

            $stmt->execute([
                'groupid' => $groupId,
                'groupname' => (string) ($group['groupname'] ?? ''),
                'numcars' => isset($group['numcars']) ? (int) $group['numcars'] : 0,
                'last_update' => $now,
            ]);

            $count++;
        }

        return $count;
    }

    public function markCarsMissingFromWebDispecinkAsRetired(array $returnedCarIds): int
    {
        if ($returnedCarIds === []) {
            return 0;
        }

        $returnedCarIds = array_values(array_unique(array_map('intval', $returnedCarIds)));
        $placeholders = implode(',', array_fill(0, count($returnedCarIds), '?'));
        $sql = "UPDATE vehicles_cars_list_v2
                SET status = 'vyrazene', last_update = ?, migrated_at = NOW()
                WHERE legacy_carid NOT IN ($placeholders)";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_merge([date('Y-m-d H:i:s')], $returnedCarIds));

        return $stmt->rowCount();
    }

    public function upsertGeneralInfoFromWebDispecink(array $rows): int
    {
        $cacheStmt = null;
        if ($this->tableExists(self::TBL_WD_GENERAL)) {
            $cacheStmt = $this->pdo->prepare(
                'INSERT INTO ' . self::TBL_WD_GENERAL . '
                    (legacy_carid, w_tovarni_znacka, w_model_vozu, w_typ_phm, w_stanoviste, w_nadrz, last_sync_at)
                 VALUES
                    (:legacy_carid, :w_tovarni_znacka, :w_model_vozu, :w_typ_phm, :w_stanoviste, :w_nadrz, :last_sync_at)
                 ON DUPLICATE KEY UPDATE
                    w_tovarni_znacka = VALUES(w_tovarni_znacka),
                    w_model_vozu = VALUES(w_model_vozu),
                    w_typ_phm = VALUES(w_typ_phm),
                    w_stanoviste = VALUES(w_stanoviste),
                    w_nadrz = VALUES(w_nadrz),
                    last_sync_at = VALUES(last_sync_at),
                    updated_at = CURRENT_TIMESTAMP'
            );
        }

        $stmt = $this->pdo->prepare(
            'UPDATE vehicles_cars_list_v2
             SET w_tovarni_znacka = :w_tovarni_znacka,
                 w_model_vozu = :w_model_vozu,
                 w_typ_phm = :w_typ_phm,
                 migrated_at = NOW()
             WHERE legacy_carid = :carid'
        );

        $upsertStmt = $this->pdo->prepare(
            'INSERT INTO vehicles_detail_cards (vehicle_id, w_stanoviste, w_nadrz, updated_at)
             VALUES (:vehicle_id, :w_stanoviste, :w_nadrz, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE
                 w_stanoviste = VALUES(w_stanoviste),
                 w_nadrz = VALUES(w_nadrz),
                 updated_at = CURRENT_TIMESTAMP'
        );

        $vehicleIdStmt = $this->pdo->prepare(
            'SELECT id FROM vehicles_cars_list_v2 WHERE legacy_carid = :legacy_carid LIMIT 1'
        );

        $count = 0;
        foreach ($rows as $row) {
            $carId = (int) ($row['carid'] ?? 0);
            if ($carId <= 0) {
                continue;
            }

            $vehicleIdStmt->execute(['legacy_carid' => $carId]);
            $vehicleId = (int) $vehicleIdStmt->fetchColumn();
            if ($vehicleId <= 0) {
                continue;
            }

            if ($cacheStmt !== null) {
                $cacheStmt->execute([
                    'legacy_carid' => $carId,
                    'w_tovarni_znacka' => $row['w_tovarni_znacka'] ?? null,
                    'w_model_vozu' => $row['w_model_vozu'] ?? null,
                    'w_typ_phm' => $row['w_typ_phm'] ?? null,
                    'w_stanoviste' => $row['w_stanoviste'] ?? null,
                    'w_nadrz' => $row['w_nadrz'] ?? null,
                    'last_sync_at' => date('Y-m-d H:i:s'),
                ]);
            }

            $stmt->execute([
                'w_tovarni_znacka' => $row['w_tovarni_znacka'] ?? null,
                'w_model_vozu' => $row['w_model_vozu'] ?? null,
                'w_typ_phm' => $row['w_typ_phm'] ?? null,
                'carid' => $carId,
            ]);

            $upsertStmt->execute([
                'vehicle_id' => $vehicleId,
                'w_stanoviste' => $row['w_stanoviste'] ?? null,
                'w_nadrz' => $row['w_nadrz'] ?? null,
            ]);

            $count += $stmt->rowCount();
        }

        return $count;
    }

    public function upsertZzsTypFromLegacyCarsList(): int
    {
        $sql = 'INSERT INTO vehicles_detail_cards (vehicle_id, zzs_typ)
                SELECT
                    v.id AS vehicle_id,
                    NULLIF(TRIM(lc.zzs_typ), "") AS zzs_typ
                FROM vehicles_cars_list_v2 v
                LEFT JOIN list_cars lc ON lc.w_carid = v.legacy_carid
                WHERE NULLIF(TRIM(COALESCE(lc.zzs_typ, "")), "") IS NOT NULL
                ON DUPLICATE KEY UPDATE
                    zzs_typ = VALUES(zzs_typ),
                    updated_at = CURRENT_TIMESTAMP';

        return (int) $this->pdo->exec($sql);
    }

    public function insertCarsPositionsSnapshot(array $rows): int
    {
        if (
            !$this->tableExists(self::TBL_WD_POSITIONS)
            || !$this->columnExists(self::TBL_WD_POSITIONS, 'w_carid')
            || !$this->columnExists(self::TBL_WD_POSITIONS, 'w_km')
        ) {
            return 0;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO ' . self::TBL_WD_POSITIONS . '
                (w_carid, w_majak, w_pt, w_lp, w_km, w_ln, w_zs, w_zd, dt_aktualizace)
             VALUES
                (:w_carid, :w_majak, :w_pt, :w_lp, :w_km, :w_ln, :w_zs, :w_zd, :dt_aktualizace)'
        );

        $count = 0;
        $now = date('Y-m-d H:i:s');
        foreach ($rows as $row) {
            $carId = (int) ($row['carid'] ?? 0);
            if ($carId <= 0) {
                continue;
            }

            $wPt = $this->normalizePositionDate((string) ($row['w_pt'] ?? ''));
            $wLp = $this->normalizePositionDate((string) ($row['w_lp'] ?? ''));
            if ($wPt === null || $wLp === null) {
                continue;
            }

            $stmt->execute([
                'w_carid' => $carId,
                'w_majak' => $this->normalizeNonEmptyText((string) ($row['w_majak'] ?? '')),
                'w_pt' => $wPt,
                'w_lp' => $wLp,
                'w_km' => $row['w_km'] ?? 0,
                'w_ln' => $this->normalizeNonEmptyText((string) ($row['w_ln'] ?? '')),
                'w_zs' => $this->normalizeFloat($row['w_zs'] ?? 0),
                'w_zd' => $this->normalizeFloat($row['w_zd'] ?? 0),
                'dt_aktualizace' => $now,
            ]);

            $count++;
        }

        return $count;
    }

    public function replaceCarsKmMonthlyStats(array $rows, int $intervalMonths): int
    {
        if (
            !$this->tableExists(self::TBL_WD_KM_STATS)
            || !$this->columnExists(self::TBL_WD_KM_STATS, 'w_carid')
            || !$this->columnExists(self::TBL_WD_KM_STATS, 'km')
            || !$this->columnExists(self::TBL_WD_KM_STATS, 'stavTach')
        ) {
            return 0;
        }

        $deleteStmt = $this->pdo->prepare('DELETE FROM ' . self::TBL_WD_KM_STATS . ' WHERE w_carid = :carid AND pocet_mesicu = :interval');
        $insertStmt = $this->pdo->prepare(
            'INSERT INTO ' . self::TBL_WD_KM_STATS . '
                (w_carid, w_datod, w_datdo, pocet_mesicu, km, stavTach, dt_aktualizace)
             VALUES
                (:w_carid, :w_datod, :w_datdo, :pocet_mesicu, :km, :stav_tach, :dt_aktualizace)'
        );

        $count = 0;
        foreach ($rows as $row) {
            $carId = (int) ($row['carid'] ?? 0);
            if ($carId <= 0) {
                continue;
            }

            $from = $this->normalizeSoapDate((string) ($row['date_from'] ?? ''));
            $to = $this->normalizeSoapDate((string) ($row['date_to'] ?? ''));
            if ($from === null || $to === null) {
                continue;
            }

            $deleteStmt->execute([
                'carid' => $carId,
                'interval' => max(1, $intervalMonths),
            ]);
            $insertStmt->execute([
                'w_carid' => $carId,
                'w_datod' => $from,
                'w_datdo' => $to,
                'pocet_mesicu' => max(1, $intervalMonths),
                'km' => $row['km'] ?? 0,
                'stav_tach' => $row['tach_end'] ?? 0,
                'dt_aktualizace' => date('Y-m-d H:i:s'),
            ]);

            $count++;
        }

        return $count;
    }

    public function getFleetMileageForecast(int $months, string $statusFilter = 'aktivni'): array
    {
        if (
            !$this->tableExists(self::TBL_WD_KM_STATS)
            || !$this->tableExists(self::TBL_WD_POSITIONS)
            || !$this->columnExists(self::TBL_WD_KM_STATS, 'w_carid')
            || !$this->columnExists(self::TBL_WD_KM_STATS, 'pocet_mesicu')
            || !$this->columnExists(self::TBL_WD_POSITIONS, 'w_carid')
            || !$this->columnExists(self::TBL_WD_POSITIONS, 'w_km')
        ) {
            return [
                'months' => max(1, min(24, $months)),
                'statusFilter' => strtolower(trim($statusFilter)) !== '' ? strtolower(trim($statusFilter)) : 'aktivni',
                'updatedAt' => null,
                'updatedAgeDays' => null,
                'isDataOlderThanMonth' => false,
                'summary' => [
                    'totalUnder250k' => 0,
                    'withData' => 0,
                    'staleCount' => 0,
                    'within10Years' => 0,
                ],
                'results' => [],
                'chart' => [],
                'meta' => [
                    'maxDataAgeMonths' => 6,
                    'warnDataAgeMonths' => 3,
                    'maxForecastMonths' => 120,
                ],
            ];
        }

        $months = max(1, min(24, $months));
        $allowedStatuses = ['all', 'aktivni', 'vyrazene', 'neaktivni'];
        $statusFilter = strtolower(trim($statusFilter));
        if (!in_array($statusFilter, $allowedStatuses, true)) {
            $statusFilter = 'aktivni';
        }

        $statusWhere = '';
        $params = [
            'months' => $months,
        ];
        if ($statusFilter !== 'all') {
            $statusWhere = ' AND LOWER(TRIM(v.status)) = :status_filter';
            $params['status_filter'] = $statusFilter;
        }

        $sql = 'SELECT
                    v.legacy_carid AS carid,
                    v.spz,
                    COALESCE(d.zzs_typ, "") AS zzs_typ,
                    COALESCE(d.w_popis, "") AS w_popis,
                    LOWER(TRIM(COALESCE(v.status, ""))) AS status_vozidla,
                    COALESCE(last_pos.w_km, 0) AS stav_tach,
                    km.km AS najeto_km,
                    km.pocet_mesicu,
                    km.dt_aktualizace,
                    km.w_datod,
                    km.w_datdo,
                    GREATEST(0, 250000 - COALESCE(last_pos.w_km, 0)) AS km_to_250k,
                    CASE
                        WHEN km.km > 0 AND km.pocet_mesicu > 0 THEN km.km / km.pocet_mesicu
                        ELSE 0
                    END AS monthly_avg_km,
                    CASE
                        WHEN km.km > 0 AND km.pocet_mesicu > 0 THEN CEIL(GREATEST(0, 250000 - COALESCE(last_pos.w_km, 0)) / (km.km / km.pocet_mesicu))
                        ELSE NULL
                    END AS months_to_250k
                FROM vehicles_cars_list_v2 v
                LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id
                INNER JOIN (
                    SELECT m.w_carid, m.km, m.pocet_mesicu, m.dt_aktualizace, m.w_datod, m.w_datdo
                    FROM ' . self::TBL_WD_KM_STATS . ' m
                    INNER JOIN (
                        SELECT w_carid, MAX(id) AS max_id
                        FROM ' . self::TBL_WD_KM_STATS . '
                        WHERE pocet_mesicu = :months
                        GROUP BY w_carid
                    ) latest_km ON latest_km.w_carid = m.w_carid AND latest_km.max_id = m.id
                    WHERE m.pocet_mesicu = :months
                ) km ON km.w_carid = v.legacy_carid
                LEFT JOIN (
                    SELECT cp.w_carid, cp.w_km
                    FROM ' . self::TBL_WD_POSITIONS . ' cp
                    INNER JOIN (
                        SELECT w_carid, MAX(id) AS max_id
                        FROM ' . self::TBL_WD_POSITIONS . '
                        GROUP BY w_carid
                    ) latest_pos ON latest_pos.w_carid = cp.w_carid AND latest_pos.max_id = cp.id
                ) last_pos ON last_pos.w_carid = v.legacy_carid
                WHERE COALESCE(last_pos.w_km, 0) < 250000' . $statusWhere . '
                ORDER BY months_to_250k ASC, v.spz ASC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll() ?: [];

        $now = new DateTimeImmutable('now');
        $maxDataAgeMonths = 6;
        $maxForecastMonths = 120;
        $warnDataAgeMonths = 3;

        $eligibleRows = [];
        $staleCount = 0;
        $maxSyncDate = null;

        foreach ($rows as $row) {
            $updatedAt = isset($row['dt_aktualizace']) ? trim((string) $row['dt_aktualizace']) : '';
            if ($updatedAt === '') {
                continue;
            }

            $updated = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $updatedAt) ?: null;
            if ($updated === null) {
                continue;
            }

            $ageMonths = ((int) $now->format('Y') - (int) $updated->format('Y')) * 12 + ((int) $now->format('n') - (int) $updated->format('n'));
            if ($ageMonths > $maxDataAgeMonths) {
                $staleCount++;
                continue;
            }

            $monthlyAvg = (float) ($row['monthly_avg_km'] ?? 0);
            $monthsTo250k = isset($row['months_to_250k']) ? (int) $row['months_to_250k'] : null;
            if ($monthlyAvg <= 0 || $monthsTo250k === null || $monthsTo250k > $maxForecastMonths) {
                continue;
            }

            $targetDate = $updated->modify('+' . $monthsTo250k . ' months');
            $halfYear = ((int) $targetDate->format('n') <= 6 ? '1. pol ' : '2. pol ') . $targetDate->format('Y');
            $monthIndex = (int) $targetDate->format('n') - 1;

            $eligibleRows[] = [
                'carid' => (int) ($row['carid'] ?? 0),
                'spz' => (string) ($row['spz'] ?? ''),
                'typ' => (string) ($row['zzs_typ'] ?? ''),
                'popis' => (string) ($row['w_popis'] ?? ''),
                'stavKm' => (float) ($row['stav_tach'] ?? 0),
                'najetoKm' => (float) ($row['najeto_km'] ?? 0),
                'pocetMesicu' => (int) ($row['pocet_mesicu'] ?? $months),
                'prumerZaMesic' => $monthlyAvg,
                'aktualizace' => $updated->format('Y-m-d H:i:s'),
                'datOd' => (string) ($row['w_datod'] ?? ''),
                'datDo' => (string) ($row['w_datdo'] ?? ''),
                'dataAgeMonths' => $ageMonths,
                'isStale' => $ageMonths > $warnDataAgeMonths,
                'mesicuDo250k' => $monthsTo250k,
                'odhadDatum' => $targetDate->format('Y-m'),
                'odhadPololeti' => $halfYear,
                'odhadMesicIndex' => $monthIndex,
            ];

            if ($maxSyncDate === null || $updated > $maxSyncDate) {
                $maxSyncDate = $updated;
            }
        }

        $halfYearBuckets = [];
        foreach ($eligibleRows as $row) {
            $halfYear = $row['odhadPololeti'];
            $monthIndex = $row['odhadMesicIndex'];
            if (!isset($halfYearBuckets[$halfYear])) {
                $halfYearBuckets[$halfYear] = [];
            }
            if (!isset($halfYearBuckets[$halfYear][$monthIndex])) {
                $halfYearBuckets[$halfYear][$monthIndex] = [];
            }

            $halfYearBuckets[$halfYear][$monthIndex][] = [
                'carid' => $row['carid'],
                'spz' => $row['spz'],
                'typ' => $row['typ'],
                'popis' => $row['popis'],
                'mesicuDo250k' => $row['mesicuDo250k'],
            ];
        }

        $chart = [];
        foreach ($halfYearBuckets as $label => $monthsMap) {
            $segments = [];
            for ($month = 0; $month < 12; $month++) {
                $cars = $monthsMap[$month] ?? [];
                if ($cars === []) {
                    continue;
                }

                $segments[] = [
                    'monthIndex' => $month,
                    'count' => count($cars),
                    'cars' => $cars,
                ];
            }

            $chart[] = [
                'label' => $label,
                'total' => array_sum(array_map(static fn(array $segment): int => (int) $segment['count'], $segments)),
                'segments' => $segments,
            ];
        }

        usort(
            $chart,
            static function (array $a, array $b): int {
                preg_match('/^(\d)\. pol\s+(\d{4})$/', (string) ($a['label'] ?? ''), $aMatches);
                preg_match('/^(\d)\. pol\s+(\d{4})$/', (string) ($b['label'] ?? ''), $bMatches);

                $aHalf = isset($aMatches[1]) ? (int) $aMatches[1] : 0;
                $aYear = isset($aMatches[2]) ? (int) $aMatches[2] : 0;
                $bHalf = isset($bMatches[1]) ? (int) $bMatches[1] : 0;
                $bYear = isset($bMatches[2]) ? (int) $bMatches[2] : 0;

                $aKey = $aYear * 10 + $aHalf;
                $bKey = $bYear * 10 + $bHalf;
                return $aKey <=> $bKey;
            }
        );

        $updatedAgeDays = null;
        if ($maxSyncDate !== null) {
            $diffSeconds = $now->getTimestamp() - $maxSyncDate->getTimestamp();
            $updatedAgeDays = max(0, (int) floor($diffSeconds / 86400));
        }

        return [
            'months' => $months,
            'statusFilter' => $statusFilter,
            'updatedAt' => $maxSyncDate?->format('Y-m-d H:i:s'),
            'updatedAgeDays' => $updatedAgeDays,
            'isDataOlderThanMonth' => $updatedAgeDays !== null ? $updatedAgeDays > 30 : false,
            'summary' => [
                'totalUnder250k' => count($rows),
                'withData' => count($eligibleRows),
                'staleCount' => $staleCount,
                'within10Years' => count(array_filter($eligibleRows, static fn(array $row): bool => (int) $row['mesicuDo250k'] <= 120)),
            ],
            'results' => $eligibleRows,
            'chart' => $chart,
            'meta' => [
                'maxDataAgeMonths' => $maxDataAgeMonths,
                'warnDataAgeMonths' => $warnDataAgeMonths,
                'maxForecastMonths' => $maxForecastMonths,
            ],
        ];
    }

    public function getDashboardMetrics(): array
    {
        $summaryStmt = $this->pdo->query(
            'SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN LOWER(TRIM(status)) = "aktivni" THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN LOWER(TRIM(status)) = "vyrazene" THEN 1 ELSE 0 END) AS retired,
                SUM(CASE WHEN LOWER(TRIM(status)) = "neaktivni" THEN 1 ELSE 0 END) AS inactive,
                SUM(CASE WHEN LOWER(TRIM(status)) NOT IN ("aktivni", "vyrazene", "neaktivni") OR TRIM(status) = "" THEN 1 ELSE 0 END) AS unknown
             FROM vehicles_cars_list_v2'
        );
        $summary = $summaryStmt->fetch() ?: [];

        $fuelStmt = $this->pdo->query(
            'SELECT
                CASE
                    WHEN LOWER(TRIM(COALESCE(w_typ_phm, ""))) IN ("nafta", "nm", "d") THEN "Nafta"
                    WHEN LOWER(TRIM(COALESCE(w_typ_phm, ""))) IN ("benzin", "benzin natural", "b") THEN "Benzin"
                    WHEN LOWER(TRIM(COALESCE(w_typ_phm, ""))) IN ("cng", "lpg", "hybrid") THEN "Alternativni"
                    WHEN LOWER(TRIM(COALESCE(w_typ_phm, ""))) IN ("ev", "elektro") THEN "Elektro"
                    ELSE "Nezname"
                END AS label,
                COUNT(*) AS value
             FROM vehicles_cars_list_v2
             GROUP BY label
             ORDER BY value DESC, label ASC'
        );
        $fuelDistribution = $fuelStmt->fetchAll() ?: [];

        $typeStmt = $this->pdo->query(
            'SELECT
                COALESCE(NULLIF(TRIM(d.zzs_typ), ""), "Nezname") AS label,
                COUNT(*) AS value
             FROM vehicles_cars_list_v2 v
             LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id
             GROUP BY label
             ORDER BY value DESC, label ASC'
        );
        $typeDistribution = $typeStmt->fetchAll() ?: [];

        $groupDistribution = [];
        if ($this->tableExists('vehicles_cars_groups_v2')) {
            $groupStmt = $this->pdo->query(
                'SELECT
                    COALESCE(NULLIF(TRIM(groupname), ""), "Nezname") AS label,
                    COALESCE(numcars, 0) AS value
                 FROM vehicles_cars_groups_v2
                 ORDER BY value DESC, label ASC'
            );
            $groupDistribution = $groupStmt->fetchAll() ?: [];
        }

        if ($groupDistribution === []) {
            $groupStmt = $this->pdo->query(
                'SELECT
                    COALESCE(NULLIF(TRIM(v.w_groupname), ""), "Nezname") AS label,
                    COUNT(*) AS value
                 FROM vehicles_cars_list_v2 v
                 GROUP BY label
                 ORDER BY value DESC, label ASC'
            );
            $groupDistribution = $groupStmt->fetchAll() ?: [];
        }

        $mileageDistribution = [];
        if (
            $this->tableExists(self::TBL_WD_POSITIONS)
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_carid')
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_km')
        ) {
            $mileageStmt = $this->pdo->query(
                'SELECT
                    label,
                    COUNT(*) AS value,
                    MIN(bucket_order) AS bucket_order
                 FROM (
                    SELECT
                        v.id,
                        COALESCE(last_pos.w_km, 0) AS max_km,
                        CASE
                            WHEN COALESCE(last_pos.w_km, 0) < 100000 THEN 1
                            WHEN COALESCE(last_pos.w_km, 0) < 200000 THEN 2
                            WHEN COALESCE(last_pos.w_km, 0) < 250000 THEN 3
                            WHEN COALESCE(last_pos.w_km, 0) < 300000 THEN 4
                            WHEN COALESCE(last_pos.w_km, 0) < 400000 THEN 5
                            WHEN COALESCE(last_pos.w_km, 0) < 500000 THEN 6
                            ELSE 7
                        END AS bucket_order,
                        CASE
                            WHEN COALESCE(last_pos.w_km, 0) < 100000 THEN "0K"
                            WHEN COALESCE(last_pos.w_km, 0) < 200000 THEN "100K"
                            WHEN COALESCE(last_pos.w_km, 0) < 250000 THEN "200K"
                            WHEN COALESCE(last_pos.w_km, 0) < 300000 THEN "250K"
                            WHEN COALESCE(last_pos.w_km, 0) < 400000 THEN "300K"
                            WHEN COALESCE(last_pos.w_km, 0) < 500000 THEN "400K"
                            ELSE "500K+"
                        END AS label
                    FROM vehicles_cars_list_v2 v
                    LEFT JOIN (
                        SELECT cp.w_carid, cp.w_km
                        FROM ' . self::TBL_WD_POSITIONS . ' cp
                        INNER JOIN (
                            SELECT w_carid, MAX(id) AS max_id
                            FROM ' . self::TBL_WD_POSITIONS . '
                            GROUP BY w_carid
                        ) latest ON latest.w_carid = cp.w_carid AND latest.max_id = cp.id
                    ) last_pos ON last_pos.w_carid = v.legacy_carid
                 ) km
                 GROUP BY label
                      ORDER BY bucket_order ASC'
            );
            $mileageDistribution = $mileageStmt->fetchAll() ?: [];
        }

        return [
            'summary' => [
                'total' => (int) ($summary['total'] ?? 0),
                'active' => (int) ($summary['active'] ?? 0),
                'retired' => (int) ($summary['retired'] ?? 0),
                'inactive' => (int) ($summary['inactive'] ?? 0),
                'unknown' => (int) ($summary['unknown'] ?? 0),
            ],
            'fuelDistribution' => $this->normalizeBuckets($fuelDistribution),
            'typeDistribution' => $this->normalizeBuckets($typeDistribution),
            'groupDistribution' => $this->normalizeBuckets($groupDistribution),
            'stationDistribution' => $this->normalizeBuckets($groupDistribution),
            'mileageDistribution' => $this->normalizeBuckets($mileageDistribution),
        ];
    }

    private function normalizeBuckets(array $rows): array
    {
        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'label' => (string) ($row['label'] ?? ''),
                'value' => (int) ($row['value'] ?? 0),
            ];
        }

        return $result;
    }

    private function normalizeSoapDate(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $parsed = DateTime::createFromFormat('d.m.Y H:i:s', $value);
        if ($parsed === false) {
            return null;
        }

        return $parsed->format('Y-m-d H:i:s');
    }

    private function normalizePositionDate(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $candidates = [
            'Y-m-d H:i:s',
            'Y-m-d H:i',
            'd.m.Y H:i:s',
            'd.m.Y H:i',
        ];

        foreach ($candidates as $format) {
            $parsed = DateTime::createFromFormat($format, $value);
            if ($parsed !== false) {
                return $parsed->format('Y-m-d H:i:s');
            }
        }

        try {
            return (new DateTime($value))->format('Y-m-d H:i:s');
        } catch (Throwable) {
            return null;
        }
    }

    private function normalizeNonEmptyText(string $value): string
    {
        $value = trim($value);
        return $value !== '' ? mb_substr($value, 0, 255) : '';
    }

    private function normalizeFloat(mixed $value): float
    {
        if (is_string($value)) {
            $value = str_replace(',', '.', trim($value));
        }

        return (float) $value;
    }

    private function tableExists(string $table): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1'
        );
        $stmt->execute(['table' => $table]);

        return (bool) $stmt->fetchColumn();
    }

    private function columnExists(string $table, string $column): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT 1
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column
             LIMIT 1'
        );
        $stmt->execute([
            'table' => $table,
            'column' => $column,
        ]);

        return (bool) $stmt->fetchColumn();
    }

    public function getVehicleDetailById(int $vehicleId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT
                v.id,
                v.spz,
                v.status,
                v.w_tovarni_znacka,
                v.w_model_vozu,
                v.w_typ_phm,
                v.w_groupname,
                v.w_online,
                v.w_disabled,
                v.last_update,
                d.zzs_typ,
                d.w_popis,
                d.service_notes,
                d.equipment_json,
                d.technical_notes,
                d.insurance_policy,
                d.stk_valid_to,
                d.emission_valid_to,
                d.updated_at AS detail_updated_at
             FROM vehicles_cars_list_v2 v
             LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id
             WHERE v.id = :vehicle_id
             LIMIT 1'
        );

        $stmt->execute(['vehicle_id' => $vehicleId]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function saveVehicleDetailById(int $vehicleId, array $payload): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO vehicles_detail_cards
                     (vehicle_id, zzs_typ, service_notes, equipment_json, technical_notes, insurance_policy, stk_valid_to, emission_valid_to)
             VALUES
                     (:vehicle_id, :zzs_typ, :service_notes, :equipment_json, :technical_notes, :insurance_policy, :stk_valid_to, :emission_valid_to)
             ON DUPLICATE KEY UPDATE
                     zzs_typ = VALUES(zzs_typ),
                service_notes = VALUES(service_notes),
                equipment_json = VALUES(equipment_json),
                technical_notes = VALUES(technical_notes),
                insurance_policy = VALUES(insurance_policy),
                stk_valid_to = VALUES(stk_valid_to),
                emission_valid_to = VALUES(emission_valid_to),
                updated_at = CURRENT_TIMESTAMP'
        );

        $stmt->execute([
            'vehicle_id' => $vehicleId,
            'zzs_typ' => $payload['zzs_typ'],
            'service_notes' => $payload['service_notes'],
            'equipment_json' => $payload['equipment_json'],
            'technical_notes' => $payload['technical_notes'],
            'insurance_policy' => $payload['insurance_policy'],
            'stk_valid_to' => $payload['stk_valid_to'],
            'emission_valid_to' => $payload['emission_valid_to'],
        ]);
    }
}

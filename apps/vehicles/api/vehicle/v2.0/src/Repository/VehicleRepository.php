<?php

declare(strict_types=1);

final class VehicleRepository
{
    private const TBL_ASSIGNMENTS = 'vehicles_user_vehicle_assignments';
    private const TBL_WD_GENERAL = 'vehicles_wd_cars_general_v2';
    private const TBL_WD_POSITIONS = 'vehicles_wd_positions_v2';
    private const TBL_WD_KM_STATS = 'vehicles_wd_km_stats_v2';
    private const TBL_STATION_ADDRESSES = 'vehicles_station_addresses_v2';
    private array $tableExistsCache = [];
    private array $columnExistsCache = [];
    private DateTimeZone $appTimezone;

    public function __construct(private PDO $pdo)
    {
        $this->appTimezone = new DateTimeZone('Europe/Prague');
    }

    private function nowForDb(): string
    {
        return (new DateTimeImmutable('now', $this->appTimezone))->format('Y-m-d H:i:s');
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
        $restrictByAssignments = $actorUserId > 0 && !$actorHasAllVehicles;

        $hasPositionsKm = $this->tableExists(self::TBL_WD_POSITIONS)
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_carid')
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_km');
        $hasPositionsLn = $this->tableExists(self::TBL_WD_POSITIONS)
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_carid')
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_ln');
        $hasPositionsCoords = $this->tableExists(self::TBL_WD_POSITIONS)
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_carid')
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_zs')
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_zd')
            && $this->columnExists(self::TBL_WD_POSITIONS, 'dt_aktualizace');
            $hasLegacyDatod = $this->tableExists('cars_detail')
                && $this->columnExists('cars_detail', 'w_carid')
                && $this->columnExists('cars_detail', 'w_datod');
        $hasLegacyDotace = $this->tableExists('cars_dotace')
            && $this->columnExists('cars_dotace', 'w_spz')
            && $this->columnExists('cars_dotace', 'dotace');
            $hasFuelTank = $this->columnExists('vehicles_detail_cards', 'w_nadrz');

        $sortColumns = [
            'spz' => 'v.spz',
            'zzs_typ' => 'd.zzs_typ',
            'w_popis' => 'd.w_popis',
            'w_groupname' => 'v.w_groupname',
            'w_stanoviste' => 'd.w_stanoviste',
            'w_tovarni_znacka' => 'v.w_tovarni_znacka',
            'w_model_vozu' => 'v.w_model_vozu',
            'w_typ_phm' => 'v.w_typ_phm',
                'datum_zarazeni' => $hasLegacyDatod ? 'legacy_detail.w_datod' : 'v.last_update',
            'najeto_km' => $hasPositionsKm ? 'last_pos.w_km' : 'v.id',
            'last_update' => 'v.last_update',
            'dotace' => $hasLegacyDotace ? 'legacy_dotace.dotace' : 'v.id',
            'status' => 'v.status',
        ];

        $normalizedSortBy = array_key_exists($sortBy, $sortColumns) ? $sortBy : 'spz';
        $sortColumn = $sortColumns[$normalizedSortBy];
        $sortDirection = strtolower($sortDir) === 'desc' ? 'DESC' : 'ASC';
        $page = max(1, $page);
        $perPage = max(1, min(200, $perPage));
        $offset = ($page - 1) * $perPage;

        $fromSql = $restrictByAssignments
            ? ' FROM ' . self::TBL_ASSIGNMENTS . ' uva
                INNER JOIN vehicles_cars_list_v2 v ON v.id = uva.vehicle_id AND uva.user_id = :access_user_id
                LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id'
            : ' FROM vehicles_cars_list_v2 v
                LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id';
        if ($hasPositionsKm || $hasPositionsLn || $hasPositionsCoords) {
            $lastPosColumns = ['cp.w_carid'];
            if ($hasPositionsKm) {
                $lastPosColumns[] = 'cp.w_km';
            }
            if ($hasPositionsLn) {
                $lastPosColumns[] = 'cp.w_ln';
            }
            if ($hasPositionsCoords) {
                $lastPosColumns[] = 'cp.w_zs';
                $lastPosColumns[] = 'cp.w_zd';
                $lastPosColumns[] = 'cp.dt_aktualizace';
            }

            $fromSql .= '
            LEFT JOIN (
                SELECT ' . implode(', ', $lastPosColumns) . '
                FROM ' . self::TBL_WD_POSITIONS . ' cp
                INNER JOIN (
                    SELECT w_carid, MAX(id) AS max_id
                    FROM ' . self::TBL_WD_POSITIONS . '
                    GROUP BY w_carid
                ) latest_pos ON latest_pos.w_carid = cp.w_carid AND latest_pos.max_id = cp.id
            ) last_pos ON last_pos.w_carid = v.legacy_carid';
        }
            if ($hasLegacyDatod) {
                $fromSql .= '
                LEFT JOIN cars_detail legacy_detail ON legacy_detail.w_carid = v.legacy_carid';
        }
        if ($hasLegacyDotace) {
            $fromSql .= '
                LEFT JOIN cars_dotace legacy_dotace ON REPLACE(v.spz, " ", "") = REPLACE(legacy_dotace.w_spz, " ", "")';
        }
            $datumZarazeniSelect = $hasLegacyDatod
                ? 'DATE_FORMAT(legacy_detail.w_datod, "%Y-%m-%d %H:%i:%s") AS datum_zarazeni'
            : 'NULL AS datum_zarazeni';
        $najetoKmSelect = $hasPositionsKm
            ? 'COALESCE(last_pos.w_km, NULL) AS najeto_km'
            : 'NULL AS najeto_km';
        $posLnSelect = $hasPositionsLn
            ? 'COALESCE(last_pos.w_ln, "") AS pos_ln'
            : '"" AS pos_ln';
        $posZsSelect = $hasPositionsCoords
            ? 'COALESCE(last_pos.w_zs, NULL) AS pos_zs'
            : 'NULL AS pos_zs';
        $posZdSelect = $hasPositionsCoords
            ? 'COALESCE(last_pos.w_zd, NULL) AS pos_zd'
            : 'NULL AS pos_zd';
        $posUpdatedSelect = $hasPositionsCoords
            ? 'DATE_FORMAT(last_pos.dt_aktualizace, "%Y-%m-%d %H:%i:%s") AS dt_aktualizace'
            : 'NULL AS dt_aktualizace';
        $dotaceSelect = $hasLegacyDotace
            ? 'TRIM(COALESCE(legacy_dotace.dotace, "")) AS dotace'
            : '"" AS dotace';
        $fuelTankSelect = $hasFuelTank
            ? 'd.w_nadrz'
            : 'NULL AS w_nadrz';
        $typeLabelSql = 'CASE
            WHEN d.zzs_typ IS NULL THEN "Nezadáno"
            WHEN TRIM(d.zzs_typ) = "" THEN "Nezadáno"
            WHEN TRIM(d.zzs_typ) = "--" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.zzs_typ), " ", "")) = "--prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.zzs_typ), " ", "")) = "--prázdné" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.zzs_typ), " ", "")) = "prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.zzs_typ), " ", "")) = "prázdné" THEN "Nezadáno"
            WHEN LOWER(TRIM(d.zzs_typ)) = "null" THEN "Nezadáno"
            ELSE TRIM(d.zzs_typ)
        END';
        $groupLabelSql = 'CASE
            WHEN v.w_groupname IS NULL THEN "Nezadáno"
            WHEN TRIM(v.w_groupname) = "" THEN "Nezadáno"
            WHEN TRIM(v.w_groupname) = "--" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_groupname), " ", "")) = "--prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_groupname), " ", "")) = "--prázdné" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_groupname), " ", "")) = "prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_groupname), " ", "")) = "prázdné" THEN "Nezadáno"
            WHEN LOWER(TRIM(v.w_groupname)) = "null" THEN "Nezadáno"
            ELSE TRIM(v.w_groupname)
        END';
        $callSignLabelSql = 'CASE
            WHEN d.w_popis IS NULL THEN "Nezadáno"
            WHEN TRIM(d.w_popis) = "" THEN "Nezadáno"
            WHEN TRIM(d.w_popis) = "--" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.w_popis), " ", "")) = "--prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.w_popis), " ", "")) = "--prázdné" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.w_popis), " ", "")) = "prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.w_popis), " ", "")) = "prázdné" THEN "Nezadáno"
            WHEN LOWER(TRIM(d.w_popis)) = "null" THEN "Nezadáno"
            ELSE TRIM(d.w_popis)
        END';
        $stationLabelSql = 'CASE
            WHEN d.w_stanoviste IS NULL THEN "Nezadáno"
            WHEN TRIM(d.w_stanoviste) = "" THEN "Nezadáno"
            WHEN TRIM(d.w_stanoviste) = "--" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.w_stanoviste), " ", "")) = "--prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.w_stanoviste), " ", "")) = "--prázdné" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.w_stanoviste), " ", "")) = "prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(d.w_stanoviste), " ", "")) = "prázdné" THEN "Nezadáno"
            WHEN LOWER(TRIM(d.w_stanoviste)) = "null" THEN "Nezadáno"
            ELSE TRIM(d.w_stanoviste)
        END';
        $modelLabelSql = 'CASE
            WHEN v.w_model_vozu IS NULL THEN "Nezadáno"
            WHEN TRIM(v.w_model_vozu) = "" THEN "Nezadáno"
            WHEN TRIM(v.w_model_vozu) = "--" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_model_vozu), " ", "")) = "--prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_model_vozu), " ", "")) = "--prázdné" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_model_vozu), " ", "")) = "prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_model_vozu), " ", "")) = "prázdné" THEN "Nezadáno"
            WHEN LOWER(TRIM(v.w_model_vozu)) = "null" THEN "Nezadáno"
            ELSE TRIM(v.w_model_vozu)
        END';
        $manufacturerLabelSql = 'CASE
            WHEN v.w_tovarni_znacka IS NULL THEN "Nezadáno"
            WHEN TRIM(v.w_tovarni_znacka) = "" THEN "Nezadáno"
            WHEN TRIM(v.w_tovarni_znacka) = "--" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_tovarni_znacka), " ", "")) = "--prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_tovarni_znacka), " ", "")) = "--prázdné" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_tovarni_znacka), " ", "")) = "prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_tovarni_znacka), " ", "")) = "prázdné" THEN "Nezadáno"
            WHEN LOWER(TRIM(v.w_tovarni_znacka)) = "null" THEN "Nezadáno"
            ELSE TRIM(v.w_tovarni_znacka)
        END';
        $fuelLabelSql = 'CASE
            WHEN v.w_typ_phm IS NULL THEN "Nezadáno"
            WHEN TRIM(v.w_typ_phm) = "" THEN "Nezadáno"
            WHEN TRIM(v.w_typ_phm) = "--" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_typ_phm), " ", "")) = "--prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_typ_phm), " ", "")) = "--prázdné" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_typ_phm), " ", "")) = "prazdne" THEN "Nezadáno"
            WHEN LOWER(REPLACE(TRIM(v.w_typ_phm), " ", "")) = "prázdné" THEN "Nezadáno"
            WHEN LOWER(TRIM(v.w_typ_phm)) = "null" THEN "Nezadáno"
            ELSE TRIM(v.w_typ_phm)
        END';
        $yearLabelSql = $hasLegacyDatod
            ? 'CASE
                WHEN legacy_detail.w_datod IS NULL THEN "Nezadáno"
                ELSE CAST(YEAR(legacy_detail.w_datod) AS CHAR)
            END'
            : '"Nezadáno"';
        $mileageLabelSql = $hasPositionsKm
            ? 'CASE
                WHEN COALESCE(last_pos.w_km, 0) < 100000 THEN "0K"
                WHEN COALESCE(last_pos.w_km, 0) < 200000 THEN "100K"
                WHEN COALESCE(last_pos.w_km, 0) < 250000 THEN "200K"
                WHEN COALESCE(last_pos.w_km, 0) < 300000 THEN "250K"
                WHEN COALESCE(last_pos.w_km, 0) < 400000 THEN "300K"
                WHEN COALESCE(last_pos.w_km, 0) < 500000 THEN "400K"
                ELSE "500K+"
            END'
            : '"Nezadáno"';

        $baseWhereClauses = [];
        $baseParams = [];
        if ($restrictByAssignments) {
            $baseParams['access_user_id'] = $actorUserId;
        }
        if ($query !== '') {
            $normalizedQuery = $this->normalizeSearchTerm($query);
            if ($normalizedQuery !== '') {
                $baseWhereClauses[] = '('
                    . $this->sqlNormalizeForSearch('v.spz') . ' LIKE :term_norm'
                    . ' OR ' . $this->sqlNormalizeForSearch('v.w_tovarni_znacka') . ' LIKE :term_norm'
                    . ' OR ' . $this->sqlNormalizeForSearch('v.w_model_vozu') . ' LIKE :term_norm'
                    . ' OR ' . $this->sqlNormalizeForSearch('d.w_popis') . ' LIKE :term_norm'
                    . ' OR ' . $this->sqlNormalizeForSearch('d.w_stanoviste') . ' LIKE :term_norm'
                    . ' OR ' . $this->sqlNormalizeForSearch('v.w_groupname') . ' LIKE :term_norm'
                    . ')';
                $baseParams['term_norm'] = '%' . $normalizedQuery . '%';
            }
        }

        $statusFilter = strtolower(trim($statusFilter));
        if (in_array($statusFilter, ['aktivni', 'vyrazene', 'neaktivni'], true)) {
            $baseWhereClauses[] = 'v.status = :status_filter';
            $baseParams['status_filter'] = $statusFilter;
        }

        $yearWhereClauses = [];
        $yearParams = [];
        $years = array_values(array_unique(array_filter(array_map(static fn(string $value): string => trim($value), $years), static fn(string $value): bool => $value !== '')));
        if ($years !== []) {
            $yearPlaceholders = [];
            foreach ($years as $index => $year) {
                $paramName = 'year_' . $index;
                $yearPlaceholders[] = ':' . $paramName;
                $yearParams[$paramName] = $year;
            }
            $yearWhereClauses[] = $yearLabelSql . ' IN (' . implode(', ', $yearPlaceholders) . ')';
        }

        $mileageBandWhereClauses = [];
        $mileageBandParams = [];
        $mileageBands = array_values(array_unique(array_filter(array_map(static fn(string $value): string => strtoupper(trim($value)), $mileageBands), static fn(string $value): bool => $value !== '')));
        if ($mileageBands !== []) {
            $mileagePlaceholders = [];
            foreach ($mileageBands as $index => $band) {
                $paramName = 'mileage_band_' . $index;
                $mileagePlaceholders[] = ':' . $paramName;
                $mileageBandParams[$paramName] = $band;
            }
            $mileageBandWhereClauses[] = $mileageLabelSql . ' IN (' . implode(', ', $mileagePlaceholders) . ')';
        }

        $chartCarIds = array_values(array_unique(array_filter(array_map('intval', $chartCarIds), static fn(int $id): bool => $id > 0)));
        if ($chartCarIds !== []) {
            $placeholders = [];
            foreach ($chartCarIds as $index => $carId) {
                $paramName = 'chart_carid_' . $index;
                $placeholders[] = ':' . $paramName;
                $baseParams[$paramName] = $carId;
            }
            $baseWhereClauses[] = 'v.legacy_carid IN (' . implode(', ', $placeholders) . ')';
        }

        $typeWhereClauses = [];
        $typeParams = [];
        $types = array_values(array_unique(array_filter(array_map(static fn(string $value): string => trim($value), $types), static fn(string $value): bool => $value !== '')));
        if ($types !== []) {
            $typePlaceholders = [];
            foreach ($types as $index => $type) {
                $paramName = 'type_' . $index;
                $typePlaceholders[] = ':' . $paramName;
                $typeParams[$paramName] = $type;
            }
            $typeWhereClauses[] = $typeLabelSql . ' IN (' . implode(', ', $typePlaceholders) . ')';
        }

        $callSignWhereClauses = [];
        $callSignParams = [];
        $callSigns = array_values(array_unique(array_filter(array_map(static fn(string $value): string => trim($value), $callSigns), static fn(string $value): bool => $value !== '')));
        if ($callSigns !== []) {
            $callSignPlaceholders = [];
            foreach ($callSigns as $index => $callSign) {
                $paramName = 'call_sign_' . $index;
                $callSignPlaceholders[] = ':' . $paramName;
                $callSignParams[$paramName] = $callSign;
            }
            $callSignWhereClauses[] = $callSignLabelSql . ' IN (' . implode(', ', $callSignPlaceholders) . ')';
        }

        $groupWhereClauses = [];
        $groupParams = [];
        $groups = array_values(array_unique(array_filter(array_map(static fn(string $value): string => trim($value), $groups), static fn(string $value): bool => $value !== '')));
        if ($groups !== []) {
            $groupPlaceholders = [];
            foreach ($groups as $index => $group) {
                $paramName = 'group_' . $index;
                $groupPlaceholders[] = ':' . $paramName;
                $groupParams[$paramName] = $group;
            }
            $groupWhereClauses[] = $groupLabelSql . ' IN (' . implode(', ', $groupPlaceholders) . ')';
        }

        $stationWhereClauses = [];
        $stationParams = [];
        $stations = array_values(array_unique(array_filter(array_map(static fn(string $value): string => trim($value), $stations), static fn(string $value): bool => $value !== '')));
        if ($stations !== []) {
            $stationPlaceholders = [];
            foreach ($stations as $index => $station) {
                $paramName = 'station_' . $index;
                $stationPlaceholders[] = ':' . $paramName;
                $stationParams[$paramName] = $station;
            }
            $stationWhereClauses[] = $stationLabelSql . ' IN (' . implode(', ', $stationPlaceholders) . ')';
        }

        $modelWhereClauses = [];
        $modelParams = [];
        $models = array_values(array_unique(array_filter(array_map(static fn(string $value): string => trim($value), $models), static fn(string $value): bool => $value !== '')));
        if ($models !== []) {
            $modelPlaceholders = [];
            foreach ($models as $index => $model) {
                $paramName = 'model_' . $index;
                $modelPlaceholders[] = ':' . $paramName;
                $modelParams[$paramName] = $model;
            }
            $modelWhereClauses[] = $modelLabelSql . ' IN (' . implode(', ', $modelPlaceholders) . ')';
        }

        $manufacturerWhereClauses = [];
        $manufacturerParams = [];
        $manufacturers = array_values(array_unique(array_filter(array_map(static fn(string $value): string => trim($value), $manufacturers), static fn(string $value): bool => $value !== '')));
        if ($manufacturers !== []) {
            $manufacturerPlaceholders = [];
            foreach ($manufacturers as $index => $manufacturer) {
                $paramName = 'manufacturer_' . $index;
                $manufacturerPlaceholders[] = ':' . $paramName;
                $manufacturerParams[$paramName] = $manufacturer;
            }
            $manufacturerWhereClauses[] = $manufacturerLabelSql . ' IN (' . implode(', ', $manufacturerPlaceholders) . ')';
        }

        $fuelWhereClauses = [];
        $fuelParams = [];
        $fuels = array_values(array_unique(array_filter(array_map(static fn(string $value): string => trim($value), $fuels), static fn(string $value): bool => $value !== '')));
        if ($fuels !== []) {
            $fuelPlaceholders = [];
            foreach ($fuels as $index => $fuel) {
                $paramName = 'fuel_' . $index;
                $fuelPlaceholders[] = ':' . $paramName;
                $fuelParams[$paramName] = $fuel;
            }
            $fuelWhereClauses[] = $fuelLabelSql . ' IN (' . implode(', ', $fuelPlaceholders) . ')';
        }

        $whereClauses = array_merge($baseWhereClauses, $typeWhereClauses, $callSignWhereClauses, $groupWhereClauses, $stationWhereClauses, $modelWhereClauses, $manufacturerWhereClauses, $fuelWhereClauses, $yearWhereClauses, $mileageBandWhereClauses);
        $params = array_merge($baseParams, $typeParams, $callSignParams, $groupParams, $stationParams, $modelParams, $manufacturerParams, $fuelParams, $yearParams, $mileageBandParams);

        $whereSql = $whereClauses !== [] ? ' WHERE ' . implode(' AND ', $whereClauses) : '';

        $summaryStmt = $this->pdo->prepare('SELECT COUNT(*) AS total, MAX(v.last_update) AS updated_at' . $fromSql . $whereSql);
        $summaryStmt->execute($params);
        $summaryRow = $summaryStmt->fetch() ?: [];
        $totalFiltered = (int) ($summaryRow['total'] ?? 0);
        $updatedAtRaw = $summaryRow['updated_at'] ?? null;
        $updatedAt = null;
        if (is_string($updatedAtRaw) && trim($updatedAtRaw) !== '') {
            $updatedAt = trim($updatedAtRaw);
        }

        $totalAll = $totalFiltered;
        if ($query !== '' || $chartCarIds !== [] || $statusFilter !== 'all' || $types !== [] || $callSigns !== [] || $groups !== [] || $stations !== [] || $models !== [] || $manufacturers !== [] || $fuels !== [] || $years !== [] || $mileageBands !== []) {
            if ($restrictByAssignments) {
                $totalAllStmt = $this->pdo->prepare('SELECT COUNT(*)' . $fromSql);
                $totalAllStmt->bindValue(':access_user_id', $actorUserId, PDO::PARAM_INT);
                $totalAllStmt->execute();
                $totalAll = (int) $totalAllStmt->fetchColumn();
            } else {
                $totalAllStmt = $this->pdo->query('SELECT COUNT(*) FROM vehicles_cars_list_v2');
                $totalAll = (int) $totalAllStmt->fetchColumn();
            }
        }

        $sql = 'SELECT v.id,
                   v.spz,
                   v.legacy_carid,
                   v.status,
                   v.w_tovarni_znacka,
                   v.w_model_vozu,
                   v.w_typ_phm,
                   d.zzs_typ,
                   d.w_popis,
                   d.w_stanoviste,
                   v.w_cargroupid,
                   v.w_groupname,
                   ' . $datumZarazeniSelect . ',
                   ' . $najetoKmSelect . ',
                                     ' . $posLnSelect . ',
                                     ' . $posZsSelect . ',
                                     ' . $posZdSelect . ',
                                     ' . $posUpdatedSelect . ',
                   v.w_online,
                   v.w_disabled,
                                         ' . $fuelTankSelect . ',
                     DATE_FORMAT(v.last_update, "%Y-%m-%d %H:%i:%s") AS last_update,
                     ' . $dotaceSelect . '
            ' . $fromSql . $whereSql . " ORDER BY {$sortColumn} {$sortDirection}, v.id ASC LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $paramName => $paramValue) {
            if ($paramName === 'term') {
                $stmt->bindValue(':term', $paramValue, PDO::PARAM_STR);
                continue;
            }

            if (str_starts_with($paramName, 'chart_carid_')) {
                $stmt->bindValue(':' . $paramName, (int) $paramValue, PDO::PARAM_INT);
                continue;
            }

            if ($paramName === 'access_user_id') {
                $stmt->bindValue(':access_user_id', (int) $paramValue, PDO::PARAM_INT);
                continue;
            }

            $stmt->bindValue(':' . $paramName, (string) $paramValue, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $items = $stmt->fetchAll() ?: [];
        $stationContext = $this->buildStationAddressIndex();
        $items = $this->appendLocationState($items, $stationContext);

        $filterOptions = [
            'types' => [],
            'callSigns' => [],
            'groups' => [],
            'stations' => [],
            'models' => [],
            'manufacturers' => [],
            'fuels' => [],
            'years' => [],
            'mileageBands' => [],
        ];

        if ($includeFilterOptions) {
            $bindParams = static function (PDOStatement $statement, array $statementParams): void {
                foreach ($statementParams as $paramName => $paramValue) {
                    if ($paramName === 'term') {
                        $statement->bindValue(':term', $paramValue, PDO::PARAM_STR);
                        continue;
                    }

                    if (str_starts_with($paramName, 'chart_carid_')) {
                        $statement->bindValue(':' . $paramName, (int) $paramValue, PDO::PARAM_INT);
                        continue;
                    }

                    if ($paramName === 'access_user_id') {
                        $statement->bindValue(':access_user_id', (int) $paramValue, PDO::PARAM_INT);
                        continue;
                    }

                    $statement->bindValue(':' . $paramName, (string) $paramValue, PDO::PARAM_STR);
                }
            };

            $sortMissingFirst = static function (array $labels): array {
                usort($labels, static function (string $a, string $b): int {
                    $aIsMissing = $a === 'Nezadáno';
                    $bIsMissing = $b === 'Nezadáno';

                    if ($aIsMissing && !$bIsMissing) {
                        return -1;
                    }

                    if (!$aIsMissing && $bIsMissing) {
                        return 1;
                    }

                    return strcasecmp($a, $b);
                });

                return $labels;
            };

            $typeOptionsWhereClauses = array_merge($baseWhereClauses, $callSignWhereClauses, $groupWhereClauses, $stationWhereClauses, $modelWhereClauses, $manufacturerWhereClauses, $fuelWhereClauses, $yearWhereClauses, $mileageBandWhereClauses);
            $typeOptionsWhereSql = $typeOptionsWhereClauses !== [] ? ' WHERE ' . implode(' AND ', $typeOptionsWhereClauses) : '';
            $typeOptionsParams = array_merge($baseParams, $callSignParams, $groupParams, $stationParams, $modelParams, $manufacturerParams, $fuelParams, $yearParams, $mileageBandParams);

            $typeOptionsStmt = $this->pdo->prepare(
                'SELECT DISTINCT ' . $typeLabelSql . ' AS label '
                . $fromSql
                . $typeOptionsWhereSql
                . ' ORDER BY label ASC'
            );
            $bindParams($typeOptionsStmt, $typeOptionsParams);
            $typeOptionsStmt->execute();
            $typeLabels = array_values(array_filter(array_map(static fn(array $row): string => (string) ($row['label'] ?? ''), $typeOptionsStmt->fetchAll() ?: []), static fn(string $value): bool => $value !== ''));
            $filterOptions['types'] = $sortMissingFirst($typeLabels);

            $callSignOptionsWhereClauses = array_merge($baseWhereClauses, $typeWhereClauses, $groupWhereClauses, $stationWhereClauses, $modelWhereClauses, $manufacturerWhereClauses, $fuelWhereClauses, $yearWhereClauses, $mileageBandWhereClauses);
            $callSignOptionsWhereSql = $callSignOptionsWhereClauses !== [] ? ' WHERE ' . implode(' AND ', $callSignOptionsWhereClauses) : '';
            $callSignOptionsParams = array_merge($baseParams, $typeParams, $groupParams, $stationParams, $modelParams, $manufacturerParams, $fuelParams, $yearParams, $mileageBandParams);

            $callSignOptionsStmt = $this->pdo->prepare(
                'SELECT DISTINCT ' . $callSignLabelSql . ' AS label '
                . $fromSql
                . $callSignOptionsWhereSql
                . ' ORDER BY label ASC'
            );
            $bindParams($callSignOptionsStmt, $callSignOptionsParams);
            $callSignOptionsStmt->execute();
            $callSignLabels = array_values(array_filter(array_map(static fn(array $row): string => (string) ($row['label'] ?? ''), $callSignOptionsStmt->fetchAll() ?: []), static fn(string $value): bool => $value !== ''));
            $filterOptions['callSigns'] = $sortMissingFirst($callSignLabels);

            $groupOptionsWhereClauses = array_merge($baseWhereClauses, $typeWhereClauses, $callSignWhereClauses, $stationWhereClauses, $modelWhereClauses, $manufacturerWhereClauses, $fuelWhereClauses, $yearWhereClauses, $mileageBandWhereClauses);
            $groupOptionsWhereSql = $groupOptionsWhereClauses !== [] ? ' WHERE ' . implode(' AND ', $groupOptionsWhereClauses) : '';
            $groupOptionsParams = array_merge($baseParams, $typeParams, $callSignParams, $stationParams, $modelParams, $manufacturerParams, $fuelParams, $yearParams, $mileageBandParams);

            $groupOptionsStmt = $this->pdo->prepare(
                'SELECT DISTINCT ' . $groupLabelSql . ' AS label '
                . $fromSql
                . $groupOptionsWhereSql
                . ' ORDER BY label ASC'
            );
            $bindParams($groupOptionsStmt, $groupOptionsParams);
            $groupOptionsStmt->execute();
            $groupLabels = array_values(array_filter(array_map(static fn(array $row): string => (string) ($row['label'] ?? ''), $groupOptionsStmt->fetchAll() ?: []), static fn(string $value): bool => $value !== ''));
            $filterOptions['groups'] = $sortMissingFirst($groupLabels);

            $stationOptionsWhereClauses = array_merge($baseWhereClauses, $typeWhereClauses, $callSignWhereClauses, $groupWhereClauses, $modelWhereClauses, $manufacturerWhereClauses, $fuelWhereClauses, $yearWhereClauses, $mileageBandWhereClauses);
            $stationOptionsWhereSql = $stationOptionsWhereClauses !== [] ? ' WHERE ' . implode(' AND ', $stationOptionsWhereClauses) : '';
            $stationOptionsParams = array_merge($baseParams, $typeParams, $callSignParams, $groupParams, $modelParams, $manufacturerParams, $fuelParams, $yearParams, $mileageBandParams);

            $stationOptionsStmt = $this->pdo->prepare(
                'SELECT DISTINCT ' . $stationLabelSql . ' AS label '
                . $fromSql
                . $stationOptionsWhereSql
                . ' ORDER BY label ASC'
            );
            $bindParams($stationOptionsStmt, $stationOptionsParams);
            $stationOptionsStmt->execute();
            $stationLabels = array_values(array_filter(array_map(static fn(array $row): string => (string) ($row['label'] ?? ''), $stationOptionsStmt->fetchAll() ?: []), static fn(string $value): bool => $value !== ''));
            $filterOptions['stations'] = $sortMissingFirst($stationLabels);

            $modelOptionsWhereClauses = array_merge($baseWhereClauses, $typeWhereClauses, $callSignWhereClauses, $groupWhereClauses, $stationWhereClauses, $manufacturerWhereClauses, $fuelWhereClauses, $yearWhereClauses, $mileageBandWhereClauses);
            $modelOptionsWhereSql = $modelOptionsWhereClauses !== [] ? ' WHERE ' . implode(' AND ', $modelOptionsWhereClauses) : '';
            $modelOptionsParams = array_merge($baseParams, $typeParams, $callSignParams, $groupParams, $stationParams, $manufacturerParams, $fuelParams, $yearParams, $mileageBandParams);

            $modelOptionsStmt = $this->pdo->prepare(
                'SELECT DISTINCT ' . $modelLabelSql . ' AS label '
                . $fromSql
                . $modelOptionsWhereSql
                . ' ORDER BY label ASC'
            );
            $bindParams($modelOptionsStmt, $modelOptionsParams);
            $modelOptionsStmt->execute();
            $modelLabels = array_values(array_filter(array_map(static fn(array $row): string => (string) ($row['label'] ?? ''), $modelOptionsStmt->fetchAll() ?: []), static fn(string $value): bool => $value !== ''));
            $filterOptions['models'] = $sortMissingFirst($modelLabels);

            $manufacturerOptionsWhereClauses = array_merge($baseWhereClauses, $typeWhereClauses, $callSignWhereClauses, $groupWhereClauses, $stationWhereClauses, $modelWhereClauses, $fuelWhereClauses, $yearWhereClauses, $mileageBandWhereClauses);
            $manufacturerOptionsWhereSql = $manufacturerOptionsWhereClauses !== [] ? ' WHERE ' . implode(' AND ', $manufacturerOptionsWhereClauses) : '';
            $manufacturerOptionsParams = array_merge($baseParams, $typeParams, $callSignParams, $groupParams, $stationParams, $modelParams, $fuelParams, $yearParams, $mileageBandParams);

            $manufacturerOptionsStmt = $this->pdo->prepare(
                'SELECT DISTINCT ' . $manufacturerLabelSql . ' AS label '
                . $fromSql
                . $manufacturerOptionsWhereSql
                . ' ORDER BY label ASC'
            );
            $bindParams($manufacturerOptionsStmt, $manufacturerOptionsParams);
            $manufacturerOptionsStmt->execute();
            $manufacturerLabels = array_values(array_filter(array_map(static fn(array $row): string => (string) ($row['label'] ?? ''), $manufacturerOptionsStmt->fetchAll() ?: []), static fn(string $value): bool => $value !== ''));
            $filterOptions['manufacturers'] = $sortMissingFirst($manufacturerLabels);

            $fuelOptionsWhereClauses = array_merge($baseWhereClauses, $typeWhereClauses, $callSignWhereClauses, $groupWhereClauses, $stationWhereClauses, $modelWhereClauses, $manufacturerWhereClauses, $yearWhereClauses, $mileageBandWhereClauses);
            $fuelOptionsWhereSql = $fuelOptionsWhereClauses !== [] ? ' WHERE ' . implode(' AND ', $fuelOptionsWhereClauses) : '';
            $fuelOptionsParams = array_merge($baseParams, $typeParams, $callSignParams, $groupParams, $stationParams, $modelParams, $manufacturerParams, $yearParams, $mileageBandParams);

            $fuelOptionsStmt = $this->pdo->prepare(
                'SELECT DISTINCT ' . $fuelLabelSql . ' AS label '
                . $fromSql
                . $fuelOptionsWhereSql
                . ' ORDER BY label ASC'
            );
            $bindParams($fuelOptionsStmt, $fuelOptionsParams);
            $fuelOptionsStmt->execute();
            $fuelLabels = array_values(array_filter(array_map(static fn(array $row): string => (string) ($row['label'] ?? ''), $fuelOptionsStmt->fetchAll() ?: []), static fn(string $value): bool => $value !== ''));
            $filterOptions['fuels'] = $sortMissingFirst($fuelLabels);

            $yearOptionsWhereClauses = array_merge($baseWhereClauses, $typeWhereClauses, $callSignWhereClauses, $groupWhereClauses, $stationWhereClauses, $modelWhereClauses, $manufacturerWhereClauses, $fuelWhereClauses, $mileageBandWhereClauses);
            $yearOptionsWhereSql = $yearOptionsWhereClauses !== [] ? ' WHERE ' . implode(' AND ', $yearOptionsWhereClauses) : '';
            $yearOptionsParams = array_merge($baseParams, $typeParams, $callSignParams, $groupParams, $stationParams, $modelParams, $manufacturerParams, $fuelParams, $mileageBandParams);

            $yearOptionsStmt = $this->pdo->prepare(
                'SELECT DISTINCT ' . $yearLabelSql . ' AS label '
                . $fromSql
                . $yearOptionsWhereSql
                . ' ORDER BY label DESC'
            );
            $bindParams($yearOptionsStmt, $yearOptionsParams);
            $yearOptionsStmt->execute();
            $yearLabels = array_values(array_filter(array_map(static fn(array $row): string => (string) ($row['label'] ?? ''), $yearOptionsStmt->fetchAll() ?: []), static fn(string $value): bool => $value !== ''));
            $filterOptions['years'] = $sortMissingFirst($yearLabels);

            $mileageOptionsWhereClauses = array_merge($baseWhereClauses, $typeWhereClauses, $callSignWhereClauses, $groupWhereClauses, $stationWhereClauses, $modelWhereClauses, $manufacturerWhereClauses, $fuelWhereClauses, $yearWhereClauses);
            $mileageOptionsWhereSql = $mileageOptionsWhereClauses !== [] ? ' WHERE ' . implode(' AND ', $mileageOptionsWhereClauses) : '';
            $mileageOptionsParams = array_merge($baseParams, $typeParams, $callSignParams, $groupParams, $stationParams, $modelParams, $manufacturerParams, $fuelParams, $yearParams);

            $mileageOptionsStmt = $this->pdo->prepare(
                'SELECT DISTINCT ' . $mileageLabelSql . ' AS label '
                . $fromSql
                . $mileageOptionsWhereSql
                . ' ORDER BY label ASC'
            );
            $bindParams($mileageOptionsStmt, $mileageOptionsParams);
            $mileageOptionsStmt->execute();
            $mileageLabels = array_values(array_filter(array_map(static fn(array $row): string => (string) ($row['label'] ?? ''), $mileageOptionsStmt->fetchAll() ?: []), static fn(string $value): bool => $value !== ''));
            $filterOptions['mileageBands'] = $sortMissingFirst($mileageLabels);
        }

        return [
            'items' => $items,
            'total' => $totalFiltered,
            'totalAll' => $totalAll,
            'updatedAt' => $updatedAt,
            'page' => $page,
            'perPage' => $perPage,
            'sortBy' => $normalizedSortBy,
            'sortDir' => strtolower($sortDirection),
            'query' => $query,
            'filterOptions' => $filterOptions,
        ];
    }

    private function appendLocationState(array $items, array $stationContext): array
    {
        $stationIndex = $stationContext['byStation'] ?? [];
        $serviceCandidates = $stationContext['serviceCandidates'] ?? [];

        foreach ($items as &$item) {
            $stationName = trim((string) ($item['w_stanoviste'] ?? ''));
            $positionRaw = trim((string) ($item['pos_ln'] ?? ''));

            if ($stationName === '' || $positionRaw === '') {
                $item['location_state'] = 'nezname';
                $item['is_home_location'] = null;
                continue;
            }

            $positionNorm = $this->normalizePositionLn($positionRaw);
            if ($positionNorm === '') {
                $item['location_state'] = 'nezname';
                $item['is_home_location'] = null;
                continue;
            }

            $parsed = $this->parsePositionLocation($positionRaw);

            $isService = false;
            foreach ($serviceCandidates as $candidate) {
                if ($this->matchesStationCandidate($positionNorm, $parsed, $candidate, null)) {
                    $isService = true;
                    break;
                }
            }

            $normalizedStation = $this->normalizeLocationToken($stationName);
            $stationCandidates = $stationIndex[$normalizedStation] ?? [];
            if ($stationCandidates === []) {
                if ($isService) {
                    $item['location_state'] = 'v_servisu';
                    $item['is_home_location'] = 0;
                } else {
                    $item['location_state'] = 'nezname';
                    $item['is_home_location'] = null;
                }
                continue;
            }

            $isHome = false;
            foreach ($stationCandidates as $candidate) {
                if ($this->matchesStationCandidate($positionNorm, $parsed, $candidate, $normalizedStation)) {
                    $isHome = true;
                    break;
                }
            }

            if ($isService && !$isHome) {
                $item['location_state'] = 'v_servisu';
            } else {
                $item['location_state'] = $isHome ? 'doma' : 'v_akci';
            }
            $item['is_home_location'] = $isHome ? 1 : 0;
        }

        unset($item);
        return $items;
    }

    private function buildStationAddressIndex(): array
    {
        if (!$this->tableExists(self::TBL_STATION_ADDRESSES)) {
            return ['byStation' => [], 'serviceCandidates' => []];
        }

        $hasMesto = $this->columnExists(self::TBL_STATION_ADDRESSES, 'mesto');
        $hasTyp = $this->columnExists(self::TBL_STATION_ADDRESSES, 'typ');

        $stmt = $this->pdo->prepare(
            'SELECT ' . ($hasMesto ? 'mesto' : 'stanoviste') . ', ulice, w_ln_match_norm' . ($hasTyp ? ', typ' : '') . '
             FROM ' . self::TBL_STATION_ADDRESSES
        );
        $stmt->execute();
        $rows = $stmt->fetchAll() ?: [];

        $index = [];
        $serviceCandidates = [];
        foreach ($rows as $row) {
            $station = $this->normalizeLocationToken((string) ($row['mesto'] ?? ($row['stanoviste'] ?? '')));
            $streetRaw = trim((string) ($row['ulice'] ?? ''));
            if ($station === '') {
                continue;
            }

            $streetFull = $this->normalizeLocationToken($streetRaw);
            $streetBase = $this->normalizeLocationToken((string) preg_replace('/\d.*$/u', '', $streetRaw));
            if ($streetBase === '' && $streetFull !== '') {
                $streetBase = $streetFull;
            }

            $index[$station][] = [
                'mesto' => $station,
                'ulice_full' => $streetFull,
                'ulice_base' => $streetBase,
                'w_ln_match_norm' => $this->normalizeLocationToken((string) ($row['w_ln_match_norm'] ?? '')),
            ];

            $typNorm = $this->normalizeLocationToken((string) ($row['typ'] ?? ''));
            if ($typNorm === 'servis') {
                $serviceCandidates[] = [
                    'mesto' => $station,
                    'ulice_full' => $streetFull,
                    'ulice_base' => $streetBase,
                    'w_ln_match_norm' => $this->normalizeLocationToken((string) ($row['w_ln_match_norm'] ?? '')),
                ];
            }
        }

        return [
            'byStation' => $index,
            'serviceCandidates' => $serviceCandidates,
        ];
    }

    private function matchesStationCandidate(string $positionNorm, ?array $parsed, array $candidate, ?string $normalizedStation): bool
    {
        $candidateKey = (string) ($candidate['w_ln_match_norm'] ?? '');
        if ($candidateKey !== '') {
            if (str_contains($positionNorm, $candidateKey) || str_contains($candidateKey, $positionNorm)) {
                return true;
            }
        }

        if ($parsed === null) {
            return false;
        }

        $candidateCity = (string) ($candidate['mesto'] ?? '');
        $cityMatches = str_contains($parsed['city'], $candidateCity)
            || str_contains($candidateCity, $parsed['city']);

        if (!$cityMatches) {
            return false;
        }

        $stationIsCityLevel = false;
        if ($normalizedStation !== null && $normalizedStation !== '') {
            $stationIsCityLevel = str_contains($parsed['city'], $normalizedStation)
                || str_contains($normalizedStation, $parsed['city']);
        }

        $candidateStreetFull = (string) ($candidate['ulice_full'] ?? '');
        $candidateStreetBase = (string) ($candidate['ulice_base'] ?? '');
        if ($candidateStreetFull === '' && $candidateStreetBase === '') {
            return true;
        }

        $streetMatches = $parsed['street'] === $candidateStreetFull
            || ($candidateStreetBase !== '' && str_contains($parsed['street'], $candidateStreetBase))
            || ($parsed['street'] !== '' && str_contains($candidateStreetFull, $parsed['street']));

        return $streetMatches || $stationIsCityLevel;
    }

    private function normalizePositionLn(string $value): string
    {
        $clean = trim(preg_replace('/^CZ\s*/iu', '', $value) ?? '');
        $clean = trim((string) preg_replace('/\(.*$/u', '', $clean));

        return $this->normalizeLocationToken($clean);
    }

    private function parsePositionLocation(string $value): ?array
    {
        $clean = trim(preg_replace('/^CZ\s*/iu', '', $value) ?? '');
        $clean = trim((string) preg_replace('/\(.*$/u', '', $clean));
        if ($clean === '') {
            return null;
        }

        if (str_contains($clean, ',')) {
            $city = trim((string) strstr($clean, ',', true));
            $streetPart = trim((string) substr($clean, strlen($city) + 1));
        } else {
            $city = trim($clean);
            $streetPart = '';
        }

        $cityNorm = $this->normalizeLocationToken($city);
        $streetNorm = $this->normalizeLocationToken($streetPart);
        if ($cityNorm === '') {
            return null;
        }

        return [
            'city' => $cityNorm,
            'street' => $streetNorm,
        ];
    }

    private function normalizeLocationToken(string $value): string
    {
        $value = trim(mb_strtolower($value, 'UTF-8'));
        if ($value === '') {
            return '';
        }

        if (class_exists('Normalizer')) {
            $normalized = \Normalizer::normalize($value, \Normalizer::FORM_D);
            if (is_string($normalized) && $normalized !== '') {
                $value = preg_replace('/\p{Mn}+/u', '', $normalized) ?? $normalized;
            }
        }

        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
        $value = str_replace(['-', '.', '/', ',', '(', ')'], ' ', $value);
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    public function listStationAddresses(): array
    {
        if (!$this->tableExists('vehicles_station_addresses_v2')) {
            return [];
        }

        $hasMesto = $this->columnExists('vehicles_station_addresses_v2', 'mesto');
        $hasTyp = $this->columnExists('vehicles_station_addresses_v2', 'typ');
        $hasNazevStanoviste = $this->columnExists('vehicles_station_addresses_v2', 'nazev_stanoviste');
        $hasWlnMatch = $this->columnExists('vehicles_station_addresses_v2', 'w_ln_match');
        $hasWlnMatchNorm = $this->columnExists('vehicles_station_addresses_v2', 'w_ln_match_norm');

        $select = 'id, organizace, ' . ($hasMesto ? 'mesto' : 'stanoviste AS mesto') . ', ulice, psc';
        if ($hasNazevStanoviste) {
            $select .= ', nazev_stanoviste';
        }
        if ($hasTyp) {
            $select .= ', typ';
        }
        if ($hasWlnMatch) {
            $select .= ', w_ln_match';
        }
        if ($hasWlnMatchNorm) {
            $select .= ', w_ln_match_norm';
        }

        $stmt = $this->pdo->prepare(
            'SELECT ' . $select . '
             FROM vehicles_station_addresses_v2
             ORDER BY '
             . ($hasNazevStanoviste
                     ? 'CASE WHEN nazev_stanoviste IS NULL OR TRIM(nazev_stanoviste) = "" THEN ' . ($hasMesto ? 'mesto' : 'stanoviste') . ' ELSE nazev_stanoviste END'
                     : ($hasMesto ? 'mesto' : 'stanoviste'))
             . ' ASC, ulice ASC, id ASC'
        );
        $stmt->execute();

        return $stmt->fetchAll() ?: [];
    }

    public function listVsStationsForMap(): array
    {
        if (!$this->tableExists(self::TBL_STATION_ADDRESSES)) {
            return [];
        }

        $hasMesto = $this->columnExists(self::TBL_STATION_ADDRESSES, 'mesto');
        $hasTyp = $this->columnExists(self::TBL_STATION_ADDRESSES, 'typ');
        $hasNazevStanoviste = $this->columnExists(self::TBL_STATION_ADDRESSES, 'nazev_stanoviste');
        $hasWlnMatch = $this->columnExists(self::TBL_STATION_ADDRESSES, 'w_ln_match');
        $hasWlnMatchNorm = $this->columnExists(self::TBL_STATION_ADDRESSES, 'w_ln_match_norm');

        $select = 'id, organizace, ' . ($hasMesto ? 'mesto' : 'stanoviste AS mesto') . ', ulice, psc';
        if ($hasNazevStanoviste) {
            $select .= ', nazev_stanoviste';
        }
        if ($hasTyp) {
            $select .= ', typ';
        }
        if ($hasWlnMatch) {
            $select .= ', w_ln_match';
        }
        if ($hasWlnMatchNorm) {
            $select .= ', w_ln_match_norm';
        }

        $sql = 'SELECT ' . $select . '
                FROM ' . self::TBL_STATION_ADDRESSES;
        $params = [];

        if ($hasTyp) {
            $sql .= ' WHERE typ = :typ';
            $params['typ'] = 'VS';
        }

        $sql .= ' ORDER BY '
            . ($hasNazevStanoviste
                ? 'CASE WHEN nazev_stanoviste IS NULL OR TRIM(nazev_stanoviste) = "" THEN ' . ($hasMesto ? 'mesto' : 'stanoviste') . ' ELSE nazev_stanoviste END'
                : ($hasMesto ? 'mesto' : 'stanoviste'))
            . ' ASC, ulice ASC, id ASC';

        $stationsStmt = $this->pdo->prepare($sql);
        $stationsStmt->execute($params);
        $stations = $stationsStmt->fetchAll() ?: [];
        if ($stations === []) {
            return [];
        }

        $positionIndexByNorm = [];
        $positionAddressCandidates = [];

        if (
            $this->tableExists(self::TBL_WD_POSITIONS)
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_ln')
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_zs')
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_zd')
        ) {
            $positionsStmt = $this->pdo->prepare(
                'SELECT p.w_ln, p.w_zs, p.w_zd
                 FROM ' . self::TBL_WD_POSITIONS . ' p
                 INNER JOIN (
                    SELECT TRIM(w_ln) AS w_ln_key, MAX(id) AS max_id
                    FROM ' . self::TBL_WD_POSITIONS . '
                    WHERE w_ln IS NOT NULL
                      AND TRIM(w_ln) <> ""
                      AND UPPER(TRIM(w_ln)) LIKE "CZ%"
                    GROUP BY TRIM(w_ln)
                 ) latest ON latest.max_id = p.id'
            );
            $positionsStmt->execute();

            $positionRows = $positionsStmt->fetchAll() ?: [];
            foreach ($positionRows as $row) {
                $wLn = trim((string) ($row['w_ln'] ?? ''));
                if ($wLn === '') {
                    continue;
                }

                $lat = (float) ($row['w_zs'] ?? 0);
                $lng = (float) ($row['w_zd'] ?? 0);
                if ($lat < 48 || $lat > 52 || $lng < 12 || $lng > 19) {
                    continue;
                }

                $norm = $this->normalizePositionLn($wLn);
                if ($norm !== '') {
                    $positionIndexByNorm[$norm] = [
                        'latitude' => $lat,
                        'longitude' => $lng,
                        'w_ln' => $wLn,
                    ];
                }

                $parsed = $this->parsePositionLocation($wLn);
                if ($parsed === null) {
                    continue;
                }

                $positionAddressCandidates[] = [
                    'city' => (string) ($parsed['city'] ?? ''),
                    'street' => (string) ($parsed['street'] ?? ''),
                    'street_base' => $this->normalizeLocationToken((string) preg_replace('/\d.*$/u', '', (string) ($parsed['street'] ?? ''))),
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'w_ln' => $wLn,
                ];
            }
        }

        foreach ($stations as &$station) {
            $stationNorm = '';
            if ($hasWlnMatchNorm) {
                $stationNorm = $this->normalizeLocationToken((string) ($station['w_ln_match_norm'] ?? ''));
            }

            if ($stationNorm === '') {
                $stationBase = trim((string) (($station['mesto'] ?? '') !== '' ? ($station['mesto'] ?? '') : ($station['nazev_stanoviste'] ?? '')));
                $wLnLike = 'CZ ' . $stationBase;
                $street = trim((string) ($station['ulice'] ?? ''));
                if ($street !== '') {
                    $wLnLike .= ', ' . $street;
                }
                $stationNorm = $this->normalizePositionLn($wLnLike);
            }

            $match = null;
            $positionSource = 'none';

            if ($stationNorm !== '' && isset($positionIndexByNorm[$stationNorm])) {
                $match = $positionIndexByNorm[$stationNorm];
                $positionSource = 'exact';
            }

            if ($match === null) {
                $cityRaw = trim((string) ($station['mesto'] ?? ''));
                if ($cityRaw === '' && $hasNazevStanoviste) {
                    $cityRaw = trim((string) ($station['nazev_stanoviste'] ?? ''));
                }
                $city = $this->normalizeLocationToken($cityRaw);
                $streetFull = $this->normalizeLocationToken((string) ($station['ulice'] ?? ''));
                $streetBase = $this->normalizeLocationToken((string) preg_replace('/\d.*$/u', '', (string) ($station['ulice'] ?? '')));

                foreach ($positionAddressCandidates as $candidate) {
                    if ($city === '' || $streetFull === '') {
                        continue;
                    }

                    $cityMatches = str_contains($candidate['city'], $city)
                        || str_contains($city, $candidate['city']);
                    if (!$cityMatches) {
                        continue;
                    }

                    $streetMatches = $candidate['street'] === $streetFull
                        || ($streetBase !== '' && str_contains($candidate['street'], $streetBase))
                        || ($candidate['street_base'] !== '' && str_contains($streetFull, $candidate['street_base']));

                    if ($streetMatches) {
                        $match = $candidate;
                        $positionSource = 'fallback';
                        break;
                    }
                }
            }

            $station['latitude'] = $match !== null ? (float) $match['latitude'] : null;
            $station['longitude'] = $match !== null ? (float) $match['longitude'] : null;
            $station['position_source'] = $positionSource;
            $station['position_w_ln'] = $match !== null ? (string) ($match['w_ln'] ?? '') : '';
        }
        unset($station);

        return $stations;
    }

    public function listWebdispecinkLocations(): array
    {
        if (
            !$this->tableExists(self::TBL_WD_POSITIONS)
            || !$this->columnExists(self::TBL_WD_POSITIONS, 'w_ln')
        ) {
            return [];
        }

        $mappedTypByNorm = $this->buildStationTypeByLocationMap();
        $stationTypeAddressIndex = $this->buildStationTypeAddressIndex();

        $stmt = $this->pdo->prepare(
            'SELECT TRIM(w_ln) AS w_ln, COUNT(*) AS cnt
             FROM ' . self::TBL_WD_POSITIONS . '
             WHERE w_ln IS NOT NULL
               AND TRIM(w_ln) <> ""
                             AND UPPER(TRIM(w_ln)) LIKE "CZ%"
             GROUP BY TRIM(w_ln)
             ORDER BY TRIM(w_ln) ASC'
        );
        $stmt->execute();

        $rows = $stmt->fetchAll() ?: [];
        foreach ($rows as &$row) {
            $norm = $this->normalizePositionLn((string) ($row['w_ln'] ?? ''));
            $mappedTyp = $mappedTypByNorm[$norm] ?? null;
            $isMapped = $mappedTyp !== null;

            // Fallback mapping: require both city-like and street-like match.
            // This avoids broad false positives (e.g. whole city marked as VS).
            if (!$isMapped) {
                $parsed = $this->parsePositionLocation((string) ($row['w_ln'] ?? ''));
                $city = $parsed['city'] ?? '';
                $street = $parsed['street'] ?? '';

                if ($city !== '' && $street !== '') {
                    $bestTyp = null;
                    $bestPriority = 0;

                    foreach ($stationTypeAddressIndex as $stationKey => $candidates) {
                        $cityMatches = str_contains($city, $stationKey)
                            || str_contains($stationKey, $city);

                        if (!$cityMatches) {
                            continue;
                        }

                        foreach ($candidates as $candidate) {
                            $streetMatches = $street === $candidate['ulice_full']
                                || ($candidate['ulice_base'] !== '' && str_contains($street, $candidate['ulice_base']))
                                || ($street !== '' && str_contains($candidate['ulice_full'], $street));

                            if (!$streetMatches) {
                                continue;
                            }

                            $candidateTyp = $this->normalizeStationTyp((string) ($candidate['typ'] ?? 'VS'));
                            $candidatePriority = $this->stationTypPriority($candidateTyp);
                            if ($candidatePriority > $bestPriority) {
                                $bestPriority = $candidatePriority;
                                $bestTyp = $candidateTyp;
                            }
                        }
                    }

                    if ($bestTyp !== null) {
                        $mappedTyp = $bestTyp;
                        $isMapped = true;
                    }
                }
            }

            if ($mappedTyp === null) {
                $mappedTyp = 'Mimo';
            }

            $row['typ'] = $this->normalizeStationTyp((string) $mappedTyp);
            $row['is_mapped'] = $isMapped ? 1 : 0;
        }
        unset($row);

        return $rows;
    }

    public function upsertStationAddressFromWebdispecink(string $wLn, string $typ, string $organizace = 'ZZS SK'): array
    {
        if (!$this->tableExists(self::TBL_STATION_ADDRESSES)) {
            throw new RuntimeException('Tabulka měst není dostupná.');
        }

        $typ = $this->normalizeStationTyp($typ);
        $organizace = trim($organizace) !== '' ? trim($organizace) : 'ZZS SK';

        $clean = trim(preg_replace('/^CZ\s*/iu', '', $wLn) ?? '');
        $clean = trim((string) preg_replace('/\(.*$/u', '', $clean));
        if ($clean === '') {
            throw new RuntimeException('Neplatný formát lokace Webdispečinku. Očekávám adresu začínající CZ.');
        }

        if (str_contains($clean, ',')) {
            $city = trim((string) strstr($clean, ',', true));
            $street = trim((string) substr($clean, strlen($city) + 1));
        } else {
            $city = trim($clean);
            $street = '';
        }

        if ($city === '') {
            throw new RuntimeException('Neplatný formát lokace Webdispečinku. Chybí název města/stanoviště.');
        }

        $norm = $this->normalizePositionLn($wLn);
        if ($norm === '') {
            throw new RuntimeException('Lokaci se nepodařilo normalizovat.');
        }

        $wLnMatch = $street !== '' ? ('CZ ' . $city . ', ' . $street) : ('CZ ' . $city);

        $hasTyp = $this->columnExists(self::TBL_STATION_ADDRESSES, 'typ');
        $hasNazevStanoviste = $this->columnExists(self::TBL_STATION_ADDRESSES, 'nazev_stanoviste');
        $hasWlnMatch = $this->columnExists(self::TBL_STATION_ADDRESSES, 'w_ln_match');
        $hasWlnMatchNorm = $this->columnExists(self::TBL_STATION_ADDRESSES, 'w_ln_match_norm');

        $findSql = 'SELECT id FROM ' . self::TBL_STATION_ADDRESSES . ' WHERE w_ln_match_norm = :norm LIMIT 1';
        $findStmt = $this->pdo->prepare($findSql);
        $findStmt->execute(['norm' => $norm]);
        $existingId = (int) ($findStmt->fetchColumn() ?: 0);

        if ($existingId > 0) {
            $updates = [];
            $params = ['id' => $existingId];

            if ($hasTyp) {
                $updates[] = 'typ = :typ';
                $params['typ'] = $typ;
            }
            if ($hasNazevStanoviste) {
                $updates[] = 'nazev_stanoviste = :nazev_stanoviste';
                $params['nazev_stanoviste'] = $city;
            }
            if ($hasWlnMatch) {
                $updates[] = 'w_ln_match = :w_ln_match';
                $params['w_ln_match'] = $wLnMatch;
            }
            if ($hasWlnMatchNorm) {
                $updates[] = 'w_ln_match_norm = :w_ln_match_norm';
                $params['w_ln_match_norm'] = $norm;
            }

            if ($updates !== []) {
                $updates[] = 'updated_at = CURRENT_TIMESTAMP';
                $updateStmt = $this->pdo->prepare(
                    'UPDATE ' . self::TBL_STATION_ADDRESSES . ' SET ' . implode(', ', $updates) . ' WHERE id = :id'
                );
                $updateStmt->execute($params);
            }

            return ['id' => $existingId, 'action' => 'updated', 'typ' => $typ];
        }

        $mestoColumn = $this->columnExists(self::TBL_STATION_ADDRESSES, 'mesto') ? 'mesto' : 'stanoviste';
        $columns = ['organizace', $mestoColumn, 'ulice', 'psc'];
        $values = [':organizace', ':mesto', ':ulice', ':psc'];
        $params = [
            'organizace' => $organizace,
            'mesto' => $city,
            'ulice' => $street,
            'psc' => '',
        ];

        if ($hasTyp) {
            $columns[] = 'typ';
            $values[] = ':typ';
            $params['typ'] = $typ;
        }
        if ($hasNazevStanoviste) {
            $columns[] = 'nazev_stanoviste';
            $values[] = ':nazev_stanoviste';
            $params['nazev_stanoviste'] = $city;
        }
        if ($hasWlnMatch) {
            $columns[] = 'w_ln_match';
            $values[] = ':w_ln_match';
            $params['w_ln_match'] = $wLnMatch;
        }
        if ($hasWlnMatchNorm) {
            $columns[] = 'w_ln_match_norm';
            $values[] = ':w_ln_match_norm';
            $params['w_ln_match_norm'] = $norm;
        }

        $insertStmt = $this->pdo->prepare(
            'INSERT INTO ' . self::TBL_STATION_ADDRESSES
            . ' (' . implode(', ', $columns) . ')'
            . ' VALUES (' . implode(', ', $values) . ')'
        );
        $insertStmt->execute($params);

        return ['id' => (int) $this->pdo->lastInsertId(), 'action' => 'created', 'typ' => $typ];
    }

    public function updateStationAddressById(int $id, array $payload): array
    {
        if (!$this->tableExists(self::TBL_STATION_ADDRESSES)) {
            throw new RuntimeException('Tabulka měst není dostupná.');
        }

        if ($id <= 0) {
            throw new RuntimeException('Neplatné ID záznamu stanoviště.');
        }

        $checkStmt = $this->pdo->prepare(
            'SELECT id FROM ' . self::TBL_STATION_ADDRESSES . ' WHERE id = :id LIMIT 1'
        );
        $checkStmt->execute(['id' => $id]);
        if ((int) ($checkStmt->fetchColumn() ?: 0) <= 0) {
            throw new RuntimeException('Město nebylo nalezeno.');
        }

        $organizace = trim((string) ($payload['organizace'] ?? ''));
        $mesto = trim((string) ($payload['mesto'] ?? ($payload['stanoviste'] ?? '')));
        $nazevStanoviste = trim((string) ($payload['nazev_stanoviste'] ?? ''));
        $ulice = trim((string) ($payload['ulice'] ?? ''));
        $psc = trim((string) ($payload['psc'] ?? ''));
        $typ = $this->normalizeStationTyp((string) ($payload['typ'] ?? 'VS'));
        $wLnMatch = trim((string) ($payload['w_ln_match'] ?? ''));

        if ($organizace === '') {
            throw new RuntimeException('Organizace je povinná.');
        }
        if ($mesto === '') {
            throw new RuntimeException('Město je povinné.');
        }

        $organizace = mb_substr($organizace, 0, 120);
        $mesto = mb_substr($mesto, 0, 180);
        if ($nazevStanoviste === '') {
            $nazevStanoviste = $mesto;
        }
        $nazevStanoviste = mb_substr($nazevStanoviste, 0, 180);
        $ulice = mb_substr($ulice, 0, 255);
        $psc = mb_substr($psc, 0, 10);

        if ($wLnMatch === '') {
            $wLnMatch = $ulice !== ''
                ? ('CZ ' . $mesto . ', ' . $ulice)
                : ('CZ ' . $mesto);
        }

        $wLnMatchNorm = $this->normalizePositionLn($wLnMatch);
        if ($wLnMatchNorm === '') {
            $wLnMatchNorm = $this->normalizeLocationToken(trim($mesto . ' ' . $ulice));
        }

        $hasMesto = $this->columnExists(self::TBL_STATION_ADDRESSES, 'mesto');
        $hasTyp = $this->columnExists(self::TBL_STATION_ADDRESSES, 'typ');
        $hasNazevStanoviste = $this->columnExists(self::TBL_STATION_ADDRESSES, 'nazev_stanoviste');
        $hasWlnMatch = $this->columnExists(self::TBL_STATION_ADDRESSES, 'w_ln_match');
        $hasWlnMatchNorm = $this->columnExists(self::TBL_STATION_ADDRESSES, 'w_ln_match_norm');
        $hasUpdatedAt = $this->columnExists(self::TBL_STATION_ADDRESSES, 'updated_at');

        $updates = [
            'organizace = :organizace',
            ($hasMesto ? 'mesto = :mesto' : 'stanoviste = :mesto'),
            'ulice = :ulice',
            'psc = :psc',
        ];
        $params = [
            'id' => $id,
            'organizace' => $organizace,
            'mesto' => $mesto,
            'ulice' => $ulice,
            'psc' => $psc,
        ];

        if ($hasNazevStanoviste) {
            $updates[] = 'nazev_stanoviste = :nazev_stanoviste';
            $params['nazev_stanoviste'] = $nazevStanoviste;
        }

        if ($hasTyp) {
            $updates[] = 'typ = :typ';
            $params['typ'] = $typ;
        }
        if ($hasWlnMatch) {
            $updates[] = 'w_ln_match = :w_ln_match';
            $params['w_ln_match'] = $wLnMatch;
        }
        if ($hasWlnMatchNorm) {
            $updates[] = 'w_ln_match_norm = :w_ln_match_norm';
            $params['w_ln_match_norm'] = $wLnMatchNorm;
        }
        if ($hasUpdatedAt) {
            $updates[] = 'updated_at = CURRENT_TIMESTAMP';
        }

        $updateStmt = $this->pdo->prepare(
            'UPDATE ' . self::TBL_STATION_ADDRESSES . ' SET ' . implode(', ', $updates) . ' WHERE id = :id'
        );
        $updateStmt->execute($params);

        $select = 'id, organizace, ' . ($hasMesto ? 'mesto' : 'stanoviste AS mesto') . ', ulice, psc';
        if ($hasNazevStanoviste) {
            $select .= ', nazev_stanoviste';
        }
        if ($hasTyp) {
            $select .= ', typ';
        }
        if ($hasWlnMatch) {
            $select .= ', w_ln_match';
        }
        if ($hasWlnMatchNorm) {
            $select .= ', w_ln_match_norm';
        }

        $rowStmt = $this->pdo->prepare(
            'SELECT ' . $select . ' FROM ' . self::TBL_STATION_ADDRESSES . ' WHERE id = :id LIMIT 1'
        );
        $rowStmt->execute(['id' => $id]);
        $row = $rowStmt->fetch();
        if (!is_array($row)) {
            throw new RuntimeException('Aktualizované město se nepodařilo načíst.');
        }

        return $row;
    }

    public function createStationAddress(array $payload): array
    {
        if (!$this->tableExists(self::TBL_STATION_ADDRESSES)) {
            throw new RuntimeException('Tabulka měst není dostupná.');
        }

        $organizace = trim((string) ($payload['organizace'] ?? 'ZZS SK'));
        $mesto = trim((string) ($payload['mesto'] ?? ($payload['stanoviste'] ?? '')));
        $nazevStanoviste = trim((string) ($payload['nazev_stanoviste'] ?? ''));
        $ulice = trim((string) ($payload['ulice'] ?? ''));
        $psc = trim((string) ($payload['psc'] ?? ''));
        $typ = $this->normalizeStationTyp((string) ($payload['typ'] ?? 'VS'));
        $wLnMatch = trim((string) ($payload['w_ln_match'] ?? ''));

        if ($organizace === '') {
            throw new RuntimeException('Organizace je povinná.');
        }
        if ($mesto === '') {
            throw new RuntimeException('Místo je povinné.');
        }

        $organizace = mb_substr($organizace, 0, 120);
        $mesto = mb_substr($mesto, 0, 180);
        if ($nazevStanoviste === '') {
            $nazevStanoviste = $mesto;
        }
        $nazevStanoviste = mb_substr($nazevStanoviste, 0, 180);
        $ulice = mb_substr($ulice, 0, 255);
        $psc = mb_substr($psc, 0, 10);

        if ($wLnMatch === '') {
            $wLnMatch = $ulice !== ''
                ? ('CZ ' . $mesto . ', ' . $ulice)
                : ('CZ ' . $mesto);
        }

        $wLnMatchNorm = $this->normalizePositionLn($wLnMatch);
        if ($wLnMatchNorm === '') {
            $wLnMatchNorm = $this->normalizeLocationToken(trim($mesto . ' ' . $ulice));
        }

        $hasMesto = $this->columnExists(self::TBL_STATION_ADDRESSES, 'mesto');
        $hasTyp = $this->columnExists(self::TBL_STATION_ADDRESSES, 'typ');
        $hasNazevStanoviste = $this->columnExists(self::TBL_STATION_ADDRESSES, 'nazev_stanoviste');
        $hasWlnMatch = $this->columnExists(self::TBL_STATION_ADDRESSES, 'w_ln_match');
        $hasWlnMatchNorm = $this->columnExists(self::TBL_STATION_ADDRESSES, 'w_ln_match_norm');

        $columns = ['organizace', ($hasMesto ? 'mesto' : 'stanoviste'), 'ulice', 'psc'];
        $values = [':organizace', ':mesto', ':ulice', ':psc'];
        $params = [
            'organizace' => $organizace,
            'mesto' => $mesto,
            'ulice' => $ulice,
            'psc' => $psc,
        ];

        if ($hasNazevStanoviste) {
            $columns[] = 'nazev_stanoviste';
            $values[] = ':nazev_stanoviste';
            $params['nazev_stanoviste'] = $nazevStanoviste;
        }
        if ($hasTyp) {
            $columns[] = 'typ';
            $values[] = ':typ';
            $params['typ'] = $typ;
        }
        if ($hasWlnMatch) {
            $columns[] = 'w_ln_match';
            $values[] = ':w_ln_match';
            $params['w_ln_match'] = $wLnMatch;
        }
        if ($hasWlnMatchNorm) {
            $columns[] = 'w_ln_match_norm';
            $values[] = ':w_ln_match_norm';
            $params['w_ln_match_norm'] = $wLnMatchNorm;
        }

        $insertStmt = $this->pdo->prepare(
            'INSERT INTO ' . self::TBL_STATION_ADDRESSES
            . ' (' . implode(', ', $columns) . ')'
            . ' VALUES (' . implode(', ', $values) . ')'
        );
        $insertStmt->execute($params);

        $newId = (int) $this->pdo->lastInsertId();
        if ($newId <= 0) {
            throw new RuntimeException('Nové stanoviště se nepodařilo vytvořit.');
        }

        $select = 'id, organizace, ' . ($hasMesto ? 'mesto' : 'stanoviste AS mesto') . ', ulice, psc';
        if ($hasNazevStanoviste) {
            $select .= ', nazev_stanoviste';
        }
        if ($hasTyp) {
            $select .= ', typ';
        }
        if ($hasWlnMatch) {
            $select .= ', w_ln_match';
        }
        if ($hasWlnMatchNorm) {
            $select .= ', w_ln_match_norm';
        }

        $rowStmt = $this->pdo->prepare(
            'SELECT ' . $select . ' FROM ' . self::TBL_STATION_ADDRESSES . ' WHERE id = :id LIMIT 1'
        );
        $rowStmt->execute(['id' => $newId]);
        $row = $rowStmt->fetch();
        if (!is_array($row)) {
            throw new RuntimeException('Vytvořené stanoviště se nepodařilo načíst.');
        }

        return $row;
    }

    public function deleteStationAddressById(int $id): array
    {
        if (!$this->tableExists(self::TBL_STATION_ADDRESSES)) {
            throw new RuntimeException('Tabulka měst není dostupná.');
        }

        if ($id <= 0) {
            throw new RuntimeException('Neplatné ID záznamu stanoviště.');
        }

        $hasMesto = $this->columnExists(self::TBL_STATION_ADDRESSES, 'mesto');
        $hasTyp = $this->columnExists(self::TBL_STATION_ADDRESSES, 'typ');
        $hasNazevStanoviste = $this->columnExists(self::TBL_STATION_ADDRESSES, 'nazev_stanoviste');

        $selectColumns = [
            'id',
            'organizace',
            ($hasMesto ? 'mesto' : 'stanoviste AS mesto'),
            'ulice',
            'psc',
        ];
        if ($hasTyp) {
            $selectColumns[] = 'typ';
        }
        if ($hasNazevStanoviste) {
            $selectColumns[] = 'nazev_stanoviste';
        }

        $checkStmt = $this->pdo->prepare(
            'SELECT ' . implode(', ', $selectColumns) . ' FROM ' . self::TBL_STATION_ADDRESSES . ' WHERE id = :id LIMIT 1'
        );
        $checkStmt->execute(['id' => $id]);
        $row = $checkStmt->fetch();
        if (!is_array($row)) {
            throw new RuntimeException('Město nebylo nalezeno.');
        }

        $typ = $this->normalizeStationTyp((string) ($row['typ'] ?? 'VS'));
        if ($hasTyp && $typ === 'VS') {
            throw new RuntimeException('Výchozí stanoviště typu VS nelze v této verzi mazat.');
        }

        $deleteStmt = $this->pdo->prepare(
            'DELETE FROM ' . self::TBL_STATION_ADDRESSES . ' WHERE id = :id LIMIT 1'
        );
        $deleteStmt->execute(['id' => $id]);

        if ($deleteStmt->rowCount() <= 0) {
            throw new RuntimeException('Záznam se nepodařilo smazat.');
        }

        return [
            'id' => $id,
            'typ' => $typ,
            'mesto' => (string) ($row['mesto'] ?? ''),
            'nazev_stanoviste' => (string) ($row['nazev_stanoviste'] ?? ''),
        ];
    }

    private function buildStationTypeByLocationMap(): array
    {
        if (!$this->tableExists(self::TBL_STATION_ADDRESSES)) {
            return [];
        }

        $hasTyp = $this->columnExists(self::TBL_STATION_ADDRESSES, 'typ');
        $hasWlnMatchNorm = $this->columnExists(self::TBL_STATION_ADDRESSES, 'w_ln_match_norm');
        if (!$hasTyp || !$hasWlnMatchNorm) {
            return [];
        }

        $stmt = $this->pdo->prepare(
            'SELECT w_ln_match_norm, typ
             FROM ' . self::TBL_STATION_ADDRESSES . '
             WHERE w_ln_match_norm IS NOT NULL
               AND TRIM(w_ln_match_norm) <> ""'
        );
        $stmt->execute();

        $map = [];
        $rows = $stmt->fetchAll() ?: [];
        foreach ($rows as $row) {
            $key = $this->normalizeLocationToken((string) ($row['w_ln_match_norm'] ?? ''));
            if ($key === '') {
                continue;
            }
            $map[$key] = $this->normalizeStationTyp((string) ($row['typ'] ?? 'VS'));
        }

        return $map;
    }

    private function buildStationTypeAddressIndex(): array
    {
        if (!$this->tableExists(self::TBL_STATION_ADDRESSES)) {
            return [];
        }

        $hasTyp = $this->columnExists(self::TBL_STATION_ADDRESSES, 'typ');

        $hasMesto = $this->columnExists(self::TBL_STATION_ADDRESSES, 'mesto');
        $select = ($hasMesto ? 'mesto' : 'stanoviste') . ', ulice';
        if ($hasTyp) {
            $select .= ', typ';
        }

        $stmt = $this->pdo->prepare(
            'SELECT ' . $select . '
             FROM ' . self::TBL_STATION_ADDRESSES . '
                         WHERE ' . ($hasMesto ? 'mesto' : 'stanoviste') . ' IS NOT NULL
                             AND TRIM(' . ($hasMesto ? 'mesto' : 'stanoviste') . ') <> ""
               AND ulice IS NOT NULL
               AND TRIM(ulice) <> ""'
        );
        $stmt->execute();

        $rows = $stmt->fetchAll() ?: [];
        $index = [];
        foreach ($rows as $row) {
            $station = $this->normalizeLocationToken((string) ($row['mesto'] ?? ($row['stanoviste'] ?? '')));
            $streetRaw = trim((string) ($row['ulice'] ?? ''));
            if ($station === '' || $streetRaw === '') {
                continue;
            }

            $streetFull = $this->normalizeLocationToken($streetRaw);
            $streetBase = $this->normalizeLocationToken((string) preg_replace('/\d.*$/u', '', $streetRaw));
            if ($streetBase === '') {
                $streetBase = $streetFull;
            }

            $index[$station][] = [
                'ulice_full' => $streetFull,
                'ulice_base' => $streetBase,
                'typ' => $hasTyp ? (string) ($row['typ'] ?? 'VS') : 'VS',
            ];
        }

        return $index;
    }

    private function stationTypPriority(string $typ): int
    {
        $normalized = $this->normalizeStationTyp($typ);
        if ($normalized === 'VS') {
            return 3;
        }
        if ($normalized === 'Servis') {
            return 2;
        }

        return 1;
    }

    private function normalizeStationTyp(string $typ): string
    {
        $normalized = mb_strtolower(trim($typ), 'UTF-8');
        if ($normalized === 'vs' || $normalized === 'vyjezdove' || $normalized === 'výjezdové') {
            return 'VS';
        }
        if ($normalized === 'servis') {
            return 'Servis';
        }
        if ($normalized === 'mimo') {
            return 'Mimo';
        }

        return 'VS';
    }

    private function normalizeSearchTerm(string $value): string
    {
        $value = mb_strtolower(trim($value), 'UTF-8');
        if ($value === '') {
            return '';
        }

        $map = [
            'á' => 'a',
            'ä' => 'a',
            'č' => 'c',
            'ď' => 'd',
            'é' => 'e',
            'ě' => 'e',
            'ë' => 'e',
            'í' => 'i',
            'ľ' => 'l',
            'ĺ' => 'l',
            'ň' => 'n',
            'ó' => 'o',
            'ô' => 'o',
            'ö' => 'o',
            'ř' => 'r',
            'ŕ' => 'r',
            'š' => 's',
            'ť' => 't',
            'ú' => 'u',
            'ů' => 'u',
            'ü' => 'u',
            'ý' => 'y',
            'ž' => 'z',
        ];

        $value = strtr($value, $map);
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    private function sqlNormalizeForSearch(string $columnExpr): string
    {
        $expr = 'LOWER(COALESCE(' . $columnExpr . ', ""))';
        $replacements = [
            'á' => 'a',
            'ä' => 'a',
            'č' => 'c',
            'ď' => 'd',
            'é' => 'e',
            'ě' => 'e',
            'ë' => 'e',
            'í' => 'i',
            'ľ' => 'l',
            'ĺ' => 'l',
            'ň' => 'n',
            'ó' => 'o',
            'ô' => 'o',
            'ö' => 'o',
            'ř' => 'r',
            'ŕ' => 'r',
            'š' => 's',
            'ť' => 't',
            'ú' => 'u',
            'ů' => 'u',
            'ü' => 'u',
            'ý' => 'y',
            'ž' => 'z',
        ];

        foreach ($replacements as $from => $to) {
            $expr = 'REPLACE(' . $expr . ', "' . $from . '", "' . $to . '")';
        }

        return $expr;
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
        $now = $this->nowForDb();
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
        $now = $this->nowForDb();
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
        $stmt->execute(array_merge([$this->nowForDb()], $returnedCarIds));

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
                    'last_sync_at' => $this->nowForDb(),
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
        $now = $this->nowForDb();
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
                'dt_aktualizace' => $this->nowForDb(),
            ]);

            $count++;
        }

        return $count;
    }

    public function getFleetMileageForecast(int $months, string $statusFilter = 'aktivni', int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        $restrictByAssignments = $actorUserId > 0 && !$actorHasAllVehicles;

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
            $statusWhere = ' AND v.status = :status_filter';
            $params['status_filter'] = $statusFilter;
        }

        $accessJoin = '';
        if ($restrictByAssignments) {
            $accessJoin = ' INNER JOIN ' . self::TBL_ASSIGNMENTS . ' uva ON uva.vehicle_id = v.id AND uva.user_id = :access_user_id';
            $params['access_user_id'] = $actorUserId;
        }

        $sql = 'SELECT
                    v.legacy_carid AS carid,
                    v.spz,
                    COALESCE(d.zzs_typ, "") AS zzs_typ,
                    COALESCE(d.w_popis, "") AS w_popis,
                    LOWER(TRIM(COALESCE(v.status, ""))) AS status_vozidla,
                    COALESCE(km.stavTach, COALESCE(last_pos.w_km, 0)) AS stav_tach,
                    km.km AS najeto_km,
                    km.pocet_mesicu,
                    km.dt_aktualizace,
                    km.w_datod,
                    km.w_datdo,
                    GREATEST(0, 250000 - COALESCE(km.stavTach, COALESCE(last_pos.w_km, 0))) AS km_to_250k,
                    CASE
                        WHEN km.km > 0 AND km.pocet_mesicu > 0 THEN km.km / km.pocet_mesicu
                        ELSE 0
                    END AS monthly_avg_km,
                    CASE
                        WHEN km.km > 0 AND km.pocet_mesicu > 0 THEN CEIL(GREATEST(0, 250000 - COALESCE(km.stavTach, COALESCE(last_pos.w_km, 0))) / (km.km / km.pocet_mesicu))
                        ELSE NULL
                    END AS months_to_250k
                FROM vehicles_cars_list_v2 v
                ' . $accessJoin . '
                LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id
                INNER JOIN (
                    SELECT m.w_carid, m.km, m.pocet_mesicu, m.dt_aktualizace, m.w_datod, m.w_datdo, m.stavTach
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

        $now = new DateTimeImmutable('now', $this->appTimezone);
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
                'stavKm' => $row['stavKm'],
                'prumerZaMesic' => $row['prumerZaMesic'],
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

    public function getDashboardMetrics(string $statusFilter = 'all', int $actorUserId = 0, bool $actorHasAllVehicles = true): array
    {
        $restrictByAssignments = $actorUserId > 0 && !$actorHasAllVehicles;
        $allowedStatuses = ['all', 'aktivni', 'vyrazene', 'neaktivni'];
        $statusFilter = strtolower(trim($statusFilter));
        if (!in_array($statusFilter, $allowedStatuses, true)) {
            $statusFilter = 'all';
        }

        $aliasWhere = '';
        $params = [];
        $accessJoin = '';
        if ($restrictByAssignments) {
            $accessJoin = ' INNER JOIN ' . self::TBL_ASSIGNMENTS . ' uva ON uva.vehicle_id = v.id AND uva.user_id = :access_user_id';
            $params['access_user_id'] = $actorUserId;
        }

        if ($statusFilter !== 'all') {
            $aliasWhere = ' WHERE v.status = :status_filter';
            $params['status_filter'] = $statusFilter;
        }

        $summaryStmt = $this->pdo->prepare(
            'SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN LOWER(TRIM(v.status)) = "aktivni" THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN LOWER(TRIM(v.status)) = "vyrazene" THEN 1 ELSE 0 END) AS retired,
                SUM(CASE WHEN LOWER(TRIM(v.status)) = "neaktivni" THEN 1 ELSE 0 END) AS inactive,
                SUM(CASE WHEN LOWER(TRIM(v.status)) NOT IN ("aktivni", "vyrazene", "neaktivni") OR TRIM(v.status) = "" THEN 1 ELSE 0 END) AS unknown
             FROM vehicles_cars_list_v2 v
             ' . $accessJoin . '
             ' . $aliasWhere
        );
        $summaryStmt->execute($params);
        $summary = $summaryStmt->fetch() ?: [];

        $updatedStmt = $this->pdo->prepare(
            'SELECT MAX(v.last_update) AS updated_at
             FROM vehicles_cars_list_v2 v
             ' . $accessJoin . '
             ' . $aliasWhere
        );
        $updatedStmt->execute($params);
        $updatedAt = $updatedStmt->fetchColumn();

        $fuelStmt = $this->pdo->prepare(
            'SELECT
                CASE
                    WHEN LOWER(TRIM(COALESCE(v.w_typ_phm, ""))) IN ("nafta", "nm", "d") THEN "Nafta"
                    WHEN LOWER(TRIM(COALESCE(v.w_typ_phm, ""))) IN ("benzin", "benzin natural", "b") THEN "Benzín"
                    WHEN LOWER(TRIM(COALESCE(v.w_typ_phm, ""))) IN ("cng", "lpg", "hybrid") THEN "Alternativní"
                    WHEN LOWER(TRIM(COALESCE(v.w_typ_phm, ""))) IN ("ev", "elektro") THEN "Elektro"
                    ELSE "Neznámé"
                END AS label,
                COUNT(*) AS value
             FROM vehicles_cars_list_v2 v
             ' . $accessJoin . '
             ' . $aliasWhere . '
             GROUP BY label
             ORDER BY value DESC, label ASC'
        );
        $fuelStmt->execute($params);
        $fuelDistribution = $fuelStmt->fetchAll() ?: [];

        $typeStmt = $this->pdo->prepare(
            'SELECT
                COALESCE(NULLIF(TRIM(d.zzs_typ), ""), "Nezname") AS label,
                COUNT(*) AS value
             FROM vehicles_cars_list_v2 v
             LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id
             ' . $aliasWhere . '
             GROUP BY label
             ORDER BY value DESC, label ASC'
        );
        $typeStmt->execute($params);
        $typeDistribution = $typeStmt->fetchAll() ?: [];

        $groupDistribution = [];
        if (!$restrictByAssignments && $statusFilter === 'all' && $this->tableExists('vehicles_cars_groups_v2')) {
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
            $groupStmt = $this->pdo->prepare(
                'SELECT
                    COALESCE(NULLIF(TRIM(v.w_groupname), ""), "Nezname") AS label,
                    COUNT(*) AS value
                 FROM vehicles_cars_list_v2 v
                 ' . $aliasWhere . '
                 GROUP BY label
                 ORDER BY value DESC, label ASC'
            );
            $groupStmt->execute($params);
            $groupDistribution = $groupStmt->fetchAll() ?: [];
        }

        $mileageDistribution = [];
        if (
            $this->tableExists(self::TBL_WD_POSITIONS)
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_carid')
            && $this->columnExists(self::TBL_WD_POSITIONS, 'w_km')
        ) {
            $mileageStmt = $this->pdo->prepare(
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
                    ' . $aliasWhere . '
                 ) km
                 GROUP BY label
                      ORDER BY bucket_order ASC'
            );
            $mileageStmt->execute($params);
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
            'updatedAt' => is_string($updatedAt) && trim($updatedAt) !== '' ? $updatedAt : null,
            'fuelDistribution' => $this->normalizeBuckets($fuelDistribution),
            'typeDistribution' => $this->normalizeBuckets($typeDistribution),
            'groupDistribution' => $this->normalizeBuckets($groupDistribution),
            'stationDistribution' => $this->normalizeBuckets($groupDistribution),
            'mileageDistribution' => $this->normalizeBuckets($mileageDistribution),
        ];
    }

    public function getAccessibleLegacyCarIds(int $actorUserId, bool $actorHasAllVehicles): array
    {
        $restrictByAssignments = $actorUserId > 0 && !$actorHasAllVehicles;

        if ($restrictByAssignments) {
            $stmt = $this->pdo->prepare(
                'SELECT v.legacy_carid
                 FROM vehicles_cars_list_v2 v
                 INNER JOIN ' . self::TBL_ASSIGNMENTS . ' uva ON uva.vehicle_id = v.id
                 WHERE uva.user_id = :access_user_id
                   AND v.legacy_carid IS NOT NULL
                   AND v.legacy_carid > 0'
            );
            $stmt->execute(['access_user_id' => $actorUserId]);
            $rows = $stmt->fetchAll() ?: [];

            return array_values(array_map(static fn(array $row): int => (int) ($row['legacy_carid'] ?? 0), $rows));
        }

        $stmt = $this->pdo->query(
            'SELECT legacy_carid
             FROM vehicles_cars_list_v2
             WHERE legacy_carid IS NOT NULL
               AND legacy_carid > 0'
        );
        $rows = $stmt->fetchAll() ?: [];

        return array_values(array_map(static fn(array $row): int => (int) ($row['legacy_carid'] ?? 0), $rows));
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
        if (array_key_exists($table, $this->tableExistsCache)) {
            return $this->tableExistsCache[$table];
        }

        $stmt = $this->pdo->prepare(
            'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1'
        );
        $stmt->execute(['table' => $table]);

        $exists = (bool) $stmt->fetchColumn();
        $this->tableExistsCache[$table] = $exists;

        return $exists;
    }

    private function columnExists(string $table, string $column): bool
    {
        $cacheKey = $table . '::' . $column;
        if (array_key_exists($cacheKey, $this->columnExistsCache)) {
            return $this->columnExistsCache[$cacheKey];
        }

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

        $exists = (bool) $stmt->fetchColumn();
        $this->columnExistsCache[$cacheKey] = $exists;

        return $exists;
    }

    public function getVehicleDetailById(int $vehicleId, int $actorUserId = 0, bool $actorHasAllVehicles = true): ?array
    {
        $restrictByAssignments = $actorUserId > 0 && !$actorHasAllVehicles;

        $sql = 'SELECT
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
             LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id';

        if ($restrictByAssignments) {
            $sql .= ' INNER JOIN ' . self::TBL_ASSIGNMENTS . ' uva ON uva.vehicle_id = v.id AND uva.user_id = :access_user_id';
        }

        $sql .= ' WHERE v.id = :vehicle_id
             LIMIT 1';

        $stmt = $this->pdo->prepare(
            $sql
        );

        $params = ['vehicle_id' => $vehicleId];
        if ($restrictByAssignments) {
            $params['access_user_id'] = $actorUserId;
        }

        $stmt->execute($params);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function saveVehicleDetailById(int $vehicleId, array $payload): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO vehicles_detail_cards
                 (vehicle_id, zzs_typ, w_popis, service_notes, equipment_json, technical_notes, insurance_policy, stk_valid_to, emission_valid_to)
             VALUES
                 (:vehicle_id, :zzs_typ, :w_popis, :service_notes, :equipment_json, :technical_notes, :insurance_policy, :stk_valid_to, :emission_valid_to)
             ON DUPLICATE KEY UPDATE
                     zzs_typ = VALUES(zzs_typ),
            w_popis = VALUES(w_popis),
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
            'w_popis' => $payload['w_popis'],
            'service_notes' => $payload['service_notes'],
            'equipment_json' => $payload['equipment_json'],
            'technical_notes' => $payload['technical_notes'],
            'insurance_policy' => $payload['insurance_policy'],
            'stk_valid_to' => $payload['stk_valid_to'],
            'emission_valid_to' => $payload['emission_valid_to'],
        ]);
    }
}

<?php
/**
 * WebDispecinkHandlers - POST handlery pro synchronizaci dat z WebDispečinku
 * 
 * Tyto handlery volají SOAP API a ukládají data do lokální DB.
 */
class WebDispecinkHandlers
{
    /**
     * Synchronizovat seznam vozidel z WebDispečinku
     * POST action=wdCarsList
     */
    public static function syncCarsList(): void
    {
        try {
            $wdClient = new WebDispecinkClient();
            $cars = $wdClient->getCarsList();

            $db = Database::getConnection();
            $stmt = $db->prepare(Queries::UPSERT_LIST_CAR);

            $count = 0;
            foreach ($cars as $car) {
                $stmt->execute([
                    ':carid' => $car['carid'],
                    ':spz' => $car['identifier'],
                ]);
                $count++;
            }

            Response::success($cars, "Synchronizováno $count vozidel");
        } catch (Exception $e) {
            error_log("Vehicles API - syncCarsList: " . $e->getMessage());
            Response::error('Chyba při synchronizaci seznamu vozidel: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Synchronizovat skupiny vozidel z WebDispečinku
     * POST action=wdCarsGroup
     */
    public static function syncCarsGroups(): void
    {
        try {
            $wdClient = new WebDispecinkClient();
            $groups = $wdClient->getCarsGroups();

            $db = Database::getConnection();
            $stmt = $db->prepare(Queries::UPSERT_CAR_GROUP);

            $count = 0;
            foreach ($groups as $group) {
                $stmt->execute([
                    ':groupid' => $group['groupid'],
                    ':groupname' => $group['groupname'],
                    ':numcars' => $group['numcars'],
                ]);
                $count++;
            }

            Response::success($groups, "Synchronizováno $count skupin");
        } catch (Exception $e) {
            error_log("Vehicles API - syncCarsGroups: " . $e->getMessage());
            Response::error('Chyba při synchronizaci skupin: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Synchronizovat detaily vozidel (general info) z WebDispečinku
     * POST action=wdCarsGeneralInfo
     */
    public static function syncCarsGeneralInfo(): void
    {
        try {
            $db = Database::getConnection();

            // Načíst všechna carid z DB
            $carIds = self::getAllCarIds($db);
            if (empty($carIds)) {
                Response::error('V databázi nejsou žádná vozidla. Spusťte nejdřív wdCarsList.', 400);
            }

            $carIdList = implode(',', $carIds);

            // Zavolat SOAP API
            $wdClient = new WebDispecinkClient();
            $response = $wdClient->getCarsGeneralInfo($carIdList);

            // Uložit do DB
            $stmt = $db->prepare(Queries::UPSERT_CAR_DETAIL);
            $now = date('Y-m-d H:i:s');
            $count = 0;

            if (isset($response->item)) {
                $items = is_array($response->item) ? $response->item : [$response->item];
                foreach ($items as $car) {
                    $stmt->execute([
                        ':carid' => $car->CarId ?? null,
                        ':groupid' => $car->Cargroupid ?? -1,
                        ':popis' => $car->Popis ?? null,
                        ':znacka' => $car->Tovarni_znacka ?? null,
                        ':model' => $car->Model_vozu ?? null,
                        ':phm' => $car->Typ_PHM ?? null,
                        ':stanoviste' => $car->Stanoviste ?? null,
                        ':nadrz' => $car->Nadrz ?? null,
                        ':datod' => $car->DatOd ?? null,
                        ':dt' => $now,
                    ]);
                    $count++;
                }
            }

            Response::success(null, "Synchronizováno $count detailů vozidel");
        } catch (Exception $e) {
            error_log("Vehicles API - syncCarsGeneralInfo: " . $e->getMessage());
            Response::error('Chyba při synchronizaci detailů: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Synchronizovat pozice vozidel z WebDispečinku
     * POST action=wdCarsIDPosition
     */
    public static function syncCarsPositions(): void
    {
        try {
            $db = Database::getConnection();

            $carIds = self::getAllCarIds($db);
            if (empty($carIds)) {
                Response::error('V databázi nejsou žádná vozidla.', 400);
            }

            $carIdList = implode(',', $carIds);

            $wdClient = new WebDispecinkClient();
            $response = $wdClient->getCarsPositions($carIdList);

            $stmt = $db->prepare(Queries::INSERT_CAR_POSITION);
            $now = date('Y-m-d H:i:s');
            $count = 0;

            if (isset($response->item)) {
                $items = is_array($response->item) ? $response->item : [$response->item];
                foreach ($items as $car) {
                    $stmt->execute([
                        ':carid' => $car->cd ?? null,
                        ':majak' => $car->i1s ?? null,
                        ':pt' => $car->pt ?? null,
                        ':lp' => $car->lp ?? null,
                        ':km' => $car->Km ?? null,
                        ':ln' => $car->LN ?? null,
                        ':zs' => $car->Zs ?? null,
                        ':zd' => $car->Zd ?? null,
                        ':dt' => $now,
                    ]);
                    $count++;
                }
            }

            Response::success(null, "Uloženo $count pozic vozidel");
        } catch (Exception $e) {
            error_log("Vehicles API - syncCarsPositions: " . $e->getMessage());
            Response::error('Chyba při synchronizaci pozic: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Synchronizovat KM statistiky z WebDispečinku
     * POST action=wdCarsIDKmMesic&id=123&interval=3&force=1
     * @param bool $force Pokud true, přeskočí kontrolu duplicit a přepíše data
     */
    public static function syncCarsKmMonth(int $carId = 0, int $interval = 1, bool $force = false): void
    {
        $progressId = ProgressTracker::generateId();
        $tracker = new ProgressTracker($progressId);

        try {
            $db = Database::getConnection();

            // Pokud není carid, načíst všechna
            if ($carId > 0) {
                $carIds = [$carId];
            } else {
                $carIds = self::getAllCarIds($db);
            }

            if (empty($carIds)) {
                Response::error('V databázi nejsou žádná vozidla.', 400);
            }

            $totalCars = count($carIds);
            $tracker->init($totalCars);

            // Vrátit response s progressId OKAMŽITĚ a pokračovat v pozadí
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'message' => 'Synchronizace KM spuštěna',
                'data' => [
                    'progressId' => $progressId,
                    'total' => $totalCars
                ]
            ]);

            // Flush output a zavřít connection (background processing)
            if (function_exists('fastcgi_finish_request')) {
                fastcgi_finish_request();
            } else {
                // Fallback pro apache2 + mod_php
                if (ob_get_level() > 0) {
                    ob_end_flush();
                }
                flush();
            }

            // Pokračovat v synchronizaci na pozadí
            $dateDo = new DateTime('first day of this month');
            $dateOd = clone $dateDo;
            $dateOd->modify("-{$interval} months");

            $dateOdFormatted = $dateOd->format('d.m.Y H:i:s');
            $dateDoFormatted = $dateDo->format('d.m.Y H:i:s');

            $currentMonth = (int) date('m');
            $currentYear = (int) date('Y');

            $wdClient = new WebDispecinkClient();
            $checkStmt = $db->prepare(Queries::CHECK_KM_EXISTS);
            $deleteStmt = $db->prepare(Queries::DELETE_KM_BY_CAR);
            $insertStmt = $db->prepare(Queries::INSERT_KM);

            $results = [];
            $synced = 0;
            $skipped = 0;
            $processed = 0;

            foreach ($carIds as $currentCarId) {
                if (!$force) {
                    $checkStmt->execute([
                        ':carid' => $currentCarId,
                        ':month' => $currentMonth,
                        ':year' => $currentYear,
                        ':interval' => $interval,
                    ]);
                    $exists = $checkStmt->fetchColumn();

                    if ($exists > 0) {
                        $skipped++;
                        $processed++;
                        if ($processed % 5 === 0 || $processed === $totalCars) {
                            $tracker->update($processed, $synced, $skipped);
                        }
                        continue;
                    }
                }

                $deleteStmt->execute([':carid' => $currentCarId]);

                try {
                    $data = $wdClient->getCarsKmStats($currentCarId, $dateOdFormatted, $dateDoFormatted);

                    if ($data !== null) {
                        $casOd = (new DateTime($data->Casod))->format('Y-m-d H:i:s');
                        $casDo = (new DateTime($data->Casdo))->format('Y-m-d H:i:s');

                        $insertStmt->execute([
                            ':carid' => $data->carid,
                            ':datod' => $casOd,
                            ':datdo' => $casDo,
                            ':interval' => $interval,
                            ':km' => $data->Celkem_km,
                            ':stavtach' => $data->Tach_end,
                            ':dt_aktualizace' => date('Y-m-d H:i:s'),
                        ]);

                        $results[] = [
                            'carid' => $data->carid,
                            'km' => $data->Celkem_km,
                            'tach' => $data->Tach_end,
                        ];
                        $synced++;
                    }
                } catch (SoapFault $e) {
                    error_log("SOAP error for car $currentCarId: " . $e->getMessage());
                }

                $processed++;

                // Update progress každé vozidlo
                if ($processed % 1 === 0 || $processed === $totalCars) {
                    $tracker->update($processed, $synced, $skipped);
                }
            }

            // Final completion
            $tracker->complete("KM statistiky: $synced synchronizováno, $skipped přeskočeno");

        } catch (Exception $e) {
            if (isset($tracker)) {
                $tracker->error($e->getMessage());
            }
            error_log("Vehicles API - syncCarsKmMonth: " . $e->getMessage());
        }
    }

    /**
     * Pomocná metoda - načíst všechna carid z DB
     */
    private static function getAllCarIds(PDO $db): array
    {
        $stmt = $db->query(Queries::ALL_CAR_IDS);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
}

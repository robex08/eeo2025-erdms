<?php
/**
 * VehicleHandlers - GET handlery pro čtení dat z DB
 * 
 * Všechny metody jsou volány z API routeru.
 * Čtou data z lokální DB (ne z WebDispečinku).
 */
class VehicleHandlers
{
    /**
     * Získat seznam vozidel s detaily
     * GET ?action=dbCarsListDetail
     */
    public static function getCarsListDetail(): void
    {
        try {
            $db = Database::getConnection();
            $stmt = $db->query(Queries::CARS_LIST_DETAIL);
            $cars = $stmt->fetchAll();

            Response::success($cars, 'Seznam vozidel načten', 200, 'cars');
        } catch (PDOException $e) {
            error_log("Vehicles API - getCarsListDetail: " . $e->getMessage());
            Response::error('Chyba při načítání seznamu vozidel', 500);
        }
    }

    /**
     * Získat pozice vozidla podle carid
     * GET ?action=dbCarsPosition&carid=123
     */
    public static function getCarsPosition(int $carid): void
    {
        if ($carid <= 0) {
            Response::error('Parametr carid je povinný a musí být kladné číslo', 400);
        }

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare(Queries::CAR_POSITION_BY_ID);
            $stmt->execute([':carid' => $carid]);
            $positions = $stmt->fetchAll();

            Response::success($positions, 'Pozice vozidla načteny', 200, 'positions');
        } catch (PDOException $e) {
            error_log("Vehicles API - getCarsPosition($carid): " . $e->getMessage());
            Response::error('Chyba při načítání pozic vozidla', 500);
        }
    }

    /**
     * Získat KM statistiky vozidla
     * GET ?action=dbCarsKmMonth&carid=123
     */
    public static function getCarsKmMonth(int $carid): void
    {
        if ($carid <= 0) {
            Response::error('Parametr carid je povinný a musí být kladné číslo', 400);
        }

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare(Queries::CAR_KM_BY_ID);
            $stmt->execute([':carid' => $carid]);
            $km = $stmt->fetchAll();

            Response::success($km, 'KM statistiky načteny', 200, 'km');
        } catch (PDOException $e) {
            error_log("Vehicles API - getCarsKmMonth($carid): " . $e->getMessage());
            Response::error('Chyba při načítání KM statistik', 500);
        }
    }

    /**
     * Získat KM statistiky pro VŠECHNA vozidla (batch)
     * Filtruje záznamy starší než 6 měsíců.
     * GET ?action=dbCarsKmMonthAll
     */
    public static function getCarsKmMonthAll(): void
    {
        try {
            $db = Database::getConnection();
            $stmt = $db->query(Queries::CAR_KM_ALL);
            $rows = $stmt->fetchAll();

            // Seskupit podle w_carid
            $byCarid = [];
            foreach ($rows as $row) {
                $carid = (int)$row['w_carid'];
                $byCarid[$carid] = $row;
            }

            Response::success($byCarid, 'KM statistiky pro všechna vozidla načteny', 200, 'km');
        } catch (PDOException $e) {
            error_log("Vehicles API - getCarsKmMonthAll: " . $e->getMessage());
            Response::error('Chyba při načítání KM statistik', 500);
        }
    }

    /**
     * Získat progress synchronizace
     * GET ?action=getSyncProgress&progressId=xxx
     */
    public static function getSyncProgress(string $progressId): void
    {
        if (empty($progressId)) {
            Response::error('Parametr progressId je povinný', 400);
        }

        $tracker = new ProgressTracker($progressId);
        $data = $tracker->read();

        if ($data === null) {
            Response::error('Progress nenalezen', 404);
        } else {
            Response::success($data, 'Progress načten');
        }
    }

    /**
     * Servisní historie vozidla dle SPZ
     * GET ?action=dbServiceHistory&spz=6SL8773
     * 
     * Hledá v předmětu objednávek (EEO databáze) výskyt SPZ.
     * Mezery v SPZ se odstraňují na obou stranách.
     */
    public static function getServiceHistory(string $spz): void
    {
        // Odstranit všechny mezery ze SPZ
        $spzClean = preg_replace('/\s+/', '', $spz);

        if (empty($spzClean) || strlen($spzClean) < 4) {
            Response::error('Parametr spz je povinný (min. 4 znaky bez mezer)', 400);
            return;
        }

        try {
            $db = Database::getEeoConnection();
            $stmt = $db->prepare(Queries::EEO_SERVICE_HISTORY_BY_SPZ);
            $stmt->execute([':spz' => $spzClean]);
            $orders = $stmt->fetchAll();

            Response::success($orders, 'Servisní historie načtena', 200, 'orders');
        } catch (PDOException $e) {
            error_log("Vehicles API - getServiceHistory($spz): " . $e->getMessage());
            Response::error('Chyba při načítání servisní historie', 500);
        }
    }
}

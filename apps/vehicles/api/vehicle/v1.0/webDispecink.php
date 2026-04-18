<?php

function getSoapClient() {
    return new \SoapClient('https://api.webdispecink.cz/code/WebDispecinkServiceNet.php?wsdl');
}

function insertCarsListDB($kodf, $username, $pass) {
    require './lib/db.php'; // připojení k databázi

    $client = getSoapClient();
    $response = $client->_getCarsList($kodf, $username, $pass);

    $cars = [];

    if (isset($response->item) && is_array($response->item)) {
        foreach ($response->item as $car) {
            if ($car->disabled == 0) {
                $carid = $car->carid;
                $spz = $car->identifikator;

                // Zkontroluj, zda záznam existuje
                $check = $mysqli->prepare("SELECT id FROM list_cars WHERE w_carid = ?");
                $check->bind_param("s", $carid);
                $check->execute();
                $check->store_result();

                if ($check->num_rows > 0) {
                    // UPDATE existujícího záznamu
                    $update = $mysqli->prepare("UPDATE list_cars SET w_spz = ? WHERE w_carid = ?");
                    $update->bind_param("ss", $spz, $carid);
                    $update->execute();
                    $update->close();
                } else {
                    // INSERT nového záznamu
                    $insert = $mysqli->prepare("INSERT INTO list_cars (w_carid, w_spz) VALUES (?, ?)");
                    $insert->bind_param("ss", $carid, $spz);
                    $insert->execute();
                    $insert->close();
                }

                $check->close();

                $cars[] = [
                    'carid' => $carid,
                    'identifier' => $spz
                ];
            }
        }
    }

    $mysqli->close();
    return json_encode($cars);
}

function insertCarsGroupDB($kodf, $username, $pass) {
    require './lib/db.php'; // připojení k databázi

    $client = getSoapClient();
    $response = $client->_getCargroups($kodf, $username, $pass);

    $groups = [];

    if (isset($response->item) && is_array($response->item)) {
        foreach ($response->item as $group) {
            if (true) {



                $groupid = $group->CargroupId;
                $groupname = $group->GroupName;
                $numcars = $group->NumCars;

                echo $groupname;

                // Zkontroluj, zda záznam existuje
                $check = $mysqli->prepare("SELECT id FROM cars_group WHERE w_groupid= ?");
                $check->bind_param("s", $groupid);
                $check->execute();
                $check->store_result();

                if ($check->num_rows > 0) {
                    // UPDATE existujícího záznamu
                    $update = $mysqli->prepare("UPDATE cars_group SET w_groupname=?, w_numcars=?  WHERE w_groupid= ?");
                    $update->bind_param("sss", $groupname, $numcars, $groupid);
                    $update->execute();
                    $update->close();
                } else {
                    // INSERT nového záznamu
                    $insert = $mysqli->prepare("INSERT INTO cars_group (w_groupid, w_groupname, w_numcars) VALUES (?, ?, ?)");
                    $insert->bind_param("sss", $groupid, $groupname, $numcars);
                    $insert->execute();
                    $insert->close();
                }

                $check->close();

                $groups[] = [
                    'groupid' => $groupid,
                    'groupname' => $groupname,
                    'numcars' => $numcars
                ];
            }
        }
    }

    $mysqli->close();
    return json_encode($groups);
}

function getCarsGeneralInfoFromDB($kodf, $username, $pass) {
    require './lib/db.php'; // připojení k databázi
    // Načti všechna w_carid z databáze
    $result = $mysqli->query("SELECT w_carid FROM list_cars");
    $carIds = [];

    while ($row = $result->fetch_assoc()) {
        $carIds[] = $row['w_carid'];
    }

    if (empty($carIds)) {
        return ['error' => 'No car IDs found in database.'];
    }

    // Vytvoř řetězec oddělený čárkami
    $carIds = array_map('trim', $carIds);
    $carListString = implode(',', $carIds);

    // Zavolej SOAP API
    $client = getSoapClient();

    try {
// Volání SOAP funkce s jednotlivými parametry
        $response = $client->_getCarsListGeneral5($kodf, $username, $pass, $carListString);
        return $response;
    } catch (SoapFault $e) {
        return ['error' => 'SOAP Error: ' . $e->getMessage()];
    }
}

function saveCarsDetailsToDB($carsDetails) {
    require './lib/db.php'; // připojení k databázi
    //  print_r($carsDetails);


    $now = date('Y-m-d H:i:s');

    foreach ($carsDetails->item as $car) {
        $carid = $car->CarId;

        // Připrav hodnoty

        $carid = isset($car->CarId) ? $car->CarId : null;
        $groupid = isset($car->Cargroupid) ? $car->Cargroupid : -1;
        $popis = isset($car->Popis) ? $car->Popis : null;
        $znacka = isset($car->Tovarni_znacka) ? $car->Tovarni_znacka : null;
        $model = isset($car->Model_vozu) ? $car->Model_vozu : null;
        $phm = isset($car->Typ_PHM) ? $car->Typ_PHM : null;
        $stanoviste = isset($car->Stanoviste) ? $car->Stanoviste : null;
        $nadrz = isset($car->Nadrz) ? $car->Nadrz : null;
        $datod = isset($car->DatOd) ? $car->DatOd : null;

        // Zkontroluj, zda záznam existuje
        $check = $mysqli->prepare("SELECT id FROM cars_detail WHERE w_carid = ?");
        $check->bind_param("s", $carid);
        $check->execute();
        $check->store_result();

        if ($check->num_rows > 0) {
            // UPDATE
            $update = $mysqli->prepare("UPDATE cars_detail SET w_groupid=?, w_popis=?, w_tovarni_znacka=?, w_model_vozu=?, w_typ_phm=?, w_stanoviste=?, w_nadrz=?, w_datod=?, dt_aktualizace=?  WHERE w_carid=?");
            $update->bind_param("ssssssssss", $groupid, $popis, $znacka, $model, $phm, $stanoviste, $nadrz, $datod, $now, $carid);
            $update->execute();
            $update->close();
        } else {
            // INSERT
            $insert = $mysqli->prepare("INSERT INTO cars_detail (w_carid, w_groupid, w_popis, w_tovarni_znacka, w_model_vozu, w_typ_phm, w_stanoviste, w_nadrz, w_datod, dt_aktualizace) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $insert->bind_param("ssssssssss", $carid, $groupid, $popis, $znacka, $model, $phm, $stanoviste, $nadrz, $datod, $now);
            $insert->execute();
            $insert->close();
        }

        $check->close();
    }

    $mysqli->close();
}

function getCarsList($kodf, $username, $pass) {
    $client = getSoapClient();
    $response = $client->_getCarsList($kodf, $username, $pass);

    $cars = [];

    if (isset($response->item) && is_array($response->item)) {
        foreach ($response->item as $car) {
            if ($car->disabled == 0) {
                $cars[] = [
                    'carid' => $car->carid,
                    'identifier' => $car->identifikator
                ];
            }
        }
    }

    return json_encode($cars);
}

function getCarsIDPosition2FromDB($kodf, $username, $pass) {
    require './lib/db.php'; // připojení k databázi
    // Načti všechna w_carid z databáze
    $result = $mysqli->query("SELECT w_carid FROM list_cars");
    $carIds = [];

    while ($row = $result->fetch_assoc()) {
        $carIds[] = $row['w_carid'];
    }

    if (empty($carIds)) {
        return ['error' => 'No car IDs found in database.'];
    }

    // Vytvoř řetězec oddělený čárkami
    $carIds = array_map('trim', $carIds);
    $carListString = implode(',', $carIds);

    // Zavolej SOAP API
    $client = getSoapClient();

    try {
// Volání SOAP funkce s jednotlivými parametry
        $response = $client->_getCarsIDPosition2($kodf, $username, $pass, $carListString);
        //  print_r($response);
        return $response;
    } catch (SoapFault $e) {
        return ['error' => 'SOAP Error: ' . $e->getMessage()];
    }
}

function getCarsKmMesic($kodf, $username, $pass, $nMonths = 1, $carId = "") {
    // Připojení k databázi
    require './lib/db.php';

    if ($carId == "") {
        // Načti všechna w_carid z databáze
        $result = $mysqli->query("SELECT w_carid FROM list_cars");
        $carIds = [];

        while ($row = $result->fetch_assoc()) {
            $carIds[] = $row['w_carid'];
        }
    } else {
        $carIds = [$carId];
    }

    if (empty($carIds)) {
        return ['error' => 'No car IDs found in database.'];
    }

    // Dynamický výpočet dat
    $dateDo = new DateTime('first day of this month');
    $dateOd = clone $dateDo;
    $dateOd->modify('-' . $nMonths . ' months');

    $dateOdFormatted = $dateOd->format('d.m.Y H:i:s');
    $dateDoFormatted = $dateDo->format('d.m.Y H:i:s');

    // Měsíc a rok pro kontrolu v databázi
    $currentMonth = date('m');
    $currentYear = date('Y');

    $client = getSoapClient();
    $allCarsData = [];
    
    // Připravíme dotaz pro přesnou kontrolu existence záznamu
    $checkStmt = $mysqli->prepare("SELECT COUNT(*) FROM `cars_km_mesic` WHERE `w_carid` = ? AND MONTH(`dt_aktualizace`) = ? AND YEAR(`dt_aktualizace`) = ? AND `pocet_mesicu` = ?");
    if (!$checkStmt) {
        return ['error' => 'Prepare check failed: ' . $mysqli->error];
    }
    // Navážeme parametry POUZE JEDNOU
    $checkStmt->bind_param("iiii", $currentCarId, $currentMonth, $currentYear, $nMonths);

    // Připravíme dotaz pro smazání všech záznamů pro dané auto
    $deleteStmt = $mysqli->prepare("DELETE FROM `cars_km_mesic` WHERE `w_carid` = ?");
    if (!$deleteStmt) {
        $checkStmt->close();
        return ['error' => 'Prepare delete failed: ' . $mysqli->error];
    }
    // Navážeme parametry POUZE JEDNOU
    $deleteStmt->bind_param("i", $currentCarId);
    
    foreach ($carIds as $currentCarId) {
        // --- KONTROLA DATABÁZE PŘED VOLÁNÍM SOAP ---
        $checkStmt->execute();
        $checkStmt->bind_result($count);
        $checkStmt->fetch();
        $checkStmt->free_result(); // TOTO JE KLÍČOVÉ

        // Pokud existuje přesný záznam, přeskočíme zbytek smyčky a jdeme na další auto
        if ($count > 0) {
            continue;
        }
        
        // Pokud neexistuje, smažeme všechny staré záznamy pro toto auto
        $deleteStmt->execute();
        
        // --- KONEC KONTROLY A MAZÁNÍ ---
        
        try {
            $response = $client->_getStaCars2($kodf, $username, $pass, $currentCarId, $dateOdFormatted, $dateDoFormatted);

            if (is_object($response) && isset($response->item)) {
                $data = $response->item;
                $casOdMySQL = (new DateTime($data->Casod))->format('Y-m-d H:i:s');
                $casDoMySQL = (new DateTime($data->Casdo))->format('Y-m-d H:i:s');

                $allCarsData[] = [
                    'carid' => $data->carid,
                    'Tach_start' => $data->Tach_start,
                    'stavTach' => $data->Tach_end,
                    'Celkem_km' => $data->Celkem_km,
                    'CasOd' => $casOdMySQL,
                    'CasDo' => $casDoMySQL,
                    'PocetMesicu' => $nMonths
                ];
            } else {
                $allCarsData[] = ['carid' => $currentCarId, 'error' => 'Invalid or empty response from SOAP API.'];
            }
        } catch (SoapFault $e) {
            $allCarsData[] = ['carid' => $currentCarId, 'error' => 'SOAP Error: ' . $e->getMessage()];
        }
    }

    $checkStmt->close();
    $deleteStmt->close();
    return $allCarsData;
}


function getCarsKmMesicANOOK($kodf, $username, $pass, $nMonths = 1, $carId = "") {
    // Připojení k databázi
    require './lib/db.php';

    if ($carId == "") {
        // Načti všechna w_carid z databáze
        $result = $mysqli->query("SELECT w_carid FROM list_cars");
        $carIds = [];

        while ($row = $result->fetch_assoc()) {
            $carIds[] = $row['w_carid'];
        }
    } else {
        $carIds = [$carId];
    }


    if (empty($carIds)) {
        return ['error' => 'No car IDs found in database.'];
    }

    // Dynamický výpočet dat
    $dateDo = new DateTime('first day of this month');
    $dateOd = clone $dateDo;
    $dateOd->modify('-' . $nMonths . ' months');

    $dateOdFormatted = $dateOd->format('d.m.Y H:i:s');
    $dateDoFormatted = $dateDo->format('d.m.Y H:i:s');

    // Měsíc a rok pro kontrolu v databázi
    $currentMonth = date('m');
    $currentYear = date('Y');

    $client = getSoapClient();
    $allCarsData = [];

    // Připravíme dotaz pro kontrolu existence záznamu
    $checkStmt = $mysqli->prepare("SELECT COUNT(*) FROM `cars_km_mesic` WHERE `w_carid` = ? AND MONTH(`dt_aktualizace`) = ? AND YEAR(`dt_aktualizace`) = ? AND `pocet_mesicu` = ?");
    if (!$checkStmt) {
        return ['error' => 'Prepare check failed: ' . $mysqli->error];
    }
    $checkStmt->bind_param("iiii", $carId, $currentMonth, $currentYear, $nMonths);

    foreach ($carIds as $carId) {
        // --- KONTROLA DATABÁZE PŘED VOLÁNÍM SOAP ---
        $checkStmt->execute();
        $checkStmt->bind_result($count);
        $checkStmt->fetch();

        // Pokud záznam existuje, přeskočíme volání API a přejdeme na další auto
        if ($count > 0) {
            continue;
        }
        // --- KONEC KONTROLY DATABÁZE ---


        try {
            $response = $client->_getStaCars2($kodf, $username, $pass, $carId, $dateOdFormatted, $dateDoFormatted);

            if (is_object($response)  && isset($response->item)) {
                $data = $response->item;
                $casOdMySQL = (new DateTime($data->Casod))->format('Y-m-d H:i:s');
                $casDoMySQL = (new DateTime($data->Casdo))->format('Y-m-d H:i:s');

                $allCarsData[] = [
                    'carid' => $data->carid,
                    'Tach_start' => $data->Tach_start,
                    'Tach_end' => $data->Tach_end,
                    'Celkem_km' => $data->Celkem_km,
                    'CasOd' => $casOdMySQL,
                    'CasDo' => $casDoMySQL,
                    'PocetMesicu' => $nMonths
                ];
            } else {
                $allCarsData[] = ['carid' => $carId, 'error' => 'Invalid or empty response from SOAP API.'];
            }
        } catch (SoapFault $e) {
            $allCarsData[] = ['carid' => $carId, 'error' => 'SOAP Error: ' . $e->getMessage()];
        }
    }

    $checkStmt->close();
    return $allCarsData;
}

function getCarsKmMesicL($kodf, $username, $pass, $nMonths = 1, $carId = "") {
    // Připojení k databázi
    require './lib/db.php';

    if ($carId == "") {
        // Načti všechna w_carid z databáze
        $result = $mysqli->query("SELECT w_carid FROM list_cars");
        $carIds = [];

        while ($row = $result->fetch_assoc()) {
            $carIds[] = $row['w_carid'];
        }

        // Pokud nejsou nalezena žádná ID, vrať chybu
        if (empty($carIds)) {
            return ['error' => 'No car IDs found in database.'];
        }
    } else {
        $carIds = [$carId];
    }

    /* print_r($carIds);
      exit(); */

    // --- Dynamický výpočet dat ---
    // Datum DO: první den aktuálního měsíce, 00:00:00
    $dateDo = new DateTime('first day of this month');
    $dateDo->setTime(0, 0, 0);

    // Datum OD: první den měsíce před x měsíci
    $dateOd = clone $dateDo;
    $dateOd->modify('-' . $nMonths . ' months');

    // Formátování dat pro SOAP volání
    $dateOdFormatted = $dateOd->format('d.m.Y H:i:s');
    $dateDoFormatted = $dateDo->format('d.m.Y H:i:s');

    // Inicializace SOAP klienta a pole pro výsledná data
    $client = getSoapClient();
    $allCarsData = [];

    //$carIds = [326944];
    // Iterace přes každé ID vozidla a volání SOAP API
    foreach ($carIds as $carId) {
        try {
            // Volání SOAP funkce s dynamickým carId a pevně daným časovým rozmezím
            $response = $client->_getStaCars2($kodf, $username, $pass, $carId, $dateOdFormatted, $dateDoFormatted);

            // Zpracování odpovědi a uložení požadovaných dat
            if (is_object($response) && isset($response->item)) {
                $data = $response->item;

                // Převedení formátu datumu pro MySQL
                $casOdMySQL = (new DateTime($data->Casod))->format('Y-m-d H:i:s');
                $casDoMySQL = (new DateTime($data->Casdo))->format('Y-m-d H:i:s');

                $allCarsData[] = [
                    'carid' => $data->carid,
                    'Tach_start' => $data->Tach_start,
                    'stavTach' => $data->Tach_end,
                    'Celkem_km' => $data->Celkem_km,
                    'CasOd' => $casOdMySQL,
                    'CasDo' => $casDoMySQL,
                    'PocetMesicu' => $nMonths
                ];
            } else {
                // Přidání chybové informace, pokud je odpověď neplatná nebo prázdná
                $allCarsData[] = ['carid' => $carId, 'error' => 'Invalid or empty response from SOAP API.'];
            }
        } catch (SoapFault $e) {
            // Zaznamenání chyby pro konkrétní vozidlo a pokračování smyčky
            $allCarsData[] = ['carid' => $carId, 'error' => 'SOAP Error: ' . $e->getMessage()];
        }
    }

    // Vrácení pole s daty pro všechna vozidla
    return $allCarsData;
}

function saveCarsKmToDB($carsList) {
    require './lib/db.php'; // připojení k databázi

    if (empty($carsList)) {
        return 'No data to save.';
    }



    // Připravíme INSERT dotaz POUZE JEDNOU před smyčkou
    $insert = $mysqli->prepare("INSERT INTO cars_km_mesic (w_carid, w_datod, w_datdo, pocet_mesicu, km, stavTach, dt_aktualizace) VALUES (?, ?, ?, ?, ?, ?, ?)");

    // Zkontrolujeme, zda se prepared statement podařilo připravit
    if (!$insert) {
        echo "Error DB";
        return ['error' => 'Prepare failed: ' . $mysqli->error];
    }


    // Navážeme parametry POUZE JEDNOU na proměnné před smyčkou
    $insert->bind_param("issidds", $carid, $datod, $datdo, $pocet_mesicu, $km, $stavTach, $dt_aktualizace);

    // Iterujeme přes každé auto v seznamu a ukládáme data
    foreach ($carsList as $carData) {
        // Přiřazení hodnot do navázaných proměnných, které se změní v každé iteraci
        $carid = $carData['carid'];
        $datod = $carData['CasOd'];
        $datdo = $carData['CasDo'];
        $pocet_mesicu = $carData['PocetMesicu'];
        $km = $carData['Celkem_km'];
        $stavTach = $carData['stavTach'];
        $dt_aktualizace = date('Y-m-d H:i:s');

        // Spustíme dotaz. Hodnoty se automaticky vezmou z proměnných
        if (!$insert->execute()) {
            $insert->close();
            return ['error' => 'Execute failed: ' . $insert->error];
        }
    }

    $insert->close(); // Zavřeme prepared statement po smyčce

    return 'Data saved successfully.';
}

function saveCarsPositionToDB($carsPosition) {
    require './lib/db.php'; // připojení k databázi
    //  print_r($carsDetails);


    $now = date('Y-m-d H:i:s');

    foreach ($carsPosition->item as $car) {
        $carid = $car->CarId;

        // Připrav hodnoty

        $carid = isset($car->cd) ? $car->cd : null;
        $majak = isset($car->i1s) ? $car->i1s : null;
        $pt = isset($car->pt) ? $car->pt : null;
        $lp = isset($car->lp) ? $car->lp : null;
        $km = isset($car->Km) ? $car->Km : null;
        $ln = isset($car->LN) ? $car->LN : null;
        $zs = isset($car->Zs) ? $car->Zs : null;
        $zd = isset($car->Zd) ? $car->Zd : null;

        /* NENI potreba, polohu pridej vzdy Zkontroluj, zda záznam existuje
          $check = $mysqli->prepare("SELECT id FROM cars_detail WHERE w_carid = ?");
          $check->bind_param("s", $carid);
          $check->execute();
          $check->store_result();
         */

        /*  if ($check->num_rows > 0) {
          // UPDATE
          $update = $mysqli->prepare("UPDATE cars_detail SET w_popis=?, w_tovarni_znacka=?, w_model_vozu=?, w_typ_phm=?, w_stanoviste=?, w_nadrz=?, w_datod=?, dt_aktualizace=?  WHERE w_carid=?");
          $update->bind_param("sssssssss", $popis, $znacka, $model, $phm, $stanoviste, $nadrz, $datod, $now, $carid);
          $update->execute();
          $update->close();
          } else { */
        // INSERT
        $insert = $mysqli->prepare("INSERT INTO cars_position (w_carid, w_majak, w_pt, w_lp, w_km, w_ln, w_zs, w_zd, dt_aktualizace) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $insert->bind_param("sssssssss", $carid, $majak, $pt, $lp, $km, $ln, $zs, $zd, $now);
        $insert->execute();
        $insert->close();

        // $check->close();
    }

    $mysqli->close();
}

function getCarsIDPosition2($kodf, $username, $pass, $carid_list = '') {
    $client = getSoapClient();
    $response = $client->_getCarsIDPosition2($kodf, $username, $pass, $carid_list);

    $positions = [];

    if (isset($response->item) && is_array($response->item)) {
        foreach ($response->item as $position) {
            $positions[] = [
                'carid' => $position->cd,
                'latitude' => (float) $position->Zs,
                'longitude' => (float) $position->Zd,
                'speed' => (int) $position->sd,
                'running' => (bool) $position->EE,
                'tachometer' => (float) $position->Km,
                'direction' => (int) $position->ca
            ];
        }
    }

    return json_encode($positions);
}

?>

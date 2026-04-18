<?php

function getCarsDetailDB() {
    require_once './inc/cmdSQL.php';
    require './lib/db.php'; // připojení k databázi
    //  echo $sql_CarsDetail;
    $result = $mysqli->query($sql_CarsDetail);
    // echo $mysqli->error;
    // print_r($result);

    if ($result && $result->num_rows > 0) {


        $cars = [];
        while ($row = $result->fetch_assoc()) {
            $cars[] = $row;
        }


        echo json_encode([
            'status' => "success",
            'cars' => $cars
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'žádná data'
        ]);
    }

    $mysqli->close();
}

function getCarsPositionDB($carid) {
    require_once './inc/cmdSQL.php';
    require './lib/db.php'; // připojení k databázi


    $query = $mysqli->prepare($sql_CarPositionByID);
    // echo $sql_CarPositionByID;

    if ($query) {
        $query->bind_param("i", $carid);
        $query->execute();

// Získáme metadata o sloupcích
        $meta = $query->result_metadata();
        $fields = [];
        $row = [];

// Připravíme proměnné pro bind_result
        while ($field = $meta->fetch_field()) {
            $fields[] = &$row[$field->name];
        }

// Navážeme proměnné
        call_user_func_array([$query, 'bind_result'], $fields);

// Načteme výsledky
        $positions = [];
        while ($query->fetch()) {
            $record = [];
            foreach ($row as $key => $val) {
                $record[$key] = $val;
            }
            $positions[] = $record;
        }

        echo json_encode([
            'status' => "success",
            'positions' => $positions
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'žádná data'
        ]);
    }

    $mysqli->close();
}

function getCarsKmByID($carid) {
    require_once './inc/cmdSQL.php';
    require './lib/db.php'; // připojení k databázi
    
        $query = $mysqli->prepare($sql_CarKmByID);
       
    //    echo $sql_CarKmByID;

    if ($query) {
        $query->bind_param("i", $carid);
        $query->execute();

// Získáme metadata o sloupcích
        $meta = $query->result_metadata();
        $fields = [];
        $row = [];

// Připravíme proměnné pro bind_result
        while ($field = $meta->fetch_field()) {
            $fields[] = &$row[$field->name];
        }

// Navážeme proměnné
        call_user_func_array([$query, 'bind_result'], $fields);

// Načteme výsledky
        $km = [];
        while ($query->fetch()) {
            $record = [];
            foreach ($row as $key => $val) {
                $record[$key] = $val;
            }
            $km[] = $record;
        }

        echo json_encode([
            'status' => "success",
            'km' => $km
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'žádná data'
        ]);
    }

    $mysqli->close();
}

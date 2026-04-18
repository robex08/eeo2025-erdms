<?php

require_once './inc/const.php';
include_once "./v1.0/webDispecink.php";

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Kontrola metody
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Použijte metodu POST.']);
    exit;
}

/* neresim, parametry mam na pevno v API

  $kodf = isset($_POST['kodf']) ? $_POST['kodf'] : '';
  $username = isset($_POST['username']) ? $_POST['username'] : '';
  $pass = isset($_POST['pass']) ? $_POST['pass'] : '';
  $carid_list = isset($_POST['carid_list']) ? $_POST['carid_list'] : '';
 */

$action = isset($_POST['action']) ? $_POST['action'] : '';
$interval = isset($_POST['interval']) ? $_POST['interval'] : 1;
$carId = isset($_POST['id']) ? $_POST['id'] : "";
// Validace
if (!$kodf || !$username || !$pass) {
    http_response_code(400);
    echo json_encode(['error' => 'Chybí povinné parametry.']);
    exit;
}


// Zpracování požadavku
try {
    $list = array();
    echo "Akce: ".$action;
    switch ($action) {
        case 'wdCarsGroup':
            $list = insertCarsGroupDB($kodf, $username, $pass);
            break;

        case 'wdCarsList':
            $list = insertCarsListDB($kodf, $username, $pass);
            break;

        case 'wdCarsGeneralInfo':
            $list = getCarsGeneralInfoFromDB($kodf, $username, $pass);
            saveCarsDetailsToDB($list);
            $list = json_encode($list);
            break;

        case 'wdCarsIDPosition':
            $list = getCarsIDPosition2FromDB($kodf, $username, $pass);
            saveCarsPositionToDB($list);

            $list = json_encode($list);
            break;

        case 'wdCarsIDKmMesic':
            if (!isset($interval)) $interval=1;
            $list = getCarsKmMesic($kodf, $username, $pass, $interval, $carId);
            saveCarsKmToDB($list);

            $list = json_encode($list);
            break;

        default: http_response_code(400);
            $list = json_encode(['error' => 'Neznámá akce.']);
            break;
    }

    echo $list;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Chyba serveru: ' . $e->getMessage()]);
}
?>

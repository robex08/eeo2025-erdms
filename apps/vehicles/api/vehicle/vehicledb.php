<?php

require_once './inc/const.php';
include_once "./v1.0/mySQLCars.php";

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Kontrola metody
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Použijte metodu GET.']);
    exit;
}

// Získání parametru z GET
$action = isset($_GET['action']) ? strval($_GET['action']) : '';
$carid = isset($_GET['carid']) ? intval($_GET['carid']) : 0;
$interval = isset($_GET['interval']) ? intval($_GET['interval']) : 3;

switch ($action) {
    case 'dbCarsListDetail':
        getCarsDetailDB();
        break;
    case 'dbCarsPosition':
        getCarsPositionDB($carid);
        break;

    case 'dbCarsKmMonth':
        getCarsKmByID($carid);
        break;
    
    default:  
        echo json_encode(['error' => 'Neznámá akce.']);
        break;
}
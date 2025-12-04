<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');



// načti helpery a konfiguraci
require_once 'config.php';
require_once '../archive/db.php';
require_once 'queries.php';

// načti DB config a připoj se přes PDO helper (archive/db.php)
$dbConfig = require '../lib/dbconfig.php';
$database = new Database($dbConfig);


try {
    $db = $database->connect();
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

if (!$db) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;

if (!$action) {
    echo json_encode(['error' => 'Action parameter is required']);
    exit;
}

$query = getQuery($action);
if (!$query) {
    echo json_encode(['error' => 'Invalid action']);
    exit;
}

try {
    // Pro každý action případně uprav dotaz a parametry
    $params = [];

    switch ($action) {
        case 'react-get-year-orders': {
            $yearFrom = $input['yearFrom'] ?? null;
            $yearTo = $input['yearTo'] ?? null;
            $tabulka_obj = $input['tabulka_obj'] ?? null;
            $tabulka_opriloh = $input['tabulka_opriloh'] ?? null;
            $tabulka_objMD = $input['tabulka_objMD'] ?? null;

            if (!$yearFrom || !$yearTo || !$tabulka_obj || !$tabulka_opriloh || !$tabulka_objMD) {
                echo json_encode(['error' => 'yearFrom, yearTo, tabulka_obj, tabulka_opriloh, tabulka_objMD are required for react-get-year-orders']);
                exit;
            }

            // Nahrad názvy tabulek do dotazu
            $query = str_replace(':tab_obj', $tabulka_obj, $query);
            $query = str_replace(':tbl_oprilohy', $tabulka_opriloh, $query);
            $query = str_replace(':tbl_objMD', $tabulka_objMD, $query);

            $params = [
                ':yearFrom' => $yearFrom,
                ':yearTo' => $yearTo
            ];
            break;
        }
        case 'react-attachment-id': {
            // Očekává: id (objednávky); název tabulky vezmeme z configu
            $id = $input['id'] ?? null;
            if (!$id) {
                echo json_encode(['error' => 'id is required for react-attachment-id']);
                exit;
            }
            // Název tabulky starých příloh z configu
            $tabulka_oprilohy = isset($config['db']['oprilohy']) ? $config['db']['oprilohy'] : 'r_pripojene_odokumenty';
            // Nahrad placeholder názvem tabulky
            $query = str_replace(':tbl_oprilohy', $tabulka_oprilohy, $query);
            $params = [':id' => $id];
            break;
        }
        default:
            // Bez parametrů, dotaz zůstává jak je
            $params = [];
    }

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage(), 'action' => $action]);
}
?>
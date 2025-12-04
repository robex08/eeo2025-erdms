<?php
// CORS headers - allow frontend apps to call this API
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Access-Control-Allow-Credentials: false");
header("Content-Type: application/json; charset=utf-8");


require_once 'v2025.03_25/lib/dbconfig.php';
require_once 'v2025.03_25/old/config.php';
require_once 'v2025.03_25/old/queries.php';

$dbConfig = require 'v2025.03_25/lib/dbconfig.php';

$database = isset($input['database']) ? $input['database'] : $dbConfig['mysql']['database'];

try {
    $pdo = new PDO("mysql:host=" . $dbConfig['mysql']['host'] . ";dbname=" . $database . ";charset=utf8", $dbConfig['mysql']['username'], $dbConfig['mysql']['password']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Connection error: ' . $e->getMessage()]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if ($input === null) {
    // Try form data
    $input = $_POST;
}
$action = isset($input['action']) ? $input['action'] : null;

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
    switch ($action) {
        case 'react-get-year-orders':
            $yearFrom = isset($input['yearFrom']) ? $input['yearFrom'] : null;
            $yearTo = isset($input['yearTo']) ? $input['yearTo'] : null;
            $tabulka_obj = isset($input['tabulka_obj']) ? $input['tabulka_obj'] : null;
            $tabulka_opriloh = isset($input['tabulka_opriloh']) ? $input['tabulka_opriloh'] : null;
            $tabulka_objMD = isset($input['tabulka_objMD']) ? $input['tabulka_objMD'] : null;

            if (!$yearFrom || !$yearTo || !$tabulka_obj || !$tabulka_opriloh || !$tabulka_objMD) {
                echo json_encode(['error' => 'yearFrom, yearTo, tabulka_obj, tabulka_opriloh, tabulka_objMD are required for react-get-year-orders']);
                exit;
            }

            // Replace placeholders
            $query = str_replace(':tab_obj', $tabulka_obj, $query);
            $query = str_replace(':tbl_oprilohy', $tabulka_opriloh, $query);
            $query = str_replace(':tbl_objMD', $tabulka_objMD, $query);

            $stmt = $pdo->prepare($query);
            $stmt->bindParam(':yearFrom', $yearFrom);
            $stmt->bindParam(':yearTo', $yearTo);
          //  echo json_encode(['debug_query' => $query, 'yearFrom' => $yearFrom, 'yearTo' => $yearTo]);
            break;

        case 'react-attachment-id':
            $id = isset($input['id']) ? $input['id'] : null;
            $tabulka_opriloh = isset($input['tabulka_opriloh']) ? $input['tabulka_opriloh'] : null;
            if (!$id || !$tabulka_opriloh) {
                echo json_encode(['error' => 'id and tabulka_opriloh are required for react-attachment-id']);
                exit;
            }
            // Replace placeholder for legacy attachments table name
            $query = str_replace(':tbl_oprilohy', $tabulka_opriloh, $query);
            $stmt = $pdo->prepare($query);
            $stmt->bindParam(':id', $id);
            break;

        default:
            $stmt = $pdo->prepare($query);
            break;
    }

    $stmt->execute();
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($result);

} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
<?php
header("Content-Type: application/json");
require_once "/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php";
$config = require "/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php";
echo json_encode([
    "status" => "ok",
    "db_name" => $config["mysql"]["database"],
    "db_host" => $config["mysql"]["host"],
    "upload_path" => $config["upload"]["root_path"],
    "env_check" => [
        "DB_NAME_env" => $_ENV["DB_NAME"] ?? "NOT_SET",
        "DB_NAME_server" => $_SERVER["DB_NAME"] ?? "NOT_SET"
    ]
], JSON_PRETTY_PRINT);
?>


<?php
include './inc/const.php';

$mysqli = new mysqli($host, $user, $password, $database);

if ($mysqli->connect_error) {
    die('Chyba připojení k databázi: ' . $mysqli->connect_error);
}


$mysqli->set_charset("utf8mb4");

?>

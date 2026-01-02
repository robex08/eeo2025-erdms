<?php
$_config = require __DIR__ . '/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/dbconfig.php';
$config = $_config['mysql'];
$db = new PDO(
    "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
    $config['username'],
    $config['password'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

define('TBL_LP_MASTER', '25_limitovane_prisliby');

$lp_id = isset($argv[1]) ? (int)$argv[1] : 44;

$stmt = $db->prepare("SELECT id, cislo_lp, usek_id, user_id, vyse_financniho_kryti, platne_od, platne_do FROM " . TBL_LP_MASTER . " WHERE id = :lp_id");
$stmt->execute(['lp_id' => $lp_id]);
$meta = $stmt->fetch(PDO::FETCH_ASSOC);

echo "=== LP Metadata ===\n";
var_dump($meta);

if ($meta) {
    $rok = (int)date('Y', strtotime($meta['platne_do']));
    echo "\nVypočítaný rok (z platne_do): $rok\n";
}

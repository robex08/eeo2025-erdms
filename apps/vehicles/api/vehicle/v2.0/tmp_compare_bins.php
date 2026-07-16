<?php
require_once __DIR__ . '/src/Config/Env.php';
require_once __DIR__ . '/src/Config/Database.php';
require_once __DIR__ . '/src/Repository/VehicleRepository.php';

Env::load(__DIR__ . '/.env');
$pdo = Database::connect();
$repo = new VehicleRepository($pdo);

$new = $repo->getFleetMileageForecast(3, 'aktivni');
echo "NEW bins\n";
foreach (($new['chart'] ?? []) as $b) {
    echo $b['label'] . ': ' . $b['total'] . PHP_EOL;
}

$sql = "SELECT km.*, lc.w_spz, lc.status_vozidla
        FROM cars_km_mesic km
        INNER JOIN list_cars lc ON lc.w_carid = km.w_carid
        WHERE km.dt_aktualizace >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          AND km.pocet_mesicu = 3";
$rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

$posSql = "SELECT p1.w_carid, p1.w_km
           FROM cars_position p1
           INNER JOIN (
               SELECT w_carid, MAX(id) AS max_id
               FROM cars_position
               GROUP BY w_carid
           ) p2 ON p2.w_carid = p1.w_carid AND p2.max_id = p1.id";
$pos = [];
foreach ($pdo->query($posSql)->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $pos[(int) $r['w_carid']] = (float) $r['w_km'];
}

$bins = [];
foreach ($rows as $r) {
    if (strtolower(trim((string) $r['status_vozidla'])) !== 'aktivni') {
        continue;
    }

    $carid = (int) $r['w_carid'];
    $stav = $pos[$carid] ?? null;
    if ($stav === null || $stav >= 250000) {
        continue;
    }

    $km = (float) $r['km'];
    $m = (int) $r['pocet_mesicu'];
    if ($km <= 0 || $m <= 0) {
        continue;
    }

    $avg = $km / $m;
    if ($avg <= 0) {
        continue;
    }

    $months = (int) ceil((250000 - $stav) / $avg);
    if ($months > 120) {
        continue;
    }

    $upd = new DateTimeImmutable($r['dt_aktualizace']);
    $target = $upd->modify('+' . $months . ' months');
    $label = ((int) $target->format('n') <= 6 ? '1' : '2') . '. pol ' . $target->format('Y');
    $bins[$label] = ($bins[$label] ?? 0) + 1;
}

uksort($bins, static function (string $a, string $b): int {
    preg_match('/^(\d)\. pol (\d{4})$/', $a, $am);
    preg_match('/^(\d)\. pol (\d{4})$/', $b, $bm);
    $aKey = ((int) ($am[2] ?? 0)) * 10 + (int) ($am[1] ?? 0);
    $bKey = ((int) ($bm[2] ?? 0)) * 10 + (int) ($bm[1] ?? 0);
    return $aKey <=> $bKey;
});

echo PHP_EOL . "LEGACY-sim bins\n";
foreach ($bins as $label => $count) {
    echo $label . ': ' . $count . PHP_EOL;
}

<?php
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php';
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/OrderV2Handler.php';

echo "=== TEST VYTVOŘENÍ OBJEDNÁVKY S OPRAVENÝM ČASEM ===\n";

// Simuluj data z frontendu
$frontendData = array(
    'dt_objednavky' => '2026-01-09T01:00:00Z',  // UTC čas
    'predmet' => 'TEST OBJEDNÁVKA - OPRAVA ČASU',
    'max_cena_s_dph' => '1000.00',
    'stav_workflow_kod' => 'DRAFT'
);

$handler = new OrderV2Handler(null);

echo "Frontend data:\n";
print_r($frontendData);

$dbData = $handler->transformToDB($frontendData);

echo "\nData pro databázi:\n";
print_r($dbData);

echo "\nZkontroluj dt_objednavky:\n";
echo "Frontend: {$frontendData['dt_objednavky']}\n";
echo "DB: {$dbData['dt_objednavky']}\n";
echo "Očekávám český čas (UTC+1): 2026-01-09 02:00:00\n";
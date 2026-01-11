<?php
require_once 'apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/TimezoneHelper.php';

echo "=== TEST TIMEZONE KONVERZE ===\n";

// Test 1: ISO 8601 s Z (UTC)
$utc_time = '2026-01-09T01:00:00Z';
$converted = TimezoneHelper::convertUtcToCzech($utc_time);
echo "UTC: $utc_time -> Czech: $converted\n";

// Test 2: ISO 8601 s evropskou timezone
$eu_time = '2026-01-09T02:00:00+01:00';
$converted2 = TimezoneHelper::convertUtcToCzech($eu_time);
echo "EU+01: $eu_time -> Result: $converted2\n";

// Test 3: MySQL formát
$mysql_time = '2026-01-09 01:00:00';
$converted3 = TimezoneHelper::convertUtcToCzech($mysql_time);
echo "MySQL: $mysql_time -> Czech: $converted3\n";

// Test 4: Aktuální český čas
echo "Aktuální český čas: " . TimezoneHelper::getCzechDateTime() . "\n";
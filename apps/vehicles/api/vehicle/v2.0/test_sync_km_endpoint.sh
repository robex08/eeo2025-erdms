#!/bin/bash
# Test endpoint /drivers/sync-km-vehicle

VEHICLE_ID=1
YEAR=2026
MONTH=7

echo "Testing POST /drivers/sync-km-vehicle"
echo "VehicleID: $VEHICLE_ID"
echo "Year: $YEAR, Month: $MONTH"
echo ""

curl -v -X POST \
  'http://localhost/dev/api.vehicles/vehicle/v2.0/drivers/sync-km-vehicle' \
  -H 'Content-Type: application/json' \
  -d "{\"vehicleId\": $VEHICLE_ID, \"year\": $YEAR, \"month\": $MONTH}" \
  2>&1

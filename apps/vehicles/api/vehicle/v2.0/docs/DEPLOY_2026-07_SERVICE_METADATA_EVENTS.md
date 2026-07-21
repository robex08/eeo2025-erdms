# Deploy Guide: Service Metadata + Manual Events (2026-07)

## Goal
This change introduces:
- service metadata snapshot in vehicle detail card
- manual events timeline table for future operational history
- API support for bulk/manual service status with event logging

The deployment is designed as non-destructive. No existing rows are deleted.

## DB changes
Apply in this exact order:
1. db/029_add_manual_location_state_to_vehicle_detail_cards.sql
2. db/030_add_service_context_json_to_vehicle_detail_cards.sql
3. db/031_create_vehicle_manual_events_v2.sql

## Pre-deploy backup (recommended)
Even for DEV, keep lightweight backups:

```bash
mysqldump -u <user> -p <database> vehicles_detail_cards > backup_vehicles_detail_cards_$(date +%F_%H%M).sql
mysqldump -u <user> -p <database> vehicles_cars_list_v2 > backup_vehicles_cars_list_v2_$(date +%F_%H%M).sql
```

## Deploy steps (DEV/PROD)
1. Put API in maintenance-safe window (no long-running sync jobs).
2. Run SQL migrations listed above.
3. Deploy API code from this branch.
4. Deploy frontend-v2 code from this branch.
5. Run smoke checks.

## Smoke checks
1. Vehicle detail read:

```bash
curl -s "<API_BASE>/vehicles/detail?vehicleId=<ID>" -H "Cookie: ..."
```

Expected:
- response includes service_context_json (null or JSON)

2. Vehicle detail save with service metadata:

```bash
curl -s -X POST "<API_BASE>/vehicles/detail" \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{
    "vehicleId": 123,
    "service_notes": "Vymena brzd",
    "service_context_json": {
      "name": "AutoServis Novák",
      "address": "U Dilny 12, Kladno",
      "contact": "+420 777 123 456"
    }
  }'
```

Expected:
- detail saved
- service_context_json persisted

3. Bulk service mark with metadata:

```bash
curl -s -X POST "<API_BASE>/vehicles/bulk/location-state" \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{
    "vehicleIds": [123, 124],
    "locationState": "v_servisu",
    "serviceNote": "Predani do servisu",
    "serviceContext": {
      "name": "AutoServis Novák",
      "address": "U Dilny 12, Kladno",
      "contact": "+420 777 123 456"
    }
  }'
```

Expected:
- manual_location_state updated
- service_context_json updated
- rows inserted into vehicles_manual_events_v2

4. Events endpoint:

```bash
curl -s "<API_BASE>/vehicles/events?vehicleId=123&limit=20" -H "Cookie: ..."
```

Expected:
- items array with event_type=service and event_state

## Production notes
- This release is backward compatible: API checks column/table existence.
- If migrations are delayed, existing endpoints still run, but new fields/events are skipped.
- No data reset is required.

## Rollback strategy
Code rollback is safe.
DB rollback is optional and should be avoided unless required. If necessary:
- keep table vehicles_manual_events_v2 as audit data
- do not drop service_context_json unless strictly necessary

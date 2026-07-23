# Deploy Guide: CCS Overview Sync + List Indicators (2026-07)

## Goal
This release adds CCS card metadata to the vehicles overview flow:
- CCS card pairing during the main WebDispecink vehicle sync
- CCS indicator column in the overview table
- CCS sort (`has_ccs`)
- CCS filter (`ccsStates=has|none`)
- expiration-based row highlighting in the overview

The DB change is additive only.
No existing rows are deleted.

## Exact DB delta
This release requires exactly one DB migration:

1. `db/034_add_ccs_columns_to_vehicles_cars_list_v2.sql`

That migration adds these columns to `vehicles_cars_list_v2`:
- `ccs_card_number VARCHAR(64) NULL`
- `ccs_card_expiration VARCHAR(32) NULL`

No other schema change is required for this release.

## Pre-deploy backup
Recommended before DEV/PROD rollout:

```bash
mysqldump -u <user> -p <database> vehicles_cars_list_v2 > backup_vehicles_cars_list_v2_$(date +%F_%H%M).sql
mysqldump -u <user> -p <database> vehicles_detail_cards > backup_vehicles_detail_cards_$(date +%F_%H%M).sql
```

## Pre-deploy schema verification
Run before migration to confirm current structure:

```sql
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'vehicles_cars_list_v2'
  AND COLUMN_NAME IN ('ccs_card_number', 'ccs_card_expiration')
ORDER BY COLUMN_NAME;
```

Expected before migration:
- either 0 rows
- or already-existing rows with the exact target types below

Expected target structure:
- `ccs_card_number | varchar(64) | YES`
- `ccs_card_expiration | varchar(32) | YES`

## Deploy steps
Apply in this exact order:

1. Put deploy into a maintenance-safe window.
2. Ensure no long-running vehicle sync is currently running.
3. Backup `vehicles_cars_list_v2`.
4. Apply `db/034_add_ccs_columns_to_vehicles_cars_list_v2.sql`.
5. Verify the two columns exist in `vehicles_cars_list_v2` with exact types.
6. Deploy API code from this branch.
7. Deploy `frontend-v2` build from this branch.
8. Trigger vehicle sync (`POST /sync/vehicles` or quick sync from UI).
9. Run smoke checks below.

## Migration
SQL file:

```sql
ALTER TABLE vehicles_cars_list_v2
  ADD COLUMN IF NOT EXISTS ccs_card_number VARCHAR(64) DEFAULT NULL AFTER w_disabled,
  ADD COLUMN IF NOT EXISTS ccs_card_expiration VARCHAR(32) DEFAULT NULL AFTER ccs_card_number;
```

## Post-migration verification
Run immediately after migration:

```sql
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'vehicles_cars_list_v2'
  AND COLUMN_NAME IN ('ccs_card_number', 'ccs_card_expiration')
ORDER BY COLUMN_NAME;
```

Expected:

```text
ccs_card_expiration | varchar(32) | YES
ccs_card_number     | varchar(64) | YES
```

## Data verification after sync
After code deploy and sync:

```sql
SELECT
  COUNT(*) AS total_rows,
  SUM(CASE WHEN ccs_card_number IS NOT NULL AND TRIM(ccs_card_number) <> '' THEN 1 ELSE 0 END) AS with_ccs,
  SUM(CASE WHEN ccs_card_expiration IS NOT NULL AND TRIM(ccs_card_expiration) <> '' THEN 1 ELSE 0 END) AS with_expiration
FROM vehicles_cars_list_v2;
```

Interpretation:
- `with_ccs` should increase after sync if cards are assigned in WebDispecink
- `with_expiration` may remain `0` if the tenant does not expose expiration in SOAP `_getFuelCards`

## Smoke checks

### 1. Vehicles list returns CCS fields

```bash
curl -s "<API_BASE>/vehicles?perPage=5&sortBy=spz&sortDir=asc" -H "Cookie: ..."
```

Expected for each item:
- field `ccs_card_number` present (`string` or `null`)
- field `ccs_card_expiration` present (`string` or `null`)

### 2. CCS sort works

```bash
curl -s "<API_BASE>/vehicles?perPage=20&sortBy=has_ccs&sortDir=desc" -H "Cookie: ..."
```

Expected:
- rows with CCS should appear before rows without CCS

### 3. CCS filter works

```bash
curl -s "<API_BASE>/vehicles?ccsStates=has&perPage=20" -H "Cookie: ..."
curl -s "<API_BASE>/vehicles?ccsStates=none&perPage=20" -H "Cookie: ..."
```

Expected:
- `ccsStates=has` returns only vehicles with non-empty `ccs_card_number`
- `ccsStates=none` returns only vehicles without `ccs_card_number`

### 4. UI overview behavior

Open the overview page and verify:
- CCS column exists before `Akce`
- CCS icon is gray when no expiration date is filled
- CCS icon is green when expiration is more than 3 months away
- CCS icon is red when expiration is 3 months or less away
- row highlight appears only for vehicles with expiration within 3 months
- CCS filter appears in the filter bar
- CCS column header is sortable

## Production notes
- This release is backward compatible at code level only after migration `034` is present.
- Without migration `034`, the CCS overview feature will not persist data into `vehicles_cars_list_v2`.
- The sync is idempotent for CCS values: each sync clears CCS values for synced legacy cars and repopulates current assignments from WebDispecink.
- `ccs_card_expiration` is stored as raw source string from SOAP. UI formats it to Czech date where parseable.

## Rollback strategy
Code rollback is safe.

DB rollback should normally be avoided because the migration is additive only.
If strictly required:
- leave the two columns in place
- roll back code only

Keeping the columns is preferred because it preserves compatibility for the next rollout.
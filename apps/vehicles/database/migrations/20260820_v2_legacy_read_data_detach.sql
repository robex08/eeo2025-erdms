-- DEV-only one-time transfer of legacy read data into V2-owned structures.
-- Legacy tables are read only and are not modified.

ALTER TABLE vehicles_detail_cards
    ADD COLUMN IF NOT EXISTS in_service_from DATE NULL,
    ADD KEY IF NOT EXISTS idx_vehicle_detail_in_service_from (in_service_from);

UPDATE vehicles_detail_cards d
INNER JOIN vehicles_cars_list_v2 v ON v.id = d.vehicle_id
INNER JOIN cars_detail legacy ON legacy.w_carid = v.legacy_carid
SET d.in_service_from = DATE(legacy.w_datod)
WHERE d.in_service_from IS NULL
  AND legacy.w_datod IS NOT NULL;

INSERT INTO vehicles_vehicle_funding_v2 (
    vehicle_id,
    funding_status_code,
    grant_title_code,
    source,
    created_at,
    updated_at,
    metadata_json
)
SELECT
    v.id,
    'awarded',
    NULL,
    'legacy_read_migration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    JSON_OBJECT('legacy_source', 'cars_dotace', 'legacy_dotace', legacy.dotace)
FROM vehicles_cars_list_v2 v
INNER JOIN cars_dotace legacy
    ON UPPER(REPLACE(TRIM(v.spz), ' ', '')) = UPPER(REPLACE(TRIM(legacy.w_spz), ' ', ''))
WHERE LOWER(TRIM(COALESCE(legacy.dotace, ''))) = 'a'
  AND NOT EXISTS (
      SELECT 1
      FROM vehicles_vehicle_funding_v2 f
      WHERE f.vehicle_id = v.id
        AND f.source = 'legacy_read_migration'
  );

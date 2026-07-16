-- Rozsireni detailni karty vozidla o rucne spravovany zzs_typ
-- + jednorazova migrace z puvodni list_cars.zzs_typ pres vazbu legacy_carid

ALTER TABLE vehicles_detail_cards
  ADD COLUMN IF NOT EXISTS zzs_typ VARCHAR(100) DEFAULT NULL AFTER vehicle_id;

INSERT INTO vehicles_detail_cards (vehicle_id, zzs_typ)
SELECT
  v.id AS vehicle_id,
  NULLIF(TRIM(lc.zzs_typ), '') AS zzs_typ
FROM vehicles_cars_list_v2 v
LEFT JOIN list_cars lc ON lc.w_carid = v.legacy_carid
WHERE NULLIF(TRIM(COALESCE(lc.zzs_typ, '')), '') IS NOT NULL
ON DUPLICATE KEY UPDATE
  zzs_typ = VALUES(zzs_typ),
  updated_at = CURRENT_TIMESTAMP;

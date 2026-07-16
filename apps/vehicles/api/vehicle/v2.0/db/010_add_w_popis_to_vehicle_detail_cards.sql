-- Doplnit popis a typ z puvodni databaze do v2 detail karet

ALTER TABLE vehicles_detail_cards
  ADD COLUMN IF NOT EXISTS w_popis VARCHAR(255) DEFAULT NULL AFTER vehicle_id;

INSERT INTO vehicles_detail_cards (vehicle_id, w_popis, zzs_typ)
SELECT
  v.id AS vehicle_id,
  NULLIF(TRIM(cd.w_popis), '') AS w_popis,
  NULLIF(TRIM(lc.zzs_typ), '') AS zzs_typ
FROM vehicles_cars_list_v2 v
LEFT JOIN list_cars lc ON lc.w_carid = v.legacy_carid
LEFT JOIN cars_detail cd ON cd.w_carid = v.legacy_carid
WHERE NULLIF(TRIM(COALESCE(cd.w_popis, '')), '') IS NOT NULL
   OR NULLIF(TRIM(COALESCE(lc.zzs_typ, '')), '') IS NOT NULL
ON DUPLICATE KEY UPDATE
  w_popis = VALUES(w_popis),
  zzs_typ = VALUES(zzs_typ),
  updated_at = CURRENT_TIMESTAMP;
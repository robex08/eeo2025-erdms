-- Kontrolni SQL reporty pro migraci list_cars -> vehicles_cars_list_v2
-- Spoustet po sync endpointu /sync/vehicles

-- 1) Zakladni pocty
SELECT 'legacy_list_cars_count' AS metric, COUNT(*) AS value
FROM list_cars
UNION ALL
SELECT 'v2_cars_list_count' AS metric, COUNT(*) AS value
FROM vehicles_cars_list_v2;

-- 2) Duplicity SPZ ve v2 (melo by byt 0)
SELECT spz, COUNT(*) AS cnt
FROM vehicles_cars_list_v2
GROUP BY spz
HAVING COUNT(*) > 1;

-- 3) Legacy carid bez zaznamu ve v2 (melo by byt 0)
SELECT lc.w_carid, lc.w_spz
FROM list_cars lc
LEFT JOIN vehicles_cars_list_v2 v2 ON v2.legacy_carid = lc.w_carid
WHERE v2.id IS NULL
ORDER BY lc.w_carid
LIMIT 200;

-- 4) V2 zaznamy bez vazby do legacy (melo by byt 0)
SELECT v2.legacy_carid, v2.spz
FROM vehicles_cars_list_v2 v2
LEFT JOIN list_cars lc ON lc.w_carid = v2.legacy_carid
WHERE lc.w_carid IS NULL
ORDER BY v2.legacy_carid
LIMIT 200;

-- 5) Kontrola nulovych hodnot klicovych poli
SELECT
  SUM(CASE WHEN spz IS NULL OR spz = '' THEN 1 ELSE 0 END) AS missing_spz,
  SUM(CASE WHEN status IS NULL OR status = '' THEN 1 ELSE 0 END) AS missing_status,
  SUM(CASE WHEN last_update IS NULL THEN 1 ELSE 0 END) AS missing_last_update
FROM vehicles_cars_list_v2;

-- 6) Vzorky rozdilu SPZ po normalizaci mezer
SELECT
  lc.w_carid,
  lc.w_spz AS legacy_spz,
  v2.spz AS v2_spz
FROM list_cars lc
JOIN vehicles_cars_list_v2 v2 ON v2.legacy_carid = lc.w_carid
WHERE REPLACE(lc.w_spz, ' ', '') <> v2.spz
LIMIT 100;

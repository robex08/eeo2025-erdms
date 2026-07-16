-- WebDispecink metadata columns for v2 vehicles table

ALTER TABLE vehicles_cars_list_v2
  ADD COLUMN IF NOT EXISTS w_tovarni_znacka VARCHAR(120) DEFAULT NULL AFTER status,
  ADD COLUMN IF NOT EXISTS w_model_vozu VARCHAR(120) DEFAULT NULL AFTER w_tovarni_znacka,
  ADD COLUMN IF NOT EXISTS w_typ_phm VARCHAR(80) DEFAULT NULL AFTER w_model_vozu,
  ADD COLUMN IF NOT EXISTS w_cargroupid INT DEFAULT NULL AFTER w_typ_phm,
  ADD COLUMN IF NOT EXISTS w_groupname VARCHAR(120) DEFAULT NULL AFTER w_cargroupid,
  ADD COLUMN IF NOT EXISTS w_online TINYINT DEFAULT NULL AFTER w_groupname,
  ADD COLUMN IF NOT EXISTS w_disabled TINYINT DEFAULT NULL AFTER w_online;

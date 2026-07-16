-- Dedicated v2 WebDispecink cache tables
-- Legacy tables remain intact for legacy app and are no longer primary source for v2.

CREATE TABLE IF NOT EXISTS vehicles_wd_cars_general_v2 (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_carid INT NOT NULL,
  w_tovarni_znacka VARCHAR(120) DEFAULT NULL,
  w_model_vozu VARCHAR(120) DEFAULT NULL,
  w_typ_phm VARCHAR(80) DEFAULT NULL,
  w_stanoviste VARCHAR(120) DEFAULT NULL,
  w_nadrz INT DEFAULT NULL,
  last_sync_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicles_wd_cars_general_v2_legacy_carid (legacy_carid),
  KEY idx_vehicles_wd_cars_general_v2_sync (last_sync_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

CREATE TABLE IF NOT EXISTS vehicles_wd_positions_v2 (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  w_carid BIGINT NOT NULL,
  w_majak VARCHAR(32) NOT NULL,
  w_pt DATETIME NOT NULL,
  w_lp DATETIME NOT NULL,
  w_km FLOAT NOT NULL,
  w_ln VARCHAR(255) NOT NULL,
  w_zs FLOAT NOT NULL,
  w_zd FLOAT NOT NULL,
  dt_aktualizace DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vehicles_wd_positions_v2_carid_id (w_carid, id),
  KEY idx_vehicles_wd_positions_v2_dt (dt_aktualizace),
  KEY idx_vehicles_wd_positions_v2_carid_dt (w_carid, dt_aktualizace)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

CREATE TABLE IF NOT EXISTS vehicles_wd_km_stats_v2 (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  w_carid BIGINT NOT NULL,
  w_datod DATETIME NOT NULL,
  w_datdo DATETIME NOT NULL,
  pocet_mesicu INT NOT NULL,
  stavTach FLOAT NOT NULL,
  km FLOAT NOT NULL,
  dt_aktualizace DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vehicles_wd_km_stats_v2_carid_dt (w_carid, dt_aktualizace),
  KEY idx_vehicles_wd_km_stats_v2_interval_carid_id (pocet_mesicu, w_carid, id),
  KEY idx_vehicles_wd_km_stats_v2_interval_dt (pocet_mesicu, dt_aktualizace)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- One-time backfill from legacy cache to v2 cache (if legacy tables exist)
INSERT INTO vehicles_wd_positions_v2 (w_carid, w_majak, w_pt, w_lp, w_km, w_ln, w_zs, w_zd, dt_aktualizace)
SELECT p.w_carid, p.w_majak, p.w_pt, p.w_lp, p.w_km, p.w_ln, p.w_zs, p.w_zd, p.dt_aktualizace
FROM cars_position p
LEFT JOIN vehicles_wd_positions_v2 v2
  ON v2.w_carid = p.w_carid
 AND v2.w_pt = p.w_pt
 AND v2.w_lp = p.w_lp
 AND v2.dt_aktualizace = p.dt_aktualizace
WHERE v2.id IS NULL;

INSERT INTO vehicles_wd_km_stats_v2 (w_carid, w_datod, w_datdo, pocet_mesicu, stavTach, km, dt_aktualizace)
SELECT k.w_carid, k.w_datod, k.w_datdo, k.pocet_mesicu, k.stavTach, k.km, k.dt_aktualizace
FROM cars_km_mesic k
LEFT JOIN vehicles_wd_km_stats_v2 v2
  ON v2.w_carid = k.w_carid
 AND v2.pocet_mesicu = k.pocet_mesicu
 AND v2.w_datod = k.w_datod
 AND v2.w_datdo = k.w_datdo
WHERE v2.id IS NULL;

INSERT INTO vehicles_wd_cars_general_v2 (legacy_carid, w_tovarni_znacka, w_model_vozu, w_typ_phm, w_stanoviste, w_nadrz, last_sync_at)
SELECT
  v.legacy_carid,
  v.w_tovarni_znacka,
  v.w_model_vozu,
  v.w_typ_phm,
  d.w_stanoviste,
  d.w_nadrz,
  COALESCE(v.last_update, NOW())
FROM vehicles_cars_list_v2 v
LEFT JOIN vehicles_detail_cards d ON d.vehicle_id = v.id
ON DUPLICATE KEY UPDATE
  w_tovarni_znacka = VALUES(w_tovarni_znacka),
  w_model_vozu = VALUES(w_model_vozu),
  w_typ_phm = VALUES(w_typ_phm),
  w_stanoviste = VALUES(w_stanoviste),
  w_nadrz = VALUES(w_nadrz),
  last_sync_at = VALUES(last_sync_at),
  updated_at = CURRENT_TIMESTAMP;

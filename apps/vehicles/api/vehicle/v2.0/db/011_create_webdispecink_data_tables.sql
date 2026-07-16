-- WebDispecink data tables for v2 sync
-- DEV only; mirrors legacy storage used by the v1 application

CREATE TABLE IF NOT EXISTS cars_position (
  id INT(11) NOT NULL AUTO_INCREMENT,
  w_carid BIGINT(20) NOT NULL,
  w_majak VARCHAR(32) NOT NULL,
  w_pt DATETIME NOT NULL,
  w_lp DATETIME NOT NULL,
  w_km FLOAT NOT NULL,
  w_ln VARCHAR(255) NOT NULL,
  w_zs FLOAT NOT NULL,
  w_zd FLOAT NOT NULL,
  dt_aktualizace DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_cars_position_carid_id (w_carid, id),
  KEY idx_cars_position_update (dt_aktualizace)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

CREATE TABLE IF NOT EXISTS cars_km_mesic (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  w_carid BIGINT(20) NOT NULL,
  w_datod DATETIME NOT NULL,
  w_datdo DATETIME NOT NULL,
  pocet_mesicu INT(11) NOT NULL,
  stavTach FLOAT NOT NULL,
  km FLOAT NOT NULL,
  dt_aktualizace DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_cars_km_mesic_carid_dt (w_carid, dt_aktualizace),
  KEY idx_cars_km_mesic_period (w_carid, pocet_mesicu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

CREATE TABLE IF NOT EXISTS cars_mt (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  spz VARCHAR(16) NOT NULL,
  skupina VARCHAR(120) DEFAULT NULL,
  znak VARCHAR(120) DEFAULT NULL,
  app_vyjezd_1 VARCHAR(255) DEFAULT NULL,
  cela_adresa VARCHAR(255) DEFAULT NULL,
  inv_cis_sestra VARCHAR(64) DEFAULT NULL,
  `sestra_IMEI` VARCHAR(64) DEFAULT NULL,
  `sestra SIM` VARCHAR(64) DEFAULT NULL,
  inv_cis_ridic VARCHAR(64) DEFAULT NULL,
  ridic_IMEI VARCHAR(64) DEFAULT NULL,
  ridic_SIM VARCHAR(64) DEFAULT NULL,
  app_vyjezd_2 VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_cars_mt_spz (spz)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

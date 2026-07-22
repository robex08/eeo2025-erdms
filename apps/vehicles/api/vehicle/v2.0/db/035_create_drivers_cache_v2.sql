-- Cache řidičů načtených z WebDispečinku pro modul v2.

CREATE TABLE IF NOT EXISTS vehicles_wd_drivers_v2 (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_driverid INT NOT NULL,
  driver_name VARCHAR(190) DEFAULT NULL,
  personal_number VARCHAR(64) DEFAULT NULL,
  phone VARCHAR(64) DEFAULT NULL,
  email VARCHAR(190) DEFAULT NULL,
  legacy_carid INT DEFAULT NULL,
  vehicle_identifier VARCHAR(128) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  raw_json MEDIUMTEXT DEFAULT NULL,
  last_sync_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicles_wd_drivers_v2_legacy_driverid (legacy_driverid),
  KEY idx_vehicles_wd_drivers_v2_active_name (is_active, driver_name),
  KEY idx_vehicles_wd_drivers_v2_legacy_carid (legacy_carid),
  KEY idx_vehicles_wd_drivers_v2_sync (last_sync_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

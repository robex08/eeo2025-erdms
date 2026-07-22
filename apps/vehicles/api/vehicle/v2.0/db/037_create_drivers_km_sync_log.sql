-- Migration: Sync log per (vehicle, month) for drivers km sync.
-- Tracks that a sync attempt was performed regardless of whether
-- WebDispečink returned any data. Used to detect that a month has
-- already been synced so the UI can offer a force-resync prompt.
-- Date: 2026-07-22

CREATE TABLE IF NOT EXISTS vehicles_drivers_km_sync_log_v2 (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL COMMENT 'FK -> vehicles_cars_list_v2.id',
  legacy_carid INT NOT NULL COMMENT 'WebDispečink carId',
  km_month VARCHAR(7) NOT NULL COMMENT 'YYYY-MM',
  synced_at DATETIME NOT NULL,
  drivers_updated INT NOT NULL DEFAULT 0,
  had_data TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = WebDispečink vrátil data',
  note VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_drivers_km_sync_log_vehicle_month (vehicle_id, km_month),
  KEY idx_drivers_km_sync_log_month (km_month),
  KEY idx_drivers_km_sync_log_carid (legacy_carid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Add WebDispecink cars group snapshot table for v2

CREATE TABLE IF NOT EXISTS vehicles_cars_groups_v2 (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_groupid INT NOT NULL,
  groupname VARCHAR(120) NOT NULL,
  numcars INT NOT NULL DEFAULT 0,
  last_update DATETIME NOT NULL,
  migrated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicles_cars_groups_v2_legacy_groupid (legacy_groupid),
  KEY idx_vehicles_cars_groups_v2_groupname (groupname),
  KEY idx_vehicles_cars_groups_v2_last_update (last_update)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
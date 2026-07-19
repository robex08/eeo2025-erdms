-- Adds vehicle assignment support for users.

ALTER TABLE vehicles_users
  ADD COLUMN has_all_vehicles TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active;

CREATE TABLE IF NOT EXISTS vehicles_user_vehicle_assignments (
  user_id INT UNSIGNED NOT NULL,
  vehicle_id INT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, vehicle_id),
  KEY idx_vehicles_user_vehicle_assignments_vehicle (vehicle_id),
  CONSTRAINT fk_vehicles_user_vehicle_assignments_user
    FOREIGN KEY (user_id) REFERENCES vehicles_users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_vehicles_user_vehicle_assignments_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles_cars_list_v2(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Creates manual vehicle events timeline table.
-- Purpose: persist user-entered operational events (service, technical inspection, etc.)
-- with extensible metadata and searchable fields.

CREATE TABLE IF NOT EXISTS vehicles_manual_events_v2 (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT UNSIGNED NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_state VARCHAR(50) DEFAULT NULL,
  is_manual TINYINT(1) NOT NULL DEFAULT 1,
  service_name VARCHAR(160) DEFAULT NULL,
  service_address VARCHAR(255) DEFAULT NULL,
  service_contact VARCHAR(190) DEFAULT NULL,
  note TEXT,
  metadata_json JSON DEFAULT NULL,
  source VARCHAR(40) NOT NULL DEFAULT 'manual',
  created_by_user_id INT UNSIGNED DEFAULT NULL,
  effective_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vehicle_manual_events_vehicle_created (vehicle_id, created_at),
  KEY idx_vehicle_manual_events_type_state (event_type, event_state),
  KEY idx_vehicle_manual_events_service_name (service_name),
  KEY idx_vehicle_manual_events_service_contact (service_contact),
  FULLTEXT KEY ft_vehicle_manual_events_search (service_name, service_address, service_contact, note),
  CONSTRAINT fk_vehicle_manual_events_vehicle
    FOREIGN KEY (vehicle_id)
    REFERENCES vehicles_cars_list_v2 (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

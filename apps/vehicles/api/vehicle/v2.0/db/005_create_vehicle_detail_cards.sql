-- V2 tabulka pro detailní kartu vozidla

CREATE TABLE IF NOT EXISTS vehicles_detail_cards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT UNSIGNED NOT NULL,
  w_popis VARCHAR(255) DEFAULT NULL,
  zzs_typ VARCHAR(100) DEFAULT NULL,
  service_notes TEXT,
  equipment_json JSON DEFAULT NULL,
  technical_notes TEXT,
  insurance_policy VARCHAR(120) DEFAULT NULL,
  stk_valid_to DATE DEFAULT NULL,
  emission_valid_to DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vehicles_detail_cards_vehicle (vehicle_id),
  KEY idx_vehicles_detail_cards_stk (stk_valid_to),
  CONSTRAINT fk_vehicles_detail_cards_vehicle
    FOREIGN KEY (vehicle_id)
    REFERENCES vehicles_cars_list_v2 (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

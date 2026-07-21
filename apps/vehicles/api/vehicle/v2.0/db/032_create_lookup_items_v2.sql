-- Central lookup table for v2 forms and dropdowns.
-- Enables replacing hardcoded select options by DB-managed dictionaries.

CREATE TABLE IF NOT EXISTS vehicles_lookups_v2 (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(80) NOT NULL,
  code VARCHAR(80) NOT NULL,
  item_name VARCHAR(190) NOT NULL,
  item_description VARCHAR(500) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_vehicles_lookups_category_code (category, code),
  KEY idx_vehicles_lookups_category_active_sort (category, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

INSERT INTO vehicles_lookups_v2 (category, code, item_name, item_description, sort_order, is_active)
VALUES
  ('service_cancel_reason', 'service_finished', 'Servis byl dokončen', 'Servisní zásah byl ukončen standardně.', 10, 1),
  ('service_cancel_reason', 'auto_false_positive', 'Chybné automatické označení', 'Vozidlo bylo automaticky označeno do servisu omylem.', 20, 1),
  ('vehicle_status_reason', 'technicka_zavada', 'Technická závada', 'Vozidlo je mimo provoz z důvodu technické závady.', 10, 1),
  ('vehicle_status_reason', 'planovana_odstavka', 'Plánovaná odstávka', 'Vozidlo je dočasně odstaveno plánovaně.', 20, 1),
  ('vehicle_status_reason', 'administrativni_blokace', 'Administrativní blokace', 'Dočasná neaktivace z administrativních důvodů.', 30, 1),
  ('vehicle_status_reason', 'k_vyrazeni', 'K vyřazení', 'Vozidlo je určeno k budoucímu vyřazení.', 40, 1),
  ('vehicle_status_reason', 'jine', 'Jiný důvod', 'Obecný nebo individuální důvod změny stavu.', 90, 1)
ON DUPLICATE KEY UPDATE
  item_name = VALUES(item_name),
  item_description = VALUES(item_description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- DEV-only V2 vehicle equipment and devices.
-- Equipment types/statuses reference vehicles_lookups_v2 by category + code.

CREATE TABLE IF NOT EXISTS vehicles_vehicle_equipment_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id INT UNSIGNED NOT NULL,
    equipment_type_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    status_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'active',
    equipment_name VARCHAR(190) NULL,
    manufacturer VARCHAR(190) NULL,
    model VARCHAR(190) NULL,
    serial_number VARCHAR(128) NULL,
    inventory_number VARCHAR(128) NULL,
    supplier_name VARCHAR(190) NULL,
    acquired_at DATE NULL,
    warranty_valid_to DATE NULL,
    revision_valid_to DATE NULL,
    cost_amount DECIMAL(14,2) NULL,
    cost_currency CHAR(3) CHARACTER SET ascii NOT NULL DEFAULT 'CZK',
    note TEXT NULL,
    source VARCHAR(64) NOT NULL DEFAULT 'v2',
    created_by_user_id INT UNSIGNED NULL,
    updated_by_user_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    metadata_json LONGTEXT NULL,
    PRIMARY KEY (id),
    KEY idx_vehicle_active (vehicle_id, deleted_at, equipment_type_code),
    KEY idx_equipment_type (equipment_type_code, status_code),
    KEY idx_serial_number (serial_number),
    KEY idx_inventory_number (inventory_number),
    KEY idx_revision_valid_to (revision_valid_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

INSERT INTO vehicles_lookups_v2 (category, code, item_name, sort_order, is_active)
VALUES
    ('equipment_type', 'lekarnicka', 'Lékárnička', 10, 1),
    ('equipment_type', 'zdravotnicka_vybava', 'Zdravotnická výbava', 20, 1),
    ('equipment_type', 'defibrilator', 'Defibrilátor', 30, 1),
    ('equipment_type', 'ventilator', 'Ventilátor', 40, 1),
    ('equipment_type', 'odsavacka', 'Odsávačka', 50, 1),
    ('equipment_type', 'monitor', 'Monitor', 60, 1),
    ('equipment_type', 'radiostanice', 'Radiostanice', 70, 1),
    ('equipment_type', 'tablet', 'Tablet', 80, 1),
    ('equipment_type', 'gps', 'GPS', 90, 1),
    ('equipment_type', 'kamera', 'Kamera', 100, 1),
    ('equipment_type', 'majaky', 'Majáky', 110, 1),
    ('equipment_type', 'baterie', 'Baterie', 120, 1),
    ('equipment_status', 'active', 'Aktivní', 10, 1),
    ('equipment_status', 'service', 'V servisu', 20, 1),
    ('equipment_status', 'retired', 'Vyřazené', 30, 1)
ON DUPLICATE KEY UPDATE
    item_name = VALUES(item_name),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;
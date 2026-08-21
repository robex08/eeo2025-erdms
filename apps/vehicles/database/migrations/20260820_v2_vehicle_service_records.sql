-- DEV-only V2 vehicle service records.
-- Codes reference vehicles_lookups_v2 by category + code, never by lookup id.

CREATE TABLE IF NOT EXISTS vehicles_service_records_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id INT UNSIGNED NOT NULL,
    service_type_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    service_kind_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    status_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'planned',
    service_station_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    supplier_name VARCHAR(190) NULL,
    service_date DATE NULL,
    planned_date DATE NULL,
    completed_date DATE NULL,
    description TEXT NULL,
    parts_description TEXT NULL,
    cost_amount DECIMAL(14,2) NULL,
    cost_currency CHAR(3) CHARACTER SET ascii NOT NULL DEFAULT 'CZK',
    source VARCHAR(64) NOT NULL DEFAULT 'v2',
    external_reference VARCHAR(128) NULL,
    created_by_user_id INT UNSIGNED NULL,
    updated_by_user_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    metadata_json LONGTEXT NULL,
    PRIMARY KEY (id),
    KEY idx_vehicle_date (vehicle_id, service_date, id),
    KEY idx_vehicle_status (vehicle_id, status_code, deleted_at),
    KEY idx_service_type (service_type_code, service_kind_code),
    KEY idx_supplier (supplier_name),
    KEY idx_external_reference (external_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
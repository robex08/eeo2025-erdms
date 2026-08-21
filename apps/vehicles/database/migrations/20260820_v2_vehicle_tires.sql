-- DEV-only V2 vehicle tire sets.
-- Season and status use vehicles_lookups_v2 category + code.

CREATE TABLE IF NOT EXISTS vehicles_vehicle_tires_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id INT UNSIGNED NOT NULL,
    season_code VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    status_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'active',
    tire_set_name VARCHAR(190) NULL,
    dimension VARCHAR(64) NULL,
    quantity SMALLINT UNSIGNED NOT NULL DEFAULT 4,
    tread_depth_mm DECIMAL(5,2) NULL,
    acquired_at DATE NULL,
    installed_at DATE NULL,
    removed_at DATE NULL,
    supplier_name VARCHAR(190) NULL,
    storage_location VARCHAR(190) NULL,
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
    KEY idx_vehicle_active (vehicle_id, deleted_at, season_code),
    KEY idx_season_status (season_code, status_code),
    KEY idx_installed_at (installed_at),
    KEY idx_storage_location (storage_location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

INSERT INTO vehicles_lookups_v2 (category, code, item_name, sort_order, is_active)
VALUES
    ('tire_season', 'summer', 'Letní', 10, 1),
    ('tire_season', 'winter', 'Zimní', 20, 1),
    ('tire_season', 'all_season', 'Celoroční', 30, 1),
    ('tire_status', 'active', 'Aktivní', 10, 1),
    ('tire_status', 'stored', 'Uskladněné', 20, 1),
    ('tire_status', 'retired', 'Vyřazené', 30, 1)
ON DUPLICATE KEY UPDATE
    item_name = VALUES(item_name),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;
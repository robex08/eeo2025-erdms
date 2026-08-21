-- DEV-only V2 lookup catalog.
-- Application references use category + code; id is not a business reference.

CREATE TABLE IF NOT EXISTS vehicles_lookups_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category VARCHAR(64) NOT NULL,
    code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    item_name VARCHAR(190) NOT NULL,
    item_description VARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    metadata_json LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vehicles_lookups_v2_category_code (category, code),
    KEY idx_vehicles_lookups_v2_category_active (category, is_active, sort_order),
    KEY idx_vehicles_lookups_v2_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

INSERT INTO vehicles_lookups_v2 (category, code, item_name, sort_order, is_active)
VALUES
    ('service_cancel_reason', 'service_finished', 'Servis byl dokončen', 10, 1),
    ('service_cancel_reason', 'auto_false_positive', 'Chybné automatické označení', 20, 1),
    ('vehicle_status_reason', 'technicka_zavada', 'Technická závada', 10, 1),
    ('vehicle_status_reason', 'planovana_odstavka', 'Plánovaná odstávka', 20, 1),
    ('vehicle_status_reason', 'administrativni_blokace', 'Administrativní blokace', 30, 1),
    ('vehicle_status_reason', 'k_vyrazeni', 'K vyřazení', 40, 1),
    ('vehicle_status_reason', 'jine', 'Jiný důvod', 50, 1),
    ('service_type', 'external', 'Externí servis', 10, 1),
    ('service_type', 'internal', 'Vlastní autodílna', 20, 1),
    ('service_status', 'planned', 'Plánováno', 10, 1),
    ('service_status', 'in_progress', 'Probíhá', 20, 1),
    ('service_status', 'completed', 'Dokončeno', 30, 1),
    ('service_status', 'cancelled', 'Zrušeno', 40, 1),
    ('service_kind', 'repair', 'Oprava', 10, 1),
    ('service_kind', 'maintenance', 'Údržba', 20, 1),
    ('service_kind', 'inspection', 'Kontrola', 30, 1)
ON DUPLICATE KEY UPDATE
    item_name = VALUES(item_name),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;
-- DEV-only V2 vehicle grants and funding records.
-- Grant identifiers use stable codes; files remain in vehicles_card_attachments_v2.

CREATE TABLE IF NOT EXISTS vehicles_vehicle_funding_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id INT UNSIGNED NOT NULL,
    funding_status_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'none',
    grant_title_code VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    call_code VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    provider_name VARCHAR(190) NULL,
    reference_number VARCHAR(128) NULL,
    award_date DATE NULL,
    eligible_amount DECIMAL(14,2) NULL,
    grant_amount DECIMAL(14,2) NULL,
    own_share_amount DECIMAL(14,2) NULL,
    amount_currency CHAR(3) CHARACTER SET ascii NOT NULL DEFAULT 'CZK',
    sustainability_from DATE NULL,
    sustainability_to DATE NULL,
    note TEXT NULL,
    source VARCHAR(64) NOT NULL DEFAULT 'v2',
    created_by_user_id INT UNSIGNED NULL,
    updated_by_user_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    metadata_json LONGTEXT NULL,
    PRIMARY KEY (id),
    KEY idx_vehicle_active (vehicle_id, deleted_at, sustainability_to),
    KEY idx_funding_status (funding_status_code, sustainability_to),
    KEY idx_grant_title (grant_title_code),
    KEY idx_call_code (call_code),
    KEY idx_reference_number (reference_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

INSERT INTO vehicles_lookups_v2 (category, code, item_name, sort_order, is_active)
VALUES
    ('funding_status', 'none', 'Bez dotace', 10, 1),
    ('funding_status', 'applied', 'Podaná žádost', 20, 1),
    ('funding_status', 'awarded', 'Dotace přiznána', 30, 1),
    ('funding_status', 'sustainability', 'V době udržitelnosti', 40, 1),
    ('funding_status', 'closed', 'Uzavřeno', 50, 1)
ON DUPLICATE KEY UPDATE
    item_name = VALUES(item_name),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;
-- DEV-only V2 insurance policies and claims.
-- Policy/claim types and statuses use vehicles_lookups_v2 category + code.

CREATE TABLE IF NOT EXISTS vehicles_insurance_policies_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id INT UNSIGNED NOT NULL,
    policy_type_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    policy_number VARCHAR(128) NULL,
    insurer_name VARCHAR(190) NULL,
    valid_from DATE NULL,
    valid_to DATE NULL,
    premium_amount DECIMAL(14,2) NULL,
    premium_currency CHAR(3) CHARACTER SET ascii NOT NULL DEFAULT 'CZK',
    deductible_amount DECIMAL(14,2) NULL,
    deductible_currency CHAR(3) CHARACTER SET ascii NOT NULL DEFAULT 'CZK',
    note TEXT NULL,
    source VARCHAR(64) NOT NULL DEFAULT 'v2',
    created_by_user_id INT UNSIGNED NULL,
    updated_by_user_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    metadata_json LONGTEXT NULL,
    PRIMARY KEY (id),
    KEY idx_vehicle_active (vehicle_id, deleted_at, valid_to),
    KEY idx_policy_number (policy_number),
    KEY idx_policy_type (policy_type_code, valid_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

CREATE TABLE IF NOT EXISTS vehicles_claims_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id INT UNSIGNED NOT NULL,
    insurance_policy_id BIGINT UNSIGNED NULL,
    claim_status_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'open',
    claim_date DATE NULL,
    settled_date DATE NULL,
    title VARCHAR(190) NULL,
    description TEXT NULL,
    payout_amount DECIMAL(14,2) NULL,
    payout_currency CHAR(3) CHARACTER SET ascii NOT NULL DEFAULT 'CZK',
    deductible_amount DECIMAL(14,2) NULL,
    deductible_currency CHAR(3) CHARACTER SET ascii NOT NULL DEFAULT 'CZK',
    source VARCHAR(64) NOT NULL DEFAULT 'v2',
    external_reference VARCHAR(128) NULL,
    created_by_user_id INT UNSIGNED NULL,
    updated_by_user_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    metadata_json LONGTEXT NULL,
    PRIMARY KEY (id),
    KEY idx_vehicle_active (vehicle_id, deleted_at, claim_date),
    KEY idx_claim_status (claim_status_code, claim_date),
    KEY idx_policy (insurance_policy_id),
    KEY idx_external_reference (external_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

INSERT INTO vehicles_lookups_v2 (category, code, item_name, sort_order, is_active)
VALUES
    ('insurance_policy_type', 'mandatory_liability', 'Povinné ručení', 10, 1),
    ('insurance_policy_type', 'collision', 'Havarijní pojištění', 20, 1),
    ('insurance_policy_type', 'other', 'Jiné pojištění', 30, 1),
    ('claim_status', 'open', 'Otevřená', 10, 1),
    ('claim_status', 'in_liquidation', 'V likvidaci', 20, 1),
    ('claim_status', 'settled', 'Uzavřená', 30, 1),
    ('claim_status', 'rejected', 'Zamítnutá', 40, 1)
ON DUPLICATE KEY UPDATE
    item_name = VALUES(item_name),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;
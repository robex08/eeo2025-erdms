-- DEV-only foundation for the V2 vehicle card history.
-- Apply after confirming the DEV schema and vehicle_id data type.

CREATE TABLE IF NOT EXISTS vehicles_card_audit_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id INT UNSIGNED NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    field_name VARCHAR(128) NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    old_value_json LONGTEXT NULL,
    new_value_json LONGTEXT NULL,
    old_spz VARCHAR(64) NULL,
    new_spz VARCHAR(64) NULL,
    old_legacy_carid BIGINT NULL,
    new_legacy_carid BIGINT NULL,
    actor_user_id INT NULL,
    actor_type VARCHAR(32) NOT NULL DEFAULT 'system',
    source VARCHAR(64) NOT NULL DEFAULT 'v2',
    sync_job_id BIGINT NULL,
    correlation_id VARCHAR(128) NULL,
    occurred_at DATETIME NOT NULL,
    metadata_json LONGTEXT NULL,
    PRIMARY KEY (id),
    KEY idx_vehicle_occurred (vehicle_id, occurred_at, id),
    KEY idx_vehicle_field (vehicle_id, field_name, occurred_at),
    KEY idx_event_type (event_type, occurred_at),
    KEY idx_actor (actor_user_id, occurred_at),
    KEY idx_sync_job (sync_job_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles_identity_aliases_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id INT UNSIGNED NOT NULL,
    identity_type VARCHAR(32) NOT NULL,
    identity_value VARCHAR(128) NOT NULL,
    identity_value_normalized VARCHAR(128) NOT NULL,
    valid_from DATETIME NOT NULL,
    valid_to DATETIME NULL,
    is_current TINYINT(1) NOT NULL DEFAULT 0,
    source VARCHAR(64) NOT NULL DEFAULT 'v2',
    created_by_user_id INT NULL,
    created_at DATETIME NOT NULL,
    metadata_json LONGTEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vehicle_identity_period (vehicle_id, identity_type, identity_value_normalized, valid_from),
    KEY idx_identity_lookup (identity_type, identity_value_normalized, valid_to),
    KEY idx_vehicle_identity (vehicle_id, identity_type, is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO vehicles_identity_aliases_v2 (
    vehicle_id,
    identity_type,
    identity_value,
    identity_value_normalized,
    valid_from,
    is_current,
    source,
    created_at
)
SELECT
    v.id,
    'spz',
    v.spz,
    UPPER(REPLACE(TRIM(v.spz), ' ', '')),
    COALESCE(v.last_update, v.migrated_at, CURRENT_TIMESTAMP),
    1,
    'v2_baseline',
    CURRENT_TIMESTAMP
FROM vehicles_cars_list_v2 v
WHERE NULLIF(TRIM(v.spz), '') IS NOT NULL;
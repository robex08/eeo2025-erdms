-- DEV-only V2 vehicle-card attachment metadata.
-- Binary content is stored outside the database; storage_key is opaque.

CREATE TABLE IF NOT EXISTS vehicles_card_attachments_v2 (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_id INT UNSIGNED NOT NULL,
    document_type_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    mime_type VARCHAR(127) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    sha256 CHAR(64) CHARACTER SET ascii NOT NULL,
    note VARCHAR(1000) NULL,
    valid_from DATE NULL,
    valid_to DATE NULL,
    uploaded_by_user_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    deleted_by_user_id INT UNSIGNED NULL,
    metadata_json LONGTEXT NULL,
    PRIMARY KEY (id),
    KEY idx_vehicle_active (vehicle_id, deleted_at, created_at),
    KEY idx_vehicle_document_type (vehicle_id, document_type_code, deleted_at),
    KEY idx_validity (document_type_code, valid_to),
    UNIQUE KEY uq_storage_key (storage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;
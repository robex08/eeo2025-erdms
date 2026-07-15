-- Burza Sluzby: univerzalni ciselniky (katalogy) pro ruzne ucely.
-- Spustit v databazi: burza-sluzby-dev

CREATE TABLE IF NOT EXISTS burza_sluzby_catalog (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category VARCHAR(80) NOT NULL,
    item_key VARCHAR(120) NOT NULL,
    item_value VARCHAR(255) NOT NULL,
    description TEXT NULL,
    role_scope ENUM('employee', 'doctor', 'head_doctor', 'paramedic', 'approver', 'admin', '*') NOT NULL DEFAULT '*',
    purpose VARCHAR(80) NULL,
    sort_order INT NOT NULL DEFAULT 100,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    metadata JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_burza_catalog_unique (category, item_key, role_scope),
    KEY idx_burza_catalog_lookup (category, role_scope, is_active, sort_order),
    KEY idx_burza_catalog_purpose (category, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

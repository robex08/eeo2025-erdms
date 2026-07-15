-- Burza Sluzby: aplikacni nastaveni spravovane administratorem.
-- Spustit po 010_add_user_titles.sql

CREATE TABLE IF NOT EXISTS burza_sluzby_app_settings (
    setting_key VARCHAR(120) NOT NULL,
    setting_value TEXT NULL,
    value_type ENUM('string', 'int', 'json', 'bool') NOT NULL DEFAULT 'string',
    description VARCHAR(255) NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key),
    KEY idx_burza_app_settings_updated_by (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO burza_sluzby_app_settings
    (setting_key, setting_value, value_type, description, updated_by, created_at, updated_at)
VALUES
    ('max_candidates_per_day', '4', 'int', 'Maximalni pocet zajemcu na jeden den.', NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    setting_value = VALUES(setting_value),
    value_type = VALUES(value_type),
    description = VALUES(description),
    updated_at = NOW();

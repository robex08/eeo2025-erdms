-- Burza Sluzby: rozsireni users o lokalni login nastaveni a schvalovani pristupu.
-- Spustit v databazi: burza-sluzby-dev

ALTER TABLE burza_sluzby_users
    ADD COLUMN IF NOT EXISTS local_login_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER local_settings,
    ADD COLUMN IF NOT EXISTS local_login_username VARCHAR(128) DEFAULT NULL AFTER local_login_enabled;

SET @idx_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'burza_sluzby_users'
      AND index_name = 'uq_burza_users_local_login_username'
);

SET @sql_add_idx := IF(
    @idx_exists = 0,
    'ALTER TABLE burza_sluzby_users ADD UNIQUE KEY uq_burza_users_local_login_username (local_login_username)',
    'SELECT 1'
);
PREPARE stmt_add_idx FROM @sql_add_idx;
EXECUTE stmt_add_idx;
DEALLOCATE PREPARE stmt_add_idx;

-- Stavajici lokalni DEV admin ucet povolime pro local login.
UPDATE burza_sluzby_users
SET local_login_enabled = 1,
    local_login_username = COALESCE(NULLIF(local_login_username, ''), username),
    updated_at = NOW()
WHERE entra_id LIKE 'local:%';

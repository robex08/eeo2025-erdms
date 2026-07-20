-- Fix legacy Czech column name `telefon` -> `phone`.
-- Safe for environments where either/both columns may already exist.

SET @has_telefon := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vehicles_users'
    AND COLUMN_NAME = 'telefon'
);

SET @has_phone := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vehicles_users'
    AND COLUMN_NAME = 'phone'
);

SET @sql_add_phone := IF(
  @has_phone = 0,
  'ALTER TABLE vehicles_users ADD COLUMN phone VARCHAR(40) DEFAULT NULL AFTER email',
  'SELECT 1'
);
PREPARE stmt_add_phone FROM @sql_add_phone;
EXECUTE stmt_add_phone;
DEALLOCATE PREPARE stmt_add_phone;

SET @has_telefon_after_add := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'vehicles_users'
    AND COLUMN_NAME = 'telefon'
);

SET @sql_copy := IF(
  @has_telefon_after_add = 1,
  'UPDATE vehicles_users SET phone = COALESCE(NULLIF(TRIM(phone), ""), telefon) WHERE telefon IS NOT NULL',
  'SELECT 1'
);
PREPARE stmt_copy FROM @sql_copy;
EXECUTE stmt_copy;
DEALLOCATE PREPARE stmt_copy;

SET @sql_drop_telefon := IF(
  @has_telefon_after_add = 1,
  'ALTER TABLE vehicles_users DROP COLUMN telefon',
  'SELECT 1'
);
PREPARE stmt_drop_telefon FROM @sql_drop_telefon;
EXECUTE stmt_drop_telefon;
DEALLOCATE PREPARE stmt_drop_telefon;

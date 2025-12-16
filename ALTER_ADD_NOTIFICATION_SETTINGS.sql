-- ================================================
-- MIGRACE: Přidání notification_settings do 25_users
-- Datum: 16. prosince 2025
-- Účel: Uživatelské preference pro notifikace
-- ================================================

-- Kontrola, zda sloupec již existuje (pro bezpečné opakované spuštění)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25_users'
  AND COLUMN_NAME = 'notification_settings';

-- Přidat sloupec pouze pokud neexistuje
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE 25_users 
     ADD COLUMN notification_settings TEXT DEFAULT NULL 
     COMMENT "JSON: Uživatelské preference pro notifikace"',
    'SELECT "Column notification_settings already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ================================================
-- VÝCHOZÍ HODNOTY PRO EXISTUJÍCÍ UŽIVATELE
-- ================================================

UPDATE 25_users 
SET notification_settings = JSON_OBJECT(
    'enabled', true,
    'email_enabled', true,
    'inapp_enabled', true,
    'categories', JSON_OBJECT(
        'orders', true,
        'invoices', true,
        'contracts', true,
        'cashbook', true
    )
)
WHERE notification_settings IS NULL
  AND active = 1;

-- ================================================
-- GLOBAL SETTINGS PRO SYSTÉMOVOU ÚROVEŇ
-- ================================================

-- Kontrola, zda global settings existují
INSERT IGNORE INTO 25_global_settings (setting_key, setting_value, description, created_at)
VALUES 
    ('notification_system_enabled', '1', 'Globální zapnutí/vypnutí notifikačního systému', NOW()),
    ('notification_email_enabled', '1', 'Globální zapnutí/vypnutí email notifikací', NOW()),
    ('notification_inapp_enabled', '1', 'Globální zapnutí/vypnutí in-app notifikací', NOW());

-- ================================================
-- VERIFIKACE
-- ================================================

SELECT 
    'notification_settings column' AS item,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS ✓' ELSE 'MISSING ✗' END AS status
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25_users'
  AND COLUMN_NAME = 'notification_settings'

UNION ALL

SELECT 
    'Users with preferences set' AS item,
    CONCAT(COUNT(*), ' users') AS status
FROM 25_users 
WHERE notification_settings IS NOT NULL
  AND active = 1

UNION ALL

SELECT 
    'Global settings' AS item,
    CONCAT(COUNT(*), ' settings') AS status
FROM 25_global_settings
WHERE setting_key LIKE 'notification_%';

-- ================================================
-- HOTOVO
-- ================================================
-- Tento SQL skript přidal:
-- 1. Sloupec notification_settings do 25_users (TEXT, JSON)
-- 2. Výchozí hodnoty pro všechny aktivní uživatele
-- 3. Global settings pro systémovou úroveň kontroly
-- ================================================

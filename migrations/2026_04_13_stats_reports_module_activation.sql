-- ============================================================================
-- MIGRACE: Aktivace modulu "Statistika a reporty" v globálních nastaveních
-- Datum: 13. dubna 2026
-- Popis: Zajištění, že modul Stats & Reporty je aktivní v globálních nastaveních
-- ============================================================================

USE `eeo2025`;

-- Ověřit existenci tabulky app_global_settings
-- (tabulka by měla už existovat)

-- Vložit nebo aktualizovat nastavení pro modul Stats & Reporty
INSERT INTO `25_app_global_settings` (`setting_key`, `setting_value`, `description`)
VALUES ('module_stats_reports_visible', '1', 'Viditelnost modulu Statistika a reporty v menu')
ON DUPLICATE KEY UPDATE 
    `setting_value` = '1',
    `description` = 'Viditelnost modulu Statistika a reporty v menu';

-- Ověření
SELECT 
    `setting_key` AS 'Klíč nastavení',
    `setting_value` AS 'Hodnota',
    `description` AS 'Popis'
FROM `25_app_global_settings`
WHERE `setting_key` = 'module_stats_reports_visible';

-- ============================================================================
-- POZNÁMKY:
-- ============================================================================
-- 
-- 1. Toto nastavení již má defaultní hodnotu '1' v kódu (globalSettingsHandlers.php)
-- 
-- 2. Modul je viditelný pouze pro uživatele s příslušnými právy:
--    - FIN_CONTROL_VIEW/EDIT/MANAGE
--    - EDUCATION_VIEW/EDIT/MANAGE
--    - ATTACHMENTS_VIEW/MANAGE
--    - PIVOT_VIEW/EDIT/MANAGE
--    - REPORT_VIEW/EDIT/MANAGE
--    - STATISTICS_VIEW/EDIT/MANAGE
--    - SPENDING_VIEW_ALL/VIEW_OWN/MANAGE
--    - CASHBOOK_REPORTS_VIEW/MANAGE/EXPORT
--    - DOHADNE_VIEW/EDIT/MANAGE
-- 
-- 3. Menu se zobrazuje v dropdown "Manažerské analýzy"
-- 
-- ============================================================================

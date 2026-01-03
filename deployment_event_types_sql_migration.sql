-- ═══════════════════════════════════════════════════════════════════
-- EVENT TYPES NAMING REFACTOR - SQL MIGRACE
-- ═══════════════════════════════════════════════════════════════════
-- Datum: 2026-01-03
-- Účel: Sjednocení event types na UPPERCASE_WITH_UNDERSCORE
-- Bezpečnost: Vytváří backup před migrací
-- ═══════════════════════════════════════════════════════════════════

USE eeo2025_dev;

-- ═══════════════════════════════════════════════════════════════════
-- 1. BACKUP TABULEK
-- ═══════════════════════════════════════════════════════════════════

-- Backup 25_notification_templates
CREATE TABLE IF NOT EXISTS 25_notification_templates_backup_event_types_20260103
SELECT * FROM 25_notification_templates;

-- Backup 25_notifikace
CREATE TABLE IF NOT EXISTS 25_notifikace_backup_event_types_20260103
SELECT * FROM 25_notifikace;

-- Backup 25_notifikace_hierarchie_profily
CREATE TABLE IF NOT EXISTS 25_notifikace_hierarchie_profily_backup_event_types_20260103
SELECT * FROM 25_notifikace_hierarchie_profily;

SELECT 
    '✅ Backupy vytvořeny' AS status,
    (SELECT COUNT(*) FROM 25_notification_templates_backup_event_types_20260103) AS templates_backup,
    (SELECT COUNT(*) FROM 25_notifikace_backup_event_types_20260103) AS notifikace_backup,
    (SELECT COUNT(*) FROM 25_notifikace_hierarchie_profily_backup_event_types_20260103) AS hierarchie_backup;

-- ═══════════════════════════════════════════════════════════════════
-- 2. MIGRACE: 25_notification_templates.type
-- ═══════════════════════════════════════════════════════════════════

-- OBJEDNÁVKY
UPDATE 25_notification_templates SET type = 'ORDER_CREATED' WHERE type = 'order_status_nova';
UPDATE 25_notification_templates SET type = 'ORDER_DRAFT' WHERE type = 'order_status_rozpracovana';
UPDATE 25_notification_templates SET type = 'ORDER_PENDING_APPROVAL' WHERE type = 'order_status_ke_schvaleni';
UPDATE 25_notification_templates SET type = 'ORDER_APPROVED' WHERE type = 'order_status_schvalena';
UPDATE 25_notification_templates SET type = 'ORDER_REJECTED' WHERE type = 'order_status_zamitnuta';
UPDATE 25_notification_templates SET type = 'ORDER_AWAITING_CHANGES' WHERE type = 'order_status_ceka_se';
UPDATE 25_notification_templates SET type = 'ORDER_SENT_TO_SUPPLIER' WHERE type = 'order_status_odeslana';
UPDATE 25_notification_templates SET type = 'ORDER_AWAITING_CONFIRMATION' WHERE type = 'order_status_ceka_potvrzeni';
UPDATE 25_notification_templates SET type = 'ORDER_CONFIRMED_BY_SUPPLIER' WHERE type = 'order_status_potvrzena';
UPDATE 25_notification_templates SET type = 'ORDER_REGISTRY_PENDING' WHERE type = 'order_status_registr_ceka';
UPDATE 25_notification_templates SET type = 'ORDER_REGISTRY_PUBLISHED' WHERE type = 'order_status_registr_zverejnena';
UPDATE 25_notification_templates SET type = 'ORDER_INVOICE_PENDING' WHERE type = 'order_status_faktura_ceka';
UPDATE 25_notification_templates SET type = 'ORDER_INVOICE_ADDED' WHERE type = 'order_status_faktura_pridana';
UPDATE 25_notification_templates SET type = 'ORDER_INVOICE_APPROVED' WHERE type = 'order_status_faktura_schvalena';
UPDATE 25_notification_templates SET type = 'ORDER_INVOICE_PAID' WHERE type = 'order_status_faktura_uhrazena';
UPDATE 25_notification_templates SET type = 'ORDER_VERIFICATION_PENDING' WHERE type = 'order_status_kontrola_ceka';
UPDATE 25_notification_templates SET type = 'ORDER_VERIFICATION_APPROVED' WHERE type = 'order_status_kontrola_potvrzena';
UPDATE 25_notification_templates SET type = 'ORDER_VERIFICATION_REJECTED' WHERE type = 'order_status_kontrola_zamitnuta';
UPDATE 25_notification_templates SET type = 'ORDER_COMPLETED' WHERE type = 'order_status_dokoncena';

-- TODO ALARMY
UPDATE 25_notification_templates SET type = 'TODO_ALARM_NORMAL' WHERE type = 'alarm_todo_normal';
UPDATE 25_notification_templates SET type = 'TODO_ALARM_URGENT' WHERE type = 'alarm_todo_high';
UPDATE 25_notification_templates SET type = 'TODO_ALARM_EXPIRED' WHERE type = 'alarm_todo_expired';
UPDATE 25_notification_templates SET type = 'TODO_COMPLETED' WHERE type = 'todo_completed';
UPDATE 25_notification_templates SET type = 'TODO_ASSIGNED' WHERE type = 'todo_assigned';

-- SYSTÉM
UPDATE 25_notification_templates SET type = 'SYSTEM_MAINTENANCE_SCHEDULED' WHERE type = 'system_maintenance_scheduled';
UPDATE 25_notification_templates SET type = 'SYSTEM_MAINTENANCE_STARTING' WHERE type = 'system_maintenance_starting';
UPDATE 25_notification_templates SET type = 'SYSTEM_MAINTENANCE_FINISHED' WHERE type = 'system_maintenance_finished';
UPDATE 25_notification_templates SET type = 'SYSTEM_BACKUP_COMPLETED' WHERE type = 'system_backup_completed';
UPDATE 25_notification_templates SET type = 'SYSTEM_UPDATE_AVAILABLE' WHERE type = 'system_update_available';
UPDATE 25_notification_templates SET type = 'SYSTEM_UPDATE_INSTALLED' WHERE type = 'system_update_installed';
UPDATE 25_notification_templates SET type = 'SYSTEM_SECURITY_ALERT' WHERE type = 'system_security_alert';
UPDATE 25_notification_templates SET type = 'SYSTEM_USER_LOGIN_ALERT' WHERE type = 'system_user_login_alert';
UPDATE 25_notification_templates SET type = 'SYSTEM_SESSION_EXPIRED' WHERE type = 'system_session_expired';
UPDATE 25_notification_templates SET type = 'SYSTEM_STORAGE_WARNING' WHERE type = 'system_storage_warning';

-- OSTATNÍ
UPDATE 25_notification_templates SET type = 'USER_MENTIONED' WHERE type = 'user_mention';
UPDATE 25_notification_templates SET type = 'DEADLINE_REMINDER' WHERE type = 'deadline_reminder';
UPDATE 25_notification_templates SET type = 'ORDER_FORCE_UNLOCKED' WHERE type = 'order_unlock_forced';

-- ═══════════════════════════════════════════════════════════════════
-- 3. MIGRACE: 25_notifikace.typ (existující notifikace)
-- ═══════════════════════════════════════════════════════════════════

-- OBJEDNÁVKY
UPDATE 25_notifikace SET typ = 'ORDER_CREATED' WHERE typ = 'order_status_nova';
UPDATE 25_notifikace SET typ = 'ORDER_DRAFT' WHERE typ = 'order_status_rozpracovana';
UPDATE 25_notifikace SET typ = 'ORDER_PENDING_APPROVAL' WHERE typ = 'order_status_ke_schvaleni';
UPDATE 25_notifikace SET typ = 'ORDER_APPROVED' WHERE typ = 'order_status_schvalena';
UPDATE 25_notifikace SET typ = 'ORDER_REJECTED' WHERE typ = 'order_status_zamitnuta';
UPDATE 25_notifikace SET typ = 'ORDER_AWAITING_CHANGES' WHERE typ = 'order_status_ceka_se';
UPDATE 25_notifikace SET typ = 'ORDER_SENT_TO_SUPPLIER' WHERE typ = 'order_status_odeslana';
UPDATE 25_notifikace SET typ = 'ORDER_AWAITING_CONFIRMATION' WHERE typ = 'order_status_ceka_potvrzeni';
UPDATE 25_notifikace SET typ = 'ORDER_CONFIRMED_BY_SUPPLIER' WHERE typ = 'order_status_potvrzena';
UPDATE 25_notifikace SET typ = 'ORDER_REGISTRY_PENDING' WHERE typ = 'order_status_registr_ceka';
UPDATE 25_notifikace SET typ = 'ORDER_REGISTRY_PUBLISHED' WHERE typ = 'order_status_registr_zverejnena';
UPDATE 25_notifikace SET typ = 'ORDER_INVOICE_PENDING' WHERE typ = 'order_status_faktura_ceka';
UPDATE 25_notifikace SET typ = 'ORDER_INVOICE_ADDED' WHERE typ = 'order_status_faktura_pridana';
UPDATE 25_notifikace SET typ = 'ORDER_INVOICE_APPROVED' WHERE typ = 'order_status_faktura_schvalena';
UPDATE 25_notifikace SET typ = 'ORDER_INVOICE_PAID' WHERE typ = 'order_status_faktura_uhrazena';
UPDATE 25_notifikace SET typ = 'ORDER_VERIFICATION_PENDING' WHERE typ = 'order_status_kontrola_ceka';
UPDATE 25_notifikace SET typ = 'ORDER_VERIFICATION_APPROVED' WHERE typ = 'order_status_kontrola_potvrzena';
UPDATE 25_notifikace SET typ = 'ORDER_VERIFICATION_REJECTED' WHERE typ = 'order_status_kontrola_zamitnuta';
UPDATE 25_notifikace SET typ = 'ORDER_COMPLETED' WHERE typ = 'order_status_dokoncena';

-- TODO ALARMY
UPDATE 25_notifikace SET typ = 'TODO_ALARM_NORMAL' WHERE typ = 'alarm_todo_normal';
UPDATE 25_notifikace SET typ = 'TODO_ALARM_URGENT' WHERE typ = 'alarm_todo_high';
UPDATE 25_notifikace SET typ = 'TODO_ALARM_EXPIRED' WHERE typ = 'alarm_todo_expired';
UPDATE 25_notifikace SET typ = 'TODO_COMPLETED' WHERE typ = 'todo_completed';
UPDATE 25_notifikace SET typ = 'TODO_ASSIGNED' WHERE typ = 'todo_assigned';

-- OSTATNÍ
UPDATE 25_notifikace SET typ = 'USER_MENTIONED' WHERE typ = 'user_mention';
UPDATE 25_notifikace SET typ = 'DEADLINE_REMINDER' WHERE typ = 'deadline_reminder';
UPDATE 25_notifikace SET typ = 'ORDER_FORCE_UNLOCKED' WHERE typ = 'order_unlock_forced';

-- ═══════════════════════════════════════════════════════════════════
-- 4. OVĚŘENÍ MIGRACE
-- ═══════════════════════════════════════════════════════════════════

SELECT 
    '✅ Migrace 25_notification_templates' AS tabulka,
    COUNT(*) AS pocet_zaznamu,
    GROUP_CONCAT(DISTINCT type ORDER BY type SEPARATOR ', ') AS priklad_typu
FROM 25_notification_templates
WHERE active = 1
LIMIT 5;

SELECT 
    '✅ Migrace 25_notifikace' AS tabulka,
    COUNT(*) AS pocet_zaznamu,
    GROUP_CONCAT(DISTINCT typ ORDER BY typ SEPARATOR ', ') AS priklad_typu
FROM 25_notifikace
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════
-- 5. POZNÁMKA: 25_notifikace_hierarchie_profily.structure_json
-- ═══════════════════════════════════════════════════════════════════

-- Tuto tabulku migrujeme PHP skriptem (JSON struktura)
-- Viz: deployment_event_types_migrate_hierarchy_json.php

-- ═══════════════════════════════════════════════════════════════════
-- 6. ROLLBACK (POKUD POTŘEBA)
-- ═══════════════════════════════════════════════════════════════════

/*
-- Vrátit 25_notification_templates
TRUNCATE TABLE 25_notification_templates;
INSERT INTO 25_notification_templates SELECT * FROM 25_notification_templates_backup_event_types_20260103;

-- Vrátit 25_notifikace
UPDATE 25_notifikace dest
INNER JOIN 25_notifikace_backup_event_types_20260103 src ON dest.id = src.id
SET dest.typ = src.typ;

-- Vrátit 25_notifikace_hierarchie_profily
UPDATE 25_notifikace_hierarchie_profily dest
INNER JOIN 25_notifikace_hierarchie_profily_backup_event_types_20260103 src ON dest.id = src.id
SET dest.structure_json = src.structure_json;
*/

-- ═══════════════════════════════════════════════════════════════════
-- KONEC MIGRACE SQL
-- ═══════════════════════════════════════════════════════════════════

SELECT '✅ SQL migrace HOTOVÁ - pokračuj PHP skriptem pro JSON' AS status;

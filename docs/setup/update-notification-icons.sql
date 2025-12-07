-- ============================================================================
-- UPDATE: Přidání ikon do email šablon notifikací
-- ============================================================================
-- Přidává ikony do email_subject pro vizuální rozlišení priority:
--   ❗ (vykřičník) pro NORMAL priority - oranžová
--   ⚡ (blesk) pro HIGH/URGENT priority - červená (jako "Mimořádně" na dashboardu)
-- ============================================================================
-- Databáze: eeo2025
-- Tabulka: 25_notification_templates
-- Datum: 7. 12. 2025
-- ============================================================================

USE eeo2025;

-- ============================================================================
-- NORMAL PRIORITY (❗ vykřičník - oranžová)
-- ============================================================================

-- order_status_nova - Nová objednávka
UPDATE `25_notification_templates`
SET 
  email_subject = '❗ EEO: Nová objednávka #{order_number}',
  dt_updated = NOW()
WHERE type = 'order_status_nova' AND priority_default = 'normal';

-- order_status_schvalena - Objednávka schválena
UPDATE `25_notification_templates`
SET 
  email_subject = '❗ EEO: Objednávka #{order_number} byla schválena',
  dt_updated = NOW()
WHERE type = 'order_status_schvalena' AND priority_default = 'normal';

-- order_status_vracena - Objednávka vrácena k doplnění
UPDATE `25_notification_templates`
SET 
  email_subject = '❗ EEO: Objednávka #{order_number} vrácena k doplnění',
  dt_updated = NOW()
WHERE type = 'order_status_vracena' AND priority_default = 'normal';

-- order_status_odeslana_dodavateli - Objednávka odeslána dodavateli
UPDATE `25_notification_templates`
SET 
  email_subject = '❗ EEO: Objednávka #{order_number} odeslána dodavateli',
  dt_updated = NOW()
WHERE type = 'order_status_odeslana_dodavateli';

-- order_status_dokoncena - Objednávka dokončena
UPDATE `25_notification_templates`
SET 
  email_subject = '❗ EEO: Objednávka #{order_number} dokončena',
  dt_updated = NOW()
WHERE type = 'order_status_dokoncena';

-- ============================================================================
-- HIGH/URGENT PRIORITY (⚡ blesk - červená, jako "Mimořádně")
-- ============================================================================

-- order_status_ke_schvaleni - Objednávka ke schválení (URGENT)
UPDATE `25_notification_templates`
SET 
  email_subject = '⚡ EEO: Nová objednávka ke schválení #{order_number}',
  dt_updated = NOW()
WHERE type = 'order_status_ke_schvaleni' AND priority_default = 'high';

-- order_rejected - Objednávka zamítnuta (URGENT)
UPDATE `25_notification_templates`
SET 
  email_subject = '⚡ EEO: Objednávka #{order_number} byla zamítnuta',
  dt_updated = NOW()
WHERE type = 'order_rejected' AND priority_default = 'high';

-- order_status_zamitnuta - Objednávka zamítnuta (URGENT)
UPDATE `25_notification_templates`
SET 
  email_subject = '⚡ EEO: Objednávka #{order_number} byla zamítnuta',
  dt_updated = NOW()
WHERE type = 'order_status_zamitnuta' AND priority_default = 'high';

-- order_unlock_forced - Objednávka násilně odemčena (URGENT)
UPDATE `25_notification_templates`
SET 
  email_subject = '⚡ EEO: Objednávka #{order_number} byla převzata jiným uživatelem',
  dt_updated = NOW()
WHERE type = 'order_unlock_forced' AND priority_default = 'high';

-- alarm_todo_deadline_near - TODO alarm blízko deadline (URGENT)
UPDATE `25_notification_templates`
SET 
  email_subject = '⚡ EEO: Blíží se deadline úkolu: {todo_title}',
  dt_updated = NOW()
WHERE type = 'alarm_todo_deadline_near' AND priority_default = 'high';

-- alarm_todo_overdue - TODO alarm po deadline (URGENT)
UPDATE `25_notification_templates`
SET 
  email_subject = '⚡ EEO: Úkol po deadline: {todo_title}',
  dt_updated = NOW()
WHERE type = 'alarm_todo_overdue' AND priority_default = 'high';

-- ============================================================================
-- OVĚŘENÍ ZMĚN
-- ============================================================================

SELECT 
  id,
  type,
  name,
  email_subject,
  priority_default,
  dt_updated
FROM `25_notification_templates`
WHERE 
  type IN (
    'order_status_nova',
    'order_status_ke_schvaleni',
    'order_status_schvalena',
    'order_status_zamitnuta',
    'order_status_vracena',
    'order_status_odeslana_dodavateli',
    'order_status_dokoncena',
    'order_rejected',
    'order_unlock_forced',
    'alarm_todo_deadline_near',
    'alarm_todo_overdue'
  )
ORDER BY priority_default DESC, type;

-- ============================================================================
-- POZNÁMKY
-- ============================================================================
-- ❗ = Normal priority (oranžová) - běžné informační notifikace
-- ⚡ = High/Urgent priority (červená) - urgentní akce vyžadující pozornost
--     Blesk jako u "Mimořádně" na O25L Dashboardu
-- ============================================================================

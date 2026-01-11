-- =====================================================
-- RENAME NOTIFICATION TABLES - Czech Naming Standard
-- =====================================================
-- Účel: Sjednocení pojmenování všech tabulek notifikačního systému do češtiny
-- 
-- Přejmenovává 3 existující tabulky:
--   25_notifications          → 25_notifikace
--   25_notifications_read     → 25_notifikace_precteni
--   25_notification_templates → 25_notifikace_sablony
--
-- Po spuštění tohoto scriptu je nutné restartovat PHP aplikaci!
-- PHP konstanty v queries.php již byly aktualizovány pro zpětnou kompatibilitu.
-- =====================================================

-- Přejmenování hlavní tabulky notifikací
RENAME TABLE `25_notifications` TO `25_notifikace`;

-- Přejmenování tabulky read-state (per-user read/dismiss tracking)
RENAME TABLE `25_notifications_read` TO `25_notifikace_precteni`;

-- Přejmenování tabulky šablon
RENAME TABLE `25_notification_templates` TO `25_notifikace_sablony`;

-- =====================================================
-- OVĚŘENÍ PO MIGRACI
-- =====================================================

-- Zobrazit všechny tabulky notifikačního systému (měly by být pouze české názvy)
SELECT 
  TABLE_NAME as 'Czech Notification Tables',
  TABLE_ROWS as 'Rows',
  ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 2) as 'Size (KB)'
FROM 
  information_schema.TABLES 
WHERE 
  TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME LIKE '25_notifika%'
ORDER BY 
  TABLE_NAME;

-- Ověřit počty záznamů po přejmenování (měly by zůstat stejné)
SELECT 
  'Notifikace (hlavní)' as Tabulka,
  COUNT(*) as Pocet_zaznamu
FROM 
  25_notifikace

UNION ALL

SELECT 
  'Notifikace (přečtení)' as Tabulka,
  COUNT(*) as Pocet_zaznamu
FROM 
  25_notifikace_precteni

UNION ALL

SELECT 
  'Notifikace (šablony)' as Tabulka,
  COUNT(*) as Pocet_zaznamu
FROM 
  25_notifikace_sablony

UNION ALL

SELECT 
  'Notifikace (typy událostí)' as Tabulka,
  COUNT(*) as Pocet_zaznamu
FROM 
  25_notifikace_typy_udalosti

UNION ALL

SELECT 
  'Notifikace (fronta)' as Tabulka,
  COUNT(*) as Pocet_zaznamu
FROM 
  25_notifikace_fronta

UNION ALL

SELECT 
  'Notifikace (audit)' as Tabulka,
  COUNT(*) as Pocet_zaznamu
FROM 
  25_notifikace_audit

UNION ALL

SELECT 
  'Notifikace (user nastavení)' as Tabulka,
  COUNT(*) as Pocet_zaznamu
FROM 
  25_notifikace_uzivatele_nastaveni;

-- =====================================================
-- POZNÁMKY PRO VÝVOJÁŘE
-- =====================================================
-- 
-- 1. Všechny PHP konstanty jsou aktualizovány:
--    TABLE_NOTIFIKACE               → '25_notifikace'
--    TABLE_NOTIFIKACE_PRECTENI      → '25_notifikace_precteni'
--    TABLE_NOTIFIKACE_SABLONY       → '25_notifikace_sablony'
--
-- 2. Zachována zpětná kompatibilita:
--    TABLE_NOTIFICATIONS            → '25_notifikace' (@deprecated)
--    TABLE_NOTIFICATIONS_READ       → '25_notifikace_precteni' (@deprecated)
--    TABLE_NOTIFICATION_TEMPLATES   → '25_notifikace_sablony' (@deprecated)
--
-- 3. Žádné změny struktury nebo dat - pouze přejmenování!
--
-- 4. Po migraci lze postupně přejít z deprecated konstant:
--    Najít: TABLE_NOTIFICATIONS
--    Nahradit: TABLE_NOTIFIKACE
--
-- 5. Všechny tabulky notifikačního systému nyní používají prefix 25_notifikace_*
--
-- =====================================================

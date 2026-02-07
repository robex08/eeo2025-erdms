-- =====================================================
-- ALTER NOTIFICATION COLUMNS - Czech Naming Standard
-- =====================================================
-- Účel: Přejmenování anglických sloupců na české názvy
-- Datum: 2025-12-16
-- 
-- Přejmenovává sloupce ve 3 tabulkách:
--   25_notifikace (hlavní tabulka)
--   25_notifikace_precteni (read state)
--   25_notifikace_sablony (šablony)
-- =====================================================

-- =====================================================
-- 1. TABULKA: 25_notifikace (hlavní tabulka)
-- =====================================================

ALTER TABLE 25_notifikace
  CHANGE COLUMN `type` `typ` varchar(64) NOT NULL,
  CHANGE COLUMN `title` `nadpis` varchar(255) NOT NULL,
  CHANGE COLUMN `message` `zprava` text,
  CHANGE COLUMN `from_user_id` `od_uzivatele_id` int(11),
  CHANGE COLUMN `to_user_id` `pro_uzivatele_id` int(11),
  CHANGE COLUMN `to_users_json` `prijemci_json` text,
  CHANGE COLUMN `to_all_users` `pro_vsechny` tinyint(1) NOT NULL DEFAULT 0,
  CHANGE COLUMN `priority` `priorita` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  CHANGE COLUMN `category` `kategorie` varchar(32),
  CHANGE COLUMN `send_email` `odeslat_email` tinyint(1) NOT NULL DEFAULT 0,
  CHANGE COLUMN `email_sent` `email_odeslan` tinyint(1) NOT NULL DEFAULT 0,
  CHANGE COLUMN `email_sent_at` `email_odeslan_kdy` datetime,
  CHANGE COLUMN `related_object_type` `objekt_typ` varchar(32),
  CHANGE COLUMN `related_object_id` `objekt_id` bigint(20),
  CHANGE COLUMN `active` `aktivni` tinyint(1) NOT NULL DEFAULT 1;

-- =====================================================
-- 2. TABULKA: 25_notifikace_precteni (read state)
-- =====================================================

ALTER TABLE 25_notifikace_precteni
  CHANGE COLUMN `notification_id` `notifikace_id` bigint(20) unsigned NOT NULL,
  CHANGE COLUMN `user_id` `uzivatel_id` int(11) NOT NULL,
  CHANGE COLUMN `is_read` `precteno` tinyint(1) NOT NULL DEFAULT 0,
  CHANGE COLUMN `dt_read` `dt_precteno` datetime,
  CHANGE COLUMN `is_dismissed` `skryto` tinyint(1) NOT NULL DEFAULT 0,
  CHANGE COLUMN `dt_dismissed` `dt_skryto` datetime,
  CHANGE COLUMN `is_deleted` `smazano` tinyint(1) DEFAULT 0,
  CHANGE COLUMN `dt_deleted` `dt_smazano` datetime;

-- =====================================================
-- 3. TABULKA: 25_notifikace_sablony (templates)
-- =====================================================

ALTER TABLE 25_notifikace_sablony
  CHANGE COLUMN `type` `typ` varchar(100) NOT NULL,
  CHANGE COLUMN `name` `nazev` varchar(255) NOT NULL,
  CHANGE COLUMN `email_subject` `email_predmet` varchar(500),
  CHANGE COLUMN `email_body` `email_telo` text,
  CHANGE COLUMN `send_email_default` `email_vychozi` tinyint(1) DEFAULT 0,
  CHANGE COLUMN `app_title` `app_nadpis` varchar(255) NOT NULL,
  CHANGE COLUMN `app_message` `app_zprava` mediumtext NOT NULL,
  CHANGE COLUMN `priority_default` `priorita_vychozi` enum('low','normal','high','urgent') DEFAULT 'normal',
  CHANGE COLUMN `active` `aktivni` tinyint(1) DEFAULT 1;

-- =====================================================
-- OVĚŘENÍ PO MIGRACI
-- =====================================================

-- Zobrazit strukturu 25_notifikace
SELECT 'Struktura: 25_notifikace' as Info;
DESCRIBE 25_notifikace;

-- Zobrazit strukturu 25_notifikace_precteni
SELECT 'Struktura: 25_notifikace_precteni' as Info;
DESCRIBE 25_notifikace_precteni;

-- Zobrazit strukturu 25_notifikace_sablony
SELECT 'Struktura: 25_notifikace_sablony' as Info;
DESCRIBE 25_notifikace_sablony;

-- Ověřit počty záznamů (měly by zůstat stejné)
SELECT 
  'Notifikace (hlavní)' as Tabulka,
  COUNT(*) as Pocet_zaznamu
FROM 25_notifikace
UNION ALL
SELECT 
  'Notifikace (přečtení)' as Tabulka,
  COUNT(*) as Pocet_zaznamu
FROM 25_notifikace_precteni
UNION ALL
SELECT 
  'Notifikace (šablony)' as Tabulka,
  COUNT(*) as Pocet_zaznamu
FROM 25_notifikace_sablony;

-- =====================================================
-- POZNÁMKY PRO VÝVOJÁŘE
-- =====================================================
-- 
-- PŘEJMENOVANÉ SLOUPCE:
-- 
-- 25_notifikace:
--   type → typ
--   title → nadpis
--   message → zprava
--   from_user_id → od_uzivatele_id
--   to_user_id → pro_uzivatele_id
--   to_users_json → prijemci_json
--   to_all_users → pro_vsechny
--   priority → priorita
--   category → kategorie
--   send_email → odeslat_email
--   email_sent → email_odeslan
--   email_sent_at → email_odeslan_kdy
--   related_object_type → objekt_typ
--   related_object_id → objekt_id
--   active → aktivni
-- 
-- 25_notifikace_precteni:
--   notification_id → notifikace_id
--   user_id → uzivatel_id
--   is_read → precteno
--   dt_read → dt_precteno
--   is_dismissed → skryto
--   dt_dismissed → dt_skryto
--   is_deleted → smazano
--   dt_deleted → dt_smazano
-- 
-- 25_notifikace_sablony:
--   type → typ
--   name → nazev
--   email_subject → email_predmet
--   email_body → email_telo
--   send_email_default → email_vychozi
--   app_title → app_nadpis
--   app_message → app_zprava
--   priority_default → priorita_vychozi
--   active → aktivni
-- 
-- PONECHANÉ SLOUPCE (už byly české):
--   - id (všechny tabulky)
--   - dt_created (všechny tabulky)
--   - dt_expires (25_notifikace)
--   - dt_updated (25_notifikace_sablony)
--   - data_json (25_notifikace) - technický JSON
-- 
-- =====================================================

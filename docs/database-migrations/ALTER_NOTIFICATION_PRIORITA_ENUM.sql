-- ════════════════════════════════════════════════════════════════════════════════
-- Rozšíření ENUM hodnot pro sloupec priorita
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- DŮVOD:
-- Backend notificationRouter() používá hodnoty: EXCEPTIONAL, APPROVAL, INFO
-- Původní DB ENUM měl pouze: low, normal, high, urgent
-- → SQL error: "Data truncated for column 'priorita' at row 1"
--
-- ŘEŠENÍ:
-- Přidat backend hodnoty do ENUM pro kompatibilitu s org-hierarchy systémem
--
-- DATUM: 2025-12-16
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE `25_notifikace` 
MODIFY COLUMN `priorita` ENUM(
    'low',
    'normal',
    'high',
    'urgent',
    'EXCEPTIONAL',  -- Výjimečná priorita (nejvyšší)
    'APPROVAL',     -- Schvalovací proces
    'INFO'          -- Informativní notifikace
) NOT NULL DEFAULT 'normal';

-- ════════════════════════════════════════════════════════════════════════════════
-- PROVEDENO: 2025-12-16 21:30 CET
-- Server: 10.3.172.11
-- Database: eeo2025
-- User: erdms_user
-- ════════════════════════════════════════════════════════════════════════════════

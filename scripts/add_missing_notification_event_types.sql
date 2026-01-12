-- ================================================================
-- SQL Script: Přidání chybějících event types pro notifikační systém
-- Autor: GitHub Copilot
-- Datum: 2026-01-12
-- Popis: Tento skript přidává chybějící event types do tabulky 25_notifikace_event_types
--        které jsou používány v kódu, ale chybí v DB.
-- ================================================================

-- Nejprve zkontrolujeme, jestli už event types neexistují
SELECT 
    'Checking existing event types...' AS info,
    COUNT(*) AS total_event_types
FROM 25_notifikace_event_types;

SELECT 
    kod, 
    nazev, 
    kategorie, 
    aktivni
FROM 25_notifikace_event_types
WHERE kod IN (
    'INVOICE_MATERIAL_CHECK_APPROVED',
    'INVOICE_MATERIAL_CHECK_REQUESTED'
)
ORDER BY kod;

-- ================================================================
-- PŘIDÁNÍ NOVÝCH EVENT TYPES
-- ================================================================

-- 1. INVOICE_MATERIAL_CHECK_APPROVED - Věcná správnost faktury potvrzena
INSERT IGNORE INTO 25_notifikace_event_types 
    (kod, nazev, kategorie, popis, aktivni, created_at)
VALUES
    ('INVOICE_MATERIAL_CHECK_APPROVED', 
     'Věcná správnost faktury potvrzena', 
     'invoices', 
     'Kontrola věcné správnosti faktury byla schválena', 
     1,
     NOW());

-- 2. INVOICE_MATERIAL_CHECK_REQUESTED - Věcná správnost faktury požadována
INSERT IGNORE INTO 25_notifikace_event_types 
    (kod, nazev, kategorie, popis, aktivni, created_at)
VALUES
    ('INVOICE_MATERIAL_CHECK_REQUESTED', 
     'Věcná správnost faktury požadována', 
     'invoices', 
     'Faktura čeká na kontrolu věcné správnosti', 
     1,
     NOW());

-- ================================================================
-- VERIFIKACE
-- ================================================================

SELECT 
    '✅ Event types successfully added!' AS status;

SELECT 
    kod, 
    nazev, 
    kategorie, 
    aktivni,
    created_at
FROM 25_notifikace_event_types
WHERE kod IN (
    'INVOICE_MATERIAL_CHECK_APPROVED',
    'INVOICE_MATERIAL_CHECK_REQUESTED'
)
ORDER BY kod;

-- ================================================================
-- POZNÁMKY K POUŽITÍ
-- ================================================================
-- Spustit v MySQL konzoli:
-- mysql -h 127.0.0.1 -P 3322 -u root -proot erdms_2025_3 < add_missing_notification_event_types.sql
--
-- Nebo importovat v phpMyAdmin / Adminer
-- ================================================================

-- ========================================
-- FIX: Rozšíření sloupců procento_* pro prevenci overflow chyby
-- PRODUKČNÍ DATABÁZE: eeo2025
-- ========================================
-- Datum: 2026-01-19
-- Důvod: SQLSTATE[22003]: Numeric value out of range: 1264 Out of range value for column 'procento_skutecne'
--
-- DECIMAL(5,2) = max 999.99
-- DECIMAL(7,2) = max 99999.99 (stačí pro procenta)
--
-- POZOR: Před spuštěním na produkci ZÁLOHUJTE databázi!
--
-- Použití:
--   mysql -h10.3.172.11 -uerdms_user -pAhchohTahnoh7eim eeo2025 < 2026-01-19_fix_procento_columns_overflow_PROD.sql
-- ========================================

USE `eeo2025`;

-- KROK 1: Kontrola před změnou
SELECT 'KONTROLA PŘED ZMĚNOU' as krok;
SHOW COLUMNS FROM `25_smlouvy` LIKE 'procento%';

SELECT 
    COUNT(*) as celkem_smluv,
    MAX(procento_skutecne) as max_procento,
    COUNT(CASE WHEN procento_skutecne > 100 THEN 1 END) as nad_100_procent
FROM 25_smlouvy
WHERE aktivni = 1;

-- KROK 2: Rozšíření sloupců v tabulce 25_smlouvy
SELECT 'ROZŠIŘUJI SLOUPCE...' as krok;

ALTER TABLE `25_smlouvy` 
  MODIFY COLUMN `procento_cerpani` DECIMAL(7,2) NULL DEFAULT 0.00,
  MODIFY COLUMN `procento_pozadovano` DECIMAL(7,2) NULL DEFAULT 0.00,
  MODIFY COLUMN `procento_planovano` DECIMAL(7,2) NULL DEFAULT 0.00,
  MODIFY COLUMN `procento_skutecne` DECIMAL(7,2) NULL DEFAULT 0.00;

-- KROK 3: Ověření změn
SELECT 'OVĚŘENÍ PO ZMĚNĚ' as krok;
SHOW COLUMNS FROM `25_smlouvy` LIKE 'procento%';

-- KROK 4: Finální kontrola
SELECT 
    'DECIMAL(7,2)' as novy_typ,
    '99999.99' as max_hodnota,
    '✅ ÚSPĚCH' as status;

SELECT '✅ Sloupce procento_* byly úspěšně rozšířeny na DECIMAL(7,2) v PRODUKCI' AS vysledek;

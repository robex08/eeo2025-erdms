-- =============================================================================
-- PRODUKČNÍ VYČIŠTĚNÍ TABULEK PŘED SPUŠTĚNÍM
-- =============================================================================
-- Datum: 2026-01-04
-- Účel: Vymazání testovacích/dev objednávek a faktur před ostrým spuštěním
-- 
-- ⚠️ KRITICKÉ UPOZORNĚNÍ:
-- - Tento skript MAŽE DATA z PRODUKČNÍ databáze eeo2025
-- - Spustit POUZE na PRODUKČNÍM serveru před oficiálním spuštěním
-- - Před spuštěním udělat PLNOU ZÁLOHU databáze!
-- 
-- =============================================================================

-- -----------------------------------------------------------------------------
-- KROK 1: KONTROLA SOUČASNÉHO STAVU (předmazáním)
-- -----------------------------------------------------------------------------
-- Zjisti, kolik dat se bude mazat:

SELECT 'KONTROLA PŘED VYČIŠTĚNÍM' as status;

SELECT '25a_objednavky' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky;
SELECT '25a_objednavky_polozky' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_polozky;
SELECT '25a_objednavky_faktury' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_faktury;
SELECT '25a_objednavky_prilohy' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_prilohy;
SELECT '25a_faktury_lp_cerpani' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_faktury_lp_cerpani;
SELECT '25a_faktury_prilohy' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_faktury_prilohy;

-- -----------------------------------------------------------------------------
-- KROK 2: VYTVOŘ ZÁLOHU PŘED VYMAZÁNÍM
-- -----------------------------------------------------------------------------
-- Spusť tento příkaz v terminálu PŘED spuštěním tohoto skriptu:
-- 
-- mysqldump -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 \
--   25a_objednavky \
--   25a_objednavky_polozky \
--   25a_objednavky_faktury \
--   25a_objednavky_prilohy \
--   25a_faktury_lp_cerpani \
--   25a_faktury_prilohy \
--   > backup_PROD_objednavky_faktury_$(date +%Y%m%d_%H%M%S).sql
--
-- -----------------------------------------------------------------------------

-- ⚠️⚠️⚠️ POZOR: Následující příkazy NENÁVRATNĚ SMAŽOU DATA! ⚠️⚠️⚠️

-- Pokud chceš pokračovat, odkomentuj příkazy níže a spusť je:

-- -----------------------------------------------------------------------------
-- KROK 3: VYMAZÁNÍ DAT - OBJEDNÁVKY
-- -----------------------------------------------------------------------------

-- Nejprve související tabulky (kvůli foreign keys):
-- TRUNCATE TABLE 25a_objednavky_prilohy;
-- TRUNCATE TABLE 25a_objednavky_polozky;
-- TRUNCATE TABLE 25a_objednavky_faktury;

-- Poté hlavní tabulka:
-- TRUNCATE TABLE 25a_objednavky;

-- -----------------------------------------------------------------------------
-- KROK 4: VYMAZÁNÍ DAT - FAKTURY
-- -----------------------------------------------------------------------------

-- TRUNCATE TABLE 25a_faktury_prilohy;
-- TRUNCATE TABLE 25a_faktury_lp_cerpani;

-- -----------------------------------------------------------------------------
-- KROK 5: KONTROLA PO VYČIŠTĚNÍ
-- -----------------------------------------------------------------------------

-- SELECT 'KONTROLA PO VYČIŠTĚNÍ' as status;
-- SELECT '25a_objednavky' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky;
-- SELECT '25a_objednavky_polozky' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_polozky;
-- SELECT '25a_objednavky_faktury' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_faktury;
-- SELECT '25a_objednavky_prilohy' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_prilohy;
-- SELECT '25a_faktury_lp_cerpani' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_faktury_lp_cerpani;
-- SELECT '25a_faktury_prilohy' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_faktury_prilohy;

-- =============================================================================
-- POSTUP SPUŠTĚNÍ:
-- =============================================================================
-- 
-- 1. ZÁLOHA (v terminálu):
--    mysqldump -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 \
--      25a_objednavky 25a_objednavky_polozky 25a_objednavky_faktury \
--      25a_objednavky_prilohy 25a_faktury_lp_cerpani 25a_faktury_prilohy \
--      > backup_PROD_objednavky_faktury_$(date +%Y%m%d_%H%M%S).sql
--
-- 2. KONTROLA (spusť první část tohoto skriptu):
--    mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 < tento_soubor.sql
--
-- 3. ODKOMENTUJ TRUNCATE příkazy v KROK 3 a KROK 4
--
-- 4. SPUSŤ ZNOVU (tentokrát s odkomentovanými příkazy):
--    mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 < tento_soubor.sql
--
-- 5. OVĚŘ výsledek (KROK 5 by měl ukázat 0 záznamů ve všech tabulkách)
--
-- =============================================================================

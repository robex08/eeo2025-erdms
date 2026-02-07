-- =============================================================================
-- PRODUKČNÍ VYČIŠTĚNÍ TABULEK PŘED SPUŠTĚNÍM - ZACHOVAT OBJEDNÁVKU ID 1
-- =============================================================================
-- Datum: 2026-01-04
-- Účel: Vymazání testovacích objednávek a faktur KROMĚ objednávky ID 1
-- 
-- ⚠️ KRITICKÉ UPOZORNĚNÍ:
-- - Tento skript MAŽE DATA z PRODUKČNÍ databáze eeo2025
-- - ZACHOVÁVÁ objednávku s ID = 1 a všechna její související data
-- - Spustit POUZE na PRODUKČNÍM serveru před oficiálním spuštěním
-- - Před spuštěním udělat PLNOU ZÁLOHU databáze!
-- 
-- =============================================================================

-- -----------------------------------------------------------------------------
-- KROK 1: KONTROLA SOUČASNÉHO STAVU (před mazáním)
-- -----------------------------------------------------------------------------

SELECT 'KONTROLA PŘED VYČIŠTĚNÍM' as status;

SELECT '25a_objednavky' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky;
SELECT '25a_objednavky - ID 1' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky WHERE id = 1;
SELECT '25a_objednavky - ostatní' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky WHERE id != 1;

SELECT '25a_objednavky_polozky' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_polozky;
SELECT '25a_objednavky_polozky - ID obj 1' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_polozky WHERE objednavka_id = 1;
SELECT '25a_objednavky_polozky - ostatní' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_polozky WHERE objednavka_id != 1;

SELECT '25a_objednavky_prilohy' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_prilohy;
SELECT '25a_objednavky_prilohy - ID obj 1' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_prilohy WHERE objednavka_id = 1;
SELECT '25a_objednavky_prilohy - ostatní' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_prilohy WHERE objednavka_id != 1;

SELECT '25a_objednavky_faktury' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_faktury;
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

-- ⚠️⚠️⚠️ POZOR: Následující příkazy SMAŽOU DATA KROMĚ OBJEDNÁVKY ID 1! ⚠️⚠️⚠️

-- Pokud chceš pokračovat, odkomentuj příkazy níže a spusť je:

-- -----------------------------------------------------------------------------
-- KROK 3: VYMAZÁNÍ DAT - OBJEDNÁVKY (kromě ID 1)
-- -----------------------------------------------------------------------------

-- Nejprve související tabulky (kvůli foreign keys) - KROMĚ záznamů pro objednávku ID 1:
-- DELETE FROM 25a_objednavky_prilohy WHERE objednavka_id != 1;
-- DELETE FROM 25a_objednavky_polozky WHERE objednavka_id != 1;
-- DELETE FROM 25a_objednavky_faktury WHERE objednavka_id != 1;

-- Poté hlavní tabulka - všechny objednávky KROMĚ ID 1:
-- DELETE FROM 25a_objednavky WHERE id != 1;

-- -----------------------------------------------------------------------------
-- KROK 4: VYMAZÁNÍ DAT - FAKTURY (všechny)
-- -----------------------------------------------------------------------------

-- TRUNCATE TABLE 25a_faktury_prilohy;
-- TRUNCATE TABLE 25a_faktury_lp_cerpani;

-- -----------------------------------------------------------------------------
-- KROK 5: KONTROLA PO VYČIŠTĚNÍ
-- -----------------------------------------------------------------------------

-- SELECT 'KONTROLA PO VYČIŠTĚNÍ' as status;

-- SELECT '25a_objednavky' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky;
-- SELECT '25a_objednavky - ID 1 (mělo by zůstat)' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky WHERE id = 1;

-- SELECT '25a_objednavky_polozky' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_polozky;
-- SELECT '25a_objednavky_polozky - obj ID 1' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_polozky WHERE objednavka_id = 1;

-- SELECT '25a_objednavky_faktury' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_faktury;
-- SELECT '25a_objednavky_faktury - obj ID 1' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_faktury WHERE objednavka_id = 1;

-- SELECT '25a_objednavky_prilohy' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_prilohy;
-- SELECT '25a_objednavky_prilohy - obj ID 1' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_objednavky_prilohy WHERE objednavka_id = 1;

-- SELECT '25a_faktury_lp_cerpani' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_faktury_lp_cerpani;
-- SELECT '25a_faktury_prilohy' as tabulka, COUNT(*) as pocet_zaznamu FROM 25a_faktury_prilohy;

-- =============================================================================
-- SHRNUTÍ:
-- =============================================================================
-- ✓ Objednávka ID 1 a všechna její data (položky, přílohy, faktury) ZŮSTANOU
-- ✗ Všechny ostatní objednávky budou SMAZÁNY
-- ✗ Všechny samostatné faktury (lp_cerpani, prilohy) budou SMAZÁNY
-- =============================================================================

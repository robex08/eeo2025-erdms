-- ============================================================================
-- SQL ALTER příkazy pro rozšíření LP čerpání o TŘI TYPY
-- ============================================================================
-- Datum: 21.11.2025
-- Databáze: MySQL 5.5.43
-- Účel: Přidat sloupce pro rezervaci, předpoklad a skutečnost do LP čerpání
-- ============================================================================

-- KROK 1: Kontrola existence tabulky 25_objednavky a potřebných sloupců
-- ============================================================================

-- Pokud neexistuje sloupec max_cena_s_dph v tabulce 25_objednavky
-- ALTER TABLE `25_objednavky` ADD COLUMN `max_cena_s_dph` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Maximální cena objednávky s DPH (rezervace)';

-- Pokud neexistuje sloupec fakturovana_castka v tabulce 25_objednavky
-- ALTER TABLE `25_objednavky` ADD COLUMN `fakturovana_castka` DECIMAL(15,2) DEFAULT NULL COMMENT 'Skutečně fakturovaná částka s DPH';


-- KROK 2: Úprava tabulky 25_limitovane_prisliby_cerpani
-- ============================================================================

-- Přidání sloupců pro TŘI TYPY ČERPÁNÍ (objednávky)
ALTER TABLE `25_limitovane_prisliby_cerpani` 
ADD COLUMN `rezervovano` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Rezervace = suma max_cena_s_dph z objednávek (pesimistický odhad)' AFTER `celkovy_limit`;

ALTER TABLE `25_limitovane_prisliby_cerpani` 
ADD COLUMN `predpokladane_cerpani` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Odhad = suma součtů položek objednávek (reálný odhad)' AFTER `rezervovano`;

ALTER TABLE `25_limitovane_prisliby_cerpani` 
ADD COLUMN `skutecne_cerpano` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Skutečnost = suma fakturovaných částek + pokladna (finální)' AFTER `predpokladane_cerpani`;

-- Přidání sloupce pro čerpání z pokladny
ALTER TABLE `25_limitovane_prisliby_cerpani` 
ADD COLUMN `cerpano_pokladna` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Čerpání z pokladny (finální částky)' AFTER `skutecne_cerpano`;

-- Přidání sloupců pro ZŮSTATKY podle každého typu
ALTER TABLE `25_limitovane_prisliby_cerpani` 
ADD COLUMN `zbyva_rezervace` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývá podle rezervace (limit - rezervovano)' AFTER `cerpano_pokladna`;

ALTER TABLE `25_limitovane_prisliby_cerpani` 
ADD COLUMN `zbyva_predpoklad` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývá podle odhadu (limit - predpokladane_cerpani)' AFTER `zbyva_rezervace`;

ALTER TABLE `25_limitovane_prisliby_cerpani` 
ADD COLUMN `zbyva_skutecne` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývá podle skutečnosti (limit - skutecne_cerpano)' AFTER `zbyva_predpoklad`;

-- Přidání sloupců pro PROCENTA podle každého typu
ALTER TABLE `25_limitovane_prisliby_cerpani` 
ADD COLUMN `procento_rezervace` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Procento rezervace' AFTER `zbyva_skutecne`;

ALTER TABLE `25_limitovane_prisliby_cerpani` 
ADD COLUMN `procento_predpoklad` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Procento odhadu' AFTER `procento_rezervace`;

ALTER TABLE `25_limitovane_prisliby_cerpani` 
ADD COLUMN `procento_skutecne` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Procento skutečnosti' AFTER `procento_predpoklad`;


-- KROK 3: Smazání starých sloupců (pokud existují)
-- ============================================================================

-- Pokud existují staré sloupce celkove_cerpano, celkove_zbyva, celkove_procento
-- Tyto se nahrazují třemi typy čerpání

-- POZOR: Nejdřív zkontroluj, jestli jsou v databázi!
-- SELECT * FROM 25_limitovane_prisliby_cerpani LIMIT 1;

-- Pokud existují staré sloupce, smažeme je:
-- ALTER TABLE `25_limitovane_prisliby_cerpani` DROP COLUMN `celkove_cerpano`;
-- ALTER TABLE `25_limitovane_prisliby_cerpani` DROP COLUMN `celkove_zbyva`;
-- ALTER TABLE `25_limitovane_prisliby_cerpani` DROP COLUMN `celkove_procento`;


-- KROK 4: Kontrola struktury tabulky
-- ============================================================================

-- Zobrazit strukturu tabulky pro kontrolu
DESCRIBE `25_limitovane_prisliby_cerpani`;


-- KROK 5: Test dat
-- ============================================================================

-- Zobrazit první řádky pro kontrolu
SELECT 
    cislo_lp,
    celkovy_limit,
    rezervovano,
    predpokladane_cerpani,
    skutecne_cerpano,
    zbyva_skutecne,
    procento_skutecne
FROM 25_limitovane_prisliby_cerpani 
LIMIT 5;


-- ============================================================================
-- POZNÁMKY
-- ============================================================================

-- 1. REZERVACE (rezervovano):
--    - Používá max_cena_s_dph z objednávek
--    - Nejpesimističtější odhad
--    - Zobrazovat menším fontem

-- 2. PŘEDPOKLAD (predpokladane_cerpani):
--    - Používá SUM(cena_s_dph) z položek objednávek (položky NEMAJÍ sloupec mnozstvi)
--    - Reálný pracovní odhad
--    - Zobrazovat menším fontem

-- 3. SKUTEČNOST (skutecne_cerpano):
--    - Používá fakturovana_castka + čerpání z pokladny
--    - Finální oficiální číslo
--    - Zobrazovat VELKÝM FONTEM v profilu

-- 4. POKLADNA:
--    - Má jen skutečné čerpání (finální)
--    - Neexistuje rezervace ani předpoklad
--    - Jde rovnou do skutecne_cerpano

-- ============================================================================
-- POSTUP NASAZENÍ
-- ============================================================================

-- 1. Záloha databáze:
--    mysqldump -u root -p databaze > zaloha_21_11_2025.sql

-- 2. Spustit tento SQL skript

-- 3. Zkontrolovat strukturu:
--    DESCRIBE 25_limitovane_prisliby_cerpani;

-- 4. Zkontrolovat data:
--    SELECT * FROM 25_limitovane_prisliby_cerpani LIMIT 5;

-- 5. Spustit PHP funkci pro přepočet:
--    POST /api/limitovane-prisliby/inicializace
--    Body: {"rok": 2025}

-- 6. Zkontrolovat výsledky:
--    GET /api/limitovane-prisliby/stav?usek_id=4

-- ============================================================================

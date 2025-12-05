-- ============================================
-- ALTER TABLE: Povolení NULL pro povinná pole workflow
-- ============================================
-- Datum: 5. prosince 2025
-- Důvod: Pole jsou vyplňována postupně v různých fázích workflow,
--        ale databáze vyžaduje hodnoty už při INSERT ve fázi 1.
--        Řešení: Povolit NULL hodnoty pro všechna pole která
--        nejsou vyplněna hned na začátku.
-- ============================================

-- PRODUKČNÍ tabulka 25a_objednavky (EEO v2.5 2025)
-- POZNÁMKA: schvalovatel_id, prikazce_id, objednatel_id již NEMAJÍ FK constraints!
-- POZNÁMKA: druh_objednavky_kod už je NULL-able

-- 1. Změnit datetime sloupce na NULL (vyplňují se v pozdějších fázích)
ALTER TABLE `25a_objednavky` MODIFY COLUMN `dt_odeslani` DATETIME NULL DEFAULT NULL COMMENT 'Datum odeslání objednávky dodavateli';
ALTER TABLE `25a_objednavky` MODIFY COLUMN `dt_akceptace` DATETIME NULL DEFAULT NULL COMMENT 'Datum akceptace objednávky dodavatelem';
ALTER TABLE `25a_objednavky` MODIFY COLUMN `dt_zamek` DATETIME NULL DEFAULT NULL COMMENT 'Datum zamčení záznamu';

-- 2. Změnit textové sloupce na NULL (vyplňují se podmíněně)
ALTER TABLE `25a_objednavky` MODIFY COLUMN `odeslani_storno_duvod` TEXT NULL DEFAULT NULL COMMENT 'Důvod odeslání nebo storna';
ALTER TABLE `25a_objednavky` MODIFY COLUMN `dodavatel_zpusob_potvrzeni` VARCHAR(128) NULL DEFAULT NULL COMMENT 'Způsob potvrzení objednávky dodavatelem';

-- Hotovo! Workflow pole mohou být nyní NULL.

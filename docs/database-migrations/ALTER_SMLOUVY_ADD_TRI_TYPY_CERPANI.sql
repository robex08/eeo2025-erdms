-- ========================================
-- Migrace: Přidání sloupců pro tři typy čerpání smluv
-- ========================================
-- Podle vzoru limitovaných příslíbů (25_limitovane_prisliby_cerpani)
-- 
-- TŘI TYPY ČERPÁNÍ:
-- 1. POŽADOVÁNO (max_cena_s_dph) - maximální částka z objednávky
-- 2. PLÁNOVÁNO (suma položek) - reálný odhad z položek objednávky
-- 3. SKUTEČNĚ ČERPÁNO (faktury) - finální čerpání z faktur
-- ========================================

-- Přidat nové sloupce pro čerpání
ALTER TABLE `25_smlouvy`
  ADD COLUMN `cerpano_pozadovano` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Požadované čerpání z max_cena_s_dph objednávek' AFTER `cerpano_celkem`,
  ADD COLUMN `cerpano_planovano` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Plánované čerpání z položek objednávek' AFTER `cerpano_pozadovano`,
  ADD COLUMN `cerpano_skutecne` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Skutečné čerpání z faktur' AFTER `cerpano_planovano`,
  ADD COLUMN `zbyva_pozadovano` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývá z požadovaného čerpání' AFTER `zbyva`,
  ADD COLUMN `zbyva_planovano` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývá z plánovaného čerpání' AFTER `zbyva_pozadovano`,
  ADD COLUMN `zbyva_skutecne` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývá ze skutečného čerpání' AFTER `zbyva_planovano`,
  ADD COLUMN `procento_pozadovano` DECIMAL(5,2) DEFAULT 0.00 COMMENT '% požadovaného čerpání' AFTER `procento_cerpani`,
  ADD COLUMN `procento_planovano` DECIMAL(5,2) DEFAULT 0.00 COMMENT '% plánovaného čerpání' AFTER `procento_pozadovano`,
  ADD COLUMN `procento_skutecne` DECIMAL(5,2) DEFAULT 0.00 COMMENT '% skutečného čerpání' AFTER `procento_planovano`;

-- Zkontrolovat novou strukturu
DESCRIBE `25_smlouvy`;

-- Poznámka pro zpětnou kompatibilitu:
-- Sloupec `cerpano_celkem` zůstává zachován pro kompatibilitu se starým kódem
-- Ve výchozím stavu bude `cerpano_celkem` = `cerpano_skutecne` (finální čerpání)

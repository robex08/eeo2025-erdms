-- ==============================================================================
-- ROZŠÍRENIE ČÍSELNÍKU POKLADEN O POVINNOSŤ LP KÓDU
-- ==============================================================================
-- Autor: GitHub Copilot  
-- Dátum: 6. január 2026
-- Účel: Pridanie možnosti nastavenia povinnosti LP kódu pre jednotlivé pokladny
-- ==============================================================================

-- Pridanie nového stĺpca do číselníku pokladen
ALTER TABLE `25a_pokladny` 
ADD COLUMN `lp_kod_povinny` TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Povinnosť zadání LP kódu u položek (1=povinný, 0=volitelný)' 
AFTER `pocatecni_stav_rok`;

-- Index pre výkon pri častém filtrovaní
ALTER TABLE `25a_pokladny` 
ADD INDEX `idx_lp_kod_povinny` (`lp_kod_povinny`);

-- Aktualizácia komentára tabulky
ALTER TABLE `25a_pokladny` 
COMMENT = 'Číselník pokladen s nastavením číslovacích riad a povinnosti LP kódov';
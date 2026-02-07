-- Přidání sloupce poznamka_umisteni do tabulky 25a_objednavky_polozky
-- Datum: 2026-02-06
-- Účel: Umožnit uživatelům zadat poznámku k umístění položky objednávky

ALTER TABLE `25a_objednavky_polozky` 
ADD COLUMN `poznamka_umisteni` TEXT NULL 
COMMENT 'Poznámka k umístění položky (např. konkrétní umístění v budově)' 
AFTER `poznamka`;

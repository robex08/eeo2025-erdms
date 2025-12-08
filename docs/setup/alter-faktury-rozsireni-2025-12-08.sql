-- =====================================================
-- Rozšíření tabulky 25a_objednavky_faktury
-- Datum: 8. prosince 2025
-- Autor: robex08
-- Popis: Přidání sloupců pro datum zaplacení a předání FA zaměstnanci
-- =====================================================

USE eeo2025;

-- Přidat nové sloupce
ALTER TABLE `25a_objednavky_faktury`
ADD COLUMN `fa_datum_zaplaceni` DATETIME DEFAULT NULL COMMENT 'Datum a čas zaplacení faktury (systémově)' AFTER `fa_zaplacena`,
ADD COLUMN `fa_predana_zam_id` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID zaměstnance (25_uzivatele), komu byla FA předána' AFTER `rozsirujici_data`,
ADD COLUMN `fa_datum_predani_zam` DATE DEFAULT NULL COMMENT 'Datum předání FA zaměstnanci (ručně zadávané)' AFTER `fa_predana_zam_id`,
ADD COLUMN `fa_datum_vraceni_zam` DATE DEFAULT NULL COMMENT 'Datum vrácení FA od zaměstnance (ručně zadávané)' AFTER `fa_datum_predani_zam`;

-- Vytvořit indexy pro rychlé dotazy
CREATE INDEX `idx_fa_datum_zaplaceni` ON `25a_objednavky_faktury` (`fa_datum_zaplaceni`);
CREATE INDEX `idx_fa_predana_zam_id` ON `25a_objednavky_faktury` (`fa_predana_zam_id`);
CREATE INDEX `idx_fa_datum_predani_zam` ON `25a_objednavky_faktury` (`fa_datum_predani_zam`);
CREATE INDEX `idx_fa_datum_vraceni_zam` ON `25a_objednavky_faktury` (`fa_datum_vraceni_zam`);

-- Přidat foreign key constraint
ALTER TABLE `25a_objednavky_faktury`
ADD CONSTRAINT `fk_faktury_predana_zam`
  FOREIGN KEY (`fa_predana_zam_id`)
  REFERENCES `25_uzivatele` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Ověření změn
SELECT 'Struktura tabulky 25a_objednavky_faktury byla úspěšně rozšířena!' as Status;
SHOW CREATE TABLE `25a_objednavky_faktury`;

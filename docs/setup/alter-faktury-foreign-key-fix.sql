-- =====================================================
-- Oprava datového typu fa_predana_zam_id a přidání foreign key
-- Datum: 8. prosince 2025
-- =====================================================

USE eeo2025;

-- Nejdřív změnit datový typ na správný (INT(10) UNSIGNED)
ALTER TABLE `25a_objednavky_faktury`
MODIFY COLUMN `fa_predana_zam_id` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID zaměstnance (25_uzivatele), komu byla FA předána';

-- Přidat foreign key constraint
ALTER TABLE `25a_objednavky_faktury`
ADD CONSTRAINT `fk_faktury_predana_zam`
  FOREIGN KEY (`fa_predana_zam_id`)
  REFERENCES `25_uzivatele` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Ověření
SELECT 'Foreign key constraint byl úspěšně přidán!' as Status;

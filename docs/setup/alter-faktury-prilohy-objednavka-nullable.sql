-- =====================================================
-- MIGRACE: objednavka_id → NULLABLE v 25a_faktury_prilohy
-- Datum: 5. 12. 2025
-- Důvod: Umožnit přílohy k fakturám bez přiřazené objednávky
-- =====================================================

-- Nejdřív odstranit FOREIGN KEY constraint
ALTER TABLE `25a_faktury_prilohy` 
DROP FOREIGN KEY `fk_faktury_prilohy_objednavka`;

-- Změna sloupce objednavka_id na NULLABLE
ALTER TABLE `25a_faktury_prilohy` 
MODIFY COLUMN `objednavka_id` int(10) unsigned DEFAULT NULL COMMENT 'Vazba na objednávku (pro rychlé dotazy) - nepovinné';

-- Přidat zpět FOREIGN KEY constraint, ale s ON DELETE SET NULL
ALTER TABLE `25a_faktury_prilohy`
ADD CONSTRAINT `fk_faktury_prilohy_objednavka` 
FOREIGN KEY (`objednavka_id`) 
REFERENCES `25a_objednavky` (`id`) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Výsledek: objednavka_id může být nyní NULL
-- Přílohy faktur bez objednávky budou mít objednavka_id = NULL

-- Ověření změny:
-- DESCRIBE `25a_faktury_prilohy`;

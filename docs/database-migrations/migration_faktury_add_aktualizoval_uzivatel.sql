-- =====================================================
-- Migrace: Přidání sloupce aktualizoval_uzivatel_id
-- Tabulka: 25a_objednavky_faktury
-- Datum: 2025-12-22
-- Účel: Audit trail - kdo fakturu naposledy upravil
-- =====================================================

USE erdms2025;

-- Přidat sloupec aktualizoval_uzivatel_id
ALTER TABLE `25a_objednavky_faktury`
ADD COLUMN `aktualizoval_uzivatel_id` INT(10) DEFAULT NULL COMMENT 'ID uživatele který fakturu naposledy upravil'
AFTER `vytvoril_uzivatel_id`;

-- Přidat index pro rychlejší dotazy
CREATE INDEX `idx_aktualizoval_uzivatel` ON `25a_objednavky_faktury` (`aktualizoval_uzivatel_id`);

-- Přidat foreign key constraint (pokud 25_uzivatele.id je INT(10))
ALTER TABLE `25a_objednavky_faktury`
ADD CONSTRAINT `fk_faktury_aktualizoval_uzivatel`
  FOREIGN KEY (`aktualizoval_uzivatel_id`)
  REFERENCES `25_uzivatele` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Ověření
SHOW CREATE TABLE `25a_objednavky_faktury`;

-- Výpis struktury
DESCRIBE `25a_objednavky_faktury`;

-- =====================================================
-- POZNÁMKY:
-- =====================================================
-- 1. Sloupec je DEFAULT NULL - u starých záznamů bude NULL
-- 2. Foreign key používá ON DELETE SET NULL - pokud se smaže uživatel, 
--    záznam zůstane, ale aktualizoval_uzivatel_id bude NULL
-- 3. Backend API nyní při UPDATE automaticky nastaví:
--    - dt_aktualizace = NOW()
--    - aktualizoval_uzivatel_id = {ID z tokenu}
-- =====================================================

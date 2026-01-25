-- ============================================================================
-- OPRAVA UNIQUE CONSTRAINT V 25a_pokladni_knihy
-- Datum: 25. ledna 2026 13:35
-- ============================================================================

-- PROBLÉM:
-- Současný constraint: UNIQUE (uzivatel_id, pokladna_id, rok, mesic)
-- → Umožňuje 2 různým uživatelům vytvořit 2 knihy pro stejnou pokladnu!
--
-- ŘEŠENÍ:
-- Nový constraint: UNIQUE (pokladna_id, rok, mesic)
-- → Jedna pokladna = jedna kniha per období (bez ohledu na uživatele)

USE `EEO-OSTRA-DEV`;

-- 1. ODSTRANIT ŠPATNÝ CONSTRAINT
ALTER TABLE 25a_pokladni_knihy 
DROP INDEX unique_uzivatel_pokladna_obdobi;

-- 2. PŘIDAT SPRÁVNÝ CONSTRAINT
ALTER TABLE 25a_pokladni_knihy 
ADD UNIQUE KEY unique_pokladna_obdobi (pokladna_id, rok, mesic);

-- 3. OVĚŘENÍ
SHOW CREATE TABLE 25a_pokladni_knihy;

-- Očekávaný výstup by měl obsahovat:
-- UNIQUE KEY `unique_pokladna_obdobi` (`pokladna_id`,`rok`,`mesic`)

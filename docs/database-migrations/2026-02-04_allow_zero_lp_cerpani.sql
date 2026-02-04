-- =============================================================================
-- MIGRATION: Povolení nulové částky u LP čerpání na fakturách
-- =============================================================================
-- Datum: 4. února 2026
-- Důvod: Zálohové faktury vyžadují možnost zadat LP čerpání s částkou 0 Kč
-- 
-- Změna: 
--   PŘED: CHECK (castka > 0)      -- Minimální částka 0.01 Kč
--   PO:   CHECK (castka >= 0)     -- Povolena nulová částka, zakázány záporné
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DEV DATABASE: EEO-OSTRA-DEV
-- -----------------------------------------------------------------------------

USE `EEO-OSTRA-DEV`;

-- Odstranit starý constraint
ALTER TABLE 25a_faktury_lp_cerpani 
DROP CONSTRAINT chk_castka_positive;

-- Přidat nový constraint (povoluje nulu, zakazuje záporné)
ALTER TABLE 25a_faktury_lp_cerpani 
ADD CONSTRAINT chk_castka_nonnegative 
CHECK (castka >= 0);

-- Ověření
SELECT 
  CONSTRAINT_NAME,
  CONSTRAINT_TYPE
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'EEO-OSTRA-DEV'
  AND TABLE_NAME = '25a_faktury_lp_cerpani'
  AND CONSTRAINT_NAME = 'chk_castka_nonnegative';

-- -----------------------------------------------------------------------------
-- PRODUCTION DATABASE: eeo2025
-- -----------------------------------------------------------------------------

USE eeo2025;

-- Odstranit starý constraint
ALTER TABLE 25a_faktury_lp_cerpani 
DROP CONSTRAINT chk_castka_positive;

-- Přidat nový constraint (povoluje nulu, zakazuje záporné)
ALTER TABLE 25a_faktury_lp_cerpani 
ADD CONSTRAINT chk_castka_nonnegative 
CHECK (castka >= 0);

-- Ověření
SELECT 
  CONSTRAINT_NAME,
  CONSTRAINT_TYPE
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME = '25a_faktury_lp_cerpani'
  AND CONSTRAINT_NAME = 'chk_castka_nonnegative';

-- =============================================================================
-- TESTOVÁNÍ
-- =============================================================================

-- Test 1: Nulová částka (měla by projít) ✅
START TRANSACTION;
INSERT INTO 25a_faktury_lp_cerpani 
(faktura_id, lp_cislo, lp_id, castka, poznamka) 
VALUES 
(11, 'LPTEST', NULL, 0.00, 'Test: Nulová částka');
ROLLBACK;

-- Test 2: Kladná částka (měla by projít) ✅
START TRANSACTION;
INSERT INTO 25a_faktury_lp_cerpani 
(faktura_id, lp_cislo, lp_id, castka, poznamka) 
VALUES 
(11, 'LPTEST', NULL, 100.50, 'Test: Kladná částka');
ROLLBACK;

-- Test 3: Záporná částka (měla by být zamítnuta) ❌
START TRANSACTION;
INSERT INTO 25a_faktury_lp_cerpani 
(faktura_id, lp_cislo, lp_id, castka, poznamka) 
VALUES 
(11, 'LPTEST', NULL, -50.00, 'Test: Záporná částka');
-- Očekávaný výsledek: ERROR 4025 (23000): CONSTRAINT `chk_castka_nonnegative` failed
ROLLBACK;

-- =============================================================================
-- VÝSLEDEK
-- =============================================================================
-- ✅ DEV:  Constraint změněn z `castka > 0` na `castka >= 0`
-- ✅ PROD: Constraint změněn z `castka > 0` na `castka >= 0`
-- ✅ Nulová částka (0.00 Kč) je nyní POVOLENA
-- ❌ Záporné částky jsou stále ZAKÁZÁNY
-- =============================================================================

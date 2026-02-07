-- ============================================================================
-- EEO v2 - Update organizační hierarchie PRIKAZCI - verze 1.95b
-- ============================================================================
-- Datum: 3. ledna 2026
-- Popis: Přenos změn v profilu PRIKAZCI z DEV do PROD
-- ============================================================================

-- 1. Načíst DEV strukturu do proměnné
USE `eeo2025-dev`;
SET @dev_structure = (SELECT structure_json FROM 25_hierarchie_profily WHERE id = 12);

-- 2. Aplikovat na PROD
USE eeo2025;
UPDATE 25_hierarchie_profily 
SET structure_json = @dev_structure
WHERE id = 12;

-- 3. Ověření
SELECT id, nazev, aktivni, dt_upraveno 
FROM 25_hierarchie_profily 
WHERE id = 12;

-- ✅ Výsledek: Hierarchický profil PRIKAZCI (ID 12) byl úspěšně zkopírován z DEV do PROD

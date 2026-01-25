-- ============================================================================
-- OPRAVA KNIHY POKLADNY 1 - PŘEVOD Z PROSINCE 2025
-- Datum: 25. ledna 2026 15:45
-- ============================================================================

USE `EEO-OSTRA-DEV`;

-- 1. ZJISTIT KONCOVÝ STAV PROSINCE 2025 PRO POKLADNU 14
SELECT 
    id,
    pokladna_id,
    rok,
    mesic,
    koncovy_stav,
    prevod_z_predchoziho,
    celkove_prijmy,
    celkove_vydaje
FROM 25a_pokladni_knihy
WHERE pokladna_id = 14 AND rok = 2025 AND mesic = 12;

-- Očekávaný výsledek: koncovy_stav = 71937.00

-- 2. AKTUALIZOVAT LEDNU 2026 - NASTAVIT SPRÁVNÝ PŘEVOD
UPDATE 25a_pokladni_knihy 
SET 
    prevod_z_predchoziho = (
        SELECT koncovy_stav 
        FROM 25a_pokladni_knihy AS prev 
        WHERE prev.pokladna_id = 14 
          AND prev.rok = 2025 
          AND prev.mesic = 12
        LIMIT 1
    ),
    poznamky = CONCAT(
        COALESCE(poznamky, ''), 
        '\n[', NOW(), '] Opraveno: prevod_z_predchoziho na koncovy_stav z prosince 2025'
    )
WHERE pokladna_id = 14 
  AND rok = 2026 
  AND mesic = 1;

-- 3. OVĚŘENÍ
SELECT 
    id,
    pokladna_id,
    rok,
    mesic,
    prevod_z_predchoziho,
    celkove_prijmy,
    celkove_vydaje,
    koncovy_stav,
    pocatecni_stav
FROM 25a_pokladni_knihy
WHERE pokladna_id = 14 AND rok = 2026 AND mesic = 1;

-- Očekávaný výsledek po opravě:
-- prevod_z_predchoziho = 71937.00
-- koncovy_stav = 122847.00 (71937 + 200000 - 149090)

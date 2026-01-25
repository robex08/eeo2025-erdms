-- ============================================================================
-- HROMADNÁ OPRAVA PŘEVODŮ PRO LEDEN 2026
-- Datum: 25. ledna 2026 16:00
-- ============================================================================

USE `EEO-OSTRA-DEV`;

-- KROK 1: Zobrazit současný stav
SELECT 
    kb.id AS kniha_id,
    kb.pokladna_id,
    kb.cislo_pokladny,
    p.nazev AS nazev_pokladny,
    kb.prevod_z_predchoziho AS stary_prevod,
    p.pocatecni_stav_rok AS novy_prevod,
    kb.celkove_prijmy,
    kb.celkove_vydaje,
    kb.koncovy_stav AS stary_koncovy,
    (p.pocatecni_stav_rok + kb.celkove_prijmy - kb.celkove_vydaje) AS novy_koncovy
FROM 25a_pokladni_knihy kb
LEFT JOIN 25a_pokladny p ON p.id = kb.pokladna_id
WHERE kb.rok = 2026 AND kb.mesic = 1
ORDER BY kb.cislo_pokladny;

-- KROK 2: Aktualizovat převody a koncové stavy
UPDATE 25a_pokladni_knihy kb
INNER JOIN 25a_pokladny p ON p.id = kb.pokladna_id
SET 
    kb.prevod_z_predchoziho = COALESCE(p.pocatecni_stav_rok, 0.00),
    kb.koncovy_stav = COALESCE(p.pocatecni_stav_rok, 0.00) + kb.celkove_prijmy - kb.celkove_vydaje,
    kb.poznamky = CONCAT(
        COALESCE(kb.poznamky, ''), 
        IF(kb.poznamky IS NULL OR kb.poznamky = '', '', '\n'),
        '[', NOW(), '] Opraveno: prevod_z_predchoziho na pocatecni_stav_rok z 25a_pokladny'
    )
WHERE kb.rok = 2026 AND kb.mesic = 1;

-- KROK 3: Ověření
SELECT 
    kb.id AS kniha_id,
    kb.cislo_pokladny,
    p.nazev AS nazev_pokladny,
    kb.prevod_z_predchoziho,
    kb.celkove_prijmy,
    kb.celkove_vydaje,
    kb.koncovy_stav,
    (kb.prevod_z_predchoziho + kb.celkove_prijmy - kb.celkove_vydaje) AS kontrola
FROM 25a_pokladni_knihy kb
LEFT JOIN 25a_pokladny p ON p.id = kb.pokladna_id
WHERE kb.rok = 2026 AND kb.mesic = 1
ORDER BY kb.cislo_pokladny;

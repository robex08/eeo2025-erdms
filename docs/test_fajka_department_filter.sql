-- Test kompletního department subordinate filtru pro Fajku
-- Simulace backend logiky

-- KROK 1: Kolegy Fajky (usek_id=6)
SELECT @colleague_ids := GROUP_CONCAT(id) 
FROM 25_uzivatele 
WHERE usek_id = (SELECT usek_id FROM 25_uzivatele WHERE id = 51) 
AND aktivni = 1;

SELECT @colleague_ids as 'Kolegy Fajky (PTN)';

-- KROK 2: Objednávky s department filtrem (simulace WHERE podmínky)
SELECT 
    o.id,
    o.cislo_objednavky,
    o.stav_objednavky,
    o.uzivatel_id,
    o.objednatel_id,
    o.garant_uzivatel_id,
    CASE
        WHEN o.uzivatel_id = 91 OR o.objednatel_id = 91 OR o.garant_uzivatel_id = 91 
        THEN '⭐ ŠULGAN'
        ELSE 'Jiný kolega'
    END as owner
FROM 25a_objednavky o
WHERE o.aktivni = 1
AND (
    o.uzivatel_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.objednatel_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.garant_uzivatel_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.schvalovatel_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.prikazce_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.uzivatel_akt_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.odesilatel_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.dodavatel_potvrdil_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.zverejnil_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.fakturant_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.dokoncil_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
    OR o.potvrdil_vecnou_spravnost_id IN (13,19,20,23,24,25,27,28,29,51,53,91,92,98,113,135,136)
)
ORDER BY o.id DESC
LIMIT 20;

-- KROK 3: Šulganovy objednávky ve výsledku
SELECT 'Objednávky Šulgana, které by Fajka MĚLA vidět:' as info;

SELECT 
    o.id,
    o.cislo_objednavky,
    o.stav_objednavky
FROM 25a_objednavky o
WHERE o.aktivni = 1
AND o.id IN (140, 136, 135, 93, 90);

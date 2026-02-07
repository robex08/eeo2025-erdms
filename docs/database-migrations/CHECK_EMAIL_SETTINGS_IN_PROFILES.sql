-- 🔍 KONTROLA NASTAVENÍ EMAILŮ V HIERARCHICKÝCH PROFILECH
-- Datum: 18. prosince 2025
-- Účel: Najít všechny profily, které mají sendEmail = true

-- ════════════════════════════════════════════════════════════════
-- 1. PROFILY S sendEmail = true
-- ════════════════════════════════════════════════════════════════

SELECT 
    id,
    nazev,
    popis,
    JSON_EXTRACT(structure_json, '$.edges') as edges
FROM 25_hierarchie_profily
WHERE JSON_SEARCH(structure_json, 'one', true, NULL, '$.edges[*].data.sendEmail') IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- 2. DETAILNÍ PŘEHLED - KTERÉ EDGE MAJÍ sendEmail = true
-- ════════════════════════════════════════════════════════════════

SELECT 
    hp.id as profil_id,
    hp.nazev as profil_nazev,
    hp.aktivni,
    JSON_EXTRACT(edge.data, '$.sendEmail') as sendEmail,
    JSON_EXTRACT(edge.data, '$.sendInApp') as sendInApp,
    JSON_EXTRACT(edge.data, '$.recipient_type') as recipient_type,
    JSON_EXTRACT(edge.data, '$.recipientRole') as recipientRole,
    edge.data as edge_data
FROM 25_hierarchie_profily hp,
JSON_TABLE(
    hp.structure_json,
    '$.edges[*]' COLUMNS(
        data JSON PATH '$'
    )
) AS edge
WHERE JSON_EXTRACT(edge.data, '$.sendEmail') = true;

-- ════════════════════════════════════════════════════════════════
-- 3. MIGRACE - VYPNOUT sendEmail U VŠECH PROFILŮ (DOPORUČENO)
-- ════════════════════════════════════════════════════════════════

-- ⚠️ POZOR: Toto vypne emaily u VŠECH hierarchických profilů!
-- ⚠️ Spusť pouze pokud chceš GLOBÁLNĚ VYPNOUT emaily v celém systému

/*
UPDATE 25_hierarchie_profily
SET structure_json = JSON_REPLACE(
    structure_json,
    '$.edges[*].data.sendEmail',
    false
)
WHERE JSON_SEARCH(structure_json, 'one', true, NULL, '$.edges[*].data.sendEmail') IS NOT NULL;
*/

-- ════════════════════════════════════════════════════════════════
-- 4. KONTROLA PO MIGRACI
-- ════════════════════════════════════════════════════════════════

SELECT 
    COUNT(*) as profilu_s_emailem,
    (SELECT COUNT(*) FROM 25_hierarchie_profily) as celkem_profilu
FROM 25_hierarchie_profily
WHERE JSON_SEARCH(structure_json, 'one', true, NULL, '$.edges[*].data.sendEmail') IS NOT NULL;

-- Očekávaný výsledek po migraci: 0 profilů s emailem

-- ════════════════════════════════════════════════════════════════
-- 5. VYPNOUT sendEmail U KONKRÉTNÍHO PROFILU
-- ════════════════════════════════════════════════════════════════

/*
-- Příklad pro profil ID = 1
UPDATE 25_hierarchie_profily
SET structure_json = JSON_SET(
    structure_json,
    '$.edges[0].data.sendEmail', false,
    '$.edges[1].data.sendEmail', false,
    '$.edges[2].data.sendEmail', false
    -- ... atd. pro všechny edges
)
WHERE id = 1;
*/

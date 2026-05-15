-- ============================================================================
-- PŘIDÁNÍ NOVÉHO TYPU FAKTURY: Interní doklad
-- ============================================================================
-- Datum: 2026-05-14
-- Autor: Development Team
-- Popis: Přidává nový typ faktury "Interní doklad" do číselníku 25_ciselnik_stavy
-- ============================================================================

-- Kontrola, zda už záznam neexistuje (pro případ opakovaného spuštění)
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'VAROVÁNÍ: Záznam INTERNI_DOKLAD už existuje!'
        ELSE 'OK: Pokračuji s insertem'
    END as status
FROM 25_ciselnik_stavy 
WHERE typ_objektu = 'FAKTURA' 
  AND kod_stavu = 'INTERNI_DOKLAD';

-- Vložení nového typu faktury
INSERT INTO 25_ciselnik_stavy (
    typ_objektu,
    kod_stavu,
    nadrazeny_kod_stavu,
    nazev_stavu,
    popis,
    platnost_do,
    aktivni,
    atribut_objektu
) VALUES (
    'FAKTURA',                                                      -- typ_objektu
    'INTERNI_DOKLAD',                                              -- kod_stavu (bez diakritiky)
    '',                                                            -- nadrazeny_kod_stavu (prázdný)
    'Interní doklad',                                              -- nazev_stavu (s diakritikou)
    'Interní účetní doklad pro vnitřní operace a převody',        -- popis
    '2100-12-21',                                                  -- platnost_do (standardní dlouhá platnost)
    1,                                                             -- aktivni (1 = aktivní)
    0                                                              -- atribut_objektu (0 = výchozí)
);

-- Kontrola výsledku
SELECT 
    id,
    typ_objektu,
    kod_stavu,
    nazev_stavu,
    popis,
    aktivni
FROM 25_ciselnik_stavy 
WHERE typ_objektu = 'FAKTURA' 
  AND kod_stavu = 'INTERNI_DOKLAD';

-- Zobrazení všech typů faktur pro kontrolu
SELECT 
    id,
    kod_stavu,
    nazev_stavu,
    aktivni
FROM 25_ciselnik_stavy 
WHERE typ_objektu = 'FAKTURA' 
ORDER BY id;

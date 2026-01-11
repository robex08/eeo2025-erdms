-- =====================================================
-- SQL kontrola KOSILKA klasifikace pro přílohy
-- Tabulka: 25_ciselnik_stavy
-- typ_objektu: PRILOHA_TYP
-- =====================================================

USE `eeo2025-dev`;

-- Kontrola existence KOSILKA
SELECT 
    'KONTROLA - KOSILKA klasifikace pro přílohy objednávky:' AS Status;

SELECT 
    id,
    typ_objektu,
    kod_stavu,
    nazev_stavu,
    popis,
    nadrazeny_kod_stavu,
    barva,
    ikona,
    poradi,
    aktivni,
    platnost_od,
    platnost_do
FROM 25_ciselnik_stavy
WHERE typ_objektu = 'PRILOHA_TYP'
  AND kod_stavu = 'KOSILKA';

-- Pokud neexistuje, seznam všech typů příloh pro kontext
SELECT 
    'KONTEXT - Všechny typy příloh (PRILOHA_TYP):' AS Status;

SELECT 
    id,
    kod_stavu,
    nazev_stavu,
    popis,
    aktivni,
    poradi
FROM 25_ciselnik_stavy
WHERE typ_objektu = 'PRILOHA_TYP'
  AND aktivni = 1
ORDER BY poradi ASC, nazev_stavu ASC;

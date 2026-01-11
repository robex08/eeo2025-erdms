-- FIX: Universal search filtering of inactive suppliers
-- Datum: 2026-01-06
-- Popis: Přidání testovacího neaktivního dodavatele pro ověření filtru
-- ENV: DEV

-- Vložení testovacího neaktivního dodavatele
INSERT INTO 25_dodavatele (
    nazev,
    ico,
    dic,
    adresa,
    kontakt_jmeno,
    kontakt_telefon,
    kontakt_email,
    aktivni,
    dt_vytvoreni,
    dt_aktualizace
) VALUES (
    'TESTOVACI NEAKTIVNI DODAVATEL s.r.o.',
    '99999999',
    'CZ99999999',
    'Testovaci 123, Praha 1, 110 00',
    'Jan Testovaci',
    '+420 999 999 999',
    'test@neaktivni.cz',
    0,  -- NEAKTIVNÍ
    NOW(),
    NOW()
);

-- Kontrola počtu aktivních vs neaktivních
SELECT 
    aktivni,
    COUNT(*) as pocet,
    GROUP_CONCAT(nazev SEPARATOR ', ') as nazvy
FROM 25_dodavatele
GROUP BY aktivni;

-- Poznámka:
-- - Frontend posílá include_inactive=false jako default (apiUniversalSearch.js)
-- - Backend SQL nyní má WHERE podmínku: AND (:include_inactive = 1 OR d.aktivni = 1)
-- - Funkce searchSuppliers() nyní binduje :include_inactive parametr
-- 
-- Test scenarios:
-- 1. include_inactive=false (default) -> zobrazí pouze aktivni=1
-- 2. include_inactive=true (admin?) -> zobrazí všechny včetně aktivni=0

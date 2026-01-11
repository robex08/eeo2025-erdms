-- =====================================================
-- SQL skript pro přidání klasifikace KOSILKA
-- Účel: Finanční kontrola jako příloha k objednávce
-- Datum: 29. prosince 2025
-- =====================================================

USE eeo2025-dev;

-- Kontrola existence
SELECT 'Kontrola existence KOSILKA klasifikace...' AS Status;

SELECT COUNT(*) AS existuje 
FROM stredisko_typ_prilohy 
WHERE kod_typu_prilohy = 'KOSILKA';

-- Vložení klasifikace KOSILKA (pokud neexistuje)
INSERT INTO stredisko_typ_prilohy 
  (kod_typu_prilohy, nazev, popis, aktivni, dt_vytvoreni)
SELECT 
  'KOSILKA',
  'Kontrolka',
  'Finanční kontrola objednávky - automaticky generovaný dokument',
  1,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM stredisko_typ_prilohy WHERE kod_typu_prilohy = 'KOSILKA'
);

-- Výsledná kontrola
SELECT 'VÝSLEDEK - Klasifikace KOSILKA:' AS Status;
SELECT 
  kod_typu_prilohy,
  nazev,
  popis,
  aktivni,
  dt_vytvoreni
FROM stredisko_typ_prilohy 
WHERE kod_typu_prilohy = 'KOSILKA';

-- Výpis všech existujících klasifikací pro kontext
SELECT 'KONTEXT - Všechny klasifikace příloh:' AS Status;
SELECT 
  kod_typu_prilohy,
  nazev,
  aktivni
FROM stredisko_typ_prilohy
WHERE aktivni = 1
ORDER BY nazev;

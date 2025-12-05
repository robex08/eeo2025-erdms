-- =====================================================
-- INSERT pro tabulku 25a_pokladny_uzivatele
-- Přiřazení pokladen uživatelům s číselnými řadami
-- =====================================================
-- Datum: 8. listopadu 2025
-- =====================================================

-- POKLADNA 100 - Sdílená pro admin a u09694
-- Číselné řady: VPD 599, PPD 499

INSERT INTO `25a_pokladny_uzivatele` (
  `uzivatel_id`,
  `cislo_pokladny`,
  `kod_pracoviste`,
  `nazev_pracoviste`,
  `ciselna_rada_vpd`,
  `ciselna_rada_ppd`,
  `je_hlavni`,
  `platne_od`,
  `platne_do`,
  `poznamka`,
  `vytvoreno`,
  `vytvoril`
) VALUES 
(
  1,                          -- admin (ID = 1)
  100,                        -- Pokladna číslo 100
  NULL,                       -- Kód pracoviště (sdílená)
  'Sdílená pokladna',         -- Název
  '599',                      -- VPD řada
  '499',                      -- PPD řada
  1,                          -- Je hlavní
  '2025-11-08',               -- Platnost od
  NULL,                       -- Aktivní (bez konce platnosti)
  'Sdílená pokladna pro admin a u09694',
  NOW(),
  1                           -- Vytvořil admin
),
(
  102,                        -- u09694 (ID = 102)
  100,                        -- Pokladna číslo 100 (STEJNÁ jako admin)
  NULL,                       -- Kód pracoviště (sdílená)
  'Sdílená pokladna',         -- Název
  '599',                      -- VPD řada (STEJNÁ)
  '499',                      -- PPD řada (STEJNÁ)
  1,                          -- Je hlavní
  '2025-11-08',               -- Platnost od
  NULL,                       -- Aktivní
  'Sdílená pokladna pro admin a u09694',
  NOW(),
  1                           -- Vytvořil admin
);

-- =====================================================
-- POKLADNA 101 - Test pro bezouskova
-- Číselné řady: VPD 599, PPD 498
-- =====================================================

INSERT INTO `25a_pokladny_uzivatele` (
  `uzivatel_id`,
  `cislo_pokladny`,
  `kod_pracoviste`,
  `nazev_pracoviste`,
  `ciselna_rada_vpd`,
  `ciselna_rada_ppd`,
  `je_hlavni`,
  `platne_od`,
  `platne_do`,
  `poznamka`,
  `vytvoreno`,
  `vytvoril`
) VALUES 
(
  105,                        -- bezouskova (ID = 105)
  101,                        -- Pokladna číslo 101
  'TEST',                     -- Kód pracoviště
  'Testovací pokladna',       -- Název
  '599',                      -- VPD řada
  '498',                      -- PPD řada
  1,                          -- Je hlavní
  '2025-11-08',               -- Platnost od
  NULL,                       -- Aktivní
  'Test DB pro testovacího uživatele bezouskova',
  NOW(),
  1                           -- Vytvořil admin
);

-- =====================================================
-- POKLADNA 102 - Test pro u03924
-- Číselné řady: VPD 599, PPD 497
-- =====================================================

INSERT INTO `25a_pokladny_uzivatele` (
  `uzivatel_id`,
  `cislo_pokladny`,
  `kod_pracoviste`,
  `nazev_pracoviste`,
  `ciselna_rada_vpd`,
  `ciselna_rada_ppd`,
  `je_hlavni`,
  `platne_od`,
  `platne_do`,
  `poznamka`,
  `vytvoreno`,
  `vytvoril`
) VALUES 
(
  100,                        -- u03924 (ID = 100)
  102,                        -- Pokladna číslo 102
  'TEST',                     -- Kód pracoviště
  'Testovací pokladna',       -- Název
  '599',                      -- VPD řada
  '497',                      -- PPD řada
  1,                          -- Je hlavní
  '2025-11-08',               -- Platnost od
  NULL,                       -- Aktivní
  'Test DB pro testovacího uživatele u03924',
  NOW(),
  1                           -- Vytvořil admin
);

-- =====================================================
-- KONTROLNÍ SELECT - Ověření vložených dat
-- =====================================================

SELECT 
  p.id,
  p.uzivatel_id,
  u.username AS 'Uživatel',
  p.cislo_pokladny AS 'Pokladna',
  p.ciselna_rada_vpd AS 'VPD řada',
  p.ciselna_rada_ppd AS 'PPD řada',
  p.nazev_pracoviste AS 'Název',
  p.je_hlavni AS 'Hlavní',
  p.poznamka AS 'Poznámka'
FROM `25a_pokladny_uzivatele` p
LEFT JOIN `25_uzivatele` u ON p.uzivatel_id = u.id
ORDER BY p.cislo_pokladny, p.uzivatel_id;

-- =====================================================
-- POZNÁMKY K IMPLEMENTACI
-- =====================================================

/*
SDÍLENÁ POKLADNA 100:
- Admin (ID=1) + u09694 (ID=102)
- Oba uživatelé uvidí STEJNÉ doklady
- Číslování bude: V599-001, V599-002, ... a P499-001, P499-002, ...

TESTOVACÍ POKLADNY:
- Pokladna 101 (bezouskova): PPD 498
- Pokladna 102 (u03924): PPD 497
- Oddělené číselné řady = oddělené doklady

PŘÍKLAD ČÍSLOVÁNÍ:
- Admin vytvoří výdaj → V599-001 (pokladna 100)
- u09694 vytvoří výdaj → V599-002 (pokladna 100, pokračuje)
- bezouskova vytvoří výdaj → V599-001 (pokladna 101, samostatná řada)
- u03924 vytvoří příjem → P497-001 (pokladna 102)
*/

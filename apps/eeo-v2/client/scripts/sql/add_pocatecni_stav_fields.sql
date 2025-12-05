-- ============================================================================
-- SQL SKRIPT: Přidání polí pro počáteční stav dokladů
-- ============================================================================
-- Datum: 8. listopadu 2025
-- Účel: Přidat pole vpd_od_cislo a ppd_od_cislo do tabulky 25a_pokladny_uzivatele
-- Tabulka: 25a_pokladny_uzivatele
-- MySQL verze: 5.5.43+
-- ============================================================================

-- KROK 1: Přidat pole pro počáteční číslo VPD dokladu (výdaje)
-- ----------------------------------------------------------------------------
ALTER TABLE `25a_pokladny_uzivatele`
ADD COLUMN `vpd_od_cislo` INT(11) DEFAULT 1 
  COMMENT 'Počáteční číslo VPD dokladu (výdaje od, např. 1, 50, 100)' 
  AFTER `ciselna_rada_vpd`;

-- KROK 2: Přidat pole pro počáteční číslo PPD dokladu (příjmy)
-- ----------------------------------------------------------------------------
ALTER TABLE `25a_pokladny_uzivatele`
ADD COLUMN `ppd_od_cislo` INT(11) DEFAULT 1 
  COMMENT 'Počáteční číslo PPD dokladu (příjmy od, např. 1, 25, 100)' 
  AFTER `ciselna_rada_ppd`;

-- ============================================================================
-- VERIFIKACE
-- ============================================================================

-- Ověření, že sloupce byly přidány
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  COLUMN_DEFAULT, 
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE 
  TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = '25a_pokladny_uzivatele'
  AND COLUMN_NAME IN ('vpd_od_cislo', 'ppd_od_cislo');

-- Očekávaný výstup:
-- +---------------+-------------+----------------+--------------------------------------------------------+
-- | COLUMN_NAME   | COLUMN_TYPE | COLUMN_DEFAULT | COLUMN_COMMENT                                         |
-- +---------------+-------------+----------------+--------------------------------------------------------+
-- | vpd_od_cislo  | int(11)     | 1              | Počáteční číslo VPD dokladu (výdaje od, např. 1, 50...) |
-- | ppd_od_cislo  | int(11)     | 1              | Počáteční číslo PPD dokladu (příjmy od, např. 1, 25...) |
-- +---------------+-------------+----------------+--------------------------------------------------------+

-- Ukázka struktury tabulky po úpravě
DESCRIBE `25a_pokladny_uzivatele`;

-- ============================================================================
-- TESTOVACÍ DATA (volitelné)
-- ============================================================================

-- Příklad 1: Výchozí hodnoty (začínat od 1)
INSERT INTO `25a_pokladny_uzivatele` (
  `uzivatel_id`,
  `cislo_pokladny`,
  `ciselna_rada_vpd`,
  `vpd_od_cislo`,
  `ciselna_rada_ppd`,
  `ppd_od_cislo`,
  `platne_od`,
  `vytvoreno`
) VALUES (
  1,              -- ID uživatele
  100,            -- Číslo pokladny
  '599',          -- VPD řada
  1,              -- Začínat VPD od 1 → V599-001
  '499',          -- PPD řada
  1,              -- Začínat PPD od 1 → P499-001
  '2025-11-08',
  NOW()
);

-- Příklad 2: Vlastní počáteční stav (migrace starých dat)
INSERT INTO `25a_pokladny_uzivatele` (
  `uzivatel_id`,
  `cislo_pokladny`,
  `ciselna_rada_vpd`,
  `vpd_od_cislo`,
  `ciselna_rada_ppd`,
  `ppd_od_cislo`,
  `platne_od`,
  `vytvoreno`
) VALUES (
  2,              -- ID uživatele
  101,            -- Číslo pokladny
  '591',          -- VPD řada
  50,             -- Začínat VPD od 50 → V591-050
  '491',          -- PPD řada
  25,             -- Začínat PPD od 25 → P491-025
  '2025-11-08',
  NOW()
);

-- Příklad 3: Různé počáteční stavy
INSERT INTO `25a_pokladny_uzivatele` (
  `uzivatel_id`,
  `cislo_pokladny`,
  `ciselna_rada_vpd`,
  `vpd_od_cislo`,
  `ciselna_rada_ppd`,
  `ppd_od_cislo`,
  `platne_od`,
  `vytvoreno`
) VALUES (
  3,              -- ID uživatele
  102,            -- Číslo pokladny
  '592',          -- VPD řada
  100,            -- Začínat VPD od 100 → V592-100
  '492',          -- PPD řada
  1,              -- Začínat PPD od 1 → P492-001
  '2025-11-08',
  NOW()
);

-- Ověření testovacích dat
SELECT 
  id,
  uzivatel_id,
  cislo_pokladny,
  ciselna_rada_vpd,
  vpd_od_cislo,
  ciselna_rada_ppd,
  ppd_od_cislo,
  platne_od
FROM `25a_pokladny_uzivatele`
ORDER BY id DESC
LIMIT 3;

-- ============================================================================
-- AKTUALIZACE EXISTUJÍCÍCH ZÁZNAMŮ (pokud potřeba)
-- ============================================================================

-- Pokud existují starší záznamy, které potřebují nastavit počáteční stav:

-- Ukázka: Nastavit VPD a PPD počáteční stav pro konkrétní pokladnu
UPDATE `25a_pokladny_uzivatele`
SET 
  `vpd_od_cislo` = 75,   -- Začínat VPD od 75
  `ppd_od_cislo` = 30    -- Začínat PPD od 30
WHERE 
  `id` = 123;            -- ID konkrétního přiřazení

-- Hromadná aktualizace: Všechny pokladny s VPD 591 začínají od 50
UPDATE `25a_pokladny_uzivatele`
SET 
  `vpd_od_cislo` = 50
WHERE 
  `ciselna_rada_vpd` = '591'
  AND `vpd_od_cislo` IS NULL;

-- ============================================================================
-- POZNÁMKY
-- ============================================================================

/*
POUŽITÍ V ČÍSLOVÁNÍ DOKLADŮ:
- Pokud vpd_od_cislo = 1 a ciselna_rada_vpd = '599'
  → První výdaj: V599-001
  → Druhý výdaj: V599-002
  → Třetí výdaj: V599-003

- Pokud vpd_od_cislo = 50 a ciselna_rada_vpd = '591'
  → První výdaj: V591-050
  → Druhý výdaj: V591-051
  → Třetí výdaj: V591-052

- Pokud ppd_od_cislo = 25 a ciselna_rada_ppd = '491'
  → První příjem: P491-025
  → Druhý příjem: P491-026
  → Třetí příjem: P491-027

MIGRACE STARÝCH DAT:
- Pokud importujete data ze staré pokladny, která má již čísla 1-49 použitá,
  nastavte vpd_od_cislo = 50 aby nedošlo ke kolizi.

VÝCHOZÍ HODNOTA:
- Nové záznamy automaticky dostanou vpd_od_cislo = 1 a ppd_od_cislo = 1
- To je nejčastější případ (začínat od 1)
*/

-- ============================================================================
-- KONEC SKRIPTU
-- ============================================================================

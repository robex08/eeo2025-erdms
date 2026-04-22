-- =============================================================================
-- INVENTIK - Návrh databázového schématu
-- =============================================================================
-- Návrh struktury tabulek pro import CSV dat
-- Připraveno k diskusi a úpravám!
-- 
-- =============================================================================

USE `inventik-dev`;

-- =============================================================================
-- 1. ČÍSELNÍK: BUDOVY
-- =============================================================================

CREATE TABLE IF NOT EXISTS `budovy` (
    `budt` VARCHAR(10) NOT NULL PRIMARY KEY COMMENT 'Kód budovy',
    `nazev` VARCHAR(255) NULL COMMENT 'Název budovy/objektu',
    `datum_zapujceni` DATE NULL COMMENT 'Datum zapůjčení budovy',
    `datum_ukonceni` DATE NULL COMMENT 'Datum ukončení půjčky',
    `poznamka` VARCHAR(255) NULL COMMENT 'Poznámka',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_nazev` (`nazev`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci 
COMMENT='Číselník budov a objektů (68 záznamů)';

-- =============================================================================
-- 2. ČÍSELNÍK: INVENTÁRNÍ ÚSEKY
-- =============================================================================

CREATE TABLE IF NOT EXISTS `inventarni_useky` (
    `cinv` INT UNSIGNED NOT NULL PRIMARY KEY COMMENT 'Kód inventárního úseku',
    `kod_pracovnik` INT UNSIGNED NULL COMMENT 'Kód pracovníka/odpovědné osoby',
    `nazev` VARCHAR(255) NULL COMMENT 'Název inv. úseku',
    `datum_zapujceni` DATE NULL COMMENT 'Datum zapůjčení',
    `datum_ukonceni` DATE NULL COMMENT 'Datum ukončení',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_nazev` (`nazev`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci 
COMMENT='Číselník inventárních úseků - org. jednotky (89 záznamů)';

-- =============================================================================
-- 3. ČÍSELNÍK: MÍSTNOSTI
-- =============================================================================

CREATE TABLE IF NOT EXISTS `mistnosti` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `budt` VARCHAR(10) NOT NULL COMMENT 'Kód budovy (FK)',
    `cislo_mistnosti` VARCHAR(20) NOT NULL COMMENT 'Číslo/označení místnosti',
    `popis` TEXT NULL COMMENT 'Popis/název místnosti',
    `datum_zapujceni` DATE NULL COMMENT 'Datum zapůjčení',
    `datum_ukonceni` DATE NULL COMMENT 'Datum ukončení',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_budova_mistnost` (`budt`, `cislo_mistnosti`),
    INDEX `idx_budova` (`budt`),
    INDEX `idx_cislo` (`cislo_mistnosti`),
    FOREIGN KEY (`budt`) REFERENCES `budovy`(`budt`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci 
COMMENT='Číselník místností (2,098 záznamů)';

-- =============================================================================
-- 4. HLAVNÍ TABULKA: MAJETEK
-- =============================================================================

CREATE TABLE IF NOT EXISTS `majetek` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- IDENTIFIKACE
    `inventarni_cislo` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Inventární číslo (např. D01040076)',
    `cinv` INT UNSIGNED NULL COMMENT 'Inventární úsek (FK)',
    `budt` VARCHAR(10) NULL COMMENT 'Kód budovy (FK)',
    `cislo_mistnosti` VARCHAR(20) NULL COMMENT 'Číslo místnosti (FK)',
    
    -- ZÁKLADNÍ ÚDAJE
    `nazev` VARCHAR(500) NOT NULL COMMENT 'Název majetku',
    `popis` TEXT NULL COMMENT 'Podrobný popis',
    
    -- EKONOMICKÉ ÚDAJE
    `datum_zarazeni` DATE NULL COMMENT 'Datum zařazení do evidence',
    `porizovaci_cena` DECIMAL(12,2) NULL COMMENT 'Pořizovací cena v Kč',
    `merna_jednotka` VARCHAR(20) NULL COMMENT 'ks, m2, atd.',
    `mnozstvi` DECIMAL(10,3) DEFAULT 1.000 COMMENT 'Množství',
    `celkova_cena` DECIMAL(12,2) NULL COMMENT 'Celková cena (cena * množství)',
    
    -- ÚČETNÍ ÚDAJE
    `ucet` VARCHAR(10) NULL COMMENT 'Účetní třída (85, 86, 81)',
    `trida` VARCHAR(10) NULL COMMENT 'Třídění majetku',
    
    -- DOKLADY
    `cislo_dokladu` VARCHAR(50) NULL COMMENT 'Číslo pořizovacího dokladu',
    `dodavatel` VARCHAR(255) NULL COMMENT 'Dodavatel',
    
    -- TECHNICKÉ ÚDAJE
    `vyrobni_cislo` VARCHAR(100) NULL COMMENT 'Výrobní/sériové číslo',
    `rok_vyroby` INT NULL COMMENT 'Rok výroby',
    `nomenkl` VARCHAR(50) NULL COMMENT 'Nomenklatura',
    `kategorie` VARCHAR(50) NULL COMMENT 'Kategorie majetku',
    `typ_majetku` INT NULL COMMENT 'Typ majetku',
    
    -- OSTATNÍ SLOUPCE (z CSV)
    `osc` VARCHAR(50) NULL COMMENT 'OSC?',
    `datum_zapujceni` DATE NULL COMMENT 'Datum zapůjčení',
    `pohyb` VARCHAR(10) NULL COMMENT 'Pohyb (861)',
    `skp` VARCHAR(20) NULL COMMENT 'SKP kód',
    `czcpa` VARCHAR(20) NULL COMMENT 'CZCPA',
    `jkpov` VARCHAR(20) NULL COMMENT 'JKPOV',
    `druh` VARCHAR(20) NULL COMMENT 'Druh',
    
    -- SPRÁVA
    `poznamka` TEXT NULL COMMENT 'Poznámky',
    `obrazky` TEXT NULL COMMENT 'Cesta k obrázkům',
    `prilohy` TEXT NULL COMMENT 'Přílohy',
    
    -- TECHNICKÉ SLOUPCE
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- INDEXY
    INDEX `idx_inv_cislo` (`inventarni_cislo`),
    INDEX `idx_cinv` (`cinv`),
    INDEX `idx_budova` (`budt`),
    INDEX `idx_mistnost` (`budt`, `cislo_mistnosti`),
    INDEX `idx_nazev` (`nazev`(255)),
    INDEX `idx_datum_zarazeni` (`datum_zarazeni`),
    INDEX `idx_ucet` (`ucet`),
    
    -- FOREIGN KEYS
    FOREIGN KEY (`cinv`) REFERENCES `inventarni_useky`(`cinv`) ON DELETE SET NULL,
    FOREIGN KEY (`budt`) REFERENCES `budovy`(`budt`) ON DELETE SET NULL
    -- Poznámka: FK na místnost by byla (budt, cislo_mistnosti) - složitější
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci 
COMMENT='Hlavní tabulka majetku (17,101 položek)';

-- =============================================================================
-- VIEWS pro usnadnění práce
-- =============================================================================

-- Pohled s kompletními informacemi o majetku
CREATE OR REPLACE VIEW `v_majetek_kompletni` AS
SELECT 
    m.id,
    m.inventarni_cislo,
    m.nazev,
    m.porizovaci_cena,
    m.datum_zarazeni,
    
    -- Inventární úsek
    iu.nazev AS inv_usek_nazev,
    
    -- Budova
    b.nazev AS budova_nazev,
    
    -- Místnost
    mi.popis AS mistnost_popis,
    
    m.poznamka
FROM majetek m
LEFT JOIN inventarni_useky iu ON m.cinv = iu.cinv
LEFT JOIN budovy b ON m.budt = b.budt
LEFT JOIN mistnosti mi ON m.budt = mi.budt AND m.cislo_mistnosti = mi.cislo_mistnosti;

-- =============================================================================
-- TESTOVACÍ DOTAZY
-- =============================================================================

-- Počet záznamů v tabulkách
-- SELECT 'budovy' as tabulka, COUNT(*) as pocet FROM budovy
-- UNION ALL
-- SELECT 'inventarni_useky', COUNT(*) FROM inventarni_useky
-- UNION ALL
-- SELECT 'mistnosti', COUNT(*) FROM mistnosti
-- UNION ALL
-- SELECT 'majetek', COUNT(*) FROM majetek;

-- Majetek podle budov
-- SELECT b.nazev, COUNT(m.id) as pocet_polozek, SUM(m.porizovaci_cena) as celkova_hodnota
-- FROM budovy b
-- LEFT JOIN majetek m ON b.budt = m.budt
-- GROUP BY b.budt, b.nazev
-- ORDER BY pocet_polozek DESC;

-- =============================================================================
-- POZNAMKY K IMPORTU
-- =============================================================================

/*
POSTUP IMPORTU:

1. Import budovy.csv -> budovy (68 řádků)
2. Import inv-usek.csv -> inventarni_useky (89 řádků)  
3. Import mistnostni.csv -> mistnosti (2,098 řádků)
4. Import 26-04-22-ppsa.csv -> majetek (17,101 řádků)

DATOVÉ TRANSFORMACE:
- Datum: DD.MM.YYYY -> YYYY-MM-DD
- Decimal: 22211,40 -> 22211.40 (čárka na tečku)
- NULL hodnoty: prázdné řetězce -> NULL

UPOZORNĚNÍ:
- Kontrola integrity vazeb (existují budovy/úseky/místnosti v CSV?)
- Duplicity v inventárních číslech?
- Chybějící povinné údaje?
*/

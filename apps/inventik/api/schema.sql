-- =============================================================================
-- INVENTIK - Databázové schéma pro import CSV (1:1 mapování)
-- =============================================================================
-- Všechny sloupce z CSV importujeme 1:1, pozdější úpravy možné
-- 
-- =============================================================================

USE `inventik-dev`;

-- =============================================================================
-- 1. BUDOVY (budovy.csv - 68 záznamů)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `budovy` (
    `budt` VARCHAR(10) NOT NULL PRIMARY KEY COMMENT 'Kód budovy',
    `budovat` VARCHAR(255) NULL COMMENT 'Název budovy',
    `zaplf` VARCHAR(50) NULL COMMENT 'Datum zapůjčení (原始)',
    `koplf` VARCHAR(50) NULL COMMENT 'Datum ukončení (原始)',
    `bmist` VARCHAR(255) NULL COMMENT 'Další údaj',
    `datum_zapujceni` DATE NULL COMMENT 'Zapůjčení (převedeno)',
    `datum_ukonceni` DATE NULL COMMENT 'Ukončení (převedeno)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_nazev` (`budovat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- =============================================================================
-- 2. INVENTÁRNÍ ÚSEKY (inv-usek.csv - 89 záznamů)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `inventarni_useky` (
    `cinv` INT UNSIGNED NOT NULL PRIMARY KEY COMMENT 'Kód inv. úseku',
    `prac` INT UNSIGNED NULL COMMENT 'Kód pracovníka',
    `nazinv` VARCHAR(255) NULL COMMENT 'Název úseku',
    `zaplf` VARCHAR(50) NULL COMMENT 'Datum zapůjčení (原始)',
    `koplf` VARCHAR(50) NULL COMMENT 'Datum ukončení (原始)',
    `datum_zapujceni` DATE NULL COMMENT 'Zapůjčení (převedeno)',
    `datum_ukonceni` DATE NULL COMMENT 'Ukončení (převedeno)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_nazev` (`nazinv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- =============================================================================
-- 3. MÍSTNOSTI (mistnostni.csv - 2,098 záznamů)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `mistnosti` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `budt` VARCHAR(10) NOT NULL COMMENT 'Kód budovy',
    `mist` VARCHAR(20) NOT NULL COMMENT 'Číslo místnosti',
    `mistt` TEXT NULL COMMENT 'Popis místnosti',
    `zaplf` VARCHAR(50) NULL COMMENT 'Datum zapůjčení (原始)',
    `koplf` VARCHAR(50) NULL COMMENT 'Datum ukončení (原始)',
    `datum_zapujceni` DATE NULL COMMENT 'Zapůjčení (převedeno)',
    `datum_ukonceni` DATE NULL COMMENT 'Ukončení (převedeno)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_budova_mistnost` (`budt`, `mist`),
    INDEX `idx_budova` (`budt`),
    INDEX `idx_cislo` (`mist`),
    FOREIGN KEY (`budt`) REFERENCES `budovy`(`budt`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- =============================================================================
-- 4. MAJETEK (26-04-22-ppsa.csv - 17,101 záznamů)
-- VŠECH 43 SLOUPCŮ 1:1 z CSV!
-- =============================================================================

CREATE TABLE IF NOT EXISTS `majetek` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    
    -- CSV sloupce 1:1 (zachováno originální pojmenování kde možné)
    `cinv` INT UNSIGNED NULL COMMENT 'Inventární úsek (FK)',
    `cislo` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Inventární číslo (PK z CSV)',
    `budt` VARCHAR(10) NULL COMMENT 'Kód budovy (FK)',
    `mist` VARCHAR(20) NULL COMMENT 'Číslo místnosti (FK)',
    `osc` VARCHAR(50) NULL COMMENT 'OSC',
    `zapl` VARCHAR(50) NULL COMMENT 'Zapůjčení (原始)',
    `nazev` VARCHAR(500) NULL COMMENT 'Název majetku',
    `poh` VARCHAR(50) NULL COMMENT 'Pohyb',
    `nomenkl` VARCHAR(100) NULL COMMENT 'Nomenklátor',
    `kat` VARCHAR(50) NULL COMMENT 'Kategorie',
    `typmajet` VARCHAR(50) NULL COMMENT 'Typ majetku',
    `ucet` VARCHAR(50) NULL COMMENT 'Účet',
    `datzar` VARCHAR(50) NULL COMMENT 'Datum zařazení (原始)',
    `trida` VARCHAR(50) NULL COMMENT 'Třída',
    `mj` VARCHAR(50) NULL COMMENT 'Měrná jednotka',
    `cenamj` VARCHAR(50) NULL COMMENT 'Cena MJ (原始)',
    `czcpa` VARCHAR(50) NULL COMMENT 'CZCPA',
    `skp` VARCHAR(50) NULL COMMENT 'SKP',
    `jkpov` VARCHAR(50) NULL COMMENT 'JKPOV',
    `druh` VARCHAR(50) NULL COMMENT 'Druh',
    `cmnoz` VARCHAR(50) NULL COMMENT 'Množství (原始)',
    `ccena` VARCHAR(50) NULL COMMENT 'Celková cena (原始)',
    `fizd` VARCHAR(50) NULL COMMENT 'FIZD',
    `hjz` VARCHAR(50) NULL COMMENT 'HJZ',
    `dod` VARCHAR(255) NULL COMMENT 'Dodavatel',
    `cdokpor` VARCHAR(100) NULL COMMENT 'Číslo dokladu pořízení',
    `cdok` VARCHAR(100) NULL COMMENT 'Číslo dokladu',
    `vyrcis` VARCHAR(100) NULL COMMENT 'Výrobní číslo',
    `rok` VARCHAR(50) NULL COMMENT 'Rok',
    `evcis` VARCHAR(100) NULL COMMENT 'Evidenční číslo',
    `cinnost` VARCHAR(50) NULL COMMENT 'Činnost',
    `zak` VARCHAR(50) NULL COMMENT 'Zakázka',
    `najz` VARCHAR(50) NULL COMMENT 'NAJZ',
    `naji` VARCHAR(50) NULL COMMENT 'NAJI',
    `naj` VARCHAR(50) NULL COMMENT 'NAJ',
    `pracn` VARCHAR(50) NULL COMMENT 'Pracovník',
    `datpok` VARCHAR(50) NULL COMMENT 'Datum poklesu (原始)',
    `kontr` VARCHAR(50) NULL COMMENT 'Kontr',
    `zpinv` VARCHAR(50) NULL COMMENT 'ZPINV',
    `zptck` VARCHAR(50) NULL COMMENT 'ZPTCK',
    `pozn` TEXT NULL COMMENT 'Poznámka',
    `obr` TEXT NULL COMMENT 'Obrázky',
    `prilohy` TEXT NULL COMMENT 'Přílohy',
    
    -- Převedené hodnoty (pro snadnější práci)
    `datum_zarazeni` DATE NULL COMMENT 'Datum zařazení (převedeno)',
    `datum_zapujceni` DATE NULL COMMENT 'Zapůjčení (převedeno)',
    `datum_poklesu` DATE NULL COMMENT 'Pokles (převedeno)',
    `cena_mj_num` DECIMAL(12,2) NULL COMMENT 'Cena MJ (číslo)',
    `mnozstvi_num` DECIMAL(10,3) NULL COMMENT 'Množství (číslo)',
    `celkova_cena_num` DECIMAL(12,2) NULL COMMENT 'Celková cena (číslo)',
    `rok_num` INT NULL COMMENT 'Rok (číslo)',
    
    -- Technické sloupce
    `mistnost_nalezena` BOOLEAN DEFAULT TRUE COMMENT 'Zda byla místnost nalezena v číselníku',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexy
    INDEX `idx_cislo` (`cislo`),
    INDEX `idx_cinv` (`cinv`),
    INDEX `idx_budt` (`budt`),
    INDEX `idx_mist` (`budt`, `mist`),
    INDEX `idx_nazev` (`nazev`(255)),
    INDEX `idx_datum_zarazeni` (`datum_zarazeni`),
    INDEX `idx_ucet` (`ucet`),
    INDEX `idx_mistnost_nalezena` (`mistnost_nalezena`),
    
    -- Foreign keys
    FOREIGN KEY (`cinv`) REFERENCES `inventarni_useky`(`cinv`) ON DELETE SET NULL,
    FOREIGN KEY (`budt`) REFERENCES `budovy`(`budt`) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- =============================================================================
-- VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW `v_majetek_prehled` AS
SELECT 
    m.id,
    m.cislo AS inventarni_cislo,
    m.nazev,
    m.cena_mj_num AS cena,
    m.datum_zarazeni,
    iu.nazinv AS inventarni_usek,
    b.budovat AS budova,
    mi.mistt AS mistnost,
    m.mistnost_nalezena,
    CASE 
        WHEN m.mistnost_nalezena = 0 THEN 'NEZAŘAZEN'
        ELSE 'OK'
    END AS status_umisteni
FROM majetek m
LEFT JOIN inventarni_useky iu ON m.cinv = iu.cinv
LEFT JOIN budovy b ON m.budt = b.budt
LEFT JOIN mistnosti mi ON m.budt = mi.budt AND m.mist = mi.mist;

-- =============================================================================
-- Info
-- =============================================================================

SELECT 'Schéma vytvořeno - připraveno k importu CSV' as Status;

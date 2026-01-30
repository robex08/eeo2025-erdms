-- =============================================================================
-- 💰 EVIDENCE ROČNÍCH POPLATKŮ - SQL MIGRACE PRO PRODUKCI
-- =============================================================================
-- Databáze: eeo2025
-- Datum: 2026-01-27
-- Verze: 1.0.0
-- =============================================================================

-- ⚠️ KRITICKÉ UPOZORNĚNÍ: 
-- Tento skript běží na PRODUKČNÍ databázi!
-- Před spuštěním:
-- 1. Vytvořit zálohu databáze eeo2025
-- 2. Otestovat v DEV prostředí (EEO-OSTRA-DEV)
-- 3. Naplánovat údržbové okno (doporučený čas: 00:00-02:00)
-- 4. Notifikovat uživatele o plánované údržbě

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- ČÁST 1: ČÍSELNÍKY V TABULCE 25_ciselnik_stavy
-- =============================================================================

-- 1️⃣ Stavy ročního poplatku (typ_objektu = 'ROCNI_POPLATEK')

INSERT INTO `25_ciselnik_stavy` 
  (`typ_objektu`, `kod_stavu`, `nadrazeny_kod_stavu`, `nazev_stavu`, `popis`, `platnost_do`, `aktivni`, `atribut_objektu`) 
VALUES
  ('ROCNI_POPLATEK', 'ZAPLACENO', '', 'Zaplaceno', 'Poplatek byl zaplacen', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK', 'NEZAPLACENO', '', 'Nezaplaceno', 'Poplatek čeká na zaplacení', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK', 'V_RESENI', '', 'V řešení', 'Problém s platbou, vyžaduje pozornost', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK', 'JINE', '', 'Jiné', 'Jiný stav poplatku', '2100-12-21', 1, 0);

-- 2️⃣ Druh ročního poplatku (typ_objektu = 'ROCNI_POPLATEK_DRUH')

INSERT INTO `25_ciselnik_stavy` 
  (`typ_objektu`, `kod_stavu`, `nadrazeny_kod_stavu`, `nazev_stavu`, `popis`, `platnost_do`, `aktivni`, `atribut_objektu`) 
VALUES
  ('ROCNI_POPLATEK_DRUH', 'NAJEMNI', '', 'Nájemní', 'Nájemné prostor, zařízení', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_DRUH', 'ENERGIE', '', 'Energie', 'Energie (elektřina, plyn, voda)', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_DRUH', 'POPLATKY', '', 'Poplatky', 'Různé poplatky a služby', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_DRUH', 'JINE', '', 'Jiné', 'Jiný druh poplatku', '2100-12-21', 1, 0);

-- 3️⃣ Typ platby / Frekvence (typ_objektu = 'ROCNI_POPLATEK_PLATBA')

INSERT INTO `25_ciselnik_stavy` 
  (`typ_objektu`, `kod_stavu`, `nadrazeny_kod_stavu`, `nazev_stavu`, `popis`, `platnost_do`, `aktivni`, `atribut_objektu`) 
VALUES
  ('ROCNI_POPLATEK_PLATBA', 'MESICNI', '', 'Měsíční', 'Měsíční platba - automaticky vytvoří 12 položek', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_PLATBA', 'KVARTALNI', '', 'Kvartální', 'Čtvrtletní platba - automaticky vytvoří 4 položky', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_PLATBA', 'ROCNI', '', 'Roční', 'Roční platba - vytvoří 1 položku', '2100-12-21', 1, 0),
  ('ROCNI_POPLATEK_PLATBA', 'JINA', '', 'Jiná', 'Jiná frekvence - umožní dynamické přidávání položek', '2100-12-21', 1, 0);

-- =============================================================================
-- ČÁST 2: HLAVNÍ TABULKA - 25a_rocni_poplatky
-- =============================================================================

CREATE TABLE IF NOT EXISTS `25a_rocni_poplatky` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  
  -- VAZBY NA EXISTUJÍCÍ ENTITY
  `smlouva_id` INT(11) NOT NULL COMMENT 'Vazba na 25_smlouvy.id',
  `dodavatel_id` INT(10) UNSIGNED NULL COMMENT 'Vazba na 25_dodavatele.id (zkopírováno ze smlouvy)',
  
  -- ZÁKLADNÍ ÚDAJE
  `nazev` VARCHAR(255) NOT NULL COMMENT 'Název ročního poplatku',
  `popis` TEXT NULL COMMENT 'Popis poplatku',
  `poznamka` TEXT NULL COMMENT 'Poznámka k ročnímu poplatku',
  `rok` YEAR NOT NULL COMMENT 'Rok poplatků (2026, 2027...)',
  
  -- ČÍSELNÍKOVÉ KATEGORIE
  `druh` VARCHAR(50) NOT NULL DEFAULT 'JINE' COMMENT 'FK na 25_ciselnik_stavy WHERE typ_objektu=ROCNI_POPLATEK_DRUH',
  `platba` VARCHAR(50) NOT NULL DEFAULT 'MESICNI' COMMENT 'FK na 25_ciselnik_stavy WHERE typ_objektu=ROCNI_POPLATEK_PLATBA',
  
  -- FINANČNÍ ÚDAJE (COMPUTED)
  `celkova_castka` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Celková roční částka',
  `zaplaceno_celkem` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Již zaplaceno',
  `zbyva_zaplatit` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Zbývá zaplatit',
  
  -- STAV
  `stav` VARCHAR(50) NOT NULL DEFAULT 'NEZAPLACENO' COMMENT 'FK na 25_ciselnik_stavy WHERE typ_objektu=ROCNI_POPLATEK',
  
  -- ROZŠIŘUJÍCÍ JSON POLE
  `rozsirujici_data` JSON NULL COMMENT 'Flexibilní JSON pro budoucí rozšíření',
  
  -- AUDIT TRAIL
  `vytvoril_uzivatel_id` INT(10) NOT NULL COMMENT 'FK na 25_uzivatele.id',
  `aktualizoval_uzivatel_id` INT(10) UNSIGNED NULL COMMENT 'FK na 25_uzivatele.id',
  `dt_vytvoreni` DATETIME NOT NULL COMMENT 'Datum vytvoření (česká timezone)',
  `dt_aktualizace` DATETIME NULL COMMENT 'Datum poslední aktualizace',
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Aktivní záznam',
  
  PRIMARY KEY (`id`),
  INDEX `idx_smlouva` (`smlouva_id`),
  INDEX `idx_dodavatel` (`dodavatel_id`),
  INDEX `idx_rok` (`rok`),
  INDEX `idx_druh` (`druh`),
  INDEX `idx_platba` (`platba`),
  INDEX `idx_stav` (`stav`),
  INDEX `idx_aktivni` (`aktivni`),
  INDEX `idx_vytvoril` (`vytvoril_uzivatel_id`),
  INDEX `idx_dt_vytvoreni` (`dt_vytvoreni`),
  
  CONSTRAINT `fk_rocni_poplatky_smlouva` 
    FOREIGN KEY (`smlouva_id`) REFERENCES `25_smlouvy` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rocni_poplatky_dodavatel` 
    FOREIGN KEY (`dodavatel_id`) REFERENCES `25_dodavatele` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rocni_poplatky_vytvoril` 
    FOREIGN KEY (`vytvoril_uzivatel_id`) REFERENCES `25_uzivatele` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Roční poplatky - hlavní řádky';

-- =============================================================================
-- ČÁST 3: TABULKA POLOŽEK - 25a_rocni_poplatky_polozky
-- =============================================================================

CREATE TABLE IF NOT EXISTS `25a_rocni_poplatky_polozky` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  
  -- VAZBA NA ROČNÍ POPLATEK
  `rocni_poplatek_id` INT(10) UNSIGNED NOT NULL COMMENT 'FK na 25a_rocni_poplatky.id',
  
  -- VAZBA NA FAKTURY
  `faktura_id` INT(10) NULL COMMENT 'FK na 25a_objednavky_faktury.id',
  
  -- ÚDAJE O PLATBĚ
  `poradi` INT(3) NOT NULL COMMENT 'Pořadí položky',
  `nazev_polozky` VARCHAR(255) NOT NULL COMMENT 'Název položky',
  `castka` DECIMAL(15,2) NOT NULL COMMENT 'Částka k zaplacení',
  `datum_splatnosti` DATE NOT NULL COMMENT 'Datum splatnosti',
  `datum_zaplaceni` DATE NULL COMMENT 'Skutečné datum zaplacení',
  
  -- STAV POLOŽKY
  `stav` VARCHAR(50) NOT NULL DEFAULT 'NEZAPLACENO' COMMENT 'FK na 25_ciselnik_stavy WHERE typ_objektu=ROCNI_POPLATEK',
  
  -- POZNÁMKY
  `poznamka` TEXT NULL COMMENT 'Poznámka k položce',
  
  -- ROZŠIŘUJÍCÍ JSON POLE
  `rozsirujici_data` JSON NULL COMMENT 'Flexibilní JSON pro budoucí rozšíření',
  
  -- AUDIT TRAIL
  `vytvoril_uzivatel_id` INT(10) NOT NULL COMMENT 'FK na 25_uzivatele.id',
  `aktualizoval_uzivatel_id` INT(10) UNSIGNED NULL COMMENT 'FK na 25_uzivatele.id',
  `dt_vytvoreni` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `dt_aktualizace` DATETIME NULL COMMENT 'Datum poslední aktualizace',
  `aktivni` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Aktivní záznam',
  
  PRIMARY KEY (`id`),
  INDEX `idx_rocni_poplatek` (`rocni_poplatek_id`),
  INDEX `idx_faktura` (`faktura_id`),
  INDEX `idx_stav` (`stav`),
  INDEX `idx_datum_splatnosti` (`datum_splatnosti`),
  INDEX `idx_datum_zaplaceni` (`datum_zaplaceni`),
  INDEX `idx_aktivni` (`aktivni`),
  INDEX `idx_poradi` (`poradi`),
  
  CONSTRAINT `fk_rocpol_rocni_poplatek` 
    FOREIGN KEY (`rocni_poplatek_id`) REFERENCES `25a_rocni_poplatky` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rocpol_faktura` 
    FOREIGN KEY (`faktura_id`) REFERENCES `25a_objednavky_faktury` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rocpol_vytvoril` 
    FOREIGN KEY (`vytvoril_uzivatel_id`) REFERENCES `25_uzivatele` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Položky ročních poplatků - automaticky generované podle typu platby';

-- =============================================================================
-- ČÁST 4: TABULKA PŘÍLOH - 25a_rocni_poplatky_prilohy
-- =============================================================================

CREATE TABLE IF NOT EXISTS `25a_rocni_poplatky_prilohy` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  
  -- VAZBA NA ROČNÍ POPLATEK (hlavní řádek)
  `rocni_poplatek_id` INT(10) UNSIGNED NOT NULL COMMENT 'Vazba na 25a_rocni_poplatky.id',
  
  -- ÚDAJE O SOUBORU
  `guid` VARCHAR(50) DEFAULT NULL COMMENT 'GUID pro jedinečnost souboru',
  `typ_prilohy` VARCHAR(50) DEFAULT NULL COMMENT 'Klasifikace přílohy (např. SMLOUVA, FAKTURA, JINE)',
  `originalni_nazev_souboru` VARCHAR(255) NOT NULL COMMENT 'Původní název souboru',
  `systemova_cesta` VARCHAR(255) NOT NULL COMMENT 'Cesta k souboru na disku (relativní, prefix: rp)',
  `velikost_souboru_b` INT(10) UNSIGNED DEFAULT NULL COMMENT 'Velikost souboru v bytech',
  
  -- AUDIT TRAIL
  `nahrano_uzivatel_id` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který nahrál soubor',
  `dt_vytvoreni` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Datum a čas vytvoření',
  `dt_aktualizace` DATETIME DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  
  PRIMARY KEY (`id`),
  INDEX `idx_rocni_poplatek_id` (`rocni_poplatek_id`),
  INDEX `idx_nahrano_uzivatel_id` (`nahrano_uzivatel_id`),
  INDEX `idx_guid` (`guid`),
  INDEX `idx_dt_vytvoreni` (`dt_vytvoreni`),
  
  CONSTRAINT `fk_rp_prilohy_rocni_poplatek`
    FOREIGN KEY (`rocni_poplatek_id`) 
    REFERENCES `25a_rocni_poplatky` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  
  CONSTRAINT `fk_rp_prilohy_uzivatel`
    FOREIGN KEY (`nahrano_uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci 
COMMENT='Přílohy k ročním poplatkům (hlavní řádky) - prefix: rp';

-- =============================================================================
-- ČÁST 5: OVĚŘENÍ INSTALACE
-- =============================================================================

SELECT 
  'ROCNI_POPLATEK' as typ,
  COUNT(*) as pocet_zaznamu
FROM `25_ciselnik_stavy` 
WHERE typ_objektu = 'ROCNI_POPLATEK'
UNION ALL
SELECT 
  'ROCNI_POPLATEK_DRUH' as typ,
  COUNT(*) as pocet_zaznamu
FROM `25_ciselnik_stavy` 
WHERE typ_objektu = 'ROCNI_POPLATEK_DRUH'
UNION ALL
SELECT 
  'ROCNI_POPLATEK_PLATBA' as typ,
  COUNT(*) as pocet_zaznamu
FROM `25_ciselnik_stavy` 
WHERE typ_objektu = 'ROCNI_POPLATEK_PLATBA';

SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME IN ('25a_rocni_poplatky', '25a_rocni_poplatky_polozky', '25a_rocni_poplatky_prilohy');

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- ✅ MIGRACE DOKONČENA - PRODUKCE
-- =============================================================================
-- Vytvořeno:
-- - 12 číselníkových záznamů v 25_ciselnik_stavy (3 typy objektů)
-- - 3 nové tabulky (hlavička + položky + přílohy)
-- - Všechny indexy a foreign keys
-- 
-- Poznámky:
-- - Přílohy jsou vztaženy k hlavnímu řádku (ne k podřádkům)
-- - Při ukládání použít prefix "rp" pro soubory
-- 
-- ⚠️ AFTER DEPLOYMENT:
-- 1. Zkontrolovat logy aplikace
-- 2. Sledovat výkon databáze
-- 3. Testovat vytvoření prvního ročního poplatku
-- 4. Verifikovat automatické generování položek
-- =============================================================================

-- =====================================================
-- MIGRACE: Přidání příloh k fakturám
-- Datum: 2025-10-27
-- Verze MySQL: 5.5.43
-- Popis: Vytvoření tabulky pro přílohy faktur s podporou ISDOC
-- =====================================================

-- ⚠️ FIX PRO ERRNO 150 (Foreign Key Constraint Failed)
-- Pokud tabulka selže s chybou errno 150, zkontrolujte:
--
-- 1. Datové typy v referenčních tabulkách:
--    SHOW CREATE TABLE `25a_faktury_objednavek`;  -- kontrola id (INT vs INT UNSIGNED)
--    SHOW CREATE TABLE `25a_objednavky`;           -- kontrola id
--    SHOW CREATE TABLE `25_uzivatele`;             -- kontrola id
--
-- 2. Ujistěte se že typy odpovídají:
--    - Pokud ref. tabulky mají INT(10), tak i zde INT(10)
--    - Pokud ref. tabulky mají INT(10) UNSIGNED, odkomentujte níže UNSIGNED verzi
--
-- 3. Ujistěte se že ref. tabulky existují:
--    SELECT * FROM `25a_faktury_objednavek` LIMIT 1;
--    SELECT * FROM `25a_objednavky` LIMIT 1;
--    SELECT * FROM `25_uzivatele` LIMIT 1;
--
-- Aktuální verze: INT(10) BEZ UNSIGNED (nejčastější případ)
-- =====================================================

-- 1. Vytvoření tabulky pro přílohy faktur
-- Poznámka: MySQL 5.5 nepodporuje IF NOT EXISTS pro indexy a FK,
-- takže kontrola existence musí být manuální před spuštěním

-- FIX pro errno 150: Odstraněno UNSIGNED z id (kompatibilita s referenčními tabulkami)
CREATE TABLE IF NOT EXISTS `25a_faktury_prilohy` (
  `id` INT(10) NOT NULL AUTO_INCREMENT COMMENT 'Primární klíč',
  `faktura_id` INT(10) NOT NULL COMMENT 'Vazba na fakturu (25a_faktury_objednavek)',
  `objednavka_id` INT(10) NOT NULL COMMENT 'Vazba na objednávku (pro rychlé dotazy)',
  `guid` VARCHAR(50) DEFAULT NULL COMMENT 'GUID pro jedinečnost souboru',
  `typ_prilohy` VARCHAR(50) DEFAULT NULL COMMENT 'Klasifikace: FAKTURA, ISDOC, DOPLNEK_FA',
  `originalni_nazev_souboru` VARCHAR(255) NOT NULL COMMENT 'Původní název souboru',
  `systemova_cesta` VARCHAR(255) NOT NULL COMMENT 'Cesta k souboru na disku (relativní)',
  `velikost_souboru_b` INT(10) DEFAULT NULL COMMENT 'Velikost v bytech',
  `je_isdoc` TINYINT(1) NOT NULL DEFAULT '0' COMMENT 'Flag: je to ISDOC soubor?',
  `isdoc_parsed` TINYINT(1) NOT NULL DEFAULT '0' COMMENT 'Flag: byla extrahována ISDOC data?',
  `isdoc_data_json` TEXT COMMENT 'JSON s extrahovanými ISDOC daty (budoucí)',
  `nahrano_uzivatel_id` INT(10) DEFAULT NULL COMMENT 'ID uživatele který nahrál soubor',
  `dt_vytvoreni` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Datum a čas vytvoření',
  `dt_aktualizace` TIMESTAMP NULL DEFAULT NULL COMMENT 'Datum a čas poslední aktualizace',
  
  PRIMARY KEY (`id`),
  KEY `faktura_id` (`faktura_id`),
  KEY `objednavka_id` (`objednavka_id`),
  KEY `nahrano_uzivatel_id` (`nahrano_uzivatel_id`),
  KEY `je_isdoc` (`je_isdoc`),
  KEY `guid` (`guid`),
  
  CONSTRAINT `fk_faktury_prilohy_faktura` 
    FOREIGN KEY (`faktura_id`) 
    REFERENCES `25a_faktury_objednavek` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT `fk_faktury_prilohy_objednavka` 
    FOREIGN KEY (`objednavka_id`) 
    REFERENCES `25a_objednavky` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT `fk_faktury_prilohy_uzivatel` 
    FOREIGN KEY (`nahrano_uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Přílohy k fakturám (PDF, ISDOC, apod.)';

-- =====================================================
-- CRUD OPERACE - Vzorové SQL dotazy pro Backend
-- =====================================================

-- -----------------------------------------------------
-- CREATE: Vložení nové přílohy faktury
-- -----------------------------------------------------
-- Parametry: :faktura_id, :objednavka_id, :guid, :typ_prilohy, 
--            :originalni_nazev, :systemova_cesta, :velikost, 
--            :je_isdoc, :nahrano_uzivatel_id
-- -----------------------------------------------------
/*
INSERT INTO `25a_faktury_prilohy` (
  `faktura_id`,
  `objednavka_id`,
  `guid`,
  `typ_prilohy`,
  `originalni_nazev_souboru`,
  `systemova_cesta`,
  `velikost_souboru_b`,
  `je_isdoc`,
  `nahrano_uzivatel_id`,
  `dt_vytvoreni`
) VALUES (
  :faktura_id,
  :objednavka_id,
  :guid,
  :typ_prilohy,
  :originalni_nazev,
  :systemova_cesta,
  :velikost,
  :je_isdoc,
  :nahrano_uzivatel_id,
  NOW()
);
*/

-- -----------------------------------------------------
-- READ: Načtení všech příloh konkrétní faktury
-- -----------------------------------------------------
-- Parametr: :faktura_id
-- -----------------------------------------------------
/*
SELECT 
  fp.id,
  fp.faktura_id,
  fp.objednavka_id,
  fp.guid,
  fp.typ_prilohy,
  fp.originalni_nazev_souboru,
  fp.systemova_cesta,
  fp.velikost_souboru_b,
  fp.je_isdoc,
  fp.isdoc_parsed,
  fp.isdoc_data_json,
  fp.nahrano_uzivatel_id,
  fp.dt_vytvoreni,
  fp.dt_aktualizace,
  u.jmeno AS nahrano_uzivatel_jmeno,
  u.prijmeni AS nahrano_uzivatel_prijmeni
FROM `25a_faktury_prilohy` fp
LEFT JOIN `25_uzivatele` u ON fp.nahrano_uzivatel_id = u.id
WHERE fp.faktura_id = :faktura_id
ORDER BY fp.dt_vytvoreni ASC;
*/

-- -----------------------------------------------------
-- READ: Načtení všech příloh všech faktur objednávky
-- -----------------------------------------------------
-- Parametr: :objednavka_id
-- -----------------------------------------------------
/*
SELECT 
  fp.id,
  fp.faktura_id,
  fp.objednavka_id,
  fp.guid,
  fp.typ_prilohy,
  fp.originalni_nazev_souboru,
  fp.systemova_cesta,
  fp.velikost_souboru_b,
  fp.je_isdoc,
  fp.isdoc_parsed,
  fp.nahrano_uzivatel_id,
  fp.dt_vytvoreni,
  f.fa_cislo_vema,
  u.jmeno AS nahrano_uzivatel_jmeno,
  u.prijmeni AS nahrano_uzivatel_prijmeni
FROM `25a_faktury_prilohy` fp
LEFT JOIN `25a_faktury_objednavek` f ON fp.faktura_id = f.id
LEFT JOIN `25_uzivatele` u ON fp.nahrano_uzivatel_id = u.id
WHERE fp.objednavka_id = :objednavka_id
ORDER BY fp.faktura_id ASC, fp.dt_vytvoreni ASC;
*/

-- -----------------------------------------------------
-- READ: Načtení jedné konkrétní přílohy podle ID
-- -----------------------------------------------------
-- Parametr: :priloha_id
-- -----------------------------------------------------
/*
SELECT 
  fp.id,
  fp.faktura_id,
  fp.objednavka_id,
  fp.guid,
  fp.typ_prilohy,
  fp.originalni_nazev_souboru,
  fp.systemova_cesta,
  fp.velikost_souboru_b,
  fp.je_isdoc,
  fp.isdoc_parsed,
  fp.isdoc_data_json,
  fp.nahrano_uzivatel_id,
  fp.dt_vytvoreni,
  fp.dt_aktualizace
FROM `25a_faktury_prilohy` fp
WHERE fp.id = :priloha_id;
*/

-- -----------------------------------------------------
-- READ: Načtení přílohy podle GUID
-- -----------------------------------------------------
-- Parametr: :guid
-- -----------------------------------------------------
/*
SELECT 
  fp.id,
  fp.faktura_id,
  fp.objednavka_id,
  fp.guid,
  fp.originalni_nazev_souboru,
  fp.systemova_cesta,
  fp.velikost_souboru_b,
  fp.je_isdoc,
  fp.dt_vytvoreni
FROM `25a_faktury_prilohy` fp
WHERE fp.guid = :guid;
*/

-- -----------------------------------------------------
-- READ: Seznam všech ISDOC souborů (neparsovaných)
-- -----------------------------------------------------
-- Pro budoucí batch processing
-- -----------------------------------------------------
/*
SELECT 
  fp.id,
  fp.faktura_id,
  fp.objednavka_id,
  fp.guid,
  fp.originalni_nazev_souboru,
  fp.systemova_cesta,
  fp.dt_vytvoreni
FROM `25a_faktury_prilohy` fp
WHERE fp.je_isdoc = 1 
  AND fp.isdoc_parsed = 0
ORDER BY fp.dt_vytvoreni ASC;
*/

-- -----------------------------------------------------
-- UPDATE: Aktualizace klasifikace přílohy
-- -----------------------------------------------------
-- Parametry: :typ_prilohy, :priloha_id
-- -----------------------------------------------------
/*
UPDATE `25a_faktury_prilohy` 
SET 
  `typ_prilohy` = :typ_prilohy,
  `dt_aktualizace` = NOW()
WHERE `id` = :priloha_id;
*/

-- -----------------------------------------------------
-- UPDATE: Označení ISDOC jako parsovaný
-- -----------------------------------------------------
-- Parametry: :isdoc_data_json, :priloha_id
-- -----------------------------------------------------
/*
UPDATE `25a_faktury_prilohy` 
SET 
  `isdoc_parsed` = 1,
  `isdoc_data_json` = :isdoc_data_json,
  `dt_aktualizace` = NOW()
WHERE `id` = :priloha_id;
*/

-- -----------------------------------------------------
-- UPDATE: Aktualizace metadat přílohy
-- -----------------------------------------------------
-- Parametry: :typ_prilohy, :originalni_nazev, :priloha_id
-- -----------------------------------------------------
/*
UPDATE `25a_faktury_prilohy` 
SET 
  `typ_prilohy` = :typ_prilohy,
  `originalni_nazev_souboru` = :originalni_nazev,
  `dt_aktualizace` = NOW()
WHERE `id` = :priloha_id;
*/

-- -----------------------------------------------------
-- DELETE: Smazání konkrétní přílohy
-- -----------------------------------------------------
-- Parametr: :priloha_id
-- Poznámka: Backend musí také smazat fyzický soubor!
-- -----------------------------------------------------
/*
DELETE FROM `25a_faktury_prilohy` 
WHERE `id` = :priloha_id;
*/

-- -----------------------------------------------------
-- DELETE: Smazání všech příloh faktury
-- -----------------------------------------------------
-- Parametr: :faktura_id
-- Poznámka: CASCADE by mělo fungovat automaticky při smazání faktury,
--           ale lze použít i manuálně
-- -----------------------------------------------------
/*
DELETE FROM `25a_faktury_prilohy` 
WHERE `faktura_id` = :faktura_id;
*/

-- -----------------------------------------------------
-- VERIFY: Kontrola existence souboru na disku
-- -----------------------------------------------------
-- Parametr: :objednavka_id
-- Backend použije tento dotaz a pak PHP file_exists()
-- -----------------------------------------------------
/*
SELECT 
  fp.id,
  fp.guid,
  fp.originalni_nazev_souboru,
  fp.systemova_cesta,
  fp.faktura_id,
  f.fa_cislo_vema
FROM `25a_faktury_prilohy` fp
LEFT JOIN `25a_faktury_objednavek` f ON fp.faktura_id = f.id
WHERE fp.objednavka_id = :objednavka_id;
*/

-- -----------------------------------------------------
-- STATISTICS: Statistiky příloh faktury
-- -----------------------------------------------------
-- Parametr: :faktura_id
-- -----------------------------------------------------
/*
SELECT 
  COUNT(*) AS pocet_priloh,
  SUM(fp.velikost_souboru_b) AS celkova_velikost_b,
  SUM(CASE WHEN fp.je_isdoc = 1 THEN 1 ELSE 0 END) AS pocet_isdoc,
  SUM(CASE WHEN fp.isdoc_parsed = 1 THEN 1 ELSE 0 END) AS pocet_parsovanych_isdoc
FROM `25a_faktury_prilohy` fp
WHERE fp.faktura_id = :faktura_id;
*/

-- -----------------------------------------------------
-- STATISTICS: Celkové statistiky objednávky
-- -----------------------------------------------------
-- Parametr: :objednavka_id
-- -----------------------------------------------------
/*
SELECT 
  COUNT(DISTINCT fp.faktura_id) AS pocet_faktur_s_prilohami,
  COUNT(*) AS celkem_priloh,
  SUM(fp.velikost_souboru_b) AS celkova_velikost_b,
  SUM(CASE WHEN fp.je_isdoc = 1 THEN 1 ELSE 0 END) AS pocet_isdoc,
  MAX(fp.dt_vytvoreni) AS posledni_priloha_dt
FROM `25a_faktury_prilohy` fp
WHERE fp.objednavka_id = :objednavka_id;
*/

-- =====================================================
-- POMOCNÉ DOTAZY
-- =====================================================

-- -----------------------------------------------------
-- Kontrola duplikátních GUID
-- -----------------------------------------------------
/*
SELECT guid, COUNT(*) as pocet
FROM `25a_faktury_prilohy`
GROUP BY guid
HAVING pocet > 1;
*/

-- -----------------------------------------------------
-- Seznam příloh s informacemi o faktuře
-- -----------------------------------------------------
-- Parametr: :objednavka_id
-- -----------------------------------------------------
/*
SELECT 
  fp.id,
  fp.originalni_nazev_souboru,
  fp.velikost_souboru_b,
  fp.je_isdoc,
  fp.dt_vytvoreni,
  f.id AS faktura_id,
  f.fa_cislo_vema,
  f.fa_castka,
  f.fa_datum_doruceni,
  CONCAT(u.jmeno, ' ', u.prijmeni) AS nahral_uzivatel
FROM `25a_faktury_prilohy` fp
LEFT JOIN `25a_faktury_objednavek` f ON fp.faktura_id = f.id
LEFT JOIN `25_uzivatele` u ON fp.nahrano_uzivatel_id = u.id
WHERE fp.objednavka_id = :objednavka_id
ORDER BY f.fa_datum_doruceni DESC, fp.dt_vytvoreni ASC;
*/

-- =====================================================
-- ROLLBACK (v případě potřeby vrátit změny)
-- =====================================================
-- VAROVÁNÍ: Smaže tabulku a všechna data!
-- Použijte POUZE pokud chcete kompletně odstranit přílohy faktur
-- =====================================================
/*
DROP TABLE IF EXISTS `25a_faktury_prilohy`;
*/

-- =====================================================
-- POZNÁMKY PRO BACKEND IMPLEMENTACI
-- =====================================================
--
-- 1. UPLOAD WORKFLOW:
--    a) Frontend pošle soubor + metadata (faktura_id, typ_prilohy)
--    b) Backend vygeneruje GUID
--    c) Backend detekuje ISDOC (.isdoc přípona → je_isdoc = 1)
--    d) Backend uloží soubor do /uploads/orders25/faktury/{objednavka_id}/{faktura_id}/
--    e) Backend vloží záznam do DB pomocí INSERT dotazu
--    f) Backend vrátí {id, guid, path, status: 'ok'}
--
-- 2. DOWNLOAD WORKFLOW:
--    a) Frontend pošle ID nebo GUID přílohy
--    b) Backend načte záznam z DB (SELECT)
--    c) Backend ověří existenci souboru (file_exists)
--    d) Backend pošle soubor (readfile + headers)
--
-- 3. DELETE WORKFLOW:
--    a) Frontend pošle ID přílohy
--    b) Backend načte systemova_cesta z DB
--    c) Backend smaže fyzický soubor (unlink)
--    d) Backend smaže záznam z DB (DELETE)
--    e) Backend zkontroluje jestli složka faktury je prázdná → případně smazat
--
-- 4. ISDOC DETECTION:
--    - Auto-detekce z přípony .isdoc
--    - Nastavit je_isdoc = 1
--    - Nastavit typ_prilohy = 'FAKTURA' (výchozí)
--    - V budoucnu: parsing XML a naplnění isdoc_data_json
--
-- 5. CASCADE DELETE:
--    - Při smazání faktury se automaticky smažou její přílohy (DB CASCADE)
--    - Backend MUSÍ také smazat fyzické soubory v cron job nebo trigger
--
-- 6. SECURITY:
--    - Validovat file type (whitelist: pdf, isdoc, jpg, jpeg, png)
--    - Validovat velikost (max 10MB pro PDF, 5MB pro ISDOC)
--    - Validovat že faktura_id patří k objednavka_id (JOIN check)
--    - Validovat přístupová práva uživatele k objednávce
--
-- =====================================================

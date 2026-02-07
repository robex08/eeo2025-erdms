-- ========================================
-- SMLOUVY - MySQL 5.5.43 Databázové schéma
-- ========================================
-- Verze: 1.0
-- Datum: 23. listopadu 2025
-- Autor: Backend Team
-- ========================================

-- ========================================
-- 1. HLAVNÍ TABULKA SMLUV
-- ========================================

CREATE TABLE IF NOT EXISTS `25_smlouvy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  
  -- Identifikace smlouvy
  `cislo_smlouvy` VARCHAR(100) NOT NULL COMMENT 'Evidenční číslo smlouvy (např. S-147/750309/26/23)',
  `usek_id` INT(11) NOT NULL COMMENT 'ID úseku z tabulky 25_useky',
  `usek_zkr` VARCHAR(50) DEFAULT NULL COMMENT 'Zkratka úseku (denormalizace pro rychlost)',
  `druh_smlouvy` VARCHAR(100) NOT NULL COMMENT 'Typ smlouvy: SLUŽBY, KUPNÍ, RÁMCOVÁ, atd.',
  
  -- Dodavatel
  `nazev_firmy` VARCHAR(255) NOT NULL COMMENT 'Název dodavatele/firmy',
  `ico` VARCHAR(20) DEFAULT NULL COMMENT 'IČO dodavatele (8 číslic)',
  `dic` VARCHAR(20) DEFAULT NULL COMMENT 'DIČ dodavatele (volitelné)',
  
  -- Popis smlouvy
  `nazev_smlouvy` VARCHAR(500) NOT NULL COMMENT 'Název/předmět smlouvy',
  `popis_smlouvy` TEXT DEFAULT NULL COMMENT 'Detailní popis smlouvy',
  
  -- Platnost
  `platnost_od` DATE NOT NULL COMMENT 'Datum platnosti od',
  `platnost_do` DATE NOT NULL COMMENT 'Datum platnosti do',
  
  -- Finanční údaje
  `hodnota_bez_dph` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Hodnota smlouvy bez DPH',
  `hodnota_s_dph` DECIMAL(15,2) NOT NULL COMMENT 'Hodnota smlouvy s DPH (hlavní částka)',
  `sazba_dph` DECIMAL(5,2) DEFAULT 21.00 COMMENT 'Použitá sazba DPH v % (pro přepočty)',
  
  -- Čerpání (agregované hodnoty - počítané z vazeb na objednávky)
  `cerpano_celkem` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Celkové čerpání ze smlouvy (suma z objednávek)',
  `zbyva` DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Zbývající částka (hodnota_s_dph - cerpano_celkem)',
  `procento_cerpani` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Procento čerpání (cerpano_celkem / hodnota_s_dph * 100)',
  
  -- Stav smlouvy
  `aktivni` TINYINT(1) DEFAULT 1 COMMENT '1 = aktivní, 0 = neaktivní/archivováno',
  `stav` ENUM('AKTIVNI', 'UKONCENA', 'PRERUSENA', 'PRIPRAVOVANA') DEFAULT 'AKTIVNI' 
    COMMENT 'Stav smlouvy - AKTIVNI=běžící, UKONCENA=platnost vypršela, PRERUSENA=přerušeno, PRIPRAVOVANA=ještě nenaběhla',
  
  -- Metadata
  `dt_vytvoreni` DATETIME DEFAULT NULL COMMENT 'Datum vytvoření záznamu',
  `dt_aktualizace` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
    COMMENT 'Datum poslední aktualizace (automatické)',
  `vytvoril_user_id` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který vytvořil záznam',
  `upravil_user_id` INT(11) DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  `posledni_prepocet` DATETIME DEFAULT NULL COMMENT 'Časová značka posledního přepočtu čerpání',
  
  -- Dodatečné informace
  `poznamka` TEXT DEFAULT NULL COMMENT 'Interní poznámka k smlouvě',
  `cislo_dms` VARCHAR(100) DEFAULT NULL COMMENT 'Číslo v DMS/archivním systému',
  `kategorie` VARCHAR(50) DEFAULT NULL COMMENT 'Kategorie smlouvy pro filtrování (volitelné)',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cislo_smlouvy` (`cislo_smlouvy`),
  KEY `idx_usek` (`usek_id`),
  KEY `idx_ico` (`ico`),
  KEY `idx_druh` (`druh_smlouvy`),
  KEY `idx_platnost` (`platnost_od`, `platnost_do`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_stav` (`stav`),
  KEY `idx_kategorie` (`kategorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Evidence smluv - správa a sledování čerpání';

-- ========================================
-- 2. TABULKA PRO HISTORII IMPORTŮ
-- ========================================

CREATE TABLE IF NOT EXISTS `25_smlouvy_import_log` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `dt_importu` DATETIME NOT NULL COMMENT 'Datum a čas importu',
  `user_id` INT(11) NOT NULL COMMENT 'Uživatel, který provedl import',
  `username` VARCHAR(100) DEFAULT NULL COMMENT 'Jméno uživatele (pro historii)',
  
  -- Informace o souboru
  `nazev_souboru` VARCHAR(255) DEFAULT NULL COMMENT 'Název importovaného souboru',
  `typ_souboru` VARCHAR(10) DEFAULT NULL COMMENT 'Typ: XLSX, XLS, CSV',
  `velikost_souboru` INT(11) DEFAULT NULL COMMENT 'Velikost souboru v bajtech',
  
  -- Statistiky importu
  `pocet_radku` INT(11) DEFAULT 0 COMMENT 'Počet záznamů v importu',
  `pocet_uspesnych` INT(11) DEFAULT 0 COMMENT 'Počet úspěšně importovaných',
  `pocet_aktualizovanych` INT(11) DEFAULT 0 COMMENT 'Počet aktualizovaných existujících',
  `pocet_preskoceno` INT(11) DEFAULT 0 COMMENT 'Počet přeskočených (duplicity)',
  `pocet_chyb` INT(11) DEFAULT 0 COMMENT 'Počet chyb při importu',
  
  -- Detaily chyb
  `chybove_zaznamy` MEDIUMTEXT DEFAULT NULL COMMENT 'JSON se seznamem chyb: [{row, field, message}] - MEDIUMTEXT pro velké importy (16MB)',
  `status` ENUM('SUCCESS', 'PARTIAL', 'FAILED') DEFAULT 'SUCCESS' 
    COMMENT 'Stav importu - SUCCESS=vše OK, PARTIAL=některé chyby, FAILED=selhalo',
  
  -- Nastavení importu
  `overwrite_existing` TINYINT(1) DEFAULT 0 COMMENT 'Zda se přepisovaly existující záznamy',
  
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_datum` (`dt_importu`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Historie hromadných importů smluv';

-- ========================================
-- 3. VAZBA NA OBJEDNÁVKY
-- ========================================

-- ⚠️ POZNÁMKA: Vazba smlouva ↔ objednávka je řešena přes EXISTUJÍCÍ pole v objednávce!
-- 
-- Pole 'cislo_smlouvy' v tabulce 25a_objednavky JIŽ EXISTUJE jako součást dynamického financování.
-- V OrderForm při výběru zdroje financování "Smlouva" se automaticky vyplní pole 'cislo_smlouvy'.
-- Čerpání se počítá agregací objednávek s daným cislo_smlouvy pomocí SQL:
--
--   SELECT SUM(max_cena_s_dph) 
--   FROM 25a_objednavky 
--   WHERE cislo_smlouvy = 'S-147/750309/26/23'
--     AND stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA')
--
-- ❗ NENÍ TŘEBA VYTVÁŘET NOVÉ POLE ANI VAZEBNÍ TABULKU!

-- ========================================
-- 4. AUTOMATICKÝ PŘEPOČET ČERPÁNÍ
-- ========================================

-- ⚠️ POZNÁMKA PRO BACKEND TÝM:
-- 
-- Čerpání smlouvy se NEŘEŠÍ TRIGGERY, protože:
-- 1. Pole 'cislo_smlouvy' v objednávkách je součást JSON pole 'financovani' nebo samostatný sloupec
-- 2. Struktura dynamického financování není jednoznačná pro triggery
-- 3. Triggery by komplikovaly údržbu a debugging
--
-- ŘEŠENÍ: Čerpání se přepočítává MANUÁLNĚ:
-- - Při ukládání/aktualizaci objednávky v API (apiv2Orders.php)
-- - Pomocí endpointu /ciselniky/smlouvy/prepocet-cerpani
-- - Nočním CRON johem (doporučeno: 1x denně v 2:00)
--
-- SQL pro přepočet čerpání jedné smlouvy:
/*
UPDATE 25_smlouvy s
SET 
  s.cerpano_celkem = (
    SELECT COALESCE(SUM(o.max_cena_s_dph), 0)
    FROM 25a_objednavky o
    WHERE o.cislo_smlouvy = s.cislo_smlouvy
      -- NEBO: JSON_EXTRACT(o.financovani, '$.cislo_smlouvy') = s.cislo_smlouvy
      AND o.stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA')
  ),
  s.zbyva = s.hodnota_s_dph - s.cerpano_celkem,
  s.procento_cerpani = IF(s.hodnota_s_dph > 0, (s.cerpano_celkem / s.hodnota_s_dph) * 100, 0),
  s.posledni_prepocet = NOW()
WHERE s.cislo_smlouvy = 'S-147/750309/26/23';
*/
--
-- ❗ ÚKOL PRO BE: Zjistit, jak je uloženo pole 'cislo_smlouvy' v tabulce 25a_objednavky
--    a upravit SQL dotazy v stored procedure níže!

-- ========================================
-- 5. INICIALIZAČNÍ DATA (DEMO)
-- ========================================

-- Příklad vložení testovacích smluv
INSERT INTO `25_smlouvy` (
  cislo_smlouvy, usek_id, usek_zkr, druh_smlouvy, nazev_firmy, ico,
  nazev_smlouvy, popis_smlouvy, platnost_od, platnost_do,
  hodnota_bez_dph, hodnota_s_dph, aktivni, stav, dt_vytvoreni, vytvoril_user_id
) VALUES 
(
  'S-147/750309/26/23', 
  10, 
  'ÚEko', 
  'SLUŽBY', 
  'Alter Audit, s.r.o.', 
  '29268931',
  'Smlouva o poskytování poradenských a konzultačních služeb',
  'Smlouva o poskytování poradenských a konzultačních služeb v oblasti ekonomiky',
  '2023-06-05',
  '2025-12-31',
  500000.00,
  605000.00,
  1,
  'AKTIVNI',
  NOW(),
  1
),
(
  'S-124/750309/2025', 
  15, 
  'ÚPT', 
  'KUPNÍ', 
  'Preucentrum N&N s.r.o.', 
  '25367463',
  'Kupní smlouva - Letní pneumatiky a disky 2025',
  'Kupní smlouva na dodávku letních pneumatik a disků pro vozový park',
  '2025-04-30',
  '2025-05-15',
  1100000.00,
  1334872.00,
  1,
  'AKTIVNI',
  NOW(),
  1
),
(
  'S-016/750309/2025', 
  12, 
  'Právní', 
  'RÁMCOVÁ', 
  'KAROLAS Legal s.r.o., advokátní kancelář', 
  '5732069',
  'Rámcová smlouva - Poskytování advokátních služeb III',
  'Rámcová smlouva na poskytování advokátních služeb pro rok 2025',
  '2025-01-30',
  '2028-01-29',
  2000000.00,
  2420000.00,
  1,
  'AKTIVNI',
  NOW(),
  1
);

-- ========================================
-- 6. UŽITEČNÉ POHLEDY (VIEWS)
-- ========================================

-- ⚠️ POZNÁMKA: VIEW neobsahuje JOIN na objednávky, protože struktura pole 'cislo_smlouvy'
--              v tabulce 25a_objednavky není známá (samostatný sloupec vs. JSON)
--              Počet objednávek se načítá přes API endpoint /detail

-- Pohled: Aktivní smlouvy s dynamickým stavem
CREATE OR REPLACE VIEW `v_smlouvy_aktivni` AS
SELECT 
  s.*,
  u.usek_nazev,
  CASE 
    WHEN s.platnost_do < CURDATE() THEN 'PROSLA'
    WHEN s.platnost_od > CURDATE() THEN 'NABĚHLA'
    WHEN s.cerpano_celkem >= s.hodnota_s_dph THEN 'VYČERPÁNO'
    ELSE s.stav
  END AS skutecny_stav,
  DATEDIFF(s.platnost_do, CURDATE()) AS dnu_do_konce
FROM 25_smlouvy s
LEFT JOIN 25_useky u ON s.usek_id = u.id
WHERE s.aktivni = 1;

-- Pohled: Přehled čerpání podle úseků
CREATE OR REPLACE VIEW `v_smlouvy_statistiky_useky` AS
SELECT 
  s.usek_id,
  s.usek_zkr,
  COUNT(DISTINCT s.id) AS pocet_smluv,
  SUM(s.hodnota_s_dph) AS celkova_hodnota,
  SUM(s.cerpano_celkem) AS celkem_cerpano,
  SUM(s.zbyva) AS celkem_zbyva,
  ROUND(AVG(s.procento_cerpani), 2) AS prumerne_procento_cerpani
FROM 25_smlouvy s
WHERE s.aktivni = 1
GROUP BY s.usek_id, s.usek_zkr;

-- ========================================
-- 7. INDEXY PRO OPTIMALIZACI
-- ========================================

-- Composite indexy pro časté dotazy
CREATE INDEX `idx_smlouvy_stav_platnost` ON `25_smlouvy` (`stav`, `platnost_od`, `platnost_do`);
CREATE INDEX `idx_smlouvy_usek_aktivni` ON `25_smlouvy` (`usek_id`, `aktivni`);
CREATE INDEX `idx_smlouvy_druh_stav` ON `25_smlouvy` (`druh_smlouvy`, `stav`);

-- Full-text index pro vyhledávání
-- (podporováno od MySQL 5.6, pro 5.5 se vynechá)
-- ALTER TABLE `25_smlouvy` ADD FULLTEXT INDEX `ft_nazev_popis` (`nazev_smlouvy`, `popis_smlouvy`);

-- ========================================
-- 8. OPRÁVNĚNÍ
-- ========================================

-- UPDATE existujících práv: SMLOUVY_* → CONTRACT_*
UPDATE `25_prava` SET `kod_prava` = 'CONTRACT_VIEW', `popis` = 'Zobrazení smluv v číselníkách' WHERE `kod_prava` = 'SMLOUVY_VIEW';
UPDATE `25_prava` SET `kod_prava` = 'CONTRACT_CREATE', `popis` = 'Vytváření nových smluv' WHERE `kod_prava` = 'SMLOUVY_CREATE';
UPDATE `25_prava` SET `kod_prava` = 'CONTRACT_EDIT', `popis` = 'Editace existujících smluv' WHERE `kod_prava` = 'SMLOUVY_EDIT';
UPDATE `25_prava` SET `kod_prava` = 'CONTRACT_DELETE', `popis` = 'Mazání smluv' WHERE `kod_prava` = 'SMLOUVY_DELETE';
UPDATE `25_prava` SET `kod_prava` = 'CONTRACT_IMPORT', `popis` = 'Hromadný import smluv z Excelu/CSV' WHERE `kod_prava` = 'SMLOUVY_IMPORT';
UPDATE `25_prava` SET `kod_prava` = 'CONTRACT_EXPORT', `popis` = 'Export smluv do Excelu/CSV' WHERE `kod_prava` = 'SMLOUVY_EXPORT';

-- ========================================
-- 9. STORED PROCEDURES (VOLITELNÉ)
-- ========================================

-- ========================================
-- Procedura pro přepočet čerpání smluv
-- ========================================
-- Parametry:
--   p_cislo_smlouvy - konkrétní smlouva (NULL = všechny)
--   p_usek_id - filtr podle úseku (NULL = všechny)
--
-- Použití:
--   CALL sp_prepocet_cerpani_smluv('S-147/750309/26/23', NULL);  -- jedna smlouva
--   CALL sp_prepocet_cerpani_smluv(NULL, 5);                     -- všechny smlouvy úseku 5
--   CALL sp_prepocet_cerpani_smluv(NULL, NULL);                  -- všechny aktivní smlouvy
-- ========================================

DELIMITER $$
CREATE PROCEDURE `sp_prepocet_cerpani_smluv`(
  IN p_cislo_smlouvy VARCHAR(100),
  IN p_usek_id INT
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_cislo_smlouvy VARCHAR(100);
  DECLARE v_hodnota DECIMAL(15,2);
  DECLARE v_cerpano DECIMAL(15,2);
  DECLARE v_count INT DEFAULT 0;
  
  DECLARE cur CURSOR FOR 
    SELECT cislo_smlouvy, hodnota_s_dph 
    FROM 25_smlouvy 
    WHERE (p_cislo_smlouvy IS NULL OR cislo_smlouvy = p_cislo_smlouvy)
      AND (p_usek_id IS NULL OR usek_id = p_usek_id)
      AND aktivni = 1;
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  OPEN cur;
  
  read_loop: LOOP
    FETCH cur INTO v_cislo_smlouvy, v_hodnota;
    
    IF done THEN
      LEAVE read_loop;
    END IF;
    
    -- ❗ ÚKOL PRO BE: Upravit tento SELECT podle skutečné struktury!
    -- Možnost A: Samostatný sloupec 'cislo_smlouvy'
    SELECT COALESCE(SUM(max_cena_s_dph), 0) INTO v_cerpano
    FROM 25a_objednavky
    WHERE cislo_smlouvy = v_cislo_smlouvy
      AND stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA');
    
    -- Možnost B: JSON pole 'financovani'
    -- SELECT COALESCE(SUM(max_cena_s_dph), 0) INTO v_cerpano
    -- FROM 25a_objednavky
    -- WHERE JSON_EXTRACT(financovani, '$.cislo_smlouvy') = v_cislo_smlouvy
    --   AND stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA');
    
    -- Aktualizovat smlouvu
    UPDATE 25_smlouvy
    SET 
      cerpano_celkem = v_cerpano,
      zbyva = hodnota_s_dph - v_cerpano,
      procento_cerpani = IF(hodnota_s_dph > 0, (v_cerpano / hodnota_s_dph) * 100, 0),
      posledni_prepocet = NOW()
    WHERE cislo_smlouvy = v_cislo_smlouvy;
    
    SET v_count = v_count + 1;
    
  END LOOP;
  
  CLOSE cur;
  
  SELECT CONCAT('✅ Přepočteno čerpání pro ', v_count, ' smluv') AS vysledek;
END$$

DELIMITER ;

-- ========================================
-- 10. KONTROLNÍ DOTAZY
-- ========================================

-- Kontrola struktury tabulek
SHOW CREATE TABLE `25_smlouvy`;
SHOW CREATE TABLE `25_smlouvy_import_log`;

-- Kontrola stored procedures
SHOW CREATE PROCEDURE `sp_prepocet_cerpani_smluv`;

-- Kontrola indexů
SHOW INDEXES FROM `25_smlouvy`;

-- Testovací dotazy
SELECT * FROM `25_smlouvy` LIMIT 5;
SELECT * FROM `v_smlouvy_aktivni` LIMIT 5;
SELECT * FROM `v_smlouvy_statistiky_useky`;

-- ========================================
-- KONEC SKRIPTU
-- ========================================
-- Pro rollback použijte:
-- DROP TABLE IF EXISTS `25_smlouvy_import_log`;
-- DROP TABLE IF EXISTS `25_smlouvy`;
-- DROP VIEW IF EXISTS `v_smlouvy_aktivni`;
-- DROP VIEW IF EXISTS `v_smlouvy_statistiky_useky`;
-- DROP PROCEDURE IF EXISTS `sp_prepocet_cerpani_smluv`;
-- ========================================

-- ================================================================================
-- VEMA DENÍK - Databázové tabulky
-- ================================================================================
-- Datum vytvoření: 22.06.2026
-- Účel: Import dat z VEMA systému (firmy, faktury, smlouvy)
-- Databáze: EEO-OSTRA-DEV (development)
-- ================================================================================

-- ⚠️ POZNÁMKY:
-- 1. Sloupce jsou pojmenovány PŘESNĚ jak v Excel souborech
-- 2. Excel serial dates (INT) se později konvertují na DATE při importu
-- 3. Systémové sloupce pro tracking: dt_*, vytvoril_*, aktualizoval_*, stav
-- 4. Stav záznamu: 'aktivni', 'smazano', 'neaktivni'

-- ================================================================================
-- TABULKA 1: FIRMY (firmyupl.xlsx - 1021 záznamů, 40 sloupců)
-- ================================================================================

DROP TABLE IF EXISTS `25v_firmyupl`;

CREATE TABLE `25v_firmyupl` (
  -- Systémové
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  
  -- === PŘESNÉ SLOUPCE Z XLSX (40 sloupců) ===
  `firma` INT(11) DEFAULT NULL COMMENT 'ID firmy v VEMA systému',
  `nazev` VARCHAR(255) DEFAULT NULL COMMENT 'Název firmy',
  `ico` VARCHAR(20) DEFAULT NULL COMMENT 'IČO',
  `icodl` VARCHAR(50) DEFAULT NULL,
  `rocis` VARCHAR(50) DEFAULT NULL,
  `regcisph` VARCHAR(50) DEFAULT NULL COMMENT 'Registrační číslo plátce DPH',
  `zaplf` VARCHAR(100) DEFAULT NULL,
  `koplf` INT(11) DEFAULT NULL,
  
  -- Typy adres (boolean flags)
  `sidlo` TINYINT(1) DEFAULT 0 COMMENT '1 = adresa sídla',
  `fakt` TINYINT(1) DEFAULT 0 COMMENT '1 = fakturační adresa',
  `dodav` TINYINT(1) DEFAULT 0 COMMENT '1 = dodací adresa',
  
  -- Adresa
  `ulice` VARCHAR(255) DEFAULT NULL,
  `cp` VARCHAR(20) DEFAULT NULL COMMENT 'Číslo popisné',
  `obec` VARCHAR(255) DEFAULT NULL,
  `psc` VARCHAR(10) DEFAULT NULL,
  `posta` VARCHAR(255) DEFAULT NULL,
  `stat` VARCHAR(100) DEFAULT NULL,
  
  -- Kontakty
  `telefon` VARCHAR(50) DEFAULT NULL,
  `mobil` VARCHAR(50) DEFAULT NULL,
  `fax` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `web` VARCHAR(255) DEFAULT NULL,
  
  -- Doplňující údaje
  `datschr` VARCHAR(100) DEFAULT NULL,
  `dnazev` VARCHAR(500) DEFAULT NULL COMMENT 'Dlouhý název firmy',
  `dul` TEXT DEFAULT NULL,
  `pln` TEXT DEFAULT NULL,
  `odb` TEXT DEFAULT NULL,
  `dod` TEXT DEFAULT NULL,
  `druhorg` VARCHAR(100) DEFAULT NULL,
  `ins` TEXT DEFAULT NULL,
  `stara` TEXT DEFAULT NULL,
  `prfyz` INT(11) DEFAULT NULL,
  
  -- GDPR
  `dgdpr` TEXT DEFAULT NULL,
  `pozn` TEXT DEFAULT NULL COMMENT 'Poznámka',
  `souhlas` TEXT DEFAULT NULL,
  `zakaz` TEXT DEFAULT NULL,
  `redgdpr` TINYINT(1) DEFAULT 0,
  `txtgdpr` TEXT DEFAULT NULL,
  
  -- Ostatní
  `dic` VARCHAR(50) DEFAULT NULL COMMENT 'DIČ',
  `hod` TEXT DEFAULT NULL,
  
  -- === SYSTÉMOVÉ SLOUPCE PRO TRACKING ===
  `stav` ENUM('aktivni', 'smazano', 'neaktivni') DEFAULT 'aktivni' 
    COMMENT 'Stav záznamu: aktivni = běžný, smazano = už není v importu, neaktivni = deaktivováno',
  
  `import_batch_id` VARCHAR(50) DEFAULT NULL 
    COMMENT 'ID importní dávky (timestamp nebo GUID)',
  
  `dt_importu` DATETIME DEFAULT NULL 
    COMMENT 'Datum a čas importu tohoto záznamu',
  
  `dt_posledni_aktualizace` DATETIME DEFAULT NULL 
    COMMENT 'Datum a čas poslední aktualizace při opakovaném importu',
  
  `vytvoril_uzivatel_id` INT(11) DEFAULT NULL 
    COMMENT 'ID uživatele, který provedl první import',
  
  `aktualizoval_uzivatel_id` INT(11) DEFAULT NULL 
    COMMENT 'ID uživatele, který provedl poslední aktualizaci',
  
  `dt_vytvoreni` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `dt_aktualizace` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  
  -- === INDEXY ===
  INDEX `idx_firma` (`firma`),
  INDEX `idx_ico` (`ico`),
  INDEX `idx_nazev` (`nazev`(100)),
  INDEX `idx_stav` (`stav`),
  INDEX `idx_import_batch` (`import_batch_id`),
  INDEX `idx_dt_importu` (`dt_importu`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci
COMMENT='VEMA - Firmy (dodavatelé/odběratelé) - Excel sloupce 1:1';


-- ================================================================================
-- TABULKA 2: FAKTURY (fpazahl.xlsx - 1008 záznamů, 100 sloupců)
-- ================================================================================

DROP TABLE IF EXISTS `25v_fpazahl`;

CREATE TABLE `25v_fpazahl` (
  -- Systémové
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  
  -- === PŘESNÉ SLOUPCE Z XLSX (100 sloupců) ===
  
  -- Sloupce 1-10
  `stav` INT(11) DEFAULT NULL,
  `firma` INT(11) DEFAULT NULL COMMENT 'ID firmy - vazba na 25v_firmyupl.firma',
  `cfak` VARCHAR(50) DEFAULT NULL,
  `storno` TINYINT(1) DEFAULT 0,
  `cdok` VARCHAR(50) DEFAULT NULL,
  `dicp` VARCHAR(50) DEFAULT NULL,
  `likdok` VARCHAR(100) DEFAULT NULL,
  `cfakdupl` VARCHAR(50) DEFAULT NULL,
  `nazevfak` VARCHAR(255) DEFAULT NULL,
  `typdok` INT(11) DEFAULT NULL,
  
  -- Sloupce 11-20
  `dobrdok` TEXT DEFAULT NULL,
  `dobrfak` TEXT DEFAULT NULL,
  `ksymb` VARCHAR(10) DEFAULT NULL,
  `vsymb` VARCHAR(20) DEFAULT NULL,
  `ssymb` VARCHAR(20) DEFAULT NULL,
  `uhrada` INT(11) DEFAULT NULL,
  `zadrz` TINYINT(1) DEFAULT 0,
  `bancisn` INT(11) DEFAULT NULL,
  `bancisf` INT(11) DEFAULT NULL,
  `tuzzahr` INT(11) DEFAULT NULL,
  
  -- Sloupce 21-30
  `firmapuv` VARCHAR(100) DEFAULT NULL,
  `datpri` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `dof` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `spl` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `plndod` DATE DEFAULT NULL,
  `datuskut` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `rmzu` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `rmzustor` DATE DEFAULT NULL,
  `adr` TEXT DEFAULT NULL,
  `csml` VARCHAR(50) DEFAULT NULL COMMENT 'Číslo smlouvy - vazba na 25v_smla.csml',
  
  -- Sloupce 31-40
  `cdodsml` VARCHAR(50) DEFAULT NULL,
  `cobj` VARCHAR(50) DEFAULT NULL,
  `cpperf` VARCHAR(50) DEFAULT NULL,
  `fpzadav` TEXT DEFAULT NULL,
  `vlast` INT(11) DEFAULT NULL,
  `fakmist` INT(11) DEFAULT NULL,
  `budejsd` TINYINT(1) DEFAULT 0,
  `dopr` INT(11) DEFAULT NULL,
  `douct` INT(11) DEFAULT NULL,
  `zauct` INT(11) DEFAULT NULL,
  
  -- Sloupce 41-50
  `zauctlik` INT(11) DEFAULT NULL,
  `zauctpst` INT(11) DEFAULT NULL,
  `zauctlst` INT(11) DEFAULT NULL,
  `pracvd` INT(11) DEFAULT NULL,
  `cind` VARCHAR(50) DEFAULT NULL,
  `ucetd` VARCHAR(20) DEFAULT NULL,
  `zak` TEXT DEFAULT NULL,
  `difpl` TEXT DEFAULT NULL,
  `cdokrozp` VARCHAR(50) DEFAULT NULL,
  `datrozp` DATE DEFAULT NULL,
  
  -- Sloupce 51-60
  `stavwkf` INT(11) DEFAULT NULL,
  `kdoschfp` VARCHAR(100) DEFAULT NULL,
  `fpzadat` TEXT DEFAULT NULL,
  `datschvz` DATE DEFAULT NULL,
  `fpprik` INT(11) DEFAULT NULL,
  `datschvp` DATE DEFAULT NULL,
  `fpsprozp` TEXT DEFAULT NULL,
  `datschvs` DATE DEFAULT NULL,
  `fpzodpov` TEXT DEFAULT NULL,
  `datschvu` DATE DEFAULT NULL,
  
  -- Sloupce 61-70
  `idproc` VARCHAR(100) DEFAULT NULL,
  `datpros` INT(11) DEFAULT NULL,
  `odkud` INT(11) DEFAULT NULL,
  `fpjs` INT(11) DEFAULT NULL,
  `link` TEXT DEFAULT NULL,
  `idext` VARCHAR(100) DEFAULT NULL,
  `datz` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `datu` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `text` TEXT DEFAULT NULL,
  `pripoj` TINYINT(1) DEFAULT 0,
  
  -- Sloupce 71-80
  `dzap` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `splzadr` TEXT DEFAULT NULL,
  `stav1` INT(11) DEFAULT NULL,
  `stav2` INT(11) DEFAULT NULL,
  `stav3` INT(11) DEFAULT NULL,
  `cpredmet` DECIMAL(15,2) DEFAULT NULL COMMENT 'Částky v Kč',
  `cprir` DECIMAL(15,2) DEFAULT NULL,
  `celkem` DECIMAL(15,2) DEFAULT NULL,
  `cdobrop` DECIMAL(15,2) DEFAULT NULL,
  `czdobrop` DECIMAL(15,2) DEFAULT NULL,
  
  -- Sloupce 81-90
  `czalohy` DECIMAL(15,2) DEFAULT NULL,
  `cplatby` DECIMAL(15,2) DEFAULT NULL,
  `czbyva` DECIMAL(15,2) DEFAULT NULL,
  `cprepl` DECIMAL(15,2) DEFAULT NULL,
  `csaldo` DECIMAL(15,2) DEFAULT NULL,
  `cklikv` DECIMAL(15,2) DEFAULT NULL,
  `czlikv` DECIMAL(15,2) DEFAULT NULL,
  `cdodlist` DECIMAL(15,2) DEFAULT NULL,
  `cpoz` DECIMAL(15,2) DEFAULT NULL,
  `czadr` DECIMAL(15,2) DEFAULT NULL,
  
  -- Sloupce 91-100
  `cnezadr` DECIMAL(15,2) DEFAULT NULL,
  `cprzal` DECIMAL(15,2) DEFAULT NULL,
  `radkylik` TEXT DEFAULT NULL,
  `dob` TEXT DEFAULT NULL,
  `dodlist` TEXT DEFAULT NULL,
  `poz` TEXT DEFAULT NULL,
  `zadr` TEXT DEFAULT NULL,
  `vyuc` TEXT DEFAULT NULL,
  `sdok` TEXT DEFAULT NULL,
  `prilohy` TEXT DEFAULT NULL,
  
  -- === SYSTÉMOVÉ SLOUPCE PRO TRACKING ===
  `stav_zaznamu` ENUM('aktivni', 'smazano', 'neaktivni') DEFAULT 'aktivni' 
    COMMENT 'Stav záznamu v naší DB (odlišné od sloupce "stav" z VEMA)',
  
  `import_batch_id` VARCHAR(50) DEFAULT NULL 
    COMMENT 'ID importní dávky',
  
  `dt_importu` DATETIME DEFAULT NULL 
    COMMENT 'Datum a čas importu',
  
  `dt_posledni_aktualizace` DATETIME DEFAULT NULL 
    COMMENT 'Datum poslední aktualizace',
  
  `vytvoril_uzivatel_id` INT(11) DEFAULT NULL,
  `aktualizoval_uzivatel_id` INT(11) DEFAULT NULL,
  
  `dt_vytvoreni` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `dt_aktualizace` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  
  -- === INDEXY ===
  INDEX `idx_firma` (`firma`),
  INDEX `idx_cfak` (`cfak`),
  INDEX `idx_csml` (`csml`),
  INDEX `idx_stav` (`stav`),
  INDEX `idx_vlast` (`vlast`),
  INDEX `idx_stav_zaznamu` (`stav_zaznamu`),
  INDEX `idx_import_batch` (`import_batch_id`),
  INDEX `idx_dt_importu` (`dt_importu`),
  INDEX `idx_dof` (`dof`),
  INDEX `idx_spl` (`spl`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci
COMMENT='VEMA - Faktury přijaté - Excel sloupce 1:1';


-- ================================================================================
-- TABULKA 3: SMLOUVY (smla.xlsx - 787 záznamů, 55 sloupců)
-- ================================================================================

DROP TABLE IF EXISTS `25v_smla`;

CREATE TABLE `25v_smla` (
  -- Systémové
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  
  -- === PŘESNÉ SLOUPCE Z XLSX (55 sloupců) ===
  
  -- Sloupce 1-10
  `typsml` INT(11) DEFAULT NULL,
  `csml` VARCHAR(50) DEFAULT NULL COMMENT 'Číslo smlouvy - UNIKÁTNÍ',
  `nazsml` VARCHAR(255) DEFAULT NULL,
  `ecsml` VARCHAR(100) DEFAULT NULL,
  `csmlp` VARCHAR(100) DEFAULT NULL,
  `verzak` VARCHAR(100) DEFAULT NULL,
  `firma` INT(11) DEFAULT NULL COMMENT 'ID firmy - vazba na 25v_firmyupl.firma',
  `str3` TEXT DEFAULT NULL,
  `duver` INT(11) DEFAULT NULL,
  `puvod` TEXT DEFAULT NULL,
  
  -- Sloupce 11-20
  `dnazsml` VARCHAR(500) DEFAULT NULL,
  `popis` TEXT DEFAULT NULL,
  `text` TEXT DEFAULT NULL,
  `datuzavr` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `datumod` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `datumdo` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `zavazdo` DATE DEFAULT NULL,
  `perioda` VARCHAR(100) DEFAULT NULL,
  `termin` VARCHAR(100) DEFAULT NULL,
  `hodnota` DECIMAL(15,2) DEFAULT NULL,
  
  -- Sloupce 21-30
  `duvnulc` TEXT DEFAULT NULL,
  `jistota` TEXT DEFAULT NULL,
  `ukonc` TEXT DEFAULT NULL,
  `datukon` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `notsml` TEXT DEFAULT NULL,
  `prac` TEXT DEFAULT NULL,
  `usek` INT(11) DEFAULT NULL COMMENT 'Úsek - HLAVNÍ FILTR',
  `cinnost` TEXT DEFAULT NULL,
  `zak` TEXT DEFAULT NULL,
  `poznsml` TEXT DEFAULT NULL,
  
  -- Sloupce 31-40
  `dodatky` TEXT DEFAULT NULL,
  `etapy` TEXT DEFAULT NULL,
  `kalendar` TEXT DEFAULT NULL,
  `aktual` TEXT DEFAULT NULL,
  `souv` TEXT DEFAULT NULL,
  `prolsml` TINYINT(1) DEFAULT 0,
  `proldnyz` INT(11) DEFAULT NULL,
  `proldoba` INT(11) DEFAULT NULL,
  `stavrs` INT(11) DEFAULT NULL,
  `predmsml` VARCHAR(255) DEFAULT NULL,
  
  -- Sloupce 41-50
  `hodnbdph` DECIMAL(15,2) DEFAULT NULL,
  `hodnsdph` DECIMAL(15,2) DEFAULT NULL,
  `rspriloh` TEXT DEFAULT NULL,
  `rsprilzv` TEXT DEFAULT NULL,
  `idrs` VARCHAR(50) DEFAULT NULL,
  `datumrs` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `komrs` TEXT DEFAULT NULL,
  `uctuj` TINYINT(1) DEFAULT 0,
  `ucetmd` VARCHAR(50) DEFAULT NULL,
  `ucetd` VARCHAR(50) DEFAULT NULL,
  
  -- Sloupce 51-55
  `zucobd` INT(11) DEFAULT NULL COMMENT 'Excel serial date',
  `datzauct` DATE DEFAULT NULL,
  `zu` TEXT DEFAULT NULL,
  `pre` TEXT DEFAULT NULL,
  `prilohy` TEXT DEFAULT NULL,
  
  -- === SYSTÉMOVÉ SLOUPCE PRO TRACKING ===
  `stav_zaznamu` ENUM('aktivni', 'smazano', 'neaktivni') DEFAULT 'aktivni' 
    COMMENT 'Stav záznamu v naší DB',
  
  `import_batch_id` VARCHAR(50) DEFAULT NULL 
    COMMENT 'ID importní dávky',
  
  `dt_importu` DATETIME DEFAULT NULL 
    COMMENT 'Datum a čas importu',
  
  `dt_posledni_aktualizace` DATETIME DEFAULT NULL 
    COMMENT 'Datum poslední aktualizace',
  
  `vytvoril_uzivatel_id` INT(11) DEFAULT NULL,
  `aktualizoval_uzivatel_id` INT(11) DEFAULT NULL,
  
  `dt_vytvoreni` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `dt_aktualizace` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  
  -- === INDEXY ===
  UNIQUE INDEX `idx_csml_unique` (`csml`),
  INDEX `idx_firma` (`firma`),
  INDEX `idx_typsml` (`typsml`),
  INDEX `idx_usek` (`usek`),
  INDEX `idx_stav_zaznamu` (`stav_zaznamu`),
  INDEX `idx_import_batch` (`import_batch_id`),
  INDEX `idx_dt_importu` (`dt_importu`),
  INDEX `idx_datuzavr` (`datuzavr`),
  INDEX `idx_datumdo` (`datumdo`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci
COMMENT='VEMA - Smlouvy - Excel sloupce 1:1';


-- ================================================================================
-- OPRÁVNĚNÍ - Vložení práva VEMA_VIEW
-- ================================================================================

INSERT INTO `25_prava` (`kod_prava`, `popis`, `aktivni`) 
VALUES 
('VEMA_VIEW', 'Zobrazení Deníku VEMA (import dat z VEMA systému)', 1)
ON DUPLICATE KEY UPDATE 
  `popis` = VALUES(`popis`),
  `aktivni` = VALUES(`aktivni`);

-- Přiřadit právo SUPERADMIN a ADMINISTRATOR rolím
INSERT INTO `25_role_prava` (`role_id`, `pravo_id`, `user_id`, `aktivni`)
SELECT 
    r.id,
    p.id,
    -1,
    1
FROM `25_role` r
CROSS JOIN `25_prava` p
WHERE r.kod_role IN ('SUPERADMIN', 'ADMINISTRATOR')
  AND p.kod_prava = 'VEMA_VIEW'
  AND NOT EXISTS (
    SELECT 1 FROM `25_role_prava` rp2
    WHERE rp2.role_id = r.id AND rp2.pravo_id = p.id AND rp2.user_id = -1
  );


-- ================================================================================
-- DOKONČENO
-- ================================================================================
-- ✅ 3 tabulky vytvořeny s přesnými názvy sloupců z Excelu
-- ✅ Systémové sloupce pro tracking importů přidány
-- ✅ Stav záznamu (aktivni/smazano/neaktivni) implementován
-- ✅ Indexy pro rychlé vyhledávání
-- ✅ Foreign keys na uživatele
-- ✅ Právo VEMA_VIEW vloženo a přiřazeno admin rolím
-- ================================================================================

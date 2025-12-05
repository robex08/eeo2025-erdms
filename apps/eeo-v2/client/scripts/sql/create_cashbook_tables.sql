-- ============================================================================
-- POKLADNÍ KNIHA - SQL SKRIPTY PRO VYTVOŘENÍ TABULEK
-- ============================================================================
-- Datum: 8. listopadu 2025
-- MySQL verze: 5.5.43
-- Kódování: UTF-8 (utf8_czech_ci)
-- ============================================================================

-- ============================================================================
-- 1. TABULKA: 25a_pokladny_uzivatele
-- Popis: Číselník přiřazení pokladen k uživatelům
-- Účel: Podpora více pokladen per-user + zástupy
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25a_pokladny_uzivatele` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uzivatel_id` INT(10) UNSIGNED NOT NULL COMMENT 'ID uživatele',
  `cislo_pokladny` INT(11) NOT NULL COMMENT 'Číslo pokladny (např. 1, 2, 3...)',
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL COMMENT 'Kód pracoviště (např. HK, PB, ME)',
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL COMMENT 'Název pracoviště',
  `ciselna_rada_vpd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada VPD - výdaje (např. 591)',
  `ciselna_rada_ppd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada PPD - příjmy (např. 491)',
  `je_hlavni` TINYINT(1) DEFAULT 0 COMMENT 'Hlavní pokladna uživatele (1=ano, 0=ne)',
  `platne_od` DATE NOT NULL COMMENT 'Platnost přiřazení od',
  `platne_do` DATE DEFAULT NULL COMMENT 'Platnost do (NULL = aktivní)',
  `poznamka` TEXT COMMENT 'Poznámka (např. "Zástup za kolegu")',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `vytvoril` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_uzivatel_pokladna_obdobi` (`uzivatel_id`, `cislo_pokladny`, `platne_od`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_cislo_pokladny` (`cislo_pokladny`),
  KEY `idx_platne_od_do` (`platne_od`, `platne_do`),
  CONSTRAINT `fk_pokladny_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci 
COMMENT='Přiřazení pokladen k uživatelům (podpora více pokladen + zástupy)';

-- ============================================================================
-- 2. TABULKA: 25a_pokladni_knihy
-- Popis: Hlavní záznamy pokladních knih
-- Účel: Jedna kniha = jeden měsíc pro jednu pokladnu
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25a_pokladni_knihy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `prirazeni_pokladny_id` INT(11) NOT NULL COMMENT 'ID přiřazení pokladny (FK)',
  `uzivatel_id` INT(10) UNSIGNED NOT NULL COMMENT 'ID uživatele (majitel pokladny)',
  `rok` SMALLINT(4) NOT NULL COMMENT 'Rok (např. 2025)',
  `mesic` TINYINT(2) NOT NULL COMMENT 'Měsíc (1-12)',
  `cislo_pokladny` INT(11) NOT NULL COMMENT 'Číslo pokladny (z tabulky přiřazení)',
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL COMMENT 'Kód pracoviště (např. HK) - kopie z přiřazení',
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL COMMENT 'Název pracoviště - kopie z přiřazení',
  `ciselna_rada_vpd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada VPD (prefix pro výdaje)',
  `ciselna_rada_ppd` VARCHAR(10) DEFAULT NULL COMMENT 'Číselná řada PPD (prefix pro příjmy)',
  `prevod_z_predchoziho` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Převod z předchozího měsíce (Kč)',
  `pocatecni_stav` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Počáteční stav (= převod z předchozího)',
  `koncovy_stav` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Konečný stav měsíce (Kč)',
  `celkove_prijmy` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Celkové příjmy za měsíc (Kč)',
  `celkove_vydaje` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Celkové výdaje za měsíc (Kč)',
  `pocet_zaznamu` INT(11) DEFAULT 0 COMMENT 'Počet záznamů v pokladní knize',
  `stav_knihy` ENUM('aktivni', 'uzavrena_uzivatelem', 'zamknuta_spravcem') DEFAULT 'aktivni' 
    COMMENT 'Stav knihy: aktivni / uzavrena_uzivatelem / zamknuta_spravcem',
  `uzavrena_uzivatelem_kdy` DATETIME DEFAULT NULL COMMENT 'Kdy uživatel uzavřel měsíc',
  `zamknuta_spravcem_kdy` DATETIME DEFAULT NULL COMMENT 'Kdy správce zamknul knihu',
  `zamknuta_spravcem_kym` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID správce, který zamknul',
  `poznamky` TEXT COMMENT 'Poznámky k pokladní knize',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` DATETIME DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  `vytvoril` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  `aktualizoval` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_prirazeni_obdobi` (`prirazeni_pokladny_id`, `rok`, `mesic`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_cislo_pokladny` (`cislo_pokladny`),
  KEY `idx_rok_mesic` (`rok`, `mesic`),
  KEY `idx_stav_knihy` (`stav_knihy`),
  CONSTRAINT `fk_pokladni_knihy_prirazeni` FOREIGN KEY (`prirazeni_pokladny_id`) 
    REFERENCES `25a_pokladny_uzivatele` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_pokladni_knihy_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pokladni_knihy_spravce` FOREIGN KEY (`zamknuta_spravcem_kym`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci 
COMMENT='Pokladní knihy - hlavní záznamy (měsíční knihy)';

-- ============================================================================
-- 3. TABULKA: 25a_pokladni_polozky
-- Popis: Jednotlivé položky (záznamy) v pokladní knize
-- Účel: Příjmy a výdaje s automatickým číslováním dokladů
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25a_pokladni_polozky` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `pokladni_kniha_id` INT(11) NOT NULL COMMENT 'ID pokladní knihy (FK)',
  `datum_zapisu` DATE NOT NULL COMMENT 'Datum zápisu',
  `cislo_dokladu` VARCHAR(20) NOT NULL COMMENT 'Číslo dokladu (P001, V591-001, atd.)',
  `cislo_poradi_v_roce` INT(11) NOT NULL COMMENT 'Pořadové číslo v rámci roku (1-999)',
  `typ_dokladu` ENUM('prijem', 'vydaj') NOT NULL COMMENT 'Typ dokladu (příjem/výdaj)',
  `obsah_zapisu` VARCHAR(500) NOT NULL COMMENT 'Obsah zápisu (popis operace)',
  `komu_od_koho` VARCHAR(255) DEFAULT NULL COMMENT 'Jméno osoby (komu/od koho)',
  `castka_prijem` DECIMAL(10,2) DEFAULT NULL COMMENT 'Příjem (Kč)',
  `castka_vydaj` DECIMAL(10,2) DEFAULT NULL COMMENT 'Výdaj (Kč)',
  `zustatek_po_operaci` DECIMAL(10,2) NOT NULL COMMENT 'Zůstatek po této operaci (Kč)',
  `lp_kod` VARCHAR(50) DEFAULT NULL COMMENT 'Kód LP (limitované přísliby)',
  `lp_popis` VARCHAR(255) DEFAULT NULL COMMENT 'Popis LP kódu',
  `poznamka` TEXT COMMENT 'Poznámka k záznamu',
  `poradi_radku` INT(11) NOT NULL DEFAULT 0 COMMENT 'Pořadí řádku (pro sorting)',
  `smazano` TINYINT(1) DEFAULT 0 COMMENT 'Soft delete (0=aktivní, 1=smazaný)',
  `smazano_kdy` DATETIME DEFAULT NULL COMMENT 'Datum smazání',
  `smazano_kym` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který smazal',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` DATETIME DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  `vytvoril` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  `aktualizoval` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  PRIMARY KEY (`id`),
  KEY `idx_pokladni_kniha_id` (`pokladni_kniha_id`),
  KEY `idx_datum_zapisu` (`datum_zapisu`),
  KEY `idx_cislo_dokladu` (`cislo_dokladu`),
  KEY `idx_typ_dokladu` (`typ_dokladu`),
  KEY `idx_smazano` (`smazano`),
  KEY `idx_lp_kod` (`lp_kod`),
  CONSTRAINT `fk_polozky_pokladni_kniha` FOREIGN KEY (`pokladni_kniha_id`) 
    REFERENCES `25a_pokladni_knihy` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_polozky_smazano_kym` FOREIGN KEY (`smazano_kym`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci 
COMMENT='Položky pokladní knihy (jednotlivé záznamy příjmů/výdajů)';

-- ============================================================================
-- 4. TABULKA: 25a_pokladni_audit
-- Popis: Audit trail - historie všech změn
-- Účel: Sledování změn pro účetní kontrolu a compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25a_pokladni_audit` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `typ_entity` ENUM('kniha', 'polozka') NOT NULL COMMENT 'Typ entity (kniha/položka)',
  `entita_id` INT(11) NOT NULL COMMENT 'ID entity (pokladni_kniha_id nebo polozka_id)',
  `akce` ENUM('vytvoreni', 'uprava', 'smazani', 'obnoveni', 'uzavreni', 'otevreni', 'zamknuti', 'odemknuti') NOT NULL 
    COMMENT 'Typ akce',
  `uzivatel_id` INT(10) UNSIGNED NOT NULL COMMENT 'ID uživatele, který provedl akci',
  `stare_hodnoty` TEXT COMMENT 'Staré hodnoty (JSON)',
  `nove_hodnoty` TEXT COMMENT 'Nové hodnoty (JSON)',
  `ip_adresa` VARCHAR(45) DEFAULT NULL COMMENT 'IP adresa uživatele',
  `user_agent` VARCHAR(255) DEFAULT NULL COMMENT 'User agent prohlížeče',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum a čas akce',
  PRIMARY KEY (`id`),
  KEY `idx_entita` (`typ_entity`, `entita_id`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_akce` (`akce`),
  KEY `idx_vytvoreno` (`vytvoreno`),
  CONSTRAINT `fk_audit_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci 
COMMENT='Audit log pokladních knih (historie změn)';

-- ============================================================================
-- 5. TABULKA: 25a_nastaveni_globalni
-- Popis: Globální nastavení aplikace
-- Účel: Konfigurace (např. použití prefixu v číslování dokladů)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25a_nastaveni_globalni` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `klic` VARCHAR(100) NOT NULL COMMENT 'Klíč nastavení',
  `hodnota` TEXT COMMENT 'Hodnota (JSON nebo jednoduchá hodnota)',
  `popis` VARCHAR(255) DEFAULT NULL COMMENT 'Popis nastavení',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` DATETIME DEFAULT NULL COMMENT 'Datum aktualizace',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_klic` (`klic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci 
COMMENT='Globální nastavení aplikace';

-- ============================================================================
-- INICIALIZACE GLOBÁLNÍHO NASTAVENÍ
-- ============================================================================

-- Nastavení: Použít prefix v číslování dokladů
INSERT INTO `25a_nastaveni_globalni` (`klic`, `hodnota`, `popis`, `vytvoreno`) 
VALUES ('cashbook_use_prefix', '1', 'Použít prefix v číslování dokladů (1=ano, 0=ne)', NOW())
ON DUPLICATE KEY UPDATE `hodnota` = '1';

-- ============================================================================
-- TRIGGERY PRO AUTOMATICKOU AKTUALIZACI ČASŮ
-- ============================================================================

-- Trigger pro 25a_pokladni_knihy - aktualizace času
DELIMITER $$
CREATE TRIGGER `tr_pokladni_knihy_before_update`
BEFORE UPDATE ON `25a_pokladni_knihy`
FOR EACH ROW
BEGIN
  SET NEW.aktualizovano = NOW();
END$$
DELIMITER ;

-- Trigger pro 25a_pokladni_polozky - aktualizace času
DELIMITER $$
CREATE TRIGGER `tr_pokladni_polozky_before_update`
BEFORE UPDATE ON `25a_pokladni_polozky`
FOR EACH ROW
BEGIN
  SET NEW.aktualizovano = NOW();
END$$
DELIMITER ;

-- Trigger pro 25a_nastaveni_globalni - aktualizace času
DELIMITER $$
CREATE TRIGGER `tr_nastaveni_before_update`
BEFORE UPDATE ON `25a_nastaveni_globalni`
FOR EACH ROW
BEGIN
  SET NEW.aktualizovano = NOW();
END$$
DELIMITER ;

-- ============================================================================
-- HOTOVO! ✅
-- ============================================================================
-- Vytvořeno 5 tabulek:
-- 1. 25a_pokladny_uzivatele      - přiřazení pokladen
-- 2. 25a_pokladni_knihy          - měsíční knihy
-- 3. 25a_pokladni_polozky        - jednotlivé záznamy
-- 4. 25a_pokladni_audit          - audit trail
-- 5. 25a_nastaveni_globalni      - globální konfigurace
--
-- + 3 triggery pro automatickou aktualizaci časů
-- ============================================================================

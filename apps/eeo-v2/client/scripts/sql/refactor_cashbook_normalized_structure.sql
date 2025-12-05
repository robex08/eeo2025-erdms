-- ============================================================================
-- REFACTORING POKLADNÍ KNIHY - NORMALIZOVANÁ STRUKTURA
-- ============================================================================
-- Datum: 8. listopadu 2025
-- Účel: Oddělení definice pokladny od přiřazení uživatelů
-- Důvod: Podpora sdílených pokladen (více uživatelů = 1 pokladna)
-- MySQL verze: 5.5.43+
-- ============================================================================

-- ============================================================================
-- KROK 1: ZÁLOHA EXISTUJÍCÍCH DAT (pokud existují)
-- ============================================================================

-- Pokud máte data, uložte si je
CREATE TABLE IF NOT EXISTS `25a_pokladny_uzivatele_backup` AS 
SELECT * FROM `25a_pokladny_uzivatele`;

-- ============================================================================
-- KROK 2: DROP EXISTUJÍCÍCH TABULEK (v opačném pořadí závislostí)
-- ============================================================================

-- Drop závislých tabulek
DROP TABLE IF EXISTS `25a_pokladni_polozky`;
DROP TABLE IF EXISTS `25a_pokladni_knihy`;
DROP TABLE IF EXISTS `25a_pokladny_uzivatele`;

-- ============================================================================
-- KROK 3: NOVÁ TABULKA - 25a_pokladny (master data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25a_pokladny` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cislo_pokladny` INT(11) NOT NULL COMMENT 'Číslo pokladny (např. 100, 101, 102...)',
  `nazev` VARCHAR(255) DEFAULT NULL COMMENT 'Název pokladny (např. "Sdílená pokladna IT")',
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL COMMENT 'Kód pracoviště (např. HK, PB, ME)',
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL COMMENT 'Název pracoviště',
  
  -- VPD (výdaje)
  `ciselna_rada_vpd` VARCHAR(10) NOT NULL COMMENT 'Číselná řada VPD - výdaje (např. 591)',
  `vpd_od_cislo` INT(11) DEFAULT 1 COMMENT 'Počáteční číslo VPD dokladu (výdaje od)',
  
  -- PPD (příjmy)
  `ciselna_rada_ppd` VARCHAR(10) NOT NULL COMMENT 'Číselná řada PPD - příjmy (např. 491)',
  `ppd_od_cislo` INT(11) DEFAULT 1 COMMENT 'Počáteční číslo PPD dokladu (příjmy od)',
  
  `aktivni` TINYINT(1) DEFAULT 1 COMMENT 'Aktivní pokladna (1=ano, 0=ne)',
  `poznamka` TEXT COMMENT 'Poznámka k pokladně',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  `aktualizovano` DATETIME DEFAULT NULL COMMENT 'Datum poslední aktualizace',
  `vytvoril` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který vytvořil',
  `aktualizoval` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který naposledy upravil',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cislo_pokladny` (`cislo_pokladny`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_kod_pracoviste` (`kod_pracoviste`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci 
COMMENT='Definice pokladen (master data - VPD/PPD čísla, pracoviště)';

-- ============================================================================
-- KROK 4: NOVÁ TABULKA - 25a_pokladny_uzivatele (many-to-many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25a_pokladny_uzivatele` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `pokladna_id` INT(11) NOT NULL COMMENT 'ID pokladny (FK)',
  `uzivatel_id` INT(10) UNSIGNED NOT NULL COMMENT 'ID uživatele (FK)',
  `je_hlavni` TINYINT(1) DEFAULT 0 COMMENT 'Hlavní pokladna uživatele (1=ano, 0=ne)',
  `platne_od` DATE NOT NULL COMMENT 'Platnost přiřazení od',
  `platne_do` DATE DEFAULT NULL COMMENT 'Platnost do (NULL = aktivní)',
  `poznamka` TEXT COMMENT 'Poznámka (např. "Zástup za kolegu", "Sdílená pokladna")',
  `vytvoreno` DATETIME NOT NULL COMMENT 'Datum vytvoření přiřazení',
  `vytvoril` INT(10) UNSIGNED DEFAULT NULL COMMENT 'ID uživatele, který vytvořil přiřazení',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pokladna_uzivatel_obdobi` (`pokladna_id`, `uzivatel_id`, `platne_od`),
  KEY `idx_pokladna_id` (`pokladna_id`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_platne_od_do` (`platne_od`, `platne_do`),
  KEY `idx_je_hlavni` (`je_hlavni`),
  
  CONSTRAINT `fk_prirazeni_pokladna` FOREIGN KEY (`pokladna_id`) 
    REFERENCES `25a_pokladny` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prirazeni_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci 
COMMENT='Přiřazení uživatelů k pokladnám (many-to-many - podpora sdílených pokladen)';

-- ============================================================================
-- KROK 5: NOVÁ TABULKA - 25a_pokladni_knihy (upravená FK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25a_pokladni_knihy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `prirazeni_id` INT(11) NOT NULL COMMENT 'ID přiřazení pokladny uživateli (FK)',
  `pokladna_id` INT(11) NOT NULL COMMENT 'ID pokladny (FK) - denormalizace pro rychlejší dotazy',
  `uzivatel_id` INT(10) UNSIGNED NOT NULL COMMENT 'ID uživatele (majitel knihy)',
  `rok` SMALLINT(4) NOT NULL COMMENT 'Rok (např. 2025)',
  `mesic` TINYINT(2) NOT NULL COMMENT 'Měsíc (1-12)',
  
  -- Denormalizovaná data z pokladny (pro rychlejší přístup)
  `cislo_pokladny` INT(11) NOT NULL COMMENT 'Číslo pokladny (kopie z 25a_pokladny)',
  `kod_pracoviste` VARCHAR(50) DEFAULT NULL COMMENT 'Kód pracoviště (kopie)',
  `nazev_pracoviste` VARCHAR(255) DEFAULT NULL COMMENT 'Název pracoviště (kopie)',
  `ciselna_rada_vpd` VARCHAR(10) DEFAULT NULL COMMENT 'VPD prefix (kopie)',
  `ciselna_rada_ppd` VARCHAR(10) DEFAULT NULL COMMENT 'PPD prefix (kopie)',
  
  -- Finanční data
  `prevod_z_predchoziho` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Převod z předchozího měsíce (Kč)',
  `pocatecni_stav` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Počáteční stav (= převod z předchozího)',
  `koncovy_stav` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Konečný stav měsíce (Kč)',
  `celkove_prijmy` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Celkové příjmy za měsíc (Kč)',
  `celkove_vydaje` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Celkové výdaje za měsíc (Kč)',
  `pocet_zaznamu` INT(11) DEFAULT 0 COMMENT 'Počet záznamů v pokladní knize',
  
  -- Stavy knihy
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
  UNIQUE KEY `unique_uzivatel_pokladna_obdobi` (`uzivatel_id`, `pokladna_id`, `rok`, `mesic`),
  KEY `idx_prirazeni_id` (`prirazeni_id`),
  KEY `idx_pokladna_id` (`pokladna_id`),
  KEY `idx_uzivatel_id` (`uzivatel_id`),
  KEY `idx_rok_mesic` (`rok`, `mesic`),
  KEY `idx_stav_knihy` (`stav_knihy`),
  
  CONSTRAINT `fk_knihy_prirazeni` FOREIGN KEY (`prirazeni_id`) 
    REFERENCES `25a_pokladny_uzivatele` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_knihy_pokladna` FOREIGN KEY (`pokladna_id`) 
    REFERENCES `25a_pokladny` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_knihy_uzivatel` FOREIGN KEY (`uzivatel_id`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_knihy_spravce` FOREIGN KEY (`zamknuta_spravcem_kym`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci 
COMMENT='Pokladní knihy - hlavní záznamy (měsíční knihy)';

-- ============================================================================
-- KROK 6: TABULKA - 25a_pokladni_polozky (beze změny)
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
  KEY `idx_typ_dokladu` (`typ_dokladu`),
  KEY `idx_smazano` (`smazano`),
  KEY `idx_poradi_radku` (`poradi_radku`),
  
  CONSTRAINT `fk_polozky_kniha` FOREIGN KEY (`pokladni_kniha_id`) 
    REFERENCES `25a_pokladni_knihy` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_polozky_vytvoril` FOREIGN KEY (`vytvoril`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_polozky_smazal` FOREIGN KEY (`smazano_kym`) 
    REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_czech_ci 
COMMENT='Položky pokladní knihy (příjmy a výdaje)';

-- ============================================================================
-- KROK 7: TESTOVACÍ DATA
-- ============================================================================

-- Vytvořit pokladny
INSERT INTO `25a_pokladny` 
  (`cislo_pokladny`, `nazev`, `kod_pracoviste`, `nazev_pracoviste`, 
   `ciselna_rada_vpd`, `vpd_od_cislo`, `ciselna_rada_ppd`, `ppd_od_cislo`, 
   `aktivni`, `vytvoreno`, `vytvoril`)
VALUES
  (100, 'Sdílená pokladna IT', 'IT', 'IT oddělení', '599', 1, '499', 1, 1, NOW(), 1),
  (101, 'Testovací pokladna', 'EN', 'Ekonomické oddělení', '598', 50, '498', 25, 1, NOW(), 1),
  (102, 'Pokladna Robert Holovský', 'IT', 'IT oddělení', '597', 1, '497', 1, 1, NOW(), 1);

-- Přiřadit uživatele k pokladnám
-- User 1 (Super ADMIN) -> Pokladna 100 (sdílená)
INSERT INTO `25a_pokladny_uzivatele`
  (`pokladna_id`, `uzivatel_id`, `je_hlavni`, `platne_od`, `vytvoreno`, `vytvoril`)
VALUES
  (1, 1, 1, '2025-11-08', NOW(), 1);

-- User 102 (Tereza Bezoušková) -> Pokladna 100 (sdílená - stejná jako User 1)
INSERT INTO `25a_pokladny_uzivatele`
  (`pokladna_id`, `uzivatel_id`, `je_hlavni`, `platne_od`, `poznamka`, `vytvoreno`, `vytvoril`)
VALUES
  (1, 102, 0, '2025-11-08', 'Sdílená pokladna s admin', NOW(), 1);

-- User 105 (Tereza Bezoušková THP) -> Pokladna 101
INSERT INTO `25a_pokladny_uzivatele`
  (`pokladna_id`, `uzivatel_id`, `je_hlavni`, `platne_od`, `vytvoreno`, `vytvoril`)
VALUES
  (2, 105, 1, '2025-11-08', NOW(), 1);

-- User 100 (Robert Holovský) -> Pokladna 102
INSERT INTO `25a_pokladny_uzivatele`
  (`pokladna_id`, `uzivatel_id`, `je_hlavni`, `platne_od`, `vytvoreno`, `vytvoril`)
VALUES
  (3, 100, 1, '2025-11-08', NOW(), 1);

-- ============================================================================
-- KROK 8: VERIFIKACE
-- ============================================================================

-- Zobrazit pokladny
SELECT * FROM `25a_pokladny`;

-- Zobrazit přiřazení (včetně join na uživatele a pokladny)
SELECT 
  pu.id AS prirazeni_id,
  p.cislo_pokladny,
  p.nazev AS nazev_pokladny,
  p.ciselna_rada_vpd,
  p.vpd_od_cislo,
  p.ciselna_rada_ppd,
  p.ppd_od_cislo,
  u.username,
  CONCAT(u.jmeno, ' ', u.prijmeni) AS uzivatel_jmeno,
  pu.je_hlavni,
  pu.platne_od,
  pu.platne_do,
  pu.poznamka
FROM `25a_pokladny_uzivatele` pu
JOIN `25a_pokladny` p ON p.id = pu.pokladna_id
JOIN `25_uzivatele` u ON u.id = pu.uzivatel_id
ORDER BY p.cislo_pokladny, u.prijmeni;

-- ============================================================================
-- KONEC SKRIPTU
-- ============================================================================

/*
✅ VÝHODY NOVÉ STRUKTURY:

1. **Sdílené pokladny** - více uživatelů může mít stejnou pokladnu
   - Stejná VPD/PPD čísla pro všechny
   - Žádná duplicita dat

2. **Centrální správa** - změna VPD/PPD se projeví u všech uživatelů
   - Upravit jednou v `25a_pokladny`
   - Automaticky platí pro všechna přiřazení

3. **Historie přiřazení** - `platne_od/do` umožňuje sledovat zástupy
   - Uživatel A měl pokladnu od-do
   - Uživatel B (zástup) má pokladnu od-do

4. **Normalizace** - žádná duplicita konfigurace pokladny
   - VPD/PPD uloženo 1x
   - Přiřazení uživatelů N-krát

📊 PŘÍKLAD POUŽITÍ:

Pokladna 100 (VPD=599, PPD=499):
  ├── User 1 (Super ADMIN) - hlavní
  └── User 102 (Tereza) - sdílená

Změním VPD z 599 na 598:
  → Projeví se automaticky u obou uživatelů
*/

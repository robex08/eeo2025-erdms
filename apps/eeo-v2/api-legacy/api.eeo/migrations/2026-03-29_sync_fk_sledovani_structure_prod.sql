-- =============================================================================
-- MIGRACE: Synchronizace struktury FK Sledování tabulek PROD → DEV
-- =============================================================================
-- 
-- Datum: 2026-03-29
-- Verze: v2.37
-- Autor: Auto-generated
-- 
-- DŮVOD:
--   Po deployment v2.37 byla zjištěna odlišná struktura tabulek
--   25a_fk_sledovani a 25a_fk_sledovani_udalosti mezi PROD a DEV.
--   DEV má modernější strukturu (ENUM, UNSIGNED, better constraints).
--   
-- KONTROLA:
--   Obě tabulky jsou v PROD PRÁZDNÉ (0 záznamů) - bezpečná migrace!
--
-- CÍLOVÁ DATABÁZE: eeo2025 (PRODUKCE)
--
-- =============================================================================

USE eeo2025;

-- -----------------------------------------------------------------------------
-- KROK 1: DROP existujících tabulek (jsou prázdné)
-- -----------------------------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `25a_fk_sledovani_udalosti`;
DROP TABLE IF EXISTS `25a_fk_sledovani`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- KROK 2: CREATE TABLE podle DEV struktury - 25a_fk_sledovani
-- -----------------------------------------------------------------------------

CREATE TABLE `25a_fk_sledovani` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `objednavka_id` int(10) unsigned NOT NULL DEFAULT 0 COMMENT '0 = neaplikuje se (FA případ)',
  `faktura_id` int(10) unsigned NOT NULL DEFAULT 0 COMMENT '0 = neaplikuje se (OBJ případ)',
  `entita_typ` enum('OBJ','FA','OBJ_FA') NOT NULL COMMENT 'OBJ=jen objednávka, FA=jen faktura, OBJ_FA=oba',
  `section_kontext` varchar(512) DEFAULT NULL COMMENT 'Čárkami oddělené klíče sekcí, kde byl případ poprvé/naposledy vidět',
  `stav` enum('OPEN','IN_PROGRESS','RESOLVED','IGNORED') NOT NULL DEFAULT 'OPEN',
  `priorita` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1=nízká, 2=střední, 3=vysoká',
  `vyzaduje_akci` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1=vyžaduje pozornost, 0=OK/splněno',
  `prirazeno_user_id` int(10) unsigned DEFAULT NULL COMMENT 'Přiřazeno konkrétnímu uživateli (NULL = nikomu)',
  `dt_uzavreni` datetime DEFAULT NULL,
  `uzavrel_user_id` int(10) unsigned DEFAULT NULL,
  `vytvoril_user_id` int(10) unsigned NOT NULL,
  `dt_vytvoreni` datetime NOT NULL DEFAULT current_timestamp(),
  `upravil_user_id` int(10) unsigned DEFAULT NULL,
  `dt_upravy` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_entita` (`objednavka_id`,`faktura_id`),
  KEY `idx_obj` (`objednavka_id`),
  KEY `idx_fa` (`faktura_id`),
  KEY `idx_stav` (`stav`),
  KEY `idx_prirazeno` (`prirazeno_user_id`),
  KEY `idx_vyzaduje` (`vyzaduje_akci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='FK sledování – jeden případ per finanční entitu (OBJ/FA/OBJ_FA)';

-- -----------------------------------------------------------------------------
-- KROK 3: CREATE TABLE podle DEV struktury - 25a_fk_sledovani_udalosti
-- -----------------------------------------------------------------------------

CREATE TABLE `25a_fk_sledovani_udalosti` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sledovani_id` int(10) unsigned NOT NULL COMMENT 'FK → 25a_fk_sledovani.id',
  `typ` enum('KOMENTAR','ZMENA_STAVU','ZMENA_PRIORITY','PRIRAZENI','ZMENA_VYZADUJE_AKCI','AUTO_SYSTEM') NOT NULL DEFAULT 'KOMENTAR',
  `text_zprava` text DEFAULT NULL COMMENT 'Volný text (komentář, popis změny)',
  `stav_pred` varchar(32) DEFAULT NULL COMMENT 'Hodnota PŘED změnou (pro ZMENA_* typy)',
  `stav_po` varchar(32) DEFAULT NULL COMMENT 'Hodnota PO změně',
  `vytvoril_user_id` int(10) unsigned DEFAULT NULL,
  `dt_vytvoreni` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sledovani` (`sledovani_id`),
  KEY `idx_typ` (`typ`),
  KEY `idx_vytvoril` (`vytvoril_user_id`),
  CONSTRAINT `fk_slu_sledovani` FOREIGN KEY (`sledovani_id`) REFERENCES `25a_fk_sledovani` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Journal událostí pro FK sledování případů';

-- -----------------------------------------------------------------------------
-- OVĚŘENÍ
-- -----------------------------------------------------------------------------

SELECT 
  TABLE_NAME,
  ENGINE,
  TABLE_COLLATION,
  TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME IN ('25a_fk_sledovani', '25a_fk_sledovani_udalosti')
ORDER BY TABLE_NAME;

-- -----------------------------------------------------------------------------
-- HOTOVO
-- -----------------------------------------------------------------------------
-- Tabulky byly úspěšně synchronizovány s DEV strukturou.
-- PRODUKCE má nyní stejnou strukturu jako DEV.
-- =============================================================================

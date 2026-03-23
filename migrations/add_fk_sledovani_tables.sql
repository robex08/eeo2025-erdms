-- ============================================================
-- FK SLEDOVANI - Finanční kontrola: sledování případů
-- Datum: 2026-03-23
-- DB:    EEO-OSTRA-DEV
-- ============================================================
-- 
-- Popis: Dvě nové tabulky pro DB-backed sledování výsledků
--        finanční kontroly v modulu StatsReports.
--        Nahrazuje dosavadní localStorage řešení (renderNoteCell).
--
-- 25a_fk_sledovani          ... jeden případ (case) per entita
-- 25a_fk_sledovani_udalosti ... journal událostí pro každý případ
--
-- Logika entity:
--   OBJ     → objednavka_id = <id>, faktura_id = 0
--   FA      → objednavka_id = 0,    faktura_id = <id>
--   OBJ_FA  → objednavka_id = <id>, faktura_id = <id>
-- (sentinel hodnota 0 = "neaplikuje se", umožňuje správný UNIQUE KEY)
-- ============================================================

-- Hlavní tabulka: jeden případ per entita
CREATE TABLE IF NOT EXISTS `25a_fk_sledovani` (
  `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `objednavka_id`     INT UNSIGNED    NOT NULL DEFAULT 0
                        COMMENT '0 = neaplikuje se (FA případ)',
  `faktura_id`        INT UNSIGNED    NOT NULL DEFAULT 0
                        COMMENT '0 = neaplikuje se (OBJ případ)',
  `entita_typ`        ENUM('OBJ','FA','OBJ_FA') NOT NULL
                        COMMENT 'OBJ=jen objednávka, FA=jen faktura, OBJ_FA=oba',
  `section_kontext`   VARCHAR(512)    NULL
                        COMMENT 'Čárkami oddělené klíče sekcí, kde byl případ poprvé/naposledy vidět',
  `stav`              ENUM('OPEN','IN_PROGRESS','RESOLVED','IGNORED') NOT NULL DEFAULT 'OPEN',
  `priorita`          TINYINT(1)      NOT NULL DEFAULT 1
                        COMMENT '1=nízká, 2=střední, 3=vysoká',
  `vyzaduje_akci`     TINYINT(1)      NOT NULL DEFAULT 1
                        COMMENT '1=vyžaduje pozornost, 0=OK/splněno',
  `prirazeno_user_id` INT UNSIGNED    NULL
                        COMMENT 'Přiřazeno konkrétnímu uživateli (NULL = nikomu)',
  `dt_uzavreni`       DATETIME        NULL,
  `uzavrel_user_id`   INT UNSIGNED    NULL,
  `vytvoril_user_id`  INT UNSIGNED    NOT NULL,
  `dt_vytvoreni`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `upravil_user_id`   INT UNSIGNED    NULL,
  `dt_upravy`         DATETIME        NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_entita` (`objednavka_id`, `faktura_id`),
  INDEX `idx_obj`       (`objednavka_id`),
  INDEX `idx_fa`        (`faktura_id`),
  INDEX `idx_stav`      (`stav`),
  INDEX `idx_prirazeno` (`prirazeno_user_id`),
  INDEX `idx_vyzaduje`  (`vyzaduje_akci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='FK sledování – jeden případ per finanční entitu (OBJ/FA/OBJ_FA)';

-- Tabulka událostí (journal / audit log)
CREATE TABLE IF NOT EXISTS `25a_fk_sledovani_udalosti` (
  `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `sledovani_id`      INT UNSIGNED    NOT NULL
                        COMMENT 'FK → 25a_fk_sledovani.id',
  `typ`               ENUM(
                        'KOMENTAR',
                        'ZMENA_STAVU',
                        'ZMENA_PRIORITY',
                        'PRIRAZENI',
                        'ZMENA_VYZADUJE_AKCI',
                        'AUTO_SYSTEM'
                      ) NOT NULL DEFAULT 'KOMENTAR',
  `text_zprava`       TEXT            NULL
                        COMMENT 'Volný text (komentář, popis změny)',
  `stav_pred`         VARCHAR(32)     NULL
                        COMMENT 'Hodnota PŘED změnou (pro ZMENA_* typy)',
  `stav_po`           VARCHAR(32)     NULL
                        COMMENT 'Hodnota PO změně',
  `vytvoril_user_id`  INT UNSIGNED    NULL,
  `dt_vytvoreni`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sledovani` (`sledovani_id`),
  INDEX `idx_typ`       (`typ`),
  INDEX `idx_vytvoril`  (`vytvoril_user_id`),
  CONSTRAINT `fk_slu_sledovani`
    FOREIGN KEY (`sledovani_id`)
    REFERENCES `25a_fk_sledovani`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Journal událostí pro FK sledování případů';

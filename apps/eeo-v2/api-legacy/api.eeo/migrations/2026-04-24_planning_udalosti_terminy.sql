-- Modul plánování - podpora více termínů pro jednu událost
-- Popis: Umožňuje k jedné události (25_plan_udalosti) přiřadit více termínů
-- Datum: 2026-04-24
-- Autor: GitHub Copilot
-- Poznámka: Idempotentní skript

-- ============================================================================
-- Tabulka: 25_plan_udalosti_terminy
-- Účel: Jedna událost může mít 1..N termínů (např. opakovaná schůzka)
-- Pokud tabulka obsahuje termíny, dt_od/dt_do na 25_plan_udalosti jsou
-- chápány jako "hlavní" (první) termín a v seznamu se zobrazují všechny.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `25_plan_udalosti_terminy` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `udalost_id` INT(11) NOT NULL COMMENT 'ID události (FK 25_plan_udalosti)',
  `dt_od` DATETIME NOT NULL COMMENT 'Datum a čas začátku termínu',
  `dt_do` DATETIME NULL COMMENT 'Datum a čas konce termínu',
  `poradi` INT(11) DEFAULT 0 COMMENT 'Pořadí termínu (0 = hlavní)',
  `poznamka` VARCHAR(255) NULL COMMENT 'Volitelná poznámka k termínu',
  `dt_created` DATETIME NOT NULL COMMENT 'Datum vytvoření',
  PRIMARY KEY (`id`),
  KEY `idx_udalost` (`udalost_id`),
  KEY `idx_dt_od` (`dt_od`),
  CONSTRAINT `fk_udalost_terminy` FOREIGN KEY (`udalost_id`)
    REFERENCES `25_plan_udalosti` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Jedna událost může mít více termínů';

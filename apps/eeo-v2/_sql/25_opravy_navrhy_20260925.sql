-- Opravy (BETA) - sdílené koncepty ručních oprav vazeb + historie pro Undo
-- DEV: 2026-09-25 (EEO-OSTRA-DEV), PROD: viz _docs/DEPLOY_TODO.md
--
-- typ OBJ_SML_FA: faktura napojená přímo na smlouvu (smlouva_id) se přepojí
-- na objednávku financovanou z téže smlouvy (objednavka_id, smlouva_id = NULL).
--   KONCEPT  - jen návrh, faktura se nemění (sdílený pro všechny s modulem)
--   ULOZENO  - zapsáno do faktury; puvodni_* drží hodnoty pro Undo
--   VRACENO  - uložená změna vrácena zpět (Undo z historie)

CREATE TABLE IF NOT EXISTS `25_opravy_navrhy` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `typ` VARCHAR(32) NOT NULL DEFAULT 'OBJ_SML_FA',
  `faktura_id` INT NOT NULL,
  `objednavka_id` INT UNSIGNED NOT NULL,
  `smlouva_id` INT UNSIGNED NULL,
  `stav` ENUM('KONCEPT','ULOZENO','VRACENO') NOT NULL DEFAULT 'KONCEPT',
  `puvodni_objednavka_id` INT NULL,
  `puvodni_smlouva_id` INT UNSIGNED NULL,
  `vytvoril_id` INT NOT NULL,
  `dt_vytvoreni` DATETIME NOT NULL,
  `ulozil_id` INT NULL,
  `dt_ulozeni` DATETIME NULL,
  `vratil_id` INT NULL,
  `dt_vraceni` DATETIME NULL,
  -- jedna faktura smí mít jen jeden KONCEPT (NULL u ostatních stavů se neporovnává)
  `koncept_faktura_id` INT AS (IF(`stav` = 'KONCEPT', `faktura_id`, NULL)) PERSISTENT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_koncept_faktura` (`koncept_faktura_id`),
  KEY `idx_stav` (`stav`),
  KEY `idx_faktura` (`faktura_id`),
  KEY `idx_objednavka` (`objednavka_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

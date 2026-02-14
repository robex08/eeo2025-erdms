-- ============================================================================
-- Sticky poznámky (nová funkce) - DB návrh + migrace
--
-- ⚠️ POZOR:
-- - Tento soubor je určený pro DEV databázi.
-- - NEPOUŽÍVAT na produkci bez explicitního potvrzení.
-- - Název DB nehardcodovat (spouštět v cílové DB kontextu).
--
-- Cíle návrhu:
-- - 1 řádek = 1 sticky poznámka (per-note sync, menší konflikty mezi PC)
-- - Sdílení konkrétní sticky: per-user, per-usek, pro všechny
-- - Připraveno na komentáře (bez UI teď)
-- ============================================================================

-- Poznámky:
-- - data_json obsahuje kompletní JSON (content + layout + createdAt + viewport metadata apod.)
-- - version slouží pro optimistic locking (konflikty na úrovni jedné sticky)

CREATE TABLE IF NOT EXISTS `25_sticky_poznamky` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `vlastnik_id` INT UNSIGNED NOT NULL,
  `klient_uid` VARCHAR(64) NOT NULL,
  `obsah_json` MEDIUMTEXT NOT NULL,
  `verze` INT UNSIGNED NOT NULL DEFAULT 1,
  `smazano` TINYINT(1) NOT NULL DEFAULT 0,
  `dt_vytvoreni` DATETIME NULL DEFAULT NULL,
  `dt_aktualizace` DATETIME NULL DEFAULT NULL,
  `dt_smazani` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_vlastnik_klient_uid` (`vlastnik_id`, `klient_uid`),
  KEY `idx_vlastnik_aktualizace` (`vlastnik_id`, `dt_aktualizace`),
  KEY `idx_aktualizace` (`dt_aktualizace`),
  KEY `idx_smazano` (`smazano`),
  CONSTRAINT `fk_sticky_vlastnik` FOREIGN KEY (`vlastnik_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Sdílení konkrétní sticky poznámky
-- cil_typ:
--  - UZIVATEL: cil_id = id uživatele (25_uzivatele.id)
--  - USEK:     cil_id = id úseku (25_useky.id)
--  - VSICHNI:  cil_id = NULL
-- prava_mask (bitmask):
--  - 1 = ČTENÍ
--  - 2 = ZÁPIS
--  - 4 = KOMENTÁŘ
CREATE TABLE IF NOT EXISTS `25_sticky_poznamky_sdileni` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `poznamka_id` INT UNSIGNED NOT NULL,
  `cil_typ` ENUM('UZIVATEL','USEK','VSICHNI') NOT NULL,
  `cil_id` INT UNSIGNED NULL DEFAULT NULL,
  `prava_mask` INT UNSIGNED NOT NULL DEFAULT 1,
  `vytvoril_user_id` INT UNSIGNED NULL DEFAULT NULL,
  `dt_vytvoreni` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_poznamka_cil` (`poznamka_id`, `cil_typ`, `cil_id`),
  KEY `idx_cil_lookup` (`cil_typ`, `cil_id`),
  CONSTRAINT `fk_sticky_sdileni_poznamka` FOREIGN KEY (`poznamka_id`) REFERENCES `25_sticky_poznamky` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sticky_sdileni_vytvoril` FOREIGN KEY (`vytvoril_user_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Komentáře (příprava do budoucna)
CREATE TABLE IF NOT EXISTS `25_sticky_poznamky_komentare` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `poznamka_id` INT UNSIGNED NOT NULL,
  `autor_user_id` INT UNSIGNED NOT NULL,
  `komentar_json` MEDIUMTEXT NOT NULL,
  `smazano` TINYINT(1) NOT NULL DEFAULT 0,
  `dt_vytvoreni` DATETIME NULL DEFAULT NULL,
  `dt_aktualizace` DATETIME NULL DEFAULT NULL,
  `dt_smazani` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_poznamka_komentare` (`poznamka_id`, `dt_vytvoreni`),
  CONSTRAINT `fk_sticky_komentar_poznamka` FOREIGN KEY (`poznamka_id`) REFERENCES `25_sticky_poznamky` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sticky_komentar_autor` FOREIGN KEY (`autor_user_id`) REFERENCES `25_uzivatele` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci;

-- Doporučení (pokud tabulky nemají automatickou aktualizaci dt_aktualizace):
-- V aplikační vrstvě vždy nastavovat dt_vytvoreni/dt_aktualizace.

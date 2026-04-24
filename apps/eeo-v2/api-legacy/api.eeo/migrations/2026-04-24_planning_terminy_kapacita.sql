-- Modul plánování - přidání kapacity termínů
-- Popis: Umožňuje definovat maximální počet registrací na termín události
-- Datum: 2026-04-24
-- Autor: GitHub Copilot
-- Poznámka: Idempotentní skript

-- ============================================================================
-- Přidání sloupce kapacita do tabulky 25_plan_udalosti_terminy
-- ============================================================================

-- Kontrola a přidání sloupce pro maximální kapacitu termínu
-- NULL = neomezená kapacita (výchozí chování)
-- Hodnota > 0 = omezení na N registrací (accepted odpovědí)

-- Přidání sloupce (pokud neexistuje)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = '25_plan_udalosti_terminy' 
  AND COLUMN_NAME = 'kapacita';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE `25_plan_udalosti_terminy` ADD COLUMN `kapacita` INT(11) NULL COMMENT ''Maximální počet registrací (accepted odpovědí). NULL = neomezeno'' AFTER `poznamka`',
  'SELECT ''Column kapacita already exists'' AS Info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index pro rychlé dotazování na termíny s omezenou kapacitou
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = '25_plan_udalosti_terminy' 
  AND INDEX_NAME = 'idx_kapacita';

SET @query = IF(@idx_exists = 0,
  'ALTER TABLE `25_plan_udalosti_terminy` ADD INDEX `idx_kapacita` (`kapacita`)',
  'SELECT ''Index idx_kapacita already exists'' AS Info'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- Úspěšně provedeno
-- ============================================================================
-- Nový sloupec:
--   - kapacita (INT NULL) - maximální počet přihlášených
--   - NULL = neomezeno
--   - hodnota > 0 = konkrétní limit
-- 
-- Logika kontroly bude v backend handleru (planningHandlers.php)
-- při ukládání odpovědi typu 'accepted'
-- ============================================================================

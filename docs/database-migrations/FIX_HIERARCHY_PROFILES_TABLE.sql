-- =====================================================
-- FIX HIERARCHY PROFILES TABLE - Vzdálená databáze
-- =====================================================
-- Datum: 16. prosince 2025
-- Účel: Zajistit, že tabulka 25_hierarchie_profily existuje
--       a má všechny potřebné sloupce včetně structure_json
-- =====================================================

-- Vytvoření tabulky, pokud neexistuje
CREATE TABLE IF NOT EXISTS `25_hierarchie_profily` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nazev` VARCHAR(100) NOT NULL,
  `popis` TEXT,
  `aktivni` TINYINT(1) NOT NULL DEFAULT 0,
  `vytvoril_user_id` INT UNSIGNED,
  `dt_vytvoreno` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dt_upraveno` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uniq_nazev` (`nazev`),
  KEY `idx_aktivni` (`aktivni`),
  KEY `idx_vytvoril` (`vytvoril_user_id`),
  
  CONSTRAINT `fk_hierarchy_profiles_user` 
    FOREIGN KEY (`vytvoril_user_id`) 
    REFERENCES `25_uzivatele`(`id`) 
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Visual notification hierarchy profiles with graph structure';

-- Přidat sloupec structure_json, pokud neexistuje
ALTER TABLE `25_hierarchie_profily` 
ADD COLUMN IF NOT EXISTS `structure_json` LONGTEXT NULL 
COMMENT 'Vizuální graf: {nodes: [], edges: []} - vztahy, scope, notifikace, pozice';

-- Vytvořit výchozí profil, pokud tabulka je prázdná
INSERT IGNORE INTO `25_hierarchie_profily` 
  (`nazev`, `popis`, `aktivni`, `structure_json`, `vytvoril_user_id`) 
VALUES 
  ('Výchozí profil', 'Automaticky vytvořený výchozí profil hierarchie', 1, 
   '{"nodes":[],"edges":[]}', 
   (SELECT id FROM 25_uzivatele WHERE username = 'admin' LIMIT 1));

-- Ověření struktury tabulky
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM 
  INFORMATION_SCHEMA.COLUMNS
WHERE 
  TABLE_SCHEMA = 'eeo2025' 
  AND TABLE_NAME = '25_hierarchie_profily'
ORDER BY 
  ORDINAL_POSITION;

-- Zobrazit existující profily
SELECT 
  id,
  nazev,
  popis,
  aktivni,
  CASE 
    WHEN structure_json IS NULL THEN 'NULL'
    WHEN structure_json = '' THEN 'PRÁZDNÉ'
    WHEN structure_json = '{"nodes":[],"edges":[]}' THEN 'PRÁZDNÁ STRUKTURA'
    ELSE CONCAT('DATA (', LENGTH(structure_json), ' bytů)')
  END as structure_status,
  dt_vytvoreno,
  dt_upraveno
FROM 
  25_hierarchie_profily
ORDER BY 
  aktivni DESC, nazev ASC;

-- =====================================================
-- HOTOVO!
-- =====================================================
-- Po spuštění tohoto scriptu:
-- 1. Tabulka 25_hierarchie_profily existuje
-- 2. Má sloupec structure_json
-- 3. Existuje alespoň 1 výchozí profil
-- 4. API by mělo vrátit profily do frontendu
-- =====================================================

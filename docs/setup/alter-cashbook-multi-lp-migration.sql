-- ============================================
-- MIGRACE: Pokladna - Více LP kódů pod jedním dokladem
-- Datum: 7. prosince 2025
-- PHP: 8.4, MySQL: Remote server
-- Kódování: utf8mb4_czech_ci (OPRAVA z danish_ci)
-- ============================================

-- Před spuštěním VŽDY ZÁLOHA:
-- mysqldump -u root -p eeo2025 25a_pokladni_polozky 25a_pokladni_knihy > backup_cashbook_$(date +%Y%m%d_%H%M%S).sql

USE eeo2025;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
START TRANSACTION;

-- ============================================
-- KROK 1: OPRAVA COLLATION na 25a_pokladni_polozky
-- ============================================
-- Oprava z utf8mb4_danish_ci na utf8mb4_czech_ci

ALTER TABLE `25a_pokladni_polozky` 
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci,
  MODIFY COLUMN `cislo_dokladu` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci NOT NULL COMMENT 'Číslo dokladu (P001, V591-001, atd.)',
  MODIFY COLUMN `typ_dokladu` enum('prijem','vydaj') CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci NOT NULL COMMENT 'Typ dokladu (příjem/výdaj)',
  MODIFY COLUMN `obsah_zapisu` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci NOT NULL COMMENT 'Obsah zápisu (popis operace)',
  MODIFY COLUMN `komu_od_koho` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'Jméno osoby (komu/od koho)',
  MODIFY COLUMN `lp_kod` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'DEPRECATED - use 25a_pokladni_polozky_detail',
  MODIFY COLUMN `lp_popis` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'DEPRECATED - use 25a_pokladni_polozky_detail',
  MODIFY COLUMN `poznamka` text CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'Poznámka k záznamu';

-- ============================================
-- KROK 2: PŘIDÁNÍ NOVÝCH SLOUPCŮ (master-detail struktura)
-- ============================================

ALTER TABLE `25a_pokladni_polozky`
  ADD COLUMN `castka_celkem` decimal(10,2) DEFAULT NULL COMMENT 'Celková částka dokladu (součet detail položek)' AFTER `komu_od_koho`,
  ADD COLUMN `ma_detail` tinyint(1) DEFAULT 0 COMMENT 'Má detail položky (0=jednoduchý, 1=složený)' AFTER `castka_celkem`;

-- ============================================
-- KROK 3: VYTVOŘENÍ DETAIL TABULKY
-- ============================================

CREATE TABLE IF NOT EXISTS `25a_pokladni_polozky_detail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `polozka_id` int(11) NOT NULL COMMENT 'FK → 25a_pokladni_polozky.id (master záznam)',
  `poradi` int(11) NOT NULL DEFAULT 1 COMMENT 'Pořadí podpoložky v rámci dokladu (1, 2, 3...)',
  `popis` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci NOT NULL COMMENT 'Popis této podpoložky (např. "Konvice", "Oprava kávovaru")',
  `castka` decimal(10,2) NOT NULL COMMENT 'Částka této podpoložky (Kč)',
  `lp_kod` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci NOT NULL COMMENT 'Kód LP (limitované přísliby) - POVINNÉ pro výdaje',
  `lp_popis` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'Popis LP kódu',
  `poznamka` text CHARACTER SET utf8mb4 COLLATE utf8mb4_czech_ci DEFAULT NULL COMMENT 'Poznámka k podpoložce',
  `vytvoreno` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Datum vytvoření',
  `aktualizovano` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Datum poslední aktualizace',
  
  PRIMARY KEY (`id`),
  KEY `idx_polozka_id` (`polozka_id`),
  KEY `idx_poradi` (`poradi`),
  KEY `idx_lp_kod` (`lp_kod`),
  
  CONSTRAINT `fk_detail_polozka` FOREIGN KEY (`polozka_id`) 
    REFERENCES `25a_pokladni_polozky` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_czech_ci 
  COMMENT='Detail položky pokladny - více LP kódů pod jedním dokladem';

-- ============================================
-- KROK 4: MIGRACE EXISTUJÍCÍCH DAT
-- ============================================
-- Zkopírovat existující LP kódy do detail tabulky

-- 4a) Naplnit castka_celkem z původních sloupců
UPDATE `25a_pokladni_polozky`
SET 
  castka_celkem = COALESCE(castka_vydaj, castka_prijem, 0)
WHERE castka_celkem IS NULL;

-- 4b) Nastavit ma_detail flag pro záznamy s LP kódem
UPDATE `25a_pokladni_polozky`
SET ma_detail = 1
WHERE lp_kod IS NOT NULL AND lp_kod != '';

-- 4c) Zkopírovat existující LP záznamy do detail tabulky
INSERT INTO `25a_pokladni_polozky_detail` 
  (polozka_id, poradi, popis, castka, lp_kod, lp_popis, vytvoreno)
SELECT 
  id,
  1,
  obsah_zapisu,
  COALESCE(castka_vydaj, castka_prijem, 0),
  lp_kod,
  lp_popis,
  vytvoreno
FROM `25a_pokladni_polozky`
WHERE lp_kod IS NOT NULL 
  AND lp_kod != ''
  AND smazano = 0
  AND NOT EXISTS (
    SELECT 1 FROM `25a_pokladni_polozky_detail` d 
    WHERE d.polozka_id = 25a_pokladni_polozky.id
  );

-- ============================================
-- KROK 5: VALIDACE MIGRACE
-- ============================================

-- Kontrola: Počet záznamů s LP by měl být stejný
SELECT 
  'Master records s LP' as tabulka,
  COUNT(*) as pocet
FROM `25a_pokladni_polozky`
WHERE lp_kod IS NOT NULL AND lp_kod != '' AND smazano = 0

UNION ALL

SELECT 
  'Detail records',
  COUNT(*)
FROM `25a_pokladni_polozky_detail`;

-- Kontrola: Součty částek by měly odpovídat
SELECT 
  p.id,
  p.cislo_dokladu,
  p.castka_celkem as master_castka,
  SUM(d.castka) as detail_castka,
  ABS(p.castka_celkem - SUM(d.castka)) as rozdil
FROM `25a_pokladni_polozky` p
LEFT JOIN `25a_pokladni_polozky_detail` d ON d.polozka_id = p.id
WHERE p.ma_detail = 1
GROUP BY p.id
HAVING ABS(p.castka_celkem - SUM(d.castka)) > 0.01;

-- Pokud výše vrátí prázdný výsledek → migrace OK!

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- ROLLBACK PLÁN (v případě problémů)
-- ============================================
/*
START TRANSACTION;

-- Smazat detail tabulku
DROP TABLE IF EXISTS `25a_pokladni_polozky_detail`;

-- Vrátit sloupce
ALTER TABLE `25a_pokladni_polozky`
  DROP COLUMN `castka_celkem`,
  DROP COLUMN `ma_detail`;

-- Obnovit z backupu
-- mysql -u root -p eeo2025 < backup_cashbook_YYYYMMDD_HHMMSS.sql

COMMIT;
*/

-- ============================================
-- POZNÁMKY K MIGRACI
-- ============================================
/*
1. COLLATION změněno z utf8mb4_danish_ci → utf8mb4_czech_ci
2. Původní sloupce lp_kod, lp_popis označeny jako DEPRECATED (ne smazány!)
3. Detail tabulka má CASCADE DELETE - pokud se smaže master, smaže se i detail
4. castka_celkem je NULL safe - pokud není vyplněna, vezme se z původních sloupců
5. ma_detail flag umožňuje rozlišit staré (jednoduchý) vs nové (složený) záznamy
6. Migrace kopíruje data, NEMAZÁNÍ původních záznamů
7. PHP 8.4 kompatibilní - používá modern syntax
8. Remote MySQL - testováno na vzdáleném serveru
*/

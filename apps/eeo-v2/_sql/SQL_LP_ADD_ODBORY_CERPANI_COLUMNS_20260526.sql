-- =====================================================
-- SQL: Přidání sloupců pro odbory LP čerpání
-- =====================================================
-- Datum: 26. května 2026
-- Účel: Umožnit započítání odbory LP (faktury/pokladna) do čerpání
-- 
-- DATABÁZE: EEO-OSTRA-DEV (development)
-- TABULKA: 25_limitovane_prisliby_cerpani
-- =====================================================

USE `EEO-OSTRA-DEV`;

-- KROK 1: Přidat sloupec pro odbory faktury
-- (faktury bez objednávky, které mají přiřazený LP)
ALTER TABLE `25_limitovane_prisliby_cerpani`
ADD COLUMN `cerpano_odbory_faktury` DECIMAL(15,2) DEFAULT 0.00
    COMMENT 'Čerpání z faktur přiřazených přes odbory (bez objednávky)'
AFTER `cerpano_pokladna`;

-- KROK 2: Přidat sloupec pro odbory pokladnu
-- (pokladní položky s přiřazeným LP)
ALTER TABLE `25_limitovane_prisliby_cerpani`
ADD COLUMN `cerpano_odbory_pokladna` DECIMAL(15,2) DEFAULT 0.00
    COMMENT 'Čerpání z pokladních položek přiřazených přes odbory'
AFTER `cerpano_odbory_faktury`;

-- =====================================================
-- OVĚŘENÍ
-- =====================================================
-- Zobraz strukturu tabulky
DESCRIBE `25_limitovane_prisliby_cerpani`;

-- Zobraz statistiku (mělo by být 0.00 pro všechny záznamy)
SELECT 
    COUNT(*) as pocet_zaznamu,
    SUM(cerpano_odbory_faktury) as sum_odbory_faktury,
    SUM(cerpano_odbory_pokladna) as sum_odbory_pokladna
FROM `25_limitovane_prisliby_cerpani`;

-- =====================================================
-- ROLLBACK (v případě nutnosti vrácení změn)
-- =====================================================
-- ALTER TABLE `25_limitovane_prisliby_cerpani` DROP COLUMN `cerpano_odbory_faktury`;
-- ALTER TABLE `25_limitovane_prisliby_cerpani` DROP COLUMN `cerpano_odbory_pokladna`;

-- =====================================================
-- POZNÁMKY
-- =====================================================
-- • Sloupce jsou přidány s DEFAULT 0.00 → 100% zpětná kompatibilita
-- • Existující záznamy automaticky dostanou hodnotu 0.00
-- • Přepočet čerpání se musí aktualizovat v limitovanePrislibyCerpaniHandlers_v2_pdo.php
-- • Po přidání sloupců je nutné aktualizovat prepocetCerpaniPodleIdLP_PDO() funkci

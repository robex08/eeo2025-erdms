-- =============================================================================
-- MIGRATION SCRIPT: Kopie ostrých dat z PRODUKCE do DEV
-- =============================================================================
-- Datum: 2026-05-14
-- Autor: GitHub Copilot (PHPAPI agent)
-- 
-- Zdroj: eeo2025 (produkce) - READ-ONLY
-- Cíl: EEO-OSTRA-DEV (development) - WRITE
--
-- CO SE KOPÍRUJE:
-- 1. Kompletní data: Objednávky, Faktury, Přílohy, Roční poplatky
-- 2. Selektivně: Noví uživatelé (INSERT IGNORE)
-- 3. Kompletně: Role a práva všech uživatelů (TRUNCATE + INSERT)
-- =============================================================================

-- =============================================================================
-- PŘÍPRAVA: Zakázání foreign key checks pro DEV DB
-- =============================================================================
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- ČÁST 1: OBJEDNÁVKY A SOUVISEJÍCÍ DATA (KOMPLETNÍ PŘEPIS)
-- =============================================================================

-- 1.1 Objednávky - hlavní tabulka
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_objednavky`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_objednavky` 
SELECT * FROM eeo2025.`25a_objednavky`;

-- 1.2 Položky objednávek
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_objednavky_polozky`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_objednavky_polozky` 
SELECT * FROM eeo2025.`25a_objednavky_polozky`;

-- 1.3 Přílohy objednávek
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_objednavky_prilohy`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_objednavky_prilohy` 
SELECT * FROM eeo2025.`25a_objednavky_prilohy`;

-- 1.4 Komentáře k objednávkám
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_objednavky_komentare`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_objednavky_komentare` 
SELECT * FROM eeo2025.`25a_objednavky_komentare`;

-- 1.5 Čerpání limitovaných příslibů
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25_limitovane_prisliby_cerpani`;
INSERT INTO `EEO-OSTRA-DEV`.`25_limitovane_prisliby_cerpani` 
SELECT * FROM eeo2025.`25_limitovane_prisliby_cerpani`;

-- =============================================================================
-- ČÁST 2: FAKTURY A SOUVISEJÍCÍ DATA (KOMPLETNÍ PŘEPIS)
-- =============================================================================

-- 2.1 Faktury
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_objednavky_faktury`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_objednavky_faktury` 
SELECT * FROM eeo2025.`25a_objednavky_faktury`;

-- 2.2 Přílohy faktur
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_faktury_prilohy`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_faktury_prilohy` 
SELECT * FROM eeo2025.`25a_faktury_prilohy`;

-- 2.3 Čerpání LP z faktur
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_faktury_lp_cerpani`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_faktury_lp_cerpani` 
SELECT * FROM eeo2025.`25a_faktury_lp_cerpani`;

-- =============================================================================
-- ČÁST 3: ROČNÍ POPLATKY (KOMPLETNÍ PŘEPIS)
-- =============================================================================

-- 3.1 Roční poplatky - hlavní tabulka
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_rocni_poplatky`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_rocni_poplatky` 
SELECT * FROM eeo2025.`25a_rocni_poplatky`;

-- 3.2 Položky ročních poplatků
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_rocni_poplatky_polozky`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_rocni_poplatky_polozky` 
SELECT * FROM eeo2025.`25a_rocni_poplatky_polozky`;

-- 3.3 Přílohy ročních poplatků
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_rocni_poplatky_prilohy`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_rocni_poplatky_prilohy` 
SELECT * FROM eeo2025.`25a_rocni_poplatky_prilohy`;

-- =============================================================================
-- ČÁST 4: POKLADNÍ KNIHY (KOMPLETNÍ PŘEPIS) - souvisí s objednávkami
-- =============================================================================

-- 4.1 Pokladní knihy
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_pokladni_knihy`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_pokladni_knihy` 
SELECT * FROM eeo2025.`25a_pokladni_knihy`;

-- 4.2 Pokladní položky
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_pokladni_polozky`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_pokladni_polozky` 
SELECT * FROM eeo2025.`25a_pokladni_polozky`;

-- 4.3 Detail pokladních položek
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25a_pokladni_polozky_detail`;
INSERT INTO `EEO-OSTRA-DEV`.`25a_pokladni_polozky_detail` 
SELECT * FROM eeo2025.`25a_pokladni_polozky_detail`;

-- =============================================================================
-- ČÁST 5: UŽIVATELÉ - SELEKTIVNÍ PŘIDÁNÍ (pouze noví)
-- =============================================================================

-- 5.1 Přidat pouze nové uživatele (kteří chybí v dev)
-- INSERT IGNORE zajistí, že se nepřepíší existující profily
INSERT IGNORE INTO `EEO-OSTRA-DEV`.`25_uzivatele` 
SELECT * FROM eeo2025.`25_uzivatele`;

-- =============================================================================
-- ČÁST 6: ROLE A PRÁVA - KOMPLETNÍ SYNCHRONIZACE PRO VŠECHNY UŽIVATELE
-- =============================================================================

-- 6.1 Definice práv (číselník)
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25_prava`;
INSERT INTO `EEO-OSTRA-DEV`.`25_prava` 
SELECT * FROM eeo2025.`25_prava`;

-- 6.2 Definice rolí (číselník)
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25_role`;
INSERT INTO `EEO-OSTRA-DEV`.`25_role` 
SELECT * FROM eeo2025.`25_role`;

-- 6.3 Práva přiřazená k rolím
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25_role_prava`;
INSERT INTO `EEO-OSTRA-DEV`.`25_role_prava` 
SELECT * FROM eeo2025.`25_role_prava`;

-- 6.4 Role přiřazené uživatelům (KOMPLETNÍ PŘEPIS)
TRUNCATE TABLE `EEO-OSTRA-DEV`.`25_uzivatele_role`;
INSERT INTO `EEO-OSTRA-DEV`.`25_uzivatele_role` 
SELECT * FROM eeo2025.`25_uzivatele_role`;

-- =============================================================================
-- DOKONČENÍ: Povolení foreign key checks zpět
-- =============================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- Zobrazit statistiky po migraci
SELECT 
    'Objednávky' as tabulka,
    COUNT(*) as pocet_zaznamu
FROM `EEO-OSTRA-DEV`.`25a_objednavky`
UNION ALL
SELECT 
    'Faktury',
    COUNT(*)
FROM `EEO-OSTRA-DEV`.`25a_objednavky_faktury`
UNION ALL
SELECT 
    'Přílohy objednávek',
    COUNT(*)
FROM `EEO-OSTRA-DEV`.`25a_objednavky_prilohy`
UNION ALL
SELECT 
    'Přílohy faktur',
    COUNT(*)
FROM `EEO-OSTRA-DEV`.`25a_faktury_prilohy`
UNION ALL
SELECT 
    'Roční poplatky',
    COUNT(*)
FROM `EEO-OSTRA-DEV`.`25a_rocni_poplatky`
UNION ALL
SELECT 
    'Uživatelé',
    COUNT(*)
FROM `EEO-OSTRA-DEV`.`25_uzivatele`
UNION ALL
SELECT 
    'Uživatelské role',
    COUNT(*)
FROM `EEO-OSTRA-DEV`.`25_uzivatele_role`;

-- =============================================================================
-- POZNÁMKY:
-- =============================================================================
-- ✅ Provedeno: Kompletní kopie objednávek, faktur, příloh a ročních poplatků
-- ✅ Provedeno: Přidání nových uživatelů (INSERT IGNORE)
-- ✅ Provedeno: Synchronizace ROLÍ přiřazených uživatelům (přes 25_uzivatele_role)
-- ✅ Provedeno: Synchronizace PRÁV přiřazených rolím (přes 25_role_prava)
-- ⚠️  NEZMĚNĚNO: Profily stávajících uživatelů (jméno, email, atd.)
-- ℹ️  SYSTÉM PRÁV: Uživatel → Role → Práva (ne přímé přiřazení práv)
-- 
-- PŘÍLOHY NA DISKU:
-- ❌ Tento script nekopíruje fyzické soubory příloh!
-- ⚠️  Pro kopii souborů je třeba použít rsync:
--    rsync -av /var/www/erdms-platform/data/eeo-v2/prilohy/ \
--            /var/www/erdms-dev/data/eeo-v2/prilohy/
-- =============================================================================

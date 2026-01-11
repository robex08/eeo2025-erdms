-- ============================================
-- PRODUKČNÍ CLEANUP - Příprava na ostrý start
-- ============================================
-- Datum: 30. prosince 2025
-- Databáze: eeo2025 (PRODUCTION)
-- Účel: Smazání testovacích dat, ponechání konfigurace a vzorové objednávky ID=1
-- 
-- ⚠️ POZOR: Tento skript MĚNÍ PRODUKČNÍ DATA!
--          Před spuštěním vytvořit BACKUP!
-- ============================================

USE eeo2025;

-- ============================================
-- FÁZE 0: BACKUP KONTROLA
-- ============================================
-- Spustit před tímto skriptem:
-- mysqldump -u erdms_user -p -h 10.3.172.11 eeo2025 > /var/www/erdms-platform/backups/eeo2025-backup-$(date +%Y%m%d-%H%M%S).sql

-- ============================================
-- FÁZE 1: ANALÝZA PŘED SMAZÁNÍM
-- ============================================
SELECT '=== ANALÝZA: Počet řádků PŘED smazáním ===' AS '';

SELECT 
    'Objednávky' AS tabulka,
    COUNT(*) as celkem,
    SUM(CASE WHEN id = 1 THEN 1 ELSE 0 END) as vzorova_obj_1,
    COUNT(*) - SUM(CASE WHEN id = 1 THEN 1 ELSE 0 END) as ke_smazani
FROM 25a_objednavky;

SELECT 
    'Položky objednávek' AS tabulka,
    COUNT(*) as celkem,
    SUM(CASE WHEN objednavka_id = 1 THEN 1 ELSE 0 END) as vzorove_polozky,
    COUNT(*) - SUM(CASE WHEN objednavka_id = 1 THEN 1 ELSE 0 END) as ke_smazani
FROM 25a_objednavky_polozky;

SELECT 
    'Přílohy objednávek' AS tabulka,
    COUNT(*) as celkem,
    SUM(CASE WHEN objednavka_id = 1 THEN 1 ELSE 0 END) as vzorove_prilohy,
    COUNT(*) - SUM(CASE WHEN objednavka_id = 1 THEN 1 ELSE 0 END) as ke_smazani
FROM 25a_objednavky_prilohy;

SELECT 
    'Faktury k objednávkám' AS tabulka,
    COUNT(*) as celkem,
    SUM(CASE WHEN objednavka_id = 1 THEN 1 ELSE 0 END) as vzorove_faktury,
    COUNT(*) - SUM(CASE WHEN objednavka_id = 1 THEN 1 ELSE 0 END) as ke_smazani
FROM 25a_objednavky_faktury;

SELECT 'Přílohy faktur' AS tabulka, COUNT(*) as celkem FROM 25a_faktury_prilohy;
SELECT 'LP čerpání faktur' AS tabulka, COUNT(*) as celkem FROM 25a_faktury_lp_cerpani;
SELECT 'Notifikace' AS tabulka, COUNT(*) as celkem FROM 25_notifikace;
SELECT 'Notifikace - přečtení' AS tabulka, COUNT(*) as celkem FROM 25_notifikace_precteni;
SELECT 'Pokladní položky' AS tabulka, COUNT(*) as celkem FROM 25a_pokladni_polozky;
SELECT 'Pokladní audit' AS tabulka, COUNT(*) as celkem FROM 25a_pokladni_audit;
SELECT 'LP čerpání' AS tabulka, COUNT(*) as celkem FROM 25_limitovane_prisliby_cerpani;

-- ============================================
-- FÁZE 2: SMAZÁNÍ DAT
-- ============================================
-- Vypnout foreign key kontroly pro rychlejší smazání
SET FOREIGN_KEY_CHECKS = 0;

SELECT '=== MAZÁNÍ: Začínám mazat testovací data ===' AS '';

-- 1. OBJEDNÁVKY A SOUVISEJÍCÍ DATA (kromě ID=1)
SELECT '1/10 Mazání objednávek (kromě vzorové ID=1)...' AS progress;

-- Smazat přílohy objednávek (kromě ID=1)
DELETE FROM 25a_objednavky_prilohy WHERE objednavka_id != 1;

-- Smazat položky objednávek (kromě ID=1)
DELETE FROM 25a_objednavky_polozky WHERE objednavka_id != 1;

-- Smazat faktury k objednávkám (kromě ID=1)
DELETE FROM 25a_objednavky_faktury WHERE objednavka_id != 1;

-- Smazat objednávky (kromě ID=1)
DELETE FROM 25a_objednavky WHERE id != 1;

-- 2. FAKTURY A PŘÍLOHY (vše)
SELECT '2/10 Mazání faktur a příloh...' AS progress;

DELETE FROM 25a_faktury_prilohy;
DELETE FROM 25a_faktury_lp_cerpani;

-- 3. NOTIFIKACE - provozní data (vše)
SELECT '3/10 Mazání notifikací...' AS progress;

DELETE FROM 25_notifikace_precteni;
DELETE FROM 25_notifikace;
DELETE FROM 25_notifikace_fronta;
DELETE FROM 25_notifikace_audit;
DELETE FROM 25_notifikace_uzivatele_nastaveni;

-- 4. POKLADNA - testovací data (vše)
SELECT '4/10 Mazání pokladny...' AS progress;

DELETE FROM 25a_pokladni_polozky_detail;
DELETE FROM 25a_pokladni_polozky;
DELETE FROM 25a_pokladni_audit;
DELETE FROM 25a_pokladni_knihy;
-- POZOR: 25a_pokladny a 25a_pokladny_uzivatele NECHÁVÁM - konfigurace pokladen

-- 5. LP ČERPÁNÍ - testovací (vše)
SELECT '5/10 Mazání LP čerpání...' AS progress;

DELETE FROM 25_limitovane_prisliby_cerpani;

-- 6. BACKUP TABULKY - nepotřebné
SELECT '6/10 Mazání backup tabulek...' AS progress;

DROP TABLE IF EXISTS 25_notifikace_sablony_backup_20251222;

-- 7. CHAT - testovací data (vše prázdné, ale reset pro jistotu)
SELECT '7/10 Mazání chat dat...' AS progress;

DELETE FROM 25_chat_reakce;
DELETE FROM 25_chat_mentions;
DELETE FROM 25_chat_zpravy;
DELETE FROM 25_chat_prectene_zpravy;
DELETE FROM 25_chat_ucastnici;
DELETE FROM 25_chat_online_status;
DELETE FROM 25_chat_konverzace;

-- 8. AUDIT - testovací (vše prázdné, ale reset)
SELECT '8/10 Mazání auditních záznamů...' AS progress;

DELETE FROM 25_auditni_zaznamy;

-- 9. SPISOVKA LOG - testovací
SELECT '9/10 Mazání spisovka logů...' AS progress;

DELETE FROM 25_spisovka_zpracovani_log;

-- 10. UŽIVATELSKÉ POZNÁMKY - testovací
SELECT '10/10 Mazání uživatelských poznámek...' AS progress;

DELETE FROM 25_uzivatele_poznamky;

-- Zapnout zpět foreign key kontroly
SET FOREIGN_KEY_CHECKS = 1;

SELECT '=== MAZÁNÍ: Hotovo ===' AS '';

-- ============================================
-- FÁZE 3: RESET AUTO_INCREMENT
-- ============================================
SELECT '=== RESET: Resetuji AUTO_INCREMENT ===' AS '';

-- Objednávky - reset na 2 (ID=1 je vzorová)
ALTER TABLE 25a_objednavky AUTO_INCREMENT = 2;

-- Položky objednávek - zjistit max ID z vzorové objednávky a nastavit +1
SET @max_polozka_id = (SELECT COALESCE(MAX(id), 0) FROM 25a_objednavky_polozky WHERE objednavka_id = 1);
SET @sql = CONCAT('ALTER TABLE 25a_objednavky_polozky AUTO_INCREMENT = ', @max_polozka_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Přílohy objednávek - zjistit max ID z vzorové objednávky a nastavit +1
SET @max_priloha_id = (SELECT COALESCE(MAX(id), 0) FROM 25a_objednavky_prilohy WHERE objednavka_id = 1);
SET @sql = CONCAT('ALTER TABLE 25a_objednavky_prilohy AUTO_INCREMENT = ', @max_priloha_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Faktury k objednávkám - zjistit max ID z vzorové objednávky a nastavit +1
SET @max_faktura_obj_id = (SELECT COALESCE(MAX(id), 0) FROM 25a_objednavky_faktury WHERE objednavka_id = 1);
SET @sql = CONCAT('ALTER TABLE 25a_objednavky_faktury AUTO_INCREMENT = ', @max_faktura_obj_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Všechny ostatní - reset na 1
ALTER TABLE 25a_faktury_prilohy AUTO_INCREMENT = 1;
ALTER TABLE 25a_faktury_lp_cerpani AUTO_INCREMENT = 1;
ALTER TABLE 25_notifikace AUTO_INCREMENT = 1;
ALTER TABLE 25_notifikace_precteni AUTO_INCREMENT = 1;
ALTER TABLE 25_notifikace_fronta AUTO_INCREMENT = 1;
ALTER TABLE 25_notifikace_audit AUTO_INCREMENT = 1;
ALTER TABLE 25_notifikace_uzivatele_nastaveni AUTO_INCREMENT = 1;
ALTER TABLE 25a_pokladni_polozky AUTO_INCREMENT = 1;
ALTER TABLE 25a_pokladni_polozky_detail AUTO_INCREMENT = 1;
ALTER TABLE 25a_pokladni_audit AUTO_INCREMENT = 1;
ALTER TABLE 25a_pokladni_knihy AUTO_INCREMENT = 1;
ALTER TABLE 25_limitovane_prisliby_cerpani AUTO_INCREMENT = 1;
ALTER TABLE 25_chat_konverzace AUTO_INCREMENT = 1;
ALTER TABLE 25_chat_zpravy AUTO_INCREMENT = 1;
ALTER TABLE 25_chat_ucastnici AUTO_INCREMENT = 1;
ALTER TABLE 25_chat_prectene_zpravy AUTO_INCREMENT = 1;
ALTER TABLE 25_chat_reakce AUTO_INCREMENT = 1;
ALTER TABLE 25_chat_mentions AUTO_INCREMENT = 1;
ALTER TABLE 25_chat_online_status AUTO_INCREMENT = 1;
ALTER TABLE 25_auditni_zaznamy AUTO_INCREMENT = 1;
ALTER TABLE 25_spisovka_zpracovani_log AUTO_INCREMENT = 1;
ALTER TABLE 25_uzivatele_poznamky AUTO_INCREMENT = 1;

SELECT '=== RESET: Hotovo ===' AS '';

-- ============================================
-- FÁZE 4: VERIFIKACE PO SMAZÁNÍ
-- ============================================
SELECT '=== VERIFIKACE: Kontrola PO smazání ===' AS '';

SELECT 
    TABLE_NAME as tabulka,
    TABLE_ROWS as pocet_radku,
    AUTO_INCREMENT as dalsi_id,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS velikost_mb
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'eeo2025' 
AND TABLE_NAME LIKE '25a_%'
ORDER BY TABLE_ROWS DESC;

SELECT '--- Kontrola vzorové objednávky ID=1 ---' AS '';
SELECT * FROM 25a_objednavky WHERE id = 1;

SELECT '--- Položky vzorové objednávky ---' AS '';
SELECT COUNT(*) as pocet_polozek FROM 25a_objednavky_polozky WHERE objednavka_id = 1;

SELECT '--- Přílohy vzorové objednávky ---' AS '';
SELECT COUNT(*) as pocet_priloh FROM 25a_objednavky_prilohy WHERE objednavka_id = 1;

SELECT '--- Faktury vzorové objednávky ---' AS '';
SELECT COUNT(*) as pocet_faktur FROM 25a_objednavky_faktury WHERE objednavka_id = 1;

-- ============================================
-- FÁZE 5: CO ZŮSTALO NEDOTČENO (konfigurace)
-- ============================================
SELECT '=== NEDOTČENÉ TABULKY (konfigurace/číselníky) ===' AS '';

SELECT 'Notifikace šablony' as tabulka, COUNT(*) as pocet FROM 25_notifikace_sablony;
SELECT 'Notifikace typy událostí' as tabulka, COUNT(*) as pocet FROM 25_notifikace_typy_udalosti;
SELECT 'Uživatelé' as tabulka, COUNT(*) as pocet FROM 25_uzivatele;
SELECT 'Role' as tabulka, COUNT(*) as pocet FROM 25_role;
SELECT 'Práva' as tabulka, COUNT(*) as pocet FROM 25_prava;
SELECT 'Dodavatelé' as tabulka, COUNT(*) as pocet FROM 25_dodavatele;
SELECT 'Lokality' as tabulka, COUNT(*) as pocet FROM 25_lokality;
SELECT 'Úseky' as tabulka, COUNT(*) as pocet FROM 25_useky;
SELECT 'Pozice' as tabulka, COUNT(*) as pocet FROM 25_pozice;
SELECT 'Pokladny (konfigurace)' as tabulka, COUNT(*) as pocet FROM 25a_pokladny;
SELECT 'Pokladny uživatelé' as tabulka, COUNT(*) as pocet FROM 25a_pokladny_uzivatele;
SELECT 'Limitované příslíby' as tabulka, COUNT(*) as pocet FROM 25_limitovane_prisliby;
SELECT 'Smlouvy' as tabulka, COUNT(*) as pocet FROM 25_smlouvy;
SELECT 'DOCX šablony' as tabulka, COUNT(*) as pocet FROM 25_sablony_docx;
SELECT 'Šablony objednávek' as tabulka, COUNT(*) as pocet FROM 25_sablony_objednavek;
SELECT 'Globální nastavení' as tabulka, COUNT(*) as pocet FROM 25a_nastaveni_globalni;

-- ============================================
-- HOTOVO!
-- ============================================
SELECT '========================================' AS '';
SELECT '✅ CLEANUP DOKONČEN!' AS '';
SELECT '========================================' AS '';
SELECT 'Vzorová objednávka ID=1 PONECHÁNA včetně položek, příloh a faktur' AS info;
SELECT 'Všechna ostatní testovací data SMAZÁNA' AS info;
SELECT 'AUTO_INCREMENT RESETOVÁN' AS info;
SELECT 'Konfigurace a číselníky NEDOTČENY' AS info;
SELECT '========================================' AS '';

-- ============================================
-- POZNÁMKY
-- ============================================
-- 1. DEV databáze (eeo2025-dev) zůstává BEZE ZMĚNY
-- 2. Před spuštěním VŽDY vytvořit backup!
-- 3. Fyzické soubory příloh NEJSOU smazány - pouze DB záznamy
-- 4. Pro smazání souborů z disku:
--    rm -rf /var/www/erdms-platform/data/eeo-v2/prilohy/*
--    (kromě souborů patřících vzorové objednávce ID=1)

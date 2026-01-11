-- ============================================
-- PRODUKČNÍ DATABÁZE - INICIALIZAČNÍ ČIŠTĚNÍ
-- ============================================
-- Databáze: eeo2025 (PROD)
-- Datum: 20. prosince 2025
-- Účel: Příprava na první reálný test (4.1.2026)
--
-- ⚠️ VAROVÁNÍ: Tento script maže data!
-- ✅ Před spuštěním: VYTVOŘIT BACKUP!
--
-- SCHVÁLENO:
-- ✅ Runtime data (chat, notifikace, logy) - SMAZAT vše
-- ✅ Objednávky - SMAZAT vše KROMĚ ID=1
-- ✅ Pokladny - SMAZAT pouze data, PONECHAT definice a přiřazení
-- ❌ Smlouvy - PONECHAT (aktivní smlouvy)
-- ❌ Limitované přísliby - PONECHAT (definovaná data)
-- ❌ Uživatelé - PONECHAT vše včetně poznámek
-- ❌ Číselníky - PONECHAT vše
-- ❌ Legacy tabulky - PONECHAT, nemazat
-- ============================================

-- Bezpečnostní kontrola - script lze spustit POUZE na eeo2025
SELECT 
    CASE 
        WHEN DATABASE() = 'eeo2025' THEN 'OK - Databáze eeo2025 (PROD)'
        ELSE 'CHYBA - Špatná databáze! Script určen jen pro eeo2025!'
    END AS bezpecnostni_kontrola,
    DATABASE() as aktualni_databaze;

-- ⚠️ STOP! Zkontrolujte výše, že je správná databáze!
-- Pro pokračování odkomentujte řádek níže:
-- SET @pokracovat = 1;

-- ============================================
-- FÁZE 1: RUNTIME DATA (bezpečné smazání)
-- ============================================

-- Chat - všechna data
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM `25_chat_zpravy`;
DELETE FROM `25_chat_reakce`;
DELETE FROM `25_chat_prectene_zpravy`;
DELETE FROM `25_chat_mentions`;
DELETE FROM `25_chat_ucastnici`;
DELETE FROM `25_chat_konverzace`;
DELETE FROM `25_chat_online_status`;

-- Notifikace - runtime data
DELETE FROM `25_notifikace_precteni`;
DELETE FROM `25_notifikace`;
DELETE FROM `25_notifikace_fronta`;
DELETE FROM `25_notifikace_audit`;

-- Audit a debug logy
DELETE FROM `25_auditni_zaznamy`;
DELETE FROM `25_spisovka_zpracovani_log`;
DELETE FROM `debug_api_log`;
DELETE FROM `debug_notification_log`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- FÁZE 2: OBJEDNÁVKY (PONECHAT ID=1)
-- ============================================

-- ⚠️ POZOR: Ponecháváme objednávku s ID=1 jako vzorovou!

SET FOREIGN_KEY_CHECKS = 0;

-- Přílohy faktur (kromě faktur k obj. ID=1)
DELETE FROM `25a_faktury_prilohy`
WHERE id_faktury IN (
    SELECT id FROM `25a_objednavky_faktury` WHERE id_objednavky != 1
);

-- Faktury (kromě obj. ID=1)
DELETE FROM `25a_objednavky_faktury` WHERE id_objednavky != 1;

-- Přílohy objednávek (kromě ID=1)
DELETE FROM `25a_objednavky_prilohy` WHERE id_objednavky != 1;

-- Položky objednávek (kromě ID=1)
DELETE FROM `25a_objednavky_polozky` WHERE id_objednavky != 1;

-- Objednávky (kromě ID=1)
DELETE FROM `25a_objednavky` WHERE id != 1;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- FÁZE 3: POKLADNY (pouze data, definice PONECHAT)
-- ============================================

-- ⚠️ POZOR: Definice pokladen a přiřazení uživatelů ZŮSTÁVAJÍ!

SET FOREIGN_KEY_CHECKS = 0;

-- Detail položek - SMAZAT
DELETE FROM `25a_pokladni_polozky_detail`;

-- Položky - SMAZAT
DELETE FROM `25a_pokladni_polozky`;

-- Audit - SMAZAT
DELETE FROM `25a_pokladni_audit`;

-- Pokladní knihy - SMAZAT
DELETE FROM `25a_pokladni_knihy`;

-- ❌ Uživatelé pokladen - PONECHAT (definice)
-- DELETE FROM `25a_pokladny_uzivatele`;

-- ❌ Pokladny - PONECHAT (definice)
-- DELETE FROM `25a_pokladny`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- FÁZE 4: SMLOUVY - PONECHAT (aktivní smlouvy)
-- ============================================

-- ❌ Smlouvy jsou aktivní produkční data - NEMAZAT!
-- DELETE FROM `25_smlouvy_import_log`;
-- DELETE FROM `25_smlouvy`;

-- ============================================
-- FÁZE 5: LIMITOVANÉ PŘÍSLIBY - PONECHAT
-- ============================================

-- ❌ Limitované přísliby jsou definovaná data - NEMAZAT!
-- DELETE FROM `25_limitovane_prisliby_cerpani`;
-- DELETE FROM `25_limitovane_prisliby_zaloha`;
-- DELETE FROM `25_limitovane_prisliby`;

-- ============================================
-- FÁZE 6: UŽIVATELÉ - PONECHAT VŠE
-- ============================================

-- ❌ Uživatelé a jejich data PONECHAT!
-- DELETE FROM `25_uzivatele_poznamky`;
-- DELETE FROM `25_notifikace_uzivatele_nastaveni`;
-- DELETE FROM `25_uzivatel_nastaveni`;
-- DELETE FROM `25_uzivatele_role`;
-- DELETE FROM `25_hierarchie_profily`;
-- DELETE FROM `25_uzivatele`;

-- ============================================
-- FÁZE 7: RESET AUTO_INCREMENT
-- ============================================

-- Objednávky - reset na další ID po zachované obj. ID=1
ALTER TABLE `25a_objednavky` AUTO_INCREMENT = 2;
ALTER TABLE `25a_objednavky_polozky` AUTO_INCREMENT = 1;
ALTER TABLE `25a_objednavky_prilohy` AUTO_INCREMENT = 1;
ALTER TABLE `25a_objednavky_faktury` AUTO_INCREMENT = 1;
ALTER TABLE `25a_faktury_prilohy` AUTO_INCREMENT = 1;

-- Pokladny - reset pouze datových tabulek
ALTER TABLE `25a_pokladni_knihy` AUTO_INCREMENT = 1;
ALTER TABLE `25a_pokladni_polozky` AUTO_INCREMENT = 1;
ALTER TABLE `25a_pokladni_polozky_detail` AUTO_INCREMENT = 1;
ALTER TABLE `25a_pokladni_audit` AUTO_INCREMENT = 1;

-- ❌ Smlouvy - NERESETTOVAT (ponecháváme data)
-- ALTER TABLE `25_smlouvy` AUTO_INCREMENT = 1;

-- ❌ Limitované přísliby - NERESETTOVAT (ponecháváme data)
-- ALTER TABLE `25_limitovane_prisliby` AUTO_INCREMENT = 1;

-- Chat - reset
ALTER TABLE `25_chat_konverzace` AUTO_INCREMENT = 1;
ALTER TABLE `25_chat_zpravy` AUTO_INCREMENT = 1;
ALTER TABLE `25_chat_reakce` AUTO_INCREMENT = 1;

-- Notifikace - reset
ALTER TABLE `25_notifikace` AUTO_INCREMENT = 1;
ALTER TABLE `25_notifikace_fronta` AUTO_INCREMENT = 1;

-- Audit - reset
ALTER TABLE `25_auditni_zaznamy` AUTO_INCREMENT = 1;

-- ============================================
-- KONTROLA VÝSLEDKŮ
-- ============================================

SELECT '=== SMAZANÁ DATA ===' AS kategorie;

SELECT 
    'Objednávky (kromě ID=1)' AS tabulka,
    COUNT(*) AS pocet_zaznamu,
    CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '⚠️ Kontrola!' END AS status
FROM `25a_objednavky`
UNION ALL
SELECT 'Položky objednávek', COUNT(*), 
    CASE WHEN COUNT(*) >= 0 THEN '✅ OK' ELSE '⚠️ Kontrola!' END 
FROM `25a_objednavky_polozky`
UNION ALL
SELECT 'Přílohy objednávek', COUNT(*), '✅ OK' FROM `25a_objednavky_prilohy`
UNION ALL
SELECT 'Faktury', COUNT(*), '✅ OK' FROM `25a_objednavky_faktury`
UNION ALL
SELECT 'Přílohy faktur', COUNT(*), '✅ OK' FROM `25a_faktury_prilohy`
UNION ALL
SELECT 'Chat konverzace', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ Mělo být 0!' END 
FROM `25_chat_konverzace`
UNION ALL
SELECT 'Chat zprávy', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ Mělo být 0!' END 
FROM `25_chat_zpravy`
UNION ALL
SELECT 'Notifikace', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ Mělo být 0!' END 
FROM `25_notifikace`
UNION ALL
SELECT 'Audit záznamy', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ Mělo být 0!' END 
FROM `25_auditni_zaznamy`;

SELECT '=== PONECHANÁ DATA ===' AS kategorie;

SELECT 
    'Pokladny (definice)' AS tabulka,
    COUNT(*) AS pocet_zaznamu,
    '✅ Ponecháno' AS status
FROM `25a_pokladny`
UNION ALL
SELECT 'Pokladny - uživatelé', COUNT(*), '✅ Ponecháno' FROM `25a_pokladny_uzivatele`
UNION ALL
SELECT 'Pokladní knihy', COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN '✅ Vyčištěno' ELSE '⚠️ Kontrola' END 
FROM `25a_pokladni_knihy`
UNION ALL
SELECT 'Smlouvy', COUNT(*), '✅ Ponecháno' FROM `25_smlouvy`
UNION ALL
SELECT 'Limitované přísliby', COUNT(*), '✅ Ponecháno' FROM `25_limitovane_prisliby`
UNION ALL
SELECT 'Uživatelé', COUNT(*), '✅ Ponecháno' FROM `25_uzivatele`
UNION ALL
SELECT 'Role', COUNT(*), '✅ Ponecháno' FROM `25_role`
UNION ALL
SELECT 'Pozice', COUNT(*), '✅ Ponecháno' FROM `25_pozice`
UNION ALL
SELECT 'Lokality', COUNT(*), '✅ Ponecháno' FROM `25_lokality`;

-- ============================================
-- VÝSLEDEK
-- ============================================

SELECT 
    '✅ Čištění dokončeno!' AS status,
    NOW() AS cas_dokonceni,
    DATABASE() AS databaze;

SELECT 
    'SMAZÁNO:' AS akce,
    'Runtime data (chat, notifikace, logy)' AS co;
    
SELECT 
    'SMAZÁNO:' AS akce,
    'Objednávky kromě ID=1' AS co;
    
SELECT 
    'SMAZÁNO:' AS akce,
    'Data v pokladnách (položky, audit, knihy)' AS co;

SELECT 
    'PONECHÁNO:' AS akce,
    'Objednávka ID=1 (vzorová)' AS co;
    
SELECT 
    'PONECHÁNO:' AS akce,
    'Definice pokladen a přiřazení uživatelů' AS co;
    
SELECT 
    'PONECHÁNO:' AS akce,
    'Smlouvy (aktivní produkční data)' AS co;
    
SELECT 
    'PONECHÁNO:' AS akce,
    'Limitované přísliby (definovaná data)' AS co;
    
SELECT 
    'PONECHÁNO:' AS akce,
    'Uživatelé včetně poznámek a nastavení' AS co;
    
SELECT 
    'PONECHÁNO:' AS akce,
    'Všechny číselníky' AS co;
    
SELECT 
    'PONECHÁNO:' AS akce,
    'Legacy tabulky' AS co;

-- ============================================
-- DOPORUČENÍ PRO PŘÍŠTÍ SPUŠTĚNÍ (4.1.2026)
-- ============================================

/*
PŘED OSTRÝM SPUŠTĚNÍM 4.1.2026:

1. ✅ Vytvořit BACKUP databáze
2. ✅ Spustit tento script znovu
3. ✅ Zkontrolovat číselníky - jsou aktuální?
4. ✅ Zkontrolovat objednávku ID=1 - je vzorová?
5. ✅ Ověřit definice pokladen
6. ✅ Zkontrolovat uživatele - jsou správní lidé?
7. ✅ Testovat na DEV databázi PŘED spuštěním na PROD
*/

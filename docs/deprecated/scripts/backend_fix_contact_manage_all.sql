-- ============================================================================
-- BACKEND FIX: Oprava kontroly neexistujícího práva CONTACT_MANAGE_ALL
-- Prostředí: DEV
-- Datum: 2025-01-05
-- Soubor: /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/handlers.php
-- ============================================================================

-- PROBLÉM:
-- Backend kontroluje právo 'CONTACT_MANAGE_ALL' (handlers.php line 2098, 2120)
-- ale toto právo NEEXISTUJE v databázi!
--
-- Mělo by kontrolovat 'CONTACT_MANAGE' (ID 17)
-- nebo po migraci 'SUPPLIER_MANAGE' (ID 14)

-- ====================
-- KONTROLA
-- ====================

SELECT 'Kontrola existence práv:' as info;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'CONTACT_MANAGE_ALL') 
        THEN '✅ CONTACT_MANAGE_ALL existuje'
        ELSE '❌ CONTACT_MANAGE_ALL NEEXISTUJE (CHYBA!)'
    END as contact_manage_all_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'CONTACT_MANAGE') 
        THEN '✅ CONTACT_MANAGE existuje'
        ELSE '❌ CONTACT_MANAGE neexistuje'
    END as contact_manage_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'SUPPLIER_MANAGE') 
        THEN '✅ SUPPLIER_MANAGE existuje'
        ELSE '❌ SUPPLIER_MANAGE neexistuje'
    END as supplier_manage_status;

-- ====================
-- ŘEŠENÍ (volitelné)
-- ====================

-- VARIANTA A: Vytvořit CONTACT_MANAGE_ALL jako alias pro SUPPLIER_MANAGE
-- (pokud chceme zachovat kompatibilitu s backend kódem)
/*
INSERT INTO 25_prava (kod_prava, nazev, popis)
SELECT 'CONTACT_MANAGE_ALL', 'Správa všech kontaktů (legacy)', 'Alias pro SUPPLIER_MANAGE - zpětná kompatibilita'
WHERE NOT EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'CONTACT_MANAGE_ALL');

-- Dát CONTACT_MANAGE_ALL všem co mají SUPPLIER_MANAGE
INSERT INTO 25_uzivatele_prava (id_uzivatel, id_pravo)
SELECT 
    up.id_uzivatel,
    (SELECT id_pravo FROM 25_prava WHERE kod_prava = 'CONTACT_MANAGE_ALL')
FROM 25_uzivatele_prava up
JOIN 25_prava p ON up.id_pravo = p.id_pravo
WHERE p.kod_prava = 'SUPPLIER_MANAGE'
AND NOT EXISTS (
    SELECT 1 FROM 25_uzivatele_prava up2
    JOIN 25_prava p2 ON up2.id_pravo = p2.id_pravo
    WHERE up2.id_uzivatel = up.id_uzivatel
    AND p2.kod_prava = 'CONTACT_MANAGE_ALL'
);

SELECT 'Vytvořeno právo CONTACT_MANAGE_ALL jako alias' as status;
*/

-- ====================
-- DOPORUČENÍ
-- ====================

SELECT '
DOPORUČENÝ POSTUP:' as info;
SELECT 'Opravit backend handlers.php - změnit CONTACT_MANAGE_ALL na SUPPLIER_MANAGE' as krok_1;
SELECT 'Line 2098: if (in_array($kod, array(..., SUPPLIER_MANAGE)))' as krok_2;
SELECT 'Line 2120: if (in_array($kod, array(..., SUPPLIER_MANAGE)))' as krok_3;

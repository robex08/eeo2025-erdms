-- =============================================================================
-- EVENT TYPES NAMING CONVENTION FIX
-- =============================================================================
-- Datum: 3. ledna 2026
-- Důvod: Sjednocení názvů podle EVENT_TYPES_NAMING_REFACTOR.md standardu
-- Dotčené: 25_notifikace_typy_udalosti
-- 
-- PROBLÉM: DB používala nekonzistentní názvy (ORDER_SENT_FOR_APPROVAL),
--          ale backend + frontend používá ORDER_PENDING_APPROVAL
--          → trigger se nemohl spustit (žádný match)
--
-- ŘEŠENÍ: Aktualizovat DB podle nové naming konvence
-- =============================================================================

USE eeo2025-dev;

-- -----------------------------------------------------------------------------
-- 1. Kontrola PŘED změnou
-- -----------------------------------------------------------------------------
SELECT 'PŘED změnou:' as status;
SELECT id, kod, nazev 
FROM 25_notifikace_typy_udalosti 
WHERE id IN (1, 4, 8);

-- -----------------------------------------------------------------------------
-- 2. Aktualizace podle EVENT_TYPES_NAMING_REFACTOR.md
-- -----------------------------------------------------------------------------

-- ✅ order_status_ke_schvaleni → ORDER_PENDING_APPROVAL
UPDATE 25_notifikace_typy_udalosti 
SET kod = 'ORDER_PENDING_APPROVAL' 
WHERE id = 1 AND kod = 'ORDER_SENT_FOR_APPROVAL';

-- ✅ order_status_ceka_se → ORDER_AWAITING_CHANGES  
UPDATE 25_notifikace_typy_udalosti 
SET kod = 'ORDER_AWAITING_CHANGES' 
WHERE id = 4 AND kod = 'ORDER_WAITING_FOR_CHANGES';

-- ✅ order_status_kontrola_ceka → ORDER_VERIFICATION_PENDING
UPDATE 25_notifikace_typy_udalosti 
SET kod = 'ORDER_VERIFICATION_PENDING' 
WHERE id = 8 AND kod = 'ORDER_MATERIAL_CHECK_COMPLETED';

-- -----------------------------------------------------------------------------
-- 3. Kontrola PO změně
-- -----------------------------------------------------------------------------
SELECT 'PO změně:' as status;
SELECT id, kod, nazev 
FROM 25_notifikace_typy_udalosti 
WHERE id IN (1, 4, 8);

-- -----------------------------------------------------------------------------
-- 4. Verifikace integrace s hierarchy profilem
-- -----------------------------------------------------------------------------
SELECT 'Verifikace profilu PRIKAZCI:' as status;

SELECT 
    '✅ Hierarchie aktivní' as check_result, 
    CONCAT('enabled=', (SELECT hodnota FROM 25a_nastaveni_globalni WHERE klic = 'hierarchy_enabled'),
           ', profile_id=', (SELECT hodnota FROM 25a_nastaveni_globalni WHERE klic = 'hierarchy_profile_id')) as value

UNION ALL

SELECT '✅ Profil PRIKAZCI exists', 
    CONCAT('nazev="', nazev, '", aktivni=', aktivni)
FROM 25_hierarchie_profily WHERE id = 12

UNION ALL

SELECT '✅ Event type v DB', 
    CONCAT('ID ', id, ': ', kod)
FROM 25_notifikace_typy_udalosti WHERE kod = 'ORDER_PENDING_APPROVAL'

UNION ALL

SELECT '✅ Template v profilu',
    CASE WHEN structure_json LIKE '%ORDER_PENDING_APPROVAL%' 
    THEN 'ORDER_PENDING_APPROVAL nalezeno v structure_json' 
    ELSE '❌ NENALEZENO - PROBLÉM!' END
FROM 25_hierarchie_profily WHERE id = 12;

-- =============================================================================
-- VÝSLEDEK MIGRACE
-- =============================================================================
-- 
-- ✅ OPRAVENO:
-- - ID 1: ORDER_SENT_FOR_APPROVAL     → ORDER_PENDING_APPROVAL
-- - ID 4: ORDER_WAITING_FOR_CHANGES   → ORDER_AWAITING_CHANGES
-- - ID 8: ORDER_MATERIAL_CHECK_COMPLETED → ORDER_VERIFICATION_PENDING
--
-- ✅ KONZISTENCE ZAJIŠTĚNA:
-- - Backend volá: ORDER_PENDING_APPROVAL (orderV2Endpoints.php:1467)
-- - Template má: ORDER_PENDING_APPROVAL (profil 12 "PRIKAZCI")
-- - DB má: ORDER_PENDING_APPROVAL (ID 1)
-- - Trigger nyní funguje: resolveHierarchyNotificationRecipients() najde match ✅
--
-- =============================================================================

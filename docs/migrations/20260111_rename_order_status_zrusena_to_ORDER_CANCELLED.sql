-- =====================================================================
-- MIGRACE: order_status_zrusena → ORDER_CANCELLED
-- Datum: 11.1.2026
-- Důvod: 
--   1. Konzistence s ostatními typy (velká písmena)
--   2. Anglické názvy místo českých
--   3. Sjednocení naming convention
-- =====================================================================

-- =====================================================================
-- KROK 1: ZÁLOHOVÁNÍ
-- =====================================================================

-- Záloha aktuálních notifikací s tímto typem
CREATE TABLE IF NOT EXISTS 25_notifikace_backup_zrusena_20260111 AS
SELECT * FROM 25_notifikace WHERE typ = 'order_status_zrusena';

SELECT 
    COUNT(*) AS 'Zálohováno notifikací',
    MIN(dt_created) AS 'Od',
    MAX(dt_created) AS 'Do'
FROM 25_notifikace_backup_zrusena_20260111;


-- =====================================================================
-- KROK 2: UPDATE NOTIFIKACÍ V DATABÁZI
-- =====================================================================

-- Update typu v hlavní tabulce notifikací
UPDATE 25_notifikace 
SET typ = 'ORDER_CANCELLED'
WHERE typ = 'order_status_zrusena';

-- Kontrola změny
SELECT 
    'Po update' AS stav,
    COUNT(*) AS pocet 
FROM 25_notifikace 
WHERE typ = 'ORDER_CANCELLED';


-- =====================================================================
-- KROK 3: UPDATE V AUDITECH (pokud existuje)
-- =====================================================================

-- Update v audit tabulce (pokud existuje)
UPDATE 25_notifikace_audit 
SET typ = 'ORDER_CANCELLED'
WHERE typ = 'order_status_zrusena';


-- =====================================================================
-- KROK 4: UPDATE V FRONTĚ (pokud existuje)
-- =====================================================================

-- Update ve frontě (pokud existuje)
UPDATE 25_notifikace_fronta 
SET typ = 'ORDER_CANCELLED'
WHERE typ = 'order_status_zrusena';


-- =====================================================================
-- KROK 5: KONTROLA VÝSLEDKŮ
-- =====================================================================

-- Kontrola 1: Žádné staré notifikace by neměly zůstat
SELECT 
    'KONTROLA: Staré notifikace' AS test,
    COUNT(*) AS pocet,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ OK - Žádné staré notifikace'
        ELSE '❌ CHYBA - Stále existují staré notifikace!'
    END AS vysledek
FROM 25_notifikace 
WHERE typ = 'order_status_zrusena';

-- Kontrola 2: Nové notifikace by měly existovat
SELECT 
    'KONTROLA: Nové notifikace' AS test,
    COUNT(*) AS pocet,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ OK - Notifikace přejmenovány'
        ELSE '⚠️  WARNING - Žádné notifikace typu ORDER_CANCELLED'
    END AS vysledek
FROM 25_notifikace 
WHERE typ = 'ORDER_CANCELLED';

-- Kontrola 3: Srovnání počtu (mělo by být stejně)
SELECT 
    'Záloha' AS zdroj,
    COUNT(*) AS pocet
FROM 25_notifikace_backup_zrusena_20260111
UNION ALL
SELECT 
    'Aktuální (ORDER_CANCELLED)' AS zdroj,
    COUNT(*) AS pocet
FROM 25_notifikace 
WHERE typ = 'ORDER_CANCELLED';


-- =====================================================================
-- KROK 6: FINÁLNÍ SOUHRN
-- =====================================================================

SELECT 
    '✅ MIGRACE DOKONČENA' AS status,
    NOW() AS cas_dokonceni,
    (SELECT COUNT(*) FROM 25_notifikace WHERE typ = 'ORDER_CANCELLED') AS pocet_notifikaci,
    'order_status_zrusena → ORDER_CANCELLED' AS zmena;

-- =====================================================================
-- POZNÁMKY PRO DALŠÍ KROKY
-- =====================================================================

/*
⚠️ PO SPUŠTĚNÍ TÉTO MIGRACE JE NUTNÉ:

1. ✅ UPDATE FRONTENDU (React):
   - apps/eeo-v2/client/src/constants/notificationTypes.js
   - Změnit: ORDER_STATUS_ZRUSENA: 'order_status_zrusena' 
   - Na: ORDER_CANCELLED: 'ORDER_CANCELLED'
   - Přidat zpětnou kompatibilitu pro filtry

2. ✅ UPDATE BACKENDU (PHP):
   - apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/orderHandlers.php
   - apps/eeo-v2/api-legacy/api.eeo/v2025.03_25/lib/notificationHelpers.php
   - Všude kde se posílá 'order_status_zrusena', změnit na 'ORDER_CANCELLED'

3. ✅ UPDATE DOKUMENTACE:
   - docs/notifications/*.md
   - Aktualizovat tabulky a příklady

4. ⚠️ TESTOVÁNÍ:
   - Vytvořit testovací objednávku
   - Zrušit ji
   - Zkontrolovat, že notifikace má typ ORDER_CANCELLED
   - Zkontrolovat zobrazení ve frontendu
   - Zkontrolovat filtrování v notifikacích

5. ✅ REBUILD FRONTENDU:
   cd /var/www/erdms-dev/apps/eeo-v2/client
   npm run build

6. ✅ NASAZENÍ NA PRODUKCI:
   - Nejdříve otestovat na DEV
   - Pak spustit na PROD databázi
   - Pak nasadit nový build

7. 🗑️ ÚKLID (po 30 dnech):
   DROP TABLE IF EXISTS 25_notifikace_backup_zrusena_20260111;
*/

-- =====================================================================
-- ROLLBACK (V PŘÍPADĚ PROBLÉMŮ)
-- =====================================================================

/*
-- Vrátit zpět původní hodnoty z zálohy:

UPDATE 25_notifikace n
INNER JOIN 25_notifikace_backup_zrusena_20260111 b ON n.id = b.id
SET n.typ = 'order_status_zrusena'
WHERE n.typ = 'ORDER_CANCELLED';

-- Zkontrolovat:
SELECT COUNT(*) FROM 25_notifikace WHERE typ = 'order_status_zrusena';
*/

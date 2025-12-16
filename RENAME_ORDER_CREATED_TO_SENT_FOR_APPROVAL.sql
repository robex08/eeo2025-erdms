-- ============================================
-- RENAME: ORDER_CREATED → ORDER_SENT_FOR_APPROVAL
-- Datum: 16. prosince 2025
-- Důvod: ORDER_CREATED je matoucí - trigger se volá až při odeslání ke schválení, ne při vytvoření draftu
-- ============================================

USE erdms;

-- Backup před změnou
SELECT 'BACKUP před změnou:' as info;
SELECT * FROM 25_notifikace_typy_udalosti WHERE kod = 'ORDER_CREATED';

-- Aktualizace event type
UPDATE 25_notifikace_typy_udalosti 
SET 
  kod = 'ORDER_SENT_FOR_APPROVAL',
  nazev = 'Objednávka odeslána ke schválení',
  popis = 'Objednatel odeslal objednávku ke schválení → notifikace příkazci/schvalovateli (trigger: ODESLANA_KE_SCHVALENI)',
  dt_upraveno = NOW()
WHERE kod = 'ORDER_CREATED';

-- Verifikace změny
SELECT 'Po změně:' as info;
SELECT kod, nazev, popis, kategorie, aktivni 
FROM 25_notifikace_typy_udalosti 
WHERE kod = 'ORDER_SENT_FOR_APPROVAL';

-- Kontrola, že ORDER_CREATED již neexistuje
SELECT 'Kontrola - ORDER_CREATED by neměl existovat:' as info;
SELECT COUNT(*) as pocet_order_created 
FROM 25_notifikace_typy_udalosti 
WHERE kod = 'ORDER_CREATED';

-- Výpis všech order event types pro přehled
SELECT 'Všechny ORDER event types:' as info;
SELECT kod, nazev, kategorie, aktivni 
FROM 25_notifikace_typy_udalosti 
WHERE kategorie = 'orders'
ORDER BY kod;

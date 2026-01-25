-- ============================================================================
-- FIX DUPLICITNÍCH POKLADNÍCH KNIH
-- Datum: 25.1.2026
-- Problém: Systém vytvářel separátní knihy pro každého uživatele místo jedné 
--          společné knihy pro pokladnu
-- ============================================================================

-- KROK 1: POKLADNA 999 - Sloučení 3 knih do jedné
-- ============================================================================

-- Kniha 10 (Tereza Bezoušková): -200 Kč, 1 položka (Čerpání)
-- Kniha 12 (Tereza THP): 0 Kč, 0 položek (PRÁZDNÁ - SMAZAT)
-- Kniha 20 (Robert Holovský): 15000 Kč, 1 položka (Dotace)
-- 
-- CÍLOVÝ STAV: Kniha 20 (hlavní) s OBĚMA položkami: Dotace 15000 + Čerpání 200
-- Konečný zůstatek: 14800 Kč

-- 1.1: Přesunout položky z knihy 10 do knihy 20
UPDATE 25a_pokladni_polozky 
SET pokladni_kniha_id = 20
WHERE pokladni_kniha_id = 10 AND smazano = 0;

-- 1.2: Přesunout i smazané položky (pro audit trail)
UPDATE 25a_pokladni_polozky 
SET pokladni_kniha_id = 20
WHERE pokladni_kniha_id = 10 AND smazano = 1;

-- 1.3: Přepočítat pořadí řádků a balance v knize 20
-- (Položky seřadit podle data zapisu)
SET @poradi = 0;
UPDATE 25a_pokladni_polozky 
SET poradi_radku = (@poradi := @poradi + 1)
WHERE pokladni_kniha_id = 20 AND smazano = 0
ORDER BY datum_zapisu ASC, id ASC;

-- 1.4: Přepočítat běžící zůstatky (balance)
SET @balance = 0.00;
UPDATE 25a_pokladni_polozky 
SET zustatek_po_operaci = (@balance := @balance + COALESCE(castka_prijem, 0) - COALESCE(castka_vydaj, 0))
WHERE pokladni_kniha_id = 20 AND smazano = 0
ORDER BY poradi_radku ASC;

-- 1.5: Aktualizovat summary v knize 20
UPDATE 25a_pokladni_knihy k
SET 
    celkove_prijmy = (
        SELECT COALESCE(SUM(castka_prijem), 0) 
        FROM 25a_pokladni_polozky 
        WHERE pokladni_kniha_id = 20 AND smazano = 0
    ),
    celkove_vydaje = (
        SELECT COALESCE(SUM(castka_vydaj), 0) 
        FROM 25a_pokladni_polozky 
        WHERE pokladni_kniha_id = 20 AND smazano = 0
    ),
    koncovy_stav = (
        SELECT zustatek_po_operaci 
        FROM 25a_pokladni_polozky 
        WHERE pokladni_kniha_id = 20 AND smazano = 0 
        ORDER BY poradi_radku DESC 
        LIMIT 1
    ),
    pocet_zaznamu = (
        SELECT COUNT(*) 
        FROM 25a_pokladni_polozky 
        WHERE pokladni_kniha_id = 20 AND smazano = 0
    )
WHERE id = 20;

-- 1.6: Smazat prázdné knihy 10 a 12
DELETE FROM 25a_pokladni_knihy WHERE id IN (10, 12);


-- KROK 2: POKLADNA 13 - Sloučení 2 knih do jedné
-- ============================================================================

-- Kniha 13 (Peter Matej): 13107 Kč, 0 položek (PRÁZDNÁ - SMAZAT)
-- Kniha 14 (Hana Sochůrková): 21153 Kč, 9 položek (STK, emise, autoklíče, dotace)
--
-- CÍLOVÝ STAV: Kniha 14 (hlavní) s VŠEMI položkami
-- Ponecháme knihu 14 (už má položky), smažeme prázdnou knihu 13

DELETE FROM 25a_pokladni_knihy WHERE id = 13;


-- KROK 3: OVĚŘENÍ
-- ============================================================================

-- Zobrazit výsledek po opravě
SELECT 
    'VÝSLEDEK PO OPRAVĚ - Duplicitní knihy (mělo by být 0 řádků)' as '';

SELECT 
    k.cislo_pokladny,
    k.rok,
    k.mesic,
    COUNT(*) as pocet_knih,
    GROUP_CONCAT(k.id ORDER BY k.id) as kniha_ids
FROM 25a_pokladni_knihy k
GROUP BY k.cislo_pokladny, k.rok, k.mesic
HAVING COUNT(*) > 1;

-- Zobrazit stav pokladny 999
SELECT 
    'STAV POKLADNY 999 PO OPRAVĚ' as '';

SELECT 
    k.id as kniha_id,
    k.uzivatel_id,
    CONCAT(u.jmeno, ' ', u.prijmeni) as uzivatel,
    k.celkove_prijmy,
    k.celkove_vydaje,
    k.koncovy_stav,
    k.pocet_zaznamu
FROM 25a_pokladni_knihy k
LEFT JOIN 25_uzivatele u ON k.uzivatel_id = u.id
WHERE k.cislo_pokladny = 999 AND k.rok = 2026 AND k.mesic = 1;

-- Zobrazit položky v knize 20 (pokladna 999)
SELECT 
    'POLOŽKY V KNIZE 20 (POKLADNA 999) PO SLOUČENÍ' as '';

SELECT 
    p.id,
    p.poradi_radku,
    p.datum_zapisu,
    p.obsah_zapisu,
    p.castka_prijem,
    p.castka_vydaj,
    p.zustatek_po_operaci,
    p.smazano
FROM 25a_pokladni_polozky p
WHERE p.pokladni_kniha_id = 20
ORDER BY p.poradi_radku;

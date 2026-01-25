-- ============================================================================
-- FIX DUPLICITNÍCH POKLADNÍCH KNIH - PRODUKCE (eeo2025)
-- Datum: 25.1.2026 13:33
-- Backup: /var/www/__BCK_PRODUKCE/eeo2025_full_backup_20260125_133349_before_cashbook_fix.sql
-- ============================================================================

-- KROK 1: POKLADNA 13 - Sloučení 2 knih do jedné
-- ============================================================================
-- Kniha 13 (Peter Matej): 13107 Kč, 0 položek (PRÁZDNÁ - SMAZAT)
-- Kniha 14 (Hana Sochůrková): 21153 Kč, 9 položek (PONECHAT)

-- 1.1: Přesunout všechny položky z knihy 13 do knihy 14 (i když je kniha 13 prázdná)
UPDATE 25a_pokladni_polozky 
SET pokladni_kniha_id = 14
WHERE pokladni_kniha_id = 13;

-- 1.2: Přepočítat pořadí řádků v knize 14
SET @poradi = 0;
UPDATE 25a_pokladni_polozky 
SET poradi_radku = (@poradi := @poradi + 1)
WHERE pokladni_kniha_id = 14 AND smazano = 0
ORDER BY datum_zapisu ASC, id ASC;

-- 1.3: Přepočítat běžící zůstatky (začínáme s prevodem 13107 Kč)
SET @balance = 13107.00;
UPDATE 25a_pokladni_polozky 
SET zustatek_po_operaci = (@balance := @balance + COALESCE(castka_prijem, 0) - COALESCE(castka_vydaj, 0))
WHERE pokladni_kniha_id = 14 AND smazano = 0
ORDER BY poradi_radku ASC;

-- 1.4: Aktualizovat summary v knize 14
UPDATE 25a_pokladni_knihy k
SET 
    celkove_prijmy = (SELECT COALESCE(SUM(castka_prijem), 0) FROM 25a_pokladni_polozky WHERE pokladni_kniha_id = 14 AND smazano = 0),
    celkove_vydaje = (SELECT COALESCE(SUM(castka_vydaj), 0) FROM 25a_pokladni_polozky WHERE pokladni_kniha_id = 14 AND smazano = 0),
    koncovy_stav = (SELECT zustatek_po_operaci FROM 25a_pokladni_polozky WHERE pokladni_kniha_id = 14 AND smazano = 0 ORDER BY poradi_radku DESC LIMIT 1),
    pocet_zaznamu = (SELECT COUNT(*) FROM 25a_pokladni_polozky WHERE pokladni_kniha_id = 14 AND smazano = 0)
WHERE id = 14;

-- 1.5: Smazat prázdnou knihu 13
DELETE FROM 25a_pokladni_knihy WHERE id = 13;


-- KROK 2: POKLADNA 999 - Sloučení 2 knih do jedné
-- ============================================================================
-- Kniha 10 (Tereza Bezoušková): 0 Kč, 0 položek, 1 smazaná (PRÁZDNÁ)
-- Kniha 12 (Tereza THP): 0 Kč, 0 položek (PRÁZDNÁ)
-- 
-- OBĚ KNIHY PRÁZDNÉ - Ponechat jednu (10), smazat druhou (12)

-- 2.1: Smazat prázdnou knihu 12
DELETE FROM 25a_pokladni_knihy WHERE id = 12;

-- 2.2: Kniha 10 zůstane (pro případ že by někdo měl přidat položky)


-- KROK 3: OVĚŘENÍ
-- ============================================================================

SELECT '========================================' as '';
SELECT '✅ VÝSLEDEK PO OPRAVĚ - PRODUKCE' as '';
SELECT '========================================' as '';

-- Duplicitní knihy (mělo by být 0 řádků)
SELECT 'DUPLICITNÍ KNIHY (mělo by být 0 řádků):' as '';
SELECT 
    k.cislo_pokladny,
    k.rok,
    k.mesic,
    COUNT(*) as pocet_knih
FROM 25a_pokladni_knihy k
GROUP BY k.cislo_pokladny, k.rok, k.mesic
HAVING COUNT(*) > 1;

-- Stav pokladny 13
SELECT 'POKLADNA 13 PO OPRAVĚ:' as '';
SELECT 
    k.id, k.uzivatel_id,
    CONCAT(u.jmeno, ' ', u.prijmeni) as uzivatel,
    k.celkove_prijmy, k.celkove_vydaje, 
    k.koncovy_stav, k.pocet_zaznamu
FROM 25a_pokladni_knihy k
LEFT JOIN 25_uzivatele u ON k.uzivatel_id = u.id
WHERE k.cislo_pokladny = 13 AND k.rok = 2026 AND k.mesic = 1;

-- Stav pokladny 999
SELECT 'POKLADNA 999 PO OPRAVĚ:' as '';
SELECT 
    k.id, k.uzivatel_id,
    CONCAT(u.jmeno, ' ', u.prijmeni) as uzivatel,
    k.celkove_prijmy, k.celkove_vydaje, 
    k.koncovy_stav, k.pocet_zaznamu
FROM 25a_pokladni_knihy k
LEFT JOIN 25_uzivatele u ON k.uzivatel_id = u.id
WHERE k.cislo_pokladny = 999 AND k.rok = 2026 AND k.mesic = 1;

-- Celkový počet knih
SELECT 'CELKOVÝ POČET KNIH:' as '';
SELECT COUNT(*) as celkem_knih FROM 25a_pokladni_knihy;

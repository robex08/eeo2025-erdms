-- =====================================================
-- CLEANUP: Odstranění duplicitních/nepoužívaných CASHBOOK práv
-- Datum: 2026-01-07
-- Autor: Development Team
-- =====================================================

-- ANALÝZA SITUACE:
-- ================
-- CASH_BOOK_*      = práva pro práci SE ZÁZNAMY v pokladní knize (entries)
-- CASH_BOOKS_*     = práva pro práci S ČÍSELNÍKEM pokladních knih (číselník)
--
-- Problém: CASH_BOOKS_* práva nejsou nikde použita (0 přiřazení)
--          a jejich účel je matoucí.

-- =====================================================
-- KROK 1: Ověření, že CASH_BOOKS_* práva nejsou přiřazena
-- =====================================================

SELECT 
    p.id, 
    p.kod_prava, 
    p.popis,
    COUNT(DISTINCT CASE WHEN rp.user_id = -1 THEN rp.role_id END) as role_assignments,
    COUNT(DISTINCT CASE WHEN rp.user_id > 0 THEN rp.user_id END) as user_assignments
FROM 25_prava p
LEFT JOIN 25_role_prava rp ON rp.pravo_id = p.id AND rp.aktivni = 1
WHERE p.kod_prava IN ('CASH_BOOKS_CREATE', 'CASH_BOOKS_VIEW', 'CASH_BOOKS_EDIT', 'CASH_BOOKS_DELETE')
GROUP BY p.id, p.kod_prava, p.popis;

-- Očekávaný výsledek: všechny 0 přiřazení
-- ✓ CASH_BOOKS_CREATE (135) - 0 přiřazení
-- ✓ CASH_BOOKS_VIEW (134) - 0 přiřazení
-- ✓ CASH_BOOKS_EDIT (136) - 0 přiřazení
-- ✓ CASH_BOOKS_DELETE (137) - 0 přiřazení

-- =====================================================
-- KROK 2: Smazání nepoužívaných CASH_BOOKS_* práv
-- =====================================================

-- Záloha dat pro případ rollbacku
CREATE TABLE IF NOT EXISTS _backup_prava_cashbooks_20260107 AS
SELECT * FROM 25_prava 
WHERE kod_prava IN ('CASH_BOOKS_CREATE', 'CASH_BOOKS_VIEW', 'CASH_BOOKS_EDIT', 'CASH_BOOKS_DELETE');

-- Smazání z 25_role_prava (pokud by nějaká byla, což podle analýzy nejsou)
DELETE FROM 25_role_prava 
WHERE pravo_id IN (
    SELECT id FROM 25_prava 
    WHERE kod_prava IN ('CASH_BOOKS_CREATE', 'CASH_BOOKS_VIEW', 'CASH_BOOKS_EDIT', 'CASH_BOOKS_DELETE')
);

-- Smazání samotných práv
DELETE FROM 25_prava 
WHERE kod_prava IN ('CASH_BOOKS_CREATE', 'CASH_BOOKS_VIEW', 'CASH_BOOKS_EDIT', 'CASH_BOOKS_DELETE');

-- =====================================================
-- KROK 3: Ověření úspěšného smazání
-- =====================================================

SELECT COUNT(*) as remaining_count
FROM 25_prava 
WHERE kod_prava IN ('CASH_BOOKS_CREATE', 'CASH_BOOKS_VIEW', 'CASH_BOOKS_EDIT', 'CASH_BOOKS_DELETE');

-- Očekávaný výsledek: 0

-- =====================================================
-- KROK 4: Výpis zbývajících CASH_BOOK práv (měla by zůstat)
-- =====================================================

SELECT id, kod_prava, popis, aktivni
FROM 25_prava 
WHERE kod_prava LIKE 'CASH_BOOK_%'
ORDER BY kod_prava;

-- Očekávané práva (11 záznamů):
-- CASH_BOOK_CREATE       (35)  - Vytvoření nového záznamu ve vlastní pokladní knize
-- CASH_BOOK_DELETE_ALL   (45)  - Smazání záznamů ze všech pokladních knih
-- CASH_BOOK_DELETE_OWN   (44)  - Smazání záznamů z vlastní pokladní knihy
-- CASH_BOOK_EDIT_ALL     (43)  - Editace záznamů ve všech pokladních knihách
-- CASH_BOOK_EDIT_OWN     (42)  - Editace záznamů ve vlastní pokladní knize
-- CASH_BOOK_EXPORT_ALL   (47)  - Export všech pokladních knih (CSV, PDF)
-- CASH_BOOK_EXPORT_OWN   (46)  - Export vlastní pokladní knihy (CSV, PDF)
-- CASH_BOOK_MANAGE       (39)  - Kompletní správa všech pokladních knih (všechna práva)
-- CASH_BOOK_READ_ALL     (41)  - Zobrazení všech pokladních knih
-- CASH_BOOK_READ_OWN     (40)  - Zobrazení vlastní pokladní knihy
-- CASH_BOOK_VIEW         (82)  - Zobrazení pokladní knihy (obecné právo)

-- =====================================================
-- ROLLBACK (v případě potřeby)
-- =====================================================

-- INSERT INTO 25_prava SELECT * FROM _backup_prava_cashbooks_20260107;

-- =====================================================
-- DOKUMENTACE
-- =====================================================

/*
ZMĚNY:
------
1. Odstraněna práva CASH_BOOKS_* (134-137), která nebyla používána
2. Zachována všechna CASH_BOOK_* práva pro práci se záznamy v knihách

DŮVOD:
------
- Matoucí pojmenování (CASH_BOOK vs CASH_BOOKS)
- Nulové využití (žádná přiřazení v 25_role_prava)
- Kód používá pouze CASH_BOOK_* konvence

DOPAD:
------
- Žádný dopad na uživatele (práva nebyla přiřazena)
- Čistší a jasnější systém oprávnění
- Odstranění potenciální záměny
*/

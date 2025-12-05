-- ============================================================================
-- 🔐 CASHBOOK PERMISSIONS V2 - Kompletní sada oprávnění
-- ============================================================================
-- 
-- Rozšířená verze oprávnění pro pokladní knihu.
-- Přidává EXPORT a MANAGE oprávnění.
--
-- ⚠️ POZOR: Tabulka je 25_prava (ne opravneni)
--
-- Autor: BE Team
-- Datum: 9. listopadu 2025
-- ============================================================================

USE evidence_smluv;

-- ============================================================================
-- KONTROLA EXISTENCE OPRÁVNĚNÍ
-- ============================================================================

-- Zkontrolovat, která oprávnění již existují
SELECT kod_prava FROM 25_prava WHERE kod_prava LIKE 'CASH_BOOK_%';

-- ============================================================================
-- PŘIDÁNÍ CHYBĚJÍCÍCH OPRÁVNĚNÍ
-- ============================================================================

-- Export (pokud neexistují)
INSERT IGNORE INTO 25_prava (kod_prava, popis, aktivni) VALUES
('CASH_BOOK_EXPORT_OWN', 'Export vlastní pokladní knihy (CSV, PDF)', 1),
('CASH_BOOK_EXPORT_ALL', 'Export všech pokladních knih (CSV, PDF)', 1);

-- Kompletní správa (pokud neexistuje)
INSERT IGNORE INTO 25_prava (kod_prava, popis, aktivni) VALUES
('CASH_BOOK_MANAGE', 'Kompletní správa všech pokladních knih (všechna práva)', 1);

-- ============================================================================
-- AKTUALIZACE POPISŮ EXISTUJÍCÍCH OPRÁVNĚNÍ
-- ============================================================================

UPDATE 25_prava SET 
    popis = 'Zobrazení vlastní pokladní knihy'
WHERE kod_prava = 'CASH_BOOK_READ_OWN';

UPDATE 25_prava SET 
    popis = 'Zobrazení všech pokladních knih'
WHERE kod_prava = 'CASH_BOOK_READ_ALL';

UPDATE 25_prava SET 
    popis = 'Editace záznamů ve vlastní pokladní knize'
WHERE kod_prava = 'CASH_BOOK_EDIT_OWN';

UPDATE 25_prava SET 
    popis = 'Editace záznamů ve všech pokladních knihách'
WHERE kod_prava = 'CASH_BOOK_EDIT_ALL';

UPDATE 25_prava SET 
    popis = 'Smazání záznamů z vlastní pokladní knihy'
WHERE kod_prava = 'CASH_BOOK_DELETE_OWN';

UPDATE 25_prava SET 
    popis = 'Smazání záznamů ze všech pokladních knih'
WHERE kod_prava = 'CASH_BOOK_DELETE_ALL';

-- ============================================================================
-- KONTROLA FINÁLNÍHO STAVU
-- ============================================================================

SELECT 
    id,
    kod_prava,
    LEFT(popis, 60) AS popis_zkraceny,
    aktivni
FROM 25_prava
WHERE kod_prava LIKE 'CASH_BOOK_%'
ORDER BY 
    CASE 
        WHEN kod_prava LIKE '%_OWN' THEN 1
        WHEN kod_prava LIKE '%_ALL' THEN 2
        WHEN kod_prava = 'CASH_BOOK_MANAGE' THEN 3
        ELSE 4
    END,
    kod_prava;

-- ============================================================================
-- POZNÁMKA K PŘIŘAZENÍ K ROLÍM
-- ============================================================================
-- 
-- ⚠️ UPOZORNĚNÍ: Přiřazení oprávnění k rolím závisí na struktuře tabulek 25_role a 25_role_prava.
-- 
-- Pokud existují tyto tabulky, použij následující příkazy (UPRAVIT podle skutečné struktury):
-- 
-- -- Získat ID nových oprávnění
-- SET @perm_export_own = (SELECT id FROM 25_prava WHERE kod_prava = 'CASH_BOOK_EXPORT_OWN' LIMIT 1);
-- SET @perm_export_all = (SELECT id FROM 25_prava WHERE kod_prava = 'CASH_BOOK_EXPORT_ALL' LIMIT 1);
-- SET @perm_manage = (SELECT id FROM 25_prava WHERE kod_prava = 'CASH_BOOK_MANAGE' LIMIT 1);
-- 
-- -- Získat ID rolí
-- SET @role_superadmin = (SELECT id FROM 25_role WHERE kod_role = 'SUPERADMIN' LIMIT 1);
-- SET @role_administrator = (SELECT id FROM 25_role WHERE kod_role = 'ADMINISTRATOR' LIMIT 1);
-- 
-- -- SUPERADMIN - přidat MANAGE
-- INSERT IGNORE INTO 25_role_prava (role_id, prava_id) 
-- VALUES (@role_superadmin, @perm_manage);
-- 
-- -- ADMINISTRATOR - přidat EXPORT_ALL
-- INSERT IGNORE INTO 25_role_prava (role_id, prava_id) 
-- VALUES (@role_administrator, @perm_export_all);
-- 
-- ============================================================================

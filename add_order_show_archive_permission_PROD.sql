-- ============================================================================
-- PŘIDÁNÍ PRÁVA ORDER_SHOW_ARCHIVE - PRODUKČNÍ DATABÁZE
-- ============================================================================
-- Datum: 2026-01-04
-- Účel: Přidání práva pro zobrazení checkboxu ARCHIV v seznamu objednávek
-- Poznámka: NIKDY SE NEPŘIDÁVÁ AUTOMATICKY DO ŽÁDNÉ ROLE!
-- ⚠️  POZOR: TENTO SKRIPT JE PRO PRODUKČNÍ DATABÁZI!
-- ============================================================================

USE `eeo2025`; -- PRODUKČNÍ DATABÁZE

-- 1️⃣ Kontrola, zda právo již neexistuje
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM 25_prava WHERE kod_prava = 'ORDER_SHOW_ARCHIVE')
        THEN '⚠️  Právo ORDER_SHOW_ARCHIVE již existuje!'
        ELSE '✅ Právo ORDER_SHOW_ARCHIVE neexistuje, bude vytvořeno.'
    END AS kontrola;

-- 2️⃣ Přidání práva (pouze pokud neexistuje)
INSERT INTO 25_prava (kod_prava, popis, aktivni)
SELECT 'ORDER_SHOW_ARCHIVE', 'Zobrazení checkboxu ARCHIV v seznamu objednávek', 1
WHERE NOT EXISTS (
    SELECT 1 FROM 25_prava WHERE kod_prava = 'ORDER_SHOW_ARCHIVE'
);

-- 3️⃣ Kontrola výsledku
SELECT 
    id,
    kod_prava,
    popis,
    aktivni,
    CASE aktivni 
        WHEN 1 THEN '✅ Aktivní'
        ELSE '❌ Neaktivní'
    END as status
FROM 25_prava 
WHERE kod_prava = 'ORDER_SHOW_ARCHIVE';

-- 4️⃣ Kontrola, že právo NENÍ přiřazeno žádné roli
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Právo není přiřazeno žádné roli (správně)'
        ELSE CONCAT('⚠️  Právo je přiřazeno ', COUNT(*), ' rolím!')
    END AS kontrola_roli
FROM 25_role_prava rp
INNER JOIN 25_prava p ON rp.pravo_id = p.id
WHERE p.kod_prava = 'ORDER_SHOW_ARCHIVE';

-- ============================================================================
-- POZNÁMKY PRO MANUÁLNÍ PŘIŘAZENÍ:
-- ============================================================================
-- Pro manuální přiřazení práva konkrétnímu uživateli použij:
--
-- INSERT INTO 25_uzivatel_prava (uzivatel_id, pravo_id)
-- SELECT <USER_ID>, id FROM 25_prava WHERE kod_prava = 'ORDER_SHOW_ARCHIVE'
-- WHERE NOT EXISTS (
--     SELECT 1 FROM 25_uzivatel_prava 
--     WHERE uzivatel_id = <USER_ID> AND pravo_id = (
--         SELECT id FROM 25_prava WHERE kod_prava = 'ORDER_SHOW_ARCHIVE'
--     )
-- );
-- ============================================================================

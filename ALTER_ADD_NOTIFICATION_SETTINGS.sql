-- ================================================
-- MIGRACE: Přidání notifikačních preferencí
-- Datum: 16. prosince 2025
-- Účel: Uživatelské preference pro notifikace
-- DB: eeo2025 (české názvy tabulek)
-- ================================================

-- Použijeme existující tabulku 25_uzivatel_nastaveni
-- Struktura: uzivatel_id, nastaveni_data (TEXT/JSON)

-- ================================================
-- GLOBÁLNÍ NASTAVENÍ (25a_nastaveni_globalni)
-- ================================================

-- Přidat globální nastavení pro notifikace
INSERT INTO 25a_nastaveni_globalni (klic, hodnota, popis, vytvoreno)
VALUES 
    ('notifikace_system_povoleny', '1', 'Globální zapnutí/vypnutí notifikačního systému', NOW()),
    ('notifikace_email_povoleny', '1', 'Globální zapnutí/vypnutí email notifikací', NOW()),
    ('notifikace_inapp_povoleny', '1', 'Globální zapnutí/vypnutí in-app notifikací', NOW())
ON DUPLICATE KEY UPDATE 
    aktualizovano = NOW();

-- ================================================
-- VÝCHOZÍ HODNOTY PRO EXISTUJÍCÍ UŽIVATELE
-- ================================================

-- Pro každého uživatele, který ještě nemá nastavení notifikací
INSERT INTO 25_uzivatel_nastaveni (uzivatel_id, nastaveni_data, nastaveni_verze, vytvoreno)
SELECT 
    u.id,
    JSON_OBJECT(
        'notifikace_povoleny', true,
        'notifikace_email_povoleny', true,
        'notifikace_inapp_povoleny', true,
        'notifikace_kategorie', JSON_OBJECT(
            'objednavky', true,
            'faktury', true,
            'smlouvy', true,
            'pokladna', true
        )
    ),
    '1.0',
    NOW()
FROM users u
LEFT JOIN 25_uzivatel_nastaveni ns ON ns.uzivatel_id = u.id
WHERE ns.id IS NULL
  AND u.active = 'y';

-- ================================================
-- VERIFIKACE
-- ================================================

SELECT 
    'Globální nastavení' AS polozka,
    COUNT(*) AS pocet
FROM 25a_nastaveni_globalni
WHERE klic LIKE 'notifikace_%'

UNION ALL

SELECT 
    'Uživatelská nastavení' AS polozka,
    COUNT(*) AS pocet
FROM 25_uzivatel_nastaveni;

-- ================================================
-- HOTOVO
-- ================================================
-- Tento SQL skript přidal:
-- 1. Globální nastavení do 25a_nastaveni_globalni
-- 2. Výchozí hodnoty do 25_uzivatel_nastaveni pro aktivní uživatele
-- 3. Struktura: nastaveni_data obsahuje JSON s preferencemi
-- ================================================

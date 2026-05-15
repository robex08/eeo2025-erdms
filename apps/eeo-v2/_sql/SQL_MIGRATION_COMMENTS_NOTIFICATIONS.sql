-- ============================================================================
-- MIGRACE PRO KOMENTÁŘE A NOTIFIKACE - PRODUCTION DEPLOYMENT
-- ============================================================================
-- 
-- Datum: 8. 2. 2026
-- Funkce: Editace komentářů + notifikace pro odpovědi na komentáře
-- 
-- ⚠️ DŮLEŽITÉ: Tento script spustit na PRODUKČNÍ databázi eeo2025 
--             před nasazením nové verze aplikace!
-- 
-- ============================================================================

-- 1. PŘIDÁNÍ SLOUPCE DT_AKTUALIZACE DO TABULKY KOMENTÁŘŮ
-- ============================================================================

ALTER TABLE 25a_objednavky_komentare 
ADD COLUMN dt_aktualizace DATETIME NULL AFTER dt_vytvoreni;

-- Poznámka: Sloupec bude NULL pro existující komentáře, 
--           nově editované budou mít dt_aktualizace

-- 2. PŘIDÁNÍ TYPŮ UDÁLOSTÍ PRO NOTIFIKACE
-- ============================================================================

INSERT INTO 25_notifikace_typy_udalosti 
    (kod, nazev, kategorie, popis, uroven_nahlhavosti, role_prijemcu, vychozi_kanaly, modul) 
VALUES 
    ('ORDER_COMMENT_ADDED', 
     'Přidání komentáře k objednávce', 
     'objednavky', 
     'Oznámení o novém komentáři přidaném k objednávce pro všechny účastníky', 
     'NORMAL', 
     'PARTICIPANTS', 
     'inapp', 
     'orders'),
    ('COMMENT_REPLY', 
     'Odpověď na komentář', 
     'komentare', 
     'Oznámení autorovi původního komentáře, že mu někdo odpověděl', 
     'NORMAL', 
     'AUTHOR', 
     'inapp', 
     'comments')
ON DUPLICATE KEY UPDATE 
    nazev = VALUES(nazev),
    kategorie = VALUES(kategorie),
    popis = VALUES(popis);

-- 3. PŘIDÁNÍ ŠABLON PRO NOTIFIKACE
-- ============================================================================

INSERT INTO 25_notifikace_sablony 
    (typ, nazev, email_predmet, email_telo, email_vychozi, app_nadpis, app_zprava, priorita_vychozi, aktivni) 
VALUES 
    ('ORDER_COMMENT_ADDED', 
     'Nový komentář k objednávce',
     NULL,
     NULL,
     0,
     'Nový komentář k obj. {{cislo_objednavky}}',
     '{{autor_jmeno}} přidal komentář: "{{komentar_preview}}" ({{predmet_objednavky}})',
     'normal',
     1),
    ('COMMENT_REPLY',
     'Odpověď na váš komentář',
     NULL,
     NULL,
     0,
     'Odpověď na váš komentář k obj. {{cislo_objednavky}}',
     '{{autor_odpovedi}} odpověděl na váš komentář "{{puvodni_komentar_preview}}" - z objednávky ze dne {{datum_objednavky}}: "{{odpoved_preview}}"',
     'normal',
     1)
ON DUPLICATE KEY UPDATE 
    nazev = VALUES(nazev),
    email_predmet = VALUES(email_predmet),
    email_telo = VALUES(email_telo),
    email_vychozi = VALUES(email_vychozi),
    app_nadpis = VALUES(app_nadpis),
    app_zprava = VALUES(app_zprava),
    priorita_vychozi = VALUES(priorita_vychozi),
    aktivni = VALUES(aktivni);

-- ============================================================================
-- OVĚŘENÍ ZMĚN
-- ============================================================================

-- Zkontroluj přidaný sloupec:
-- SHOW COLUMNS FROM 25a_objednavky_komentare WHERE Field = 'dt_aktualizace';

-- Zkontroluj typy událostí:
-- SELECT * FROM 25_notifikace_typy_udalosti WHERE kod IN ('ORDER_COMMENT_ADDED', 'COMMENT_REPLY');

-- Zkontroluj šablony:
-- SELECT typ, nazev, app_nadpis FROM 25_notifikace_sablony WHERE typ IN ('ORDER_COMMENT_ADDED', 'COMMENT_REPLY');

-- ============================================================================
-- KONEC MIGRACE
-- ============================================================================
-- =====================================================
-- Migrace: Granulární oprávnění pro Adresář (Phonebook) - PROD
-- Datum: 2026-01-05
-- Databáze: eeo2025 (PRODUCTION)
-- =====================================================

-- PHONEBOOK_VIEW už existuje
-- Přidáme jen CREATE, EDIT, DELETE

-- 1. PHONEBOOK_CREATE
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('PHONEBOOK_CREATE', 'Vytváření nových kontaktů v adresáři', 1)
ON DUPLICATE KEY UPDATE popis = VALUES(popis), aktivni = VALUES(aktivni);

-- 2. PHONEBOOK_EDIT
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('PHONEBOOK_EDIT', 'Editace existujících kontaktů v adresáři', 1)
ON DUPLICATE KEY UPDATE popis = VALUES(popis), aktivni = VALUES(aktivni);

-- 3. PHONEBOOK_DELETE
INSERT INTO 25_prava (kod_prava, popis, aktivni) 
VALUES ('PHONEBOOK_DELETE', 'Mazání kontaktů z adresáře', 1)
ON DUPLICATE KEY UPDATE popis = VALUES(popis), aktivni = VALUES(aktivni);

-- Ověření
SELECT id, kod_prava, popis, aktivni 
FROM 25_prava 
WHERE kod_prava LIKE 'PHONEBOOK_%' 
ORDER BY kod_prava;

-- Aktualizace číselníků stavů objednávek - přidání nových stavů
-- Datum: 27. října 2025
-- Účel: Přidat nové stavy FAKTURACE a UVEREJNENA do číselníku pro filtry

-- Poznámka: Upravte název tabulky podle vaší databázové struktury
-- Možné názvy: ciselniky_stavu, code_lists, stavy_objednavek, apod.

-- 1. Kontrola existující struktury číselníků (spusťte pro zjištění struktury)
SELECT * FROM information_schema.tables 
WHERE table_name LIKE '%ciseln%' OR table_name LIKE '%stav%' OR table_name LIKE '%code%'
ORDER BY table_name;

-- 2a. Pokud máte tabulku "ciselniky_stavu" nebo podobnou:
INSERT IGNORE INTO ciselniky_stavu (kod_stavu, nazev_stavu, typ, poradi, aktivni, popis) VALUES
('FAKTURACE', 'Fakturace', 'OBJEDNAVKA', 7, 1, 'Stav po registraci - probíhá fakturace'),
('UVEREJNENA', 'Uveřejněna', 'OBJEDNAVKA', 1, 1, 'Objednávka byla uveřejněna');

-- 2b. Alternativa pro tabulku "code_lists":
INSERT IGNORE INTO code_lists (code, name, type, sort_order, active, description) VALUES
('FAKTURACE', 'Fakturace', 'OBJEDNAVKA', 7, 1, 'Stav po registraci - probíhá fakturace'),
('UVEREJNENA', 'Uveřejněna', 'OBJEDNAVKA', 1, 1, 'Objednávka byla uveřejněna');

-- 2c. Alternativa pro tabulku "stavy_objednavek":
INSERT IGNORE INTO stavy_objednavek (kod, nazev, poradi, aktivni, popis) VALUES
('FAKTURACE', 'Fakturace', 7, 1, 'Stav po registraci - probíhá fakturace'),
('UVEREJNENA', 'Uveřejněna', 1, 1, 'Objednávka byla uveřejněna');

-- 3. Aktualizace stavu FAKTURANA na FAKTURACE (pokud existuje v číselníku)
UPDATE ciselniky_stavu SET 
    kod_stavu = 'FAKTURACE', 
    nazev_stavu = 'Fakturace' 
WHERE kod_stavu = 'FAKTURANA' AND typ = 'OBJEDNAVKA';

-- Alternativy pro různé názvy tabulek:
UPDATE code_lists SET 
    code = 'FAKTURACE', 
    name = 'Fakturace' 
WHERE code = 'FAKTURANA' AND type = 'OBJEDNAVKA';

UPDATE stavy_objednavek SET 
    kod = 'FAKTURACE', 
    nazev = 'Fakturace' 
WHERE kod = 'FAKTURANA';

-- 4. Ověření úspěšného přidání - zkontrolujte všechny stavy
SELECT * FROM ciselniky_stavu WHERE typ = 'OBJEDNAVKA' ORDER BY poradi;
-- nebo
SELECT * FROM code_lists WHERE type = 'OBJEDNAVKA' ORDER BY sort_order;
-- nebo  
SELECT * FROM stavy_objednavek ORDER BY poradi;

-- 5. Kontrolní dotaz - ověření že nové stavy jsou v databázi
SELECT 
    COUNT(*) as pocet_nových_stavu
FROM ciselniky_stavu 
WHERE kod_stavu IN ('FAKTURACE', 'UVEREJNENA') 
AND typ = 'OBJEDNAVKA';

-- Očekávaný výsledek: 2 záznamy
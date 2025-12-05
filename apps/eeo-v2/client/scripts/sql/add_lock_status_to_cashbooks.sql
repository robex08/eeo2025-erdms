-- ============================================================================
-- 🔒 CASHBOOK LOCK STATUS - Přidání sloupce pro stav uzamčení
-- ============================================================================
-- 
-- Přidává sloupec `stav_uzamceni` do tabulky pokladních knih.
-- Podporuje 3 stavy:
-- - 'open' - otevřená (výchozí)
-- - 'closed' - uzavřená uživatelem
-- - 'locked' - zamknuta správcem
--
-- Autor: BE Team
-- Datum: 9. listopadu 2025
-- ============================================================================

USE evidence_smluv;

-- Přidat sloupec pro stav uzamčení
ALTER TABLE 25a_pokladni_knihy 
ADD COLUMN stav_uzamceni ENUM('open', 'closed', 'locked') 
DEFAULT 'open' 
COMMENT 'Stav uzamčení knihy: open=otevřená, closed=uzavřena uživatelem, locked=zamknuta správcem'
AFTER datum_uzavreni;

-- Přidat sloupec pro zaznamenání kdo zamkl/uzavřel
ALTER TABLE 25a_pokladni_knihy 
ADD COLUMN zamknuto_uzivatel_id INT(11) NULL 
COMMENT 'ID uživatele, který knihu zamkl/uzavřel'
AFTER stav_uzamceni;

-- Přidat sloupec pro datum zamčení/uzavření
ALTER TABLE 25a_pokladni_knihy 
ADD COLUMN zamknuto_datum DATETIME NULL 
COMMENT 'Datum a čas zamčení/uzavření knihy'
AFTER zamknuto_uzivatel_id;

-- Přidat foreign key na uživatele
ALTER TABLE 25a_pokladni_knihy 
ADD CONSTRAINT fk_pokladni_knihy_zamknuto_uzivatel 
FOREIGN KEY (zamknuto_uzivatel_id) 
REFERENCES zamestnanci(id) 
ON DELETE SET NULL;

-- Vytvořit index pro rychlé vyhledávání zamčených knih
CREATE INDEX idx_stav_uzamceni ON 25a_pokladni_knihy(stav_uzamceni);

-- ============================================================================
-- TRIGGER pro automatické nastavení času uzamčení
-- ============================================================================

DELIMITER $$

CREATE TRIGGER trg_pokladni_knihy_stav_uzamceni_update
BEFORE UPDATE ON 25a_pokladni_knihy
FOR EACH ROW
BEGIN
    -- Pokud se mění stav uzamčení z 'open' na jiný
    IF OLD.stav_uzamceni = 'open' AND NEW.stav_uzamceni != 'open' THEN
        -- Nastavit datum uzamčení na aktuální čas
        SET NEW.zamknuto_datum = NOW();
    END IF;
    
    -- Pokud se odemyká (nastavuje zpět na 'open')
    IF OLD.stav_uzamceni != 'open' AND NEW.stav_uzamceni = 'open' THEN
        -- Vymazat datum a uživatele uzamčení
        SET NEW.zamknuto_datum = NULL;
        SET NEW.zamknuto_uzivatel_id = NULL;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- TESTOVACÍ DATA (volitelné)
-- ============================================================================

-- Příklad: Uzavřít knihu uživatele 52 za listopad 2025
-- UPDATE 25a_pokladni_knihy
-- SET stav_uzamceni = 'closed',
--     zamknuto_uzivatel_id = 52,
--     zamknuto_datum = NOW()
-- WHERE uzivatel_id = 52 
-- AND rok = 2025 
-- AND mesic = 11;

-- ============================================================================
-- KONTROLNÍ DOTAZY
-- ============================================================================

-- Zobrazit všechny knihy se stavem uzamčení
SELECT 
    pk.id,
    pk.rok,
    pk.mesic,
    pk.stav_uzamceni,
    pk.zamknuto_datum,
    CONCAT(u1.prijmeni, ' ', u1.jmeno) AS vlastnik,
    CONCAT(u2.prijmeni, ' ', u2.jmeno) AS zamkl_uzivatel
FROM 25a_pokladni_knihy pk
LEFT JOIN zamestnanci u1 ON pk.uzivatel_id = u1.id
LEFT JOIN zamestnanci u2 ON pk.zamknuto_uzivatel_id = u2.id
WHERE pk.stav_uzamceni != 'open'
ORDER BY pk.zamknuto_datum DESC;

-- Počet knih podle stavu
SELECT 
    stav_uzamceni,
    COUNT(*) as pocet
FROM 25a_pokladni_knihy
GROUP BY stav_uzamceni;

-- ============================================================================
-- ROLLBACK (pokud potřebujete vrátit změny)
-- ============================================================================

/*
-- Odstranit trigger
DROP TRIGGER IF EXISTS trg_pokladni_knihy_stav_uzamceni_update;

-- Odstranit foreign key
ALTER TABLE 25a_pokladni_knihy DROP FOREIGN KEY fk_pokladni_knihy_zamknuto_uzivatel;

-- Odstranit index
DROP INDEX idx_stav_uzamceni ON 25a_pokladni_knihy;

-- Odstranit sloupce
ALTER TABLE 25a_pokladni_knihy DROP COLUMN zamknuto_datum;
ALTER TABLE 25a_pokladni_knihy DROP COLUMN zamknuto_uzivatel_id;
ALTER TABLE 25a_pokladni_knihy DROP COLUMN stav_uzamceni;
*/

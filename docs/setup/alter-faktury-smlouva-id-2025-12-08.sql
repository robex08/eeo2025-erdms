-- ============================================================================
-- Rozšíření tabulky faktur o vazbu na smlouvy
-- Datum: 8. prosince 2025
-- Popis: Přidání sloupce smlouva_id pro vazbu faktury na smlouvu
--        Faktury mohou být vázané na:
--        1. Objednávku (order_id) - stávající funkcionalita
--        2. Smlouvu (smlouva_id) - nová funkcionalita
--        3. Bez vazby (oba NULL) - samostatná faktura
-- ============================================================================

USE eeo2025;

-- Přidat sloupec smlouva_id
ALTER TABLE 25a_objednavky_faktury 
ADD COLUMN smlouva_id INT UNSIGNED NULL 
COMMENT 'ID smlouvy (FK na 25_smlouvy), pokud je faktura vázána na smlouvu'
AFTER objednavka_id;

-- Vytvořit index pro rychlejší vyhledávání faktur podle smlouvy
CREATE INDEX idx_faktury_smlouva_id ON 25a_objednavky_faktury(smlouva_id);

-- Přidat cizí klíč na tabulku smluv (pokud existuje tabulka 25_smlouvy)
-- POZNÁMKA: Odkomentuj až ověříš, že tabulka 25_smlouvy existuje a má správný datový typ pro ID
-- ALTER TABLE 25a_objednavky_faktury
-- ADD CONSTRAINT fk_faktury_smlouva
-- FOREIGN KEY (smlouva_id) REFERENCES 25_smlouvy(id)
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;

-- Ověření struktury
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'eeo2025'
  AND TABLE_NAME = '25a_objednavky_faktury'
  AND COLUMN_NAME IN ('order_id', 'smlouva_id')
ORDER BY ORDINAL_POSITION;

-- Kontrola indexů
SHOW INDEXES FROM 25a_objednavky_faktury WHERE Key_name LIKE '%smlouva%';

-- =====================================================================
-- MIGRACE: Přidání věcné správnosti per faktura
-- Datum: 30.11.2025
-- Popis: Rozšíření tabulky 25a_faktury_objednavek o sloupce pro 
--        evidenci věcné správnosti jednotlivých faktur
-- =====================================================================

-- Kontrola existence tabulky
SELECT 'Migrace tabulky 25a_faktury_objednavek' AS status;

-- =====================================================================
-- KROK 1: Přidání nových sloupců
-- =====================================================================

-- Sloupec pro stav potvrzení věcné správnosti
ALTER TABLE `25a_faktury_objednavek`
ADD COLUMN `potvrzeni_vecne_spravnosti` ENUM('ANO', 'NE') NULL DEFAULT NULL
COMMENT 'Věcná správnost faktury (ANO/NE/NULL=neověřeno)';

-- Sloupec pro ID uživatele, který potvrdil věcnou správnost
ALTER TABLE `25a_faktury_objednavek`
ADD COLUMN `potvrzeno_uzivatel_id` INT(11) NULL DEFAULT NULL
COMMENT 'ID uživatele, který potvrdil věcnou správnost';

-- Sloupec pro datum potvrzení věcné správnosti
ALTER TABLE `25a_faktury_objednavek`
ADD COLUMN `potvrzeno_datum` DATETIME NULL DEFAULT NULL
COMMENT 'Datum a čas potvrzení věcné správnosti';

-- Sloupec pro poznámku k umístění majetku
ALTER TABLE `25a_faktury_objednavek`
ADD COLUMN `vecna_spravnost_umisteni_majetku` TEXT NULL
COMMENT 'Poznámka k umístění majetku (pro věcnou správnost)';

-- Sloupec pro obecnou poznámku k věcné správnosti
ALTER TABLE `25a_faktury_objednavek`
ADD COLUMN `vecna_spravnost_poznamka` TEXT NULL
COMMENT 'Obecná poznámka k věcné správnosti faktury';

SELECT 'Sloupce úspěšně přidány' AS status;

-- =====================================================================
-- KROK 2: Přidání foreign key vazby na uživatele
-- =====================================================================

-- Přidání foreign key na tabulku uživatelů
ALTER TABLE `25a_faktury_objednavek`
ADD CONSTRAINT `fk_faktury_potvrzeno_uzivatel`
FOREIGN KEY (`potvrzeno_uzivatel_id`)
REFERENCES `25a_users` (`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

SELECT 'Foreign key constraint úspěšně vytvořen' AS status;

-- =====================================================================
-- KROK 3: Vytvoření indexů pro optimalizaci dotazů
-- =====================================================================

-- Index pro rychlé vyhledávání podle stavu potvrzení
CREATE INDEX `idx_faktury_vecna_spravnost` 
ON `25a_faktury_objednavek` (`potvrzeni_vecne_spravnosti`);

-- Kompozitní index pro vyhledávání podle objednávky a stavu
CREATE INDEX `idx_faktury_order_vecna_spravnost` 
ON `25a_faktury_objednavek` (`order_id`, `potvrzeni_vecne_spravnosti`);

-- Index pro datum potvrzení
CREATE INDEX `idx_faktury_potvrzeno_datum` 
ON `25a_faktury_objednavek` (`potvrzeno_datum`);

SELECT 'Indexy úspěšně vytvořeny' AS status;

-- =====================================================================
-- KROK 4: Ověření struktury tabulky
-- =====================================================================

-- Zobrazit struktur tabulky po migraci
DESCRIBE `25a_faktury_objednavek`;

-- =====================================================================
-- TESTOVACÍ DOTAZY
-- =====================================================================

-- Počet faktur podle stavu věcné správnosti
SELECT 
    potvrzeni_vecne_spravnosti,
    COUNT(*) AS pocet_faktur
FROM `25a_faktury_objednavek`
GROUP BY potvrzeni_vecne_spravnosti;

-- Faktury bez potvrzení věcné správnosti
SELECT 
    id,
    cislo_faktury,
    order_id,
    potvrzeni_vecne_spravnosti
FROM `25a_faktury_objednavek`
WHERE potvrzeni_vecne_spravnosti IS NULL
LIMIT 10;

-- =====================================================================
-- ROLLBACK SCRIPT (pro případ potřeby vrácení změn)
-- =====================================================================
-- POZOR: Spouštět pouze v případě nutnosti vrácení migrace!
--
-- DROP INDEX `idx_faktury_vecna_spravnost` ON `25a_faktury_objednavek`;
-- DROP INDEX `idx_faktury_order_vecna_spravnost` ON `25a_faktury_objednavek`;
-- DROP INDEX `idx_faktury_potvrzeno_datum` ON `25a_faktury_objednavek`;
-- 
-- ALTER TABLE `25a_faktury_objednavek`
-- DROP FOREIGN KEY `fk_faktury_potvrzeno_uzivatel`;
-- 
-- ALTER TABLE `25a_faktury_objednavek`
-- DROP COLUMN `potvrzeni_vecne_spravnosti`,
-- DROP COLUMN `potvrzeno_uzivatel_id`,
-- DROP COLUMN `potvrzeno_datum`,
-- DROP COLUMN `vecna_spravnost_umisteni_majetku`,
-- DROP COLUMN `vecna_spravnost_poznamka`;

-- =====================================================================
-- UKÁZKOVÉ DOTAZY PRO PRÁCI S VĚCNOU SPRÁVNOSTÍ
-- =====================================================================

-- Nastavení věcné správnosti faktury
-- UPDATE `25a_faktury_objednavek`
-- SET 
--     potvrzeni_vecne_spravnosti = 'ANO',
--     potvrzeno_uzivatel_id = 123,
--     potvrzeno_datum = NOW(),
--     vecna_spravnost_umisteni_majetku = 'Sklád C, regál 5',
--     vecna_spravnost_poznamka = 'Vše zkontrolováno a v pořádku'
-- WHERE id = 1;

-- Získání faktur s věcnou správností pro konkrétní objednávku
-- SELECT 
--     f.id,
--     f.cislo_faktury,
--     f.potvrzeni_vecne_spravnosti,
--     f.potvrzeno_datum,
--     f.vecna_spravnost_poznamka,
--     u.username AS potvrdil_uzivatel
-- FROM `25a_faktury_objednavek` f
-- LEFT JOIN `25a_users` u ON f.potvrzeno_uzivatel_id = u.id
-- WHERE f.order_id = 1234;

-- Kontrola, zda má objednávka všechny faktury s věcnou správností = ANO
-- SELECT 
--     order_id,
--     COUNT(*) AS celkem_faktur,
--     SUM(CASE WHEN potvrzeni_vecne_spravnosti = 'ANO' THEN 1 ELSE 0 END) AS faktur_s_vs,
--     CASE 
--         WHEN COUNT(*) = SUM(CASE WHEN potvrzeni_vecne_spravnosti = 'ANO' THEN 1 ELSE 0 END) 
--         THEN 'ANO' 
--         ELSE 'NE' 
--     END AS objednavka_vs_status
-- FROM `25a_faktury_objednavek`
-- WHERE order_id = 1234
-- GROUP BY order_id;

SELECT '✓ Migrace dokončena úspěšně!' AS status;

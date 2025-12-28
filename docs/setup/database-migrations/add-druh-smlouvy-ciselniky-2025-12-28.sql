-- ============================================================================
-- Migrace: Přidání druhů smluv do číselníku stavů
-- Datum: 2025-12-28
-- Autor: Development Team
-- Účel: Převést hardcodované druhy smluv na číselníkový systém
-- ============================================================================

USE `eeo2025-dev`;

-- Vložení druhů smluv do číselníku stavů
-- typ_objektu = 'DRUH_SMLOUVY'
-- Tyto hodnoty nahradí hardcodované DRUH_SMLOUVY_OPTIONS ve frontendu

INSERT INTO `25_ciselnik_stavy` 
  (`typ_objektu`, `kod_stavu`, `nadrazeny_kod_stavu`, `nazev_stavu`, `popis`, `platnost_do`, `aktivni`, `atribut_objektu`)
VALUES
  -- Základní druhy smluv
  ('DRUH_SMLOUVY', 'SLUZBY', '', 'Smlouva o poskytování služeb', 
   'Nejčastější typ smlouvy pro externí služby, konzultace, údržbu, atd.', 
   '2100-12-21', 1, 0),
   
  ('DRUH_SMLOUVY', 'KUPNI', '', 'Kupní smlouva', 
   'Smlouva na nákup zboží, materiálu nebo vybavení', 
   '2100-12-21', 1, 0),
   
  ('DRUH_SMLOUVY', 'RAMCOVA', '', 'Rámcová smlouva', 
   'Dlouhodobá smlouva definující podmínky pro opakované objednávky', 
   '2100-12-21', 1, 0),
   
  ('DRUH_SMLOUVY', 'NAJEMNI', '', 'Nájemní smlouva', 
   'Smlouva o pronájmu prostor, vybavení nebo techniky', 
   '2100-12-21', 1, 0),
   
  ('DRUH_SMLOUVY', 'LICENCNI', '', 'Licenční smlouva', 
   'Smlouva na používání softwarových licencí, autorských práv, atd.', 
   '2100-12-21', 1, 0),
   
  ('DRUH_SMLOUVY', 'DODAVATELSKA', '', 'Dodavatelská smlouva', 
   'Dlouhodobá smlouva s dodavatelem materiálu nebo služeb', 
   '2100-12-21', 1, 0),
   
  ('DRUH_SMLOUVY', 'PORADENSKA', '', 'Poradenská smlouva', 
   'Smlouva na externí poradenství, audity, konzultace', 
   '2100-12-21', 1, 0),
   
  ('DRUH_SMLOUVY', 'JINA', '', 'Jiná smlouva', 
   'Smlouva nespadající do standardních kategorií', 
   '2100-12-21', 1, 0);

-- ============================================================================
-- Ověření vložených dat
-- ============================================================================

SELECT 
  id, 
  typ_objektu, 
  kod_stavu, 
  nazev_stavu, 
  aktivni
FROM `25_ciselnik_stavy`
WHERE typ_objektu = 'DRUH_SMLOUVY'
ORDER BY nazev_stavu ASC;

-- ============================================================================
-- POZNÁMKY PRO VÝVOJÁŘE:
-- ============================================================================
-- 
-- Po spuštění této migrace je třeba:
-- 
-- 1. Aktualizovat frontend službu apiSmlouvy.js:
--    - Nahradit hardcodovaný DRUH_SMLOUVY_OPTIONS voláním API
--    - Endpoint: POST /ciselniky/stavy/list s parametrem typ_objektu=DRUH_SMLOUVY
-- 
-- 2. Backend smlouvyHandlers.php:
--    - Validace druh_smlouvy musí kontrolovat proti číselníku
--    - Používat kod_stavu (SLUZBY, KUPNI, ...) místo celých názvů
-- 
-- 3. Databázová tabulka 25_smlouvy:
--    - Sloupec druh_smlouvy (varchar 100) zůstává, ale ukládá se kod_stavu
--    - Příklad: 'SLUZBY' místo 'Smlouva o poskytování služeb'
-- 
-- 4. Backward compatibility:
--    - Existující záznamy mohou mít plné názvy - je třeba migrace dat
--    - Přidán UPDATE skript níže
-- 
-- ============================================================================

-- ============================================================================
-- MIGRACE EXISTUJÍCÍCH DAT (volitelné, pokud už existují smlouvy)
-- ============================================================================

-- Aktualizace existujících záznamů na nové kódy
UPDATE `25_smlouvy` 
SET druh_smlouvy = 'SLUZBY' 
WHERE druh_smlouvy = 'SLUŽBY' 
   OR druh_smlouvy = 'Smlouva o poskytování služeb';

UPDATE `25_smlouvy` 
SET druh_smlouvy = 'KUPNI' 
WHERE druh_smlouvy = 'KUPNÍ' 
   OR druh_smlouvy = 'Kupní smlouva';

UPDATE `25_smlouvy` 
SET druh_smlouvy = 'RAMCOVA' 
WHERE druh_smlouvy = 'RÁMCOVÁ' 
   OR druh_smlouvy = 'Rámcová smlouva';

-- Ověření migrace dat
SELECT 
  druh_smlouvy, 
  COUNT(*) as pocet
FROM `25_smlouvy`
GROUP BY druh_smlouvy;

-- ============================================================================
-- ROLLBACK (v případě potřeby vrátit změny)
-- ============================================================================

-- DELETE FROM `25_ciselnik_stavy` WHERE typ_objektu = 'DRUH_SMLOUVY';

-- ============================================================================

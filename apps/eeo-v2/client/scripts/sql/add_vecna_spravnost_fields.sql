-- ============================================================================
-- SQL příkazy pro přidání polí věcné správnosti do tabulky 25a_objednavky
-- MySQL 5.5.43 kompatibilní
-- Datum: 27. října 2025
-- ============================================================================

-- 1. Přidání textových polí pro věcnou správnost (FÁZE 7)
ALTER TABLE `25a_objednavky` 
  ADD COLUMN `vecna_spravnost_umisteni_majetku` TEXT NULL COMMENT 'Umístění majetku (věcná správnost)' AFTER `dt_potvrzeni_vecne_spravnosti`,
  ADD COLUMN `vecna_spravnost_poznamka` TEXT NULL COMMENT 'Poznámka k věcné správnosti' AFTER `vecna_spravnost_umisteni_majetku`;

-- 2. Přidání boolean pole pro potvrzení věcné správnosti (FÁZE 7)
-- ⚠️ SLOUPEC UŽ EXISTUJE V DB: potvrzeni_vecne_spravnosti
-- ALTER TABLE `25a_objednavky` 
--   ADD COLUMN `potvrzeni_vecne_spravnosti` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Boolean: Potvrzení věcné správnosti (0=NE, 1=ANO)' AFTER `vecna_spravnost_poznamka`;

-- 3. Přidání boolean pole pro potvrzení dokončení objednávky (FÁZE 8)
-- ⚠️ SLOUPEC UŽ EXISTUJE V DB: potvrzeni_dokonceni_objednavky
-- ALTER TABLE `25a_objednavky` 
--   ADD COLUMN `potvrzeni_dokonceni_objednavky` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Boolean: Potvrzení dokončení objednávky (0=NE, 1=ANO)' AFTER `dokonceni_poznamka`;

-- ============================================================================
-- POZNÁMKY:
-- ============================================================================
-- 
-- FÁZE 7 - VĚCNÁ SPRÁVNOST:
-- - vecna_spravnost_umisteni_majetku (TEXT NULL) - volný text o umístění majetku
-- - vecna_spravnost_poznamka (TEXT NULL) - poznámka k věcné správnosti
-- - potvrzeni_vecne_spravnosti (TINYINT(1)) - checkbox potvrzení (0/1) ✅ UŽ EXISTUJE
-- - Při zaškrtnutí checkboxu se automaticky nastaví:
--   * potvrdil_vecnou_spravnost_id = aktuální uživatel
--   * dt_potvrzeni_vecne_spravnosti = aktuální čas
--
-- FÁZE 8 - DOKONČENÍ OBJEDNÁVKY:
-- - potvrzeni_dokonceni_objednavky (TINYINT(1)) - checkbox finálního potvrzení (0/1) ✅ UŽ EXISTUJE
-- - Při zaškrtnutí checkboxu se automaticky nastaví:
--   * dokoncil_id = aktuální uživatel
--   * dt_dokonceni = aktuální čas
--   * stav_workflow_kod = [..., "DOKONCENA"] - přidá se DOKONCENA do workflow
--
-- WORKFLOW:
-- 1. Faktura je přidána → Fáze 6 (FAKTURACE)
-- 2. Automaticky přechod do Fáze 7 (KONTROLA) - kontrola věcné správnosti
-- 3. Uživatel vyplní umístění majetku a poznámku (volitelné)
-- 4. Uživatel zaškrtne checkbox "Potvrzuji věcnou správnost" → přechod do Fáze 8
-- 5. V Fázi 8 uživatel zaškrtne checkbox "Potvrzuji dokončení objednávky" → stav_workflow_kod = DOKONCENA
--
-- ============================================================================

-- Kontrola přidaných sloupců
SHOW COLUMNS FROM `25a_objednavky` WHERE Field LIKE 'vecna_spravnost%' OR Field LIKE 'potvrzeni_%' OR Field LIKE 'dokonceni%';

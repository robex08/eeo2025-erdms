-- =====================================================
-- MIGRACE: Přidání workflow stavu do tabulky faktur
-- Datum: 22. prosince 2025
-- Autor: robex08
-- Branch: feature/generic-recipient-system
-- =====================================================

USE eeo2025-dev;

-- =====================================================
-- KROK 1: Přidání sloupce `stav` pro workflow
-- =====================================================

ALTER TABLE `25a_objednavky_faktury`
ADD COLUMN `stav` ENUM(
    'ZAEVIDOVANA',           -- Nově vložená z podatelny
    'VECNA_SPRAVNOST',       -- Poslaná k potvrzení věcné správnosti
    'V_RESENI',              -- Čeká se na dořešení (nejasnosti)
    'PREDANA_PO',            -- Fyzicky na ředitelství (v kolečku)
    'K_ZAPLACENI',           -- Předáno HÚ k úhradě (finální stav pro účetní)
    'ZAPLACENO',             -- Uhrazeno
    'STORNO'                 -- Stažena dodavatelem
) DEFAULT 'ZAEVIDOVANA' NOT NULL 
COMMENT 'Workflow stav faktury - primárně pro účetní'
AFTER `fa_zaplacena`;

SELECT 'Sloupec `stav` úspěšně přidán' AS Status;

-- =====================================================
-- KROK 2: Vytvoření indexu pro rychlé dotazy
-- =====================================================

CREATE INDEX `idx_faktury_stav` ON `25a_objednavky_faktury` (`stav`);

SELECT 'Index `idx_faktury_stav` vytvořen' AS Status;

-- =====================================================
-- KROK 3: Automatická migrace existujících faktur
-- =====================================================

-- Faktury, které jsou označeny jako zaplacené → nastavit stav ZAPLACENO
UPDATE `25a_objednavky_faktury`
SET `stav` = 'ZAPLACENO'
WHERE `fa_zaplacena` = 1 AND `aktivni` = 1;

SELECT CONCAT('Nastaveno ', ROW_COUNT(), ' faktur na stav ZAPLACENO (fa_zaplacena = 1)') AS Status;

-- Všechny ostatní faktury zůstávají ve stavu ZAEVIDOVANA (default hodnota)
SELECT 'Ostatní faktury ponechány ve stavu ZAEVIDOVANA' AS Status;

-- =====================================================
-- KROK 4: Ověření struktury
-- =====================================================

SELECT 'Struktura tabulky po migraci:' AS Status;
DESCRIBE `25a_objednavky_faktury`;

-- =====================================================
-- KROK 5: Statistiky po migraci
-- =====================================================

SELECT 'Statistiky stavu faktur:' AS Status;

SELECT 
    stav,
    COUNT(*) AS pocet_faktur,
    CONCAT(ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1), '%') AS procento
FROM `25a_objednavky_faktury`
WHERE aktivni = 1
GROUP BY stav
ORDER BY pocet_faktur DESC;

-- =====================================================
-- POZNÁMKY K LOGICE:
-- =====================================================

-- 1. AUTOMATICKÉ PŘEPNUTÍ NA VECNA_SPRAVNOST:
--    - Pouze pokud je aktuální stav = 'ZAEVIDOVANA'
--    - A někdo potvrdí věcnou správnost (vecna_spravnost_potvrzeno = 1)
--    - Implementováno v backendu (invoiceHandlers.php)

-- 2. AUTOMATICKÉ NASTAVENÍ fa_zaplacena:
--    - Pokud stav = 'ZAPLACENO' → fa_zaplacena = 1
--    - Implementováno v backendu při změně stavu

-- 3. VÝPOČET "PO SPLATNOSTI":
--    - NENÍ samostatný stav v DB
--    - Vypočítá se dynamicky: 
--      stav NOT IN ('ZAPLACENO', 'K_ZAPLACENI', 'STORNO') 
--      AND fa_datum_splatnosti < CURDATE()

SELECT '✅ Migrace dokončena!' AS Status;

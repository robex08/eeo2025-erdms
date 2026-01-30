-- ============================================================================
-- OPRAVA: Stored Procedure pro přepočet čerpání smluv
-- ============================================================================
-- PROBLÉM: Dvojité počítání - položky objednávek S fakturou se počítají
--          jak do pozadovano, tak do skutecne → 4000% čerpání!
-- 
-- ŘEŠENÍ: Položky BEZ faktury → pozadovano
--         Faktury → skutecne
--         NIKDY nepočítat obojí!
-- ============================================================================

USE `EEO-OSTRA-DEV`;

DROP PROCEDURE IF EXISTS sp_prepocet_cerpani_smluv;

DELIMITER $$

CREATE PROCEDURE sp_prepocet_cerpani_smluv(
  IN p_cislo_smlouvy VARCHAR(100),
  IN p_usek_id INT
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_cislo_smlouvy VARCHAR(100);
  DECLARE v_smlouva_id INT;
  DECLARE v_hodnota DECIMAL(15,2);
  DECLARE v_pouzit_v_obj_formu TINYINT(1);
  DECLARE v_cerpano_pozadovano DECIMAL(15,2);
  DECLARE v_cerpano_planovano DECIMAL(15,2);
  DECLARE v_cerpano_skutecne DECIMAL(15,2);
  DECLARE v_count INT DEFAULT 0;
  
  DECLARE cur CURSOR FOR 
    SELECT id, cislo_smlouvy, hodnota_s_dph, pouzit_v_obj_formu
    FROM 25_smlouvy 
    WHERE (p_cislo_smlouvy IS NULL OR cislo_smlouvy = p_cislo_smlouvy)
      AND (p_usek_id IS NULL OR usek_id = p_usek_id)
      AND aktivni = 1;
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  OPEN cur;
  
  read_loop: LOOP
    FETCH cur INTO v_smlouva_id, v_cislo_smlouvy, v_hodnota, v_pouzit_v_obj_formu;
    
    IF done THEN
      LEAVE read_loop;
    END IF;
    
    -- Inicializace
    SET v_cerpano_pozadovano = 0;
    SET v_cerpano_planovano = 0;
    SET v_cerpano_skutecne = 0;
    
    -- =========================================================================
    -- VARIANTA 1: Smlouva se používá v objednávkovém formuláři
    -- =========================================================================
    IF v_pouzit_v_obj_formu = 1 THEN
      
      -- POZADOVANO: Suma položek objednávek BEZ faktury (nefakturované)
      -- Toto jsou odhady/plány, které ještě nebyly fakturovány
      SELECT COALESCE(SUM(pol.cena_s_dph), 0) INTO v_cerpano_pozadovano
      FROM 25a_objednavky o
      INNER JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = o.id
      LEFT JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id
      WHERE REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%')
        AND o.stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA')
        AND f.id IS NULL;  -- ⚠️ KLÍČOVÉ: Jen položky BEZ faktur!
      
      -- PLANOVANO: Pro teď stejné jako pozadovano
      SET v_cerpano_planovano = v_cerpano_pozadovano;
      
      -- SKUTECNE: Faktury (jak přes objednávku, tak přímé na smlouvu)
      SELECT COALESCE(
        SUM(CASE 
          WHEN f.objednavka_id IS NOT NULL THEN f.fa_castka  -- Faktura přes objednávku
          WHEN f.smlouva_id = v_smlouva_id AND f.objednavka_id IS NULL THEN f.fa_castka  -- Přímá faktura
          ELSE 0
        END), 0) INTO v_cerpano_skutecne
      FROM 25a_objednavky_faktury f
      LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
      WHERE (
        -- Faktura přes objednávku na tuto smlouvu
        (f.objednavka_id IS NOT NULL AND REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%'))
        OR
        -- Přímá faktura na smlouvu (mimo objednávku)
        (f.smlouva_id = v_smlouva_id AND f.objednavka_id IS NULL)
      )
      AND f.stav != 'STORNO';
      
    ELSE
      -- =========================================================================
      -- VARIANTA 2: Smlouva SE NEPOUŽÍVÁ v objednávkovém formuláři
      -- =========================================================================
      -- Jen přímé faktury
      SELECT COALESCE(SUM(f.fa_castka), 0) INTO v_cerpano_skutecne
      FROM 25a_objednavky_faktury f
      WHERE f.smlouva_id = v_smlouva_id
        AND f.stav != 'STORNO';
    END IF;
    
    -- =========================================================================
    -- UPDATE: Uložit vypočtené hodnoty
    -- =========================================================================
    -- ⚠️ KRITICKÁ OPRAVA: Zbývající částka = limit - (nefakturované + fakturované)
    -- ⚠️ NIKDY NESČÍTEJ OBOJÍ PRO PROCENTA! Každá objednávka je BUĎTO v pozadovano, NEBO ve skutecne!
    UPDATE 25_smlouvy 
    SET 
      cerpano_pozadovano = v_cerpano_pozadovano,
      cerpano_planovano = v_cerpano_planovano,
      cerpano_skutecne = v_cerpano_skutecne,
      
      -- Zbývající = limit - (nefakturované + fakturované)
      zbyva_pozadovano = v_hodnota - (v_cerpano_pozadovano + v_cerpano_skutecne),
      zbyva_planovano = v_hodnota - (v_cerpano_planovano + v_cerpano_skutecne),
      zbyva_skutecne = v_hodnota - v_cerpano_skutecne,
      
      -- PROCENTA: Také součet (nefakturované + fakturované) / limit
      procento_pozadovano = CASE
        WHEN v_hodnota > 0 THEN ROUND(((v_cerpano_pozadovano + v_cerpano_skutecne) / v_hodnota) * 100, 2)
        ELSE 0 
      END,
      procento_planovano = CASE
        WHEN v_hodnota > 0 THEN ROUND(((v_cerpano_planovano + v_cerpano_skutecne) / v_hodnota) * 100, 2)
        ELSE 0 
      END,
      procento_skutecne = CASE
        WHEN v_hodnota > 0 THEN ROUND((v_cerpano_skutecne / v_hodnota) * 100, 2)
        ELSE 0 
      END
    WHERE id = v_smlouva_id;
    
    SET v_count = v_count + 1;
    
  END LOOP;
  
  CLOSE cur;
  
  -- Vrátit počet zpracovaných smluv
  SELECT v_count AS pocet_zpracovanych_smluv;
  
END$$

DELIMITER ;

-- ============================================================================
-- VYSVĚTLENÍ LOGIKY:
-- ============================================================================
-- PŘÍKLAD: Objednávka 10 000 Kč, položky 9 950 Kč, faktura 9 000 Kč
--
-- PŘED fakturou:
-- - cerpano_pozadovano = 9 950 (položky bez faktury)
-- - cerpano_skutecne = 0
-- - procento = (9950 + 0) / 10000 = 99.5%
--
-- PO faktuře:
-- - cerpano_pozadovano = 0 (položky už MAJÍ fakturu → vyfiltruje LEFT JOIN ... WHERE f.id IS NULL)
-- - cerpano_skutecne = 9 000 (faktura)
-- - procento = (0 + 9000) / 10000 = 90%
-- - zbyva = 10000 - (0 + 9000) = 1000 Kč ✅
--
-- DŮLEŽITÉ:
-- - LEFT JOIN ... WHERE f.id IS NULL zajišťuje, že položky S fakturou se NEVEJDOU do pozadovano
-- - Každá objednávka je BUĎTO "plánovaná" (pozadovano), NEBO "fakturovaná" (skutecne)
-- - NIKDY obojí najednou!
-- ============================================================================

SELECT 'Stored procedure sp_prepocet_cerpani_smluv byla úspěšně vytvořena!' AS Status;

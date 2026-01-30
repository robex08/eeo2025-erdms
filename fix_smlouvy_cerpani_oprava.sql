-- ============================================================================
-- OPRAVA: Stored procedure pro přepočet čerpání smluv
-- ============================================================================
-- Datum: 2026-01-30
-- Účel: Oprava logiky čerpání - používat sumu položek místo max_cena_s_dph
--
-- ZMĚNY:
-- 1. cerpano_pozadovano - SUMA POLOŽEK pro obj BEZ faktur (ne max_cena!)
-- 2. cerpano_planovano - zatím stejné jako pozadovano (budoucí rozšíření)
-- 3. cerpano_skutecne - faktury (beze změny)
-- ============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_prepocet_cerpani_smluv$$

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
    
    SET v_cerpano_pozadovano = 0;
    SET v_cerpano_planovano = 0;
    SET v_cerpano_skutecne = 0;
    
    -- ========================================================================
    -- KONTROLA: Smlouva se používá v obj. formuláři?
    -- ========================================================================
    
    IF v_pouzit_v_obj_formu = 1 THEN
      -- ======================================================================
      -- NOVÁ LOGIKA: Čerpáno POŽADOVÁNO = SUMA POLOŽEK (ne max_cena!)
      -- ======================================================================
      -- Pro objednávky BEZ faktur sčítáme položky
      -- (objednávky s fakturami se počítají do skutečného)
      
      SELECT COALESCE(SUM(pol.cena_s_dph), 0) INTO v_cerpano_pozadovano
      FROM 25a_objednavky o
      INNER JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = o.id
      LEFT JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id
      WHERE REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%')
        AND o.stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA')
        AND f.id IS NULL;  -- Jen obj BEZ faktur
      
      -- PLÁNOVÁNO = zatím stejné jako POŽADOVÁNO (budoucí rozšíření)
      SET v_cerpano_planovano = v_cerpano_pozadovano;
      
      -- ======================================================================
      -- SKUTEČNÉ čerpání = FAKTURY (beze změny)
      -- ======================================================================
      SELECT COALESCE(
        SUM(CASE 
          WHEN f.objednavka_id IS NOT NULL THEN f.fa_castka
          WHEN f.smlouva_id = v_smlouva_id AND f.objednavka_id IS NULL THEN f.fa_castka
          ELSE 0
        END), 0) INTO v_cerpano_skutecne
      FROM 25a_objednavky_faktury f
      LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
      WHERE (
        (f.objednavka_id IS NOT NULL AND REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%'))
        OR
        (f.smlouva_id = v_smlouva_id AND f.objednavka_id IS NULL)
      )
      AND f.stav != 'STORNO';
      
    ELSE
      -- ======================================================================
      -- Smlouva BEZ objednávek - jen faktury přímo na smlouvu
      -- ======================================================================
      SELECT COALESCE(SUM(f.fa_castka), 0) INTO v_cerpano_skutecne
      FROM 25a_objednavky_faktury f
      WHERE f.smlouva_id = v_smlouva_id
        AND f.stav != 'STORNO';
    END IF;
    
    -- ==========================================================================
    -- UPDATE smlouvy s novými hodnotami čerpání
    -- ==========================================================================
    UPDATE 25_smlouvy 
    SET 
      cerpano_pozadovano = v_cerpano_pozadovano,
      cerpano_planovano = v_cerpano_planovano,
      cerpano_skutecne = v_cerpano_skutecne,
      
      -- Výpočet zbývajících částek
      -- OPRAVA 2026-01-30: Sčítat pozadovano + skutecne (nesčítají se dvakrát!)
      zbyva_pozadovano = v_hodnota - (v_cerpano_pozadovano + v_cerpano_skutecne),
      zbyva_planovano = v_hodnota - (v_cerpano_planovano + v_cerpano_skutecne),
      zbyva_skutecne = v_hodnota - v_cerpano_skutecne,
      
      -- Procenta
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
-- KONEC OPRAVY
-- ============================================================================

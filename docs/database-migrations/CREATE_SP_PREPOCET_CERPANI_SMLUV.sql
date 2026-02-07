-- ========================================
-- Stored Procedure: sp_prepocet_cerpani_smluv
-- ========================================
-- Přepočítá čerpání smluv podle TŘECH TYPŮ ČERPÁNÍ (vzor z LP)
--
-- TŘI TYPY ČERPÁNÍ:
-- 1. POŽADOVÁNO (max_cena_s_dph) - maximální částka z objednávky
-- 2. PLÁNOVÁNO (suma položek) - reálný odhad z položek objednávky
-- 3. SKUTEČNĚ ČERPÁNO (faktury) - finální čerpání z faktur
--
-- Parametry:
--   p_cislo_smlouvy - filtr podle konkrétní smlouvy (NULL = všechny)
--   p_usek_id - filtr podle úseku (NULL = všechny)
--
-- Použití:
--   CALL sp_prepocet_cerpani_smluv('S-147/750309/26/23', NULL);  -- jedna smlouva
--   CALL sp_prepocet_cerpani_smluv(NULL, 5);                     -- všechny smlouvy úseku 5
--   CALL sp_prepocet_cerpani_smluv(NULL, NULL);                  -- všechny aktivní smlouvy
-- ========================================

DROP PROCEDURE IF EXISTS `sp_prepocet_cerpani_smluv`;

DELIMITER $$
CREATE PROCEDURE `sp_prepocet_cerpani_smluv`(
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
    
    -- ========================================
    -- LOGIKA PODLE TYPU SMLOUVY
    -- ========================================
    
    IF v_pouzit_v_obj_formu = 1 THEN
      -- ========================================
      -- SMLOUVA DOSTUPNÁ V OBJ. FORMULÁŘI
      -- ========================================
      
      -- 1. POŽADOVÁNO - max_cena_s_dph z objednávek
      -- OPRAVA: MySQL 5.5 kompatibilita + escapované lomítka (\/)
      SELECT COALESCE(SUM(max_cena_s_dph), 0) INTO v_cerpano_pozadovano
      FROM 25a_objednavky
      WHERE REPLACE(financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%')
        AND stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA');
      
      -- 2. PLÁNOVÁNO - součet položek objednávek
      -- TODO: Implementovat po vytvoření tabulky položek s vazbou na objednávky
      -- Zatím kopírujeme požadováno jako fallback
      SET v_cerpano_planovano = v_cerpano_pozadovano;
      
      -- 3. SKUTEČNĚ ČERPÁNO - faktury
      -- Dvě možnosti propojení faktur:
      -- A) Faktury navázané přes objednávku (objednavka_id IS NOT NULL)
      -- B) Faktury navázané přímo na smlouvu (smlouva_id a objednavka_id IS NULL)
      -- OPRAVA: MySQL 5.5 kompatibilita + escapované lomítka (\/)
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
      -- ========================================
      -- SMLOUVA POUZE V MODULU SMLUV A FAKTUR
      -- ========================================
      
      -- Pro tento typ smlouvy:
      -- - POŽADOVÁNO = 0 (nejsou objednávky)
      -- - PLÁNOVÁNO = 0 (nejsou objednávky)
      -- - SKUTEČNĚ ČERPÁNO = pouze faktury
      
      SELECT COALESCE(SUM(f.fa_castka), 0) INTO v_cerpano_skutecne
      FROM 25a_objednavky_faktury f
      WHERE f.smlouva_id = v_smlouva_id
        AND f.stav != 'STORNO';
      
    END IF;
    
    -- ========================================
    -- AKTUALIZACE SMLOUVY - TŘI TYPY ČERPÁNÍ
    -- ========================================
    -- LOGIKA:
    -- - Smlouvy se stropem (hodnota > 0): zbyva = hodnota - cerpano, procento = (cerpano/hodnota)*100
    -- - Smlouvy bez stropu (hodnota = 0): zbyva = NULL, procento = NULL
    -- - Ošetření overflow: LEAST() omezuje max hodnotu na 9999.99 (max pro DECIMAL(7,2))
    
    UPDATE 25_smlouvy
    SET 
      -- Požadované čerpání (max_cena_s_dph)
      cerpano_pozadovano = v_cerpano_pozadovano,
      zbyva_pozadovano = IF(hodnota_s_dph > 0, hodnota_s_dph - v_cerpano_pozadovano, NULL),
      procento_pozadovano = IF(hodnota_s_dph > 0, LEAST((v_cerpano_pozadovano / hodnota_s_dph) * 100, 9999.99), NULL),
      
      -- Plánované čerpání (suma položek)
      cerpano_planovano = v_cerpano_planovano,
      zbyva_planovano = IF(hodnota_s_dph > 0, hodnota_s_dph - v_cerpano_planovano, NULL),
      procento_planovano = IF(hodnota_s_dph > 0, LEAST((v_cerpano_planovano / hodnota_s_dph) * 100, 9999.99), NULL),
      
      -- Skutečné čerpání (faktury)
      cerpano_skutecne = v_cerpano_skutecne,
      zbyva_skutecne = IF(hodnota_s_dph > 0, hodnota_s_dph - v_cerpano_skutecne, NULL),
      procento_skutecne = IF(hodnota_s_dph > 0, LEAST((v_cerpano_skutecne / hodnota_s_dph) * 100, 9999.99), NULL),
      
      -- Zpětná kompatibilita: cerpano_celkem = skutečné čerpání
      cerpano_celkem = v_cerpano_skutecne,
      zbyva = IF(hodnota_s_dph > 0, hodnota_s_dph - v_cerpano_skutecne, NULL),
      procento_cerpani = IF(hodnota_s_dph > 0, LEAST((v_cerpano_skutecne / hodnota_s_dph) * 100, 9999.99), NULL),
      
      posledni_prepocet = NOW()
    WHERE id = v_smlouva_id;
    
    SET v_count = v_count + 1;
    
  END LOOP;
  
  CLOSE cur;
  
  SELECT CONCAT('Přepočteno čerpání pro ', v_count, ' smluv (3 typy: požadováno, plánováno, skutečně)') AS vysledek;
END$$

DELIMITER ;

-- Kontrola
SHOW CREATE PROCEDURE `sp_prepocet_cerpani_smluv`;

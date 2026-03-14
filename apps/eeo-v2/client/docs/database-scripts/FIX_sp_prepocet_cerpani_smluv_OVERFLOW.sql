-- ========================================
-- FIX: sp_prepocet_cerpani_smluv - Oprava overflow při výpočtu procent
-- Datum: 2026-03-14
-- Problem: Když hodnota_s_dph je velmi malá (např. 1 Kč) a čerpání velké,
--          procento přesáhne maximum decimal(7,2) = 99999.99
-- Řešení: Omezit procento na maximum pomocí LEAST()
-- ========================================

USE `EEO-OSTRA-DEV`;

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
    
    IF v_pouzit_v_obj_formu = 1 THEN
      -- Čerpání z položek objednávek BEZ faktur
      SELECT COALESCE(SUM(pol.cena_s_dph), 0) INTO v_cerpano_pozadovano
      FROM 25a_objednavky o
      INNER JOIN 25a_objednavky_polozky pol ON pol.objednavka_id = o.id
      LEFT JOIN 25a_objednavky_faktury f ON f.objednavka_id = o.id AND f.aktivni = 1
      WHERE REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%')
        AND o.aktivni = 1
        AND o.stav_objednavky NOT IN ('STORNOVA', 'ZAMITNUTA')
        AND f.id IS NULL;
      
      SET v_cerpano_planovano = v_cerpano_pozadovano;
      
      -- Čerpání z faktur (objednávky + přímé faktury ke smlouvě)
      SELECT COALESCE(
        SUM(CASE 
          WHEN f.objednavka_id IS NOT NULL THEN f.fa_castka
          WHEN f.smlouva_id = v_smlouva_id AND f.objednavka_id IS NULL THEN f.fa_castka
          ELSE 0
        END), 0) INTO v_cerpano_skutecne
      FROM 25a_objednavky_faktury f
      LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
      WHERE (
        (f.objednavka_id IS NOT NULL AND o.aktivni = 1 AND REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%'))
        OR
        (f.smlouva_id = v_smlouva_id AND f.objednavka_id IS NULL)
      )
      AND f.aktivni = 1
      AND f.stav != 'STORNO';
      
    ELSE
      -- Jednoduché počítání jen z faktur
      SELECT COALESCE(SUM(f.fa_castka), 0) INTO v_cerpano_skutecne
      FROM 25a_objednavky_faktury f
      WHERE f.smlouva_id = v_smlouva_id
        AND f.aktivni = 1
        AND f.stav != 'STORNO';
    END IF;
    
    -- ✅ OPRAVENO: Přidán LEAST() pro ochranu před overflow
    UPDATE 25_smlouvy 
    SET 
      cerpano_pozadovano = v_cerpano_pozadovano,
      cerpano_planovano = v_cerpano_planovano,
      cerpano_skutecne = v_cerpano_skutecne,
      cerpano_celkem = v_cerpano_pozadovano + v_cerpano_skutecne,
      zbyva_pozadovano = v_hodnota - (v_cerpano_pozadovano + v_cerpano_skutecne),
      zbyva_planovano = v_hodnota - (v_cerpano_planovano + v_cerpano_skutecne),
      zbyva_skutecne = v_hodnota - v_cerpano_skutecne,
      
      -- 🔧 OPRAVA: Omezení na maximum decimal(7,2) = 99999.99
      procento_pozadovano = CASE
        WHEN v_hodnota <= 0 THEN 0
        ELSE LEAST(99999.99, ROUND((v_cerpano_pozadovano / v_hodnota) * 100, 2))
      END,
      procento_planovano = CASE
        WHEN v_hodnota <= 0 THEN 0
        ELSE LEAST(99999.99, ROUND((v_cerpano_planovano / v_hodnota) * 100, 2))
      END,
      procento_skutecne = CASE
        WHEN v_hodnota <= 0 THEN 0
        ELSE LEAST(99999.99, ROUND((v_cerpano_skutecne / v_hodnota) * 100, 2))
      END,
      
      posledni_prepocet = NOW()
    WHERE id = v_smlouva_id;
    
    SET v_count = v_count + 1;
    
  END LOOP;
  
  CLOSE cur;
  
  SELECT v_count AS pocet_zpracovanych_smluv;
  
END$$

DELIMITER ;

-- ========================================
-- TEST: Přepočítat problémovou smlouvu
-- ========================================
CALL sp_prepocet_cerpani_smluv('S-347/75030926/2025', NULL);

-- Kontrola výsledku
SELECT 
  cislo_smlouvy,
  hodnota_s_dph,
  cerpano_pozadovano,
  cerpano_skutecne,
  procento_pozadovano,
  procento_skutecne,
  posledni_prepocet
FROM 25_smlouvy 
WHERE cislo_smlouvy = 'S-347/75030926/2025';

-- ========================================
-- POZNÁMKA PRO TESTER:
-- ========================================
-- Smlouva S-347/75030926/2025 má hodnotu 1 Kč a čerpání 240,000 Kč
-- Bez opravy by procento bylo 24,000,000 % → OVERFLOW
-- S opravou: procento = 99999.99 % (maximum)
-- ========================================

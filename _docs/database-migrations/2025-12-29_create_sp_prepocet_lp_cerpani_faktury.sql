-- Stored Procedure: Přepočet LP čerpání s faktury
-- Datum: 2025-12-29
-- Účel: Aktualizuje skutecne_cerpano v 25_limitovane_prisliby_cerpani
--        na základě LP čerpání z faktur (25a_faktury_lp_cerpani)
--
-- DŮLEŽITÉ ZMĚNY:
-- ✅ Počítá VŠECHNY faktury kromě STORNO
-- ✅ Zahrnuje faktury v těchto stavech:
--    ZAEVIDOVANA, VECNA_SPRAVNOST, V_RESENI, PREDANA_PO, K_ZAPLACENI, ZAPLACENO
-- ✅ Důvod: LP čerpání se eviduje již při věcné správnosti, ne až při zaplacení

DROP PROCEDURE IF EXISTS sp_prepocet_lp_cerpani_faktury;

DELIMITER $$

CREATE PROCEDURE sp_prepocet_lp_cerpani_faktury(
  IN p_lp_cislo VARCHAR(20)
)
BEGIN
  DECLARE v_lp_cislo VARCHAR(20);
  DECLARE v_cerpano_faktury DECIMAL(15,2);
  DECLARE v_cerpano_pokladna DECIMAL(15,2);
  DECLARE v_count INT DEFAULT 0;
  DECLARE done INT DEFAULT FALSE;
  
  DECLARE cur CURSOR FOR 
    SELECT DISTINCT cislo_lp
    FROM 25_limitovane_prisliby_cerpani
    WHERE (p_lp_cislo IS NULL OR cislo_lp = p_lp_cislo);
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  OPEN cur;
  
  read_loop: LOOP
    FETCH cur INTO v_lp_cislo;
    
    IF done THEN
      LEAVE read_loop;
    END IF;
    
    -- 1. Součet čerpání z FAKTUR (nová funkcionalita)
    --    ⚠️ POČÍTÁME VŠECHNY STAVY kromě STORNO
    SELECT COALESCE(SUM(lpc.castka), 0) INTO v_cerpano_faktury
    FROM 25a_faktury_lp_cerpani lpc
    JOIN 25a_objednavky_faktury f ON lpc.faktura_id = f.id
    WHERE lpc.lp_cislo = v_lp_cislo
      AND f.stav != 'STORNO'
      AND f.aktivni = 1;
    
    -- 2. Součet čerpání z POKLADNY (existující funkcionalita)
    --    Zachováno pro zpětnou kompatibilitu
    SELECT COALESCE(SUM(pd.castka), 0) INTO v_cerpano_pokladna
    FROM 25a_pokladni_polozky_detail pd
    JOIN 25a_pokladni_polozky pp ON pd.polozka_id = pp.id
    JOIN 25a_pokladni_knihy pk ON pp.pokladna_kniha_id = pk.id
    WHERE pd.lp_cislo = v_lp_cislo
      AND pk.aktivni = 1
      AND pp.aktivni = 1;
    
    -- 3. UPDATE agregace: skutecne_cerpano = faktury, cerpano_pokladna = pokladna
    --    ⚠️ POZOR: skutecne_cerpano NYNÍ obsahuje POUZE faktury!
    --              cerpano_pokladna zůstává samostatný sloupec
    UPDATE 25_limitovane_prisliby_cerpani
    SET 
      skutecne_cerpano = v_cerpano_faktury,
      cerpano_pokladna = v_cerpano_pokladna,
      posledni_prepocet = NOW()
    WHERE cislo_lp = v_lp_cislo;
    
    SET v_count = v_count + 1;
    
  END LOOP;
  
  CLOSE cur;
  
  -- Výsledek
  IF p_lp_cislo IS NULL THEN
    SELECT CONCAT('Přepočteno čerpání pro ', v_count, ' LP kódů') AS vysledek;
  ELSE
    SELECT CONCAT('Přepočteno čerpání pro LP ', p_lp_cislo) AS vysledek;
  END IF;
END$$

DELIMITER ;

-- TEST: Spustit přepočet pro konkrétní LP
-- CALL sp_prepocet_lp_cerpani_faktury('6');

-- TEST: Spustit přepočet pro všechny LP
-- CALL sp_prepocet_lp_cerpani_faktury(NULL);

-- OVĚŘENÍ: Zkontrolovat výsledky
-- SELECT * FROM 25_limitovane_prisliby_cerpani WHERE cislo_lp = '6';

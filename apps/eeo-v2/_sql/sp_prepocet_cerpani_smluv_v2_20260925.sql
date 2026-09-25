-- ============================================================================
-- sp_prepocet_cerpani_smluv - v2 (2026-09-25)
-- ============================================================================
-- Sjednocení uloženého čerpání smlouvy s progressem v UI (_smlouvy_calc_progress):
--
--  * OBJ skutečně dokončená = Dokončená/Archivovaná + aspoň 1 FA + všechny FA
--      (bez STORNO) ZAPLACENO/DOKONCENA → cerpano_skutecne: její faktury
--  * ostatní OBJ (mimo Zamítnutá/Zrušena/Smazaná), vč. Dokončené bez FA / s nedokončenou FA
--      → cerpano_pozadovano: částka OBJ (součet položek s DPH, fallback max_cena_s_dph),
--        její faktury se NEpočítají (OBJ může čekat na další FA)
--  * FA přímo na smlouvě (bez OBJ) → cerpano_skutecne (bez STORNO)
--  * cerpano_celkem = pozadovano + skutecne, zbyva = hodnota - celkem
--
-- Dříve: faktury všech OBJ vždy do skutečného čerpání, částka OBJ jen u OBJ bez faktur
-- (i u dokončených bez faktur) → "zbývá" nesedělo s progressem u nedokončených OBJ s FA.
--
-- Větev pouzit_v_obj_formu = 0 beze změny (jen faktury přímo na smlouvě).
-- Po nasazení spustit: CALL sp_prepocet_cerpani_smluv(NULL, NULL);
-- ============================================================================

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
  DECLARE v_cerpano_celkem DECIMAL(15,2);
  DECLARE v_count INT DEFAULT 0;
  DECLARE v_platnost_od DATE;
  DECLARE v_platnost_do DATE;

  DECLARE cur CURSOR FOR
    SELECT id, cislo_smlouvy, hodnota_s_dph, pouzit_v_obj_formu, platnost_od, platnost_do
    FROM 25_smlouvy
    WHERE (p_cislo_smlouvy IS NULL OR cislo_smlouvy = p_cislo_smlouvy)
      AND (p_usek_id IS NULL OR usek_id = p_usek_id)
      AND aktivni = 1;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO v_smlouva_id, v_cislo_smlouvy, v_hodnota, v_pouzit_v_obj_formu, v_platnost_od, v_platnost_do;

    IF done THEN
      LEAVE read_loop;
    END IF;

    SET v_cerpano_pozadovano = 0;
    SET v_cerpano_planovano = 0;
    SET v_cerpano_skutecne = 0;

    IF v_pouzit_v_obj_formu = 1 THEN

      -- Nedokončené OBJ (vč. Dokončených bez FA / s nedokončenou FA) → částka OBJ
      SELECT COALESCE(SUM(
               COALESCE(
                 NULLIF((SELECT SUM(pol.cena_s_dph) FROM 25a_objednavky_polozky pol WHERE pol.objednavka_id = o.id), 0),
                 o.max_cena_s_dph, 0)
             ), 0)
        INTO v_cerpano_pozadovano
      FROM 25a_objednavky o
      WHERE REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%')
        AND o.aktivni = 1
        AND o.stav_objednavky NOT IN ('Zamítnutá', 'Zrušena', 'Smazaná')
        AND NOT (
          o.stav_objednavky IN ('Dokončená', 'Archivovaná')
          AND EXISTS (SELECT 1 FROM 25a_objednavky_faktury fx
                      WHERE fx.objednavka_id = o.id AND fx.aktivni = 1 AND fx.stav != 'STORNO')
          AND NOT EXISTS (SELECT 1 FROM 25a_objednavky_faktury fx
                          WHERE fx.objednavka_id = o.id AND fx.aktivni = 1
                            AND fx.stav NOT IN ('STORNO', 'ZAPLACENO', 'DOKONCENA'))
        );

      SET v_cerpano_planovano = v_cerpano_pozadovano;

      -- Faktury skutečně dokončených OBJ (Dokončená/Archivovaná + všechny FA ZAPLACENO/DOKONCENA)
      -- + faktury přímo na smlouvě
      SELECT COALESCE(SUM(f.fa_castka), 0) INTO v_cerpano_skutecne
      FROM 25a_objednavky_faktury f
      LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
      WHERE (
        (f.objednavka_id IS NOT NULL AND o.aktivni = 1
          AND o.stav_objednavky IN ('Dokončená', 'Archivovaná')
          AND NOT EXISTS (SELECT 1 FROM 25a_objednavky_faktury fx
                          WHERE fx.objednavka_id = o.id AND fx.aktivni = 1
                            AND fx.stav NOT IN ('STORNO', 'ZAPLACENO', 'DOKONCENA'))
          AND REPLACE(o.financovani, '\\/', '/') LIKE CONCAT('%"cislo_smlouvy":"', v_cislo_smlouvy, '"%'))
        OR
        (f.smlouva_id = v_smlouva_id AND f.objednavka_id IS NULL)
      )
      AND f.aktivni = 1
      AND f.stav != 'STORNO';

    ELSE

      SELECT COALESCE(SUM(f.fa_castka), 0) INTO v_cerpano_skutecne
      FROM 25a_objednavky_faktury f
      WHERE f.smlouva_id = v_smlouva_id
        AND f.aktivni = 1
        AND f.stav != 'STORNO';
    END IF;

    SET v_cerpano_celkem = v_cerpano_pozadovano + v_cerpano_skutecne;

    UPDATE 25_smlouvy
    SET
      cerpano_pozadovano = v_cerpano_pozadovano,
      cerpano_planovano = v_cerpano_planovano,
      cerpano_skutecne = v_cerpano_skutecne,
      cerpano_celkem = v_cerpano_celkem,
      zbyva = v_hodnota - v_cerpano_celkem,
      zbyva_pozadovano = v_hodnota - (v_cerpano_pozadovano + v_cerpano_skutecne),
      zbyva_planovano = v_hodnota - (v_cerpano_planovano + v_cerpano_skutecne),
      zbyva_skutecne = v_hodnota - v_cerpano_skutecne,
      procento_cerpani = CASE
        WHEN v_hodnota <= 0 THEN 0
        ELSE LEAST(99999.99, ROUND((v_cerpano_celkem / v_hodnota) * 100, 2))
      END,
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
      posledni_prepocet = NOW(),

      stav = CASE
        WHEN CURDATE() < v_platnost_od THEN 'PRIPRAVOVANA'
        WHEN CURDATE() > v_platnost_do THEN 'UKONCENA'
        ELSE 'AKTIVNI'
      END
    WHERE id = v_smlouva_id;

    SET v_count = v_count + 1;

  END LOOP;

  CLOSE cur;

  SELECT v_count AS pocet_zpracovanych_smluv;

END$$

DELIMITER ;

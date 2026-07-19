-- VEMA deduplikace + hardening opakovaneho importu
-- Datum: 2026-07-19
-- CIL: odstranit duplicity a vynutit business identitu pro upsert
--
-- DULEZITE:
-- 1) Spoustet nejdrive na DEV (EEO-OSTRA-DEV)
-- 2) Produkci az po potvrzeni
-- 3) Pred spustenim mit DB backup

-- ============================================================
-- 1) PRE-CHECK: vypis duplicit
-- ============================================================

SELECT 'DUP_FIRMY_BY_FIRMA' AS kontrola, firma, COUNT(*) AS pocet
FROM `25v_firmyupl`
WHERE firma IS NOT NULL
GROUP BY firma
HAVING COUNT(*) > 1
ORDER BY pocet DESC, firma;

SELECT 'DUP_SMLA_BY_CSML' AS kontrola, csml, COUNT(*) AS pocet
FROM `25v_smla`
WHERE csml IS NOT NULL
GROUP BY csml
HAVING COUNT(*) > 1
ORDER BY pocet DESC, csml;

SELECT 'DUP_FPAZAHL_BY_CFAK_FIRMA' AS kontrola, cfak, firma, COUNT(*) AS pocet
FROM `25v_fpazahl`
WHERE cfak IS NOT NULL AND firma IS NOT NULL
GROUP BY cfak, firma
HAVING COUNT(*) > 1
ORDER BY pocet DESC, cfak, firma;

-- ============================================================
-- 2) DEDUP: ponechat posledni zaznam (nejvyssi id)
-- ============================================================

DELETE f1
FROM `25v_firmyupl` f1
JOIN `25v_firmyupl` f2
  ON f1.firma = f2.firma
 AND f1.id < f2.id
WHERE f1.firma IS NOT NULL;

DELETE s1
FROM `25v_smla` s1
JOIN `25v_smla` s2
  ON s1.csml = s2.csml
 AND s1.id < s2.id
WHERE s1.csml IS NOT NULL;

DELETE p1
FROM `25v_fpazahl` p1
JOIN `25v_fpazahl` p2
  ON p1.cfak = p2.cfak
 AND p1.firma = p2.firma
 AND p1.id < p2.id
WHERE p1.cfak IS NOT NULL
  AND p1.firma IS NOT NULL;

-- ============================================================
-- 3) INDEX HARDENING pro ON DUPLICATE KEY UPDATE
-- ============================================================

-- Firma identity (idempotent)
SET @has_uq_firma := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = '25v_firmyupl'
    AND non_unique = 0
    AND column_name = 'firma'
);
SET @sql_uq_firma := IF(
  @has_uq_firma = 0,
  'ALTER TABLE `25v_firmyupl` ADD UNIQUE KEY `uq_vema_firmyupl_firma` (`firma`)',
  'SELECT "SKIP: unique index pro 25v_firmyupl(firma) jiz existuje"'
);
PREPARE stmt_uq_firma FROM @sql_uq_firma;
EXECUTE stmt_uq_firma;
DEALLOCATE PREPARE stmt_uq_firma;

-- Smlouva identity (idempotent)
SET @has_uq_csml := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = '25v_smla'
    AND non_unique = 0
    AND column_name = 'csml'
);
SET @sql_uq_csml := IF(
  @has_uq_csml = 0,
  'ALTER TABLE `25v_smla` ADD UNIQUE KEY `uq_vema_smla_csml` (`csml`)',
  'SELECT "SKIP: unique index pro 25v_smla(csml) jiz existuje"'
);
PREPARE stmt_uq_csml FROM @sql_uq_csml;
EXECUTE stmt_uq_csml;
DEALLOCATE PREPARE stmt_uq_csml;

-- Faktura identity (idempotent)
-- Business pravidlo: stejna faktura = stejne cislo faktury + stejna firma
SET @has_uq_cfak_firma := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = '25v_fpazahl'
    AND non_unique = 0
  GROUP BY index_name
  HAVING SUM(column_name = 'cfak') > 0
     AND SUM(column_name = 'firma') > 0
  LIMIT 1
);
SET @sql_uq_cfak_firma := IF(
  IFNULL(@has_uq_cfak_firma, 0) = 0,
  'ALTER TABLE `25v_fpazahl` ADD UNIQUE KEY `uq_vema_fpazahl_cfak_firma` (`cfak`, `firma`)',
  'SELECT "SKIP: unique index pro 25v_fpazahl(cfak,firma) jiz existuje"'
);
PREPARE stmt_uq_cfak_firma FROM @sql_uq_cfak_firma;
EXECUTE stmt_uq_cfak_firma;
DEALLOCATE PREPARE stmt_uq_cfak_firma;

-- ============================================================
-- 4) POST-CHECK: duplicity musi byt 0
-- ============================================================

SELECT 'POST_DUP_FIRMY_BY_FIRMA' AS kontrola, COUNT(*) AS skupin
FROM (
  SELECT firma
  FROM `25v_firmyupl`
  WHERE firma IS NOT NULL
  GROUP BY firma
  HAVING COUNT(*) > 1
) t;

SELECT 'POST_DUP_SMLA_BY_CSML' AS kontrola, COUNT(*) AS skupin
FROM (
  SELECT csml
  FROM `25v_smla`
  WHERE csml IS NOT NULL
  GROUP BY csml
  HAVING COUNT(*) > 1
) t;

SELECT 'POST_DUP_FPAZAHL_BY_CFAK_FIRMA' AS kontrola, COUNT(*) AS skupin
FROM (
  SELECT cfak, firma
  FROM `25v_fpazahl`
  WHERE cfak IS NOT NULL AND firma IS NOT NULL
  GROUP BY cfak, firma
  HAVING COUNT(*) > 1
) t;

-- VEMA kontrola metadata - hardening identity pro faktury
-- Datum: 2026-07-19
-- CIL:
-- 1) Faktury identifikovat jako (typ_zaznamu='faktura', vema_id=cfak, vema_id_secondary=firma)
-- 2) Zachovat kompatibilitu existujicich dat
-- 3) Zamezit krizeni metadat mezi firmami se stejnym cislem faktury

-- ============================================================
-- 1) NORMALIZACE DAT
-- ============================================================

-- Firma / smlouva: sekundarni ID nepouzivame -> prazdny retezec
UPDATE `25v_kontrola_metadata`
SET `vema_id_secondary` = ''
WHERE `typ_zaznamu` IN ('firma', 'smlouva')
  AND (`vema_id_secondary` IS NULL OR TRIM(`vema_id_secondary`) = '');

-- Faktura: doplnit vema_id_secondary=firma, pokud chybi
-- Pozn.: pokud by existovalo vice firem pro stejne cfak, vezmeme MIN(firma) jako kompatibilni fallback.
UPDATE `25v_kontrola_metadata` m
JOIN (
  SELECT
    cfak COLLATE utf8mb4_unicode_ci AS cfak_norm,
    CAST(MIN(firma) AS CHAR) COLLATE utf8mb4_unicode_ci AS firma_norm
  FROM `25v_fpazahl`
  WHERE cfak IS NOT NULL AND firma IS NOT NULL
  GROUP BY cfak
) f ON m.vema_id COLLATE utf8mb4_unicode_ci = f.cfak_norm
SET m.vema_id_secondary = f.firma_norm
WHERE m.typ_zaznamu = 'faktura'
  AND (m.vema_id_secondary IS NULL OR TRIM(m.vema_id_secondary) = '');

-- Bezpecnost: cokoliv stale NULL sjednotime na prazdny string
UPDATE `25v_kontrola_metadata`
SET `vema_id_secondary` = ''
WHERE `vema_id_secondary` IS NULL;

-- ============================================================
-- 2) KONSOLIDACE PRED NOVYM UNIQUE KLUCEM
-- ============================================================

-- Pokud by po normalizaci vznikly duplicity stejne identity,
-- ponechame nejvyssi ID (nejnovejsi zapis).
DELETE m1
FROM `25v_kontrola_metadata` m1
JOIN `25v_kontrola_metadata` m2
  ON m1.typ_zaznamu = m2.typ_zaznamu
 AND m1.vema_id = m2.vema_id
 AND IFNULL(m1.vema_id_secondary, '') = IFNULL(m2.vema_id_secondary, '')
 AND m1.id < m2.id;

-- ============================================================
-- 3) SCHEMA HARDENING
-- ============================================================

-- a) vema_id_secondary bude povinne (pro firma/smlouva prazdny string)
ALTER TABLE `25v_kontrola_metadata`
  MODIFY `vema_id_secondary` varchar(50) NOT NULL DEFAULT '' COMMENT 'Sekundární VEMA ID (u faktur povinně firma)';

-- b) nahradit stary unique kluc (typ_zaznamu, vema_id)
SET @has_old_unique := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = '25v_kontrola_metadata'
    AND index_name = 'unique_typ_vema'
);
SET @sql_drop_old := IF(
  @has_old_unique > 0,
  'ALTER TABLE `25v_kontrola_metadata` DROP INDEX `unique_typ_vema`',
  'SELECT "SKIP: unique_typ_vema neexistuje"'
);
PREPARE stmt_drop_old FROM @sql_drop_old;
EXECUTE stmt_drop_old;
DEALLOCATE PREPARE stmt_drop_old;

-- c) novy unique kluc (typ_zaznamu, vema_id, vema_id_secondary)
SET @has_new_unique := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = '25v_kontrola_metadata'
    AND index_name = 'uq_typ_vema_secondary'
);
SET @sql_add_new := IF(
  @has_new_unique = 0,
  'ALTER TABLE `25v_kontrola_metadata` ADD UNIQUE KEY `uq_typ_vema_secondary` (`typ_zaznamu`, `vema_id`, `vema_id_secondary`)',
  'SELECT "SKIP: uq_typ_vema_secondary uz existuje"'
);
PREPARE stmt_add_new FROM @sql_add_new;
EXECUTE stmt_add_new;
DEALLOCATE PREPARE stmt_add_new;

-- ============================================================
-- 4) POST-CHECK
-- ============================================================

SELECT 'POST_DUP_META_IDENTITY' AS kontrola, COUNT(*) AS skupin
FROM (
  SELECT typ_zaznamu, vema_id, vema_id_secondary
  FROM `25v_kontrola_metadata`
  GROUP BY typ_zaznamu, vema_id, vema_id_secondary
  HAVING COUNT(*) > 1
) t;

SELECT 'POST_FAKTURA_SECONDARY_EMPTY' AS kontrola, COUNT(*) AS zaznamu
FROM `25v_kontrola_metadata`
WHERE typ_zaznamu = 'faktura'
  AND TRIM(vema_id_secondary) = '';

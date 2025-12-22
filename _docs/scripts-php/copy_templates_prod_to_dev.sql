-- ================================================================================
-- KOPÍROVÁNÍ EMAIL ŠABLON Z PRODUKCE DO DEV
-- ================================================================================
-- Datum: 2025-12-22
-- Účel: Zkopírovat opravené HTML email šablony z eeo2025 do eeo2025-dev
-- Poznámka: Sloupec pro HTML je 'email_telo' (ne email_body_html)
-- ================================================================================

-- Výpis šablon k překlopení
SELECT 
  'PROD →' as source,
  id,
  typ,
  email_predmet,
  LENGTH(email_telo) as html_size,
  dt_updated
FROM eeo2025.25_notifikace_sablony
WHERE typ IN (
  'order_status_ke_schvaleni',
  'order_status_schvalena',
  'order_status_zamitnuta',
  'order_status_nova',
  'order_status_dokoncena',
  'order_status_odeslana',
  'order_status_potvrzena',
  'order_status_ceka_se',
  'order_status_faktura_pridana',
  'order_status_faktura_schvalena',
  'order_status_kontrola_potvrzena',
  'order_status_kontrola_zamitnuta',
  'order_status_registr_ceka',
  'order_status_registr_zverejnena',
  'order_vecna_spravnost_zamitnuta'
)
ORDER BY typ;

-- ================================================================================
-- BACKUP PŘED PŘEPISEM
-- ================================================================================

-- Záloha DEV šablon před přepsáním
CREATE TABLE IF NOT EXISTS `eeo2025-dev`.`25_notifikace_sablony_backup_20251222` 
SELECT * FROM `eeo2025-dev`.`25_notifikace_sablony`
WHERE typ IN (
  'order_status_ke_schvaleni',
  'order_status_schvalena',
  'order_status_zamitnuta',
  'order_status_nova',
  'order_status_dokoncena',
  'order_status_odeslana',
  'order_status_potvrzena',
  'order_status_ceka_se',
  'order_status_faktura_pridana',
  'order_status_faktura_schvalena',
  'order_status_kontrola_potvrzena',
  'order_status_kontrola_zamitnuta',
  'order_status_registr_ceka',
  'order_status_registr_zverejnena',
  'order_vecna_spravnost_zamitnuta'
);

-- ================================================================================
-- KOPÍROVÁNÍ ŠABLON (UPDATE)
-- ================================================================================

-- Aktualizace DEV šablon podle PROD šablon
UPDATE `eeo2025-dev`.`25_notifikace_sablony` AS dev
INNER JOIN `eeo2025`.`25_notifikace_sablony` AS prod ON dev.typ = prod.typ
SET 
  dev.email_predmet = prod.email_predmet,
  dev.email_telo = prod.email_telo,
  dev.dt_updated = NOW()
WHERE dev.typ IN (
  'order_status_ke_schvaleni',
  'order_status_schvalena',
  'order_status_zamitnuta',
  'order_status_nova',
  'order_status_dokoncena',
  'order_status_odeslana',
  'order_status_potvrzena',
  'order_status_ceka_se',
  'order_status_faktura_pridana',
  'order_status_faktura_schvalena',
  'order_status_kontrola_potvrzena',
  'order_status_kontrola_zamitnuta',
  'order_status_registr_ceka',
  'order_status_registr_zverejnena',
  'order_vecna_spravnost_zamitnuta'
);

-- ================================================================================
-- KONTROLA PO KOPÍROVÁNÍ
-- ================================================================================

-- Porovnání velikostí HTML mezi PROD a DEV
SELECT 
  'PROD' as db_source,
  typ,
  LENGTH(email_telo) as html_size,
  dt_updated
FROM eeo2025.25_notifikace_sablony
WHERE typ IN (
  'order_status_ke_schvaleni',
  'order_status_schvalena',
  'order_status_zamitnuta',
  'order_status_nova',
  'order_status_dokoncena',
  'order_status_odeslana',
  'order_status_potvrzena',
  'order_status_ceka_se',
  'order_status_faktura_pridana',
  'order_status_faktura_schvalena',
  'order_status_kontrola_potvrzena',
  'order_status_kontrola_zamitnuta',
  'order_status_registr_ceka',
  'order_status_registr_zverejnena',
  'order_vecna_spravnost_zamitnuta'
)

UNION ALL

SELECT 
  'DEV' as db_source,
  typ,
  LENGTH(email_telo) as html_size,
  dt_updated
FROM `eeo2025-dev`.25_notifikace_sablony
WHERE typ IN (
  'order_status_ke_schvaleni',
  'order_status_schvalena',
  'order_status_zamitnuta',
  'order_status_nova',
  'order_status_dokoncena',
  'order_status_odeslana',
  'order_status_potvrzena',
  'order_status_ceka_se',
  'order_status_faktura_pridana',
  'order_status_faktura_schvalena',
  'order_status_kontrola_potvrzena',
  'order_status_kontrola_zamitnuta',
  'order_status_registr_ceka',
  'order_status_registr_zverejnena',
  'order_vecna_spravnost_zamitnuta'
)
ORDER BY typ, db_source;

-- ================================================================================
-- HOTOVO
-- ================================================================================
-- ✅ Šablony zkopírovány z PROD do DEV
-- ✅ Backup vytvořen: eeo2025-dev.25_notifikace_sablony_backup_20251222
-- ✅ Kontrola velikostí HTML provedena
-- ================================================================================

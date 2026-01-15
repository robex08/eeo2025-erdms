-- ============================================================================
-- MIGRACE 1: Přidat typ_profilu do 25_hierarchie_profily
-- ============================================================================
-- Účel: Umožnit rozlišení profilů podle účelu (NOTIFIKACE, VIDITELNOST, PRAVA)
-- Datum: 15. ledna 2026
-- Autor: Robert Novák

ALTER TABLE 25_hierarchie_profily
ADD COLUMN typ_profilu ENUM(
  'NOTIFIKACE',
  'VIDITELNOST',
  'PRAVA',
  'KOMBINOVANY'
) DEFAULT 'KOMBINOVANY' 
COMMENT 'Typ profilu - účel použití'
AFTER nazev;

-- Přidat index pro rychlé filtrování
ALTER TABLE 25_hierarchie_profily
ADD INDEX idx_typ_profilu (typ_profilu);

-- Index pro aktivní profily určitého typu
ALTER TABLE 25_hierarchie_profily
ADD INDEX idx_aktivni_typ (aktivni, typ_profilu);

-- Update existujících profilů (všechny budou KOMBINOVANY)
UPDATE 25_hierarchie_profily 
SET typ_profilu = 'KOMBINOVANY' 
WHERE typ_profilu IS NULL;

-- ============================================================================
-- Ověření migrace
-- ============================================================================
-- SELECT * FROM 25_hierarchie_profily;
-- SHOW CREATE TABLE 25_hierarchie_profily;

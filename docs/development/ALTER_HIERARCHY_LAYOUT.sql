-- Přidání sloupců pro uložení layoutu (pozic nodů) do profilu
-- Uloží se jako JSON: {"user_id": {"x": 100, "y": 200}, ...}

ALTER TABLE 25_hierarchie_profily
ADD COLUMN layout_data JSON DEFAULT NULL COMMENT 'JSON data s pozicemi nodů: {"user_id": {"x": 100, "y": 200}}';

-- Index pro rychlejší přístup
CREATE INDEX idx_layout ON 25_hierarchie_profily(id, aktivni);

-- Add WebDispecink station and tank metadata to vehicle detail cards

ALTER TABLE vehicles_detail_cards
  ADD COLUMN IF NOT EXISTS w_stanoviste VARCHAR(120) DEFAULT NULL AFTER zzs_typ,
  ADD COLUMN IF NOT EXISTS w_nadrz INT DEFAULT NULL AFTER w_stanoviste;

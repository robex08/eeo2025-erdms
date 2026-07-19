-- Add display name for station addresses v2

ALTER TABLE vehicles_station_addresses_v2
  ADD COLUMN IF NOT EXISTS nazev_stanoviste VARCHAR(180) NOT NULL DEFAULT '' AFTER stanoviste,
  ADD KEY idx_station_nazev_stanoviste (nazev_stanoviste);

UPDATE vehicles_station_addresses_v2
SET nazev_stanoviste = stanoviste
WHERE nazev_stanoviste IS NULL OR TRIM(nazev_stanoviste) = '';

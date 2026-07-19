-- Add station type for station addresses v2

ALTER TABLE vehicles_station_addresses_v2
  ADD COLUMN IF NOT EXISTS typ VARCHAR(20) NOT NULL DEFAULT 'VS' AFTER stanoviste,
  ADD KEY idx_station_typ (typ);

UPDATE vehicles_station_addresses_v2
SET typ = 'VS'
WHERE typ IS NULL OR TRIM(typ) = '';

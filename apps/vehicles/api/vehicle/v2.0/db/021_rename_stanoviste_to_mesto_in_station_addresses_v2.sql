-- Rename station city column from stanoviste to mesto in v2 station addresses

ALTER TABLE vehicles_station_addresses_v2
  CHANGE COLUMN stanoviste mesto VARCHAR(180) NOT NULL;

-- Rebuild indexes/unique key with the renamed column
ALTER TABLE vehicles_station_addresses_v2
  DROP INDEX uq_station_address,
  DROP INDEX idx_station_name,
  ADD UNIQUE KEY uq_station_address (organizace, mesto, ulice, psc),
  ADD KEY idx_station_name (mesto);

-- Keep display name populated after rename
UPDATE vehicles_station_addresses_v2
SET nazev_stanoviste = mesto
WHERE nazev_stanoviste IS NULL OR TRIM(nazev_stanoviste) = '';

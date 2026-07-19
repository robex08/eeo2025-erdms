-- Add explicit w_ln matching columns for fast vehicle home/field comparison

ALTER TABLE vehicles_station_addresses_v2
  ADD COLUMN IF NOT EXISTS w_ln_match VARCHAR(255) NOT NULL DEFAULT '' AFTER psc,
  ADD COLUMN IF NOT EXISTS w_ln_match_norm VARCHAR(255) NOT NULL DEFAULT '' AFTER w_ln_match,
  ADD KEY idx_station_w_ln_match_norm (w_ln_match_norm);

UPDATE vehicles_station_addresses_v2
SET
  w_ln_match = CONCAT('CZ ', TRIM(stanoviste), ', ', TRIM(ulice)),
  w_ln_match_norm = TRIM(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      LOWER(CONCAT(TRIM(stanoviste), ' ', TRIM(ulice))),
      '-', ' '),
      '.', ' '),
      ',', ' '),
      '/', ' '),
      '(', ' '),
      ')', ' '),
      '\\', ' '),
      '  ', ' '),
      '  ', ' '),
      '  ', ' ')
  )
WHERE w_ln_match = '' OR w_ln_match_norm = '';

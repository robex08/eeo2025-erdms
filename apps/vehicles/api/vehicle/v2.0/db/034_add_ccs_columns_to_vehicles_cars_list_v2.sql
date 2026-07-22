-- Add CCS card metadata to vehicles overview table
-- Used by full/quick sync to display CCS indicator and expiration warnings in list

ALTER TABLE vehicles_cars_list_v2
  ADD COLUMN IF NOT EXISTS ccs_card_number VARCHAR(64) DEFAULT NULL AFTER w_disabled,
  ADD COLUMN IF NOT EXISTS ccs_card_expiration VARCHAR(32) DEFAULT NULL AFTER ccs_card_number;

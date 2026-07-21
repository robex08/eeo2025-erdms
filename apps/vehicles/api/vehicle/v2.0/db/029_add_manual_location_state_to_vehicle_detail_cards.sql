-- Add manual location override for vehicles overview and bulk operations

ALTER TABLE vehicles_detail_cards
  ADD COLUMN IF NOT EXISTS manual_location_state VARCHAR(20) DEFAULT NULL AFTER w_stanoviste,
  ADD COLUMN IF NOT EXISTS manual_location_updated_at DATETIME DEFAULT NULL AFTER manual_location_state;

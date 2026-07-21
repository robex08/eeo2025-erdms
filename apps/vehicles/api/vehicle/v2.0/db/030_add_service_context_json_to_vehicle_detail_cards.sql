-- Adds extensible service metadata snapshot to vehicle detail cards.
-- Purpose: store current manual service context (service name/address/contact/etc.)
-- in a single dynamic payload without breaking existing structure.

ALTER TABLE vehicles_detail_cards
  ADD COLUMN IF NOT EXISTS service_context_json JSON DEFAULT NULL AFTER manual_location_updated_at;

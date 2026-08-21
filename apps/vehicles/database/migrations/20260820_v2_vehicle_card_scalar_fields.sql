-- DEV-only scalar fields for the V2 vehicle card.
-- Existing legacy vehicle tables are not modified.

ALTER TABLE vehicles_detail_cards
    ADD COLUMN IF NOT EXISTS evidencni_cislo_zzs VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS vin VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS acquisition_year SMALLINT UNSIGNED NULL,
    ADD COLUMN IF NOT EXISTS acquisition_supplier VARCHAR(190) NULL,
    ADD COLUMN IF NOT EXISTS warranty_valid_to DATE NULL,
    ADD COLUMN IF NOT EXISTS acquisition_price DECIMAL(14,2) NULL,
    ADD COLUMN IF NOT EXISTS technical_condition_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    ADD COLUMN IF NOT EXISTS service_interval_km INT UNSIGNED NULL,
    ADD COLUMN IF NOT EXISTS service_interval_months SMALLINT UNSIGNED NULL,
    ADD COLUMN IF NOT EXISTS battery_condition_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    ADD COLUMN IF NOT EXISTS vehicle_lifetime_percent DECIMAL(5,2) NULL,
    ADD KEY IF NOT EXISTS idx_vehicle_detail_vin (vin),
    ADD KEY IF NOT EXISTS idx_vehicle_detail_evidence (evidencni_cislo_zzs),
    ADD KEY IF NOT EXISTS idx_vehicle_detail_acquisition_year (acquisition_year);
-- Migration: Add kilometer tracking and CCS accounting columns to drivers cache
-- Date: 2026-07-22

ALTER TABLE vehicles_wd_drivers_v2
ADD COLUMN km_business_month DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Služební kilometry za měsíc',
ADD COLUMN km_private_month DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Soukromé kilometry za měsíc',
ADD COLUMN km_total_month DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Celkové kilometry za měsíc',
ADD COLUMN costs_total_month DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Celkové náklady za měsíc (Kč)',
ADD COLUMN costs_business_month DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Služební náklady za měsíc (Kč)',
ADD COLUMN costs_private_month DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Soukromé náklady za měsíc (Kč)',
ADD COLUMN km_month VARCHAR(7) NULL DEFAULT NULL COMMENT 'Měsíc pro který jsou km data (YYYY-MM)',
ADD COLUMN km_synced_at DATETIME NULL DEFAULT NULL COMMENT 'Čas posledního načtení km dat',
ADD INDEX idx_km_month (km_month),
ADD INDEX idx_km_synced_at (km_synced_at);

-- Optimize indexes for fleet 250k forecast queries (monthly averages / latest snapshots)

ALTER TABLE cars_km_mesic
  ADD INDEX idx_cars_km_mesic_interval_carid_id (pocet_mesicu, w_carid, id),
  ADD INDEX idx_cars_km_mesic_interval_update (pocet_mesicu, dt_aktualizace);

ALTER TABLE vehicles_cars_list_v2
  ADD INDEX idx_vehicles_cars_list_v2_status_legacy (status, legacy_carid);

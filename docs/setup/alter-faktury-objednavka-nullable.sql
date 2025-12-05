-- =====================================================
-- MIGRACE: objednavka_id → NULLABLE v 25a_objednavky_faktury
-- Datum: 5. 12. 2025
-- Důvod: Umožnit evidenci faktur bez přiřazené objednávky
-- =====================================================

-- Změna sloupce objednavka_id na NULLABLE
ALTER TABLE `25a_objednavky_faktury` 
MODIFY COLUMN `objednavka_id` int(10) DEFAULT NULL COMMENT 'Vazba na objednávku (pro rychlé dotazy) - nepovinné';

-- Výsledek: objednavka_id může být nyní NULL
-- Faktury bez objednávky budou mít objednavka_id = NULL

-- Ověření změny:
-- DESCRIBE `25a_objednavky_faktury`;

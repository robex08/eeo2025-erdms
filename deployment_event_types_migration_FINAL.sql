-- ═══════════════════════════════════════════════════════════════════
-- EVENT TYPES NAMING REFACTOR - FINÁLNÍ MIGRACE
-- ═══════════════════════════════════════════════════════════════════
-- Datum: 2026-01-03
-- Účel: Sjednocení event types na UPPERCASE_WITH_UNDERSCORE
-- Databáze: eeo2025-dev (DEV ONLY!)
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. BACKUP TABULEK
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS 25_notifikace_typy_udalosti_backup_20260103
SELECT * FROM 25_notifikace_typy_udalosti;

CREATE TABLE IF NOT EXISTS 25_notifikace_backup_20260103
SELECT * FROM 25_notifikace;

SELECT '✅ BACKUP vytvořen' AS status;

-- ═══════════════════════════════════════════════════════════════════
-- 2. MIGRACE 25_notifikace_typy_udalosti (kod)
-- ═══════════════════════════════════════════════════════════════════

-- OBJEDNÁVKY
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_CREATED' WHERE kod = 'order_status_nova';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_DRAFT' WHERE kod = 'order_status_rozpracovana';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_PENDING_APPROVAL' WHERE kod = 'order_status_ke_schvaleni';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_APPROVED' WHERE kod = 'order_status_schvalena';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_REJECTED' WHERE kod = 'order_status_zamitnuta';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_AWAITING_CHANGES' WHERE kod = 'order_status_ceka_se';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_SENT_TO_SUPPLIER' WHERE kod = 'order_status_odeslana';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_AWAITING_CONFIRMATION' WHERE kod = 'order_status_ceka_potvrzeni';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_CONFIRMED_BY_SUPPLIER' WHERE kod = 'order_status_potvrzena';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_REGISTRY_PENDING' WHERE kod = 'order_status_registr_ceka';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_REGISTRY_PUBLISHED' WHERE kod = 'order_status_registr_zverejnena';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_INVOICE_PENDING' WHERE kod = 'order_status_faktura_ceka';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_INVOICE_ADDED' WHERE kod = 'order_status_faktura_pridana';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_INVOICE_APPROVED' WHERE kod = 'order_status_faktura_schvalena';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_INVOICE_PAID' WHERE kod = 'order_status_faktura_uhrazena';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_VERIFICATION_PENDING' WHERE kod = 'order_status_kontrola_ceka';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_VERIFICATION_APPROVED' WHERE kod = 'order_status_kontrola_potvrzena';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_VERIFICATION_REJECTED' WHERE kod = 'order_status_kontrola_zamitnuta';
UPDATE 25_notifikace_typy_udalosti SET kod = 'ORDER_COMPLETED' WHERE kod = 'order_status_dokoncena';

SELECT '✅ Event types migrovány' AS status;

-- ═══════════════════════════════════════════════════════════════════
-- 3. MIGRACE 25_notifikace (typ)
-- ═══════════════════════════════════════════════════════════════════

UPDATE 25_notifikace SET typ = 'ORDER_CREATED' WHERE typ = 'order_status_nova';
UPDATE 25_notifikace SET typ = 'ORDER_DRAFT' WHERE typ = 'order_status_rozpracovana';
UPDATE 25_notifikace SET typ = 'ORDER_PENDING_APPROVAL' WHERE typ = 'order_status_ke_schvaleni';
UPDATE 25_notifikace SET typ = 'ORDER_APPROVED' WHERE typ = 'order_status_schvalena';
UPDATE 25_notifikace SET typ = 'ORDER_REJECTED' WHERE typ = 'order_status_zamitnuta';
UPDATE 25_notifikace SET typ = 'ORDER_AWAITING_CHANGES' WHERE typ = 'order_status_ceka_se';
UPDATE 25_notifikace SET typ = 'ORDER_SENT_TO_SUPPLIER' WHERE typ = 'order_status_odeslana';
UPDATE 25_notifikace SET typ = 'ORDER_AWAITING_CONFIRMATION' WHERE typ = 'order_status_ceka_potvrzeni';
UPDATE 25_notifikace SET typ = 'ORDER_CONFIRMED_BY_SUPPLIER' WHERE typ = 'order_status_potvrzena';
UPDATE 25_notifikace SET typ = 'ORDER_REGISTRY_PENDING' WHERE typ = 'order_status_registr_ceka';
UPDATE 25_notifikace SET typ = 'ORDER_REGISTRY_PUBLISHED' WHERE typ = 'order_status_registr_zverejnena';
UPDATE 25_notifikace SET typ = 'ORDER_INVOICE_PENDING' WHERE typ = 'order_status_faktura_ceka';
UPDATE 25_notifikace SET typ = 'ORDER_INVOICE_ADDED' WHERE typ = 'order_status_faktura_pridana';
UPDATE 25_notifikace SET typ = 'ORDER_INVOICE_APPROVED' WHERE typ = 'order_status_faktura_schvalena';
UPDATE 25_notifikace SET typ = 'ORDER_INVOICE_PAID' WHERE typ = 'order_status_faktura_uhrazena';
UPDATE 25_notifikace SET typ = 'ORDER_VERIFICATION_PENDING' WHERE typ = 'order_status_kontrola_ceka';
UPDATE 25_notifikace SET typ = 'ORDER_VERIFICATION_APPROVED' WHERE typ = 'order_status_kontrola_potvrzena';
UPDATE 25_notifikace SET typ = 'ORDER_VERIFICATION_REJECTED' WHERE typ = 'order_status_kontrola_zamitnuta';
UPDATE 25_notifikace SET typ = 'ORDER_COMPLETED' WHERE typ = 'order_status_dokoncena';

SELECT '✅ Notifikace migrovány' AS status;

-- ═══════════════════════════════════════════════════════════════════
-- 4. OVĚŘENÍ
-- ═══════════════════════════════════════════════════════════════════

SELECT 'Event types s novými kódy:' AS kontrola, COUNT(*) AS pocet
FROM 25_notifikace_typy_udalosti
WHERE kod LIKE 'ORDER_%';

SELECT 'Notifikace s novými kódy:' AS kontrola, COUNT(*) AS pocet
FROM 25_notifikace
WHERE typ LIKE 'ORDER_%';

SELECT '✅ SQL MIGRACE DOKONČENA' AS status;

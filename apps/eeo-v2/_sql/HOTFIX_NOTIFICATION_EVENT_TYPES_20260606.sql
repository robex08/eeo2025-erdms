-- ============================================================================
-- HOTFIX: Doplnění chybějících event typů v notifikačním systému
-- Datum: 2026-06-06
-- Priorita: 🔴 KRITICKÉ
-- Branch: feature/v3-development
-- Commit: TODO_ADD_COMMIT_HASH
-- ============================================================================
--
-- PROBLÉM POPIS:
-- ==============
-- Při zamítnutí faktury (věcná správnost = status 2) se zavolá:
--   triggerNotification($db, 'INVOICE_MATERIAL_CHECK_REJECTED', $invoice_id, $user_id)
--
-- Org hierarchie se pokouší najít recipients pro tuto notifikaci:
--   SELECT id FROM 25_notifikace_typy_udalosti WHERE kod = 'INVOICE_MATERIAL_CHECK_REJECTED'
--   → VÝSLEDEK: PRÁZDNO ❌
--
-- Bez event typu v DB:
--   1. Org hierarchie nemůže najít EDGES v structure_json profilu
--   2. notificationRouter vrací "NO RECIPIENTS FOUND"
--   3. Notifikace se NEPOSÍLÁ ❌
--   4. RH ADMIN nedostane info o zamítnutí faktury ❌
--
-- MAPOVÁNÍ (je OK, jen chybí event typy):
-- ========================================
-- V notificationHandlers.php řádky 108-118:
--   'ORDER_INVOICE_PENDING' → 'order_status_faktura_ceka'  ✓ (event typ CHYBÍ)
--   'ORDER_INVOICE_ADDED' → 'order_status_faktura_pridana'  ✓ (event typ existuje)
--   'ORDER_INVOICE_APPROVED' → 'order_status_faktura_schvalena' (event typ CHYBÍ)
--   'ORDER_INVOICE_PAID' → 'order_status_faktura_uhrazena'   (event typ CHYBÍ)
--   'INVOICE_MATERIAL_CHECK_REQUESTED' → 'order_status_kontrola_ceka' ✓ (existuje)
--   'INVOICE_MATERIAL_CHECK_APPROVED' → 'order_status_kontrola_potvrzena' ✓ (existuje)
--   'INVOICE_MATERIAL_CHECK_REJECTED' → 'order_status_kontrola_zamitnuta' (CHYBÍ)
--
-- ŘEŠENÍ:
-- =======
-- Vložit 4 chybějící event typy do 25_notifikace_typy_udalosti
-- Potom org hierarchie automaticky přidá EDGES pro tyto eventy
-- ============================================================================

INSERT INTO `25_notifikace_typy_udalosti` 
  (`kod`, `nazev`, `kategorie`, `aktivni`) 
VALUES
  (
    'ORDER_INVOICE_PENDING',
    'Objednávka čeká na fakturu',
    'invoices',
    1
  ),
  (
    'ORDER_INVOICE_APPROVED',
    'Faktura schválena',
    'invoices',
    1
  ),
  (
    'ORDER_INVOICE_PAID',
    'Faktura uhrazena',
    'invoices',
    1
  ),
  (
    'INVOICE_MATERIAL_CHECK_REJECTED',
    'Věcná správnost zamítnuta',
    'invoices',
    1
  );

-- ============================================================================
-- OVĚŘENÍ - Spusťte PŘED a PO nasazení
-- ============================================================================

-- 1. Ověření vložení (mělo by být 4 záznamy):
SELECT 
  COUNT(*) as total_event_types_added,
  GROUP_CONCAT(kod ORDER BY kod) as codes
FROM `25_notifikace_typy_udalosti`
WHERE kod IN (
  'ORDER_INVOICE_PENDING', 
  'ORDER_INVOICE_APPROVED', 
  'ORDER_INVOICE_PAID', 
  'INVOICE_MATERIAL_CHECK_REJECTED'
);
-- OČEKÁVANÝ VÝSLEDEK:
--   total_event_types_added: 4
--   codes: INVOICE_MATERIAL_CHECK_REJECTED,ORDER_INVOICE_APPROVED,ORDER_INVOICE_PAID,ORDER_INVOICE_PENDING

-- 2. Kontrola kategorizace:
SELECT 
  kod, nazev, kategorie, aktivni
FROM `25_notifikace_typy_udalosti`
WHERE kod IN (
  'ORDER_INVOICE_PENDING', 
  'ORDER_INVOICE_APPROVED', 
  'ORDER_INVOICE_PAID', 
  'INVOICE_MATERIAL_CHECK_REJECTED'
)
ORDER BY kod;
-- OČEKÁVANÝ VÝSLEDEK:
--   - Všechny s kategorie = 'invoices'
--   - Všechny s aktivni = 1

-- 3. Kontrola mapování s templates (měly by existovat):
SELECT 
  t.kod as notification_type,
  t.nazev as notification_name,
  COUNT(s.id) as template_count,
  GROUP_CONCAT(s.typ ORDER BY s.typ) as template_types
FROM `25_notifikace_typy_udalosti` t
LEFT JOIN `25_notifikace_sablony` s 
  ON (
    -- ORDER_INVOICE_PENDING mapuje na 'order_status_faktura_ceka'
    (t.kod = 'ORDER_INVOICE_PENDING' AND s.typ = 'order_status_faktura_ceka')
    OR
    -- ORDER_INVOICE_APPROVED mapuje na 'order_status_faktura_schvalena'
    (t.kod = 'ORDER_INVOICE_APPROVED' AND s.typ = 'order_status_faktura_schvalena')
    OR
    -- ORDER_INVOICE_PAID mapuje na 'order_status_faktura_uhrazena'
    (t.kod = 'ORDER_INVOICE_PAID' AND s.typ = 'order_status_faktura_uhrazena')
    OR
    -- INVOICE_MATERIAL_CHECK_REJECTED mapuje na 'order_status_kontrola_zamitnuta'
    (t.kod = 'INVOICE_MATERIAL_CHECK_REJECTED' AND s.typ = 'order_status_kontrola_zamitnuta')
  )
WHERE t.kod IN (
  'ORDER_INVOICE_PENDING', 
  'ORDER_INVOICE_APPROVED', 
  'ORDER_INVOICE_PAID', 
  'INVOICE_MATERIAL_CHECK_REJECTED'
)
GROUP BY t.kod
ORDER BY t.kod;
-- OČEKÁVANÝ VÝSLEDEK:
--   Všechny 4 typy by měly mít template_count >= 1

-- ============================================================================
-- DODATEK: AKTUALIZACE EXISTUJÍCÍ ŠABLONY - Přidání {vecna_spravnost_duvod}
-- ============================================================================
--
-- PROBLÉM: Šablona 'order_status_kontrola_zamitnuta' neobsahuje důvod zamítnutí
-- ŘEŠENÍ: Aktualizovat in-app a email šablonu s novým placeholder
--
-- ŠABLONA BYLA AKTUALIZOVÁNA:
-- ✅ In-app zpráva: "Kontrola kvality objednávky {order_number} byla zamítnuta - nutné úpravy.\n\nDůvod: {vecna_spravnost_duvod}"
-- ✅ Email subject: "❌ Kontrola objednávky {order_number} byla zamítnuta - {vecna_spravnost_duvod}"
-- ✅ Email body: HTML sekvence s stylovaným div pro důvod (červený rám, pozadí)
--

-- ============================================================================
-- TESTOVÁNÍ PO NASAZENÍ
-- ============================================================================
--
-- 1. Spusťte test zamítnutí faktury na DEV
-- 2. Zkontrolujte debug log:
--    tail -200 /var/www/erdms-dev/logs/php-error.log | grep "INVOICE_MATERIAL_CHECK_REJECTED"
--    Mělo by to obsahovat:
--      "✅ ✅ ✅ [triggerNotification] SUCCESS for INVOICE_MATERIAL_CHECK_REJECTED"
--
-- 3. Zkontrolujte debug DB:
--    SELECT * FROM debug_notification_log 
--    WHERE data LIKE '%INVOICE_MATERIAL_CHECK_REJECTED%'
--    ORDER BY id DESC LIMIT 5;
--    Mělo by ukazovat:
--      "Found X edges for event 'INVOICE_MATERIAL_CHECK_REJECTED'" (X > 0)
--
-- 4. Zkontrolujte notifikační audit:
--    SELECT COUNT(*) FROM 25_notifikace_audit 
--    WHERE typ = 'order_status_kontrola_zamitnuta';
--    Mělo by to být > 0 po zavolání zamítnutí
--
-- ============================================================================

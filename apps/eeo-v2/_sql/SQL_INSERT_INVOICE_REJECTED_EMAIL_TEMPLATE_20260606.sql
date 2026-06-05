-- ============================================================================
-- MIGRACE: Email šablona - Zamítnutí věcné správnosti faktury
-- Datum: 2026-06-05
-- Verze: v2.58
--
-- POPIS:
-- Vkládá novou email šablonu pro notifikaci o zamítnutí faktury
-- - Typ notifikace: 'invoice_rejected'
-- - Automatické odeslání při zamítnutí faktury (vecna_spravnost_potvrzeno = 2)
-- - Customizovatelné proměnné: {objednavka_cislo}, {faktura_cislo}, {vecna_spravnost_duvod}, etc.
--
-- DATABÁZE: eeo2025 (PRODUKCE) nebo EEO-OSTRA-DEV (TEST)
-- ============================================================================

USE `eeo2025`;  -- PRODUKCE
-- USE `EEO-OSTRA-DEV`;  -- DEVELOPMENT

-- ============================================================================
-- 1. Ověření, že tabulka existuje
-- ============================================================================
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = '25_notifikace_sablony'
LIMIT 1;

-- ============================================================================
-- 2. Kontrola, zda šablona již existuje (aby se duplikovala)
-- ============================================================================
SELECT * FROM `25_notifikace_sablony` 
WHERE typ_notifikace = 'invoice_rejected'
LIMIT 1;

-- ============================================================================
-- 3. Vložení nové email šablony - Zamítnutí faktury
-- ============================================================================
INSERT INTO `25_notifikace_sablony` 
  (`typ_notifikace`, `nazev_sablony`, `predmet_email`, `obsah_html`, `aktiv`, `dt_vytvoreni`)
VALUES
  (
    'invoice_rejected',
    'Faktury - Zamítnutí věcné správnosti',
    'Vaše faktury {objednavka_cislo} byly zamítnuty',
    CONCAT(
      '<html><head><meta charset="UTF-8"><style>',
      'body { font-family: Arial, sans-serif; color: #333; }',
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }',
      '.header { background-color: #dc3545; color: white; padding: 15px; border-radius: 5px; }',
      '.section { margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #dc3545; }',
      '.reason-box { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; }',
      '.footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }',
      'table { width: 100%; border-collapse: collapse; margin: 10px 0; }',
      'table td { padding: 8px; border-bottom: 1px solid #ddd; }',
      'table td.label { font-weight: bold; width: 150px; }',
      '</style></head><body>',
      '<div class="container">',
      '  <div class="header">',
      '    <h2 style="margin: 0; font-size: 20px;">⚠️ Zamítnutí faktury - Věcná správnost</h2>',
      '  </div>',
      '',
      '  <div class="section">',
      '    <p>Vaše faktury byly <strong>zamítnuty</strong> v procesu věcné správnosti.</p>',
      '    <p>Prosím, přečtěte si níže uvedený důvod a faktury opravte podle pokynů.</p>',
      '  </div>',
      '',
      '  <div class="section">',
      '    <h3>Detaily faktury:</h3>',
      '    <table>',
      '      <tr>',
      '        <td class="label">Objednávka:</td>',
      '        <td><strong>{objednavka_cislo}</strong></td>',
      '      </tr>',
      '      <tr>',
      '        <td class="label">Faktura:</td>',
      '        <td><strong>{faktura_cislo}</strong></td>',
      '      </tr>',
      '      <tr>',
      '        <td class="label">Částka:</td>',
      '        <td><strong>{faktura_castka} CZK</strong></td>',
      '      </tr>',
      '      <tr>',
      '        <td class="label">Datum faktury:</td>',
      '        <td>{faktura_datum}</td>',
      '      </tr>',
      '      <tr>',
      '        <td class="label">Vyřizuje:</td>',
      '        <td>{faktura_vyrizu_uzivatel}</td>',
      '      </tr>',
      '    </table>',
      '  </div>',
      '',
      '  <div class="reason-box">',
      '    <h4 style="margin-top: 0; color: #856404;">🔴 Důvod zamítnutí:</h4>',
      '    <p style="font-size: 16px; line-height: 1.6;">{vecna_spravnost_duvod}</p>',
      '  </div>',
      '',
      '  <div class="section">',
      '    <h3>Co dělat:</h3>',
      '    <ol>',
      '      <li>Přečtěte si důvod zamítnutí výše</li>',
      '      <li>Opravte fakturu podle pokynů</li>',
      '      <li>Znovu fakturu odešlete v systému</li>',
      '      <li>Fakturu opět pošleme ke kontrole věcné správnosti</li>',
      '    </ol>',
      '  </div>',
      '',
      '  <div class="footer">',
      '    <p><strong>ERDMS - Elektronická registrace dat a majetku stanice</strong></p>',
      '    <p>Automatická notifikace - nepište na tuto adresu</p>',
      '    <p>Pro otázky kontaktujte technickou podporu</p>',
      '  </div>',
      '</div>',
      '</body></html>'
    ),
    1,  -- aktiv = 1 (šablona je aktivní)
    NOW()
  );

-- ============================================================================
-- 4. Ověření vložení
-- ============================================================================
SELECT * FROM `25_notifikace_sablony` 
WHERE typ_notifikace = 'invoice_rejected'
LIMIT 1;

-- ============================================================================
-- 5. Alternativní jednoduché vložení - bez HTML (pokud předchozí selhalo)
-- ============================================================================
-- INSERT INTO `25_notifikace_sablony` 
--   (`typ_notifikace`, `nazev_sablony`, `predmet_email`, `obsah_html`, `aktiv`, `dt_vytvoreni`)
-- VALUES
--   (
--     'invoice_rejected',
--     'Faktury - Zamítnutí věcné správnosti',
--     'Vaše faktury {objednavka_cislo} byly zamítnuty',
--     '<h2>Zamítnutí faktury</h2><p>Vaše faktury byly zamítnuty v procesu věcné správnosti.</p><p>Objednávka: {objednavka_cislo}</p><p>Faktura: {faktura_cislo}</p><p>Důvod: {vecna_spravnost_duvod}</p>',
--     1,
--     NOW()
--   );

-- ============================================================================
-- 6. Kontrola všech dostupných šablon
-- ============================================================================
SELECT 
    id,
    typ_notifikace,
    nazev_sablony,
    predmet_email,
    aktiv,
    dt_vytvoreni
FROM `25_notifikace_sablony`
WHERE typ_notifikace IN ('invoice_rejected', 'invoice_created', 'invoice_approved')
ORDER BY dt_vytvoreni DESC;

-- ============================================================================
-- POZNÁMKA PRO PRODUKCI:
-- - Šablona se automaticky načte při zamítnutí faktury
-- - Proměnné se nahradí skutečnými hodnotami z DB
-- - HTML obsah se pošle jako email s email klientem
-- - Pokud se email nepošle, zkontroluj PHP error log:
--   tail -50 /var/www/erdms-dev/logs/php-error.log | grep -i "mail\|email\|notification"
-- ============================================================================

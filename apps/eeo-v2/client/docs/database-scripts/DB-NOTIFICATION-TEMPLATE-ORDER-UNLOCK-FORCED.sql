-- ===================================================================
-- Notification Template: ORDER_UNLOCK_FORCED
-- Použití: Když SUPERADMIN/ADMINISTRATOR násilně odemkne objednávku
-- ===================================================================

-- Vložit nový typ notifikace pro násilné odemčení objednávky
INSERT INTO notification_template (
  type,
  name,
  email_subject,
  email_body,
  app_title,
  app_message,
  send_email_default,
  priority_default,
  active,
  dt_created,
  dt_updated
) VALUES (
  'order_unlock_forced',
  'Objednávka násilně odemčena',
  'Objednávka #{order_number} byla převzata jiným uživatelem',
  'Vaše objednávka č. {order_number} byla násilně odemčena a převzata uživatelem {unlocker_name}.\n\nČas převzetí: {unlock_time}\nDůvod: Administrátor přebral editaci objednávky.\n\nPokud jste měli neuložené změny, doporučujeme je okamžitě uložit nebo konzultovat situaci s {unlocker_name}.',
  'Objednávka převzata jiným uživatelem',
  'Vaše objednávka č. {order_number} byla převzata uživatelem {unlocker_name}',
  1,
  'high',
  1,
  NOW(),
  NOW()
);

-- ===================================================================
-- Dostupné placeholdery:
-- ===================================================================
-- {order_number}    - Číslo/evid. číslo objednávky
-- {unlocker_name}   - Jméno uživatele, který odemkl (SUPERADMIN/ADMINISTRATOR)
-- {unlock_time}     - Čas odemčení (datetime)
-- {approver_name}   - Alternativní název pro unlocker_name (pro kompatibilitu)
--
-- Priorita: high - protože jde o důležitou informaci o převzetí práce
-- Email default: 1 - ano, poslat i email (důležité upozornění)
-- ===================================================================

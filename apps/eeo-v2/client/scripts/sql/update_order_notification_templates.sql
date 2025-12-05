-- ============================================================================
-- HROMADNÝ UPDATE notification_templates pro všechny order_* typy
-- ============================================================================
-- Aktualizace všech notifikačních šablon pro objednávky
-- Placeholdery: {order_number}, {order_subject}, {creator_name}, {max_price}, 
--               {creation_date}, {app_link}, {user_name}
-- ============================================================================
-- Databáze: evidence_smluv
-- Tabulka: 25_notification_templates
-- Datum: 25. 10. 2025
-- ============================================================================

-- 1. order_approved - Starý typ (deprecated, ale zachováme)
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka schválena (deprecated)',
  email_subject = 'Objednávka č. {order_number} byla schválena',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" byla schválena schvalovatelem.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
✅ Schváleno: {creation_date}

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '✅ Objednávka č. {order_number} schválena',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" byla schválena.',
  send_email_default = 1,
  priority_default = 'normal',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_approved';

-- 2. order_rejected - Starý typ (deprecated, ale zachováme)
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka zamítnuta (deprecated)',
  email_subject = 'Objednávka č. {order_number} byla zamítnuta',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" byla zamítnuta schvalovatelem.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
❌ Zamítnuto: {creation_date}

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '❌ Objednávka č. {order_number} zamítnuta',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" byla zamítnuta.',
  send_email_default = 1,
  priority_default = 'high',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_rejected';

-- 3. order_created - Starý typ (deprecated, ale zachováme)
UPDATE `25_notification_templates`
SET 
  name = 'Nová objednávka k schválení (deprecated)',
  email_subject = 'Nová objednávka č. {order_number} čeká na schválení',
  email_body = 'Dobrý den,

byla vytvořena nová objednávka, která čeká na Vaše schválení:

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
👤 Vytvořil: {creator_name}
💰 Max. cena: {max_price} Kč s DPH
📅 Datum: {creation_date}

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '📋 Nová objednávka č. {order_number} ke schválení',
  app_message = 'Objednávka č. {order_number} čeká na Vaše schválení.',
  send_email_default = 1,
  priority_default = 'normal',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_created';

-- 4. order_status_nova - Nová objednávka vytvořena (autor)
UPDATE `25_notification_templates`
SET 
  name = 'Nová objednávka vytvořena',
  email_subject = 'Nová objednávka č. {order_number} byla vytvořena',
  email_body = 'Dobrý den,

byla vytvořena nová objednávka:

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
👤 Vytvořil: {creator_name}
💰 Max. cena: {max_price} Kč s DPH
📅 Datum: {creation_date}

⚠️ Objednávka je zatím viditelná pouze pro autora.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '📝 Nová objednávka č. {order_number}',
  app_message = 'Byla vytvořena nová objednávka č. {order_number} s předmětem "{order_subject}". Objednávka je zatím viditelná pouze pro autora.',
  send_email_default = 0,
  priority_default = 'low',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_nova';

-- 5. order_status_ke_schvaleni - Objednávka odeslána ke schválení
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka odeslána ke schválení',
  email_subject = 'Objednávka č. {order_number} čeká na Vaše schválení',
  email_body = 'Dobrý den,

byla vytvořena nová objednávka, která čeká na Vaše schválení:

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
👤 Vytvořil: {creator_name}
💰 Max. cena: {max_price} Kč s DPH
📅 Datum: {creation_date}

⚠️ Objednávka vyžaduje Vaše schválení před odesláním dodavateli.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '📋 Objednávka č. {order_number} ke schválení',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" čeká na Vaše schválení.',
  send_email_default = 1,
  priority_default = 'high',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_ke_schvaleni';

-- 6. order_status_schvalena - Objednávka schválena
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka schválena',
  email_subject = 'Objednávka č. {order_number} byla schválena',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" byla schválena schvalovatelem.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
✅ Schváleno: {creation_date}

Objednávku lze nyní odeslat dodavateli.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '✅ Objednávka č. {order_number} schválena',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" byla schválena schvalovatelem.',
  send_email_default = 1,
  priority_default = 'normal',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_schvalena';

-- 7. order_status_zamitnuta - Objednávka zamítnuta
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka zamítnuta',
  email_subject = 'Objednávka č. {order_number} byla zamítnuta',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" byla zamítnuta schvalovatelem.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
❌ Zamítnuto: {creation_date}

Důvod zamítnutí naleznete v aplikaci.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '❌ Objednávka č. {order_number} zamítnuta',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" byla zamítnuta schvalovatelem.',
  send_email_default = 1,
  priority_default = 'high',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_zamitnuta';

-- 8. order_status_ceka_se - Objednávka čeká (vrácena k doplnění)
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka čeká na doplnění',
  email_subject = 'Objednávka č. {order_number} čeká na doplnění',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" byla vrácena k doplnění.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
⏸️ Čeká od: {creation_date}

Prosím doplňte požadované informace a opět odešlete ke schválení.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '⏸️ Objednávka č. {order_number} čeká',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" byla vrácena k doplnění informací.',
  send_email_default = 1,
  priority_default = 'normal',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_ceka_se';

-- 9. order_status_odeslana - Objednávka odeslána dodavateli
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka odeslána dodavateli',
  email_subject = 'Objednávka č. {order_number} odeslána dodavateli',
  email_body = 'Dobrý den,

schválená objednávka č. {order_number} s předmětem "{order_subject}" byla odeslána dodavateli.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
📤 Odesláno: {creation_date}

Čekáme na potvrzení dodavatelem.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '📤 Objednávka č. {order_number} odeslána',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" byla odeslána dodavateli.',
  send_email_default = 1,
  priority_default = 'normal',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_odeslana';

-- 10. order_status_potvrzena - Objednávka potvrzena dodavatelem
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka potvrzena dodavatelem',
  email_subject = 'Objednávka č. {order_number} potvrzena dodavatelem',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" byla potvrzena dodavatelem.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
✅ Potvrzeno: {creation_date}

Očekáváme dodání objednaného zboží/služby.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '✅ Objednávka č. {order_number} potvrzena',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" byla potvrzena dodavatelem.',
  send_email_default = 1,
  priority_default = 'normal',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_potvrzena';

-- 11. order_status_dokoncena - Objednávka dokončena
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka dokončena',
  email_subject = 'Objednávka č. {order_number} dokončena',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" byla úspěšně dokončena.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
✅ Dokončeno: {creation_date}

Zboží/služba bylo dodáno a objednávka je uzavřena.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '✅ Objednávka č. {order_number} dokončena',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" byla úspěšně dokončena.',
  send_email_default = 1,
  priority_default = 'normal',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_dokoncena';

-- 12. order_status_zrusena - Objednávka zrušena/stornována
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka zrušena',
  email_subject = 'Objednávka č. {order_number} byla zrušena',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" byla zrušena.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
🚫 Zrušeno: {creation_date}

Objednávka byla stornována a nebude realizována.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '🚫 Objednávka č. {order_number} zrušena',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" byla zrušena.',
  send_email_default = 1,
  priority_default = 'high',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_zrusena';

-- 13. order_status_ceka_potvrzeni - Objednávka čeká na potvrzení dodavatelem
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka čeká na potvrzení dodavatelem',
  email_subject = 'Objednávka č. {order_number} čeká na potvrzení',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" byla odeslána dodavateli a čeká na potvrzení.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
⏳ Čeká od: {creation_date}

Po potvrzení dodavatelem Vás budeme informovat.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '⏳ Objednávka č. {order_number} čeká na potvrzení',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" čeká na potvrzení dodavatelem.',
  send_email_default = 0,
  priority_default = 'normal',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_ceka_potvrzeni';

-- 14. order_status_smazana - Objednávka smazána
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka smazána',
  email_subject = 'Objednávka č. {order_number} byla smazána',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" byla trvale smazána.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
🗑️ Smazáno: {creation_date}

Objednávka byla odstraněna ze systému.

S pozdravem,
Systém EEO',
  app_title = '🗑️ Objednávka č. {order_number} smazána',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" byla trvale smazána.',
  send_email_default = 1,
  priority_default = 'high',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_smazana';

-- 15. order_status_rozpracovana - Objednávka rozpracována (koncept)
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka rozpracována',
  email_subject = 'Objednávka č. {order_number} je rozpracována',
  email_body = 'Dobrý den,

objednávka č. {order_number} s předmětem "{order_subject}" je rozpracována jako koncept.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
💰 Max. cena: {max_price} Kč s DPH
📝 Rozpracováno: {creation_date}

⚠️ Objednávka ještě nebyla odeslána ke schválení.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '📝 Objednávka č. {order_number} rozpracována',
  app_message = 'Objednávka č. {order_number} s předmětem "{order_subject}" je rozpracována jako koncept.',
  send_email_default = 0,
  priority_default = 'low',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_status_rozpracovana';

-- 16. order_unlock_forced - Objednávka násilně odemčena (převzata administrátorem)
UPDATE `25_notification_templates`
SET 
  name = 'Objednávka násilně odemčena',
  email_subject = 'Objednávka č. {order_number} byla převzata uživatelem {user_name}',
  email_body = 'Dobrý den,

Vaše objednávka č. {order_number} s předmětem "{order_subject}" byla násilně odemčena a převzata uživatelem {user_name}.

📋 Číslo: {order_number}
📝 Předmět: {order_subject}
👤 Převzal: {user_name}
⚠️ Odemčeno: {creation_date}

Důvod: Objednávka byla uzamčena po delší dobu a administrátor ji musel převzát pro dokončení.

⚠️ Vaše neuložené změny mohly být ztraceny.

Odkaz na objednávku: {app_link}

S pozdravem,
Systém EEO',
  app_title = '⚠️ Objednávka č. {order_number} převzata jiným uživatelem',
  app_message = 'Vaše objednávka č. {order_number} byla násilně odemčena uživatelem {user_name}. Neuložené změny mohly být ztraceny.',
  send_email_default = 1,
  priority_default = 'high',
  active = 1,
  dt_updated = NOW()
WHERE type = 'order_unlock_forced';


-- ============================================================================
-- KONTROLA: Zobrazení všech aktualizovaných šablon
-- ============================================================================

SELECT 
  id,
  type,
  name,
  email_subject,
  app_title,
  LEFT(app_message, 80) as app_message_short,
  send_email_default,
  priority_default,
  active,
  dt_updated
FROM `25_notification_templates`
WHERE type LIKE '%order_%'
ORDER BY id;

-- ============================================================================
-- HOTOVO! ✅
-- ============================================================================
-- Všechny order_* šablony byly aktualizovány.
-- Backend musí nahradit tyto placeholdery:
--   {order_number} - číslo objednávky
--   {order_subject} - předmět objednávky  
--   {creator_name} - jméno autora
--   {max_price} - maximální cena s DPH (formátováno)
--   {creation_date} - datum vytvoření (25. 10. 2025)
--   {app_link} - odkaz do aplikace
--   {user_name} - jméno uživatele (pro force unlock)
-- ============================================================================

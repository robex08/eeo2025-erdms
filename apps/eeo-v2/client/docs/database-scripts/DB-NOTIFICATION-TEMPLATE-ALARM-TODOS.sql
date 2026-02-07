-- ===================================================================
-- Notification Templates: ALARM / TODO Notifikace
-- Použití: Upozornění na nadcházející TODO alarmy
-- ===================================================================
-- 
-- Tyto šablony se používají pro zasílání notifikací o TODO alarmech.
-- Rozlišujeme dva typy podle priority:
--   1. NORMAL priority - standardní upozornění
--   2. HIGH priority   - urgentní upozornění (blízko deadlinu)
--
-- ===================================================================

-- -------------------------------------------------------------------
-- 1. ALARM TODO - NORMAL PRIORITY
-- -------------------------------------------------------------------
-- Použití: Standardní upozornění na nadcházející TODO
-- Časový trigger: např. 30 minut před termínem
-- -------------------------------------------------------------------

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
  'alarm_todo_normal',
  'Připomínka TODO úkolu',
  'Připomínka: {todo_title}',
  'Upozornění na nadcházející úkol:\n\nÚkol: {todo_title}\nTermín: {alarm_datetime}\nPoznámka: {todo_note}\n\nProsím zkontrolujte a dokončete tento úkol včas.',
  'Připomínka úkolu',
  '{todo_title} - termín {alarm_datetime}',
  0,
  'normal',
  1,
  NOW(),
  NOW()
);

-- -------------------------------------------------------------------
-- 2. ALARM TODO - HIGH PRIORITY
-- -------------------------------------------------------------------
-- Použití: Urgentní upozornění na blížící se deadline
-- Časový trigger: např. 5-10 minut před termínem, nebo po termínu
-- -------------------------------------------------------------------

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
  'alarm_todo_high',
  'URGENTNÍ: TODO úkol vyžaduje pozornost',
  '⚠️ URGENTNÍ: {todo_title}',
  '⚠️ URGENTNÍ UPOZORNĚNÍ ⚠️\n\nÚkol vyžaduje okamžitou pozornost:\n\nÚkol: {todo_title}\nTermín: {alarm_datetime}\nPoznámka: {todo_note}\n\nTento úkol je urgentní a měl by být dokončen co nejdříve!',
  '⚠️ URGENTNÍ úkol',
  '{todo_title} - VYŽADUJE POZORNOST!',
  1,
  'high',
  1,
  NOW(),
  NOW()
);

-- -------------------------------------------------------------------
-- 3. ALARM TODO - EXPIRED (VOLITELNÉ)
-- -------------------------------------------------------------------
-- Použití: Upozornění na prošlý deadline
-- Časový trigger: po termínu (např. +5 minut po termínu)
-- -------------------------------------------------------------------

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
  'alarm_todo_expired',
  'TODO úkol po termínu',
  '🔴 Prošlý termín: {todo_title}',
  '🔴 PROŠLÝ TERMÍN 🔴\n\nÚkol nebyl dokončen včas:\n\nÚkol: {todo_title}\nTermín byl: {alarm_datetime}\nPoznámka: {todo_note}\n\nProsím dokončete tento úkol co nejdříve nebo aktualizujte jeho stav.',
  '🔴 Prošlý termín úkolu',
  '{todo_title} - termín již prošel',
  1,
  'high',
  1,
  NOW(),
  NOW()
);

-- ===================================================================
-- Dostupné placeholdery pro všechny TODO alarm šablony:
-- ===================================================================
-- {todo_title}      - Název/titulek TODO úkolu
-- {todo_note}       - Poznámka k úkolu (může být prázdná)
-- {alarm_datetime}  - Datum a čas alarmu ve formátu: "25. 10. 2025 14:30"
-- {alarm_date}      - Pouze datum alarmu: "25. 10. 2025"
-- {alarm_time}      - Pouze čas alarmu: "14:30"
-- {user_name}       - Jméno uživatele, kterému je úkol přiřazen
-- {time_remaining}  - Zbývající čas do termínu (volitelné): "30 minut" / "5 minut"
-- {todo_id}         - ID úkolu v databázi (pro debugging)
--
-- ===================================================================

-- ===================================================================
-- PRIORITY vysvětlení:
-- ===================================================================
-- normal - Standardní upozornění (modrý/šedý badge v UI)
--        - Email: NE (send_email_default = 0)
--        - Časování: 30-60 minut před termínem
--
-- high   - Urgentní upozornění (červený badge v UI)
--        - Email: ANO (send_email_default = 1)
--        - Časování: 5-10 minut před termínem, nebo po termínu
-- ===================================================================

-- ===================================================================
-- Použití v Backend kódu (Python příklad):
-- ===================================================================
/*
from notifications import create_notification
from datetime import datetime

# Normal priority upozornění (30 min před termínem)
create_notification(
    recipient_user_id=user_id,
    template_type='alarm_todo_normal',
    placeholders={
        'todo_title': 'Zavolat klientovi',
        'todo_note': 'Projednat nabídku produktu XY',
        'alarm_datetime': '25. 10. 2025 14:30',
        'alarm_date': '25. 10. 2025',
        'alarm_time': '14:30',
        'user_name': 'Jan Novák',
        'time_remaining': '30 minut',
        'todo_id': '12345'
    }
)

# High priority upozornění (5 min před termínem)
create_notification(
    recipient_user_id=user_id,
    template_type='alarm_todo_high',
    placeholders={
        'todo_title': 'Zavolat klientovi',
        'todo_note': 'Projednat nabídku produktu XY',
        'alarm_datetime': '25. 10. 2025 14:30',
        'alarm_date': '25. 10. 2025',
        'alarm_time': '14:30',
        'user_name': 'Jan Novák',
        'time_remaining': '5 minut',
        'todo_id': '12345'
    }
)

# Expired notification (po termínu)
create_notification(
    recipient_user_id=user_id,
    template_type='alarm_todo_expired',
    placeholders={
        'todo_title': 'Zavolat klientovi',
        'todo_note': 'Projednat nabídku produktu XY',
        'alarm_datetime': '25. 10. 2025 14:30',
        'alarm_date': '25. 10. 2025',
        'alarm_time': '14:30',
        'user_name': 'Jan Novák',
        'todo_id': '12345'
    }
)
*/

-- ===================================================================
-- Testing queries:
-- ===================================================================
-- Ověř, že všechny šablony existují
SELECT type, name, priority_default, active 
FROM notification_template 
WHERE type LIKE 'alarm_todo_%';

-- Ověř placeholders v app_message
SELECT type, app_message 
FROM notification_template 
WHERE type LIKE 'alarm_todo_%';

-- Počet aktivních alarm šablon podle priority
SELECT priority_default, COUNT(*) as count
FROM notification_template 
WHERE type LIKE 'alarm_todo_%' AND active = 1
GROUP BY priority_default;

-- ===================================================================
-- Poznámky pro implementaci:
-- ===================================================================
-- 1. Backend scheduler (cron job) by měl kontrolovat nadcházející alarmy
--    každou minutu a vytvářet notifikace podle pravidel
--
-- 2. Doporučené časování:
--    - alarm_todo_normal: 30 minut před termínem
--    - alarm_todo_high:   5 minut před termínem
--    - alarm_todo_expired: 5 minut po termínu (pokud stále není done)
--
-- 3. Implementace v UI:
--    - Normal priority: modrá/šedá ikonka zvonečku
--    - High priority: červená ikonka zvonečku + blikání/pulzování
--    - Expired: červená + výkřičník
--
-- 4. Akce po kliknutí na notifikaci:
--    - Přesměrovat na TODO panel
--    - Označit notifikaci jako přečtenou
--    - Zvýraznit konkrétní TODO úkol v seznamu
-- ===================================================================

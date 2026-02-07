-- Test Notification System: AUTHOR_INFO & GUARANTOR_INFO
-- Testuje automatické rozeslání notifikací autorovi a garantovi objednávky

-- =============================================
-- PŘÍPRAVA: Zjisti aktuální stav objednávky
-- =============================================

SELECT 
  id,
  cislo_objednavky,
  uzivatel_id as autor_id,
  garant_uzivatel_id,
  prikazce_user_id,
  schvalil_1_user_id,
  stav_workflow_kod
FROM 25a_objednavky 
WHERE id = 11442;

-- Očekávaný výsledek:
-- +-------+-------------------------+----------+--------------------+------------------+--------------------+-------------------------+
-- | id    | cislo_objednavky        | autor_id | garant_uzivatel_id | prikazce_user_id | schvalil_1_user_id | stav_workflow_kod       |
-- +-------+-------------------------+----------+--------------------+------------------+--------------------+-------------------------+
-- | 11442 | O-1983/75030926/2025/IT |      100 |                100 |             NULL |                  1 | ["ODESLANA_KE_SCHVALENI"]|
-- +-------+-------------------------+----------+--------------------+------------------+--------------------+-------------------------+

-- =============================================
-- TEST 1: Zkontroluj existující hierarchii
-- =============================================

SELECT 
  id,
  nazev,
  aktivni,
  JSON_LENGTH(structure_json, '$.nodes') as pocet_nodes,
  JSON_LENGTH(structure_json, '$.edges') as pocet_edges
FROM 25_hierarchie_profily
WHERE aktivni = 1;

-- Očekávaný výsledek:
-- +----+---------------+---------+--------------+--------------+
-- | id | nazev         | aktivni | pocet_nodes  | pocet_edges  |
-- +----+---------------+---------+--------------+--------------+
-- | 10 | NOTIF-01-2025 |       1 |            X |            Y |
-- +----+---------------+---------+--------------+--------------+

-- =============================================
-- TEST 2: Zkontroluj které edges mají ORDER_SENT_FOR_APPROVAL
-- =============================================

SELECT 
  JSON_EXTRACT(structure_json, '$.edges') as edges
FROM 25_hierarchie_profily
WHERE id = 10;

-- Postupně zkontroluj:
-- 1. Které template nodes mají eventTypes obsahující 'ORDER_SENT_FOR_APPROVAL'
-- 2. Které edges vedou z těchto templates
-- 3. Které recipient roles mají tyto edges (APPROVAL, INFO, AUTHOR_INFO, GUARANTOR_INFO)
-- 4. Které checkboxy jsou aktivní (onlyOrderParticipants, onlyOrderAuthor, onlyOrderGuarantor)

-- =============================================
-- TEST 3: Simuluj vytvoření nové objednávky
-- =============================================

-- KROK 1: Vytvořit testovací objednávku
-- (Nebo použij existující 11442)

-- KROK 2: Odeslat objednávku ke schválení přes frontend
-- (Tím se trigger backend /notifications/trigger)

-- KROK 3: Zkontrolovat vytvořené notifikace
SELECT 
  n.id,
  n.typ,
  n.nadpis,
  n.od_uzivatele_id as od_kogo,
  n.pro_uzivatele_id as pro_koho,
  n.priorita,
  n.objekt_typ,
  n.objekt_id,
  n.dt_created,
  COALESCE(np.precteno, 'NULL') as precteno
FROM 25_notifikace n
LEFT JOIN 25_notifikace_precteni np ON n.id = np.notifikace_id AND np.uzivatel_id = n.pro_uzivatele_id
WHERE n.objekt_id = 11442 
  AND n.objekt_typ = 'orders'
  AND n.dt_created > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY n.dt_created DESC;

-- Očekávaný výsledek (3 notifikace):
-- ┌──────┬──────┬─────────────────────────────────────┬─────────┬──────────┬──────────┬────────────┬───────────┬─────────────────────┬──────────┐
-- │ id   │ typ  │ nadpis                              │ od_kogo │ pro_koho │ priorita │ objekt_typ │ objekt_id │ dt_created          │ precteno │
-- ├──────┼──────┼─────────────────────────────────────┼─────────┼──────────┼──────────┼────────────┼───────────┼─────────────────────┼──────────┤
-- │ 679  │ user │ 📋 Ke schválení: O-1983/...        │     100 │        1 │ APPROVAL │ orders     │     11442 │ 2025-12-17 00:05:00 │        0 │ ← Schvalovatel
-- │ 680  │ user │ 📋 Odesláno ke schválení: O-1983...│     100 │      100 │ INFO     │ orders     │     11442 │ 2025-12-17 00:05:00 │        0 │ ← Autor
-- │ 681  │ user │ 📋 Odesláno ke schválení: O-1983...│     100 │      100 │ INFO     │ orders     │     11442 │ 2025-12-17 00:05:00 │        0 │ ← Garant
-- └──────┴──────┴─────────────────────────────────────┴─────────┴──────────┴──────────┴────────────┴───────────┴─────────────────────┴──────────┘
--
-- ⚠️ POZOR: Pokud autor a garant jsou STEJNÁ osoba (100), dostane 2 notifikace!
-- Pokud je garant NULL, dostane jen 1 notifikaci (autor).

-- =============================================
-- TEST 4: Zkontroluj PHP error_log (backend debug)
-- =============================================

-- V terminálu:
-- tail -f /var/log/php/error.log | grep -E "NotificationRouter|findNotificationRecipients|onlyOrderParticipants"

-- Očekávaný output:
-- 🔔 [NotificationRouter] TRIGGER PŘIJAT!
--    Event Type: ORDER_SENT_FOR_APPROVAL
--    Object ID: 11442
--    Trigger User ID: 100
-- 
-- 📋 [findNotificationRecipients] Začínám hledat příjemce...
--    ✅ Nalezen profil ID=10
--    📊 Structure má X nodes a Y edges
-- 
-- 🔍 Hledám template nodes s event typem 'ORDER_SENT_FOR_APPROVAL'...
--    Template: order_status_ke_schvaleni, Event Types: ["ORDER_SENT_FOR_APPROVAL"]
--    ✅ MATCH! Template 'order_status_ke_schvaleni' má event 'ORDER_SENT_FOR_APPROVAL'
-- 
-- 🔗 Hledám edges z template 'order_status_ke_schvaleni'...
--    Edge #1: template_xyz → user_node_1
--    Filtry: onlyParticipants=ANO, recipientRole=APPROVAL
--    📋 Filtr 'onlyOrderParticipants' aktivní - hledám účastníky objednávky 11442...
--       ✅ Schvalovatelé/příkazce (APPROVAL): 1
--       ✅ Autor/garant (INFO): 100
--       🎯 Edge role=APPROVAL → filtr na schvalovatelé: 1
--       ✅ MATCH - Finální target users: 1
-- 
--    Edge #2: template_xyz → group_all_users
--    Filtry: onlyParticipants=ANO, recipientRole=INFO
--    📋 Filtr 'onlyOrderParticipants' aktivní - hledám účastníky objednávky 11442...
--       ✅ Schvalovatelé/příkazce (APPROVAL): 1
--       ✅ Autor/garant (INFO): 100
--       🎯 Edge role=INFO → filtr na autor/garant: 100
--       ✅ MATCH - Finální target users: 100

-- =============================================
-- TEST 5: Zkontroluj frontend zvoneček badge
-- =============================================

-- 1. Přihlas se jako user_id=1 (schvalovatel)
-- 2. Počkaj 60 sekund (background task interval)
-- 3. Zkontroluj browser console:
--    🔔 [BTask checkNotifications] START
--       → Volám getUnreadCount()...
--       ✅ Unread count: 1
-- 4. Zkontroluj zvoneček - měl by mít červené číslo "1"

-- 5. Přihlas se jako user_id=100 (autor/garant)
-- 6. Počkaj 60 sekund
-- 7. Zkontroluj browser console:
--    🔔 [BTask checkNotifications] START
--       → Volám getUnreadCount()...
--       ✅ Unread count: 2  ← Pokud autor=garant, 2 notifikace!
-- 8. Zkontroluj zvoneček - měl by mít červené číslo "2"

-- =============================================
-- CLEANUP: Smazat testovací notifikace
-- =============================================

-- DELETE FROM 25_notifikace_precteni 
-- WHERE notifikace_id IN (
--   SELECT id FROM 25_notifikace 
--   WHERE objekt_id = 11442 AND objekt_typ = 'orders'
--   AND dt_created > DATE_SUB(NOW(), INTERVAL 1 HOUR)
-- );

-- DELETE FROM 25_notifikace 
-- WHERE objekt_id = 11442 
--   AND objekt_typ = 'orders'
--   AND dt_created > DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- =============================================
-- REFERENČNÍ KONFIGURACE (Organizational Hierarchy)
-- =============================================

/*
Očekávaná konfigurace v hierarchii NOTIF-01-2025:

[Template: order_status_ke_schvaleni]
  EventTypes: ["ORDER_SENT_FOR_APPROVAL"]
  
  ├─→ [User: Jan Schvalovatel #1]
  │    recipientRole: APPROVAL
  │    onlyOrderParticipants: ✅ (zapnuto)
  │    sendInApp: ✅
  │    sendEmail: ✅
  │    → Backend filtr: Jen schvalovatelé + příkazce
  │    → Výsledek: User #1 dostane notifikaci pouze pokud je schvalovatel TÉTO objednávky
  │
  ├─→ [Group: Všichni uživatelé]
  │    recipientRole: INFO
  │    onlyOrderParticipants: ✅ (zapnuto)
  │    sendInApp: ✅
  │    sendEmail: ❌
  │    → Backend filtr: Jen autor + garant
  │    → Výsledek: Autor (user_id=100) dostane INFO notifikaci
  │
  └─→ [Group: Všichni uživatelé]
       recipientRole: INFO
       onlyOrderParticipants: ✅ (zapnuto)
       sendInApp: ✅
       sendEmail: ✅
       → Backend filtr: Jen autor + garant
       → Výsledek: Garant (user_id=100) dostane INFO notifikaci s emailem

NEBO (alternativně s AUTHOR_INFO/GUARANTOR_INFO):

[Template: order_status_ke_schvaleni]
  EventTypes: ["ORDER_SENT_FOR_APPROVAL"]
  
  ├─→ [User: Jan Schvalovatel #1]
  │    recipientRole: APPROVAL
  │    onlyOrderParticipants: ✅
  │
  ├─→ [Group: Všichni uživatelé]
  │    recipientRole: AUTHOR_INFO
  │    onlyOrderAuthor: ✅ (zapnuto)
  │    → Backend filtr: Pouze autor objednávky
  │
  └─→ [Group: Všichni uživatelé]
       recipientRole: GUARANTOR_INFO
       onlyOrderGuarantor: ✅ (zapnuto)
       → Backend filtr: Pouze garant objednávky
*/

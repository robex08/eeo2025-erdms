#!/bin/bash
# Test script pro kontrolu notifikací

echo "════════════════════════════════════════════════════════════════"
echo "📊 NOTIFICATION DEBUG REPORT"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "1️⃣ Poslední notifikace v DB:"
echo "----------------------------------------"
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 -e "
SELECT 
  n.id,
  n.objekt_id as order_id,
  n.nadpis,
  nr.precteno,
  JSON_EXTRACT(n.data_json, '$.placeholders') as placeholders
FROM 25_notifikace n
LEFT JOIN 25_notifikace_precteni nr ON n.id = nr.notifikace_id
ORDER BY n.id DESC
LIMIT 1\G"

echo ""
echo "2️⃣ Debug logy z DB:"
echo "----------------------------------------"
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 -e "
SELECT 
  id,
  DATE_FORMAT(dt_created, '%H:%i:%s') as time,
  message,
  LEFT(data, 100) as data_preview
FROM debug_notification_log
ORDER BY id DESC
LIMIT 20"

echo ""
echo "3️⃣ Poslední objednávka:"
echo "----------------------------------------"
mysql -h 10.3.172.11 -u erdms_user -p'AhchohTahnoh7eim' eeo2025 -e "
SELECT 
  id,
  cislo_objednavky,
  predmet,
  stav_workflow_kod
FROM 25a_objednavky
ORDER BY id DESC
LIMIT 1\G"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DONE"
echo "════════════════════════════════════════════════════════════════"

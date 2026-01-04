#!/bin/bash
echo "=== TEST HTML VARIANT SELECTION ==="

echo "1. Vytvoř debug order..."
mysql -h10.3.172.11 -uerdms_user -pAhchohTahnoh7eim eeo2025-dev -e "
INSERT INTO 25a_objednavky 
(uzivatel_id, objednatel_id, prikazce_id, predmet, max_cena_s_dph, stav_objednavky, dt_vytvoreni) 
VALUES 
(9, 9, 14, 'TEST HTML VARIANT', 1000.00, 'ke_schvaleni', NOW());
"

echo "2. Get order ID..."
ORDER_ID=$(mysql -h10.3.172.11 -uerdms_user -pAhchohTahnoh7eim eeo2025-dev -se "SELECT MAX(id) FROM 25a_objednavky WHERE predmet='TEST HTML VARIANT';")
echo "Order ID: $ORDER_ID"

echo "3. Clear debug log..."
echo "" > /tmp/hierarchy_debug.log

echo "4. Trigger notification..."
curl -s -X POST "http://localhost:3001/dev/api.eeo/api.php" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "triggerNotification",
    "typ": "order_status_ke_schvaleni", 
    "objednavka_id": '${ORDER_ID}',
    "data": {
      "objednavka_id": '${ORDER_ID}',
      "mimoradna_udalost": false,
      "test": true
    }
  }'

echo -e "\n5. Check debug results..."
tail -20 /tmp/hierarchy_debug.log

echo -e "\n6. Check DB notifications..."
mysql -h10.3.172.11 -uerdms_user -pAhchohTahnoh7eim eeo2025-dev -e "
SELECT n.id, n.nadpis, n.priorita, u.jmeno, u.prijmeni 
FROM 25_notifikace n 
LEFT JOIN 25_uzivatele u ON n.pro_uzivatele_id = u.id
WHERE n.objekt_id = $ORDER_ID 
ORDER BY n.id DESC;
"

echo -e "\n7. Cleanup..."
mysql -h10.3.172.11 -uerdms_user -pAhchohTahnoh7eim eeo2025-dev -e "
DELETE FROM 25_notifikace WHERE objekt_id = $ORDER_ID;
DELETE FROM 25a_objednavky WHERE id = $ORDER_ID;
"

echo "=== TEST COMPLETE ==="
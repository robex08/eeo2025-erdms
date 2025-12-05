-- Oprava chybného názvu workflow stavu z FAKTURANA na FAKTURACE
-- Datum: 27. října 2025
-- Účel: Správný název stavu má být FAKTURACE místo FAKTURANA

-- 1. Aktualizace workflow stavů v tabulce orders
UPDATE orders 
SET workflow_states = REPLACE(workflow_states, 'FAKTURANA', 'FAKTURACE')
WHERE workflow_states LIKE '%FAKTURANA%';

-- 2. Aktualizace aktuálního stavu objednávek 
UPDATE orders 
SET current_state = 'FAKTURACE'
WHERE current_state = 'FAKTURANA';

-- 3. Aktualizace historických záznamů workflow (pokud existuje tabulka order_history nebo workflow_history)
-- Upravte název tabulky podle vaší DB struktury:
UPDATE order_history 
SET state = 'FAKTURACE'
WHERE state = 'FAKTURANA';

-- 4. Aktualizace v logs nebo audit tabulkách (pokud existují)
-- Upravte název tabulky podle vaší DB struktury:
UPDATE activity_logs 
SET action_details = REPLACE(action_details, 'FAKTURANA', 'FAKTURACE')
WHERE action_details LIKE '%FAKTURANA%';

-- 5. Ověření úspěšné změny
SELECT 
    COUNT(*) as pocet_objednavek_s_novym_stavem
FROM orders 
WHERE workflow_states LIKE '%FAKTURACE%' 
   OR current_state = 'FAKTURACE';

-- 6. Kontrola, že už neexistují záznamy se starým názvem
SELECT 
    COUNT(*) as pocet_zbylych_fakturana_zaznamu
FROM orders 
WHERE workflow_states LIKE '%FAKTURANA%' 
   OR current_state = 'FAKTURANA';

-- Pokud je výsledek druhého SELECTu 0, oprava byla úspěšná
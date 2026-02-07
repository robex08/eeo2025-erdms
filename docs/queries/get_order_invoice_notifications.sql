-- =====================================================================
-- SQL DOTAZ: Všechny notifikace týkající se objednávek a faktur
-- Datum: 11.1.2026
-- Účel: Analýza notifikací pro objednávky a faktury
-- =====================================================================

-- =====================================================================
-- 1. NOTIFIKACE PODLE TYPU (hlavní přehled)
-- =====================================================================

-- Všechny notifikace pro objednávky a faktury
SELECT 
    n.id,
    n.type AS typ_notifikace,
    n.title AS nazev,
    n.message AS zprava,
    n.priority AS priorita,
    n.category AS kategorie,
    
    -- Odesílatel
    n.from_user_id AS od_user_id,
    CONCAT(u_from.jmeno, ' ', u_from.prijmeni) AS odesilatel,
    
    -- Příjemce
    n.to_user_id AS komu_user_id,
    CONCAT(u_to.jmeno, ' ', u_to.prijmeni) AS prijemce,
    n.to_users_json AS vsem_uzivatele_json,
    n.to_all_users AS vsem_uzivatele,
    
    -- Související objekty
    n.related_object_type AS typ_objektu,
    n.related_object_id AS id_objektu,
    n.data_json AS data,
    
    -- Email
    n.send_email AS poslat_email,
    n.email_sent AS email_odeslan,
    n.email_sent_at AS email_odeslan_kdy,
    
    -- Stav
    n.active AS aktivni,
    n.dt_created AS vytvoreno,
    n.dt_expires AS expiruje,
    
    -- Čtení
    nr.is_read AS precteno,
    nr.dt_read AS precteno_kdy,
    nr.is_dismissed AS skryto,
    nr.dt_dismissed AS skryto_kdy,
    nr.is_deleted AS smazano,
    nr.dt_deleted AS smazano_kdy

FROM 25_notifications n

-- JOIN na uživatele (odesílatel)
LEFT JOIN 25_users u_from ON n.from_user_id = u_from.id

-- JOIN na uživatele (příjemce)
LEFT JOIN 25_users u_to ON n.to_user_id = u_to.id

-- JOIN na stav čtení (může být více záznamů pro různé uživatele)
LEFT JOIN 25_notifications_read nr ON n.id = nr.notification_id

WHERE 
    -- FILTR: Notifikace pro objednávky nebo faktury
    (
        -- Kategorie
        n.category IN ('orders', 'invoices')
        
        OR
        
        -- Typ obsahuje "order" nebo "invoice"
        n.type LIKE '%order%'
        OR n.type LIKE '%invoice%'
        OR n.type LIKE '%objednavk%'
        OR n.type LIKE '%faktur%'
        
        OR
        
        -- Související objekt je order nebo invoice
        n.related_object_type IN ('order', 'invoice')
    )
    
    -- Pouze aktivní
    AND n.active = 1

ORDER BY 
    n.dt_created DESC,
    n.id DESC;


-- =====================================================================
-- 2. STATISTIKA NOTIFIKACÍ PODLE TYPU
-- =====================================================================

SELECT 
    n.type AS typ_notifikace,
    t.name AS nazev_templatu,
    COUNT(n.id) AS pocet,
    SUM(CASE WHEN n.email_sent = 1 THEN 1 ELSE 0 END) AS email_odeslano,
    SUM(CASE WHEN nr.is_read = 1 THEN 1 ELSE 0 END) AS precteno,
    SUM(CASE WHEN nr.is_dismissed = 1 THEN 1 ELSE 0 END) AS skryto,
    n.priority AS priorita,
    n.category AS kategorie

FROM 25_notifications n

LEFT JOIN 25_notification_templates t ON n.type = t.type
LEFT JOIN 25_notifications_read nr ON n.id = nr.notification_id

WHERE 
    (
        n.category IN ('orders', 'invoices')
        OR n.type LIKE '%order%'
        OR n.type LIKE '%invoice%'
        OR n.type LIKE '%objednavk%'
        OR n.type LIKE '%faktur%'
        OR n.related_object_type IN ('order', 'invoice')
    )
    AND n.active = 1

GROUP BY n.type, t.name, n.priority, n.category
ORDER BY pocet DESC, n.type;


-- =====================================================================
-- 3. NOTIFIKACE PRO KONKRÉTNÍ OBJEDNÁVKU
-- =====================================================================

-- Použití: Nahraď 123 za ID objednávky
SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.priority,
    CONCAT(u_from.jmeno, ' ', u_from.prijmeni) AS odesilatel,
    CONCAT(u_to.jmeno, ' ', u_to.prijmeni) AS prijemce,
    n.dt_created AS vytvoreno,
    nr.is_read AS precteno,
    nr.dt_read AS precteno_kdy,
    n.email_sent AS email_odeslan,
    n.email_sent_at AS email_kdy

FROM 25_notifications n
LEFT JOIN 25_users u_from ON n.from_user_id = u_from.id
LEFT JOIN 25_users u_to ON n.to_user_id = u_to.id
LEFT JOIN 25_notifications_read nr ON n.id = nr.notification_id

WHERE 
    n.related_object_type = 'order'
    AND n.related_object_id = 123  -- ← ZMĚŇ ID objednávky
    AND n.active = 1

ORDER BY n.dt_created DESC;


-- =====================================================================
-- 4. NOTIFIKACE PRO KONKRÉTNÍ FAKTURU
-- =====================================================================

-- Použití: Nahraď 456 za ID faktury
SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.priority,
    CONCAT(u_from.jmeno, ' ', u_from.prijmeni) AS odesilatel,
    CONCAT(u_to.jmeno, ' ', u_to.prijmeni) AS prijemce,
    n.dt_created AS vytvoreno,
    nr.is_read AS precteno,
    n.email_sent AS email_odeslan

FROM 25_notifications n
LEFT JOIN 25_users u_from ON n.from_user_id = u_from.id
LEFT JOIN 25_users u_to ON n.to_user_id = u_to.id
LEFT JOIN 25_notifications_read nr ON n.id = nr.notification_id

WHERE 
    n.related_object_type = 'invoice'
    AND n.related_object_id = 456  -- ← ZMĚŇ ID faktury
    AND n.active = 1

ORDER BY n.dt_created DESC;


-- =====================================================================
-- 5. NOTIFIKACE PODLE FÁZÍ OBJEDNÁVKY
-- =====================================================================

SELECT 
    CASE 
        WHEN n.type LIKE '%nova%' OR n.type LIKE '%rozpracovan%' THEN '1. NOVÁ/ROZPRACOVANÁ'
        WHEN n.type LIKE '%ke_schvaleni%' OR n.type LIKE '%pending%' THEN '2. KE SCHVÁLENÍ'
        WHEN n.type LIKE '%schvalena%' OR n.type LIKE '%approved%' THEN '3. SCHVÁLENÁ'
        WHEN n.type LIKE '%zamitnuta%' OR n.type LIKE '%rejected%' THEN '3. ZAMÍTNUTÁ'
        WHEN n.type LIKE '%odeslana%' OR n.type LIKE '%sent%' THEN '4. ODESLANÁ'
        WHEN n.type LIKE '%potvrzena%' OR n.type LIKE '%confirmed%' THEN '4. POTVRZENÁ'
        WHEN n.type LIKE '%registr%' THEN '5. REGISTR SMLUV'
        WHEN n.type LIKE '%faktur%' OR n.type LIKE '%invoice%' THEN '6. FAKTURACE'
        WHEN n.type LIKE '%kontrola%' OR n.type LIKE '%vecna%' THEN '7. VĚCNÁ SPRÁVNOST'
        WHEN n.type LIKE '%dokoncena%' OR n.type LIKE '%completed%' THEN '8. DOKONČENA'
        WHEN n.type LIKE '%zrusena%' OR n.type LIKE '%cancelled%' THEN 'ZRUŠENÁ'
        ELSE 'OSTATNÍ'
    END AS faze,
    n.type AS typ_notifikace,
    COUNT(n.id) AS pocet,
    SUM(CASE WHEN nr.is_read = 1 THEN 1 ELSE 0 END) AS precteno,
    AVG(CASE WHEN n.email_sent = 1 THEN 1 ELSE 0 END) * 100 AS email_procento

FROM 25_notifications n
LEFT JOIN 25_notifications_read nr ON n.id = nr.notification_id

WHERE 
    (
        n.category = 'orders'
        OR n.type LIKE '%order%'
        OR n.type LIKE '%objednavk%'
        OR n.related_object_type = 'order'
    )
    AND n.active = 1

GROUP BY faze, n.type
ORDER BY 
    CASE faze
        WHEN '1. NOVÁ/ROZPRACOVANÁ' THEN 1
        WHEN '2. KE SCHVÁLENÍ' THEN 2
        WHEN '3. SCHVÁLENÁ' THEN 3
        WHEN '3. ZAMÍTNUTÁ' THEN 4
        WHEN '4. ODESLANÁ' THEN 5
        WHEN '4. POTVRZENÁ' THEN 6
        WHEN '5. REGISTR SMLUV' THEN 7
        WHEN '6. FAKTURACE' THEN 8
        WHEN '7. VĚCNÁ SPRÁVNOST' THEN 9
        WHEN '8. DOKONČENA' THEN 10
        WHEN 'ZRUŠENÁ' THEN 11
        ELSE 12
    END,
    pocet DESC;


-- =====================================================================
-- 6. NOTIFIKACE PRO FAKTURY (detailní analýza)
-- =====================================================================

SELECT 
    CASE 
        WHEN n.type LIKE '%faktura_ceka%' THEN '1. ČEKÁ NA FAKTURU'
        WHEN n.type LIKE '%faktura_pridana%' OR n.type LIKE '%prirazena%' THEN '2. FAKTURA PŘIDÁNA'
        WHEN n.type LIKE '%faktura_schvalena%' THEN '3. FAKTURA SCHVÁLENA'
        WHEN n.type LIKE '%faktura_uhrazena%' THEN '4. FAKTURA UHRAZENA'
        ELSE 'OSTATNÍ'
    END AS stav_faktury,
    n.type AS typ_notifikace,
    COUNT(n.id) AS pocet,
    SUM(CASE WHEN nr.is_read = 1 THEN 1 ELSE 0 END) AS precteno,
    SUM(CASE WHEN n.email_sent = 1 THEN 1 ELSE 0 END) AS email_odeslano

FROM 25_notifications n
LEFT JOIN 25_notifications_read nr ON n.id = nr.notification_id

WHERE 
    (
        n.category = 'invoices'
        OR n.type LIKE '%faktur%'
        OR n.type LIKE '%invoice%'
        OR n.related_object_type = 'invoice'
    )
    AND n.active = 1

GROUP BY stav_faktury, n.type
ORDER BY 
    CASE stav_faktury
        WHEN '1. ČEKÁ NA FAKTURU' THEN 1
        WHEN '2. FAKTURA PŘIDÁNA' THEN 2
        WHEN '3. FAKTURA SCHVÁLENA' THEN 3
        WHEN '4. FAKTURA UHRAZENA' THEN 4
        ELSE 5
    END,
    pocet DESC;


-- =====================================================================
-- 7. NEPŘEČTENÉ NOTIFIKACE PRO UŽIVATELE
-- =====================================================================

-- Použití: Nahraď 7 za ID uživatele
SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.priority,
    n.category,
    CONCAT(u_from.jmeno, ' ', u_from.prijmeni) AS odesilatel,
    n.dt_created AS vytvoreno,
    TIMESTAMPDIFF(HOUR, n.dt_created, NOW()) AS hodin_stare,
    n.related_object_type,
    n.related_object_id

FROM 25_notifications n
LEFT JOIN 25_users u_from ON n.from_user_id = u_from.id
LEFT JOIN 25_notifications_read nr ON n.id = nr.notification_id AND nr.user_id = 7  -- ← ZMĚŇ ID uživatele

WHERE 
    (
        n.to_user_id = 7  -- ← ZMĚŇ ID uživatele
        OR n.to_all_users = 1
        OR JSON_CONTAINS(n.to_users_json, '7')  -- ← ZMĚŇ ID uživatele
    )
    AND (
        n.category IN ('orders', 'invoices')
        OR n.type LIKE '%order%'
        OR n.type LIKE '%invoice%'
        OR n.type LIKE '%faktur%'
        OR n.related_object_type IN ('order', 'invoice')
    )
    AND n.active = 1
    AND (nr.is_read IS NULL OR nr.is_read = 0)
    AND (nr.is_dismissed IS NULL OR nr.is_dismissed = 0)

ORDER BY 
    CASE n.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
    END,
    n.dt_created DESC;


-- =====================================================================
-- 8. NOTIFIKACE ZA POSLEDNÍ TÝDEN (statistika)
-- =====================================================================

SELECT 
    DATE(n.dt_created) AS datum,
    n.category AS kategorie,
    COUNT(n.id) AS pocet,
    SUM(CASE WHEN n.email_sent = 1 THEN 1 ELSE 0 END) AS s_emailem,
    SUM(CASE WHEN nr.is_read = 1 THEN 1 ELSE 0 END) AS precteno,
    AVG(CASE WHEN nr.is_read = 1 
        THEN TIMESTAMPDIFF(MINUTE, n.dt_created, nr.dt_read) 
        ELSE NULL 
    END) AS prumerny_cas_precteni_min

FROM 25_notifications n
LEFT JOIN 25_notifications_read nr ON n.id = nr.notification_id

WHERE 
    (
        n.category IN ('orders', 'invoices')
        OR n.type LIKE '%order%'
        OR n.type LIKE '%invoice%'
        OR n.type LIKE '%faktur%'
    )
    AND n.dt_created >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    AND n.active = 1

GROUP BY DATE(n.dt_created), n.category
ORDER BY datum DESC, kategorie;


-- =====================================================================
-- 9. DOSTUPNÉ TYPY NOTIFIKACÍ (templates)
-- =====================================================================

SELECT 
    t.id,
    t.type AS typ,
    t.name AS nazev,
    t.priority_default AS priorita,
    t.send_email_default AS email_default,
    t.active AS aktivni,
    
    -- Počet použití
    COUNT(n.id) AS pocet_pouziti,
    MAX(n.dt_created) AS posledni_pouziti

FROM 25_notification_templates t
LEFT JOIN 25_notifications n ON t.type = n.type

WHERE 
    (
        t.type LIKE '%order%'
        OR t.type LIKE '%invoice%'
        OR t.type LIKE '%faktur%'
        OR t.type LIKE '%objednavk%'
    )

GROUP BY t.id, t.type, t.name, t.priority_default, t.send_email_default, t.active
ORDER BY 
    CASE 
        WHEN t.type LIKE 'order_status_%' THEN 1
        WHEN t.type LIKE '%faktur%' THEN 2
        ELSE 3
    END,
    t.id;


-- =====================================================================
-- 10. PROBLÉMOVÉ NOTIFIKACE (neodeslaný email, expirované)
-- =====================================================================

SELECT 
    'Neodeslaný email' AS problem,
    n.id,
    n.type,
    n.title,
    n.priority,
    CONCAT(u_to.jmeno, ' ', u_to.prijmeni) AS prijemce,
    u_to.email AS email,
    n.dt_created AS vytvoreno,
    TIMESTAMPDIFF(HOUR, n.dt_created, NOW()) AS hodin_stare

FROM 25_notifications n
LEFT JOIN 25_users u_to ON n.to_user_id = u_to.id

WHERE 
    n.send_email = 1
    AND n.email_sent = 0
    AND (
        n.category IN ('orders', 'invoices')
        OR n.type LIKE '%order%'
        OR n.type LIKE '%invoice%'
    )
    AND n.active = 1
    AND n.dt_created >= DATE_SUB(NOW(), INTERVAL 7 DAY)

ORDER BY n.priority DESC, n.dt_created ASC

LIMIT 100;


-- =====================================================================
-- KONEC DOTAZŮ
-- =====================================================================

/*
POZNÁMKY:

1. Hlavní tabulky:
   - 25_notifications - hlavní notifikace
   - 25_notifications_read - stav čtení per uživatel
   - 25_notification_templates - šablony notifikací
   - 25_users - uživatelé

2. Filtry pro objednávky a faktury:
   - category IN ('orders', 'invoices')
   - type LIKE '%order%' OR type LIKE '%invoice%'
   - related_object_type IN ('order', 'invoice')

3. Typy notifikací pro objednávky:
   - order_status_nova
   - order_status_ke_schvaleni
   - order_status_schvalena
   - order_status_zamitnuta
   - order_status_odeslana
   - order_status_potvrzena
   - order_status_registr_ceka
   - order_status_registr_zverejnena
   - order_status_dokoncena
   - order_status_zrusena
   atd.

4. Typy notifikací pro faktury:
   - order_status_faktura_ceka
   - order_status_faktura_pridana
   - order_status_faktura_schvalena
   - order_status_faktura_uhrazena

5. Priority:
   - urgent - nejdůležitější
   - high - vysoká
   - normal - normální
   - low - nízká

6. Časové údaje:
   - dt_created - kdy byla notifikace vytvořena
   - dt_read - kdy byla přečtena
   - dt_expires - kdy expiruje
   - email_sent_at - kdy byl email odeslán
*/

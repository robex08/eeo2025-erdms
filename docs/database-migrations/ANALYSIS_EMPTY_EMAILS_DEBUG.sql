-- 📧 ANALÝZA PROBLÉMU S PRÁZDNÝMI EMAILY
-- Datum: 18. prosince 2025
-- Účel: Najít příčinu prázdných emailů v notifikačním systému

-- ════════════════════════════════════════════════════════════════
-- 1. KONTROLA ŠABLON V DATABÁZI
-- ════════════════════════════════════════════════════════════════

SELECT 
    id,
    typ,
    nazev,
    CHAR_LENGTH(email_telo) as email_body_length,
    CHAR_LENGTH(app_nadpis) as app_title_length,
    CHAR_LENGTH(app_zprava) as app_message_length,
    aktivni
FROM 25_notification_templates
WHERE aktivni = 1
ORDER BY id;

-- Očekáváno: Všechny šablony mají email_telo > 0

-- ════════════════════════════════════════════════════════════════
-- 2. KONTROLA HIERARCHICKÝCH PROFILŮ - TEMPLATE NODES
-- ════════════════════════════════════════════════════════════════

SELECT 
    hp.id as profil_id,
    hp.nazev as profil_nazev,
    hp.aktivni,
    JSON_EXTRACT(hp.structure_json, '$.nodes') as all_nodes
FROM 25_hierarchie_profily hp
WHERE hp.aktivni = 1;

-- ════════════════════════════════════════════════════════════════
-- 3. DETAILNÍ ANALÝZA - TEMPLATE NODES S templateId
-- ════════════════════════════════════════════════════════════════

-- Tato query najde všechny template nodes a jejich templateId

SELECT 
    hp.id as profil_id,
    hp.nazev as profil_nazev,
    node_data.node_id,
    node_data.node_type,
    node_data.node_name,
    node_data.template_id,
    node_data.event_types
FROM 25_hierarchie_profily hp,
JSON_TABLE(
    hp.structure_json,
    '$.nodes[*]' COLUMNS(
        node_id VARCHAR(255) PATH '$.id',
        node_type VARCHAR(50) PATH '$.typ',
        node_name VARCHAR(255) PATH '$.data.name',
        template_id INT PATH '$.data.templateId',
        event_types JSON PATH '$.data.eventTypes'
    )
) AS node_data
WHERE hp.aktivni = 1
  AND node_data.node_type = 'template';

-- Očekáváno: Každý template node má nenulové template_id

-- ════════════════════════════════════════════════════════════════
-- 4. KONTROLA EDGE KONFIGURACE - sendEmail flags
-- ════════════════════════════════════════════════════════════════

SELECT 
    hp.id as profil_id,
    hp.nazev as profil_nazev,
    edge_data.edge_id,
    edge_data.source_node,
    edge_data.target_node,
    edge_data.recipient_type,
    edge_data.recipient_role,
    edge_data.send_email,
    edge_data.send_in_app,
    edge_data.scope_filter
FROM 25_hierarchie_profily hp,
JSON_TABLE(
    hp.structure_json,
    '$.edges[*]' COLUMNS(
        edge_id VARCHAR(255) PATH '$.id',
        source_node VARCHAR(255) PATH '$.source',
        target_node VARCHAR(255) PATH '$.target',
        recipient_type VARCHAR(50) PATH '$.data.recipient_type',
        recipient_role VARCHAR(50) PATH '$.data.recipientRole',
        send_email BOOLEAN PATH '$.data.sendEmail',
        send_in_app BOOLEAN PATH '$.data.sendInApp',
        scope_filter VARCHAR(50) PATH '$.data.scope_filter'
    )
) AS edge_data
WHERE hp.aktivni = 1;

-- ⚠️ KONTROLUJ: Pokud send_email = 1, může to způsobovat problémy

-- ════════════════════════════════════════════════════════════════
-- 5. SPOJENÍ - TEMPLATE NODES + EDGES
-- ════════════════════════════════════════════════════════════════

-- Tato query ukáže, které template nodes mají edges s sendEmail=true

SELECT 
    hp.id as profil_id,
    hp.nazev as profil_nazev,
    node_data.node_id,
    node_data.node_name,
    node_data.template_id,
    nt.nazev as template_nazev,
    nt.email_telo IS NOT NULL as has_email_body,
    CHAR_LENGTH(nt.email_telo) as email_body_length,
    edge_data.send_email,
    edge_data.recipient_role
FROM 25_hierarchie_profily hp,
JSON_TABLE(
    hp.structure_json,
    '$.nodes[*]' COLUMNS(
        node_id VARCHAR(255) PATH '$.id',
        node_type VARCHAR(50) PATH '$.typ',
        node_name VARCHAR(255) PATH '$.data.name',
        template_id INT PATH '$.data.templateId'
    )
) AS node_data,
JSON_TABLE(
    hp.structure_json,
    '$.edges[*]' COLUMNS(
        source_node VARCHAR(255) PATH '$.source',
        send_email BOOLEAN PATH '$.data.sendEmail',
        recipient_role VARCHAR(50) PATH '$.data.recipientRole'
    )
) AS edge_data
LEFT JOIN 25_notification_templates nt ON nt.id = node_data.template_id
WHERE hp.aktivni = 1
  AND node_data.node_type = 'template'
  AND edge_data.source_node = node_data.node_id
  AND edge_data.send_email = 1;

-- ⚠️ KRITICKÉ: Pokud template_id je NULL nebo email_body_length = 0, 
--               budou se posílat prázdné emaily!

-- ════════════════════════════════════════════════════════════════
-- 6. KONTROLA VARIANT V EMAIL_TELO
-- ════════════════════════════════════════════════════════════════

-- Zkontroluje, zda šablony mají správné HTML varianty

SELECT 
    id,
    typ,
    nazev,
    CASE 
        WHEN email_telo LIKE '%<!-- RECIPIENT: normalVariant -->%' THEN '✅'
        ELSE '❌'
    END as has_normal_variant,
    CASE 
        WHEN email_telo LIKE '%<!-- RECIPIENT: urgentVariant -->%' THEN '✅'
        ELSE '❌'
    END as has_urgent_variant,
    CASE 
        WHEN email_telo LIKE '%<!-- RECIPIENT: infoVariant -->%' THEN '✅'
        ELSE '❌'
    END as has_info_variant
FROM 25_notification_templates
WHERE aktivni = 1
ORDER BY id;

-- Očekáváno: Každá šablona má alespoň normalVariant

-- ════════════════════════════════════════════════════════════════
-- 7. KONTROLA APP_NADPIS A APP_ZPRAVA PLACEHOLDERS
-- ════════════════════════════════════════════════════════════════

SELECT 
    id,
    typ,
    nazev,
    app_nadpis,
    SUBSTRING(app_zprava, 1, 200) as app_zprava_preview
FROM 25_notification_templates
WHERE aktivni = 1
ORDER BY id;

-- Zkontroluj, že app_nadpis a app_zprava obsahují placeholders jako:
-- {order_number}, {creator_name}, {action_performed_by}, atd.

-- ════════════════════════════════════════════════════════════════
-- 8. TESTOVACÍ QUERY - SIMULACE NOTIFICATION ROUTERU
-- ════════════════════════════════════════════════════════════════

-- Simuluj, co se stane při události ORDER_SENT_FOR_APPROVAL pro objednávku ID 1

SET @event_type = 'ORDER_SENT_FOR_APPROVAL';
SET @object_id = 1;

-- Najdi aktivní profil
SELECT 
    hp.id as profil_id,
    hp.nazev,
    node_data.template_id,
    nt.nazev as template_nazev,
    nt.app_nadpis,
    CHAR_LENGTH(nt.email_telo) as email_length,
    edge_data.send_email,
    edge_data.recipient_role
FROM 25_hierarchie_profily hp,
JSON_TABLE(
    hp.structure_json,
    '$.nodes[*]' COLUMNS(
        node_id VARCHAR(255) PATH '$.id',
        node_type VARCHAR(50) PATH '$.typ',
        template_id INT PATH '$.data.templateId',
        event_types JSON PATH '$.data.eventTypes'
    )
) AS node_data,
JSON_TABLE(
    hp.structure_json,
    '$.edges[*]' COLUMNS(
        source_node VARCHAR(255) PATH '$.source',
        target_node VARCHAR(255) PATH '$.target',
        send_email BOOLEAN PATH '$.data.sendEmail',
        recipient_role VARCHAR(50) PATH '$.data.recipientRole'
    )
) AS edge_data
LEFT JOIN 25_notification_templates nt ON nt.id = node_data.template_id
WHERE hp.aktivni = 1
  AND node_data.node_type = 'template'
  AND JSON_CONTAINS(node_data.event_types, CONCAT('"', @event_type, '"'))
  AND edge_data.source_node = node_data.node_id;

-- Tato query ukáže, která šablona se použije a zda má email_telo

-- ════════════════════════════════════════════════════════════════
-- 9. DEBUG LOG - POSLEDNÍ NOTIFIKACE
-- ════════════════════════════════════════════════════════════════

-- Zkontroluj data_json posledních notifikací

SELECT 
    id,
    nadpis,
    SUBSTRING(zprava, 1, 100) as zprava_preview,
    priorita,
    kategorie,
    odeslat_email,
    objekt_typ,
    objekt_id,
    data_json,
    dt_created
FROM 25_notifikace
WHERE dt_created > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY dt_created DESC
LIMIT 10;

-- Zkontroluj data_json - měl by obsahovat:
-- - template_id
-- - template_variant
-- - placeholders (s vyplněnými hodnotami)

-- ════════════════════════════════════════════════════════════════
-- 10. FIX - VYPNOUT EMAILY U VŠECH EDGES (POKUD POTŘEBA)
-- ════════════════════════════════════════════════════════════════

/*
-- ⚠️ POZOR: Toto globálně vypne všechny emaily!
-- Spusť pouze pokud chceš DOČASNĚ vypnout všechny emaily

UPDATE 25_hierarchie_profily hp
SET structure_json = JSON_SET(
    structure_json,
    '$.edges[*].data.sendEmail',
    false
)
WHERE aktivni = 1;

-- Po spuštění zkontroluj:
SELECT JSON_EXTRACT(structure_json, '$.edges[0].data.sendEmail') 
FROM 25_hierarchie_profily 
WHERE aktivni = 1;
-- Očekáváno: false
*/

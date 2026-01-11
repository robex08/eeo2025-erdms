-- Debug notifikací pro věcnou správnost - VS: 90, OBJ: O-0048

-- 1. KONTROLA FAKTURY VS: 90
SELECT 
  f.id as faktura_id,
  f.fa_cislo_vema,
  f.objednavka_id,
  o.cislo_objednavky,
  f.potvrzeni_vecne_spravnosti,
  f.vecna_spravnost_poznamka,
  f.potvrdil_vecnou_spravnost_id,
  f.dt_potvrzeni_vecne_spravnosti,
  f.dt_vytvoreni as faktura_vytvorena,
  CASE 
    WHEN f.potvrzeni_vecne_spravnosti = 1 THEN '✅ POTVRZENA'
    ELSE '❌ NEPOTVRZENA'
  END as status_vecne_spravnosti
FROM 25a_objednavky_faktury f
LEFT JOIN 25a_objednavky o ON f.objednavka_id = o.id
WHERE f.fa_cislo_vema = '90' OR f.fa_cislo_vema LIKE '%90%'
ORDER BY f.dt_vytvoreni DESC;

-- 2. KONTROLA OBJEDNÁVKY O-0048
SELECT 
  o.id as order_id,
  o.cislo_objednavky,
  o.potvrzeni_vecne_spravnosti as obj_vecna_spravnost,
  o.vecna_spravnost_poznamka as obj_vecna_poznamka,
  o.stav_workflow_kod,
  o.dt_vytvoreni as obj_vytvorena
FROM 25a_objednavky o
WHERE o.cislo_objednavky = 'O-0048'
ORDER BY o.dt_vytvoreni DESC;

-- 3. NOTIFIKACE PRO FAKTURU VS: 90
SELECT 
  n.id as notif_id,
  n.user_id,
  u.username,
  u.email,
  n.order_id,
  n.type,
  n.message,
  n.is_read,
  n.created_at,
  o.cislo_objednavky
FROM 25_notifications n
LEFT JOIN 25_users u ON n.user_id = u.id
LEFT JOIN 25a_objednavky o ON n.order_id = o.id
LEFT JOIN 25a_objednavky_faktury f ON o.id = f.objednavka_id
WHERE f.fa_cislo_vema = '90'
   AND n.type LIKE '%vecna%'
ORDER BY n.created_at DESC;

-- 4. NOTIFIKACE PRO OBJEDNÁVKU O-0048
SELECT 
  n.id as notif_id,
  n.user_id,
  u.username,
  u.email,
  n.order_id,
  n.type,
  n.message,
  n.is_read,
  n.created_at
FROM 25_notifications n
LEFT JOIN 25_users u ON n.user_id = u.id
LEFT JOIN 25a_objednavky o ON n.order_id = o.id
WHERE o.cislo_objednavky = 'O-0048'
   AND n.type LIKE '%vecna%'
ORDER BY n.created_at DESC;

-- 5. VŠECHNY NOTIFIKACE TÝKAJÍCÍ SE VĚCNÉ SPRÁVNOSTI ZA POSLEDNÍCH 7 DNÍ
SELECT 
  n.id,
  n.user_id,
  u.username,
  n.order_id,
  o.cislo_objednavky,
  n.type,
  n.message,
  n.is_read,
  n.created_at
FROM 25_notifications n
LEFT JOIN 25_users u ON n.user_id = u.id
LEFT JOIN 25a_objednavky o ON n.order_id = o.id
WHERE n.type LIKE '%vecna%' 
   OR n.type LIKE '%spravnost%'
   OR n.type LIKE '%kontrola%'
   AND n.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY n.created_at DESC;

-- 6. WORKFLOW HISTORIE PRO O-0048
SELECT 
  w.id,
  w.objednavka_id,
  w.stav_workflow_kod,
  w.poznamka,
  w.dt_zmeny,
  u.username as zmenil_uzivatel,
  o.cislo_objednavky
FROM 25_workflow_historie w
LEFT JOIN 25a_objednavky o ON w.objednavka_id = o.id
LEFT JOIN 25_users u ON w.uzivatel_id = u.id
WHERE o.cislo_objednavky = 'O-0048'
ORDER BY w.dt_zmeny DESC
LIMIT 10;

-- 7. KONTROLA NOTIFICATION LOGS (pokud existují)
SELECT 
  nl.*,
  n.type,
  n.message,
  u.username
FROM 25_notification_logs nl
LEFT JOIN 25_notifications n ON nl.notification_id = n.id
LEFT JOIN 25_users u ON nl.user_id = u.id
WHERE nl.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  AND (nl.email_error IS NOT NULL OR nl.email_sent = 0)
ORDER BY nl.created_at DESC
LIMIT 20;
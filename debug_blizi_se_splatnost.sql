-- Debug dotaz pro "Blíží se splatnost"
-- Analyzuje rozdíl mezi dashboard (celkem položek) a badge (položek na roční poplatek)

SELECT 
    r.id as rocni_poplatek_id,
    r.nazev,
    r.rok,
    s.nazev as smlouva_nazev,
    p.id as polozka_id,
    p.nazev_polozky,
    p.datum_splatnosti,
    p.stav,
    CASE 
        WHEN p.datum_splatnosti < CURDATE() AND p.stav != 'ZAPLACENO' THEN 'PO_SPLATNOSTI'
        WHEN p.datum_splatnosti >= CURDATE() 
             AND p.datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 10 DAY) 
             AND p.stav != 'ZAPLACENO' THEN 'BLIZI_SE_SPLATNOST'
        ELSE 'OK'
    END AS kategorie
FROM 25a_rocni_poplatky r
LEFT JOIN 25_smlouvy s ON r.smlouva_id = s.id  
LEFT JOIN 25a_rocni_poplatky_polozky p ON r.id = p.rocni_poplatek_id
WHERE r.aktivni = 1 
  AND p.aktivni = 1
  AND p.stav != 'ZAPLACENO'
  AND (
    p.datum_splatnosti < CURDATE() 
    OR (p.datum_splatnosti >= CURDATE() AND p.datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 10 DAY))
  )
ORDER BY kategorie, r.id, p.datum_splatnosti;

-- Souhrn pro dashboard
SELECT 
    'DASHBOARD_SOUHRN' as typ,
    COUNT(CASE WHEN p.datum_splatnosti < CURDATE() AND p.stav != 'ZAPLACENO' THEN 1 END) as po_splatnosti_polozky,
    COUNT(CASE WHEN p.datum_splatnosti >= CURDATE() 
                    AND p.datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 10 DAY) 
                    AND p.stav != 'ZAPLACENO' THEN 1 END) as blizi_se_splatnosti_polozky
FROM 25a_rocni_poplatky r
LEFT JOIN 25a_rocni_poplatky_polozky p ON r.id = p.rocni_poplatek_id
WHERE r.aktivni = 1 AND p.aktivni = 1;

-- Souhrn pro badges (po ročních poplatcích)
SELECT 
    'BADGE_SOUHRN' as typ,
    COUNT(DISTINCT CASE WHEN exists_overdue > 0 THEN r.id END) as rocni_poplatky_po_splatnosti,
    COUNT(DISTINCT CASE WHEN exists_due_soon > 0 THEN r.id END) as rocni_poplatky_blizi_se_splatnost
FROM (
    SELECT 
        r.id,
        SUM(CASE WHEN p.datum_splatnosti < CURDATE() AND p.stav != 'ZAPLACENO' THEN 1 ELSE 0 END) as exists_overdue,
        SUM(CASE WHEN p.datum_splatnosti >= CURDATE() 
                      AND p.datum_splatnosti <= DATE_ADD(CURDATE(), INTERVAL 10 DAY) 
                      AND p.stav != 'ZAPLACENO' THEN 1 ELSE 0 END) as exists_due_soon
    FROM 25a_rocni_poplatky r
    LEFT JOIN 25a_rocni_poplatky_polozky p ON r.id = p.rocni_poplatek_id
    WHERE r.aktivni = 1 AND p.aktivni = 1
    GROUP BY r.id
) subq;
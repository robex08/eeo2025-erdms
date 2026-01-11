-- ====================================================================
-- SQL Script pro aktualizaci HTML šablon - Outlook kompatibilita
-- ====================================================================
-- Datum: 2025-12-21
-- Účel: Opravit HTML šablony pro správné zobrazení v MS Outlook 365
-- Před spuštěním: Vytvořit zálohu!
-- ====================================================================

-- ====================================================================
-- 1. VYTVOŘENÍ ZÁLOHY
-- ====================================================================
DROP TABLE IF EXISTS 25_notifikace_sablony_backup_20251221;
CREATE TABLE 25_notifikace_sablony_backup_20251221 AS 
SELECT * FROM 25_notifikace_sablony;

SELECT CONCAT('✅ Záloha vytvořena: ', COUNT(*), ' řádků zkopírováno') as status
FROM 25_notifikace_sablony_backup_20251221;

-- ====================================================================
-- 2. KONTROLA AKTUÁLNÍCH ŠABLON
-- ====================================================================
SELECT 
    id,
    typ,
    nazev,
    LENGTH(email_telo) as html_size,
    dt_updated,
    -- Kontrola problematických CSS vlastností
    CASE 
        WHEN email_telo LIKE '%linear-gradient%' THEN 'OBSAHUJE_GRADIENT'
        ELSE 'OK'
    END as gradient_check,
    CASE 
        WHEN email_telo LIKE '%box-shadow%' THEN 'OBSAHUJE_BOX_SHADOW'
        ELSE 'OK'
    END as box_shadow_check
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY id;

-- ====================================================================
-- 3. AKTUALIZACE ŠABLONY: order_status_schvalena
-- ====================================================================
-- Poznámka: Zde by byla kompletní Outlook-compatible HTML šablona
-- Pro demonstraci používáme loadování ze souboru nebo přímo SQL string

UPDATE 25_notifikace_sablony 
SET 
    email_telo = LOAD_FILE('/var/www/erdms-dev/templates/FIXED_order_status_schvalena_outlook_compatible.html'),
    dt_updated = NOW()
WHERE typ = 'order_status_schvalena';

-- Ověření změny
SELECT 
    typ, 
    nazev, 
    LENGTH(email_telo) as new_size,
    dt_updated,
    CASE 
        WHEN email_telo LIKE '%linear-gradient%' THEN '❌ Stále obsahuje gradient'
        ELSE '✅ Gradient odstraněn'
    END as gradient_status
FROM 25_notifikace_sablony
WHERE typ = 'order_status_schvalena';

-- ====================================================================
-- 4. HROMADNÁ OPRAVA - Odstranění CSS gradientů (DOČASNÉ ŘEŠENÍ)
-- ====================================================================
-- Pokud nemáme ještě všechny opravené šablony, můžeme udělat
-- rychlou opravu nahrazením gradientů solidními barvami

-- Zelené gradienty → #059669
UPDATE 25_notifikace_sablony
SET 
    email_telo = REPLACE(
        email_telo,
        'background: linear-gradient(135deg, #059669, #047857)',
        'background-color: #059669; border-bottom: 4px solid #047857'
    ),
    dt_updated = NOW()
WHERE email_telo LIKE '%linear-gradient(135deg, #059669, #047857)%';

-- Modré gradienty → #3b82f6
UPDATE 25_notifikace_sablony
SET 
    email_telo = REPLACE(
        email_telo,
        'background: linear-gradient(135deg, #3b82f6, #2563eb)',
        'background-color: #3b82f6; border-bottom: 4px solid #2563eb'
    ),
    dt_updated = NOW()
WHERE email_telo LIKE '%linear-gradient(135deg, #3b82f6, #2563eb)%';

-- Zelené gradienty (světlejší varianta) → #10b981
UPDATE 25_notifikace_sablony
SET 
    email_telo = REPLACE(
        email_telo,
        'background: linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'background-color: #10b981; border-bottom: 4px solid #059669'
    ),
    dt_updated = NOW()
WHERE email_telo LIKE '%linear-gradient(135deg, #10b981 0%, #059669 100%)%';

-- Červené gradienty → #ef4444
UPDATE 25_notifikace_sablony
SET 
    email_telo = REPLACE(
        email_telo,
        'background: linear-gradient(135deg, #ef4444, #dc2626)',
        'background-color: #ef4444; border-bottom: 4px solid #dc2626'
    ),
    dt_updated = NOW()
WHERE email_telo LIKE '%linear-gradient(135deg, #ef4444, #dc2626)%';

-- Žluté/oranžové gradienty → #f59e0b
UPDATE 25_notifikace_sablony
SET 
    email_telo = REPLACE(
        email_telo,
        'background: linear-gradient(135deg, #f59e0b, #d97706)',
        'background-color: #f59e0b; border-bottom: 4px solid #d97706'
    ),
    dt_updated = NOW()
WHERE email_telo LIKE '%linear-gradient(135deg, #f59e0b, #d97706)%';

-- ====================================================================
-- 5. ODSTRANĚNÍ BOX-SHADOW
-- ====================================================================
UPDATE 25_notifikace_sablony
SET 
    email_telo = REGEXP_REPLACE(
        email_telo,
        'box-shadow: [^;]+;',
        'border: 1px solid #e5e7eb;'
    ),
    dt_updated = NOW()
WHERE email_telo LIKE '%box-shadow%';

-- ====================================================================
-- 6. KONTROLA PO ÚPRAVÁCH
-- ====================================================================
SELECT 
    id,
    typ,
    nazev,
    dt_updated,
    -- Kontrola problémů
    CASE 
        WHEN email_telo LIKE '%linear-gradient%' THEN '❌ GRADIENT'
        ELSE '✅'
    END as gradient_status,
    CASE 
        WHEN email_telo LIKE '%box-shadow%' THEN '❌ BOX_SHADOW'
        ELSE '✅'
    END as box_shadow_status,
    CASE 
        WHEN email_telo LIKE '%<div %' THEN '⚠️ POUŽÍVÁ_DIV'
        ELSE '✅'
    END as div_usage,
    LENGTH(email_telo) as html_size
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY id;

-- ====================================================================
-- 7. EXPORT ŠABLON PRO MANUÁLNÍ OPRAVU
-- ====================================================================
-- Pro export šablon do souborů (pro manuální úpravu):
SELECT 
    CONCAT('-- Template ID: ', id, '\n',
           '-- Type: ', typ, '\n',
           '-- Name: ', nazev, '\n',
           '-- Updated: ', dt_updated, '\n\n',
           email_telo, '\n\n',
           '-- END OF TEMPLATE\n',
           '========================================\n\n') as template_export
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY id
INTO OUTFILE '/tmp/email_templates_export_20251221.txt';

-- ====================================================================
-- 8. ROLLBACK (V PŘÍPADĚ PROBLÉMU)
-- ====================================================================
-- Pokud by něco selhalo, můžeme vrátit zálohu:
/*
TRUNCATE TABLE 25_notifikace_sablony;
INSERT INTO 25_notifikace_sablony 
SELECT * FROM 25_notifikace_sablony_backup_20251221;

SELECT '✅ Záloha obnovena' as status;
*/

-- ====================================================================
-- 9. STATISTIKY
-- ====================================================================
SELECT 
    COUNT(*) as total_templates,
    SUM(CASE WHEN email_telo LIKE '%linear-gradient%' THEN 1 ELSE 0 END) as templates_with_gradient,
    SUM(CASE WHEN email_telo LIKE '%box-shadow%' THEN 1 ELSE 0 END) as templates_with_box_shadow,
    SUM(CASE WHEN email_telo LIKE '%<div %' THEN 1 ELSE 0 END) as templates_with_divs,
    SUM(CASE WHEN email_telo IS NULL THEN 1 ELSE 0 END) as templates_without_html
FROM 25_notifikace_sablony;

-- ====================================================================
-- 10. SEZNAM ŠABLON K MANUÁLNÍ REVIZI
-- ====================================================================
SELECT 
    typ,
    nazev,
    CASE 
        WHEN email_telo LIKE '%linear-gradient%' 
             OR email_telo LIKE '%box-shadow%' 
             OR email_telo LIKE '%<div style%' 
        THEN '⚠️ VYŽADUJE REVIZI'
        ELSE '✅ OK'
    END as review_status,
    CONCAT(
        IF(email_telo LIKE '%linear-gradient%', 'gradient ', ''),
        IF(email_telo LIKE '%box-shadow%', 'box-shadow ', ''),
        IF(email_telo LIKE '%<div style%', 'divs ', '')
    ) as issues
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY 
    CASE WHEN email_telo LIKE '%linear-gradient%' THEN 1 ELSE 2 END,
    typ;

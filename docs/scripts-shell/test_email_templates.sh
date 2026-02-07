#!/bin/bash

# ====================================================================
# Testovací script pro HTML email šablony
# ====================================================================
# Účel: Ověřit, že opravené šablony jsou kompatibilní s Outlookem
# Použití: ./test_email_templates.sh
# ====================================================================

set -e  # Exit on error

echo "======================================================================"
echo "🔍 Testování HTML email šablon - Outlook kompatibilita"
echo "======================================================================"
echo ""

# Barvy pro output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Databázové připojení
DB_HOST="10.3.172.11"
DB_USER="erdms_user"
DB_PASS="CHANGE_ME_DB_PASSWORD"
DB_NAME="eeo2025"

# ====================================================================
# 1. KONTROLA PROBLEMATICKÝCH CSS VLASTNOSTÍ
# ====================================================================
echo -e "${BLUE}📋 Krok 1: Kontrola problematických CSS vlastností${NC}"
echo "----------------------------------------------------------------------"

mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'
SELECT 
    CONCAT('Template: ', typ) as template_name,
    CASE 
        WHEN email_telo LIKE '%linear-gradient%' THEN '❌ GRADIENT NALEZEN'
        ELSE '✅ OK'
    END as gradient_check,
    CASE 
        WHEN email_telo LIKE '%box-shadow%' THEN '❌ BOX-SHADOW NALEZEN'
        ELSE '✅ OK'
    END as box_shadow_check,
    CASE 
        WHEN email_telo LIKE '%flexbox%' OR email_telo LIKE '%display: flex%' THEN '❌ FLEXBOX NALEZEN'
        ELSE '✅ OK'
    END as flexbox_check,
    CASE 
        WHEN email_telo LIKE '%position: absolute%' OR email_telo LIKE '%position: fixed%' THEN '❌ POSITION NALEZENA'
        ELSE '✅ OK'
    END as position_check
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY typ;
EOF

echo ""
echo -e "${GREEN}✅ Kontrola CSS vlastností dokončena${NC}"
echo ""

# ====================================================================
# 2. KONTROLA STRUKTURY HTML
# ====================================================================
echo -e "${BLUE}📋 Krok 2: Kontrola HTML struktury${NC}"
echo "----------------------------------------------------------------------"

mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'
SELECT 
    typ as template,
    CASE 
        WHEN email_telo LIKE '%<!DOCTYPE html>%' THEN '✅'
        ELSE '❌'
    END as has_doctype,
    CASE 
        WHEN email_telo LIKE '%<meta http-equiv="Content-Type"%' THEN '✅'
        ELSE '⚠️'
    END as has_content_type,
    CASE 
        WHEN email_telo LIKE '%xmlns:v="urn:schemas-microsoft-com:vml"%' THEN '✅'
        ELSE '⚠️'
    END as has_vml_namespace,
    CASE 
        WHEN email_telo LIKE '%<!--[if mso]>%' THEN '✅ MSO podmínky'
        ELSE '⚠️ Chybí MSO'
    END as mso_conditionals,
    CASE 
        WHEN email_telo LIKE '%role="presentation"%' THEN '✅'
        ELSE '⚠️'
    END as has_presentation_role
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY typ;
EOF

echo ""
echo -e "${GREEN}✅ Kontrola HTML struktury dokončena${NC}"
echo ""

# ====================================================================
# 3. KONTROLA TABULEK VS DIV
# ====================================================================
echo -e "${BLUE}📋 Krok 3: Kontrola použití tabulek vs. div elementů${NC}"
echo "----------------------------------------------------------------------"

mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'
SELECT 
    typ as template,
    (LENGTH(email_telo) - LENGTH(REPLACE(email_telo, '<table', ''))) / LENGTH('<table') as table_count,
    (LENGTH(email_telo) - LENGTH(REPLACE(email_telo, '<div', ''))) / LENGTH('<div') as div_count,
    CASE 
        WHEN (LENGTH(email_telo) - LENGTH(REPLACE(email_telo, '<div', ''))) / LENGTH('<div') > 5 THEN '⚠️ Mnoho DIV elementů'
        WHEN (LENGTH(email_telo) - LENGTH(REPLACE(email_telo, '<div', ''))) / LENGTH('<div') > 0 THEN '✅ Některé DIV'
        ELSE '✅ Pouze tabulky'
    END as layout_status
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY typ;
EOF

echo ""
echo -e "${GREEN}✅ Kontrola tabulek dokončena${NC}"
echo ""

# ====================================================================
# 4. KONTROLA INLINE STYLŮ
# ====================================================================
echo -e "${BLUE}📋 Krok 4: Kontrola inline stylů${NC}"
echo "----------------------------------------------------------------------"

mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'
SELECT 
    typ as template,
    CASE 
        WHEN email_telo LIKE '%<style>%' OR email_telo LIKE '%<style type%' THEN '⚠️ Obsahuje <style> tag'
        ELSE '✅ Pouze inline styly'
    END as style_tag_check,
    CASE 
        WHEN email_telo LIKE '%font-family: Arial%' OR email_telo LIKE '%font-family:Arial%' THEN '✅ Web-safe font'
        WHEN email_telo LIKE '%-apple-system%' THEN '⚠️ System font stack'
        ELSE '❓ Nedetekováno'
    END as font_check,
    CASE 
        WHEN email_telo LIKE '%margin:%' AND email_telo NOT LIKE '%margin: 0%' THEN '⚠️ Používá margin'
        ELSE '✅ OK'
    END as margin_usage
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY typ;
EOF

echo ""
echo -e "${GREEN}✅ Kontrola inline stylů dokončena${NC}"
echo ""

# ====================================================================
# 5. KONTROLA VELIKOSTI ŠABLON
# ====================================================================
echo -e "${BLUE}📋 Krok 5: Kontrola velikosti HTML šablon${NC}"
echo "----------------------------------------------------------------------"

mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'
SELECT 
    typ as template,
    CONCAT(ROUND(LENGTH(email_telo) / 1024, 2), ' KB') as size,
    CASE 
        WHEN LENGTH(email_telo) > 102400 THEN '⚠️ Velká šablona (>100 KB)'
        WHEN LENGTH(email_telo) > 51200 THEN '✅ Střední velikost (50-100 KB)'
        ELSE '✅ Optimální (<50 KB)'
    END as size_status
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY LENGTH(email_telo) DESC;
EOF

echo ""
echo -e "${GREEN}✅ Kontrola velikosti dokončena${NC}"
echo ""

# ====================================================================
# 6. KONTROLA OBRÁZKŮ A EMOTIKONŮ
# ====================================================================
echo -e "${BLUE}📋 Krok 6: Kontrola obrázků a emotikonů${NC}"
echo "----------------------------------------------------------------------"

mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'
SELECT 
    typ as template,
    CASE 
        WHEN email_telo LIKE '%<img %' THEN CONCAT('✅ ', 
            (LENGTH(email_telo) - LENGTH(REPLACE(email_telo, '<img', ''))) / LENGTH('<img'), 
            ' obrázků')
        ELSE '✅ Žádné obrázky'
    END as image_check,
    CASE 
        WHEN email_telo LIKE '%&#%' THEN '✅ HTML entity emotikony'
        WHEN email_telo REGEXP '[😀-🙏🚀-🛿]' THEN '⚠️ UTF-8 emotikony'
        ELSE '✅ Žádné emotikony'
    END as emoji_check
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY typ;
EOF

echo ""
echo -e "${GREEN}✅ Kontrola obrázků a emotikonů dokončena${NC}"
echo ""

# ====================================================================
# 7. EXPORT PROBLEMATICKÝCH ŠABLON
# ====================================================================
echo -e "${BLUE}📋 Krok 7: Identifikace šablon vyžadujících opravu${NC}"
echo "----------------------------------------------------------------------"

mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'
SELECT 
    typ as template,
    nazev,
    CONCAT(
        IF(email_telo LIKE '%linear-gradient%', '🔴 gradient ', ''),
        IF(email_telo LIKE '%box-shadow%', '🟠 box-shadow ', ''),
        IF((LENGTH(email_telo) - LENGTH(REPLACE(email_telo, '<div', ''))) > 50, '🟡 many-divs ', ''),
        IF(email_telo NOT LIKE '%<!--[if mso]>%', '🟢 no-mso-conditions ', '')
    ) as issues,
    CASE 
        WHEN email_telo LIKE '%linear-gradient%' 
             OR email_telo LIKE '%box-shadow%' 
        THEN '❌ KRITICKÁ OPRAVA NUTNÁ'
        WHEN (LENGTH(email_telo) - LENGTH(REPLACE(email_telo, '<div', ''))) > 50
             OR email_telo NOT LIKE '%<!--[if mso]>%'
        THEN '⚠️ Doporučená oprava'
        ELSE '✅ OK'
    END as priority
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL
ORDER BY 
    CASE 
        WHEN email_telo LIKE '%linear-gradient%' OR email_telo LIKE '%box-shadow%' THEN 1
        WHEN (LENGTH(email_telo) - LENGTH(REPLACE(email_telo, '<div', ''))) > 50 THEN 2
        ELSE 3
    END,
    typ;
EOF

echo ""
echo -e "${GREEN}✅ Identifikace problémů dokončena${NC}"
echo ""

# ====================================================================
# 8. CELKOVÉ SHRNUTÍ
# ====================================================================
echo -e "${BLUE}📊 Krok 8: Celkové shrnutí${NC}"
echo "----------------------------------------------------------------------"

mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'
SELECT 
    COUNT(*) as total_templates,
    SUM(CASE WHEN email_telo LIKE '%linear-gradient%' THEN 1 ELSE 0 END) as with_gradient,
    SUM(CASE WHEN email_telo LIKE '%box-shadow%' THEN 1 ELSE 0 END) as with_box_shadow,
    SUM(CASE WHEN email_telo LIKE '%<!--[if mso]>%' THEN 1 ELSE 0 END) as with_mso_conditions,
    SUM(CASE WHEN (LENGTH(email_telo) - LENGTH(REPLACE(email_telo, '<div', ''))) > 50 THEN 1 ELSE 0 END) as with_many_divs,
    SUM(CASE 
        WHEN email_telo LIKE '%linear-gradient%' OR email_telo LIKE '%box-shadow%' 
        THEN 1 ELSE 0 
    END) as critical_issues,
    CONCAT(
        ROUND(
            (SUM(CASE WHEN email_telo NOT LIKE '%linear-gradient%' AND email_telo NOT LIKE '%box-shadow%' THEN 1 ELSE 0 END) / COUNT(*)) * 100,
        2), 
        ' %'
    ) as outlook_compatibility_score
FROM 25_notifikace_sablony
WHERE email_telo IS NOT NULL;
EOF

echo ""
echo "======================================================================"
echo -e "${GREEN}✅ Testování dokončeno!${NC}"
echo "======================================================================"
echo ""
echo -e "${YELLOW}💡 Doporučené další kroky:${NC}"
echo "  1. Opravit šablony s kritickými problémy (gradient, box-shadow)"
echo "  2. Přidat MSO podmínky pro lepší Outlook kompatibilitu"
echo "  3. Převést DIV layouty na TABLE layouty"
echo "  4. Otestovat šablony v reálném Outlook klientovi"
echo "  5. Případně použít Litmus nebo Email on Acid pro testování"
echo ""
echo -e "${BLUE}📁 Logy uloženy v: /tmp/email_template_test_$(date +%Y%m%d).log${NC}"
echo ""

-- ============================================
-- Migrace cest příloh faktur - DEV/PROD separace
-- ============================================
-- Účel: Opravit absolutní cesty v systemova_cesta na relativní názvy souborů
--        aby fungovaly v obou prostředích (DEV i PROD)
-- Datum: 2025-12-30
-- 
-- POZOR: Spustit POUZE pokud chcete upravit historické záznamy!
--        Nové záznamy již používají správný formát.
--
-- Aplikace má nyní normalize_invoice_attachment_path() funkci,
-- která automaticky detekuje správnou cestu podle prostředí.
-- Tato migrace je VOLITELNÁ - pouze pro úpravu DB hodnot.
-- ============================================

-- FÁZE 1: ANALÝZA
-- Zobrazit statistiku různých formátů cest
SELECT 
    CASE 
        WHEN systemova_cesta LIKE '/var/www/eeo2025/%' THEN 'Legacy EEO2025'
        WHEN systemova_cesta LIKE '/var/www/erdms-data/%' THEN 'Current DEV'
        WHEN systemova_cesta LIKE '/var/www/erdms-platform/%' THEN 'Current PROD'
        WHEN systemova_cesta LIKE 'fa-%' THEN 'Relative (správně)'
        ELSE 'Ostatní'
    END AS typ_cesty,
    COUNT(*) as pocet
FROM `25a_faktury_prilohy`
GROUP BY typ_cesty;

-- FÁZE 2: PREVIEW
-- Zobrazit co se změní (bez změny dat)
SELECT 
    id,
    faktura_id,
    systemova_cesta AS puvodni_cesta,
    -- Extrahuj pouze název souboru z jakékoliv absolutní cesty
    SUBSTRING_INDEX(systemova_cesta, '/', -1) AS nova_cesta,
    originalni_nazev_souboru
FROM `25a_faktury_prilohy`
WHERE systemova_cesta LIKE '/%'  -- Pouze absolutní cesty
ORDER BY id
LIMIT 20;

-- FÁZE 3: MIGRACE (ODKOMENTOVAT PRO SPUŠTĚNÍ)
-- Převést všechny absolutní cesty na relativní názvy souborů
/*
UPDATE `25a_faktury_prilohy`
SET systemova_cesta = SUBSTRING_INDEX(systemova_cesta, '/', -1)
WHERE systemova_cesta LIKE '/%';  -- Pouze absolutní cesty

-- Verifikace
SELECT 
    'Po migraci' as status,
    COUNT(*) as celkem_priloh,
    SUM(CASE WHEN systemova_cesta LIKE '/var/www/%' THEN 1 ELSE 0 END) as absolutnich_cest,
    SUM(CASE WHEN systemova_cesta LIKE 'fa-%' THEN 1 ELSE 0 END) as relativnich_cest
FROM `25a_faktury_prilohy`;
*/

-- FÁZE 4: KONTROLA CHYBĚJÍCÍCH SOUBORŮ
-- Seznam příloh, které nemají fyzický soubor
-- (spustit po migraci pro identifikaci problémů)
/*
SELECT 
    id,
    faktura_id,
    systemova_cesta,
    originalni_nazev_souboru,
    dt_vytvoreni
FROM `25a_faktury_prilohy`
ORDER BY dt_vytvoreni DESC;
*/

-- ============================================
-- POZNÁMKY K MIGRACI:
-- ============================================
-- 1. normalize_invoice_attachment_path() v PHP automaticky hledá soubory ve:
--    - Aktuální ENV cestu (z config)
--    - /var/www/eeo2025/doc/prilohy/ (legacy)
--    - /var/www/erdms-data/eeo-v2/prilohy/ (DEV)
--    - /var/www/erdms-platform/data/eeo-v2/prilohy/ (PROD)
--
-- 2. Migrace DB není nutná pro funkčnost! 
--    PHP funkce pracuje s jakýmkoliv formátem.
--
-- 3. Pokud chcete čistou DB, spusťte FÁZI 3 (odkomentovat UPDATE)
--
-- 4. Pro objednávky (25a_objednavky_prilohy) NENÍ třeba migrace,
--    ty již používají relativní cesty správně.
-- ============================================

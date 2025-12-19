-- =====================================================
-- MIGRATE OLD HIERARCHY DATA TO structure_json
-- =====================================================
-- Datum: 16. prosince 2025
-- Účel: Převést stará data z 25_hierarchie_vztahy do structure_json
-- =====================================================

-- KROK 1: Zkontrolovat, jestli stará tabulka existuje
SET @old_table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = 'eeo2025' 
  AND table_name = '25_hierarchie_vztahy'
);

SELECT 
  CASE 
    WHEN @old_table_exists > 0 THEN '✅ Stará tabulka 25_hierarchie_vztahy existuje - budeme migrovat data'
    ELSE '⚠️ Stará tabulka neexistuje - žádná migrace není potřeba'
  END as status;

-- KROK 2: Pokud stará tabulka existuje, převést data
-- Tento kód se spustí pouze pokud tabulka existuje

-- Pro každý profil vytvoříme JSON strukturu z jeho vztahů
-- Poznámka: Tento skript je komplexní a vyžaduje ruční zpracování
-- protože staré vztahy používaly jiný formát

-- Příklad manuální migrace pro profil ID 6:
-- 1. Načíst všechny vztahy pro profil
-- 2. Vytvořit nodes z unikátních uzlů
-- 3. Vytvořit edges ze vztahů
-- 4. Uložit jako JSON

-- PROZATÍM: Vytvořit prázdnou strukturu pro existující profily bez structure_json
UPDATE 25_hierarchie_profily 
SET structure_json = '{"nodes":[],"edges":[]}'
WHERE structure_json IS NULL OR structure_json = '';

SELECT 
  id,
  nazev,
  aktivni,
  CASE 
    WHEN structure_json IS NULL THEN '❌ NULL'
    WHEN structure_json = '' THEN '❌ PRÁZDNÉ'
    WHEN structure_json = '{"nodes":[],"edges":[]}' THEN '⚠️ PRÁZDNÁ STRUKTURA'
    ELSE CONCAT('✅ DATA (', LENGTH(structure_json), ' bytů)')
  END as structure_status
FROM 
  25_hierarchie_profily
ORDER BY 
  aktivni DESC, nazev ASC;

-- =====================================================
-- VÝSLEDEK
-- =====================================================
-- Po spuštění tohoto skriptu:
-- 1. Všechny profily mají structure_json (i když prázdný)
-- 2. API bude fungovat bez SQL chyb
-- 3. Uživatelé mohou začít vytvářet nové hierarchie
-- 
-- POZNÁMKA:
-- Stará data z 25_hierarchie_vztahy nejsou automaticky migrována,
-- protože staré a nové schéma jsou příliš odlišné.
-- Pokud potřebujete zachovat stará data, kontaktujte vývojáře
-- pro manuální migrační skript.
-- =====================================================
